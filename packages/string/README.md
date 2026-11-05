# @exodra/string

The server backend of the Exodra schema core: it runs the same component values
`@exodra/core` describes and the **same machine** `@exodra/dom` runs, and
hands back markup instead of nodes.

A schema is cut **once** into the fewest strings a render can be, so an instance
is a handful of concatenations. No tree is ever built to be serialised.

## Installation

```bash
npm install @exodra/string @exodra/core
```

## Rendering

```typescript
import { EXO_PORT_TEXT, createExoMachine, createExoSchema, exoPorts, withExoWire } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrNode } from '@exodra/string';

const CardPorts = exoPorts({ title: EXO_PORT_TEXT, body: EXO_PORT_TEXT });

const cardSchema = createExoSchema(CardPorts, (b) => {
    b.el('article', { class: 'card' }, (card) => {
        card.el('h2', null, (h2) => {
            h2.textPort(CardPorts.title);
        });
        card.el('p', null, (p) => {
            p.textPort(CardPorts.body);
        });
    });
});
const cardBase = createExoMachine<TExoStrNode>(cardSchema);
const Card = withExoWire(cardBase, (c) => {
    c.text(CardPorts.title, 'Card');
    c.text(CardPorts.body, 'Welcome to Exodra');
});

// ONE backend, at module level.
const backend = new ExoStrBackend();

const html = backend.render(Card);
// <article class="card"><h2>Card</h2><p>Welcome to Exodra</p></article>
```

`ExoStrBackend` is shaped exactly like `@exodra/dom`'s `ExoDomBackend` — same
constructor, same `render(component, …)` method name — on purpose: a page switches
sides by switching which backend it holds rather than by learning a second calling
convention, and the return value is the difference.

**It renders ONE instance and takes no count.** **There are no props anywhere**: an
instance is handed its params and nothing else, so a row's datum arrives as the params it was
armed with. Rows that vary are a **list** — a children port filled with
`c.list(port, C, rows)` for a fixed run of them (row i armed with `rows[i]`), or a reconciler
made once at module level with `createExoChildrenReconciler(C)` from `@exodra/list-reconcile` and
called as `reconcileRows(c, port, items)` from a transition or an effect, through the same door
on this backend as in the browser. A request only ever needs the reconciler's first pass, which is insert-only.

`render` takes an optional second argument: the `TExoContextFrame` the root inherits.

## The connector

`TExoStrNode` answers every call a machine makes on the same signature
its browser twin answers it on, because that function is the one piece written by
hand and it must not be able to tell which backend it is filling. The two
surfaces are not the same list: neither declares a `bind` door — keeping a port in step
with a source is a machine effect that draws through a transition and subscribes — and this
one has no counterpart to the DOM's child-list anchors (`openChildList`,
`childListEndNode`) or its `portNodeReader` with a real element in it.

It is a **type**, not a class, and for the same reason its browser twin is one.
The data below — the value slots and the schema's writers — is one object per
**instance**, made by `createExoStrInstanceFactory`'s constructor and living exactly as
long as that
instance; the **methods are own properties of the backend**, which that object
takes as its prototype. That is what makes a plugin able to add a connector
method at all: `composeExoPlugins` writes onto the backend, so
`new ExoStrBackend(pack)` and `c.<name>` are now the same act. It also means the
compiled schema is cached per **(declaration, backend)** rather than per declaration —
**build the backend once, at module level**, or every request recompiles every
declaration on the page.

