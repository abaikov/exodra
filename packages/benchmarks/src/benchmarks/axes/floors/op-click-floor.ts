import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachine } from '@exodra/core';
// DIAGNOSTIC — HOW MUCH ROOM IS THERE BELOW A SHARED HANDLER — ONE MODULE-LEVEL FUNCTION PLUS A
// PER-POSITION SUBJECT — AT SERVING ONE INTERACTION ON ONE ROW OF A LIST, AND WHAT DOES THE
// DELEGATED STRATEGY COST AGAINST THE DIRECT ONE?
//
// THE GAP IT CLOSES. `keystroke-floor` declares a shared handler and does drive it, but only under
// `createExoDelegatedEvents(['input'])`, where the handler form is not the variable — the pack is — and
// its own header books the missing pair by name:
//
//     "A SHARED HANDLER UNDER THE DIRECT PACK. `EXO_DIRECT_EVENTS` serves one too, and cheaply:
//      'a fill is two property stores under both handler forms' (`EXO_DIRECT_EVENTS.ts:16-17`).
//      It would separate 'one function for every row instead of one closure per row' from 'one
//      root listener instead of fifty', which `exodra·deleg` changes together. It is a legitimate
//      eighth row and it is left out to keep this run at seven; the pair it would price is named
//      here so nobody has to rediscover that it is missing."
//
// This axis is that pair, on the interaction a list row exists for: A CLICK ON A ROW.
//
// It is written to the `mount-floor` / `update-floor` / `hydrate-floor` / `teardown-floor` /
// `keystroke-floor` set: a phase per program, a floor with no framework in it, a resolution floor
// measured from a control whose true difference is zero, every way it can mislead stated in this
// header and repeated in the answer, and a run that refuses its own numbers by name when they are
// unreadable.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT A SHARED HANDLER ACTUALLY DOES — READ OUT OF THE EVENT FILES, NOT ASSUMED ──────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A HANDLER IS A PLAIN FUNCTION THAT TAKES THE SUBJECT AS ITS SECOND ARGUMENT:
//
//     type TExoEventHandler<TEvent, TNode> =
//         (this: TNode, event: TEvent, subject?: unknown) => void;
//
// `c.on(port, handler, subject)` stores the two beside each other on the element — two property
// stores, plus one `addEventListener` on the first fill (`exo-event-slot-setter.ts:19-29`).
// NOTHING IS ALLOCATED PER ROW FOR THE HANDLER: it is declared once at module level and ONE
// function object serves every row, because the row ARRIVES as an argument instead of being
// captured. That property is the whole subject of this axis. The subject costs whatever it is —
// here a one-field object per row; a wire whose row already has an object passes that object.
//
// WHAT RUNS WHEN THE EVENT ARRIVES, in order, read from the code:
//
//   1. A SHARED LISTENER is what the browser calls. Under the SHIPPED direct pack that is
//      `exoDirectListenerFor(event)` (`exoDirectListenerFor.ts:10-31`): ONE `EventListener` per
//      event name for the whole process, cached in a module-level `Map`. It reads
//      `e.currentTarget`, null-checks it, loads two expando slots off the element, and returns
//      early if the handler slot is `undefined`. A CLOSURE GOES THROUGH THE SAME LISTENER AND THE
//      SAME TWO SLOTS — the setter's only test on the handler is the subject refusal it is exempt
//      from.
//   2. ONE CALL — `handler.call(node, event, subject)`. `.call` and not `handler(event)` because
//      `addEventListener` sets `this` to the element it fired on, and the delegated listener sets
//      it to the element that carried the slot (`exo-delegated-listener.ts:18-22`), so `this` means
//      the same thing under both strategies and a page that switches packs cannot change behaviour.
//   3. THE HANDLER'S BODY. Here `FLIP` loads `subject.done` — A KEYED LOAD ON A USER OBJECT, which
//      is the ONE thing a closure does differently, reading its flag out of its context instead —
//      and computes `done === true ? false : true`, A STRICT COMPARE AND NOT
//      TRUTHINESS. The two rules agree on every falsy value and disagree on every truthy value that
//      is not `true`; THIS AXIS MIRRORS THE STRICT RULE IN THE FLOOR, so the two programs are the
//      same program and not two answers to the same question.
//   4. THE FLAG IS STORED back where it was loaded from.
//   5. THE READ-OUT IS RECOMPUTED AND WRITTEN: `c.attr(value, label(next))`, in the handler itself.
//
// SO A SHARED HANDLER IS NOT A CHEAPER HANDLER PER EVENT. Per dispatch it and a closure differ by
// one property load and nothing else. WHAT IT BUYS IS AT MOUNT AND IN WHAT BECOMES POSSIBLE: a
// closure is a function object over its own context, allocated once per row, where the shared form
// allocates the subject and reuses one function for the process. THIS AXIS MEASURES BOTH SIDES OF
// THAT TRADE, which is why it prints two tables.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── DOES THE SHARED FORM COMPOSE WITH DELEGATION? YES, AND ASYMMETRICALLY ───────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The brief asked whether the shared form exists BECAUSE OF delegation, and whether the shipped
// default is therefore already the strategy. READ OUT OF THE CODE, THE ANSWER IS NO:
//
//   * DELEGATION REQUIRES A SUBJECT. `exo-delegated-events.ts:95` refuses a fill with no subject on
//     the first row that makes one (`refuse-exo-missing-subject.ts`). What it enforces is the
//     SUBJECT and not the handler's identity — `typeof` cannot tell a module-level function from a
//     closure, so the refusal bans the shape a row-capturing closure has rather than the closure.
//   * A SUBJECT DOES NOT REQUIRE DELEGATION. `createExoEventSlotSetter` — the SHIPPED direct pack's
//     setter, `exo-event-slot-setter.ts:19-29` — stores a handler and a subject in the same two
//     slots with no delegation anywhere in sight, and exempts a bare function from the subject check
//     because it may be a closure that knows its row.
//
// So there are TWO independent axes of change and the shipped default sits at one corner of them:
//
//                       │ handler, NO subject │ handler + subject
//     ──────────────────┼─────────────────────┼──────────────────────────
//     direct pack       │ `exodra·closure`    │ `exodra·op`        ← SHIPPED, both legal
//     delegated pack    │ REFUSED by name     │ `exodra·op·deleg`
//
// The shipped form is therefore NOT already the strategy: a user who writes `c.on(port, FLIP, item)`
// instead of `c.on(port, () => …)` has changed the work with no plugin, no pack and no render
// argument. That is the composition this axis takes as its strategy row, and the delegated pack is
// carried as a THIRD row so the two changes are separated rather than made together.
//
// WHAT THE TWO OP ROWS SHARE IS NOT TAKEN ON TRUST AND IS NOT PROVED BY THE PACK EITHER. They render
// the SAME component object, `ROW_OP`, under two backends, so no fill in them can differ. A mounting
// delegated row proves only that the port was filled WITH A SUBJECT; it says nothing about the
// handler being shared, and the run prints it as exactly that much.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE SCENARIO, AND WHAT THE OTHERS WOULD HAVE SHOWN ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// CHOSEN: 200 ROWS, EACH WITH ITS OWN FLAG AND ITS OWN READ-OUT, AND EVERY ROW IS CLICKED. A row is
// a button and a status field; clicking the button flips that row's `done` cell; the field shows the
// flipped state.
//
// WHY EVERY ROW IS CLICKED AND NOT ONE. Clicking one button a thousand times keeps one cell, one
// subject, one field and one inline cache maximally hot, and the shared form's whole claim is that
// ONE function serves EVERY row — a census that never exercises a second subject cannot see whether
// that claim costs anything. Rotating through all 200 gives `FLIP`'s `subject.done` two hundred
// different receivers, which is where a megamorphic site would show, and gives the floor two
// hundred different closures, which is where its own would.
//
// WHY THERE IS A CONSUMER AT ALL, which is `keystroke-floor`'s decision repeated because it shapes
// everything. A click that changes nothing on the page can be served by a floor whose handler is
// `state[i] = !state[i]` — one array store — while the framework pays a cell, a notification and a
// DOM write. The ratio would be enormous and would be a measurement of the framework against a
// program that does not do the job. WITH the read-out, all three programs move the same piece of DOM
// in response to the same event, and the gap between them is bookkeeping rather than absent work.
//
// WHY THE READ-OUT IS AN `<input>` AND ITS `value`, WHICH LOOKS ODD AND IS NOT. The gate has to see
// what the HANDLER WROTE, and a property does not serialise. `value` on an
// `<input>` is the one property form in this repository whose prototype byte-shape is pinned by a
// test rather than chosen here: `packages/dom/src/tests/attr-parity.test.ts` holds `@exodra/dom` to
// `<input>` and the server to `<input value="typed">`, so the floor's hand-written prototype has to
// print exactly `<input type="text" class="s">` and the gate refuses it otherwise. Using a `<span>`
// and its text would have made the whole gate a markup diff and measured nothing about a property
// write.
//
// WHAT THE OTHER SCENARIOS WOULD HAVE SHOWN, stated so this one cannot be read as the convenient
// choice:
//
//   ONE BUTTON, CLICKED REPEATEDLY. Every row would print a smaller number than it prints here, all
//   of them, because one hot receiver is the friendliest case for both the keyed load and the
//   closure. The ORDERING would very likely be the same, and nothing about "one function serves
//   every row" would have been tested. It is the flattering census, not the informative one.
//
//   A DIFFERENT HANDLER BODY. `FLIP`'s body is a load, a compare, a store and one attribute write. A body that
//   only stored a value would be cheaper, and one that called into user code dearer — and both are
//   the USER'S code, not the renderer's, which is why the renderer's side of the dispatch is the
//   part this axis holds fixed. NO OTHER BODY IS MEASURED HERE and no figure from this file may be
//   quoted for one.
//
//   A NESTED TREE, so the delegated walk is long. The walk here is button → row → container, three
//   nodes, which is the SHALLOWEST honest shape and therefore the FRIENDLIEST one to delegation. A
//   deep tree would make the delegated row worse and is not measured; the answer says so.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PROGRAMS. SEVEN ROWS, EACH CONSECUTIVE PAIR DIFFERING BY ONE NAMEABLE THING ─────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//   `driver`          THE INSTRUMENT'S OWN COST, and not a participant. The identical 200 rows, with
//                     their fields filled once and NO LISTENER ANYWHERE. Its click region constructs
//                     the same `MouseEvent` and calls the same `dispatchEvent` on the same buttons,
//                     and then nothing happens. EVERY OTHER CLICK ROW IS THIS ROW PLUS A HANDLER, so
//                     it is a common addend that inflates every row equally and DEFLATES every
//                     ratio. It is excluded from the click gate by construction — a program with no
//                     handler cannot produce the same DOM after clicking, and saying so is the point
//                     of the row.
//
//   `floor·per-el`    THE FLOOR, in the shape `exodra·closure` has. No components, no declaration,
//                     no reactivity, no schema, no connector, no library: one prototype parsed at
//                     module load, 200 clones, a two-hop walk each, 200 `addEventListener` calls, a
//                     `boolean[]` for the flags, and a handler that flips one slot and stores one
//                     string into `field.value`.
//
//   `floor·per-el·twin`  THE NULL. A second, independently declared copy of the row above — its own
//                     function objects, its own independently parsed prototype, the identical work
//                     on the identical data. Its true difference is ZERO by construction, so what
//                     the run measures between them is what this instrument returns when there is
//                     nothing to find.
//
//   `floor·root`      THE FLOOR, in the shape `exodra·op·deleg` has. Everything identical except
//                     that ONE listener goes on the container and the handler discovers the row from
//                     the element. It does that with ONE expando index written at mount, which is
//                     the cheapest correct thing a hand-written program can do and is NOT a scan —
//                     `keystroke-floor`'s root floor could afford a linear scan because only one of
//                     its fifty fields had a consumer, and here all 200 do. Both floor spellings are
//                     built because "what is the floor allowed to do" has no obvious answer and a
//                     floor chosen by argument is a floor chosen to flatter whoever argued; the run
//                     takes the CHEAPER of the two and says which one won.
//
//   `exodra·closure`  THE RENDERER AS MOST PAGES USE IT: the same schema, the same value binding,
//                     and `c.on(P.click, () => { … })` — one closure per row, under the shipped
//                     `EXO_DIRECT_EVENTS` pack.
//
//   `exodra·op`       THE RENDERER AS IT SHIPS, THROUGH A SHARED HANDLER, AND THE SUBJECT OF THIS
//                     AXIS. Identical in schema, in binding and in pack; the ONLY difference from
//                     the row above is `c.on(P.click, FLIP, subject)` — ONE module-level function
//                     for the whole process and one one-field subject object per row.
//
//   `exodra·op·deleg` THE STRATEGY, COMPOSED: the same handler, the same subjects, the same
//                     binding, rendered through a backend composed once at module load with a
//                     delegating `events` pack (see `DELEGATED_BACKEND`), 200 render calls into
//                     the container.
//                     It differs from `exodra·op` in WHO LISTENED and in nothing else. `click` is in
//                     neither `EXO_NON_BUBBLING_EVENTS` nor `EXO_HIGH_FREQUENCY_EVENTS`, so it
//                     delegates with no opt-in.
//
// WHAT WAS CONSIDERED AND NOT BUILT, so the space is closed rather than sampled:
//
//  * A CLOSURE UNDER THE DELEGATED PACK. It is LEGAL — the pack refuses a fill with no subject, not
//    a function — so a closure that also passed a subject would mount and would price a per-row
//    closure under a root listener. It is not built, and the empty corner of the 2×2 above is a
//    refusal only of the subjectless fill.
//  * A SECOND PACK OVER ONE ROOT. `exo-delegated-events.ts:13-15` gives each pack its own slot
//    namespace precisely so two can coexist; measuring two is a question about the namespace, not
//    about a handler form.
//  * TEARDOWN. `exo-event-slot-setter.ts:10-11` states that a listener is deliberately NOT
//    registered for disposal, and `teardown-floor` owns that half. Nothing here is timed on the way
//    out.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE DRIVER, AND WHAT IT THEREFORE DOES NOT MEASURE. READ THIS BEFORE QUOTING ANYTHING. ──
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ONE "CLICK" IN THIS FILE IS EXACTLY ONE STATEMENT:
//
//     button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
//
// THE DRIVER IS NOT FREE, AND IT IS THE LARGEST SINGLE HAZARD ON THIS PAGE. `keystroke-floor`
// measured its own event-dispatch instrument at 74.6% OF A FLOOR KEYSTROKE. This driver is the same
// order — an event construction and a `dispatchEvent` that bubbles three levels — so the same
// correction applies and for the same reason. IT IS A COMMON ADDEND: it sits inside every timed
// region, so it inflates every row equally and makes every RAW ratio SMALLER than the truth. That is
// why `driver` is a row rather than a footnote. Every headline is printed twice, raw and with
// `driver` subtracted from both sides, AND EVERY CORRECTED FIGURE IS A DIFFERENCE OF SMALL NUMBERS —
// two quantities of the same order subtracted from each other, whose relative error is therefore
// larger than either input's. The run prints the resolution floor beside them so the reader can see
// how much of the corrected digit is instrument.
//
// A SYNTHETIC `click` IS NOT A CLICK, and the list of what it skips is not short:
//
//  * `isTrusted` IS `false` ON EVERY EVENT HERE. Nothing in `@exodra/dom` reads it — `direct-
//    listener-for.ts` and `exo-delegated-listener.ts` read `currentTarget`, `target`,
//    `cancelBubble` and nothing else — but the BROWSER does.
//  * NO DEFAULT ACTION AND NO ACTIVATION BEHAVIOUR. A real click on a `<button>` inside a form
//    submits it; a real click on a label focuses its control; a real click on a checkbox flips
//    `checked` before any listener runs. NONE of that happens here, and the shape was chosen so that
//    it cannot: the clicked element is a bare `<button type="button">` with no form around it. A
//    row whose op fought the browser's own activation behaviour would score identically here.
//  * NO FOCUS CHANGE, NO SELECTION, NO SCROLL-INTO-VIEW, NO HIT TESTING. A real click is preceded by
//    `pointerdown`/`mousedown`/`focus`/`pointerup`/`mouseup` and is delivered to whatever element hit
//    testing found. This driver hands the event straight to a known element and dispatches ONE type.
//  * ANYTHING AFTER THE HANDLER RETURNS. Style recalculation, layout, paint and compositing from the
//    property write are charged to whatever runs next, which here is the next click. Every row pays
//    it and no row's timed region contains all of its own — `mount-phases`, `import-node-trade` and
//    `keystroke-floor` carry the same hazard and state it the same way.
//  * HUMAN RATE. A person clicks a few times a second. This driver clicks 1200 times into one region
//    as fast as the machine allows, so every inline cache is hot and every branch is predicted. THAT
//    FLATTERS EVERY ROW, and it flatters the row with the most code to warm up the most.
//
// SO WHAT THIS AXIS MEASURES IS EXACTLY ONE THING: THE JAVASCRIPT A PAGE RUNS IN RESPONSE TO A
// `click` EVENT, AND THE DOM WRITE THAT JAVASCRIPT MAKES. It is not a click's wall-clock cost, it is
// not interaction latency, and it must never be quoted as either.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE CLOCK, AND THE THREE REFUSALS THAT ARE NOT ABOUT THE PROGRAMS ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE QUANTUM IS OBSERVED, NOT ASSUMED. `observeTimerQuantum()` spins until `performance.now()`
// moves and keeps the smallest step it ever takes, a hundred times. Any timed region under
// `MIN_TICKS` (3) of that is REFUSED BY NAME and the run prints the exact batch that would clear it,
// as a command line. `keystroke-floor` needed batch 8 to resolve its strategy rows and this axis
// should be expected to want the same: the differences it is asked for — one property load, and a
// delegated dispatch against a direct one — are the smallest quantities in the file, and no number
// of rounds makes a quantised region unquantised.
//
// A LADDER THAT DOES NOT NEST IS REFUSED. Every click row is `driver` PLUS a handler, so no row may
// measure below `driver`. Three axes in this suite printed that refusal today; if it prints here the
// subtractions are unreadable and the corrected column is noise wearing a decimal point.
//
// AND THE NULL IS CHECKED AGAINST THE CLAIM IT SUPPORTS. If the resolution floor is a large fraction
// of the smallest difference the table is asked to resolve, the run says so: the rows are then an
// ORDERING and not a set of sizes.
//
// ONE AXIS AT A TIME. Memory pressure has crashed multi-axis runs in this suite, and two shapes in
// one process give the hot loops two hidden classes.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE GATE, WHICH RUNS BEFORE ANYTHING IS TIMED ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The programs must produce IDENTICAL DOM after the SAME sequence of clicks, and `innerHTML` alone
// cannot see that here: what the handler ultimately writes is `input.value`, A DOM PROPERTY, AND A
// PROPERTY DOES NOT SERIALISE. A markup-only gate would pass a program that flipped a boolean and
// never touched the page.
//
// So the snapshot is TWO SEPARATELY COMPARED PARTS:
//
//   * the container's markup, comments stripped, through this suite's shared `markupOf`;
//   * every field's live `.value` PROPERTY *and* its `value` ATTRIBUTE, by index, both of them,
//     because on this port they are two different facts and only one of them is in the markup.
//
// AND IT IS STEPPED, NOT CHECKED AT THE END. Two passes over 200 rows return every flag to `false`,
// so an end-state comparison would pass a program that did nothing at all — `update-floor`'s lesson
// on three of its five transitions. The gate compares every program against `exodra·op` after EVERY
// ONE of 400 clicks, and throws with the step number and both differing parts.
//
// THE PARTS ARE DIFFED SEPARATELY AND EVERY DIFFERING PART IS REPORTED. Concatenated into one
// string the markup comes first, so a markup difference would be the only thing a "first difference
// at char N" line could point at and a property difference would be invisible until it was fixed.
//
// AND THE PROTOTYPES ARE PRINTED BEFORE THE GATE RUNS, all of them, so a divergence of the
// ` value=""` kind is read at the top of the output instead of being rediscovered halfway down.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// This is JUDGEMENT plus citations. I MEASURED NONE OF IT — I ran nothing at all — and it is written
// down first so the run reads as a test of it rather than as a story told afterwards. Every
// falsifier is printed mechanically at the end so that nobody, including me, gets to choose which
// one counted.
//
//   P1. `exodra·op / floor` PER CLICK, DRIVER-CORRECTED, LANDS BETWEEN 1.3 AND 3.0.
//       MECHANISM: on top of the floor's flip and property store, the renderer's path runs the
//       shared listener's `currentTarget` read and two expando loads, a call, a keyed load on the
//       subject, the flip, and the
//       derived recompute. All of that is JS; only the final store crosses into Blink, and this
//       repository's standing prior is that DOM work dominates dispatch work (`update-floor`
//       measured dispatch at +12.5 µs against +62.5 µs of reconcile/records/boundary — A CITATION,
//       not this run).
//       (a) BELOW 1.05 falsifies it: the renderer's path is free next to one property store.
//       (b) ABOVE 4.0 falsifies it the other way: three quarters of a click is ours.
//
//   P2. `exodra·op` MEASURES ABOVE `exodra·closure` PER CLICK, past the resolution floor.
//       MECHANISM: both forms are reached through the SAME shared listener and the same two slot
//       loads, so the whole per-dispatch difference is where the cell comes from — one keyed load on
//       a user object against a closure-context slot. That is a very small thing to ask of this
//       instrument and it may well sit under the resolution floor. THE SHARED FORM IS NOT A FASTER
//       HANDLER AND NOTHING IN THOSE FILES CLAIMS IT IS.
//       (c) IF IT IS NOT ABOVE, the subject's keyed load is free at this scale and nothing in the
//       dispatch path separates the two forms.
//
//   P3. `exodra·op` MEASURES BELOW `exodra·closure` AT MOUNT, past the mount resolution floor.
//       MECHANISM: both write the same two slots, so what is left is what each row allocates — a
//       function object over its own context against a one-field subject object. 200 rows is 200
//       closures against 200 subjects.
//       (d) IF IT IS NOT BELOW, the two allocations cost the same at 200 rows and this census
//       cannot separate them.
//
//   P4. `exodra·op·deleg` MEASURES ABOVE `exodra·op` PER CLICK AND BELOW IT AT MOUNT.
//       MECHANISM: per click it adds `exo-delegated-listener.ts`'s walk — three `nodeType`
//       tests, three expando loads, a `cancelBubble` read and a root identity test — against a
//       direct listener already on the target; at mount it deletes 200 `addEventListener` calls and
//       adds one root installation.
//       (e) EITHER HALF FAILING is a finding about the delegated pack, not about this axis: if it
//       wins the click, the walk is cheaper than a per-element registration's dispatch; if it loses
//       the mount, delegation's one advertised advantage does not appear at 200 elements and the
//       size at which it does is unknown.
//
//   P5. `driver` IS MORE THAN HALF OF EVERY CLICK ROW. MECHANISM: an event construction and a
//       bubbling `dispatchEvent` are crossings into Blink, against a handful of JS property loads
//       and one DOM write; `keystroke-floor` measured the same instrument at 74.6% of its floor.
//       (f) IF IT IS UNDER A QUARTER, the JS is the cost, the raw ratios are readable without
//       correction, and the corrected column is an over-scrupulous rounding.
//
//   THE MODEL CAN BE RIGHT FOR THE WRONG REASON. P2 holding while P3 fails would mean the shared
//   form costs more per dispatch AND saves nothing at mount, which would make it purely a capability
//   — it is what delegation requires, and it is what lets one function serve a whole list — with no
//   performance case of its own at this census. That is a true and publishable finding.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THIS AXIS DOES NOT ANSWER ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  * NOTHING ABOUT REAL CLICKS, INTERACTION LATENCY OR RESPONSIVENESS. See the driver's limits.
//  * NOTHING ABOUT ANY OTHER HANDLER BODY. A toggle is the body measured; a body that calls into
//    user code is user code this axis never runs.
//  * NOTHING ABOUT A DEEP TREE. The delegated walk here is three nodes, the friendliest case.
//  * NOTHING ABOUT TWO PACKS OVER ONE ROOT, ABOUT `stopPropagation`, OR ABOUT NESTED HANDLERS —
//    `exo-delegated-listener.ts:23-29` fixes those semantics (the walk does not stop at the first
//    match, it does stop on `cancelBubble`, and it stops at the root) and none of them are exercised
//    by a flat list clicked one leaf at a time.
//  * NOTHING ABOUT TEARDOWN OR MEMORY. No heap column is printed and none would mean anything.
//  * NOTHING ABOUT THE REFUSALS. Every throw on this path ends the program; a passing run never
//    evaluates one.
//  * THE FLOOR IS NOT MEASURED OUT OF A BUILT PACKAGE. `@exodra/core` and `@exodra/dom`
//    resolve to their tsup `dist`; the floor programs are in this file and go
//    through the dev server's esbuild. One transpiler against another, and it is the one difference
//    between these rows that is not a program. `mount-floor` carries the same asymmetry as its
//    caveat A.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HOW TO RUN IT ───────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- op-click-floor 100 1
//
// ONE AXIS AT A TIME — memory pressure has crashed multi-axis runs in this suite. The third
// positional is the BATCH and it is HONOURED, as `teardown-phases`' and `keystroke-floor`'s are: it
// multiplies every phase's repetition factor, which is what the clock refusal asks for by name.
// Start at batch 1 — a click region is already 1200 dispatches — and raise it to whatever the
// refusal line prints if the strategy rows do not resolve. `@exodra/*` resolve to their BUILT dists,
// so `npm run build:all` at the repository root has to have run or every `exodra` row is last week's
// code.
// `composeExoPlugins` is how an AD-HOC pack — one written here rather than shipped as a `with*`
// decorator — is composed onto a backend now that `withExoCompiler(new ExoDomBackend(...))` takes no packs. It
// MUTATES and returns the object it is handed, so `DELEGATED_BACKEND` stays ONE identity, which is
// what the schema cache needs: it keys the backend by pointer.
import {
    createExoSchema,
    composeExoPlugins,
    type TExoAttrPort,
    type TExoEventPort,
} from '@exodra/core';
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    exoDomSchemaOf,
    type TExoDomMachine,
    type TExoDomNode,
    withExoCompiler,
} from '@exodra/dom';
import type { TExoDomBackend, TExoCompilerApi } from '@exodra/dom';
import { markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';

const machineOf = (
    declaration: TExoCursorDeclaration<unknown>,
    forms: unknown[]
): TExoMachine<never> => ({
    declaration,
    forms,
    createInitialState: null,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
});

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE CENSUS. One place, so no two programs can drift by a constant.
// ---------------------------------------------------------------------------------------

/** Rows in the list. See the header on why every one of them is clicked. */
const ROWS = 200;
/** Elements in the finished list: a row div, a button and a field, per row. */
const ELEMENTS = ROWS * 3;

/**
 * WHAT THE FIELD SHOWS. Written with `=== true` and not truthiness, which is the rule `FLIP` below
 * uses: the two agree on every falsy value and disagree on every truthy value that is not `true`. A
 * floor that used `!v` would be a different program on any value that is not a boolean, and this
 * file's discipline is that the floor and the framework must be doing the same job.
 *
 * SHARED BY THE FLOOR AND THE FRAMEWORK on purpose: one function object, one set of inline caches,
 * warmed equally by every row. A separate copy per program would put a difference between them that
 * is not the thing being measured.
 */
const label = (v: boolean): string => (v === true ? 'done' : 'todo');

/**
 * CLICKS PER TIMED REGION — six full passes over the list.
 *
 * A click is a small thing and the browser's clock is clamped near 0.1 ms, so a region of one would
 * be the clamp printed however many times the run asks for. SIX AND NOT FIVE because six is EVEN:
 * every row is flipped an even number of times, so a region ends in the state it began in and
 * repeated regions are identical. The run OBSERVES its quantum rather than assuming this number is
 * enough, and refuses by name any row whose region landed under three ticks.
 */
const CLICKS = ROWS * 6;

/**
 * CLICKS THE GATE STEPS THROUGH — two full passes, compared after every one.
 *
 * Two, so the sequence returns to its starting state and the gate is proved to be watching the
 * middle of a cycle rather than its ends. An end-state check alone would pass a program that did
 * nothing.
 */
const GATE_CLICKS = ROWS * 2;

// ---------------------------------------------------------------------------------------
// THE SCHEMA — one row: a button that carries the event port, and a field that carries the value
// port. No components inside it, on purpose: a component boundary is ~11% of a mount elsewhere in
// this repository and the floor would have nothing to match it with.
//
// THE BUTTON HAS NO TEXT. A static text child would need a cursor call this file does not otherwise
// use, and an empty button is dispatched to directly — there is no hit testing here, so nothing about
// the measurement depends on it having a face.
// ---------------------------------------------------------------------------------------

type TRowPorts = {
    readonly click: TExoEventPort;
    readonly value: TExoAttrPort;
};

const ROW_SCHEMA = createExoSchema<TRowPorts>((b) => {
    let click!: TExoEventPort;
    let value!: TExoAttrPort;
    b.el('div', { class: 'r' }, (row) => {
        row.el('button', { type: 'button', class: 't' }, (btn) => {
            click = btn.eventPort('click');
        });
        row.el('input', { type: 'text', class: 's' }, (field) => {
            value = field.port('value');
        });
    });
    return { click, value };
});
const ROW_SCHEMA_FORMS: unknown[] = [];

/** The ports, hoisted once at module load — one property load, as a wire factory would give. */
const P = ROW_SCHEMA.ports;

// ---------------------------------------------------------------------------------------
// THE THREE `@exodra/dom` PROGRAMS. One declaration, three wires — so nothing between them is a
// difference of markup, of schema, of port numbering or of prototype.
// ---------------------------------------------------------------------------------------

/**
 * ONE HANDLER FOR THE WHOLE PROCESS — the thing a row-capturing closure cannot be. Declared at
 * MODULE LEVEL, so the 200 rows share one function object and allocate only their subjects.
 *
 * It holds NO row: the row ARRIVES as the second argument, stored on the element beside the handler
 * by `c.on`. `this` is the element the listener fired on, and nothing here reads it.
 *
 * `exodra·op` AND `exodra·op·deleg` ARE THE SAME `ROW_OP` under two backends, so the two rows cannot
 * differ in what they filled — which is a stronger guarantee than either pack could give.
 */
function FLIP(this: Element, _event: Event, subject?: unknown): void {
    const row = subject as TRowSubject;
    const next = row.done === true ? false : true;
    row.done = next;
    row.node.attr(P.value, label(next));
}

/** The subject the shared handler is handed: one object per row, holding that row's state. */
type TRowSubject = { readonly node: TExoDomNode; done: boolean };

/** THE SHARED-HANDLER FORM — the subject of this axis: one `FLIP` for the process, 200 subjects. */
const ROW_OP: TExoDomMachine = {
    declaration: ROW_SCHEMA,
    forms: ROW_SCHEMA_FORMS,
    createInitialState: (c: TExoDomNode) => {
        c.attr(P.value, label(false));
        const subject: TRowSubject = { node: c, done: false };
        c.on(P.click, FLIP, subject);
    },
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

/**
 * THE CLOSURE FORM — identical in schema, in binding and in pack; the ONLY difference is what goes
 * into the event port.
 *
 * The body is the engine's own toggle rule written out, so the two programs perform the same
 * mutation and the difference between them is HOW THE HANDLER WAS REACHED and nothing else.
 */
const ROW_CLOSURE: TExoDomMachine = {
    declaration: ROW_SCHEMA,
    forms: ROW_SCHEMA_FORMS,
    createInitialState: (c: TExoDomNode) => {
        let done = false;
        c.attr(P.value, label(false));
        c.on(P.click, () => {
            done = done === true ? false : true;
            c.attr(P.value, label(done));
        });
    },
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

/**
 * THE TWO BACKENDS, COMPOSED ONCE AT MODULE LOAD — the shipped one and the delegating one.
 *
 * THE STRATEGY IS A BACKEND NOW, NOT AN ARGUMENT TO A RENDER: an application composes the object
 * that has the strategy and renders through it. Their IDENTITY is what keeps the schema cache
 * hitting — a backend is the cache key, compared by POINTER, so one built inside a scenario would
 * recompile `ROW_SCHEMA`, markup parse included, per mount.
 *
 * They differ in `events` and in nothing else, which is what makes `exodra·op·deleg` a row about
 * who listened rather than a row about two renderers.
 */
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const DELEGATED_BACKEND = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    events: () => createExoDelegatedEvents(['click']),
});

// ---------------------------------------------------------------------------------------
// THE FLOOR'S PROTOTYPE. Parsed once at module load out of a `<template>` and LEFT WHERE THE PARSER
// PUT IT — template-contents owner document, which is where `@exodra/dom`'s prototypes live since
// `importNode` was dropped from its compiler. A floor that page-owned its prototype where the
// renderer does not would be handing the renderer free advantage on the mount row.
//
// ═══ NO ` value=""` ON THE FIELD, AND THE GATE IS WHAT DECIDES THAT ═══
//
// The compiler reserved an empty placeholder for every attribute port and kept the one on
// `<input value>`, because the shipped fill writes `el.value`, THE PROPERTY, and never the
// attribute. Nothing reserves a placeholder now: `@exodra/dom` renders `<input>` and the server
// renders `<input value="typed">`, both pinned in `packages/dom/src/tests/attr-parity.test.ts`. A
// floor that still printed ` value=""` is a different program from the renderer, and the gate here
// refused to time it until this markup followed.
// ---------------------------------------------------------------------------------------

const ROW_MARKUP =
    '<div class="r"><button type="button" class="t"></button>' +
    '<input type="text" class="s"></div>';

function protoOf(markup: string): Element {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as Element;
}

/** Two independently parsed prototypes. The second is the null's — see `floor·per-el·twin`. */
const FLOOR_PROTO_1 = protoOf(ROW_MARKUP);
const FLOOR_PROTO_2 = protoOf(ROW_MARKUP);

/**
 * WHAT A FLOOR PROGRAM HOLDS AFTER IT HAS BUILT THE LIST.
 *
 * The cheapest retention that answers "can this program come back to that node later": three flat
 * arrays of the exact final length. No per-row objects, no map, no keys, no records — a floor uses
 * the cheapest form of everything. `@exodra/dom` keeps something structurally different, and that
 * difference is part of what the gap contains rather than something this file tries to reproduce.
 */
interface FloorHandle {
    readonly buttons: HTMLButtonElement[];
    readonly fields: HTMLInputElement[];
    readonly rows: Element[];
    readonly done: boolean[];
}

/** Fresh arrays of the exact final length: the row count is a constant of this axis. */
function emptyHandle(): FloorHandle {
    return {
        buttons: new Array<HTMLButtonElement>(ROWS),
        fields: new Array<HTMLInputElement>(ROWS),
        rows: new Array<Element>(ROWS),
        done: new Array<boolean>(ROWS).fill(false),
    };
}

// ---------------------------------------------------------------------------------------
// FLOOR (1) — ONE LISTENER PER BUTTON. The shape `exodra·closure` and `exodra·op` both have.
// ---------------------------------------------------------------------------------------

function mountFloorPerEl(container: HTMLElement, proto: Element): FloorHandle {
    const h = emptyHandle();
    const buttons = h.buttons;
    const fields = h.fields;
    const rows = h.rows;
    const done = h.done;
    for (let i = 0; i < ROWS; i++) {
        const row = proto.cloneNode(true) as Element;
        const button = row.firstChild as HTMLButtonElement;
        const field = button.nextSibling as HTMLInputElement;
        buttons[i] = button;
        fields[i] = field;
        rows[i] = row;
        // The initial fill, exactly as the row machines write it at mount.
        field.value = label(false);
        const at = i;
        button.addEventListener('click', () => {
            const next = done[at] === true ? false : true;
            done[at] = next;
            field.value = label(next);
        });
        container.appendChild(row);
    }
    return h;
}

/**
 * THE NULL. A SECOND, INDEPENDENTLY DECLARED COPY of the function above and of the handler it
 * attaches — its own function objects, its own inline caches, its own prototype, the identical work
 * on the identical data.
 *
 * ITS TRUE DIFFERENCE FROM `mountFloorPerEl` IS ZERO BY CONSTRUCTION, so what the run measures
 * between them is what this instrument returns when there is nothing to find. It is duplicated
 * SOURCE and not a second call to the same function on purpose: calling one function twice would
 * share everything V8 learned about it and would measure a floor far below the one a real pair of
 * programs sits on.
 */
function mountFloorPerElTwin(container: HTMLElement, proto: Element): FloorHandle {
    const h = emptyHandle();
    const buttons = h.buttons;
    const fields = h.fields;
    const rows = h.rows;
    const done = h.done;
    for (let i = 0; i < ROWS; i++) {
        const row = proto.cloneNode(true) as Element;
        const button = row.firstChild as HTMLButtonElement;
        const field = button.nextSibling as HTMLInputElement;
        buttons[i] = button;
        fields[i] = field;
        rows[i] = row;
        field.value = label(false);
        const at = i;
        button.addEventListener('click', () => {
            const next = done[at] === true ? false : true;
            done[at] = next;
            field.value = label(next);
        });
        container.appendChild(row);
    }
    return h;
}

// ---------------------------------------------------------------------------------------
// FLOOR (2) — ONE LISTENER ON THE CONTAINER. The shape `exodra·op·deleg` has.
//
// `click` bubbles, so one registration on the container serves all 200 rows. The handler has to
// discover WHICH row the event is about, and it does it the cheapest way a hand-written program can:
// ONE expando index written on the button at mount, read back off `e.target`. That is honest and it
// is not free — it is the same kind of store the framework makes, and the framework makes TWO of
// them (the handler and the subject) where this makes one. A linear scan would have been the
// alternative and would have been dishonestly slow at 200 rows with a consumer on every one;
// `keystroke-floor`'s root floor could afford one only because 49 of its 50 fields had no consumer.
// ---------------------------------------------------------------------------------------

/** The expando the root floor uses to find its row. One store per row, read back per click. */
const FLOOR_INDEX = '__floorRow';

function mountFloorRoot(container: HTMLElement, proto: Element): FloorHandle {
    const h = emptyHandle();
    const buttons = h.buttons;
    const fields = h.fields;
    const rows = h.rows;
    const done = h.done;
    for (let i = 0; i < ROWS; i++) {
        const row = proto.cloneNode(true) as Element;
        const button = row.firstChild as HTMLButtonElement;
        const field = button.nextSibling as HTMLInputElement;
        buttons[i] = button;
        fields[i] = field;
        rows[i] = row;
        field.value = label(false);
        (button as unknown as Record<string, unknown>)[FLOOR_INDEX] = i;
        container.appendChild(row);
    }
    container.addEventListener('click', (e) => {
        const at = (e.target as unknown as Record<string, unknown>)[FLOOR_INDEX];
        if (typeof at !== 'number') return;
        const next = done[at] === true ? false : true;
        done[at] = next;
        fields[at].value = label(next);
    });
    return h;
}

// ---------------------------------------------------------------------------------------
// THE DRIVER'S OWN LIST — the identical tree, the fields filled once, NO LISTENER ANYWHERE.
//
// Its MOUNT row is the DOM work alone, and it passes the mount gate because the tree is the same.
// Its CLICK row is the instrument's own cost and it is EXCLUDED FROM THE CLICK GATE by construction:
// a program with no handler cannot produce the same DOM after clicking, which is the entire point of
// the row.
// ---------------------------------------------------------------------------------------

function mountDriver(container: HTMLElement, proto: Element): FloorHandle {
    const h = emptyHandle();
    const buttons = h.buttons;
    const fields = h.fields;
    const rows = h.rows;
    for (let i = 0; i < ROWS; i++) {
        const row = proto.cloneNode(true) as Element;
        const button = row.firstChild as HTMLButtonElement;
        const field = button.nextSibling as HTMLInputElement;
        buttons[i] = button;
        fields[i] = field;
        rows[i] = row;
        field.value = label(false);
        container.appendChild(row);
    }
    return h;
}

// ---------------------------------------------------------------------------------------
// THE DRIVER. One statement per click, identical for every row — see the header on what it therefore
// does not measure.
// ---------------------------------------------------------------------------------------

/**
 * ONE CLICK.
 *
 * `MouseEvent` rather than `Event`, because that is the interface a real click dispatches and a
 * handler is free to read its fields. `bubbles: true` because the delegated dispatcher listens on
 * the root and a non-bubbling event would silently never reach it — which would make the delegated
 * row the fastest in the table by doing nothing. `cancelable: true` because a real click is, and
 * `exo-delegated-listener.ts:67` reads `cancelBubble` on the way up.
 */
function clickOne(button: HTMLButtonElement): void {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** `CLICKS` clicks rotating through every row — the whole of a click phase's timed region. */
function clickMany(buttons: HTMLButtonElement[]): void {
    for (let j = 0; j < CLICKS; j++) clickOne(buttons[j % ROWS]);
}

// ---------------------------------------------------------------------------------------
// THE PROGRAM TABLE. One record per row, so nothing below names a winner in advance.
// ---------------------------------------------------------------------------------------

interface Handle {
    readonly dispose: () => void;
    readonly buttons: HTMLButtonElement[];
}

interface Program {
    readonly name: string;
    /** Mount into a fresh container and hand back a disposer and the clickable buttons. */
    readonly mount: (c: HTMLElement) => Handle;
    /** What the row is, printed under every table. */
    readonly what: string;
    /** `false` for `driver`, which by construction cannot produce the same DOM after clicking. */
    readonly gated: boolean;
}

const floorProgram =
    (mount: (c: HTMLElement, p: Element) => FloorHandle, proto: Element) =>
    (c: HTMLElement): Handle => {
        const h = mount(c, proto);
        return {
            buttons: h.buttons,
            dispose: () => {
                for (let i = 0; i < ROWS; i++) h.rows[i].remove();
            },
        };
    };

const buttonsOf = (c: HTMLElement): HTMLButtonElement[] => {
    const found = c.querySelectorAll('button');
    const out = new Array<HTMLButtonElement>(found.length);
    for (let i = 0; i < found.length; i++) out[i] = found[i] as HTMLButtonElement;
    return out;
};

const exodraProgram =
    (component: TExoDomMachine, backend: TExoDomBackend & TExoCompilerApi = EXO_BACKEND) =>
    (c: HTMLElement): Handle => {
        // THE ROWS ARE A LOOP OF `render` CALLS, and that is a change to the MOUNT row's shape:
        // `render` mounts ONE instance, so the entry point's fixed setup — one teardown scope —
        // is paid per row where the whole batch used to pay one. (It used to include an
        // `exoContextAt` climb out of the container as well; that walk was removed.) The floor
        // programs never had an equivalent, so the mount
        // comparison moved by exactly that; a mount number recorded before this change is not
        // comparable with one after it. THE CLICK TABLE IS UNTOUCHED: nothing here is in it.
        //
        // Neither wire in this file reads its index — each row holds its own flag — so every row
        // is wired the same way, and the DOM the gate compares does not depend on it.
        const offs: (() => void)[] = new Array<() => void>(ROWS);
        for (let i = 0; i < ROWS; i++) offs[i] = backend.render(component, c);
        const dispose = (): void => {
            for (const off of offs) off();
        };
        return { buttons: buttonsOf(c), dispose };
    };

const PROGRAMS: readonly Program[] = [
    {
        name: 'driver',
        mount: floorProgram(mountDriver, FLOOR_PROTO_1),
        what: "the instrument's own cost — MouseEvent + bubbling dispatch, NO handler",
        gated: false,
    },
    {
        name: 'floor·per-el',
        mount: floorProgram(mountFloorPerEl, FLOOR_PROTO_1),
        what: 'no framework: 200 clones, a walk, 200 listeners, a boolean[], one property store',
        gated: true,
    },
    {
        name: 'floor·per-el·twin',
        mount: floorProgram(mountFloorPerElTwin, FLOOR_PROTO_2),
        what: 'the NULL — a second declaration of the row above, true Δ = 0',
        gated: true,
    },
    {
        name: 'floor·root',
        mount: floorProgram(mountFloorRoot, FLOOR_PROTO_1),
        what: 'no framework: the same, ONE listener on the container and an expando index',
        gated: true,
    },
    {
        name: 'exodra·closure',
        mount: exodraProgram(ROW_CLOSURE),
        what: '@exodra/dom, shipped direct pack, ONE CLOSURE PER ROW in the click port',
        gated: true,
    },
    {
        name: 'exodra·op',
        mount: exodraProgram(ROW_OP),
        what: 'THE SUBJECT — the same, ONE shared handler function + 200 subjects, direct pack',
        gated: true,
    },
    {
        name: 'exodra·op·deleg',
        mount: exodraProgram(ROW_OP, DELEGATED_BACKEND),
        what: 'the same shared handler and subjects under createExoDelegatedEvents([click])',
        gated: true,
    },
];

/** The rows the ANSWER is allowed to take a floor from: fair programs, not the instrument. */
const FLOOR_ROWS = ['floor·per-el', 'floor·root'] as const;

// ---------------------------------------------------------------------------------------
// THE GATE. Nothing is timed until every program has been shown to produce the SAME DOM after the
// SAME clicks — stepped, because two passes return the list to where it started.
// ---------------------------------------------------------------------------------------

/**
 * EVERYTHING A CLICK CAN HAVE MOVED, IN TWO SEPARATELY COMPARABLE PARTS.
 *
 * `innerHTML` alone is not enough and that is the whole reason this exists: what the handler
 * ultimately writes is `input.value`, a DOM PROPERTY, and a property does not serialise — so a
 * markup-only gate would pass a program that flipped a boolean and never touched the page. The
 * property AND the attribute are both read, because on this port they are two different facts.
 *
 * TWO PARTS RATHER THAN ONE STRING, because a concatenation puts the markup first and a "first
 * difference at char N" can then only ever point INSIDE the markup, leaving a property divergence
 * invisible until the markup one is fixed.
 *
 * WHAT IS DELIBERATELY NOT COMPARED: the expando slots. `exo-event-slot-setter.ts:26-27` and
 * `exo-delegated-events.ts:98-99` write two properties per element, under DIFFERENT owner
 * namespaces per strategy, and `floor·root` writes one of its own. Those are the implementations,
 * not the output, and they are SUPPOSED to differ.
 */
interface Snapshot {
    readonly markup: string;
    readonly fields: string;
}

function snapshot(container: HTMLElement): Snapshot {
    const inputs = container.querySelectorAll('input');
    let fields = '';
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i] as HTMLInputElement;
        fields +=
            `input[${i}] .value=${JSON.stringify(input.value)}` +
            ` value-attr=${JSON.stringify(input.getAttribute('value'))}\n`;
    }
    return { markup: markupOf(container), fields };
}

