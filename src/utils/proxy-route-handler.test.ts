import { describe, expect, test } from "bun:test";
import { z } from "zod";

import proxyRouteHandler from "./proxy-route-handler";
import { json } from "./response";

describe("proxyRouteHandler", () => {
  test("Returns a wrapped handler", async () => {
    const url = "/route/example";
    const options = {
      schema: {
        query: z.object({
          email: z.email(),
        }),
      },
    };

    const routeHandler = proxyRouteHandler(
      url,
      ({ req, ctx }) => {
        const email = ctx.query.email;

        return Promise.resolve(json({ email }));
      },
      options
    );

    // These should just be passed through
    expect(routeHandler.options).toMatchObject(options);
    expect(routeHandler.url).toEqual(url);

    const res = await routeHandler.handler(
      new Request("http://example.com/route/example?email=test@example.com")
    );
    // should take a request and return a valid response
    expect(await res.json()).toEqual({ email: "test@example.com" });
  });
});
