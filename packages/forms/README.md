# @exodra/forms

Form controls for Exodra without a bound model. Five functions and two types:

| Export | What it does |
| --- | --- |
| `readExoControlValue(target)` | Reads any form control — usually `event.target` — as the value its type means. |
| `readExoControlValues(c, refPorts)` | Reads the live controls behind ref ports, at the moment you ask: on submit, on validate. |
| `writeExoChoice(c, markPorts, values, chosen)` | Puts the `checked` mark of a radio group, or the `selected` mark of a `<select>`'s options, on the member whose value is `chosen` — one write. |
| `checkExoControlValues(values, rules)` | Runs one rule per value and answers its error or `null`. Touches no document, so the same rules run on an API server. |
| `setExoControlErrors(c, refPorts, errors)` | Hands each error to its control's `setCustomValidity` (`null` clears it), so `:invalid`, `:user-invalid` and `checkValidity()` see what the machine decided. |
| `TExoControlValue` | `string \| number \| boolean \| readonly string[] \| FileList` — what a control reads as. |
| `TExoControlRule` | `(value, values) => string \| null` — one field's rule; `values` lets it compare fields. |

The package imports nothing at runtime. There is no binding, no source, no subscription and
no listener inside it: the field holds its own value, the machine listens where it chooses,
and a transition writes only what depends on that value.

## Installation

```bash
npm install @exodra/forms @exodra/core
```

## A form, end to end

One event port on a **container**, one handler that reads the control the event came from,
and transitions that write what depends on the value.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';

const SIGNUP_SCHEMA = createExoSchema((b) => {
    let input!: TExoEventPort;
    let greeting!: TExoTextPort;
    let error!: TExoTextPort;
    let send!: TExoAttrPort;
    b.el('div', { class: 'signup' }, (d) => {
        input = d.eventPort('input');
        d.el('input', { type: 'text', name: 'name' });
        d.el('input', { type: 'number', name: 'age' });
        d.el('p', null, (p) => {
            greeting = p.textPort();
        });
        d.el('p', { class: 'error' }, (p) => {
            error = p.textPort();
        });
        d.el('button', { type: 'button' }, (button) => {
            send = button.port('disabled');
            button.text('Send');
        });
    });
    return { input, greeting, error, send };
});

type TSignup = { name: string; age: number };

const mSignup = createExoMachineBuilder<TExoDomNode, unknown, TSignup>(SIGNUP_SCHEMA);
mSignup.createInitialState(() => ({ name: '', age: Number.NaN }));
mSignup.wire((c) => {
    c.attr(SIGNUP_SCHEMA.ports.send, true);
});
const takeName = mSignup.transition<string>((c, name) => {
    c.state.name = name;
    c.text(SIGNUP_SCHEMA.ports.greeting, name === '' ? '' : `Hello, ${name}`);
    c.attr(SIGNUP_SCHEMA.ports.send, name === '' || Number.isNaN(c.state.age));
});
const takeAge = mSignup.transition<number>((c, age) => {
    c.state.age = age;
    c.text(SIGNUP_SCHEMA.ports.error, Number.isNaN(age) ? 'Age has to be a number' : '');
    c.attr(SIGNUP_SCHEMA.ports.send, c.state.name === '' || Number.isNaN(age));
});
mSignup.on(SIGNUP_SCHEMA.ports.input, (c, event) => {
    const field = event.target as HTMLInputElement;
    if (field.name === 'name') takeName(c, readExoControlValue(field) as string);
    else if (field.name === 'age') takeAge(c, readExoControlValue(field) as number);
});

