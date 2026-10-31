/** One INPUT SHAPE: the `(tag, attribute)` pairs a sample cycles through, and why it is asked. */
export type TExoPropertyKindInput = {
    readonly name: string;
    readonly pairs: ReadonlyArray<readonly [string, string]>;
    readonly why: string;
};
