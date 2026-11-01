#!/usr/bin/env node
// Run a SINGLE benchmark axis headlessly (running all 6 in one browser session OOMs).
//
//   node scripts/run-one-axis.js <axis> [rounds] [batch] [cycleFactor]
//                                       [--record=<label>] [--no-record] [--only=<name>[,<name>…]]
//
// EVERY RUN RECORDS. Without `--record=<label>` it writes `measurements/<axis>.latest.json`; with
// one it writes that label instead. `--no-record` throws the reading away, and it has to be typed —
// a run that costs an hour of a laptop should not vanish because a flag was forgotten. That is not
// hypothetical: see the block above `EXO_DEFAULT_LABEL`. Recording also arms the stale-`dist/` gate,
// which refuses BEFORE the browser starts.
//
// `--only` NARROWS THE SAMPLED FIELD to the participants named, so one narrow question — this row
// against its floor — can be asked without a twenty-row table. Names are matched case-insensitively
// with every run of non-alphanumerics collapsed to `.`, so a middle dot never has to survive a
// shell: `--only=exodra,floor.rebuild.owned` selects `exodra` and `floor·rebuild·owned`.
//
//   npm run axis --workspace=@exodra/benchmarks -- toggle 100 1 --only=exodra,floor.rebuild.owned
//
// Every gate, census and refusal the axis prints still runs — the filter is applied inside
// `abBench`, after the axis has built and checked every participant. A name the axis does not have
// fails the run (exit 5) and nothing is recorded. See `--only`'s block below the AXES map.
//
// IT REACHES THE AXES THAT PRINT THROUGH THE SHARED HARNESS, WHICH IS NOT ALL OF THEM. `initial-
// render`, `exodra-initial-render`, `app-update`, `exodra-app-update`, `list-update`, `reconcile`,
// `reactive-update`, `toggle`, `virtual-list`, `component-split` and `clone-threshold`
// call `abBench`. The floor and phase diagnostics below — `mount-floor`,
// `update-floor`, `hydrate-floor`, `ssr-floor`, `teardown-floor`, `keystroke-floor`, `schema-build`,
// `child-mark`, `context-cost`, `import-node-trade`, `template-build`,
// `mount-phases`, `teardown-phases` — each own a `PROGRAMS` array and their own table printer, so
// the flag does not reach them and the run says so by name rather than reporting a bad spelling.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { checkBuildModes, printBuildModeReport } from './check-build-modes.mjs';
import { staleExoDistPackages, printStaleExoDist } from './staleExoDistPackages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const port = 3001;
const url = `http://localhost:${port}`;

