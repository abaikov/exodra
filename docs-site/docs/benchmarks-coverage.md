---
title: What the benchmarks do not cover
---

# What the benchmarks do not cover

The goal this page checks was stated as one sentence: **for every question this renderer answers
there must exist a strategy a user can select that lands at or under what a hand-written program
with no abstraction would cost.** Sharpened into a requirement on the benchmark suite it has
three parts — every axis carries a **native floor** (a straight-line participant, no abstraction,
same output); the axes cover the **typical** situations rather than the convenient ones; and every
axis shows a **strategy row** beside its default, written as a composition a user could copy.

Nobody had checked the suite against it. This page is that check, read off
`packages/benchmarks/scripts/run-one-axis.js`, the axis sources, and the recordings in
`packages/benchmarks/measurements/`. **Nothing was run to write it.** Every number below was read
out of a file on disk, and the file is named beside it.

"Below the floor" is not nonsense, and the suite already contains three measured cases of it. A
floor prices a straight-line program doing a **fixed job**; a strategy can do a **different,
smaller job**, because composing it tells the engine something the floor program was never told.
Keep-alive skips the clone, the walk and the wiring. Identity reconcile never diffs keys, because
the data layer gives each row a permanent
slot. A detached build pays the document-adopt step once instead of per insertion — and that last
one is a **mechanism, not a verdict**: where it was measured head-to-head against the direct form,
on `toggle`, it **lost** (`floor·rebuild·frag` 5.9 ms against `floor·rebuild·owned` 5.3, same
contract, `toggle.with-floor`).

Since 2026-08-22 the suite also contains the **remedy** for that shape rather than only the
observation: `toggle`'s floor family declares a floor per *contract* — one for a block that is
rebuilt, one for a block that is kept — so a keep-alive row is bounded by a program doing the
keep-alive job and never by one doing the rebuild's. "Below the floor" becomes "under the floor of
a different job", which is a sentence with a number on each side of it.

## The arithmetic

**The map holds 35 axes, and this page examines 24 of them.** The first number is a count of the
keys in `AXES` (`packages/benchmarks/scripts/run-one-axis.js`), taken by reading that object. The
page used to open by claiming 25; that was the count when the survey below was written and eleven
axes have been registered since without being added to it. One axis has also been struck —
`props-vs-ports`, whose two participants were the same renderer, whose `ms/mount` could not resolve
25 ns per port fill, and which could not be rebuilt honestly after the per-instance context moved
onto the instance's own record.

**The eleven registered axes this page says nothing about** are `attr-floor`, `door-count`,
`handler-count`, `machine-vs-cells`, `one-and-static`, `op-click-floor`, `pagination`,
`plugin-compose`, `plugin-price`, `refetch` and `rewire`. They are not counted as failing and they
are not counted as passing: **they are unexamined**, which on a page about what the suite does not
cover is the one status that must not be silently folded into a denominator. Every number in this
section is therefore *of the 24 examined*, and the honest reading of the suite as a whole needs the
other eleven read first. Earlier counts elsewhere in this repository say twenty-one, twenty-four or
twenty-five, and `keystroke-floor`'s own header still says "Twenty-four axes are registered" — every
one of them was true when written and none is now, so take the `AXES` keys as the only live count.

| | count | of the 24 examined |
|---|---|---|
| axes carrying a native floor participant | **9** | mount-floor, update-floor, ssr-floor, teardown-floor, clone-threshold, context-cost, **toggle**, **schema-build**, **keystroke-floor** |
| axes carrying a strategy row | **8** | exodra-initial-render, exodra-app-update, list-update, toggle, component-split, update-floor, hydrate-floor, **keystroke-floor** |
| axes carrying **both** | **3** | update-floor, **toggle**, **keystroke-floor** |
| axes carrying **neither** | **9** | initial-render, app-update, reconcile, reactive-update, virtual-list, mount-phases, child-mark, teardown-phases, import-node-trade |

Both columns describe how an axis is **built**. They do not say a number exists. **Four of the 24
examined have no recording in `packages/benchmarks/measurements/` at all**: `clone-threshold`,
`virtual-list`, `component-split` and `import-node-trade`. A fifth, `props-vs-ports`, was in this
list and has been struck from the suite; it was run twice and never recorded, and what it produced
is quoted in `TExoDomNode.one`'s comment instead.
One of the four appears in the counts above — `clone-threshold` in the floor column —
so read the counts as *built*, and this list as *timed*. The two
states are kept apart everywhere on this page; collapsing them is how a suite comes to be believed
to cover something it has never run.

