/** What survives inside a `<select>`; anything else is dropped or ends the select. */
export const EXO_SELECT_CONTENT: ReadonlySet<string> = new Set([
    'option',
    'optgroup',
    'hr',
    'script',
    'template',
]);