/** Where two strings first part company, with enough either side to be readable. */
function firstDifference(want: string, got: string): string {
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    const from = Math.max(0, at - 120);
    return (
        `first difference at char ${at}\n` +
        `    exodra·op: …${want.slice(from, at + 200)}…\n` +
        `    theirs:    …${got.slice(from, at + 200)}…`
    );
}

/**
 * COMPARE BOTH PARTS AND NAME EVERY ONE THAT DIFFERS, then throw once.
 *
 * It does not stop at the first failing part: a run that reports one defect per invocation is a run
 * the operator has to repeat once per defect, and this suite's discipline is that a gate should tell
 * you everything it knows in the run that found it.
 */
function throwOnDiff(who: string, stage: string, want: Snapshot, got: Snapshot): void {
    const parts: string[] = [];
    if (want.markup !== got.markup) {
        parts.push(`  MARKUP — ${firstDifference(want.markup, got.markup)}`);
    }
    if (want.fields !== got.fields) {
        parts.push(
            '  FIELDS (.value property and value attribute) — ' +
                firstDifference(want.fields, got.fields)
        );
    }
    if (parts.length === 0) return;
    refuse(
        `gate op-click-floor/${who} @ ${stage}: DIFFERENT state in ${parts.length} of 2 parts\n` +
            parts.join('\n')
    );
    throw new Error(
        `op-click-floor: "${who}" is in a different state from the reference @ ${stage} ` +
            `(${parts.length} of 2 parts differ) — the timings below would be comparing ` +
            'different programs'
    );
}

