#!/usr/bin/env node
// PUBLISHED-NUMBER GATE — every measurement in the docs must name the run that produced it.
//
// Run:  node scripts/check-doc-numbers.mjs   (or `npm run check:numbers`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS.
//
// An audit read all 24 performance/comparison claims in `docs-site/docs/benchmarks.md`,
// `docs-site/docs/why/**` and `README.md` against the recordings in `packages/benchmarks/.gate/`.
// FIVE were traceable to a recording. The rest were hand-typed, and four of them were wrong:
//
//   · `README.md` says "Solid is faster on first mount — by ~6%, consistently". All SEVEN
//     `initial-render.*` recordings on disk have `exodra` ahead of `solid`.
//   · `benchmarks.md`'s mount table has four competitor rows copied verbatim out of
//     `.gate/initial-render.pre7arg.json` — and an Exodra row (0.380) and a voby row (1.420) that
//     appear in no recording at all.
//   · `docs/why/what-others-forbid.md` prints a toggle table (3.8 / 4.1 / 8.3 / 11.1) whose four
//     figures appear in NEITHER toggle recording (which hold 3.3/3.5/7.4/10.2 and 3.0/3.1/6.6/9.1).
//   · `docs/tooling/cdn.md` claimed 47.6 KB gzip where the built file is 55.7 KB.
//
// None of that is dishonesty. It is that nothing tied a published figure to the run behind it, so
// the figures decayed while the prose around them stayed confident. This gate ties them.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// HOW A MEASUREMENT ANNOUNCES ITSELF, AND WHY NOT A REGEX OVER THE DOCS.
//
// A regex over every number in the docs would flag versions (`Solid 1.9.13`), ports, line
// citations (`compare-axis.mjs:186`), years, and every `px` in a code sample. A gate that cries
// wolf gets commented out, and then nothing is checked — which is how three gates in this repo
// were found dead this session. So the detector is deliberately narrow, and it is TWO rules:
//
//   1. THE TRIPWIRE (finds the tables). A markdown table column is a MEASUREMENT COLUMN when its
//      header cell contains a standalone unit token — `ms`, `KB`, `MB`, `GB`, `×` — and at least
//      two of its body cells parse as numbers, OR when at least two of its body cells are
//      themselves `number + unit` (`~0.60 ms`, `5.7×`). Once ANY column of a table qualifies, the
//      table is a measurement table and every other numeric column of it counts too — that is how
//      `| Axis | previously published | measured on production builds | overstated by |` gets its
//      millisecond columns checked off a `5.7×` in the fourth.
//
//      Nothing outside a markdown table is looked at. Prose, code fences, headings, front matter
//      and link text are invisible, which is what keeps the false-positive count at zero on the
//      current docs (verified by hand against every table in `docs-site/docs`, `README.md` and
//      `packages/*/README.md`: the only non-benchmark table that comes near is
//      `docs/api/style.md`'s `-ms-flex-align` row, and it is excluded because its column holds no
//      numbers).
//
//   2. THE MARKER (says where the numbers came from). Every measurement column must be covered by
//      exactly one HTML comment on the lines directly above the table. Four forms:
//
//        <!-- gate: axis=initial-render label=post-repair [col=2] [field=median] [map="Cell:participant;…"] -->
//            Checked, cell by cell, against `.gate/initial-render.post-repair.json`.
//
//            `col=` says WHICH COLUMN of the table, counted as a reader sees them, 1-based.
//            `field=` says WHICH FIELD OF THE RECORDED ROW that column carries, and it defaults to
//            `median` — which is why every marker written before `field=` existed keeps working
//            unchanged.
//
//            THE TWO ARE NOT THE SAME QUESTION, and conflating them is a defect this gate had. A
//            recorder writes `name`, `reps`, `min`, `p25`, `median`, `p75`, `max`, and — on axes
//            that print extra columns — `perElement`, or `trailing1` and `trailing2`. A page is
//            free to publish any of those. `bank-vs-clone` publishes four of them side by side
//            (`reps · median (ms) · ns / card · bytes / card`), and with only `col=` to say it
//            with, the gate compared the reps column against `median` and reported that 16 was
//            "30376.2% away from 0.0525". The figure was honest; the marker had no way to say what
//            it was. So a column now names its field, the field is checked against the fields the
//            named recording actually carries — an unknown one FAILS and prints the list — and the
//            comparison, the "other run" search, the nearest-value report and the ordering check
//            all read that field rather than assuming `median`.
//
//            This LOOSENS nothing. Every figure still has to equal a value recorded under a name
//            in that file, to its own published precision; there is simply one more coordinate in
//            the address. `field=` is meaningless on `stale`, `unrecorded` and `size` (they check
//            no value), so writing it there is reported rather than ignored — a marker that looks
//            like it checks a field and does not is the failure mode this whole file exists about.
//
//        <!-- gate: stale [col=*] reason="measured on the previous renderer; read the ms as stale" -->
//            An honest disclosure that the figures are superseded. Passes, and is PRINTED in the
//            report on every run so it cannot rot in silence. `benchmarks.md` already writes this
//            disclosure in prose; the marker is the machine-readable half of the same sentence.
//
//        <!-- gate: unrecorded cmd=<path> date=YYYY-MM-DD [axis=<axis>] [col=*] -->
//            Measured by a harness that emits no `.gate` recording — the SSR throughput table is
//            real, current, and produced by `ssr/schema-measure.mts`. The gate cannot check the
//            values; it checks that the command named actually exists in the repo, prints the row
//            every run, and FAILS if `axis=` is given and that axis does have recordings on disk,
//            so "there is no recording" cannot be claimed when there is.
//
//        <!-- gate: size pkg=dom file=dist/index.js figure=55.7 -->
//            For a size claim in PROSE. Gzips `packages/dom/dist/index.js` the way
//            `check-bundle-size.mjs` does and compares against `figure` KB; also requires the text
//            `55.7` to appear in the six lines below the marker, so the marker cannot drift away
//            from the sentence it labels.
//
//      A column with no marker fails. That is the whole point: rule 1 makes the marker
//      non-optional, so this is not an authoring convention anybody has to remember — forgetting
//      it is what the gate reports.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE TOLERANCE, AND WHY IT IS NOT A PERCENTAGE.
//
// Two recordings of one axis disagree. Measured off the two files on disk — `toggle.base1` →
// `toggle.base2`, every one of the 14 shared rows:
//
//     exodraKept 3.3→3.0 (+10.0%)   mikadoPooled 3.5→3.1 (+12.9%)   mikado 7.4→6.6 (+12.1%)
//     stage0 8.9→7.9 (+12.7%)       solid 9.2→8.3 (+10.8%)          exodra 10.2→9.1 (+12.1%)
//     marko 13.7→12.2 (+12.3%)      svelte 14.8→13.4 (+10.4%)       lit 21.3→18.7 (+13.9%)
//     uhtml 19.8→17.5 (+13.1%)      sinuous 21.8→19.6 (+11.2%)      react 30.7→27.7 (+10.8%)
//     voby 35.4→31.4 (+12.7%)       exodraDelegated 9.6→8.5 (+12.9%)
//
// The whole table moved together by 10.4–13.9%: that is the machine, not the code. So an
// exact-match-against-one-canonical-value rule is wrong. But a PERCENTAGE tolerance is worse, and
// the numbers above are why — enumerate the choices:
//
//   · below ~10%: rejects an honest quote of the other recording, and the docs would be forced to
//     re-copy every table on every re-run.
//   · above ~14%: accepts 3.8 for a row recorded at 3.3 — which is exactly the fabricated figure
//     in `what-others-forbid.md` that this gate was written to catch. A window wide enough to
//     absorb the run-to-run drift is wide enough to absorb the fabrication.
//
// There is no good percentage, because the variance lives BETWEEN runs and the fabrication lives
// WITHIN one. So the rule is neither: a published figure must equal a value that was actually
// RECORDED, to the precision it was published at, in SOME recording of that axis.
//
//   · tolerance = half a unit in the figure's own last decimal place (`0.380` → ±0.0005,
//     `3.8` → ±0.05). A `~` prefix doubles it to one whole unit — that is what "approximately,
//     rounded" means, and it buys a hedge nothing more.
//   · matching the recording the marker NAMES is `ok`.
//   · matching a DIFFERENT recording of the same axis is `other run` — reported, not failed,
//     naming the label it does match. That is where the 10–14% run-to-run disagreement is
//     absorbed, and it is absorbed by pointing at a file rather than by widening a window.
//   · matching none of them is the failure, and the message prints the nearest recorded value and
//     which run holds it.
//
// ORDERING IS CHECKED TOO, because the README's claim was a RANKING, not a millisecond: for a
// marked column, if the published figures put A above B where the named recording puts B above A,
// that is reported on its own line. A table can be within tolerance and still say the wrong thing.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS GATE STILL LETS THROUGH. Every gate in this repo that pretended to be complete turned
// out not to be, so:
//
//   1. PROSE IS INVISIBLE. Every ratio and percentage in a sentence — "1.32× ahead of Marko",
//      "~6%, consistently", "about 75% of the row" — is unchecked. The README sentence that
//      started this audit is prose; what fails is only the table under it. This is the biggest
//      hole and it is deliberate: a ratio is derived from two rows this gate cannot identify, and
//      guessing would make it fire on every page.
//   2. A TABLE OF BARE NUMBERS UNDER A UNITLESS HEADER IS INVISIBLE unless somebody marks it
//      voluntarily. `benchmarks.md`'s `| participant | base1 | base2 |` toggle table and the
//      SSR/hydration `| App | Exodra | Solid | Qwik |` TTI table both carry no unit anywhere, so
//      the tripwire never sees them. (Both happen to be honest today. That is luck, not the gate.)
//   3. `stale` AND `unrecorded` ARE ESCAPE HATCHES. `stale` takes any non-empty reason and never
//      expires; `unrecorded` takes any command whose file exists. One line silences any table.
//      Their only teeth are that both are printed on every run and counted in the summary, and
//      that `unrecorded` cannot claim an axis has no recordings when it has.
//   4. IT CHECKS THE FIGURE, NOT THE RECORDING. That `.gate/initial-render.pre7arg.json` measured
//      a renderer that no longer exists, on debug builds, or with a different app, is not
//      something this gate can know. Quoting an obsolete recording faithfully passes.
//   5. NO TRIPWIRE FOR SIZES. An unmarked "55.7 KB gzip" in prose is unchecked, because a KB in
//      these docs is as often about a competitor's HTML as about a file in `dist/`.
//   6. SCOPE. `docs-site/docs/**`, `README.md` and `packages/*/README.md` only. Blog posts are
//      excluded on purpose (a dated post is a snapshot by construction); so are
//      `docs-site/static/llms-full.txt`, which is GENERATED from the docs — fix the docs and
//      re-run the docs-site build, or `check:llms` will fail next.
//   7. Cells are split on `|`. A table cell containing a literal pipe inside a code span will be
//      mis-split, and that row will read as unresolvable rather than as wrong.
//   8. `.gate/*.json` is a text file in the repository. Nothing here proves a recording came out
//      of the harness rather than out of an editor.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gateDir = join(root, 'packages/benchmarks/.gate');

