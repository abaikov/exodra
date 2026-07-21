import type { TExoChildren } from './TExoChild';

export type TExoSchemaProps = {
    static?: Record<string, unknown>;
    bindables?: Record<string, unknown>;
    bindableLists?: Record<string, unknown>;
    handlers?: Record<string, (event: Event) => void>;
    bindableHandlers?: Record<string, unknown>;
    children?: TExoChildren;
};
