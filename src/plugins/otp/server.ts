import AuthServer from "../../server";
import type { IOtpRepository } from "./repository/otp";

type OtpServerOptions = {
  otpRepository: IOtpRepository;
  callback: {
    sendOtpEmail: (otp: string, email: string) => Promise<void>;
  };
};

export default function defineOtpServerPlugin(options: OtpServerOptions) {
  return new AuthServer().registerApi().registerMiddleware().registerRoutes();
}