// Standalone tokens that mean "this column is a quantity someone measured". `s` is deliberately
// absent — it collides with ordinary English ("Tests") and nothing in these docs reports seconds.
// `%` is absent because a percentage is DERIVED from two rows, and this gate cannot know which two.
const UNITS = new Set(['ms', 'µs', 'MB', 'KB', 'GB', '×']);

// ── recordings ────────────────────────────────────────────────────────────────────────────────

// TWO DIRECTORIES, AND THE SPLIT IS BY PURPOSE RATHER THAN BY AGE.
//
// `packages/benchmarks/measurements/` IS COMMITTED. It holds the recordings that PUBLISHED figures
// cite. Every recording once lived in `.gate/`, which is gitignored — so on a fresh
// clone this gate failed with ten problems, and it was verified to do so rather than assumed. CI
// runs `release:check`, which runs this file. A published number whose evidence is on one laptop is
// an unsourced number for every other reader, and a gate that can only pass on that laptop is not a
// gate.
//
// `packages/benchmarks/.gate/` STAYS GITIGNORED, and its own note gives the reason: an A/B pair is
// two measurements of ONE machine in ONE session, and committing them invites exactly the
// cross-machine comparison the gate exists to forbid. `importnode-before`/`importnode-after` are
// meaningless to anybody but the person who ran them back to back.
//
// The committed directory wins on a name collision, so a scratch re-recording under a published
// label cannot quietly replace the evidence.
const measurementsDir = join(root, 'packages/benchmarks/measurements');

