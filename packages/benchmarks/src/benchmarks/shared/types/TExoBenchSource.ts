export interface TExoBenchSource<TValue> {
    getValue(): TValue;
    setValue(next: TValue): void;
    onChange(listener: () => void): () => void;
}
