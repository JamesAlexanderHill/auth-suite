import type { AbstractServerPluginClass } from "../plugins/abstract-server-plugin";
import type AuthServer from "../server";
import type ApiBuilder from "./api-builder";
import type { RouteHandler } from "./proxy-route-handler";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Fn = (...args: any[]) => any;
type NonMergeable = Primitive | Fn | Date | RegExp | Array<any>;
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

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

export type TAsyncFunc = (...args: any) => Promise<any>;
export type TBaseApi =
  | {
      [key: string]: TAsyncFunc | TBaseApi | undefined;
    }
  | {};
export type TBaseRoutes = Record<
  string,
  Partial<Record<HttpMethod, RouteHandler<any>>>
>;
export type TBaseMiddleware = unknown;
export type PathToObj<S extends string, V> = S extends `${infer H}.${infer T}`
  ? { [K in H]: PathToObj<T, V> }
  : { [K in S]: V };

export type PluginApi<P> = P extends {
  registerApi(...a: any): ApiBuilder<infer A>;
}
  ? A
  : never;

export type AuthServerWithDeps<
  ClassReference extends AbstractServerPluginClass
> = AuthServer<PluginApi<InstanceType<ClassReference["dependencies"][number]>>>;
