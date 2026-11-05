---
title: React Code on Exodra
---

# React Code on Exodra

`@exodra/react-compat` implements React's public API on Exodra machines. You alias
`react` and `react-dom` to it, and an existing React application — its components,
its hooks, the libraries it installs from npm — runs with Exodra as the renderer.
There is no virtual DOM: every host tag is an Exodra machine with a schema, and a
re-render writes into the same DOM nodes through that machine.

This is the third direction next to the two packages on the
[React Interop](./react.md) page. Those put an island of one framework inside the
other; this one replaces React underneath code that was written for React.

| What you install                    | What it does                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@exodra/react-compat`              | the runtime: `react`, `react-dom`, `react-dom/client`, `react-dom/server` and the JSX runtime, aliased to it        |
| `@exodra/babel-plugin-schema/react` | optional compiler: host JSX in **your** files becomes a hoisted Exodra schema instead of a `jsx()` call per element |

## Install

```bash
npm install @exodra/react-compat
# peers:
npm install @exodra/core @exodra/dom @exodra/list-reconcile
```

`@exodra/core`, `@exodra/dom` and `@exodra/list-reconcile` are peer dependencies;
nothing is bundled into the package.

The package has these entry points:

| Entry                                  | Stands in for                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `@exodra/react-compat`                 | `react`, and also `react-dom` (it carries `createPortal`, `flushSync`, `findDOMNode`, `unstable_batchedUpdates` and the root functions too) |
| `@exodra/react-compat/client`          | `react-dom/client`                                                                                                                          |
| `@exodra/react-compat/server`          | `react-dom/server`                                                                                                                          |
| `@exodra/react-compat/jsx-runtime`     | `react/jsx-runtime`                                                                                                                         |
| `@exodra/react-compat/jsx-dev-runtime` | `react/jsx-dev-runtime` (the same module as `jsx-runtime`)                                                                                  |

## Aliasing `react` to it

Every import of `react` and `react-dom` in your code **and in your dependencies**
has to land on the compat package, and on one copy of it: the runtime keeps its
render queue in module state, so two instances would be two renderers that do not
see each other's components. Alias to the package name, not to a file inside it,
so code compiled by the plugin below (which imports `@exodra/react-compat`
directly) and code that imports `react` reach the same module.

### Vitest

This is the configuration the repository runs fifteen React libraries under
(`packages/react-compat-libraries/vitest.config.ts`, which points the aliases at
the source files of the workspace packages instead of the package names):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
    resolve: {
        alias: [
            { find: /^react$/, replacement: '@exodra/react-compat' },
            { find: /^react\/jsx-runtime$/, replacement: '@exodra/react-compat/jsx-runtime' },
            { find: /^react\/jsx-dev-runtime$/, replacement: '@exodra/react-compat/jsx-dev-runtime' },
            { find: /^react-dom$/, replacement: '@exodra/react-compat' },
            { find: /^react-dom\/client$/, replacement: '@exodra/react-compat/client' },
            { find: /^react-dom\/server$/, replacement: '@exodra/react-compat/server' },
        ],
    },
    test: {
        environment: 'jsdom',
        server: { deps: { inline: true } },
        deps: {
            optimizer: {
                client: {
                    enabled: true,
                    // the React libraries your tests import, e.g. 'react-redux', 'swr'
                    include: ['react-redux', 'swr'],
                    exclude: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'],
                },
            },
        },
    },
});
```

The optimizer settings are not decoration. Many libraries ship CommonJS that calls
`require('react')`; Node's native `require` does not go through Vite's aliases and
would load real React. Pre-bundling those libraries turns the `require` into an
import the alias can reach. The `react` ids themselves are excluded so that they
stay aliased instead of being bundled.

**styled-components needs two extra steps.** Pre-bundled, its default export
arrives wrapped in the module namespace, so it is left out of `include`, and it is
aliased to its browser ESM build, which imports `react` as ESM:

```js
import { fileURLToPath } from 'node:url';

const styledComponentsAlias = {
    find: /^styled-components$/,
    replacement: fileURLToPath(
        new URL(
            './node_modules/styled-components/dist/styled-components.browser.esm.js',
            import.meta.url
        )
    ),
};
```

