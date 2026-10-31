// AXIS 4 — TOGGLE (repeat show): a block of content is torn out of the document and built again
// with DIFFERENT data, over and over. Mount a host (untimed), then TIME 20 cycles of {hide the
// list, show a new one of 200 panels} — the cost of a tab switch, a route change, a page of a
// paginated table, a filter flip, a "show more"/"show less".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY IT LOOKS DIFFERENT FROM THE AXIS THAT USED TO BE HERE, and this is the first thing to read.
//
// This axis used to toggle ONE four-node panel fifty times. Measured, every participant came out
// at 0.100 ms with a spread of 0.000–0.300, and the two caching diagnostics (`exodraKept`,
// `mikadoPooled`) came out at 0.000. Chromium clamps `performance.now()` to ~0.1 ms, so that
// table was the clamp printed thirteen times: no ordering in it meant anything, and the two rows
// the axis exists for were BELOW one tick. Fifty toggles of one panel is not enough work to
// resolve anything.
//
// THE SCENARIO DID NOT CHANGE — build a subtree, throw it away, build it again — ONLY ITS SIZE.
// The arithmetic, so the choice can be checked rather than trusted:
//
//   old: 50 toggles = 25 shows × 1 panel   =   25 panel builds + 25 teardowns per sample → 1 tick
//   new: 20 cycles  = 20 shows × 200 panels = 4000 panel builds + 4000 teardowns per sample
//
// which is 160× the panels. A competing row that sat on one tick should therefore land around
// 100–160 ticks (~10–16 ms), and the diagnostics — which were under HALF a tick, i.e. under
// 0.05 ms — should land above 1 ms even if a pooled show costs a fifth of a rebuilt one. That is
// the target: the fastest row at least 10× the timer's quantum. It is an estimate, not a
// measurement, so THE AXIS CHECKS ITSELF: it observes the clock's real resolution before it
// starts, and after the table it prints either a ✅ line with the factor, or a ❌ line naming the
// factor by which `PANELS` must rise. A first run either produces a usable table or says exactly
// what to change.
//
// WHAT THE SIZE CHANGE COST, stated because it is a change in what is measured and not only in
// how much: a conditional over ONE block (`{cond && <Panel/>}`, `<Show>`, `{#if}`, `<if>`,
// `${on ? … : nothing}`) is no longer the mechanism. A block of N is a LIST for every participant
// here, so the hidden state is an EMPTY ARRAY and the shown state is N panels, through each
// framework's own list construct. That is not a workaround: it is the only honest way to express
// "a block this size" without writing 200 literal panels into a template, which is the shape a
// compiler is entitled to hoist — and a hoisted branch would make a participant fast for a reason
// that has nothing to do with the scenario. The rows are real reactive STATE in every row of this
// table.
//
// EVERY SHOW CARRIES DIFFERENT DATA, alternating between two generations of 200 rows whose ids
// and texts are disjoint. That matters for exactly two rows: a cache or a pool that re-attaches
// nodes which already read correctly is not doing the job a pool does in a real tab switch, and
// Mikado's pooled path writes its data into the recycled node whether or not it changed
// (`create()` → `apply(...)` on the popped node, mikado.js:1057). Different data per show is what
// makes the two diagnostics comparable to each other and to the rows they are read against.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS AXIS IS FOR, and what the evidence already says — written before the run, so that a
// number confirming it and a number killing it are treated the same way.
//
// Mikado keeps removed nodes in a POOL and reuses them with no clone: `remove()` hands each node
// to `checkout()`, which pushes it into `pool_shared` (mikado.js:1653), and the next `create()`
// takes it straight back with `pool.pop()` and never touches the factory (mikado.js:1057-1080).
// Its own source names the cases that pays for, beside the reversal it does so `pop()` restores
// the original order: "pagination of content", "toggling the count of items per page", "folding
// of content (show more, show less)", "filtering state", "initializing with the last view state"
// (mikado.js, above the removal loop). The schema core has NO pool at all — nothing in
// `@exodra/dom` recycles or parks a node — so it clones every panel every time.
//
// NOBODY HAS MEASURED WHAT THAT COSTS, and the guess that it opens a wide gap is NOT supported by
// the one piece of mixed evidence there is: `app-update`, which toggles a details block on each
// of 80 cards five times per region, has Mikado ahead of Exodra by 3% (4.440 vs 4.580) — a tie,
// not a rout. This axis is a much larger dose of the same thing, so it can say something the
// smaller one cannot; it is written to FIND OUT. If it comes back showing the pool is worth
// little, that is the result and it belongs in this header as plainly as the opposite would.
//
// AND ONE STRUCTURAL DIFFERENCE THAT THIS SIZE WILL EXPOSE AND THE OLD SIZE COULD NOT, stated up
// front so it is read as a finding rather than a surprise. SOME participants clear the whole block
// with ONE DOM call. Mikado's `remove(0, length)` with the whole list going takes the branch that
// does `this.root.textContent = ""` and then skips `node.remove()` for every node
// (mikado.js:1513-1580); stage0's `reconcile()` opens with a fast path for exactly this case —
// `if (data.length === 0) { … parent.textContent = "" }` — and a second one for refilling an
// empty parent, which appends without diffing anything. Both can do it because they OWN the
// parent element.
//
// AND SO DOES THE SCHEMA CORE ON THIS BLOCK. THIS PARAGRAPH USED TO SAY THE OPPOSITE — "the schema
// core's clear is N removals (`dropExoChild` per child) … because a list block that shares its parent
// with anything else cannot wipe it" — AND THAT WAS WRONG FOR THE COMPONENT THIS AXIS MEASURES.
// The sentence describes the case where the port HAS siblings; this block's port has none. The
// chain, read line by line rather than asserted, and gated below before anything is timed:
//
//   1. `compileExoDomSchema.ts` — `if (kids.length === 1) ownsElement[kid.index] = 1`.
//      A children port that is its element's ONE AND ONLY child is marked as owning its content.
//   2. `EXO_DOM_NODE_VOCABULARY.ts`, `childList` — hands `createExoChildList` `schema.ownsElement[index] === 1`
//      as its `ownsParent`. There is ONE route now: every list on this backend is a composition
//      over this door, so no caller can reach a region whose flag was derived any other way.
//   3. `createExoChildList.ts`, `removeAll` — `for (i) order[i].unmount()` while the list is
//      still whole, then `if (this.ownsParent) { for (i) order[i].index = -1;
//      parent.textContent = '' } else { … climb and removeChild per child … }`.
//   4. `reconcileExoOrder` — `if (wantLength === 0) kids.removeAll()`, which is the branch a
//      hide takes on this axis.
//
// THE HOSTS BELOW ARE `b.el('div', null, (host) => { panels = host.childrenPort(); })` — the div's
// only child is the port — so (1) fires, and `exodra`, `exodraDelegated` and `exodraKept` all hide
// with ONE `textContent = ''` on top of their N unmounts, NOT with 200 removals. `gateOwnsParent`
// below proves it twice, once off the compiled schema and once by behaviour, and throws otherwise.
//
// WHICH HEADER WAS RIGHT: `teardown-phases.tsx`'s. It reads the same branch at its lines 67-71 and
// GATES on `ownsElement` before it times anything; this file's prose contradicted it and lost. The
// two are no longer in disagreement.
//
// WHAT IS STILL NOT KNOWN, said here rather than quietly assumed: whether solid, svelte, react,
// voby, marko, lit, uhtml and sinuous clear per child or in one call. The old sentence asserted it
// of all of them and cited source for none. I did not read their runtimes either, so this axis now
// says so and `reportFloor` prints those eight rows as a RANGE between the two floors instead of
// picking one for them.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE TWO DIAGNOSTIC ROWS, which are NOT competing with anybody.
//
// `exodraKept` — the schema core with its panels KEPT ALIVE across the hide. A list being a
// COMPOSITION exposes the pieces separately: `c.build(component, index)` returns
// a built, wired, DETACHED child as a VALUE, `reconcileExoOrder` over a source of THOSE
// CHILDREN keeps the region equal to the array,
// and a child states its own policy by replacing its `unmount` — the documented extension
// point on `exoNodeDom`, whose own doc comment is the two lines this row is written out of. So
// this row builds 200 panels ONCE at mount, overrides each one's `unmount` so its text
// subscription survives removal, and then toggles an array between holding them and not, writing
// the new generation's text into each panel's source before it re-inserts them. That is a POOL
// with a hit rate of 1, written by the caller, and `exodra` − `exodraKept` is what the schema
// core's rebuild costs. It pre-builds, so it must never be quoted against Solid, React, Svelte,
// voby, Marko, Lit, stage0, uhtml or sinuous.
//
// `mikadoPooled` — Mikado with `{ recycle: true, pool: true }`, line 2 of its own Best Practices
// ("For non-keyed recycling use { recycle: true, pool: true }"), which is the same contract:
// every hide banks 200 nodes and every show takes them back. `recycle` is load-bearing rather
// than cosmetic — the constructor computes `cacheable = this.recycle || !!this.key` and forces
// `pool` off when it is false (mikado.js:143-165), so on an unkeyed view it is the only way to
// switch pooling on at all. `mikado` − `mikadoPooled` is what Mikado's rebuild costs, and it is
// the number this axis exists to produce. Read it against `mikado` alone.
//
// ONE COST `mikadoPooled` PAYS INSIDE THE TIMED REGION AND NOBODY ELSE DOES, stated because
// nothing in the output would reveal it: a recycled node carries no address for its dynamic
// positions, so `create()` builds one lazily on first reuse (`node[MIKADO_TPL_PATH] ||
// create_path(...)`, mikado.js:1014) — 200 path builds on the first pooled show of every sample,
// amortised over 20 shows. It is NOT warmed in `prep`; warming it would be exactly the kind of
// setup step a benchmark author adds for the framework they want to win.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// `exodraDelegated` — THE SCHEMA CORE WITH EVENT DELEGATION TURNED ON. It is a COMPETING row and
// NOT a diagnostic: it destroys and rebuilds all 200 panels on every show exactly as `exodra`
// does, it goes through the same markup gate against the same reference, and the identity check
// below requires 0 of 200 panels to survive a hide, the same demand made of Solid or Lit.
//
// WHY IT EXISTS. The second asymmetry below is real and it is not small: Mikado and Svelte
// delegate their click handler, so a show attaches NOTHING per panel, while `exodra` and eight
// others call `addEventListener` 200 times per show — 4000 registrations per sample against zero.
// In this core delegation is a PLUGIN (`createExoDelegatedEvents`) and the default (`EXO_DIRECT_EVENTS`)
// is a value the caller passes, so part of a gap read off this table as ARCHITECTURE may be
// CONFIGURATION. This row prices that, and it costs nothing to be wrong about: if it lands on top
// of `exodra`, per-panel registration was not where the time was, and that is the result.
//
// IT DIFFERS FROM `exodra` IN TWO THINGS, NOT ONE, and both are named here because a reader who
// assumed one would attribute the whole delta to delegation:
//
//   1. THE EVENT PACK — the host is rendered through `DELEGATED_BACKEND`, a backend composed
//      once with `{ events: () => createExoDelegatedEvents(['click']) }`, instead of through the shipped
//      one and its `EXO_DIRECT_EVENTS`. This is the difference the row is for.
//   2. THE HANDLER FORM — `exodra`'s panel fills its click port with a CLOSURE (`noop`); this one
//      fills it with a DESCRIPTOR (`exoCellSet`) and a subject. That is not a free choice made to be
//      different: the delegated pack REFUSES a function BY NAME on the first row that fills one
//      (`exo-delegated-events.ts`), because a closure already knows its row and can only be
//      reached through a listener on its own element — which is the cost delegation removes. A
//      delegated row therefore cannot be "the same participant with a flag flipped"; the handler
//      form arrives with the pack.
//
// SO THE COMPARISON IS descriptor+delegated VERSUS closure+direct, NOT delegation alone. The
// descriptor form WAS available to the plain `exodra` row too — the direct strategy serves both
// forms, and under it a descriptor is written into the element's two slots and served by ONE
// shared listener, allocating no function per row (`exo-event-slot-setter.ts`) — so this file
// could have removed the second difference by rewriting `exodra`. It deliberately did not:
// `exodra` is the row every other number on this axis has already been read against, and quietly
// changing it so that a new row's delta looks clean is how a table stops meaning what its history
// says it means. What each form costs per panel, read off the two setters rather than measured:
//
//   `exodra`          — one `addEventListener(click, noop)`. `noop` is module-level, so the
//                       closure form allocates NOTHING per row here; the registration is the cost.
//   `exodraDelegated` — two property stores (handler and subject). No registration, no allocation.
//
// which makes the delta ~4000 `addEventListener` calls traded for ~8000 property stores per
// sample, plus the difference between `connector.set` and `connector.on` (one port-kind check in
// place of one `filled` mark). A THIRD row — direct pack, descriptor handler — would isolate
// delegation exactly. It is not here, and until it is, a difference between these two rows does
// not say WHICH of the two changes produced it.
//
// WHERE THE DELEGATED ROOT GOES, stated because the root's position decides how much foreign code
// runs before our dispatch: the root is THE SCENARIO'S OWN CONTAINER — the `<div>` that `el()`
// appends to `document.body` and that is handed to `render` as the render parent. That is
// where the `events` interface puts it rather than a preference: `render` calls `events.install(parent)`
// on the element it renders into, and `installExoDelegatedRoot` adds one BUBBLE-phase listener per
// delegated event name to exactly that element. Mikado's root is `window` in the CAPTURE phase, so
// its dispatch is entered before any other handler on the page and ours after, and ours walks up
// at most three elements from a clicked button where Mikado's walks the whole path to the document.
// NEITHER IS TIMED HERE: no click is dispatched anywhere on this axis, so the root's position
// costs this number nothing, and the single `addEventListener` that installs it runs once per
// `prep` — outside the measured region, beside Mikado's `listen("click")` and everybody else's
// listener setup. It is stated so that a reader comparing this row against Mikado knows the two
// roots sit at opposite ends of the document, not because it moves this table.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THREE ROWS THIS AXIS NO LONGER HAS: `exodraBanked`, `exodraBank0` AND `exodraBank32`.
//
// They rendered the same block under `withExoNodeBank(withExoCompiler(new ExoDomBackend()))` at three caps — the
// shipped default, `cap: 0` and `cap: 32` — and they were the axis's only rows under a THIRD node
// contract, rebuilt into RECYCLED elements, gated by `gateRecycles` and `gateBankServes` instead
// of `gateRebuilds`. The node bank has been removed from `@exodra/dom`: `withExoNodeBank`,
// `releaseExoNode` and the pack behind them no longer exist, so there is no composition left to
// render through and this axis MEASURES NO REUSE OF ELEMENTS AT ALL. Every exodra row here now
// builds each of its 200 panels from a clone.
//
// What those rows read on earlier runs is not restated here and must not be carried into a
// sentence about the rows that remain: they were a different composition.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHERE THE GAP TO THE FLOOR GOES — TWO ROWS THAT ARE THE REAL RENDERER WITH A LAYER NOT USED.
//
// The floor says `exodra` is 1.17–1.18× `floor·rebuild·owned`: ~0.900 ms over 20 cycles, 45 µs per
// cycle, 225 ns per panel built-and-destroyed. A gap nobody can decompose cannot be worked on —
// "find 8 points" is a wish, not a task.
//
// A LADDER OF FIVE HAND-WRITTEN STAND-IN PROGRAMS USED TO SIT IN
// `participants/floor/toggle.ts` AND CLAIM TO SPLIT IT. It was run twice and failed its own gates both times, identically: one rung landed BELOW
// the floor it was grown out of, four of the five steps were under three timer quanta, and the
// unattributed residue came out at 115% of the gap. The two tables and the refutation are in
// `participants/floor/toggle.ts`'s header as a permanent record; the rungs themselves are gone,
// and not parked behind a flag.
//
// WHAT SPLITS THE GAP NOW IS SHIPPING CODE WITH A LAYER SWITCHED OFF, which is the kind of row this
// axis already had two of — `exodraDelegated` is a real composition swapping the event pack and
// `exodraKept` is real keep-alive. Every panel below is built by the real schema, the real
// connector, the real setters and the real `TExoDomChild`; what changes is which of the renderer's
// layers the APPLICATION asks for, and every row is expressible by a user through the public API:
//
//   exodra          an effect calling `reconcileExoOrder(c.childList(port), shown, rows, rows,
//                   (row, i) => c.build(PANEL, i))` — the children reconciler and the build layer.
//   exodraPlaced    `c.build(...)` + the application's own `appendChild` and `textContent = ''`.
//                   THE CHILDREN RECONCILER IS NOT USED, nor the children port: the wire
//                   fills nothing and the holder places the children it built.
//   floor·rebuild·owned   no renderer at all.
//
// A THIRD ROW USED TO STAND BETWEEN THE FIRST TWO AND IS STRUCK — `exodraChildren`. It priced THE
// LIST LAYER: `attachExoList`'s `remap`, its item→child registry, `rememberExoChild` and the
// op-translating façade it wrapped a source in, as the difference between `c.bindList` and
// `c.bindChildren`. Every one of those names is deleted from `@exodra/dom`, and a list is now the
// one composition printed on the `exodra` line above — which is the program `exodraChildren` WAS.
// There is no layer between the two rows any more, so the rung is gone rather than re-pointed at
// something else.
//
// SO THE TWO DIFFERENCES TELESCOPE ONTO THE FLOOR EXACTLY and there is no residue for anything to
// hide in: `(exodra − exodraPlaced) + (exodraPlaced − floor)` IS
// the gap, by arithmetic. What each difference MEANS is the part that needs care, and `reportLayers`
// below states it on every line:
//
//   exodra − exodraPlaced          A REPLACEMENT AND NOT A REMOVAL, and this is stated up front
//                                  because the sign is not guaranteed: hand placement is not free,
//                                  and the reconciler is not pure overhead. Both sides pay one
//                                  `exoNodeDom(child)` per panel — `TExoChildList.insert` makes the
//                                  same call — so what the pair prices is the notification, the
//                                  `shown` mirror and its `Set`, the `order` splices and the clear
//                                  branch, against the holder's own loop. Either sign is a finding
//                                  rather than a fault.
//   exodraPlaced − floor           A REMOVAL of everything the renderer adds over a straight-line
//                                  program: the acquire through the node-source slot, the
//                                  `TExoDomChild` record, the walk read from a table, and
//                                  two fills dispatched through the schema's setters. Both sides
//                                  place and clear with the SAME two DOM calls, so nothing else is in it.
//                                  Monotone by construction — `exodraPlaced` does strictly more than
//                                  the floor in the same shape — so a reading below the floor here is
//                                  the instrument and not a smaller job, and the run says so by name.
//
// WHAT IS NOT SPLIT OUT, AND WHY THERE IS NO ROW FOR IT. A layer an application cannot decline is a
// FINDING, and it belongs here rather than being faked with a stand-in:
//
//   * THE REACTIVE DISPATCH PER PORT IS ALREADY ABSENT. `PANEL`'s wire is
//     `c.text(P.text, BUILDING_ROWS[i].text)`
//     and `c.on(P.close, noop)` — no binding anywhere, so no cell and no subscription per panel.
//     This scenario's data never changes after a panel is built (a panel is thrown away, never
//     updated), so there is nothing for a write-versus-binding row to remove: the renderer is
//     already at its own floor on this one. What is left is ONE notification per transition — 40 per
//     sample against 4000 panel builds — and `exodraPlaced` is the row that declines it.
//   * THE PER-CHILD `unmount` CALL IS DECLINABLE AND NOT WORTH DECLINING. `exoNodeDom(child).unmount
//     = …` is the documented override and `exodraKept` uses it — but a keep-alive pays it ONCE per
//     child for twenty shows, while a REBUILD would pay one symbol read and one field store on each
//     of the 4000 fresh children to save one call each. And what the default does here is already
//     nothing: `disposeExoChildSelf` (`exo-dom-child-factory.ts:23-36`) strikes the child off its
//     registry and runs its disposers, and a child built by `c.build` outside a list has
//     `registry === null` and a `null` `disposers` slot. So the REGISTRY half of the teardown is
//     already gone on every row here — no caller on this axis puts a child in a registry — and the
//     call itself is left alone.
//   * THE CHILD RECORD IS NOT REMOVABLE AT ALL. `createExoDomChildFactory` builds the one constructor and
//     every built child gets one; no public call hands back an element without one. It is priced
//     inside `exodraPlaced − floor`, together with the walk and the setters, and it cannot be
//     separated from them without instrumenting the shipping code. (This entry used to name a MARK
//     beside the record — a symbol on the element pointing back at it — and argued the context walk
//     depended on it. Both are gone — the DOM context climb was replaced by one walk per mount
//     that puts the frame on the exonode, and the element mark was removed — so what is
//     inside this gap is one constructed record and its array and no store on the element.)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// AND THE SAME THING ON THE OTHER CONTRACT — THE KEEP LADDER.
//
// EVERYTHING ABOVE SPLITS `exodra − floor·rebuild·owned`. The `keep` contract had a FLOOR and NO
// LADDER, and that is the half of this axis where we are behind: `.gate/toggle.afterPorts.json`,
// batch 1, reads `floor·kept·owned` 1.6 · `mikadoPooled` 2.2 · `exodraKept` 2.4 — 0.8 ms over the
// keep floor where Mikado's pool is 0.6. AN AXIS THAT PROVES IT LOSES AND CANNOT SAY WHAT TO has
// published a gap and hidden the answer. These rows are the answer, and they are made of the
// same material the rebuild ladder is: the SHIPPING renderer with one layer the APPLICATION did not
// ask for, every one of them expressible by a user through exported API.
//
//   exodraKept        an effect per panel + `reconcileExoOrder` over a source of CHILDREN;
//                     panels built in the wire at mount, untimed, which is what
//                     `floor·kept·owned` does when it clones its 200 panels in its own mount.
//   exodraPlacedKept  the same WITHOUT THE CHILDREN RECONCILER AND WITHOUT THE CHILDREN PORT: the
//                     wire fills nothing, the holder appends what it kept and clears with one
//                     `textContent = ''`, and it writes and places each panel in ONE pass.
//   exodraDirectKept  the same WITHOUT THE REACTIVE LAYER EITHER: no cell, no subscription, no
//                     disposer — each panel's wire hands out `c.fillDoors()` and the holder writes the
//                     text with `p.text(P.text, …)` per show. The most imperative form this contract
//                     admits, and the row the keep floor is supposed to be reachable from.
//   floor·kept·owned  no renderer at all.
//
// THE THREE DIFFERENCES TELESCOPE ONTO THE KEEP FLOOR EXACTLY, with no residue by construction, and
// `reportKeptLayers` states on every line what each one MEANS and refuses any it cannot resolve.
//
// ═══ THE RUNG THAT USED TO OPEN THIS LADDER IS STRUCK, AND WHY ═══
//
// `exodraKeptWarm` priced ONE BUILD PASS of 200 panels moved out of the measured region. It could,
// because `c.build` DEFERRED: it handed back a child with `node === undefined` and left clone, walk,
// wire and subscribe to `materialiseExoChild` at the insertion site — which for `exodraKept` was the
// first of its twenty shows, inside the clock, while `floor·kept·owned` cloned in its own mount.
// `c.build` is `buildLiveExoChild` now and materialises in the call; `materialiseExoChild` is
// deleted with no replacement. There is no deferral left to move, `exodraKept` IS the warm program,
// and the rung is gone rather than re-pointed at something else.
//
// AND THAT MEANS EVERY RECORDED `exodraKept` NUMBER — INCLUDING THE 2.4 QUOTED FIVE LINES UP — IS
// NOT COMPARABLE WITH A FRESH ONE. The difference is one whole build pass of 200 panels per sample.
// The 0.8 ms this ladder was built to decompose is a figure from the deferring renderer.
//
// ═══ WHY THERE IS NO ITEM-RECONCILED RUNG, WHICH IS A FINDING AND NOT AN OMISSION ═══
//
// A keep-alive cannot be written over a source of ITEMS ON THIS AXIS, because `reconcileExoOrder`
// matches by the identity of the item OBJECT and this axis alternates two generations whose row
// objects are DISJOINT by construction — so a kept item-reconciled row would match nothing across a
// transition, build a second 200 panels for the second generation, and answer `gateKeeps` with 0 of
// 200. IT IS THE DATA THAT FORBIDS THE RUNG, NOT THE RENDERER: a list whose items are stable across
// the hide keeps its children through the same call. `exodraKept` reconciles over the CHILDREN
// instead, which is exactly why it keeps them, so this ladder is one rung shorter and says why.
//
// ═══ WHAT THE PUBLIC API CANNOT DECLINE, NAMED RATHER THAN FAKED ═══
//
// The child record (`createExoDomChildFactory` builds the only constructor), the `mount()`/`unmount()`
// calls (the reconciler makes both, so a row that skipped them would be doing a smaller job), and
// the setter dispatch. All three are inside `exodraDirectKept − floor·kept·owned` and none can be
// separated from the others without instrumenting the shipping code — a FINDING about the renderer,
// not a hole in the decomposition, exactly as the rebuild ladder says of its own three.
//
// ONE OF THOSE THREE HAS STOPPED BEING UNDECLINABLE, and the sentence above is left
// standing because it is still true OF THIS LADDER. `TExoChildList` grew a second pair — `attach` and
// `detach`, which place a child and run NO hook at all — so a keep block can now be written with no
// `mount()` and no `unmount()` anywhere in its measured region. That is `exodraDetachedKept`, and it
// is NOT a rung of this ladder: `detach` is per index, so its hide is 200 removals and it belongs to
// the `keep + SHARED parent` contract, bounded by `floor·kept`. Subtracting it from
// `exodraDirectKept` would cross a contract and mix the price of 400 hook calls with the price of
// owning the parent. It stands on its own, beside its own floor, and `reportKeptLayers` deliberately
// does not touch it.
//
// AND ITS OWNED TWIN, `exodraDetachedAllKept`, IS STILL NOT A RUNG EITHER, for a different reason.
// `TExoChildList.detachAll` — the whole-region form of `detach`, added the same day — takes the
// one-call clear where the port owns its element, so THAT row is `keep + owned` and shares a floor
// with the three rungs above. It is still not subtractable from `exodraDirectKept`: the two differ
// in the 400 lifecycle calls AND in whether the children port is filled at all, which is two changes
// and therefore not a layer price. What the pair of detached rows measures instead is what OWNING
// THE PARENT is worth to a keep block written directly, with one line of the program changed and nothing
// else — read as two ratios against two floors.
//
// AND ONE MISSING STRATEGY, WHICH IS THE MOST USEFUL THING THIS LADDER PRODUCES. The floor's show is
// `texts[i].data = …` — it HOLDS THE TEXT NODE. A panel's effect writes through `c.text` and holds
// none, and a door cannot hold one at all, so `fillDoors().text` re-reads
// `firstChild` and tests `nodeType` on every write (`set-text.ts`). There is no way through this
// API to say "hand me the node this port writes to". That is the one named thing standing between
// the bottom rung and the keep floor, and it is a missing strategy rather than a fault.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE FLOOR — six rows named `floor·*`, and the reason this axis is no longer half a measurement.
//
// EVERY AXIS IS SUPPOSED TO CARRY A NATIVE FLOOR AND A STRATEGY THAT REACHES IT. This one had the
// strategy — `exodraKept`, and the gap it opens is the largest recorded anywhere in this suite —
// and no floor at all. "Keep-alive is 3× the default" ranks two of our own rows and says nothing
// about what either is worth, on the ONE axis where the schema core is behind. So the file
// `participants/floor/toggle.ts` adds straight-line programs with no framework in them: no component, no declaration, no reactivity,
// no schema, no list block, no library, byte-identical markup at all four states, fired by this
// harness, interleaved with everybody else.
//
// A HIDE HAS MORE THAN ONE HONEST ZERO-ABSTRACTION SPELLING, WHICH IS WHY THERE ARE SIX ROWS AND
// NOT ONE. `display: none` keeps every node; `remove()` per child drops them; `textContent = ''`
// drops them in one call but only if the program owns the parent; a detach that BANKS the nodes is
// a different job again. They are not spellings of one program, they are four programs, and a
// floor that quietly picked the flattering one would be worse than no floor. The 2×2 that results:
//
//   floor·rebuild        (rebuild, shared)  200 × `remove()`, then 200 × clone+fill+insert
//   floor·rebuild·owned  (rebuild, owned)   ONE `textContent = ''`, same show
//   floor·rebuild·frag   (rebuild, owned)   + the 200 inserts batched through a DocumentFragment
//   floor·rebuild·twin   THE NULL — `floor·rebuild` declared twice, true difference ZERO
//   floor·kept           (keep, shared)     panels built once; 200 × `remove()`, then 200 ×
//                                           (`.data` store + insert)
//   floor·kept·owned     (keep, owned)      the same, hidden with ONE `textContent = ''`
//
// `display: none` IS NOT A ROW AND CANNOT BE ONE: it leaves 200 panels in the markup where the
// reference has none, so `gateMarkup` throws at the 'hidden again' state. It is also a different
// job — nothing is created, destroyed, detached or re-attached — and
// `participants/floor/toggle.ts` says at length what it would have measured instead.
//
// READ THE COMPARABILITY MAP BEFORE QUOTING ANY OF THEM. A `keep` floor bounds the rows that KEEP
// their panels — `exodraKept`, `exodraPlacedKept`, `exodraDirectKept`, `exodraMachineKept`
// and its twin,
// `exodraDetachedKept`, `exodraDetachedAllKept` and `mikadoPooled` — and NOTHING ELSE; a `rebuild`
// floor bounds the rest and not those. This repository made exactly the cross-contract mistake this
// rule exists to prevent, in the same week, on `mount-floor`'s `app-clone·fill`.
//
// AND THE KEEP CONTRACT SPLITS BY PARENT EXACTLY AS THE REBUILD ONE DOES. All but one of them hide
// with ONE `textContent = ''` and are bounded by `floor·kept·owned`; `exodraDetachedKept` hides with
// 200 × `removeChild`, because `TExoChildList.detach` is a per-index command, and is bounded by
// `floor·kept`. The `keep+shared` contract exists in `TOGGLE_CONTRACTS` for that one row.
//
// AND THE LAST TWO OF THOSE SEVEN ARE THE SAME PROGRAM ON THE TWO SIDES OF THAT SPLIT, which is the
// most useful pair on this axis. `exodraDetachedKept` and `exodraDetachedAllKept` share a mount
// function, a set of panels, a show loop and a text-write path; they differ in ONE LINE of the hide
// — 200 × `detach`, or one `detachAll()`. So each is read against its own floor and the two ratios
// are compared, never the two numbers. `detachAll` did not exist once, and this file said
// so, in three places, as a MISSING STRATEGY: there was no owned form of the placement pair, so a
// keep block written directly could not express the smaller job however cheap it got. It can now.
//
// AND THE FLOOR IS WHAT FORCED THE PARENT CONTRACT TO BE READ RATHER THAN ARGUED. Building it
// meant asking which spelling of a hide `exodra` actually performs, which turned out to be an
// unread flag rather than a matter of opinion: the port is its element's only child, so
// `ownsElement` is 1, so `ownsParent` is true, so the hide is ONE `textContent = ''` on top of N
// unmounts. The trace is in the paragraph above, `gateOwnsParent` proves it twice below, and
// `exodra`, `exodraDelegated` and `exodraKept` are paired with the `·owned` floors accordingly.
//
// THE SHARED-PARENT ROWS STAY, AND NOT OUT OF TIDINESS. `floor·rebuild − floor·rebuild·owned` is
// what OWNING THE PARENT IS WORTH at this size, measured with one statement of a program changed
// and nothing else — a number this repository did not have. They are also the floor for the other
// shape of our own renderer, a children port WITH siblings, which is the branch at
// `attach-exo-children.ts:299` and what most real components look like. And they bracket the eight
// participants whose clear path nobody here has read.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT EACH PARTICIPANT USES, in one line apiece. The long argument is in each participant's own
// file, and every one of them states what it deliberately does NOT use.
//
//   exodra   — a children port filled by `reconcileExoOrder` over a source array of rows;
//              `[]` hides, 200 rows show.
//   exodraDelegated — the same block, rendered with `createExoDelegatedEvents(['click'])` and a
//              descriptor handler instead of the default direct pack and a closure (see above:
//              TWO differences, and the root is the scenario's own container).
//   exodraPlaced — the same WITHOUT THE CHILDREN RECONCILER: the wire fills nothing, and the
//              application appends what it built and clears with one `textContent = ''`. NOT a
//              competitor and NOT a floor: it exists to be SUBTRACTED, and `reportLayers` is
//              the only place its number means anything.
//   exodraPlacedKept — the kept block WITHOUT THE CHILDREN RECONCILER AND WITHOUT THE PORT: the
//              holder keeps the panels it built, appends them itself and clears with one
//              `textContent = ''` after N `unmount`s.
//   exodraDirectKept — the same WITHOUT THE REACTIVE LAYER either: no cell and no subscription, the
//              text written through the `c.fillDoors()` handle each panel's own wire handed out. NOT
//              competitors and NOT floors: these two exist to be SUBTRACTED, and
//              `reportKeptLayers` is the only place their numbers mean anything.
//   exodraDetachedKept — the same panels again, moved by the region's PLACEMENT pair: the wire fills
//              its children port with `c.childList(P.panels)` and a hide is 200 × `detach`, a
//              show 200 × `attach` — the pair that runs NO `mount` and NO `unmount`, so the panels
//              keep their elements, their subscriptions and their wiring and the measured region
//              contains no lifecycle call at all. IT IS A PARTICIPANT AND ITS FLOOR IS `floor·kept`,
//              not `floor·kept·owned`: `detach` is per index, so its hide is 200 removals. Do not
//              subtract it from the three rows above — that crosses a contract.
//   exodraDetachedAllKept — THE SAME ROW WITH ITS HIDE SAID ONCE: `region.detachAll()` in place of
//              the 200-iteration `detach` loop, everything else identical down to the mount
//              function. The port owns its element, so the bulk call empties the host with ONE
//              `textContent = ''`, so this row is `keep + OWNED` and bounded by `floor·kept·owned`.
//              A PARTICIPANT, and the only one that is both `keep + owned` and free of every
//              lifecycle call. Read the two detached rows as two ratios against two floors.
//   solid    — `<For>` over a signal.
//   svelte   — a keyed `{#each}` over `$state.raw`.
//   react    — a keyed `.map()` with `flushSync` per transition.
//   voby     — `<For>` over an observable, `tick()` per transition.
//   marko    — `<for by="id">` fed through `update({ rows })`.
//   lit      — a plain `.map()` in a child part (no `repeat()`: nothing survives an empty list).
//   mikado   — an unkeyed view, `render(rows)` / `render([])`.
//   stage0   — `reconcile(root, rendered, rows, createPanel)`, the CEILING row.
//   uhtml    — an array of `Hole`s committed by `udomdiff` (no `key`, for the same reason as Lit).
//   sinuous  — a function child returning 200 built panels or `null`.
//   floor·*  — no library at all: a module-load `<template>` prototype cloned 200 times, a
//              three-hop walk, a `.data` store, one `addEventListener`, one insert; and a hide in
//              each of its two spellings. THE BOUND, not a competitor. See
//              `participants/floor/toggle.ts`.
//
// `stage0` IS THE CEILING, not a competitor: a show is a clone, a text write, a listener and an
// insert per panel with no library between them. Read every competing row as "stage0 plus what
// that library's list block costs to express".
//
// TWO ASYMMETRIES IN WHAT A PANEL COSTS, both real, both left exactly as the libraries do them,
// because hiding either would be worse than pricing it:
//   * Mikado's routing has no table keyed by node — the ATTRIBUTE is the registration — so its
//     panels carry `click="exoTogClose"` in the DOM. It is STRIPPED for the structural comparison
//     and its count and byte cost are PRINTED on every gate line (see `gateMikadoMarkup`), and
//     nothing else is forgiven. The timing consequence is bigger than the bytes: the attribute
//     rides along in the factory clone, so Mikado attaches NO listener per panel.
//   * Svelte 5 DELEGATES click (one root listener plus an expando per element), so it does not
//     pay an `addEventListener` per panel either. Solid, React, voby, Lit, stage0, uhtml, sinuous
//     and the schema core each attach one listener per panel; Marko writes one expando property.
//     Delegation genuinely is cheaper per rebuild; this is what it looks like when a benchmark
//     says so out loud instead of burying it. `exodraDelegated` PRICES it for this core rather
//     than leaving it as an asymmetry to argue about — see its own section above, including the
//     second difference it drags in and what that means for reading the delta.
//
// WHICH PARTICIPANTS ARE MARKUP-GATED: exodraKept, exodraPlacedKept,
// exodraDirectKept, exodraMachineKept and its twin, exodraDetachedKept,
// exodraDetachedAllKept, marko, lit, mikado, mikadoPooled,
// stage0,
// uhtml, sinuous and all six `floor·*` rows — every one of them against a fresh `exodra` reference
// fired in lockstep,
// through four states (hidden as mounted / shown / hidden again / shown again), plus the identity
// check below. `solid`, `svelte`, `react` and `voby` are NOT gated here, and that is inherited
// rather than decided: they are gated on no axis in this suite (`grep gateMarkup` — every call
// site is one of the eight names above), and turning four ungated participants into gated ones is
// a suite-wide policy change that belongs in its own review, not smuggled into a rescale where a
// first blind run that throws would produce no table at all.
//
// AND THE CLAIM THE WHOLE AXIS RESTS ON IS PINNED RATHER THAN ASSERTED. For every competing row
// the gate requires that NOT ONE of the panels visible after the first show is still there after
// the second — a row that quietly kept its subtree would be running a different program and its
// number would belong beside the diagnostics. For the two diagnostics it requires the exact
// opposite: ALL 200 nodes must come back, or the cache never engaged and the row is a second,
// slower copy of its competing row wearing a cache's name.
import { For, createSignal } from 'solid-js';
import { createElement as rc, useState } from 'react';
// Module scope, because `Mikado.compile()` is the runtime compiler and the template below has to
// be compiled ONCE for the life of the process — never inside a measured region, the same deal
// Solid's compiler and the schema core's port numbering get.
import Mikado from 'mikado';
import { abBench, type AbContract, type AbRow, type Scenario } from '../../../harness';
import { gateMarkup, markupOf } from '../../gates/markup-gate';
// Package specifiers, never a path into another package's src: the schema core is measured out
// of its `dist`, so `npm run build` at the repo root has to have run or it is measured stale.
// `TExoFillDoors` is the KEEP LADDER's bottom rung and nothing else: `exodraDirectKept` fills its
// panels' text through the handle `c.fillDoors()` hands a wire, which is how an application drives a
// port with no cell and no subscription behind it. See the keep-ladder section in the header.
// `createExoMachineBuilder` and `createExoSchema` are the two rows added beside `exodraDirectKept`: the SAME kept block
// with the panel's text written by a MODULE-LEVEL transition that takes the instance, instead of
// through a kept port table, and its null. See their section below.
import {
    createExoMachineBuilder,
    createExoSchema, // WHAT COMPOSES AN AD-HOC PACK ONTO A BACKEND. `withExoCompiler(new ExoDomBackend(...))` no longer takes packs —
    // every shipped one is a `with*` decorator — and the delegated-events row's pack is written
    // here rather than shipped, so it is merged by hand. `composeExoPlugins` MUTATES and returns the
    // object it is handed, so `DELEGATED_BACKEND` is one identity and the schema cache keys on it.
    composeExoPlugins,
    type TExoNode,
    type TExoFillDoors,
    type TExoChildrenPort,
    type TExoEventPort,
    type TExoTextPort,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import type { TExoMachineInitialState } from '@exodra/core';
// `exoDomSchemaOf` is here for ONE reason: `gateOwnsParent` reads this block's compiled schema to
// prove which clear branch a hide takes, exactly as `teardown-phases.tsx` does before it times
// anything. It is used in a gate and never in a measured region — and it is asked with the SAME
// backend object the row it describes renders through, because a schema is cached per backend by
// pointer and any other one would be a schema nothing runs.
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    exoDomSchemaOf,
    exoNodeDom,
    // THE CHILDREN PORT AS COMMANDS — `exodraDetachedKept` and nothing else here. That row drives
    // ONE region by hand and moves its panels with `attach`/`detach`, the pair that runs no `mount`
    // and no `unmount`; every other kept row on this axis either hands its region to the reconciler
    // or leaves its port unfilled and calls `appendChild` itself. See that row's section in the
    // header. It is an EXONODE METHOD — `cc.childList(port)` — so nothing is imported for it; only
    // the type it hands back is.
    type TExoChildList,
    // WHICH BACKEND MADE A CHILD. Every `TExoNode` this file holds came out of a
    // `TExoDomNode.build` and goes back into a `TExoChildList`, both of which say so in their
    // signatures — so the arrays and sources below have to say it too. It is a type argument and
    // nothing else: no import is added to the measured bundle and no line of any timed region
    // changed.
    type TExoDomMark,
    type TExoDomNode,
    withExoChildList,
    withExoCompiler,
} from '@exodra/dom';