function loadRecordings() {
    const byAxis = new Map();
    const seen = new Set();
    for (const [dir, shown] of [
        [measurementsDir, 'measurements'],
        [gateDir, '.gate'],
    ]) {
        if (!existsSync(dir)) continue;
        for (const name of readdirSync(dir).sort()) {
            if (!name.endsWith('.json')) continue;
            if (seen.has(name)) continue;
            seen.add(name);
            loadOne(byAxis, dir, shown, name);
        }
    }
    return byAxis;
}

function loadOne(byAxis, dir, shown, name) {
    {
        let rec;
        try {
            rec = JSON.parse(readFileSync(join(dir, name), 'utf8'));
        } catch (err) {
            // The source of truth failing to parse is not something to work around quietly.
            console.error(
                `✖ packages/benchmarks/${shown}/${name} is not readable JSON: ${err.message}`
            );
            process.exit(1);
        }
        // A PARTIAL RECORDING IS NOT EVIDENCE, AND THIS IS WHERE IT HAS TO BE STOPPED.
        //
        // `run-one-axis.js --only=<names>` narrows the sampled field to a couple of participants so
        // one question — this row against its floor — can be asked without a twenty-row table. Such
        // a run is worth recording (two of them are what `compare-axis.mjs` divides), but its
        // ABSOLUTE medians are not comparable with a wide run's: with two participants a row's
        // consecutive samples are one foreign program apart instead of nineteen, and the process
        // carries almost none of the dropped libraries' shapes in its caches. The run stamps itself
        // `partial: true` and takes a `+only-…` label so it can never overwrite a full one — and
        // this loader, which makes every `.json` under `.gate/` a source a published figure may be
        // traced to, must not offer it as one. A figure that traced to a narrow run would be
        // "checked" against numbers taken under conditions the page does not describe.
        if (rec.partial === true) return;
        const parts = name.replace(/\.json$/, '').split('.');
        const axis = rec.axis ?? parts[0];
        const label = rec.label ?? parts.slice(1).join('.');
        const rows = new Map();
        for (const r of rec.rows ?? []) rows.set(r.name, r);
        if (!byAxis.has(axis)) byAxis.set(axis, []);
        byAxis.get(axis).push({
            axis,
            label,
            file: `${shown}/${name}`,
            batch: typeof rec.batch === 'number' ? rec.batch : null,
            quantum: typeof rec.quantum === 'number' ? rec.quantum : null,
            rows,
        });
    }
}

// ── markdown ──────────────────────────────────────────────────────────────────────────────────

function markdownFiles(dir, acc = []) {
    if (!existsSync(dir)) return acc;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) markdownFiles(full, acc);
        else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) acc.push(full);
    }
    return acc;
}

