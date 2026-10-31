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
    if (gc) {
        gc();
        gc();
    }
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

// Frameworks a bench provides scenarios for. `exodra` is always present: it is the subject
// every axis measures, and the field is whatever third-party participants that axis lists
// alongside it.
//
// `exodra` MEANS THE SCHEMA CORE — `createExoMachineBuilder` from `@exodra/core` rendered by
// `ExoDomBackend.render` from `@exodra/dom`. It is the only Exodra renderer in the repository. The
// three-props renderer that used to hold this name has been deleted; a row labelled `exodra`
// in any output of this suite is the schema core and nothing else.
export type FrameworkName = 'exodra' | 'solid' | 'svelte' | 'react';
export type Frameworks = { exodra: Prepare } & Partial<
    Record<Exclude<FrameworkName, 'exodra'>, Prepare>
>;
export type HeapMounts = Partial<Record<FrameworkName, () => () => void>>;

export interface Stat {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
}

/**
 * PRINT A TABLE FOR THE RECORDER RATHER THAN FOR A READER, so `--record` never has to guess.
 *
 * `run-one-axis.js` recorded an axis by matching its printed table against a ladder of regular
 * expressions, one shape per table layout in the suite. That ladder ends in a permissive pattern,
 * and its own comment states what that costs: an unrecognised row does not go missing, it arrives
 * WRONG. A nine-column table once fell through to the loose shape and reached `measurements/` with
 * nanoseconds recorded as `p75` and bytes as `max`, and that file was published and cited before
 * anybody opened it.
 *
 * `plugin-price` is the axis that made the ladder untenable rather than merely risky: it prints one
 * DERIVED number per row (µs per round), a ratio, a round count and a sentence. There are no five
 * statistics on the line to scrape, so no pattern could read it correctly and a sixth pattern would
 * only have taught the ladder to read it incorrectly. The numbers stayed console-only, which is the
 * one thing a measurement may not be.
 *
 * So an axis states its own rows. The line is not for a human — the axis keeps printing its human
 * table exactly as it did — and it carries the FULL `Stat` rather than the single figure printed,
 * so a recording is richer than the table it came from and every existing consumer (which reads
 * `median`) keeps working unchanged.
 *
 * THE CONTRACT IS ALL-OR-NOTHING PER AXIS, and the recorder enforces it: once an axis emits one
 * table this way, scraping is off for that axis entirely. Otherwise a table that is BOTH emitted
 * and scrapable would be recorded twice, and two rows under one name is the same class of defect
 * as no row at all. An axis that adopts this emits every table it wants recorded.
 *
 * @param section Which of the axis's tables this is — the qualifier a row name gets on collision.
 *                `null` FOR AN AXIS THAT PRINTS ONE TABLE AND WANTS ITS ROWS RECORDED UNDER THE
 *                NAMES IT PRINTS. The runner prefixes a recorded row with `section/` whenever a
 *                section is known, so an axis whose rows are already cited by bare name — and
 *                `app-update`'s are, by `docs-site/docs/benchmarks.md`'s `<!-- gate: axis=app-update
 *                -->` block, which looks rows up by name — would rename every row in its next
 *                recording just by adopting this function. `null` says "no qualifier"; every
 *                existing caller passes a string and is unaffected.
 * @param unit    The unit `Stat`'s numbers are in, stated because it is NOT always milliseconds:
 *                `plugin-price` works in microseconds per round and a figure read at the wrong unit
 *                is 1000× wrong in the direction that flatters.
 * @param per     What one number covers — `'round'`, `'row'`, `'mount'`. Recorded, never inferred.
 * @param appLines How many lines of code the app cost each participant, by row name — the column
 *                `abBench` prints beside the medians. It rides on the row for the same reason the
 *                unit does: a reader of the JSON gets the whole trade, milliseconds AND source,
 *                where a console-only figure is the half of it nobody can check. `null` for a row
 *                that has no app of its own (a floor, a null twin) or whose app is not yet in files
 *                of its own; see `app-files.ts`.
 */
export function emitRecordedRows(
    section: string | null,
    unit: 'ms' | 'µs' | 'ns',
    per: string,
    rows: ReadonlyArray<readonly [string, Stat]>,
    appLines?: Readonly<Record<string, number | null>>
): void {
    console.log(
        `##ROWS## ${JSON.stringify({
            section,
            unit,
            per,
            rows: rows.map(([name, s]) => ({
                name,
                ...s,
                appLines: appLines === undefined ? null : appLines[name] ?? null,
            })),
        })}`
    );
}

