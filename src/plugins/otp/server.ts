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
import { error, json } from "../../utils/response";
import { z } from "zod";
import crypto from "crypto";

async function defaultGenerateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  return otp;
}

async function hashOtp({
  otp,
  email,
  secret,
  purpose,
}: {
  otp: string;
  email: string;
  secret: string;
  purpose: string;
}) {
  const salt = crypto.randomBytes(16).toString("hex");
  const data = `${otp}:${email}:${purpose}:${salt}`;
  const hash = crypto.createHmac("sha256", secret).update(data).digest("hex");

  return { salt, hash };
}

type OtpServerPluginParams = {
  otpRepository: IOtpRepository<TBaseOtp>;
  callback: {
    sendOtpEmail: (email: string, otp: string) => Promise<void>;
    generateOtp?: () => Promise<string>;
  };
  options: {
    otpSecret: string;
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
    this._options = params.options;
  }

  public registerApi(
    _authServer: AuthServerRegisterApi<typeof OtpServerPlugin>
  ) {
    return new ApiBuilder()
      .api("otp.generate", async () => {
        const otp =
          (await this._callback.generateOtp?.()) ||
          (await defaultGenerateOtp());

        return otp;
      })
      .api("otp.store", async (otp: Omit<TBaseOtp, "id">) => {
        return this._otpRepository.create(otp);
      })
      .api("otp.send", async (email: string, otp: string) => {
        try {
          await this._callback.sendOtpEmail(email, otp);

          return true;
        } catch (err) {
          return false;
        }
      });
  }

  public registerRoutes(
    authServer: AuthServerRegisterRoute<typeof OtpServerPlugin>
  ) {
    return new RouteBuilder().post(
      "/otp/send",
      async ({ ctx }) => {
        try {
          // generate a otp
          const otp = await authServer.api.otp.generate();

          const hashedOtp = await hashOtp({
            otp,
            email: ctx.body.email,
            secret: this._options.otpSecret,
            purpose: ctx.body.purpose,
          });

          // save the otp and email pair in db
          await authServer.api.otp.store({
            hashedOtp: hashedOtp.hash,
            salt: hashedOtp.salt,
            email: ctx.body.email,
            createdAt: new Date(),
            attemptCount: 0,
            isValid: true,
            purpose: ctx.body.purpose,
          });

          // we want to send the hashed version
          await authServer.api.otp.send(ctx.body.email, otp);

          return json({
            message: `An email has been sent to ${ctx.body.email}`,
          });
        } catch (err) {
          // TODO: handle all possible errors thrown by this route
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
    );
  }
}
