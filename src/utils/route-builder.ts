// src/utils/route-builder.ts
import proxyRouteHandler, {
  type AugmentedCtx,
  type OptionSchema,
  type RouteHandler,
} from "./proxy-route-handler";
import type { HttpMethod, TBaseRoutes } from "./types";

export default class RouteBuilder<TRoutesAcc extends TBaseRoutes = {}> {
  private _routes: TRoutesAcc;

  constructor(routes: TRoutesAcc = {} as TRoutesAcc) {
    this._routes = routes;
  }

  /**
   * Register a route for a given path + HTTP method.
   *
   * Fully typed:
   * - `ctx` is inferred from the `schema` (body/query/params)
   * - `options` are the same as proxyRouteHandler options
   * - The accumulator type grows as you chain .route() calls
   */
  public route<
    Path extends string,
    Method extends HttpMethod,
    S extends OptionSchema | undefined = undefined
  >(
    path: Path,
    method: Method,
    handler: (args: {
      req: Request;
      ctx: AugmentedCtx<S>;
    }) => Promise<Response>,
    options?: RouteHandler<S>["options"]
  ) {
    const route = proxyRouteHandler<S>(path, handler, options);

    const existingForPath = (this._routes as TBaseRoutes)[path] ?? {};

    const updatedForPath = {
      ...existingForPath,
      [method]: route,
    };

    // Typing trick to grow the accumulator:
    // - If `path` already exists, we add/override a method
    // - If `path` is new, we create it with this single method
    type NewRoutes = TRoutesAcc & {
      [P in Path]: (P extends keyof TRoutesAcc ? TRoutesAcc[P] : {}) & {
        [M in Method]: RouteHandler<S>;
      };
    };

    const newRoutes = {
      ...(this._routes as object),
      [path]: updatedForPath,
    } as NewRoutes;

    return new RouteBuilder<NewRoutes>(newRoutes);
  }

  /**
   * Small ergonomics: sugar for common HTTP verbs.
   */
  public get<
    Path extends string,
    S extends OptionSchema | undefined = undefined
  >(
    path: Path,
    handler: (args: {
      req: Request;
      ctx: AugmentedCtx<S>;
    }) => Promise<Response>,
    options?: RouteHandler<S>["options"]
  ) {
    return this.route(path, "GET", handler, options);
  }

  public post<
    Path extends string,
    S extends OptionSchema | undefined = undefined
  >(
    path: Path,
    handler: (args: {
      req: Request;
      ctx: AugmentedCtx<S>;
    }) => Promise<Response>,
    options?: RouteHandler<S>["options"]
  ) {
    return this.route(path, "POST", handler, options);
  }

  public put<
    Path extends string,
    S extends OptionSchema | undefined = undefined
  >(
    path: Path,
    handler: (args: {
      req: Request;
      ctx: AugmentedCtx<S>;
    }) => Promise<Response>,
    options?: RouteHandler<S>["options"]
  ) {
    return this.route(path, "PUT", handler, options);
  }

  public del<
    Path extends string,
    S extends OptionSchema | undefined = undefined
  >(
    path: Path,
    handler: (args: {
      req: Request;
      ctx: AugmentedCtx<S>;
    }) => Promise<Response>,
    options?: RouteHandler<S>["options"]
  ) {
    return this.route(path, "DELETE", handler, options);
  }

  public patch<
    Path extends string,
    S extends OptionSchema | undefined = undefined
  >(
    path: Path,
    handler: (args: {
      req: Request;
      ctx: AugmentedCtx<S>;
    }) => Promise<Response>,
    options?: RouteHandler<S>["options"]
  ) {
    return this.route(path, "PATCH", handler, options);
  }

  public build(): TRoutesAcc {
    return this._routes;
  }
}
