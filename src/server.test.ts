import { expect, test } from "bun:test";

import AuthServer from "./server";
import ApiBuilder from "./utils/api-builder";

const examplePlugin = new AuthServer().registerApi(
  new ApiBuilder().api("plugin.ok", () => Promise.resolve(true))
);

test("AuthServer", async () => {
  const authServer = new AuthServer()
    .registerPlugins([examplePlugin])
    .registerApi(new ApiBuilder().api("ok", () => Promise.resolve(true)));

  expect(authServer).toBeInstanceOf(AuthServer);

  expect(await authServer.api.ok()).toBeTrue();
  expect(await authServer.api.plugin.ok()).toBeTrue();
});
