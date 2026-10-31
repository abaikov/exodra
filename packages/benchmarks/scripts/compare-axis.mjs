#!/usr/bin/env node
// READ TWO RECORDINGS OF ONE AXIS AGAINST EACH OTHER, WITH THE MACHINE DIVIDED OUT.
//
// Usage:  node scripts/compare-axis.mjs <axis> <before-label> <after-label>
//         (recordings come from `run-one-axis.js <axis> --record=<label>`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS, and it is not a convenience.
//
// A before/after read straight off two printed tables is mostly a reading of the laptop. Measured:
// three runs of the `toggle` axis with ONE line of the library different between
// runs 1 and 2 and nothing at all different between 1 and 3:
//
//     mikado   8.000 → 9.300 → 8.300      solid   9.900 → 11.900 → 10.600
//     stage0   9.700 → 11.100 → 9.600     react  33.100 → 39.800 → 36.200
//
// Those are participants the change could not touch — different libraries, different files. They
// moved 10–19%. So an `exodra` row that also moved 12% between two runs has said nothing at all,
// and the change that "made us 12% slower" may have made us nothing.
//
// THE FIX IS THE UNTOUCHED ROWS THEMSELVES. Every axis runs a dozen participants interleaved in
// one browser session, under one thermal state, in one round order. The ones that are not ours
// are a control group we get for free: whatever they did between the two runs is the machine.
// Their median shift is the drift; dividing our shift by it leaves the part of the move that the
// change is actually responsible for.
//
// AND — the part that matters more than the number — the controls also disagree WITH EACH OTHER,
// and that disagreement is this comparison's RESOLUTION. If the controls scatter by ±9% after
// normalisation, then a 4% move on our row is not a result; it is inside the error bar, and the
// honest output is "this pair of runs cannot see a move this small", not a confident zero. That
// line is printed on every comparison, because the failure this file exists to prevent is
// claiming a slot cost nothing when the measurement could never have shown that it did.
//
// A CONTROL IS A PARTICIPANT NAMED IN `FOREIGN` BELOW — an explicit list of the libraries this
// repository does not write. It used to be the prefix test `!name.startsWith('exodra')`, and that
// rule silently did two wrong things:
//
//   1. ON EVERY FLOOR AXIS IT MADE EVERY ROW A CONTROL, OURS INCLUDED. `run-one-axis.js` qualifies
//      a row with the table it was printed under (`pushRow`), so the recorded names are
//      `REORDER/exodra`, `CENSUS/exodra`, `WIDE/exodra·kept`, `APP/hydrate` — none of which starts
//      with `exodra`. `subjects` therefore came out EMPTY: the table printed no subject rows, the
//      per-row verdict loop under it ran zero times, and the drift the remaining "controls" were
//      averaged into was the median of our own rows. A comparison that cannot move our row at all
//      printed no complaint about it, because there was nothing left to complain about.
//   2. ON `app-update` AND `exodra-app-update` IT COUNTED `floor` AS MACHINE DRIFT. That row is a
//      hand-written program in this repository, and it is evidence — averaging it into the drift
//      divides part of the answer out of the answer.
//
// The prefix test could not see either, because a row-naming change is invisible to it: it never
// asks whether it RECOGNISES a name, only whether the name begins with six particular letters.
//
// WHAT MAKES THE NEW RULE UNBREAKABLE IN THE SAME DIRECTION. Control membership now requires an
// explicit entry, so no row can become a control by being renamed — the worst a rename can do is
// remove a control, which `controls.length < 3` already refuses. And every name that is in neither
// list is REFUSED BY NAME rather than classified, so a participant this file has never heard of
// stops the comparison instead of quietly joining one side of it.
//
// THE SECTION PREFIX IS STRIPPED BEFORE EITHER LIST IS CONSULTED, using the recording's own
// `section` field rather than by guessing at a `/`, because the prefix is the TABLE a row was
// printed under and not part of the participant's identity.
//
// `floor` AND ITS FAMILY ARE SUBJECTS, NOT CONTROLS, and that is a deliberate call rather than an
// oversight: a change under test cannot touch them either, so they would serve as drift controls —
// but they are programs this repository writes and their reading is the evidence half of every
// floor claim. Leaving them among the subjects also gives the comparison a free self-check: a
// hand-written row should land at ~0 after the drift is divided out, and if it does not, the pair
// of runs is worse than its control scatter says.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gateDir = join(__dirname, '..', '.gate');

