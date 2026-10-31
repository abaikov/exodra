import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachine } from '@exodra/core';
// DIAGNOSTIC — WHAT DOES A PORT WRITE COST ON A REAL DOM, AND IS A WRITER THAT RESOLVED ITS NODE
// ONCE CHEAPER THAN ONE THAT RESOLVES IT ON EVERY WRITE?
//
// It answers ONE question about ONE backend — `@exodra/dom` — and it compares no frameworks. It is
// registered as an axis only so it can reuse the runner that already starts Vite, drives headless
// Chromium and forwards the browser's console.
//
// ═══ WHY IT EXISTS: A MEASUREMENT WAS PUBLISHED AND RETRACTED ════════════════════════════════
//
// The same question was measured on BARE SHAPES (`{ data: '' }` objects, 1000 instances × 5 ports),
// published in a blog post and in a source comment on `TExoDomNode`, and then destroyed by
// review. Both are retracted; the figures are not repeated here, because a number with a known sign
// error is worse than no number. What IS repeated is the list of defects, because THE RETRACTION'S
// REASONS ARE THIS FILE'S SPECIFICATION. Every one of them names a thing built differently below.
//
//  (D1) THE FATAL ONE. The "lookup" arm was spelled as a bare `setters[i](nodes[elem[i]], value)`
//       WITH NO ENCLOSING CALL, while every write path that ships is a method: `c.set(port, value)`
//       is a frame, and inside it another frame to the setter. It compared ONE FRAME AGAINST TWO
//       and published the difference as the price of the second.
//       HERE: every arm spends exactly two frames per write. `set` is `holder.set(port, v)` → the
//       setter. `bound` is `writer(v)` → the setter. `floor` is the straight-line program, which
//       spends ONE frame by construction and is labelled as the arm that does — that is what a
//       floor IS, and it is never used as the other two's control.
//  (D2) A PER-WRITE TERM THE REAL DOOR PAYS WAS MISSING — the `port.index` property load.
//       HERE: the `set` arm calls the SHIPPED door, whose body is exactly `const index =
//       port.index; this.setters[index](this.nodes[this.elem[index]], value)`. Nothing is
//       hand-spelled.
//  (D3) THE WRITER ARM'S SCRATCH ARRAY WAS ALLOCATED OUTSIDE THE TIMED REGION while the lookup arm
//       paid a fresh one inside it.
//       HERE: every arm's per-scene handle array is allocated in `prep()`, untimed, in the same
//       statement shape, and every arm indexes it identically — see THE HANDLE ARRAYS below.
//  (D4) EVERY INSTANCE DIED IMMEDIATELY, so the closures stayed in the nursery and were never
//       promoted — the opposite of a page, where an instance is retained.
//       HERE: the mount phase builds all N instances into a live array FIRST, and the update phase
//       runs against instances that are still mounted, still in the document, and still referenced.
//  (D5) MOUNT AND UPDATE WERE BLENDED into one region and divided by the write count, so a
//       per-instance term was smeared across per-write figures.
//       HERE: two tables, two `runPhases` calls, two null blocks, two clock checks. The only place
//       they meet is an ARITHMETIC combination printed at the end, with both inputs beside it.
//  (D6) THE FIVE SETTERS WERE FIVE CLONES OF ONE SOURCE POSITION sharing one feedback vector.
//       HERE: the five ports are five DIFFERENT KINDS — a `setAttribute` on a `data-*` name, a
//       `className =` store, a Text node `.data` store, a second `setAttribute` on a different
//       element, and a bare `value` PROPERTY store on an `<input>`. A gate below refuses the run
//       unless the schema compiled five DISTINCT setter objects, and prints their kinds.
//  (D7) STORES WERE NEVER READ BACK, so nothing proved they survived optimisation.
//       HERE: the observation of a scene is its markup PLUS every `<input>`'s live `.value` read
//       back off the DOM — the one write the serialiser cannot show — and it is compared, character
//       for character, before timing and again after the update rounds.
//  (D8) RUNGS RAN IN FIXED ASCENDING ORDER with warm-up at one rung only.
//       HERE: all eighteen update phases (six declarations × three rungs) are in ONE interleaved
//       driver whose direction alternates, warmed at every phase, and a coverage gate refuses any
//       pair that did not get both running orders.
//  (D9) THE DISPUTED EFFECT WAS 0.28 OF A CPU CYCLE, inside an arm whose own ladder wobbled several
//       times that between adjacent rungs.
//       HERE: read "WHETHER THIS QUESTION IS ANSWERABLE AT ALL" below. The answer is written into
//       the predictions as (P5), which predicts THE REFUSAL.
//
// ═══ WHAT IS BEING COMPARED, IN THE LIBRARY'S OWN WORDS ══════════════════════════════════════
//
// `@exodra/dom` has ONE per-write door after the wire has returned, and it is `ExoDomPorts.set`:
//
//     const p = c.fillDoors();                 // once, during the wire — one object for the instance
//     p.set(P.title, 'hello');             // every write afterwards
//
// A SECOND DOOR STOOD BESIDE IT AND IS DELETED — `c.portWriter(port)`, which resolved the
// node at hand-out and handed back `(value) => { write(at, value); }`. Its own deletion comment says
// it was removed for three CORRECTNESS problems (the hand-out stamped a fill record, so "asking is
// filling" had to be a documented rule; a wire that asked and never wrote left a placeholder
// standing; and one port filled through both doors moved `writes` two steps and could open the
// end-of-wire gate while a different port was skipped) — and that the timing ladder once quoted
// beside it is withdrawn.
//
// SO THE `bound` ARM BELOW IS NOT A SHIPPED SHAPE, AND THAT IS SAID HERE ONCE AND AGAIN AT THE ARM.
// It is spelled inside this participant over the public surface — `c.portTable()` for the
// instance's node table, `exoDomSchemaOf(schema, backend).setters` and `.elem` for the schema's
// halves — and it is given the BEST CASE a bound writer could have: the setter and the node SLOT
// are resolved at module load, where a library method could only resolve them per call. If the
// bound arm loses with that advantage, no library method spelling it could win.
//
// ═══ WHETHER THIS QUESTION IS ANSWERABLE AT ALL ON A REAL DOM — READ THIS FIRST ══════════════
//
// THE DISPUTED QUANTITY, COUNTED OFF THE TWO BODIES. The shipped door costs, per write, over what
// the bound writer costs: one `port.index` property load, one `this.setters[index]` array load, one
// `this.elem[index]` array load, one `this.nodes[…]` array load — against the bound writer's two
// CONTEXT slot loads. Call it two extra loads. On a modern core that is a FRACTION OF A
// NANOSECOND: loads that hit L1 retire several per cycle, and at ~3 GHz a cycle is 0.33 ns.
//
// WHAT IT IS MEASURED AGAINST. Every one of those writes then CROSSES INTO THE BROWSER —
// `setAttribute`, a `className` store, a Text node `.data` store, an `<input>.value` store. Each is
// an IDL accessor through the binding layer, and this suite has never measured one under a few tens
// of nanoseconds.
//
// SO THE RATIO IS ROUGHLY 0.5 ns AGAINST 40-200 ns — THE SUBJECT IS UNDER ONE PERCENT OF THE SIGNAL.
// This suite judges a difference against ITS OWN TWO ROWS' RESOLUTION, and a resolution is the
// MEDIAN OF THE PER-ROUND |a − b| of a pair whose true difference is zero. That quantity is a
// fraction of the row, and no pair in this suite has ever come back under a few tenths of a percent
// of its own row. A few tenths of a percent of 80 ns is a few tenths of a nanosecond — THE SAME SIZE
// AS THE EFFECT.
//
// AND THE CLOCK IS A SECOND CONSTRAINT ON TOP OF THAT, WHICH AT THE LOW RUNGS IS THE HARDER OF THE
// TWO. A timed region is read off ONE clock, so a per-write median is a multiple of
// `quantum / (writes in the region)`. At batch 1 and 3000 instances × 5 ports:
//
//     rung          w1        w4        w16
//     writes/region 15 000    60 000    240 000
//     GRAIN         6.67 ns   1.67 ns   0.417 ns   per write, at a 0.100 ms quantum
//
// A FOURTH RUNG, `w64`, STOOD AT THE END OF THAT TABLE AND WAS REMOVED FOR WALL CLOCK. Its grain
// was 0.104 ns and four of them 0.417 ns — the only bar on this ladder that sat under the disputed
// quantity. `RUNGS` carries the full arithmetic of what its removal cost; the short form is that
// the refusal below is now a refusal BY THE CLOCK at every rung rather than by the noise at the
// top, and that the crossover between the two bars can no longer be shown.
//
// SO AT w1 THE SMALLEST STEP THE CLOCK CAN EXPRESS IS THIRTEEN TIMES THE WHOLE DISPUTED QUANTITY,
// and no amount of averaging changes what a quantised sample can say. Resolving 0.5 ns at four
// grains needs 0.125 ns per grain, i.e. 800 000 writes in a region — which at w1 is fifty-four
// scenes of three thousand instances live at once, and that is not a scene, it is an out-of-memory.
// THE LOW RUNGS THEREFORE CANNOT SETTLE THE SUBJECT EVEN WITH A PERFECT INSTRUMENT, and the run says
// so per rung rather than letting a reader assume the ladder is uniform.
//
// AT THE HIGH RUNGS THE CLOCK STOPS BINDING AND THE NOISE STARTS — AND THIS LADDER NO LONGER
// REACHES THAT POINT. It was reached at w64, where a grain was 0.104 ns and four of them 0.42 ns —
// the same size as the effect — so the clock was only just out of the way and what was left was the
// per-round scatter, a fraction of a percent of an 80 ns row, i.e. a few tenths of a nanosecond.
// BOTH BARS LANDED ON TOP OF THE ANSWER. With w64 removed the top bar is 1.67 ns at w16, so only
// the CLOCK ever does the refusing here and the noise bar is never the binding one.
//
// `rounds` MOVES NEITHER OF THEM AND `batch` MOVES BOTH. A median over more rounds does not make a
// quantised sample finer, and it does not reduce the MEDIAN of the per-round difference either —
// which is what this suite's resolution is. More scenes inside ONE timed region does both: it
// multiplies the writes the grain is divided by, and it averages more work into each round's
// reading. That is why the escalation named at the bottom of this file is `batch` and not `rounds`,
// and it is the opposite emphasis from an axis whose readings are already fine-grained.
//
// THIS AXIS THEREFORE EXPECTS TO REFUSE ITS OWN SUBJECT, and says so as prediction (P5) below rather
// than discovering it afterwards. A refusal here is not a failure of the instrument: it is the
// finding that AN EFFECT OF A FRACTION OF A NANOSECOND PER WRITE IS UNOBSERVABLE IN A PAGE THAT
// TOUCHES A REAL DOM, EVEN WITH A KNOWN SIGN — and that is a better answer than a number.
//
// WHAT THE AXIS CAN STILL SETTLE, whatever the disputed pair does: the MOUNT difference (five
// closures against one object, per instance) is a per-INSTANCE quantity against a per-instance row,
// not a sub-percent shaving, and it is the term that decides the trade. If the hand-out is dear and
// the per-write saving is unmeasurable, then the bound form is a cost with no proven benefit, and
// that verdict does not need the disputed pair to resolve.
//
// ═══ THE THREE ARMS ══════════════════════════════════════════════════════════════════════════
//
//   set      THE SHIPPED DOOR. `c.set(port, value)` five times inside the wire, `c.fillDoors()` once for
//            the handle, and `holder.set(port, value)` for every write afterwards. Nothing is
//            hand-spelled: whatever the connector does per write is what this arm pays.
//   bound    A WRITER BUILT INSIDE THE PARTICIPANT — the node and the setter resolved once, kept in
//            a closure, called per write. NOT A SHIPPED SHAPE; see the block above.
//   floor    A STRAIGHT-LINE PROGRAM WITH NO ABSTRACTION — one `<template>` parsed at module load, a
//            `cloneNode` and a written-out walk per instance, the five nodes held in its own array,
//            and five direct DOM calls per write. Byte-identical output.
//
// ═══ THE FOURTH ARM THAT IS NOT HERE — `direct`, AND EXACTLY WHY IT COULD NOT BE BUILT ══════
//
// A SECOND, SEPARATE QUESTION WAS ASKED OF THIS AXIS AND IT IS NOT `set ↔ bound`. It is:
//
//     WHAT DOES THE SECOND NUMBERING COST? A port write is `setters[index](nodes[elem[index]],
//     value)`. There are TWO numbers in that line — `index` is the port's, `elem[index]` is the
//     node's slot, and the schema's table sits between them. If a port's number and its node's slot
//     were the SAME number, `elem` would disappear and every write would lose ONE ARRAY LOAD.
//
// `set ↔ bound` asks WHERE THE NODE IS KEPT. `set ↔ direct` asks WHAT THE SECOND NUMBERING COSTS.
// They are not one verdict and this file never merges them.
//
// THE ARM IS NOT BUILT, AND THE REASON IS THE ONE THE BRIEF NAMED AS A STOPPING CONDITION: THE
// SHIPPED CONNECTOR CANNOT BE USED THAT WAY THROUGH THE PUBLIC SURFACE. Every door was checked:
//
//   · `ExoDomPorts.set` — the only post-wire door — is a class method whose body is fixed:
//     `const index = port.index; … this.setters[index](this.nodes[this.elem[index]], value)`. The
//     hop is INSIDE it. Constructing an `ExoDomPorts` by hand (it is exported) does not help: the
//     body is the same body whatever its three arguments are.
//   · `TExoDomNode.portNodeWriter()` hands back a closure whose body is the identical line with
//     the table passed in — `setters[index]((table)[elem[index]], value)`. Same hop, also fixed.
//   · A PLUGIN CAN REPLACE `fillDoors()`, because the connector's prototype IS the composed backend and
//     `composeExoPlugins` writes onto it. But what a replacement would hand back is a holder whose
//     `set` body I would be WRITING. The plugin seam makes a hand-spelled door REACHABLE; it does
//     not make it a door.
//   · MAKING THE TWO NUMBERS COINCIDE DOES NOT REMOVE THE LOAD. Even on a schema where
//     `elem[i] === i` for every port — and the gate below prints that table, so this run says
//     whether this schema is one — `this.elem[index]` is still executed. It returns `index`; it is
//     not skipped. Removing it is a change to the BODY, not to the numbering.
//
// SO BUILDING `direct` HONESTLY WOULD TAKE A CHANGE IN `@exodra/dom` — port numbering aligned to
// node slots in `compileExoDomSchema`, and a `set` without the hop — and this axis may not make
// one. Transcribing that body into this file and calling it an arm is precisely the move that killed
// both previous attempts: a write path spelled by the measurer rather than by the library.
//
// ═══ WHAT THIS RUN CAN STILL SAY ABOUT IT, AND IT IS A BOUND RATHER THAN A NUMBER ════════════
//
// THE ONE LOAD `direct` WOULD REMOVE IS ONE OF THE LOADS `bound` ALREADY REMOVES. Count them:
// against `set`, the `bound` writer drops the `port.index` property load, the `this.wiring` load,
// the null comparison, the `this.setters[index]` load, the `this.elem[index]` load AND the
// `this.nodes[…]` load, and adds back two context slot loads. `direct` would drop exactly one of
// those six — `this.elem[index]`.
//
// THEREFORE `|set − direct|` IS BOUNDED ABOVE BY WHAT `|set − bound|` MEASURES, up to the two
// context loads the bound arm adds back. IF THE `set ↔ bound` PAIR DOES NOT RESOLVE, `set ↔ direct`
// CANNOT: a strict sub-part of an unresolvable difference is unresolvable. That deduction is printed
// at the end, mechanically, from this run's own rows — see THE SECOND NUMBERING below — and it is
// the publishable form of the answer: on a real DOM, one array load is not observable against a
// write that crosses into the browser, so the two-numbering design is free at this instrument's
// resolution and the question is closed by a bound rather than argued from taste.
//
// WHAT WOULD SETTLE IT INSTEAD, named so nobody rebuilds it here: an axis on a backend where the
// write is NOT a browser crossing, with the numbering change made in the library and both doors
// shipped. `@exodra/string` is the resolution candidate and it is the wrong one for this question
// for the reason recorded below — that backend has no `nodes[elem[i]]` indirection to remove.
//
// EACH OF THE THREE HAS ITS OWN SEPARATELY-DECLARED TWIN — its own declaration, its own schema, its
// own port numbering, its own template string, its own value pools, its own wire. A twin is
// DUPLICATED SOURCE and not a second call to one function, for `mount-floor`'s reason: calling one
// function twice shares everything V8 learned about it and measures a floor far below the one a
// real pair of programs sits on. Their true difference is ZERO by construction, and what a pair
// returns is what this instrument returns when there is nothing to see.
//
// ═══ THE TWO PHASES, AND WHY THEY ARE NEVER BLENDED ══════════════════════════════════════════
//
//   MOUNT    building N instances, wiring them, and filling every port ONCE. It is where the bound
//            arm's HAND-OUT lands, and it does not move with the rung. Reported in ns per INSTANCE.
//   UPDATE   writing already-mounted, still-live instances again. The instances were built by an
//            untimed `prep()` and are still in the document and still referenced when the clock
//            starts. Reported in ns per WRITE. This is the phase the rung ladder varies.
//
// THE MOUNT FILL GOES THROUGH `c.set` IN BOTH LIBRARY ARMS. `TExoDomNode`'s own note on the deleted
// writer says a driver using the hand-out pair "makes its initial fill through `c.set` instead". So
// both library arms mount with the IDENTICAL five calls, and the mount difference between them is
// EXACTLY the hand-out and nothing else.
//
// ═══ THE RUNGS — WRITES PER PORT ON THE UPDATE PHASE ═════════════════════════════════════════
//
//   w1     THE PAGE THAT WRITES ONCE AND NEVER AGAIN. A hand-out never amortises here, so this is
//          the rung where a bound writer is most expensive and it is the one a "crossover" claim
//          lives or dies on. It is included because a ladder that starts where the answer is already
//          known is a ladder that cannot be surprised.
//   w4     AN ORDINARY INTERACTION VOLUME — a row touched a handful of times in a session.
//   w16    A LIVE FIELD — a value that follows a slider, a clock, a stream. It is now also the far
//          end of the `a + b/N` fit, where any per-pass fixed term is 1/16 of the reading.
//
// A FOURTH RUNG STOOD HERE — `w64`, "the rung where any per-pass fixed term is 1/64 of the reading,
// so the asymptote is very nearly read directly rather than fitted", and the end that gave the fit
// sixty-four times the leverage of one ending at 16. IT IS REMOVED FOR WALL CLOCK, it was 75.3% of
// the update table's writes, and `RUNGS` states what its absence costs: the asymptote is now
// FITTED rather than nearly read off, and the leverage of the fit is 16× rather than 64×.
//
// THE LADDER IS NOT NESTED THE WAY `door-count`'s IS, and it does not need to be: nothing in the
// update loop counts the rung, so a rung is the SAME job repeated more times rather than a bigger
// job. That is what makes (P2) — flatness — a control rather than a claim.
//
// ═══ HOW MOUNT AND UPDATE ARE COMBINED, AND THE `a + b/N` FIT ════════════════════════════════
//
// The two phases are combined by ARITHMETIC, never by a shared timed region. For an instance whose
// ports are each written R times over its life:
//
//     combined ns per write (R) = update ns per write + (mount ns per instance) / (PORTS × R)
//
// which is `a + b/R` with `a` the per-write cost and `b` the hand-out per port. The asymptote `a` is
// reported from a least-squares fit over all three rungs AND from every two-rung pair separately, so
// that THE TWO ENDS' DISAGREEMENT is printed rather than the top rung being read as if it had
// converged.
//
// ═══ THE FIVE PORTS, AND WHY THEY ARE FIVE KINDS ═════════════════════════════════════════════
//
//   <li class="row" data-id="…"><span class="…">…</span><a href="#" title="…"></a>
//   <input type="text" value=""></li>
//
//   1  `data-id` on the `<li>`     → `setAttribute` (the general branch of `exo-attr-setter`)
//   2  `class` on the `<span>`     → `className =` on an HTML element
//   3  the `<span>`'s text         → the Text node's `.data`
//   4  `title` on the `<a>`        → `setAttribute` again, on a DIFFERENT element and a different
//                                    closure object
//   5  `value` on the `<input>`    → a BARE PROPERTY STORE; `writes-exo-attribute` answers `false`
//                                    for this pair, so the attribute is never touched
//
// FIVE DISTINCT SETTER OBJECTS, FOUR DISTINCT BODIES, and the call site `setters[index](node, value)`
// therefore sees what a real component's does. (D6) is the reason, and a gate refuses the run if the
// schema ever compiles fewer than five distinct objects.
//
// THE `value` PORT IS THE ONE THE SERIALISER CANNOT SHOW. Its setter stores the property and leaves
// the ` value=""` placeholder in the markup untouched — which is exactly why `compileExoDomSchema`
// KEEPS that placeholder in the prototype. So the observation reads every `<input>.value` back off
// the DOM and appends it to the markup. Without that, one of the five writes would be unchecked, and
// (D7) is the defect that names it.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ════════════════════
//
//  * IT CANNOT SETTLE A SUB-NANOSECOND EFFECT AGAINST A REAL DOM WRITE. That is the whole of the
//    block above, it is prediction (P5), and it is the axis's own expected result. An effect with a
//    known SIGN and a size under one percent of the operation it rides on is unobservable in a page.
//  * IT DOES NOT MEASURE THE SECOND NUMBERING, IT BOUNDS IT. There is no `direct` arm and there
//    could not be one from inside this package — see THE FOURTH ARM THAT IS NOT HERE. What is
//    printed is a deduction from the `set ↔ bound` pair, and a bound is not a measurement: it can
//    say "no larger than", never "this much".
//  * NOTHING ABOUT BINDINGS, SOURCES OR SUBSCRIPTIONS. No observable, no subscription, no effect. This
//    is the DIRECT port — a wire that keeps a handle and writes when it decides to. What a bound
//    port costs on top is a different axis.
//  * NOTHING ABOUT CHILDREN PORTS, LISTS OR RECONCILIATION. Five value ports, no children port, no
//    `c.list`, no diff.
//  * NOTHING ABOUT EVENT PORTS. There is no event port in the schema, deliberately: an event port
//    would put a sixth setter kind at the call site and a listener on every instance, neither of
//    which the subject needs.
//  * NOTHING ABOUT MOUNT SPEED AS A RANKING. The mount table exists to price the HAND-OUT, which is
//    a difference between two library rows over one schema. The `− floor` column on that table
//    carries everything the library does that a clone-and-walk does not, and is not this axis's
//    claim.
//  * NOTHING ABOUT ANY BACKEND BUT THE DOM. The retracted axis was going to be built on
//    `@exodra/string` for resolution, and that backend HAS NO `nodes[elem[i]]` INDIRECTION to
//    remove: `TExoStrNode.set` is `this.values[index] = this.writers[index](value)` and nothing
//    else (`packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:77-80`). So it would have printed "no
//    crossover" for a reason having nothing to do with the writer's merits. A RESOLUTION ADVANTAGE
//    DOES NOT SURVIVE MOVING THE QUESTION TO A BACKEND WHERE THE MECHANISM IS ABSENT.
//  * NOTHING ABOUT MEMORY. No heap column is printed, and none would mean anything between arms
//    whose allocation shapes differ this much.
//  * NOTHING ABOUT THE THREE CORRECTNESS PROBLEMS that actually removed the writer from the library.
//    They are named at the top of this file and they are not timings; no figure here bears on them,
//    and a fast bound writer would not bring them back.
//
// ═══ WHAT COULD NOT BE MADE SYMMETRIC, AND WHAT EACH ONE DOES TO THE NUMBERS ══════════════════
//
//  1. THE FLOOR SPENDS ONE FRAME PER WRITE AND THE LIBRARY ARMS SPEND TWO. That is not an
//     asymmetry to fix — it IS the abstraction being priced, and it is the reason (D1) was fatal
//     when the same shape was used as one library arm's control. The floor is never used as the
//     control for `set` against `bound`; those two are each other's.
//  2. THE FLOOR DOES NOT STRINGIFY AND DOES NOT TEST FOR `true`. `exo-attr-setter`'s general
//     branch is `(node, value) => { if (value == null) …; else node.setAttribute(markup, value ===
//     true ? '' : String(value)); }`, and the floor writes its already-string value straight in. Two
//     comparisons and one `String` call per attribute write, in the FLOOR GAP only: both library
//     arms call the identical setter object, so it cancels exactly in `set − bound`.
//  3. THE LIBRARY ARMS STORE A DISPOSER PER INSTANCE AT MOUNT. `backend.render` mounts ONE instance
//     and returns one disposer, so a scene of N instances is N calls and N stores. The floor stores
//     no disposer. It is a per-instance term in the mount table's `− floor` column, identical
//     between the two library arms, and outside the update table entirely.
//  4. THE HANDLE ARRAYS ARE THE SAME SHAPE IN ALL THREE ARMS AND THE `set` ARM PAYS FOR IT. Every
//     arm keeps ONE flat array of `N × PORTS` entries and every arm's inner loop is `const b = i *
//     PORTS;` then five loads at `b`, `b+1`, … So `set` stores its ONE holder object five times at
//     mount, where a real application would store it once. THE REASON IS (D3) AND (D1) TOGETHER:
//     indexing by instance in one arm and by (instance, port) in another puts four index
//     computations and four array loads per instance into one side of the disputed pair — the same
//     order of magnitude as the disputed quantity itself. Four redundant reference stores per
//     instance sit in the `set` arm's MOUNT, where they are visible and stated, rather than in the
//     per-write path, where they would be invisible and decisive.
//  5. MODULE-LOAD COST IS OUTSIDE EVERY TIMED REGION — four declarations, four compiled schemas,
//     four parsed floor templates, and the bound arm's resolved slot and setter constants. That is
//     fair to all three arms for `mount-floor`'s reason about its prototypes: what a component
//     declares is paid once for the life of the process.
//  6. THE VALUE POOLS ARE FIVE ARRAYS OF EIGHT STRINGS PER FAMILY, indexed once per instance per
//     pass. Per write that is ONE array load with a precomputed index, identical in all three arms.
//     Nothing is built, formatted or concatenated inside a timed region.
//
// ═══ THE PREDICTIONS, COMMITTED BEFORE THE PROGRAMS WERE WRITTEN ══════════════════════════════
//
// This is my model. It is JUDGEMENT plus code I read; I MEASURED NONE OF IT. Every falsifier is
// printed mechanically at the end so that nobody, including me, gets to choose them afterwards.
//
//   (P0) NO PREDICTION IS MADE ABOUT THE DIRECTION OF `set − bound` AT ANY SINGLE RUNG, and that is
//        a commitment rather than an omission. The `set` door pays four or five extra loads and one
//        branch; the `bound` door pays two context loads and, if V8 has not sunk it, a context
//        allocation shared by the instance's five closures. Nothing I can read off the source says
//        which is larger, and the difference is small enough that a cache line or a code-layout
//        accident could decide it. If this file is ever quoted as "the bound writer is
//        faster/slower", the quotation is against its own text.
//
//   (P1) THE DOM WRITE DOMINATES BOTH LIBRARY ARMS. `|set − bound|` per write is under 3% of either
//        row at every rung. MECHANISM: both spend two frames and one crossing into the browser's
//        binding layer; they differ by four or five L1 loads and one predictable branch. KILLER: a
//        gap over 3% at any rung. The named candidate is a de-optimisation of the five-way setter
//        call site in ONE arm and not the other — which would make that rung a measurement of a
//        polymorphic call, not of a door — and the first thing to check is whether the two arms'
//        rungs disagree about WHICH is faster, because a real four-load difference cannot change
//        sign.
//
//   (P2) THE UPDATE COST IS FLAT IN THE RUNG. On every one of the six declarations, the largest and
//        smallest of its four per-write medians differ by less than that declaration's own
//        resolution at its coarsest rung. MECHANISM: nothing in the update loop counts R; the
//        working set is the same N instances at every rung, so a rung is the same job repeated.
//        KILLER: a monotone slope on any arm — then the per-write figures are not per-write figures,
//        and the named candidates are the JIT reaching a different tier at the high rungs and the
//        scene's style/layout invalidation state differing between the first pass and the sixty-fourth.
//
//   (P3) THE HAND-OUT IS DEARER FOR `bound` THAN FOR `set`, AND IT IS RESOLVABLE. `bound` mount
//        minus `set` mount is positive and clears both rows' resolution. MECHANISM: five JSFunction
//        allocations plus the context they share, against one `ExoDomPorts` object; five array loads
//        out of the instance's node table, against none. KILLER: at or below zero — then five
//        closures cost no more than one object on this heap, escape analysis has removed them
//        despite their being stored into a live array, or the mount is so dominated by clone, walk
//        and insert that neither hand-out is visible in it. The last is the likeliest and the axis
//        prints the mount rows' own resolution beside the verdict so a reader can tell.
//
//   (P4) THE FLOOR IS THE CHEAPEST PER WRITE AND THE GAP IS ONE FRAME PLUS THE STRINGIFY. Both
//        library arms are above `floor` by between 1 and 15 ns per write. MECHANISM: one indirect
//        call frame, plus caveat (2)'s two comparisons and one `String` call on three of the five
//        ports. KILLER: a library arm AT OR BELOW the floor, which would mean an indirect call
//        through a schema table costs nothing and this axis prices nothing; or a gap over 15 ns, which
//        would mean the arms are not doing the same DOM work and the observation gate missed it.
//
//   (P5) THE AXIS REFUSES ITS OWN SUBJECT, AND SINCE `w64` WENT IT IS ONE BAR THAT DOES THE
//        REFUSING AT EVERY RUNG. `|set − bound|` per write clears neither its own two rows'
//        resolution nor four grains at ANY of the three rungs. MECHANISM: the CLOCK cannot express
//        it — four grains are 26.7, 6.67 and 1.67 ns per write against a quantity of roughly 0.5.
//        THE SECOND MECHANISM IS NO LONGER REACHABLE HERE and that is a loss recorded rather than
//        hidden: at the removed w64 four grains fell to 0.417 ns and the NOISE took over, because a
//        per-round difference of a fraction of a percent of an 80 ns row is a few tenths of a
//        nanosecond. KILLER: it resolves at any rung. At all three the reading would then be an
//        artefact of quantisation and must not be believed at all — there is now NO rung on this
//        ladder where a resolved reading could be believed, which is exactly why the escalation
//        below is `batch` and why the mount table is the half that answers. Whatever the rung, the
//        FIRST thing to check is not the result but the twin — that it really is a
//        separate declaration with its own declaration, schema, template and pools, and not two
//        names for one program.
//
//   (P6) EVERY NULL PAIR IS ORDERING OR NOTHING — `|intrinsic| ≤ noise` for all three mount pairs
//        and all nine update pairs. MECHANISM: the two halves of each are transcriptions of one
//        program. KILLER: any pair whose intrinsic stands out of its own noise — that ROW is then
//        unquotable, not merely its null, because two declarations of one program that differ in a
//        way which does not flip with the running order are two different programs.
//
// ═══ HOW TO RUN IT, WITH THE ARITHMETIC ══════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- port-write-doors 30 1 --record=first
//
// BATCH 1, ROUNDS 30, AND HERE IS WHERE BOTH COME FROM:
//
//   THE TWO TABLES DO NOT SHARE A REPETITION FACTOR — see `MOUNT_REPS_BASE`. Mount takes FOUR
//   scenes per region and update takes ONE, because a mount region is cheap in clock and expensive
//   in live elements while an update region is the reverse.
//   THE UPDATE GRAIN, WHICH IS THE BAR AT EVERY RUNG. A region is `reps × 3000 × 5 × R` writes
//   read off ONE clock, so at batch 1: w1 15 000 writes → 6.67 ns per write, w4 1.67, w16 0.417, at
//   a 0.100 ms quantum. FOUR GRAINS IS 26.7 ns AT w1 AND 1.67 ns AT w16, against a disputed
//   quantity of roughly 0.5 ns. THE CLOCK ALONE REFUSES ALL THREE. The rung that got the clock out
//   of the way was w64 and it is gone; `RUNGS` records what that cost.
//   THE MOUNT GRAIN, WHICH IS THE BAR ON THE HAND-OUT. Four scenes is 12 000 instances per region,
//   so a grain is 8.3 ns per instance and four is 33 ns — under the five-closures-against-one-object
//   difference the table has to see, which is why mount takes the repetition and update does not.
//   NOTHING IN THE SHRINK TOUCHED THIS NUMBER, deliberately: the mount table is the half that can
//   answer, and a cheaper axis that cannot answer its own question is not a cheaper axis.
//   THE CLOCK FLOOR. The shortest region is `floor·w1`: 15 000 writes at (say) 40 ns is 0.6 ms —
//   six ticks of a 0.100 ms clock, against a three-tick floor. It is not close to the clamp, but it
//   is not comfortable either, and the run refuses BY NAME with the batch that would clear it.
//   ROUNDS. 30 samples per phase. Rounds buy a stabler MEDIAN; they make a quantised sample no
//   finer and they do not reduce the MEDIAN of the per-round difference, which is what this axis's
//   quoting rule is measured against. So 120 rounds would cost four times the wall clock and move no
//   verdict — which is the whole reason the default came DOWN rather than the resolution coming up.
//   THE ESCALATION IS `port-write-doors 30 4`, which multiplies both tables' scenes per region by
//   four: it quarters every grain and buys roughly half the noise, for four times the update
//   table's wall clock. Do not expect it to settle the subject; expect it to settle the HAND-OUT,
//   which is the useful half.
//
// ═══ THE WALL CLOCK — THE ESTIMATE THAT STOOD HERE WAS WRONG BY AN ORDER OF MAGNITUDE ════════
//
// IT SAID "TWO TO FOUR MINUTES" AT `120 1`. The axis was then started three times and never printed
// a row: killed at 10 minutes, killed at 38 minutes, timed out at 9 minutes at `30 1`. The estimate
// is repeated here as it was, because what it MISSED is the useful part:
//
//     "Per round: six mount regions at ~4.8 ms, and twenty-four update regions summing to
//      6 × (1.2 + 4.8 + 19.2 + 76.8) ms ≈ 610 ms at 80 ns per write, plus thirty GC pauses.
//      Call it 1-1.5 s per round."
//
//   (1) IT COUNTED ROUNDS AND NOT PASSES. `runPhases` runs SIX WARM-UP PASSES over the whole phase
//       list before the first round, and it does that for EACH table. At `30 1` every phase is
//       therefore sampled 36 times, not 30.
//   (2) IT DID NOT COUNT THE UPDATE TABLE'S SCENES AT ALL. `updatePhases[].prep()` BUILDS A WHOLE
//       SCENE — 3000 instances mounted into the document — and `sampleOnce` calls `prep()` once per
//       sample and `cleanup()` after it. That is untimed, so it is absent from every figure the run
//       prints, and it is one full mount-and-teardown of the mount table's own subject per update
//       sample: 18 more scenes per pass, on top of the mount table's 24.
//   (3) IT PRICED A WRITE AT 80 ns ON A DOCUMENT HOLDING 48 000 LIVE ELEMENTS. Every one of the
//       five ports is an IDL accessor that invalidates style on a live element; this suite has
//       never measured that shape and 80 ns is the floor of a plausible range, not its middle.
//   (4) IT CALLED THE GC PAUSES "THIRTY" AND PRICED THEM AT NOTHING. `gcIfPossible` runs `gc()`
//       TWICE before every timed region, the runner passes `--js-flags=--expose-gc` so both are
//       real full collections, and the heap they walk holds up to 48 000 elements.
//
// SO THE COUNTS, WHICH ARE EXACT, AND THE SECONDS, WHICH ARE NOT. At `30 1`, after the shrink, each
// table is sampled over 36 passes (6 warm-up + 30 rounds):
//
//     mount table    36 × 6 phases × 4 scenes × 3000  = 2 592 000 instance builds, and as many
//                    teardowns; 216 timed regions, so 216 GC pairs
//     update table   36 × 18 phases × 1 scene × 3000  = 1 944 000 instance builds (UNTIMED prep),
//                    and 36 × 6 × 3000 × 5 × (1+4+16) = 68 040 000 writes; 648 GC pairs
//     gates          21 scenes before timing and 18 after — 117 000 instance builds and 4 410 000
//                    writes, plus 39 serialisations of a 12 000-element document
//
// BEFORE THE SHRINK THOSE READ 2 592 000 · 2 592 000, 275 400 000 WRITES, 864 GC PAIRS AND
// 15 300 000 GATE WRITES. The writes fell by 75.3% and the gate with them; the instance builds fell
// by 25% because the update table lost six of its twenty-four phases; the mount table's counts are
// IDENTICAL, which is the point.
//
// THE SECONDS ARE A MODEL AND ARE LABELLED AS ONE. At 500 ns per write on a live document the
// update ladder is ~34 s and at 1 µs it is ~68 s; the two tables' 4.5 million instance builds are a
// few seconds at any plausible per-instance figure; the GC pairs are the term with the widest bar
// and nobody here has measured one. WHAT IS NOT A MODEL is that the mount table and both gates come
// FIRST and are a small fraction of the above — so the first number now arrives long before the
// ladder finishes, which is the other half of the fix. See `benchmarkPortWriteDoors`.
//
// `@exodra/dom` and `@exodra/core` are resolved to their BUILT dists, so `npm run build` at the repo
// root has to have run, or every library row is last week's renderer.
import { createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoPort, TExoFillDoors, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, exoDomSchemaOf, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine, TExoDomNode } from '@exodra/dom';
import { markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';
import type { TExoMachineInitialState } from '@exodra/core';

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

/** The DOM backend, built ONCE at module load. It composes nothing, so it is the shipped path. */
const BACKEND = withExoCompiler(new ExoDomBackend());

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE JOB.
// ---------------------------------------------------------------------------------------

/**
 * INSTANCES PER SCENE.
 *
 * Chosen from the CLOCK and from the DOCUMENT, in that order: 300 instances is 1 500 port writes
 * per pass at rung 1, and 1 200 elements in the document.
 *
 * ⚠️  THE CLOCK IS THIS AXIS'S BINDING CONSTRAINT AT THIS SIZE, and the paragraph that used to
 * stand here denied it — it was computed for a scene of 3 000 and said "the clock is not its
 * constraint". At 300 the grain is ten times coarser than every figure in the `RUNGS` table below,
 * and that table is what decides whether the subject is answerable at all. MEASURED against two
 * real runs: `quantum ÷ (updateReps × INSTANCES × PORTS × rung)` gives w16 at batch 1 a grain of
 * 4.1667 ns (the run printed `own resolution 4.1667`) and at batch 3 of 1.3889 (the run printed
 * `THE WRITE GRAIN … w16: 1.3889`). The `RUNGS` table's 0.417 ns for w16 is the 3 000 figure.
 *
 * SO THE TWO CONSTANTS MOVE TOGETHER OR NOT AT ALL. Restoring `w64` at 300 instances puts four
 * grains at 4.1667 ns against a disputed quantity of order 0.5 — it buys nothing. Only 3 000 × w64
 * reaches 0.417, which is the one cell in the whole grid that sits under the subject.
 */
const INSTANCES = 300;

/** Value ports per instance. Five KINDS; see the header. CONSTANT at every rung, by design. */
const PORTS = 5;

/**
 * Writes per port on the update phase. See the header for what each one is here to catch.
 *
 * ═══ THE TOP RUNG WAS `64` AND IS GONE, AND WHAT THAT COST IS WRITTEN OUT HERE ═══
 *
 * THE REASON IS WALL CLOCK AND NOTHING ELSE. A rung's cost is linear in the rung, so `w64` alone
 * was 960 000 of the 1 275 000 writes a program pays per pass — 75.3% of the whole update table,
 * and of the observation gate, which drives every program at every rung twice. The axis was killed
 * three times without ever printing a row; `THE WALL CLOCK` block above records the arithmetic that
 * missed it and what actually dominates.
 *
 * WHAT IT COSTS IN RESOLUTION, EXACTLY. The grain is `quantum ÷ (updateReps × INSTANCES × PORTS ×
 * rung)`. THE TABLE BELOW IS FOR INSTANCES = 3000 AND THE CONSTANT ABOVE IS 300, so every figure in
 * it is ten times finer than what this axis actually runs at — see the warning on `INSTANCES`. At
 * batch 1 and a 0.100 ms quantum:
 *
 *     rung          w1        w4        w16       w64 (GONE)
 *     writes/region 15 000    60 000    240 000   960 000
 *     GRAIN         6.67 ns   1.67 ns   0.417 ns  0.104 ns   per write
 *     4 GRAINS      26.7 ns   6.67 ns   1.67 ns   0.417 ns   per write
 *
 *     AT THE 300 THIS AXIS RUNS, every column is ×10: w16 four grains is 16.7 ns, and w64 four
 *     grains is 4.17 ns — still eight times the disputed quantity. RESTORING w64 ALONE BUYS
 *     NOTHING; only 3000 × w64 reaches 0.417.
 *
 * THE DISPUTED QUANTITY IS OF ORDER 0.5 ns PER WRITE. So `w64` was the ONE rung whose clock bar
 * (0.417 ns) sat just UNDER it: at `w64` the refusal predicted by (P5) would have come from the
 * NOISE, and at every remaining rung it comes from the CLOCK. THAT IS THE WHOLE OF WHAT WAS LOST —
 * not the answer, which is a refusal either way, but the DEMONSTRATION of the crossover from
 * "the clock cannot express this" to "the noise cannot separate it". The finest bar this ladder now
 * carries is 1.67 ns per write, which is 3.3× the disputed quantity, so the ladder refuses on the
 * clock at all three rungs and says so rather than implying a noise-limited reading it no longer
 * has.
 *
 * WHAT WAS NOT LOST. Three rungs still fit `a + b/R` (the fit needs three points to have a residual
 * at all), the span is still 16×, every arm still carries its null twin, and the per-write rows of
 * `set`, `bound` and `floor` are unaffected — a row's median is not made coarser by the absence of a
 * rung above it.
 *
 * AND THE MOUNT TABLE IS UNTOUCHED, which is the half that can answer. See `MOUNT_REPS_BASE`.
 */
const RUNGS: readonly number[] = [1, 16];

/**
 * SCENES PER TIMED REGION, BEFORE `batch` MULTIPLIES IT — AND THE TWO TABLES DO NOT SHARE ONE.
 *
 * `handler-count`'s rule, and for its reason: the two tables' costs scale differently, so a single
 * repetition factor makes one of them either coarse or ruinous. A MOUNT region is cheap in time and
 * expensive in live elements — four scenes is 12 000 instances and ~48 000 elements standing at once,
 * but only ~5 ms of clock — and it needs the repetition, because the quantity it is about (five
 * closures against one object, per instance) is tens of nanoseconds per instance against a grain of
 * `quantum / (reps × 3000)`. An UPDATE region is the opposite: cheap in elements, because one scene
 * is written over and over, and expensive in time at the high rungs, where one scene already carries
 * 240 000 writes.
 *
 * SO MOUNT TAKES FOUR AND UPDATE TAKES ONE. Four is where the mount grain (~8 ns per instance at a
 * 0.100 ms quantum) is comfortably under the hand-out it has to see, and it is bounded by the live
 * element count rather than by the clock. One is where the update table's top region is already
 * ~19 ms at 80 ns a write; raising it multiplies the longest thing in the run.
 *
 * ═══ NEITHER CONSTANT MOVED IN THE SHRINK, AND THAT WAS THE CHOICE ═══
 *
 * `MOUNT_REPS_BASE × INSTANCES = 12 000` IS WHAT SETS THE MOUNT GRAIN, and the mount table is the
 * half of this axis that can answer its question (see WHAT THE AXIS CAN STILL SETTLE, in the
 * header). Cutting either factor coarsens the grain in exact proportion: at 6000 instances per
 * region four grains would be 66.7 ns per instance, above the tens-of-nanoseconds hand-out the
 * table exists to see, and the axis would be fast and mute. So the wall clock came out of the
 * update ladder's top rung instead — see `RUNGS`.
 *
 * AND THE MOUNT TABLE IS NOT WHERE THE TIME WENT. Its 216 timed regions at `30 1` are 2 592 000
 * instance builds; the update ladder was 275 million writes. The arithmetic is in the header.
 */
const MOUNT_REPS_BASE = 4;
const UPDATE_REPS_BASE = 1;

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

/**
 * THE QUOTING BAR THIS SUITE INHERITS FROM `ssr-floor` — a difference must clear FOUR GRAINS as
 * well as its own two rows' resolution.
 *
 * IT IS THE BINDING BAR AT EVERY RUNG ON THIS AXIS, which is worth stating because the opposite is
 * easy to assume from the enormous write counts. Four grains is 26.7 ns per write at w1 and 1.67 ns
 * at w16 (batch 1, 0.100 ms quantum), against a disputed quantity of roughly 0.5 ns.
 *
 * THE LADDER USED TO CROSS FROM "the clock cannot express this" TO "the noise cannot separate it"
 * BETWEEN w16 AND w64, AND IT NO LONGER REACHES THE CROSSING: `w64` was removed for wall clock and
 * `RUNGS` records what that cost. The run still prints the grain and the resolution side by side at
 * every rung, and on this ladder it is the grain that refuses every time.
 */
const MIN_GRAINS = 4;

type Arm = 'set' | 'bound' | 'floor';
const ARMS: readonly Arm[] = ['set', 'bound', 'floor'];

/** A bound writer, as this participant spells one. See ARM 2. */
type TWrite = (value: unknown) => void;

// ---------------------------------------------------------------------------------------
// THE VALUE POOLS.
//
// FIVE ARRAYS OF EIGHT SHORT ASCII STRINGS PER FAMILY, one array per port, so that a write is ONE
// ARRAY LOAD with an index computed once per instance per pass — identical in all three arms, and
// nothing built, formatted or concatenated inside a timed region.
//
// PER PORT AND NOT PER WRITE, so that a setter table wired to the wrong port changes the page and
// the observation gate catches it. Nothing here contains a character the escapers replace, so the
// bytes in the document are the bytes in these arrays.
//
// EACH FAMILY HAS ITS OWN, and they are separate array objects even where the contents agree: a
// twin that read the subject's pool would share every string's internal representation and every
// load's inline cache, which is exactly the sharing a twin exists to avoid.
// ---------------------------------------------------------------------------------------

const A_ID: readonly string[] = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'];
const A_CLS: readonly string[] = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
const A_TXT: readonly string[] = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
const A_TTL: readonly string[] = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'];
const A_VAL: readonly string[] = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];