function scannedFiles() {
    const files = markdownFiles(join(root, 'docs-site', 'docs'));
    files.push(join(root, 'README.md'));
    for (const entry of readdirSync(join(root, 'packages'), { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const readme = join(root, 'packages', entry.name, 'README.md');
        if (existsSync(readme)) files.push(readme);
    }
    return files.filter(existsSync);
}

const cleanCell = (s) =>
    s
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/^\*+/, '')
        .replace(/\*+$/, '')
        .trim();

const splitRow = (line) => {
    const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return t.split('|').map((c) => c.trim());
};

const isSeparator = (line) =>
    /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-') && line.includes('|');

// Tables, with the marker comments that sit directly above them (blank lines allowed between).
function findTables(lines) {
    const tables = [];
    for (let i = 0; i + 1 < lines.length; i++) {
        if (!lines[i].trim().startsWith('|')) continue;
        if (!isSeparator(lines[i + 1])) continue;
        const header = splitRow(lines[i]);
        const body = [];
        let j = i + 2;
        for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
            body.push({ line: j + 1, cells: splitRow(lines[j]) });
        }
        const markers = [];
        for (let k = i - 1; k >= 0; k--) {
            const t = lines[k].trim();
            if (t === '') continue;
            if (t.startsWith('<!--') && t.includes('gate:')) {
                markers.unshift({ line: k + 1, text: t });
                continue;
            }
            break;
        }
        tables.push({ headerLine: i + 1, header, body, markers });
        i = j - 1;
    }
    return tables;
}

// ── figures ───────────────────────────────────────────────────────────────────────────────────

const NUMBER = /^~?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(ms|µs|MB|KB|GB|×)?$/;

function parseFigure(cell) {
    const c = cleanCell(cell);
    const m = NUMBER.exec(c);
    if (!m) return null;
    const raw = m[1].replace(/,/g, '');
    const dot = raw.indexOf('.');
    return {
        value: parseFloat(raw),
        decimals: dot < 0 ? 0 : raw.length - dot - 1,
        unit: m[2] ?? null,
        tilde: c.startsWith('~'),
        text: c,
    };
}

// Half a unit in the figure's own last decimal place; a `~` buys one whole unit. See the header.
const toleranceOf = (fig) => (fig.tilde ? 1 : 0.5) * Math.pow(10, -fig.decimals);

const headerNamesUnit = (cell) =>
    cleanCell(cell)
        .split(/[^A-Za-z0-9×µ]+/)
        .some((t) => UNITS.has(t));

// Which columns of a table are measurements. See rule 1 in the header.
function measurementColumns(table) {
    const width = table.header.length;
    const figures = [];
    for (let c = 0; c < width; c++) {
        figures[c] = table.body.map((r) => (c < r.cells.length ? parseFigure(r.cells[c]) : null));
    }
    const numeric = figures.map((col) => col.filter(Boolean).length);
    const withUnit = figures.map((col) => col.filter((f) => f && f.unit).length);

    const qualifies = [];
    for (let c = 0; c < width; c++) {
        if (withUnit[c] >= 2) qualifies.push(c);
        else if (headerNamesUnit(table.header[c]) && numeric[c] >= 2) qualifies.push(c);
    }
    if (qualifies.length === 0) return { columns: [], figures };
    // Escalation: once a table is known to publish measurements, its bare-number columns are
    // measurements too — the units are simply in the prose instead of the header.
    const columns = [];
    for (let c = 0; c < width; c++) if (numeric[c] >= 2) columns.push(c);
    return { columns, figures };
}

// ── markers ───────────────────────────────────────────────────────────────────────────────────

function parseMarker(text) {
    const m = /<!--\s*gate:\s*([\s\S]*?)-->/.exec(text);
    if (!m) return null;
    const kv = {};
    const flags = new Set();
    const re = /([A-Za-z][\w-]*)(?:=(?:"([^"]*)"|(\S+)))?/g;
    let hit;
    while ((hit = re.exec(m[1])) !== null) {
        const [, key, quoted, bare] = hit;
        if (quoted !== undefined) kv[key] = quoted;
        else if (bare !== undefined) kv[key] = bare;
        else flags.add(key);
    }
    const kind = flags.has('stale')
        ? 'stale'
        : flags.has('unrecorded')
        ? 'unrecorded'
        : flags.has('size')
        ? 'size'
        : kv.axis
        ? 'axis'
        : null;
    return { kind, kv, flags, raw: m[0] };
}

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function parseMap(spec) {
    const out = new Map();
    if (!spec) return out;
    for (const pair of spec.split(';')) {
        const idx = pair.lastIndexOf(':');
        if (idx < 0) continue;
        out.set(normalise(pair.slice(0, idx)), pair.slice(idx + 1).trim());
    }
    return out;
}

// A row label in the docs is written for a reader, a participant name is written for the harness.
// Two mechanical steps, then `map=`; anything still unresolved is REPORTED, never guessed.
function resolveParticipant(cellText, participants, map) {
    const clean = cleanCell(cellText);
    const mapped = map.get(normalise(clean));
    if (mapped) return { name: mapped, how: 'map' };
    const stripped = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
    for (const candidate of [clean, stripped]) {
        const key = normalise(candidate);
        const hits = participants.filter((p) => normalise(p) === key);
        if (hits.length === 1)
            return { name: hits[0], how: candidate === clean ? 'exact' : 'trimmed' };
    }
    return null;
}

// A recorded row carries several numbers; `field=` on the marker says which one a column publishes.
// Anything non-numeric (a missing field, a `name`, a null) is NOT a value to compare against.
const valueOf = (row, field) => (row && typeof row[field] === 'number' ? row[field] : null);

