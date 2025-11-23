import { expect, test } from "bun:test";

import AuthServer, { type PluginApi } from "./server";
import ApiBuilder from "./utils/api-builder";
import AbstractServerPlugin from "./plugins/abstract-server-plugin";
import type { PluginApi, UnionToIntersection } from "./utils/types";

class ExamplePlugin extends AbstractServerPlugin {
  constructor() {
    super();
  }

  registerApi(_authServer: AuthServer) {
    return new ApiBuilder()
      .api("plugin.ok", () => Promise.resolve(true))
      .api("core.test", () => Promise.resolve(false));
  }
}
class OverridePlugin extends AbstractServerPlugin {
  public dependencies = [ExamplePlugin];
  constructor() {
    super()
  }

  registerApi(authServer: AuthServer<UnionToIntersection<PluginApi<OverridePlugin["dependencies"][number]>>>) {
    return new ApiBuilder()
      .api("use.dependency.ok", async () => await authServer.api.plugin.ok()) // this will use the ExamplePlugin plugin.ok
      .api("plugin.ok", () => Promise.resolve(false)); // This will override the previous plugin.ok
  }
}
const examplePlugin = new ExamplePlugin();
const overridePlugin = new OverridePlugin();

test("AuthServer", async () => {
  const authServer = new AuthServer({})
    .registerPlugins([examplePlugin, overridePlugin])
    .registerApi("ok", () => Promise.resolve(true));

  expect(authServer).toBeInstanceOf(AuthServer);

  expect(await authServer.api.ok()).toBeTrue();
  expect(await authServer.api.plugin.ok()).toBeFalse();
  expect(await authServer.api.use.dependency.ok()).toBeTrue();
});
