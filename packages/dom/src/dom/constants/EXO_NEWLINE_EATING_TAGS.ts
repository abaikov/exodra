/** Elements whose first child character is a newline the parser eats — spec, "element restrictions". */
export const EXO_NEWLINE_EATING_TAGS: ReadonlySet<string> = new Set(['pre', 'listing', 'textarea']);
