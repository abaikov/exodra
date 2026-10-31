/** The section the parser inserts around a table child written without one. */
export const EXO_TABLE_IMPLIED_SECTION: ReadonlyMap<string, string> = new Map([
    ['tr', 'tbody'],
    ['td', 'tbody'],
    ['th', 'tbody'],
    ['col', 'colgroup'],
]);
