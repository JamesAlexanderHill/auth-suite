import crypto from "crypto";
import { z } from "zod";

import AuthServer from "../../server";
import { type IOtpRepository } from "./repository/otp";
import type { TBaseOtp } from "./types";
import ApiBuilder from "../../utils/api-builder";
import AbstractServerPlugin from "../abstract-server-plugin";
import type {
  AuthServerRegisterApi,
  AuthServerRegisterRoute,
} from "../../utils/types";
import { corePlugin } from "../server";
import RouteBuilder from "../../utils/route-builder";
import { error, json, tokenResponse } from "../../utils/response";

async function defaultGenerateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  return otp;
}

async function hashOtp({
  otp,
  email,
  secret,
  purpose,
  salt,
}: {
  otp: string;
  email: string;
  secret: string;
  purpose: string;
  salt?: string;
}) {
  const saltWithFallback = salt ?? crypto.randomBytes(16).toString("hex");
  const data = `${otp}:${email}:${purpose}:${saltWithFallback}`;
  const hash = crypto.createHmac("sha256", secret).update(data).digest("hex");

  return { salt: saltWithFallback, hash };
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

const DEFAULT_OPTIONS = {
  otpDurationMs: 60_000 * 10, // 10min
};

type OtpServerPluginParams = {
  otpRepository: IOtpRepository<TBaseOtp>;
  callback: {
    sendOtpEmail: (email: string, otp: string) => Promise<void>;
    generateOtp?: () => Promise<string>;
  };
  options: {
    otpSecret: string;
    otpDurationMs?: number;
  };
};

export default class OtpServerPlugin extends AbstractServerPlugin {
  public static override readonly dependencies = [corePlugin];

  private _callback;
  private _otpRepository;
  private _options;

  constructor(params: OtpServerPluginParams) {
    super();

    this._callback = params.callback;
    this._otpRepository = params.otpRepository;
    this._options = {
      ...DEFAULT_OPTIONS,
      ...params.options,
    };
  }

  public registerApi(
    authServer: AuthServerRegisterApi<typeof OtpServerPlugin>
  ) {
    return new ApiBuilder()
      .api("otp.send", async (email: string, purpose: string) => {
        // generate a otp
        const otp = await this.generate();

        const hashedOtp = await hashOtp({
          otp,
          email,
          secret: this._options.otpSecret,
          purpose,
        });

        // save the otp and email pair in db
        await this._otpRepository.create({
          hashedOtp: hashedOtp.hash,
          salt: hashedOtp.salt,
          email: email,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this._options.otpDurationMs),
          attemptCount: 0,
          isValid: true,
          purpose: purpose,
        });

        await this._callback.sendOtpEmail(email, otp);
      })
      .api("otp.invalidate", async (id: TBaseOtp["id"]) => this.invalidate(id))
      .api(
        "otp.verify",
        async (email: string, otp: string, purpose: string) => {
          // TODO: need to support filtering by email, purpose, isValid,
          const recentOtp = (
            await this._otpRepository.list(1, 0, "expiresAt", "asc")
          ).items[0];

          if (!recentOtp) return false;

          // hash new OTP with same salt
          const recomputedHash = await hashOtp({
            otp,
            email,
            secret: this._options.otpSecret,
            purpose,
            salt: recentOtp.salt, // compute a new hash using our most recent OTP's salt
          });

          // compare hashes
          if (!timingSafeEqualHex(recentOtp.hashedOtp, recomputedHash.hash)) {
            // increment attempt count
            await this._otpRepository.update(recentOtp.id, {
              ...recentOtp,
              attemptCount: recentOtp.attemptCount + 1,
            });

            return false;
          }

          // invalidate otp
          await this.invalidate(recentOtp.id);

          return true;
        }
      );
  }

  public registerRoutes(
    authServer: AuthServerRegisterRoute<typeof OtpServerPlugin>
  ) {
    return new RouteBuilder()
      .post(
        "/otp/send",
        async ({ ctx }) => {
          try {
            await authServer.api.otp.send(ctx.body.email, ctx.body.purpose);

            return json({
              message: `An email has been sent to ${ctx.body.email}`,
            });
          } catch (err) {
            // TODO: handle all possible errors thrown by this route?
            return error("Unable to send a OTP email, please try again later");
          }
        },
        {
          schema: {
            body: z.object({
              email: z.email(),
              purpose: z.string(),
            }),
          },
        }
      )
      .post(
        "/otp/verify",
        async ({ ctx }) => {
          try {
            const otpIsCorrect = await authServer.api.otp.verify(
              ctx.body.email,
              ctx.body.otp,
              ctx.body.purpose
            );

            if (!otpIsCorrect) {
              throw "Unable to verify email and OTP pair, try again";
            }

            // get user by email (or create one if needed)
            let user = await authServer.api.getUserByEmail(ctx.body.email);

            if (!user) {
              user = await authServer.api.createUser({
                email: ctx.body.email,
              });
            }

            // generate tokens
            const { accessToken, refreshToken } =
              await authServer.api.generateAuthTokens(user);

            return tokenResponse(accessToken, refreshToken);
          } catch (err) {
            if (typeof err === "string") {
              return error(err);
            }

            return error(
              "An unknown error occured when trying to verify email and OTP pair, try again"
            );
          }
        },
        {
          schema: {
            body: z.object({
              otp: z.string(),
              email: z.email(),
              purpose: z.string(),
            }),
          },
        }
      );
  }

  private async generate() {
    const otp =
      (await this._callback.generateOtp?.()) || (await defaultGenerateOtp());

    return otp;
  }

  private async invalidate(id: TBaseOtp["id"]) {
    const originalOtp = await this._otpRepository.getById(id);

    if (!originalOtp) {
      throw "Unable to invalidated an OTP that does not exist";
    }

    return this._otpRepository.update(id, {
      ...originalOtp,
      isValid: false,
    });
  }
}
