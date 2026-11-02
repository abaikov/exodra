import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
// DIAGNOSTIC — DOES A WIRE CARE THAT EACH INSTANCE CREATES 1, 4 OR 16 FUNCTIONS?
//
// THE FREE VARIABLE IS HANDLERS PER INSTANCE. The ladder holds THE INSTANCE COUNT STILL — 32
// components at every rung, so 32 declarations, 32 schemas walked, 32 connectors, 32 teardown
// scopes, 32 of every fixed per-instance cost the library has — and moves only how many handlers one
// instance declares: 1, then 4, then 16. So across the ladder the WIRE arm's closures per instance
// go 1 → 4 → 16 while the MACHINE arm's stay at zero, which is the one thing this axis is for.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THIS SHAPE COSTS, SAID BEFORE ANY NUMBER IS READ ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// HOLDING THE INSTANCES STILL MEANS THE SCENE GROWS. At n1 a scene is 32 buttons, 32 outputs and
// 96 elements; at n16 it is 512 buttons, 512 outputs and 1056 elements. TOTAL HANDLERS, TOTAL
// BUTTONS AND TOTAL DOM ALL GROW WITH THE RUNG, and that is unavoidable the moment handlers-per-
// instance is the variable rather than a regrouping of a fixed total.
//
// SO THE RUNGS ARE NOT COMPARABLE TO EACH OTHER IN ABSOLUTE TERMS. `wire·n16` mounting more
// milliseconds than `wire·n1` says nothing whatever: it built eleven times the elements. NO ROW ON
// THIS PAGE MAY BE READ ACROSS RUNGS. A previous version of this file held 256 handlers constant
// and moved the grouping, which made the rungs comparable and cancelled the free variable — every
// rung allocated the same 256 closures — so it answered a question nobody asked.
//
// WHAT SURVIVES IS THE COMPARISON WITHIN A RUNG: `wire` against `machine` against `floor` against
// `driver`, all four built out of the SAME scene, at that rung. And what the ladder is for is the
// SHAPE OF THE `wire − machine` GAP ACROSS RUNGS — a difference of two rows that were built from
// identical scenes at each rung, so the scene's growth is inside both sides of it and cancels.
// A single row's movement from n1 to n16 is scene size. The GAP's movement is the finding.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHY THIS AXIS EXISTS, AND WHY IT WAS REFUSED THE FIRST TIME IT WAS ORDERED ──────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// IT WAS ORDERED ON A CLAIM THAT WAS FALSE WHEN IT WAS MADE: that a machine allocates zero closures
// per instance for its handlers. It did not. The machine's wire built one closure per declared
// `m.on` per instance, with the author's handler taken into a `const` inside the loop body and
// captured, so the instance also paid a context per iteration. An agent read the lines and refused
// to build the axis, and the refusal was the right answer: at that shape both arms allocate N
// closures per instance and the free variable moves them together.
//
// IT IS TRUE NOW, AND HERE ARE THE LINES IT IS TRUE BY — read before this file was written, not
// taken on report:
//
//   `core/src/machine/exo-machine.ts` — `done()` builds its ROUTERS, ONE closure per declared
//        `m.on`, PER COMPONENT, at module load: `for (at) { const run = handlers[at];
//        routers.push((event, enode) => run(enode as TWiring, event)); }`.
//   `core/src/machine/exo-machine.ts` — the WIRE's whole handler loop is
//        `for (at) c.on(handlerPorts[at], routers[at], c)`. Three array loads and a call. No
//        function literal, no `const` captured in the loop body, nothing allocated.
//   `core/src/machine/exo-machine.ts` — and the wire says what that leaves: "a machine that
//        declares handlers and no `mounted` closes over nothing at all."
//   `dom/src/events/exoDirectListenerFor.ts:89-93` — what makes it possible: the shared listener's
//        FUNCTION branch is `(action).call(node, e, carrier[subjectKey])`. The subject travels to a
//        function handler, so a handler no longer has to have been BUILT knowing its instance.
//   `dom/src/dom/exo-event-slot-setter.ts:70-78` — and the FILL is unchanged and identical for
//        both arms: one read, `carrier[handlerKey] = handler`, `carrier[subjectKey] = subject`, and
//        an `addEventListener` only on an element never served before. TWO PROPERTY STORES either
//        way — the count did not move, only what the second store carries.
//
// SO, PER DECLARED `m.on`, PER INSTANCE: closures 1 → 0, contexts 1 → 0, property stores 2 → 2.
// That is the change this axis is built on, and it is the only reason the two arms can now move
// differently as the free variable moves.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE THREE PARTICIPANTS, AND WHAT EACH ONE ALLOCATES PER INSTANCE ────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// All three build byte-identical DOM, respond to the same clicks with the same text, and differ in
// exactly one thing: where the handler and its state live.
//
//   `floor·nN`     NO LIBRARY. One prototype parsed at module load, 32 clones, a written-out
//                  sibling walk per clone, N `addEventListener` calls, and N HANDLER CLOSURES
//                  written out as literals in one scope — so per group: N function objects and ONE
//                  context holding the N state variables. Its handler is `v = STEPk(v); t.data =
//                  LABELS[v]` — one context slot, one call, one Text mutation, which is CHEAPER
//                  than the framework's `setters[i](nodes[elem[i]], value)`. That is what a floor
//                  is for.
//
//                  IT IS THE CONTROL FOR WHETHER THIS IS ABOUT CLOSURES AT ALL. It allocates the
//                  same N closures per group that the wire allocates per instance, and it has no
//                  component boundary, no schema, no connector and no instance object. So
//                  `floor − machine` counts the same N closures per instance that `wire − machine`
//                  counts, with none of Exodra under it — and the two gaps are compared as gaps,
//                  never as rows. If `wire − machine` grows across the ladder and `floor − machine`
//                  grows with it, the growth is closures; if `floor − machine` is flat while
//                  `wire − machine` grows, the growth is Exodra's per-handler cost and not the
//                  closure count.
//
//   `wire·nN`      @exodra/dom AS MOST PAGES ARE WRITTEN: `c.fillDoors()` taken once, state in N
//                  closure variables of the wire's own scope, and N HANDLER CLOSURES written out as
//                  literals, each attached to its own event port. Per instance: N function objects
//                  and ONE context (the wire body is one scope, so the N literals share it).
//
//   `machine·nN`   THE IMPERATIVE MACHINE. N handlers declared ONCE PER COMPONENT at module load
//                  through `m.on`, so they reach the instance through `done()`'s router and the
//                  subject slot. State is the CACHE — `createExoMachine(schema, { createInitialState: () => ({ v0: 0, … }) })`, ONE
//                  object per instance holding the N values under their own names, read with
//                  `c.readState(K)` and written with an ordinary property store. Ports are
//                  written with `c.text(port, value)`. Per instance: a ONE-SLOT
//                  state table (the cache is the only slot — this component declares no
//                  field at all), and the cache object. ZERO function objects and zero contexts.
//
//   `driver·nN`    THE INSTRUMENT'S OWN COST, and not a participant. The identical DOM, cloned and
//                  appended, WITH NO HANDLER ANYWHERE. Its click region constructs the same
//                  `MouseEvent`s and calls the same `dispatchEvent` on the same buttons, and then
//                  nothing happens. Its MOUNT region is the tree and nothing else — which is what
//                  prices the scene's growth across the ladder, and the reason a `x − driver`
//                  column exists at every rung.
//
// ═══ WHY THE STATE IS IN THE CACHE AND NOT IN FIELDS, WHICH IS A RULE AND NOT A PREFERENCE ═══
//
// A field earns its address, its bit in the pending word and its row in the mark table BY BEING
// READ by a derivation, a fill or an effect. These handlers declare none of the three — they write
// their port directly — so every field they declared would ride along on machinery it can never
// use. `exo-machine.ts`'s `done()` refuses exactly that shape in a component that DOES declare
// work, and names the cache as what it should have been. This component declares no work, so the
// library would not refuse it; the rule stands above the library, and the cache is also the cheaper
// shape here: ONE object per instance under the author's own names against N numbered slots plus a
// handle call per read and per write.
//
// NO TEARDOWN IS DECLARED, and that is a decision rather than an omission. Nothing here subscribes
// to anything: a listener is owned by its node and dies with it
// (`exo-event-slot-setter.ts:41-49`). Had one been wanted, `m.effect([], …)` is legal and reads
// what it needs out of the cache — the `mask === 0` refusal is in the DERIVATION loop only, and the
// effect loop says so in as many words (`todo-name-compileExoMachine.ts`, PASS TWO: "NO
// `mask === 0` REFUSAL HERE, and that absence is the whole of the empty dependency list").
//
// NO `exoTransition` WRAPS THESE HANDLERS EITHER, and this one is worth overturning if you disagree
// with it. `exo-machine.ts:98-103` states the case: nothing here wakes, so nothing has to be
// committed, and a transition would put `apply`, the batch-depth test, the settler and the commit's
// test of the pending word on a path that has no field to commit. It would be a CONSTANT addend on
// the machine arm at every rung — it would move the wire↔machine difference without changing its
// SHAPE across the ladder, which is what this axis is asked for. The cheapest correct machine is
// what is measured.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HOW THE HANDLERS ARE MADE DISTINCT, AND WHY IT MATTERS ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// N COPIES OF ONE FUNCTION WOULD HAVE RIGGED BOTH TABLES. The same function object filled into N
// ports allocates nothing per port at all — and `exo-event-slot-setter.ts:78` would not even
// register the repeat. A LOOP producing N closures of ONE source body is better and still not
// enough: every one of them shares a `SharedFunctionInfo` and a compiled body, so the shared
// listener's call site stays monomorphic and every inline cache inside the handler is one cache,
// warmed 256 times. The question is a component with sixteen DIFFERENT buttons.
//
// SO EVERY HANDLER IN THIS FILE IS ITS OWN SOURCE. Sixteen distinct literals per arm per rung,
// written out — not generated, not a factory, not an array of one closure. Each one:
//
//   * stands at its OWN SOURCE POSITION, so it has its own `SharedFunctionInfo` and its own inline
//     caches, and a dispatch site that sees several of them is polymorphic exactly as a real
//     component's is;
//   * owns its OWN STATE VARIABLE (`v0` … `v15`, or the cache's `v0` … `v15`);
//   * writes its OWN PORT (`out[k]`), so no two handlers touch the same node;
//   * calls its OWN ARITHMETIC (`STEP0` … `STEP15`, sixteen different functions — additions,
//     multiplications and exclusive-ors, not one function with sixteen constants).
//
// WHAT IS DELIBERATELY SHARED, AND WHY: the sixteen `STEP` functions and the `LABELS` table are ONE
// declaration for the whole file, used by the floor, the wire, the machine and both twins. That is
// `op-click-floor`'s rule for its `label` — one function object, one set of inline caches, warmed
// equally by every arm — so a difference between two rows can never be a difference of arithmetic.
//
// THE POLYMORPHISM PROFILE THEREFORE CHANGES WITH THE RUNG, and it changes IDENTICALLY FOR ALL
// THREE ARMS. At `n1` a dispatch site sees ONE handler body; at `n16` it sees sixteen, which is
// past V8's polymorphic limit. That is not a confound between arms — it is the same movement in
// each — but it is one more reason no row on this page may be read across rungs.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE LADDER: 32 INSTANCES HELD STILL, 1 / 4 / 16 HANDLERS EACH ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT IS HELD CONSTANT, and it is the whole point of the shape:
//
//   * 32 INSTANCES at every rung, so 32 COMPONENTS MOUNTED, 32 `render` calls, 32 connectors,
//     32 instance objects, 32 teardown scopes, 32 clones.
//   * The dispatches inside one click scenario — 4096 at every rung, so the µs-per-click figures
//     are taken over regions of the same length.
//   * The sixteen `STEP` arithmetics and the `LABELS` table, one declaration for the whole file.
//
// WHAT GROWS WITH THE RUNG, and is therefore what the axis moves:
//
//   * HANDLERS PER INSTANCE: 1 → 4 → 16.
//   * CLOSURES PER INSTANCE ON THE WIRE ARM: 1 → 4 → 16, against 0 → 0 → 0 on the machine arm.
//   * A BUTTON AND AN OUTPUT PER HANDLER: 32 → 128 → 512 of each; 96 → 288 → 1056 elements in a
//     scene; 32 → 128 → 512 handlers in a scene.
//
// AND THEREFORE WHAT CANNOT BE COMPARED: any single row against itself at another rung. `driver·nN`
// is the row that says so out loud — it builds that rung's exact tree with no handler and no
// library, so it IS the scene's growth, printed. `x − driver` at a rung is that rung's
// handler-and-library cost with the tree taken out of both sides, and it is still a within-rung
// quantity.
//
// WHY 32 INSTANCES AND NOT 16 OR 256. It buys no resolution: at a fixed budget of live elements per
// timed region, the number of scenes that fit falls exactly as fast as the instance count raises
// the gap, so gap ÷ resolution is INVARIANT in the instance count. What the choice does buy is the
// two things that are not invariant — a region long enough to clear the clock at the cheap end of
// the ladder (n1 is 96 elements a scene), and a byte gate that stays affordable at the expensive
// end, since the gate serialises the whole scene after every one of its buttons and that cost grows
// as (instances × handlers-per-instance)². 32 is the largest count whose n16 gate stays inside the
// cost the previous shape of this axis already paid.
//
// IT STOPS AT 16 BECAUSE DISTINCTNESS IS HAND-WRITTEN SOURCE. A rung of 64 needs 64 distinct
// handler bodies in each of six arms — 384 of them — and a file nobody will ever check is a file
// whose gates are decoration. Sixteen distinct bodies per arm is what this file can carry and be
// read. THE 64 RUNG IS THEREFORE UNMEASURED — named here so that it is an omission and not a gap in
// the reader's attention — and if the shape below is monotone, extending the ladder is the next
// thing to do and not something this run can be quoted for.
//
// THREE POINTS, TIMES FOUR PER STEP, A SPAN OF SIXTEEN: the minimum that can tell a SHAPE (flat,
// monotone, saturating) from a single difference.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── MOUNT AND UPDATE ARE SEPARATE TABLES, BECAUSE THEY ARE SEPARATE QUESTIONS ───────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// CREATING a closure is a MOUNT cost. CALLING it is an UPDATE cost. A table that mixed them would
// answer neither.
//
//   MOUNT [ms per SCENE] — the timed region builds whole scenes: 32 components, 32×N buttons,
//   32×N outputs, 32×N handler fills. PER SCENE, and a scene is a different size at every rung, so
//   the unit is comparable only inside a rung. A per-handler or per-instance normalisation would
//   have been worse, not better: it would have LOOKED comparable across rungs while dividing two
//   different jobs by two different denominators.
//
//   HOW MANY SCENES ONE REGION HOLDS IS SET PER RUNG, from a budget of live elements rather than a
//   fixed count, so that every rung's region holds about the same amount of document (see
//   `MOUNT_LIVE_ELEMENTS`). A fixed scene count would have made the n16 region eleven times the
//   n1 region's memory and eleven times its coarseness in per-scene units.
//
//   CLICK [µs per click] — the scene is mounted UNTIMED, then its buttons are clicked in rotation
//   until 4096 dispatches have been made, at every rung. Per click, because a click is the same
//   thing at every rung, and 4096 at every rung because a region of a constant length is the only
//   way the three rungs' click resolutions come out alike.
//
// WHAT ONE CLICK IS: `button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable:
// true }))`, and everything `op-click-floor`'s header says about that instrument applies here
// unchanged. `isTrusted` is `false`; there is no default action, no activation behaviour, no focus
// change, no selection, no hit testing, no `pointerdown`/`mouseup` around it; nothing after the
// handler returns (style, layout, paint) is inside the region; and the rate is machine rate, not
// human rate, so every cache is hot. `driver·nN` is a ROW and not a footnote because it is a COMMON
// ADDEND: it sits inside every click region, inflates every row equally, and therefore makes every
// RAW RATIO SMALLER than the truth.
//
// AND THE HEADLINE IS A DIFFERENCE, NOT A RATIO, FOR EXACTLY THAT REASON. `wire − machine` and
// `wire − floor` contain the driver on both sides, so it cancels exactly and no correction is
// applied to them. Ratios are printed raw and again with the driver subtracted, and the corrected
// ratio is a quotient of differences of small numbers — stated as such where it is printed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE NULLS, AND HOW EACH GAP IS JUDGED ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// EVERY PARTICIPANT WHOSE GAPS ARE PUBLISHED HAS ITS OWN TWIN: `floor·nN·twin`, `wire·nN·twin`,
// `machine·nN·twin` — a second, independently declared copy with its own declaration, its own
// schema and prototype, its own wire or machine, its own sixteen handler bodies. Its true
// difference from its original is ZERO by construction, so what the run measures between the two is
// what this instrument returns when there is nothing to find.
//
// A GAP IS JUDGED AGAINST THE NULLS OF ITS OWN TWO ROWS, NEVER AGAINST THE TABLE'S MAXIMUM. The
// resolution for `wire·n4 − machine·n4` is `max(resolution(wire·n4), resolution(machine·n4))` and
// no other row enters it. One noisy participant elsewhere in the table cannot blind this
// comparison, which is the defect this rule exists to prevent.
//
// THE PRINTED `RESOLUTION FLOOR` LINE IS THE COARSEST OF THE BLOCK and is there for the recorder
// and for a reader who wants one number. It is NOT what any verdict below uses.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT A MOUNT RESOLUTION CAN BE, AS ARITHMETIC RATHER THAN AS A HOPE ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A REGION'S LENGTH IS READ TO THE CLOCK'S QUANTUM AND DIVIDED BY THE SCENES IN IT, so every value
// this table can produce is a multiple of `quantum ÷ reps`. A median is always one of the observed
// values, so it is a multiple too, and a difference of two medians is a multiple of that same step.
// THEREFORE THE SMALLEST NON-ZERO MOUNT NULL THIS AXIS CAN EVER PRINT IS EXACTLY ONE STEP, and
// MORE ROUNDS DO NOT MOVE IT — rounds buy stability, `batch` buys resolution, and confusing the two
// is what makes a run say "raise `rounds`" forever.
//
//     resolution ≈ quantum ÷ reps          reps = (MOUNT_LIVE_ELEMENTS ÷ elements per scene) × batch
//
// So to resolve a gap `G` with the four-to-one margin the refusals below demand:
//
//     batch ≥ 4 × quantum × (elements per scene) ÷ (G × MOUNT_LIVE_ELEMENTS)
//
// and the memory that costs is `MOUNT_LIVE_ELEMENTS × batch` elements alive at once, which is the
// wall this axis actually runs into. The run prints that arithmetic, per rung, with the batch it
// implies — a refusal that says "raise the batch" without saying TO WHAT has told the reader
// nothing they did not already know.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE ORDER BALANCE, WHICH IS HERE BECAUSE THE NULLS CAUGHT SOMETHING ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE PREVIOUS SHAPE OF THIS FILE ROTATED ITS PHASES AND ONLY ROTATED THEM. `phases[(k + shift) %
// len]` walks the SAME CYCLE from a different starting point, so the cyclic order never changed and
// EVERY TWIN RAN IMMEDIATELY AFTER ITS SUBJECT, in every round but the one per cycle that wrapped
// between them. A null taken like that measures the two declarations AND the fact that one of them
// always follows the other.
//
// AND ITS WIRE NULLS SAID SO. On a `rounds 100, batch 8` run the mount nulls were
// `floor 0.001563 / machine 0.001563 / wire 0.037500` at n1 — one step for two arms and
// TWENTY-FOUR for the third, falling with the wire's allocation volume across the ladder
// (0.037500 → 0.026562 → 0.009375). Two byte-identical declarations do not diverge by 15% of a
// region; a region that allocates more than any other in the table, and is always followed by its
// own twin, plausibly does.
//
// SO THE ROTATION NOW ALTERNATES DIRECTION: even rounds walk the cycle forwards, odd rounds walk it
// backwards. Every adjacency in the table is therefore ordered both ways equally often, and the
// null is REPORTED SPLIT BY WHICH OF THE PAIR RAN FIRST:
//
//   Δ|a first   the median per-round `a − b` over the rounds where `a` ran before `b`
//   Δ|b first   the same over the rounds where `b` ran before `a`
//   order       half their difference — the size of the ordering effect
//   intrinsic   half their sum — what is left of the pair once the ordering is balanced out
//
// AND THAT SPLIT IS THE DIAGNOSIS, made by the instrument instead of by an argument: an ordering
// effect FLIPS SIGN with the order, so `intrinsic` collapses and `order` carries the number; two
// declarations that genuinely differ keep their sign in both orders, so `intrinsic` carries it and
// `order` collapses. IF `intrinsic` IS LARGE ON THE WIRE PAIRS, THE WIRE TWIN IS NOT A NULL AND NO
// WIRE FIGURE ON THIS PAGE MAY BE QUOTED — the run says exactly that, by name, at the end.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE GATES, IN THE ORDER THEY RUN, AND NOTHING IS TIMED UNTIL ALL OF THEM HAVE PASSED ────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//   1. THE PROTOTYPES, PRINTED. Twelve of them — `@exodra/dom`'s compiled prototype for each of the
//      six schemas and this file's six parsed ones — each against its rung's reference. Reported
//      and not enforced; the gates below are what throw. It prints FIRST because a report standing
//      behind a throwing gate never prints at all (`keystroke-floor`'s lesson).
//
//   2. THE PREMISE, PROVED OFF THE ELEMENTS. The header above cites SOURCE lines and the run loads
//      a BUILT `dist`. If that dist predates the router change, the machine still allocates one
//      closure per instance, both arms move together, and the ladder measures nothing while
//      looking exactly as it would if it had. So two instances of one machine component are
//      mounted and their buttons' own slots are read: the two must hold THE SAME function object
//      (one router per handler per COMPONENT) and DIFFERENT subjects (the instance travelling as
//      the subject), and two instances of one WIRE component must hold DIFFERENT function objects.
//      A citation is not a measurement. See `gatePremise`.
//
//   3. BYTE-IDENTICAL MARKUP, PER RUNG, STEPPED. Every program at a rung is mounted, checked
//      against the reference as mounted — the driver included — and then every one of that rung's
//      buttons (32, 128, 512) is clicked with every program compared after EVERY click. This is the
//      cost that caps the instance count: it serialises a whole scene per program per click, so it
//      grows as the square of the scene. Markup is enough here and
//      that is a fact about this scene rather than a shortcut: everything a handler in this file
//      writes is TEXT, and text serialises. `op-click-floor` needed a second half to its snapshot
//      because its op wrote `input.value`, a PROPERTY, which does not. It is STEPPED because an
//      end-state comparison passes a program that did nothing whenever the sequence returns to
//      where it started (`update-floor`'s lesson).
//
//   4. THE CLOCK, AFTER THE FACT. Every region's observed length against the observed quantum,
//      with the batch that would clear it printed by name.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN, WITH NO DIRECTION BETWEEN THE ARMS ──────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// This is JUDGEMENT plus citations of code. NOTHING BELOW WAS MEASURED BEFORE IT WAS WRITTEN — the
// file was never run by its author. Every falsifier is printed mechanically at the end so that
// nobody, including its author, gets to choose which one counted.
//
// NO PREDICTION NAMES A WINNER BETWEEN `wire` AND `machine` AT ANY RUNG. Only the SHAPE of the gap
// is predicted, and a shape is a statement about a DIFFERENCE OF DIFFERENCES — which is the only
// quantity on this page that survives the scene growing with the rung.
//
//   P1. THE MOUNT GAP |wire − machine| GROWS WITH THE RUNG: n16's differs from n1's by more than
//       the coarser of those two rungs' own resolutions. MECHANISM, counted off the two arms and
//       not measured: per instance the wire allocates N function objects and ONE context of N
//       slots; the machine allocates NO function object and NO context, and its per-instance
//       objects (the instance, a one-slot values array, one cache object of N fields) count N only
//       as FIELDS OF ONE OBJECT. So the wire's per-instance term carries a factor of N that the
//       machine's does not, and 32 instances multiply whatever that is by 32 at every rung
//       identically.
//       (a) FLAT WITHIN RESOLUTION AT ALL THREE RUNGS falsifies it: allocating sixteen function
//       objects per instance costs no more than allocating one plus a wider object, and the closure
//       count is not what separates the two forms at a mount.
//
//   P2. THE MOUNT GAP FIRST CLEARS ITS OWN RUNG'S RESOLUTION AT `n16`, AND MAY NEVER CLEAR AT `n1`.
//       MECHANISM: at n1 the wire allocates one function object and a one-slot context while the
//       machine allocates a one-field cache object and a one-slot array — two allocations against
//       two, of the same order — so the predicted difference there is not small, it is ABOUT ZERO,
//       and no batch resolves zero. At n16 it is sixteen function objects against none.
//       (b) IF IT CLEARS AT `n1` AND NOT AT `n16`, what separates the two forms is a per-instance
//       CONSTANT and has nothing to do with how many handlers an instance has — which would make
//       this axis's whole framing wrong and would be the most interesting line it could print.
//
//   P3. THE CLICK GAP |wire − machine| PER CLICK IS FLAT ACROSS THE LADDER, within each rung's own
//       resolution. MECHANISM: per dispatch the wire runs the shared listener, one closure call,
//       one context-slot read, one `STEP` and one `ports.set`; the machine runs the shared listener,
//       the router's extra call, one `c.kept` (two loads and a call), one property read,
//       one `STEP` and one `c.port`. NEITHER TERM COUNTS N. Nothing in either path is a function of
//       how many handlers the instance has.
//       (c) IF IT MOVES WITH N, what moved is the polymorphism of the dispatch site — one handler
//       body at `n1`, sixteen at `n16` — which both arms carry and which this axis cannot separate
//       from the arms themselves.
//
//   P4. THE `floor − machine` GAP GROWS ACROSS THE LADDER IN THE SAME DIRECTION AS `wire − machine`,
//       past the coarser of the resolutions involved. MECHANISM: the floor allocates the same N
//       function objects and the same one context per group that the wire allocates per instance,
//       with no library under it — so it counts the same closures and nothing else.
//       IT IS COMPARED AS A GAP AND NOT AS A ROW on purpose: the floor's own row grows across the
//       ladder because the scene does, which would be true of a program that allocated nothing.
//       (d) IF `wire − machine` GROWS WHERE `floor − machine` DOES NOT, the growth is Exodra's
//       per-handler cost and not the closure count, and P1's mechanism is wrong even if P1 holds.
//
//   P5. `driver` IS MORE THAN A THIRD OF EVERY CLICK ROW. MECHANISM: an event construction and a
//       bubbling `dispatchEvent` are crossings into Blink, against a handful of JS loads and one
//       Text mutation; `keystroke-floor` measured the same instrument at 74.6% of its floor (A
//       CITATION from that axis, not measured here).
//       (e) UNDER A FIFTH falsifies it: the JS is the cost and the raw ratios need no correction.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THIS AXIS DOES NOT MEASURE ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// IT VARIES HANDLERS PER INSTANCE AND HOLDS THE INSTANCE COUNT FIXED. So it says NOTHING about:
//
//  * ANY ROW AGAINST ITSELF AT ANOTHER RUNG. The scene grows with the rung — 96, 288, 1056 elements
//    — so every row grows with it and none of that movement is about handlers. The comparisons this
//    axis publishes are WITHIN a rung, plus the movement of the wire↔machine and floor↔machine GAPS
//    across rungs, which are differences of two rows built from the same scene.
//  * TOTAL HANDLERS AT A FIXED SCENE SIZE. The previous shape of this file measured that (256
//    handlers regrouped) and it is a different question with a different answer; nothing from this
//    run may be quoted for it.
//
//  * STATE WIDTH. Every handler owns exactly ONE number. A component whose handlers share a wide
//    state, or whose state is strings, objects or doubles, is not measured — and a `PACKED_ELEMENTS`
//    array holding a double allocates a HeapNumber per write where an in-object slot does not.
//  * DERIVATIONS. This machine declares NO `m.derive`, no `m.fill` and no `m.effect`, so the
//    commit, the mark word, the inversion, the wake chains and the effect runner are never on any
//    path here. Nothing in this file prices the DECLARATIVE machine, and no figure from it may be
//    quoted for one.
//  * WHAT A HANDLER DOES. One arithmetic call and one text write. A handler that reads the DOM,
//    calls into user code, or moves a subtree is a different measurement.
//  * TRANSITIONS. No `exoTransition` is on any path; see the header above for why and for what it
//    would have added.
//  * THE SHARED-HANDLER FORM AND DELEGATION. A module-level function plus a per-row subject, and
//    `createExoDelegatedEvents`, are `op-click-floor`'s subject and appear nowhere here.
//  * THE 64-HANDLER RUNG, teardown, memory, hydration, and any backend but the DOM.
//  * A REAL CLICK. Every event is synthetic; see the driver's limits above.
//  * THE FLOOR IS NOT MEASURED OUT OF A BUILT PACKAGE. `@exodra/core` and `@exodra/dom` resolve to
//    their tsup `dist`; the floor is in this file and goes through the dev server's esbuild. One
//    transpiler against another, and it is the one difference between these rows that is not a
//    program. `mount-floor` carries the same asymmetry as its caveat A.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HOW TO RUN IT ───────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- handler-count 100 4
//
// AND THE 4 IS ARITHMETIC, NOT A GUESS. The mount resolution is `quantum ÷ reps` and nothing else
// (see THE ARITHMETIC above), the clock quantum this suite observes is 0.100 ms, and `reps` at a
// rung is `(24576 ÷ elements per scene) × batch`. The gaps this axis has to resolve, counted off
// the two arms at ~15 ns a function object and ~25 ns a context or small object and stated as
// JUDGEMENT rather than as measurement:
//
//   rung   elements/scene   gap it must resolve      reps at batch 4   resolution   ratio
//   n1              96      ≈ 0.0002 ms/scene              1024        0.000098     0.49 ✖
//   n4             288      ≈ 0.0014 ms/scene               340        0.000294     0.21 ✔
//   n16           1056      ≈ 0.0069 ms/scene                92        0.001087     0.16 ✔
//
// FOUR IS WHERE n4 AND n16 CLEAR THE FOUR-TO-ONE MARGIN the refusals below demand, and it holds
// ~98 000 elements alive per timed region — twice what the previous shape of this axis held at the
// batch it was last run at, and well inside what a single-axis run has survived.
//
// n1 DOES NOT CLEAR AT FOUR AND IS NOT EXPECTED TO CLEAR AT ALL. P2 predicts its true gap is about
// ZERO — one function object and a one-slot context against a one-field object and a one-slot array
// — and no batch resolves zero. Were it as large as the 0.0002 ms/scene above, it would take batch
// 8 and ~196 000 live elements. THAT IS THE SAME BATCH the fallback needs: if n4 comes back inside
// its own resolution, batch 8 is the next step, and batch 16 (~393 000 live elements) is where this
// shape stops being runnable rather than merely slow.
//
// ONE AXIS AT A TIME — memory pressure has crashed multi-axis runs in this suite. The third
// positional is the BATCH and it is HONOURED: it multiplies every phase's repetition factor, which
// is what the clock refusal asks for by name. `@exodra/*` resolve to their BUILT dists, so
// `npm run build:all` at the repository root has to have run or every framework row is old code.
import {
    createExoMachine,
    composeExoMachine,
    withExoHandlers,
    createExoSchema,
    type TExoEventPort,
    type TExoPort,
    type TExoCursorDeclaration,
    type TExoTextPort,
} from '@exodra/core';
import {
    EXO_DIRECT_PACK_ID,
    ExoDomBackend,
    exoDomSchemaOf,
    exoEventSlotsFor,
    withExoCompiler,
} from '@exodra/dom';
import type { TExoDomNode, TExoDomMachine } from '@exodra/dom';
import { markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';
import type { TExoMachineInitialState } from '@exodra/core';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE CENSUS. One place, so no two programs and no two rungs can drift by a constant.
// ---------------------------------------------------------------------------------------

/**
 * INSTANCES IN ONE SCENE — CONSTANT AT EVERY RUNG, and the whole reason this ladder answers the
 * question it is asked. See the header for why it is 32 and why no other value would have bought
 * resolution.
 */
const INSTANCES = 32;

/** HANDLERS PER INSTANCE — THE FREE VARIABLE. See the header on why it stops at 16. */
const ALL_RUNGS: readonly number[] = [1, 4, 16];

/**
 * ONE RUNG INSTEAD OF THREE — the third positional argument, and it exists because the axis's own
 * refusals name a different batch for every rung.
 *
 * A run that wants the top rung resolved needs a region five times heavier, and paying that for the
 * two rungs whose refusals say they cannot resolve at that batch is two thirds of the wall clock
 * spent on numbers the axis will decline to publish. `node scripts/run-one-axis.js handler-count
 * 100 4 16` runs the n16 rows and nothing else.
 *
 * WHAT IT COSTS, AND IT IS NOT NOTHING: `THE SHAPE` — the only section allowed to cross rungs — has
 * nothing to cross, and P1/P3/P4 are claims about movement between rungs. A one-rung run therefore
 * prints the block and the nulls and says the ladder claims are UNJUDGED, rather than judging them
 * off one point. That is written where the section would have been.
 */
function rungsFor(only: number | undefined): readonly number[] {
    if (only === undefined) return ALL_RUNGS;
    // A TOKEN THAT MATCHES NOTHING MUST NOT PRODUCE A RUN — the same rule the harness applies to
    // `--only`. A mistyped rung that silently fell back to all three would cost half an hour and
    // look like a deliberate full run.
    if (!ALL_RUNGS.includes(only)) {
        throw new Error(
            `handler-count: rung ${only} does not exist — the rungs are ${ALL_RUNGS.join(', ')}`
        );
    }
    return [only];
}

/** Handlers in one scene at a rung: 32, 128, 512. GROWS WITH THE RUNG. */
function handlersAt(n: number): number {
    return INSTANCES * n;
}

/** Elements in one scene at a rung: 96, 288, 1056 — one wrapper, one button and one span each. */
function elementsAt(n: number): number {
    return INSTANCES * (1 + 2 * n);
}

/**
 * DISPATCHES INSIDE ONE CLICK SCENARIO — the same number at every rung, so the three rungs' click
 * regions are the same length and their resolutions come out alike. The buttons are clicked in
 * rotation, so at n1 each of 32 buttons is hit 128 times and at n16 each of 512 is hit 8 times.
 */
const DISPATCHES = 4096;

/**
 * THE LIVE-ELEMENT BUDGET FOR ONE MOUNT REGION, which is what sets how many scenes it builds.
 *
 * A mount region builds every one of its scenes into the document and tears none of them down until
 * after the clock has stopped, so the region's peak document is `reps × elements per scene`. Fixing
 * that PRODUCT rather than `reps` is what keeps the n16 region from holding eleven times the n1
 * region's document — and, because resolution is `quantum ÷ reps`, what keeps the three rungs'
 * per-scene resolutions within a factor of the ratio of their scene sizes rather than equal to it.
 */
const MOUNT_LIVE_ELEMENTS = 24576;

/** Scenarios per click region before the batch multiplies them. */
const CLICK_REPS = 4;

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

/**
 * How many scenes one mount region builds at a rung. `batch` is the only knob that moves the mount
 * resolution, because that resolution is exactly `quantum ÷ reps` — see the header's arithmetic.
 */
function mountRepsAt(n: number, batch: number): number {
    return (
        Math.max(1, Math.floor(MOUNT_LIVE_ELEMENTS / elementsAt(n))) *
        Math.max(1, Math.floor(batch))
    );
}

/**
 * THE SIXTEEN VALUES A HANDLER CAN PUT ON THE PAGE — one shared table, so no arm can be writing
 * different bytes from another. Every `STEP` below is masked to `& 15`, so every index is in range.
 */
const LABELS = [
    't0',
    't1',
    't2',
    't3',
    't4',
    't5',
    't6',
    't7',
    't8',
    't9',
    'ta',
    'tb',
    'tc',
    'td',
    'te',
    'tf',
];

/**
 * SIXTEEN DIFFERENT ARITHMETICS — one per handler position, shared by the floor, the wire, the
 * machine and both twins.
 *
 * THEY ARE DIFFERENT FUNCTIONS AND NOT ONE FUNCTION WITH SIXTEEN CONSTANTS, because the point of
 * the distinctness rule is that a dispatch site sees several bodies rather than one. They are
 * SHARED ACROSS ARMS for the opposite reason: a difference between two rows must never be a
 * difference of arithmetic. See `op-click-floor`'s `label` for the same decision.
 */
const STEP0 = (v: number): number => (v + 1) & 15;
const STEP1 = (v: number): number => (v + 3) & 15;
const STEP2 = (v: number): number => (v * 3 + 1) & 15;
const STEP3 = (v: number): number => (v ^ 5) & 15;
const STEP4 = (v: number): number => (v + 7) & 15;
const STEP5 = (v: number): number => (v * 5 + 2) & 15;
const STEP6 = (v: number): number => (v ^ 9) & 15;
const STEP7 = (v: number): number => (v + 11) & 15;
const STEP8 = (v: number): number => (v * 7 + 3) & 15;
const STEP9 = (v: number): number => (v ^ 12) & 15;
const STEP10 = (v: number): number => (v + 13) & 15;
const STEP11 = (v: number): number => (v * 9 + 5) & 15;
const STEP12 = (v: number): number => (v ^ 3) & 15;
const STEP13 = (v: number): number => (v + 5) & 15;
const STEP14 = (v: number): number => (v * 11 + 7) & 15;
const STEP15 = (v: number): number => (v ^ 14) & 15;

// ---------------------------------------------------------------------------------------
// THE SCHEMA. One panel: N buttons, each carrying its own `click` event port, and N spans, each
// carrying its own text port. The two are INTERLEAVED — button, output, button, output — so a
// floor's sibling walk is the same two hops per handler at every position.
//
// THE PORTS ARE BUILT IN A LOOP AND THAT IS NOT A DISTINCTNESS PROBLEM: a port is data, not code.
// What has to be distinct is the sixteen HANDLER BODIES, and every one of those is written out.
//
// NOTHING IS PAINTED AT MOUNT. No wire fills an output port, so every span holds the empty Text
// node the schema's placeholder leaves behind (`compileExoDomSchema.ts:1315-1317` empties the
// placeholder character once, at compile, and the clone carries the node). The floor's prototype is
// given the same empty Text node at module load, by hand, for the same reason: a floor with no Text
// node could not write one, and a floor that created one per clone would be paying inside the mount
// region for something the framework gets from its clone.
// ---------------------------------------------------------------------------------------

interface TPanelPorts {
    readonly click: readonly TExoEventPort[];
    readonly out: readonly TExoTextPort[];
}

function makePanelSchema(n: number): TExoCursorDeclaration<TPanelPorts> {
    return createExoSchema<TPanelPorts>((b) => {
        const click: TExoEventPort[] = [];
        const out: TExoTextPort[] = [];
        b.el('div', { class: 'p' }, (panel) => {
            for (let k = 0; k < n; k++) {
                panel.el('button', { class: 'b' }, (btn) => {
                    click.push(btn.eventPort('click'));
                });
                panel.el('span', { class: 'o' }, (sp) => {
                    out.push(sp.textPort());
                });
            }
        });
        return { click, out };
    });
}

/**
 * THE SIX SCHEMA DECLARATIONS — one per (arm family, rung).
 *
 * `A` is the subject family and `B` is the TWIN family. They are separate DECLARATION OBJECTS on
 * purpose: a schema hangs off the machine (`machine.forms`), so `B` compiles its own schema and parses
 * its own prototype, exactly as a genuinely separate participant would. What they SHARE is this
 * factory, which runs once per declaration at module load and is inside no timed region.
 *
 * WITHIN A FAMILY THE WIRE AND THE MACHINE SHARE ONE DECLARATION, which is `op-click-floor`'s rule:
 * one declaration, two wires, so nothing between those two rows is a difference of markup, of
 * schema, of port numbering or of prototype.
 */
const S_A1 = makePanelSchema(1);
const S_A4 = makePanelSchema(4);
const S_A16 = makePanelSchema(16);
const S_B1 = makePanelSchema(1);
const S_B4 = makePanelSchema(4);
const S_B16 = makePanelSchema(16);

const A1C = S_A1.ports.click;
const A1O = S_A1.ports.out;
const A4C = S_A4.ports.click;
const A4O = S_A4.ports.out;
const A16C = S_A16.ports.click;
const A16O = S_A16.ports.out;
const B1C = S_B1.ports.click;
const B1O = S_B1.ports.out;
const B4C = S_B4.ports.click;
const B4O = S_B4.ports.out;
const B16C = S_B16.ports.click;
const B16O = S_B16.ports.out;

/**
 * THE ONE BACKEND, COMPOSED ONCE AT MODULE LOAD — the shipped composition, no packs.
 *
 * ITS IDENTITY IS WHAT KEEPS THE SCHEMA CACHE HITTING: a backend is the cache key, compared by
 * POINTER, so one built inside a scenario would recompile every declaration, markup parse included,
 * per mount. All six declarations render through this one object.
 */
const BACKEND = withExoCompiler(new ExoDomBackend());

// ---------------------------------------------------------------------------------------
// THE WIRE ARM — `c.fillDoors()` once, state in closure variables, N handler closures written out.
//
// SIX FUNCTIONS, ONE PER (FAMILY, RUNG). They cannot be one function with a branch: a branch would
// be N comparisons per instance at every rung, and the instance count varies by rung, so the branch
// would cost a different amount at each rung of the very ladder it was there to serve.
//
// THE N LITERALS SHARE ONE SCOPE, so an instance pays N function objects and ONE context holding
// its N state variables. That is the idiomatic form and the cheap one; a factory per handler would
// have given each closure its own context and would have been a worse wire measured as a better
// one.
// ---------------------------------------------------------------------------------------

const WIRE_A1: TExoMachineInitialState<TExoDomNode> = (c) => {
    const p = c.fillDoors();
    let v0 = 0;
    c.on(A1C[0], () => {
        v0 = STEP0(v0);
        p.text(A1O[0], LABELS[v0]);
    });
};

const WIRE_A4: TExoMachineInitialState<TExoDomNode> = (c) => {
    const p = c.fillDoors();
    let v0 = 0;
    let v1 = 0;
    let v2 = 0;
    let v3 = 0;
    c.on(A4C[0], () => {
        v0 = STEP0(v0);
        p.text(A4O[0], LABELS[v0]);
    });
    c.on(A4C[1], () => {
        v1 = STEP1(v1);
        p.text(A4O[1], LABELS[v1]);
    });
    c.on(A4C[2], () => {
        v2 = STEP2(v2);
        p.text(A4O[2], LABELS[v2]);
    });
    c.on(A4C[3], () => {
        v3 = STEP3(v3);
        p.text(A4O[3], LABELS[v3]);
    });
};

const WIRE_A16: TExoMachineInitialState<TExoDomNode> = (c) => {
    const p = c.fillDoors();
    let v0 = 0;
    let v1 = 0;
    let v2 = 0;
    let v3 = 0;
    let v4 = 0;
    let v5 = 0;
    let v6 = 0;
    let v7 = 0;
    let v8 = 0;
    let v9 = 0;
    let v10 = 0;
    let v11 = 0;
    let v12 = 0;
    let v13 = 0;
    let v14 = 0;
    let v15 = 0;
    c.on(A16C[0], () => {
        v0 = STEP0(v0);
        p.text(A16O[0], LABELS[v0]);
    });
    c.on(A16C[1], () => {
        v1 = STEP1(v1);
        p.text(A16O[1], LABELS[v1]);
    });
    c.on(A16C[2], () => {
        v2 = STEP2(v2);
        p.text(A16O[2], LABELS[v2]);
    });
    c.on(A16C[3], () => {
        v3 = STEP3(v3);
        p.text(A16O[3], LABELS[v3]);
    });
    c.on(A16C[4], () => {
        v4 = STEP4(v4);
        p.text(A16O[4], LABELS[v4]);
    });
    c.on(A16C[5], () => {
        v5 = STEP5(v5);
        p.text(A16O[5], LABELS[v5]);
    });
    c.on(A16C[6], () => {
        v6 = STEP6(v6);
        p.text(A16O[6], LABELS[v6]);
    });
    c.on(A16C[7], () => {
        v7 = STEP7(v7);
        p.text(A16O[7], LABELS[v7]);
    });
    c.on(A16C[8], () => {
        v8 = STEP8(v8);
        p.text(A16O[8], LABELS[v8]);
    });
    c.on(A16C[9], () => {
        v9 = STEP9(v9);
        p.text(A16O[9], LABELS[v9]);
    });
    c.on(A16C[10], () => {
        v10 = STEP10(v10);
        p.text(A16O[10], LABELS[v10]);
    });
    c.on(A16C[11], () => {
        v11 = STEP11(v11);
        p.text(A16O[11], LABELS[v11]);
    });
    c.on(A16C[12], () => {
        v12 = STEP12(v12);
        p.text(A16O[12], LABELS[v12]);
    });
    c.on(A16C[13], () => {
        v13 = STEP13(v13);
        p.text(A16O[13], LABELS[v13]);
    });
    c.on(A16C[14], () => {
        v14 = STEP14(v14);
        p.text(A16O[14], LABELS[v14]);
    });
    c.on(A16C[15], () => {
        v15 = STEP15(v15);
        p.text(A16O[15], LABELS[v15]);
    });
};

// ── THE WIRE'S TWIN. A SECOND, INDEPENDENTLY DECLARED COPY — its own declaration, its own schema
// and prototype, its own function objects, its own inline caches, the identical work on identical
// data. Its true difference from the three above is ZERO by construction. It is duplicated SOURCE
// and not a second call to one function on purpose: calling one function twice would share
// everything V8 learned about it and would measure a null far below the one a real pair of
// programs sits on. ───────────────────────────────────────────────────────────────────────────

const WIRE_B1: TExoMachineInitialState<TExoDomNode> = (c) => {
    const p = c.fillDoors();
    let v0 = 0;
    c.on(B1C[0], () => {
        v0 = STEP0(v0);
        p.text(B1O[0], LABELS[v0]);
    });
};

const WIRE_B4: TExoMachineInitialState<TExoDomNode> = (c) => {
    const p = c.fillDoors();
    let v0 = 0;
    let v1 = 0;
    let v2 = 0;
    let v3 = 0;
    c.on(B4C[0], () => {
        v0 = STEP0(v0);
        p.text(B4O[0], LABELS[v0]);
    });
    c.on(B4C[1], () => {
        v1 = STEP1(v1);
        p.text(B4O[1], LABELS[v1]);
    });
    c.on(B4C[2], () => {
        v2 = STEP2(v2);
        p.text(B4O[2], LABELS[v2]);
    });
    c.on(B4C[3], () => {
        v3 = STEP3(v3);
        p.text(B4O[3], LABELS[v3]);
    });
};

const WIRE_B16: TExoMachineInitialState<TExoDomNode> = (c) => {
    const p = c.fillDoors();
    let v0 = 0;
    let v1 = 0;
    let v2 = 0;
    let v3 = 0;
    let v4 = 0;
    let v5 = 0;
    let v6 = 0;
    let v7 = 0;
    let v8 = 0;
    let v9 = 0;
    let v10 = 0;
    let v11 = 0;
    let v12 = 0;
    let v13 = 0;
    let v14 = 0;
    let v15 = 0;
    c.on(B16C[0], () => {
        v0 = STEP0(v0);
        p.text(B16O[0], LABELS[v0]);
    });
    c.on(B16C[1], () => {
        v1 = STEP1(v1);
        p.text(B16O[1], LABELS[v1]);
    });
    c.on(B16C[2], () => {
        v2 = STEP2(v2);
        p.text(B16O[2], LABELS[v2]);
    });
    c.on(B16C[3], () => {
        v3 = STEP3(v3);
        p.text(B16O[3], LABELS[v3]);
    });
    c.on(B16C[4], () => {
        v4 = STEP4(v4);
        p.text(B16O[4], LABELS[v4]);
    });
    c.on(B16C[5], () => {
        v5 = STEP5(v5);
        p.text(B16O[5], LABELS[v5]);
    });
    c.on(B16C[6], () => {
        v6 = STEP6(v6);
        p.text(B16O[6], LABELS[v6]);
    });
    c.on(B16C[7], () => {
        v7 = STEP7(v7);
        p.text(B16O[7], LABELS[v7]);
    });
    c.on(B16C[8], () => {
        v8 = STEP8(v8);
        p.text(B16O[8], LABELS[v8]);
    });
    c.on(B16C[9], () => {
        v9 = STEP9(v9);
        p.text(B16O[9], LABELS[v9]);
    });
    c.on(B16C[10], () => {
        v10 = STEP10(v10);
        p.text(B16O[10], LABELS[v10]);
    });
    c.on(B16C[11], () => {
        v11 = STEP11(v11);
        p.text(B16O[11], LABELS[v11]);
    });
    c.on(B16C[12], () => {
        v12 = STEP12(v12);
        p.text(B16O[12], LABELS[v12]);
    });
    c.on(B16C[13], () => {
        v13 = STEP13(v13);
        p.text(B16O[13], LABELS[v13]);
    });
    c.on(B16C[14], () => {
        v14 = STEP14(v14);
        p.text(B16O[14], LABELS[v14]);
    });
    c.on(B16C[15], () => {
        v15 = STEP15(v15);
        p.text(B16O[15], LABELS[v15]);
    });
};

const WIRE_A1_COMPONENT: TExoDomMachine = {
    declaration: S_A1,
    forms: [],
    createInitialState: WIRE_A1,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_A4_COMPONENT: TExoDomMachine = {
    declaration: S_A4,
    forms: [],
    createInitialState: WIRE_A4,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_A16_COMPONENT: TExoDomMachine = {
    declaration: S_A16,
    forms: [],
    createInitialState: WIRE_A16,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_B1_COMPONENT: TExoDomMachine = {
    declaration: S_B1,
    forms: [],
    createInitialState: WIRE_B1,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_B4_COMPONENT: TExoDomMachine = {
    declaration: S_B4,
    forms: [],
    createInitialState: WIRE_B4,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_B16_COMPONENT: TExoDomMachine = {
    declaration: S_B16,
    forms: [],
    createInitialState: WIRE_B16,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

// ---------------------------------------------------------------------------------------
// THE MACHINE ARM — N handlers declared ONCE PER COMPONENT, state in the CACHE, ports written
// with `c.set`.
//
// WHAT AN INSTANCE OF ONE OF THESE ALLOCATES, in full: a ONE-SLOT state table (this component
// declares no field, so the cache's slot is the only one) and the cache object the keep's seeder
// returns. THE EXONODE IS NOT AMONG THEM — every participant on this axis is handed one, and it is
// what a machine's handler is now handed too. NO FUNCTION OBJECT AND NO CONTEXT: the wire's handler
// loop is `c.on(handlerPorts[at], routers[at], c)` and the routers are the component's, built once
// at `done()`.
//
// THE HANDLERS ARE MODULE-LEVEL AND DISTINCT — sixteen bodies per family, written out. They are
// declared after the keep because they name it, and they are handed to `m.on` by name rather than
// through an array so that the reader can see there are sixteen of them.
// ---------------------------------------------------------------------------------------

/** The instance a handler is handed — this backend's, because these components render into it. */
type TM = TExoDomNode;

/** The cache's shape at each rung. A type is shared freely: it is nothing at run time. */
interface TKeep1 {
    v0: number;
}
interface TKeep4 {
    v0: number;
    v1: number;
    v2: number;
    v3: number;
}
interface TKeep16 {
    v0: number;
    v1: number;
    v2: number;
    v3: number;
    v4: number;
    v5: number;
    v6: number;
    v7: number;
    v8: number;
    v9: number;
    v10: number;
    v11: number;
    v12: number;
    v13: number;
    v14: number;
    v15: number;
}

const mA1 = createExoMachine<TExoDomNode>(S_A1, { createInitialState: (): TKeep1 => ({ v0: 0 }) });
const MA1_0 = (c: TM): void => {
    const s = c.readState<TKeep1>();
    const v = STEP0(s.v0);
    s.v0 = v;
    c.text(A1O[0], LABELS[v]);
};
const MACHINE_A1 = composeExoMachine(mA1, (m) =>
    withExoHandlers(m, (on) => {
        on(A1C[0], MA1_0);
    })
);

const mA4 = createExoMachine<TExoDomNode>(S_A4, {
    createInitialState: (): TKeep4 => ({ v0: 0, v1: 0, v2: 0, v3: 0 }),
});
const MA4_0 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP0(s.v0);
    s.v0 = v;
    c.text(A4O[0], LABELS[v]);
};
const MA4_1 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP1(s.v1);
    s.v1 = v;
    c.text(A4O[1], LABELS[v]);
};
const MA4_2 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP2(s.v2);
    s.v2 = v;
    c.text(A4O[2], LABELS[v]);
};
const MA4_3 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP3(s.v3);
    s.v3 = v;
    c.text(A4O[3], LABELS[v]);
};
const MACHINE_A4 = composeExoMachine(mA4, (m) =>
    withExoHandlers(m, (on) => {
        on(A4C[0], MA4_0);
        on(A4C[1], MA4_1);
        on(A4C[2], MA4_2);
        on(A4C[3], MA4_3);
    })
);

const mA16 = createExoMachine<TExoDomNode>(S_A16, {
    createInitialState: (): TKeep16 => ({
        v0: 0,
        v1: 0,
        v2: 0,
        v3: 0,
        v4: 0,
        v5: 0,
        v6: 0,
        v7: 0,
        v8: 0,
        v9: 0,
        v10: 0,
        v11: 0,
        v12: 0,
        v13: 0,
        v14: 0,
        v15: 0,
    }),
});
const MA16_0 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP0(s.v0);
    s.v0 = v;
    c.text(A16O[0], LABELS[v]);
};
const MA16_1 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP1(s.v1);
    s.v1 = v;
    c.text(A16O[1], LABELS[v]);
};
const MA16_2 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP2(s.v2);
    s.v2 = v;
    c.text(A16O[2], LABELS[v]);
};
const MA16_3 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP3(s.v3);
    s.v3 = v;
    c.text(A16O[3], LABELS[v]);
};
const MA16_4 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP4(s.v4);
    s.v4 = v;
    c.text(A16O[4], LABELS[v]);
};
const MA16_5 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP5(s.v5);
    s.v5 = v;
    c.text(A16O[5], LABELS[v]);
};
const MA16_6 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP6(s.v6);
    s.v6 = v;
    c.text(A16O[6], LABELS[v]);
};
const MA16_7 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP7(s.v7);
    s.v7 = v;
    c.text(A16O[7], LABELS[v]);
};
const MA16_8 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP8(s.v8);
    s.v8 = v;
    c.text(A16O[8], LABELS[v]);
};
const MA16_9 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP9(s.v9);
    s.v9 = v;
    c.text(A16O[9], LABELS[v]);
};
const MA16_10 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP10(s.v10);
    s.v10 = v;
    c.text(A16O[10], LABELS[v]);
};
const MA16_11 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP11(s.v11);
    s.v11 = v;
    c.text(A16O[11], LABELS[v]);
};
const MA16_12 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP12(s.v12);
    s.v12 = v;
    c.text(A16O[12], LABELS[v]);
};
const MA16_13 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP13(s.v13);
    s.v13 = v;
    c.text(A16O[13], LABELS[v]);
};
const MA16_14 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP14(s.v14);
    s.v14 = v;
    c.text(A16O[14], LABELS[v]);
};
const MA16_15 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP15(s.v15);
    s.v15 = v;
    c.text(A16O[15], LABELS[v]);
};
const MACHINE_A16 = composeExoMachine(mA16, (m) =>
    withExoHandlers(m, (on) => {
        on(A16C[0], MA16_0);
        on(A16C[1], MA16_1);
        on(A16C[2], MA16_2);
        on(A16C[3], MA16_3);
        on(A16C[4], MA16_4);
        on(A16C[5], MA16_5);
        on(A16C[6], MA16_6);
        on(A16C[7], MA16_7);
        on(A16C[8], MA16_8);
        on(A16C[9], MA16_9);
        on(A16C[10], MA16_10);
        on(A16C[11], MA16_11);
        on(A16C[12], MA16_12);
        on(A16C[13], MA16_13);
        on(A16C[14], MA16_14);
        on(A16C[15], MA16_15);
    })
);

