# @exodra/string

Fast HTML string rendering for Exodra - converts components to HTML for SSR and static generation.

## Installation

```bash
npm install @exodra/string @exodra/core
```

## Overview

`@exodra/string` provides server-side HTML string rendering for Exodra schemas. It's used for:
- Server-side rendering (SSR)
- Static site generation
- Email templates
- Testing

## Usage

### Basic Rendering

```javascript
import { renderToString } from '@exodra/string';
import { h, text } from '@exodra/core';

const schema = h('div', {
  static: {
    id: 'app',
    class: 'container',
    children: [
      h('h1', { static: { children: text('Hello World') } }),
      h('p', { static: { children: text('Welcome to Exodra') } })
    ]
  }
});

const html = renderToString(schema);
// <div id="app" class="container"><h1>Hello World</h1><p>Welcome to Exodra</p></div>
```

### With Components

```javascript
import { renderToString } from '@exodra/string';
import { h, text } from '@exodra/core';

function Card({ title, content }) {
  return h('div', {
    static: {
      class: 'card',
      children: [
        h('h2', { static: { children: text(title) } }),
        h('p', { static: { children: text(content) } })
      ]
    }
  });
}

const html = renderToString(
  h(Card, {
    static: {
      title: 'My Card',
      content: 'Card content here'
    }
  })
);
```

### Handling Reactive Values

During SSR, reactive values are rendered with their initial state. Pass the
bindable object directly (read it with `.getValue()` if you need the raw value):

```javascript
import { bindable } from '@exodra/reactivity';

const count = bindable(42);

const schema = h('span', {
  bindables: { textContent: count }
});

const html = renderToString(schema);
// <span>42</span>

// count.getValue() === 42  (there is no `.value` property)
```

### HTML Escaping

All text content is automatically escaped for security:

```javascript
const schema = h('div', {
  static: {
    children: text('<script>alert("XSS")</script>')
  }
});

renderToString(schema);
// <div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>
```

## Performance

- Minimal overhead - direct string concatenation
- No virtual DOM
- Efficient HTML escaping

## API Reference

### `renderToString(schema: TExoSchema): string`

Renders a schema to an HTML string synchronously.

### `createStringNode(schema)`

Creates an `ExoNodeString` for a schema. Low-level helper.

### `ExoNodeString`

The string renderer implementation class. Usually not used directly — `@exodra/ssr`
extends it as `ExoNodeSsr` to add head/state/header collection.

## Integration with SSR

`@exodra/string` is the rendering engine that `@exodra/ssr` builds on. For full
server-side rendering with head management, state transfer, and hydration, use
[`@exodra/ssr`](../ssr), which extends `ExoNodeString`:

```javascript
import { ExoNodeSsr } from '@exodra/ssr';

const ssr = new ExoNodeSsr(h(App));
const bodyHtml = ssr.renderBody(); // uses @exodra/string under the hood
```

## License

MIT
---

📖 Full documentation: **[exodra.org](https://exodra.org)**