/**
 * ONE ROW OF A FINISHED RUN, and the reason `abBench` hands anything back at all.
 *
 * An axis can only tell whether it MEASURED anything after the fact: the browser's clock is
 * clamped, so a table whose fastest row sits on the quantum is not a ranking, it is the clamp
 * printed thirteen times — which is exactly what `toggle` was for its whole life. So the rows
 * come back sorted by median, fastest first, and an axis that wants to check its own scale reads
 * `[0]` and says so out loud. Every other caller ignores the value and is unaffected.
 */
export interface AbRow {
    name: string;
    stat: Stat;
    /**
     * THIS ROW'S PER-ROUND SAMPLES, IN ROUND ORDER — and the reason they are handed back at all.
     *
     * An axis that carries a NULL PAIR (two separately declared participants whose true difference
     * is zero by construction) can say what its instrument returns when nothing is there — but only
     * if it can subtract the two rows ROUND BY ROUND. A report that has only the two MEDIANS can
     * compute |median(a) − median(b)| — BIAS, which is free to cancel — and cannot compute the
     * round-to-round scatter that `mount-floor` calls NOISE; `participants/floor/toggle.ts`'s
     * caveat (D) is a report still in that position. Two medians ARE free to cancel, and the first
     * null this suite ever printed came out at 0.0000 for exactly that reason.
     *
     * `times[name]` already existed; nothing new is measured, sampled or timed to produce this. The
     * field is purely additive: every existing caller reads `name`/`stat` and is unaffected.
     *
     * The samples are in ROUND order, not sorted — `stat` is the sorted view. Two rows of one run
     * are index-aligned: round `r` of one is round `r` of the other, adjacent in the rotation.
     */
    samples: readonly number[];
}

// ── NARROW RUNS — `--only=<name>[,<name>…]` ──────────────────────────────────────────────────
//
// WHY THE FILTER LIVES IN THE HARNESS AND NOT IN THE AXES, which is the whole reason it is safe.
// An axis is a long straight-line program: it builds every participant, drives each one through
// its gates, prints its censuses, and only then calls `abBench`. Filtering AT THE AXIS would mean
// skipping the construction of the rows that were dropped — and the construction is where the
// gates are. `toggle.tsx` proves `gateOwnsParent` off the compiled schema and again by behaviour,
// `gateRebuilds` that no panel survives a hide, `gateKeeps` that all 200 do, `gateMarkup` that
// every participant emits the reference's exact bytes at all four states. A narrow run that
// skipped any of those would be a narrow run whose numbers nobody checked.
//
// So the filter is applied to `frameworks` INSIDE this function, at the last possible moment.
// Every gate, every census, every refusal an axis prints runs exactly as it does on a full run;
// what shrinks is the set of participants that get SAMPLED. Nothing an axis does before or after
// `abBench` can tell the difference.
const ONLY_GLOBAL = '__EXO_BENCH_ONLY__';
const ONLY_HITS_GLOBAL = '__EXO_BENCH_ONLY_HITS__';
const ONLY_NAMES_GLOBAL = '__EXO_BENCH_NAMES__';

/**
 * THE SHELL-SAFE SPELLING, and the reason one is needed at all.
 *
 * Row names in this suite are not identifiers. `floor·rebuild·owned`, `floor·kept·owned`,
 * `clone·twin`, `+head` — the separator is U+00B7 MIDDLE DOT, which is a nuisance to type and a
 * hazard to paste. So a token and a row name are compared after BOTH are lowercased and every run
 * of non-alphanumeric characters collapses to a single `.`:
 *
 *     floor·rebuild·owned  ≡  floor.rebuild.owned  ≡  floor-rebuild-owned  ≡  FLOOR_REBUILD_OWNED
 *
 * It is an equivalence and not a prefix match on purpose. A prefix would make `floor` silently
 * select one of six floor rows, and which one it picked would depend on declaration order.
 */
function onlyKey(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
}

function onlyTokens(): readonly string[] | null {
    const raw = (globalThis as Record<string, unknown>)[ONLY_GLOBAL];
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    const toks = raw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t !== '');
    return toks.length > 0 ? toks : null;
}

