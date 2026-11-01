# swc-plugin-exodra

A Rust/Wasm SWC plugin that compiles Exodra JSX, for the toolchains that cannot run
a Babel plugin (Next.js's default compiler, `@swc/jest`, `swc-loader`).

It mirrors [`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema): the same
dialect, `exoJsx<TPorts>(($) => <markup/>)` from `@exodra/jsx`, compiled to a
module-level `createExoNamedSchema()` declaration. The output imports nothing but
`@exodra/core`.

`"schema"` is the only dialect, and an omitted `"mode"` selects it. Any other value —
`"legacy"` included — is a compile error.

## What it emits

A schema declaration in, a module-level schema out, built ONCE for the process, with
every port created under the name written after `$.`. The machine that fills the ports
is written in TypeScript around the declaration and is not touched.

```tsx no-check
import { exoJsx } from '@exodra/jsx';

const rowSchema = exoJsx<TRowPorts>(($) => (
    <li class="row" data-id={$.id}>
        <span class="row__label">{$.label}</span>
        <button class="row__btn" onClick={$.toggle} />
    </li>
));
```

```js no-check
import { createExoNamedSchema } from "@exodra/core";
const _s0 = createExoNamedSchema(_b0 => {
    _b0.el("li", { class: "row" }, _b1 => {
        _b1.port("data-id", "id");
        _b1.el("span", { class: "row__label" }, _b2 => { _b2.textPort("label"); });
        _b1.el("button", { class: "row__btn" }, _b2 => { _b2.eventPort("click", "toggle"); });
    });
});
const rowSchema = _s0;
```

HOISTING IS NOT AN OPTIMISATION HERE, so there is no switch for it: every backend
indexes its prepared plan by the schema's ports, so a declaration rebuilt per render is
a different program, not a slower one.

### The dialect

In the last column `RowPorts` is `rowSchema.ports` and `rowBuilder` is the machine builder over `rowSchema`.

| written | schema call | filled by the machine with |
|---|---|---|
| `class="row"`, `tabindex={0}`, `disabled` | folded into the markup | — |
| `data-id={$.id}` | `port("data-id", "id")` | `c.attr(RowPorts.id, value)` |
| `<span>{$.label}</span>` | `textPort("label")` | `c.text(RowPorts.label, value)` |
| `onClick={$.toggle}` | `eventPort("click", "toggle")` | `rowBuilder.on(RowPorts.toggle, handler)` |
| `on:dblclick={$.edit}` | `eventPort("dblclick", "edit")` | `rowBuilder.on(RowPorts.edit, handler)` |
| `ref={$.box}` | `refPort("box")` | — |
| `unsafeHtml={$.body}` | `childrenPort("body")` | `c.unsafeHtml(RowPorts.body, markup)` |
| `<$.rows />` | `childrenPort("rows")` | `c.one`, `c.list`, or `c.childList` + `reconcileExoOrder` |

Any other expression (a closure, `item.id`, a conditional), a component tag (`<Row />`),
a fragment, a spread, a lowercase inline handler (`onclick="…"`), a namespace other than
`on:`, a text port beside other children, `unsafeHtml` beside children and a port name
used twice are each a compile error with a sentence naming the spelling that would have
worked — there is no runtime under this JSX to defer a decision to.

### Options

```jsonc
{
  "mode": "schema",                        // the default and the only value
  "schemaSource": "@exodra/core",          // where the schema factory is imported from
  "schemaImport": "createExoNamedSchema",  // its exported name
  "markerName": "exoJsx"                   // the marker call this plugin compiles away
}
```

Every key is optional, so `[["swc-plugin-exodra", {}]]` is the schema compiler with its
defaults.

### Parity with the Babel plugin

The emitted code is identical to the Babel plugin's up to SWC's own codegen formatting
(arrow spacing, quote style). `tests/parity.test.ts` hands one source to both compilers
and compares the two answers: every refusal must be a refusal on both sides and name the
same reason, and every accepted source must produce the same program once arrow
parentheses and whitespace are normalised away.

## Building

The `.wasm` is a build artifact and is not checked in. It needs the Rust toolchain and
the `wasm32-wasip1` target:

```bash
rustup target add wasm32-wasip1
npm run build   # cargo build --release --target wasm32-wasip1 → swc_plugin_exodra.wasm
npm test        # runs the real @swc/core against the wasm just built
```

`npm test` fails if the `.wasm` is missing or older than `src/` — every assertion
would otherwise be testing a previous build.

The published package ships the prebuilt `swc_plugin_exodra.wasm`.

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

> Match the plugin's `swc_core` version to your `@swc/core` / Next.js version — a
> mismatch fails to load with "ensure the version of `swc_core` … is compatible".
> Rebuild the plugin against the matching `swc_core` if you upgrade.
