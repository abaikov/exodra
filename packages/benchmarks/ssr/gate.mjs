// THE FAIRNESS GATE for the SSR suite — run it, and only then believe the TTIs.
//
//   node ssr/gate.mjs          # the uniform interactive list (measure.mjs's app)
//   node ssr/gate.mjs todo     # the realistic todo (todo-measure.mjs's app)
//
// It inspects the index.html files the measure scripts WROTE, so it gates exactly
// the bytes that were measured rather than a re-render that might differ. Run it
// IMMEDIATELY after the measure script for that app; a non-zero exit means at
// least one participant's number is not comparable to the others'.
//
// "Immediately" is not a figure of speech: `hyd.mjs` writes over
// `dist/solid/index.html`, `dist/marko/index.html` and `dist/exodra/index.html` with its own
// N sweep and leaves them at N=30000 while
// `dist/qwik/index.html` stays at whatever `measure.mjs` left. Gating after a
// hydration run therefore compares two different apps and says so, loudly, which
// is the right failure but not a useful one.
//
// WHY IT EXISTS. A timing harness cannot tell the difference between a framework
// that is fast and a framework that quietly did less: fewer rows, no listener past
// the first one, a client re-render instead of hydration, an app root that never
// arrived. Every one of those makes TTI and FCP better. So before any number is
// read, three things are checked for every participant:
//
//  1. MARKUP PARITY — with JavaScript DISABLED (so this is purely what the server
//     sent), every participant's app subtree must have the same shape, the same
//     classes, the same data-id/data-b attributes and the same text. Framework
//     hydration markers are ignored on purpose: Solid's `data-hk`, Qwik's `q:*`
//     and its comment anchors, Marko's resume comments plus the inline script
//     carrying its serialised scopes, and Mikado's `click="…"` route attribute are
//     each framework's cost of doing business and are already paid for in the
//     HTML-bytes column. What is NOT ignored is a row that is missing, a label that
//     is empty or a counter that never rendered.
//  2. INTERACTIVITY EVERYWHERE — the measure scripts poll `button[data-b="0"]`, so
//     a participant that wired only the first row would post the best TTI in the
//     suite. Here the FIRST, MIDDLE and LAST rows must each respond to a click.
//  3. ADOPTION — a MutationObserver installed before the page's own scripts run
//     counts what leaves the server's tree. Hydration and resumability both claim
//     to take the markup over; a participant that removes elements re-rendered
//     instead, which is different work and must not be compared as if it were the
//     same. The post-hydration markup is also re-signed and compared with (1), so
//     a silent re-render that happens to produce identical markup still shows up
//     as a removal count.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { gzipSync } from 'zlib';

const DIST = resolve(process.cwd(), 'ssr/dist');

// Per app: the app's OWN root element (not the harness wrapper — Solid, the schema core and
// Marko all sit inside `#app` while Qwik renders its own `q:container` div, and comparing
// from the app root makes that difference a non-issue), the row selector and the counter
// selector.
const APPS = {
    list: {
        title: 'uniform interactive list (measure.mjs)',
        root: '.list',
        row: 'li.row',
        counter: 'button[data-b]',
        port: 4501,
        dirs: { Exodra: 'exodra', Solid: 'solid', Qwik: 'qwik', Marko: 'marko', Mikado: 'mikado' },
    },
    todo: {
        title: 'realistic todo (todo-measure.mjs)',
        root: '.todo',
        row: 'article.card',
        counter: 'button[data-b]',
        port: 4511,
        // NO EXODRA PARTICIPANT: the realistic-todo SSR app existed only for the deleted
        // three-props renderer and the deleted cursor prototype.
        dirs: { Solid: 'solid-todo', Qwik: 'qwik-todo', Marko: 'marko-todo' },
    },
};

const app = APPS[process.argv[2] ?? 'list'];
if (app === undefined) {
    console.error(`gate: unknown app ${JSON.stringify(process.argv[2])} — use one of: ${Object.keys(APPS).join(', ')}`);
    process.exit(2);
}

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css' };
function serve(rootDir, port) {
    const s = createServer((req, res) => {
        let p = join(rootDir, decodeURIComponent(req.url.split('?')[0]));
        if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
        if (!existsSync(p)) { res.writeHead(404); return res.end('404 ' + req.url); }
        res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
        res.end(readFileSync(p));
    });
    return new Promise((r) => s.listen(port, () => r(s)));
}

// ---- the two page-side probes ----------------------------------------------
// Passed to `page.evaluate` as source, so they close over nothing.

