import type { TExoSchema } from './TExoSchema';

/**
 * Interface for bindable-like objects (duck typing)
 */
interface BindableLike<T> {
    getValue(): T;
    setValue(value: T): void;
    subscribe(callback: (value: T) => void): () => void;
}

/**
 * Interface for bindable list-like objects (duck typing)
 */
interface BindableListLike<T> {
    snapshot(): readonly T[];
    subscribeOps(callback: (ops: unknown) => void): () => void;
}

/**
 * Represents a child element that can be:
 * - Static schema
 * - Bindable that holds a schema
 * - BindableList of schemas
 */
export type TExoChild = 
    | TExoSchema 
    | BindableLike<TExoSchema | null>
    | BindableListLike<TExoSchema>;

/**
 * Mixed children array - can contain any combination of static and reactive children
 */
export type TExoChildren = readonly TExoChild[];