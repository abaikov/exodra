// The three element namespaces an HTML parser can put a start tag in, and the three attribute
// namespaces its "adjust foreign attributes" step can put an attribute in. `compileExoDomSchema`
// builds its prototype with `createElementNS`, so it has to decide by hand what the parser used to
// decide for it.
export const EXO_HTML_NS = 'http://www.w3.org/1999/xhtml';
