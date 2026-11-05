import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
// DIAGNOSTIC — HOW CHEAPLY CAN THIS APP BE TORN DOWN, AT ALL, AND ON WHICH CONTRACT?
//
// The fourth member of the floor family and the one the other three forbid themselves from
// answering. `mount-floor` ends its header with "IT SAYS NOTHING ABOUT TEARDOWN"; `update-floor`
// and `hydrate-floor` say the same. This file is that direction, written to the same standard: a
// program per row, a CONTRACT per row, a resolution floor measured from a control whose true value
// is zero, falsifiers committed in this header before the run and printed mechanically at the end,
// and a run that refuses its own rows when a row cannot bound anything.
//
// IT IS NOT `teardown-phases`. That axis SPLITS one renderer's teardown into its own internals, on
// the 200-panel block the `toggle` axis hides — the clear, the per-child `unmount`, the ending of
// subscriptions — and every rung of it is a hand-written replica of
// `@exodra/dom`'s own code. This one compares the renderer against programs that contain NO
// framework at all, on the 80-card app every other floor measures, and asks what the cheapest
// possible teardown of that app costs.
//
// ── THE FIRST THING READING THE CODE CHANGED, AND IT CHANGES THE QUESTION ────────────────────
//
// `mountExodraApp(c).teardown` DOES NO DOM WORK. NOT "little". NONE. Read from code, and gated
// below before anything is timed:
//
//   `teardown` IS the disposer `ExoDomBackend.render` returns, which is `exoTeardownScope`'s closure:
//   `for (i < scope.length) scope[i]();  scope.length = 0;` — `exoTeardownScope.ts:19-23`.
//   Nothing in it removes a node, and nothing it calls removes a node either. The per-list disposer
//   is `for (i < order.length) order[i].unmount(); order.length = 0;` — registered by
//   `TExoDomNode.openChildList`, `EXO_DOM_NODE_VOCABULARY.ts:191-194` — and `unmount` is
//   `disposeExoChildSelf`, which runs the child's own disposers and explicitly "does NOT take the
//   child out of the tree" (`createExoDomChildFactory.ts:22-38`). The one function in the
//   package that empties a region, `clearOwnedExoChildList`, is EXPORTED AND CALLED BY NOTHING
//   inside `@exodra/dom` — the whole-clear path is `ExoChildList.removeAll`
//   (`createExoChildList.ts:105-128`), which no dispose path reaches either.
//
// SO THE OWNER'S PRIOR — "the renderer is within 2× of a bare `textContent = ''` floor, and
// subscriptions rather than DOM removal dominate what we pay on top" — CANNOT BE SCORED AS
// WRITTEN, and this file says so rather than quietly scoring it against something else. There is
// no "on top": the renderer's teardown and `textContent = ''` do not overlap at all. One ends 620
// subscriptions and releases 240 child records and touches no node; the other removes 861 nodes
// and releases nothing. The ratio between them is a number and it is not a headroom.
//
// THAT IS WHY EVERY ROW HERE CARRIES TWO CONTRACTS AND NOT ONE.
//
// ── THE TWO CONTRACTS ────────────────────────────────────────────────────────────────────────
//
// THE DOM CONTRACT — what must be true of the document when the program returns:
//
//   `detach`  the app's nodes are out of the document AND the container no longer references
//             them. `textContent = ''`, `replaceChildren()`, `appRoot.remove()`, per-instance
//             `remove()`. These four differ in CALL COUNT and in nothing else about the end state.
//   `drop`    the container itself leaves, taking the tree with it. The app's nodes are out of the
//             document and are STILL mutually reachable from the container — whoever holds the
//             container holds all 861 of them. This is what `participants/exodra/app.tsx` relies
//             on when it
//             says "the nodes die with the container the caller removes", and it is what every
//             scenario in this suite does in its untimed cleanup. IT IS A DIFFERENT CONTRACT AND
//             IT IS NOT COMPARABLE TO `detach`.
//   `none`    nothing at all is promised about the document.
//
// THE BOOKKEEPING CONTRACT — what must be true of the renderer's own state:
//
//   `none`    nothing released. The graph is dropped and the collector is left to find it.
//   `unsub`   every subscription ended. This app holds 620 of them — five per card, two per deck,
//             one per tag row — and each is a live callback held by its source, which holds the
//             instance, which holds the element.
//   `full`    subscriptions ended AND every child record released: 240 records reached through
//             their own `unmount`, 200 non-empty disposer arrays run and emptied, 160 `order`
//             arrays emptied. THIS IS WHAT `@exodra/dom` DOES, and it is the contract the headline
//             is computed on.
//
// `exodra` is `(dom: none, book: full)`. A floor that is not `(none, full)` is a floor for a
// different job, and the run pairs headlines only within a contract — `update-floor`'s rule.
//
// ── THE CENSUS, DERIVED FROM THE APP'S SPEC AND FROM THE CODE, NOT ASSERTED ──────────────────
//
// Every number below is read off `todo-spec.ts` and `apps/exodra/exodra.tsx` and re-derived at
// module load so it cannot drift from the app:
//
//   620 SUBSCRIPTIONS   five per card (the headline text, `aria-expanded`, the count label, and the
//                       two list sources), two per deck (the date, the name), one per
//                       tag row. 80×5 + 10×2 + 200 = 620, each ONE `source.onChange`.
//   580 SCOPE DISPOSERS seven per card — those five plus ONE PER LIST from
//                       `openChildList`'s `exoOnTeardown` — and two per deck. 80×7 + 10×2 = 580. The 200
//                       tag-row disposers are NOT here: a row's `c.onTeardown` reaches `exoOnTeardown(child, …)`
//                       with `child` pointing at the row itself, so they land in its own
//                       `disposers` array. `render` adds none of its own: `EXO_DIRECT_EVENTS` has
//                       no `install`, and `effectStops` is `null` on every instance because a
//                       wired plan declares `EXO_NO_EFFECTS`.
//   240 CHILD RECORDS   40 details blocks (the open cards) + 200 tag rows. Each is a
//                       `TExoDomChild` built by `buildLiveExoChild`; 200 of them carry a
//                       one-element `disposers` array and 40 carry `null`.
//   160 ORDER ARRAYS    one per opened children port, allocated by `openChildList` whether or not the
//                       list ever builds a child.
//   0   REGISTRIES      `disposeExoChildSelf`'s `registry.delete(this.registryKey)` is live code
//                       and is NEVER REACHED: no file under `packages/*/src` assigns a Map to
//                       `child.registry`, so the field is `null` on all 240 records and the branch
//                       is skipped 240 times.
//
// AND THEY ALL LAND IN THE RENDER'S SCOPE, WHICH `teardown-phases` GETS WRONG. That file's header
// says "the card's two list subscriptions belong to the CARD, not to the render … that
// disposer removes NO nodes, runs NO child's `unmount`, and on this app has almost nothing to
// run." The first half is right and the second is not, and the chain is four hops of code:
// `ExoDomBackend.render` passes `ownerChild = null` into `mountExoInstance`; `createExoMachineNode`
// stores it as `child` on the INSTANCE'S OWN RECORD, which is the exonode the wire is handed —
// nothing is pooled and there is no pointer to follow; `TExoDomNode.list` reads `child` off it and
// passes THAT down, so every deck and every card is also wired with `child = null`; an instance
// mounted through `mountExoInstance` is not a `TExoDomChild` at all — only `buildLiveExoChild` makes
// one. So `exoOnTeardown(null, off)` takes the ambient-scope branch for all 580. The app's whole-app
// disposer runs 580 closures, 240 `unmount`s and the 200 row disposers those reach. It removes no
// nodes, which is the half that was right.
//
// ── THE GC QUESTION, WHICH IS WHY THIS AXIS IS HARD ──────────────────────────────────────────
//
// A teardown's cost is partly DEFERRED, in two separate ways, and a benchmark that stops the clock
// at the end of `dispose()` measures only the part that is cheap to make look good:
//
//   BLINK DEFERS THE DOM WORK. Detaching a subtree marks it; the render objects, the style data
//   and the layout invalidation are settled at the next lifecycle update, which is after the timed
//   region and usually after the next paint. Nothing inside the page can observe when. This
//   repository already records that destruction is ~74% DOM cleanup on the toggle axis and that
//   Blink defers it to the next paint.
//
//   V8 DEFERS THE JS WORK, AND THIS RUNNER MAKES THAT WORSE ON PURPOSE. `sampleOnce` forces a GC
//   immediately BEFORE every timed region, so the garbage a region produces is collected in the
//   forced GC that precedes the NEXT region — i.e. OUTSIDE EVERY TIMED REGION, ALWAYS, BY
//   CONSTRUCTION. A program that releases nothing therefore prints a number near zero and hands
//   its whole bill to a collection this table never contains.
//
// SO THIS FILE PRINTS TWO TABLES AND SAYS WHICH ONE MAY BE QUOTED FOR WHAT.
//
//   TABLE 1 — SINGLE TEARDOWN. ms per teardown, GC forced before every region. It captures the
//   JS calls and the Blink calls made inside the region and NOTHING ELSE. It provably does not
//   capture: Blink's deferred destruction of the detached nodes; the collection of anything the
//   program dropped; the effect on the next mount of a heap that was not released. `book·drop` is
//   in it as the proof of exactly that — one store, and a whole 861-element app plus 620
//   subscriptions plus 240 records become unreachable.
//
//   TABLE 2 — THE CYCLE, AND IT IS THE HONEST ONE. Each timed region runs N complete
//   mount → teardown → drop cycles back to back with NO GC INSIDE IT. Whatever collections V8
//   chooses to run to satisfy the allocation demand of cycles 2..N happen INSIDE the measurement,
//   so a program that deferred its bill pays it here. `cycle·drop` (release nothing),
//   `cycle·floor` (release by hand) and `cycle·exodra` (the renderer) differ by exactly the
//   release, on identical allocation demand.
//
//   WHAT EVEN TABLE 2 DOES NOT CAPTURE, stated rather than left to be found: a collection V8
//   defers past the END of the region is charged to the next region's forced pre-GC, which is
//   untimed. So Table 2 is a LOWER bound on the collector's share, and raising the cycle count
//   raises it. THE CYCLE COUNT IS TABLE 2'S OWN KNOB — the fourth positional, not the batch — and
//   raising it costs no live set at all, because a cycle builds its subject and drops it inside
//   the timed span. See HOW THIS FILE MEASURES for the code that settles that.
//
//   AND THE RUN CHECKS, RATHER THAN ASSERTS, THAT A COLLECTION HAPPENED INSIDE THE REGION.
//
//   ~~WITHDRAWN — WHAT THAT CHECK ONCE WAS, STRUCK IN PLACE AND NOT DELETED.~~ "The
//   ~~run prints the JS heap delta across each cycle region — sampled outside the timed region,~~
//   ~~from `performance.memory` — so the operator can SEE whether the region kept the heap flat~~
//   ~~(collections ran inside it) or grew monotonically (they did not). If the heap grew by~~
//   ~~roughly a whole run's worth of garbage, the row has not yet captured what it exists to~~
//   ~~capture and the run says so by name."~~ Spelled `heapDelta > cycleReps × 1024` — the
//   region's whole heap growth DIVIDED BY THE CYCLE COUNT, refused over 1.00 kB per cycle.
//
//   IT ANSWERED A QUESTION ABOUT THE FOURTH POSITIONAL AND NOT ABOUT THE CODE. Three runs of this
//   axis at three cycle factors, batch 2, recordings on disk:
//
//       factor   cycles/region   heap growth   growth ÷ cycles   verdict
//       64        5,120          10.80 MB      2.16 kB           REFUSED  `.gate/teardown-floor.cycle64.json`
//       139      11,120          12.68 MB      1.17 kB           REFUSED  `.gate/teardown-floor.cycle139.json`
//       200      16,000          10.08 MB      0.65 kB           PASSED   `measurements/teardown-floor.cycle200.json`
//
//   THE NUMERATOR DOES NOT MOVE WITH N. 10.80 → 12.68 → 10.08 MB is noise around ~11 MB across a
//   3.1× range of cycle count. Had 2.16 kB been a real per-cycle retention, the factor-200 region
//   would have grown 33.8 MB; it grew 10.08. So the quantity being divided is a FIXED OFFSET —
//   the nursery's fill at the instant of the sample, plus whatever the forced pre-region GC did
//   not reach — and "kB per cycle" was eleven megabytes over N. ANY LARGE ENOUGH FACTOR CLEARS
//   1.00 kB WHETHER OR NOT THE RENDERER RETAINS ANYTHING, so the check's own remedy ("raise the
//   cycle factor") was also the way to defeat it. The factor-200 pass is not evidence that
//   retention is acceptable; it is evidence that the denominator grew.
//
//   WHAT IT IS NOW: A SLOPE ACROSS TWO ARMS OF ONE REGION. The heap is read THREE times on a
//   cycle phase — before the region, after the first quarter of its cycles, and at the end — with
//   the clock stopped across the middle read, so no reported timing contains it and the region is
//   still one uninterrupted run of N cycles with no GC inside. Write the growth as
//   `H(n) = C + R·n`: `C` is the fixed offset above, `R` is what the check is about. Then
//   `R̂ = (H(N) − H(N/4)) / (N − N/4)` and `C` CANCELS. RAISING THE FACTOR CANNOT SATISFY IT:
//   the numerator and the denominator scale together, so R̂'s expected value is `R` at every
//   factor — a bigger factor buys PRECISION, not a pass. See THE INSTRUMENT CHECK ON TABLE 2 in
//   the code for the arithmetic and for what a page can and cannot ask V8 directly.
//
// ── WHAT THE FLOOR IS ALLOWED TO BE ──────────────────────────────────────────────────────────
//
// A floor uses the CHEAPEST FORM OF EVERYTHING, which on this axis is a sharper knife than it was
// on `mount-floor`. Mounting has an irreducible core — the browser must make 861 elements — and
// teardown does not: the irreducible core of "release these objects" is ZERO, because the
// collector will do it. So the floor programs here are cheapest-form-per-CONTRACT and the run
// never quotes one against a row of another contract without labelling it.
//
//   THE BOOK FLOOR (`book·flat`) holds the same census in FLAT ARRAYS and releases it with three
//   straight-line loops: 620 `single = null` stores, 240 record releases (200 of which empty a
//   one-element disposer array), 160 `order.length = 0`. No virtual calls, no closures, no
//   per-child dispatch. It ends every subscription and releases every record — contract
//   `(none, full)`, the renderer's own — and it is the number the headline is computed against.
//
//   ITS SOURCES ARE ONE FIELD EACH, and the reason is the CHEAPEST FORM rule: an object with one
//   nullable field is the cheapest thing that can hold a callback, and clearing it is one store.
//
//   ~~`book·perkey` IS THE ONE STRUCTURAL COMPARISON IN THE FILE — 240 `registry.delete(key)`~~
//   ~~against 120 `map.clear()`, the price of eviction riding on each child's own `unmount`.~~
//   THE ROW IS STRUCK. `rememberExoChild` does not exist, and no file under `packages/*/src`
//   assigns a Map to `child.registry` — so this app allocates ZERO registries, evicts nothing, and
//   the row priced a design decision nothing in the renderer now takes.
//
// ── WHAT THIS AXIS DOES NOT BOUND. Read before quoting anything from it. ─────────────────────
//
//  * IT SAYS NOTHING ABOUT MOUNTING OR UPDATING. Those are `mount-floor` and `update-floor`.
//  * IT SAYS NOTHING ABOUT THE `toggle` AXIS'S LOSS. A toggle's teardown is the list reconciler's
//    full-clear branch on a LIVE region — `ExoChildList.removeAll`, which does empty the parent —
//    and it is a different program from a whole-app dispose. `teardown-phases` is that
//    subject and this file is not comparable to it.
//  * IT SAYS NOTHING ABOUT MEMORY as a quantity. The heap column on the cycle rows is an
//    instrument check — "did a collection happen inside the region" — and not a memory result.
//  * IT SAYS NOTHING ABOUT BLINK'S DEFERRED DESTRUCTION, which nothing in a page can observe.
//  * IT IS THIS APP'S SHAPE ONLY: 861 elements, 331 instances, 620 subscriptions, 240 records.
//    An app with more subscriptions per record, or with deeper nesting, moves the answer, which
//    is exactly why the three `scale·*` rows exist.
//  * IT IS NOT A CLAIM THAT THE GAP IS REACHABLE. Everything above the floor buys something.
//
// ── THE FALSIFIERS, COMMITTED BEFORE THE PROGRAMS WERE WRITTEN ───────────────────────────────
//
// These are MY predictions. Every one of them is JUDGEMENT from reading the code plus, where
// named, a citation from this repository. I MEASURED NONE OF THEM — this file has never been run.
// They are printed mechanically at the end so nobody, including me, gets to choose afterwards.
//
//   (a) THE OWNER'S PRIOR, HALF ONE: "the renderer is within 2× of a bare `textContent = ''`
//       floor." KILLED IF `exodra / dom·text >= 2.0`. I EXPECT IT TO FIRE, and to fire in the
//       direction that flatters the renderer is NOT what I expect: I expect `exodra` to come out
//       ABOVE `dom·text` by more than 2×, because `exodra` performs 580 closure calls, 240 virtual
//       `unmount` dispatches and 200 row disposer calls where `dom·text` is ONE property store into
//       Blink. WHATEVER IT PRINTS, THE COMPARISON IS CROSS-CONTRACT and the run labels it as
//       unsafe every time it appears.
//
//   (b) THE OWNER'S PRIOR, HALF TWO: "subscriptions rather than DOM removal dominate what we pay
//       on top." KILLED IF `book·unsub / book·flat < 0.5`. I NOW EXPECT IT TO HOLD, AND THAT IS A
//       REVERSAL THE CENSUS FORCED: there is no "DOM removal" in our teardown to be dominated
//       (falsifier (c) is the structural proof), and the counts are 620 subscriptions against 240
//       records whose release is one null test and, on 200 of them, one array-length store. When
//       the registry went, the record stopped being the dearer item by construction — a record
//       costs less than a subscription now, and there are a third as many.
//
//   (c) THE STRUCTURAL CLAIM THIS WHOLE FILE RESTS ON: the renderer's teardown removes no node.
//       KILLED IF `markupOf(container)` differs before and after `teardown()`. It is checked in a
//       GATE, before anything is timed, and the gate THROWS — because if it fires, every contract
//       label in this file is wrong and no number below it means anything.
//
//   (d) DROPPING WITHOUT RELEASING IS CHEAPER EVEN WHEN THE COLLECTOR IS INSIDE THE MEASUREMENT.
//       KILLED IF `cycle·drop > cycle·floor + resolution`. I EXPECT IT TO HOLD: a generational
//       collector reclaims a dead graph without visiting the dead objects, where an explicit
//       release visits every one of them. IF IT FAILS, explicit release pays for itself at the
//       collector, and the "a teardown that drops the root is free" argument — which is what
//       `participants/exodra/app.tsx`'s own comment leans on — is dead.
//
//   (e) `book·drop` IS AT OR UNDER THE RESOLUTION FLOOR. KILLED IF `book·drop > 3 × resolution`.
//       It is one store. If it is NOT, this instrument cannot resolve anything in the book family
//       and every attribution in it is a range.
//
//   (f) THE `detach` FAMILY IS A CALL-COUNT LADDER. I predict `dom·text`, `dom·replace` and
//       `dom·root` land TOGETHER (spread ≤ 25% of the cheapest — they are one call each and they
//       hand Blink the same 861-node subtree), and that `dom·nodes` (331 calls) is at least 3×
//       the cheapest of them. KILLED IF either half is false. If the one-call rows scatter, the
//       spelling matters more than the work does, which is worth knowing on its own.
//
//   (g) `dom·drop` IS THE CHEAPEST PROGRAM IN THE FILE THAT TOUCHES THE DOCUMENT, and is at or
//       under 2× the resolution floor. It removes ONE node. KILLED IF `dom·drop > 2 × resolution`
//       — which would say `remove()` on a node carrying a 861-element subtree costs something
//       proportional to that subtree, a finding about Blink and not about us.
//
//   (h) TEARDOWN SCALES WITH RECORDS, NOT WITH SUBSCRIPTIONS AND NOT WITH DEPTH. Three numbers,
//       one per hypothesis: `scale·rows4 − book·flat` > `scale·subs4 − book·flat`; and
//       `|scale·deep4 − book·flat| <= 3 × resolution`. KILLED severally. If DEPTH moves it, the
//       cost is in the dispatch chain rather than in the count, and the four-level shape a nested
//       component tree produces is dearer than this app's two-level one.
//
//   ~~(i) PER-CHILD EVICTION HAS A PRICE — 240 `Map.delete`s against 120 `Map.clear()`s.~~ STRUCK
//       WITH ITS ROW: nothing populates `child.registry`, so this app evicts nothing from nothing.
//
//   (k) THE RENDERER'S OWN NODES ARE NOT DEARER TO REMOVE. `dom·text·exo` is `textContent = ''`
//       on a tree `mountExodraApp` built — cloned from compiled prototypes, carrying the app's own
//       attributes and its direct-pack listeners — against `dom·text` on the floor's tree, which
//       is assembled by hand. KILLED IF the difference exceeds 3 × resolution. If it fires, the
//       floor's tree is not the renderer's tree at removal time and every `dom·*` row is a lower
//       bound by that amount. (This gate USED TO NAME an expando on 240 of those elements as the
//       difference; `@exodra/dom` has stopped writing one, and the rest of
//       the difference is unchanged.)
//
// ── THE `rung·*` LADDER IS STRUCK, AND IT NEVER REACHED THE TABLE ────────────────────────────
//
// ~~Eight rungs (`rung·flat` … `rung·spread`, plus `rung·unsub`) were to split `exodra −~~
// ~~book·flat` into named parts: the record's nine-field shape, per-child registry eviction, the~~
// ~~virtual `unmount` dispatch, the per-list `order` walk, the closure, the 320-entry scope and~~
// ~~locality. `scale·deep1` was to split the published depth reading in two. Falsifiers (l) … (r)~~
// ~~scored all of it against `measurements/teardown-floor.published.json`.~~
//
// NOT ONE OF THOSE ROWS WAS EVER IN `PROGRAMS`, so not one of them ever printed — and the
// mechanisms the first four priced are gone: `attach-exo-children.ts` and `attachExoList` do not
// exist, nothing anywhere under `packages/*/src` assigns a Map to `child.registry`, and
// `TExoDomChild` is a 23-field object where the replica carried 9. The ladder's implementation is
// DELETED with this note rather than re-pointed at something else. Its letters (l), (m) and (n) are
// REUSED below by the call-shape priors — which are printed — and (o) through (r) are retired. What
// is left unsplit is said plainly: `exodra − book·flat` is ONE bucket, and the only parts of it this
// file prices are the two rows below.
//
// ── THE CALL SHAPE: THE ONE BUCKET SPLIT IN TWO — `book·closures` AND `book·virtual` ─────────
//
// THE SENTENCE THESE TWO ROWS TAKE APART is the one the table hangs the whole gap on: `exodra −
// book·flat`, described as "580 closure calls, 240 virtual unmount dispatches and the per-child
// bookkeeping, over a floor that walks three flat arrays". THREE NAMED THINGS IN ONE NUMBER, and
// the first two have never been apart. A bucket with a name and no parts is not an attribution.
//
// THE PUBLISHED FIGURES THAT USED TO STAND HERE ARE DEAD, ALL OF THEM, AND NOT BECAUSE OF A KNOB.
// ~~`exodra` 0.0288 against `book·flat` 0.0125, +0.0163 ms, 2.304×; `book·perkey − book·flat` =~~
// ~~+0.0038; `scale·deep4` 0.0225; the 0.00125 resolution floor.~~ Every one of them was measured
// against a census this app no longer has — 801 elements, 160 subscriptions, 320 scope entries, 120
// registries — where it now has 861, 620, 580 and none. No figure below may be read against them,
// and the targets the priors used to name in milliseconds are stated as RELATIONS instead.
//
//   book·closures  `book·flat`'s EXACT WORK reached through the renderer's SCOPE instead of three
//                  straight loops: 580 closures in ONE array, in the renderer's own order — per
//                  deck its two source entries, then per card its three source entries and, per
//                  list, the `order` walk (`EXO_DOM_NODE_VOCABULARY.ts:191-194`) followed by the list's
//                  unsubscribe — invoked by `for (i < scope.length) scope[i](); scope.length = 0`,
//                  which is `exoTeardownScope.ts:19-23` verbatim. The identical counts: 620
//                  `single = null` stores, 240 record releases, 160 `order.length = 0`, and the
//                  identical end state. THE CALL SHAPE ALONE.
//   book·virtual   `book·closures` with the 240 record releases reached through the record's OWN
//                  `unmount()` — one shared module-level function called as a METHOD on records
//                  built by one literal, which is `createExoDomChildFactory.ts:55-107` handing
//                  every child the same `disposeExoChildSelf` object as its default `unmount`
//                  (`compileExoDomSchema.ts:936` is where the schema picks it up) — instead of the
//                  same walk written inline in the list's loop. NOTHING ELSE MOVES. Its body IS
//                  `disposeExoChildSelf`'s live body: the registry branch and the `effectStops`
//                  branch are left out because on this app NEITHER IS EVER TAKEN — no caller
//                  populates `child.registry`, and a wired plan declares `EXO_NO_EFFECTS`.
//                  THE VIRTUAL DISPATCH ALONE, 240 of them.
//
// BOTH ARE `(dom: none, book: full)` — `book·flat`'s contract and the renderer's — so both are
// comparable to both, and the run's floor selection sees them as candidates like any other
// `full` row. Neither builds a tree, exactly as `book·flat` builds none, so `gateFloorTree`'s
// byte-identical comparison stands over them unchanged; both are entries in `PROGRAMS`, so both are
// refused under `MIN_TICKS` clock ticks by the same loop that refuses their neighbours.
//
// ONE THING IS CARRIED AND NAMED RATHER THAN HIDDEN. Both rows' records carry a SECOND field — the
// `unmount` method — which `book·closures` never reads. It has to be on BOTH or the two rows would
// differ in the record's hidden class as well as in the call, and the pair this section exists to
// read, `book·virtual − book·closures`, would be measuring two things again. So the field rides in
// the FIRST step: `book·closures − book·flat` is THE CALL SHAPE PLUS ONE UNREAD FIELD.
//
//   (l) THE OWNER'S PRIOR ON THIS SPLIT: `book·virtual − book·closures` IS THE LARGER OF THE TWO
//       STEPS, because dispatch chains are held to cost real time on this axis.
//       KILLED IF `book·virtual − book·closures <= book·closures − book·flat`.
//       I DISAGREE, IN WRITING, AND EXPECT (l) TO FIRE: every one of the 240 records is built by ONE
//       literal and holds the SAME function object in `unmount`, so `order[i].unmount()` is
//       monomorphic over one hidden class and is exactly the case an optimising compiler inlines,
//       where the 580 scope entries are 580 DISTINCT function objects loaded out of an array slot
//       and no feedback can inline them away. AND `scale·deep4` IS NOT EVIDENCE FOR THE PRIOR: its
//       four levels are arrays of CLOSURES (`makeDeepChain` pushes closures, never a method), so
//       what it prices is the closure call — which is `book·closures`' term and not
//       `book·virtual`'s. Scored both ways: whichever step is larger is printed, and the prior's
//       verdict is that name.
//
//   (m) THE TWO STEPS ACCOUNT FOR MOST OF THE BUCKET:
//       `book·virtual − book·flat >= 0.5 × (exodra − book·flat)`. It used to have a third term —
//       eviction, `book·perkey − book·flat` — and that row is struck, so the two call terms have to
//       find the half on their own. KILLED OTHERWISE, and then the sentence the bucket was named
//       with is missing its largest term, and what is left belongs to the declaration, the
//       connector, the schema and the wiring, which no row in this file prices.
//
//   (n) BOTH STEPS ARE RESOLVABLE AT ALL: `book·closures − book·flat > resolution` AND
//       `book·virtual − book·closures > resolution`. KILLED SEVERALLY. A step at or under the
//       resolution floor is not a part of the bucket, it is a RANGE, and the row that produced it
//       may only ever be quoted as one.
//
// ── THE RESOLUTION FLOOR, AND WHY THERE ARE TWO OF THEM AND ONE IS WEAK ──────────────────────
//
// `book·twin` is a second, independently declared copy of `book·flat` over its own independently
// built state — its own function object, its own inline caches. Its true difference from
// `book·flat` is ZERO by construction, so what the run measures between them is what this
// instrument returns when there is nothing to find. Reported as BIAS (the difference of medians,
// which is free to cancel) and as NOISE (the median of the per-round |a−b|, which is not), and
// everything is read against `max(bias, noise)` — `mount-floor`'s rule, adopted because that axis
// printed `0.0000` for its own resolution on its first run and that reads as "perfect".
//
// `dom·twin` IS THE WEAK ONE AND IT IS LABELLED WEAK EVERYWHERE IT APPEARS. A duplicated
// declaration of `container.textContent = ''` is one property store written twice; there is
// nothing in it for two programs to diverge over, so it measures the harness's scatter and not
// the scatter of two genuinely different DOM programs. It is a LOWER bound on the true resolution
// of the `dom·*` family, and the run says so beside it. `hydrate-floor` carries the same weakness
// for the same reason and states it.
//
// ── HOW THIS FILE MEASURES ───────────────────────────────────────────────────────────────────
//
// `mount-floor`'s runner: `prep()` runs a phase's OWN `reps` times UNTIMED, GC, then every
// `measure()` inside ONE timed region, then every `cleanup()` untimed. Phases interleaved, order
// rotated every round. FOR A TABLE-1 ROW EVERY REPETITION'S SUBJECT IS ALIVE FOR THE WHOLE REGION —
// `reps` separately mounted apps, all standing, before the first teardown runs. That is the honest
// shape: a teardown of the fourth app in a region must not be measured against a heap the first
// three already vacated.
//
// A TABLE-2 ROW IS NOT SHAPED LIKE THAT, and the difference is what lets the two tables have
// different repetition counts at all. A cycle phase's `prep` allocates NOTHING — it hands back
// `{ measure: c.cycle, cleanup: NOTHING }` — so nothing stands before `t0`; the subject is built
// and dropped inside the one timed call. THE COUNT IS THEREFORE PER TABLE, not per run, and each
// table prints its own in its own `reps` column.
//
// THE THIRD POSITIONAL IS THE BATCH AND THE FOURTH IS THE CYCLE FACTOR. TWO KNOBS, BECAUSE THE
// TWO TABLES ARE BOUND BY OPPOSITE THINGS AND ONE NUMBER CANNOT SERVE BOTH.
//
//     npm run axis --workspace=@exodra/benchmarks -- teardown-floor 100 2 64
//                                                                     │ └─ Table 2's cycles per
//                                                                     │    region = 40 × 2 × 64
//                                                                     └─ Table 1's apps standing
//                                                                        at once = 40 × 2
//
// The batch multiplies Table 1's repetition factor, as `teardown-phases`' does. The cycle factor
// multiplies Table 2's ON TOP of the batch. Both refusals name the number for their own knob, so
// ONE RUN prints both numbers and the operator never has to run the axis twice and compare
// readings taken under different conditions.
//
// BATCH 2 IS STILL THE ONE TO RUN FOR TABLE 1 AND THE REASON IS MEMORY, not the clock. At batch 2
// a region holds 80 simultaneously mounted 861-element apps — the same live set `mount-floor`
// carries at its own recommended batch — which is ~69,000 elements plus their records. Batch 4
// doubles it and batch 8 will thrash a laptop; this repository has already had a multi-axis run
// die of memory pressure.
//
// AND TABLE 2 WANTS THE OPPOSITE, WHICH IS THE WHOLE REASON THE KNOB SPLIT. Its refusal is not the
// clock, it is the heap: a cycle region must demand MORE allocation than the young generation
// holds or V8 never collects inside it and the table measures Table 1 with a mount attached. The
// axis has already refused that way twice — at batch 2 the region grew 5.00MB over 80 cycles
// (62.5 kB per cycle) and asked for batch 8; at batch 32 it grew ~9.6 kB per cycle over 1280
// cycles and asked for batch 128 (`scripts/run-one-axis.js:589-591`). Serving that through the
// BATCH would have stood 40 × 128 = 5120 apps at once in Table 1.
//
// BOTH OF THOSE REFUSALS, AND THE TWO AFTER THEM, WERE SPELLED AS growth ÷ cycles, WHICH IS THE
// ONE ARITHMETIC A KNOB CAN DEFEAT — see THE GC QUESTION above for the three runs that showed the
// numerator flat in N and the ratio therefore an artefact of the factor. The 62.5 kB and ~9.6 kB
// figures quoted in this paragraph are that same ratio at 80 and 1280 cycles and are kept only as
// the sizes of past regions. THE REFUSAL IS A SLOPE NOW and it does not fall as N rises.
//
// THE ASYMMETRY THAT MAKES TWO KNOBS POSSIBLE, READ OFF THE CODE RATHER THAN ASSUMED:
//
//   TABLE 1 CANNOT HAVE A FREE MULTIPLIER, AND NOT BECAUSE OF HOW THE RUNNER IS WRITTEN. `prep()`
//   runs OUTSIDE the timed span, once per repetition (`sampleOnce`: the `prep` loop, then `t0`,
//   then the `measure` loop), so `reps` subjects stand at once. That could in principle be moved —
//   but a TEARDOWN CONSUMES ITS SUBJECT. `c.remove()` on an already-removed container, or
//   `releaseFlat` on an already-released census, is not the program: the second call does no work.
//   So more repetitions of a teardown REQUIRE more subjects, whatever the runner does with them,
//   and for a `dom·*`/`both·*`/`exodra` row a subject is one mounted 861-element app. The header's
//   own advice — "raise the batch for that reading" — is buying ticks with memory, always.
//
//   TABLE 2 CAN, BECAUSE ITS SUBJECT IS BUILT AND DROPPED INSIDE THE TIMED SPAN. A cycle phase's
//   `prep` allocates NOTHING (`{ measure: c.cycle, cleanup: NOTHING }`); every `CYCLES[].cycle`
//   builds its container, uses it and calls `c.remove()` within the one call, and the only thing
//   that outlives a cycle is the single `CYCLE_SINK` census the next cycle overwrites. So N cycles
//   in a region hold ONE app at a time, not N, at any N. The factor buys allocation DEMAND — which
//   is exactly what the heap refusal asks for — and costs no live set at all.
//
// WHY THE FACTOR STOPS AT THE TABLE BOUNDARY, AND WHY NO TABLE-1 ROW GETS ONE OF ITS OWN even
// though `book·*` and `scale·*` repetitions hold only a flat census and not a tree: THE
// REPETITION FACTOR IS A PROPERTY OF THE COMPARISON SET. Every number this run reports out of
// Table 1 is a DIFFERENCE between two Table-1 rows — the headline is `exodra − book·flat`, an app
// row minus a census row — and a difference between two rows measured at different region lengths
// carries a confound this file has not measured and cannot bound: per-repetition cost is not
// guaranteed flat in the repetition count. Table 2's rows are differenced only against each other
// and against nothing above them (the table's own header says it is not comparable to Table 1), so
// its factor cannot contaminate any quantity the run prints. That is the rule, and a third knob
// for the book family would break it.
//
// IF THE CLOCK CHECK STILL REFUSES A TABLE-1 ROW at batch 2 — `dom·drop` is one `remove()` and
// `book·drop` is one store — the refusal now prints the multiplier that row's own ticks say it
// needs, the batch that buys it and the live set that batch stands, plus ONE summary line with the
// single batch that clears every refused row. Raise it and accept the live set, or read those rows
// as "at the floor". What you must not do is raise it for one reading and quote that number beside
// numbers taken at batch 2.
//
// AND THAT SUMMARY LINE HAS TO RE-EXPRESS THE CYCLE FACTOR, BECAUSE THE TWO KNOBS ARE NOT
// INDEPENDENT IN THE DIRECTION THE LINE MOVES. `cycleReps = TEARDOWN_REPS × batch × cycleMul`, so
// the batch multiplies TABLE 2's region as well as Table 1's live set. The line used to print the
// batch Table 1 asked for beside the cycle factor unchanged — at batch 2 → 200 with factor 200
// that is 40 × 200 × 200 = 1,600,000 cycles per region, ~400 s per region at ~0.25 ms a cycle,
// three rows, a hundred rounds: a command nobody can run. So the line now holds TABLE 2'S REGION
// SIZE fixed and solves for the factor that reproduces it at the new batch — batch 200 with the
// 16,000-cycle region the factor-200 run used comes out as factor 2, not 200. THE OPERATOR IS
// GIVEN THE SAME TABLE 2 AT A DIFFERENT TABLE 1, which is what "one run, both numbers" meant.
//
// WHAT THE CYCLE FACTOR COSTS IN WALL CLOCK, since it is not free in time even though it is free
// in memory: a cycle is a whole mount, ~0.25 ms at the published batch-2 reading, so factor 64 at
// batch 2 is 5120 cycles ≈ 1.3 s per region, ~7 minutes for the three cycle rows over 100 rounds.
// That is the same region size the batch-32 run was already paying for, bought without its 1280
// standing apps.
//
// AND THE FOURTH POSITIONAL ONLY REACHES THIS FUNCTION BECAUSE THE RUNNER NOW FORWARDS IT.
// `run-one-axis.js` parsed two positionals and called `mod[f](rounds, batch)`, so until it was
// given a third every command line printed by the refusals below — including the one the heap
// refusal computes — dropped its last number IN SILENCE: the operator would rerun precisely what
// the axis asked for, get the default 64 again, and be refused in the same words. It is forwarded
// only when supplied, so every other axis keeps its own defaults and ignores the extra argument.
//
// ── WHICH PUBLISHED FIGURES THIS CHANGE KILLED, SAID HERE RATHER THAN LEFT TO BE NOTICED ─────
//
// EVERY FIGURE IN `measurements/teardown-floor.published.json` IS DEAD, IN BOTH TABLES, AND THE
// REASON IS NOT A KNOB — IT IS THE CENSUS. That file was recorded against an app of 801 elements,
// 321 instances, 160 subscriptions, 320 scope entries, 240 records and 120 registries. The app has
// TEN DECKS now (861 elements, 331 instances), a card holds FIVE subscriptions and SEVEN scope
// entries where the old reading credited it with two and four, and NOTHING populates a registry. So
// every Table-1 row's subject changed size and every Table-2 cycle contains a bigger mount.
//
//   STRUCK AS RESULTS, NAMED SO NOBODY RE-QUOTES THEM: ~~`exodra` 0.0288, `book·flat` 0.0125 and~~
//   ~~the +0.0163 between them; `book·perkey − book·flat` = +0.0038; `scale·deep4` 0.0225; the~~
//   ~~0.00125 resolution floor; `cycle·floor` 0.2587, `cycle·drop` 0.2475 and the +0.0112 between~~
//   ~~them.~~ The last three were ALSO taken at 80 cycles per region in a table the run itself
//   refused (the heap grew 5.00MB across the region, so V8 collected nothing inside it), which is a
//   second, independent reason not to read them.
//
//   SO EVERY NUMBER THIS AXIS PUBLISHES IS UNMEASURED UNTIL THE NEXT RUN. What would settle it is
//   one run of `teardown-floor 100 2 64` on the current app, recorded; nothing in this header may be
//   quoted in milliseconds before that. The priors above are stated as RELATIONS for exactly that
//   reason, and the ~0.25 ms per cycle used in the wall-clock estimate is a planning size and not a
//   result.
//
// `@exodra/dom` is resolved to its BUILT dist, as every axis resolves it, so `npm run build` at the
// repo root has to have run or the `exodra` row is last week's renderer.
import { EXO_NO_MANAGED_STATE, EXO_NO_STATE, createExoSchema } from '@exodra/core';
import { dropExoChild, exoDomSchemaOf } from '@exodra/dom';
import type { TExoDomChild } from '@exodra/dom';
import { EXO_BACKEND } from '../../apps/exodra/exodra';
import { mountExodraApp } from '../../participants/exodra/app';
import { markupOf } from '../../gates/markup-gate';
// THE FORMULAE ARE IMPORTED AND NEVER RE-SPELLED, exactly as `mount-floor` imports them. The
// floor's tree is gated byte-identical to `mountExodraApp`'s, and a floor that clipped a title at
// its own idea of fourteen characters would fail that gate over a character.
import {
    IDX,
    POOL,
    clickAll,
    el,
    startCount,
    startsOpen,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    // THE USERS, for the same reason as everything above: the card renders a user's NAME and a tag
    // renders its label cut to its own user's setting, and a floor that re-spelled either would
    // fail `gateFloorTree` over a character. Neither costs this axis a record — see `CARD_ELEMENTS`.
    userNameOf,
    cardUserOf,
    tagUserOf,
    startChars,
    tagTextOf,
    // THE DECKS — the app's third level. A deck is a COMPONENT, so unlike the card's `<span
    // class="user">` it moves the instance count as well as the element count, and the floor's tree
    // is 60 elements and 10 instances short of the renderer's without it.
    DECK_IDX,
    cardsOfDeck,
    deckUserOf,
    deckDateOf,
    deckNameOf,
    startDeckName,
    dateTextOf,
} from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE CENSUS — derived from the app's own spec and from the code paths named in the header, so it
// cannot drift from the app it measures. `mount-floor` derives its four numbers the same way.
// ---------------------------------------------------------------------------------------

