import { EXO_FOREIGN_ATTR_NS } from './constants/EXO_FOREIGN_ATTR_NS';
import { EXO_MATHML_ATTR_ADJUST } from './constants/EXO_MATHML_ATTR_ADJUST';
import { EXO_SVG_ATTR_ADJUST } from './constants/EXO_SVG_ATTR_ADJUST';
import { EXO_HTML_NS, EXO_SVG_NS } from '@exodra/core';
import type { TExoAttrIdentity } from './types/TExoAttrIdentity';

/**
 * The attribute a parser would have made of this LOWERCASE name on an element in `ns` — a tokenizer
 * lowercases every name in markup, and the tree builder then puts the camel case back inside
 * foreign content (`viewbox` → `viewBox`) or moves the name into a namespace (`xlink:href`).
 *
 * ASKED, NOT READ BACK. The prototype is built with `createElement`/`setAttribute` and no parser is
 * involved, so this answer exists only where it is computed: `compileExoDomSchema` writes the statics
 * through it and hands a port's answer to the writer that fills the port, and the two cannot
 * disagree about which attribute is that port's because it is one table asked once.
 *
 * An HTML element is every page's common case and adjusts nothing, so it gets the name back with no
 * lookup and no object.
 */
export function exoAttrIdentity(markup: string, ns: string | null): TExoAttrIdentity {
    if (ns === EXO_HTML_NS || ns === null) return markup;
    const foreign = EXO_FOREIGN_ATTR_NS.get(markup);
    if (foreign !== undefined) return foreign;
    const adjust = ns === EXO_SVG_NS ? EXO_SVG_ATTR_ADJUST : EXO_MATHML_ATTR_ADJUST;
    return adjust.get(markup) ?? markup;
}
