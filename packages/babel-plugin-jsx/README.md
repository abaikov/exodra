# @exodra/babel-plugin-jsx

Babel plugin that compiles Exodra JSX into `h()` calls with the typed-bucket
architecture and compile-time static hoisting.

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

> This plugin is the **only** supported way to compile Exodra JSX. TypeScript's
> native JSX transform and `@babel/plugin-transform-react-jsx` are incompatible —
> they emit `jsx()`/`jsxs()` runtime calls that Exodra does not have.

### With Vite

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

## Features

### Typed-Bucket Architecture

The plugin maps the singular JSX buckets to the plural buckets of the core
schema (`static` → `static`, `bindable` → `bindables`,
`bindableList` → `bindableLists`, `handlers` → `handlers`,
`bindableHandlers` → `bindableHandlers`):

```jsx
// JSX Input
<div
  static={{ id: 'container', class: 'box' }}
  bindable={{ hidden: isHidden }}
  handlers={{ onClick: handleClick }}
>
  Content
</div>

// Transformed Output
h('div', {
  static: { id: 'container', class: 'box', children: text('Content') },
  bindables: { hidden: isHidden },
  handlers: { onClick: handleClick },
})
```

`isHidden` here is a `bindable`/`derive` object passed directly — not a thunk.

### Static Hoisting

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

### Two-Way Binding Directives

`bind:value` / `bind:checked` compile to a `mergeAttrs(...)` call plus the
appropriate `@exodra/forms` helper (picked from the element/type at compile time):

```jsx
// Input
<input bind:value={inputValue} />

// Output
h('input', mergeAttrs({}, bindText(inputValue)))
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `importSource` | string | `'@exodra/core'` | Module to import the pragma/`text`/`Fragment` from |
| `pragma` | string | `'h'` | Element-creation function name |
| `pragmaFrag` | string | `'Fragment'` | Fragment identifier |
| `hoistStatic` | boolean | `true` | Hoist static schemas (clone-cache keys) |

There is no `optimize` option.

## Strict Mode

The plugin enforces strict separation of concerns — flat React-style attributes
throw a compile error pointing at the right bucket:

```jsx
// ❌ WRONG — flat attributes not allowed
<button onClick={handleClick}>Click</button>
// Error: Exodra JSX: flat event prop "onClick" is not allowed.
//        Use handlers={{ onClick: ... }}

// ✅ CORRECT — explicit buckets
<button
  static={{ children: 'Click' }}
  handlers={{ onClick: handleClick }}
/>
```

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