const DECK_N = DECK_IDX.length;
const CARD_N = IDX.length;
const DETAILS_N = IDX.reduce((s, i) => s + (startsOpen(i) ? 1 : 0), 0);
const TAG_N = IDX.reduce((s, i) => s + startCount(i), 0);

/** Instances a mount builds: the shell, the decks, the cards, the open details blocks, the tags. */
const INSTANCES = 1 + DECK_N + CARD_N + DETAILS_N + TAG_N;
/**
 * ELEMENTS PER CARD — `div.card` and its six children, in the contract's order: `h3`, `span.user`,
 * `button.tog`, `div.tags`, `span.count`, `button.addtag`.
 *
 * A CARD'S ELEMENTS AND A CARD'S BOOKKEEPING MOVE SEPARATELY, which is why the two are stated
 * separately: `<span class="user">` and `<span class="count">` each added ONE ELEMENT AND NOTHING
 * ELSE — no record, no subscription, no `order` entry — because each is a scalar port in a fixed
 * element. A DECK IS NOT LIKE THAT: it is a component, so it moved `INSTANCES`, `ELEMENTS`, `SUB_N`
 * and `SCOPE_N` at once.
 */
const CARD_ELEMENTS = 7;
/** `div.deck` and its five children: `h2`, `span.author`, `time.date`, `button.ren`, `div.cards`. */
const DECK_ELEMENTS = 6;
/** Elements in the tree: 1 app + 6 per deck + 7 per card + 1 per details block + 1 per tag. */
const ELEMENTS = 1 + DECK_N * DECK_ELEMENTS + CARD_N * CARD_ELEMENTS + DETAILS_N + TAG_N;

/**
 * CHILDREN PORTS A LIST RECONCILER IS COMPOSED OVER — two per card, and therefore the count
 * of everything a teardown pays per LIST: one subscription (`c.onTeardown` on the reconciler's disposer),
 * one `order` array, and one more scope entry for the `order` walk `openChildList` registers.
 *
 * A DECK'S CARD REGION IS NOT ONE OF THESE. It is `c.list(P.cards, CARD, held.length)` — a FIXED
 * list, which pays for no diff, no source, no `order` array and no scope entry; `TExoDomNode.list`
 * registers nothing with `exoOnTeardown`. The same is true of the shell's deck region.
 */
const LIST_N = CARD_N * 2;
/**
 * Live subscriptions a mounted app holds, derived per wire rather than per list: FIVE PER CARD
 * (the headline text, `aria-expanded`, the count label, and the two reconcilers' sources), TWO PER DECK (the date, the name), ONE PER TAG ROW.
 */
