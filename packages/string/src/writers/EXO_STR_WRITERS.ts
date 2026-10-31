import {
    EXO_DOM_PROPERTIES,
    exoDomPropertyKind,
    escapeExoAttributeValue,
    escapeExoText,
} from '@exodra/core';
import { EXO_STRING_PROPERTY_NAMES } from './constants/EXO_STRING_PROPERTY_NAMES';
import type { TExoStrWriter } from './types/TExoStrWriter';

// An ATTRIBUTE writer returns the WHOLE attribute — ` name="`, value, quote — because only a writer
// owning the head can return `''` and REMOVE the attribute, as `@exodra/dom` does.

// Keyed by NAME and TAG, the two the answer depends on. The key space is the SCHEMAS' attribute
// names, fixed when the modules load.
const WRITERS = new Map<string, TExoStrWriter>();
const STRING_WRITERS = new Map<string, TExoStrWriter>();
const TOGGLE_WRITERS = new Map<string, TExoStrWriter>();

function escaped(value: unknown): string {
    return escapeExoAttributeValue(typeof value === 'string' ? value : String(value));
}

// `true` prints the EMPTY VALUE and not the word: hydration compares BYTES.
function attrWriterFor(head: string): TExoStrWriter {
    return (value: unknown): string => {
        if (value === null || value === undefined || value === false) return '';
        if (value === true) return head + '"';
        return head + escaped(value) + '"';
    };
}

// `class`: neither `setAttribute` rule applies — `el.className = null` leaves `class=""` standing.
function classWriterFor(head: string): TExoStrWriter {
    return (value: unknown): string => {
        if (value === null || value === undefined) return head + '"';
        return head + escaped(value) + '"';
    };
}

// Truthiness → PRESENCE: `checked=""`, `checked="false"` and `checked="0"` all tick the box.
function booleanPropertyWriterFor(head: string): TExoStrWriter {
    return (value: unknown): string => (value ? head + '"' : '');
}

// Byte for byte `classWriterFor`, deliberately not shared: this one holds by
// `[LegacyNullToEmptyString]` on `HTMLInputElement.value`. OPEN GAP in the README.
function stringPropertyWriterFor(head: string): TExoStrWriter {
    return (value: unknown): string => {
        if (value === null || value === undefined) return head + '"';
        return head + escaped(value) + '"';
    };
}

function writeNothing(): string {
    return '';
}

// Which rule applies is a question about the ELEMENT; `exoDomPropertyKind` answers BOTH backends.
function attrWriter(name: string, tag: string | null): TExoStrWriter {
    const key = name + '\u0000' + (tag === null ? '' : tag.toLowerCase());
    const cached = WRITERS.get(key);
    if (cached !== undefined) return cached;
    const markup = name.toLowerCase();
    const head = ' ' + markup + '="';
    // `undefined` = ordinary attribute, `true` = property with a markup form, `false` = without.
    const property = tag === null ? EXO_DOM_PROPERTIES[name] : exoDomPropertyKind(tag, name);
    let built: TExoStrWriter;
    if (markup === 'class') built = classWriterFor(head);
    else if (property === false) {
        // Printing nothing is what MAKES hydration's `repair-attribute` fire — a bogus
        // ` indeterminate="true"` would have it compare the server's bytes against themselves.
        built = writeNothing;
    } else if (property === true) {
        built = EXO_STRING_PROPERTY_NAMES.has(name)
            ? stringPropertyWriterFor(head)
            : booleanPropertyWriterFor(head);
    } else built = attrWriterFor(head);
    WRITERS.set(key, built);
    return built;
}

function writeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return escapeExoText(typeof value === 'string' ? value : String(value));
}

// A text port FIRST inside `<pre>`/`<listing>`/`<textarea>`: the parser eats one leading U+000A, so
// this re-emits it when the content begins with one. U+000D IS NOT HANDLED — a real gap.
function writeTextAfterNewlineEater(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = escapeExoText(typeof value === 'string' ? value : String(value));
    return text.charCodeAt(0) === 10 ? '\n' + text : text;
}

