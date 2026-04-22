import { expect, test, describe } from "bun:test";

import CoreServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";

const DUMMY_USER = {
  email: "mail@example.com",
};
const EXAMPLE_SECRET = new TextEncoder().encode("test_secret");

describe("Core Plugin", async () => {
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
  }).registerPlugins([coreServerPlugin]);

  expect(authServer).toBeInstanceOf(AuthServer);

  let testUser: TBaseUser;

  testUser = await authServer.api.createUser(DUMMY_USER);

  test("api.createUser", async () => {
    expect(authServer.api).toHaveProperty("createUser");

    expect(testUser).toContainKeys(["id", "email"]);
  });

  test("api.getUserById", async () => {
    expect(authServer.api).toHaveProperty("getUserById");

    const successRequestedUser = await authServer.api.getUserById(testUser.id);
    const failureRequestedUser = await authServer.api.getUserById("not_a_user");

    expect(successRequestedUser).toMatchObject(DUMMY_USER);
    expect(failureRequestedUser).toBeNull();
  });

  test("api.getUserByEmail", async () => {
    expect(authServer.api).toHaveProperty("getUserByEmail");

    const successRequestedUser = await authServer.api.getUserByEmail(
      testUser.email
    );
    const failureRequestedUser = await authServer.api.getUserByEmail(
      "does_not_exist@example.com"
    );

    expect(successRequestedUser).toMatchObject(DUMMY_USER);
    expect(failureRequestedUser).toBeNull();
  });
});
