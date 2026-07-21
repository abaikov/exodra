export type TExoContextKey<TValue> = {
    readonly id: symbol;
    readonly name?: string;
    readonly __value?: TValue;
};
