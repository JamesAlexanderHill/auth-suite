import { z } from "zod";
import { UrlParser } from "url-params-parser";

import { error } from "./response";

type PlainSchema = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};
type AugmentedCtx<S> = {
  body: S extends { body: infer B }
    ? B extends z.ZodType
      ? z.infer<B>
      : undefined
    : undefined;
  query: S extends { query: infer Q }
    ? Q extends z.ZodType
      ? z.infer<Q>
      : undefined
    : undefined;
  params: S extends { params: infer P }
    ? P extends z.ZodType
      ? z.infer<P>
      : undefined
    : undefined;
};

export type RouteHandler<S> = {
  url: string;
  handler: ({ req, ctx }: { req: Request; ctx: any }) => Promise<Response>;
  options: { protected?: boolean; schema?: S };
};

const DEFAULT_OPTIONS = {
  protected: false,
  schema: null,
};

/**
 * Define a route handler with optional schema validation and protection
 *
 * @param handler The route handler function
 * @param options Route options
 * @returns An object containing the wrapped handler and options
 */
function defineRouteHandler<
  const S extends PlainSchema | undefined = undefined
>(
  url: string,
  handler: (args: {
    req: Request;
    ctx: AugmentedCtx<NonNullable<S>>;
  }) => Promise<Response>,
  options?: { protected?: boolean; schema?: S }
): RouteHandler<S> {
  const wrappedHandler = async ({ req, ctx }: { req: Request; ctx: S }) => {
    const schema = options?.schema;

    let body: unknown = undefined;
    let params: unknown = undefined;
    let query: unknown = undefined;

    const reqUrl = new URL(req.url);

    if (schema?.body) {
      const json = await req.json();
      const parsed = schema.body.safeParse(json);

      if (!parsed.success) {
        return error("Invalid body");
      }

      body = parsed.data;
    }

    if (schema?.query) {
      const queryParams = Object.fromEntries(reqUrl.searchParams.entries());
      const parsed = schema.query.safeParse(queryParams);

      if (!parsed.success) {
        return error("Invalid query params");
      }

      query = parsed.data;
    }

    if (schema?.params) {
      const urlParser = UrlParser(reqUrl.href, url);
      const parsed = schema.params.safeParse(urlParser.namedParams);

      if (!parsed.success) {
        return error("Invalid URL params");
      }

      params = parsed.data;
    }

    const requestCtx = {
      ...ctx,
      body: body as AugmentedCtx<S>["body"],
      query: query as AugmentedCtx<S>["query"],
      params: params as AugmentedCtx<S>["params"],
    };

    return handler({ req, ctx: requestCtx });
  };

  const finalOptions = Object.assign({}, DEFAULT_OPTIONS, options);

  return { url, handler: wrappedHandler, options: finalOptions };
}

export default defineRouteHandler;
