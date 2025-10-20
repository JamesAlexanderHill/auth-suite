import { mergeDeepRight } from "ramda";
import ApiBuilder from "./utils/api-builder";

// Type-level deep merge (so TS knows what `mergeDeepRight` produces)
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Fn = (...args: any[]) => any;
type NonMergeable = Primitive | Fn | Date | RegExp | Array<any>;

export type DeepMerge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends NonMergeable
        ? B[K]
        : B[K] extends NonMergeable
        ? B[K]
        : DeepMerge<A[K], B[K]>
      : A[K]
    : K extends keyof B
    ? B[K]
    : never;
};

export type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export default class AuthServer<TAcc extends object = {}> {
  private _api: any = {};

  /** Merge a single ApiBuilder into this server */
  registerApi<B extends object>(
    builder: ApiBuilder<B>
  ): AuthServer<DeepMerge<TAcc, B>> {
    this._api = mergeDeepRight(this._api, builder.build());
    return this as unknown as AuthServer<DeepMerge<TAcc, B>>;
  }

  /** Merge an array of other AuthServer instances (plugins) */
  registerPlugins<P extends readonly AuthServer<any>[]>(
    plugins: P
  ): AuthServer<
    DeepMerge<
      TAcc,
      UnionToIntersection<
        { [I in keyof P]: P[I] extends AuthServer<infer A> ? A : never }[number]
      >
    >
  > {
    for (const plugin of plugins) {
      this._api = mergeDeepRight(this._api, plugin.api);
    }

    type AllApis = UnionToIntersection<
      { [I in keyof P]: P[I] extends AuthServer<infer A> ? A : never }[number]
    >;

    return this as unknown as AuthServer<DeepMerge<TAcc, AllApis>>;
  }

  /** Return the fully-typed merged API */
  get api(): TAcc {
    return this._api as TAcc;
  }
}