/**
 * EVERY TOKEN THAT EVER MATCHED, kept on a global so the RUNNER can check the whole process at the
 * end rather than this function checking one table.
 *
 * An axis may print several tables from several `abBench` calls with different fields (`virtual-list`
 * prints four). A token that is a typo in one table may be a real row in the next, so throwing here
 * on a token this call does not know would make `--only` unusable on those axes — and tolerating it
 * silently is the failure the flag exists to prevent. The split: this function refuses a table it
 * cannot filter at all, and `run-one-axis.js` refuses the RUN when a token matched nothing anywhere.
 */
function noteHit(token: string): void {
    const g = globalThis as Record<string, unknown>;
    const hits = (g[ONLY_HITS_GLOBAL] as string[] | undefined) ?? [];
    if (!hits.includes(token)) hits.push(token);
    g[ONLY_HITS_GLOBAL] = hits;
}

interface Selection {
    names: string[];
    dropped: string[];
}

/**
 * Applies `--only` to ONE table's declared field. Returns `null` when no filter is active — which
 * is the path every full run takes, and it changes nothing.
 *
 * TWO WAYS IT REFUSES, both loud:
 *  - two of the AXIS'S OWN names collapse to the same key — it THROWS. That is a suite bug and not
 *    an operator's: no token could address those two rows separately, so a filter naming either of
 *    them would silently pick one. Checking the axis's names is also what makes a token unambiguous
 *    by construction — one key, at most one row — so a matching token never has to be disambiguated.
 *  - no token matches anything in this table — the table is left UNFILTERED and says so with `❌`,
 *    rather than printing an empty table or quietly running the full field with no notice. Whether
 *    the token is a typo or simply belongs to another of this axis's tables is decided by
 *    `run-one-axis.js` after the whole axis has run; see `noteHit`.
 */
function selectParticipants(declared: readonly string[]): Selection | null {
    // EVERY NAME THIS AXIS OFFERED, ACROSS ALL ITS TABLES, kept unconditionally so the runner can
    // print the real list when a token turns out to be a typo. Guessing at spellings is the whole
    // reason a typo happens; a refusal that does not show the alternatives invites the next one.
    const g = globalThis as Record<string, unknown>;
    const seen = (g[ONLY_NAMES_GLOBAL] as string[] | undefined) ?? [];
    for (const n of declared) if (!seen.includes(n)) seen.push(n);
    g[ONLY_NAMES_GLOBAL] = seen;

    const tokens = onlyTokens();
    if (tokens === null) return null;

    const byKey = new Map<string, string[]>();
    for (const n of declared) {
        const k = onlyKey(n);
        const bucket = byKey.get(k);
        if (bucket) bucket.push(n);
        else byKey.set(k, [n]);
    }
    for (const [k, ns] of byKey) {
        if (ns.length > 1) {
            throw new Error(
                `abBench: this table declares ${ns.length} participants whose --only key is the ` +
                    `same (${k}): ${ns.join(', ')}. No filter can address them separately. ` +
                    'Rename one of them.'
            );
        }
    }

    const keep = new Set<string>();
    for (const tok of tokens) {
        const hit = byKey.get(onlyKey(tok));
        if (hit === undefined) continue;
        noteHit(tok);
        keep.add(hit[0]);
    }
    if (keep.size === 0) {
        refuseLine(
            "--only matched none of this table's participants — TABLE LEFT UNFILTERED. It " +
                `declares: ${declared.join(', ')}`
        );
        return null;
    }
    return {
        names: declared.filter((n) => keep.has(n)),
        dropped: declared.filter((n) => !keep.has(n)),
    };
}

/**
 * A DECLARED PAIRING — which floor bounds which participant, and on what evidence.
 *
 * IT IS DECLARED BY THE AXIS AND READ BY THE HARNESS, and it is declared rather than inferred
 * because there is no rule that could infer it. This repository compared a mount against a floor
 * that had been handed 240 pre-built elements, and no amount of name-matching would have caught
 * that: `floor` was in the name and the ratio came out beautifully. `participants/floor/toggle.ts`
 * is the file that got this right first — it pairs only WITHIN a contract, and it picks the
 * cheapest row per contract mechanically rather than nominating one in prose — and this interface
 * is that rule lifted out of `toggle.tsx` so any axis can state it once.
 *
 * A PARTICIPANT WITH NO CONTRACT GETS NO RATIO. `toggle` has eight rows whose clear path nobody in
 * this repository has read; its own report brackets them between two floors and refuses to assign
 * them to one. They are therefore in NO contract here, and a narrow run that selects one of them
 * prints `NO DECLARED FLOOR` and points at the axis's own report. That is the honest output and an
 * invented pairing is not.
 */