| Method                                                                                      | On the server                                                                                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `attr(port, value)`                                                                         | escape for wherever this port is, and store                                                            |
| `text(port, value)` / `html(port, markup)`                                                  | the same slot write, through the port's own writer                                                     |
| `on(port, handler, subject?)`                                                               | accepted in **both** forms and printed as nothing; the slot is still written                           |
| `provide(token, value)` / `inject(token)`                                                   | the same chain and lookup rule the browser uses                                                        |
| `one(port, C, params?)` / `list(port, C, rows)`                                             | render nested instances into a children port                                                           |
| `createExoNode(component)`                                                                  | create one child, unwired, and hand it back as a value; `wireExoNode(node, params)` wires it           |
| `appendChild` / `insertChild` / `moveChild` / `removeChild` / `replaceChildren` / `childAt` | the children-port calls, with the browser's signatures; a child's markup is taken when its parent's is |
| `portChildList(port)`                                                                       | the placement door a reconciler drives, over this port's slot                                          |
| `onTeardown(off)`                                                                           | file a disposer; `render` runs them when it returns                                                    |

Two of those look like omissions and are not:

-   **`on` must accept both forms or the design breaks in half.** The moment
    `c.on(TodoPorts.click, toggleDone, item)` is a call this backend does not have, every
    component with a declarative handler needs a second machine.
-   **An effect reads its source once and subscribes to nothing it keeps.**
    It draws what the source holds now and returns its unsubscribe, and the render stops every
    effect on the way out — so there is no callback outliving the request and no second render
    to update. The same machine runs here and in the browser because following data is the
    machine's, not the backend's.

A **node** here is a string of markup. The type it comes back as
(`TExoNode`) is opaque, which is what lets one machine assemble
children on all three backends.

## Contexts

`provide` / `inject` are connector methods, and the chain they read and write is
the **connector's own field**: there are no nodes to mark, and an instance is
handed the chain it inherits when its wiring begins. A sibling row therefore
starts from its parent's chain by construction, and an initial state that throws leaves
nothing standing anywhere.

The **outer** frame — the one a caller wrapping a whole render installs a value through,
which `@exodra/ssr` uses to put the request's response object above the page — is the
second parameter of `render(component, context)`. It used to be a module-level slot
(`exoStrContextSlot`), written and restored around every render; that is **gone**, and
with it the last piece of module state this backend had. A streaming or re-entrant server
is now expressible: two renders in flight carry two frames, because neither is anywhere
but on its own call.

## How a render happens

1. **Compile**, once per `(declaration, backend)` per process (`compileExoStrSchema`).
   The markup is cut **only where a value can land**, so everything between two
   ports — the close of one attribute, the static attributes after it, the `>`,
   a static child, the next open quote — is **one** string the schema owns.
   Keeping `<li class="row"` and ` data-id="` apart because they came from
   different fields of the declaration would make a row cost fourteen concatenations
   instead of seven: a **2x** difference on the render.
   The walk restates the port numbering of `@exodra/core`'s `createExoSchema` in markup
   and **asserts** the result at every cut — a silent disagreement would not crash, it
   would serve a page with every value in the wrong place, on one backend only.
2. **Allocate** one exonode per instance (`createExoStrInstanceFactory`), with the
   composed backend as its prototype and one `''` slot per port.
3. **Wire**: the wire fills those slots through the schema's writers.
   A writer is chosen once, at compile time; filling a port is an indirect call
   with no branch on the port's kind.
4. **Fill**: `schema.fillMarkup(values)` — one expression, specialised for the
   port count.

Ports are numbered by `@exodra/core` and that numbering is **shared with
`@exodra/dom`**. An event port and a ref port therefore own a slot here too and
print nothing; dropping the slot would renumber every later port on one backend.

## Measured costs

Every number below is from `packages/benchmarks`. Read each with the caveat
printed beside it — a number without its caveat is worse than no number.

### The attribute head (`+head`)

An attribute writer emits ` name="` and the closing quote itself, rather than
letting them sit in the neighbouring static pieces. This is what lets a writer
return `''` and **remove** the attribute the way `@exodra/dom` does for
`null`/`undefined`/`false`; `disabled=""` is a disabled control, so without it a
served page had a disabled button where the client render had a working one.

