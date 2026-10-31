/**
 * Tags the parser answers with something other than an element in that position: the document's own
 * structure is created once and a second start tag for it only merges attributes, and an `<image>`
 * start tag in HTML content is rewritten to `<img>`.
 */
export const EXO_UNBUILDABLE_TAGS: ReadonlySet<string> = new Set([
    'body',
    'frame',
    'frameset',
    'head',
    'html',
    'image',
]);
