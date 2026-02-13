import type AuthClient from "../client";
import { ApiBuilder } from "../utils/server";
import type { TBaseApi } from "../utils/types";

export type AbstractClientPluginClass = {
  new (...args: any[]): AbstractClientPlugin;
  readonly dependencies: AbstractClientPluginClass[];
};

export default abstract class AbstractClientPlugin {
  public static readonly dependencies: AbstractClientPluginClass[] = [];

  public registerApi(
    authServer: AuthClient<TBaseApi>
  ): ApiBuilder {
    return new ApiBuilder();
  }
}
