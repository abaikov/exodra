import type { TExoBackendType } from './TExoBackendType';

type TExoDoorArgument<TApi, TDoor extends string> = TApi extends {
    readonly [K in TDoor]: (argument: infer TArgument) => unknown;
}
    ? TArgument
    : never;

type TExoApiOf<TType> = TType extends TExoBackendType<infer TApi> ? TApi : never;

type TExoMissingDoor<TTypes, TDoor extends string> = {
    [K in keyof TTypes]: TExoApiOf<TTypes[K]> extends { readonly [D in TDoor]: unknown }
        ? never
        : K;
}[keyof TTypes];

type TExoIntersection<TUnion> = (TUnion extends unknown ? (value: TUnion) => void : never) extends (
    value: infer TAll
) => void
    ? TAll
    : never;

export type TExoBackendCompatible<
    TTypes extends Readonly<Record<string, TExoBackendType<object>>>,
    TDoor extends string
> = [TExoMissingDoor<TTypes, TDoor>] extends [never]
    ? TExoIntersection<
          { [K in keyof TTypes]: TExoDoorArgument<TExoApiOf<TTypes[K]>, TDoor> }[keyof TTypes]
      >
    : { readonly backendWithoutDoor: TExoMissingDoor<TTypes, TDoor> };
