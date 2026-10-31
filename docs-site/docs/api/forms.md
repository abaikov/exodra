---
title: Forms
---

# Forms

`@exodra/forms` reads form controls and writes the mark of a choice. It holds no model and
imports nothing at runtime: the field keeps its own value, a [machine](./core.md#machines)
listens where it chooses, and a transition writes only what depends on that value.

```bash
npm install @exodra/forms @exodra/core
```

Exports: `readExoControlValue`, `readExoControlValues`, `writeExoChoice`,
`checkExoControlValues`, `setExoControlErrors`, and the `TExoControlValue` and
`TExoControlRule` types.

## Signatures

```ts no-check
type TExoControlValue = string | number | boolean | readonly string[] | FileList;

function readExoControlValue(
    target: EventTarget | null | undefined
): TExoControlValue | undefined;

function readExoControlValues(
    c: { portTable(): TExoPortTable; portNodeReader(): TExoPortNodeReader<EventTarget | undefined> },
    ports: readonly TExoRefPort[]
): (TExoControlValue | undefined)[];

function writeExoChoice<TValue>(
    c: Pick<TExoFillDoors, 'attr'>,
    ports: readonly TExoAttrPort[],
    values: readonly TValue[],
    chosen: TValue
): void;

type TExoControlRule = (
    value: TExoControlValue | undefined,
    values: readonly (TExoControlValue | undefined)[]
) => string | null;

function checkExoControlValues(
    values: readonly (TExoControlValue | undefined)[],
    rules: readonly (TExoControlRule | null)[]
): (string | null)[];

function setExoControlErrors(
    c: { portTable(): TExoPortTable; portNodeReader(): TExoPortNodeReader<EventTarget | undefined> },
    ports: readonly TExoRefPort[],
    errors: readonly (string | null)[]
): void;
```

| Function | Call it | It does |
| --- | --- | --- |
| `readExoControlValue` | in an event handler, on `event.target` | reads the control as the value its type means |
| `readExoControlValues` | on submit, on validate | reads the live controls behind ref ports, in port order |
| `writeExoChoice` | in `createInitialState`, a wire, or a transition | writes `true` on the port at `values.indexOf(chosen)`, or `false` on every port when `chosen` is not in `values` |
| `checkExoControlValues` | anywhere — it touches no document | runs `rules[i]` on `values[i]` and answers its error, or `null`; a `null` rule checks nothing |
| `setExoControlErrors` | on submit, on input, after an async check | hands each error to its control's `setCustomValidity` (`null` clears it); nothing on a backend with no document |

## readExoControlValue()

Reads by the element's `localName` and, for an `<input>`, its `type`:

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

A number field reads **`NaN`** when it is empty or half-typed (`1e`), not `0`. Whether an
empty field is invalid, means "unset", or keeps the last good number is the form's
decision, so `NaN` is handed to it rather than replaced.

It checks `localName` rather than `instanceof`, so it touches no DOM global, is safe to
import in a server bundle, and reads a control from another realm (an iframe).

### The pattern: one listener on a container

`input` and `change` bubble, so **one** event port on an element that contains the fields
hears all of them. The container can be a `<form>`, a `<fieldset>` or a plain `<div>` —
fields do not need a `<form>` — and a single field can carry its own event port.

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

The rules this follows:

- **The field's own `value` is not written back on user input.** The browser already holds
  it. Transitions write only what depends on it — a read-out, an error text, a `disabled`
  flag. A `value` port is for a **programmatic** set (a "clear" button, a loaded record),
  in a transition of its own.
- **Identify the field** by `event.target.name`, as above, or by comparing `event.target`
  with the element behind a ref port, read once in `createInitialState` and kept in the
  state: `c.portNodeReader()(c.portTable(), P.email)`.
- **State lives in `c.state`**, typed by the builder's third type argument,
  `createExoMachineBuilder<TExoDomNode, unknown, TState>`. On a builder typed with
  `TExoDomNode` the handler's `event` is an `Event`.
- **A transition with an argument names its type**: `m.transition<number>((c, to) => …)`.
  Writing `(c, to: number) => …` without the explicit type argument leaves `c` implicitly
  `any`.
- **`focus` and `blur` do not bubble.** Validate-on-leave listens for `focusout` on the
  container.

## readExoControlValues()

A form that needs its values only when it is sent registers nothing per field: a ref port
on each control, one read in the submit handler.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoRefPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValues } from '@exodra/forms';

