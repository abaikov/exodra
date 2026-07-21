#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const args = process.argv.slice(2);
const headless = args.includes('--headless') || !args.includes('--show');
const port = 3001;
const url = `http://localhost:${port}`;

let viteProcess = null;

async function startViteServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Vite dev server...');
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: rootDir,
      shell: true,
      stdio: 'pipe',
    });

    let serverReady = false;

    viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Vite server ready');
          setTimeout(resolve, 1000); // Give it a moment to fully start
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

async function stopViteServer() {
  if (viteProcess) {
    console.log('\n🛑 Stopping Vite server...');
    viteProcess.kill();
    viteProcess = null;
  }
}

async function runBenchmarks() {
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`📄 Loading ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for page to be ready
  await page.waitForSelector('#runAll', { timeout: 10000 });

  console.log('\n📊 Running benchmarks...\n');

  // Inject benchmark runner
  const results = await page.evaluate(async () => {
    // Import benchmark functions
    const { benchmarkConditionalRender } = await import(
      './src/benchmarks/conditional-render.ts'
    );
    const { benchmarkListOperations } = await import(
      './src/benchmarks/list-operations.ts'
    );

    const allResults = [];

    // Run conditional render benchmark
    console.log('Running Conditional Component Render...');
    const conditionalExodra = await benchmarkConditionalRender('exodra', 1000);
    allResults.push(conditionalExodra);
    console.log(`Exodra: ${conditionalExodra.avgTime.toFixed(3)}ms`);

    const conditionalSolid = await benchmarkConditionalRender('solid', 1000);
    allResults.push(conditionalSolid);
    console.log(`SolidJS: ${conditionalSolid.avgTime.toFixed(3)}ms`);

    // Run list operations benchmark
    console.log('\nRunning List Operations...');
    const listExodra = await benchmarkListOperations('exodra', 1000);
    allResults.push(listExodra);
    console.log(`Exodra: ${listExodra.avgTime.toFixed(3)}ms`);

    const listSolid = await benchmarkListOperations('solid', 1000);
    allResults.push(listSolid);
    console.log(`SolidJS: ${listSolid.avgTime.toFixed(3)}ms`);

    return allResults;
  });

  await browser.close();

  // Print results
  console.log('\n\n📈 Benchmark Results');
  console.log('═'.repeat(60));

  // Group results by benchmark
  const conditional = {
    exodra: results.find((r) => r.name === 'Conditional Component Render' && r.framework === 'exodra'),
    solid: results.find((r) => r.name === 'Conditional Component Render' && r.framework === 'solid'),
  };

  const list = {
    exodra: results.find((r) => r.name === 'List Operations' && r.framework === 'exodra'),
    solid: results.find((r) => r.name === 'List Operations' && r.framework === 'solid'),
  };

  if (conditional.exodra && conditional.solid) {
    const ratio = conditional.exodra.avgTime / conditional.solid.avgTime;
    const winner = ratio < 1 ? 'Exodra' : 'SolidJS';
    const speedup = ratio < 1 ? 1 / ratio : ratio;

    console.log('\n🔹 Conditional Component Render');
    console.log('─'.repeat(60));
    console.log(`  Exodra:  ${conditional.exodra.avgTime.toFixed(3)}ms (min: ${conditional.exodra.minTime.toFixed(3)}ms, max: ${conditional.exodra.maxTime.toFixed(3)}ms)`);
    console.log(`  SolidJS: ${conditional.solid.avgTime.toFixed(3)}ms (min: ${conditional.solid.minTime.toFixed(3)}ms, max: ${conditional.solid.maxTime.toFixed(3)}ms)`);
    console.log(`  ${winner} is ${speedup.toFixed(2)}x faster`);
  }

  if (list.exodra && list.solid) {
    const ratio = list.exodra.avgTime / list.solid.avgTime;
    const winner = ratio < 1 ? 'Exodra' : 'SolidJS';
    const speedup = ratio < 1 ? 1 / ratio : ratio;

    console.log('\n🔹 List Operations');
    console.log('─'.repeat(60));
    console.log(`  Exodra:  ${list.exodra.avgTime.toFixed(3)}ms (min: ${list.exodra.minTime.toFixed(3)}ms, max: ${list.exodra.maxTime.toFixed(3)}ms)`);
    console.log(`  SolidJS: ${list.solid.avgTime.toFixed(3)}ms (min: ${list.solid.minTime.toFixed(3)}ms, max: ${list.solid.maxTime.toFixed(3)}ms)`);
    console.log(`  ${winner} is ${speedup.toFixed(2)}x faster`);
  }

  console.log('\n✅ Benchmarks completed!\n');
}

async function main() {
  try {
    await startViteServer();
    await runBenchmarks();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await stopViteServer();
    process.exit(0);
  }
}

main();







