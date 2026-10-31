export type TExoTestSource<TValue> = {
    getValue(): TValue;
    setValue(next: TValue): void;
    // `(...event: never[])` and not `()`: a listener declaring an event parameter is still accepted.
    // See README.
    onChange(cb: (...event: never[]) => void): () => void;
    // Zero after a correct teardown: this count IS the leak assertion, no shipped source has it.
    subscribers(): number;
};
