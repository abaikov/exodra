---
title: Eight things frameworks forbid
---

# Eight things frameworks forbid

Eight sentences that begin "you can't" in most UI frameworks. For each one: what
the common arrangement is, what Exodra does instead, and — the part that matters
— **the current state, with the file that proves it or the gap that undoes it.**

:::note How the eight map onto plugin interfaces
They do not line up one-to-one. **Two of the eight are backed by a field on
`ExoDomBackend`**: the event pack (7) and the value writers (8). The reconciler (2)
and keys (3) are free functions in `@exodra/list-reconcile` over the child-list door
every exonode has; keeping a subtree (4) is that same child list's `detach` /
`attach`; no build step (1) is a property of the component form; a foreign node (5)
is an escape from the schema rather than a part of it; and another renderer (6) has
no interface at all. See [Sugar, not restrictions](./sugar-not-restrictions.md).
:::

:::note About the "what others do" half
Those paragraphs describe the common arrangement as a shape, not as a claim about
any particular framework's source. Nothing in this repository measures or reads
React, Svelte, Solid, Lit or Vue internals, so no sentence here should be quoted
as a finding about them. The Exodra half of each item is read from this
repository and cited.
:::

## 1. "You need a build step"

**The common arrangement.** A template dialect or a JSX transform is the primary
way to write a component, so the framework's own documentation begins with a
bundler.

**Here.** A component is plain function calls —
`createExoSchema(build)` and `createExoMachine(schema)` with its decorators — so there is nothing to compile. Two pages in
`packages/examples/no-build/` run a real application with nothing installed and
nothing bundled: `esm.html` reaches the three packages by **bare name** through
an `importmap`, a browser feature; `global.html` loads three `<script src>` IIFE
builds onto one `window.Exodra` namespace. Both were opened in a browser and run
on 2026-08-15.

**Current state.** The pages load this repository's own `dist/`, so those have to
be built first — the last _published_ `@exodra/core` is `0.2.0`, a renderer that
has since been deleted, so a CDN URL would load a different program that happens
to share a name (`packages/examples/no-build/README.md`).

**And the honest exception: JSX does need a compiler, by design.** The JSX
runtime exists only so a `tsc` emit resolves, and every entry point throws:

```ts no-check
// packages/jsx/src/schema/jsx-runtime.ts:539
throw new Error(
    'Exodra schema JSX reached the runtime, which means this module was never compiled. ' +
        'Add @exodra/babel-plugin-schema to the build …'
);
```

There is no interpreter for a JSX element, and there is deliberately no
`Fragment`. Writing JSX means adopting a build step; writing Exodra does not.

## 2. "The reconciler is the framework"

**The common arrangement.** How children are diffed and moved is the framework's
central algorithm, and there is no interface anybody outside it can implement.

**Here.** The reconciler is not part of the backend at all. It is a function made once by
`createExoChildrenReconciler(rowMachine)` from `@exodra/list-reconcile`, which a transition
calls as `reconcile(c, port, items)` over doors every exonode has — the children port to
place a row, and `c.createExoNode(component)` wired with the item to make one
(`packages/list-reconcile/src/createExoChildrenReconciler.ts`). Outside a reconciler the same
port takes `c.appendChild`, `c.insertChild`, `c.moveChild` and `c.removeChild` —
see [Children](../guides/children.md). It remembers the order it showed per node and port,
so the machine keeps nothing for it. A second strategy is a second function over the same
doors, with no reconciler to subclass and nothing to opt out of. The same call takes
`{ key }` for the same pass over an extracted key instead of the item object — see item 3.

**Current state.** A reconciler that reads a child's old position off the
**document** instead of off its own mirror — so a region repairs itself when a
browser extension or a page translator moves a child — is not in the tree. It would
be one more function over the same two doors.

## 3. "Rows are matched by key, and the key rules are ours"

**The common arrangement.** A list requires a key, and identity is not offered as
a choice.

**Here.** The core reconciles by **object identity** — a child that is still in
the array is moved, a child that is not is dropped, and neither is rebuilt
(`reconcileExoOrder`, `packages/list-reconcile/src/reconcileExoOrder.ts`).
Keys are an opt-in: `createExoChildrenReconciler(rowMachine, { key: (item) => item.id })`
matches rows by the key, and a key that stays under a new object keeps its row and
re-wires it with the new item. It is a case about a data layer: a caller whose rows arrive as freshly
parsed JSON on every poll has a new object per row per refetch, and telling them
to build a stable object per entity first is telling them to write that file.

