/**
 * `value` is a PHANTOM, never present at runtime, and `readonly` keeps the token covariant so a
 * frame can hold `TExoContextToken<unknown>`. `name` is never compared and need not be unique.
 */
export type TExoContextToken<TValue> = {
    readonly name: string;
    readonly value: TValue;
};
