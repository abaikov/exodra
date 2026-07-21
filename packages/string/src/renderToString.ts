import type { TExoSchema } from '@exodra/core';
import { ExoNodeString } from './ExoNodeString';

export function renderToString(schema: TExoSchema): string {
    const node = new ExoNodeString(
        schema as ConstructorParameters<typeof ExoNodeString>[0]
    );
    
    return node.html;
}
