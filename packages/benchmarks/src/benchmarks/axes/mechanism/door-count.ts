import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
// DIAGNOSTIC — WHAT DOES A PER-INSTANCE DOOR COST, IN A WIRE THAT ALLOCATES ONE PER DOOR AND IN A
// MACHINE THAT ALLOCATES NONE PER DOOR?
//
// It answers ONE question about ONE backend — `@exodra/string`, rendering 1000 rows of one
// component — and it compares no frameworks. It is registered as an axis only so it can reuse the
// runner that already starts Vite, drives headless Chromium and forwards the browser's console.
//
// ═══ WHY IT IS ON THE SERVER, AND THIS IS THE WHOLE REASON THE FILE EXISTS ═══════════════════
//
// THE SAME QUESTION HAS BEEN ASKED ON THE DOM TWICE AND REFUSED TWICE. `handler-count.ts` is that
// axis: the identical three arms (floor, wire, machine) over the identical three rungs (1, 4, 16
// doors), against `@exodra/dom`. The best resolution it reached was 0.0098 ms per 32-instance
// scene — 306 ns PER INSTANCE — and the effect it was built to see sits underneath that. Nine
// minutes of wall clock and no verdict.
//
// ON THIS BACKEND THE SAME STYLE OF INSTRUMENT RESOLVES 10 ns PER INSTANCE. Read
// `measurements/ssr-floor.published.json` and `axes/floors/ssr-floor.ts`. From that recording:
// quantum 0.100 ms, 40 renders per timed region, so ONE CLOCK GRAIN IS 0.0025 ms PER RENDER, and
// over 1000 rows that is 2.5 ns PER INSTANCE. Against that grain it separated `+try` 0.2075 from
// `+stack` 0.2175 — 10 ns per instance, the connector pool's own price — and `+reset` 0.1850 from
// `+set` 0.2100, 5 ns per port write. Its null pair (`esc` 0.1125 / `esc·twin` 0.1125) landed
// EXACTLY equal.
//
// SO THE SUBJECT WAS NEVER THE DOM. Clone, insert, layout, and a byte-identity gate that has to
// serialise the document after every click are what made the question unanswerable. A server render
// has none of them: the string IS the whole product, the gate is a string comparison, and the only
// thing between the wire and the bytes is the work this axis varies.
//
// THIS AXIS THEREFORE DOES NOT ANSWER `handler-count`'s QUESTION, IT ANSWERS ITS SIBLING. A DOM
// handler is a closure that must survive the wire and be reachable from a dispatch; a server door
// is a closure that lives for the length of one instance's wire and is then garbage. Both are one
// function object per door per instance, which is why the rungs are deliberately THE SAME THREE, so
// that the two tables can be read beside each other — but a figure from here is not a figure about
// the DOM and may not be quoted as one.
//
// ═══ WHAT A "DOOR" IS HERE, AND WHY IT IS NOT AN EVENT HANDLER ════════════════════════════════
//
// `c.on` prints nothing on this backend — there are no events on the server — so the free variable
// cannot be the handler count. It is THE DOORS THE WIRE CREATES AND CALLS: the `setName`,
// `setWidth`, `bump` functions a component makes so that the rest of its body can name a change
// once and perform it in one place.
//
//   IN A WIRE they are closures over the instance's own state, built fresh for every instance:
//
//       const s = { i: 0, k: 0 };
//       const d0 = (): void => { s.k = (s.k * 7 + 13) % 10000; };   // ← one function object,
//       const d1 = (): void => { s.k = (s.k + s.i * 3) % 10000; };  //   per door, PER INSTANCE
//       d0();
//       d1();
//
//   IN A MACHINE they are TRANSITIONS DECLARED ON THE BUILDER, once per component at module load,
//   and each one takes the instance:
//
//       const DOOR_0 = m.transition((c: TMS): void => {
//           const s = c.readState(K);                         // ← the state comes off the instance
//           s.k = (s.k * 7 + 13) % 10000;
//       });
//       DOOR_0(c);                                       // ← nothing allocated per DOOR
//
// `m.transition` IS WHY THE DOOR TAKES THE INSTANCE AND NOT THE STATE, and it is the one thing that
// settles the shape rather than arguing for it. A transition's subject is the exonode
// (`TExoMachineBuilder.transition`), so a door declared as one must reach its values through
// `c.kept` — the passed form named further down is not merely unmeasured here, it is not spellable
// as a transition at all.
//
// ON A PLAIN `createExoMachineBuilder` A TRANSITION IS ITS OWN BODY. `createExoMachineBuilder.ts` hands `apply` straight back:
// there is no program to settle, because nothing here derives. So declaring the doors this way costs
// the run NOTHING and buys the file a structural fact where it used to carry an argument — and the
// identity gate that used to check that fact is struck, its note standing above `gateShapes`.
// Composing `withExoComputedMachine` would be the dear spelling and is still refused: it would put a
// second engine effect and a compiled program on every one of the 1000 instances per render to
// obtain a wrapper `exoTransition.ts:22-25` would then decline to build.
//
// ═══ WHAT IS HELD CONSTANT AND WHAT MOVES ════════════════════════════════════════════════════
//
//   CONSTANT AT EVERY RUNG   1000 rows per render · the markup, character for character · five
//                            ports on the row · FIVE PORT WRITES per row · one state object per
//                            instance · the four escaped values · the `<ul>` wrapper.
//   MOVES WITH THE RUNG      how many doors each instance owns, hence how many function objects the
//                            wire allocates per instance: N at rung N, and ZERO for the machine.
//
// THE DOORS' WORK REACHES THE OUTPUT, WHICH IS WHY THE BYTES DIFFER BY RUNG AND NOT BY ARM. Every
// door folds one distinct arithmetic step into the row's accumulator `k`, and `k` is printed in the
// row's last span. So a door that did not run changes the page, and the gate that compares the page
// character for character is the same gate that proves the doors ran. Bytes are therefore identical
// ACROSS THE SIX PROGRAMS OF A RUNG and different BETWEEN RUNGS, and each rung carries its own
// reference.
//
// ═══ THE TRAP, NAMED BY THE OWNER, AND THE THREE THINGS DONE ABOUT IT ═════════════════════════
//
// A DOOR THAT IS DECLARED AND NEVER CALLED IS STILL ALLOCATED, BUT V8 NEVER COMPILES ITS BODY — it
// stays at the pre-parse. A ladder of unused doors therefore prices N allocations and N pre-parses,
// which is not what N working doors cost, and the error flatters the wire. So:
//
//  1. EVERY DECLARED DOOR IS CALLED INSIDE THE MEASURED REGION, with a real body doing real work,
//     DISTINCT PER DOOR — sixteen different arithmetic steps, listed in `THE SIXTEEN DOORS` below.
//     No `() => {}`, and no body copied from its neighbour.
//  2. THE WIRE'S DOORS ARE WRITTEN OUT PER RUNG AND NOT BUILT IN A LOOP. A loop gives ONE
//     `SharedFunctionInfo` instantiated N times — one compiled body, one feedback vector, one
//     inline-cache set — and that is not what N doors cost. Rung 16 has sixteen textual declarations
//     in its wire, rung 4 has four, and the twin family has its own sixteen and its own four.
//  3. A COUNTER PER DOOR, AND IT IS CHECKED FOR GROWTH ACROSS THE TIMED ROUNDS RATHER THAN FOR
//     BEING NON-ZERO. The count is snapshotted after the gates and compared after the last round,
//     so a door that ran only during gating or only during warm-up is refused BY NAME, with its
//     arm, its rung and its index.
//
// WHAT THE COUNTER COSTS AND WHY IT DOES NOT BEND THE ANSWER: one `Uint32Array` element increment
// per door call, IN ALL THREE ARMS, at the same place in the body. It makes every door dearer by
// the same amount, so it cancels exactly in every difference this axis quotes — and it inflates the
// absolute per-door figures, which is why those are labelled as "a door plus its counter" wherever
// they appear.
//
// ═══ THE THREE ARMS ══════════════════════════════════════════════════════════════════════════
//
//   floor·n⟨N⟩     THE NATIVE FLOOR — a straight-line program with no abstraction: no component, no
//                  schema, no connector, no object, no closure and no call. The N door bodies are N
//                  STATEMENTS over two locals, and the row is one `+=` over merged static pieces
//                  with the shipped escapers on the five dynamic values. Byte-identical output.
//   wire·n⟨N⟩      `@exodra/string` rendering a component whose wire builds N closures per instance
//                  and calls them.
//   machine·n⟨N⟩   the IMPERATIVE machine: one `createExoMachineBuilder` per component, its state in the cache
//                  slot (`m.keep`), N doors declared once per component as TRANSITIONS, and ZERO
//                  function objects PER DOOR. It allocates ONE function per INSTANCE and not per
//                  door — the teardown closure `armExoNode` files for the mount effect below
//                  — which is a constant addend at every rung and is what this arm pays for being
//                  written by hand rather than by a wire.
//
// EACH OF THE NINE HAS ITS OWN SEPARATELY-DECLARED TWIN — family `A` is the subject and family `B`
// is a second, independent declaration of the identical program: its own declaration, its own
// schema, its own piece constants, its own author pool, its own sixteen door bodies. A twin is
// DUPLICATED SOURCE and not a second call to one function, for `mount-floor`'s reason: calling one
// function twice shares everything V8 learned about it and measures a floor far below the one a
// real pair of programs sits on. Their true difference is ZERO by construction, and what the pair
// returns is what this instrument returns when there is nothing to see.
//
// ═══ WHY THESE THREE RUNGS ═══════════════════════════════════════════════════════════════════
//
//   n1    THE SMALLEST POSSIBLE LADDER STEP, and the rung where a false "no difference" is most
//         likely. One closure per instance is predicted at 8-15 ns, which is 3-6 grains: it is at
//         the edge of what this clock can express, and saying so before the run is the point of
//         having it.
//   n4    AN ORDINARY ROW COMPONENT. Four doors is what a row with a title, a link, a badge and a
//         count actually declares.
//   n16   A FAT COMPONENT, and the rung that must show the effect if anything does: 16 000 function
//         objects per render against the machine's zero, predicted at 50-100 grains.
//
// THEY ARE `handler-count`'s RUNGS ON PURPOSE — see the top of this file. THE 32-DOOR RUNG IS NOT
// BUILT and the reason is the same one that axis gives: distinctness is hand-written source, and 32
// bodies across six programs is a file nobody would check.
//
// THE LADDER IS NESTED: rung 4's doors are rung 1's door plus three, and rung 16's are rung 4's
// plus twelve. So "one more door" is a clean subtraction along the ladder, and the two intervals
// (1→4 over three doors, 4→16 over twelve) give the per-door increment TWICE, which is the only
// thing that turns three medians into a shape rather than three numbers.
//
// ═══ WHAT AN INSTANCE COSTS, PER ARM, READ OFF THE TWO PACKAGES' SOURCE ═══════════════════════
//
//   floor      nothing. Two locals in a loop.
//   wire       ONE context (the wire's scope, because N closures capture `s`), ONE state object,
//              and N FUNCTION OBJECTS. Per door call: one call through a context slot, one context
//              load for `s`, and the body.
//   machine    FIVE ALLOCATIONS ON TOP OF THE EXONODE EVERY ARM PAYS, AND NO FUNCTION OBJECT PER
//              DOOR. `armExoNode` builds a `new Array(rows)` of one slot and runs the cache
//              seeder (the author's object); there is no instance WRAPPER, the exonode IS the
//              instance. Then, BECAUSE THIS COMPONENT DECLARES ONE EFFECT, it also builds the
//              `effectStops` array, the teardown CLOSURE it files with `onTeardown`, and the `disposers`
//              array that closure lands in. Per door call: one call to a module-level transition,
//              plus `c.kept`'s call and its two loads.
//
// THE THREE EXTRA ALLOCATIONS ARE THE PRICE OF THE MOUNT EFFECT, AND THE EFFECT IS THE PRICE OF
// THIS BACKEND. A machine takes no props and has no wire, so the only per-instance hook a SERVER
// render offers is a declaration: keep-seeders, handlers and effects, and of those only an effect
// runs with `enode.state` already installed — which is what `c.kept` reads. The DOM's machines
// reach their instances the other way (`c.build` hands back a child and the caller fires
// transitions at it before inserting it); a server instance is finished the moment it is built, so
// there is no such moment here, and the mount effect IS this backend's spelling of "fire the
// transitions by hand". `withExoComputedMachine`'s own `m.fill` compiles to exactly one such
// effect, which is why this is the shipped shape and not a workaround.
//
// ALL THREE LAND IN THE INTERCEPT: they are the same three at rung 1 and at rung 16. Nothing here
// moves with N, so the SLOPE — which is this axis's claim — is untouched by them, and at rung 1 the
// machine arm now allocates as many function objects as the wire arm does. Read the ladder, not the
// row.
//
// SO THE PER-DOOR DIFFERENCE THIS AXIS MEASURES IS NOT "AN ALLOCATION" ON ITS OWN. It is
// (one function object + a context-slot call) against (a module-level call + `c.kept`), and the
// file says so everywhere it prints the number. The floor is what separates the two compound terms
// from the ARITHMETIC they share: `wire − floor` and `machine − floor` are each a door's spelling
// with its work taken off.
//
// ═══ ONE RUNG I DID NOT BUILD, AND EXACTLY WHAT IT WOULD SETTLE ═══════════════════════════════
//
// `machine·passed` — the same machine whose mount effect fetches the cache ONCE and hands it to
// every door as a second argument. That would split the machine's per-door cost into the CALL and
// the `c.kept` LOOKUP, which is the one term that opposes the wire's allocation inside the slope.
// It is not here for two reasons and the second is now structural: a door fired from an event has
// only the instance and must fetch the cache itself (`handler-count`'s machine arm fetches per door
// for the same reason), and a door that takes anything but the instance CANNOT BE DECLARED WITH
// `m.transition` at all — its subject is the exonode. So the passed form would have to abandon the
// door mechanism this arm exists to price. If the two slopes come out level, this is still the
// first row to add, and until it exists "the machine's door is as dear as the wire's" and "`c.kept`
// is as dear as an allocation" are the same measurement.
//
// ═══ WHAT COULD NOT BE MADE SYMMETRIC, AND WHAT EACH ONE DOES TO THE NUMBERS ══════════════════
//
//  1. NEITHER LIBRARY ARM IS HANDED ITS ROW NUMBER, AND THAT IS THE MACHINE'S DOING. A MACHINE
//     TAKES NO PROPS AT ALL — `TExoMachine` is a schema and a plan, there is no wire to
//     receive an item and no props slot to carry one — so `c.list` renders 1000 identical rows and
//     the row number cannot arrive with the row. Both library arms therefore take it from ONE
//     module-level counter, reset at the top of each render by the list wrapper, and `c.list` hands
//     both of them an item they ignore. THE COST OF THAT DECISION: a real application gives a
//     machine row its data by firing a transition at the instance, which on this backend it cannot
//     do at all (see the mount-effect note above) and on the DOM costs a `c.build` and an
//     `insert` per row. So the intercept here is LOWER than a direct row's really is, and the
//     honest reading of the ladder is the SLOPE, which is what this axis claims.
//  2. BOTH LIBRARY ARMS WRITE THEIR FIVE PORTS THROUGH `c.set`, AND THERE IS NO LONGER A SECOND
//     DOOR TO CHOOSE INSTEAD. `TExoWiring`'s own note says it — "THERE IS NO THIRD WRITE DOOR"
//     — and the remaining pair, `portTable()` and `portNodeWriter()`, costs two calls per write
//     against `set`'s one. So the five writes are the IDENTICAL function on both arms and no part
//     of the constant tail is a difference of mechanism. WHAT THIS CAVEAT USED TO SAY, and no
//     longer can: the machine reached the writes through `c.connector.set`, one property load per
//     write dearer than the wire's. The connector is gone — the exonode IS the instance — so that
//     asymmetry is gone with it and the intercept lost five property loads.
//  3. THE FLOOR'S ROPE IS SHORTER THAN THE LIBRARY'S. The floor merges the attribute heads into its
//     static pieces (11 leaves per row); the schema owns ` data-id="` inside the value, so its
//     filler builds ~15. Every program's result is FLATTENED inside the timed region — a
//     six-character tail read, `ssr-floor`'s rule, because `+=` hands back a rope and a rope
//     cannot be written to a socket — so the floor pays a slightly cheaper flatten. It does not
//     change with the rung, so it is in the intercept and not in the slope.
//  4. `@exodra/string` IS NOT IN `vite.config.ts`'s `optimizeDeps.exclude` where `@exodra/core`,
//     `@exodra/dom` and `@exodra/forms` are, so Vite pre-bundles it while the
//     floor goes through the dev server's esbuild. THIS AXIS'S HEADLINE IS IMMUNE TO THAT and
//     `ssr-floor`'s is not: `wire` and `machine` are BOTH the pre-bundled package, so the asymmetry
//     cancels exactly between them. Only the two `− floor` columns carry it, and they carry it in
//     the library's favour, which makes every gap to the floor a LOWER bound.
//  5. THE COUNTER, item 3 of the trap block above.
//  6. MODULE-LOAD COST IS OUTSIDE EVERY TIMED REGION — eighteen declarations, eighteen schemas,
//     six compiled machines, 42 door transitions and six mount effects. That is fair to both
//     library arms for the reason `mount-floor` gives about its prototypes, and it is the
//     machine's own claim: what a component declares is paid once for the life of the process.
//
// ═══ THE PREDICTIONS, COMMITTED BEFORE THE PROGRAMS WERE WRITTEN ══════════════════════════════
//
// This is my model. It is JUDGEMENT plus code I read; I MEASURED NONE OF IT. Every falsifier is
// printed mechanically at the end so that nobody, including me, gets to choose them afterwards.
// Figures are ns PER INSTANCE unless stated; one grain is 2.5 ns per instance at batch 1.
//
//   (P0) NO PREDICTION IS MADE ABOUT THE DIRECTION OF `wire − machine` AT ANY SINGLE RUNG, and
//        that is a commitment rather than an omission. A rung's difference is a slope term plus an
//        intercept, the intercept is three allocations against one plus a handful of calls, and
//        nothing I can read off the source says which of those two is larger. WHAT IS PREDICTED IS
//        A SHAPE ACROSS RUNGS. If this file is ever quoted as "the machine is faster/slower on the
//        server", the quotation is against its own text.
//
//   (P1) THE DOOR IS VISIBLE AT ALL: `(wire·n16 − wire·n4) / 12` lands between 8 and 25 ns per
//        instance per door. MECHANISM: one JSFunction allocation (four to six words in the young
//        generation, no context — the context is allocated once per instance whatever N is), one
//        call through a context slot, one context load, and the body. KILLER: under 4 ns/door and a
//        closure in a wire is cheaper than this instrument can see across twelve doors of
//        separation. Over 40 ns/door and something other than an allocation is growing with N — the
//        named candidate is the wire's own context, whose slot count grows with the number of
//        declared doors.
//
//        AND IF IT FAILS LOW, THE FIRST CANDIDATE IS NOT THE INSTRUMENT — IT IS ESCAPE ANALYSIS,
//        AND IT IS NAMED HERE RATHER THAN AFTER THE RUN. NONE OF THIS WIRE'S DOORS ESCAPE: they are
//        built, called, and dropped inside one function, and the wire is called 1000 times per
//        render, so it will be optimised. TurboFan is entitled to scalarise every one of them and
//        allocate nothing at all — in which case the wire's slope is its ARITHMETIC and the axis's
//        honest answer is "on the server, a wire's non-escaping doors can cost nothing, because the
//        engine removes them", which is a finding and not a failure.
//        IT IS ALSO A REAL DIFFERENCE FROM THE DOM, where a door is handed to `c.on` and therefore
//        escapes by construction — `handler-count`'s wire arm cannot have its closures removed and
//        this one can. If (P1) comes back at the floor, the row to add is a `wire·escapes` arm whose
//        doors are stored somewhere the optimiser cannot see through, and the pair of them is what
//        would price the elimination itself. It is not built here because the escaping form is not
//        what a server component writes.
//
//   (P2) THE SLOPE IS LINEAR IN N: the per-door increment over 1→4 and the one over 4→16 agree
//        within a factor of 2, on all three arms. MECHANISM: N identical allocations, N identical
//        calls, N nested arithmetic steps, and one context whose size grows by one slot per door.
//        KILLER: a factor over 2 on any arm. The named candidates, in the order I would look:
//        V8's context sizing, a de-optimisation at rung 16 that rung 4 does not reach, and the
//        16-door wire body crossing an inlining budget the 4-door one is under.
//
//   (P3) THE MACHINE'S LINE IS FLATTER THAN THE WIRE'S: `(machine·n16 − machine·n1)` is smaller
//        than `(wire·n16 − wire·n1)` by more than the coarsest of those four rows' own resolutions
//        AND by more than four grains. MECHANISM: per door the wire allocates and the machine does
//        not; everything else about the two doors is a call and a load. KILLER: the machine's slope
//        at or above the wire's — then `c.kept`'s call and two loads cost at least as
//        much as a function object, the cache is the wrong place for imperative state, and
//        `machine·passed` (named above) becomes the next thing to build rather than the next thing
//        to argue.
//
//   (P4) THE FLOOR'S SLOPE IS THE SMALLEST OF THE THREE AND IS NOT ZERO: between 2 and 8 ns per
//        door per instance. MECHANISM: the body is real work — a multiply, an add and a `%` on two
//        locals — plus the counter increment, and no call and no allocation. KILLER: a floor slope
//        level with the wire's, which would mean a door costs what its ARITHMETIC costs in every
//        spelling and that every difference on this axis is the `%` operator; or a floor slope at
//        zero, which would mean V8 folded the ladder and the whole file is measuring nothing —
//        the byte gate would still pass, because the fold would produce the right answer.
//
//   (P5) THE INTERCEPT IS A CONSTANT: `(wire − machine)` at each rung, minus the fitted slope
//        difference times N, agrees across the three rungs within the coarsest of the six rows'
//        resolutions. MECHANISM: the arms differ per instance by two allocations, four calls and
//        five property loads, none of which has anything to do with N. KILLER: an intercept that
//        moves with the rung — then the two arms differ in something this file has not named, and
//        no per-door figure in the table is a per-door figure.
//
//   (P6) EVERY ONE OF THE NINE NULL PAIRS IS ORDERING OR NOTHING: `|intrinsic| ≤ noise` for all
//        nine. MECHANISM: the two halves are transcriptions of one program. KILLER: any pair whose
//        intrinsic stands out of its own noise — that ROW is then unquotable, not merely its null,
//        because two declarations of one program that differ in a way which does not flip with the
//        running order are two different programs.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ════════════════════
//
//  * NOTHING ABOUT EVENT DISPATCH. There are no events here and no listener is ever installed.
//    `handler-count` is that question, on the backend where it can be asked.
//  * NOTHING ABOUT DOM WRITES, CLONING, INSERTION, LAYOUT OR TEARDOWN. Nothing here touches a node.
//  * NOTHING ABOUT ANY BACKEND BUT THE SERVER. V8 is V8, but a wire that runs against
//    `@exodra/dom` allocates into a heap with a live document in it and its doors outlive the wire.
//  * NOTHING ABOUT UPDATES. A server render is all mount; no door here is ever fired twice against
//    one instance, and the commit path (`commitExoMachine`, the mark word, the inversion, the wake
//    chains) is on NO path in this file — these machines declare no `m.derive` and no `m.fill`, and
//    the ONE `m.effect` each declares is the mount paint, which returns `null` and is never
//    restarted. A transition declared on a plain `createExoMachineBuilder` IS its body, so no door carries a
//    settle either.
//  * NOTHING ABOUT STATE WIDTH. Every rung carries ONE accumulator and one row number, whatever N
//    is; `machine-state-shapes.ts` is the axis that varies the state and not the doors.
//  * NOTHING ABOUT WHAT A DOOR DOES. Sixteen arithmetic bodies of one statement each. A door that
//    allocated, called into a package or touched a string would move every figure here.
//  * NOTHING ABOUT MEMORY. No heap column is printed and none would mean anything across arms
//    whose allocation shapes differ this much.
//  * NOTHING ABOUT A DOOR THAT ESCAPES. Every door here is built, called and dropped inside one
//    wire, which is what a server component's is; a DOM component's door is handed to `c.on` and
//    outlives the wire, and an engine's freedom to remove the first is not freedom to remove the
//    second. See (P1)'s second paragraph — this is the difference between this axis and
//    `handler-count`, and it cuts in the wire's favour here.
//  * IT IS NOT A CLAIM THAT A WIRE SHOULD BECOME A MACHINE. A wire's doors close over the
//    instance, so they can be handed to anything; a machine's doors take it as an argument, so the
//    caller has to be holding one. That is a difference in what can be EXPRESSED, and this axis
//    prices only what it costs.
//
// ═══ HOW TO RUN IT, WITH THE ARITHMETIC ══════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- door-count 100 1 --record=first
//
// BATCH 1, ROUNDS 100, AND HERE IS WHERE BOTH COME FROM:
//
//   THE GRAIN. A timed region is `REPS × batch` renders read off ONE clock, so every median in the
//   table is a multiple of `quantum / (REPS × batch)`. At the 0.100 ms quantum this machine reports
//   and REPS 40, that is 0.0025 ms per render; over 1000 rows, 2.5 ns PER INSTANCE. The smallest
//   quantity in dispute — one closure at rung 1 — is predicted at 8-15 ns, which is 3-6 grains, and
//   the largest — sixteen of them — at 128-240 ns, which is 51-96. A run whose smallest subject is
//   three grains is a run that can refuse rung 1 and still answer the question from the other two,
//   which is why rung 1 is here and why the refusal names batch 2 rather than pretending.
//   THE CLOCK FLOOR. The cheapest region (`floor·n1`, ~0.12 ms per render) is 4.8 ms at batch 1 —
//   48 ticks of a 0.100 ms clock against the 3-tick floor. Batch 1 is not close to the clamp; the
//   batch is for the GRAIN, not for the clock.
//   ROUNDS. The medians are of 100 samples per phase, and the disputed quantities are 3 to 96
//   grains. `ssr-floor`'s re-run advice (400 rounds) was written for quantities of ONE to FIVE
//   grains and does not apply here; 100 rounds is chosen so that the run costs half a minute rather
//   than four, and the null block is what says whether it was enough.
//   WALL CLOCK. Eighteen phases, ~250 ms of timed region and GC per round, 100 rounds plus six
//   warm-up rounds: SECONDS, and about half a minute of them. That is the whole point of moving
//   this question off the DOM, where the same three rungs cost nine minutes and answered nothing.
//
// IF RUNG 1's PAIRS DO NOT SEPARATE, the run says so by name and the second run is
// `door-count 100 2` — batch 2 halves the grain to 1.25 ns per instance and doubles the wall clock.
//
// `@exodra/string` and `@exodra/core` are resolved to their BUILT dists, so `npm run build` at the
// repo root has to have run, or every library row is last week's renderer.
import {
    escapeExoAttributeValue,
    escapeExoText,
    createExoMachineBuilder,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoAttrPort,
    TExoPort,
    TExoCursorDeclaration,
    TExoTextPort,
} from '@exodra/core';
import { ExoStrBackend, exoStrSchemaOf } from '@exodra/string';
import type { TExoStrNode, TExoStrMachine } from '@exodra/string';
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';
import type { TExoMachineInitialState } from '@exodra/core';

