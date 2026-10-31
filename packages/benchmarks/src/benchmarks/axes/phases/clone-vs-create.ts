import type { Scenario } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

const INSTANCES = 321;
const SIZES: readonly number[] = [1, 2, 4, 8, 16, 32, 64];
const TARGET_NODE_VISITS = 40000;
const MIN_TICKS = 3;

type TDensity = 'sparse' | 'dense';
const DENSITIES: readonly TDensity[] = ['sparse', 'dense'];

function repsFor(nodes: number): number {
    return Math.max(1, Math.min(64, Math.round(TARGET_NODE_VISITS / (INSTANCES * nodes))));
}

function markupOf(nodes: number): string {
    return `<div class="r">${'<span class="n"></span>'.repeat(nodes - 1)}</div>`;
}

function portCount(nodes: number, density: TDensity): number {
    return density === 'dense' ? nodes : 1;
}

function parsePrototype(nodes: number): Element {
    const holder = document.createElement('template');
    holder.innerHTML = markupOf(nodes);
    return document.importNode(holder.content.firstElementChild as Element, true);
}

function cloneWalk(proto: Element, ports: number, into: Node[]): Element {
    const root = proto.cloneNode(true) as Element;
    into[0] = root;
    let at: Node | null = root.firstChild;
    for (let k = 1; k < ports; k++) {
        into[k] = at as Node;
        at = (at as Node).nextSibling;
    }
    return root;
}

function create(nodes: number, ports: number, into: Node[]): Element {
    const root = document.createElement('div');
    root.setAttribute('class', 'r');
    into[0] = root;
    for (let k = 1; k < nodes; k++) {
        const span = document.createElement('span');
        span.setAttribute('class', 'n');
        root.appendChild(span);
        if (k < ports) into[k] = span;
    }
    return root;
}

interface TCell {
    readonly nodes: number;
    readonly density: TDensity;
    readonly ports: number;
    readonly reps: number;
    readonly proto: Element;
    readonly protoB: Element;
}

const CELLS: readonly TCell[] = SIZES.flatMap((nodes) =>
    DENSITIES.map((density) => ({
        nodes,
        density,
        ports: portCount(nodes, density),
        reps: repsFor(nodes),
        proto: parsePrototype(nodes),
        protoB: parsePrototype(nodes),
    }))
);

function gateCells(): void {
    const broken: string[] = [];
    for (const cell of CELLS) {
        const cloned: Node[] = [];
        const made: Node[] = [];
        const a = cloneWalk(cell.proto, cell.ports, cloned);
        const b = create(cell.nodes, cell.ports, made);
        const label = `${cell.density}${cell.nodes}`;
        if (a.outerHTML !== b.outerHTML)
            broken.push(`${label}: clone and create print different markup`);
        if (a.outerHTML !== cell.protoB.outerHTML)
            broken.push(`${label}: the null's prototype differs`);
        if (cloned.length !== cell.ports || made.length !== cell.ports) {
            broken.push(
                `${label}: ${cloned.length}/${made.length} addresses held against ${cell.ports} ports`
            );
        }
        for (let k = 0; k < cell.ports; k++) {
            const pathA =
                k === 0 ? 'root' : String(Array.prototype.indexOf.call(a.childNodes, cloned[k]));
            const pathB =
                k === 0 ? 'root' : String(Array.prototype.indexOf.call(b.childNodes, made[k]));
            if (pathA !== pathB)
                broken.push(`${label}: address ${k} lands on ${pathA} vs ${pathB}`);
        }
    }
    if (broken.length > 0) throw new Error('clone-vs-create: ' + broken.join('; '));
    line(
        `GATE — all ${CELLS.length} cells: clone+walk and createElement print byte-identical markup and hold ` +
            'the same addresses; every null prototype is the same tree'
    );
}

function sinkPrep(build: (into: Node[]) => Element): () => Scenario {
    return () => {
        const roots = new Array<Element>(INSTANCES);
        const addresses: Node[][] = new Array(INSTANCES);
        for (let i = 0; i < INSTANCES; i++) addresses[i] = [];
        return {
            measure: () => {
                for (let i = 0; i < INSTANCES; i++) roots[i] = build(addresses[i]);
            },
            cleanup: () => {
                roots.length = 0;
            },
        };
    };
}

interface TPhase {
    readonly name: string;
    readonly reps: number;
    readonly prep: () => Scenario;
}

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

function sampleOnce(phase: TPhase): number {
    const scenarios: Scenario[] = [];
    for (let b = 0; b < phase.reps; b++) scenarios.push(phase.prep());
    gcIfPossible();
    const t0 = performance.now();
    for (let b = 0; b < phase.reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < phase.reps; b++) scenarios[b].cleanup();
    return dt / phase.reps;
}

