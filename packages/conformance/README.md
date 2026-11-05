# `@exodra/conformance` — the cross-backend conformance suite

One RULE — a schema, a wiring, and something to do to it — asked of every rendering backend in the
repository through a small ADAPTER, recording one of three outcomes per backend: **AGREE**,
**DIVERGE**, or **CANNOT-EXPRESS**. Where the backends agree, the rule pins the agreement. Where
they do not, the rule pins the DISAGREEMENT, so that the day somebody settles the semantics the
assertion fails and says so, instead of letting a fix look like a regression.

The package renders nothing anybody ships. It is never published, never built into `dist`, and
reached through the root vitest alias exactly as `@exodra/test-utils` is.

## Why it exists

Eleven questions were found on which the backends answer differently — each is a rule file under
`src/rules/tests/`, and each file's header states the question and the fork. (The folder holds ten
files and nineteen named rules today.) Every one of them was found by a person reading four files
side by side; not one of them was seen by any test.

The single cross-backend gate in the repository before this package was
`packages/dom/src/tests/duplicate-item-parity.test.ts` — about thirty named rules, `dom → string` only,
living inside one package's test folder — and that file said out loud what was missing: the other
three backends were private and could not be imported from that package, and the cross-backend
conformance suite that would cover them was a separate piece of work. The file no longer carries that
sentence.

This is that piece of work.

## The four backends

| name      | package                 | has                                   |
| --------- | ----------------------- | ------------------------------------- |
| `dom`     | `@exodra/dom`           | element, update, live-tree, text-node |
| `string`  | `@exodra/string`        | element                               |
| `term`    | `@exodra/term`          | update, live-tree                     |
| `hydrate` | `@exodra/dom` (hydrate) | element, update, live-tree, text-node |

`hydrate` is the fifth PATH rather than a fifth package: it runs `@exodra/string` over the
component, puts those bytes in a container, and calls `hydrate` over the container with the SAME
component value. Its artefact is the tree a browser built from the server's markup after the client
adopted it — the only artefact in this suite that two backends had to agree in order to produce.
A server/client divergence is a claim about hydration in the end — "A server sending three `<li>` to
a client that builds two is not a rendering difference; it is a page whose markup and whose
hydration disagree about how many children a parent has"
(`packages/dom/src/tests/duplicate-item-parity.test.ts:8-10`) — and a table with the two halves in
it and not their meeting point would record the premise and omit the conclusion. That sentence is
written in the PAST tense in the file it comes from, because the fork it describes is closed: a
backend now has one list call, `c.list(port, component, rows)`, which builds a row per ENTRY of
`rows`, arms row i with `rows[i]` as its params, and consults no identity, so the two backends answer alike by construction rather than by agreement.

## How it is used

```ts
import { assertExoConformanceRule, renders, refusesAt, cannotExpress } from '@exodra/conformance';
import type { TExoConformanceMachine } from '@exodra/conformance';

declare const ONLY_CHILD: TExoConformanceMachine;

assertExoConformanceRule({
    name: 'html(port, markup) where the children port is its element’s only child',
    subject: () => ({ component: ONLY_CHILD }),
    probe: ['checked'],
    expect: {
        dom: refusesAt('wire'),
        string: renders(),
        term: cannotExpress('element'),
        hydrate: renders(),
    },
    agreement: [['hydrate', 'string']],
});
```

`assertExoConformanceRule` throws plain errors and imports no test framework. A rule is a value,
`runExoConformanceRule` is a function, and the check is an assertion over the two; keeping vitest out
of `src/` means the same rules can be run from a script, a REPL or a different runner.

Four assertions run, in this order, because each one makes the next meaningful:

1. **Completeness.** The rule's `expect` names exactly the registered backends. Runs before anything
   is rendered, so the failure names the missing key rather than a mystery verdict.
2. **The per-backend outcome**, including the CANNOT-EXPRESS cross-check in both directions.
3. **The partition** over the backends that rendered — where AGREE and DIVERGE actually live.
4. **UNDECLARED**, last, so a rule with one unknown backend still reports everything it DID
   establish about the others before it fails.

Every failure prints the whole table. A divergence is only readable next to what it diverges from,
and the commonest thing a reader needs is not "which assertion failed" but "what do the four of them
actually do". `runExoConformanceRule` + `describeExoConformanceRun` print that table without
judging, for finding out what the backends do today.

## The property it is built for