const [axis, beforeLabel, afterLabel] = process.argv.slice(2);
if (!axis || !beforeLabel || !afterLabel) {
    console.error('usage: node scripts/compare-axis.mjs <axis> <before-label> <after-label>');
    console.error('record with: node scripts/run-one-axis.js <axis> --record=<label>');
    process.exit(2);
}

function load(label) {
    const file = join(gateDir, `${axis}.${label}.json`);
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        console.error(`❌ no recording at .gate/${axis}.${label}.json`);
        console.error(`   record it with: node scripts/run-one-axis.js ${axis} --record=${label}`);
        process.exit(2);
    }
}

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const before = load(beforeLabel);
const after = load(afterLabel);

const byName = (rec) => new Map(rec.rows.map((r) => [r.name, r]));
const b = byName(before);
const a = byName(after);

// Only rows the two runs have in common can be compared at all; a participant that appeared or
// disappeared between them is named rather than dropped silently, because that usually means one
// of the two runs was made against a different registration list and the whole pair is suspect.
const shared = [...b.keys()].filter((n) => a.has(n));
const onlyBefore = [...b.keys()].filter((n) => !a.has(n));
const onlyAfter = [...a.keys()].filter((n) => !b.has(n));

// THE PARTICIPANTS THIS REPOSITORY DOES NOT WRITE — the whole control group, spelled out.
//
// Every one of them is a third-party library exercised by an app in `src/benchmarks/`; no `@exodra`
// code runs inside any of their timed regions, which is what makes their move between two runs a
// reading of the machine and nothing else. Read off the participant maps of the comparison axes
// (`initial-render.tsx`, `app-update.tsx`, `toggle.tsx`, `list-reconcile.tsx`, `reconcile.tsx`,
// `reactive-update.tsx`, `virtual-list.tsx`, `component-split.tsx`, `clone-threshold.tsx`).
//
// `stage0` IS IN THE LIST: it is the hand-written stage0 program — the ceiling row — and runs no
// `@exodra` code, so its move between two runs is a reading of the machine. A row that drove that
// same library through code of OURS would not belong here, for the same reason: a change to this
// repository would move it.
//
// ADDING A LIBRARY PARTICIPANT MEANS ADDING IT HERE, in the same change. Forgetting costs a
// control (the run says so, by name, below); it can never cost the comparison its subject.
const FOREIGN = new Set([
    'lit',
    'marko',
    'mikado',
    'mikadoKeyed',
    'mikadoPooled',
    'mikadoReactive',
    'react',
    'sinuous',
    'solid',
    'stage0',
    'svelte',
    'uhtml',
    'voby',
]);

// OUR OWN ROWS WHOSE NAME IS NOT `exodra`-PREFIXED. The prefix rule (CLAUDE.md's branding rule)
// covers `exodra`, `exodraKept`, `exodraDelegated`, `exodraMono`, `exodraOps`
// and anything else of ours that follows it; this is what is left.
//
// IT IS SHORT ON PURPOSE AND IT IS NOT A CENSUS OF EVERY ROW THIS REPOSITORY PRINTS. The floor and
// phase axes name dozens of programs — `esc·join`, `app-clone·qsa`, `+fill`, `parse+hydrate` — and
// none of them is here, because an axis made entirely of our own programs has NO control group and
// is refused above before this check is ever reached. What has to be listed is a non-prefixed row
// of ours on an axis that DOES have controls, and today that is `floor`, on `app-update` and
// `exodra-app-update`. Adding a second one is one line, and the refusal below names it for you.
//
// A `·`-suffixed variant of a listed stem (`floor·twin`, `floor·told`) is covered by the stem, so a
// new variant of a program already listed needs no entry.
//
// `driver` IS `floor` UNDER A NEW NAME ON ONE AXIS, and the rename is the point. `app-update` stopped
// dispatching events, so the row that prices what every participant pays before its renderer is
// reached is no longer 160 `MouseEvent`s over inert markup — it is the driver's two loops over 160
// no-op closures, three orders of magnitude cheaper. A row called `floor` that meant one program in
// one recording and a different program in the next is the one thing a recorded table cannot
// survive, so it was renamed rather than reused; `exodra-app-update` is still click-fired and its
// row is still `floor`. Both are SUBJECTS and not controls, for the reason stated above.
const OURS = new Set(['floor', 'driver']);

/**
 * The participant's own name, with the TABLE it was printed under taken off.
 *
 * `run-one-axis.js` records a row of a sectioned axis as `SECTION/name` and keeps the section in
 * its own field; classification is about the participant, so it reads the field rather than
 * splitting on a character that could one day appear in a name.
 */
