---
title: The renderer interface that should not be built
---

# The renderer interface that should not be built

A few parts of `@exodra/dom` are replaceable names — the `events` and `writers`
fields, the `createInstance` / `createChild` record factories, and `hydrateSurface`,
the one a backend may leave absent. The renderer is not, and "make `render` itself a composed
name, so a page picks its backend by composing a plugin instead of by importing
one" is the design somebody keeps almost writing. This page carries it far enough
to say what it would be, what it would cost, and what it would buy — and the
conclusion is that it buys nothing an entry point does not already buy, for a
reason about the shape of a replaceable name rather than about types.

The typing obstacle everyone stops at is **not the reason**. It is real, it is
worth killing candidate by candidate, and it dissolves under the one construction
that works. What survives the typing question is a worse problem: a composed name
holds **one** winner and is read by **one** call site, and the renderer question is
"which of several, at once", asked by a page that has already answered it by
importing something.

The rationale for the ones that do exist is on
[Sugar, not restrictions](./sugar-not-restrictions.md); the reference for their
contracts is [Plugins](../guides/plugins.md); what one of them cost when it opened
is on [What the abstraction costs](./abstractions-collapse.md). None of that is
restated here.

## 1. What the interface would actually be

Take the three backends in this repository as the three implementors. Three are
packages and the fourth is a path, and all four are already registered together in
one array, which is where a lot of this page's evidence comes from.

| Implementor             | Entry point                                                   | Host it needs                           | What it hands back                        |
| ----------------------- | ------------------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| `@exodra/dom`           | `ExoDomBackend.render(component, parent)`                     | an `Element`                            | a disposer                                |
| `@exodra/dom` (hydrate) | `backend.hydrate(component, parent)`, from `withExoHydration` | an `Element` already holding the markup | a disposer                                |
| `@exodra/string`        | `ExoStrBackend.render(component)`                             | none                                    | markup                                    |
| `@exodra/term`          | `ExoTermBackend.renderScreen(component, n)`                   | none                                    | a screen: roots, a serialiser, a disposer |

Read from the four signatures: `packages/dom/src/dom/ExoDomBackend.ts`,
`packages/dom/src/hydrate/withExoHydration.ts`,
`packages/string/src/node/ExoStrBackend.ts` and
`packages/term/src/backend/ExoTermBackend.ts`.

**Three of the four already agree on more than they used to**, and that belongs
here before the disagreements are counted. `render` is the same method name on both
shipped backends, both take the component as one value, and **neither takes an
instance count**: each mounts ONE instance and hands its initial state the
render's own `params`, because rows that vary are a LIST — a children port filled by `c.list`
or by a reconciler from `createExoChildrenReconciler` — rather than a parameter. `@exodra/term` is the one that still
takes a count, and its own header states why rather than leaving it to be read as
an oversight: its output is a text SCREEN rather than a document, so there is no
parent to append roots into and no children port above them, and `roots` being an
array IS the shape a caller reads.

### The members, and what a second implementation has to do about each

**`name`.** Free. Several of the shipped plugin interfaces carry one for the same
purpose — it is what a refusal prints — and all three backends already carry one in
the conformance registry. No implementor fails it and nothing depends on it.

**The component parameter.** It must name ONE connector type, and the only
choice that all four can accept is the minimal shared surface rather than any
backend's connector class. That is not a guess: the conformance suite already
made it and states why — one value reaches all four entry points with no cast
because a wire's connector parameter is contravariant, and a component typed
against a backend's class is a backend-only component whatever the design
promised (`packages/conformance/src/types/TExoConformanceAdapter.ts:20-30`).