const backend = withExoCompiler(new ExoDomBackend());
backend.render(mSignup.done(), document.getElementById('root') as HTMLElement);
```

What this shape decides:

- **One listener, not one per field.** `input` and `change` bubble, so a port on any element
  that contains the fields hears every one of them — a `<form>`, a `<fieldset>`, a panel
  `<div>`. Fields do not need a `<form>` around them, and a single field can carry its own
  event port when it is the only one.
- **The field's own `value` is never written back.** The browser already holds what the
  person typed; writing it again on every keystroke is a DOM write that changes nothing.
  A transition writes only what *depends* on the value: a read-out, an error text, a
  `disabled` flag.
- **The value lives in `c.state`** when something else needs it later — the third type
  argument of `createExoMachineBuilder` is its type, and `createInitialState` returns the
  starting value. When nothing needs it later, keep no state at all.
- **A transition with an argument names its type**: `transition<string>((c, name) => …)`.
  Writing `(c, name: string) => …` without the explicit type argument leaves `c` implicitly
  `any`.

### Which field fired

Two ways to tell, and both cost nothing per field:

- **By `name`**, as above: a static attribute in the schema, compared in the handler.
- **By identity**, against the elements behind ref ports. `c.portNodeReader()` reads a ref
  port's element out of the instance's port table; read it once, in `createInitialState`, and
  keep it in the state:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoRefPort, TExoTextPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';

const LOGIN_SCHEMA = createExoSchema((b) => {
    let input!: TExoEventPort;
    let email!: TExoRefPort;
    let hint!: TExoTextPort;
    b.el('fieldset', null, (f) => {
        input = f.eventPort('input');
        f.el('input', { type: 'email' }, (i) => {
            email = i.refPort();
        });
        f.el('input', { type: 'password' });
        f.el('small', null, (s) => {
            hint = s.textPort();
        });
    });
    return { input, email, hint };
});

const mLogin = createExoMachineBuilder<TExoDomNode, unknown, { email: Element }>(LOGIN_SCHEMA);
mLogin.createInitialState((c) => ({
    email: c.portNodeReader()(c.portTable(), LOGIN_SCHEMA.ports.email),
}));
const showHint = mLogin.transition<string>((c, email) => {
    c.text(LOGIN_SCHEMA.ports.hint, email.includes('@') ? '' : 'An address has an @ in it');
});
mLogin.on(LOGIN_SCHEMA.ports.input, (c, event) => {
    if (event.target === c.state.email) {
        showHint(c, readExoControlValue(event.target) as string);
    }
});
export const LOGIN = mLogin.done();
```

### Validate when a field is left

`focus` and `blur` do not bubble, so a container port named `blur` hears nothing from the
fields inside it. `focusout` is the same moment and does bubble:

```ts no-check
b.el('form', null, (f) => {
    leave = f.eventPort('focusout');
    // …the fields
});

m.on(P.leave, (c, event) => {
    const field = event.target as HTMLInputElement;
    if (field.name === 'email') checkEmail(c, readExoControlValue(field) as string);
});
```

### Setting a field from code

The one time a field's `value` is written is when the application, not the person, decides
it: a "clear" button, a loaded record, a suggestion picked from a list. That is its own
transition, writing a `value` port:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

const SEARCH_SCHEMA = createExoSchema((b) => {
    let value!: TExoAttrPort;
    let clear!: TExoEventPort;
    b.el('div', { class: 'search' }, (d) => {
        d.el('input', { type: 'search' }, (i) => {
            value = i.port('value');
        });
        d.el('button', { type: 'button' }, (button) => {
            clear = button.eventPort('click');
            button.text('Clear');
        });
    });
    return { value, clear };
});

const mSearch = createExoMachineBuilder<TExoDomNode>(SEARCH_SCHEMA);
const clearQuery = mSearch.transition((c) => {
    c.attr(SEARCH_SCHEMA.ports.value, '');
});
mSearch.on(SEARCH_SCHEMA.ports.clear, (c) => clearQuery(c));
export const SEARCH = mSearch.done();
```

`value`, `checked` and `selected` ports are written as DOM **properties**, decided when the
schema is compiled. Once the person has typed, the attribute does not say what is on
screen, so an attribute write would move nothing; the property write is what clears the
field.

## Values on submit only

A form that needs its values once, when it is sent, registers nothing per field. Put a ref
port on each control and read them all in the submit handler:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoRefPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValues } from '@exodra/forms';

const CONTACT_SCHEMA = createExoSchema((b) => {
    let submit!: TExoEventPort;
    let name!: TExoRefPort;
    let age!: TExoRefPort;
    let subscribe!: TExoRefPort;
    b.el('form', null, (f) => {
        submit = f.eventPort('submit');
        f.el('input', { type: 'text' }, (i) => {
            name = i.refPort();
        });
        f.el('input', { type: 'number' }, (i) => {
            age = i.refPort();
        });
        f.el('input', { type: 'checkbox' }, (i) => {
            subscribe = i.refPort();
        });
        f.el('button', { type: 'submit' }, (button) => button.text('Send'));
    });
    return { submit, name, age, subscribe };
});
const CONTACT_FIELDS = [
    CONTACT_SCHEMA.ports.name,
    CONTACT_SCHEMA.ports.age,
    CONTACT_SCHEMA.ports.subscribe,
];

const mContact = createExoMachineBuilder<TExoDomNode>(CONTACT_SCHEMA);
mContact.on(CONTACT_SCHEMA.ports.submit, (c, event) => {
    event.preventDefault();
    const [name, age, subscribe] = readExoControlValues(c, CONTACT_FIELDS);
    console.log({ name, age, subscribe });
});
export const CONTACT = mContact.done();
```

