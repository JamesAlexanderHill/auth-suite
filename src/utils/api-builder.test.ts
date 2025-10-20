import { describe, expect, test } from "bun:test";

import ApiBuilder from "./api-builder";

describe("ApiBuilder", () => {
  test("build() returns final api object", () => {
    const apiBuilder = new ApiBuilder()
      .api("example", (id: string) => Promise.resolve(`example handler ${id}`))
      .api("other.api.example", (num: number) => Promise.resolve(42 * num));

    expect(apiBuilder.build()).toEqual({
      example: expect.any(Function),
      other: {
        api: {
          example: expect.any(Function),
        },
      },
    });
  });
});
