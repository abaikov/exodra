import { createExoMarkupFiller } from '../../src/markup/factories/createExoMarkupFiller';
import type { TExoStrMarkupFiller } from '../../src/markup/types/TExoStrMarkupFiller';
import type { TExoFillMarkupScene } from '../types/TExoFillMarkupScene';

// THE FLOORS ARE WRITTEN OUT WITH STRING LITERALS, one per arity, because that is what a compiled
// template is: a hand-written server has the static pieces in its source and reaches the values
// through nothing. A floor built from the same `pieces` array the library holds would be the
// library's design with the switch removed, which is a different and much weaker claim.

const PIECES_1: readonly string[] = ['<span>', '</span>'];

const PIECES_2: readonly string[] = ['<a href="', '">', '</a>'];

const PIECES_5: readonly string[] = [
    '<li class="',
    '" data-id="',
    '"><a href="',
    '">',
    '</a><span>',
    '</span></li>',
];

const PIECES_8: readonly string[] = [
    '<li class="',
    '" data-id="',
    '" title="',
    '"><a href="',
    '">',
    '</a><em>',
    '</em><span>',
    '</span><b>',
    '</b></li>',
];

const PIECES_9: readonly string[] = [
    '<li class="',
    '" data-id="',
    '" title="',
    '" lang="',
    '"><a href="',
    '">',
    '</a><em>',
    '</em><span>',
    '</span><b>',
    '</b></li>',
];

const PIECES_16: readonly string[] = [
    '<tr class="',
    '" data-id="',
    '"><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td><td>',
    '</td></tr>',
];

const floor1: TExoStrMarkupFiller = (v) => '<span>' + v[0] + '</span>';

const floor2: TExoStrMarkupFiller = (v) => '<a href="' + v[0] + '">' + v[1] + '</a>';

const floor5: TExoStrMarkupFiller = (v) =>
    '<li class="' +
    v[0] +
    '" data-id="' +
    v[1] +
    '"><a href="' +
    v[2] +
    '">' +
    v[3] +
    '</a><span>' +
    v[4] +
    '</span></li>';

const floor8: TExoStrMarkupFiller = (v) =>
    '<li class="' +
    v[0] +
    '" data-id="' +
    v[1] +
    '" title="' +
    v[2] +
    '"><a href="' +
    v[3] +
    '">' +
    v[4] +
    '</a><em>' +
    v[5] +
    '</em><span>' +
    v[6] +
    '</span><b>' +
    v[7] +
    '</b></li>';

const floor9: TExoStrMarkupFiller = (v) =>
    '<li class="' +
    v[0] +
    '" data-id="' +
    v[1] +
    '" title="' +
    v[2] +
    '" lang="' +
    v[3] +
    '"><a href="' +
    v[4] +
    '">' +
    v[5] +
    '</a><em>' +
    v[6] +
    '</em><span>' +
    v[7] +
    '</span><b>' +
    v[8] +
    '</b></li>';

const floor16: TExoStrMarkupFiller = (v) =>
    '<tr class="' +
    v[0] +
    '" data-id="' +
    v[1] +
    '"><td>' +
    v[2] +
    '</td><td>' +
    v[3] +
    '</td><td>' +
    v[4] +
    '</td><td>' +
    v[5] +
    '</td><td>' +
    v[6] +
    '</td><td>' +
    v[7] +
    '</td><td>' +
    v[8] +
    '</td><td>' +
    v[9] +
    '</td><td>' +
    v[10] +
    '</td><td>' +
    v[11] +
    '</td><td>' +
    v[12] +
    '</td><td>' +
    v[13] +
    '</td><td>' +
    v[14] +
    '</td><td>' +
    v[15] +
    '</td></tr>';

// The library's DEFAULT branch on its own, for every arity: what the ladder is worth is the
// distance between this row and `shipped`.
function makeLoopFiller(pieces: readonly string[]): TExoStrMarkupFiller {
    const parts = pieces.slice();
    const ports = parts.length - 1;
    return (v) => {
        let html = parts[0];
        for (let i = 0; i < ports; i++) {
            html += v[i];
            html += parts[i + 1];
        }
        return html;
    };
}

// A fresh array per call, then one join. The design this repository's comments have asserted to be
// slower than `+=` three times without a number in the file.
function makeJoinArrayFiller(pieces: readonly string[]): TExoStrMarkupFiller {
    const parts = pieces.slice();
    const ports = parts.length - 1;
    const cells = parts.length + ports;
    return (v) => {
        const out: string[] = new Array<string>(cells);
        out[0] = parts[0];
        for (let i = 0; i < ports; i++) {
            out[i * 2 + 1] = v[i];
            out[i * 2 + 2] = parts[i + 1];
        }
        return out.join('');
    };
}

