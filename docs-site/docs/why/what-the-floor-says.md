---
title: What the floor says
---

# What the floor says

Every performance page in this repository compares Exodra to other libraries.
This one does not. It compares `@exodra/dom` to **programs with no library in
them at all** — straight-line calls into Blink that produce the same DOM, byte
for byte, with no components, no schema, no reactivity, no plan and no
connector — and reports the distance.

That distance is **the entire remaining headroom for any framework whatsoever.**
Below the floor there is nothing left to beat anybody with, so the sentence it
produces bounds rivals as well as us:

> No framework can be more than X% faster than `@exodra/dom` at this job, because
> X% is all there is above the floor.

That is a stronger claim than "we beat Solid", and — this is the part that
matters — a **falsifiable** one. Anybody can write a cheaper floor program and
the number moves. Nobody has to take our word for a ranking.

**Two of the three sections below do that. The third does not**, and it says so in
its own place: [hydration](#hydration) has no framework-free program to stand on
and bounds nobody. It is here because it was measured beside the other two and
because its two answers disagree in a way that is worth publishing.

:::warning Two different things are called "the floor" in these docs
On [Benchmarks](../benchmarks.md#the-floor), `floor` is a **participant row**: the
harness's own cost, the 160 `querySelectorAll` matches and 160 dispatched
`MouseEvent`s every framework in that table pays for. It is not a renderer and it
is not this.

On this page a floor is a **program**: the cheapest way anyone knows to produce
the same DOM without a framework. The two words are unrelated and no number from
one page may be carried onto the other.
:::

## Where these numbers come from, before any of them

Three diagnostic axes in `packages/benchmarks`, all three written to the same
pattern — a phase per program, a resolution floor measured from a control whose
true value is zero, every way the axis can mislead written into its own header,
and **a run that refuses its own numbers when they are unreadable**:

-   `packages/benchmarks/src/benchmarks/axes/floors/mount-floor.ts` — 21 programs, mounting
-   `packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts` — 5 transitions, updating
-   `packages/benchmarks/src/benchmarks/axes/floors/hydrate-floor.ts` — 3 censuses, hydration

**None of the three has a recording in `packages/benchmarks/.gate/`.** The
published-number gate (`scripts/check-doc-numbers.mjs`) can therefore check that
the reproducer exists and nothing else, so every table below carries an
`unrecorded` marker naming the command and the date, and every figure on this
page must be read as **the owner's measurement on one machine, quoted here, not
traced to a file.** That is a weaker provenance than the tables on
[Benchmarks](../benchmarks.md), and it is stated here rather than left for a
reader to discover.

One figure on this page is different and is marked as such: the `importNode`
decision in [the table below](#the-decision-table) is traceable to two recordings
on disk.

## Part 1 — the three floors

### Mounting

The app is the 80-card todo app every mount axis in this suite uses: **641
elements, 321 instances, 400 port fills**. Twenty-one programs build it. Every
one of them is checked **byte-identical against a real `mountExodraApp`** before
anything is timed, through the same `markupOf` the rest of the suite gates with,
and the run throws otherwise (`mount-floor.ts`, "WHAT IS GATED").

<!-- gate: axis=mount-floor label=published -->

| Program                 | what it is                                                                        | ms         |
| ----------------------- | --------------------------------------------------------------------------------- | ---------- |
| `CENSUS/app-clone`      | ONE `cloneNode` of all 641 nodes, then a walk to the 480 ports; nothing is filled | 0.1800     |
| **`CENSUS/clone+refs`** | 321 clones, walk to the ports, fill, insert, keep 480 references                  | **0.2175** |
| `CENSUS/html·tpl`       | `template.innerHTML`                                                              | 0.2600     |
| `CENSUS/html`           | `innerHTML` of one precomputed string                                             | 0.2650     |
| `CENSUS/create`         | `document.createElement` per node, fill and forget                                | 0.2588     |
| `CENSUS/html·doc`       | `DOMParser.parseFromString`                                                       | 0.2625     |
| `CENSUS/html·adj`       | `insertAdjacentHTML`                                                              | 0.2663     |
| `CENSUS/html·range`     | `Range.createContextualFragment`                                                  | 0.2662     |
| `CENSUS/clone·frag`     | the same clones staged in a `DocumentFragment`                                    | 0.3613     |

Six of those nine rows are quoted verbatim inside this repository already, in
`hydrate-floor.ts`'s header, which cites them as the prior that decided its own
shape.

**The floor to quote is `clone+refs` at 0.2288 ms.** `app-clone` is cheaper and
is **not a technique anybody could adopt**: its prototype is built at module load
out of the app's own data — every `data-i`, every title, every tag label is
already inside the tree it clones, which is why it fills nothing. **A renderer is
handed its data after its templates compile**, so it can never contain any of it.
That distinction is machinery rather than etiquette: every row carries a
`dataBlind` flag, the axis prints **two** floors — the cheapest fair row, and "the
adoptable floor", the cheapest one a renderer could have been — and when they are
different rows it says so as a finding, in its own words, and labels the cheaper
one _"a BOUND only: addressable and retained, but its prototype contains the
data"_. Quote the adoptable one.

**What the table settles, and the size of each answer is the owner's:**

-   **Cloning beats creating.** `create` is +21% over `clone+refs`. This suite had
    been repeating "cloning is cheaper than creating" with no number beside it; now
    there is one. **One honest wrinkle in that row:** `create` is the _non-retaining_
    spelling (`retains: false` in `mount-floor.ts`), so the strict like-for-like
    against `clone+refs` is its twin `create+refs`, whose figure this page does not
    hold. The axis's own answer is that the distinction does not survive the
    instrument — it measured **retention at +0.0000 ms over 480 references**, quoted
    in `update-floor.ts`'s header — but that is the axis's finding, not a
    substitution performed here.
-   **The door into the parser does not matter.** Five separate entry points —
    `innerHTML`, `insertAdjacentHTML`, `Range.createContextualFragment`,
    `template.innerHTML`, `DOMParser` — land between 0.2763 and 0.2825, a spread of
    0.0075. One verdict covers the family, and the question never has to be
    reopened door by door.
-   **The parse is not the cheap half.** Every parser door is dearer than cloning
    the same 641 elements. Any argument that begins "but the browser's parser is
    fast" has already been measured and has already lost.
-   **`DocumentFragment` staging is the worst row in the table**, and the reason is
    the useful part: a fragment keeps insertions out of a live tree, and **this app
    assembles everything detached and inserts live exactly once**, so there are no
    live insertions for it to keep out. It is pure overhead here. On an app that
    inserts into the document repeatedly it would not be.
-   **Repetition moves the answer.** `clone·distinct` runs the identical program
    over **321 distinct prototypes**, each cloned once — same nodes, same walk,
    same fills, same insertions, same gated bytes, only the amount of repetition
    changed. It costs **+2.7%**, which is above the run's resolution floor. So
    "cloning is cheapest" is scoped to trees that repeat, and this app is close to
    the friendliest case there is: four shapes for 321 instances.

**And the granularity is forced, not chosen.** The obvious objection to
`clone+refs` is "why not clone bigger pieces". **Four shapes is the coarsest
data-blind granularity this app admits.** A whole-card prototype would have to
contain the tag rows and the details block — and both of those are things the
card's **wire** computes, not things its template knows. Coarser than four means
baking data in, which is `app-clone`, which is not a renderer. Everything below
`clone+refs` on the ladder measures per-call overhead, not something a renderer
could take.

#### The bound, and its imprecision is ours

Three runs of the axis, `exodra ÷ clone+refs`:

**1.351× · 1.418× · 1.339×** — so the headroom is **25–30%**, a range and not a
point.

Say plainly where the spread comes from: **the floor rows repeat to the third
decimal across runs. The row that moves is `exodra`** — 0.3262 in one run, 0.3063
in another, of an identical program. The instrument resolves the hand-written
programs better than it resolves the renderer, and until that is fixed the bound
is a range. **That imprecision is ours**, not the browser's and not the floor's.

Which gives the sentence this axis exists to produce, at its weaker and therefore
safer end:

> **No framework can be more than about 30% faster than `@exodra/dom` at mounting
> this app** — because roughly 30% is all that is left above a program with no
> components, no schema, no reactivity, no plan, no connector and no library,
> producing byte-identical DOM with every port addressable and retained. A rival
> that deleted **all** of its own abstraction and none of the browser's work would
> land there and no lower.

It is a bound. **It is not a target**, and the axis says so in the same breath:
everything inside the gap buys something — addressability that survives a
rebuild, lifetimes, teardown, reactivity, a component contract. The bound says
how much there is, not that any of it is free to take.

### Updating

There is no such thing as "the same program without the framework" for an update.
**A program with no reactivity does not update, it rebuilds** — and a rebuild is a
mount, already bounded above. So `update-floor.ts` bounds something narrower and
real: fix a before-state and an after-state, and the minimum set of DOM
operations that takes one to the other is a fact about the two states and the
browser. A program that performs exactly those operations, **having been told what
changed**, is a floor for that transition.

Two things make the comparison legitimate, and both are in the file rather than
in this page's good intentions:

-   **Every row declares a contract.** `told` means handed exactly what changed;
    `derive` means handed the new state and left to work it out. A `derive`
    renderer measured against a `told` floor is charged for the discovery twice.
    Every headline pairs rows on the same contract.
-   **The floor may not pre-bake its DOM calls.** It is handed indices and flags;
    it resolves nodes, finds anchors and fixes its own bookkeeping inside the timed
    region. A floor handed a list of calls to replay is not a bound, it is a replay,
    and it measures `insertBefore`.

100 rounds, **batch 16**, phases ordered by a per-round seeded shuffle. The
recording declares its own resolution bars: **0.260417 µs at floor scale** and
**5.729167–6.250000 µs at renderer scale**, and it refuses six of its own
attributions against them. **Batch 4 must not be quoted for this axis at all**: it
quantised every median onto the clock's 3.125 µs clamp, so its digits were the
timer, not the program. And raising the batch is not a remedy for a _bias_ here —
every figure is µs per transition, so more reps divide the measured region by the
same factor they multiply it. The previous recording of this axis was withdrawn
for exactly that reason — its phases ran in a rigid rotation, so its resolution
bar measured where a row had been declared rather than what the program did — and
nothing in the renderer changed between the two runs.

The new ordering is checked in the recording itself. `WIDE` now carries a null
declared far from its partner (`floor·twin·far`, 51.5625 against `floor`'s
51.5625) and one declared next to it (`exodra·twin·near`, 114.8437 against
`exodra`'s 115.625) — 0.0000 and −0.7813 µs, where under the old rotation the
distance between two declarations was worth several microseconds on its own.

<!-- EVERY ROW IS THE RECORDING'S OWN ROW NAME, and the ratio is not published as a column at all.
     That is `benchmarks.md`'s rule applied here — a column we computed on our own behalf is not
     evidence — and it is also what the gate can actually check: it matches a row by the table's
     FIRST cell, so a table of pairs traces one of the two and quietly leaves the other unchecked.
     Twelve rows instead of six pairs, every one of them checked cell by cell against
     `packages/benchmarks/measurements/update-floor.shuffled.json`, a file in this repository. The
     ratios follow in a sentence, as one division a reader can redo. -->

<!-- gate: axis=update-floor label=shuffled col=2 -->

| Row                      | µs      | what it is                          |
| ------------------------ | ------- | ----------------------------------- |
| `GROW-SHRINK/exodra`     | 6.0938  | grow-shrink · derive · the renderer |
| `GROW-SHRINK/floor·diff` | 6.0938  | grow-shrink · derive · its floor    |
| `REORDER/exodra`         | 33.8542 | reorder · derive · the renderer     |
| `REORDER/floor·diff`     | 21.6146 | reorder · derive · its floor        |
| `TEXT-SWEEP/exodra`      | 76.5625 | text-sweep · told · the renderer    |
| `TEXT-SWEEP/floor`       | 50.3125 | text-sweep · told · its floor       |
| `TEXT-ONE/exodra`        | 0.0806  | text-one · told · the renderer      |
| `TEXT-ONE/floor`         | 0.0516  | text-one · told · its floor         |
| `WIDE/exodra`            | 115.625 | wide · told · the renderer          |
| `WIDE/floor`             | 51.5625 | wide · told · its floor             |
| `GROW-SHRINK/exodraOps`  | 1.2656  | grow-shrink · told · the renderer   |
| `GROW-SHRINK/floor·told` | 0.3906  | grow-shrink · told · its floor      |

Renderer over its floor, one division of two rows above:
`grow-shrink`/derive **1.000×** · `reorder`/derive **1.566×** · `text-sweep`/told **1.522×** · `text-one`/told **1.562×** · `wide`/told **2.242×** · `grow-shrink`/told **3.240×**.

**Microseconds — this heading read `ms` until today, and it was wrong by 1000×.**
`update-floor` is the one floor axis of the four that emits microseconds; it
declares them row by row and returns `(dt / phase.reps) * 1000` where
`mount-floor.ts`, `ssr-floor.ts` and `hydrate-floor.ts` all return `dt / reps`.
The same error stood in nine other places and both numeric gates passed over it,
because a gate that compares a figure to a recorded row compares the digits and
never the unit. So: **the two tables on this page are in different units**,
because the mount table above and the hydration table below really are
milliseconds. Every ratio was unaffected — a ratio does not care what the unit
is — and every absolute in this table was out by three orders of magnitude.

**The first row is published because leaving it out would be the dishonest
choice.** It is the one row of the six that bounds nothing, and the reason it
bounds nothing is the most interesting result on this axis.

#### The row where the renderer drew level with the hand-written program

On `grow-shrink`, `@exodra/dom` measured **6.0938 µs against the floor's 6.0938
µs** — equal to the last digit the run records — and the run printed a refusal
rather than a headline:

> `NO BOUND FROM THIS ROW — @exodra/dom (6.0938 µs) measured AT OR BELOW the
"derive" floor "floor·diff" (6.0938 µs) at "grow-shrink". A floor a framework
can beat is not a floor.`

_(This page previously read "5.14 µs against the floor's 6.03 µs". That pair
resolves to no row in either recording of this axis; the figures above are the
recorded ones.)_

**The mechanism is named and it is the most important sentence on this page.**
The shipped reconciler trims the common head and tail by identity first, and a
middle that is only insertions or only removals is done in place with no map and
no allocation (`packages/list-reconcile/src/reconcileExoOrder.ts:107-128`). Only
a middle whose survivors changed order reaches the general pass, which keeps the
longest increasing run of old positions and moves the rest (`:66`). **The fast
paths are exactly the shapes that transition feeds it.** The floor is the general
case alone: stamp the survivors, drop the gone, read old positions, longest
increasing subsequence — with no special case at all.

That is how a framework catches hand-written code at all: **it knows the shape of
the data and a general program does not.** It is a finding about the floor, not a
victory over hand-written code in general — the floor stops bounding that
transition until it grows the same special cases, and the honest thing to publish
is the refusal.

#### Where the `wide` gap actually is

`wide` is the 80-card app flipping every details block and advancing every tag
list — 160 state changes in one transition, the transition where per-update
overhead should amortise if it amortises anywhere. The axis splits its gap in
two, by measuring the identical floor program **subscribed to identical
observable values and fired by identical `setValue` calls**:

-   **dispatch and the closures it calls: +10.1562 µs** — 160 `setValue` calls and
    the 160 closures a subscription needs, against a straight loop over flat arrays.
    That is `WIDE/floor·bound` (61.7187) minus `WIDE/floor` (51.5625). The renderer
    pays this and so would anybody, because a renderer nobody can notify is not a
    renderer.
-   **everything else: +53.9063 µs** — `WIDE/exodra` (115.625) minus
    `WIDE/floor·bound` — the children reconcile, the row records, the per-child
    node, the region anchors and the component boundary for every block built.

**Roughly five times more in the bookkeeping than in the dispatch** — 53.9063 ÷
10.1562 = 5.3, a division of the two figures above and not a column anybody
recorded. The two parts sum to 64.0625 µs, which is exactly `exodra − floor`, so
the split accounts for the whole gap and nothing is left over. If the update path
is to be attacked, that ratio says where. Two _other_ `WIDE` attributions in this
recording — the `bindList` façade and what survives when nothing is built or
dropped — the run refuses as ranges rather than numbers, so they are not quoted
here.

### Hydration

`hydrate-floor.ts` asks whether serving the markup and hydrating it beats cloning
and building on the client, for **one renderer doing one job two ways**, with the
network, the bundle, the compiler and the field all removed. The big census is
**5120 elements** (640 card instances), eight times the small one.

The wire runs **in full on both sides** — every closure, every effect,
every listener, from the same component values, with no second wire. Hydration
does not skip the application's work; it skips the browser's.

:::danger This one is not a floor, and its own file says so
`mount-floor` and `update-floor` bound their subjects with programs that have **no
framework in them at all**. There is no such program here. A hand-written adoption
of a hand-written string would bound "walking a tree" and would not bound
_hydration_, which is a contract about what the server already computed. **This
axis compares two real paths through one real renderer and that is all it does.**
It is on this page because it is the third of the three measurements produced
alongside the other two, not because it bounds anybody.
:::

**There are two answers and they disagree. Neither may ever be quoted as the
other.**

<!-- gate: unrecorded axis=hydrate-floor cmd="scripts/run-one-axis.js hydrate-floor 100 2" date=2026-08-20 -->
<!-- WHY THIS TABLE IS NOT TRACED CELL BY CELL, while the mount table above is: it
     publishes RATIOS, and a recording holds medians. Worse, `hydrate-floor` prints one table
     PER TRANSITION and every one of them names its rows `exodra`, `floor`,
     `floor·twin` — so the flat recording cannot tell the `exodra` of `wide` from the
     `exodra` of `text-one`. The recording IS committed
     (`packages/benchmarks/measurements/hydrate-floor.published.json`) and every number below
     comes out of it; what is missing is a way for the gate to check that mechanically.
     The fix is one change to the recorder — qualify a row name with its transition —
     and until it lands this marker is the honest state and not a waiver. -->

<!-- gate: axis=hydrate-floor label=published col=2 -->

| Row                      | ms     | what it is                                                 |
| ------------------------ | ------ | ---------------------------------------------------------- |
| `ROWS·640/mount`         | 2.3667 | the client builds every node                               |
| `ROWS·640/parse`         | 2.1833 | one crossing into the parser, nothing addressable survives |
| `ROWS·640/hydrate`       | 0.9333 | the adopt walk, the checks, and the same whole wire        |
| `ROWS·640/parse+hydrate` | 3.1333 | both, in one region                                        |

-   **Serve-and-hydrate is 30% MORE total CPU work.** That is the right question
    for a worker, a second render into an existing page, a `renderToString`-and-swap,
    or any argument about battery and heat. It is the wrong question for a cold page
    load.
-   **Hydration alone is 62% LESS.** That is the right question for a page load, and
    it is realistic rather than generous **only** because the parse it does not pay
    for (the axis's own `parse` row, 2.13 ms) is real CPU that a real browser
    genuinely does off the framework's clock — streamed, fed
    by the network, finished before the script ran. It is still real, it is still on
    the **user's** clock, and it is still dearer than cloning would have been.

**The ranking held across 8× the rows** — 640 elements to 5120 — with both ratios
inside 2.5%. That is the part worth trusting; the sizes are one machine.

And the thing this axis proves that no string compare could: before it times
anything it captures every element in the container **in document order** and
checks the same **objects** are there afterwards, then clicks a real bubbling
`MouseEvent` into the first card and requires the details block it controls to
appear and disappear in that same served element. Without those two checks an
adoption that walked the tree, attached nothing and returned would have been the
fastest row in the table.

## Part 2 — the decision table {#the-decision-table}

Every decision this project has measured, one row each. **The `not covered`
column is the point of the table.** Where a decision is not proved, the row says
so; nothing in it is filled with reasoning dressed as evidence.

**This table is invisible to `npm run check:numbers`**, and that is worth saying
out loud rather than leaving as a quiet convenience. The gate's tripwire only
fires on a column of bare `number + unit` cells (`check-doc-numbers.mjs`, rules 1
and 2); every margin below is a sentence, so no column qualifies and no marker is
demanded. Each row therefore names its own source in its own `Where` cell, and a
row whose source is a `.gate` recording says which file.

| Decision                                                                        | Alternatives measured                                                                      | Margin                                                                                                                                                                                                                                                                                              | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | What it does NOT cover                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build instances by **cloning a prototype**                                      | `createElement` per node; five parser doors; whole-card and whole-app clone; shallow clone | create is +21% over the clone floor; every parser door is dearer, the five of them within a 0.0075 ms spread                                                                                                                                                                                        | `mount-floor`, one run, no `.gate` recording                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Trees that do not repeat. `clone·distinct` (321 distinct prototypes) costs +2.7%, so the ranking is scoped to repetitive markup and a genuine low-repetition census needs its own app and its own reference row, which **does not exist**                                                                                                                                                                    |
| **No `DocumentFragment` staging**                                               | the identical clone program with the clones staged in a fragment first                     | staging is the worst of the twenty-one programs                                                                                                                                                                                                                                                     | `mount-floor`, same run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Apps that insert into a **live** tree repeatedly. This app assembles detached and inserts once, which is the case where staging can only lose                                                                                                                                                                                                                                                                |
| **`document.importNode` removed** from the plan compiler                        | keeping the import; a size threshold in the predicate, swept 1…64 nodes                    | mount axis moved 0.413 → 0.375 ms, −9.2%, against a ±3.3% noise floor and machine drift ×1.000 over ten controls                                                                                                                                                                                    | **Traceable**: `.gate/initial-render.importnode-before.json` and `.gate/initial-render.importnode-after.json`. ONE further run agrees (it used to say two, and the second is struck below) — `import-node-trade` sweeps subtree size and finds the loss **growing** at ~14.9 ns per node over seven rungs. **The second half of that sentence is withdrawn**: it rested on a phase-by-phase axis that ran the schema core on a second backend, and both the axis and the backend have been deleted. Its one recording refused its own attributions before it went — the control rung moved 0.0297 ms where the whole gap is −0.0222, so by its own rule no contribution in it was attributable — and the ~95 ns / ~26 ns pair came from an unrecorded run that can no longer be checked against anything on disk. The withdrawal is stated rather than deleted so it stays visible; nothing left in the suite can re-derive that pair | Nothing about hydration, which adopts and never clones. The 0.413/0.375 pair is one app's shape                                                                                                                                                                                                                                                                                                              |
| **Four template shapes** — the granularity of a prototype                       | coarser prototypes: whole card, whole app                                                  | not a margin. Coarser is **impossible**, not slower: a card prototype would have to contain the tag rows and the details block, which the card's wire computes                                                                                                                                      | Read from `exodra-app.tsx` and `mount-floor.ts`'s dataBlind flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Not measured, and it cannot be.** The rows that would show a win (`card-clone`, `app-clone`) are data-baked and are published as bounds only. There is no measurement of what a _legitimately_ coarser template would cost, because none can be built for this app                                                                                                                                         |
| **Reconcile by object identity**, keys as an opt-in plugin                      | none                                                                                       | —                                                                                                                                                                                                                                                                                                   | Read from `packages/list-reconcile/src/index.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **UNMEASURED.** No axis in this suite runs `createExoKeyedList` against `reconcileExoOrder`. The argument for identity is about the data layer (one permanent object per entity), not about a number, and the keyed plugin is a real deliverable rather than a fallback. The published `list-update` table measures the **op vs value** contract, which is a different question and must not be read as this one |
| **No node bank** — removed, and not offered as a plugin                         | `cloneNode(true)` against a bank of parked elements                                        | the `bank-vs-clone` ladder priced this app's CARD prototype at 875 ns to clone against 3.1 ns for a bare pop, 125 ns for a pop plus a port reset, 625 ns for a pop plus a full reset; the mount axis splits into clone 34.8% / walk 6.1% / insert 15.2% / wire 43.9% | the ladder's recording, `packages/benchmarks/measurements/bank-vs-clone.published.json`; its source is gone with the bank | Removed by the owner on 2026-09-20: caching a whole exonode by hand and reusing it does the bank's job without an engine-side reset, and a bank had to refuse every template with an event port. |
| **Keep-alive via `unmount = NOTHING`** rather than a caching policy in the list | out-of-the-box teardown-and-rebuild; Mikado's pooled mode                                  | 10.2 → 3.3 ms on the toggle axis, and ahead of the pooled hand-written participant                                                                                                                                                                                                                  | `.gate/toggle.base1.json`, published in [Eight things frameworks forbid](./what-others-forbid.md#4-you-cannot-keep-a-subtree-alive-or-pool-it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | The toggle axis is Exodra's **weakest** out of the box (10.2 against mikado's 7.4). The extension point is what closes it; nothing here says the default is good                                                                                                                                                                                                                                                        |

## Part 3 — what none of it bounds

Read this before quoting a single number above.

-   **This machine, this browser, one operator.** Every figure is one person's
    measurement on one laptop, and all three floor axes have no recording on disk at
    all — nothing here can be re-read against the run that produced it.
-   **These apps and these shapes.** The mount bound is 321 instances averaging
    ~3.5 nodes each. A floor is not scale-invariant: a component with **more static
    markup per instance** moves the gap towards zero because the clone dominates;
    one with **more ports per element** moves it the other way. One shape.
-   **These five transitions.** The update floor is five transitions on two apps. A
    transition with more DOM work per dispatch pulls every ratio towards 1; one with
    less pushes it away.
-   **Not teardown.** Every floor's cleanup is `container.remove()` and ends no
    subscriptions, because it has none. `teardown-phases` is that direction and it
    is not a floor.
-   **Not memory.** No heap column is printed and none would mean anything: a floor
    retains 480 flat references where a framework retains records, listeners,
    registries and subscriber lists. That is a different axis and nobody has built
    it.
-   **Not page load, TTI, or any wall-clock quantity.** The hydration axis's parse
    is an `innerHTML` call on a string already in memory. A real parse is streamed,
    interleaved with the network and with the script's own download and compile.
    `packages/benchmarks/ssr/` is the wall-clock instrument and it is a different
    claim.
-   **The hydration section bounds nothing.** It has no framework-free program in
    it and cannot have one. It is a comparison of two paths through one renderer,
    and the word "floor" in `hydrate-floor.ts` names the _set of axes it was written
    to_, not what it produces.
-   **Not other renderers, directly.** No third-party participant appears in any of
    these three axes. The bound applies to everybody for the same reason it applies
    to us — nothing can be further below the floor than the floor — but no row here
    measures a rival.
-   **These are throughput measurements.** A timed region performs thousands of
    transitions back to back; a real page performs one and yields. Nothing reads
    layout back, so no row pays a forced style recalculation and every row defers
    the same invalidation to whatever runs next.
-   **And the mount bound's imprecision is ours.** 1.351× / 1.418× / 1.339× is a
    range because the `exodra` row moved between runs of an identical program while
    the floor rows repeated to the third decimal. Tightening it is our work, not the
    reader's problem to discount.

## Reproducing any of it

From `packages/benchmarks`:

```bash
node scripts/run-one-axis.js mount-floor 100 4
node scripts/run-one-axis.js update-floor 100 16   # batch 4 quantises every median — do not quote it
node scripts/run-one-axis.js hydrate-floor 100 2
```

Each run prints its own resolution floor, its own refusals, and the whole "what
this does not bound" list again in its own words. If a run refuses a row, that row
is not a number.
