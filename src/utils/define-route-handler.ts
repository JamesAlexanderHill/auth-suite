import { z } from "zod";
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

    if (schema?.body) {
      const json = await req.json();
      const parsed = schema.body.safeParse(json);
      if (!parsed.success) {
        return error("Invalid body");
      }

      body = parsed.data;
    }

    if (schema?.query) {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const parsed = schema.query.safeParse(queryParams);
      if (!parsed.success) {
        return error("Invalid query params");
      }
      query = parsed.data;
    }

    if (schema?.params) {
      // TODO get params from request URL. Pattern should follow something like /users/:userId
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

  return { handler: wrappedHandler, options: finalOptions };
}

export default defineRouteHandler;