const CONTACT_SCHEMA = createExoSchema((b) => {
    let submit!: TExoEventPort;
    let name!: TExoRefPort;
    let age!: TExoRefPort;
    b.el('form', null, (f) => {
        submit = f.eventPort('submit');
        f.el('input', { type: 'text' }, (i) => {
            name = i.refPort();
        });
        f.el('input', { type: 'number' }, (i) => {
            age = i.refPort();
        });
        f.el('button', { type: 'submit' }, (button) => button.text('Send'));
    });
    return { submit, name, age };
});
const CONTACT_FIELDS = [CONTACT_SCHEMA.ports.name, CONTACT_SCHEMA.ports.age];

const mContact = createExoMachineBuilder<TExoDomNode>(CONTACT_SCHEMA);
mContact.on(CONTACT_SCHEMA.ports.submit, (c, event) => {
    event.preventDefault();
    const [name, age] = readExoControlValues(c, CONTACT_FIELDS);
    console.log({ name, age });
});
export const CONTACT = mContact.done();
```

It reads the controls that are on the page **when it is called**. On a served page, what a
person typed before the bundle arrived is what comes back. On `@exodra/string` there is no
document, and every entry is `undefined`. A radio reads as its `value` only while checked,
so ref ports on a whole radio group come back as, for example, `[undefined, 'm', undefined]`.

## writeExoChoice()

A choice is a mark on one member of a group — `checked` on a radio, `selected` on an
`<option>`. Give each member an attribute port for its mark; `writeExoChoice` finds `chosen`
in `values` and writes `true` to that one port. The browser clears the rest of a same-`name`
radio group or a single `<select>` itself, so nothing remembers the previous member, and a
mark the person moved by hand is simply overridden. A `chosen` that is not in `values`
writes `false` to every port.

- **In `createInitialState`** it sets the starting mark, and the server prints it
  (`checked=""`, `selected`).
- **In a transition** it sets the mark when the application decides. A person's own click
  moves it natively, with nothing to write.
- **In a wire**, for a group whose value belongs to a parent: the group machine's
  `wire((c, chosen) => writeExoChoice(c, P.radios, VALUES, chosen))`, built by the parent with
  `c.build(GROUP, i, chosen)` and re-run with `wireExoNode(node, GROUP, next)`. The package
  README has the complete sample.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { writeExoChoice } from '@exodra/forms';

const PLANS = ['free', 'team', 'business'];

const PLAN_SCHEMA = createExoSchema((b) => {
    let reset!: TExoEventPort;
    const options: TExoAttrPort[] = [];
    b.el('div', null, (d) => {
        d.el('select', null, (s) => {
            for (const plan of PLANS) {
                s.el('option', { value: plan }, (o) => {
                    options.push(o.port('selected'));
                    o.text(plan);
                });
            }
        });
        d.el('button', { type: 'button' }, (button) => {
            reset = button.eventPort('click');
            button.text('Back to free');
        });
    });
    return { reset, options };
});

const mPlan = createExoMachineBuilder<TExoDomNode>(PLAN_SCHEMA);
mPlan.createInitialState((c) => {
    writeExoChoice(c, PLAN_SCHEMA.ports.options, PLANS, 'team');
});
const backToFree = mPlan.transition((c) => {
    writeExoChoice(c, PLAN_SCHEMA.ports.options, PLANS, 'free');
});
mPlan.on(PLAN_SCHEMA.ports.reset, (c) => backToFree(c));
export const PLAN = mPlan.done();
```

A radio group is the same code with `port('checked')` on each `<input type="radio">` sharing
one `name`. It is **not** for a group of checkboxes or a `<select multiple>`: neither clears
its other members, so write each member's port yourself there.

## Validation

Rules are plain functions; the result reaches the browser as the controls' own
validity. The field keeps its value **and** its error, so `:invalid`,
`:user-invalid`, `form.checkValidity()` and `reportValidity()` all see what the
machine decided, and nothing is stored beside the field.

```ts no-check
import { checkExoControlValues, readExoControlValues, setExoControlErrors } from '@exodra/forms';
import type { TExoControlRule } from '@exodra/forms';

const requiredName: TExoControlRule = (value) => (value === '' ? 'Name is required' : null);
const adultAge: TExoControlRule = (value) =>
    typeof value === 'number' && value >= 18 ? null : 'Must be 18 or older';
const RULES = [requiredName, adultAge];

mSignup.on(SIGNUP_SCHEMA.ports.submit, (c, event) => {
    event.preventDefault();
    const values = readExoControlValues(c, FIELDS);
    const errors = checkExoControlValues(values, RULES);
    setExoControlErrors(c, FIELDS, errors);
    if (errors.every((error) => error === null)) send(c, values);
});
```