function gate(): void {
    const mounted = PROGRAMS.filter((p) => p.gated).map((p) => {
        const c = el();
        const h = p.mount(c);
        return { p, c, h };
    });
    const reference = mounted.find((m) => m.p.name === 'exodra·op');
    if (reference === undefined) throw new Error('op-click-floor: no reference row');

    const check = (stage: string): void => {
        const want = snapshot(reference.c);
        for (const m of mounted) {
            if (m === reference) continue;
            throwOnDiff(m.p.name, stage, want, snapshot(m.c));
        }
    };

    check('as mounted');
    // STEPPED THROUGH TWO WHOLE PASSES. An end-state check would pass a program that did nothing,
    // because click 400 returns every flag to `false` — `update-floor`'s lesson, on three of its
    // five transitions.
    for (let j = 0; j < GATE_CLICKS; j++) {
        const at = j % ROWS;
        for (const m of mounted) clickOne(m.h.buttons[at]);
        check(`after click ${j + 1}/${GATE_CLICKS} (row ${at})`);
    }
    line(
        `gate op-click-floor: ${mounted.length} programs identical as mounted and after all ` +
            `${GATE_CLICKS} clicks of two full passes — markup, all ${ROWS} .value properties and ` +
            `all ${ROWS} value attributes`
    );
    line(
        'gate op-click-floor: "driver" is EXCLUDED — it attaches no handler, so it cannot ' +
            'produce this state after clicking, and that is what the row is for'
    );
    line(
        'gate op-click-floor: "exodra·op·deleg" MOUNTED, which proves the click port was filled ' +
            'WITH A SUBJECT — exo-delegated-events.ts:95 refuses a fill without one. It proves ' +
            'NOTHING about the handler being shared: no pack can tell a module-level function ' +
            'from a closure. What makes both op rows share `FLIP` is that they are the SAME ' +
            'component object, ROW_OP, under two backends'
    );

    for (const m of mounted) {
        m.h.dispose();
        m.c.remove();
    }
}

