import type { TExoSchema } from '@exodra/core';
import { ExoNodeString } from '@exodra/string';
import { normalizeSchemas } from './normalizeSchemas';

type TExoNodeStringSchema = ConstructorParameters<typeof ExoNodeString>[0];

/** Render a schema (or list) to HTML with the snapshot walker. */
export function renderSchemas(
    schema: TExoSchema | readonly TExoSchema[] | null | undefined
): string {
    const items = normalizeSchemas(schema);
    let html = '';
    for (let i = 0; i < items.length; i++) {
        html += new ExoNodeString(items[i] as TExoNodeStringSchema).html;
    }
    return html;
}
