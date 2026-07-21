import type { TExoSchema } from '@exodra/core';
import { ExoNodeString } from './ExoNodeString';

export function createStringNode(schema: TExoSchema): ExoNodeString {
    return new ExoNodeString(
        schema as ConstructorParameters<typeof ExoNodeString>[0]
    );
}
