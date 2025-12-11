import { describe, expect, test } from "bun:test";

import { z } from "zod";

import RouteBuilder from "./route-builder";
import { json } from "./response";
import defineRouteHandler from "./define-route-handler";

const DUMMY_UUID = "744a00b7-fcd1-48f7-9d39-6f2d59a6b0ba";

describe("RouteBuilder", () => {
  const routeBuilder = new RouteBuilder()
    .get(
      "/test/route",
      defineRouteHandler(
        "/test/route",
        async ({ req, ctx }) =>
          json({
            message: `OTP has been sent to ${ctx.body.email}`,
          }),
        {
          protected: false, // this route is public, will need to add rate-limiting
          schema: {
            body: z.object({
              email: z.uuidv4(),
            }),
          },
        }
      )
    )
    .post(
      "/test/route/:id",
      defineRouteHandler(
        "/test/route/:id",
        async ({ req, ctx }) =>
          json({
            id: ctx.params.id,
          }),
        {
          protected: false, // this route is public, will need to add rate-limiting
          schema: {
            params: z.object({
              id: z.uuidv4(),
            }),
          },
        }
      )
    );

  test("build() returns final route object", async () => {
    const builtRoute = routeBuilder.build();

    expect(builtRoute["/test/route"]).toHaveProperty("GET");
    expect(builtRoute["/test/route/:id"]).toHaveProperty("POST");
  });

  // test("handle basic get request", async () => {
  //   const builtRoute = routeBuilder.build();

  //   const res = await handleRequest(
  //     builtRoute,
  //     new Request("https://example.com/test/route")
  //   );
  //   expect(res.json()).toBeDefined();
  // });

  test("handle post request with URL params", async () => {
    const builtRoute = routeBuilder.build();

    const res = await builtRoute["/test/route/:id"].POST.handler({
      req: new Request(`https://example.com/test/route/${DUMMY_UUID}`),
      ctx: { params: { id: DUMMY_UUID } },
    });

    const resJson = await res.json();

    expect(resJson).toContainKey("id");
  });
});
