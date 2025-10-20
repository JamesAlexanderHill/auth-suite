import assocPath from "ramda/src/assocPath";

// "a.b.c" -> { a: { b: { c: V } } }
type PathToObj<S extends string, V> = S extends `${infer H}.${infer T}`
  ? { [K in H]: PathToObj<T, V> }
  : { [K in S]: V };

export default class ApiBuilder<TApi extends object = {}> {
  private _api: any = {};

  public api<K extends string, H extends (...args: any[]) => any>(
    key: K,
    handler: H
  ): ApiBuilder<TApi & PathToObj<K, H>> {
    this._api = assocPath(key.split("."), handler, this._api);

    return this as unknown as ApiBuilder<TApi & PathToObj<K, H>>;
  }

  public build(): TApi {
    return this._api as TApi;
  }
}
