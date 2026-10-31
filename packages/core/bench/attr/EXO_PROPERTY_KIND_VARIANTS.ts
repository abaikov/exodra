import { exoDomPropertyKind } from '../../src/attr/exoDomPropertyKind';
import type { TExoPropertyKindStream } from './types/TExoPropertyKindStream';
import type { TExoPropertyKindVariant } from './types/TExoPropertyKindVariant';

// EVERY VARIANT CARRIES ITS OWN LOOP, and that is the whole reason this file is repetitive. A
// single driver taking the implementation as a parameter would make the call inside it
// megamorphic for every row alike — a tax no real call site pays, and one large enough to flatten
// the differences this bench exists to show. Written out, each call is monomorphic and inlinable,
// which is what `compileExoDomSchema.ts` and `exo-writer-for-port.ts` have at their call sites.
//
// THE `toLowerCase` POLICY, stated once: every variant pays it EXACTLY WHERE THE SHIPPED ONE DOES
// — after the attribute name is known to be in the table — except the flat map, which structurally
// cannot, because its one lookup needs the whole key built first. That is not a handicap applied
// to it; it is what that design costs, and `name·miss` and `stranger` are the inputs that price it.

const PROPERTY_TAGS_TWIN: ReadonlyMap<string, ReadonlyMap<string, boolean>> = new Map([
    [
        'value',
        new Map([
            ['input', true],
            ['select', false],
            ['textarea', false],
            ['output', false],
        ]),
    ],
    ['checked', new Map([['input', true]])],
    ['selected', new Map([['option', true]])],
    ['indeterminate', new Map([['input', false]])],
]);

function answerTwin(tag: string, attr: string): boolean | undefined {
    const tags = PROPERTY_TAGS_TWIN.get(attr);
    if (tags === undefined) return undefined;
    return tags.get(tag.toLowerCase());
}

const FLAT: ReadonlyMap<string, boolean> = new Map([
    ['value|input', true],
    ['value|select', false],
    ['value|textarea', false],
    ['value|output', false],
    ['checked|input', true],
    ['selected|option', true],
    ['indeterminate|input', false],
]);

// The separator is APPENDED UNCONDITIONALLY, so an attribute literally spelled `value|input`
// builds `value|input|` and cannot collide with the `value`/`input` pair.
function answerFlat(tag: string, attr: string): boolean | undefined {
    return FLAT.get(attr + '|' + tag.toLowerCase());
}

type TExoPropertyKindDict = Record<string, boolean | undefined>;

function dict(entries: ReadonlyArray<readonly [string, boolean]>): TExoPropertyKindDict {
    const out = Object.create(null) as TExoPropertyKindDict;
    for (const [key, value] of entries) out[key] = value;
    return out;
}

// `Object.create(null)`, NOT an object literal: a keyed load on a literal answers a FUNCTION for
// `constructor` and `toString`, and the names here are whatever an application passed to `port()`.
// That is the defect `exo-attr-write-spec.ts` records having shipped once.
const NULL_PROTO = Object.create(null) as Record<string, TExoPropertyKindDict | undefined>;
NULL_PROTO.value = dict([
    ['input', true],
    ['select', false],
    ['textarea', false],
    ['output', false],
]);
NULL_PROTO.checked = dict([['input', true]]);
NULL_PROTO.selected = dict([['option', true]]);
NULL_PROTO.indeterminate = dict([['input', false]]);

function answerNullProto(tag: string, attr: string): boolean | undefined {
    const tags = NULL_PROTO[attr];
    if (tags === undefined) return undefined;
    return tags[tag.toLowerCase()];
}

function answerSwitch(tag: string, attr: string): boolean | undefined {
    switch (attr) {
        case 'value': {
            const lower = tag.toLowerCase();
            switch (lower) {
                case 'input':
                    return true;
                case 'select':
                case 'textarea':
                case 'output':
                    return false;
                default:
                    return undefined;
            }
        }
        case 'checked':
            return tag.toLowerCase() === 'input' ? true : undefined;
        case 'selected':
            return tag.toLowerCase() === 'option' ? true : undefined;
        case 'indeterminate':
            return tag.toLowerCase() === 'input' ? false : undefined;
        default:
            return undefined;
    }
}

