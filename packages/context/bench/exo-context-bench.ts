import {
    exoBenchClockGrainMs,
    exoBenchForceGc,
    exoBenchLine,
    exoBenchRefuse,
    exoBenchSinkValue,
    readExoBenchArgs,
    runExoBenchField,
} from '@exodra/bench-harness';
import type { TExoBenchField } from '@exodra/bench-harness';
import { EXO_CONTEXT_PUSH_INPUTS } from './constants/EXO_CONTEXT_PUSH_INPUTS';
import { EXO_CONTEXT_READ_INPUTS } from './constants/EXO_CONTEXT_READ_INPUTS';
import { EXO_CONTEXT_PUSH_VARIANTS } from './EXO_CONTEXT_PUSH_VARIANTS';
import { EXO_CONTEXT_READ_VARIANTS } from './EXO_CONTEXT_READ_VARIANTS';
import { exoContextPushStream } from './exoContextPushStream';
import { exoContextReadStream } from './exoContextReadStream';
import type { TExoContextPushStream } from './types/TExoContextPushStream';
import type { TExoContextReadStream } from './types/TExoContextReadStream';

// TWO TABLES, AND NEITHER MEANS ANYTHING ALONE. `readExoContext` walks a chain of cons cells by
// pointer compare; the two obvious alternatives answer a read in one step and pay for it at the
// provide. A table showing only the read is an argument for whichever design happens to win the
// read, so this bench prints the provide beside it and leaves the trade visible.
//
// WHAT IT ADDS TO WHAT ALREADY EXISTS. `packages/benchmarks/src/benchmarks/axes/phases/context-cost.ts`
// prices the shipped call and says in its own header, by name, that it carries NO FLOOR of any kind
// and no alternative — "there is no zero-abstraction program that answers 'what is at this token'
// without walking something". That is the gap this bench closes: the floor is a program that was
// HANDED the value, and what it skips is printed with it.

const GATE_CALLS = 64;

function gateReads(): boolean {
    let bad = 0;
    for (const input of EXO_CONTEXT_READ_INPUTS) {
        const stream = input.build(GATE_CALLS);
        const reference = EXO_CONTEXT_READ_VARIANTS[0];
        for (let i = 0; i < GATE_CALLS; i++) {
            const want = reference.answer(stream, i);
            for (const variant of EXO_CONTEXT_READ_VARIANTS) {
                const got = variant.answer(stream, i);
                if (got === want) continue;
                bad++;
                exoBenchRefuse(
                    `GATE: ${variant.name} on ${input.name}[${i}] = ${String(got)} where ` +
                        `${reference.name} answers ${String(want)}`
                );
            }
        }
    }
    if (bad > 0) {
        exoBenchRefuse(`GATE FAILED on ${bad} reads — NOTHING TIMED.`);
        return false;
    }
    exoBenchLine(
        `GATE (read): all ${EXO_CONTEXT_READ_VARIANTS.length} designs answer ${GATE_CALLS} ` +
            `instances identically on each of ${EXO_CONTEXT_READ_INPUTS.length} depths, the miss ` +
            'included.'
    );
    return true;
}

function gatePushes(): boolean {
    let bad = 0;
    for (const depth of [1, 4, 16]) {
        const stream = exoContextPushStream(depth, depth);
        const want = EXO_CONTEXT_PUSH_VARIANTS[0].verify(stream).join('|');
        for (const variant of EXO_CONTEXT_PUSH_VARIANTS) {
            const got = variant.verify(stream).join('|');
            if (got === want) continue;
            bad++;
            exoBenchRefuse(
                `GATE: ${variant.name} at depth ${depth} reads back ${got} where the shipped ` +
                    `chain reads back ${want}`
            );
        }
    }
    if (bad > 0) {
        exoBenchRefuse(`GATE FAILED on ${bad} chains — NOTHING TIMED.`);
        return false;
    }
    exoBenchLine(
        `GATE (push): all ${EXO_CONTEXT_PUSH_VARIANTS.length} designs hand back every provided ` +
            'value at depths 1, 4 and 16.'
    );
    return true;
}

/** The one shape a chain has and neither flat design keeps for free, shown rather than argued. */
function gateShadowing(): boolean {
    const stream = exoContextReadStream(8, 8, 8);
    const outermost = EXO_CONTEXT_READ_VARIANTS[0].answer(stream, 0);
    const inner = exoContextReadStream(8, 1, 8);
    const innermost = EXO_CONTEXT_READ_VARIANTS[0].answer(inner, 0);
    if (outermost === undefined || innermost === undefined || outermost === innermost) {
        exoBenchRefuse(
            'GATE: the chains this bench builds do not distinguish the outermost provide from the ' +
                'innermost, so a depth table over them would be about nothing — NOTHING TIMED.'
        );
        return false;
    }
    exoBenchLine(
        `GATE (shape): the same 8-link chain answers ${JSON.stringify(outermost)} at depth 8 and ` +
            `${JSON.stringify(innermost)} at depth 1 — the walk really is walking.`
    );
    return true;
}