// Reached only by `set`/`bind`, so it serves the `unsafeHtml` hatch — markup, unescaped.
function writeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
}

// Separate from the text case: the browser reaches raw markup through `innerHTML`, and FRAGMENT
// parsing has no start-tag token to hang the rule on — `pre.innerHTML` KEEPS the newline.
function writeHtmlAfterNewlineEater(value: unknown): string {
    if (value === null || value === undefined) return '';
    const html = typeof value === 'string' ? value : String(value);
    return html.charCodeAt(0) === 10 ? '\n' + html : html;
}

function refuseSharedHtml(): string {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'TExoStrNode: this children port cannot be filled with set() — it shares its ' +
              'element with other children, and the DOM backend can only write raw markup ' +
              'with innerHTML, which would destroy them. Printing it here would render on ' +
              'the server and throw in the browser. Nested instances go through one(), ' +
              'list() or childList(); raw markup (unsafeHtml) needs a port that is its ' +
              "element's ONLY child."
            : 'EXO0057'
    );
}

function refuseRefWrite(): string {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'TExoStrNode: a ref port cannot be filled with set() or bind() — it has no ' +
              'writer on any backend. It exists only so that a wire can obtain the element, which ' +
              'is a browser-side capability and prints nothing here.'
            : 'EXO0058'
    );
}

function namedStrAttrPort(name: string | null): string {
    if (name !== null) return name;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'compileExoStrSchema: an attribute port reached its writer without a name'
            : 'EXO0059'
    );
}

// ONE TABLE AND NOT SEVEN EXPORTS: the seven are variants of one act over the private machinery
// above, and `@exodra/dom` spells its own set the same way in `EXO_SHIPPED_WRITERS`. Every entry is
// asked once per PORT while a schema compiles, never per write, so the property read is not on any
// hot path.
export const EXO_STR_WRITERS = {
    // A STRING attribute has no absence and no boolean form: the kind said the value is a string, so
    // the head is printed unconditionally and nothing is tested.
    stringAttr(name: string | null): TExoStrWriter {
        const markup = namedStrAttrPort(name).toLowerCase();
        const head = ' ' + markup + '="';
        const cached = STRING_WRITERS.get(head);
        if (cached !== undefined) return cached;
        const built: TExoStrWriter = (value: unknown): string => head + escaped(value) + '"';
        STRING_WRITERS.set(head, built);
        return built;
    },

    // A TOGGLE carries its value in its PRESENCE, so falsity prints nothing at all.
    toggleAttr(name: string | null): TExoStrWriter {
        const markup = namedStrAttrPort(name).toLowerCase();
        const head = ' ' + markup + '="';
        const cached = TOGGLE_WRITERS.get(head);
        if (cached !== undefined) return cached;
        const built = booleanPropertyWriterFor(head);
        TOGGLE_WRITERS.set(head, built);
        return built;
    },

    attribute(name: string | null, tag: string | null): TExoStrWriter {
        return attrWriter(namedStrAttrPort(name), tag);
    },

    // NO RAW-TEXT CASE: a text port inside `<script>`/`<style>` is refused at schema-build time by
    // `@exodra/core`'s `assertExoTextPortInRawText`, so it cannot arrive here.
    text(eatsLeadingNewline: boolean): TExoStrWriter {
        return eatsLeadingNewline ? writeTextAfterNewlineEater : writeText;
    },

    children(ownsElement: boolean, eatsLeadingNewline: boolean): TExoStrWriter {
        if (!ownsElement) return refuseSharedHtml;
        return eatsLeadingNewline ? writeHtmlAfterNewlineEater : writeHtml;
    },

    event(): TExoStrWriter {
        return writeNothing;
    },

    // NOT `writeNothing`: a ref port has no writer at all, and its only guard is the TYPE, which
    // untyped code walks past.
    ref(): TExoStrWriter {
        return refuseRefWrite;
    },
} as const;