const B_ID: readonly string[] = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'];
const B_CLS: readonly string[] = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
const B_TXT: readonly string[] = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
const B_TTL: readonly string[] = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'];
const B_VAL: readonly string[] = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];

// ---------------------------------------------------------------------------------------
// THE DECLARATIONS. Two families, each with its own declaration, its own schema and its own port numbering.
//
// WITHIN A FAMILY THE `set` AND `bound` COMPONENTS SHARE ONE DECLARATION, which is `door-count`'s
// rule and `op-click-floor`'s: one declaration, two wires, so nothing between those two rows is a
// difference of markup, of schema, of port numbering, of setter table or of prototype.
//
// THE FIVE PORTS ARE FIVE KINDS — see the header. The `<span>` carries BOTH an attribute port and a
// text port, which is legal and is what puts a `className` store and a Text `.data` store on the
// same element.
// ---------------------------------------------------------------------------------------

interface TRowPorts {
    readonly id: TExoAttrPort;
    readonly cls: TExoAttrPort;
    readonly txt: TExoTextPort;
    readonly ttl: TExoAttrPort;
    readonly val: TExoAttrPort;
}

function makeRowSchema(): TExoCursorDeclaration<TRowPorts> {
    return createExoSchema<TRowPorts>((b) => {
        let id!: TExoAttrPort;
        let cls!: TExoAttrPort;
        let txt!: TExoTextPort;
        let ttl!: TExoAttrPort;
        let val!: TExoAttrPort;
        b.el('li', { class: 'row' }, (li) => {
            id = li.port('data-id');
            li.el('span', null, (span) => {
                cls = span.port('class');
                txt = span.textPort();
            });
            li.el('a', { href: '#' }, (a) => {
                ttl = a.port('title');
            });
            li.el('input', { type: 'text' }, (input) => {
                val = input.port('value');
            });
        });
        return { id, cls, txt, ttl, val };
    });
}

