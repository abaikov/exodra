/**
 * By parent: the element children that survive there. Everything else inside a table is
 * FOSTER-PARENTED — moved out in front of the `<table>` — and `<tr>`, `<td>`, `<th>` and `<col>`
 * have their missing section inserted around them instead.
 */
export const EXO_TABLE_CONTENT: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    [
        'table',
        new Set(['caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'template', 'script', 'style']),
    ],
    ['thead', new Set(['tr', 'template', 'script', 'style'])],
    ['tbody', new Set(['tr', 'template', 'script', 'style'])],
    ['tfoot', new Set(['tr', 'template', 'script', 'style'])],
    ['tr', new Set(['td', 'th', 'template', 'script', 'style'])],
    ['colgroup', new Set(['col', 'template'])],
]);
