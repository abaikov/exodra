---
title: Attrs
---

# Attrs

`@exodra/attrs` composes several typed **bucket objects** — `static`,
`bindables`, `bindableLists`, `handlers`, `bindableHandlers` — into one
schema-props object. It's a tiny, dependency-free runtime tool: the composition
model behind the `bind:` directive and the explicit merge you reach for when
composing `props={...}`.

```bash
npm install @exodra/attrs
```

Exports: `mergeAttrs`.

## `mergeAttrs(base, ...partials)`

```typescript
function mergeAttrs(
  base: Partial<TExoSchemaProps> | null | undefined,
  ...partials: (Partial<TExoSchemaProps> | null | undefined)[]
): TExoSchemaProps;
```

```javascript
import { mergeAttrs } from '@exodra/attrs';

mergeAttrs(
  { static: { id: 'save' }, handlers: { onClick: save } },
  { static: { class: 'btn' } },     // static.id survives, static.class added
  { handlers: { onFocus: track } }  // handlers merged, not replaced
);
// → { static: { id: 'save', class: 'btn' }, handlers: { onClick, onFocus } }
```

### Semantics

- **Shallow, two-level, last-wins.** Buckets are merged, and within a bucket the
  same key is overwritten by the later source. It stops at the bucket-value level
  **on purpose** — bucket values are live objects (`bindable` signals, `list`s,
  handler functions) that must be replaced wholesale, never recursed into. A
  generic deep merge would descend into a signal and corrupt it.
- **Lifecycle hooks compose.** `static.onExoMount` / `static.onExoUnmount` from
  every source are collected and all run, in order — so several behaviour
  helpers can attach to the same element without clobbering each other.
- **Falsy partials are skipped** (`null` / `undefined`), which keeps conditional
  composition clean.

## Where it's used

### Runtime of the `bind:` directive

`@exodra/babel-plugin-jsx` compiles an element that has `bind:value` /
`bind:checked` to a single `mergeAttrs(...)` call, importing it from
`@exodra/attrs` and pairing it with the right `@exodra/forms` helper:

```jsx
<input bind:value={name} />
// →
import { mergeAttrs } from '@exodra/attrs';
import { bindText } from '@exodra/forms';
h('input', mergeAttrs({}, bindText(name)));
```

### Explicit merge for `props=` composition

The compiler never merges implicitly — inline buckets and `props={...}` layer as
a plain object spread (last top-level field wins). When you want two-level
composition, you ask for it yourself:

```jsx
<button props={mergeAttrs(baseAttrs, getInputProps())} static={{ class: 'btn' }} />
```

### The prop-getter pattern

Any helper that returns a bucket partial — like `@exodra/forms`' `bindText`
returning `{ bindables, handlers }`, or a bridge like `@oimdb/exodra` — can be
`mergeAttrs`-ed onto an element. Each helper adds itself to the element's attrs
without stepping on the rest. That's the Exodra equivalent of React Aria /
Downshift "get*Props()" composition, but producing typed buckets instead of flat
props.

## Note on the move

`mergeAttrs` used to live in `@exodra/jsx`. It composes attribute buckets, which
is not a JSX concern, so it now has its own package. If you imported it from
`@exodra/jsx`, switch to:

```javascript
import { mergeAttrs } from '@exodra/attrs';
```

## Links

- npm: [`@exodra/attrs`](https://www.npmjs.com/package/@exodra/attrs)
- GitHub: [exodra/packages/attrs](https://github.com/abaikov/exodra/tree/master/packages/attrs)
