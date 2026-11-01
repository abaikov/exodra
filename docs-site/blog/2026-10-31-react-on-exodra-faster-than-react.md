---
slug: react-on-exodra-faster-than-react
title: Your React Code, Faster Than React
authors: [andrei]
tags: [performance, benchmarks, architecture]
---

# Your React Code, Faster Than React

`@exodra/react-compat` implements React's public API on Exodra machines. Alias
`react` and `react-dom` to it, and a React application — its components, its
hooks, the libraries it installs — runs with Exodra as the renderer. Add one Babel
plugin, and the same source mounts faster than it does on React itself.

That is a claim about a specific application measured in a specific way, so here
is the application, the way, and every number.

<!-- truncate -->

## What was measured

The benchmark application is an 80-card board in ten decks: each card has a
heading, an author, a details block that opens and closes, a list of tags that
grows and shrinks, and two buttons. It is written once, as ordinary React, in
`packages/benchmarks/src/benchmarks/apps/react/react.tsx`, with `useState` and
keyed lists — no `memo`, no `useMemo`, nothing tuned for any renderer.

That one file runs on React 19 and on `@exodra/react-compat`. Its JSX twin,
`react-jsx.jsx`, is the same components compiled by
`@exodra/babel-plugin-schema/react`. Before a single timing is taken, every
participant's markup is diffed against the reference at mount and after two
update rounds; a renderer that produces different HTML is refused, not compared.
All three React-family rows pass it: same 861 elements, byte for byte.

## The numbers

Mounting the whole board, milliseconds per mount, lower is better, from one run
(`initial-render.compat8`):

| participant | ms / mount | against React |
|---|---|---|
| **react-compat + compiler** | **0.860** | **1.14× faster** |
| react-compat + host templates (default) | 1.000 | level (1.02× slower) |
| React 19 | 0.980 | — |
| react-compat, templates off | 1.280 | 1.31× slower |

An earlier version of this post put host templates at 1.15× faster than React,
from `initial-render.compat4` alone; React read 1.140 in that run and 0.98–1.0 in
every other one, and across the four runs that carried both, templates against
React read 1.39, 0.87, 1.00 and 1.00. Without the compiler, mounting is level with
React.

A later run took the whole field, every participant on the axis
(`initial-render.calls-full-2026-11-01`): compiled 0.820, React 0.980, so 1.19×
faster; host templates 0.915, level. The same run added a row for code that is
already compiled to `createElement` calls and then passed through the plugin, the
way a React library from npm arrives: 0.825, the same as compiled JSX.

And the compiled path against React across every run that measured both:

| run | compiled | React | ratio |
|---|---|---|---|
| `initial-render.compat1` | 1.065 | 1.225 | 1.15× faster |
| `initial-render.compat2` | 0.905 | 1.065 | 1.18× faster |
| `initial-render.compat3` | 0.850 | 0.995 | 1.17× faster |
| `initial-render.compat4` | 0.890 | 1.140 | 1.28× faster |

Updates — every card renaming its deck, toggling its details and advancing its tags — put
the compiled path ahead of React in every run that carried both
(`app-update.compat1`, `compat2`, `compat4`, `compat8`), and host templates ahead
of React in both runs that carried them (`compat4`, `compat8`).

## How to read them

**Only the ratios inside one run mean anything.** These are narrowed runs: the
field was cut to the React family, Solid and Exodra itself, so the absolute
milliseconds cannot be set beside a full run of the same axis. Comparing rows
within one table is what they are for.

**On updates, only the order is known.** The update axis carries no null pair, so
it reports that it cannot say how small a difference it can see. That is why the
update result above is stated as an order and not as a factor.

**The plain runtime is behind React today.** Without the compiler or host
templates, every host element is its own machine, and that costs more than React's
fiber on this board. The two faster paths exist precisely to remove that cost.

## Why it is faster

React keeps a tree of fibers and diffs each render's elements against it. Exodra
keeps no virtual tree. With the compiler, a tree of host elements in your source —
a card's `div` with its heading, spans and buttons — becomes **one schema built
once per process**, with a port for each value that can change. Mounting a card
is a clone of that schema's prototype plus one write per port; re-rendering it
compares each value with the one it last wrote and touches the DOM only where they
differ. Components, hooks, keys and effects keep React's semantics; what changes is
what sits underneath them.

**Host templates** do the same job at runtime, for code that cannot go through the
compiler: the first time a component returns a tree of host elements, the runtime
builds one schema for that shape and caches it on the component. They are on by
default. A component that changes the shape of a tree it already rendered has
its live instance handed to the plain path in place, keeping its DOM elements and
the state of every nested component, as React would
([guide](/docs/guides/react-compat#host-templates-without-the-compiler)).

## Libraries

Fifteen libraries run against `@exodra/react-compat` in the release check:
Formik, react-hook-form, TanStack Query, SWR, Redux, Zustand, Jotai, React Router,
react-i18next, react-window, Radix Dialog, Headless UI, Framer Motion, Emotion and
styled-components. Their suites live in `packages/react-compat-libraries/tests/`.

## Trying it

```bash
npm install @exodra/react-compat @exodra/core @exodra/dom @exodra/list-reconcile
npm install -D @exodra/babel-plugin-schema @babel/core @babel/plugin-syntax-jsx
```

Alias `react`, `react-dom` and their subpaths to `@exodra/react-compat` (the
[guide](/docs/guides/react-compat#aliasing-react-to-it) has the lists for Vite,
webpack and Vitest), and add the plugin:

```js
// babel.config.js
module.exports = {
    plugins: ['@babel/plugin-syntax-jsx', '@exodra/babel-plugin-schema/react'],
};
```

Without a build step the runtime templates do that job; they are on by default. What is supported, what differs from
React, and what is not there yet is on the
[React Code on Exodra](/docs/guides/react-compat) page.
