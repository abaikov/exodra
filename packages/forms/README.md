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
and it writes only what depends on that value.

## Installation

```bash
npm install @exodra/forms @exodra/core
```

## A form, end to end

One event port on a **container**, one handler that reads the control the event came from,
and functions that write what depends on the value.

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';

const SignupPorts = exoPorts({
    input: EXO_PORT_EVENT,
    greeting: EXO_PORT_TEXT,
    error: EXO_PORT_TEXT,
    send: EXO_PORT_ATTR,
});

const signupSchema = createExoSchema(SignupPorts, (b) => {
    b.el('div', { class: 'signup' }, (d) => {
        d.eventPort(SignupPorts.input, 'input');
        d.el('input', { type: 'text', name: 'name' });
        d.el('input', { type: 'number', name: 'age' });
        d.el('p', null, (p) => {
            p.textPort(SignupPorts.greeting);
        });
        d.el('p', { class: 'error' }, (p) => {
            p.textPort(SignupPorts.error);
        });
        d.el('button', { type: 'button' }, (button) => {
            button.attrPort(SignupPorts.send, 'disabled');
            button.text('Send');
        });
    });
});

type TSignup = { name: string; age: number };

const signupBase = createExoMachine(signupSchema, {
    createInitialState: (_c: TExoDomNode): TSignup => ({ name: '', age: Number.NaN }),
});

function takeName(c: TExoMachineNodeOf<typeof signupBase>, name: string): void {
    c.state.name = name;
    c.text(SignupPorts.greeting, name === '' ? '' : `Hello, ${name}`);
    c.attr(SignupPorts.send, name === '' || Number.isNaN(c.state.age));
}

function takeAge(c: TExoMachineNodeOf<typeof signupBase>, age: number): void {
    c.state.age = age;
    c.text(SignupPorts.error, Number.isNaN(age) ? 'Age has to be a number' : '');
    c.attr(SignupPorts.send, c.state.name === '' || Number.isNaN(age));
}

const Signup = composeExoMachine(
    signupBase,
    (m) =>
        withExoWire(m, (c) => {
            c.attr(SignupPorts.send, true);
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(SignupPorts.input, (c, event) => {
                const field = event.target as HTMLInputElement;
                if (field.name === 'name') takeName(c, readExoControlValue(field) as string);
                else if (field.name === 'age') takeAge(c, readExoControlValue(field) as number);
            });
        })
);