The `+head` rung of `packages/benchmarks/src/benchmarks/axes/floors/ssr-floor.ts` is
exactly this change and nothing else. On that axis's published run it cost
**0.0250 ms per 1000 rows** (25 ns/row: `+head` 0.1525 against `+vals` 0.1275) —
the joint second-largest rung, level with the port write, behind only
`fillMarkup`, and **22%** of the whole distance between the hand-written floor
and the renderer.

**Caveats.** The axis predicted this rung under 0.015 ms and that prediction
**failed**. That axis's own open prediction (P14) says `+head` is partly the
flatten, in which case the head is cheaper than the table says and the flatten
dearer.

**Baking the head back in cannot be taken back.** It was built, measured and
removed. Eligibility was written over the _value_ rules — which attributes have
no "absent" branch, i.e. `class` and the string properties — and that says
nothing about a port the machine **never fills at all**: a baked head prints
unconditionally, so an unfilled `class` port serves ` class=""` where
`@exodra/dom` sweeps the placeholder and shows no attribute. Pinned in both
directions by `packages/dom/src/tests/unfilled-port-parity.test.ts`. The price was
already zero where it was measured: only `class`/`className` and `value` on an
`<input>`/`<option>` were ever eligible, and neither measured program has one.

### Accumulating rows: `+=` beats an array and `join`

`packages/benchmarks/measurements/ssr-floor.published.json` records
`CENSUS/esc·join` at **0.1250 ms** against `CENSUS/esc` — the identical
straight-line program accumulating with `+=` — at **0.1125 ms**, on output gated
byte-identical before anything is timed. V8 builds cons-strings for `+=`; the
array is pure garbage. This is why `list` accumulates its rows with `+=` into the port's
one slot rather than collecting them and joining, and why the shipped closure is a
_filler_ and never a _joiner_ (the key that prices it in that recording is
`CENSUS/+fill`).

### The filler's shape

The static pieces are **closure locals**, not an array the loop indexes: a loop
over a `pieces` array does the same concatenations and costs about **25%** more,
because every piece is an array load with a bounds check and there is nothing
else in that function to hide it behind. Arities up to nine are written out —
a specialised body is one expression the engine sees whole, so the string
builder can size the result and add the parts in order.

### Why a constructor, not a `__proto__` literal

`createExoStrInstanceFactory` builds instances with `new` over a constructor whose
prototype is the composed backend. That site used to be a literal with a
`__proto__:` key, defended by a header saying that key is "the one spelling that
gives a literal a chosen prototype at creation" — **true about semantics and
silent about price**, and the only alternative it weighed was `Object.create`
plus assignments. A constructor was never on its list.

`packages/benchmarks/src/benchmarks/axes/mechanism/receiver-spelling.ts` prices the four
spellings head on — five straight-line programs, no `@exodra` import — over
three fields and a shared method, 400 000 objects per timed region:

```
{ __proto__: expr, a, b, c }   111.5 ns per object
new Ctor(a, b, c)                4.75
Object.create(P) + 3 stores      4.75
{ a, b, c, m }, no key           4.75

protoLiteral ↔ ctor     +106.750 ns/obj   427 grains   own resolution 0.002500 ms
protoLiteral ↔ plain    +106.625 ns/obj   427 grains
create ↔ ctor             +0.250 ns/obj     1 grain     NOT RESOLVED
```