// ── THE MACHINE'S TWIN. Its own schema, its own machine, its own keep, its own sixteen bodies.
// True difference from the family above: ZERO. ────────────────────────────────────────────────

const mB1 = createExoMachine<TExoDomNode>(S_B1, { createInitialState: (): TKeep1 => ({ v0: 0 }) });
const MB1_0 = (c: TM): void => {
    const s = c.readState<TKeep1>();
    const v = STEP0(s.v0);
    s.v0 = v;
    c.text(B1O[0], LABELS[v]);
};
const MACHINE_B1 = composeExoMachine(mB1, (m) =>
    withExoHandlers(m, (on) => {
        on(B1C[0], MB1_0);
    })
);

const mB4 = createExoMachine<TExoDomNode>(S_B4, {
    createInitialState: (): TKeep4 => ({ v0: 0, v1: 0, v2: 0, v3: 0 }),
});
const MB4_0 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP0(s.v0);
    s.v0 = v;
    c.text(B4O[0], LABELS[v]);
};
const MB4_1 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP1(s.v1);
    s.v1 = v;
    c.text(B4O[1], LABELS[v]);
};
const MB4_2 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP2(s.v2);
    s.v2 = v;
    c.text(B4O[2], LABELS[v]);
};
const MB4_3 = (c: TM): void => {
    const s = c.readState<TKeep4>();
    const v = STEP3(s.v3);
    s.v3 = v;
    c.text(B4O[3], LABELS[v]);
};
const MACHINE_B4 = composeExoMachine(mB4, (m) =>
    withExoHandlers(m, (on) => {
        on(B4C[0], MB4_0);
        on(B4C[1], MB4_1);
        on(B4C[2], MB4_2);
        on(B4C[3], MB4_3);
    })
);

