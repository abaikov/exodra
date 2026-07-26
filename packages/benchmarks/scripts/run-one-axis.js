#!/usr/bin/env node
// Run a SINGLE benchmark axis headlessly (running all 6 in one browser session
// OOMs). Usage: node scripts/run-one-axis.js <axis-name>
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const port = 3001;
const url = `http://localhost:${port}`;

const AXES = {
  'initial-render': ['./src/benchmarks/initial-render.tsx', 'benchmarkInitialRender'],
  'app-update': ['./src/benchmarks/app-update.tsx', 'benchmarkAppUpdate'],
  'list-update': ['./src/benchmarks/list-reconcile.tsx', 'benchmarkListReconcile'],
  'reconcile': ['./src/benchmarks/reconcile.tsx', 'benchmarkReconcile'],
  'reactive-update': ['./src/benchmarks/reactive-update.tsx', 'benchmarkReactiveUpdate'],
  'toggle': ['./src/benchmarks/toggle.tsx', 'benchmarkToggle'],
};

const axisName = process.argv[2];
if (!AXES[axisName]) {
  console.error(`Unknown axis "${axisName}". Options: ${Object.keys(AXES).join(', ')}`);
  process.exit(2);
}

let viteProcess = null;
function startVite() {
  return new Promise((resolve, reject) => {
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: rootDir, shell: true, stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' },
    });
    let ready = false;
    viteProcess.stdout.on('data', d => {
      const s = d.toString();
      if (!ready && (s.includes('Local:') || s.includes('http://localhost'))) {
        ready = true; setTimeout(resolve, 2000);
      }
    });
    viteProcess.on('error', reject);
    setTimeout(() => { if (!ready) reject(new Error('vite timeout')); }, 30000);
  });
}
function stopVite() { if (viteProcess) { viteProcess.kill('SIGTERM'); viteProcess = null; } }

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
  });
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('✅') || t.includes('❌')) console.log(t);
    else if (msg.type() === 'error') console.error('[browser error]', t);
  });
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#runAll', { timeout: 10000 });
  const [path, fn] = AXES[axisName];
  console.log(`\n📊 axis: ${axisName}\n`);
  await page.evaluate(async ([p, f]) => {
    const mod = await import(p);
    await mod[f]();
  }, [path, fn]);
  await browser.close();
}

try {
  await startVite();
  await run();
} catch (e) {
  console.error('❌', e.message);
} finally {
  stopVite();
  setTimeout(() => process.exit(0), 500);
}
