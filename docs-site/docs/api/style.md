---
title: Style
---

# Style

`@exodra/style` turns a plain object into a valid CSS `style` string, so you
don't hand-write `"color:red;font-size:12px"`. It is pure and dependency-free —
the output is just a string, so it goes straight into `static.style`,
`bindable.style` (a derived string), or anywhere a `style` attribute is
accepted, and works identically in the DOM and in SSR.

```bash
npm install @exodra/style
```

Exports: `style`, and the `StyleArg`, `StyleObject`, `StyleScalar` types.

## `style(...args)`

```typescript
type StyleScalar = string | number | null | undefined | false;
type StyleObject = Record<string, StyleScalar | readonly (string | number)[]>;
type StyleArg = StyleObject | string | null | undefined | false;

function style(...args: StyleArg[]): string;
```

Each argument is either a style object, a raw CSS string (appended verbatim), or
a falsy value (skipped — handy for conditionals). The results are joined with
`;`; later arguments come after earlier ones, so they win in the browser.

```javascript
import { style } from '@exodra/style';

style({ color: 'red', fontSize: 12, '--gap': 8 });
// "color:red;font-size:12px;--gap:8"
```

### Normalization rules

| Input | Output | Rule |
| --- | --- | --- |
| `backgroundColor: 'red'` | `background-color:red` | camelCase → kebab-case |
| `fontSize: 12` | `font-size:12px` | numbers get `px`… |
| `margin: 0` | `margin:0` | …except `0` |
| `opacity: 0.5`, `zIndex: 10` | `opacity:0.5;z-index:10` | …and unitless props (`opacity`, `zIndex`, `lineHeight`, `fontWeight`, `flexGrow`, grid spans, …) |
| `'--gap': 8` | `--gap:8` | custom properties pass through untouched (no kebab, no `px`) |
| `padding: [4, 8]` | `padding:4px 8px` | arrays expand with per-item formatting |
| `color: null` / `undefined` / `false` | *(omitted)* | falsy values are dropped |
| `WebkitTransform: 'scale(2)'` | `-webkit-transform:scale(2)` | explicit vendor prefixes serialize correctly (`msFlexAlign` → `-ms-flex-align`) |

There is **no autoprefixing** — `@exodra/style` serializes what you write, it
doesn't invent prefixes. Modern targets rarely need them; when you do need one,
write it explicitly (`WebkitBackdropFilter`, `msFlexAlign`, …) and it is emitted
verbatim.

### Conditionals and merging

Falsy arguments and falsy values are skipped, so conditional styles read
cleanly:

```javascript
style(
  base,                          // an object of shared declarations
  isActive && { color: 'blue' }, // dropped entirely when isActive is false
  { opacity: hidden ? 0 : 1 }
);
```

## Usage

The output is a string, so it drops into any bucket that takes a `style`
attribute.

```jsx
import { style } from '@exodra/style';
import { bindable, derive } from '@exodra/reactivity';

function Card() {
  const active = bindable(false);
  // A derived string is reactive — the DOM `style` updates when `active` changes.
  const css = derive(active, on =>
    style({ padding: 16, borderRadius: 8, background: on ? '#eef' : '#fff' })
  );

  return <div bindable={{ style: css }}>…</div>;
}
```

For a value that never changes, put it in `static`:

```jsx
<div static={{ style: style({ display: 'flex', gap: 8 }) }} />
```

## Compile-time folding (with the babel plugin)

`@exodra/babel-plugin-jsx` optimizes `static.style` **objects** for you — this is
the Exodra path, and the reason `style` objects are first-class in JSX even
though the runtime helper works with a plain string.

When every value in a `static.style` object is a static literal, the compiler
folds it to a CSS string **at build time** — zero runtime, and the string is
then hoistable/clone-cacheable like any other static attribute:

```jsx
// You write:
<div static={{ style: { color: 'red', fontSize: 12 } }} />

// The plugin emits (no @exodra/style import, no runtime work):
h('div', { static: { style: 'color:red;font-size:12px' } });
```

When any value is dynamic, the compiler wraps the object in a runtime `style(...)`
call and injects `import { style } from '@exodra/style'` automatically — so the
exact same normalization happens, and you never write the import yourself:

```jsx
// You write:
<div static={{ style: { color: theme.fg, fontSize: 12 } }} />

// The plugin emits:
import { style } from '@exodra/style';
h('div', { static: { style: style({ color: theme.fg, fontSize: 12 }) } });
```

The folded string is guaranteed identical to what `style()` produces at runtime
(a parity test in the plugin pins the two normalizers together). Because a
static object costs nothing at runtime, prefer writing `static.style` as an
object and let the compiler decide.

## Links

- npm: [`@exodra/style`](https://www.npmjs.com/package/@exodra/style)
- GitHub: [exodra/packages/style](https://github.com/abaikov/exodra/tree/master/packages/style)
