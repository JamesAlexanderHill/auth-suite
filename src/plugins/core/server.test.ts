import { expect, test, describe } from "bun:test";

import CoreServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";

const DUMMY_USER = {
    email: "mail@example.com",
};

describe("Core Plugin", async () => {
    const coreServerPlugin = new CoreServerPlugin({
        userRepository: new MemoryUserRepository(),
        callback: {},
    });
    const authServer = new AuthServer({})
        .registerPlugins([coreServerPlugin]);

    expect(authServer).toBeInstanceOf(AuthServer);

    let testUser: TBaseUser;

    testUser = await authServer.api.createUser(DUMMY_USER);

    test("createUser", async () => {
        expect(authServer.api).toHaveProperty("createUser");

        expect(testUser).toContainKeys(['id', 'email']);
    });

    test("getUserById", async () => {
        expect(authServer.api).toHaveProperty("getUserById");

        const successRequestedUser = await authServer.api.getUserById(testUser.id);
        const failureRequestedUser = await authServer.api.getUserById("not_a_user");

        expect(successRequestedUser).toMatchObject(DUMMY_USER);
        expect(failureRequestedUser).toBeNull();
    });

    test("getUserByEmail", async () => {
        expect(authServer.api).toHaveProperty("getUserByEmail");

        const successRequestedUser = await authServer.api.getUserByEmail(testUser.email);
        const failureRequestedUser = await authServer.api.getUserByEmail("does_not_exist@example.com");

        expect(successRequestedUser).toMatchObject(DUMMY_USER);
        expect(failureRequestedUser).toBeNull();
    });
});