/** The server backend, built once at module load. It composes nothing, so it is the shipped path. */
const EXO_STR = new ExoStrBackend();

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE JOB.
//
// 1000 ROWS because that is the size `ssr-floor` measured and the size its published grain
// arithmetic is stated in, and because a row of this shape is ~150 characters — 1000 of them is a
// real list page rather than a micro-benchmark's toy.
//
// THE RUNGS ARE `handler-count`'s. See the header.
// ---------------------------------------------------------------------------------------

const ROWS = 1000;

const RUNGS: readonly number[] = [1, 4, 16];

type Arm = 'floor' | 'wire' | 'machine';
const ARMS: readonly Arm[] = ['floor', 'wire', 'machine'];

/** Renders per timed region, before the batch multiplies it. `ssr-floor`'s, for its grain. */
const REPS = 40;

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

/**
 * THE ROW NUMBER, AND WHY IT IS A COUNTER — caveat (1) in the header, in one sentence: a machine
 * takes NO PROPS, so `c.list` cannot hand one its row number and there is no wire to receive it,
 * and both library arms therefore take it from here instead. Reset by every list wrapper at the top
 * of every render, inside the timed region.
 */
let NEXT_ROW = 0;

/**
 * THE STATE ONE INSTANCE KEEPS — the row number and the accumulator every door folds into.
 *
 * ONE SHAPE FOR BOTH LIBRARY ARMS. The wire builds it as an object literal; the machine's cache
 * seeder builds the identical literal. So the doors' property access is the same operation in both,
 * and the difference between the arms is the allocation and the call, which is the subject.
 */
