import { ExoAssertingSchemaCursor } from './ExoAssertingSchemaCursor';
import type { TExoSchemaCursor } from './types/TExoSchemaCursor';

export function withExoSchemaAsserts<TPorts>(
    cursor: TExoSchemaCursor<TPorts>
): TExoSchemaCursor<TPorts> {
    return new ExoAssertingSchemaCursor<TPorts>(cursor, '#holder');
}
