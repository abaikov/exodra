export type TExoBindable<TValue = unknown, TEvent = void> = {
    getValue(): TValue;
    subscribe(update: (event: TEvent) => void): () => void;
};
