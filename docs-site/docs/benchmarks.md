---
title: Benchmarks
sidebar_position: 2
---

# Benchmarks

This page reports what Exodra's renderer measures against ten other libraries
across eight client-side axes, plus server render throughput. Every framework
performs each task through its own idiomatic API; none is forced onto another's
path.

These are Exodra's own benchmarks, not an independent third-party comparison.
The harness is in `packages/benchmarks` and every number below is reproducible —
see [Methodology](#methodology).

:::danger This page previously published numbers measured against debug builds

The React column on the earlier version of this page was measured against
React's **development** bundle, which is roughly 5× the size of its production
one and carries warnings and instrumentation the shipped build does not. Solid
was resolving to `dist/dev.js` for the same reason. The result overstated our
margin badly:

<!-- gate: stale col=* reason="the arithmetic of the 2026-08 debug-build correction, kept as a record of it; neither column is a current measurement and the production-build column has itself been superseded by the axis recordings quoted below" -->

| Axis | previously published (React) | measured on production builds | overstated by |
|---|---|---|---|
| list-update | 51.7 | 9.10 | 5.7× |
| reconcile | 18.2 | 4.97 | 3.6× |
| reactive-update | 9.90 | 2.00 | 5.0× |
| app-update | 21.2 | 9.52 | 2.2× |

**Both columns of that table are history, not results.** The middle column was
the fix at the time; it has since been superseded in turn by the recordings this
page now quotes, where React measures 8.035 (list-update), 4.715 (reconcile),
1.27 (reactive-update) and 9.335 (app-update). Read the table for the ratio in
the last column and nothing else.

The same page also **understated** us in the other direction: it reported
initial-render as "#2 — Solid leads by ~6%", a number measured on a renderer
that has since been replaced. On `.gate/initial-render.post-repair.json` it is
0.385 vs 0.485.

Both errors have the same cause — publishing numbers nobody re-measured. The
fix is three lines in `packages/benchmarks/vite.config.ts` (a forced
`process.env.NODE_ENV`, explicit `resolve.conditions`, and the same conditions
repeated under `optimizeDeps.esbuildOptions`, because the top-level `define`
does not reach Vite's pre-bundled dependencies). Every client axis on this page
has been re-run and **recorded** since that fix, and each table now names the
recording it was printed from. The tables that have not been re-run — the memory
table, the superseded four-node toggle table and this one — say so above
themselves.
:::

**Versions measured** — React 19.2.8, Solid 1.9.13, Svelte 5.56.8, voby 0.58.1,
Lit 3.3.3, Marko 6.1.8, Mikado 0.8.400, uhtml 5.0.9, sinuous 0.32.1,
stage0 0.0.25. All are current major versions;
production settings for each are stated explicitly in the suite's Vite config
(`dev: false` for Solid and Svelte, `optimize: true` for Marko, production
`NODE_ENV` for React).

## Who is in the field

| Participant | What it is |
|---|---|
| **Exodra** | The shipped renderer — `@exodra/core` + `@exodra/dom`, measured out of `dist`. |
| Solid, Svelte, React, voby | The comparison this suite has always run. |
| Marko, Lit | Added since the last revision; both compile or template rather than diff a vDOM. |
| uhtml, sinuous | Small template/reactive libraries, added with Marko and Lit. |
| Mikado | Hand-written imperative code driving Mikado's own list and node APIs. |
| Mikado (reactive idiom) | The same app written the way Mikado's own README says to write one — its Proxy properties, its observable array, its click routing. Runs on the two `exodra-*` axes only. |
| *Exodra (oimdb store)* | **Not a second renderer.** The identical schemas, components and binding topology as **Exodra**, with the app's state held in an [oimdb](https://github.com/abaikov/oimdb) database and read back through selectors, instead of the plain get/set cell the **Exodra** row uses. Runs on the two `exodra-*` axes only. |
| *stage0* | **Not a competitor — the ceiling.** ~570 B of clone-and-patch with no renderer around it: no components, no schemas, no wiring functions, no ports, no subscriptions, no disposal, no registry, and nothing to flush. Read every row above it as "stage0 plus what that library does for you" — and see [What stage0 does not do](#what-stage0-does-not-do) for what that phrase is actually naming. |
| *floor* | Not a renderer. It is the harness's own cost, measured as a row — see [The floor](#the-floor). |

**Two of the rows that finish ahead of Exodra on this page are not frameworks,
and the tables do not lead if you count them.** `stage0` is the ceiling of the
clone-and-patch family and
`mikado` is hand-written imperative code, not an idiom anybody writes an
application in. They are here because a comparison that quietly excluded the
faster non-framework rows would be flattering by omission. Where Exodra is
behind them, the tables below say so in the row order and the prose says so in
words.

Two further axes — `exodra-initial-render` and `exodra-app-update` — run a
**different** field, not a wider one: fewer third parties (Solid, Marko, Lit and
Mikado only, with no React, Svelte, voby, uhtml, sinuous or `stage0`), plus two
rows nothing else on this page carries — Mikado's own reactive idiom
(`mikadoReactive`) and the same Exodra renderer reading a real store
(`exodraOimdb`). **Both axes are now recorded** (`rec1`, 60 rounds, batch 20),
and the two tables sourced from them below are printed from those files.

:::warning The participant set has changed since these recordings

Two rows in the `rec1` recordings below **no longer exist in the suite**, so those
tables can be read but not reproduced:

- **`exodraOimdb`** has been removed. It was a bindable Exodra app and it had gone
  stale against the scene (its tag entity predates the per-user character counts,
  so the shared `TAG` wire read `undefined.getValue()`). Nothing measures what a
  real store costs now.
- **the row printed as "Exodra"** in these two tables is the **bindable** spelling —
  a cell per card per varying thing, `c.bindList` for each children port, a click
  writing a cell. That row has been taken off `initial-render`,
  `exodra-initial-render` and `exodra-app-update`. Exodra is now presented as the
  two spellings it is meant to be read as: the **wire** row (`exodraDirect`) and the
  **state machine** row (`exodraMachine`).

Every ratio below that has `exodraOimdb` or the bindable "Exodra" on one side is a
historical figure. It is left standing rather than recomputed, because a recording
on disk is a fact and rewriting it would be worse than dating it.

::: Until
that recording they were published here as stale, under axis names — `schema-*`
— that the runner has never accepted; both errors are corrected on this
revision.

Angular is described at length in the source of both axes and **does not run**:
`@angular/*` is not installed, the participant is not registered in either axis,
and no recording on disk carries an Angular row.

Where a participant is missing from a table, it was not part of the run quoted
here. Every ranking claim on this page is over the rows shown.

### What stage0 does not do

Calling a row "the ceiling" is only useful if you can say what is missing from
it, so here is the list. Every item is read out of that participant's own source
(`packages/benchmarks/src/benchmarks/apps/stage0/stage0.tsx`), and every one of them is
work the rows above it perform on the same axis.

- **No components.** There is no component boundary anywhere in the app: the
  mount is a `for` loop that clones a template per card and appends it. Nothing
  is composed, nothing takes props, and nothing nests.
- **No schema and no ports.** The dynamic positions are found once, by walking
  the template for `#name` markers, and come back as a plain object of node
  references. After that nothing describes the tree — there is no port to look
  up, and no indirection between "the value" and "the node it lands on".
- **No wiring functions.** Describing and filling are the same code. The mount
  loop writes `refs.title.nodeValue` and `node.setAttribute('data-i', …)`
  directly, in line.
- **No subscriptions.** Nothing observes anything, so nothing has to notice a
  change. The update path is written out by hand, per element, and only works
  because the author knows exactly which four things in this app can change; a
  fifth is a hand edit, not a binding.
- **No disposal and no registry.** Teardown is `cards.length = 0`. The file's
  own comment is the whole of it: *"Nothing to dispose. Stage0 holds no
  subscriptions and no registry; the handlers are properties of the nodes they
  are on"* — so they die with the container the caller removes.
- **Nothing to flush.** Each handler writes to the DOM synchronously inside the
  click, so an update round has committed by the time the last handler returns.
  Where React, Svelte, voby and Marko need `flushSync` / `tick` / `run` to make
  that true, stage0 needs the concept explained away: it has no queue to drain
  because it has no scheduler to queue into.
- **No conditional.** The library has none, so the details block is inserted
  before `.tags` and removed again by hand, in the handler.

Two things it **does** have are used, and are named so the ceiling is not
cheaper than it should be: `stage0/reconcile`, the library's own list renderer,
drives the tag list, and one real `.onclick` per handler is attached exactly as
every other participant attaches a listener. Its delegated-events helper
(`stage0/syntheticEvents`), which stage0's own benchmark entry uses, is
deliberately *not* used — delegation is a genuine architectural advantage, and
charging it to the ceiling silently would make the ceiling cheaper than the
thing it bounds.

None of this is a claim that it renders less. It renders the same page: the
axis gate mounts stage0's app and the reference app side by side and diffs the
HTML, then runs an update round and diffs again, and stage0 is required to
produce the reference's bytes exactly — it emits no comment anchors, no binding
attributes and no markers of any kind, so a comment strip forgives it nothing.
The output is identical; what differs is everything the program never had to
build to get there. That is why the number is a ceiling and not a target: the
absences above are also the reasons nothing in it transfers to an application
somebody has to change.

## Mount

**initial-render** — mount the 80-card todo app (details toggle + dynamic tag
lists per card), ms/mount, lower is better:

<!-- gate: axis=initial-render label=post-repair -->

| Framework | ms/mount |
|---|---|
| *stage0 (hand-rolled ceiling)* | *0.325* |
| Mikado (imperative) | 0.34 |
| **Exodra** | **0.385** |
| Solid | 0.485 |
| Marko | 0.57 |
| React | 0.775 |
| sinuous | 0.83 |
| Svelte | 0.985 |
| uhtml | 1.015 |
| Lit | 1.07 |
| voby | 1.135 |

Printed from `.gate/initial-render.post-repair.json`, medians, in the order that
file records them.

**Exodra is third, and the two rows ahead of it are not frameworks.** The
hand-rolled ceiling mounts this app in 0.325 and hand-written imperative Mikado
in 0.34, against Exodra's 0.385 — 18% and 13% behind respectively. That is the
honest result of this axis: the gap between a renderer and no renderer at all is
about 0.06 ms per mounted app here, and Exodra pays it.

Against the framework field it leads: 1.26× ahead of Solid, 1.48× ahead of
Marko, 2.01× ahead of React, 2.56× ahead of Svelte, 2.78× ahead of Lit and 2.95×
ahead of voby.

This is the axis the previous revision of this page reported as a loss ("Solid
leads by ~6%"). That was measured on the previous renderer; on all nine
`initial-render` recordings now on disk, Exodra is ahead of Solid. Nothing was
tuned for this benchmark between those two measurements — the renderer was
replaced.

The same mount, run by the `exodra-initial-render` axis over its own field:

<!-- gate: axis=exodra-initial-render label=rec1 map="Mikado (imperative):mikado;Mikado (reactive idiom):mikadoReactive;Exodra (oimdb store):exodraOimdb" -->

| Framework | ms/mount |
|---|---|
| Mikado (imperative) | **0.285** |
| **Exodra** | 0.320 |
| Mikado (reactive idiom) | 0.400 |
| Solid | 0.405 |
| Marko | 0.415 |
| *Exodra (oimdb store)* | *0.815* |
| Lit | 1.010 |

Printed from `.gate/exodra-initial-render.rec1.json`, medians, in the order that
file records them. This axis runs no `stage0` row.

**Exodra is second of seven, and the row ahead of it is not a framework.**
Hand-written imperative Mikado mounts this app in 0.285 against Exodra's 0.320 —
12.3% behind. That is the same result as the recorded table above, where the two
rows ahead of Exodra are also the hand-rolled ceiling and hand-written Mikado.

Against the frameworks in this run Exodra leads all of them: 1.27× ahead of
Solid, 1.30× ahead of Marko, 3.16× ahead of Lit, and 1.25× ahead of Mikado's own
reactive idiom.

**Mikado's reactive idiom costs 1.40× Mikado's own ceiling** — 0.400 against
0.285 — and lands behind Exodra. This page previously published that factor as
"1.4×" off an unrecorded run; the recording puts it at 1.40×, so the claim
survives its own measurement.

**`exodraOimdb` is the row to read with the most care, and it is published rather
than dropped.** It is not another renderer: identical schemas, identical
components, identical binding topology, with the app's state in an oimdb database
instead of a plain get/set cell. On *this* axis the store is built **inside** the
timed region — a store shared between mounts would carry the previous mount's
writes into the next one — so 0.815 against 0.320 (2.55×) is "mount this app out
of a store, setup included", not the store's steady-state cost. The clean
per-update figure is on the update axis below. The row exists because the
`exodra` row is a renderer measured with its data layer taken out, while Solid,
Marko and Lit are measured with theirs attached. **Read it against the `exodra`
row and nothing else** — the suite classes it as a diagnostic, not a competitor,
and its position among the third-party rows is not a ranking claim.

**On the table this replaces.** It was marked stale because this axis had never
been recorded. Its Exodra row read 0.320 and the recording reads 0.320 —
exactly — while every other row it carried has moved by 5% to 25% against the
new medians: mikado 0.300→0.285, mikadoReactive 0.420→0.400, marko 0.440→0.415,
solid 0.480→0.405, lit 0.760→1.010. One row landing dead on and the rest
drifting is what an unsaved run of this axis looks like; it is not what an
invented table looks like. It is evidence, not proof: nothing on disk dates that
run.

## Application update

**app-update** — 80 cards, each toggling a details block and growing/shrinking a
dynamic tag list, fired by real dispatched clicks, ×5 rounds per timed region:

<!-- gate: axis=app-update label=rec1 -->

| Framework | ms/5 rounds |
|---|---|
| *floor (harness cost, no renderer)* | *3.575* |
| *stage0 (hand-rolled ceiling)* | *4.41* |
| Mikado (imperative) | 4.485 |
| **Exodra** | **4.595** |
| Lit | 4.915 |
| Marko | 5.045 |
| sinuous | 5.2 |
| Solid | 5.48 |
| uhtml | 5.59 |
| voby | 5.665 |
| Svelte | 6.455 |
| React | 9.335 |

Printed from `.gate/app-update.rec1.json`, medians, in the order that file
records them.

**Marko is no longer ahead of us here — that has changed.** The previous
revision of this page published Marko at 4.660 against Exodra's 4.740 and called
it a tie Marko was on the right side of. On this recording it is Exodra 4.595
against Marko 5.045, and the two non-framework rows — stage0 at 4.41 and
hand-written imperative Mikado at 4.485 — are the ones ahead of us, by 0.185 and
0.110 ms.

Those margins are small against a floor of 3.575 ms that every row carries.
Against Solid the gap is 1.19×, against React 2.03×.

The same update, run by the `exodra-app-update` axis over its own field:

<!-- gate: axis=exodra-app-update label=rec1 map="floor (harness cost, no renderer):floor;Mikado (imperative):mikado;Mikado (reactive idiom):mikadoReactive;Exodra (oimdb store):exodraOimdb" -->

| Framework | ms/5 rounds |
|---|---|
| *floor (harness cost, no renderer)* | *2.925* |
| Mikado (imperative) | **3.675** |
| **Exodra** | 3.855 |
| Marko | 3.980 |
| Mikado (reactive idiom) | 4.100 |
| Lit | 4.380 |
| Solid | 4.405 |
| *Exodra (oimdb store)* | *7.540* |

Printed from `.gate/exodra-app-update.rec1.json`, medians, in the order that file
records them. This axis runs no `stage0` row either.

**Exodra is third of eight, and the two rows ahead of it are `floor` and
hand-written imperative Mikado.** `floor` is not a renderer — it is the harness's
own cost at 2.925 ms, about **76% of the 3.855 ms Exodra prints**, and every row
in the table carries it ([The floor](#the-floor)). Among the rows that actually
render, Mikado's hand-written imperative code leads at 3.675 against 3.855 —
0.180 ms, 4.9%.

Against the frameworks in this run Exodra leads all four, and the margins are
thin: 1.03× ahead of Marko, 1.06× ahead of Mikado's reactive idiom, 1.14× ahead
of Lit and 1.14× ahead of Solid. Read those factors against the floor before
reading anything into them: all four sit inside 15% of a number that is
three-quarters harness.

**This axis reproduces the Marko result**, independently of `app-update` above:
Exodra 3.855 against Marko 3.980. The unrecorded table this replaces had them the
other way round — Marko 4.000 against Exodra 4.020 — and that ordering does not
survive the recording.

**Mikado's reactive idiom costs 1.12× Mikado's own ceiling here** — 4.100 against
3.675 — and stays behind Exodra, as it did on the mount.

**`exodraOimdb` is 7.540 against 3.855 — 1.96×, or 3.685 ms per five rounds.** On
this axis the store is built during setup, *outside* the timed region, so unlike
the mount row this is the update path alone: 160 writes into oimdb collections,
the derived index they maintain, and the selector deliveries that follow. That
difference is what a real data layer costs on this app, and it is published for
the same reason Mikado appears twice — the `exodra` row has no store under it,
and a table that showed only the row without one would be comparing a renderer
against renderers-plus-their-data-layer. As on the mount, read it against the
`exodra` row and nothing else: it is a diagnostic, and 7.540 is not a claim about
Solid or Lit.

### The floor

`floor` is a participant that renders the app's markup as **inert HTML** and
then lets the harness click it exactly as it clicks a live app. No handler is
attached, so nothing re-renders.

What it measures is the harness's own cost, which every participant pays: a
round calls `clickAll` twice, and those two calls produce **160
`querySelectorAll` matches and 160 dispatched `MouseEvent`s** — identical work
for every framework in the table, added to every framework's number.

On app-update the floor is **3.575 of the 4.595 ms Exodra prints — about 78% of
the row**; on `exodra-app-update` it is 2.925 of 3.855, about 76%. That is why
two renderers 5% apart on either axis cannot be told apart
from the printed numbers alone: 5% of the total may be a much larger fraction of
the part either renderer is responsible for.

The floor is published raw, as its own row in the same table, and no
floor-subtracted column appears anywhere on this page. The subtraction is one
the reader can do; a column we computed on our own behalf is not evidence.

The floor also catches a tax nobody owns: Solid's compiler emits
`delegateEvents(["click"])` at module scope and Marko installs a document
listener, so on an axis where either participates, every dispatched click walks
their document-level handlers — including clicks into an app they did not
render. That cost lands in the floor row, where it is visible, rather than being
spread silently across the others.

## List updates

**list-update** — 300 rows, then 20 rounds of {move, insert, remove, append} =
80 operations. This axis measures **two different contracts**, and both Exodra
rows are published because reporting only the fast one would be the same
dishonesty as the debug-build React column:

:::warning The op-source row describes code that is gone
`Exodra (op source)` measured `c.bindList` applying a list operation without
diffing. That path has been deleted and both of its rows are struck from the
list axes (`list-reconcile.tsx`); every Exodra list now re-reads its source and
diffs. The 0.075 below is kept as the record of that run and is not something a
user can select today ([Known issues](./limits-and-plans.md#known-issues)).
:::

<!-- gate: axis=list-update label=rec1 map="Exodra (op source):exodraOps;Exodra (value source):exodra;Mikado (op source):mikado;Mikado (keyed diff):mikadoKeyed;stage0 (hand-rolled ceiling):stage0" -->

| Framework | contract | ms/80 ops |
|---|---|---|
| **Exodra (op source)** | told *what* changed | **0.075** |
| Mikado (op source) | told *what* changed | 0.09 |
| *stage0 (hand-rolled ceiling)* | diffs | *0.6* |
| Mikado (keyed diff) | diffs | 0.69 |
| **Exodra (value source)** | told *that* something changed; diffs | **0.815** |
| sinuous | diffs | 0.86 |
| Solid | diffs | 1.23 |
| Lit | diffs | 1.555 |
| voby | diffs | 1.745 |
| Svelte | diffs | 2.045 |
| Marko | diffs | 2.665 |
| uhtml | diffs | 2.87 |
| React | diffs | 8.035 |

Printed from `.gate/list-update.rec1.json`, medians, in the order that file
records them.

The difference is entirely in what the data source can say.

- An **op source** reports "row 0 moved to position 150". Exodra applies that
  move to the DOM and compares nothing. 0.075 ms.
- A **value source** reports only "the list changed" and hands over the new
  array. Exodra keyed-diffs it, exactly as everyone else must. 0.815 ms.

**The diffing half of this table is no longer a tie with Solid, and it is no
longer a lead over everything else either.** The previous revision published
both Exodra's value-source row and Solid at 1.800 and called it a tie. On this
recording Exodra's value source is 0.815 against Solid's 1.23 — 1.51× ahead —
but among the rows doing the same diffing work it is **third**, behind the
hand-rolled `stage0` at 0.6 and behind Mikado's own keyed diff at 0.69. Among
the framework rows on that contract it leads, by 0.045 ms over sinuous.

Solid, Marko, Lit, React and voby have **no per-row handle** to say the first
sentence to. This was checked rather than assumed: Marko 6's only collection
entry points are the compiler's `_for_*` loop signals, which take the whole
iterable, and a mounted template's outside surface is `update(input)` /
`destroy()` / `value`. Lit's list directives (`repeat`, `map`, `join`, `range`)
all take the whole iterable, and the mutation primitives `repeat()` is built out
of (`insertPart` / `removePart`) are only handed out inside a `Directive`'s
`update()` — there is no route from a rendered `<li>` back to the part that owns
it. In both cases "row 0 moved to 150" is not sayable at all.

**Mikado is the exception, and it is the reason to state this axis carefully.**
A Mikado view *is* a list — it owns its root's children and exposes
`add(data, index)`, `remove(index, count)`, `move(node, position)`,
`shift(node, offset)` and `node(i)`. "Row 0 moved to 150" is sayable to Mikado,
so the suite runs it on **both** sides of this axis, imperative and keyed, for
the same reason Exodra appears twice. **Both of its rows are in the run quoted
above**, and they split the same way ours do: told what changed, Mikado is 0.09
against Exodra's 0.075; left to diff a new array, it is 0.69 against Exodra's
0.815. Each side of that pair is the comparison worth reading; crossing them is
not.

The headline "Exodra is 18× faster than Solid at list updates" is therefore
16.4× on this recording, and it is true only of the op-source row against a
keyed diff — two different programs. Against Exodra's own diffing row it is
10.9×, which is the honest measure of what the contract buys. On the comparison
where both sides are doing the same thing, Exodra is 1.51× ahead of Solid and
behind two non-framework rows.

## Reconcile

**reconcile** — declarative replacement of a 200-row keyed list with a shuffled
order, ×30:

<!-- gate: axis=reconcile label=rec1 -->

| Framework | ms/30 reconciles |
|---|---|
| **Exodra** | **1.18** |
| sinuous | 1.35 |
| *stage0 (hand-rolled ceiling)* | *1.565* |
| Marko | 1.78 |
| voby | 1.865 |
| Mikado (keyed) | 1.97 |
| Solid | 2.01 |
| uhtml | 2.125 |
| Svelte | 3.32 |
| Lit | 4.37 |
| React | 4.715 |

Printed from `.gate/reconcile.rec1.json`, medians, in the order that file
records them.

Given a new array rather than an operation, Exodra reconciles by identity and
moves the minimum: 1.14× ahead of sinuous, 1.51× ahead of Marko, 1.58× ahead of
voby, 1.67× ahead of keyed Mikado, 1.70× ahead of Solid, 3.70× ahead of Lit,
4.00× ahead of React.

**This is the only axis where Exodra's default path is ahead of the hand-rolled
ceiling** — 1.18 against stage0's 1.565, 1.33×. (On list-update and toggle the
rows that beat `stage0` are the op-source and keep-alive ones, which are not the
default; on mount and app-update nothing of ours is ahead of it.) Read the
1.33× as what identity reconciliation buys and nothing wider: `stage0`'s
`reconcile()` compares items and Exodra compares nothing, because the schema
object it was handed *is* the key.

## Fine-grained reactive updates

**reactive-update** — 1000 nodes × 3 sweeps = 3000 value changes written to the
DOM:

<!-- gate: axis=reactive-update label=rec1 -->

| Framework | ms/3000 changes |
|---|---|
| Mikado (imperative) | **0.305** |
| **Exodra** | 0.325 |
| Lit | 0.595 |
| Marko | 0.77 |
| voby | 0.85 |
| Solid | 0.96 |
| React | 1.27 |
| Svelte | 1.515 |
| uhtml | 1.59 |
| sinuous | 1.625 |

Printed from `.gate/reactive-update.rec1.json`, medians, in the order that file
records them. This axis runs no `stage0` row.

**Exodra does not lead this axis, and the previous revision of this page said it
did.** Hand-written imperative Mikado is 0.305 against Exodra's 0.325 — 6.6%
ahead, one row, no framework in between. Writing signals straight to the DOM
beats reconciling an array, and writing them by hand beats doing it through a
renderer by about that much.

Against the framework field: 1.83× ahead of Lit, 2.37× ahead of Marko, 2.95×
ahead of Solid, 3.91× ahead of React.

## Toggle

**toggle** — tear a 200-panel block out of the document and build a different
one, ×20 per timed region (a tab switch, a route change, a page of a paginated
table, a filter flip).

**Two recordings of the rescaled axis, medians in ms** — `.gate/toggle.base1.json`
and `.gate/toggle.base2.json`, printed verbatim from those files rather than
retyped. This page said "no numbers yet" until 2026-08-16; the recordings had
been on disk the whole time.

<!-- gate: axis=toggle label=base1 col=2 -->
<!-- gate: axis=toggle label=base2 col=3 -->

| participant | base1 (ms) | base2 (ms) |
|---|---|---|
| `exodraKept` | **3.3** | **3.0** |
| `mikadoPooled` | 3.5 | 3.1 |
| `mikado` | 7.4 | 6.6 |
| `stage0` | 8.9 | 7.9 |
| `solid` | 9.2 | 8.3 |
| `exodraDelegated` | 9.6 | 8.5 |
| `exodra` | 10.2 | 9.1 |
| `marko` | 13.7 | 12.2 |
| `svelte` | 14.8 | 13.4 |
| `uhtml` | 19.8 | 17.5 |
| `lit` | 21.3 | 18.7 |
| `sinuous` | 21.8 | 19.6 |
| `react` | 30.7 | 27.7 |
| `voby` | 35.4 | 31.4 |

Read the two columns as one result with its own scatter, not as two results:
every one of the fourteen rows shifts by 10–14% between them, all in the same
direction, which is the machine and not the code.
What survives that shift is the ordering and the ratio — **keeping the subtree
alive is 3.1× and 3.0× the default**, and `exodraKept` is ahead of the pooled
hand-written participant in both. Neither recording carries a `batch` or `quantum`
field, so they predate the per-row floor and cannot be fed to `npm run gate`;
they are honest medians, not a gated comparison.

**Out of the box, this is the axis Exodra loses.** The default `exodra` row is
10.2 / 9.1 — behind Solid at 9.2 / 8.3, behind stage0 and behind hand-written
Mikado, and event delegation (`exodraDelegated`, 9.6 / 8.5) does not close it.
The axis is dominated by rebuilding 4000 panels per sample, and the only thing
that answers it is not rebuilding them: `exodraKept` keeps the subtree alive and
leads the table. That is a strategy a caller has to reach for, not a default.

The table below is the OLD, superseded shape of this axis — one four-node panel
toggled fifty times — kept because the text around it refers to it:

<!-- gate: stale reason="the old four-node toggle scenario, superseded by the 200-panel rescale recorded in toggle.base1 and toggle.base2 above; every figure in it is one or two ticks of a clock clamped at ~0.1 ms and the axis could not resolve its own participants" -->

| Framework | ms/50 toggles |
|---|---|
| Exodra | 0.100 |
| Marko | 0.100 |
| Mikado | 0.100 |
| Lit | 0.100 |
| Svelte | 0.100 |
| Solid | 0.200 |
| voby | 0.200 |
| React | 0.300 |

**That table did not resolve anything.** The browser's timer is clamped at
~0.1 ms, so the five-way tie at the top is five participants landing on one tick;
the axis's two caching diagnostics measured 0.000, i.e. below one tick entirely.
Twenty-five panel builds per sample is not enough work to measure.

The scenario is unchanged — build a subtree, throw it away, build it again — but
the block is now 200 panels and every show carries different data, which is
4000 panel builds and 4000 teardowns per sample instead of 25. The axis now
observes the clock's real resolution at the start of a run and prints, under the
table, either the factor by which its fastest row clears that quantum or the
factor by which it is short and what to raise. The two recordings above are that
run; the old table is kept only for the paragraph that criticises it.

## Memory

Retained heap after one mounted app, forced GC +
`performance.memory.usedJSHeapSize`:

<!-- gate: stale reason="heap is sampled by the exodra-initial-render axis, and these figures come from the same undated run as the mount table that axis has now superseded. The axis IS recorded now (rec1), but a recording holds timing rows only — no .gate file carries a heap row at all, so nothing on disk can check these five numbers" -->

| Framework | MB / mounted app |
|---|---|
| Mikado (imperative) | **0.05** |
| **Exodra** | 0.10 |
| Mikado (reactive idiom) | 0.12 |
| Lit | 0.15 |
| Solid | 0.25 |

**These are stale and they are the least stable figures on the page.** They come
from the same undated run of `exodra-initial-render` as the mount table that
axis's recording has now replaced. The axis has since been recorded, and that
did not help here: `run-one-axis.js` records the timing table only, so no `.gate`
file on disk carries a heap row for any participant. Heap is also app-shaped and
sensitive to when it is sampled — it has moved more between runs than any timing
row here. In that run Exodra retained 0.10 MB against Solid's 0.25 MB and
hand-written imperative Mikado retained half what Exodra did. The axis samples
two participants these five rows do not carry — `marko`, and `exodraOimdb` whose
retained heap is the app *plus* two collections and a derived index — and neither
figure has ever been published here. The safe reading is the band, not the
ordering within it, and the
band has not been re-measured.

## Summary

**This summary changed when the axes were re-recorded, and it changed in both
directions.** Against the framework field — Solid, Marko, Lit, Svelte, React,
voby, uhtml, sinuous — Exodra leads every client axis on this page except
toggle. Against the whole field, including the rows that are not frameworks
(`stage0`, hand-written `mikado`, the harness `floor` and our own `exodraOimdb`,
the last of which has since been removed from the suite),
it leads two — **reconcile** (1.18, ahead of every row including the hand-rolled
ceiling) and **list-update on the op-source contract** (0.075). Where it does not
lead, this is what is in front of it, and every figure is in the table for its own
axis above:

- **reactive-update** — second: `mikado` 0.305 against 0.325.
- **initial-render** — third: `stage0` 0.325 and `mikado` 0.34 against 0.385.
- **app-update** — third renderer: `stage0` 4.41 and `mikado` 4.485 against
  4.595, on a `floor` row of 3.575 that all three carry.
- **list-update, diffing contract** — third of the diffing rows: `stage0` 0.6 and
  `mikadoKeyed` 0.69 against 0.815.
- **toggle** — out of the box, behind four rows: `mikado` 7.4, `stage0` 8.9,
  `solid` 9.2 and our own delegated variant 9.6, against 10.2.
- **exodra-initial-render** — second of seven: `mikado` 0.285 against 0.320.
- **exodra-app-update** — third of eight: the harness `floor` at 2.925, which is
  not a renderer, and `mikado` at 3.675, against 3.855.

Where it does not lead:

- **`stage0` and hand-written imperative Mikado are ahead on mount, app-update
  and the diffing half of list-update.** Neither is a framework: `stage0` is
  ~570 B of hand-rolled clone-and-patch and `mikado` is imperative code written
  against Mikado's node API. What separates them from Exodra is the renderer
  itself, and on mount that is about 0.06 ms per app.
- **Mikado is ahead on reactive-update** (0.305 vs 0.325). The previous revision
  of this page claimed this axis as a lead; it is not one.
- **Marko is no longer ahead on app-update.** The previous revision published
  4.660 vs 4.740 against us; the recording has 4.595 vs 5.045 for us, and
  `exodra-app-update.rec1` reproduces it independently at 3.855 vs 3.980.
- **Toggle is the loss.** Out of the box Exodra is 10.2 against Solid's 9.2 and
  Mikado's 7.4, and it takes keeping the subtree alive — a strategy the caller
  has to reach for — to lead at 3.3.
- **A store WAS priced here, and is not any more.** `exodraOimdb` — the same
  renderer reading through oimdb selectors — recorded 7.540 against 3.855 on
  `exodra-app-update` and 0.815 against 0.320 on `exodra-initial-render`, where
  the store's own construction is inside the timed region. **That row has been
  removed from the suite** (it was a bindable Exodra app and it had gone stale
  against the scene), and so has the bindable `exodra` row those figures are
  divided by. Both numbers are historical; nothing in the suite measures what a
  real store costs today.

Three tables on this page are marked **stale** (five columns of them: the
debug-build correction alone accounts for three) and one is **unrecorded**.
Stale: the debug-build correction, the superseded four-node toggle table and the
memory table — none of those three can be checked against a file, and the memory
figures cannot be even now that their axis is recorded, because a recording holds
timing rows only. The two `exodra-*` tables were on this list until both axes
were recorded on 2026-08-19; they are now printed from
`.gate/exodra-initial-render.rec1.json` and `.gate/exodra-app-update.rec1.json`.
Unrecorded: the server-throughput table, which is produced by a script that
prints to the console instead of writing a `.gate` file.

The design choices these numbers follow from are documented separately, and the
numbers here are what those choices produce, not an argument for them:

- **identity reconcile** (the schema object *is* the key) → exact node reuse and
  the minimal-move keyed diff — see
  [Core Concepts → Identity & reconciliation](./core/concepts.md#identity--reconciliation);
- **direct-to-DOM writes with no scheduler** → fast updates, at the cost of no
  glitch-batching in core — see
  [Optimizations → the trade behind "no scheduler"](./guides/optimizations.md#the-trade-behind-no-scheduler);
- **an op-source list contract** → O(delta) list updates when the data layer
  knows what changed, and a keyed diff when it does not.

## Methodology

**Run one axis:**

```bash
cd packages/benchmarks
node scripts/run-one-axis.js <axis>
# axes: initial-render · app-update · list-update · reconcile
#       reactive-update · toggle
#       exodra-initial-render · exodra-app-update
#         (fewer third parties, plus mikadoReactive and exodraOimdb)
```

**One axis per run, always.** Running the whole suite in a single browser
session exhausts memory — that is why the runner takes one axis name and why
each table on this page comes from its own run.

- **Harness:** headless Chromium via Playwright, launched with
  `--js-flags=--expose-gc --enable-precise-memory-info`, over a Vite dev server.
  One shared A/B harness (`src/harness.ts`) drives every axis; each axis is
  `src/benchmarks/<axis>.tsx`.
- **Production builds of every framework.** `process.env.NODE_ENV` forced to
  `production` both at app level and inside `optimizeDeps.esbuildOptions` (the
  top-level `define` does not reach Vite's pre-bundled dependencies, which is
  how react-dom kept loading its development build); `resolve.conditions` set
  explicitly in both places so Solid resolves to `dist/solid.js` rather than
  `dist/dev.js`; `dev: false` for Solid and Svelte; `optimize: true` for Marko.
  **Those lines are load-bearing** — this suite measured React and Solid on
  their debug builds for its entire life because those settings were left to
  somebody else's default. Verify with
  `node_modules/.vite/deps/_metadata.json`.
- **Interleaved:** all participants alternate every round, order rotated, so
  machine load is shared rather than concentrated on one framework.
- **GC between samples**, and only the `measure()` region is timed — setup and
  teardown are not.
- **Medians.** The full spread — min / p25 / median / p75 / max — is recorded per
  participant; the medians are what this page quotes. Rounds and batch are
  positional arguments (`run-one-axis.js <axis> [rounds] [batch]`); each axis
  carries its own defaults when they are left off.
- **Batching past the timer clamp:** the browser's clock is clamped at ~0.1 ms
  and several axes measure work that lands on one or two ticks, so a `batch` of
  N runs N independent scenarios inside one timed region and divides.
- **What the quoted recordings were run at:** 60 rounds, batch 20. The batch is
  written into every `.gate` file and can be read back off it; the round count is
  not written into a recording, so that half is stated here rather than checked.
  The two toggle recordings predate the `batch` field entirely and carry neither
  it nor a `quantum`, which is why they cannot be fed to `compare-axis.mjs`.
- **Idiomatic API per side:** lists are measured on both paths — the op-source
  contract in *list-update* and the keyed diff (Solid `<For>` / Svelte
  `{#each}` / React keyed map / Marko `by="id"` / Lit `repeat()` with its key
  function) in *reconcile*. Conditionals via each framework's own construct.
- **Fair flushing:** frameworks that batch DOM writes asynchronously are forced
  to commit **inside** the timed region or they would read as a bogus ~0 ms —
  Svelte `flush()`, React `flushSync`, voby `oby.tick()`. Exodra and Solid are
  synchronous. A framework with no synchronous flush hook cannot be measured
  fairly here and is excluded; that is why VanJS is not in the suite.
- **Same markup, or it does not count:** a shared gate
  (`src/benchmarks/markup-gate.ts`, plus `scripts/verify-structure.mjs`) mounts
  every participant's app and **diffs its HTML against the reference** before
  anything is timed — an element, an attribute, a text node or an order that
  differs fails the run, and the element count is printed beside every result. A
  framework that silently under-renders would otherwise look fast for doing
  less. The one difference the gate forgives is comment anchors, because marking
  a reactive child position with an empty comment versus with nothing at all is
  a difference of strategy, not of output. The list axes
  additionally gate on *identity*: the node that read `row 0` at mount must
  still read `row 0` afterwards, which is what distinguishes a keyed reconcile
  that moves nodes from a positional render that rewrites text in place. Lit and
  Mikado both pass that gate; without it, Lit's non-keyed forms would run a
  materially cheaper program and win for the wrong reason.

**On absolute numbers.** The milliseconds move between machines, browser
versions and sessions, and a re-run on the same commit can shift every
participant in the same direction. What is stable is the ordering and the ratios
*within one interleaved run*. This is visible on this page in the two toggle
recordings: every one of their fourteen shared rows moves by 10–14% between
`base1` and `base2`, in the same direction, which is the machine and not the
code. Do not compare a millisecond in one table against a millisecond in
another; compare orderings and ratios, and compare absolutes only inside one
recording.

## Reproduce

```bash
git clone https://github.com/abaikov/exodra.git
cd exodra
npm install
npm run build                       # the axes measure dist, not src
cd packages/benchmarks
node scripts/run-one-axis.js initial-render
```

---

# Server render throughput

The other half of SSR is how fast the **server** turns a tree into an HTML
string — the number that bounds how many pages a box can render per second. It
is rarely a page's bottleneck (the network dominates time-to-first-byte), but it
caps throughput under load.

1,000 rows, 80 rounds, one process, one core
(`npx tsx ssr/exodra-measure.mts` from `packages/benchmarks`):

<!-- THE SCRIPT BEHIND THIS TABLE DID NOT RUN FOR MONTHS, AND THE TABLE SAID NOTHING ABOUT IT.
     `ssr/exodra-measure.mts` carried TWO stale names — `renderRows`, since renamed in
     `@exodra/string`, which threw at import; and `bindable`, a reactive primitive under a later name, reached
     through a `require` cast to a shape, which handed back `undefined` and threw at the first row
     instead. `npm run typecheck` caught neither: a cast is a promise the checker cannot keep, and
     no gate ran the file at all — it is named only in the prose above. Its figures stood here with
     a date on them, as if they were current.
     It now RUNS and RECORDS, into `packages/benchmarks/measurements/ssr-throughput.published.json`,
     and every number below is checked against that file. -->

<!-- THE BYTE COLUMN IS EXACT AND IS STILL MARKED, which is not a contradiction. A byte count
     is not a measurement with a distribution — the script reads `.length` off the output and
     the recording carries it under a `bytes` key. The gate matches figures against a row's
     five statistics and does not look there, so tracing it would mean teaching the gate a
     second shape for one column. Marked rather than quietly traced to the wrong thing. -->

<!-- gate: axis=ssr-throughput label=published col=3 -->
<!-- gate: unrecorded col=4 cmd=ssr/exodra-measure.mts date=2026-08-20 -->

| Row | Renderer | ms / render | bytes emitted |
|---|---|---|---|
| `exodra` | **Exodra** (`@exodra/core` + `@exodra/string`) | **0.238** | 122,692 |
| `solid` | Solid `renderToString` | 0.292 | 155,585 |
| `marko 6` | Marko 6 | 0.897 | 152,693 |
| `mikado` | Mikado (hand-written, imperative) | 0.087 | 134,692 |

**Mikado is in this table now and was not before**, and it belongs here: it is a
hand-written imperative program and it renders this page's markup in **0.087 ms**
against our 0.238. The row that was missing is the one that makes the number
mean something.

**The millisecond column is recorded; the byte column is not.** This paragraph
used to say the opposite — *"this table is unrecorded … `ssr/exodra-measure.mts`
prints to the console and writes no `.gate` file, so nothing here is checked
against a run — only that the script exists"* — and that was true when it was
written and stopped being true when the script was repaired. It now writes
`packages/benchmarks/measurements/ssr-throughput.published.json`, a committed
file, and the `ms / render` column is traced cell by cell against it. The claim
about the date went with it: the `2026-08-14` this paragraph used to explain away
as a last-modified stamp is not on the marker any more. What is still unrecorded is
the byte column, for the reason given above it — a byte count is not a
distribution, the recording carries it under a `bytes` key, and the gate does not
look there. The page once named this script `ssr/schema-measure.mts`, which is
not in the repository; it was renamed when the prototype core it used to reach
into was folded into the shipped packages.

**The byte column is not a footnote.** Solid and Marko emit 24–27% more markup
than Exodra because they write hydration keys into every node. That is work they
do and we do not, and a millisecond comparison that hid it would be measuring two
different outputs: a renderer that emits less is faster for a reason no timing
harness detects, so read the two columns together or neither.

At 0.2 ms per thousand rows, server rendering is not the thing you will
optimise.

---

# SSR & hydration: which model wins where

:::caution These client-side numbers have NOT been re-measured

Everything in this section was measured on the **previous** renderer, before the
replacement that produced the numbers above, and the harness has not been re-run
since. The TTI figures below are therefore unverified against current code. They
are kept because the *shape* of the trade-off they describe — bytes versus
resumability — is a property of the two models rather than of our renderer, and
because deleting a result is not the same as re-measuring it. Read the ranking
as directional and the milliseconds as stale.
:::

Server rendering gets HTML on screen fast; the interesting question is
**time-to-interactive (TTI)** — when the first click actually *does* something —
and the **bytes** it costs to get there. Two models compete:

- **Hydration** (Exodra, Solid, React…): the server sends HTML, the client
  downloads a JS bundle, rebuilds the component tree, and wires up listeners.
- **Resumability** (Qwik): the server serialises enough state into the HTML that
  the client can *resume* without re-running components — it ships almost no JS
  up front and lazy-loads code per interaction.

Neither is universally faster. Four apps were built, served statically, and fired
by real Chromium under **Fast 3G + 4× CPU throttling** (the conditions where
payload size actually matters), median of 5 runs.

**Three of the four no longer have an Exodra participant, and the numbers below
cannot be reproduced.** `ssr/land-measure.mjs` opens with *"NO EXODRA PARTICIPANT
HERE. The landing app existed only for the deleted three-props renderer; no
schema-core replacement has been written, so this comparison is Solid vs Qwik
until one is."* Its participant map is `{S, Q}`. `ssr/todo-measure.mjs` says the
same and runs `{S, Q, M}`. Only the **uniform list** row has an Exodra
participant today (`ssr/measure.mjs`).

So the Exodra column in the first three rows is a measurement of a renderer that
no longer exists, and it is struck through rather than deleted: deleting it would
hide that the comparison was once made and is now unmakeable, and leaving it
plain would publish a win nobody can check.

The second claim in this paragraph was also wrong and is corrected here: the
setups were **not** code-split. `build/build-exodra.mjs`, `build-marko.mjs` and
`build-mikado.mjs` each say verbatim *"ONE file, no code-splitting"*. Every
sentence below that leans on "assuming you code-split" is reasoning about a
configuration these scripts refuse to produce.

## The map — TTI (ms, lower is better) — *not re-measured*

| App | Exodra | Solid | Qwik |
|-----|--------|-------|------|
| Landing — static page + a few interactive islands | ~~520~~ *(no participant)* | **481** | 635 |
| Todo — 200 cards (tags + nested comments + authors) | ~~983~~ *(no participant)* | 1197 | 1483 |
| Todo — 1000 cards (long list) | ~~3227~~ *(no participant)* | 4468 | 4957 |
| Uniform interactive list — 1000 rows | **1072** | 1179 | 2298 |

On the landing page Exodra and Solid did not separate reliably — two independent
runs put them at 494 vs 492 ms and 520 vs 481 ms, so the ordering flips with the
noise. That app is small enough that hydration cost barely registers.

HTML weight, gzipped, on the 1000-card todo: Exodra ~19 KB, Solid ~38 KB, Qwik
~67 KB.

## Interpreting the numbers

- **The page *appears* at essentially the same time regardless of framework.**
  First Contentful Paint on every app here was ~200–270 ms for all three — a
  spread below what a person notices. SSR does its job everywhere; the framework
  choice shows up in **when it becomes interactive**, not in when it paints.
- **The interactivity gaps are modest on light apps.** On the landing and the
  small todo they are ~130–500 ms — real, but near the edge of perception. They
  grow into the obviously-worth-it range only on the heavy cases.
- **The conditions are pessimistic on purpose.** Fast 3G + 4× CPU throttling is
  there to make payload *visible*. On a decent phone over a good connection
  everything is far faster and the absolute gaps shrink proportionally.

## What each model suits

**Resumability (Qwik)** has a real, underrated strength: **automatic chunking.**
You do not hand-write `lazy()` — the compiler splits every handler and component
for you, and a large app is route-split automatically. It ships ~0 JS up front,
so it shines when **most of a large page is never interacted with**. If a team
tends to forget to code-split, Qwik removes that failure mode by construction.

**Hydration with a small eager bundle** (Exodra, Solid) wins when the
interactive bundle is already modest: the framework loads *during* initial load,
so the first interaction is instant. Qwik loads its runtime core lazily on the
first interaction, so the very first click pays a download a hydration app
already paid cheaply.

**Exodra carries the leanest HTML of the three** — no per-node hydration markers
(Solid emits `data-hk` keys), no per-node resume state (Qwik serialises it into
the markup). That is the one claim in this section with any supporting evidence
outside it: the server-throughput table above shows the same gap on the byte
column. That table is itself marked unrecorded and undated — it is better
evidence than the TTI figures below, not proof.

## Caveats

- **This assumes you code-split.** Qwik's advantage is largest — and can flip the
  result outright — against a hydration SPA that ships one giant un-split bundle.
  That is a configuration failure, not a property of hydration, and it is exactly
  what Qwik's automatic chunking spares you.
- **The "click immediately" metric is a worst case for Qwik.** The harness fires
  the first click the instant the page commits. A real user pauses, and during
  that pause Qwik prefetches its runtime and handler chunks.
- **These applications are interaction-dense, which is not the scenario Qwik
  targets.** Qwik is designed for content-heavy pages with sparse interactivity,
  where code for everything untouched never loads. On that shape its ceiling —
  roughly O(1) initial JS regardless of app size — is an architectural advantage
  a hydration framework can only approach with disciplined manual splitting.
- **On broadband the HTML-weight advantage largely stops mattering.** Re-running
  the 1000-row cases at 30 Mbit with no CPU throttle put the whole spread under
  200 ms (Exodra 125, Solid 122, Qwik 181 on the uniform list) — a range in which
  a person notices nothing. *Also not re-measured.*
- **The harness carries one deliberately synthetic counter-example**
  (`ssr/heavy-measure.mjs`): **48** rows — not the 1,000 this page claimed until
  2026-08-20 — whose click handlers each reference their own unique
  multi-kilobyte function, none of which runs during render. The script reads
  `const M = +(process.env.M || 48)`; the row count was overstated twentyfold.
  **And it has no Exodra participant either** — its own second line says so: *"NO
  EXODRA PARTICIPANT HERE. The heavy app is generated by `ssr/gen-heavy.mjs`,
  which used to emit an Exodra flavour written against the deleted three-props
  renderer."* So it is Solid against Qwik, and it says nothing about us at all.
  Qwik splits every handler into its own lazy chunk and loads none of them; the
  hydration side ships all of it in one un-split bundle and loses badly. Read it
  as a demonstration of what *not* splitting your bundle costs, not as evidence
  about hydration — and not as evidence about Exodra.
- **The harness is in `packages/benchmarks/ssr`** (real production builds +
  Playwright with CDP throttling): `node ssr/land-measure.mjs`,
  `ssr/todo-measure.mjs`, `ssr/measure.mjs`, `ssr/fastnet.mjs`. `ssr/dist/` is
  gitignored, so build the client bundles first. **Rebuild them whenever the
  framework changes** — the server side renders through a live import, but the
  hydration side is a bundle on disk, and a stale one silently measures old code.
  That is the same failure mode as the debug-build error at the top of this page.