function reportCallSites(): void {
    exoBenchLine('');
    exoBenchLine('WHERE IT RUNS:');
    exoBenchLine(
        '  packages/core/src/plugins/constants/EXO_BASE_NODE_VOCABULARY.ts — TExoBaseNodeMethods.inject, one readExoContext ' +
            'per inject call, on every backend'
    );
    exoBenchLine(
        '  packages/core/src/plugins/constants/EXO_BASE_NODE_VOCABULARY.ts — TExoBaseNodeMethods.provide, one exoContextFrame'
    );
    exoBenchLine(
        '  packages/dom/src/dom/provideExoContext.ts:12 — one exoContextFrame and nothing else'
    );
    exoBenchLine('  packages/ssr/src/page/renderExoPage.ts — once per PAGE RENDER');
    exoBenchRefuse(
        'WHAT A WIN HERE BUYS: once per COMPONENT INSTANCE that asks, never per row update and ' +
            'never per event — a wire runs once per instance and an inject inside it runs with it. ' +
            'A page with 200 instances each injecting once at depth 4 pays 200 four-link walks, ' +
            'once. That is the rate any number in the read table has to be multiplied by before it ' +
            'is compared with anything.'
    );
    exoBenchRefuse(
        'AND THE READ TABLE ALONE DECIDES NOTHING. Read the row for depth d beside push·dN: the ' +
            'chain is O(depth) to read and one cons cell to provide; the map is one get and a copy ' +
            'of the whole frame per provide; the prototype frame is fast on both and requires ' +
            'TExoContextToken to carry a symbol, which today it does not — see ' +
            'packages/bench-harness/src/types/TExoBenchProtoFrame.ts.'
    );
}

/**
 * THE THREE SUBJECTS THIS DIRECTORY DOES NOT BENCH, with the reason, because a subject nobody
 * measures is a subject about which no claim can be made and the honest word for it is "unmeasured".
 */
function reportRateLadder(): void {
    exoBenchLine('');
    exoBenchLine('THE RATE LADDER FOR @exodra/core — how often each candidate subject runs:');
    exoBenchLine(
        '  per DISPATCHED EVENT   the backend calls the handler function it was given — no ' +
            'core-side dispatch left to bench'
    );
    exoBenchLine('  per INSTANCE THAT ASKS  readExoContext / exoContextFrame — this bench');
    exoBenchLine(
        '  per DECLARATION BUILD and per SCHEMA COMPILE   the attribute head each schema ' +
            'compiler concatenates for itself — no shared value, so nothing to bench'
    );
    exoBenchRefuse(
        '  per SCHEMA, ONCE PER PROCESS   TExoSchemaCursor (packages/core/src/schema/cursor/ExoSchemaCursor.ts) ' +
            '— NOT BENCHED HERE, and the reason is that it already is: ' +
            'packages/benchmarks/src/benchmarks/axes/phases/schema-build.ts times the whole build ' +
            'of a census-counted application schema, warm and cold, and counts every check and every ' +
            'attribute name it spells. A second table of the same thing would not be a second ' +
            'measurement.'
    );
    exoBenchRefuse(
        '  per BACKEND COMPOSITION, ONCE PER PROCESS   composeExoPlugins, exoVocabulary ' +
            '(packages/core/src/plugins/composeExoPlugins.ts, plugins/exoVocabulary.ts) — NOT BENCHED HERE. ' +
            'composeExoPlugins runs at module level in every backend constructor ' +
            '(packages/dom/src/dom/ExoDomBackend.ts, string/src/node/ExoStrBackend.ts, ' +
            'term/src/backend/ExoTermBackend.ts) — once per backend object, of which a page builds one. ' +
            'What is NOT once per process is the WRAPPED CALL it leaves behind, and that is already ' +
            'measured: packages/benchmarks/src/benchmarks/axes/mechanism/plugin-compose.ts times a ' +
            'call through 1, 4 and 12 wrappers against an unwrapped one.'
    );
}

const READ_FIELD: TExoBenchField<TExoContextReadStream> = {
    title: 'readExoContext — the inject path',
    variants: EXO_CONTEXT_READ_VARIANTS,
    inputs: EXO_CONTEXT_READ_INPUTS,
    nullPair: ['shipped', 'shipped·twin'],
    floorName: 'floor·field',
};

const PUSH_FIELD: TExoBenchField<TExoContextPushStream> = {
    title: 'exoContextFrame — the provide path [ns per chain built]',
    variants: EXO_CONTEXT_PUSH_VARIANTS,
    inputs: EXO_CONTEXT_PUSH_INPUTS,
    nullPair: ['shipped', 'shipped·twin'],
    floorName: 'floor·arg',
};

function exoContextBench(): void {
    const args = readExoBenchArgs(40, 50000);
    if (args === null) return;
    const grainMs = exoBenchClockGrainMs();

    exoBenchLine(
        `readExoContext / exoContextFrame — ${EXO_CONTEXT_READ_VARIANTS.length} designs, two ` +
            'tables: what a read costs and what providing what it reads costs'
    );
    exoBenchLine(
        `  ${args.rounds} rounds × ${args.calls} calls per sample · interleaved, direction ` +
            `alternating · clock grain ${grainMs.toFixed(6)} ms · GC between samples: ` +
            (exoBenchForceGc() === undefined ? 'NO (run node with --expose-gc to force it)' : 'yes')
    );
    if (!gateShadowing()) return;
    if (!gateReads()) return;
    if (!gatePushes()) return;

    runExoBenchField(READ_FIELD, args.rounds, args.calls, grainMs);
    runExoBenchField(PUSH_FIELD, args.rounds, args.calls, grainMs);

    reportCallSites();
    reportRateLadder();
    exoBenchLine('');
    exoBenchLine(
        `sink ${exoBenchSinkValue()} — printed so no accumulator in a driver can be dropped.`
    );
}

exoContextBench();