/**
 * A canonical description of the app subtree: depth, tag, the three attributes the
 * apps actually declare, and the element's OWN text with whitespace collapsed
 * (concatenated across its direct text children, because Solid and Qwik split a
 * label into several text nodes where the schema core emits one).
 *
 * Counter text is blanked — it is the one thing that legitimately differs between
 * a freshly parsed page and one that has been clicked.
 */
function signature([rootSel, counterSel]) {
    const root = document.querySelector(rootSel);
    if (root === null) return { error: `no element matching ${rootSel}` };
    const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK']);
    const KEEP = ['class', 'data-id', 'data-b'];
    const lines = [];
    let elements = 0;
    const walk = (el, depth) => {
        elements++;
        let own = '';
        for (const n of el.childNodes) if (n.nodeType === 3) own += n.data;
        own = own.replace(/\s+/g, ' ').trim();
        if (el.matches(counterSel)) own = '<counter>';
        let attrs = '';
        for (const a of KEEP) {
            const v = el.getAttribute(a);
            if (v !== null) attrs += ` ${a}=${v}`;
        }
        lines.push(`${depth}|${el.tagName.toLowerCase()}${attrs}|${own}`);
        for (const n of el.childNodes) {
            if (n.nodeType === 1 && !SKIP.has(n.tagName)) walk(n, depth + 1);
        }
    };
    walk(root, 0);
    return { sig: lines.join('\n'), elements };
}

/** Row and counter counts, and whether the counters are 0..n-1 with no gaps. */
function census([rowSel, counterSel]) {
    const rows = document.querySelectorAll(rowSel).length;
    const ids = Array.from(document.querySelectorAll(counterSel), (b) => b.getAttribute('data-b'));
    return { rows, counters: ids.length, contiguous: ids.every((v, i) => v === String(i)) };
}

// Installed BEFORE any page script: parsing only ever ADDS nodes, so anything
// removed from here on was removed by the framework.
const WATCH = `
window.__GATE__ = { removedElements: 0, removedText: 0 };
new MutationObserver((records) => {
  for (const r of records) {
    for (const n of r.removedNodes) {
      if (n.nodeType === 1) window.__GATE__.removedElements++;
      else if (n.nodeType === 3) window.__GATE__.removedText++;
    }
  }
}).observe(document, { childList: true, subtree: true });
`;

const CLICK_BUDGET_MS = 30000;

/**
 * Click one counter until its text moves off the server's value, or give up.
 *
 * The click and the read are separate CDP round-trips, so a framework that
 * batches its DOM writes (Marko queues them and drains from a microtask) has
 * always committed by the time the text is read — no per-framework flush helper
 * is needed here, and none would be honest: the question is whether the DOM the
 * user is looking at has changed.
 */
async function clickUntilLive(page, index) {
    const sel = `button[data-b="${index}"]`;
    const t0 = Date.now();
    while (Date.now() - t0 < CLICK_BUDGET_MS) {
        await page.click(sel, { force: true, timeout: 250 }).catch(() => {});
        const txt = await page.evaluate((s) => {
            const b = document.querySelector(s);
            return b === null ? null : b.textContent.trim();
        }, sel).catch(() => null);
        if (txt !== null && txt !== '0') return Date.now() - t0;
    }
    return null;
}

// ---- run --------------------------------------------------------------------
const names = Object.keys(app.dirs);
const servers = [];
const ports = {};
let port = app.port;
for (const name of names) {
    const dir = join(DIST, app.dirs[name]);
    ports[name] = port;
    servers.push(await serve(dir, port++));
}

const browser = await chromium.launch({ headless: true });
const results = {};