**The price is the key, not the prototype**: `plain` is the same literal with the
key removed and it ties `new`. The instrument's own killer held — `ctor ↔
hoisted`, one allocation plus a constructor frame against neither, resolved at
13 grains — so the axis can see a single allocation and not only elephants.

**What does not carry across, because that axis says so itself:** it measures no
`@exodra` package; its objects carry **three** fields where these carry eight
(the five every exonode has, plus `values`, `writers` and `schema`); and it prices an
object built, called once and
dropped. The **mechanism** is what transfers — one prototype install per object,
independent of how many fields follow it — and the nanoseconds are that axis's,
on that scene, not this one's.

`Object.create` measured level with `new` and either would have done. `new` is
here for the half of the old header that was right: `Object.create(backend)`
followed by assignments grows the object **out of its in-object slots** — that
axis's own census counts its stores as map transitions on a growing object with a
separate backing store — while V8 sizes a constructor's in-object store from the
fields the constructor body assigns. Only the **creation** half of that is
measured; the layout half is reasoning, not a reading.

## Build the backend once

`exoStrSchemaOf(schema, backend)` hangs the compiled schema off the declaration, one link
per backend, compared by pointer. The backend is in the key because an exonode
takes its methods off `schema.backend` **as its prototype**, so a schema shared
between two backends would hand one backend's exonodes the other's methods,
silently. Every process in this tree holds one string backend, so the answer is
the first link: one field load, one pointer compare, return.
**A backend built per request is a compile per request**, of every declaration on the
page — the whole markup cut, every time.

## Traps

-   **Void elements** (`<br>`, `<img>`) refuse content, and the check survives a
    production build: emitting `<br>…</br>` re-parses into **two** `<br>` elements
    with the content between them, while `@exodra/dom` builds the element and drops
    the content. One schema, two pages.
-   **`<pre>`, `<listing>`, `<textarea>` eat a leading newline.** The parser throws
    away a single U+000A after those three start tags, so a text port whose value
    begins with one is served short. The writer emits the spec's optional newline
    exactly when the content begins with one. `\r` is **not** handled: the input
    preprocessor turns CR into LF before tokenisation, and the fix belongs to
    `escapeExoText` in `@exodra/core`.
-   **Raw-text elements are not escaped.** Inside `<script>`/`<style>` the
    serialisation algorithm writes a Text node's data as it stands, so escaping
    turned `.a > .b` into a CSS rule matching nothing and `a && b` into a syntax
    error — on both backends identically, which is why no parity test objected.
    The element's boundary is refused at schema-build time instead
    (`assertExoIntactRawTextBoundary`).
-   **Static text after a children port is refused**, out of one file shared with
    the DOM compiler: a region is anchored on the next static element there, so its
    rows land after that text in the browser and before it here.
-   **A children port that shares its element refuses `html`.** Raw markup is
    written with `innerHTML` in the browser, and `innerHTML` takes the whole
    element, siblings included. Printing it here would render on the server and
    throw the moment a browser touched it.
-   **A property with no markup form prints nothing** (`indeterminate`, `value` on
    a `<textarea>`) — which is what makes hydration's `repair-attribute` fire. Open
    gap: a `<textarea>`'s markup form is only its **default** value, so a served
    textarea is empty where the data is not.
-   **`el.value = undefined`** stringifies through IDL `DOMString`, so a client
    render puts the literal text "undefined" in an `<input>` where the server
    prints the empty value. Neither side is worth copying; pinned by name in
    `property-parity.test.ts`.
-   **`exoForeignMarkup` does not escape**, and cannot — at a child list's `insert` a
    foreign child and a rendered one are the same `string`. The caller owns the
    string. Hydration, lifecycle and well-formedness are not supported for it.
-   **A reconciled children port cannot be hydrated** — not this backend's refusal but its
    consequence. The server will happily print a reconciler's first pass; the adopting
    `openChildList` in `@exodra/dom` then refuses, rather than insert a second set of rows
    beside the ones served. A page that hydrates keeps `c.one` and `c.list`.
-   **A pack replacing a DOM-only field** (`events`, `writers`, `createChild`,
    `hydrateSurface`) composes here and is **silently inert**: this backend
    has none of those fields — only `createInstance` — and `composeExoPlugins` refuses no name.

## Escaping

Text and attribute values go through `escapeExoText` and `escapeExoAttributeValue`,
which live in `@exodra/core` so that the markup this package prints and the
markup `@exodra/dom` parses its prototype from are **the same bytes**. That
identity is what hydration rests on.

There is **no** `renderToStream`.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
