# @exodra/forms

Two-way form binding helpers for Exodra - runtime support for the `bind:` directive.

## Installation

```bash
npm install @exodra/forms @exodra/reactivity
```

## Overview

`@exodra/forms` provides runtime helpers for two-way data binding in forms. It works with the Babel plugin to enable the `bind:` directive in JSX.

## Usage

### With JSX Directive

When using `@exodra/babel-plugin-jsx`, you can use the `bind:` directive. Note
that all non-directive attributes still go in the typed `static` bucket — flat
React-style props are a compile error in Exodra JSX. The compiler picks the right
helper (`bindText`/`bindSelect`/`bindChecked`/`bindNumber`) per element from the
element type and `bind:value` / `bind:checked`:

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

### Manual Usage

You can also use the helpers directly without JSX:

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
  static: { placeholder: 'Name' }
});

// Number input
h('input', {
  ...bindNumber(age),
  static: { type: 'number' }
});

// Checkbox
h('input', {
  ...bindChecked(agreed),
  static: { type: 'checkbox' }
});
```

## Available Helpers

### `bindText(bindable)`
For text inputs and textareas. Binds the value and handles input events.

### `bindNumber(bindable)`
For number and range inputs. Parses numeric values automatically.

### `bindChecked(bindable)`
For checkboxes and radio buttons. Binds the checked state.

### `bindSelect(bindable)`
For select elements. Handles single and multiple selections.

## How It Works

Each helper returns an object with exactly two buckets — `bindables` and
`handlers` — that you spread onto an element:

```javascript
bindText(model)
// Returns:
{
  bindables: { value: model },
  handlers: { onInput: (e) => model.setValue(e.target.value) }
}
```

The bindable object is passed straight into `bindables` (never a thunk, never
`.value`). The handler writes back with `model.setValue(...)`. To read the model
elsewhere, use `model.getValue()`.

| Helper          | bindables key | handler   | reads from event           |
| --------------- | ------------- | --------- | -------------------------- |
| `bindText`      | `value`       | `onInput` | `target.value`             |
| `bindSelect`    | `value`       | `onChange`| `target.value`             |
| `bindChecked`   | `checked`     | `onChange`| `target.checked`           |
| `bindNumber`    | `value`       | `onInput` | `target.valueAsNumber`     |

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { bindText } from '@exodra/forms';
import { bindable } from '@exodra/reactivity';

const name = bindable<string>('');
const boundProps = bindText(name); // Fully typed
```

## License

MIT
---

📖 Full documentation: **[exodra.org](https://exodra.org)**
