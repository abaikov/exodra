// DIAGNOSTIC — HOW MUCH ROOM IS THERE BELOW `@exodra/dom` AT *UPDATING*, AT ALL?
//
// It is `mount-floor`'s sibling and it is written to be read after it. That axis proved a BOUND for
// mounting: a straight-line program with no abstraction of any kind produces the 80-card app's
// byte-identical DOM, so nothing can be more than a measured percentage faster at mounting it.
// This one asks the same question of the other half of a renderer's life, and it is a harder
// question for a reason worth stating before any number appears.
//
// ── WHY THE OBVIOUS CONSTRUCTION DOES NOT WORK ──────────────────────────────────────────────
//
// `mount-floor`'s floor is "the same program without the framework". For an update there is no such
// program: A PROGRAM WITH NO REACTIVITY DOES NOT UPDATE, IT REBUILDS. Take the schemas, the
// bindables and the connector away from the 80-card app and what is left cannot toggle a details
// block — it can only produce the tree again, which is a mount and is already bounded elsewhere.
// `mount-floor`'s own header says exactly this and forbids itself from being quoted about updates.
//
// ── WHAT DOES EXIST: A FLOOR FOR A SPECIFIC TRANSITION ──────────────────────────────────────
//
// Fix a before-state and an after-state. There is a minimum set of DOM operations that takes one to
// the other — a `.data` store, an `insertBefore`, a `remove` — and that set is a fact about the two
// states and the browser, not about anybody's software. A program that performs exactly those
// operations, HAVING BEEN TOLD WHAT CHANGED, is a floor for that transition. This file writes such
// a program for five transitions taken from the axes this suite already publishes, gates every one
// of them byte-for-byte against `@exodra/dom` doing the same transition through its reactive
// machinery, and prints the distance.
//
// ── WHAT THE GAP MEANS, AND IT IS NOT A DEFECT ──────────────────────────────────────────────
//
// THE FLOOR IS HANDED THE DIFF FOR FREE. It is told which row changed, which nodes must move, which
// item was inserted. The framework is handed a new VALUE or a new ARRAY and has to DISCOVER what
// changed, and it has to have kept, since the mount, the bookkeeping that makes discovery possible
// at all — a record per row, a node per port, a subscription per source, an item→row map.
//
// THAT DISCOVERY IS THE FRAMEWORK'S JOB. It is the entire reason anybody installs one. So the gap
// this file prints is not waste: it is THE PRICE OF NOT HAVING TO WRITE THE UPDATE BY HAND, and the
// number says how much the product costs. A reader who wants the floor's number in their own app
// can have it — by writing the floor's program, which means writing every DOM operation of every
// transition their app will ever perform, by hand, and keeping it correct.
//
// ── THE TWO CONTRACTS, AND WHY EVERY COMPARISON IN THIS FILE IS LABELLED WITH ONE ────────────
//
// Because the free diff is the whole asymmetry, a floor and a renderer can only be compared when
// they were told the SAME thing. So every row here declares its CONTRACT and every headline pairs
// rows that share it:
//
//   `told`    handed exactly what changed — a new value, an op, the set of nodes that must move.
//             A WATCHED SCALAR PORT IS TOLD: its source hands it the new value and there is
//             nothing to find. NO LIST ROW IN THIS FILE IS ON THIS CONTRACT: a source's
//             `onChange` carries no argument, so every notification is answered by re-reading
//             `getValue()`.
//   `derive`  handed the new STATE and left to work out the change. This is `reconcileExoOrder`
//             in a transition over the new array, which is what `reconcile` and `list-update`
//             measure, and it is what most application code actually writes.
//
// A `derive` renderer measured against a `told` floor is being charged for the discovery twice —
// once because it does it and once because the floor did not have to. Both numbers are printed,
// the contract-matched one is the headline, and the cross-contract one is printed beside it as the
// WIDER, WEAKER, SAFER bound: no renderer of any contract can beat the cheapest floor here.
//
// ── WHAT THE FLOOR IS ALLOWED TO KNOW, AND WHAT IT IS REFUSED ────────────────────────────────
//
// This is the whole design and it decides whether the file is worth anything. A floor handed a
// precomputed list of DOM calls is not a bound, it is a REPLAY, and it measures `insertBefore`.
//
//   IT MAY KNOW WHICH ROWS CHANGED. That is the diff, handed over, and handing it over is the
//   point. The reorder floor is given a flag per position saying "this one must move", computed at
//   MODULE LOAD from the two orders. The list floor is given the op — `insert at 75`, `remove the
//   last`. The text floor is given the new string.
//
//   IT MAY NOT PRE-BAKE THE DOM CALLS. Nothing outside a timed region ever resolves a node
//   reference, computes an anchor, or records a call to replay. The floor is handed INDICES and
//   FLAGS and it does the rest inside the region: resolve the node from its own table, find the
//   anchor, call `insertBefore`, fix its own bookkeeping.
//
//   IT MUST HOLD ITS REFERENCES THE WAY A RENDERER MUST. `mount-floor` measured retention at
//   +0.0000 ms over 480 references, so there is no excuse for a floor that forgets its nodes: every
//   floor here keeps a flat table of every node a later transition could need, allocated once at
//   setup, and the next transition finds its node through that table.
//
//   IT MAY INDEX THAT TABLE BY A DENSE INTEGER, AND THE FRAMEWORK MAY NOT. The floor's items carry
//   `id: 0..n-1`, so its item→node table is an `Array` and its item→position table is an
//   `Int32Array`. `@exodra/dom` is handed arbitrary objects and must use a `Map`. THAT DIFFERENCE
//   IS INSIDE THE GAP AND IS NAMED RATHER THAN HIDDEN: it is a property of the floor's data, not of
//   its algorithm, and a renderer cannot assume it. A reader who wants it can have it — by writing
//   the floor.
//
// ── THE ASYMMETRY THAT CANNOT BE REMOVED, AND WHERE THIS FILE PUTS IT ────────────────────────
//
// THE FRAMEWORK ALSO RUNS THE SUBSCRIPTION THAT TOLD IT TO UPDATE AT ALL. `setValue` compares,
// loads the lone subscriber and calls it (READ FROM CODE: `shared/createExoBenchSource.ts`); the
// floor is called directly by the loop. That dispatch is INSIDE
// the timed region for `@exodra/dom`, because it is not removable — a renderer nobody can notify is
// not a renderer.
//
// SO IT IS MEASURED RATHER THAN ARGUED ABOUT. Two transitions carry a `floor·bound` row: the
// IDENTICAL floor program, subscribed to the IDENTICAL source, fired by the IDENTICAL
// `setValue` call. `floor·bound − floor` is the price of the dispatch with nothing else in the
// frame, and `exodra / floor·bound` is the ratio with the asymmetry removed. Both are printed. The
// headline uses the plain floor, because a lower floor makes the bound WEAKER and therefore safer;
// the `floor·bound` ratio is the one that answers "what does the abstraction cost once you accept
// that something has to notify it".
//
// ONE THING THE DIFFERENCE CONTAINS BESIDES THE DISPATCH, said out loud: a subscription needs
// something to call, so `floor·bound` also allocates one closure per source where `floor` runs a
// straight loop over flat arrays. The two cannot be separated — there is no way to be notified
// without a callback — so the line is labelled "dispatch AND the closure it calls" and never
// "dispatch".
//
// ── THE FIVE TRANSITIONS, ALL TAKEN FROM AXES THIS SUITE ALREADY PUBLISHES ───────────────────
//
//   `text-one`     ONE text value changes on ONE row of a 1000-row list — `reactive-update`'s app,
//                  one write instead of 1000. The floor is ONE `.data` store. The sharpest possible
//                  case and the one where the framework's overhead is most visible as a ratio.
//   `text-sweep`   ALL 1000 change — `reactive-update`'s sweep exactly. It performs the SAME 20000
//                  writes per timed region that `text-one` does, differing only in how they are
//                  grouped, which is what makes the two ratios comparable as an amortisation curve.
//   `reorder`      200 rows, the same items in a different order — `reconcile`'s shuffle, its own
//                  deterministic generator copied below. The floor is the minimum set of
//                  `insertBefore` moves, and it is built TWICE, told and deriving (see below).
//   `grow-shrink`  a 300-row list gains and loses rows — `list-update`'s insert / append / remove /
//                  remove-last, as a four-op cycle so that the list neither grows without bound nor
//                  ever returns to its start mid-cycle.
//   `wide`         the 10-deck, 80-card app: every deck renames, every details block toggles, every
//                  tag list advances and one user's setting moves — the `app-update` round, 171
//                  state changes in one transition. Where per-update overhead
//                  should amortise if it amortises anywhere.
//
// ── THE REORDER FLOOR IS BUILT TWICE, BECAUSE THE BRIEF HAS TWO DEFENSIBLE ANSWERS ───────────
//
// "May the floor know the minimum move set in advance, or must it compute it?" Both, and they are
// different numbers, so both are built and the difference between them is printed as a quantity in
// its own right — the PRICE OF DISCOVERY, measured on identical DOM work:
//
//   `floor·told`   handed a flag per position (`this one must move`), precomputed at module load
//                  from the two orders. Inside the region: one backward walk, a node lookup per
//                  position, `insertBefore` for the flagged ones, an anchor carried along. It keeps
//                  no order bookkeeping at all, because it is never asked to work anything out.
//                  THIS IS THE MAXIMAL FREE LUNCH and it is not a technique anybody could ship.
//   `floor·diff`   handed only the new array. Inside the region it stamps the survivors, removes
//                  the gone, reads each item's old position out of its own `Int32Array`, computes
//                  the longest increasing subsequence, and then performs THE SAME WALK with the
//                  same moves. It is the cheapest honest hand-written reconciler and it is the row
//                  the `derive` contract is measured against.
//
// ── WHAT IS GATED, AND THE RUN THROWS IF IT IS NOT ──────────────────────────────────────────
//
// Every program of a transition is stepped ONE transition at a time beside `@exodra/dom` doing the
// same one, and the markup is diffed after EVERY step through the same `markupOf` the rest of the
// suite gates with. Not just at the end: three of these transitions are CYCLES that return to their
// starting DOM, and a program that did nothing at all would pass an end-state check. Stepping is
// what makes a no-op fail at step 1.
//
// `wide`'s `exodra·kept` row is gated a THIRD time, and the extra gate is the reason that row is
// allowed to exist: the byte-gate proves it renders the app's markup, and only an IDENTITY check
// can prove it did so by putting the SAME nodes back rather than by rebuilding them. See
// `gateWideKept`, which asserts that and asserts the counterpart on the reference — that `exodra`
// keeps exactly the 80 head tags and rebuilds the other 160.
//
// The `wide` transition is gated TWICE, because its `@exodra/dom` row is not `mountExodraApp`: the
// app's card wire creates its two bindables INSIDE itself, where nothing outside can reach them, so
// driving it means dispatching 160 real clicks through `clickAll` — and
// `participants/floor/app.ts` measured that harness at 42% of an `app-update` round. This file re-declares the card with its state HOISTED so
// the transition can be called directly, and then proves the substitution: the hoisted app is
// mounted beside the real `mountExodraApp`, both are flipped four times — the real one by its own
// `clickAll`, this one by its own loop — and the markup is diffed after every flip.
//
// ── WHAT THIS NUMBER DOES NOT BOUND. Read this before quoting it for anything. ───────────────
//
//  * IT IS FIVE TRANSITIONS ON TWO APPS, ON THIS MACHINE, IN THIS BROWSER. A floor is not
//    scale-invariant and it is not shape-invariant: a transition with more DOM work per dispatch
//    moves every ratio here towards 1, and one with less moves it away.
//  * IT SAYS NOTHING ABOUT MOUNTING (`mount-floor`), TEARDOWN (`teardown-phases`), MEMORY,
//    HYDRATION, OR SSR.
//  * ITS NUMBERS ARE MICROSECONDS, AND THEY ARE NOT `app-update`'s MILLISECONDS — neither the same
//    quantity nor the same unit. Four of the five transitions are fired by writing to a source;
//    that axis is fired by 160 dispatched `MouseEvent`s, which is most of its number.
//
//    THE UNIT IS THIS AXIS ALONE AND THAT IS ON PURPOSE. `sampleOnce` returns
//    `(dt / phase.reps) * 1000`, where `mount-floor.ts:2031`, `ssr-floor.ts:1889` and
//    `hydrate-floor.ts:991` all return `dt / reps` and are MILLISECONDS PER REP. The `* 1000` is
//    the right call for these row sizes and is argued under THE RESOLUTION FLOOR below: `f4` prints
//    four decimals, so in milliseconds a 20 ns floor would print `0.0000` and this axis would have
//    no smallest number at all. Every `unit:` field, every table, every ladder line and every
//    falsifier in this file is MICROSECONDS PER TRANSITION.
//
//    THIS LINE USED TO READ "ITS MILLISECONDS ARE NOT `app-update`'s", AND THAT ONE WORD COST A
//    CATALOGUE. It was the only place in the file that named the wrong unit; the published pages
//    took the heading from the three sibling axes and printed these rows as `median (ms)`, and
//    both documentation gates stayed green because neither of them checks a unit — a gate that
//    compares a published figure against a recorded row compares the digits and never the unit, so
//    every absolute this axis fed into the docs was out by three orders of magnitude while every
//    ratio stayed right, which is what made it survive so long unnoticed.
//    A unit is not prose. Anything here that restates one is changed together
//    with the computation at `sampleOnce`, or it is deleted.
//  * IT DOES NOT BOUND THE OP CONTRACT FOR A REORDER. `floor·told` is a floor for "told the mover
//    set", and no renderer row in this file is handed an op: a source notifies with no argument,
//    and expressing one shuffle as a sequence of index-based moves is a different program from
//    performing one reorder anyway.
//  * THE `derive` FLOOR CAN LOSE, AND IF IT DOES THE RUN SAYS SO INSTEAD OF PRINTING A BOUND.
//    `floor·diff` is ONE general reconciler that stamps, removes, computes a longest increasing
//    subsequence and walks, whatever the change was; `reconcileExoOrder` TRIMS the common head and
//    tail by identity, so a pure tail append, a pure tail shrink and one contiguous middle
//    insert each cost a run of pointer compares and one DOM call with no subsequence computed —
//    which is precisely the shape `grow-shrink` feeds it. If the renderer comes out at or below that
//    floor, the row bounds NOTHING (a floor a framework can beat is not a floor) and the run prints
//    a refusal naming this as the likeliest cause. That result would be a finding about the floor,
//    not about the renderer, and the wider cross-contract bound is what survives it.
//  * `wide`'s EXTRA ROWS BOUND NOTHING AT ALL, and two of them cannot. `floor·record` and
//    `floor·wire` are ATTRIBUTION rows — a program this file already had plus exactly one thing —
//    so each is worth only the DIFFERENCE it was built to price, and a
//    ratio taken off either of them would be a ratio against a program nobody ships. `exodra·kept` is
//    a DIAGNOSTIC that keeps what the reference rebuilds and will measure under the floor.
//    `exodra·twin` is a null. Only the `exodra` row carries the ANSWER, exactly as before.
//  * IT DOES NOT BOUND ANY OTHER RENDERER. No third-party participant is in this file. The claim is
//    about what is left below `@exodra/dom`, which is the same claim for everybody: nothing can be
//    further below the floor than the floor.
//  * IT IS A THROUGHPUT MEASUREMENT. A timed region performs thousands of transitions back to back;
//    a real page performs one and yields. Nothing here reads layout back, so no row pays a forced
//    style recalculation and every row defers the same invalidation to whatever runs next — the
//    same hazard `mount-phases` and `mount-floor` carry, and every row pays it.
//  * `text-one` WRITES THE SAME NODE EVERY TIME, which is the best case a `.data` store can have —
//    one hot node, in cache. `text-sweep` writes a thousand different ones, which is realistic.
//    Both have their own floor beside them, so both ratios are honest; only the ABSOLUTE numbers of
//    the two are not comparable to each other.
//
// ══ SEVEN ROWS AND NINE PREDICTIONS HAVE BEEN STRUCK, AND THIS IS WHAT THEY PRICED ═══════════
//
// THE LIST RECONCILER THEY WERE ALL DIFFERENCES AGAINST IS DELETED. `attach-exo-children.ts` and
// `attachExoList` are gone; `bindList`, `bindChildren`, `bindOne`, `bindMany` and `keyedList` are
// gone as doors on an exonode. A reactive list is now one composition —
// `reconcileExoOrder(c.portChildList(port), shown, want, want, build)` in a transition — which keeps an array mirror of the
// order. It reads no `index` off a child and stamps no `mark`; it trims the common head and tail
// by identity, does an insert-only or remove-only middle in place, and only a middle whose
// survivors changed order gets an item→position `Map` and `getExoSequence`.
//
// SO EVERY ROW THAT PRICED ONE OF THOSE MECHANISMS IS STRUCK RATHER THAN RE-POINTED, because a rung
// aimed at a different algorithm is a number wearing the old label:
//
//   `reorder`  `floor·record` (R1), `floor·seq` (R2), `floor·place` (R3), `floor·registry` (R4),
//              `exodra·children` (R6) — and with them R5, which was the residual of that ladder.
//              THE REORDER GAP IS MEASURED AND UNATTRIBUTED AGAIN, which is where it stood before
//              the rungs were written. `getExoSequence`, which R2 priced, is called by
//              `reconcileExoOrder` again; `placeExoChildren`, which R3 priced, has no caller.
//   `wide`     `floor·registry` (E2) and `exodra·children` (E3), and with them (Q3), (Q4), the
//              registry half of (Q5), (Q8) and (Q10). (Q8) and (Q10) were both differences taken
//              against `exodra·children`, so the only CROSS-CHECK this axis ever had — two
//              independently written programs on one quantity — is gone rather than failed.
//
// WHAT SURVIVES AND WHAT IT NOW NAMES: E1 `floor·record` (the per-child record, still built by
// `createExoDomChildFactory` for every reconciled row), E4 `exodra·kept` (keep-alive, now composed
// as `reconcileExoOrder` over a source whose items ARE the children, with an identity build),
// and E5 `floor·wire` — which called `createExoWiredNode` and now calls `createExoNodeRecord`, the
// function `buildLiveExoChild` itself calls.
//
// EVERY RECORDED NUMBER IS LEFT WHERE IT STANDS. They are what the only recording says about the
// renderer that produced it, and a struck row does not make its past measurement untrue.
//
// ══ WHERE THE COMMITTED PREDICTIONS ACTUALLY STAND — READ THIS BEFORE YOU READ THEM ══════════
//
// EVERY PREDICTION BELOW IS WRITTEN IN THE FUTURE TENSE AND SOME OF THEM HAVE ALREADY FAILED. They
// are left exactly as committed, because a prediction edited after its run is not a prediction. So
// the standing goes here instead, ahead of them, and a reader who quotes a band without meeting
// this block first had to walk past it to do so. THE STRUCK ONES NAMED ABOVE ARE NO LONGER
// EVALUATED BY THE RUN: their text stays, and the run prints a STRUCK line in their place.
//
// ONE RUN IS RECORDED: `measurements/update-floor.published.json`, batch 16. It carries `reorder`
// with FOUR rows, so R1-R6 were UNRUN — not "held", not "failed", unrun — and they are now STRUCK
// unrun, which is the state they will stay in. Everything in this
// block is arithmetic on the medians of that one file, done by reading it. Nothing
// here was measured by me and no axis was executed to write it.
//
// AND IT CARRIES `wide` WITH NINE ROWS, WHERE THIS FILE NOW DECLARES TEN. `exodra·twin·near`,
// `floor·wire` and `floor·twin·far` were added after that recording and `floor·registry` and
// `exodra·children` have since been struck, so (Q7) and (Q9) are
// UNRUN in exactly the sense R1-R6 were, and every `wide` median quoted anywhere in this file —
// 119.5313, 52.3438, 61.7188, 70.3125, 67.1875, 96.0937, 49.2188, 110.1563 — was taken under a
// rotation of NINE phases and not of ten. They are the only figures there are and they are
// quoted as such; a re-run replaces all of them at once. TWO OF THOSE EIGHT NOW BELONG TO NO ROW:
// 67.1875 was `floor·registry` and 96.0937 was `exodra·children`, and the derived difference the
// file used to lean on (`exodra·children − exodra·kept` = 46.8749) is not re-measurable at all.
//
// AND THERE IS NOW A SECOND, HEAVIER REASON THE RECORDING IS NOT COMPARABLE, WHICH APPLIES TO EVERY
// TRANSITION AND NOT ONLY TO `wide`: THE ORDER OF A ROUND HAS CHANGED. `runPhases` used to rotate
// the start of the phase list, which never changed the cyclic order and so gave every phase one
// fixed predecessor for a whole run; it now draws a fresh seeded permutation per round. EVERY
// MEDIAN IN `measurements/update-floor.published.json` WAS TAKEN UNDER THE ROTATION. Every figure
// quoted in this header — the six headline ratios, the falsifier values, Q1-Q10, the 9.3750 µs and
// the 0.0001 µs nulls — belongs to that instrument. None of them may be placed beside a number from
// a run under the new ordering, in a table, a ratio or a sentence. The run prints its ordering in
// its own header (`ORDERING`) so a recording can always be read against the one that produced it.
//
//   THE SIX HEADLINE RATIOS, renderer ÷ the cheapest floor of its own contract:
//     text-one    1.6047×   (0.0828 ÷ 0.0516)      text-sweep  1.5309×   (77.5 ÷ 50.625)
//     reorder     1.6824×   (37.2396 ÷ 22.1354)    wide        2.2836×   (119.5313 ÷ 52.3438)
//     grow-shrink exodraOps 3.3202× (1.2969 ÷ 0.3906) · exodra 0.7786× — UNDER its floor, which
//     the run refuses as a bound, and which the bullet "THE `derive` FLOOR CAN LOSE" above named
//     in advance as a finding about the FLOOR and not about the renderer.
//
//   THE FIRST PREDICTION'S SEVEN FALSIFIERS: FOUR OF THEM FIRED.
//     (a) text-one under 1.5 ................ did not fire — 1.6047×. BUT (P1) COMMITTED TO ≥ 2.0
//         AND 1.6047 IS NOT ≥ 2.0. The falsifier was set looser than the claim, so (a) staying
//         silent is not (P1) holding, and nowhere else in this file says so.
//     (b) sweep differs from one by >25% ..... did not fire — 1.5309 vs 1.6047, a 4.6% spread.
//         (P3) HELD on the number it committed to. It and (P6) are the only two of the seven that
//         survive their own figures, and (P6) cannot be read from the file at all — see (e).
//     (c) wide outside 1.10-1.45 ............ FIRED — 2.2836×. (P4) is out by a factor, and it was
//         the prediction that expected the 86% prior to hold. It did not hold anywhere.
//     (d) discovery under 25% of floor·diff .. FIRED — 3.1250 µs, 14.1%. (P5) is out.
//     (e) exodraOps at or above exodra ...... cannot be settled from the file: it compares
//         +3.4844 µs against a resolution floor whose `noise` term is not recorded in the JSON
//         (only min/p25/median/p75/max are). The `bias` half is 0.0000. Expected to hold, unread.
//     (f) any transition under 1.05 ......... FIRED — grow-shrink/exodra at 0.7786×. (P7) is out.
//         READ IT WITH THE ROW: the same run prints NO BOUND FROM THIS ROW for it and names the
//         cause as the FLOOR's missing fast paths, so (f)'s own gloss — "@exodra/dom is AT the
//         floor and there is nothing left to take" — is not what happened. (f) is left as
//         committed and mechanical; this note is what it needs read beside it.
//     (g) text-one vs floor·bound under 1.6 .. FIRED — 1.2680×. (P2) is out.
//
//   SO THE SENTENCE "THE FIRST PREDICTION HELD ON ALL OF THEM", WHICH USED TO OPEN THE SECOND
//   PREDICTION BELOW, WAS FALSE. Two of seven falsifiers stayed silent, one is unreadable, four
//   fired, and (P1) missed its own committed number while its falsifier let it through.
//
//   THE SECOND PREDICTION (Q1-Q6): TWO OF THE SIX FAILED.
//     (Q1) FAILED. `floor·record − floor` = 70.3125 − 52.3438 = 17.9687 µs, 179.7 ns over the 100
//          records the census counts — above the committed 4-16 µs band, on the DEAR side. The
//          mechanical check at the end of the run tests both ends of that band and prints FAILED;
//          nothing else in the file acknowledged it until this block.
//     (Q2) held — 17.9687 ≥ 5.
//     (Q3) held — `floor·registry − floor` = 14.8437 µs, inside 4-20, 33.7 ns per Map operation.
//     (Q4) held on its number — façade 23.4376 vs registry 14.8437 = 1.58×, inside a factor of
//          two. AND THE SAME RUN REFUSED THAT DIFFERENCE AS UNQUOTABLE: the renderer-scale null
//          |exodra − exodra·twin| has a bias of 119.5313 − 110.1563 = 9.3750 µs, so the
//          attribution bar is at least 4 × 9.3750 = 37.5 µs and 23.4376 does not clear it. The
//          cross-check this file calls the one it most wants tested was answered by a run that
//          could not resolve it. It needs a batch above 16 before it says anything.
//     (Q5) held — 70.3125 ≥ 17.9687 + 14.8437.
//     (Q6) FAILED, and it failed on the half the mechanical check was not testing until this
//          audit. It predicted `exodra·kept` BELOW `floor` and ABOVE `floor·bound`. Below the
//          floor held (49.2188 < 52.3438); above `floor·bound` did not (49.2188 < 61.7188, by
//          −12.5000 µs). The check evaluated `wLeft > 0` alone, so a run where the first half
//          failed and the second held would have printed HOLDS for a prediction that was out.
//          It now tests both halves. The difference is ALSO under the renderer-scale bar above,
//          so the run refuses it as well.
//
//   WHAT NONE OF THIS SETTLES: the mechanisms. Every band above is a NUMBER, and this file says in
//   its own voice that the three predictions before it held on their numbers and failed on their
//   mechanisms. A fired falsifier says the number was wrong. A silent one does not say the reason
//   was right.
//
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
//
// This is my model. It is JUDGEMENT plus citations; nothing in it was measured by me. It is written
// down first so the run reads as a test of it and not as a story told afterwards.
//
// THE PRIOR I WAS HANDED, AND WHERE I DISAGREE WITH IT. A previous measurement in this repository
// put the DOM write at roughly 86% of the update path, which implies every ratio here should sit
// near 1.16. I EXPECT THAT TO HOLD FOR THE STRUCTURAL TRANSITIONS AND TO FAIL BADLY FOR THE TEXT
// ONES, and the mechanism is what "the DOM write" means in each case. When the write is a clone and
// an `insertBefore`, it is hundreds of nanoseconds of Blink and it really can be 86% of anything
// around it. When the write is `text.data = str` on a node already in cache, it is tens of
// nanoseconds — and the path around it is a `setValue` compare, an indirect call, a `getValue()`, a
// null test, a `String()`, and three identity compares that exist to keep the page alive under a
// translator (READ FROM CODE: `packages/dom/src/dom/setExoText.ts:40-55`). Six or seven
// operations around one cheap store cannot be 14% of it. A prior measured on one shape does not
// transfer to a shape an order of magnitude cheaper, and this axis is precisely the instrument that
// separates them.
//
//   (P1) `text-one`: exodra / floor ≥ 2.0.  MECHANISM: the store is the cheapest thing in the path.
//   (P2) `text-one`: exodra / floor·bound ≥ 1.6 — most of (P1) survives even after the dispatch is
//        given to the floor, because the dispatch is one compare and one call and the rest is not.
//   (P3) `text-sweep`'s ratio lands within 25% of `text-one`'s. PER-UPDATE OVERHEAD DOES NOT
//        AMORTISE IN A FINE-GRAINED RENDERER, because there is nothing to amortise it into: 1000
//        writes are 1000 independent dispatches, with no scheduler, no queue and no flush
//        (`reactive-update`'s header says so, from the code). Amortisation is a property of
//        BATCHING renderers. This is the prediction that disagrees with the brief's expectation
//        that a wide update should show the best ratio, and it is the one I most want tested.
//   (P4) `wide`: exodra / floor lands in 1.10-1.45 — the transition where the prior should hold,
//        because a clone and an `insertBefore` per card is most of both rows.
//   (P5) `reorder`: discovery is real — (floor·diff − floor·told) is at least 25% of floor·diff.
//   (P6) `grow-shrink`: exodraOps < exodra by more than the resolution floor. Being told beats
//        deriving when the derivation is a scan of 300 rows to find one insertion.
//   (P7) NO transition lands under 1.05. If any does, `@exodra/dom` is at the floor for that
//        transition and there is nothing left to take.
//
//   WHAT WOULD PROVE THE MODEL WRONG — printed mechanically at the end of the run so that nobody,
//   including me, gets to choose afterwards; (e) is not printed, because its row is not run:
//     (a) `text-one` under 1.5 — the store dominates its own path, the 86% prior holds even here,
//         and my whole reading of where a text update's time goes is wrong.
//     (b) `text-sweep`'s ratio differs from `text-one`'s by more than 25% — something DOES amortise
//         (or the cold-node sweep is dearer in a way that flatters the framework), and (P3) is out.
//     (c) `wide` outside 1.10-1.45 — below, the renderer is already Blink-bound on the structural
//         path; above, more than a third of a wide update is not the DOM.
//     (d) discovery under 25% of `floor·diff` — the LIS and its five linear passes are cheap
//         against the moves, and "the framework's job is discovery" costs less than it sounds.
//     (e) `exodraOps` at or above `exodra` — being told is NOT cheaper than deriving, which would
//         be a finding about the op path rather than about this axis.
//     (f) any transition under 1.05 — there is no headroom left there at all.
//
// ── THE SECOND PREDICTION, COMMITTED BEFORE THE FIRST RUN OF THE FOUR RUNGS ──────────────────
//
// The first prediction above was about RATIOS. THE SENTENCE THAT USED TO STAND HERE SAID IT "HELD
// ON ALL OF THEM"; four of its seven falsifiers fired on the only recorded run and the standing
// block above itemises which. This one is about WHERE `wide`'s "everything else" goes, and it is a
// harder thing to be right about, because the three predictions this repository has made before all
// HELD on their number and FAILED on their mechanism. So every one below names the mechanism first
// and says what would prove THE MECHANISM wrong, separately from what would prove the number wrong.
//
// THE SIZE OF WHAT IT IS TAKING APART, AND THE NUMBER THAT USED TO STAND HERE. The bucket is
// defined by the `wide` ladder as `exodra − floor·bound` and by nothing else. On the recorded run
// that is 119.5313 − 61.7188 = 57.8125 µs. THIS BLOCK USED TO SAY 54.688 µs, AND NO FILE IN THIS
// REPOSITORY CARRIES THAT NUMBER: it is the figure from the run these four rungs were WRITTEN
// AGAINST, taken before the rungs existed and never recorded, and adding six phases to a
// transition changes the order every median is taken under. So the header predates the
// recording. 57.8125 µs is the quotable figure and 54.688 µs may not be quoted from anywhere —
// including `docs-site/docs/why/what-the-floor-says.md:268`, which still carries it and is not
// this file's to edit. The bands of (Q1)-(Q6) below were committed against the older figure and
// are LEFT AS COMMITTED; where they reference "the residual", read it against 57.8125.
//
// THE PRIOR THIS ONE ARGUES WITH is the reading that accounted for ~49.3 µs of the 54.7 by
// estimating per-unit costs from the code and offered GC as its own guess for the 5-13 µs left
// over. (Both of those figures are against the OLDER, UNRECORDED 54.688; on the recorded run the
// bucket is 57.8125, so that reading's unexplained residual is larger than it said, not smaller.)
// It did not model it, and a residual attributed to the collector is the most convenient possible
// place to put a number nobody measured. E1 is built to take that residual away from it.
//
//   (Q1) `floor·record − floor` lands in 4-16 µs — 40 to 160 ns for one child's record.
//        MECHANISM: MOST OF IT IS THE SYMBOL EXPANDO, not the record literal. V8 sizes an
//        object's in-object property store from the literal that built it, so the record itself is
//        one allocation of a known shape and the empty array is another; but storing the first own
//        property on a FRESHLY CLONED ELEMENT makes the engine give that wrapper a property
//        backing store and move it to a new hidden class, microseconds after creating it. That is
//        the part that has no cheap version.
//        WHAT WOULD PROVE THE NUMBER WRONG: under 4 µs or over 16.
//        WHAT WOULD PROVE THE MECHANISM WRONG: THIS FILE CANNOT, and I am saying so rather than
//        implying otherwise. Separating the expando from the literal needs a fifth rung that
//        allocates the record and does not patch it on; it is not here, so "most of it is the
//        expando" stays MY JUDGEMENT even if (Q1)'s number holds exactly.
//
//   (Q2) `floor·record − floor` ALONE covers the previous reading's unexplained residual — it is
//        at least 5 µs. MECHANISM: the residual belongs to THE RECORD.
//        SAID PRECISELY, BECAUSE THIS IS WHERE IT WOULD BE EASIEST TO OVERCLAIM: E1 does not
//        separate allocating those 200 objects per flip from collecting them, and it cannot — both
//        rows enter their region allocating (the floor clones 100 elements per flip), E1 adds 200
//        more, and any extra scavenge that causes is inside the difference. So (Q2) does NOT say
//        "the residual was allocation and not GC"; it says the residual is the record's, cost of
//        collection included, rather than a general property of the renderer's allocation rate
//        that a reader could go looking for somewhere else.
//        WHAT WOULD PROVE IT WRONG: E1 under 5 µs. Then the residual is still open, and this file
//        does not measure the collector separately either.
//
//   (Q3) STRUCK WITH `floor·registry`. Left as committed; HELD on the one recorded run.
//        `floor·registry − floor` lands in 4-20 µs — 9 to 45 ns per Map operation over the 440 of
//        them. MECHANISM: these are SMALL maps (one to four entries) with mixed key kinds — the
//        tag lists key by object identity, the details lists key by the number 0 — so every
//        operation is a call, a kind test and a hash, and none of it amortises over a table this
//        short. WHAT WOULD PROVE IT WRONG: outside 4-20 µs.
//
//   (Q4) STRUCK WITH BOTH ROWS IT NAMED, AND IT IS THE LOSS WORTH NOTICING: this was the only
//        cross-check in the file, and nothing replaced it. Left as committed, never resolvable.
//        `exodra − exodra·children` lands WITHIN A FACTOR OF TWO of `floor·registry − floor`.
//        MECHANISM: they are the same work. E2 performs the registry traffic on the floor's nodes;
//        E3 removes the same traffic from the real app. If the façade is the registry and nothing
//        else, the two must agree to within what the two closures and the op-kind test add.
//        THIS IS THE ONE I MOST WANT TESTED, because it is the only cross-check in the file where
//        two independently constructed programs measure one quantity — and it is the prediction
//        whose failure would say the most: outside a factor of two, either the façade is doing
//        something the registry does not (the `mapped` buffer, the op translation, the two extra
//        indirections), or E2's Map traffic is not the traffic `attachExoList` performs.
//
//   (Q5) HALF STRUCK — the E2 term is gone, so the run evaluates the weaker `(Q5')`: E4's
//        difference against E1's alone. Left as committed below.
//        `exodra − exodra·kept` ≥ (E1's difference) + (E2's difference). MECHANISM: the record and
//        the registry are both INSIDE what E4 removes, and the clone and the wiring pass are on
//        top of them. WHAT WOULD PROVE IT WRONG: E4's difference smaller than the sum. That would
//        mean one of the three rows is measuring something the other two are not — most likely
//        that E1's expando is dearer on the floor's clone than on the renderer's, which would make
//        E1 an overstatement rather than a measurement.
//
//   (Q6) `exodra·kept` measures BELOW `floor` and ABOVE `floor·bound`. MECHANISM: below the floor
//        because the floor cannot decline to rebuild and this row does; above `floor·bound`
//        because the reconcile, the region anchors and the port indirection are still there after
//        the building stops. WHAT WOULD PROVE IT WRONG: `exodra·kept` at or under `floor·bound` —
//        which would say that once nothing is built or dropped, the whole of the renderer's update
//        path IS the dispatch, and the reconcile is free. That is the most interesting outcome on
//        this axis and it is the one I am predicting against.
//
// ── THE FOURTH PREDICTION — WHETHER `wide` CAN ATTRIBUTE ANYTHING AT ALL ─────────────────────
//
// COMMITTED BEFORE THE FIRST RUN OF THE TWO ROWS BELOW, and written because the standing block at
// the top of this file records a failure of a different kind from the other three. (Q1)-(Q6) were
// wrong or right about NUMBERS. This one is about the INSTRUMENT: on the only recorded run, two of
// `wide`'s five declared attributions were refused by this file's own bar, and the bar is set by a
// null whose true value is zero and which measured 9.3750 µs.
//
// THE ARITHMETIC THAT MAKES THAT A DEFECT RATHER THAN A WIDE ERROR BAR, done by reading
// `measurements/update-floor.published.json` and nothing else:
//
//   `exodra`      min 102.3438  p25 117.1875  median 119.5313  p75 123.4375  max 128.1250
//   `exodra·twin` min 105.4688  p25 108.5938  median 110.1563  p75 113.2813  max 137.5000
//
// THE TWO INTERQUARTILE RANGES DO NOT OVERLAP: `exodra`'s p25 (117.1875) stands ABOVE
// `exodra·twin`'s p75 (113.2813). Taking each row's own IQR as its spread — 6.2500 and 4.6875 —
// the standard error of a median over the 100 rounds that run took is about 0.58 and 0.44 µs, so
// the 9.3750 µs between them is roughly THIRTEEN of those. (Normality and independence assumed;
// the raw per-round series are not in the JSON, so this is the best the recording supports and it
// is labelled as an estimate rather than a measurement.) A pair of programs whose true difference
// is ZERO BY CONSTRUCTION does not separate like that by chance.
//
// AND THE REMEDY THIS FILE PRINTS CANNOT WORK ON IT. The refusal in the self-checks names a batch,
// computed as `batch × (4·null / diff)²` — which is the arithmetic for a null that falls as
// 1/√batch, i.e. for the NOISE half. `resolution` is `max(bias, noise)`, the renderer pair's known
// half IS the bias, and every number in this file is µs PER TRANSITION: multiplying `reps` divides
// the region's cost by the same factor it multiplies it, so a systematic per-transition difference
// comes out of a batch-256 run exactly as large as it came out of a batch-16 one. RAISING THE
// BATCH CANNOT MOVE A BIAS. The operator can type the number the run prints, wait for it, and get
// the same refusal.
//
//   (Q7) THE 9.3750 µs IS POSITIONAL, NOT INTRINSIC — `|exodra − exodra·twin·near|` comes out at
//        or under 2.5 µs, a quarter of it.
//        MECHANISM, READ FROM CODE (`runPhases`) AS IT STOOD WHEN THE RECORDING WAS TAKEN, AND IT
//        NO LONGER STANDS: the rotation was `phases[(k + shift) % length]`, which rotates the START
//        of a rigid cycle and therefore never changes the cyclic ORDER. Every phase in the recorded
//        run had the SAME predecessor in all 100 rounds. THAT IS THE DEFECT AND IT HAS BEEN FIXED —
//        the order is now a fresh seeded permutation per round (`orderForRound`) — so this whole
//        entry describes the instrument that produced the RECORDING and not the one that will
//        produce the next run, and the two sets of numbers may not be mixed. `floor` and
//        `floor·twin` are declared adjacent and their bias is 0.0001 µs; `exodra` and
//        `exodra·twin` are the FIRST and the LAST of this transition's programs — seven phases
//        apart when the recording was taken — and `exodra`'s predecessor is the last row of the
//        previous TRANSITION. So `exodra·twin·near`
//        is a THIRD declaration of the same program, placed immediately after `exodra`, which
//        gives the renderer pair the neighbourhood the floor pair has. Both nulls are taken in
//        the SAME run under the SAME rotation, so the difference between them is the positional
//        effect and nothing else.
//        WHAT THE MECHANISM CANNOT BE, and it is ruled out by reading rather than by guessing:
//        carried-over garbage. `sampleOnce` calls `gcIfPossible` between the setup and the timed
//        region, that function calls `gc()` twice, and the runner launches Chromium with
//        `--js-flags=--expose-gc` (`scripts/run-one-axis.js`, the `chromium.launch` call). Every
//        region starts from a collected heap whoever ran before it.
//        WHAT WOULD PROVE IT WRONG: `|exodra − exodra·twin·near|` at or above 4.6875 µs — half
//        the far pair's. Then two adjacent declarations of the renderer disagree as badly as two
//        distant ones, the renderer scale is UNPAIRABLE on this axis at this batch, and every
//        renderer-scale attribution `wide` declares must be withdrawn rather than re-run: not
//        (Q4) refused pending a batch, but (Q4) refused, full stop, until somebody finds the
//        mechanism. THAT IS THE ANSWER I EXPECT TO BE LEAST WELCOME AND IT IS THE ONE THE ROW IS
//        FOR.
//        AND WHICHEVER WAY IT GOES IT REACHES PAST `wide`, which is why it is worth a phase. IF
//        POSITION MATTERS, then every null in this file is taken on an ADJACENT pair — `floor`
//        and `floor·twin` are declared next to each other in all five transitions — while every
//        attribution it bounds is a difference between rows that are NOT adjacent:
//        `floor·record − floor` is three phases apart in this transition and
//        `floor·registry − floor` is five. A bar measured on the closest pair in the list and
//        applied to differences taken across it is systematically TOO LOW, and it is too low for
//        every rung on every transition here, not only for the two `wide` refused. This row
//        cannot fix that; it can only say whether it is true, and it is the cheapest thing that
//        can. THE FIX IS IN `runPhases` AND HAS SINCE BEEN MADE: the order of a round is a fresh
//        permutation drawn from a seed derived from the round index, which breaks the
//        fixed-predecessor property for every phase in the file at once and gives every ordered
//        pair the same expected treatment. It moves every median in this file, so the recorded run
//        and any run after it are two instruments and may not be quoted together.
//        AND THE ASSUMPTION IS NOW MEASURED RATHER THAN ASSUMED AWAY AT THE MAGNITUDE THAT MATTERS.
//        `exodra·twin·near` tested position at the RENDERER's scale; nothing tested it at the
//        FLOOR's, which is the scale of the bar that bounds the rungs. `wide` now declares
//        `floor·twin·far` — a third declaration of `floor` placed at the far end of the list — and
//        the run prints `|floor − floor·twin·far|` next to `|floor − floor·twin|`. Agreement (both
//        of order 0.0001 µs) says the ordering removed position and a null may be read wherever it
//        is declared. A far null of several µs against a near null of 0.0001 says it did not, and
//        then every rung on every transition here is bounded by the friendliest pair in the list.
//
//   (Q8) STRUCK WITH `exodra·children`. Left as committed, never evaluated by a run.
//        THE ONE RENDERER-SCALE DIFFERENCE ON THIS TRANSITION THAT ALREADY CLEARS ITS OWN BAR IS
//        `exodra·children − exodra·kept`, AND NOTHING PRINTED IT. On the recording it is
//        96.0937 − 49.2188 = 46.8749 µs against a bar of at least 37.5. It needs no new program:
//        both rows have been measured since the rungs were added, and the difference was never
//        declared as an attribution and never appeared in the ladder.
//        MECHANISM: it is BUILD AND DROP with the façade removed from BOTH SIDES. E4's
//        `exodra − exodra·kept` (70.3125) is build and drop PLUS the façade, because `exodra`
//        wires with `bindList` and `exodra·kept` with `bindChildren`; these two are both
//        `bindChildren`, so the façade cancels and what is left is the clone, the component
//        boundary, the record, the disposal and whatever collecting them costs.
//        WHAT WOULD PROVE THE NUMBER WRONG: under 4× the renderer-scale null, or ABOVE
//        `exodra − exodra·kept`. The second would make the façade negative and would say one of
//        the three rows is not measuring what its name claims.
//
//   (Q9) THE COMPONENT BOUNDARY IS 8-20 µs OF IT — `floor·wire − floor·record`, over the 100
//        children this app builds per flip, i.e. 80 to 200 ns per instance.
//        MECHANISM: `floor·wire` is `floor·record` and one thing more, and the one thing is THE
//        SHIPPED FUNCTION rather than an imitation of it — `createExoNodeRecord` out of
//        `@exodra/dom`, over the real `DETAILS` and `TAG` schemas, with the real components. Per
//        instance that is the `component` load and the pass-through call, the `walk.length`
//        and `setters.length` loads with their compare, the one-slot `nodes` array and its store,
//        the walk replay over the schema's `walk`, the `hasAdjacentChildLists` load and three more
//        field stores, then the arming — a `wire` load and null compare, THE WIRE, a
//        `handlers.length` load on a frozen shared empty and an `effects.length` load with a zero
//        compare — and the `EXO_ARMED_INSTANCE.value` publish.
//        THE BAND WAS COMMITTED AGAINST A DIFFERENT BODY. `createExoWiredNode` carried a
//        `plan.depth++`/`frames[depth]` pair, a `try/finally` and a `keptAttrPlaceholders` compare
//        that today's function does not, and today's adds an arming call the old one did not. 8-20
//        µs is left as committed and the first run of the new body is the first test of it.
//        `DETAILS` has no ports at all and its wire is `() => undefined`, so
//        for 40 of the 100 that is the boundary and NOTHING else; `TAG` sets one text port.
//        WHAT WOULD PROVE THE NUMBER WRONG: outside 8-20 µs.
//        WHAT WOULD PROVE THE MECHANISM WRONG: THIS FILE CANNOT SEPARATE THE BOUNDARY FROM THE
//        WIRE, and saying so is the point of naming `DETAILS`' empty wire above — the row prices
//        both together, and only the fact that 40% of its instances have nothing in the wire
//        makes "mostly the boundary" a reading rather than an assumption.
//        WHAT IT IS ALSO NOT CHARGED FOR: `schema.createChild`, `holdExoInstance`, `schema.acquireNode`'s
//        indirection, the reconciler that decides a row is wanted at all, and `dropExoChild`'s
//        parentage climb — which E1 excluded for its own reason and which nothing here has priced.
//        AND ONE THING IT IS CHARGED FOR THAT `floor·record` IS NOT, BESIDES THE CALL: one
//        `TAG_BUILDING` store per tag instance, because a wire reads its item out of that slot by
//        index and the reconciler's build callback is what writes it.
//
//  (Q10) STRUCK WITH `exodra·children`, which was one side of it. Left as committed, never run.
//        THE FLOOR-SIDE CHAIN IS 40-90% OF THE RENDERER-SIDE BUILD-AND-DROP, AND WHAT IS LEFT
//        OVER IS THE CLONE. `floor·wire − floor` is the record and the boundary over the same 100
//        children, added to a program with no renderer in it; `exodra·children − exodra·kept`
//        (Q8) is the same two things taken OUT of the app, plus three more that only the renderer
//        side has.
//        THE THREE, NAMED RATHER THAN LEFT IN A RESIDUAL, because the correspondence is NOT
//        one-to-one and pretending it were is how a cross-check becomes a story: (i) THE CLONE —
//        `exodra·kept` builds nothing, so its side of that difference has no `cloneNode` at all,
//        where `floor` and `floor·wire` both clone and the clone cancels out of the floor's own
//        difference; (ii) the schema resolution `exodra·children`'s `c.createExoNode` performs 100 times a
//        flip and `attachExoList` hoists, already written down above as an understatement of the
//        façade and equally an OVERstatement of this one; (iii) whatever collecting ~200 objects
//        a flip costs, which is on the renderer side of (Q8) and on neither side of the floor's.
//        THE REGISTRY IS IN NEITHER AND MUST NOT BE ADDED TO EITHER: both rows of (Q8) wire with
//        `bindChildren`, which has no registry, so `floor·registry` belongs against `exodra` and
//        not against this pair.
//        WHAT WOULD PROVE IT WRONG: outside 40-90%. Above, the clone and the collection are
//        costing less than a tenth of the build path, which contradicts every mount measurement
//        this repository has taken. Below, either the floor's two rungs do not add — they were
//        measured separately and adding them assumes they do not interact, which this file has
//        never measured — or `exodra·children` is paying for something no rung names.
//        WHAT IT IS NOT: a cross-check of the (Q4) kind. (Q4) put two independently constructed
//        programs on ONE quantity; this puts a floor-side chain against a renderer-side one that
//        contains it plus three named items, so it bounds a SHARE and not a number.
//
//  (Q11) NOT A PREDICTION BUT A CORRECTION, and it needs no row because it is settled by reading.
//        THE REGION ANCHORS ARE NOT IN THIS GAP. The `everything else` ladder line has named them
//        as one of its five components since it was written. `WIDE_CARD`'s two children ports are
//        not siblings — the details port is one of the five children of `.card`, and the tags port
//        is the sole child of `.tags` — and `compileExoDomSchema` sets `hasAdjacentChildLists` only where a
//        port follows another port under the SAME parent. So this schema has no chain,
//        `createExoNodeRecord` stores `null` into the `childLists` slot of the instance's own record
//        (which IS the exonode the wire is handed), `childListEndNode` hands back a
//        plain `Node` for the details port and `null` for the tags port, and no anchor
//        closure is ever built. Per update the anchors cost ONE `typeof` compare on each of the
//        100 insertion paths and nothing else. No rung for them could clear any bar on this
//        transition, which is worth more than a rung: the line has been struck.
//
// ── THE RESOLUTION FLOOR, MEASURED FROM SOMETHING WHOSE TRUE VALUE IS ZERO ──────────────────
//
// EVERY TRANSITION CARRIES ITS OWN NULL, because a null is only a null for the shape it was taken
// on: `floor·twin` is a SECOND, INDEPENDENTLY DECLARED copy of that transition's floor, with its own
// function object, its own inline caches and its own DOM, doing identical work on identical data.
// Its true difference from `floor` is ZERO by construction.
//
// `mount-floor` printed its first null as `0.0000` — below print precision — and then fixed it by
// reporting the PAIRED difference as well as the bias. That fix is inherited here and pushed
// further, because these rows are much smaller than a mount:
//
//   * every number in this file is printed in MICROSECONDS PER TRANSITION, where the three sibling
//     floor axes print MILLISECONDS PER REP (`mount-floor.ts:2031`, `ssr-floor.ts:1631`,
//     `hydrate-floor.ts:991`, all `return dt / reps`, against `sampleOnce`'s
//     `(dt / phase.reps) * 1000` here). THIS IS THE ONLY DIVERGENCE AND IT IS THE WHOLE REASON FOR
//     THE `* 1000`: `f4` prints four decimals, so a 20 ns floor prints `0.0200` here and would
//     print `0.0000` there. Anything copied between these axes carries the unit or it is wrong by
//     a factor of a thousand — which has already happened once, see the header;
//   * the null prints `bias` (the difference of the medians, which is free to cancel), `noise` (the
//     median of the per-round |a−b|, which cannot), its p75 and its worst, and then the resolution
//     as a PERCENTAGE OF THAT TRANSITION'S OWN FLOOR, which is the number that says whether the
//     transition was resolved at all;
//   * the text transitions additionally carry a `loop` control — the identical loop with the DOM
//     write deleted — so that a floor of a few tens of nanoseconds can be read against the cost of
//     iterating at all. The run REFUSES its own attribution when the floor is not clear of it.
//
// ── HOW IT MEASURES ─────────────────────────────────────────────────────────────────────────
//
// `mount-floor`'s runner with ONE structural change. There, a scenario was one mount, so a timed
// region held `reps` scenarios. Here the state SURVIVES a transition, so a sample is: build ONE
// instance (untimed), GC, then run `reps` transitions inside one timed region, then dispose
// (untimed). Every program keeps its own cursor, so `run(1)` twelve times and `run(12)` once do the
// same twelve transitions — which is what lets the gate step a program the runner measures in bulk.
//
// THE LOOP IS INSIDE THE PROGRAM, NOT IN THE RUNNER, and for these row sizes that is not a style
// choice: an indirect call per transition would be a real fraction of a 20 ns floor and would
// flatter every ratio in the file by inflating its denominator. Each program writes its own loop
// over its own cursor, and the `loop` control prices what that loop costs on its own.
//
// Phases are interleaved and the order is RESHUFFLED every round — a fresh permutation seeded from
// the round index, so the run repeats exactly and no pair of programs is measured back to back more
// often than any other (`orderForRound`, and it used to be a rigid rotation, which is why the
// recorded medians are not comparable to a new run); GC runs after every setup and before
// every timed region. THE THIRD POSITIONAL IS THE BATCH AND IT IS HONOURED, as `teardown-phases`'
// and `mount-floor`'s are: it MULTIPLIES every transition's repetition factor, so when the clock
// check refuses a row it names a number the operator can type.
//
//     npm run axis --workspace=@exodra/benchmarks -- update-floor 100 1
//     npm run axis --workspace=@exodra/benchmarks -- update-floor 100 4    # if it refused
//     npm run axis --workspace=@exodra/benchmarks -- update-floor 100 16   # what the rungs need
//                                                                         # — and see below
//
// THE RUNGS NEED BATCH 16 AND THE HEADLINE RATIOS DO NOT. Batch 1 already resolves every ratio in
// the summary table; the rungs are differences of a few µs against a null that measured 0.94 µs at
// batch 16, and at batch 1 the smallest of them would be inside the instrument's own scatter. The
// ATTRIBUTION REFUSAL (`Transition.attributions`, walked in the self-checks) names each of them
// when it is, and prints a batch to type.
//
// BATCH 16 IS NOT ENOUGH FOR EVERY RUNG AND THE RECORDED RUN PROVES IT ON `wide`. AT LEAST TWO of
// `wide`'s five declared attributions were refused at batch 16 by this file's own bar — at least,
// because the JSON stores quantiles and not the `noise` half of the resolution, and noise can only
// raise the bar. One of the two is (Q4), the cross-check this file calls the one it most wants
// tested. The cause is the
// RENDERER-SCALE null: `|exodra − exodra·twin|` has a bias of 119.5313 − 110.1563 = 9.3750 µs on
// the recorded run, which puts the 4× bar at 37.5 µs or worse, so `exodra − exodra·children`
// (23.4376) and `exodra·kept − floor·bound` (−12.5000) both fall under it. THE FLOOR-SCALE NULL IS
// FINE AND THE RENDERER-SCALE ONE IS NOT — two independently declared copies of the same renderer
// program differed by 7.8% of their own median. Anything read against the renderer null needs a
// batch well above 16, and `reorder`'s R5 and R6 are read against a null of exactly that kind that
// has never been taken at all.
//
// `@exodra/core`, `@exodra/list-reconcile` and `@exodra/dom` are resolved to their
// BUILT dists, exactly as every axis resolves them, so `npm run build` at the repo root has to have
// run or the `exodra` rows are last week's renderer. R2 and R3 climb into `@exodra/list-reconcile` and
// not `@exodra/core`: the two shipped passes they swap in call `insertBefore`. The floor programs
// are in this file and go through the dev server's esbuild — one transpiler against another, the
// same asymmetry `mount-floor` states and cannot remove without publishing this file as a package.
import { reconcileExoOrder } from '@exodra/list-reconcile';
import {
    type TExoNode,
    type TExoLive,
    type TExoAttrPort,
    type TExoChildrenPort,
    type TExoEventPort,
    type TExoTextPort,
    wireExoNode,
} from '@exodra/core';
import { exoDomSchemaOf, exoNodeDom, createExoNodeRecord } from '@exodra/dom';
import type { TExoDomMark, TExoDomNode, TExoDomChild, TExoDomPortChildList } from '@exodra/dom';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import {
    DETAILS,
    TAG,
    mountExodraApp,
    writeTagLabel,
    type TExoCardTag,
} from '../../participants/exodra/app';
import type { TExoMachineNode } from '@exodra/core';
import { markupOf } from '../../gates/markup-gate';
import {
    IDX,
    POOL,
    USER_IDX,
    el,
    nextCount,
    startCount,
    startsOpen,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    userNameOf,
    cardUserOf,
    startChars,
    nextChars,
    roundUserOf,
    tagUserOf,
    tagTextOf,
    tagsOfCard,
    DECK_IDX,
    CARDS_PER_DECK,
    deckNameOf,
    startDeckName,
    nextDeckName,
    deckUserOf,
    deckDateOf,
    dateTextOf,
} from '../../shared/todo-spec';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
} from '@exodra/core';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