Two axes carry a row literally named `floor` that is **not** a floor in the sense above, and they
are counted out of the nine deliberately — see [The two harness floors](#the-two-harness-floors).

The requirement's first part fails on 15 of the 24 examined axes and its third on 15, with eleven
more axes unexamined in either direction. **The second part —
coverage of the typical situations — is where the real hole is**, and it is not visible in either
number: one shipped package and two shipped plugins appear in no axis at all, and a second package
(`@exodra/forms`) appears in exactly one axis that has produced no number.

## The 24 examined axes

`floor?` asks whether the axis itself carries a participant that is a straight-line program with
no abstraction producing the same output. Where the answer is no but a floor for the same
situation exists on another axis, that axis is named. `strategy?` asks whether a row shows a
different composition of Exodra beside the default.

| axis | floor? | strategy row? | the situation, in a user's words |
|---|---|---|---|
| `initial-render` | **no** — eleven framework rows, no hand-written program. Its floor lives on `mount-floor`, same app | **no** — it carried one until the second backend was deleted, and the default is now the only Exodra composition on the axis | a page opens and the whole app appears for the first time |
| `exodra-initial-render` | **no** — same app, restricted to the reactive participants. Floor on `mount-floor` | `exodraOimdb` — the same app with an identity data layer under it | the same first mount, judged only against renderers that keep fine-grained state |
| `exodra-app-update` | **no** — its `floor` row is the harness floor | `exodraOimdb` | every card in the app flips at once |
| `app-update` | **no** — its `floor` row is the harness floor. The job's floor is `update-floor`'s `WIDE` | **no** | every card in the app flips at once, against ten other libraries |
| `list-update` | **no** — the floor for this transition is `update-floor`'s `GROW-SHRINK` | `exodraOps` — the list moved by explicit operations instead of a new array | a list grows by some rows and loses others |
| `reconcile` | **no** — the floor for this transition is `update-floor`'s `REORDER` | **no** | the rows of a list are shuffled into a new order |
| `reactive-update` | **no** — the floors are `update-floor`'s `TEXT-ONE` and `TEXT-SWEEP` | **no** | one value changes, and then a thousand values change |
| `toggle` | **yes**, since 2026-08-22 — a floor family in `floor-toggle.ts` with one cell per *contract*: `floor·rebuild·owned`, `floor·rebuild`, `floor·kept·owned`, `floor·kept`, plus the null `floor·rebuild·twin` and the probe `floor·rebuild·frag` | `exodraKept` (children built once and kept) and `exodraDelegated` (one root listener instead of 200) | a block of the page is hidden and shown again, twenty times |
| `virtual-list` | **no**, and no floor anywhere | **no** | a long list is scrolled, so rows leave the window and come back |
| `component-split` | **no** | `exodraMono` — the same app as one schema instead of four components | the app is written as many small components, or as one big one |
| `clone-threshold` | **yes** — `manual`, straight-line `createElement`, gated on identical markup and element count (`clone-threshold.tsx:598`) | not needed — the shipped default is the row that wins | many copies of one small template are built |
| `mount-phases` | **no** — its rungs are hand-written replicas of one backend's internals and none of them wires anything, so they are phases of the job and not the job | **no** | (a diagnostic — where a mount's time goes) |
| `child-mark` | **no** — its base rung is a subtraction baseline (the same clone without the store), not a program with the same output | **no** | (a diagnostic — what it costs to associate data with an element: an expando against a `WeakMap`) |
| `context-cost` | **yes** — `parent·d4/d16/d64`, a bare `parentNode` walk, plus an independently declared twin whose true difference is zero | **no** | a component reads a value some ancestor provided |
| `teardown-phases` | **no** — replicas of `@exodra/dom`'s own code; the `textContent` row is bare DOM but clears a region rather than performing the teardown | **no** | (a diagnostic — where a teardown's time goes) |
| `import-node-trade` | **not applicable** — *every* row is a program with no abstraction and no renderer is in the axis at all | **no** | (a diagnostic — what document ownership costs a clone and an insert) |
| `mount-floor` | **yes** — `clone+refs`: cloned prototypes, addressable ports, references retained, byte-identical output through a shared `markupOf` gate | **no** | the 80-card app is mounted, against the cheapest program that could produce it |
| `update-floor` | **yes** — `floor·told` / `floor·diff` / `floor·bound`, one per transition, each stepped beside the renderer with the markup diffed after every step | **yes** — `exodra·kept` on `WIDE`, `exodraOps` on `GROW-SHRINK`, `exodra·children` on `WIDE` and `REORDER` | five transitions taken from the axes above, each against the minimum DOM work that performs it |
| `hydrate-floor` | **no**, and its own header says so — it compares two real paths through one renderer | **yes** — `hydrate` against `mount` is the strategy choice | the markup arrives from the server and the page wakes it up, instead of building it on the client |
| `ssr-floor` | **yes** — `floor`, a hand-written program producing the same 140 kB with escaping intact | **no** | a thousand rows are rendered to a string on the server |
| `teardown-floor` | **yes** — `dom·*` and `book·*` rows, each carrying a document contract and a state contract | **no** | a page is thrown away |
| `keystroke-floor` | **yes, and RUN** — `floor·per-el` and `floor·root` are hand-written listener programs with no framework in them, with `floor·per-el·twin` as the null, which landed at exactly 0.0000. Two recordings: `keystroke-floor.published.json` and `keystroke-floor.b8.json`. Its markup gate did fire on the first run and refused to time programs whose markup differed (`keystroke-floor.ts:231-265`) — the hand-written prototype lacked a ` value=""` the renderer then emitted | **yes, and RUN — and NO strategy reaches this floor**, which is the axis's published result. At batch 8: `exodra` 1.43×, `exodra·free` 1.13× but it gives up a controlled input (different contract), `exodra·deleg` 3.57× on a keystroke against 0.86× at mount — delegation is a mount strategy and the axis says so. The instrument alone is 74.6% of a floor keystroke, so every corrected figure is a difference of small numbers | a person types one character into one field of a fifty-field form |
| `schema-build` | **ITS SOURCE IS NOT IN THE TREE.** A recording survives — `packages/benchmarks/measurements/schema-build.published.json`, section `APP-US`, arms `literal`, `+number`, `+builder`, `+checks` and their twins — but there is no `schema-build` file under `packages/benchmarks/src` and no entry for it in the runner's AXES map, so nothing here can re-run it and every figure below taken from it is UNREPRODUCIBLE until the axis is written again. The runner names it only in comments. **No floor for the refusals**, and none is definable | **no** — its rungs are a ladder, not a composition a user selects. Its floor is the copyable form: hand-writing the literal *is* what a user would do instead | the process starts and every component's schema is constructed |

## The two harness floors

`app-update` and `exodra-app-update` each carry a row named `floor`, and it is a real
hand-written program — `floor.ts` renders the reference app's markup as **inert HTML** and lets
the harness click it exactly as it clicks a live app. But its `flip` attaches no handler and
nothing re-renders. It prices the harness (`clickAll` finding 160 buttons and dispatching a real
`MouseEvent` at each), which a V8 profile put at 42% of what the axis printed.

That is a floor on the **instrument**, not on the **job**. It makes the table readable — a row is
"floor plus the renderer's own work" rather than a number 42% of which belongs to nobody — and it
says nothing about how cheaply the app could have been updated. The floor for that job is
`update-floor`'s `WIDE` transition, which drives the same flip by writing to sources with no click
harness in the region at all.

**Counting these two among the six would be the exact error this page exists to catch**: a row
named `floor` that bounds a different quantity.

## Where a strategy is measured at its floor

Five cases, all read off recordings. Each is quoted **within its own run**, because
`update-floor.published` and `update-floor.shuffled` were taken under different phase orderings
and the file forbids placing a number from one beside a number from the other. `toggle` adds a
second rule of the same kind: its rows are quoted **within a contract**, never across one.