/**
 * EVERY PROTOTYPE IN THE RUN, PRINTED BEFORE THE GATE — `mount-floor`'s caveat D for this shape,
 * and ahead of the gate because `keystroke-floor` learned that a report sitting behind a throwing
 * gate never prints at all.
 *
 * THREE PROTOTYPES. `exodra·closure` and `exodra·op` render under the shipped composition and share
 * a schema; `exodra·op·deleg` names an event pack and therefore keys a schema of its own; the
 * floor's is this file's, twice, independently parsed.
 *
 * THE EVENT PACK IS NOT EXPECTED TO MOVE THE MARKUP, stated so that a difference here is read as
 * news: the pack decides `setters[i]` for an EVENT port only, and an event port emits no attribute.
 * IT IS REPORTED AND NOT ENFORCED — the thing that must be identical is the FINAL STATE, and the
 * gate proves that and throws.
 */
function protoReport(): readonly string[] {
    // THE SAME TWO BACKEND OBJECTS THE ROWS RENDER THROUGH — a schema hangs off the declaration per
    // backend, by POINTER, so anything else here would print a schema no mount in this file uses.
    const direct = exoDomSchemaOf(machineOf(ROW_SCHEMA, ROW_SCHEMA_FORMS), EXO_BACKEND).proto;
    const delegated = exoDomSchemaOf(
        machineOf(ROW_SCHEMA, ROW_SCHEMA_FORMS),
        DELEGATED_BACKEND
    ).proto;
    const all: readonly { readonly name: string; readonly proto: Element; readonly by: string }[] =
        [
            { name: 'dom·direct', proto: direct, by: 'exodra·closure, exodra·op  ← THE REFERENCE' },
            { name: 'dom·delegated', proto: delegated, by: 'exodra·op·deleg' },
            { name: 'floor', proto: FLOOR_PROTO_1, by: 'driver, floor·per-el, floor·root' },
            { name: 'floor·twin', proto: FLOOR_PROTO_2, by: 'floor·per-el·twin' },
        ];
    const want = direct.outerHTML;
    const out: string[] = [];
    for (const p of all) {
        const html = p.proto.outerHTML;
        out.push(
            `  ${p.name.padEnd(14)}${String(p.proto.querySelectorAll('*').length + 1).padStart(
                4
            )}` +
                ` elements, ${String(html.length).padStart(6)} chars` +
                `${html === want ? '  identical to the reference' : '  ✖ DIFFERENT'}  — ${p.by}`
        );
    }
    for (const p of all) {
        const html = p.proto.outerHTML;
        if (html === want) continue;
        out.push(`  ${p.name} against the reference — ${firstDifference(want, html)}`);
    }
    return out;
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — copied from `keystroke-floor`, which copied it from `mount-floor`, which
// copied it from `teardown-phases`, which copied it from `toggle`, where the same clamp made a whole axis print the timer thirteen times. Spin until
// the clock moves and keep the SMALLEST step it ever takes.
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
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase and the SERIES handed back,
// identical in shape to `keystroke-floor`'s: this run reports DIFFERENCES and RATIOS, where
// `abBench` prints medians and returns a ranking. A phase carries a SECOND divisor, `per`, because a
// click phase preps ONE list and then drives `CLICKS` clicks inside the region.
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

interface Phase {
    readonly name: string;
    /** Scenarios per timed region — what the batch multiplies. */
    readonly reps: number;
    /** Units per scenario: `CLICKS` for a click phase, 1 for a mount. */
    readonly per: number;
    readonly what: string;
    readonly prep: () => Scenario;
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

function runPhases(phases: readonly Phase[], rounds: number): Map<string, number[]> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);
    const times = new Map<string, number[]>();
    for (const p of phases) times.set(p.name, []);
    for (let r = 0; r < rounds; r++) {
        const shift = r % phases.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < phases.length; k++) {
            const at = forward
                ? (k + shift) % phases.length
                : (shift + phases.length - 1 - k) % phases.length;
            const p = phases[at];
            (times.get(p.name) as number[]).push(sampleOnce(p));
        }
    }
    return times;
}