const backend = withExoCompiler(new ExoDomBackend());
backend.render(Signup, document.getElementById('root') as HTMLElement);
```

What this shape decides:

- **One listener, not one per field.** `input` and `change` bubble, so a port on any element
  that contains the fields hears every one of them — a `<form>`, a `<fieldset>`, a panel
  `<div>`. Fields do not need a `<form>` around them, and a single field can carry its own
  event port when it is the only one.
- **The field's own `value` is never written back.** The browser already holds what the
  person typed; writing it again on every keystroke is a DOM write that changes nothing.
  The machine writes only what *depends* on the value: a read-out, an error text, a
  `disabled` flag.
- **The value lives in `c.state`** when something else needs it later — the
  `createInitialState` option of `createExoMachine` returns the starting value, and its
  return type is the state's type. When nothing needs it later, keep no state at all.
- **A function the handler calls is typed by the base machine**:
  `TExoMachineNodeOf<typeof signupBase>` is the exonode with its `state`. A transition
  declared with `withExoTransitions` is for the case where something outside the machine fires it.

### Which field fired

Two ways to tell, and both cost nothing per field:

- **By `name`**, as above: a static attribute in the schema, compared in the handler.
- **By identity**, against the elements behind ref ports. `c.portNode(port)` reads a ref
  port's element out of the instance's port table; read it once, in `createInitialState`, and
  keep it in the state:

```ts
import {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    createExoMachine,
    createExoSchema,
    exoPorts,
    exoRefPortKind,
    withExoHandlers,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';

const LoginPorts = exoPorts({
    input: EXO_PORT_EVENT,
    email: exoRefPortKind<HTMLInputElement>(),
    hint: EXO_PORT_TEXT,
});

const loginSchema = createExoSchema(LoginPorts, (b) => {
    b.el('fieldset', null, (f) => {
        f.eventPort(LoginPorts.input, 'input');
        f.el('input', { type: 'email' }, (i) => {
            i.refPort(LoginPorts.email);
        });
        f.el('input', { type: 'password' });
        f.el('small', null, (s) => {
            s.textPort(LoginPorts.hint);
        });
    });
});

const loginBase = createExoMachine<TExoDomNode, unknown, { email: HTMLInputElement }>(
    loginSchema,
    {
        createInitialState: (c) => ({
            email: c.portNode(LoginPorts.email),
        }),
    }
);
export const Login = withExoHandlers(loginBase, (on) => {
    on(LoginPorts.input, (c, event) => {
        if (event.target === c.state.email) {
            const email = readExoControlValue(event.target) as string;
            c.text(LoginPorts.hint, email.includes('@') ? '' : 'An address has an @ in it');
        }
    });
});
```

### Validate when a field is left

`focus` and `blur` do not bubble, so a container port named `blur` hears nothing from the
fields inside it. `focusout` is the same moment and does bubble:

```ts no-check
b.el('form', null, (f) => {
    f.eventPort(FormPorts.leave, 'focusout');
    // …the fields
});

const formMachine = withExoHandlers(formBase, (on) => {
    on(FormPorts.leave, (c, event) => {
        const field = event.target as HTMLInputElement;
        if (field.name === 'email') checkEmail(c, readExoControlValue(field) as string);
    });
});
```

### Setting a field from code

The one time a field's `value` is written is when the application, not the person, decides
it: a "clear" button, a loaded record, a suggestion picked from a list. That is its own
write, to a `value` port:

```ts
import { EXO_PORT_ATTR, EXO_PORT_EVENT, createExoMachine, createExoSchema, exoPorts, withExoHandlers } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

const SearchPorts = exoPorts({ value: EXO_PORT_ATTR, clear: EXO_PORT_EVENT });

const searchSchema = createExoSchema(SearchPorts, (b) => {
    b.el('div', { class: 'search' }, (d) => {
        d.el('input', { type: 'search' }, (i) => {
            i.attrPort(SearchPorts.value, 'value');
        });
        d.el('button', { type: 'button' }, (button) => {
            button.eventPort(SearchPorts.clear, 'click');
            button.text('Clear');
        });
    });
});

const searchBase = createExoMachine<TExoDomNode>(searchSchema);
export const Search = withExoHandlers(searchBase, (on) => {
    on(SearchPorts.clear, (c) => {
        c.attr(SearchPorts.value, '');
    });
});
```

`value`, `checked` and `selected` ports are written as DOM **properties**, decided when the
schema is compiled. Once the person has typed, the attribute does not say what is on
screen, so an attribute write would move nothing; the property write is what clears the
field.

## Values on submit only

A form that needs its values once, when it is sent, registers nothing per field. Put a ref
port on each control and read them all in the submit handler:

```ts
import { EXO_PORT_EVENT, EXO_PORT_REF, createExoMachine, createExoSchema, exoPorts, withExoHandlers } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValues } from '@exodra/forms';

const ContactPorts = exoPorts({
    submit: EXO_PORT_EVENT,
    name: EXO_PORT_REF,
    age: EXO_PORT_REF,
    subscribe: EXO_PORT_REF,
});

const contactSchema = createExoSchema(ContactPorts, (b) => {
    b.el('form', null, (f) => {
        f.eventPort(ContactPorts.submit, 'submit');
        f.el('input', { type: 'text' }, (i) => {
            i.refPort(ContactPorts.name);
        });
        f.el('input', { type: 'number' }, (i) => {
            i.refPort(ContactPorts.age);
        });
        f.el('input', { type: 'checkbox' }, (i) => {
            i.refPort(ContactPorts.subscribe);
        });
        f.el('button', { type: 'submit' }, (button) => button.text('Send'));
    });
});
const CONTACT_FIELDS = [ContactPorts.name, ContactPorts.age, ContactPorts.subscribe];

const contactBase = createExoMachine<TExoDomNode>(contactSchema);
export const Contact = withExoHandlers(contactBase, (on) => {
    on(ContactPorts.submit, (c, event) => {
        event.preventDefault();
        const [name, age, subscribe] = readExoControlValues(c, CONTACT_FIELDS);
        console.log({ name, age, subscribe });
    });
});
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
- **In a handler or a wire, for a choice the application makes.** A person's own click moves the
  mark natively; there is nothing to write for it.