interface TStat {
    readonly min: number;
    readonly p25: number;
    readonly median: number;
    readonly p75: number;
    readonly max: number;
}

function statOf(xs: number[]): TStat {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    return { min: s[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: s[s.length - 1] };
}

function runPhases(phases: readonly TPhase[], rounds: number): Map<string, TStat> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);
    const times = new Map<string, number[]>(phases.map((p) => [p.name, []]));
    for (let r = 0; r < rounds; r++) {
        const shift = r % phases.length;
        for (let k = 0; k < phases.length; k++) {
            const p = phases[(k + shift) % phases.length];
            (times.get(p.name) as number[]).push(sampleOnce(p));
        }
    }
    return new Map(phases.map((p) => [p.name, statOf(times.get(p.name) as number[])]));
}

function observeTimerQuantum(): number {
    let smallest = Infinity;
    for (let s = 0; s < 100; s++) {
        const t0 = performance.now();
        let t1 = performance.now();
        while (t1 === t0) t1 = performance.now();
        if (t1 - t0 < smallest) smallest = t1 - t0;
    }
    return smallest === Infinity ? 0.1 : smallest;
}

export function benchmarkCloneVsCreate(rounds = 100, batch = 1): void {
    const ns = (ms: number): number => (ms * 1e6) / INSTANCES;
    const quantum = observeTimerQuantum();
    gateCells();

    const phases: TPhase[] = [];
    for (const cell of CELLS) {
        const tag = `${cell.density}${cell.nodes}`;
        const reps = cell.reps * batch;
        phases.push({
            name: `${tag}:clone`,
            reps,
            prep: sinkPrep((into) => cloneWalk(cell.proto, cell.ports, into)),
        });
        phases.push({
            name: `${tag}:cloneB`,
            reps,
            prep: sinkPrep((into) => cloneWalk(cell.protoB, cell.ports, into)),
        });
        phases.push({
            name: `${tag}:create`,
            reps,
            prep: sinkPrep((into) => create(cell.nodes, cell.ports, into)),
        });
    }
    const stats = runPhases(phases, rounds);
    const med = (name: string): number => (stats.get(name) as TStat).median;
    const f = (x: number): string => x.toFixed(4);

    const short = phases.filter((p) => med(p.name) * p.reps < MIN_TICKS * quantum);
    for (const p of short) {
        refuse(
            `${p.name}: a timed region is under ${MIN_TICKS} timer quanta — rerun with a larger batch`
        );
    }

    line(
        `CLONE-VS-CREATE — ms per ${INSTANCES} instances · interleaved · ${rounds} rounds · batch ${batch}`
    );
    line('phase                reps   min      p25      median   p75      max');
    for (const p of phases) {
        const s = stats.get(p.name) as TStat;
        line(
            `${p.name.padEnd(18)}${String(p.reps).padStart(6)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}`
        );
    }
    // eslint-disable-next-line no-console
    console.log('');

    line('ns per instance; floor = max(|clone − cloneB|, one timer quantum per instance)');
    line('  cell        nodes ports   clone  create  create−clone   floor  verdict');
    const verdicts = new Map<TDensity, string[]>(DENSITIES.map((d) => [d, []]));
    for (const cell of CELLS) {
        const tag = `${cell.density}${cell.nodes}`;
        const clone = ns(med(`${tag}:clone`));
        const cloneB = ns(med(`${tag}:cloneB`));
        const made = ns(med(`${tag}:create`));
        const floor = Math.max(Math.abs(clone - cloneB), ns(quantum / (cell.reps * batch)));
        const gap = made - clone;
        const verdict =
            Math.abs(gap) <= floor ? 'inside floor' : gap > 0 ? 'clone wins' : 'create wins';
        (verdicts.get(cell.density) as string[]).push(verdict);
        line(
            `  ${tag.padEnd(10)} ${String(cell.nodes).padStart(6)} ${String(cell.ports).padStart(
                5
            )} ` +
                `${clone.toFixed(1).padStart(7)} ${made.toFixed(1).padStart(7)} ` +
                `${((gap >= 0 ? '+' : '') + gap.toFixed(1)).padStart(13)} ` +
                `${floor.toFixed(1).padStart(7)}  ${verdict}`
        );
    }
    const range = `${SIZES[0]}..${SIZES[SIZES.length - 1]} nodes`;
    for (const density of DENSITIES) {
        const seen = new Set(verdicts.get(density));
        const only = seen.size === 1 ? [...seen][0] : null;
        line(
            `CROSSOVER (${density}) — ` +
                (only === null
                    ? `the verdict changes inside ${range}; read the rows`
                    : `none in ${range}: ${only} at every size`)
        );
    }
}