Add `styledComponentsAlias` to `resolve.alias` above, and leave `styled-components`
out of `deps.optimizer.client.include`.

### Vite

The same alias list goes under `resolve.alias` in `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: [
            { find: /^react$/, replacement: '@exodra/react-compat' },
            { find: /^react\/jsx-runtime$/, replacement: '@exodra/react-compat/jsx-runtime' },
            { find: /^react\/jsx-dev-runtime$/, replacement: '@exodra/react-compat/jsx-dev-runtime' },
            { find: /^react-dom$/, replacement: '@exodra/react-compat' },
            { find: /^react-dom\/client$/, replacement: '@exodra/react-compat/client' },
            { find: /^react-dom\/server$/, replacement: '@exodra/react-compat/server' },
        ],
    },
});
```

The repository's own Vite app (`packages/benchmarks`) does not use these aliases:
it rewrites the `react` imports of one React source file per row instead, because
the same file runs on several React implementations side by side. So the alias
form above is the Vitest list moved into a Vite config, not a configuration this
repository runs; a plain application has one implementation and wants the aliases.

### webpack

```js
module.exports = {
    resolve: {
        alias: {
            react$: '@exodra/react-compat',
            'react/jsx-runtime$': '@exodra/react-compat/jsx-runtime',
            'react/jsx-dev-runtime$': '@exodra/react-compat/jsx-dev-runtime',
            'react-dom$': '@exodra/react-compat',
            'react-dom/client$': '@exodra/react-compat/client',
            'react-dom/server$': '@exodra/react-compat/server',
        },
    },
};
```

The trailing `$` makes each key an exact match, so `react` does not also capture
`react/jsx-runtime`. Nothing in this repository builds with webpack; the shape is
webpack's standard alias form applied to the same six entries.

### Your code does not change

```tsx
/** @jsxImportSource react */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Counter() {
    const [n, setN] = useState(0);
    return <button onClick={() => setN(n + 1)}>clicked {n}</button>;
}

createRoot(document.getElementById('root')!).render(<Counter />);
```

With the aliases in place this file runs on Exodra as written, through the
automatic JSX runtime. The compiler below is optional.

## The compiler: `@exodra/babel-plugin-schema/react`

Without the compiler, every JSX element is a `jsx()` call at runtime, and each host
tag (`div`, `li`, …) is served by one generic machine per tag name, built on first
use and cached. With the compiler, a tree of host elements in your source becomes
**one schema per tree, hoisted to module scope** and built once per process, with
ports for exactly the parts that can change.

```bash
npm install -D @exodra/babel-plugin-schema @babel/core @babel/plugin-syntax-jsx
```

```js
// babel.config.js
module.exports = {
    plugins: ['@babel/plugin-syntax-jsx', '@exodra/babel-plugin-schema/react'],
};
```

The plugin replaces **every** JSX element and fragment in the files it transforms,
so those files need no other JSX transform. Babel runs plugins before presets, so
in a TypeScript project your TypeScript preset can stay where it is.

It takes two options, both with defaults:

| Option         | Default                  | What it names                                                                                               |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `importSource` | `'@exodra/react-compat'` | where the compiled code imports the host runtime and `jsx` / `Fragment` (from `<importSource>/jsx-runtime`) |
| `schemaSource` | `'@exodra/core'`         | where it imports `createExoSchema`                                                                          |

### What gets compiled

A JSX element is compiled into a schema when its tag is a lowercase HTML or SVG
name (letters and digits only) and every attribute is a plain named attribute.
Nested elements that qualify join the same schema. Inside one:

-   a literal attribute (`className="row"`, `width={10}`) is written into the schema
    once, as a static attribute;
-   an expression attribute (`title={label}`) becomes an attribute port, written
    only when its value changed since the last render;
-   an event handler (`onClick={…}`) becomes an event port whose handler is swapped
    on each render, with no listener re-attached;
-   `style`, `value`, `checked`, `selected`, `defaultValue`, `defaultChecked`,
    `muted`, `indeterminate`, `dangerouslySetInnerHTML` and `ref`, and the handlers
    of a controlled `input` / `textarea` / `select` and every `…Capture` handler, go
    through the same props writer the runtime uses for uncompiled elements;