const S_A = makeRowSchema();
const S_A_FORMS: unknown[] = [];
const S_B = makeRowSchema();
const S_B_FORMS: unknown[] = [];
const PA = S_A.ports;
const PB = S_B.ports;

/**
 * THE COMPILED SCHEMAS, TAKEN AT MODULE LOAD.
 *
 * `exoDomSchemaOf` caches on the declaration, so this is the SAME schema every `render` below will
 * use — not a second compile. Taking it here does two things: it puts the markup parse, the walk
 * emission and the setter construction outside every timed region for every arm equally (caveat 5),
 * and it gives the bound arm the schema halves it resolves its constants from.
 */
const PLAN_A = exoDomSchemaOf(machineOf(S_A, S_A_FORMS), BACKEND);
const PLAN_B = exoDomSchemaOf(machineOf(S_B, S_B_FORMS), BACKEND);

// ---------------------------------------------------------------------------------------
// THE BOUND ARM'S MODULE-LOAD CONSTANTS — the NODE SLOT and the SETTER for each of the five ports.
//
// A LIBRARY METHOD COULD NOT DO THIS AND THIS PARTICIPANT CAN, which is deliberate: the bound arm is
// given the best case any bound writer could have. `c.portWriter(port)` had to read
// `port.index`, then `elem[index]`, then `setters[index]` at every hand-out; here all three are
// resolved once for the life of the process, and the hand-out inside the wire is reduced to ONE
// array load out of the instance's own node table plus the closure. IF THE BOUND ARM LOSES WITH THAT
// ADVANTAGE, NO SPELLING OF IT AS A LIBRARY METHOD CAN WIN.
//
// The indices are read OFF THE PORT OBJECTS rather than assumed to be 0-4: port numbering is
// `@exodra/core`'s and this file does not get to decide it.
// ---------------------------------------------------------------------------------------