**A page you can open.** `packages/examples/plugin-slots/keyed-list.html` renders
one row component twice over the same data — left reconciled by identity, right
keyed by `item => item.id`. Button 1 hands both panels a
**refetch**: the same ids and labels as `JSON.parse(JSON.stringify(…))`. The left
panel has three rows it has never seen and rebuilds all of them; the right keeps
all three and the build stamps stand still. Button 2 changes the labels: the right
panel's rows stay and their labels move, because the keyed side updates the row it kept
with the new item (there are no props).
Button 3 repeats an id: a repeated key is one row per occurrence, as a repeated
item is in an identity list.

**On the server and under hydration.** The string backend takes a row's markup when
its parent's markup is taken, so a row's wire still reaches the page, and a list is
printed once and never updated. Under hydration each row, the first time it is placed,
takes the element the server printed at that position of that port, as for an identity
list ([Children](../guides/children.md#hydration)); the keyed list has no
hydration test of its own.

## 4. "You cannot keep a subtree alive, or pool it"

**The common arrangement.** A view that leaves the tree is destroyed, and reuse
is the framework's business.

**Here.** The lifecycle object _is_ the child, and it is the public extension
point:

```ts no-check
// packages/dom/src/dom/types/TExoDomChild.ts — `mount`/`unmount` are called blindly
const block = c.createExoNode(DETAILS);
wireExoNode(block);
exoNodeDom(block).unmount = NOTHING;   // keep my subscriptions, I am coming back
```

From then on, taking it out of the source array detaches the node and changes
nothing else; putting it back is one `insertBefore`. The list is not involved in
that decision and contains no word about caching.

**What that is worth, measured.** The toggle axis — 20 × tear down a 200-panel
block and build a different one, ms per timed region, lower is better:

<!-- gate: axis=toggle label=base1 -->

| Participant                    | ms      |
| ------------------------------ | ------- |
| exodraKept (panels kept alive) | **3.3** |
| mikadoPooled                   | 3.5     |
| mikado                         | 7.4     |
| exodra (out of the box)        | 10.2    |

Out of the box this axis is Exodra's weakest: 10.2 against mikado's 7.4, because
the axis is dominated by rebuilding. The extension point is what closes it — 10.2 → 3.3,
which is **3.1×**, and ahead of the pooled hand-written participant.

**Which run this is, and what the figures used to say.** The four numbers above
are the medians in `packages/benchmarks/.gate/toggle.base1.json`. The figures
printed here before — 3.8 / 4.1 / 8.3 / 11.1 — were in neither toggle recording
and were retyped from somewhere the repository does not hold; they have been
replaced rather than defended. The second recording, `toggle.base2.json`, has the
same four rows at 3.0 / 3.1 / 6.6 / 9.1 — the whole table sits 10–14% lower
and the argument is unchanged, because it is 3.1× in one run and 3.0× in the
other. Both recordings are of the **rescaled** toggle axis (200 panels ×20; the
old axis measured 25 panel builds per sample and landed five participants on one
timer tick), and [Benchmarks](../benchmarks.md) now publishes both columns in
full.

**The port-method form.** `c.removeChild(node)` takes a child out of the tree without
destroying it — state, element, effects and subscriptions are kept — and
`c.insertChild(port, node, at)` puts it back. A kept child is ended by
`destroyExoNode(node)` ([Children](../guides/children.md)).

**There is no element pool.** The pooling half of the heading — handing an element
that served one wiring to the next — has no seam: every instance's element is
`cloneExoNode` on the schema's prototype. What an application keeps instead is the
**whole exonode**, wired and subscribed, through either form above.

## 5. "You cannot drop to vanilla JS in one hot spot"

**The common arrangement.** An element the framework did not create is not
something a list can hold, so a hand-written hot spot means an escape container
plus a lifecycle hook plus a rule about not letting the framework near it.

**Here.** `exoForeignNode(c, element, hooks?)` gives an element the half a child
needs — `mount`, `unmount`, disposers, the list's scratch — so that from the
list's point of view nothing foreign is happening
(`packages/dom/src/foreign/exoForeignNode.ts:21-59`). It travels the same lines as
every other child: placed, moved, dropped, disposed.

**Current state.** `packages/examples/escape-hatches/` runs it: one row of an
ordinary list built with `document.createElement` and `addEventListener`, standing
among schema-built siblings, reordered with them and put back with its own state.
The hand-built row is `escape-hatches/index.html:211-273` — no schema, no ports, no
wiring function, no `c.attr` — and it goes into the same children array as three
schema rows at `:451-456`. Opened in a browser and run on 2026-08-15. How to use it —
and the trap in the `onMount` hook — is [the next page](./imperative-escape.md).

## 6. "You cannot run another renderer inside part of the tree"

**The common arrangement.** Two renderers in one document means two roots and a
manual boundary between them.

**Here, in the narrow sense: the same door.** A subtree owned by something that
has never heard of Exodra arrives through `exoForeignNode` and is placed, moved
and disposed like any other child. The escape-hatches page runs a canvas widget
with its own `requestAnimationFrame` loop between two schema-built cards. The
widget is `packages/examples/escape-hatches/index.html:287-325` — lines that
know nothing about schemas, ports or children. Its whole contract with Exodra is
two hooks at `packages/examples/escape-hatches/index.html:338-354`, and the
`onUnmount` one is what stops the loop; the page shows the frame counter
freezing when it does. It sits between two schema cards
in one children array at `:382-386`. What must be true of such a widget is stated
where it is built (`:203-208`): it renders **inside** the box it hands out and never
moves or replaces that box, because removal and placement climb `parentNode` only
as far as the list's parent, so a box moved out of that parent is beyond reach. Opened
in a browser and run on 2026-08-15.

**Not yet true as a general claim, and this is the item to be blunt about.**
There is **no foreign backend behind a plugin interface.** An element carries no
pointer back to its child and `exoNodeDom` takes a child and refuses anything else
(`packages/dom/src/dom/exoNodeDom.ts`): the renderer holds children as `TExoDomChild`s
directly and never needs an element→child read at all. What is deliberately outside every plugin interface is the
_create_ direction — `makeNodeDom` is the one place a child is constructed and is not exported. So:

-   What works is **one element handed in**, filled by whatever you like, treated as
    an opaque child. Client render only.
-   What does not exist is a second _renderer_ plugged into the schema — there is no plugin
    interface for the element builder, the schema compiler, or hydration's adoption **walk**. The
    attribute and text **setters** are behind the `writers` interface, which is
    [item 8](#8-you-cannot-change-what-a-value-means-on-the-way-to-the-element).
    The _children_ arm of that same branch stays welded on
    purpose — `compileExoHydrateSchema.ts:44-49` identifies a raw-markup port by
    pointer-comparing its setter against `setExoHtml`.
-   On the server a foreign node is markup the caller supplies: `c.foreign(t)` calls
    `t.createStr()` there (`packages/string/src/foreign/constants/EXO_STR_FOREIGN_VOCABULARY.ts:7-9`),
    and `exoForeignMarkup(markup)` is the unescaped string it hands back. The parameter
    type is the only guard — nothing at runtime tells markup from `[object Object]`.

## 7. "How a listener gets attached is the framework's business"

**The common arrangement.** Either every handler is a real `addEventListener` on
its element, or every handler goes through one delegated document listener. Which
one it is was decided by the framework's authors, and an application that wanted
the other has no way to say so.

**Here.** `ExoDomBackend.events`
(`packages/dom/src/events/types/TExoEventsApi.ts`) holds a `TExoEventsApi`,
and this library already had two: `EXO_DIRECT_EVENTS` — one listener per element,
which is what composing nothing gives you — and `createExoDelegatedEvents(['click',
'input'])`, which puts one listener per named event on the render root.
Both are exported. Swapping is the five-line composition on
[Every convenience is sugar](./sugar-not-restrictions.md#replacing-one-interface).

**A page you can open.** `packages/examples/plugin-slots/events.html` renders 200 rows
of one component twice and counts `addEventListener` for the duration of each render —
the only honest observable for this interface, since no DOM API reports how many listeners
exist. Both panels answer clicks; only the counts differ. The whole of what an
application writes is `events.html:150, 183-184`. The page also carries the constraint the
interface imposes and does not hide it (`:79-84`; the refusal is
`packages/dom/src/events/attachExoDelegatedEvent.ts:7`): **a delegated pack refuses a fill with no
subject**, because a listener on the render root finds the handler by reading the element
and the subject beside it is the only thing that tells one shared function which row fired.
That form — a module-level function plus a subject — works under both packs, which is what
lets one component be rendered twice with only the composition changed. **Not opened in a
browser**, and the `addEventListener` count is an instrument, not something an
application should do.

**The interface is the model the rest follow**, and it is worth reading for
that alone: an inert **value** — `{ name, attacher(event), install?(root) }` — with
no registration call, no lifecycle and no global. `attacher` is called **once per
event port per schema**, while the plan is compiled, and what it returns is stored
in `plan.setters` beside the attribute writers. So filling an event port stays two
array loads and one indirect call, **with the strategy already baked into which
function got loaded** — the choice is spent at compile time and never consulted per
row, per update or per dispatch. `install` is the once-per-render-root half that
the delegated strategy needs, and a pack that needs nothing leaves it undefined, so
the common path does not test for it.

**Current state, and two behaviours legitimately change with the pack** — which is
why they are documented rather than tested for. A node moved out of its root
**stops responding** under a delegated pack. And disposal is not symmetric: direct
listeners die with their node, delegated ones die with the render's scope. A second
pack also has two rules on it, both because getting either wrong double-dispatches
silently, which looks like nothing happening: namespace the per-element event slots
through `exoEventSlotsFor(packId, event)` with a pack id unique to the pack, and
reference-count anything put on a root, because `install` runs once per **render**
and two renders can share one parent (`installExoDelegatedRoot` is the counted
implementation and is exported).

## 8. "You cannot change what a value means on the way to the element"

**The common arrangement.** The framework decides whether `foo={x}` is an
attribute or a property, usually by a name table it owns, and a value that is not
a string has no route to the element at all.

**Here.** `ExoDomBackend.writers`
(`packages/dom/src/backend/types/TExoWritersApi.ts`) decides how an
attribute or text port's value reaches an element. `EXO_SHIPPED_WRITERS` is the
default; `withExoPropertyWriters` (`packages/dom/src/plugins/exo-property-writers/`) is
the second implementation, and it writes a custom element's ports as JavaScript
**properties** (`chart.series = rows`), delegating every other element, every
global attribute and every text port to the shipped pack unchanged.

**A page you can open.** `packages/examples/plugin-slots/value-writers.html` defines a
`<price-chart>` custom element that draws whatever array it is handed
(`value-writers.html:83-118`) and renders **one** schema twice
(`:130-152`): on the left the port becomes `setAttribute('series', String(rows))` and
the element receives nothing it can use; on the right it receives the array itself. The
readout prints `el.series` and `el.getAttribute('series')` side by side, so the
difference is not a claim. The page also carries the upgrade dance any element needs
that expects a property before it is upgraded (`:91-105`) — an instance is wired and
inserted afterwards, so the write lands while the element is still a plain
`HTMLElement` — and names the leftover ` series=""` placeholder out loud. **Not opened
in a browser**, and it is a client render for the first reason listed below.

**This is the one plugin interface that exists because the shipped answer CANNOT
do something, rather than because it might be beaten.** `setAttribute` takes a
string. A custom element that accepts an array of rows, a `Date`, a `Map` or a
callback is not badly served by this renderer — it is **unreachable from a
schema**, and the only escape was `exoForeignNode`, i.e. building that subtree by
hand outside the schema entirely. The second case is the one enterprise pages hit:
a policy in front of the write — Trusted Types wanting every `src`, `href` and
`srcdoc` through a policy object; an audit build recording every attribute write
with its port. Both are "wrap what the shipped pack returned", both are five lines
against this interface, and both were unspellable.

**What it costs on the hot path is structurally zero**, which is a stronger
statement than "measured at zero". The pack is resolved once per (schema,
composition) and spent immediately into `plan.setters` — the table every fill
already loads from — so `TExoDomNode.set`, `.bind` and the three hydrate fill
sites are byte-for-byte the code they were. There is no added load, branch or call
on any per-instance, per-row, per-update or per-event line. The added work is one
map lookup and one call per port, per schema, per process, next to a `<template>`
parse.

**Current state, and what it gives up.**

-   **The server is not composed.** `@exodra/string` compiles through its own
    `EXO_STR_WRITERS` by module import, so it prints the stringified attribute for the
    same port. **Byte parity between the backends is a
    property of the shipped pack alone.**
-   **Hydration keeps the live writer for a taken-over port.** A pack declares
    `markupCarries: false` for a port whose value no bytes could have carried, and
    `compileExoHydrateSchema` does not give those ports a repairing fill
    (`packages/dom/src/hydrate/compileExoHydrateSchema.ts`), so an adopted element
    receives its first property write.
-   **One route bypasses it.** `portNodeWriter()` loads the setter table once and
    addresses ports by number from then on, so a pack sees the write it handed over and
    nothing after it. Every other route — `c.attr`, `c.text`, and the repeat writes
    a transition makes through them — goes through the table on every
    fill.

## The open holes, in one place

**Hydration DOES hand a reconciler the server's rows, and this paragraph said
the opposite.** `openChildList` on a hydrating exonode answers `[]` and opens an
adoption cursor over what the server printed, so the reconciler's opening pass —
one `build` per item — adopts those rows instead of building beside them
(`packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts:214-232`). One shape is
refused, and only one: a child list standing directly behind another with no
static element between them, where no walk can find the first list's end
(`packages/dom/src/hydrate/asserts/assertExoPluginChildList.ts:4-14`).

**A machine that reaches for an element cannot be server-rendered.** The declarative
surface runs on all three backends; the moment a machine calls `exoNodeDom` it is a
client machine, and nothing on the exonode lets it ask which backend it is on.

This is [page four's subject](./imperative-escape.md#the-backend-split).

**Three defects the suite was red on. Two are closed; the third is closed too, and
this section is kept because how they closed is the argument.** None was ever pinned
as a green `it.fails`.

1. ~~**A `checked={false}` box comes back ticked after `form.reset()`.**~~ **Closed
   2026-08-16.** A port has to occupy a position, so the prototype markup carried
   `checked=""` for every `checked` port and every clone parsed as
   `defaultChecked === true`, while the server printed no attribute at all — one
   component, one wire, two different answers to `form.reset()`. The fix is in the
   DOM setter: write the PROPERTY, then the attribute. Assigning the property sets
   the control's dirty flag, and HTML only re-derives live state from an attribute
   while that flag is clear, so the second write moves the reset value and cannot
   move the control. The same line covers `value`→`defaultValue` and
   `selected`→`defaultSelected`. Its price is one extra
   `setAttribute`/`removeAttribute` per fill of such a port.
2. ~~**A `<select>` serves the first option where the data says the second.**~~
   **Closed 2026-08-16, by refusal rather than by machinery.** "This option is
   chosen" is a `selected` attribute on the **option** — a different element, later
   in the document than the port's own slot, and a writer standing in a `<select>`'s
   open tag can never reach it. The alternative was a port that writes into more than
   one slot of the plan: a change to the wire format, whose static-options-only
   version would have left the common case (options from a list) silently wrong. So
   `port('value')` on a `<select>` now throws from `ExoSchemaBuilder.port()`, before
   either backend exists, naming `port('selected')` on the option as the replacement.
   `@exodra/forms` marks a select accordingly: one `selected` port per option, the
   same shape as a radio group's `checked` ports, and `writeExoChoice` writes `true`
   to the one option whose value is chosen. The browser clears the rest of a single
   `<select>` itself, so it is one write whatever the number of options. A selection
   a person makes moves the mark natively and writes nothing.
3. ~~**A raw-markup port does not repair a stale server value on hydration.**~~
   **Closed 2026-08-16.** The objection that blocked it for so long was sound: the
   parser normalises what it parsed (`<br/>`→`<br>`, quoting, attribute order), so a
   byte compare against `el.innerHTML` reports mismatches on markup that is nothing
   of the kind. The answer is two comparisons — the cheap one first, and on a miss,
   parse the candidate into a **shallow clone of the element** so it gets the same
   fragment-parsing context, and compare the two serialisations. Equal writes
   nothing. It costs one `innerHTML` read per bound raw-markup port per hydrated
   instance, and nothing on any render, update or reconcile path.

**What is still red: nothing.** The suite is green. That sentence is only worth
anything for as long as it is true, so it is the first thing to check against a run
rather than to trust from this page.
