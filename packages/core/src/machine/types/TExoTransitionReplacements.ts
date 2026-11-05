export type TExoTransitionReplacements<
    TWiring,
    TMachine extends { readonly transitions: object }
> = {
    readonly [K in keyof TMachine['transitions']]?: TMachine['transitions'][K] extends (
        enode: never,
        ...data: infer TData
    ) => void
        ? (enode: TWiring, ...data: TData) => void
        : never;
};
