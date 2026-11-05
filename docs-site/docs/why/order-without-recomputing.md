---
title: Order without recomputing
---

# Order without recomputing

This renderer reconciles children by the pointer identity of the child object. It never keys, and it
never treats a position as an identity. Each child also remembers where it last sat, on itself. So
the question arrives on its own:

> If identity already gives us the mapping, and the old position is already on the child, why is a
> longest-increasing-subsequence pass still needed? Store the **order** in the identity, and a move
> becomes a link update rather than a rebuilt subsequence.

The narrow answer is that the subsequence is not there to _find_ the children — it is there to decide
which of them may stay still. But "why this algorithm and not another" deserves the whole space
rather than one rebuttal, so this page enumerates every way this problem is known to be solved and
says, for each, what it would cost **here**. Where a candidate cannot be priced from anything in this
repository, it says so and names the row that would settle it.

## The problem, and the objective

Given a sequence of items in an old order, and the same items — plus insertions, minus deletions — in
a new order, with a stable identity per item, produce a sequence of DOM operations that realises the
new order.

**The cost is not comparisons.** It is `insertBefore` calls plus whatever bookkeeping the algorithm
needs to decide on them. On the transition where this matters most, the axis prices _discovery_ —
stamping survivors, reading old positions, computing the move set — at **3.1250 µs against a
hand-written reconciler's 21.6146, or 14.5%** _(my subtraction on two recorded medians, below; not a
run)_. Every algorithm in this page's Family A and Family C competes inside that 14.5%. The other
85.5% is the moves.

### One fact closes most of the space before it opens

A node may stay where it is only if every node it must remain behind also stays. So the set of nodes
that do not move is an increasing subsequence of the old positions, and **the minimum number of
single-node moves is exactly `n` minus the length of a maximum increasing subsequence.** That is a
property of the problem, not a claim about this code; the shipped pass's own header claims only that
every backend moving DOM nodes uses it, because two placement passes are interchangeable only if they
keep the same rows in place (`packages/list-reconcile/src/getExoSequence.ts:1-6`).

**The incumbent is therefore already optimal on the expensive term.** No algorithm can move fewer
nodes. Everything below either

-   trades _more moves_ for _less bookkeeping_ (Family A),
-   makes a move cost less than one `insertBefore` (Family B),
-   makes the bookkeeping cheaper without changing the moves (Family C — where order maintenance
    lives), or
-   changes the problem so that no move set is derived at all (Family D — where this renderer already
    has an answer, and it is the one that wins).

## The enumeration

### Family A — choose which nodes move

Same objective, different algorithm. All of these are `O(n)` or `O(n log n)` and none allocates a
per-row structure that survives the update.

_The library names in the left column are attributions from the literature, not readings of those
libraries' source. Nothing in this repository checks them, and only the rows marked **shipped** are
claims about code here._