const mB16 = createExoMachine<TExoDomNode>(S_B16, {
    createInitialState: (): TKeep16 => ({
        v0: 0,
        v1: 0,
        v2: 0,
        v3: 0,
        v4: 0,
        v5: 0,
        v6: 0,
        v7: 0,
        v8: 0,
        v9: 0,
        v10: 0,
        v11: 0,
        v12: 0,
        v13: 0,
        v14: 0,
        v15: 0,
    }),
});
const MB16_0 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP0(s.v0);
    s.v0 = v;
    c.text(B16O[0], LABELS[v]);
};
const MB16_1 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP1(s.v1);
    s.v1 = v;
    c.text(B16O[1], LABELS[v]);
};
const MB16_2 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP2(s.v2);
    s.v2 = v;
    c.text(B16O[2], LABELS[v]);
};
const MB16_3 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP3(s.v3);
    s.v3 = v;
    c.text(B16O[3], LABELS[v]);
};
const MB16_4 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP4(s.v4);
    s.v4 = v;
    c.text(B16O[4], LABELS[v]);
};
const MB16_5 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP5(s.v5);
    s.v5 = v;
    c.text(B16O[5], LABELS[v]);
};
const MB16_6 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP6(s.v6);
    s.v6 = v;
    c.text(B16O[6], LABELS[v]);
};
const MB16_7 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP7(s.v7);
    s.v7 = v;
    c.text(B16O[7], LABELS[v]);
};
const MB16_8 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP8(s.v8);
    s.v8 = v;
    c.text(B16O[8], LABELS[v]);
};
const MB16_9 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP9(s.v9);
    s.v9 = v;
    c.text(B16O[9], LABELS[v]);
};
const MB16_10 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP10(s.v10);
    s.v10 = v;
    c.text(B16O[10], LABELS[v]);
};
const MB16_11 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP11(s.v11);
    s.v11 = v;
    c.text(B16O[11], LABELS[v]);
};
const MB16_12 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP12(s.v12);
    s.v12 = v;
    c.text(B16O[12], LABELS[v]);
};
const MB16_13 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP13(s.v13);
    s.v13 = v;
    c.text(B16O[13], LABELS[v]);
};
const MB16_14 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP14(s.v14);
    s.v14 = v;
    c.text(B16O[14], LABELS[v]);
};
const MB16_15 = (c: TM): void => {
    const s = c.readState<TKeep16>();
    const v = STEP15(s.v15);
    s.v15 = v;
    c.text(B16O[15], LABELS[v]);
};
const MACHINE_B16 = composeExoMachine(mB16, (m) =>
    withExoHandlers(m, (on) => {
        on(B16C[0], MB16_0);
        on(B16C[1], MB16_1);
        on(B16C[2], MB16_2);
        on(B16C[3], MB16_3);
        on(B16C[4], MB16_4);
        on(B16C[5], MB16_5);
        on(B16C[6], MB16_6);
        on(B16C[7], MB16_7);
        on(B16C[8], MB16_8);
        on(B16C[9], MB16_9);
        on(B16C[10], MB16_10);
        on(B16C[11], MB16_11);
        on(B16C[12], MB16_12);
        on(B16C[13], MB16_13);
        on(B16C[14], MB16_14);
        on(B16C[15], MB16_15);
    })
);