const A_SLOT_ID = PLAN_A.elem[PA.id.index];
const A_SLOT_CLS = PLAN_A.elem[PA.cls.index];
const A_SLOT_TXT = PLAN_A.elem[PA.txt.index];
const A_SLOT_TTL = PLAN_A.elem[PA.ttl.index];
const A_SLOT_VAL = PLAN_A.elem[PA.val.index];
const A_SET_ID = PLAN_A.setters[PA.id.index];
const A_SET_CLS = PLAN_A.setters[PA.cls.index];
const A_SET_TXT = PLAN_A.setters[PA.txt.index];
const A_SET_TTL = PLAN_A.setters[PA.ttl.index];
const A_SET_VAL = PLAN_A.setters[PA.val.index];
// THE THIRD ARGUMENT, and it is not optional: one writer per KIND means the attribute NAME cannot
// be baked into the function, so `writeExoAttr(node, value, data)` takes it here. The shipped door
// passes `schema.writeData[index]` (EXO_DOM_NODE_VOCABULARY, `attr`); a bound writer that omits it
// calls `setAttribute(undefined, value)` and writes an attribute literally named `undefined`.
const A_DATA_ID = PLAN_A.writeData[PA.id.index];
const A_DATA_CLS = PLAN_A.writeData[PA.cls.index];
const A_DATA_TXT = PLAN_A.writeData[PA.txt.index];
const A_DATA_TTL = PLAN_A.writeData[PA.ttl.index];
const A_DATA_VAL = PLAN_A.writeData[PA.val.index];

const B_SLOT_ID = PLAN_B.elem[PB.id.index];
const B_SLOT_CLS = PLAN_B.elem[PB.cls.index];
const B_SLOT_TXT = PLAN_B.elem[PB.txt.index];
const B_SLOT_TTL = PLAN_B.elem[PB.ttl.index];
const B_SLOT_VAL = PLAN_B.elem[PB.val.index];
const B_SET_ID = PLAN_B.setters[PB.id.index];
const B_SET_CLS = PLAN_B.setters[PB.cls.index];
const B_SET_TXT = PLAN_B.setters[PB.txt.index];
const B_SET_TTL = PLAN_B.setters[PB.ttl.index];
const B_SET_VAL = PLAN_B.setters[PB.val.index];
const B_DATA_ID = PLAN_B.writeData[PB.id.index];
const B_DATA_CLS = PLAN_B.writeData[PB.cls.index];
const B_DATA_TXT = PLAN_B.writeData[PB.txt.index];
const B_DATA_TTL = PLAN_B.writeData[PB.ttl.index];
const B_DATA_VAL = PLAN_B.writeData[PB.val.index];

// ---------------------------------------------------------------------------------------
// THE HANDLE ARRAYS.
//
// ONE FLAT ARRAY OF `INSTANCES × PORTS` PER SCENE, IN ALL THREE ARMS, allocated by `prep()` and
// therefore UNTIMED IN ALL THREE — which is (D3). The wire writes into whichever array the mount
// driver published here immediately before starting, so two scenes prepared for one timed region
// keep their own handles and no scene's update pass can reach another scene's nodes.
//
// WHAT EACH ARM PUTS IN IT: `set` the instance's ONE `TExoFillDoors` holder, five times (caveat 4);
// `bound` the instance's five closures; `floor` the instance's five resolved nodes. So every arm's
// inner loop is `const b = i * PORTS;` and five loads at `b … b+4`, character for character.
// ---------------------------------------------------------------------------------------

// A SCENE OWNS ITS ARRAYS AND THE WIRE IS TOLD WHERE TO WRITE, and that is not a style choice —
// it is a defect this file would otherwise have at `batch > 1`. `sampleOnce` calls `prep()` for
// EVERY scenario before it measures ANY of them, so a single module-level "current scene" would be
// overwritten by the last `prep()` and every scenario's update pass would write into the last
// scene's nodes while the earlier scenes were never touched at all. The timing would look fine and
// the observation gate — which drives one scene at a time — would never see it. So `open()` builds a
// scene's arrays and hands back three closures over THEM, and `build()` publishes this scene's array
// to the slot the wire reads one statement before it renders.
let CUR_SET_A: TExoFillDoors[] = [];
let CUR_SET_B: TExoFillDoors[] = [];
let CUR_BOUND_A: TWrite[] = [];
let CUR_BOUND_B: TWrite[] = [];
// THERE IS NO SLOT FOR THE FLOOR, and that is one store per SCENE — not per instance and not per
// write — that the library arms pay and it does not. A wire is called BY the library and can only
// be told where to write through a slot it can see; the floor's loop is handed its array as an
// argument. The difference lands in the mount table's `− floor` column, once per three thousand
// instances, and it is stated rather than papered over with a store nothing reads.

/**
 * THE ROW NUMBER, ONE COUNTER PER LIBRARY DECLARATION.
 *
 * `ExoDomBackend.render` mounts ONE instance and passes it props `0` and index `0` — it has no row
 * number to hand out, because a row that varies is a LIST and this scene is deliberately not one. So
 * the wire takes its own number from here, and `build` resets it inside the timed region.
 *
 * THE FLOOR HAS NO COUNTER, because its loop already has the index in hand. Together with the
 * publish store above, that is TWO CALLS AND TWO STORES PER SCENE — not per instance and not per
 * write — that the library arms pay and the floor does not. Over three thousand instances it is
 * beneath the mount table's own grain, it is identical between `set` and `bound`, and it is named
 * here rather than discovered.
 */
let NEXT_SET_A = 0;
let NEXT_SET_B = 0;
let NEXT_BOUND_A = 0;
let NEXT_BOUND_B = 0;

// ---------------------------------------------------------------------------------------
// ARM 1 — THE SHIPPED DOOR.
//
// THE WIRE: five `c.set` calls (the mount fill), then `c.fillDoors()` for the handle, then five
// stores into the scene's array.
//
// THE UPDATE: `holder.set(port, value)` — the shipped door, whose body is the `port.index` load,
// the setter load, the two-load node resolve, and the setter call.
// Nothing is hand-spelled and nothing is inlined here; that is (D1) and (D2).
// ---------------------------------------------------------------------------------------

const SET_A_WIRE: TExoMachineInitialState<TExoDomNode> = (c) => {
    const i = NEXT_SET_A++;
    const k = i & 7;
    c.attr(PA.id, A_ID[k]);
    c.attr(PA.cls, A_CLS[k]);
    c.text(PA.txt, A_TXT[k]);
    c.attr(PA.ttl, A_TTL[k]);
    c.attr(PA.val, A_VAL[k]);
    const holder = c.fillDoors();
    const h = CUR_SET_A;
    const b = i * PORTS;
    h[b] = holder;
    h[b + 1] = holder;
    h[b + 2] = holder;
    h[b + 3] = holder;
    h[b + 4] = holder;
};

const SET_B_WIRE: TExoMachineInitialState<TExoDomNode> = (c) => {
    const i = NEXT_SET_B++;
    const k = i & 7;
    c.attr(PB.id, B_ID[k]);
    c.attr(PB.cls, B_CLS[k]);
    c.text(PB.txt, B_TXT[k]);
    c.attr(PB.ttl, B_TTL[k]);
    c.attr(PB.val, B_VAL[k]);
    const holder = c.fillDoors();
    const h = CUR_SET_B;
    const b = i * PORTS;
    h[b] = holder;
    h[b + 1] = holder;
    h[b + 2] = holder;
    h[b + 3] = holder;
    h[b + 4] = holder;
};

const SET_A_COMPONENT: TExoDomMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: SET_A_WIRE,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const SET_B_COMPONENT: TExoDomMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: SET_B_WIRE,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

function setUpdateA(h: TExoFillDoors[], rung: number): void {
    const n = INSTANCES;
    for (let r = 0; r < rung; r++) {
        for (let i = 0; i < n; i++) {
            const k = (i + r) & 7;
            const b = i * PORTS;
            h[b].attr(PA.id, A_ID[k]);
            h[b + 1].attr(PA.cls, A_CLS[k]);
            h[b + 2].text(PA.txt, A_TXT[k]);
            h[b + 3].attr(PA.ttl, A_TTL[k]);
            h[b + 4].attr(PA.val, A_VAL[k]);
        }
    }
}

function setUpdateB(h: TExoFillDoors[], rung: number): void {
    const n = INSTANCES;
    for (let r = 0; r < rung; r++) {
        for (let i = 0; i < n; i++) {
            const k = (i + r) & 7;
            const b = i * PORTS;
            h[b].attr(PB.id, B_ID[k]);
            h[b + 1].attr(PB.cls, B_CLS[k]);
            h[b + 2].text(PB.txt, B_TXT[k]);
            h[b + 3].attr(PB.ttl, B_TTL[k]);
            h[b + 4].attr(PB.val, B_VAL[k]);
        }
    }
}

// ---------------------------------------------------------------------------------------
// ARM 2 — THE BOUND WRITER. NOT A SHIPPED SHAPE.
//
// `c.portWriter(port)` stood on `TExoDomNode` and is DELETED — for three correctness
// problems named at the top of this file, not for a timing. It is spelled here, in the participant,
// over the public surface: `c.portTable()` hands back THE INSTANCE'S OWN node array (the
// same array `fillDoors()` wraps), and the schema's `setters`/`elem` came out of `exoDomSchemaOf` at module
// load. The cast on the table is the one the library's own `portNodeWriter` makes internally; the
// token is opaque precisely so that a caller has to mean it.
//
// THE INITIAL FILL IS NOT MADE THROUGH THESE WRITERS, and that is the library's instruction rather
// than a convenience: a write through a hand-built writer records nothing, and `wireExoInstance`'s
// `finally` restores every port the wire did not record a fill for — so a port whose only fill came
// through a bound writer would be swept back to its placeholder before the wire returned. Both
// library arms therefore mount with the IDENTICAL five `c.set` calls, which makes the mount
// difference between them EXACTLY the hand-out.
// ---------------------------------------------------------------------------------------

const BOUND_A_WIRE: TExoMachineInitialState<TExoDomNode> = (c) => {
    const i = NEXT_BOUND_A++;
    const k = i & 7;
    c.attr(PA.id, A_ID[k]);
    c.attr(PA.cls, A_CLS[k]);
    c.text(PA.txt, A_TXT[k]);
    c.attr(PA.ttl, A_TTL[k]);
    c.attr(PA.val, A_VAL[k]);
    // THE HAND-OUT. One call for the table, five array loads out of it, five closures.
    const nodes = c.portTable() as unknown as readonly Node[];
    const nId = nodes[A_SLOT_ID] as Element;
    const nCls = nodes[A_SLOT_CLS] as Element;
    const nTxt = nodes[A_SLOT_TXT] as Element;
    const nTtl = nodes[A_SLOT_TTL] as Element;
    const nVal = nodes[A_SLOT_VAL] as Element;
    const w = CUR_BOUND_A;
    const b = i * PORTS;
    w[b] = (v: unknown): void => {
        A_SET_ID(nId, v, A_DATA_ID);
    };
    w[b + 1] = (v: unknown): void => {
        A_SET_CLS(nCls, v, A_DATA_CLS);
    };
    w[b + 2] = (v: unknown): void => {
        A_SET_TXT(nTxt, v, A_DATA_TXT);
    };
    w[b + 3] = (v: unknown): void => {
        A_SET_TTL(nTtl, v, A_DATA_TTL);
    };
    w[b + 4] = (v: unknown): void => {
        A_SET_VAL(nVal, v, A_DATA_VAL);
    };
};

const BOUND_B_WIRE: TExoMachineInitialState<TExoDomNode> = (c) => {
    const i = NEXT_BOUND_B++;
    const k = i & 7;
    c.attr(PB.id, B_ID[k]);
    c.attr(PB.cls, B_CLS[k]);
    c.text(PB.txt, B_TXT[k]);
    c.attr(PB.ttl, B_TTL[k]);
    c.attr(PB.val, B_VAL[k]);
    const nodes = c.portTable() as unknown as readonly Node[];
    const nId = nodes[B_SLOT_ID] as Element;
    const nCls = nodes[B_SLOT_CLS] as Element;
    const nTxt = nodes[B_SLOT_TXT] as Element;
    const nTtl = nodes[B_SLOT_TTL] as Element;
    const nVal = nodes[B_SLOT_VAL] as Element;
    const w = CUR_BOUND_B;
    const b = i * PORTS;
    w[b] = (v: unknown): void => {
        B_SET_ID(nId, v, B_DATA_ID);
    };
    w[b + 1] = (v: unknown): void => {
        B_SET_CLS(nCls, v, B_DATA_CLS);
    };
    w[b + 2] = (v: unknown): void => {
        B_SET_TXT(nTxt, v, B_DATA_TXT);
    };
    w[b + 3] = (v: unknown): void => {
        B_SET_TTL(nTtl, v, B_DATA_TTL);
    };
    w[b + 4] = (v: unknown): void => {
        B_SET_VAL(nVal, v, B_DATA_VAL);
    };
};

const BOUND_A_COMPONENT: TExoDomMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: BOUND_A_WIRE,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const BOUND_B_COMPONENT: TExoDomMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: BOUND_B_WIRE,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

function boundUpdateA(w: TWrite[], rung: number): void {
    const n = INSTANCES;
    for (let r = 0; r < rung; r++) {
        for (let i = 0; i < n; i++) {
            const k = (i + r) & 7;
            const b = i * PORTS;
            w[b](A_ID[k]);
            w[b + 1](A_CLS[k]);
            w[b + 2](A_TXT[k]);
            w[b + 3](A_TTL[k]);
            w[b + 4](A_VAL[k]);
        }
    }
}