Adding a fifth backend, or changing a fourth, must fail LOUDLY rather than drift. Both doors are
mechanical and neither has a default:

-   **A rule must state what EVERY registered backend does.** Push a fifth adapter into
    `exoConformanceTrees` and every rule in the suite fails by name until somebody answers for it.
    There is no fallback, no skip and no snapshot to regenerate. Drifting past is exactly what happened
    to `packages/term`, which had been in this repository long enough to answer eleven documented
    questions differently from the two shipped backends without a single test noticing.
-   **A backend whose behaviour moves** produces a different verdict, the verdict falls into a
    different equivalence class, and the rule's declared PARTITION no longer matches. The failure
    prints both partitions and the whole table, so a reader sees what merged or split rather than
    "expected X received Y".

## What it refuses

### A rule cannot NAME a capability it needs

There is no `needs` field. CANNOT-EXPRESS is the one outcome that lets a backend out of a rule
without answering it, so the only safe way to reach it is from something the runner is ACTUALLY
GOING TO DO. Everything is derived from the rule's own subject and probe:

-   `subject.update` → `EXO_CAP_UPDATE`. The runner pulls it after the render. A backend that renders
    once and subscribes to nothing would report the unmoved artefact as a divergence.
-   `subject.fire` → `EXO_CAP_LIVE_TREE`. The runner dispatches it. There is nothing to dispatch into
    on a backend whose artefact is a string.
-   `subject.translate` → `EXO_CAP_TEXT_NODE`. The runner replaces a Text node. A backend holding its
    text in a FIELD has no node for anybody to replace.
-   `probe` non-empty, OR the schema puts an element in foreign content → `EXO_CAP_ELEMENT`.

There used to be a `needs: readonly string[]` unioned into the derived set, and it was a hole
through the registry's whole promise. Every cross-check in `assertExoConformanceRule` compares the
rule's EXPECTATION against the ADAPTER; nothing compared a declaration against the SUBJECT. So
`needs: [EXO_CAP_TEXT_NODE]` over a subject that never translated anything routed the two backends
without a text node to CANNOT-EXPRESS having asked them nothing, and the rule went green stating
nothing about either. The suite was already leaning on it: the third-party-mutation rule named
`EXO_CAP_TEXT_NODE` explicitly so the two backends missing it would report THAT capability rather
than the one the derivation reached first — which meant the recorded reason for a backend's absence
was decided by `Set` insertion order in a helper. A verdict now carries EVERY missing capability, so
nothing has to be steered and nothing is dropped.

**The foreign-content clause is the one that needs an argument**, because unlike the other three it
is not a lever the runner pulls — it is a property of the ARTEFACT. `<svg>` and `<math>` are the only
two doors into foreign content in HTML, and foreign content is the only place a page gets a
namespace: outside it every element is HTML and every attribute the parser produces has a null
namespace. A schema containing one produces an artefact carrying namespace information
(`@http://www.w3.org/2000/svg` on the element line, `…/xlink|href` in an attribute key), and a flat
`Record<string, string>` keyed by markup spelling has nowhere to put it. Asking such a rule of a
backend with no namespaces would make it diverge from all four others ON THE ELEMENT LINE for a
reason that is the sketch's grammar rather than the renderer's.

**Where that derivation under-reaches, stated:** a row component named by a
`createExoChildrenReconciler` reconciler, or by `c.list`, is reached from inside the WIRING closure and is not in the schema, so
foreign content inside a list row is invisible to it. That
errs in the safe direction — the backend is ASKED rather than excused — and the rule then fails at
the partition with the two artefacts printed, which is a loud wrong answer rather than a quiet green
one.

**What still buys a CANNOT-EXPRESS and cannot be mechanised away: an IDLE LEVER.** `update: () => {}`
moves nothing, a probe of a name no rule reads prints the same `∅` on every element backend, and an
`<svg>` nobody asked about is still an `<svg>`. Each excuses a backend for a reason the rule does not
really have. The difference from the old field is that an idle lever is IN THE SUBJECT, where a
reader of the rule sees it; a declared string was visible nowhere at all.

### `UNDECLARED` is an expectation, never an outcome, and it ALWAYS FAILS

It means: this suite's author did not know, and did not invent an answer. Not a skip, not an
`it.fails`, not a snapshot that records whatever happened — a FAILURE whose message carries the
verdict the run actually produced and asks for it to be written down. `no-pinned-defects` in this
repository's memory says a known gap is never parked as a green anything.