**The finding is that this parameter is strictly narrower than what
`ExoDomBackend.render` accepts today.** A wire that reaches for an element is a
client wire; the moment it calls `exoNodeDom` it cannot be served, and nothing on
the connector lets it ask which backend it is on. That is already written down as
an open hole
([what others forbid](./what-others-forbid.md#the-open-holes-in-one-place)). So
the composed name would refuse a class of component the DOM entry point renders
happily, and the refusal would be at the type, at the call, with no fix but "do
not use the composed name for this component".

**The host parameter.** Two of the four need an `Element`; two have nowhere to
put one. `@exodra/term`'s header states the reason as a fact about the backend
rather than an omission — a text tree has nothing to be inserted into
(`packages/term/src/backend/ExoTermBackend.ts`). Three ways out, and only one of
them is not a lie:

-   typing it `unknown` and casting inside each implementation — which is the
    boundary cast, priced in section 2;
-   a second type parameter for the host — which has exactly the problem the output
    type has, in section 2, and doubles it;
-   **the implementation owns its host and the member does not take one.** This is
    what the conformance adapter does: the DOM adapter creates its own container
    and appends it to the document before rendering
    (`packages/conformance/src/adapters/exoDomAdapter.ts:34-40`), and the
    hydrating one renders markup with `@exodra/string` first, fills a container
    with it, and adopts (`packages/conformance/src/adapters/exoHydrateAdapter.ts:52-64`).

The third works. Its price is that **the caller can no longer say where**, which
for a browser application is the parameter it most wanted to pass.

**The render member's return type.** This is the one the project's own record
names as the obstacle, and it is real: a disposer, a string of markup and a live
text screen have nothing in common. The conformance adapter met it and did not
solve it — it **gave up the output**, deliberately. `render` is typed to return
`TExoConformanceRun` and not the backend's own artefact
(`packages/conformance/src/types/TExoConformanceAdapter.ts:56`): a neutral
handle with a `sketch`, a `fire`, a `translate` and a `dispose`
(`TExoConformanceAdapter.ts:34-43`). The sentence this page used to quote here —
that a suite handing out the real outputs "would have four comparison functions
instead of one artefact" — was in that file's header and the comment pass removed
it; it is nowhere in `packages/conformance` today, so the reasoning is stated
above rather than cited.

**A member half the backends cannot implement, and this is the finding section 1
was asked for.** Once the output is neutral, the handle has to carry the operations a
caller would have got from the output — and they are not universal. `@exodra/string`'s
handle answers two of them by throwing, with a message saying the call should
never be reached (`packages/conformance/src/adapters/exoStrAdapter.ts:31-36`).
That is not sloppiness: the suite routes around it by having every adapter
declare a capability set, cross-checked against every rule, so a rule needing a
capability a backend lacks is a first-class outcome rather than a skip
(`packages/conformance/src/types/TExoConformanceAdapter.ts:32-33, 52-53`). And the
adapter deliberately carries no `update` member at all, because a source has to
be fresh per backend and the adapter must never see the levers
(`TExoConformanceAdapter.ts:45-47`).

So the honest interface is five members — a name and its full package spelling for
messages, a declared capability set, a compile, and a render returning a neutral handle — and **it already exists**, as
`TExoConformanceAdapter`, written against three backends, with nothing composed
anywhere near it. That is the strongest single fact on this page and section 4 is
mostly its consequence.

## 2. Whether the typing obstacle is real

It is real, and **it is smaller than it used to be** — which is worth saying
carefully, because a design that was refused partly on types is now refused almost
entirely on meaning.

**What the merge gives for free.** A plugin is a bag of method factories, and what
a pack contributes is read off its factories' return types; the composed object's
type is those intersected in nesting order — a decorator declares its own
contribution in its return type, and `TExoMergedPluginMethods` computes it for one that would
rather infer (`packages/core/src/plugins/types/TExoPlugin.ts`). So the composed type is
**per composition**, not per name. `withTermRender(new ExoDomBackend())` would have
a `render` typed exactly as that pack's factory returned it, and the checker would
know it at the line that composed it. The predecessor of this system could not do
that: it keyed implementations by a registered symbol minted once for the life of
the process, so one name meant one fixed interface for every consumer of it, and
"generic over its output" was unspellable.

**What is still unspellable, stated exactly.** A merged name resolves per
composition, but the three backends do not differ by _composition_ — they differ by
which package produced the object. `ExoStrBackend` and `ExoDomBackend` are two
classes with two `render` methods returning two unrelated types. To get `string`
out of one and `() => void` out of the other, a caller has to hold the right
object, and holding the right object is what importing the right package already
is. The type system will happily describe it; it just describes what the import
already decided.

### Every way out, and why each one dies

**One `render` name, one shared signature.** It has to name ONE return type, and a
disposer, a string of markup and a live text screen have nothing in common. Dead
at the first backend.

**One `render` name, generic in its output.** This types under the merge, per
composition, and it is the shape the old system could not express. It dies one
step later: to write down the type of what you got back you must name the
composition, and to name the composition you must name the pack, which is the
import. The genericity is real and buys nothing, because there was never a second
place the type could have come from.

**A separate name per output kind** — `renderToTree`, `renderToMarkup`,
`renderToScreen`. This one types cleanly too, and dies on meaning. To choose a
name you must know the output kind; to know the output kind you must know the
backend; and knowing the backend is what importing an entry point already is: an
entry point is what a page imports, so choosing one is how a backend is chosen,
and a composed name only moves that choice without removing it. Worse, it
multiplies where it was meant to divide: two of the four hand back a disposer, so
`renderToTree` has two candidates, and **last claim wins** — which under the merge
is the normal, unremarkable rule, and is exactly wrong here.

**Erasing to `unknown` and casting at the boundary.** A cast at every call is the
point at which the type system stops helping and the next wrong implementation
lands in it silently. The worked failure is a hand-written pack that compiles and
fails as a renderer with no methods, at the first mount, far from the line that
caused it. Dead.

**Not typing it at all.** The same as erasing to `unknown`, with the cast moved
into the reader's head. Dead.

**Erasing the OUTPUT rather than the interface — and this is the one that lives.**
It is section 1's construction and the conformance suite's. It types cleanly, it
needs no change to `TExoPlugin` or `composeExoPlugins`, and every one of the four can
implement it. Its price is stated in its own header: the caller does not get what
the backend produced. For a test harness that is correct, since what the harness
wants is one comparable artefact. For an application it is fatal in one direction —
a server that cannot have its markup has not rendered anything.

**So the obstacle is real, and the accurate sentence for the record is narrower
than the one on file.** It is not that a composed name cannot carry a generic API —
under the merge it can. It is that the only shape making three backends agree on one
name is one that discards their outputs, and that every way of recovering the
output routes back through naming the package.

## 3. What it costs at runtime

Stated per level, as this project requires, and the last two lines are the ones
that decide whether a design is allowed to exist.

**Per process.** Nothing. There is no name to register and no symbol to mint — a
plugin is a plain object and its entries are read at composition.

**Per composition.** One property read and one property write per merged name,
once, inside the backend's constructor
(`packages/core/src/plugins/composeExoPlugins.ts`). Nothing in the merge is reachable from
a render path; it runs before the first render and cannot run again.

**Per call.** Nothing beyond the call itself. A merged name is an **own property**
on one flat object, which is what the base's own methods already were — no chain
is walked and no map is consulted. This is the line where the design got cheaper
than its predecessor, and it is why the cost sheet is no longer the reason to
refuse it.

**Per schema.** Nothing, and there is nowhere for it to be anything. The existing
interfaces all amortise onto something: `events` and `writers` are read once per
(schema, backend) inside the schema compiler, on the same line that parses the
schema's markup, and spent into the schema; the record factories are built once per
backend.
A composed `render` cannot do any of that, because a plan is built
**by** a backend, and the value that decides which backend cannot be cached on the
artefact that backend produces. This is an absence of a place to amortise rather
than a cost.

**Per mount.** One field load and a call — and **the caller is not this library.**
Every one of the existing interface reads happens at a site `@exodra/dom` owns. A
composed `render` is called by application code, at a site nothing here can hoist
for it. The shape that would carry it is not hypothetical: `@exodra/react-mount`
picks between rendering and hydrating inside a React effect body, once per mount
and once per deps change, and it does so by testing `backend.hydrate` for
`undefined` — a backend composed without `withExoHydration` has no such method
— then calling `backend.render` (`packages/react-mount/src/useExoMount.ts`). A
composed `render` would sit on that same line.

**Per row and per event.** Zero — as long as the name is read only at the entry
point. Nothing below an entry point ever calls an entry point again: children go
through the connector, whose prototype is the backend and is composed once.

**And the version that would not be zero, which is the version worth wanting.**
A composed renderer meant to answer "another renderer inside part of the tree"
([item 6](./what-others-forbid.md#6-you-cannot-run-another-renderer-inside-part-of-the-tree))
has to be consulted where a children port is filled and where a row is built —
per filled port, per instance, per row. **That design is dead and this is the
sentence that kills it.** It is also not what the narrow version above would
deliver, so the narrow version cannot be defended by pointing at it.

**One cost this paragraph used to charge to the design, and no longer can.** It
said: `TExoCursorDeclaration` declares one plan slot per BACKEND, so admitting a backend the
reading side does not name would produce, for the first time, a backend that cannot
add a line to that type — and the mechanisms that would rescue it (a `Symbol` slot,
an integer id, a chain) were each enumerated and refused,
every refusal turning on the population being empty. **A composed renderer was the
thing that would have made it non-empty, and that was the cost.**

**The charge is withdrawn, because the population turned out never to have been
empty and the type was changed without any composed renderer.** A declaration
holds no compiled schema at all now: every backend stores its schema at
`machine.forms[backend.backendType]`, and every backend object takes its own
`backendType` from `nextExoBackendType()` when it is constructed
(`packages/core/src/machine/types/TExoMachine.ts`). What forced that was not a foreign
backend but the fact that the old shape's remedy had already been applied twice
inside this repository, as `termPlan` and as `stage0Plan` for a backend that has
since been deleted (`packages/term/src/schema/types/TExoTermSchema.ts`). So a backend
written outside this repository can cache a plan today with no core edit at all,
and the plan cache is no longer an argument for or against a composed renderer.
**What either storage costs is still unmeasured** — no recording in
`packages/benchmarks/measurements/` prices a plan lookup in any storage — so
nothing measured was gained or lost by the change.

**The one thing that did not move is the frequency, and it still belongs here.** A
plan lookup is not once per mounted root. `@exodra/term`'s connector pays it at
`build` and at `one`, and a reconciled list reaches it through `build` once per row —
its rows may be different components, so there is nothing to hoist — which means a

heterogeneous list pays it per row per update
(`packages/term/src/schema/exoTermSchemaOf.ts`). Whatever a foreign backend does to find
its plan, it does it at that frequency, and that belongs in the same paragraph as
any sentence promising an adapter over any backend.

## 4. What it would buy, honestly

The settled answer for the ones that do exist is **coherence**: an application composes
once and every entry point reads the same answer, instead of each render call
carrying it and one of them forgetting. That argument is not about polymorphism and
not about typing, and it is a real argument — it is why the `events` field exists
beside a parameter that already worked, and hydration is the sharpest case of it.
`hydrate` arrives as a pack **onto the backend that renders**
(`packages/dom/src/hydrate/withExoHydration.ts`), so a page cannot compose one
thing for the client and silently get a different composition on a server-rendered
page — which is exactly what happened when render and hydrate were two free entry
points each taking their own composition argument: nothing threw, and the wrong
reconciler owned every hydrated region from then on.

**It does not apply here, and the reason is a count.** Coherence is worth
something in proportion to the number of consumers that must agree. So count them.

1. **The application's own boot line.** One call. It already reads one answer,
   because it is one line, and the answer is which module it imported.
2. **A library that mounts on the application's behalf.** One exists —
   `@exodra/react-mount` — and it already takes a whole backend as an option and
   forwards it without inspecting anything but whether `hydrate` is there. A
   composed `render` would let it be backend-blind. It runs in a browser inside a
   React effect, where the markup and text-tree backends have no meaning, so
   backend-blindness here is a generality with no second case.
3. **Nested components and list rows.** Not consumers at all, per section 3.
4. **Something that needs several backends at once.** This exists, and it is the
   case that settles the question the other way. The conformance suite holds all
   four in a plain array, and its whole value is that adding a fifth breaks every
   rule at once by name until somebody states what the fifth does
   (`packages/conformance/src/exoConformanceTrees.ts`).

A composed name's semantics is **one winner**: plugins merge left to right and the
last one to claim a name is what stands there. The suite needs **all four,
simultaneously, distinguishable by name**. Those are different shapes, and
last-claim-wins is not a weaker version of an array — it is the wrong answer to the
question being asked.

So the honest ledger of what a composed `render` adds over a separate entry point:

-   **A name a third-party backend could be discovered under** rather than imported.
    Real, and small: the discovery is still an import — of the plugin instead of the
    class.
-   **A diagnostic for which backend is standing there.** There is always exactly one
    and it is the import at the top of the file.
-   **The README sentence.** Which is section 5, and is the only item on this list
    anybody actually wants.

**The conclusion, plainly: it buys nothing, and the separate entry point is the
right shape.** The reason fits in one sentence — an entry point is what a page
imports, so choosing one is how a backend is
chosen. This page is that conclusion re-derived from the composition's side, and it
arrives at the same place by a different road: what composing a name provides is
one-answer-for-many-consumers, and the renderer has one consumer.

## 5. The condition the owner set

The condition is recorded in the foreign backend's own barrel: the project "has
deliberately withheld the phrase _adapter over any backend_ from its README until
something proved it", and names `src/doc/` as that proof — two components copied
character for character out of `README.md`, checked against it by a test,
rendered with no cast and no adaptation
(`packages/term/src/index.ts`).

**Would this design satisfy it? It would satisfy the letter and not the point.**

**The letter.** This is no longer hypothetical on the composition side.
`@exodra/term` has a backend object — `new ExoTermBackend(...plugins)`, with every
connector method merged onto it first, so a pack naming one receives the shipped
body as its `next`. A pack claiming `render` composes into it today, an application
could call `backend.render`, and a foreign backend would have run through a
composed name. The sentence would be technically earned.

The package **deliberately does not** name its own entry point `render`, and its
header gives the reason rather than leaving it to be read as an oversight: `render`
on all three backends would be one name, one arity and three incompatible second
parameters, so `backend.render(APP, document.body)` written against the wrong
import would take an element as `n` and fail somewhere inside `new Array()` instead
of at the call (`packages/term/src/backend/ExoTermBackend.ts`).

**Why that is not the point, in three parts.**

1. **What ran through the composed name is one call at the top.** Nothing below it
   reaches that name, so nothing about the renderer became replaceable. The element
   builder, the plan compiler, the region anchoring and hydration's adoption are
   exactly as welded afterwards as before — and the _create_ direction of a child
   is deliberately not replaceable either, because a second way in is the drift
   that arrangement exists to prevent. A reader who hears "adapter over any
   backend" will believe something about the inside of a render, and a composed
   `render` would say nothing about the inside of a render.
2. **The proof is already stronger without it.** The claim that matters is that
   `@exodra/core`'s exported surface is portable, and it has two witnesses that a
   composed name would not improve: everything in `packages/term/src` outside
   `src/doc/` imports `@exodra/core` and `@exodra/context` and nothing
   else (`packages/term/src/index.ts`), asserted by
   `packages/term/src/backend/tests/imports-only-core.test.ts`, and the README components are
   asserted verbatim by `packages/term/src/doc/tests/readme-verbatim.test.ts`. Adding an
   indirection to a proved claim does not prove it harder.
3. **The bar the existing ones clear cannot be cleared here in a way that means
   anything.** The precise statement of a plugin interface's contract in this project
   is the inert-implementation case — compose something that satisfies the type and
   does nothing, and show the page is measurably different, which is what separates a
   field the renderer reads from one that merely decorates a data structure
   (`packages/dom/src/backend/tests/exo-composed-writers.test.ts`). It is not universal
   even among them: the events interface has no inert case at all
   ([what a replacement has to do](../guides/plugins.md#what-a-replacement-has-to-do)).
   For a composed `render` the test can be written and it passes trivially, because
   there is one read site and it is the whole render: "does the renderer read the
   composed name" is answerable by looking at one line, and a test that confirms
   one line is not evidence about a mechanism.

**The sentence that IS earned, and should be written instead:** a backend written
against nothing but `@exodra/core` and `@exodra/context` runs this
project's own documented components unchanged — with the qualification from
section 3 stated beside it, which is that "written against only core" is not the
same as "written outside this repository". `@exodra/term` **used to** have a line
in `TExoCursorDeclaration` like every other backend, and that was the sharpest form of the
qualification. It does not any more — its plans are chain links on the shared
live-tree slot (`packages/term/src/schema/types/TExoTermSchema.ts`) — so the qualification
now rests on something weaker and should be stated as such: a backend that could
not edit `@exodra/core` has still never been built here, so nothing has walked the
path end to end, and the gaps such a backend would hit are the list above rather
than a plan lookup. That is a claim about the shared surface, it has two witnesses,
and it needs nothing composed at all.

## What would change this conclusion

Written down so this page can be refuted rather than merely disagreed with.

-   **A second consumer that must not know the backend.** A router that mounts
    routes, a devtools that re-mounts a subtree, a test harness shipped inside a
    product. Today the only multi-backend consumer is the conformance suite, and it
    needs all four at once, which is an array and not a composed name. Two consumers
    that each need exactly one, and must agree, is the shape that makes coherence
    worth paying for — and it is the shape the `events` field had, and the shape
    `hydrate` has now.
-   **A renderer reachable below the entry point.** If a children port could be
    handed to another backend, a composed `render` would be answering a question
    nothing else can. That question is asked per filled port and per row, so it is a
    different design with a different cost sheet, and section 3 says what it would
    have to beat.
-   ~~**A backend that genuinely cannot edit `@exodra/core`.**~~ **DISCHARGED, and by
    something other than a composed renderer.** This item said that every backend can
    and does add one line to `TExoCursorDeclaration` for its plan slot, that a composed renderer
    would create the first backend in the other position, and that the plan-slot
    enumeration would then have to be re-argued with a non-empty population. The
    enumeration was re-argued in 2026-08 anyway, on the evidence that the line had
    been added twice inside this repository, and `TExoCursorDeclaration` now carries two fields
    named for the two kinds of OUTPUT with a chain under each
    (`packages/core/src/schema/types/TExoCursorDeclaration.ts`). A backend that cannot edit core
    therefore needs nothing composed to cache a plan, and this item is kept — struck
    rather than deleted — because it is a worked case of a trigger discharging
    without the change it was attached to.

Until one of those changes, the renderer stays where it is: chosen by an import,
typed by its own signature, and free.