/**
 * THE SHIPPED BACKEND, BUILT ONCE FOR THE PROCESS — what every `@exodra/dom` row that composes
 * nothing renders through, and the schema cache key those rows share. The composed ones stand
 * beside their own sections below, for the reason stated there: a backend built inside `prep` is a
 * fresh key and re-parses this panel's markup on every sample.
 */
const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/** Panels in one shown block. */
const PANELS = 200;
/** Hide+show cycles per measured region. */
const CYCLES = 20;

const noop = (): void => {};

/** One panel's data. Structurally the row every participant file declares for itself. */
type TToggleRow = { id: number; text: string };

/**
 * WHAT A PANEL'S WIRE READS, BY INDEX — THERE ARE NO PROPS ANYWHERE IN THIS LIBRARY.
 *
 * A wire is `(enode, index) => TOut`: the second parameter is the POSITION and nothing else, so the
 * item a panel stands for is written into one of these arrays an instant before `c.build` runs the
 * wire. THREE arrays, because the panels below want three different things of their holder — a
 * row's text, a cell to subscribe to, a slot to hand a port table back through — and one array per
 * kind keeps the store a plain indexed write with no tag to test. The third (`BUILDING_SLOTS`)
 * stands with the type it holds.
 *
 * Module level and never re-allocated: a holder overwrites the slots it is about to build into, so
 * nothing here allocates inside a measured region. ONE indexed store per panel is what the absence
 * of props costs this axis, and it is paid by every exodra row here equally.
 * `packages/dom/src/dom/tests/reconcile-exo-children.test.ts` writes the idiom out with its
 * reasoning.
 */
const BUILDING_ROWS: TToggleRow[] = [];
const BUILDING_CELLS: TExoBenchSource<string>[] = [];

/**
 * TWO GENERATIONS OF ROWS, allocated once for the life of the process and alternated, so that
 * consecutive shows never carry the same data and no allocation happens inside a measured region.
 * Ids are disjoint between them, so a keyed list has nothing to match across a hide either.
 */
const generation = (g: number): readonly TToggleRow[] =>
    Array.from({ length: PANELS }, (_, i) => ({
        id: g * PANELS + i,
        text: `panel ${g}-${i}`,
    }));
const GEN_A: readonly TToggleRow[] = generation(0);
const GEN_B: readonly TToggleRow[] = generation(1);
const HIDDEN: readonly TToggleRow[] = [];

/**
 * THE MEASURED SEQUENCE, as data rather than as arithmetic in every participant's loop: show A,
 * hide, show B, hide, … — `CYCLES` shows and `CYCLES` hides, ending hidden, so every participant
 * runs literally the same transitions in literally the same order.
 */
const STATES: readonly (readonly TToggleRow[])[] = Array.from({ length: CYCLES * 2 }, (_, j) =>
    j % 2 === 1 ? HIDDEN : j % 4 === 0 ? GEN_A : GEN_B
);

// --- THE AXIS'S SELF-CHECK ---------------------------------------------------------------------

/**
 * THE CLOCK'S REAL RESOLUTION, observed rather than assumed.
 *
 * Chromium clamps `performance.now()` (~0.1 ms with the flags this suite launches with, finer
 * with cross-origin isolation, coarser under some privacy settings), and an axis whose fastest
 * row sits on that quantum has measured nothing at all — which is exactly what this axis did for
 * its whole life. So it is measured here, printed at the top of the run, and used to judge the
 * table at the bottom.
 *
 * HOW: spin until the clock actually moves and keep the smallest step it ever takes. Anything
 * smaller than the true quantum is impossible to observe; anything larger only appears if the
 * loop was descheduled, which is why the MINIMUM over many tries is the answer.
 */
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

/** How many quanta the fastest row must clear for the table to be worth reading. */
const MIN_TICKS = 10;

/**
 * IS THIS TABLE A MEASUREMENT OR THE CLAMP, printed as its own line either way.
 *
 * The fastest row is the one at risk — everything else is above it — so it is the one judged. On
 * a failure the line says by what FACTOR the axis is short and what `PANELS` would have to become,
 * because the alternative (a reader deciding for themselves how much bigger is big enough) is how
 * an axis stays broken for a year.
 */
/**
 * `batch` IS PART OF THE INSTRUMENT AND NOT DECORATION — the same correction `reportLayers` needed.
 * `abBench` times `batch` scenarios in ONE region and divides, so a per-scenario median of `m` was
 * read off `batch × m` of clock. Judging `m` against a raw quantum prices an instrument this run did
 * not use, and at a large batch it under-reports the resolution by that whole factor. Fixed here
 * together with `reportFloor`, after the same blindness in `reportLayers` threw away
 * two resolved differences on a batch-100 run. At batch 1 every figure is unchanged.
 */
function reportScale(rows: readonly AbRow[], quantum: number, batch: number): void {
    const fastest = rows[0];
    const ticks = fastest.stat.median / (quantum / batch);
    if (ticks >= MIN_TICKS) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ scale toggle: fastest row \`${fastest.name}\` median ${fastest.stat.median.toFixed(
                3
            )} ms ` +
                `= ${ticks.toFixed(1)}× the per-scenario quantum (${(quantum / batch).toFixed(
                    4
                )} ms — the observed ${quantum.toFixed(3)} over batch ${batch}) — ` +
                `above the ${MIN_TICKS}× floor, so the ordering in the table above is resolvable`
        );
        return;
    }
    const factor = ticks > 0 ? MIN_TICKS / ticks : Infinity;
    const wantPanels = Number.isFinite(factor) ? Math.ceil(PANELS * factor) : PANELS * 10;
    // eslint-disable-next-line no-console
    console.log(
        `❌ scale toggle: UNDER-SCALED. Fastest row \`${fastest.name}\` median ` +
            `${fastest.stat.median.toFixed(3)} ms = ${ticks.toFixed(
                1
            )}× the per-scenario quantum ` +
            `(${(quantum / batch).toFixed(4)} ms — the observed ${quantum.toFixed(
                3
            )} over batch ${batch}), against a floor of ` +
            `${MIN_TICKS}×. The table above is the ` +
            `clock, not the frameworks. Raise \`PANELS\` in axes/list/toggle.tsx from ${PANELS} ` +
            `to at least ${wantPanels} (×${
                Number.isFinite(factor) ? factor.toFixed(1) : '10+'
            }) — or ` +
            `raise \`CYCLES\` from ${CYCLES} by the same factor — and run it again.`
    );
}

// --- THE FLOOR'S REPORT ------------------------------------------------------------------------

// eslint-disable-next-line no-console
const say = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

/** How many observed quanta an individual FLOOR row must clear to be a bound rather than the clamp. */
const MIN_FLOOR_TICKS = 3;

/** Every floor row, for the clock refusal below. */
const FLOOR_NAMES: readonly string[] = [
    'floor·rebuild',
    'floor·rebuild·owned',
    'floor·rebuild·frag',
    'floor·rebuild·twin',
    'floor·kept',
    'floor·kept·owned',
];

/**
 * WHO IS BOUNDED BY WHICH FLOOR, IN THREE TIERS OF EVIDENCE — because the evidence really is of
 * three different qualities and flattening it would be the same move that put a wrong sentence in
 * this file's header for months.
 *
 * The NODE contract (`rebuild` vs `keep`) is proved for every row by the axis's own gates:
 * `gateRebuilds` demands that no panel survives a hide, `gateKeeps` that all 200 do. Nothing below
 * is about that half. What is tiered is the PARENT contract — whether the hide is one call or 200.
 */

/**
 * SETTLED: read line by line off `@exodra/dom` and proved twice by `gateOwnsParent`.
 */
const OWNED_SETTLED: readonly string[] = ['exodra', 'exodraDelegated'];
/**
 * BY CONSTRUCTION — `exodraPlaced` performs the hide ITSELF, in this file, with one
 * `parent.textContent = ''` after N `unmount`s, which is `removeAll`'s owned branch written out at the call
 * site. There is no schema flag to read for it and none is needed: the statement is three lines
 * above in `exodraPlacedPrep`, and `gateRebuilds` proves the host really is empty at the hidden state.
 *
 * IT IS NOT A PARTICIPANT AND NOT A FLOOR. It exists to be SUBTRACTED — from `exodra` above it and
 * from `floor·rebuild·owned` below it. Its absolute ratio against the floor is printed only
 * because the contract machinery prints one for every member; `reportLayers` is where its number
 * means something.
 */
const OWNED_BY_CONSTRUCTION: readonly string[] = ['exodraPlaced'];
/**
 * CITED: this file's header quotes mikado.js:1513-1580 and stage0's `reconcile` fast path. I did
 * not open either, so these are the axis's claims carried forward, not my readings.
 */
const OWNED_CITED: readonly string[] = ['mikado', 'stage0'];
/**
 * SETTLED: this row's region comes from `c.childList(P.panels)`, which hands
 * `createExoChildList` `schema.ownsElement[port.index] === 1` as its `ownsParent`, so the hide its
 * reconciler performs is `removeAll`'s owned branch — N × `unmount`, then ONE `textContent = ''`.
 */
const KEEP_OWNED_SETTLED: readonly string[] = ['exodraKept'];
/**
 * SETTLED TOO, AND BY A DIFFERENT ROUTE, WHICH IS WHY IT IS ITS OWN TIER ARRAY RATHER THAN A SECOND
 * NAME IN THE ONE ABOVE. That one reaches the one-call clear through `reconcileExoOrder` →
 * `removeAll` → the owned branch, and its evidence sentence says so. THIS row fills no
 * reconciler at all: it drives its children port by hand and hides with `TExoChildList.detachAll`,
 * which reads the SAME `ownsElement` flag off the SAME compiled schema — `c.childList` hands it to
 * `createExoChildList` as `ownsParent`, the identical expression the reconciled row's region gets
 * — and ends in the same single `parent.textContent = ''` with no `unmount` loop in front
 * of it. Same fact, same flag, different call, and an evidence string that names the wrong route is
 * how a tier stops meaning anything.
 *
 * AND IT IS PROVED BY BEHAVIOUR AS WELL, on its own mount, by the sentinel this axis already uses
 * twice: a foreign node appended to the host does not survive the hide, which only the one-call
 * clear can do. See its gate block.
 *
 * IT IS A PARTICIPANT AND NOT A LAYER ROW. It is not subtractable from `exodraDirectKept` above it
 * (that row pays 400 lifecycle calls per cycle and this one pays none, but they also differ in
 * whether the port is filled at all), and it is emphatically not subtractable from
 * `exodraDetachedKept`, which is the same program under the OTHER parent contract.
 */
const KEEP_OWNED_SETTLED_BY_REGION: readonly string[] = ['exodraDetachedAllKept'];
/**
 * BY CONSTRUCTION, for the reason `exodraPlaced` is in the rebuild contract's by-construction tier:
 * these two rows perform the hide THEMSELVES, in this file, with one `root.textContent = ''` after N
 * `unmount`s — which is `removeAll`'s owned branch written out at the call site. There is no schema flag
 * to read for them and none is needed: the statement is three lines above in each `prep`, and
 * `gateKeeps`'s four-state drive proves the host really is empty at the hidden state while all 200
 * panels are still held.
 *
 * THEY ARE NOT PARTICIPANTS AND NOT FLOORS. They exist to be SUBTRACTED — from `exodraKept`
 * above them and from `floor·kept·owned` below them. Their absolute ratios against the keep floor are
 * printed only because the contract machinery prints one for every member; `reportKeptLayers` is
 * where their numbers mean something.
 */
const KEEP_OWNED_BY_CONSTRUCTION: readonly string[] = [
    'exodraPlacedKept',
    'exodraDirectKept',
    // THE MACHINE ROW AND ITS NULL, ON THE SAME EVIDENCE AND NOT A WEAKER ONE: their hide is the
    // identical `for … unmount()` loop followed by ONE `root.textContent = ''`, written out in this
    // file three lines above each `prep`, and `gateKeeps` proves the host is empty at the hidden
    // state while all 200 panels are still held. They differ from `exodraDirectKept` in how a
    // panel's text is WRITTEN and in nothing about how the block is hidden.
    'exodraMachineKept',
    'exodraMachineKept·twin',
];
/**
 * THE OTHER KEEP CONTRACT, WITH ONE MEMBER — `keep + SHARED parent`, whose hide is 200 removals and
 * not one assignment.
 *
 * BY CONSTRUCTION, and the construction is `TExoChildList.detach`: it is a PER-INDEX command, so
 * `exodraDetachedKept`'s hide is `PANELS` × `removeChild` by the shape of the API and not by a flag
 * anyone could read off a schema.
 *
 * THIS USED TO SAY THERE WAS NO OWNED FORM OF THE PLACEMENT PAIR, and recorded that as a MISSING
 * STRATEGY. It has since been built — `TExoChildList.detachAll` — and `exodraDetachedAllKept` is the
 * row that spends it, under `keep + owned`, one tier array above. THIS ROW DID NOT MOVE and must
 * not: `detach` is still per index, this row still calls it 200 times, and what it now measures is
 * the honest cost of the shape that CANNOT take the one-call clear at any price — a children port
 * with siblings, which is what most real components look like. The missing strategy is filled; the
 * row that named it is now the shared-parent measurement it always also was.
 *
 * SO IT IS PAIRED WITH `floor·kept`, which performs the identical two DOM operations in the
 * identical numbers: 200 × `remove()` per hide, 200 × `appendChild` per show, over nodes built once.
 * `gateKeeps` proves the panels really come back and `gateMarkup` proves the host is empty at the
 * hidden state, which is everything this pairing asserts.
 *
 * IT IS A PARTICIPANT AND NOT A LAYER ROW. It is not subtractable from anything above it: the three
 * kept rows there are `keep + owned`, and a difference across contracts is two jobs with a number
 * between them. What it is FOR is the one question the keep ladder could not ask — what the block
 * costs when the renderer is told to move nodes and nothing else.
 */