```ts
import { EXO_PORT_ATTR, EXO_PORT_EVENT, createExoMachine, createExoSchema, exoPorts, withExoHandlers } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { writeExoChoice } from '@exodra/forms';

const SIZES = ['s', 'm', 'l'];

const SizePorts = exoPorts({
    reset: EXO_PORT_EVENT,
    smallRadio: EXO_PORT_ATTR,
    mediumRadio: EXO_PORT_ATTR,
    largeRadio: EXO_PORT_ATTR,
    smallOption: EXO_PORT_ATTR,
    mediumOption: EXO_PORT_ATTR,
    largeOption: EXO_PORT_ATTR,
});
const SIZE_RADIOS = [SizePorts.smallRadio, SizePorts.mediumRadio, SizePorts.largeRadio];
const SIZE_OPTIONS = [SizePorts.smallOption, SizePorts.mediumOption, SizePorts.largeOption];

const sizeSchema = createExoSchema(SizePorts, (b) => {
    b.el('div', null, (d) => {
        d.el('fieldset', null, (f) => {
            SIZES.forEach((size, at) => {
                f.el('input', { type: 'radio', name: 'size', value: size }, (i) => {
                    i.attrPort(SIZE_RADIOS[at], 'checked');
                });
            });
        });
        d.el('select', { name: 'fit' }, (s) => {
            SIZES.forEach((size, at) => {
                s.el('option', { value: size }, (o) => {
                    o.attrPort(SIZE_OPTIONS[at], 'selected');
                    o.text(size.toUpperCase());
                });
            });
        });
        d.el('button', { type: 'button' }, (button) => {
            button.eventPort(SizePorts.reset, 'click');
            button.text('Back to M');
        });
    });
});

const sizeBase = createExoMachine(sizeSchema, {
    createInitialState: (c: TExoDomNode) => {
        writeExoChoice(c, SIZE_RADIOS, SIZES, 'm');
        writeExoChoice(c, SIZE_OPTIONS, SIZES, 'm');
    },
});
export const Size = withExoHandlers(sizeBase, (on) => {
    on(SizePorts.reset, (c) => {
        writeExoChoice(c, SIZE_RADIOS, SIZES, 'm');
        writeExoChoice(c, SIZE_OPTIONS, SIZES, 'm');
    });
});
```

### A group whose value comes from a parent

When the chosen value belongs to a parent, the group is its own machine whose **wire** takes
the value as params and writes the mark. The parent builds it with the starting value and
re-runs the wire with `wireExoNode` when the value changes:

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    createExoMachine,
    createExoSchema,
    exoPorts,
    wireExoNode,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode, TExoNode } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { writeExoChoice } from '@exodra/forms';

const PLANS = ['free', 'team', 'business'];

const PlanGroupPorts = exoPorts({
    freeRadio: EXO_PORT_ATTR,
    teamRadio: EXO_PORT_ATTR,
    businessRadio: EXO_PORT_ATTR,
});
const PLAN_RADIOS = [PlanGroupPorts.freeRadio, PlanGroupPorts.teamRadio, PlanGroupPorts.businessRadio];

const planGroupSchema = createExoSchema(PlanGroupPorts, (b) => {
    b.el('fieldset', null, (f) => {
        PLANS.forEach((plan, at) => {
            f.el('label', null, (l) => {
                l.el('input', { type: 'radio', name: 'plan', value: plan }, (i) => {
                    i.attrPort(PLAN_RADIOS[at], 'checked');
                });
                l.text(plan);
            });
        });
    });
});
const planGroupBase = createExoMachine<TExoMachineNode, string>(planGroupSchema);
const PlanGroup = withExoWire(planGroupBase, (c, chosen) => {
    writeExoChoice(c, PLAN_RADIOS, PLANS, chosen);
});

const AccountPorts = exoPorts({ slot: EXO_PORT_CHILDREN, downgrade: EXO_PORT_EVENT });