const CARD_SUB_N = 5;
const DECK_SUB_N = 2;
const SUB_N = CARD_N * CARD_SUB_N + DECK_N * DECK_SUB_N + TAG_N;
/**
 * Entries in the render's teardown scope. A card's five plus ONE PER LIST from `openChildList`, and
 * a deck's two. The 200 tag-row subscriptions are NOT here: a row's `c.onTeardown` reaches
 * `exoOnTeardown(child, …)` with `child` pointing at the row's own record, so they land in its `disposers`.
 * `render` itself adds none — `EXO_DIRECT_EVENTS` has no `install` and `effectStops` is `null` on
 * every instance, because a wired plan declares `EXO_NO_EFFECTS`.
 */
const SCOPE_N = CARD_N * (CARD_SUB_N + 2) + DECK_N * DECK_SUB_N;
/** `TExoDomChild`s a mount builds: only reconciled rows, never a `c.list` or root instance. */
const RECORD_N = DETAILS_N + TAG_N;
/** Rows whose `disposers` is non-null: every tag row holds one, every details block holds none. */
const ROW_DISPOSER_N = TAG_N;
/** Leaves in the removal order of `dom·nodes`: every row, then the cards, then the decks, then root. */
const LEAF_N = RECORD_N;

/** One shared no-op for the whole process, so nothing that needs a callback allocates one. */
const NOOP = (): void => undefined;

// ---------------------------------------------------------------------------------------
// THE FLOOR'S TREE. Five prototypes and one straight-line clone program, because the tree a
// teardown is handed has to be the tree the renderer built — and it is GATED byte-identical below
// before anything is timed.
//
// IT IS COPIED AND NOT IMPORTED, and the reason is mechanical: `mount-floor.ts` exports exactly
// one symbol, its benchmark function. Importing it would drag twenty-one module-load prototype
// sets, a whole-app tree and 331 distinct prototypes into this axis's module graph to
// reach a fifty-line function.
//
// THIS AXIS BUILDS THE APP'S DERIVED VALUES AND MEASURES NONE OF THEM, and it is worth being exact
// about why they are here at all. A teardown does not read a headline, a disclosure attribute, a
// count label, a user's name or a clipped tag text — the DOM contract is about what leaves the
// document, not about what it said while it was in it. What this axis needs is the RIGHT TREE:
// `gateFloorTree` diffs these bytes against `mountExodraApp`'s, and a tree missing the `.count`
// span or the `.user` span would be 80 elements short of the one every `dom·*` row claims to be
// removing — 160 short if it were missing both, which is what this file was until the users
// arrived. So `headlineOf`, `expandedOf`, `tagsLabel`, `userNameOf` and `tagTextOf` are called
// exactly where the walk reaches their node, and every call site is inside
// `buildFloorTree` — which runs only from a `prep` or a gate and never once inside a timed region.
// The census the book rows release is unmoved by any of it: a scalar port in a fixed element
// allocates no record, no registry, no subscription and no `order` entry.
//
// THE TEXT PLACEHOLDERS ARE EMPTIED, and NEITHER `data-i` NOR `aria-expanded` is in the card's
// markup, for the reasons `mount-floor`'s prototype block gives at length: that is what the schema
// compiler leaves behind (`set-text.ts`, `exo-attr-setter.ts`), and the byte gate is what proves
// it rather than this comment. Leaving the static `class` in the prepared markup and writing the
// dynamic attribute afterwards with `setAttribute` is also what puts the two in the contract's
// order — `class` then `data-i` on the card, `class` then `aria-expanded` on the toggle.
//
// THERE ARE THREE TEXT PLACEHOLDERS IN A CARD: the `<h3>`'s headline, the `<span class="user">`'s
// name and the `.count` span's label — and THREE IN A DECK: the `<h2>`'s name, the `.author` span
// and the `<time class="date">`. All six are emptied here and all six are written as a `.data`
// store when the tree is built. `button.ren`'s "rename" is static text in the schema, exactly as
// `button.tog`'s "details" is, so it stands in the prepared markup.
// ---------------------------------------------------------------------------------------

const APP_MARKUP = '<div class="app"></div>';
const DECK_MARKUP =
    '<div class="deck">' +
    '<h2>x</h2>' +
    '<span class="author">x</span>' +
    '<time class="date">x</time>' +
    '<button class="ren">rename</button>' +
    '<div class="cards"></div>' +
    '</div>';
const CARD_MARKUP =
    '<div class="card">' +
    '<h3>x</h3>' +
    '<span class="user">x</span>' +
    '<button class="tog">details</button>' +
    '<div class="tags"></div>' +
    '<span class="count">x</span>' +
    '<button class="addtag">+</button>' +
    '</div>';
const DETAILS_MARKUP = '<div class="details">details…</div>';
const TAG_MARKUP = '<span class="tag">x</span>';

function protoOf(markup: string): Element {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as Element;
}

const P_APP = protoOf(APP_MARKUP);
const P_DECK = protoOf(DECK_MARKUP);
const P_CARD = protoOf(CARD_MARKUP);
const P_DETAILS = protoOf(DETAILS_MARKUP);
const P_TAG = protoOf(TAG_MARKUP);
/**
 * Empty ALL THREE of the card prototype's text placeholders — the `<h3>`'s headline, the
 * `<span class="user">`'s name and the `.count` span's label. Walked rather than selected because
 * the walk is the card's own child order (h3 → .user → .tog → .tags → .count → .addtag), which is
 * the order `buildFloorTree` walks too. Module load, so nothing here is inside a timed region.
 */
function emptyCardPlaceholders(card: Element): void {
    const h3 = card.firstChild as Element;
    (h3.firstChild as Text).data = '';
    const user = h3.nextSibling as Element;
    (user.firstChild as Text).data = '';
    const tog = user.nextSibling as Element;
    const tags = tog.nextSibling as Element;
    const count = tags.nextSibling as Element;
    (count.firstChild as Text).data = '';
}

/**
 * The deck prototype's three placeholders — `<h2>`'s name, `.author`'s user name, `.date`'s text.
 * Walked in the deck's own child order (h2 → .author → .date → .ren → .cards), which is the order
 * `buildFloorTree` walks too.
 */
function emptyDeckPlaceholders(deck: Element): void {
    const h2 = deck.firstChild as Element;
    (h2.firstChild as Text).data = '';
    const author = h2.nextSibling as Element;
    (author.firstChild as Text).data = '';
    const date = author.nextSibling as Element;
    (date.firstChild as Text).data = '';
}

emptyCardPlaceholders(P_CARD);
emptyDeckPlaceholders(P_DECK);
(P_TAG.firstChild as Text).data = '';

/**
 * A FLOOR-BUILT APP, plus the references a teardown could need.
 *
 * `nodes` IS IN REMOVAL ORDER, which is what makes one array serve two rows: positions
 * `0 .. LEAF_N-1` are the reconciled rows (details blocks and tag rows, in build order),
 * `LEAF_N .. LEAF_N+CARD_N-1` are the cards, the `DECK_N` after those are the decks, and the last is
 * the app root. `dom·nodes` walks the whole thing; `dom·cards` starts at `LEAF_N`. Both therefore
 * remove children before parents, which is the order a reconciler works in.
 */
interface FloorTree {
    readonly root: Element;
    readonly nodes: Element[];
}

/**
 * BUILD THE FLOOR'S TREE — one pass, decks then their cards then their children.
 *
 * ITS `onChild` HOOK IS GONE WITH `rung·spread`, the only row that ever passed one: it was called at
 * the moment a child's element was cloned so that row could allocate its record interleaved with the
 * elements. No caller remains, so the parameter is deleted rather than left as an unused door.
 *
 * NOTHING TIMED CALLS THIS except the three `cycle·*` rows, which build and drop a whole subject
 * inside their one call; every Table-1 caller is a `prep` or a gate.
 */
function buildFloorTree(container: HTMLElement): FloorTree {
    const appRoot = P_APP.cloneNode(true) as Element;
    const nodes = new Array<Element>(INSTANCES);
    let leafAt = 0;
    let cardAt = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const d = DECK_IDX[dk];
        const deck = P_DECK.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const authorSpan = h2.nextSibling as Element;
        const dateEl = authorSpan.nextSibling as Element;
        const ren = dateEl.nextSibling as Element;
        const cardsDiv = ren.nextSibling as Element;
        // READ INTO A LOCAL because the deck's author decides TWO of its three texts — the
        // `.author` name and, through that user's setting, the `.date`.
        const author = deckUserOf(d);
        (h2.firstChild as Text).data = deckNameOf(d, startDeckName(d));
        (authorSpan.firstChild as Text).data = userNameOf(author);
        (dateEl.firstChild as Text).data = dateTextOf(deckDateOf(d), startChars(author));
        ren.addEventListener('click', NOOP);
        for (const i of cardsOfDeck(d)) {
            // `startsOpen(i)` AND `startCount(i)` ARE READ INTO LOCALS AT THE TOP, because each is
            // now needed TWICE — `open` by the details branch and by the disclosure attribute, `n`
            // by the tag loop and by the count label. `mount-floor`'s clone program hoists them for
            // the same reason: calling a pure spec function twice for one card is something no
            // hand-written program would pay for.
            const open = startsOpen(i);
            const n = startCount(i);
            const card = P_CARD.cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            // THE USER'S NAME, WRITTEN ONCE AND NEVER AGAIN. It is a fill and not a record — no
            // subscription, no `order` slot — which is why the census above did not
            // move when it arrived. No row in this file ever reads it back; it is here so that the
            // tree this axis tears down is the tree the renderer built.
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            if (open) {
                const block = P_DETAILS.cloneNode(true) as Element;
                card.insertBefore(block, tags);
                nodes[leafAt++] = block;
            }
            for (let t = 0; t < n; t++) {
                const tag = P_TAG.cloneNode(true) as Element;
                // A TAG'S TEXT IS ITS LABEL CUT TO ITS OWN USER'S SETTING, and its user is
                // `tagUserOf(i, t)` and NOT the card's. `POOL[t]` alone was the app before the
                // users existed and would now be 200 wrong text nodes for `gateFloorTree` to refuse.
                (tag.firstChild as Text).data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                tags.appendChild(tag);
                nodes[leafAt++] = tag;
            }
            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            cardsDiv.appendChild(card);
            nodes[LEAF_N + cardAt] = card;
            cardAt++;
        }
        appRoot.appendChild(deck);
        nodes[LEAF_N + CARD_N + dk] = deck;
    }
    nodes[INSTANCES - 1] = appRoot;
    container.appendChild(appRoot);
    return { root: appRoot, nodes };
}

// ---------------------------------------------------------------------------------------
// THE FLOOR'S BOOKKEEPING — the same census, held in the cheapest shape that can hold it.
//
// A SOURCE IS ONE FIELD, AND THAT IS THE CHEAPEST-FORM RULE AND NOT A CLAIM ABOUT THE LIBRARY. An
// object with one nullable field is the least that can hold a callback, and clearing it is one
// store, so a straight-line program that owns 620 of them ends 620 subscriptions in 620 stores.
//
// A RECORD IS THE ONE FIELD A TEARDOWN NOW TOUCHES on a `TExoDomChild`: its own disposer array. The
// `registry` and `registryKey` fields are not here BECAUSE THE RENDERER NEVER READS THEM on this
// app — nothing under `packages/*/src` assigns a Map to `child.registry`, so
// `disposeExoChildSelf`'s eviction branch is skipped on all 240 records — and the other twenty
// fields a shipped record carries are never read by a dispose either. A floor pays for the job.
//
// 200 OF THE 240 DISPOSER ARRAYS HOLD ONE ENTRY AND 40 HOLD NONE, which is faithful rather than
// generous: every tag row carries exactly one disposer, and
// `DETAILS`' wire is `() => undefined`, so every details block leaves `disposers` at `null`. The
// floor's record keeps that split — `null` where the renderer has `null` — so the null test the
// renderer performs 240 times is performed 240 times here too.
// ---------------------------------------------------------------------------------------

interface FloorSource {
    single: (() => void) | null;
}

interface FloorRecord {
    disposers: Array<() => void> | null;
}

interface FloorBook {
    readonly sources: FloorSource[];
    readonly records: FloorRecord[];
    readonly orders: FloorRecord[][];
}

/**
 * BUILD THE CENSUS, optionally with one term multiplied — which is the whole of how the three
 * scaling hypotheses are separated.
 *
 * `subs` multiplies the SUBSCRIPTIONS and nothing else. `rows` multiplies the LISTS, and therefore
 * the records and the `order` arrays together — they are one term, because a list is what allocates
 * both and there is no app in which they vary independently.
 *
 * THE LIST SHAPES ARE THE APP'S, not an average: a details list holds one record when its card
 * starts open and none when it does not, and a tag list holds `startCount(i)`. A floor built out of
 * 160 identical lists would walk a different set of arrays.
 */
function makeFloorBook(subs: number, rows: number): FloorBook {
    const sources: FloorSource[] = [];
    for (let f = 0; f < subs; f++) {
        for (let k = 0; k < SUB_N; k++) sources.push({ single: NOOP });
    }
    const records: FloorRecord[] = [];
    const orders: FloorRecord[][] = [];
    // `subscribes` is the tag/details split: a tag row's wire makes one subscription and so carries
    // a one-element `disposers`, a details block makes none and leaves the field `null`.
    const fill = (n: number, subscribes: boolean): FloorRecord[] => {
        const order: FloorRecord[] = [];
        for (let e = 0; e < n; e++) {
            const record: FloorRecord = { disposers: subscribes ? [NOOP] : null };
            records.push(record);
            order.push(record);
        }
        return order;
    };
    for (let f = 0; f < rows; f++) {
        for (const i of IDX) {
            // The details list, then the tags list — the order the card wires them in, and an
            // `order` array for each whether or not it ever built a child: `openChildList` allocates
            // one per opened children port.
            orders.push(fill(startsOpen(i) ? 1 : 0, false));
            orders.push(fill(startCount(i), true));
        }
    }
    return { sources, records, orders };
}

/**
 * THE BOOK FLOOR — contract `(dom: none, book: full)`, the renderer's own.
 *
 * Three straight-line loops and nothing else. It ends every subscription, releases every record and
 * empties every `order`. No virtual call, no closure, no per-child dispatch.
 */
function releaseFlat(b: FloorBook): void {
    const sources = b.sources;
    for (let i = 0; i < sources.length; i++) sources[i].single = null;
    const records = b.records;
    for (let i = 0; i < records.length; i++) {
        const disposers = records[i].disposers;
        if (disposers !== null) disposers.length = 0;
    }
    const orders = b.orders;
    for (let i = 0; i < orders.length; i++) orders[i].length = 0;
}

/**
 * THE NULL. A second, independently declared copy of `releaseFlat` — its own function object, its
 * own inline caches, its own independently built state. Its true difference is ZERO by
 * construction, so what the run measures between them is what this instrument returns when there
 * is nothing to find.
 *
 * IT IS DUPLICATED SOURCE AND NOT A SECOND CALL, on purpose: calling one function twice would
 * share everything V8 learned about it and would measure a floor far below the one a real pair of
 * programs sits on. `mount-floor`'s `clone·twin` is the same construction for its reason.
 */
function releaseFlatTwin(b: FloorBook): void {
    const sources = b.sources;
    for (let i = 0; i < sources.length; i++) sources[i].single = null;
    const records = b.records;
    for (let i = 0; i < records.length; i++) {
        const disposers = records[i].disposers;
        if (disposers !== null) disposers.length = 0;
    }
    const orders = b.orders;
    for (let i = 0; i < orders.length; i++) orders[i].length = 0;
}

// `releasePerKey` IS DELETED WITH ITS ROW. It priced the renderer reaching the same end state per
// child, by key — 240 `registry.delete(key)` against 120 `map.clear()` — and nothing under
// `packages/*/src` assigns a Map to `child.registry`, so this app allocates no registry and evicts
// nothing from one.

/** Contract `(none, unsub)` — the subscriptions and nothing else. */
function releaseUnsub(b: FloorBook): void {
    const sources = b.sources;
    for (let i = 0; i < sources.length; i++) sources[i].single = null;
}

/**
 * WHAT A `(none, full)` FLOOR ROW MUST LEAVE BEHIND — every subscription ended, every record
 * released, every `order` cleared.
 *
 * NOTHING ELSE CHECKS IT. `gateCensus` proves the census was BUILT correctly and `gateEndStates`
 * only ever looks at the DOM, so without this nothing anywhere would check that `book·flat` — the
 * program the headline ratio is computed against — released anything at all. A floor that quietly
 * releases less than it claims is the cheapest row in its family and reads as a finding.
 */
function floorFullProblems(b: FloorBook): string[] {
    const problems: string[] = [];
    for (let i = 0; i < b.sources.length; i++) {
        if (b.sources[i].single !== null) {
            problems.push(`source ${i} still holds a subscriber`);
            break;
        }
    }
    for (let i = 0; i < b.records.length; i++) {
        const disposers = b.records[i].disposers;
        if (disposers !== null && disposers.length !== 0) {
            problems.push(`record ${i} was not released`);
            break;
        }
    }
    for (let i = 0; i < b.orders.length; i++) {
        if (b.orders[i].length !== 0) {
            problems.push(`order ${i} still holds ${b.orders[i].length} children`);
            break;
        }
    }
    return problems;
}

/** `(none, unsub)`: the subscriptions dead AND — as the label promises — nothing else touched. */
function floorUnsubProblems(b: FloorBook): string[] {
    const problems: string[] = [];
    for (let i = 0; i < b.sources.length; i++) {
        if (b.sources[i].single !== null) {
            problems.push(`source ${i} still holds a subscriber`);
            break;
        }
    }
    // THE RECORDS MUST STILL BE HELD. A `(none, unsub)` row that emptied a disposer array would be
    // doing `full`'s work under a cheaper label, which is the one failure the contract scheme exists
    // to stop. Only the 200 rows that carry an array can witness it; the 40 that carry `null` cannot.
    let released = 0;
    for (let i = 0; i < b.records.length; i++) {
        const disposers = b.records[i].disposers;
        if (disposers !== null && disposers.length === 0) released++;
    }
    if (released !== 0) {
        problems.push(
            `${released} of ${b.records.length} records were released by a row declared ` +
                '`(none, unsub)`, so it is not the contract it names'
        );
    }
    return problems;
}

// ---------------------------------------------------------------------------------------
// THE DEPTH PROBE — the identical census, released through FOUR levels of nested disposer arrays.
//
// THIS APP'S TEARDOWN IS TWO LEVELS DEEP: the render scope holds a closure per list, and that
// closure calls `unmount` on each child, which runs that child's own disposers. A component tree in
// which cards were themselves RECONCILED ROWS — which is what a real application looks like — puts
// two more levels between the scope and the leaf, because a child owns everything wired inside it
// (`exoOnTeardown`) and a nested list's disposer lands on the OWNER child rather than on the render. THIS
// APP DOES NOT HAVE THAT SHAPE at the card level: a deck's cards are a fixed `c.list`, so every
// card's seven disposers land in the render's one flat scope.
//
// So the question "does teardown cost scale with nesting depth" has a clean answer only if depth
// is varied with EVERYTHING ELSE HELD: the same 620 sources, the same 240 records, the same 160
// `order` arrays, released in the same order. The only difference is that
// the loops are reached through four arrays of closures instead of being written out flat.
//
// IT IS NOT A REPLICA OF THE RENDERER'S DISPATCH and is not offered as one — `unmount` is a method
// call on an object whose hidden class the site has seen, where this is a call through an array
// slot. It varies DEPTH, which is what the hypothesis is about.
// ---------------------------------------------------------------------------------------

type Disposer = () => void;

function makeDeepChain(b: FloorBook, levels: number): Disposer[] {
    // The leaves: one closure per list, doing that list's share of the same three loops.
    let level: Disposer[] = [];
    const sources = b.sources;
    const orders = b.orders;
    const perList = Math.max(1, Math.ceil(sources.length / Math.max(1, orders.length)));
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const from = i * perList;
        level.push(() => {
            for (let s = from; s < from + perList && s < sources.length; s++) {
                sources[s].single = null;
            }
            for (let r = 0; r < order.length; r++) {
                const disposers = order[r].disposers;
                if (disposers !== null) disposers.length = 0;
            }
            order.length = 0;
        });
    }
    // Then `levels - 1` layers of arrays of closures over the layer below, four at a time, so the
    // chain the run walks is genuinely `levels` calls deep and not one wide array wearing a hat.
    for (let l = 1; l < levels; l++) {
        const below = level;
        const above: Disposer[] = [];
        for (let i = 0; i < below.length; i += 4) {
            const chunk = below.slice(i, i + 4);
            above.push(() => {
                for (let k = 0; k < chunk.length; k++) chunk[k]();
            });
        }
        level = above;
    }
    return level;
}

function runChain(chain: Disposer[]): void {
    for (let i = 0; i < chain.length; i++) chain[i]();
}

// ---------------------------------------------------------------------------------------
// THE CALL ROWS — `book·flat`'s work, moved onto the renderer's CALL SHAPE and nothing else.
//
// See the header's "THE CALL SHAPE" section. What is implemented here, restated where it gets
// broken:
//
//  1. THE COUNTS ARE `book·flat`'S, EXACTLY — 620 `single = null`, 240 record releases, 160
//     `order.length = 0` — and so is the end state. What changes is HOW they are reached, and in
//     `book·virtual` one more thing changes and it is named. 420 of the 620 stores are reached
//     through a scope entry and the other 200 through a record's own `disposers`, which is exactly
//     how the renderer reaches them.
//  2. THE RECORD IS `FloorRecord`'S ONE FIELD plus `unmount` LAST. Both rows build it with the same
//     literal, so the two of them cannot differ by a hidden class — which is the whole point of the
//     pair — and the second field's price rides in `book·closures − book·flat`, where the header
//     says it does.
//  3. EVERY DISPATCH SITE IS ITS OWN SOURCE LOCATION: one `scope[i]()` runner per row and one
//     list-closer factory per row, so no site in this family ever sees the other row's closures.
//  4. NOTHING IS ALLOCATED INSIDE A TIMED REGION. Every record, array and closure is built in
//     `prep`, which is untimed; each row's `measure` only calls and stores.
// ---------------------------------------------------------------------------------------

/**
 * The shipped record seen from a teardown: the one field a dispose touches, plus the hook it is
 * reached through.
 */
interface MethodRecord {
    disposers: Array<() => void> | null;
    unmount(this: MethodRecord): void;
}

