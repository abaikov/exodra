// Real elements in BOTH HTML and SVG, so a schema's root tag cannot be classified by them. They
// are treated as HTML unless the markup holds an SVG-only element below the root with no `<svg>`
// in between — refusing them would refuse a link component rooted at `<a>`.
// Uncovered: a component that is ONLY `<title>`, or only `<a>` with text, nested into an `<svg>`
// child list. It compiles as HTML while the server's markup parses as the SVG one.
export const EXO_DUAL_NAMESPACE_TAGS: ReadonlySet<string> = new Set([
    'a',
    'title',
    'script',
    'style',
]);