/** One shared no-op for the whole process — the event ports of the hoisted card. */
const NOOP = (): void => undefined;

/**
 * A prototype, parsed once and LEFT IN THE TEMPLATE CONTENTS OWNER DOCUMENT — which is where
 * `@exodra/dom`'s prototypes live since `importNode` was dropped from its compiler. Ownership is
 * worth ~95 ns per clone on this machine (`import-node-trade` swept it), so a floor that page-owned
 * its prototypes where the renderer does not would be handing the renderer free time on every row
 * it builds inside a timed region.
 */
function protoOf(markup: string): Element {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as Element;
}

/**
 * WHAT AN INSTANCE OF A PROGRAM IS — one mounted app plus the cursor that walks it through the
 * transition cycle.
 *
 * `run(reps)` performs `reps` transitions and leaves the cursor where it stopped, so the gate can
 * step a program one transition at a time through the very same code the runner times in bulk.
 * There is no second, gate-only path: a program cannot be gated through one entry point and
 * measured through another.
 */
interface Instance {
    readonly container: HTMLElement;
    readonly run: (reps: number) => void;
    readonly dispose: () => void;
    /**
     * WHAT THE PROGRAM HOLDS BETWEEN TRANSITIONS — the node table, the order array, the
     * subscriptions. It is a declared field rather than an accident of which variables a closure
     * happens to capture, because retention is a RULE here: `mount-floor` measured it at +0.0000 ms
     * over 480 references, so there is no excuse for a floor that forgets its nodes and would have
     * to search for them again. A row with nothing of its own to keep says so with `null`.
     */
    readonly retained: unknown;
}

/** Which side of the free-diff asymmetry a row sits on. See the header. */
type Contract = 'told' | 'derive' | 'none';

interface Program {
    readonly name: string;
    readonly what: string;
    /**
     * `floor`      a candidate for the floor: minimum DOM work, retained references.
     * `exodra`     the renderer. Eligible to be a SUBJECT — it is what an ANSWER is printed for.
     * `null`       a duplicated declaration whose true difference from its partner is zero.
     * `control`    neither — it does no DOM work at all and exists to price the harness.
     * `rung`       an ATTRIBUTION row: a program this file already has, plus exactly one thing,
     *              read only as a DIFFERENCE against the row it was built from. It is not a floor
     *              (it is dearer than one by construction) and it is not a subject (a bound quoted
     *              off it would be a bound on a program nobody ships), so it appears in the ladder
     *              and in no headline.
     * `diagnostic` a row that does LESS than the reference and produces the reference's markup
     *              anyway, because it kept what the reference rebuilt. It may measure below the
     *              floor and that is not a finding about the floor. Never a bound, never a subject,
     *              never in the summary table — and the run says so where it prints.
     */
    readonly kind: 'floor' | 'exodra' | 'null' | 'control' | 'rung' | 'diagnostic';
    readonly contract: Contract;
    /** Whether its DOM must be byte-identical to the reference's at every step. */
    readonly gated: boolean;
    readonly setup: () => Instance;
}

interface Transition {
    readonly name: string;
    /** What ONE transition is — printed as the unit of every number in its table. */
    readonly unit: string;
    readonly what: string;
    /** Transitions per timed region, before the batch multiplier. */
    readonly reps: number;
    /** How many single steps the gate walks. Must exceed the cycle length to be worth anything. */
    readonly gateSteps: number;
    readonly programs: readonly Program[];
    /**
     * A SECOND NULL, TAKEN AT A DIFFERENT MAGNITUDE — the two row names whose true difference is
     * zero, when the transition carries rows too big for `floor·twin` to say anything about.
     *
     * A null is only a null for the SHAPE AND THE SIZE it was taken on. `|floor − floor·twin|` is
     * the round-to-round scatter of two programs that cost what the floor costs, which is the right
     * thing to read `floor·record − floor` against and the wrong thing to read
     * `exodra − exodra·kept` against. Where a transition has both, it declares both.
     */
    readonly rendererNull?: readonly [string, string];
    /**
     * EVERY DIFFERENCE THIS TRANSITION ASKS TO BE BELIEVED, and which null bounds it.
     *
     * The ladder PRINTS these differences; this list is what the run CHECKS them against. It is a
     * separate declaration on purpose: a ladder line is a string and a string cannot be refused,
     * and a difference of 0.4 µs printed to four places looks exactly as authoritative as one of
     * forty. The self-checks walk this list, compare each difference against four times the null
     * taken at its own scale, and name a batch when it does not clear it.
     */
    readonly attributions?: readonly {
        /** The dearer row. */
        readonly of: string;
        /** The row it is read as a difference from. */
        readonly against: string;
        /** Which null bounds it — the floor pair's, or the renderer pair's. */
        readonly scale: 'floor' | 'renderer';
        /** What the difference is, for the refusal to name. */
        readonly what: string;
    }[];
    /**
     * The lines printed under the table, each a difference of two directly measured rows.
     *
     * The third argument is the RENDERER-SCALE resolution when `rendererNull` is declared, and the
     * floor's own when it is not — so a ladder line about two renderer rows can name the null that
     * actually bounds it.
     */
    readonly ladder: (
        m: (name: string) => number,
        resolution: number,
        rendererResolution: number
    ) => readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE LONGEST INCREASING SUBSEQUENCE, used in two places and written once.
//
// At MODULE LOAD it computes the mover set `floor·told` is handed for free. Inside a timed region
// it is what `floor·diff` pays to work the same set out for itself. Being the same function in
// both places is deliberate: the difference between the two rows must be WHEN the work happens and
// nothing else.
//
// Its buffers are parameters rather than locals so the timed caller can allocate them once at
// setup — a floor uses the cheapest form of everything, and allocating four arrays per reorder
// would be charging the mechanism for something no careful author would write.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Mark the positions that may stay where they are.
 *
 * `seq[i]` is the item's position in the OLD order, or −1 when the item is new (a new node has no
 * old position and can never be a keeper). `keep[i]` is set to 1 for the longest increasing
 * subsequence of the non-negative entries — the maximal set of nodes that are already in the right
 * relative order, so every OTHER position is a node that must move. That is the minimum move set:
 * this is the same family of algorithm `@exodra/dom`, Solid and Marko all run.
 */
function markKeepers(
    seq: Int32Array,
    n: number,
    keep: Uint8Array,
    tails: Int32Array,
    prev: Int32Array
): void {
    keep.fill(0, 0, n);
    let len = 0;
    for (let i = 0; i < n; i++) {
        const v = seq[i];
        if (v < 0) {
            prev[i] = -1;
            continue;
        }
        let lo = 0;
        let hi = len;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (seq[tails[mid]] < v) lo = mid + 1;
            else hi = mid;
        }
        prev[i] = lo > 0 ? tails[lo - 1] : -1;
        tails[lo] = i;
        if (lo === len) len++;
    }
    let k = len > 0 ? tails[len - 1] : -1;
    while (k >= 0) {
        keep[k] = 1;
        k = prev[k];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TRANSITION 1 AND 2 — THE TEXT TRANSITIONS, on `reactive-update`'s app.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const TEXT_NODES = 1000;
/** The row that changes in `text-one`. The middle, so nothing about it is a first or a last. */
const TEXT_AT = 500;

/**
 * The values written, PRECOMPUTED AT MODULE LOAD. Building a string inside a timed region would put
 * string allocation inside every row's number, and consecutive values are always different so that
 * no side can be short-circuited by an equality check it did not earn — `setValue` returns early on
 * an unchanged value (READ FROM CODE: `createExoBindable.ts:61-63`).
 */
const TEXT_VALUES: readonly string[] = Array.from({ length: 64 }, (_, i) => `t${i}`);
/** One precomputed array of 1000 values per sweep step, for the same reason. */
const TEXT_SWEEPS: readonly (readonly string[])[] = Array.from({ length: 8 }, (_s, s) =>
    Array.from({ length: TEXT_NODES }, (_i, i) => `s${s}-${i}`)
);

const TEXT_MARKUP = ((): string => {
    let s = '<div>';
    for (let i = 0; i < TEXT_NODES; i++) s += `<span>v${i}</span>`;
    return s + '</div>';
})();

/**
 * The floor's app, and the reason it is one `innerHTML` rather than a hand-written build.
 *
 * THIS AXIS MEASURES UPDATES. How a floor's initial DOM came to exist is outside every timed region
 * in this file, so it is produced the cheapest and least error-prone way there is, and the
 * REFERENCES — which are the part a floor must genuinely have — are collected by an explicit walk
 * afterwards. `mount-floor` is where the construction itself is the subject.
 */
function buildTextFloor(container: HTMLElement): Text[] {
    container.innerHTML = TEXT_MARKUP;
    const host = container.firstElementChild as Element;
    const texts = new Array<Text>(TEXT_NODES);
    let span = host.firstChild as Node;
    for (let i = 0; i < TEXT_NODES; i++) {
        texts[i] = span.firstChild as Text;
        span = span.nextSibling as Node;
    }
    return texts;
}

/** `reactive-update`'s span, re-declared here: one declaration, one compiled schema, 1000 clones. */
const SPAN_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('span', null, (s) => {
        text = s.textPort();
    });
    return { text };
});
const mSPAN = createExoMachine(SPAN_SCHEMA, {
    createInitialState: (_c: TExoDomNode, source: TExoBenchSource<string>) => source,
});
const SPAN = composeExoMachine(
    mSPAN,
    (m) =>
        withExoTransitions(m, {
            showSpan: (c) => {
                c.text(SPAN_SCHEMA.ports.text, c.state.getValue());
            },
        }),
    (m) => {
        const { showSpan } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showSpan(c);
                return c.state.onChange(() => showSpan(c));
            });
        });
    }
);

