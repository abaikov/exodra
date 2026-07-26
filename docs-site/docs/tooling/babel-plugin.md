---
title: Babel Plugin (JSX)
---

# Babel Plugin (JSX)

`@exodra/babel-plugin-jsx` compiles Exodra JSX into `h()` calls with the
typed-bucket architecture and compile-time static hoisting. It is the **only**
supported way to compile Exodra JSX — TypeScript's native JSX transform and
`@babel/plugin-transform-react-jsx` emit `jsx()` / `jsxs()` runtime calls that
Exodra does not have.

## Installation

```bash
npm install --save-dev @exodra/babel-plugin-jsx
```

## Configuration

### .babelrc

```json
{
  "plugins": [
    ["@exodra/babel-plugin-jsx", { "hoistStatic": true }]
  ]
}
```

### With Vite

If you use [`@exodra/vite-plugin`](./vite-plugin.md), this is wired up for you.
To configure Babel manually:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import * as babel from '@babel/core';

export default defineConfig({
  esbuild: false,
  plugins: [
    {
      name: 'exodra-jsx',
      transform(code, id) {
        if (id.endsWith('.jsx') || id.endsWith('.tsx')) {
          return babel.transform(code, {
            filename: id,
            plugins: [['@exodra/babel-plugin-jsx', { hoistStatic: true }]],
          });
        }
      },
    },
  ],
});
```

## Typed-bucket architecture

The plugin maps the singular JSX buckets to the plural buckets of the core
schema (`static` → `static`, `bindable` → `bindables`,
`bindableList` → `bindableLists`, `handlers` → `handlers`,
`bindableHandlers` → `bindableHandlers`):

```jsx
// JSX input
<div
  static={{ id: 'container', class: 'box' }}
  bindable={{ hidden: isHidden }}
  handlers={{ onClick: handleClick }}
>
  Content
</div>

// Transformed output
h('div', {
  static: { id: 'container', class: 'box', children: text('Content') },
  bindables: { hidden: isHidden },
  handlers: { onClick: handleClick },
});
```

`isHidden` is a `bindable` / `derive` object passed directly — not a thunk.

## Strict mode

The plugin enforces strict separation of concerns: **flat React-style
attributes throw a compile error** pointing at the right bucket. A flat
`onClick` would silently land in `static` (a dead handler), and a flat `class`
would blur the static/reactive split — so both fail loud.

```jsx
// ❌ WRONG — flat attributes not allowed
<button onClick={handleClick}>Click</button>
// Error: Exodra JSX: flat event prop "onClick" is not allowed.
//        Use handlers={{ onClick: ... }}

<div class="box" />
// Error: Exodra JSX: flat attribute "class" is not allowed.
//        Put it in a bucket — static={{ "class": ... }} …

// ✅ CORRECT — explicit buckets
<button
  static={{ class: 'box', children: 'Click' }}
  handlers={{ onClick: handleClick }}
/>
```

Event props (`on*`) belong in `handlers` (or `bindableHandlers` for a reactive
handler); lifecycle hooks such as `onExoMount` go in `static`. See the
[JSX guide](../guides/jsx.md) for the full set of rules.

## Static hoisting

With `hoistStatic` enabled (the default), static subtrees in loops get an
auto-generated clone-cache key so they can be cloned instead of rebuilt:

```jsx
// Input
items.map(item => (
  <div static={{ class: 'item' }}>
    <span static={{ children: item.name }} />
  </div>
))

// Output with an auto-generated cacheKey (3rd arg of h())
const _ck1 = Symbol();
items.map(item =>
  h('div', {
    static: {
      class: 'item',
      children: h('span', { static: { children: text(item.name) } }),
    },
  }, _ck1)
)
```

## Two-way binding directives

`bind:value` / `bind:checked` compile to a `mergeAttrs(...)` call (imported from
[`@exodra/attrs`](../api/attrs.md)) plus the appropriate `@exodra/forms` helper
(picked from the element / type at compile time, so only the used variants are
imported):

```jsx
// Input
<input bind:value={inputValue} />

// Output
import { mergeAttrs } from '@exodra/attrs';
import { bindText } from '@exodra/forms';
h('input', mergeAttrs({}, bindText(inputValue)))
```

## `props={}` — spread a bucket object

`props={obj}` spreads a full bucket object (the schema shape:
`static` / `bindables` / `bindableLists` / `handlers` / `bindableHandlers`) into
the element. The compiler does the **dumbest, most predictable** thing — a plain
JS object spread, no implicit merge:

```jsx
// Input
<button props={base} static={{ class: 'btn' }} handlers={{ onClick: f }} />

// Output — spread first (the base), inline buckets after (they win)
h('button', { ...base, static: { class: 'btn' }, handlers: { onClick: f } })
```

- **Plain spread, one level.** An inline bucket **replaces** that whole
  top-level field of the spread object — `static` overrides `base.static`
  wholesale, it does not descend into it. That's exactly JS spread semantics, so
  there is nothing hidden to learn.
- **The object is the schema shape** (plural buckets), so helpers that return it
  drop straight in: `props={bindText(name)}` (`@exodra/forms`),
  `props={bindField(patch, 'title')}` (`@oimdb/exodra`). This is the Exodra
  "prop-getter" pattern.
- **Pick your own merge strategy** — because you build the object yourself. Want
  two-level composition? Ask for it explicitly:
  `props={mergeAttrs(base, getInputProps())}`.
- **`exo:schema` still wins** (it replaces everything); combined with `bind:`,
  the spread object becomes the `mergeAttrs` base.
- **Watch children + a helper's `static`.** JSX children fold into `static.children`,
  creating an inline `static` bucket — which then replaces a helper's `static`
  wholesale. Keep `static` out of a helper used with children, or merge it
  yourself. (Real helpers usually return `handlers`/`bindables`, which don't
  collide.)

An element that carries a `props={}` spread is never static-hoisted (the spread
is a runtime value).

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `importSource` | string | `'@exodra/core'` | Module to import the pragma / `text` / `Fragment` from. |
| `pragma` | string | `'h'` | Element-creation function name. |
| `pragmaFrag` | string | `'Fragment'` | Fragment identifier. |
| `hoistStatic` | boolean | `true` | Hoist static schemas (clone-cache keys). |

There is no `optimize` option.

## Links

- npm:
  [@exodra/babel-plugin-jsx](https://www.npmjs.com/package/@exodra/babel-plugin-jsx)
- GitHub:
  [packages/babel-plugin-jsx](https://github.com/abaikov/exodra/tree/master/packages/babel-plugin-jsx)
