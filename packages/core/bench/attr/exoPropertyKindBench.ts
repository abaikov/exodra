import {
    exoBenchClockGrainMs,
    exoBenchForceGc,
    exoBenchLine,
    exoBenchRefuse,
    exoBenchSinkValue,
    readExoBenchArgs,
    runExoBenchField,
} from '@exodra/bench-harness';
import type { TExoBenchField, TExoBenchInput } from '@exodra/bench-harness';
import { EXO_PROPERTY_KIND_INPUTS } from './constants/EXO_PROPERTY_KIND_INPUTS';
import { EXO_PROPERTY_KIND_VARIANTS } from './EXO_PROPERTY_KIND_VARIANTS';
import type { TExoPropertyKindStream } from './types/TExoPropertyKindStream';

// Four table designs for `exoDomPropertyKind` — the shipped nested `Map`, a flat `Map` on a joined
// key, a null-prototype object of objects and a nested `switch` — against a NATIVE FLOOR, the
// straight-line `if` chain a hand-written program would hold, on seven input shapes.
//
// The reporting shape lives in `@exodra/bench-harness` and is shared with every other package's
// bench: interleaved rounds with the direction alternating, the full spread rather than
// one figure, a NULL PAIR whose true difference is zero so the run can say what it CANNOT see, and
// a refusal printed rather than thrown when a timed region lands near the clock's own grain.
//
// IT RANKS; IT DOES NOT SAY THE WINNER IS WORTH ADOPTING. Every call site of this function runs at
// schema build or at schema compile, each behind a cache, and the run prints them by file and line
// at the end so no reader has to take that on trust.

const GATE_TAGS: readonly string[] = [
    'input',
    'select',
    'textarea',
    'output',
    'option',
    'div',
    'INPUT',
    'Input',
    'TEXTAREA',
    'constructor',
    '',
];

const GATE_ATTRS: readonly string[] = [
    'value',
    'checked',
    'selected',
    'indeterminate',
    'disabled',
    'class',
    'data-deck-id',
    'VALUE',
    'constructor',
    '__proto__',
    'toString',
    'hasOwnProperty',
    '',
];

/**
 * NOTHING IS TIMED UNTIL EVERY VARIANT ANSWERS WHAT THE SHIPPED ONE ANSWERS. The hazard names are
 * in the cross product deliberately: `constructor`, `__proto__`, `toString` and `hasOwnProperty`
 * are where a plain object literal stops agreeing with a `Map`, and this repository has shipped
 * that exact defect once — see `exo-attr-write-spec.ts`.
 */
function gateAnswers(): boolean {
    const reference = EXO_PROPERTY_KIND_VARIANTS[0];
    let checked = 0;
    let bad = 0;
    for (const tag of GATE_TAGS) {
        for (const attr of GATE_ATTRS) {
            const want = reference.answer(tag, attr);
            for (const variant of EXO_PROPERTY_KIND_VARIANTS) {
                const got = variant.answer(tag, attr);
                checked++;
                if (got === want) continue;
                bad++;
                exoBenchRefuse(
                    `GATE: ${variant.name}(${JSON.stringify(tag)}, ${JSON.stringify(attr)}) = ` +
                        `${String(got)} where ${reference.name} answers ${String(want)}`
                );
            }
        }
    }
    if (bad > 0) {
        exoBenchRefuse(`GATE FAILED on ${bad} of ${checked} answers — NOTHING TIMED.`);
        return false;
    }
    exoBenchLine(
        `GATE: all ${EXO_PROPERTY_KIND_VARIANTS.length} variants agree on ${GATE_TAGS.length}×` +
            `${GATE_ATTRS.length} pairs, prototype-chain names included.`
    );
    return true;
}

// The pairs come out of arrays rather than being written as literals, so the arguments are loads
// and not constants a compiler could fold the whole call away against.
const INPUTS: readonly TExoBenchInput<TExoPropertyKindStream>[] = EXO_PROPERTY_KIND_INPUTS.map(
    (input) => ({
        name: input.name,
        why: input.why,
        build: (calls: number): TExoPropertyKindStream => {
            const tags: string[] = new Array<string>(calls);
            const attrs: string[] = new Array<string>(calls);
            for (let i = 0; i < calls; i++) {
                const pair = input.pairs[i % input.pairs.length];
                tags[i] = pair[0];
                attrs[i] = pair[1];
            }
            return { tags, attrs };
        },
        size: (stream: TExoPropertyKindStream): number => stream.tags.length,
    })
);

function reportCallSites(): void {
    exoBenchLine('');
    exoBenchRefuse(
        'WHAT A WIN HERE BUYS: nothing this bench measured. Every call site runs ONCE per port ' +
            'per process, behind a cache, and none is on a render or an update path:'
    );
    exoBenchRefuse(
        '  packages/core/src/schema/cursor/ExoSchemaCursor.ts → schema/asserts/' +
            "assertExoServablePropertyPort.ts — schema build, and only after `name === 'value'` " +
            'and a <select>/<output> tag'
    );
    exoBenchRefuse(
        '  packages/string/src/writers/EXO_STR_WRITERS.ts — writer selection at schema compile, ' +
            'behind a per-(name, tag) memo (`WRITERS`, same file)'
    );
    exoBenchRefuse(
        '  packages/dom/src/dom/compileExoDomSchema.ts — via exo-attr-setter.ts, ' +
            'writes-exo-attribute.ts, markupCarriesExoValue.ts, clear-exo-value.ts; the schema ' +
            'is compiled once per (schema, backend) by exoDomSchemaOf.ts'
    );
    exoBenchRefuse(
        '  packages/term/src/utilities/exoTermWriterForPort.ts — deliberately does not ask, ' +
            'and says so in its own header: a text tree has no properties and no markup'
    );
}

const FIELD: TExoBenchField<TExoPropertyKindStream> = {
    title: 'exoDomPropertyKind',
    variants: EXO_PROPERTY_KIND_VARIANTS,
    inputs: INPUTS,
    nullPair: ['shipped', 'shipped·twin'],
    floorName: 'floor·if',
};

function exoPropertyKindBench(): void {
    const args = readExoBenchArgs(40, 50000);
    if (args === null) return;
    const grainMs = exoBenchClockGrainMs();

    exoBenchLine(
        `exoDomPropertyKind — ${EXO_PROPERTY_KIND_VARIANTS.length} variants × ` +
            `${INPUTS.length} input shapes [ns per call]`
    );
    exoBenchLine(
        `  ${args.rounds} rounds × ${args.calls} calls per sample · interleaved, direction ` +
            `alternating · clock grain ${grainMs.toFixed(6)} ms · GC between samples: ` +
            (exoBenchForceGc() === undefined ? 'NO (run node with --expose-gc to force it)' : 'yes')
    );
    if (!gateAnswers()) return;

    runExoBenchField(FIELD, args.rounds, args.calls, grainMs);

    reportCallSites();
    exoBenchLine('');
    exoBenchLine(
        `sink ${exoBenchSinkValue()} — printed so no accumulator in a driver can be dropped.`
    );
}

exoPropertyKindBench();
