import {
    EXO_PORT_ATTR,
    EXO_PORT_ATTR_STRING,
    EXO_PORT_ATTR_TOGGLE,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    EXO_PORT_REF,
} from '@exodra/core';
import type { TExoAnyPort } from '@exodra/core';
import type { TExoTermElement } from '../instance/types/TExoTermElement';
import type { TExoTermWriterFactories } from './types/TExoTermWriterFactories';
import type { TExoTermWriter } from './types/TExoTermWriter';

// `null`/`undefined` becomes the empty string rather than the four characters `null`. Nothing in
// `@exodra/core` states that rule — a foreign backend has to KNOW it from the two shipped backends.
function writeText(node: TExoTermElement, value: unknown): void {
    node.text = value === null || value === undefined ? '' : String(value);
}

// The absence rule is NOT exported by `@exodra/core`: this re-derives a rule two shipped backends
// agree on. `packages/conformance`'s `the-attribute-absence-rule` holds the three together.
function createAttrWriter(name: string): TExoTermWriter {
    const markupName = name.toLowerCase();
    if (markupName === 'class') return createClassWriter(markupName);
    return (node, value) => {
        if (value === null || value === undefined || value === false) {
            delete node.attrs[markupName];
            return;
        }
        node.attrs[markupName] = value === true ? '' : String(value);
    };
}

// `class` is a PROPERTY assignment everywhere else (`el.className = v`), so it obeys neither the
// removal rule nor the boolean one: nullish leaves `class=""`, `false` lands as `class="false"`.
function createClassWriter(markupName: string): TExoTermWriter {
    return (node, value) => {
        node.attrs[markupName] = value === null || value === undefined ? '' : String(value);
    };
}

// A STRING attribute carries no absence: the kind says the value is a string, so nothing is tested
// and nothing is removed.
function namedAttrPort(name: string | null): string {
    if (name !== null) return name;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'compileExoTermSchema: an attribute port with no name cannot be written'
            : 'EXO0066'
    );
}

function createStringAttrWriter(name: string): TExoTermWriter {
    const markupName = name.toLowerCase();
    return (node, value) => {
        node.attrs[markupName] = String(value);
    };
}

// A TOGGLE carries its value in its PRESENCE, which is why falsity deletes rather than printing.
function createToggleAttrWriter(name: string): TExoTermWriter {
    const markupName = name.toLowerCase();
    return (node, value) => {
        if (value) node.attrs[markupName] = '';
        else delete node.attrs[markupName];
    };
}

function createRefusingWriter(what: string, instead: string): TExoTermWriter {
    return () => {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `TExoTermNode: set() cannot fill ${what} — use ${instead}.`
                : 'EXO0065'
        );
    };
}

// `exoDomPropertyKind(tag, name)` is deliberately NOT asked: a text tree has no properties and no
// markup, so every port is simply written. THE DIVERGENCE IS ON THE RECORD — `indeterminate` prints
// nothing on the server and prints here. `set()` on a CHILDREN port is refused: no raw markup here.
// A TABLE, NOT A CHAIN: a backend or a plugin hands `exoTermWriterForPort` its own, and a port
// kind this package never heard of is answerable without editing this package.
export const EXO_TERM_WRITER_FACTORIES: TExoTermWriterFactories = {
    [EXO_PORT_ATTR]: (name) => createAttrWriter(namedAttrPort(name)),
    [EXO_PORT_ATTR_STRING]: (name) => createStringAttrWriter(namedAttrPort(name)),
    [EXO_PORT_ATTR_TOGGLE]: (name) => createToggleAttrWriter(namedAttrPort(name)),
    [EXO_PORT_TEXT]: () => writeText,
    [EXO_PORT_EVENT]: () => createRefusingWriter('an EVENT port', 'on(port, handler)'),
    [EXO_PORT_CHILDREN]: () =>
        createRefusingWriter('a CHILDREN port', 'one() / list() / appendChild()'),
    // A ref port has no writer; the refusal fills the slot, the table having one entry per port.
    // The ADDRESS still crosses: `portNodeReader()` hands back the node.
    [EXO_PORT_REF]: () => createRefusingWriter('a REF port', 'portNodeReader() to READ the node'),
};

export function exoTermWriterForPort(
    // Every kind a schema can HOLD, not `TExoPortKind`: asked about every port walked past.
    kind: TExoAnyPort['kind'],
    name: string | null,
    writers: TExoTermWriterFactories = EXO_TERM_WRITER_FACTORIES
): TExoTermWriter {
    const make = writers[kind];
    if (make === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `compileExoTermSchema: no writer for port kind ${String(
                      kind
                  )}. A backend supplying its ` +
                  'own port-writer table must answer every kind its schemas can hold.'
                : 'EXO0067'
        );
    }
    return make(name);
}
