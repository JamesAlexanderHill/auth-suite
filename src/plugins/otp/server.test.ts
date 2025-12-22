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
  expiresAt: new Date(Date.now() + 10_000),
  salt: "random_string",
  email: "mail@example.com",
};

describe("OTP Plugin", async () => {
  // expect(authServer).toBeInstanceOf(AuthServer);

  test("api.otp.send", async () => {
    const callback = {
      sendOtpEmail: async (otp: string, email: string) =>
        console.log(`OTP (${otp}) email sent to ${email}`),
    };
    const otpRepository = new MemoryOtpRepository();

    const otpServerPlugin = new OtpServerPlugin({
      otpRepository,
      callback,
      options: {
        otpSecret: "example_secret",
      },
    });
    const authServer = new AuthServer({}).registerPlugins([otpServerPlugin]);

    const spy = spyOn(callback, "sendOtpEmail");

    expect(authServer.api.otp).toHaveProperty("send");
    expect((await otpRepository.list(10, 0)).items.length).toBe(0);
    await authServer.api.otp.send("mail@example.com", "test");

    // TODO: check if default or callback generate function is called?
    // check if hashed OTP is stored in the otpRepository
    console.log((await otpRepository.list(10, 0)).items);
    expect((await otpRepository.list(10, 0)).items.length).toBe(1);
    // check if email callback has been invoked
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("api.otp.verify", async () => {
    // These records were generated specifically for this test
    const EXAMPLE_OTP_STRING = "877204";
    const EXAMPLE_OTP = {
      hashedOtp:
        "a3ce01fa3c080e47b401fbcc4739caf7a178ff1395a0813f1ce05323afaf1191",
      salt: "d2df5c30bebf51aff665a508b1c11845",
      email: "mail@example.com",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10_000),
      attemptCount: 0,
      isValid: true,
      purpose: "test",
      id: "c1aa4918-3cb9-4b35-a9de-2e00bc55750e",
    };

    const callback = {
      sendOtpEmail: async (otp: string, email: string) =>
        console.log(`OTP (${otp}) email sent to ${email}`),
    };
    const otpRepository = new MemoryOtpRepository({
      initialOtps: new Map<string, TBaseOtp>([[EXAMPLE_OTP.id, EXAMPLE_OTP]]),
    });

    const otpServerPlugin = new OtpServerPlugin({
      otpRepository,
      callback,
      options: {
        otpSecret: "example_secret",
      },
    });
    const authServer = new AuthServer({}).registerPlugins([otpServerPlugin]);

    expect(authServer.api.otp).toHaveProperty("verify");

    let storedOtp = (await otpRepository.list(10, 0)).items[0];
    expect(storedOtp.attemptCount).toBe(0);
    expect(storedOtp.isValid).toBeTrue();

    expect(
      await authServer.api.otp.verify(
        EXAMPLE_OTP.email,
        "incorrect_otp",
        EXAMPLE_OTP.purpose
      )
    ).toBeFalse();
    storedOtp = (await otpRepository.list(10, 0)).items[0];
    expect(storedOtp.attemptCount).toBe(1);
    expect(storedOtp.isValid).toBeTrue();

    expect(
      await authServer.api.otp.verify(
        EXAMPLE_OTP.email,
        EXAMPLE_OTP_STRING,
        "incorrect_purpose"
      )
    ).toBeFalse();
    storedOtp = (await otpRepository.list(10, 0)).items[0];
    expect(storedOtp.attemptCount).toBe(2);
    expect(storedOtp.isValid).toBeTrue();

    expect(
      await authServer.api.otp.verify(
        EXAMPLE_OTP.email,
        EXAMPLE_OTP_STRING,
        EXAMPLE_OTP.purpose
      )
    ).toBeTrue();
    storedOtp = (await otpRepository.list(10, 0)).items[0];
    expect(storedOtp.attemptCount).toBe(2);
    expect(storedOtp.isValid).toBeFalse();
  });

  test("api.otp.invalidate", async () => {
    const callback = {
      sendOtpEmail: async (otp: string, email: string) =>
        console.log(`OTP (${otp}) email sent to ${email}`),
    };
    const TEST_OTP = {
      ...DUMMY_OTP,
      id: "example_id",
    };
    const otpRepository = new MemoryOtpRepository({
      initialOtps: new Map<string, TBaseOtp>([[TEST_OTP.id, TEST_OTP]]),
    });

    const otpServerPlugin = new OtpServerPlugin({
      otpRepository,
      callback,
      options: {
        otpSecret: "example_secret",
      },
    });
    const authServer = new AuthServer({}).registerPlugins([otpServerPlugin]);

    expect(authServer.api.otp).toHaveProperty("invalidate");
    const updatedOtp = await authServer.api.otp.invalidate(TEST_OTP.id);
    expect(updatedOtp.isValid).toBeFalse();
  });

  test("POST: /otp/send", () => {
    // TODO: create test to verify endpoint works as expected
  });
});
