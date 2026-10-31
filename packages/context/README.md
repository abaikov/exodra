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
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoMachineNode } from '@exodra/core';
import { exoContextToken, nextExoId } from '@exodra/context';

export const THEME = exoContextToken<string>('theme');

const FIELD_SCHEMA = createExoSchema((b) => {
    let cls!: TExoAttrPort;
    let labelFor!: TExoAttrPort;
    let inputId!: TExoAttrPort;
    b.el('p', null, (p) => {
        cls = p.port('class');
        p.el('label', null, (label) => {
            labelFor = label.port('for');
        });
        p.el('input', null, (input) => {
            inputId = input.port('id');
        });
    });
    return { cls, labelFor, inputId };
});
const mField = createExoMachineBuilder<TExoMachineNode, unknown, string>(FIELD_SCHEMA);
mField.createInitialState((c) => nextExoId(c));
mField.wire((c) => {
    c.attr(FIELD_SCHEMA.ports.cls, 'field field--' + (c.inject(THEME) ?? 'light'));
    c.attr(FIELD_SCHEMA.ports.labelFor, c.state);
    c.attr(FIELD_SCHEMA.ports.inputId, c.state);
});
export const FIELD = mField.done();
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
