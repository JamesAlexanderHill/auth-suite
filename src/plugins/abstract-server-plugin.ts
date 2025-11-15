import AuthServer from "../server";
import ApiBuilder from "../utils/api-builder";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware } from "../utils/types";

type AbstractServerPluginConstructor = {
    new (): AbstractServerPlugin;
    prototype: AbstractServerPlugin;
} & typeof AbstractServerPlugin;

export default abstract class AbstractServerPlugin {
    protected readonly dependencies: AbstractServerPluginConstructor[] = [];

    public abstract registerApi(authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>): ApiBuilder;
}