// ONE buffer for the life of the filler, refilled per call. It separates two questions the row
// above answers together: what the array costs, and what the join costs.
function makeJoinReusedFiller(pieces: readonly string[]): TExoStrMarkupFiller {
    const parts = pieces.slice();
    const ports = parts.length - 1;
    const out: string[] = new Array<string>(parts.length + ports);
    out[0] = parts[0];
    for (let i = 0; i < ports; i++) out[i * 2 + 2] = parts[i + 1];
    return (v) => {
        for (let i = 0; i < ports; i++) out[i * 2 + 1] = v[i];
        return out.join('');
    };
}

const POOL = 64;

const VALUE_WORDS: readonly string[] = [
    'row',
    'Berlin',
    '/orders/1042',
    'Shipment left the depot',
    'active',
    '1042',
    'de-DE',
    'Order 1042',
    '19,90 EUR',
    'warehouse',
    'pending',
    'four days',
    'customs',
    'second',
    'tail',
    'end',
];

function streamsOf(ports: number, calls: number): readonly (readonly string[])[] {
    const pool: (readonly string[])[] = new Array<readonly string[]>(POOL);
    for (let p = 0; p < POOL; p++) {
        const values: string[] = new Array<string>(ports);
        for (let i = 0; i < ports; i++)
            values[i] = `${VALUE_WORDS[(p + i) % VALUE_WORDS.length]}-${p}`;
        pool[p] = values;
    }
    const out: (readonly string[])[] = new Array<readonly string[]>(calls);
    for (let i = 0; i < calls; i++) out[i] = pool[i % POOL];
    return out;
}

function sceneOf(
    name: string,
    pieces: readonly string[],
    floor: TExoStrMarkupFiller,
    calls: number
): TExoFillMarkupScene {
    return {
        name: name,
        ports: pieces.length - 1,
        pieces: pieces,
        streams: streamsOf(pieces.length - 1, calls),
        shipped: createExoMarkupFiller(pieces),
        // A SECOND CLOSURE FROM THE SAME FACTORY, with its own captured pieces. Its true difference
        // from `shipped` is zero and it shares the code object, so its scatter is a LOWER bound on
        // this run's noise — tighter than a re-declared copy, which could differ by code layout.
        twin: createExoMarkupFiller(pieces.slice()),
        loop: makeLoopFiller(pieces),
        joinArray: makeJoinArrayFiller(pieces),
        joinReused: makeJoinReusedFiller(pieces),
        floor: floor,
    };
}

/**
 * ARITIES 8 AND 9 ARE A PAIR AND THE WHOLE REASON BOTH ARE HERE: nine pieces is the last rung of
 * `createExoMarkupFiller`'s written-out ladder and ten pieces falls through to its loop, so the step
 * between those two rows is what the ladder is worth at its own edge.
 */
export const EXO_FILL_MARKUP_SCENES: readonly {
    readonly name: string;
    readonly why: string;
    readonly build: (calls: number) => TExoFillMarkupScene;
}[] = [
    {
        name: 'ports·1',
        why: 'one text port in a span — the smallest component anybody writes',
        build: (calls) => sceneOf('ports·1', PIECES_1, floor1, calls),
    },
    {
        name: 'ports·2',
        why: 'href and label — the second smallest, and the shape of every link',
        build: (calls) => sceneOf('ports·2', PIECES_2, floor2, calls),
    },
    {
        name: 'ports·5',
        why: "the recorded SSR census's component, five ports on a list row",
        build: (calls) => sceneOf('ports·5', PIECES_5, floor5, calls),
    },
    {
        name: 'ports·8',
        why: 'nine pieces — the LAST written-out rung of the ladder',
        build: (calls) => sceneOf('ports·8', PIECES_8, floor8, calls),
    },
    {
        name: 'ports·9',
        why: 'ten pieces — one port past the ladder, so the loop answers instead',
        build: (calls) => sceneOf('ports·9', PIECES_9, floor9, calls),
    },
    {
        name: 'ports·16',
        why: 'a table row well past the ladder, where the loop is the only design left',
        build: (calls) => sceneOf('ports·16', PIECES_16, floor16, calls),
    },
];