const accountSchema = createExoSchema(AccountPorts, (b) => {
    b.el('div', null, (d) => {
        d.childrenPort(AccountPorts.slot);
        d.el('button', { type: 'button' }, (button) => {
            button.eventPort(AccountPorts.downgrade, 'click');
            button.text('Downgrade to free');
        });
    });
});

const accountBase = createExoMachine<TExoDomNode, unknown, { group: TExoNode }>(
    accountSchema,
    {
        createInitialState: (c) => {
            const group = c.build(PlanGroup, 'team');
            c.childList(AccountPorts.slot).insert(group);
            return { group };
        },
    }
);
export const Account = withExoHandlers(accountBase, (on) => {
    on(AccountPorts.downgrade, (c) => {
        wireExoNode(c.state.group, PlanGroup, 'free');
    });
});
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
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    wireExoNode,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode, TExoMachineNodeOf, TExoNode } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';

const PRICES = [12, 30, 7];

const RowPorts = exoPorts({ at: EXO_PORT_ATTR, total: EXO_PORT_TEXT });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.el('input', { type: 'number', min: '0', value: '1' }, (i) => {
            i.attrPort(RowPorts.at, 'data-row');
        });
        li.el('span', null, (s) => {
            s.textPort(RowPorts.total);
        });
    });
});

type TRowParams = { readonly at: number; readonly price: number; readonly quantity: number };

const rowBase = createExoMachine(rowSchema, {
    createInitialState: (_c: TExoMachineNode, row: TRowParams) => row.at,
});
const Row = withExoWire(rowBase, (c, row) => {
    c.attr(RowPorts.at, c.state);
    c.text(RowPorts.total, Number.isNaN(row.quantity) ? '–' : row.price * row.quantity);
});

const CartPorts = exoPorts({ input: EXO_PORT_EVENT, rows: EXO_PORT_CHILDREN, sum: EXO_PORT_TEXT });

const cartSchema = createExoSchema(CartPorts, (b) => {
    b.el('div', { class: 'cart' }, (d) => {
        d.eventPort(CartPorts.input, 'input');
        d.el('ul', null, (ul) => {
            ul.childrenPort(CartPorts.rows);
        });
        d.el('p', null, (p) => {
            p.textPort(CartPorts.sum);
        });
    });
});

type TCart = { quantities: number[]; rows: TExoNode[] };

const sumOf = (quantities: readonly number[]): number =>
    quantities.reduce((sum, quantity, i) => sum + (Number.isNaN(quantity) ? 0 : quantity * PRICES[i]), 0);

const cartBase = createExoMachine<TExoDomNode, unknown, TCart>(cartSchema, {
    createInitialState: (c) => {
        const list = c.childList(CartPorts.rows);
        const quantities = PRICES.map(() => 1);
        const rows = PRICES.map((price, i) => {
            const row = c.build(Row, { at: i, price, quantity: quantities[i] });
            list.insert(row);
            return row;
        });
        return { quantities, rows };
    },
});

function showSum(c: TExoMachineNodeOf<typeof cartBase>): void {
    c.text(CartPorts.sum, sumOf(c.state.quantities));
}

function setQuantity(
    c: TExoMachineNodeOf<typeof cartBase>,
    at: number,
    quantity: number
): void {
    c.state.quantities[at] = quantity;
    wireExoNode(c.state.rows[at], Row, { at, price: PRICES[at], quantity });
    showSum(c);
}

export const Cart = composeExoMachine(
    cartBase,
    (m) => withExoWire(m, (c) => showSum(c)),
    (m) =>
        withExoHandlers(m, (on) => {
            on(CartPorts.input, (c, event) => {
                const field = event.target as HTMLInputElement;
                setQuantity(c, Number(field.dataset.row), readExoControlValue(field) as number);
            });
        })
);
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

- **A `<select>` has no `value` port that the server can print.** `attrPort(port, 'value')` on a
  `<select>` is refused when the schema is built (`EXO0015`): the markup for "this option is
  chosen" is `selected` on the `<option>`, a different element, so the server would serve the
  first option whatever the state says. Mark the options with `attrPort(port, 'selected')` and write
  the mark with `writeExoChoice`. The same refusal covers a `value` port on an `<output>`, whose
  value is its text: use a `textPort(port)`.
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
