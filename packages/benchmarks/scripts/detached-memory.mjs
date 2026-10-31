// What does keeping N detached DOM subtrees actually cost?
//
// Relevant to caching virtual-list rows: a detached node costs no layout, no paint
// and no style recalc — only memory. So the question is just "how many bytes".
//
// CAVEAT stated up front: performance.memory sees the JS heap ONLY. A DOM node's
// bulk lives on the C++ side, which that number does not include. CDP's
// Memory.getDOMCounters is reported alongside so the node count is at least exact,
// and the JS figure should be read as a LOWER bound.
import { chromium } from 'playwright';

const N = 1000;

const browser = await chromium.launch({
    headless: true,
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
});
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await page.setContent('<div id="root"></div>');

const counters = async () => (await cdp.send('Memory.getDOMCounters'));

const before = await counters();

const result = await page.evaluate(async (N) => {
    const gc = () => { const g = globalThis.gc; if (g) { g(); g(); } };
    const heap = () => performance.memory.usedJSHeapSize;

    // A simple row: <li>row N</li>
    const simple = () => {
        const li = document.createElement('li');
        li.textContent = 'row';
        return li;
    };
    // A realistic row: the bench card's 5-element skeleton with attributes.
    const card = (i) => {
        const d = document.createElement('div');
        d.className = 'card';
        d.setAttribute('data-i', String(i));
        const h3 = document.createElement('h3');
        h3.textContent = `Task ${i}`;
        d.appendChild(h3);
        const b1 = document.createElement('button');
        b1.className = 'tog';
        b1.textContent = 'details';
        d.appendChild(b1);
        const tags = document.createElement('div');
        tags.className = 'tags';
        d.appendChild(tags);
        const b2 = document.createElement('button');
        b2.className = 'addtag';
        b2.textContent = '+';
        d.appendChild(b2);
        return d;
    };

    const measure = (make) => {
        gc();
        const base = heap();
        const kept = new Array(N);
        for (let i = 0; i < N; i++) kept[i] = make(i);
        gc();
        const used = heap() - base;
        // keep `kept` alive across the measurement, then release
        const total = kept.length;
        return { bytes: used, total };
    };

    const s = measure(simple);
    const c = measure(card);
    return { simple: s.bytes, card: c.bytes };
}, N);

const after = await counters();
const nodeDelta = after.nodes - before.nodes;

const kb = (b) => (b / 1024).toFixed(0);
console.log(`\n=== DETACHED DOM COST — ${N} subtrees kept alive (JS heap only) ===\n`);
console.log(`simple <li>        ${kb(result.simple).padStart(6)} KB total   ${(result.simple / N).toFixed(0).padStart(4)} B per row`);
console.log(`5-element card     ${kb(result.card).padStart(6)} KB total   ${(result.card / N).toFixed(0).padStart(4)} B per row  (${(result.card / N / 5).toFixed(0)} B per element)`);
console.log(`\nCDP DOM node delta during the run: ${nodeDelta}`);
console.log('Read the byte figures as a LOWER bound — the native side is not in the JS heap.\n');

await browser.close();
