---
title: Translating to React
---

# Translating Exodra Code to React

`@exodra/to-react` reads Exodra source — `exoJsx` schemas and the machines built
on them — and writes plain React components that render the same DOM. Code
written on Exodra keeps running without it.

```bash
npm install --save-dev @exodra/to-react
```

```ts
import { translateExoToReact } from '@exodra/to-react';

declare const source: string;

const translation = translateExoToReact(source, 'Counter.tsx');
translation.code;        // the React module
translation.runtime;     // helper module source, or null when nothing needs it
translation.unsupported; // what could not be translated, one line each
```

`translateExoToReact(source, fileName?, runtimePath?)` returns:

| Field | Meaning |
| --- | --- |
| `code` | the translated module. It imports from `react` and, when needed, from `runtimePath` (default `./exo-react-runtime`) |
| `runtime` | the source of that helper module — write it next to the translated file. `null` when the translation uses none of it |
| `unsupported` | every construct that has no React form, named with where it was found. An empty list is the only case where the output is complete |

The helpers are plain React and depend on nothing from Exodra: `buildExoChild`,
`wireExoChild`, `createExoChildren`, `reconcileExoOrder` and `exoStyleObject`.

## What a machine becomes

One machine — `createExoMachineBuilder(SCHEMA)` through `m.done()` — becomes one
function component, exported under a PascalCase name and under the machine's
original constant name:

```tsx no-check
export function Counter({ index = 0, params }: { index?: number; params?: unknown }) { … }
export const COUNTER = Counter;
```

| Exodra | React |
| --- | --- |
| every attribute, text, children and html port | a `useState` pair |
| a ref port | a `useRef` |
| the machine state | a `useRef` |
| `m.transition(fn)` | an inner function of the component |
| `m.on(port, fn)` | the handler prop on the element that declared the event port |
| `m.createInitialState(fn)` | a `useLayoutEffect` that runs once |
| `m.wire(fn)` | a `useLayoutEffect` that re-runs when `params` changes |
| `m.effect(fn)` | a `useEffect` that runs once |
| `c.onTeardown(off)` | collected and called on unmount |

Inside those functions:

| Exodra call | React form |
| --- | --- |
| `c.text`, `c.attr`, `c.unsafeHtml` | the port's state setter |
| `c.on(port, handler)` | stores the handler in state |
| `c.state`, `c.readState()` | the state ref's `current` |
| `c.childList(port)` | `createExoChildren(setter)` |
| `c.build(MACHINE, index, params)` | `buildExoChild(Component, index, params)` |
| `c.one`, `c.list` | the port's state setter with built children |
| `wireExoNode(node, MACHINE, params)` | `wireExoChild(child, Component, params)` — the row re-renders with the new `params` |
| `reconcileExoOrder(…)` from `@exodra/list-reconcile` | the helper of the same name and signature; a row that survives keeps its React key, so React keeps its DOM element |

In the schema, `class` becomes `className`, `on:event` and `onEvent` become
the React handler prop (`dblclick` → `onDoubleClick`, `focusout` → `onBlur`), a
static `value`/`checked` becomes `defaultValue`/`defaultChecked`, a static
`style` string becomes a style object, and `unsafeHtml` becomes
`dangerouslySetInnerHTML`.

## What it does not translate

Everything below lands in `unsupported` instead of in wrong code:

- a schema written with `createExoSchema` (the cursor form); only `exoJsx` is read;
- an `exoJsx` body that is not one returned element;
- any machine step other than `createInitialState`, `wire`, `effect`, `on`,
  `transition` and `done` — `transitionOverrides` among them;
- any connector call outside the tables above;
- an exonode passed around as a value, other than to the calls above;
- a machine whose schema is not declared in the same file.

## How it is checked

The package's tests compile one source both ways — the original through
`@exodra/babel-plugin-schema` onto the DOM backend, the translation through
React — and compare `innerHTML` after every click: a counter, and a list that
adds, reverses and re-wires a row through `wireExoNode`. A row that survives a
reorder is the same DOM element on both sides.
