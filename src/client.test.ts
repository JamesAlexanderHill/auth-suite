import { describe, expect, test } from "bun:test";

import AuthClient from "./client";
import ApiBuilder from "./utils/api-builder";
import type { AuthClientRegisterApi, AuthServerRegisterApi } from "./utils/types";
import AbstractClientPlugin from "./plugins/abstract-client-plugin";

class ExamplePlugin extends AbstractClientPlugin {
  constructor() {
    super();
  }

  registerApi(_authClient: AuthClient) {
    return new ApiBuilder()
      .api("plugin.ok", () => Promise.resolve(true))
      .api("core.test", () => Promise.resolve(false));
  }
}
class OverridePlugin extends AbstractClientPlugin {
  public static override readonly dependencies = [ExamplePlugin];

  constructor() {
    super();
  }

  registerApi(authClient: AuthClientRegisterApi<typeof OverridePlugin>) {
    return new ApiBuilder()
      .api("use.dependency.ok", async () => await authClient.api.plugin.ok()) // this will use the examplePlugin plugin.ok
      .api("plugin.ok", () => Promise.resolve(false)); // This will override the examplePlugin plugin.ok
  }
}
const examplePlugin = new ExamplePlugin();
const overridePlugin = new OverridePlugin();

describe("AuthClient", () => {
    test("registerPlugins", async () => {
        const authClient = new AuthClient({ baseUrl: "example.com" })
            .registerPlugins([examplePlugin, overridePlugin]);

        expect(authClient).toBeInstanceOf(AuthClient);

        expect(await authClient.api.plugin.ok()).toBeFalse();
        expect(await authClient.api.use.dependency.ok()).toBeTrue();
    });

    test("throw error if a plugin is missing a dependency", () => {
        const authClient = new AuthClient({
            baseUrl: "example.com",
        });

        // needs to be in an anonymous function for bun to detect the thrown error
        expect(() => authClient.registerPlugins([overridePlugin])).toThrowError(
            'Cannot register AuthClient plugin "OverridePlugin": missing dependencies: ExamplePlugin'
        );
    });
})