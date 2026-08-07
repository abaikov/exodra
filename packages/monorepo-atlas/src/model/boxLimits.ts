/**
 * How many members a box draws before it starts counting instead.
 *
 * It lives on its own because two places need it and they must not disagree:
 * the extractor SIZES the box at build time, the view DRAWS it in the browser.
 * A second copy of this number means boxes that do not fit their own contents.
 *
 * It is also why the view cannot simply import it from the extractor — that
 * module pulls in a TypeScript compiler, which has no business in a page.
 */
export const EXO_BOX_MEMBERS = 8;