interface TDoorState {
    i: number;
    k: number;
}

/** Eight short ASCII names, none of which contains anything the escapers replace. */
const AUTHORS_A: readonly string[] = [
    'Ada',
    'Grace',
    'Alan',
    'Edsger',
    'Barbara',
    'Donald',
    'Ken',
    'Dennis',
];

/** The twin family's own copy — its own array object, so no row reads the other's. */
const AUTHORS_B: readonly string[] = [
    'Ada',
    'Grace',
    'Alan',
    'Edsger',
    'Barbara',
    'Donald',
    'Ken',
    'Dennis',
];

// ---------------------------------------------------------------------------------------
// THE SIXTEEN DOORS.
//
// Each one is ONE arithmetic step folding into `k`, and every one of them is DISTINCT — a different
// expression, not the same expression with a different constant where that could be avoided. Four
// of them read the row number as well, so that the row's identity is live inside the ladder and no
// door can be folded to a constant.
//
//   d0    k = (k * 7 + 13) % 10000          d8    k = (k + 4321) % 10000
//   d1    k = (k + i * 3) % 10000           d9    k = (k * 5 + 2) % 10000
//   d2    k = (k ^ 685) % 10000             d10   k = (k | 1) % 10000
//   d3    k = (k * 3 + 1) % 10000           d11   k = (k * 2 + (i & 7)) % 10000
//   d4    k = (9999 - k) % 10000            d12   k = (k + 1234) % 10000
//   d5    k = (k + (k >> 3)) % 10000        d13   k = (k * 13 + 7) % 10000
//   d6    k = (k * 11 + i) % 10000          d14   k = (k ^ 1365) % 10000
//   d7    k = (k ^ (k >> 5)) % 10000        d15   k = (k * 3 + (i >> 2)) % 10000
//
// THE INVARIANT IS `k ∈ [0, 9999]` AND EVERY BODY PRESERVES IT, which is what lets the accumulator
// be printed as `10000 + k` — always five digits, so the page's byte count does not wander with the
// rung and the flatten is priced on the same number of characters everywhere.
//
// RUNG 1 IS d0, RUNG 4 IS d0-d3, RUNG 16 IS d0-d15. The ladder is nested, so a rung difference is
// the doors that were added and nothing else.
// ---------------------------------------------------------------------------------------

/**
 * THE CALL COUNTERS — one array per program, one slot per door, incremented at the top of every
 * door body in every arm.
 *
 * `Uint32Array` and not a plain array: a packed SMI array changes representation when a value
 * passes 2^31, which would be a perturbation arriving in the middle of a run. At 1000 rows × 40
 * renders × 106 rounds a door is called ~4.2 million times, which is three orders of magnitude
 * under this type's wrap.
 */
const counterFor = (doors: number): Uint32Array => new Uint32Array(doors);

const C_FA1 = counterFor(1);
const C_FA4 = counterFor(4);
const C_FA16 = counterFor(16);
const C_FB1 = counterFor(1);
const C_FB4 = counterFor(4);
const C_FB16 = counterFor(16);
const C_WA1 = counterFor(1);
const C_WA4 = counterFor(4);
const C_WA16 = counterFor(16);
const C_WB1 = counterFor(1);
const C_WB4 = counterFor(4);
const C_WB16 = counterFor(16);
const C_MA1 = counterFor(1);
const C_MA4 = counterFor(4);
const C_MA16 = counterFor(16);
const C_MB1 = counterFor(1);
const C_MB4 = counterFor(4);
const C_MB16 = counterFor(16);

// ---------------------------------------------------------------------------------------
// THE MARKUP.
//
//   <li class="row" data-id="7"><a class="t" href="/i/7">Task 7</a><span class="by">Ken</span>
//   <span class="k">10123</span></li>
//
// FIVE PORTS: two attributes, three texts. NO EVENT PORT, deliberately — a server event port owns a
// slot that prints nothing and cuts the static run in two (`ssr-floor`'s `+cut` rung prices that),
// and it would add a mechanism to the constant tail without adding anything to the subject.
//
// THE FLOOR'S PIECES ARE MERGED — ` data-id="` and ` href="` live in the static markup, which is
// what a program with no abstraction writes. The schema puts them inside the value because only a
// writer that owns the head can decline to write the attribute at all. The bytes are identical
// either way and the gate proves it; the rope is not, which is caveat (3).
// ---------------------------------------------------------------------------------------

const UL_OPEN = '<ul>';
const UL_CLOSE = '</ul>';

const FA0 = '<li class="row" data-id="';
const FA1 = '"><a class="t" href="';
const FA2 = '">';
const FA3 = '</a><span class="by">';
const FA4 = '</span><span class="k">';
const FA5 = '</span></li>';

const FB0 = '<li class="row" data-id="';
const FB1 = '"><a class="t" href="';
const FB2 = '">';
const FB3 = '</a><span class="by">';
const FB4 = '</span><span class="k">';
const FB5 = '</span></li>';

// ---------------------------------------------------------------------------------------
// THE SCHEMA DECLARATIONS. Six row declarations — one per (family, rung) — so that no two rungs
// and no two families share a schema, a port numbering or a connector pool.
//
// WITHIN A (FAMILY, RUNG) THE WIRE AND THE MACHINE SHARE ONE DECLARATION, which is
// `op-click-floor`'s rule and `handler-count`'s: one declaration, two wires, so nothing between
// those two rows is a difference of markup, of schema, of port numbering or of escaping.
// ---------------------------------------------------------------------------------------

interface TRowPorts {
    readonly id: TExoAttrPort;
    readonly href: TExoAttrPort;
    readonly title: TExoTextPort;
    readonly by: TExoTextPort;
    readonly k: TExoTextPort;
}

function makeRowSchema(): TExoCursorDeclaration<TRowPorts> {
    return createExoSchema<TRowPorts>((b) => {
        let id!: TExoAttrPort;
        let href!: TExoAttrPort;
        let title!: TExoTextPort;
        let by!: TExoTextPort;
        let k!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            id = li.port('data-id');
            li.el('a', { class: 't' }, (a) => {
                href = a.port('href');
                title = a.textPort();
            });
            li.el('span', { class: 'by' }, (span) => {
                by = span.textPort();
            });
            li.el('span', { class: 'k' }, (span) => {
                k = span.textPort();
            });
        });
        return { id, href, title, by, k };
    });
}

const S_A1 = makeRowSchema();
const S_A4 = makeRowSchema();
const S_A16 = makeRowSchema();
const S_B1 = makeRowSchema();
const S_B4 = makeRowSchema();
const S_B16 = makeRowSchema();

const PA1 = S_A1.ports;
const PA4 = S_A4.ports;
const PA16 = S_A16.ports;
const PB1 = S_B1.ports;
const PB4 = S_B4.ports;
const PB16 = S_B16.ports;

interface TListPorts {
    readonly rows: TExoChildrenPort;
}

function makeListSchema(): TExoCursorDeclaration<TListPorts> {
    return createExoSchema<TListPorts>((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
}

/**
 * THE LIST WRAPPER — one `<ul>`, one children port, one `c.list`, and the counter reset.
 *
 * A NEW DECLARATION PER CALL, so no two programs share the wrapper's schema or its connector. The
 * reset is INSIDE the timed region, as it must be: it is one store per render and it is what makes
 * the row numbers of two consecutive renders identical, which the byte gate then proves.
 */
function listOver<TItem>(row: TExoStrMachine, items: readonly TItem[]): TExoStrMachine {
    const schema = makeListSchema();
    const port = schema.ports.rows;
    return {
        declaration: schema,
        forms: [],
        createInitialState: (c: TExoStrNode): void => {
            NEXT_ROW = 0;
            c.list(port, row, items.length);
        },
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    };
}

// ---------------------------------------------------------------------------------------
// ARM 1 — THE NATIVE FLOOR. Straight-line `+=`, the shipped escapers, no component, no schema, no
// connector, no object, no closure and no call. The N door bodies are N STATEMENTS over two locals.
//
// THE ESCAPERS ARE NOT OPTIONAL AND THIS IS NOT A STYLE CHOICE: a server program that prints a
// value into a text position without escaping it is not a faster program, it is an injection, and
// `ssr-floor`'s header has the sufficiency argument. The two functions here are the ones the
// schema's own writers call.
//
// `String(i)` IS EXPLICIT because the shipped attribute writer stringifies a non-string before
// escaping it and the wire hands it the number; doing it here is what keeps the two programs paying
// for the same conversion.
// ---------------------------------------------------------------------------------------

function floorA1(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        let k = 0;
        C_FA1[0]++;
        k = (k * 7 + 13) % 10000;
        html +=
            FA0 +
            escapeExoAttributeValue(String(i)) +
            FA1 +
            escapeExoAttributeValue('/i/' + i) +
            FA2 +
            escapeExoText('Task ' + i) +
            FA3 +
            escapeExoText(AUTHORS_A[i & 7]) +
            FA4 +
            escapeExoText(String(10000 + k)) +
            FA5;
    }
    return html + UL_CLOSE;
}

function floorA4(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        let k = 0;
        C_FA4[0]++;
        k = (k * 7 + 13) % 10000;
        C_FA4[1]++;
        k = (k + i * 3) % 10000;
        C_FA4[2]++;
        k = (k ^ 685) % 10000;
        C_FA4[3]++;
        k = (k * 3 + 1) % 10000;
        html +=
            FA0 +
            escapeExoAttributeValue(String(i)) +
            FA1 +
            escapeExoAttributeValue('/i/' + i) +
            FA2 +
            escapeExoText('Task ' + i) +
            FA3 +
            escapeExoText(AUTHORS_A[i & 7]) +
            FA4 +
            escapeExoText(String(10000 + k)) +
            FA5;
    }
    return html + UL_CLOSE;
}

function floorA16(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        let k = 0;
        C_FA16[0]++;
        k = (k * 7 + 13) % 10000;
        C_FA16[1]++;
        k = (k + i * 3) % 10000;
        C_FA16[2]++;
        k = (k ^ 685) % 10000;
        C_FA16[3]++;
        k = (k * 3 + 1) % 10000;
        C_FA16[4]++;
        k = (9999 - k) % 10000;
        C_FA16[5]++;
        k = (k + (k >> 3)) % 10000;
        C_FA16[6]++;
        k = (k * 11 + i) % 10000;
        C_FA16[7]++;
        k = (k ^ (k >> 5)) % 10000;
        C_FA16[8]++;
        k = (k + 4321) % 10000;
        C_FA16[9]++;
        k = (k * 5 + 2) % 10000;
        C_FA16[10]++;
        k = (k | 1) % 10000;
        C_FA16[11]++;
        k = (k * 2 + (i & 7)) % 10000;
        C_FA16[12]++;
        k = (k + 1234) % 10000;
        C_FA16[13]++;
        k = (k * 13 + 7) % 10000;
        C_FA16[14]++;
        k = (k ^ 1365) % 10000;
        C_FA16[15]++;
        k = (k * 3 + (i >> 2)) % 10000;
        html +=
            FA0 +
            escapeExoAttributeValue(String(i)) +
            FA1 +
            escapeExoAttributeValue('/i/' + i) +
            FA2 +
            escapeExoText('Task ' + i) +
            FA3 +
            escapeExoText(AUTHORS_A[i & 7]) +
            FA4 +
            escapeExoText(String(10000 + k)) +
            FA5;
    }
    return html + UL_CLOSE;
}

