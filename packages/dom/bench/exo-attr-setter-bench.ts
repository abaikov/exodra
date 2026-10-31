import { exoBenchDocument } from './TExoBenchDocument';
import {
    exoBenchGrainRefusal,
    exoBenchLine,
    exoBenchRefuse,
    exoBenchResolution,
    exoBenchStat,
    exoBenchTable,
    exoClockGrainMs,
} from './exo-bench-report';
import {
    EXO_ATTR_SETTER_CASES,
    EXO_WRITER_TABLE,
    EXO_WRITE_DATA,
    exoFillWriterTable,
    exoShippedWrite,
} from './EXO_ATTR_SETTER_CASES';
import type { TExoBenchRow } from './types/TExoBenchRow';
import type { TExoWriteCase } from './types/TExoWriteCase';
import type { TExoDomSetter } from '../src/dom/types/TExoDomSetter';

// The writers `createExoAttrWrite` builds are chosen ONCE per port per schema and called on EVERY change.
// This bench prices the calling, not the choosing: each shipped writer against a straight-line
// write that a hand-written app would contain, against the same writer reached through the schema's
// table the way a wire reaches it, and — for `class` — against the other DOM call that would do.

const FLOOR = 'floor·inline';
const UNIT = 'ns/write';

function firstDifference(want: string, got: string): string {
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    return `at char ${at}: expected ${JSON.stringify(want)} got ${JSON.stringify(got)}`;
}

function gateCase(
    subject: TExoWriteCase,
    document: Document,
    writers: readonly TExoDomSetter[],
    data: unknown
): boolean {
    let bad = 0;
    for (let v = 0; v < subject.variants.length; v++) {
        const variant = subject.variants[v];
        const node = document.createElement(subject.tag);
        variant.drive(writers[v], data, node, subject.values, subject.values.length);
        const got = `${node.outerHTML}|${subject.state(node)}`;
        if (got === subject.expect) continue;
        bad++;
        exoBenchRefuse(
            `GATE ${subject.name}/${variant.name}: ${firstDifference(subject.expect, got)}`
        );
    }
    if (bad > 0) {
        exoBenchRefuse(`${subject.name}: GATE FAILED on ${bad} writers — NOTHING TIMED.`);
        return false;
    }
    exoBenchLine(
        `  gate: all ${subject.variants.length} writers leave ${JSON.stringify(
            subject.expect
        )} — ` + 'markup and live state, char for char.'
    );
    return true;
}

function sampleOnce(
    variant: TExoWriteCase['variants'][number],
    write: TExoDomSetter,
    data: unknown,
    node: Element,
    values: readonly unknown[],
    calls: number
): number {
    const started = performance.now();
    variant.drive(write, data, node, values, calls);
    const elapsed = performance.now() - started;
    return (elapsed * 1e6) / calls;
}

function runCase(
    subject: TExoWriteCase,
    document: Document,
    rounds: number,
    calls: number,
    grainMs: number,
    forceGc: (() => void) | undefined
): void {
    const proto = document.createElement(subject.tag);
    // TWO writers from two calls, so `shipped·twin` is a separate closure with its own captured
    // state and its own call site. Its true difference from `shipped` is zero by construction.
    const built = exoShippedWrite(subject.attr, proto);
    const builtTwin = exoShippedWrite(subject.attr, proto);
    const write = built.write;
    const twin = builtTwin.write;
    const writers = subject.variants.map((variant) =>
        variant.name === 'shipped·twin' ? twin : write
    );
    const data = built.data;
    EXO_WRITER_TABLE[0] = write;
    EXO_WRITE_DATA[0] = data;

    exoBenchLine('');
    exoBenchLine(`${subject.name} — ${subject.why}`);
    exoBenchLine(`  reached from: ${subject.reach}`);
    if (!gateCase(subject, document, writers, data)) return;

    const node = document.createElement(subject.tag);
    const samples: Record<string, number[]> = {};
    for (const variant of subject.variants) samples[variant.name] = [];
    for (let w = 0; w < 8; w++) {
        for (let v = 0; v < subject.variants.length; v++) {
            sampleOnce(subject.variants[v], writers[v], data, node, subject.values, calls);
        }
    }

    const regionsMs: Record<string, number> = {};
    for (const variant of subject.variants) regionsMs[variant.name] = Number.POSITIVE_INFINITY;
    const count = subject.variants.length;
    for (let round = 0; round < rounds; round++) {
        const shift = round % count;
        const forward = (round & 1) === 0;
        for (let k = 0; k < count; k++) {
            const at = forward ? (k + shift) % count : (shift + count - 1 - k) % count;
            if (forceGc !== undefined) forceGc();
            const perWrite = sampleOnce(
                subject.variants[at],
                writers[at],
                data,
                node,
                subject.values,
                calls
            );
            const name = subject.variants[at].name;
            const regionMs = (perWrite * calls) / 1e6;
            if (regionMs < regionsMs[name]) regionsMs[name] = regionMs;
            samples[name].push(perWrite);
        }
    }

    const rows: TExoBenchRow[] = subject.variants
        .map((variant) => ({ name: variant.name, stat: exoBenchStat(samples[variant.name]) }))
        .sort((a, b) => a.stat.median - b.stat.median);
    exoBenchTable(rows, FLOOR, UNIT);
    exoBenchResolution(
        subject.name,
        samples['shipped'],
        samples['shipped·twin'],
        rows,
        grainMs,
        UNIT
    );
    exoBenchGrainRefusal(
        subject.name,
        regionsMs,
        grainMs,
        `Re-run as: npm run bench:attr-setter -- ${rounds} ${calls * 8}`
    );
    for (const variant of subject.variants) {
        if (variant.differs === null) continue;
        exoBenchLine(`  ${variant.name} — ${variant.differs}`);
    }
}