// THE NATIVE FLOOR: what a hand-written program with no table and no abstraction would contain,
// answering identically. An axis without one can rank its participants and cannot say what any of
// them is worth — see `packages/benchmarks/README.md`.
function answerFloor(tag: string, attr: string): boolean | undefined {
    if (attr === 'value') {
        const lower = tag.toLowerCase();
        if (lower === 'input') return true;
        if (lower === 'select' || lower === 'textarea' || lower === 'output') return false;
        return undefined;
    }
    if (attr === 'checked') return tag.toLowerCase() === 'input' ? true : undefined;
    if (attr === 'selected') return tag.toLowerCase() === 'option' ? true : undefined;
    if (attr === 'indeterminate') return tag.toLowerCase() === 'input' ? false : undefined;
    return undefined;
}

function driveShipped(stream: TExoPropertyKindStream): number {
    const tags = stream.tags;
    const attrs = stream.attrs;
    let acc = 0;
    for (let i = 0; i < tags.length; i++) {
        const answer = exoDomPropertyKind(tags[i], attrs[i]);
        if (answer === true) acc++;
        else if (answer === false) acc--;
    }
    return acc;
}

function driveTwin(stream: TExoPropertyKindStream): number {
    const tags = stream.tags;
    const attrs = stream.attrs;
    let acc = 0;
    for (let i = 0; i < tags.length; i++) {
        const answer = answerTwin(tags[i], attrs[i]);
        if (answer === true) acc++;
        else if (answer === false) acc--;
    }
    return acc;
}

function driveFlat(stream: TExoPropertyKindStream): number {
    const tags = stream.tags;
    const attrs = stream.attrs;
    let acc = 0;
    for (let i = 0; i < tags.length; i++) {
        const answer = answerFlat(tags[i], attrs[i]);
        if (answer === true) acc++;
        else if (answer === false) acc--;
    }
    return acc;
}

function driveNullProto(stream: TExoPropertyKindStream): number {
    const tags = stream.tags;
    const attrs = stream.attrs;
    let acc = 0;
    for (let i = 0; i < tags.length; i++) {
        const answer = answerNullProto(tags[i], attrs[i]);
        if (answer === true) acc++;
        else if (answer === false) acc--;
    }
    return acc;
}

function driveSwitch(stream: TExoPropertyKindStream): number {
    const tags = stream.tags;
    const attrs = stream.attrs;
    let acc = 0;
    for (let i = 0; i < tags.length; i++) {
        const answer = answerSwitch(tags[i], attrs[i]);
        if (answer === true) acc++;
        else if (answer === false) acc--;
    }
    return acc;
}

function driveFloor(stream: TExoPropertyKindStream): number {
    const tags = stream.tags;
    const attrs = stream.attrs;
    let acc = 0;
    for (let i = 0; i < tags.length; i++) {
        const answer = answerFloor(tags[i], attrs[i]);
        if (answer === true) acc++;
        else if (answer === false) acc--;
    }
    return acc;
}

// `shipped·twin` IS THE INSTRUMENT, not a candidate: a second copy of the shipped program with its
// own Map, so its true difference from `shipped` is zero by construction and whatever the run
// prints between the two is what this bench CANNOT see. A gap smaller than that is unresolved.
export const EXO_PROPERTY_KIND_VARIANTS: readonly TExoPropertyKindVariant[] = [
    { name: 'shipped', answer: exoDomPropertyKind, drive: driveShipped },
    { name: 'shipped·twin', answer: answerTwin, drive: driveTwin },
    { name: 'flat·map', answer: answerFlat, drive: driveFlat },
    { name: 'null·proto', answer: answerNullProto, drive: driveNullProto },
    { name: 'switch', answer: answerSwitch, drive: driveSwitch },
    { name: 'floor·if', answer: answerFloor, drive: driveFloor },
];
