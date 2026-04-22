import ApiBuilder from "../../utils/api-builder";
import type { AuthClientRegisterApi } from "../../utils/types";
import { AbstractClientPlugin, corePlugin } from "../client";
import { ROUTES } from "./constants";

const DEFAULT_OPTIONS = {};

type OtpClientPluginParams = {
  callback: {};
  options: {};
};

export default class OtpClientPlugin extends AbstractClientPlugin {
  public static override readonly dependencies = [corePlugin];

  private _callback;
  private _options;

  constructor(params: OtpClientPluginParams) {
    super();

    this._callback = params.callback;
    this._options = {
      ...DEFAULT_OPTIONS,
      ...params.options,
    };
  }

  public registerApi(
      authClient: AuthClientRegisterApi<typeof OtpClientPlugin>
    ) {
      return new ApiBuilder()
        .api(
            'otp.send',
            /**
             * Invoked via authClient instance
             * 
             * eg. authClient.api.send('mail@example.com', 'LOGIN')
             * 
             * @param email - email to send OTP code to
             * @param purpose - An string to match on verification, so OTPs dont clash
             * @returns A JSON object that includes copy to show on frontend
             */
            async (email: string, purpose: string) => {
                const res =  await authClient.api.fetch(ROUTES.SEND, {
                    body: JSON.stringify({email, purpose})
                }, {
                    shouldInjectAuthHeader: false, // we are not logged in at this point, so dont inject any auth tokens
                });

                const json = await res.json() as {error: string, message: string};

                return {
                    success: !json.error, // if we dont have an error, we sucessfully send the OTP email
                    error: json.error, // will be undefined on success
                    message: json.message ?? json.error, // if we are an error, we wont have a message. Lets just use the error message for now
                }
            }
        )
        .api(
            'otp.verify',
            async (email: string, otp: string, purpose: string) => {
                const res =  await authClient.api.fetch(ROUTES.VERIFY, {
                    body: JSON.stringify({email, otp, purpose})
                }, {
                    shouldInjectAuthHeader: false, // we are not logged in at this point, so dont inject any auth tokens
                });

                return await authClient.api.handleTokenResponse(res);
            }
        );
  }
}