// Shared A/B(/C/D) benchmark harness — the ONE place all curated benches measure
// through. Frameworks run INTERLEAVED in one process (order rotated every round, so
// a load spike can't bias one), GC before each sample, full spread reported
// (min/median/max) + rank. A sample times ONLY the `measure()` region; `prepare()`
// (setup) and `cleanup()` (teardown) are untimed, so each bench sizes its scenario
// above the browser's ~0.1 ms timer clamp (no meaningless "median 0"). Each
// framework performs the task via ITS OWN idiomatic API — never forced onto
// another's path.
// Force GC between samples (Chromium launched with --js-flags=--expose-gc).
function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) { gc(); gc(); }
}
// Retained JS heap, when the engine exposes it (--enable-precise-memory-info).
function readHeapBytes(): number | undefined {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? mem.usedJSHeapSize : undefined;
}

export interface Scenario {
    measure: () => void; // the timed operation
    cleanup: () => void; // untimed teardown
}
export type Prepare = () => Scenario;

// Frameworks a bench provides scenarios for. `exodra` is always present.
export type FrameworkName = 'exodra' | 'solid' | 'svelte' | 'react';
export type Frameworks = { exodra: Prepare } & Partial<
    Record<Exclude<FrameworkName, 'exodra'>, Prepare>
>;
export type HeapMounts = Partial<Record<FrameworkName, () => () => void>>;

interface Stat {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
}
function stat(xs: number[]): Stat {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    return { min: s[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: s[s.length - 1] };
}

function line(s: string): void {
    // eslint-disable-next-line no-console
    console.log(`✅ ${s}`);
}

function sampleOnce(prep: Prepare, batch: number): number {
    const scenarios: Scenario[] = [];
    for (let b = 0; b < batch; b++) scenarios.push(prep());
    const t0 = performance.now();
    for (let b = 0; b < batch; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < batch; b++) scenarios[b].cleanup();
    return dt / batch;
}

export interface AbOptions {
    rounds?: number;
    batch?: number;
    heap?: HeapMounts;
}

export async function abBench(
    title: string,
    unit: string,
    frameworks: Frameworks,
    opts: AbOptions = {}
): Promise<void> {
    const rounds = opts.rounds ?? 200;
    const batch = opts.batch ?? 1;
    const names = Object.keys(frameworks) as FrameworkName[];
    const preps = frameworks as Record<FrameworkName, Prepare>;

    for (let w = 0; w < 10; w++) for (const n of names) sampleOnce(preps[n], batch);

    const times: Record<string, number[]> = {};
    for (const n of names) times[n] = [];
    for (let r = 0; r < rounds; r++) {
        // rotate order each round so load can't consistently bias one framework
        const shift = r % names.length;
        for (let k = 0; k < names.length; k++) {
            const n = names[(k + shift) % names.length];
            gcIfPossible();
            times[n].push(sampleOnce(preps[n], batch));
        }
    }

    const stats = names.map(n => ({ name: n, s: stat(times[n]) }));
    stats.sort((a, b) => a.s.median - b.s.median);
    const fastest = stats[0];
    const f = (x: number): string => x.toFixed(3);
    const pad = (n: string): string => n.padEnd(7);

    line(`${title} [${unit}] · interleaved · ${rounds} rounds · GC/sample`);
    line(`            min     p25     median  p75     max`);
    for (const { name, s } of stats) {
        const star = name === fastest.name ? ' ★' : '';
        line(`${pad(name)}:   ${f(s.min)}   ${f(s.p25)}   ${f(s.median)}   ${f(s.p75)}   ${f(s.max)}${star}`);
    }
    // Exodra's standing vs the field.
    const exo = stats.find(x => x.name === 'exodra')!;
    const rank = stats.findIndex(x => x.name === 'exodra') + 1;
    const vs = stats
        .filter(x => x.name !== 'exodra')
        .map(x => {
            const ratio = x.s.median / Math.max(exo.s.median, 1e-6);
            return ratio >= 1
                ? `${ratio.toFixed(1)}× faster than ${x.name}`
                : `${(1 / ratio).toFixed(1)}× slower than ${x.name}`;
        })
        .join(' · ');
    line(`exodra: rank ${rank}/${names.length} — ${vs}`);

    if (opts.heap) {
        const heap = opts.heap;
        const retained = (mount: () => () => void): number | undefined => {
            gcIfPossible();
            const before = readHeapBytes();
            const teardown = mount();
            gcIfPossible();
            const after = readHeapBytes();
            teardown();
            return before === undefined || after === undefined
                ? undefined
                : Math.max(0, after - before);
        };
        const parts: string[] = [];
        for (const n of names) {
            const m = heap[n];
            if (!m) continue;
            const bytes = retained(m);
            if (bytes !== undefined) parts.push(`${n} ${(bytes / 1048576).toFixed(2)}MB`);
        }
        if (parts.length) line(`retained heap: ${parts.join(' · ')}`);
    }
}