const KEEP_SHARED_BY_CONSTRUCTION: readonly string[] = ['exodraDetachedKept'];
/** CITED: Mikado banks its nodes through that same one-call branch. */
const KEEP_OWNED_CITED: readonly string[] = ['mikadoPooled'];
/**
 * UNREAD, AND PRINTED AS A RANGE FOR EXACTLY THAT REASON. This file's header used to assert that
 * all eight clear per child. It cited source for none of them and I have not opened their runtimes
 * either, so they are bracketed between the two floors instead of assigned to one. Anyone who
 * reads one of these libraries' clear paths can move that name into a tier above and delete a
 * range.
 */
const CLEAR_PATH_UNREAD: readonly string[] = [
    'solid',
    'svelte',
    'react',
    'voby',
    'marko',
    'lit',
    'uhtml',
    'sinuous',
];

/**
 * THE SAME MAP, HANDED TO THE HARNESS SO A NARROW RUN CAN PRINT A VERDICT — see `AbContract`.
 *
 * IT IS DERIVED FROM THE TIER ARRAYS ABOVE AND FROM NOTHING ELSE, so there is exactly one place in
 * this file that says who is bounded by what. `reportFloor` below reads the same four arrays; if a
 * name moves between tiers, both the wide report and the narrow verdict move with it and neither
 * can drift from the other.
 *
 * `CLEAR_PATH_UNREAD` IS DELIBERATELY IN NO CONTRACT. Those eight rows are BRACKETED between the two
 * rebuild floors precisely because nobody in this repository has read their clear path, and a
 * contract is an assertion that a specific floor bounds a specific row. A narrow run that selects
 * one of them gets `NO DECLARED FLOOR` and is sent to `reportFloor`'s bracket — which is what this
 * file actually knows.
 *
 * THE `floors` LISTS ARE CANDIDATES, NOT NOMINATIONS. The harness takes the CHEAPEST one present,
 * mechanically, exactly as `reportFloor` does with `Math.min(floor·rebuild·owned, floor·rebuild·frag)`
 * — so if the fragment probe turns out to win, it becomes the bound without this comment being wrong.
 */
const TOGGLE_CONTRACTS: readonly AbContract[] = [
    {
        name: 'rebuild+owned',
        floors: ['floor·rebuild·owned', 'floor·rebuild·frag'],
        members: [...OWNED_SETTLED, ...OWNED_CITED, ...OWNED_BY_CONSTRUCTION],
        evidence:
            `SETTLED for ${OWNED_SETTLED.join(', ')} — the one-call clear read line by line off ` +
            '@exodra/dom (ownsElement → childList ownsParent → removeAll owned branch) and proved ' +
            `by gateOwnsParent; CITED for ${OWNED_CITED.join(', ')} — their own ` +
            "sources' one-call clear, quoted in this file's header, not read by me; BY " +
            `CONSTRUCTION for ${OWNED_BY_CONSTRUCTION.join(', ')} — it empties the host with one ` +
            'textContent assignment written out in this file, and gateRebuilds proves it destroys',
        resolutionPair: ['floor·rebuild', 'floor·rebuild·twin'],
    },
    {
        name: 'keep+owned',
        floors: ['floor·kept·owned'],
        members: [
            ...KEEP_OWNED_SETTLED,
            ...KEEP_OWNED_SETTLED_BY_REGION,
            ...KEEP_OWNED_CITED,
            ...KEEP_OWNED_BY_CONSTRUCTION,
        ],
        evidence:
            `SETTLED for ${KEEP_OWNED_SETTLED.join(', ')} — c.childList hands its reconciler the ` +
            `same ownsElement flag, so its clear is removeAll's owned branch; SETTLED for ` +
            `${KEEP_OWNED_SETTLED_BY_REGION.join(
                ', '
            )} — it fills no reconciler at all and hides ` +
            'with TExoChildList.detachAll, which reads that same ownsElement flag through childList ' +
            'and ends in the same single textContent assignment, proved again by its own sentinel ' +
            `gate; CITED for ${KEEP_OWNED_CITED.join(', ')} — Mikado's pool banks through that ` +
            `same branch; BY CONSTRUCTION for ${KEEP_OWNED_BY_CONSTRUCTION.join(', ')} — each ` +
            'empties the host with one textContent assignment written out in this file, and ' +
            'gateKeeps proves the host is empty at the hidden state while all 200 panels are still ' +
            'held',
        resolutionPair: ['floor·rebuild', 'floor·rebuild·twin'],
    },
    {
        name: 'keep+shared',
        floors: ['floor·kept'],
        members: [...KEEP_SHARED_BY_CONSTRUCTION],
        evidence:
            `BY CONSTRUCTION for ${KEEP_SHARED_BY_CONSTRUCTION.join(
                ', '
            )} — TExoChildList.detach is a ` +
            'per-index command, so this row’s hide is 200 removeChild calls and not one textContent ' +
            'assignment; there is no owned form of the placement pair. floor·kept performs the same ' +
            'two DOM operations in the same numbers (200 × remove(), 200 × appendChild, over nodes ' +
            'built once), gateKeeps proves all 200 panels come back, and gateMarkup proves the host ' +
            'is empty at the hidden state',
        resolutionPair: ['floor·rebuild', 'floor·rebuild·twin'],
    },
];

/**
 * WHAT THE FLOOR ROWS SAY, AND WHAT THEY ARE FORBIDDEN FROM SAYING.
 *
 * Every ratio printed here is WITHIN ONE CONTRACT, because a ratio across contracts is not a
 * headroom — it is two different jobs with a number between them. The header of
 * `participants/floor/toggle.ts` carries the map; this function is that map executed rather than described:
 *
 *   `rebuild` rows are bounded by a `rebuild` floor. They destroy 200 panels per hide and build
 *   200 new ones per show, which the axis's `gateRebuilds` proves of every one of them.
 *   `keep` rows — `exodraKept`, `mikadoPooled` — are bounded by a `keep` floor and by NOTHING
 *   ELSE. They create no element inside the timed region at all.
 *
 * AND THE PARENT CONTRACT IS THE SECOND HALF. A program that owns its host may empty it in one
 * call; one that shares it must remove 200 children. THIS USED TO BE PRINTED AS A DISPUTE — two
 * headers in this repository said opposite things about our own hide — and it is now READ: the
 * children port is its element's only child, so `ownsElement` is 1, so `ownsParent` is true, so
 * the hide is `removeAll`'s single `textContent = ''`. `gateOwnsParent` proves it off the
 * schema AND by behaviour before anything is timed, and this function pairs `exodra`,
 * `exodraDelegated` and `exodraKept` against the `·owned` floors on the strength of that.
 *
 * THE SHARED-PARENT FLOORS DID NOT BECOME POINTLESS WHEN THAT WAS SETTLED, and it is worth saying
 * why they are still measured. They price what owning the parent is WORTH — the same program with
 * one statement changed — which is a number this repository did not have; they are the floor for
 * the OTHER shape of our own renderer, a children port that has siblings, which is what
 * `attach-exo-children.ts:299` serves and what most real components look like; and they bracket
 * the eight participants whose clear path nobody here has read.
 *
 * THE RESOLUTION LINE IS WEAK AND IS LABELLED WEAK. `floor·rebuild·twin` is an independently
 * declared, independently prototyped duplicate of `floor·rebuild`, so its true difference from it
 * is zero by construction — but `abBench` hands back medians and not the paired per-round series,
 * so what can be computed here is BIAS (a difference of medians, which is free to cancel) and not
 * the round-to-round NOISE `mount-floor` reads everything against. It is a LOWER bound on this
 * axis's resolution, and a difference between two floor rows that is near it is a RANGE.
 */
/**
 * `batch` divides the quantum here for the same reason it does in `reportScale` and `reportLayers`:
 * a per-scenario median was read off `batch` scenarios of clock. See `reportScale`'s header.
 */
function reportFloor(rows: readonly AbRow[], quantum: number, batch: number): void {
    const at = new Map(rows.map((r) => [r.name, r.stat.median]));
    const med = (n: string): number => at.get(n) ?? NaN;
    const f = (x: number): string => x.toFixed(3);

    // (C) — a floor row under a few ticks is the clock, not a bound. The axis's own `reportScale`
    // judges the FASTEST row at 10×; this judges every floor row at 3× and names the ones it
    // cannot read.
    const perScenarioQuantum = quantum / batch;
    const thin = FLOOR_NAMES.filter((n) => med(n) < MIN_FLOOR_TICKS * perScenarioQuantum);
    if (thin.length > 0) {
        refuse(
            `floor toggle: ${thin.join(', ')} measured under ${MIN_FLOOR_TICKS}× the ` +
                `per-scenario quantum (${f(
                    MIN_FLOOR_TICKS * perScenarioQuantum
                )} ms, batch ${batch}) — those rows are the clock and no ` +
                'bound may be computed from them. Raise `PANELS` or `CYCLES` and run again.'
        );
    }

    // A NARROW RUN (`--only=…`) SAMPLES A FEW ROWS, AND THIS REPORT NEEDS ALL SIX FLOORS.
    //
    // Everything below subtracts one floor from another — the resolution from the twin, the value of
    // owning the parent, the fragment probe — so with a row missing it would print `NaN` half a
    // dozen times and a reader would have to work out which of those are arithmetic and which are
    // findings. It stops instead, and says which rows would bring it back.
    //
    // THE CLOCK REFUSAL ABOVE RUNS FIRST AND IS NOT SKIPPED: whichever floor rows a narrow run DID
    // sample are still judged against three quanta, because a floor on the clamp is not a bound in a
    // two-row table any more than in a twenty-row one. The narrow run's own verdict — participant
    // against its contract's floor, with the same pairing — is printed by `abBench` from
    // `TOGGLE_CONTRACTS`.
    //
    // On a full run every name is present and this is dead code; nothing it prints changes.
    const absent = FLOOR_NAMES.filter((n) => !Number.isFinite(med(n)));
    if (absent.length > 0) {
        say(
            `floor toggle · WIDE FLOOR REPORT SKIPPED — this run did not sample ${absent.join(
                ', '
            )}, and every figure below is a difference between two floor rows. Re-run without ` +
                '`--only`, or add those rows to it, for the resolution, the fragment probe, the ' +
                'four-contract bound and the bracket over the eight unread clear paths.'
        );
        return;
    }

    const bias = Math.abs(med('floor·rebuild') - med('floor·rebuild·twin'));
    say(
        `floor toggle · RESOLUTION (weak): |floor·rebuild − floor·rebuild·twin| = ${f(bias)} ms ` +
            'over two programs whose true difference is ZERO. This is BIAS ONLY — `abBench` ' +
            'returns medians, not the paired per-round series, so the round-to-round noise this ' +
            'instrument really carries is NOT measured and is at least this. Any two floor rows ' +
            `closer together than ${f(bias)} ms are a RANGE, not a size.`
    );

    // The insertion probe, read against the null and against nothing else.
    const frag = med('floor·rebuild·frag') - med('floor·rebuild·owned');
    say(
        `floor toggle · BATCHED INSERTION: floor·rebuild·frag − floor·rebuild·owned = ` +
            `${frag >= 0 ? '+' : ''}${f(frag)} ms over ${CYCLES} cycles ` +
            `(${
                Math.abs(frag) > bias ? 'RESOLVABLE' : 'INSIDE the weak resolution — unreadable'
            }). ` +
            'This is the only axis in the suite whose parent is LIVE while 200 children go into ' +
            "it one at a time, so it is the only place `mount-floor`'s caveat (C) can be asked."
    );

    // The floors themselves: the cheapest row per contract, chosen mechanically.
    const rebuildShared = med('floor·rebuild');
    const rebuildOwned = Math.min(med('floor·rebuild·owned'), med('floor·rebuild·frag'));
    const keptShared = med('floor·kept');
    const keptOwned = med('floor·kept·owned');
    say(
        `floor toggle · THE BOUND, per contract, ms per ${CYCLES} cycles: ` +
            `rebuild+shared ${f(rebuildShared)} · rebuild+owned ${f(rebuildOwned)} · ` +
            `keep+shared ${f(keptShared)} · keep+owned ${f(keptOwned)}. ` +
            'Nothing below these exists to be beaten by: a hide and a show of 200 panels cannot ' +
            'cost less than the DOM calls that move them.'
    );

    /** One participant's headroom, against the floor of ITS contract and no other. */
    const against = (who: string, floorName: string, floor: number): string => {
        const m = med(who);
        if (!Number.isFinite(m) || !Number.isFinite(floor) || floor <= 0) return `${who} —`;
        const ratio = m / floor;
        const share = (1 - 1 / ratio) * 100;
        return (
            `${who} ${f(m)} = ${ratio.toFixed(2)}× ${floorName} (${share.toFixed(0)}% of it is ` +
            'above the floor)'
        );
    };

    for (const [floorName, floor, who, tier] of [
        [
            'floor·rebuild·owned',
            rebuildOwned,
            OWNED_SETTLED,
            'SETTLED — the one-call clear is read off the code and proved twice by gateOwnsParent ' +
                'for exodra/exodraDelegated',
        ],
        [
            'floor·rebuild·owned',
            rebuildOwned,
            OWNED_CITED,
            "CITED — their own sources' one-call clear, quoted in this file's header, not read by me",
        ],
        [
            'floor·rebuild·owned',
            rebuildOwned,
            OWNED_BY_CONSTRUCTION,
            'BY CONSTRUCTION — this row performs the hide itself, N unmounts and one ' +
                'textContent assignment written out at the call site, and gateRebuilds proves the ' +
                'host is empty at the hidden state',
        ],
        [
            'floor·kept·owned',
            keptOwned,
            KEEP_OWNED_SETTLED,
            'SETTLED — c.childList hands its reconciler the same ownsElement flag, so its clear ' +
                "is removeAll's owned branch",
        ],
        [
            'floor·kept·owned',
            keptOwned,
            KEEP_OWNED_SETTLED_BY_REGION,
            'SETTLED — this row fills no reconciler: it drives its children port by hand and hides ' +
                'with TExoChildList.detachAll, which reads the same ownsElement flag off the same ' +
                'compiled schema (childList hands it to createExoChildList as ownsParent) and ends in ' +
                'the same one textContent assignment, with no unmount loop in front of it. Proved ' +
                'again by behaviour on its own mount — a foreign node appended to the host does ' +
                'not survive the hide. It is a PARTICIPANT: read it against this floor, and never ' +
                'against exodraDetachedKept, which is the same program under the other parent ' +
                'contract',
        ],
        ['floor·kept·owned', keptOwned, KEEP_OWNED_CITED, "CITED — Mikado's pool banks through it"],
        [
            'floor·kept·owned',
            keptOwned,
            KEEP_OWNED_BY_CONSTRUCTION,
            'BY CONSTRUCTION — each of these rows performs the hide itself, N unmounts and one ' +
                'textContent assignment written out at the call site, and gateKeeps proves the ' +
                'host is empty at the hidden state with all 200 panels still held. They are LAYER ' +
                'ROWS and not participants: read them in reportKeptLayers, as differences',
        ],
        [
            'floor·kept',
            keptShared,
            KEEP_SHARED_BY_CONSTRUCTION,
            'BY CONSTRUCTION — TExoChildList.detach is per index, so this row hides with 200 ' +
                'removeChild calls and belongs to the SHARED-parent keep contract. It is a ' +
                'participant and not a layer row: it may be read against floor·kept and against ' +
                'nothing else on this axis, least of all against the keep+owned rows above',
        ],
    ] as Array<[string, number, readonly string[], string]>) {
        say(
            `floor toggle · vs ${floorName} [${tier}]: ` +
                who
                    .filter((n) => Number.isFinite(med(n)))
                    .map((n) => against(n, floorName, floor))
                    .join(' · ')
        );
    }

    // THE EIGHT WHOSE CLEAR PATH NOBODY HERE HAS READ — bracketed, never assigned. The header used
    // to assert the per-child path for all of them and cite source for none; a range is what that
    // state of knowledge actually supports.
    say(
        `floor toggle · CLEAR PATH UNREAD (bracketed between ${f(rebuildOwned)} and ` +
            `${f(rebuildShared)} — whether these libraries empty their host in one call or 200 ` +
            'has not been established by anyone in this repository): ' +
            CLEAR_PATH_UNREAD.filter((n) => Number.isFinite(med(n)))
                .map(
                    (n) =>
                        `${n} ${f(med(n))} = ${(med(n) / rebuildOwned).toFixed(2)}–${(
                            med(n) / rebuildShared
                        ).toFixed(2)}×`
                )
                .join(' · ')
    );

    // AND WHAT THE TWO REBUILD FLOORS PRICE BETWEEN THEM: the whole value of owning the parent, at
    // this block's size, with nothing else in the frame.
    say(
        `floor toggle · WHAT OWNING THE PARENT IS WORTH: floor·rebuild − floor·rebuild·owned = ` +
            `${f(rebuildShared - med('floor·rebuild·owned'))} ms over ${CYCLES} cycles ` +
            `(${
                Math.abs(rebuildShared - med('floor·rebuild·owned')) > bias
                    ? 'RESOLVABLE'
                    : 'INSIDE the weak resolution — unreadable'
            }) — 200 × remove() against ONE textContent assignment, everything else identical. ` +
            `The keep pair says the same thing over kept nodes: ` +
            `${f(keptShared - keptOwned)} ms.`
    );

    // (A) — stated in the answer and not only in the header, because it bounds the bound.
    say(
        'floor toggle · WHAT EVERY ROW ABOVE UNDER-COUNTS: Blink settles a detach at its next ' +
            `lifecycle update, which no code in the page can observe. This region is ${CYCLES} ` +
            `hides and ${CYCLES} shows strictly alternating and ENDS HIDDEN, so ${CYCLES - 1} of ` +
            `the ${CYCLES} hides have their deferred cost paid by the show that follows them ` +
            'INSIDE the region, and the last one does not. Every row pays that equally, so the ' +
            'ratios move far less than the absolute numbers — but a floor row is a lower bound on ' +
            'a lower bound and may only be quoted as one.'
    );
}

// --- WHERE THE GAP GOES: THE LAYER REPORT -------------------------------------------------------

/** How many observed quanta ONE DIFFERENCE must clear before it may be quoted as a size. */
const MIN_STEP_TICKS = 3;

/**
 * WHERE THE GAP TO THE FLOOR ACTUALLY GOES — one line per layer, and a refusal wherever the run
 * cannot support one.
 *
 * WHAT MAKES THIS DIFFERENT FROM THE FIVE STAND-IN RUNGS IT REPLACED: every row here is the SHIPPING
 * RENDERER with one layer the application did not ask for, so a difference is the price of that
 * layer in `@exodra/dom` and not the price of somebody's imitation of it. The rungs were the second
 * kind, they were run twice, and they failed — `participants/floor/toggle.ts`'s header keeps both
 * tables and the three refusals that killed them.
 *
 * THE ARITHMETIC IT PRINTS AND WHAT EACH FIGURE IS ALLOWED TO MEAN:
 *
 *   THE GAP      `exodra` − `floor·rebuild·owned`, the whole thing, in ms per CYCLES cycles and in
 *                ns per panel built-and-destroyed. This is the number the goal is stated about
 *                (≤1.10× is the target; 1.17–1.18× is what two runs recorded).
 *   A REMOVAL    Two rows where one asks for a layer and the other does not, and NOTHING ELSE
 *                differs. Monotone by construction, so a backwards one is the instrument.
 *   A REPLACEMENT  Two rows where a layer is swapped for what the application must do instead. It
 *                has no guaranteed sign, it is labelled, and EITHER sign is a finding.
 *   THE RESIDUE  There is none, and by construction rather than by luck: the three differences
 *                telescope onto the gap exactly. The last line CHECKS that arithmetic against the
 *                table anyway, because a row quietly missing would otherwise be invisible.
 *
 * THREE REFUSALS, EACH BY NAME, BECAUSE A REPORT THAT PRINTS UNREADABLE DIFFERENCES IS WORSE THAN NO
 * REPORT — a reader cannot tell a measured zero from an unmeasured one unless the run says which:
 *
 *   (1) NOT MONOTONE, ON THE REMOVAL PAIRS ONLY. A row that does strictly less work cannot cost
 *       more, so a backwards REMOVAL means the instrument and every figure from it is void. The
 *       REPLACEMENT pair is exempt BY NAME and not by omission — its sign is a result.
 *   (2) UNDER THREE QUANTA. `abBench` times `batch` scenarios in ONE region and divides
 *       (`sampleOnce`), so a per-scenario difference of Δ is measured across `batch × Δ` of clock.
 *       The refusal prints `ceil(3 × quantum / Δ)` — the batch at which it becomes a measurement —
 *       so the fix is a command line and not a judgement call.
 *
 *       AND THE DIVISION HAS TO HAPPEN IN THE COMPARISON TOO, which is what this paragraph described
 *       and the code did not do for a while. `reportLayers` was never handed `batch`: it held
 *       every difference against a raw `3 × quantum` as though the run were always batch 1. The run
 *       that caught it was `toggle 30 100` — batch ONE HUNDRED — where it refused a 0.213 ms and a
 *       0.096 ms difference and told the reader to "re-run with batch 2" and "batch 4", conditions
 *       already exceeded fifty-fold. Both differences were resolved; the report threw them away.
 *
 *       The tell was that ONE run printed two standards: the GOAL line judged the same table against
 *       the measured null (0.016 ms) and called every row resolvable, while these lines judged
 *       against 0.300 ms and called two of three unmeasured. Two floors in one report, and only one
 *       of them knew what batch it was running at.
 *   (3) INSIDE THE NULL. `|floor·rebuild − floor·rebuild·twin|` is two programs whose true
 *       difference is ZERO, and `abBench` returns medians, so it is BIAS and is a LOWER bound on
 *       this axis's resolution (caveat D). It is printed beside every difference; one under it is a
 *       RANGE and is labelled one.
 */
function reportLayers(rows: readonly AbRow[], quantum: number, batch: number): void {
    const at = new Map(rows.map((r) => [r.name, r.stat.median]));
    const med = (n: string): number => at.get(n) ?? NaN;
    const f = (x: number): string => x.toFixed(3);
    /** ms over the whole region → ns per panel built and destroyed once. */
    const perPanel = (ms: number): string => ((ms * 1e6) / (CYCLES * PANELS)).toFixed(1);

    // The chain, most layers first, and the three differences between its four rows. Named here
    // once so every check below reads the same list. `REMOVAL` is monotone by construction and
    // refused if it comes out backwards; `REPLACEMENT` is not, and says so on its own line.
    const CHAIN: ReadonlyArray<{
        readonly more: string;
        readonly less: string;
        readonly kind: 'REMOVAL' | 'REPLACEMENT';
        readonly what: string;
    }> = [
        {
            more: 'exodra',
            less: 'exodraPlaced',
            kind: 'REPLACEMENT',
            what:
                'THE CHILDREN RECONCILER against HAND PLACEMENT — the notification, the shown ' +
                'mirror and the Map it diffs against, the order splices, index and the clear ' +
                'branch, against the holder appending what it built. Both pay one exoNodeDom() ' +
                'per panel (insert() makes the same call) and both pay the staging store that ' +
                'stands in for the props this library does not have, so neither is in it',
        },
        {
            more: 'exodraPlaced',
            less: 'floor·rebuild·owned',
            kind: 'REMOVAL',
            what:
                'EVERYTHING THE RENDERER ADDS OVER A STRAIGHT LINE — the acquire through the ' +
                'node-source slot, the TExoDomChild record, the walk read ' +
                'from the schema instead of written out, and two fills dispatched through the ' +
                'schema setters (both sides place and clear with the SAME two DOM calls)',
        },
    ];
    const needed: readonly string[] = [
        'exodra',
        'exodraPlaced',
        'floor·rebuild·owned',
        'floor·rebuild',
        'floor·rebuild·twin',
    ];
    const absent = needed.filter((n) => !Number.isFinite(med(n)));
    if (absent.length > 0) {
        say(
            `layers toggle · SKIPPED — this run did not sample ${absent.join(
                ', '
            )}. Every figure ` +
                'here is a difference between two of those rows, so with one missing the report ' +
                'would print NaN and leave a reader to work out which. Re-run without `--only`, ' +
                'or with the selection printed in `participants/floor/toggle.ts`.'
        );
        return;
    }

    const bias = Math.abs(med('floor·rebuild') - med('floor·rebuild·twin'));
    const gap = med('exodra') - med('floor·rebuild·owned');
    say(
        `layers toggle · THE GAP BEING SPLIT: exodra ${f(med('exodra'))} − floor·rebuild·owned ` +
            `${f(med('floor·rebuild·owned'))} = ${f(gap)} ms per ${CYCLES} cycles = ` +
            `${perPanel(gap)} ns per panel built-and-destroyed, i.e. ` +
            `${(med('exodra') / med('floor·rebuild·owned')).toFixed(2)}× the floor. The null on ` +
            `this run is ${f(bias)} ms (BIAS only — see caveat D).`
    );

    // (1) MONOTONICITY, on the REMOVAL pairs and checked before anything is priced: a difference
    // that goes the wrong way voids every figure computed from it, so it is reported as a refusal
    // and not as a negative price. The REPLACEMENT pair is skipped deliberately — see its line.
    const backwards = CHAIN.filter(
        (d) => d.kind === 'REMOVAL' && med(d.less) > med(d.more) + bias
    ).map((d) => `${d.less} (${f(med(d.less))}) > ${d.more} (${f(med(d.more))})`);
    if (backwards.length > 0) {
        refuse(
            `layers toggle · NOT MONOTONE: ${backwards.join(' · ')}. The second row of each of ` +
                'those pairs is the SAME renderer doing STRICTLY LESS — one layer not asked for, ' +
                'nothing added — so a row that measures MORE than the one containing it has ' +
                'measured something other than the work: a layout boundary that moved, a ' +
                'de-optimisation in one body and not the other, or the clock. The differences ' +
                'below that involve these rows are VOID, whatever they print. And a row that lands ' +
                'BELOW `floor·rebuild·owned` here is NOT a smaller job: `exodraPlaced` performs ' +
                'the same two DOM operations the floor does and strictly more JavaScript around ' +
                'them, so that reading is the instrument and must be read as one.'
        );
    }

    // The differences themselves, one line each, with the refusal folded into the line rather than
    // printed somewhere else — a reader must not have to join two outputs to know if a size is real.
    for (const d of CHAIN) {
        const step = med(d.more) - med(d.less);
        // DIVIDED BY `batch`, because the difference being judged is PER SCENARIO and the clock that
        // has to resolve it saw `batch` of them in one region. The batch this run needs is
        // `ceil(3 × quantum / |Δ|)` and does not depend on the batch it is running at — Δ is already
        // per scenario — so `wantBatch` keeps its formula and only the comparison changes. At batch 1
        // this is identical to what stood here; at batch 100 it is the difference between reporting
        // two measurements and throwing them away.
        const floorTicks = (MIN_STEP_TICKS * quantum) / batch;
        if (!(Math.abs(step) >= floorTicks)) {
            const wantBatch =
                step !== 0 ? Math.ceil((MIN_STEP_TICKS * quantum) / Math.abs(step)) : Infinity;
            refuse(
                `layers toggle · ${d.more} − ${d.less} = ${f(step)} ms — UNDER ` +
                    `${MIN_STEP_TICKS} quanta at batch ${batch} (${f(floorTicks)} ms), so this ` +
                    `difference is the clamp and NOT a measurement of ${d.what}. It is not a small ` +
                    `price; it is an unmeasured one. Re-run this axis with batch ${
                        Number.isFinite(wantBatch) ? wantBatch : '≥100'
                    } — \`npm run axis --workspace=@exodra/benchmarks -- toggle 100 ${
                        Number.isFinite(wantBatch) ? wantBatch : 100
                    }\` — which times that many scenarios in one region before dividing.`
            );
            continue;
        }
        const shareOfGap = gap > 0 ? (step / gap) * 100 : NaN;
        say(
            `layers toggle · ${d.more} − ${d.less} = ${f(step)} ms = ${perPanel(step)} ns per ` +
                `panel = ${shareOfGap.toFixed(0)}% of the gap [${d.kind}] — ${d.what}. ${
                    Math.abs(step) > bias
                        ? 'RESOLVABLE against the null'
                        : `INSIDE the null (${f(bias)} ms) — a RANGE, not a size`
                }.${
                    d.kind === 'REPLACEMENT'
                        ? ' EITHER SIGN IS A FINDING: this pair is not a removal, and a negative ' +
                          'number says hand placement costs MORE than the reconciler it replaced, ' +
                          'which is an answer and not a fault.'
                        : ''
                }`
        );
    }

    // The telescoping check, and it is deliberately the last line: a decomposition is only worth its
    // residue, and this one's claim is that it has NONE. The check cannot fail by arithmetic — the
    // rows are one chain and each difference is the next subtraction down it — so what it actually
    // guards is the TABLE: a row quietly absent, a name changed on one side only, or a median that
    // is not the row it says it is would all surface here as a non-zero.
    const summed = CHAIN.reduce((acc, d) => acc + (med(d.more) - med(d.less)), 0);
    const residue = gap - summed;
    say(
        `layers toggle · THE TWO DIFFERENCES SUM TO ${f(summed)} ms AGAINST A GAP OF ${f(gap)} ` +
            `— residue ${f(
                residue
            )} ms, which is zero by construction. A non-zero means the table ` +
            'is not what this report thinks it is, NOT that something went unattributed. WHAT SITS ' +
            'INSIDE THE LAST DIFFERENCE AND IS NOT SPLIT FURTHER: the child record and its mark, ' +
            'the walk the schema names, and the setter dispatch. Nothing in the public API can decline ' +
            'any of the three, so there is no row for them — a FINDING about the renderer, not a ' +
            'hole in this decomposition. The reactive dispatch is already absent from every row ' +
            'here (`PANEL` fills with `c.text`, never a binding), and the per-child teardown call ' +
            'is declinable but costs more to decline than it saves on a rebuild; both are argued ' +
            "in this file's header."
    );
}

