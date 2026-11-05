---
title: Translating to React
---

# Translating Exodra Code to React

`@exodra/to-react` reads Exodra source — `exoJsx` schemas and the machines built
on them — and writes React modules that render the same DOM. Code written on
Exodra keeps running without it.

```bash
npm install --save-dev @exodra/to-react
```

```ts
import { translateExoToReact } from '@exodra/to-react';

declare const source: string;

const translation = translateExoToReact(source, 'Counter.tsx', 'exo-react-runtime');
translation.code;        // the React module
translation.runtime;     // the runtime module source, or null when the file needs none of it
translation.unsupported; // what could not be translated, one line each
```

`translateExoToReact(source, fileName?, runtimePath?)` returns:

| Field         | Meaning                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `code`        | the translated module. Every `@exodra/*` import now points at `runtimePath` (default `./exo-react-runtime`)                        |
| `runtime`     | the source of that runtime module — write it once where `runtimePath` resolves. `null` when the file imports nothing from it       |
| `unsupported` | every construct that has no React form, named with where it was found. An empty list is the only case where the output is complete |

Translating a whole app, give every file the same `runtimePath` and resolve it
with a bundler alias, so nested files reach one runtime module.

## What changes and what does not

Only two things are rewritten:

| Exodra                                                                      | React                                                                                                          |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `exoJsx(($) => <markup />)`                                                 | `exoReactSchema(kinds, elements, (v) => <react markup />)`: the same element tree, every port read through `v` |
| `import { … } from '@exodra/core'` (and `jsx`, `dom`, `list-reconcile`)     | the same names from the runtime module                                                                         |
| an exported `const xMachine = composeExoMachine(…)` / `createExoMachine(…)` | also `export const X = exoReactComponent(xMachine)`, a React component                                         |

Everything else is left as written: transitions, wires, handlers, effects,
helper functions that take the exonode `c`, other modules that read services off
`c`. The runtime gives `c` the same methods the DOM backend does, over React
state:

| On `c`                                                                                                                | In the runtime                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`, `attr`, `unsafeHtml`                                                                                          | stores the value and re-renders the node's view                                                                                                                                           |
| a `value` / `checked` / `selected` port on a form control                                                             | written to the element's property, as the DOM backend does                                                                                                                                |
| `on(port, handler, subject?)`                                                                                         | replaces the machine's handler for that port on this node                                                                                                                                 |
| `portNode(port)`                                                                                                      | the element of the ref port                                                                                                                                                               |
| `portChildList(port)`                                                                                                 | the positional list the reconcilers drive: `insert` / `attach` / `move` / `remove` / `removeAll` / `detach` / `detachAll`; a removed child is destroyed, a detached one keeps its effects |
| `createExoNode`, `appendChild`, `insertChild`, `moveChild`, `removeChild`, `replaceChildren`, `childAt`, `childCount` | the calls of [Children](./children.md): a created node stays unwired until `wireExoNode`, a removed one keeps its state and effects, `replaceChildren` destroys                           |
| `wireExoSelf(params)`                                                                                                 | `wireExoNode(c, params)`; `createExoChildrenReconciler` calls it on a new or changed row                                                                                                  |
| `one`, `list`                                                                                                         | create and wire a child in one call, like the DOM backend                                                                                                                                 |
| `onTeardown`, `restartEffect`                                                                                         | run on dispose / restart one effect                                                                                                                                                       |
| `inject`, `provide`                                                                                                   | a lookup up the node's parents                                                                                                                                                            |
| `c.someService`                                                                                                       | the value handed to `ExoReactServices`                                                                                                                                                    |

`createExoMachine`, `composeExoMachine`, `withExoTransitions`, `withExoWire`,
`withExoHandlers`, `withExoEffects`, `wireExoNode`, `destroyExoNode`,
`connectExoNode`, `disconnectExoNode`, `swapExoParams`, `createExoChildrenReconciler`, the
low-level `reconcileExoOrder` and `EXO_UNARMED_STATE` come from the
runtime with the machine shape of `@exodra/core`. A decorator from another
library — `withCNSReceptors` from `@cnstra/exodra`, `withOIMEffects` from
`@oimdb/exodra` — is a function over that shape, so it runs unchanged.

Effects start when a node is wired and its view has been laid out, whichever
comes last, and stop when the node is destroyed. A node wired and never placed
has no running effects in React, unlike on the DOM backend, because React has
not made its elements yet.

## Putting it in a React app

```tsx no-check
import { ExoReactServices } from 'exo-react-runtime';
import { Explorer } from './view/explorer/explorerMachine';

<ExoReactServices value={{ devTools, cns: devTools.cns, exodraPlugin }}>
    <Explorer />
</ExoReactServices>;
```

`ExoReactServices` takes what `composeExoPlugins(backend, { … })` put on the
backend. A root component takes its `params` as a prop; a new `params` re-runs
the machine's `wire`.

## What it does not translate

Everything below lands in `unsupported` instead of in wrong code:

-   a schema written with `createExoSchema` (the cursor form); only `exoJsx` is read;
-   an `exoJsx` body that is not one returned element;
-   an `@exodra/*` import the runtime has no counterpart for, named with its package.

## How it is checked

The package's tests compile one source both ways — the original through
`@exodra/babel-plugin-schema` onto the DOM backend, the translation through
React — and compare `innerHTML` after every step: a counter, a list re-wired
through `wireExoNode`, a keyed list that keeps rows and reads a backend service,
an exonode handed to a helper of another module, a decorator from another
library built on the real `withExoHandlers` and `withExoEffects`, a form
field read through `portNode` and cleared through a `value` port, and a board
whose children are created, wired, moved between ports, taken out, put back,
destroyed and replaced through the port methods, and a keyed
`createExoChildrenReconciler` between a fixed first and last row.
