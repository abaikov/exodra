# @exodra/jsx

JSX/TSX support for Exodra — typed buckets, not flat React props.

## Installation

```bash
npm install @exodra/jsx @exodra/core @exodra/reactivity
npm install --save-dev @exodra/babel-plugin-jsx
```

## Exodra JSX is NOT React

Exodra JSX looks like React JSX but compiles to something completely different,
and the prop model is **strict and explicit**. This is the whole point of the
library: the developer controls exactly what is static, what is reactive, and
what is an event — so the renderer never has to guess. React and Solid trade
that control for a "flat" prop syntax; Exodra does not.

Every prop on an intrinsic element goes into one of five **typed buckets** (plus
a few compiler directives). **Flat React-style props are a compile error**, both
in TypeScript and in the babel plugin.

```tsx
// ❌ React style — every line below is a COMPILE ERROR in Exodra:
<div id="x" className="y" onClick={fn} style={{ color: 'red' }} />

// ✅ Exodra style — each prop declares its bucket:
<div
  static={{ id: 'x', class: 'y', style: 'color: red' }}
  handlers={{ onClick: fn }}
/>
```

### The buckets

In JSX the buckets are written **singular**; the babel plugin maps them to the
**plural** buckets of the core `h()` schema (`static` → `static`,
`bindable` → `bindables`, `bindableList` → `bindableLists`, etc.).

| JSX prop | Holds | Example |
| --- | --- | --- |
| `static={{…}}` | Plain DOM attributes + static children + lifecycle hooks. Never change. | `static={{ id: 'x', class: 'box' }}` |
| `bindable={{…}}` | Reactive scalar values — `bindable`/`derive` **objects**, not thunks. | `bindable={{ textContent: title }}` |
| `bindableList={{…}}` | Reactive lists (usually `children`) from `list()`. | `bindableList={{ children: items }}` |
| `handlers={{…}}` | DOM event handlers. (Alias: `handler`.) | `handlers={{ onClick: fn }}` |
| `bindableHandlers={{…}}` | Reactive event handlers — a bindable of a listener. (Alias: `bindableHandler`.) | `bindableHandlers={{ onClick: sig }}` |

Reactive values are **objects passed directly**, never `() => x.value` thunks.
Read them with `.getValue()`, write with `.setValue(...)`. There is no `.value`.

```tsx
import { bindable, derive } from '@exodra/reactivity';

const title = bindable('Hello');
const upper = derive(title, t => t.toUpperCase());

// reactive text content:
<span bindable={{ textContent: upper }} />
```

### Directives

A handful of namespaced props are compiler directives, not buckets:

- `bind:value={writable}` / `bind:checked={writable}` — two-way form binding
  (compiled to `mergeAttrs(...)` + a `@exodra/forms` helper).
- `cache:key={EXPR}` (alias `cacheKey`) — clone-cache key, becomes the 3rd arg
  of `h()`.
- `exo:schema={attrs}` — replace the entire props object with a raw schema attrs
  object.

## Configuration — only the Babel plugin works

> **Important:** Exodra JSX is compiled **only** by `@exodra/babel-plugin-jsx`.
> TypeScript's native JSX transform (`"jsx": "react-jsx"` + `jsxImportSource`),
> esbuild's `jsx: 'automatic'`, and `@babel/plugin-transform-react-jsx` are all
> **incompatible** — they emit `jsx()`/`jsxs()` runtime calls that do not exist
> in Exodra. Do not use them.

### .babelrc

```json
{
  "plugins": [
    ["@exodra/babel-plugin-jsx", { "hoistStatic": true }]
  ]
}
```

### tsconfig.json

Use `preserve` so TypeScript only type-checks the JSX and leaves the transform to
Babel:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "types": ["@exodra/jsx"]
  }
}
```

The `@exodra/jsx` types supply the `JSX` namespace (`JSX.Element`,
`JSX.IntrinsicElements`) so intrinsic elements and their buckets are fully typed.

## Basic Usage

```tsx
import { bindable, derive } from '@exodra/reactivity';
import { mount } from '@exodra/dom';

const count = bindable(0);
const label = derive(count, c => `Count: ${c}`);

const app = (
  <div static={{ class: 'counter' }}>
    <span bindable={{ textContent: label }} />
    <button
      static={{ class: 'btn' }}
      handlers={{ onClick: () => count.setValue(count.getValue() + 1) }}
    >
      +1
    </button>
  </div>
);

