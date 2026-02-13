import { describe, expect, test } from "bun:test";

import AuthServer from "./server";
import ApiBuilder from "./utils/api-builder";
import AbstractServerPlugin from "./plugins/abstract-server-plugin";
import type { AuthServerRegisterApi } from "./utils/types";

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
  public static override readonly dependencies = [ExamplePlugin];

  constructor() {
    super();
  }

  registerApi(authServer: AuthServerRegisterApi<typeof OverridePlugin>) {
    return new ApiBuilder()
      .api("use.dependency.ok", async () => await authServer.api.plugin.ok()) // this will use the examplePlugin plugin.ok
      .api("plugin.ok", () => Promise.resolve(false)); // This will override the examplePlugin plugin.ok
  }
}
const examplePlugin = new ExamplePlugin();
const overridePlugin = new OverridePlugin();

describe("AuthServer", async () => {
  test("registerPlugins", async () => {
    const authServer = new AuthServer({ baseUrl: "example.com" })
      .registerPlugins([examplePlugin, overridePlugin])
      .registerApi("ok", () => Promise.resolve(true));

    expect(authServer).toBeInstanceOf(AuthServer);

    expect(await authServer.api.ok()).toBeTrue();
    expect(await authServer.api.plugin.ok()).toBeFalse();
    expect(await authServer.api.use.dependency.ok()).toBeTrue();
  });

  test("throw error if a plugin is missing a dependency", () => {
    const authServer = new AuthServer({
      baseUrl: "example.com",
    });

    // needs to be in an anonymous function for bun to detect the thrown error
    expect(() => authServer.registerPlugins([overridePlugin])).toThrowError(
      'Cannot register AuthServer plugin "OverridePlugin": missing dependencies: ExamplePlugin'
    );
  });
});
