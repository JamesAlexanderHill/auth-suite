import type ApiBuilder from "./api-builder";

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

export type TAsyncFunc = (...args: any) => Promise<any>;
export type TBaseApi = {
	[key: string]: TAsyncFunc | TBaseApi | undefined;
} | {};
export type TBaseRoutes = unknown;
export type TBaseMiddleware = unknown;
export type PathToObj<S extends string, V> = S extends `${infer H}.${infer T}`
  ? { [K in H]: PathToObj<T, V> }
  : { [K in S]: V };

export type PluginApi<P> =
  P extends { registerApi(...a: any): ApiBuilder<infer A> } ? A : never;