// ═══ THE APP GAINED A THIRD LEVEL, AND IT DIVIDES EVERY RECORDING ON DISK IN TWO ═══
//
// The scene is now DECKS → CARDS → TAGS: ten decks of eight cards, the same eighty cards with the
// same indices and the same two hundred tags, plus ten decks' worth of chrome. 801 elements became
// 861 (+7.5%), and a round gained ten deck renames and two deck-date re-formats.
//
// SO NO ABSOLUTE TIME FROM BEFORE THIS CHANGE MAY BE PASTED BESIDE ONE FROM AFTER IT, on any axis
// that mounts or updates this app — `initial-render`, `exodra-initial-render`, `app-update`,
// `exodra-app-update`, `component-split`, `mount-phases`, `hydrate-floor`, `teardown-*`. A row that
// moved by less than the deepening moved it has not been shown to have moved at all.
//
// WHAT STILL CROSSES THE LINE: the RANKING within one recording, and the RATIOS between rows of one
// recording, because every participant got the same deepening in the same round. And every axis
// that does not mount this app — `list-reconcile`, `toggle`, `attr-floor`, `write-ladder`,
// `schema-build`, the SSR suite — is untouched. `apps/exodra/exodra.md` carries the arithmetic.
const AXES = {
    'initial-render': ['./src/benchmarks/axes/app/initial-render.tsx', 'benchmarkInitialRender'],
    'exodra-initial-render': [
        './src/benchmarks/axes/app/exodra-initial-render.tsx',
        'benchmarkExodraInitialRender',
    ],
    // STILL CLICK-FIRED, AND IT IS NOW THE ONLY APP AXIS THAT IS. `app-update` below stopped
    // dispatching events; this one still builds a real `MouseEvent` per button, which is ~61% of
    // every number it prints (the owner's profile, quoted in `app-update.tsx`'s header). It is also
    // where `marko`'s update number now lives, because that participant cannot be advanced any other
    // way. DO NOT PASTE A ROW FROM HERE BESIDE A ROW FROM `app-update`: they measure different jobs.
    'exodra-app-update': ['./src/benchmarks/axes/app/exodra-app-update.tsx', 'benchmarkExodraAppUpdate'],
    // THE FIELD TABLE, AND IT NO LONGER DISPATCHES EVENTS — read this before comparing it with any
    // recording taken before that change, because EVERY `.gate/app-update.*.json` and
    // `measurements/app-update.*.json` on disk measures a DIFFERENT JOB.
    //
    // A round is now each card's own `.tog` handler called directly, then each card's own `.addtag`
    // handler, then the participant's own commit — no `MouseEvent`, no `dispatchEvent`, no
    // `querySelectorAll`. The reason is in the axis's header with the profile that motivated it:
    // ~61% of what this axis used to print was the browser delivering events, which is identical
    // work for every participant and can therefore rank nobody, while setting the scatter that
    // became the axis's resolution floor.
    //
    // WHAT IT THEREFORE DOES NOT MEASURE, and nothing else in this suite does either: how a
    // framework ATTACHES OR DELEGATES its handlers. Solid and Marko install document-level
    // listeners, `mikado` here runs one delegated listener that climbs from `e.target`, the rest
    // attach per node. That cost is paid at the mount and in the bubble walk, and it is unmeasured.
    //
    // `marko` IS NOT IN ITS FIELD ANY MORE. A mounted Marko template's whole outside surface is
    // `update(input)` / `destroy()` / `value` — `MkToggle.marko`'s header established that for the
    // `toggle` axis long before this change — so a card's `<let/open>` cannot be reached without a
    // real event. It stays on `exodra-app-update` above.
    //
    // THE THIRD POSITIONAL IS ROUNDS PER TIMED REGION, NOT `abBench`'s SCENARIO BATCH, which this
    // axis pins at 1 so one app stands at a time and every round after the first updates an app
    // that is already warm. Its own default is 40 (ten whole 1→2→3→4→1 tag cycles; the arithmetic
    // is in the axis's `DEFAULT_BATCH`). The trap is the one `list-update` documents below: this
    // file defaults the third positional to 1 for every axis, so `app-update 100` — rounds given,
    // region omitted — hands the axis ONE round per region and puts it back on the clock's clamp.
    // Give both, or give neither:
    //
    //   npm run axis --workspace=@exodra/benchmarks -- app-update            # 100 rounds, region 40
    //   npm run axis --workspace=@exodra/benchmarks -- app-update 100 40     # the same, explicit
    //
    // A run that lands on the clamp anyway is refused by name and told the region that would clear
    // it. A region that is not a multiple of four is rounded UP and says so, because the tag cycle
    // has period four and a region that ends mid-cycle weights the cheap transitions differently.
    'app-update': ['./src/benchmarks/axes/app/app-update.tsx', 'benchmarkAppUpdate'],
    'react-libraries': ['./src/benchmarks/axes/app/react-libraries.ts', 'benchmarkReactLibraries'],
    // IT HAS ITS OWN BATCH DEFAULT AND THE POSITIONAL BELOW WILL OVERRIDE IT WITH 1 — READ THIS
    // BEFORE RUNNING IT. Chromium clamps `performance.now()` to ~0.1 ms and this axis's two fastest
    // rows land ON that clamp: `.gate/list-update.latest.json` records `exodraOps` and `mikado` at
    // `min 0.000 · median 0.100 · max 0.200`, which is zero, one and two TICKS, and the axis went on
    // to print `exodra: 17.0× slower than exodraOps` — a ratio whose denominator is one tick. So
    // `benchmarkListReconcile`'s own `batch` defaults to 32 (its `DEFAULT_BATCH` carries the
    // arithmetic), and the axis now observes the clock, prints the quantum in the phrasing this file
    // scrapes, and REFUSES its own table by name when the fastest row is under ten quanta.
    //
    // The trap is the argument order: `batch` is the THIRD positional and defaults to 1 here for
    // every axis, so `list-update 100` — rounds given, batch omitted — hands the axis a 1 and puts
    // it straight back on the clamp. Give both, or give neither:
    //
    //   npm run axis --workspace=@exodra/benchmarks -- list-update              # 100 rounds, batch 32
    //   npm run axis --workspace=@exodra/benchmarks -- list-update 100 32       # the same, explicit
    //   npm run axis --workspace=@exodra/benchmarks -- list-update 40 32        # coarser null, quicker
    //
    // A run that lands on the clamp anyway is not silent: the refusal prints the exact batch that
    // would clear it and is collected into the recording's `refusals`. THE BATCH COSTS TIME: 32
    // scenarios are mounted and torn down per sample as well as measured, so the axis runs roughly
    // 32× longer than the batch-1 runs its older recordings were taken at.
    'list-update': ['./src/benchmarks/axes/list/list-reconcile.tsx', 'benchmarkListReconcile'],
    reconcile: ['./src/benchmarks/axes/list/reconcile.tsx', 'benchmarkReconcile'],
    // TWO AXES OUT OF ONE FILE, and deliberately so: they run the same nine participants and
    // differ only in what the replaced array contains, so a second copy of the participants
    // would be a second place for the gates to soften by accident. `refetch` re-delivers the
    // SAME ids as fresh objects (an extracted key still matches, item identity does not);
    // `pagination` delivers DIFFERENT ids (nothing but a positional strategy keeps its nodes).
    refetch: ['./src/benchmarks/axes/list/list-replace.tsx', 'benchmarkRefetch'],
    pagination: ['./src/benchmarks/axes/list/list-replace.tsx', 'benchmarkPagination'],
    // FIVE TABLES FROM ONE AXIS — 1, 5, 25, 100 and 500 changed rows of 500 — measuring where
    // re-writing every position stops being dearer than diffing to find which ones moved.
    rewire: ['./src/benchmarks/axes/list/list-replace.tsx', 'benchmarkRewire'],
    'reactive-update': ['./src/benchmarks/axes/list/reactive-update.tsx', 'benchmarkReactiveUpdate'],
    toggle: ['./src/benchmarks/axes/list/toggle.tsx', 'benchmarkToggle'],
    'virtual-list': ['./src/benchmarks/axes/list/virtual-list.tsx', 'benchmarkVirtualList'],
    'component-split': ['./src/benchmarks/axes/app/component-split.tsx', 'benchmarkComponentSplit'],
    'clone-threshold': ['./src/benchmarks/axes/phases/clone-threshold.tsx', 'benchmarkCloneThreshold'],
    // `props-vs-ports` STOOD HERE AND WAS STRUCK. It priced one renderer's two ways for a parent to
    // fill a nested child — a props object (what ships) against writing into the child's ports
    // through an `openOne`/`closeOne` mechanism that lived in the axis file and nowhere else. It is
    // not registered any more because it could not be repaired honestly: both participants were
    // Exodra with no native floor, it reported ms/mount with 4000 port fills buried inside 1000
    // clones and 3000 inserts (so one grid step of 0.100 ms is 25 ns per fill), and two full series
    // failed to resolve a difference with the sign of the only moving column flipping between them.
    // When the per-instance context moved off the pooled connector onto the instance's own record,
    // every way of rebuilding the ports side out of what `@exodra/dom` exports gave that side — and
    // only that side — an instance record the props side does not have, at the exact field the
    // connector's hottest polymorphic load reads. A confound larger than the effect, inside an axis
    // that already resolved nothing.
    //
    // WHAT THE STRIKE DOES NOT DELETE is the reason the form was refused, which was read out of the
    // code and never out of the numbers: a parent that throws between the open and the close never
    // runs the close, and the form could never have extended to `list`, where 500 rows filled that
    // way would each hold for the life of the plan what one open holds. It is written out in full
    // beside the call it argues about — `TExoDomNode.one` points at `packages/dom/README.md`,
    // section "`one`: props against ports", which is where the argument lives.
    // Not a framework comparison either: ONE renderer's mount split into its phases — the clone,
    // the per-instance walk replay, the insertions, and the wiring call with its plumbing — on the
    // same 80-card app the mount axis measures. It exists to answer one question with a number
    // (what share of a mount is the walk?) before a design that would remove part of the walk is
    // proposed. It reports ms per mount for every phase, so its `mount` row should read like the
    // `exodra` row of `exodra-initial-render`; the second argument (`batch`) is ignored, because
    // each phase carries its own repetition factor. Read its header before reading its numbers.
    'mount-phases': ['./src/benchmarks/axes/phases/mount-phases.ts', 'benchmarkMountPhases'],
    // Not a framework comparison either, and the narrowest question in this map: what does it cost
    // to ASSOCIATE DATA WITH A DOM ELEMENT — one symbol expando against one `WeakMap` entry, on the
    // write, on the read, and on a climb that mostly misses?
    // `update-floor`'s shuffled recording prices a per-child record and its store TOGETHER at
    // 16.4062 µs of a 64.0625 µs gap and says in its own header that it cannot separate them —
    // there is no reconcile in which the record exists and the store does not. This axis is the
    // program in which they can differ: seven
    // ladder rungs over the 80-card app's clone census, identical except for how many stores land on
    // each fresh clone, plus a WeakMap twin of every rung and four isolated read phases (a bare read
    // and a climb reading the association per ancestor, each through the slot and through a table
    // holding the same entries — that climb WAS `exoContextAt`'s loop verbatim, and is now
    // synthetic, because the DOM context walk was removed; see the file's own note). It measures the
    // FIRST store — every element it writes to was cloned inside the same
    // timed region — and isolates the hidden-class transition by storing TWICE rather than by
    // deleting, because a `delete` puts the object in dictionary mode permanently and would price a
    // degraded element a fresh clone never is. It contains no `delete` anywhere. Nothing is timed
    // until a real mount has been counted for how many component roots it builds and of which kinds
    // (the replica is refused if the app spec's arithmetic does not reproduce the count), and until
    // every store has been read back by identity.
    //
    // THE KEY IS A FOSSIL AND IS KEPT ON PURPOSE. This axis was written to price `@exodra/dom`'s
    // own `EXO_CHILD` mark — a symbol on every built element pointing back at its child — and that
    // mark was REMOVED. Every mark-specific participant and printed line
    // went with it; what stayed is the general storage question, which was never about that symbol.
    // The name stays because `measurements/child-mark.pool.json` carries `"axis": "child-mark"` as
    // its key, and all fifteen of its rows are surviving rows —
    // renaming would orphan a recording nothing can re-derive. It observes the clock it was actually granted and refuses any row by name
    // whose region landed under three ticks. Its second argument (`batch`) is ignored, as
    // `mount-phases`' is: every phase carries its own repetition factor, because the isolated reads
    // need three orders of magnitude more of them than the ladder. RAISING `rounds` DOES NOTHING TO
    // ITS LADDER AND THE AXIS NOW SAYS SO ITSELF: run at 100 and at 400, the ladder's regions clear
    // twenty ticks while the DIFFERENCES between them land under one unit of the `quantum / reps`
    // grid, and the median of quantised samples stays quantised. So the ladder is read as a
    // DENOMINATOR and an upper bound only — every figure it derives is printed in grid units beside
    // its milliseconds, and one under a unit prints "BOUND" rather than a nanosecond count — and the
    // numerator comes from a POOL family that takes the clone out of the timed region entirely:
    // a large pool of component-root clones and its records are built untimed, and the region is one
    // storage operation per entry, slot against WeakMap, first store against repeat. The pool's SIZE
    // is its knob (`POOL_ELEMENT_BUDGET` in the file), because size grows the measured quantity
    // where rounds only sample it again. Its refusals name which of the two failure modes fired —
    // "the region is too short" (a factor helps) or "the difference is too small for the grid"
    // (nothing that collects more samples helps) — and it prints its standing element count, because
    // the pool is the only part of this axis that costs real memory. It also settles one figure
    // outright: the "16% of an initial mount / 2.4–2.8× faster" claim that used to be quoted for
    // this trade was measured for a schema→record table and never for an element-keyed one, and it
    // is withdrawn. Read this axis's header before reading its ANSWER line.
    'child-mark': ['./src/benchmarks/axes/phases/child-mark.ts', 'benchmarkChildMark'],
    // Not a framework comparison either, and the only axis here that measures a feature NOTHING
    // ELSE IN THIS MAP HAS EVER RUN: `provide` / `inject`. Twenty-one axes were registered above it
    // and not one of them calls `provideExoContext` or `readExoContext` through a component, so the
    // context system was the one shipped part of `@exodra/dom` with no measurement of any kind
    // behind it.
    //
    // IT USED TO HAVE FOUR GROUPS AND NOW HAS TWO, and the two that went are the ones it was
    // mostly about. `@exodra/dom` carried a SECOND channel for a context — a provider's frame
    // stored on its element, and `exoContextAt` climbing `parentNode` from a mount's parent to find
    // it, so a widget mounted by a separate `render` call inherited the surrounding page's context.
    // Both were REMOVED. GONE: group A, THE CLIMB (`climb·dN` / `local·dN` / `parent·dN` and its
    // twin, at three measured depths, with the empty-page gate and the depth-monotonicity refusal)
    // — there is no upward walk left to put a floor under. GONE: group D, THE SEAM (`mount·inherit`
    // / `mount·bare` / its twin, and the gate that proved cross-mount inheritance worked at all) —
    // the capability it timed does not exist, so the two arms no longer differ and the gate would
    // fail by design. SHRUNK: group B lost `provide·marked` and `provide·nomark`, whose difference
    // was the record `exoDomChildMaker` built to hold a frame; `provideExoContext` no longer
    // touches an element, so the two rows would be one program under two names.
    //
    // WHAT IS LEFT: (B) `push`, one cons cell, which is now the WHOLE provider path rather than its
    // floor; and (C) INJECT DEPTH — a key 1, 2 and 8 links up a real chain plus a miss that walks
    // all eight, so the chain walk has a SHAPE (a per-link slope and an intercept) rather than a
    // number, against an independently built twin chain whose true difference is ZERO.
    //
    // IT NO LONGER CARRIES A FLOOR PARTICIPANT OF ANY KIND, and its ANSWER line says so: groups A
    // and D were the two that had one, and both floors bounded operations that no longer happen.
    // What it publishes now is what two functions cost, not what they are worth.
    //
    // IT PRINTS A CENSUS BEFORE ANY TIMING — provide count and frame chain lengths, COUNTED off the
    // structures it built — and gates the chain (every key at its own position, the miss token
    // undefined) and the shipped `provideExoContext` (its frame reads back, and links BELOW what it
    // was handed). Its rows are NANOSECONDS per operation and its null block is MICROSECONDS; both
    // units are in the output because a resolution read at the wrong unit is 1000× wrong in the
    // direction that flatters. It observes its own clock quantum and refuses by name any row whose
    // region landed under three ticks, and refuses the per-link slope when `inject·8` and
    // `inject·1` are closer than the run resolved.
    //
    // It honours the batch as `teardown-phases` does. RUN IT ALONE — one axis at a time, as every
    // diagnostic here requires.
    'context-cost': ['./src/benchmarks/axes/phases/context-cost.ts', 'benchmarkContextCost'],
    // Not a framework comparison either, and the counterpart of `mount-phases` for the other
    // direction: ONE renderer's TEARDOWN split into its phases, on the 200-panel block the `toggle`
    // axis hides 20 times per sample. It exists because the schema core is 26% ahead of Solid on the
    // mount and 11% behind it on the toggle, and a toggle is the one axis that tears anything down —
    // so the loss lives in a half nothing here measured. It splits a hide into the notification, the
    // DOM clear, the per-child `unmount` and, inside that, the registry eviction and the ending of
    // subscriptions; each of the last three is printed TWICE, once by ladder subtraction and once
    // measured alone, because a ladder attributes all of its error to the last rung. Three gates run
    // before any timing: the port provably OWNS its element (so the hide takes `clearOwnedRegion` and
    // not the per-child path), the two wirings it subtracts build byte-identical markup, and every
    // rung provably leaves 0 panels, 0 registry entries and 0 live subscriptions behind — the last
    // proved by writing to all 200 sources afterwards and requiring that no panel answered.
    // UNLIKE `mount-phases`, IT HONOURS THE BATCH: the third positional
    // multiplies every phase's repetition factor, which is what the run's own refusal line asks for
    // by name when a timed region lands under three ticks of the clock it observed.
    'teardown-phases': ['./src/benchmarks/axes/phases/teardown-phases.tsx', 'benchmarkTeardownPhases'],
    // Not a framework comparison either, and the narrowest diagnostic here: it measured ONE LINE of
    // `@exodra/dom` — A LINE THAT HAS SINCE BEEN REMOVED, WHICH IS WHAT IT MEASURED IT FOR.
    // The compiler used to end with `document.importNode` unless the markup had adopting steps, so
    // nearly every prototype was moved out of the inert template-contents owner document into the
    // page's; it now reads `const instanceProto = proto` (`compile-exo-dom-plan.ts:617`) and the
    // predicate file (`has-adopting-steps.ts`, cited all over this suite) HAS BEEN DELETED.
    // That was a TRADE — it bought the DOM's "adopt into the parent's node document" walk never
    // running on any insertion, and it cost whatever cloning a page-owned prototype costs over
    // cloning a template-owned one. Only the cited half ever had a number (380→240 ns per
    // insertion, from a file that said outright that nothing in this repository reproduced it),
    // and the run that put both halves together was recorded by an axis that has since been
    // deleted with the backend it compared against — so THIS axis is now the only instrument for
    // the question.
    //
    // THE AXIS IS KEPT BECAUSE IT IS THE INSTRUMENT, not because the question is open: it parses and
    // imports its own prototypes and never touches `@exodra/dom`, so it still runs and is what a
    // future ownership question gets measured with. It has never been recorded — there is no
    // `import-node-trade.*.json` — so three of its four falsifiers are unjudgeable from disk. Read
    // its header's verdict block before quoting anything from it.
    //
    // WHY IT SWEEPS RATHER THAN MEASURING THE APP: pricing the trade on the 80-card app's OWN
    // subtree sizes — APP 1 node, CARD 8, DETAILS 2, TAG 2, and TAG is 200 of the 321 — prices it
    // at ~3.5 nodes per instance and at that one shape only. The saving is an adoption walk of the
    // WHOLE inserted subtree, so it must grow with node count; the penalty may or may not grow
    // with it. The question is therefore not "is the trade wrong" but WHERE IS THE CROSSOVER, and
    // that needs a sweep an app cannot provide.
    //
    // So this file sweeps SYNTHETIC prototypes of 1, 2, 4, 8, 16, 32 and 64 nodes, four cells at
    // every size (clone page-owned, clone template-owned, insert page-owned, insert template-owned,
    // the last two into a container appended to the LIVE document because adoption is triggered by
    // the parent's node document differing from the child's). It prints penalty, saving and net as
    // ns PER INSTANCE and per NODE, and names the crossover size or states there is none in range.
    // A second shape (a nested chain against the flat fan) is swept at three of the sizes, because
    // the adoption walk visits every node either way but cloning a chain and cloning a fan may not
    // cost the same.
    //
    // ITS CONTROL IS A NULL WITH A KNOWN TRUE VALUE OF ZERO: at every flat rung a SECOND page-owned
    // prototype, parsed and imported independently from the same markup, is cloned and inserted in
    // its own two phases. The larger of those two differences is that size's resolution floor, and
    // every net is printed against it and refused by name when it lands under it. The trees on the
    // two sides of each 2x2 are CHECKED identical (markup, node count, owner document) and the run
    // throws before timing anything if they are not.
    //
    // IT COMMITS A FALSIFIABLE PREDICTION IN ITS HEADER, written before the first run, and prints
    // all four of its falsifiers mechanically at the end so that none of them can be chosen
    // afterwards. It honours the third positional as `teardown-phases` does. Read the header before
    // the numbers — especially caveats (C) and (D), which say why a real component's trade is worse
    // than this ladder's: the shapes are elements only and carry one attribute each.
    'import-node-trade': ['./src/benchmarks/axes/phases/import-node-trade.ts', 'benchmarkImportNodeTrade'],
    'clone-vs-create': ['./src/benchmarks/axes/phases/clone-vs-create.ts', 'benchmarkCloneVsCreate'],
    // Not a framework comparison either, and the only diagnostic here that measures something
    // NOBODY SHIPS: a straight-line program, with no abstraction of any kind, that produces the
    // 80-card app's exact DOM. No components, no schema, no reactivity, no plan, no connector, no
    // library — four prototypes parsed at module load and then clones, property-access walks, fills
    // and insertions written out by hand.
    //
    // WHY IT EXISTS. "Is our performance optimal" cannot be proved: optimal is a claim about a
    // whole solution space nobody enumerated, and this repository already has measured-but-unrealised
    // wins that disprove it. A BOUND can be proved. Mounting N elements cannot cost less than
    // creating them and putting them in the document, and that work belongs to the browser. So the
    // distance from `@exodra/dom` to this program is THE ENTIRE REMAINING HEADROOM FOR ANY FRAMEWORK
    // WHATSOEVER, and the axis prints it as the sentence it supports: "no framework can be more than
    // X% faster than @exodra/dom at mounting this app, because X% is all that is left above the
    // floor."
    //
    // THREE STRATEGIES, BECAUSE "WHAT IS THE FLOOR ALLOWED TO DO" HAS NO OBVIOUS ANSWER and one
    // chosen by argument would be one chosen to flatter. `innerHTML` on a precomputed string is the
    // cheapest way to produce this DOM and is NOT a fair floor — the tree it makes has no addressable
    // node, so nothing in it could ever be updated — and the row is labelled as bounding the DOM
    // WORK rather than the job. `cloneNode` + walk + fill is the honest floor: same tree, ports still
    // addressable. `createElement` per node is neither, and is a row because "cloning is cheaper than
    // creating" has been assumed here without a number beside it.
    //
    // AND EACH ADDRESSABLE STRATEGY IS BUILT TWICE, WITH AND WITHOUT RETAINED REFERENCES, because
    // that single question is most of the difference between a fair floor and a rigged one: a program
    // that fills a port and lets the local die has produced the right bytes and produced nothing a
    // framework could use. The floor the ANSWER quotes is the cheapest program that is addressable
    // AND retaining.
    //
    // ITS CONTROL IS A NULL WHOSE TRUE VALUE IS ZERO: `clone` is declared TWICE, as two separate
    // functions over two independently parsed prototype sets, and |clone − clone·twin| is the
    // resolution floor every attribution is printed against and refused under. Nothing is timed until
    // every program has been proved to build the reference app's markup BYTE FOR BYTE through the
    // shared `markupOf` gate, and the run throws if any of them differs — without that gate it would
    // be timing two different programs.
    //
    // IT COMMITS A FALSIFIABLE PREDICTION IN ITS HEADER, written before the first run, and prints all
    // five falsifiers mechanically at the end so none can be chosen afterwards. It honours the third
    // positional as `teardown-phases` does. READ THE HEADER'S "WHAT THIS NUMBER DOES NOT BOUND"
    // BEFORE QUOTING ANYTHING FROM IT: it says nothing about updates (a program with no reactivity
    // does not update, it rebuilds), nothing about teardown, nothing about memory, nothing about
    // hydration, and nothing about any shape but this app's.
    'mount-floor': ['./src/benchmarks/axes/floors/mount-floor.ts', 'benchmarkMountFloor'],
    // `mount-floor`'s sibling, for the other half of a renderer's life. That axis bounds MOUNTING
    // and forbids itself from being quoted about updates, because a program with no reactivity does
    // not update — it rebuilds — so "the same program without the framework" does not exist here.
    //
    // WHAT DOES EXIST IS A FLOOR FOR A SPECIFIC TRANSITION: fix a before-state and an after-state
    // and there is a minimum set of DOM operations that takes one to the other. This axis writes
    // that program for five transitions taken from the axes this suite already publishes — one text
    // value on one row of a thousand (`reactive-update`), all thousand, a 200-row shuffle
    // (`reconcile`), a 300-row list gaining and losing rows (`list-update`), and the 80-card app's
    // whole flip (`app-update`) — and measures each against `@exodra/dom` performing the same
    // transition through its reactive machinery, in the same session, interleaved.
    //
    // THE GAP HAS A PRECISE MEANING AND THE HEADER STATES IT IN THESE TERMS: the floor is handed
    // the diff for free, and the framework has to DISCOVER what changed and keep, since the mount,
    // the bookkeeping that makes discovery possible. That discovery IS the framework's job, so the
    // gap is the price of not having to write the update by hand — the product, priced, not a
    // defect. Every comparison is therefore labelled with a CONTRACT (`told` vs `derive`) and every
    // headline pairs rows that were given the same information; the cross-contract ratio is printed
    // beside it as the wider, weaker, safer bound.
    //
    // TWO REORDER FLOORS, BECAUSE THE QUESTION HAS TWO DEFENSIBLE ANSWERS: `floor·told` is handed
    // the minimum move set (computed at module load) and `floor·diff` is handed only the new array
    // and computes it inside the timed region, with the SAME moves at the end. The difference
    // between them is the price of discovery, measured on identical DOM work.
    //
    // THE ASYMMETRY THAT CANNOT BE REMOVED — the framework also runs the subscription that told it
    // to update — is measured rather than argued about: two transitions carry a `floor·bound` row,
    // the identical floor program subscribed to the identical source and fired by the
    // identical `setValue`, so the dispatch can be priced and the ratio recomputed without it.
    //
    // NOTHING IS TIMED until every program has been STEPPED beside the renderer one transition at a
    // time with the markup diffed after every step — three of these transitions are cycles that
    // return to their starting DOM, so an end-state check would pass a program that did nothing.
    // The `wide` transition is gated twice, because its renderer row is a re-declaration of the card
    // with its state hoisted (the real card's bindables live inside its wire, so driving it means
    // 160 dispatched clicks, which `participants/floor/app.ts` measured at 42% of a round): the
    // hoisted app is mounted beside the real `mountExodraApp` and both are flipped four times.
    //
    // It commits a falsifiable prediction in its header — one that DISAGREES on purpose with the
    // "DOM write is ~86% of the update path" prior, for the text transitions only and with the
    // mechanism named — and prints all seven falsifiers mechanically at the end. It honours the
    // third positional as `teardown-phases` does. Its numbers are MICROSECONDS PER TRANSITION and
    // they are NOT `app-update`'s: four of the five transitions are fired by writing to a source,
    // with no click harness in the region at all.
    'update-floor': ['./src/benchmarks/axes/floors/update-floor.ts', 'benchmarkUpdateFloor'],
    // The third of the floor family, and the only one that is not a floor: it compares TWO REAL
    // PATHS THROUGH ONE RENDERER rather than a renderer against a program with no framework in it.
    // The question: is "serve the markup, then hydrate" cheaper than "clone and build on the
    // client", for a big list? `packages/benchmarks/ssr/` does not answer it: that is
    // Exodra against Solid and Qwik in wall-clock through a throttled network, and this is one
    // renderer doing one job two ways with the network, the bundle and the field removed.
    //
    // IT PRINTS TWO ANSWERS AND NEITHER MAY BE QUOTED AS THE OTHER, which is the whole design.
    // QUESTION 1 is CPU TOTAL — `parse+hydrate` against `mount`, both fully inside the timed
    // region — and it says which path does less work. QUESTION 2 is what is left AFTER the
    // document is already parsed — `hydrate` alone against `mount`, with the parse moved into the
    // untimed prep — and it models a real page load, where the markup arrived and was parsed
    // before the script ran. The second charges hydration nothing for the parse; that is realistic
    // rather than generous ONLY because a real browser did that parse off the framework's clock,
    // and the parse is still real CPU on the user's.
    //
    // THE STARTING POINT IS ALREADY MEASURED AND IT IS NOT WHAT PEOPLE ASSUME. `mount-floor` timed
    // all five parser doors on this app's 641 elements against cloning them: `innerHTML` 0.2763 ms
    // against `clone+refs` 0.2288 ms, the family spread 0.0075. THE PARSE IS 21% DEARER THAN THE
    // CLONE. So whatever hydration wins here, it does not win by parsing being cheap.
    //
    // THREE CENSUSES, because the question says "big list": the 80-card APP (641 elements — the
    // tree `mount-floor` measured, and the NESTED adoption path a real page has), the same 80
    // cards as flat CARD rows (640 elements), and 640 CARD rows (5120 elements, exactly 8× in
    // every count, because the app's spec is periodic with period 4). The interesting quantity is
    // whether the RANKING CHANGES with size, and the run prints ns-per-element for every row at
    // every size so that a term which is not per-instance is visible rather than inferred.
    //
    // ITS GATE IS SHARPER THAN ANY OTHER IN THIS SUITE and it is four checks, all throwing, before
    // one number is timed: the served bytes are byte-identical to a client mount; the post-
    // hydration DOM is byte-identical to both; hydration adopted the served nodes BY IDENTITY
    // (every element captured in document order before the call and compared object-by-object
    // after it — a hydration that rebuilt the tree and emitted identical bytes passes every string
    // compare and fails this); and A PORT IS LIVE, proved by a real bubbling click that toggles a
    // region inside the served card and a second that restores the tree byte for byte. Without the
    // last two, a hydration that adopted nothing would be the fastest row in the table.
    //
    // ITS NULL IS WEAKER THAN `mount-floor`'s AND SAYS SO. Every program here is a call into a
    // published package, so the twins are separately declared wrappers over the same entry point
    // (own container, own independently produced copy of the served string) rather than two
    // independently declared programs — they share the library's inline caches, which makes this
    // run's resolution floor a LOWER BOUND on the true one. One null per family per census, three
    // censuses, reported as bias AND paired noise at six decimals and as a percentage of the thing
    // being measured.
    //
    // It commits a falsifiable prediction in its header — the owner's, and mine, which agrees on
    // both directions and disagrees on both sizes and adds a claim about scale-invariance — and
    // prints every falsifier mechanically at the end. It honours the third positional as
    // `teardown-phases` does. READ THE HEADER'S "WHAT THIS AXIS DOES NOT ANSWER": it says nothing
    // about page load or any wall-clock quantity, nothing about updates, nothing about teardown,
    // nothing about memory, and it is this app's shape only.
    'hydrate-floor': ['./src/benchmarks/axes/floors/hydrate-floor.ts', 'benchmarkHydrateFloor'],
    // The fourth of the floor family, and the only one on the SERVER side: `@exodra/string`
    // rendering 1000 rows of one 5-port component, against a hand-written program that produces
    // the same 140 kB of markup with no framework in it at all.
    //
    // ITS FLOOR IS CLEANER THAN `mount-floor`'s, and the header says why in one line. That axis had
    // to argue about ADDRESSABILITY — a DOM with no reachable nodes is not something a renderer
    // could ship, so it prints two floors and a section on which may be quoted for what. A server
    // render has no such requirement: THE STRING IS THE WHOLE PRODUCT. Nothing has to stay
    // reachable, nothing will be updated, nothing will be torn down. So there is ONE floor here,
    // and the only thing it may not skip is ESCAPING — a renderer that prints a value into a text
    // position unescaped is not faster, it is an injection.
    //
    // AND ESCAPING IS MOST OF THAT FLOOR: 0.063 ms of 0.077, 82%, measured by the owner on
    // byte-identical output. The row that skips it is in the table as a bound on the concatenation
    // work alone and is labelled as one everywhere it appears.
    //
    // WHAT IT EXISTS TO SPLIT is the 0.134 ms between that floor and `@exodra/string` with a
    // stateless wire. The obvious probe — call `plan.fillMarkup` directly — HAS ALREADY BEEN TRIED
    // AND THE SEAM IS NOT THERE: the fill takes values the node has already written, so the
    // escaping and the writer indirection live inside `TExoStrNode.set`, and the attempt
    // produced different markup. So this axis is a LADDER of fourteen whole programs, each
    // producing all 1000 rows, consecutive rungs differing by ONE mechanism — the event port's
    // empty slot, the value array, the attribute head moving into the writer, the writer table, the
    // shipped `fillMarkup`, the reset, the shipped `set`, the wire call, the context frame, the
    // `try/finally`, the connector stack, and `renderExoStrInstance` — and the price of a mechanism is
    // the difference between the two rungs that bracket it. Every rung above `+set` is the
    // package's own code reached through a public entry point.
    //
    // IT COMMITS TEN FALSIFIABLE PREDICTIONS in its header, including two PREDICTIONS OF ZERO (the
    // context frame and the `try/finally`, both adopted on the argument that they are free), and
    // prints every verdict mechanically at the end. `+call` against `exodra·flat` is a CONTROL that
    // should be zero — one plan lookup separates them — and when it is not, the run refuses the
    // whole ladder by name.
    //
    // TWO THINGS IN IT THAT NO OTHER AXIS HERE HAS. Every timed region FLATTENS its result inside
    // the region, because `+=` hands back a rope and a run that never read the string would charge
    // `+=` nothing for a copy `Array.join` pays eagerly — which would rig the `+=`-vs-join rung
    // this repository has now asserted three times without a number in the file. And there is a
    // SECOND TWO-ROW CENSUS on data that actually needs escaping, because the main census's data is
    // escape-free by necessity (an unescaped row can only be gated byte-for-byte when escaping is a
    // no-op) and "escaping is 82%" is therefore a statement about the escaper's FAST path.
    //
    // READ CAVEAT (1) BEFORE QUOTING THE GAP: `@exodra/string` is not in `optimizeDeps.exclude`
    // where `@exodra/core` and `@exodra/dom` are, so Vite pre-bundles it
    // while the hand-written rungs go through the dev server's esbuild. That asymmetry favours the
    // library rows, which makes the reported gap a LOWER bound. It honours the third positional as
    // `teardown-phases` does; batch 1 is the one to run.
    'ssr-floor': ['./src/benchmarks/axes/floors/ssr-floor.ts', 'benchmarkSsrFloor'],
    // The fifth of the floor family, and the direction the other four forbid themselves from
    // answering: `mount-floor` ends its header with "IT SAYS NOTHING ABOUT TEARDOWN" and
    // `update-floor` and `hydrate-floor` say the same. This is that half, on the same 80-card app.
    //
    // IT IS NOT `teardown-phases`. That axis splits ONE renderer's teardown into its own internals
    // on the 200-panel block `toggle` hides, and every rung of it is a hand-written replica of
    // `@exodra/dom`'s code. This one measures the renderer against programs with no framework in
    // them at all and asks what the cheapest possible teardown of this app costs.
    //
    // READING THE CODE CHANGED THE QUESTION BEFORE A LINE WAS TIMED, and the header says so at
    // length: `mountExodraApp(c).teardown` DOES NO DOM WORK AT ALL. It is `exoTeardownScope`'s
    // closure running the render's 320 disposers; the list disposer it calls unmounts children and
    // `DISPOSE_SELF` explicitly does not touch the element; the one function that empties a region
    // (`clearOwnedRegion`) is reachable only from the children reconciler's UPDATE branch. So "the
    // renderer versus `textContent = ''`" is a comparison of two programs that share no part of
    // the job, and every row here therefore carries TWO CONTRACTS — what it promises about the
    // DOCUMENT (`detach` / `drop` / `none`) and what it promises about the renderer's own STATE
    // (`full` / `unsub` / `none`) — with headlines paired only inside a contract, `update-floor`'s
    // rule. The claim is CHECKED IN A THROWING GATE, not asserted: markup byte-identical across
    // `teardown()`, and a real bubbling click on all 80 toggles afterwards that must move nothing
    // where the same click on a live app moves the markup and a second click restores it.
    //
    // IT PRINTS TWO TABLES AND SAYS WHICH MAY BE QUOTED FOR WHAT, which is the part it exists for.
    // A teardown's cost is partly DEFERRED — Blink defers the detached subtree's destruction, and
    // the runner's forced GC before every region means the garbage a region makes is collected
    // OUTSIDE every timed region, by construction — so a stop-the-clock-at-dispose table measures
    // exactly the half that is cheap to make look good, and `book·drop` (ONE STORE, whole graph
    // unreachable) is in it as the proof. THE HONEST TABLE IS `CYCLE`: N complete
    // mount→teardown→drop cycles inside ONE region with no GC in it, so whatever V8 collects to
    // keep going is inside the measurement. It prints the JS heap delta across each cycle region
    // and REFUSES the table by name when the region is still RETAINING.
    //
    // ~~"...when the heap grew by a whole region's worth of garbage — which means no collection~~
    // ~~happened inside and the row has not yet done its job."~~ WITHDRAWN. That was the
    // region's whole heap growth DIVIDED BY THE CYCLE COUNT, and the growth does not scale with the
    // count: three runs at cycle factors 64 / 139 / 200 grew 10.80 / 12.68 / 10.08 MB — flat across
    // a 3.1× range of N — so the ratio fell as 1/N and the factor-200 run passed a check the
    // factor-64 run failed while holding MORE bytes. The refusal is a SLOPE now, `(H(N) − H(N/4)) /
    // (N − N/4)`, taken between two arms of ONE region so the fixed offset cancels and the knob
    // scales numerator and denominator together. See THE GC QUESTION in the axis's own header.
    //
    // ELEVEN FALSIFIERS committed in the header before the programs were written, two of them the
    // owner's own priors, all printed mechanically at the end.
    //
    // IT IS THE ONE AXIS WITH TWO REPETITION KNOBS, and the fourth positional above exists for it.
    // The THIRD positional is TABLE 1's and BATCH 2 IS THE ONE TO RUN FOR A REASON THAT IS MEMORY
    // AND NOT THE CLOCK: every repetition of a DOM row holds one separately mounted 641-element app
    // and all of them stand at once, so batch 2 is ~51,000 live elements — the set `mount-floor`
    // carries at its own recommended batch — and batch 8 will thrash. The FOURTH is TABLE 2's cycle
    // factor, multiplied on top of the batch and bounded by TIME alone, because a cycle builds and
    // drops its subject inside the timed span and a region of any length holds ONE app. That is why
    // this axis's heap refusal asks for the fourth number and says in as many words not to raise the
    // third: `teardown-floor 100 2 64` is one run that serves both tables.
    'teardown-floor': ['./src/benchmarks/axes/floors/teardown-floor.ts', 'benchmarkTeardownFloor'],
    // The sixth of the floor family, and the first axis in this map THAT LOADS `@exodra/forms` AT
    // ALL: a person typing into a box, priced against a program with no framework in it.
    //
    // THE UNIT IS ONE KEYSTROKE. `exodra` is `@exodra/forms` as it ships — one listener on the
    // `<form>`, `readExoControlValue(event.target)`, a transition writing the read-out, nothing
    // written back. `exodra·bindable` is the bindable shape beside it: per field a model written
    // into the field AND BACK on every keystroke (`el.value = next`), which is what makes a field
    // CONTROLLED and what this axis prices.
    //
    // THE SCENARIO IS DEFENDED IN THE HEADER AND THE ALTERNATIVES ARE NAMED: one field of a FIFTY-
    // field form, whose value FEEDS A DERIVED READ-OUT. The consumer is not decoration — without
    // it the floor's handler is an assignment to a local while the framework still pays a cell, a
    // notification and the write-back, and the ratio would be a measurement of the framework
    // against a program that does not do the job. The fifty fields change NOTHING per keystroke
    // (the path is O(1) in form size for every participant) and that is why they are there: they
    // make the keystroke table a control that says form size is not in the answer, while making
    // the MOUNT table — fifty listeners against one root listener — answerable at all.
    //
    // EIGHT PROGRAMS, EACH CONSECUTIVE PAIR DIFFERING BY ONE NAMEABLE THING. A `driver` row that
    // attaches NO handler and prices the instrument's own cost; TWO spellings of the floor
    // (fifty listeners, and one on the `<form>`), because "what is the floor allowed to do" has no
    // obvious answer and the run takes the cheaper and says which won; the floor's independently
    // declared TWIN as the null; `@exodra/forms` as it ships; the bindable shape; the DELEGATED
    // strategy over it (fifty subjects under `createExoDelegatedEvents(['input'])`, because the
    // delegated attacher refuses a closure by name); and the bindable shape minus the field's own
    // value BIND, `set` once at mount and then left to the browser.
    //
    // ITS GATE IS SHARPER THAN A MARKUP DIFF AND HAS TO BE: `value` on an `<input>` is written as
    // a DOM PROPERTY and a property does not serialise, so an `innerHTML` gate would pass a
    // program that never wrote the field — which is precisely one of the programs here. The
    // snapshot is markup PLUS every input's `.value` property PLUS every input's `value`
    // attribute PLUS the read-out's text, compared against `exodra` AFTER EVERY STEP of a
    // full cycle, because the cycle returns to an empty field and an end-state check would pass a
    // program that did nothing (`update-floor`'s lesson). `driver` is excluded by name and the run
    // says so.
    //
    // ITS LARGEST HAZARD IS A COMMON ADDEND AND IT IS A ROW, NOT A FOOTNOTE. The driver's own
    // value assignment, `InputEvent` construction and `dispatchEvent` sit inside every timed
    // region, so they inflate every row equally and DEFLATE every ratio; every headline is printed
    // raw and again with `driver` subtracted from both sides, and any row measuring BELOW the
    // driver is refused by name as a ladder that does not nest. It observes its own clock quantum
    // and refuses either table's regions under three ticks.
    //
    // READ "WHAT THIS AXIS DOES NOT ANSWER" BEFORE QUOTING IT. Every event it dispatches is
    // synthetic and `isTrusted: false`: it skips the browser's edit machinery, `beforeinput`,
    // composition and IME, caret and selection, autofill, everything after the handler returns
    // (style, layout, paint) and human typing rate. WHAT IT MEASURES IS THE JAVASCRIPT A PAGE RUNS
    // IN RESPONSE TO AN `input` EVENT AND THE DOM WRITES THAT JAVASCRIPT MAKES — not a keystroke's
    // wall-clock cost and not input latency. It honours the third positional as `teardown-phases`
    // does; batch 1 is the one to run, because a keystroke region is already 1080 dispatches.
    'keystroke-floor': ['./src/benchmarks/axes/floors/keystroke-floor.ts', 'benchmarkKeystrokeFloor'],
    // Not a framework comparison either, and the only axis here that measures a path taken BEFORE
    // any of the others begin: CONSTRUCTING A SCHEMA. Every axis above this line builds its schemas
    // at module level and starts its clock afterwards — there is no `createExoWiredMachine(` or `createExoSchema(`
    // inside a measured region anywhere in `mount-floor`, `update-floor`, `mount-phases` or
    // `apps/exodra/exodra.tsx` — so the one path every user pays for at load, once per component,
    // had never
    // been timed. `what-is-unmeasured.md` books it as `schema-build`, priority 1.
    //
    // IT MATTERS MORE NOW THAT a family of refusals has moved out of the shape a
    // production build deletes and into PROSE-STRIPPED / CHECK-KEPT, where `NODE_ENV` picks the
    // message text and the check itself always runs. READING THE CODE SHARPENED THAT AND THE AXIS
    // SAYS SO: in the CHECK-KEPT shape the guard sits inside the `throw`'s ternary, so a PASSING
    // schema never evaluates it. Six of the eight builder checks cost their PREDICATE and nothing
    // else — a regex test, a `toLowerCase`, one or two `Set.has` — and this axis therefore reads
    // the same in a development and a production build. The one guard that is in a CONDITION is
    // `createExoSchema`'s roots refusal, which production deletes outright, and it is inside rung 5's
    // step rather than in the answer.
    //
    // FIVE RUNGS over one shape, each adding one layer: `literal` (the object graph as nested
    // literals, no builder, no checks, no numbering), `+number` (the `numberPorts` walk),
    // `+builder` (a check-free replica of `ExoSchemaBuilder` — its body with the check calls
    // deleted and nothing else changed), `+checks` (the REAL builder, imported), `createExoSchema` (the
    // shipped function, whole). RUNG 4 MINUS RUNG 3 IS THE ANSWER. A sixth row, `checks·parts`,
    // prices the check bodies alone at the census's exact call counts as a SECOND, independent
    // estimate; when the two disagree by more than the measured resolution floor the run refuses
    // both by name and prints the two candidate explanations instead of picking one.
    //
    // IT SAYS IN ITS OWN HEADER THAT NO FLOOR IS DEFINABLE HERE, and does not claim one. A refusal
    // that passes produces NOTHING, so there is no cheaper program that does the same job the way
    // `mount-floor` has one — the closest thing is the same tree with the checks absent, which is
    // a counterfactual and not a bound. So `literal` is labelled the DESCRIPTION COST, `+builder`
    // the COUNTERFACTUAL, and every sentence is phrased as a difference between two builds.
    //
    // ITS UNIT IS NANOSECONDS PER `el()` AND MICROSECONDS PER SCHEMA-SET, NEVER A SHARE. This work
    // runs once per component for the life of the process, so a percentage of anything is the
    // wrong shape for it — the failure that made an earlier figure in this repository unquotable.
    // Table units are baked into the SECTION NAMES (`APP-US`, `PAGE-US`, `SPEC-US`) because the
    // recorder below captures a unit for a null block and not for a table.
    //
    // EVERY ROW IS THE WARM CASE AND THE HEADER SAYS SO: a loop has warm inline caches, a warm
    // regex and a warm `exoAttrWriteSpec` memo where a module load has none, so every figure is a
    // LOWER bound on what a real page pays. It prints a `FIRST REGION` block — each phase sampled
    // once before any warm-up, labelled a BLEND rather than a cold build, because a single cold
    // build is three orders of magnitude under this clock and cannot be timed at all — and it
    // measures the one cold path that IS measurable: `exoAttrWriteSpec` memoises per attribute
    // name, so `spec·cold` runs the same component with names never seen before and prices what a
    // first-ever build pays per distinct name.
    //
    // THREE CENSUSES, PRINTED BEFORE ANY TIMING AND COUNTED at the builder's own call sites rather
    // than written down — elements, attributes, ports by kind, static text runs, builder objects,
    // walk visits, and HOW MANY TIMES EACH CHECK IS CALLED, plus `exoAttrWriteSpec` calls, which
    // are not one per check. The names are printed too, because every refusal here is string work
    // and short names would flatter it. Four gates throw or refuse before anything is quoted: every
    // rung builds the schema `createExoSchema` builds (compared node by node, port indices included); the
    // counted census reconciles with the shape produced; every timed region clears three ticks of
    // the OBSERVED quantum or the row is refused by name; and the ladder must nest beyond a
    // resolution floor measured from two pairs whose true difference is zero by construction. It
    // honours the third positional as `teardown-phases` does; batch 1 is the one to run. RUN IT
    // ALONE — one axis at a time.
    // `schema-build`'s missing other half, and the first axis in this map THAT COMPARES OUR
    // TEMPLATE MACHINERY WITH ANYBODY ELSE'S. That axis times the construction of a SCHEMA and
    // says in its own header that it measures "nothing about PLAN COMPILATION, which is the other
    // once-per-component cost and is a different program in a different package"; `mount-phases`
    // starts AFTER the plan exists. So the two questions a template library
    // is actually judged on — what a written template costs to turn into a prepared form, and what
    // that prepared form costs to turn into one filled node — had never been asked of a field.
    //
    // ONE TREE AND TWO TABLES. The subject is a 32-element card with fifteen interpolation points
    // (twelve text, three attribute), four levels of nesting and a repeated region of six rows,
    // written four times in four spellings. TABLE 1 is COMPILE, in MICROSECONDS PER TEMPLATE,
    // because that work runs once per component for the life of a process and a share of anything
    // is the wrong shape for a fixed cost — the conversion that made an earlier figure in this
    // repository unquotable. TABLE 2 is BUILD, in NANOSECONDS PER NODE, once per instance. Both
    // units are baked into the SECTION NAMES (`COMPILE-US`, `BUILD-NS`) because the recorder below
    // captures a unit for a null block and not for a table.
    //
    // WHAT "COMPILE" MEANS FOR EACH PARTICIPANT WAS READ OFF ITS OWN SOURCE, not assumed.
    // `stage0`: the tagged template IS the compile — `h` parses the markup through a shared
    // `<template>` and runs `genPath`, a `TreeWalker` that strips every `#name` marker and records
    // a stride per reference. `mikado`: a REAL runtime compile, and three things —
    // `Mikado.compile()` parses and CODE-GENERATES the writer with `Function(...)`
    // (`src/compile.js:519`), `new Mikado(tpl, { root })` constructs the factory node, and the
    // first `create` builds the vpath. THE THIRD IS A NODE BUILD AS WELL, so mikado's compile row
    // contains one mikado build and the axis PRINTS THE SUBTRACTION rather than hiding it in a
    // warm-up. `exodra`: `createExoSchema(build)` then `exoDomPlanOf(schema, backend)`.
    //
    // `marko` IS IN NEITHER TABLE AND THE RUN SAYS SO BY NAME. Marko 6 compiles at BUILD TIME —
    // `vite.config.ts`'s `marko()` plugin hands every `.marko` file to `@marko/compiler` during the
    // transform — so there is no runtime compile to measure, and the axis refuses to fabricate one
    // rather than leaving a hole a reader would fill with a guess.
    //
    // IT CARRIES A NATIVE FLOOR, because an axis without one can rank participants and cannot say
    // what any of them is worth: a module-level `<template>` parse plus the twelve empty Text nodes
    // every other prototype carries, and then `cloneNode(true)` with a hand-written chain of
    // `firstChild`/`lastChild`/`nextSibling` loads and fifteen writes. No `querySelector`, no walk
    // table, no refs object. Its independently declared TWIN is the null: two programs whose true
    // difference is ZERO by construction, and every difference the axis reports is printed against
    // `|floor − floor·twin|` and refused by name when it lands under it.
    //
    // ITS GATE IS BYTE-IDENTICAL `outerHTML` ACROSS EVERY PARTICIPANT, compared against the first,
    // and it THROWS: four spellings of one tree is exactly the arrangement in which one of them can
    // quietly do less, and on a mismatch the run prints both lengths, the first differing index and
    // the characters around it. Fresh templates per repetition — the variants differ in the value
    // of ONE static attribute and nothing else — because `exoDomPlanOf` caches on `schema.domPlan`
    // and a naive loop would time a field load; the variant strings are built at module load so no
    // participant pays a concatenation inside a region that another does not.
    //
    // READ ITS HEADER'S CAVEATS BEFORE QUOTING IT. Every row is the WARM case and therefore a lower
    // bound on a real page's cold compile; `mikado` and `stage0` are PRE-BUNDLED by Vite while
    // `@exodra/*` is in `optimizeDeps.exclude`, which favours the two third-party rows; the
    // insertion is deliberately OUT of the build table (it is its own row, and `exodra·mount` is
    // the one row that contains it) so that a prototype's owner document is not read as a template
    // difference. It owns its own `PROGRAMS` and its own printer, so `--only` does not reach it. It
    // honours the third positional as `teardown-phases` does; batch 1 is the one to run.
    'template-build': ['./src/benchmarks/axes/phases/template-build.ts', 'benchmarkTemplateBuild'],
    // The seventh of the floor family, and the first axis in this map THAT PUTS
    // `applyExoEventAction` INSIDE A TIMED REGION. `packages/core/src/events/` holds five files;
    // four of them — `apply-exo-event-action.ts`, `exo-set.ts`, `exo-toggle.ts`, `exo-update.ts` —
    // are the declarative handler path, and not one of them was timed by anything. The fifth,
    // `check-event-port.ts`, is timed only because `toggle.tsx:791` happens to call `c.on` once.
    // `keystroke-floor` does construct an `exoCellUpdate` descriptor, but only under
    // `createExoDelegatedEvents(['input'])` — where the descriptor is not the variable, the PACK is — and
    // its own header books the missing pair by name: "A DESCRIPTOR UNDER THE DIRECT PACK … a
    // legitimate eighth row … left out to keep this run at seven". THIS AXIS IS THAT PAIR.
    //
    // THE UNIT IS ONE CLICK ON ONE ROW OF A 200-ROW LIST, and the file establishes from the five
    // files what an op actually is rather than assuming it: a FOUR-FIELD RECORD built at module
    // level (`prop`, `op`, `value`, `update`, one hidden class for every descriptor in the process),
    // dispatched by a SHARED listener — `directListenerFor(event)`, one `EventListener` per event
    // name for the whole process — which reads `currentTarget`, loads two expando slots and calls
    // `applyExoEventAction`, which null-checks the subject, resolves `subject[action.prop]` (the
    // keyed load that is the entire point: the descriptor brought a NAME and the event brought the
    // object), runs three type tests, dispatches on an integer, and for TOGGLE performs
    // `setValue(getValue() === true ? false : true)` — A STRICT COMPARE AND NOT TRUTHINESS, which
    // `exo-toggle.ts:24-28` records as a claim that was wrong in this repository until it was
    // pinned. THE FLOOR MIRRORS THE STRICT RULE, so the two programs are the same program.
    //
    // SO AN OP IS NOT A CHEAPER HANDLER PER EVENT and the header says so before any number: it is
    // MORE work per dispatch than a closure, and what it buys is at MOUNT (`exo-direct-events.ts:
    // 16-17`: a closure is "one function object plus the context it captures" per row, a descriptor
    // is "two property stores" and no allocation of ours) and in what becomes POSSIBLE. That is why
    // the axis prints TWO TABLES and judges both strategies on both.
    //
    // OPS AND DELEGATION COMPOSE, AND THE DEPENDENCE IS ONE-WAY — the question the brief asked,
    // answered from the code. Delegation REQUIRES a descriptor (`exo-delegated-events.ts:219`
    // refuses a closure by name rather than quietly attaching a per-element listener); a descriptor
    // does NOT require delegation (`make-exo-listener-setter.ts:44-59` serves one under the SHIPPED
    // direct pack). So the shipped form is not already the strategy: a user who writes
    // `c.on(port, FLIP, item)` instead of `c.on(port, () => …)` has changed the work with no pack,
    // no plugin and no render argument. The run carries BOTH as rows so the two changes —
    // "descriptor instead of closure" and "one root listener instead of 200" — are separated rather
    // than made together, which is exactly what `keystroke-floor` could not do.
    //
    // SEVEN PROGRAMS, EACH CONSECUTIVE PAIR DIFFERING BY ONE NAMEABLE THING: a `driver` row that
    // attaches NO handler and prices the instrument's own cost; TWO spellings of the floor (200
    // listeners, and one on the container with an expando index — not a scan, which would be
    // dishonestly slow when every row has a consumer); the floor's independently declared TWIN as
    // the null; `exodra·closure`; `exodra·op`, the subject; and `exodra·op·deleg`, the same shared
    // descriptor under `createExoDelegatedEvents(['click'])`. THAT LAST ROW IS ALSO A PROOF: the delegated
    // attacher throws on a function, so a delegated row that mounts is one whose handler is provably
    // a descriptor — and it shares the object with the direct row.
    //
    // ITS GATE IS SHARPER THAN A MARKUP DIFF AND HAS TO BE: what the op ultimately writes is
    // `input.value`, a DOM PROPERTY, and a property does not serialise, so an `innerHTML` gate would
    // pass a program that flipped a boolean and never touched the page. The snapshot is markup PLUS
    // every field's `.value` property PLUS every field's `value` attribute, compared against
    // `exodra·op` AFTER EVERY ONE of 400 clicks, because two passes return every flag to `false` and
    // an end-state check would pass a program that did nothing (`update-floor`'s lesson). The floor's
    // prototype carries ` value=""` for the reason `keystroke-floor`'s first run died over, and the
    // prototypes print BEFORE the gate so a divergence of that kind is read at the top of the output.
    // The expando slots are deliberately NOT compared: each strategy writes its own and they are
    // supposed to differ.
    //
    // ITS LARGEST HAZARD IS A COMMON ADDEND AND IT IS A ROW, NOT A FOOTNOTE. `keystroke-floor`
    // measured its own event-dispatch instrument at 74.6% of a floor keystroke; this driver is the
    // same order. It sits inside every timed region, so it inflates every row equally and DEFLATES
    // every ratio; every headline is printed raw and again with `driver` subtracted from both sides,
    // the run states in the ANSWER that every corrected figure is A DIFFERENCE OF SMALL NUMBERS, and
    // any row measuring BELOW the driver is refused by name as a ladder that does not nest. It
    // observes its own clock quantum, refuses either table's regions under three ticks and prints the
    // exact batch that would clear them, and refuses the strategy rows as an ORDERING when the null
    // is a large fraction of the smallest difference asked of it — expect to need a batch above 1
    // there, as `keystroke-floor` needed 8.
    //
    // READ "WHAT THIS AXIS DOES NOT ANSWER" BEFORE QUOTING IT. Every event is synthetic and
    // `isTrusted: false`: no default action, no activation behaviour, no focus change, no selection,
    // no hit testing, no `pointerdown`/`mousedown`/`pointerup` around it, nothing after the handler
    // returns, and not human click rate. It measures `exoCellToggle` ONLY — `exoCellSet`'s and `exoCellUpdate`'s
    // arms are not timed, and `exoCellUpdate` in particular calls user code this axis never runs. The
    // delegated walk it measures is three nodes, the friendliest shape delegation can have.
    //
    // It owns its own `PROGRAMS` array and its own table printer, so `--only` does not reach it. It
    // honours the third positional as `teardown-phases` does. RUN IT ALONE — one axis at a time.
    'op-click-floor': ['./src/benchmarks/axes/floors/op-click-floor.ts', 'benchmarkOpClickFloor'],
    // Not a framework comparison either, and the only axis in this map whose FREE VARIABLE IS THE
    // NUMBER OF HANDLERS ONE INSTANCE HAS. Every rung drives the same total work — the same 256
    // buttons, the same 256 outputs, the same 256 handlers, the same 2048 dispatches per region —
    // and differs only in how those handlers are GROUPED: 256 components of 1, 64 of 4, or 16 of 16.
    //
    // IT WAS ORDERED ONCE BEFORE AND REFUSED, AND THE REFUSAL WAS RIGHT. The premise was that a
    // machine allocates zero closures per instance for its handlers, and at that time
    // the machine's wire built one closure per declared `m.on` per instance and captured a
    // `const` inside the loop body with it. The premise is true now and the lines are cited in the
    // axis's own header: `done()` builds ONE ROUTER PER HANDLER PER COMPONENT
    // (`packages/core/src/machine/exo-machine.ts:76`), the wire's whole handler loop is
    // `c.on(handlerPorts[at], routers[at], c)` (`:95`), and the instance travels
    // as the SUBJECT because `direct-listener-for.ts:89-93` now hands it to a function handler. Per
    // declared `m.on`, per instance: closures 1 → 0, contexts 1 → 0, property stores 2 → 2
    // (`make-exo-listener-setter.ts:70-78`, unchanged for both handler forms).
    //
    // THREE ARMS AND AN INSTRUMENT, at each of three rungs. `floor` — no library, N literal handler
    // closures in one scope per group, a written-out sibling walk, a `.data` store. `wire` —
    // `c.fillDoors()` once, state in closure variables, N handler closures per instance. `machine` — the
    // IMPERATIVE machine: N handlers declared once per COMPONENT through `m.on`, state in the CACHE
    // (`m.keep`, not fields — a value nothing derives from earns no address, no bit and no
    // mark), ports written with `c.port`, ZERO closures and ZERO contexts per instance. `driver` —
    // the same DOM with no handler anywhere, which is both the click table's common addend and the
    // row that prices the one thing that is NOT constant across rungs: the wrapper count, 256 panel
    // divs at n1 against 16 at n16.
    //
    // THE FLOOR IS THE CONTROL FOR THE WHOLE FRAMING. It allocates the same 256 function objects and
    // the same 256/N contexts the wire does, with no component boundary and no library under it. If
    // the wire moves across the ladder and the floor moves with it, the movement is closures; if the
    // floor is flat while the wire moves, the movement is Exodra's — and the axis prints that
    // comparison as a CONTROL line and judges P4 on it.
    //
    // THE HANDLERS ARE DISTINCT AT THE SOURCE, NOT COPIES OF ONE FUNCTION. Sixteen bodies per arm
    // per family, written out: own source position (own SharedFunctionInfo, own inline caches), own
    // state variable, own port, own arithmetic out of sixteen different `STEP` functions. N copies
    // of one closure would have kept every dispatch site monomorphic and every cache warmed 256
    // times, and the question is a component with sixteen DIFFERENT buttons. The `STEP` table and the
    // `LABELS` table ARE shared across arms, deliberately, so no difference between rows can be a
    // difference of arithmetic.
    //
    // MOUNT AND CLICK ARE SEPARATE TABLES because creating a closure and calling one are separate
    // questions: MOUNT is ms per SCENE (the constant denominator across the ladder), CLICK is µs per
    // click. THE HEADLINES ARE DIFFERENCES AND NOT RATIOS — `driver` is inside both sides of any
    // difference of two click rows and cancels exactly, so no correction is applied to one; ratios
    // are printed raw and driver-corrected beside them.
    //
    // IT PROVES ITS OWN PREMISE OFF THE ELEMENTS BEFORE IT TIMES ANYTHING, and that gate exists
    // because the header cites SOURCE while the run loads a BUILT dist. Two instances of one
    // machine component are mounted and their buttons' own event slots are read: the two must hold
    // THE SAME function object and DIFFERENT subjects, and two instances of one WIRE component must
    // hold DIFFERENT function objects. A dist that predates the router change fails it by name and
    // asks for `npm run build:all` — without it, both arms would move together and every table
    // would be a comparison of one thing with itself printed to four decimals.
    //
    // NINE NULL PAIRS PER TABLE — one per arm per rung, each a second independently declared copy
    // with its own schema, plan, prototype and sixteen bodies. EVERY GAP IS JUDGED AGAINST THE
    // RESOLUTIONS OF ITS OWN TWO ROWS AND NEVER AGAINST THE TABLE'S MAXIMUM, which is the defect one
    // noisy participant caused on a neighbouring axis; the printed `RESOLUTION FLOOR` line is the
    // coarsest of the nine and is there for the recorder, and no verdict uses it. It observes its own
    // clock quantum, refuses any region under three ticks with the batch that would clear it, refuses
    // a rung whose gap is less than four times its own resolution as an ORDERING rather than a size,
    // and refuses any row measuring below its rung's driver as a ladder that does not nest.
    //
    // ITS PREDICTION NAMES NO WINNER between `wire` and `machine` — only the SHAPE: whether the gap
    // is flat in N, at which rung it first clears that rung's own resolution, and whether the CLICK
    // gap is flat (it should be: no term in either dispatch path counts N).
    //
    // READ "WHAT THIS AXIS DOES NOT MEASURE" BEFORE QUOTING IT. It varies handler COUNT and holds
    // everything else fixed, so it says nothing about state width (one number per handler), nothing
    // about DERIVATIONS (this machine declares no `m.derive`, no `m.fill` and no `m.effect`, so the
    // commit, the mark word, the inversion and the wake chains are on no path in it), and nothing
    // about what a handler does. No `exoTransition` is on any path either, and the header argues why.
    // The 64-handler rung is UNMEASURED and the reason is stated: distinctness is hand-written
    // source, and 64 bodies × six arms is a file nobody would check.
    //
    // It owns its own `PROGRAMS` array and its own table printer, so `--only` does not reach it, and
    // it states its own rows on `##ROWS##` rather than being scraped. It honours the third positional
    // as the batch. RUN IT ALONE — one axis at a time.
    'handler-count': ['./src/benchmarks/axes/mechanism/handler-count.ts', 'benchmarkHandlerCount'],
    // `handler-count`'s QUESTION ON THE BACKEND WHERE IT CAN BE ANSWERED. Same three arms (floor,
    // wire, machine), same three rungs (1, 4, 16 doors per instance), against `@exodra/string`
    // instead of `@exodra/dom` — because the DOM axis has been refused twice by its own resolution
    // (0.0098 ms per 32-instance scene, 306 ns PER INSTANCE, with the effect underneath it) while
    // `ssr-floor`'s published run separated 10 ns per instance on this backend. Clone, insert,
    // layout and a byte gate that has to serialise the document after every click are what made the
    // question unanswerable, and none of them exists in a server render.
    //
    // A "DOOR" IS NOT A HANDLER HERE. There are no events on the server, so the free variable is the
    // per-instance functions a wire builds and calls — `setName`, `bump` — against a machine whose
    // transitions are declared once per component and take the instance as an argument. Each door
    // folds one distinct arithmetic step into the row's accumulator and the accumulator is PRINTED,
    // so a door that did not run changes the page and the byte gate refuses it; a per-door counter
    // is checked for GROWTH ACROSS THE TIMED ROUNDS on top of that, because a declared-and-uncalled
    // door is allocated but never compiled and that error flatters the wire.
    //
    // IT PREDICTS NO WINNER AT ANY SINGLE RUNG and says so in its own verdict block: a rung is a
    // slope plus an intercept, and the intercept is the machine's three per-instance allocations
    // against the wire's one. What it claims is the SHAPE — the per-door increment, measured twice
    // (n1→n4 and n4→n16) on each arm, with the floor's increment as the arithmetic both library
    // arms share.
    //
    // Nine null pairs (one per arm per rung), each a separately declared transcription; every
    // quantity is judged against the resolutions of ITS OWN rows and against a FOUR-GRAIN bar, and
    // the printed `RESOLUTION FLOOR` is the coarsest of the nine, for the recorder, used by no
    // verdict. Its phase driver ALTERNATES DIRECTION (even rounds forwards, odd backwards) and its
    // null is split into an ordering half and an intrinsic half — the fixed-cycle rotation the
    // shared driver used gave every pair a fixed neighbour for a whole run.
    //
    // It states its own rows on `##ROWS##`, owns its own table printer, and honours the third
    // positional as the batch. BATCH 1 IS THE ONE TO RUN and the header has the arithmetic: 40
    // renders per region over 1000 rows is a grain of 2.5 ns per instance, the n16 quantities are
    // 50-96 grains and the n1 quantity is 3-6, so the run refuses n1 by name and names batch 2
    // rather than pretending. About half a minute of wall clock. RUN IT ALONE.
    'door-count': ['./src/benchmarks/axes/mechanism/door-count.ts', 'benchmarkDoorCount'],
    // Not a framework comparison either, and it covers a core path NOTHING ELSE IN THIS MAP HAS
    // EVER RUN: WRITING AN ATTRIBUTE THAT IS NOT TEXT. Not one symbol from `packages/core/src/attr/`
    // — `exoAttrWriteSpec`, `exoDomPropertyKind`, `checkAttrName`, `checkAttrUnique` — is named in
    // any axis above; the plan compilers that call them run inside `prepare()` and inside warm-up,
    // never inside a timed region. The only attribute figure this repository owns is the SERVER's:
    // `ssr-floor`'s `+head` rung at 0.0250 ms, the ` name="` prefix and its closing quote. The DOM
    // side had nothing.
    //
    // ITS SUBJECT IS A BRANCH TABLE. `make-attr-setter` answers four questions about a NAME once per
    // port per (schema, composition) and returns one of SIX closures: a boolean property plus an
    // attribute sync (`checked`), a bare property store (`value`), `className =` on an HTML element,
    // `setAttribute('class', …)` on an SVG one (where `className` is a read-only `SVGAnimatedString`
    // — a bug fixed in one backend), `setAttributeNS` for a namespaced name
    // (`xlink:href`), and `setAttribute` for everything else, under THE NAME THE PARSER PUT ON THE
    // PROTOTYPE (` viewbox=""` in the markup is a `viewBox` attribute on the element). A
    // straight-line program spells each of the six as one call. That difference is what is priced.
    //
    // IT MEASURES UPDATE AND PRINTS MOUNT SEPARATELY, as two tables with their own gates, their own
    // resolution floors and their own clock checks — never one table. Update is the headline because
    // the branch is decided once and the closure then runs once per data change for the life of the
    // page, and because at mount the write is buried inside a wiring phase measured elsewhere at
    // 43.9% of a mount. The mount table is a different question and its header says how: on a fresh
    // clone the property store is the FIRST store and the attribute writes GROW the element's
    // attribute list, where every write on the update table replaces a value in place. No
    // hidden-class transition is isolated and none needs to be — every store here lands on a real
    // IDL accessor rather than on an expando — an expando's first store is the case `child-mark`
    // isolates by storing twice, and this file has no expando to isolate; it contains no `delete`
    // anywhere.
    //
    // SIX ROWS, EACH CONSECUTIVE PAIR DIFFERING BY ONE NAMEABLE THING: a `driver` with no DOM write
    // at all (the common addend, excluded from both gates by construction), the straight-line
    // `floor`, an independently declared `floor·twin` whose true difference is ZERO, a `floor+cell`
    // that drives the same writes through the same source the `exodra` row's effects follow — which is what splits
    // the gap into a reactive-dispatch side and a setter-indirection side, neither of which had a
    // number before — `exodra`, and `exodra·writers` under
    // `withExoPropertyWriters(new ExoDomBackend())`.
    //
    // THAT LAST ROW EXISTS TO PUBLISH A NEGATIVE, AND THE AXIS SAYS SO IN WORDS WHEN IT HOLDS: NO
    // COMPOSITION IN THIS REPOSITORY REDUCES THIS WORK. `takesOverExoProperty` returns false on its
    // FIRST line for every tag the axis uses — none of `div`/`b`/`i`/`input`/`svg`/`g`/`use` has a
    // `-` — so the value-writers pack delegates all seven ports to `EXO_SHIPPED_WRITERS` BY
    // REFERENCE and compiles the same closures. The pack ADDS a capability the shipped one cannot
    // serve at all (a structured value into a custom element's property, where `setAttribute` would
    // stringify) and removes no work from any of the four kinds. If the row measures apart from
    // `exodra` past the resolution floor the axis REFUSES by name, because that would be a finding
    // about the `writers` field rather than about attributes.
    //
    // Its gates run before anything is timed: every prototype in the run is printed first — the
    // floor's, the twin's, and the compiled prototype of BOTH compositions — with a first-difference
    // line, because the compiler KEEPS the ` value=""` and ` checked=""` placeholders for the two
    // property ports and removes the other five, and a floor that carried the wrong set would be a
    // different program (this is what stopped `keystroke-floor`'s first run). Then the state gate
    // compares markup AND the live `.value`/`.checked` properties AND their attributes, stepped
    // through a full cycle rather than at the end, because the cycle returns to where it started.
    // It observes the clock it was granted and refuses any region under three ticks with the batch
    // that would clear it; it refuses any inversion in the `driver ⊂ floor ⊂ floor+cell ⊂ exodra`
    // ladder; and it refuses its own split when the null is a large fraction of it. It owns its own
    // `PROGRAMS` array and its own table printer, so `--only` does not reach it. It honours the
    // third positional as `teardown-phases` does; batch 1 is the one to run. RUN IT ALONE — one axis
    // at a time. Read its header before reading its ANSWER line.
    'attr-floor': ['./src/benchmarks/axes/floors/attr-floor.ts', 'benchmarkAttrFloor'],
    'plugin-compose': ['./src/benchmarks/axes/mechanism/plugin-compose.ts', 'benchmarkPluginCompose'],
    'one-and-static': ['./src/benchmarks/axes/mechanism/one-and-static.ts', 'benchmarkOneAndStatic'],
    // THE TWO PLUGINS THAT HAD NO PRICE ANYWHERE. `@exodra/dom` ships five composable pieces; three
    // of them are measured somewhere in this directory (delegated events by `op-click-floor`,
    // `keystroke-floor` and `toggle`; the property
    // writers by `attr-floor`; hydration by `hydrate-floor`), and `exoChildrenWalkPlugin` and
    // `attachExoKeyedList` occurred ZERO times in this package. `plugin-compose` names
    // `dom-mutation` as the walking reconciler's axis and there is no such axis in this map; this
    // is the page that pointer should have led to. Three tables over one 200-row list — the MOUNT,
    // a REFETCH (fresh objects, same ids, same labels) and a DRIFT (something else moves a row,
    // then a notification carrying the same items) — each against the shipped default and each
    // carrying `shipped·twin`, a second separately declared identical participant whose true
    // difference is zero, so every figure is read against what the run cannot tell apart from
    // nothing. It owns its own tables and its own printer, so `--only` does not reach it. It
    // observes the clock it was granted and refuses any region under three ticks by name, with the
    // batch that would clear it. RUN IT ALONE. Read its header before reading its numbers — in
    // particular why TABLE 2's keyed rows are a SMALLER JOB and not a speed-up, and why TABLE 3
    // prints no ratio at all.
    'plugin-price': ['./src/benchmarks/axes/mechanism/plugin-price.ts', 'benchmarkPluginPrice'],
    // Not a framework comparison either, and the only axis here that measures a WAY OF WRITING A
    // COMPONENT rather than a piece of the renderer: the per-instance update path, spelled as a
    // closure wire, as the shipped machine, and as the hand-written machine below.
    //
    // FORM B is a STATE MACHINE with no closures per instance: per component, declared once and
    // shared, the pure derivations and an integer mask of the state fields each one reads; per
    // instance, a state object, the connector's own `c.fillDoors()` handle and an integer. A transition
    // writes fields and ORs their bits; a commit runs each derivation whose `mask & touched` is
    // non-zero, exactly once, and writes through the port handle. Its whole machinery is
    // `src/benchmarks/shared/exo-machine.ts` — about forty lines, IN THIS PACKAGE, because the
    // library does
    // not ship it. THAT IS THE POINT: if it wins here, that file is the proposal.
    //
    // THE SUBJECT IS ONE TAG WITH THREE KINDS OF SIGNAL, chosen because a component with one kind
    // cannot tell the two forms apart: `name` pushed in from outside, `open` the tag's OWN state
    // toggled by a click on itself, and `width` — the rendered pixel width, which CANNOT be computed
    // from state and is therefore a transition and not a derivation. NO `getBoundingClientRect`
    // APPEARS ANYWHERE IN THE AXIS: a forced synchronous layout inside a timed region would swamp
    // everything else and the run would be reporting Blink as the price of a state machine. The
    // widths are integers from a table, handed in from outside the clock, and the header says so.
    //
    // FOUR TABLES, MEASURED SEPARATELY AND NEVER ROLLED INTO ONE NUMBER: the MOUNT (where form B's
    // per-instance allocation claim shows or does not), ONE FIELD (`name` — the common case), TWO
    // FIELDS AT ONCE (`name` and `open` — the case the mask exists for: form B must run `label`
    // ONCE where a write per field would recompute it twice), and A FIELD NOTHING DEPENDS ON (a fourth state
    // field added for that table and used by nothing else — and the table where form B is most
    // likely to LOSE, because `exoCommit` still pays a mask OR and one test per declared derivation
    // where a plain property store pays neither).
    //
    // SIX ROWS HAVE A TWIN — a second, separately declared, identical participant with its
    // own component, schema, compiled plan and derivation array — so each pair's true difference is
    // ZERO, and everything the axis publishes is read against the LARGEST of those nulls.
    //
    // ITS GATE IS SEVEN STAGES and it throws: markup AND text, byte for byte against the floor,
    // after the mount, after each of the three timed transitions, after the untimed width signal,
    // and after a real bubbling click on every button and a second that restores it. The REFERENCE
    // is required to have MOVED under that click, by name — without it, a field in which nobody's
    // event port was live would agree perfectly with itself and pass.
    //
    // IT COMMITS FIVE FALSIFIABLE PREDICTIONS in its header, written before the first run, and
    // prints every verdict mechanically at the end, each qualified by ITS OWN table's resolution and
    // printed as UNRESOLVED when the gap is under it. It states its own rows through
    // `emitRecordedRows`, so `--only` does not reach it and nothing is scraped. It observes the
    // clock it was granted and refuses any region under three ticks by name, with the batch that
    // would clear it. RUN IT ALONE. READ ITS "WHERE THIS AXIS IS STILL KIND TO FORM B" BLOCK BEFORE
    // QUOTING IT: it covers no teardown, no memory, no layout, no diff, no children that come and
    // go, no derivation CHAIN, and a component with exactly two derivations, which is the best case
    // for form B's commit loop.
    'machine-vs-cells': ['./src/benchmarks/axes/mechanism/machine-vs-cells.ts', 'benchmarkMachineVsCells'],
    // `port-writer-crossover` STOOD HERE AND WAS STRUCK, WITH ITS FILE, BEFORE IT WAS EVER RUN. It
    // was the only axis in this map whose answer was a QUOTIENT rather than a ranking: `c.set(port,
    // value)`, which resolves the port on every write, against a hand-out call that never got a
    // name: it would have resolved the port once and given back a function whose body was the
    // write. Its two terms were the hand-out cost and the per-write saving, divided one by the
    // other to state the volume above which the writer became cheaper. TWO REASONS IT IS GONE, BOTH
    // BELONG HERE.
    //
    // (1) THE FEATURE IT MEASURED WAS DELETED, ON A MEASUREMENT, WHILE THIS AXIS WAS BEING BUILT.
    // Bare shapes, 1000 instances × 5 ports, null pair 0.006 ns per write:
    //
    //     writes per port      1      2      4      8     16     64
    //     lookup  ns/write   3.267  3.196  3.163  3.226  3.082  3.083
    //     writer  ns/write   8.442  5.958  4.754  4.439  3.979  3.738
    //
    // The hand-out (5.8 ns per port per instance) amortises exactly as a cache should — and it
    // converges 0.655 ns per write ABOVE the lookup and STAYS THERE. There is no crossover to
    // divide for, because the shipped body was `(value) => { write(at, value); }`: every write paid
    // a second call frame, and a frame is not amortisable. Two array loads are cheaper than one.
    //
    // (2) IT WAS BUILT ON THE WRONG BACKEND FOR ITS OWN QUESTION, AND THAT IS RECORDED SO NOBODY
    // REBUILDS IT THERE. It was to run on `@exodra/string`, chosen for resolution — 0.5 ns per port
    // per instance against the DOM's 306 ns, on `door-count`'s reasoning. But the writer's saving IS
    // the removal of `nodes[elem[index]]` per write, and that backend HAS NO SUCH INDIRECTION:
    // `TExoStrNode.set` is `this.values[index] = this.writers[index](value)` and nothing else
    // (`packages/string/src/EXO_STR_NODE_VOCABULARY.ts:77-80`). So the axis would most likely have printed
    // "there is no crossover" for a reason having nothing to do with the writer's merits. A
    // RESOLUTION ADVANTAGE DOES NOT SURVIVE MOVING THE QUESTION TO A BACKEND WHERE THE MECHANISM
    // IS ABSENT — that is the general form of the mistake, and it is the part worth keeping.
    //
    // WHAT THE STRIKE DOES NOT DELETE is the open question the numbers above do not settle: a FLAT
    // writer — the write inlined, specialised per port kind at hand-out, with no call inside — beat
    // the lookup by 0.126 ns per write and crossed over at about 46 writes into one port. That is a
    // different feature, it does not exist in this tree, and an axis for it would have to be built
    // on a backend where the lookup it removes is actually present.
    //
    // THE REBUILD OF THE STRUCK AXIS, ON THE BACKEND ITS OWN QUESTION LIVES ON. Same subject — what
    // a port write costs, and whether a writer that resolved its node once beats one that resolves
    // it per write — against `@exodra/dom` and a real document, because the saving IS the removal of
    // `nodes[elem[i]]` and that indirection exists here and nowhere else. Every defect the strike
    // above records is answered by construction and the file names them (D1)-(D9): both library arms
    // spend TWO frames (the shipped `ExoDomPorts.set` is called, never transcribed); the `port.index`
    // load and the `written[writes++]` fill stamp are inside the arm rather than missing from it;
    // every arm's scratch array is allocated in an untimed `prep()`; the 3000 instances are BUILT
    // INTO A LIVE ARRAY and written again while still mounted, so the closures are promoted the way
    // a page's are; MOUNT AND UPDATE ARE TWO TABLES with two null blocks and two clock checks, joined
    // only by printed arithmetic; the five ports are five KINDS (setAttribute, className=, Text
    // .data, a second setAttribute, a bare `value` property store) and a gate refuses the run unless
    // the plan compiled five DISTINCT setter objects; every write is read back — markup plus every
    // `<input>.value`, because the property store is the one write the serialiser cannot show —
    // before timing and again after the rounds; and the twenty-four update phases interleave in ONE
    // direction-alternating driver whose coverage gate refuses any pair, NULL OR DISPUTED, that did
    // not get both running orders. That last one is the defect the retracted run had: it balanced its
    // control and left the pair it was about unbalanced.
    //
    // IT PREDICTS ITS OWN REFUSAL, AND THAT IS THE POINT. (P5) says `|set − bound|` will clear its
    // own two rows' resolution at NO rung, and the arithmetic is in the header: the disputed term is
    // four or five L1 loads and one branch — a fraction of a nanosecond — riding on a write that
    // crosses into the browser's binding layer. An effect under one percent of the operation it sits
    // on is unobservable in a page even with a known sign, and saying so is worth more than a number.
    // AND TWO DIFFERENT BARS DO THE REFUSING, WHICH IS WHY IT PRINTS BOTH AT EVERY RUNG. At w1, w4
    // and w16 the CLOCK cannot express the quantity — a region is `reps × 3000 × 5 × R` writes read
    // off one clock, so four grains are 26.7, 6.7 and 1.67 ns per write at batch 1 — and only at w64,
    // where four grains fall to 0.42 ns, does the noise get a turn. `rounds` moves neither bar: more
    // rounds make a quantised sample no finer and do not reduce the MEDIAN of the per-round
    // difference, which is what the resolution is. `batch` moves both, which is why it is the
    // escalation. Its two tables carry SEPARATE repetition factors for that reason — mount takes four
    // scenes per region (cheap in clock, expensive in live elements; its grain has to see a hand-out
    // of tens of ns per instance) and update takes one (cheap in elements, and its w64 region is
    // already ~77 ms).
    //
    // A FOURTH ARM WAS ASKED FOR AND IS DELIBERATELY ABSENT. `direct` — ports numbered so that
    // `nodes[index]` is the node, pricing the SECOND NUMBERING rather than where the node is kept —
    // cannot be reached through the public surface: `ExoDomPorts.set` carries the hop in a body no
    // caller can replace, `portNodeWriter`'s closure is the same line, and a plugin replacing
    // `fillDoors()` would hand back a holder the MEASURER wrote. The axis records that, prints the port
    // index → node slot table so a reader can see whether the two numbers even differ, and closes the
    // question with a BOUND instead: the one load `direct` would remove is one of six that `bound`
    // already removes, so an unresolvable `set ↔ bound` cannot contain a resolvable `set ↔ direct`.
    // It is printed under its own heading and is never merged with the `set ↔ bound` verdict.
    //
    // It states its own rows on `##ROWS##` twice (mount in ns per instance, update in ns per write),
    // owns its own table printer, and honours the third positional as the batch. BATCH 1, ROUNDS 120,
    // two to three minutes; the escalation is `batch 4` and not more rounds, and the file says why.
    // RUN IT ALONE — one axis at a time.
    'port-write-doors': ['./src/benchmarks/axes/mechanism/port-write-doors.ts', 'benchmarkPortWriteDoors'],
    // THE SAME QUESTION AS `port-write-doors`, ASKED ON THE BACKEND WHOSE CLOCK CAN SEE IT, AND
    // ASKED AS FOUR INDEPENDENT PROGRAMS RATHER THAN AS A LADDER.
    //
    // Three ways to reach a port and write it — `walk` (the shipped `c.set`, which resolves the
    // address out of `port.index` and two arrays on every write), `prototype` (one object per port
    // per instance over a method that exists ONCE in the process) and `closure` (one function object
    // per port per instance) — plus a NATIVE FLOOR producing byte-identical output. No cumulative
    // rungs, no differences of differences: four medians against one scene, and every comparison a
    // difference of two of them.
    //
    // WHY IT EXISTS AT ALL: two published attempts at this question were retracted for THE SAME
    // DEFECT, three lines apart. `port-write-doors`' D1 — a DOM arm spelled as a bare
    // `setters[i](nodes[elem[i]], v)` with NO ENCLOSING CALL against a shipped door that spends a
    // frame and then calls the setter — and then `ssr-floor`'s `+reset → +set`, which puts a bare
    // `W[0](i)` against `c.set(PORTS[0], i)`. ONE FRAME AGAINST TWO, twice. So this axis carries the
    // FRAME COUNT AS A COLUMN of its table: the three door arms spend exactly two frames per write
    // (the door, then THE SAME writer function object — checked by pointer in a plan gate), and the
    // floor spends one BY CONSTRUCTION and is never used as their control.
    //
    // ON THE SERVER AND ONLY THE SERVER. The DOM was tried twice and its clock cannot express this:
    // every median came back an integer number of ticks. This axis therefore prints MEDIAN ÷ GRAIN
    // and REGION ÷ QUANTUM beside every median, and its CLOCK CHECK RUNS BEFORE the nulls, the gaps
    // and the predictions — a row under the 3-tick floor is EXCLUDED from all three rather than
    // footnoted after them, which is what happened last time.
    //
    // Four null pairs, one per arm, each a separately declared program with its own schema, plan,
    // connector pool and bodies; every gap judged against ITS OWN ARM's resolution and a four-grain
    // bar, never against the table maximum. ONE ESTIMATOR FOR EVERY PAIR — nulls and subjects alike
    // go through `pairedGap` and the quoted figure is its order-balanced `intrinsic`, because the
    // last server ladder order-corrected the disputed pair and left the quotable one uncorrected.
    //
    // It states its own rows on `##ROWS##`, owns its own table printer, and honours the third
    // positional as the batch. BATCH 2 IS THE ONE TO RUN and the header has the arithmetic: 80
    // renders per region over 1000 rows × 8 ports is a grain of 0.156 ns PER PORT WRITE, so four
    // grains is 0.63 ns — under the smallest quantity in dispute (one allocation against two array
    // loads). BATCH 1 WOULD REFUSE THE INTERESTING PAIRS BY CONSTRUCTION: four grains there is
    // 1.25 ns, over a plausible value of the whole effect. Well under a minute of wall clock; the
    // escalation is `door-shape 100 4` and never more rounds — a quantised median moves in grains
    // and only the batch moves the grain. RUN IT ALONE.
    'door-shape': ['./src/benchmarks/axes/mechanism/door-shape.ts', 'benchmarkDoorShape'],
    // ONE OF TWO AXES IN THIS MAP THAT IMPORT NOTHING FROM `@exodra/*` — not a dist, not a source
    // file, not a type; `walk-record` below is the other. Five straight-line JavaScript programs
    // and a clock. It is registered here
    // only to reuse the runner that starts Vite, drives headless Chromium and forwards the
    // browser's console, and a figure it prints is a figure about V8 and about nothing in this
    // repository.
    //
    // WHAT IT ANSWERS: how expensive is each way of making a per-instance object whose methods
    // live on a shared prototype? Four spellings with identical fields (`a`, `b`, `c`, that
    // order), one identical shared method, one identical call site, identical work per call —
    // `{ __proto__: P, a, b, c }`, `new C(a,b,c)` with the method on `C.prototype`,
    // `Object.create(P)` plus three assignments, and `{ a, b, c, m }` with the method as an OWN
    // property as the control. A fifth row, `hoisted`, allocates NOTHING per object: one receiver
    // built at module load whose three fields are re-stored every iteration. It is the instrument,
    // not a floor — a program that makes no object does not do this job — and its median is what
    // the loop, the three stores, the call and the escape cost, so every arm's gap to it is an
    // allocation plus whatever that spelling fuses with one.
    //
    // WHY IT EXISTS: a server axis measured eight `{ __proto__: … }` objects per instance at
    // +99.8 ns per port write over a path that allocates nothing (638.5 grains, own resolution
    // 0.0138 ms). That is ~100 ns per object, one to two orders above an ordinary young-generation
    // allocation, so something other than an allocation happened. `JUDGE-RULES.md` rule 1 — "one
    // shared method on a prototype, never one closure per instance" — carries that figure and
    // says in its own text that it is UNDER TEST and may not be cited as settled. This axis is the
    // program in which the candidate mechanisms can differ: `ctor` and `create` both choose the
    // prototype at creation, `protoLiteral` installs one afterwards, `plain` chooses none.
    //
    // WHAT IT DOES NOT ANSWER, and its header repeats every item: nothing about any `@exodra`
    // package, nothing about a DOM write, nothing about a receiver read more than once (every
    // object here is built, called ONCE and dropped — the worst amortisation for construction and
    // the best for the method), nothing about allocation separately from the collection it causes,
    // nothing about a constructor separately from its frame, nothing about `Object.create`
    // separately from growing the fields by assignment (that IS the spelling), and nothing about
    // any engine but V8.
    //
    // IT IS DESIGNED AGAINST ONE FAILURE MODE ABOVE ALL: none of these objects is read after the
    // loop unless something makes it so, and TurboFan may scalarise the lot. So every program owns
    // a packed module-level array of 2000 entries, overwrites slot `i` in place, and a GATE READS
    // THE WHOLE ARRAY BACK and asserts 2000 DISTINCT objects that still answer their method. Three
    // more gates run before any timing: every program returns the same accumulator, every arm's
    // own keys are in the declared order with the method own/inherited as declared, and no two of
    // the ten programs share a method function object, a sink or (for the eight that choose one) a
    // prototype — all checked BY POINTER.
    //
    // It commits its prediction in the header before the arms were written — `protoLiteral` dearer
    // than `ctor` by +3 to +40 ns per object — together with a KILLER AIMED AT ITS OWN INSTRUMENT:
    // `ctor ↔ hoisted` must resolve and `hoisted` must be the cheapest row, or the axis cannot see
    // an allocation and prints (P1) NOT JUDGED instead of a verdict. Both are judged mechanically
    // at the end.
    //
    // It states its own rows on `##ROWS##`, owns its own table printer (so `--only` does not reach
    // it) and honours the third positional as the batch. BATCH 1 IS THE ONE TO RUN: 200 passes of
    // 2000 objects per region puts one grain at 0.25 ns per object and four grains at 1.0 ns,
    // under the 3 ns lower bound of its own prediction. The escalation is `receiver-spelling 100
    // 2` and never more rounds — a quantised median moves in grains and only the batch moves the
    // grain. Well under a minute. RUN IT ALONE.
    //
    // IF THE STALE-`dist/` GATE REFUSES THE RECORDING, `--no-record` IS SAFE HERE AND FOR ALMOST
    // NO OTHER AXIS IN THIS MAP: that gate exists because this suite measures built packages, and
    // this axis reads none.
    'receiver-spelling': ['./src/benchmarks/axes/mechanism/receiver-spelling.ts', 'benchmarkReceiverSpelling'],
    // THE SECOND AXIS THAT IMPORTS NOTHING FROM `@exodra/*`. It transcribes one loop —
    // `wire-exo-instance.ts:88-98`, the per-instance node walk — and compares it with two other
    // spellings of the same job on a real list-row shape: 8 slots, 8 steps (5 firstChild, 3
    // nextSibling), a nine-node `<li>` cloned from a template.
    //
    // WHAT IT ANSWERS: what is the cheapest way to walk a freshly cloned DOM subtree and record
    // its nodes for later writes? `tape` is the shipped flat `Int32Array` (three integers per
    // step) writing into a per-instance array; `closures` is a table of eight small closures built
    // once per shape, each storing into a named field, with no array at all; `inline` is the same
    // stores straight-line — the CEILING, never used as another arm's control.
    //
    // TWO TABLES, BECAUSE THE CLONE IS THE WAY THIS QUESTION DIES. `WALK` has no clone in the
    // timed region at all (the pool is cloned untimed at module load) and is where the arms are
    // ranked; `CLONE·WALK` clones inside the region, carries a `clone`-only arm, and prints THE
    // CLONE'S SHARE as a percentage so every gap on it is read against a background of stated
    // size. (P6) checks that the two tables do not disagree in sign.
    //
    // It commits (P1) — closures DEARER than tape by 1-5 ns per step, i.e. the "a call per step is
    // a wash or better" claim is FALSE — and a KILLER AIMED AT ITS OWN INSTRUMENT: `inline` does
    // strictly less work than either loop arm, so if it is not the cheapest of the three clear of
    // four grains against both, NO PAIR ON THE AXIS MAY BE QUOTED, (P1) included. Both are judged
    // mechanically at the end, as are the six null pairs, the clone share and the tick floor.
    //
    // It states its own rows on `##ROWS##` (two tables, sections `WALK` and `CLONE·WALK`), owns
    // its own table printer so `--only` does not reach it, and honours the third positional as the
    // batch. BATCH 1 IS THE ONE TO RUN: 32 passes of 2048 pooled instances per region puts one
    // grain well under a nanosecond per step. The escalation is `walk-record 100 2` and never more
    // rounds. Under a minute. RUN IT ALONE.
    'walk-record': ['./src/benchmarks/axes/mechanism/walk-record.ts', 'benchmarkWalkRecord'],
    // THE THIRD AXIS THAT IMPORTS NOTHING FROM `@exodra/*`. Fourteen straight-line JavaScript
    // programs and a clock, registered here only to reuse the runner.
    //
    // WHAT IT ANSWERS, and it is the question that can kill a whole design before it is built:
    // what does the NUMBER OF RECEIVER MAPS cost a shared body's field reads? A renderer's shared
    // bodies read `this.nodes`, `this.plan`, `this.child`, `this.regions`, `this.written`; the
    // shipped shape puts TWO maps through those reads, and a design giving every component its own
    // class puts N. V8's inline caches go megamorphic past four, and the cost would be paid by the
    // backend's own bodies on every read rather than by the ports.
    //
    // TABLE 1 IS A LADDER, NOT A PAIR — `maps1`, `maps2`, `maps4`, `maps8`, `maps16`, every class
    // declaring the same five fields in the same order and differing only in constructor identity.
    // It prints the per-read cost at each rung AND the increment between rungs, and states in its
    // own words whether 8 and 16 differ from each other: a flat line past 4 means megamorphic is a
    // PLATEAU (a step paid once at the fourth class), a rising line means component count is a real
    // ceiling. Every rung has its OWN body and its OWN loop, because one body shared by two rungs
    // would carry one feedback vector and every rung would be megamorphic.
    //
    // TABLE 2 IS THE HONEST COMPARISON, because the design does not only ADD maps, it REMOVES work:
    // at eight classes, `sharedBodies` (one body on all eight prototypes) against `ownBodies`
    // (eight separately declared bodies, one per prototype), both reached as `o.m()` so the
    // megamorphic METHOD load cancels and only the field reads differ. It says whether the penalty
    // is escapable by installing the body per class — which is what a per-schema prototype does.
    //
    // THE CALL SITE IS THE FAILURE MODE IT IS DESIGNED AGAINST: N receivers reaching one site in N
    // runs of one map each is N monomorphic phases and not a megamorphic site. So the feed is ONE
    // packed array of 4096 receivers whose class sequence is a fixed Fisher-Yates shuffle taken
    // modulo the rung's class count — the SAME permutation at every rung, so no rung gets a more
    // predictable order — and the interleave gate REFUSES round-robin by name.
    //
    // It commits (P1) — maps8 dearer than maps2 by +5 to +30 ns per call — plus a KILLER AIMED AT
    // ITS OWN INSTRUMENT: `maps16 ↔ maps1` must resolve with maps16 dearer, or this axis cannot
    // tell a monomorphic load from a megamorphic one and NOTHING it prints about map count may be
    // quoted, (P1) included. Seven falsifiers, all judged mechanically at the end.
    //
    // It states its own rows on `##ROWS##` (two tables, sections `MAPS` and `BODIES`, both emitted
    // before either human table), prints ONE null block of seven pairs, owns its own table printer
    // so `--only` does not reach it, and honours the third positional as the batch. BATCH 1 IS THE
    // ONE TO RUN: 256 passes of 4096 calls per region puts one grain at 0.095 ns per call and four
    // grains at 0.38 ns, well under the 5 ns lower bound of its own prediction. The escalation is
    // `receiver-maps 100 2` and never more rounds. RUN IT ALONE.
    //
    // IF THE STALE-`dist/` GATE REFUSES THE RECORDING, `--no-record` IS SAFE HERE as it is for
    // `receiver-spelling` and `walk-record`: that gate exists because this suite measures built
    // packages, and this axis reads none.
    'receiver-maps': ['./src/benchmarks/axes/mechanism/receiver-maps.ts', 'benchmarkReceiverMaps'],
    // THE FOURTH AXIS THAT IMPORTS NOTHING FROM `@exodra/*`. Eighteen straight-line JavaScript
    // programs and a clock, registered here only to reuse the runner.
    //
    // WHAT IT ANSWERS, and it is the ONE unmeasured thing `IDEAL.md` §0 says the settled design
    // leans on: does a port held as a DIRECT REFERENCE beat an INDEX INTO AN ARRAY when the port
    // is written many times? At ONE write per port that is already refuted — §3 records `walk ↔
    // accessor` at 1 grain, `walk ↔ protoPort` at 4 and `accessor ↔ protoPort` at 5, all NOT
    // RESOLVED, in a run that resolved 427 and 629 grains elsewhere. At MANY writes per port
    // nobody had measured it, and that is the whole gap this axis exists to close.
    //
    // IT IS A LADDER AND NOT A PAIR, because construction is paid ONCE PER INSTANCE and writes
    // are paid PER WRITE: every arm is a SLOPE plus an INTERCEPT, and only a ladder can say
    // whether the ranking turns over. THREE RUNGS — 1, 4 and 16 writes per port, i.e. 4, 16 and
    // 64 writes per four-port instance — and every arm at every rung is its own separately
    // declared program with its own pool, its own tables and its own body UNROLLED IN SOURCE. The
    // unrolling is the design: a loop over the repetitions would make every table load
    // loop-invariant and the engine would hoist the question out of the measurement.
    //
    // THREE ARMS: `indexed` is the shipped shape (`writers[i](slots[elem[i]], v)`, both tables
    // read on every write, nothing resolved at construction, so its intercept is zero); `direct`
    // resolves a per-port closure ONCE per instance and then calls `h[i](v)` (six allocations and
    // a builder frame bought once, one fewer load per write); `floor` is straight-line writes with
    // no port abstraction, one frame by construction, NEVER used as another arm's control.
    //
    // IT PRINTS THE INCREMENT, WHICH IS THE POINT — the same arm at two rungs, so the intercept
    // cancels exactly and what is left is what ONE MORE WRITE costs. From the n4→n16 increment it
    // derives each arm's slope and intercept and then the CROSSING POINT in writes per instance;
    // where two slopes do not separate it prints "same slope, different intercept, no crossing"
    // and computes no number.
    //
    // THE FAILURE MODE IT IS BUILT AGAINST is the one that killed the last attempt: on the string
    // backend a second write to a port is INERT, so 4 or 16 writes produce byte-identical output
    // and no gate can prove the extra writes happened. Here every write's value comes from a
    // per-instance accumulator THAT THE WRITE ITSELF ADVANCES, and a gate reads all 2048
    // accumulators and all 8192 cells back after a run — drop one write and both change. For
    // `direct` the gate also takes one handle back OUT of the escape sink and CALLS it, which a
    // scalarised closure cannot answer.
    //
    // It commits (P1) — `direct` DEARER than `indexed` at n16 by +10 to +60 ns per instance, i.e.
    // the design's expectation does NOT arrive by sixteen writes per port — plus (P2) no crossing
    // inside 4..64 writes per instance, plus a KILLER AIMED AT ITS OWN INSTRUMENT (P3): every arm
    // must rise resolvably from n1 to n4 and from n4 to n16 and `floor` must be cheapest at every
    // rung, or NO SLOPE, NO INTERCEPT AND NO CROSSING may be quoted. (P6) is the hoisting
    // diagnostic: if `indexed`'s marginal write equals `floor`'s, the engine read the tables once
    // and every slope here is the slope of a body it rewrote. Six falsifiers, all judged
    // mechanically at the end.
    //
    // It states its own rows on `##ROWS##` (one table, section `WRITE LADDER`, emitted before the
    // human table), prints ONE null block of nine pairs — one per arm per rung — owns its own
    // table printer so `--only` does not reach it, and honours the third positional as the batch.
    // The phase list is NINE SUBJECTS THEN NINE TWINS so a rotation can never make a twin its
    // subject's predecessor, and the schedule is `shift = (r >> 1) % len` so each shift runs once
    // forward and once backward. BATCH 1 IS THE ONE TO RUN: the passes per rung are 1024/256/64,
    // the reciprocal of the writes per port, which puts the same 8.4M writes and the same
    // 0.0119 ns-per-write grain in every region. The escalation is `write-ladder 100 2` and never
    // more rounds. Under a minute. RUN IT ALONE.
    //
    // IF THE STALE-`dist/` GATE REFUSES THE RECORDING, `--no-record` IS SAFE HERE as it is for
    // `receiver-spelling`, `walk-record` and `receiver-maps`: that gate exists because this suite
    // measures built packages, and this axis reads none.
    'write-ladder': ['./src/benchmarks/axes/mechanism/write-ladder.ts', 'benchmarkWriteLadder'],
};

