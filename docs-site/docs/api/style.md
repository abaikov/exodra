---
title: Style
---

# Style

`exoStyle` from `@exodra/core/style` turns a plain object into a valid CSS `style`
string, so you don't hand-write `"color:red;font-size:12px"`. It is pure and
dependency-free — the output is just a string, so it goes into a schema's static
attributes, into a `style` port a machine fills with `c.attr`, or anywhere else
a `style` attribute is accepted, and works identically in the DOM and in SSR.

It is a separate entry of `@exodra/core`, so neither a bundle nor the CDN build of
the core carries it unless something imports `@exodra/core/style`.

Exports from `@exodra/core/style`: `exoStyle`, and the `TExoStyleInput`, `TExoStyleObject`,
`TExoStyleScalar` types.

## `exoStyle(...args)`

```typescript signature
type TExoStyleScalar = string | number | null | undefined | false;
type TExoStyleObject = Record<string, TExoStyleScalar | readonly (string | number)[]>;
type TExoStyleInput = TExoStyleObject | string | null | undefined | false;

function exoStyle(...args: TExoStyleInput[]): string;
```

Each argument is either a style object, a raw CSS string (appended verbatim), or
a falsy value (skipped — handy for conditionals). The results are joined with
`;`; later arguments come after earlier ones, so they win in the browser.

```javascript
import { exoStyle } from '@exodra/core/style';

exoStyle({ color: 'red', fontSize: 12, '--gap': 8 });
// "color:red;font-size:12px;--gap:8"
```

### Normalization rules

| Input                                 | Output                       | Rule                                                                                             |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `backgroundColor: 'red'`              | `background-color:red`       | camelCase → kebab-case                                                                           |
| `fontSize: 12`                        | `font-size:12px`             | numbers get `px`…                                                                                |
| `margin: 0`                           | `margin:0`                   | …except `0`                                                                                      |
| `opacity: 0.5`, `zIndex: 10`          | `opacity:0.5;z-index:10`     | …and unitless props (`opacity`, `zIndex`, `lineHeight`, `fontWeight`, `flexGrow`, grid spans, …) |
| `'--gap': 8`                          | `--gap:8`                    | custom properties pass through untouched (no kebab, no `px`)                                     |
| `padding: [4, 8]`                     | `padding:4px 8px`            | arrays expand with per-item formatting                                                           |
| `color: null` / `undefined` / `false` | _(omitted)_                  | falsy values are dropped                                                                         |
| `WebkitTransform: 'scale(2)'`         | `-webkit-transform:scale(2)` | explicit vendor prefixes serialize correctly (`msFlexAlign` → `-ms-flex-align`)                  |

There is **no autoprefixing** — `exoStyle` serializes what you write, it
doesn't invent prefixes. Modern targets rarely need them; when you do need one,
write it explicitly (`WebkitBackdropFilter`, `msFlexAlign`, …) and it is emitted
verbatim.

### Conditionals and merging

Falsy arguments and falsy values are skipped, so conditional styles read
cleanly:

```javascript
exoStyle(
  base,                          // an object of shared declarations
  isActive && { color: 'blue' }, // dropped entirely when isActive is false
  { opacity: hidden ? 0 : 1 }
);
```

## Usage

A style that never changes is a **static attribute** on the schema, so call
`exoStyle()` once at module load and let the compiled markup carry the result:

```ts
import { createExoStatic } from '@exodra/core';
import { exoStyle } from '@exodra/core/style';

export const Toolbar = createExoStatic((b) => {
    b.el('div', { style: exoStyle({ display: 'flex', gap: 8 }) }, (div) => {
        div.text('—');
    });
});
```

A style that changes is a **port**. The machine builds the string from state
and writes it — the value that reaches the DOM is still a plain string, so
nothing about the renderer knows the style was an object:

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import { exoStyle } from '@exodra/core/style';
import type { TExoMachineNode, TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const CardPorts = exoPorts({ boxStyle: EXO_PORT_ATTR, toggle: EXO_PORT_EVENT });

const cardSchema = createExoSchema(CardPorts, (b) => {
    b.el('div', null, (div) => {
        div.attrPort(CardPorts.boxStyle, 'style');
        div.eventPort(CardPorts.toggle, 'click');
    });
});
const cardBaseMachine = createExoMachine(cardSchema, {
    createInitialState: (_c: TExoMachineNode) => ({ active: false }),
});
const show = (c: TExoMachineNodeOf<typeof cardBaseMachine>): void => {
    c.attr(
        CardPorts.boxStyle,
        exoStyle({ padding: 16, borderRadius: 8, background: c.state.active ? '#eef' : '#fff' })
    );
};
const cardMachine = composeExoMachine(
    cardBaseMachine,
    (m) => withExoWire(m, (c) => show(c)),
    (m) =>
        withExoHandlers(m, (on) => {
            on(CardPorts.toggle, (c) => {
                c.state.active = !c.state.active;
                show(c);
            });
        })
);

backend.render(cardMachine, document.body);
```

In the [JSX dialect](../guides/jsx.md) a string literal (`style="padding:16px"`)
is markup baked into the schema, and `style={$.css}` declares an attribute port
that the machine fills with `c.attr` — a constant from `exoStyle()` declared at
module scope, or a string the machine builds from state, like the one above.

There is **no compile-time folding of style objects.** The one compiler,
`@exodra/babel-plugin-schema`, has no style pass; calling `exoStyle()` at module
scope does that work once per process, exactly where a constant belongs.

## Links

-   source: [exodra/packages/core/src/style](https://github.com/abaikov/exodra/tree/master/packages/core/src/style)
