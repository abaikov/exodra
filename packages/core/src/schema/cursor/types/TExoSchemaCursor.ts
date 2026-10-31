import type { TExoEmitter } from '../../types/TExoEmitter';
import type { TExoSchemaDraft } from './TExoSchemaDraft';

export interface TExoSchemaCursor<TPorts = unknown> extends TExoEmitter<TPorts> {
    receiver: TExoSchemaCursor<TPorts>;

    readonly draft: TExoSchemaDraft;

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (cursor: TExoSchemaCursor<TPorts>) => void
    ): TExoSchemaCursor<TPorts>;

    text(value: unknown): TExoSchemaCursor<TPorts>;

    fork(): TExoSchemaCursor<TPorts>;
}
