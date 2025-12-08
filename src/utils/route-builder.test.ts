import { describe, expect, test } from "bun:test";

import { z } from "zod";

import RouteBuilder from "./route-builder";
import type { TBaseRoutes } from "./types";
import { json } from "./response";
import defineRouteHandler from "./define-route-handler";

const handleRequest = (routes: TBaseRoutes, request: Request): Response => {
  // invoke the route handler that matches the given request
  // make sure that any url params are added to an optional ctx object under params
  // return a 404 response if no route could be found
  const url = new URL(request.url);
  routes.
};

describe("RouteBuilder", () => {
  const routeBuilder = new RouteBuilder()
    .get(
      "/test/route",
      defineRouteHandler(
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

  test("handle basic get request", async () => {
    const builtRoute = routeBuilder.build();

    const res = await handleRequest(builtRoute, new Request("/test/route"));
    expect(res.json()).toBeDefined();
  });

  test("handle post request with URL params", async () => {
    const builtRoute = routeBuilder.build();

    const res = await handleRequest(
      builtRoute,
      new Request("/test/route/exampleId")
    );
    expect(res.json()).toBe({ id: "exampleId" });
  });
});