A rule gets every value as its second argument, so one field can be checked
against another (`value === values[0] ? null : 'Passwords differ'`). The same
rule functions import into an API server unchanged: they read values, not
elements.

**Put `novalidate` on the form.** Without it the browser refuses to fire
`submit` while a field is invalid and shows its own bubble, so the machine never
sees the attempt. With it, `submit` always arrives and the machine decides.

**Write the whole array every time.** `setCustomValidity` keeps a message until
it is set back to `''`; `setExoControlErrors` sets every port it is given,
clearing where the error is `null`, so a field that was fixed stops being
invalid on the next check.

**Touched needs no state.** `:user-invalid` matches only after the person has
interacted with the field or tried to submit, so an error element next to it can
be shown with CSS alone:

```css
.error { display: none; }
input:user-invalid + .error { display: block; }
```

**Submitting.** A pending flag is machine state, and the button's `disabled` is
an attr port written by the transition that starts and the one that ends the
request.

**`invalid` does not bubble**, and event ports listen on their own element, so a
container listener does not hear it; give each control its own
`eventPort('invalid')` if you need it.

## Fields in the rows of a list

When something outside a row needs the values of fields inside the rows, the **parent**
holds the state, listens once on the container, and passes values down as the params of the
row's wire: `c.build(ROW, i, params)` builds the row, and `wireExoNode(node, ROW, params)`
from `@exodra/core` re-runs its wire on the live row. A row's wire may only write ports.

```ts no-check
const setQuantity = mCart.transition<number, number>((c, at, quantity) => {
    c.state.quantities[at] = quantity;
    wireExoNode(c.state.rows[at], ROW, { price: PRICES[at], quantity });
    c.text(CART_SCHEMA.ports.sum, sumOf(c.state.quantities));
});
mCart.on(CART_SCHEMA.ports.input, (c, event) => {
    const field = event.target as HTMLInputElement;
    setQuantity(c, Number(field.dataset.row), readExoControlValue(field) as number);
});
```

The complete cart, with the row machine and the parent that builds the rows, is in the
[package README](https://github.com/abaikov/exodra/tree/master/packages/forms#fields-in-the-rows-of-a-list).

## Where it runs

| Backend | What happens |
| --- | --- |
| `@exodra/dom` | everything above |
| `@exodra/string` | `writeExoChoice` in `createInitialState` or a wire prints the starting mark; handlers never run; `readExoControlValues` answers `undefined` for every port; `setExoControlErrors` does nothing; `checkExoControlValues` runs as anywhere |
| hydration | adopts the served controls with whatever was typed into them; `readExoControlValues` reads it |

Pinned in `packages/forms/src/controls/tests/controls.test.ts` and `packages/forms/src/controls/tests/validation.test.ts`.

## Known limits

- **A `<select>` has no `value` port the server can print.** `port('value')` on a `<select>`
  is refused when the schema is built ([`EXO0015`](../errors.md#exo0015)): the markup for the chosen
  option is `selected` on the `<option>`. Use `port('selected')` on each option and
  `writeExoChoice`. `port('value')` on an `<output>` is refused for the same reason; its value
  is its text, so use a `textPort()`.
- **`form.reset()` empties a client-rendered field.** The DOM backend writes a `value` port
  as the `value` property, not the attribute, so a field rendered in the browser has no
  default to reset to; a served field resets to what the server printed. `checked` and
  `selected` write the attribute too and reset the same on both. See the header of
  `packages/dom/src/tests/property-parity.test.ts`.
- **A container outside a shadow root does not read the controls inside it.** The event is
  retargeted, so the handler sees the **host** as `event.target`; and `change` is not
  composed, so it does not leave the shadow root at all. Read `event.composedPath()[0]`
  yourself, or listen inside the component.
- **Form-associated custom elements and `contenteditable` read as `undefined`.**

## Links

- npm: [`@exodra/forms`](https://www.npmjs.com/package/@exodra/forms)
- GitHub: [exodra/packages/forms](https://github.com/abaikov/exodra/tree/master/packages/forms)