### A CANNOT-EXPRESS names EVERY missing capability, and a subset fails

A backend can be missing two of the four at once, and which one gets blamed is not a detail: the
server has no update AND no text node, `packages/term` has an update and no text node, and
`rules/tests/surviving-a-third-party-dom-mutation.test.ts` is about precisely that difference.

### A refusal is compared by its STAGE, never by its words

Four backends refusing one shape at `set()` with four different sentences are ONE behaviour: an
author writing that shape gets a throw from the connector on all four. Comparing the sentences would
report a four-way divergence where there is none, and would break every time somebody improved a
message. What IS compared is the layer — "compiles here and throws there" and "refuses in both
places" are genuinely different programs, which is the whole subject of
`rules/tests/html-on-a-children-port.test.ts`. The message is still carried on the verdict as evidence,
printed in every failure, and a rule may hold one backend to a `RegExp` over it where the words are
the point. What it may not do is decide agreement.

### A CANNOT-EXPRESS verdict has NO equivalence class at all

It is excluded from the partition rather than grouped with other absences. "This backend has no such
concept" is not a way of behaving — two backends that cannot express a rule have not agreed about
anything, and printing them as an equivalence class would be the suite claiming a consensus that
does not exist. Refusals are excluded too: a rule's `expect` already holds every refusing backend to
an outcome AND a layer, which is strictly more than group membership would say, and putting them in
the partition as well would make every such rule state one fact twice in two notations that could
disagree.

### The adapter has no `update` and no `markup`

No `update`: a rule owns its own sources, because the source has to be FRESH PER BACKEND — one cell
read by four renders in turn is three renders reading somebody else's leftovers. The rule hands the
runner a `subject()` factory and keeps the levers; the adapter never sees them.

No `markup`: it was on an earlier draft and earned nothing. For `@exodra/string` the markup IS the
artefact's source; for `@exodra/dom` `innerHTML` is a RE-SERIALISATION of a tree rather than the
bytes anybody sent; for `packages/term` there are no bytes at all. Comparing three different
relationships to one string is the kind of normalisation this package exists to refuse.

### The hydrate adapter refuses `n > 1`

`hydrate` takes `parent.firstElementChild` and adopts THAT — one instance, by definition, since no
entry point takes a count. The other adapters make several instances by calling `render`
several times; calling `hydrate` several times would adopt the same first element again and again,
and rendering `n` instances' markup and adopting one would leave `n - 1` elements standing unadopted
— a divergence this suite would report as hydration's when it is the harness's. No rule asks today:
`TExoConformanceSubject.instances` is unset everywhere, so every rule runs at `n === 1`, where all
four adapters agree.

### Every fill REPAIRS on the hydrate path

