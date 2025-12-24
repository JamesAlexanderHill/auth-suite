import { describe, expect, test, spyOn } from "bun:test";

import OtpServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryOtpRepository } from "./repository/otp";
import type { TBaseOtp } from "./types";
import CoreServerPlugin from "../core/server";
import { MemoryUserRepository } from "../core/repository/user";

const EXAMPLE_SECRET = new TextEncoder().encode("test_secret");
const DUMMY_EMAIL = "mail@example.com";
const DUMMY_OTP: Omit<TBaseOtp, "id"> = {
  hashedOtp: "dummy",
  attemptCount: 0,
  isValid: true,
  purpose: "tests",
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 10_000),
  salt: "random_string",
  email: DUMMY_EMAIL,
};

const setupTest = ({
  callback,
  repository,
}: {
  callback?: any;
  repository?: MemoryOtpRepository;
} = {}) => {
  const callbackWithFallback = {
    sendOtpEmail: async (otp: string, email: string) =>
      console.log(`OTP (${otp}) email sent to ${email}`),
    ...callback,
  };
  const sendOtpEmailSpy = spyOn(callbackWithFallback, "sendOtpEmail");
  const otpRepository = repository ?? new MemoryOtpRepository();

  const otpServerPlugin = new OtpServerPlugin({
    otpRepository,
    callback: callbackWithFallback,
    options: {
      otpSecret: "example_secret",
    },
  });
  const coreServerPlugin = new CoreServerPlugin({
    userRepository: new MemoryUserRepository(),
    callback: {},
    options: {
      accessTokenSecret: EXAMPLE_SECRET,
      refreshTokenSecret: EXAMPLE_SECRET,
    },
  });
  const authServer = new AuthServer({
    baseUrl: "example.com",
  }).registerPlugins([coreServerPlugin, otpServerPlugin]);

  return { authServer, otpRepository, sendOtpEmailSpy };
};

describe("OTP Plugin", async () => {
  test("api.otp.send", async () => {
    const { authServer, otpRepository, sendOtpEmailSpy } = setupTest();

    expect(authServer.api.otp).toHaveProperty("send");
    expect((await otpRepository.list(10, 0)).items.length).toBe(0);
    await authServer.api.otp.send("mail@example.com", "test");

    // TODO: check if default or callback generate function is called?
    // check if hashed OTP is stored in the otpRepository
    expect((await otpRepository.list(10, 0)).items.length).toBe(1);
    // check if email callback has been invoked
    expect(sendOtpEmailSpy).toHaveBeenCalledTimes(1);
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

    const repository = new MemoryOtpRepository({
      initialOtps: new Map<string, TBaseOtp>([[EXAMPLE_OTP.id, EXAMPLE_OTP]]),
    });

    const { authServer, otpRepository } = setupTest({ repository });

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
    const TEST_OTP = {
      ...DUMMY_OTP,
      id: "example_id",
    };

    const repository = new MemoryOtpRepository({
      initialOtps: new Map<string, TBaseOtp>([[TEST_OTP.id, TEST_OTP]]),
    });
    const { authServer } = setupTest({ repository });

    expect(authServer.api.otp).toHaveProperty("invalidate");
    const updatedOtp = await authServer.api.otp.invalidate(TEST_OTP.id);
    expect(updatedOtp.isValid).toBeFalse();
  });

  describe("POST: /otp/send", async () => {
    const { authServer } = setupTest();

    test("good payload", async () => {
      const res = await authServer.routes["/otp/send"].POST.handler(
        new Request(`http://example.com/otp/send`, {
          method: "POST",
          body: JSON.stringify({ email: DUMMY_EMAIL, purpose: "test" }),
        })
      );
      const resJson = await res.json();

      expect(resJson.message).toEqual(
        `An email has been sent to ${DUMMY_EMAIL}`
      );
    });

    test("bad payload", async () => {
      const res = await authServer.routes["/otp/send"].POST.handler(
        new Request(`http://example.com/otp/send`, {
          method: "POST",
          body: JSON.stringify({ email: DUMMY_EMAIL }),
        })
      );
      const resJson = await res.json();

      expect(resJson.error).toEqual(`Invalid body`);
      expect(res.status).toEqual(400);
    });
  });
  describe("POST: /otp/verify", async () => {
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
    const otpRepository = new MemoryOtpRepository({
      initialOtps: new Map<string, TBaseOtp>([[EXAMPLE_OTP.id, EXAMPLE_OTP]]),
    });

    const { authServer } = setupTest({ repository: otpRepository });

    test("no otp found", async () => {
      const res = await authServer.routes["/otp/verify"].POST.handler(
        new Request(`http://example.com/otp/verify`, {
          method: "POST",
          body: JSON.stringify({
            email: "random@example.com",
            otp: EXAMPLE_OTP_STRING,
            purpose: "test",
          }),
        })
      );
      const resJson = await res.json();

      expect(resJson.error).toEqual(
        `Unable to verify email and OTP pair, try again`
      );
      expect(res.status).toBe(401);
    });

    test("otp was valid payload", async () => {
      const res = await authServer.routes["/otp/verify"].POST.handler(
        new Request(`http://example.com/otp/verify`, {
          method: "POST",
          body: JSON.stringify({
            email: EXAMPLE_OTP.email,
            otp: EXAMPLE_OTP_STRING,
            purpose: EXAMPLE_OTP.purpose,
          }),
        })
      );
      const resJson = await res.json();

      expect(resJson).toContainKey("accessToken");
      expect(res.status).toEqual(200);
    });
  });
});
