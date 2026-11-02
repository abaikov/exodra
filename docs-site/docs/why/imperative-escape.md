---
title: The imperative escape
---

# The imperative escape

Some views are not worth describing declaratively. A body of text that has to be
re-marked on every keystroke, a canvas, a widget somebody else wrote, a
measurement that only the live element can answer — for these, the shortest
correct program is imperative, and a framework that will not let you write it
makes you write a worse one instead.

So this page is two halves: **we give you the element**, and **here is a real
imperative hot spot, done almost vanilla**.

## We give you the element

`exoNodeDom(child)` opens the lifecycle object behind a built child, and
`.node` is the element (`packages/dom/src/dom/exoNodeDom.ts:10-15`):

```ts no-check
import { exoNodeDom, exoOnTeardown } from '@exodra/dom';

const panel = c.build(Details);

const element = exoNodeDom(panel).node;   // the real Element, right now
exoOnTeardown(exoNodeDom(panel), () => socket.close());   // run this when it leaves
```

`exoOnTeardown(child, off)` pushes a teardown onto the child's own `disposers`
(`packages/dom/src/dom/exoTeardownScope.ts:30-38`); the child's default `unmount`
runs them. Assigning `exoNodeDom(child).unmount = NOTHING` is the other direction
— it is how a child says "keep my subscriptions, I am coming back", and it is
what the toggle-axis numbers on
[the previous page](./what-others-forbid.md#4-you-cannot-keep-a-subtree-alive-or-pool-it)
measure.

### What the two hooks guarantee

- **`onUnmount` runs while the element is still attached.** `dropExoChild` calls
  `child.unmount()` first and removes the node afterwards
  (`packages/dom/src/dom/dropExoChild.ts:12-17`), and `clearOwnedExoChildList` calls
  every one of them with the whole child list still in the document. A widget that has to
  tear itself down against a live tree can.
- **`onMount` runs after the element has been put in its parent.** The child list's
  `insert` calls it after its `appendChild`/`insertBefore`
  (`packages/dom/src/dom/factories/createExoChildList.ts:53-67`); `attach` is the one
  placement that skips it (`createExoChildList.ts:160-171`).
- **Both fire again on every re-entry and re-exit.** A child that leaves a list
  and comes back is moved, not rebuilt, so its hooks run again.

### The trap: the first `onMount` is not in the document

`onMount` promises a **parent**, not a connection. `mountExoInstance` clones the
prototype, **arms the machine** on it — which is when its children ports are filled and its
children are inserted and mounted — and inserts the whole clone into the page
**afterwards**:

```ts no-check
// packages/dom/src/dom/mountExoInstance.ts:23-47, cut to the four lines that matter
const root = schema.acquireNode(schema);
createExoNode(schema, root, machine, ownerChild, record, context, params);
if (before === null) parent.appendChild(root);
else parent.insertBefore(root, before);
```

So on a first render a child's `onMount` fires inside a clone that nobody has
appended yet: `element.parentNode` is set and `element.isConnected` is **false**.
Put the same child back later, into a page that is already on screen, and the
same hook reports `true`. This is visible on the escape-hatches example page,
whose first log line reads `in the document: false`
(`packages/examples/escape-hatches/README.md`).

A hook that measures a box, focuses something, or hands the element to a library
that reads layout has to check `isConnected` rather than assume it. There is no
"connected" hook today.

### The backend split

**A wiring function that reaches for an element is a client-side wiring
function.** This is not a style rule; it is a throw.

The same machine runs on `@exodra/string`, where a `TExoNode` **is** a string of
markup. `c.build` there hands back markup, so `exoNodeDom` refuses with *"this
node was not built by c.build(...)"* — during the **server render**, before the
browser is anywhere near it. The type system says so first: a machine built with
`createExoMachine<TExoDomNode>` is not one `ExoStrBackend.render` accepts, and the
case that pins the runtime half casts past that on purpose
(`packages/conformance/src/tests/an-element-wire-is-client-only.test.ts`).

Two consequences:

1. **The declarative surface is the portable one** — `attr`, `text`, `on`, `one`,
   `list`, `build`, `childList`, and `reconcileExoOrder` over them.
   `exoNodeDom` and `exoForeignNode` are `@exodra/dom`'s doors to a DOM node, and
   importing one pins the module that calls it to the browser — `exoForeignNode`
   takes an `Element` in its signature (`packages/dom/src/foreign/exoForeignNode.ts:21-25`).
2. **The portable way in is `c.foreign(t)`**, a pack every backend composes
   (`EXO_DOM_FOREIGN_VOCABULARY`, `EXO_STR_FOREIGN_VOCABULARY`,
   `EXO_TERM_FOREIGN_VOCABULARY`). `t` carries one half per backend — `createDom`,
   `createStr`, `createTerm` — and each backend calls its own, so the element is
   only ever touched by the browser half. `exoBackendCompatible(BACKENDS,
   'foreign', t)` checks at compile time that `t` has a half for every backend the
   application lists, and that every listed backend composed the door. There is
   still no capability query: nothing in a machine asks which backend it is on.

Everything below is therefore **client-rendered**. It is not written as something
that server-renders, because it does not.

## Search highlighting in rich text

The view: a long body of text, and a search box. Every hit of the query has to be
wrapped in a `<mark>`, live, as the user types.

**Why a schema tree is the wrong shape here.** The number of nodes is a function
of the *query*, not of the data — one keystroke can take the text from one node
to two hundred and back to one. Expressing that declaratively means turning a
string into an array of segments on every keystroke, diffing that array,
building a child per segment and reconciling them, to produce a result the
browser can also get from clearing one element and appending text nodes into it.
The reconciler would be doing careful work to avoid work that is cheaper than the
care.

The right shape is the imperative one: **one element you own, repainted.**

### The code

```ts no-check
import { EXO_PORT_CHILDREN, EXO_PORT_EVENT, createExoMachine, createExoSchema, exoPorts, withExoHandlers } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { ExoDomBackend, exoForeignNode, withExoChildList, withExoCompiler } from '@exodra/dom';

/** What the user typed: a tiny store of the application's own, nothing Exodra about it. */
function createTextStore(initial: string) {
    let value = initial;
    const listeners = new Set<() => void>();
    return {
        getValue: () => value,
        setValue(next: string): void {
            value = next;
            listeners.forEach((listener) => listener());
        },
        onChange(listener: () => void): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
const query = createTextStore('');

const ARTICLE =
    'Exodra compiles a component once, at module load, into a prototype element ' +
    'and a setter per port. A render is a clone plus one indirect call per port. …';

/**
 * PAINT THE TEXT INTO A BOX, WITH EVERY HIT IN A <mark>.
 *
 * Not one line of this is Exodra — createElement, textContent, append. It is the
 * program you would write if there were no framework on the page, and that is
 * the point: the framework's job here is to place this box and tell it when it
 * comes and goes, not to have an opinion about how the text is marked.
 */
function paintHighlights(box: Element, text: string, needle: string): void {
    box.textContent = '';
    if (needle === '') {
        box.append(text);
        return;
    }
    const hay = text.toLowerCase();
    const q = needle.toLowerCase();
    let at = 0;
    for (;;) {
        const hit = hay.indexOf(q, at);
        if (hit === -1) break;
        if (hit > at) box.append(text.slice(at, hit));
        const mark = document.createElement('mark');
        mark.textContent = text.slice(hit, hit + q.length);
        box.append(mark);
        at = hit + q.length;
    }
    if (at < text.length) box.append(text.slice(at));
}

/** The hot spot, as a child Exodra can place, move and dispose. */
function highlightedText(c: TExoDomNode, text: string) {
    const box = document.createElement('div');
    box.className = 'rich-text';
    let off: (() => void) | null = null;

    return exoForeignNode(c, box, {
        // SUBSCRIBE HERE, NOT AT CREATION, and see the open questions below for
        // why this is not the same as `exoOnTeardown`: `onMount` fires again every time
        // this child re-enters, and `onUnmount` every time it leaves.
        onMount() {
            paintHighlights(box, text, query.getValue());
            off = query.onChange(() => paintHighlights(box, text, query.getValue()));
        },
        // Runs while the element is STILL ATTACHED (drop-child.ts:34-39).
        onUnmount() {
            if (off !== null) {
                off();
                off = null;
            }
        },
    });
}

const ReaderPorts = exoPorts({ field: EXO_PORT_EVENT, body: EXO_PORT_CHILDREN });

const readerSchema = createExoSchema(ReaderPorts, (b) => {
    b.el('div', { class: 'reader' }, (div) => {
        div.el('input', { class: 'reader-search', type: 'search' }, (input) => {
            input.eventPort(ReaderPorts.field, 'input');
        });
        div.el('div', { class: 'reader-body' }, (host) => {
            host.childrenPort(ReaderPorts.body);
        });
    });
});
const readerBaseMachine = createExoMachine(readerSchema, {
    createInitialState: (c: TExoDomNode) => {
        // ONE CHILD THAT NEVER CHANGES, built by the CALLER and placed through the
        // child list's own `insert` — there is no order to reconcile.
        c.childList(ReaderPorts.body).insert(highlightedText(c, ARTICLE));
    },
});
const readerMachine = withExoHandlers(readerBaseMachine, (on) => {
    on(ReaderPorts.field, (c, event) => {
        query.setValue((event.currentTarget as HTMLInputElement).value);
    });
});

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
backend.render(readerMachine, document.getElementById('root') as Element);
```

This matches the idiom in `packages/examples/escape-hatches/index.html`, which
does the same thing for a canvas widget: a container the widget owns, an `onMount`
that starts it, an `onUnmount` that stops it, and `c.childList(port).insert(node)`
as the door.

### Where the boundary sits

- **The box is the boundary, and it never moves.** Hand in an element and render
  *inside* it. Removal and placement both climb `parentNode`, so a wrapper put
  around the box travels with it, but **an element moved out of the parent is
  beyond the climb** — it is `exoForeignNode`'s one rule for the caller, stated
  in its own header (`packages/dom/src/foreign/exoForeignNode.ts:14-19`). Never
  let the imperative code move or replace the element you handed over.
- **The search input is ordinary Exodra.** It has a port, its handler is a normal
  machine handler, and it writes into a plain store. Only the repaint is imperative.
- **The query store is the seam.** The foreign node subscribes to it and the
  input's handler writes it; neither knows anything about the other.

### What you give up in that port

- **Server rendering, unless you hand the server its own half.** `c.foreign(t)` —
  a pack, composed on each backend — calls `t.createDom(c)` on the DOM backend and
  `t.createStr()` on the server
  (`packages/string/src/foreign/constants/EXO_STR_FOREIGN_VOCABULARY.ts:7-9`), so one `t`
  carrying both serves both, and `exoBackendCompatible(BACKENDS, 'foreign', t)`
  refuses at compile time a `t` that misses a backend the application lists; `exoForeignMarkup(markup)` builds the server half,
  and it does not escape — the caller owns that string.
- **Nothing is adopted for the foreign node itself.** While hydrating,
  `exoForeignNode` takes the server's row for that position off the adoption
  cursor and removes it, and builds a fresh element in its place;
  the rows around it are adopted as usual
  (`packages/conformance/src/tests/a-foreign-node-in-a-hydrated-list.test.ts`).
  `exoForeignNode` called directly, not through `c.foreign`, takes its row the same way.
- **Ports and bindings inside it.** A foreign node has no schema, so `c.attr`,
  `c.text` and `c.on` have nothing to address
  (`packages/dom/src/foreign/exoForeignNode.ts`). The two hooks are the
  whole interface.
- **Contexts.** A foreign node is not a wiring, so it neither provides nor
  injects. A machine that wants the foreign renderer to see a context value injects
  it in its initial state and hands it over as data.

## Open questions

This scheme is not finished, and these are the places where writing the page ran
into the API rather than around it. They are stated as questions because none of
them has been decided.

**1. How should a machine ask which backend it is on?** Today it cannot, and the
consequence is that a component with one imperative hot spot cannot be
server-rendered at all — it throws during SSR. Three shapes have been named and
none chosen:

- *A capability test* (`c.isDom`, or a kind tag on the connector). Cheapest to
  add; it also puts a branch into wiring functions and invites `if` ladders that
  each backend has to keep true.
- *A second, client-only initial state on the component.* Keeps every machine honest about
  its backend and makes the split visible at the component boundary; it is a new
  member on the component value and a second thing hydration has to reason about.
- *A backend-tagged escape that no-ops on the server* — `exoForeignNode` returning
  an empty string on `@exodra/string`. Least disruptive to write against; it also
  makes a page that silently renders a hole on the server look like a page that
  worked.

**2. Which channel ends an imperative subscription — the hook or `exoOnTeardown`?** Both
exist and they have different lifetimes. `exoOnTeardown` pushes onto `disposers`, and
the shared default `unmount` — `disposeExoChildSelf` — runs them and then
**clears the array**
(`packages/dom/src/dom/factories/createExoDomChildFactory.ts:22-36`), so an `exoOnTeardown` teardown is
one-shot: a child that leaves and re-enters has none. The `onMount`/`onUnmount` pair
fires on every entry and exit, which is why the example above subscribes in
`onMount`. Nothing in the API says which to reach for, and the wrong choice is
silent — a hot spot that stops updating after its first round trip through a
list.

**3. Is the child list the right and only door?** `reconcileExoOrder` is handed a *build
callback* and places whatever it returns
(`packages/list-reconcile/src/reconcileExoOrder.ts`), so a foreign node travels
through it only as an item of an order of nodes, with `(node) => node` as the callback.
Underneath is the imperative door the example above uses directly —
`c.childList(port)` and its `insert`
(`packages/dom/src/dom/factories/createExoChildList.ts`). An imperative hot spot
**inside a reconciled row of data** therefore means that row's own children are a second,
node-valued order. Whether the reconciler should accept a "this one is already built"
entry beside data items is open.


**4. Should a foreign node be able to declare what it depends on?** In the example
the box reaches `query` itself, from module scope. The machine cannot see that

dependency, so nothing in the component describes what makes this subtree change
— which is exactly the information the rest of the framework is built to make
explicit. A port that carried a source into a hook, without giving the foreign
node a schema, would close that; it does not exist and it is not obviously worth
its weight.

**5. Is there a "connected" hook?** No. `onMount` guarantees a parent, and the first
one is not in the document. Anything that measures has to test `isConnected` and
decide for itself what to do when it is false.
