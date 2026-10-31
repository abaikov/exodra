/** Parents where a run of non-whitespace text is foster-parented out in front of the `<table>`. */
export const EXO_FOSTERING_TEXT_PARENTS: ReadonlySet<string> = new Set([
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'colgroup',
]);