-   literal text is written into the schema; an expression child becomes a children
    port reconciled at runtime, so components, lists and conditionals inside a
    compiled tree work as usual.

Everything else stays a runtime `jsx()` call: components (`<Badge />`), fragments,
member tags (`<Dialog.Root>`), custom elements (`<my-element>`), and a host element
with a spread (`{...props}`), a namespaced attribute or a `children` attribute. The
children of such an element are still visited, so a compilable tree below a spread
is compiled.

### Code that is already compiled

The plugin also reads code that has no JSX left in it: a call to `jsx`, `jsxs` or
`jsxDEV` from `react/jsx-runtime`, or to `createElement` from `react` (imported,
`require`d, or as `React.createElement`), whose tag is a string literal and whose
props are an object literal, is turned back into the element it describes and
compiled the same way. A `createElement` call that spreads a `const` array declared
in the statement right before it, and used nowhere else, has that array inlined.
A call with a spread in its props, a tag held in a variable, or any other shape is
left as it is.

So the plugin can run after another JSX transform, and over libraries in
`node_modules`. On the benchmark application written with `createElement`
(`initial-render.calls2`, narrowed run, ratios only), compiling those calls took
mounting to 0.780 ms against React's 0.920 — the same as compiling its JSX twin
(0.800). Of the fifteen libraries the release check runs, react-router and
Headless UI render host elements with calls of that shape; the others hand theirs
over with spread props or a tag from a variable and keep the runtime path. The
library suites run once more with every library compiled this way
(`compat-compiled` in `packages/react-compat-libraries/vitest.config.ts`).

### Compiled elements are still elements

A compiled tree evaluates to an element object, not to a node. Its `type` is the
tag name and its `props` are built on first read, so the code that inspects
children keeps working:

```tsx
/** @jsxImportSource react */
import { Children, cloneElement, type ReactElement } from 'react';

type TTabsProps = { children: ReactElement<{ className: string }>[]; active: number };

function Tabs({ children, active }: TTabsProps) {
    return (
        <nav>
            {Children.map(children, (child, i) =>
                cloneElement(child, {
                    className: child.props.className + (i === active ? ' on' : ''),
                })
            )}
        </nav>
    );
}
```

Each `<a className="tab">` passed to `Tabs` is compiled, `child.props.className`
reads `'tab'`, and the clone renders with the merged class.

## How fast it is

**Faster than React, through the compiler.** With `@exodra/babel-plugin-schema/react`
in the build, mounting and updating are faster than React 19. The plugin takes your
JSX and code that is already compiled to `jsx()` or `createElement` calls, so React
libraries from npm go through it as they are (all fifteen in the library suite pass
compiled). Without the compiler, mounting is level with React.

The full field, one recorded run (`initial-render.calls-full-2026-11-01` and
`app-update.calls-full-2026-11-01`, medians):

<!-- gate: axis=initial-render label=calls-full-2026-11-01 col=2 map="compiled JSX:reactCompatJsx;compiled `createElement` calls:reactCompatCalls;host templates, no compiler (default):reactCompatTemplates;React 19:react;React 19 + React Compiler:reactCompiler" -->
<!-- gate: axis=app-update label=calls-full-2026-11-01 col=3 map="compiled JSX:reactCompatJsx;compiled `createElement` calls:reactCompatCalls;host templates, no compiler (default):reactCompatTemplates;React 19:react;React 19 + React Compiler:reactCompiler" -->

| participant                           | mount, ms | 40 update rounds, ms |
| ------------------------------------- | --------- | -------------------- |
| **compiled JSX**                      | **0.820** | **8.4**              |
| **compiled `createElement` calls**    | **0.825** | **8.4**              |
| host templates, no compiler (default) | 0.915     | 9.5                  |
| React 19                              | 0.980     | 11.0                 |
| React 19 + React Compiler             | 1.025     | 10.1                 |

Mounting compiled is 1.19× faster than React in that run. `app-update` carries no
null pair, so its column is an order, not a size: both compiled rows lead React,
React Compiler and Solid.

