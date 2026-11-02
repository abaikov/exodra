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

One machine — a `createExoMachine(schema, options?)` base, alone or composed with
`composeExoMachine(base, …decorators)` — becomes one
function component, exported under a PascalCase name and under the machine's
original constant name:

```tsx no-check
export function Counter({ params }: { params?: unknown }) { … }
export const COUNTER = Counter;
```

| Exodra | React |
| --- | --- |
| every attribute, text, children and html port | a `useState` pair |
| a ref port | a `useRef` |
| the machine state | a `useRef` |
| each entry of `withExoTransitions(m, { name: fn })`, called through `machine.transitions` | an inner function of the component |
| `on(port, fn)` inside `withExoHandlers` | the handler prop on the element that declared the event port |
| the `createInitialState` option | a `useLayoutEffect` that runs once, handed `params` |
| `withExoWire(m, fn)` | a `useLayoutEffect` that re-runs when `params` changes |
| `effect(fn)` inside `withExoEffects` | a `useEffect` that runs once |
| `c.onTeardown(off)` | collected and called on unmount |

Inside those functions:

| Exodra call | React form |
| --- | --- |
| `c.text`, `c.attr`, `c.unsafeHtml` | the port's state setter |
| `c.on(port, handler)` | stores the handler in state |
| `c.state`, `c.readState()` | the state ref's `current` |
| `c.childList(port)` | `createExoChildren(setter)` |
| `c.build(MACHINE, params)` | `buildExoChild(Component, params)` |
| `c.one(port, MACHINE, params)` | the port's state setter with one built child |
| `c.list(port, MACHINE, rows)` | the port's state setter with `rows.map((rowParams) => buildExoChild(Component, rowParams).element)` |
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
- any `createExoMachine` option other than `createInitialState`, and any
  `composeExoMachine` step other than one call of `withExoTransitions`,
  `withExoWire`, `withExoHandlers` or `withExoEffects`;
- any use of a machine other than destructuring `machine.transitions` —
  `machine.overrides(…)` among them — an exported transition, and an effect handle
  kept in a variable;
- any connector call outside the tables above;
- an exonode passed around as a value, other than to the calls above;
- a machine whose schema is not declared in the same file.

## How it is checked

The package's tests compile one source both ways — the original through
`@exodra/babel-plugin-schema` onto the DOM backend, the translation through
React — and compare `innerHTML` after every click: a counter, and a list that
adds, reverses and re-wires a row through `wireExoNode`. A row that survives a
reorder is the same DOM element on both sides.
