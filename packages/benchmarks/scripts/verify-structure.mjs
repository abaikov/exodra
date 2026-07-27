// Honesty gate for the benchmark: every framework must render the SAME DOM as the
// canonical app, else its speed/heap numbers are meaningless. Mounts each fw once
// and counts the structural nodes. Expected (from todo-app.tsx): 80 cards, 80 tog,
// 80 addtag, 40 details (even i), 200 tags (sum of startCount over 80 cards).
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
    const { loadMounts } = await import('/src/benchmarks/todo-app.tsx');
    const mounts = await loadMounts();
    const names = ['exodra', 'solid', 'svelte', 'react', 'voby'];
    const out = [];
    for (const name of names) {
      const d = document.createElement('div');
      document.body.appendChild(d);
      let counts;
      try {
        const app = mounts[name](d);
        const q = s => d.querySelectorAll(s).length;
        counts = { card: q('.card'), tog: q('.tog'), addtag: q('.addtag'), details: q('.details'), tag: q('.tag'), h3: q('h3') };
        app.teardown();
      } catch (e) { counts = { error: String(e && e.message || e) }; }
      d.remove();
      out.push([name, counts]);
    }
    return out;
  });

  const expected = { card: 80, tog: 80, addtag: 80, details: 40, tag: 200, h3: 80 };
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
