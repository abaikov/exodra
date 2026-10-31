/**
 * By parent: the child tags that close it instead of nesting in it. `<a>` is the adoption agency
 * rather than a plain close, and the result is a reshape either way.
 */
export const EXO_SELF_CLOSING_PARENTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ['a', new Set(['a'])],
    ['button', new Set(['button'])],
    ['dd', new Set(['dd', 'dt'])],
    ['dt', new Set(['dd', 'dt'])],
    ['form', new Set(['form'])],
    ['li', new Set(['li'])],
    ['nobr', new Set(['nobr'])],
    ['optgroup', new Set(['optgroup', 'option'])],
    ['option', new Set(['optgroup', 'option'])],
    ['rp', new Set(['rp', 'rt'])],
    ['rt', new Set(['rp', 'rt'])],
]);
