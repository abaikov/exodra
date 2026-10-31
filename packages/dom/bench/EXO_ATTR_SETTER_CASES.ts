import { EXO_PORT_ATTR } from '@exodra/core';
import { createExoAttrWrite } from '../src/dom/factories/createExoAttrWrite';
import { exoAttrIdentity } from '../src/dom/exoAttrIdentity';
import type { TExoAttrWrite } from '../src/dom/types/TExoAttrWrite';
import type { TExoDomSetter } from '../src/dom/types/TExoDomSetter';
import type { TExoWriteCase } from './types/TExoWriteCase';

const SVG_NS = 'http://www.w3.org/2000/svg';

// The schema's writer table, and the nodes to warm it with. `EXO_DOM_NODE_VOCABULARY.ts:77` reaches a writer as
// `schema.setters[index](node, value)` — an ARRAY LOAD through a site that sees every writer shape a
// component holds, so that site is megamorphic by construction. The `via·table` rows below
// reproduce exactly that, and slot 0 is swapped to the case's own writer.
export const EXO_WRITER_TABLE: TExoDomSetter[] = [];
// The SECOND array a schema carries beside `setters`: a writer's datum, read by index every call.
export const EXO_WRITE_DATA: unknown[] = [];
export const EXO_WARM_NODES: Element[] = [];

/** The shipped attribute writer, asked exactly the way `compileExoDomSchema` asks it — the kind a
 *  `port(name)` mints, and the identity the element that was BUILT answers to. */
export function exoShippedWrite(name: string, proto: Element): TExoAttrWrite {
    return createExoAttrWrite(
        name,
        proto,
        EXO_PORT_ATTR,
        exoAttrIdentity(name.toLowerCase(), proto.namespaceURI)
    );
}

export function exoFillWriterTable(document: Document): void {
    const div = document.createElement('div');
    const input = document.createElement('input');
    const button = document.createElement('button');
    const rect = document.createElementNS(SVG_NS, 'rect');
    const shapes: readonly [Element, string][] = [
        [div, 'class'],
        [div, 'class'],
        [div, 'data-id'],
        [input, 'value'],
        [input, 'checked'],
        [div, 'title'],
        [button, 'disabled'],
        [rect, 'class'],
    ];
    EXO_WRITER_TABLE.length = 0;
    EXO_WRITE_DATA.length = 0;
    EXO_WARM_NODES.length = 0;
    for (const [proto, name] of shapes) {
        const built = exoShippedWrite(name, proto);
        EXO_WRITER_TABLE.push(built.write);
        EXO_WRITE_DATA.push(built.data);
        EXO_WARM_NODES.push(proto.cloneNode(false) as Element);
    }
}

function warmTable(): void {
    for (let k = 1; k < EXO_WRITER_TABLE.length; k++) {
        EXO_WRITER_TABLE[k](EXO_WARM_NODES[k], 'x', EXO_WRITE_DATA[k]);
    }
}

function driveClassShipped(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveClassTwin(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveClassTable(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    warmTable();
    for (let i = 0; i < calls; i++) EXO_WRITER_TABLE[0](node, values[i & 7], EXO_WRITE_DATA[0]);
}

function driveClassAttr(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) node.setAttribute('class', values[i & 7] as string);
}

function driveClassFloor(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) (node as HTMLElement).className = values[i & 7] as string;
}