// --- WHERE THE KEEP GAP GOES: THE SECOND LAYER REPORT -------------------------------------------

/**
 * WHERE `exodraKept − floor·kept·owned` GOES — the same instrument as `reportLayers`, on the OTHER
 * CONTRACT, and the reason it had to be written separately rather than folded in.
 *
 * A RATIO ACROSS CONTRACTS IS NOT A HEADROOM. The `rebuild` rows destroy 200 panels per hide and
 * build 200 per show; the `keep` rows create no element inside the timed region at all. So the
 * ladder above telescopes onto `floor·rebuild·owned` and this one telescopes onto
 * `floor·kept·owned`, and neither figure may be carried into the other's report.
 *
 * ═══ WHY THIS EXISTS ═══
 *
 * The axis has had a keep FLOOR and no keep LADDER since the floor was built. The recording in
 * `.gate/toggle.afterPorts.json` (batch 1) reads `floor·kept·owned` 1.6,
 * `mikadoPooled` 2.2, `exodraKept` 2.4 — so we are 0.8 ms over the keep floor where Mikado's pool is
 * 0.6, and until now NOTHING IN THIS AXIS COULD SAY WHAT THAT 0.8 IS MADE OF. An axis that proves it
 * loses and cannot decompose the loss has published a gap and hidden the answer.
 *
 * ═══ THE CHAIN, AND WHAT IS AND IS NOT IN IT ═══
 *
 *   exodraKept        an effect per panel + the reconciler over a source of CHILDREN; panels built
 *                     in the wire at mount, untimed.
 *   exodraPlacedKept  the same, HAND PLACEMENT: no reconciler, no children port, one pass.
 *   exodraDirectKept  the same, TEXT WRITTEN DIRECTLY: no cell, no subscription, `fillDoors().text` per show.
 *   floor·kept·owned  no renderer at all.
 *
 * THE THREE DIFFERENCES TELESCOPE ONTO THE KEEP FLOOR EXACTLY and there is no residue for anything
 * to hide in, by arithmetic rather than by luck. The last line checks it against the table anyway,
 * because a row quietly absent would otherwise be invisible.
 *
 * THERE IS NO ITEM-RECONCILED RUNG ON THIS CONTRACT, AND THAT IS A FINDING RATHER THAN A HOLE. A
 * keep-alive cannot be written over a source of ITEMS on this axis: `reconcileExoOrder` matches
 * by the identity of the item object, and this axis alternates two generations of 200 rows whose
 * objects and ids are DISJOINT by construction (see the header — a cache that re-attaches nodes
 * already reading correctly is not doing a pool's job). So an item-reconciled row with `KEEP_ALIVE`
 * would match nothing across a transition, would build a second set of 200 panels for the second
 * generation, and would answer `gateKeeps` with 0 of 200. It is the DATA that forbids the rung, not
 * the renderer: a list whose item objects are stable across the hide keeps its children through the
 * same call. `exodraKept` reconciles over the CHILDREN instead, which is why it keeps them.
 *
 * WHAT IS NOT SPLIT OUT, AND WHY THERE IS NO ROW FOR IT — the same shape of finding the rebuild
 * ladder's last paragraph carries, on the layers that survive into `exodraDirectKept`:
 *
 *   * THE CHILD RECORD IS NOT REMOVABLE AT ALL. `createExoDomChildFactory` builds the one constructor and
 *     every built child gets one; no public call hands back an element without one. It is inside
 *     `exodraDirectKept − floor·kept·owned`, together with the `mount()`/`unmount()` calls it
 *     publishes, and it cannot be separated from them without instrumenting the shipping code.
 *   * THE PER-SHOW `mount()` AND PER-HIDE `unmount()` ARE NOT DECLINABLE EITHER, and the reason is
 *     not that the field cannot be overwritten — `exodraKept` overwrites `unmount` and that is the
 *     whole row. It is that the CALLS remain: `TExoChildList.insert`/`remove` make both on every
 *     insertion and every clear, so a hand-placed row that skipped them would be doing a smaller job
 *     than the reconciler it is being subtracted from, and the difference would stop being a layer.
 *   * THE SETTER DISPATCH IS NOT DECLINABLE. `fillDoors().text` is already the shortest fill this API
 *     has — one array load for the writer, one for the element, one call — and there is no door
 *     below it. What the floor does instead is hold the Text node itself, which is a thing no
 *     caller of this renderer can be handed: `PANEL_BOUND`'s effect holds no node either,
 *     so what it saves is a notification and not a lookup. THAT is the single named thing standing
 *     between `exodraDirectKept` and the keep floor, and it is a MISSING STRATEGY rather than a
 *     fault: nothing in the public API lets a caller say "give me the node this port writes to".
 *
 * ═══ THE REFUSALS, AND ONE OF THEM IS EXPECTED ═══
 *
 * Same three as `reportLayers`, same reasons, same code: not monotone (on the REMOVAL pairs only),
 * under three quanta at the run's batch, and inside the null.
 *
 * AND THE LAST DIFFERENCE IS EXPECTED TO BE REFUSED AT BATCH 1. `exodraDirectKept − floor·kept·owned`
 * is, per panel per show, one setter dispatch with a `firstChild`/`nodeType` test in front of the
 * same `.data` store the floor makes, plus one `mount()` call — and per hide one `unmount()` call
 * that does nothing. Over 20 cycles that is plausibly a small fraction of a millisecond, which at a
 * 0.1 ms quantum is under the three-quanta bar. THE REFUSAL IS THE CORRECT OUTPUT WHEN THAT HAPPENS
 * and the batch must NOT be raised to make it go away: the refusal prints the batch at which the
 * difference becomes a measurement, and that number is the answer. This is written here BEFORE the
 * first run so that the refusal is read as predicted rather than as a surprise — the same treatment
 * the rebuild ladder's replacement pair got when it came out at 0.000 at batch 1.
 */
function reportKeptLayers(rows: readonly AbRow[], quantum: number, batch: number): void {
    const at = new Map(rows.map((r) => [r.name, r.stat.median]));
    const med = (n: string): number => at.get(n) ?? NaN;
    const f = (x: number): string => x.toFixed(3);
    /** ms over the whole region → ns per panel shown once. */
    const perPanel = (ms: number): string => ((ms * 1e6) / (CYCLES * PANELS)).toFixed(1);

    const CHAIN: ReadonlyArray<{
        readonly more: string;
        readonly less: string;
        readonly kind: 'REMOVAL' | 'REPLACEMENT';
        readonly what: string;
    }> = [
        {
            more: 'exodraKept',
            less: 'exodraPlacedKept',
            kind: 'REPLACEMENT',
            what:
                'THE CHILDREN RECONCILER AND THE CHILDREN PORT against HAND PLACEMENT — the ' +
                'notification, the shown mirror and the Map it diffs against, the order splices, ' +
                'index and the clear branch, plus the two-pass shape a reconciler forces (all 200 ' +
                'texts written before the array is handed over), against a holder that writes and ' +
                'places each panel in ONE pass and empties the host itself',
        },
        {
            more: 'exodraPlacedKept',
            less: 'exodraDirectKept',
            kind: 'REPLACEMENT',
            what:
                'THE REACTIVE LAYER against A PORT WRITTEN DIRECTLY — 200 cells, 200 apply closures ' +
                'and 200 disposers, and per show 200 notifications with their equality ' +
                'test and their re-read of getValue(), against 200 × fillDoors().text. It is a ' +
                'REPLACEMENT and not a removal only in label: both ends go through the same ' +
                'setter, so what the subscription adds is the notification and the disposer',
        },
        {
            more: 'exodraDirectKept',
            less: 'floor·kept·owned',
            kind: 'REMOVAL',
            what:
                'EVERYTHING THE RENDERER ADDS OVER A STRAIGHT LINE IN THE KEEP CONTRACT — the ' +
                'setter dispatch through the schema (against the floor holding its own Text node), ' +
                'the TExoDomChild record, and its mount() per show and unmount() per hide. Both ' +
                'sides place and clear with the SAME two DOM calls, so nothing else is in it',
        },
    ];
    const needed: readonly string[] = [
        'exodraKept',
        'exodraPlacedKept',
        'exodraDirectKept',
        'floor·kept·owned',
        // NOT PART OF THE CHAIN. It is quoted on the gap line as the rival this ladder exists
        // because of, so a run without it would print a NaN in the middle of a sentence.
        'mikadoPooled',
        'floor·rebuild',
        'floor·rebuild·twin',
    ];
    const absent = needed.filter((n) => !Number.isFinite(med(n)));
    if (absent.length > 0) {
        say(
            `kept layers toggle · SKIPPED — this run did not sample ${absent.join(', ')}. Every ` +
                'figure here is a difference between two of those rows, so with one missing the ' +
                'report would print NaN and leave a reader to work out which. Re-run without ' +
                '`--only`, or with exactly this selection: ' +
                '`--only=exodraKept,exodraPlacedKept,exodraDirectKept,' +
                'mikadoPooled,floor.kept.owned,floor.rebuild,floor.rebuild.twin`'
        );
        return;
    }

    // THE NULL IS THE REBUILD PAIR'S, AND THAT IS STATED RATHER THAN QUIETLY BORROWED. There is no
    // twin on the keep contract — `floor·kept` and `floor·kept·owned` differ by a real statement —
    // so the only two programs in this run whose true difference is ZERO are the rebuild twin pair.
    // What it bounds is THE INSTRUMENT (this harness, this clock, this session), not a contract, so
    // it is the resolution here as well; what it does NOT do is say anything about the size of a
    // keep-contract row. Caveat D applies unchanged: it is BIAS, and a lower bound.
    const bias = Math.abs(med('floor·rebuild') - med('floor·rebuild·twin'));
    const gap = med('exodraKept') - med('floor·kept·owned');
    const poolOver = med('mikadoPooled') - med('floor·kept·owned');
    say(
        `kept layers toggle · THE GAP BEING SPLIT: exodraKept ${f(med('exodraKept'))} − ` +
            `floor·kept·owned ${f(med('floor·kept·owned'))} = ${f(
                gap
            )} ms per ${CYCLES} cycles = ` +
            `${perPanel(gap)} ns per panel shown-and-hidden, i.e. ` +
            `${(med('exodraKept') / med('floor·kept·owned')).toFixed(
                2
            )}× the keep floor. The null ` +
            `on this run is ${f(
                bias
            )} ms (BIAS only, off the REBUILD twin pair — see caveat D and ` +
            `the note above this line). Mikado's pool sits at ${f(med('mikadoPooled'))} on the ` +
            `same floor, i.e. ${poolOver >= 0 ? '+' : ''}${f(
                poolOver
            )} ms over it — and that is a ` +
            'COMPARISON AND NOT A PAIRING: its pool is also empty at the start of every sample, so ' +
            'its first show clones 200 nodes from the factory too (mikado.js:1057-1080, CITED in ' +
            "this file's header and not read by me). The row of ours that answers it directly is " +
            '`exodraKept`, which now builds its panels at mount, untimed — the same place the keep ' +
            'floor clones its own.'
    );

    // (1) MONOTONICITY, on the REMOVAL pairs only and checked before anything is priced — the same
    // rule and the same reason as `reportLayers`. The two REPLACEMENT pairs are exempt BY NAME:
    // hand placement is not free, and neither is the port the reconciler needs.
    const backwards = CHAIN.filter(
        (d) => d.kind === 'REMOVAL' && med(d.less) > med(d.more) + bias
    ).map((d) => `${d.less} (${f(med(d.less))}) > ${d.more} (${f(med(d.more))})`);
    if (backwards.length > 0) {
        refuse(
            `kept layers toggle · NOT MONOTONE: ${backwards.join(' · ')}. The second row of each ` +
                'of those pairs is the SAME program doing STRICTLY LESS — the renderer removed ' +
                'entirely — so a row that measures MORE ' +
                'than the one containing it has measured something other than the work: a layout ' +
                'boundary that moved, a de-optimisation in one body and not the other, or the ' +
                'clock. The differences below that involve these rows are VOID, whatever they ' +
                'print. And a row that lands BELOW `floor·kept·owned` here is NOT a smaller job: ' +
                '`exodraDirectKept` performs the same two DOM operations the keep floor does and ' +
                'strictly more JavaScript around them.'
        );
    }

    for (const d of CHAIN) {
        const step = med(d.more) - med(d.less);
        const floorTicks = (MIN_STEP_TICKS * quantum) / batch;
        if (!(Math.abs(step) >= floorTicks)) {
            const wantBatch =
                step !== 0 ? Math.ceil((MIN_STEP_TICKS * quantum) / Math.abs(step)) : Infinity;
            refuse(
                `kept layers toggle · ${d.more} − ${d.less} = ${f(step)} ms — UNDER ` +
                    `${MIN_STEP_TICKS} quanta at batch ${batch} (${f(floorTicks)} ms), so this ` +
                    `difference is the clamp and NOT a measurement of ${d.what}. It is not a small ` +
                    `price; it is an unmeasured one. Re-run this axis with batch ${
                        Number.isFinite(wantBatch) ? wantBatch : '≥100'
                    } — \`npm run axis --workspace=@exodra/benchmarks -- toggle 100 ${
                        Number.isFinite(wantBatch) ? wantBatch : 100
                    }\` — which times that many scenarios in one region before dividing.`
            );
            continue;
        }
        const shareOfGap = gap > 0 ? (step / gap) * 100 : NaN;
        say(
            `kept layers toggle · ${d.more} − ${d.less} = ${f(step)} ms = ${perPanel(
                step
            )} ns per ` +
                `panel = ${shareOfGap.toFixed(0)}% of the gap [${d.kind}] — ${d.what}. ${
                    Math.abs(step) > bias
                        ? 'RESOLVABLE against the null'
                        : `INSIDE the null (${f(bias)} ms) — a RANGE, not a size`
                }.${
                    d.kind === 'REPLACEMENT'
                        ? ' EITHER SIGN IS A FINDING: this pair is not a removal, and a negative ' +
                          'number says what replaced the layer costs MORE than the layer did, ' +
                          'which is an answer and not a fault.'
                        : ''
                }`
        );
    }

    const summed = CHAIN.reduce((acc, d) => acc + (med(d.more) - med(d.less)), 0);
    const residue = gap - summed;
    say(
        `kept layers toggle · THE THREE DIFFERENCES SUM TO ${f(summed)} ms AGAINST A GAP OF ` +
            `${f(gap)} — residue ${f(
                residue
            )} ms, which is zero by construction. A non-zero means ` +
            'the table is not what this report thinks it is, NOT that something went ' +
            'unattributed. WHAT SITS INSIDE THE LAST DIFFERENCE AND IS NOT SPLIT FURTHER: the ' +
            'child record, the mount()/unmount() calls the reconciler would make anyway, and the ' +
            'setter dispatch. Nothing in the public API can decline any of the three, so there is ' +
            'no row for them — a FINDING about the renderer, not a hole in this decomposition. And ' +
            'the ONE thing named inside it that a strategy could remove is the Text node itself: ' +
            'the floor holds it and no caller of this renderer can be handed it, so "hand me the ' +
            'node this port writes to" is a MISSING STRATEGY on ' +
            'this contract, stated by name rather than absorbed into a residue. THERE IS NO ' +
            'ITEM-RECONCILED RUNG HERE and the reason is the DATA, not the renderer — see this ' +
            'function’s header.'
    );
}

// --- MIKADO'S PANEL ----------------------------------------------------------------------------
/**
 * The same four elements every participant on this axis builds and tears down, 200 at a time.
 *
 * `click="exoTogClose"` IS MIKADO'S EVENT SYSTEM AND IT IS THE ONE THING IN THIS FILE THAT DOES
 * NOT MATCH THE REFERENCE'S BYTES. Mikado's routing keeps no table keyed by node: `construct()`
 * writes the route name onto the element with `setAttribute(key, val[key])` and registers ONE
 * global delegated listener per event type with `listen(key)` (factory.js:274-277); a click is
 * then resolved by walking up from the target and reading the attribute back with
 * `target.getAttribute(type)` (event.js:85). The attribute IS the registration — there is no way
 * to name a route without leaving it in the DOM — so each panel serialises as
 *
 *     <button click="exoTogClose">x</button>
 *
 * where the reference has `<button>x</button>`. One extra ATTRIBUTE per SHOWN panel, zero extra
 * elements, and since the block is only in the document half the time, zero of them while hidden.
 * `gateMikadoMarkup` below removes that one attribute name for the STRUCTURAL comparison and
 * PRINTS its count and byte cost on every line; anything else that diverges still fails.
 *
 * THE HANDLER IS KEPT rather than dropped, for the reason `MkToggle.marko` gives: the panel
 * really does carry a listener for Solid, React, voby, Lit, stage0, uhtml, sinuous and the schema
 * core, and a Mikado panel without one would be the single cheapest panel here for a reason that
 * has nothing to do with Mikado. But it is NOT the same cost — the attribute rides in the factory
 * clone, so a rebuild attaches nothing at all — and that is stated in the header rather than
 * buried here.
 */
const MK_PANEL: ReturnType<typeof Mikado.compile> = Mikado.compile(
    '<div class="panel"><h4>Panel</h4><p>{{ data.text }}</p><button click="exoTogClose">x</button></div>'
);

// The route the attribute names, registered once for the life of the process. Mikado's route table
// is PROCESS-GLOBAL (`event.js` keeps one `routes` object for the whole page), so this cannot be
// per-mount even if it wanted to be. It does nothing, exactly as `noop` does nothing for the
// others — no click is ever dispatched on this axis.
Mikado.route('exoTogClose', noop);

/** Every `click="…"` in a rendered tree — the ONE attribute name the gate below forgives. */
const MK_ROUTE_ATTR = / click="[^"]*"/g;

/**
 * The markup gate for the two Mikado rows: `gateMarkup`'s contract, minus exactly one attribute
 * name, with the price printed.
 *
 * THE ROUTE ATTRIBUTE IS NOT HIDDEN, IT IS PRICED. Suppressing it silently would let a
 * participant ship payload the others do not and still read as "identical"; failing the gate on
 * it would drop the only Mikado rows this axis can have, since Mikado has no other way to attach
 * a handler from a template. Neither is honest, so: strip and state. The exemption is exactly one
 * attribute name wide — if ANY divergence survives the strip, this still throws, exactly as
 * `gateMarkup` does.
 */
function gateMikadoMarkup(
    stage: string,
    who: string,
    reference: HTMLElement,
    subject: HTMLElement
): void {
    const want = markupOf(reference);
    const raw = markupOf(subject);
    const got = raw.replace(MK_ROUTE_ATTR, '');
    const routes = raw.match(MK_ROUTE_ATTR);
    const n = routes ? routes.length : 0;
    const bytes = raw.length - got.length;
    const refN = reference.querySelectorAll('*').length;
    const subN = subject.querySelectorAll('*').length;
    if (want === got) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate toggle/${who} @ ${stage}: identical markup — ${want.length} chars, ` +
                `${refN} elements; PLUS ${n} route attribute${
                    n === 1 ? '' : 's'
                } (${bytes} bytes) ` +
                "Mikado's delegation must leave in the DOM"
        );
        return;
    }
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ gate toggle/${who} @ ${stage}: DIFFERENT markup even with the ${n} route attribute` +
            `${n === 1 ? '' : 's'} removed — ${refN} elements (reference) / ${subN} elements ` +
            `(${who}), first difference at char ${at}\n` +
            `  reference: …${want.slice(from, at + 160)}…\n` +
            `  ${who}   : …${got.slice(from, at + 160)}…`
    );
    throw new Error(
        `toggle: ${who} builds a different tree from the reference @ ${stage} — and NOT because of ` +
            "Mikado's route attribute, which was already removed before this comparison"
    );
}

// --- the schema core's PANEL: module scope, built once for the life of the process -------------
// This is the declaration a show clones, so it is the one that must not be rebuilt per scenario:
// `createExoMachineBuilder` numbers its ports at module load and the DOM backend compiles its schema on the
// first render and never again. The button's handler is an EVENT PORT — it emits no markup and
// still costs a slot, so the panel really does carry the listener the others attach. The text is
// `set`, not `bind`: a panel built for one show never changes its text, it is thrown away, and a
// per-panel subscription that could never fire is work no competing participant does either.
const PANEL_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const mPANEL = createExoMachineBuilder<TExoDomNode>(PANEL_SCHEMA);
mPANEL.createInitialState((c, i) => {
    c.text(PANEL_SCHEMA.ports.text, BUILDING_ROWS[i].text);
    c.on(PANEL_SCHEMA.ports.close, noop);
});
const PANEL = mPANEL.done();

/**
 * THE SAME PANEL WITH ITS TEXT BOUND — the panel `exodraKept` builds once and keeps.
 *
 * It differs from `PANEL` in its text: an effect following a cell instead of a write. That is what a kept panel
 * needs and a rebuilt one does not — a panel that survives a hide has to be able to show the NEXT
 * generation's text when it comes back, which is the same thing Mikado's pooled `create()` does
 * when it applies data to a node it popped. The subscription that makes it possible is also the
 * reason the child's `unmount` has to be overridden: the default one ends it.
 */
const PANEL_BOUND_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const mPANEL_BOUND = createExoMachineBuilder<TExoDomNode>(PANEL_BOUND_SCHEMA);
const K_PANEL_BOUND = mPANEL_BOUND.createInitialState((c, i) => {
    c.on(PANEL_BOUND_SCHEMA.ports.close, noop);
    return BUILDING_CELLS[i];
});
const showBoundText = mPANEL_BOUND.transition((c: TExoDomNode) => {
    c.text(PANEL_BOUND_SCHEMA.ports.text, c.readState(K_PANEL_BOUND).getValue());
});
mPANEL_BOUND.effect((c) => {
    showBoundText(c);
    return c.readState(K_PANEL_BOUND).onChange(() => showBoundText(c));
});
const PANEL_BOUND = mPANEL_BOUND.done();

/**
 * WHERE ONE DIRECT PANEL PUTS ITS PORT HANDLE — one object per panel, allocated in `prep`.
 *
 * It is the exact counterpart of the ONE source per panel that `exodraKept` allocates
 * (`cells`), and it is allocated in the same place and at the same count, so the two rows differ in
 * WHAT they hold per panel and not in HOW MANY objects they hold.
 */
type TToggleSlot = { ports: TExoFillDoors | null };

/** The third staging array — see `BUILDING_ROWS`. Its slots are what `PANEL_DIRECT` writes into. */
const BUILDING_SLOTS: TToggleSlot[] = [];

/**
 * THE SAME PANEL AGAIN, WRITTEN BY HAND — the panel `exodraDirectKept` builds once, keeps, and
 * writes into WITHOUT a cell and WITHOUT a subscription.
 *
 * It differs from `PANEL_BOUND` in its follow: where that one runs an effect over its cell — a write
 * now plus a subscription for later, the subscription being what makes a kept panel able to show the
 * next generation's text — this one says `c.text(P.text, '')` and then hands the instance's PORT
 * TABLE out to the holder (`slot.ports = c.fillDoors()`). The holder writes the text itself, per show,
 * through `p.text(P.text, …)`.
 *
 * `fillDoors()` IS THE PUBLIC DOOR AND ITS WHOLE PURPOSE IS THIS. Its own header prints the idiom — an
 * initial fill through the handle and every fill after it — and it is sound after the wire has
 * returned because the node table it wraps belongs to the INSTANCE and not to the pooled connector.
 * So this is a strategy a user can write, not an instrumentation hole cut into the renderer.
 *
 * WHY THE TEXT IS FILLED WITH `''` AT WIRE TIME rather than left for the first show: so that this
 * row and `PANEL_BOUND` pay the same initial write. That effect's first act is `c.text(P.text,
 * cell.getValue())` — the same door, the same setter, with the empty cell behind it — so the pair
 * differs in the subscription and not in the paint.
 */
const PANEL_DIRECT_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const mPANEL_DIRECT = createExoMachineBuilder<TExoDomNode>(PANEL_DIRECT_SCHEMA);
mPANEL_DIRECT.createInitialState((c, i) => {
    c.text(PANEL_DIRECT_SCHEMA.ports.text, '');
    c.on(PANEL_DIRECT_SCHEMA.ports.close, noop);
    // THE ONE LINE THIS COMPONENT EXISTS FOR. Called while the connector is standing on this
    // instance, which is the only moment it may be called; what it hands back outlives the
    // call, which is the only reason this row can exist.
    BUILDING_SLOTS[i].ports = c.fillDoors();
});
const PANEL_DIRECT = mPANEL_DIRECT.done();

