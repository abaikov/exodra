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

  // Inject benchmark runner and execute
  const results = await page.evaluate(async () => {
    // Import benchmark functions
    const { benchmarkConditionalRender } = await import(
      './src/benchmarks/conditional-render.tsx'
    );
    const { benchmarkListOperations } = await import(
      './src/benchmarks/list-operations.tsx'
    );
    const { benchmarkSignalOperations } = await import(
      './src/benchmarks/signal-operations.tsx'
    );
    const { benchmarkEffectPerformance } = await import(
      './src/benchmarks/effect-performance.tsx'
    );
    const { benchmarkAdvancedListOperations } = await import(
      './src/benchmarks/advanced-list-operations.tsx'
    );
    const { benchmarkNestedComponents } = await import(
      './src/benchmarks/nested-components.tsx'
    );
    const { benchmarkMultipleSignals } = await import(
      './src/benchmarks/multiple-signals.tsx'
    );
    const { benchmarkInitialRender } = await import(
      './src/benchmarks/initial-render.tsx'
    );

    const allResults = [];

    const runReactive = async (name, fn, iterations, frameworks = ['exodra', 'solid', 'svelte']) => {
      for (const framework of frameworks) {
        console.log(`Running ${name} (${framework})...`);
        try {
          const result = await fn(framework, iterations);
          allResults.push(result);
          console.log(`${framework}: median ${result.medianTime.toFixed(3)}ms, avg ${result.avgTime.toFixed(3)}ms`);
        } catch (error) {
          console.error(`❌ ${framework} ${name} failed:`, error.message);
        }
      }
    };

    // Run conditional render benchmark
    await runReactive('Conditional Component Render', benchmarkConditionalRender, 1000);

    // Run list operations benchmark
    console.log('\nRunning List Operations...');
    await runReactive('List Operations', benchmarkListOperations, 1000);

    // Run signal operations benchmark
    console.log('\nRunning Signal Operations...');
    await runReactive('Signal Operations', benchmarkSignalOperations, 10000, ['exodra', 'solid']);

    // Run effect performance benchmark
    console.log('\nRunning Effect Performance...');
    await runReactive('Effect Performance', benchmarkEffectPerformance, 1000, ['exodra', 'solid']);

    // Run advanced list operations benchmark
    console.log('\nRunning Advanced List Operations...');
    await runReactive('Advanced List Operations', benchmarkAdvancedListOperations, 500, ['exodra', 'solid']);

    // Run nested components benchmark
    console.log('\nRunning Nested Components...');
    await runReactive('Nested Components', benchmarkNestedComponents, 500, ['exodra', 'solid']);

    // Run multiple signals benchmark
    console.log('\nRunning Multiple Signals...');
    await runReactive('Multiple Signals', benchmarkMultipleSignals, 500, ['exodra', 'solid']);

    // Run initial render benchmark
    console.log('\nRunning Initial Render...');
    for (const framework of ['exodra', 'solid', 'svelte', 'react']) {
      console.log(`Running Initial Render (${framework})...`);
      try {
        const result = await benchmarkInitialRender(framework, 20);
        allResults.push(result);
        console.log(`${framework}: ${result.avgTime.toFixed(3)}ms`);
      } catch (error) {
        console.error(`❌ ${framework} initial render failed:`, error.message);
      }
    }

    return allResults;
  });

  await browser.close();

  const scoreTime = (result) =>
    result.medianTime > 0 ? result.medianTime : result.avgTime;

  // Print results
  console.log('\n\n📈 Benchmark Results');
  console.log('═'.repeat(60));

  // Group results by benchmark name
  const benchmarkNames = [...new Set(results.map((r) => r.name))];

  for (const name of benchmarkNames) {
    const group = results.filter((r) => r.name === name);
    if (group.length === 0) continue;

    const fastest = group.reduce((a, b) => (scoreTime(a) < scoreTime(b) ? a : b));
    const slowest = group.reduce((a, b) => (scoreTime(a) > scoreTime(b) ? a : b));
    const fastestScore = scoreTime(fastest);
    const slowestScore = scoreTime(slowest);
    const speedup = slowestScore / Math.max(fastestScore, Number.EPSILON);

    console.log(`\n🔹 ${name}`);
    console.log('─'.repeat(60));
    for (const result of group.sort((a, b) => scoreTime(a) - scoreTime(b))) {
      const marker = result.framework === fastest.framework ? ' ★' : '';
      const mem =
        typeof result.heapUsedBytes === 'number'
          ? ` | heap ${(result.heapUsedBytes / 1048576).toFixed(2)}MB`
          : '';
      console.log(
        `  ${result.framework.padEnd(22)} median ${result.medianTime.toFixed(4)}ms | avg ${result.avgTime.toFixed(4)}ms | min ${result.minTime.toFixed(4)}ms | max ${result.maxTime.toFixed(4)}ms${mem}${marker}`
      );
    }
    console.log(`  ${fastest.framework} is ${speedup.toFixed(2)}x faster than ${slowest.framework}`);

    // "At what cost": show the retained-heap comparison where measured.
    const withMem = group.filter((r) => typeof r.heapUsedBytes === 'number');
    if (withMem.length > 1) {
      const leanest = withMem.reduce((a, b) => (a.heapUsedBytes < b.heapUsedBytes ? a : b));
      const heaviest = withMem.reduce((a, b) => (a.heapUsedBytes > b.heapUsedBytes ? a : b));
      const ratio = heaviest.heapUsedBytes / Math.max(leanest.heapUsedBytes, 1);
      console.log(
        `  memory: ${leanest.framework} leanest at ${(leanest.heapUsedBytes / 1048576).toFixed(2)}MB (${ratio.toFixed(2)}x less than ${heaviest.framework})`
      );
    }
  }

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
