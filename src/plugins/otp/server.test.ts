import { expect, test } from "bun:test";

import defineOtpServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryOtpRepository } from "./repository/otp";

test("Plugin > OTP", () => {
  const otpServerPlugin = defineOtpServerPlugin({
    otpRepository: new MemoryOtpRepository(),
    callback: {
      sendOtpEmail: async (otp: string, email: string) =>
        console.log(`OTP (${Option}) email sent to ${email}`),
    },
  });
  const authServer = new AuthServer().registerPlugins([otpServerPlugin]);

  expect(authServer).toBeInstanceOf(AuthServer);
});