for (const name of names) {
    const dir = join(DIST, app.dirs[name]);
    const indexPath = join(dir, 'index.html');
    const r = { name, problems: [] };
    results[name] = r;

    if (!existsSync(indexPath)) {
        r.problems.push(`no ${indexPath} — build this participant and run its measure script first`);
        continue;
    }
    const html = readFileSync(indexPath);
    r.htmlBytes = html.length;
    r.htmlGz = gzipSync(html).length;

    const url = `http://localhost:${ports[name]}/`;

    // (1) what the SERVER sent, with scripts unable to run at all.
    {
        const ctx = await browser.newContext({ javaScriptEnabled: false });
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: 'load' });
        const sig = await page.evaluate(signature, [app.root, app.counter]);
        const cen = await page.evaluate(census, [app.row, app.counter]);
        if (sig.error !== undefined) r.problems.push(`server markup: ${sig.error}`);
        r.serverSig = sig.sig;
        r.elements = sig.elements;
        r.census = cen;
        if (cen.rows === 0) r.problems.push('server markup contains no rows at all');
        if (cen.counters !== cen.rows) r.problems.push(`server markup has ${cen.rows} row(s) but ${cen.counters} counter button(s)`);
        if (!cen.contiguous) r.problems.push('counter data-b values are not 0..n-1 — some rows are missing or misnumbered');
        await ctx.close();
    }

    // (2) + (3) the live page.
    {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.addInitScript(WATCH);
        await page.goto(url, { waitUntil: 'commit' });

        const n = r.census?.rows ?? 0;
        const probes = n === 0 ? [] : [0, Math.floor(n / 2), n - 1];
        r.interactive = {};
        for (const i of probes) {
            const ms = await clickUntilLive(page, i);
            r.interactive[i] = ms;
            if (ms === null) r.problems.push(`row ${i} never became interactive within ${CLICK_BUDGET_MS / 1000}s`);
        }

        r.mutations = await page.evaluate(() => window.__GATE__ ?? null);
        if (r.mutations !== null && r.mutations.removedElements > 0) {
            r.problems.push(
                `removed ${r.mutations.removedElements} element(s) from the server's tree — ` +
                    'that is a client re-render, not adoption, and is different work from the others'
            );
        }

        const after = await page.evaluate(signature, [app.root, app.counter]);
        if (after.error !== undefined) r.problems.push(`after hydration: ${after.error}`);
        // Nothing to compare against when the server markup had no app root at
        // all — that failure is already recorded and is the one worth reading.
        else if (r.serverSig !== undefined && after.sig !== r.serverSig) {
            r.problems.push(`markup changed during hydration — ${firstDiff(r.serverSig, after.sig)}`);
        }
        await ctx.close();
    }
}

await browser.close();
for (const s of servers) s.close();

// ---- verdict ----------------------------------------------------------------
function firstDiff(a, b) {
    const la = a.split('\n');
    const lb = b.split('\n');
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
        if (la[i] !== lb[i]) {
            return `line ${i + 1}:\n      expected: ${la[i] ?? '(end of markup)'}\n      found   : ${lb[i] ?? '(end of markup)'}`;
        }
    }
    return 'lengths differ but no line does (should be impossible)';
}

// Markup parity is a comparison BETWEEN participants, so it happens after the walk.
const reference = names.find((x) => results[x].serverSig !== undefined);
for (const name of names) {
    const r = results[name];
    if (name === reference || r.serverSig === undefined) continue;
    const ref = results[reference];
    if (r.serverSig !== ref.serverSig) {
        r.problems.push(`server markup differs from ${reference}'s — ${firstDiff(ref.serverSig, r.serverSig)}`);
    }
    if (r.census.rows !== ref.census.rows) {
        r.problems.push(`renders ${r.census.rows} row(s) where ${reference} renders ${ref.census.rows}`);
    }
}

console.log(`\n=== SSR GATE — ${app.title} ===\n`);
// `removed` is elements/text-nodes taken out of the server's tree during
// hydration. Elements must be zero — that is check (3). Text-node churn is
// reported but not gated: normalising a split text node is a legitimate thing for
// a hydrating renderer to do and it does not change what the user sees. Nodes
// ADDED are not counted at all, which is the honest reading — Marko's resume walk
// inserts empty text nodes as anchors where the server wrote none, and inserting
// an anchor is not the same failure as throwing the server's markup away.
console.log('fw       rows  elements  HTMLgz(B)  first  middle   last  removed E/T  verdict');
for (const name of names) {
    const r = results[name];
    const ok = r.problems.length === 0;
    const t = r.interactive ?? {};
    const times = Object.keys(t).map((k) => (t[k] === null ? 'DEAD' : `${t[k]}ms`));
    console.log(
        name.padEnd(8),
        String(r.census?.rows ?? '-').padStart(5),
        String(r.elements ?? '-').padStart(9),
        String(r.htmlGz ?? '-').padStart(10),
        (times[0] ?? '-').padStart(7),
        (times[1] ?? '-').padStart(7),
        (times[2] ?? '-').padStart(7),
        (r.mutations === null || r.mutations === undefined
            ? '-'
            : `${r.mutations.removedElements}/${r.mutations.removedText}`
        ).padStart(12),
        ok ? '  PASS' : '  FAIL'
    );
}

let failed = 0;
for (const name of names) {
    const r = results[name];
    if (r.problems.length === 0) continue;
    failed++;
    console.log(`\n${name}:`);
    for (const p of r.problems) console.log(`  - ${p}`);
}

if (failed === 0) {
    console.log(
        '\nAll participants render the same app, wire every row, and adopt the server\'s ' +
            'markup instead of replacing it. The TTI numbers for this app are comparable.\n'
    );
} else {
    console.log(`\n${failed} participant(s) FAILED the gate — their numbers for this app are NOT comparable.\n`);
    process.exitCode = 1;
}
