import assocPath from "ramda/src/assocPath";
import type { TBaseApi, PathToObj, TAsyncFunc } from "./types";

export default class ApiBuilder<TApi extends TBaseApi = {}> {
  private _api: TApi;

  constructor(api?: TApi) {
    this._api = api ?? {} as TApi;
  }

  public api<K extends string, H extends TAsyncFunc>(
    key: K,
    handler: H
  ) {
    const newApi = assocPath(key.split("."), handler, this._api) as TApi & PathToObj<K, H>;

    return new ApiBuilder(newApi);
  }

  public build(): TApi {
    return this._api;
  }
}