| candidate                                                          | moves                                                          | bookkeeping                                             | why it wins or loses here                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Longest increasing subsequence** (Vue 3, ivi, and this renderer) | minimal, by the fact above                                     | one `number[]` in, two arrays out per reordering update | shipped. Its cost is the one term this family can still argue about, and it is unmeasured here — see below                                                                                                                                                                                                                                                |
| **Naive: move everything not in place**                            | up to `n`                                                      | none                                                    | the honest rival: with the subsequence forced empty, the placement pass moves every surviving row it does not keep (`packages/list-reconcile/src/reconcileExoOrder.ts:72-90`). Nobody has counted the difference. **This is the one candidate in the whole page that could beat the incumbent on a real transition, and it is untested**                  |
| **Greedy ascending run** (React's `lastPlacedIndex`)               | between the two — a _greedy_ increasing run, not a maximum one | none beyond a running maximum                           | this renderer already computes exactly that running maximum, for a different purpose: `inOrder` skips the subsequence whole when no survivor is out of order (`packages/list-reconcile/src/reconcileExoOrder.ts:46-60`). Adopting React's rule would mean _stopping_ there and moving more nodes — the same trade as the naive row, with a smaller saving |
| **Two-ended prefix/suffix scan** (Vue 2, Snabbdom, Inferno)        | depends on the shape                                           | four cursors                                            | **shipped, and it runs first.** The position-only path and the two contiguous-splice paths are this technique; the subsequence is only what is left when they cannot answer (`:108-129`). It is why `GROW-SHRINK/exodra` measures _level with_ the hand-written general floor in the table below, which the run refuses as a bound in either direction    |
| **Edit-script diffing** (Myers, Hunt–Szymanski, Wu)                | minimal _edits_, which is a different objective                | `O(nd)` time and an `O(n)`–`O(n²)` table                | it optimises insert/delete counts and treats a move as a delete plus an insert. Here a move is one call and a delete is a teardown plus a rebuild, so minimising edits maximises the expensive thing. **Never considered here — my judgement**                                                                                                            |
| **Cycle decomposition of the permutation**                         | minimal _transpositions_, `n −` (number of cycles)             | one visited-flag per row                                | swaps are not the primitive. `insertBefore` moves one node into a position; realising a transposition takes two of them. Minimal transpositions and minimal insertions are different numbers, and the second is what the LIS gives. **Never considered here — my judgement**                                                                              |
| **Patience / LCS-based diffing**                                   | —                                                              | —                                                       | not a separate candidate: patience diff _is_ a longest-increasing-subsequence pass over matched positions. It is the incumbent under another name                                                                                                                                                                                                         |

### Family B — make one move cost less

These leave the move set alone and attack the price of a move. None is shipped.

| candidate                                                   | what it would buy                                           | why it is not here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Run moves** (`Range`, or a `DocumentFragment` round trip) | _k_ contiguous movers in fewer calls                        | the movers are scattered _because_ the subsequence already kept the long runs still, so there is usually little contiguity left to batch. The one place a contiguous run is known in advance is a caller telling the list the move, and `move` relocates one row per call, one `insertBefore` each (`packages/dom/src/dom/factories/createExoChildList.ts:82-99`). **Unpriced. What would settle it is a `GROW-SHRINK` or `REORDER` row that is the shipped op path with the run relocated through a fragment** |
| **CSS `order` / grid placement**                            | zero DOM mutations — a permutation becomes `n` style writes | it changes _visual_ order only: hit-testing, tab order, selection and assistive technology continue to see the document order. It also costs a write per row where a move set costs a call per mover, so it loses on the shapes this renderer is fast on. It works only inside a flex or grid container, which a children port cannot assume. **Never considered here — my judgement**                                                                                                                          |
| **Detach the region, rebuild it, reattach**                 | one insertion instead of many                               | this is Family D's rebuild row, and the numbers there are against it                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### Family C — answer "where was this child" faster

This is where **order-maintenance structures** sit, and the whole family competes for one term only:
what it costs to find out where each child was. In a program with no framework in it that term is
**3.1250 µs of 21.6146, 14.5%** — the whole of it, stamping and subsequence included. That figure
bounds the _floor's_ discovery and not this renderer's, whose own version of the same machinery
carries a per-row record and a `Map`. The four rungs below were finally run in the shuffled recording;
two of them resolve, two are refused as under the axis's own resolution bar, and two of the four
price things no structure here would touch.

| candidate                                                                              | per-row cost                                           | what it answers                                                   | status                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A field on the child** (`index`)                                                     | one slot in an object that already exists              | old position, membership and the subsequence's input, in one load | **removed**: the shipped reconciler stopped reading it, so the child list stopped writing it — `reconcileExoOrder` works from the caller's own mirror of keys (`packages/list-reconcile/src/reconcileExoOrder.ts:94-130`)                                                                                                                                     |
| **Read it off the document**                                                           | nothing stored                                         | old position, by walking back from the region's end anchor        | was shipped as a plugin and is **not in the tree today** — the seam it stood in is now a whole package over two backend doors (`packages/list-reconcile/src/reconcileExoOrder.ts`)                                                                                                                                                                            |
| **A `Map` from key to old position, rebuilt per update**                               | a hash entry per row of the changed middle, per update | old position and membership                                       | **what ships today**: a `Map` from key to its first old position plus an `Int32Array` chain for repeated keys, built only over the middle that differs and dropped when the pass ends (`packages/list-reconcile/src/reconcileExoOrder.ts:17-34`). An earlier node-keyed table that outlived the pass, and so pinned every element the list ever held, is gone |
| **Order maintenance** (Dietz–Sleator; Bender et al.)                                   | a label, and prev/next if insertion is to be `O(1)`    | _does A come after B_ in `O(1)`, insert-after in amortised `O(1)` | **the subject of this page.** It answers a question this pass asks once and answers already — see the next section                                                                                                                                                                                                                                            |
| **Order-statistic / balanced tree keyed by position** (splay, AVL with subtree counts) | a tree node per row                                    | rank in `O(log n)`, and a move is a splice                        | it answers _rank_, which the renderer has as an integer for free, and it pays a pointer chase where the incumbent pays an array index. **Never considered here — my judgement**                                                                                                                                                                               |
| **Successor structures over a bounded universe** (van Emde Boas, y-fast tries)         | a universe-sized or hash-backed index                  | successor in `O(log log u)`                                       | the renderer never asks for a successor: the new order _is_ the successor list, handed over. **Never considered here — my judgement**                                                                                                                                                                                                                         |

### Family D — do not derive a move set at all

| candidate                                                                                         | status                                                    | evidence                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Be told what changed** (a transition calling the child list's own `insert` / `move` / `remove`) | **shipped, and it is the answer**                         | 10.9× and 4.81×, in the tables below                                                                                                                       |
| **Rebuild instead of reordering**                                                                 | measured, and the numbers are against it                  | `exodraKept` 3.3 against `exodra` 10.2 on `toggle`, and `WIDE/exodra·kept` 56.25 against `WIDE/exodra` 115.625 — below                                     |
| **Do not have the rows** (windowing)                                                              | shipped as an application technique, not a reconciler one | a sliding window preserves ascending order, so `anyMoved` stays false and the subsequence is skipped whole. It removes this problem rather than solving it |

## The two tables everything above quotes

<!-- gate: axis=list-update label=rec1 -->

| row         | median (ms) | what it is                                           |
| ----------- | ----------- | ---------------------------------------------------- |
| `exodraOps` | 0.075       | four mutations, told to the list as operations       |
| `exodra`    | 0.815       | the same four, handed over as a new array and diffed |

<!-- gate: axis=update-floor label=shuffled -->

| row                      | median (µs) | what it is                                                                                                  |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `GROW-SHRINK/exodraOps`  | 1.2656      | told                                                                                                        |
| `GROW-SHRINK/exodra`     | 6.0938      | deriving — _level with_ the hand-written floor beneath it, because the two-ended paths recognise this shape |
| `GROW-SHRINK/floor·diff` | 6.0938      | a hand-written general reconciler, deriving                                                                 |
| `REORDER/floor·told`     | 18.4896     | handed the minimum move set in advance                                                                      |
| `REORDER/floor·diff`     | 21.6146     | the hand-written general reconciler                                                                         |
| `REORDER/exodra`         | 33.8542     | this renderer, on a shuffle                                                                                 |
| `WIDE/exodra·kept`       | 56.25       | the same app keeping what the reference rebuilds                                                            |
| `WIDE/floor`             | 51.5625     | a hand-written program that rebuilds                                                                        |
| `WIDE/exodra`            | 115.625     | the shipped app, rebuilding                                                                                 |

<!-- gate: axis=toggle label=base1 -->

| row          | median (ms) | what it is                                                              |
| ------------ | ----------- | ----------------------------------------------------------------------- |
| `exodraKept` | 3.3         | a block that survives being taken out and comes back with one insertion |
| `exodra`     | 10.2        | the same block rebuilt                                                  |

_My arithmetic on those medians, not a run:_ being told is **10.9×** the deriving path on
`list-update` and **4.81×** on `GROW-SHRINK`; keeping is **3.1×** rebuilding on `toggle` and
**2.06×** on `WIDE`. Read the `WIDE` pair with the axis's own caveat: `exodra·kept` is a diagnostic
row that "keeps what the reference rebuilds", and the file says outright that it bounds nothing
(`packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:208-212`).

The `update-floor` figures here are re-read from `update-floor.shuffled.json`. The earlier recording
of that axis is withdrawn — its phases ran in a rigid rotation, so its resolution bar was measuring
where a row had been declared rather than what the program did; nothing in the renderer changed
between the two runs.

## Why Family D comes first

Telling the child list directly already skips the diff, the old-position table and the subsequence
entirely: a transition that knows what changed calls the command, nothing is derived — `insert`,
`move` and `remove` are three short bodies on the child list
(`packages/dom/src/dom/factories/createExoChildList.ts:64-108`). "A move updates a link
rather than rebuilding a subsequence" is not a design this renderer lacks — it is the design it
ships, and the link it updates is the document.

So the case any Family A or C candidate has to serve is what is left after that: **a list that
reorders by handing over a new order rather than the move.** Counted in this repository's own
examples and benchmarks:

| where                                                                      | reorders                                | tells the child list the move                      |
| -------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| `packages/benchmarks/src/benchmarks/axes/list/reconcile.tsx:340`           | yes — 30 shuffles of 200 rows per batch | no (a new array)                                   |
| `packages/benchmarks/src/benchmarks/axes/list/list-reconcile.tsx:673`      | yes — one run move per cycle            | no (the plain array the diffing rows share)        |
| `packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:1676-1678` | yes — the `REORDER` transition          | no                                                 |
| `packages/examples/no-build/global.html`                                   | yes — rotate                            | no — the rotated array goes to `reconcileExoOrder` |
| `packages/examples/no-build/esm.html`                                      | yes — rotate                            | no — the rotated array goes to `reconcileExoOrder` |
| every other list in the examples                                           | no                                      | —                                                  |

**Five: three in the benchmark suite, written to measure the general path, and the rotate in the
no-build pair, which hands over a new array where one `move` would say it.** That is not an argument
that the general path is unimportant — it is what a caller that does not track its own moves falls
back to, and it must be correct and fast for exactly that reader. It is an argument that the
population any new structure would serve is, here and today, the population that already has a
cheaper answer one call away and does not take it.

## What the reconciler actually asks, pass by pass

Every question the diffing path puts, in order. The last column is why Family C's most interesting
member does not apply.

| pass        | the question                                                                                                     | kind                                           | answered by an order structure?                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| prefix scan | is the key now at position _i_ the key that was at _i_? (`packages/list-reconcile/src/reconcileExoOrder.ts:110`) | identity equality                              | no — not an order question                                                    |
| tail scan   | the same, walking back from the end (`:113-116`)                                                                 | identity equality                              | no                                                                            |
| fast paths  | did the middle only grow, or only shrink? (`:117-128`)                                                           | two integer compares                           | no                                                                            |
| resolve     | where was this key, and was it here at all? (`:17-34`)                                                           | a hash lookup in a `Map` built for this pass   | no — such a structure has no absolute position; that is its defining property |
| removals    | which old rows did nobody claim? (`:39-41`)                                                                      | a rank of zero                                 | no                                                                            |
| ascending?  | `at < last` over the survivors' ranks (`:47-53`)                                                                 | **an order comparison**                        | yes, and it is already one integer compare on a value in a register           |
| subsequence | which maximal subset of the old positions is increasing? (`:66`)                                                 | **an optimisation over the whole permutation** | **no**                                                                        |
| place       | is this row in the increasing run the subsequence kept? (`:72-89`)                                               | a bit set from the subsequence                 | no                                                                            |

Eight questions. **One is a comparison, and it is the cheapest line in the pass** — each survivor's rank
compared with the one before it, integers the loop has already loaded, whose whole output is a boolean deciding whether the
subsequence runs at all. The question that costs is the seventh, and it is not a comparison query. An
oracle answering _is A before B_ perfectly and for free would leave it exactly where it is.

**The subsequence is comparison-shaped, and that changes nothing.** `getExoSequence` touches its
input only through `<` and a `!== 0` sentinel (`packages/list-reconcile/src/getExoSequence.ts:12-33`), so it
_could_ run over opaque labels from an order structure with no change to the algorithm. That is the
strongest form of the idea and it still loses: the same `O(n log n)` binary search would run with an
indirect comparison in place of an integer compare, inside the binary search itself
(`packages/list-reconcile/src/getExoSequence.ts:21-27`).

**Membership comes from the hash, and an order label would not replace it.** A key that is not in
the caller's mirror of what was shown has no entry in the pass's `Map` and is built as new
(`packages/list-reconcile/src/reconcileExoOrder.ts:26-34`). An order structure carries relative
order and no membership, so it would sit beside that lookup rather than replacing it.

**And it cannot replace the arrays it would sit beside.** The reconciler's own state is the caller's
array of keys, `shown`, rewritten in place or replaced by the return value
(`packages/list-reconcile/src/reconcileExoOrder.ts:117-130`). The child list keeps its own `order`
array of children, and that one is not scratch either: it is published to the child list in front so
that list can end at this one's first node, so it is emptied in place and never handed out
(`packages/dom/src/dom/factories/createExoChildList.ts:14-16`).

## Does identity make the per-element price already paid?

This is the strongest form of the intuition, and it is a fair question with a three-part answer. An
order-maintenance structure needs a stable per-element node. A key-based renderer must derive a key
and map it to something; **this one already holds the item object, and a record already hangs off
every child.**

**The allocation: yes, already paid.** `TExoDomChild` exists per child regardless, it is built whole in
one literal, and until recently it carried a position field, `index`, which was removed once nothing read it
(`packages/dom/src/dom/types/TExoDomChild.ts`). A label, or a prev/next pair, could be two or
three more slots in that same literal rather than a new object per row. Adding a field there is a
thing this package has already done: `node` itself went in that way. **The owner's intuition holds on
this point and it should be recorded as holding.**

**The width: not paid, and the number usually quoted does not bound it.** The measured hazard beside
that literal is about growing an object _after_ construction: "an earlier attempt to cut per-node
allocations made a build 11% _slower_, and the lesson recorded from it was about V8's in-object
sizing, not allocation counts" (a measurement note whose source file is no longer in the tree), which is why
`ExoDomChildBody` assigns every field in its constructor — "a field added later spills the object
out of its in-object store" (`packages/dom/src/dom/factories/createExoDomChildFactory.ts:64`). The sentence this
page used to quote here, naming the regression as a fact about `TExoDomChild`'s own literal, is no
longer in that file and was not re-cited to another: what survives is the rule and the 11% figure
above, neither of which prices a widened literal. A **wider literal** is a different
thing from a **grown object**, and that figure does not price it. What would price it is a
`mount-floor` or `initial-render` A/B with the literal widened by three slots and nothing else
changed. **No such row exists, and this page cannot tell you what three more slots per child cost.**

**The maintenance: not paid, and this is the part identity does not help with.** Today nothing per
child records a position at all: the child list's `order` array is the only record, and a splice keeps
it right (`packages/dom/src/dom/factories/createExoChildList.ts:52-85`). A structure whose value _is_
its links has no equivalent: a link is either right or it is not, and label space runs out and has to
be rebuilt. So a splice that stores nothing per element today would start costing per-element work on
paths that reorder nothing.

**And none of it changes the outcome**, because the price being paid or unpaid is not what decides
this. Even at zero cost per element, the structure answers the fifth question in the table above —
the one already answered in a register — and does not answer the subsequence, which is the one with
the work in it.

## What the subsequence buys is unmeasured, and the file says so

The claim under audit is the incumbent's, not the challenger's. `getExoSequence` used to quote "3
moves vs 7 on a 10-row rotation, 38 vs 48 on a 50-row shuffle" against a naive "reposition everything
out of place" pass. Those figures were attributed to a test file that does not exist here, and they
resolve to no row in `packages/benchmarks/measurements/`
(`packages/list-reconcile/README.md:46-52`). **So minimising moves is, in this repository, an
unmeasured premise** — and Family A's naive row is the candidate that premise is holding off.

One thing makes the doubt larger than the deleted figures suggested:

-   The cost side is bounded and small. `REORDER/floor·diff` minus `REORDER/floor·told` is what
    _discovery_ costs a program with no framework in it: **3.1250 µs, 14.5% of the deriving floor and
    9.2% of this renderer's 33.8542** _(my subtraction on two recorded medians, not a run)_ — stamping,
    position reads and the subsequence together.

**The row that would settle it** is a `REORDER` row that is the shipped renderer with the placement
pass handed an empty subsequence, gated by the same step-by-step markup diff every other row on that
axis passes, and differenced against `REORDER/exodra`. A negative difference kills the subsequence; a
positive one prices what it saves. **That row still does not exist.** The axis's `floor·seq` rung,
which priced the other half — what the computation costs, separately from what it saves — was run
once and is now struck with the reconciler it decomposed
(`packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:1736-1740`); it came back
at **+0.0000 µs over `floor·record`**, a difference the run refuses as a number because it sits under
4× its floor-scale null of 0.260417 µs. So the computation is somewhere between nothing and a quarter
of a microsecond, and what it saves is still unmeasured.

## Which of the four rungs any of this would move

`update-floor` carried four nested attribution rungs for the `REORDER` gap, and **the shuffled
recording is the only one to have executed them** — all four are struck now, because the reconciler
they decomposed is deleted (`packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:239-243`). Each rung is the row
above it with exactly one substitution:

| rung             | what it prices                                                     | measured                                                                                               | moved by a Family C structure?                                                                                              |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `floor·record`   | the position and survival tables moving onto per-row records       | **+0.2604 µs** over `floor·diff` — _refused as a number_, under 4× the floor-scale null of 0.260417 µs | it would **add** to this term: more slots per record                                                                        |
| `floor·seq`      | the shipped subsequence instead of the floor's                     | **+0.0000 µs** over `floor·record` — _refused as a number_, same bar                                   | at most this one, and it was predicted the smallest                                                                         |
| `floor·place`    | the shipped placement walk, including its DOM read per moved child | **+6.5104 µs** over `floor·seq` — the largest single rung on the ladder                                | no                                                                                                                          |
| `floor·registry` | the item-to-child `Map`, 200 lookups per transition                | **+3.3854 µs** over `floor·place`                                                                      | no — it had been predicted the **largest** named part, at least 5.0 µs, derived from a measured 35.5 ns per `Map` operation |

Two things the run changed. **The registry prediction missed**: it named the registry as the largest
named part at 5.0 µs or more, and the registry came in at 3.3854 µs behind the placement walk's
6.5104. **And the two rungs a Family C structure could touch are precisely the two the run cannot
resolve** — both sit under the axis's own resolution bar, so what an order structure would displace is
somewhere between nothing and about half a microsecond, on a gap of 12.2396.

So the idea reaches one term, the term measured smallest and refused as a number, and enlarges
another. **If the gap is the placement walk and the registry, this addresses the wrong one** — and the
two rungs that carry almost all of it, at 9.8958 µs of the 12.2396 between them, are the two no
storage change would move.

## Where the old order lives is a separable question

The strongest evidence that _where the old order lives_ is not the term is that the placement pass
does not care where its input came from.

The shipped reconciler reads the old position off its own mirror of what it showed. Reading it off
the **document** instead — walking back from the region's end anchor to build the same `shown`
array — would feed the same placement pass, because that pass takes the old order as the `shown` array it
is handed (`packages/list-reconcile/src/reconcileExoOrder.ts:5-14`). No such reconciler is in the
tree; the argument depends only on the two questions being separable.

A third backend refuses the pass outright, and its reason is about the destination rather than the
storage: `@exodra/term`'s region is an array and the new order is one store, so a subsequence would
compute an answer nothing then reads. That is the shape of an argument
that removes the pass: it names a destination where a move costs nothing. Family C names a different
place to keep the input.

## Two things that are not this, and survive

**A command that carries a permutation.** The child list answers four commands — `insert`,
`move`, `remove`, `removeAll` (`packages/list-reconcile/src/types/TExoPlacedChildren.ts`). A `move`
relocates one row, so a re-sort cannot be told as one; a whole new order goes through
`reconcileExoOrder` and the same diff, and the only wholesale path is an empty order, which clears
the list outright (`packages/list-reconcile/src/reconcileExoOrder.ts:102-106`). That is a real gap,
it is in the command set rather than in the storage, and it is where a caller that re-sorts would be
served. **It would not
remove the subsequence either.** Being handed the new order is not being handed the move set;
minimising moves is a function of the permutation, however you learned it. The axis has a row for
being handed the answer — `floor·told` — and says of it that it is "THE MAXIMAL FREE LUNCH and it is
not a technique anybody could ship" (`packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:134-138`).

**The interface.** If somebody wants to build any of this, there is a door, and it does not require the
argument above to be wrong. Reconciling is a whole package that stands on two doors the backend
already has — `c.createExoNode` to make a row and the children port to place one — so a second
strategy is a second function, not a fork of the renderer
(`packages/list-reconcile/src/createExoChildrenReconciler.ts`, over
`packages/list-reconcile/src/reconcileExoOrder.ts`). A third strategy costs the people
who do not install it nothing, and it would be measured against `REORDER/exodra` on an axis that
already exists.

## What this page does not settle

-   **It is an argument from the code and from recorded rows, not a run.** No axis was executed to write
    it. Every figure in the three gated tables is a median already recorded in
    `packages/benchmarks/measurements/`; every ratio in the prose is arithmetic on those medians and is
    labelled where it appears.
-   **It does not prove the subsequence is worth its computation.** It says the opposite: that claim is
    unmeasured here, Family A's naive row is the live challenger, and the row that would settle it is
    named.
-   **It cannot price a wider `TExoDomChild`.** Three more slots per child is the one cost in the
    order-maintenance case that identity might genuinely have already paid, and nothing here measures
    object width.
-   **It prices nothing in Family B.** Run moves and CSS ordering are named, argued from their
    semantics, and left unmeasured.
-   **It does not rule out these structures for a different problem.** The argument is about the
    question _this_ reconciler puts. A renderer whose region is not a document, or whose caller asks
    _where does this go relative to that_, is asking something else, and nothing here transfers.
