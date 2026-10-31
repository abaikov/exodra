// Honesty gate for the benchmark: every framework must render the SAME DOM as the
// canonical app, else its speed/heap numbers are meaningless. Mounts each fw once
// and counts the structural nodes. Expected (from todo-spec.ts): 10 decks, 10 author
// spans, 10 dates, 10 rename buttons, 10 `.cards` containers, 80 cards, 80 tog,
// 80 addtag, 40 details (even i), 200 tags (sum of startCount over 80 cards),
// 80 count spans (one per card, the `.count` label beside the tag list).
//
// The selectors here did not change when the card gained its three derived values —
// two of the three are a TEXT and an ATTRIBUTE inside elements this already counts,
// and only `.count` is a new element. They DID change when the app gained its third
// level, because a deck is five new elements plus the container its cards live in,
// and a participant that dropped the deck level entirely would otherwise pass this
// gate on an app one level shallower than the reference. It is counted for the same
// reason every other kind is: this gate cannot see a wrong value, but it must not be
// able to miss a missing element.
// `exodra` is Exodra's own implementation (src/benchmarks/apps/exodra/exodra.tsx), mounted through
// `participants/exodra/app.tsx`, and is also the
// suite's markup reference; the rest come from `loadMounts()`.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://localhost:3001';
let vite = null;
const startVite = () => new Promise((res, rej) => {
  vite = spawn('npm', ['run', 'dev'], { cwd: rootDir, shell: true, stdio: 'pipe', env: { ...process.env, BROWSER: 'none' } });
  let ready = false;
  vite.stdout.on('data', d => { const s = d.toString(); if (!ready && (s.includes('Local:') || s.includes('http://localhost'))) { ready = true; setTimeout(res, 2000); } });
  vite.on('error', rej);
  setTimeout(() => { if (!ready) rej(new Error('vite timeout')); }, 30000);
});

try {
  await startVite();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#runAll', { timeout: 10000 });

  const rows = await page.evaluate(async () => {
    const { loadMounts } = await import('/src/benchmarks/participants/bundled/todo-app.tsx');
    const { mountExodraApp } = await import('/src/benchmarks/participants/exodra/app.tsx');
    const mounts = { exodra: mountExodraApp, ...(await loadMounts()) };
    const names = ['exodra', 'solid', 'svelte', 'react', 'voby', 'marko'];
    const out = [];
    for (const name of names) {
      const d = document.createElement('div');
      document.body.appendChild(d);
      let counts;
      try {
        const app = mounts[name](d);
        const q = s => d.querySelectorAll(s).length;
        counts = { deck: q('.deck'), h2: q('.deck > h2'), author: q('.author'), date: q('.date'), ren: q('.ren'), cards: q('.cards'), card: q('.card'), tog: q('.tog'), addtag: q('.addtag'), details: q('.details'), tag: q('.tag'), h3: q('h3'), count: q('.count') };
        app.teardown();
      } catch (e) { counts = { error: String(e && e.message || e) }; }
      d.remove();
      out.push([name, counts]);
    }
    return out;
  });

  const expected = { deck: 10, h2: 10, author: 10, date: 10, ren: 10, cards: 10, card: 80, tog: 80, addtag: 80, details: 40, tag: 200, h3: 80, count: 80 };
  console.log('\nexpected:', JSON.stringify(expected));
  let allOk = true;
  for (const [name, c] of rows) {
    const ok = !c.error && Object.keys(expected).every(k => c[k] === expected[k]);
    if (!ok) allOk = false;
    console.log(`${ok ? '✅' : '❌'} ${name.padEnd(7)} ${JSON.stringify(c)}`);
  }
  console.log(allOk ? '\n✅ ALL frameworks render identical structure — numbers are comparable' : '\n❌ MISMATCH — some framework under/over-rendered; its numbers are NOT comparable');
  await browser.close();
} catch (e) {
  console.error('❌', e.message);
} finally {
  if (vite) vite.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
}
