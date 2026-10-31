import { escapeExoAttributeValue, escapeExoText, createExoAttrPort } from '@exodra/core';
import type { TExoAttrPort, TExoPortNodeWriter } from '@exodra/core';
import { EXO_STR_NODE_VOCABULARY } from '../../src/node/EXO_STR_NODE_VOCABULARY';
import { EXO_STR_WRITERS } from '../../src/writers/EXO_STR_WRITERS';
import type { TExoStrWriter } from '../../src/writers/types/TExoStrWriter';
import type {
    TExoPortTableSlots,
    TExoStrSetNode,
    TExoStrSetScene,
    TExoStrWritePort,
} from '../types/TExoStrSetScene';

// THE SHIPPED FUNCTIONS, NOT COPIES OF THEM. `exoVocabulary` stores each method behind a factory,
// so asking the pack for `attr` hands back the exact function object `@exodra/string` installs on
// every server exonode, and putting it on a prototype gives it a real method call. Every scene
// drives `attr`, which is the body `text` and `html` each reach by one further call; what a scene
// varies is the WRITER, not the door. Every port here is an ADDRESS port carrying whichever writer
// its position needs, because `attr` reads `port.index` and nothing else — a port's kind selects a
// writer at schema-compile time, and this bench supplies the writer directly. `portNodeWriter`
// is asked for the same way and builds its closure out of a schema-shaped object, which is the only
// thing it reads.
//
// The escapers come from `@exodra/core` here and NOT from `packages/core/src`, so the floor and the
// shipped writers call one function object between them. This bench is about the indirection above
// the escaper; `exo-escape-bench.ts` is about the escaper.

type TExoStrSetMethod = (this: TExoStrSetNode, port: TExoAttrPort, value: unknown) => void;
type TExoPortNodeWriterMethod = (this: { schema: TExoStrSetSchemaShape }) => TExoPortNodeWriter;
type TExoStrSetSchemaShape = {
    strPortWrite: TExoPortNodeWriter | null;
    writers: readonly TExoStrWriter[];
};

const SHIPPED_ATTR = EXO_STR_NODE_VOCABULARY.attr(undefined) as unknown as TExoStrSetMethod;
const SHIPPED_PORT_NODE_WRITER = EXO_STR_NODE_VOCABULARY.portNodeWriter(
    undefined
) as unknown as TExoPortNodeWriterMethod;

// ONE prototype for every node here, so a node and its twin have the same hidden class and the
// null pair differs by nothing an engine can see.
const EXO_STR_SET_PROTO = { attr: SHIPPED_ATTR };

function nodeOf(writers: readonly TExoStrWriter[]): TExoStrSetNode {
    const node = Object.create(EXO_STR_SET_PROTO) as TExoStrSetNode;
    node.values = new Array<string>(writers.length).fill('');
    node.writers = writers;
    return node;
}

function schemaWriterOf(writers: readonly TExoStrWriter[]): TExoPortNodeWriter {
    return SHIPPED_PORT_NODE_WRITER.call({ schema: { strPortWrite: null, writers: writers } });
}

function writePortsOf(writers: readonly TExoStrWriter[]): readonly TExoStrWritePort[] {
    const out: TExoStrWritePort[] = new Array<TExoStrWritePort>(writers.length);
    for (let i = 0; i < writers.length; i++) out[i] = { index: i, write: writers[i] };
    return out;
}

const POOL = 64;

const WORDS: readonly string[] = [
    'row active',
    '1042',
    '/orders/1042/detail',
    'Shipment left the Berlin depot',
    'on',
    'Order 1042',
    'warehouse',
    '19,90 EUR',
];

function streamsOf(ports: number, calls: number): readonly (readonly string[])[] {
    const pool: (readonly string[])[] = new Array<readonly string[]>(POOL);
    for (let p = 0; p < POOL; p++) {
        const values: string[] = new Array<string>(ports);
        for (let i = 0; i < ports; i++) values[i] = `${WORDS[(p + i) % WORDS.length]} ${p}`;
        pool[p] = values;
    }
    const out: (readonly string[])[] = new Array<readonly string[]>(calls);
    for (let i = 0; i < calls; i++) out[i] = pool[i % POOL];
    return out;
}