function driveAttrShipped(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveAttrTwin(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveAttrTable(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    warmTable();
    for (let i = 0; i < calls; i++) EXO_WRITER_TABLE[0](node, values[i & 7], EXO_WRITE_DATA[0]);
}

function driveAttrFloor(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) {
        const value = values[i & 7];
        if (value === null) node.removeAttribute('data-id');
        else node.setAttribute('data-id', value as string);
    }
}

function driveValueShipped(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveValueTwin(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveValueTable(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    warmTable();
    for (let i = 0; i < calls; i++) EXO_WRITER_TABLE[0](node, values[i & 7], EXO_WRITE_DATA[0]);
}

function driveValueFloor(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    const box = node as HTMLInputElement;
    for (let i = 0; i < calls; i++) box.value = values[i & 7] as string;
}

function driveCheckedShipped(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveCheckedTwin(
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    for (let i = 0; i < calls; i++) write(node, values[i & 7], data);
}

function driveCheckedTable(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    warmTable();
    for (let i = 0; i < calls; i++) EXO_WRITER_TABLE[0](node, values[i & 7], EXO_WRITE_DATA[0]);
}

function driveCheckedFloor(
    _write: TExoDomSetter,
    _data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): void {
    const box = node as HTMLInputElement;
    for (let i = 0; i < calls; i++) {
        const value = values[i & 7] as boolean;
        box.checked = value;
        if (value) box.setAttribute('checked', '');
        else box.removeAttribute('checked');
    }
}

const TABLE_DIFFERS =
    'nothing — the same writer, reached the way a wire reaches it: an array load through a site ' +
    'that has seen every writer shape in the schema. The gap to `shipped` is what that dispatch costs.';

const NO_STATE = (): string => '';

export const EXO_ATTR_SETTER_CASES: readonly TExoWriteCase[] = [
    {
        name: 'class·div',
        why: 'the writer exo-attr-setter.ts:49 chooses for every non-SVG class port',
        reach: 'compileExoDomSchema.ts:558 builds it once per schema; exo-dom-bind.ts:56 calls it on every change',
        tag: 'div',
        attr: 'class',
        values: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
        state: NO_STATE,
        expect: '<div class="c7"></div>|',
        variants: [
            { name: 'shipped', differs: null, drive: driveClassShipped },
            { name: 'shipped·twin', differs: null, drive: driveClassTwin },
            { name: 'via·table', differs: TABLE_DIFFERS, drive: driveClassTable },
            {
                name: 'attr·set',
                differs:
                    'nothing observable — it is the branch exo-attr-setter.ts:45 takes for an ' +
                    'SVG element, measured here on an HTML one.',
                drive: driveClassAttr,
            },
            {
                name: 'floor·inline',
                differs:
                    'it KNOWS the value is a string and the element is HTML, so it carries no ' +
                    'null test, no String() and no closure. That is the program a hand-written ' +
                    'app contains.',
                drive: driveClassFloor,
            },
        ],
    },
    {
        name: 'data-id·div',
        why: 'the general attribute writer, with a null every fourth write so the removal branch is live',
        reach: 'compileExoDomSchema.ts:558; the null arm is what @exodra/router notifies with (exo-dom-bind.ts:14)',
        tag: 'div',
        attr: 'data-id',
        values: ['d0', 'd1', null, 'd3', 'd4', null, 'd6', 'd7'],
        state: NO_STATE,
        expect: '<div data-id="d7"></div>|',
        variants: [
            { name: 'shipped', differs: null, drive: driveAttrShipped },
            { name: 'shipped·twin', differs: null, drive: driveAttrTwin },
            { name: 'via·table', differs: TABLE_DIFFERS, drive: driveAttrTable },
            {
                name: 'floor·inline',
                differs:
                    'it KNOWS the only empty value is `null` and the name is a literal, so it ' +
                    'tests once where the shipped writer tests `== null`, then `=== false`, then ' +
                    '`=== true`, and calls String().',
                drive: driveAttrFloor,
            },
        ],
    },
    {
        name: 'value·input',
        why: 'the property writer — live state, which markup cannot carry (exo-attr-setter.ts:36)',
        reach: 'compileExoDomSchema.ts:558 via writes-exo-attribute.ts:11; every keystroke binding',
        tag: 'input',
        attr: 'value',
        values: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'],
        state: (node) => (node as HTMLInputElement).value,
        expect: '<input>|v7',
        variants: [
            { name: 'shipped', differs: null, drive: driveValueShipped },
            { name: 'shipped·twin', differs: null, drive: driveValueTwin },
            { name: 'via·table', differs: TABLE_DIFFERS, drive: driveValueTable },
            {
                name: 'floor·inline',
                differs:
                    'it KNOWS the value is a string, so it skips the `?? null` that exists ' +
                    'because `value = undefined` writes the word "undefined" into the box.',
                drive: driveValueFloor,
            },
        ],
    },
    {
        name: 'checked·input',
        why: 'the property AND attribute writer: the attribute is the control’s reset value (exo-attr-setter.ts:27)',
        reach: 'compileExoDomSchema.ts:558; the second DOM op per write is the form.reset() fix',
        tag: 'input',
        attr: 'checked',
        values: [true, false, true, false, true, false, true, true],
        state: (node) => String((node as HTMLInputElement).checked),
        expect: '<input checked="">|true',
        variants: [
            { name: 'shipped', differs: null, drive: driveCheckedShipped },
            { name: 'shipped·twin', differs: null, drive: driveCheckedTwin },
            { name: 'via·table', differs: TABLE_DIFFERS, drive: driveCheckedTable },
            {
                name: 'floor·inline',
                differs:
                    'the same two DOM operations with the name and the element kind known at ' +
                    'authoring time. A row that performed only the property write would be ' +
                    'faster and is NOT in this field: it reaches a different document.',
                drive: driveCheckedFloor,
            },
        ],
    },
];
