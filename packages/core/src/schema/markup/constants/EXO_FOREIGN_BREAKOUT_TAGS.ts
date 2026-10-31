// THE SHAPES AN HTML PARSER DOES NOT BUILD AS WRITTEN, as tag-name tables.
//
// `compileExoDomSchema` builds its prototype directly, so nothing reshapes it — and that is exactly
// why these tables exist: `@exodra/string` still prints the schema as written, a browser still
// applies these rules to those bytes, and a shape the parser moves is a page that hydrates against a
// tree the client would never have built. They live under `hydrate/` because that is the only side
// of this package that meets a parser's output, and `hydration-is-a-leaf` keeps them out of a
// client-only bundle.

/**
 * A start tag that CLOSES foreign content: inside SVG or MathML the parser pops back to HTML and
 * the element becomes a SIBLING of the `<svg>`. From "any other start tag" in the foreign-content
 * insertion mode.
 */
export const EXO_FOREIGN_BREAKOUT_TAGS: ReadonlySet<string> = new Set([
    'b',
    'big',
    'blockquote',
    'body',
    'br',
    'center',
    'code',
    'dd',
    'div',
    'dl',
    'dt',
    'em',
    'embed',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'hr',
    'i',
    'img',
    'li',
    'listing',
    'menu',
    'meta',
    'nobr',
    'ol',
    'p',
    'pre',
    'ruby',
    's',
    'small',
    'span',
    'strong',
    'strike',
    'sub',
    'sup',
    'table',
    'tt',
    'u',
    'ul',
    'var',
]);