- **The hide-and-show block, against its own contract's floor.** `toggle.with-floor`, section
  `TOGGLE`, medians in ms. The floor family splits on two contracts — what survives a hide
  (`rebuild`: nothing survives; `kept`: the same 200 panels come back) and what the program may do
  to the host element (`owned`: empty it in one call; shared: remove children one at a time). The
  `·owned` rows are the bound for every Exodra row on this axis (`participants/floor/toggle.ts:87-94,118`).
  Within `(rebuild, owned)`: `floor·rebuild·owned` 5.3, `exodraDelegated` 5.5, `exodra` 6.2 — so
  the default is **1.17×** its floor and the delegated pack **1.04×**. Within `(kept, owned)`:
  `floor·kept·owned` 1.6 against `exodraKept` 2.2 — **1.37×**.
  **Read the 1.04× as "at the floor within what this run resolves", not as four percent**, for the
  reason in the axis's own caveat below.
  `exodraKept` at 2.2 sits **2.4× under** `floor·rebuild·owned` at 5.3, and that ratio is a
  **cross-contract** one: `participants/floor/toggle.ts:239-242` forbids it as a headroom and it is printed here
  only as the size of the job difference — keep-alive creates no element inside the timed region
  and the rebuild rows create 4000 per sample.
  **The caveat that must travel with all of these:** the null
  `|floor·rebuild − floor·rebuild·twin|` is 5.7 − 5.7 = **0.000 ms**, and that is **bias only**.
  The harness reports medians, not paired per-round series, so round-to-round noise is unmeasured
  by it. **A 0.2 ms difference on this axis is a range, not a size.**
  One row of the family is a probe rather than a cell and it did not win: `floor·rebuild·frag`,
  the same `(rebuild, owned)` program with the 200 clones assembled in a module-level fragment,
  landed at 5.9 against `floor·rebuild·owned` 5.3, so batching the insertion did not take the
  contract's floor away from the direct form.

- **Keep-alive, on the app-wide flip.** `update-floor.published` puts `WIDE/exodra` at 119.5313 µs,
  `WIDE/floor` at 52.3438 and `WIDE/exodra·kept` at 49.2188 — **under the floor of its own run**.
  `update-floor.shuffled` puts the same three at 115.625, 51.5625 and 56.25 — **over it, by 9%**.
  So the honest reading is *at the floor, within the disagreement between two runs*, and not
  "below" it. The axis's own header calls `exodra·kept` a **diagnostic** rather than a shipped
  row, and its second prediction (Q6) failed on the half that expected it to sit above
  `floor·bound`. The mechanism is the point: a strategy that keeps what the default rebuilds is
  not doing the floor's job faster, it is doing a smaller one.
- **The list moved by operations.** `GROW-SHRINK/exodraOps` is 1.2969 µs against `floor·told`
  0.3906 — **3.32× above its own-contract floor**, and 3.7× under the default `exodra` at 4.7813.
  It closes most of the gap and does not reach.
- **The default under the derive-contract floor.** In `update-floor.published`,
  `GROW-SHRINK/exodra` at 4.7813 against `floor·diff` at 6.1406 is **0.78×** — the renderer beats
  the floor. In `update-floor.shuffled` the same two rows land equal, at 6.0938 and 6.0938. **The
  refusal is recorded in the shuffled run and not in the published one** — `update-floor.published`
  carries no refusals at all — and it reads "NO BOUND FROM THIS ROW". It names the cause in
  advance: `floor·diff` is one general reconciler with no special
  cases, and `attach-exo-children.ts` carries fast paths for exactly this shape. It is a finding
  about the floor, not about the renderer, and it is in this page because a floor a framework can
  beat is not a floor.
- **Clone against straight-line construction.** `clone-threshold` has **no recording on disk**.
  Its own source reports a run at batch 10 in which `manual` tied at one element and lost from two
  upward, by 2.1× at twenty-five. Read that as the axis's claim about a run nobody can open, not
  as a recorded figure.

And one strategy that has been WITHDRAWN: `bank-vs-clone.published` holds `clone` at 656.3 ns per
card against `pop + full reset` at 531.2, measured on the node bank. **That plugin has been removed
from `@exodra/dom` and its axis with it**, so the recording describes a renderer this repository no
longer contains and bounds nothing in it. It is not a strategy anybody can select today, and no
other axis measures node reuse.

## Floor, no strategy — and a named guess for each

Five axes carry a floor and show nothing beside the default that would close the gap. For each,
the composition I would build as the strategy row. **Every one of these is a guess.** None has
been run, and where a number appears it is arithmetic on a recording, not a measurement of the
strategy. The fifth, `schema-build`, is the exception that is not a guess, and it is last.

- **`mount-floor`** — `exodra` 0.2938 ms against `clone+refs` 0.2175, a gap of 1.351×.
  **GUESS: a coarser prototype.** The node bank half of this guess is dead — the plugin has been
  removed from `@exodra/dom` — so what is left is the prototype shape. `mount-floor`'s own table holds
  `app-clone` at 0.1800 against `card-clone` 0.2038 and `clone` 0.2175 — **cloning the whole app
  as one prototype is cheaper than cloning it card by card**, which is the "smaller job" shape:
  fewer, bigger clones and fewer insertions. `mount-floor`'s header names node recycling
  explicitly as something its floor refuses to do, so the axis already knows where its own
  strategy row would sit.
- **`ssr-floor`** — `exodra` 0.2450 ms against `floor` 0.0575, a gap of 4.26×, of which the floor's
  own escaping is 82%. **GUESS: the flat shape plus a per-row markup memo.** `exodra·flat` is
  already a row at 0.2275 — 7% under `exodra` — so removing the component boundary is worth
  something measurable; a memo keyed by the value tuple would skip the escaper on a repeated row,
  and the escaper is where the floor's own time goes.
- **`teardown-floor`** — `teardown-floor.published`, `CYCLE/cycle·exodra` 0.3338 ms against
  `CYCLE/cycle·floor` 0.2587. A second recording, `teardown-floor.cycle200`, puts the same two at
  0.3790 and 0.2677, so **quote the gap as a range, 1.29–1.42×, and never a single digit**.
  **GUESS: keep-alive, spelled as `toggle`'s `exodraKept`** — `bindChildren` over a retained array
  so a teardown parks rows instead of dropping them. This
  is the one guess with a measured sibling: in `toggle.with-floor`, `exodraKept` at 2.2 ms is the
  fastest **framework** row on an axis whose expensive half is destruction. It is no longer the
  fastest row on the axis — `floor·kept·owned` 1.6 and `floor·kept` 2.1 are both under it, which is
  the point of having built them: the strategy that looked unbeatable has 1.37× of headroom inside
  its own contract.