// ---------------------------------------------------------------------------------------
// THE FLOOR'S PROTOTYPES. Parsed once at module load out of a `<template>` and LEFT WHERE THE
// PARSER PUT IT — template-contents owner document, which is where `@exodra/dom`'s prototypes live
// since `importNode` was dropped from its compiler. A floor that page-owned its prototype where the
// renderer does not would be handing the renderer free advantage on the mount row.
//
// EACH SPAN IS GIVEN AN EMPTY TEXT NODE, ONCE, HERE. `compileExoDomSchema.ts:1315-1317` puts a
// placeholder character into the markup so the parser makes a Text node, then empties the
// character; the clone therefore carries an empty Text node and the framework's first write is a
// `.data` store into a node it already has. A floor without one could not write text at all, and a
// floor that created one per clone would be paying inside the mount region for something the
// framework gets from the parser. This is the same trick, made explicit.
// ---------------------------------------------------------------------------------------

function panelMarkup(n: number): string {
    let s = '<div class="p">';
    for (let k = 0; k < n; k++) s += '<button class="b"></button><span class="o"></span>';
    return s + '</div>';
}

function protoOf(n: number): Element {
    const t = document.createElement('template');
    t.innerHTML = panelMarkup(n);
    const root = t.content.firstElementChild as Element;
    const spans = root.querySelectorAll('span');
    for (let k = 0; k < spans.length; k++) spans[k].appendChild(document.createTextNode(''));
    return root;
}

/** Six independently parsed prototypes — three for the floor, three for its twin. */
const PROTO_A1 = protoOf(1);
const PROTO_A4 = protoOf(4);
const PROTO_A16 = protoOf(16);
const PROTO_B1 = protoOf(1);
const PROTO_B4 = protoOf(4);
const PROTO_B16 = protoOf(16);

// ---------------------------------------------------------------------------------------
// THE FLOOR. No components, no declaration, no reactivity, no schema, no connector, no library:
// clone, walk, listen, and one `.data` store per click.
//
// THE WALK IS WRITTEN OUT AND NOT LOOPED INTO AN ARRAY, deliberately: an array of node references
// would be two allocations per group that neither exodra arm makes, and reading a node out of it
// would put an array load in the handler that the framework's own write already pays twice. The
// floor holds its nodes in `const`s, which is the cheapest correct thing a hand-written program can
// do — and the handler's write, `t.data = LABELS[v]`, is CHEAPER than the framework's
// `setters[i](nodes[elem[i]], value)`. That is what makes it a floor.
//
// THE STATE IS `let v0 … vN-1` IN THE GROUP'S OWN SCOPE and the handlers are literals in that same
// scope, so a group pays N function objects and ONE context — the wire's shape exactly, with no
// library under it.
// ---------------------------------------------------------------------------------------

/** What a mount hands back: how to take the scene down again, and nothing else. */
type Mount = (container: HTMLElement) => () => void;

function removeAll(panels: readonly Element[]): () => void {
    return (): void => {
        for (let g = 0; g < panels.length; g++) panels[g].remove();
    };
}

function mountFloorA1(container: HTMLElement): () => void {
    const panels = new Array<Element>(INSTANCES);
    for (let g = 0; g < INSTANCES; g++) {
        const panel = PROTO_A1.cloneNode(true) as Element;
        let cur = panel.firstChild as Node;
        const b0 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t0 = cur.firstChild as Text;
        let v0 = 0;
        b0.addEventListener('click', () => {
            v0 = STEP0(v0);
            t0.data = LABELS[v0];
        });
        container.appendChild(panel);
        panels[g] = panel;
    }
    return removeAll(panels);
}

function mountFloorA4(container: HTMLElement): () => void {
    const panels = new Array<Element>(INSTANCES);
    for (let g = 0; g < INSTANCES; g++) {
        const panel = PROTO_A4.cloneNode(true) as Element;
        let cur = panel.firstChild as Node;
        const b0 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t0 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b1 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t1 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b2 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t2 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b3 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t3 = cur.firstChild as Text;
        let v0 = 0;
        let v1 = 0;
        let v2 = 0;
        let v3 = 0;
        b0.addEventListener('click', () => {
            v0 = STEP0(v0);
            t0.data = LABELS[v0];
        });
        b1.addEventListener('click', () => {
            v1 = STEP1(v1);
            t1.data = LABELS[v1];
        });
        b2.addEventListener('click', () => {
            v2 = STEP2(v2);
            t2.data = LABELS[v2];
        });
        b3.addEventListener('click', () => {
            v3 = STEP3(v3);
            t3.data = LABELS[v3];
        });
        container.appendChild(panel);
        panels[g] = panel;
    }
    return removeAll(panels);
}

function mountFloorA16(container: HTMLElement): () => void {
    const panels = new Array<Element>(INSTANCES);
    for (let g = 0; g < INSTANCES; g++) {
        const panel = PROTO_A16.cloneNode(true) as Element;
        let cur = panel.firstChild as Node;
        const b0 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t0 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b1 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t1 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b2 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t2 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b3 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t3 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b4 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t4 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b5 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t5 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b6 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t6 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b7 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t7 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b8 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t8 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b9 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t9 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b10 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t10 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b11 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t11 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b12 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t12 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b13 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t13 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b14 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t14 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b15 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t15 = cur.firstChild as Text;
        let v0 = 0;
        let v1 = 0;
        let v2 = 0;
        let v3 = 0;
        let v4 = 0;
        let v5 = 0;
        let v6 = 0;
        let v7 = 0;
        let v8 = 0;
        let v9 = 0;
        let v10 = 0;
        let v11 = 0;
        let v12 = 0;
        let v13 = 0;
        let v14 = 0;
        let v15 = 0;
        b0.addEventListener('click', () => {
            v0 = STEP0(v0);
            t0.data = LABELS[v0];
        });
        b1.addEventListener('click', () => {
            v1 = STEP1(v1);
            t1.data = LABELS[v1];
        });
        b2.addEventListener('click', () => {
            v2 = STEP2(v2);
            t2.data = LABELS[v2];
        });
        b3.addEventListener('click', () => {
            v3 = STEP3(v3);
            t3.data = LABELS[v3];
        });
        b4.addEventListener('click', () => {
            v4 = STEP4(v4);
            t4.data = LABELS[v4];
        });
        b5.addEventListener('click', () => {
            v5 = STEP5(v5);
            t5.data = LABELS[v5];
        });
        b6.addEventListener('click', () => {
            v6 = STEP6(v6);
            t6.data = LABELS[v6];
        });
        b7.addEventListener('click', () => {
            v7 = STEP7(v7);
            t7.data = LABELS[v7];
        });
        b8.addEventListener('click', () => {
            v8 = STEP8(v8);
            t8.data = LABELS[v8];
        });
        b9.addEventListener('click', () => {
            v9 = STEP9(v9);
            t9.data = LABELS[v9];
        });
        b10.addEventListener('click', () => {
            v10 = STEP10(v10);
            t10.data = LABELS[v10];
        });
        b11.addEventListener('click', () => {
            v11 = STEP11(v11);
            t11.data = LABELS[v11];
        });
        b12.addEventListener('click', () => {
            v12 = STEP12(v12);
            t12.data = LABELS[v12];
        });
        b13.addEventListener('click', () => {
            v13 = STEP13(v13);
            t13.data = LABELS[v13];
        });
        b14.addEventListener('click', () => {
            v14 = STEP14(v14);
            t14.data = LABELS[v14];
        });
        b15.addEventListener('click', () => {
            v15 = STEP15(v15);
            t15.data = LABELS[v15];
        });
        container.appendChild(panel);
        panels[g] = panel;
    }
    return removeAll(panels);
}

// ── THE FLOOR'S TWIN — a second declaration of all three, its own prototypes, its own function
// objects, the identical work on identical data. True difference: ZERO. ───────────────────────

