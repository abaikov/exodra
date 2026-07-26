# swc-plugin-exodra

A Rust/Wasm SWC plugin that compiles Exodra JSX into `h()` / `text()` calls — a
port of [`@exodra/babel-plugin-jsx`](../babel-plugin-jsx) for SWC-based toolchains
(Next.js's default compiler, `@swc/jest`, `swc-loader`) which cannot run Babel
plugins.

## Status

Full parity with [`@exodra/babel-plugin-jsx`](../babel-plugin-jsx), verified by
compiling the same inputs through both and comparing output:

- intrinsic + component elements → `h("tag" | Comp, { ...buckets })`
- the five typed buckets — `static` / `bindable`(s) / `bindableList`(s) /
  `handlers` / `bindableHandlers` — and `props={...}` spreads
- children (nested elements, text → `text("…")`, `{expr}`) into `static.children`
- `bind:value` / `bind:checked` → `mergeAttrs(base, bindText|bindNumber|bindChecked|bindSelect(…))`
- `cacheKey` / `cache:key` → the 3rd arg of `h()`
- fragments: static `<>…</>` → array; `<>{items}</>` → `h(Fragment, { bindableLists })`
- compile-time static hoisting: a fully-static element inside a loop / `.map()`
  gets a shared `Symbol()` cacheKey
- shadow-safe auto-imports: a local `text`/`h`/… falls back to a `_text` uid
- STRICT: a flat attribute (`class`, `onClick`, …) is a hard compile error with a
  code frame

> The emitted code is identical to the Babel plugin's up to SWC's own codegen
> formatting (arrow spacing, quote style).

## Building

Requires the Rust toolchain and the `wasm32-wasip1` target:

```bash
rustup target add wasm32-wasip1
npm run build   # cargo build --release --target wasm32-wasip1 → swc_plugin_exodra.wasm
```

The published package ships the prebuilt `swc_plugin_exodra.wasm`.

## Usage

### .swcrc / @swc/core

```jsonc
{
  "jsc": {
    "parser": { "syntax": "typescript", "tsx": true },
    "experimental": {
      "plugins": [["swc-plugin-exodra", {}]]
    }
  }
}
```

### Next.js

```javascript
// next.config.js
module.exports = {
  experimental: {
    swcPlugins: [['swc-plugin-exodra', {}]],
  },
};
```

> Match the plugin's `swc_core` version to your `@swc/core` / Next.js version — a
> mismatch fails to load with "ensure the version of `swc_core` … is compatible".
> Rebuild the plugin against the matching `swc_core` if you upgrade.
