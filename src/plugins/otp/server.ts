import AuthServer from "../../server";
import ApiBuilder from "../../utils/api-builder";
import { MemoryOtpRepository, type IOtpRepository } from "./repository/otp";
import type { TBaseOtp } from "./types";

async function defaultGenerateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  return otp;
}

type OtpServerOptions = {
  otpRepository: IOtpRepository<TBaseOtp>;
  callback: {
    sendOtpEmail: (otp: string, email: string) => Promise<void>;
    generateOtp?: () => Promise<string>;
  };
};

export default function defineOtpServerPlugin(
  options: OtpServerOptions = {
    otpRepository: new MemoryOtpRepository(),
    callback: {
      sendOtpEmail: async (email: string, otp: string) => {
        console.log(`Sending OTP ${otp} to email: ${email}`);
      },
    },
  }
) {
  const otpApi = new ApiBuilder()
    .api("otp.generate", async (email: string) => {
      const otp =
        (await options.callback.generateOtp?.()) ||
        (await defaultGenerateOtp());

      return otp;
    })
    .api("otp.store", async (otp: Omit<TBaseOtp, "id">) => {
      return options.otpRepository.create(otp);
    })
    .api("otp.send", async (email: string, otp: string) => {
      try {
        await options.callback.sendOtpEmail(email, otp);

        return true;
      } catch (err) {
        return false;
      }
    });

  return new AuthServer()
    .registerApi(otpApi)
    .registerMiddleware()
    .registerRoutes();
}
