import assocPath from "ramda/src/assocPath";
import type { TBaseApi, PathToObj, TAsyncFunc } from "./types";
import type ApiBuilder from "./api-builder";

export default class ApiManager<TApi extends TBaseApi = {}> {
  private _api: TApi;

  constructor(api?: TApi) {
    this._api = api ?? ({} as TApi);
  }

  public registerApi(apiBuilder: ApiBuilder) {
    const newApi = assocPath(key.split("."), handler, this._api) as TApi &
      PathToObj<K, H>;

    return new ApiManager(newApi);
  }

  public get api(): TApi {
    return this._api;
  }
}