function floorB1(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        let k = 0;
        C_FB1[0]++;
        k = (k * 7 + 13) % 10000;
        html +=
            FB0 +
            escapeExoAttributeValue(String(i)) +
            FB1 +
            escapeExoAttributeValue('/i/' + i) +
            FB2 +
            escapeExoText('Task ' + i) +
            FB3 +
            escapeExoText(AUTHORS_B[i & 7]) +
            FB4 +
            escapeExoText(String(10000 + k)) +
            FB5;
    }
    return html + UL_CLOSE;
}

function floorB4(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        let k = 0;
        C_FB4[0]++;
        k = (k * 7 + 13) % 10000;
        C_FB4[1]++;
        k = (k + i * 3) % 10000;
        C_FB4[2]++;
        k = (k ^ 685) % 10000;
        C_FB4[3]++;
        k = (k * 3 + 1) % 10000;
        html +=
            FB0 +
            escapeExoAttributeValue(String(i)) +
            FB1 +
            escapeExoAttributeValue('/i/' + i) +
            FB2 +
            escapeExoText('Task ' + i) +
            FB3 +
            escapeExoText(AUTHORS_B[i & 7]) +
            FB4 +
            escapeExoText(String(10000 + k)) +
            FB5;
    }
    return html + UL_CLOSE;
}

