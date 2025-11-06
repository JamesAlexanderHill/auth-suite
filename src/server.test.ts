import { expect, test } from "bun:test";

import AuthServer, { type PluginApi } from "./server";
import ApiBuilder from "./utils/api-builder";
import AbstractServerPlugin from "./plugins/abstract-server-plugin";

class BasePlugin extends AbstractServerPlugin {
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
  private dependancies = [BasePlugin]; // Only used to assist with typeing of authServer with other plugin API's?

  constructor() {
    super();
  }

  registerApi(authServer: AuthServer) {
    return (
      new ApiBuilder()
        // Override an API definition that was decorated by a previous plugin
        .api("core.test", () => Promise.resolve(true))
      // Reference API methods that are dependancies of the current plugin
      // .api("dependancy.test", async () =>
      //   Promise.resolve(await authServer.api.core.test())
      // )
    );
  }
}

const examplePlugin = new BasePlugin();
const overridePlugin = new OverridePlugin();

test("AuthServer", async () => {
  const authServer = new AuthServer({})
    .registerPlugins([examplePlugin, overridePlugin])
    .registerApi("ok", () => Promise.resolve(true));

  expect(authServer).toBeInstanceOf(AuthServer);

  expect(await authServer.api.ok()).toBeTrue();
  expect(await authServer.api.plugin.ok()).toBeTrue();
  expect(await authServer.api.core.test()).toBeTrue();
});
