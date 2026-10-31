---
title: Testing
---

# Testing

A component is a **plain value** — no compiler, no transform, no runner plugin.
`createExoSchema(build)` and `createExoMachineBuilder(schema)` are function calls, so a test imports the
component and renders it, and the whole of this page up to the last section needs
nothing configured beyond a `document`.

Components written in [JSX](./jsx.md) do need the compiler in the transform
chain, because uncompiled JSX throws when it reaches the runtime — see
[Testing JSX components](#testing-jsx-components).

## Rendering into a DOM

Any runner that gives you a `document` works. Under Vitest that is
`environment: 'jsdom'` — [jsdom](https://github.com/jsdom/jsdom) is a DOM
implementation for Node, so `document` exists and you can assert against real
elements without a browser.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom' },
});
```

To scope jsdom to a single file instead of the whole config, put the pragma at
the top of that file:

```tsx
// @vitest-environment jsdom
```

Then render and assert:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { source } from '@exodra/test-utils';

declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => { toBe(other: unknown): void };

/** ONE backend for the suite, at module level — it is the plan cache key. */
const backend = withExoCompiler(new ExoDomBackend());

const label = source('a');

const LABEL_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('span', null, (span) => {
        text = span.textPort();
    });
    return { text };
});
const mLabel = createExoMachineBuilder<TExoDomNode>(LABEL_SCHEMA);
const showLabel = mLabel.transition((c) => {
    c.text(LABEL_SCHEMA.ports.text, label.getValue());
});
mLabel.effect((c) => {
    showLabel(c);
    return label.onChange(() => showLabel(c));
});
const LABEL = mLabel.done();

it('updates on setValue', () => {
    const host = document.createElement('div');
    const dispose = backend.render(LABEL, host);

    expect(host.querySelector('span')?.textContent).toBe('a');
    label.setValue('b');
    expect(host.querySelector('span')?.textContent).toBe('b');

    dispose();
});
```

`source(v)` from the private `@exodra/test-utils` package is a test double for
outside data: `getValue`, `setValue`, `onChange`, and `subscribers()` to assert
that a teardown left nothing behind. It is not published; outside this
repository any object with `getValue` and `onChange` plays the same part. The machine follows it with an **effect**
that draws first and then subscribes, returning the unsubscribe.

`backend.render` returns the disposer. Calling it in the test stops every
effect the render started — without that, a suite leaks a subscriber per test
and the leak only shows up as a later test seeing an unexpected update.

Build the backend **once**, at module level, in a test file as much as in an
application: it is the key a compiled schema plan is cached under and it is
compared by pointer, so one constructed inside each `it` recompiles every schema —
markup parse included — on every case.

## Asserting on markup instead

For a browser-free assertion, render the **same component** through
`@exodra/string` and assert on the string. This is faster than a DOM and it is
also the strongest check the codebase has, because the two backends only agree
while their port numbering agrees:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachineNode,
} from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';

declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => { toBe(other: unknown): void };

const server = new ExoStrBackend();

const ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
    });
    return { id };
});
const mRow = createExoMachineBuilder<TExoMachineNode, unknown, number>(ROW_SCHEMA);
mRow.createInitialState((_c, i) => i);
mRow.wire((c) => {
    c.attr(ROW_SCHEMA.ports.id, c.state);
});
const ROW = mRow.done();

/**
 * TWO ROWS IS A LIST, NOT A COUNT ON THE ENTRY POINT. `render` mounts ONE instance
 * of its component; anything that repeats is a children port, and `c.list` is the
 * fixed form of one. Row `i` is handed the number `i` as its index, which is what
 * the initial state above reads.
 */
const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
const mList = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(LIST_SCHEMA);
mList.createInitialState((c) => {
    c.list(LIST_SCHEMA.ports.rows, ROW, 2);
});
const LIST = mList.done();

it('renders one li per row', () => {
    expect(server.render(LIST)).toBe(
        '<ul><li class="row" data-id="0"></li><li class="row" data-id="1"></li></ul>'
    );
});
```

## Testing hydration

A hydration test is three lines, and it is the one that catches a port-numbering
drift before users do: serve the markup, adopt it, assert the markup did not
change and the listeners work.

```ts
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoMachine, TExoMachineNode } from '@exodra/core';

declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => { toBe(other: unknown): void };
// ONE type, not an intersection of two backends'. `TExoMachineNode` is the surface all
// three backends share; `TExoStrMachine` and `TExoDomMachine` are
// this same generic with a backend's node TYPE in it, and a transition's node
// parameter is contravariant, so this value satisfies both.
declare const APP: TExoMachine<TExoMachineNode>;


const server = new ExoStrBackend();
/** `hydrate` exists only on a backend composed with the hydration pack. */
const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));

it('adopts its own server output without touching it', () => {
    const host = document.createElement('div');
    host.innerHTML = server.render(APP);
    const before = host.innerHTML;

    backend.hydrate(APP, host);

    expect(host.innerHTML).toBe(before);
});
```

Compose `withExoHydration` onto the **same** backend the test renders with.
That is not a formality: the composition decides how listeners attach and what
owns every adopted region, and hydrating under a different one is the failure the
one-object design exists to make unspellable — nothing throws, and the wrong
reconciler simply owns the tree from then on. A backend composed *without* the
pack has no `hydrate` at all, so getting this wrong is a compile error rather than
a call landing on `undefined`.

`findExoRowDisagreement(schema, root, backend)` from `@exodra/dom` is the explicit version
of that assertion: it returns a description of the first disagreement between an
element and a schema, or `null`. The backend argument is there to select the same
compiled plan the page renders through.

## Testing JSX components

`@exodra/babel-plugin-schema` replaces every `exoJsx(…)` with a module-level
schema declaration. So a test that runs uncompiled JSX does not render the wrong
thing, it throws — the JSX runtime exists precisely to fail with a sentence
naming the missing plugin.

Once the transform is in place, the machine built over a JSX schema **is** the
component value the rest of this page renders. Nothing about the assertions
changes.

### Vitest

Vitest uses Vite, so the [Vite plugin](../tooling/vite-plugin.md) already
compiles your components — add it to `vitest.config.ts` the same way you add it
to `vite.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
  plugins: [exodra()],
  test: { environment: 'jsdom' },
});
```

Then render the machine and assert against the DOM:

```tsx
import { exoJsx } from '@exodra/jsx';
import { createExoMachineBuilder } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => { toBe(other: unknown): void };

const backend = withExoCompiler(new ExoDomBackend());

const NAMES = ['Ada', 'Alan'];

const LABEL_SCHEMA = exoJsx<{ n: TExoAttrPort; name: TExoTextPort }>(($) => (
  <span data-n={$.n}>{$.name}</span>
));
const mLabel = createExoMachineBuilder<TExoDomNode, unknown, number>(LABEL_SCHEMA);
mLabel.createInitialState((_c, i) => i);
mLabel.wire((c) => {
  c.attr(LABEL_SCHEMA.ports.n, c.state);
  c.text(LABEL_SCHEMA.ports.name, `Hi ${NAMES[c.state]}!`);
});
const LABEL = mLabel.done();

const LABELS_SCHEMA = exoJsx<{ labels: TExoChildrenPort }>(($) => (
  <div>
    <$.labels />
  </div>
));
const mLabels = createExoMachineBuilder<TExoDomNode>(LABELS_SCHEMA);
mLabels.createInitialState((c) => {
  c.list(LABELS_SCHEMA.ports.labels, LABEL, NAMES.length);
  return null;
});
const LABELS = mLabels.done();

it('fills the text and attribute ports from the index', () => {
  const host = document.createElement('div');
  const dispose = backend.render(LABELS, host);

  const spans = host.querySelectorAll('span');
  expect(spans.length).toBe(2);
  expect(spans[1].textContent).toBe('Hi Alan!');
  expect(spans[1].getAttribute('data-n')).toBe('1');

  dispose();
});
```

### Jest

Jest compiles Exodra JSX through `babel-jest` (its default Babel transform),
which picks up `babel.config.js` automatically. Add the
[Babel preset](../tooling/babel-preset.md):

```javascript
// babel.config.js
module.exports = { presets: ['exodra'] };
```

Set the test environment in `jest.config.js`:

```javascript
// jest.config.js
module.exports = { testEnvironment: 'jsdom' };
```

:::warning ts-jest / @swc/jest do not work
`ts-jest` and `@swc/jest` do **not** run Babel plugins, so they cannot compile
Exodra JSX. If Jest reports an unexpected token on `<`, or *"namespace tags are
not supported"* on `on:click`, switch the transform to `babel-jest` and add the
preset above. (SWC users can instead use the [SWC plugin](../tooling/swc-plugin.md).)
:::
