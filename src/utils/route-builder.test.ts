import { describe, expect, test } from "bun:test";

import RouteBuilder from "./route-builder";
import type {TBaseRoutes} from './types';
import {json} from './response';
import defineRouteHandler from './define-route-handler';

const STORE = {
  exampleId: 20,
}

const handleRequest = (routes: TBaseRoutes, request: Request): Response => {
  // invoke the route handler that matches the given request
  // make sure that any url params are added to an optional ctx object under params
  // return a 404 response if no route could be found
} 

describe("RouteBuilder", () => {
  test("build() returns final route object", async () => {
    const routeBuilder = new RouteBuilder()
      .get("/test/route", defineRouteHandler(
        async ({ req, ctx }) => json({
          message: `OTP has been sent to ${email}`
        }), {
          protected: false, // this route is public, will need to add rate-limiting
          schema: {
            body: z.object({
              email: z.uuidv4(),
            }),
          },
        }
      ))
      .post("/test/route/:id", async (request: Request, ctx: {params: {id: string}}) => Promise.resolve(json(STORE[ctx.params.id] ?? 0)));

    const builtRoute = routeBuilder.build();

    console.log(builtRoute)

    expect(builtRoute["/test/route"]).toHaveProperty('GET');
    expect(builtRoute["/test/route/:id"]).toHaveProperty('POST');

    const res = await handleRequest(builtRoute, new Request('/test/route'))
    expect(res.json()).toEqual(true);
    expect(await builtRoute['/test/route/:id'].POST(new Request('/test/route/example-id'))).toEqual(STORE["example-id"])
  });
});
