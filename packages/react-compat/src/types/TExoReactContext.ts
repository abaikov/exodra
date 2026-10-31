export type TExoReactContext<TValue> = {
    readonly $$typeof: symbol;
    readonly defaultValue: TValue;
    readonly Provider: { readonly $$typeof: symbol; readonly context: TExoReactContext<TValue> };
    readonly Consumer: { readonly $$typeof: symbol; readonly context: TExoReactContext<TValue> };
};
