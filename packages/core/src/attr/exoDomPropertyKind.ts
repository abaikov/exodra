import { EXO_DOM_PROPERTY_TAGS } from './constants/EXO_DOM_PROPERTY_TAGS';

/**
 * The TABLE asked of a TAG, because the name alone is not enough: `value` is live state on an
 * `<input>`, a reflected attribute on an `<option>` and nothing on a `<div>`. The name-only
 * answer — for a caller holding no element — is `EXO_DOM_PROPERTIES`, derived from the same table.
 */
export function exoDomPropertyKind(tag: string, name: string): boolean | undefined {
    const tags = EXO_DOM_PROPERTY_TAGS.get(name);
    if (tags === undefined) return undefined;
    return tags.get(tag.toLowerCase());
}
