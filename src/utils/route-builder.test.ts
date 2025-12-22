import { describe, expect, test } from "bun:test";

import { z } from "zod";

import RouteBuilder from "./route-builder";
import { json } from "./response";

const DUMMY_UUID = "744a00b7-fcd1-48f7-9d39-6f2d59a6b0ba";
const DUMMY_EMAIL = "mail@example.com";

describe("RouteBuilder", () => {
  const routeBuilder = new RouteBuilder()
    .post(
      "/example/route",
      async ({ ctx }) =>
        json({
          email: ctx.body.email,
        }),
      {
        schema: {
          body: z.object({
            email: z.email(),
          }),
        },
      }
    )
    .post(
      "/another/example/route/:id",
      async ({ ctx }) =>
        json({
          id: ctx.params.id,
        }),
      {
        schema: {
          params: z.object({
            id: z.uuidv4(),
          }),
        },
      }
    )
    .get(
      "/example/route",
      async ({ ctx }) =>
        json({
          email: ctx.query.email,
        }),
      {
        schema: {
          query: z.object({
            email: z.email(),
          }),
        },
      }
    );

  test("build() returns final route object", async () => {
    const builtRoute = routeBuilder.build();

    expect(builtRoute["/example/route"]).toHaveProperty("GET");
    expect(builtRoute["/example/route"]).toHaveProperty("POST");
    expect(builtRoute["/example/route"]).not.toHaveProperty("PATCH");
    expect(builtRoute["/example/route"]).not.toHaveProperty("DELETE");
    expect(builtRoute["/another/example/route/:id"]).toHaveProperty("POST");
  });

  test("handle GET request with query params", async () => {
    const builtRoute = routeBuilder.build();
    const res = await builtRoute["/example/route"].GET.handler(
      new Request(`http://example.com/test/route?email=${DUMMY_EMAIL}`)
    );
    const resJson = await res.json();

    expect(resJson.email).toEqual(DUMMY_EMAIL);
  });

  test("handle POST request with URL params", async () => {
    const builtRoute = routeBuilder.build();
    const res = await builtRoute["/another/example/route/:id"].POST.handler(
      new Request(`http://example.com/another/example/route/${DUMMY_UUID}`, {
        method: "POST",
      })
    );
    const resJson = await res.json();

    expect(resJson.id).toEqual(DUMMY_UUID);
  });

  test("handle POST request with body", async () => {
    const builtRoute = routeBuilder.build();
    const res = await builtRoute["/example/route"].POST.handler(
      new Request(`http://example.com/test/route`, {
        method: "POST",
        body: JSON.stringify({ email: DUMMY_EMAIL }),
      })
    );
    const resJson = await res.json();

    expect(resJson.email).toEqual(DUMMY_EMAIL);
  });
});