export interface AbContract {
    /** What the rows in it promise, e.g. `rebuild+owned`. Printed on every line it produces. */
    name: string;
    /**
     * The candidate floor rows. THE CHEAPEST ONE PRESENT IN THE RUN IS THE BOUND, chosen
     * mechanically — `participants/floor/toggle.ts`'s rule, so a probe that beats the nominated
     * floor becomes the floor without anybody editing a header.
     */
    floors: readonly string[];
    /** The rows this floor bounds. Membership is the axis's claim; the evidence below says how good. */
    members: readonly string[];
    /** How the pairing was established — SETTLED / CITED / anything the axis can defend. Verbatim. */
    evidence: string;
    /**
     * Two rows whose TRUE DIFFERENCE IS ZERO by construction, if the axis has such a pair. It is
     * what makes "reaches the floor" judgeable at all: without it the verdict can print a ratio and
     * must not print a pass, because nothing in the run says how small a gap this instrument can
     * see. Absent, or absent from the filtered field, the verdict prints UNJUDGED and names the two
     * rows to add.
     */
    resolutionPair?: readonly [string, string];
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

/**
 * The harness disowning something of its own, in the shape every axis here already uses: a `❌`
 * PRINTED and not thrown, so one unreadable table does not take a readable one down with it, and
 * so `run-one-axis.js` collects it into the recording's `refusals` like any other.
 */
function refuseLine(s: string): void {
    // eslint-disable-next-line no-console
    console.log(`❌ ${s}`);
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
    /**
     * WHICH FLOOR BOUNDS WHICH PARTICIPANT — see `AbContract`. Read ONLY when `--only` narrowed the
     * field, so declaring it changes nothing a full run prints. An axis that declares none simply
     * gets no verdict line and says so.
     */
    contracts?: readonly AbContract[];
    /**
     * HOW MANY LINES OF CODE THE APP COST EACH PARTICIPANT, by row name — build it with
     * `appLines()` from `app-lines.ts`, which counts them from source at run time.
     *
     * A RENDERER THAT IS TEN PERCENT FASTER AND TAKES TWICE THE CODE HAS NOT WON, and until this
     * column existed every axis here printed only the half of that trade it could time. The
     * participants implement the IDENTICAL app and are gated byte for byte before anything is
     * measured, which is exactly the condition under which the comparison means something.
     *
     * IT REQUIRES `record`, and the column is refused without it. The recorder scrapes an
     * un-emitted table by matching a ladder of patterns against the printed line, and an extra
     * column shifts every statistic on a row whose name is not a bare identifier — the failure
     * that once put nanoseconds in `p75` and bytes in `max` in a published file.
     */
    appLines?: Readonly<Record<string, number | null>>;
    /**
     * STATE THE ROWS FOR THE RECORDER instead of leaving them to be scraped — see
     * `emitRecordedRows`, whose three arguments these are. An axis that sets this must not call
     * `emitRecordedRows` for the same table as well: the contract is all-or-nothing per axis and
     * two rows under one name is the same class of defect as none.
     */
    record?: { section: string | null; unit: 'ms' | 'µs' | 'ns'; per: string };
}

/**
 * WHAT A NARROW RUN IS AND IS NOT, printed by the run rather than left in a header.
 *
 * ── THE ROTATION IS STILL HONEST, AND THIS SAYS SO WITH THE PERIOD ──────────────────────────
 * `abBench` starts each round at `r % names.length`, so over any `names.length` consecutive rounds
 * every participant occupies every position exactly once. That is true of a field of two as much as
 * of a field of twenty; the rotation is not what shrinking breaks.
 *
 * ── WHAT SHRINKING REALLY CHANGES, AND IT IS NOT NOTHING ────────────────────────────────────
 * (1) THE GAP BETWEEN A ROW'S OWN SAMPLES COLLAPSES. In a field of twenty, two samples of the same
 *     row are nineteen foreign programs apart; in a field of two, one. A drift in machine state that
 *     a wide field smears across a whole table now lands on both rows almost equally — which makes
 *     the RATIO steadier and makes each row's own spread describe a much shorter stretch of the
 *     machine than a full run's spread does.
 * (2) THE PROCESS IS CLEANER THAN IT EVER IS IN A FULL TABLE. Every sample here runs after far fewer
 *     foreign programs, so V8's inline caches, its code cache and the heap carry much less of other
 *     participants' shapes. Both rows run warmer and more monomorphic than the same rows do when
 *     eighteen other libraries are interleaved with them.
 * (3) THE RUN IS SHORTER, so it samples less of the machine's ambient variation, in both directions.
 *
 * ── THE CONSEQUENCE, WHICH IS THE ONLY THING THAT MATTERS DOWNSTREAM ────────────────────────
 * AN ABSOLUTE MEDIAN FROM A NARROW RUN MAY NOT BE COMPARED WITH ONE FROM A FULL RUN of the same
 * axis, in either direction. What survives across runs is a RATIO computed inside one run — which is
 * exactly what this flag exists to get, and exactly what the verdict below prints.
 */
function reportNarrowed(
    selection: Selection,
    declared: readonly string[],
    rounds: number,
    stats: ReadonlyArray<{ name: string; s: Stat }>,
    contracts: readonly AbContract[] | undefined
): void {
    const f = (x: number): string => x.toFixed(3);
    const med = new Map(stats.map((x) => [x.name, x.s.median]));
    const has = (n: string): boolean => med.has(n);

    line('');
    line(
        `FIELD NARROWED — ${selection.names.length} of ${declared.length} participants sampled ` +
            `(${selection.names.join(', ')}). Dropped: ${selection.dropped.join(
                ', '
            )}. Every gate, ` +
            'census and refusal this axis prints ran in full; only the sampling was narrowed.'
    );
    line(
        `  rotation period ${selection.names.length} round(s) of ${rounds}, so each row still takes ` +
            "every position an equal number of times — but a row's consecutive samples are now " +
            `${selection.names.length - 1} foreign program(s) apart instead of ${
                declared.length - 1
            }, and the process carries far less of the dropped participants' shapes in its caches.`
    );
    line(
        '  SO: the absolute medians above are NOT comparable with a full run of this axis, in ' +
            'either direction. Only a RATIO taken inside this one run is. Do not paste a number ' +
            'from this table beside a number from a wide one.'
    );

    if (contracts === undefined || contracts.length === 0) {
        refuseLine(
            'GOAL: this axis declares no floor↔participant pairing (`contracts` in its abBench ' +
                'options), so no ratio is printed. NONE IS INFERRED — a floor is paired to a ' +
                'participant by an argument, never by a name that starts with `floor`. This ' +
                'repository has already compared a mount against a floor handed 240 pre-built ' +
                'elements; that pairing looked fine by name.'
        );
        return;
    }

    const covered = new Set<string>();
    for (const c of contracts) {
        const members = c.members.filter(has);
        const floorsPresent = c.floors.filter(has);
        for (const m of members) covered.add(m);
        if (members.length === 0) continue;
        if (floorsPresent.length === 0) {
            refuseLine(
                `GOAL [${c.name}]: ${members.join(', ')} selected, but NONE of this contract's ` +
                    `floors is in the field (${c.floors.join(', ')}). Re-run with one of them in ` +
                    "`--only` — a participant without its own contract's floor has no bound here."
            );
            continue;
        }
        // THE CHEAPEST FLOOR PRESENT WINS — `participants/floor/toggle.ts`'s rule. A probe that
        // turns out to beat the nominated floor becomes the floor without anybody editing a header.
        let floorName = floorsPresent[0];
        for (const n of floorsPresent) if (med.get(n)! < med.get(floorName)!) floorName = n;
        const floor = med.get(floorName)!;

        // THE RESOLUTION, WHICH IS WHAT MAKES "REACHES THE FLOOR" JUDGEABLE AT ALL. Without a pair
        // whose true difference is zero, this function may print a ratio and MUST NOT print a pass:
        // nothing in the run would say how small a gap the instrument can see. `abBench` returns
        // medians and not the paired per-round series, so this is BIAS — free to cancel — and it is
        // therefore a LOWER bound on the real resolution. Labelled weak everywhere it appears.
        let bias: number | null = null;
        const pair = c.resolutionPair;
        if (pair !== undefined && has(pair[0]) && has(pair[1])) {
            bias = Math.abs(med.get(pair[0])! - med.get(pair[1])!);
        }

        const verdicts = members.map((m) => {
            const v = med.get(m)!;
            const ratio = v / floor;
            const delta = v - floor;
            if (ratio <= 1) {
                return `${m} ${f(v)} = ${ratio.toFixed(2)}× — AT OR BELOW THE FLOOR`;
            }
            if (bias !== null && delta <= bias) {
                return (
                    `${m} ${f(v)} = ${ratio.toFixed(2)}× — REACHES IT: +${f(delta)} is inside ` +
                    `this run's weak resolution (${f(bias)})`
                );
            }
            const share = (1 - 1 / ratio) * 100;
            if (bias === null) {
                return (
                    `${m} ${f(v)} = ${ratio.toFixed(2)}× (+${f(delta)}, ${share.toFixed(0)}% of ` +
                    'it above the floor) — UNJUDGED: no zero-difference pair in this field'
                );
            }
            return (
                `${m} ${f(v)} = ${ratio.toFixed(2)}× (+${f(delta)}, ${share.toFixed(0)}% of it ` +
                `above the floor) — ABOVE, and the gap exceeds this run's weak resolution (${f(
                    bias
                )})`
            );
        });
        line(`GOAL [${c.name}] vs ${floorName} ${f(floor)} — ${verdicts.join(' · ')}`);
        line(`  pairing evidence: ${c.evidence}`);
        if (bias === null) {
            line(
                '  no resolution in this field' +
                    (pair === undefined
                        ? ' — this contract declares no zero-difference pair, so "reaches" cannot ' +
                          'be judged, only the ratio reported.'
                        : ` — add \`${pair[0]},${pair[1]}\` to --only and the verdict becomes ` +
                          'judgeable.')
            );
        }
    }

    // A FLOOR ROW IS NOT A PARTICIPANT LOOKING FOR A FLOOR. Selecting `floor·rebuild·owned` is how
    // the bound gets into the field at all, so it must not then be reported as having none.
    // The resolution pair is in the same position: those two rows are the INSTRUMENT, selected so
    // the verdict can judge "reaches" at all, and neither is a subject of this axis.
    const floorRows = new Set(contracts.flatMap((c) => [...c.floors, ...(c.resolutionPair ?? [])]));
    const orphans = selection.names.filter((n) => !covered.has(n) && !floorRows.has(n));
    if (orphans.length > 0) {
        line(
            `NO DECLARED FLOOR: ${orphans.join(', ')} — this axis does not claim a floor for ` +
                "them, and none is invented here. Read the axis's own report for what it does " +
                'say about them (some rows are deliberately bracketed between two floors rather ' +
                'than assigned to one).'
        );
    }
}

export async function abBench(
    title: string,
    unit: string,
    frameworks: Frameworks,
    opts: AbOptions = {}
): Promise<AbRow[]> {
    const rounds = opts.rounds ?? 200;
    const batch = opts.batch ?? 1;
    const declared = Object.keys(frameworks);
    const selection = selectParticipants(declared);
    const names = (selection === null ? declared : selection.names) as FrameworkName[];
    const preps = frameworks as Record<FrameworkName, Prepare>;

    for (let w = 0; w < 10; w++) for (const n of names) sampleOnce(preps[n], batch);

    const times: Record<string, number[]> = {};
    for (const n of names) times[n] = [];
    for (let r = 0; r < rounds; r++) {
        // Direction ALTERNATES. A rotation alone moves where the round is cut and never changes
        // the cyclic order, so every participant keeps the same neighbour for the whole run and a
        // neighbour effect biases every pair identically instead of cancelling.
        const shift = r % names.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < names.length; k++) {
            const at = forward
                ? (k + shift) % names.length
                : (shift + names.length - 1 - k) % names.length;
            const n = names[at];
            gcIfPossible();
            times[n].push(sampleOnce(preps[n], batch));
        }
    }

