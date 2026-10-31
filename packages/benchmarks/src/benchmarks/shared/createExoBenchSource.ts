import type { TExoBenchSource } from './types/TExoBenchSource';

class ExoBenchSource<TValue> implements TExoBenchSource<TValue> {
    private value: TValue;
    private single: (() => void) | null = null;
    private many: Set<() => void> | null = null;

    constructor(initial: TValue) {
        this.value = initial;
    }

    getValue(): TValue {
        return this.value;
    }

    setValue(next: TValue): void {
        if (next === this.value) return;
        this.value = next;
        const one = this.single;
        if (one !== null) {
            one();
            return;
        }
        const many = this.many;
        if (many !== null) for (const listener of many) listener();
    }

    onChange(listener: () => void): () => void {
        if (this.single === null && this.many === null) {
            this.single = listener;
            return () => {
                if (this.single === listener) this.single = null;
                else if (this.many !== null) this.many.delete(listener);
            };
        }
        const many = this.many ?? (this.many = new Set());
        if (this.single !== null) {
            many.add(this.single);
            this.single = null;
        }
        many.add(listener);
        return () => {
            many.delete(listener);
        };
    }
}

export function createExoBenchSource<TValue>(initial: TValue): TExoBenchSource<TValue> {
    return new ExoBenchSource(initial);
}