It does not write blind and it does not skip: an adopting `attr` / `text` / `html` compares what the
server printed against what it is handed and writes only on disagreement (`TExoWiring`'s own note).
So a rule that fills a port on this path is measuring that contract — a value the client computes
differently is corrected, and an agreeing one leaves the served node untouched. A rule should say
which of the two it is about rather than report a surprise.

The earlier contract was the opposite — `set()` wrote nothing here — and any rule still written
against that reading is measuring something the code no longer does.

### Three private dependencies are deliberately not declared

`@exodra/term`, `@exodra/test-utils` and `@exodra/conformance` itself. None is published, none is
built to `dist`, and all three are reached through the root vitest alias and the root tsconfig paths
rather than through an install. Declaring one would assert an install relationship that does not
exist, which is the thing `no-undeclared-dep` exists to catch; `tsconfig.depcruise.json` carries the
mappings instead, so those edges resolve OUTSIDE `node_modules` and the crawl types them `local`.
The reasoning is `packages/benchmarks`', written out in that file beside its own private mappings.

## The comparable artefact — the SKETCH

The backends produce four different KINDS of output — a live DOM subtree (`@exodra/dom`, hydration),
a string of markup (`@exodra/string`), a live plain-text tree (`packages/term`), and for several
rules a thrown error instead of any of them. There is no single value they all hand back, so
"compare the results" needs a normalisation, and the normalisation is the part of this suite that
has to be defended rather than assumed.

The SKETCH: one line per node, indented two spaces per level of depth.

```
ul
  li class="row" data-i="0"
    "alpha"
  li class="row" data-i="1"
    "beta"
```

An ELEMENT is its local name, then its namespace when that is not HTML, then its attributes sorted
by key, then any DOM properties the rule asked to probe. A TEXT RUN is its own line, quoted. That is
the whole grammar.

### Why it is defined post-parse — the one real decision

`@exodra/string`'s output is BYTES. Any tree view of it needs a parser, and the choice is between
comparing bytes to bytes (which `packages/dom/src/tests/property-parity.test.ts` already does for two
backends, and which `packages/term` can never join) and comparing PAGES. This suite compares pages,
and the argument is the repository's own:

> "THE STATE, WHICH IS THE CLAIM THAT MATTERS — the control a browser builds from the server's
> bytes against the control the DOM backend builds. This is what a reader of the served page sees
> before the bundle arrives, and what hydration adopts."
> (`packages/dom/src/tests/property-parity.test.ts:256-258`)

So the artefact is the tree — obtained natively where the backend has one, and by handing the bytes
to the same parser the DOM backend hands a JSON declaration's prototype to
(`packages/dom/src/dom/createExoDomSchema.ts:73-75`) where it does not.

### Why it parses in a `<template>` and not a `<div>`

Template contents are parsed in their own insertion mode, so a fragment beginning with `<li>`,
`<tr>` or `<option>` survives instead of being dropped or foster-parented, and a rule can be written
about the shape it is about rather than about a wrapper the parser demanded. Using the DOM backend's
own mechanism also means the two sides of every server/client rule meet the SAME parser, so a
divergence this suite reports cannot be an artefact of two different parsings.

That last claim was FALSE for a while: `exoHydrateAdapter` is the other side of every server/client
rule — it renders these same bytes and adopts them — and it parsed them with `parent.innerHTML` on a
`<div>`. No rule in the suite is rooted at `<li>`, `<tr>` or `<option>` yet, so nothing had been
reported wrongly; the first such rule would have been, and the manufactured divergence would have
read as hydration's. The adapter parses in a `<template>` now and moves the nodes into its live
container. The nodes still end up in a connected `<div>`: `hydrate` adopts an ELEMENT's children, and
a `<template>`'s content is a DocumentFragment in a separate owner document; appending the fragment
moves the already-parsed nodes into the live container without re-parsing anything, so the tree
hydration walks is byte-for-byte the tree the template parser built.

### What the artefact therefore CANNOT see — eight real blind spots

All eight are FALSE NEGATIVES: things two backends can differ about while sketching alike.

1. **Escaping, almost entirely.** `escapeExoText` and its absence produce the SAME text node once a
   parser has run. Two backends can only be caught disagreeing about escaping here when the escaping
   changes the TREE — which is precisely the raw-text case (`<script>`, `<style>`), where the parser
   decodes nothing, so an escaped `&amp;&amp;` survives as six characters and an unescaped `&&` as
   two. `rules/tests/static-text-inside-a-raw-text-element.test.ts` is expressible only through that door.
2. **Attribute order and quoting.** `disabled=""` and `disabled` are the same attribute; two
   attributes in the opposite order are the same element. The sketch sorts, so it cannot report an
   ordering divergence, and hydration's byte comparison genuinely does care about one. That belongs
   to `property-parity.test.ts`, which compares strings.
3. **Event listeners.** `addEventListener` leaves nothing on an element that any API can read back,
   so the sketch cannot print one — where `packages/term` records listeners in a field and could.
   Printing what only one backend can see would make that backend diverge on every rule. The
   consequence bites in the event-port rule: its split between "attaches the listener" and "prints
   nothing" is INVISIBLE to the artefact, and it is written around `fire()` instead — the effect of a
   handler, not the presence of one.
4. **Whitespace.** A whitespace-only text run is dropped and every kept run is trimmed, because one
   formatting newline between two instances is not a rendering difference and would otherwise
   separate the backend that emits it from the ones that do not.
5. **Comments.** Skipped. No backend here uses a marker node to bound a region, so a comment in the
   tree is the page's own and not the renderer's.
6. **Where a region begins and ends.** A children port's rows are element children like any other, so
   the sketch cannot tell a static child from a reconciled one. A rule about region BOUNDARIES would
   need a different artefact.
7. **Identity across time.** The sketch is a snapshot. "The same element object was kept" and "an
   identical element was rebuilt" read alike, so no rule here can assert row reuse — only the
   observable consequence of it.
8. **Everything the parser repairs — the costliest entry on this list.** Defining the artefact
   post-parse means `@exodra/string`'s bytes are seen only after the HTML parser has fixed them, and
   the parser fixes a great deal: a DUPLICATE ATTRIBUTE is dropped and the first wins, MIS-NESTING is
   closed implicitly (`<p><div>` becomes two siblings), an UNCLOSED TAG is closed at the right place,
   a stray end tag is ignored, and content in the wrong place is foster-parented. Every one of those
   is a real bug in emitted markup, and every one of them sketches as AGREE with a backend that built
   the tree directly and never emitted anything — because both sides end at the same tree. BYTES ARE
   THAT BACKEND'S ENTIRE CONTRACT, so this is a whole class of `@exodra/string` defect that is
   structurally invisible here, and it is invisible for the same reason the artefact works at all. It
   is not a gap to close by adding a check: closing it means comparing strings, which is
   `packages/dom/src/tests/property-parity.test.ts` and is not this suite. What this suite must not do is be
   read as covering it.

### And the one thing it sees that is not there — a FALSE POSITIVE

Text runs are one line per Text node, and the parser coalesces. The sketch prints a line for every
Text child; the HTML parser, inserting characters, appends to the preceding Text node instead of
making a second one. So a backend that ASSEMBLES its text out of more than one node — a filled text
port's node beside a static run, two adjacent runs a list left behind — sketches as two lines where
the parsed side of the same page sketches as one, and the suite reports a DIVERGENCE THAT NO USER OF
EITHER PAGE COULD OBSERVE: `textContent` is equal, the rendering is equal, and only the node count
differs.

It is left unmerged, and the reason is that merging is not free either. Joining adjacent runs before
printing would make the artefact unable to distinguish a bound region that produced two children from
one that produced a single concatenated child, which is a difference the reconcilers really do have.
So the sketch keeps the node boundary and this note carries the cost: a divergence whose two classes
differ ONLY by where a text run is split is this artefact's artefact and not the backends', and a
rule that lands on one should be rewritten around something else rather than recorded.

### Why not `outerHTML`

Because `packages/term` has none, and because serialising back to bytes would re-introduce blind spot
2 as a false POSITIVE instead of a false negative: jsdom's serialiser prints attributes in insertion
order, so `@exodra/dom` (which sets them from a setter table) and `@exodra/string` (which prints them
in declaration order) would differ on rules where the elements are identical.

### Why the term sketch is not `exoTermText`

`exoTermText` is that backend's OWN output format and prints things this artefact deliberately does
not have (`on:click`, an element's text on the element's own line) while lacking things it does (a
namespace, a probed property, a sorted attribute list). Re-using it would mean `term` diverging from
all four others on every single rule, for the reason that its serialiser is spelled differently —
which is a fact about `exoTermText`, not about the renderer.

Three places that walk has to decide something:

1. **`node.text` is a FIELD here and a child node there.** `TExoTermElement.text` is "the element's whole
   content, or `null` for one that declared no text port"; the DOM's equivalent is the Text node a
   text port's placeholder produced. They are printed the same way — one quoted line at depth + 1 —
   because they are the same thing said twice.
2. **An unfilled text port prints nothing**, on both sides, and for the same stated reason: `term`
   gives it `''` and the DOM backend leaves the empty Text node the placeholder made, because "an
   empty Text node serialises to nothing, which is what the server prints for an unfilled port"
   (`packages/dom/src/dom/setExoText.ts:3-5`). Trimming to empty and dropping it is that agreement,
   kept.
3. **A region prints its children inline**, at the depth its element's other kids are at, with no line
   of its own — which is what an empty region printing nothing already means on both shipped
   backends, and why a region needs no marker node here either.

### Why an attribute key carries its namespace

`setAttribute('xlink:href', …)` makes a NULL-namespace attribute whose local name is the whole string
`xlink:href`, while the parser's "adjust foreign attributes" makes one in the XLink namespace whose
local name is `href`. Printed by `name` alone they are the same line; keyed by (namespace, local
name) they are two — which is what `rules/tests/a-namespaced-or-svg-attribute.test.ts` turns on.

The related SVG case, easy to read as a bug: `@exodra/string` prints ` viewbox="…"` — the lowercase
markup spelling — and the HTML parser, inside foreign content, runs "adjust SVG attributes" over what
it tokenised and hands back `viewBox`. So the server's lowercase bytes and the DOM backend's
parser-adjusted spelling produce the SAME ATTRIBUTE on the page, and this artefact reports them as
agreeing. They do agree — on the page, which is what the artefact is about. A backend that writes the
name with `setAttribute` on an element it never parsed does NOT get the adjustment, and that one
shows up as a divergence.

### Probed DOM properties

`probe` names DOM properties to read off each element and print beside its attributes, as
`!name=value`. It is the only way a property with no markup form, and the boolean property/attribute
sync, are observable at all, since a property assignment leaves nothing in the tree's shape and
`indeterminate` leaves nothing anywhere. ABSENCE IS PRINTED TOO (`!name=∅`): "this element has no such
property" and "it has one holding false" are different pages, and a rule about a property with no
markup form is exactly a rule about that difference. A probed value is printed only when it is a
PRIMITIVE; anything else — a node, a function, a `DOMTokenList` — is printed as its type, because its
identity is per-instance and would make every backend diverge from every other for a reason that is
not the rule's.

## The stages a refusal can arrive from

-   `schema-compile` — `exoStrSchemaOf`, `exoDomSchemaOf`, `exoTermSchemaOf`, once per schema per backend,
    before any instance exists.
-   `wire` — the wiring function running against the exonode: `attr`, `text`, `html`, `on`, `one`,
    `list`, `createExoNode` and the port methods (`appendChild` and the rest). Following a source is not a door on that list — a machine effect
    draws through `attr`/`text`/`html` and subscribes, so a refusal it provokes still arrives from one
    of those names.
-   `update` — a source changing after the render, and whatever the backend does about it.

The adapter's `compile` exists as a member separate from `render` for exactly one reason: the two
children-port rules are claims about WHICH LAYER refuses a shape, and a suite that only called
`render` would record "it threw" for all of them and could neither confirm nor falsify the claim.

**Hydration can never report `schema-compile`.** `exoHydrateSchemaOf` and `compileExoHydrateSchema` are not
exported from `@exodra/dom`, so the hydrate adapter's compile step runs the string and DOM schema
compilers and stops. A refusal that belongs to the HYDRATE schema alone — `assert-unreachable-ports`,
`assert-plugin-region` — surfaces at `wire` there. It is a blind spot of this suite, not of hydration,
and a reader comparing a hydration stage against another backend's should know that before drawing a
conclusion from it.

## The component type

`TExoConformanceMachine` is `TExoMachine<TExoChildrenWiring>` — the MINIMAL surface,
not any backend's exonode type — so the identical value is passed to `ExoDomBackend.render`,
`ExoStrBackend.render`, `ExoTermBackend.renderScreen` and a hydration-composed backend's `hydrate`
WITH NO CAST. That is the property `TExoTermMachine`'s header states about itself and cannot check:
a wire's exonode parameter is contravariant, so a component typed against a backend's own node type
is a backend-only component whatever the design promised. Here one value reaches all four, and the
compiler is what says so.

**There is no second type argument carrying props, because there are no props.** An initial state
is `(enode, params) => TOut`: `TExoMachine<TWiring, TPorts>`'s second parameter is the PORT RECORD the
schema handed back, which is inferred and which nothing here names. An instance is handed no
position; what it shows arrives as its `params`. The two shipped backends mount ONE instance and
hand it the params given to `render`; `ExoTermBackend.renderScreen` takes a count and hands every
one of its `n` instances the same params.

That is why a subject's initial state can be written `(c) => { … }` and still be passable
everywhere: a function of fewer parameters is assignable to one of more, and the params it ignores
are the only thing it was ever going to be handed. A subject that _does_ want a datum names it as
its params and writes it:

```ts
import type { TExoAttrPort, TExoChildrenWiring, TExoMachineInitialState } from '@exodra/core';

const wire = (P: { attr: TExoAttrPort }): TExoMachineInitialState<TExoChildrenWiring, void, string> =>
    (c, value) => { c.attr(P.attr, value); };
```

## Ordering constraints inside a run

**The subject is built fresh for each backend**, inside the loop, and this is the one thing about
`runExoConformanceRule` that must not be optimised. A rule's subject owns SOURCES; four renders
sharing one cell would mean four of them reading a value some earlier backend's wiring had already
moved, and every divergence reported would be a function of the registry's array order.

**One backend's throw never stops another.** Every phase is caught, because the rules worth having are
exactly the ones where some backends refuse and others do not, and a runner that stopped at the first
throw would only ever record the first refusal.

**The lever order is the page's order.** A third party mutates the document first (a translator
extension runs on load), the application's data moves afterwards, and a user clicks after that.
Reversing the first two would make the third-party-mutation rule assert nothing: writing the text and
THEN replacing the node leaves both backends holding a correct-looking tree, because neither has
written since.

