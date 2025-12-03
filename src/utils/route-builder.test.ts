import { describe, expect, test } from "bun:test";

import RouteBuilder from "./route-builder";

const STORE = {
  'example-id': 20,
}

describe("RouteBuilder", () => {
  test("build() returns final route object", async () => {
    const routeBuilder = new RouteBuilder()
      .get("/test/route", (request: Request) => Promise.resolve(true))
      .post("/test/route/:id", (request: Request, ) => Promise.resolve(STORE["example-id"]));

    const builtRoute = routeBuilder.build();

    console.log(builtRoute)

    expect(builtRoute["/test/route"]).toHaveProperty('GET');
    expect(builtRoute["/test/route/:id"]).toHaveProperty('POST');

    expect(await builtRoute['/test/route'].GET(new Request('/test/route'))).toEqual(true);
    expect(await builtRoute['/test/route/:id'].POST(new Request('/test/route/example-id'))).toEqual(STORE["example-id"])
  });
});