/**
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO, in two numbers rather than one.
 *
 *   bias   |median(a) − median(b)|. On its own it is optimistic: two medians are free to cancel,
 *          and `mount-floor`'s first run printed `0.0000` for exactly that reason.
 *   noise  the MEDIAN of the per-round |a_r − b_r|. The two halves of a null are sampled in the
 *          same round, adjacent in the rotation, so this is the round-to-round scatter that ANY
 *          comparison of two rows in this table carries. It cannot cancel.
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
 * MOUNTS PER TIMED REGION ON THE MOUNT TABLE.
 *
 * TWENTY. This list is 600 elements, near the 641 of the app `mount-floor` measures, where
 * `clone+refs` came out at 0.2288 ms (A CITATION from that axis, not something measured here) — so a
 * mount here is of the order of 0.2 ms and twenty of them is a region of ~4 ms, forty ticks of a
 * 0.1 ms clock. Twenty lists standing at once is ~12,000 live elements, nothing beside
 * `teardown-floor`'s 51,000, and the batch multiplies it if the clock still refuses.
 */
const MOUNT_REPS = 20;

// ---------------------------------------------------------------------------------------

export function benchmarkOpClickFloor(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY. Four is right for a row that takes a fraction of a
    // microsecond and wrong for a quantity whose whole job is to be small.
    const f6 = (x: number): string => x.toFixed(6);
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const quantum = observeTimerQuantum();
    line(
        `op-click-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── THE PROTOTYPES, THEN THE GATE ───────────────────────────────────────────────────
    line('');
    line(
        "THE PROTOTYPES — every one in the run, this file's and @exodra/dom's, before anything " +
            'else. Reported, not enforced: the gate below is what throws.'
    );
    for (const l of protoReport()) line(l);

    line('');
    gate();

    line('');
    line('CENSUS — counted off the schema and the driver, nothing measured');
    line(`  rows in the list             ${ROWS}  (every one of them is clicked)`);
    line(`  elements in the finished DOM ${ELEMENTS}  (${ROWS} × [row + button + field])`);
    line(`  clicks per timed region      ${CLICKS}  (${CLICKS / ROWS} passes over ${ROWS} rows)`);
    line(`  clicks the gate steps        ${GATE_CLICKS}  (2 passes, compared after every one)`);
    line(
        '  the handler                  FLIP — ONE module-level function for the process, ' +
            `${ROWS} subjects`
    );
    line(
        '  the delegated walk           3 nodes (button → row → container) — the SHALLOWEST ' +
            'honest shape, and the friendliest one to delegation'
    );

    // ── THE CLICK TABLE ─────────────────────────────────────────────────────────────────
    const clickReps = Math.max(1, batch);
    const clickPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: clickReps,
        per: CLICKS,
        what: p.what,
        prep: (): Scenario => {
            // THE MOUNT IS UNTIMED. This table measures clicking, not building.
            const c = el();
            const h = p.mount(c);
            return {
                measure: () => {
                    clickMany(h.buttons);
                },
                cleanup: () => {
                    h.dispose();
                    c.remove();
                },
            };
        },
    }));

    const clickSeries = runPhases(clickPhases, rounds);
    const clickStats = new Map<string, Stat>();
    for (const p of clickPhases) clickStats.set(p.name, stat(clickSeries.get(p.name) as number[]));
    /** Microseconds per click. */
    const clickUs = (name: string): number => (clickStats.get(name) as Stat).median * 1000;

    line('');
    line(
        `CLICK — one click on one row of a ${ROWS}-row list [µs per click] · interleaved · ` +
            `${rounds} rounds · batch ${batch} · ${CLICKS * clickReps} clicks per timed region · ` +
            'GC before every timed region'
    );
    line('                       reps   min      p25      median   p75      max');
    for (const p of clickPhases) {
        const s = clickStats.get(p.name) as Stat;
        const us = (x: number): string => (x * 1000).toFixed(4);
        line(
            `${p.name.padEnd(19)}${String(p.reps).padStart(6)}   ${us(s.min)}   ${us(s.p25)}   ` +
                `${us(s.median)}   ${us(s.p75)}   ${us(s.max)}`
        );
    }
    line('');
    for (const p of clickPhases) line(`  ${p.name.padEnd(19)} ${p.what}`);

    // ── THE MOUNT TABLE ─────────────────────────────────────────────────────────────────
    //
    // IT IS HERE BECAUSE NEITHER STRATEGY CAN BE JUDGED WITHOUT IT. Per click the shared handler
    // can only add the subject's load and delegation can only add a walk; everything either of them
    // buys is at mount, and a run that printed the click table alone would be a rigged verdict.
    const mountReps = MOUNT_REPS * Math.max(1, batch);
    const mountPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: mountReps,
        per: 1,
        what: p.what,
        prep: (): Scenario => {
            const c = el();
            let handle: Handle | null = null;
            return {
                measure: () => {
                    handle = p.mount(c);
                },
                cleanup: () => {
                    handle?.dispose();
                    c.remove();
                },
            };
        },
    }));

    const mountSeries = runPhases(mountPhases, rounds);
    const mountStats = new Map<string, Stat>();
    for (const p of mountPhases) mountStats.set(p.name, stat(mountSeries.get(p.name) as number[]));
    const mountMs = (name: string): number => (mountStats.get(name) as Stat).median;

    line('');
    line(
        `MOUNT — building the same ${ROWS}-row list [ms per mount] · interleaved · ${rounds} ` +
            `rounds · batch ${batch} · ${mountReps} mounts per timed region · GC before every ` +
            'timed region'
    );
    line('                       reps   min      p25      median   p75      max');
    for (const p of mountPhases) {
        const s = mountStats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(19)}${String(p.reps).padStart(6)}   ${f4(s.min)}   ${f4(s.p25)}   ` +
                `${f4(s.median)}   ${f4(s.p75)}   ${f4(s.max)}`
        );
    }

    // ── THE RESOLUTION FLOOR, FROM A CONTROL WHOSE TRUE VALUE IS ZERO ───────────────────
    const clickNull = pairedNull(
        clickSeries.get('floor·per-el') as number[],
        clickSeries.get('floor·per-el·twin') as number[]
    );
    const mountNull = pairedNull(
        mountSeries.get('floor·per-el') as number[],
        mountSeries.get('floor·per-el·twin') as number[]
    );
    /** In µs, to match the click table. */
    const clickResolutionUs = clickNull.resolution * 1000;
    const mountResolution = mountNull.resolution;

    line('');
    line('THE CONTROL — what this run resolved, from a pair of duplicated declarations');
    line('  null            bias      noise     p75       worst     what it is');
    const nullRow = (name: string, n: Null, scale: number, what: string): void =>
        line(
            `  ${name.padEnd(14)}${f6(n.bias * scale)}  ${f6(n.noise * scale)}  ` +
                `${f6(n.noiseP75 * scale)}  ${f6(n.worst * scale)}  ${what}`
        );
    nullRow('click', clickNull, 1000, '|floor·per-el − its twin| per click, true Δ = 0 (µs)');
    nullRow('mount', mountNull, 1, '|floor·per-el − its twin| per mount, true Δ = 0 (ms)');
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. Bias alone can cancel at the median and read as a perfect instrument; noise ' +
            'cannot, and it is the scatter every comparison in these tables carries, null or not.'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(clickResolutionUs)} µs per click and ` +
            `${f6(mountResolution)} ms per mount. Read every figure below against these and not ` +
            'against zero; anything smaller is what this instrument returns when nothing is there.'
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    const driver = clickUs('driver');
    const op = clickUs('exodra·op');
    const closure = clickUs('exodra·closure');
    const deleg = clickUs('exodra·op·deleg');
    const floorPick = FLOOR_ROWS.map((n) => ({ name: n as string, v: clickUs(n) })).reduce((a, b) =>
        b.v < a.v ? b : a
    );
    const floor = floorPick.v;

    /** With the instrument's own cost taken off both sides — see the header on the common addend. */
    const net = (x: number): number => x - driver;
    const rawRatio = op / Math.max(floor, 1e-9);
    const netRatio = net(op) / Math.max(net(floor), 1e-9);
    const headroom = ((op - floor) / Math.max(op, 1e-9)) * 100;
    const netHeadroom = ((net(op) - net(floor)) / Math.max(net(op), 1e-9)) * 100;

    line('');
    line('ANSWER — and read the header before quoting any of it');
    line(
        `  the floor is "${floorPick.name}" at ${f4(floor)} µs per click; the other floor ` +
            `spelling measured ${f4(
                FLOOR_ROWS.map((n) => clickUs(n)).reduce((a, b) => (b > a ? b : a))
            )} µs`
    );
    line(
        `  the instrument itself ("driver") is ${f4(driver)} µs of that — ${pct(driver, floor)} ` +
            `of the floor and ${pct(
                driver,
                op
            )} of the shared handler. It is a COMMON ADDEND: in ` +
            'every row, so it makes every raw ratio SMALLER than the truth.'
    );
    line(
        `  the shared handler is ${f4(op)} µs — ${rawRatio.toFixed(2)}× the floor raw, ` +
            `${netRatio.toFixed(2)}× with the driver subtracted from both sides. ` +
            `${headroom.toFixed(1)}% of a click is above the floor raw, ${netHeadroom.toFixed(
                1
            )}% ` +
            'net.'
    );
    line(
        '  EVERY CORRECTED FIGURE ON THIS PAGE IS A DIFFERENCE OF SMALL NUMBERS — two quantities ' +
            'of the same order subtracted from each other — so its relative error is larger than ' +
            `either input's. The resolution floor beside it (${f6(clickResolutionUs)} µs) is how ` +
            'much of the last digit is instrument.'
    );
    line(
        `  A SHARED HANDLER AGAINST A CLOSURE, SAME PACK, SAME EVERYTHING ELSE: ${f4(op)} µs vs ` +
            `${f4(closure)} µs per click (${(op / Math.max(closure, 1e-9)).toFixed(2)}×, ` +
            `Δ ${f4(op - closure)} µs) and ${f4(mountMs('exodra·op'))} ms against ` +
            `${f4(mountMs('exodra·closure'))} ms per mount ` +
            `(Δ ${f4(mountMs('exodra·op') - mountMs('exodra·closure'))} ms). THIS IS THE PAIR ` +
            "`keystroke-floor`'s header booked as missing."
    );
    line(
        `  THE DELEGATED COMPOSITION: ${f4(deleg)} µs per click ` +
            `(${(deleg / Math.max(op, 1e-9)).toFixed(2)}× the direct row) and ` +
            `${f4(mountMs('exodra·op·deleg'))} ms per mount ` +
            `(${(mountMs('exodra·op·deleg') / Math.max(mountMs('exodra·op'), 1e-9)).toFixed(2)}× ` +
            'the direct row). It is a MOUNT strategy: per click it can only add the walk.'
    );
    line(
        '  THE SHARED FORM AND DELEGATION COMPOSE, AND THE DEPENDENCE IS ONE-WAY — delegation ' +
            'requires a SUBJECT (exo-delegated-events.ts:95 refuses a fill without one), a ' +
            'subject does not require delegation (exo-event-slot-setter.ts:19-29 stores one under ' +
            'the SHIPPED direct pack). So the shipped form is NOT already the strategy: the row ' +
            'above changes the work with no pack, no plugin and no render argument.'
    );

    // ── THE FALSIFIERS, PRINTED MECHANICALLY SO NOBODY CHOOSES AFTERWARDS ───────────────
    line('');
    line('THE PREDICTION, JUDGED — committed in the header before the first run');
    const verdict = (id: string, failed: boolean, claim: string): void =>
        line(`  ${failed ? 'FAILED ' : 'held   '}${id}  ${claim}`);
    verdict(
        'P1',
        !(netRatio >= 1.3 && netRatio <= 3.0),
        `exodra·op/floor net between 1.3 and 3.0 — measured ${netRatio.toFixed(2)}×` +
            (netRatio < 1.05
                ? "  (falsifier (a): the renderer's path is free next to one property store)"
                : netRatio > 4.0
                ? '  (falsifier (b): three quarters of a click is ours)'
                : '')
    );
    verdict(
        'P2',
        !(op > closure + clickResolutionUs),
        `exodra·op ABOVE exodra·closure per click past the ${f6(clickResolutionUs)} µs floor — ` +
            `measured ${f4(op - closure)} µs` +
            (op > closure + clickResolutionUs
                ? ''
                : "  (falsifier (c): the subject's keyed load is free at this scale and nothing " +
                  'in the dispatch path separates a shared handler from a closure)')
    );
    verdict(
        'P3',
        !(mountMs('exodra·op') < mountMs('exodra·closure') - mountResolution),
        'exodra·op BELOW exodra·closure at mount — measured ' +
            `${f4(mountMs('exodra·closure') - mountMs('exodra·op'))} ms` +
            (mountMs('exodra·op') < mountMs('exodra·closure') - mountResolution
                ? ''
                : `  (falsifier (d): a closure and a subject cost the same at ${ROWS} rows, and ` +
                  'the mount side of the trade has no measured size at this census)')
    );
    verdict(
        'P4a',
        !(deleg > op + clickResolutionUs),
        `exodra·op·deleg ABOVE exodra·op per click — measured ${f4(deleg - op)} µs` +
            (deleg > op + clickResolutionUs
                ? ''
                : "  (falsifier (e): the dispatcher's walk is cheaper than a per-element " +
                  "registration's dispatch)")
    );
    verdict(
        'P4b',
        !(mountMs('exodra·op·deleg') < mountMs('exodra·op') - mountResolution),
        'exodra·op·deleg BELOW exodra·op at mount — measured ' +
            `${f4(mountMs('exodra·op') - mountMs('exodra·op·deleg'))} ms` +
            (mountMs('exodra·op·deleg') < mountMs('exodra·op') - mountResolution
                ? ''
                : "  (falsifier (e): delegation's one advertised advantage does not appear at " +
                  `${ROWS} elements, and the size at which it does is unknown)`)
    );
    verdict(
        'P5',
        !(driver > floor * 0.5),
        `driver more than half of a floor click — measured ${pct(driver, floor)}` +
            (driver < floor * 0.25
                ? '  (falsifier (f): the JS is the cost and the raw ratios are readable without ' +
                  'correction)'
                : '')
    );

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    //
    // Every one of them PRINTS rather than throws, deliberately, so one unreadable table does not
    // take a readable one down with it — the rule the whole floor family follows.

    // THE NESTING. Every click row is `driver` PLUS a handler, so nothing may measure below it.
    for (const p of PROGRAMS) {
        if (p.name === 'driver') continue;
        const v = clickUs(p.name);
        if (v >= driver - clickResolutionUs) continue;
        refuse(
            `op-click-floor: "${p.name}" (${f4(v)} µs) measured CHEAPER than "driver" ` +
                `(${f4(driver)} µs) by ${f4(driver - v)} µs, past the resolution floor ` +
                `(${f6(clickResolutionUs)} µs), though it does everything the driver does and ` +
                'then runs a handler. That is not a saving, it is the instrument — the ladder ' +
                'does not nest and every subtraction on this table is unreadable. Raise ' +
                '`rounds`, then the batch.'
        );
    }

    // THE NULL AGAINST THE CLAIMS IT SUPPORTS. A null that is a large fraction of the smallest
    // difference the tables are asked to resolve means the run printed an ordering, not sizes.
    const smallestClaim = Math.min(Math.abs(op - closure), Math.abs(deleg - op));
    if (clickResolutionUs > smallestClaim * 0.25) {
        refuse(
            `op-click-floor: the click null resolved ${f6(clickResolutionUs)} µs where the ` +
                `smallest difference this table is asked for is ${f4(smallestClaim)} µs — this ` +
                'run cannot separate a shared handler from a closure, or a delegated dispatch ' +
                'from a direct one, so those rows are an ORDERING and not sizes. Raise `rounds`, ' +
                'the batch — `keystroke-floor` needed batch 8 to resolve its strategy rows and ' +
                'these differences are of the same order.'
        );
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
                `op-click-floor: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    '`npm run axis --workspace=@exodra/benchmarks -- op-click-floor ' +
                    `${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(clickPhases, clickStats, 'CLICK');
    checkClock(mountPhases, mountStats, 'MOUNT');

    // AND THE THINGS NO NUMBER ON THIS PAGE COVERS, printed every run so they cannot be forgotten
    // between reading the table and quoting it.
    line('');
    line(
        'WHAT THIS RUN DID NOT MEASURE: a real click — every event above was synthetic, ' +
            '`isTrusted: false`, with NO default action, NO activation behaviour, NO focus change, ' +
            'NO selection, NO hit testing and no `pointerdown`/`mousedown`/`pointerup` around it. ' +
            'Nor anything after the handler returns (style, layout, paint), nor human click rate, ' +
            'nor a handler that calls user code this axis never runs, nor a ' +
            'delegated walk deeper than three nodes, nor teardown, nor memory.'
    );
}