// Axes with a participant that is BUILT rather than compiled by the dev server (see
// bench/build/). The build is re-run before the axis, every time, because nothing else can
// notice a stale artifact: the loader in src/benchmarks/participants/angular/app.ts can tell that
// public/bench/angular.js is MISSING, but not that it is older than its source — and a
// benchmark quietly measuring last week's code is exactly the failure this repo has been
// burned by before.
//
// EMPTY RIGHT NOW, and that is not an oversight: Angular's packages are not installed and the
// participant is not registered in either axis, so building it would fail an axis that does not
// measure it. The build script, its app and its loader are all in place — re-add the two entries
// in the SAME change that installs `@angular/*` and registers the participant, never separately.
const BUILT_PARTICIPANTS = {};

// RECORD THE TABLE SO A LATER RUN CAN BE READ AGAINST IT — `--record=<label>`.
//
// It exists because a single run's numbers cannot answer "did this change cost anything".
// Measured: three runs of `toggle` with only one line of the library different:
// `mikado` came out 8.000 / 9.300 / 8.300, `solid` 9.900 / 11.900 / 10.600, `react` 33.100 /
// 39.800 / 36.200 — participants NOTHING in the change could touch, moving 10-19% between runs.
// A before/after read straight off two tables is therefore mostly a reading of the machine.
// `compare-axis.mjs` divides that out using those same untouched rows; this flag is what gives
// it something to divide.
//
// It is a flag rather than a fourth positional so that `--record` composes with the rounds/batch
// arguments already documented above, in either order.
// NARROW THE FIELD — `--only=<name>[,<name>…]`.
//
// The loop this serves is one question asked often: THIS participant against ITS floor, on THIS
// case. Answering it today means running a twenty-row table and reading two lines out of it.
//
// IT IS ONE FLAG AND IT SELECTS PARTICIPANTS, NOT SECTIONS. Several axes print several tables from
// separate `abBench` calls (`virtual-list` prints four: CENSUS, WIDE, REORDER, SINGLE); choosing
// among THOSE is a different mechanism and is deliberately not this flag — see the note above
// `page.addInitScript` below for what it would take.
//
// SPELLING. Row names in this suite are not identifiers — `floor·rebuild·owned` uses U+00B7 — so
// the harness compares a token to a row name after lowercasing both and collapsing every run of
// non-alphanumerics to one `.`. `floor.rebuild.owned` and `floor-rebuild-owned` therefore both
// select `floor·rebuild·owned`, and nobody has to get a middle dot through a shell.
//
// A NAME THAT IS IN NO TABLE OF THE AXIS FAILS THE RUN — see `unmatched` after the run below. A
// typo that silently ran everything would be worse than having no flag at all.
// ═══ RECORDING IS THE DEFAULT, AND DISCARDING A RUN IS THE THING YOU HAVE TO TYPE ═══
//
// `--record=<label>` used to be OPT-IN, and the failure mode that shape has is not a typo — it is
// forgetting. Ten-plus axes were once run back to back over more than an hour of somebody
// else's laptop, every one of them a Playwright browser, and not one line was written: the newest
// file in `measurements/` was the day before. The figures were read off a terminal, quoted into a
// report, and existed nowhere the reader could open. An hour of CPU produced nothing.
//
// AND IT WAS WORSE THAN LOSING THE NUMBERS. The stale-`dist/` gate below fires on the RECORDING
// path only — a deliberate choice, so an exploratory run may be as stale as it likes. With
// recording opt-in, "exploratory" was the default, so those runs were never checked against the
// build at all: every one of them could have been measuring last week's code with nothing to say
// so. The two mistakes compose, and the flag was what let them.
//
// SO THE DEFAULT INVERTED. A run records under `EXO_DEFAULT_LABEL` unless `--no-record` is passed,
// which makes throwing a run away a decision somebody made rather than one they forgot, and arms
// the freshness gate on the ordinary path — where it refuses UP FRONT, before the browser starts,
// instead of after the hour is spent.
//
// `latest` AND NOT `published`: the default must never overwrite the file a doc cites. A recording
// meant as evidence is still named by hand.
const EXO_DEFAULT_LABEL = 'latest';

