# @exodra/attrs

Attrs composition for [Exodra](https://exodra.org). Compose several typed
bucket objects — `static`, `bindables`, `bindableLists`, `handlers`,
`bindableHandlers` — into one schema-props object.

```bash
npm install @exodra/attrs
```

## `mergeAttrs(base, ...partials)`

```ts
import { mergeAttrs } from '@exodra/attrs';

mergeAttrs(
  { static: { id: 'save' }, handlers: { onClick: save } },
  { static: { class: 'btn' } },      // static.id survives, static.class added
  { handlers: { onFocus: track } }   // handlers merged, not replaced
);
// → { static: { id: 'save', class: 'btn' }, handlers: { onClick, onFocus } }
```

- Buckets are **shallow-merged**, later source wins on the same key. It stops at
  the bucket-value level on purpose — bucket values are live objects (`bindable`
  signals, `list`s, handler functions) that must be replaced wholesale, never
  recursed into.
- The `static` lifecycle hooks `onExoMount` / `onExoUnmount` are **composed**
  (all run, in order), so several behaviour helpers can attach to one element.
- `null` / `undefined` partials are skipped.

## Where it's used

- **Runtime of the `bind:` directive.** `@exodra/babel-plugin-jsx` compiles an
  element with `bind:value` / `bind:checked` to `h(tag, mergeAttrs(base, …))` —
  one shared runtime call, emitted only when directives are present.
- **Explicit, opt-in merge for `props=` composition.** The compiler never merges
  implicitly; when you want two-level composition you reach for it yourself:
  `<el props={mergeAttrs(base, getInputProps())} />`.

Returning bucket partials from a helper (like `@exodra/forms`' `bindText`) and
merging them is the Exodra "prop-getter" pattern — each helper adds itself to the
element's attrs without clobbering the rest.

---

[exodra.org](https://exodra.org) · [GitHub](https://github.com/abaikov/exodra)
