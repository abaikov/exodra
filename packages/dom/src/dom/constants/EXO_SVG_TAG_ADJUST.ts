// The HTML parser's "adjust SVG tag names", "adjust SVG attributes", "adjust MathML attributes" and
// "adjust foreign attributes" tables, transcribed from the tree-construction spec.
//
// WHY THIS BACKEND CARRIES THEM AT ALL. A tokenizer lowercases every tag and attribute name before
// the tree builder sees it, and these four tables are what puts the camel case back inside foreign
// content. `@exodra/string` prints what the schema declares and a browser applies the tables to
// those bytes, so a prototype built by `createElementNS`/`setAttribute` — which apply nothing — is
// the same page only if it applies them itself. Without the `viewbox` → `viewBox` line a client
// render draws an SVG with no viewBox where the served page has one.

export const EXO_SVG_TAG_ADJUST: ReadonlyMap<string, string> = new Map([
    ['altglyph', 'altGlyph'],
    ['altglyphdef', 'altGlyphDef'],
    ['altglyphitem', 'altGlyphItem'],
    ['animatecolor', 'animateColor'],
    ['animatemotion', 'animateMotion'],
    ['animatetransform', 'animateTransform'],
    ['clippath', 'clipPath'],
    ['feblend', 'feBlend'],
    ['fecolormatrix', 'feColorMatrix'],
    ['fecomponenttransfer', 'feComponentTransfer'],
    ['fecomposite', 'feComposite'],
    ['feconvolvematrix', 'feConvolveMatrix'],
    ['fediffuselighting', 'feDiffuseLighting'],
    ['fedisplacementmap', 'feDisplacementMap'],
    ['fedistantlight', 'feDistantLight'],
    ['fedropshadow', 'feDropShadow'],
    ['feflood', 'feFlood'],
    ['fefunca', 'feFuncA'],
    ['fefuncb', 'feFuncB'],
    ['fefuncg', 'feFuncG'],
    ['fefuncr', 'feFuncR'],
    ['fegaussianblur', 'feGaussianBlur'],
    ['feimage', 'feImage'],
    ['femerge', 'feMerge'],
    ['femergenode', 'feMergeNode'],
    ['femorphology', 'feMorphology'],
    ['feoffset', 'feOffset'],
    ['fepointlight', 'fePointLight'],
    ['fespecularlighting', 'feSpecularLighting'],
    ['fespotlight', 'feSpotLight'],
    ['fetile', 'feTile'],
    ['feturbulence', 'feTurbulence'],
    ['foreignobject', 'foreignObject'],
    ['glyphref', 'glyphRef'],
    ['lineargradient', 'linearGradient'],
    ['radialgradient', 'radialGradient'],
    ['textpath', 'textPath'],
]);