**A backend that threw on its update still gets torn down**, so a rule cannot leak a live subscription
into the next rule in the file. `dispose` is documented safe to call after a partial render on every
backend that has one. A disposer that throws is a finding about the backend and belongs in a rule of
its own; it is swallowed so it is not reported as this rule's verdict.

## Backends are held by POINTER, so each adapter builds exactly one

A schema is cached at `machine.forms[backend.backendType]`, and every backend object takes its own
`backendType` when it is constructed: an instance takes its methods off `schema.backend` as its
prototype, so two backends cannot share a schema. A backend built inside `render` would compile
every subject's declaration again on every case in this suite — silently, because the sketch would be
byte-identical either way — and an adapter's `compile` and `render` holding two different objects
would attribute a compile the render immediately repeats to the wrong stage. This is the rule
`ExoStrBackend` obeys in `the-schema-slots-do-not-collide.test.ts`.

The DOM adapter's backend is a bare `new ExoDomBackend()`, with no pack at all — following a source is
not a pack, so a rule that names a SOURCE needs nothing composed: a machine effect reaches
`attr`/`text`/`html`, which the shipped exonode already answers. The hydrate adapter's is
`withExoHydration(new ExoDomBackend())`, because adoption IS a composed
capability — a backend composed without that plugin has no `hydrate` at all, so the page that
never adopts never pulls the adopters into its bundle. Everything else about the composition is the
shipped default, exactly as the DOM adapter's is: the two must differ ONLY in whether the tree was
built or adopted, or a divergence this suite records is the harness's. The `term` backend is composed
with NO packs, which is what its capability set declares — a pack composed there would make every
rule's verdict a verdict about the pack. `@exodra/string`'s is composed with nothing, exactly as a
shipped render is.

