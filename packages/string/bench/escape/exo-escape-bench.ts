import { EXO_ESCAPE_GATE_STRINGS } from '../constants/EXO_ESCAPE_GATE_STRINGS';
import {
    EXO_ESCAPE_ATTR_INPUTS,
    EXO_ESCAPE_TEXT_INPUTS,
} from '../constants/exo-escape-inputs';
import {
    EXO_ESCAPE_ATTR_CANDIDATES,
    EXO_ESCAPE_ATTR_VARIANTS,
    EXO_ESCAPE_TEXT_CANDIDATES,
    EXO_ESCAPE_TEXT_VARIANTS,
} from './exo-escape-variants';
import { createExoBenchRunner } from '@exodra/bench-harness';
import { runExoBench } from '@exodra/bench-harness';
import type { TExoBenchCandidate } from '../types/TExoBenchCandidate';

// `escapeExoText` and `escapeExoAttributeValue` live in `@exodra/core` and are HOT HERE: they run
// once per written port per instance per render, inside the writers `exoWriterForPort` hands the
// schema. Six designs for each, against a BOUND that skips the work, on clean and dirty data.

function line(text: string): void {
    console.log(`✅ ${text}`);
}

function refuse(text: string): void {
    console.log(`❌ ${text}`);
}

function show(value: string): string {
    return JSON.stringify(value).slice(0, 48);
}

function gateOne(what: string, candidates: readonly TExoBenchCandidate[]): number {
    const reference = candidates[0];
    let bad = 0;
    for (const value of EXO_ESCAPE_GATE_STRINGS) {
        const want = reference.answer(value);
        for (const candidate of candidates) {
            const got = candidate.answer(value);
            if (got === want) continue;
            bad++;
            refuse(
                `GATE ${what}: ${candidate.name}(${show(value)}) = ${show(got)} where ` +
                    `${reference.name} answers ${show(want)}`
            );
        }
    }
    return bad;
}

/**
 * CHARACTER-IDENTICAL MARKUP OR NOTHING IS TIMED. A server render is compared against a client
 * build byte for byte, so an escaper that is merely equivalent is a hydration failure, and a run
 * that ranked it would be ranking a bug.
 */
function gate(): boolean {
    const bad =
        gateOne('text', EXO_ESCAPE_TEXT_CANDIDATES) + gateOne('attr', EXO_ESCAPE_ATTR_CANDIDATES);
    if (bad > 0) {
        refuse(`GATE FAILED on ${bad} answers — NOTHING TIMED.`);
        return false;
    }
    line(
        `GATE: ${EXO_ESCAPE_TEXT_CANDIDATES.length} text and ` +
            `${EXO_ESCAPE_ATTR_CANDIDATES.length} attribute designs agree character for ` +
            `character on ${EXO_ESCAPE_GATE_STRINGS.length} strings, lone surrogates and ` +
            'already-escaped entities included.'
    );
    return true;
}

/**
 * WHAT A WIN HERE BUYS, and the two regimes are not the same question: the writers run per render
 * and the compilers run once per declaration behind a schema cache.
 */
function epilogue(): void {
    line('');
    line('HOT — once per written port per instance per render:');
    line('  packages/string/src/writers/EXO_STR_WRITERS.ts:89 — writeText, every text port');
    line('  packages/string/src/writers/EXO_STR_WRITERS.ts:96 — writeTextAfterNewlineEater');
    line(
        '  packages/string/src/writers/EXO_STR_WRITERS.ts:23 — escaped(), reached by createAttrWriter ' +
            ':31, createClassWriter :39 and makeStringPropertyWriter :53'
    );
    line('HOT — once per attribute per request:');
    line('  packages/ssr/src/context/ExoSsrResponse.ts:179, :118');
    line('  packages/ssr/src/scripts/renderExoJsonScript.ts:5');
    refuse('NOT HOT — once per declaration, behind the schema cache; a win buys these nothing:');
    refuse('  packages/string/src/schema/compileExoStrSchema.ts:64, :149');
    refuse('  packages/dom/src/dom/compileExoDomSchema.ts:109, :228');
    refuse('  packages/dom/src/dom/assertExoUnreshapedMarkup.ts:65');
    line('');
    line(
        'ADJACENT TO A RECORDED FIGURE, NOT A REPRODUCTION OF IT. ' +
            'packages/benchmarks/.gate/ssr-floor.published.json records escaping as 46.8-48.9% ' +
            'of the SSR floor: CENSUS/esc 0.1125 ms less CENSUS/floor 0.0575 ms is 0.0550 ms for ' +
            '1000 rows × 4 escaped values, so 13.75 ns per call, and CENSUS/esc·dirty 0.8550 ms ' +
            'is 7.6× the clean rung. Those rungs render whole rows and charge a flatten; the ' +
            "tables above call ONE function on a pool of this file's own strings. Compare the " +
            'clean·short median against 13.75 ns/call as a sanity check, never as the same claim.'
    );
}

runExoBench({
    title: 'escapeExoText / escapeExoAttributeValue — six designs against a bound that skips',
    subtitle:
        'subjects read from packages/core/src, not from @exodra/core — that specifier resolves ' +
        "to core's dist and a bench that reads a bundle measures the last build",
    gate: gate,
    tables: [
        createExoBenchRunner({
            title: 'escapeExoText [core/src/escapeExoText.ts:6]',
            floorName: 'pass',
            floorLabel: '×pass',
            nullPair: ['shipped', 'shipped·twin'],
            variants: EXO_ESCAPE_TEXT_VARIANTS,
            inputs: EXO_ESCAPE_TEXT_INPUTS,
        }),
        createExoBenchRunner({
            title: 'escapeExoAttributeValue [core/src/escapeExoAttributeValue.ts:7] — confirmation',
            floorName: 'pass',
            floorLabel: '×pass',
            nullPair: ['shipped', 'shipped·twin'],
            variants: EXO_ESCAPE_ATTR_VARIANTS,
            inputs: EXO_ESCAPE_ATTR_INPUTS,
        }),
    ],
    epilogue: epilogue,
    defaultRounds: 40,
    defaultCalls: 50000,
});