const argv = process.argv.slice(2);
let recordLabel = EXO_DEFAULT_LABEL;
let onlySpec = null;
// THE BUILD-MODE GATE IS ON BY DEFAULT, and the flag exists to be reached for rather than relied
// on. Twice this suite published numbers taken against a competitor's DEBUG build, and both times
// the settings that select a production build were correct in somebody's memory and wrong on disk.
// `scripts/check-build-modes.mjs` is the question asked out loud; skipping it is a choice an
// operator makes on the command line, in a run that then cannot claim to have checked.
let buildCheck = true;
const positional = [];
for (const arg of argv) {
    if (arg.startsWith('--record=')) recordLabel = arg.slice('--record='.length);
    else if (arg === '--no-record') recordLabel = null;
    else if (arg.startsWith('--only=')) onlySpec = arg.slice('--only='.length);
    else if (arg === '--no-build-check') buildCheck = false;
    else positional.push(arg);
}
const onlyTokens =
    onlySpec === null
        ? []
        : onlySpec
              .split(',')
              .map((t) => t.trim())
              .filter((t) => t !== '');

const axisName = positional[0];
const rounds = positional[1] === undefined ? undefined : Number(positional[1]);
const batch = positional[2] === undefined ? 1 : Number(positional[2]);
// A FOURTH POSITIONAL, FORWARDED BLIND, BECAUSE ONE AXIS NEEDS A SECOND REPETITION KNOB.
//
// `teardown-floor` prints two tables bound by OPPOSITE things: Table 1 is bound by MEMORY (a
// repetition holds one mounted 641-element app and all of them stand at once, so the batch buys
// ticks with live set), and Table 2 is bound by the HEAP (a cycle region must demand more
// allocation than the nursery holds or V8 collects nothing inside it — and a cycle builds and
// drops its subject inside the timed span, so its factor costs no live set at any size). One
// number cannot serve both, and serving Table 2 through the batch is what made the axis ask for
// batch 128 = 5120 standing apps.
//
// It is `undefined` when absent so every axis keeps its own default, and it is forwarded to axes
// that take two parameters without effect — an extra argument to a JS function is ignored. Until
// this existed the axis's own refusals printed a command line whose fourth number was silently
// dropped: the operator would rerun exactly what was asked for and be refused identically.
const extra = positional[3] === undefined ? undefined : Number(positional[3]);
if (!AXES[axisName]) {
    console.error(`Unknown axis "${axisName}". Options: ${Object.keys(AXES).join(', ')}`);
    process.exit(2);
}
if (recordLabel !== null && recordLabel === '') {
    console.error('--record needs a label, e.g. --record=before');
    process.exit(2);
}
if (onlySpec !== null && onlyTokens.length === 0) {
    console.error(
        '--only needs at least one participant, e.g. --only=exodra,floor.rebuild.owned\n' +
            '  (a bare `--only=` would narrow the field to nothing, which is not a run)'
    );
    process.exit(2);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// A RECORDING IS A MEASUREMENT OF `dist/`, NEVER OF `src/`, AND THIS REFUSES TO PRETEND OTHERWISE.
//
// Every participant here resolves `@exodra/*` to a package's BUILT output. An axis was once
// run to test a change that had landed in `packages/string/src` and not been built: `grep -c
// renderExoInstanceOn packages/string/dist/index.js` returned 0, and the axis dutifully measured
// the previous code. THE SYMBOL IN THAT COMMAND IS THE ONE THE FUNCTION HAD ON THE DAY — it has
// since been renamed to `renderExoInstanceOnConnector`, and the old name is kept here because a
// forensic note whose reproduction names today's symbol reproduces nothing. Every row came back
// byte-identical to the run before it. That was caught only because identical-to-the-last-digit is
// not a shape real timings take — had the stale run drifted a single grain it would have read as an
// honest null result and gone into a published page.
//
// So the check is here rather than in the operator's head, and it is on the RECORDING path only: a
// bare exploratory run may be as stale as it likes, but a file that will be cited must not be.
const staleSources = () => staleExoDistPackages(rootDir);

if (recordLabel !== null) {
    console.log(
        `📝 recording as \`${recordLabel}\` — pass --no-record for a reading that is thrown away`
    );
    const stale = staleSources();
    if (stale.length > 0) {
        printStaleExoDist(stale, 'RECORD');
        console.error(
            '\n  Run `npm run build:all` at the repository root and record again. To take an\n' +
                '  exploratory reading against the build as it stands, pass `--no-record`.\n'
        );
        process.exit(3);
    }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// A NARROW RUN MAY NEVER BE RECORDED UNDER A LABEL A FULL RUN COULD USE.
//
// WHY THIS IS NOT A STYLE POINT. A recording is cited by axis + label + row, and BOTH consumers
// resolve it that way: `scripts/compare-axis.mjs` opens `.gate/<axis>.<label>.json` by name, and
// `scripts/check-doc-numbers.mjs` enumerates every `.json` in `.gate/` and `measurements/` and
// makes each one a source a published figure may be traced to. So a filtered run that wrote
// `.gate/toggle.published.json` would replace the twenty-row table a docs page cites with a
// two-row one — and every check downstream would keep passing, because the row it cites is still
// in the file. Nothing would look wrong.
//
// THE RULE, AND IT IS A SUFFIX RATHER THAN A REFUSAL. Recording a narrow run is exactly what the
// loop wants — two narrow runs are what `compare-axis.mjs` divides one by the other — so refusing
// outright would push an operator into recording wide runs they did not need. Instead the label
// grows a marker DERIVED FROM THE FILTER, so:
//   * it can never equal a full run's label (`+only-` cannot appear in a bare one — a full run's
//     label is whatever the operator typed, and this text is appended, never substituted);
//   * two different filters under one base label cannot overwrite each other, because the slug is
//     the filter;
//   * the file is still flat in `.gate/`, so `npm run gate -- <axis> <labelA> <labelB>` works on
//     two narrow runs with the printed labels.
// AND THE FILE SAYS SO IN ITS OWN CONTENT — `partial: true` plus the tokens — so a reader who finds
// it does not have to parse the name, and `check-doc-numbers.mjs` skips `partial` recordings rather
// than offering them as evidence.
//
// THE STALE-`dist/` GATE ABOVE IS UNCHANGED AND STILL ARMED: it fires on `recordLabel !== null`,
// which a narrow run sets like any other. A narrow reading against last week's build is the same
// lie as a wide one.
const onlySlug = () => {
    const parts = onlyTokens.map((t) =>
        t
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    );
    const joined = parts.join('_');
    return joined.length <= 48 ? joined : `${joined.slice(0, 40)}_and${parts.length}`;
};
const diskLabel =
    recordLabel === null
        ? null
        : onlySpec === null
          ? recordLabel
          : `${recordLabel}+only-${onlySlug()}`;
if (diskLabel !== null && diskLabel !== recordLabel) {
    console.log(
        `📎 --only is set, so this recording will be written as \`${diskLabel}\` and marked\n` +
            `   \`partial\`. It cannot be cited as \`${recordLabel}\` and cannot overwrite a full run.`
    );
}

// The one line `src/harness.ts:124` prints per participant: a name padded to 7, a colon, then
// min / p25 / median / p75 / max, and a ★ on the fastest. Every axis shares that printer, so
// one pattern reads them all — and anything that does not match it (the title, the column
// header, the ranking sentence, a gate line) is not a row and is skipped rather than guessed at.
const ROW = /^([A-Za-z0-9_]+)\s*:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/;

// THE SECOND TABLE SHAPE — the one the FLOOR axes print, and the reason they could not be recorded.
//
// `mount-floor`, `update-floor`, `hydrate-floor` and the phase axes print a REPS column and names that are not identifiers: `clone·twin`, `clone dom→page`,
// `insert page-owned`. The regex above wants `name: n n n n n` and matched none of them, so
// `--record` on any of those axes wrote nothing and said "the axis printed no table rows". The
// three floors are the strongest evidence this repository has and not one of them could be
// committed as evidence at all.
//
// Anchored on the TAIL rather than the head: the last six fields are reps plus the five statistics,
// and everything before them is the name however it is spelled. The header row cannot match,
// because `reps min p25 median p75 max` are not numbers.
// AND A THIRD SHAPE — `update-floor` prints a name and FIVE statistics with no reps column, so
// neither of the two above matched it and `--record` on the axis that measures our update bound
// wrote nothing. Tried last, because it is the loosest: any line ending in five numbers matches, so
// `ROW` and `ROW_REPS` get first refusal. The report lines cannot collide with it — their numbers
// carry a `+`/`-` sign, which `[\d.]+` does not admit.
// THE SECTION HEADER, so a row can be told apart from its namesake in another section.
//
// `update-floor` prints one table PER TRANSITION and every one of them names its rows `exodra`,
// `floor`, `floor·twin`. A flat recording therefore could not tell the `exodra` of `wide` from the
// `exodra` of `text-one`, and `check-doc-numbers.mjs` refused to trace those tables at all — which
// left the axis that measures our update bound publishing figures nothing on disk could check.
//
// Names are qualified ON COLLISION ONLY, and the FIRST of the pair is renamed too, so an axis whose
// row names are already unique — `mount-floor`, `initial-render` — records exactly what it always
// did and every marker written against it keeps working.
// Two spellings, because two axes name their sections differently and both need qualifying:
// `update-floor` writes `── WIDE — …` and `hydrate-floor` writes `APP — 641 elements …`. Anchored
// on an ALL-CAPS name followed by an em dash so an ordinary sentence cannot be mistaken for one.
const SECTION = /^(?:──\s*)?([A-Z][A-Z0-9·-]*)\s+—/;

// AND THE FENCE THAT KEEPS THE THREE ROW SHAPES HONEST.
//
// The loose shapes above match ANY line ending in five or six numbers, and an axis prints more
// tables than one. `hydrate-floor` prints a CENSUS first — `app 1 80 641 18543` — and the recorder
// ate it, writing a "measurement" whose median was 641 elements and whose p75 was 18543 characters
// of markup. A recording nobody can tell from a real one is worse than no recording, because the
// numbers gate would happily trace a published figure to it.
//
// So a row is only recorded BETWEEN a statistics header and the blank line that ends its table.
// The header is recognised by its own column names, which no data line carries.
const TABLE_HEAD = /\bmin\b.*\bp25\b.*\bmedian\b/;

const ROW_PLAIN = /^\s*(\S.*?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/;

// A FIFTH SHAPE, AND IT IS WHY THE LADDER OF SHAPES IS THE HAZARD RATHER THAN
// ANY ONE OF THEM. `bank-vs-clone` prints NINE fields — name, reps, five statistics, `ns/card` and
// `B/card`. Nothing here matched nine, so the line fell all the way through to `ROW_PLAIN`, whose
// lazy name swallowed the first three numbers and whose five statistics were then read off the
// LAST five fields. The recording that reached `measurements/` said
// `"name": "clone                  40   0.0475   0.0525"`, `p75: 656.3` (nanoseconds) and
// `max: 16` (bytes), and it was published, cited in a memory as the source of a ratio, and quoted
// to the owner as "recorded" before anybody opened it.
//
// THE LESSON IS ABOUT THE FALLBACK, NOT THE COLUMN COUNT. A ladder that ends in a permissive
// pattern cannot fail loudly: an unrecognised row does not go missing, it arrives WRONG, and a
// wrong row outlives a missing one because a missing one gets noticed. If a sixth column pair ever
// appears, add its shape here — and see the arity check after the ladder, which now refuses a row
// whose name still holds digits rather than letting it through.
const ROW_REPS_TAIL2 =
    /^\s*(\S.*?)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/;

// A FOURTH SHAPE, and it is the reason the other three must be tried most-specific-first.
// `hydrate-floor` prints a SEVENTH column — nanoseconds per element — so its rows carry reps, five
// statistics and one more number. Tail-anchored, `ROW_REPS` slid one field along and captured
// `mount 40 0.2750` as the NAME. A row whose name contains its own reps is not a row anybody can
// look up, and it collided with the same row in the next census.
const ROW_REPS_TAIL =
    /^\s*(\S.*?)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/;

const ROW_REPS = /^\s*(\S.*?)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/;
// The clock's real granularity, which several axes already observe and print for themselves
// ("the observed timer quantum (0.100 ms)"). It is recorded because a median made of
// tick-quantised samples can move by a WHOLE TICK for no reason, so the smallest move a fast row
// can honestly show is `quantum / its own median` — a per-row floor that a scatter estimate
// pooled over the whole table cannot see. Caught by running the gate against two
// IDENTICAL builds: it flagged `exodraKept` (3.3 → 3.0 ms) as a real +2.1% regression.
const QUANTUM = /observed timer quantum \(([\d.]+) ms\)/;

// THE RETAINED-HEAP LINE, RECORDED BECAUSE NOTHING ON DISK CARRIED IT.
//
// `docs-site/docs/benchmarks.md`'s memory table has been marked `stale` for as long as the marker
// has existed, and the reason written there is exact: "the axis IS recorded now, but a recording
// holds timing rows only — no .gate file carries a heap row at all, so nothing on disk can check
// these five numbers". The axis has always PRINTED them; the recorder simply never looked.
//
// Shape of the line, printed by the axis after its table:
//   retained heap: exodra 0.10MB · solid 0.27MB · svelte 0.41MB · ...
//
// Recorded as a separate `heap` map rather than as fields on the timing rows, because it is a
// different measurement with different stability — heap is app-shaped and sensitive to WHEN it is
// sampled, and it has moved more between runs than any timing row on that page. Keeping it in its
// own key means `compare-axis.mjs`, which knows about `rows`, keeps ignoring it rather than
// silently gating on a quantity nobody calibrated a floor for.
const HEAP_LINE = /retained heap:\s*(.+)$/;
const HEAP_PAIR = /([A-Za-z0-9_]+)\s+([\d.]+)\s*MB/g;

// THE NULL BLOCK — WHAT THE AXIS COULD AND COULD NOT TELL APART, WHICH WAS BEING THROWN AWAY.
//
// `teardown-floor`, `ssr-floor`, `mount-floor` and `hydrate-floor` each run PAIRS WHOSE TRUE
// DIFFERENCE IS ZERO BY CONSTRUCTION — two separately declared programs, or two independently
// produced copies of one — and print what came back:
//
//     null            bias      noise     p75       worst     what it is
//     book          0.000000  0.001250  0.002500  0.003750  |book·flat − book·twin|, true Δ = 0
//     RESOLUTION FLOOR      0.001250 ms = max(bias, noise) over both families, …
//
// That block is the axis's own resolution, measured in the same session as everything it judges,
// and until now the recorder scraped the TABLE ROWS AND THE QUANTUM AND NOTHING ELSE. So a
// recording could say a rung measured 0.0125 ms and could not say whether the instrument that
// measured it can see 0.0125 ms at all. `ssr-floor`'s own header names two of its predictions (P3
// and P7) as unjudgeable for exactly this reason and asks for this change by name.
//
// RECORDED AS A LIST OF BLOCKS, NOT A MAP. `hydrate-floor` prints one block per census and
// `update-floor` one per transition, so a map keyed by the pair's name would silently collapse
// five nulls into one. `section` is the last section header seen BEFORE the block — for an axis
// that prints its nulls once at the end (`ssr-floor`, `teardown-floor`, `mount-floor`) that is
// simply the last table it printed and does not mean the block belongs to it.
//
// THE UNIT IS RECORDED BECAUSE IT IS NOT ALWAYS THE SAME AS THE TABLE'S. `update-floor` reports
// microseconds; everything else here reports milliseconds. A resolution figure read at the wrong
// unit is 1000× wrong in the direction that flatters.
//
// WHAT IS NOT CAPTURED, AND SAID OUT LOUD RATHER THAN LEFT TO BE DISCOVERED: `update-floor` does
// not use this tabular printer. It writes each null as one inline `CONTROL bias … noise … p75 …
// worst … µs` line per transition, which none of the three patterns below match, so its nulls are
// still console-only. Extending to that shape is a second pattern, not a redesign.
const NULL_HEAD = /^\s*null\s+bias\s+noise\s+p75\s+worst\b/;
// Four six-decimal numbers in a row and then prose. `f6` is `toFixed(6)` in all four axes, and no
// statistics row in this suite prints six decimals — which is what keeps this from matching a table.
const NULL_ROW =
    /^\s*(\S+)\s+(\d+\.\d{6})\s+(\d+\.\d{6})\s+(\d+\.\d{6})\s+(\d+\.\d{6})\s+(\S.*)$/;
const NULL_RESOLUTION = /^\s*RESOLUTION FLOOR\s+(\d+\.\d{6})\s*(ms|µs|us)\b/;

// The axes that are KNOWN to print a null block. Recording one of them without capturing it is a
// silent regression in the recorder — the exact failure this block was added to end — so it is
// reported at the end of the run rather than left for a reader of the JSON to notice.
const AXES_WITH_NULLS = new Set([
    'teardown-floor',
    'ssr-floor',
    'mount-floor',
    'hydrate-floor',
    // THE FAT-UPDATE AXIS, which gained its null pair after the recording in
    // `.gate/app-update.published.json` was taken — that file carries `"nulls": null`, which is
    // why the row it published (`exodra` 5.02 against the `stage0` ceiling's 4.68) could be read
    // as an ordering and not as a size. `exodra·twin` is a second, separately declared copy of the
    // whole app, and the axis prints the `RESOLUTION FLOOR` block below its table. Listed here so
    // that a future recording which LOSES that block is reported as the regression it would be.
    'app-update',
    // The one member that is not a floor axis. `context-cost` prints THREE null pairs (its two
    // independently declared `parentNode` walks at each depth, its two frame chains, and its two
    // slot pools) and a `RESOLUTION FLOOR` line in MICROSECONDS — its whole group A answer is
    // "is the climb distinguishable from the walk it contains", which is a comparison against that
    // floor and unreadable without it.
    'context-cost',
    // The form-A/form-B axis. It prints FOUR null blocks — one per table, each over BOTH of its
    // pairs (`A`/`A·twin` and `B`/`B·twin`) — because a null is only a null for the shape it was
    // taken on and the four scenes differ by two orders of magnitude in cost. Its whole claim is a
    // set of DIFFERENCES between two ways of writing one component, and a difference with no
    // resolution beside it is not a size; listed here so that a recording which loses the blocks is
    // reported as the regression it would be.
    'machine-vs-cells',
    // THE LIST AXIS, which gained its controls after `.gate/list-update.latest.json` was taken —
    // that file carries no `nulls` and a `"quantum": null`, which is why the two fastest rows in it
    // (`exodraOps` and `mikado`, both `min 0.000 · median 0.100 · max 0.200` on a 0.100 ms clock)
    // could be published as an ordering when they are zero, one and two TICKS, and why the axis's
    // own headline read `17.0× slower than exodraOps` off a denominator of one tick. It declares TWO
    // pairs rather than one because it straddles two magnitudes: `exodraTold`↔`exodraTold·twin` on the
    // told side, where the closest call in the table lives, and `exodra`↔`exodra·twin` on the derive
    // side. Listed here so a recording that loses either block is reported as the regression it
    // would be.
    'list-update',
    // THE HANDLER-COUNT AXIS, which prints TWO blocks of NINE pairs — one per arm (floor, wire,
    // machine) per rung (n1, n4, n16), on the mount table and again on the click table. Nine and not
    // one because this axis's rule is that a gap is judged against the resolutions of ITS OWN TWO
    // ROWS, so a block that collapsed to a single figure would be the exact defect the rule exists
    // to prevent. Listed here so a recording that loses either block is reported as the regression
    // it would be.
    'handler-count',
    // THE SERVER SIBLING OF THE ABOVE. It prints ONE block of NINE pairs — one per arm (floor,
    // wire, machine) per rung (n1, n4, n16) — because its rule is the same one: a difference is
    // judged against the resolutions of ITS OWN two rows, so a block that collapsed to a single
    // figure would be the exact defect the rule exists to prevent. Its whole output is DIFFERENCES
    // (what one more door costs, per arm), and a difference with no resolution beside it is not a
    // size. Listed here so a recording that loses the block is reported as the regression it would
    // be.
    'door-count',
    // `port-writer-crossover` STOOD HERE TOO — one block of NINE pairs, one per arm (floor, lookup,
    // writer) per rung (w1, w8, w32) — and it is struck with the axis. The reasons are recorded at
    // its entry in `AXES` above, where a reader looking for the axis will land first.
    //
    // ITS REBUILD PRINTS TWO BLOCKS, and both are load-bearing rather than decorative. THREE pairs
    // on the MOUNT table (one per arm, µs per instance) and NINE on the UPDATE table (one per arm
    // per rung, µs per write) — separate blocks because a null is only a null for the shape it was
    // taken on, and this axis's two phases differ by orders of magnitude in what one reading covers.
    // Its whole output is DIFFERENCES — what a hand-out costs, what a door costs per write — and a
    // difference with no resolution beside it is not a size. It is the axis whose headline verdict is
    // a REFUSAL derived from these blocks, so a recording that lost them would turn "the instrument
    // cannot see this" into "the instrument saw nothing", which are opposite claims. Listed here so a
    // recording that loses either block is reported as the regression it would be.
    'port-write-doors',
    // THE FOUR-ARM SERVER AXIS. It prints ONE block of FOUR pairs — one per arm (floor, walk,
    // prototype, closure) — and it is the block every verdict on that axis reads: its whole output
    // is DIFFERENCES between four spellings of one door, and a difference with no resolution beside
    // it is not a size. It is also the axis whose expected headline is a REFUSAL — (P3) predicts
    // that at least one of the three door-to-door pairs lands under four grains — so a recording
    // that lost this block would turn "the instrument cannot see this" into "the instrument saw
    // nothing", which are opposite claims. Listed here so a recording that loses it is reported as
    // the regression it would be.
    'door-shape',
    // TWO null blocks — one per table, three pairs on `WALK` and four on `CLONE·WALK` — because a
    // null is only a null for the shape it was taken on and the two tables differ by the whole
    // cost of a `cloneNode`. Its headline (P1) is a difference of two spellings of one loop, and a
    // difference with no resolution beside it is not a size.
    'walk-record',
    // ONE null block of seven pairs, one per arm, across both of its tables — every arm's twin is
    // a separate declaration whose true difference is zero. Its headline (P1) and its own killer
    // (P2) are both differences between two spellings of one loop, and a difference with no
    // resolution beside it is not a size.
    'receiver-maps',
    // ONE null block of NINE pairs — one per arm (floor, indexed, direct) per rung (n1, n4, n16).
    // Nine and not one because this axis's rule is that a gap is judged against the resolutions of
    // ITS OWN two rows, and its rows straddle a sixteen-fold range in writes per instance, so a
    // block that collapsed to a single figure would be the exact defect the rule exists to
    // prevent. Its whole output is DIFFERENCES — what one more write costs on each arm, and where
    // two arms cross — and a difference with no resolution beside it is not a size. Its headline
    // may well be a REFUSAL ("same slope, different intercept, no crossing"), so a recording that
    // lost this block would turn "the instrument cannot see this" into "the instrument saw
    // nothing", which are opposite claims.
    'write-ladder',
]);

const recorded = [];
/** Null blocks, in print order. See `NULL_HEAD`. */
const nulls = [];
/** The block currently being filled, or `null` outside one. */
let nullBlock = null;

// WHAT THE AXIS REFUSED, KEPT WITH WHAT IT PRINTED.
//
// Every axis in the floor and phase family disowns its own numbers when a gate fails, and it does
// so by PRINTING (`refuse()` is `console.log('❌ …')`), not by throwing — deliberately, so one
// unreadable table does not take a readable one down with it. `teardown-floor` prints two tables
// and can refuse the second alone: at batch 32 its CYCLE region grew the heap by ~9.6 kB per cycle
// against a 1 kB threshold, so it refused Table 2 by name and asked for batch 128, while Table 1 —
// which does not depend on it — stood. (THAT ~9.6 kB WAS growth ÷ cycles, an arithmetic since
// withdrawn — the growth is flat in the cycle count, so the ratio measured the knob. The example
// stands as an example of ONE TABLE REFUSING ALONE, which is all it is used for here.)
//
// THE HAZARD THAT CREATES, AND WHAT THIS CLOSES. The recorder scrapes rows out of both tables and
// writes them into one `rows` array, so a REFUSED row lands in the artefact looking exactly like an
// accepted one, and `check-doc-numbers.mjs` would happily trace a published figure to it. Keeping
// the refusal text means the file says which of its own numbers the instrument disowned.
const refusals = [];
/**
 * `--only` tokens that matched NO participant in ANY table this axis printed. Filled after the run
 * from the harness's own record of what it matched, and it is fatal: the run is not recorded and
 * the process exits non-zero. See the check after `page.evaluate` below.
 */
let unmatchedOnly = [];
/** The process's exit status. See the `finally` at the bottom for what each value means. */
let exitCode = 0;
/** The section header last seen, used to qualify a row name that collides. See `SECTION`. */
let section = null;
/** Whether the printer is inside a statistics table. Only then is a line a row. See `TABLE_HEAD`. */
let inTable = false;
/**
 * Whether this axis stated its own rows on a `##ROWS##` line. Latches ON and never off: from the
 * first emitted table the shape ladder is disabled for the rest of the run, so a table cannot be
 * both emitted and scraped. See the `##ROWS##` branch in the console handler.
 */
let emitted = false;
/**
 * Pushes a row, qualifying BOTH it and the earlier one when their names collide across sections.
 * Qualifying only the second would leave the first looking unqualified and still ambiguous.
 */
/**
 * ROWS WHOSE NAME SWALLOWED A NUMBER, refused loudly instead of recorded. Added after a
 * nine-column table fell through the shape ladder into its most permissive pattern and produced
 * `"name": "clone                  40   0.0475   0.0525"` with nanoseconds in `p75` and bytes in
 * `max` — a recording that was published, cited as the source of a ratio, and quoted as "recorded"
 * before anybody opened it.
 *
 * THE CHECK IS ON THE NAME BECAUSE THAT IS WHERE THE DAMAGE IS VISIBLE. Every misparse of this kind
 * has the same signature: the lazy `(\S.*?)` ate columns it was not meant to reach, so the name
 * ends in whitespace followed by a bare number. A legitimate row name in this suite is a label like
 * `clone·twin`, `floor·record` or `+head` — none of them ends in a run of spaces and digits.
 *
 * It THROWS rather than warning. A warning on a benchmark run scrolls past between two censuses and
 * a refusal line, which is exactly how the corrupt file reached `measurements/`.
 */
const NAME_ATE_A_COLUMN = /\s\d[\d.]*$/;

/**
 * THE PRINTER'S COLUMN SEPARATOR, WHICH THE LAZY NAME CAPTURE SWALLOWS. A table that writes its name
 * column as `name:` — or as a padded `name` followed by `:` — leaves `(\S.*?)` no way to stop before
 * the colon: the pattern after it demands whitespace, and a colon is not whitespace, so the name
 * grows until it has eaten both. `toggle` prints that shape and `measurements/toggle.with-floor.json`
 * carries the damage: SIX of its twenty rows are named `TOGGLE/floor·rebuild·owned:` while the other
 * fourteen are bare, so half the table cannot be looked up by the name the axis calls it.
 *
 * IT IS STRIPPED HERE RATHER THAN IN THE SHAPE LADDER because every shape shares the same lazy
 * capture and would need the same repair five times over. No participant, phase or rung in this
 * suite ends in a colon — the names are labels like `exodra`, `floor·rebuild·owned`, `pool·slot·first`
 * — so a trailing colon is always the separator and never data.
 *
 * NOTE FOR ANYONE COMPARING AGAINST AN OLDER RECORDING: files written before this strip hold the
 * colon-bearing spelling for exactly those rows whose printed name reached the colon, and a lookup
 * across the two spellings will miss. That is a real artefact on disk, not a hypothetical caller.
 */
const NAME_ATE_THE_SEPARATOR = /\s*:\s*$/;

const pushRow = (row) => {
    row.name = row.name.replace(NAME_ATE_THE_SEPARATOR, '');
    if (NAME_ATE_A_COLUMN.test(row.name)) {
        throw new Error(
            `run-one-axis: the row parser produced the name ${JSON.stringify(row.name)}, which ` +
                'ends in a column it should not contain. This table has more fields than any ' +
                'shape in the ladder above knows, so the line fell through to a permissive ' +
                'pattern and every statistic on it is off by that many places. Add the shape — ' +
                'do NOT record this run.'
        );
    }
    // QUALIFIED WHENEVER A SECTION IS KNOWN, not only on a collision. Qualifying on collision left
    // the LAST section's rows bare — by the time they were pushed the earlier namesakes had already
    // been renamed, so nothing clashed — and a table where four transitions are qualified and the
    // fifth is not is worse than either rule applied consistently.
    //
    // FALSE FOR `toggle`, AND CORRECTED HERE. What stood here claimed `initial-render`,
    // `app-update` and `toggle` print no `── NAME` header "(checked by running all three)", so their
    // rows "record exactly the names they always did". The recording on disk says otherwise:
    // `measurements/toggle.with-floor.json` holds `"name": "TOGGLE/floor·kept·owned"`, and a
    // `TOGGLE/` prefix can only come from `section !== null` two lines below. So `toggle` DOES print
    // a header this matches, and its recorded names did change.
    //
    // It is worth naming what kind of error that was, because the file argues about this class of
    // thing elsewhere: the comment was a claim about a RUN, written in the past tense, that nothing
    // re-checks. The evidence that refutes it was sitting in `measurements/` the whole time.
    //
    // The rule below is unchanged and stays: qualify whenever a section is known, not only on a
    // collision — a table where four transitions are qualified and the fifth is not is worse than
    // either rule applied consistently.
    if (section !== null) {
        row.section = section;
        row.name = `${section}/${row.name}`;
    }
    recorded.push(row);
};
/** Retained heap per participant, MB — filled from the axis's own printed line. See `HEAP_LINE`. */
const heap = {};
let quantum = null;

function buildParticipant(script) {
    return new Promise((resolve, reject) => {
        console.log(`🔨 building participant: ${script}`);
        const p = spawn(process.execPath, [script], { cwd: rootDir, stdio: 'inherit' });
        p.on('error', reject);
        p.on('exit', (code) =>
            code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))
        );
    });
}

let viteProcess = null;
function startVite() {
    return new Promise((resolve, reject) => {
        viteProcess = spawn('npm', ['run', 'dev'], {
            cwd: rootDir,
            shell: true,
            stdio: 'pipe',
            env: { ...process.env, BROWSER: 'none' },
        });
        let ready = false;
        viteProcess.stdout.on('data', (d) => {
            const s = d.toString();
            if (!ready && (s.includes('Local:') || s.includes('http://localhost'))) {
                ready = true;
                setTimeout(resolve, 2000);
            }
        });
        viteProcess.on('error', reject);
        setTimeout(() => {
            if (!ready) reject(new Error('vite timeout'));
        }, 30000);
    });
}
function stopVite() {
    if (viteProcess) {
        viteProcess.kill('SIGTERM');
        viteProcess = null;
    }
}

async function run() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
    });
    const page = await browser.newPage();
    // THE FILTER CROSSES INTO THE PAGE AS A GLOBAL, AND THAT IS WHY NO AXIS HAD TO CHANGE.
    //
    // Every axis function here takes its arguments POSITIONALLY and forwards them blind — `rounds`,
    // `batch`, and a fourth that exists for one axis's cycle factor — so threading a filter through
    // that signature would mean editing every axis and would collide with the next knob that needs
    // a positional. `addInitScript` runs before any page script on EVERY navigation, including the
    // warm-up reload below, so `src/harness.ts` finds it on its own at `abBench` time.
    //
    // WHAT SECTION SELECTION WOULD TAKE, since it cannot ride on this. A section is a separate
    // `abBench` CALL made by the axis body, with the axis's gates and censuses interleaved between
    // the calls — so nothing inside `abBench` can know it is one of several, or skip one, or skip
    // the gate code that runs before it. Selecting one would have to be read BY THE AXIS, in its own
    // body, around its own `abBench` calls, in each of the axes that print more than one table
    // (`virtual-list`, `hydrate-floor`, `update-floor`, `teardown-floor` …) — and each of those
    // would have to keep running every gate and refusal of the sections it skipped, which is the
    // hard half. It is a later change, and when it comes it should be a NAMED options object
    // (`{ section }`) read from another global, never a fifth positional: the fourth is already
    // spoken for and forwarded blind.
    if (onlySpec !== null) {
        await page.addInitScript((spec) => {
            window.__EXO_BENCH_ONLY__ = spec;
        }, onlySpec);
    }
    page.on('console', (msg) => {
        const t = msg.text();
        // TAKEN BEFORE THE ✅/❌ GATE, because it carries neither. The gate exists so ordinary page
        // chatter is not mistaken for output, and a machine line is not chatter — it is the axis
        // stating its rows. It is deliberately NOT echoed: it duplicates the human table the axis
        // already printed, and a wall of JSON between two tables is how a refusal line gets missed.
        if (t.startsWith('##ROWS##')) {
            // THE CONTRACT IS ALL-OR-NOTHING PER AXIS, AND UNTIL NOW IT WAS ONLY ASKED FOR.
            //
            // `emitted` latches on THIS line, and the scrape guard below reads it — so every table
            // the axis printed BEFORE its first `##ROWS##` was already scraped and recorded. For
            // `plugin-price` and `machine-vs-cells` that never mattered, because their printed
            // tables match no shape in the ladder. It matters the moment an axis emits rows for a
            // table `abBench` printed in the standard shape: the run would record every row TWICE,
            // once scraped and once stated, and a duplicate still looks like a measurement.
            //
            // So the first emitted line DISCARDS whatever was scraped, which is what the contract
            // in `emitRecordedRows` says out loud: "an axis that adopts this emits every table it
            // wants recorded". It is said on the console rather than done quietly, because a run
            // that silently threw a table away would be the same class of defect.
            if (!emitted && recorded.length > 0) {
                console.log(
                    `ℹ️  ${recorded.length} scraped row(s) discarded: this axis states its own ` +
                        'rows on `##ROWS##`, and a table that is both emitted and scraped would ' +
                        'be recorded twice.'
                );
                recorded.length = 0;
            }
            emitted = true;
            inTable = false;
            let payload;
            try {
                payload = JSON.parse(t.slice('##ROWS##'.length));
            } catch (e) {
                // Fatal rather than skipped: the axis MEANT to record these rows, so a malformed
                // line loses a table it was told to keep — the exact failure this replaces.
                console.error(`\n✖ ##ROWS## line is not valid JSON: ${e.message}\n  ${t}\n`);
                exitCode = 5;
                return;
            }
            // AN EXPLICIT `null` CLEARS THE QUALIFIER; an absent field inherits, as it always did.
            // `pushRow` prefixes a row with `section/` whenever a section is known, so an axis with
            // ONE table whose rows are already cited by bare name would rename every row in its
            // next recording merely by adopting `emitRecordedRows`. `app-update` is exactly that
            // axis — `docs-site/docs/benchmarks.md` looks its rows up by name through a
            // `<!-- gate: axis=app-update -->` block — so it emits `"section": null`.
            if (payload.section !== undefined) section = payload.section;
            for (const r of payload.rows ?? []) {
                // `unit` and `per` ride on every ROW rather than on the file, because one axis
                // prints tables in different units — `plugin-price` reports nanoseconds per row at
                // mount and microseconds per round on refetch — and a file-level unit would make
                // one of those tables 1000× wrong for anybody who trusted it.
                pushRow({ ...r, unit: payload.unit, per: payload.per });
            }
            return;
        }
        if (t.includes('✅') || t.includes('❌')) {
            console.log(t);
            // The ✅ prefix and the star are the printer's decoration, not data; strip both before
            // matching so a row reads the same whether or not it happened to be the fastest.
            const q = QUANTUM.exec(t);
            if (q !== null) quantum = Number(q[1]);
            const h = HEAP_LINE.exec(t.replace(/^✅\s*/, ''));
            if (h !== null) {
                HEAP_PAIR.lastIndex = 0;
                let pair;
                while ((pair = HEAP_PAIR.exec(h[1])) !== null) heap[pair[1]] = Number(pair[2]);
            }
            // A ❌ line is the axis refusing something of its own. It is never a table row, so it
            // is taken here and not passed on to the row patterns.
            if (t.startsWith('❌')) {
                refusals.push(t.replace(/^❌\s*/, '').trim());
                return;
            }
            const bare = t.replace(/^✅\s*/, '').replace(/\s*★\s*$/, '');
            const sec = SECTION.exec(bare);
            if (sec !== null) {
                section = sec[1];
                inTable = false;
                nullBlock = null;
            }
            // THE NULL BLOCK, BEFORE THE TABLE FENCE. Its header does not carry `min`/`p25`/
            // `median`, so `inTable` is false throughout it and the row patterns below are never
            // reached — which is how it came to be dropped. It is parsed on its own flag.
            if (NULL_HEAD.test(bare)) {
                nullBlock = { section, unit: null, resolution: null, pairs: [] };
                nulls.push(nullBlock);
                inTable = false;
                return;
            }
            if (nullBlock !== null) {
                const nr = NULL_ROW.exec(bare);
                if (nr !== null) {
                    nullBlock.pairs.push({
                        name: nr[1],
                        bias: Number(nr[2]),
                        noise: Number(nr[3]),
                        noiseP75: Number(nr[4]),
                        worst: Number(nr[5]),
                        // The pair it was taken over, verbatim — `|book·flat − book·twin|, true
                        // Δ = 0`. Kept because a resolution figure with no statement of WHAT was
                        // subtracted from what cannot be checked by anyone reading the JSON.
                        what: nr[6].trim(),
                    });
                    return;
                }
                const nres = NULL_RESOLUTION.exec(bare);
                if (nres !== null) {
                    nullBlock.resolution = Number(nres[1]);
                    nullBlock.unit = nres[2] === 'us' ? 'µs' : nres[2];
                    return;
                }
            }
            // SCRAPING IS OFF ONCE THE AXIS HAS STATED ITS OWN ROWS — see the `##ROWS##` branch at
            // the top of this handler. A table that is both emitted and scrapable would be recorded
            // twice under one name, which is a worse artefact than a missing one because a
            // duplicate still looks like a measurement.
            if (emitted) return;
            if (TABLE_HEAD.test(bare)) {
                inTable = true;
                nullBlock = null;
                return;
            }
            if (bare.trim() === '') inTable = false;
            if (!inTable) return;
            const m = ROW.exec(bare);
            if (m !== null) {
                pushRow({
                    name: m[1],
                    min: Number(m[2]),
                    p25: Number(m[3]),
                    median: Number(m[4]),
                    p75: Number(m[5]),
                    max: Number(m[6]),
                });
            } else {
                // NINE FIELDS FIRST — see `ROW_REPS_TAIL2`. Its two trailing columns are recorded
                // under positional names because the recorder cannot know their units: on
                // `bank-vs-clone` they are `ns/card` and `B/card`, and the axis's own header is
                // what says so. `perElement` on the eight-field shape below keeps its name because
                // recordings already on disk carry that key and renaming it would silently break
                // every reader of them.
                const tail2 = ROW_REPS_TAIL2.exec(bare);
                if (tail2 !== null) {
                    pushRow({
                        name: tail2[1],
                        reps: Number(tail2[2]),
                        min: Number(tail2[3]),
                        p25: Number(tail2[4]),
                        median: Number(tail2[5]),
                        p75: Number(tail2[6]),
                        max: Number(tail2[7]),
                        trailing1: Number(tail2[8]),
                        trailing2: Number(tail2[9]),
                    });
                    return;
                }
                const tail = ROW_REPS_TAIL.exec(bare);
                if (tail !== null) {
                    pushRow({
                        name: tail[1],
                        reps: Number(tail[2]),
                        min: Number(tail[3]),
                        p25: Number(tail[4]),
                        median: Number(tail[5]),
                        p75: Number(tail[6]),
                        max: Number(tail[7]),
                        perElement: Number(tail[8]),
                    });
                    return;
                }
                const r = ROW_REPS.exec(bare);
                if (r !== null) {
                    pushRow({
                        name: r[1],
                        reps: Number(r[2]),
                        min: Number(r[3]),
                        p25: Number(r[4]),
                        median: Number(r[5]),
                        p75: Number(r[6]),
                        max: Number(r[7]),
                    });
                } else {
                    const q = ROW_PLAIN.exec(bare);
                    if (q !== null) {
                        pushRow({
                            name: q[1],
                            min: Number(q[2]),
                            p25: Number(q[3]),
                            median: Number(q[4]),
                            p75: Number(q[5]),
                            max: Number(q[6]),
                        });
                    }
                }
            }
        } else if (msg.type() === 'error') console.error('[browser error]', t);
    });
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#runAll', { timeout: 10000 });
    const [path, fn] = AXES[axisName];
    console.log(`\n📊 axis: ${axisName}\n`);
    // THE AXIS MODULE IS THE FIRST THING TO IMPORT MOST PARTICIPANTS, so importing it is what makes
    // Vite discover React, Solid, Lit and the rest and re-optimize its dependency bundle — which
    // invalidates the very import that triggered it (`504 Outdated Optimize Dep`). Importing it
    // once to WARM the server and then reloading is the whole fix; the second import finds
    // everything pre-bundled. It runs nothing, so no participant is measured on a cold module.
    await page.evaluate(
        (p) =>
            import(p).then(
                () => undefined,
                () => undefined
            ),
        path
    );
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#runAll', { timeout: 10000 });
    // ROUNDS and BATCH are overridable from the command line — `run-one-axis.js <axis> [rounds]
    // [batch] [extra]` — because the browser's clock is clamped to 0.1 ms and several axes measure
    // work that lands at one or two ticks. A `batch` of N runs N independent scenarios inside ONE
    // timed region and divides, so the difference between 0.1 and 0.2 becomes a number with digits
    // behind it instead of a single tick. Defaults are the axis's own, which is why `extra` is
    // passed only when it was given: `teardown-floor`'s cycle factor defaults in the axis itself.
    await page.evaluate(
        async ([p, f, r, b, x]) => {
            const mod = await import(p);
            if (r === undefined) await mod[f]();
            else if (x === undefined) await mod[f](r, b);
            else await mod[f](r, b, x);
        },
        [path, fn, rounds, batch, extra]
    );
    // A TOKEN THAT MATCHED NOTHING ANYWHERE IS A TYPO, AND A TYPO MUST NOT PRODUCE A RUN.
    //
    // The harness refuses a single TABLE it cannot filter at all (it prints `❌ --only matched none
    // of this table's participants` and leaves that table wide, rather than printing an empty one),
    // because a token can legitimately be absent from one of an axis's several tables. Whether it is
    // absent from ALL of them can only be known here, after the axis has finished — so the harness
    // records every token it matched and this reads the list back.
    if (onlySpec !== null) {
        const seen = await page.evaluate(() => ({
            hits: globalThis.__EXO_BENCH_ONLY_HITS__ ?? [],
            names: globalThis.__EXO_BENCH_NAMES__ ?? [],
        }));
        unmatchedOnly = onlyTokens.filter((t) => !seen.hits.includes(t));
        if (seen.names.length === 0) {
            // THE AXIS NEVER CALLED `abBench` AT ALL, AND THAT IS A WHOLE FAMILY OF THEM.
            //
            // `--only` is implemented in `src/harness.ts`, which is the printer the framework-
            // comparison axes share. The floor and phase diagnostics — `mount-floor`,
            // `update-floor`, `hydrate-floor`, `ssr-floor`, `teardown-floor`, `keystroke-floor`,
            // `schema-build`, `child-mark`, `context-cost`, `import-node-trade`,
            // `mount-phases`, `teardown-phases` — each own a `PROGRAMS`
            // array and their own table printer, and none of them goes through the harness. So the
            // flag reaches them not at all, and saying "no such participant" would send the
            // operator hunting for a spelling that does not exist.
            console.error(
                `\n✖ --only does not apply to \`${axisName}\`: it printed no table through the\n` +
                    '  shared harness. The floor and phase diagnostics each carry their own\n' +
                    '  `PROGRAMS` array and their own printer, so narrowing them is a separate\n' +
                    '  change in each axis, not this flag. Drop `--only` and run the axis whole.\n'
            );
            exitCode = 5;
        } else if (unmatchedOnly.length > 0) {
            console.error(
                `\n✖ --only: ${unmatchedOnly.map((t) => `"${t}"`).join(', ')} matched no ` +
                    `participant in any table \`${axisName}\` printed.\n` +
                    `  This axis offers: ${seen.names.join(', ')}\n` +
                    '  Names are matched case-insensitively with every run of non-alphanumerics\n' +
                    '  collapsed to `.`, so `floor.rebuild.owned` selects `floor·rebuild·owned`.\n'
            );
            exitCode = 5;
        }
    }
    await browser.close();
}

