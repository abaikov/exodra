#!/usr/bin/env node

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const port = 3001;
const url = `http://localhost:${port}`;

let viteProcess = null;

function startViteServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Vite dev server...');
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: rootDir,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' }, // Don't open browser
    });

    let serverReady = false;

    viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready') || output.includes('http://localhost')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Vite server ready');
          setTimeout(resolve, 2000); // Give it a moment to fully start
        }
      }
    });

    viteProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('error')) {
        console.error('Vite error:', output);
      }
    });

    viteProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Vite server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

function stopViteServer() {
  if (viteProcess) {
    console.log('\n🛑 Stopping Vite server...');
    viteProcess.kill('SIGTERM');
    viteProcess = null;
  }
}

async function runBenchmarks() {
  console.log('🌐 Launching headless browser...');
  const browser = await chromium.launch({
    headless: true,
    // Expose window.gc() (force GC before sampling) and enable precise memory
    // info (unquantized performance.memory) so the retained-heap "at what cost"
    // numbers are real rather than bucketed to 0.
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
  });

  const page = await browser.newPage();

  // Capture console logs and errors
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      console.error(`[Browser ${type}]:`, text);
    } else if (text.includes('✅') || text.includes('❌')) {
      console.log(`[Browser]:`, text);
    }
  });

  page.on('pageerror', (error) => {
    console.error('[Browser Page Error]:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  });

  // Set viewport
  await page.setViewportSize({ width: 1920, height: 1080 });

  console.log(`📄 Loading ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for page to be ready
  await page.waitForSelector('#runAll', { timeout: 10000 });

  console.log('\n📊 Running benchmarks...\n');

  // The curated suite — 4 axes, each measured through the shared A/B harness
  // (interleaved Exodra vs Solid, GC/sample, median + full spread). Each bench
  // prints its own ✅ lines, forwarded by the console filter above.
  await page.evaluate(async () => {
    const axes = [
      ['./src/benchmarks/initial-render.tsx', 'benchmarkInitialRender'],
      ['./src/benchmarks/app-update.tsx', 'benchmarkAppUpdate'],
      ['./src/benchmarks/list-reconcile.tsx', 'benchmarkListReconcile'],
      ['./src/benchmarks/reconcile.tsx', 'benchmarkReconcile'],
      ['./src/benchmarks/reactive-update.tsx', 'benchmarkReactiveUpdate'],
      ['./src/benchmarks/toggle.tsx', 'benchmarkToggle'],
    ];
    for (const [path, fn] of axes) {
      try {
        const mod = await import(path);
        await mod[fn]();
      } catch (e) {
        console.error(`❌ ${fn} failed:`, e && e.message ? e.message : e);
      }
    }
  });

  await browser.close();
  console.log('\n✅ Benchmarks completed!\n');
}

async function main() {
  try {
    await startViteServer();
    await runBenchmarks();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    stopViteServer();
    // Give it a moment to clean up
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