The values come back in the order of the ports. A radio reads as its `value` only while it
is checked, so ref ports on a whole radio group come back as, for example,
`[undefined, 'm', undefined]`. `readExoControlValues` reads the controls
that are on the page **now**, so on a served page what a person typed before the bundle
arrived is what comes back — no event announced those keystrokes, and none had to.

## Radio groups and selects: `writeExoChoice`

A choice is a mark on one member of a group: `checked` on one radio, `selected` on one
`<option>`. Each member gets an attribute port for its mark, and
`writeExoChoice(c, ports, values, chosen)` finds `chosen` in `values` and writes `true` to
that one port. The browser clears the rest of a same-`name` radio group, or of a single
`<select>`, by itself — so nothing remembers which member held the mark before, and a mark
the person moved by hand is simply overridden. A `chosen` that is not in `values` writes
`false` to every port.

It is used in two places:

- **In `createInitialState`, for the starting mark.** The server prints `checked=""` on that
  radio, or `selected` on that option, so the page arrives chosen before any JavaScript runs.
- **In a transition, for a choice the application makes.** A person's own click moves the
  mark natively; there is nothing to write for it.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { writeExoChoice } from '@exodra/forms';

const SIZES = ['s', 'm', 'l'];

const SIZE_SCHEMA = createExoSchema((b) => {
    let reset!: TExoEventPort;
    const radios: TExoAttrPort[] = [];
    const options: TExoAttrPort[] = [];
    b.el('div', null, (d) => {
        d.el('fieldset', null, (f) => {
            for (const size of SIZES) {
                f.el('input', { type: 'radio', name: 'size', value: size }, (i) => {
                    radios.push(i.port('checked'));
                });
            }
        });
        d.el('select', { name: 'fit' }, (s) => {
            for (const size of SIZES) {
                s.el('option', { value: size }, (o) => {
                    options.push(o.port('selected'));
                    o.text(size.toUpperCase());
                });
            }
        });
        d.el('button', { type: 'button' }, (button) => {
            reset = button.eventPort('click');
            button.text('Back to M');
        });
    });
    return { reset, radios, options };
});

const mSize = createExoMachineBuilder<TExoDomNode>(SIZE_SCHEMA);
mSize.createInitialState((c) => {
    writeExoChoice(c, SIZE_SCHEMA.ports.radios, SIZES, 'm');
    writeExoChoice(c, SIZE_SCHEMA.ports.options, SIZES, 'm');
});
const backToMedium = mSize.transition((c) => {
    writeExoChoice(c, SIZE_SCHEMA.ports.radios, SIZES, 'm');
    writeExoChoice(c, SIZE_SCHEMA.ports.options, SIZES, 'm');
});
mSize.on(SIZE_SCHEMA.ports.reset, (c) => backToMedium(c));
export const SIZE = mSize.done();
```

### A group whose value comes from a parent

When the chosen value belongs to a parent, the group is its own machine whose **wire** takes
the value as params and writes the mark. The parent builds it with the starting value and
re-runs the wire with `wireExoNode` when the value changes:

```ts
import { createExoMachineBuilder, createExoSchema, wireExoNode } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineNode,
    TExoNode,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { writeExoChoice } from '@exodra/forms';

const PLANS = ['free', 'team', 'business'];