- **`context-cost`** — `climb·d4` 109 ns against `parent·d4` 88 (its twin 89, so the difference is
  far outside the null). **GUESS: hoist the read.** Read the context once at the boundary and pass
  the value down as an ordinary port fill, so the climb is paid once per mount rather than once
  per consumer. The axis's group C already shows the shape of the cost — `inject·1` 1.6667 ns,
  `inject·8` 7.6667 — so the strategy's value grows with depth, which is exactly what a per-mount
  hoist removes. (**The unit was `µs` here until 2026-08-22 and it was wrong.** `context-cost.ts`
  prints its phase table through `nsCol`, `x * 1e6` on a millisecond, and its own legend says the
  block below it is "MICROSECONDS, which is a thousandth of the column above" — so every row of
  that table, group A's climbs included, is nanoseconds.)

- **`schema-build`** — and this one is **not a guess**, because the floor and the alternative are
  the same row. `schema-build.published`, section `APP-US`, the four schemas of the reference app,
  medians in µs: `literal` 0.15 → `+number` 0.25 → `+builder` 1.40 → `+checks` 2.20, with the
  shipped `createExoSchema` at 2.05. **Two of the ladder's steps may be quoted and the rest may not.**
  Quotable: `+number` → `+builder` is **+1.15 µs**, and `+builder` → `+checks` is **+0.80 µs** —
  **the builder costs more than the refusals do**, which is the opposite of the order the core
  section below assumed when it called the refusals the 2026-08-22 production cost. Not quotable:
  `literal` → `+number` lands at 0.10 µs, exactly this run's resolution floor, and the run refuses
  it by name; `PAGE-US/literal` is refused outright as quantisation. **And the top rung is void**:
  `createExoSchema` 2.05 came in *under* `+checks` 2.20, so the last step is negative and prices nothing —
  the shipped call measured cheaper than the local replica of what it contains.
  The refusals' own cost, per `el()`, read off the `perElement` column of the two censuses in that
  same recording: `APP-US` `+checks` 275 ns − `+builder` 175 = **100 ns per `el()`**; `PAGE-US`
  315.4 − 176.9 = **138.5 ns per `el()`**. That is a cost per call and this page will not turn it
  into a share of anything. **The axis refuses to pick between two estimates of it**: the ladder
  subtraction and the transcribed check bodies in `checks·parts` (0.55 µs) disagree by 0.25 µs over
  the region, more than the run's resolution floor, and the recording says to read both before
  quoting either. `SPEC-US` adds the one cold path: `spec·warm` 0.75 µs against `spec·cold` 3.95
  over eight names, which the axis prints as **+400 ns for a first-ever attribute name** over a
  memoised one.
  **The composition, and it needs no run to state**: write the schema literal by hand and skip the
  builder. It is the `literal` / `+number` rung, it is copyable, and the recording already says
  what it saves. It is listed here rather than in the strategy column because it is the floor, not
  a different composition of the shipped path.

`clone-threshold` is the sixth axis with a floor, and it needs no strategy row: its **default** is
the row that beats the floor.

## The situations nothing measures

Ordered by how often a real application does the thing. This is the part of the check that does
not come out of the axis list — it comes from what the packages ship.

**First, the state between the two.** A situation can have an axis built for it and still have no
number, and this page will not file that as either "covered" or "nothing measures it".

- **A user types into a form** — *an axis exists and has produced nothing.* `@exodra/forms` ships
  `readExoControlValue`, `readExoControlValues` and `writeExoChoice` for every control, and until 2026-08-22 no axis in
  the map loaded the package. `keystroke-floor` now does: one keystroke in one field of a
  fifty-field form, with `floor·per-el` and `floor·root` as hand-written listener programs,
  `exodra·deleg` for the delegated pack and `exodra·free` for the same field left uncontrolled —
  so the write-back that makes a field controlled (`el.value = next`, put back over the string the
  browser already wrote) gets a price of its own. **There is no recording.** The axis's markup gate
  fired on its first run and refused to time programs whose markup differed, and nothing has been
  recorded since. Until it runs, the most common interaction a web application has still has no
  number — it now has a program waiting to produce one, which is a different sentence.

**And then the situations with neither.**

1. **The user navigates to another page.** `@exodra/router` ships — matching, guards, lazy
   branches, catch-all — and **no axis loads it either**. A `router-navigate` axis is the missing
   instrument. Every list axis measures a list
   changing; nothing measures a whole page being replaced by another.
2. **A list is refetched.** Fresh objects, same ids. `axes/list/reconcile.tsx:103` says in as many words that
   it hands out **one object per id for the life of the process**, and every other list axis does
   the same. Identity reconcile is the engine's central bet, and its adversarial case — the data
   layer handing back new object identities for unchanged rows — is measured **nowhere**. The
   pack that exists for exactly this, `EXO_KEYED_LIST_VOCABULARY` in `@exodra/list-reconcile`,
   appears in no axis.
3. **A click on a page with a thousand handlers.** The delegated pack has two appearances and
   neither prices a dispatch. On `toggle` it is `exodraDelegated`, on an axis whose timed region is
   a rebuild — so the pack is priced by what it costs to *install*. That install now has a floor
   beside it: `toggle.with-floor` puts `exodraDelegated` at 5.5 ms against `floor·rebuild·owned`
   5.3, same contract, one root listener against 200 handlers, and the 0.2 ms between them is
   inside what that run can resolve. `keystroke-floor` is the axis that would time a dispatch, and
   it has produced nothing. `event-dispatch` is still booked as a missing axis worth six decisions.
4. **Deeply nested markup.** Every DOM axis runs the 80-card app (three to four levels) or a flat
   list of 200 / 300 / 1000 rows. Depth is swept only by `context-cost`, for the context climb,
   and by `teardown-floor`'s single `scale·deep4` row. No axis mounts, updates or tears down a
   deep tree as its subject.
5. **An attribute-heavy update.** `reactive-update` and `update-floor`'s two text transitions
   write text. Classes, styles, boolean properties and namespaced attributes have parity *tests*
   and no measurement; `attribute-write-memo` is booked as a missing axis.
6. **A hydrated page that then updates.** `hydrate-floor` proves a port is live with one bubbling
   click, and stops there. What the first update after hydration costs — the case every server-
   rendered application reaches within a second — is measured by nothing.
7. **A server render that provides context.** `ssr-floor` renders one 5-port component with a
   **stateless** wire, and the five apps in `packages/benchmarks/ssr/apps` use no
   `provide` anywhere. The documented way a page reaches the request is a context token,
   and that path has no number. The same gap covers document assembly: `@exodra/ssr` builds the
   document around the instance markup `ssr-floor` measures, and no axis includes it.
8. **A component that unmounts and remounts.** `toggle` hides and shows a block of a live app —
   and since 2026-08-22 it does so against a floor per contract — but nothing swaps a component
   boundary the way a route change does. `component-split` measures many-small against few-large at
   exactly one size and one shape, and has no recording on disk.
9. **SVG.** No axis renders any. There is a test file and no measurement.
10. **A backend other than `@exodra/dom`.** `@exodra/term` is a shipped backend that runs the
    README's components, and no axis loads it. The one axis that ever ran a second backend beside
    the DOM one, `dom-vs-stage0-phases`, went with the backend it measured, so nothing in the map
    now prices the schema core anywhere but in a browser.
11. **Memory over a session.** Two axes print a heap column; `retained-size` is booked as a
    missing axis. Nothing measures what a long-lived page retains.

**One situation from the original list turned out to be covered**, and it is worth saying so
rather than padding the list with it: *teardown of a page that never updated* is precisely
`teardown-floor`'s `SINGLE` family — the 80-card app is mounted, torn down, and the teardown is
gated by a bubbling click on all 80 toggles that must move nothing.

## Where a no-floor axis's floor actually lives

Four of the five comparison axes with no floor participant do have one — on `update-floor`, which
took its five transitions from them by name. The work-list this implies is not "build five floors"
but "quote the one that exists":

| axis with no floor | its floor | contract the pair must share |
|---|---|---|
| `reactive-update` | `update-floor` / `TEXT-ONE`, `TEXT-SWEEP` | `told` vs `derive`, and `floor·bound` for the dispatch |
| `reconcile` | `update-floor` / `REORDER` | `floor·told` and `floor·diff` are two defensible answers |
| `list-update` | `update-floor` / `GROW-SHRINK` | the derive floor **loses** here; use `floor·told` |
| `app-update`, `exodra-app-update` | `update-floor` / `WIDE` | `WIDE`'s renderer row is a re-declaration with hoisted state |
| `initial-render`, `exodra-initial-render` | `mount-floor` | same app, byte-identical output |

**`virtual-list` and `component-split` have no floor on any axis** — and neither has a recording on
disk either, so nothing about them can be quoted at all. `props-vs-ports` was a third of this kind
and is no longer in the suite: it had no floor, both of its participants were the same renderer, and
one grid step of its `ms/mount` was 25 ns per port fill, so it could not resolve the difference it
existed to price. **A situation with no floor and no number is unmeasured, and striking an axis that
cannot resolve does not make it more unmeasured than it already was** — what it removes is a row in
this table implying otherwise. The question it stood for — what it costs a parent to hand a nested
child one object — is still unmeasured, and would need a different shape to answer: a timed region
containing only the fills, against pre-built instances, with a straight-line participant writing the
same values into the same nodes as its floor.

**`toggle` was the fourth, and it is the one that got fixed.** It was the sharpest of the four
because it is the only recorded axis where the default `exodra` row sits behind `solid`, and the
newer recording says so too: `toggle.with-floor` has `exodra` at 6.2 ms and `solid` at 5.9, where
`initial-render`, `app-update`, `list-update`, `reconcile` and `reactive-update` all put `exodra`
ahead of it. (`toggle.base1` had the same two at 10.2 and 9.2; the runs are not comparable to each
other and the ordering is what carries across.) Its expensive half is destruction. Both halves of
its 200-panel block now have a floor **on the axis itself** — `floor·rebuild·owned` for the half
that rebuilds, `floor·kept·owned` for the half that keeps — which is why `toggle` has moved out of
this section and into both columns of [The arithmetic](#the-arithmetic). `teardown-floor` still
measures a different app, and is still not that floor.

## What is unmeasured in `@exodra/core`

The list above is read off the packages. This section is the same check read off **one** package,
the one every other package and every axis sits on top of. It was written the same way: from
`packages/core/src`, the axis sources under `packages/benchmarks/src/benchmarks`, `harness.ts`,
and the JSON in `packages/benchmarks/measurements/`. **Nothing was run to write it.**

One rule decides every "is it covered?" below, and it is the rule this page exists to enforce. A
core symbol named in a benchmark file's **comment**, or **imported** and used only to build a
fixture before the clock starts, is **not covered**. Coverage means the call happens between
`harness.ts:347`'s `performance.now()` and `:349`'s.

### The seven areas

| area | in a timed region? | floor? | strategy row? | the situation, in a user's words |
|---|---|---|---|---|
| `@exodra/list-reconcile` | **yes, through `reconcileExoOrder` only** — called from a transition over `c.childList(port)`; it calls the package-internal `getExoSequence` on a middle whose survivors changed order. The REORDER rungs that called the subsequence and the placement pass BY HAND, `floor·seq` and `floor·place`, are struck (`packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:228-243`), and the placement pass itself is deleted. No backend reaches the package: `.dependency-cruiser.cjs`'s `backends-do-not-know-the-reconciler` keeps it so | **yes** — `update-floor` / `REORDER` / `floor·told` | **yes** — `exodraOps` on `GROW-SHRINK`, `exodra·children` on `REORDER` | a list is reordered, grows, shrinks |
| `attr/` | **no** — not one symbol is named in any axis, and the plan compilers that call them run in `prepare()` or in warm-up | **no**, and only half of it can have one | **no** | an update writes `class`, `style`, `checked`, `aria-*` — not text |
| `events/` | **yes** — `assertExoEventPort` is, on `toggle`, and `op-click-floor` and `keystroke-floor` both fill a real event port and then drive it. `TExoEventHandler` is a type and emits nothing: what a timed region reaches is the backend's slot setter and its one `handler.call` | **yes** — `op-click-floor` and `keystroke-floor` each carry hand-written listener programs with no framework in them (`floor·per-el`, `floor·root`) | **yes** — `op-click-floor`'s `exodra·closure` / `exodra·op` / `exodra·op·deleg`, `keystroke-floor`'s `exodra·deleg` / `exodra·free` | a button is clicked and a value changes |
| `context/` | **yes** — `exoContextFrame` and `readExoContext` both, on `context-cost` | **for the provide, yes** (`push` is the floor its own header names); **for the read, no** | **no** — this page books "hoist the read" as a GUESS | a component reads a value an ancestor provided |
| `runtime/` | **no** — `grep 'exoRuntime('` over all of `packages/benchmarks` returns nothing outside `dist/` | **no** | **no**, and this is the sharpest absence: plugins are the design's stated point | a user adds a plugin, or swaps one |
| root, the schema | **yes, since 2026-08-22** — `schema-build`'s timed region *is* `createExoSchema` (`APP-US/createExoSchema` 2.05 µs, `PAGE-US/createExoSchema` 19.0), with `numberPorts` isolated as its own rung (`+number`). Everywhere else it is still **no**: `createExoSchema`/`createExoMachine` sit outside every clock on all 24 other axes. `createExoStatic` and `exoOne` are timed by nothing. `ssr-floor`'s struck `+stack` rung timed a depth-indexed instance pool that `@exodra/core` no longer ships; `wire-exo-instance.ts` keeps its own inline `plan.depth++`/`plan.depth--` and never had a pool to reach | **yes for the builder** — `literal`, `+number`: hand-written schema literals, census-checked against the shape actually built | **no** | the program starts and every component's shape is declared |
| root, the refusals | **yes, since 2026-08-22** — `schema-build`'s `+checks` rung and its `checks·parts` cross-check | **not definable** — a refusal fires or it does not | **no** | the same module load, now paying ten checks per builder call |

### `@exodra/list-reconcile` — measured, and the run resolved less than it looks

These five modules are not in `@exodra/core`: they call `insertBefore` and `removeChild`,
which a base shared with the server renderer and `@exodra/term` may not, so they are their own
package.

`update-floor.shuffled`, section `REORDER`, in µs: `floor·told` 18.4896, `floor·record` 21.875,
`floor·seq` 21.875, `floor·place` 28.3854, `floor·registry` 31.7708, `exodra·children` 29.6875,
`exodra` 33.8542. `floor·seq` swaps the hand-written `markKeepers` over `Int32Array`s for the
shipped `getExoSequence` over a `number[]`; `floor·place` then swapped the hand-written walk for
the shipped placement pass, which has since been deleted with its rung.

**Judgement: `floor·seq` and `floor·record` are equal to the digit, so that run resolved no
difference between the shipped sequence and the hand-written one.** Read it as a null, not as a
proven tie — this page's own rule about `update-floor.published` and `update-floor.shuffled`
disagreeing applies here too.

### `events/` — a shared handler has an axis of its own

`axes/list/toggle.tsx:1785` is a real `c.on(...)`, and it is what carries `toggle`'s timed region
into the `on` door — `packages/dom/src/dom/EXO_DOM_NODE_VOCABULARY.ts:155-163`, which reads
`port.index` and hands the element, the port's write data, the handler and the subject to
`schema.events.attach`.

**There is no runtime port check on that path, and there used to be a sentence here claiming one.**
`on` tests nothing: what keeps a non-event port out of it is the TYPE on the door plus the cursor
that minted the port as an event port in the first place
(`packages/core/src/schema/cursor/ExoAssertingSchemaCursor.ts:188-196`). A reader who came here looking
for the refusal would have found a function name that no longer exists in the tree.

It is **no longer the suite's only `c.on`** — `^\s*c\.on\(` also hits
`axes/mechanism/handler-count.ts`, `axes/mechanism/machine-vs-cells.ts`,
`axes/floors/op-click-floor.ts` and `axes/floors/keystroke-floor.ts`, and whether each of those
sits inside a timed region is not re-checked here.

**The dispatch hole is what `op-click-floor` was written for.** Its question, in the words of its
own header: *how much room is there below a shared handler — one module-level function plus a
per-position subject — at serving one interaction on one row of a list, and what does the delegated
strategy cost against the direct one?* Its timed region is a bubbling `dispatchEvent` on a real
button (`op-click-floor.ts:783`), not a rebuild, with the handlers installed outside that clock —
mounting is the axis's other phase and has its own table. `driver` times the instrument alone — the
`MouseEvent` and the dispatch with no handler at the end — so a handler's own share is a difference
against it. `floor·per-el` and `floor·root` are
the two hand-written programs with no framework in them, one listener per row and one listener on
the container, with `floor·per-el·twin` as the resolution null. The three framework rows vary one
thing each: `exodra·closure` is one closure per row on the direct pack, `exodra·op` is one shared
function plus 200 subjects on the same pack, and `exodra·op·deleg` is that same handler and those
same subjects under `createExoDelegatedEvents(['click'])`. So the first pair isolates the handler form
and the second isolates the pack. It prints two tables, because what a shared handler changes is
split: at mount it is one function object for the process instead of one per row, and per dispatch
it is one keyed load on the subject where a closure reads its own context.

`keystroke-floor` asks the same question of a keystroke, and it is the axis whose own header booked
this pair as missing: its `exodra·deleg` changes the pack and the handler form together, so it
cannot separate "one function for every row" from "one root listener instead of fifty".

### `context/` — the one core area with real coverage

`context-cost.b4`, in nanoseconds. Group B: `push` 1.5625, `provide·marked` 5.4687,
`provide·nomark` 7.8125 — and the axis's header calls `push` "the irreducible part of a provide on
ANY backend, server included", which is a floor claim about core's own function. Group C:
`inject·1` 1.6667, `inject·2` 2.6667, `inject·8` 7.6667, `inject·miss8` 7.6667, against the
resolution null `inject·1·twin` 1.6667. So a **context chain read at depth is swept**, and the
slope is a real per-link number.

**Judgement: group C still has no floor, and now nothing in the axis does.** `inject·1·twin` is a
null, not a floor. The floor group C lacks is a straight-line walk over the same three-field links
with the token compare removed. It used to stand beside a group that HAD one — group A's
`parent·dN`, a bare `parentNode` walk under the DOM climb — but that group and group D (the
cross-mount seam) were removed with the DOM context walk itself, so `context-cost` now carries no
floor participant of any kind and says so in its own header and ANSWER line. The numbers quoted
above for `inject·*` are still live; any figure from `climb·*`, `local·*`, `parent·*`,
`provide·marked`, `provide·nomark` or `mount·*` in `measurements/context-cost.b4.json` prices an
operation that no longer exists.

### root, the schema — the claim held on three independent readings, and then an axis was built

**Read this section as the state of the other 25 axes.** On 2026-08-22 `schema-build` was
registered and recorded, and its timed region is schema construction itself, so the sentence "no
axis in the suite constructs a schema inside a timed region" is no longer true of the map as a
whole. It remains true of every axis that measures rendering, and that is what the three readings
below establish.

Every `createExoSchema` / `createExoMachine` call in those axes is outside every clock:

- **Module scope**, most of them: `apps/exodra/exodra.tsx:57,105,261,290`; `ssr-floor.ts:817,840,870,909`;
  `axes/phases/clone-threshold.tsx:149,177,205,239,286,372`;
  `axes/app/component-split.tsx:242`. (`props-vs-ports.ts` stood in this list and its axis has been struck.
  `context-cost` used to stand in it and no longer belongs to it:
  it declares no `createExoMachine` and no `createExoSchema` at all — it times `exoContextFrame` and
  `readExoContext` over a chain it builds by hand.)
- **Setup functions**, the rest: `axes/floors/update-floor.ts:1048,1413,2127` all sit inside a
  `mount*()` whose own comment at `:1042` says "It is setup, never timed."
- **The harness forbids the residue.** `harness.ts:346-349` builds every scenario through `prep()`
  before `t0` and times only `measure()`; `:557` then throws away ten warm-up rounds before the
  first recorded sample. So even a first-mount plan compile cannot land in a median.

`createExoStatic` and `exoOne` appear in no benchmark file at all. `numberPorts` is internal to
`createExoSchema` and is reached only through it.

**`schema-build` is no longer an unlit path, and anything in this repository that still calls it one
is stale.** It used to be true that every axis in the suite starts *after* the schema exists. The
path was lit on 2026-08-22: `schema-build.published`, 15 rows
across three censuses, 4 refusals. What that recording says — including which of its steps may not
be quoted, and the top rung that came out **void** — is in
[Floor, no strategy](#floor-no-strategy--and-a-named-guess-for-each) above, and the headline is
that the **builder** costs more than the refusals do (+1.15 µs against +0.80 on `APP-US`), which
inverts what the next section assumed.

One recorded rung prices a mechanism that no longer exists anywhere. `ssr-floor.published` CENSUS
puts `+try` at 0.2075 ms and `+stack` — the rung that bracketed each instance with a depth-indexed
pool — at 0.2175, with `exodra` at 0.2450 and the hand-written `floor` at 0.0575. **The rung is
struck and the recording is kept**: the pool it priced has been deleted from `@exodra/core`, and no
backend pools anything, so those two figures rank nothing a render path runs today.

### root, the refusals — a production build now runs ten of them, and one axis now prices them

The move is visible in the sources, and it is now enforced rather than described. Every refusal in
this package puts `typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'`
**inside `throw new Error(…)`**, with the explanation on the development side and a short code on
the production side, so a bundler folds the explanation away and the condition survives.
`packages/core/src/tests/errorCodeRegistry.test.ts` is what holds that shape: it fails on a
refusal that ships prose, on a code with no registry row, and on a row with no page section.

The several-roots check has the same shape —
`packages/core/src/schema/markup/asserts/assertExoOneRoot.ts:2-19`: its `if` survives a production
build, and the production side of the message is the code `EXO0105` with the root count (`:17`).

What that costs per builder call, read off `ExoSchemaBuilder.ts`:

| call | refusals a production build runs |
|---|---|
| `el(tag, attrs)` | `assertExoLegalTagName` (`:66`), `assertExoNoElementInRawText` (`:67`), `assertExoLegalAttrName` **once per static attribute** (`:71`) |
| `port(name)` | `assertExoLegalAttrName` (`:89`), `assertExoUniqueAttr` (`:90`), `assertExoServablePropertyPort` (`:91`) |
| `text(value)` | `assertExoIntactRawTextBoundary` (`:83`) |
| `textPort()` | `assertExoNoTextPortInRawText` (`:110`) |
| `childrenPort()` | `assertExoSoleChildRawTextPort` (`:118`) |

`assertExoUniqueAttr` is the one with a shape rather than a constant: it scans `node.attrs` and
`node.attrPorts` and calls `exoAttribute` on every entry
(`packages/core/src/attr/asserts/assertExoUniqueAttr.ts:11,16`), so
declaring the *n*th port on an element is O(n). **`schema-build` now measures the aggregate of this
and refuses to resolve it into parts.** `schema-build.published` prices the whole set added at once
— `APP-US` `+builder` 1.40 µs → `+checks` 2.20, a step of **+0.80 µs** over the app's four schemas,
or **100 ns per `el()`** by that census's `perElement` column and **138.5 ns per `el()`** by
`PAGE-US`'s — and then refuses to pick between that estimate and the 0.55 µs the transcribed check
bodies (`checks·parts`) cost, because the two disagree by 0.25 µs, more than the run's resolution
floor. Nothing prices `assertExoUniqueAttr`'s O(n) shape separately, and the axis has no rung that
varies *n*.

One of the two `@exodra/core` files that decide what a *name* becomes is now timed as well:
`exoAttribute`'s memo is the subject of `SPEC-US`, where `spec·warm` 0.75 µs against
`spec·cold` 3.95 over eight names is printed by the axis as **+400 ns for a first-ever attribute
name**. `exoDomPropertyKind` is still reached only from here and from the plan compilers, all of
which run before every clock.

**A refusal has no floor, and that is a real answer rather than a missing one.** It either fires or
it does not; the only measurable question is what it costs on the happy path, which is a ladder
(the shape `child-mark` and `ssr-floor`'s CENSUS already use), not a floor comparison. The suite
already contains the proof that such a ladder resolves: `ssr-floor.published` puts `CENSUS/floor`
at 0.0575 ms and `CENSUS/esc` — the identical program with `escapeExoText` and
`escapeExoAttributeValue` on all four dynamic values — at 0.1125, against the null `CENSUS/esc·twin`
at 0.1125.

### The core situations nothing measures, most common first

Ordered by how often a running program reaches the code, not by how interesting the gap is. "Floor
definable?" asks whether a straight-line program doing the same job can be written at all.

| # | the situation | what would have to be built | floor definable? |
|---|---|---|---|
| 1 | ~~**A button is clicked and a shared handler runs.**~~ **BUILT** — `op-click-floor` is that axis: the timed region is a bubbling `dispatchEvent` with the handlers installed outside it, and a closure, a shared handler on the direct pack and the same shared handler under `createExoDelegatedEvents(['click'])` are three separate rows against two hand-written floors | nothing further until it runs — no file for it exists in `packages/benchmarks/measurements/` | **yes** — `el.onclick = () => { row.closed = true }`, straight-line, same observable effect |
| 2 | **An update writes something that is not text.** class, style, a boolean property, a namespaced attribute | an `attribute-write-memo` axis, with `exoAttribute`'s memo hit and miss as separate rungs | **yes** — a direct `setAttribute` / property store per write |
| 3 | ~~**The program starts and every schema is declared.**~~ **BUILT AND RECORDED, 2026-08-22** — `schema-build.published`, three censuses, 15 rows, 4 refusals. It is a ladder over the app's four schemas and a 65-element page: literals, `+number`, `+builder`, `+checks`, shipped `createExoSchema`, plus `checks·parts` as a second estimate and `SPEC-US` for the name memo | nothing further, except the two things the run itself asks for: a larger batch, since it refused `PAGE-US/literal` and every ladder step under its 0.100 µs resolution floor, and a rung that varies *n* for `assertExoUniqueAttr`'s O(n) | **yes for the builder** (hand-written schema literals, and they are the `literal` rung); **no for the refusals** |
| 4 | **A backend is composed with N plugins, then called through.** `new ExoDomBackend(...plugins)`, `composeExoPlugins` | two regions: composition at N = 0/1/4/16, and a call through a merged method against a direct call to the same implementation. **Built:** `plugin-compose` measures exactly these two moments; the rows it replaced on 2026-08-29 measured the deleted named-slot runtime and are void | **yes** — the direct call is the floor for the call; composition's floor is the object literal it replaces |
| 5 | **A context read at depth, aggregated over a mount.** partially covered: `inject·1..8` is swept, the per-mount total and the floor are not | one floor row in group C (the same chain walk with the token compare removed) and one mount-scale row (M consumers × depth D) | **yes** |
| 6 | ~~**Two backends place the same rows.**~~ **VOID** — the node-anchored placement pass this compared against `reconcileExoOrder` is deleted; every backend places through the `childList` door | nothing | — |
| 7 | **A child is placed by `exoOne` or `createExoStatic`.** the two non-list child primitives | rungs on an existing mount axis, since both are per-instance and not per-row | **yes** |
| 8 | **A row leaves a list and its subscriptions end.** a `childList` `remove` and a teardown of the whole region | a teardown-side list axis | **yes** — `teardown-floor`'s contracts already define what "the same job" means |

**Judgement on the ordering.** 1 and 2 are things a page does continuously; 3 and 4 are once per
process but sit on the critical path to first paint, and 3 became a production cost on 2026-08-22
rather than a development one. **3 is also the one that has since been measured, and it moved the
argument**: the reason it was ranked here was the refusals, and the recording puts the builder
above them (+1.15 µs against +0.80 on `APP-US`). The ordering stands; the cause named for it does
not. 6, 7 and 8 are last because a real program reaches 6 and 8 **zero times today** — no caller
exists.



- **Firm.** The axis list, the participant rows and every median quoted: read from
  `run-one-axis.js`, from the axis sources, and from the JSON in
  `packages/benchmarks/measurements/`. The count of 25 is a count of the keys in `AXES`.
- **Firm.** Which axes have a recording and which do not: it is the file list of
  `packages/benchmarks/measurements/` against the keys of `AXES`, and the six with none are named
  in [The arithmetic](#the-arithmetic).
- **Firm.** The absences. `@exodra/router` and `EXO_KEYED_LIST_VOCABULARY` are matched by
  nothing under `packages/benchmarks/src`, and `mount-floor` mentions node recycling only to say
  its floor refuses to do it — which nothing in `@exodra/dom` does. `@exodra/forms` left that list on 2026-08-22 and entered the "built, unrun" one:
  `keystroke-floor.ts` imports it, and no recording exists.
- **Judgement.** The floor/no-floor verdict on `mount-phases`, `child-mark`, `teardown-phases` and
  `bank-vs-clone` — the last of which has since been **deleted with the node bank**, so the counts
  in this bullet are the counts as they stood when it was written and nobody has recomputed them.
  Each of those has a hand-written base rung, and each rung produces something
  *other* than the measured subject's output — a tree with no wiring, a clone with no mark, a
  cleared region. Read strictly ("same output"), they are not floors; read loosely, three of them
  are. The strict reading is used throughout, and it is why the count is 6 and not 9.
- **Judgement.** Calling `exodraOimdb`, `exodraMono` and `ports` strategy rows.
  Each is a composition a user could write, and none of them was put in its axis to close a gap to
  a floor — there is no floor in those axes to close.
- **Guess, and labelled as one in the text.** All four proposed strategy rows in
  [Floor, no strategy](#floor-no-strategy--and-a-named-guess-for-each). Nothing here was measured.
- **Not checked.** Whether any of the eleven uncovered situations would come out well or badly, or
  what `keystroke-floor` will print when it runs. This page says only that nothing measures them.

And for [What is unmeasured in `@exodra/core`](#what-is-unmeasured-in-exodracore):

- **Firm.** Every call-site line number, every "appears only in a comment", and the guard shape of
  all eleven `NODE_ENV` sites in `@exodra/core` — grepped over `packages/core/src` and
  `packages/*/src`, `dist/` and `node_modules/` excluded. Every median: read from
  `update-floor.shuffled.json`, `context-cost.b4.json` and `ssr-floor.published.json`.
- **Firm.** That no axis **that measures rendering** constructs a schema inside a timed region. It
  rests on three independent facts, not one — module-scope declaration, the `mount*()` setup
  comment, and `harness.ts`'s untimed `prep()` plus ten discarded warm-up rounds — and any one of
  them alone would settle it. `schema-build` is the axis for which the opposite is true by
  construction, and it measures no rendering.
- **Firm.** That `op-click-floor`'s timed region is a real dispatch: `op-click-floor.ts:783`
  constructs a bubbling `MouseEvent` and calls `dispatchEvent` on a button.
- **Judgement.** Reading `floor·seq` = `floor·record` = 21.875 µs as a null rather than as a
  measured tie, and calling group C floorless while counting group B's `push` as a floor.
- **Judgement.** The ordering of the eight situations, and the claim that a refusal has no floor.
- **Not checked.** What any of the eight would cost. Not one of them was run, and no figure in that
  section is an estimate of a thing nobody measured — every number quoted there is a recorded row.