const { dispose } = mount(app, document.getElementById('root')!);
```

## Components

A component is a plain function that returns a schema (`JSX.Element`). It receives
its own props object; intrinsic-element bucket rules apply inside it.

```tsx
import type { TExoSchema } from '@exodra/core';

function Button(props: {
  label: string;
  onPress: () => void;
}): TExoSchema {
  return (
    <button
      static={{ class: 'btn', children: props.label }}
      handlers={{ onClick: props.onPress }}
    />
  );
}

// Usage:
<Button label="Click me" onPress={() => alert('Clicked!')} />;
```

## Fragments

Group elements without a wrapper. `<></>` of static children flattens into the
parent; a fragment wrapping a single reactive list becomes a real Fragment
component carrying that `bindableList`.

```tsx
const list = (
  <>
    <li static={{ children: 'Item 1' }} />
    <li static={{ children: 'Item 2' }} />
    <li static={{ children: 'Item 3' }} />
  </>
);
```

`Fragment` is exported as a `Symbol.for('exodra.fragment')`.

## Conditional Rendering

Use a derived bindable as a single reactive child via `bindable={{ children }}`:

```tsx
import { bindable, derive } from '@exodra/reactivity';

const loggedIn = bindable(false);
const name = bindable('Ada');

const view = derive(loggedIn, on =>
  on
    ? <span bindable={{ textContent: name }} />
    : <a static={{ href: '/login', children: 'Please login' }} />
);

const root = <div bindable={{ children: view }} />;
```

## Lists

A reactive list (`list()` from `@exodra/reactivity`) goes into the
`bindableList` bucket. Static `.map()` over a plain array also works as static
children:

```tsx
import { list } from '@exodra/reactivity';

const items = list<TExoSchema>([]);

// reactive list:
<ul bindableList={{ children: items }} />;

// static array of children:
<ul>
  {todos.map(t => (
    <li static={{ children: t.text }} />
  ))}
</ul>;
```

There is no `key` prop — list reconciliation is driven by `list` ops
(`insert`/`remove`/`move`/…), not by keys.

## Event Handling

```tsx
function Form() {
  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    // handle form
  };

  return (
    <form handlers={{ onSubmit }}>
      <input
        static={{ type: 'text' }}
        handlers={{
          onInput: e => console.log((e.target as HTMLInputElement).value),
        }}
      />
      <button static={{ type: 'submit', children: 'Submit' }} />
    </form>
  );
}
```

## Forms and Two-Way Binding

`bind:value` / `bind:checked` keep a writable bindable in sync with the input.
The plugin picks the right `@exodra/forms` helper from the element/type:

```tsx
import { bindable } from '@exodra/reactivity';

const text = bindable('');
const agree = bindable(false);

<input static={{ type: 'text' }} bind:value={text} />;
<input static={{ type: 'checkbox' }} bind:checked={agree} />;
```

Or wire it manually with the `bindable` + `handlers` buckets:

```tsx
<input
  static={{ type: 'text' }}
  bindable={{ value: text }}
  handlers={{ onInput: e => text.setValue((e.target as HTMLInputElement).value) }}
/>;
```

## Class Names and Styles

`class` and `style` are plain string attributes in the `static` bucket; a
reactive class is a bindable/derived in the `bindable` bucket. `style` is a CSS
string (not an object).

```tsx
import { bindable, derive } from '@exodra/reactivity';

const active = bindable(false);
const cls = derive(active, on => (on ? 'btn btn--active' : 'btn'));

// static:
<div static={{ class: 'container', style: 'color: red; font-size: 16px' }} />;

// reactive:
<div bindable={{ class: cls }} />;
```

## Lifecycle Hooks

`onExoMount` / `onExoUnmount` live in the `static` bucket and receive `{ element }`:

```tsx
<div
  static={{
    class: 'page',
    onExoMount: () => console.log('mounted'),
    onExoUnmount: () => console.log('unmounted'),
  }}
/>;
```

## API Reference

`@exodra/jsx` exports:

| Export | Description |
| --- | --- |
| `Fragment` | `Symbol.for('exodra.fragment')` used for `<></>` |
| `mergeAttrs` | Runtime glue emitted by the plugin for elements with directives |
| `JSX` (type namespace) | `JSX.Element`, `JSX.IntrinsicElements`, etc. |
| html types | Bucket/attribute type definitions for intrinsic elements |

There is **no** `jsx`, `jsxs`, `FC`, or `HTMLAttributes` export. The babel
plugin compiles JSX straight to `h()` calls — there is no `jsx()`/`jsxs()`
runtime.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
