import AuthServer from "../server";
import ApiBuilder from "../utils/api-builder";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware } from "../utils/types";

export abstract class AbstractServerPlugin {
    protected readonly dependencies = ['core'] as string[];

    public abstract registerApi(authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>): ApiBuilder;
}
