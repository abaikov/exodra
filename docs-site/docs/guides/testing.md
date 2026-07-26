---
title: Testing
---

# Testing

Testing Exodra components means compiling Exodra JSX in your test runner. Which
transform to configure depends on the runner.

## Vitest

Vitest uses Vite, so the [Vite plugin](../tooling/vite-plugin.md) already compiles
your components — add it to `vitest.config.ts` the same way you add it to
`vite.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
  plugins: [exodra()],
  test: { environment: 'jsdom' },
});
```

`environment: 'jsdom'` runs the tests under **[jsdom](https://github.com/jsdom/jsdom)**
— a DOM implementation for Node — so `document` exists and you can mount and assert
against real elements without a browser. To scope jsdom to a single file instead of
the whole config, put the pragma at the top of that file:

```tsx
// @vitest-environment jsdom
```

Then mount and assert against the real DOM:

```tsx
import { mount } from '@exodra/dom';
import { bindable } from '@exodra/reactivity';

it('updates on setValue', () => {
  const label = bindable('a');
  const el = document.createElement('div');
  const { dispose } = mount(<span bindable={{ textContent: label }} />, el);
  expect(el.querySelector('span')?.textContent).toBe('a');
  label.setValue('b');
  expect(el.querySelector('span')?.textContent).toBe('b');
  dispose();
});
```

## Jest

Jest **can** compile Exodra JSX — through `babel-jest` (its default Babel
transform), which picks up `babel.config.js` automatically. Add the
[Babel preset](../tooling/babel-preset.md):

```javascript
// babel.config.js
module.exports = { presets: ['exodra'] };
```

Component tests then compile the same way Vite compiles them. Mount with
`@exodra/dom` under jsdom — set the test environment in `jest.config.js`:

```javascript
// jest.config.js
module.exports = { testEnvironment: 'jsdom' };
```

:::warning ts-jest / @swc/jest do not work
`ts-jest` and `@swc/jest` do **not** run Babel plugins, so they cannot compile
Exodra JSX. If Jest reports an unexpected token on `<`, or *"namespace tags are
not supported"* on `bind:value`, switch the transform to `babel-jest` and add the
preset above. (SWC users can instead use the [SWC plugin](../tooling/swc-plugin.md).)
:::

## SSR / string output

For a fast, browser-free assertion you can render a schema to HTML with
[`@exodra/string`](../api/string.md) and assert on the string instead of mounting
into a DOM.