// Every numeric field any row of a recording carries — what a wrong `field=` is reported against.
function fieldsOf(recording) {
    const out = new Set();
    for (const row of recording.rows.values()) {
        for (const [k, v] of Object.entries(row)) if (typeof v === 'number') out.add(k);
    }
    return out;
}

function nearestAcross(recordings, participant, value, field) {
    let best = null;
    for (const rec of recordings) {
        const v = valueOf(rec.rows.get(participant), field);
        if (v === null) continue;
        const d = Math.abs(v - value);
        if (!best || d < best.d) best = { d, value: v, label: rec.label };
    }
    return best;
}

// ── the run ───────────────────────────────────────────────────────────────────────────────────

const byAxis = loadRecordings();
const axisNames = [...byAxis.keys()].sort();
const rows = []; // report lines
const problems = []; // actionable messages
let tableCount = 0;
let columnCount = 0;
let figureCount = 0;
let sizeCount = 0;
let staleCount = 0;
let unrecordedCount = 0;
let otherRunCount = 0;

const add = (file, line, figure, status, nearest) =>
    rows.push({ where: `${file}:${line}`, figure, status, nearest });

function guessAxis(lines, headerLine) {
    for (let k = headerLine - 2; k >= Math.max(0, headerLine - 26); k--) {
        for (const axis of axisNames) if (lines[k].includes(axis)) return axis;
    }
    return null;
}