**One consequence worth naming:** a bare DOM backend does not include `withExoDefaults()`, so it does
not carry the `exoReclaimingText` writer. See the translator probe below for what that costs.

## Instances

`n` instances are `n` calls, and they are IDENTICAL rows. `render` mounts one instance and hands it
the params it was given — no entry point takes a count. So a rule asking for
several instances gets several SIBLINGS rather than a numbered series: what an `n > 1` rule can
observe is placement and interference between neighbours, never a per-row value. The string adapter
concatenates its `n` calls, which is what the deleted entry point's loop did minus the row number it
used to hand each one.

The DOM and hydrate adapters put their container IN THE DOCUMENT, for `@exodra/test-utils`' stated
reason: a delegated listener is attached at `document`, so an event fired into a detached tree reaches
nothing and the rule would report a refusal that is the harness's.

## The translator probe

`translateFirstExoText` does deliberately what a translator extension does to a page: it walks the
document, finds a Text node, and replaces it with markup of its own so the translated text ends up
inside a `<font>` the extension inserted. From that moment the Text node the renderer is holding is
detached, and whether the page keeps updating depends on how the backend's text port addresses its
target.

On `@exodra/dom` that is **a choice of writer, and the shipped one does not recover.** `setExoText`
is handed the Text node itself and writes its `.data`
(`packages/dom/src/dom/setExoText.ts`); once a translator has detached that node, every later write
lands somewhere nobody is looking. Recovery is a composed writers pack — `exoReclaimingText`, which
`withExoDefaults()` puts back — and this suite's DOM adapter composes **nothing**, so what the rule
records for `dom` is the bare backend's answer and not an ordinary page's. A rule about the recovery
would have to compose `withExoDefaults()` and say in its own name that it is asking about a
different composition.