// --- the schema core's PANEL AS A MACHINE, IMPERATIVELY SPELLED -------------------------------
//
// THE SAME KEPT BLOCK AS `exodraDirectKept`, WITH THE PORT WRITTEN BY A DECLARED TRANSITION.
//
// `PANEL_DIRECT` above is the hand-written WIRE: it fills the two ports, hands the instance's PORT
// TABLE out to the holder, and the holder writes `ports.text(P.text, …)` per show. The panel below is
// the same job written as a MACHINE in its IMPERATIVE spelling — one transition, declared ONCE for
// the whole component at module level, that writes the text port itself with `c.port`. What the
// holder keeps is the INSTANCE where the other row keeps a port table.
//
// WHAT IS IDENTICAL, so the pair differs by one thing: the four elements, the two ports, the fill at
// wire time (through `connector.set`, which is the door that RECORDS a fill and therefore the only
// one an initial paint may use), `KEEP_ALIVE` on the child, the materialisation at mount, the one
// `textContent = ''` hide and the `appendChild` + `mount()` show. Every one of those lines is copied
// from the row it stands beside.
//
// WHAT DIFFERS, NAMED, AND THERE ARE TWO TERMS AND NOT ONE:
//
//   · THE DOOR. A call to what `m.transition` handed back — which for an undecorated machine is the
//     author's own arrow returned unchanged, so the door is a plain call and the `c.set` inside it —
//     against a bare `ports.set` method call.
//   · ONE PROPERTY STORE. The machine panel REMEMBERS the text it last wrote, in its cache slot, so
//     it can answer what it shows. `PANEL_DIRECT` keeps nothing: it writes the string into the DOM
//     and forgets it. That is a smaller job, and the machine row does the larger one.
//
// AND THERE IS NO `m.field` IN IT BECAUSE THERE COULD NOT BE. A field earns its address and its bit
// by being READ by an `m.derive`, an `m.fill` or an `m.effect`, and this component declares none of
// the three; `done()` refuses a field whose mark word is zero and names the cache as what it should
// have been. The shape is the library's, not a preference.
//
// IT IS NOT A RUNG OF THE KEEP LADDER and must not be inserted into `reportKeptLayers`'s CHAIN. Every
// rung there is one layer NOT ASKED FOR; this is the same layer SPELLED DIFFERENTLY, so it is a row
// beside `exodraDirectKept` and a separate printed line, never a subtraction inside that chain.

/** What one machine panel remembers — the text it last wrote, and nothing else. In the CACHE and not
 *  in a field, for the reason above: nothing derives from it, so it has no bit and needs none. */
type TMachinePanelMemory = { text: string };

/**
 * THE PANEL'S SCHEMA — the same four elements in the same order as `PANEL`, `PANEL_BOUND` and
 * `PANEL_DIRECT`, character for character, so the markup gate is comparing wirings and not markup.
 *
 * `createExoSchema` and not `createExoMachineBuilder`, because a machine IS the wire: there is no wire factory to hand
 * ports to, and the ports are numbered when this call returns, which is what `m.done()` requires.
 */
const MACHINE_PANEL_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const MPP = MACHINE_PANEL_SCHEMA.ports;

/** What a transition and a keep factory are handed — THE EXONODE ITSELF. There is no machine-instance
 *  wrapper: the object a wire and a declaration receive IS the instance. */
type TMachinePanel = TExoDomNode;

const mPanel = createExoMachineBuilder<TExoDomNode>(MACHINE_PANEL_SCHEMA);

/**
 * THE CACHE, AND THE PANEL'S INITIAL FILL, IN ONE DECLARATION — a machine takes no props, so the
 * factory that makes one panel's memory is also the only per-instance moment before the handlers are
 * armed, and it is where the text port is painted.
 *
 * THE FILL GOES THROUGH `c.set`, which is the one write door a wire has.
 *
 * THE TEXT IS FILLED WITH `''`, exactly as `PANEL_DIRECT` fills it, and for the reason that row
 * states: `setExoText` on the parsed-empty placeholder is a `.data` store that LEAVES the Text node
 * standing.
 */
const K_PANEL = mPanel.createInitialState((c): TMachinePanelMemory => {
    c.text(MPP.text, '');
    return { text: '' };
});

/** The close handler, DECLARED ONCE for the component where `PANEL_DIRECT`'s wire calls `c.on` once
 *  per instance. `armExoNode` makes that same one call per instance off this declaration. */
mPanel.on(MPP.close, noop);

/**
 * THE OUT INTERFACE — one DECLARED TRANSITION, and it is everything the world may do to a panel.
 *
 * `m.transition` IS THE MACHINE'S DOOR AND COSTS THE ROW NOTHING TO GO THROUGH. The builder checks
 * that the declaration stands in front of `done()` and hands the author's own function straight back
 * (`createExoMachineBuilder.ts:76-81`), so what the holder calls per show is the arrow written here and no wrapper
 * round it. The declaration is what makes it a door rather than a loose function over an exonode.
 *
 * NO `exoTransition` WRAPS IT EITHER, AND THE REASON IS CHECKABLE RATHER THAN STYLISTIC.
 * `exoTransition` takes a compiled PROGRAM; `createExoMachineBuilder` alone compiles none, and only
 * `withExoComputedMachine` does — which would put one engine effect and one `effectStops` array on
 * every panel in order to obtain a wrapper that `exoTransition.ts:22-25` then declines to build,
 * because this component declares no field, no derivation, no fill and no effect and
 * `computes.length === 0 && bodyMask === 0` returns the author's own function unchanged.
 * `handler-count.ts` states the same case.
 *
 * THE WRITE GOES THROUGH `c.set` BECAUSE NO SECOND WRITE DOOR IS LEFT: `TExoWiring`'s own note
 * says "THERE IS NO THIRD WRITE DOOR", and the remaining pair (`portTable()` + `portNodeWriter()`)
 * costs two calls per write against `set`'s one. The property store beside it is the term in
 * `exodraMachineKept − exodraDirectKept`.
 */
const setPanelText = mPanel.transition<string>((c, value) => {
    c.readState(K_PANEL).text = value;
    c.text(MPP.text, value);
});

const MACHINE_PANEL = mPanel.done();

// --- THE NULL'S PANEL: the same machine, declared a SECOND time --------------------------------
/**
 * THE OTHER HALF OF THIS AXIS'S FIRST KEEP-CONTRACT NULL, and it is written out again rather than
 * aliased or produced by a factory for the reason `list-reconcile.tsx`'s `LI_TWIN` gives: what has to
 * be duplicated is the DECLARATION — a second trip through `createExoSchema`, a second port numbering, a
 * second `createExoMachineBuilder`, a second compiled program and a second schema on a second backend. An alias
 * would give a difference of zero by SHARING rather than by construction.
 *
 * WHY THIS AXIS WANTED ONE. `reportKeptLayers` says it in its own words: "there is no twin on the
 * keep contract … so the only two programs in this run whose true difference is ZERO are the rebuild
 * twin pair" — and the rebuild pair is taken an order of magnitude away from where the kept rows sit,
 * so every kept difference this axis has ever printed was read against a floor taken somewhere else.
 * This pair is taken AT the kept rows' magnitude.
 */
const MACHINE_PANEL_TWIN_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const MPP_TWIN = MACHINE_PANEL_TWIN_SCHEMA.ports;

const mPanelTwin = createExoMachineBuilder<TExoDomNode>(MACHINE_PANEL_TWIN_SCHEMA);

const K_PANEL_TWIN = mPanelTwin.createInitialState((c): TMachinePanelMemory => {
    c.text(MPP_TWIN.text, '');
    return { text: '' };
});

mPanelTwin.on(MPP_TWIN.close, noop);

const setPanelTwinText = mPanelTwin.transition<string>((c, value) => {
    c.readState(K_PANEL_TWIN).text = value;
    c.text(MPP_TWIN.text, value);
});

const MACHINE_PANEL_TWIN = mPanelTwin.done();

/** The machine row's own schema cache, for the reason `DELEGATED_BACKEND` has one: a backend is the
 *  schema cache key, so sharing `EXO_BACKEND` would change a neighbouring row's cache merely
 *  because this row exists. */
const MACHINE_KEEP_BACKEND = withExoCompiler(new ExoDomBackend());
/** And the twin's, which must be a THIRD — a null sharing a schema with the row it is a null of is a
 *  zero by sharing. */
const MACHINE_KEEP_TWIN_BACKEND = withExoCompiler(new ExoDomBackend());

// --- the schema core's PANEL WITH DELEGATION: the second event strategy, same four elements ----

/**
 * THE PACK AND THE BACKEND THAT CARRIES IT, AT MODULE LEVEL AND ONE FOR THE PROCESS — the same
 * rule `Mikado.compile` above obeys, for the same reason and one more.
 *
 * A DOM schema is cached per machine PER backendType (`exoDomSchemaOf`), so a
 * backend built inside `prep` is a new key and therefore a re-compile of every declaration it
 * touches on every sample — setup cost, but the kind that makes a participant look like it is
 * measuring something it is not. `createExoDelegatedEvents` also numbers its own slot namespace
 * from a counter, so a pack per scenario would be a fresh namespace per scenario.
 *
 * THE STRATEGY IS A BACKEND NOW, NOT AN ARGUMENT TO A RENDER. `events` is a plugin interface a
 * pack may write a field for, so the delegating strategy is composed into an object once and every
 * render through it — and every child that render's connector builds — inherits it.
 *
 * ONLY `click` IS LISTED, because that is the only event this panel has a port for. A pack refuses
 * a port whose event it does not list, at schema-compile time and by name, so the list and the
 * declaration cannot silently drift apart.
 */
const DELEGATED_BACKEND = composeExoPlugins(
    withExoChildList(withExoCompiler(new ExoDomBackend())),
    {
        events: () => createExoDelegatedEvents(['click']),
    }
);

/**
 * THE SUBJECT AND THE DESCRIPTOR — the delegated strategy's equivalent of `noop`, and both are
 * module-level constants because that is the whole claim being priced: ONE descriptor serves all
 * 200 panels, and filling a row's port allocates nothing.
 *
 * WHY A REAL CELL RATHER THAN A BARE OBJECT. A descriptor resolves `subject[prop]` at DISPATCH
 * time and throws unless it finds something with `getValue`/`setValue`, so a subject with no such
 * property would be a handler that cannot run. Nothing on this axis dispatches a click — exactly
 * as nothing dispatches into Mikado's `exoTogClose` route or anybody else's `noop` — but a handler
 * that would throw IF it ran is not the same thing as a handler that does nothing, and the
 * difference costs zero to get right.
 *
 * WHY IT IS SHARED BY ALL 200 PANELS RATHER THAN PER ROW. A real app passes the row's own item
 * (`c.on(P.close, CLOSE, row)`), and that would cost exactly the same two property stores — the
 * wire already holds `row`, so neither form allocates. What it would NOT be is a working handler:
 * `TToggleRow` is `{ id, text }`, shared with every other participant on this axis, and giving it
 * a source would change the data every other row is built from. So the subject is one shared
 * holder and the cost is identical to the per-row form.
 */
let panelClosed = false;
const CLOSE_SUBJECT = {
    closed: {
        getValue: (): boolean => panelClosed,
        setValue: (next: boolean): void => {
            panelClosed = next;
        },
        onChange: (): (() => void) => () => undefined,
    },
};
function closePanel(_event: Event, subject?: unknown): void {
    (subject as typeof CLOSE_SUBJECT).closed.setValue(true);
}
const CLOSE = closePanel;

/**
 * THE SAME PANEL AS `PANEL`, WIRED FOR DELEGATION — identical elements, identical markup,
 * identical text handling (`set`, not `bind`, because a rebuilt panel's text never changes), and
 * one line different: `c.on(P.close, CLOSE, CLOSE_SUBJECT)` where `PANEL` has
 * `c.on(P.close, noop)`.
 *
 * IT IS A SEPARATE COMPONENT AND NOT A SECOND RENDER OF `PANEL` because a component is one value
 * now — schema and wire together — and the wire is what differs. The schema it builds is
 * structurally identical to `PANEL`'s, which is what lets the markup gate demand the reference's
 * exact bytes from this row.
 */
const PANEL_DELEGATED_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const mPANEL_DELEGATED = createExoMachineBuilder<TExoDomNode>(PANEL_DELEGATED_SCHEMA);
mPANEL_DELEGATED.createInitialState((c, i) => {
    c.text(PANEL_DELEGATED_SCHEMA.ports.text, BUILDING_ROWS[i].text);
    c.on(PANEL_DELEGATED_SCHEMA.ports.close, CLOSE, CLOSE_SUBJECT);
});
const PANEL_DELEGATED = mPANEL_DELEGATED.done();

/** What the host needs of a source: an array of rows it can read and be told about. */
type TToggleSource = TExoBenchSource<readonly TToggleRow[]>;

type TToggleHostState<TItem> = {
    readonly kids: TExoChildList;
    shown: TItem[];
    readonly build: (item: TItem, index: number) => TExoNode<TExoDomMark>;
};

function createExoToggleHost<TItem>(
    source: TExoBenchSource<readonly TItem[]>,
    build: (cc: TExoDomNode, item: TItem, index: number) => TExoNode<TExoDomMark>,
    prepare: (cc: TExoDomNode) => void = noop
) {
    const schema = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const m = createExoMachineBuilder<TExoDomNode>(schema);
    const K = m.createInitialState((cc): TToggleHostState<TItem> => {
        prepare(cc);
        return {
            kids: cc.childList(schema.ports.panels),
            shown: [],
            build: (item, index) => build(cc, item, index),
        };
    });
    const showRows = m.transition((cc: TExoDomNode) => {
        const state = cc.readState(K);
        const want = source.getValue();
        state.shown = reconcileExoOrder(state.kids, state.shown, want, want, state.build);
    });
    m.effect((cc) => {
        showRows(cc);
        return source.onChange(() => showRows(cc));
    });
    return { schema, host: m.done() };
}

/**
 * One host with the block's region in it, wired to `rows`.
 *
 * THE HOST COMPONENT IS BUILT PER SCENARIO, and only because its wiring names THAT scenario's
 * source — a component is one value now, so a wire cannot be handed in at the render call. That
 * build is setup and sits outside the timed region; the PANEL, which is what a show actually
 * clones, stays module-level with its schema compiled once. (`list-reconcile.tsx` makes the same
 * split for the same reason.)
 */
function mountExodraToggle(c: HTMLElement, rows: TToggleSource): () => void {
    const { host } = createExoToggleHost(rows, (cc, row: TToggleRow, i) => {
        BUILDING_ROWS[i] = row;
        return cc.build(PANEL, i);
    });
    return EXO_BACKEND.render(host, c);
}

/**
 * THE SAME HOST, RENDERED THROUGH THE DELEGATING BACKEND — one different object at the top, the
 * delegated panel, and nothing else.
 *
 * THE BACKEND IS NAMED AT THE TOP AND EVERYTHING BELOW INHERITS IT: the host's schema, the
 * connector, and through it every panel the reconciler builds. That is why one object here is enough
 * to change the strategy of 200 children that this function never mentions.
 *
 * THE DELEGATED ROOT IS `c`, the scenario's own container, because `render` installs the
 * pack on the element it renders into. One bubble-phase `click` listener goes on that div when
 * this function runs — in `prep`, untimed — and comes off when the returned disposer runs, because
 * the install's teardown joins the render's scope. See the header for why the root's position is
 * worth knowing and why it cannot affect this axis's number.
 */
function mountExodraToggleDelegated(c: HTMLElement, rows: TToggleSource): () => void {
    const { host } = createExoToggleHost(rows, (cc, row: TToggleRow, i) => {
        BUILDING_ROWS[i] = row;
        return cc.build(PANEL_DELEGATED, i);
    });
    return DELEGATED_BACKEND.render(host, c);
}

/** The hidden state of a kept block — the same emptiness, in children rather than items. */
const NO_CHILDREN: readonly TExoNode<TExoDomMark>[] = [];

/**
 * `unmount` FOR A CHILD THAT IS COMING BACK — the documented override, and the whole of what
 * `exodraKept` does differently.
 *
 * A child's default `unmount` ends its own subscriptions; this one ends nothing, so the panel's
 * text effect survives being taken out of the document and the next show can write the new
 * generation's text into it. One module-level function for every kept panel in the process, not
 * a closure per panel — the field exists from construction, so the override is a plain store.
 */
const KEEP_ALIVE = function keepAlive(): void {};

/**
 * THE SAME BLOCK WITH ITS PANELS KEPT — the diagnostic half of this axis, and NOT a competitor.
 *
 * `exodra` above rebuilds every panel on every show, because its reconciler maps ITEMS to children
 * and a child whose item left is dropped. The pieces are separable because both are compositions
 * over the same two doors: `c.build(component, index)` returns a built, wired, DETACHED child as a
 * VALUE, and `reconcileExoOrder` over a source of THOSE CHILDREN keeps a region equal to the
 * array — it inserts, moves and removes them by identity and calls each one's `mount`/`unmount`,
 * with no idea what an item is, because here the item IS the child. So "keep the block" stops being
 * a renderer feature and becomes something the caller does: build the panels once, tell each of
 * them to survive removal, and toggle an array between holding them and not.
 *
 * READ IT ONLY AGAINST `exodra`. It pays the construction of 200 panels ONCE, in `prep`, where the
 * competing rows pay it 20 times inside the timed region. The single number it produces is the
 * answer to "what would a pool buy us": `exodra` − `exodraKept`.
 *
 * ═══ AND "ONCE" IS NOW "IN SETUP" AGAIN, WHICH IT WAS NOT FOR TWO RUNS OF THIS AXIS ═══
 *
 * `c.build(...)` ACQUIRES THE ELEMENT, REPLAYS THE WALK AND RUNS THE WIRE, in the call — it is
 * `buildLiveExoChild`, and the deferred child that carried `node === undefined` until its list
 * materialised it is gone, as is `materialiseExoChild`. So the 200 clones and the 200 wires of this
 * row happen in the loop below, at mount, in `prep`, OUTSIDE the measured region — which is what
 * `floor·kept·owned` does when it clones its 200 panels in its own mount, so the keep floor and this
 * row now bound the same job.
 *
 * THAT MEANS EVERY RECORDED NUMBER UNDER THIS NAME IS NOT COMPARABLE WITH A FRESH ONE, and the
 * difference is one whole build pass of 200 panels per sample. It was `exodraKeptWarm` that priced
 * that deferral; the deferral is gone and so is that row.
 */
function mountExodraToggleKept(
    c: HTMLElement,
    cells: readonly TExoBenchSource<string>[],
    shown: TExoBenchSource<readonly TExoNode<TExoDomMark>[]>,
    kept: TExoNode<TExoDomMark>[]
): () => void {
    // RECONCILED OVER THE CHILDREN, not over items: the source's items ARE the children, so the
    // build callback is the identity and the reconciler does nothing but place by identity.
    const { host } = createExoToggleHost(
        shown,
        (_cc, child: TExoNode<TExoDomMark>) => child,
        (cc) => {
            // Built at MOUNT, once, and held — the whole difference from `exodra`.
            for (let i = 0; i < PANELS; i++) {
                BUILDING_CELLS[i] = cells[i];
                const child = cc.build(PANEL_BOUND, i);
                exoNodeDom(child).unmount = KEEP_ALIVE;
                kept[i] = child;
            }
        }
    );
    return EXO_BACKEND.render(host, c);
}

/**
 * THE SAME KEPT BLOCK WITHOUT THE CHILDREN RECONCILER AND WITHOUT THE CHILDREN PORT — the keep
 * contract's counterpart of `exodraPlaced`, and the most imperative form this contract admits short
 * of dropping the renderer altogether.
 *
 * WHAT IT DECLINES, against `exodraKept` which is otherwise the same program:
 *   * `reconcileExoOrder` — no notification, no `shown` mirror, no `Map`, no `order` splices,
 *     no `index`, no clear branch;
 *   * the children port itself — `P.panels` is declared and deliberately never filled, exactly as
 *     `mountExodraTogglePlaced` leaves it, so the wire attaches nothing to that element and the
 *     host div is empty when the render returns.
 * It declines an ITEM-RECONCILED list too, but so does `exodraKept`: a keep-alive reconciles over
 * the CHILDREN, never over the items. See the keep-ladder section in the header for why there is
 * no item-reconciled rung on this contract at all.
 *
 * WHAT IT STILL PAYS, and it is what the last difference of the keep ladder is made of: one
 * `TExoDomChild` per panel, its `mount()` on every show and its `unmount()` on every hide (both the
 * child's published lifecycle, both called by the child list this row is not using — a row that
 * skipped them would be doing a smaller job while claiming to price a layer), and one fill per panel
 * per show dispatched through the schema's setter.
 *
 * THE PANELS ARE BUILT AT MOUNT, HERE, IN THE WIRE, which is where `c.build` builds them: it
 * acquires the element, replays the walk and runs the wire inside the call. `exodraKept` does the
 * same, in the same place, so this row's difference from it is PLACEMENT and nothing else.
 *
 * THE HIDE IS `removeAll`'s OWNED BRANCH WRITTEN OUT AT THE CALL SITE — N × `unmount()` with the
 * region still whole, then ONE `root.textContent = ''` — which is the same two things the child list
 * would have done and is what puts this row in the `keep+owned` contract BY CONSTRUCTION.
 */
function mountExodraTogglePlacedKept(
    c: HTMLElement,
    cells: readonly TExoBenchSource<string>[],
    held: ReturnType<typeof exoNodeDom>[]
): () => void {
    const HOST_SCHEMA4 = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const mHOST4 = createExoMachineBuilder<TExoDomNode>(HOST_SCHEMA4);
    mHOST4.createInitialState((cc) => {
        // Declared and deliberately not filled — named so it cannot be dropped from the
        // schema by someone tidying an unused binding, exactly as `exodraPlaced` names it.
        void HOST_SCHEMA4.ports.panels;
        for (let i = 0; i < PANELS; i++) {
            BUILDING_CELLS[i] = cells[i];
            // AT MOUNT, UNTIMED — `c.build` clones, walks and wires inside this call.
            const rec = exoNodeDom(cc.build(PANEL_BOUND, i));
            rec.unmount = KEEP_ALIVE;
            held[i] = rec;
        }
    });
    const HOST = mHOST4.done();
    return EXO_BACKEND.render(HOST, c);
}

/**
 * THE SAME AGAIN WITH THE REACTIVE LAYER DECLINED TOO — hand placement AND a text port written by hand.
 * The bottom rung of the keep ladder, and the row that has the least of this renderer left in its
 * measured region of anything on this axis.
 *
 * IT DIFFERS FROM `exodraPlacedKept` IN THE PANEL AND IN THE WRITE, and in nothing else: the
 * component is `PANEL_DIRECT` instead of `PANEL_BOUND`, so each panel hands its port table to the
 * holder instead of subscribing to a cell, and a show writes `slot.ports.text(P.text, …)` where the
 * row above writes `cells[i].setValue(…)`. Gone with the cell: 200 sources, 200 subscriber
 * closures, 200 effect stops held in 200 children's `effectStops` arrays, and per show 200
 * notifications with their equality test and their re-read of `getValue()`.
 *
 * WHAT REPLACES THEM IS NOT FREE AND THE PAIR IS STILL LABELLED A REPLACEMENT, though the reason
 * has narrowed: `PANEL_BOUND`'s effect holds NO Text node — it calls `c.text(P.text,
 * cell.getValue())`, the same door `fillDoors().text` calls, through the same schema setter. So what
 * the subscription adds is the notification, the equality test, the `getValue()` re-read and the
 * disposer, and what it does NOT add is a cheaper write. Either sign is a finding.
 *
 * IT IS THE ROW THE KEEP FLOOR IS SUPPOSED TO BE REACHABLE FROM, and what stands between them is
 * named in `reportKeptLayers`'s last line rather than left as a residue.
 */
function mountExodraToggleDirectKept(
    c: HTMLElement,
    slots: readonly TToggleSlot[],
    held: ReturnType<typeof exoNodeDom>[]
): () => void {
    const HOST_SCHEMA5 = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const mHOST5 = createExoMachineBuilder<TExoDomNode>(HOST_SCHEMA5);
    mHOST5.createInitialState((cc) => {
        void HOST_SCHEMA5.ports.panels;
        for (let i = 0; i < PANELS; i++) {
            BUILDING_SLOTS[i] = slots[i];
            // The wire runs INSIDE this call, which is also where `slots[i].ports` is
            // filled: `c.build` clones, walks and wires before it returns.
            const rec = exoNodeDom(cc.build(PANEL_DIRECT, i));
            rec.unmount = KEEP_ALIVE;
            held[i] = rec;
        }
    });
    const HOST = mHOST5.done();
    return EXO_BACKEND.render(HOST, c);
}

/**
 * THE SAME BLOCK WITH THE PANELS AS MACHINES — `exodraMachineKept`.
 *
 * IT IS `mountExodraToggleDirectKept` ABOVE WITH ITS ITEM ARGUMENT GONE: `MACHINE_PANEL` instead of
 * `PANEL_DIRECT`, and NOTHING in the item position, because a machine takes no props at all — its
 * starting state is what `m.keep` declared, and its text port is painted by that same factory.
 * Everything else — the unfilled children port, `KEEP_ALIVE`, the materialisation at mount, the
 * `held` array — is identical, so the pair differs by the panel's WIRING and by nothing about how the
 * block is held.
 *
 * THE CONSTRUCTION IS INSIDE `build`, which is `TExoDomNode.build`'s rule for every component and
 * not a shortcut taken here: a machine is ARMED where it is built, so that a caller has a moment to
 * fire transitions at what it made before placing it. The direct row's panel is built by the same
 * call at the same point in the same loop.
 *
 * THE INSTANCE ARRIVES AS THE RETURN VALUE, where the direct row's wire has to hand a port table out
 * through a slot object: a machine child IS its exonode, so `build` already handed one back and the
 * store below is the counterpart of that row's `slot.ports = c.fillDoors()`.
 *
 * ONE THING THE MACHINE FORM CANNOT SAY, and it is named rather than hidden: `build`'s machine
 * signature takes no INDEX, so every panel here is built at index `0` where the direct row passes
 * `i`. Nothing on this axis reads `TExoDomChild.index` — these panels are hand-placed and stand in no
 * reconciled list — but it is one field store of a different value, and it is the only line of the
 * pair that is not word for word.
 */
function mountExodraToggleMachineKept(
    c: HTMLElement,
    instances: TMachinePanel[],
    held: ReturnType<typeof exoNodeDom>[]
): () => void {
    const HOST_SCHEMA6 = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const mHOST6 = createExoMachineBuilder<TExoDomNode>(HOST_SCHEMA6);
    mHOST6.createInitialState((cc) => {
        void HOST_SCHEMA6.ports.panels;
        for (let i = 0; i < PANELS; i++) {
            const rec = exoNodeDom(cc.build(MACHINE_PANEL));
            rec.unmount = KEEP_ALIVE;
            instances[i] = rec as unknown as TMachinePanel;
            held[i] = rec;
        }
    });
    const HOST = mHOST6.done();
    return MACHINE_KEEP_BACKEND.render(HOST, c);
}

/** THE NULL'S BLOCK — the same program over the second declaration, on its own backend. Its true
 *  difference from the row above is ZERO BY CONSTRUCTION. */
function mountExodraToggleMachineKeptTwin(
    c: HTMLElement,
    instances: TMachinePanel[],
    held: ReturnType<typeof exoNodeDom>[]
): () => void {
    const HOST_TWIN_SCHEMA = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const mHOST_TWIN = createExoMachineBuilder<TExoDomNode>(HOST_TWIN_SCHEMA);
    mHOST_TWIN.createInitialState((cc) => {
        void HOST_TWIN_SCHEMA.ports.panels;
        for (let i = 0; i < PANELS; i++) {
            const rec = exoNodeDom(cc.build(MACHINE_PANEL_TWIN));
            rec.unmount = KEEP_ALIVE;
            instances[i] = rec as unknown as TMachinePanel;
            held[i] = rec;
        }
    });
    const HOST_TWIN = mHOST_TWIN.done();
    return MACHINE_KEEP_TWIN_BACKEND.render(HOST_TWIN, c);
}

