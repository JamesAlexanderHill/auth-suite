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
import { corePlugin } from "./plugins/server";
import CoreServerPlugin from "./plugins/core/server";
import type { AbstractServerPluginClass } from "./plugins/abstract-server-plugin";

type AuthServerOptions = {
  baseUrl: string;
  name?: string;
};
const BASE_OPTIONS = {
  name: "auth-suite",
};

type TAuthServerParams<TApi, TRoutes, TMiddleware> = {
  api?: TApi;
  routes?: TRoutes;
  middleware?: TMiddleware;
  installedPlugins?: Set<AbstractServerPluginClass>;
};

export default class AuthServer<
  TApi extends TBaseApi = {},
  TRoutes extends TBaseRoutes = {},
  TMiddleware extends TBaseMiddleware = {}
> {
  private _api: TApi;
  private _routes: TRoutes;
  private _middleware: TMiddleware;
  private readonly _installedPlugins = new Set<AbstractServerPluginClass>();

  public readonly options;

  constructor(
    options: AuthServerOptions,
    args?: TAuthServerParams<TApi, TRoutes, TMiddleware>
  ) {
    this._api = args?.api ?? ({} as TApi);
    this._routes = args?.routes ?? ({} as TRoutes);
    this._middleware = args?.middleware ?? ({} as TMiddleware);
    this._installedPlugins =
      args?.installedPlugins ?? new Set<AbstractServerPluginClass>();

    this.options = {
      ...BASE_OPTIONS,
      ...options,
    };
  }

  public registerApi<K extends string, H extends TAsyncFunc>(
    key: K,
    handler: H
  ) {
    const newApi = assocPath(key.split("."), handler, this._api) as TApi &
      PathToObj<K, H>;

    return new AuthServer<TApi & PathToObj<K, H>, TRoutes, TMiddleware>(
      this.options,
      {
        api: newApi,
        routes: this._routes,
        middleware: this._middleware,
      }
    );
  }

  /** Register multiple plugins */
  registerPlugins<P extends readonly AbstractServerPlugin[]>(plugins: P) {
    type PApi = UnionToIntersection<PluginApi<P[number]>>;
    type PRoutes = UnionToIntersection<PluginRoutes<P[number]>>;

    let authServer: AuthServer<TApi, TRoutes, TMiddleware> = this;

    // TODO: order plugins by dependancy graph
    for (const plugin of plugins) {
      // TODO: throw error if plugin dependencies havnt already been added to authServer??
      authServer = authServer.registerPlugin(plugin);
    }

    return authServer as AuthServer<
      TApi & PApi,
      TRoutes & PRoutes,
      TMiddleware
    >;
  }

  /** Register a plugin */
  private registerPlugin<P extends AbstractServerPlugin>(plugin: P) {
    const pluginClass = plugin.constructor as AbstractServerPluginClass;
    const pluginDeps = pluginClass.dependencies ?? [];
    const missingDeps = pluginDeps.filter(
      (dep) => !this._installedPlugins.has(dep)
    );

    if (missingDeps.length > 0) {
      const missingNames = missingDeps.map((dep) => dep.name || "<anonymous>");
      const pluginName = pluginClass.name || "<anonymous>";

      throw new Error(
        `Cannot register AuthServer plugin "${pluginName}": missing dependencies: ${missingNames.join(
          ", "
        )}`
      );
    }

    const apiBuilder = plugin.registerApi(this);
    const builtApi = apiBuilder.build() as PluginApi<P>;
    const newApi = { ...this._api, ...builtApi };

    const authServerWithApi = new AuthServer<
      TApi & PluginApi<P>,
      TRoutes,
      TMiddleware
    >(this.options, {
      api: newApi,
      routes: this._routes,
      middleware: this._middleware,
      installedPlugins: this._installedPlugins,
    });

    // TODO: this needs an authServer instance with the API already added, because a plugins routes rely on its own APIs
    const routesBuilder = plugin.registerRoutes(authServerWithApi);
    const builtRoutes = routesBuilder.build() as PluginRoutes<P>;
    const newRoutes = { ...this._routes, ...builtRoutes };

    this._installedPlugins.add(pluginClass);

    return new AuthServer<
      TApi & PluginApi<P>,
      TRoutes & PluginRoutes<P>,
      TMiddleware
    >(this.options, {
      api: authServerWithApi.api,
      routes: newRoutes,
      middleware: this._middleware,
      installedPlugins: this._installedPlugins,
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