function reportCallSites(): void {
    exoBenchLine('');
    exoBenchLine('WHAT A WIN HERE BUYS — where a writer built by exo-attr-setter.ts is CALLED:');
    exoBenchLine(
        '  packages/dom/src/dom/EXO_DOM_NODE_VOCABULARY.ts:77 — `c.set(port, value)`, once per filled port ' +
            'per instance at mount, and again on every manual fill. HOT.'
    );
    exoBenchLine(
        '  packages/dom/src/dom/exo-dom-bind.ts:52 and :56 — the initial write and then EVERY ' +
            'change of a bound attribute port for the life of the element. HOT, and the reason ' +
            'the `via·table` row exists: :56 calls the writer through a closure variable, where ' +
            'EXO_DOM_NODE_VOCABULARY.ts:77 and :94 reach it through `schema.setters[index]`.'
    );
    exoBenchLine(
        '  packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts:100 and :114 — the same two shapes on the ' +
            'hydration path, plus repair-attribute.ts:11 for a port the server printed differently.'
    );
    exoBenchLine(
        '  packages/dom/src/plugins/exo-binding/with-exo-binding.ts:36 — a pack that takes the ' +
            'binding over reads the same table.'
    );
    exoBenchLine(
        '  The CHOOSING — exo-attr-setter.ts itself — runs once per port per schema behind ' +
            'exoDomSchemaOf.ts:13, and is measured by packages/core’s bench:property-kind. ' +
            'Nothing in this file is about that.'
    );
}

async function exoAttrSetterBench(): Promise<void> {
    const args = process.argv.slice(2);
    const rounds = Number(args[0] ?? '25');
    const calls = Number(args[1] ?? '20000');
    if (!Number.isFinite(rounds) || !Number.isFinite(calls) || rounds < 2 || calls < 8) {
        exoBenchRefuse(`usage: <rounds:int≥2> <writes-per-sample:int≥8>; got ${args.join(' ')}`);
        return;
    }
    const forceGc = (globalThis as { gc?: () => void }).gc;
    const grainMs = exoClockGrainMs();
    const found = await exoBenchDocument();
    exoFillWriterTable(found.document);

    exoBenchLine(
        `createExoAttrWrite’s writers — ${EXO_ATTR_SETTER_CASES.length} port shapes [${UNIT}]`
    );
    exoBenchLine(
        `  ${rounds} rounds × ${calls} writes per sample · interleaved, direction alternating · ` +
            `clock grain ${grainMs.toFixed(6)} ms · GC between samples: ` +
            (forceGc === undefined ? 'NO (run node with --expose-gc to force it)' : 'yes')
    );
    exoBenchLine(`  document: ${found.source}`);
    exoBenchLine(
        '  exo-attr-setter.ts is loaded from SOURCE, but the `@exodra/core` it imports resolves ' +
            'to that package’s BUILT dist. A stale core dist is a stale answer here.'
    );
    exoBenchLine(
        '  WHAT A FAKE DOM DOES TO THIS TABLE, both ways. jsdom performs `className = x` as its ' +
            'own JavaScript `setAttribute`, where Blink has a dedicated path — so the `attr·set` ' +
            'row of `class·div` answers a question about JSDOM and NOT about a browser, and it ' +
            'says so again below. What DOES carry over is the distance from `floor·inline`: the ' +
            'closure call, the captured name and the null tests are JavaScript in both, while a ' +
            'jsdom DOM call is dearer than a browser’s — so the SHARE of the gap printed here is ' +
            'a LOWER bound on the share a browser would show.'
    );

    exoBenchRefuse(
        'READ THIS BEFORE QUOTING ANY ROW BELOW. Two axes already ask these questions IN A REAL ' +
            'BROWSER, and a browser outranks this file wherever they disagree: ' +
            'packages/benchmarks/src/benchmarks/axes/floors/attr-floor.ts takes the same four ' +
            'branches of exo-attr-setter.ts against a straight-line floor, and ' +
            'axes/mechanism/write-ladder.ts takes `writers[i](slots[elem[i]], v)` — the `via·table` ' +
            'row here — against a direct reference and against straight-line writes, on a ladder ' +
            'of 1, 4 and 16 writes per port. Both are registered in scripts/run-one-axis.js. What ' +
            'THIS file is for: it runs in this package in seconds with no Vite and no Chromium, ' +
            'and it fails loudly if a writer stops agreeing with the others.'
    );

    for (const subject of EXO_ATTR_SETTER_CASES) {
        runCase(subject, found.document, rounds, calls, grainMs, forceGc);
    }

    exoBenchRefuse(
        'class·div/attr·set ranks jsdom’s two routes to the same attribute, not a browser’s. ' +
            'Load this file where `globalThis.document` is real to answer it.'
    );
    reportCallSites();
}

void exoAttrSetterBench();