const bareName = (name) => {
    const rec = a.get(name) ?? b.get(name);
    const section = rec?.section;
    return typeof section === 'string' && name.startsWith(`${section}/`)
        ? name.slice(section.length + 1)
        : name;
};

/** The stem of a `·`-suffixed variant — `floor·twin` → `floor`, `react` → `react`. */
const stemOf = (bare) => bare.split('·')[0];

const isControl = (name) => FOREIGN.has(stemOf(bareName(name)));
const isOurs = (name) => {
    const bare = bareName(name);
    return OURS.has(stemOf(bare)) || bare.toLowerCase().startsWith('exodra');
};
const controls = shared.filter(isControl);
const subjects = shared.filter((n) => !isControl(n));

if (controls.length < 3) {
    console.error(`❌ only ${controls.length} control participants — a drift estimate needs at least 3`);
    if (controls.length === 0) {
        // The floor and phase axes measure ONE renderer against programs this repository wrote, so
        // every row in them is evidence. Some of those programs are untouchable by a renderer
        // change and would serve as drift controls — but dividing our rows by our own rows is how
        // an answer gets divided out of the answer, and under the prefix rule that happened
        // silently on every one of these axes (see the note at the top of this file).
        console.error(
            `   Not one row of ${axis} is a library this repository does not write, so it has no`
        );
        console.error(
            '   control group at all and machine drift CANNOT be divided out of it. Read two of its'
        );
        console.error(
            "   recordings against the axis's own null block (`nulls` in the recording) instead: that"
        );
        console.error('   is the resolution it measured for itself, in the same session.');
    }
    process.exit(2);
}

// A NAME IN NEITHER LIST STOPS THE COMPARISON. Treating it as a subject would hide a library that
// belongs in `FOREIGN`; treating it as a control is the failure this whole rule exists to prevent.
const unknown = shared.filter((n) => !isControl(n) && !isOurs(n));
if (unknown.length > 0) {
    console.error(`❌ ${unknown.length} participant(s) this file does not recognise: ${unknown.join(', ')}`);
    console.error('   Add each to FOREIGN (a library this repository does not write — it becomes a');
    console.error('   drift control) or to OURS (a program written here — it becomes a subject), in');
    console.error('   scripts/compare-axis.mjs. An unclassified row cannot be counted either way.');
    process.exit(2);
}

const ratio = (name, field) => a.get(name)[field] / b.get(name)[field];

const driftMedian = median(controls.map((n) => ratio(n, 'median')));
const driftP25 = median(controls.map((n) => ratio(n, 'p25')));

// What is left of each control AFTER the drift is divided out. A perfectly behaved pair of runs
// would leave every control at 1.000; how far the worst one sits from 1 is the smallest move this
// comparison can honestly call a move.
// HOW FAR THE WORST *TYPICAL* CONTROL SITS FROM 1 — the 80th percentile of the residuals, not the
// maximum, and the difference is the whole usefulness of this number.
//
// Taking the maximum lets ONE interfering participant blind the entire gate. Re-derived from the
// two recordings (`initial-render.b7full` → `initial-render.slots`), residuals after
// the drift was divided out, in percent:
//
//     stage0 0.28 · uhtml 0.28 · sinuous 0.31 · voby 0.44 · lit 0.54 · solid 0.56
//     mikado 1.55 · svelte 3.31 · marko 6.63 · react 16.93
//
// So SIX of ten under 1%, the 80th percentile at 3.31%, and `react` at 16.93% — the max would have
// put the floor at ±16.9% and made every row on the page unreadable because of one row nothing in
// the change could touch. (This comment said "nine of ten under 1%" until the numbers were
// recomputed; the count was wrong, the conclusion it supports is not — the gap between the 80th
// percentile and the max is what the argument rests on, and that gap is 5×.)
//
// A GC pause, an extension waking up, a thermal step: any of them lands on whichever participant
// happened to be running, and there is always one.
//
// The 80th percentile keeps the estimate honest in the other direction too — it is not a
// best-case pick. With ten controls it is the second-worst, so it takes two simultaneous
// interferences to inflate it, and a genuinely noisy RUN (where most controls scatter) still
// produces a wide floor, which is what should happen.
const residuals = controls
    .map((n) => Math.abs(ratio(n, 'median') / driftMedian - 1))
    .sort((x, y) => x - y);
const resolution = residuals[Math.min(residuals.length - 1, Math.ceil(residuals.length * 0.8) - 1)];
const worstControl = residuals[residuals.length - 1];