On the benchmark application — an 80-card board written once as ordinary React and
run unchanged on React 19 and on this package, with byte-identical markup checked
before any timing — the compiled path mounts faster than React in every run that
measured both:

<!-- gate: unrecorded col=2 cmd="node scripts/run-one-axis.js initial-render 60 20 --only=exodra,react,reactCompat,reactCompatJsx,solid (narrowed; compat3/compat4 add reactCompatTemplates)" date=2026-10-31 -->
<!-- gate: unrecorded col=3 cmd="node scripts/run-one-axis.js initial-render 60 20 --only=exodra,react,reactCompat,reactCompatJsx,solid (narrowed; compat3/compat4 add reactCompatTemplates)" date=2026-10-31 -->

| run                      | compiled | React    | ratio        |
| ------------------------ | -------- | -------- | ------------ |
| `initial-render.compat1` | 1.065 ms | 1.225 ms | 1.15× faster |
| `initial-render.compat2` | 0.905 ms | 1.065 ms | 1.18× faster |
| `initial-render.compat3` | 0.850 ms | 0.995 ms | 1.17× faster |
| `initial-render.compat4` | 0.890 ms | 1.140 ms | 1.28× faster |
| `initial-render.compat8` | 0.860 ms | 0.980 ms | 1.14× faster |

On updates it is ahead of React in every run that carried both
(`app-update.compat1`, `compat2`, `compat4`, `compat8`); that axis reports order only. The
runs are narrowed to the React family, Solid and Exodra, so only the ratios inside
a run are comparable. Without the compiler, mounting is level with React and updates are ahead of
it. The full account is the post
[Your React Code, Faster Than React](/blog/react-on-exodra-faster-than-react).

## Host templates, without the compiler

When the compiler is not in the build, the runtime does the same job itself.
It is on by default:

```ts
import { createElement, createRoot } from '@exodra/react-compat';

function Card({ title }: { title: string }) {
    return createElement('article', null, createElement('h2', null, title), createElement('p', null, 'body'));
}

createRoot(document.getElementById('root')!).render(createElement(Card, { title: 'Hello' }));
```

The first time a component returns a tree of host elements, the runtime builds
one schema for that shape and caches it on the component. Every later instance
of the same shape is one machine with a port per prop and per text, instead of a
machine per DOM element. A list (an array of keyed elements of one type) and
anything that is not a host element stays a region the reconciler handles as
before.

Measured on the benchmark application (`initial-render.compat8`, narrowed run,
ratios only): mounting took 1.000 ms with templates and
0.980 in React — level with React, not ahead of it. Across the four runs that
carried both, templates against React read 1.39, 0.87, 1.00 and 1.00. On
`app-update` (`app-update.compat8`) the axis reports no resolution, so only the
order is known: templates ahead of React.

**Changing shape keeps what React keeps.** If a component changes the shape of a
tree it already rendered — a host element appears where there was none, a text
turns into an element — the live instance is handed over to the plain path in
place: its DOM elements stay where they are, nested components keep their state,
an uncontrolled input keeps what was typed, and each handler still fires once.
The compiler does the same for compiled trees, and merges the two branches of a
ternary with one root tag into one schema, so flipping such a branch does not hand
anything over at all (`host-templates.test.ts` and the compiler's `react.test.ts`
assert each of these).

## What is supported

Everything below is exported and implemented; the names are the ones React uses.

**`react`**

| Area         | Names                                                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elements     | `createElement`, `cloneElement`, `isValidElement`, `Children` (`map`, `forEach`, `count`, `toArray`, `only`), `Fragment`, `StrictMode`, `createRef`, `version` |
| Components   | `memo` (with an optional compare function), `forwardRef`, `lazy`, `Suspense`, `Profiler`, `Component`, `PureComponent`                                         |
| Context      | `createContext` with `Provider` and `Consumer`; the context object itself works as a provider (`<Theme value={…}>`)                                            |
| State hooks  | `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useContext`, `useId`, `useSyncExternalStore`, `useImperativeHandle`, `useDebugValue`            |
| Effect hooks | `useEffect`, `useLayoutEffect`, `useInsertionEffect`                                                                                                           |
| Async        | `use` (a promise or a context), `startTransition`, `useTransition`, `useDeferredValue`, `useOptimistic`, `useActionState`                                      |
| Testing      | `act`                                                                                                                                                          |

