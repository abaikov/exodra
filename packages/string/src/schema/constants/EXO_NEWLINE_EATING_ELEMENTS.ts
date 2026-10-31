// The elements whose first line feed the PARSER eats, which makes it this backend's problem alone.
// `listing` is obsolete and still eaten by every browser. `<title>` is deliberately absent: RCDATA,
// but the rule attaches to three specific start tags in "in body". Every lookup lowercases its tag.
export const EXO_NEWLINE_EATING_ELEMENTS: ReadonlySet<string> = new Set([
    'pre',
    'listing',
    'textarea',
]);