function floorB16(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        let k = 0;
        C_FB16[0]++;
        k = (k * 7 + 13) % 10000;
        C_FB16[1]++;
        k = (k + i * 3) % 10000;
        C_FB16[2]++;
        k = (k ^ 685) % 10000;
        C_FB16[3]++;
        k = (k * 3 + 1) % 10000;
        C_FB16[4]++;
        k = (9999 - k) % 10000;
        C_FB16[5]++;
        k = (k + (k >> 3)) % 10000;
        C_FB16[6]++;
        k = (k * 11 + i) % 10000;
        C_FB16[7]++;
        k = (k ^ (k >> 5)) % 10000;
        C_FB16[8]++;
        k = (k + 4321) % 10000;
        C_FB16[9]++;
        k = (k * 5 + 2) % 10000;
        C_FB16[10]++;
        k = (k | 1) % 10000;
        C_FB16[11]++;
        k = (k * 2 + (i & 7)) % 10000;
        C_FB16[12]++;
        k = (k + 1234) % 10000;
        C_FB16[13]++;
        k = (k * 13 + 7) % 10000;
        C_FB16[14]++;
        k = (k ^ 1365) % 10000;
        C_FB16[15]++;
        k = (k * 3 + (i >> 2)) % 10000;
        html +=
            FB0 +
            escapeExoAttributeValue(String(i)) +
            FB1 +
            escapeExoAttributeValue('/i/' + i) +
            FB2 +
            escapeExoText('Task ' + i) +
            FB3 +
            escapeExoText(AUTHORS_B[i & 7]) +
            FB4 +
            escapeExoText(String(10000 + k)) +
            FB5;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// ARM 2 — THE WIRE. N closures per instance, written out per rung.
//
// WHY THE DOORS ARE NOT BUILT IN A LOOP: item 2 of the trap block in the header. A loop over an
// array of bodies gives ONE `SharedFunctionInfo` instantiated N times — one compiled body and one
// feedback vector — and that is not what N doors cost.
//
// THE STATE OBJECT IS BUILT WHOLE, in one literal, before anything writes it: this repository has
// measured an 11% mount regression from growing a per-instance object field by field instead of
// letting V8 size it in place. The machine's cache seeder builds the identical literal.
// ---------------------------------------------------------------------------------------

const WIRE_A1: TExoMachineInitialState<TExoStrNode> = (c) => {
    const s: TDoorState = { i: 0, k: 0 };
    s.i = NEXT_ROW++;
    const d0 = (): void => {
        C_WA1[0]++;
        s.k = (s.k * 7 + 13) % 10000;
    };
    d0();
    c.attr(PA1.id, s.i);
    c.attr(PA1.href, '/i/' + s.i);
    c.text(PA1.title, 'Task ' + s.i);
    c.text(PA1.by, AUTHORS_A[s.i & 7]);
    c.text(PA1.k, 10000 + s.k);
};

const WIRE_A4: TExoMachineInitialState<TExoStrNode> = (c) => {
    const s: TDoorState = { i: 0, k: 0 };
    s.i = NEXT_ROW++;
    const d0 = (): void => {
        C_WA4[0]++;
        s.k = (s.k * 7 + 13) % 10000;
    };
    const d1 = (): void => {
        C_WA4[1]++;
        s.k = (s.k + s.i * 3) % 10000;
    };
    const d2 = (): void => {
        C_WA4[2]++;
        s.k = (s.k ^ 685) % 10000;
    };
    const d3 = (): void => {
        C_WA4[3]++;
        s.k = (s.k * 3 + 1) % 10000;
    };
    d0();
    d1();
    d2();
    d3();
    c.attr(PA4.id, s.i);
    c.attr(PA4.href, '/i/' + s.i);
    c.text(PA4.title, 'Task ' + s.i);
    c.text(PA4.by, AUTHORS_A[s.i & 7]);
    c.text(PA4.k, 10000 + s.k);
};

const WIRE_A16: TExoMachineInitialState<TExoStrNode> = (c) => {
    const s: TDoorState = { i: 0, k: 0 };
    s.i = NEXT_ROW++;
    const d0 = (): void => {
        C_WA16[0]++;
        s.k = (s.k * 7 + 13) % 10000;
    };
    const d1 = (): void => {
        C_WA16[1]++;
        s.k = (s.k + s.i * 3) % 10000;
    };
    const d2 = (): void => {
        C_WA16[2]++;
        s.k = (s.k ^ 685) % 10000;
    };
    const d3 = (): void => {
        C_WA16[3]++;
        s.k = (s.k * 3 + 1) % 10000;
    };
    const d4 = (): void => {
        C_WA16[4]++;
        s.k = (9999 - s.k) % 10000;
    };
    const d5 = (): void => {
        C_WA16[5]++;
        s.k = (s.k + (s.k >> 3)) % 10000;
    };
    const d6 = (): void => {
        C_WA16[6]++;
        s.k = (s.k * 11 + s.i) % 10000;
    };
    const d7 = (): void => {
        C_WA16[7]++;
        s.k = (s.k ^ (s.k >> 5)) % 10000;
    };
    const d8 = (): void => {
        C_WA16[8]++;
        s.k = (s.k + 4321) % 10000;
    };
    const d9 = (): void => {
        C_WA16[9]++;
        s.k = (s.k * 5 + 2) % 10000;
    };
    const d10 = (): void => {
        C_WA16[10]++;
        s.k = (s.k | 1) % 10000;
    };
    const d11 = (): void => {
        C_WA16[11]++;
        s.k = (s.k * 2 + (s.i & 7)) % 10000;
    };
    const d12 = (): void => {
        C_WA16[12]++;
        s.k = (s.k + 1234) % 10000;
    };
    const d13 = (): void => {
        C_WA16[13]++;
        s.k = (s.k * 13 + 7) % 10000;
    };
    const d14 = (): void => {
        C_WA16[14]++;
        s.k = (s.k ^ 1365) % 10000;
    };
    const d15 = (): void => {
        C_WA16[15]++;
        s.k = (s.k * 3 + (s.i >> 2)) % 10000;
    };
    d0();
    d1();
    d2();
    d3();
    d4();
    d5();
    d6();
    d7();
    d8();
    d9();
    d10();
    d11();
    d12();
    d13();
    d14();
    d15();
    c.attr(PA16.id, s.i);
    c.attr(PA16.href, '/i/' + s.i);
    c.text(PA16.title, 'Task ' + s.i);
    c.text(PA16.by, AUTHORS_A[s.i & 7]);
    c.text(PA16.k, 10000 + s.k);
};

const WIRE_B1: TExoMachineInitialState<TExoStrNode> = (c) => {
    const s: TDoorState = { i: 0, k: 0 };
    s.i = NEXT_ROW++;
    const d0 = (): void => {
        C_WB1[0]++;
        s.k = (s.k * 7 + 13) % 10000;
    };
    d0();
    c.attr(PB1.id, s.i);
    c.attr(PB1.href, '/i/' + s.i);
    c.text(PB1.title, 'Task ' + s.i);
    c.text(PB1.by, AUTHORS_B[s.i & 7]);
    c.text(PB1.k, 10000 + s.k);
};

const WIRE_B4: TExoMachineInitialState<TExoStrNode> = (c) => {
    const s: TDoorState = { i: 0, k: 0 };
    s.i = NEXT_ROW++;
    const d0 = (): void => {
        C_WB4[0]++;
        s.k = (s.k * 7 + 13) % 10000;
    };
    const d1 = (): void => {
        C_WB4[1]++;
        s.k = (s.k + s.i * 3) % 10000;
    };
    const d2 = (): void => {
        C_WB4[2]++;
        s.k = (s.k ^ 685) % 10000;
    };
    const d3 = (): void => {
        C_WB4[3]++;
        s.k = (s.k * 3 + 1) % 10000;
    };
    d0();
    d1();
    d2();
    d3();
    c.attr(PB4.id, s.i);
    c.attr(PB4.href, '/i/' + s.i);
    c.text(PB4.title, 'Task ' + s.i);
    c.text(PB4.by, AUTHORS_B[s.i & 7]);
    c.text(PB4.k, 10000 + s.k);
};

const WIRE_B16: TExoMachineInitialState<TExoStrNode> = (c) => {
    const s: TDoorState = { i: 0, k: 0 };
    s.i = NEXT_ROW++;
    const d0 = (): void => {
        C_WB16[0]++;
        s.k = (s.k * 7 + 13) % 10000;
    };
    const d1 = (): void => {
        C_WB16[1]++;
        s.k = (s.k + s.i * 3) % 10000;
    };
    const d2 = (): void => {
        C_WB16[2]++;
        s.k = (s.k ^ 685) % 10000;
    };
    const d3 = (): void => {
        C_WB16[3]++;
        s.k = (s.k * 3 + 1) % 10000;
    };
    const d4 = (): void => {
        C_WB16[4]++;
        s.k = (9999 - s.k) % 10000;
    };
    const d5 = (): void => {
        C_WB16[5]++;
        s.k = (s.k + (s.k >> 3)) % 10000;
    };
    const d6 = (): void => {
        C_WB16[6]++;
        s.k = (s.k * 11 + s.i) % 10000;
    };
    const d7 = (): void => {
        C_WB16[7]++;
        s.k = (s.k ^ (s.k >> 5)) % 10000;
    };
    const d8 = (): void => {
        C_WB16[8]++;
        s.k = (s.k + 4321) % 10000;
    };
    const d9 = (): void => {
        C_WB16[9]++;
        s.k = (s.k * 5 + 2) % 10000;
    };
    const d10 = (): void => {
        C_WB16[10]++;
        s.k = (s.k | 1) % 10000;
    };
    const d11 = (): void => {
        C_WB16[11]++;
        s.k = (s.k * 2 + (s.i & 7)) % 10000;
    };
    const d12 = (): void => {
        C_WB16[12]++;
        s.k = (s.k + 1234) % 10000;
    };
    const d13 = (): void => {
        C_WB16[13]++;
        s.k = (s.k * 13 + 7) % 10000;
    };
    const d14 = (): void => {
        C_WB16[14]++;
        s.k = (s.k ^ 1365) % 10000;
    };
    const d15 = (): void => {
        C_WB16[15]++;
        s.k = (s.k * 3 + (s.i >> 2)) % 10000;
    };
    d0();
    d1();
    d2();
    d3();
    d4();
    d5();
    d6();
    d7();
    d8();
    d9();
    d10();
    d11();
    d12();
    d13();
    d14();
    d15();
    c.attr(PB16.id, s.i);
    c.attr(PB16.href, '/i/' + s.i);
    c.text(PB16.title, 'Task ' + s.i);
    c.text(PB16.by, AUTHORS_B[s.i & 7]);
    c.text(PB16.k, 10000 + s.k);
};

const WIRE_A1_C: TExoStrMachine = {
    declaration: S_A1,
    forms: [],
    createInitialState: WIRE_A1,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_A4_C: TExoStrMachine = {
    declaration: S_A4,
    forms: [],
    createInitialState: WIRE_A4,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_A16_C: TExoStrMachine = {
    declaration: S_A16,
    forms: [],
    createInitialState: WIRE_A16,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_B1_C: TExoStrMachine = {
    declaration: S_B1,
    forms: [],
    createInitialState: WIRE_B1,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_B4_C: TExoStrMachine = {
    declaration: S_B4,
    forms: [],
    createInitialState: WIRE_B4,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const WIRE_B16_C: TExoStrMachine = {
    declaration: S_B16,
    forms: [],
    createInitialState: WIRE_B16,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

/** The item every wire instance is handed and ignores — the row number comes from `NEXT_ROW`. */
const ITEMS: readonly number[] = new Array<number>(ROWS).fill(0);

// ---------------------------------------------------------------------------------------
// ARM 3 — THE IMPERATIVE MACHINE. N doors declared ONCE PER COMPONENT as TRANSITIONS, the state in
// the cache slot, ZERO function objects PER DOOR.
//
// FOUR DECLARATIONS PER COMPONENT AND THEY ARE ALL THERE IS: one `m.keep` (the state), N
// `m.transition`s (the doors), one `m.effect` (the mount paint), and `done()`. No `m.derive`, no
// `m.fill`, no handler, no props and NO WIRE — a machine is a schema and a plan, which is why
// nothing in this arm can be handed a row number.
//
// EACH ORDER IS FORCED: `done()` SEALS the builder, so every transition and the effect are declared
// above it, and `createExoMachineBuilder.ts` throws by name on a declaration that arrives after.
//
// THE BODIES ARE WRITTEN OUT AND ARE DISTINCT, exactly as the wire's are, and each one fetches the
// cache itself through `c.kept` — which is what a door fired from an event would have to do, what
// `handler-count`'s machine arm does, and, since `m.transition`'s subject is the exonode, the only
// thing a door CAN do. The alternative (fetch once, pass it in) is the rung named in the header and
// not built.
//
// THE MOUNT PAINT IS THE ONE EFFECT. It is what fires the doors by hand and writes the five ports,
// and an effect is where it has to live: `armExoNode` installs `enode.state` only after the
// last keep-seeder has returned, so `c.kept` is unreadable inside a seeder and readable inside an
// effect. It takes the row number from the counter and returns `null`, holding nothing.
//
// AND A MACHINE MAY GO IN THIS BACKEND'S `c.list` WHERE IT MAY NOT GO IN THE DOM'S, which is the one
// thing about these eighteen programs that cannot be read off them. `TExoStrNodeApi.list` takes the
// whole component union; `TExoDomNodeApi.list` takes the wired arm alone, because a DOM machine is
// advanced by transitions fired at the instance and a fixed list hands no instance back. THERE IS NO
// SUCH LOSS HERE: a server instance is finished the moment it is built, so nothing could be fired at
// it whatever the list returned, and everything a row differs by has to be inside its declarations
// already. If that signature is ever narrowed to match the DOM's, this arm has no way to render.
// ---------------------------------------------------------------------------------------

/** The instance every door is handed — THE EXONODE ITSELF. There is no machine-instance wrapper:
 *  the object a transition and an effect receive IS the instance, and this backend's is
 *  `TExoStrNode`. */
type TMS = TExoStrNode;

const mA1 = createExoMachineBuilder<TExoStrNode>(S_A1);
const KA1 = mA1.createInitialState((): TDoorState => ({ i: 0, k: 0 }));
const DOOR_A1_0 = mA1.transition((c: TMS): void => {
    C_MA1[0]++;
    const s = c.readState(KA1);
    s.k = (s.k * 7 + 13) % 10000;
});
mA1.effect((c: TMS): null => {
    const s = c.readState(KA1);
    s.i = NEXT_ROW++;
    DOOR_A1_0(c);
    c.attr(PA1.id, s.i);
    c.attr(PA1.href, '/i/' + s.i);
    c.text(PA1.title, 'Task ' + s.i);
    c.text(PA1.by, AUTHORS_A[s.i & 7]);
    c.text(PA1.k, 10000 + s.k);
    return null;
});
const MACHINE_A1 = mA1.done();

const mA4 = createExoMachineBuilder<TExoStrNode>(S_A4);
const KA4 = mA4.createInitialState((): TDoorState => ({ i: 0, k: 0 }));
const DOOR_A4_0 = mA4.transition((c: TMS): void => {
    C_MA4[0]++;
    const s = c.readState(KA4);
    s.k = (s.k * 7 + 13) % 10000;
});
const DOOR_A4_1 = mA4.transition((c: TMS): void => {
    C_MA4[1]++;
    const s = c.readState(KA4);
    s.k = (s.k + s.i * 3) % 10000;
});
const DOOR_A4_2 = mA4.transition((c: TMS): void => {
    C_MA4[2]++;
    const s = c.readState(KA4);
    s.k = (s.k ^ 685) % 10000;
});
const DOOR_A4_3 = mA4.transition((c: TMS): void => {
    C_MA4[3]++;
    const s = c.readState(KA4);
    s.k = (s.k * 3 + 1) % 10000;
});
mA4.effect((c: TMS): null => {
    const s = c.readState(KA4);
    s.i = NEXT_ROW++;
    DOOR_A4_0(c);
    DOOR_A4_1(c);
    DOOR_A4_2(c);
    DOOR_A4_3(c);
    c.attr(PA4.id, s.i);
    c.attr(PA4.href, '/i/' + s.i);
    c.text(PA4.title, 'Task ' + s.i);
    c.text(PA4.by, AUTHORS_A[s.i & 7]);
    c.text(PA4.k, 10000 + s.k);
    return null;
});
const MACHINE_A4 = mA4.done();

const mA16 = createExoMachineBuilder<TExoStrNode>(S_A16);
const KA16 = mA16.createInitialState((): TDoorState => ({ i: 0, k: 0 }));
const DOOR_A16_0 = mA16.transition((c: TMS): void => {
    C_MA16[0]++;
    const s = c.readState(KA16);
    s.k = (s.k * 7 + 13) % 10000;
});
const DOOR_A16_1 = mA16.transition((c: TMS): void => {
    C_MA16[1]++;
    const s = c.readState(KA16);
    s.k = (s.k + s.i * 3) % 10000;
});
const DOOR_A16_2 = mA16.transition((c: TMS): void => {
    C_MA16[2]++;
    const s = c.readState(KA16);
    s.k = (s.k ^ 685) % 10000;
});
const DOOR_A16_3 = mA16.transition((c: TMS): void => {
    C_MA16[3]++;
    const s = c.readState(KA16);
    s.k = (s.k * 3 + 1) % 10000;
});
const DOOR_A16_4 = mA16.transition((c: TMS): void => {
    C_MA16[4]++;
    const s = c.readState(KA16);
    s.k = (9999 - s.k) % 10000;
});
const DOOR_A16_5 = mA16.transition((c: TMS): void => {
    C_MA16[5]++;
    const s = c.readState(KA16);
    s.k = (s.k + (s.k >> 3)) % 10000;
});
const DOOR_A16_6 = mA16.transition((c: TMS): void => {
    C_MA16[6]++;
    const s = c.readState(KA16);
    s.k = (s.k * 11 + s.i) % 10000;
});
const DOOR_A16_7 = mA16.transition((c: TMS): void => {
    C_MA16[7]++;
    const s = c.readState(KA16);
    s.k = (s.k ^ (s.k >> 5)) % 10000;
});
const DOOR_A16_8 = mA16.transition((c: TMS): void => {
    C_MA16[8]++;
    const s = c.readState(KA16);
    s.k = (s.k + 4321) % 10000;
});
const DOOR_A16_9 = mA16.transition((c: TMS): void => {
    C_MA16[9]++;
    const s = c.readState(KA16);
    s.k = (s.k * 5 + 2) % 10000;
});
const DOOR_A16_10 = mA16.transition((c: TMS): void => {
    C_MA16[10]++;
    const s = c.readState(KA16);
    s.k = (s.k | 1) % 10000;
});
const DOOR_A16_11 = mA16.transition((c: TMS): void => {
    C_MA16[11]++;
    const s = c.readState(KA16);
    s.k = (s.k * 2 + (s.i & 7)) % 10000;
});
const DOOR_A16_12 = mA16.transition((c: TMS): void => {
    C_MA16[12]++;
    const s = c.readState(KA16);
    s.k = (s.k + 1234) % 10000;
});
const DOOR_A16_13 = mA16.transition((c: TMS): void => {
    C_MA16[13]++;
    const s = c.readState(KA16);
    s.k = (s.k * 13 + 7) % 10000;
});
const DOOR_A16_14 = mA16.transition((c: TMS): void => {
    C_MA16[14]++;
    const s = c.readState(KA16);
    s.k = (s.k ^ 1365) % 10000;
});
const DOOR_A16_15 = mA16.transition((c: TMS): void => {
    C_MA16[15]++;
    const s = c.readState(KA16);
    s.k = (s.k * 3 + (s.i >> 2)) % 10000;
});
mA16.effect((c: TMS): null => {
    const s = c.readState(KA16);
    s.i = NEXT_ROW++;
    DOOR_A16_0(c);
    DOOR_A16_1(c);
    DOOR_A16_2(c);
    DOOR_A16_3(c);
    DOOR_A16_4(c);
    DOOR_A16_5(c);
    DOOR_A16_6(c);
    DOOR_A16_7(c);
    DOOR_A16_8(c);
    DOOR_A16_9(c);
    DOOR_A16_10(c);
    DOOR_A16_11(c);
    DOOR_A16_12(c);
    DOOR_A16_13(c);
    DOOR_A16_14(c);
    DOOR_A16_15(c);
    c.attr(PA16.id, s.i);
    c.attr(PA16.href, '/i/' + s.i);
    c.text(PA16.title, 'Task ' + s.i);
    c.text(PA16.by, AUTHORS_A[s.i & 7]);
    c.text(PA16.k, 10000 + s.k);
    return null;
});
const MACHINE_A16 = mA16.done();

const mB1 = createExoMachineBuilder<TExoStrNode>(S_B1);
const KB1 = mB1.createInitialState((): TDoorState => ({ i: 0, k: 0 }));
const DOOR_B1_0 = mB1.transition((c: TMS): void => {
    C_MB1[0]++;
    const s = c.readState(KB1);
    s.k = (s.k * 7 + 13) % 10000;
});
mB1.effect((c: TMS): null => {
    const s = c.readState(KB1);
    s.i = NEXT_ROW++;
    DOOR_B1_0(c);
    c.attr(PB1.id, s.i);
    c.attr(PB1.href, '/i/' + s.i);
    c.text(PB1.title, 'Task ' + s.i);
    c.text(PB1.by, AUTHORS_B[s.i & 7]);
    c.text(PB1.k, 10000 + s.k);
    return null;
});
const MACHINE_B1 = mB1.done();

const mB4 = createExoMachineBuilder<TExoStrNode>(S_B4);
const KB4 = mB4.createInitialState((): TDoorState => ({ i: 0, k: 0 }));
const DOOR_B4_0 = mB4.transition((c: TMS): void => {
    C_MB4[0]++;
    const s = c.readState(KB4);
    s.k = (s.k * 7 + 13) % 10000;
});
const DOOR_B4_1 = mB4.transition((c: TMS): void => {
    C_MB4[1]++;
    const s = c.readState(KB4);
    s.k = (s.k + s.i * 3) % 10000;
});
const DOOR_B4_2 = mB4.transition((c: TMS): void => {
    C_MB4[2]++;
    const s = c.readState(KB4);
    s.k = (s.k ^ 685) % 10000;
});
const DOOR_B4_3 = mB4.transition((c: TMS): void => {
    C_MB4[3]++;
    const s = c.readState(KB4);
    s.k = (s.k * 3 + 1) % 10000;
});
mB4.effect((c: TMS): null => {
    const s = c.readState(KB4);
    s.i = NEXT_ROW++;
    DOOR_B4_0(c);
    DOOR_B4_1(c);
    DOOR_B4_2(c);
    DOOR_B4_3(c);
    c.attr(PB4.id, s.i);
    c.attr(PB4.href, '/i/' + s.i);
    c.text(PB4.title, 'Task ' + s.i);
    c.text(PB4.by, AUTHORS_B[s.i & 7]);
    c.text(PB4.k, 10000 + s.k);
    return null;
});
const MACHINE_B4 = mB4.done();

const mB16 = createExoMachineBuilder<TExoStrNode>(S_B16);
const KB16 = mB16.createInitialState((): TDoorState => ({ i: 0, k: 0 }));
const DOOR_B16_0 = mB16.transition((c: TMS): void => {
    C_MB16[0]++;
    const s = c.readState(KB16);
    s.k = (s.k * 7 + 13) % 10000;
});
const DOOR_B16_1 = mB16.transition((c: TMS): void => {
    C_MB16[1]++;
    const s = c.readState(KB16);
    s.k = (s.k + s.i * 3) % 10000;
});
const DOOR_B16_2 = mB16.transition((c: TMS): void => {
    C_MB16[2]++;
    const s = c.readState(KB16);
    s.k = (s.k ^ 685) % 10000;
});
const DOOR_B16_3 = mB16.transition((c: TMS): void => {
    C_MB16[3]++;
    const s = c.readState(KB16);
    s.k = (s.k * 3 + 1) % 10000;
});
const DOOR_B16_4 = mB16.transition((c: TMS): void => {
    C_MB16[4]++;
    const s = c.readState(KB16);
    s.k = (9999 - s.k) % 10000;
});
const DOOR_B16_5 = mB16.transition((c: TMS): void => {
    C_MB16[5]++;
    const s = c.readState(KB16);
    s.k = (s.k + (s.k >> 3)) % 10000;
});
const DOOR_B16_6 = mB16.transition((c: TMS): void => {
    C_MB16[6]++;
    const s = c.readState(KB16);
    s.k = (s.k * 11 + s.i) % 10000;
});
const DOOR_B16_7 = mB16.transition((c: TMS): void => {
    C_MB16[7]++;
    const s = c.readState(KB16);
    s.k = (s.k ^ (s.k >> 5)) % 10000;
});
const DOOR_B16_8 = mB16.transition((c: TMS): void => {
    C_MB16[8]++;
    const s = c.readState(KB16);
    s.k = (s.k + 4321) % 10000;
});
const DOOR_B16_9 = mB16.transition((c: TMS): void => {
    C_MB16[9]++;
    const s = c.readState(KB16);
    s.k = (s.k * 5 + 2) % 10000;
});
const DOOR_B16_10 = mB16.transition((c: TMS): void => {
    C_MB16[10]++;
    const s = c.readState(KB16);
    s.k = (s.k | 1) % 10000;
});
const DOOR_B16_11 = mB16.transition((c: TMS): void => {
    C_MB16[11]++;
    const s = c.readState(KB16);
    s.k = (s.k * 2 + (s.i & 7)) % 10000;
});
const DOOR_B16_12 = mB16.transition((c: TMS): void => {
    C_MB16[12]++;
    const s = c.readState(KB16);
    s.k = (s.k + 1234) % 10000;
});
const DOOR_B16_13 = mB16.transition((c: TMS): void => {
    C_MB16[13]++;
    const s = c.readState(KB16);
    s.k = (s.k * 13 + 7) % 10000;
});
const DOOR_B16_14 = mB16.transition((c: TMS): void => {
    C_MB16[14]++;
    const s = c.readState(KB16);
    s.k = (s.k ^ 1365) % 10000;
});
const DOOR_B16_15 = mB16.transition((c: TMS): void => {
    C_MB16[15]++;
    const s = c.readState(KB16);
    s.k = (s.k * 3 + (s.i >> 2)) % 10000;
});
mB16.effect((c: TMS): null => {
    const s = c.readState(KB16);
    s.i = NEXT_ROW++;
    DOOR_B16_0(c);
    DOOR_B16_1(c);
    DOOR_B16_2(c);
    DOOR_B16_3(c);
    DOOR_B16_4(c);
    DOOR_B16_5(c);
    DOOR_B16_6(c);
    DOOR_B16_7(c);
    DOOR_B16_8(c);
    DOOR_B16_9(c);
    DOOR_B16_10(c);
    DOOR_B16_11(c);
    DOOR_B16_12(c);
    DOOR_B16_13(c);
    DOOR_B16_14(c);
    DOOR_B16_15(c);
    c.attr(PB16.id, s.i);
    c.attr(PB16.href, '/i/' + s.i);
    c.text(PB16.title, 'Task ' + s.i);
    c.text(PB16.by, AUTHORS_B[s.i & 7]);
    c.text(PB16.k, 10000 + s.k);
    return null;
});
const MACHINE_B16 = mB16.done();

// ---------------------------------------------------------------------------------------
// THE EIGHTEEN PROGRAMS. Each one produces the whole page.
//
// BOTH ARMS ARE HANDED `ITEMS` AND BOTH IGNORE IT. The wire's row takes its number from `NEXT_ROW`
// because the machine's cannot take one at all — a machine has no props — and the two arms are only
// comparable while they take it from the same place. `c.list` still needs an array of the right
// LENGTH, which is the whole of what `ITEMS` is for on either arm.
// ---------------------------------------------------------------------------------------

const LIST_WA1 = listOver(WIRE_A1_C, ITEMS);
const LIST_WA4 = listOver(WIRE_A4_C, ITEMS);
const LIST_WA16 = listOver(WIRE_A16_C, ITEMS);
const LIST_WB1 = listOver(WIRE_B1_C, ITEMS);
const LIST_WB4 = listOver(WIRE_B4_C, ITEMS);
const LIST_WB16 = listOver(WIRE_B16_C, ITEMS);

const LIST_MA1 = listOver(MACHINE_A1, ITEMS);
const LIST_MA4 = listOver(MACHINE_A4, ITEMS);
const LIST_MA16 = listOver(MACHINE_A16, ITEMS);
const LIST_MB1 = listOver(MACHINE_B1, ITEMS);
const LIST_MB4 = listOver(MACHINE_B4, ITEMS);
const LIST_MB16 = listOver(MACHINE_B16, ITEMS);

interface Program {
    readonly name: string;
    readonly arm: Arm;
    readonly rung: number;
    readonly twin: boolean;
    /** The counter block this program's doors increment. */
    readonly calls: Uint32Array;
    readonly what: string;
    readonly run: () => string;
}

/** The row name, in `handler-count`'s spelling so the two axes' tables read alike. */
function rowName(arm: Arm, rung: number, twin: boolean): string {
    return `${arm}·n${rung}${twin ? '·twin' : ''}`;
}

const PROGRAMS: readonly Program[] = [
    {
        name: rowName('floor', 1, false),
        arm: 'floor',
        rung: 1,
        twin: false,
        calls: C_FA1,
        what: 'straight-line += with the shipped escapers; the door is one statement over two locals',
        run: floorA1,
    },
    {
        name: rowName('floor', 1, true),
        arm: 'floor',
        rung: 1,
        twin: true,
        calls: C_FB1,
        what: 'the same program declared again — own pieces, own author pool, own body',
        run: floorB1,
    },
    {
        name: rowName('wire', 1, false),
        arm: 'wire',
        rung: 1,
        twin: false,
        calls: C_WA1,
        what: '@exodra/string, a wire that builds ONE closure per instance and calls it',
        run: (): string => EXO_STR.render(LIST_WA1),
    },
    {
        name: rowName('wire', 1, true),
        arm: 'wire',
        rung: 1,
        twin: true,
        calls: C_WB1,
        what: 'the same wire declared again, over its own declaration and its own schema',
        run: (): string => EXO_STR.render(LIST_WB1),
    },
    {
        name: rowName('machine', 1, false),
        arm: 'machine',
        rung: 1,
        twin: false,
        calls: C_MA1,
        what:
            'the imperative machine — ONE transition per component, no closure per DOOR; its ' +
            'mount effect is one closure per instance at this rung and at every other',
        run: (): string => EXO_STR.render(LIST_MA1),
    },
    {
        name: rowName('machine', 1, true),
        arm: 'machine',
        rung: 1,
        twin: true,
        calls: C_MB1,
        what: 'the same machine declared again, over its own schema and its own program',
        run: (): string => EXO_STR.render(LIST_MB1),
    },
    {
        name: rowName('floor', 4, false),
        arm: 'floor',
        rung: 4,
        twin: false,
        calls: C_FA4,
        what: 'the floor with four door statements',
        run: floorA4,
    },
    {
        name: rowName('floor', 4, true),
        arm: 'floor',
        rung: 4,
        twin: true,
        calls: C_FB4,
        what: 'its twin',
        run: floorB4,
    },
    {
        name: rowName('wire', 4, false),
        arm: 'wire',
        rung: 4,
        twin: false,
        calls: C_WA4,
        what: 'four closures per instance',
        run: (): string => EXO_STR.render(LIST_WA4),
    },
    {
        name: rowName('wire', 4, true),
        arm: 'wire',
        rung: 4,
        twin: true,
        calls: C_WB4,
        what: 'its twin',
        run: (): string => EXO_STR.render(LIST_WB4),
    },
    {
        name: rowName('machine', 4, false),
        arm: 'machine',
        rung: 4,
        twin: false,
        calls: C_MA4,
        what: 'four transitions per component, none per instance — the same one mount closure',
        run: (): string => EXO_STR.render(LIST_MA4),
    },
    {
        name: rowName('machine', 4, true),
        arm: 'machine',
        rung: 4,
        twin: true,
        calls: C_MB4,
        what: 'its twin',
        run: (): string => EXO_STR.render(LIST_MB4),
    },
    {
        name: rowName('floor', 16, false),
        arm: 'floor',
        rung: 16,
        twin: false,
        calls: C_FA16,
        what: 'the floor with sixteen door statements',
        run: floorA16,
    },
    {
        name: rowName('floor', 16, true),
        arm: 'floor',
        rung: 16,
        twin: true,
        calls: C_FB16,
        what: 'its twin',
        run: floorB16,
    },
    {
        name: rowName('wire', 16, false),
        arm: 'wire',
        rung: 16,
        twin: false,
        calls: C_WA16,
        what: 'SIXTEEN closures per instance — 16 000 function objects per render',
        run: (): string => EXO_STR.render(LIST_WA16),
    },
    {
        name: rowName('wire', 16, true),
        arm: 'wire',
        rung: 16,
        twin: true,
        calls: C_WB16,
        what: 'its twin',
        run: (): string => EXO_STR.render(LIST_WB16),
    },
    {
        name: rowName('machine', 16, false),
        arm: 'machine',
        rung: 16,
        twin: false,
        calls: C_MA16,
        what:
            'SIXTEEN transitions per component and ZERO function objects per door — against the ' +
            "wire's 16 000 per render, the machine allocates the same one closure it does at n1",
        run: (): string => EXO_STR.render(LIST_MA16),
    },
    {
        name: rowName('machine', 16, true),
        arm: 'machine',
        rung: 16,
        twin: true,
        calls: C_MB16,
        what: 'its twin',
        run: (): string => EXO_STR.render(LIST_MB16),
    },
];

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until every program has been shown to produce its rung's REFERENCE
// BYTES, character for character, and until every schema has been shown to compile to the five
// ports this file is written against.
// ---------------------------------------------------------------------------------------

/** Named so the comparison reads as an intent rather than as an `===` buried in a condition. */
function want(a: string, b: string): boolean {
    return a === b;
}

function gateBytes(who: string, reference: string, got: string): void {
    if (want(reference, got)) {
        line(`gate door-count/${who}: identical bytes — ${got.length} chars`);
        return;
    }
    let at = 0;
    while (at < reference.length && at < got.length && reference[at] === got[at]) at++;
    const from = Math.max(0, at - 60);
    refuse(
        `gate door-count/${who}: DIFFERENT bytes — ${reference.length} chars (reference) / ` +
            `${got.length} chars (${who}), first difference at char ${at}\n` +
            `  reference: …${reference.slice(from, at + 120)}…\n` +
            `  ${who}   : …${got.slice(from, at + 120)}…`
    );
    throw new Error(
        `door-count: "${who}" produces different bytes from its rung's reference ` +
            `(${reference.length} vs ${got.length} chars, first difference at char ${at}) — the ` +
            'timings below would be comparing different programs, and on this axis a wrong byte ' +
            'is most likely a door that did not run'
    );
}

/**
 * THE IDENTITY GATE IS STRUCK, AND THIS IS WHERE IT STOOD.
 *
 * It compared each declared door against `exoTransition(MACHINE, body)` and refused the run if the
 * two were not the same function object — because for a program declaring no derivation, no fill
 * and no effect, `exoTransition.ts:22-25` returns `apply` untouched, and that specialisation was
 * what made the machine arm allocate nothing per door call.
 *
 * THE DOORS ARE NOW DECLARED THROUGH `m.transition` AND THE QUESTION IS SETTLED BY CONSTRUCTION.
 * On a plain `createExoMachineBuilder` there is no program to settle and `createExoMachineBuilder.ts` hands `apply` straight
 * back, so the door a rung fires IS the body written beside it — not a wrapper that happens to be
 * elided. A gate cannot check what the declaration already is.
 *
 * WHAT IS LOST WITH IT: if the machine arm ever grows a SETTLED transition — which needs
 * `withExoComputedMachine`, a compiled program and therefore a derivation — nothing in this file
 * will notice. The replacement for that is a rung, `machine·settled`, and it is not built.
 */
function gateDoors(): string[] {
    return [
        '  doors                   42, every one declared with `m.transition` — on a plain createExoMachineBuilder ' +
            'a transition IS its body, so the machine arm fires the function written beside it ' +
            '(the identity gate that used to check this is struck; see its note above)',
        '  mount paint             6, one `m.effect` per machine — the only per-instance hook a ' +
            'SERVER machine has, because `enode.state` is installed after the last keep-seeder and ' +
            '`c.kept` is what every door reads',
        '  source lines, rung 16   floor 51 · wire 90 · machine 109 — the ladder costs the machine ' +
            'arm the most to WRITE (a keep, sixteen transitions, an effect and a done() against the ' +
            "wire's one function), counted off this file's own declarations",
    ];
}

/** The schemas compiled to what this file is written against — checked, not assumed. */
function gateShapes(): string[] {
    const schemas: ReadonlyArray<readonly [string, TExoStrMachine]> = [
        ['A1 wire', WIRE_A1_C],
        ['A1 machine', MACHINE_A1],
        ['A4 wire', WIRE_A4_C],
        ['A4 machine', MACHINE_A4],
        ['A16 wire', WIRE_A16_C],
        ['A16 machine', MACHINE_A16],
        ['B1 wire', WIRE_B1_C],
        ['B1 machine', MACHINE_B1],
        ['B4 wire', WIRE_B4_C],
        ['B4 machine', MACHINE_B4],
        ['B16 wire', WIRE_B16_C],
        ['B16 machine', MACHINE_B16],
    ];
    for (const [who, machine] of schemas) {
        // `EXO_STR` AND NOT SOME OTHER BACKEND: a string schema is cached per machine PER
        // backendType, so a second backend here would compile a second schema and this gate
        // would be checking a schema no measured row renders through.
        const compiled = exoStrSchemaOf(machine, EXO_STR);
        if (compiled.portCount !== 5) {
            throw new Error(
                `door-count: row schema ${who} compiled to ${compiled.portCount} ports, not 5 — ` +
                    'every program in this file writes five, and the port writes per row are ' +
                    'supposed to be the one thing that does NOT move with the rung'
            );
        }
    }
    const skeleton = exoStrSchemaOf(WIRE_A16_C, EXO_STR).fillMarkup(['', '', '', '', '']);
    return [
        `  row schemas             ${schemas.length} (a wire and a machine per declaration), five ports each (2 attribute, 3 text, no ` +
            'event port — see the markup block)',
        `  schema static skeleton  ${skeleton}`,
    ];
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — `ssr-floor`'s, which took it from `mount-floor`. Spin until the clock
// moves and keep the SMALLEST step it ever takes.
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
// THE RUNNER.
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
    readonly reps: number;
    readonly prep: () => Scenario;
}

/**
 * ONE TABLE'S WORTH OF SAMPLING: the per-round series for every phase, and WHERE IN THE ROUND each
 * one ran. The positions are what let a null be split by which half of the pair went first.
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
    return dt / reps;
}

/**
 * THE PHASE DRIVER, AND THE DEFECT IT DOES NOT REPRODUCE.
 *
 * The shared driver several axes carry rotated the phase list on a FIXED CYCLE — `phases[(k +
 * shift) % len]`, forwards every round — so every pair of phases kept the same relative order for
 * the whole run and any warm-cache or allocation-order effect between two neighbours was baked into
 * both medians identically. EVEN ROUNDS RUN FORWARDS AND ODD ROUNDS BACKWARDS here. The rotation
 * still gives every phase every starting position; the direction is what stops a pair from keeping
 * a fixed order, and `pairedNull` below splits what is left into the half that flips with the order
 * and the half that does not.
 */
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
 *               cancel, and a null that reports bias alone reads as perfection.
 *   noise       the MEDIAN of the per-round |a − b|. Both halves are sampled in the same round, so
 *               this is the round-to-round scatter ANY comparison in the table carries.
 *   order       (aFirst − bFirst) ÷ 2 — the size of the ordering effect, signed.
 *   intrinsic   (aFirst + bFirst) ÷ 2 — what is left once the ordering is balanced out.
 *
 * AN ORDERING EFFECT FLIPS SIGN WITH THE ORDER, so it lands entirely in `order` and `intrinsic`
 * collapses; two declarations that really do differ keep their sign in both orders, so it lands in
 * `intrinsic` and `order` collapses. A null whose `intrinsic` stands out of its own noise is not a
 * null, and the row it belongs to is not quotable.
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
    readonly aFirstRounds: number;
    readonly bFirstRounds: number;
}

/** Median of a signed series; `0` for an empty one, which is what an unsampled order deserves. */
function medianOf(xs: readonly number[]): number {
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
        // WHICH RAN FIRST IS READ OFF THE ROUND ITSELF and not inferred from its parity: the
        // rotation wraps, so one round in every cycle puts the pair in the opposite order to the
        // one the direction would suggest, and inferring it would quietly poison both halves.
        if (aPos[r] < bPos[r]) whenAFirst.push(signed);
        else whenBFirst.push(signed);
    }
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    const aFirst = medianOf(whenAFirst);
    const bFirst = medianOf(whenBFirst);
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

export function benchmarkDoorCount(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    /** Nanoseconds per INSTANCE, which is the unit every quantity on this axis is about. */
    const ns = (x: number): string => `${((x * 1e6) / ROWS).toFixed(1)} ns/inst`;
    const nsRaw = (x: number): number => (x * 1e6) / ROWS;

    const quantum = observeTimerQuantum();
    line(
        `door-count: observed timer quantum (${quantum.toFixed(
            3
        )} ms) — every timed region below ` +
            `must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its digits are ` +
            'quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    line('');
    line('THE SHAPE, AS COMPILED — checked, not assumed');
    for (const l of gateShapes()) line(l);
    for (const l of gateDoors()) line(l);

    line('');
    line(
        'THE BYTE GATE — one reference PER RUNG (the wire arm renders it), every program of that ' +
            'rung against it, character for character, before anything is timed. A door that did ' +
            "not run changes the page, so this gate is also the doors' gate."
    );
    const referenceOf = new Map<number, string>();
    for (const n of RUNGS) {
        const subject = PROGRAMS.find(
            (p) => p.arm === 'wire' && p.rung === n && !p.twin
        ) as Program;
        referenceOf.set(n, subject.run());
    }
    for (const p of PROGRAMS) {
        gateBytes(p.name, referenceOf.get(p.rung) as string, p.run());
    }

    // THE COUNTER SNAPSHOT, TAKEN AFTER THE GATES AND BEFORE ANY TIMING. What is checked at the end
    // is GROWTH from here — a door that ran only during gating, or only during warm-up, is refused
    // exactly as one that never ran at all.
    const callsBefore = new Map<string, Uint32Array>();
    for (const p of PROGRAMS) callsBefore.set(p.name, Uint32Array.from(p.calls));

    // ── THE CENSUS ──────────────────────────────────────────────────────────────────────
    const reps = REPS * batch;
    const grain = quantum / reps;
    /** A delta in grains, which is the unit a quantised median actually moves in. */
    const grains = (x: number): number => Math.round(Math.abs(x) / grain);

    line('');
    line("CENSUS — read off this file's constants and the two packages' source, nothing measured");
    line(`  rows per render             ${ROWS}`);
    line('  ports per row               5  (2 attribute, 3 text) — CONSTANT at every rung');
    line('  port writes per row         5 — CONSTANT at every rung, which is the whole design');
    line(`  rungs                       ${RUNGS.join(', ')} doors per instance`);
    line(
        `  door calls per render       ${RUNGS.map((n) => `n${n}: ${ROWS * n}`).join('  ')}` +
            ' — every one of them inside the timed region'
    );
    line(
        `  function objects per render wire ${RUNGS.map((n) => `n${n}: ${ROWS * n}`).join(
            '  '
        )}  ·  machine ${ROWS} at EVERY rung (the teardown closure of its one mount effect, ` +
            'NOT a door)  ·  floor 0'
    );
    line(
        '  allocations per instance    floor 0 · wire 1 context + 1 state object + N functions · ' +
            'machine 1 values array + 1 cache object + 1 instance object + 1 effectStops array + ' +
            '1 disposers array + 1 teardown closure, and NONE OF THEM PER DOOR'
    );
    line(
        '  what the machine pays for   the three extra allocations are the mount effect, and the ' +
            'mount effect is how a machine with no props and no wire runs anything per instance on ' +
            'this backend. They are the same three at n1 and at n16, so they are in the INTERCEPT: ' +
            'read the slope.'
    );
    line(
        `  source lines (rung 16)      floor 51 · wire 90 · machine 109 — what each arm costs to ` +
            'WRITE, counted off this file, and the one column where the machine is dearest'
    );
    line(
        `  bytes per render            ${RUNGS.map(
            (n) => `n${n}: ${(referenceOf.get(n) as string).length}`
        ).join('  ')} chars — the rung moves the accumulator, not the shape`
    );
    line(
        `  THE GRAIN                   ${f6(grain)} ms per render = ${(
            (grain * 1e6) /
            ROWS
        ).toFixed(2)} ns per instance (quantum ${quantum.toFixed(
            3
        )} over ${reps} renders per region). ` + 'EVERY MEDIAN BELOW IS A MULTIPLE OF IT.'
    );
    line(
        '  THE QUOTING RULE            a difference must clear BOTH its own two rows’ ' +
            'resolution AND FOUR GRAINS to be quoted as a size. That is `ssr-floor`’s rule ' +
            '(ssr-floor.ts:106) and it is inherited here rather than re-invented.'
    );
    line(
        '  THE COUNTER                 one Uint32Array increment per door call, in ALL THREE ARMS ' +
            'at the same place in the body, so it cancels in every difference and inflates every ' +
            'absolute per-door figure below.'
    );

    // ── THE PHASES ──────────────────────────────────────────────────────────────────────
    const phases: Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps,
        prep: (): Scenario => {
            // THE SINK, allocated untimed. Every repetition's markup stays alive for the whole
            // timed region — `mount-phases`' rule — so no program is allocating into a nursery
            // that recycles while its neighbours allocate into a growing live set.
            const sink: { out: string; tail: string } = { out: '', tail: '' };
            const run = p.run;
            return {
                measure: () => {
                    const out = run();
                    // THE FLATTEN, INSIDE THE REGION, ON EVERY ROW. `+=` hands back a rope and the
                    // characters are not copied until something reads the string; a server cannot
                    // write a rope to a socket. `ssr-floor`'s rule, and it is identical here for
                    // every program, so it sits in the intercept.
                    sink.tail = out.slice(-6);
                    sink.out = out;
                },
                cleanup: () => {
                    sink.out = '';
                    sink.tail = '';
                },
            };
        },
    }));

    const series = runPhases(phases, rounds);
    const seriesOf = (name: string): number[] => series.times.get(name) as number[];
    const posOf = (name: string): number[] => series.position.get(name) as number[];
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;
    const at = (arm: Arm, rung: number): number => median(rowName(arm, rung, false));

    // ── THE INVOKED-DOOR GATE ───────────────────────────────────────────────────────────
    //
    // THE TRAP THIS EXISTS FOR: a door that is declared and never called is allocated but never
    // COMPILED, so a ladder of unused doors prices allocations and pre-parses. The byte gate above
    // already refuses a program whose doors did not run — the accumulator is printed — but it
    // cannot name WHICH door, and it runs before the timed rounds rather than across them.
    const silent: string[] = [];
    for (const p of PROGRAMS) {
        const before = callsBefore.get(p.name) as Uint32Array;
        for (let d = 0; d < p.calls.length; d++) {
            if (p.calls[d] - before[d] > 0) continue;
            silent.push(`${p.name} door ${d}`);
        }
    }
    if (silent.length > 0) {
        refuse(
            `door-count: ${silent.length} declared door(s) were NOT invoked inside the timed ` +
                `region — ${silent.join(', ')}. A declared-and-uncalled door is allocated and ` +
                'never compiled, so every figure in this run prices allocations and pre-parses ' +
                'rather than working doors, and the wire arm is the one it flatters. NOTHING ' +
                'BELOW MAY BE READ.'
        );
    } else {
        line('');
        line(
            `THE INVOKED-DOOR GATE — all ${PROGRAMS.reduce(
                (n, p) => n + p.calls.length,
                0
            )} declared doors across the eighteen programs grew their counter DURING the timed ` +
                'rounds (the snapshot was taken after the byte gate, so gating and warm-up do not ' +
                'count towards it)'
        );
    }

    // ── THE RAW TABLE ───────────────────────────────────────────────────────────────────
    line('');
    line(
        `DOOR COUNT — ${ROWS} rows of one component [ms per render] · interleaved, direction ` +
            `alternating · ${rounds} rounds · batch ${batch} · ${reps} renders per timed region · ` +
            'GC before every timed region'
    );
    line('                      reps   min      p25      median   p75      max      ns/inst');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(18)}${String(p.reps).padStart(6)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ${((s.median * 1e6) / ROWS).toFixed(
                    1
                )}`
        );
    }
    line('');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(18)} ${p.what}`);

    emitRecordedRows(
        'DOORS',
        'ms',
        'render',
        PROGRAMS.map((p) => [p.name, stats.get(p.name) as Stat] as const)
    );

    // ── THE NULLS ───────────────────────────────────────────────────────────────────────
    const nulls = new Map<string, Null>();
    for (const arm of ARMS) {
        for (const n of RUNGS) {
            const a = rowName(arm, n, false);
            const b = rowName(arm, n, true);
            nulls.set(a, pairedNull(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
        }
    }
    const resOf = (name: string): number => (nulls.get(name) as Null).resolution;

    line('');
    line(
        'NULLS — nine pairs, one per arm per rung, each a separately declared copy of its program'
    );
    line(
        '  null            bias      noise     p75       worst     ' +
            'order     intrinsic  what it is'
    );
    let worstRes = 0;
    for (const arm of ARMS) {
        for (const n of RUNGS) {
            const name = rowName(arm, n, false);
            const v = nulls.get(name) as Null;
            if (v.resolution > worstRes) worstRes = v.resolution;
            line(
                `  ${name.padEnd(14)}${f6(v.bias)}  ${f6(v.noise)}  ${f6(v.noiseP75)}  ` +
                    `${f6(v.worst)}  ${f6(v.order).padStart(9)} ${f6(v.intrinsic).padStart(9)}  ` +
                    `|${name} − its twin| ms/render, true Δ = 0 (this pair's resolution ` +
                    `${f6(v.resolution)} = ${((v.resolution * 1e6) / ROWS).toFixed(
                        1
                    )} ns/inst; Δ when it ran first ${f6(v.aFirst)} over ${v.aFirstRounds} ` +
                    `rounds, when the twin ran first ${f6(v.bFirst)} over ${v.bFirstRounds})`
            );
        }
    }
    line(
        `  RESOLUTION FLOOR      ${f6(worstRes)} ms — THE COARSEST OF THE NINE, printed for the ` +
            'recorder. NO VERDICT BELOW USES IT: every quantity is judged against the resolutions ' +
            'of ITS OWN rows, which are on the lines above.'
    );
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. Bias alone can cancel at the median and read as a perfect instrument; noise ' +
            'cannot. ORDER is half the difference between the two running orders and INTRINSIC is ' +
            'half their sum — the first is what flips when the pair swaps places in the round, the ' +
            'second is what does not.'
    );

    line('');
    line(
        'THE ORDER SPLIT — is a null measuring two programs, or measuring which of them ran first?'
    );
    const notNull: string[] = [];
    for (const arm of ARMS) {
        for (const n of RUNGS) {
            const name = rowName(arm, n, false);
            const v = nulls.get(name) as Null;
            const intr = Math.abs(v.intrinsic);
            const ord = Math.abs(v.order);
            let verdictWord: string;
            if (intr > v.noise) {
                notNull.push(name);
                verdictWord =
                    'INTRINSIC — the two declarations differ in a way that does NOT flip with ' +
                    `the order, so this pair is not a null and every figure printed for "${name}" ` +
                    'is suspect';
            } else if (ord > v.noise) {
                verdictWord =
                    'ORDERING — what the pair separates flips sign with which of the two ran ' +
                    'first, so it is the position in the round and not the program; the ' +
                    'alternating direction is what averages it out of the medians';
            } else {
                verdictWord =
                    "NEITHER stands out of this pair's own noise — the pair is a null and the " +
                    'instrument has nothing to confess';
            }
            line(
                `  ${name.padEnd(14)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ` +
                    `${f6(v.noise)} ms/render — ${verdictWord}`
            );
        }
    }
    if (notNull.length > 0) {
        refuse(
            `door-count: ${notNull.length} of the nine null pairs came back INTRINSIC — ` +
                `${notNull.join(', ')}. Two declarations of one program that differ in a way ` +
                'which does not flip with the running order are two different programs, so those ' +
                'rows are not quotable and every quantity computed from them inherits it. The ' +
                'first thing to check is that the twin is a true transcription: its own pieces, ' +
                'its own author pool, its own bodies, nothing shared with the subject.'
        );
    }

    // ── THE LADDER ──────────────────────────────────────────────────────────────────────
    line('');
    line(
        'THE LADDER — one block per rung, read INSIDE itself. A rung is a different job from ' +
            'another rung (the doors do more work), so what crosses rungs is not a row but a ' +
            'DIFFERENCE of two rows, and that is the next table.'
    );
    line('  rung   floor     wire      machine   wire−floor        machine−floor     wire−machine');
    for (const n of RUNGS) {
        const fl = at('floor', n);
        const wi = at('wire', n);
        const ma = at('machine', n);
        line(
            `  n${String(n).padEnd(5)}${f(fl)}    ${f(wi)}    ${f(ma)}    ` +
                `${sign(wi - fl).padEnd(9)} ${String(grains(wi - fl)).padStart(3)}g  ` +
                `${sign(ma - fl).padEnd(9)} ${String(grains(ma - fl)).padStart(3)}g  ` +
                `${sign(wi - ma)} ${grains(wi - ma)}g`
        );
    }
    line(
        '  A "g" IS A GRAIN. The three difference columns are judged against the resolutions of ' +
            'their own two rows, which the next block prints beside each one.'
    );

    /** A difference and everything needed to say whether it may be quoted as a size. */
    const judge = (
        label: string,
        delta: number,
        rowA: string,
        rowB: string,
        note: string
    ): boolean => {
        const res = Math.max(resOf(rowA), resOf(rowB));
        const g = grains(delta);
        const ok = Math.abs(delta) > res && g >= 4;
        line(
            `  ${label.padEnd(24)}${sign(delta)} ms  ${ns(delta).padEnd(14)}${String(g).padStart(
                4
            )} grains  ` +
                `own resolution ${f6(res)}  ${
                    ok
                        ? 'RESOLVED — quotable as a size'
                        : Math.abs(delta) <= res
                        ? 'NOT RESOLVED — inside its own two rows’ resolution'
                        : 'NOT RESOLVED — under four grains, an ordering at best'
                }  ${note}`
        );
        return ok;
    };

    line('');
    line(
        'WHAT ONE DOOR COSTS — the SHAPE this axis exists for. Each interval is a difference of ' +
            'two rows of the SAME arm, divided by the doors that were added.'
    );
    const intervals: ReadonlyArray<readonly [number, number]> = [
        [1, 4],
        [4, 16],
    ];
    const slope = new Map<string, number>();
    for (const arm of ARMS) {
        for (const [lo, hi] of intervals) {
            const delta = at(arm, hi) - at(arm, lo);
            const perDoor = delta / (hi - lo);
            slope.set(`${arm}:${lo}-${hi}`, perDoor);
            judge(
                `${arm} n${lo}→n${hi}`,
                delta,
                rowName(arm, lo, false),
                rowName(arm, hi, false),
                `= ${nsRaw(perDoor).toFixed(2)} ns per instance per door (over ${hi - lo} doors)`
            );
        }
    }
    line(
        '  EVERY PER-DOOR FIGURE ABOVE INCLUDES THE COUNTER INCREMENT and, for the two library ' +
            'arms, the door’s own arithmetic. What each one is made of: the FLOOR is the ' +
            'arithmetic alone; the WIRE adds one function object, one call through a context slot ' +
            'and one context load; the MACHINE adds one call to a module-level function and ' +
            'c.kept’s call and two loads. The two library figures are therefore ' +
            'compound and neither is "an allocation".'
    );
    line(
        `  THE SPELLING, WITH THE WORK TAKEN OFF — wire’s door minus the floor’s: ` +
            `${nsRaw(
                (slope.get('wire:4-16') as number) - (slope.get('floor:4-16') as number)
            ).toFixed(2)} ns over n4→n16; machine’s minus the floor’s: ` +
            `${nsRaw(
                (slope.get('machine:4-16') as number) - (slope.get('floor:4-16') as number)
            ).toFixed(
                2
            )} ns. Both are differences of differences: their noise is the sum of four ` +
            'rows’ noise and they are the softest numbers on this axis.'
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    const wireSpan = at('wire', 16) - at('wire', 1);
    const machineSpan = at('machine', 16) - at('machine', 1);
    const floorSpan = at('floor', 16) - at('floor', 1);
    const spanRes = Math.max(
        resOf(rowName('wire', 1, false)),
        resOf(rowName('wire', 16, false)),
        resOf(rowName('machine', 1, false)),
        resOf(rowName('machine', 16, false))
    );

    line('');
    line('THE ANSWER');
    line(
        `  Fifteen more doors per instance cost the WIRE ${sign(wireSpan)} ms per render ` +
            `(${ns(wireSpan)}), the MACHINE ${sign(machineSpan)} (${ns(
                machineSpan
            )}) and the FLOOR ` +
            `${sign(floorSpan)} (${ns(floorSpan)}). The coarsest resolution among the four ` +
            `library rows involved is ${f6(spanRes)} ms and one grain is ${f6(grain)}.`
    );
    line(
        '  THIS AXIS MAKES NO CLAIM ABOUT WHICH ARM IS FASTER AT ANY SINGLE RUNG, and (P0) in the ' +
            'header says why: a rung is a slope term plus an intercept, and the intercept is three ' +
            'allocations against one plus a handful of calls, which nothing here was built to ' +
            'separate. What crosses rungs is the slope.'
    );

    // ── THE FALSIFIERS, PRINTED MECHANICALLY ────────────────────────────────────────────
    line('');
    line(
        'THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the programs existed'
    );
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);

    line(
        '   ⊘ (P0) NOT A PREDICTION — this axis commits to no direction for wire−machine at any ' +
            'single rung. The three values are printed in the ladder and are not verdicts.'
    );

    {
        const perDoor = nsRaw(slope.get('wire:4-16') as number);
        verdict(
            '(P1)',
            perDoor >= 8 && perDoor <= 25,
            "the wire's door is 8-25 ns per instance over n4→n16",
            `${perDoor.toFixed(2)} ns (the rung difference is ${sign(
                at('wire', 16) - at('wire', 4)
            )} ms, ${grains(at('wire', 16) - at('wire', 4))} grains)`
        );
    }
    {
        const parts: string[] = [];
        let linear = true;
        for (const arm of ARMS) {
            const lo = nsRaw(slope.get(`${arm}:1-4`) as number);
            const hi = nsRaw(slope.get(`${arm}:4-16`) as number);
            const ratio =
                Math.min(Math.abs(lo), Math.abs(hi)) === 0
                    ? Infinity
                    : Math.max(Math.abs(lo), Math.abs(hi)) / Math.min(Math.abs(lo), Math.abs(hi));
            if (!(ratio <= 2)) linear = false;
            parts.push(`${arm} ${lo.toFixed(2)}/${hi.toFixed(2)} ns (×${ratio.toFixed(2)})`);
        }
        verdict(
            '(P2)',
            linear,
            'the per-door increment over 1→4 and over 4→16 agree within ×2 on all three arms',
            parts.join(', ')
        );
    }
    verdict(
        '(P3)',
        wireSpan - machineSpan > spanRes && grains(wireSpan - machineSpan) >= 4,
        "the machine's line is flatter than the wire's, by more than those four rows' own " +
            'resolution and more than four grains',
        `wire ${sign(wireSpan)} against machine ${sign(machineSpan)}, difference ${sign(
            wireSpan - machineSpan
        )} (${grains(wireSpan - machineSpan)} grains, resolution ${f6(spanRes)})`
    );
    {
        const floorDoor = nsRaw(slope.get('floor:4-16') as number);
        const wireDoor = nsRaw(slope.get('wire:4-16') as number);
        const machineDoor = nsRaw(slope.get('machine:4-16') as number);
        verdict(
            '(P4)',
            floorDoor >= 2 && floorDoor <= 8 && floorDoor <= wireDoor && floorDoor <= machineDoor,
            "the floor's door is 2-8 ns and the smallest of the three",
            `floor ${floorDoor.toFixed(2)}, wire ${wireDoor.toFixed(
                2
            )}, machine ${machineDoor.toFixed(2)} ns per instance per door`
        );
    }
    {
        // THE INTERCEPT AT EACH RUNG: the arms' difference with the fitted slope difference taken
        // off. The slope used is the n4→n16 one, which is the interval with twelve doors in it and
        // therefore the one whose per-door figure carries the least of the two rows' noise.
        const perDoorGap =
            (slope.get('wire:4-16') as number) - (slope.get('machine:4-16') as number);
        const intercepts = RUNGS.map((n) => at('wire', n) - at('machine', n) - perDoorGap * n);
        const spread = Math.max(...intercepts) - Math.min(...intercepts);
        const interceptRes = Math.max(
            ...RUNGS.map((n) =>
                Math.max(resOf(rowName('wire', n, false)), resOf(rowName('machine', n, false)))
            )
        );
        verdict(
            '(P5)',
            spread <= interceptRes,
            'the intercept is a constant — the three rungs agree once the slope difference is ' +
                'taken off',
            `${RUNGS.map((n, at2) => `n${n} ${sign(intercepts[at2])}`).join(', ')} — spread ${f6(
                spread
            )} against the coarsest of those six rows' resolutions ${f6(interceptRes)}`
        );
    }
    verdict(
        '(P6)',
        notNull.length === 0,
        'all nine null pairs are ordering or nothing',
        notNull.length === 0
            ? 'nine of nine inside their own noise'
            : `${notNull.length} INTRINSIC — ${notNull.join(', ')}`
    );

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    for (const arm of ARMS) {
        for (const [lo, hi] of intervals) {
            const delta = at(arm, hi) - at(arm, lo);
            if (delta >= 0) continue;
            refuse(
                `door-count: "${rowName(arm, hi, false)}" (${f(
                    at(arm, hi)
                )} ms) measured CHEAPER than "${rowName(arm, lo, false)}" (${f(
                    at(arm, lo)
                )} ms) by ${f(-delta)} ms, though it does everything that program does and ` +
                    `${hi - lo} more doors' worth on top. That is not a saving, it is the ` +
                    'instrument — raise `rounds` before reading anything above.'
            );
        }
    }
    {
        const n1Gap = Math.abs(at('wire', 1) - at('machine', 1));
        const n1Res = Math.max(
            resOf(rowName('wire', 1, false)),
            resOf(rowName('machine', 1, false))
        );
        if (n1Gap <= n1Res || grains(n1Gap) < 4) {
            refuse(
                `door-count: the n1 pair did not separate — |wire·n1 − machine·n1| is ${f(
                    n1Gap
                )} ms (${grains(n1Gap)} grains) against those two rows' resolution ${f6(
                    n1Res
                )} and a grain of ${f6(grain)}. That is EXPECTED at this batch and is not a ` +
                    'failure of the axis — one closure per instance was predicted at 3-6 grains ' +
                    '— but the rung may not be quoted. To resolve it, halve the grain: ' +
                    `\`npm run axis --workspace=@exodra/benchmarks -- door-count ${rounds} ` +
                    `${batch * 2}\`, which doubles the renders per region to ${
                        reps * 2
                    } and the wall clock with them. The SHAPE across n4 and n16 does not depend ` +
                    'on this rung.'
            );
        }
    }
    for (const p of phases) {
        const region = (stats.get(p.name) as Stat).median * p.reps;
        const clockFloor = MIN_TICKS * quantum;
        if (region >= clockFloor) continue;
        const factor = region > 0 ? clockFloor / region : Infinity;
        const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
        refuse(
            `door-count: the "${p.name}" timed region is ${region.toFixed(3)} ms at ${p.reps} ` +
                `renders — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- door-count ${rounds} ` +
                `${wantBatch}\``
        );
    }
}
