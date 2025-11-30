import { describe, expect, test } from "bun:test";

import AuthServer from "./server";
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
    super();
  }

  registerApi(authServer: AuthServer<PluginApi<ExamplePlugin>>) {
    return new ApiBuilder()
      .api("use.dependency.ok", async () => await authServer.api.plugin.ok()) // this will use the Override plugin.ok since it would be overwritten at runtime
      .api("plugin.ok", () => Promise.resolve(false)); // This will override the previous plugin.ok
  }
}
const examplePlugin = new ExamplePlugin();
const overridePlugin = new OverridePlugin();

describe("AuthServer", async () => {
  test("registerPlugin", async () => {
    const authServer = new AuthServer({})
      .registerPlugin(examplePlugin)
      .registerPlugin(overridePlugin)
      .registerApi("ok", () => Promise.resolve(true));

    expect(authServer).toBeInstanceOf(AuthServer);

    expect(await authServer.api.ok()).toBeTrue();
    expect(await authServer.api.plugin.ok()).toBeFalse();
    expect(await authServer.api.use.dependency.ok()).toBeTrue();
  });

  test("registerPlugins", async () => {
    const authServer = new AuthServer({})
      .registerPlugins([examplePlugin, overridePlugin])
      .registerApi("ok", () => Promise.resolve(true));

    expect(authServer).toBeInstanceOf(AuthServer);

    expect(await authServer.api.ok()).toBeTrue();
    expect(await authServer.api.plugin.ok()).toBeFalse();
    expect(await authServer.api.use.dependency.ok()).toBeTrue();
  });
});