for (const file of scannedFiles()) {
    const rel = relative(root, file);
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');

    // --- size markers (prose, not tables) ---
    for (let i = 0; i < lines.length; i++) {
        const marker = lines[i].trim().startsWith('<!--') ? parseMarker(lines[i]) : null;
        if (!marker || marker.kind !== 'size') continue;
        sizeCount++;
        const { pkg, file: distFile, figure } = marker.kv;
        if (!pkg || !distFile || !figure) {
            add(rel, i + 1, 'size claim', '✖ marker', '—');
            problems.push(
                `${rel}:${i + 1}: a size marker needs pkg=, file= and figure=. ` +
                    `Example: <!-- gate: size pkg=dom file=dist/index.js figure=55.7 -->`
            );
            continue;
        }
        const target = join(root, 'packages', pkg, distFile);
        if (!existsSync(target)) {
            add(rel, i + 1, `${pkg}/${distFile}`, '✖ not built', '—');
            problems.push(
                `${rel}:${
                    i + 1
                }: claims ${figure} KB for packages/${pkg}/${distFile}, which is not ` +
                    `on disk. Run \`npm run build\` — this gate is wired after \`build:all\` in ` +
                    `release:check for exactly this reason.`
            );
            continue;
        }
        const actual = gzipSync(readFileSync(target), { level: 9 }).length / 1024;
        const claimed = parseFloat(figure);
        // ±2%: a size in prose is a "roughly how big" claim, and the failure this catches was 17%.
        const tol = Math.max(actual * 0.02, 0.05);
        const window = lines.slice(i + 1, i + 7).join('\n');
        if (!window.includes(figure)) {
            add(rel, i + 1, `${figure} KB`, '✖ orphan', `${actual.toFixed(1)} KB on disk`);
            problems.push(
                `${rel}:${
                    i + 1
                }: the marker claims ${figure}, but "${figure}" does not appear in the ` +
                    `six lines below it. Put the marker directly above the sentence it labels, or ` +
                    `correct one of the two — a marker that has drifted off its prose checks nothing.`
            );
            continue;
        }
        if (Math.abs(actual - claimed) > tol) {
            add(rel, i + 1, `${figure} KB`, '✖ size', `${actual.toFixed(1)} KB gzip`);
            problems.push(
                `${rel}:${
                    i + 1
                }: publishes ${figure} KB gzip for packages/${pkg}/${distFile}; the ` +
                    `built file gzips to ${actual.toFixed(1)} KB (gzip -9, the same measurement ` +
                    `check-bundle-size.mjs makes). Change the figure to ${actual.toFixed(1)}.`
            );
            continue;
        }
        add(rel, i + 1, `${figure} KB`, 'ok', `${actual.toFixed(1)} KB gzip`);
    }

    // --- measurement tables ---
    for (const table of findTables(lines)) {
        const { columns, figures } = measurementColumns(table);
        if (columns.length === 0) continue;
        tableCount++;
        columnCount += columns.length;

        // Which marker covers which column. `col=` counts the table's columns as a reader sees
        // them, 1-based; `col=*` means every measurement column and is allowed only on the two
        // markers that do not name a per-column source.
        const coverage = new Map();
        const parsed = table.markers.map((m) => ({ ...m, ...parseMarker(m.text) }));
        for (const marker of parsed) {
            if (!marker.kind) {
                problems.push(
                    `${rel}:${marker.line}: \`${marker.text}\` is a gate marker with no form. Use ` +
                        `axis= / stale / unrecorded / size — see scripts/check-doc-numbers.mjs.`
                );
                continue;
            }
            const spec = marker.kv.col;
            let targets;
            if (spec === '*' || spec === undefined) {
                if (spec === undefined && columns.length > 1) {
                    problems.push(
                        `${rel}:${marker.line}: this table has ${columns.length} measurement columns (` +
                            columns
                                .map((c) => `${c + 1}: "${cleanCell(table.header[c])}"`)
                                .join(', ') +
                            `), so every marker needs col=. Add one marker per column.`
                    );
                    continue;
                }
                if (spec === '*' && marker.kind === 'axis') {
                    problems.push(
                        `${rel}:${marker.line}: col=* is not allowed with axis= — each column is a ` +
                            `different run and needs its own label=. Write one marker per column.`
                    );
                    continue;
                }
                targets = columns;
            } else {
                const idx = Number(spec) - 1;
                if (!columns.includes(idx)) {
                    problems.push(
                        `${rel}:${marker.line}: col=${spec} is not a measurement column of this ` +
                            `table. Its measurement columns are ` +
                            columns
                                .map((c) => `${c + 1} ("${cleanCell(table.header[c])}")`)
                                .join(', ') +
                            `.`
                    );
                    continue;
                }
                targets = [idx];
            }
            for (const c of targets) {
                if (coverage.has(c)) {
                    problems.push(
                        `${rel}:${marker.line}: column ${c + 1} ("${cleanCell(
                            table.header[c]
                        )}") is ` + `claimed by two markers. One column, one source.`
                    );
                    continue;
                }
                coverage.set(c, marker);
            }
        }

        for (const c of columns) {
            const marker = coverage.get(c);
            const head = cleanCell(table.header[c]) || `column ${c + 1}`;
            const label = `col ${c + 1} "${head}"`;

            if (!marker) {
                const guessed = guessAxis(lines, table.headerLine);
                add(rel, table.headerLine, label, '✖ no source', '—');
                problems.push(
                    `${rel}:${table.headerLine}: ${label} publishes measurements and names no source.\n` +
                        `      Add one line directly above the table:\n` +
                        `        <!-- gate: axis=${guessed ?? '<axis>'} label=<label>${
                            columns.length > 1 ? ` col=${c + 1} field=<field>` : ''
                        } -->\n` +
                        `        (field= defaults to median; name it when the column carries ` +
                        `reps/min/p25/p75/max/perElement/trailing1/trailing2)\n` +
                        `        <!-- gate: stale${
                            columns.length > 1 ? ` col=${c + 1}` : ''
                        } reason="…why these are superseded…" -->\n` +
                        `        <!-- gate: unrecorded${
                            columns.length > 1 ? ` col=${c + 1}` : ''
                        } cmd=<script that produced them> date=YYYY-MM-DD -->\n` +
                        `      Recorded axes on disk: ` +
                        axisNames
                            .map(
                                (a) =>
                                    `${a} (${byAxis
                                        .get(a)
                                        .map((r) => r.label)
                                        .join(', ')})`
                            )
                            .join(' · ')
                );
                continue;
            }

            // `field=` addresses a number inside a recording. The three markers below check no
            // number at all, so a field= on one of them reads as a check that is not happening.
            if (marker.kind !== 'axis' && marker.kv.field !== undefined) {
                add(rel, marker.line, label, '✖ marker', '—');
                problems.push(
                    `${rel}:${marker.line}: field=${marker.kv.field} on a \`${marker.kind}\` marker ` +
                        `checks nothing — only axis= reads a recorded field. Drop it, or trace the ` +
                        `column properly with axis=<axis> label=<label>.`
                );
                continue;
            }

            if (marker.kind === 'stale') {
                if (!marker.kv.reason) {
                    add(rel, marker.line, label, '✖ marker', '—');
                    problems.push(
                        `${rel}:${marker.line}: a stale marker must say why — reason="…". An escape ` +
                            `hatch with no sentence in it is a silent one.`
                    );
                    continue;
                }
                staleCount++;
                add(rel, table.headerLine, label, 'stale', marker.kv.reason.slice(0, 60));
                continue;
            }

            if (marker.kind === 'unrecorded') {
                const { cmd, date, axis } = marker.kv;
                if (!cmd || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    add(rel, marker.line, label, '✖ marker', '—');
                    problems.push(
                        `${rel}:${marker.line}: an unrecorded marker needs cmd=<script> and ` +
                            `date=YYYY-MM-DD. Without both, "we measured this somehow, once" is all ` +
                            `it says.`
                    );
                    continue;
                }
                const named = cmd
                    .split(/\s+/)
                    .find((part) => part.includes('/') || part.includes('.'));
                const candidates = named
                    ? [join(root, named), join(root, 'packages/benchmarks', named)]
                    : [];
                if (!candidates.some(existsSync)) {
                    add(rel, marker.line, label, '✖ no cmd', named ?? cmd);
                    problems.push(
                        `${rel}:${marker.line}: cmd=${cmd} names \`${
                            named ?? cmd
                        }\`, which is not in ` +
                            `the repository (looked in ./ and packages/benchmarks/). A reproducer ` +
                            `that does not exist is not one.`
                    );
                    continue;
                }
                if (axis && byAxis.has(axis)) {
                    add(
                        rel,
                        marker.line,
                        label,
                        '✖ recorded',
                        `${byAxis.get(axis).length} recording(s)`
                    );
                    problems.push(
                        `${rel}:${marker.line}: marked unrecorded, but axis \`${axis}\` has ` +
                            `${byAxis.get(axis).length} recording(s) on disk (` +
                            byAxis
                                .get(axis)
                                .map((r) => r.label)
                                .join(', ') +
                            `). Quote one of them with axis=${axis} label=<label>.`
                    );
                    continue;
                }
                unrecordedCount++;
                add(rel, table.headerLine, label, 'unrecorded', `${named} · ${date}`);
                continue;
            }

            if (marker.kind === 'size') {
                add(rel, marker.line, label, '✖ marker', '—');
                problems.push(
                    `${rel}:${marker.line}: a size marker labels a sentence, not a table column. ` +
                        `Cover this column with axis= / stale / unrecorded.`
                );
                continue;
            }

            // --- axis= : the checked case -------------------------------------------------
            const axis = marker.kv.axis;
            const wanted = marker.kv.label;
            const recordings = byAxis.get(axis);
            if (!recordings) {
                add(rel, marker.line, label, '✖ no axis', '—');
                problems.push(
                    `${rel}:${marker.line}: names axis \`${axis}\`, which has no recording in ` +
                        `packages/benchmarks/.gate/ (axes present: ${
                            axisNames.join(', ') || 'none'
                        }). ` +
                        `Record it — \`node scripts/run-one-axis.js ${axis} --record=<label>\` from ` +
                        `packages/benchmarks — or mark the column unrecorded with the command that ` +
                        `produced these numbers.`
                );
                continue;
            }
            const named = recordings.find((r) => r.label === wanted);
            if (!named) {
                add(
                    rel,
                    marker.line,
                    label,
                    '✖ no label',
                    recordings.map((r) => r.label).join(', ')
                );
                problems.push(
                    `${rel}:${marker.line}: names \`${axis}.${wanted}\`, and there is no such ` +
                        `recording. Labels on disk for that axis: ` +
                        recordings.map((r) => r.label).join(', ') +
                        `.`
                );
                continue;
            }
            if (named.batch === null) {
                problems.push(
                    `${rel}:${marker.line}: NOTE — ${named.file} carries no \`batch\` field, so it ` +
                        `predates the per-row noise floor and cannot be fed to compare-axis.mjs. ` +
                        `Its medians are honest; a comparison built on them is not gated.`
                );
            }

            // WHICH FIELD OF THE ROW this column carries. Default `median` — that is what every
            // marker written before this existed meant, and they keep meaning it.
            const field = marker.kv.field ?? 'median';
            const present = fieldsOf(named);
            if (!present.has(field)) {
                add(rel, marker.line, label, '✖ no field', [...present].join(', ') || 'none');
                problems.push(
                    `${rel}:${marker.line}: names field=${field}, and no row of ${named.file} ` +
                        `carries a number under that name. Its rows carry: ` +
                        ([...present].join(', ') || 'no numeric fields at all') +
                        `. Name the field this column actually publishes — the column index alone ` +
                        `cannot say it, which is why the gate used to compare every column against ` +
                        `median.`
                );
                continue;
            }

            const participants = [...named.rows.keys()];
            const map = parseMap(marker.kv.map);
            const resolved = [];
            const seen = new Map();

            for (let bi = 0; bi < table.body.length; bi++) {
                const body = table.body[bi];
                const fig = figures[c][bi];
                if (!fig) continue;
                figureCount++;
                const cellText = cleanCell(body.cells[0] ?? '');
                const hit = resolveParticipant(body.cells[0] ?? '', participants, map);
                const shown = `${cellText} ${fig.text}`;

                if (!hit) {
                    add(rel, body.line, shown, '✖ unknown row', `not in ${named.file}`);
                    problems.push(
                        `${rel}:${body.line}: row "${cellText}" matches no participant in ` +
                            `${named.file}. Its rows are: ${participants.join(', ')}. Add ` +
                            `map="${cellText}:<participant>" to the marker, or drop the row.`
                    );
                    continue;
                }
                if (seen.has(hit.name)) {
                    add(rel, body.line, shown, '✖ ambiguous', `also "${seen.get(hit.name)}"`);
                    problems.push(
                        `${rel}:${body.line}: "${cellText}" and "${seen.get(
                            hit.name
                        )}" both resolve to ` +
                            `\`${hit.name}\`. Disambiguate with map="${cellText}:<participant>" — two ` +
                            `rows traced to one recorded row is a wrong trace, not a loose one.`
                    );
                    continue;
                }
                seen.set(hit.name, cellText);

                const tol = toleranceOf(fig);
                const namedRow = named.rows.get(hit.name);
                const namedVal = valueOf(namedRow, field);
                const near = nearestAcross(recordings, hit.name, fig.value, field);

                if (namedVal !== null && Math.abs(namedVal - fig.value) <= tol) {
                    resolved.push({ participant: hit.name, fig, body });
                    add(rel, body.line, shown, 'ok', `${field} ${namedVal} (${named.label})`);
                    continue;
                }
                const elsewhere = recordings.find((r) => {
                    const v = valueOf(r.rows.get(hit.name), field);
                    return v !== null && Math.abs(v - fig.value) <= tol;
                });
                if (elsewhere) {
                    otherRunCount++;
                    resolved.push({ participant: hit.name, fig, body });
                    const there = valueOf(elsewhere.rows.get(hit.name), field);
                    add(rel, body.line, shown, 'other run', `${field} ${there} (${elsewhere.label})`);
                    problems.push(
                        `${rel}:${body.line}: NOTE — ${fig.text} is the \`${field}\` of ` +
                            `\`${hit.name}\` in \`${axis}.${elsewhere.label}\`, not in the ` +
                            `\`${wanted}\` this marker names (which has ${
                                namedVal === null
                                    ? namedRow
                                        ? `no ${field}`
                                        : 'no such row'
                                    : namedVal
                            }). Traceable, but to a different run: fix label= or re-copy the column.`
                    );
                    continue;
                }
                add(
                    rel,
                    body.line,
                    shown,
                    '✖ no match',
                    near ? `${field} ${near.value} (${near.label})` : `no \`${hit.name}\`.${field}`
                );
                problems.push(
                    `${rel}:${body.line}: publishes ${fig.text} as the \`${field}\` of ` +
                        `\`${hit.name}\` on axis \`${axis}\`. ${named.file} records ` +
                        `${
                            namedVal === null
                                ? namedRow
                                    ? `no ${field} on that row`
                                    : 'no such row'
                                : namedVal
                        }` +
                        (near
                            ? `, and the nearest ${field} in ANY recording of that axis is ` +
                              `${near.value} (${near.label}) — ${(
                                  (Math.abs(near.value - fig.value) / Math.max(near.value, 1e-9)) *
                                  100
                              ).toFixed(1)}% away`
                            : ``) +
                        `. Quote a recorded value, or re-record the axis.`
                );
            }

            // Ordering — the README's claim was a ranking, not a millisecond.
            for (let a = 0; a < resolved.length; a++) {
                for (let b = a + 1; b < resolved.length; b++) {
                    const A = resolved[a];
                    const B = resolved[b];
                    const ra = valueOf(named.rows.get(A.participant), field);
                    const rb = valueOf(named.rows.get(B.participant), field);
                    if (ra === null || rb === null) continue;
                    const pubDiff = A.fig.value - B.fig.value;
                    const recDiff = ra - rb;
                    if (pubDiff === 0 || recDiff === 0) continue;
                    if (Math.sign(pubDiff) === Math.sign(recDiff)) continue;
                    add(
                        rel,
                        A.body.line,
                        `${A.participant} vs ${B.participant}`,
                        '✖ order',
                        `${field} ${ra} vs ${rb}`
                    );
                    problems.push(
                        `${rel}:${A.body.line}: the table puts \`${A.participant}\` ` +
                            `${pubDiff < 0 ? 'ahead of' : 'behind'} \`${B.participant}\` on ` +
                            `\`${field}\` (${A.fig.text} vs ${B.fig.text}); ${named.file} has them ` +
                            `the other way round (${ra} vs ${rb}). The ordering is the claim a reader ` +
                            `takes away — fix it before the milliseconds.`
                    );
                }
            }
        }
    }
}

