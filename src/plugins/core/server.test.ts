import { expect, test, describe } from "bun:test";

import CoreServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";

// test("Core Plugin", () => {
//   const coreServerPlugin = defineCoreServerPlugin({
//     userRepository: new MemoryUserRepository(),
//     callback: {},
//   });
//   const authServer = new AuthServer({}).registerPlugins([coreServerPlugin]);

//   expect(authServer).toBeInstanceOf(AuthServer);
// });

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
        expect(await authServer.api.getUserById(testUser.id)).toContainKeys(['id', 'email']);
    });

    test("getUserByEmail", async () => {
        expect(authServer.api).toHaveProperty("getUserByEmail");
        expect(await authServer.api.getUserByEmail(testUser.email)).toContainKeys(['id', 'email']);
    });
});