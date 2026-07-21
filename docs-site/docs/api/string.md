---
title: String Renderer
---

# String Renderer

The `@exodra/string` package renders Exodra schemas to HTML strings. It is the
server-side rendering engine — direct string concatenation, no virtual DOM — used
for SSR, static site generation, email templates, and testing. The higher-level
[`@exodra/ssr`](../guides/ssr.md) tooling builds on this package.

```bash
npm install @exodra/string @exodra/core
```

Exports: `renderToString`, `createStringNode`, and `ExoNodeString`.

## renderToString()

Renders a schema to an HTML string synchronously.

```typescript
function renderToString(schema: TExoSchema): string;
```

```javascript
import { renderToString } from '@exodra/string';
import { h, text } from '@exodra/core';

const schema = h('div', {
  static: {
    id: 'app',
    class: 'container',
    children: [
      h('h1', { static: { children: text('Hello World') } }),
      h('p', { static: { children: text('Welcome to Exodra') } }),
    ],
  },
});

const html = renderToString(schema);
// <div id="app" class="container"><h1>Hello World</h1><p>Welcome to Exodra</p></div>
```

### With components

```javascript
import { renderToString } from '@exodra/string';
import { h, text } from '@exodra/core';

function Card({ title, content }) {
  return h('div', {
    static: {
      class: 'card',
      children: [
        h('h2', { static: { children: text(title) } }),
        h('p', { static: { children: text(content) } }),
      ],
    },
  });
}

const html = renderToString(
  h(Card, {
    static: { title: 'My Card', content: 'Card content here' },
  })
);
```

### Reactive values

During SSR, reactive values are rendered with their initial state. Pass the
bindable object directly into the `bindables` bucket (read the raw value with
`.getValue()` — there is no `.value`).

```javascript
import { bindable } from '@exodra/reactivity';

const count = bindable(42);

const schema = h('span', {
  bindables: { textContent: count },
});

renderToString(schema);
// <span>42</span>
```

### HTML escaping

All text content is automatically escaped for security:

```javascript
const schema = h('div', {
  static: { children: text('<script>alert("XSS")</script>') },
});

renderToString(schema);
// <div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>
```

## createStringNode()

Low-level helper that creates an `ExoNodeString` for a schema. Most apps use
`renderToString()` instead.

## ExoNodeString

The string renderer implementation class. Usually not used directly —
`@exodra/ssr` extends it as `ExoNodeSsr` to add head / state / header
collection.

```javascript
import { ExoNodeSsr } from '@exodra/ssr';

const ssr = new ExoNodeSsr(h(App));
const bodyHtml = ssr.renderBody(); // uses @exodra/string under the hood
```

## Integration with SSR

`@exodra/string` is the rendering engine that `@exodra/ssr` builds on. For full
server-side rendering with head management, state transfer, and hydration, see
the [SSR guide](../guides/ssr.md).

## API Reference

| Export | Description |
| --- | --- |
| `renderToString(schema)` | Render a schema to an HTML string synchronously. |
| `createStringNode(schema)` | Create an `ExoNodeString` for a schema (low-level). |
| `ExoNodeString` | The string renderer implementation class. |

## Links

- npm: [`@exodra/string`](https://www.npmjs.com/package/@exodra/string)
- GitHub: [exodra/packages/string](https://github.com/abaikov/exodra/tree/master/packages/string)
