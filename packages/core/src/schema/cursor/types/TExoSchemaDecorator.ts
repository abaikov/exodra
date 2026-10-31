import type { TExoSchemaCursor } from './TExoSchemaCursor';

export type TExoSchemaDecorator<TPorts = unknown> = (
    cursor: TExoSchemaCursor<TPorts>
) => TExoSchemaCursor<TPorts>;
