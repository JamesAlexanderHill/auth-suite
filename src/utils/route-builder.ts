import assocPath from "ramda/src/assocPath";
import type { HttpMethod, TBaseRoutes, TAsyncFunc, DeepMerge } from "./types";

type RouteRecord<
  U extends string,
  M extends HttpMethod,
  H extends TAsyncFunc
> = {
  [K in U]: {
    [MK in M]: H;
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
    H extends TAsyncFunc
  >(method: M, url: U, handler: H) {
    const newRoutes = assocPath(
      [url, method],
      handler,
      this._routes
    ) as TRoutes & RouteRecord<U, M, H>;

    return new RouteBuilder(newRoutes);
  }

  public get<U extends string, H extends TAsyncFunc>(url: U, handler: H) {
    return this.defineRoute("GET", url, handler);
  }

  public post<U extends string, H extends TAsyncFunc>(url: U, handler: H) {
    return this.defineRoute("POST", url, handler);
  }

  public patch<U extends string, H extends TAsyncFunc>(url: U, handler: H) {
    return this.defineRoute("PATCH", url, handler);
  }

  public delete<U extends string, H extends TAsyncFunc>(url: U, handler: H) {
    return this.defineRoute("DELETE", url, handler);
  }

  public build(): TRoutes {
    return this._routes;
  }
}