function mountFloorB1(container: HTMLElement): () => void {
    const panels = new Array<Element>(INSTANCES);
    for (let g = 0; g < INSTANCES; g++) {
        const panel = PROTO_B1.cloneNode(true) as Element;
        let cur = panel.firstChild as Node;
        const b0 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t0 = cur.firstChild as Text;
        let v0 = 0;
        b0.addEventListener('click', () => {
            v0 = STEP0(v0);
            t0.data = LABELS[v0];
        });
        container.appendChild(panel);
        panels[g] = panel;
    }
    return removeAll(panels);
}

function mountFloorB4(container: HTMLElement): () => void {
    const panels = new Array<Element>(INSTANCES);
    for (let g = 0; g < INSTANCES; g++) {
        const panel = PROTO_B4.cloneNode(true) as Element;
        let cur = panel.firstChild as Node;
        const b0 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t0 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b1 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t1 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b2 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t2 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b3 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t3 = cur.firstChild as Text;
        let v0 = 0;
        let v1 = 0;
        let v2 = 0;
        let v3 = 0;
        b0.addEventListener('click', () => {
            v0 = STEP0(v0);
            t0.data = LABELS[v0];
        });
        b1.addEventListener('click', () => {
            v1 = STEP1(v1);
            t1.data = LABELS[v1];
        });
        b2.addEventListener('click', () => {
            v2 = STEP2(v2);
            t2.data = LABELS[v2];
        });
        b3.addEventListener('click', () => {
            v3 = STEP3(v3);
            t3.data = LABELS[v3];
        });
        container.appendChild(panel);
        panels[g] = panel;
    }
    return removeAll(panels);
}

function mountFloorB16(container: HTMLElement): () => void {
    const panels = new Array<Element>(INSTANCES);
    for (let g = 0; g < INSTANCES; g++) {
        const panel = PROTO_B16.cloneNode(true) as Element;
        let cur = panel.firstChild as Node;
        const b0 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t0 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b1 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t1 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b2 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t2 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b3 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t3 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b4 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t4 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b5 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t5 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b6 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t6 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b7 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t7 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b8 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t8 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b9 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t9 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b10 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t10 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b11 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t11 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b12 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t12 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b13 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t13 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b14 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t14 = cur.firstChild as Text;
        cur = cur.nextSibling as Node;
        const b15 = cur as HTMLElement;
        cur = cur.nextSibling as Node;
        const t15 = cur.firstChild as Text;
        let v0 = 0;
        let v1 = 0;
        let v2 = 0;
        let v3 = 0;
        let v4 = 0;
        let v5 = 0;
        let v6 = 0;
        let v7 = 0;
        let v8 = 0;
        let v9 = 0;
        let v10 = 0;
        let v11 = 0;
        let v12 = 0;
        let v13 = 0;
        let v14 = 0;
        let v15 = 0;
        b0.addEventListener('click', () => {
            v0 = STEP0(v0);
            t0.data = LABELS[v0];
        });
        b1.addEventListener('click', () => {
            v1 = STEP1(v1);
            t1.data = LABELS[v1];
        });
        b2.addEventListener('click', () => {
            v2 = STEP2(v2);
            t2.data = LABELS[v2];
        });
        b3.addEventListener('click', () => {
            v3 = STEP3(v3);
            t3.data = LABELS[v3];
        });
        b4.addEventListener('click', () => {
            v4 = STEP4(v4);
            t4.data = LABELS[v4];
        });
        b5.addEventListener('click', () => {
            v5 = STEP5(v5);
            t5.data = LABELS[v5];
        });
        b6.addEventListener('click', () => {
            v6 = STEP6(v6);
            t6.data = LABELS[v6];
        });
        b7.addEventListener('click', () => {
            v7 = STEP7(v7);
            t7.data = LABELS[v7];
        });
        b8.addEventListener('click', () => {
            v8 = STEP8(v8);
            t8.data = LABELS[v8];
        });
        b9.addEventListener('click', () => {
            v9 = STEP9(v9);
            t9.data = LABELS[v9];
        });
        b10.addEventListener('click', () => {
            v10 = STEP10(v10);
            t10.data = LABELS[v10];
        });
        b11.addEventListener('click', () => {
            v11 = STEP11(v11);
            t11.data = LABELS[v11];
        });
        b12.addEventListener('click', () => {
            v12 = STEP12(v12);
            t12.data = LABELS[v12];
        });
        b13.addEventListener('click', () => {
            v13 = STEP13(v13);
            t13.data = LABELS[v13];
        });
        b14.addEventListener('click', () => {
            v14 = STEP14(v14);
            t14.data = LABELS[v14];
        });
        b15.addEventListener('click', () => {
            v15 = STEP15(v15);
            t15.data = LABELS[v15];
        });
        container.appendChild(panel);
        panels[g] = panel;
    }
    return removeAll(panels);
}

// ---------------------------------------------------------------------------------------
// THE DRIVER'S OWN SCENE — the identical tree, NO LISTENER ANYWHERE.
//
// Its MOUNT row is the DOM and nothing else, which is what prices the scene's growth across the
// ladder — 96 elements at n1 and 1056 at n16, all of it in this row and therefore taken out of
// every `x − driver`. Its CLICK row is the instrument's own cost. It is EXCLUDED FROM THE CLICK GATE by
// construction: a program with no handler cannot produce the same DOM after clicking, and saying so
// is the point of the row.
// ---------------------------------------------------------------------------------------

function driverMount(proto: Element, panels: number): Mount {
    return (container: HTMLElement): (() => void) => {
        const held = new Array<Element>(panels);
        for (let g = 0; g < panels; g++) {
            const panel = proto.cloneNode(true) as Element;
            container.appendChild(panel);
            held[g] = panel;
        }
        return removeAll(held);
    };
}

// ---------------------------------------------------------------------------------------
// MOUNTING AN EXODRA SCENE — one `render` call per component, which is what a page with N
// independent panels does.
//
// `render` MOUNTS ONE INSTANCE, so the entry point's fixed setup — one teardown scope — is paid per
// panel. That is a real per-instance cost of the library, it is IDENTICAL for the wire and the
// machine arms, and it is part of what the floor gap contains rather than something this file tries
// to reproduce.
// ---------------------------------------------------------------------------------------

function exodraMount(component: TExoDomMachine, panels: number): Mount {
    return (container: HTMLElement): (() => void) => {
        const offs = new Array<() => void>(panels);
        for (let g = 0; g < panels; g++) offs[g] = BACKEND.render(component, container);
        return (): void => {
            for (let g = 0; g < panels; g++) offs[g]();
        };
    };
}

// ---------------------------------------------------------------------------------------
// THE PROGRAM TABLE. One record per row, so nothing below names a winner in advance.
// ---------------------------------------------------------------------------------------

interface Program {
    readonly name: string;
    /** Handlers per instance — the free variable. */
    readonly rung: number;
    readonly mount: Mount;
    /** What the row is, printed once in the legend. */
    readonly what: string;
    /** `false` for a `driver` row, which by construction cannot match after a click. */
    readonly gated: boolean;
    /** Which arm it belongs to, for the null pairing. `null` for the driver. */
    readonly arm: 'floor' | 'wire' | 'machine' | null;
    /** `true` for the `·twin` half of a null pair. */
    readonly twin: boolean;
}

const PROGRAMS: readonly Program[] = [
    // ── n1 ──────────────────────────────────────────────────────────────────────────────
    {
        name: 'driver·n1',
        rung: 1,
        mount: driverMount(PROTO_A1, INSTANCES),
        what:
            'the instrument: 32 instances × 1, 96 elements, NO handler, no library — a ' +
            'MouseEvent and a bubbling dispatch and nothing else; its mount row IS this rung\u2019s tree, priced',
        gated: false,
        arm: null,
        twin: false,
    },
    {
        name: 'floor·n1',
        rung: 1,
        mount: mountFloorA1,
        what: 'no library: 32 clones, a written-out walk, 1 listener + 1 closure per group',
        gated: true,
        arm: 'floor',
        twin: false,
    },
    {
        name: 'floor·n1·twin',
        rung: 1,
        mount: mountFloorB1,
        what: 'the NULL for floor·n1 — a second declaration of it, true Δ = 0',
        gated: true,
        arm: 'floor',
        twin: true,
    },
    {
        name: 'wire·n1',
        rung: 1,
        mount: exodraMount(WIRE_A1_COMPONENT, INSTANCES),
        what: '@exodra/dom, c.fillDoors() once, state in closure variables, 1 handler closure per instance',
        gated: true,
        arm: 'wire',
        twin: false,
    },
    {
        name: 'wire·n1·twin',
        rung: 1,
        mount: exodraMount(WIRE_B1_COMPONENT, INSTANCES),
        what: 'the NULL for wire·n1 — its own declaration, schema and bodies, true Δ = 0',
        gated: true,
        arm: 'wire',
        twin: true,
    },
    {
        name: 'machine·n1',
        rung: 1,
        mount: exodraMount(MACHINE_A1, INSTANCES),
        what: 'the imperative machine: 1 m.on declared per COMPONENT, state in the cache, ZERO closures per instance',
        gated: true,
        arm: 'machine',
        twin: false,
    },
    {
        name: 'machine·n1·twin',
        rung: 1,
        mount: exodraMount(MACHINE_B1, INSTANCES),
        what: 'the NULL for machine·n1 — its own schema, machine, keep and bodies, true Δ = 0',
        gated: true,
        arm: 'machine',
        twin: true,
    },
    // ── n4 ──────────────────────────────────────────────────────────────────────────────
    {
        name: 'driver·n4',
        rung: 4,
        mount: driverMount(PROTO_A4, INSTANCES),
        what: 'the instrument: 32 instances × 4, 288 elements, NO handler, no library',
        gated: false,
        arm: null,
        twin: false,
    },
    {
        name: 'floor·n4',
        rung: 4,
        mount: mountFloorA4,
        what: 'no library: 32 clones, a written-out walk, 4 listeners + 4 closures per group',
        gated: true,
        arm: 'floor',
        twin: false,
    },
    {
        name: 'floor·n4·twin',
        rung: 4,
        mount: mountFloorB4,
        what: 'the NULL for floor·n4 — a second declaration of it, true Δ = 0',
        gated: true,
        arm: 'floor',
        twin: true,
    },
    {
        name: 'wire·n4',
        rung: 4,
        mount: exodraMount(WIRE_A4_COMPONENT, INSTANCES),
        what: '@exodra/dom, 4 handler closures per instance sharing one context',
        gated: true,
        arm: 'wire',
        twin: false,
    },
    {
        name: 'wire·n4·twin',
        rung: 4,
        mount: exodraMount(WIRE_B4_COMPONENT, INSTANCES),
        what: 'the NULL for wire·n4 — its own declaration, schema and bodies, true Δ = 0',
        gated: true,
        arm: 'wire',
        twin: true,
    },
    {
        name: 'machine·n4',
        rung: 4,
        mount: exodraMount(MACHINE_A4, INSTANCES),
        what: 'the imperative machine: 4 m.on per COMPONENT, ZERO closures per instance',
        gated: true,
        arm: 'machine',
        twin: false,
    },
    {
        name: 'machine·n4·twin',
        rung: 4,
        mount: exodraMount(MACHINE_B4, INSTANCES),
        what: 'the NULL for machine·n4 — its own schema, machine, keep and bodies, true Δ = 0',
        gated: true,
        arm: 'machine',
        twin: true,
    },
    // ── n16 ─────────────────────────────────────────────────────────────────────────────
    {
        name: 'driver·n16',
        rung: 16,
        mount: driverMount(PROTO_A16, INSTANCES),
        what: 'the instrument: 32 instances × 16, 1056 elements, NO handler, no library',
        gated: false,
        arm: null,
        twin: false,
    },
    {
        name: 'floor·n16',
        rung: 16,
        mount: mountFloorA16,
        what: 'no library: 32 clones, a written-out walk, 16 listeners + 16 closures per group',
        gated: true,
        arm: 'floor',
        twin: false,
    },
    {
        name: 'floor·n16·twin',
        rung: 16,
        mount: mountFloorB16,
        what: 'the NULL for floor·n16 — a second declaration of it, true Δ = 0',
        gated: true,
        arm: 'floor',
        twin: true,
    },
    {
        name: 'wire·n16',
        rung: 16,
        mount: exodraMount(WIRE_A16_COMPONENT, INSTANCES),
        what: '@exodra/dom, 16 handler closures per instance sharing one context',
        gated: true,
        arm: 'wire',
        twin: false,
    },
    {
        name: 'wire·n16·twin',
        rung: 16,
        mount: exodraMount(WIRE_B16_COMPONENT, INSTANCES),
        what: 'the NULL for wire·n16 — its own declaration, schema and bodies, true Δ = 0',
        gated: true,
        arm: 'wire',
        twin: true,
    },
    {
        name: 'machine·n16',
        rung: 16,
        mount: exodraMount(MACHINE_A16, INSTANCES),
        what: 'the imperative machine: 16 m.on per COMPONENT, ZERO closures per instance',
        gated: true,
        arm: 'machine',
        twin: false,
    },
    {
        name: 'machine·n16·twin',
        rung: 16,
        mount: exodraMount(MACHINE_B16, INSTANCES),
        what: 'the NULL for machine·n16 — its own schema, machine, keep and bodies, true Δ = 0',
        gated: true,
        arm: 'machine',
        twin: true,
    },
];

/** The subject rows at a rung, by arm — used by the answer and by the null pairing. */
function rowName(arm: 'floor' | 'wire' | 'machine', rung: number, twin: boolean): string {
    return `${arm}·n${rung}${twin ? '·twin' : ''}`;
}

// ---------------------------------------------------------------------------------------
// THE DRIVER. One statement per click, identical for every row.
// ---------------------------------------------------------------------------------------

/**
 * ONE CLICK. `MouseEvent` because that is what a real click dispatches; `bubbles: true` and
 * `cancelable: true` because a real click is both and because the shipped listener reads
 * `currentTarget`, which a non-propagating event would not set the same way.
 */
