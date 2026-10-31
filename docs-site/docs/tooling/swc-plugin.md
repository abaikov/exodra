---
title: SWC Plugin
---

# SWC Plugin

`swc-plugin-exodra` is a native Rust/Wasm SWC plugin that compiles Exodra JSX for
SWC-based toolchains — Next.js's default compiler, `@swc/jest`, `swc-loader` —
which cannot run Babel plugins. It is a port of `@exodra/babel-plugin-schema`,
the same dialect in Rust.

:::note `"mode"` is optional, and `"schema"` is the only value
An omitted key selects `"schema"`, and writing `"mode": "schema"` is what the
samples below do. Any other value — `"legacy"` included — is a compile error
naming the value.
:::

## Installation

```bash
npm install --save-dev swc-plugin-exodra
```

The published package ships a prebuilt `.wasm`. To build from source you need the
Rust toolchain and the `wasm32-wasip1` target:

```bash
rustup target add wasm32-wasip1
npm run build
```

## Usage

### .swcrc / @swc/core

```jsonc
{
  "jsc": {
    "parser": { "syntax": "typescript", "tsx": true },
    "experimental": {
      "plugins": [["swc-plugin-exodra", { "mode": "schema" }]]
    }
  }
}
```

### Next.js

```javascript
// next.config.js
module.exports = {
  experimental: {
    swcPlugins: [['swc-plugin-exodra', { mode: 'schema' }]],
  },
};
```

### Options

```jsonc
{
  "mode": "schema",                     // optional — the only value, and the default
  "schemaSource": "@exodra/core",       // where the schema factory is imported from
  "schemaImport": "createExoNamedSchema", // its exported name
  "markerName": "exoJsx"                // the marker call the plugin compiles away
}
```

An unreadable config is treated as an empty one **with a diagnostic**, rather than
in silence: the keys below `"mode"` decide what the emitted imports name, and a
config that was quietly dropped compiles to a module whose imports resolve to
nothing.

## What it emits

An `exoJsx(…)` call in; a module-level schema declaration out, built once for the
process, with every port created under the name written after `$.`. The machine
that fills the ports is written in TypeScript around it and is not touched.

```tsx no-check
import { exoJsx } from '@exodra/jsx';

const ROW_SCHEMA = exoJsx<TRowPorts>(($) => (
  <li class="row" data-id={$.id}>
    <span class="row__label">{$.label}</span>
    <button class="row__btn" onClick={$.toggle} />
  </li>
));
```

```javascript no-check
import { createExoNamedSchema } from '@exodra/core';

const _s0 = createExoNamedSchema((_b0) => {
  _b0.el('li', { class: 'row' }, (_b1) => {
    _b1.port('data-id', 'id');
    _b1.el('span', { class: 'row__label' }, (_b2) => { _b2.textPort('label'); });
    _b1.el('button', { class: 'row__btn' }, (_b2) => { _b2.eventPort('click', 'toggle'); });
  });
});

const ROW_SCHEMA = _s0;
```

There is no hoisting switch: every backend indexes its prepared plan by the
schema's ports, so a schema rebuilt per render is a different program, not a
slower one.

## Parity with the Babel plugin

`@exodra/babel-plugin-schema` is the specification, and this plugin compiles the
same dialect to the same output, up to SWC's own codegen formatting (arrow
spacing, quote style).

| written | schema call | filled by the machine with |
| --- | --- | --- |
| `class="row"`, `tabindex={0}`, `disabled` | folded into the markup | — |
| `data-id={$.id}` | `port("data-id", "id")` | `c.attr(P.id, value)` |
| `<span>{$.label}</span>` | `textPort("label")` | `c.text(P.label, value)` |
| `onClick={$.toggle}` | `eventPort("click", "toggle")` | `m.on(P.toggle, handler)` |
| `on:dblclick={$.edit}` | `eventPort("dblclick", "edit")` | `m.on(P.edit, handler)` |
| `ref={$.box}` | `refPort("box")` | — |
| `unsafeHtml={$.body}` | `childrenPort("body")` | `c.unsafeHtml(P.body, markup)` |
| `<$.rows />` | `childrenPort("rows")` | `c.one`, `c.list`, or `c.childList` + `reconcileExoOrder` |

Everything else is a compile error naming the spelling that would have worked —
there is no runtime under this JSX to defer a decision to. The full dialect,
including every refusal, is in the [JSX guide](../guides/jsx.md).

## Version compatibility

An SWC Wasm plugin is tied to the `swc_core` version it was built against, which
must be compatible with your `@swc/core` / Next.js version. A mismatch fails to
load with *"ensure the version of `swc_core` … is compatible with the host
runtime"*. Rebuild (or upgrade) the plugin against a matching `swc_core` when you
upgrade SWC.

If you would rather not manage that, use the [Babel pipeline](./babel-preset.md):
under Next.js, adding a `babel.config.js` with `presets: ['exodra']` opts the
project into Babel and disables the SWC transform.
