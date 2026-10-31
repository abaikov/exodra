# The measurement plan

This file sorts the claims this repository makes about its own performance into the ones an
instrument here can settle, the ones that need a new rung, and the ones nothing can reach — then
ranks the ten measurements worth taking and says what each result would **change**.

**Nothing in this file was run.** Every figure below was read out of a file in this repository, and
the file and line are given. Where a number is arithmetic over two recorded rows, it says so. Where
something is my reading of code rather than a measurement, it says that too.

---

## 0. What the plan has to survive

Two failures happened in the week this was written, and every proposal below is shaped by them.

### A prediction is only a gate if a refusal reads it

`refuse()` is `console.log`. Literally:

```ts
const refuse = (s: string): void => console.log(`❌ ${s}`);   // ssr-floor.ts:541
const refuse = (s: string): void => console.log(`❌ ${s}`);   // teardown-floor.ts:299
```

It does not throw, does not set a flag, and does not change the process exit code.
`scripts/run-one-axis.js` matches on `✅`/`❌` only to decide whether a line is *printable*, and then
falls through to the row regexes; the recording is written whenever `recorded.length > 0` — a refused
axis records exactly like an accepted one, and the JSON has no field in which a refusal could appear.
That is why `ssr-floor`'s P0b could fail and the run still end in a table anybody could cite.

*(`run-one-axis.js` is being edited as this is written, so it is cited below by symbol name — `AXES`,
`ROW`, `ROW_REPS`, `ROW_REPS_TAIL`, `ROW_PLAIN`, `TABLE_HEAD`, `SECTION` — rather than by line.)*

**What the plan requires, before any new axis is proposed.** Three changes, in this order, and no
axis below should be recorded as evidence until they exist:

1. `refuse()` sets a module-level counter and pushes the refusal's id. At the end the axis prints
   one machine-readable line, e.g. `❌ REFUSALS n=2 ids=P0b,C3`.
2. `run-one-axis.js` scrapes that line into `refusals: [...]` on the recording, and — when it is
   non-empty — writes the file as `<axis>.<label>.REFUSED.json` instead of the plain name.
3. Anything that cites a recording — `check-doc-numbers.mjs`, and any future gate — refuses to
   resolve a citation against a recording whose `refusals` array is non-empty.

Step 3 is the one that matters. Steps 1 and 2 only make the refusal visible; step 3 is what makes a
refusal *cost something*. **An axis whose refusals nothing reads is a decoration.**

### A recorded number carries no unit