/**
 * THE SAME KEPT PANELS MOVED BY THE REGION'S PLACEMENT PAIR — the row that makes no lifecycle call
 * at all, and the ONLY row on this axis under the `keep + SHARED parent` contract.
 *
 * ═══ WHAT IT IS ═══
 *
 * `TExoChildList` carries two pairs. `insert`/`remove` PLACE A CHILD AND TELL IT — `mount()` on the way
 * in, `unmount()` on the way out, which is the reconciler's contract and where a node source's
 * release and a foreign node's hooks are reached. `attach`/`detach` place a child and tell it
 * NOTHING: the node moves, the region's `order` moves with it, and no hook of any kind runs.
 * `detach` hands the child back so the caller can hold it across the hidden state.
 *
 * SO THIS ROW HOLDS ITS PANELS THE WAY `exodraDirectKept` DOES — same `PANEL_DIRECT`, same slots,
 * same `fillDoors().text` per show, same materialisation at mount, untimed — and MOVES them differently:
 * a hide is `PANELS` × `detach`, a show is `PANELS` × `attach`, and the two loops between them
 * contain no `mount()` and no `unmount()`.
 *
 * ═══ WHAT IT REPLACES, AND WHY THE OLD SPELLING IS STILL STANDING ═══
 *
 * `exodraKept`, `exodraPlacedKept` and `exodraDirectKept` all keep their panels by WRITING THE
 * CHILD'S `unmount` FIELD FROM OUTSIDE (`KEEP_ALIVE`, above). That is a documented extension point
 * and it is what those three measure, so none of them was rewritten: switching one to this pair
 * would silently change the number every recorded `toggle` run has printed under its name. This is a
 * NEW row, and the difference between "with the lifecycle calls" and "without" is meant to be read
 * off the table rather than assumed.
 *
 * ═══ AND IT IS NOT IN THE SAME CONTRACT AS THEM — READ THIS BEFORE SUBTRACTING ANYTHING ═══
 *
 * `detach` IS PER CHILD, so a hide here is `PANELS` × `removeChild`. Every other kept row empties its
 * host with ONE `textContent = ''` — the OWNED clear — and is bounded by `floor·kept·owned`. THIS ROW
 * IS BOUNDED BY `floor·kept`, the shared-parent keep floor, whose hide is `PANELS` × `remove()` and
 * whose show is `PANELS` × `appendChild`: the identical two DOM operations in the identical numbers.
 *
 * A DIFFERENCE ACROSS THOSE TWO FLOORS IS NOT A LAYER PRICE and this file forbids one (`reportFloor`
 * prints every ratio WITHIN one contract, for the reason its header gives). So
 * `exodraDirectKept − exodraDetachedKept` is NOT the price of the 400 hook calls per cycle — it is
 * that MINUS what owning the parent is worth over the same 200 nodes, which `reportFloor` prints
 * separately as `floor·kept − floor·kept·owned`. What this row says on its own is the honest thing:
 * how close a keep block written by hand gets to the shared-parent keep floor when the renderer is told
 * to move nodes and nothing else.
 *
 * THERE IS NOW AN OWNED FORM OF IT, AND IT IS THE ROW BESIDE THIS ONE. This
 * paragraph said there was none: the one-call clear belonged to a reconciler that owned the whole
 * region (`removeAll`'s owned branch), the placement pair was per index by construction, and that was
 * recorded here as a MISSING STRATEGY rather than as a loss. The missing strategy was then built —
 * `TExoChildList.detachAll` takes every child out at once and, where the port owns its element (the
 * same `ownsElement` flag every reconciler reads, handed to the region by `c.childList`), empties it
 * with ONE `textContent = ''`. `exodraDetachedAllKept` is that call, mounted by THIS FUNCTION,
 * measured against `floor·kept·owned`.
 *
 * SO THIS FUNCTION SERVES TWO ROWS AND THE TWO DIFFER IN ONE LINE. Same host, same panels, same
 * slots, same materialisation at mount, same show loop (`PANELS` × `attach`); the hide is `PANELS` ×
 * `detach` in one and one `detachAll()` in the other. THAT is what makes the pair readable —
 * everything else about them is identical by construction, so the difference between them is the
 * bulk call and the contract it buys, and nothing else.
 *
 * BOTH ROWS STAY. `exodraDetachedKept` is not obsolete: it is the SHARED-parent keep row, the only
 * one on this axis, and it is the floor pairing for the shape most real components have — a children
 * port with siblings, which cannot take the one-call clear at any price. Deleting it would delete
 * the finding.
 */
function mountExodraToggleDetachedKept(
    c: HTMLElement,
    slots: readonly TToggleSlot[],
    held: TExoNode<TExoDomMark>[],
    take: (region: TExoChildList) => void
): () => void {
    const HOST_SCHEMA7 = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const mHOST7 = createExoMachineBuilder<TExoDomNode>(HOST_SCHEMA7);
    mHOST7.createInitialState((cc) => {
        // THE PORT IS FILLED, which is what separates this row from `exodraPlacedKept`: the
        // child list is a real children port with a real `order`, and every command below
        // maintains it. `c.childList` stamps the port as written.
        const region = cc.childList(HOST_SCHEMA7.ports.panels);
        for (let i = 0; i < PANELS; i++) {
            BUILDING_SLOTS[i] = slots[i];
            // AT MOUNT, UNTIMED — `c.build` clones, walks and wires inside this call, which
            // is also where `slots[i].ports` is filled.
            const child = cc.build(PANEL_DIRECT, i);
            held[i] = child;
        }
        // NOTHING IS PLACED HERE. The region is empty when the render returns, exactly as
        // the two hand-placed rows leave their host, so the first show is a full 200-way
        // attach and every state below is one of this axis's four.
        take(region);
    });
    const HOST = mHOST7.done();
    return EXO_BACKEND.render(HOST, c);
}

/**
 * THE EXONODE A WIRE IS HANDED, named so the two rows below can keep it past the wiring.
 *
 * KEEPING IT IS SUPPORTED AND EXACTLY ONE METHOD WIDE. Every method that FILLS a port also records
 * the fill into `this.written`, and `wireExoInstance` puts that field back to the shared zero-length
 * frame the instant the wire returns (`wire-exo-instance.ts:75-76`), so a recorded fill made
 * afterwards lands out of range. `build` is the one method that records nothing: it reads
 * `this.schema.backend`, and `schema` is written once by `createInstance` and never cleared
 * (`wire-exo-instance.ts:49` says why), so it survives the wiring intact.
 *
 * A CHILD BUILT THIS WAY INHERITS NO CONTEXT CHAIN, and not because anything went stale: `build`
 * passes `null` as the outer context unconditionally, whether it is called inside the wire or an
 * hour after (`EXO_DOM_NODE_VOCABULARY.ts:216-228`, and its own header at `:215` states it). It costs these
 * rows nothing and hides nothing — `PANEL` neither provides nor injects anything, no participant on
 * this axis does, and a reconciled child gets the chain reinstalled, so what differs between the
 * rows is one field READ that every one of them pays.
 * A row whose panels used `inject` could not be written this way at all,
 * and that is a limit of the DECOMPOSITION, not of the renderer.
 */
type TToggleConnector = Parameters<TExoMachineInitialState<TExoDomNode>>[0];

// STRUCK: `exodraChildren` and its mount function `mountExodraToggleChildren`. The row priced THE
// LIST LAYER — `attachExoList`'s `remap`, its item→child registry, `rememberExoChild` and its
// op-translating façade — as the difference between `c.bindList` and `c.bindChildren`. All of it is
// deleted: `@exodra/dom` carries no `attachExoList`, no registry remap and neither `bind*` door, and
// a list is now `reconcileExoOrder` over `c.childList` + `c.build` — which is the program this
// row WAS. There is no layer left between it and `exodra`, so the rung is gone rather than
// re-pointed, and `reportLayers`'s chain opens at `exodra − exodraPlaced`.

/**
 * THE SAME BLOCK WITHOUT THE CHILDREN RECONCILER EITHER — the port is declared and never filled, and
 * the application places what it built.
 *
 * THE DECLARATION IS UNCHANGED, DELIBERATELY: the same `div` with the same children port, so the
 * schema that gets compiled is the same shape as `exodra`'s and the difference cannot be a
 * different template. A wire is allowed to skip a port — `wire-exo-instance.ts:138` states it for
 * the whole backend — so leaving it unfilled attaches nothing, and the host div is empty when the
 * render returns. From then on the holder appends the children it built and empties the div itself,
 * which is the same two DOM operations the reconciler would have performed: `appendChild` per panel
 * (`TExoChildList.insert` with no anchor) and ONE `textContent = ''` for the whole hide
 * (`removeAll`'s owned branch, which this row is entitled to for the same reason the child list is —
 * the region is the element's entire content).
 *
 * IT STILL CALLS `mount()` AND `unmount()` PER CHILD, and that is not politeness: `insert` and
 * `remove` call both, they are the child's published lifecycle, and a row that skipped them would be
 * doing a smaller job while claiming to price a layer.
 *
 * SO WHAT IS LEFT IN `exodra − exodraPlaced` is the reconciler's own bookkeeping — the
 * notification, the `shown` mirror and the `Map` it diffs against, the `order` splices, `index` and
 * the clear branch — AGAINST what hand placement costs instead, which is one `exoNodeDom(child)`
 * call per panel that `TExoChildList.insert` makes too. BOTH SIDES pay the `BUILDING_ROWS[i]` store
 * that stands in for the props this library does not have, so that is not in the difference. That is
 * why the header calls this pair a REPLACEMENT and not a removal, and why either sign of it is a
 * finding.
 */
function mountExodraTogglePlaced(c: HTMLElement, take: (cc: TToggleConnector) => void): () => void {
    const HOST_SCHEMA8 = createExoSchema((b) => {
        let panels!: TExoChildrenPort;
        b.el('div', null, (host) => {
            panels = host.childrenPort();
        });
        return { panels };
    });
    const mHOST8 = createExoMachineBuilder<TExoDomNode>(HOST_SCHEMA8);
    mHOST8.createInitialState((cc) => {
        // `P.panels` is declared and deliberately not filled — see the header. Named here so
        // the port cannot be dropped from the schema by someone tidying an unused binding.
        void HOST_SCHEMA8.ports.panels;
        take(cc);
    });
    const HOST = mHOST8.done();
    return EXO_BACKEND.render(HOST, c);
}

/** Every panel currently in a container, in document order. */
const panelsIn = (c: HTMLElement): Element[] => Array.from(c.querySelectorAll('.panel'));