function boundUpdateB(w: TWrite[], rung: number): void {
    const n = INSTANCES;
    for (let r = 0; r < rung; r++) {
        for (let i = 0; i < n; i++) {
            const k = (i + r) & 7;
            const b = i * PORTS;
            w[b](B_ID[k]);
            w[b + 1](B_CLS[k]);
            w[b + 2](B_TXT[k]);
            w[b + 3](B_TTL[k]);
            w[b + 4](B_VAL[k]);
        }
    }
}

// ---------------------------------------------------------------------------------------
// ARM 3 — THE NATIVE FLOOR. No component, no declaration, no connector, no port object, no schema table and
// no indirect call: one `<template>` parsed at module load, a `cloneNode(true)` and a written-out
// walk per instance, the five nodes in the arm's own array, and five DIRECT DOM calls per write.
//
// IT SPENDS ONE FRAME PER WRITE WHERE THE LIBRARY ARMS SPEND TWO, and that is caveat (1): the
// difference IS the abstraction, which is what a floor is for. This arm is never used as the control
// for `set` against `bound`.
//
// THE TEMPLATE STRING MUST SERIALISE, AFTER FILLING, TO EXACTLY WHAT THE SCHEMA'S PROTOTYPE DOES.
// Where every character of it comes from, read off `compileExoDomSchema`:
//   · static attributes are written first, in the declaration's own spelling — `class="row"`,
//     `href="#"`, `type="text"`;
//   · every attribute port emits ` name=""`, and the compiler then REMOVES that placeholder from the
//     parsed prototype when the fill will write the attribute (`writes-exo-attribute`) — true for
//     `data-id`, `class` and `title`, so `setAttribute`/`className` APPENDS them in the position the
//     server prints them in, after the static ones;
//   · `value` on an `<input>` answers `false` there, because its setter stores the PROPERTY and
//     never the attribute — so ` value=""` is KEPT in the prototype and stays empty forever, which
//     is why the floor's template carries it too and why the observation reads `.value` back;
//   · a text port emits ONE SPACE inside its element, and the character is emptied out at build —
//     so the floor's `<span>` carries one space, whose Text node it then writes into.
// The observation gate below compares the three arms character for character and prints the diff, so
// if any of that reading is wrong the run refuses with the exact string to put here.
// ---------------------------------------------------------------------------------------

// NO `value=""` ON THE INPUT, and that is the reference speaking: the fifth write is a PROPERTY
// store, so it never reaches the attribute the serialiser shows. A template that carried the
// attribute put nine characters per row into the floor's output that no other arm has, and the
// observation gate — markup plus every input's live `.value` read back — refused the arm for it.
const FLOOR_A_HTML = '<li class="row"><span> </span><a href="#"></a><input type="text"></li>';
const FLOOR_B_HTML = '<li class="row"><span> </span><a href="#"></a><input type="text"></li>';

function protoFrom(html: string): Element {
    const t = document.createElement('template');
    t.innerHTML = html;
    return t.content.firstElementChild as Element;
}

const FLOOR_A_PROTO = protoFrom(FLOOR_A_HTML);
const FLOOR_B_PROTO = protoFrom(FLOOR_B_HTML);

function floorMountA(out: Node[], container: HTMLElement): void {
    const proto = FLOOR_A_PROTO;
    const n = INSTANCES;
    for (let i = 0; i < n; i++) {
        const row = proto.cloneNode(true) as HTMLElement;
        const span = row.firstChild as HTMLElement;
        const text = span.firstChild as Text;
        const anchor = span.nextSibling as HTMLElement;
        const input = anchor.nextSibling as HTMLInputElement;
        const k = i & 7;
        row.setAttribute('data-id', A_ID[k]);
        span.className = A_CLS[k];
        text.data = A_TXT[k];
        anchor.setAttribute('title', A_TTL[k]);
        input.value = A_VAL[k];
        container.appendChild(row);
        const b = i * PORTS;
        out[b] = row;
        out[b + 1] = span;
        out[b + 2] = text;
        out[b + 3] = anchor;
        out[b + 4] = input;
    }
}

function floorMountB(out: Node[], container: HTMLElement): void {
    const proto = FLOOR_B_PROTO;
    const n = INSTANCES;
    for (let i = 0; i < n; i++) {
        const row = proto.cloneNode(true) as HTMLElement;
        const span = row.firstChild as HTMLElement;
        const text = span.firstChild as Text;
        const anchor = span.nextSibling as HTMLElement;
        const input = anchor.nextSibling as HTMLInputElement;
        const k = i & 7;
        row.setAttribute('data-id', B_ID[k]);
        span.className = B_CLS[k];
        text.data = B_TXT[k];
        anchor.setAttribute('title', B_TTL[k]);
        input.value = B_VAL[k];
        container.appendChild(row);
        const b = i * PORTS;
        out[b] = row;
        out[b + 1] = span;
        out[b + 2] = text;
        out[b + 3] = anchor;
        out[b + 4] = input;
    }
}

function floorUpdateA(nodes: Node[], rung: number): void {
    const n = INSTANCES;
    for (let r = 0; r < rung; r++) {
        for (let i = 0; i < n; i++) {
            const k = (i + r) & 7;
            const b = i * PORTS;
            (nodes[b] as Element).setAttribute('data-id', A_ID[k]);
            (nodes[b + 1] as HTMLElement).className = A_CLS[k];
            (nodes[b + 2] as Text).data = A_TXT[k];
            (nodes[b + 3] as Element).setAttribute('title', A_TTL[k]);
            (nodes[b + 4] as HTMLInputElement).value = A_VAL[k];
        }
    }
}

function floorUpdateB(nodes: Node[], rung: number): void {
    const n = INSTANCES;
    for (let r = 0; r < rung; r++) {
        for (let i = 0; i < n; i++) {
            const k = (i + r) & 7;
            const b = i * PORTS;
            (nodes[b] as Element).setAttribute('data-id', B_ID[k]);
            (nodes[b + 1] as HTMLElement).className = B_CLS[k];
            (nodes[b + 2] as Text).data = B_TXT[k];
            (nodes[b + 3] as Element).setAttribute('title', B_TTL[k]);
            (nodes[b + 4] as HTMLInputElement).value = B_VAL[k];
        }
    }
}

// ---------------------------------------------------------------------------------------
// THE SIX PROGRAMS.
//
// A scene is: a fresh container in the document, `INSTANCES` instances mounted into it, and the
// handle array the arm fills. `build` runs INSIDE the timed region on the mount table and OUTSIDE it
// on the update table; `update` only ever runs inside one; `off` never does.
// ---------------------------------------------------------------------------------------

/**
 * ONE SCENE, AND EVERY CLOSURE IN IT IS OVER THAT SCENE'S OWN ARRAYS.
 *
 * `build` is the only member that ever runs inside a timed region on the mount table, and `update`
 * the only one on the update table. Both are made by `open()`, which runs in `prep()` — so nothing
 * here allocates a closure, an array or an object while the clock is running, in ANY arm. That is
 * (D3) held to the letter rather than approximately.
 */
interface Scene {
    /** Publish this scene's arrays to the slot the wire reads, then build. TIMED on mount. */
    build(container: HTMLElement): void;
    /** Write every port of every instance `rung` times. TIMED on update. */
    update(rung: number): void;
    /** Tear the instances down. Outside every timed region. */
    off(): void;
}

interface Program {
    readonly name: string;
    readonly arm: Arm;
    readonly twin: boolean;
    readonly what: string;
    /** Allocate this scene's arrays and its three closures — UNTIMED, identically in all arms. */
    readonly open: () => Scene;
}

/**
 * A LIBRARY ARM'S SCENE — the two arms differ only in their component and in which module slot the
 * wire reads, so the shape is written once and the differences are its arguments.
 *
 * THE DISPOSER ARRAY IS ALLOCATED HERE, untimed, so the mount region holds N `render` calls and N
 * stores and no allocation of its own. See caveat (3) for why the stores stay in.
 */
function libraryScene(
    component: TExoDomMachine,
    publish: () => void,
    reset: () => void,
    update: (rung: number) => void
): Scene {
    const offs = new Array<() => void>(INSTANCES);
    return {
        build: (container: HTMLElement): void => {
            publish();
            reset();
            for (let i = 0; i < INSTANCES; i++) offs[i] = BACKEND.render(component, container);
        },
        update,
        off: (): void => {
            for (let g = 0; g < offs.length; g++) offs[g]();
        },
    };
}

const NOOP_OFF = (): void => {};

const PROGRAMS: readonly Program[] = [
    {
        name: 'set',
        arm: 'set',
        twin: false,
        what:
            'the SHIPPED door — c.set × 5 in the wire, c.fillDoors() once for the handle, and ' +
            'ExoDomPorts.set(port, value) for every write afterwards',
        open: (): Scene => {
            const h = new Array<TExoFillDoors>(INSTANCES * PORTS);
            return libraryScene(
                SET_A_COMPONENT,
                () => {
                    CUR_SET_A = h;
                },
                () => {
                    NEXT_SET_A = 0;
                },
                (rung) => setUpdateA(h, rung)
            );
        },
    },
    {
        name: 'set·twin',
        arm: 'set',
        twin: true,
        what: 'the NULL for set — its own declaration, schema, port numbering, pools and wire, true Δ = 0',
        open: (): Scene => {
            const h = new Array<TExoFillDoors>(INSTANCES * PORTS);
            return libraryScene(
                SET_B_COMPONENT,
                () => {
                    CUR_SET_B = h;
                },
                () => {
                    NEXT_SET_B = 0;
                },
                (rung) => setUpdateB(h, rung)
            );
        },
    },
    {
        name: 'bound',
        arm: 'bound',
        twin: false,
        what:
            'NOT SHIPPED — the node and the setter resolved once and kept in a closure; the ' +
            'initial fill still goes through c.set, because a bound write records nothing',
        open: (): Scene => {
            const w = new Array<TWrite>(INSTANCES * PORTS);
            return libraryScene(
                BOUND_A_COMPONENT,
                () => {
                    CUR_BOUND_A = w;
                },
                () => {
                    NEXT_BOUND_A = 0;
                },
                (rung) => boundUpdateA(w, rung)
            );
        },
    },
    {
        name: 'bound·twin',
        arm: 'bound',
        twin: true,
        what: 'the NULL for bound — its own declaration, schema, constants, pools and wire, true Δ = 0',
        open: (): Scene => {
            const w = new Array<TWrite>(INSTANCES * PORTS);
            return libraryScene(
                BOUND_B_COMPONENT,
                () => {
                    CUR_BOUND_B = w;
                },
                () => {
                    NEXT_BOUND_B = 0;
                },
                (rung) => boundUpdateB(w, rung)
            );
        },
    },
    {
        name: 'floor',
        arm: 'floor',
        twin: false,
        what:
            'THE NATIVE FLOOR — a template clone, a written-out walk, nodes in its own array, and ' +
            'five direct DOM calls per write; ONE frame where the library arms spend two',
        open: (): Scene => {
            const nodes = new Array<Node>(INSTANCES * PORTS);
            return {
                build: (container: HTMLElement): void => floorMountA(nodes, container),
                update: (rung: number): void => floorUpdateA(nodes, rung),
                off: NOOP_OFF,
            };
        },
    },
    {
        name: 'floor·twin',
        arm: 'floor',
        twin: true,
        what: 'the NULL for floor — its own template, its own proto, its own pools, true Δ = 0',
        open: (): Scene => {
            const nodes = new Array<Node>(INSTANCES * PORTS);
            return {
                build: (container: HTMLElement): void => floorMountB(nodes, container),
                update: (rung: number): void => floorUpdateB(nodes, rung),
                off: NOOP_OFF,
            };
        },
    },
];

const programOf = (name: string): Program => PROGRAMS.find((p) => p.name === name) as Program;

/** A row's name on the update table — the program plus its rung. */
const updateName = (p: Program, rung: number): string =>
    p.twin ? `${p.arm}·w${rung}·twin` : `${p.arm}·w${rung}`;

// ---------------------------------------------------------------------------------------
// THE OBSERVATION — (D7).
//
// A scene's markup with comment anchors stripped (`markupOf`, shared with every other axis), PLUS
// every `<input>`'s LIVE `.value` read back off the DOM. The property store is the one of the five
// writes the serialiser cannot show — its setter never touches the attribute, which is exactly why
// the compiler keeps the empty ` value=""` placeholder in the prototype — so a comparison of markup
// alone would leave one fifth of every arm's writes unchecked.
//
// IT IS READ OUTSIDE EVERY TIMED REGION, at the gate points only. It is O(N) in string building and
// would swamp the thing it is checking if it ran per round.
//
// NO ARM IS PINNED AGAINST ELISION, AND NONE NEEDS TO BE. Every write here lands on an IDL accessor
// through the browser's binding layer, not on a plain object field — the shape that made the
// retracted `{ data: '' }` measurement removable is absent by construction. The read-back is here to
// prove the value ARRIVED, not to defeat an optimiser.
// ---------------------------------------------------------------------------------------

function observe(container: HTMLElement): string {
    const inputs = container.querySelectorAll('input');
    let tail = '';
    for (let i = 0; i < inputs.length; i++) tail += '|' + (inputs[i] as HTMLInputElement).value;
    return markupOf(container) + '\n#value' + tail;
}

function gateObservation(who: string, stage: string, reference: string, got: string): void {
    if (reference === got) {
        line(`gate port-write-doors/${who} @ ${stage}: identical output — ${got.length} chars`);
        return;
    }
    let at = 0;
    while (at < reference.length && at < got.length && reference[at] === got[at]) at++;
    const from = Math.max(0, at - 80);
    refuse(
        `gate port-write-doors/${who} @ ${stage}: DIFFERENT output — ${reference.length} chars ` +
            `(reference) / ${got.length} chars (${who}), first difference at char ${at}\n` +
            `  reference: …${reference.slice(from, at + 160)}…\n` +
            `  ${who}   : …${got.slice(from, at + 160)}…`
    );
    throw new Error(
        `port-write-doors: "${who}" produces different output from the reference @ ${stage} ` +
            `(${reference.length} vs ${got.length} chars, first difference at char ${at}) — the ` +
            'timings below would be comparing different programs. If the difference is in the ' +
            'FLOOR rows only, its template string is wrong and the reference above is what it has ' +
            'to serialise to; see the floor arm’s header for where every character comes from.'
    );
}

/** Build one scene, run `rung` update passes on it, observe it, and take it down. */
function observeScene(p: Program, rung: number): string {
    const container = el();
    const scene = p.open();
    scene.build(container);
    if (rung > 0) scene.update(rung);
    const seen = observe(container);
    scene.off();
    container.remove();
    return seen;
}

// ---------------------------------------------------------------------------------------
// THE SHAPE GATES. Nothing is timed until the schemas have been shown to be what this file is written
// against.
// ---------------------------------------------------------------------------------------

