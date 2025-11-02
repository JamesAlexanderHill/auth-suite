import { mergeDeepRight, assocPath } from "ramda";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware, PathToObj, TAsyncFunc, UnionToIntersection } from "./utils/types";
import type { AbstractServerPlugin } from "./plugins/abstract-server-plugin";

type PluginApi<P> = P extends AbstractServerPlugin<infer A> ? A : never;

type TAuthServerParams<TApi, TRoutes, TMiddleware> = {
  api?: TApi,
  routes?: TRoutes,
  middleware?: TMiddleware,
}

export default class AuthServer<
  TApi extends TBaseApi = {},
  TRoutes extends TBaseRoutes = {},
  TMiddleware extends TBaseMiddleware = {},
> {
  private _api: TApi;
  private _routes: TRoutes;
  private _middleware: TMiddleware;

  constructor({ api, routes, middleware }: TAuthServerParams<TApi, TRoutes, TMiddleware>) {
    this._api = api || {} as TApi;
    this._routes = routes || {} as TRoutes;
    this._middleware = middleware || {} as TMiddleware;
  }

  public registerApi<K extends string, H extends TAsyncFunc>(
    key: K,
    handler: H
  ) {
    const newApi = assocPath(key.split("."), handler, this._api) as TApi & PathToObj<K, H>;

    return new AuthServer<TApi & PathToObj<K, H>, TRoutes, TMiddleware>({api: newApi, routes: this._routes, middleware: this._middleware});
  }

  /** Merge an array of other AuthServer instances (plugins) */
  registerPlugins<P extends readonly AbstractServerPlugin<any>[]>(
    plugins: P
  ) {
    type ApiFromPlugins = UnionToIntersection<PluginApi<P[number]>>;

    let mergedPluginApi = this._api as TApi & ApiFromPlugins;
    let mergedPluginRoutes = this._routes;
    let mergedPluginMiddleware = this._middleware;

    for (const plugin of plugins) {
      const decoratedPlugin = plugin
        .registerApi(this);
      mergedPluginApi = mergeDeepRight(mergedPluginApi, decoratedPlugin.api) as TApi & ApiFromPlugins;
    }

    return new AuthServer<TApi & ApiFromPlugins, TRoutes, TMiddleware>({
      api: mergedPluginApi,
      routes: mergedPluginRoutes,
      middleware: mergedPluginMiddleware,
    })
  }

  /** Return the fully-typed merged API */
  get api() {
    return this._api;
  }
}
