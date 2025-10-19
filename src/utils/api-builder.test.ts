import { describe, expect, test } from "bun:test";

import ApiBuilder from "./api-builder";

describe("ApiBuilder", () => {
	test("without namespace", () => {
		const apiBuilder = new ApiBuilder()
			.api('example', () => 'example handler')
			.api('other.api.example', () => 42);

		expect(apiBuilder.build()).toEqual({
			example: expect.any(Function),
			other: {
				api: {
					example: expect.any(Function),
				},
			},
		});
	});
	test("with namespace", () => {
		const apiBuilder = new ApiBuilder({ namespace: 'placeholder' })
			.api('example', () => 'example handler')
			.api('other.api.example', () => 42);

		expect(apiBuilder.build()).toEqual({
			placeholder: {
				example: expect.any(Function),
				other: {
					api: {
						example: expect.any(Function),
					},
				},
			}
		});
	});
	
});