The recordings hold `axis, label, quantum, batch, rows[{name,min,p25,median,p75,max}]` and,
sometimes, `reps`, `perElement`, `section`, `heap`. **There is no `unit` field in any of the 14
files.** `update-floor` records microseconds (its `AXES` entry: "Its numbers are MICROSECONDS PER
TRANSITION"); every other floor axis records milliseconds. Both land in the same shape.

The doc gate parses a unit and then throws it away:

```js
const NUMBER = /^~?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(ms|µs|MB|KB|GB|×)?$/;  // :296
...
const d = Math.abs(row.median - value);                                    // :405
```

`fig.unit` is captured at `:307` and never used in a comparison. So `0.0828 ms` in a doc matches a
row recorded as `0.0828 µs`, and both gates pass. **That happened**: nine published passages took
`update-floor`'s microseconds and printed them as milliseconds, out by 1000×, with every gate green
— because a gate that compares a figure to a recorded row compares the digits and never the unit,
and a ratio does not care what the unit is.

**What the plan requires.** The unit belongs where `batch` and `quantum` already live — in
`run-one-axis.js`, next to the axis it describes, because that file is already the one place that
knows an axis's recording conventions:

1. `AXES` gains a third element per entry: the unit its table prints (`'ms'` for all but
   `update-floor`, which is `'µs'`). This is a declaration, not a scrape — a printed unit could
   drift from the printed numbers, an entry in the registry cannot drift without somebody editing
   the registry.
2. `run-one-axis.js` writes `"unit": "<u>"` into every recording.
3. `check-doc-numbers.mjs:405` converts before comparing, and **fails** — not "other run" — when a
   doc figure's unit and the recording's unit differ and no conversion between them exists.
4. The 14 existing files are stamped by hand in the same change, and a recording with no `unit`
   becomes a hard failure rather than a default.

Point 4 is the one that closes it. A default of `'ms'` would have let all nine of the out-by-1000×
pages keep passing.

---

## 1. Where the evidence physically is

- `packages/benchmarks/measurements/` — **14 files**, committed.
- `packages/benchmarks/.gate/` — **28 files**, gitignored (`packages/benchmarks/.gitignore:11`).
  `check-doc-numbers.mjs` reads both (`:183-184`).

So twelve recorded runs exist in `.gate/` that nothing committed can cite: `component-split.mono1`,
`component-split.mono2`, and ten further `initial-render` labels (`b7full`, `b7on`,
`backtoback`, `importnode-after`, `importnode-before`, `paircollapse`, `paircollapse2`, `post7arg`,
`pre7arg`, `slots`). Two more — `viastage0a` and `viastage0b` — were deleted rather than promoted:
they timed the schema core on a second in-repo backend, and that backend is gone.

**Most of them should stay uncitable, and `check-doc-numbers.mjs:170-173` already says why**: an A/B
pair is two measurements of one machine in one session, and `importnode-before`/`importnode-after`
are meaningless to anybody but the person who ran them back to back. The exception is
`component-split.mono1`/`mono2` — two labels of one axis, the shape `toggle.base1`/`base2` already
has in `measurements/`. Promoting that pair is the one free move in this section.

### Axes that exist as instruments and have never been recorded

| instrument | rows it would emit | recordable today? |
|---|---|---|
| `mount-phases` | `clone`, `clone+walk`, `clone+walk+ins`, `mount`, `walk` (`mount-phases.ts:578,586,594,606,627`) | **yes** — header at `mount-phases.ts:640` is `reps min p25 median p75 max`, which is `ROW_REPS`'s shape |
| `teardown-floor` | `SINGLE/dom·text`, `SINGLE/dom·twin`, `SINGLE/dom·replace`, `SINGLE/dom·root`, `SINGLE/dom·cards`, `SINGLE/dom·nodes`, `SINGLE/dom·drop`, `SINGLE/dom·text·exo`, `SINGLE/book·drop`, `SINGLE/book·unsub`, `SINGLE/book·real`, `SINGLE/book·flat`, `SINGLE/book·twin`, `SINGLE/book·perkey`, `SINGLE/exodra`, `SINGLE/both·floor`, `SINGLE/both·exodra`, `SINGLE/scale·subs4`, `SINGLE/scale·rows4`, `SINGLE/scale·deep4`, `CYCLE/cycle·drop`, `CYCLE/cycle·floor`, `CYCLE/cycle·exodra` | **yes** — headers at `:1546`/`:1802`, and it prints `── SINGLE —` / `── CYCLE —` section lines that `SECTION` matches |
| `teardown-phases` | `hide`, `clear region`, `unmount loop`, `dispatch only`, `unmount loop bnd`, `textContent`, `drop per child`, `registry evict`, `run disposers` | **yes** — `ROW_REPS_TAIL` shape (reps + 5 stats + ns/panel) |
| `import-node-trade` | 54 rows over `{clone page, clone tpl, ins page, ins tpl, null clone, null ins}` × 7 flat + 3 chain sizes (`import-node-trade.ts:224-230`) | **probably** — `ROW_REPS` shape; names contain spaces, which `(\S.*?)` admits |
| `clone-threshold` | `clone`, `manual` × 6 shapes | **no** — six tables, no section headers, six-way name collision |
| `virtual-list` | `exodra`, `solid`, `react` × 4 tables | **no** — same defect, four-way |

The `clone-threshold` / `virtual-list` defect is one line each: print `── <SHAPE> —` before each
table so `SECTION` qualifies the rows. That is worth doing in the same change, and it makes two more
instruments citable.

---

## 2. New rows worth adding to axes that already exist

The cheapest new work in the repository. Each row isolates one thing an existing axis mixes into a
bucket:

| rung to add | axis | isolates |
|---|---|---|
| an **unmerged** component: one piece per schema field, byte-identical output, same flatten | `ssr-floor` | the server compiler's "2×" merge claim, which the ladder cannot see because it starts already-merged |
| the **walking reconciler** as a participant | `reconcile`, `update-floor` GROW-SHRINK + REORDER | the second, shipped reconciler against the default one — it has never been run by any axis |
| a **descriptor** variant of the WIDE handlers | `update-floor` WIDE | one object per template against one closure + listener per row |
| a **keyed** list beside the identity one at the same row count | `hydrate-floor` | whether a keyed adoption walk beats the `bindChildren` route |
| a sixth WIDE rung: `floor·record` with the old position in a per-update `Map` keyed by node | `update-floor` WIDE | the storage alone; record, clone and DOM work all cancel |
| a **GROW-SHRINK** variant stamping every shifted position eagerly | `update-floor` | O(n) integer stores on a path that is O(1) in the DOM — and a hand-written shift beside the `copyWithin` one |
| an app of static components, wired both ways | `mount-floor` | whether a plan can leave the shared no-op wire out of its per-instance loop |
| `exodra`, `exodra·all-dynamic` — one build with every children-holding element made wholly dynamic | `initial-render` | the "23.7% of mount" figure that lives only in prose |
| `exodra`, `exodra·weakmap-plan`, `exodra·symbol-plan`, `exodra·fourth-field` | `mount-floor` CENSUS | the plan-slot choice: two named fields against a `WeakMap`, a `Symbol` and a fourth field |
| a `floor·payload` row: the same subscriber reading the event argument instead of calling back | `update-floor` TEXT-ONE + TEXT-SWEEP | `getValue()` alone, which today is stuck inside a five-way bucket |
| paired rows writing the same string via `textContent` and via `.data` | `update-floor` | the "twice the cost" figure quoted in two source headers |
| a paired census row: the same clone loop with a slot store and with a `WeakMap.set` | `mount-floor` CENSUS | the "16% of an initial mount" figure |
| a **clear-and-refill** row | `list-update` | the Range-vs-loop comparison whose result was "within a rounding" and names no axis |
| a toggle variant removing rows individually on teardown | `toggle` | the "21% of a mount-and-dispose cycle" figure |

**Needing a new axis rather than a new row**, and therefore at the expensive end:
anything about the **router**, since nothing in this repository navigates one; anything about
**context**, since nothing mounts a page that provides one; anything about a **form**, since no axis
mounts one; and anything about a **refetch**, since no axis drives one.

---

## 3. The ranked ten

Ranked by evidence gained per unit of machine time. Each says what a result would **change** — not
what it would tell us.

---

**1 · Record `teardown-floor`.** `-- teardown-floor 100 2 64 --record=published`

*Machine time: zero.* The run has happened three times and nothing was written down.

**What changes.** The reading is stated in advance in the axis: *"|dom·text − dom·replace| against
|dom·text − dom·twin|, and only a difference that clears the second is a reason to touch the line."*
If it clears, `container.textContent = ''` is the wrong spelling for clearing a region and the line
changes. If it does not, the choice is one that was *tested and found to be under the instrument's
resolution* — a stronger statement than the reasoning it has now, and one that closes the question
instead of parking it. Separately, `SINGLE/exodra` against `SINGLE/both·floor` gives this repository
a **teardown bound**, the direction all four other floors forbid themselves from answering. It is
the only measurement here whose result is already in hand.

---

**2 · Record `mount-phases`.** `-- mount-phases 100 --record=published`

**What changes — and no outcome leaves things as they are.** "clone 34.8%, walk 6.1%, insert 15.2%,
wire and plumbing 43.9%" is repeated, in whole or in the `34.8%` half, at **eight** sites in seven
files — re-grepped on 2026-09-02, when every line number in the old list had drifted and the count
itself was wrong by two:

| site | what it quotes |
|---|---|
| `docs-site/docs/why/what-others-forbid.md:245` | the whole split |
| `docs-site/docs/why/what-the-floor-says.md:400` | the whole split, in the plugin-price table |
| `packages/dom/src/plugins/exo-node-bank/exo-node-bank.ts:148` | `34.8%` beside the 875 ns clone |
| `packages/dom/src/plugins/exo-node-bank/index.ts:9` | `34.8%` beside the 875 ns clone |
| `packages/dom/src/dom/types/TExoDomSchema.ts:487` | `34.8%`, on `cloneExoNode` |
| `packages/benchmarks/src/benchmarks/axes/floors/attr-floor.ts:82` | the whole split |
| `packages/benchmarks/src/benchmarks/axes/floors/hydrate-floor.ts:206` | clone 34.8%, traversal 6.1% + 2.1%, insertion |
| `packages/benchmarks/src/benchmarks/axes/floors/hydrate-floor.ts:1578` | clone 34.8% + insertion 15.2%, inside a printed string |

The last of those is the one to notice: it is not a comment, it is text the axis PRINTS, so the
figure reaches a reader who never opens a source file. And the whole set resolves to nothing.

Meanwhile `mount-floor` puts `CENSUS/exodra` at 0.2938 and `CENSUS/clone+refs` at 0.2175 — a ratio of
1.3508, so **26.0% of the mount sits above a straight-line clone-walk-fill-insert program that keeps
its references** *(my arithmetic over two recorded medians)*. `clone+refs` already does the clone,
the walk, the fills and the insertions.

- If `mount-phases`' `mount` row lands on `CENSUS/exodra`, then 43.9% of a mount is attributed to
  wiring inside a 26.0% residue, and one of the two is wrong: either the ladder's subtraction charges
  shared work to its last rung, or `clone+refs` does less than `clone+walk+ins`. **Every one of the
  eight quotations comes down.**
- If it lands elsewhere — the file itself predicts ≈0.400 ms at `mount-phases.ts:672-678`, against
  `CENSUS/exodra`'s 0.2938 — then the split is a share of a denominator the floor never measured, and
  the eight sites are quoting a percentage of a different program. **They come down too, and get
  rewritten with their denominator attached.**

**One thing recording does not fix.** The percentages are printed in a derived block after
`line('')` (`mount-phases.ts:656-672`), which clears `inTable`, so they are not rows and never will
be. `check-doc-numbers.mjs` states at `:156` that it cannot check a percentage, because a percentage
is derived from two rows it cannot identify. **So the six sites should be rewritten to quote the two
millisecond rows, not the share.** That is the actual deliverable for the most-quoted number in this
repository; the recording is what makes it possible.

Also worth noting while it is open: `mount-floor.ts:242` committed the prediction *"`exodra /
clone+refs` LANDS BETWEEN 1.4 AND 1.8"*. It landed at 1.3508. That prediction failed and the
recording carries no trace of it — the same hole as `ssr-floor`'s P0b, in the axis this repository
calls its strongest evidence.

---

**3 · DEAD — `bank-vs-clone` and the node-bank family.**

This item asked for the bank ladder's printer to be fixed and the axis recorded. The node bank has
been removed from `@exodra/dom`, the axis file with it, so there is nothing left to record: no
`clone` / `bank pop` / `pop + port reset` / `pop + full reset` rows, no cap question, no reset
strength to choose. The recordings the axis already left in `measurements/` and `.gate/` are
measurements of a plugin that no longer ships and bound nothing in the tree.

The one thing that does NOT die with it: the sentence "the clone is 34.8% of a mount, MEASURED"
still has to be rewritten, because the ladder that was going to settle it is gone and the split it
quotes resolves to nothing on its own.

---

**4 · Re-record `update-floor`, with the unit stamp.**

`packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts` was modified at 2026-08-21 01:31; the recording
is from 2026-08-20 13:53. The working tree defines ten REORDER rows (`exodra`, `floor·told`,
`floor·twin`, `floor·diff`, `floor·record`, `floor·seq`, `floor·place`, `floor·registry`,
`exodra·children`, `exodra·twin`) and the published file holds four. **Check whether the extra six are
in-flight work before assuming a stale recording.**

**What changes.** This is the axis the unit hole ran through, and it is the only µs axis in the set.
Re-recording it *after* the `unit` field exists is what stops the 1000× class of failure from
recurring, and it is the migration's own test: if the stamped `update-floor` recording does not make
`check-doc-numbers.mjs` fail on a deliberately mis-united doc figure, the fix does not work.

---

**5 · Add the unmerged rung to `ssr-floor`.**

*One rung on a recorded axis — the cheapest new work in this plan: the identical component emitted
as one piece per schema field, byte-identical output, same flatten.*

**What changes.** The server compiler claims merging its emitted pieces is worth 2×, and the ladder
starts at a floor that is already merged into five pieces, so the claim has nothing on disk. If the
unmerged rung comes in under 2× dearer than `CENSUS/floor` (0.0575), the compiler's headline claim
is wrong and both its comment and the prose repeating it change. If it comes in above, the merge
stops being an assertion the compiler makes about itself.

---

**6 · Add the walking reconciler as a participant.**

Three rows: `reconcile`, `update-floor` GROW-SHRINK, `update-floor` REORDER.

**What changes.** This is the single largest gap in the suite — a **shipped** second reconciler,
sitting behind the `children` field, that no axis has ever run. If the walking reconciler is not slower on
any of the three transitions, the identity reconciler's position as the default is an assumption,
and "a second reconciler is 8 bytes gzipped" stops being the interesting fact about it. If it is
much slower, the `children` interface's existence gets its justification and the number to quote is
the gap.

---

**7 · Record `teardown-phases`.**

**What changes.** "Registering listeners for disposal costs about 21% of a mount-and-dispose cycle on
160 handlers" is quoted from `packages/dom/src/dom/exo-event-slot-setter.ts:30-34` and repeated in
`@exodra/core` and `@exodra/forms`. It names no axis. `teardown-phases` splits a hide into exactly
the phases that figure is about — `registry evict`, `run disposers`, `drop per child` — and prints
each twice, once by ladder subtraction and once measured alone, *because a ladder attributes all of
its error to the last rung*. If the isolated `registry evict` lands under the run's own control
floor, three source headers in three packages lose the justification they are written on.

---

**8 · Add a descriptor variant to `update-floor` WIDE.**

WIDE already carries a bound form (`floor·bound`) and a record form (`floor·record`); what it has
never carried is a page whose handlers are all descriptors.

**What changes.** The claim is one object per template against one function object plus one
`addEventListener` per row. If the descriptor page is not measurably cheaper across 160 handlers,
the descriptor form is a replaceable piece for a mechanism that buys nothing, and the honest move is to say so
rather than keep the argument in operation counts. If it is cheaper, the delegated event strategy
gains a mount-side number where today it has only a dispatch-side ceiling measured on `toggle` —
where destruction rather than dispatch dominates.

---

**9 · Add a keyed row to `hydrate-floor`.**

**What changes.** `attachExoKeyedList` refuses to hydrate, and that refusal pushes callers onto a
route that adopts at a discarded clone per row and runs the wire twice. `hydrate-floor` publishes
APP, ROWS·80 and ROWS·640 and has no keyed row. If a keyed adoption walk beats that route, **the
refusal is costing users and should be lifted** — this is one of the few measurements in the plan
whose result changes what ships rather than what a page says.

---

**10 · Record `import-node-trade`.**

**What changes.** This item used to be "record the two-backend phase axis", and that axis no longer
exists: it compared `@exodra/dom` against a second in-repo backend, and the backend, the axis and
every recording of both were deleted. What went with them was the only run behind the two rates the
`importNode` removal was written on — ~95 ns of extra clone against ~26 ns of saved insertion.

`import-node-trade` is the surviving instrument and it has **never been recorded** either. Its
registry entry in `run-one-axis.js` states the cost: *"It has never been recorded — there is no
`import-node-trade.*.json` — so three of its four falsifiers are unjudgeable from disk."* Three
committed falsifiers that nobody can judge is the same hole as `ssr-floor`'s P0b, and it is now the
whole of the evidence for a line that ships on every mount. It also answers the crossover question
that is still open — the subtree size above which importing would pay for itself, if there is one —
which `mount-floor`'s single `CENSUS/clone·page` row cannot reach, because that row prices one app
at one shape.

---

## 4. Measurements not worth taking, and why

Being specific matters more here than being exhaustive.

**(a) Below the instrument's resolution, both ways — the plan-cache class.** The worked example does
the arithmetic on itself: 162 plan lookups × 11.4 ns = 0.55% of a mount, against `mount-floor`'s
±3.3% floor, *which puts the effect roughly six times below it*. **A gate returns "in noise" whether
the change is free or ruinous, so it cannot inform the choice in either direction.** Others in the
same class:

- the same 18.0 ns vs 6.6 ns lookup rate on a foreign backend, times a row count only a benchmark of
  that backend could supply
- one property load and one null compare to decide whether a schema is already compiled — below the
  0.1 ms quantum of every axis
- a plan chain of length one — below the grain of every axis in this repository
- one identity compare per notification, to decide which update path runs
- the children-reconciler slot's own overhead — *not* the two implementations, which is item 6
- one comparison per bind, and nothing per update, in a scalar subscriber
- one property load per fill against a name lookup; `update-floor`'s TEXT-ONE measures a whole
  update path and would swamp it
- a context chain that is one or two links long in the common case

For all of these, **write the arithmetic down and stop.** That is a better artefact than a run that
would come back "in noise" and be misread as "costs nothing."

**(b) Nothing on a render path.** A large share of this renderer's choices run once per schema per
process at module load: zero per mount, zero per row, zero per update, zero per event — name
allowlists, refusal checks, error-code assignment, spelling normalisation, the escaper tables, the
compiler's own passes. An axis that could see a once-per-process regex would have to resolve
nanoseconds inside a millisecond-quantised clock. **The honest artefact for these is the accounting,
not a run.**

**(c) Erased before anything runs.** Phantom fields, declared const symbols, `Pick`s, nominal tokens.
They decide **which programs compile**. There is no runtime. Their falsifier is a type test, and
several already have one. **These can never carry a resolving measurement, in any future.**

**(d) A semantic contract has nothing to measure.** The cross-backend *disagreements* — what a
duplicate item in a reactive list does, what `set()` on an event port does, which layer refuses a
shape, what row index a moved row sees — are questions about which page is served, not about how
fast it is served. This is not a cost; it is a semantic contract that does not exist. What settles
them is the **cross-backend conformance suite** in `packages/conformance`, whose rules are exactly
these questions asked of every backend. The same applies to the router's semantics, where the
candidates differ in **what a user is told**, and to the three hydration removal policies, which
produce different pages from the same response.

> **The conformance suite settles more of what this repository has left open than any three axes in
> §3.** It is not in the ranked ten because the ten were ranked on *measurements*, and it is not
> one. It should be ranked first on any list that is not.

**(e) Measuring it means shipping the bug.** The plan cache and the plan-chain guard exist to
prevent a full recompile — markup parse included — of every schema on every render. That would be
catastrophic on any axis and has never been allowed to occur. **Measuring it means shipping the
bug. Do not.**

**(f) Structurally invisible to every instrument here.** Wiring before insertion avoids style
invalidation and layout from writes into a live tree — work the browser **defers to whatever runs
next** rather than charging to the timed region. `mount-floor` names this as a standing hazard every
row in it carries. The effect is real and no axis in this repository can see it. Likewise surviving
a third-party DOM mutation: a benchmark cannot install a browser extension.

**(g) One where the run had already happened and said nothing — and the axis has since been struck.**
`props-vs-ports` was run twice and its header opened: *"THIS AXIS CANNOT RESOLVE A DIFFERENCE, IN
EITHER DIRECTION … Every number here is a multiple of 0.100 ms, and nothing moves by more than one of
those steps."* It reported ms/mount with 4000 port fills buried inside 1000 clones and 3000 inserts,
so one grid step was 25 ns per fill; both participants were Exodra and it carried no native floor.
The entry above once read "recording it is worth ten minutes, re-running it hoping for a different
answer is not." **The axis is gone instead**, because after the per-instance context moved off the
pooled connector onto the instance's own record there was no way to rebuild its `ports` participant
out of what `@exodra/dom` exports that did not hand that side alone an instance record the `props`
side does not have — a confound at the connector's hottest load, larger than an effect two series
already failed to find. The decision the axis was built to inform never rested on it: the form was
refused on grounds read out of the code, and those grounds live in `TExoDomNode.one`'s comment.
The rest of this entry still applies to `clone-threshold`, whose header states its answer ("THERE IS
NO CROSSOVER") from a batch-10 run it also says is not reproducible: fix its section headers, record
it once, and let it stand as a confirmation.

---

## 5. The ceiling

**Most of what this renderer decides is not timeable, and that is not a shortfall.** §4 is the large
section on purpose: what a program *means* — which shapes are legal, which page is served, what a
guard does, what a duplicate item does on three backends — outnumbers what a clock can reach, and a
renderer whose every choice were timeable would be a renderer that had made only performance
choices.

The number worth raising is therefore not "how many figures are measured" but **how many claims have
a written reason a reader can check, with the file and line beside it**. Where a claim is a number,
it must name the recorded row it comes from; where it is not, it must say what it would take to
settle it. §2 is that enumeration for everything a benchmark here can still reach.
