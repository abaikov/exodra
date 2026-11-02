# @exodra/babel-plugin-schema

Compiles a JSX **schema declaration** into the module-level schema the Exodra core
runs. `exoJsx<TPorts>(($) => <markup/>)` from `@exodra/jsx` declares markup and
named ports, and nothing else; the machine that fills the ports is written in
TypeScript around it.

```tsx
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoWire } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const rowSchema = exoJsx<{ id: TExoAttrPort; label: TExoTextPort; toggle: TExoEventPort }>(
    ($) => (
        <li class="row" data-id={$.id}>
            <span class="row__label">{$.label}</span>
            <button class="row__btn" onClick={$.toggle} />
        </li>
    )
);
const RowPorts = rowSchema.ports;

type TRow = { id: string; label: string; done: boolean };

const rowBase = createExoMachine<TExoMachineNode, TRow>(rowSchema);
export const Row = composeExoMachine(
    rowBase,
    (m) =>
        withExoWire(m, (c, row) => {
            c.attr(RowPorts.id, row.id);
            c.text(RowPorts.label, row.label);
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(RowPorts.toggle, () => console.log('toggled'));
        })
);
```

The `exoJsx(…)` call becomes:

```js no-check
import { createExoNamedSchema } from '@exodra/core';

const _s0 = createExoNamedSchema((_b0) => {
    _b0.el('li', { class: 'row' }, (_b1) => {
        _b1.port('data-id', 'id');
        _b1.el('span', { class: 'row__label' }, (_b2) => { _b2.textPort('label'); });
        _b1.el('button', { class: 'row__btn' }, (_b2) => { _b2.eventPort('click', 'toggle'); });
    });
});

const rowSchema = _s0;
```

Every port is created under the name written after `$.`, so `rowSchema.ports.label` is
the text port. The declaration is hoisted to module scope wherever it was written, so it
costs **one** schema for the process. Hoisting is not a switch: every backend indexes its
prepared plan by the schema's ports, so a declaration rebuilt per render would be a
different program, not a slower one. The compiled module imports nothing but
`@exodra/core`.

## Install

```bash
npm i -D @exodra/babel-plugin-schema
npm i @exodra/jsx
```

`@babel/core` is a peer dependency. The plugin needs JSX parsing with namespaced
attribute names (`on:click`) left alone:

```js
// babel.config.js
module.exports = {
    plugins: [
        ['@babel/plugin-syntax-jsx', { throwIfNamespace: false }],
        '@exodra/babel-plugin-schema',
    ],
};
```

Or through the preset, which wires the same thing (plus TypeScript) in one line:

```js
// babel.config.js
module.exports = { presets: ['exodra'] };
```

The bundler plugins (`vite-plugin-exodra`, `rollup-plugin-exodra`,
`esbuild-plugin-exodra`, `bun-plugin-exodra`) run the same preset.

For TypeScript, point JSX at the dialect's types:

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "@exodra/jsx/schema"
    }
}
```

## Options

| option | default | what it is |
| --- | --- | --- |
| `schemaSource` | `'@exodra/core'` | where the schema factory is imported from |
| `schemaImport` | `'createExoNamedSchema'` | the exported name of the schema factory |
| `markerName` | `'exoJsx'` | the marker call this plugin compiles away |

## The dialect

| written | schema call | filled by the machine with |
| --- | --- | --- |
| `class="row"`, `tabindex={0}`, `disabled` | folded into `el(tag, attrs)` | — |
| plain text | `text('…')` | — |
| `data-id={$.id}` | `port('data-id', 'id')` | `c.attr(RowPorts.id, value)` |
| `<span>{$.label}</span>` | `textPort('label')` | `c.text(RowPorts.label, value)` |
| `onClick={$.toggle}` | `eventPort('click', 'toggle')` | `on(RowPorts.toggle, handler)` in `withExoHandlers` |
| `on:dblclick={$.edit}` | `eventPort('dblclick', 'edit')` | `on(RowPorts.edit, handler)` in `withExoHandlers` |
| `ref={$.box}` | `refPort('box')` | — |
| `unsafeHtml={$.body}` | `childrenPort('body')` | `c.unsafeHtml(RowPorts.body, markup)` |
| `<$.rows />` | `childrenPort('rows')` | `c.one`, `c.list`, or `c.childList` + `reconcileExoOrder` |

- **A text port is its element's only child.** Varying text beside static text gets an
  element of its own: `<p>Hi <b>{$.name}</b>!</p>`.
- **`onClick` lowers the tail** (`onDblClick` → `dblclick`); `on:name` keeps the event
  name exactly as written.
- **`unsafeHtml` escapes nothing and sanitises nothing.** It stands for everything inside
  its element, so that element takes no children.
- **`<$.name />` is a children port**, and may stand between static siblings. It takes no
  attributes and no children: what stands there is built by the machine.

### What is refused

Each is a compile error naming the element and the fix:

- any expression other than `$.name` — closures, values (`item.id`), conditionals;
- component tags (`<Row />`, `<Ui.Row />`), and with them any `list=` / `props=` operand;
- fragments, `{...spread}`, a lowercase inline handler (`onclick="…"`), a namespace other
  than `on:`;
- a text port beside other children, `unsafeHtml` with children, attributes or children on
  `<$.name />`;
- the same port name twice;
- JSX outside `exoJsx(…)`, and a declaration that does anything but return one element —
  statements before the `return`, more than one parameter, a destructured parameter, or a
  function declared elsewhere.

## The marker

`exoJsx` is a real export of `@exodra/jsx`, so TSX authors have a symbol to import and a
type to hover. The plugin removes it; JSX that reaches the runtime uncompiled throws,
naming the missing plugin — a build that forgot it would otherwise render nothing and say
nothing.

## Related

- `@exodra/core` — `createExoNamedSchema`, the port types, `createExoMachine` and its `withExo*` decorators.
- `@exodra/jsx` — `exoJsx` and the TypeScript types for this dialect
  (`jsxImportSource: "@exodra/jsx/schema"`).
- `@exodra/list-reconcile` — `reconcileExoOrder`, for a children port whose list changes.
- `swc-plugin-exodra` — the same dialect in Rust.