It replaces the first Text node in document order and throws when it finds none: a rule that gets
nothing has a subject with no text in it, which is a bug in the rule rather than a finding about the
backend.

## Every expectation here was derived by READING

The rules were written from the backends' source by an author who could not execute anything. So an
expectation here is a CLAIM about the code and nothing more — and three of the eleven were written
from a reading that the source then contradicted (each such rule file says so in its own header). The
first execution of this suite is its recording pass: where a rule is wrong the failure prints what the
backends did, and that is the answer. Where a rule says `undeclared(…)` the author knew the reading
did not settle it and refused to invent one.

## Unsorted

-   The capability list is short on purpose. Every capability is a thing some ADAPTER METHOD can be
    asked for, which is what keeps the declaration falsifiable: a backend claiming `EXO_CAP_LIVE_TREE`
    has to answer `fire()`, and one claiming `EXO_CAP_ELEMENT` has to hand back real elements. A
    capability nothing could ask for would be a comment with a constant's name on it.
-   The capabilities are plain string constants, following `@exodra/core`'s port kinds — there is no
    enum object to load, and a value read out of a failure message is the value in the source.
-   `@exodra/string` declares `EXO_CAP_ELEMENT` and that is not a technicality: the properties a rule
    probes (`checked`, `defaultChecked`, `indeterminate`) are read off the element THE PARSER BUILT FROM
    THE SERVER'S BYTES, which is the state a served page actually has before a line of JavaScript runs.
