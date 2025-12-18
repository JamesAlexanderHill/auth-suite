import { describe, expect, test, spyOn } from "bun:test";

import OtpServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryOtpRepository } from "./repository/otp";
import type { TBaseOtp } from "./types";

const DUMMY_OTP: Omit<TBaseOtp, "id"> = {
  hashedOtp: "dummy",
  attemptCount: 0,
  isValid: true,
  purpose: "tests",
  createdAt: new Date(),
  salt: "random_string",
  email: "mail@example.com",
};

describe("OTP Plugin", async () => {
  const callback = {
    sendOtpEmail: async (otp: string, email: string) =>
      console.log(`OTP (${otp}) email sent to ${email}`),
  };

  const otpServerPlugin = new OtpServerPlugin({
    otpRepository: new MemoryOtpRepository(),
    callback,
    options: {
      otpSecret: "example_secret",
    },
  });
  const authServer = new AuthServer({}).registerPlugins([otpServerPlugin]);

  expect(authServer).toBeInstanceOf(AuthServer);

  test("api.otp.generate", async () => {
    expect(authServer.api.otp).toHaveProperty("generate");
    expect(await authServer.api.otp.generate()).toBeString();
  });

  test("api.otp.store", async () => {
    expect(authServer.api.otp).toHaveProperty("store");
    expect(await authServer.api.otp.store(DUMMY_OTP)).toMatchObject(DUMMY_OTP);
    expect(await authServer.api.otp.store(DUMMY_OTP)).toHaveProperty("id");
  });

  test("api.otp.send", async () => {
    const spy = spyOn(callback, "sendOtpEmail");

    await authServer.api.otp.send("email@example.com", "123456");

    expect(authServer.api.otp).toHaveProperty("send");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("POST: /otp/send", () => {
    // TODO: create test to verify endpoint works as expected
  });
});
