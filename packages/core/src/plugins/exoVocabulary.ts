import type { TExoVocabularyPlugin } from './types/TExoVocabularyPlugin';

/**
 * ONE HAZARD: it reads OWN ENUMERABLE keys, so a table assembled by spreading another contributes
 * every name it inherited by value and none it inherited by prototype.
 */
export function exoVocabulary<TMethods extends object, TMore extends object = object>(
    methods: TMethods,
    more?: TMore
): TExoVocabularyPlugin<TMethods & TMore> {
    const pack: Record<string, unknown> = {};
    const tables: readonly object[] = more === undefined ? [methods] : [methods, more];
    for (let t = 0; t < tables.length; t++) {
        const table = tables[t] as Record<string, unknown>;
        const names = Object.keys(table);
        for (let i = 0; i < names.length; i++) {
            // Read into a local so the factory closes over the METHOD and not the table — one reading
            // `table[name]` later would follow a table somebody mutated.
            const method = table[names[i]];
            pack[names[i]] = (): unknown => method;
        }
    }
    return pack as TExoVocabularyPlugin<TMethods & TMore>;
}