export async function benchmarkToggle(rounds = 100, batch = 1): Promise<void> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvToggle = (await import('../../svelte/SvToggle.svelte')).default;
    // Svelte 5 batches async — flushSync per transition so the work lands in-region.
    const { mount: svMount, unmount: svUnmount, flushSync: flush } = await import('svelte');
    const {
        $,
        $$,
        h: vh,
        render: vRender,
        For: vFor,
    } = (await import('voby')) as unknown as {
        $: (v: unknown) => { (): unknown; (v: unknown): void };
        $$: (v: unknown) => unknown;
        h: (...a: unknown[]) => unknown;
        render: (child: unknown, parent: Element) => () => void;
        For: unknown;
    };
    const { tick: obyTick } = (await import('oby')) as unknown as { tick: () => void };
    // Marko 6, authored as a `.marko` component and compiled by the inline compiler in
    // `vite.config.ts` — the same wiring `todo-app.tsx` uses for the app axes. Marko cannot
    // export an instance method the way `SvToggle.svelte` exports `setRows`, so the block's state
    // comes in through `input` and a transition is `update({ rows })` — a mounted template's
    // entire outside surface (`Marko.MountedTemplate`).
    const MkToggle = (await import('../../marko/MkToggle.marko')).default as unknown as {
        mount(
            input: { rows: readonly TToggleRow[] },
            el: HTMLElement
        ): { update(input: { rows: readonly TToggleRow[] }): void; destroy(): void };
    };
    // Marko batches on its own queue; `run()` drains it synchronously. See the note at the Marko
    // scenario below for why it is called even though `update()` already drains.
    const { markoFlush } = await import('../../marko/flush');
    // Lit 3, through `lit-html`'s standalone `render()`. It has no counterpart to the flushes
    // above and needs none: `render()` commits inside the call, with no queue and no microtask in
    // the path. The participant and its argument are in `participants/lit/toggle.tsx`.
    const { mountLitToggle } = await import('../../participants/lit/toggle');
    // The three closest architectural relatives, and this axis is where their differences are
    // least disguised, because a repeat show IS a build and a teardown with nothing else in it:
    //
    //   stage0  — the CEILING, and the most literal one in the suite: a show is 200 ×
    //             (`cloneNode(true)`, one `collect`, one text write, one property write, one
    //             insert); a hide is 200 × `remove()`. See `stage0-toggle.tsx`.
    //   uhtml   — an array of `Hole`s committed by `udomdiff`, the same shape the schema core
    //             uses. See `uhtml-toggle.tsx`.
    //   sinuous — a FUNCTION CHILD, and the only participant here with NO prepared prototype at
    //             all: it builds every element one `document.createElement` at a time on every
    //             show. See `participants/sinuous/toggle.tsx`.
    //
    // All three destroy and rebuild — nothing is kept across the hidden state — so all three
    // belong beside the competing rows and NOT beside the caching diagnostics. The gates below
    // pin that rather than trusting it.
    const { mountStage0Toggle } = await import('../../participants/stage0/toggle');
    const { mountUhtmlToggle } = await import('../../participants/uhtml/toggle');
    const { mountSinuousToggle } = await import('../../participants/sinuous/toggle');
    // THE NATIVE FLOOR — six straight-line programs with no framework in them at all, in two
    // contracts (`rebuild`/`keep` × `owned`/`shared` parent) plus one insertion probe and one
    // null. They are not competitors and they are not diagnostics: they are the bound. Read
    // `participants/floor/toggle.ts`'s header before quoting any of them, and in particular the
    // comparability map — a `keep` floor bounds `exodraKept` and `mikadoPooled` and NOTHING else, and a
    // `rebuild` floor bounds the rest and NOT those two.
    //
    // FIVE STAND-IN RUNGS USED TO COME FROM THIS FILE TOO, and they are gone. What splits the gap
    // now is `exodraPlaced` above — the shipping renderer with one layer not
    // asked for — and the refutation of the ladder is kept in the header of
    // `participants/floor/toggle.ts` with the two runs that failed it.
    const {
        mountFloorToggle,
        mountFloorToggleTwin,
        mountFloorToggleOwned,
        mountFloorToggleFrag,
        floorKeptToggle,
        floorKeptOwnedToggle,
    } = await import('../../participants/floor/toggle');

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };

    // THE CLOCK, FIRST AND OUT LOUD. Everything below is judged against this number, and the
    // verdict is printed under the table at the end of the run.
    const quantum = observeTimerQuantum();
    // eslint-disable-next-line no-console
    console.log(
        `✅ toggle: observed timer quantum ${quantum.toFixed(3)} ms · ${CYCLES} cycles × ` +
            `${PANELS} panels = ${
                CYCLES * PANELS
            } panel builds and as many teardowns per sample · ` +
            // DIVIDED BY `batch` LIKE THE GATE IT ANNOUNCES. When the division landed in
            // `reportScale` this banner was left behind, so a `toggle 30 100` run
            // opened by promising a 1.000 ms bar and closed by passing a row against 0.010 —
            // a printed contract a hundred times stricter than the enforced one, in one output.
            // That is the same defect the division was fixing (prose and check disagreeing about
            // what batch the run is at), reintroduced one screen higher up.
            `the fastest row must clear ${((MIN_TICKS * quantum) / batch).toFixed(
                4
            )} ms (${MIN_TICKS}× the ` +
            `quantum ${quantum.toFixed(3)} over batch ${batch}) or this axis has measured the clock`
    );

    const solidPrep = (): Scenario => {
        const [rows, setRows] = createSignal<readonly TToggleRow[]>(HIDDEN);
        const c = el();
        const App = () => (
            <div>
                <For each={rows() as TToggleRow[]}>
                    {(r: TToggleRow) => (
                        <div class="panel">
                            <h4>Panel</h4>
                            <p>{r.text}</p>
                            <button onClick={noop}>x</button>
                        </div>
                    )}
                </For>
            </div>
        );
        const dispose = render(() => App() as never, c);
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) setRows(STATES[k]);
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    const sveltePrep = (): Scenario => {
        const c = el();
        const inst = svMount(SvToggle, { target: c, props: { rows: [] as TToggleRow[] } });
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    inst.setRows(STATES[k] as TToggleRow[]);
                    flush();
                }
            },
            cleanup: () => {
                svUnmount(inst);
                c.remove();
            },
        };
    };

    const reactPrep = (): Scenario => {
        const c = el();
        let setRows: (v: readonly TToggleRow[]) => void = () => {};
        const Panel = ({ text }: { text: string }): unknown =>
            rc(
                'div',
                { className: 'panel' },
                rc('h4', null, 'Panel'),
                rc('p', null, text),
                rc('button', { onClick: noop }, 'x')
            );
        const App = (): unknown => {
            const [rows, set] = useState<readonly TToggleRow[]>(HIDDEN);
            setRows = set;
            return rc(
                'div',
                null,
                rows.map((r) => rc(Panel as never, { key: r.id, text: r.text }))
            );
        };
        const root = createRoot(c);
        flushSync(() => root.render(rc(App as never)));
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) flushSync(() => setRows(STATES[k]));
            },
            cleanup: () => {
                root.unmount();
                c.remove();
            },
        };
    };

    // --- Schema core: the block IS a children port, and hiding it is an empty array ------------
    const exodraPrep = (): Scenario => {
        const rows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const c = el();
        const dispose = mountExodraToggle(c, rows);
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) rows.setValue(STATES[k]);
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Schema core, DELEGATED: the same block with one root listener instead of 200 -----------
    // A COMPETING ROW, not a diagnostic — it rebuilds every panel on every show exactly as
    // `exodra` does, and the gate below pins that. The measured region is character-for-character
    // `exodraPrep`'s; everything that differs was decided in `mountExodraToggleDelegated` and in
    // `PANEL_DELEGATED`, i.e. in setup. Two differences from `exodra`, both in the header: the
    // event pack, and the handler form the pack requires.
    const exodraDelegatedPrep = (): Scenario => {
        const rows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const c = el();
        const dispose = mountExodraToggleDelegated(c, rows);
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) rows.setValue(STATES[k]);
            },
            cleanup: () => {
                // Takes the root's `click` listener with it — `installExoDelegatedRoot`'s
                // disposer joined this render's scope — so the container that leaves the document
                // below leaves nothing listening behind it.
                dispose();
                c.remove();
            },
        };
    };

    // --- Schema core, KEPT: the same block with its panels built once (read vs `exodra` only) ---
    // The construction of 200 panels and their 200 sources happens in `prep`, untimed, exactly
    // as `mikadoPooled`'s pool fills on its first hide. What is left inside the region is what a
    // pool actually buys: write the new text into each panel, then put the array back.
    const exodraKeptPrep = (): Scenario => {
        // EMPTY, not seeded with a generation's text: a source skips a write whose value is
        // identical to the last one, so a cell seeded with GEN_A's text would make the FIRST show
        // of every sample free while `mikadoPooled` wrote all 200 of its own. Starting empty makes
        // every one of the 20 shows write, which is what its counterpart does.
        const cells = GEN_A.map(() => createExoBenchSource(''));
        const shown = createExoBenchSource<readonly TExoNode<TExoDomMark>[]>(NO_CHILDREN);
        const kept: TExoNode<TExoDomMark>[] = [];
        const c = el();
        const dispose = mountExodraToggleKept(c, cells, shown, kept);
        // Allocated once, in setup: alternating between two constant arrays is what a real cached
        // block does, and it keeps the allocation out of the timed region on a participant whose
        // whole claim is about what it does NOT do there.
        const all: readonly TExoNode<TExoDomMark>[] = kept.slice();
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        shown.setValue(NO_CHILDREN);
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) cells[i].setValue(rows[i].text);
                    shown.setValue(all);
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- THE KEEP LADDER: two rows that are `exodraKept` with one more layer not asked for -------
    //
    // NOT COMPETITORS AND NOT FLOORS. Their absolute numbers mean nothing on their own;
    // `reportKeptLayers` is the only place they say anything, and what they say is where
    // `exodraKept − floor·kept·owned` goes. Every one of them is the SHIPPING renderer, reached
    // through exported API, and every one goes through `gateMarkup` and `gateKeeps` unwidened.

    // STRUCK: `exodraKeptWarm`. It priced ONE BUILD PASS of 200 panels moved out of the measured
    // region — the deferral `c.build` used to make, handing back a child with `node === undefined`
    // and leaving clone/walk/wire/subscribe to `materialiseExoChild` at the insertion site. `c.build`
    // is `buildLiveExoChild` now and materialises in the call, and `materialiseExoChild` is deleted
    // with no replacement, so there is no deferral to move and `exodraKept` IS the warm program.
    // Nothing is substituted: the rung is gone and `reportKeptLayers`'s chain opens at
    // `exodraKept − exodraPlacedKept`.

    // `exodraPlacedKept` — the same panels, the same cells, the same warm start, and the holder
    // places them.
    //
    // THE LOOP IS ONE PASS WHERE `exodraKept` IS TWO, and that is not an oversight: a
    // reconciler-direct row CANNOT interleave, because its placement is one `setValue` of an array
    // and the texts must all be written before it. Being able to write and place a panel in the same
    // pass IS part of what hand placement buys, and it is what `floor·kept·owned` does. So the
    // difference this row makes against `exodraKept` is "the reconciler and the port, against a
    // holder's own loop" — the loop shape included, stated here rather than discovered later.
    const exodraPlacedKeptPrep = (): Scenario => {
        const cells = GEN_A.map(() => createExoBenchSource(''));
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraTogglePlacedKept(c, cells, held);
        const root = c.firstElementChild as HTMLElement;
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        // `unmount` first and with the region still whole, then ONE call — the order
                        // `removeAll`'s owned branch keeps, and for its reason: an override may read the
                        // tree. Here every override is `KEEP_ALIVE`, so the panels survive it and
                        // `held` still points at all 200.
                        for (let i = 0; i < PANELS; i++) held[i].unmount();
                        root.textContent = '';
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        cells[i].setValue(rows[i].text);
                        const rec = held[i];
                        root.appendChild(rec.node);
                        rec.mount();
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // `exodraDirectKept` — the same again with no cell and no subscription: the holder writes each
    // panel's text through the port handle that panel's own wire handed it.
    const exodraDirectKeptPrep = (): Scenario => {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraToggleDirectKept(c, slots, held);
        const root = c.firstElementChild as HTMLElement;
        // Read out of the slots ONCE, in setup, for the reason every other row's host element is
        // read once: a `slots[i].ports!` inside the region would be pricing this file's optional
        // chaining rather than the renderer. The port itself is a module-level value on the
        // component, so naming it costs nothing per write.
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = PANEL_DIRECT_SCHEMA.ports.text;
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        for (let i = 0; i < PANELS; i++) held[i].unmount();
                        root.textContent = '';
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        ports[i].text(text, rows[i].text);
                        const rec = held[i];
                        root.appendChild(rec.node);
                        rec.mount();
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // `exodraMachineKept` — THE SAME ROW AGAIN WITH THE PANEL AS A MACHINE.
    //
    // THE MEASURED REGION IS `exodraDirectKeptPrep`'s WITH ONE LINE CHANGED: `setPanelText(
    // instances[i], rows[i].text)` where that row writes `ports[i].set(text, rows[i].text)`. The
    // hide, the show, the two lifecycle calls and the one-call clear are copied verbatim.
    //
    // WHAT THE ONE LINE CONTAINS, both terms named: the machine's DOOR — a call to the function
    // `mPanel.transition` handed back, which for an undecorated machine is the author's own arrow
    // and no wrapper at all, so the door costs a call and the `c.set` inside it — and ONE PROPERTY
    // STORE into the cache, which is the panel REMEMBERING what it shows, a job `PANEL_DIRECT` does
    // not do at all.
    //
    // NOTHING IS READ OUT OF A SLOT IN SETUP HERE and nothing needs to be: `build` hands back the
    // instance and the wire stores it straight into `instances`, so the region indexes an array of
    // instances exactly as the row above indexes an array of port tables. Neither pays for an
    // optional chain in the clock.
    const exodraMachineKeptPrep = (): Scenario => {
        const instances: TMachinePanel[] = new Array<TMachinePanel>(PANELS);
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraToggleMachineKept(c, instances, held);
        const root = c.firstElementChild as HTMLElement;
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        for (let i = 0; i < PANELS; i++) held[i].unmount();
                        root.textContent = '';
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        setPanelText(instances[i], rows[i].text);
                        const rec = held[i];
                        root.appendChild(rec.node);
                        rec.mount();
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // `exodraMachineKept·twin` — THE SAME PROGRAM DECLARED A SECOND TIME, and this axis's
    // FIRST null taken at the KEEP contract's magnitude.
    //
    // `reportKeptLayers` states the gap this closes in its own words: "there is no twin on the keep
    // contract … so the only two programs in this run whose true difference is ZERO are the rebuild
    // twin pair" — and that pair sits an order of magnitude away from where every kept row sits, so
    // every kept difference this axis has printed was read against a floor taken somewhere else.
    //
    // WHAT IS DUPLICATED: the declaration, the port numbering, the machine, its compiled program,
    // its schema and its backend. WHAT IS NOT: `STATES`, which both drive, in the same order, because the
    // data is not part of what is being nulled.
    const exodraMachineKeptTwinPrep = (): Scenario => {
        const instances: TMachinePanel[] = new Array<TMachinePanel>(PANELS);
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraToggleMachineKeptTwin(c, instances, held);
        const root = c.firstElementChild as HTMLElement;
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        for (let i = 0; i < PANELS; i++) held[i].unmount();
                        root.textContent = '';
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        setPanelTwinText(instances[i], rows[i].text);
                        const rec = held[i];
                        root.appendChild(rec.node);
                        rec.mount();
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // `exodraDetachedKept` — the same panels again, moved by the region's PLACEMENT pair.
    //
    // THE MEASURED REGION IS `exodraDirectKept`'s WITH THE FOUR LIFECYCLE LINES GONE: no
    // `held[i].unmount()`, no `root.textContent = ''`, no `root.appendChild`, no `rec.mount()` —
    // `detach` and `attach` are the whole of it. It is a DIFFERENT CONTRACT (`keep + shared`,
    // bounded by `floor·kept`, not `floor·kept·owned`), for the reason the mount function's header
    // states at length; do not subtract it from the row above.
    //
    // THE HIDE RUNS FROM THE END DOWNWARDS. `detach(size - 1)` splices the last entry and re-indexes
    // nothing; detaching index 0 two hundred times would re-index the whole remainder every time,
    // which is this file measuring a loop order rather than the renderer. `floor·kept` calls
    // `kept[i].remove()` in either order at the same cost, so the choice is ours to make well.
    const exodraDetachedKeptPrep = (): Scenario => {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: TExoNode<TExoDomMark>[] = [];
        const c = el();
        let region!: TExoChildList;
        const dispose = mountExodraToggleDetachedKept(c, slots, held, (r) => {
            region = r;
        });
        // Read out of the slots ONCE, in setup, exactly as the row above reads them.
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = PANEL_DIRECT_SCHEMA.ports.text;
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        for (let i = region.size - 1; i >= 0; i--) region.detach(i);
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        ports[i].text(text, rows[i].text);
                        region.attach(held[i]);
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // `exodraDetachedAllKept` — THE SAME ROW WITH ITS HIDE SAID ONCE.
    //
    // ONE LINE DIFFERS FROM `exodraDetachedKept` ABOVE: the 200-iteration `detach` loop is a single
    // `region.detachAll()`. Same mount function, same panels, same slots, same `fillDoors().text` per
    // show, same 200 × `attach`. Everything a subtraction between the two could otherwise be blamed
    // on is identical by construction.
    //
    // AND IT CHANGES CONTRACT, WHICH IS THE POINT AND NOT A SIDE EFFECT. The host `<div>` holds
    // NOTHING but the children port, so `ownsElement` is 1 for it, so `c.childList` hands
    // `createExoChildList` an `ownsParent` of true, so `detachAll` empties the host with ONE
    // `parent.textContent = ''` instead of 200 climb-and-`removeChild`s. That puts this row under
    // `keep + OWNED parent` and pairs it with `floor·kept·owned` — the same floor `exodraKept`,
    // `exodraPlacedKept` and `exodraDirectKept` are read against — while
    // `exodraDetachedKept` stays under `keep + shared` against `floor·kept`.
    //
    // SO THE TWO ROWS ARE NOT SUBTRACTABLE FROM EACH OTHER EITHER, and the reason is the same one
    // this file gives everywhere else: a difference across contracts is two jobs with a number
    // between them. What each says is what it costs against ITS OWN floor, and the interesting
    // reading is `exodraDetachedAllKept / floor·kept·owned` against `exodraDetachedKept /
    // floor·kept` — two ratios, not one difference.
    //
    // IT IS THE ONLY ROW ON THIS AXIS THAT IS BOTH `keep + owned` AND FREE OF EVERY LIFECYCLE CALL.
    // The four rows above it all pay 200 `unmount`s per hide and 200 `mount`s per show — three of
    // them by writing `KEEP_ALIVE` over the child's `unmount` field, which disarms the call without
    // removing it. This one makes none.
    const exodraDetachedAllKeptPrep = (): Scenario => {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: TExoNode<TExoDomMark>[] = [];
        const c = el();
        let region!: TExoChildList;
        const dispose = mountExodraToggleDetachedKept(c, slots, held, (r) => {
            region = r;
        });
        // Read out of the slots ONCE, in setup, exactly as the two rows above read them.
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = PANEL_DIRECT_SCHEMA.ports.text;
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        // THE WHOLE HIDE. The returned array is DISCARDED on purpose: this row holds
                        // its panels in `held`, which the wire filled at mount, so the return value
                        // is a copy it does not need. A row that kept it would be timing an
                        // assignment this one has no use for — and a row that RELIED on it would be
                        // measuring the `slice` twice.
                        region.detachAll();
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        ports[i].text(text, rows[i].text);
                        region.attach(held[i]);
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    const vobyPrep = (): Scenario => {
        const c = el();
        const rows = $(HIDDEN as TToggleRow[]) as { (): TToggleRow[]; (v: TToggleRow[]): void };
        const dispose = vRender(
            vh(
                'div',
                {},
                vh(vFor, { values: rows }, (r: unknown) =>
                    vh(
                        'div',
                        { class: 'panel' },
                        vh('h4', {}, 'Panel'),
                        vh('p', {}, () => ($$(r) as TToggleRow).text),
                        vh('button', { onClick: noop }, 'x')
                    )
                )
            ),
            c
        );
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    rows(STATES[k] as TToggleRow[]);
                    obyTick();
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Marko: `<for by="id">` fired by input, destroy/rebuild per show ----------------------
    // WHY THE FLUSH IS HERE. `update()` already commits synchronously — `mount()`'s `update` in
    // marko/dist/dom.mjs wraps the input signal in `prepareEffects`, which sets the rendering
    // flag, runs the signal and drains `runRenders()` before returning. That is read off the
    // runtime's source, not measured, and a batching framework whose work escaped the timed region
    // does not fail — it comes out fast. So `markoFlush()` (`run()` from `marko/dom`) is called
    // per transition anyway: on an empty queue it is a handful of statements against a 200-panel
    // build, and it is what svelte/react/voby are charged here.
    const markoPrep = (): Scenario => {
        const c = el();
        const inst = MkToggle.mount({ rows: HIDDEN }, c);
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    inst.update({ rows: STATES[k] });
                    markoFlush();
                }
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- Lit / stage0 / uhtml / sinuous: the same transitions, through the same two calls -------
    // NOTHING TO FLUSH for any of them: Lit's `render()` writes the DOM inside the call, stage0
    // writes it inside `reconcile()`, sinuous runs its observers inside the observable's write,
    // and uhtml's alien-signals propagates and flushes inside the write.
    const twoCall =
        (
            mount: (
                input: { rows: readonly TToggleRow[] },
                host: HTMLElement
            ) => { update(input: { rows: readonly TToggleRow[] }): void; destroy(): void }
        ) =>
        (): Scenario => {
            const c = el();
            const inst = mount({ rows: HIDDEN }, c);
            return {
                measure: () => {
                    for (let k = 0; k < STATES.length; k++) inst.update({ rows: STATES[k] });
                },
                cleanup: () => {
                    inst.destroy();
                    c.remove();
                },
            };
        };
    const litPrep = twoCall(mountLitToggle);
    const stage0Prep = twoCall(mountStage0Toggle);
    const uhtmlPrep = twoCall(mountUhtmlToggle);
    const sinuousPrep = twoCall(mountSinuousToggle);

    // The floor rows go through the SAME two-call surface as Lit, stage0, uhtml and sinuous, so
    // their measured region is character-for-character those rows' region and nothing about the
    // harness treats them differently. The two `keep` rows are curried with `PANELS` because they
    // build their panels at mount, untimed, exactly as `exodraKept` does in its wire — the
    // currying happens here, while the scenario is being constructed, never inside a region.
    const floorPrep = twoCall(mountFloorToggle);
    const floorTwinPrep = twoCall(mountFloorToggleTwin);
    const floorOwnedPrep = twoCall(mountFloorToggleOwned);
    const floorFragPrep = twoCall(mountFloorToggleFrag);
    const floorKeptPrep = twoCall(floorKeptToggle(PANELS));
    const floorKeptOwnedPrep = twoCall(floorKeptOwnedToggle(PANELS));

    // --- Schema core WITHOUT THE CHILDREN RECONCILER: the holder places what it built --------------
    // The host element is read ONCE, in setup, for the same reason every other row's host is: a
    // `firstElementChild` inside the region would be pricing this file rather than the renderer. The
    // region is the same two DOM operations `TExoChildList` performs — `appendChild` per panel
    // and ONE `textContent = ''` per hide — plus the lifecycle calls it makes, and nothing else.
    const exodraPlacedPrep = (): Scenario => {
        const c = el();
        let conn!: TToggleConnector;
        const dispose = mountExodraTogglePlaced(c, (cc) => {
            conn = cc;
        });
        const root = c.firstElementChild as HTMLElement;
        const held: ReturnType<typeof exoNodeDom>[] = [];
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) {
                    const rows = STATES[k];
                    if (rows.length === 0) {
                        // `unmount` first and with the region still whole, then ONE call — the
                        // order `removeAll`'s owned branch keeps, and for its reason: an override
                        // may read the tree.
                        for (let i = 0; i < held.length; i++) held[i].unmount();
                        root.textContent = '';
                        held.length = 0;
                        continue;
                    }
                    for (let i = 0; i < PANELS; i++) {
                        BUILDING_ROWS[i] = rows[i];
                        const rec = exoNodeDom(conn.build(PANEL, i));
                        root.appendChild(rec.node);
                        rec.mount();
                        held[i] = rec;
                    }
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Mikado: an unkeyed view, destroy/rebuild per show -------------------------------------
    // A Mikado view OWNS the children of the root it is mounted on (`mount()` empties that root),
    // so the host `<div>` is created here rather than by a template — the same arrangement
    // `apps/mikado/mikado.tsx` uses for the app div, and the reason the container holds the
    // `<div>` the reference holds.
    //
    // NOTHING IS KEPT ACROSS THE HIDDEN STATE, which is what makes this comparable to the rest of
    // the field. `remove()` calls `checkout()` — the function that banks a node for reuse — only
    // `if(this.key || this.pool)` (mikado.js:1583), and this view has neither, so a hide really
    // does drop the nodes and a show really does clone the factory 200 times. `pool` and `cache`
    // are not merely unset: the constructor computes `cacheable = this.recycle || !!this.key` and
    // forces BOTH off when it is false (mikado.js:143-165), so on an unkeyed, non-recycling view
    // they cannot be turned on at all. Turning them on means turning on `recycle`, which is a
    // different contract entirely — that row is `mikadoPooled` below, and it is a diagnostic.
    //
    // WHAT THE HIDE COSTS IT, and it is the structural difference this axis was rescaled to
    // expose: `render([])` returns `this.remove(0, length)`, and with the whole list going that
    // takes the branch which sets `this.root.textContent = ""` and then SKIPS `node.remove()` for
    // every node (mikado.js:1550-1580). One DOM call against everybody else's 200.
    //
    // NOTHING TO FLUSH: `render()` is synchronous unless the `async` option or a callback asks
    // otherwise (mikado.js:680-710), and neither is used here.
    const mikadoPrep = (): Scenario => {
        const c = el();
        const host = document.createElement('div');
        c.appendChild(host);
        // `mount` in the OPTIONS rather than a later `.mount()` call: constructing a view is what
        // builds its factory, and building the factory is what calls `listen("click")` for the
        // route in this template (factory.js:277) — so Mikado's delegation is set up in `prep`,
        // where every other participant's listener wiring also happens, and never inside the
        // measured region.
        const view = new Mikado(MK_PANEL, { mount: host });
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) view.render(STATES[k]);
            },
            cleanup: () => {
                view.destroy();
                // Mikado's delegation is ONE global capture listener that fires for every click in
                // the document. Nothing on this axis dispatches a click, so leaving it would cost
                // nobody anything — but `apps/mikado/mikado-reactive.tsx` has to remove it for this
                // reason on the app axes. Same hygiene here; the next `prep`'s factory registers
                // it again.
                Mikado.unlisten('click');
                c.remove();
            },
        };
    };

    // --- Mikado, POOLED: the same block recycled (read vs `mikado` only) ------------------------
    // THE DIAGNOSTIC HALF, and the exact counterpart of `exodraKept`. `{ recycle: true, pool: true }`
    // makes the hidden state a PARKING LOT rather than a destruction: `remove()` now calls
    // `checkout()`, which pushes every node into `pool_shared` in REVERSE (mikado.js:1653 and the
    // comment above the removal loop, which names pagination, list resizing, folding and filtering
    // as the cases that reversal is for), and the next `create()` takes them straight back with
    // `pool.pop()` in the original order and never touches the factory (mikado.js:1057-1080). It
    // still applies the row's data to the node it popped, which is why every show on this axis
    // carries a different generation: a pool that re-attached nodes already reading correctly
    // would be measuring something no tab switch ever gets.
    //
    // READ IT ONLY AGAINST `mikado`. `mikado` − `mikadoPooled` is the price of Mikado's rebuild,
    // which is the whole reason this axis exists.
    const mikadoPooledPrep = (): Scenario => {
        const c = el();
        const host = document.createElement('div');
        c.appendChild(host);
        const view = new Mikado(MK_PANEL, { mount: host, recycle: true, pool: true });
        return {
            measure: () => {
                for (let k = 0; k < STATES.length; k++) view.render(STATES[k]);
            },
            cleanup: () => {
                view.destroy();
                Mikado.unlisten('click');
                c.remove();
            },
        };
    };

    // ─────────────────────────────────────────────────────────────────────────────────────────
    // GATES. Each subject is fired in LOCKSTEP with a fresh `exodra` reference through the four
    // states this axis actually runs, and the state that matters is the one AFTER a teardown and a
    // rebuild, not the first paint. Two things are required of every subject:
    //
    //   1. the same markup as the reference at all four states (`gateMarkup`, or
    //      `gateMikadoMarkup` for the two Mikado rows, which forgives exactly one attribute name
    //      and prints its cost);
    //   2. the right ANSWER to "are these the same nodes as last time" — NONE for a competing row
    //      (anything else is a hidden cache, and its number would belong beside the diagnostics),
    //      ALL 200 for a diagnostic (anything else means the cache never engaged and the row is a
    //      slower copy of its competing row wearing a cache's name).
    //
    // A gate that returned `false` and let the run continue would be a comment, so these throw.

    /** Drive a subject and a fresh reference through the four states; hand back what was reused. */
    const gateFourStates = (
        label: string,
        subC: HTMLElement,
        step: (rows: readonly TToggleRow[]) => void,
        diff: (stage: string, refC: HTMLElement, subC: HTMLElement) => void
    ): { reused: number; total: number } => {
        const refC = el();
        const refRows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const refDispose = mountExodraToggle(refC, refRows);

        diff('hidden (as mounted)', refC, subC);
        refRows.setValue(GEN_A);
        step(GEN_A);
        diff('shown', refC, subC);
        const first = new Set<Element>(panelsIn(subC));
        refRows.setValue(HIDDEN);
        step(HIDDEN);
        diff('hidden again (after one teardown)', refC, subC);
        refRows.setValue(GEN_B);
        step(GEN_B);
        diff('shown again (after one rebuild)', refC, subC);
        const after = panelsIn(subC);
        const reused = after.filter((n) => first.has(n)).length;

        refDispose();
        refC.remove();
        if (first.size !== PANELS || after.length !== PANELS) {
            throw new Error(
                `toggle/${label}: a show put ${first.size} panels in the document and the next one ` +
                    `${after.length} — this axis shows ${PANELS} every time, so the numbers below ` +
                    'would be measuring a different amount of work'
            );
        }
        return { reused, total: after.length };
    };

    /** A competing row: it must have thrown its panels away and built new ones. */
    const gateRebuilds = (
        label: string,
        subC: HTMLElement,
        step: (rows: readonly TToggleRow[]) => void,
        diff: (stage: string, refC: HTMLElement, subC: HTMLElement) => void
    ): void => {
        const { reused, total } = gateFourStates(label, subC, step, diff);
        if (reused !== 0) {
            throw new Error(
                `toggle/${label}: ${reused} of ${total} panels visible after the second show are the ` +
                    'very nodes the first show put there — this row keeps its subtree across the ' +
                    'hidden state, which is the contract of the diagnostics (`exodraKept`, ' +
                    '`mikadoPooled`) and not of a row printed beside Solid and React'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate toggle/${label}: not one of the ${total} panels survived the hide — full ` +
                'destroy/rebuild, as documented'
        );
    };

    /** A diagnostic row: it must have put back the very nodes it had. */
    const gateKeeps = (
        label: string,
        subC: HTMLElement,
        step: (rows: readonly TToggleRow[]) => void,
        diff: (stage: string, refC: HTMLElement, subC: HTMLElement) => void
    ): void => {
        const { reused, total } = gateFourStates(label, subC, step, diff);
        if (reused !== total) {
            throw new Error(
                `toggle/${label}: only ${reused} of ${total} panels came back from the hide — the ` +
                    'cache never engaged, so this row would be a second, slower copy of its ' +
                    "competing row wearing a cache's name"
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate toggle/${label}: all ${total} panels were re-inserted, not rebuilt — the cache ` +
                'really engaged'
        );
    };

    // The reference against ITSELF, which is the one claim nothing else can check: the schema core
    // must be destroying and rebuilding, or every competing row on this axis is being compared
    // against a cache. It goes through the same four states and the same identity question.
    {
        const c = el();
        const rows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const dispose = mountExodraToggle(c, rows);
        rows.setValue(GEN_A);
        const first = new Set<Element>(panelsIn(c));
        rows.setValue(HIDDEN);
        rows.setValue(GEN_B);
        const after = panelsIn(c);
        const reused = after.filter((n) => first.has(n)).length;
        dispose();
        c.remove();
        if (first.size !== PANELS || after.length !== PANELS || reused !== 0) {
            throw new Error(
                `toggle/exodra: ${first.size} panels shown, ${after.length} after a hide+show, ` +
                    `${reused} of them the same nodes — the schema core is supposed to keep NOTHING ` +
                    'across the empty state, and if it now caches, this axis is comparing a cache ' +
                    'against everybody else and its header is wrong'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate toggle/exodra: ${PANELS} panels rebuilt from scratch after the hide (no node ` +
                'survived) — full destroy/rebuild, as documented'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────
    // `gateOwnsParent` — WHICH CLEAR THIS BLOCK'S HIDE TAKES: ONE `textContent = ''` OR 200
    // REMOVALS. (An inline block like the `exodra` self-gate above rather than a function, because
    // it needs `createExoBenchSource`, `el` and `mountExodraToggle`, all of which arrive inside this runner.
    // It prints `gate toggle/ownsParent`.)
    //
    // IT DECIDES WHICH FLOOR EVERY EXODRA ROW ON THIS AXIS IS BOUNDED BY, so it is proved before
    // anything is timed rather than argued in a header — this file's header asserted the wrong
    // answer for months and `teardown-phases.tsx`'s asserted the right one, and neither of them
    // was checked here. It is proved TWICE, by two routes that share nothing:
    //
    //   THE FLAG, off the compiled schema. `ownsElement[port] === 1` is what `c.childList` passes
    //   `createExoChildList` as its `ownsParent`, and the schema compiler sets it exactly
    //   where the port is its element's only child. This is `teardown-phases.tsx`'s `gateSchemas`
    //   in this axis's costume, down to reading `schema.ports.panels.index`.
    //
    //   THE BEHAVIOUR, on a real `mountExodraToggle` render. A FOREIGN node — one the renderer
    //   never built, never registered and does not hold in its `order` — is appended to the host
    //   after a show. `removeAll`'s owned branch ends in `parent.textContent = ''`, which takes EVERY
    //   child including that one; the per-child path removes exactly the 200 it knows about and
    //   cannot touch it. So the sentinel's survival is a direct, falsifiable read of which branch
    //   ran, from outside the package, with no internals involved.
    //
    // THE TWO HALVES ANSWER DIFFERENT OBJECTIONS AND THAT IS WHY BOTH ARE HERE. The schema read is
    // about the SHAPE — this component's host is built by three lines that also appear verbatim in
    // `mountExodraToggle`, `mountExodraToggleDelegated` and `mountExodraToggleKept`, but the
    // component it reads is a fresh one, because a wire cannot be handed in at the render call and
    // every scenario therefore builds its own declaration. The sentinel read is about THE ACTUAL
    // BLOCK a scenario mounts, through the actual `rows.setValue([])` path. Neither alone closes the gap
    // the other leaves.
    //
    // AND IT IS A REAL CONSEQUENCE FOR USERS, not only a benchmark's bookkeeping: a foreign node
    // parked inside a region whose port owns its element does NOT survive that region emptying.
    {
        const gateRows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const { schema: GATE_HOST_SCHEMA, host: GATE_HOST } = createExoToggleHost(
            gateRows,
            (cc, row: TToggleRow, i) => {
                BUILDING_ROWS[i] = row;
                return cc.build(PANEL, i);
            }
        );
        const portIndex = GATE_HOST_SCHEMA.ports.panels.index;
        const owns = exoDomSchemaOf(GATE_HOST, EXO_BACKEND).ownsElement[portIndex];

        const c = el();
        const rows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const dispose = mountExodraToggle(c, rows);
        rows.setValue(GEN_A);
        const hostEl = c.firstElementChild as HTMLElement;
        const sentinel = document.createElement('i');
        hostEl.appendChild(sentinel);
        rows.setValue(HIDDEN);
        const sentinelSurvived = sentinel.parentNode !== null;
        const leftBehind = hostEl.childNodes.length;
        dispose();
        c.remove();

        if (owns !== 1 || sentinelSurvived || leftBehind !== 0) {
            throw new Error(
                `toggle: the two proofs of the clear path disagree or the path changed — ` +
                    `ownsElement[${portIndex}] = ${owns} (1 means the port owns its element), the ` +
                    `foreign sentinel ${
                        sentinelSurvived ? 'SURVIVED' : 'was wiped'
                    } the hide, and ` +
                    `${leftBehind} node(s) were left in the host. This axis's floor pairing is ` +
                    "built on the OWNED clear (one `textContent = ''`); if the hide is now 200 " +
                    '`dropExoChild` removals, `exodra`, `exodraDelegated` and `exodraKept` must be ' +
                    'read against `floor·rebuild` / `floor·kept` instead of the `·owned` rows, and ' +
                    "this file's header and `reportFloor` are both wrong"
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate toggle/ownsParent: the children port OWNS its element ` +
                `(ownsElement[${portIndex}] = 1), so a hide is N × unmount() plus ONE ` +
                "`parent.textContent = ''` — proved again by behaviour: a foreign node appended " +
                'to the host did not survive the hide, which only the one-call clear can do. ' +
                '`exodra`, `exodraDelegated` and `exodraKept` are therefore bounded by the ' +
                '`·owned` floors.'
        );
    }

    // exodraDelegated — through the SAME gate as any third-party competitor, unwidened. Two things
    // are being pinned here rather than assumed. First, that the strategy is INVISIBLE IN THE
    // MARKUP: the delegated setter writes the handler and the subject into two EXPANDO PROPERTIES
    // on the element and registers nothing, so this row must produce the reference's exact bytes at
    // all four states — where Mikado's delegation has to leave `click="…"` in the DOM and is
    // forgiven exactly that one attribute name. Second, that it REBUILDS: a delegated row still
    // maps items to children by item identity, so a hide must drop all 200 panels and the next
    // show must build 200 new ones. If it kept any, this row would belong beside `exodraKept` and
    // not beside Solid.
    {
        const rows = createExoBenchSource<readonly TToggleRow[]>(HIDDEN);
        const c = el();
        const dispose = mountExodraToggleDelegated(c, rows);
        gateRebuilds(
            'exodraDelegated',
            c,
            (next) => rows.setValue(next),
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraDelegated', refC, subC)
        );
        dispose();
        c.remove();
    }

    // exodraKept — markup against the reference, plus the check that is the whole reason it exists.
    {
        const cells = GEN_A.map(() => createExoBenchSource(''));
        const shown = createExoBenchSource<readonly TExoNode<TExoDomMark>[]>(NO_CHILDREN);
        const kept: TExoNode<TExoDomMark>[] = [];
        const c = el();
        const dispose = mountExodraToggleKept(c, cells, shown, kept);
        const all: readonly TExoNode<TExoDomMark>[] = kept.slice();
        gateKeeps(
            'exodraKept',
            c,
            (rows) => {
                if (rows.length === 0) {
                    shown.setValue(NO_CHILDREN);
                    return;
                }
                for (let i = 0; i < PANELS; i++) cells[i].setValue(rows[i].text);
                shown.setValue(all);
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraKept', refC, subC)
        );
        dispose();
        c.remove();
    }

    // THE TWO KEEP-LADDER ROWS — through the axis's own gates, unwidened, exactly as the
    // rebuild ladder's one is, and for the same reason: a row is only subtractable from its
    // neighbour if it does the SAME JOB, and "the same job" is two claims neither of which is safe
    // to assume just because the renderer underneath is the same.
    //
    // `gateMarkup` at all four states pins that the panels really land in the document, in the
    // reference's exact bytes — a hand-placed row that appended into the wrong element, or left the
    // hide half-done, would otherwise look FAST for a reason that is not a layer. It also catches the
    // one thing a text port written by hand could get wrong that nothing else here would notice: a write
    // that landed on the wrong panel, or not at all, is a byte difference at the 'shown again' state.
    //
    // `gateKeeps` — NOT `gateRebuilds` — is the identity half, and it is the whole contract of these
    // rows: ALL 200 panels visible after the second show must be the very nodes the first show put
    // there. A keep-ladder row that quietly rebuilt would be a slower copy of a rebuild row wearing a
    // keep's name, and its difference from its neighbour would be a fiction.
    //
    // THE TWO HAND-PLACED ROWS ARE ALSO WHERE THEIR OWN OWNED CLEAR IS PROVED. `gateOwnsParent` reads
    // `ownsElement` off the schema, which is a statement about the RENDERER's hide; these rows perform
    // the hide themselves, so what makes them `keep+owned` is that their own `textContent = ''`
    // empties the host — and `gateKeeps`'s four-state drive, which compares the markup at 'hidden
    // again' against a reference whose host really is empty, is that check.
    // `exodraKeptWarm`'s gate block is struck with its row — see the strike note at its `prep`.

    {
        const cells = GEN_A.map(() => createExoBenchSource(''));
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraTogglePlacedKept(c, cells, held);
        const root = c.firstElementChild as HTMLElement;
        gateKeeps(
            'exodraPlacedKept',
            c,
            (rows) => {
                if (rows.length === 0) {
                    for (let i = 0; i < PANELS; i++) held[i].unmount();
                    root.textContent = '';
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    cells[i].setValue(rows[i].text);
                    const rec = held[i];
                    root.appendChild(rec.node);
                    rec.mount();
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraPlacedKept', refC, subC)
        );
        dispose();
        c.remove();
    }

    {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraToggleDirectKept(c, slots, held);
        const root = c.firstElementChild as HTMLElement;
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = PANEL_DIRECT_SCHEMA.ports.text;
        gateKeeps(
            'exodraDirectKept',
            c,
            (rows) => {
                if (rows.length === 0) {
                    for (let i = 0; i < PANELS; i++) held[i].unmount();
                    root.textContent = '';
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    ports[i].text(text, rows[i].text);
                    const rec = held[i];
                    root.appendChild(rec.node);
                    rec.mount();
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraDirectKept', refC, subC)
        );
        dispose();
        c.remove();
    }

    // `exodraMachineKept` — through the SAME `gateKeeps` and the SAME `gateMarkup` at all four
    // states, unwidened. TWO THINGS THIS ROW CANNOT BE READ WITHOUT ARE PINNED HERE.
    //
    // FIRST, THE MOUNT DIFF. This is the only kept row whose ports are filled from a KEEP FACTORY,
    // so whether that factory painted every panel's `<p>` at all is visible nowhere else in the run.
    // `gateMarkup`'s first state is the only check that can see it.
    //
    // SECOND, THAT THE PANELS SURVIVE. The transition writes a port on an instance the holder kept
    // across the hidden state; a `KEEP_ALIVE` that failed to take would give a panel per show and a
    // row that is a rebuild wearing a cache's name. `gateKeeps` demands all 200 nodes back.
    {
        const instances: TMachinePanel[] = new Array<TMachinePanel>(PANELS);
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraToggleMachineKept(c, instances, held);
        const root = c.firstElementChild as HTMLElement;
        gateKeeps(
            'exodraMachineKept',
            c,
            (rows) => {
                if (rows.length === 0) {
                    for (let i = 0; i < PANELS; i++) held[i].unmount();
                    root.textContent = '';
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    setPanelText(instances[i], rows[i].text);
                    const rec = held[i];
                    root.appendChild(rec.node);
                    rec.mount();
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraMachineKept', refC, subC)
        );
        dispose();
        c.remove();
    }

    // AND THE NULL, GATED ON EXACTLY THE SAME TERMS. A twin that stopped producing the reference's
    // bytes, or stopped keeping its panels, would be a BROKEN CONTROL — and a broken control does
    // not fail loudly, it quietly widens or narrows the keep-contract resolution every kept
    // difference in this run is about to be read against.
    {
        const instances: TMachinePanel[] = new Array<TMachinePanel>(PANELS);
        const held: ReturnType<typeof exoNodeDom>[] = [];
        const c = el();
        const dispose = mountExodraToggleMachineKeptTwin(c, instances, held);
        const root = c.firstElementChild as HTMLElement;
        gateKeeps(
            'exodraMachineKept·twin',
            c,
            (rows) => {
                if (rows.length === 0) {
                    for (let i = 0; i < PANELS; i++) held[i].unmount();
                    root.textContent = '';
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    setPanelTwinText(instances[i], rows[i].text);
                    const rec = held[i];
                    root.appendChild(rec.node);
                    rec.mount();
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraMachineKept·twin', refC, subC)
        );
        dispose();
        c.remove();
    }

    // `exodraDetachedKept` — through the SAME `gateKeeps` as every other kept row, unwidened, and
    // through `gateMarkup` at all four states. TWO THINGS ARE BEING PINNED that this row cannot be
    // read without.
    //
    // FIRST, THAT THE PANELS REALLY SURVIVE. `detach` runs no `unmount`, so nothing ends a panel's
    // subscriptions and nothing offers its element to a pile — but "no call was made" is exactly the
    // kind of claim that passes by inspection and fails in the document. `gateKeeps` demands that
    // all 200 nodes visible after the second show are the very nodes the first show put there.
    //
    // SECOND, THAT THE REGION'S BOUNDARY HELD. This row fills its children port and drives it by
    // hand, so an `attach` that walked past the region's end anchor, or a `detach` that left `order`
    // describing a tree that is not there, would put the panels somewhere the reference does not
    // have them. `gateMarkup` at the hidden states is what catches a host that was not emptied.
    {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: TExoNode<TExoDomMark>[] = [];
        const c = el();
        let region!: TExoChildList;
        const dispose = mountExodraToggleDetachedKept(c, slots, held, (r) => {
            region = r;
        });
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = PANEL_DIRECT_SCHEMA.ports.text;
        gateKeeps(
            'exodraDetachedKept',
            c,
            (rows) => {
                if (rows.length === 0) {
                    for (let i = region.size - 1; i >= 0; i--) region.detach(i);
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    ports[i].text(text, rows[i].text);
                    region.attach(held[i]);
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraDetachedKept', refC, subC)
        );
        dispose();
        c.remove();
    }

    // `exodraDetachedAllKept` — through the SAME `gateKeeps` and the SAME `gateMarkup` as the row
    // above, neither widened nor weakened, AND through one check of its own that the row above does
    // not need.
    //
    // THE TWO SHARED GATES ARE UNCHANGED and prove the same two things: that all 200 panels really
    // survive (`detachAll` runs no `unmount`, and "no call was made" is exactly the claim that
    // passes by inspection and fails in the document), and that the host really is EMPTY at both
    // hidden states — which for this row is the assertion that the one-call clear left nothing
    // behind and the region's boundary held.
    //
    // AND THE CHECK OF ITS OWN IS WHAT PUTS IT IN `keep + OWNED`. `gateMarkup` proving the host is
    // empty does not distinguish an assignment from 200 removals — both end empty. So the SENTINEL
    // proof `gateOwnsParent` already makes on this axis is run once more, on
    // THIS row's own mount: a foreign node — one the renderer never built, never registered and does
    // not hold in the region's `order` — is appended to the host while the panels are shown.
    // `parent.textContent = ''` takes EVERY child including that one; a per-child path removes
    // exactly the 200 it knows about and cannot touch it. Its disappearance is a direct, falsifiable
    // read of which body of `detachAll` ran, from outside `@exodra/dom`, with no internals involved.
    //
    // IT IS RUN ON A MOUNT OF ITS OWN, BEFORE THE GATED ONE, because it MUTATES: the sentinel and
    // the hide it triggers are not part of the four-state script `gateKeeps` drives, and injecting a
    // node into the middle of that script would make the markup comparison fail for a reason that is
    // this gate's doing.
    {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: TExoNode<TExoDomMark>[] = [];
        const c = el();
        let region!: TExoChildList;
        const dispose = mountExodraToggleDetachedKept(c, slots, held, (r) => {
            region = r;
        });
        const hostEl = c.firstElementChild as HTMLElement;
        for (let i = 0; i < PANELS; i++) region.attach(held[i]);
        const sentinel = document.createElement('i');
        hostEl.appendChild(sentinel);
        region.detachAll();
        const sentinelSurvived = sentinel.parentNode !== null;
        const leftBehind = hostEl.childNodes.length;
        const emptied = region.size;
        dispose();
        c.remove();

        if (sentinelSurvived || leftBehind !== 0 || emptied !== 0) {
            throw new Error(
                `toggle/exodraDetachedAllKept: the hide left ${leftBehind} node(s) in the host, ` +
                    `${emptied} child(ren) in the region, and the foreign sentinel ` +
                    `${sentinelSurvived ? 'SURVIVED' : 'was wiped'}. This row is paired with ` +
                    '`floor·kept·owned` on the strength of `detachAll` taking the ONE-CALL clear — ' +
                    'the port is its element’s only child, so `ownsElement` is 1, so `childList` ' +
                    'hands `createExoChildList` an `ownsParent` of true. A surviving sentinel means the ' +
                    'per-child body ran instead, and then this row belongs beside ' +
                    '`exodraDetachedKept` under `keep + shared` against `floor·kept`, and its entry ' +
                    'in KEEP_OWNED_SETTLED_BY_REGION is wrong'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            '✅ gate toggle/exodraDetachedAllKept: `detachAll` took the ONE-CALL clear — a foreign ' +
                'node appended to the host did not survive the hide, which only ' +
                "`parent.textContent = ''` can do, and the region emptied with it. This row is " +
                '`keep + owned` and is bounded by `floor·kept·owned`.'
        );
    }

    {
        const slots: TToggleSlot[] = GEN_A.map(() => ({ ports: null }));
        const held: TExoNode<TExoDomMark>[] = [];
        const c = el();
        let region!: TExoChildList;
        const dispose = mountExodraToggleDetachedKept(c, slots, held, (r) => {
            region = r;
        });
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = PANEL_DIRECT_SCHEMA.ports.text;
        gateKeeps(
            'exodraDetachedAllKept',
            c,
            (rows) => {
                if (rows.length === 0) {
                    region.detachAll();
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    ports[i].text(text, rows[i].text);
                    region.attach(held[i]);
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraDetachedAllKept', refC, subC)
        );
        dispose();
        c.remove();
    }

    // Marko — through the SAME gate, unchanged and unwidened. Its client-mounted markup carries no
    // bookkeeping a strip would have to hide: the compiler emits resume attributes only for the
    // HTML target (`markNode` is a no-op for DOM), it marks dynamic positions with `<!>` — a
    // comment, which `markup-gate.ts` strips from both sides — and the button's handler is an
    // expando property (`el["$click"]`), not an attribute.
    {
        const c = el();
        const inst = MkToggle.mount({ rows: HIDDEN }, c);
        gateRebuilds(
            'marko',
            c,
            (rows) => {
                inst.update({ rows });
                markoFlush();
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'marko', refC, subC)
        );
        inst.destroy();
        c.remove();
    }

    // Lit — same terms, same gate, not widened. Lit marks every dynamic position with a comment
    // (`<!--?lit$<n>$-->` where the prepared template recorded a part, `<!---->` around each item
    // of an iterable), and `markup-gate.ts` strips comments from BOTH sides for exactly that class
    // of marker; nothing in this panel emits a comment of its own, so the strip cannot hide a real
    // divergence, and the element count printed beside every result is what a strip cannot cover.
    // Its binding markers never reach the cloned DOM as attributes (the `Template` constructor
    // calls `node.removeAttribute(name)` while it walks), so `@click` emits nothing and
    // `class="panel"` is static.
    {
        const c = el();
        const inst = mountLitToggle({ rows: HIDDEN }, c);
        gateRebuilds(
            'lit',
            c,
            (rows) => inst.update({ rows }),
            (stage, refC, subC) => gateMarkup('toggle', stage, 'lit', refC, subC)
        );
        inst.destroy();
        c.remove();
    }

    // Mikado — through `gateMikadoMarkup`, which is `gateMarkup` minus exactly one attribute name
    // with the price printed. Nothing else needs forgiving: Mikado's per-node bookkeeping (`_mkp`
    // path arrays, `_mkd`, `_mki`, the tpl-root marker) lives in EXPANDO PROPERTIES rather than
    // attributes, and it emits no comment anchors at all, so the comment strip cannot be hiding
    // anything of Mikado's.
    {
        const c = el();
        const host = document.createElement('div');
        c.appendChild(host);
        const view = new Mikado(MK_PANEL, { mount: host });
        gateRebuilds(
            'mikado',
            c,
            (rows) => view.render(rows),
            (stage, refC, subC) => gateMikadoMarkup(stage, 'mikado', refC, subC)
        );
        view.destroy();
        Mikado.unlisten('click');
        c.remove();
    }

    // mikadoPooled — the same four states, and the one check that is the whole reason it exists:
    // it must be RE-INSERTING the nodes it banked. If it is not, the pool never engaged and its
    // timing is a second copy of `mikado` under a misleading name.
    {
        const c = el();
        const host = document.createElement('div');
        c.appendChild(host);
        const view = new Mikado(MK_PANEL, { mount: host, recycle: true, pool: true });
        gateKeeps(
            'mikadoPooled',
            c,
            (rows) => view.render(rows),
            (stage, refC, subC) => gateMikadoMarkup(stage, 'mikadoPooled', refC, subC)
        );
        view.destroy();
        Mikado.unlisten('click');
        c.remove();
    }

    // stage0, uhtml and sinuous — the same four states, each in its own iteration so a failure
    // names itself, and the gate was NOT widened for any of them. stage0's reference attributes
    // are stripped from its template before anything is cloned from it and its listener is a
    // property; sinuous's markers are EMPTY TEXT NODES (no characters in `innerHTML`) and its
    // listener lives in an expando; uhtml leaves one `<!--◦-->` anchor, which is the comment class
    // `markup-gate.ts` strips from both sides, and its interpolated attributes never reach the
    // serialised template. All three are expected to produce the reference's exact bytes.
    for (const [label, mount] of [
        ['stage0', mountStage0Toggle],
        ['uhtml', mountUhtmlToggle],
        ['sinuous', mountSinuousToggle],
    ] as Array<
        [
            string,
            (
                input: { rows: readonly TToggleRow[] },
                host: HTMLElement
            ) => { update(input: { rows: readonly TToggleRow[] }): void; destroy(): void }
        ]
    >) {
        const c = el();
        const inst = mount({ rows: HIDDEN }, c);
        gateRebuilds(
            label,
            c,
            (rows) => inst.update({ rows }),
            (stage, refC, subC) => gateMarkup('toggle', stage, label, refC, subC)
        );
        inst.destroy();
        c.remove();
    }

    // THE FLOOR ROWS — through the axis's own gates, unwidened, and each one required to prove
    // BOTH halves of what it claims. The markup half is `gateMarkup` against a fresh `exodra`
    // reference at all four states: a floor that produced different bytes would be bounding a
    // different job, and a bound on a different job is worse than no bound. The identity half is
    // the one that separates the two contracts, and it is why the four `rebuild` floors and the
    // two `keep` floors go through DIFFERENT gates rather than one:
    //
    //   `gateRebuilds` — ZERO of the 200 panels visible after the second show may be the nodes the
    //                    first show put there. If a "rebuild" floor quietly kept its subtree it
    //                    would be a cheap keep-alive under a rebuild's name, and every headroom
    //                    computed against it would be nonsense.
    //   `gateKeeps`    — ALL 200 must come back. If a "keep" floor quietly rebuilt, it would be a
    //                    second copy of `floor·rebuild` and `exodraKept` would have no bound.
    //
    // Each is gated in its own iteration so a failure names the row that failed.
    for (const [label, mount] of [
        ['floor·rebuild', mountFloorToggle],
        ['floor·rebuild·owned', mountFloorToggleOwned],
        ['floor·rebuild·frag', mountFloorToggleFrag],
        ['floor·rebuild·twin', mountFloorToggleTwin],
    ] as Array<
        [
            string,
            (
                input: { rows: readonly TToggleRow[] },
                host: HTMLElement
            ) => { update(input: { rows: readonly TToggleRow[] }): void; destroy(): void }
        ]
    >) {
        const c = el();
        const inst = mount({ rows: HIDDEN }, c);
        gateRebuilds(
            label,
            c,
            (rows) => inst.update({ rows }),
            (stage, refC, subC) => gateMarkup('toggle', stage, label, refC, subC)
        );
        inst.destroy();
        c.remove();
    }

    for (const [label, mount] of [
        ['floor·kept', floorKeptToggle(PANELS)],
        ['floor·kept·owned', floorKeptOwnedToggle(PANELS)],
    ] as Array<
        [
            string,
            (
                input: { rows: readonly TToggleRow[] },
                host: HTMLElement
            ) => { update(input: { rows: readonly TToggleRow[] }): void; destroy(): void }
        ]
    >) {
        const c = el();
        const inst = mount({ rows: HIDDEN }, c);
        gateKeeps(
            label,
            c,
            (rows) => inst.update({ rows }),
            (stage, refC, subC) => gateMarkup('toggle', stage, label, refC, subC)
        );
        inst.destroy();
        c.remove();
    }

    // THE LAYER ROW — through the axis's own gates, unwidened, exactly as the floor rows are,
    // and for a reason the decomposition cannot do without: a row is only subtractable from its
    // neighbour if it does the SAME JOB, and "the same job" is two claims neither of which is safe
    // to assume just because the renderer underneath is the same.
    //
    // `gateMarkup` at all four states pins that the panels really land in the document, in the
    // reference's exact bytes — a hand-placed row that appended into the wrong element, or left the
    // hide half-done, would otherwise look FAST for a reason that is not a layer.
    // `gateRebuilds` pins that all 200 panels are destroyed per hide and 200 new ones built, so
    // it cannot quietly become a keep-alive and make its difference look like a saving. Either
    // failure means the row is a different program, and the arithmetic below rests on it not being
    // one.
    //
    // `exodraPlaced` IS ALSO WHERE THE OWNED CLEAR IS PROVED OF ITSELF. `gateOwnsParent` reads
    // `ownsElement` off the schema, which is a statement about the RENDERER's hide; this row performs
    // the hide itself, so what makes it `rebuild+owned` is that its own `textContent = ''` empties
    // the host — and `gateRebuilds` checking that the host is empty at the hidden state is that
    // check.
    // `exodraChildren`'s gate block is struck with its row — see the strike note above
    // `mountExodraTogglePlaced`.

    {
        const c = el();
        let conn!: TToggleConnector;
        const dispose = mountExodraTogglePlaced(c, (cc) => {
            conn = cc;
        });
        const root = c.firstElementChild as HTMLElement;
        const held: ReturnType<typeof exoNodeDom>[] = [];
        gateRebuilds(
            'exodraPlaced',
            c,
            (rows) => {
                if (rows.length === 0) {
                    for (let i = 0; i < held.length; i++) held[i].unmount();
                    root.textContent = '';
                    held.length = 0;
                    return;
                }
                for (let i = 0; i < PANELS; i++) {
                    BUILDING_ROWS[i] = rows[i];
                    const rec = exoNodeDom(conn.build(PANEL, i));
                    root.appendChild(rec.node);
                    rec.mount();
                    held[i] = rec;
                }
            },
            (stage, refC, subC) => gateMarkup('toggle', stage, 'exodraPlaced', refC, subC)
        );
        dispose();
        c.remove();
    }

    const table = await abBench(
        `TOGGLE — ${CYCLES} × (tear down a ${PANELS}-panel block, build a different one) ` +
            '(exodraKept and mikadoPooled are DIAGNOSTICS: they keep/recycle the panels, so read ' +
            'them against `exodra` and `mikado` alone)',
        `ms/${CYCLES} hide+show cycles`,
        {
            exodra: exodraPrep,
            // A COMPETITOR, not a diagnostic: same rebuild, same gate, one plugin and the handler
            // form that plugin requires. Read it against the field AND against `exodra` — but read
            // the delta as "delegation + descriptor", never as delegation alone.
            exodraDelegated: exodraDelegatedPrep,
            exodraKept: exodraKeptPrep,
            // THE KEEP LADDER. Not competitors and not floors — `exodraKept` with one more layer
            // NOT ASKED FOR each time, so that the gap the KEEP floor sizes can be SPLIT. Their
            // absolute numbers mean nothing on their own: `reportKeptLayers` prints the
            // differences, the null beside each one, and the refusals. Read that function's header
            // for why there is no list-layer rung and why the last difference is expected to be
            // refused at batch 1.
            exodraPlacedKept: exodraPlacedKeptPrep,
            exodraDirectKept: exodraDirectKeptPrep,
            // THE MACHINE'S IMPERATIVE ROW BESIDE THE WIRE IT IS PAIRED WITH, declared immediately
            // after it so the two are sampled back to back in every round — `abBench` rotates the
            // starting position but preserves the cyclic order. IT IS NOT A RUNG OF THE KEEP LADDER
            // and `reportKeptLayers`'s CHAIN is untouched: every rung there is one layer NOT ASKED
            // FOR, and this is the same layer SPELLED DIFFERENTLY. `reportMachineKeep` below prints
            // the one subtraction it exists for.
            //
            // WHAT IT ALLOCATES PER PANEL, AGAINST THE WIRE BESIDE IT — COUNTED BY READING THE TWO
            // DECLARATIONS, not measured. `exodraDirectKept`: the slot object the holder hands in,
            // plus the `ExoDomPorts` handle `c.fillDoors()` returns — TWO. `exodraMachineKept`:
            // the exonode — which IS the instance, there is no wrapper round it — its ONE-slot
            // value array, and the ONE cache object: TWO on top of the exonode every row allocates.
            // OUTSIDE THE CLOCK THE COUNT NOW PARTS: the direct row still builds one slot literal per
            // panel in setup, and this row builds NOTHING there — a machine takes no props, so there
            // is no per-panel item to make and the instance arrives as `build`'s return value.
            //
            // AND IT DOES ONE THING MORE PER SHOW, NAMED: it STORES the text, so the panel can
            // answer what it shows. The row above writes the string into the DOM and forgets it.
            exodraMachineKept: exodraMachineKeptPrep,
            // THE NULL, DECLARED IMMEDIATELY AFTER THE ROW IT IS A NULL OF — nothing may be inserted
            // between these two lines, for the reason every null pair in this suite gives: two
            // adjacent declarations are sampled back to back in EVERY round, which is what makes the
            // per-round |a−b| the scatter of two neighbours rather than the drift of a round.
            //
            // IT IS THIS AXIS'S FIRST KEEP-CONTRACT NULL. `reportKeptLayers` says in its own words
            // that there was none and that every kept figure it prints is therefore BIAS off the
            // REBUILD pair, taken an order of magnitude away. That caveat stands until its own text
            // is rewritten — this pair does not change what that function computes — but the number
            // it was missing is now in the table.
            'exodraMachineKept·twin': exodraMachineKeptTwinPrep,
            // THE PLACEMENT PAIR — the one row on this axis that makes NO lifecycle call, and the
            // one row under `keep + SHARED parent`. It is bounded by `floor·kept` and by nothing
            // else; a difference between it and the three rows above it crosses a contract and is
            // not a layer price. Read its mount function's header before quoting it.
            exodraDetachedKept: exodraDetachedKeptPrep,
            // THE SAME PLACEMENT PAIR WITH ITS HIDE SAID ONCE — `region.detachAll()` in place of 200
            // × `detach`. Also no lifecycle call anywhere, but under `keep + OWNED parent`: the port
            // owns its element, so the bulk call empties the host with ONE `textContent = ''` and
            // this row is bounded by `floor·kept·owned`. THE PAIR IS THE FINDING — read each against
            // its OWN floor, never one against the other, which would cross a contract.
            exodraDetachedAllKept: exodraDetachedAllKeptPrep,
            solid: solidPrep,
            svelte: sveltePrep,
            react: reactPrep,
            voby: vobyPrep,
            marko: markoPrep,
            mikado: mikadoPrep,
            mikadoPooled: mikadoPooledPrep,
            lit: litPrep,
            // `stage0` is the CEILING: a show is a clone, a text write, a listener and an insert
            // per panel, with no library between them. Read every competing row above it as
            // "stage0 plus what that library's list block costs to express".
            stage0: stage0Prep,
            uhtml: uhtmlPrep,
            sinuous: sinuousPrep,
            // THE FLOOR. Not competitors, not diagnostics — the bound. Six programs with no
            // framework in them, in two contracts plus one probe and one null.
            // `participants/floor/toggle.ts` carries the comparability map, the spellings it did NOT take and what each of those
            // would have measured instead, and every way these numbers can lie.
            'floor·rebuild': floorPrep,
            'floor·rebuild·owned': floorOwnedPrep,
            'floor·rebuild·frag': floorFragPrep,
            'floor·rebuild·twin': floorTwinPrep,
            'floor·kept': floorKeptPrep,
            'floor·kept·owned': floorKeptOwnedPrep,
            // THE LAYER ROW. Not a competitor and not a floor — the same shipping renderer as
            // `exodra` with one layer NOT ASKED FOR, so that the gap the floor SIZES can be SPLIT.
            // Its absolute number means nothing on its own: `reportLayers` prints the
            // differences, the null beside each one, and the refusals. It is what replaced five
            // hand-written stand-in rungs that failed their own gates twice — see
            // `participants/floor/toggle.ts`. Its neighbour `exodraChildren` is STRUCK: see the
            // note above `mountExodraTogglePlaced`.
            exodraPlaced: exodraPlacedPrep,
        } as never,
        // `contracts` is read ONLY when `--only` narrowed the field, so a full run prints exactly
        // what it always did; `reportFloor` below is still the wide report and is untouched.
        { rounds, batch, contracts: TOGGLE_CONTRACTS }
    );

    // eslint-disable-next-line no-console
    console.log(
        '\nTHREE ROWS THIS TABLE NO LONGER CARRIES: `exodraBanked`, `exodraBank0` and ' +
            '`exodraBank32` — the same block under `withExoNodeBank(withExoCompiler(new ExoDomBackend()))` at the ' +
            'default cap, at `cap: 0` and at `cap: 32`. The node bank has been removed from ' +
            '`@exodra/dom`, so NO ROW ABOVE REUSES AN ELEMENT: every exodra row builds all ' +
            `${PANELS} panels of every show from a clone, and this axis no longer measures ` +
            'element reuse by any renderer of ours. The counts those rows printed belong to a ' +
            'composition that no longer exists and are not carried forward into any line here.'
    );

    // THE VERDICT ON THE AXIS ITSELF, not on the frameworks: is the table above a measurement or
    // the clock? See `reportScale` — on a failure it names the factor and the new `PANELS`.
    reportScale(table, quantum, batch);
    // AND THE BOUND, which is what the floor rows are for. Read `reportFloor`'s own header, and
    // `participants/floor/toggle.ts`'s, before quoting a single ratio out of it.
    reportFloor(table, quantum, batch);
    // AND WHERE THE GAP TO THAT BOUND GOES — the two layer rows, which are the only part of this
    // axis that answers "what would have to change" rather than "how far are we". Its refusals are
    // load bearing: a difference it will not price is an UNMEASURED difference, not a small one.
    reportLayers(table, quantum, batch);
    // AND THE SAME QUESTION ON THE OTHER CONTRACT. `reportLayers` splits `exodra −
    // floor·rebuild·owned`; this splits `exodraKept − floor·kept·owned`, which is the gap this axis
    // could measure and not decompose for its whole life. The two never share a figure: a ratio
    // across contracts is two different jobs with a number between them.
    reportKeptLayers(table, quantum, batch);
    // AND THE ONE SUBTRACTION THE MACHINE PAIR EXISTS FOR, with this axis's FIRST keep-contract null
    // under it. It is deliberately NOT inside `reportKeptLayers`: that function's chain is layers
    // removed, and this is one layer spelled differently.
    reportMachineKeep(table);
}

/**
 * `exodraMachineKept − exodraDirectKept`, READ AGAINST A NULL TAKEN AT THE SAME MAGNITUDE.
 *
 * WHY IT IS ITS OWN FUNCTION. `reportKeptLayers` walks a CHAIN in which each step removes a layer
 * that was not asked for, and prints every figure against `|floor·rebuild − floor·rebuild·twin|` —
 * BIAS off a pair taken an order of magnitude away, which that function's own text calls a caveat.
 * This subtraction is neither: the two rows do the SAME job in two spellings, and the null is the
 * machine row's own twin, taken at the kept rows' magnitude and next door in the rotation.
 *
 * IT PRINTS NO DIRECTION AND NAMES BOTH TERMS. The gap contains the machine's door AND one property
 * store into the cache, and this run does not split them; what it says is SEPARATED or UNRESOLVED
 * against the pair's own floor, and nothing else.
 */
function reportMachineKeep(rows: readonly AbRow[]): void {
    const at = new Map(rows.map((r) => [r.name, r]));
    const wire = at.get('exodraDirectKept');
    const machine = at.get('exodraMachineKept');
    const twin = at.get('exodraMachineKept·twin');
    if (wire === undefined || machine === undefined || twin === undefined) {
        refuse(
            'machine keep toggle · SKIPPED — this run did not sample all of exodraDirectKept, ' +
                'exodraMachineKept and exodraMachineKept·twin. Every figure here is a ' +
                'difference between two of those rows and the third is what resolves it, so with ' +
                'one missing there is nothing to print. Re-run without `--only`, or with ' +
                '`--only=exodraDirectKept,exodraMachineKept,exodraMachineKept.twin`.'
        );
        return;
    }

    const f = (x: number): string => x.toFixed(3);
    const f6 = (x: number): string => x.toFixed(6);
    const a = machine.samples;
    const b = twin.samples;
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    for (let i = 0; i < n; i++) diffs[i] = Math.abs(a[i] - b[i]);
    diffs.sort((x, y) => x - y);
    const noise = diffs[Math.floor(diffs.length / 2)];
    const bias = Math.abs(machine.stat.median - twin.stat.median);
    const resolution = Math.max(bias, noise);

    say(
        `machine keep toggle · THE NULL — |exodraMachineKept − ·twin|: BIAS ${f6(bias)} ms, ` +
            `NOISE ${f6(noise)} ms (median of the per-round |a−b|), RESOLUTION ${f6(
                resolution
            )} ms. Two separately declared copies of one program — own declaration, own port numbering, ` +
            'own machine, own schema, own backend — so their true difference is ZERO by construction. ' +
            'THIS IS THE ONLY NULL IN THIS RUN TAKEN AT THE KEPT ROWS’ MAGNITUDE.'
    );

    const gap = machine.stat.median - wire.stat.median;
    const size = Math.abs(gap);
    const terms =
        'The gap holds TWO NAMED TERMS and this run does not split them: the machine’s DOOR (a ' +
        'call to what `m.transition` handed back, which for an undecorated machine is the ' +
        'author’s own function returned unchanged, so it is a plain call and the `c.set` inside ' +
        'it) and ONE PROPERTY STORE into the cache, which is the machine panel REMEMBERING the ' +
        'text it shows. `exodraDirectKept` does not store it at all, so it is doing the smaller job.';
    if (size <= resolution) {
        say(
            `machine keep toggle · UNRESOLVED — |exodraMachineKept − exodraDirectKept| = ` +
                `${f(size)} ms, inside the ${f6(resolution)} ms floor above. This run ORDERS the ` +
                `two spellings and does not measure a distance between them. ${terms}`
        );
        return;
    }
    say(
        `machine keep toggle · SEPARATED — |exodraMachineKept − exodraDirectKept| = ` +
            `${f(size)} ms, ${(size / resolution).toFixed(1)}× the ${f6(
                resolution
            )} ms floor above. ${terms}`
    );
}