/**
 * THE RELEASE, AS A METHOD — one function for the whole process, called with `this` bound to the
 * record, which is `createExoDomChildFactory.ts`'s construction (`disposeExoChildSelf` is one
 * shared function object on every child in the page, so no child carries a closure).
 *
 * ITS BODY IS `disposeExoChildSelf`'S LIVE BODY. The two branches that are left out — the registry
 * eviction and `stopExoEffects` — are not taken on this app ONCE: no caller populates
 * `child.registry`, and a wired plan declares `EXO_NO_EFFECTS`, so `effectStops` is `null` on all
 * 240 records.
 */
const RELEASE_SELF = function (this: MethodRecord): void {
    const disposers = this.disposers;
    if (disposers !== null) {
        for (let i = 0; i < disposers.length; i++) disposers[i]();
        disposers.length = 0;
    }
};

/**
 * ONE SCOPE ENTRY THAT ENDS ONE SUBSCRIPTION — a closure over the source, holding one store.
 */
function makeSourceCloser(source: FloorSource): Disposer {
    return () => {
        source.single = null;
    };
}

/**
 * THE LIST ENTRY, RELEASING INLINE — `book·closures`', and nothing else's.
 *
 * `openChildList`'s closure (`EXO_DOM_NODE_VOCABULARY.ts:191-194`) with the record release written out in the
 * loop instead of reached through the record: the same null test, the same disposer run, the same
 * `order.length = 0`, so this row performs exactly `book·flat`'s counts.
 */
function makeInlineListCloser(order: MethodRecord[]): Disposer {
    return () => {
        for (let i = 0; i < order.length; i++) {
            const disposers = order[i].disposers;
            if (disposers !== null) {
                for (let k = 0; k < disposers.length; k++) disposers[k]();
                disposers.length = 0;
            }
        }
        order.length = 0;
    };
}

/**
 * BUILD THE CENSUS AND THE 580-ENTRY SCOPE THAT RELEASES IT — untimed, and the only thing the row
 * keeps.
 *
 * THE SCOPE IS IN THE RENDERER'S ORDER, WHICH IS THE ORDER THE WIRES RUN IN: per deck its date and
 * name entries, then its eight cards, and per card its three scalar entries followed by — per list —
 * the `order` walk and then the list's unsubscribe. THE WALK COMES FIRST because the list is
 * opened by its first port call (`c.childCount(port)`) before its source is subscribed, and that is where
 * `openChildList` calls `exoOnTeardown`.
 *
 * THE 200 ROW SUBSCRIPTIONS ARE NOT IN THE SCOPE, for the same reason they are not in the
 * renderer's: a tag row's `c.onTeardown` files its disposer in the row's own `disposers` array, which the
 * list's walk reaches through `unmount`.
 */
interface CallBookParts {
    readonly records: MethodRecord[];
    readonly sources: FloorSource[];
}

/** `parts` is `gateBookContract`'s only: nothing timed holds a reference to either array. */
function makeCallBook(
    listCloser: (order: MethodRecord[]) => Disposer,
    parts?: CallBookParts
): Disposer[] {
    const scope: Disposer[] = [];
    const source = (): FloorSource => {
        const s: FloorSource = { single: NOOP };
        if (parts !== undefined) parts.sources.push(s);
        return s;
    };
    const addList = (n: number, subscribes: boolean): void => {
        const order: MethodRecord[] = [];
        for (let e = 0; e < n; e++) {
            const record: MethodRecord = {
                disposers: subscribes ? [makeSourceCloser(source())] : null,
                unmount: RELEASE_SELF,
            };
            if (parts !== undefined) parts.records.push(record);
            order.push(record);
        }
        scope.push(listCloser(order));
        scope.push(makeSourceCloser(source()));
    };
    for (const d of DECK_IDX) {
        // The deck's date, then its name — the order `DECK`'s wire binds them in.
        scope.push(makeSourceCloser(source()));
        scope.push(makeSourceCloser(source()));
        for (const i of cardsOfDeck(d)) {
            // The card's headline, its `aria-expanded`, its count label, then its details list and
            // its tags list — the order `CARD`'s wire runs in.
            scope.push(makeSourceCloser(source()));
            scope.push(makeSourceCloser(source()));
            scope.push(makeSourceCloser(source()));
            addList(startsOpen(i) ? 1 : 0, false);
            addList(startCount(i), true);
        }
    }
    return scope;
}

/**
 * WHAT A CALL ROW MUST LEAVE BEHIND, on its own subject, before anything is timed: every source
 * cleared, every record released, the scope emptied.
 *
 * ITS WALK IS ITS OWN SOURCE LOCATION and not `runScopeInline`/`runScopeVirtual`. Those two are the
 * MEASURED sites, and feeding one of them both rows' closures would hand it the polymorphism rule 3
 * exists to keep out.
 */
function callBookProblems(listCloser: (order: MethodRecord[]) => Disposer): string[] {
    const parts: CallBookParts = { records: [], sources: [] };
    const scope = makeCallBook(listCloser, parts);
    for (let i = 0; i < scope.length; i++) scope[i]();
    scope.length = 0;
    const problems: string[] = [];
    if (parts.sources.length !== SUB_N) {
        problems.push(`the scope held ${parts.sources.length} sources, wanted ${SUB_N}`);
    }
    if (parts.records.length !== RECORD_N) {
        problems.push(`the scope held ${parts.records.length} records, wanted ${RECORD_N}`);
    }
    for (let i = 0; i < parts.sources.length; i++) {
        if (parts.sources[i].single !== null) {
            problems.push(`source ${i} still holds a subscriber`);
            break;
        }
    }
    for (let i = 0; i < parts.records.length; i++) {
        const disposers = parts.records[i].disposers;
        if (disposers !== null && disposers.length !== 0) {
            problems.push(`record ${i} was not released`);
            break;
        }
    }
    if (scope.length !== 0) problems.push(`the scope still holds ${scope.length} disposers`);
    return problems;
}

/** `exoTeardownScope.ts:19-23`, verbatim — `book·closures`' runner, and nothing else's. */
function runScopeInline(scope: Disposer[]): void {
    for (let i = 0; i < scope.length; i++) scope[i]();
    scope.length = 0;
}

/**
 * THE LIST ENTRY, RELEASING THROUGH THE RECORD'S OWN HOOK — `book·virtual`'s, and nothing else's.
 *
 * `makeInlineListCloser`'s body with its inline release replaced by `order[i].unmount()`, which is
 * `EXO_DOM_NODE_VOCABULARY.ts:192` itself. The `order` clear stays where it was, so one method call per
 * record — `RECORD_N` of them — is the ONLY difference between this row and `book·closures`.
 *
 * THE SITE IS MONOMORPHIC BY CONSTRUCTION, exactly as the renderer's is: every record it ever sees
 * came out of `makeCallBook`'s one literal and holds the one `RELEASE_SELF` object. That is the
 * property falsifier (l) turns on, so it is stated here rather than assumed.
 */
function makeMethodListCloser(order: MethodRecord[]): Disposer {
    return () => {
        for (let i = 0; i < order.length; i++) order[i].unmount();
        order.length = 0;
    };
}

/** The same loop again — `book·virtual`'s runner, so neither row's site sees the other's closures. */
function runScopeVirtual(scope: Disposer[]): void {
    for (let i = 0; i < scope.length; i++) scope[i]();
    scope.length = 0;
}

// ---------------------------------------------------------------------------------------
// THE DOM PROGRAMS. Four spellings of `detach`, one of `drop`, and the twin.
//
// THE FOUR `detach` PROGRAMS LEAVE THE IDENTICAL END STATE — the container in the document with
// zero children and no reference to any of the 861 nodes — and differ ONLY in how many calls it
// takes. That is the whole of what separates them, and the gate below proves the end state rather
// than asserting it.
//
// `dom·drop` DOES NOT. `container.remove()` takes the container out with the tree still inside it,
// so the app's nodes are out of the DOCUMENT and are still every bit as reachable as they were
// from whoever holds the container. It is in the table because it is what this suite's own cleanup
// does and what `participants/exodra/app.tsx` relies on, and it is labelled `drop` everywhere it
// appears precisely so that nobody quotes it against the four above it.
// ---------------------------------------------------------------------------------------

function detachText(container: HTMLElement): void {
    container.textContent = '';
}

/**
 * THE DOM NULL, AND IT IS THE WEAK ONE. A duplicated declaration of `detachText`, which is one
 * property store — there is almost nothing in it for two programs to diverge over, so what it
 * measures is closer to the harness's own scatter than to the scatter of two genuinely different
 * DOM programs. It is a LOWER bound on the true resolution of the `dom·*` family and the run says
 * so beside it. `hydrate-floor` carries the same weakness and states it for the same reason.
 */
function detachTextTwin(container: HTMLElement): void {
    container.textContent = '';
}

function detachReplace(container: HTMLElement): void {
    container.replaceChildren();
}

function detachRoot(tree: FloorTree): void {
    tree.root.remove();
}

/** `remove()` on every card, then every deck, then the app root — the per-instance granularity. */
function detachCards(tree: FloorTree): void {
    const nodes = tree.nodes;
    for (let i = LEAF_N; i < INSTANCES; i++) nodes[i].remove();
}

/** All 331 built instances, children before parents — what a per-child reconciler would do. */
function detachNodes(tree: FloorTree): void {
    const nodes = tree.nodes;
    for (let i = 0; i < INSTANCES; i++) nodes[i].remove();
}

// ---------------------------------------------------------------------------------------
// THE PROGRAM TABLE.
// ---------------------------------------------------------------------------------------

type DomContract = 'detach' | 'drop' | 'none';
type BookContract = 'full' | 'unsub' | 'none';

interface Program {
    readonly name: string;
    /** What must be true of the document when it returns. */
    readonly dom: DomContract;
    /** What must be true of the renderer's own state when it returns. */
    readonly book: BookContract;
    /** What it does, printed beside the number. */
    readonly what: string;
    /**
     * Prepare one subject UNTIMED and hand back the thing to time and the thing to clean up.
     *
     * Every repetition's subject is alive for the whole timed region — `mount-phases`' sink rule,
     * and on this axis it is the substance rather than a detail: Table 1's `reps` separately
     * mounted apps all stand before the first teardown runs, so a teardown is never measured
     * against a heap that earlier repetitions already vacated.
     *
     * THAT IS WHY TABLE 1'S COUNT IS BOUNDED BY MEMORY and Table 2's is not. `CycleProgram` below
     * has no `prep` to speak of: its subject is built and dropped inside the timed call, so its
     * repetition factor is a separate knob. See `TEARDOWN_REPS` and `CYCLE_REPS_FACTOR`.
     */
    readonly prep: () => Scenario;
    /**
     * PROVE THIS ROW'S BOOKKEEPING CONTRACT, ON ITS OWN SUBJECT, BEFORE ANYTHING IS TIMED.
     *
     * It builds one subject of exactly this row's kind, runs exactly this row's program, INSPECTS
     * what is left, and hands back what is wrong with it — empty means the row does what its
     * `book` label says. `gateBookContract` runs every one of these and THROWS on the first
     * problem, because a row that quietly released less than it claims would be the cheapest row
     * in its family and nothing else here would notice: `gateEndStates` only ever looked at the
     * DOM, and until this existed NOTHING checked that `book·flat` — the floor the headline is
     * computed against — released anything at all.
     *
     * It is optional only for the rows whose contract is already proved elsewhere or is empty:
     * `exodra` is proved by `gateRendererContract` (a real click, after teardown, moving nothing),
     * and the `book: 'none'` rows promise nothing to check.
     */
    readonly proof?: () => string[];
}

/** A subject with nothing to clean up beyond itself. */
const NOTHING = (): void => undefined;

// ---------------------------------------------------------------------------------------
// THE RUN FAMILY — k×(climb + removeChild) against ONE `Range`, at six run lengths.
//
// `dropExoChild`'s own header used to carry a number for exactly this question — "collapsing a run
// with a `Range` instead was tried and MEASURED at nothing on a 200-row clear (3.00 vs 2.98 ms)" —
// and that number's PROVENANCE IS GONE: no `Range` participant existed anywhere in this suite
// before this pair, and the case it described was a WHOLE-REGION clear, which now goes through
// `clearOwnedExoChildList` and never reaches `dropExoChild` at all. This pair is the instrument that number
// should have been, over the case a run-shaped removal actually serves: a CONTIGUOUS run with survivors
// on both sides, not a clear.
//
// EVERY PAIR ACTS ON THE SAME TREE. `buildRunOrder(len)` builds `RUN_SURVIVORS` plain `<li>`s, then
// `len` more (the run), then `RUN_SURVIVORS` more, and BOTH `run·N·drop` and `run·N·range` remove
// `order[from, to)` from an otherwise identical container. Both are expected to leave the identical
// survivors — `RUN_SURVIVORS` elements before the run's old position and `RUN_SURVIVORS` after, in
// the same order — which `gateRunFamily` proves once per length before anything is timed, rather
// than leaving it asserted here.
//
// THE RECORDS ARE HAND-BUILT AND NOT TAKEN FROM THE PACKAGE, for the reason `update-floor`'s
// `makeFloorRecord` gives: `createExoDomChildFactory` is not public surface, and this pair prices
// a DOM-removal SPELLING, not the renderer's own construction path. Both `unmount`s are shared
// no-ops — a survival stamp, a registry and a disposer list have nothing to do with which spelling
// is cheaper, and giving one row real bookkeeping while its pair had none would price two different
// questions under one axis.
//
// `dom: 'none'` ON EVERY ROW HERE, DELIBERATELY. Neither `detach` nor `drop` describes what these
// leave behind — the container stays in the document WITH SURVIVORS STILL IN IT, which is neither
// contract `gateEndStates` checks — so these rows are excluded from that gate exactly as the `book`
// and `scale` families are, and `book: 'none'` keeps them out of `sameContract`'s floor search: they
// answer one question of their own, in their own printed section, and are never read against
// `exodra`, `dom·*` or `book·*`.
// ---------------------------------------------------------------------------------------

/**
 * Survivors kept on EACH side of the run, so both of a `Range`'s boundaries always sit strictly
 * inside the container — the general case a real list reconciler hits, never the degenerate one
 * where the run touches an edge of `order`.
 */
const RUN_SURVIVORS = 10;

/** Nothing — this family prices removal, not mounting; no row in it is ever placed again. */
const RUN_NO_MOUNT = function (this: TExoDomChild): void {
    // Nothing.
};

/**
 * Nothing — and the SAME nothing on both spellings' records. A survival stamp, a registry entry
 * and a disposer list are the renderer's own bookkeeping, orthogonal to which of two DOM-removal
 * spellings is cheaper; giving both rows of a pair the identical no-op is what keeps that
 * bookkeeping from leaking into either number.
 */
const RUN_NO_UNMOUNT = function (this: TExoDomChild): void {
    // Nothing.
};

/**
 * THE NODE TABLE OF AN INSTANCE WITH NOTHING TO RESOLVE — ONE array for the process, exactly as
 * `EXO_EMPTY_NODES` is in `@exodra/dom` and exactly what a fresh record leaves the shipped
 * record holding. A `[]` per record would add an allocation `createExoDomChildFactory` does not make,
 * inside a
 * family whose whole subject is what a record costs.
 */
const RUN_EMPTY_NODES: Node[] = [];

/**
 * THE SCHEMA THE RUN FAMILY'S RECORDS CARRY. A shipped child's `schema` is never null — it is written
 * by the constructor and never cleared — so a replica of the shape needs a real one. These records
 * stand for plain `<li>`s with no port, so this is the schema of exactly that.
 *
 * COMPILED THROUGH THE APP'S OWN BACKEND, not a second one: a backend is the schema cache key and
 * is compared by POINTER, so a fresh one here would be a second cache in the process for a
 * declaration nothing else compiles. Module load, outside every timed region.
 */
const RUN_LI_PLAN = exoDomSchemaOf(
    {
        declaration: createExoSchema((b) => {
            b.el('li', null, () => undefined);
            return {};
        }),
        forms: [],
        createInitialState: null,
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    },
    EXO_BACKEND
);

/** `createExoDomChildFactory`'s constructor, field for field, with both hooks the shared no-ops above. */
function makeRunRecord(node: Element): TExoDomChild {
    return {
        // THE INSTANCE-RECORD SLOTS, FIRST AND IN THIS ORDER — a `TExoDomChild` IS the record
        // its instance is wired through (`TExoDomInstanceRecord`), and `createExoDomChildFactory` writes
        // them IN FRONT OF `node`, in exactly this sequence, so a record and a child fold
        // into one hidden-class shape. Omitting any of them makes this replica narrower than the
        // object it stands for, at a different hidden class — which is the one thing the run
        // family's records must not be, since what they price IS the shape.
        //
        // THEY ARRIVE EMPTY IN THE SHIPPED CONSTRUCTOR TOO: a child exists before its instance
        // does, and the wire fills them afterwards.
        nodes: RUN_EMPTY_NODES,
        childLists: null,
        child: null,
        context: null,
        schema: RUN_LI_PLAN,
        publishedChildListEnds: null,
        state: EXO_NO_STATE,
        managedState: EXO_NO_MANAGED_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
        machine: null,
        portChildren: null,
        placedIn: null,
        node,
        mount: RUN_NO_MOUNT,
        unmount: RUN_NO_UNMOUNT,
        disposers: [],
        // LAST, AS IT IS IN THE SHIPPED CONSTRUCTOR: moving it moves every other field's in-object
        // offset, so a replica that put it anywhere else would be a different shape.
        live: null,
    };
}

/**
 * HOW MANY SUBJECTS ONE TIMED REGION CONSUMES — the run family's own repetition factor, and the
 * reason it does not need the axis-wide `batch` the resolution gate would otherwise demand of it.
 *
 * THE FIRST RUN OF THESE ROWS WAS REFUSED BY THAT GATE and refused correctly: eight of the twelve
 * timed regions came back at 0.000 ms against an observed quantum of 0.100 ms, and three more at
 * one or two ticks against a floor of three. Only `run·200` cleared it. The gate's own prescription
 * was `teardown-floor 100 100 1` — batch 100 across the WHOLE axis — and its own header says what
 * that costs: the `dom·*`/`both·*`/`exodra` rows would then stand 4000 mounted apps ≈ 2,564,000
 * elements at once, in a repository that has already had a run die of memory pressure.
 *
 * THE FAMILY DOES NOT NEED THAT, BECAUSE ITS SUBJECT IS NOT AN APP. `buildRunOrder(len)` is a
 * `<ul>` holding `len + 20` bare `<li>`s and no framework at all; a hundred of them is a few
 * thousand elements, against the two and a half million batch 100 would stand for rows that mount
 * whole applications. A teardown consumes its subject, so more repetitions genuinely do require
 * more subjects — this factor buys them where they are cheap instead of buying them everywhere.
 *
 * WHAT IT DOES TO THE PRINTED NUMBER, said here so nobody reads a `run·*` row as one removal: the
 * region's cost is `RUN_REPS` removals, not one. That is deliberate and it is why BOTH spellings
 * carry the identical factor — the question these rows exist for is the RATIO of `run·N·drop` to
 * `run·N·range` at each length, and a factor applied equally to both leaves the ratio untouched
 * while lifting both sides off the quantum. It also means a `run·*` number must never be quoted
 * beside a `dom·*` or `book·*` one: those are one teardown per region and these are a hundred.
 */
const RUN_REPS = 100;

interface RunSubject {
    readonly container: HTMLElement;
    readonly order: TExoDomChild[];
    /** The run is `order[from, to)` — half-open, the same shape a run-shaped removal takes. */
    readonly from: number;
    readonly to: number;
}

/** `RUN_SURVIVORS` plain `<li>`s, then `runLen` more (the run), then `RUN_SURVIVORS` more. */
function buildRunOrder(runLen: number): RunSubject {
    const container = el();
    const total = runLen + RUN_SURVIVORS * 2;
    const order = new Array<TExoDomChild>(total);
    for (let i = 0; i < total; i++) {
        const li = document.createElement('li');
        li.setAttribute('data-i', String(i));
        container.appendChild(li);
        order[i] = makeRunRecord(li);
    }
    return { container, order, from: RUN_SURVIVORS, to: RUN_SURVIVORS + runLen };
}

/** The per-child spelling: `dropExoChild`'s climb and `removeChild`, `to - from` times. */
function removeRunPerChild(subject: RunSubject): void {
    const { order, from, to, container } = subject;
    for (let i = from; i < to; i++) dropExoChild(order[i], container);
}

/**
 * The `Range` spelling: every member unmounted, then TWO climbs (the run's first and last member,
 * each to a direct child of `container`) and one `deleteContents()`.
 *
 * IT IS WRITTEN OUT HERE AND NOT IMPORTED, and that is the whole point of keeping these rows. It
 * lived in `@exodra/dom` as `dropOwnedRun` for a while, was wired into all five of that
 * package's contiguous-run drops, lost to the per-child loop at every length below by 39–162×, and
 * was deleted. What survives is the PRICE, and a price that no longer has a program behind it is a
 * price nobody can check — so the program lives here, in the file that measures it, where it costs
 * the shipped package nothing and cannot be re-proposed without this table being met first.
 *
 * NOTE WHAT IT DOES NOT DO, because it is the leading suspect for the numbers: nothing releases the
 * `Range`. See the closing paragraph of `dropExoChild` for the hypothesis and the experiment that
 * would settle it.
 */
function removeRunByRange(subject: RunSubject): void {
    const { order, from, to, container } = subject;
    for (let i = from; i < to; i++) {
        order[i].unmount();
    }
    let firstOut: Node | null = order[from].node;
    while (firstOut !== null && firstOut.parentNode !== container) firstOut = firstOut.parentNode;
    let lastOut: Node | null = order[to - 1].node;
    while (lastOut !== null && lastOut.parentNode !== container) lastOut = lastOut.parentNode;
    if (firstOut === null || lastOut === null) {
        for (let i = from; i < to; i++) {
            let out: Node | null = order[i].node;
            while (out !== null && out.parentNode !== container) out = out.parentNode;
            if (out !== null) container.removeChild(out);
        }
        return;
    }
    const range = document.createRange();
    range.setStartBefore(firstOut);
    range.setEndAfter(lastOut);
    range.deleteContents();
}