    const stats = names.map((n) => ({ name: n, s: stat(times[n]) }));
    stats.sort((a, b) => a.s.median - b.s.median);
    const fastest = stats[0];
    const f = (x: number): string => x.toFixed(3);
    const nameWidth = Math.max(7, ...names.map((n) => n.length));
    const pad = (n: string): string => n.padEnd(nameWidth);

    // THE LINE-COUNT COLUMN IS REFUSED WITHOUT `record`, and the refusal is printed rather than
    // thrown. An un-emitted table is read back by matching patterns against the printed line, and
    // a sixth number on a row whose name is not a bare identifier shifts every statistic on it by
    // one place — the failure that once put nanoseconds in `p75` and bytes in `max` in a file that
    // was published and cited before anybody opened it.
    let appLines = opts.appLines;
    if (appLines !== undefined && opts.record === undefined) {
        refuseLine(
            'APP LOC COLUMN DROPPED: this axis passed `appLines` without `record`, so its table ' +
                'would be scraped with one more column than the recorder knows about and every ' +
                'statistic on a row could be read one place across. Pass `record` — the axis then ' +
                'states its own rows and scraping is off for it.'
        );
        appLines = undefined;
    }
    const locOf = (name: string): string => {
        const n = appLines === undefined ? null : appLines[name] ?? null;
        return n === null ? '—' : String(n);
    };

