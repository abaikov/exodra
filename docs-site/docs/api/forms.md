---
title: Forms
---

# Forms

The `@exodra/forms` package provides runtime helpers for two-way data binding in
forms. Each helper takes a writable bindable and returns a `{ bindables, handlers }`
pair that you spread onto an element — the `bindables` side pushes the model into
the DOM, and the `handlers` side writes user input back with `.setValue(...)`.

These helpers are also the runtime of the `bind:` directive: when using
`@exodra/babel-plugin-jsx`, the compiler picks the right helper per element from
`bind:value` / `bind:checked` and folds its result into the element.

```bash
npm install @exodra/forms @exodra/reactivity
```

Exports: `bindText`, `bindNumber`, `bindChecked`, `bindSelect`, and the
`TExoBindAttrs` type.

## The helpers

Each helper returns a `TExoBindAttrs` — an object with exactly two buckets:

```typescript
interface TExoBindAttrs {
  bindables: Record<string, unknown>;
  handlers: Record<string, (event: Event) => void>;
}

function bindText(model: TExoWritableBindable<string>): TExoBindAttrs;
function bindSelect(model: TExoWritableBindable<string>): TExoBindAttrs;
function bindChecked(model: TExoWritableBindable<boolean>): TExoBindAttrs;
function bindNumber(model: TExoWritableBindable<number>): TExoBindAttrs;
```

| Helper | bindables key | handler | reads from event | For |
| --- | --- | --- | --- | --- |
| `bindText` | `value` | `onInput` | `target.value` | text inputs / textareas |
| `bindSelect` | `value` | `onChange` | `target.value` | `<select>` elements |
| `bindChecked` | `checked` | `onChange` | `target.checked` | checkboxes / radios |
| `bindNumber` | `value` | `onInput` | `target.valueAsNumber` | number / range inputs |

For example, `bindText(model)` returns:

```javascript
{
  bindables: { value: model },
  handlers: { onInput: (e) => model.setValue(e.target.value) },
}
```

The bindable object is passed straight into `bindables` (never a thunk, never
`.value`). The handler writes back with `model.setValue(...)`. To read the model
elsewhere, use `model.getValue()`.

## Manual usage

Spread a helper's result onto an `h()` call. Keep your own attributes in the
`static` bucket:

```javascript
import { bindText, bindNumber, bindChecked } from '@exodra/forms';
import { h } from '@exodra/core';
import { bindable } from '@exodra/reactivity';

const name = bindable('');
const age = bindable(0);
const agreed = bindable(false);

// Text input
h('input', {
  ...bindText(name),
  static: { placeholder: 'Name' },
});

// Number input
h('input', {
  ...bindNumber(age),
  static: { type: 'number' },
});

// Checkbox
h('input', {
  ...bindChecked(agreed),
  static: { type: 'checkbox' },
});
```

## With the `bind:` directive (JSX)

With `@exodra/babel-plugin-jsx`, use the `bind:` directive and let the compiler
choose the helper. All non-directive attributes still go in the typed `static`
bucket — flat React-style props are a compile error in Exodra JSX.

```jsx
import { bindable } from '@exodra/reactivity';

function Form() {
  const name = bindable('');
  const email = bindable('');
  const age = bindable(0);
  const agreed = bindable(false);

  return (
    <form>
      <input bind:value={name} static={{ placeholder: 'Name' }} />
      <input bind:value={email} static={{ type: 'email' }} />
      <input bind:value={age} static={{ type: 'number' }} />
      <input bind:checked={agreed} static={{ type: 'checkbox' }} />

      <button static={{ type: 'submit', children: 'Submit' }} />
    </form>
  );
}
```

## TypeScript

The helpers infer from the bindable's value type:

```typescript
import { bindText } from '@exodra/forms';
import { bindable } from '@exodra/reactivity';

const name = bindable<string>('');
const boundProps = bindText(name); // Fully typed TExoBindAttrs
```

## Links

- npm: [`@exodra/forms`](https://www.npmjs.com/package/@exodra/forms)
- GitHub: [exodra/packages/forms](https://github.com/abaikov/exodra/tree/master/packages/forms)