/**
 * THE PREDICTION, COMMITTED BEFORE THE PAIR WAS RUN — see falsifier (s) at the end of this file
 * for the KILL condition scored against it. Two climbs and one `Range` carry a fixed cost a loop
 * does not (allocating the `Range`, two `Range`-internal boundary-point writes), where the loop's
 * cost scales with `to - from`. I EXPECT THE FIRST CROSSOVER SOMEWHERE IN `[RUN_CROSSOVER_LOW,
 * RUN_CROSSOVER_HIGH]`: below it the `Range`'s fixed cost should dominate and `run·N·drop` should
 * win; at or above it the `N - 2` climbs the `Range` spelling never performs should start to
 * outweigh what it costs to allocate one. I DO NOT KNOW BLINK'S CONSTANT FOR EITHER OPERATION, so
 * the boundary is a guess and the run is what gets to contradict it.
 */
const RUN_CROSSOVER_LOW = 4;
const RUN_CROSSOVER_HIGH = 8;

/** Run lengths the pair is priced at — short enough to be dominated by a `Range`'s fixed cost,
 *  long enough (200) to be the whole-region case `dropExoChild`'s old, unreproducible number named. */
const RUN_LENGTHS: readonly number[] = [1, 2, 4, 8, 32, 200];

function runProgram(len: number, spelling: 'drop' | 'range'): Program {
    const remove = spelling === 'drop' ? removeRunPerChild : removeRunByRange;
    return {
        name: `run·${len}·${spelling}`,
        dom: 'none',
        book: 'none',
        what:
            spelling === 'drop'
                ? `${len} × (climb + removeChild) over a contiguous run of ${len}, ` +
                  `${RUN_SURVIVORS} survivors each side — the per-child spelling, ` +
                  `${RUN_REPS} subjects per timed region`
                : `ONE Range over the same contiguous run of ${len}, same tree, same survivors — ` +
                  `the two-climb spelling, ${RUN_REPS} subjects per timed region`,
        prep: (): Scenario => {
            const subjects = new Array<RunSubject>(RUN_REPS);
            for (let r = 0; r < RUN_REPS; r++) subjects[r] = buildRunOrder(len);
            return {
                measure: () => {
                    for (let r = 0; r < RUN_REPS; r++) remove(subjects[r]);
                },
                cleanup: () => {
                    for (let r = 0; r < RUN_REPS; r++) subjects[r].container.remove();
                },
            };
        },
    };
}

const RUN_PROGRAMS: readonly Program[] = RUN_LENGTHS.flatMap((len) => [
    runProgram(len, 'drop'),
    runProgram(len, 'range'),
]);

const PROGRAMS: readonly Program[] = [
    // ── THE `detach` FAMILY — a call-count ladder over the identical end state. ──────────────
    {
        name: 'dom·text',
        dom: 'detach',
        book: 'none',
        what: `container.textContent = '' — ONE call, ${ELEMENTS} elements out of the document`,
        prep: (): Scenario => {
            const c = el();
            buildFloorTree(c);
            return { measure: () => detachText(c), cleanup: () => c.remove() };
        },
    },
    {
        name: 'dom·twin',
        dom: 'detach',
        book: 'none',
        what: 'THE WEAK NULL — a duplicated declaration of `dom·text`. True Δ = 0, and one store',
        prep: (): Scenario => {
            const c = el();
            buildFloorTree(c);
            return { measure: () => detachTextTwin(c), cleanup: () => c.remove() };
        },
    },
    {
        name: 'dom·replace',
        dom: 'detach',
        book: 'none',
        what: 'container.replaceChildren() — the other one-call spelling of the same end state',
        prep: (): Scenario => {
            const c = el();
            buildFloorTree(c);
            return { measure: () => detachReplace(c), cleanup: () => c.remove() };
        },
    },
    {
        name: 'dom·root',
        dom: 'detach',
        book: 'none',
        what: `appRoot.remove() — ONE removal of the whole ${ELEMENTS}-element subtree`,
        prep: (): Scenario => {
            const c = el();
            const tree = buildFloorTree(c);
            return { measure: () => detachRoot(tree), cleanup: () => c.remove() };
        },
    },
    {
        name: 'dom·cards',
        dom: 'detach',
        book: 'none',
        what: `${CARD_N} card.remove() then the root — the per-card granularity`,
        prep: (): Scenario => {
            const c = el();
            const tree = buildFloorTree(c);
            return { measure: () => detachCards(tree), cleanup: () => c.remove() };
        },
    },
    {
        name: 'dom·nodes',
        dom: 'detach',
        book: 'none',
        what: `${INSTANCES} remove(), children before parents — what a per-child reconciler does`,
        prep: (): Scenario => {
            const c = el();
            const tree = buildFloorTree(c);
            return { measure: () => detachNodes(tree), cleanup: () => c.remove() };
        },
    },
    {
        name: 'dom·drop',
        dom: 'drop',
        book: 'none',
        what:
            'container.remove() — A DIFFERENT CONTRACT: the tree leaves the document INSIDE the ' +
            'container and stays entirely reachable from it. Never quote it against `detach`',
        prep: (): Scenario => {
            const c = el();
            buildFloorTree(c);
            return { measure: () => c.remove(), cleanup: NOTHING };
        },
    },
    {
        name: 'dom·text·exo',
        dom: 'detach',
        book: 'none',
        what:
            `the same textContent = '' on a tree \`mountExodraApp\` built — ${RECORD_N} of whose ` +
            "elements are component roots cloned from compiled prototypes, where the floor's tree " +
            'is assembled by hand',
        prep: (): Scenario => {
            const c = el();
            const app = mountExodraApp(c);
            return {
                measure: () => detachText(c),
                cleanup: () => {
                    app.teardown();
                    c.remove();
                },
            };
        },
    },

    // ── THE BOOK FAMILY — no DOM contract at all, which is the renderer's own shape. ─────────
    //
    // NONE OF THESE BUILDS A TREE, deliberately. They measure bookkeeping, and an 861-element tree
    // in the scenario would add nothing to the timed region and multiply the untimed prep by an
    // order of magnitude. `both·floor` is where the two halves are put back together.
    {
        name: 'book·drop',
        dom: 'none',
        book: 'none',
        what:
            'ONE STORE — the whole graph becomes unreachable and the collector is left to find ' +
            'it. Its timed number is expected to be unreadable; its real cost is in `cycle·drop`',
        prep: (): Scenario => {
            const holder: { book: FloorBook | null } = { book: makeFloorBook(1, 1) };
            return {
                measure: () => {
                    holder.book = null;
                },
                cleanup: NOTHING,
            };
        },
    },
    {
        name: 'book·unsub',
        dom: 'none',
        book: 'unsub',
        what: `${SUB_N} subscriptions ended and nothing else — one field store each`,
        prep: (): Scenario => {
            const b = makeFloorBook(1, 1);
            return { measure: () => releaseUnsub(b), cleanup: NOTHING };
        },
        proof: (): string[] => {
            const b = makeFloorBook(1, 1);
            releaseUnsub(b);
            return floorUnsubProblems(b);
        },
    },
    {
        name: 'book·flat',
        dom: 'none',
        book: 'full',
        what:
            `THE FLOOR FOR THE RENDERER'S CONTRACT — ${SUB_N} unsubscribes, ${RECORD_N} record ` +
            `releases (${ROW_DISPOSER_N} of them emptying a one-element disposer array), ` +
            `${LIST_N} order clears, in three straight-line loops with no virtual call and no closure`,
        prep: (): Scenario => {
            const b = makeFloorBook(1, 1);
            return { measure: () => releaseFlat(b), cleanup: NOTHING };
        },
        proof: (): string[] => {
            const b = makeFloorBook(1, 1);
            releaseFlat(b);
            return floorFullProblems(b);
        },
    },
    {
        name: 'book·twin',
        dom: 'none',
        book: 'full',
        what: 'THE NULL — a duplicated declaration of `book·flat` over its own state. True Δ = 0',
        prep: (): Scenario => {
            const b = makeFloorBook(1, 1);
            return { measure: () => releaseFlatTwin(b), cleanup: NOTHING };
        },
        proof: (): string[] => {
            const b = makeFloorBook(1, 1);
            releaseFlatTwin(b);
            return floorFullProblems(b);
        },
    },
    // `book·perkey` IS STRUCK. It priced the identical end state reached per child — 240
    // `registry.delete(key)` against 120 `map.clear()`, "what eviction-rides-on-unmount costs" — and
    // nothing under `packages/*/src` populates `child.registry`, so this app has no registry to evict
    // from. The row is not re-pointed at anything.
    {
        name: 'book·closures',
        dom: 'none',
        book: 'full',
        what:
            `book·flat's EXACT WORK through the renderer's scope — ${SCOPE_N} closures in one ` +
            `array, in the order the wires run: per deck 2 source entries, per card 3 plus an ` +
            `order-walk and an unsubscribe per list, run by exo-teardown-scope's own loop. Same ` +
            'counts, same end state: THE CALL SHAPE ALONE',
        prep: (): Scenario => {
            const scope = makeCallBook(makeInlineListCloser);
            return { measure: () => runScopeInline(scope), cleanup: NOTHING };
        },
        proof: (): string[] => callBookProblems(makeInlineListCloser),
    },
    {
        name: 'book·virtual',
        dom: 'none',
        book: 'full',
        what:
            `book·closures with the ${RECORD_N} record releases reached through the record's own ` +
            'unmount() — one shared function called as a METHOD on one hidden class, instead of ' +
            'the same walk inline. THE DISPATCH ALONE',
        prep: (): Scenario => {
            const scope = makeCallBook(makeMethodListCloser);
            return { measure: () => runScopeVirtual(scope), cleanup: NOTHING };
        },
        proof: (): string[] => callBookProblems(makeMethodListCloser),
    },
    {
        name: 'exodra',
        dom: 'none',
        book: 'full',
        what:
            'mountExodraApp(c).teardown() — @exodra/core schemas through @exodra/dom, out of its ' +
            `built dist. ${SCOPE_N} scope disposers, ${RECORD_N} unmounts, ${ROW_DISPOSER_N} row ` +
            'disposers, NO node removed',
        prep: (): Scenario => {
            const c = el();
            const app = mountExodraApp(c);
            return { measure: () => app.teardown(), cleanup: () => c.remove() };
        },
    },

    // ── BOTH CONTRACTS AT ONCE — what a single-page app's route change actually wants. ───────
    {
        name: 'both·floor',
        dom: 'detach',
        book: 'full',
        what: "book·flat then textContent = '' — the floor for `(detach, full)`",
        prep: (): Scenario => {
            const c = el();
            buildFloorTree(c);
            const b = makeFloorBook(1, 1);
            return {
                measure: () => {
                    releaseFlat(b);
                    detachText(c);
                },
                cleanup: () => c.remove(),
            };
        },
    },
    {
        name: 'both·exodra',
        dom: 'detach',
        book: 'full',
        what: "teardown() then textContent = '' — the renderer on the same contract",
        prep: (): Scenario => {
            const c = el();
            const app = mountExodraApp(c);
            return {
                measure: () => {
                    app.teardown();
                    detachText(c);
                },
                cleanup: () => c.remove(),
            };
        },
    },

    // ── THE SCALING HYPOTHESES — `book·flat` with exactly one term multiplied. ───────────────
    {
        name: 'scale·subs4',
        dom: 'none',
        book: 'full',
        what: `book·flat with ${
            SUB_N * 4
        } subscriptions instead of ${SUB_N}, everything else equal`,
        prep: (): Scenario => {
            const b = makeFloorBook(4, 1);
            return { measure: () => releaseFlat(b), cleanup: NOTHING };
        },
        proof: (): string[] => {
            const b = makeFloorBook(4, 1);
            releaseFlat(b);
            return floorFullProblems(b);
        },
    },
    {
        name: 'scale·rows4',
        dom: 'none',
        book: 'full',
        what:
            `book·flat with ${RECORD_N * 4} records and ${LIST_N * 4} orders instead of ` +
            `${RECORD_N}/${LIST_N} — one term, because a list is what allocates both`,
        prep: (): Scenario => {
            const b = makeFloorBook(1, 4);
            return { measure: () => releaseFlat(b), cleanup: NOTHING };
        },
        proof: (): string[] => {
            const b = makeFloorBook(1, 4);
            releaseFlat(b);
            return floorFullProblems(b);
        },
    },
    {
        name: 'scale·deep4',
        dom: 'none',
        book: 'full',
        what:
            'the IDENTICAL census released through FOUR levels of nested disposer arrays instead ' +
            'of flat loops — the shape a nested component tree produces. Only depth varies',
        prep: (): Scenario => {
            const b = makeFloorBook(1, 1);
            const chain = makeDeepChain(b, 4);
            return { measure: () => runChain(chain), cleanup: NOTHING };
        },
        proof: (): string[] => {
            const b = makeFloorBook(1, 1);
            runChain(makeDeepChain(b, 4));
            return floorFullProblems(b);
        },
    },

    // ── THE RUN FAMILY — see the section header above `RUN_SURVIVORS` for the full argument. ──
    ...RUN_PROGRAMS,
];

/**
 * THE CYCLE PROGRAMS — the honest table. See the header's GC section.
 *
 * Each repetition is ONE COMPLETE mount → teardown → drop, and all `cycleReps` of them — Table 1's
 * `reps` times this table's OWN factor (`CYCLE_REPS_FACTOR`, the fourth positional) — run back to
 * back inside one timed region with NO GC between. Whatever V8 collects to satisfy the allocation
 * demand of repetitions 2..N is INSIDE the measurement, which is precisely what Table 1 cannot
 * contain. The three rows differ by the release and by nothing else.
 *
 * AND THE COUNT IS FREE IN MEMORY, which is why this table gets a knob of its own: each `cycle()`
 * below builds its container, uses it and calls `c.remove()` within the one call, and the only
 * thing that outlives a repetition is the single `CYCLE_SINK` census the next one overwrites. N
 * repetitions hold ONE app at a time, at any N. A Table-1 repetition holds one for the whole
 * region, because a teardown consumes its subject and `prep` must build them all up front.
 */
interface CycleProgram {
    readonly name: string;
    readonly what: string;
    readonly cycle: () => void;
}

/**
 * THE SINK THE TWO FLOOR CYCLES WRITE THEIR CENSUS INTO, and it is not tidiness.
 *
 * `cycle·drop` builds a census and uses it for nothing, which is the whole point of the row — and
 * an allocation whose result never escapes is one V8's escape analysis is entitled to scalar-
 * replace or elide outright, at which point the row measures a program that never allocated what
 * it is supposed to be dropping. One module-level store makes it escape and costs one store.
 *
 * BOTH FLOOR CYCLES WRITE TO IT, not just the one that needs it. The difference between them is
 * the only quantity this table reports, so they must retain the same thing: exactly ONE census
 * survives each region, in both rows, and the next repetition overwrites it.
 */
let CYCLE_SINK: FloorBook | null = null;

const CYCLES: readonly CycleProgram[] = [
    {
        name: 'cycle·drop',
        what:
            'build the floor tree + the whole census, release NOTHING, drop the container. The ' +
            'collector does all of it, inside this region if V8 chooses to',
        cycle: () => {
            const c = el();
            buildFloorTree(c);
            CYCLE_SINK = makeFloorBook(1, 1);
            c.remove();
        },
    },
    {
        name: 'cycle·floor',
        what: 'the same, with book·flat run before the drop — release by hand, then let it go',
        cycle: () => {
            const c = el();
            buildFloorTree(c);
            const b = makeFloorBook(1, 1);
            releaseFlat(b);
            CYCLE_SINK = b;
            c.remove();
        },
    },
    {
        name: 'cycle·exodra',
        what: 'mountExodraApp → teardown() → container.remove(), the renderer doing the same job',
        cycle: () => {
            const c = el();
            const app = mountExodraApp(c);
            app.teardown();
            c.remove();
        },
    },
];

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until every claim this axis's contract labels rest on has been
// CHECKED. A gate that returns `false` and lets the run continue is a comment, not a gate.
// ---------------------------------------------------------------------------------------

/**
 * THE CENSUS GATE — the counts this file's floor is built out of, re-derived from the spec.
 *
 * They would otherwise fail quietly and plausibly: a floor holding 120 records where the app holds
 * 240 produces a perfectly readable number for a job nobody does.
 *
 * IT ALSO CHECKS THE TWO SCOPES AGREE. `book·closures` builds its own 580-entry scope by a different
 * route from `SCOPE_N`'s arithmetic, and the two have to come out the same number or one of the pair
 * the call-shape section exists to read is measuring a different app.
 */
function gateCensus(): void {
    const b = makeFloorBook(1, 1);
    const problems: string[] = [];
    if (b.sources.length !== SUB_N) problems.push(`sources ${b.sources.length} ≠ ${SUB_N}`);
    if (b.records.length !== RECORD_N) problems.push(`records ${b.records.length} ≠ ${RECORD_N}`);
    if (b.orders.length !== LIST_N) problems.push(`orders ${b.orders.length} ≠ ${LIST_N}`);
    let carrying = 0;
    for (const r of b.records) if (r.disposers !== null) carrying++;
    if (carrying !== ROW_DISPOSER_N) {
        problems.push(`records carrying a disposer array ${carrying} ≠ ${ROW_DISPOSER_N}`);
    }
    const scope = makeCallBook(makeInlineListCloser);
    if (scope.length !== SCOPE_N) problems.push(`scope entries ${scope.length} ≠ ${SCOPE_N}`);
    if (problems.length > 0) {
        throw new Error(
            `teardown-floor: the floor's census does not describe the app — ${problems.join(
                ', '
            )}. Every number in this axis is a per-item cost times one of those counts.`
        );
    }
    line(
        `gate teardown-floor: census — ${SUB_N} subscriptions, ${SCOPE_N} scope disposers, ` +
            `${RECORD_N} child records of which ${ROW_DISPOSER_N} carry a disposer, ` +
            `${LIST_N} order arrays, NO registries. All derived from the app's spec and from the ` +
            'code paths, none written down.'
    );
}

/**
 * THE BOOKKEEPING GATE — every row that CAN prove its `book` contract does, on its own subject, by
 * inspection, before anything is timed.
 *
 * Without it nothing would check that `book·flat` — the program the headline ratio is computed
 * against — released anything at all: `gateEndStates` only ever looks at the DOM. A row that
 * quietly releases less than it claims is the cheapest row in its family and reads as a finding.
 *
 * `exodra` HAS NO `proof` AND DOES NOT NEED ONE: `gateRendererContract` proves its contract the
 * harder way, by clicking a torn-down app and watching the DOM not move.
 */
function gateBookContract(): void {
    let proved = 0;
    for (const p of PROGRAMS) {
        const proof = p.proof;
        if (proof === undefined) continue;
        const problems = proof();
        if (problems.length > 0) {
            throw new Error(
                `teardown-floor: "${p.name}" declares the \`${p.book}\` bookkeeping contract and ` +
                    `does not hold it — ${problems.join('; ')}. Its number is the price of a ` +
                    'different job from the one its label names, and the rows it is compared ' +
                    'against were told something else.'
            );
        }
        proved++;
    }
    line(
        `gate teardown-floor: ${proved} rows proved their bookkeeping contract by inspection on ` +
            'their own subject — every source cleared, every record released, every array emptied'
    );
}

/** The floor's tree must be the renderer's tree, byte for byte, or `dom·*` tears down a different job. */
function gateFloorTree(): void {
    const ref = el();
    const refApp = mountExodraApp(ref);
    const want = markupOf(ref);
    const wantN = ref.querySelectorAll('*').length;
    refApp.teardown();
    ref.remove();

    if (wantN !== ELEMENTS) {
        throw new Error(
            `teardown-floor: the reference app mounted ${wantN} elements where the spec says ` +
                `${ELEMENTS} — the census this axis normalises by does not describe the app`
        );
    }

    const c = el();
    const tree = buildFloorTree(c);
    const got = markupOf(c);
    const gotN = c.querySelectorAll('*').length;
    if (tree.nodes.length !== INSTANCES) {
        throw new Error(
            `teardown-floor: the floor tree retained ${tree.nodes.length} instances where the ` +
                `app builds ${INSTANCES} — \`dom·nodes\` and \`dom·cards\` would remove the ` +
                'wrong set'
        );
    }
    for (let i = 0; i < INSTANCES; i++) {
        if (tree.nodes[i] !== undefined) continue;
        throw new Error(
            `teardown-floor: the floor tree left removal slot ${i} empty — the removal order ` +
                '(children, then cards, then root) has a hole in it'
        );
    }
    if (got !== want) {
        let at = 0;
        while (at < want.length && at < got.length && want[at] === got[at]) at++;
        const from = Math.max(0, at - 80);
        refuse(
            `teardown-floor: the floor tree is NOT the app's tree — ${wantN} elements (exodra) / ` +
                `${gotN} (floor), first difference at char ${at}\n` +
                `  exodra: …${want.slice(from, at + 160)}…\n` +
                `  floor : …${got.slice(from, at + 160)}…`
        );
        c.remove();
        throw new Error(
            `teardown-floor: the floor builds a different tree from the renderer (${wantN} vs ` +
                `${gotN} elements) — every \`dom·*\` row would be tearing down a different job`
        );
    }
    c.remove();
    line(
        `gate teardown-floor: the floor's tree is byte-identical to mountExodraApp — ${gotN} ` +
            `elements, ${got.length} chars, ${INSTANCES} instances retained in removal order`
    );
}

/**
 * THE CONTRACT GATE, AND IT IS THE ONE THIS FILE RESTS ON — falsifier (c), checked rather than
 * argued. Two claims, both structural, both THROWING:
 *
 *   1. THE RENDERER'S TEARDOWN REMOVES NO NODE. Markup before, markup after, byte for byte. If
 *      this fires, every contract label here is wrong: `exodra` would not be `(none, full)`, the
 *      headline would be pairing rows that were told different things, and nothing below may be
 *      read.
 *   2. THE RENDERER'S TEARDOWN REALLY DOES END THE SUBSCRIPTIONS. Proved by DRIVING THE APP: a
 *      real bubbling click on every `.tog` changes the markup while the app is live, and must
 *      change NOTHING after `teardown()`. The listeners are still attached — nothing on the dispose
 *      path removes one; `disposeExoChildSelf` runs disposers and that is all — so the click still
 *      reaches the handler and still writes the card's state. Only a dead subscription can make the
 *      DOM sit still. Without this check, a teardown that ended nothing would be the fastest row.
 */