const PLAN_GROUP_SCHEMA = createExoSchema((b) => {
    const radios: TExoAttrPort[] = [];
    b.el('fieldset', null, (f) => {
        for (const plan of PLANS) {
            f.el('label', null, (l) => {
                l.el('input', { type: 'radio', name: 'plan', value: plan }, (i) => {
                    radios.push(i.port('checked'));
                });
                l.text(plan);
            });
        }
    });
    return { radios };
});
const mPlanGroup = createExoMachineBuilder<TExoMachineNode, string>(PLAN_GROUP_SCHEMA);
mPlanGroup.wire((c, chosen) => {
    writeExoChoice(c, PLAN_GROUP_SCHEMA.ports.radios, PLANS, chosen);
});
const PLAN_GROUP = mPlanGroup.done();

const ACCOUNT_SCHEMA = createExoSchema((b) => {
    let slot!: TExoChildrenPort;
    let downgrade!: TExoEventPort;
    b.el('div', null, (d) => {
        slot = d.childrenPort();
        d.el('button', { type: 'button' }, (button) => {
            downgrade = button.eventPort('click');
            button.text('Downgrade to free');
        });
    });
    return { slot, downgrade };
});

const mAccount = createExoMachineBuilder<TExoDomNode, unknown, { group: TExoNode }>(
    ACCOUNT_SCHEMA
);
mAccount.createInitialState((c) => {
    const group = c.build(PLAN_GROUP, 0, 'team');
    c.childList(ACCOUNT_SCHEMA.ports.slot).insert(group);
    return { group };
});
const downgrade = mAccount.transition((c) => {
    wireExoNode(c.state.group, PLAN_GROUP, 'free');
});
mAccount.on(ACCOUNT_SCHEMA.ports.downgrade, (c) => downgrade(c));
export const ACCOUNT = mAccount.done();
```

`writeExoChoice` relies on the browser's exclusivity, so it is **not** for a group of
checkboxes or a `<select multiple>`: neither clears its other members. Write each member's
`checked` or `selected` port yourself there.

A `<select>` is marked on its options and never through a `value` port on the `<select>`:
see [Known limits](#known-limits).

## Fields in the rows of a list

When the rows of a list carry fields and something outside a row needs their values — a
total, a summary — the **parent** holds the state. It listens once on the container, finds
the row the event came from, and passes the new value down as the params of that row's
wire. A row's wire may only write ports; `wireExoNode` from `@exodra/core` re-runs it on the
live row.

```ts
import { createExoMachineBuilder, createExoSchema, wireExoNode } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineNode,
    TExoNode,
    TExoTextPort,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';

const PRICES = [12, 30, 7];

const ROW_SCHEMA = createExoSchema((b) => {
    let at!: TExoAttrPort;
    let total!: TExoTextPort;
    b.el('li', null, (li) => {
        li.el('input', { type: 'number', min: '0', value: '1' }, (i) => {
            at = i.port('data-row');
        });
        li.el('span', null, (s) => {
            total = s.textPort();
        });
    });
    return { at, total };
});

type TRowParams = { readonly price: number; readonly quantity: number };

const mRow = createExoMachineBuilder<TExoMachineNode, TRowParams, number>(ROW_SCHEMA);
mRow.createInitialState((_c, index) => index);
mRow.wire((c, row) => {
    c.attr(ROW_SCHEMA.ports.at, c.state);
    c.text(ROW_SCHEMA.ports.total, Number.isNaN(row.quantity) ? '–' : row.price * row.quantity);
});
const ROW = mRow.done();

const CART_SCHEMA = createExoSchema((b) => {
    let input!: TExoEventPort;
    let rows!: TExoChildrenPort;
    let sum!: TExoTextPort;
    b.el('div', { class: 'cart' }, (d) => {
        input = d.eventPort('input');
        d.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        d.el('p', null, (p) => {
            sum = p.textPort();
        });
    });
    return { input, rows, sum };
});

type TCart = { quantities: number[]; rows: TExoNode[] };

const sumOf = (quantities: readonly number[]): number =>
    quantities.reduce((sum, quantity, i) => sum + (Number.isNaN(quantity) ? 0 : quantity * PRICES[i]), 0);

