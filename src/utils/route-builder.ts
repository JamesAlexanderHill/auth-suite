import assocPath from "ramda/src/assocPath";
import { z } from "zod";

import type { HttpMethod, TBaseRoutes, TAsyncFunc, DeepMerge } from "./types";

// TODO: replace this with something exported from define-route-handler.ts? need to figure out how to handle generic zod schema?
type TDefineRouteHandler<H extends TAsyncFunc> = {
  handler: H;
  options: Record<string, any>;
};

type RouteRecord<
  U extends string,
  M extends HttpMethod,
  H extends TAsyncFunc,
  O extends Record<string, any>
> = {
  [K in U]: {
    [MK in M]: { handler: H; options: O };
  };
};

export default class RouteBuilder<TRoutes extends TBaseRoutes = {}> {
  private _routes: TRoutes;

  constructor(routes?: TRoutes) {
    this._routes = (routes ?? {}) as TRoutes;
  }

  private defineRoute<
    M extends HttpMethod,
    U extends string,
    H extends TAsyncFunc,
    O extends Record<string, any>
  >(method: M, url: U, handler: H, options: Record<string, any>) {
    const newRoutes = assocPath(
      [url, method],
      { handler, options },
      this._routes
    ) as TRoutes & RouteRecord<U, M, H, O>;

    return new RouteBuilder(newRoutes);
  }

  public get<U extends string, H extends TAsyncFunc>(
    url: U,
    routeHandler: TDefineRouteHandler<H>
  ) {
    return this.defineRoute(
      "GET",
      url,
      routeHandler.handler,
      routeHandler.options
    );
  }

  public post<U extends string, H extends TAsyncFunc>(
    url: U,
    routeHandler: TDefineRouteHandler<H>
  ) {
    return this.defineRoute(
      "POST",
      url,
      routeHandler.handler,
      routeHandler.options
    );
  }

  public patch<U extends string, H extends TAsyncFunc>(
    url: U,
    routeHandler: TDefineRouteHandler<H>
  ) {
    return this.defineRoute(
      "PATCH",
      url,
      routeHandler.handler,
      routeHandler.options
    );
  }

  public delete<U extends string, H extends TAsyncFunc>(
    url: U,
    routeHandler: TDefineRouteHandler<H>
  ) {
    return this.defineRoute(
      "DELETE",
      url,
      routeHandler.handler,
      routeHandler.options
    );
  }

  public build(): TRoutes {
    return this._routes;
  }
}