// THE SECOND HALF OF THE NOISE FLOOR, AND THE ONE A POOLED ESTIMATE CANNOT SEE.
//
// The browser clamps `performance.now()` to ~0.1 ms, so every sample is a whole number of ticks
// and a MEDIAN of them moves in tick steps. A row sitting at 3.0 ms can therefore shift 0.1 ms —
// 3.3% — with nothing behind it at all, while a row at 30 ms cannot shift by less than 0.3%. The
// scatter of the controls is a property of the RUN; this is a property of the ROW, and a
// comparison needs the larger of the two.
//
// This was not reasoned into existence: the gate's first self-test — two recordings of an
// UNCHANGED build — reported `exodraKept` (3.300 → 3.000) as a real +2.1% regression, because
// ±1.7% pooled scatter said 2.1% was outside the noise. One tick on that row is 3.3%.
// AND THE BATCH DIVIDES THAT TICK. `run-one-axis.js <axis> [rounds] [batch]` times N scenarios in
// one region and divides by N before printing, so a batched row's median is still per-scenario but
// it was quantised `batch` times more finely. Reading the raw 0.1 ms here would hand a fast axis a
// noise floor it does not have — unbatched, `exodra` on the mount axis gets ±23.8% and the gate is
// blind; at a batch of 20 the same row's tick is worth 0.005 ms.
//
// The two recordings MUST share a batch, or the comparison is between two different resolutions.
const batchOf = (rec) => (typeof rec.batch === 'number' && rec.batch > 0 ? rec.batch : 1);
if (batchOf(before) !== batchOf(after)) {
    console.error(`❌ ${beforeLabel} ran at batch ${batchOf(before)} and ${afterLabel} at batch ${batchOf(after)}`);
    console.error('   Re-record one of them so both share a batch; a comparison across two resolutions is not one.');
    process.exit(2);
}
const quantum = (after.quantum ?? before.quantum ?? 0.1) / batchOf(after);
const floorFor = (name) => Math.max(resolution, quantum / a.get(name).median);

const pct = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
const ms = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(3)}`;

console.log(`\n📐 axis ${axis}: ${beforeLabel} → ${afterLabel}\n`);
console.log(`machine drift from ${controls.length} controls: ×${driftMedian.toFixed(3)} (median), ×${driftP25.toFixed(3)} (p25)`);
if (Math.abs(driftMedian - driftP25) / driftMedian > 0.05) {
    console.log(`⚠️  median-drift and p25-drift disagree by more than 5% — the two runs differ in SHAPE, not just in scale`);
}
console.log(
    `control scatter: ±${(resolution * 100).toFixed(1)}% (80th pct of ${controls.length}; ` +
        `worst single control ±${(worstControl * 100).toFixed(1)}%) · timer quantum ${quantum.toFixed(3)} ms`
);
console.log(`each row's own floor is the larger of that scatter and one tick on that row\n`);

console.log(`                 before    after     expected   delta      normalised    floor`);
const row = (name) => {
    const bb = b.get(name).median;
    const aa = a.get(name).median;
    const expected = bb * driftMedian;
    const norm = aa / bb / driftMedian - 1;
    const floor = floorFor(name);
    const inNoise = Math.abs(norm) <= floor;
    const tag = isControl(name) ? ' ' : inNoise ? ' ·' : Math.sign(norm) > 0 ? ' ❌' : ' ✅';
    console.log(
        `${name.padEnd(16)} ${bb.toFixed(3).padStart(7)} ${aa.toFixed(3).padStart(9)} ` +
            `${expected.toFixed(3).padStart(10)} ${ms(aa - expected).padStart(10)} ` +
            `${pct(norm).padStart(11)}  ±${(floor * 100).toFixed(1)}%${tag}`
    );
};
subjects.forEach(row);
console.log(`${'—'.repeat(80)}   controls`);
controls.forEach(row);

console.log('');
for (const name of subjects) {
    const norm = a.get(name).median / b.get(name).median / driftMedian - 1;
    const floor = floorFor(name);
    if (Math.abs(norm) <= floor) {
        console.log(`· ${name}: ${pct(norm)} — inside this row's ±${(floor * 100).toFixed(1)}% floor, so this run CANNOT say the change was free`);
    } else {
        console.log(`${norm > 0 ? '❌' : '✅'} ${name}: ${pct(norm)} after drift, floor ±${(floor * 100).toFixed(1)}% — outside the noise, this one is real`);
    }
}
if (onlyBefore.length > 0) console.log(`\n⚠️  only in ${beforeLabel}: ${onlyBefore.join(', ')}`);
if (onlyAfter.length > 0) console.log(`⚠️  only in ${afterLabel}: ${onlyAfter.join(', ')}`);
console.log('');