function gateRendererContract(): void {
    const c = el();
    const app = mountExodraApp(c);

    const live = markupOf(c);
    clickAll(c, '.tog');
    const afterClick = markupOf(c);
    if (afterClick === live) {
        c.remove();
        throw new Error(
            'teardown-floor: clicking every `.tog` on a LIVE app changed nothing, so the ' +
                'subscription check below cannot distinguish a working teardown from a broken ' +
                'one. The app or the harness is not driving the renderer at all.'
        );
    }
    clickAll(c, '.tog');
    const restored = markupOf(c);
    if (restored !== live) {
        c.remove();
        throw new Error(
            'teardown-floor: two rounds of clicks did not restore the app byte for byte, so the ' +
                'markup comparison across `teardown()` below would be measuring drift and not ' +
                'the teardown'
        );
    }

    const before = markupOf(c);
    app.teardown();
    const after = markupOf(c);
    if (after !== before) {
        let at = 0;
        while (at < before.length && at < after.length && before[at] === after[at]) at++;
        c.remove();
        throw new Error(
            'teardown-floor: FALSIFIER (c) FIRED — `mountExodraApp(c).teardown()` CHANGED the ' +
                `DOM (first difference at char ${at}). This file's entire contract scheme is ` +
                'built on that call doing no DOM work, read off `exoTeardownScope.ts`, ' +
                '`EXO_DOM_NODE_VOCABULARY.ts` and `createExoDomChildFactory.ts`. Every label, every pair ' +
                'and every headline below is wrong and the axis must be rewritten, not re-run.'
        );
    }

    clickAll(c, '.tog');
    const afterDeadClick = markupOf(c);
    const dead = afterDeadClick === after;
    c.remove();
    if (!dead) {
        throw new Error(
            'teardown-floor: after `teardown()` a click on `.tog` STILL updated the DOM, so the ' +
                'subscriptions are live and the `exodra` row is not on the `full` contract it ' +
                'claims. Comparing it to `book·flat` would be comparing a program that released ' +
                'everything against one that released nothing.'
        );
    }
    line(
        `gate teardown-floor: the renderer's teardown is (dom: none, book: full) — PROVED. It ` +
            `left all ${ELEMENTS} elements in the document byte for byte, and a real bubbling ` +
            `click on all ${CARD_N} toggles afterwards moved nothing, where the same click on a ` +
            'live app moves the markup and a second click restores it.'
    );
}

/** Every `detach` program must leave the container empty and connected; `drop` must not. */
function gateEndStates(): void {
    for (const p of PROGRAMS) {
        if (p.dom === 'none') continue;
        const before = document.body.childElementCount;
        const s = p.prep();
        s.measure();
        // The container is whatever the program was handed; find it as the last child the prep
        // attached, which `el()` appends to `document.body`.
        const attached = document.body.childElementCount;
        if (p.dom === 'drop') {
            if (attached !== before) {
                throw new Error(
                    `teardown-floor: "${p.name}" declares the \`drop\` contract but the ` +
                        'container is still in the document afterwards'
                );
            }
        } else {
            if (attached !== before + 1) {
                throw new Error(
                    `teardown-floor: "${p.name}" declares the \`detach\` contract but its ` +
                        'container is no longer in the document — that is `drop`, and the two ' +
                        'are not comparable'
                );
            }
            // AND IT MUST ACTUALLY BE EMPTY. Without this half the gate would pass a `detach`
            // program that did nothing at all, which is the cheapest program imaginable and would
            // have become the floor. `el()` appends to `document.body`, so the container the prep
            // built is the last element in it.
            const container = document.body.lastElementChild;
            if (container === null || container.childElementCount !== 0) {
                throw new Error(
                    `teardown-floor: "${p.name}" declares the \`detach\` contract but left ` +
                        `${container === null ? 'no container' : container.childElementCount} ` +
                        'child elements behind. It did not do the job the other `detach` rows do.'
                );
            }
        }
        s.cleanup();
    }
    line(
        'gate teardown-floor: every `detach` program leaves its container in the document and ' +
            'every `drop` program takes it out — the two contracts are what their labels say'
    );
}

/**
 * BOTH `run·N·*` SPELLINGS LEAVE THE IDENTICAL SURVIVORS, ON A FRESH SUBJECT PER LENGTH, BEFORE
 * ANYTHING IS TIMED. Neither `dom`/`book` contract this axis already checks describes what these
 * rows leave behind (the container stays attached WITH SURVIVORS STILL IN IT), so this is the
 * proof the section header promises in place of `gateEndStates`: for every length in `RUN_LENGTHS`,
 * both `removeRunPerChild` and `removeRunByRange` run on their own fresh `buildRunOrder(len)`
 * subject, and the two containers must end with the same `data-i` ids, in the same order — the
 * `RUN_SURVIVORS` before the run's old position and the `RUN_SURVIVORS` after it, and nothing else.
 */
function gateRunFamily(): void {
    for (const len of RUN_LENGTHS) {
        const bySpelling: Record<'drop' | 'range', string[]> = { drop: [], range: [] };
        for (const spelling of ['drop', 'range'] as const) {
            const subject = buildRunOrder(len);
            (spelling === 'drop' ? removeRunPerChild : removeRunByRange)(subject);
            bySpelling[spelling] = Array.from(subject.container.children).map(
                (survivor) => survivor.getAttribute('data-i') as string
            );
            subject.container.remove();
        }
        const drop = bySpelling.drop;
        const range = bySpelling.range;
        const survivorCount = RUN_SURVIVORS * 2;
        if (drop.length !== survivorCount || range.length !== survivorCount) {
            throw new Error(
                `teardown-floor: "run·${len}" left ${drop.length} (drop) / ${range.length} ` +
                    `(range) survivors, wanted ${survivorCount} on both — one of the two ` +
                    'spellings removed the wrong number of elements'
            );
        }
        for (let i = 0; i < survivorCount; i++) {
            if (drop[i] !== range[i]) {
                throw new Error(
                    `teardown-floor: "run·${len}" survivors disagree at position ${i}: drop left ` +
                        `"${drop[i]}", range left "${range[i]}" — the two spellings do not remove ` +
                        'the same run from the same tree'
                );
            }
        }
    }
    line(
        `gate teardown-floor: run·drop and run·range agree on the survivors, at every length in ` +
            `{${RUN_LENGTHS.join(', ')}} — both remove exactly the run and nothing standing ` +
            'beside it'
    );
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — `mount-floor`'s, which copied it from `teardown-phases`, which copied it
// from `toggle`, where the clamp made a whole axis print the timer thirteen times.
// ---------------------------------------------------------------------------------------

function observeTimerQuantum(): number {
    let smallest = Infinity;
    for (let s = 0; s < 100; s++) {
        const t0 = performance.now();
        let t1 = performance.now();
        while (t1 === t0) t1 = performance.now();
        const step = t1 - t0;
        if (step > 0 && step < smallest) smallest = step;
    }
    return smallest === Infinity ? 0.1 : smallest;
}

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

// ---------------------------------------------------------------------------------------
// THE RUNNER — `mount-floor`'s, which is `abBench`'s sampling with a repetition factor per phase
// and the SERIES handed back rather than the medians, because this run reports differences and
// ratios and a null needs the round-to-round scatter that a difference of medians cannot show.
// ---------------------------------------------------------------------------------------

interface Stat {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
}

function stat(xs: number[]): Stat {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    return { min: s[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: s[s.length - 1] };
}

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

/** The JS heap, when the engine exposes it (`--enable-precise-memory-info`, which the runner passes). */
function heapBytes(): number | undefined {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem === undefined ? undefined : mem.usedJSHeapSize;
}

interface Phase {
    readonly name: string;
    readonly reps: number;
    readonly what: string;
    readonly prep: () => Scenario;
    /**
     * WHETHER THIS PHASE'S HEAP DELTA IS WORTH RECORDING — true only for the cycle rows, where it
     * is the instrument check that says whether a collection happened INSIDE the timed region.
     * Sampled outside the region, so it perturbs nothing.
     */
    readonly watchHeap: boolean;
}

/**
 * WHERE THE SHORT ARM ENDS, as a divisor of the region's cycle count.
 *
 * The heap check is a SLOPE between two points of ONE region — `H(N)` and `H(N/4)` — because the
 * quantity `H` measures is `C + R·N` and only the difference removes `C`. Four is chosen so the
 * span between the arms is three quarters of the region: the widest denominator that still leaves
 * the short arm long enough to have provoked whatever collection behaviour the region has. It is
 * NOT a threshold and nothing about the verdict depends on its value — halving or doubling it
 * changes the estimator's noise and not its expected value, which is the property the old
 * growth ÷ cycles check did not have.
 */
const HEAP_ARM_DIVISOR = 4;

interface Sample {
    readonly ms: number;
    /** `H(N)` − the region's whole heap growth. A DIAGNOSTIC. It is dominated by a fixed offset. */
    readonly heapDelta: number | undefined;
    /** `H(N/HEAP_ARM_DIVISOR)` − the same growth measured at the short arm. */
    readonly heapArm: number | undefined;
    /** `(H(N) − H(N/4)) / (N − N/4)` in BYTES PER CYCLE. THIS is what the check refuses on. */
    readonly heapSlope: number | undefined;
    /** The heap was seen to FALL between the two arms — a collection observed, not inferred. */
    readonly collected: boolean | undefined;
}

function sampleOnce(phase: Phase): Sample {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    gcIfPossible();

    // THE UNWATCHED PATH IS THE ORIGINAL, LINE FOR LINE, AND THAT IS DELIBERATE. Every Table-1 row
    // runs it. The watched path below takes two extra `performance.now()` readings, and charging
    // even one of those to a row whose region is a millisecond would move a Table-1 figure for a
    // reason that has nothing to do with the program. No Table-1 row goes near it.
    if (!phase.watchHeap) {
        const t0 = performance.now();
        for (let b = 0; b < reps; b++) scenarios[b].measure();
        const dt = performance.now() - t0;
        for (let b = 0; b < reps; b++) scenarios[b].cleanup();
        return {
            ms: dt / reps,
            heapDelta: undefined,
            heapArm: undefined,
            heapSlope: undefined,
            collected: undefined,
        };
    }

    // THE WATCHED PATH — THREE HEAP READINGS ACROSS ONE UNINTERRUPTED REGION.
    //
    // The middle reading is taken WITH THE CLOCK STOPPED: the region's reported time is the sum of
    // the two loop spans and contains no `heapBytes()` call, so the slope costs the timings this
    // table reports exactly nothing. And the region is still ONE run of `reps` cycles with no GC
    // inside it — nothing between the two loops allocates, collects or yields, and `heapBytes()`
    // is a property read on `performance.memory`, not a measurement that provokes a collection.
    // `min` OUTERMOST so the span can never be zero: at the degenerate `reps === 1` the arm is 0 and
    // the "slope" is the whole region, which is the honest reading of a region with one cycle in it.
    const arm = Math.min(reps - 1, Math.max(1, Math.floor(reps / HEAP_ARM_DIVISOR)));
    const before = heapBytes();
    const t0 = performance.now();
    for (let b = 0; b < arm; b++) scenarios[b].measure();
    const tArm = performance.now();
    const mid = heapBytes();
    const t1 = performance.now();
    for (let b = arm; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t1 + (tArm - t0);
    const after = heapBytes();
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();

    if (before === undefined || mid === undefined || after === undefined) {
        return {
            ms: dt / reps,
            heapDelta: undefined,
            heapArm: undefined,
            heapSlope: undefined,
            collected: undefined,
        };
    }
    const span = reps - arm;
    return {
        ms: dt / reps,
        heapDelta: after - before,
        heapArm: mid - before,
        // `C` cancels: ((C + R·reps) − (C + R·arm)) / (reps − arm) = R, at every `reps`.
        heapSlope: (after - mid) / span,
        // A FALLING HEAP IS THE ONLY DIRECT IN-PAGE EVIDENCE OF A COLLECTION. Nothing but a
        // collector can take `usedJSHeapSize` DOWN across three quarters of a region.
        collected: after < mid,
    };
}

interface Series {
    readonly ms: number[];
    readonly heap: number[];
    readonly heapArm: number[];
    readonly slope: number[];
    readonly collected: boolean[];
}

function runPhases(phases: readonly Phase[], rounds: number): Map<string, Series> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);

    const times = new Map<string, Series>();
    for (const p of phases)
        times.set(p.name, { ms: [], heap: [], heapArm: [], slope: [], collected: [] });
    for (let r = 0; r < rounds; r++) {
        const shift = r % phases.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < phases.length; k++) {
            const at = forward
                ? (k + shift) % phases.length
                : (shift + phases.length - 1 - k) % phases.length;
            const p = phases[at];
            const s = sampleOnce(p);
            const series = times.get(p.name) as Series;
            series.ms.push(s.ms);
            if (s.heapDelta !== undefined) series.heap.push(s.heapDelta);
            if (s.heapArm !== undefined) series.heapArm.push(s.heapArm);
            if (s.heapSlope !== undefined) series.slope.push(s.heapSlope);
            if (s.collected !== undefined) series.collected.push(s.collected);
        }
    }
    return times;
}

/**
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO, in two numbers rather than one.
 * `mount-floor`'s, verbatim in shape and for its reason: a difference of two medians is free to
 * cancel and can print `0.0000` while the two halves disagree by ten times that every round.
 */
interface Null {
    readonly bias: number;
    readonly noise: number;
    readonly noiseP75: number;
    readonly worst: number;
    readonly resolution: number;
}

function pairedNull(a: number[], b: number[]): Null {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    for (let r = 0; r < n; r++) diffs[r] = Math.abs(a[r] - b[r]);
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    return {
        bias,
        noise: d.median,
        noiseP75: d.p75,
        worst: d.max,
        resolution: Math.max(bias, d.median),
    };
}

/**
 * TABLE 1'S REPETITIONS PER TIMED REGION, and its binding constraint is MEMORY and not the clock.
 * A repetition of `exodra`, `dom·*` or `both·*` holds one separately mounted 861-element app, and
 * all `reps` of them stand at once — `prep` builds every subject before `t0`, and it must, because
 * a teardown CONSUMES its subject and the second call to one does no work. 40 × batch 2 = 80 apps
 * ≈ 51,000 elements, which is the live set `mount-floor` carries at its own recommended batch.
 *
 * IT IS TABLE 1'S ONLY. It is the base of Table 2's count as well — `cycleReps = reps × cycleMul` —
 * but a cycle row does NOT stand `reps` apps, and the constant no longer claims it does: a cycle
 * builds its subject and drops it inside the ONE call the region times (`CYCLES[].cycle`), so its
 * live set is one app at any count. `CYCLE_REPS_FACTOR` below is that table's own knob and carries
 * the argument in full.
 */
const TEARDOWN_REPS = 40;

/**
 * TABLE 2'S OWN REPETITION FACTOR, ON TOP OF THE BATCH, AND IT IS A SECOND KNOB FOR A REASON THE
 * CODE SETTLES RATHER THAN A PREFERENCE.
 *
 * A cycle phase's `prep` allocates NOTHING — `{ measure: c.cycle, cleanup: NOTHING }` — and every
 * `CYCLES[].cycle` builds its container, uses it and calls `c.remove()` inside the ONE call the
 * region times. The only thing that outlives a cycle is the single `CYCLE_SINK` census the next
 * cycle overwrites. So N cycles in a region hold ONE app at a time whatever N is, where N
 * repetitions of a Table-1 row hold N apps: a teardown consumes its subject, so more repetitions
 * of one require more subjects, and `prep` builds them all before `t0`.
 *
 * WHY 64. Table 2's binding constraint is the HEAP, not the clock: the region must demand more
 * allocation than the young generation holds or V8 collects nothing inside it and the table is
 * Table 1 with a mount attached. The axis has refused exactly that twice — 5.00MB over 80 cycles
 * at batch 2 (it asked for batch 8), then ~9.6 kB per cycle over 1280 cycles at batch 32 (it asked
 * for batch 128, `scripts/run-one-axis.js:589-591`). 64 × the recommended batch 2 × 40 = 5120
 * cycles per region, which is the 40 × 128 the last refusal asked for, bought without standing
 * 5120 apps in Table 1.
 *
 * IT IS NOT A GUARANTEE AND THE HEAP CHECK IS STILL THE AUTHORITY.
 *
 * ~~"Per-cycle retention fell from 62.5 kB to ~9.6 kB between those two runs, so it is not linear~~
 * ~~in the cycle count and 5120 may still refuse. If it does, the refusal now prints the factor the~~
 * ~~observed growth asks for."~~ WITHDRAWN. That reading of the two figures was the defect itself:
 * per-cycle retention "fell" because the growth being divided is a fixed ~11 MB offset that does
 * not scale with N at all, so the ratio falls as 1/N by construction and any large enough factor
 * clears any threshold. Three runs at 64 / 139 / 200 (10.80, 12.68, 10.08 MB — tabulated at THE GC
 * QUESTION in the header) settled it. The refusal no longer computes a factor from the observed
 * growth, because there is no factor that fixes retention; it refuses on a SLOPE across two arms
 * of one region, whose value does not move when this constant does.
 *
 * SO WHAT THIS CONSTANT IS FOR, NOW THAT IT CANNOT BUY A VERDICT: allocation demand, on the chance
 * that a longer region provokes a collection a shorter one did not, and nothing else. 64 is kept
 * because it is the region size the axis's last honest refusal asked for and it costs ~1.3 s per
 * region rather than minutes.
 */
const CYCLE_REPS_FACTOR = 64;

// ---------------------------------------------------------------------------------------

/**
 * @param rounds       samples per phase.
 * @param batch        TABLE 1's repetition factor. Bounded by MEMORY: a `dom·*`/`both·*`/`exodra`
 *                     repetition holds one mounted 861-element app and all of them stand at once.
 * @param cycleFactor  TABLE 2's repetition factor, multiplied ON TOP of `batch`. Bounded by TIME
 *                     only — see `CYCLE_REPS_FACTOR`.
 */