try {
    for (const script of BUILT_PARTICIPANTS[axisName] ?? []) await buildParticipant(script);
    await startVite();
    // BEFORE ANYTHING IS MEASURED, NOT AFTER. The check drives the server that is about to be
    // measured — it fetches every participant module at the URL the browser will use and reads
    // what the toolchain produced — so a development transform is found in the same bytes the
    // axis would have timed. Running it here also has a second effect worth having: any
    // dependency Vite had not yet discovered is discovered now, so the re-optimise and reload
    // that would otherwise land in the middle of a sample lands before the first one.
    if (buildCheck) {
        console.log('🔎 build-mode gate');
        const modes = await checkBuildModes({ rootDir, baseUrl: url });
        printBuildModeReport(modes);
        if (modes.failures > 0) {
            console.error(
                '\n✖ REFUSING TO RUN: a participant is compiled with a development transform, so\n' +
                    '  its numbers would describe machinery no user of it ships. This suite has\n' +
                    '  published debug-build numbers twice; the gate is here so it cannot be three.\n' +
                    '  Fix the configuration named above, delete node_modules/.vite so the cache is\n' +
                    '  rebuilt, and run again. To take a reading anyway — which may not be recorded\n' +
                    '  as evidence of anything — pass `--no-build-check`.\n'
            );
            stopVite();
            process.exit(7);
        }
    } else {
        console.log(
            '⚠️  --no-build-check: participant build modes were NOT verified for this run'
        );
    }
    await run();
    if (recordLabel !== null && unmatchedOnly.length > 0) {
        // NOT RECORDED, and the reason is not pedantry: the run happened, but it did not run the
        // field the operator asked for. A file written now would be a measurement of a field nobody
        // chose, under a label chosen for a field that was never sampled.
        console.error(
            `✖ --record=${recordLabel}: NOTHING RECORDED — ${unmatchedOnly.length} --only ` +
                'name(s) matched no participant, so this run did not measure what was asked for.'
        );
        exitCode = 5;
    } else if (recordLabel !== null) {
        if (recorded.length === 0) {
            // Louder than a silent empty file: a recording with no rows means the axis printed no
            // table (it crashed, or it is one of the diagnostics with its own printer), and a later
            // comparison against it would divide by nothing and report a confident zero.
            console.error(
                `❌ --record=${recordLabel}: the axis printed no table rows — nothing recorded`
            );
        } else {
            const dir = join(rootDir, '.gate');
            mkdirSync(dir, { recursive: true });
            // `diskLabel` IS `recordLabel` FOR EVERY FULL RUN and carries the `+only-…` marker for
            // a narrow one. See the rule above `const onlySlug`.
            const file = join(dir, `${axisName}.${diskLabel}.json`);
            // THE BATCH IS RECORDED BECAUSE IT DIVIDES THE CLOCK'S GRANULARITY. A batch of N runs N
            // independent scenarios inside ONE timed region and divides the reading by N, so the printed
            // number is still per-scenario but the tick it was quantised at is worth `quantum / N` of it.
            // Without this, `compare-axis.mjs` computes a per-row noise floor from the full 0.1 ms tick
            // and declares a fast axis unable to see a change it can in fact see twentyfold: the mount
            // axis unbatched gives `exodra` a ±23.8% floor, which resolves nothing.
            //
            // AND IT IS `null` WHEN NOTHING WAS PASSED, WHICH IS NOT WHAT IT USED TO SAY. `rounds`
            // omitted takes the `await mod[f]()` branch above — the axis is called with NO arguments
            // and uses ITS OWN defaults — while this line recorded the runner's positional default
            // of 1 regardless. `.gate/app-update.latest.json` is that bug on disk: it says
            // `"batch": 1` and every one of its medians lies on a 0.02 ms grid, which is the 0.100
            // ms clock over the axis's own default batch of 5. A consumer dividing by the recorded
            // 1 gets a per-row noise floor five times too coarse. `null` says "the axis chose",
            // which is the truth and is not mistakable for a number.
            writeFileSync(
                file,
                JSON.stringify(
                    {
                        axis: axisName,
                        // THE LABEL ON DISK, NOT THE ONE TYPED. `check-doc-numbers.mjs` prefers
                        // `rec.label` over the filename, so a narrow recording that someone later
                        // renames or moves still cannot resolve under a full run's label.
                        label: diskLabel,
                        quantum,
                        batch: rounds === undefined ? null : batch,
                        // A NARROW RUN SAYS SO IN ITS OWN CONTENT, so a reader does not have to
                        // parse the filename and a consumer does not have to guess. Absent on a full
                        // run — `partial: false` on every file would make the flag invisible in
                        // exactly the files it matters for.
                        ...(onlySpec === null ? {} : { partial: true, only: onlyTokens }),
                        rows: recorded,
                        // Absent when the axis prints no heap line — an empty object would claim
                        // "measured zero" for every participant.
                        ...(Object.keys(heap).length > 0 ? { heap } : {}),
                        // THE AXIS'S OWN RESOLUTION. Absent when the axis printed no null block,
                        // for the same reason `heap` is: an empty array would read as "this run
                        // resolved nothing", which is the opposite of "this run did not measure it".
                        //
                        // A NEW TOP-LEVEL KEY, DELIBERATELY, AND NOT FIELDS ON `rows`. Every
                        // consumer of these files reads `rows`, `batch` and `quantum` and ignores
                        // everything else — `scripts/check-doc-numbers.mjs` builds its map from
                        // `rec.rows` alone — so nothing they read
                        // changes shape. `compare-axis.mjs` keeps ignoring it too, which is right:
                        // it computes a resolution of its OWN from the control scatter between two
                        // runs, and that is a different quantity from a single run's null.
                        ...(nulls.length > 0 ? { nulls } : {}),
                        // Absent when the axis refused nothing — an empty array and a run that
                        // never checked would read the same, and they are not the same.
                        ...(refusals.length > 0 ? { refusals } : {}),
                    },
                    null,
                    2
                )
            );
            const nullPairs = nulls.reduce((n, blk) => n + blk.pairs.length, 0);
            console.log(
                `📝 recorded ${recorded.length} rows` +
                    (nulls.length > 0
                        ? `, ${nulls.length} null block(s) / ${nullPairs} pairs`
                        : '') +
                    (refusals.length > 0 ? `, ${refusals.length} refusal(s)` : '') +
                    ` → .gate/${axisName}.${diskLabel}.json`
            );
            if (onlySpec !== null) {
                console.log(
                    `⚠️  PARTIAL: ${recorded.length} row(s) from a NARROWED field (${onlyTokens.join(
                        ', '
                    )}).`
                );
                console.log(
                    '   Its absolute medians are not comparable with a full run of this axis, and' +
                        '\n   `check-doc-numbers.mjs` will not offer it as a source for a published figure.'
                );
            }
            if (refusals.length > 0) {
                console.log(
                    `⚠️  the axis refused ${refusals.length} of its own result(s); they are in the`
                );
                console.log(
                    '   recording under `refusals`. Read them before quoting any row of this file.'
                );
            }
            // The recorder used to drop the null block silently, and a silent drop is what made a
            // published rung unjudgeable for weeks. If an axis that is known to print one records
            // without it, the printer has moved and this file has stopped following it.
            if (nulls.length === 0 && AXES_WITH_NULLS.has(axisName)) {
                console.error(
                    `⚠️  ${axisName} prints a null block and none was captured — its resolution is ` +
                        'NOT in this recording. Check that its printer still matches NULL_HEAD / ' +
                        'NULL_ROW in this file before reading any figure in it against zero.'
                );
            }
        }
    }
} catch (e) {
    console.error('❌', e.message);
    exitCode = 1;
} finally {
    stopVite();
    // THE EXIT CODE USED TO BE 0 NO MATTER WHAT, and that was survivable only while every failure
    // here was a crash somebody was watching. It is not survivable for `--only`: a mistyped
    // participant name that exits 0 is precisely the "silently ran the wrong thing" outcome the flag
    // exists to prevent, and it would pass any wrapper that checks the status.
    //
    //   0  the run did what was asked
    //   1  the run threw (a crash, or a table whose parser shape is unknown — see `pushRow`)
    //   5  `--only` named something this axis does not have
    //
    // 2 and 3 are taken by the argument checks and the stale-`dist/` refusal, which exit early.
    setTimeout(() => process.exit(exitCode), 500);
}