// ── report ────────────────────────────────────────────────────────────────────────────────────

console.log('\n📐 published-number gate — every measurement against the run that produced it\n');
console.log(
    'recordings on disk: ' +
        (axisNames.length
            ? axisNames
                  .map(
                      (a) =>
                          `${a} (${byAxis
                              .get(a)
                              .map((r) => r.label)
                              .join(', ')})`
                  )
                  .join(' · ')
            : 'NONE — packages/benchmarks/.gate is empty, so nothing can be traced')
);
console.log(
    `scanned: ${tableCount} measurement table(s) · ${columnCount} measurement column(s) · ` +
        `${figureCount} figure(s) checked against a recording · ${sizeCount} size claim(s)\n`
);

if (rows.length === 0) {
    console.log('no published measurements found — nothing to trace');
} else {
    const w1 = Math.max(9, ...rows.map((r) => r.where.length));
    const w2 = Math.max(6, ...rows.map((r) => r.figure.length));
    const w3 = Math.max(6, ...rows.map((r) => r.status.length));
    console.log(
        `${'file:line'.padEnd(w1)}  ${'figure'.padEnd(w2)}  ${'status'.padEnd(
            w3
        )}  nearest recording`
    );
    for (const r of rows) {
        console.log(
            `${r.where.padEnd(w1)}  ${r.figure.padEnd(w2)}  ${r.status.padEnd(w3)}  ${r.nearest}`
        );
    }
}

const failures = rows.filter((r) => r.status.startsWith('✖'));
const notes = problems.filter((p) => p.includes(': NOTE — '));
const hard = problems.filter((p) => !p.includes(': NOTE — '));

if (notes.length > 0) {
    console.log('\n— notes —\n');
    for (const n of notes) console.log('  ' + n);
}

console.log(
    `\n${staleCount} column(s) declared stale · ${unrecordedCount} unrecorded · ` +
        `${otherRunCount} figure(s) traced to a different run than the marker names`
);

if (hard.length > 0) {
    console.error('\n✖ published numbers that cannot be traced to a recording:\n');
    for (const p of hard) console.error('  ' + p);
    console.error(
        `\n${failures.length} failing figure/column(s), ${hard.length} problem(s). Every number this ` +
            `page publishes has to come from a file in packages/benchmarks/.gate or from a marked ` +
            `disclosure — see the header of scripts/check-doc-numbers.mjs.`
    );
    process.exit(1);
}

console.log('\n✓ every published measurement is traceable');
