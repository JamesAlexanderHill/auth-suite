import { expect, test } from "bun:test";

import AuthServer from "./server";
import ApiBuilder from "./utils/api-builder";
import { AbstractServerPlugin } from "./plugins/abstract-server-plugin";

class ExamplePlugin extends AbstractServerPlugin {
  constructor() {
    super()
  }

  registerApi(_authServer: AuthServer) {
    const pluginApi = new ApiBuilder()
      .api("plugin.ok", () => Promise.resolve(true));

    this._api = pluginApi;

    return this;
  }
}
const examplePlugin = new ExamplePlugin();

test("AuthServer", async () => {
  const authServer = new AuthServer({})
    .registerPlugins([examplePlugin])
    .registerApi("ok", () => Promise.resolve(true));

  expect(authServer).toBeInstanceOf(AuthServer);

  expect(await authServer.api.ok()).toBeTrue();
  expect(await authServer.api.plugin.ok()).toBeTrue();
});
