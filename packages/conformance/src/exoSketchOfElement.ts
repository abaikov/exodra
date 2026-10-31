const HTML_NS = 'http://www.w3.org/1999/xhtml';
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

// One line per node, indented by depth: element name, non-HTML namespace, sorted attributes,
// probed properties; text runs quoted. Defined POST-PARSE, so `@exodra/string`'s bytes are seen
// only after the HTML parser has repaired them — the blind spots that follow from that, and the
// one false positive, are enumerated in README.md.
export function exoSketchOfElement(el: Element, probe: readonly string[]): string {
    const lines: string[] = [];
    walk(el, 0, lines, probe);
    return lines.join('\n');
}

// `Node` and not `ParentNode`: this walks `childNodes`, which lives on `Node`, and a text run
// between two instances is part of the artefact so `children` would drop it.
export function exoSketchOfChildren(parent: Node, probe: readonly string[]): string {
    const lines: string[] = [];
    const kids = parent.childNodes;
    for (let i = 0; i < kids.length; i++) sketchNode(kids[i], 0, lines, probe);
    return lines.join('\n');
}

function sketchNode(node: Node, depth: number, lines: string[], probe: readonly string[]): void {
    if (node.nodeType === ELEMENT_NODE) {
        walk(node as Element, depth, lines, probe);
        return;
    }
    if (node.nodeType !== TEXT_NODE) return;
    const text = (node as Text).data.trim();
    if (text !== '') lines.push('  '.repeat(depth) + '"' + text + '"');
}

function walk(el: Element, depth: number, lines: string[], probe: readonly string[]): void {
    let line = '  '.repeat(depth) + el.localName;
    const ns = el.namespaceURI;
    if (ns !== null && ns !== HTML_NS) line += ' @' + ns;

    // The key carries the namespace because nothing else separates the two forms:
    // `setAttribute('xlink:href', …)` makes a null-namespace attribute whose local name is the
    // whole string, while the parser's "adjust foreign attributes" makes one in the XLink
    // namespace named `href`. Printed by `name` alone they are the same line.
    const attrs: string[] = [];
    const list = el.attributes;
    for (let i = 0; i < list.length; i++) {
        const attr = list[i];
        const key =
            attr.namespaceURI === null ? attr.name : attr.namespaceURI + '|' + attr.localName;
        attrs.push(' ' + key + '="' + attr.value + '"');
    }
    attrs.sort();
    for (let i = 0; i < attrs.length; i++) line += attrs[i];

    // Probed properties are the only way a property with no markup form is observable at all: the
    // assignment leaves nothing in the tree's shape. Absence prints too (`!name=∅`), because an
    // element with no such property and one holding `false` are different pages.
    if (probe.length > 0) {
        const probed: string[] = [];
        for (let i = 0; i < probe.length; i++) {
            const name = probe[i];
            if (!(name in el)) {
                probed.push(' !' + name + '=∅');
                continue;
            }
            const value = (el as unknown as Record<string, unknown>)[name];
            probed.push(' !' + name + '=' + describeProbe(value));
        }
        probed.sort();
        for (let i = 0; i < probed.length; i++) line += probed[i];
    }

    lines.push(line);

    const kids = el.childNodes;
    for (let i = 0; i < kids.length; i++) sketchNode(kids[i], depth + 1, lines, probe);
}

// Primitives print their value, anything else only its type: a node or a `DOMTokenList` has
// per-instance identity and would make every backend diverge for a reason that is not the rule's.
function describeProbe(value: unknown): string {
    const kind = typeof value;
    if (value === null) return 'null';
    if (kind === 'string' || kind === 'number' || kind === 'boolean') return JSON.stringify(value);
    return '<' + kind + '>';
}
