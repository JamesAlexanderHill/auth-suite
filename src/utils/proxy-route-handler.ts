import { z } from "zod";
import { UrlParser } from "url-params-parser";

import { error } from "./response";

export type OptionSchema = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

type CtxFromSchema<S extends OptionSchema> = {
  [K in keyof S]: S[K] extends z.ZodType
    ? z.infer<S[K]> // required
    : never;
};

export type AugmentedCtx<S extends OptionSchema | undefined> =
  (S extends OptionSchema ? CtxFromSchema<S> : {}) &
    Omit<RouteOptions<undefined>, "schema">;

type RouteOptions<S extends OptionSchema | undefined> = {
  protected: boolean;
  schema?: S;
};

export type RouteHandler<S extends OptionSchema | undefined> = {
  url: string;
  handler: (req: Request) => Promise<Response>;
  options: Partial<RouteOptions<S>>;
};

const DEFAULT_OPTIONS: RouteOptions<undefined> = {
  protected: false,
};

/**
 * Define a route handler with optional schema validation and protection.
 *
 * `handler`'s `ctx` is strongly typed from `options.schema`:
 * - If schema has only `params`, ctx has only `params`.
 * - If schema has `body` + `query`, ctx has only `body` and `query`.
 */
function proxyRouteHandler<
  const S extends OptionSchema | undefined = undefined
>(
  url: string,
  handler: (args: { req: Request; ctx: AugmentedCtx<S> }) => Promise<Response>,
  options?: Partial<RouteOptions<S>>
): RouteHandler<S> {
  const proxiedHandler = async (req: Request) => {
    const { schema, ...otherOptions } = options || {};
    const reqUrl = new URL(req.url);

    let parsedBody: unknown;
    let parsedQuery: unknown;
    let parsedParams: unknown;

    if (schema?.body) {
      const json = await req.json();
      const parsed = schema.body.safeParse(json);

      if (!parsed.success) {
        return error("Invalid body");
      }

      parsedBody = parsed.data;
    }

    if (schema?.query) {
      const queryParams = Object.fromEntries(reqUrl.searchParams.entries());
      const parsed = schema.query.safeParse(queryParams);

      console.log(queryParams, parsed);

      if (!parsed.success) {
        return error("Invalid query params");
      }

      parsedQuery = parsed.data;
    }

    if (schema?.params) {
      const urlParser = UrlParser(reqUrl.href, url);
      const parsed = schema.params.safeParse(urlParser.namedParams);

      if (!parsed.success) {
        return error("Invalid URL params");
      }

      parsedParams = parsed.data;
    }

    const requestCtx = {
      ...otherOptions, // options with schema stripped out
      ...(schema?.body ? { body: parsedBody } : {}),
      ...(schema?.query ? { query: parsedQuery } : {}),
      ...(schema?.params ? { params: parsedParams } : {}),
    } as AugmentedCtx<S>;

    return handler({ req, ctx: requestCtx });
  };

  const finalOptions: RouteOptions<S> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return { url, handler: proxiedHandler, options: finalOptions };
}

export default proxyRouteHandler;