-   `packages/term` declares `EXO_CAP_LIVE_TREE` through `exoTermFire`. There is no event system in a
    text tree, so a listener is RECORDED rather than attached and that function is what runs it. It is
    enough for every rule here, because what a rule observes is the EFFECT of a handler, never its
    presence.
-   `packages/term` declares `EXO_CAP_UPDATE`, and that is the whole reason it is not `@exodra/string`
    with different characters at the end: a bound port keeps writing into the live tree for as long as
    the instance is mounted.
-   `packages/term`'s missing `EXO_CAP_ELEMENT` is what routes the two property rules and the
    namespaced-attribute rule to CANNOT-EXPRESS there, and each of those three is a place
    `packages/term` itself already writes down that it has no third answer to give
    (`packages/term/src/utilities/exoTermWriterForPort.ts:59-68`).
-   `packages/term`'s missing `EXO_CAP_TEXT_NODE` is a DIFFERENT absence from `@exodra/string`'s. The
    server has no live tree; term has one and holds its text in a FIELD (`TExoTermElement.text`), so there
    is no node for a translator to replace and the exposure
    `rules/tests/surviving-a-third-party-dom-mutation.test.ts` is about does not exist there rather than being
    survived. Recording both as the same absence would be the mistake this suite exists to stop.
-   The four expectation factories (`renders`, `refusesAt`, `cannotExpress`, `undeclared`) are factories
    rather than object literals so that a rule reads as a sentence and a new field on an expectation is
    added in one place instead of in every rule in the suite.
-   `refusesAt`'s `matching` is for the rules where the WORDS are the point — a refusal that names the
    call which does work, say — and is left off everywhere else, because holding several backends to
    several sentences is how a suite starts failing on improvements.
-   The registry's order — the two shipped backends, the foreign one, then the path where they meet — is
    the order failure output is printed in, and nothing else depends on it.
-   A canonical partition (names sorted inside each group, groups sorted by their first name) exists so
    a partition never depends on the registry's order and a rule's declaration never has to guess it.
    Capability lists print in `EXO_CONFORMANCE_CAPABILITIES` order for the same reason.
-   `entersForeignContent` walks with a stack rather than recursion, following this repository's own
    note that a stack beats recursion; the depth here is a schema's depth rather than a page's.
-   `exoSketchOfChildren` takes a `Node` and not a `ParentNode` because its two callers are an `Element`
    (a rendered container) and a `DocumentFragment` (a `<template>`'s contents), and `childNodes` — which
    is what the walk needs, since a text run between two instances is part of the artefact — lives on
    `Node`.
-   Both sides of the hydrate adapter's `compile` are keyed on their own backend: the markup schema is
    cached per (declaration, backend) exactly as the DOM schema beside it is, because a server connector takes
    its methods off the backend as its prototype.
-   The `agreement` partition is what makes a DIVERGENCE a fact in the suite instead of a sentence in a
    comment. The duplicate-item fork is the case where somebody DID settle the semantics: the classes
    merged, and what stands in their place is an equality —
    `packages/dom/src/tests/duplicate-item-parity.test.ts:99-104` renders the same list on both
    backends and asserts each prints the same bytes, so the day one of them grows a list answer of its
    own that line fails and names the rule instead of letting the regression look like a fix.
-   The partition is asserted over the backends that rendered and are NOT undeclared. An unrecorded
    backend is left out rather than the whole assertion being abandoned: three established answers stay
    asserted while a fourth is still open, which is the difference between a rule that says something
    and a rule that waits.
-   The CANNOT-EXPRESS cross-check runs in both directions because the rule's claim and the adapter's
    declaration are two statements of one fact that can come apart — which is the failure mode a comment
    saying "a terminal has no attribute namespace" cannot have and cannot report.
