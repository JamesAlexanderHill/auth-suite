import { expect, test } from "bun:test";

import AuthServer from "./server";

test("AuthServer", () => {
  const authServer = new AuthServer()
    .registerApi()
    .registerMiddleware()
    .registerRoutes();

  expect(authServer).toBeInstanceOf(AuthServer);
});