**`react-dom` / `react-dom/client`**: `createRoot`, `hydrateRoot`, `createPortal`,
`flushSync`, `findDOMNode`, `unstable_batchedUpdates`.

**`react-dom/server`**: `renderToString`, `renderToStaticMarkup`.

**`react/jsx-runtime`**: `jsx`, `jsxs`, `jsxDEV`, `Fragment`.

How the parts behave:

-   **Rendering.** `root.render(…)` renders synchronously and runs layout effects
    before it returns; `useEffect` callbacks run after it, on a later task.
    `setState` calls made together are batched into one render on a microtask.
    `flushSync` applies its updates, and their effects, before it returns. Keyed
    children are moved, not rebuilt, and a re-render keeps the same DOM nodes.
-   **Effects.** Insertion effects run before refs are attached, refs before layout
    effects, and a child's effects before its parent's. Cleanups run when deps
    change and on unmount.
-   **Class components.** `setState` (object or updater, with a callback),
    `forceUpdate`, `getDerivedStateFromProps`, `shouldComponentUpdate`,
    `PureComponent`'s shallow comparison, `getSnapshotBeforeUpdate`,
    `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` and
    `static contextType`.
-   **Error boundaries.** A class with `static getDerivedStateFromError` or
    `componentDidCatch` catches an error thrown while it renders its children and
    renders its fallback state.
-   **Suspense.** A component may throw a promise, or call `use(promise)`; the
    nearest `<Suspense>` shows its `fallback` and renders the content once the
    promise settles. `lazy` works through the same path. Content that was already
    shown and suspends again is hidden (`display: none`), not unmounted, so its state
    survives. A suspension with no `<Suspense>` above it is an error.
-   **Transitions.** An update inside `startTransition` is applied on a later task
    than a plain update. `useTransition` reports pending until it lands;
    `useDeferredValue` shows the previous value first, then the new one.
-   **Events.** Handlers receive an event object that is the native event plus
    `nativeEvent`, `currentTarget`, `persist`, `isPersistent`, `isDefaultPrevented`
    and `isPropagationStopped`. `onDoubleClick` listens to `dblclick`, `onFocus` /
    `onBlur` to `focusin` / `focusout`, and `onChange` on `input` and `textarea` to
    `input`. `…Capture` handlers listen in the capture phase.
-   **Forms.** A controlled `input` / `textarea` is put back to its `value` /
    `checked` after a handler that did not accept the edit; a controlled `select`
    takes its `value` after its options are placed.
-   **Server.** `renderToString` runs function components with their hooks, class
    components, context, `memo` and `forwardRef`; it escapes text and attributes,
    drops event handlers, prints `style` objects as CSS text, and writes
    `defaultValue` / `defaultChecked` as `value` / `checked`.

### Libraries run on it

`packages/react-compat-libraries` runs one test per library twice — once on
`@exodra/react-compat` and once on React itself — with the same assertions:

| Library                            | What its test exercises                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `react-router`                     | the matching route renders, a `Link` click navigates, `useNavigate` goes back         |
| `@tanstack/react-query`            | a query resolves into the DOM and a refetch replaces it                               |
| `swr`                              | a key resolves into the DOM and `mutate()` revalidates it                             |
| `zustand`                          | a selecting consumer re-renders on a store update and an unrelated one does not       |
| `jotai`                            | an atom write reaches a reader and a derived atom                                     |
| `react-redux` + `@reduxjs/toolkit` | a `useSelector` consumer re-renders after a dispatch from inside and outside the tree |
| `react-hook-form`                  | a validation error shows, then the typed values submit                                |
| `formik`                           | a controlled `Field` stays in state and the typed value submits                       |
| `@radix-ui/react-dialog`           | the trigger opens the dialog into a portal, Escape closes it                          |
| `@headlessui/react`                | a `Disclosure` panel and its `aria-expanded` toggle through the button                |
| `@emotion/react`                   | a `css` prop becomes a class backed by an inserted `<style>`, and changes with it     |
| `styled-components`                | a styled element's class maps to an inserted rule and restyles on a prop change       |
| `framer-motion`                    | a `motion.div` mounts with its initial style and animates to a new target             |
| `react-window`                     | only the rows in view render, and the window shifts on scroll                         |
| `react-i18next`                    | `t()` renders a key and re-renders on a language change                               |