const mCart = createExoMachineBuilder<TExoDomNode, unknown, TCart>(CART_SCHEMA);
mCart.createInitialState((c) => {
    const list = c.childList(CART_SCHEMA.ports.rows);
    const quantities = PRICES.map(() => 1);
    const rows = PRICES.map((price, i) => {
        const row = c.build(ROW, i, { price, quantity: quantities[i] });
        list.insert(row);
        return row;
    });
    return { quantities, rows };
});
const showSum = mCart.transition((c) => {
    c.text(CART_SCHEMA.ports.sum, sumOf(c.state.quantities));
});
mCart.wire((c) => showSum(c));
const setQuantity = mCart.transition<number, number>((c, at, quantity) => {
    c.state.quantities[at] = quantity;
    wireExoNode(c.state.rows[at], ROW, { price: PRICES[at], quantity });
    showSum(c);
});
mCart.on(CART_SCHEMA.ports.input, (c, event) => {
    const field = event.target as HTMLInputElement;
    setQuantity(c, Number(field.dataset.row), readExoControlValue(field) as number);
});
export const CART = mCart.done();
```

The field's starting value is a static `value` attribute in the schema, so it is markup the
server prints and nothing writes it again.

## What each control reads as

`readExoControlValue` looks at the element's `localName` and, for an `<input>`, its `type`:

| Control | Reads | As |
| --- | --- | --- |
| `<input type="checkbox">` | `checked` | `boolean` |
| `<input type="number">`, `<input type="range">` | `valueAsNumber` | `number` |
| `<input type="radio">` | `value` while checked, else nothing | `string` or `undefined` |
| `<input type="file">` | `files` | `FileList` |
| any other `<input>` (text, email, date, …) | `value` | `string` |
| `<select>` | `value` | `string` |
| `<select multiple>` | the `value` of every selected option | `string[]` |
| `<textarea>` | `value` | `string` |
| anything else — including a form-associated custom element and a `contenteditable` element — and `null`, `undefined` | — | `undefined` |

**A number field reads `NaN` when it is empty or half-typed** (`1e`). That is the browser's
own parse under the field's type: `Number('')` is `0`, and a form that turns "the person
cleared the field" into "the person typed nought" is the bug this avoids. Whether an empty
field is invalid, means "unset", or keeps the last good number is the form's decision, so
`NaN` is handed to it rather than replaced.

A radio reads as its `value` only while it is checked, so an event from the radio that was
just chosen gives its value and the group's other members read as `undefined`. A checkbox
reads as whether it is ticked, not its `value` attribute.

## What runs where

- **Browser (`@exodra/dom`)** — everything above.
- **Server (`@exodra/string`)** — `writeExoChoice` in `createInitialState` or in a wire
  prints the starting mark (`checked=""`, `selected`). Event handlers never run, because there are no events.
  `readExoControlValues` answers `undefined` for every port, because there is no document to
  read. `readExoControlValue` checks `localName` rather than `instanceof`, so it touches no
  DOM global, is safe in a server bundle, and reads a control from another realm (an iframe).
- **Hydration** — adopts the served controls, including whatever a person typed into them
  before the bundle arrived; `readExoControlValues` reads that text back.

All of it is pinned in `packages/forms/src/controls/tests/controls.test.ts`, including the
served radio group and the `undefined` answers on `@exodra/string`.

## Known limits

- **A `<select>` has no `value` port that the server can print.** `port('value')` on a
  `<select>` is refused when the schema is built (`EXO0015`): the markup for "this option is
  chosen" is `selected` on the `<option>`, a different element, so the server would serve the
  first option whatever the state says. Mark the options with `port('selected')` and write
  the mark with `writeExoChoice`. The same refusal covers `port('value')` on an `<output>`, whose
  value is its text: use a `textPort()`.
- **`form.reset()` on a client-rendered field empties it.** A `value` port is written as the
  `value` property only, never the attribute, so a field rendered in the browser has no
  default to reset to. A served field resets to what the server printed. `checked` and
  `selected` write the attribute as well, so they reset the same way on both. The header of
  `packages/dom/src/tests/property-parity.test.ts` states both rules.
- **Controls inside a shadow root are not read by a container outside it.** An event that
  crosses a shadow boundary is retargeted, so the container's handler sees the **host** as
  `event.target`, and `change` is not composed at all, so it does not cross. Read
  `event.composedPath()[0]` yourself, or listen inside the component.
- **Form-associated custom elements and `contenteditable` read as `undefined`.**
  `readExoControlValue` knows `<input>`, `<select>` and `<textarea>` only.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
