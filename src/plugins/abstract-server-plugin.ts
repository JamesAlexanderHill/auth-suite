import AuthServer from "../server";
import ApiBuilder from "../utils/api-builder";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware } from "../utils/types";

export abstract class AbstractServerPlugin<PApi extends TBaseApi = {}> {
    protected readonly dependencies = ['core'] as string[];
    private _api!: PApi;

    public abstract registerApi(authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>): this;

    get api(): Readonly<PApi> {
        return this._api;
    }

    protected set api(apiBuilder: ApiBuilder<PApi>) {
        const builtApi = apiBuilder.build();

        this._api = builtApi;
    }
}