function gateShapes(): string[] {
    const out: string[] = [];
    const schemas: ReadonlyArray<readonly [string, ReturnType<typeof exoDomSchemaOf>]> = [
        ['A', PLAN_A],
        ['B', PLAN_B],
    ];
    for (const [who, schema] of schemas) {
        if (schema.setters.length !== PORTS) {
            throw new Error(
                `port-write-doors: schema ${who} compiled to ${schema.setters.length} ports, not ` +
                    `${PORTS} — every program in this file writes ${PORTS}, and the ports per ` +
                    'instance are the one thing that does NOT move with the rung'
            );
        }
        // (D6) — THE CALL SITE MUST BE POLYMORPHIC. The retracted measurement's five setters were
        // five clones of one source position sharing one feedback vector, so its `setters[i](…)`
        // site was as monomorphic as a hand-written call and nothing like a real component's.
        //
        // THE BAR IS FOUR, NOT FIVE, AND THE REASON IS WHAT THE COMPILER DOES: one writer per port
        // KIND means two plain attributes — this scene's `data-id` and `title` — are the SAME
        // function object, by design. Demanding five made this axis unrunnable while the thing it
        // guards against, a monomorphic site, was nowhere near. Four distinct is V8's polymorphic
        // limit, so the site still sees as many maps as a call site can before it goes megamorphic.
        const distinct = new Set(schema.setters).size;
        if (distinct < 4) {
            throw new Error(
                `port-write-doors: schema ${who} compiled ${distinct} DISTINCT setter objects for ` +
                    `${PORTS} ports. The setters[index](node, value) call site has to be as ` +
                    "polymorphic as a real component's; under four maps it is not, and this axis " +
                    'would reproduce the exact defect that retracted its predecessor.'
            );
        }
        const shared = schema.setters.length - distinct;
        out.push(
            `  schema ${who}              ${schema.setters.length} ports, ${distinct} DISTINCT ` +
                `setter objects — the write call site is ${distinct}-way polymorphic` +
                (shared > 0
                    ? `, with ${shared} port(s) sharing a writer with another (one writer per KIND)`
                    : '')
        );
    }
    // THE TWO NUMBERINGS, SIDE BY SIDE — the whole of what this axis can OBSERVE about the `direct`
    // question, and it is free. `index` is the port's number and `elem[index]` is its node's slot;
    // if they coincide for every port, the hop this schema pays is an identity function that is
    // still executed on every write, and the arm that would price its removal cannot be built from
    // here (see THE FOURTH ARM THAT IS NOT HERE). If they differ, the table is doing real work and
    // the same conclusion holds for the same reason.
    const idxA = [PA.id.index, PA.cls.index, PA.txt.index, PA.ttl.index, PA.val.index];
    const slotA = idxA.map((i) => PLAN_A.elem[i]);
    const identity = idxA.every((i, at) => i === slotA[at]);
    out.push(
        `  numbering A           port index [${idxA.join(', ')}] → node slot [${slotA.join(
            ', '
        )}] — ${
            identity
                ? 'THE TWO NUMBERS COINCIDE for every port of this schema, so `elem[index]` is an ' +
                  'identity load that is executed anyway'
                : 'the two numbers DIFFER, so the table is resolving a real indirection'
        }`
    );
    out.push(`  schema A markup       ${PLAN_A.html}`);
    out.push(`  floor A template      ${FLOOR_A_HTML}`);
    out.push(
        '  THE TWO DIFFER ON PURPOSE — the schema carries every port’s empty placeholder and the ' +
            'floor carries only the ones a fill never writes. What has to match is the SERIALISED ' +
            'SCENE after every port is filled, and that is the observation gate below.'
    );
    return out;
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — `ssr-floor`'s, which took it from `mount-floor`. Spin until the clock moves
// and keep the SMALLEST step it ever takes.
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

function stat(xs: readonly number[]): Stat {
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
    /** Scenes per timed region. */
    readonly reps: number;
    /** What ONE scene covers — instances for the mount table, writes for the update table. */
    readonly per: number;
    readonly prep: () => Scenario;
}

/**
 * ONE TABLE'S WORTH OF SAMPLING: the per-round series for every phase, and WHERE IN THE ROUND each
 * one ran. The positions are what let a pair be split by which half went first.
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
 * THE PHASE DRIVER, AND THE DEFECT IT DOES NOT REPRODUCE — (D8).
 *
 * The shared driver several axes carry rotated the phase list on a FIXED CYCLE, forwards every
 * round, so every pair kept the same relative order for the whole run and any warm-cache or
 * allocation-order effect between two neighbours was baked into both medians identically. EVEN
 * ROUNDS RUN FORWARDS AND ODD ROUNDS BACKWARDS here. The rotation still gives every phase every
 * starting position; the DIRECTION is what stops a pair from keeping a fixed order.
 *
 * AND THE DISPUTED PAIR IS BALANCED, NOT ONLY THE NULLS. That is the defect the retracted run had:
 * mirroring a fixed order leaves some pairs never swapped, and it left the pair it was about
 * unbalanced while the pair it used as a control was balanced. Every phase of every table is in ONE
 * list here — six declarations on the mount table, twenty-four on the update table — so `set·w4` and
 * `bound·w4` are neighbours in the same rotation, and `coverage` below REFUSES any pair, null or
 * disputed, that did not get both orders.
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
 * WHAT THIS INSTRUMENT RETURNS FOR A PAIR, and it is computed the same way for a NULL (true Δ = 0)
 * and for the DISPUTED pair (true Δ unknown) — which is the point.
 *
 *   bias        |median(a) − median(b)|. On its own it is optimistic: two medians are free to
 *               cancel, and a pair that reports bias alone reads as perfection.
 *   noise       the MEDIAN of the per-round |a − b|. Both halves are sampled in the same round, so
 *               this is the round-to-round scatter ANY comparison in the table carries.
 *   order       (aFirst − bFirst) ÷ 2 — the size of the ordering effect, signed.
 *   intrinsic   (aFirst + bFirst) ÷ 2 — what is left once the ordering is balanced out.
 *
 * AN ORDERING EFFECT FLIPS SIGN WITH THE ORDER, so it lands entirely in `order` and `intrinsic`
 * collapses; two programs that really do differ keep their sign in both orders, so it lands in
 * `intrinsic` and `order` collapses. FOR A NULL, an `intrinsic` standing out of its own noise means
 * the pair is not a null and its row is not quotable. FOR THE DISPUTED PAIR, `intrinsic` IS THE
 * ANSWER and `order` is the artefact — so the disputed reading is `intrinsic`, and it is refused
 * when `|order|` exceeds it, because the reading is then a position in the round.
 */
interface Pair {
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

function pairOf(a: number[], b: number[], aPos: number[], bPos: number[]): Pair {
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

/**
 * LEAST SQUARES FOR `y = a + b·x` — used with `x = 1/R` to fit the combined ladder, where `a` is the
 * per-write asymptote and `b` the hand-out per port.
 */
function fitLine(xs: readonly number[], ys: readonly number[]): { a: number; b: number } {
    const n = xs.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
        sx += xs[i];
        sy += ys[i];
        sxx += xs[i] * xs[i];
        sxy += xs[i] * ys[i];
    }
    const denom = n * sxx - sx * sx;
    if (denom === 0) return { a: sy / n, b: 0 };
    const b = (n * sxy - sx * sy) / denom;
    return { a: (sy - b * sx) / n, b };
}

// ---------------------------------------------------------------------------------------

/**
 * HAND THE RENDERER BACK TO ITS MESSAGE LOOP, so that the console it has queued reaches the runner.
 *
 * THIS IS NOT A NICETY, IT IS WHY THE AXIS PRODUCED NOTHING THREE TIMES. `run-one-axis.js` drives
 * the page with `await page.evaluate(… mod[f](r, b))` and forwards the page's console through
 * `page.on('console', …)`. A console message is delivered over CDP from the renderer's MAIN thread,
 * so while this function is one long synchronous task the messages QUEUE and arrive only when it
 * returns — which is exactly the "it prints everything at the end" a killed run turns into nothing
 * at all. A macrotask yield lets the renderer pump that queue.
 *
 * IT IS PLACED BETWEEN TABLES AND NEVER INSIDE ONE. Yielding cannot land in or beside a timed
 * region: a `setTimeout` gives the page back to the compositor, style, GC and anything else that was
 * waiting, and a region measured on the far side of that is measured on a different machine state.
 * Between two tables that is exactly what is wanted — the next table starts from a settled page.
 *
 * PER PROCESS: three macrotasks. PER ROUND, PER REGION, PER INSTANCE, PER WRITE: nothing.
 */
const yieldToConsole = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0));

/**
 * `rounds` DEFAULTS TO 30 AND USED TO DEFAULT TO 120. See THE WALL CLOCK in the header: at 120 this
 * axis was killed three times without printing a row, and rounds buy a stabler median on an axis
 * whose verdict is a refusal either way.
 */
