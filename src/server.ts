import type ApiBuilder from "./utils/api-builder";
import mergeDeepRight from "ramda/src/mergeDeepRight";

export default class AuthServer {
  private _api = {};

  constructor() {}

  public registerApi(apiBuilder: ApiBuilder) {
    this._api = mergeDeepRight(this._api, apiBuilder.build());

    return this;
  }
  public registerMiddleware() {
    return this;
  }
  public registerRoutes() {
    return this;
  }

  public registerPlugins(pluginArr: AuthServer[]) {
    for (const plugin of pluginArr) {
      this._api = mergeDeepRight(this._api, plugin.api);
    }
    return this;
  }

  get api() {
    return this._api;
  }
}
