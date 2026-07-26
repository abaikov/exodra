---
title: SWC Plugin
---

# SWC Plugin

`swc-plugin-exodra` is a native Rust/Wasm SWC plugin that compiles Exodra JSX for
SWC-based toolchains — Next.js's default compiler, `@swc/jest`, `swc-loader` —
which cannot run Babel plugins. It is a port of the [Babel plugin](./babel-plugin.md).

## Parity

Full parity with the Babel plugin, verified by compiling the same inputs through
both and comparing output:

- intrinsic + component elements → `h("tag" | Comp, { ...buckets })`
- the five typed buckets and `props={...}` spreads
- children → `static.children` (text → `text("…")`)
- `bind:value` / `bind:checked` → `mergeAttrs(base, bindText|bindNumber|bindChecked|bindSelect(…))`
- `cacheKey` / `cache:key` → the 3rd arg of `h()`
- fragments: static → array; `<>{items}</>` → `h(Fragment, { bindableLists })`
- compile-time static hoisting (a shared `Symbol()` cacheKey for static elements
  inside a loop / `.map()`)
- shadow-safe auto-imports (a local `text` / `h` falls back to a `_text` uid)
- strict flat-attribute errors, with a code frame

Emitted code is identical up to SWC's own codegen formatting (arrow spacing,
quote style).

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

## Version compatibility

An SWC Wasm plugin is tied to the `swc_core` version it was built against, which
must be compatible with your `@swc/core` / Next.js version. A mismatch fails to
load with *"ensure the version of `swc_core` … is compatible with the host
runtime"*. Rebuild (or upgrade) the plugin against a matching `swc_core` when you
upgrade SWC.

If you would rather not manage that, use the [Babel pipeline](./babel-preset.md):
under Next.js, adding a `babel.config.js` with `presets: ['exodra']` opts the
project into Babel and disables the SWC transform.
