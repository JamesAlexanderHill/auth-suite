import AuthServer from "../server";
import ApiBuilder from "../utils/api-builder";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware } from "../utils/types";

export type AbstractServerPluginClass = {
  new (...args: any[]): AbstractServerPlugin;
  readonly dependencies: AbstractServerPluginClass[];
};


export default abstract class AbstractServerPlugin {
  public static readonly dependencies: AbstractServerPluginClass[] = [];

  public abstract registerApi(
    authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>
  ): ApiBuilder;
}
