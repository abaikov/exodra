import type { BenchmarkResult, ReactiveBenchmarkFramework } from './types';
import {
    ACTIVE_DOM_FRAMEWORKS,
    ACTIVE_REACTIVE_FRAMEWORKS,
    scoreTime,
} from './benchmark-utils';
import { benchmarkConditionalRender } from './benchmarks/conditional-render';
import { benchmarkListOperations } from './benchmarks/list-operations';
import { benchmarkSignalOperations } from './benchmarks/signal-operations';
import { benchmarkEffectPerformance } from './benchmarks/effect-performance';
import { benchmarkAdvancedListOperations } from './benchmarks/advanced-list-operations';
import { benchmarkNestedComponents } from './benchmarks/nested-components';
import { benchmarkMultipleSignals } from './benchmarks/multiple-signals';
import { benchmarkInitialRender } from './benchmarks/initial-render';
import { benchmarkRuntimeBuildStrategy } from './benchmarks/runtime-build-strategy';

const statusEl = document.getElementById('status')!;
const resultsBody = document.getElementById('results')!;
const runAllBtn = document.getElementById('runAll') as HTMLButtonElement;
const runInitialBtn = document.getElementById(
    'runInitialRender'
) as HTMLButtonElement;

const allResults: BenchmarkResult[] = [];

function setStatus(text: string) {
    statusEl.textContent = text;
}

function renderResults() {
    resultsBody.innerHTML = '';

    const byBenchmark = new Map<string, BenchmarkResult[]>();
    for (const result of allResults) {
        const group = byBenchmark.get(result.name) ?? [];
        group.push(result);
        byBenchmark.set(result.name, group);
    }

    for (const [name, group] of byBenchmark) {
        const fastest = group.reduce((a, b) =>
            scoreTime(a) < scoreTime(b) ? a : b
        );
        for (const result of group) {
            const row = document.createElement('tr');
            const isFastest = result.framework === fastest.framework;
            row.innerHTML = `
                <td>${name}</td>
                <td class="${isFastest ? 'fastest' : ''}">${result.framework}${isFastest ? ' ★' : ''}</td>
                <td>${result.medianTime.toFixed(3)}</td>
                <td>${result.avgTime.toFixed(3)}</td>
                <td>${result.minTime.toFixed(3)}</td>
                <td>${result.maxTime.toFixed(3)}</td>
                <td>${result.operations}</td>
            `;
            resultsBody.appendChild(row);
        }
    }
}

async function runBenchmark(
    label: string,
    fn: () => Promise<BenchmarkResult>
) {
    setStatus(`Running ${label}...`);
    try {
        const result = await fn();
        allResults.push(result);
        renderResults();
        console.log(
            `✅ ${label}: median ${result.medianTime.toFixed(3)}ms, avg ${result.avgTime.toFixed(3)}ms`
        );
        return result;
    } catch (error) {
        console.error(`❌ ${label} failed:`, error);
        setStatus(`${label} failed: ${(error as Error).message}`);
        throw error;
    }
}

async function runReactiveBenchmarks(
    name: string,
    runner: (
        framework: ReactiveBenchmarkFramework,
        iterations: number
    ) => Promise<BenchmarkResult>,
    iterations: number,
    frameworks: readonly ReactiveBenchmarkFramework[] = ACTIVE_REACTIVE_FRAMEWORKS
) {
    for (const framework of frameworks) {
        await runBenchmark(`${name} (${framework})`, () =>
            runner(framework, iterations)
        );
    }
}

async function runAllBenchmarks() {
    runAllBtn.disabled = true;
    runInitialBtn.disabled = true;
    allResults.length = 0;
    renderResults();

    try {
        await runReactiveBenchmarks(
            'Conditional Component Render',
            benchmarkConditionalRender,
            1000
        );
        await runReactiveBenchmarks(
            'List Operations',
            benchmarkListOperations,
            1000
        );
        await runReactiveBenchmarks(
            'Signal Operations',
            benchmarkSignalOperations,
            10000,
            ['exodra', 'solid']
        );
        await runReactiveBenchmarks(
            'Effect Performance',
            benchmarkEffectPerformance,
            1000,
            ['exodra', 'solid']
        );
        await runReactiveBenchmarks(
            'Advanced List Operations',
            benchmarkAdvancedListOperations,
            500,
            ['exodra', 'solid']
        );
        await runReactiveBenchmarks(
            'Nested Components',
            benchmarkNestedComponents,
            500,
            ['exodra', 'solid']
        );
        await runReactiveBenchmarks(
            'Multiple Signals',
            benchmarkMultipleSignals,
            500,
            ['exodra', 'solid']
        );

        for (const framework of ACTIVE_DOM_FRAMEWORKS) {
            await runBenchmark(`Initial Render (${framework})`, () =>
                benchmarkInitialRender(framework, 20)
            );
        }

        for (const shape of ['wide', 'balanced', 'deep'] as const) {
            await runBenchmark(`Runtime Build Strategy runtime (${shape})`, () =>
                benchmarkRuntimeBuildStrategy('runtime', shape, 50)
            );
            await runBenchmark(`Runtime Build Strategy raw iterative (${shape})`, () =>
                benchmarkRuntimeBuildStrategy('raw-iterative', shape, 50)
            );
        }

        setStatus(`Done — ${allResults.length} results`);
    } finally {
        runAllBtn.disabled = false;
        runInitialBtn.disabled = false;
    }
}

async function runInitialRenderOnly() {
    runAllBtn.disabled = true;
    runInitialBtn.disabled = true;

    try {
        for (const framework of ACTIVE_DOM_FRAMEWORKS) {
            await runBenchmark(`Initial Render (${framework})`, () =>
                benchmarkInitialRender(framework, 50)
            );
        }
        for (const shape of ['wide', 'balanced', 'deep'] as const) {
            await runBenchmark(`Runtime Build Strategy runtime (${shape})`, () =>
                benchmarkRuntimeBuildStrategy('runtime', shape, 100)
            );
            await runBenchmark(`Runtime Build Strategy raw iterative (${shape})`, () =>
                benchmarkRuntimeBuildStrategy('raw-iterative', shape, 100)
            );
        }
        setStatus('Initial render benchmarks complete');
    } finally {
        runAllBtn.disabled = false;
        runInitialBtn.disabled = false;
    }
}

runAllBtn.addEventListener('click', () => {
    void runAllBenchmarks();
});

runInitialBtn.addEventListener('click', () => {
    void runInitialRenderOnly();
});

setStatus('Ready');
