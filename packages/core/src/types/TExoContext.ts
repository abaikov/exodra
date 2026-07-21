import type { TExoNodeSchema } from './TExoNodeSchema';
import type { TExoContextKey } from './TExoContextKey';

export type TExoContext<TSchema extends TExoNodeSchema = TExoNodeSchema> = {
    schema: TSchema;
    createNode<TNodeSchema extends TExoNodeSchema>(
        schema: TNodeSchema
    ): TNodeSchema;
    getConstant<TValue = unknown>(name: string): TValue | undefined;
    getBindable<TValue = unknown>(name: string): TValue | undefined;
    getBindableList<TValue = unknown>(name: string): TValue | undefined;
    provide<TValue>(key: TExoContextKey<TValue>, value: TValue): void;
    inject<TValue>(
        key: TExoContextKey<TValue>,
        fallback?: TValue
    ): TValue | undefined;
    onDispose(cleanup: () => void): void;
};
