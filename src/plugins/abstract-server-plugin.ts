import AuthServer from "../server";
import ApiBuilder from "../utils/api-builder";
import RouteBuilder from "../utils/route-builder";
import type { TBaseApi, TBaseRoutes, TBaseMiddleware } from "../utils/types";

export type AbstractServerPluginClass = {
  new (...args: any[]): AbstractServerPlugin;
  readonly dependencies: AbstractServerPluginClass[];
};

export default abstract class AbstractServerPlugin {
  public static readonly dependencies: AbstractServerPluginClass[] = [];

  public registerApi(
    authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>
  ): ApiBuilder {
    return new ApiBuilder();
  }

  public registerRoutes(
    authServer: AuthServer<TBaseApi, TBaseRoutes, TBaseMiddleware>
  ): RouteBuilder {
    return new RouteBuilder();
  }
}