export async function benchmarkPortWriteDoors(rounds = 30, batch = 1): Promise<void> {
    const f4 = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    /** µs, which is the unit both null blocks are printed in so the recorder can scrape them. */
    const us = (nsValue: number): string => f6(nsValue / 1000);

    const scale = Math.max(1, Math.floor(batch));
    const mountReps = MOUNT_REPS_BASE * scale;
    const updateReps = UPDATE_REPS_BASE * scale;
    const quantum = observeTimerQuantum();

    line(
        `port-write-doors: observed timer quantum (${quantum.toFixed(
            3
        )} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    line('');
    line('THE SHAPE, AS COMPILED — checked, not assumed');
    for (const l of gateShapes()) line(l);

    line('');
    line(
        'THE OBSERVATION GATE, BEFORE ANY TIMING — one reference PER RUNG (the `set` row produces ' +
            'it), every program of that rung against it, character for character. The observation ' +
            "is the scene's markup PLUS every <input>'s live .value read back off the DOM, because " +
            'the property store is the one of the five writes the serialiser cannot show.'
    );
    const referenceOf = new Map<number, string>();
    const subject = programOf('set');
    for (const rung of RUNGS) referenceOf.set(rung, observeScene(subject, rung));
    for (const rung of RUNGS) {
        for (const p of PROGRAMS) {
            gateObservation(
                updateName(p, rung),
                'before timing',
                referenceOf.get(rung) as string,
                observeScene(p, rung)
            );
        }
    }

    // ── THE CENSUS ──────────────────────────────────────────────────────────────────────
    const mountPer = INSTANCES;
    const writesPer = (rung: number): number => INSTANCES * PORTS * rung;
    /** ns per instance that ONE tick of the clock is worth, on the mount table. */
    const mountGrain = (quantum * 1e6) / (mountReps * mountPer);
    /** ns per write that ONE tick of the clock is worth, on the update table, at this rung. */
    const writeGrain = (rung: number): number => (quantum * 1e6) / (updateReps * writesPer(rung));

    line('');
    line("CENSUS — read off this file's constants and the two packages' source, nothing measured");
    line(`  instances per scene         ${INSTANCES}`);
    line(
        `  elements per scene          ${INSTANCES * 4} (li, span, a, input) plus ${INSTANCES} ` +
            'Text nodes'
    );
    line(
        `  ports per instance          ${PORTS} — setAttribute(data-*), className=, Text .data, ` +
            'setAttribute(title), and a bare value PROPERTY store. FIVE WRITES through FOUR ' +
            'distinct setter objects — the two plain attributes share one, because the compiler ' +
            'keeps one writer per KIND; the gate above checked it and printed the sharing.'
    );
    line(`  rungs (writes per port)     ${RUNGS.map((r) => `w${r}`).join(', ')}`);
    line(
        `  scenes per timed region     mount ${mountReps} · update ${updateReps} — the two tables ` +
            'do not share a repetition factor, and the constant’s header says why'
    );
    line(
        `  writes per timed region     ${RUNGS.map(
            (r) => `w${r}: ${updateReps * writesPer(r)}`
        ).join('  ')}`
    );
    line(
        `  instances per mount region  ${mountReps * INSTANCES} (${
            mountReps * INSTANCES * 4
        } elements standing at once)`
    );
    line(
        '  per-write cost of `set`     port.index load · wiring load · null compare · setters[i] ' +
            'load · elem[i] load · nodes[…] load · one call to the setter'
    );
    line(
        '  per-write cost of `bound`   two context slot loads · one call to the setter. THE ' +
            'DIFFERENCE IN DISPUTE IS FOUR TO FIVE L1 LOADS AND ONE PREDICTABLE BRANCH.'
    );
    line(
        '  per-write cost of `floor`   one direct DOM call. ONE FRAME where both library arms ' +
            'spend two — that is the abstraction, not an asymmetry to fix.'
    );
    line(
        '  what a `set` instance keeps ONE ExoDomPorts object · what a `bound` instance keeps ' +
            'FIVE closures and the context they share'
    );
    line(
        `  THE MOUNT GRAIN             ${f4(mountGrain)} ns per instance (quantum ${quantum.toFixed(
            3
        )} ms over ${mountReps} scene(s) of ${INSTANCES}); ${MIN_GRAINS} grains is ${f4(
            MIN_GRAINS * mountGrain
        )} ns per instance`
    );
    line(
        `  THE WRITE GRAIN             ${RUNGS.map((r) => `w${r}: ${f4(writeGrain(r))}`).join(
            '  '
        )} ns per write`
    );
    line(
        `  ${MIN_GRAINS} GRAINS                    ${RUNGS.map(
            (r) => `w${r}: ${f4(MIN_GRAINS * writeGrain(r))}`
        ).join('  ')} ns per write — AND THE DISPUTED QUANTITY IS OF ORDER 0.5 ns. NO RUNG ON ` +
            'THIS LADDER CAN EXPRESS IT: a per-write median is a multiple of its grain, and no ' +
            'number of rounds makes a quantised sample finer. A FOURTH RUNG, w64, USED TO PUT ' +
            'FOUR GRAINS AT 0.417 ns — the one bar here that ever sat under the disputed ' +
            'quantity — and it was removed for wall clock; see the RUNGS constant for what that ' +
            'cost. So the crossing from "the clock cannot express this" to "the noise cannot ' +
            'separate it" is off the end of this ladder, and the grain is what refuses at every ' +
            'rung below.'
    );
    line(
        '  THE QUOTING RULE            a difference must clear BOTH its own two rows’ resolution ' +
            `AND ${MIN_GRAINS} grains. On this ladder the GRAIN is the binding bar at every rung; ` +
            'the resolution took over only at the removed top rung.'
    );

    // ── THE MOUNT TABLE ─────────────────────────────────────────────────────────────────
    //
    // BUILDING N INSTANCES, WIRING THEM, AND FILLING EVERY PORT ONCE. The handle array is allocated
    // in `prep()` — untimed, and in all three arms (D3) — and the instances are all built into it
    // before anything is read, which is (D4): they are RETAINED, not born and killed one at a time.
    const mountPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: mountReps,
        per: mountPer,
        prep: (): Scenario => {
            const container = el();
            const scene = p.open();
            return {
                measure: () => {
                    scene.build(container);
                },
                cleanup: () => {
                    scene.off();
                    container.remove();
                },
            };
        },
    }));

    // THE GATES AND THE CENSUS GO OUT BEFORE THE FIRST TIMED REGION. A run that dies in the mount
    // table then still says whether the schema compiled five distinct setters and whether all six
    // programs write the same bytes, which is the part that decides whether any figure may be read.
    await yieldToConsole();

    const mountSeries = runPhases(mountPhases, rounds);
    /** ns per INSTANCE, per round. */
    const mountNs = new Map<string, number[]>();
    for (const p of mountPhases) {
        const raw = mountSeries.times.get(p.name) as number[];
        mountNs.set(
            p.name,
            raw.map((ms) => (ms * 1e6) / p.per)
        );
    }
    const mountStats = new Map<string, Stat>();
    for (const p of mountPhases) mountStats.set(p.name, stat(mountNs.get(p.name) as number[]));
    const mountAt = (name: string): number => (mountStats.get(name) as Stat).median;

    line('');
    line(
        `MOUNT — building one scene of ${INSTANCES} instances, wiring it and filling every port ` +
            `once [ns per INSTANCE] · interleaved, direction alternating · ${rounds} rounds · ` +
            `batch ${batch} · ${mountReps} scene(s) per timed region (${
                mountReps * INSTANCES
            } instances standing) · GC before every timed region`
    );
    line('                      reps   min       p25       median    p75       max');
    for (const p of mountPhases) {
        const s = mountStats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(18)}${String(p.reps).padStart(6)}   ${f4(s.min)}   ${f4(s.p25)}   ` +
                `${f4(s.median)}   ${f4(s.p75)}   ${f4(s.max)}`
        );
    }
    line('');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(18)} ${p.what}`);

    emitRecordedRows(
        'mount',
        'ns',
        'instance',
        mountPhases.map((p) => [p.name, mountStats.get(p.name) as Stat] as const)
    );

    // THE FIRST NUMBER LEAVES THE PAGE HERE, AND THAT IS THE HALF OF THE FIX THAT IS NOT A CUT.
    // Everything above — the shape gate, the observation gate, the census and the whole MOUNT
    // table, which is the half of this axis that can answer its question — is now flushed to the
    // runner before the update ladder, the long thing, has started. A run killed in the ladder
    // still delivers the mount table. `yieldToConsole` says why the console needs asking.
    await yieldToConsole();

    // ── THE UPDATE TABLE ────────────────────────────────────────────────────────────────
    //
    // THE SCENE IS BUILT BY `prep()`, UNTIMED, AND IS STILL MOUNTED, STILL IN THE DOCUMENT AND STILL
    // REFERENCED WHEN THE CLOCK STARTS. That is (D4) and it is the whole reason the closure arm here
    // pays what a page pays: its five closures per instance have survived a scavenge, been reachable
    // from a live array across a GC, and are being called from a loop that touches three thousand of
    // them in turn rather than the same five over and over in L1.
    interface UpdateRow {
        readonly program: Program;
        readonly rung: number;
        readonly name: string;
    }
    const updateRows: UpdateRow[] = [];
    for (const rung of RUNGS) {
        for (const p of PROGRAMS) updateRows.push({ program: p, rung, name: updateName(p, rung) });
    }

    const updatePhases: readonly Phase[] = updateRows.map((row) => ({
        name: row.name,
        reps: updateReps,
        per: writesPer(row.rung),
        prep: (): Scenario => {
            const container = el();
            const scene = row.program.open();
            scene.build(container);
            const rung = row.rung;
            return {
                measure: () => {
                    scene.update(rung);
                },
                cleanup: () => {
                    scene.off();
                    container.remove();
                },
            };
        },
    }));

    const updateSeries = runPhases(updatePhases, rounds);
    /** ns per WRITE, per round. */
    const updateNs = new Map<string, number[]>();
    for (const p of updatePhases) {
        const raw = updateSeries.times.get(p.name) as number[];
        updateNs.set(
            p.name,
            raw.map((ms) => (ms * 1e6) / p.per)
        );
    }
    const updateStats = new Map<string, Stat>();
    for (const p of updatePhases) updateStats.set(p.name, stat(updateNs.get(p.name) as number[]));
    const updateAt = (name: string): number => (updateStats.get(name) as Stat).median;

    line('');
    line(
        `UPDATE — writing already-mounted, still-live instances again [ns per WRITE] · ` +
            `interleaved, direction alternating · ${rounds} rounds · batch ${batch} · ` +
            `${updateReps} scene(s) per timed region · GC before every timed region. THE SCENE IS BUILT ` +
            'BY AN UNTIMED prep() AND IS RETAINED ACROSS THE WHOLE REGION.'
    );
    line(
        '                        reps   min       p25       median    p75       max      writes/region'
    );
    for (const p of updatePhases) {
        const s = updateStats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(22)}${String(p.reps).padStart(6)}   ${f4(s.min)}   ${f4(s.p25)}   ` +
                `${f4(s.median)}   ${f4(s.p75)}   ${f4(s.max)}   ${p.reps * p.per}`
        );
    }

    emitRecordedRows(
        'update',
        'ns',
        'write',
        updatePhases.map((p) => [p.name, updateStats.get(p.name) as Stat] as const)
    );

    // THE SECOND TABLE GOES OUT BEFORE THE CLOSING GATE AND THE VERDICTS, for the reason the first
    // one did: everything below this line is arithmetic over rows that already exist, and a reader
    // who has both tables can redo it by hand if the run is cut short.
    await yieldToConsole();

    // ── THE OBSERVATION GATE, AGAIN ─────────────────────────────────────────────────────
    line('');
    line(
        'THE OBSERVATION GATE, AFTER THE UPDATE ROUNDS — the same comparison a second time. A ' +
            'program that drifted under load, or a setter table that moved, changes the page, and ' +
            'a gate that only ran before the clock started could not see it.'
    );
    for (const rung of RUNGS) {
        for (const p of PROGRAMS) {
            gateObservation(
                updateName(p, rung),
                'after the rounds',
                referenceOf.get(rung) as string,
                observeScene(p, rung)
            );
        }
    }

    // ── THE NULLS, MOUNT ────────────────────────────────────────────────────────────────
    const mountNull = new Map<Arm, Pair>();
    for (const arm of ARMS) {
        const a = arm;
        const b = `${arm}·twin`;
        mountNull.set(
            arm,
            pairOf(
                mountNs.get(a) as number[],
                mountNs.get(b) as number[],
                mountSeries.position.get(a) as number[],
                mountSeries.position.get(b) as number[]
            )
        );
    }
    const mountRes = (arm: Arm): number => (mountNull.get(arm) as Pair).resolution;

    line('');
    line(
        'NULLS (MOUNT) — three pairs, each a separately declared copy of its program [µs/instance]'
    );
    line(
        '  null            bias      noise     p75       worst     ' +
            'order     intrinsic  what it is'
    );
    let mountWorst = 0;
    for (const arm of ARMS) {
        const v = mountNull.get(arm) as Pair;
        if (v.resolution > mountWorst) mountWorst = v.resolution;
        line(
            `  ${arm.padEnd(14)}${us(v.bias)}  ${us(v.noise)}  ${us(v.noiseP75)}  ` +
                `${us(v.worst)}  ${us(v.order).padStart(9)} ${us(v.intrinsic).padStart(9)}  ` +
                `|${arm} − ${arm}·twin| µs/instance, true Δ = 0 (this pair's resolution ` +
                `${f4(v.resolution)} ns/instance; Δ when it ran first ${f4(v.aFirst)} over ` +
                `${v.aFirstRounds} rounds, when the twin ran first ${f4(v.bFirst)} over ` +
                `${v.bFirstRounds}; ONE MOUNT GRAIN IS ${f6(mountGrain / 1000)} µs/instance)`
        );
    }
    line(
        `  RESOLUTION FLOOR      ${us(mountWorst)} µs — THE COARSEST OF THE THREE, printed for ` +
            'the recorder. NO VERDICT BELOW USES IT: every quantity is judged against the ' +
            'resolutions of ITS OWN rows, which are on the lines above.'
    );

    // ── THE NULLS, UPDATE ───────────────────────────────────────────────────────────────
    const updateNull = new Map<string, Pair>();
    for (const rung of RUNGS) {
        for (const arm of ARMS) {
            const a = `${arm}·w${rung}`;
            const b = `${arm}·w${rung}·twin`;
            updateNull.set(
                a,
                pairOf(
                    updateNs.get(a) as number[],
                    updateNs.get(b) as number[],
                    updateSeries.position.get(a) as number[],
                    updateSeries.position.get(b) as number[]
                )
            );
        }
    }
    const updateRes = (name: string): number => (updateNull.get(name) as Pair).resolution;

    line('');
    line('NULLS (UPDATE) — twelve pairs, one per arm per rung [µs/write]');
    line(
        '  null            bias      noise     p75       worst     ' +
            'order     intrinsic  what it is'
    );
    let updateWorst = 0;
    for (const rung of RUNGS) {
        for (const arm of ARMS) {
            const name = `${arm}·w${rung}`;
            const v = updateNull.get(name) as Pair;
            if (v.resolution > updateWorst) updateWorst = v.resolution;
            line(
                `  ${name.padEnd(14)}${us(v.bias)}  ${us(v.noise)}  ${us(v.noiseP75)}  ` +
                    `${us(v.worst)}  ${us(v.order).padStart(9)} ${us(v.intrinsic).padStart(9)}  ` +
                    `|${name} − its twin| µs/write, true Δ = 0 (this pair's resolution ` +
                    `${f4(v.resolution)} ns/write = ${(
                        (v.resolution / updateAt(name)) *
                        100
                    ).toFixed(2)}% of the row; ONE WRITE GRAIN IS ${f4(
                        writeGrain(rung)
                    )} ns/write, so the resolution is ${(v.resolution / writeGrain(rung)).toFixed(
                        1
                    )} grains — ${
                        v.resolution < MIN_GRAINS * writeGrain(rung)
                            ? 'THE CLOCK IS THE BINDING BAR AT THIS RUNG, not the noise'
                            : 'THE NOISE IS THE BINDING BAR AT THIS RUNG, not the clock'
                    })`
            );
        }
    }
    line(
        `  RESOLUTION FLOOR      ${us(updateWorst)} µs — THE COARSEST OF THE TWELVE, printed for ` +
            'the recorder and used by NO verdict below.'
    );

    // ── THE ORDER SPLIT, AND THE COVERAGE GATE ──────────────────────────────────────────
    line('');
    line(
        'THE ORDER SPLIT — is a pair measuring two programs, or measuring which of them ran first? ' +
            'THE DISPUTED PAIRS ARE IN THIS BLOCK TOO, and that is the defect the retracted run ' +
            'had: it balanced its control and left the pair it was about unbalanced.'
    );
    const notNull: string[] = [];
    const uncovered: string[] = [];
    const splitLine = (name: string, v: Pair, isNull: boolean, unit: string): void => {
        const intr = Math.abs(v.intrinsic);
        const ord = Math.abs(v.order);
        const total = v.aFirstRounds + v.bFirstRounds;
        const thinner = Math.min(v.aFirstRounds, v.bFirstRounds);
        if (total > 0 && thinner / total < 0.25) uncovered.push(name);
        let word: string;
        if (isNull && intr > v.noise) {
            notNull.push(name);
            word =
                'INTRINSIC — the two declarations differ in a way that does NOT flip with the ' +
                `order, so this pair is not a null and every figure printed for "${name}" is ` +
                'suspect';
        } else if (ord > v.noise) {
            word =
                'ORDERING — what the pair separates flips sign with which of the two ran first, ' +
                'so it is the position in the round and not the program; the alternating ' +
                'direction is what averages it out of the medians';
        } else {
            word =
                "NEITHER stands out of this pair's own noise" +
                (isNull ? ' — the pair is a null and the instrument has nothing to confess' : '');
        }
        line(
            `  ${name.padEnd(22)}order ${f4(ord)} · intrinsic ${f4(intr)} · noise ` +
                `${f4(v.noise)} ${unit} · orders ${v.aFirstRounds}/${v.bFirstRounds} — ${word}`
        );
    };

    for (const arm of ARMS) splitLine(arm, mountNull.get(arm) as Pair, true, 'ns/instance');
    for (const rung of RUNGS) {
        for (const arm of ARMS) {
            const name = `${arm}·w${rung}`;
            splitLine(name, updateNull.get(name) as Pair, true, 'ns/write');
        }
    }

    /** THE DISPUTED PAIRS — `set` against `bound`, balanced the same way and split the same way. */
    const disputedMount = pairOf(
        mountNs.get('set') as number[],
        mountNs.get('bound') as number[],
        mountSeries.position.get('set') as number[],
        mountSeries.position.get('bound') as number[]
    );
    splitLine('DISPUTED mount', disputedMount, false, 'ns/instance');
    const disputedUpdate = new Map<number, Pair>();
    for (const rung of RUNGS) {
        const v = pairOf(
            updateNs.get(`set·w${rung}`) as number[],
            updateNs.get(`bound·w${rung}`) as number[],
            updateSeries.position.get(`set·w${rung}`) as number[],
            updateSeries.position.get(`bound·w${rung}`) as number[]
        );
        disputedUpdate.set(rung, v);
        splitLine(`DISPUTED w${rung}`, v, false, 'ns/write');
    }

    if (notNull.length > 0) {
        refuse(
            `port-write-doors: ${notNull.length} null pair(s) came back INTRINSIC — ` +
                `${notNull.join(', ')}. Two declarations of one program that differ in a way ` +
                'which does not flip with the running order are two different programs, so those ' +
                'rows are not quotable and every quantity computed from them inherits it. The ' +
                'first thing to check is that the twin is a true transcription: its own declaration, ' +
                'its own schema, its own template, its own pools, nothing shared with the subject.'
        );
    }
    if (uncovered.length > 0) {
        refuse(
            `port-write-doors: ${uncovered.length} pair(s) got fewer than a quarter of their ` +
                `rounds in one of the two running orders — ${uncovered.join(', ')}. THIS IS THE ` +
                'EXACT DEFECT THAT UNBALANCED THE RETRACTED RUN: an ordering effect cannot be ' +
                'split out of a pair that never swapped, so `order` and `intrinsic` are not ' +
                'separable for those pairs and neither number may be read. Raise `rounds` — the ' +
                'rotation needs at least one full cycle of both directions per pair.'
        );
    }

    // ── THE MOUNT VERDICT: WHAT THE HAND-OUT COSTS ──────────────────────────────────────
    const judge = (
        label: string,
        delta: number,
        resolution: number,
        grain: number,
        unit: string,
        note: string
    ): boolean => {
        const g = Math.round(Math.abs(delta) / grain);
        const ok = Math.abs(delta) > resolution && g >= MIN_GRAINS;
        line(
            `  ${label.padEnd(26)}${sign(delta)} ${unit}  ${String(g).padStart(6)} grains  ` +
                `own resolution ${f4(resolution)}  ${
                    ok
                        ? 'RESOLVED — quotable as a size'
                        : Math.abs(delta) <= resolution
                        ? 'NOT RESOLVED — inside its own two rows’ resolution'
                        : `NOT RESOLVED — under ${MIN_GRAINS} grains`
                }  ${note}`
        );
        return ok;
    };

    line('');
    line(
        'THE HAND-OUT — what a mount pays for the ability to write a port later. Both library arms ' +
            'fill with the IDENTICAL five c.set calls, so this difference is the hand-out and ' +
            'nothing else.'
    );
    // THE READING IS THE ORDER-BALANCED HALF, exactly as the update verdict's is. `disputedMount`
    // is `pairOf(set, bound)`, so its `intrinsic` is `set − bound` and the hand-out is its negation;
    // the raw median difference is printed beside it so a reader can see how much of it was
    // position in the round.
    const handOutRaw = mountAt('bound') - mountAt('set');
    const handOut = -disputedMount.intrinsic;
    const handOutRes = Math.max(mountRes('set'), mountRes('bound'));
    const handOutResolved =
        judge(
            'bound − set (mount)',
            handOut,
            handOutRes,
            mountGrain,
            'ns/inst',
            `= ${f4(handOut / PORTS)} ns per PORT — five closures and their context against one ` +
                `ExoDomPorts object · raw median Δ ${sign(handOutRaw)} · order ${f4(
                    disputedMount.order
                )}`
        ) && Math.abs(disputedMount.order) <= Math.abs(disputedMount.intrinsic);
    if (!handOutResolved && Math.abs(disputedMount.order) > Math.abs(disputedMount.intrinsic)) {
        refuse(
            'port-write-doors: the mount hand-out gap is dominated by its ORDERING half ' +
                `(${f4(disputedMount.order)} ns/instance against ${f4(
                    disputedMount.intrinsic
                )} surviving the balance), so it is where the pair sat in the round and not a ` +
                'size. It is not quoted, and (P3) is judged against the balanced half.'
        );
    }
    judge(
        'set − floor (mount)',
        mountAt('set') - mountAt('floor'),
        Math.max(mountRes('set'), mountRes('floor')),
        mountGrain,
        'ns/inst',
        'everything the library does that a clone-and-walk does not; NOT this axis’s claim'
    );
    judge(
        'bound − floor (mount)',
        mountAt('bound') - mountAt('floor'),
        Math.max(mountRes('bound'), mountRes('floor')),
        mountGrain,
        'ns/inst',
        'the same, plus the hand-out'
    );

    // ── THE UPDATE VERDICT: THE DISPUTED QUANTITY ───────────────────────────────────────
    line('');
    line(
        'THE DISPUTED QUANTITY — `set` against `bound`, per write, at each rung. THE READING IS ' +
            '`intrinsic` (the order-balanced half), and the raw median difference is printed ' +
            'beside it so a reader can see how much of it was position in the round.'
    );
    let anyRungResolved = false;
    for (const rung of RUNGS) {
        const a = `set·w${rung}`;
        const b = `bound·w${rung}`;
        const v = disputedUpdate.get(rung) as Pair;
        const res = Math.max(updateRes(a), updateRes(b));
        const raw = updateAt(a) - updateAt(b);
        const ok = judge(
            `set − bound (w${rung})`,
            v.intrinsic,
            res,
            writeGrain(rung),
            'ns/write',
            `raw median Δ ${sign(raw)} · order ${f4(v.order)} · rows ${f4(updateAt(a))} / ` +
                `${f4(updateAt(b))} ns/write · the gap is ${(
                    (Math.abs(v.intrinsic) / updateAt(a)) *
                    100
                ).toFixed(3)}% of the row`
        );
        if (ok && Math.abs(v.order) <= Math.abs(v.intrinsic)) anyRungResolved = true;
        else if (ok) {
            refuse(
                `port-write-doors: the w${rung} gap cleared its resolution but its ORDERING half ` +
                    `(${f4(v.order)} ns/write) is larger than what survived balancing ` +
                    `(${f4(v.intrinsic)}). The reading is dominated by where the pair sat in the ` +
                    'round, so it is not a size and it is not quoted.'
            );
        }
    }

    line('');
    line(
        'THE FLOOR GAP — one call frame, plus the stringify and the `=== true` test on three ports'
    );
    for (const rung of RUNGS) {
        judge(
            `set − floor (w${rung})`,
            updateAt(`set·w${rung}`) - updateAt(`floor·w${rung}`),
            Math.max(updateRes(`set·w${rung}`), updateRes(`floor·w${rung}`)),
            writeGrain(rung),
            'ns/write',
            'the shipped door over a straight-line program'
        );
        judge(
            `bound − floor (w${rung})`,
            updateAt(`bound·w${rung}`) - updateAt(`floor·w${rung}`),
            Math.max(updateRes(`bound·w${rung}`), updateRes(`floor·w${rung}`)),
            writeGrain(rung),
            'ns/write',
            'a closure over a straight-line program'
        );
    }

    // ── THE LADDER, FITTED ──────────────────────────────────────────────────────────────
    line('');
    line(
        'THE COMBINED LADDER — mount and update joined by ARITHMETIC and never by a shared timed ' +
            'region. combined(R) = update ns/write + (mount ns/instance) / (PORTS × R), which is ' +
            '`a + b/R` with `a` the per-write cost and `b` the hand-out per port.'
    );
    line(
        '  arm      ' + RUNGS.map((r) => `w${r}`.padStart(10)).join('') + '     fit a       fit b'
    );
    const asymptote = new Map<Arm, number>();
    const combinedOf = (arm: Arm, rung: number): number =>
        updateAt(`${arm}·w${rung}`) + mountAt(arm) / (PORTS * rung);
    for (const arm of ARMS) {
        const xs = RUNGS.map((r) => 1 / r);
        const ys = RUNGS.map((r) => combinedOf(arm, r));
        const { a, b } = fitLine(xs, ys);
        asymptote.set(arm, a);
        line(
            `  ${arm.padEnd(9)}${ys.map((y) => f4(y).padStart(10)).join('')}     ${f4(a)}   ${f4(
                b
            )}`
        );
    }
    line(
        '  `a` is ns per write once the hand-out has amortised away; `b` is ns per write at R = 1 ' +
            'that the hand-out contributes, i.e. the hand-out per port.'
    );

    line('');
    line(
        'THE TWO ENDS’ DISAGREEMENT — the asymptote solved from EVERY PAIR of rungs separately, ' +
            'rather than reading the top rung as if it had converged. A ladder whose pairwise ' +
            'solutions do not agree has not converged, whatever its top rung says.'
    );
    for (const arm of ARMS) {
        const solutions: number[] = [];
        const parts: string[] = [];
        for (let i = 0; i < RUNGS.length; i++) {
            for (let j = i + 1; j < RUNGS.length; j++) {
                const lo = RUNGS[i];
                const hi = RUNGS[j];
                const cLo = combinedOf(arm, lo);
                const cHi = combinedOf(arm, hi);
                // TWO RUNGS, TWO UNKNOWNS. With `u = 1/lo` and `v = 1/hi`, the model is
                // `cLo = a + b·u` and `cHi = a + b·v`; eliminating `b` gives
                // `a = (cLo·v − cHi·u) / (v − u)`, which is this line with `v = 1/hi`.
                const u = 1 / lo;
                const v = 1 / hi;
                const aSol = (cLo * v - cHi * u) / (v - u);
                solutions.push(aSol);
                parts.push(`w${lo}·w${hi} ${f4(aSol)}`);
            }
        }
        const spread = Math.max(...solutions) - Math.min(...solutions);
        line(
            `  ${arm.padEnd(9)}${parts.join(' · ')} — spread ${f4(spread)} ns/write against a ` +
                `least-squares asymptote of ${f4(asymptote.get(arm) as number)} and a top-rung ` +
                `reading of ${f4(combinedOf(arm, RUNGS[RUNGS.length - 1]))}`
        );
    }

    // ── THE CROSSOVER, AND WHY IT IS PRINTED WITH A CONDITION ON IT ─────────────────────
    line('');
    line(
        'THE CROSSOVER — the writes per port above which `bound` would be the cheaper of the two, ' +
            'IF both of its inputs were resolved. It is a QUOTIENT of two differences, so it ' +
            'inherits both of their resolutions and it is printed with a verdict, never alone.'
    );
    {
        const perWrite = (disputedUpdate.get(RUNGS[RUNGS.length - 1]) as Pair).intrinsic;
        const perPort = handOut / PORTS;
        const crossover = perWrite === 0 ? Infinity : perPort / perWrite;
        const usable = handOutResolved && anyRungResolved && perWrite > 0;
        line(
            `  hand-out per port  ${f4(perPort)} ns  ·  per-write saving (set − bound, at w${
                RUNGS[RUNGS.length - 1]
            })  ${f4(perWrite)} ns  ·  crossover ${
                Number.isFinite(crossover) ? crossover.toFixed(1) : '∞'
            } writes per port`
        );
        if (usable) {
            line(
                '  BOTH INPUTS RESOLVED — the quotient may be read, and it is the volume above ' +
                    'which a bound writer pays for itself on this shape.'
            );
        } else {
            refuse(
                'port-write-doors: THE CROSSOVER IS NOT A NUMBER THIS RUN MAY QUOTE. ' +
                    `The hand-out ${handOutResolved ? 'resolved' : 'did NOT resolve'} and the ` +
                    `per-write saving ${anyRungResolved ? 'resolved' : 'did NOT resolve'} at any ` +
                    'rung. A quotient of two differences is only as good as its denominator, and ' +
                    'a denominator inside its own noise makes the quotient anything at all. THIS ' +
                    'IS THE PREDICTED OUTCOME — see (P5) — and it is the axis’s answer, not its ' +
                    'failure: on a real DOM the per-write term is under one percent of the write ' +
                    'it rides on, and no number of rounds changes that.'
            );
        }
    }

    // ── THE SECOND NUMBERING — A SEPARATE QUESTION, ANSWERED BY A BOUND ─────────────────
    //
    // KEPT APART FROM EVERYTHING ABOVE ON PURPOSE. `set ↔ bound` asks where the node is kept; this
    // asks what the second numbering costs. They are not one verdict.
    line('');
    line(
        'THE SECOND NUMBERING — what would it cost to number ports and node slots the same, so ' +
            'that `elem` disappeared and every write lost one array load?'
    );
    line(
        '  THERE IS NO `direct` ROW, AND THAT IS A REFUSAL RATHER THAN AN OMISSION. The only ' +
            'post-wire door on this backend is ExoDomPorts.set, whose body carries the hop and is ' +
            'not replaceable from outside the package; portNodeWriter’s closure is the same line; ' +
            'and a plugin replacing fillDoors() would hand back a holder whose body the MEASURER wrote. ' +
            'Making the two numbers coincide does not help either — the load still executes and ' +
            'returns the index. Building the arm honestly takes a change in @exodra/dom, and this ' +
            'axis may not make one. See THE FOURTH ARM THAT IS NOT HERE in the header.'
    );
    {
        // THE BOUND. `bound` removes SIX terms that `set` pays and adds two context loads back;
        // `direct` would remove exactly ONE of those six. So the measured `set ↔ bound` gap bounds
        // the unmeasured `set ↔ direct` gap from above, and an unresolvable whole cannot contain a
        // resolvable part.
        const widest = Math.max(
            ...RUNGS.map((r) => Math.abs((disputedUpdate.get(r) as Pair).intrinsic))
        );
        const widestRes = Math.max(
            ...RUNGS.map((r) => Math.max(updateRes(`set·w${r}`), updateRes(`bound·w${r}`)))
        );
        const rowNs = updateAt(`set·w${RUNGS[RUNGS.length - 1]}`);
        line(
            `  THE BOUND THIS RUN PUTS ON IT: removing SIX per-write terms (set − bound) moved at ` +
                `most ${f4(widest)} ns per write across the ${RUNGS.length} rungs, against those ` +
                `rows' own ` +
                `resolution of ${f4(widestRes)} ns and a row of ${f4(rowNs)} ns. Removing ONE of ` +
                'those six — which is all the single numbering would do — is a strict sub-part of ' +
                'that.'
        );
        if (!anyRungResolved) {
            line(
                '  SO THE ANSWER IS: UNMEASURABLE ON A REAL DOM, AND THAT IS PUBLISHABLE. A ' +
                    'difference that is a strict sub-part of one this instrument already could not ' +
                    'resolve cannot itself be resolved here. The two-numbering design costs nothing ' +
                    'this axis can see against a write that crosses into the browser, and the ' +
                    'question is closed by a bound rather than left to taste. WHAT IT DOES NOT SAY: ' +
                    'that the load is free in absolute terms, or that it is free on a backend whose ' +
                    'write is not a browser crossing.'
            );
        } else {
            refuse(
                'port-write-doors: the set ↔ bound pair RESOLVED at a rung, so the bound above is ' +
                    'no longer vacuous and the second numbering becomes a question worth an arm — ' +
                    'which cannot be built from this package. The next step is not another axis ' +
                    'here: it is the numbering change and the door in @exodra/dom, measured with ' +
                    'both doors shipped.'
            );
        }
    }

    // ── THE FALSIFIERS, PRINTED MECHANICALLY ────────────────────────────────────────────
    line('');
    line(
        'THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the programs existed'
    );
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);

    line(
        '   ⊘ (P0) NOT A PREDICTION — this axis commits to no direction for set−bound at any ' +
            'single rung. The four values are printed above and are not verdicts.'
    );

    {
        const parts: string[] = [];
        let within = true;
        for (const rung of RUNGS) {
            const row = updateAt(`set·w${rung}`);
            const gap = Math.abs((disputedUpdate.get(rung) as Pair).intrinsic);
            const pct = (gap / row) * 100;
            if (pct >= 3) within = false;
            parts.push(`w${rung} ${pct.toFixed(3)}%`);
        }
        verdict(
            '(P1)',
            within,
            '|set − bound| is under 3% of the row at every rung',
            parts.join(', ')
        );
    }
    {
        const parts: string[] = [];
        let flat = true;
        for (const p of PROGRAMS) {
            const values = RUNGS.map((r) => updateAt(updateName(p, r)));
            const span = Math.max(...values) - Math.min(...values);
            // THE PAIR'S RESOLUTION, WHICHEVER HALF OF IT THIS ROW IS. A null pair is keyed on its
            // subject's name, and a resolution belongs to the PAIR rather than to one of its halves
            // — so a twin is judged against the same figure its subject is.
            const coarsest = Math.max(...RUNGS.map((r) => updateRes(`${p.arm}·w${r}`)));
            if (span > coarsest) flat = false;
            parts.push(`${p.name} span ${f4(span)} vs res ${f4(coarsest)}`);
        }
        verdict(
            '(P2)',
            flat,
            "each declaration's four per-write medians span less than its own coarsest resolution",
            parts.join(' · ')
        );
    }
    verdict(
        '(P3)',
        handOut > 0 && handOutResolved,
        "the bound hand-out is dearer than set's and clears both mount rows' resolution",
        `bound ${f4(mountAt('bound'))} against set ${f4(mountAt('set'))} ns/instance, difference ` +
            `${sign(handOut)} (resolution ${f4(handOutRes)}, ${Math.round(
                Math.abs(handOut) / mountGrain
            )} grains)`
    );
    {
        const parts: string[] = [];
        let ok = true;
        for (const rung of RUNGS) {
            const fl = updateAt(`floor·w${rung}`);
            const s = updateAt(`set·w${rung}`) - fl;
            const b = updateAt(`bound·w${rung}`) - fl;
            if (!(s >= 1 && s <= 15 && b >= 1 && b <= 15)) ok = false;
            parts.push(`w${rung} set+${f4(s)} bound+${f4(b)}`);
        }
        verdict(
            '(P4)',
            ok,
            'both library arms are 1-15 ns per write above the floor at every rung',
            parts.join(', ')
        );
    }
    verdict(
        '(P5)',
        !anyRungResolved,
        'the axis REFUSES its own subject — |set − bound| clears its own two rows’ resolution at ' +
            'no rung',
        anyRungResolved
            ? 'it RESOLVED at least one rung. Before quoting it, check the twin is a separate ' +
                  'declaration and not two names for one program — this would be the tightest null ' +
                  'pair on the DOM this suite has published.'
            : 'no rung resolved, which is what the header’s arithmetic said would happen'
    );
    verdict(
        '(P6)',
        notNull.length === 0,
        'all fifteen null pairs are ordering or nothing',
        notNull.length === 0
            ? 'fifteen of fifteen inside their own noise'
            : `${notNull.length} INTRINSIC — ${notNull.join(', ')}`
    );

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    const clockFloor = MIN_TICKS * quantum;
    const checkClock = (name: string, medianNs: number, per: number, atReps: number): void => {
        const region = ((medianNs * per) / 1e6) * atReps;
        if (region >= clockFloor) return;
        const factor = region > 0 ? clockFloor / region : Infinity;
        const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
        refuse(
            `port-write-doors: the "${name}" timed region is ${region.toFixed(3)} ms — ` +
                `${(region / quantum).toFixed(1)}× the observed quantum (${quantum.toFixed(
                    3
                )} ms), under the ${MIN_TICKS}× floor. Its digits are quantisation, not ` +
                `measurement. Re-run with batch ${wantBatch}: \`npm run axis ` +
                `--workspace=@exodra/benchmarks -- port-write-doors ${rounds} ${wantBatch}\``
        );
    };
    for (const p of mountPhases) checkClock(p.name, mountAt(p.name), p.per, p.reps);
    for (const p of updatePhases) checkClock(p.name, updateAt(p.name), p.per, p.reps);

    if (!anyRungResolved) {
        refuse(
            'port-write-doors: THE SUBJECT IS UNRESOLVED AT EVERY RUNG, AND THAT IS THE ANSWER ' +
                'THIS AXIS WAS BUILT TO GIVE HONESTLY. The disputed quantity is four to five L1 ' +
                'loads and one branch; every write it rides on crosses into the browser’s binding ' +
                'layer. The gaps above are a fraction of a percent of their rows and the rows’ own ' +
                'null pairs are wider than that. ' +
                'AND THE CLOCK REFUSES THE LOW RUNGS BEFORE THE NOISE EVEN GETS A TURN: a grain is ' +
                `${f4(writeGrain(RUNGS[0]))} ns per write at w${RUNGS[0]} and ${f4(
                    writeGrain(RUNGS[RUNGS.length - 1])
                )} at w${RUNGS[RUNGS.length - 1]}, so a per-write median is a multiple of ` +
                'something larger than the answer AT EVERY RUNG OF THIS LADDER. The rung where ' +
                'four grains fell under the disputed quantity was w64, and it was removed for wall ' +
                'clock — see the RUNGS constant, which states exactly what that cost. ' +
                'THE ESCALATION IS `batch`, NOT `rounds`: more rounds make a quantised sample no ' +
                'finer and do not reduce the median of the per-round difference either, while four ' +
                'scenes per region quarter the grain and buy roughly half the noise: ' +
                `\`npm run axis --workspace=@exodra/benchmarks -- ` +
                `port-write-doors ${rounds} ${batch * 4}\`. DO NOT EXPECT IT TO SETTLE THE ` +
                'QUESTION. An effect under one percent of a real DOM write is unobservable in a ' +
                'page even with a known sign, and the useful reading of this run is the MOUNT ' +
                'table: if the hand-out is dear and the per-write saving is unmeasurable, the ' +
                'bound form is a cost with no proven benefit, and that verdict does not need this ' +
                'pair to resolve.'
        );
    }
}
