import { expect, test } from "bun:test";

import defineCoreServerPlugin from "./server";
import AuthServer from "../../server";
import { MemoryUserRepository } from "./repository/user";

test("Plugin > Core", () => {
  const coreServerPlugin = defineCoreServerPlugin({
    userRepository: new MemoryUserRepository(),
    callback: {},
  });
  const authServer = new AuthServer().registerPlugins([coreServerPlugin]);

  expect(authServer).toBeInstanceOf(AuthServer);
});