## What differs, and what is not there

These come from the implementation, not from a list of intentions. If your code
depends on one of them, it will behave differently on compat than on React.

**Hydration.** `hydrateRoot(container, element)` is a client render: it empties
the container and builds the tree from scratch. Server markup is replaced, not
adopted, and nothing compares it with the client output.

**Server output.** `renderToString` does not insert the `<!-- -->` separators
React puts between adjacent text children: `text, ' ', value` prints as
`a b`, not `a<!-- --> <!-- -->b`. `renderToStaticMarkup` is the same function.
There are no streaming renderers (`renderToPipeableStream`,
`renderToReadableStream`). On the server, a component that suspends throws out of
`renderToString` — no fallback is printed — and class components are not handed
their `contextType` context. A `value` on a `<select>` is printed as an attribute
of the `select`; no `<option>` is marked `selected`.

**Events.** Each handler is a native listener on its own element, not a listener
at the root. Two consequences:

-   Events follow the **DOM** tree. A click inside a portal bubbles to the portal's
    container and its DOM ancestors, not to the React parent that rendered the
    portal, so an `onClick` on that parent does not see it.
-   React handlers interleave with `addEventListener` listeners in plain DOM order,
    and `stopPropagation()` stops the native event.

**Errors.** An error boundary catches what is thrown while the boundary itself
renders its subtree. A descendant that re-renders on its own state update is
rendered outside that pass, so an error it throws is not caught by the boundary
above it; it is thrown out of the flush (`act`, `flushSync`, or the microtask that
applied the update). An uncaught error does not unmount the root — the rest of the
tree stays mounted and keeps updating. `componentDidCatch` receives an empty
`componentStack`. Errors in effects and event handlers are not caught by
boundaries.

**Concurrency.** Rendering is synchronous and never interrupted. A transition
defers its update to a later task; it does not render in the background, and an
urgent update does not abandon a transition's render half-way.

**APIs that are accepted but do nothing.** `StrictMode` is a `Fragment`: nothing
is rendered or run twice. `Profiler` renders its children and never calls
`onRender`. `useDebugValue` is a no-op. `unstable_batchedUpdates` calls its
function; batching happens anyway.

**Narrower signatures.** `createRoot`, `hydrateRoot` and `renderToString` take
one option, `identifierPrefix`, and no other. `useSyncExternalStore` takes no
`getServerSnapshot`.

**`useId`** counts through `nextExoId` from `@exodra/context`: every root and
every `renderToString` call starts its own count at `0`, so the server and
hydration hand out the same ids. The format is `:r-0`, `:r-1`, … — not React's
`:r0:` — and two roots on one page need different `identifierPrefix` values.

**Refs.** A function component does not receive `ref` among its props; use
`forwardRef`. A callback ref is called with `null` on removal; a cleanup function
it returns is not called. A compiled host element reports `element.ref` as
`null`, because its ref travels with its values; `cloneElement` reads the ref it
was written with and keeps it.

**Class lifecycles that are not called.** `componentWillMount`,
`componentWillReceiveProps`, `componentWillUpdate` and their `UNSAFE_` forms.

**`defaultProps`** is applied to every component type, function components
included.

**Not exported.** `useFormStatus`, `useEffectEvent`, `cache`, `Activity`,
`preload` / `preinit` and the legacy `render` / `hydrate` /
`unmountComponentAtNode`. A function passed as a form's `action` is not supported.

**Library code is not compiled.** The compiler only transforms files that go
through your Babel config. Libraries in `node_modules` arrive already built, so
their elements are `createElement` / `jsx()` calls served by the per-tag runtime
machines. They render correctly, without the per-tree schema the compiler gives
your own components.
