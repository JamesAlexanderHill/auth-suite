import AuthServer from "../../server";
import { type IOtpRepository } from "./repository/otp";
import type { TBaseOtp } from "./types";
import ApiBuilder from "../../utils/api-builder";
import AbstractServerPlugin from "../abstract-server-plugin";
import type { TBaseApi } from '../../utils/types';

async function defaultGenerateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  return otp;
}

type OtpServerPluginParams = {
  otpRepository: IOtpRepository<TBaseOtp>;
  callback: {
    sendOtpEmail: (email: string, otp: string) => Promise<void>;
    generateOtp?: () => Promise<string>;
  };
};

export default class OtpServerPlugin extends AbstractServerPlugin {
  private _callback;
  private _otpRepository;

  constructor(params: OtpServerPluginParams) {
    super();

    this._callback = params.callback;
    this._otpRepository = params.otpRepository;
  }

  public registerApi(_authServer: AuthServer) {
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
}