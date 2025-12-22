import { assocPath } from "ramda";
import type {
  TBaseApi,
  TBaseRoutes,
  TBaseMiddleware,
  PathToObj,
  TAsyncFunc,
  UnionToIntersection,
  PluginApi,
  PluginRoutes,
} from "./utils/types";
import type AbstractServerPlugin from "./plugins/abstract-server-plugin";

type TAuthServerParams<TApi, TRoutes, TMiddleware> = {
  api?: TApi;
  routes?: TRoutes;
  middleware?: TMiddleware;
};

export default class AuthServer<
  TApi extends TBaseApi = {},
  TRoutes extends TBaseRoutes = {},
  TMiddleware extends TBaseMiddleware = {}
> {
  private _api: TApi;
  private _routes: TRoutes;
  private _middleware: TMiddleware;

  constructor({
    api,
    routes,
    middleware,
  }: TAuthServerParams<TApi, TRoutes, TMiddleware>) {
    this._api = api || ({} as TApi);
    this._routes = routes || ({} as TRoutes);
    this._middleware = middleware || ({} as TMiddleware);
  }

  public registerApi<K extends string, H extends TAsyncFunc>(
    key: K,
    handler: H
  ) {
    const newApi = assocPath(key.split("."), handler, this._api) as TApi &
      PathToObj<K, H>;

    return new AuthServer<TApi & PathToObj<K, H>, TRoutes, TMiddleware>({
      api: newApi,
      routes: this._routes,
      middleware: this._middleware,
    });
  }

  /** Register multiple plugins */
  registerPlugins<P extends readonly AbstractServerPlugin[]>(plugins: P) {
    type PApi = UnionToIntersection<PluginApi<P[number]>>;
    type PRoutes = UnionToIntersection<PluginRoutes<P[number]>>;

    let authServer: AuthServer<TApi, TRoutes, TMiddleware> = this;

    for (const plugin of plugins) {
      authServer = authServer.registerPlugin(plugin);
    }

    return authServer as AuthServer<
      TApi & PApi,
      TRoutes & PRoutes,
      TMiddleware
    >;
  }

  /** Register a plugin */
  registerPlugin<P extends AbstractServerPlugin>(plugin: P) {
    const apiBuilder = plugin.registerApi(this);
    const builtApi = apiBuilder.build() as PluginApi<P>;
    const newApi = { ...this._api, ...builtApi };

    const authServerWithApi = new AuthServer<
      TApi & PluginApi<P>,
      TRoutes,
      TMiddleware
    >({
      api: newApi,
      routes: this._routes,
      middleware: this._middleware,
    });

    // TODO: this needs an authServer instance with the API already added, because a plugins routes rely on its own APIs
    const routesBuilder = plugin.registerRoutes(authServerWithApi);
    const builtRoutes = routesBuilder.build() as PluginRoutes<P>;
    const newRoutes = { ...this._routes, ...builtRoutes };

    return new AuthServer<
      TApi & PluginApi<P>,
      TRoutes & PluginRoutes<P>,
      TMiddleware
    >({
      api: authServerWithApi.api,
      routes: newRoutes,
      middleware: this._middleware,
    });
  }

  /** Return the fully-typed merged API */
  get api(): TApi {
    return this._api;
  }

  get routes(): TRoutes {
    return this._routes;
  }
}