    line(
        `${title} [${unit}] · interleaved · ${rounds} rounds · GC/sample` +
            // STAMPED INTO THE TITLE, so a pasted two-row table can never be read as a full one.
            (selection === null ? '' : ` · FIELD NARROWED ${names.length}/${declared.length}`)
    );
    line(`            min     p25     median  p75     max` + (appLines ? `     app LOC` : ''));
    for (const { name, s } of stats) {
        const star = name === fastest.name ? ' ★' : '';
        line(
            `${pad(name)}:   ${f(s.min)}   ${f(s.p25)}   ${f(s.median)}   ${f(s.p75)}   ${f(
                s.max
            )}${appLines ? `   ${locOf(name).padStart(7)}` : ''}${star}`
        );
    }
    if (appLines) {
        // THE RULE THE COLUMN WAS COUNTED BY, PRINTED WITH IT. A number whose rule is invisible is
        // a number nobody can check, and this one is a claim about how much code a library made
        // somebody write.
        line(
            "  app LOC — lines of that participant's app that carry code, comments and blank " +
                "lines excluded. Counted from source at run time by TypeScript's own parser (a " +
                '`//` inside a string is part of the string, not a comment), over WHOLE FILES: ' +
                '`src/benchmarks/apps/<participant>/` holds the app and nothing else, while the ' +
                'mount adapter, the byte gate and the census live in ' +
                '`src/benchmarks/participants/<participant>/` and are not counted. A shared file ' +
                'is counted for every participant that imports it. `—` is a row with no app of ' +
                'its own — a floor, a null twin — or one whose app is not in files of its own yet. ' +
                'The lists are in `shared/app-files.ts`.'
        );
    }
    // The subject's standing vs the field. Normally that is `exodra`; a diagnostic
    // that leaves it out on purpose — one comparing a single implementation against
    // one reference — is anchored on whichever participant it listed FIRST instead
    // of crashing on an absent name.
    const subject = stats.some((x) => x.name === 'exodra') ? 'exodra' : names[0];
    const anchor = stats.find((x) => x.name === subject)!;
    const rank = stats.findIndex((x) => x.name === subject) + 1;
    const vs = stats
        .filter((x) => x.name !== subject)
        .map((x) => {
            const ratio = x.s.median / Math.max(anchor.s.median, 1e-6);
            return ratio >= 1
                ? `${ratio.toFixed(1)}× faster than ${x.name}`
                : `${(1 / ratio).toFixed(1)}× slower than ${x.name}`;
        })
        .join(' · ');
    line(`${subject}: rank ${rank}/${names.length} — ${vs}`);

    if (selection !== null) {
        reportNarrowed(selection, declared, rounds, stats, opts.contracts);
    }

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

    // THE ROWS, STATED FOR THE RECORDER rather than left to be scraped — see `emitRecordedRows`.
    // Emitted from here so that the line count printed in the table and the line count written to
    // disk are the same value read once, and so that adopting the column cannot leave an axis
    // publishing a table the recorder reads one column across.
    if (opts.record !== undefined) {
        const r = opts.record;
        emitRecordedRows(
            r.section,
            r.unit,
            r.per,
            stats.map(({ name, s }) => [name as string, s] as const),
            appLines
        );
    }

    // SORTED, FASTEST FIRST — the same order the table above was printed in. See `AbRow`. The
    // per-round series travels with each row so an axis with a null pair can subtract the two
    // ROUND BY ROUND rather than median from median; see `AbRow.samples`.
    return stats.map(({ name, s }) => ({ name: name as string, stat: s, samples: times[name] }));
}