function clickOne(button: HTMLButtonElement): void {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/**
 * `DISPATCHES` clicks, rotating through every button in document order.
 *
 * THE COUNT IS THE SAME AT EVERY RUNG and the BUTTON COUNT IS NOT, so a button is hit 128 times at
 * n1 and 8 times at n16. That is deliberate: what this table divides by is DISPATCHES, and a region
 * of a constant length is the only way the three rungs' per-click resolutions come out alike. It is
 * also why nothing here is read per BUTTON.
 */
function clickMany(buttons: readonly HTMLButtonElement[]): void {
    const n = buttons.length;
    for (let j = 0; j < DISPATCHES; j++) clickOne(buttons[j % n]);
}

function buttonsOf(container: HTMLElement): HTMLButtonElement[] {
    const found = container.querySelectorAll('button');
    const out = new Array<HTMLButtonElement>(found.length);
    for (let i = 0; i < found.length; i++) out[i] = found[i] as HTMLButtonElement;
    return out;
}

// ---------------------------------------------------------------------------------------
// THE GATE. Nothing is timed until every program at a rung has been shown to build the SAME BYTES
// and to hold the SAME BYTES after every one of 256 clicks.
//
// MARKUP IS ENOUGH HERE, AND THAT IS A FACT ABOUT THIS SCENE RATHER THAN A SHORTCUT. Everything a
// handler in this file writes is TEXT — `t.data`, `ports.set(textPort)`, `c.text(textPort)` — and
// text serialises. `op-click-floor` needed a second half to its snapshot because its op wrote
// `input.value`, a PROPERTY, which does not.
//
// IT IS STEPPED AND NOT CHECKED AT THE END. Every button is clicked once, and every program is
// compared against the reference AFTER EVERY ONE — `update-floor`'s lesson: an end-state comparison
// passes a program that did nothing whenever the sequence returns to where it started.
//
// THE REFERENCE IS THE MACHINE ROW, deliberately: it is the arm whose correctness is newest.
// ---------------------------------------------------------------------------------------

function firstDifference(want: string, got: string): string {
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    const from = Math.max(0, at - 120);
    return (
        `first difference at char ${at}\n` +
        `    reference: …${want.slice(from, at + 200)}…\n` +
        `    theirs:    …${got.slice(from, at + 200)}…`
    );
}

function gateRung(rung: number): void {
    const here = PROGRAMS.filter((p) => p.rung === rung);
    const mounted = here.map((p) => {
        const c = el();
        const dispose = p.mount(c);
        return { p, c, dispose, buttons: buttonsOf(c) };
    });
    const reference = mounted.find((m) => m.p.name === rowName('machine', rung, false));
    if (reference === undefined) {
        throw new Error(`handler-count: no reference row at rung ${rung}`);
    }

    // EVERY PROGRAM AT THIS RUNG BUILT THE SAME BUTTONS, including the driver. A row whose scene
    // has a different number of buttons could not even be clicked in step with the others.
    //
    // THE COUNT IS THE RUNG'S, NOT THE TABLE'S. It is `32 × N`, and it is checked against that
    // arithmetic rather than against a constant precisely because the constant is what the previous
    // shape of this file held and what cancelled its free variable.
    const wantButtons = handlersAt(rung);
    for (const m of mounted) {
        if (m.buttons.length === wantButtons) continue;
        throw new Error(
            `handler-count: "${m.p.name}" mounted ${m.buttons.length} buttons, not ` +
                `${wantButtons} (${INSTANCES} instances × ${rung}) — the scenes are not the same ` +
                'scene and nothing below would be comparable'
        );
    }

    const check = (stage: string): void => {
        const want = markupOf(reference.c);
        for (const m of mounted) {
            if (m === reference) continue;
            // The driver holds no handler, so after the first click it is a different page BY
            // CONSTRUCTION. It is checked as mounted and never again.
            if (!m.p.gated && stage !== 'as mounted') continue;
            const got = markupOf(m.c);
            if (want === got) continue;
            refuse(
                `gate handler-count/${m.p.name} @ ${stage}: DIFFERENT markup — ` +
                    firstDifference(want, got)
            );
            throw new Error(
                `handler-count: "${m.p.name}" is in a different state from the reference @ ` +
                    `${stage} — the timings below would be comparing different programs`
            );
        }
    };

    check('as mounted');
    for (let j = 0; j < wantButtons; j++) {
        for (const m of mounted) {
            if (!m.p.gated) continue;
            clickOne(m.buttons[j]);
        }
        check(`after click ${j + 1}/${wantButtons}`);
    }

    line(
        `gate handler-count/n${rung}: ${mounted.filter((m) => m.p.gated).length} programs ` +
            `identical as mounted and after all ${wantButtons} clicks of one full pass ` +
            `(${markupOf(reference.c).length} chars, ` +
            `${reference.c.querySelectorAll('*').length} elements)`
    );
    line(
        `gate handler-count/n${rung}: "driver·n${rung}" is checked AS MOUNTED and excluded ` +
            'afterwards — it attaches no handler, which is the whole of what the row is for'
    );

    for (const m of mounted) {
        m.dispose();
        m.c.remove();
    }
}

/**
 * EVERY PROTOTYPE IN THE RUN, PRINTED BEFORE THE GATE — `mount-floor`'s caveat D for this shape,
 * and ahead of the gate because `keystroke-floor` learned that a report standing behind a throwing
 * gate never prints at all.
 *
 * EIGHTEEN: `@exodra/dom`'s compiled prototype for each of the six wires and the six machines
 * (each machine caches its own schema on `machine.forms`, so each has its own prototype and each
 * is checked), and this file's six parsed ones.
 */
function protoReport(): readonly string[] {
    const rows: readonly { readonly name: string; readonly proto: Element; readonly by: string }[] =
        [
            {
                name: 'dom·A1',
                proto: exoDomSchemaOf(WIRE_A1_COMPONENT, BACKEND).proto,
                by: 'wire·n1',
            },
            {
                name: 'machine·A1',
                proto: exoDomSchemaOf(MACHINE_A1, BACKEND).proto,
                by: 'machine·n1',
            },
            { name: 'floor·A1', proto: PROTO_A1, by: 'floor·n1, driver·n1' },
            {
                name: 'dom·B1',
                proto: exoDomSchemaOf(WIRE_B1_COMPONENT, BACKEND).proto,
                by: 'the n1 wire twin',
            },
            {
                name: 'machine·B1',
                proto: exoDomSchemaOf(MACHINE_B1, BACKEND).proto,
                by: 'the n1 machine twin',
            },
            { name: 'floor·B1', proto: PROTO_B1, by: 'floor·n1·twin' },
            {
                name: 'dom·A4',
                proto: exoDomSchemaOf(WIRE_A4_COMPONENT, BACKEND).proto,
                by: 'wire·n4',
            },
            {
                name: 'machine·A4',
                proto: exoDomSchemaOf(MACHINE_A4, BACKEND).proto,
                by: 'machine·n4',
            },
            { name: 'floor·A4', proto: PROTO_A4, by: 'floor·n4, driver·n4' },
            {
                name: 'dom·B4',
                proto: exoDomSchemaOf(WIRE_B4_COMPONENT, BACKEND).proto,
                by: 'the n4 wire twin',
            },
            {
                name: 'machine·B4',
                proto: exoDomSchemaOf(MACHINE_B4, BACKEND).proto,
                by: 'the n4 machine twin',
            },
            { name: 'floor·B4', proto: PROTO_B4, by: 'floor·n4·twin' },
            {
                name: 'dom·A16',
                proto: exoDomSchemaOf(WIRE_A16_COMPONENT, BACKEND).proto,
                by: 'wire·n16',
            },
            {
                name: 'machine·A16',
                proto: exoDomSchemaOf(MACHINE_A16, BACKEND).proto,
                by: 'machine·n16',
            },
            { name: 'floor·A16', proto: PROTO_A16, by: 'floor·n16, driver·n16' },
            {
                name: 'dom·B16',
                proto: exoDomSchemaOf(WIRE_B16_COMPONENT, BACKEND).proto,
                by: 'the n16 wire twin',
            },
            {
                name: 'machine·B16',
                proto: exoDomSchemaOf(MACHINE_B16, BACKEND).proto,
                by: 'the n16 machine twin',
            },
            { name: 'floor·B16', proto: PROTO_B16, by: 'floor·n16·twin' },
        ];
    const out: string[] = [];
    // The reference for a rung is its `dom·A*` prototype; every other prototype of that rung must
    // be byte-identical to it.
    const reference = (name: string): string =>
        (rows.find((r) => r.name === name) as (typeof rows)[number]).proto.outerHTML;
    const want = new Map<number, string>([
        [1, reference('dom·A1')],
        [4, reference('dom·A4')],
        [16, reference('dom·A16')],
    ]);
    for (const r of rows) {
        const html = r.proto.outerHTML;
        const rung = r.name.endsWith('16') ? 16 : r.name.endsWith('4') ? 4 : 1;
        const same = html === (want.get(rung) as string);
        out.push(
            `  ${r.name.padEnd(13)}${String(r.proto.querySelectorAll('*').length + 1).padStart(
                4
            )}` +
                ` elements, ${String(html.length).padStart(6)} chars` +
                `${same ? '  identical to its rung reference' : '  ✖ DIFFERENT'}  — ${r.by}`
        );
    }
    for (const r of rows) {
        const html = r.proto.outerHTML;
        const rung = r.name.endsWith('16') ? 16 : r.name.endsWith('4') ? 4 : 1;
        if (html === (want.get(rung) as string)) continue;
        out.push(
            `  ${r.name} against its rung reference — ` +
                firstDifference(want.get(rung) as string, html)
        );
    }
    return out;
}

// ---------------------------------------------------------------------------------------
// THE PREMISE GATE — THE ONE THING THIS AXIS IS BUILT ON, PROVED AGAINST THE CODE THAT WILL
// ACTUALLY RUN.
//
// THE AXIS'S HEADER CITES SOURCE LINES; THE RUN LOADS A BUILT `dist`. If that dist predates the
// router change, the machine's wire still allocates one closure per instance, both arms move
// together, and the whole ladder measures nothing while looking exactly as it would if it had —
// which is the failure mode this suite is least able to notice. A citation is not a measurement,
// and this is the measurement.
//
// IT IS NOT A TIMING. Two instances of one component are mounted and the ELEMENT'S OWN SLOTS are
// read — the same two properties `exo-event-slot-setter` wrote (`exoEventSlotsFor` and
// `EXO_DIRECT_PACK_ID` are exported for exactly this kind of reading). Then:
//
//   * THE MACHINE'S TWO INSTANCES MUST HOLD THE SAME FUNCTION OBJECT in the handler slot. One
//     object for two instances IS "zero closures per instance" — there is nothing else it could
//     mean, and a per-instance closure would be two different objects.
//   * THEIR SUBJECT SLOTS MUST DIFFER, and both be objects. That is the instance travelling as the
//     subject, which is what makes one shared function able to serve two rows.
//   * THE WIRE'S TWO INSTANCES MUST HOLD DIFFERENT FUNCTION OBJECTS. Without this the two arms
//     would not differ in the free variable at all, and the axis would be comparing one thing with
//     itself.
//
// IT THROWS. A premise that fails is not a slow row, it is a run with nothing to say.
// ---------------------------------------------------------------------------------------

function slotsOf(node: Element): { handler: unknown; subject: unknown } {
    const slots = exoEventSlotsFor(EXO_DIRECT_PACK_ID, 'click');
    const carrier = node as unknown as Record<PropertyKey, unknown>;
    return { handler: carrier[slots.handlerKey], subject: carrier[slots.subjectKey] };
}

/** Mount two instances of one component and read what the two buttons' slots hold. */
function twoInstanceSlots(
    component: TExoDomMachine
): [{ handler: unknown; subject: unknown }, { handler: unknown; subject: unknown }] {
    const c = el();
    const off = exodraMount(component, 2)(c);
    const btns = c.querySelectorAll('button');
    if (btns.length !== 2) {
        off();
        c.remove();
        throw new Error(
            `handler-count: the premise gate mounted ${btns.length} buttons, not 2 — it must be ` +
                'run against a ONE-handler component'
        );
    }
    const pair: [{ handler: unknown; subject: unknown }, { handler: unknown; subject: unknown }] = [
        slotsOf(btns[0]),
        slotsOf(btns[1]),
    ];
    off();
    c.remove();
    return pair;
}

function gatePremise(): void {
    const [m0, m1] = twoInstanceSlots(MACHINE_A1);
    const [w0, w1] = twoInstanceSlots(WIRE_A1_COMPONENT);

    if (typeof m0.handler !== 'function' || typeof m1.handler !== 'function') {
        throw new Error(
            'handler-count: the machine arm put no FUNCTION in its click slot — the premise gate ' +
                'cannot read what it is here to read, so the direct pack is not the one in use.'
        );
    }
    if (m0.handler !== m1.handler) {
        refuse(
            'handler-count: THE PREMISE IS FALSE IN THE CODE THAT WILL RUN. Two instances of one ' +
                'machine component hold TWO DIFFERENT function objects in their click slots, so ' +
                'the machine is allocating one closure PER INSTANCE — which is what the machine ' +
                'did before `withExoHandlers` built one router per handler per COMPONENT ' +
                '(exo-machine.ts:629-635). The built `@exodra/core` this page loaded predates that ' +
                'change. Run `npm run build:all` at the repository root and re-run; nothing below ' +
                'would have measured what this axis is for.'
        );
        throw new Error(
            'handler-count: machine handlers are per-instance closures in this build — the axis ' +
                'has no free variable'
        );
    }
    if (m0.subject === m1.subject || typeof m0.subject !== 'object' || m0.subject === null) {
        throw new Error(
            'handler-count: the machine arm’s two instances do not carry DIFFERENT instance ' +
                'objects in their subject slots, so one shared router could not tell them apart. ' +
                'Either the wire stopped passing the instance as the subject, or the dispatcher ' +
                'stopped delivering it (direct-listener-for.ts:89-93).'
        );
    }
    if (typeof w0.handler !== 'function' || typeof w1.handler !== 'function') {
        throw new Error('handler-count: the wire arm put no FUNCTION in its click slot');
    }
    if (w0.handler === w1.handler) {
        throw new Error(
            'handler-count: the WIRE arm’s two instances hold the SAME function object, so it is ' +
                'not allocating a closure per instance and the two arms do not differ in this ' +
                "axis's free variable at all"
        );
    }

    line(
        'gate handler-count/premise: two instances of one MACHINE component hold THE SAME ' +
            'function object in their click slots (one router per handler per COMPONENT) and ' +
            'DIFFERENT objects in their subject slots (the instance travels as the subject) — ' +
            'zero closures per instance, proved off the elements and not off a citation'
    );
    line(
        'gate handler-count/premise: two instances of one WIRE component hold DIFFERENT function ' +
            'objects — one closure per handler per instance, which is the other arm of the ladder'
    );
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — copied from `op-click-floor`, which copied it from `keystroke-floor`, which
// copied it from `mount-floor`. Spin until the clock moves and keep the SMALLEST step it ever
// takes.
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

// ---------------------------------------------------------------------------------------
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase and the SERIES handed back,
// identical in shape to `op-click-floor`'s: this run reports DIFFERENCES, where `abBench` prints
// medians and returns a ranking.
//
// ONE ROTATION OVER ALL 21 PHASES PER TABLE, and not one rotation per rung. This axis compares
// GAPS across rungs, and a per-rung rotation would sample the three rungs in three different
// stretches of the machine's life — which is exactly the confound the interleaving exists to
// remove.
//
// AND THE ROTATION ALTERNATES DIRECTION, WHICH IS NEW AND IS A REPAIR. A rotation alone walks the
// SAME CYCLE from a different starting point, so every adjacency in the table is fixed for the
// whole run: `wire·n1·twin` ran immediately after `wire·n1` in every round but the one per cycle
// that wrapped between them, for the life of the file. The wire nulls it produced are quoted in the
// header. Odd rounds now walk the cycle backwards, so every adjacency is ordered both ways equally
// often, and `runPhases` hands back WHERE IN THE ROUND each phase ran so the nulls can be split on
// it. That split is the only thing that can tell an ordering effect from two declarations that
// really do differ, and the previous shape of this file could not make it.
// ---------------------------------------------------------------------------------------

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
    readonly name: string;
    /** Scenarios per timed region — what the batch multiplies. */
    readonly reps: number;
    /** Units per scenario: `DISPATCHES` for a click phase, 1 for a mount (one whole scene). */
    readonly per: number;
    readonly prep: () => Scenario;
}

/**
 * ONE TABLE'S WORTH OF SAMPLING: the per-round series for every phase, and WHERE IN THE ROUND each
 * one ran.
 *
 * THE POSITIONS ARE NOT BOOKKEEPING. They are what lets a null be split by which half of the pair
 * went first, which is the whole of the ordering diagnosis in the header.
 */
interface Series {
    readonly times: Map<string, number[]>;
    /** `position.get(name)[r]` — 0-based place of that phase inside round `r`. */
    readonly position: Map<string, number[]>;
}

function sampleOnce(phase: Phase): number {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    gcIfPossible();
    const t0 = performance.now();
    for (let b = 0; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();
    return dt / (reps * phase.per);
}

function runPhases(phases: readonly Phase[], rounds: number): Series {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);
    const len = phases.length;
    const times = new Map<string, number[]>();
    const position = new Map<string, number[]>();
    for (const p of phases) {
        times.set(p.name, []);
        position.set(p.name, []);
    }
    for (let r = 0; r < rounds; r++) {
        const shift = r % len;
        // EVEN ROUNDS FORWARDS, ODD ROUNDS BACKWARDS. The rotation still gives every phase every
        // starting position; the direction is what stops any pair of phases from keeping a fixed
        // order for the whole run.
        const forward = r % 2 === 0;
        for (let k = 0; k < len; k++) {
            const at = forward ? (k + shift) % len : (shift + len - 1 - k) % len;
            const p = phases[at];
            (times.get(p.name) as number[]).push(sampleOnce(p));
            (position.get(p.name) as number[]).push(k);
        }
    }
    return { times, position };
}

/**
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO.
 *
 *   bias        |median(a) − median(b)|. On its own it is optimistic: two medians are free to
 *               cancel, and `mount-floor`'s first run printed `0.0000` for exactly that reason.
 *   noise       the MEDIAN of the per-round |a_r − b_r|. The two halves of a null are sampled in
 *               the same round, so this is the round-to-round scatter that ANY comparison of two
 *               rows in this table carries. It cannot cancel.
 *   aFirst      median of the SIGNED `a_r − b_r` over the rounds where `a` ran before `b`.
 *   bFirst      the same over the rounds where `b` ran before `a`.
 *   order       (aFirst − bFirst) ÷ 2 — the size of the ordering effect, signed.
 *   intrinsic   (aFirst + bFirst) ÷ 2 — what is left of the pair once the ordering is balanced.
 *
 * THE LAST THREE ARE THE DIAGNOSIS AND NOT DECORATION. An ordering effect flips sign with the
 * order, so it lands entirely in `order` and `intrinsic` collapses; two declarations that really do
 * differ keep their sign in both orders, so it lands entirely in `intrinsic` and `order` collapses.
 * A null whose `intrinsic` is large is not a null.
 */
interface Null {
    readonly bias: number;
    readonly noise: number;
    readonly noiseP75: number;
    readonly worst: number;
    readonly resolution: number;
    readonly aFirst: number;
    readonly bFirst: number;
    readonly order: number;
    readonly intrinsic: number;
    /** Rounds that went into `aFirst` and into `bFirst`. */
    readonly aFirstRounds: number;
    readonly bFirstRounds: number;
}

/** Median of a signed series; `0` for an empty one, which is what an unsampled order deserves. */
function median(xs: readonly number[]): number {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
}

function pairedNull(a: number[], b: number[], aPos: number[], bPos: number[]): Null {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    const whenAFirst: number[] = [];
    const whenBFirst: number[] = [];
    for (let r = 0; r < n; r++) {
        const signed = a[r] - b[r];
        diffs[r] = Math.abs(signed);
        // WHICH RAN FIRST IS READ OFF THE ROUND ITSELF, not inferred from the round's parity: the
        // rotation wraps, so one round in every cycle puts the pair in the opposite order to the
        // one the direction would suggest, and inferring it would quietly poison both halves.
        if (aPos[r] < bPos[r]) whenAFirst.push(signed);
        else whenBFirst.push(signed);
    }
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    const aFirst = median(whenAFirst);
    const bFirst = median(whenBFirst);
    return {
        bias,
        noise: d.median,
        noiseP75: d.p75,
        worst: d.max,
        resolution: Math.max(bias, d.median),
        aFirst,
        bFirst,
        order: (aFirst - bFirst) / 2,
        intrinsic: (aFirst + bFirst) / 2,
        aFirstRounds: whenAFirst.length,
        bFirstRounds: whenBFirst.length,
    };
}

// ---------------------------------------------------------------------------------------

export function benchmarkHandlerCount(rounds = 100, batch = 1, onlyRung?: number): void {
    const RUNGS = rungsFor(onlyRung);
    const f4 = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY. Four is right for a row that takes a fraction of a
    // microsecond and wrong for a quantity whose whole job is to be small.
    const f6 = (x: number): string => x.toFixed(6);
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const quantum = observeTimerQuantum();
    line(
        `handler-count: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── THE PROTOTYPES, THEN THE GATES ──────────────────────────────────────────────────
    line('');
    line(
        "THE PROTOTYPES — every one in the run, this file's and @exodra/dom's, before anything " +
            'else. Reported, not enforced: the gates below are what throw.'
    );
    for (const l of protoReport()) line(l);

    // THE PREMISE FIRST, BEFORE THE MARKUP GATES. A run whose machine still allocates a closure
    // per instance has no free variable, and every table below it would be a comparison of one
    // thing with itself printed to four decimal places.
    line('');
    gatePremise();

    line('');
    for (const n of RUNGS) gateRung(n);

    // ── THE CENSUS ──────────────────────────────────────────────────────────────────────
    line('');
    line('CENSUS — counted off the constants and the schemas, nothing measured');
    line(
        `  instances in a scene         ${INSTANCES}  (CONSTANT at every rung — the held variable)`
    );
    for (const n of RUNGS) {
        line(
            `  rung n${String(n).padEnd(3)}                  ${INSTANCES} instances × ${String(
                n
            ).padStart(2)} handler(s) = ${String(handlersAt(n)).padStart(3)} handlers, ` +
                `${String(elementsAt(n)).padStart(4)} elements, ` +
                `${String(mountRepsAt(n, batch)).padStart(4)} scenes per mount region ` +
                `(${mountRepsAt(n, batch) * elementsAt(n)} elements live at its peak)`
        );
    }
    line(
        `  dispatches per click region  ${DISPATCHES * CLICK_REPS * Math.max(1, batch)}  ` +
            `(${DISPATCHES} per scenario, the same at every rung)`
    );
    line(
        `  clicks each gate steps       ${RUNGS.map((n) => handlersAt(n)).join(' / ')}  ` +
            '(one per button of the rung, compared after every one)'
    );
    line(
        '  distinct handler bodies      16 per arm per family — own source position, own state ' +
            'variable, own port, own arithmetic'
    );
    line(
        '  what a wire instance allocates    N function objects + ONE context of N slots — 1, 4 ' +
            'and 16 function objects across the ladder'
    );
    line(
        '  what a machine instance allocates the instance object + a ONE-SLOT values array + ONE ' +
            'cache object of N fields; ZERO function objects, ZERO contexts, at every rung'
    );
    line(
        '  WHAT IS NOT COMPARABLE            any row against itself at another rung — the scene ' +
            `grows ${elementsAt(RUNGS[0])} → ${elementsAt(RUNGS[RUNGS.length - 1])} elements. ` +
            'Read within a rung; read the GAPS across rungs.'
    );

    // ── THE LEGEND, ONCE ────────────────────────────────────────────────────────────────
    line('');
    line('LEGEND — every row in this run, named once');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(18)} ${p.what}`);

    // ── THE MOUNT TABLE ─────────────────────────────────────────────────────────────────
    //
    // THE REPETITION FACTOR IS PER RUNG and comes from the live-element budget, not from a constant:
    // a scene is 96 elements at n1 and 1056 at n16, and a fixed count would have made the n16 region
    // hold eleven times the document and read eleven times coarser in per-scene units.
    const mountPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: mountRepsAt(p.rung, batch),
        per: 1,
        prep: (): Scenario => {
            const c = el();
            let off: (() => void) | null = null;
            return {
                measure: () => {
                    off = p.mount(c);
                },
                cleanup: () => {
                    if (off !== null) off();
                    c.remove();
                },
            };
        },
    }));

    const mountSeries = runPhases(mountPhases, rounds);
    const mountStats = new Map<string, Stat>();
    for (const p of mountPhases)
        mountStats.set(p.name, stat(mountSeries.times.get(p.name) as number[]));
    const mountMs = (name: string): number => (mountStats.get(name) as Stat).median;

    line('');
    line(
        `MOUNT — building one whole scene of ${INSTANCES} instances [ms per SCENE] · interleaved, ` +
            `direction alternating · ${rounds} rounds · batch ${batch} · scenes per timed region ` +
            `set per rung from a ${MOUNT_LIVE_ELEMENTS}-element budget · GC before every timed ` +
            'region · A SCENE IS A DIFFERENT SIZE AT EVERY RUNG, so read down a rung and not across'
    );
    line('                      reps   min      p25      median   p75      max');
    for (const p of mountPhases) {
        const s = mountStats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(18)}${String(p.reps).padStart(6)}   ${f4(s.min)}   ${f4(s.p25)}   ` +
                `${f4(s.median)}   ${f4(s.p75)}   ${f4(s.max)}`
        );
    }
    emitRecordedRows(
        'mount',
        'ms',
        'scene',
        mountPhases.map((p) => [p.name, mountStats.get(p.name) as Stat] as const)
    );

    // ── THE CLICK TABLE ─────────────────────────────────────────────────────────────────
    // ITS REPETITION FACTOR HAS ITS OWN BASE and is not the mount table's. A click scenario holds
    // ONE scene in the document, so its memory does not scale with the repetition the way a mount
    // region's does — which means the click table can afford the repetitions its own resolution
    // needs (a click gap of ~0.01 µs wants tens of thousands of dispatches in a region) without
    // dragging the mount table's document up with it.
    const clickReps = CLICK_REPS * Math.max(1, Math.floor(batch));
    const clickPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: clickReps,
        per: DISPATCHES,
        prep: (): Scenario => {
            // THE MOUNT IS UNTIMED HERE, and so is collecting the buttons. This table measures
            // dispatching, not building, and `querySelectorAll` belongs to neither.
            const c = el();
            const off = p.mount(c);
            const buttons = buttonsOf(c);
            return {
                measure: () => {
                    clickMany(buttons);
                },
                cleanup: () => {
                    off();
                    c.remove();
                },
            };
        },
    }));

    const clickSeries = runPhases(clickPhases, rounds);
    const clickStats = new Map<string, Stat>();
    for (const p of clickPhases)
        clickStats.set(p.name, stat(clickSeries.times.get(p.name) as number[]));
    /** Microseconds per click. */
    const clickUs = (name: string): number => (clickStats.get(name) as Stat).median * 1000;

    line('');
    line(
        `CLICK — one click on one button of that rung's scene [µs per click] · interleaved, ` +
            `direction alternating · ${rounds} rounds · batch ${batch} · ` +
            `${DISPATCHES * clickReps} dispatches per timed region at EVERY rung · GC before ` +
            'every timed region'
    );
    line('                      reps   min      p25      median   p75      max');
    for (const p of clickPhases) {
        const s = clickStats.get(p.name) as Stat;
        const us = (x: number): string => (x * 1000).toFixed(4);
        line(
            `${p.name.padEnd(18)}${String(p.reps).padStart(6)}   ${us(s.min)}   ${us(s.p25)}   ` +
                `${us(s.median)}   ${us(s.p75)}   ${us(s.max)}`
        );
    }
    emitRecordedRows(
        'click',
        'µs',
        'click',
        clickPhases.map((p) => {
            const s = clickStats.get(p.name) as Stat;
            return [
                p.name,
                {
                    min: s.min * 1000,
                    p25: s.p25 * 1000,
                    median: s.median * 1000,
                    p75: s.p75 * 1000,
                    max: s.max * 1000,
                },
            ] as const;
        })
    );

    // ── THE NULLS, ONE PER ARM PER RUNG, ON BOTH TABLES ─────────────────────────────────
    const ARMS = ['floor', 'wire', 'machine'] as const;
    const mountNulls = new Map<string, Null>();
    const clickNulls = new Map<string, Null>();
    for (const arm of ARMS) {
        for (const n of RUNGS) {
            const a = rowName(arm, n, false);
            const b = rowName(arm, n, true);
            mountNulls.set(
                a,
                pairedNull(
                    mountSeries.times.get(a) as number[],
                    mountSeries.times.get(b) as number[],
                    mountSeries.position.get(a) as number[],
                    mountSeries.position.get(b) as number[]
                )
            );
            clickNulls.set(
                a,
                pairedNull(
                    clickSeries.times.get(a) as number[],
                    clickSeries.times.get(b) as number[],
                    clickSeries.position.get(a) as number[],
                    clickSeries.position.get(b) as number[]
                )
            );
        }
    }

    /** In ms per scene. */
    const mountRes = (name: string): number => (mountNulls.get(name) as Null).resolution;
    /** In µs per click. */
    const clickRes = (name: string): number => (clickNulls.get(name) as Null).resolution * 1000;

    const nullBlock = (
        title: string,
        nulls: Map<string, Null>,
        scale: number,
        unitWord: string
    ): number => {
        line('');
        line(title);
        line(
            '  null            bias      noise     p75       worst     ' +
                'order     intrinsic  what it is'
        );
        let worst = 0;
        for (const arm of ARMS) {
            for (const n of RUNGS) {
                const name = rowName(arm, n, false);
                const v = nulls.get(name) as Null;
                if (v.resolution * scale > worst) worst = v.resolution * scale;
                line(
                    `  ${name.padEnd(14)}${f6(v.bias * scale)}  ${f6(v.noise * scale)}  ` +
                        `${f6(v.noiseP75 * scale)}  ${f6(v.worst * scale)}  ` +
                        `${f6(v.order * scale).padStart(9)} ${f6(v.intrinsic * scale).padStart(
                            9
                        )}  ` +
                        `|${name} − its twin| ${unitWord}, true Δ = 0 ` +
                        `(this pair's resolution ${f6(v.resolution * scale)}; ` +
                        `Δ when it ran first ${f6(v.aFirst * scale)} over ${v.aFirstRounds} ` +
                        `rounds, when the twin ran first ${f6(v.bFirst * scale)} over ` +
                        `${v.bFirstRounds})`
                );
            }
        }
        return worst;
    };

    /**
     * THE ORDERING VERDICT, PRINTED PER PAIR RATHER THAN ARGUED. `order` is half the difference
     * between the two orders and `intrinsic` is half their sum; a pair whose `intrinsic` is inside
     * its own noise is a null, and one whose `intrinsic` is not is a pair of two programs that
     * differ — which for a duplicated declaration means the ROW is unquotable, not just the null.
     */
    const orderVerdict = (
        title: string,
        nulls: Map<string, Null>,
        scale: number,
        unitWord: string
    ): void => {
        line('');
        line(title);
        for (const arm of ARMS) {
            for (const n of RUNGS) {
                const name = rowName(arm, n, false);
                const v = nulls.get(name) as Null;
                const intr = Math.abs(v.intrinsic) * scale;
                const ord = Math.abs(v.order) * scale;
                const noise = v.noise * scale;
                const verdictWord =
                    intr > noise
                        ? 'INTRINSIC — the two declarations differ in a way that does NOT flip ' +
                          'with the order, so this pair is NOT a null and every figure printed ' +
                          `for "${name}" is suspect`
                        : ord > noise
                        ? 'ORDERING — what the pair separates flips sign with which of the two ' +
                          'ran first, so it is the position in the round and not the program; ' +
                          'the alternating direction is what averages it out of the medians'
                        : 'NEITHER stands out of this pair’s own noise — the pair is a null and ' +
                          'the instrument has nothing to confess';
                line(
                    `  ${name.padEnd(14)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ` +
                        `${f6(noise)} ${unitWord} — ${verdictWord}`
                );
            }
        }
    };

    // THE TITLES ARE SPELLED SO THE RECORDER CAN TELL THE TWO BLOCKS APART. `run-one-axis.js`
    // stamps a null block with the last SECTION header it saw, and its pattern wants a single
    // upper-case token before the dash — so "THE CONTROLS, MOUNT" would have left BOTH blocks
    // filed under `CLICK`, the last table printed.
    const mountWorst = nullBlock(
        'NULLS·MOUNT — nine pairs, one per arm per rung, each a duplicated declaration',
        mountNulls,
        1,
        'per scene (ms)'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(
            mountWorst
        )} ms — THE COARSEST OF THE NINE, printed for the ` +
            'recorder. NO VERDICT BELOW USES IT: every gap is judged against the resolutions of ' +
            'ITS OWN TWO ROWS, which are on the lines above.'
    );

    const clickWorst = nullBlock(
        'NULLS·CLICK — the same nine pairs on the dispatch table',
        clickNulls,
        1000,
        'per click (µs)'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(
            clickWorst
        )} µs — THE COARSEST OF THE NINE, printed for the ` + 'recorder. NO VERDICT BELOW USES IT.'
    );
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. Bias alone can cancel at the median and read as a perfect instrument; noise ' +
            'cannot, and it is the scatter every comparison in these tables carries, null or not. ' +
            'ORDER is half the difference between the two running orders and INTRINSIC is half ' +
            'their sum — the first is what flips when the pair swaps places in the round, the ' +
            'second is what does not.'
    );

    orderVerdict(
        'THE ORDER SPLIT·MOUNT — is a null measuring two programs, or measuring which of them ran ' +
            'first?',
        mountNulls,
        1,
        'ms/scene'
    );
    orderVerdict(
        'THE ORDER SPLIT·CLICK — the same question on the dispatch table',
        clickNulls,
        1000,
        'µs/click'
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    line('');
    line('ANSWER — and read the header before quoting any of it');
    line(
        '  EVERY BLOCK BELOW IS ONE RUNG AND IS READ INSIDE ITSELF. The scene grows with the rung ' +
            `(${RUNGS.map((n) => `n${n} ${elementsAt(n)} elements`).join(
                ', '
            )}), so a row at one ` +
            'rung and the same row at another are two different jobs. What crosses rungs is THE ' +
            'GAP — a difference of two rows built from the identical scene — and it crosses in ' +
            'THE SHAPE section below and nowhere else.'
    );
    line(
        '  THE HEADLINES ARE DIFFERENCES AND NOT RATIOS. `driver` sits inside every click region, ' +
            'so it CANCELS EXACTLY in any difference of two click rows and no correction is ' +
            'applied to one. Ratios are printed beside them raw and driver-corrected, and a ' +
            'corrected ratio is a quotient of differences of small numbers.'
    );

    interface Gap {
        readonly rung: number;
        readonly mountDelta: number;
        readonly mountRes: number;
        readonly clickDelta: number;
        readonly clickRes: number;
        /** `floor − machine` at mount: the same closure count with no library under it. */
        readonly floorDelta: number;
        readonly floorRes: number;
    }
    const gaps: Gap[] = [];

    for (const n of RUNGS) {
        const w = rowName('wire', n, false);
        const m = rowName('machine', n, false);
        const fl = rowName('floor', n, false);
        const dv = `driver·n${n}`;

        // THE RESOLUTION OF A GAP IS THE COARSER OF ITS OWN TWO ROWS' NULLS — never the table's.
        const mRes = Math.max(mountRes(w), mountRes(m));
        const cRes = Math.max(clickRes(w), clickRes(m));
        const mDelta = mountMs(w) - mountMs(m);
        const cDelta = clickUs(w) - clickUs(m);
        gaps.push({
            rung: n,
            mountDelta: mDelta,
            mountRes: mRes,
            clickDelta: cDelta,
            clickRes: cRes,
            floorDelta: mountMs(fl) - mountMs(m),
            floorRes: Math.max(mountRes(fl), mountRes(m)),
        });

        const verdictOf = (delta: number, res: number, unit: string): string =>
            Math.abs(delta) > res
                ? `Δ ${delta >= 0 ? '+' : ''}${f4(delta)} ${unit} — RESOLVED (its own two rows ` +
                  `resolve ${f6(res)})`
                : `Δ ${delta >= 0 ? '+' : ''}${f4(delta)} ${unit} — INSIDE THE RESOLUTION OF ITS ` +
                  `OWN TWO ROWS (${f6(res)}); this run cannot separate them here`;

        line('');
        line(
            `  ── n${n}: ${INSTANCES} instances × ${n} handler(s) = ${handlersAt(n)} handlers, ` +
                `${elementsAt(n)} elements — READ THIS BLOCK AGAINST ITSELF ────────`
        );
        line(
            `     MOUNT  wire ${f4(mountMs(w))}  machine ${f4(mountMs(m))}  floor ${f4(
                mountMs(fl)
            )}  driver ${f4(mountMs(dv))} ms/scene`
        );
        line(`     MOUNT  wire − machine: ${verdictOf(mDelta, mRes, 'ms/scene')}`);
        line(
            `     MOUNT  floor − machine: ${verdictOf(
                mountMs(fl) - mountMs(m),
                Math.max(mountRes(fl), mountRes(m)),
                'ms/scene'
            )} — THE CONTROL: the same ${n} closure(s) per instance, no library under them`
        );
        line(
            `     MOUNT  headroom to the floor: wire +${f4(mountMs(w) - mountMs(fl))} ` +
                `(res ${f6(Math.max(mountRes(w), mountRes(fl)))}), machine ` +
                `+${f4(mountMs(m) - mountMs(fl))} ` +
                `(res ${f6(Math.max(mountRes(m), mountRes(fl)))}) ms/scene`
        );
        line(
            `     MOUNT  above the DOM alone: floor +${f4(mountMs(fl) - mountMs(dv))}, wire ` +
                `+${f4(mountMs(w) - mountMs(dv))}, machine +${f4(mountMs(m) - mountMs(dv))} ` +
                "ms/scene — this rung's tree is in `driver` and is taken out of all three, which " +
                'is the only sense in which anything here is comparable to another rung'
        );
        line(
            `     CLICK  wire ${f4(clickUs(w))}  machine ${f4(clickUs(m))}  floor ${f4(
                clickUs(fl)
            )}  driver ${f4(clickUs(dv))} µs/click`
        );
        line(`     CLICK  wire − machine: ${verdictOf(cDelta, cRes, 'µs/click')}`);
        line(
            `     CLICK  headroom to the floor: wire +${f4(clickUs(w) - clickUs(fl))} ` +
                `(res ${f6(Math.max(clickRes(w), clickRes(fl)))}), machine ` +
                `+${f4(clickUs(m) - clickUs(fl))} ` +
                `(res ${f6(Math.max(clickRes(m), clickRes(fl)))}) µs/click`
        );
        const netW = clickUs(w) - clickUs(dv);
        const netM = clickUs(m) - clickUs(dv);
        const netF = clickUs(fl) - clickUs(dv);
        line(
            `     CLICK  ratios to the floor — wire ${(
                clickUs(w) / Math.max(clickUs(fl), 1e-9)
            ).toFixed(2)}× raw / ${(netW / Math.max(netF, 1e-9)).toFixed(
                2
            )}× driver-corrected; machine ${(clickUs(m) / Math.max(clickUs(fl), 1e-9)).toFixed(
                2
            )}× raw / ${(netM / Math.max(netF, 1e-9)).toFixed(2)}× corrected`
        );
        line(
            `     CLICK  the instrument is ${pct(clickUs(dv), clickUs(fl))} of a floor click and ` +
                `${pct(clickUs(dv), clickUs(w))} of a wire click`
        );
    }

    // ── THE SHAPE, WHICH IS WHAT THE AXIS WAS BUILT FOR ─────────────────────────────────
    line('');
    line(
        'THE SHAPE — how the wire↔machine GAP moves as the free variable moves. THIS IS THE ONLY ' +
            'SECTION THAT CROSSES RUNGS, and it may, because a gap is a difference of two rows ' +
            'built from the identical scene: the scene’s growth is inside both sides of it.'
    );
    for (let i = 1; i < gaps.length; i++) {
        const a = gaps[i - 1];
        const b = gaps[i];
        const mMoved = Math.abs(b.mountDelta - a.mountDelta) > Math.max(a.mountRes, b.mountRes);
        const cMoved = Math.abs(b.clickDelta - a.clickDelta) > Math.max(a.clickRes, b.clickRes);
        line(
            `  MOUNT n${a.rung} → n${b.rung}: gap ${f4(a.mountDelta)} → ${f4(b.mountDelta)} ` +
                `ms/scene, moved by ${f4(b.mountDelta - a.mountDelta)} — ` +
                `${mMoved ? 'PAST' : 'INSIDE'} the coarser of the two rungs' own resolutions ` +
                `(${f6(Math.max(a.mountRes, b.mountRes))})`
        );
        line(
            `  CLICK n${a.rung} → n${b.rung}: gap ${f4(a.clickDelta)} → ${f4(b.clickDelta)} ` +
                `µs/click, moved by ${f4(b.clickDelta - a.clickDelta)} — ` +
                `${cMoved ? 'PAST' : 'INSIDE'} the coarser of the two rungs' own resolutions ` +
                `(${f6(Math.max(a.clickRes, b.clickRes))})`
        );
    }
    // THE CONTROL, AND IT IS A GAP AND NOT A ROW.
    //
    // The previous shape of this file compared the FLOOR'S ROW at one rung with its row at another,
    // which was legitimate only while the scene was constant. It no longer is: every row grows with
    // the ladder because the tree does, and a program that allocated nothing at all would grow with
    // it too. `floor − machine` counts the same N closures per instance that `wire − machine`
    // counts, with the tree cancelled out of both sides — so the two gaps move together if the
    // closure count is what moves them.
    for (let i = 1; i < gaps.length; i++) {
        const a = gaps[i - 1];
        const b = gaps[i];
        const dWire = b.mountDelta - a.mountDelta;
        const dFloor = b.floorDelta - a.floorDelta;
        const wireMoved = Math.abs(dWire) > Math.max(a.mountRes, b.mountRes);
        const floorMoved = Math.abs(dFloor) > Math.max(a.floorRes, b.floorRes);
        line(
            `  CONTROL n${a.rung} → n${b.rung} at MOUNT: (wire − machine) moved ${f4(dWire)} ` +
                `[${wireMoved ? 'PAST' : 'INSIDE'} ${f6(Math.max(a.mountRes, b.mountRes))}], ` +
                `(floor − machine) moved ${f4(dFloor)} ` +
                `[${floorMoved ? 'PAST' : 'INSIDE'} ${f6(Math.max(a.floorRes, b.floorRes))}] ` +
                `ms/scene, same direction: ${dFloor * dWire > 0 ? 'YES' : 'NO'}. A wire↔machine ` +
                'gap that moves where the floor↔machine gap does not is Exodra’s per-handler ' +
                'cost, not the closure count.'
        );
    }

    // ── THE FALSIFIERS, PRINTED MECHANICALLY SO NOBODY CHOOSES AFTERWARDS ───────────────
    line('');
    line('THE PREDICTION, JUDGED — committed in the header before the first run');
    const verdict = (id: string, failed: boolean, claim: string): void =>
        line(`  ${failed ? 'FAILED ' : 'held   '}${id}  ${claim}`);

    // P1 IS ABOUT THE ENDS OF THE LADDER, not about any adjacent step: "grows with the rung" is a
    // statement about n1 against n16, and asking it of one step would let a saturating shape pass
    // as a growing one.
    const first = gaps[0];
    const last = gaps[gaps.length - 1];
    const endsRes = Math.max(first.mountRes, last.mountRes);
    const grew = Math.abs(last.mountDelta) - Math.abs(first.mountDelta) > endsRes;
    verdict(
        'P1',
        !grew,
        `the MOUNT gap |wire − machine| GROWS with the rung — gaps ` +
            gaps.map((g) => `n${g.rung} ${f4(g.mountDelta)}`).join(', ') +
            `; |n${last.rung}| − |n${first.rung}| = ` +
            `${f4(
                Math.abs(last.mountDelta) - Math.abs(first.mountDelta)
            )} against the coarser of ` +
            `the two ends' own resolutions (${f6(endsRes)})` +
            (grew
                ? ''
                : '  (falsifier (a): allocating sixteen function objects per instance costs no ' +
                  'more than allocating one plus a wider object, and the closure count is not ' +
                  'what separates the two forms at a mount)')
    );

    const firstResolved = gaps.find((g) => Math.abs(g.mountDelta) > g.mountRes);
    const topRung = RUNGS[RUNGS.length - 1];
    verdict(
        'P2',
        firstResolved !== undefined && firstResolved.rung !== topRung,
        `the MOUNT gap first clears its own rung’s resolution at n${topRung}, and may never clear ` +
            'at n1 — first cleared at ' +
            (firstResolved === undefined
                ? `NO RUNG (which is consistent with P2 and says the batch was too small for ` +
                  `n${topRung} as well; see the refusals)`
                : `n${firstResolved.rung}`) +
            (firstResolved !== undefined && firstResolved.rung !== topRung
                ? '  (falsifier (b): what separates the two forms is a per-instance CONSTANT and ' +
                  'has nothing to do with how many handlers an instance has)'
                : '')
    );

    const clickMoved = gaps.some((b, i) => {
        if (i === 0) return false;
        const a = gaps[i - 1];
        return Math.abs(b.clickDelta - a.clickDelta) > Math.max(a.clickRes, b.clickRes);
    });
    verdict(
        'P3',
        clickMoved,
        'the CLICK gap |wire − machine| is FLAT across the ladder — gaps ' +
            gaps.map((g) => `n${g.rung} ${f4(g.clickDelta)}`).join(', ') +
            (clickMoved
                ? '  (falsifier (c): what moved is the polymorphism of the dispatch site — one ' +
                  'handler body at n1, sixteen at n16 — which both arms carry and which this ' +
                  'axis cannot separate from the arms themselves)'
                : '')
    );

    let p4Failed = false;
    for (let i = 1; i < gaps.length; i++) {
        const a = gaps[i - 1];
        const b = gaps[i];
        const dWire = b.mountDelta - a.mountDelta;
        const dFloor = b.floorDelta - a.floorDelta;
        const wireMoved = Math.abs(dWire) > Math.max(a.mountRes, b.mountRes);
        const floorMoved = Math.abs(dFloor) > Math.max(a.floorRes, b.floorRes);
        if (wireMoved && !(floorMoved && dFloor * dWire > 0)) p4Failed = true;
    }
    verdict(
        'P4',
        p4Failed,
        'the (floor − machine) gap grows with the ladder in the same direction as ' +
            '(wire − machine) — floor gaps ' +
            gaps.map((g) => `n${g.rung} ${f4(g.floorDelta)}`).join(', ') +
            (p4Failed
                ? '  (falsifier (d): the wire↔machine gap moves where the floor↔machine gap does ' +
                  "not — the movement is Exodra's per-handler cost and not the closure count, and " +
                  'P1’s mechanism is wrong even where P1 holds)'
                : '')
    );

    let p5Failed = false;
    let p5Least = 1;
    for (const n of RUNGS) {
        const share = clickUs(`driver·n${n}`) / Math.max(clickUs(rowName('floor', n, false)), 1e-9);
        if (share < p5Least) p5Least = share;
        if (share <= 1 / 3) p5Failed = true;
    }
    verdict(
        'P5',
        p5Failed,
        `driver is more than a third of every click row — smallest share ${(p5Least * 100).toFixed(
            1
        )}%` +
            (p5Least < 0.2
                ? '  (falsifier (e): the JS is the cost and the raw ratios need no correction)'
                : '')
    );

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    //
    // Every one of them PRINTS rather than throws, deliberately, so one unreadable table does not
    // take a readable one down with it — the rule the whole floor family follows.
    //
    // AND EVERY ONE OF THEM NAMES THE BATCH IT WANTS. "Raise `rounds`, then the batch" was the old
    // text and it told the reader nothing they did not know: rounds cannot move a mount resolution
    // at all (it is `quantum ÷ reps`, and a median is always one of the observed values), and a
    // batch with no number attached is a guess. The arithmetic is `batch × 4 × resolution ÷ |gap|`,
    // and the memory it costs is printed with it, because that is the wall this axis runs into.

    /** What `batch` would put a gap four times its own resolution, and what that would cost. */
    const batchFor = (res: number, delta: number): number =>
        Math.abs(delta) > 0
            ? Math.max(batch + 1, Math.ceil((batch * 4 * res) / Math.abs(delta)))
            : Infinity;
    const askFor = (want: number, table: 'MOUNT' | 'CLICK'): string =>
        !Number.isFinite(want)
            ? 'NO BATCH FIXES A ZERO GAP — if the two rows really are the same speed here, that ' +
              'is the answer and not a resolution failure.'
            : `Re-run with batch ${want}: \`npm run axis --workspace=@exodra/benchmarks -- ` +
              `handler-count ${rounds} ${want}\`` +
              (table === 'MOUNT'
                  ? ` — which would hold ~${MOUNT_LIVE_ELEMENTS * want} elements live in every ` +
                    'mount region, against ' +
                    `${MOUNT_LIVE_ELEMENTS * Math.max(1, Math.floor(batch))} now.`
                  : ` — which costs only ${CLICK_REPS * want} mounted scenes per click region, ` +
                    'so the click table can afford a far bigger batch than the mount table can.');

    // THE NESTING. Every click row is `driver` PLUS a handler, so nothing may measure below it.
    for (const p of PROGRAMS) {
        if (p.arm === null) continue;
        const dv = `driver·n${p.rung}`;
        const v = clickUs(p.name);
        const d = clickUs(dv);
        const res = p.twin ? clickRes(rowName(p.arm, p.rung, false)) : clickRes(p.name);
        if (v >= d - res) continue;
        refuse(
            `handler-count: "${p.name}" (${f4(v)} µs) measured CHEAPER than "${dv}" ` +
                `(${f4(d)} µs) by ${f4(d - v)} µs, past its own arm's resolution (${f6(res)}), ` +
                'though it does everything the driver does and then runs a handler. That is not ' +
                'a saving, it is the instrument — the ladder does not nest and every difference ' +
                `on the click table is unreadable. ${askFor(batchFor(res, d - v), 'CLICK')}`
        );
    }

    // A NULL THAT IS A LARGE FRACTION OF THE GAP IT IS ASKED TO JUDGE means an ORDERING, not a size.
    for (const g of gaps) {
        if (g.mountRes <= Math.abs(g.mountDelta) * 0.25) continue;
        refuse(
            `handler-count: at n${g.rung} the MOUNT gap is ${f4(g.mountDelta)} ms/scene and its ` +
                `own two rows resolve ${f6(g.mountRes)} — more than a quarter of it. That rung's ` +
                'wire↔machine comparison is an ORDERING and not a size. ' +
                `${askFor(batchFor(g.mountRes, g.mountDelta), 'MOUNT')}` +
                (g.rung === RUNGS[0]
                    ? '  AND AT n1 THIS IS EXPECTED: P2 predicts the true gap here is about zero ' +
                      '— one function object and a one-slot context against a one-field object ' +
                      'and a one-slot array — so an unresolved n1 is the prediction holding, not ' +
                      'the instrument failing.'
                    : '')
        );
    }
    for (const g of gaps) {
        if (g.clickRes <= Math.abs(g.clickDelta) * 0.25) continue;
        refuse(
            `handler-count: at n${g.rung} the CLICK gap is ${f4(g.clickDelta)} µs/click and its ` +
                `own two rows resolve ${f6(g.clickRes)} — more than a quarter of it. That rung's ` +
                'wire↔machine comparison is an ORDERING and not a size. ' +
                `${askFor(batchFor(g.clickRes, g.clickDelta), 'CLICK')}`
        );
    }

    // AND THE ONE THAT WOULD DISOWN THE WIRE ROWS ENTIRELY. A twin is a null only while what
    // separates it from its subject flips sign with the running order; an `intrinsic` bigger than
    // the pair's own noise is two programs that differ, in a pair declared to be identical, and no
    // figure printed for that row means anything until it is explained.
    for (const arm of ARMS) {
        for (const n of RUNGS) {
            const name = rowName(arm, n, false);
            for (const [nulls, scale, unit, table] of [
                [mountNulls, 1, 'ms/scene', 'MOUNT'],
                [clickNulls, 1000, 'µs/click', 'CLICK'],
            ] as const) {
                const v = nulls.get(name) as Null;
                if (Math.abs(v.intrinsic) * scale <= v.noise * scale) continue;
                refuse(
                    `handler-count: the ${table} null "${name}" against its twin has an INTRINSIC ` +
                        `difference of ${f6(
                            Math.abs(v.intrinsic) * scale
                        )} ${unit} — bigger than ` +
                        `the pair's own noise (${f6(
                            v.noise * scale
                        )}) and NOT explained by which ` +
                        `of the two ran first (order ${f6(Math.abs(v.order) * scale)}). Two ` +
                        'declarations whose true difference is zero by construction are ' +
                        `measuring different things, so every ${table} figure this run printed ` +
                        `for "${name}" is suspect and the arm's gaps may not be quoted. Read the ` +
                        'ORDER SPLIT block above before anything else on this page.'
                );
            }
        }
    }

    // THE CLOCK, PER REGION, ON BOTH TABLES.
    const clockFloor = MIN_TICKS * quantum;
    const checkClock = (
        phases: readonly Phase[],
        stats: Map<string, Stat>,
        table: string
    ): void => {
        for (const p of phases) {
            const region = (stats.get(p.name) as Stat).median * p.reps * p.per;
            if (region >= clockFloor) continue;
            const factor = region > 0 ? clockFloor / region : Infinity;
            const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
            refuse(
                `handler-count: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    '`npm run axis --workspace=@exodra/benchmarks -- handler-count ' +
                    `${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(mountPhases, mountStats, 'MOUNT');
    checkClock(clickPhases, clickStats, 'CLICK');

    // AND THE THINGS NO NUMBER ON THIS PAGE COVERS, printed every run so they cannot be forgotten
    // between reading the table and quoting it.
    line('');
    line(
        'WHAT THIS RUN DID NOT MEASURE: it varies HANDLERS PER INSTANCE and holds the INSTANCE ' +
            'COUNT fixed, so the scene grows with the rung and NO ROW MAY BE READ ACROSS RUNGS — ' +
            'only within one, plus the movement of the wire↔machine and floor↔machine GAPS, which ' +
            'are differences of two rows built from the same scene. It says nothing about a fixed ' +
            'total of handlers regrouped (a different question this file used to ask), nothing ' +
            'about STATE WIDTH (every handler owns one number), nothing about ' +
            'DERIVATIONS (this machine declares no m.derive, no m.fill and no m.effect, so the ' +
            'commit, the mark word, the inversion and the wake chains are on no path here), and ' +
            'nothing about WHAT A HANDLER DOES (one arithmetic call and one text write). Nor ' +
            'about exoTransition, the shared-handler form, delegation, the 64-handler rung, ' +
            'teardown, memory, ' +
            'hydration or any backend but the DOM. Every click was synthetic — `isTrusted: ' +
            'false`, no default action, no activation behaviour, no focus change, no hit testing, ' +
            'nothing after the handler returns, and machine rate rather than human rate.'
    );
}
