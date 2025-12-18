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

// Get the instance type of a plugin class
type PluginInstance<C extends AbstractServerPluginClass> = InstanceType<C>;

// Safely get the API type from a plugin *class* (via its instance)
type PluginApiOfClass<C extends AbstractServerPluginClass> = PluginApi<
  PluginInstance<C>
>;

// All dependency plugin classes of a plugin class
type DepPluginClass<C extends AbstractServerPluginClass> =
  C["dependencies"] extends readonly (infer D)[]
    ? D extends AbstractServerPluginClass
      ? D
      : never
    : never;

// Intersection of all dependency APIs.
// This is the *raw* version; we’ll wrap it in TBaseApi later.
type RawDepApis<C extends AbstractServerPluginClass> =
  DepPluginClass<C> extends never
    ? {}
    : UnionToIntersection<PluginApiOfClass<DepPluginClass<C>>>;

// Own API of the plugin class (raw)
type RawSelfApi<C extends AbstractServerPluginClass> = PluginApiOfClass<C>;

// Now force these to satisfy TBaseApi by intersecting with it.
// This both satisfies the constraint and keeps the concrete keys.
type DepApis<C extends AbstractServerPluginClass> = TBaseApi & RawDepApis<C>;

type SelfApi<C extends AbstractServerPluginClass> = TBaseApi & RawSelfApi<C>;

// Combined API visible when registering *routes* for this plugin:
// - its own API
// - plus all dependency APIs
type PluginWithDepsApi<C extends AbstractServerPluginClass> = TBaseApi &
  SelfApi<C> &
  DepApis<C>;

// When registering APIs for this plugin, you only see dependency APIs
type AuthServerWithDeps<C extends AbstractServerPluginClass> = AuthServer<
  DepApis<C>
>;

export type AuthServerRegisterApi<
  ClassReference extends AbstractServerPluginClass
> = AuthServerWithDeps<ClassReference>;

// When registering routes, you see both your own API and dependency APIs
export type AuthServerRegisterRoute<
  ClassReference extends AbstractServerPluginClass
> = AuthServer<PluginWithDepsApi<ClassReference>>;
