# @exodra/context

The context chain under every Exodra backend. A context is an immutable chain of
frames: each `provide` adds one frame on top, and a read walks outward to the
nearest frame for a token. Tokens compare by identity, so two packages cannot
collide on a name.

Inside a machine you use the exonode's own `c.provide(token, value)` and
`c.inject(token)`; this package supplies the tokens, the chain primitives a backend
builds on, and render-scoped ids that survive hydration.

Full documentation: [exodra.org/docs/api/core#contexts](https://exodra.org/docs/api/core#contexts)

## Installation

```bash
npm install @exodra/context
```

## Example

```ts
import { EXO_PORT_ATTR, createExoMachine, createExoSchema, exoPorts, withExoWire } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { exoContextToken, nextExoId } from '@exodra/context';

export const THEME = exoContextToken<string>('theme');

const FieldPorts = exoPorts({ cls: EXO_PORT_ATTR, labelFor: EXO_PORT_ATTR, inputId: EXO_PORT_ATTR });

const fieldSchema = createExoSchema(FieldPorts, (b) => {
    b.el('p', null, (p) => {
        p.attrPort(FieldPorts.cls, 'class');
        p.el('label', null, (label) => {
            label.attrPort(FieldPorts.labelFor, 'for');
        });
        p.el('input', null, (input) => {
            input.attrPort(FieldPorts.inputId, 'id');
        });
    });
});
const fieldBase = createExoMachine(fieldSchema, {
    createInitialState: (c: TExoMachineNode) => nextExoId(c),
});
export const Field = withExoWire(fieldBase, (c) => {
    c.attr(FieldPorts.cls, 'field field--' + (c.inject(THEME) ?? 'light'));
    c.attr(FieldPorts.labelFor, c.state);
    c.attr(FieldPorts.inputId, c.state);
});
```

The root provides both, in its `createInitialState`, on the server and in the
browser:

```ts no-check
provideExoIds(c, 'app');
c.provide(THEME, 'dark');
```

`c.inject` returns `undefined` when nothing above provided the token. A provided
value is not reactive: provide a store and subscribe to it from an effect when it
changes.

## API

- `exoContextToken<TValue>(name?): TExoContextToken<TValue>` — a new token; the name is for debugging only
- `exoContextFrame(outer, token, value): TExoContextFrame` — a new frame on top of `outer` (or `null`)
- `readExoContext(frame, token): TValue | undefined` — the nearest value for `token`
- `provideExoIds(c, prefix): TExoIdCounter` — start an id counter for this render under `EXO_ID_COUNTER`
- `nextExoId(c): string` — the next id, `` `${prefix}-${n}` `` with `n` in base 36; throws `EXO0104` when no counter was provided
- `EXO_ID_COUNTER` — the token the counter is provided under
- types `TExoContextToken<TValue>`, `TExoContextFrame` (`{ key, value, outer }`), `TExoIdCounter` (`{ prefix, next }`)

Ids follow call order, which is the same on the server and in a synchronous
hydration pass. Call `provideExoIds` per render (never at module level), and give
two roots on one page two prefixes.

## License

MIT