export function benchmarkTeardownFloor(
    rounds = 100,
    batch = 1,
    cycleFactor = CYCLE_REPS_FACTOR
): void {
    const f = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY — four is right for a row that takes a hundredth of a
    // millisecond and wrong for a quantity whose whole job is to be small.
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    const pct = (x: number, of: number): string =>
        of === 0 ? '—' : `${((x / of) * 100).toFixed(1)}%`;
    const verdict = (ok: boolean): string => (ok ? 'HOLDS ' : 'FIRED ');

    const quantum = observeTimerQuantum();
    line(
        `teardown-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    gateCensus();
    gateBookContract();
    gateFloorTree();
    gateRendererContract();
    gateEndStates();
    gateRunFamily();

    line('');
    line("CENSUS — read off the app's spec and the code paths, nothing measured");
    line(
        `  elements in the mounted DOM   ${ELEMENTS}  (1 app + ${DECK_N}×${DECK_ELEMENTS} deck + ` +
            `${CARD_N}×${CARD_ELEMENTS} card + ${DETAILS_N} details + ${TAG_N} tags)`
    );
    line(
        `  instances a mount builds      ${INSTANCES}  (1 app + ${DECK_N} decks + ${CARD_N} cards ` +
            `+ ${DETAILS_N} details + ${TAG_N} tags)`
    );
    line(
        `  reconciled children ports     ${LIST_N}  (2 per card: details + tags. A deck's cards ` +
            "and the shell's decks are c.list — fixed, no source, no order array, no scope entry)"
    );
    line(
        `  live subscriptions            ${SUB_N}  (${CARD_SUB_N} per card + ${DECK_SUB_N} per ` +
            `deck + 1 per tag row)`
    );
    line(
        `  entries in the render scope   ${SCOPE_N}  (a card's ${CARD_SUB_N} + one per list from ` +
            `openChildList, a deck's ${DECK_SUB_N}; the ${TAG_N} row disposers live on the rows)`
    );
    line(
        `  TExoDomChild child records     ${RECORD_N}  (${DETAILS_N} details + ${TAG_N} tags; ` +
            `${ROW_DISPOSER_N} carry one disposer each, ${DETAILS_N} carry null. A card is NOT ` +
            'one — only buildLiveExoChild makes one)'
    );
    line('  registries                    0  — the child record has no registry field');
    line('  nodes the renderer removes    0  — gated above, not asserted');

    // ── TABLE 1: THE SINGLE TEARDOWN ────────────────────────────────────────────────────
    const reps = TEARDOWN_REPS * batch;
    const phases: Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps,
        what: p.what,
        prep: p.prep,
        watchHeap: false,
    }));
    // TABLE 2'S REPETITION FACTOR IS ITS OWN. See `CYCLE_REPS_FACTOR`: a cycle builds and drops its
    // subject INSIDE the timed span, so this multiplies the region's allocation demand — which is
    // the only thing the heap refusal is asking for — and multiplies the live set by nothing.
    // Floored at 1 so a mistyped fourth positional cannot silently empty the table.
    const cycleMul =
        Number.isFinite(cycleFactor) && cycleFactor >= 1
            ? Math.floor(cycleFactor)
            : CYCLE_REPS_FACTOR;
    const cycleReps = reps * cycleMul;
    const cyclePhases: Phase[] = CYCLES.map((c) => ({
        name: c.name,
        reps: cycleReps,
        what: c.what,
        prep: (): Scenario => ({ measure: c.cycle, cleanup: NOTHING }),
        watchHeap: true,
    }));
    const CYCLE_NAMES = new Set(cyclePhases.map((p) => p.name));

    const series = runPhases([...phases, ...cyclePhases], rounds);
    const seriesOf = (name: string): number[] => (series.get(name) as Series).ms;
    const stats = new Map<string, Stat>();
    for (const p of [...phases, ...cyclePhases]) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    // THE SECTION HEADER IS FOR THE RECORDER AND IT IS NOT DECORATION. `run-one-axis.js`
    // qualifies every recorded row with the last `── NAME —` line it saw, so an axis that prints
    // TWO tables whose rows could collide has to name its own sections or the recording is
    // ambiguous — and this axis prints `cycle·*` in a second table whose unit is different. Both
    // headers are emitted explicitly so a row lands as `SINGLE/dom·text` and `CYCLE/cycle·drop`
    // rather than inheriting whatever prose line happened to look like a header.
    line('');
    line('── SINGLE — one teardown per repetition, GC forced before every timed region');
    line(
        `TEARDOWN FLOOR — the 80-card app, ${ELEMENTS} elements [ms per teardown] · interleaved ` +
            `· ${rounds} rounds · batch ${batch} · ${reps} teardowns per timed region · GC before ` +
            'every timed region'
    );
    line(
        `  the batch is TABLE 1's knob and it is bounded by MEMORY: a dom·*/both·*/exodra ` +
            `repetition holds one mounted ${ELEMENTS}-element app and all ${reps} stand at once ` +
            `(~${(reps * ELEMENTS).toLocaleString('en-US')} elements). Table 2 has its own ` +
            `factor (×${cycleMul}) and does not pay this.`
    );
    line('                     reps   min      p25      median   p75      max');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(6)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}`
        );
    }
    line('');
    for (const p of PROGRAMS) {
        line(`  ${p.name.padEnd(15)} [${p.dom}/${p.book}] ${p.what}`);
    }

    // ── THE RESOLUTION FLOORS ───────────────────────────────────────────────────────────
    const bookNull = pairedNull(seriesOf('book·flat'), seriesOf('book·twin'));
    const domNull = pairedNull(seriesOf('dom·text'), seriesOf('dom·twin'));
    const resolution = Math.max(bookNull.resolution, domNull.resolution);

    const exodra = median('exodra');
    const bookFlat = median('book·flat');
    const bookUnsub = median('book·unsub');
    const bookClosures = median('book·closures');
    const bookVirtual = median('book·virtual');
    const bookDrop = median('book·drop');
    const domText = median('dom·text');
    const domReplace = median('dom·replace');
    const domRoot = median('dom·root');
    const domCards = median('dom·cards');
    const domNodes = median('dom·nodes');
    const domDrop = median('dom·drop');
    const domTextExo = median('dom·text·exo');
    const bothFloor = median('both·floor');
    const bothExodra = median('both·exodra');
    const scaleSubs = median('scale·subs4');
    const scaleRows = median('scale·rows4');
    const scaleDeep = median('scale·deep4');

    line('');
    line('THE CONTROL — what this run resolved, from two pairs of duplicated declarations');
    line('  null            bias      noise     p75       worst     what it is');
    const nullRow = (name: string, n: Null, what: string): void =>
        line(
            `  ${name.padEnd(14)}${f6(n.bias)}  ${f6(n.noise)}  ${f6(n.noiseP75)}  ` +
                `${f6(n.worst)}  ${what}`
        );
    nullRow('book', bookNull, '|book·flat − book·twin|, true Δ = 0');
    nullRow('dom', domNull, '|dom·text − dom·twin|, true Δ = 0 — THE WEAK ONE');
    line(
        '  THE `dom` NULL IS A LOWER BOUND ON ITSELF, not a resolution. Two declarations of ' +
            '`container.textContent = ""` are one property store written twice; there is nothing ' +
            'in them for two programs to diverge over, so it measures the harness rather than ' +
            'the scatter of two genuinely different DOM programs. `hydrate-floor` carries the ' +
            'same weakness for the same reason and says so too.'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(resolution)} ms = max(bias, noise) over both families, ` +
            `${pct(resolution, exodra)} of the renderer's teardown. Read every figure below ` +
            'against this and not against zero.'
    );

    // ── THE ANSWER, ON THE CONTRACT THE RENDERER ACTUALLY HOLDS ─────────────────────────
    //
    // THE FLOOR IS THE MINIMUM OVER THE ROWS THAT SHARE THE RENDERER'S CONTRACT and is never named
    // in advance: if `book·virtual` came out under `book·flat`, the floor would be `book·virtual`
    // and reaching the release through the record was not the dearer way.
    // `scale·*` ARE EXCLUDED, and not because they are dear. They hold the renderer's contract
    // but over a DIFFERENT CENSUS — four times the subscriptions or four times the records — so
    // they are floors for a job this app does not have, and a `scale` row can never be the
    // cheapest anyway. Naming them out here is what stops a future census from silently making
    // one of them the headline.
    const sameContract = PROGRAMS.filter(
        (p) =>
            p.dom === 'none' &&
            p.book === 'full' &&
            p.name !== 'exodra' &&
            !p.name.startsWith('scale')
    );
    const best = sameContract
        .map((p) => ({ name: p.name, v: median(p.name) }))
        .reduce((a, b) => (b.v < a.v ? b : a));
    const floorMs = best.v;
    const ratio = floorMs === 0 ? Infinity : exodra / floorMs;
    const headroom = exodra === 0 ? 0 : (1 - floorMs / exodra) * 100;

    line('');
    line('THE GAP — every row against the renderer, WITH ITS CONTRACT. Rows of different');
    line('contracts are NOT comparable and the column exists so nobody has to remember which.');
    line('  row               contract        ms        vs exodra   vs floor');
    for (const p of PROGRAMS) {
        const v = median(p.name);
        const rel = exodra === 0 ? '—' : `${(v / exodra).toFixed(3)}×`;
        const same = p.dom === 'none' && p.book === 'full';
        const vsFloor = !same || floorMs === 0 ? '—' : `${(v / floorMs).toFixed(3)}×`;
        line(
            `  ${p.name.padEnd(15)} ${`${p.dom}/${p.book}`.padEnd(14)}  ${f(v)}   ` +
                `${rel.padStart(9)}   ${vsFloor.padStart(8)}`
        );
    }

    line('');
    line(
        `  THE FLOOR IS "${best.name}" at ${f(floorMs)} ms — the cheapest program in this table ` +
            "that holds the renderer's OWN contract (dom: none, book: full): every subscription " +
            `ended, all ${RECORD_N} child records released, no node touched. It is chosen by ` +
            'minimum over that set and by nothing else.'
    );
    if (exodra <= floorMs + resolution) {
        refuse(
            `teardown-floor: NO BOUND FROM THIS ROW — the renderer (${f(exodra)} ms) measured at ` +
                `or below the floor (${f(floorMs)} ms, "${best.name}") inside the resolution ` +
                `floor (${f6(resolution)} ms). A floor a framework can beat is not a floor. ` +
                'Either the floor program is doing work the renderer does not, or this run ' +
                'resolved nothing. The headroom line below may not be quoted.'
        );
    } else {
        line(
            `ANSWER — NO FRAMEWORK CAN BE MORE THAN ${headroom.toFixed(1)}% FASTER THAN ` +
                '@exodra/dom AT TEARING DOWN THIS APP ON THE CONTRACT IT HOLDS: ' +
                `${f(exodra)} ms against ${f(floorMs)} ms (${ratio.toFixed(3)}×) for a ` +
                'straight-line program with no components, no schema, no reactivity, no records ' +
                `and no library that ends the same ${SUB_N} subscriptions and releases the same ` +
                `${RECORD_N} child records. Read it against this run's resolution floor ` +
                `(${f6(resolution)} ms, ${pct(resolution, exodra)}) and against the header's ` +
                '"WHAT THIS AXIS DOES NOT BOUND".'
        );
    }
    line(
        '  AND THE BOUND THAT DOES NOT EXIST, which is the more important half: ON THE `none` ' +
            `BOOKKEEPING CONTRACT THERE IS NO FLOOR AT ALL. "book·drop" is ${f(bookDrop)} ms — ` +
            'ONE STORE — and it makes the entire graph unreachable. Any renderer willing to ' +
            'promise nothing about its own state beats every row here by any margin it likes, ' +
            'and pays for it at a collection that Table 1 provably does not contain. That is ' +
            'what Table 2 exists to price, and it is the only place the two may be compared.'
    );

    // ── THE RUN FAMILY — k×(climb + removeChild) against ONE Range, per length ───────────
    //
    // NEITHER ROW IN THIS TABLE SHARES A CONTRACT WITH ANYTHING ABOVE IT — both are `(none, none)`
    // over a tree this app did not build — so nothing here is read against `exodra`, a `dom·*` row
    // or a `book·*` row. The question is only between the two members of each pair.
    line('');
    line(
        `THE RUN FAMILY — dropExoChild×N vs one Range, identical contiguous run, identical tree, ` +
            `${RUN_SURVIVORS * 2} identical survivors (gated above) [ms per removal]`
    );
    line('  len      drop        range       range/drop   winner');
    let crossoverLen: number | null = null;
    for (const len of RUN_LENGTHS) {
        const dropMs = median(`run·${len}·drop`);
        const rangeMs = median(`run·${len}·range`);
        const winner = rangeMs < dropMs ? 'range' : 'drop';
        if (crossoverLen === null && rangeMs <= dropMs) crossoverLen = len;
        const rel = dropMs === 0 ? '—' : `${(rangeMs / dropMs).toFixed(3)}×`;
        line(
            `  ${String(len).padEnd(8)} ${f(dropMs)}    ${f(rangeMs)}    ${rel.padStart(9)}   ` +
                winner
        );
    }
    line(
        crossoverLen === null
            ? `  NO CROSSOVER OBSERVED in {${RUN_LENGTHS.join(', ')}} — the per-child spelling ` +
                  'won, or tied, at every length this run priced.'
            : `  FIRST CROSSOVER AT LENGTH ${crossoverLen} — the shortest length in this table at ` +
                  `which the Range spelling beat or tied \`dropExoChild\`×N. Read the row above ` +
                  'for whether it held at every longer length priced here too — this line asserts ' +
                  'only the first occurrence, not a trend.'
    );

    // ── THE `detach` FAMILY — the DOM side, answered once ───────────────────────────────
    const oneCall = [domText, domReplace, domRoot];
    const oneCallBest = Math.min(...oneCall);
    const oneCallSpread = Math.max(...oneCall) - oneCallBest;
    line('');
    line('THE `detach` FAMILY — the identical end state, at four call counts');
    line(`  dom·text        ${f(domText)}   1 call    container.textContent = ''`);
    line(`  dom·replace     ${f(domReplace)}   1 call    container.replaceChildren()`);
    line(`  dom·root        ${f(domRoot)}   1 call    appRoot.remove()`);
    line(
        `  dom·cards       ${f(domCards)}   ${INSTANCES - LEAF_N} calls   ${CARD_N} cards, ` +
            `${DECK_N} decks, then the root`
    );
    line(`  dom·nodes       ${f(domNodes)}   ${INSTANCES} calls  every built instance`);
    line(
        `  the three one-call rows spread ${f(oneCallSpread)} ms on a best of ${f(oneCallBest)} ` +
            `(${pct(oneCallSpread, oneCallBest)}), and ${INSTANCES} calls cost ` +
            `${(domNodes / oneCallBest).toFixed(2)}× the cheapest of them. ` +
            (oneCallSpread <= 0.25 * oneCallBest
                ? 'The three land together, so the family has ONE answer and the spelling does ' +
                  'not matter — only the call count does.'
                : 'They SCATTER, so the spelling matters more than the work does, and that is a ' +
                  'finding about Blink rather than about this axis.')
    );
    line(
        `  dom·drop        ${f(domDrop)}   1 call    container.remove() — A DIFFERENT CONTRACT. ` +
            'The tree leaves the document inside the container and stays wholly reachable from ' +
            'it. It is printed here only so its distance from the `detach` rows is visible; it ' +
            'is not a member of this family and must never be quoted as the cheapest way to ' +
            'detach anything.'
    );
    line(
        `  dom·text·exo    ${f(domTextExo)}   ${sign(domTextExo - domText)} vs dom·text — the ` +
            `same one call over a tree the RENDERER built, ${RECORD_N} of whose elements are ` +
            'component roots cloned from compiled prototypes. ' +
            (Math.abs(domTextExo - domText) <= 3 * resolution
                ? "Inside 3× the resolution floor: the floor's tree is the renderer's tree at " +
                  'removal time, and every `dom·*` row above is a bound for both.'
                : "OUTSIDE 3× the resolution floor: the floor's tree is NOT the renderer's tree " +
                  'at removal time, and every `dom·*` row above is a LOWER bound for the ' +
                  'renderer by this much.')
    );

    // ── WHAT THE RENDERER'S TEARDOWN IS MADE OF ─────────────────────────────────────────
    const recordTerm = bookFlat - bookUnsub;
    line('');
    line(
        'THE PIECES — each a difference of two directly measured programs, not a subtraction chain'
    );
    line(
        `  subscriptions        ${f(bookUnsub)}   ${pct(bookUnsub, bookFlat)} of book·flat — ` +
            `${SUB_N} field stores, measured alone`
    );
    line(
        `  record release       ${sign(recordTerm)}   book·flat − book·unsub: ${RECORD_N} record ` +
            `releases (${ROW_DISPOSER_N} of them emptying an array) and ${LIST_N} order clears`
    );
    line(
        `  the call shape       ${sign(
            bookClosures - bookFlat
        )}   book·closures − book·flat: the ` +
            `same counts reached through a ${SCOPE_N}-entry scope instead of three straight loops, ` +
            'plus the one unread `unmount` field both call rows carry'
    );
    line(
        `  the virtual dispatch ${sign(bookVirtual - bookClosures)}   book·virtual − ` +
            `book·closures: ${RECORD_N} record releases reached as order[i].unmount() instead of ` +
            'written out in the list loop. Monomorphic on both sides, identical end state'
    );
    line(
        `  the renderer's own    ${sign(exodra - bookFlat)}   exodra − book·flat: ${SCOPE_N} ` +
            `closure calls, ${RECORD_N} virtual unmount dispatches, ${ROW_DISPOSER_N} row ` +
            'disposers, over a floor that walks three flat arrays'
    );
    line(
        `  both contracts        floor ${f(bothFloor)} · exodra ${f(bothExodra)} · ` +
            `${sign(bothExodra - bothFloor)} — release AND detach, which is what a route change ` +
            'actually wants. Both rows are `(detach, full)` and they ARE comparable.'
    );

    // ── SCALE — one row per hypothesis ──────────────────────────────────────────────────
    const subsTerm = scaleSubs - bookFlat;
    const rowsTerm = scaleRows - bookFlat;
    const depthTerm = scaleDeep - bookFlat;
    line('');
    line(
        'SCALE — which term is teardown a function of? Each row is book·flat with ONE thing changed'
    );
    line(
        `  scale·subs4     ${f(scaleSubs)}   ${sign(subsTerm)}   ${SUB_N * 4} subscriptions ` +
            `instead of ${SUB_N} (+${SUB_N * 3}), everything else identical`
    );
    line(
        `  scale·rows4     ${f(scaleRows)}   ${sign(rowsTerm)}   ${RECORD_N * 4} records / ` +
            `${LIST_N * 4} orders (+3× each)`
    );
    line(
        `  scale·deep4     ${f(scaleDeep)}   ${sign(depthTerm)}   THE IDENTICAL census, reached ` +
            'through 4 levels of nested disposer arrays instead of flat loops'
    );
    line(
        `  per added subscription  ${f6(subsTerm / (SUB_N * 3))} ms · per added record ` +
            `${f6(rowsTerm / (RECORD_N * 3))} ms — ` +
            (rowsTerm > subsTerm
                ? 'THE RECORD IS THE DEARER ITEM, so teardown is a function of how many CHILDREN ' +
                  'a view built and not of how many sources it reads.'
                : 'THE SUBSCRIPTION IS THE DEARER ITEM, which is the opposite of what this file ' +
                  'predicted and means the record release is nearly free.')
    );
    line(
        `  depth costs ${sign(depthTerm)} = ${(Math.abs(depthTerm) / resolution).toFixed(1)}× ` +
            'the resolution floor. ' +
            (Math.abs(depthTerm) <= 3 * resolution
                ? 'NESTING IS FREE at this census: the cost is in the count, and a component ' +
                  "tree four levels deep tears down for the same price as this app's two."
                : 'NESTING IS NOT FREE: the dispatch chain costs real time, and a deep component ' +
                  'tree is dearer to tear down than a flat one holding the same records.')
    );

    // ── TABLE 2: THE CYCLE — THE HONEST ONE ─────────────────────────────────────────────
    line('');
    line('── CYCLE — one complete mount+teardown+drop per repetition, NO GC inside the region');
    line(
        `THE CYCLE — mount → teardown → drop, ${cycleReps} complete cycles per timed region, NO ` +
            'GC INSIDE. [ms per cycle] · this table is NOT comparable to the one above: it ' +
            'contains a whole mount, and it contains whatever V8 collected to keep going.'
    );
    line(
        `  ${cycleReps} = ${TEARDOWN_REPS} × batch ${batch} × CYCLE FACTOR ${cycleMul} (the ` +
            "fourth positional). THIS TABLE'S KNOB IS ITS OWN and it is bounded by TIME, not " +
            'memory: a cycle builds its subject and drops it INSIDE the timed span, so a region ' +
            'of any length holds ONE app at a time. Table 1 above ran at ' +
            `${reps} reps and is NOT affected by this factor.`
    );
    line('                     reps   min      p25      median   p75      max');
    for (const p of cyclePhases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(6)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}`
        );
    }
    line('');
    for (const c of CYCLES) line(`  ${c.name.padEnd(15)} ${c.what}`);

    const cycleDrop = median('cycle·drop');
    const cycleFloor = median('cycle·floor');
    const cycleExodra = median('cycle·exodra');
    const releaseCost = cycleFloor - cycleDrop;
    line('');
    line(
        `  the price of releasing by hand  ${sign(releaseCost)} ms per cycle ` +
            '(cycle·floor − cycle·drop) — the identical allocation demand, differing only by ' +
            'whether the census is released before it is dropped. ' +
            (releaseCost > resolution
                ? 'RELEASING COSTS MORE THAN IT SAVES even with the collector inside the ' +
                  'measurement: a generational collector reclaims a dead graph without visiting ' +
                  'it, and an explicit release visits every object in it.'
                : releaseCost < -resolution
                ? 'RELEASING PAYS FOR ITSELF AT THE COLLECTOR — the explicit release is CHEAPER ' +
                  'per cycle than leaving the graph to be found. That kills the "a teardown that ' +
                  'drops the root is free" argument, which is what `participants/exodra/app.tsx` leans on.'
                : "UNRESOLVED at this run's floor — raise `rounds` before reading it either way.")
    );
    line(
        `  the renderer per cycle          ${f(cycleExodra)} ms · ` +
            `${sign(cycleExodra - cycleFloor)} vs cycle·floor · ` +
            `${sign(cycleExodra - cycleDrop)} vs cycle·drop. Most of a cycle is the MOUNT ` +
            '(`mount-floor` measures that half); what this row adds is that the teardown half is ' +
            'priced with its deferred bill attached.'
    );

    // THE SINK IS READ HERE, and reading it is the check. `cycle·drop` builds a census it uses
    // for nothing, and an allocation whose result never escapes is one V8 may scalar-replace or
    // elide — which would leave the row measuring a program that never allocated the thing it is
    // supposed to be dropping. A non-null sink is evidence the census outlived its cycle.
    if (CYCLE_SINK === null) {
        refuse(
            'teardown-floor: the cycle sink is empty after the run, so nothing proves the two ' +
                'floor cycle rows allocated the census they claim to drop. `cycle·drop` and ' +
                '`cycle·floor` cannot be compared.'
        );
    }

    // ── THE INSTRUMENT CHECK ON TABLE 2, AND IT IS THE ONE THAT SAYS WHETHER THE TABLE DID ITS JOB.
    //
    // ~~WITHDRAWN, STRUCK IN PLACE. What this once was:~~
    //
    //     ~~const grewWithoutCollecting = heapDrop > cycleReps * 1024;~~
    //     ~~// A region of N cycles that collected nothing grows by roughly N apps' worth of~~
    //     ~~// garbage. One app is ~641 elements plus its records; a conservative floor for "a~~
    //     ~~// whole run's worth" is 1 kB per cycle, an order of magnitude under a real app's~~
    //     ~~// footprint.~~
    //
    // IT WAS A QUESTION ABOUT THE FOURTH POSITIONAL WEARING THE COSTUME OF A QUESTION ABOUT THE
    // CODE, and three runs of this axis on disk are what settled it:
    //
    //     factor   cycles/region   heap growth   growth ÷ cycles   verdict
    //     64        5,120          10.80 MB      2.16 kB           REFUSED  `.gate/teardown-floor.cycle64.json`
    //     139      11,120          12.68 MB      1.17 kB           REFUSED  `.gate/teardown-floor.cycle139.json`
    //     200      16,000          10.08 MB      0.65 kB           PASSED   `measurements/teardown-floor.cycle200.json`
    //
    // THE NUMERATOR IS FLAT IN N. 10.80 → 12.68 → 10.08 MB across a 3.1× range of cycle count. A
    // genuine 2.16 kB per cycle would have put the factor-200 region at 33.8 MB; it came in at
    // 10.08, and the factor-64 region — the one that REFUSED — held MORE bytes than the one that
    // passed. So what the check divided is a FIXED OFFSET (the nursery's fill at the sample
    // instant, plus whatever the forced pre-region GC did not reach), the ratio was eleven
    // megabytes over N, and the threshold was cleared by growing the denominator. The check's own
    // printed remedy — "raise THE CYCLE FACTOR" — was simultaneously the way to defeat it.
    //
    // ── WHAT REPLACED IT, AND WHY NO KNOB REACHES IT ────────────────────────────────────────
    //
    // Write a region's growth as `H(n) = C + R·n`. `C` is the offset above; `R` is the retention
    // per cycle, which is the only thing this check was ever about. `sampleOnce` now reads the heap
    // at three points of ONE region — start, the end of the first quarter, and the end — with the
    // clock stopped across the middle read, and reports
    //
    //     R̂ = (H(N) − H(N/4)) / (N − N/4)
    //
    // `C` CANCELS ALGEBRAICALLY, not statistically: both arms come from the same region in the same
    // round with the same heap history, so the offset is literally the same number subtracted from
    // itself. AND THE KNOB CANNOT SATISFY IT — raising the cycle factor scales the numerator's span
    // and the denominator by the identical multiple, so R̂'s expected value is `R` whatever `N` is.
    // A bigger factor buys a bigger denominator against the same arm noise: PRECISION, NOT A PASS.
    // That is the whole difference from the withdrawn form, where `R̂_old = (C + R·N)/N → R` only
    // as N → ∞ and reached the threshold long before it reached the truth.
    //
    // WHAT WAS WEIGHED AND NOT TAKEN, since one of these was nearly chosen:
    //
    //   ASK V8 DIRECTLY. NOTHING AVAILABLE TO A PAGE CAN ANSWER IT, enumerated rather than
    //   asserted: `performance.memory` exposes three sizes and no collection counter;
    //   `PerformanceObserver` has no `gc` entry type in a page (that is Node's `perf_hooks`);
    //   `measureUserAgentSpecificMemory()` is async, gated on cross-origin isolation, and FORCES a
    //   collection, which destroys the thing it was called to observe; `--expose-gc` hands over
    //   `gc()` and no counter. A `FinalizationRegistry` reports a collection on a LATER task and
    //   can never say "inside this region". So the answer is no, and the slope is what is left.
    //
    //   REFUSE ON THE ABSOLUTE, threshold from the census (elements × record size). It is immune to
    //   the knob in the right direction — a longer region makes an absolute bar HARDER, not easier
    //   — but it refuses on `C`, and `C` is ~11 MB against a census whose whole app is ~861
    //   elements plus 240 records. It would be red at every factor forever, and a check that can
    //   never pass is a check that gets read past.
    //
    //   SAMPLE INSIDE THE REGION SO A COLLECTION IS OBSERVED RATHER THAN INFERRED. TAKEN, but as
    //   evidence and not as the refusal: `H(N) < H(N/4)` means the heap FELL across three quarters
    //   of the region, and nothing but a collector can do that. It is printed whenever it holds.
    //   It cannot be the gate, because its absence proves nothing — a region can collect steadily
    //   and still end higher than its quarter mark — so the slope refuses and the dip corroborates.
    const heapOf = (name: string): number | undefined => {
        const h = (series.get(name) as Series).heap;
        return h.length === 0 ? undefined : stat(h).median;
    };
    const heapDrop = heapOf('cycle·drop');
    const heapFloor = heapOf('cycle·floor');
    const heapExodra = heapOf('cycle·exodra');
    const dropSeries = series.get('cycle·drop') as Series;
    const armDrop = dropSeries.heapArm.length === 0 ? undefined : stat(dropSeries.heapArm).median;
    const slopeDrop = dropSeries.slope.length === 0 ? undefined : stat(dropSeries.slope).median;
    const dipRounds = dropSeries.collected.reduce((n, c) => n + (c ? 1 : 0), 0);
    if (heapDrop === undefined) {
        refuse(
            'teardown-floor: `performance.memory` is not exposed, so this run cannot tell ' +
                'whether a collection happened inside the cycle regions. Table 2 may still be ' +
                'read as timings, but its whole claim — that the deferred cost is inside the ' +
                'measurement — is UNVERIFIED. Launch Chromium with --enable-precise-memory-info ' +
                '(scripts/run-one-axis.js already passes it).'
        );
    } else {
        const mb = (x: number | undefined): string =>
            x === undefined ? '—' : `${(x / 1048576).toFixed(2)}MB`;
        const kb = (x: number | undefined): string =>
            x === undefined ? '—' : `${(x / 1024).toFixed(3)} kB`;
        // THE SAME EXPRESSION `sampleOnce` USED, `min` outermost and all, so the printed arm is the
        // arm that was measured and not a second opinion about where it should have been.
        const armReps = Math.min(
            cycleReps - 1,
            Math.max(1, Math.floor(cycleReps / HEAP_ARM_DIVISOR))
        );
        const spanReps = Math.max(1, cycleReps - armReps);
        line(
            `  heap across one cycle region    drop ${mb(heapDrop)} · floor ${mb(heapFloor)} · ` +
                `exodra ${mb(heapExodra)}, over ${cycleReps} cycles, sampled OUTSIDE the timed ` +
                'region. THIS IS A DIAGNOSTIC AND NOT THE CHECK — it is dominated by a fixed ' +
                'offset that does not scale with the cycle count, so dividing it by the cycle ' +
                `count (${kb(
                    heapDrop / cycleReps
                )} "per cycle") states the fourth positional and ` +
                'not the code. The three runs that settled that are tabulated in the source above.'
        );
        line(
            `  retention per cycle, AS A SLOPE ${kb(slopeDrop)} — ` +
                `roughly (${mb(heapDrop)} at ${cycleReps} cycles − ${mb(armDrop)} at ${armReps}) ` +
                `÷ ${spanReps} cycles. Both arms are the SAME region in the SAME round, so the ` +
                'fixed offset cancels exactly, and the cycle factor scales the span and the ' +
                "denominator together — this number's expected value does not move with the knob. " +
                'ROUGHLY, because the slope is the MEDIAN OF THE PER-ROUND SLOPES and the two ' +
                'figures beside it are the medians of their own series: pairing the arms within a ' +
                'round is what cancels the offset, so dividing the two printed medians is an ' +
                'approximation of this number and not its definition.'
        );
        line(
            `  collection observed inside      ${dipRounds}/${dropSeries.collected.length} ` +
                'rounds had the heap FALL between the two arms, which nothing but a collector can ' +
                'do. It is corroboration and not the gate: a region can collect steadily and ' +
                'still end above its quarter mark, so its absence proves nothing either way.'
        );
        // ONE kB PER CYCLE, unchanged as a bar and now applied to a quantity the bar means
        // something about: `R̂` is bytes RETAINED per cycle, and an app this size is ~861 elements
        // plus 240 records, so 1 kB is an order of magnitude under one cycle's leavings.
        const retaining = slopeDrop === undefined || slopeDrop > 1024;
        if (retaining) {
            refuse(
                'teardown-floor: the `cycle·drop` region RETAINS ' +
                    `${kb(slopeDrop)} per cycle against a 1.00 kB threshold — measured as the ` +
                    `SLOPE between two arms of one region (${mb(heapDrop)} at ${cycleReps} ` +
                    `cycles against ${mb(armDrop)} at ${armReps}, over ${spanReps} cycles), so ` +
                    'V8 did NOT collect enough inside the timed region and Table 2 has not yet ' +
                    'captured the deferred cost it exists to capture. Its numbers are Table 1 ' +
                    `with a mount attached. The heap fell between the arms in ${dipRounds} of ` +
                    `${dropSeries.collected.length} rounds. ` +
                    'RAISING THE FOURTH POSITIONAL CANNOT CLEAR THIS BY ARITHMETIC, and that is ' +
                    'the point of the slope: it scales its own denominator, where the growth ÷ ' +
                    'cycles check it replaced could be cleared by any large enough factor (see ' +
                    'the source block above for the three runs that proved it). Raising it is ' +
                    'still worth ONE try, because more allocation demand may provoke a collection ' +
                    `that did not happen at ${cycleMul}: \`npm run axis ` +
                    `--workspace=@exodra/benchmarks -- teardown-floor ${rounds} ${batch} ` +
                    `${cycleMul * 2}\`. If the slope comes back the same, the region genuinely ` +
                    'retains and NO factor will fix it. Do not raise the batch instead: ' +
                    `\`cycleReps = ${TEARDOWN_REPS} × batch × factor\`, so a doubled batch buys ` +
                    'this table the exact same region as a doubled factor while standing ' +
                    `${TEARDOWN_REPS * batch * 2} mounted apps in Table 1 to do it.`
            );
        } else {
            line(
                '  the region retains under 1.00 kB per cycle ON THE SLOPE, so V8 collected ' +
                    'INSIDE the timed regions and the deferred cost is in these numbers. It is ' +
                    'still a LOWER bound: a collection V8 defers past the end of a region is ' +
                    "charged to the next region's forced pre-GC, which is untimed."
            );
        }
    }

    // ── THE FALSIFIERS, PRINTED MECHANICALLY ────────────────────────────────────────────
    line('');
    line(
        "THE FALSIFIERS, COMMITTED IN THIS FILE'S HEADER BEFORE THE PROGRAMS WERE WRITTEN. They " +
            'are my predictions from reading the code; I measured none of them. "FIRED" means ' +
            "the prediction was wrong, and three of them are the owner's priors:"
    );
    const ownerHalfOne = domText === 0 ? false : exodra / domText >= 2.0;
    line(
        `  (a) OWNER'S PRIOR I: within 2× of textContent    ${verdict(!ownerHalfOne)}  ` +
            `exodra ${f(exodra)} / dom·text ${f(domText)} = ` +
            `${domText === 0 ? '—' : (exodra / domText).toFixed(3)}× ` +
            '— AND THE COMPARISON IS CROSS-CONTRACT WHICHEVER WAY IT LANDS. `exodra` is ' +
            '(none/full) and `dom·text` is (detach/none); they share no part of the job. This ' +
            'line exists to score the prior as stated, not to license the ratio.'
    );
    const ownerHalfTwo = bookFlat === 0 ? false : bookUnsub / bookFlat < 0.5;
    line(
        `  (b) OWNER'S PRIOR II: subscriptions dominate     ${verdict(!ownerHalfTwo)}  ` +
            `book·unsub ${f(bookUnsub)} is ${pct(bookUnsub, bookFlat)} of book·flat ` +
            `${f(bookFlat)}; the record term is ${sign(recordTerm)} ` +
            `— I predict SUBSCRIPTIONS are the larger term, because there are ${SUB_N} of them ` +
            `against ${RECORD_N} records whose release is one null test and, on ${ROW_DISPOSER_N} ` +
            'of them, one array-length store. The registry that used to make a record the dearer ' +
            'item is not populated by anything.'
    );
    line(
        '  (c) the renderer removes no node                 HOLDS   — checked in a GATE before ' +
            'anything was timed, and the gate THROWS. If it had fired, this table would not ' +
            'have printed at all.'
    );
    const dHolds = cycleDrop <= cycleFloor + resolution;
    line(
        `  (d) dropping beats releasing, GC included        ${verdict(dHolds)}  cycle·drop ` +
            `${f(cycleDrop)} vs cycle·floor ${f(cycleFloor)} (${sign(releaseCost)}) ` +
            '— I predicted the drop wins because a generational collector reclaims a dead graph ' +
            'without visiting it. If it FIRED, explicit release pays for itself at the collector.'
    );
    line(
        `  (e) book·drop is at the resolution floor         ${verdict(
            bookDrop <= 3 * resolution
        )}  ${f(bookDrop)} against 3× ${f6(resolution)} = ${f(3 * resolution)} ` +
            '— it is ONE STORE. If it fired, this instrument cannot resolve the book family and ' +
            'every attribution in it is a range rather than a number.'
    );
    const fOne = oneCallSpread <= 0.25 * oneCallBest;
    const fTwo = oneCallBest === 0 ? false : domNodes / oneCallBest >= 3;
    line(
        `  (f) the detach family is a call ladder           ${verdict(fOne && fTwo)}  spread ` +
            `${f(oneCallSpread)} on ${f(oneCallBest)} (${pct(oneCallSpread, oneCallBest)}, ` +
            `wanted ≤25%) · dom·nodes ${f(domNodes)} = ` +
            `${oneCallBest === 0 ? '—' : (domNodes / oneCallBest).toFixed(2)}× (wanted ≥3×)`
    );
    line(
        `  (g) dom·drop is the cheapest DOM touch           ${verdict(
            domDrop <= 2 * resolution
        )}  ${f(domDrop)} against 2× ${f6(resolution)} = ${f(2 * resolution)} ` +
            '— one remove() of one node. If it fired, removing a node carrying a ' +
            `${ELEMENTS}-element subtree costs something proportional to that subtree, which is ` +
            'a finding about Blink and not about us.'
    );
    const hCount = rowsTerm > subsTerm;
    const hDepth = Math.abs(depthTerm) <= 3 * resolution;
    line(
        `  (h) records, not subs, not depth                 ${verdict(hCount && hDepth)}  rows ` +
            `${sign(rowsTerm)} vs subs ${sign(subsTerm)} (wanted rows > subs) · depth ` +
            `${sign(depthTerm)} = ${(Math.abs(depthTerm) / resolution).toFixed(1)}× the floor ` +
            '(wanted ≤3×)'
    );
    line(
        '  (i) per-child eviction has a price               STRUCK  — it priced 240 Map.delete ' +
            'against 120 Map.clear, and nothing under packages/*/src populates `child.registry`, ' +
            'so this app allocates no registry and evicts nothing. `book·perkey` is gone with it.'
    );
    line(
        `  (k) the renderer's nodes remove no slower        ${verdict(
            Math.abs(domTextExo - domText) <= 3 * resolution
        )}  ${sign(domTextExo - domText)} against 3× ${f6(resolution)} ` +
            `— ${RECORD_N} cloned component roots against a hand-assembled tree. If it fired, ` +
            'every `dom·*` row is a LOWER bound for the renderer by that much.'
    );
    const callShapeStep = bookClosures - bookFlat;
    const dispatchStep = bookVirtual - bookClosures;
    line(
        `  (l) the dispatch is the larger step              ${verdict(
            dispatchStep > callShapeStep
        )}  call shape ${sign(callShapeStep)} (book·closures − book·flat) vs dispatch ` +
            `${sign(dispatchStep)} (book·virtual − book·closures) ` +
            `— THE PRIOR IS THE OWNER'S AND I EXPECTED IT TO FIRE: ${RECORD_N} monomorphic method ` +
            `calls on one hidden class are the case a compiler inlines, where ${SCOPE_N} distinct ` +
            'closures out of an array slot are not. Whichever step is larger is the verdict.'
    );
    line(
        `  (m) the two steps find half the bucket           ${verdict(
            bookVirtual - bookFlat >= 0.5 * (exodra - bookFlat)
        )}  book·virtual − book·flat ${sign(bookVirtual - bookFlat)} against half of ` +
            `exodra − book·flat (${sign(0.5 * (exodra - bookFlat))}) ` +
            '— if it FIRED, what is left belongs to the declaration, the connector, the schema ' +
            'and the wiring, and no row here prices any of them.'
    );
    line(
        `  (n) both steps are resolvable at all             ${verdict(
            callShapeStep > resolution && dispatchStep > resolution
        )}  ${sign(callShapeStep)} and ${sign(dispatchStep)} against ${f6(resolution)} ` +
            '— a step at or under the floor is a RANGE and not a part of the bucket.'
    );
    const sHolds =
        crossoverLen !== null &&
        crossoverLen >= RUN_CROSSOVER_LOW &&
        crossoverLen <= RUN_CROSSOVER_HIGH;
    line(
        `  (s) the run crossover lands in [${RUN_CROSSOVER_LOW}, ${RUN_CROSSOVER_HIGH}]      ` +
            `${verdict(sHolds)}  ` +
            (crossoverLen === null
                ? 'no crossover observed in this table'
                : `first crossover at length ${crossoverLen}`) +
            ` — predicted from the Range's fixed allocation cost against the per-child loop's ` +
            'linear one, neither measured anywhere in this repository before this run.'
    );

    // ── SELF-CHECKS: the ways this run could be lying about its own numbers ──────────────
    if (resolution > Math.abs(exodra - floorMs) * 0.25) {
        refuse(
            `teardown-floor: the null moved by ${f6(resolution)} ms where the whole gap is ` +
                `${f(exodra - floorMs)} ms — this run resolved a quarter of its own subject or ` +
                'worse, so the headroom figure is a range and not a number. Raise `rounds`, or ' +
                'raise the batch.'
        );
    }
    if (bookUnsub > bookFlat + resolution) {
        refuse(
            `teardown-floor: "book·unsub" (${f(bookUnsub)} ms) measured DEARER than "book·flat" ` +
                `(${f(bookFlat)} ms) past the resolution floor, though it runs the first of ` +
                "book·flat's three loops and stops. That is not a cost, it is the instrument — " +
                'raise `rounds` before reading the PIECES section.'
        );
    }
    if (bothFloor < Math.max(bookFlat, domText) - resolution) {
        refuse(
            `teardown-floor: "both·floor" (${f(bothFloor)} ms) measured CHEAPER than the larger ` +
                `of its two halves (book·flat ${f(bookFlat)}, dom·text ${f(domText)}) past the ` +
                'resolution floor, though it runs both of them back to back. The `(detach, full)` ' +
                'pairing cannot be read.'
        );
    }
    // ── THE CLOCK CHECK. THE FLOOR IS UNCHANGED; WHAT CHANGED IS THAT THE REFUSAL NAMES A NUMBER.
    //
    // A row that does not clear `MIN_TICKS` quanta is still refused, on the same bar. But "too
    // fast to read" is not actionable, so each refusal now prints the MULTIPLIER ITS OWN TICKS ASK
    // FOR — `MIN_TICKS × quantum / region`, which is exactly how many times more work that row
    // needed — and then converts it into the knob that row is moved by: the CYCLE FACTOR for a
    // Table-2 row (free of live set), the BATCH for a Table-1 row (paid for in standing apps).
    //
    // AND THE TWO NUMBERS COME OUT OF ONE RUN. A single global batch made the operator run the
    // axis twice — once for the memory-bound table, once for the clock-bound one — and compare
    // readings taken under different conditions. The summary below prints the batch Table 1 needs
    // and the factor Table 2 needs together, as one command line.
    const shortBatch: { name: string; want: number }[] = [];
    const shortCycles: { name: string; want: number }[] = [];
    for (const p of [...phases, ...cyclePhases]) {
        const region = (stats.get(p.name) as Stat).median * p.reps;
        const clockFloor = MIN_TICKS * quantum;
        if (region >= clockFloor) continue;
        const isCycle = CYCLE_NAMES.has(p.name);
        // The multiplier the row's own ticks ask for. `region === 0` means the row never cleared a
        // single tick, so the ratio is undefined and 100× stands in for "far more than this".
        const factor = region > 0 ? clockFloor / region : Infinity;
        const knob = isCycle ? cycleMul : batch;
        const want = Number.isFinite(factor) ? Math.ceil(knob * factor) : knob * 100;
        (isCycle ? shortCycles : shortBatch).push({ name: p.name, want });
        refuse(
            `teardown-floor: the "${p.name}" timed region is ${region.toFixed(3)} ms at ` +
                `${p.reps} reps — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                'quantisation, not measurement. IT NEEDS ' +
                `${Number.isFinite(factor) ? `×${factor.toFixed(1)}` : '×100 or more'} on its ` +
                'repetition factor' +
                (isCycle
                    ? `, which is CYCLE FACTOR ${want} (fourth positional, currently ${cycleMul})` +
                      ' and costs nothing in live set: a cycle builds and drops its subject inside' +
                      ' the timed span, so a region of any length holds ONE app.'
                    : `, which is BATCH ${want} (third positional, currently ${batch}) and IS ` +
                      `PAID FOR IN MEMORY: at batch ${want} a dom·*/both·*/exodra row stands ` +
                      `${TEARDOWN_REPS * want} mounted apps ≈ ` +
                      `${(TEARDOWN_REPS * want * ELEMENTS).toLocaleString('en-US')} elements at ` +
                      'once. A teardown consumes its subject, so more repetitions of one REQUIRE ' +
                      'more subjects — this row cannot be given ticks for free. Raise it and ' +
                      'accept the live set, or read the row as "at the floor" — but never quote ' +
                      `a number taken at batch ${want} beside one taken at batch ${batch}.`)
        );
    }
    if (shortBatch.length > 0 || shortCycles.length > 0) {
        const maxBatch = shortBatch.reduce((m, r) => Math.max(m, r.want), batch);
        const maxCycles = shortCycles.reduce((m, r) => Math.max(m, r.want), cycleMul);
        // THE TWO KNOBS ARE NOT INDEPENDENT IN THIS DIRECTION, AND PRINTING THEM AS IF THEY WERE
        // PRODUCED A COMMAND NOBODY COULD RUN. `cycleReps = TEARDOWN_REPS × batch × cycleMul`, so
        // the batch Table 1 asks for multiplies TABLE 2's region as well. This line used to emit
        // `${maxBatch} ${maxCycles}` verbatim: at batch 2 → 200 with cycle factor 200 that is
        // 40 × 200 × 200 = 1,600,000 cycles per region, ~400 s a region at ~0.25 ms a cycle, three
        // rows, a hundred rounds. So what is held fixed is TABLE 2'S REGION SIZE, and the factor
        // that reproduces it at the new batch is solved for. Table 2 is then the SAME measurement
        // at a different Table 1, which is what "one run, both numbers" was always supposed to mean.
        const wantCycleReps = TEARDOWN_REPS * batch * maxCycles;
        const emitCycles = Math.max(1, Math.round(wantCycleReps / (TEARDOWN_REPS * maxBatch)));
        refuse(
            'teardown-floor: ONE RUN, BOTH NUMBERS — Table 1 needs batch ' +
                `${maxBatch}${
                    shortBatch.length > 0
                        ? ` (its shortest rows: ${shortBatch.map((r) => r.name).join(', ')})`
                        : ' (unchanged: no Table-1 row was short)'
                }, Table 2 needs ${wantCycleReps} cycles per region${
                    shortCycles.length > 0
                        ? ` (${shortCycles.map((r) => r.name).join(', ')})`
                        : ' (unchanged: no cycle row was short)'
                }. Both in one command, so nothing here is ever compared across two runs: ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- teardown-floor ${rounds} ` +
                `${maxBatch} ${emitCycles}\`` +
                (maxBatch > batch
                    ? ` — AND THE FOURTH POSITIONAL IS ${emitCycles} AND NOT ${maxCycles} ON ` +
                      'PURPOSE: the batch multiplies this table too (cycleReps = ' +
                      `${TEARDOWN_REPS} × batch × factor), so ${emitCycles} at batch ${maxBatch} ` +
                      `is the SAME ${wantCycleReps}-cycle region as ${maxCycles} at batch ` +
                      `${batch}. Quoting ${maxCycles} there would ask for ` +
                      `${TEARDOWN_REPS * maxBatch * maxCycles} cycles a region. AND READ THE ` +
                      `HEADER ON MEMORY FIRST: batch ${maxBatch} stands ` +
                      `${TEARDOWN_REPS * maxBatch} mounted apps ≈ ` +
                      `${(TEARDOWN_REPS * maxBatch * ELEMENTS).toLocaleString('en-US')} elements ` +
                      'at once, and this repository has already had a run die of memory pressure.'
                    : '')
        );
    }
}