function sceneOf(
    name: string,
    ports: readonly TExoAttrPort[],
    writers: readonly TExoStrWriter[],
    floor: (values: string[], v: readonly string[]) => void,
    calls: number
): TExoStrSetScene {
    const count = writers.length;
    const schemaTable: TExoPortTableSlots = new Array<string>(count).fill('');
    return {
        name: name,
        ports: ports,
        node: nodeOf(writers),
        // THE INSTRUMENT: the same shipped function on a second prototype, with its own values,
        // its own writer array and its own ports. Its true difference from `node` is zero.
        twinNode: nodeOf(writers.slice()),
        schemaWrite: schemaWriterOf(writers),
        schemaTable: schemaTable,
        writePorts: writePortsOf(writers),
        writeValues: new Array<string>(count).fill(''),
        floorValues: new Array<string>(count).fill(''),
        floor: floor,
        streams: streamsOf(count, calls),
    };
}

/**
 * THE FLOORS KNOW THE SHAPE AND NOT THE DATA. A hand-written server has the attribute head in its
 * source and knows which escaper a position needs, so the floor may inline both; it may not skip
 * the escape and it may not assume a value is present, so the boolean-property floor still tests
 * its value exactly where the shipped writer does.
 */
function floorText1(values: string[], v: readonly string[]): void {
    values[0] = escapeExoText(v[0]);
}

function floorCensus5(values: string[], v: readonly string[]): void {
    values[0] = ' class="' + escapeExoAttributeValue(v[0]) + '"';
    values[1] = ' data-id="' + escapeExoAttributeValue(v[1]) + '"';
    values[2] = ' href="' + escapeExoAttributeValue(v[2]) + '"';
    values[3] = escapeExoText(v[3]);
    values[4] = escapeExoText(v[4]);
}

function floorFiveKinds(values: string[], v: readonly string[]): void {
    values[0] = ' class="' + escapeExoAttributeValue(v[0]) + '"';
    values[1] = ' href="' + escapeExoAttributeValue(v[1]) + '"';
    values[2] = escapeExoText(v[2]);
    values[3] = v[3] ? ' checked=""' : '';
    values[4] = v[4];
}

const TEXT_1_PORTS: readonly TExoAttrPort[] = [createExoAttrPort('', 0)];
const TEXT_1_WRITERS: readonly TExoStrWriter[] = [EXO_STR_WRITERS.text(false)];

const CENSUS_5_PORTS: readonly TExoAttrPort[] = [
    createExoAttrPort('class', 0),
    createExoAttrPort('data-id', 1),
    createExoAttrPort('href', 2),
    createExoAttrPort('', 3),
    createExoAttrPort('', 4),
];
const CENSUS_5_WRITERS: readonly TExoStrWriter[] = [
    EXO_STR_WRITERS.attribute('class', 'li'),
    EXO_STR_WRITERS.attribute('data-id', 'li'),
    EXO_STR_WRITERS.attribute('href', 'a'),
    EXO_STR_WRITERS.text(false),
    EXO_STR_WRITERS.text(false),
];

const FIVE_KINDS_PORTS: readonly TExoAttrPort[] = [
    createExoAttrPort('class', 0),
    createExoAttrPort('href', 1),
    createExoAttrPort('', 2),
    createExoAttrPort('checked', 3),
    createExoAttrPort('', 4),
];
const FIVE_KINDS_WRITERS: readonly TExoStrWriter[] = [
    EXO_STR_WRITERS.attribute('class', 'label'),
    EXO_STR_WRITERS.attribute('href', 'a'),
    EXO_STR_WRITERS.text(false),
    EXO_STR_WRITERS.attribute('checked', 'input'),
    EXO_STR_WRITERS.children(true, false),
];

export const EXO_STR_SET_SCENES: readonly {
    readonly name: string;
    readonly why: string;
    readonly build: (calls: number) => TExoStrSetScene;
}[] = [
    {
        name: 'text·1',
        why: 'one text port — one writer identity, so the call inside set() is monomorphic',
        build: (calls) => sceneOf('text·1', TEXT_1_PORTS, TEXT_1_WRITERS, floorText1, calls),
    },
    {
        name: 'census·5',
        why: "the recorded SSR census's row: class, data-id, href and two texts — three identities",
        build: (calls) =>
            sceneOf('census·5', CENSUS_5_PORTS, CENSUS_5_WRITERS, floorCensus5, calls),
    },
    {
        name: 'five·kinds',
        why:
            'class, attribute, text, boolean property and raw children — FIVE identities, which ' +
            'is where an indexed call through a writer table goes megamorphic',
        build: (calls) =>
            sceneOf('five·kinds', FIVE_KINDS_PORTS, FIVE_KINDS_WRITERS, floorFiveKinds, calls),
    },
];
