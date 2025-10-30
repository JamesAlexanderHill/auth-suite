import AuthServer from "../server";
import ApiBuilder from "../utils/api-builder";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware } from "../utils/types";

export abstract class AbstractServerPlugin {
    protected dependencies = ['core'];
    protected _api: TBaseApi = {};

    abstract registerApi(authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>): AbstractServerPlugin;

    get api(): TBaseApi {
        return this._api;
    }

    set api(apiBuilder: ApiBuilder) {
        const builtApi = apiBuilder.build();

        this._api = builtApi;
    }
}
