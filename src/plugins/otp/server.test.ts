import { describe, expect, test, spyOn } from "bun:test";

import defineOtpServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryOtpRepository } from "./repository/otp";

const DUMMY_OTP = {
  hashedOtp: "dummy",
  attemptCount: 0,
  isValid: true,
  purpose: "tests",
  createdAt: new Date(),
};

describe("OTP Plugin", async () => {
  const callback = {
    sendOtpEmail: async (otp: string, email: string) =>
      console.log(`OTP (${Option}) email sent to ${email}`),
  };

  const otpServerPlugin = defineOtpServerPlugin({
    otpRepository: new MemoryOtpRepository(),
    callback,
  });
  const authServer = new AuthServer().registerPlugins([otpServerPlugin]);

  expect(authServer).toBeInstanceOf(AuthServer);

  test("generate", async () => {
    expect(authServer.api.otp).toHaveProperty("generate");
    expect(await authServer.api.otp.generate()).toBeString();
  });

  test("store", async () => {
    expect(authServer.api.otp).toHaveProperty("store");
    expect(await authServer.api.otp.store(DUMMY_OTP)).toMatchObject(DUMMY_OTP);
    expect(await authServer.api.otp.store(DUMMY_OTP)).toHaveProperty("id");
  });

  test("send", async () => {
    const spy = spyOn(callback, "sendOtpEmail");

    await authServer.api.otp.send("email@example.com", "123456");

    expect(authServer.api.otp).toHaveProperty("send");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
