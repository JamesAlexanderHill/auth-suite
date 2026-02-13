import type AbstractClientPlugin from "./plugins/abstract-client-plugin";
import type { AbstractClientPluginClass } from "./plugins/abstract-client-plugin";
import type { PluginApi, TBaseApi, UnionToIntersection } from "./utils/types";

type AuthClientOptions = {
  baseUrl: string;
  name?: string;
};
const BASE_OPTIONS = {
  name: "auth-suite",
};

type TAuthClientParams<TApi> = {
  api?: TApi;
  installedPlugins?: Set<AbstractClientPluginClass>;
};

export default class AuthClient<TApi extends TBaseApi = {}> {
    private _api: TApi;
    private _installedPlugins = new Set<AbstractClientPluginClass>();

    public readonly options;

    // TODO: move to core plugin
    // private _accessToken = null;
    // private _refreshToken = null;

    constructor (
    options: AuthClientOptions,
    args?: TAuthClientParams<TApi>
  ) {
        this._api = args?.api ?? ({} as TApi);
        this._installedPlugins =
              args?.installedPlugins ?? new Set<AbstractClientPluginClass>();

        this.options = {
            ...BASE_OPTIONS,
            ...options,
        };
    }

    public registerPlugins<P extends readonly AbstractClientPlugin[]>(plugins: P) {
        type PApi = UnionToIntersection<PluginApi<P[number]>>;
        let authClient: AuthClient<TApi> = this;
        // TODO: order by dependency graph
        // loop through client plugins and register plugins
        for (const plugin of plugins) {
            authClient = authClient.registerPlugin(plugin)
        }

        return authClient as AuthClient<TApi & PApi>;
    }

    private registerPlugin<P extends AbstractClientPlugin>(plugin: P) {
        const pluginClass = plugin.constructor as AbstractClientPluginClass;
        const pluginDeps = pluginClass.dependencies ?? [];
        const missingDeps = pluginDeps.filter(
            (dep) => !this._installedPlugins.has(dep)
        );
    
        if (missingDeps.length > 0) {
            const missingNames = missingDeps.map((dep) => dep.name || "<anonymous>");
            const pluginName = pluginClass.name || "<anonymous>";
    
            throw new Error(
            `Cannot register AuthClient plugin "${pluginName}": missing dependencies: ${missingNames.join(
                ", "
            )}`
            );
        }
        
        // register API onto authClient instance
        const apiBuilder = plugin.registerApi(this);
        const builtApi = apiBuilder.build() as PluginApi<P>;
        const newApi = {...this._api, ...builtApi};


        // finished installing the plugin, add it to our register
        this._installedPlugins.add(pluginClass);

        return new AuthClient<TApi & PluginApi<P>>(this.options, {
            api: newApi, 
            installedPlugins: this._installedPlugins
        })
    }

    get api(): TApi {
        return this._api;
    }
}