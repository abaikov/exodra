# @exodra/style

Build CSS style strings from objects, so you don't hand-write the `style` prop.
Pure and **zero-dependency** — the output is a plain string that drops straight
into Exodra's `static.style` / `bindable.style` (works in the DOM and in SSR).

```bash
npm install @exodra/style
```

## Usage

```ts
import { style } from '@exodra/style';

h('div', { static: { style: style({ color: 'red', fontSize: 12, '--gap': 8 }) } });
// style="color:red;font-size:12px;--gap:8"
```

### Rules

- **camelCase → kebab-case:** `backgroundColor` → `background-color`.
- **numbers get `px`** — except `0` and unitless properties (`opacity`, `zIndex`,
  `lineHeight`, `fontWeight`, `flex`, `order`, …) and `--custom` properties.
- **arrays expand:** `padding: [4, 8]` → `padding:4px 8px`.
- **falsy values are skipped:** `null` / `undefined` / `false` → dropped (great
  for conditionals). A falsy *argument* is skipped too.
- **raw strings** are appended verbatim; later arguments win in the browser.

```ts
// conditional + merge
style(base, isActive && { color: 'blue' }, { opacity: hidden ? 0 : 1 });

// reactive styles — just call it inside a derive
bindable({ style: derive(theme, (t) => style({ color: t.fg, padding: [4, 8] })) });
```

## Why a string?

Exodra's `style` prop is a plain string in the schema — the same value works
whether the tree is rendered to the DOM or to HTML on the server. `style()` is
just the ergonomic front-end; there's no runtime coupling to a renderer.

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
