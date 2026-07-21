---
title: Profiler
---

# Profiler

[`@exodra/profiler`](https://www.npmjs.com/package/@exodra/profiler) is
performance profiling for Exodra applications, similar to the React Profiler. It
works by externally patching classes (the `ExoNode` class, or any class you pass
it) to time their methods — there is no built-in profiling in the core, it is
added at runtime when you import this package.

## Installation

```bash
npm install --save-dev @exodra/profiler
```

## What it provides

- **`Profiler` component** — wrap part of your tree to measure it.
- **`profileExoNode` / `ExodraProfiler`** — patch the `ExoNode` class to collect metrics.
- **`profileClass` / `ClassProfiler`** — profile any class's methods.
- **Chrome DevTools integration** — a global devtools hook is installed in development.

## Basic usage

`startProfiling()` / `stopProfiling()` drive the shared `profiler` instance. Wrap
specific subtrees with `withProfiler` or the `Profiler` component.

```tsx
import { Profiler, withProfiler, startProfiling, stopProfiling } from '@exodra/profiler';

// Begin recording on the shared profiler instance
startProfiling();

function App() {
  return withProfiler('App', (
    <div static={{ class: 'app' }}>
      <Profiler
        static={{
          id: 'MainContent',
          onRender: (id, phase, duration) => {
            console.log(`${id} (${phase}) took ${duration}ms`);
          },
          children: <ExpensiveComponent />,
        }}
      />
    </div>
  ));
}

// Stop and read the report (may be null if nothing was recorded)
const report = stopProfiling();
if (report) {
  console.table(report.components);
}
```

### `withProfiler(id, component, onRender?)`

Wraps a schema (or list of schemas) in the `Profiler` component. If `onRender` is
omitted, timings are logged to the console.

```tsx
import { withProfiler } from '@exodra/profiler';

const profiled = withProfiler('Header', <Header />, (id, phase, duration) => {
  console.log(`${id}: ${phase} ${duration.toFixed(2)}ms`);
});
```

### `Profiler` component

`Profiler` reads `id`, `onRender`, and `children` from its `static` bucket. The
`onRender` callback receives `(id, phase, duration)`, where `phase` is `'render'`
or `'unmount'`. With no `onRender`, the children pass through unprofiled.

```tsx
<Profiler
  static={{
    id: 'TodoList',
    onRender: (id, phase, duration) => console.log(id, phase, duration),
    children: <TodoList />,
  }}
/>
```

## Profiling the ExoNode class

To time `ExoNode` lifecycle methods (`init`, `dispose`, `setChildren`) across the
whole app, patch the `ExoNode` class. Once patched, profiling cannot be removed
without restarting the app.

```typescript
import { profileExoNode, ExodraProfiler } from '@exodra/profiler';
import { ExoNode } from '@exodra/core';

// Low-level: receive raw metrics for each lifecycle call
profileExoNode(ExoNode, (metrics) => {
  console.log(metrics.componentId, metrics.phase, metrics.duration);
});

// Or use ExodraProfiler to aggregate into a report
const appProfiler = new ExodraProfiler(ExoNode);
appProfiler.start();
// ...interact with the app...
const report = appProfiler.stop(); // also console.table()s the report
```

`startProfiling(callback)` can also patch `ExoNode` directly when given a callback:

```typescript
import { startProfiling } from '@exodra/profiler';

startProfiling((metrics) => {
  console.log(metrics.phase, metrics.duration);
});
```

## Profiling any class

`profileClass` patches the prototype methods of any class. `ClassProfiler` does
the same for multiple classes and aggregates the results.

```typescript
import { profileClass, ClassProfiler } from '@exodra/profiler';

profileClass(MyService, (metrics) => {
  console.log(`${metrics.className}.${metrics.method}: ${metrics.duration}ms`);
}, {
  methods: ['load', 'save'],    // optional allow-list
  excludeMethods: ['toString'], // optional deny-list
  includePrivate: false,        // skip `_`-prefixed methods (default)
});

const batch = new ClassProfiler();
batch.profileClasses([ServiceA, ServiceB]);
batch.start();
// ...
const summary = batch.stop();   // ProfileMetrics[]
console.log(batch.getReport()); // { 'ClassA.method': { count, totalTime, avgTime } }
```

## Chrome DevTools integration

In development (`NODE_ENV !== 'production'`), importing this package installs a
`window.__EXODRA_DEVTOOLS_HOOK__` hook exposing `start` / `stop` / `getReport`.
Use the Performance tab to record while interacting with your app.

## Report format

```typescript
interface ProfileReport {
  totalDuration: number;   // Total profiling time (ms)
  componentCount: number;  // Unique components
  totalRenders: number;    // Total recorded lifecycle calls
  components: Array<{
    id: string;            // Component identifier
    renders: number;       // Recorded calls
    totalTime: number;     // Total time spent
    averageTime: number;   // Average time
    percentOfTotal: number;// % of total time
    averageDepth: number;  // Average tree depth
    averageChildren: number;// Average child count
  }>;
}
```

> There is **no** `ProfilerNode` class. Profiling is applied by patching an
> existing class with `profileExoNode` / `profileClass`, not by subclassing.
> `getProfilingReport()` currently returns `null` (snapshot-without-stop is not
> implemented). The `enableProfiling` / `disableProfiling` / `isProfiling` /
> `createProfilingMiddleware` middleware helpers are deprecated.

## Links

- npm: [`@exodra/profiler`](https://www.npmjs.com/package/@exodra/profiler)
- GitHub: [`packages/profiler`](https://github.com/abaikov/exodra/tree/master/packages/profiler)