/**
 * The shell is built per instance because its wiring names THAT instance's thousand sources — the
 * arrangement `reactive-update` and `reconcile` both use. It is setup, never timed.
 */
function mountTextExodra(
    container: HTMLElement,
    sigs: readonly TExoBenchSource<string>[]
): () => void {
    const HOST_SCHEMA = createExoSchema((b) => {
        let kids!: TExoChildrenPort;
        b.el('div', null, (h) => {
            kids = h.childrenPort();
        });
        return { kids };
    });
    const mHOST = createExoMachine<TExoDomNode>(HOST_SCHEMA, {
        createInitialState: (c) => {
            c.list(HOST_SCHEMA.ports.kids, SPAN, sigs);
        },
    });
    const HOST = mHOST;
    return EXO_BACKEND.render(HOST, container);
}

const textSources = (): TExoBenchSource<string>[] =>
    Array.from({ length: TEXT_NODES }, (_, i) => createExoBenchSource(`v${i}`));

// ── text-one ────────────────────────────────────────────────────────────────────────────────

function textOneExodra(): Instance {
    const c = el();
    const sigs = textSources();
    const dispose = mountTextExodra(c, sigs);
    const target = sigs[TEXT_AT];
    let at = 0;
    return {
        retained: null,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                target.setValue(TEXT_VALUES[k]);
                k = k + 1 === TEXT_VALUES.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

/** THE FLOOR: one `.data` store on a node the program already holds. */
function textOneFloor(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    const target = texts[TEXT_AT];
    let at = 0;
    return {
        // The whole table stays reachable for the life of the instance — a floor that let its node
        // table die would be a floor that could not perform the NEXT transition.
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                target.data = TEXT_VALUES[k];
                k = k + 1 === TEXT_VALUES.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/**
 * THE NULL. A second, independently declared copy of `textOneFloor` — its own function object, its
 * own inline caches, its own DOM, the identical work on the identical data. True Δ = 0.
 *
 * It is duplicated SOURCE rather than a second call to the same function on purpose: calling one
 * function twice would share everything V8 learned about it and would measure a floor far below the
 * one a real pair of programs sits on.
 */
function textOneFloorTwin(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    const target = texts[TEXT_AT];
    let at = 0;
    return {
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                target.data = TEXT_VALUES[k];
                k = k + 1 === TEXT_VALUES.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/**
 * THE FLOOR PLUS THE TRANSLATOR GUARD — the three identity compares `createExoTextSubscriber` makes before
 * it writes (READ FROM CODE: `packages/dom/src/dom/setExoText.ts:43-54`).
 *
 * They are not defensive programming and they are not free: a page translator replaces our Text
 * node with markup of its own, and from that moment a `.data` write lands on a node nobody renders
 * while the page silently stops updating. This row prices the recovery, on its own, with nothing
 * else in the frame — a feature `@exodra/dom` pays for on every write and the bare floor does not
 * have at all.
 */
function textOneFloorGuard(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    const host = texts[TEXT_AT].parentNode as Element;
    let cached: Text | null = texts[TEXT_AT];
    let at = 0;
    return {
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const str = TEXT_VALUES[k];
                if (
                    str !== '' &&
                    cached !== null &&
                    host.firstChild === cached &&
                    cached.nextSibling === null
                ) {
                    cached.data = str;
                } else {
                    host.textContent = str;
                    const made = host.firstChild;
                    cached = made !== null && made.nodeType === 3 ? (made as Text) : null;
                }
                k = k + 1 === TEXT_VALUES.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/**
 * THE FLOOR, SUBSCRIBED — the same `.data` store, reached through the same source and the
 * same `setValue` call the renderer is fired by.
 *
 * `floor·bound − floor` is the dispatch AND the closure it calls, priced with nothing else in the
 * frame; `exodra / floor·bound` is the ratio with the one asymmetry that cannot be removed handed
 * to the floor. It subscribes ALL 1000, not just the one that is written, so the source population
 * and the closure population match the renderer's exactly.
 */
function textOneFloorBound(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    const sigs = textSources();
    const stops = new Array<() => void>(TEXT_NODES);
    for (let i = 0; i < TEXT_NODES; i++) {
        const node = texts[i];
        const sig = sigs[i];
        stops[i] = sig.onChange(() => {
            node.data = sig.getValue();
        });
    }
    const target = sigs[TEXT_AT];
    let at = 0;
    return {
        // The nodes AND the subscriptions: a subscribed floor that dropped either would be a
        // floor that stopped being notified.
        retained: [texts, stops],
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                target.setValue(TEXT_VALUES[k]);
                k = k + 1 === TEXT_VALUES.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => {
            for (let i = 0; i < TEXT_NODES; i++) stops[i]();
            c.remove();
        },
    };
}

/** The sink the control writes into, so that nothing about it can be optimised away. */
const SINK: { v: string } = { v: '' };

/**
 * THE CONTROL — the identical loop with the DOM write deleted. Its true DOM work is ZERO, so it is
 * what the instrument charges for iterating at all, and a floor of a few tens of nanoseconds has to
 * be read against it rather than against zero. NOT eligible to be the floor, and not gated: it
 * changes nothing, on purpose.
 */
function textOneLoop(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    let at = 0;
    return {
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                SINK.v = TEXT_VALUES[k];
                k = k + 1 === TEXT_VALUES.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

// ── text-sweep ──────────────────────────────────────────────────────────────────────────────

function textSweepExodra(): Instance {
    const c = el();
    const sigs = textSources();
    const dispose = mountTextExodra(c, sigs);
    let at = 0;
    return {
        retained: null,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const vs = TEXT_SWEEPS[k];
                for (let i = 0; i < TEXT_NODES; i++) sigs[i].setValue(vs[i]);
                k = k + 1 === TEXT_SWEEPS.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

function textSweepFloor(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    let at = 0;
    return {
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const vs = TEXT_SWEEPS[k];
                for (let i = 0; i < TEXT_NODES; i++) texts[i].data = vs[i];
                k = k + 1 === TEXT_SWEEPS.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/** THE NULL for the sweep — its own declaration, its own DOM. True Δ = 0. */
function textSweepFloorTwin(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    let at = 0;
    return {
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const vs = TEXT_SWEEPS[k];
                for (let i = 0; i < TEXT_NODES; i++) texts[i].data = vs[i];
                k = k + 1 === TEXT_SWEEPS.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

function textSweepFloorBound(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    const sigs = textSources();
    const stops = new Array<() => void>(TEXT_NODES);
    for (let i = 0; i < TEXT_NODES; i++) {
        const node = texts[i];
        const sig = sigs[i];
        stops[i] = sig.onChange(() => {
            node.data = sig.getValue();
        });
    }
    let at = 0;
    return {
        retained: [texts, stops],
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const vs = TEXT_SWEEPS[k];
                for (let i = 0; i < TEXT_NODES; i++) sigs[i].setValue(vs[i]);
                k = k + 1 === TEXT_SWEEPS.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => {
            for (let i = 0; i < TEXT_NODES; i++) stops[i]();
            c.remove();
        },
    };
}

function textSweepLoop(): Instance {
    const c = el();
    const texts = buildTextFloor(c);
    let at = 0;
    return {
        retained: texts,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const vs = TEXT_SWEEPS[k];
                for (let i = 0; i < TEXT_NODES; i++) SINK.v = vs[i];
                k = k + 1 === TEXT_SWEEPS.length ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE LIST APPS — one row component and one hand-written reconciler, shared by `reorder` and
// `grow-shrink` so that the two transitions differ in what happens to the list and in nothing else.
// ═══════════════════════════════════════════════════════════════════════════════════════════

interface TRow {
    readonly id: number;
    readonly text: string;
}

const LI_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', null, (li) => {
        text = li.textPort();
    });
    return { text };
});
/**
 * The row keeps the text it was built with for life, which is what reconciling by identity means:
 * nothing re-wires a row the reconciler merely moved.
 */
const mLI = createExoMachine(LI_SCHEMA, {
    createInitialState: (c: TExoDomNode, row: TRow) => {
        c.text(LI_SCHEMA.ports.text, row.text);
    },
});
const LI = mLI;

/** The `<ul>` shell, built per instance because its wiring names THAT instance's source. */
function mountListExodra(
    container: HTMLElement,
    rows: TExoBenchSource<readonly TRow[]>
): () => void {
    const UL_SCHEMA = createExoSchema((b) => {
        let port!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            port = ul.childrenPort();
        });
        return { rows: port };
    });
    const mUL = createExoMachine(UL_SCHEMA, {
        createInitialState: (c: TExoDomNode) => ({
            kids: (c as TExoDomNode & TExoDomPortChildList).portChildList(UL_SCHEMA.ports.rows),
            shown: [] as TRow[],
        }),
    });
    const UL = composeExoMachine(
        mUL,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const state = c.state;
                    const want = rows.getValue();
                    state.shown = reconcileExoOrder(state.kids, state.shown, want, want, (item) =>
                        wireExoNode(c.createExoNode(LI), item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return rows.onChange(() => showRows(c));
                });
            });
        }
    );
    return EXO_BACKEND.render(UL, container);
}

/** The row prototype a floor clones when it has to build one — template-owned, like the schema's. */
const LI_PROTO = protoOf('<li>x</li>');

function buildFloorRow(item: TRow): Element {
    const li = LI_PROTO.cloneNode(true) as Element;
    (li.firstChild as Text).data = item.text;
    return li;
}

/** The floor's `<ul>`, and the node table it must keep to be able to perform a NEXT transition. */
function buildListFloor(
    container: HTMLElement,
    items: readonly TRow[],
    idSpace: number
): { ul: Element; nodeById: Array<Element | null> } {
    let s = '<ul>';
    for (let i = 0; i < items.length; i++) s += `<li>${items[i].text}</li>`;
    container.innerHTML = s + '</ul>';
    const ul = container.firstElementChild as Element;
    const nodeById = new Array<Element | null>(idSpace).fill(null);
    let n = ul.firstElementChild;
    for (let i = 0; i < items.length; i++) {
        nodeById[items[i].id] = n;
        n = (n as Element).nextElementSibling;
    }
    return { ul, nodeById };
}

/**
 * THE HAND-WRITTEN RECONCILER — the `derive` floor, used by both list transitions.
 *
 * Handed the new array and nothing else, it does what a keyed reconciler must: stamp the survivors,
 * remove what is gone, read each survivor's old position, keep the longest increasing subsequence
 * of those positions in place, build what is new, and insert everything else before its successor
 * in ONE backward walk. That is the same family of algorithm `@exodra/dom` runs, with every piece
 * of bookkeeping a renderer needs and none it does not.
 *
 * IT INDEXES BY A DENSE INTEGER ID WHERE THE RENDERER MUST USE A MAP, and that is stated in the
 * header as part of the gap rather than hidden here: the floor knows its items are numbered 0..n
 * because a hand-written program knows its own data; a renderer is handed arbitrary objects.
 *
 * Every buffer is allocated at SETUP, so a transition allocates nothing but the nodes it builds.
 */
interface ListFloorState {
    readonly ul: Element;
    readonly nodeById: Array<Element | null>;
    readonly curIds: Int32Array;
    curLen: number;
    readonly posById: Int32Array;
    readonly seenById: Int32Array;
    stamp: number;
    readonly seq: Int32Array;
    readonly keep: Uint8Array;
    readonly tails: Int32Array;
    readonly prev: Int32Array;
}

function listFloorState(
    ul: Element,
    nodeById: Array<Element | null>,
    items: readonly TRow[],
    idSpace: number,
    capacity: number
): ListFloorState {
    const posById = new Int32Array(idSpace).fill(-1);
    const curIds = new Int32Array(capacity);
    for (let i = 0; i < items.length; i++) {
        curIds[i] = items[i].id;
        posById[items[i].id] = i;
    }
    return {
        ul,
        nodeById,
        curIds,
        curLen: items.length,
        posById,
        seenById: new Int32Array(idSpace),
        stamp: 0,
        seq: new Int32Array(capacity),
        keep: new Uint8Array(capacity),
        tails: new Int32Array(capacity),
        prev: new Int32Array(capacity),
    };
}

function reconcileFloor(f: ListFloorState, next: readonly TRow[]): void {
    const n = next.length;
    const stamp = ++f.stamp;
    const seen = f.seenById;
    for (let i = 0; i < n; i++) seen[next[i].id] = stamp;
    const cur = f.curIds;
    const nodes = f.nodeById;
    const pos = f.posById;
    for (let j = 0; j < f.curLen; j++) {
        const id = cur[j];
        if (seen[id] !== stamp) {
            (nodes[id] as Element).remove();
            nodes[id] = null;
            pos[id] = -1;
        }
    }
    const seq = f.seq;
    for (let i = 0; i < n; i++) seq[i] = pos[next[i].id];
    markKeepers(seq, n, f.keep, f.tails, f.prev);
    const parent = f.ul;
    const keep = f.keep;
    let anchor: Node | null = null;
    for (let i = n - 1; i >= 0; i--) {
        const item = next[i];
        let node = nodes[item.id];
        if (node === null) {
            node = buildFloorRow(item);
            nodes[item.id] = node;
            parent.insertBefore(node, anchor);
        } else if (keep[i] === 0) {
            parent.insertBefore(node, anchor);
        }
        anchor = node;
    }
    for (let i = 0; i < n; i++) {
        const id = next[i].id;
        cur[i] = id;
        pos[id] = i;
    }
    f.curLen = n;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TRANSITION 3 — `reorder`: 200 rows, the same items in a different order. `reconcile`'s shuffle.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const RE_ROWS = 200;
const RE_STEPS = 8;

/**
 * `reconcile.tsx`'s own shuffle generator, copied rather than imported — that file's module scope
 * pulls in Solid, React and Mikado, and this axis measures none of them. Deterministic, so the
 * mover sets below can be precomputed and every run is comparable to the last.
 */
function shuffledOrder(order: readonly number[], seed: number): number[] {
    const a = order.slice();
    const rot = seed % a.length;
    const b = a.slice(rot).concat(a.slice(0, rot));
    for (let k = 0; k < a.length; k += 7) {
        const j = (k + seed) % a.length;
        const t = b[k];
        b[k] = b[j];
        b[j] = t;
    }
    return b;
}

const RE_IDS: readonly number[] = Array.from({ length: RE_ROWS }, (_, i) => i);
const RE_ITEMS: readonly TRow[] = RE_IDS.map((id) => ({ id, text: `row ${id}` }));
/** Step 0 is the mounted order; the cursor walks 0→1→…→7→0 for as long as a region runs. */
const RE_ORDERS: readonly (readonly number[])[] = Array.from({ length: RE_STEPS }, (_, s) =>
    s === 0 ? RE_IDS.slice() : shuffledOrder(RE_IDS, s)
);
const RE_STATE: readonly (readonly TRow[])[] = RE_ORDERS.map((o) => o.map((i) => RE_ITEMS[i]));

/**
 * THE DIFF, HANDED OVER — one `Uint8Array` per step, computed AT MODULE LOAD, holding 1 at every
 * position of the NEXT order whose node must move. This is the whole of what `floor·told` knows,
 * and it is the strongest form of "told" there is.
 *
 * It is NOT a list of DOM calls: it names positions, not nodes and not anchors. Resolving the node,
 * finding the anchor and calling `insertBefore` all happen inside the timed region, which is the
 * line this file draws between a floor and a replay.
 */
const RE_MOVE: readonly Uint8Array[] = ((): Uint8Array[] => {
    const out: Uint8Array[] = [];
    const seq = new Int32Array(RE_ROWS);
    const keep = new Uint8Array(RE_ROWS);
    const tails = new Int32Array(RE_ROWS);
    const prev = new Int32Array(RE_ROWS);
    const posOf = new Int32Array(RE_ROWS);
    for (let s = 0; s < RE_STEPS; s++) {
        const from = RE_ORDERS[s];
        const to = RE_ORDERS[(s + 1) % RE_STEPS];
        for (let i = 0; i < RE_ROWS; i++) posOf[from[i]] = i;
        for (let i = 0; i < RE_ROWS; i++) seq[i] = posOf[to[i]];
        markKeepers(seq, RE_ROWS, keep, tails, prev);
        const move = new Uint8Array(RE_ROWS);
        for (let i = 0; i < RE_ROWS; i++) move[i] = keep[i] === 1 ? 0 : 1;
        out.push(move);
    }
    return out;
})();

/**
 * THE MINIMUM MOVES, APPLIED — one backward walk, one node lookup per position, an `insertBefore`
 * for the flagged ones, the anchor carried along. Shared by `floor·told` and, in spirit, by
 * `reconcileFloor`'s tail: the two rows must differ in what they had to WORK OUT and in nothing
 * else, so they must not differ in how they move.
 */
function applyMoves(
    parent: Element,
    next: readonly TRow[],
    nodeById: readonly (Element | null)[],
    move: Uint8Array
): void {
    let anchor: Node | null = null;
    for (let i = next.length - 1; i >= 0; i--) {
        const node = nodeById[next[i].id] as Element;
        if (move[i] === 1) parent.insertBefore(node, anchor);
        anchor = node;
    }
}

function reorderExodra(): Instance {
    const c = el();
    const rows = createExoBenchSource<readonly TRow[]>(RE_STATE[0]);
    const dispose = mountListExodra(c, rows);
    let at = 0;
    return {
        retained: null,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                k = k + 1 === RE_STEPS ? 0 : k + 1;
                rows.setValue(RE_STATE[k]);
            }
            at = k;
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

/** TOLD: handed the mover flags. Keeps a node table and no order bookkeeping — it is never asked. */
function reorderFloorTold(): Instance {
    const c = el();
    const { ul, nodeById } = buildListFloor(c, RE_STATE[0], RE_ROWS);
    let at = 0;
    return {
        retained: nodeById,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const move = RE_MOVE[k];
                k = k + 1 === RE_STEPS ? 0 : k + 1;
                applyMoves(ul, RE_STATE[k], nodeById, move);
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/** THE NULL for the reorder family — an independent declaration of `floor·told`. True Δ = 0. */
function reorderFloorToldTwin(): Instance {
    const c = el();
    const { ul, nodeById } = buildListFloor(c, RE_STATE[0], RE_ROWS);
    let at = 0;
    return {
        retained: nodeById,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                const move = RE_MOVE[k];
                k = k + 1 === RE_STEPS ? 0 : k + 1;
                applyMoves(ul, RE_STATE[k], nodeById, move);
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/** DERIVE: handed only the new array, works the mover set out for itself, then moves the same. */
function reorderFloorDiff(): Instance {
    const c = el();
    const { ul, nodeById } = buildListFloor(c, RE_STATE[0], RE_ROWS);
    const f = listFloorState(ul, nodeById, RE_STATE[0], RE_ROWS, RE_ROWS);
    let at = 0;
    return {
        retained: f,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                k = k + 1 === RE_STEPS ? 0 : k + 1;
                reconcileFloor(f, RE_STATE[k]);
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

// STRUCK: the reorder rung ladder R1-R4 (`floor·record`, `floor·seq`, `floor·place`,
// `floor·registry`) priced the storage and the two placement passes of `attach-exo-children.ts`
// plus `attachExoList`'s item→child Map, and that reconciler is deleted — today's list is
// `reconcileExoOrder` over a child list, which reads no `index`, stamps no `mark` and keeps no
// Map, so every rung was a difference against an algorithm nothing runs.

/**
 * THE NULL AT THE RENDERER'S MAGNITUDE, for the reason `wide`'s `exodra·twin` exists.
 *
 * `floor·twin` is a duplicate of `floor·told`, so `|floor·told − floor·twin|` is the scatter of two
 * programs that cost 19 µs — the right null for a difference between two floor-scale rows and the
 * WRONG one for anything read off `exodra`, which costs about twice that. A null is only a null for
 * the size it was taken at.
 *
 * Duplicated SOURCE and not a second call to `reorderExodra`, exactly as every other twin in this
 * file: calling one function twice shares everything V8 learned about it and would measure a floor
 * far below the one a real pair of programs sits on. The setup helpers ARE shared, as
 * `wideExodraTwin` shares `wideState` and `mountWideExodra` — what has to be its own is the loop
 * inside the timed region.
 */
function reorderExodraTwin(): Instance {
    const c = el();
    const rows = createExoBenchSource<readonly TRow[]>(RE_STATE[0]);
    const dispose = mountListExodra(c, rows);
    let at = 0;
    return {
        retained: null,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                k = k + 1 === RE_STEPS ? 0 : k + 1;
                rows.setValue(RE_STATE[k]);
            }
            at = k;
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

// STRUCK: R6 `exodra·children` priced the `bindList` façade — the registry, `remap`'s loop, the
// op-translating closure and the two façade objects — by wiring the same list with `c.bindChildren`
// instead. Both doors are deleted and both spellings are now the one `reconcileExoOrder`, so the
// difference it printed would be zero plus noise under a name that claims a façade.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TRANSITION 4 — `grow-shrink`: a 300-row list gains and loses rows. `list-update`'s ops.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const GS_ROWS = 300;
/** Two ids past the base list, so every floor table stays a dense array. */
const GS_ID_SPACE = GS_ROWS + 2;
const GS_AT = 75;

const GS_BASE: readonly TRow[] = Array.from({ length: GS_ROWS }, (_, i) => ({
    id: i,
    text: `row ${i}`,
}));
const GS_INS: TRow = { id: GS_ROWS, text: 'ins' };
const GS_ADD: TRow = { id: GS_ROWS + 1, text: 'add' };

/**
 * ONE TRANSITION IS ONE OP, and the cycle is four: insert in the middle, append at the tail, remove
 * the one inserted, remove the one appended. The list therefore neither grows without bound nor
 * spends a whole cycle looking like its own starting state — which matters, because the gate steps
 * one op at a time and a program that quietly did nothing would pass a check taken only at the end
 * of a cycle.
 *
 * THE FOUR RESULTING ARRAYS ARE PRECOMPUTED. `list-update` builds them with `data.slice()` inside
 * its timed region, which is the declarative contract's real cost; here they are hoisted, because
 * this axis is comparing against a floor that allocates no array either and an allocation charged
 * to one side only is a difference that is not the subject. It makes the `exodra` row here CHEAPER
 * than the same row on `list-update`, and the two must not be quoted against each other.
 */
const GS_STATE: readonly (readonly TRow[])[] = ((): readonly TRow[][] => {
    const s1 = GS_BASE.slice();
    s1.splice(GS_AT, 0, GS_INS);
    const s2 = s1.slice();
    s2.push(GS_ADD);
    const s3 = s2.slice();
    s3.splice(GS_AT, 1);
    return [s1, s2, s3, GS_BASE.slice()];
})();
/** The index the last op removes: `GS_STATE[2]` has `GS_ROWS + 1` rows, so the tail is at `GS_ROWS`. */
const GS_LAST = GS_ROWS;

function growExodra(): Instance {
    const c = el();
    const rows = createExoBenchSource<readonly TRow[]>(GS_BASE);
    const dispose = mountListExodra(c, rows);
    let at = 0;
    return {
        retained: null,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                rows.setValue(GS_STATE[k]);
                k = k === 3 ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

/**
 * TOLD: handed the op. It keeps its rows in one flat `Element[]` in DOM order and splices it — the
 * bookkeeping an index-addressed list cannot do without, and the same shape Mikado's `dom` array
 * has. The splice at position 75 of 300 moves 225 pointers and is charged here, not hidden.
 */
function growFloorTold(): Instance {
    const c = el();
    const { ul } = buildListFloor(c, GS_BASE, GS_ID_SPACE);
    const order: Element[] = [];
    for (let n = ul.firstElementChild; n !== null; n = n.nextElementSibling) order.push(n);
    let at = 0;
    return {
        retained: order,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                if (k === 0) {
                    const node = buildFloorRow(GS_INS);
                    ul.insertBefore(node, order[GS_AT]);
                    order.splice(GS_AT, 0, node);
                } else if (k === 1) {
                    const node = buildFloorRow(GS_ADD);
                    ul.appendChild(node);
                    order.push(node);
                } else if (k === 2) {
                    order[GS_AT].remove();
                    order.splice(GS_AT, 1);
                } else {
                    (order.pop() as Element).remove();
                }
                k = k === 3 ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/** THE NULL for this family — an independent declaration of `floor·told`. True Δ = 0. */
function growFloorToldTwin(): Instance {
    const c = el();
    const { ul } = buildListFloor(c, GS_BASE, GS_ID_SPACE);
    const order: Element[] = [];
    for (let n = ul.firstElementChild; n !== null; n = n.nextElementSibling) order.push(n);
    let at = 0;
    return {
        retained: order,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                if (k === 0) {
                    const node = buildFloorRow(GS_INS);
                    ul.insertBefore(node, order[GS_AT]);
                    order.splice(GS_AT, 0, node);
                } else if (k === 1) {
                    const node = buildFloorRow(GS_ADD);
                    ul.appendChild(node);
                    order.push(node);
                } else if (k === 2) {
                    order[GS_AT].remove();
                    order.splice(GS_AT, 1);
                } else {
                    (order.pop() as Element).remove();
                }
                k = k === 3 ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

/** DERIVE: handed the new array and left to find the one row that changed, among 300 that did not. */
function growFloorDiff(): Instance {
    const c = el();
    const { ul, nodeById } = buildListFloor(c, GS_BASE, GS_ID_SPACE);
    const f = listFloorState(ul, nodeById, GS_BASE, GS_ID_SPACE, GS_ROWS + 2);
    let at = 0;
    return {
        retained: f,
        container: c,
        run: (reps) => {
            let k = at;
            for (let r = 0; r < reps; r++) {
                reconcileFloor(f, GS_STATE[k]);
                k = k === 3 ? 0 : k + 1;
            }
            at = k;
        },
        dispose: () => c.remove(),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TRANSITION 5 — `wide`: the app's 10 decks and 80 cards, 171 state changes in one transition.
//
// THE CARD IS RE-DECLARED HERE WITH ITS STATE HOISTED, and the header says why at length: the real
// card's wire creates its two bindables inside itself, so the only way to drive `mountExodraApp` is
// 160 dispatched clicks, and `participants/floor/app.ts` measured that harness at 42% of an
// `app-update` round. A floor comparison whose two rows are both 42% harness would print a ratio much closer to 1 than
// the renderer earns, which is the flattering direction and therefore the one to refuse.
//
// EVERYTHING ELSE IS THE APP'S. `DETAILS` and `TAG` are imported from `exodra-app` — they are what
// the update actually builds and reconciles, and re-declaring them would compile a second schema
// for an identical shape. The declaration below is the same SIX elements with the same two
// children ports in the same places — the sixth is the `<span class="count">` the app's third
// derived value writes into, a SIBLING of `.tags` and not a child of it, so the tag region's
// bound is the one it always was — and `gateWideAgainstTheApp()` proves the substitution by
// mounting this app beside the real one and flipping both.
//
// A FLIP IS NO LONGER STRUCTURE ALONE, and every row on this transition had to grow the same three
// writes: the headline (text), `aria-expanded` (attribute) and the count label (text). Where a row
// puts them says what kind of row it is — the renderer rows DERIVE them from the sources their
// children already come from, the hand-written floors WRITE them at the end of the function that
// moved the state.
//
// A ROUND OPENS WITH THE TEN DECK RENAMES, in the order `TCardDriver.round` fixes: every deck's
// `.ren`, then the 160 card writes, then the user write. The deck level is the app's: `<h2>` name,
// author, `<time>` date and the cards inside `.cards`, rebuilt here as `WIDE_DECK` for the renderer
// rows and emitted by `buildWideFloor` for the floors.
//
// AND THE LAST STEP IS NOT A CARD'S — the 171st state change. `AppHandle.flip` advances ONE USER'S
// SETTING after both card loops, and a tag's text is its label clipped to ITS OWN user's setting, so
// that single write ends with FORTY tag texts changed in FORTY DIFFERENT CARDS, and the dates of the
// two decks that user authored. The app's tags subscribe to nothing — it walks them (`reclipTags`) —
// so the renderer rows walk their cards the same way (`wideAdvanceUserWalk`) while each deck's date
// listens to its author's cell, and the hand-written floors walk a table of readers they enumerated
// at the build (`TWideFloor.hot`, `TWideFloor.decksOf`) and store the texts themselves.
// `apps/stage0/stage0.tsx` keeps the same table for the same reason.
//
// The writes are still the app's own, and no row was given a driver it did not have.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const OPEN: readonly number[] = [0];
const SHUT: readonly number[] = [];

/**
 * ONE MOUNTED APP'S FIVE USERS AND ITS ROUND COUNTER — the third state a flip moves, and the only
 * one that is not per card.
 *
 * PER MOUNT AND NEVER PER MODULE, exactly as the app's own are (`todo-spec.ts`, WHERE THE USERS
 * LIVE): this file mounts up to a dozen copies of the same app side by side in one gate and steps
 * them together, and five shared cells would advance a setting once per ROW instead of once per app.
 * Every row here builds its own.
 */
interface TWideUsers {
    /** The five settings, index = user id — what a tag's text is clipped to. */
    readonly cells: readonly TExoBenchSource<number>[];
    /** This app's own count of rounds run; `roundUserOf` turns it into the user the next one moves. */
    round: number;
}

const wideUsers = (): TWideUsers => ({
    cells: USER_IDX.map((u) => createExoBenchSource<number>(startChars(u))),
    round: 0,
});

/**
 * THE FLIP'S THIRD STEP FOR A ROW MOVED BY CELLS — one `setValue`, forty texts, and every one of
 * them reached by a subscription somebody took at the mount.
 */
function wideAdvanceUser(u: TWideUsers): void {
    const cell = u.cells[roundUserOf(u.round)];
    u.round++;
    cell.setValue(nextChars(cell.getValue()));
}

/** One card's four tag rows, each carrying the CELL its text is clipped by — the same four objects
 *  `apps/exodra/exodra.tsx`'s wire builds, and the same identities its list reconciles by. */
const widePool = (i: number, u: TWideUsers): readonly TExoCardTag[] =>
    tagsOfCard(i).map((t) => ({ label: t.label, chars: u.cells[t.user] }));

interface TWideCard {
    readonly i: number;
    readonly details: TExoBenchSource<readonly number[]>;
    readonly tags: TExoBenchSource<readonly TExoCardTag[]>;
    reclip: (cell: TExoBenchSource<number>) => void;
}

function wideAdvanceUserWalk(
    u: TWideUsers,
    cards: readonly { reclip: (cell: TExoBenchSource<number>) => void }[]
): void {
    const cell = u.cells[roundUserOf(u.round)];
    u.round++;
    cell.setValue(nextChars(cell.getValue()));
    for (let k = cards.length - 1; k >= 0; k--) cards[k].reclip(cell);
}

interface TWideDeck {
    readonly d: number;
    readonly name: TExoBenchSource<number>;
    readonly chars: TExoBenchSource<number>;
}

const wideDecks = (u: TWideUsers): readonly TWideDeck[] =>
    DECK_IDX.map((d) => ({
        d,
        name: createExoBenchSource<number>(startDeckName(d)),
        chars: u.cells[deckUserOf(d)],
    }));

function wideRenameDecks(decks: readonly TWideDeck[]): void {
    for (let d = 0; d < decks.length; d++) {
        const name = decks[d].name;
        name.setValue(nextDeckName(name.getValue()));
    }
}

let WIDE_DECK_FILL: (c: TExoDomNode, cards: TExoChildrenPort, d: number) => void = NOOP;

const WIDE_DECK_SCHEMA = createExoSchema((b) => {
    let name!: TExoTextPort;
    let author!: TExoTextPort;
    let date!: TExoTextPort;
    let rename!: TExoEventPort;
    let cards!: TExoChildrenPort;
    b.el('div', { class: 'deck' }, (deck) => {
        deck.el('h2', null, (h2) => {
            name = h2.textPort();
        });
        deck.el('span', { class: 'author' }, (span) => {
            author = span.textPort();
        });
        deck.el('time', { class: 'date' }, (time) => {
            date = time.textPort();
        });
        deck.el('button', { class: 'ren' }, (btn) => {
            rename = btn.eventPort('click');
            btn.text('rename');
        });
        deck.el('div', { class: 'cards' }, (list) => {
            cards = list.childrenPort();
        });
    });
    return { name, author, date, rename, cards };
});
const mWIDE_DECK = createExoMachine(WIDE_DECK_SCHEMA, {
    createInitialState: (c: TExoDomNode, deck: TWideDeck) => {
        c.text(WIDE_DECK_SCHEMA.ports.author, userNameOf(deckUserOf(deck.d)));
        c.on(WIDE_DECK_SCHEMA.ports.rename, NOOP);
        WIDE_DECK_FILL(c, WIDE_DECK_SCHEMA.ports.cards, deck.d);
        return { deck, when: deckDateOf(deck.d) };
    },
});
const WIDE_DECK = composeExoMachine(
    mWIDE_DECK,
    (m) =>
        withExoTransitions(m, {
            showWideDeckName: (c) => {
                const deck = c.state.deck;
                c.text(WIDE_DECK_SCHEMA.ports.name, deckNameOf(deck.d, deck.name.getValue()));
            },
            showWideDeckDate: (c) => {
                const state = c.state;
                c.text(
                    WIDE_DECK_SCHEMA.ports.date,
                    dateTextOf(state.when, state.deck.chars.getValue())
                );
            },
        }),
    (m) => {
        const { showWideDeckName, showWideDeckDate } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showWideDeckName(c);
                return c.state.deck.name.onChange(() => showWideDeckName(c));
            });
            effect((c) => {
                showWideDeckDate(c);
                return c.state.deck.chars.onChange(() => showWideDeckDate(c));
            });
        });
    }
);

function mountWideDecks(
    container: HTMLElement,
    decks: readonly TWideDeck[],
    fill: (c: TExoDomNode, cards: TExoChildrenPort, d: number) => void
): () => void {
    const APP_SCHEMA = createExoSchema((b) => {
        let port!: TExoChildrenPort;
        b.el('div', { class: 'app' }, (app) => {
            port = app.childrenPort();
        });
        return { decks: port };
    });
    const mAPP = createExoMachine<TExoDomNode>(APP_SCHEMA, {
        createInitialState: (c) => {
            WIDE_DECK_FILL = fill;
            c.list(APP_SCHEMA.ports.decks, WIDE_DECK, decks);
        },
    });
    const APP = mAPP;
    return EXO_BACKEND.render(APP, container);
}

const perDeck = <T>(cards: readonly T[]): readonly (readonly T[])[] =>
    DECK_IDX.map((d) => cards.slice(d * CARDS_PER_DECK, (d + 1) * CARDS_PER_DECK));

const WIDE_CARD_SCHEMA = createExoSchema((b) => {
    let index!: TExoAttrPort;
    let title!: TExoTextPort;
    let user!: TExoTextPort;
    let toggle!: TExoEventPort;
    let expanded!: TExoAttrPort;
    let details!: TExoChildrenPort;
    let tags!: TExoChildrenPort;
    let count!: TExoTextPort;
    let addTag!: TExoEventPort;
    b.el('div', { class: 'card' }, (card) => {
        index = card.port('data-i');
        card.el('h3', null, (h3) => {
            title = h3.textPort();
        });
        // The card's user NAME — the app's seventh element, a constant text, filled once.
        card.el('span', { class: 'user' }, (span) => {
            user = span.textPort();
        });
        card.el('button', { class: 'tog' }, (btn) => {
            toggle = btn.eventPort('click');
            expanded = btn.port('aria-expanded');
            btn.text('details');
        });
        details = card.childrenPort();
        card.el('div', { class: 'tags' }, (list) => {
            tags = list.childrenPort();
        });
        card.el('span', { class: 'count' }, (span) => {
            count = span.textPort();
        });
        card.el('button', { class: 'addtag' }, (btn) => {
            addTag = btn.eventPort('click');
            btn.text('+');
        });
    });
    return { index, title, user, toggle, expanded, details, tags, count, addTag };
});
const mWIDE_CARD = createExoMachine(WIDE_CARD_SCHEMA, {
    createInitialState: (c: TExoDomNode, card: TWideCard) => {
        // The card's WHOLE title, computed once per instance exactly as the app's wire computes
        // it, and clipped per flip by `headlineOf`.
        const title = titleOf(card.i);
        c.attr(WIDE_CARD_SCHEMA.ports.index, String(card.i));
        // THE USER'S NAME — `c.text`, not a watched source: a name is a shared read that cannot
        // move, and the app's own wire fills it exactly this way.
        c.text(WIDE_CARD_SCHEMA.ports.user, userNameOf(cardUserOf(card.i)));
        // The real card's handlers close over its state and flip it; here the driver does that
        // directly, so the ports are filled with one shared no-op. Both apps therefore attach
        // the same 160 listeners at mount, which is untimed for every row in this file.
        c.on(WIDE_CARD_SCHEMA.ports.toggle, NOOP);
        const detailsList = (c as TExoDomNode & TExoDomPortChildList).portChildList(
            WIDE_CARD_SCHEMA.ports.details
        );
        const tagList = (c as TExoDomNode & TExoDomPortChildList).portChildList(
            WIDE_CARD_SCHEMA.ports.tags
        );
        card.reclip = (cell) => {
            const items = card.tags.getValue();
            const chars = cell.getValue();
            for (let k = items.length - 1; k >= 0; k--) {
                const tag = items[k];
                if (tag.chars !== cell) continue;
                writeTagLabel(
                    tagList.at(k) as unknown as TExoMachineNode,
                    tagTextOf(tag.label, chars)
                );
            }
        };
        c.on(WIDE_CARD_SCHEMA.ports.addTag, NOOP);
        return {
            card,
            title,
            detailsList,
            tagList,
            shownDetails: [] as number[],
            shownTags: [] as TExoCardTag[],
        };
    },
});
const WIDE_CARD = composeExoMachine(
    mWIDE_CARD,
    (m) =>
        withExoTransitions(m, {
            showWideDetails: (c) => {
                const state = c.state;
                const kids = state.card.details.getValue();
                c.text(WIDE_CARD_SCHEMA.ports.title, headlineOf(state.title, kids.length === 1));
                c.attr(WIDE_CARD_SCHEMA.ports.expanded, expandedOf(kids.length === 1));
                state.shownDetails = reconcileExoOrder(
                    state.detailsList,
                    state.shownDetails,
                    kids,
                    kids,
                    () => wireExoNode(c.createExoNode(DETAILS))
                );
            },
            showWideTags: (c) => {
                const state = c.state;
                const tags = state.card.tags.getValue();
                c.text(WIDE_CARD_SCHEMA.ports.count, tagsLabel(tags.length));
                state.shownTags = reconcileExoOrder(
                    state.tagList,
                    state.shownTags,
                    tags,
                    tags,
                    (tag) => {
                        const row = wireExoNode(c.createExoNode(TAG));
                        writeTagLabel(
                            row as unknown as TExoMachineNode,
                            tagTextOf(tag.label, tag.chars.getValue())
                        );
                        return row;
                    }
                );
            },
        }),
    (m) => {
        const { showWideDetails, showWideTags } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showWideDetails(c);
                return c.state.card.details.onChange(() => showWideDetails(c));
            });
            effect((c) => {
                showWideTags(c);
                return c.state.card.tags.onChange(() => showWideTags(c));
            });
        });
    }
);

/** Per card: its own four tag pools, precomputed, so no transition allocates an array. */
interface TWideState {
    readonly cards: readonly TWideCard[];
    /** `slices[k][n]` is card k's first `n` tags — index 0 is unused, counts run 1..4. */
    readonly slices: readonly (readonly (readonly TExoCardTag[])[])[];
    readonly open: Uint8Array;
    readonly count: Int32Array;
    /** This app's five user settings and its round counter — the flip's third state. */
    readonly users: TWideUsers;
    readonly decks: readonly TWideDeck[];
}

function wideState(): TWideState {
    const cards: TWideCard[] = [];
    const slices: (readonly TExoCardTag[])[][] = [];
    const open = new Uint8Array(IDX.length);
    const count = new Int32Array(IDX.length);
    const users = wideUsers();
    for (let k = 0; k < IDX.length; k++) {
        const i = IDX[k];
        // One pool of tag OBJECTS per card, as the app's own wire builds — identity is what the
        // tag list reconciles by, so the kept rows are the same rows and only the tail moves. Each
        // position carries the CELL its text is clipped by, which is what makes the third step of a
        // flip reach forty tags in forty cards through one `setValue`.
        const pool: readonly TExoCardTag[] = widePool(i, users);
        const per: (readonly TExoCardTag[])[] = [pool.slice(0, 0)];
        for (let n = 1; n <= POOL.length; n++) per.push(pool.slice(0, n));
        slices.push(per);
        open[k] = startsOpen(i) ? 1 : 0;
        count[k] = startCount(i);
        cards.push({
            i,
            details: createExoBenchSource<readonly number[]>(startsOpen(i) ? OPEN : SHUT),
            tags: createExoBenchSource<readonly TExoCardTag[]>(per[startCount(i)]),
            reclip: NOOP,
        });
    }
    return { cards, slices, open, count, users, decks: wideDecks(users) };
}

function mountWideExodra(
    container: HTMLElement,
    cards: readonly TWideCard[],
    decks: readonly TWideDeck[]
): () => void {
    const slices = perDeck(cards);
    return mountWideDecks(container, decks, (c, port, d) => {
        c.list(port, WIDE_CARD, slices[d]);
    });
}

function wideExodra(): Instance {
    const c = el();
    const st = wideState();
    const dispose = mountWideExodra(c, st.cards, st.decks);
    const n = IDX.length;
    return {
        retained: st,
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                // The app's own flip order: every deck rename, every details block, every tag list.
                wideRenameDecks(st.decks);
                for (let k = 0; k < n; k++) {
                    const on = st.open[k] === 1 ? 0 : 1;
                    st.open[k] = on;
                    st.cards[k].details.setValue(on === 1 ? OPEN : SHUT);
                }
                for (let k = 0; k < n; k++) {
                    // `nextCount` is the app's own spec function, called rather than re-derived,
                    // so this transition cannot drift from the one `app-update` performs. Both
                    // sides of the comparison pay the same call.
                    const next = nextCount(st.count[k]);
                    st.count[k] = next;
                    st.cards[k].tags.setValue(st.slices[k][next]);
                }
                // AND THE FLIP'S THIRD STEP, WHICH IS NOT A CARD'S: one user's setting advanced,
                // which forty tag bindings in forty different cards are subscribed to. It runs
                // AFTER both card loops because that is the order `AppHandle.flip` fixes — a tag
                // added by the loop above is built at the old setting and rewritten by this.
                wideAdvanceUserWalk(st.users, st.cards);
            }
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

const DETAILS_PROTO = protoOf('<div class="details">details…</div>');
const TAG_PROTO = protoOf('<span class="tag">x</span>');

/**
 * The floor's copy of the app, and every reference a transition on it could need.
 *
 * THE THREE FIELDS AFTER `tagsDiv` ARE WHAT THE APP'S DERIVED VALUES ADDED, and they are held the
 * way every other node here is held — one flat array, one slot per card, resolved once at build
 * time. A flip writes them by index; nothing looks anything up.
 *
 * `title` IS A STRING AND NOT A NODE, and it is the one entry that is not a DOM reference: the
 * card's WHOLE title never changes, and the reference wire captures it once too (`const title =
 * titleOf(i)` in `apps/exodra/exodra.tsx`), so holding it is the floor doing what the renderer does
 * rather than the floor being clever. The headline itself is recomputed on every flip, out of it.
 */
interface TWideFloor {
    readonly cardEl: Element[];
    readonly tagsDiv: Element[];
    readonly detailsNode: Array<Element | null>;
    /** The `<h3>`'s Text node — the headline, which `open` moves. */
    readonly titleText: Text[];
    /** The `.tog` button — the element `aria-expanded` is written on, which `open` moves too. */
    readonly togEl: Element[];
    /** The `.count` span's Text node — the tag label, which `count` moves. */
    readonly countText: Text[];
    /** Each card's whole title, computed once. `headlineOf` clips it per flip. */
    readonly title: string[];
    /** Four slots per card, flat — the cheapest retention there is. */
    readonly tagNodes: Array<Element | null>;
    readonly open: Uint8Array;
    readonly count: Int32Array;
    /**
     * THE FIVE USER SETTINGS, as five numbers. A hand-written program has nowhere to put a cell and
     * nothing to notify: a setting is an element of an array and a write is an assignment.
     */
    readonly chars: Int32Array;
    /**
     * WHO IS READING EACH SETTING — `hot[u]` is every tag SLOT (`k * POOL.length + j`) whose user is
     * `u`, gathered while the app is built. 320 slots dealt into five arrays, 64 each.
     *
     * IT IS THIS FILE'S ANSWER TO WHAT A SUBSCRIPTION LIST IS, written out by hand, and it is the
     * honest cost of a shared write in a program with no reactivity: the fan-out has to be
     * enumerated somewhere, and here it is enumerated once at the build rather than maintained by a
     * framework at every change. The alternative a straight-line program has is to walk all 320
     * slots on every setting write and test each one's user, which is the same answer computed five
     * times over. `apps/stage0/stage0.tsx` keeps the identical table for the identical reason.
     *
     * IT IS NOT MAINTAINED AS TAGS COME AND GO: a POSITION is permanent and only its NODE is
     * transient, so the write asks `j < count[k]` — one comparison — and skips what is not standing.
     */
    readonly hot: readonly Int32Array[];
    /** This app's own count of rounds run — `roundUserOf` turns it into the user the next one moves. */
    round: number;
    readonly deckName: Text[];
    readonly deckNames: Int32Array;
    readonly deckDate: Text[];
    readonly decksOf: readonly Int32Array[];
}

function buildWideFloor(container: HTMLElement): TWideFloor {
    let s = '<div class="app">';
    for (let k = 0; k < IDX.length; k++) {
        const i = IDX[k];
        if (k % CARDS_PER_DECK === 0) {
            const d = k / CARDS_PER_DECK;
            const author = deckUserOf(d);
            s +=
                `<div class="deck"><h2>${deckNameOf(d, startDeckName(d))}</h2>` +
                `<span class="author">${userNameOf(author)}</span>` +
                `<time class="date">${dateTextOf(deckDateOf(d), startChars(author))}</time>` +
                '<button class="ren">rename</button><div class="cards">';
        }
        const isOpen = startsOpen(i);
        const n = startCount(i);
        s +=
            `<div class="card" data-i="${i}"><h3>${headlineOf(titleOf(i), isOpen)}</h3>` +
            `<span class="user">${userNameOf(cardUserOf(i))}</span>` +
            `<button class="tog" aria-expanded="${expandedOf(isOpen)}">details</button>`;
        if (isOpen) s += '<div class="details">details…</div>';
        s += '<div class="tags">';
        // EVERY TAG IS CLIPPED TO ITS OWN USER'S SETTING, and the users start where the spec says
        // they start — the app this is a floor for renders `tagTextOf(label, chars)` and never the
        // label, so a floor that emitted the whole label would fail the byte gate at the mount.
        for (let t = 0; t < n; t++) {
            s += `<span class="tag">${tagTextOf(POOL[t], startChars(tagUserOf(i, t)))}</span>`;
        }
        s += `</div><span class="count">${tagsLabel(n)}</span>`;
        s += '<button class="addtag">+</button></div>';
        if (k % CARDS_PER_DECK === CARDS_PER_DECK - 1) s += '</div></div>';
    }
    container.innerHTML = s + '</div>';

    const app = container.firstElementChild as Element;
    const cardEl: Element[] = [];
    const tagsDiv: Element[] = [];
    const detailsNode: Array<Element | null> = [];
    const titleText: Text[] = [];
    const togEl: Element[] = [];
    const countText: Text[] = [];
    const title: string[] = [];
    const tagNodes: Array<Element | null> = new Array<Element | null>(
        IDX.length * POOL.length
    ).fill(null);
    const open = new Uint8Array(IDX.length);
    const count = new Int32Array(IDX.length);
    // THE FIVE SETTINGS AND THE FAN-OUT TABLE — see `TWideFloor.hot`. The table is built over ALL
    // FOUR positions of every card, standing or not, because a position is permanent and its node is
    // not: what is on screen is decided at the write, by one comparison against `count`.
    const chars = new Int32Array(USER_IDX.length);
    for (let u = 0; u < USER_IDX.length; u++) chars[u] = startChars(u);
    const hotLists: number[][] = USER_IDX.map((): number[] => []);
    for (let k = 0; k < IDX.length; k++) {
        for (let t = 0; t < POOL.length; t++) {
            hotLists[tagUserOf(IDX[k], t)].push(k * POOL.length + t);
        }
    }
    const hot: readonly Int32Array[] = hotLists.map((slots) => Int32Array.from(slots));

    const deckName: Text[] = [];
    const deckDate: Text[] = [];
    const deckNames = new Int32Array(DECK_IDX.length);
    const decksOfUser: number[][] = USER_IDX.map((): number[] => []);
    let deckEl = app.firstElementChild as Element;
    for (let d = 0; d < DECK_IDX.length; d++) {
        const h2 = deckEl.firstElementChild as Element;
        const time = (h2.nextElementSibling as Element).nextElementSibling as Element;
        deckName.push(h2.firstChild as Text);
        deckDate.push(time.firstChild as Text);
        deckNames[d] = startDeckName(d);
        decksOfUser[deckUserOf(d)].push(d);
        deckEl = deckEl.nextElementSibling as Element;
    }
    const decksOf: readonly Int32Array[] = decksOfUser.map((ds) => Int32Array.from(ds));

    let card = app.firstElementChild as Element;
    for (let k = 0; k < IDX.length; k++) {
        const i = IDX[k];
        if (k % CARDS_PER_DECK === 0) {
            card = ((app.children[k / CARDS_PER_DECK] as Element).lastElementChild as Element)
                .firstElementChild as Element;
        }
        const h3 = card.firstElementChild as Element;
        // The `<span class="user">` stands between the headline and the toggle, so the button is the
        // headline's SECOND next sibling. Nothing here holds the user span: its text is written once
        // by the markup above and no transition can move it.
        const tog = (h3.nextElementSibling as Element).nextElementSibling as Element;
        const isOpen = startsOpen(i);
        const d = isOpen ? (tog.nextElementSibling as Element) : null;
        const tags = (
            isOpen ? (d as Element).nextElementSibling : tog.nextElementSibling
        ) as Element;
        // `.count` is the tag list's next SIBLING, never its child — the tag region's bound is
        // still the `</div>` it always was, which is what lets the tag arm below stay unchanged.
        const countSpan = tags.nextElementSibling as Element;
        cardEl.push(card);
        tagsDiv.push(tags);
        detailsNode.push(d);
        titleText.push(h3.firstChild as Text);
        togEl.push(tog);
        countText.push(countSpan.firstChild as Text);
        title.push(titleOf(i));
        open[k] = isOpen ? 1 : 0;
        const n = startCount(i);
        count[k] = n;
        let tag = tags.firstElementChild;
        for (let t = 0; t < n; t++) {
            tagNodes[k * POOL.length + t] = tag;
            tag = (tag as Element).nextElementSibling;
        }
        card = card.nextElementSibling as Element;
    }
    return {
        cardEl,
        tagsDiv,
        detailsNode,
        titleText,
        togEl,
        countText,
        title,
        tagNodes,
        open,
        count,
        chars,
        hot,
        round: 0,
        deckName,
        deckNames,
        deckDate,
        decksOf,
    };
}

/**
 * WRITE ONE USER'S SETTING INTO EVERY TAG THAT SHOWS IT — the DOM half of the flip's third step, as
 * a program with no reactivity performs it.
 *
 * FORTY TEXT STORES FROM ONE NUMBER, reached through the table gathered at the build. `j < count[k]`
 * is how a permanent POSITION answers "is my node on screen right now", which is the one thing this
 * write has to know and the one thing nothing else here will tell it.
 *
 * IT RECOMPUTES `tagTextOf` FOR ALL FORTY and does not compute it four times and assign forty. The
 * forty texts one advance produces are at most FOUR DISTINCT STRINGS (four labels, one setting), and
 * holding those four would be a STRATEGY — the app computes the value where it writes it, and a floor
 * that skipped the computation would bound a program nobody is running.
 */
function wideFloorRename(f: TWideFloor, d: number): void {
    const name = nextDeckName(f.deckNames[d]);
    f.deckNames[d] = name;
    f.deckName[d].data = deckNameOf(d, name);
}

function wideFloorDates(f: TWideFloor, u: number, chars: number): void {
    const decks = f.decksOf[u];
    for (let k = 0; k < decks.length; k++) {
        const d = decks[k];
        f.deckDate[d].data = dateTextOf(deckDateOf(d), chars);
    }
}

function wideFloorUserAt(f: TWideFloor, u: number, chars: number): void {
    f.chars[u] = chars;
    wideFloorDates(f, u, chars);
    const hot = f.hot[u];
    const stride = POOL.length;
    for (let h = 0; h < hot.length; h++) {
        const at = hot[h];
        const k = (at / stride) | 0;
        const j = at - k * stride;
        if (j < f.count[k]) {
            ((f.tagNodes[at] as Element).firstChild as Text).data = tagTextOf(POOL[j], chars);
        }
    }
}

/** WHICH USER THIS APP'S NEXT ROUND MOVES, and the counter advanced — one integer per mounted app,
 *  exactly as the app's own shell keeps one. */
function wideNextUser(f: TWideFloor): number {
    const u = roundUserOf(f.round);
    f.round++;
    return u;
}

/** THE FLIP'S THIRD STEP FOR A HAND-WRITTEN ROW — advance this app's next user and write the tags. */
function wideFloorUsers(f: TWideFloor): void {
    const u = wideNextUser(f);
    wideFloorUserAt(f, u, nextChars(f.chars[u]));
}

/**
 * THE MINIMUM DOM OPERATIONS OF ONE FLIP, for one card.
 *
 * Opening a details block is one clone and one `insertBefore` at the position the children port
 * stands in — between the toggle and the tag list; closing it is one `remove`. Advancing a tag list
 * is one clone, one text store and one `appendChild`, except at the wrap from four back to one,
 * which is three `remove`s. The tag rows that survive are the same nodes — which is exactly what
 * the renderer's identity reconcile does with the same pools.
 *
 * AND THE STRUCTURE IS NO LONGER ALL OF A FLIP, which is the whole of what the app's three derived
 * values changed here. A disclosure now moves TWO VALUES besides the block — the headline (a text
 * store) and `aria-expanded` (an attribute store) — and an advance moves the count label (a text
 * store). They are written at the END of the function that moves the state they read, which is
 * where a straight-line program writes them: the state has just changed, the node is already in
 * hand, and there is nothing to notify.
 *
 * THE FLOOR RECOMPUTES THEM, IT DOES NOT LOOK THEM UP. `headlineOf(f.title[k], on)` builds the same
 * string the renderer's transition builds; `expandedOf` and `tagsLabel` are the spec's own
 * functions, imported. A table of the two possible headlines per card would have been cheaper and
 * would have been a different job — the app computes this value on every notification, and a floor
 * that skipped the computation would bound a program nobody is running.
 */
function wideFloorDetails(f: TWideFloor, k: number): void {
    if (f.open[k] === 1) {
        (f.detailsNode[k] as Element).remove();
        f.detailsNode[k] = null;
        f.open[k] = 0;
    } else {
        const d = DETAILS_PROTO.cloneNode(true) as Element;
        f.cardEl[k].insertBefore(d, f.tagsDiv[k]);
        f.detailsNode[k] = d;
        f.open[k] = 1;
    }
    const on = f.open[k] === 1;
    f.titleText[k].data = headlineOf(f.title[k], on);
    f.togEl[k].setAttribute('aria-expanded', expandedOf(on));
}

function wideFloorTags(f: TWideFloor, k: number): void {
    const n = f.count[k];
    const next = nextCount(n);
    if (next > n) {
        const t = TAG_PROTO.cloneNode(true) as Element;
        // THE NEW TAG'S TEXT IS ITS LABEL CLIPPED TO ITS OWN USER'S CURRENT SETTING — the tag
        // being added belongs to `tagUserOf(i, next - 1)`, which is NOT the card's user, and the
        // setting is whatever the rounds so far have left in `f.chars`.
        (t.firstChild as Text).data = tagTextOf(
            POOL[next - 1],
            f.chars[tagUserOf(IDX[k], next - 1)]
        );
        f.tagsDiv[k].appendChild(t);
        f.tagNodes[k * POOL.length + next - 1] = t;
    } else {
        for (let j = next; j < POOL.length; j++) {
            (f.tagNodes[k * POOL.length + j] as Element).remove();
            f.tagNodes[k * POOL.length + j] = null;
        }
    }
    f.count[k] = next;
    f.countText[k].data = tagsLabel(next);
}

function wideFloor(): Instance {
    const c = el();
    const f = buildWideFloor(c);
    const n = IDX.length;
    return {
        retained: f,
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                for (let d = 0; d < DECK_IDX.length; d++) wideFloorRename(f, d);
                for (let k = 0; k < n; k++) wideFloorDetails(f, k);
                for (let k = 0; k < n; k++) wideFloorTags(f, k);
                // The flip's third step, which is not a card's: one user's setting, forty tags.
                wideFloorUsers(f);
            }
        },
        dispose: () => c.remove(),
    };
}

/** THE NULL for the wide family — its own declaration, its own DOM. True Δ = 0. */
function wideFloorTwin(): Instance {
    const c = el();
    const f = buildWideFloor(c);
    const n = IDX.length;
    return {
        retained: f,
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                for (let d = 0; d < DECK_IDX.length; d++) wideFloorRename(f, d);
                for (let k = 0; k < n; k++) wideFloorDetails(f, k);
                for (let k = 0; k < n; k++) wideFloorTags(f, k);
                // The flip's third step, which is not a card's: one user's setting, forty tags.
                wideFloorUsers(f);
            }
        },
        dispose: () => c.remove(),
    };
}

/**
 * THE SAME NULL, TAKEN FAR AWAY — a THIRD declaration of the wide floor, identical to `floor` and to
 * `floor·twin` in every line, and different from them in one thing that is not in this function:
 * WHERE IT IS DECLARED. `floor·twin` sits immediately after `floor`; this one is declared LAST in
 * `wide`'s program list, as far from `floor` as the list allows.
 *
 * THIS IS THE INSTRUMENT MEASURING ITSELF, and it is the row that was missing. `|floor − floor·twin|`
 * is the bar that `floor·record − floor` and `floor·wire − floor·record` are read against — differences
 * across rows three and five phases apart — and it was always taken on the CLOSEST pair in the list.
 * Under the old rigid rotation the closest pair was privileged: it was measured back to back in every
 * round, for the whole run. Nothing in this file ever compared a floor-scale null against a
 * NON-adjacent twin, so the assumption that position does not matter was never tested at the
 * magnitude where it does the work. `exodra·twin·near` versus `exodra·twin` tested it at the
 * RENDERER's magnitude and the two disagreed by 9.3750 µs.
 *
 * WHAT ITS VALUE MEANS. `|floor − floor·twin·far|` near `|floor − floor·twin|` (both a rounding
 * artefact, order 0.0001 µs) says the shuffle did what it was put there to do and a null may be read
 * wherever it is declared. A far null of several µs against a near null of 0.0001 says position
 * still buys something the ordering does not remove, and then EVERY rung on EVERY transition in this
 * file is bounded by a bar measured on the friendliest pair available and every attribution across
 * non-adjacent rows must be withdrawn rather than re-run — a bias does not fall with the batch.
 *
 * IT IS DUPLICATED SOURCE and not a second call to `wideFloor`, for the reason every twin here is:
 * calling one function twice shares everything V8 learned about it.
 */
function wideFloorTwinFar(): Instance {
    const c = el();
    const f = buildWideFloor(c);
    const n = IDX.length;
    return {
        retained: f,
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                for (let d = 0; d < DECK_IDX.length; d++) wideFloorRename(f, d);
                for (let k = 0; k < n; k++) wideFloorDetails(f, k);
                for (let k = 0; k < n; k++) wideFloorTags(f, k);
                // The flip's third step, which is not a card's: one user's setting, forty tags.
                wideFloorUsers(f);
            }
        },
        dispose: () => c.remove(),
    };
}

/**
 * THE WIDE FLOOR, SUBSCRIBED — the same DOM work, reached through 160 sources and the same
 * 160 `setValue` calls the renderer is fired by, so the dispatch is priced at the scale the
 * transition actually runs it.
 *
 * The subscriber is handed the new VALUE (an array of zero or one details rows, an array of one to
 * four tags), which is the same thing `reconcileExoOrder` is handed, and it reads the length rather
 * than being told the op — the least it can get away with while being fired identically.
 */
function wideFloorBound(): Instance {
    const c = el();
    const f = buildWideFloor(c);
    const n = IDX.length;
    const detailsSrc: TExoBenchSource<readonly number[]>[] = [];
    const tagsSrc: TExoBenchSource<readonly TExoCardTag[]>[] = [];
    const slices: (readonly TExoCardTag[])[][] = [];
    const stops: Array<() => void> = [];
    // THE APP'S FIVE USERS AS FIVE MORE SOURCES — the third state a flip moves, fired exactly as
    // the other 160 are: one `setValue`, one subscriber, and the DOM written by hand inside it.
    const users = wideUsers();
    for (let k = 0; k < n; k++) {
        const i = IDX[k];
        const pool: readonly TExoCardTag[] = widePool(i, users);
        const per: (readonly TExoCardTag[])[] = [pool.slice(0, 0)];
        for (let m = 1; m <= POOL.length; m++) per.push(pool.slice(0, m));
        slices.push(per);
        const ds = createExoBenchSource<readonly number[]>(startsOpen(i) ? OPEN : SHUT);
        const ts = createExoBenchSource<readonly TExoCardTag[]>(per[startCount(i)]);
        const at = k;
        stops.push(
            ds.onChange(() => {
                wideFloorDetails(f, at);
            })
        );
        stops.push(
            ts.onChange(() => {
                wideFloorTags(f, at);
            })
        );
        detailsSrc.push(ds);
        tagsSrc.push(ts);
    }
    // FIVE SUBSCRIBERS FOR FIVE SETTINGS. The subscriber is handed nothing it does not read: it
    // takes the new setting off the cell and writes the forty tags that show it, which is the same
    // hand-written fan-out `floor` performs — reached through a subscription instead of a call.
    for (let u = 0; u < USER_IDX.length; u++) {
        const cell = users.cells[u];
        const at = u;
        stops.push(
            cell.onChange(() => {
                wideFloorUserAt(f, at, cell.getValue());
            })
        );
    }
    const names = DECK_IDX.map((d) => createExoBenchSource<number>(startDeckName(d)));
    for (let d = 0; d < names.length; d++) {
        const at = d;
        const name = names[d];
        stops.push(
            name.onChange(() => {
                f.deckName[at].data = deckNameOf(at, name.getValue());
            })
        );
    }
    const open = new Uint8Array(n);
    const count = new Int32Array(n);
    for (let k = 0; k < n; k++) {
        open[k] = startsOpen(IDX[k]) ? 1 : 0;
        count[k] = startCount(IDX[k]);
    }
    return {
        retained: [f, stops, slices, users, names],
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                for (let d = 0; d < names.length; d++) {
                    names[d].setValue(nextDeckName(names[d].getValue()));
                }
                for (let k = 0; k < n; k++) {
                    const on = open[k] === 1 ? 0 : 1;
                    open[k] = on;
                    detailsSrc[k].setValue(on === 1 ? OPEN : SHUT);
                }
                for (let k = 0; k < n; k++) {
                    const next = nextCount(count[k]);
                    count[k] = next;
                    tagsSrc[k].setValue(slices[k][next]);
                }
                // The flip's third step, through the same door as the other 160.
                wideAdvanceUser(users);
            }
        },
        dispose: () => {
            for (let s = 0; s < stops.length; s++) stops[s]();
            c.remove();
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE RUNGS INSIDE `wide` — what "everything else" is actually made of. TWO OF THE FOUR ARE STRUCK
// (E2 and E3, see the strike note below them) and E5 was added later, so THREE stand: E1, E4, E5.
//
// `wide`'s ladder prints TWO lines and one of them is most of the gap: "everything else = exodra −
// floor·bound". ON THE RECORDED RUN THAT IS 119.5313 − 61.7188 = 57.8125 µs, 86.0% of the 67.1875
// µs between `exodra` and the plain floor. THIS PARAGRAPH USED TO SAY +54.688 µs AND "54.7%" — the
// first was the figure from an earlier, unrecorded run of `wide` (these four rungs did not exist in
// it, and six extra phases move every median), and the second was that same µs figure with a per
// cent sign on it, which it never was. Neither may be quoted; 57.8125 µs is what the only recording
// says. A previous reading of this repository accounted for about 49 µs of it by
// READING THE CODE and estimating per-unit costs, and left 5-13 µs — a fifth of the whole gap —
// unexplained, with GC as its own guess for the residual. THESE FOUR ROWS EXIST TO REPLACE THAT
// ESTIMATE WITH A MEASUREMENT, and each is built the way `textOneFloorGuard` is built: take a
// program this file already has, add EXACTLY ONE thing to it, and print the difference.
//
// WHAT ONE FLIP OF THIS APP ACTUALLY DOES, counted from the spec rather than assumed, because
// every rung below is sized by these numbers (`WIDE_CENSUS` computes them at module load from
// `startsOpen`, `startCount` and `nextCount` — the same three functions the app is built from):
//
//   100 children BUILT and 100 children DROPPED per flip
//     40 details blocks open (one clone, one insertBefore) and 40 close (one remove)
//     60 tag lists grow by one (one clone, one text store, one appendChild) and 20 wrap from
//        four back to one (three removes)
//   240 registry `get`s · 100 `set`s · 100 `delete`s per flip — HISTORICAL. `WIDE_CENSUS` still
//     computes these three and the struck E2 row is the only thing that ever spent them: no
//     registry exists today, and the two `registry`/`registryKey` fields the child maker writes
//     are read by nothing. They are left in the census because `measurements/*.json` rows carry
//     them and because the gate line prints them; they size no row.
//
// ── E1 `floor·record` — THE PER-CHILD RECORD, WITH NO FRAMEWORK IN THE FRAME ─────────────────
//
// The floor's program and one thing more: per node it builds, a THIRTEEN-FIELD literal in
// `TExoDomChild`'s exact field order, an empty `disposers` array, and a symbol expando that patches
// it onto the freshly cloned element. THE FIRST TWO ARE WHAT `createExoDomChildFactory` BUILDS; THE THIRD
// IS NOT — the child maker wrote such a mark once and writes nothing onto an element now.
//
// SO THIS RUNG IS NEITHER BOUND CLEANLY, AND THAT REPLACES A SENTENCE THAT CLAIMED ONE. The expando
// pushes it ABOVE the shipped record (the renderer does not write it); the four fields
// `TFloorRecord` omits — a shipped `TExoDomChild` carries seventeen words, this replica thirteen —
// push it BELOW. The two run in opposite directions and neither is priced here, so read this rung
// as an estimate with a named error on each side, not as a one-sided bound. Per node it drops, that object's
// default `unmount` (`DISPOSE_SELF`: the registry branch, then the disposer loop) and the
// `index = -1` a departing child gets. It also calls the record's `mount()` on the way in, which
// is one indirect call on a shared no-op, because a record that nothing ever calls is not the
// record the renderer carries.
//
// IT CHANGES NO DOM AT ALL, so it is byte-identical to `floor` BY CONSTRUCTION and the gate is a
// formality it still has to pass. `floor·record − floor` is 100 records built and 100 dropped, per
// flip, with no declaration, no schema, no wire, no subscription and no reconciler anywhere near them.
//
// WHAT IT IS NOT CHARGED FOR, said out loud: the CLONE (the floor already pays it), the wiring
// pass, the registry (that is E2), and `dropExoChild`'s parentage climb — that climb is DOM-mutation
// resilience, which is a different feature and belongs in a row of its own if anybody wants it.
//
// ── E2 AND E3 ARE STRUCK, AND WHAT THEY PRICED ───────────────────────────────────────────────
//
// E2 `floor·registry` priced `attachExoList`'s item→child `Map` — 240 gets, 100 sets and 100
// deletes per flip, `remap`'s loop body, with no framework in the frame. E3 `exodra·children`
// priced the same quantity from the renderer's end, by wiring the app with `c.bindChildren` over
// harness-built children instead of `bindList`, so that `exodra − exodra·children` was the façade:
// the registry, `remap`'s loop, the op-translating closure and the two façade objects.
//
// THE MECHANISM IS DELETED. There is no `attachExoList`, no `bindList`, no `bindChildren` and no
// registry: a reactive list is `reconcileExoOrder` over `c.portChildList(port)` in a transition, which
// keeps an array mirror of the order, and the `registry`
// and `registryKey` fields the child maker still writes are read by nothing. So E2 was a floor-side
// imitation of a `Map` nobody consults, and E3 differed from `exodra` only in who calls `c.createExoNode` —
// its number would have been noise under a name that claims a façade.
//
// WHAT WENT WITH THEM: (Q3), (Q4) and the registry half of (Q5) in the header above, the `E2`,
// `E3`, `E3−E4` and `E1 + E2 against E4` ladder lines, and the `E5 against E3−E4` cross-check.
// (Q8) and (Q10), which were both differences taken against `exodra·children`, go with them. The
// RECORDED numbers those entries quote are left where they stand — they are what the only
// recording says about the renderer that produced it.
// ── E4 `exodra·kept` — A DIAGNOSTIC, AND THE ROW THAT CAN COME IN UNDER THE FLOOR ────────────
//
// Every details block and every tag of every card is built ONCE, at mount, and told to survive
// removal (`exoNodeDom(child).unmount = NOTHING` — the documented extension point, and exactly
// what `toggle.tsx`'s `exodraKept` does). The sources then cycle between arrays that were filled
// at setup, so a flip BUILDS nothing and DROPS nothing: it is 160 `setValue`
// calls, 160 reconciles and the DOM insertions and removals those imply.
//
// IT IS NOT ALLOCATION-FREE. The composition is `reconcileExoOrder` over a source whose items ARE
// the children, with an identity build; that reconciler splices its own mirror on every
// notification and returns a fresh empty one whenever a list empties, on this row and on the
// reference alike.
//
//   `exodra − exodra·kept`      everything proportional to BUILD AND DROP — the clone, the wiring
//                               pass, the record, the disposal, AND ANY COLLECTION
//                               THOSE ALLOCATIONS TRIGGER. This is the one difference in the file
//                               that contains GC, and it contains it on ONE side only: `exodra`
//                               enters a timed region allocating ~200 CHILDREN per flip and 128
//                               flips of them per region at batch 16, where this row allocates
//                               none of them — the reconciler's own bookkeeping is on both sides
//                               and cancels. It is not a separate measurement of the collector
//                               — the two cannot be told apart here — and it is why (Q2) is put to
//                               `floor·record`, which allocates the same objects at the same rate
//                               with no renderer around them, rather than to this row.
//   `exodra·kept − floor·bound` what is left that scales with NOTIFICATIONS: the reconcile itself
//                               (its mirror, its head-and-tail trim), and the port indirection. NOT the
//                               child-list anchors — (Q11) settled that by reading.
//
// IT IS NOT A FLOOR AND MUST NEVER BE QUOTED AS ONE, and it will almost certainly measure BELOW
// `floor`. That is not a finding about the floor: THE FLOOR CANNOT DECLINE TO REBUILD and this row
// can, so the two are not doing the same job. Its `kind` is `diagnostic`, which keeps it out of
// the floor set, out of the ANSWER, out of the summary table and out of the NO-BOUND refusal — and
// the run prints the comparison anyway, under a label that says what it is.
//
// HOW IT IS GATED, AND WHY THE OBVIOUS OBJECTION DOES NOT APPLY. A kept child does NOT stay in the
// tree: `dropExoChild` calls `unmount()` FIRST and then takes the node out regardless, so "survived"
// means detached-but-alive and the markup after every step is the reference's, byte for byte
// (READ FROM CODE: `packages/dom/src/dom/dropExoChild.ts:34-40`). So it goes through the SAME
// stepped byte-gate as every other row here, unwidened — and through a SECOND gate, which is the
// whole reason it exists: after one full cycle (details period 2, tags period 4, so four flips)
// every one of the 240 nodes standing at mount must be THE SAME NODE. `gateWideKept` asserts that,
// and asserts the counterpart on the reference — that `exodra` keeps exactly the 80 head tags,
// which are the only children whose item never leaves its array, and rebuilds the other 160. If
// that second gate did not exist this row would be a slower copy of `exodra` wearing a cache's
// name, which is the failure `toggle.tsx`'s `gateKeeps` was written against.
//
// WHAT IT IS COMPOSED OF NOW, because the door it used to spell is gone: the same
// `reconcileExoOrder` the reference runs, over a source whose ITEMS ARE THE CHILDREN, so its
// build callback is the identity and nothing is made inside a timed region. The reconciler still
// diffs, inserts, moves and removes; what is different is that the children it removes were told to
// survive it. THE JOB IS UNCHANGED — the same 160 `setValue` calls, the same bytes at every step —
// and what the row still declines to do is rebuild.
//
// ── WHAT RESOLVES THESE ROWS, AND IT IS THE THING MOST LIKELY TO KILL THEM ───────────────────
//
// At batch 16 `wide` resolved 0.94 µs, which is 1.8% of its floor. The differences above are
// expected between 4 and 40 µs, so batch 16 puts the smallest of them at 4-5× the null and the
// largest at 40×. THAT IS THE BATCH THEY NEED, and it is the batch to type:
//
//     npm run axis --workspace=@exodra/benchmarks -- update-floor 100 16
//
// EVERY NEW DIFFERENCE CARRIES ITS OWN REFUSAL. Each is declared in `Transition.attributions` and
// checked in the self-checks against FOUR times the resolution floor taken AT ITS OWN SCALE; when
// it does not clear it, the run names the row, the difference, the null and A BATCH THE OPERATOR
// CAN TYPE — computed on the assumption that this null falls as 1/√batch, which is an ASSUMPTION
// and is labelled as one where it prints. A quantisation refusal would not catch this: at batch 16
// every row here clears three ticks of the clock comfortably and is still free to be unresolved.
//
// AND `wide` GETS A SECOND NULL. `floor·twin` is a duplicate of `floor`, so `|floor − floor·twin|`
// is the scatter of a pair of programs at the FLOOR'S magnitude — which is the right null for
// `floor·record − floor` and `floor·wire − floor·record`, and those two are read against it. It is
// NOT the right null for `exodra − exodra·kept`, which is a
// difference between two rows twice that size. So `exodra·twin` is a second, independently
// declared copy of the `exodra` row — its own run loop, its own DOM, its own mounted app, true
// Δ = 0 — and the renderer-scale rungs are read against THAT.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * ONE FLIP, COUNTED FROM THE SPEC — how many children are built and dropped, and how much registry
 * traffic that implies. It is arithmetic over `startsOpen`, `startCount` and `nextCount`, walked
 * rather than asserted, so it cannot drift from the app it describes.
 *
 * It is printed by the gate beside the rows it sizes. It is a DESCRIPTION of what E1 and E2 do,
 * not an independent claim about them: both loops perform one operation per item per the same
 * three functions, so the census and the loop cannot disagree without one of them being rewritten.
 */
interface TWideCensus {
    readonly built: number;
    readonly dropped: number;
    readonly gets: number;
    readonly sets: number;
    readonly deletes: number;
}

/**
 * THE CYCLE LENGTH OF ONE CARD — the details block has period two and the tag list period
 * `POOL.length`, so `POOL.length` flips return both to where they started (it is even, so it is
 * their least common multiple). Every count below is taken over a whole cycle and divided by it,
 * which is what makes the answer a per-flip figure for ANY starting population rather than only
 * for the uniform one `startCount` happens to produce.
 */
const WIDE_CYCLE = POOL.length;

const WIDE_CENSUS: TWideCensus = ((): TWideCensus => {
    let built = 0;
    let dropped = 0;
    let gets = 0;
    let sets = 0;
    let deletes = 0;
    for (let k = 0; k < IDX.length; k++) {
        const i = IDX[k];
        let open = startsOpen(i);
        let count = startCount(i);
        for (let s = 0; s < WIDE_CYCLE; s++) {
            // THE DETAILS BLOCK. Opening is one child built, one `get` against a registry the last
            // close emptied, and the `set` that follows the miss; closing is one child dropped and
            // the `delete` its own `unmount` performs.
            if (open) {
                dropped++;
                deletes++;
            } else {
                built++;
                gets++;
                sets++;
            }
            open = !open;
            // THE TAG LIST. `remap` asks once per item of the NEW array however the list changed,
            // so the `get` count is the new length; a grow misses on exactly one of them.
            const next = nextCount(count);
            gets += next;
            if (next > count) {
                built++;
                sets++;
            } else {
                dropped += count - next;
                deletes += count - next;
            }
            count = next;
        }
    }
    return {
        built: built / WIDE_CYCLE,
        dropped: dropped / WIDE_CYCLE,
        gets: gets / WIDE_CYCLE,
        sets: sets / WIDE_CYCLE,
        deletes: deletes / WIDE_CYCLE,
    };
})();

// ── E1: THE PER-CHILD RECORD ────────────────────────────────────────────────────────────────

/**
 * THE MARK — this file's own per-element symbol, and one nobody else in this process holds. It
 * used to stand in for `@exodra/dom`'s `EXO_CHILD`; that mark has been removed from the package,
 * so what this replica prices here is a floor participant's own choice and no longer a
 * replica of anything shipped.
 *
 * What is being priced is not the symbol but what STORING one does: the first own property on a
 * freshly cloned element makes the engine give that element a property backing store and move it
 * to a new hidden class, on an object it created microseconds ago. `createExoDomChildFactory` PERFORMED
 * THAT STORE ON EVERY CHILD OF EVERY LIST AND NO LONGER PERFORMS IT AT ALL, so this store pushes
 * the rung ABOVE the shipped per-child record: the shipped child is the constructed record and its
 * `disposers` array, and the element it stands on carries nothing.
 *
 * IT IS NOT AN UPPER BOUND FOR ALL THAT, AND THAT SENTENCE USED TO STAND HERE. The other departure
 * runs the other way: `TFloorRecord` below is THIRTEEN words where a shipped `TExoDomChild` is
 * TWENTY-FOUR, so the object this rung allocates is smaller than the renderer's. The expando pushes
 * the rung up, the missing fields push it down, neither is priced, and the honest reading is an
 * estimate with a named error on each side.
 *
 * The store is left in this participant because removing it would change the hidden class
 * this row has always priced and make every recording already in `measurements/` incomparable with
 * the next run's — see the departure note on `TFloorRecord` below, which makes the same
 * argument about the field count.
 */
const RECORD_MARK = Symbol('update-floor/record');

/**
 * `TExoDomChild`'s field order — see `types/TExoDomChild.ts`, whose header makes the order part of
 * the contract.
 *
 * THE FIRST FOUR SLOTS ARE THE INSTANCE RECORD'S, AND THEY HAVE TO BE FIRST. A `TExoDomChild` IS the
 * record its instance is wired through (`TExoDomInstanceRecord`): `nodes`, `childLists`, `child`
 * and `context` are seated IN FRONT OF `node` by `createExoDomChildFactory`, so that the two shapes one
 * exonode can hold — the bare instance record and this one — read those four at ONE in-object
 * offset. They belong at positions one to four, and a replica that seats them anywhere else puts
 * every field after `node` at the wrong offset.
 *
 * THE DEPARTURE, STATED RATHER THAN HIDDEN: it omits ELEVEN of the shipped record's fields — the
 * seven instance slots between `context` and `node` (`schema`, `written`, `writes`, `adopting`,
 * `publishedChildListEnds`, `state`, `effectStops`) and the four an unbuilt child carries
 * (`pendingSchema`, `wire`, `props`, `outerContext`), which stand between `registryKey` and `live`.
 * So this record is ELEVEN WORDS NARROWER than a real one and `live` lands eleven slots earlier —
 * which costs nothing at that name, because the bare instance record and the child record are
 * different lengths and never shared an offset for it either. What the departure means for the
 * reader is that E1's record-shaped rows price a thirteen-word object where the renderer carries a
 * twenty-four-word one: a LOWER bound on what the record costs, not an equality.
 *
 * IT IS NOT WIDENED TO CLOSE THAT GAP, and that is the one version-shaped argument this repository
 * admits: the figures already in `measurements/` were taken against this width, and changing the
 * field count changes the size and the hidden class, so a wider replica makes the recorded series
 * and the next run's incomparable. The four slots above are added anyway because they are not a
 * width question — they are an OFFSET question, and a replica whose fields sit at different
 * offsets from the renderer's is not a replica of its shape at all. FIGURES IN `measurements/`
 * THAT PREDATE THE FOUR SLOTS PRICED A TEN-WORD RECORD WITH `context` IN THE MIDDLE.
 */
interface TFloorRecord {
    // THE FOUR INSTANCE-RECORD SLOTS, FIRST AND IN `createExoDomChildFactory`'s ORDER. Typed loosely on
    // purpose: what this replica reproduces is the SLOT, and naming `TExoChildLists` or
    // `TExoContextFrame` here would import types nothing on this axis reads.
    //
    // AND FOUR IS NO LONGER THE COUNT, WHICH IS OPEN AND NOT FIXED HERE. The shipped constructor
    // writes ELEVEN in front of `node` — `schema`, `written`, `writes`, `adopting`,
    // `publishedChildListEnds`, `state` and `effectStops` stand between `context` and `node` now —
    // so this replica is seven words narrower again and everything after `node` is at the wrong
    // offset again. Closing it is the same trade the departure note above states: it is an OFFSET
    // repair, which that note says must be made, AND a WIDTH change, which it says makes every
    // recording in `measurements/` incomparable with the next run. That is the owner's call, not a
    // silent one, so the fields are not added here and the axis is left saying what it is.
    nodes: Node[];
    childLists: unknown;
    child: unknown;
    context: unknown;
    node: Element;
    mount(this: TFloorRecord): void;
    unmount(this: TFloorRecord): void;
    disposers: Array<() => void>;
    index: number;
    mark: number;
    registry: Map<unknown, TFloorRecord> | null;
    registryKey: unknown;
    live: TExoLive | null;
}

/** `NO_MOUNT` — one function for the process, so no record allocates a closure. */
const RECORD_NO_MOUNT = function (this: TFloorRecord): void {
    // Nothing, exactly as the shipped default does nothing.
};

/**
 * `DISPOSE_SELF`, including the registry branch it never takes here.
 *
 * The branch is one compare against a field this record carries anyway, and leaving it out would
 * make E1 price a record the renderer does not have. The DELETE that the branch guards belongs to
 * E2, which is why nothing in E1 ever fills `registry`.
 */
const RECORD_DISPOSE = function (this: TFloorRecord): void {
    const registry = this.registry;
    if (registry !== null) {
        registry.delete(this.registryKey);
        this.registry = null;
    }
    const disposers = this.disposers;
    for (let i = 0; i < disposers.length; i++) disposers[i]();
    disposers.length = 0;
};

/**
 * THE NODE TABLE OF AN INSTANCE WITH NOTHING TO RESOLVE — ONE array for the process, exactly as
 * `EXO_EMPTY_NODES` is in `@exodra/dom` and exactly what a fresh record leaves the shipped
 * record holding. A `[]` per record would put an allocation in this replica that
 * `createExoDomChildFactory` does not make.
 */
const RECORD_EMPTY_NODES: Node[] = [];

/** `createExoDomChildFactory`, field for field and store for store — see `TFloorRecord` for the departure. */
function makeFloorRecord(node: Element): TFloorRecord {
    const record: TFloorRecord = {
        // THE FOUR INSTANCE-RECORD SLOTS, FIRST AND IN `createExoDomChildFactory`'s ORDER. All four arrive
        // empty in the shipped constructor too — a child exists before its instance does, and the
        // wire fills them — so this is four stores against four stores, and the seven the shipped
        // one now writes between `context` and `node` are the open question on `TFloorRecord`.
        nodes: RECORD_EMPTY_NODES,
        childLists: null,
        child: null,
        context: null,
        node,
        mount: RECORD_NO_MOUNT,
        unmount: RECORD_DISPOSE,
        disposers: [],
        index: -1,
        mark: 0,
        registry: null,
        registryKey: undefined,
        // LAST, in the position `createExoDomChildFactory` writes it — see the merge note on `TFloorRecord`.
        live: null,
    };
    (node as unknown as Record<symbol, TFloorRecord>)[RECORD_MARK] = record;
    return record;
}

/** Where E1 keeps its records — one slot per slot the floor's node tables already have. */
interface TWideRecords {
    readonly detailsRec: Array<TFloorRecord | null>;
    readonly tagRec: Array<TFloorRecord | null>;
}

function wideRecords(): TWideRecords {
    return {
        detailsRec: new Array<TFloorRecord | null>(IDX.length).fill(null),
        tagRec: new Array<TFloorRecord | null>(IDX.length * POOL.length).fill(null),
    };
}

/**
 * `wideFloorDetails` WITH THE RECORD, and identical to it in every DOM call.
 *
 * Read the two side by side: the clone, the `insertBefore`, the `remove` and the three table
 * stores are the same lines in the same order. What is added is the record on the way in and its
 * `unmount` on the way out.
 */
function wideRecordDetails(f: TWideFloor, r: TWideRecords, k: number): void {
    if (f.open[k] === 1) {
        const record = r.detailsRec[k] as TFloorRecord;
        record.unmount();
        record.index = -1;
        r.detailsRec[k] = null;
        (f.detailsNode[k] as Element).remove();
        f.detailsNode[k] = null;
        f.open[k] = 0;
    } else {
        const d = DETAILS_PROTO.cloneNode(true) as Element;
        const record = makeFloorRecord(d);
        f.cardEl[k].insertBefore(d, f.tagsDiv[k]);
        record.mount();
        r.detailsRec[k] = record;
        f.detailsNode[k] = d;
        f.open[k] = 1;
    }
    // THE SAME TWO VALUE WRITES `wideFloorDetails` MAKES, in the same place — this row adds the
    // record and NOTHING else, so anything the floor writes it writes too.
    const on = f.open[k] === 1;
    f.titleText[k].data = headlineOf(f.title[k], on);
    f.togEl[k].setAttribute('aria-expanded', expandedOf(on));
}

function wideRecordTags(f: TWideFloor, r: TWideRecords, k: number): void {
    const n = f.count[k];
    const next = nextCount(n);
    if (next > n) {
        const t = TAG_PROTO.cloneNode(true) as Element;
        // THE NEW TAG'S TEXT IS ITS LABEL CLIPPED TO ITS OWN USER'S CURRENT SETTING — the tag
        // being added belongs to `tagUserOf(i, next - 1)`, which is NOT the card's user, and the
        // setting is whatever the rounds so far have left in `f.chars`.
        (t.firstChild as Text).data = tagTextOf(
            POOL[next - 1],
            f.chars[tagUserOf(IDX[k], next - 1)]
        );
        const record = makeFloorRecord(t);
        f.tagsDiv[k].appendChild(t);
        record.mount();
        r.tagRec[k * POOL.length + next - 1] = record;
        f.tagNodes[k * POOL.length + next - 1] = t;
    } else {
        for (let j = next; j < POOL.length; j++) {
            const at = k * POOL.length + j;
            const record = r.tagRec[at] as TFloorRecord;
            record.unmount();
            record.index = -1;
            r.tagRec[at] = null;
            (f.tagNodes[at] as Element).remove();
            f.tagNodes[at] = null;
        }
    }
    f.count[k] = next;
    f.countText[k].data = tagsLabel(next);
}

/**
 * THE FLOOR PLUS THE PER-CHILD RECORD — 100 built and 100 dropped per flip, no DOM change.
 *
 * Its records are seeded at setup for the children the initial markup already contains, because a
 * program that had to invent a record for a node it did not build would be doing something the
 * renderer never does — a mounted child's record was made when the child was.
 */
function wideFloorRecord(): Instance {
    const c = el();
    const f = buildWideFloor(c);
    const r = wideRecords();
    for (let k = 0; k < IDX.length; k++) {
        const d = f.detailsNode[k];
        if (d !== null) r.detailsRec[k] = makeFloorRecord(d);
        for (let t = 0; t < POOL.length; t++) {
            const node = f.tagNodes[k * POOL.length + t];
            if (node !== null) r.tagRec[k * POOL.length + t] = makeFloorRecord(node);
        }
    }
    const n = IDX.length;
    return {
        retained: [f, r],
        container: c,
        run: (reps) => {
            for (let rep = 0; rep < reps; rep++) {
                for (let d = 0; d < DECK_IDX.length; d++) wideFloorRename(f, d);
                for (let k = 0; k < n; k++) wideRecordDetails(f, r, k);
                for (let k = 0; k < n; k++) wideRecordTags(f, r, k);
                wideFloorUsers(f);
            }
        },
        dispose: () => c.remove(),
    };
}

// ── E5: THE COMPONENT BOUNDARY ──────────────────────────────────────────────────────────────
//
// `floor·record` AND ONE THING MORE, AND THE ONE THING IS THE SHIPPED FUNCTION. E1 is an imitation
// — a record-shaped literal written out here — and it is worth only as much as the reader's belief
// that the imitation is faithful. This row imports `createExoNodeRecord` out of `@exodra/dom` and calls
// it, over the app's OWN `DETAILS` and `TAG` schemas, with the app's OWN components, on the node
// the floor just cloned. There is nothing to be faithful to: it IS the `createExoNodeRecord` line of
// `buildLiveExoChild`, which is how every reconciled row in the `exodra` row comes to exist.
//
// WHY `createExoNodeRecord` AND NOT `createExoMachineNode`: the two are the same body — the first is a
// seven-line pass-through that reads `component` and calls the second — and the shipped
// build path calls the FIRST, so this row hands over the component, exactly as `buildLiveExoChild`
// does, rather than reaching past it for the machine plan.
//
// WHAT THAT ONE CALL CONTAINS, per instance, read out of `createExoNodeRecord.ts`,
// `createExoMachineNode.ts` and `armExoNode.ts`: the `component` load and the
// pass-through call; the `walk.length`/`setters.length` loads with their compare and the one-slot
// `nodes` array; the `nodes` store; the walk replay over the schema's `walk`; the
// `hasAdjacentChildLists` load and the `childLists` store; the `child` store; the `context` store;
// then inside the arming — the `wire` load and its null compare, THE WIRE, a
// `handlers.length` load on a frozen shared empty and an `effects.length` load with a zero compare;
// and finally the `EXO_ARMED_INSTANCE.value` store that publishes the instance.
//
// `DETAILS` HAS NO PORTS AT ALL and its wiring half is `() => undefined` (read it in
// `apps/exodra/exodra-shared.tsx`), so on 40 of the 100 instances this row builds per flip the wire
// contributes NOTHING and the difference is the boundary alone. `TAG` sets one text port. The row
// therefore prices the boundary and the wire together and cannot separate them, and the 40% with an
// empty wire is the only reason "mostly the boundary" is a reading rather than an assumption. Said
// here because (Q9) commits to it.
//
// IT CLONES THE FLOOR'S OWN PROTOTYPE, NOT THE SCHEMA'S, so that it adds exactly one thing and not
// two. `buildLiveExoChild` opens with `schema.acquireNode(schema)` — a field load and an indirect call
// around the same `cloneNode(true)` the floor already performs — and routing the clone through it
// would put that indirection inside this difference as well. The walk lands identically either
// way: `DETAILS`' declaration has no ports, so its walk is empty, and `TAG`'s single text port is
// reached from a `<span class="tag">` with a text child, which is what `TAG_PROTO` is. The stepped
// byte-gate is what proves that rather than this paragraph.
//
// AND IT CHANGES NO DOM, like E1 before it: `TAG`'s wire writes the label the floor has already
// written, out of the same `POOL`, and `DETAILS`' writes nothing.
//
// WHAT IT IS NOT CHARGED FOR, said out loud: `schema.createChild`, `holdExoInstance`,
// `schema.acquireNode`'s indirection (above), the reconciler that decides a row is wanted at all, and
// `dropExoChild`'s parentage climb — which E1 excluded for its own reason and which no row in this
// file has ever priced.

/**
 * THE APP'S OWN SCHEMAS, resolved once at module load under the very backend the `exodra` row renders
 * from — `EXO_BACKEND`, the one module-level `withExoCompiler(new ExoDomBackend())` in this file, and the schema cache
 * compares it by POINTER. So this is the SAME compiled schema the `exodra` row's rows are built from,
 * out of the same cache slot on the same declaration — not a second schema for an identical shape.
 */
const DETAILS_PLAN = exoDomSchemaOf(DETAILS, EXO_BACKEND);
const TAG_PLAN = exoDomSchemaOf(TAG, EXO_BACKEND);

/** `wideRecordDetails` WITH THE WIRING CALL, and identical to it in every DOM call. */
function wideWireDetails(f: TWideFloor, r: TWideRecords, k: number): void {
    if (f.open[k] === 1) {
        const record = r.detailsRec[k] as TFloorRecord;
        record.unmount();
        record.index = -1;
        r.detailsRec[k] = null;
        (f.detailsNode[k] as Element).remove();
        f.detailsNode[k] = null;
        f.open[k] = 0;
    } else {
        const d = DETAILS_PROTO.cloneNode(true) as Element;
        const record = makeFloorRecord(d);
        // `buildLiveExoChild`'s `createExoNodeRecord` line, in its order: the record exists, and the
        // instance is wired before it is placed. The owner IS the child, exactly as
        // `buildLiveExoChild` passes it, and the context is `null` because nothing in this app
        // provides anything — which is what the `exodra` row's own children inherit too.
        createExoNodeRecord(
            DETAILS_PLAN,
            d,
            DETAILS,
            record as unknown as TExoDomChild,
            // THE RECORD IS THE HOLDER AND THE CHILD BOTH, exactly as `buildLiveExoChild` passes
            // it twice: since the two per-instance records were merged there is nothing to
            // allocate for the sixth argument, and a floor that allocated one would price a record
            // the renderer does not.
            record as unknown as TExoDomChild,
            null
        );
        f.cardEl[k].insertBefore(d, f.tagsDiv[k]);
        record.mount();
        r.detailsRec[k] = record;
        f.detailsNode[k] = d;
        f.open[k] = 1;
    }
    const on = f.open[k] === 1;
    f.titleText[k].data = headlineOf(f.title[k], on);
    f.togEl[k].setAttribute('aria-expanded', expandedOf(on));
}

/**
 * `wideRecordTags` WITH THE WIRING CALL, and identical to it in every DOM call.
 *
 * `bound` IS THE ONE PIECE OF BOOKKEEPING ONLY THIS RUNG NEEDS: one byte per tag SLOT, 1 while that
 * slot holds a tag this function WIRED. A wired tag's text is bound to its user's cell and moves by
 * itself; a tag that came out of the build's `innerHTML` has no subscription and has to be written by
 * hand. Without the flag the third step cannot tell them apart — every standing slot has a RECORD,
 * wired or not, because the build makes one for each mounted tag.
 */
function wideWireTags(
    f: TWideFloor,
    r: TWideRecords,
    pool: readonly TExoCardTag[],
    k: number
): void {
    const n = f.count[k];
    const next = nextCount(n);
    if (next > n) {
        const t = TAG_PROTO.cloneNode(true) as Element;
        // THE NEW TAG'S TEXT IS ITS LABEL CLIPPED TO ITS OWN USER'S CURRENT SETTING — the tag
        // being added belongs to `tagUserOf(i, next - 1)`, which is NOT the card's user, and the
        // setting is whatever the rounds so far have left in `f.chars`.
        (t.firstChild as Text).data = tagTextOf(
            POOL[next - 1],
            f.chars[tagUserOf(IDX[k], next - 1)]
        );
        const record = makeFloorRecord(t);
        // The wire writes the label the line above already wrote — the same string out of the
        // same `POOL` — so the DOM is the floor's and the byte-gate is a formality it still has
        // to pass. The text crosses as a TRANSITION ARGUMENT, fired right after the node is
        // armed, so this rung pays one call where it used to pay one array store.
        createExoNodeRecord(
            TAG_PLAN,
            t,
            TAG,
            record as unknown as TExoDomChild,
            // THE RECORD IS THE HOLDER AND THE CHILD — see `wideWireDetails` for the same pair.
            record as unknown as TExoDomChild,
            null
        );
        f.tagsDiv[k].appendChild(t);
        record.mount();
        r.tagRec[k * POOL.length + next - 1] = record;
        f.tagNodes[k * POOL.length + next - 1] = t;
    } else {
        for (let j = next; j < POOL.length; j++) {
            const at = k * POOL.length + j;
            const record = r.tagRec[at] as TFloorRecord;
            record.unmount();
            record.index = -1;
            r.tagRec[at] = null;
            (f.tagNodes[at] as Element).remove();
            f.tagNodes[at] = null;
        }
    }
    f.count[k] = next;
    f.countText[k].data = tagsLabel(next);
}

/**
 * THE FLIP'S THIRD STEP FOR THE ROW THAT WIRES. `TAG` subscribes to nothing — the app walks its tags
 * (`reclipTags`) — so every tag, wired or not, is written here by hand, exactly as the plain floor
 * writes all forty, and the cell is still set because the app sets it.
 */
function wideWireUsers(f: TWideFloor, users: TWideUsers): void {
    const u = wideNextUser(f);
    const chars = nextChars(f.chars[u]);
    f.chars[u] = chars;
    users.cells[u].setValue(chars);
    wideFloorDates(f, u, chars);
    const hot = f.hot[u];
    const stride = POOL.length;
    for (let h = 0; h < hot.length; h++) {
        const at = hot[h];
        const k = (at / stride) | 0;
        const j = at - k * stride;
        if (j < f.count[k]) {
            ((f.tagNodes[at] as Element).firstChild as Text).data = tagTextOf(POOL[j], chars);
        }
    }
}

/** THE FLOOR PLUS THE RECORD PLUS THE WIRING CALL — 100 instances wired per flip, no DOM change. */
function wideFloorWire(): Instance {
    const c = el();
    const f = buildWideFloor(c);
    const r = wideRecords();
    // One pool of tag items per card, as every other row here keeps: the wire is handed an ITEM and
    // the item's `label` and `chars` are what it reads. The cells are this app's own five — the wire
    // takes a real subscription on them, so they have to be the ones the third step writes.
    const users = wideUsers();
    const pools: (readonly TExoCardTag[])[] = [];
    for (let k = 0; k < IDX.length; k++) {
        pools.push(widePool(IDX[k], users));
        const d = f.detailsNode[k];
        if (d !== null) r.detailsRec[k] = makeFloorRecord(d);
        for (let t = 0; t < POOL.length; t++) {
            const node = f.tagNodes[k * POOL.length + t];
            if (node !== null) r.tagRec[k * POOL.length + t] = makeFloorRecord(node);
        }
    }
    const n = IDX.length;
    return {
        retained: [f, r, pools, users],
        container: c,
        run: (reps) => {
            for (let rep = 0; rep < reps; rep++) {
                for (let d = 0; d < DECK_IDX.length; d++) wideFloorRename(f, d);
                for (let k = 0; k < n; k++) wideWireDetails(f, r, k);
                for (let k = 0; k < n; k++) wideWireTags(f, r, pools[k], k);
                wideWireUsers(f, users);
            }
        },
        dispose: () => c.remove(),
    };
}

// STRUCK: E2 `floor·registry` priced `attachExoList`'s item→child Map on the floor's own nodes —
// 160 maps, 240 gets, 100 sets, 100 deletes per flip, `remap`'s loop body, the answer discarded.
// No registry is consulted by anything today, so the row imitated a mechanism that is deleted.

// ── E3 AND E4: THE RENDERER, WITHOUT THE FAÇADE AND WITHOUT THE REBUILD ──────────────────────

/** The empty state of a children port, shared by every card and both rows. */
const NO_KIDS: readonly TExoNode<TExoDomMark>[] = [];

/**
 * `unmount` FOR A CHILD THAT IS COMING BACK — `toggle.tsx`'s `KEEP_ALIVE`, re-declared here for
 * the same reason its own header gives: one module-level function for every kept child in the
 * process, not a closure per child, and the field exists from construction so the override is a
 * plain store.
 */
const KEEP_ALIVE = function keepAlive(): void {
    // Nothing. The node still leaves the tree; the subscriptions and the wiring do not.
};

// STRUCK: E3 `exodra·children` priced the `bindList` façade by wiring the same app with
// `c.bindChildren` over harness-built children. Both doors are deleted and both spellings are now
// the one `reconcileExoOrder`, so the row differed from `exodra` only in who calls `c.createExoNode` and
// its number could not be the façade. The connector it parked in a module field went with it.

/** What the harness keeps for one card of `exodra·kept` — everything, built once. */
interface TWideKeptHold {
    readonly pool: readonly TExoCardTag[];
    /** The details port's open value: one array, holding the one child, forever. */
    readonly detailsOpen: TExoNode<TExoDomMark>[];
    /** `tagSlices[n - 1]` is the first `n` tag children — four arrays, filled at mount. */
    readonly tagSlices: readonly TExoNode<TExoDomMark>[][];
}

interface TWideKeptCard {
    reclip: (cell: TExoBenchSource<number>) => void;
    readonly i: number;
    readonly hold: TWideKeptHold;
    readonly details: TExoBenchSource<readonly TExoNode<TExoDomMark>[]>;
    readonly tags: TExoBenchSource<readonly TExoNode<TExoDomMark>[]>;
}

/**
 * THE IDENTITY BUILD, one function for the process. A source whose items are already children
 * needs nothing made, and a closure per card per port would be an allocation this row claims not
 * to have.
 */
const KEPT_CHILD = (kid: TExoNode<TExoDomMark>): TExoNode<TExoDomMark> => kid;

function wideKeptHold(i: number, users: TWideUsers): TWideKeptHold {
    const tagSlices: TExoNode<TExoDomMark>[][] = [];
    for (let n = 1; n <= POOL.length; n++) tagSlices.push(new Array<TExoNode<TExoDomMark>>(n));
    return {
        pool: widePool(i, users),
        detailsOpen: new Array<TExoNode<TExoDomMark>>(1),
        tagSlices,
    };
}

/**
 * THE SAME CARD AGAIN, WITH EVERY CHILD BUILT AT MOUNT AND TOLD TO SURVIVE.
 *
 * `exoNodeDom(child).unmount = KEEP_ALIVE` is the documented extension point and the whole of what
 * this row does differently: the node still leaves the tree when its array shrinks, and everything
 * else about the child — its wiring, its subscriptions, its record — survives to be put back.
 */
const WIDE_CARD_KEPT_SCHEMA = createExoSchema((b) => {
    let index!: TExoAttrPort;
    let title!: TExoTextPort;
    let user!: TExoTextPort;
    let toggle!: TExoEventPort;
    let expanded!: TExoAttrPort;
    let details!: TExoChildrenPort;
    let tags!: TExoChildrenPort;
    let count!: TExoTextPort;
    let addTag!: TExoEventPort;
    b.el('div', { class: 'card' }, (card) => {
        index = card.port('data-i');
        card.el('h3', null, (h3) => {
            title = h3.textPort();
        });
        // The card's user NAME — the app's seventh element, a constant text, filled once.
        card.el('span', { class: 'user' }, (span) => {
            user = span.textPort();
        });
        card.el('button', { class: 'tog' }, (btn) => {
            toggle = btn.eventPort('click');
            expanded = btn.port('aria-expanded');
            btn.text('details');
        });
        details = card.childrenPort();
        card.el('div', { class: 'tags' }, (list) => {
            tags = list.childrenPort();
        });
        card.el('span', { class: 'count' }, (span) => {
            count = span.textPort();
        });
        card.el('button', { class: 'addtag' }, (btn) => {
            addTag = btn.eventPort('click');
            btn.text('+');
        });
    });
    return { index, title, user, toggle, expanded, details, tags, count, addTag };
});
const mWIDE_CARD_KEPT = createExoMachine(WIDE_CARD_KEPT_SCHEMA, {
    createInitialState: (c: TExoDomNode, card: TWideKeptCard) => {
        const title = titleOf(card.i);
        c.attr(WIDE_CARD_KEPT_SCHEMA.ports.index, String(card.i));
        c.text(WIDE_CARD_KEPT_SCHEMA.ports.user, userNameOf(cardUserOf(card.i)));
        c.on(WIDE_CARD_KEPT_SCHEMA.ports.toggle, NOOP);
        const hold = card.hold;
        const d = wireExoNode(c.createExoNode(DETAILS));
        exoNodeDom(d).unmount = KEEP_ALIVE;
        hold.detailsOpen[0] = d;
        for (let t = 0; t < POOL.length; t++) {
            const kid = wireExoNode(c.createExoNode(TAG));
            writeTagLabel(
                kid as unknown as TExoMachineNode,
                tagTextOf(hold.pool[t].label, hold.pool[t].chars.getValue())
            );
            exoNodeDom(kid).unmount = KEEP_ALIVE;
            // Every slice long enough to contain this position gets it, so the four arrays
            // are complete before the first update and nothing is written inside a region.
            for (let n = t; n < POOL.length; n++) hold.tagSlices[n][t] = kid;
        }
        const kids = hold.tagSlices[POOL.length - 1];
        card.reclip = (cell) => {
            const chars = cell.getValue();
            for (let t = POOL.length - 1; t >= 0; t--) {
                const tag = hold.pool[t];
                if (tag.chars !== cell) continue;
                writeTagLabel(kids[t] as unknown as TExoMachineNode, tagTextOf(tag.label, chars));
            }
        };
        card.details.setValue(startsOpen(card.i) ? hold.detailsOpen : NO_KIDS);
        card.tags.setValue(hold.tagSlices[startCount(card.i) - 1]);
        c.on(WIDE_CARD_KEPT_SCHEMA.ports.addTag, NOOP);
        return {
            card,
            title,
            detailsList: (c as TExoDomNode & TExoDomPortChildList).portChildList(
                WIDE_CARD_KEPT_SCHEMA.ports.details
            ),
            tagList: (c as TExoDomNode & TExoDomPortChildList).portChildList(
                WIDE_CARD_KEPT_SCHEMA.ports.tags
            ),
            shownDetails: [] as TExoNode<TExoDomMark>[],
            shownTags: [] as TExoNode<TExoDomMark>[],
        };
    },
});
const WIDE_CARD_KEPT = composeExoMachine(
    mWIDE_CARD_KEPT,
    (m) =>
        withExoTransitions(m, {
            // THE SAME TRANSITIONS AS `WIDE_CARD`, over sources whose ITEMS ARE THE CHILDREN, so the build is
            // the identity and nothing is ever made inside a timed region. The reconciler still diffs, inserts,
            // moves and removes, and the children it removes are the ones KEEP_ALIVE told to survive.
            showWideKeptDetails: (c) => {
                const state = c.state;
                const kids = state.card.details.getValue();
                c.text(
                    WIDE_CARD_KEPT_SCHEMA.ports.title,
                    headlineOf(state.title, kids.length === 1)
                );
                c.attr(WIDE_CARD_KEPT_SCHEMA.ports.expanded, expandedOf(kids.length === 1));
                state.shownDetails = reconcileExoOrder(
                    state.detailsList,
                    state.shownDetails,
                    kids,
                    kids,
                    KEPT_CHILD
                );
            },
            showWideKeptTags: (c) => {
                const state = c.state;
                const kids = state.card.tags.getValue();
                c.text(WIDE_CARD_KEPT_SCHEMA.ports.count, tagsLabel(kids.length));
                state.shownTags = reconcileExoOrder(
                    state.tagList,
                    state.shownTags,
                    kids,
                    kids,
                    KEPT_CHILD
                );
            },
        }),
    (m) => {
        const { showWideKeptDetails, showWideKeptTags } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showWideKeptDetails(c);
                return c.state.card.details.onChange(() => showWideKeptDetails(c));
            });
            effect((c) => {
                showWideKeptTags(c);
                return c.state.card.tags.onChange(() => showWideKeptTags(c));
            });
        });
    }
);

function mountWideKept(
    container: HTMLElement,
    cards: readonly TWideKeptCard[],
    decks: readonly TWideDeck[]
): () => void {
    const slices = perDeck(cards);
    return mountWideDecks(container, decks, (c, port, d) => {
        c.list(port, WIDE_CARD_KEPT, slices[d]);
    });
}

/**
 * E4 — THE DIAGNOSTIC. 160 `setValue` calls into arrays that already exist: no clone, no wiring
 * pass, no record, no disposal, nothing BUILT.
 *
 * IT DOES ALLOCATE: the reconciler splices its own mirror on every notification and returns a fresh
 * empty one whenever a list empties. The REFERENCE pays exactly the same per
 * notification, which is why `exodra − exodra·kept` still isolates build-and-drop — but the row is
 * not allocation-free and nothing here measures the collector.
 *
 * NOT A FLOOR. See the header: the floor cannot decline to rebuild and this row does.
 */
function wideExodraKept(): Instance {
    const c = el();
    const cards: TWideKeptCard[] = [];
    const open = new Uint8Array(IDX.length);
    const count = new Int32Array(IDX.length);
    // THIS ROW'S USER WRITE REACHES MORE TAGS THAN ANY OTHER ROW'S, and that is what keep-alive
    // costs here rather than an unfairness: all FOUR positions of every card are built at the mount
    // and told to survive, so all four stay subscribed whether they are standing or parked. One
    // setting therefore moves 64 texts where the rebuilding rows move the 40 that are on screen. The
    // parked ones are out of the tree, so the bytes are identical and the work is not.
    const users = wideUsers();
    for (let k = 0; k < IDX.length; k++) {
        const i = IDX[k];
        open[k] = startsOpen(i) ? 1 : 0;
        count[k] = startCount(i);
        cards.push({
            i,
            hold: wideKeptHold(i, users),
            details: createExoBenchSource<readonly TExoNode<TExoDomMark>[]>(NO_KIDS),
            tags: createExoBenchSource<readonly TExoNode<TExoDomMark>[]>(NO_KIDS),
            reclip: NOOP,
        });
    }
    const decks = wideDecks(users);
    const dispose = mountWideKept(c, cards, decks);
    const n = IDX.length;
    return {
        retained: [cards, decks],
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                wideRenameDecks(decks);
                for (let k = 0; k < n; k++) {
                    const card = cards[k];
                    const on = open[k] === 1 ? 0 : 1;
                    open[k] = on;
                    card.details.setValue(on === 1 ? card.hold.detailsOpen : NO_KIDS);
                }
                for (let k = 0; k < n; k++) {
                    const card = cards[k];
                    const next = nextCount(count[k]);
                    count[k] = next;
                    card.tags.setValue(card.hold.tagSlices[next - 1]);
                }
                wideAdvanceUserWalk(users, cards);
            }
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

/**
 * THE NULL AT THE RENDERER'S MAGNITUDE — a second, independently declared copy of the `exodra` row.
 *
 * `floor·twin` is the right null for `floor·record − floor` and `floor·wire − floor·record`, which
 * are differences between two programs of the floor's size. It is NOT the right null for
 * `exodra − exodra·kept` or `exodra·kept − floor·bound`, which are differences between rows
 * twice that size, and a null taken at the wrong magnitude would make those two look better
 * resolved than they are. So this row exists: its own function object, its own DOM, its own
 * mounted app, the identical work on identical data. True Δ = 0.
 *
 * It is duplicated SOURCE and not a second call to `wideExodra`, for the reason every other twin
 * in this file is: calling one function twice shares everything V8 learned about it.
 */
function wideExodraTwin(): Instance {
    const c = el();
    const st = wideState();
    const dispose = mountWideExodra(c, st.cards, st.decks);
    const n = IDX.length;
    return {
        retained: st,
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                wideRenameDecks(st.decks);
                for (let k = 0; k < n; k++) {
                    const on = st.open[k] === 1 ? 0 : 1;
                    st.open[k] = on;
                    st.cards[k].details.setValue(on === 1 ? OPEN : SHUT);
                }
                for (let k = 0; k < n; k++) {
                    const next = nextCount(st.count[k]);
                    st.count[k] = next;
                    st.cards[k].tags.setValue(st.slices[k][next]);
                }
                wideAdvanceUserWalk(st.users, st.cards);
            }
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

/**
 * THE SAME NULL AGAIN, TAKEN NEXT DOOR — a THIRD declaration of the `exodra` program, identical to
 * `exodra·twin` in every line and different from it in ONE thing that is not in this function at
 * all: it is declared IMMEDIATELY AFTER `exodra` in the transition's program list, where
 * `exodra·twin` is declared last.
 *
 * WHY THAT WAS A VARIABLE AND NOT A DETAIL — AND WHAT HAS SINCE CHANGED UNDER IT. `runPhases` USED
 * TO rotate the START of the phase list — `phases[(k + shift) % phases.length]` — a rigid rotation,
 * which therefore never changed the CYCLIC ORDER: every phase had the same predecessor in every
 * round of every run and all the rotation moved was where a round was cut. IT NOW SHUFFLES per
 * round from a seed derived from the round index (`orderForRound`), so this row's question is open
 * again as a MEASUREMENT rather than settled by construction, and the figures quoted just below are
 * the ROTATION's — they belong to `measurements/update-floor.published.json` and may not be put
 * beside a number from a run under the shuffle. `floor` and `floor·twin` are adjacent and their
 * bias on the recorded run is 0.0001 µs. `exodra` and `exodra·twin` stand at the two ENDS of this
 * transition's program list — `exodra`'s predecessor is the last row of the PREVIOUS transition,
 * and on the recorded run seven phases stood between them — and their bias is 9.3750 µs,
 * 7.8% of their own median, which puts the bar for every renderer-scale attribution at 37.5 µs and
 * refuses two of the five this transition declares. If a null's value depends on where its two
 * halves stand, that bar is a property of the phase list and not of the instrument.
 *
 * THE TWO NULLS ARE TAKEN IN ONE RUN, UNDER ONE ORDERING, so the difference between them is the
 * positional effect and nothing else. Neither of them replaces the other: `rendererNull` still
 * names the FAR pair, because the conservative bar is the one that cannot flatter a rung, and
 * lowering it on the strength of this row would be assuming the answer this row exists to ask.
 *
 * IT IS DUPLICATED SOURCE for the reason every other twin here is: calling one function twice
 * shares everything V8 learned about it.
 */
function wideExodraTwinNear(): Instance {
    const c = el();
    const st = wideState();
    const dispose = mountWideExodra(c, st.cards, st.decks);
    const n = IDX.length;
    return {
        retained: st,
        container: c,
        run: (reps) => {
            for (let r = 0; r < reps; r++) {
                wideRenameDecks(st.decks);
                for (let k = 0; k < n; k++) {
                    const on = st.open[k] === 1 ? 0 : 1;
                    st.open[k] = on;
                    st.cards[k].details.setValue(on === 1 ? OPEN : SHUT);
                }
                for (let k = 0; k < n; k++) {
                    const next = nextCount(st.count[k]);
                    st.count[k] = next;
                    st.cards[k].tags.setValue(st.slices[k][next]);
                }
                wideAdvanceUserWalk(st.users, st.cards);
            }
        },
        dispose: () => {
            dispose();
            c.remove();
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE TABLE OF TRANSITIONS. Every gate, every phase and every ladder line is read from this
// list, so a program cannot be gated and then measured through a different entry point.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const f4 = (x: number): string => x.toFixed(4);
const f6 = (x: number): string => x.toFixed(6);
const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
const pct = (x: number, of: number): string => (of === 0 ? '—' : `${((x / of) * 100).toFixed(1)}%`);

const TRANSITIONS: readonly Transition[] = [
    {
        name: 'text-one',
        unit: 'µs per ONE changed text value',
        what: `one row of ${TEXT_NODES} changes its text — reactive-update's app, one write`,
        reps: 20000,
        gateSteps: 8,
        programs: [
            {
                name: 'exodra',
                what: 'source.setValue → the bound text port',
                kind: 'exodra',
                contract: 'told',
                gated: true,
                setup: textOneExodra,
            },
            {
                name: 'floor',
                what: 'text.data = str on a node the program holds — THE FLOOR',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: textOneFloor,
            },
            {
                name: 'floor·twin',
                what: 'THE NULL — a duplicated declaration of `floor`, own DOM. True Δ = 0',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: textOneFloorTwin,
            },
            {
                name: 'floor·guard',
                what: "the floor plus createExoTextSubscriber's three identity compares — the translator fallback",
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: textOneFloorGuard,
            },
            {
                name: 'floor·bound',
                what: 'the floor reached through the SAME source and the SAME setValue',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: textOneFloorBound,
            },
            {
                name: 'loop',
                what: 'THE CONTROL — the same loop with the DOM write deleted. True DOM work = 0',
                kind: 'control',
                contract: 'none',
                gated: false,
                setup: textOneLoop,
            },
        ],
        ladder: (m) => [
            `  dispatch + its closure ${sign(
                m('floor·bound') - m('floor')
            )}   floor·bound − floor: ` +
                'one setValue (a compare, a field load, one call) and the closure a subscription ' +
                'needs in order to have something to call. The renderer pays this too — it is not ' +
                'overhead, it is the price of being notified at all.',
            `  translator guard       ${sign(
                m('floor·guard') - m('floor')
            )}   floor·guard − floor: ` +
                'the three identity compares before the write. They buy survival under a page ' +
                'translator that replaced our Text node; the bare floor has no such recovery.',
            `  everything else        ${sign(m('exodra') - m('floor·bound'))}   exodra − ` +
                'floor·bound: getValue(), the null test, String(), the guard above, and the port ' +
                'and schema indirection that make the position addressable by name.',
            `  the harness            ${f4(
                m('loop')
            )}   the loop alone. Every row above contains ` +
                'it, including the floor — which is why the floor is read against this and not ' +
                'against zero.',
        ],
    },
    {
        name: 'text-sweep',
        unit: `µs per SWEEP of ${TEXT_NODES} changed text values`,
        what: "all 1000 rows change — reactive-update's sweep, unchanged",
        reps: 20,
        gateSteps: 8,
        programs: [
            {
                name: 'exodra',
                what: `${TEXT_NODES} setValue calls into ${TEXT_NODES} bound text ports`,
                kind: 'exodra',
                contract: 'told',
                gated: true,
                setup: textSweepExodra,
            },
            {
                name: 'floor',
                what: `${TEXT_NODES} .data stores on ${TEXT_NODES} held nodes — THE FLOOR`,
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: textSweepFloor,
            },
            {
                name: 'floor·twin',
                what: 'THE NULL — a duplicated declaration of `floor`, own DOM. True Δ = 0',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: textSweepFloorTwin,
            },
            {
                name: 'floor·bound',
                what: 'the same stores reached through 1000 sources and 1000 setValue calls',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: textSweepFloorBound,
            },
            {
                name: 'loop',
                what: 'THE CONTROL — the same two loops with the DOM write deleted',
                kind: 'control',
                contract: 'none',
                gated: false,
                setup: textSweepLoop,
            },
        ],
        ladder: (m) => [
            `  dispatch + its closure ${sign(
                m('floor·bound') - m('floor')
            )}   floor·bound − floor, ` + `over ${TEXT_NODES} sources instead of one`,
            `  everything else        ${sign(
                m('exodra') - m('floor·bound')
            )}   exodra − floor·bound`,
            `  the harness            ${f4(m('loop'))}   the two loops alone`,
            `  per write              exodra ${f4(m('exodra') / TEXT_NODES)} µs · floor ${f4(
                m('floor') / TEXT_NODES
            )} µs — the same quantity text-one reports, reached by dividing a sweep. The two ` +
                'differ in one thing besides grouping: this row touches a thousand DIFFERENT ' +
                'nodes where text-one touches one hot node a thousand times.',
        ],
    },
    {
        name: 'reorder',
        unit: 'µs per REORDER of 200 rows',
        what: "the same 200 items in a different order — reconcile's shuffle",
        reps: 24,
        gateSteps: 10,
        programs: [
            {
                name: 'exodra',
                what:
                    'reconcileExoOrder in a transition, handed the new array — the ' +
                    'general reconcile',
                kind: 'exodra',
                contract: 'derive',
                gated: true,
                setup: reorderExodra,
            },
            {
                name: 'floor·told',
                what: 'handed the mover flags: one backward walk, the minimum insertBefore calls',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: reorderFloorTold,
            },
            {
                name: 'floor·twin',
                what: 'THE NULL — a duplicated declaration of `floor·told`, own DOM. True Δ = 0',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: reorderFloorToldTwin,
            },
            {
                name: 'floor·diff',
                what: 'handed only the new array: stamps, removes, LIS, then the SAME moves',
                kind: 'floor',
                contract: 'derive',
                gated: true,
                setup: reorderFloorDiff,
            },
            // STRUCK HERE WITH THEIR PROGRAMS: `floor·record`, `floor·seq`, `floor·place`,
            // `floor·registry` and `exodra·children`. See the note above `reorderExodraTwin`.
            {
                name: 'exodra·twin',
                what:
                    'THE SECOND NULL — a duplicated declaration of `exodra`, own list, own DOM. ' +
                    "True Δ = 0, taken at the RENDERER's magnitude rather than the floor's",
                kind: 'null',
                contract: 'derive',
                gated: true,
                setup: reorderExodraTwin,
            },
        ],
        rendererNull: ['exodra', 'exodra·twin'],
        attributions: [
            // R1-R6 ARE STRUCK, WITH THE RECONCILER THEY DECOMPOSED. The only difference left on
            // this transition that is a claim rather than a reading is `exodra − floor·diff`, which
            // the ladder prints as `bookkeeping` and which NOTHING here takes apart any more: it is
            // a renderer-scale difference against a floor-scale pair, so it carries no attribution
            // and may not be quoted as one.
        ],
        ladder: (m, resolution, rendererResolution) => [
            `  discovery              ${sign(m('floor·diff') - m('floor·told'))}   floor·diff − ` +
                'floor·told: five linear passes over 200 items and one O(n log n) LIS, against ' +
                'being handed the answer. THE DOM WORK IS IDENTICAL — the same nodes move to the ' +
                'same places — so this difference is the price of finding out WHAT to move, and ' +
                "nothing else. It is the framework's job, priced alone.",
            `  discovery's share      ${pct(
                m('floor·diff') - m('floor·told'),
                m('floor·diff')
            )} of the deriving floor`,
            `  bookkeeping            ${sign(m('exodra') - m('floor·diff'))}   exodra − ` +
                'floor·diff: two DIFFERENT algorithms, not one algorithm through two storages — ' +
                'the floor stamps, computes a longest increasing subsequence and walks backwards ' +
                'over Int32Arrays indexed by a dense integer id; reconcileExoOrder keeps an ' +
                'array mirror of the order, trims the common head and tail, and builds an ' +
                "item→position Map for the middle. The dense indexing is a capability of the FLOOR'S DATA and a " +
                'renderer cannot assume it. NOTHING TAKES THIS LINE APART ANY MORE: the five rungs ' +
                'that did were a decomposition of the reconciler that has since been deleted.',
            `  per row                exodra ${f4(m('exodra') / RE_ROWS)} µs · floor·diff ${f4(
                m('floor·diff') / RE_ROWS
            )} µs — one of the ${RE_ROWS}`,
        ],
    },
    {
        name: 'grow-shrink',
        unit: 'µs per ONE list op (insert · append · remove · remove-last)',
        what: "a 300-row list gains and loses rows — list-update's ops, as a four-op cycle",
        // 400 AND NOT 160: the told floor here is one clone, one insertion and one splice — a
        // microsecond or so — and 160 of those is under three ticks of the clock, which is the
        // one row in this transition that must NOT be quantised, because everything else is read
        // against it. The renderer's row pays for that with a region of several milliseconds.
        reps: 400,
        gateSteps: 10,
        programs: [
            {
                name: 'exodra',
                what:
                    'reconcileExoOrder in a transition, handed the new array — must find ' +
                    'the change',
                kind: 'exodra',
                contract: 'derive',
                gated: true,
                setup: growExodra,
            },
            {
                name: 'floor·told',
                what: 'handed the op: build or remove one row, splice one flat Element[] — THE FLOOR',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: growFloorTold,
            },
            {
                name: 'floor·twin',
                what: 'THE NULL — a duplicated declaration of `floor·told`, own DOM. True Δ = 0',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: growFloorToldTwin,
            },
            {
                name: 'floor·diff',
                what: 'handed only the new array: the same hand-written reconciler as `reorder`',
                kind: 'floor',
                contract: 'derive',
                gated: true,
                setup: growFloorDiff,
            },
        ],
        ladder: (m) => [
            `  discovery, by hand     ${sign(m('floor·diff') - m('floor·told'))}   floor·diff − ` +
                'floor·told: the same question asked of a program with no framework in it at all.',
            `  NO told PAIR           there is no renderer ` +
                'row on this transition that was given the same information as floor·told. The ' +
                'cross-contract ratio against it is printed by the ANSWER as the WIDER, WEAKER ' +
                'bound and is not a contract-matched number.',
            `  derive vs derive       ${f4(m('exodra') / m('floor·diff'))}× — exodra against ` +
                'floor·diff, the two rows that had to work it out',
        ],
    },
    {
        // ═══ EVERY RECORDED NUMBER IN THIS TRANSITION'S `reading` BLOCK PREDATES THE APP'S THREE
        // DERIVED VALUES AND HAS TO BE RE-RUN. Said here rather than quietly left standing, because
        // a stale figure with a citation reads exactly like a fresh one.
        //
        // WHAT MOVED UNDER THEM. A flip used to be STRUCTURE ONLY — insert or remove a details
        // block, append or remove tag rows — and every row on this transition now also writes three
        // VALUES per card: the headline, `aria-expanded` and the count label. That is 240 more
        // writes per flip on EVERY row, floor and renderer alike, so the absolute µs of every row
        // is larger than what is recorded below.
        //
        // WHAT DID NOT MOVE, and it is why the ladder's SHAPE is still the right shape: the three
        // writes were added to every row in the same place and in the same number, the transition
        // still runs on the app's own 160 `setValue` calls, and nothing about the per-child record,
        // the registry traffic or the boundary changed. `WIDE_CENSUS`'s built/dropped/gets/sets/
        // deletes are children counts and are unmoved. So the DIFFERENCES the ladder attributes are
        // between rows that each grew by the same three writes — but "each grew by the same amount"
        // is a claim about the writes being identical, not a measurement, and the ratios printed
        // below are ratios of numbers that no longer exist. ═══
        name: 'wide',
        unit: 'µs per FLIP (80 details toggles + 80 tag-list advances)',
        what: "the 80-card app's whole update round — app-update's flip, without the click harness",
        reps: 8,
        gateSteps: 8,
        programs: [
            {
                name: 'exodra',
                what: '160 setValue calls into 160 bound children ports',
                kind: 'exodra',
                contract: 'told',
                gated: true,
                setup: wideExodra,
            },
            // DECLARED HERE, IMMEDIATELY AFTER THE ROW IT IS A NULL OF, AND THAT POSITION IS THE
            // WHOLE OF WHAT IT MEASURES. `exodra·twin` near the bottom of this list is the same
            // program in the same words; the two differ only in where they stand, which under the
            // OLD rotation fixed which phase ran in front of them for a whole run and under the
            // per-round shuffle should now buy nothing. See (Q7), and `floor·twin·far` for the same
            // question asked at the floor's magnitude.
            {
                name: 'exodra·twin·near',
                what:
                    'THE SAME NULL, NEXT DOOR — a third declaration of `exodra`, own app, own ' +
                    'DOM, declared adjacent to it instead of seven phases away. True Δ = 0',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: wideExodraTwinNear,
            },
            {
                name: 'floor',
                what: '80 clone+insertBefore or remove, 80 clone+append or 3 removes — THE FLOOR',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: wideFloor,
            },
            {
                name: 'floor·twin',
                what: 'THE NULL — a duplicated declaration of `floor`, own DOM. True Δ = 0',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: wideFloorTwin,
            },
            {
                name: 'floor·bound',
                what: 'the same work reached through 160 sources and 160 setValue calls',
                kind: 'floor',
                contract: 'told',
                gated: true,
                setup: wideFloorBound,
            },
            {
                name: 'floor·record',
                what:
                    `E1 — the floor plus a child-record-shaped object on each of the ${WIDE_CENSUS.built} ` +
                    'children it builds (13 fields, an empty disposers array, mount(), PLUS a symbol ' +
                    'expando on the fresh element that the renderer no longer writes) ' +
                    'and disposeExoChildSelf on each of the ' +
                    `${WIDE_CENSUS.dropped} it drops. NO DOM CHANGE.`,
                kind: 'rung',
                contract: 'told',
                gated: true,
                setup: wideFloorRecord,
            },
            {
                name: 'floor·wire',
                what:
                    'E5 — floor·record plus the SHIPPED createExoNodeRecord on each of the ' +
                    `${WIDE_CENSUS.built} children it builds: the DETAILS and TAG schemas and ` +
                    'components the app itself renders, the walk replay, the four field stores, ' +
                    'the arming and the publish. NOT an imitation — the imported function, the ' +
                    'one `buildLiveExoChild` calls. NO DOM CHANGE.',
                kind: 'rung',
                contract: 'told',
                gated: true,
                setup: wideFloorWire,
            },
            // STRUCK HERE WITH THEIR PROGRAMS: `floor·registry` (E2) and `exodra·children` (E3).
            // See the strike note where E1's and E5's prose begins.
            {
                name: 'exodra·kept',
                what:
                    'E4 — A DIAGNOSTIC, NOT A FLOOR: every child built once and told to survive ' +
                    'removal, the sources cycling between arrays that already exist. Builds ' +
                    'nothing and drops nothing; it still runs the same reconciler the reference ' +
                    'does. Read it against exodra.',
                kind: 'diagnostic',
                contract: 'told',
                gated: true,
                setup: wideExodraKept,
            },
            {
                name: 'exodra·twin',
                what:
                    'THE SECOND NULL — a duplicated declaration of `exodra`, own app, own DOM. ' +
                    "True Δ = 0, taken at the RENDERER's magnitude rather than the floor's",
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: wideExodraTwin,
            },
            // DECLARED LAST, AND THE POSITION IS THE WHOLE OF WHAT IT MEASURES — the mirror of
            // `exodra·twin·near` at the FLOOR's magnitude. See `wideFloorTwinFar`.
            {
                name: 'floor·twin·far',
                what:
                    'THE INSTRUMENT MEASURING ITSELF — a third declaration of `floor`, own DOM, ' +
                    'placed as far from it as this list allows, where floor·twin sits next door. ' +
                    'True Δ = 0. It is the ONLY floor-scale null in this file taken on a ' +
                    'NON-adjacent pair, which is the shape of every attribution the floor-scale ' +
                    'bar bounds. Read it against |floor − floor·twin|: agreement says the ' +
                    'per-round shuffle removed position; disagreement says every rung here is ' +
                    'bounded by the friendliest pair in the list. NOT A FLOOR, never a bound.',
                kind: 'null',
                contract: 'told',
                gated: true,
                setup: wideFloorTwinFar,
            },
        ],
        rendererNull: ['exodra', 'exodra·twin'],
        attributions: [
            {
                of: 'floor·record',
                against: 'floor',
                scale: 'floor',
                what:
                    `E1, the per-child record over ${WIDE_CENSUS.built} children built ` +
                    `and ${WIDE_CENSUS.dropped} dropped`,
            },
            {
                of: 'exodra',
                against: 'exodra·kept',
                scale: 'renderer',
                what: 'E4, everything proportional to build and drop',
            },
            {
                of: 'exodra·kept',
                against: 'floor·bound',
                scale: 'renderer',
                what: 'E4, what is left once nothing is built or dropped',
            },
            // E5 — THE COMPONENT BOUNDARY, at the floor's scale where the bar is small. See (Q9).
            {
                of: 'floor·wire',
                against: 'floor·record',
                scale: 'floor',
                what: `E5, createExoNodeRecord over the ${WIDE_CENSUS.built} children built per flip`,
            },
        ],
        ladder: (m, resolution, rendererResolution) => [
            `  dispatch + its closures ${sign(m('floor·bound') - m('floor'))}   floor·bound − ` +
                'floor: 160 setValue calls and the 160 closures a subscription needs, against a ' +
                'straight loop over flat arrays. The renderer pays this too.',
            `  everything else         ${sign(m('exodra') - m('floor·bound'))}   exodra − ` +
                'floor·bound: the children reconcile, the row records, the per-child node and the ' +
                'component boundary for every block built. THE LINES BELOW ARE THIS ONE, TAKEN ' +
                'APART. IT USED TO NAME THE REGION ANCHORS AS A FIFTH COMPONENT AND THEY ARE NOT ' +
                "IN IT: this card's two children ports are not siblings, so the schema has no " +
                'region chain, no anchor closure is ever built, and per update the anchors are one ' +
                'typeof compare on each insertion — see (Q11) in the header for the code that ' +
                'says so.',
            '',
            `  E1 the per-child record ${sign(m('floor·record') - m('floor'))}   floor·record − ` +
                `floor: ${WIDE_CENSUS.built} of a thirteen-field stand-in for the child maker's ` +
                `twenty-four-word object, its empty ` +
                `disposers array and a symbol expando the RENDERER no longer writes (the expando ` +
                `pushes this above the shipped record, the eleven missing fields push it below), ` +
                `built and then dropped again, with no ` +
                `framework in the frame. ${f4(
                    ((m('floor·record') - m('floor')) * 1000) / WIDE_CENSUS.built
                )} ns each. Null ${f6(resolution)} µs.`,
            `  E4 build and drop       ${sign(m('exodra') - m('exodra·kept'))}   exodra − ` +
                `exodra·kept: everything proportional to making ${WIDE_CENSUS.built} children and ` +
                `letting ${WIDE_CENSUS.dropped} go — the clone, the wiring pass, the record, the ` +
                `disposal. Null ${f6(rendererResolution)} µs.`,
            `  E4 what is left         ${sign(m('exodra·kept') - m('floor·bound'))}   ` +
                'exodra·kept − floor·bound: what scales with NOTIFICATIONS once nothing is built ' +
                'or dropped — the reconcile itself and the port indirection. NOT the region ' +
                'anchors: this schema has no chain and builds no anchor closure, (Q11). ' +
                `Null ${f6(rendererResolution)} µs.`,
            `  E5 the boundary         ${sign(
                m('floor·wire') - m('floor·record')
            )}   floor·wire − ` +
                `floor·record: the SHIPPED createExoNodeRecord, over ${WIDE_CENSUS.built} instances ` +
                'per flip — the machine load and pass-through, the walk replay, the four field ' +
                'stores, the arming and the publish, and the wire itself. 40 of those wires belong ' +
                `to DETAILS, which has no ports and does nothing. ${f4(
                    ((m('floor·wire') - m('floor·record')) * 1000) / WIDE_CENSUS.built
                )} ns each. Null ${f6(resolution)} µs.`,
            '',
            `  THE NULL, TWICE        far ${f4(
                Math.abs(m('exodra') - m('exodra·twin'))
            )} µs · near ${f4(Math.abs(m('exodra') - m('exodra·twin·near')))} µs — the bias of ` +
                'two renderer-scale nulls whose true difference is ZERO, taken in this same run ' +
                `under this same ordering (${ORDERING}). exodra·twin is declared near the bottom ` +
                'of these programs, at the other end of the list from exodra; exodra·twin·near is ' +
                'declared immediately after it. The OLD order was a rigid rotation, which moved ' +
                'where a round STARTED and never changed the cyclic order, so every phase kept one ' +
                'predecessor for the whole run — and under it these two came out 9.3750 against ' +
                '0.0001 µs. This pair is the controlled way to ask whether that is what the far ' +
                "null measures; floor·twin·far asks it at the FLOOR's magnitude, where the bar " +
                'that judges the rungs is taken. If the two disagree, the bar every renderer-scale ' +
                'line above is judged against is a PROPERTY OF WHERE A ROW WAS DECLARED. See (Q7).',
            '',
            `  per state change        exodra ${f4(m('exodra') / 171)} µs · floor ${f4(
                m('floor') / 171
            )} µs — one of the 171, and the 171st moves forty tags and two deck dates`,
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE GATES. Nothing is timed until every program has been shown to produce the renderer's DOM,
// byte for byte, AT EVERY STEP of its transition cycle.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * THE SUBSTITUTION GATE FOR `wide`, and the reason it exists is in the header: this file's card is
 * a re-declaration with its state hoisted so the transition can be called without 160 dispatched
 * clicks. That is a substitution, and a substitution has to be proved rather than argued.
 *
 * The real app is mounted beside it and BOTH are flipped four times — the real one by its own
 * `clickAll` handlers, this one by its own loop — with the markup diffed after every flip. Four is
 * a whole cycle: the details blocks have period two and the tag lists period four.
 */
function gateWideAgainstTheApp(): void {
    const refC = el();
    const ref = mountExodraApp(refC);
    const sub = wideExodra();
    const check = (stage: string): void => {
        const want = markupOf(refC);
        const got = markupOf(sub.container);
        if (want === got) {
            line(
                `gate update-floor/wide @ ${stage}: the hoisted-state app is byte-identical to ` +
                    `mountExodraApp — ${want.length} chars, ` +
                    `${refC.querySelectorAll('*').length} elements`
            );
            return;
        }
        let at = 0;
        while (at < want.length && at < got.length && want[at] === got[at]) at++;
        const from = Math.max(0, at - 80);
        refuse(
            `update-floor/wide @ ${stage}: the hoisted-state app DIFFERS from mountExodraApp — ` +
                `first difference at char ${at}\n` +
                `  app     : …${want.slice(from, at + 160)}…\n` +
                `  hoisted : …${got.slice(from, at + 160)}…`
        );
        throw new Error(
            `update-floor: the re-declared card does not render the app's DOM @ ${stage} — the ` +
                '`wide` transition would be measuring a different program from the one every ' +
                'other axis calls the app'
        );
    };
    check('as mounted');
    for (let s = 1; s <= 4; s++) {
        ref.flip();
        sub.run(1);
        check(`after flip ${s}`);
    }
    ref.teardown();
    refC.remove();
    sub.dispose();
}

/** Every child of a card that a flip can create or destroy, in document order. */
const flippableIn = (c: HTMLElement): Element[] => Array.from(c.querySelectorAll('.details, .tag'));

/**
 * THE GATE THAT IS THE WHOLE REASON `exodra·kept` EXISTS — and its counterpart on the reference.
 *
 * The stepped byte-gate below already proves that this row renders the app's markup after every
 * flip. It cannot prove the one thing the row claims: that the nodes CAME BACK rather than being
 * rebuilt cheaply enough to look the same. Without this check, a row whose override silently
 * stopped working would be a second, slower copy of `exodra` wearing a cache's name and
 * every difference read off it would be nonsense — which is the exact failure `toggle.tsx`'s
 * `gateKeeps` was written against.
 *
 * FOUR FLIPS IS A WHOLE CYCLE (details period two, tag lists period four), so both rows return to
 * the DOM they mounted with and the question "is this the same node" is well posed.
 *
 * THE COUNTERPART IS ASSERTED TOO, and it is the half nothing else can check: `exodra` must have
 * kept exactly the 80 HEAD TAGS and nothing else. Those are the only children whose item is in
 * every array the list is ever handed — a tag list never falls below one — so they are never
 * dropped, while every details block and every tag past the first leaves at some point in the
 * cycle and comes back as a NEW child of a NEW item lookup. If that number ever changes, the
 * reference has started caching and `exodra − exodra·kept` stops meaning what the ladder says.
 */
function gateWideKept(): void {
    const kept = wideExodraKept();
    const keptBefore = new Set<Element>(flippableIn(kept.container));
    const ref = wideExodra();
    const refBefore = new Set<Element>(flippableIn(ref.container));
    for (let s = 0; s < WIDE_CYCLE; s++) {
        kept.run(1);
        ref.run(1);
    }
    const keptAfter = flippableIn(kept.container);
    const refAfter = flippableIn(ref.container);
    const keptSame = keptAfter.filter((n) => keptBefore.has(n)).length;
    const refSame = refAfter.filter((n) => refBefore.has(n)).length;
    const total = keptBefore.size;
    // The head tag of every card: the one child whose item is in every array the list is handed.
    const headTags = IDX.length;
    kept.dispose();
    ref.dispose();

    if (keptSame !== total || keptAfter.length !== total) {
        refuse(
            `update-floor/wide: "exodra·kept" came back with ${keptSame} of ${total} original ` +
                `nodes (${keptAfter.length} standing) — the KEEP_ALIVE override did not engage, so ` +
                'this row is a second copy of the rebuilding one and every difference read off it ' +
                'is meaningless'
        );
        throw new Error(
            'update-floor/wide: exodra·kept rebuilt what it claims to keep — the diagnostic is ' +
                'not measuring what its name says'
        );
    }
    if (refSame !== headTags) {
        refuse(
            `update-floor/wide: the reference "exodra" kept ${refSame} of its ${total} original ` +
                `nodes across a full cycle, where exactly ${headTags} — the head tag of each card, ` +
                'the only child whose item never leaves its array — should survive. If it now ' +
                'caches, `exodra − exodra·kept` is not the price of build and drop'
        );
        throw new Error(
            `update-floor/wide: exodra kept ${refSame} nodes, expected ${headTags} — the ladder's ` +
                'E4 line would be attributing a different quantity'
        );
    }
    line(
        `gate update-floor/wide/kept: exodra·kept returned ALL ${total} of its original nodes ` +
            `after a full ${WIDE_CYCLE}-flip cycle (the override engaged), and the reference ` +
            `exodra returned exactly ${refSame} — the ${headTags} head tags, and nothing else. ` +
            `Per flip this app builds ${WIDE_CENSUS.built} children and drops ` +
            `${WIDE_CENSUS.dropped} — counted from startsOpen/startCount/nextCount, which is what ` +
            'sizes floor·record and floor·wire.'
    );
}

/**
 * EVERY PROGRAM, STEPPED BESIDE THE RENDERER, DIFFED AFTER EVERY STEP.
 *
 * Three of these transitions are cycles that return to their starting DOM, so an end-state check
 * would pass a program that did nothing at all. Stepping is what makes that fail at step 1 — and it
 * is the same `markupOf` the rest of the suite gates with, so a comment anchor cannot hide a
 * divergence and an extra element cannot survive one.
 */
function gateTransition(t: Transition): void {
    const reference = t.programs.find((p) => p.name === 'exodra') as Program;
    const ref = reference.setup();
    const subs = t.programs
        .filter((p) => p.gated && p.name !== 'exodra')
        .map((p) => ({ p, inst: p.setup() }));

    const check = (step: number): void => {
        const want = markupOf(ref.container);
        for (const { p, inst } of subs) {
            const got = markupOf(inst.container);
            if (got === want) continue;
            let at = 0;
            while (at < want.length && at < got.length && want[at] === got[at]) at++;
            const from = Math.max(0, at - 80);
            refuse(
                `update-floor/${t.name}: "${p.name}" produced DIFFERENT markup after ${step} ` +
                    `transition(s) — ${ref.container.querySelectorAll('*').length} elements ` +
                    `(exodra) / ${inst.container.querySelectorAll('*').length} elements ` +
                    `(${p.name}), first difference at char ${at}\n` +
                    `  exodra : …${want.slice(from, at + 160)}…\n` +
                    `  ${p.name.padEnd(11)}: …${got.slice(from, at + 160)}…`
            );
            for (const s of subs) s.inst.dispose();
            ref.dispose();
            throw new Error(
                `update-floor/${t.name}: "${p.name}" does not perform the same transition as ` +
                    `@exodra/dom (diverged after ${step} step(s)) — it is a floor for a different ` +
                    'job, and the ratio below would be comparing two different programs'
            );
        }
    };

    check(0);
    for (let s = 1; s <= t.gateSteps; s++) {
        ref.run(1);
        for (const { inst } of subs) inst.run(1);
        check(s);
    }
    line(
        `gate update-floor/${t.name}: ${subs.length + 1} programs byte-identical at mount and ` +
            `after each of ${t.gateSteps} single transitions — ` +
            `${markupOf(ref.container).length} chars, ` +
            `${ref.container.querySelectorAll('*').length} elements`
    );
    for (const s of subs) s.inst.dispose();
    ref.dispose();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CLOCK AND THE RUNNER — `mount-floor`'s, with one structural change: the state survives a
// transition, so a sample builds ONE instance untimed and runs `reps` transitions inside the
// region, instead of building `reps` scenarios.
// ═══════════════════════════════════════════════════════════════════════════════════════════

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

interface Phase {
    readonly key: string;
    readonly transition: Transition;
    readonly program: Program;
    readonly reps: number;
}

/** One sample: build untimed, GC, run `reps` transitions timed, dispose untimed. µs per transition. */
function sampleOnce(phase: Phase): number {
    const inst = phase.program.setup();
    gcIfPossible();
    const t0 = performance.now();
    inst.run(phase.reps);
    const dt = performance.now() - t0;
    inst.dispose();
    return (dt / phase.reps) * 1000;
}

/**
 * WHAT THE ORDER OF A ROUND IS, PRINTED IN THE RUN'S HEADER SO A RECORDING CAN BE READ AGAINST IT.
 * Change the ordering and change this string in the same edit: two runs taken under two orderings
 * are two instruments, and the numbers of one may not be quoted beside the numbers of the other.
 */
const ORDERING =
    'per-round seeded shuffle (Fisher-Yates, splitmix32 seeded from the round index) — ' +
    'every ordered pair of programs has the same expected treatment';

/**
 * THE ORDER WITHIN A ROUND, AND IT IS A SHUFFLE BECAUSE A ROTATION IS NOT ONE.
 *
 * WHAT WAS HERE AND WHY IT WAS WRONG. The round used to be `phases[(k + shift) % length]` with
 * `shift = r % length` — a rigid rotation, which moves where a round is CUT and never changes the
 * CYCLIC ORDER. Every phase therefore kept the same predecessor in every round of every run, so a
 * pair declared side by side was measured back to back for the whole run and a pair at the two ends
 * of the list never was. That is not a detail of presentation: on the recorded run the two nulls of
 * `wide` — both with a true difference of ZERO — came out at 0.0001 µs (`floor` / `floor·twin`,
 * adjacent) and 9.3750 µs (`exodra` / `exodra·twin`, the two ends), the second being 7.8% of its own
 * median with `exodra`'s p25 standing ABOVE `exodra·twin`'s p75. Every null in this file is taken on
 * an adjacent pair and every attribution it bounds is a difference across NON-adjacent rows
 * (`floor·record − floor` is three phases apart, `floor·wire − floor·record` steps across them), so
 * the resolution bar was systematically too low for exactly the differences it exists to bound.
 *
 * WHAT REPLACES IT. A fresh uniform permutation per round. In a uniform permutation of n programs
 * every ordered pair (b immediately before a) has probability 1/n — the same for the pair declared
 * side by side and the pair at the two ends. Position in the declaration list buys nothing, which is
 * the property the nulls had already assumed.
 *
 * IT IS REPRODUCIBLE, WHICH A SHUFFLE IS NOT AUTOMATICALLY. The seed is the ROUND INDEX and nothing
 * else: no clock, no `Math.random` (absent from this harness and fatal to repeatability if it were
 * not), no state carried between runs. `orderForRound(n, r)` is a pure function of two integers, so
 * round 37 of every run of every machine at a given phase count sees the same order. `Math.imul` and
 * `>>> 0` keep the generator in exact 32-bit arithmetic, so the permutation does not drift with the
 * engine's float behaviour.
 *
 * IT CHANGES NO COUNT. Same phases, same rounds, same reps, same warm-up — a permutation visits each
 * phase exactly once, as the rotation did. Only the order inside a round moves.
 *
 * AND IT INVALIDATES THE RECORDING. Every median in `measurements/update-floor.published.json` was
 * taken under the ROTATION. Those numbers and the numbers of a run under this ordering may not be
 * put in one table, one ratio or one sentence.
 */
function orderForRound(n: number, round: number): Int32Array {
    const order = new Int32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    // splitmix32 — one integer chain, seeded from the round index alone. See the note above on why
    // the seed may not be anything else.
    // `Math.imul` and not `*`: the seed must stay in exact 32-bit arithmetic for every round index,
    // not only for the small ones a double happens to hold exactly.
    let s = Math.imul(round + 1, 0x9e3779b9) | 0;
    for (let i = n - 1; i > 0; i--) {
        s = (s + 0x9e3779b9) | 0;
        let z = s;
        z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
        z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
        const u = ((z ^ (z >>> 15)) >>> 0) / 4294967296;
        const j = Math.floor(u * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
    }
    return order;
}

function runPhases(phases: readonly Phase[], rounds: number): Map<string, number[]> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);
    const times = new Map<string, number[]>();
    for (const p of phases) times.set(p.key, []);
    for (let r = 0; r < rounds; r++) {
        const order = orderForRound(phases.length, r);
        for (let k = 0; k < phases.length; k++) {
            const p = phases[order[k]];
            (times.get(p.key) as number[]).push(sampleOnce(p));
        }
    }
    return times;
}

/**
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO — `mount-floor`'s two numbers
 * rather than one, and for its reason: a difference of two medians is free to CANCEL, and that axis
 * printed `0.0000` on its first run and read it as "the instrument is perfect".
 *
 *   bias   |median(a) − median(b)|. What a systematic difference would have to clear.
 *   noise  the median of the per-round |a − b|. The two halves of a null are sampled in the same
 *          round, so this is the round-to-round scatter EVERY comparison in the table carries, null
 *          or not. It cannot cancel.
 *
 * THIS USED TO SAY "adjacent in the rotation", and that was the defect rather than a description of
 * it: under the old rigid rotation a null declared side by side WAS measured back to back in every
 * round while the rungs it bounded were differences across rows that never were. The order is now a
 * per-round shuffle (`orderForRound`), so no pair is privileged by where it stands in the list, and
 * `wide`'s `floor·twin·far` is the row that checks it.
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

// ═══════════════════════════════════════════════════════════════════════════════════════════

export function benchmarkUpdateFloor(rounds = 100, batch = 1): void {
    const quantum = observeTimerQuantum();
    line(
        `update-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────────
    gateWideAgainstTheApp();
    gateWideKept();
    for (const t of TRANSITIONS) gateTransition(t);

    // ── THE PHASES ──────────────────────────────────────────────────────────────────────────
    const phases: Phase[] = [];
    for (const t of TRANSITIONS) {
        for (const p of t.programs) {
            phases.push({
                key: `${t.name}/${p.name}`,
                transition: t,
                program: p,
                reps: t.reps * batch,
            });
        }
    }

    const series = runPhases(phases, rounds);
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.key, stat(series.get(p.key) as number[]));

    // ── THE BANNER, AND IT IS PRINTED BEFORE THE FIRST TABLE ON PURPOSE ─────────────────────
    //
    // The falsifiers of all three predictions are evaluated at the END of the run, hundreds of
    // lines under the numbers they judge. Anybody reading a table, or scrolling to one row, or
    // copying a figure into a page, meets the figure and never the verdict — which is how a
    // prediction that had already failed on the recorded run went unacknowledged in every file
    // that quoted it. So the STANDING OF THE PREDICTIONS AS AT THE LAST RECORDING goes here,
    // ahead of every number this run is about to print, and it is a constant: it does not read
    // this run's stats, because this run's stats do not exist yet and because the point of it is
    // what a reader should already know before seeing them. The mechanical verdicts at the end
    // are what judges THIS run; this banner is what says the instrument has failures on record.
    //
    // IT IS A CONSTANT AND CONSTANTS GO STALE. It is arithmetic on the medians in
    // `measurements/update-floor.published.json` and it is true of THAT file. Anybody who records a
    // new run over that file rewrites these four lines from the new one in the same change, or the
    // banner becomes the very thing it was built against: a figure a reader trusts because it was
    // printed next to the numbers. The standing block in the header carries the same figures and
    // moves with it.
    line('');
    line(
        `UPDATE FLOOR — ${TRANSITIONS.length} transitions, ${phases.length} programs · ` +
            `interleaved · ${rounds} rounds · batch ${batch} · GC before every timed region · ` +
            'every number is MICROSECONDS PER TRANSITION'
    );
    // THE ORDERING IS PART OF THE NUMBER AND IS PRINTED WITH IT. A run under one ordering and a run
    // under another are two instruments; a recording that does not name its ordering cannot be read.
    line(`ORDER WITHIN A ROUND — ${ORDERING}`);
    refuse(
        'THE RECORDING PREDATES THIS ORDERING. Every median in ' +
            'measurements/update-floor.published.json was taken under the OLD order — a rigid ' +
            'rotation, `phases[(k + shift) % length]`, which never changed the cyclic order and so ' +
            'gave every phase one fixed predecessor for a whole run. That is what made an ' +
            'ADJACENT null read 0.0001 µs and a FAR null with the same true value of ZERO read ' +
            '9.3750 µs. Numbers from that file and numbers from this run MAY NOT BE QUOTED SIDE ' +
            'BY SIDE — not in a table, not in a ratio, not in a sentence. Quoting across a changed ' +
            'instrument is the error this repository has already made twice. Re-record before ' +
            'comparing, and rewrite the banner below from the new file in the same change.'
    );
    line('');
    // The leading marker is `refuse`'s and not `line`'s for a second reason besides emphasis: the
    // recorder strips a `✅ ` prefix and then tests the remainder against its SECTION pattern, an
    // ALL-CAPS word followed by an em dash. A banner headed that way and printed with `line` would
    // be read as a section header and would rename every row recorded after it.
    refuse(
        "READ BEFORE THE TABLES: the state of this axis's own predictions as at the last recorded " +
            'run (measurements/update-floor.published.json, batch 16). It is here because the ' +
            'verdicts that judge THIS run print AFTER the numbers they judge, and nobody reads a ' +
            'table backwards:'
    );
    refuse(
        '  FIRST PREDICTION — 4 of its 7 falsifiers FIRED: (c) wide 2.2836× against a committed ' +
            '1.10-1.45 · (d) discovery 14.1% against a committed 25% · (f) grow-shrink/exodra ' +
            '0.7786×, which the run ALSO refuses as a bound · (g) text-one vs floor·bound 1.2680× ' +
            'against a committed 1.6. (a) stayed silent at 1.6047× BUT (P1) had committed to 2.0, ' +
            'so the falsifier was looser than the claim. Only (P3) held on the number it named.'
    );
    refuse(
        '  SECOND PREDICTION — (Q1) FAILED (record 17.9687 µs against a committed 4-16) and (Q6) ' +
            'FAILED (exodra·kept 12.5000 µs BELOW floor·bound where it predicted above). (Q4), ' +
            'the cross-check this file most wanted tested, printed a verdict on a difference the ' +
            'SAME run refused as under its own resolution bar — the renderer-scale null was 9.3750 ' +
            'µs, 7.8% of its own row. Q2, Q3, Q5 held. (Q3), (Q4) AND HALF OF (Q5) ARE NOW STRUCK ' +
            'with floor·registry and exodra·children: the registry and the bindList façade they ' +
            'priced are deleted, so those readings belong to the renderer that produced them and ' +
            'to nothing this run measures.'
    );
    refuse(
        '  THIRD PREDICTION (R1-R6) — NEVER RUN, AND NOW STRUCK. Every one of the six was a ' +
            'difference against attach-exo-children.ts and attachExoList, and that reconciler is ' +
            'deleted: a list is reconcileExoOrder over a child list, which reads no index and ' +
            'stamps no mark. The reorder gap is measured and unattributed, which is where it stood ' +
            'before the rungs were written.'
    );
    refuse(
        '  FOURTH PREDICTION (Q7-Q11) — NEVER RUN either, and (Q8) and (Q10) are struck with ' +
            'exodra·children. What is left of it judges the ' +
            'INSTRUMENT rather than a number: the recording carries wide with NINE rows and this ' +
            "file declares TEN. On that recording TWO of wide's five attributions were " +
            'refused ' +
            'by a bar that a null with a true value of ZERO put at 37.5 µs, and RAISING THE BATCH ' +
            'CANNOT MOVE A BIAS — every number here is µs PER TRANSITION, so multiplying reps ' +
            'divides the region by the same factor it multiplies it. (Q7) is what asks whether ' +
            'that null is measuring the instrument or measuring where a row was declared.'
    );
    refuse(
        '  AND THE UNIT: MICROSECONDS PER TRANSITION. mount-floor, ssr-floor and hydrate-floor all ' +
            'report MILLISECONDS PER REP. Published pages have already taken the wrong one from ' +
            'this file and been out by 1000× with both documentation gates green, because neither ' +
            'gate checks a unit — they compare digits against a recorded row, and a ratio does ' +
            'not care what the unit is.'
    );

    interface Summary {
        readonly transition: string;
        readonly subject: string;
        readonly contract: Contract;
        readonly floor: string;
        readonly ratio: number;
        readonly headroom: number;
        readonly matched: boolean;
    }
    const summaries: Summary[] = [];
    const resolutions = new Map<string, number>();
    // THE RENDERER-SCALE NULL IS NOT CARRIED PAST THE LOOP ANY MORE. It was kept in a second map so
    // the end-of-run falsifiers could judge a renderer-scale difference against the right bar
    // instead of against the floor's, which is the smaller and therefore the flattering one. The
    // only falsifier that read it was (Q8), struck with `exodra·children`. The ATTRIBUTION REFUSAL
    // still uses it — through the loop-local below, where `scale: 'renderer'` picks it.

    for (const t of TRANSITIONS) {
        const reps = t.reps * batch;
        const m = (name: string): number => (stats.get(`${t.name}/${name}`) as Stat).median;
        const seriesOf = (name: string): number[] => series.get(`${t.name}/${name}`) as number[];

        line('');
        line(`── ${t.name.toUpperCase()} — ${t.what}`);
        line(`   ${reps} transitions per timed region · [${t.unit}]`);
        line('   row              min       p25       median    p75       max');
        for (const p of t.programs) {
            const s = stats.get(`${t.name}/${p.name}`) as Stat;
            line(
                `   ${p.name.padEnd(14)}${f4(s.min).padStart(9)} ${f4(s.p25).padStart(9)} ` +
                    `${f4(s.median).padStart(9)} ${f4(s.p75).padStart(9)} ${f4(s.max).padStart(9)}`
            );
        }
        for (const p of t.programs) line(`     ${p.name.padEnd(12)} ${p.what}`);

        // ── THE CONTROL ─────────────────────────────────────────────────────────────────────
        //
        // WHICH ROW THE TWIN IS A TWIN OF is read off the table rather than assumed: three of these
        // transitions call their floor `floor` and two call it `floor·told`, and a null taken
        // against the wrong row would not be a null at all — it would be a real difference printed
        // as the instrument's own scatter, which is the one error in this file that would make
        // every attribution under it look better resolved than it is.
        const twinOf = t.programs.some((p) => p.name === 'floor') ? 'floor' : 'floor·told';
        const nul = pairedNull(seriesOf(twinOf), seriesOf('floor·twin'));
        const resolution = nul.resolution;
        resolutions.set(t.name, resolution);
        // THE SECOND NULL, when the transition declares one — see `Transition.rendererNull`. It
        // FALLS BACK to the floor's own, so a ladder written for a transition that has only one
        // null names the null it actually has rather than a number that does not exist.
        const rendererPair = t.rendererNull;
        const rendererNul =
            rendererPair === undefined
                ? null
                : pairedNull(seriesOf(rendererPair[0]), seriesOf(rendererPair[1]));
        const rendererResolution = rendererNul === null ? resolution : rendererNul.resolution;
        const floors = t.programs.filter((p) => p.kind === 'floor');
        const cheapest = (rows: readonly Program[]): { name: string; v: number } =>
            rows.map((p) => ({ name: p.name, v: m(p.name) })).reduce((a, b) => (b.v < a.v ? b : a));
        const absolute = cheapest(floors);

        line('');
        line(
            `   CONTROL   bias ${f6(nul.bias)}  noise ${f6(nul.noise)}  p75 ${f6(nul.noiseP75)}  ` +
                `worst ${f6(nul.worst)} µs — |${twinOf} − floor·twin|, true Δ = 0`
        );
        // THE SAME NULL TAKEN FAR AWAY, when the transition declares one. It is printed HERE, next
        // to the bar it audits, and not in a verdict hundreds of lines below it: the bar above was
        // measured on the CLOSEST pair in the list and is applied to differences across rows that
        // are not adjacent. This line is what says whether that substitution is allowed.
        if (t.programs.some((p) => p.name === 'floor·twin·far')) {
            const farNul = pairedNull(seriesOf(twinOf), seriesOf('floor·twin·far'));
            line(
                `   CONTROL (far)   bias ${f6(farNul.bias)}  noise ${f6(farNul.noise)}  p75 ` +
                    `${f6(farNul.noiseP75)}  worst ${f6(farNul.worst)} µs — ` +
                    `|${twinOf} − floor·twin·far|, true Δ = 0, same magnitude as the pair above ` +
                    'and declared at the other end of the list instead of next door'
            );
            line(
                `   POSITIONAL BIAS ${f6(Math.abs(farNul.resolution - resolution))} µs — the far ` +
                    `null minus the near one (${f6(farNul.resolution)} vs ${f6(resolution)}). ` +
                    'Both are ZERO differences. Anything here beyond a rounding artefact is a ' +
                    'property of WHERE A ROW WAS DECLARED, and it is charged to every rung below, ' +
                    'because every rung is a difference between rows that are not adjacent while ' +
                    'the bar above them was measured on the closest pair in the list.'
            );
        }
        line(
            `   RESOLUTION FLOOR ${f6(resolution)} µs = max(bias, noise), which is ` +
                `${pct(resolution, absolute.v)} of this transition's floor. Read every figure ` +
                'below against it and not against zero; anything smaller is what this instrument ' +
                'returns when nothing is there.'
        );
        if (rendererNul !== null && rendererPair !== undefined) {
            line(
                `   CONTROL (renderer scale)   bias ${f6(rendererNul.bias)}  noise ` +
                    `${f6(rendererNul.noise)}  p75 ${f6(rendererNul.noiseP75)}  worst ` +
                    `${f6(rendererNul.worst)} µs — |${rendererPair[0]} − ${rendererPair[1]}|, ` +
                    'true Δ = 0'
            );
            line(
                `   RESOLUTION AT THE RENDERER'S SCALE ${f6(rendererResolution)} µs, which is ` +
                    `${pct(
                        rendererResolution,
                        m(rendererPair[0])
                    )} of the row it was taken on. A ` +
                    'null is only a null for the size it was taken at, so a difference between two ' +
                    'RENDERER rows is read against this one and a difference between two FLOOR ' +
                    'rows against the one above it.'
            );
        }

        // ── THE LADDER ──────────────────────────────────────────────────────────────────────
        line('');
        for (const l of t.ladder(m, resolution, rendererResolution)) line(l);

        // ── THE ANSWER, ONE PER RENDERER ROW, EACH AGAINST ITS OWN CONTRACT'S FLOOR ─────────
        line('');
        for (const subject of t.programs.filter((p) => p.kind === 'exodra')) {
            const sameContract = floors.filter((p) => p.contract === subject.contract);
            const matched = sameContract.length > 0;
            const floor = matched ? cheapest(sameContract) : absolute;
            const v = m(subject.name);
            const ratio = floor.v === 0 ? Infinity : v / floor.v;
            const headroom = v === 0 ? 0 : (1 - floor.v / v) * 100;
            summaries.push({
                transition: t.name,
                subject: subject.name,
                contract: subject.contract,
                floor: floor.name,
                ratio,
                headroom,
                matched,
            });
            // A FLOOR THE RENDERER BEATS IS NOT A FLOOR, and it prints as a finding rather than as
            // a negative headroom. The likeliest way it happens is named: this file's `floor·diff`
            // stamps, removes, computes a longest increasing subsequence and walks whatever the
            // change was, where `reconcileExoOrder` trims the common head and tail by identity and so
            // answers a tail append, a tail shrink or one contiguous middle insert with a run of
            // pointer compares and one DOM call — which is exactly the shape `grow-shrink` feeds
            // it. If that is what happened, the hand-written program was not the cheapest way to do
            // this transition and the row bounds nothing until it grows the same short-circuit.
            if (ratio <= 1) {
                refuse(
                    `   NO BOUND FROM THIS ROW — @exodra/dom (${f4(v)} µs) measured AT OR BELOW ` +
                        `the "${subject.contract}" floor "${floor.name}" (${f4(floor.v)} µs) at ` +
                        `"${t.name}". A floor a framework can beat is not a floor. Read it as a ` +
                        "finding about the FLOOR — most likely that this file's general " +
                        'reconciler has no fast path where the renderer does — and not as a bound. ' +
                        'The wider bound below, if one is printed, still stands.'
                );
                if (floor.name !== absolute.name && absolute.v < v) {
                    const wide = (1 - absolute.v / v) * 100;
                    line(
                        `     the wider bound survives: ${wide.toFixed(1)}% against ` +
                            `"${absolute.name}" (${f4(
                                absolute.v
                            )} µs), the cheapest floor of any ` +
                            'contract here.'
                    );
                }
                continue;
            }
            line(
                `   ANSWER — NO FRAMEWORK CAN BE MORE THAN ${headroom.toFixed(1)}% FASTER THAN ` +
                    `@exodra/dom AT "${t.name}" ON THE "${subject.contract}" CONTRACT ` +
                    `(row "${subject.name}"): ${f4(v)} µs against ${f4(floor.v)} µs for ` +
                    `"${floor.name}" — a program with no components, no declaration, no reactivity, ` +
                    'no schema and no library, told what changed, producing byte-identical DOM at ' +
                    'every step and holding every node a later transition could need. ' +
                    `Resolution floor ${f6(resolution)} µs (${pct(
                        resolution,
                        floor.v
                    )} of the floor).`
            );
            if (floor.name !== absolute.name) {
                const wide = v === 0 ? 0 : (1 - absolute.v / v) * 100;
                line(
                    `     and the WIDER, WEAKER, SAFER form: ${wide.toFixed(1)}% against ` +
                        `"${absolute.name}" (${f4(absolute.v)} µs), the cheapest floor of ANY ` +
                        'contract here. It is handed information this row was not, so it bounds ' +
                        'every renderer of every contract and is the one to quote at anybody ' +
                        'claiming they could do better.'
                );
            }
        }

        // ── THE DIAGNOSTICS, WHICH ARE NOT ANSWERS AND SAY SO ───────────────────────────────
        //
        // A `diagnostic` row does LESS than the reference and renders the reference's markup
        // anyway, because it KEPT what the reference rebuilt. It will usually measure below the
        // floor, and that is not a finding about the floor: the floor cannot decline to rebuild
        // and this row does. So it is printed here, under its own heading, with the comparison it
        // IS good for — never as a bound and never in the summary table.
        for (const diag of t.programs.filter((p) => p.kind === 'diagnostic')) {
            const v = m(diag.name);
            const subject = t.programs.find((p) => p.kind === 'exodra') as Program;
            const against = m(subject.name);
            line(
                `   DIAGNOSTIC, NOT A BOUND — "${diag.name}" ${f4(v)} µs against "` +
                    `${subject.name}" ${f4(against)} µs: ${sign(against - v)} µs, ` +
                    `${pct(against - v, against)} of the renderer's own row. It renders ` +
                    'byte-identical DOM at every step and it does it by KEEPING children the ' +
                    'reference rebuilds, which is a different job — so nothing here bounds ' +
                    'anything, and this row may not be quoted beside a floor.'
            );
            if (v < absolute.v) {
                line(
                    `     it measured BELOW the floor "${absolute.name}" (${f4(
                        absolute.v
                    )} µs) by ${f4(absolute.v - v)} µs, WHICH IS EXPECTED AND IS NOT A REFUSAL: ` +
                        'the floor rebuilds what leaves because it has no way not to, and this ' +
                        'row declines to. It is the one kind of row in this file allowed to be ' +
                        'under the floor.'
                );
            }
        }

        // ── SELF-CHECKS ─────────────────────────────────────────────────────────────────────
        //
        // EVERY ATTRIBUTION IS CHECKED AGAINST THE NULL TAKEN AT ITS OWN SCALE. The ladder prints
        // these differences and a printed difference cannot refuse itself: 0.4 µs to four decimal
        // places looks exactly as authoritative as 40. Four times the null is the bar — the same
        // "a quarter of its own subject" rule the whole-transition check below applies — and the
        // batch named is what it would take to clear it IF this null falls as 1/√batch, WHICH IS
        // AN ASSUMPTION AND NOT SOMETHING THIS FILE MEASURED. It is stated so the operator has a
        // number to type rather than a direction to guess in.
        for (const a of t.attributions ?? []) {
            const diff = m(a.of) - m(a.against);
            const nullFor = a.scale === 'renderer' ? rendererResolution : resolution;
            if (Math.abs(diff) >= 4 * nullFor) continue;
            const need = Math.ceil(batch * ((4 * nullFor) / Math.max(Math.abs(diff), 1e-9)) ** 2);
            refuse(
                `update-floor/${t.name}: "${a.of} − ${a.against}" is ${sign(diff)} µs against a ` +
                    `${a.scale}-scale null of ${f6(nullFor)} µs — under 4× the null, so ${
                        a.what
                    } ` +
                    'is a RANGE and not a number and the ladder line above must not be quoted. ' +
                    `Re-run at batch ${need} or raise \`rounds\` (the batch assumes this null ` +
                    'falls as 1/√batch, which was not measured).'
            );
        }
        for (const p of t.programs) {
            const s = stats.get(`${t.name}/${p.name}`) as Stat;
            const regionMs = (s.median * reps) / 1000;
            if (regionMs >= MIN_TICKS * quantum) continue;
            refuse(
                `update-floor/${t.name}: "${p.name}" times ${f4(regionMs)} ms per region, under ` +
                    `${MIN_TICKS} ticks of the observed clock (${(MIN_TICKS * quantum).toFixed(
                        3
                    )} ms) — its digits are quantisation. Re-run with a batch of ` +
                    `${Math.ceil((MIN_TICKS * quantum) / Math.max(regionMs, 1e-9))} or more.`
            );
        }
        const subjectRows = t.programs.filter((p) => p.kind === 'exodra');
        for (const subject of subjectRows) {
            if (m(subject.name) > absolute.v) continue;
            refuse(
                `update-floor/${t.name}: the renderer row "${subject.name}" (${f4(
                    m(subject.name)
                )} µs) measured at or below the floor "${absolute.name}" (${f4(absolute.v)} µs). ` +
                    'A floor a framework can beat is not a floor — either a floor program is ' +
                    'doing work the renderer does not, or this run resolved nothing. Nothing ' +
                    'above may be quoted for this transition.'
            );
        }
        const gap = Math.abs(m(subjectRows[0].name) - absolute.v);
        if (resolution > gap * 0.25) {
            refuse(
                `update-floor/${t.name}: the null moved by ${f6(resolution)} µs where the whole ` +
                    `gap is ${f4(gap)} µs — this run resolved a quarter of its own subject or ` +
                    'worse, so the headroom above is a range and not a number. Raise `rounds`, ' +
                    'or raise the batch.'
            );
        }
        const loopRow = t.programs.find((p) => p.kind === 'control');
        if (loopRow !== undefined && absolute.v < 3 * m(loopRow.name)) {
            refuse(
                `update-floor/${t.name}: the floor (${f4(absolute.v)} µs) is under 3× the empty ` +
                    `loop (${f4(m(loopRow.name))} µs), so a large share of what this transition ` +
                    'calls "the DOM work" is the harness iterating. Every ratio here is pulled ' +
                    'TOWARDS 1 by that — the flattering direction — and must not be quoted.'
            );
        }
    }

    // ── THE SUMMARY ─────────────────────────────────────────────────────────────────────────
    line('');
    line('EVERY TRANSITION, ONE TABLE — the ratio is always renderer ÷ floor OF THE SAME CONTRACT');
    line('  transition    row          contract  floor         ratio    headroom');
    for (const s of summaries) {
        line(
            `  ${s.transition.padEnd(13)} ${s.subject.padEnd(12)} ${s.contract.padEnd(9)} ` +
                `${s.floor.padEnd(13)} ${`${s.ratio.toFixed(3)}×`.padStart(7)}  ` +
                `${`${s.headroom.toFixed(1)}%`.padStart(7)}` +
                (s.matched ? '' : '   (no floor of this contract — read against the header)')
        );
    }
    line(
        '  EVERY ONE OF THESE IS A BOUND ON ONE TRANSITION OF ONE APP ON THIS MACHINE. The floor ' +
            'was handed the diff for free; the renderer had to keep the bookkeeping that makes ' +
            'discovery possible and, on the `derive` rows, to perform the discovery itself. That ' +
            'is what a framework is for, so the gap is the price of the product and not a defect.'
    );

    // ── THE PREDICTION'S FALSIFIERS, PRINTED MECHANICALLY ───────────────────────────────────
    const ratioOf = (transition: string, subject: string): number => {
        const s = summaries.find((x) => x.transition === transition && x.subject === subject);
        return s === undefined ? NaN : s.ratio;
    };
    const md = (t: string, n: string): number => (stats.get(`${t}/${n}`) as Stat).median;
    const textOne = ratioOf('text-one', 'exodra');
    const textSweep = ratioOf('text-sweep', 'exodra');
    const boundOne = md('text-one', 'exodra') / md('text-one', 'floor·bound');
    const wideRatio = ratioOf('wide', 'exodra');
    const discovery = md('reorder', 'floor·diff') - md('reorder', 'floor·told');
    const discoveryShare = discovery / md('reorder', 'floor·diff');
    const lowest = summaries.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    const verdict = (ok: boolean): string => (ok ? 'HOLDS ' : 'FAILED');

    line('');
    line(
        'THE PREDICTION, COMMITTED IN THE HEADER BEFORE THE FIRST RUN. It disagrees on purpose ' +
            'with the one prior I was handed — that the DOM write is ~86% of the update path, ' +
            'which would put every ratio near 1.16 — and it disagrees only for the TEXT ' +
            'transitions, where the write is tens of nanoseconds and the path around it is six or ' +
            'seven operations. Its falsifiers, evaluated mechanically:'
    );
    line(
        `  (a) text-one < 1.5              ${verdict(textOne >= 1.5)}  ${textOne.toFixed(
            3
        )}× (predicted ≥ 2.0) — if it failed, the .data store dominates its own path, the 86% ` +
            'prior holds even here, and my reading of where a text update spends its time is wrong'
    );
    line(
        `  (b) sweep differs from one>25%  ${verdict(
            Math.abs(textSweep - textOne) <= 0.25 * textOne
        )}  text-one ${textOne.toFixed(3)}× vs text-sweep ${textSweep.toFixed(3)}× — I predicted ` +
            'they land together, because a fine-grained renderer has no scheduler and no queue: a ' +
            'thousand writes are a thousand independent dispatches and there is nothing for the ' +
            'per-update cost to amortise into. If it failed, something DOES amortise and the ' +
            "brief's expectation was right where mine was not"
    );
    line(
        `  (c) wide outside 1.10-1.45      ${verdict(
            wideRatio >= 1.1 && wideRatio <= 1.45
        )}  ${wideRatio.toFixed(3)}× — the transition where the 86% prior SHOULD hold, because a ` +
            'clone and an insertBefore per card is most of both rows'
    );
    line(
        `  (d) discovery < 25% of the diff ${verdict(discoveryShare >= 0.25)}  ${sign(
            discovery
        )} µs = ${(discoveryShare * 100).toFixed(1)}% of floor·diff, against a resolution floor ` +
            `of ${f6(resolutions.get('reorder') as number)} µs — if it failed, finding out what ` +
            'changed is cheap against moving it, and "discovery is the framework\'s job" costs ' +
            'less than it sounds'
    );
    line(
        `  (f) any transition under 1.05   ${verdict(lowest.ratio >= 1.05)}  lowest is ` +
            `${lowest.transition}/${lowest.subject} at ${lowest.ratio.toFixed(3)}× — if it ` +
            'failed, @exodra/dom is AT the floor for that transition and there is nothing left ' +
            'to take there. That is the best possible result for the renderer and the worst for ' +
            'my model.'
    );
    line(
        `  (g) text-one vs floor·bound     ${verdict(boundOne >= 1.6)}  ${boundOne.toFixed(
            3
        )}× (predicted ≥ 1.6) — the same comparison with the dispatch ` +
            'handed to the floor, so that no part of it is a measurement of `setValue`'
    );
    line(
        '  A prediction that holds on the ratios and fails on the mechanisms was right for the ' +
            'wrong reason. Read (d), (e) and (g) before quoting (a) or (c).'
    );

    // ── THE SECOND PREDICTION: WHERE `wide`'s "EVERYTHING ELSE" GOES ─────────────────────────
    //
    // (Q3), (Q4) AND THE REGISTRY HALF OF (Q5) ARE STRUCK WITH THE ROWS THEY WERE EVALUATED ON.
    // (Q3) priced `attachExoList`'s item→child Map on `floor·registry`, (Q4) cross-checked it
    // against `exodra·children`, and (Q5) summed the record and the registry against E4. There is
    // no registry and no façade in the library any more, so the two rows are gone and the three
    // lines cannot be printed. What the recorded run said about them stands in the header, under
    // the run that produced it, and may not be re-stated as a result of this one.
    const wRecord = md('wide', 'floor·record') - md('wide', 'floor');
    const wBuildDrop = md('wide', 'exodra') - md('wide', 'exodra·kept');
    const wLeft = md('wide', 'exodra·kept') - md('wide', 'floor·bound');
    const wElse = md('wide', 'exodra') - md('wide', 'floor·bound');

    line('');
    line(
        `THE SECOND PREDICTION — where wide's "everything else" (${f4(
            wElse
        )} µs) goes. Of the four rows added to take it apart TWO SURVIVE — E1 the per-child ` +
            'record and E4 the keep-alive diagnostic — and E5 the component boundary was added ' +
            'later. Their falsifiers, evaluated mechanically, and the mechanism read separately ' +
            'from the number because the last three predictions in this repository all held on ' +
            'their number and failed on their mechanism:'
    );
    line(
        `  (Q1) record outside 4-16 µs     ${verdict(wRecord >= 4 && wRecord <= 16)}  ${sign(
            wRecord
        )} µs = ${f4(
            (wRecord * 1000) / WIDE_CENSUS.built
        )} ns per child's record — the thirteen-field ` +
            'stand-in object, the empty disposers array and the symbol expando on a freshly cloned element'
    );
    line(
        '       ITS MECHANISM IS NOT TESTED HERE. I predicted most of that number is the EXPANDO ' +
            'rather than the literal, and separating them needs a fifth rung that allocates the ' +
            'record without patching it on. There is none, so "most of it is the expando" stays ' +
            'my judgement whatever (Q1) did.'
    );
    line(
        `  (Q2) record under 5 µs          ${verdict(wRecord >= 5)}  ${sign(
            wRecord
        )} µs against the 5-13 µs a previous reading of this app could not account for and put ` +
            "down to GC. If it HOLDS, the residual is THE RECORD'S — cost of collecting it " +
            'included, because E1 cannot separate allocating those objects from collecting them ' +
            'and does not claim to. If it FAILED, the residual is still open and this file does ' +
            'not measure the collector separately either.'
    );
    line(
        '  (Q3) registry · (Q4) façade     STRUCK — both were read off floor·registry and ' +
            'exodra·children, and the registry and the bindList façade those two rows priced are ' +
            'deleted from the library. (Q5) summed the record and the registry against E4 and is ' +
            'struck with them; what is left of it is the E1-against-E4 reading below, which is ONE ' +
            'directly measured difference inside another and is not a sum.'
    );
    line(
        `  (Q5') build+drop over record    ${verdict(wBuildDrop >= wRecord)}  build+drop ${sign(
            wBuildDrop
        )} µs against the record's ${f4(
            wRecord
        )} µs — the record is INSIDE what E4 removes, and the clone and the wiring pass are on ` +
            'top of it. If it failed, one of the two rows is measuring something the other is ' +
            'not. IT IS WEAKER THAN (Q5) WAS, because the registry term it also summed is gone.'
    );
    line(
        // BOTH HALVES, BECAUSE (Q6) IS A CONJUNCTION. It predicted `exodra·kept` BELOW `floor` AND
        // ABOVE `floor·bound`. This check once tested `wLeft > 0` alone, so a run where
        // the row came out ABOVE the plain floor — the half that says it is not the diagnostic it
        // claims to be — would have printed HOLDS for a prediction that was out. Widening a check
        // to the whole of its own claim can only make it stricter, and on the recorded run it does
        // not change the verdict: `wLeft` is −12.5000 and (Q6) had already failed on that half.
        `  (Q6) kept at or under bound     ${verdict(
            wLeft > 0 && md('wide', 'exodra·kept') < md('wide', 'floor')
        )}  exodra·kept − floor·bound ` +
            `${sign(wLeft)} µs (predicted ABOVE, so > 0), and exodra·kept ${
                md('wide', 'exodra·kept') < md('wide', 'floor') ? 'IS' : 'is NOT'
            } below the plain floor (${f4(md('wide', 'exodra·kept'))} vs ${f4(
                md('wide', 'floor')
            )} µs, predicted BELOW) — BOTH HALVES MUST HOLD. If (Q6) failed on the bound half, ` +
            "then once nothing is built or dropped the renderer's whole update path is the " +
            'dispatch and the reconcile is free, which is the most interesting outcome available ' +
            'here and the one I predicted against.'
    );
    line(
        '  WHAT NONE OF THE SURVIVORS BOUNDS: they are directly measured DIFFERENCES on one app, ' +
            'and adding any two of them assumes the two do not interact, which was not measured. ' +
            "exodra·kept is a DIAGNOSTIC and not a floor — it renders the reference's markup by " +
            'keeping what the reference rebuilds, so it may sit under the floor and bounds nothing.'
    );

    // ── THE FOURTH PREDICTION: WHETHER `wide` CAN ATTRIBUTE ANYTHING AT ALL ─────────────────
    //
    // THE OTHER THREE PREDICTIONS IN THIS FILE JUDGE NUMBERS. THIS ONE JUDGES THE INSTRUMENT, and
    // it is printed here rather than beside them because on the recorded run two of the five
    // attributions above were refused by a bar that a null with a true value of ZERO put at
    // 37.5 µs. A refused attribution is not a failed prediction; it is a prediction nobody was
    // allowed to read.
    const wNullFar = Math.abs(md('wide', 'exodra') - md('wide', 'exodra·twin'));
    const wNullNear = Math.abs(md('wide', 'exodra') - md('wide', 'exodra·twin·near'));
    const wBoundary = md('wide', 'floor·wire') - md('wide', 'floor·record');

    line('');
    line(
        'THE FOURTH PREDICTION — whether this transition can attribute anything at all. Two rows ' +
            'were added for it: a THIRD declaration of the renderer program placed next to the ' +
            'first, and the floor plus the shipped createExoNodeRecord. Neither is a floor and ' +
            'neither may be quoted as a bound.'
    );
    line(
        `  (Q7) near null over 4.6875 µs   ${verdict(wNullNear <= 4.6875)}  far ${f4(
            wNullFar
        )} µs · near ${f4(wNullNear)} µs — two renderer-scale nulls, both true Δ = 0, taken in ` +
            'THIS run under THIS ordering, differing only in that one pair is declared adjacent ' +
            `and the other stands near the two ends of this list. ORDERING: ${ORDERING}. Under the ` +
            'ROTATION this file used to run — which moved where a round started and never changed ' +
            'the cyclic order, so every phase kept one predecessor for a whole run — these came ' +
            'out at 9.3750 and 0.0001 µs. Those are the RECORDED figures and belong to that ' +
            'instrument; do not read them against the two printed on this line.'
    );
    line(
        `       IF THE NEAR NULL IS THE SMALL ONE, the ${f4(
            wNullFar
        )} µs bar is a property of WHERE A ROW WAS DECLARED and not of this instrument, and the ` +
            'fix is to declare a null beside the row it is a null of — not to raise the batch. ' +
            'IF BOTH ARE LARGE, the renderer scale is unpairable here and every renderer-scale ' +
            'line above must be withdrawn rather than re-run, because a BIAS DOES NOT FALL WITH ' +
            'THE BATCH: every number in this file is µs PER TRANSITION, so multiplying reps ' +
            'divides the region by the same factor it multiplies it. The batch the refusals name ' +
            'is computed as if the null were all noise, and it is stated there as an assumption.'
    );
    line(
        '       WHICH KNOB MOVES WHICH HALF, since the refusals only ever name one of them: the ' +
            'BATCH shrinks the scatter of a single sample, so it moves NOISE. The ROUNDS shrink ' +
            'the standard error of a median, so they are what sharpens a BIAS estimate — and ' +
            'they do not shrink the bias itself, only the uncertainty about it. A run meant to ' +
            'settle (Q7) raises the first positional (rounds) and leaves the second (batch) at 16.'
    );
    line(
        '       AND IT REACHES PAST THIS TRANSITION EITHER WAY. Every FLOOR-scale null in this ' +
            'file is declared on an ADJACENT pair — floor and floor·twin are next to each other in ' +
            'all five transitions — and every attribution it bounds is a difference between rows ' +
            'that are NOT adjacent: here floor·record − floor is three phases apart and ' +
            'floor·wire − floor·record steps across them. If position matters, a bar measured on ' +
            'the closest pair in the list and applied across it is too low for EVERY rung on ' +
            'EVERY transition here. TWO THINGS HAVE BEEN DONE ABOUT IT. runPhases no longer ' +
            'rotates: it draws a fresh permutation per round from a seed derived from the round ' +
            'index, so every ordered pair has the same expected treatment and no pair is ' +
            'privileged by standing side by side — and that alone moves EVERY median in this ' +
            'file, which is why the recorded run may not be quoted beside a new one. And wide now ' +
            'declares floor·twin·far, a floor-scale null placed at the far end of the list, so the ' +
            'claim is MEASURED at the magnitude the rungs are read at instead of assumed. Its ' +
            'CONTROL (far) line prints beside the bar it audits.'
    );
    line(
        '  (Q8) and (Q10) are STRUCK. Both were differences taken against exodra·children — (Q8) ' +
            'build-and-drop with the façade removed from both sides, (Q10) the floor-side chain ' +
            'as a share of it — and that row is gone with the façade it priced. Nothing in this ' +
            'file now puts the floor-side record-plus-boundary chain against a renderer-side one, ' +
            'so the only cross-check this axis had is GONE RATHER THAN FAILED, and that is worth ' +
            'more than a number: E1 and E5 are read as additions to a floor and nothing confirms ' +
            'them from the renderer end.'
    );
    line(
        `  (Q9) boundary outside 8-20 µs   ${verdict(wBoundary >= 8 && wBoundary <= 20)}  ${sign(
            wBoundary
        )} µs = ${f4((wBoundary * 1000) / WIDE_CENSUS.built)} ns per instance over ${
            WIDE_CENSUS.built
        } of them — the shipped createExoNodeRecord, not ` +
            'an imitation of it: the machine load and pass-through, the walk replay, the four ' +
            'field stores, the arming, the publish and the wire. 40 of those wires belong to ' +
            'DETAILS, which has no ports and whose wiring half is () => undefined, so this row ' +
            'prices the boundary and the wire together and only that 40% makes "mostly the ' +
            'boundary" a reading rather than an assumption. ONE THING IT PAYS THAT floor·record ' +
            'DOES NOT BESIDES THE CALL: one TAG_BUILDING store per tag instance, which is the ' +
            "reconciler's build callback writing the item a wire reads by index."
    );
    line(
        '  (Q11) NOT A PREDICTION — the child-list anchors were struck from the "everything else" ' +
            "line by READING: this card's two children ports are not siblings, compileExoDomSchema " +
            'sets hasAdjacentChildLists only for ports under one parent, so the instance record ' +
            'childLists slot is null, no anchor closure is ever built, and per update the anchors ' +
            'are one typeof compare on each insertion. No rung for them could clear any bar here.'
    );

    // ── THE THIRD PREDICTION: WHERE `reorder`'s GAP GOES — STRUCK, UNANSWERED ───────────────
    const rGap = md('reorder', 'exodra') - md('reorder', 'floor·diff');

    line('');
    line(
        `THE THIRD PREDICTION — where reorder's ${f4(
            rGap
        )} µs goes — IS STRUCK AND THE QUESTION IS OPEN AGAIN. Six rows answered it: five NESTED ` +
            "rungs, each the row before it with one of the renderer's storage decisions " +
            'substituted in, and one row on the renderer’s own side. Every one of them was a ' +
            'difference against attach-exo-children.ts and attachExoList — a reconciler that kept ' +
            'the old position on the child, stamped survival with a pass number, computed a ' +
            'longest increasing subsequence and asked an item→child Map once per item. NONE OF ' +
            'THAT EXISTS AS IT WAS. reconcileExoOrder keeps an array mirror of the order, trims ' +
            'the common head and tail, and only on a reordered middle builds an item→position Map ' +
            'and a longest increasing subsequence; it reads no index and stamps no mark. R1-R6 decomposed a ' +
            'program nothing runs, and they are gone rather than re-pointed: a rung aimed at a ' +
            'different algorithm is a number with the old label on it.'
    );
    line(
        '  WHAT IS STILL TRUE WITHOUT THEM, and it needed no row. THE DISPATCH IS NOT IN THIS ' +
            `GAP. wide measured 160 dispatches at ${f4(
                md('wide', 'floor·bound') - md('wide', 'floor')
            )} µs — ${f4(
                ((md('wide', 'floor·bound') - md('wide', 'floor')) * 1000) / 160
            )} ns each. ONE REORDER IS ONE setValue, so at most ~0.2 µs of the gap above can be ` +
            "the notification. And wide's breakdown does not transfer to this transition: there, " +
            'cost was per-NOTIFICATION and there were 160 of them; here everything that matters ' +
            'is per-CHILD and there is one notification.'
    );
    line(
        '  AND WHAT THE GAP STILL DOES NOT SPLIT INTO. floor·diff − floor·told ' +
            `(${sign(
                md('reorder', 'floor·diff') - md('reorder', 'floor·told')
            )} µs) is what discovery costs a program with no framework, and exodra − floor·diff ` +
            "is what this renderer's own algorithm and storage cost ON TOP of that. NOTHING NOW " +
            'DIVIDES THE SECOND PART. The honest state of this transition is that the gap is ' +
            'measured and unattributed, which is where it stood before the rungs were written.'
    );
    line(
        `  AND THE COMPANION RESULT IS ON THE NEXT TRANSITION DOWN. grow-shrink prints exodra ${f4(
            md('grow-shrink', 'exodra')
        )} µs against floor·diff ${f4(
            md('grow-shrink', 'floor·diff')
        )} µs, and where exodra comes in lower the axis refuses to call it a bound. THE REASON ` +
            'HAS CHANGED WITH THE RECONCILER AND IS STATED AS A READING, NOT A MEASUREMENT: ' +
            'reconcileExoOrder trims the common head and tail by identity, so a ' +
            'tail append, a tail shrink and a single middle insert each cost a run of pointer ' +
            "compares and ONE DOM call, with no subsequence and no node moved; the floor's one " +
            'general reconciler stamps, removes, computes a LIS and walks whatever the change ' +
            'was. A SHUFFLE HAS NO SHAPE TO SHORT-CIRCUIT ON. Read the two transitions together ' +
            'and they say what the renderer trades: it wins wherever the change leaves a long ' +
            'agreeing prefix, and pays the general cost PLUS its own storage wherever it does ' +
            'not. What that second half is made of is no longer itemised.'
    );

    line('');
    line(
        'WHAT THIS RUN DOES NOT BOUND: mounting (mount-floor), teardown (teardown-phases), ' +
            'memory, hydration, SSR, any other app, any other transition, any other machine — and ' +
            'not the op contract for a reorder, which no row here measures. EVERY NUMBER ABOVE IS ' +
            'MICROSECONDS PER TRANSITION and app-update reports MILLISECONDS: not the same unit ' +
            'and not the same quantity, since four of five transitions here are fired by writing ' +
            'to a source where that axis dispatches 160 real clicks, and participants/floor/app.ts ' +
            'measured that harness at 42% of the round.'
    );
}
