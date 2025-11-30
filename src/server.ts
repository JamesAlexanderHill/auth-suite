import { assocPath } from "ramda";
import type {
  TBaseApi,
  TBaseRoutes,
  TBaseMiddleware,
  PathToObj,
  TAsyncFunc,
  UnionToIntersection,
  PluginApi,
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

  /** Merge an array of other AuthServer instances (plugins) */
  registerPlugins<P extends readonly AbstractServerPlugin[]>(plugins: P) {
    type FromPlugins = UnionToIntersection<PluginApi<P[number]>>;

    for (const plugin of plugins) {
      const builder = plugin.registerApi(this); // using this is incorrect, unless I want to
      const built = builder.build();

      this.api = { ...this.api, ...built } as TApi & FromPlugins;
    }

    return this as unknown as AuthServer<
      TApi & FromPlugins,
      TRoutes,
      TMiddleware
    >;

    // return new AuthServer<TApi & FromPlugins, TRoutes, TMiddleware>({
    //   api: mergedApi,
    //   routes: this._routes,
    //   middleware: this._middleware,
    // });
  }

  /** Return the fully-typed merged API */
  get api(): TApi {
    return this._api;
  }

  set api(newApi: TApi) {
    this._api = newApi;
  }
}
