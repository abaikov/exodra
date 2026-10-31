import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachine } from '@exodra/core';
// DIAGNOSTIC — NINE WAYS TO REACH A PORT AND WRITE IT, PRICED HEAD ON, AGAINST A FLOOR.
//
// It answers ONE question about ONE backend — `@exodra/string`, rendering 1000 rows of one
// component — and it compares no frameworks. It is registered as an axis only so it can reuse the
// runner that already starts Vite, drives headless Chromium and forwards the browser's console.
//
// ═══ THE QUESTION, AND THE TEN PROGRAMS THAT ARE THE WHOLE FILE ══════════════════════════════
//
// A wire has a value and a port and has to put the first where the second says. There are nine
// spellings of the door it goes through, and they differ in WHERE THE PORT'S ADDRESS IS CARRIED
// and in HOW THE THING CARRYING IT WAS ALLOCATED:
//
//   walk       THE ADDRESS IS RESOLVED ON EVERY WRITE, out of the port and two arrays. This is the
//              SHIPPED path and not a transcription of it: `c.attr(port, value)` is
//              `TExoStrNode.attr`, whose body is
//                  const index = port.index;
//                  this.values[index] = this.writers[index](value);
//              Nothing per port, nothing per instance, three loads and two array loads per write.
//
//   prototype  THE ADDRESS IS IN THE RECEIVER AND THE METHOD EXISTS ONCE IN THE PROCESS. One
//              object per port per instance, taking a module-level object as its prototype:
//                  const w = { __proto__: EXO_STR_DOOR_A, slots, write, at };
//                  w.set(value);
//              and `EXO_STR_DOOR_A.set` is `this.slots[this.at] = this.write(value)` — ONE function
//              object for the life of the process, shared by every port of every instance.
//
//   ctor       THE SAME SHAPE, ALLOCATED THROUGH A CONSTRUCTOR. Identical fields, identical shared
//              method, identical call site; the object comes out of `new ExoStrDoorCtorA(...)`
//              instead of out of a literal with a `__proto__:` key.
//
//   rebound    THE PROTOTYPE ARM'S HANDLE, ALLOCATED ONCE AND RE-POINTED. `write` and `at` are
//              module-level constants and only the table changes per row, so the eight handles are
//              built at module load and the row stores its table into them: eight field stores
//              where `prototype` has eight allocations.
//
//   accessor   THERE IS NO ADDRESS TO RESOLVE AND NO CALL TO MAKE. Eight setters on one prototype,
//              installed once per family, each carrying its port's writer and slot; a write is a
//              STORE — `row.label = v`. Nothing per instance but one store.
//
//   protoPort  ONE METHOD PER PORT, INSTALLED ONCE PER SCHEMA, CAPTURING NOTHING. The slot is a
//              literal and the writer arrives through `this` — `row.label(v)` runs
//              `this.values[IA_LABEL] = this.writers[IA_LABEL](v)` — so ONE prototype serves every
//              backend, which a gate proves by rendering it through a second one.
//
//   classNode  THE INSTANCE IS THE NODE. `new` per instance, port methods on the CLASS prototype
//              (once per schema), and the writer TWO PROTOTYPE HOPS out — `this.writeLabel` misses
//              on the class prototype and hits the object standing in for the composed backend.
//              Nothing captured, no table index. It is the only arm that prices a prototype hop.
//
//   closure    THE ADDRESS IS IN THE FUNCTION. One function object per port per instance:
//                  const w = (v) => { slots[IA_ID] = WA_ID(v); };
//                  w(value);
//
//   escaped    THE CLOSURE ARM WHOSE HANDLES SURVIVE THE WIRE. The same eight bodies, stored into a
//              module-level array that a gate reads after the run, so escape analysis may not
//              remove them.
//
//   floor      THE NATIVE FLOOR — a straight-line program with no abstraction: no component, no
//              schema, no connector, no port, no object and no closure. One `+=` over merged static
//              pieces with the shipped escapers on the eight dynamic values. Byte-identical output.
//
// THEY ARE TIMED INDEPENDENTLY AGAINST THE SAME SCENE. There is no ladder here, no cumulative rungs
// and no differences of differences: ten programs, ten medians, and every comparison a
// difference of two of them with both rows' own resolutions beside it.
//
// THE PAIR THE OWNER IS DECIDING ON IS `accessor ↔ protoPort` — a writer captured at install time
// against a writer reached through `this`. It is read first and it is (P13).
//
// ═══ WHY THE LAST THREE PROGRAMS EXIST — TWO MECHANISMS AND ONE DEFECT IN THE SCENE ═══════════
//
// The first run of the four programs above returned, in ms per render: floor 0.2275, walk 0.4050,
// prototype 1.2050, closure 0.4025. `walk ↔ prototype` came back at −99.766 ns per port write over
// 639 grains, against THAT PAIR'S OWN resolution of 0.013750 ms (1.719 ns/write) and a four-grain
// bar of 0.6250 ns/write; `walk ↔ closure` was REFUSED at 3 grains. Two mechanisms fit that result
// equally well and the four programs cannot separate them:
//
//   M1  `__proto__:` INSIDE AN OBJECT LITERAL IS NOT A CHOICE OF MAP, IT IS A MUTATION. The literal
//       is created with the ordinary map and the prototype is installed afterwards. If that install
//       is what the 99.766 ns bought, the finding is about A SPELLING and not about a per-port
//       handle, and the fix is one keyword. `ctor` is the arm that separates it: same three fields,
//       same shared method, same one call site, same `w.set(v)`, allocated with a fixed initial map.
//   M2  NONE OF THE CLOSURE ARM'S EIGHT HANDLES ESCAPES, so the engine is entitled to have removed
//       all eight, and the arm's tie with the walk would then be a measurement of nothing. `escaped`
//       is the arm that separates it: the same eight bodies with the eight handles stored where the
//       optimiser cannot see through.
//
// NEITHER OF THOSE TWO ARMS IS FREE OF ITS OWN FUSED TERM, and both are named in THE COMPARISONS
// block: a constructor cannot be spelled without a constructor frame, and an escape cannot be
// spelled without the store that performs it.
//
// AND THE THIRD ARM ANSWERS A QUESTION THE FIRST FOUR CANNOT: IS IT THE ALLOCATION AT ALL? Two of
// a handle's three fields are module-level constants (`write`, `at`); only the table changes, and it
// changes EVERY ROW, because this backend pools nothing — `renderExoStrInstance` builds an exonode per
// instance (`renderExoStrInstance.ts:15`) and `createExoStrInstanceFactory` a `values` array per exonode
// (`exo-str-instance-factory.ts:22-23`). So a handle cannot be hoisted out of the loop, but it can
// be built ONCE and re-pointed: `rebound` allocates nothing per row and stores the row's table into eight
// handles it already has. `prototype ↔ rebound` is then eight allocations against eight stores with
// everything else — fields, method, call site, frames — held equal.
//
// THE PREMISE IS CHECKED AT RUNTIME AND NOT READ. `gateTablePerRow` renders 1000 rows through its
// own component and counts the DISTINCT tables the wire is handed; it must be 1000. An arm built on
// the opposite reading of this backend was refused by that count before anything was timed, which is
// why the check is a gate and not a sentence.
//
// ═══ THE FRAME COUNT, WHICH IS WHY THE LAST TWO ATTEMPTS AT THIS QUESTION WERE RETRACTED ═════
//
// A DOM ladder (`port-write-doors`, defect D1) spelled its "our code" arm as a bare
// `setters[i](nodes[elem[i]], v)` WITH NO ENCLOSING CALL while every shipped door spends a frame and
// then calls the setter — it compared ONE FRAME AGAINST TWO and published the difference as the
// price of the second. A server ladder then did the identical thing three lines below the comment
// that retracted the first: `ssr-floor`'s `+reset → +set` rung puts a bare `W[0](i)` against
// `c.set(PORTS[0], i)`.
//
// SO THE FRAME COUNT IS A COLUMN OF THE TABLE, printed beside every median, and here it is:
//
//               fr  fr/i
//   walk        2    0   `c.attr(port, v)` → `this.writers[index](v)`; a `c.text` port is 3
//   prototype   2    1   `w.set(v)`       → `this.write(v)`
//   ctor        2    9   `w.set(v)`       → `this.write(v)`
//   rebound     2    1   `w.set(v)`       → `this.write(v)`
//   accessor    2    1   `row.x = v`      → `WA_ID(v)`   — the first frame is entered by a STORE
//   protoPort   2    1   `row.x(v)`       → `this.writers[IA_ID](v)`
//   classNode   2    2   `en.x(v)`        → `this.writeId(v)`  — the writer is two hops out
//   closure     2    1   `w(v)`           → `WA_ID(v)`
//   escaped     2    1   `w(v)`           → `WA_ID(v)`
//   floor       1    0   `escapeExoText(v)` and nothing around it
//
// THE NINE DOOR ARMS SPEND EXACTLY ONE ENCLOSING CALL PLUS THE WRITE ITSELF, and the write itself
// is THE SAME FUNCTION OBJECT in all nine (the schema's writer for that port — see THE SCHEMA GATE).
//
// `accessor` IS THE ONE WHOSE FRAME IS NOT ENTERED BY A CALL EXPRESSION. A store that dispatches
// through an accessor is a different bytecode and a different inline cache from a method call, and
// whether V8 compiles the two alike IS THE QUESTION THAT ARM ASKS. The count is 2 either way and the
// `fr` column says 2; what the column cannot say is that one of those frames is reached differently,
// so this paragraph does.
//
// `fr/i` IS THE SECOND COLUMN AND IT EXISTS BECAUSE THIS FILE HID ONE. Frames per instance that do
// NOT enclose a port write: every handle arm calls `c.portTable()` once per instance
// through the connector's prototype chain, THE WALK NEVER DOES, and that is 1000 frames per render
// on one side of every `walk ↔ handle` pair. It sat under "allocations per instance" in the census
// and never in the frame column — the same class of miss the frame column was added to stop. The
// ctor arm's eight constructors are the other eight. At one write per port these divide straight
// into the per-write figures (1 per instance = 0.125 per write), so a pair whose two arms differ in
// `fr/i` is a pair with a frame in it, and every such comparison says so.
//
// THE FLOOR SPENDS ONE FRAME BY CONSTRUCTION AND IS LABELLED AS THE ARM THAT DOES. That is what a
// floor IS — a program with no abstraction has nothing to call — and it is NEVER used as the other
// three's control. What the floor's missing frame is worth is NOT measured here and cannot be read
// off any column below: `door − floor` on this axis is the whole render pipeline (the connector
// push, `reset`, the schema's `fillMarkup`, the attribute heads the writers own) PLUS one frame per
// write, and `ssr-floor` is the axis that separates those. The floor is here because an axis without
// one can rank participants and cannot say what any of them is worth — not because its gap is the
// door's price.
//
// ═══ THE SCENE, AND THE GRAIN ARITHMETIC, SET BEFORE ANYTHING WAS BUILT ═══════════════════════
//
// 1000 rows × 8 PORTS = 8000 PORT WRITES PER RENDER. Eight and not five because the subject scales
// with the port count while the per-instance tail (the connector's `reset`, the wire's own frame,
// `fillMarkup`) does not: more ports per row is a better ratio of subject to constant, and a row
// with eight dynamic values is a fat but ordinary list row.
//
//   A TIMED REGION is `REPS × batch` renders read off ONE clock, so every median in the table is a
//   multiple of `quantum ÷ (REPS × batch)`. At the 0.100 ms quantum this machine reports and REPS
//   40, that is:
//
//     batch 1   0.002500 ms per render ÷ 8000 writes = 0.3125 ns PER PORT WRITE   (4 grains = 1.25 ns)
//     batch 2   0.001250 ms per render ÷ 8000 writes = 0.1563 ns PER PORT WRITE   (4 grains = 0.63 ns)
//     batch 4   0.000625 ms per render ÷ 8000 writes = 0.0781 ns PER PORT WRITE   (4 grains = 0.31 ns)
//
//   THE SMALLEST DIFFERENCE THAT MATTERS is the walk's two array loads against a handle's one
//   allocation, and both are single-digit nanoseconds — plausibly ONE nanosecond or less once the
//   loads hit L1 and the allocation is a bump pointer. AT BATCH 1 A 1 ns/WRITE DIFFERENCE IS 3.2
//   GRAINS, WHICH IS UNDER THE FOUR-GRAIN BAR AND WOULD BE REFUSED. THAT IS WHY THE RUN IS BATCH 2
//   AND NOT BATCH 1: at batch 2 the same difference is 6.4 grains and four grains is 0.63 ns, which
//   is under the smallest quantity in dispute. The arithmetic is printed by the run itself in the
//   CENSUS block, from the OBSERVED quantum rather than from this comment.
//
//   IF THE THREE DOOR ARMS COME BACK INSIDE 0.63 ns/WRITE OF EACH OTHER, THIS SCENE CANNOT ANSWER
//   THE QUESTION AND THE RUN SAYS SO BY NAME, naming batch 4. That is written here, before the
//   build, rather than discovered afterwards.
//
// ═══ WHAT ONE INSTANCE ALLOCATES, PER ARM — the term the timing may not resolve ════════════════
//
// Read off the two packages' source and this file's own text. NOTHING HERE IS MEASURED; it is
// printed in the CENSUS so that a reader who sees three medians land on top of each other can still
// see what was supposed to separate them.
//
//   floor       NOTHING. Two locals in a loop and the escapers' result strings.
//   walk        NOTHING BEYOND WHAT THE RENDER ALREADY ALLOCATES. No handle, no object, no closure.
//   prototype   EIGHT OBJECTS PER INSTANCE — one per port, three fields each (`slots`, `write`,
//               `at`) over a shared prototype. Plus ONE `c.portTable()` call per instance.
//   ctor        THE SAME EIGHT OBJECTS, three fields each over the same kind of shared prototype,
//               PLUS EIGHT CONSTRUCTOR FRAMES. Plus ONE `c.portTable()` call per instance.
//   closure     EIGHT FUNCTION OBJECTS PER INSTANCE plus ONE CONTEXT holding `slots` (the eight
//               closures capture one wire-local between them; the writers and the indices are
//               module-level and are not in it). Plus ONE `c.portTable()` call per
//               instance.
//   escaped     THE SAME EIGHT FUNCTION OBJECTS AND THE SAME ONE CONTEXT, PLUS EIGHT STORES into a
//               module-level array of eight (packed, never grown, overwritten by every instance) and
//               ONE module-binding load for it. Plus ONE `c.portTable()` call.
//
// AT 1000 ROWS THAT IS 8000 OBJECTS OR 8000 FUNCTION OBJECTS PER RENDER against the walk's zero.
//
// AND THE ONE THING THAT MAKES MOST OF IT REMOVABLE: NO HANDLE OF `prototype`, `ctor` OR `closure`
// ESCAPES. They are built, called and dropped inside one wire, and the wire runs 1000 times per
// render, so it will be optimised. TurboFan is entitled to scalarise every receiver and every
// closure and allocate nothing at all. IT IS ALSO A REAL DIFFERENCE FROM THE DOM, where a door
// handed to `c.on` escapes by construction and cannot be removed. `escaped` IS THE ROW THAT PRICES
// THE DIFFERENCE — its eight handles are stored where the optimiser cannot see through, and what it
// costs over `closure` is the materialisation FUSED WITH the eight stores that cause it.
//
// ═══ THE ONE CONFOUND, NAMED BEFORE THE RUN RATHER THAN AFTER ═════════════════════════════════
//
// THE CLOSURE ARM DOES NOT ONLY SAVE LOADS — IT ALSO SPLITS ONE CALL SITE INTO EIGHT.
//
//   walk        the writer is called from ONE site in the process, `TExoStrNode.attr`'s
//               `this.writers[index](value)`, which sees every writer of every schema. MEGAMORPHIC.
//   prototype   the writer is called from ONE site, `EXO_STR_DOOR_A.set`'s `this.write(value)`,
//               which sees all eight of this family's writers. MEGAMORPHIC (V8 drops a polymorphic
//               inline cache at five).
//   ctor        ONE site, `ExoStrDoorCtorA.prototype.set`'s `this.write(value)`. MEGAMORPHIC, and
//               deliberately the same shape as `prototype`'s, because the allocation is the only
//               thing that pair is allowed to differ in.
//   rebound     ONE site, `EXO_STR_REBIND_A.set`'s `this.write(value)`. MEGAMORPHIC.
//   accessor    EIGHT sites, one per setter body, each seeing only its own writer. MONOMORPHIC,
//               which is the closure arm's confound and not the walk's.
//   protoPort   EIGHT sites, one per method body. MONOMORPHIC, the same as `accessor`, which is
//               why that pair does not carry the call-site term the walk pairs do.
//   classNode   EIGHT sites, one per method body. MONOMORPHIC.
//   closure     the writer is called from EIGHT sites, one per textually-declared closure, each of
//               which only ever sees its own writer. MONOMORPHIC, eight times over.
//   escaped     EIGHT sites, same as `closure`.
//
// THAT IS A REAL PROPERTY OF THE STRATEGY AND NOT AN ARTEFACT — a per-port function body genuinely
// specialises its own call site, and that is part of what composing a per-port door BUYS. But it
// means `closure ↔ walk` and `closure ↔ prototype` each carry TWO terms fused (the handle, and the
// call site), and this axis cannot separate them.
//
// AND THE SECOND CONFOUND, WHICH THIS FILE MISSED UNTIL A READER COUNTED THE FRAMES: EVERY HANDLE
// ARM CALLS `c.portTable()` ONCE PER INSTANCE THROUGH THE CONNECTOR'S PROTOTYPE CHAIN, AND
// THE WALK NEVER CALLS IT. That is 1000 frames per render on one side of every `walk ↔ handle` pair
// and zero on the other, and it cancels only between two handle arms. It was in the allocation
// census and nowhere near the frame column, which is exactly the mistake the frame column exists to
// stop. It is a COLUMN now (`fr/i`), on every row, and `walk ↔ prototype` is NOT the clean pair this
// header used to call it. THERE IS NO CLEAN PAIR ON THIS AXIS; each one names what it fuses.
//
// THE ARM THAT WOULD SEPARATE THE CLOSURE'S TWO TERMS is a door whose eight closures all call ONE
// shared writer; it is not built, and it is the first row to add if the closure wins by more than
// the prototype does.
//
// ═══ WHAT IS HELD CONSTANT ════════════════════════════════════════════════════════════════════
//
//   THE MARKUP, character for character · 1000 rows · 8 ports (4 attribute, 3 of them on distinct
//   names, and 4 text) · 8 PORT WRITES PER ROW, each port written EXACTLY ONCE · the eight values ·
//   the `<ul>` wrapper · the flatten at the end of every timed repetition.
//
//   THE NINE DOOR ARMS OF A FAMILY SHARE ONE DECLARATION AND THEREFORE ONE SCHEMA, ONE PORT NUMBERING,
//   ONE SET OF WRITERS AND ONE CONNECTOR POOL. That is `op-click-floor`'s rule and `handler-count`'s:
//   one declaration, nine wires, so nothing between those nine rows is a difference of markup, of
//   schema, of port numbering, of escaping or of connector shape. A GATE BELOW CHECKS IT BY POINTER.
//
// ═══ THE TWINS ════════════════════════════════════════════════════════════════════════════════
//
// EACH OF THE TEN ARMS HAS ITS OWN SEPARATELY-DECLARED TWIN — family `A` is the subject, family
// `B` is a second, independent declaration of the identical program: its own declaration, its own
// schema, its own connector pool, its own piece constants, its own author and kind arrays, its own
// prototype objects, its own class, its own eight closures, its own escape sink, its own eight rebound
// handles, its own accessor prototype and eight setter bodies, its own port-method prototype and
// eight method bodies, its own class and backend stand-in, its own floor function. A twin is DUPLICATED SOURCE and not a
// second call to one function, for `mount-floor`'s reason: calling one function twice shares
// everything V8 learned about it and measures a floor far below the one a real pair of programs sits
// on. Their true difference is ZERO by construction, and what the pair returns is what this
// instrument returns when there is nothing to see.
//
// EVERY GAP IS JUDGED AGAINST ITS OWN TWO ROWS' RESOLUTIONS, never against the table maximum. The
// printed `RESOLUTION FLOOR` is the coarsest of the ten, for the recorder, and no verdict uses it.
//
// ═══ THE PREDICTIONS, COMMITTED BEFORE THE PROGRAMS WERE WRITTEN ══════════════════════════════
//
// This is my model. It is JUDGEMENT plus code I read; I MEASURED NONE OF IT. Every falsifier is
// printed mechanically at the end so that nobody, including me, gets to choose them afterwards.
// Figures are ns PER PORT WRITE unless stated.
//
//   (P0) NO DIRECTION IS PREDICTED BETWEEN ANY TWO OF `walk`, `prototype` AND `closure`, and that is
//        a commitment rather than an omission. The three differ by (two array loads and a property
//        load, per write) against (one allocation per port per instance, amortised over exactly one
//        write, plus one extra call per instance), and nothing I can read off the source says which
//        of those is larger — least of all after escape analysis, which may remove one side of it
//        entirely. IF THIS FILE IS EVER QUOTED AS "closures are faster/slower than the walk on the
//        server", THE QUOTATION IS AGAINST ITS OWN TEXT.
//
//   (P1) `walk`, `prototype` AND `closure` LAND WITHIN 10 ns PER PORT WRITE OF EACH OTHER — the
//        three arms this prediction was committed over, and not the two added after it. MECHANISM: every arm
//        spends one enclosing call, one call to THE SAME writer function, and between two and four
//        loads; beyond that the only difference is one allocation per port per instance and one call
//        per instance. KILLER: a spread over 10 ns/write — then something other than loads and one
//        allocation is moving, and the named candidates, in the order I would look: a
//        de-optimisation in one wire that the others do not reach; the megamorphic writer site in
//        `set` and in the prototype's method against the closure's eight monomorphic ones (the
//        confound named above, which would show as `closure` standing apart from BOTH others while
//        `walk ↔ prototype` stays small); and V8 giving the 8-closure wire a context it does not give
//        the others.
//
//   (P2) `walk ↔ prototype` IS UNDER 3 ns PER PORT WRITE. THE WORD "CLEAN" WAS WRONG ON THIS PAIR
//        AND THE COMPARISONS BLOCK CORRECTS IT: every handle arm calls `portTable()` once
//        per instance and the walk never does, so one frame per instance is fused into it. The
//        number this prediction commits to is unchanged. MECHANISM: identical
//        frames, identical call-site polymorphy, identical writer; the prototype trades two array
//        loads and a `port.index` read per write for three in-object loads per write plus one
//        three-field object per port per instance and one `portTable()` call per instance.
//        Those are the same order of magnitude by construction. KILLER: over 3 ns — then carrying
//        the address in a receiver is not a wash, and the sign of it (which this file does not
//        predict) is the axis's finding.
//
//   (P3) AT LEAST ONE OF `walk↔prototype`, `walk↔closure` AND `prototype↔closure` IS REFUSED AT
//        BATCH 2 for being under four grains. Those three and no others: they are the pairs this
//        prediction was committed over, and the pairs the `ctor` and `escaped` arms added are
//        judged by (P7) and (P8) instead of quietly widening this one. MECHANISM: (P1) and (P2) put the quantities at 0-10 ns/write and four grains at
//        batch 2 is 0.63 ns/write, so a pair that is genuinely a wash lands under the bar — which is
//        the correct outcome and not a defect. KILLER: all three pairs resolve, in which case the
//        doors differ by more than one allocation and this file's cost census is incomplete.
//
//   (P4) `walk`, `prototype` AND `closure` ARE EACH DEARER THAN THE FLOOR, by 40-200 ns per
//        instance — again the three arms committed over. MECHANISM: the floor
//        skips the connector push, `reset`'s eight stores, the wire's own frame, `fillMarkup`, the
//        attribute writers' two extra concatenations per attribute port (`ssr-floor` measured that
//        one alone at 25 ns per row on a five-port scene — QUOTED SECOND-HAND from
//        `exo-writer-for-port.ts`'s own header, which cites `ssr-floor`'s published `+head` 0.1525
//        against `+vals` 0.1275; I did not open `measurements/ssr-floor.published.json` myself, and
//        THIS IS THE SOFTEST INPUT TO ANY PREDICTION IN THIS FILE) and one frame per write. Anyone
//        re-deriving the 40-200 ns band should open that recording first. KILLER: any door
//        arm at or under the floor — the floor would then not be a floor, and the first suspects are
//        that the floor's rope is shorter than the schema's (it merges the attribute heads into its
//        static pieces; the schema owns them inside the value) and that V8 folded the floor's loop.
//        THIS IS NOT A PREDICTION ABOUT THE DOOR'S PRICE. See the frame-count block.
//
//   (P5) EVERY ONE OF THE TEN NULL PAIRS IS ORDERING OR NOTHING: `|intrinsic| ≤ noise` for all
//        ten. MECHANISM: the two halves are transcriptions of one program. KILLER: any pair whose
//        intrinsic stands out of its own noise — that ARM is then unquotable, not merely its null,
//        because two declarations of one program that differ in a way which does not flip with the
//        running order are two different programs.
//
//   (P6) EVERY ONE OF THE TWENTY TIMED REGIONS CLEARS THIRTY TICKS of the observed clock at batch
//        2.
//        MECHANISM: 1000 rows of ~200 characters is ~0.2-0.3 ms per render on the figures
//        `ssr-floor` published for a 1000-row five-port scene, and a region is 80 renders — 16-24 ms
//        against a 0.100 ms quantum. KILLER: any region under the 3-tick floor, in which case that
//        ROW IS EXCLUDED from every fit, every prediction and every printed conclusion by the clock
//        check, WHICH RUNS BEFORE THEM. A row under the tick floor is not "mentioned afterwards"
//        here; it is struck out of the arithmetic before the arithmetic happens.
//
//   (P7) `ctor` IS CHEAPER THAN `prototype` BY AT LEAST HALF OF WHAT SEPARATES `prototype` FROM
//        `walk` — a direction, committed, and the one place in this file where I have one.
//        MECHANISM: the two arms build the same three fields over the same kind of shared method and
//        differ in the allocation alone; a constructor allocates with the initial map V8 keeps on
//        the function, while `__proto__:` in a literal creates the object with the ordinary map and
//        installs the prototype afterwards, which is a per-object step and not a per-callsite one.
//        THAT MECHANISM IS READ FROM MEMORY OF V8'S BYTECODE GENERATOR AND I DID NOT OPEN V8 IN THIS
//        TURN — it is the softest input to any prediction in this file, softer than (P4)'s
//        second-hand 25 ns. KILLER: `ctor` lands on `prototype` inside their own two resolutions —
//        then the spelling is not the term, M1 is refuted, and a per-port receiver over a shared
//        method costs what the prototype arm says it costs whichever keyword allocates it. NOTE THE
//        FUSED TERM either way: `ctor` pays one constructor frame per port per instance, which at
//        one write per port is a third frame per port write, so a `ctor` that lands ABOVE
//        `prototype` has not shown that constructors are dearer than literals — only that this
//        arm's frame outweighed whatever the literal's install costs.
//
//   (P8) NO SIZE IS PREDICTED FOR `escaped ↔ closure`, and that is a commitment rather than an
//        omission: whether TurboFan removed the closure arm's eight handles is exactly the thing
//        being asked, and a number here would be a guess dressed as a model. WHAT IS COMMITTED IS
//        THE SIGN — `escaped` MAY NOT BE CHEAPER THAN `closure`. MECHANISM: it does strictly more
//        work, the same eight closures and eight bodies plus eight stores into a module-level array.
//        KILLER: `escaped` resolves BELOW `closure` — then the two are not transcriptions of one
//        program and something other than the escape moved, and the named suspect is that the stores
//        changed an inlining decision at the eight call sites. AND THE SIZE IT DOES RETURN IS FUSED:
//        the materialisation the escape forces cannot be separated here from the eight stores that
//        force it, each of which is an element store with a generational write barrier. If that
//        route alone cost tens of nanoseconds per instance the arm would prove nothing, which is why
//        it is eight stores into a preallocated packed array of eight and not eight pushes into a
//        growing one.
//
//   (P9) `rebound` IS CHEAPER THAN `prototype` — a direction, committed. MECHANISM: same three
//        fields, same shared method, same one megamorphic call site, same frames per write and per
//        instance, same writer; one allocates eight objects per instance and the other stores a
//        pointer into eight it already has. NO SIZE IS PREDICTED: an allocation in V8 is a bump
//        pointer and three field inits, a store into a long-lived handle is a store plus an
//        old-to-young write barrier, and I cannot rank those by reading — only their difference's
//        SIGN. KILLER: `rebound` lands on or above `prototype`, in which case the 99.766 ns the
//        prototype arm stands above the walk is NOT its allocations, and (P7)'s install is the
//        remaining candidate. READ (P9) BESIDE (P7): `ctor` and `rebound` remove the per-row
//        `__proto__:` install by two independent routes, so both landing near the walk is the
//        strongest support M1 can get on this axis, and one landing there alone is a puzzle.
//
//  (P10) NO DIRECTION IS PREDICTED FOR `rebound ↔ walk`, and that is a commitment. The rebound arm
//        removes the walk's `port.index` read and two array loads per write and adds one
//        module-binding load and three in-object loads per write, one `portTable()` FRAME and eight
//        barriered stores per instance. Those are the same order of magnitude and I cannot rank them
//        by reading. WHAT IS COMMITTED IS WHAT THE RUN MUST SAY: if `rebound` lands under `walk` and
//        the pair clears both resolutions and four grains, this axis has a user-writable
//        composition BELOW the shipped door, and it prints that in those words rather than leaving
//        it to a reader to notice.
//
//  (P11) `accessor` IS CHEAPER THAN `walk`, BY 0.5-4 ns PER PORT WRITE — a direction and a size.
//        MECHANISM: it drops three loads per write (`port.index`, `this.writers`, and the
//        `writers[index]` element load) for two context-slot loads, and pays one `portTable()`
//        frame and one store per instance, which at eight writes per instance is an eighth of each.
//        Loads that hit L1 are fractions of a nanosecond, so the band is small on purpose. KILLER:
//        DEARER THAN THE WALK, or cheaper by more than 4 ns/write. If it is dearer the loads did not
//        do it — the accessor makes strictly fewer — and the suspect is the call shape: a store
//        dispatching to a setter is a different bytecode and a different inline cache from a method
//        call. THAT IS THE UNKNOWN THE ARM EXISTS TO PRICE, and it is written here before the run.
//        If the pair lands under four grains the run says NOT JUDGED and names the batch: the band's
//        floor is 0.5 ns/write and four grains at batch 2 is 0.63.
//
//  (P12) NO DIRECTION IS PREDICTED FOR `accessor ↔ rebound`. One store per instance against eight
//        says the accessor; a dispatch shape nobody here has measured says nothing. Both allocate
//        nothing per instance and both re-point a module-level receiver, so this is the pair to read
//        if (P11) comes back with a sign nobody expected.
//
//  (P15) `classNode` IS CHEAPER THAN `ctor` — a direction. MECHANISM: the same `new`, one object of
//        one field per instance against eight of three fields, the same frames per write, and the
//        writer two prototype hops out instead of in the receiver. KILLER: dearer, in which case a
//        two-hop lookup costs more per write than seven allocations cost per instance.
//
//  (P16) `walk ↔ classNode` IS WITHIN 5 ns PER PORT WRITE — a size with no direction, and THE PRICE
//        OF THE TWO PROTOTYPE HOPS is what it is for. MECHANISM: a warm monomorphic lookup through
//        two hops is a receiver-map check and a load from the holder, the same shape as an own
//        load; what is left is one allocation and two frames per instance, an eighth of each per
//        write. KILLER: over 5 ns/write — then either the hop or the allocation is real, and
//        `ctor ↔ classNode` is the row that says which, because those two differ in the allocation
//        count and not in the hop.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ════════════════════
//
//  * NOTHING ABOUT A DOM WRITE. THE SERVER WRITES INTO A STRING. There is no node, no
//    `setAttribute`, no `.data` store, no layout, and — the term the DOM has and the server does not
//    — NO NODE INDIRECTION: the DOM's walk is `setters[index](nodes[elem[index]], value)`, two array
//    loads THIS BACKEND DOES NOT HAVE, so the walk arm here is cheaper than the DOM's walk by an
//    amount this axis does not measure and cannot bound. A figure from this file is not a figure
//    about `@exodra/dom` and may not be quoted as one. The DOM was tried twice
//    (`port-write-doors`, `handler-count`) and its clock could not see this question: every median
//    came back an integer number of ticks and every difference a half-tick artefact.
//  * NOTHING ABOUT A PORT WRITTEN MORE THAN ONCE. On this backend every port is written EXACTLY ONCE
//    per instance, so a per-port handle is built and used ONCE — the worst possible amortisation for
//    the per-row handle arms, and the best possible for the walk. The crossover in writes-per-handle is
//    the question this scene does not contain, and it cannot be added here: a second write to a port
//    on this backend is inert (the markup is emitted when the wire returns), so a k>1 scene on the
//    server would be timing writes that no byte gate can prove happened. THAT AXIS IS AN UPDATE
//    AXIS, and it is on the DOM, where the clock cannot see it. UNMEASURED, and named rather than
//    approximated.
//  * NOTHING ABOUT THE PRICE OF THE MISSING FRAME. See the frame-count block: `door − floor` is the
//    whole pipeline plus one frame, and `ssr-floor` is the axis that cuts that into rungs.
//  * NOTHING ABOUT THE ALLOCATION SEPARATELY FROM THE CALL SITE, for the closure arm. See THE ONE
//    CONFOUND.
//  * NOTHING ABOUT A CONSTRUCTOR SEPARATELY FROM ITS FRAME. `ctor` is the only arm that spends a
//    call the others do not, and no spelling of "allocate through a constructor" omits it. So
//    `ctor ↔ prototype` bounds the literal's install from one side only: a `ctor` that is cheaper
//    proves the install is dearer than a frame, and a `ctor` that is not proves nothing about the
//    install at all.
//  * NOTHING ABOUT THE COST OF AN ESCAPE SEPARATELY FROM THE ESCAPING. `escaped ↔ closure` contains
//    the eight stores that cause the escape, and this axis has no arm that pays the stores without
//    escaping. The row that would separate them is one that stores eight things which were going to
//    be materialised anyway; it is not built.
//  * NOTHING ABOUT A HANDLE THAT COULD BE HOISTED OUT OF THE LOOP ENTIRELY. The table is this
//    instance's own array and changes every row, so the smallest handle strategy this backend
//    admits still touches eight fields per instance. A POOLED backend would admit a real hoist —
//    zero work per row after the first — and this axis cannot say what that would be worth.
//  * NOTHING ABOUT AN ACCESSOR ON THE RENDERED INSTANCE, WHICH IS THE SHAPE THE QUESTION CAME IN.
//    Every instance's prototype is the backend object (`exo-str-instance-factory.ts:33`, reached
//    through `ExoStrBackend.ts`), and all eighteen programs render through it, so eight
//    accessors installed there would change the map of every instance in every arm. The alternative,
//    a second backend, gives this arm its own schema and its own writer objects and the schema gate
//    exists to refuse exactly that. So the receiver here is a module-level row re-pointed per
//    instance. THE PER-WRITE PATH IS THE SAME EITHER WAY — a store into `this.values[LITERAL]`
//    through a captured writer — and what is NOT measured is the one store per instance that a real
//    instance-prototype accessor would not pay.
//  * NOTHING ABOUT A WRITER REACHED WITHOUT A TABLE. `protoPort` was asked for with the writer
//    reached through `this` and NOT through a table; on this backend an attribute writer is shared
//    per NAME and carries it (`exo-writer-for-port.ts:46`), so a per-kind method could not produce
//    the four attribute ports' bytes and would not be the schema's writer. The arm reads
//    `this.writers[LITERAL]` instead — one in-object load and one element load, counted as the
//    arm's cost. What is unmeasured is the shape the spec named, and a scene of eight TEXT ports
//    (where the writer IS a module-level singleton) is where it could be measured.
//  * NOTHING ABOUT WHETHER A SETTER AND A METHOD COMPILE ALIKE, SEPARATELY FROM THE LOADS. Every
//    pair containing `accessor` fuses the call shape with something else: with the address
//    resolution and the call-site split against `walk`, with seven stores per instance against
//    `rebound`, with eight function objects per instance against `closure`. `closure ↔ accessor` is
//    the narrowest of the three and still carries the allocation.
//  * NOTHING ABOUT `classNode` WITHOUT ONE EXTRA ALLOCATION. In the design the class instance IS
//    the node and replaces the record `createExoStrInstanceFactory` builds; here it is built BESIDE it,
//    because `schema.createInstance` belongs to the backend and a second backend means a second schema. So every
//    `classNode` figure contains one object and one constructor frame per instance that the design
//    would not pay, and no row here subtracts them.
//  * NOTHING ABOUT WHERE THE WRITERS WOULD REALLY LIVE. All eight sit on the far object so that the
//    hop is measured at full strength; in a real composition the four per-name attribute writers
//    would sit on the per-schema prototype at ONE hop and only the per-kind text writer at two. The
//    arm is an UPPER BOUND on the hop, deliberately, and a diluted average would have been the
//    weaker measurement.
//  * NOTHING ABOUT REENTRANCY. `rebound`'s eight handles are module-level, so a component that
//    rendered another instance of ITSELF between the re-point and the writes would corrupt them.
//    Nothing in this scene nests, and a strategy that must be scoped per render rather than per
//    module would pay for that scoping; UNMEASURED.
//  * NOTHING ABOUT THE PORTTABLE FRAME SEPARATELY FROM THE HANDLE. Every handle arm calls
//    `portTable()` once per instance and the walk never does, so every `walk ↔ handle`
//    figure contains one frame per instance. The `fr/i` column prints it; no arm here subtracts it.
//  * NOTHING ABOUT GC SEPARATELY FROM THE WORK. The sink holds every render of the region alive by
//    `mount-phases`' rule — about 15 MB at 80 renders of a 188 209-character page — so an arm that
//    also allocates 640 000 handles per region collects them against a live set held for an
//    unrelated reason. A per-arm heap column is not printed and the two are not separated.
//  * NOTHING ABOUT UPDATES, EVENTS, TEARDOWN, HYDRATION OR MEMORY. A server render is all mount;
//    no listener is installed, no subscription is taken (`TExoStrNode.bind` reads once and
//    subscribes to nothing) and no heap column is printed.
//  * NOTHING ABOUT `c.fillDoors()` OR `c.portNodeWriter()`. Those are two more doors this backend
//    exposes — a holder object per connector, and one closure per connector taking `(table, port,
//    value)` — and neither is one of the shapes the question names. UNMEASURED here.
//  * IT NO LONGER CANNOT SEPARATE THE `__proto__:` SPELLING FROM THE RECEIVER SHAPE — that is what
//    `ctor` is for — BUT IT SEPARATES THEM IN ONE DIRECTION ONLY, and the item above says how.
//  * THE ESCAPE-ANALYSIS CAVEAT USED TO READ ONE-DIRECTIONALLY: "if the two handle arms land on the
//    walk, the first candidate is escape analysis". WHAT ACTUALLY HAPPENED WAS ONE ARM ON THE WALK
//    AND ONE 3× ABOVE IT, and that shape has no single explanation: it is consistent with the
//    closures being removed and the objects not, with the objects paying a per-object install the
//    closures do not, and with both. `escaped` and `ctor` exist to split those, and until they run
//    NEITHER READING MAY BE QUOTED.
//  * IT IS NOT A CLAIM THAT ONE DOOR SHOULD REPLACE ANOTHER. A handle can be handed to something
//    that does not hold the connector; the walk cannot. That is a difference in what can be
//    EXPRESSED, and this axis prices only what it costs.
//
// ═══ HOW TO RUN IT, WITH THE ARITHMETIC ══════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- door-shape 100 2 --record=first
//
// BATCH 2, ROUNDS 100, AND HERE IS WHERE BOTH COME FROM:
//
//   THE GRAIN. See THE SCENE above: batch 2 puts four grains at 0.63 ns per port write, under the
//   smallest quantity in dispute. Batch 1 puts it at 1.25 ns, which is over a plausible value of the
//   whole effect, so batch 1 would refuse the interesting pairs by construction.
//   THE CLOCK FLOOR. The cheapest region (`floor`, ~0.2 ms per render) is ~16 ms at batch 2 — ~160
//   ticks of a 0.100 ms clock against the 3-tick floor. The batch is for the GRAIN, not the clock.
//   ROUNDS. Twenty phases and ten null pairs; 100 rounds gives each pair 100 paired samples and each
//   running order roughly half of them, which is what the order split needs. `ssr-floor`'s 400-round
//   advice was written for quantities of one to five grains; the quantities here are predicted at 0
//   to 60 grains and the null block is what says whether 100 was enough.
//   WALL CLOCK. Twenty phases × 80 renders per region, at the medians the four-program run
//   returned (floor 0.2275, walk 0.4050, prototype 1.2050, closure 0.4025 ms per render) plus three
//   arms whose medians are the question, is ~500-750 ms of timed region per round, plus a GC pair
//   before each of the twenty regions. 6 warm-up rounds and 100 timed rounds: ONE TO THREE
//   MINUTES, and it prints its first table in one pass. That is the point of moving this question
//   off the DOM, where the same question cost 10, 38 and 9 minutes and answered nothing.
//   THE ESCALATION IS `door-shape 100 4`, which halves the grain to 0.078 ns per port write and
//   doubles the wall clock. MORE ROUNDS DO NOT HELP A QUANTISED MEDIAN — the batch is what moves the
//   grain — and the refusal below names the batch rather than the rounds for that reason.
//
// `@exodra/string` and `@exodra/core` are resolved to their BUILT dists, so `npm run build` at the
// repo root has to have run, or every library row is last week's renderer.
import { escapeExoAttributeValue, escapeExoText, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoAttrPort, TExoPort, TExoTextPort } from '@exodra/core';
import { ExoStrBackend, exoStrSchemaOf } from '@exodra/string';
import type { TExoStrNode, TExoStrMachine, TExoStrWriter } from '@exodra/string';
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

/** The server backend, built once at module load. It composes nothing, so it is the shipped path. */
const EXO_STR = new ExoStrBackend();

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE JOB.
// ---------------------------------------------------------------------------------------

/** 1000 rows — `ssr-floor`'s size, and the size its published grain arithmetic is stated in. */
const ROWS = 1000;

/** Eight ports per row, every one written exactly once. See THE SCENE in the header. */
const PORTS = 8;

/** Renders per timed region, before the batch multiplies it. `ssr-floor`'s, for its grain. */
const REPS = 40;

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

type Arm =
    | 'floor'
    | 'walk'
    | 'prototype'
    | 'ctor'
    | 'rebound'
    | 'accessor'
    | 'protoPort'
    | 'classNode'
    | 'closure'
    | 'escaped';
const ARMS: readonly Arm[] = [
    'floor',
    'walk',
    'prototype',
    'ctor',
    'rebound',
    'accessor',
    'protoPort',
    'classNode',
    'closure',
    'escaped',
];

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
/** Four short ASCII kinds, likewise. */
const KINDS_A: readonly string[] = ['task', 'note', 'bug', 'idea'];

/** The twin family's own copies — its own array objects, so no row reads the other's. */
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
const KINDS_B: readonly string[] = ['task', 'note', 'bug', 'idea'];

// ---------------------------------------------------------------------------------------
// THE MARKUP.
//
//   <li class="row" data-id="7" data-kind="idea"><a class="t" href="/i/7">Task 7</a>
//   <span class="by">Ken</span><span class="n">1007</span><span class="s" title="n7">ok 7</span></li>
//
// EIGHT PORTS: FOUR ATTRIBUTES on four distinct names (`data-id`, `data-kind`, `href`, `title`) and
// FOUR TEXTS. Four names and not one repeated four times for `port-write-doors`' defect D6: an
// attribute writer is shared per (write spec, tag), so four names give four DIFFERENT writer
// closures rather than four clones of one source position. The four text ports share ONE writer,
// which is `exo-writer-for-port`'s own design (a text writer is a module-level singleton) and is
// therefore the shipped shape rather than a simplification; the CENSUS prints the distinct-writer
// count so a reader can see the mix rather than take this paragraph's word for it.
//
// NO EVENT PORT, deliberately — a server event port owns a slot that prints nothing and cuts the
// static run in two (`ssr-floor`'s `+cut` rung prices that), and it would add a mechanism to the
// constant tail without adding anything to the subject.
//
// NO VALUE IS EVER `null`, `undefined`, `false` OR `true`. An attribute writer returns the empty
// string for the first three (which removes the attribute entirely) and a bare ` name="` for the
// fourth, so a run whose data drifted into those would change the bytes; the byte gate would catch
// it, and this note is why it never has to.
//
// THE FLOOR'S PIECES ARE MERGED — ` data-id="`, ` href="`, ` title="` live in its static markup,
// which is what a program with no abstraction writes. The schema puts them INSIDE the value, because
// only a writer that owns the head can decline to write the attribute at all. The bytes are
// identical either way and the gate proves it; the rope is not, and that is a term in the floor gap
// (see (P4)) and in no other comparison on this axis.
// ---------------------------------------------------------------------------------------

const UL_OPEN = '<ul>';
const UL_CLOSE = '</ul>';

const FA0 = '<li class="row" data-id="';
const FA1 = '" data-kind="';
const FA2 = '"><a class="t" href="';
const FA3 = '">';
const FA4 = '</a><span class="by">';
const FA5 = '</span><span class="n">';
const FA6 = '</span><span class="s" title="';
const FA7 = '">';
const FA8 = '</span></li>';

const FB0 = '<li class="row" data-id="';
const FB1 = '" data-kind="';
const FB2 = '"><a class="t" href="';
const FB3 = '">';
const FB4 = '</a><span class="by">';
const FB5 = '</span><span class="n">';
const FB6 = '</span><span class="s" title="';
const FB7 = '">';
const FB8 = '</span></li>';

// ---------------------------------------------------------------------------------------
// THE DECLARATIONS. TWO row declarations — one per family — so that the two families share no
// schema, no port numbering, no writer and no connector pool.
//
// WITHIN A FAMILY THE THREE DOOR ARMS SHARE ONE DECLARATION, which is `op-click-floor`'s rule
// and `handler-count`'s: one declaration, three wires, so nothing between those three rows is a
// difference of markup, of schema, of port numbering, of escaping or of connector shape.
// `gateSchemas` checks it BY POINTER rather than asserting it here.
// ---------------------------------------------------------------------------------------

interface TRowPorts {
    readonly id: TExoAttrPort;
    readonly kind: TExoAttrPort;
    readonly href: TExoAttrPort;
    readonly label: TExoTextPort;
    readonly by: TExoTextPort;
    readonly n: TExoTextPort;
    readonly note: TExoAttrPort;
    readonly tail: TExoTextPort;
}

function makeRowSchema(): TExoCursorDeclaration<TRowPorts> {
    return createExoSchema<TRowPorts>((b) => {
        let id!: TExoAttrPort;
        let kind!: TExoAttrPort;
        let href!: TExoAttrPort;
        let label!: TExoTextPort;
        let by!: TExoTextPort;
        let n!: TExoTextPort;
        let note!: TExoAttrPort;
        let tail!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            id = li.port('data-id');
            kind = li.port('data-kind');
            li.el('a', { class: 't' }, (a) => {
                href = a.port('href');
                label = a.textPort();
            });
            li.el('span', { class: 'by' }, (span) => {
                by = span.textPort();
            });
            li.el('span', { class: 'n' }, (span) => {
                n = span.textPort();
            });
            li.el('span', { class: 's' }, (span) => {
                note = span.port('title');
                tail = span.textPort();
            });
        });
        return { id, kind, href, label, by, n, note, tail };
    });
}

const S_A = makeRowSchema();
const S_A_FORMS: unknown[] = [];
const S_B = makeRowSchema();
const S_B_FORMS: unknown[] = [];

const PA = S_A.ports;
const PB = S_B.ports;

// THE SCHEMAS, COMPILED AT MODULE LOAD — which is where `EXO_STR.render` would compile them, so
// nothing about this line is inside a timed region. The handle arms read their writers and their
// slot indices out of these; the walk arm reads neither, because resolving them per write is
// what it IS. The BACKEND OBJECT MUST BE `EXO_STR` and no other: a string schema is cached per
// family's `forms` PER backendType, so a second backend here would compile a second
// schema and the handle arms would be writing through writers no measured row renders with.
const PLAN_A = exoStrSchemaOf(machineOf(S_A, S_A_FORMS), EXO_STR);
const PLAN_B = exoStrSchemaOf(machineOf(S_B, S_B_FORMS), EXO_STR);

/** Family A's slot indices — read off the ports, never assumed to be 0…7. */
const IA_ID = PA.id.index;
const IA_KIND = PA.kind.index;
const IA_HREF = PA.href.index;
const IA_LABEL = PA.label.index;
const IA_BY = PA.by.index;
const IA_N = PA.n.index;
const IA_NOTE = PA.note.index;
const IA_TAIL = PA.tail.index;

/** Family A's writers — THE SAME FUNCTION OBJECTS `TExoStrNode.attr` calls for these ports. */
const WA_ID: TExoStrWriter = PLAN_A.writers[IA_ID];
const WA_KIND: TExoStrWriter = PLAN_A.writers[IA_KIND];
const WA_HREF: TExoStrWriter = PLAN_A.writers[IA_HREF];
const WA_LABEL: TExoStrWriter = PLAN_A.writers[IA_LABEL];
const WA_BY: TExoStrWriter = PLAN_A.writers[IA_BY];
const WA_N: TExoStrWriter = PLAN_A.writers[IA_N];
const WA_NOTE: TExoStrWriter = PLAN_A.writers[IA_NOTE];
const WA_TAIL: TExoStrWriter = PLAN_A.writers[IA_TAIL];

const IB_ID = PB.id.index;
const IB_KIND = PB.kind.index;
const IB_HREF = PB.href.index;
const IB_LABEL = PB.label.index;
const IB_BY = PB.by.index;
const IB_N = PB.n.index;
const IB_NOTE = PB.note.index;
const IB_TAIL = PB.tail.index;

const WB_ID: TExoStrWriter = PLAN_B.writers[IB_ID];
const WB_KIND: TExoStrWriter = PLAN_B.writers[IB_KIND];
const WB_HREF: TExoStrWriter = PLAN_B.writers[IB_HREF];
const WB_LABEL: TExoStrWriter = PLAN_B.writers[IB_LABEL];
const WB_BY: TExoStrWriter = PLAN_B.writers[IB_BY];
const WB_N: TExoStrWriter = PLAN_B.writers[IB_N];
const WB_NOTE: TExoStrWriter = PLAN_B.writers[IB_NOTE];
const WB_TAIL: TExoStrWriter = PLAN_B.writers[IB_TAIL];

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
 * THE LIST WRAPPER — one `<ul>`, one children port, one `c.list`.
 *
 * A NEW DECLARATION PER CALL, so no two programs share the wrapper's schema or its connector. The row
 * number arrives as the INDEX: `c.list` takes a COUNT and numbers its rows 0…count-1, handing each
 * wire its own number as the second argument, so nothing here reads a module counter and nothing
 * allocates an items array the rows would only index by position anyway.
 */
function listOver(row: TExoStrMachine): TExoStrMachine {
    const schema = makeListSchema();
    const port = schema.ports.rows;
    return {
        declaration: schema,
        forms: [],
        createInitialState: (c: TExoStrNode): void => {
            c.list(port, row, ROWS);
        },
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    };
}

// ---------------------------------------------------------------------------------------
// ARM 1 — THE NATIVE FLOOR. Straight-line `+=`, the shipped escapers, no component, no schema, no
// connector, no port, no object and no closure. ONE FRAME PER WRITE, by construction.
//
// THE ESCAPERS ARE NOT OPTIONAL AND THIS IS NOT A STYLE CHOICE: a server program that prints a value
// into a text position without escaping it is not a faster program, it is an injection, and
// `ssr-floor`'s header has the sufficiency argument. The two functions here are the ones the schema's
// own writers call.
//
// `String(i)` IS EXPLICIT because the shipped attribute writer stringifies a non-string before
// escaping it and the wire hands it the number; doing it here is what keeps the two programs paying
// for the same conversion.
// ---------------------------------------------------------------------------------------

function floorA(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        html +=
            FA0 +
            escapeExoAttributeValue(String(i)) +
            FA1 +
            escapeExoAttributeValue(KINDS_A[i & 3]) +
            FA2 +
            escapeExoAttributeValue('/i/' + i) +
            FA3 +
            escapeExoText('Task ' + i) +
            FA4 +
            escapeExoText(AUTHORS_A[i & 7]) +
            FA5 +
            escapeExoText(String(1000 + i)) +
            FA6 +
            escapeExoAttributeValue('n' + i) +
            FA7 +
            escapeExoText('ok ' + i) +
            FA8;
    }
    return html + UL_CLOSE;
}

function floorB(): string {
    let html = UL_OPEN;
    for (let i = 0; i < ROWS; i++) {
        html +=
            FB0 +
            escapeExoAttributeValue(String(i)) +
            FB1 +
            escapeExoAttributeValue(KINDS_B[i & 3]) +
            FB2 +
            escapeExoAttributeValue('/i/' + i) +
            FB3 +
            escapeExoText('Task ' + i) +
            FB4 +
            escapeExoText(AUTHORS_B[i & 7]) +
            FB5 +
            escapeExoText(String(1000 + i)) +
            FB6 +
            escapeExoAttributeValue('n' + i) +
            FB7 +
            escapeExoText('ok ' + i) +
            FB8;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// ARM 2 — THE WALK. The SHIPPED door, called through the public surface, nothing hand-spelled.
//
// THERE IS NO `TExoStrNode.set` ANY MORE. The shipped door is TWO methods, `c.attr(port, value)`
// and `c.text(port, value)`, and `attr`'s body is the whole arm:
//
//     const index = port.index;
//     this.values[index] = this.writers[index](value);
//
// NO HANDLE, NOTHING PER PORT, NOTHING PER INSTANCE. THE FRAME COUNT IS NOT ONE NUMBER: an `attr`
// port is two frames (`attr`, then the writer) and a `text` port is THREE, because `text`'s body is
// `this.attr(port, value)` and nothing else. This arm writes four of each, so the `fr` column below
// — one integer per program — understates half of its writes by one frame.
// ---------------------------------------------------------------------------------------

const WALK_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    c.attr(PA.id, i);
    c.attr(PA.kind, KINDS_A[i & 3]);
    c.attr(PA.href, '/i/' + i);
    c.text(PA.label, 'Task ' + i);
    c.text(PA.by, AUTHORS_A[i & 7]);
    c.text(PA.n, 1000 + i);
    c.attr(PA.note, 'n' + i);
    c.text(PA.tail, 'ok ' + i);
};

const WALK_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    c.attr(PB.id, i);
    c.attr(PB.kind, KINDS_B[i & 3]);
    c.attr(PB.href, '/i/' + i);
    c.text(PB.label, 'Task ' + i);
    c.text(PB.by, AUTHORS_B[i & 7]);
    c.text(PB.n, 1000 + i);
    c.attr(PB.note, 'n' + i);
    c.text(PB.tail, 'ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 3 — THE PROTOTYPE. One object per port per instance; the METHOD EXISTS ONCE IN THE PROCESS.
//
// `{ __proto__: EXO_STR_DOOR_A, slots, write, at }` and not `Object.create(…)` followed by three
// assignments, for the reason `createExoStrInstanceFactory` gives in `@exodra/string`: every field a per-shape
// object will ever have must be present when it is built, in one order, or V8 gives it no in-object
// slots and every later store grows a backing store instead. `Object.create(p, descriptors)` is
// worse — it produces a dictionary-mode object. `__proto__:` inside an object literal is the one
// spelling that gives a literal a chosen prototype at creation, and it is normative rather than an
// extension. IT IS THE SAME SPELLING THE SHIPPED CONNECTOR USES, which is the point.
//
// `slots` IS ON EVERY RECEIVER rather than closed over, because the whole point of this arm is that
// the method captures NOTHING: one function object for the process, and everything it needs read off
// `this`. A method that closed over the table would be one function object per instance, which is
// the closure arm wearing a different name.
//
// `const P = EXO_STR_DOOR_A` IS A ONE-LOAD ALIAS AND IS DECLARED HERE RATHER THAN LEFT IMPLICIT.
// It reads the module-level prototype ONCE per instance instead of once per port, which saves this
// arm seven module-binding loads per instance — sub-nanosecond, identical in the twin, and named
// because an unexplained local in the arm being priced is exactly the kind of thing a reader should
// not have to find. Reverting it costs the same eight loads the closure arm already pays for its
// writers.
//
// TWO FRAMES per write (`w.set`, then `this.write`).
// ---------------------------------------------------------------------------------------

/** What a prototype door is, as a value. `slots` is the connector's own array for this instance. */
interface TExoStrDoor {
    readonly slots: string[];
    readonly write: TExoStrWriter;
    readonly at: number;
    set(value: unknown): void;
}

/**
 * FAMILY A's ONE SHARED METHOD — one function object for the life of the process, on one object,
 * serving every port of every instance of this family.
 *
 * It is `TExoStrNode.attr`'s line with the address read off the receiver instead of out of the
 * port and two arrays: three in-object loads against two array loads and a property load.
 */
const EXO_STR_DOOR_A = {
    set(this: TExoStrDoor, value: unknown): void {
        this.slots[this.at] = this.write(value);
    },
};

/** The twin family's own declaration of the same method — a second function object, not this one. */
const EXO_STR_DOOR_B = {
    set(this: TExoStrDoor, value: unknown): void {
        this.slots[this.at] = this.write(value);
    },
};

const PROTOTYPE_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const P = EXO_STR_DOOR_A;
    const d0 = { __proto__: P, slots, write: WA_ID, at: IA_ID } as unknown as TExoStrDoor;
    const d1 = { __proto__: P, slots, write: WA_KIND, at: IA_KIND } as unknown as TExoStrDoor;
    const d2 = { __proto__: P, slots, write: WA_HREF, at: IA_HREF } as unknown as TExoStrDoor;
    const d3 = { __proto__: P, slots, write: WA_LABEL, at: IA_LABEL } as unknown as TExoStrDoor;
    const d4 = { __proto__: P, slots, write: WA_BY, at: IA_BY } as unknown as TExoStrDoor;
    const d5 = { __proto__: P, slots, write: WA_N, at: IA_N } as unknown as TExoStrDoor;
    const d6 = { __proto__: P, slots, write: WA_NOTE, at: IA_NOTE } as unknown as TExoStrDoor;
    const d7 = { __proto__: P, slots, write: WA_TAIL, at: IA_TAIL } as unknown as TExoStrDoor;
    d0.set(i);
    d1.set(KINDS_A[i & 3]);
    d2.set('/i/' + i);
    d3.set('Task ' + i);
    d4.set(AUTHORS_A[i & 7]);
    d5.set(1000 + i);
    d6.set('n' + i);
    d7.set('ok ' + i);
};

const PROTOTYPE_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const P = EXO_STR_DOOR_B;
    const d0 = { __proto__: P, slots, write: WB_ID, at: IB_ID } as unknown as TExoStrDoor;
    const d1 = { __proto__: P, slots, write: WB_KIND, at: IB_KIND } as unknown as TExoStrDoor;
    const d2 = { __proto__: P, slots, write: WB_HREF, at: IB_HREF } as unknown as TExoStrDoor;
    const d3 = { __proto__: P, slots, write: WB_LABEL, at: IB_LABEL } as unknown as TExoStrDoor;
    const d4 = { __proto__: P, slots, write: WB_BY, at: IB_BY } as unknown as TExoStrDoor;
    const d5 = { __proto__: P, slots, write: WB_N, at: IB_N } as unknown as TExoStrDoor;
    const d6 = { __proto__: P, slots, write: WB_NOTE, at: IB_NOTE } as unknown as TExoStrDoor;
    const d7 = { __proto__: P, slots, write: WB_TAIL, at: IB_TAIL } as unknown as TExoStrDoor;
    d0.set(i);
    d1.set(KINDS_B[i & 3]);
    d2.set('/i/' + i);
    d3.set('Task ' + i);
    d4.set(AUTHORS_B[i & 7]);
    d5.set(1000 + i);
    d6.set('n' + i);
    d7.set('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 4 — THE CONSTRUCTOR. The prototype arm's object, allocated through `new` instead of through a
// literal with a `__proto__:` key. One constructor frame per port per instance; no spelling omits it.
// ---------------------------------------------------------------------------------------

class ExoStrDoorCtorA {
    readonly slots: string[];
    readonly write: TExoStrWriter;
    readonly at: number;

    constructor(slots: string[], write: TExoStrWriter, at: number) {
        this.slots = slots;
        this.write = write;
        this.at = at;
    }

    set(value: unknown): void {
        this.slots[this.at] = this.write(value);
    }
}

class ExoStrDoorCtorB {
    readonly slots: string[];
    readonly write: TExoStrWriter;
    readonly at: number;

    constructor(slots: string[], write: TExoStrWriter, at: number) {
        this.slots = slots;
        this.write = write;
        this.at = at;
    }

    set(value: unknown): void {
        this.slots[this.at] = this.write(value);
    }
}

const CTOR_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const D = ExoStrDoorCtorA;
    const d0 = new D(slots, WA_ID, IA_ID);
    const d1 = new D(slots, WA_KIND, IA_KIND);
    const d2 = new D(slots, WA_HREF, IA_HREF);
    const d3 = new D(slots, WA_LABEL, IA_LABEL);
    const d4 = new D(slots, WA_BY, IA_BY);
    const d5 = new D(slots, WA_N, IA_N);
    const d6 = new D(slots, WA_NOTE, IA_NOTE);
    const d7 = new D(slots, WA_TAIL, IA_TAIL);
    d0.set(i);
    d1.set(KINDS_A[i & 3]);
    d2.set('/i/' + i);
    d3.set('Task ' + i);
    d4.set(AUTHORS_A[i & 7]);
    d5.set(1000 + i);
    d6.set('n' + i);
    d7.set('ok ' + i);
};

const CTOR_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const D = ExoStrDoorCtorB;
    const d0 = new D(slots, WB_ID, IB_ID);
    const d1 = new D(slots, WB_KIND, IB_KIND);
    const d2 = new D(slots, WB_HREF, IB_HREF);
    const d3 = new D(slots, WB_LABEL, IB_LABEL);
    const d4 = new D(slots, WB_BY, IB_BY);
    const d5 = new D(slots, WB_N, IB_N);
    const d6 = new D(slots, WB_NOTE, IB_NOTE);
    const d7 = new D(slots, WB_TAIL, IB_TAIL);
    d0.set(i);
    d1.set(KINDS_B[i & 3]);
    d2.set('/i/' + i);
    d3.set('Task ' + i);
    d4.set(AUTHORS_B[i & 7]);
    d5.set(1000 + i);
    d6.set('n' + i);
    d7.set('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 5 — THE REBOUND HANDLE, and the backend fact that shapes it: nothing is pooled, so
// `portTable()` hands every row ITS OWN array (`renderExoStrInstance.ts` builds an exonode per
// instance, `exo-str-instance-factory.ts` a `values` per exonode). `write` and `at` ARE constant, the
// table is not, so the eight handles are built once and only their `slots` is re-pointed per row:
// eight stores where the prototype arm has eight allocations. `gateTablePerRow` proves the premise.
// ---------------------------------------------------------------------------------------

/** The prototype arm's handle with the ONE field that changes per row left writable. */
interface TExoStrDoorRebound {
    slots: string[];
    readonly write: TExoStrWriter;
    readonly at: number;
    set(value: unknown): void;
}

const EXO_STR_REBIND_A = {
    set(this: TExoStrDoorRebound, value: unknown): void {
        this.slots[this.at] = this.write(value);
    },
};

const EXO_STR_REBIND_B = {
    set(this: TExoStrDoorRebound, value: unknown): void {
        this.slots[this.at] = this.write(value);
    },
};

// A STRING in each, so the placeholder's element kind is a real table's and the first re-point is
// not a field-type generalisation.
const NO_SLOTS_A: string[] = [''];
const NO_SLOTS_B: string[] = [''];

const R0_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_ID,
    at: IA_ID,
} as unknown as TExoStrDoorRebound;
const R1_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_KIND,
    at: IA_KIND,
} as unknown as TExoStrDoorRebound;
const R2_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_HREF,
    at: IA_HREF,
} as unknown as TExoStrDoorRebound;
const R3_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_LABEL,
    at: IA_LABEL,
} as unknown as TExoStrDoorRebound;
const R4_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_BY,
    at: IA_BY,
} as unknown as TExoStrDoorRebound;
const R5_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_N,
    at: IA_N,
} as unknown as TExoStrDoorRebound;
const R6_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_NOTE,
    at: IA_NOTE,
} as unknown as TExoStrDoorRebound;
const R7_A = {
    __proto__: EXO_STR_REBIND_A,
    slots: NO_SLOTS_A,
    write: WA_TAIL,
    at: IA_TAIL,
} as unknown as TExoStrDoorRebound;

const R0_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_ID,
    at: IB_ID,
} as unknown as TExoStrDoorRebound;
const R1_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_KIND,
    at: IB_KIND,
} as unknown as TExoStrDoorRebound;
const R2_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_HREF,
    at: IB_HREF,
} as unknown as TExoStrDoorRebound;
const R3_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_LABEL,
    at: IB_LABEL,
} as unknown as TExoStrDoorRebound;
const R4_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_BY,
    at: IB_BY,
} as unknown as TExoStrDoorRebound;
const R5_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_N,
    at: IB_N,
} as unknown as TExoStrDoorRebound;
const R6_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_NOTE,
    at: IB_NOTE,
} as unknown as TExoStrDoorRebound;
const R7_B = {
    __proto__: EXO_STR_REBIND_B,
    slots: NO_SLOTS_B,
    write: WB_TAIL,
    at: IB_TAIL,
} as unknown as TExoStrDoorRebound;

const REBOUND_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const d0 = R0_A;
    const d1 = R1_A;
    const d2 = R2_A;
    const d3 = R3_A;
    const d4 = R4_A;
    const d5 = R5_A;
    const d6 = R6_A;
    const d7 = R7_A;
    d0.slots = slots;
    d1.slots = slots;
    d2.slots = slots;
    d3.slots = slots;
    d4.slots = slots;
    d5.slots = slots;
    d6.slots = slots;
    d7.slots = slots;
    d0.set(i);
    d1.set(KINDS_A[i & 3]);
    d2.set('/i/' + i);
    d3.set('Task ' + i);
    d4.set(AUTHORS_A[i & 7]);
    d5.set(1000 + i);
    d6.set('n' + i);
    d7.set('ok ' + i);
};

const REBOUND_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const d0 = R0_B;
    const d1 = R1_B;
    const d2 = R2_B;
    const d3 = R3_B;
    const d4 = R4_B;
    const d5 = R5_B;
    const d6 = R6_B;
    const d7 = R7_B;
    d0.slots = slots;
    d1.slots = slots;
    d2.slots = slots;
    d3.slots = slots;
    d4.slots = slots;
    d5.slots = slots;
    d6.slots = slots;
    d7.slots = slots;
    d0.set(i);
    d1.set(KINDS_B[i & 3]);
    d2.set('/i/' + i);
    d3.set('Task ' + i);
    d4.set(AUTHORS_B[i & 7]);
    d5.set(1000 + i);
    d6.set('n' + i);
    d7.set('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 6 — THE ACCESSOR. Eight setters installed ONCE per family on one prototype, each with its
// port's writer and slot captured, so a write is a STORE and neither the writer nor the index is
// looked up. The receiver is a module-level row re-pointed per instance, NOT the rendered instance:
// every instance's prototype is the backend object (`exo-str-instance-factory.ts:33`), which all
// eighteen programs render through, so installing accessors there would change the map of every instance in
// every arm on this axis. `classNode` builds its own receiver with `new` for the same reason.
// ---------------------------------------------------------------------------------------

/** The eight port names as write-only positions, plus the one field a setter reads off `this`. */
interface TExoStrAccessorRow {
    values: string[];
    id: unknown;
    kind: unknown;
    href: unknown;
    label: unknown;
    by: unknown;
    n: unknown;
    note: unknown;
    tail: unknown;
}

const ACCESSOR_PROTO_A = {};

Object.defineProperty(ACCESSOR_PROTO_A, 'id', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_ID] = WA_ID(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'kind', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_KIND] = WA_KIND(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'href', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_HREF] = WA_HREF(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'label', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_LABEL] = WA_LABEL(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'by', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_BY] = WA_BY(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'n', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_N] = WA_N(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'note', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_NOTE] = WA_NOTE(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_A, 'tail', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IA_TAIL] = WA_TAIL(value);
    },
});

const ACCESSOR_PROTO_B = {};

Object.defineProperty(ACCESSOR_PROTO_B, 'id', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_ID] = WB_ID(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'kind', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_KIND] = WB_KIND(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'href', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_HREF] = WB_HREF(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'label', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_LABEL] = WB_LABEL(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'by', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_BY] = WB_BY(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'n', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_N] = WB_N(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'note', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_NOTE] = WB_NOTE(value);
    },
});
Object.defineProperty(ACCESSOR_PROTO_B, 'tail', {
    set(this: TExoStrAccessorRow, value: unknown): void {
        this.values[IB_TAIL] = WB_TAIL(value);
    },
});

const ACCESSOR_ROW_A = {
    __proto__: ACCESSOR_PROTO_A,
    values: NO_SLOTS_A,
} as unknown as TExoStrAccessorRow;

const ACCESSOR_ROW_B = {
    __proto__: ACCESSOR_PROTO_B,
    values: NO_SLOTS_B,
} as unknown as TExoStrAccessorRow;

const ACCESSOR_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const row = ACCESSOR_ROW_A;
    row.values = c.portTable() as unknown as string[];
    row.id = i;
    row.kind = KINDS_A[i & 3];
    row.href = '/i/' + i;
    row.label = 'Task ' + i;
    row.by = AUTHORS_A[i & 7];
    row.n = 1000 + i;
    row.note = 'n' + i;
    row.tail = 'ok ' + i;
};

const ACCESSOR_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const row = ACCESSOR_ROW_B;
    row.values = c.portTable() as unknown as string[];
    row.id = i;
    row.kind = KINDS_B[i & 3];
    row.href = '/i/' + i;
    row.label = 'Task ' + i;
    row.by = AUTHORS_B[i & 7];
    row.n = 1000 + i;
    row.note = 'n' + i;
    row.tail = 'ok ' + i;
};

// ---------------------------------------------------------------------------------------
// ARM 7 — THE PROTOTYPE PORT METHOD. One method per port, installed once per DECLARATION in one
// literal, with the slot as a literal and NOTHING captured: the writer arrives through `this`, so the
// same eight bodies serve any backend — `gateProtoPortIsBackendAgnostic` renders them through a
// second backend with a second schema and compares the bytes.
//
// IT REACHES THE WRITER THROUGH `this.writers[LITERAL]`, WHICH IS A TABLE, AND THE SPEC SAID NOT A
// TABLE. On this backend an attribute writer is shared per NAME and carries it
// (`exo-writer-for-port.ts:46`), so a per-kind method like `this.writeText(v)` cannot produce the
// four attribute ports' bytes and would not be the schema's writer — which the schema gate exists to
// refuse. The table load is the arm's cost and is counted as one; what survives intact is the point:
// nothing is closed over and nothing is baked per backend.
// ---------------------------------------------------------------------------------------

interface TExoStrPortRow {
    values: string[];
    writers: readonly TExoStrWriter[];
    id(value: unknown): void;
    kind(value: unknown): void;
    href(value: unknown): void;
    label(value: unknown): void;
    by(value: unknown): void;
    n(value: unknown): void;
    note(value: unknown): void;
    tail(value: unknown): void;
}

const NO_WRITER_A: TExoStrWriter = () => '';
const NO_WRITER_B: TExoStrWriter = () => '';
const NO_WRITERS_A: readonly TExoStrWriter[] = [NO_WRITER_A];
const NO_WRITERS_B: readonly TExoStrWriter[] = [NO_WRITER_B];

const EXO_STR_PORT_METHODS_A = {
    id(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_ID] = this.writers[IA_ID](value);
    },
    kind(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_KIND] = this.writers[IA_KIND](value);
    },
    href(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_HREF] = this.writers[IA_HREF](value);
    },
    label(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_LABEL] = this.writers[IA_LABEL](value);
    },
    by(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_BY] = this.writers[IA_BY](value);
    },
    n(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_N] = this.writers[IA_N](value);
    },
    note(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_NOTE] = this.writers[IA_NOTE](value);
    },
    tail(this: TExoStrPortRow, value: unknown): void {
        this.values[IA_TAIL] = this.writers[IA_TAIL](value);
    },
};

const EXO_STR_PORT_METHODS_B = {
    id(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_ID] = this.writers[IB_ID](value);
    },
    kind(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_KIND] = this.writers[IB_KIND](value);
    },
    href(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_HREF] = this.writers[IB_HREF](value);
    },
    label(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_LABEL] = this.writers[IB_LABEL](value);
    },
    by(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_BY] = this.writers[IB_BY](value);
    },
    n(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_N] = this.writers[IB_N](value);
    },
    note(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_NOTE] = this.writers[IB_NOTE](value);
    },
    tail(this: TExoStrPortRow, value: unknown): void {
        this.values[IB_TAIL] = this.writers[IB_TAIL](value);
    },
};

const PORT_ROW_A = {
    __proto__: EXO_STR_PORT_METHODS_A,
    values: NO_SLOTS_A,
    writers: NO_WRITERS_A,
} as unknown as TExoStrPortRow;

const PORT_ROW_B = {
    __proto__: EXO_STR_PORT_METHODS_B,
    values: NO_SLOTS_B,
    writers: NO_WRITERS_B,
} as unknown as TExoStrPortRow;

const PROTOPORT_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const row = PORT_ROW_A;
    row.values = c.portTable() as unknown as string[];
    row.writers = c.writers;
    row.id(i);
    row.kind(KINDS_A[i & 3]);
    row.href('/i/' + i);
    row.label('Task ' + i);
    row.by(AUTHORS_A[i & 7]);
    row.n(1000 + i);
    row.note('n' + i);
    row.tail('ok ' + i);
};

const PROTOPORT_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const row = PORT_ROW_B;
    row.values = c.portTable() as unknown as string[];
    row.writers = c.writers;
    row.id(i);
    row.kind(KINDS_B[i & 3]);
    row.href('/i/' + i);
    row.label('Task ' + i);
    row.by(AUTHORS_B[i & 7]);
    row.n(1000 + i);
    row.note('n' + i);
    row.tail('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 8 — THE CLASS NODE. The instance IS the node: built with `new`, its class prototype carries
// the port methods (once per schema) and THAT prototype's prototype carries the writes, so a body
// reaches its writer TWO PROTOTYPE HOPS from the receiver — the question no other arm asks.
//
// ALL EIGHT WRITERS SIT ON THE FAR OBJECT ON PURPOSE. In a real composition the four per-name
// attribute writers would live on the per-schema prototype at ONE hop and only the per-kind text
// writer at two; putting all eight at two hops measures the hop at full strength and makes this arm
// an UPPER BOUND on what the design pays, rather than a diluted average over four ports.
//
// IT ALLOCATES ONE OBJECT PER INSTANCE THAT THE DESIGN WOULD NOT. In the design the class instance
// REPLACES the node `createExoStrInstanceFactory` builds; here it is built beside it, because
// `schema.createInstance` belongs to the backend and a second backend would mean a second schema.
// ---------------------------------------------------------------------------------------

const EXO_STR_NODE_BACKEND_A = {
    writeId: WA_ID,
    writeKind: WA_KIND,
    writeHref: WA_HREF,
    writeLabel: WA_LABEL,
    writeBy: WA_BY,
    writeN: WA_N,
    writeNote: WA_NOTE,
    writeTail: WA_TAIL,
};

const EXO_STR_NODE_BACKEND_B = {
    writeId: WB_ID,
    writeKind: WB_KIND,
    writeHref: WB_HREF,
    writeLabel: WB_LABEL,
    writeBy: WB_BY,
    writeN: WB_N,
    writeNote: WB_NOTE,
    writeTail: WB_TAIL,
};

class ExoStrRowNodeA {
    readonly values: string[];

    declare writeId: TExoStrWriter;
    declare writeKind: TExoStrWriter;
    declare writeHref: TExoStrWriter;
    declare writeLabel: TExoStrWriter;
    declare writeBy: TExoStrWriter;
    declare writeN: TExoStrWriter;
    declare writeNote: TExoStrWriter;
    declare writeTail: TExoStrWriter;

    constructor(values: string[]) {
        this.values = values;
    }

    id(value: unknown): void {
        this.values[IA_ID] = this.writeId(value);
    }
    kind(value: unknown): void {
        this.values[IA_KIND] = this.writeKind(value);
    }
    href(value: unknown): void {
        this.values[IA_HREF] = this.writeHref(value);
    }
    label(value: unknown): void {
        this.values[IA_LABEL] = this.writeLabel(value);
    }
    by(value: unknown): void {
        this.values[IA_BY] = this.writeBy(value);
    }
    n(value: unknown): void {
        this.values[IA_N] = this.writeN(value);
    }
    note(value: unknown): void {
        this.values[IA_NOTE] = this.writeNote(value);
    }
    tail(value: unknown): void {
        this.values[IA_TAIL] = this.writeTail(value);
    }
}

class ExoStrRowNodeB {
    readonly values: string[];

    declare writeId: TExoStrWriter;
    declare writeKind: TExoStrWriter;
    declare writeHref: TExoStrWriter;
    declare writeLabel: TExoStrWriter;
    declare writeBy: TExoStrWriter;
    declare writeN: TExoStrWriter;
    declare writeNote: TExoStrWriter;
    declare writeTail: TExoStrWriter;

    constructor(values: string[]) {
        this.values = values;
    }

    id(value: unknown): void {
        this.values[IB_ID] = this.writeId(value);
    }
    kind(value: unknown): void {
        this.values[IB_KIND] = this.writeKind(value);
    }
    href(value: unknown): void {
        this.values[IB_HREF] = this.writeHref(value);
    }
    label(value: unknown): void {
        this.values[IB_LABEL] = this.writeLabel(value);
    }
    by(value: unknown): void {
        this.values[IB_BY] = this.writeBy(value);
    }
    n(value: unknown): void {
        this.values[IB_N] = this.writeN(value);
    }
    note(value: unknown): void {
        this.values[IB_NOTE] = this.writeNote(value);
    }
    tail(value: unknown): void {
        this.values[IB_TAIL] = this.writeTail(value);
    }
}

Object.setPrototypeOf(ExoStrRowNodeA.prototype, EXO_STR_NODE_BACKEND_A);
Object.setPrototypeOf(ExoStrRowNodeB.prototype, EXO_STR_NODE_BACKEND_B);

const CLASSNODE_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const en = new ExoStrRowNodeA(c.portTable() as unknown as string[]);
    en.id(i);
    en.kind(KINDS_A[i & 3]);
    en.href('/i/' + i);
    en.label('Task ' + i);
    en.by(AUTHORS_A[i & 7]);
    en.n(1000 + i);
    en.note('n' + i);
    en.tail('ok ' + i);
};

const CLASSNODE_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const en = new ExoStrRowNodeB(c.portTable() as unknown as string[]);
    en.id(i);
    en.kind(KINDS_B[i & 3]);
    en.href('/i/' + i);
    en.label('Task ' + i);
    en.by(AUTHORS_B[i & 7]);
    en.n(1000 + i);
    en.note('n' + i);
    en.tail('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 9 — THE CLOSURE. One function object per port per instance.
//
// THE EIGHT CLOSURES ARE WRITTEN OUT AND NOT BUILT IN A LOOP, and that is `door-count`'s rule
// applied to a different subject: a loop over an array of bodies gives ONE `SharedFunctionInfo`
// instantiated eight times — one compiled body, one feedback vector, one inline-cache set — and that
// is not what eight distinct per-port doors cost. It is also the whole of THE ONE CONFOUND named in
// the header: eight textual bodies are eight call sites, each monomorphic on its own writer, where
// the walk, the prototype and the ctor each have ONE site that sees all eight writers.
//
// THE INDEX AND THE WRITER ARE CAPTURED, NOT LITERAL. `slots[IA_ID] = WA_ID(v)` reads two
// module-level bindings and one wire-local; writing `slots[0] = WA_ID(v)` would hand this arm a
// compile-time constant that a library handing out per-port closures from one factory could never
// give it, and the comparison would be against a program nobody can write. A CLOSURE WHOSE INDEX
// IS A LITERAL IS A SIXTH SPELLING AND IS NOT MEASURED HERE.
//
// THE EIGHT SHARE ONE CONTEXT, holding the one wire-local they all capture (`slots`). That is one
// context per instance, not per port, and the CENSUS says so.
//
// TWO FRAMES per write (the closure, then the writer).
// ---------------------------------------------------------------------------------------

const CLOSURE_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const d0 = (v: unknown): void => {
        slots[IA_ID] = WA_ID(v);
    };
    const d1 = (v: unknown): void => {
        slots[IA_KIND] = WA_KIND(v);
    };
    const d2 = (v: unknown): void => {
        slots[IA_HREF] = WA_HREF(v);
    };
    const d3 = (v: unknown): void => {
        slots[IA_LABEL] = WA_LABEL(v);
    };
    const d4 = (v: unknown): void => {
        slots[IA_BY] = WA_BY(v);
    };
    const d5 = (v: unknown): void => {
        slots[IA_N] = WA_N(v);
    };
    const d6 = (v: unknown): void => {
        slots[IA_NOTE] = WA_NOTE(v);
    };
    const d7 = (v: unknown): void => {
        slots[IA_TAIL] = WA_TAIL(v);
    };
    d0(i);
    d1(KINDS_A[i & 3]);
    d2('/i/' + i);
    d3('Task ' + i);
    d4(AUTHORS_A[i & 7]);
    d5(1000 + i);
    d6('n' + i);
    d7('ok ' + i);
};

const CLOSURE_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const d0 = (v: unknown): void => {
        slots[IB_ID] = WB_ID(v);
    };
    const d1 = (v: unknown): void => {
        slots[IB_KIND] = WB_KIND(v);
    };
    const d2 = (v: unknown): void => {
        slots[IB_HREF] = WB_HREF(v);
    };
    const d3 = (v: unknown): void => {
        slots[IB_LABEL] = WB_LABEL(v);
    };
    const d4 = (v: unknown): void => {
        slots[IB_BY] = WB_BY(v);
    };
    const d5 = (v: unknown): void => {
        slots[IB_N] = WB_N(v);
    };
    const d6 = (v: unknown): void => {
        slots[IB_NOTE] = WB_NOTE(v);
    };
    const d7 = (v: unknown): void => {
        slots[IB_TAIL] = WB_TAIL(v);
    };
    d0(i);
    d1(KINDS_B[i & 3]);
    d2('/i/' + i);
    d3('Task ' + i);
    d4(AUTHORS_B[i & 7]);
    d5(1000 + i);
    d6('n' + i);
    d7('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// ARM 10 — THE ESCAPED CLOSURE. The closure arm with its eight handles stored where `gateEscape`
// reads them afterwards, so TurboFan may not remove them. Preallocated and overwritten in place: the
// escape route is eight element stores per instance in every round, never a growing heap.
// ---------------------------------------------------------------------------------------

type TExoStrDoorFn = (value: unknown) => void;

const NOOP_A: TExoStrDoorFn = () => {};
const NOOP_B: TExoStrDoorFn = () => {};

const ESCAPED_SINK_A: TExoStrDoorFn[] = [
    NOOP_A,
    NOOP_A,
    NOOP_A,
    NOOP_A,
    NOOP_A,
    NOOP_A,
    NOOP_A,
    NOOP_A,
];

const ESCAPED_SINK_B: TExoStrDoorFn[] = [
    NOOP_B,
    NOOP_B,
    NOOP_B,
    NOOP_B,
    NOOP_B,
    NOOP_B,
    NOOP_B,
    NOOP_B,
];

const ESCAPED_A: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const keep = ESCAPED_SINK_A;
    const d0 = (v: unknown): void => {
        slots[IA_ID] = WA_ID(v);
    };
    const d1 = (v: unknown): void => {
        slots[IA_KIND] = WA_KIND(v);
    };
    const d2 = (v: unknown): void => {
        slots[IA_HREF] = WA_HREF(v);
    };
    const d3 = (v: unknown): void => {
        slots[IA_LABEL] = WA_LABEL(v);
    };
    const d4 = (v: unknown): void => {
        slots[IA_BY] = WA_BY(v);
    };
    const d5 = (v: unknown): void => {
        slots[IA_N] = WA_N(v);
    };
    const d6 = (v: unknown): void => {
        slots[IA_NOTE] = WA_NOTE(v);
    };
    const d7 = (v: unknown): void => {
        slots[IA_TAIL] = WA_TAIL(v);
    };
    keep[0] = d0;
    keep[1] = d1;
    keep[2] = d2;
    keep[3] = d3;
    keep[4] = d4;
    keep[5] = d5;
    keep[6] = d6;
    keep[7] = d7;
    d0(i);
    d1(KINDS_A[i & 3]);
    d2('/i/' + i);
    d3('Task ' + i);
    d4(AUTHORS_A[i & 7]);
    d5(1000 + i);
    d6('n' + i);
    d7('ok ' + i);
};

const ESCAPED_B: TExoMachineInitialState<TExoStrNode> = (c, i) => {
    const slots = c.portTable() as unknown as string[];
    const keep = ESCAPED_SINK_B;
    const d0 = (v: unknown): void => {
        slots[IB_ID] = WB_ID(v);
    };
    const d1 = (v: unknown): void => {
        slots[IB_KIND] = WB_KIND(v);
    };
    const d2 = (v: unknown): void => {
        slots[IB_HREF] = WB_HREF(v);
    };
    const d3 = (v: unknown): void => {
        slots[IB_LABEL] = WB_LABEL(v);
    };
    const d4 = (v: unknown): void => {
        slots[IB_BY] = WB_BY(v);
    };
    const d5 = (v: unknown): void => {
        slots[IB_N] = WB_N(v);
    };
    const d6 = (v: unknown): void => {
        slots[IB_NOTE] = WB_NOTE(v);
    };
    const d7 = (v: unknown): void => {
        slots[IB_TAIL] = WB_TAIL(v);
    };
    keep[0] = d0;
    keep[1] = d1;
    keep[2] = d2;
    keep[3] = d3;
    keep[4] = d4;
    keep[5] = d5;
    keep[6] = d6;
    keep[7] = d7;
    d0(i);
    d1(KINDS_B[i & 3]);
    d2('/i/' + i);
    d3('Task ' + i);
    d4(AUTHORS_B[i & 7]);
    d5(1000 + i);
    d6('n' + i);
    d7('ok ' + i);
};

// ---------------------------------------------------------------------------------------
// THE COMPONENTS AND THE LISTS. Six wires per family over ONE schema per family.
//
// EVERY ARM IS PACKAGED THE SAME WAY — a machine literal with the wire in `wire`, which
// is what the JSX compiler emits. That matters here more than anywhere else in the file: the nine
// spellings are priced AGAINST EACH OTHER, so if one of them reached its instance through a
// different construction the column would be reporting the construction and not the spelling.
// ---------------------------------------------------------------------------------------

const C_WALK_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: WALK_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_WALK_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: WALK_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_PROTO_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: PROTOTYPE_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_PROTO_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: PROTOTYPE_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_CTOR_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: CTOR_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_CTOR_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: CTOR_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_REB_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: REBOUND_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_REB_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: REBOUND_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_ACC_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: ACCESSOR_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_ACC_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: ACCESSOR_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_PP_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: PROTOPORT_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_PP_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: PROTOPORT_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_CN_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: CLASSNODE_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_CN_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: CLASSNODE_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_CLOS_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: CLOSURE_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_CLOS_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: CLOSURE_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_ESC_A: TExoStrMachine = {
    declaration: S_A,
    forms: S_A_FORMS,
    createInitialState: ESCAPED_A,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const C_ESC_B: TExoStrMachine = {
    declaration: S_B,
    forms: S_B_FORMS,
    createInitialState: ESCAPED_B,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

const LIST_WALK_A = listOver(C_WALK_A);
const LIST_WALK_B = listOver(C_WALK_B);
const LIST_PROTO_A = listOver(C_PROTO_A);
const LIST_PROTO_B = listOver(C_PROTO_B);
const LIST_CTOR_A = listOver(C_CTOR_A);
const LIST_CTOR_B = listOver(C_CTOR_B);
const LIST_REB_A = listOver(C_REB_A);
const LIST_REB_B = listOver(C_REB_B);
const LIST_ACC_A = listOver(C_ACC_A);
const LIST_ACC_B = listOver(C_ACC_B);
const LIST_PP_A = listOver(C_PP_A);
const LIST_PP_B = listOver(C_PP_B);
const LIST_CN_A = listOver(C_CN_A);
const LIST_CN_B = listOver(C_CN_B);
const LIST_CLOS_A = listOver(C_CLOS_A);
const LIST_CLOS_B = listOver(C_CLOS_B);
const LIST_ESC_A = listOver(C_ESC_A);
const LIST_ESC_B = listOver(C_ESC_B);

// ---------------------------------------------------------------------------------------

interface Program {
    readonly name: string;
    readonly arm: Arm;
    readonly twin: boolean;
    /**
     * ENCLOSING CALL FRAMES PER PORT WRITE, counted by hand from the source and PRINTED IN THE
     * TABLE. See the frame-count block in the header: this column exists because two published
     * ladders compared one frame against two and called the difference a strategy.
     */
    readonly frames: number;
    /**
     * ENCLOSING CALL FRAMES PER INSTANCE THAT DO NOT ENCLOSE A PORT WRITE — the handle arms'
     * `portTable()` call, which the walk never makes, and the ctor arm's constructors.
     */
    readonly framesPerInstance: number;
    /** Handles allocated per instance, as a phrase. Read off this file, not measured. */
    readonly perInstance: string;
    readonly what: string;
    readonly run: () => string;
}

function rowName(arm: Arm, twin: boolean): string {
    return `${arm}${twin ? '·twin' : ''}`;
}

const PROGRAMS: readonly Program[] = [
    {
        name: rowName('floor', false),
        arm: 'floor',
        twin: false,
        frames: 1,
        framesPerInstance: 0,
        perInstance: 'nothing',
        what:
            'THE NATIVE FLOOR — straight-line += with the shipped escapers, no component, no ' +
            'schema, no connector, no port. ONE frame per write, by construction, and never used ' +
            "as another arm's control",
        run: floorA,
    },
    {
        name: rowName('floor', true),
        arm: 'floor',
        twin: true,
        frames: 1,
        framesPerInstance: 0,
        perInstance: 'nothing',
        what: 'the same program declared again — its own pieces, its own author and kind arrays',
        run: floorB,
    },
    {
        name: rowName('walk', false),
        arm: 'walk',
        twin: false,
        frames: 2,
        framesPerInstance: 0,
        perInstance: 'nothing',
        what:
            'THE SHIPPED DOOR — c.attr(port, v) and c.text(port, v), whose body resolves the ' +
            'address on every write out of port.index and two arrays. Nothing per port, nothing ' +
            'per instance, and NO portTable() call: it is the only door arm with fr/i 0. fr 2 is ' +
            'the attr ports; the four text ports are 3, text being one call to attr',
        run: (): string => EXO_STR.render(LIST_WALK_A),
    },
    {
        name: rowName('walk', true),
        arm: 'walk',
        twin: true,
        frames: 2,
        framesPerInstance: 0,
        perInstance: 'nothing',
        what: 'the same wire declared again, over its own declaration, schema, writers and connector pool',
        run: (): string => EXO_STR.render(LIST_WALK_B),
    },
    {
        name: rowName('prototype', false),
        arm: 'prototype',
        twin: false,
        frames: 2,
        framesPerInstance: 1,
        perInstance: `${PORTS} objects (3 fields each) + 1 portTable() call`,
        what:
            'ONE SHARED METHOD, ADDRESS IN THE RECEIVER — { __proto__: DOOR, slots, write, at } ' +
            'per port per instance, called w.set(v); the method exists ONCE in the process',
        run: (): string => EXO_STR.render(LIST_PROTO_A),
    },
    {
        name: rowName('prototype', true),
        arm: 'prototype',
        twin: true,
        frames: 2,
        framesPerInstance: 1,
        perInstance: `${PORTS} objects (3 fields each) + 1 portTable() call`,
        what: 'the same arm declared again, with its own prototype object and its own method',
        run: (): string => EXO_STR.render(LIST_PROTO_B),
    },
    {
        name: rowName('ctor', false),
        arm: 'ctor',
        twin: false,
        frames: 2,
        framesPerInstance: 9,
        perInstance:
            `${PORTS} objects (3 fields each) + ${PORTS} constructor frames + ` +
            '1 portTable() call',
        what:
            'THE SAME SHAPE ALLOCATED THROUGH A CONSTRUCTOR — new ExoStrDoorConstructor(slots, write, at) ' +
            'per port per instance, called w.set(v). Same three fields, same shared method, same ' +
            'ONE megamorphic writer site as `prototype`; the object gets a fixed initial map ' +
            'instead of having a prototype installed onto a literal. IT SPENDS ONE CONSTRUCTOR ' +
            'FRAME PER PORT PER INSTANCE THAT NO OTHER ARM PAYS — the fr column counts the WRITE ' +
            'path, and at exactly one write per port this arm’s total is 3 frames per port write ' +
            'against every other door’s 2',
        run: (): string => EXO_STR.render(LIST_CTOR_A),
    },
    {
        name: rowName('ctor', true),
        arm: 'ctor',
        twin: true,
        frames: 2,
        framesPerInstance: 9,
        perInstance:
            `${PORTS} objects (3 fields each) + ${PORTS} constructor frames + ` +
            '1 portTable() call',
        what: 'the same arm declared again, with its own class and its own constructor and method',
        run: (): string => EXO_STR.render(LIST_CTOR_B),
    },
    {
        name: rowName('rebound', false),
        arm: 'rebound',
        twin: false,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            `NO ALLOCATION — the ${PORTS} handles are built at module load and REUSED; per ` +
            `instance it stores the row's table into ${PORTS} of them (1 portTable() call, ` +
            `${PORTS} module-binding loads, ${PORTS} field stores)`,
        what:
            'THE PROTOTYPE ARM WITH THE ALLOCATION REMOVED — the same three-field handle, the ' +
            'same shared method, the same ONE megamorphic writer site, built once and re-pointed ' +
            'at each row’s table (`write` and `at` are module-level constants; the table is NOT, ' +
            'because every instance owns its own — see `the port table` gate). Eight field ' +
            'stores where `prototype` has eight allocations. THE STORES ARE OLD-TO-YOUNG (a ' +
            'long-lived handle taking a young array), which is the write barrier’s expensive ' +
            'direction, and that is the term fused into every comparison it appears in',
        run: (): string => EXO_STR.render(LIST_REB_A),
    },
    {
        name: rowName('rebound', true),
        arm: 'rebound',
        twin: true,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            `NO ALLOCATION — the ${PORTS} handles are built at module load and REUSED; per ` +
            `instance it stores the row's table into ${PORTS} of them (1 portTable() call, ` +
            `${PORTS} module-binding loads, ${PORTS} field stores)`,
        what:
            'the same arm declared again, with its own shared method object and its own eight ' +
            'handles',
        run: (): string => EXO_STR.render(LIST_REB_B),
    },
    {
        name: rowName('accessor', false),
        arm: 'accessor',
        twin: false,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            'NO ALLOCATION — one prototype, eight setters and one receiver PER FAMILY, installed ' +
            'at module load; per instance one portTable() call and ONE store',
        what:
            'A WRITE IS A STORE — eight accessors on one prototype, each with its writer and its ' +
            'slot captured, so neither is looked up: `row.label = v` runs `this.values[IA_LABEL] ' +
            '= WA_LABEL(v)`. IT IS THE ONE ARM WHOSE ENCLOSING FRAME IS NOT ENTERED BY A CALL ' +
            'EXPRESSION — a property store dispatching through an accessor is not a method call ' +
            'and V8 need not treat it as one, which is the thing this arm exists to price. EIGHT ' +
            'MONOMORPHIC writer sites, like `closure` and unlike `walk`. The receiver is a ' +
            'module-level row, not the rendered instance: see the arm’s header',
        run: (): string => EXO_STR.render(LIST_ACC_A),
    },
    {
        name: rowName('accessor', true),
        arm: 'accessor',
        twin: true,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            'NO ALLOCATION — one prototype, eight setters and one receiver PER FAMILY, installed ' +
            'at module load; per instance one portTable() call and ONE store',
        what:
            'the same arm declared again, with its own prototype, its own eight setter bodies, ' +
            'its own defineProperty calls and its own receiver',
        run: (): string => EXO_STR.render(LIST_ACC_B),
    },
    {
        name: rowName('protoPort', false),
        arm: 'protoPort',
        twin: false,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            'NO ALLOCATION — one prototype of eight methods and one receiver PER SCHEMA, built at ' +
            'module load; per instance one portTable() call, one `c.writers` read and TWO stores',
        what:
            'ONE METHOD PER PORT ON THE PROTOTYPE, NOTHING CAPTURED — `row.label(v)` runs ' +
            '`this.values[IA_LABEL] = this.writers[IA_LABEL](v)`, so the slot is a literal and ' +
            'the writer arrives through `this`. The same eight bodies serve ANY backend, which a ' +
            'gate proves by rendering them through a second one. It pays one in-object load and ' +
            'one element load per write where `accessor` pays one context-slot load, and one ' +
            'more store per instance. EIGHT MONOMORPHIC writer sites',
        run: (): string => EXO_STR.render(LIST_PP_A),
    },
    {
        name: rowName('protoPort', true),
        arm: 'protoPort',
        twin: true,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            'NO ALLOCATION — one prototype of eight methods and one receiver PER SCHEMA, built at ' +
            'module load; per instance one portTable() call, one `c.writers` read and TWO stores',
        what:
            'the same arm declared again, with its own prototype object, its own eight method ' +
            'bodies and its own receiver',
        run: (): string => EXO_STR.render(LIST_PP_B),
    },
    {
        name: rowName('classNode', false),
        arm: 'classNode',
        twin: false,
        frames: 2,
        framesPerInstance: 2,
        perInstance:
            '1 object of 1 field + 1 constructor frame + 1 portTable() call — AND THAT OBJECT IS ' +
            'ONE MORE THAN THE DESIGN WOULD ALLOCATE: in the design the class instance REPLACES ' +
            'the node the backend builds, here it is built beside it',
        what:
            'THE INSTANCE IS THE NODE — `new ExoStrRowNode(table)`, port methods on the CLASS ' +
            'prototype installed once per schema, and the writer reached TWO PROTOTYPE HOPS out ' +
            '(`this.writeLabel` misses on the class prototype and hits the object standing in for ' +
            'the composed backend). No table index in any body and nothing captured. ALL EIGHT ' +
            'WRITERS SIT AT TWO HOPS ON PURPOSE — in a real composition the four per-name ' +
            'attribute writers would sit at ONE, on the per-schema prototype — so this arm is an ' +
            'UPPER BOUND on the hop rather than an average over it',
        run: (): string => EXO_STR.render(LIST_CN_A),
    },
    {
        name: rowName('classNode', true),
        arm: 'classNode',
        twin: true,
        frames: 2,
        framesPerInstance: 2,
        perInstance:
            '1 object of 1 field + 1 constructor frame + 1 portTable() call — AND THAT OBJECT IS ' +
            'ONE MORE THAN THE DESIGN WOULD ALLOCATE: in the design the class instance REPLACES ' +
            'the node the backend builds, here it is built beside it',
        what:
            'the same arm declared again, with its own class, its own eight method bodies and ' +
            'its own backend stand-in',
        run: (): string => EXO_STR.render(LIST_CN_B),
    },
    {
        name: rowName('closure', false),
        arm: 'closure',
        twin: false,
        frames: 2,
        framesPerInstance: 1,
        perInstance: `${PORTS} function objects + 1 context + 1 portTable() call`,
        what:
            'ONE FUNCTION OBJECT PER PORT PER INSTANCE — eight textually distinct closures over one ' +
            'wire-local, called w(v). Eight monomorphic writer sites: see THE ONE CONFOUND',
        run: (): string => EXO_STR.render(LIST_CLOS_A),
    },
    {
        name: rowName('closure', true),
        arm: 'closure',
        twin: true,
        frames: 2,
        framesPerInstance: 1,
        perInstance: `${PORTS} function objects + 1 context + 1 portTable() call`,
        what: 'the same arm declared again, with its own eight closure bodies',
        run: (): string => EXO_STR.render(LIST_CLOS_B),
    },
    {
        name: rowName('escaped', false),
        arm: 'escaped',
        twin: false,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            `${PORTS} function objects THAT ESCAPE + 1 context + ${PORTS} stores into a ` +
            'module-level array + 1 portTable() call',
        what:
            'THE CLOSURE ARM WITH THE HANDLES ESCAPED — the same eight bodies, the same eight ' +
            'monomorphic writer sites, the same two frames per write, plus eight stores into a ' +
            'preallocated packed array of eight that `gateEscape` reads after the run, so escape ' +
            'analysis may not remove them. FUSED: the materialisation and the eight stores that ' +
            'force it cannot be separated on this axis',
        run: (): string => EXO_STR.render(LIST_ESC_A),
    },
    {
        name: rowName('escaped', true),
        arm: 'escaped',
        twin: true,
        frames: 2,
        framesPerInstance: 1,
        perInstance:
            `${PORTS} function objects THAT ESCAPE + 1 context + ${PORTS} stores into a ` +
            'module-level array + 1 portTable() call',
        what: 'the same arm declared again, with its own eight bodies and its own escape sink',
        run: (): string => EXO_STR.render(LIST_ESC_B),
    },
];

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until every program has been shown to produce THE SAME BYTES, and
// until the nine door arms of a family have been shown to render through THE SAME SCHEMA.
// ---------------------------------------------------------------------------------------

/** Named so the comparison reads as an intent rather than as an `===` buried in a condition. */
function want(a: string, b: string): boolean {
    return a === b;
}

function gateBytes(who: string, reference: string, got: string): void {
    if (want(reference, got)) {
        line(`gate door-shape/${who}: identical bytes — ${got.length} chars`);
        return;
    }
    let at = 0;
    while (at < reference.length && at < got.length && reference[at] === got[at]) at++;
    const from = Math.max(0, at - 60);
    refuse(
        `gate door-shape/${who}: DIFFERENT bytes — ${reference.length} chars (reference) / ` +
            `${got.length} chars (${who}), first difference at char ${at}\n` +
            `  reference: …${reference.slice(from, at + 120)}…\n` +
            `  ${who}   : …${got.slice(from, at + 120)}…`
    );
    throw new Error(
        `door-shape: "${who}" produces different bytes from the reference ` +
            `(${reference.length} vs ${got.length} chars, first difference at char ${at}) — the ` +
            'timings below would be comparing different programs, and on this axis a wrong byte ' +
            'is most likely a door that wrote the wrong slot'
    );
}

/**
 * THE SCHEMA GATE — the nine door arms of a family render through ONE schema, BY POINTER, and the
 * handle arms write through THE SAME WRITER FUNCTION OBJECTS the walk's `c.attr`/`c.text` calls.
 *
 * Without this, "the write itself is the same function in all nine" is a claim in a comment. With
 * it, a declaration change that silently gave one arm its own schema refuses the run instead of
 * shifting a median by the price of a second compilation.
 */
function gateSchemas(): string[] {
    const out: string[] = [];
    const families: ReadonlyArray<
        readonly [string, TExoCursorDeclaration<TRowPorts>, readonly TExoStrMachine[]]
    > = [
        [
            'A',
            S_A,
            [C_WALK_A, C_PROTO_A, C_CTOR_A, C_REB_A, C_ACC_A, C_PP_A, C_CN_A, C_CLOS_A, C_ESC_A],
        ],
        [
            'B',
            S_B,
            [C_WALK_B, C_PROTO_B, C_CTOR_B, C_REB_B, C_ACC_B, C_PP_B, C_CN_B, C_CLOS_B, C_ESC_B],
        ],
    ];
    for (const [who, , components] of families) {
        const compiled = exoStrSchemaOf(components[0], EXO_STR);
        if (compiled.portCount !== PORTS) {
            throw new Error(
                `door-shape: row declaration ${who} compiled to ${compiled.portCount} ports, not ${PORTS} ` +
                    '— every program in this file writes eight, and the port count is what the ' +
                    'grain arithmetic in the header divides by'
            );
        }
        for (const component of components) {
            if (exoStrSchemaOf(component, EXO_STR) !== compiled) {
                throw new Error(
                    `door-shape: an arm of family ${who} does not share the family's schema. The ` +
                        'nine door arms are supposed to differ in the DOOR and in nothing else; ' +
                        'a second schema is a second compilation, a second connector pool and a ' +
                        'second set of writers, none of which is the subject.'
                );
            }
        }
        // THE WRITERS THE HANDLE ARMS HOLD ARE THE SCHEMA'S OWN, checked by pointer at the index each
        // handle carries. A mismatch would mean a handle arm calls a writer the walk does not,
        // and every difference below would be a difference of escaping.
        const held: ReadonlyArray<readonly [number, TExoStrWriter]> =
            who === 'A'
                ? [
                      [IA_ID, WA_ID],
                      [IA_KIND, WA_KIND],
                      [IA_HREF, WA_HREF],
                      [IA_LABEL, WA_LABEL],
                      [IA_BY, WA_BY],
                      [IA_N, WA_N],
                      [IA_NOTE, WA_NOTE],
                      [IA_TAIL, WA_TAIL],
                  ]
                : [
                      [IB_ID, WB_ID],
                      [IB_KIND, WB_KIND],
                      [IB_HREF, WB_HREF],
                      [IB_LABEL, WB_LABEL],
                      [IB_BY, WB_BY],
                      [IB_N, WB_N],
                      [IB_NOTE, WB_NOTE],
                      [IB_TAIL, WB_TAIL],
                  ];
        for (const [index, writer] of held) {
            if (compiled.writers[index] === writer) continue;
            throw new Error(
                `door-shape: family ${who} holds a writer for slot ${index} that is not the ` +
                    "schema's own. The handle arms would be escaping through a different function " +
                    'from the one `c.attr` calls, and every gap on this axis would include it.'
            );
        }
        const distinct = new Set(compiled.writers).size;
        out.push(
            `  family ${who}             ${compiled.portCount} ports, ${distinct} DISTINCT writer ` +
                'objects (4 attribute names → 4 writers; the 4 text ports share the module-level ' +
                'text writer — `exo-writer-for-port`’s own design), one schema shared by walk, ' +
                'prototype, ctor, rebound, accessor, protoPort, classNode, closure and escaped'
        );
    }
    // THE PROTOTYPE ARM'S METHOD IS ON THE PROTOTYPE AND NOT ON THE RECEIVER — checked, because an
    // own `set` per receiver would make this arm a second closure arm with extra steps.
    const probe = {
        __proto__: EXO_STR_DOOR_A,
        slots: [''],
        write: WA_ID,
        at: 0,
    } as unknown as TExoStrDoor;
    if (Object.prototype.hasOwnProperty.call(probe, 'set')) {
        throw new Error(
            'door-shape: the prototype arm’s receiver has an OWN `set` — the method is ' +
                'supposed to exist once in the process, on the prototype. As written it would be ' +
                'one function object per port per instance, which is the closure arm.'
        );
    }
    if (Object.getPrototypeOf(probe) !== EXO_STR_DOOR_A) {
        throw new Error(
            'door-shape: the `__proto__:` key in the prototype arm’s literal did not set the ' +
                'prototype (a transpiler may have turned it into an ordinary property). The arm ' +
                'would be an object with a dead field and no method.'
        );
    }
    out.push(
        '  prototype arm         `set` lives on the prototype object, not on the receiver, and ' +
            '`__proto__:` in the literal really set it — both checked by reflection'
    );
    // THE CTOR ARM MUST DIFFER FROM THE PROTOTYPE ARM IN THE ALLOCATION AND IN NOTHING ELSE, so the
    // same two facts are checked on a constructed receiver, plus the field order: a transpiler that
    // emitted class fields as definitions would build the object in a different order from the
    // literal's and the pair would be comparing two shapes rather than two allocations.
    const built = new ExoStrDoorCtorA([''], WA_ID, 0);
    if (Object.prototype.hasOwnProperty.call(built, 'set')) {
        throw new Error(
            'door-shape: the ctor arm’s receiver has an OWN `set`. The method is supposed to live ' +
                'once on the class prototype, exactly as the prototype arm’s does; an own copy ' +
                'would make this a closure arm and the M1 comparison meaningless.'
        );
    }
    if (Object.getPrototypeOf(built) !== ExoStrDoorCtorA.prototype) {
        throw new Error('door-shape: the ctor arm’s receiver is not on its class prototype.');
    }
    const fields = Object.keys(built).join(',');
    if (fields !== 'slots,write,at') {
        throw new Error(
            `door-shape: the ctor arm’s receiver has own fields [${fields}], not ` +
                '[slots,write,at]. The prototype arm builds its literal in that order and the two ' +
                'arms are supposed to differ only in HOW the object is allocated.'
        );
    }
    out.push(
        '  ctor arm              `set` lives on the class prototype, the receiver is on it, and ' +
            'its own fields are slots,write,at in the prototype arm’s order — all by reflection'
    );
    return out;
}

/** THE ESCAPE GATE — this function IS the reader that makes the escaped arm's handles escape. */
function gateEscape(): string[] {
    const out: string[] = [];
    const sinks: ReadonlyArray<readonly [string, readonly TExoStrDoorFn[]]> = [
        ['A', ESCAPED_SINK_A],
        ['B', ESCAPED_SINK_B],
    ];
    for (const [who, sink] of sinks) {
        if (sink.length !== PORTS) {
            throw new Error(
                `door-shape: escape sink ${who} holds ${sink.length} handles, not ${PORTS}. It is ` +
                    'preallocated and overwritten in place so that the escape costs the same in ' +
                    'every round; a changed length means it grew.'
            );
        }
        for (let k = 0; k < PORTS; k++) {
            if (typeof sink[k] === 'function') continue;
            throw new Error(
                `door-shape: escape sink ${who} slot ${k} is not a function after a render. The ` +
                    'escaped arm’s handles are supposed to survive the wire; if they do not, that ' +
                    'arm is the closure arm with eight dead stores.'
            );
        }
        if (sink.every((fn) => fn === NOOP_A || fn === NOOP_B)) {
            throw new Error(
                `door-shape: escape sink ${who} still holds only its placeholders after a render ` +
                    '— the escaped arm never stored anything and does not escape.'
            );
        }
    }
    out.push(
        `  escaped arm           both sinks hold ${PORTS} live handles after a render, none of ` +
            'them the placeholder — the eight stores happened and something outside the wire ' +
            'reads them'
    );
    return out;
}

/**
 * THE PREMISE GATE FOR ARM 5, AND THE ONE FACT THIS FILE GOT WRONG BY READING INSTEAD OF CHECKING.
 *
 * A rendered row's port table is THAT ROW'S OWN ARRAY — `renderExoStrInstance` builds a node per
 * instance and `createExoStrInstanceFactory` a `values` per exonode — so a handle carrying `slots` must be
 * re-pointed every row and CANNOT be built once and left alone. An earlier arm here assumed the opposite from a
 * reading of a pooled connector that this backend no longer has; the counter below is what refused
 * it, and it stays because prose cannot hold a fact like this down.
 */
function gateTablePerRow(): string[] {
    const probeSchema = makeRowSchema();
    const P = probeSchema.ports;
    const seen = new Set<unknown>();
    const probe: TExoStrMachine = {
        declaration: probeSchema,
        forms: [],
        createInitialState: (c: TExoStrNode, i: number): void => {
            seen.add(c.portTable());
            c.attr(P.id, i);
            c.attr(P.kind, KINDS_A[i & 3]);
            c.attr(P.href, '/i/' + i);
            c.text(P.label, 'Task ' + i);
            c.text(P.by, AUTHORS_A[i & 7]);
            c.text(P.n, 1000 + i);
            c.attr(P.note, 'n' + i);
            c.text(P.tail, 'ok ' + i);
        },
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    };
    EXO_STR.render(listOver(probe));
    if (seen.size === ROWS) {
        return [
            `  the port table          ${seen.size} DISTINCT tables over ${ROWS} rows — one per ` +
                'instance, so `rebound` must re-point its handles every row and no arm may hold a ' +
                'table across rows',
        ];
    }
    if (seen.size === 1) {
        throw new Error(
            `door-shape: ${ROWS} rows shared ONE port table. This backend is pooling instances ` +
                'again, `rebound` is re-pointing eight handles to the array they already hold, ' +
                'and its eight stores are pricing nothing. The arm to build against a pooled ' +
                'backend is a hoist that never touches the handles after the first row.'
        );
    }
    throw new Error(
        `door-shape: ${ROWS} rows produced ${seen.size} distinct port tables — neither one per ` +
            'row nor one for all. Nothing in this file describes that backend and no arm here is ' +
            'priced against it.'
    );
}

/**
 * ARM 8's chain is instance → class prototype → backend stand-in, and the writers are ON THE FAR
 * OBJECT — which is what makes its lookup two hops rather than one.
 *
 * The pointers are checked against the schema's own writers because this arm reaches them by NAME
 * rather than by index, and a name bound to the wrong writer would still produce plausible markup.
 */
function gateClassNode(): string[] {
    const chains: ReadonlyArray<readonly [string, object, object, readonly TExoStrWriter[]]> = [
        ['A', ExoStrRowNodeA.prototype, EXO_STR_NODE_BACKEND_A, PLAN_A.writers],
        ['B', ExoStrRowNodeB.prototype, EXO_STR_NODE_BACKEND_B, PLAN_B.writers],
    ];
    const held: ReadonlyArray<readonly [string, number]> = [
        ['writeId', IA_ID],
        ['writeKind', IA_KIND],
        ['writeHref', IA_HREF],
        ['writeLabel', IA_LABEL],
        ['writeBy', IA_BY],
        ['writeN', IA_N],
        ['writeNote', IA_NOTE],
        ['writeTail', IA_TAIL],
    ];
    const sample = new ExoStrRowNodeA(['']);
    if (Object.getPrototypeOf(sample) !== ExoStrRowNodeA.prototype) {
        throw new Error('door-shape: a classNode instance is not on its class prototype.');
    }
    for (const [who, proto, backend, writers] of chains) {
        if (Object.getPrototypeOf(proto) !== backend) {
            throw new Error(
                `door-shape: family ${who}'s class prototype does not sit on its backend ` +
                    'stand-in, so the writers are one hop away and not two — the arm would be ' +
                    'measuring a shallower chain than the one it is named for.'
            );
        }
        for (const [name, index] of held) {
            if (Object.prototype.hasOwnProperty.call(proto, name)) {
                throw new Error(
                    `door-shape: family ${who} has "${name}" ON THE CLASS PROTOTYPE, one hop from ` +
                        'the receiver. The whole arm is the second hop.'
                );
            }
            if ((backend as Record<string, unknown>)[name] !== writers[index]) {
                throw new Error(
                    `door-shape: family ${who}'s "${name}" is not the schema's writer for slot ` +
                        `${index}. This arm reaches writers by NAME, so a crossed name would ` +
                        'still render plausible markup and every gap would include an escaping ' +
                        'difference.'
                );
            }
        }
    }
    return [
        '  classNode arm           instance → class prototype → backend stand-in, all eight ' +
            'writers on the FAR object and each one the schema’s own by pointer — the lookup is two ' +
            'hops and the writers are shared with every other arm',
    ];
}

/** ARM 7's eight methods are ON THE PROTOTYPE and its receiver carries exactly the two fields. */
function gateProtoPort(): string[] {
    const names: readonly string[] = ['id', 'kind', 'href', 'label', 'by', 'n', 'note', 'tail'];
    const families: ReadonlyArray<readonly [string, object, TExoStrPortRow]> = [
        ['A', EXO_STR_PORT_METHODS_A, PORT_ROW_A],
        ['B', EXO_STR_PORT_METHODS_B, PORT_ROW_B],
    ];
    for (const [who, proto, row] of families) {
        for (const name of names) {
            if (typeof (proto as Record<string, unknown>)[name] !== 'function') {
                throw new Error(`door-shape: family ${who} has no port method "${name}".`);
            }
            if (Object.prototype.hasOwnProperty.call(row, name)) {
                throw new Error(
                    `door-shape: the protoPort receiver of family ${who} has an OWN "${name}" — ` +
                        'the methods are supposed to exist once per schema, on the prototype.'
                );
            }
        }
        const own = Object.keys(row).join(',');
        if (own !== 'values,writers') {
            throw new Error(
                `door-shape: the protoPort receiver of family ${who} has own properties [${own}], ` +
                    'not [values,writers].'
            );
        }
    }
    return [
        `  protoPort arm           ${names.length} methods per declaration ON THE PROTOTYPE, receiver ` +
            'own properties are exactly [values,writers] — by reflection',
    ];
}

/**
 * ARM 7'S WHOLE CLAIM, RUN RATHER THAN ASSERTED: the same eight bodies serve a DIFFERENT backend.
 *
 * A second `ExoStrBackend` compiles its own schema with its own writer function objects. The wire is
 * family A's, unchanged, over a THROWAWAY declaration so that no schema any timed row uses is touched
 * — the indices are checked against family A's first, because the bodies carry them as literals.
 */
function gateProtoPortIsBackendAgnostic(reference: string): string[] {
    const other = new ExoStrBackend();
    const schema = makeRowSchema();
    const p = schema.ports;
    const same =
        p.id.index === IA_ID &&
        p.kind.index === IA_KIND &&
        p.href.index === IA_HREF &&
        p.label.index === IA_LABEL &&
        p.by.index === IA_BY &&
        p.n.index === IA_N &&
        p.note.index === IA_NOTE &&
        p.tail.index === IA_TAIL;
    if (!same) {
        throw new Error(
            'door-shape: a second compilation of the row declaration numbered its ports differently ' +
                'from family A, so this gate cannot reuse family A’s literal slots.'
        );
    }
    const got = other.render(
        listOver({
            declaration: schema,
            forms: [],
            createInitialState: PROTOPORT_A,
            effects: EXO_NO_EFFECTS,
            handlers: EXO_NO_HANDLERS,
        })
    );
    if (got !== reference) {
        throw new Error(
            `door-shape: the protoPort bodies produced ${got.length} chars through a second ` +
                `backend against ${reference.length} through the measured one. The arm claims one ` +
                'prototype serves every backend, and it does not.'
        );
    }
    if (
        exoStrSchemaOf(machineOf(S_A, S_A_FORMS), EXO_STR) !== PLAN_A ||
        exoStrSchemaOf(machineOf(S_B, S_B_FORMS), EXO_STR) !== PLAN_B
    ) {
        throw new Error(
            'door-shape: compiling for a second backend replaced a measured family’s schema, so ' +
                'the schema cache is one slot per machine rather than one per (machine, backendType). ' +
                'Nothing was timed; delete this gate rather than the arm.'
        );
    }
    return [
        '  protoPort, portability  the same eight bodies rendered byte-identical markup through a ' +
            'SECOND backend with its own schema and its own writer objects, and the measured ' +
            'families’ schemas are unchanged',
    ];
}

/**
 * ARM 6's setters are ON THE PROTOTYPE and the receiver never grows an own copy of a port name.
 *
 * A missing setter does not throw: `row.label = v` would silently become an own data property, the
 * slot would keep the empty string, and only the byte gate would notice. This says which it was.
 */
function gateAccessor(): string[] {
    const families: ReadonlyArray<readonly [string, object, TExoStrAccessorRow, string[]]> = [
        ['A', ACCESSOR_PROTO_A, ACCESSOR_ROW_A, NO_SLOTS_A],
        ['B', ACCESSOR_PROTO_B, ACCESSOR_ROW_B, NO_SLOTS_B],
    ];
    const names: readonly string[] = ['id', 'kind', 'href', 'label', 'by', 'n', 'note', 'tail'];
    for (const [who, proto, row, placeholder] of families) {
        for (const name of names) {
            const d = Object.getOwnPropertyDescriptor(proto, name);
            if (d === undefined || typeof d.set !== 'function' || 'value' in d) {
                throw new Error(
                    `door-shape: family ${who} has no setter for "${name}" on the accessor ` +
                        'prototype — a write to that name would land in an own data property and ' +
                        'the port would keep the empty string.'
                );
            }
        }
        const own = Object.keys(row).join(',');
        if (own !== 'values') {
            throw new Error(
                `door-shape: the accessor receiver of family ${who} has own properties ` +
                    `[${own}], not [values]. A port name among them means a setter did not run ` +
                    'and the receiver took the value itself, which also changed its map.'
            );
        }
        if (row.values === placeholder) {
            throw new Error(
                `door-shape: the accessor receiver of family ${who} still points at its ` +
                    'placeholder table after a render.'
            );
        }
    }
    return [
        `  accessor arm            ${names.length} setters per family ON THE PROTOTYPE, receiver ` +
            'own properties are exactly [values], and both receivers hold a real table — all by ' +
            'reflection',
    ];
}

/** ARM 5's handles are eight distinct objects on ONE shared method, checked the way arms 3 and 4 are. */
function gateRebound(): string[] {
    const handles: readonly TExoStrDoorRebound[] = [R0_A, R1_A, R2_A, R3_A, R4_A, R5_A, R6_A, R7_A];
    if (new Set(handles).size !== PORTS) {
        throw new Error(
            `door-shape: the rebound arm holds fewer than ${PORTS} distinct handles — two ports ` +
                'would be writing through one receiver.'
        );
    }
    for (const h of handles) {
        if (Object.prototype.hasOwnProperty.call(h, 'set')) {
            throw new Error(
                'door-shape: a rebound handle has an OWN `set`; the method is supposed to exist ' +
                    'once in the process, exactly as the prototype arm’s does.'
            );
        }
        if (Object.getPrototypeOf(h) !== EXO_STR_REBIND_A) {
            throw new Error('door-shape: a rebound handle is not on its shared method object.');
        }
        if (h.slots === NO_SLOTS_A) {
            throw new Error(
                'door-shape: a rebound handle still points at its placeholder table after a ' +
                    'render — its `slots` store did not happen and it wrote into nothing.'
            );
        }
    }
    return [
        `  rebound arm             ${PORTS} distinct handles, one shared method on the prototype, ` +
            'every one re-pointed away from its placeholder by the last render',
    ];
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
 * one ran. The positions are what let a pair be split by which half of it went first.
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
 * The shared driver several axes carry rotated the phase list on a FIXED CYCLE — `phases[(k + shift)
 * % len]`, forwards every round — so every pair of phases kept the same relative order for the whole
 * run and any warm-cache or allocation-order effect between two neighbours was baked into both
 * medians identically. EVEN ROUNDS RUN FORWARDS AND ODD ROUNDS BACKWARDS here. The rotation still
 * gives every phase every starting position; the DIRECTION is what stops a pair from keeping a fixed
 * order, and `pairedGap` below splits what is left into the half that flips with the order and the
 * half that does not.
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
 * WHAT A PAIR OF PHASES RETURNS — THE SAME ESTIMATOR FOR EVERY PAIR ON THIS AXIS.
 *
 * IT IS USED FOR THE NULLS AND FOR THE SUBJECTS ALIKE, and that is not a tidiness choice: the last
 * server ladder order-corrected the disputed pair and left the quotable pair uncorrected, so the two
 * numbers it printed side by side were produced by different estimators. Every comparison below goes
 * through this function.
 *
 *   bias        |median(a) − median(b)|. On its own it is optimistic: two medians are free to
 *               cancel, and a pair that reports bias alone reads as perfection.
 *   noise       the MEDIAN of the per-round |a − b|. Both halves are sampled in the same round, so
 *               this is the round-to-round scatter ANY comparison in the table carries.
 *   order       (aFirst − bFirst) ÷ 2 — the size of the ordering effect, signed.
 *   intrinsic   (aFirst + bFirst) ÷ 2 — what is left once the ordering is balanced out, signed, and
 *               THE QUOTED ESTIMATE OF a − b for a subject pair.
 *
 * An ordering effect flips sign with the order, so it lands entirely in `order` and `intrinsic`
 * collapses; a real difference keeps its sign in both orders, so it lands in `intrinsic` and `order`
 * collapses. A NULL whose `intrinsic` stands out of its own noise is not a null, and the row it
 * belongs to is not quotable.
 */
interface Gap {
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

function pairedGap(a: number[], b: number[], aPos: number[], bPos: number[]): Gap {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    const whenAFirst: number[] = [];
    const whenBFirst: number[] = [];
    for (let r = 0; r < n; r++) {
        const signed = a[r] - b[r];
        diffs[r] = Math.abs(signed);
        // WHICH RAN FIRST IS READ OFF THE ROUND ITSELF and not inferred from its parity: the
        // rotation wraps, so one round in every cycle puts the pair in the opposite order to the one
        // the direction would suggest, and inferring it would quietly poison both halves.
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

export function benchmarkDoorShape(rounds = 100, batch = 2): void {
    const f = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    /** Nanoseconds PER PORT WRITE — the unit every quantity on this axis is about. */
    const nsRaw = (x: number): number => (x * 1e6) / (ROWS * PORTS);
    const nsW = (x: number): string => `${nsRaw(x).toFixed(3)} ns/write`;
    /** Nanoseconds per INSTANCE, for the floor gaps, which are not per-write quantities. */
    const nsInst = (x: number): number => (x * 1e6) / ROWS;

    const quantum = observeTimerQuantum();
    line(
        `door-shape: observed timer quantum (${quantum.toFixed(
            3
        )} ms) — every timed region below ` +
            `must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its digits are ` +
            'quantisation. THE CLOCK CHECK RUNS BEFORE THE VERDICTS and strikes any such row out ' +
            'of them.'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    line('');
    line('THE SHAPE, AS COMPILED — checked, not assumed');
    for (const l of gateSchemas()) line(l);

    line('');
    line(
        `THE BYTE GATE — ONE reference for all ${PROGRAMS.length} programs (the shipped \`walk\` ` +
            'arm renders it), character for character, before anything is timed. ' +
            `${ARMS.length} arms, two families, one page.`
    );
    const reference = (PROGRAMS.find((p) => p.arm === 'walk' && !p.twin) as Program).run();
    for (const p of PROGRAMS) gateBytes(p.name, reference, p.run());
    for (const l of gateEscape()) line(l);
    for (const l of gateTablePerRow()) line(l);
    for (const l of gateRebound()) line(l);
    for (const l of gateAccessor()) line(l);
    for (const l of gateProtoPort()) line(l);
    for (const l of gateProtoPortIsBackendAgnostic(reference)) line(l);
    for (const l of gateClassNode()) line(l);

    // ── THE CENSUS ──────────────────────────────────────────────────────────────────────
    const reps = REPS * batch;
    const grain = quantum / reps;
    const grainWrite = (grain * 1e6) / (ROWS * PORTS);
    /** A delta in grains, which is the unit a quantised median actually moves in. */
    const grains = (x: number): number => Math.round(Math.abs(x) / grain);

    line('');
    line("CENSUS — read off this file's constants and the two packages' source, nothing measured");
    line(`  rows per render             ${ROWS}`);
    line(
        `  ports per row               ${PORTS}  (4 attribute on distinct names, 4 text) — ` +
            `CONSTANT across all ${ARMS.length} arms`
    );
    line(
        `  port writes per render      ${ROWS * PORTS} — every port written EXACTLY ONCE per ` +
            'instance, which is the amortisation a per-row handle gets and no more'
    );
    line(
        `  bytes per render            ${reference.length} chars, identical in all ` +
            `${PROGRAMS.length} programs`
    );
    line(
        '  FRAMES PER PORT WRITE       floor 1 · walk 2 · prototype 2 · ctor 2 · rebound 2 · ' +
            'accessor 2 · protoPort 2 · classNode 2 · closure 2 · escaped 2 — and `accessor`’s ' +
            'first frame is entered by a STORE rather than by a call, the one call-shape ' +
            'difference on the axis and not a frame-count difference'
    );
    line(
        '                              the nine door arms spend ONE enclosing call plus the ' +
            'writer, and the writer is THE SAME FUNCTION OBJECT in all nine (checked by the schema ' +
            'gate). The floor spends one frame BY CONSTRUCTION and is never used as their control.'
    );
    line(
        '  FRAMES PER INSTANCE         floor 0 · walk 0 · prototype 1 · ctor 9 · rebound 1 · ' +
            'accessor 1 · protoPort 1 · classNode 2 · closure 1 · escaped 1 — calls that do ' +
            'NOT enclose a ' +
            'write and that the fr column therefore does not hold.'
    );
    line(
        '                              ONE of them is c.portTable(), which every handle ' +
            'arm makes once per instance and THE WALK NEVER MAKES; the ctor arm’s other eight are ' +
            'its constructors. At one write per port these divide straight into the per-write ' +
            `figures: 1 frame per instance is ${(1 / PORTS).toFixed(3)} frames per port write, ` +
            `and the ctor arm’s ${
                9 / PORTS
            } against the walk’s 0. Every comparison below carries ` +
            'the difference as a fused term and says so.'
    );
    for (const p of PROGRAMS) {
        if (p.twin) continue;
        line(`  allocations per instance    ${p.arm.padEnd(10)} ${p.perInstance}`);
    }
    line(
        `                              at ${ROWS} rows that is ${ROWS * PORTS} objects or ` +
            `${ROWS * PORTS} function objects per render against the walk's zero and ` +
            '`rebound`’s zero — and for prototype, ctor and closure NONE OF THEM ESCAPES, so ' +
            'the engine is entitled to remove them all. `escaped` is the arm whose handles ' +
            `cannot be removed, and it pays ${PORTS} stores per instance to be that way; ` +
            '`rebound` is the arm that allocates nothing per row and pays the same ' +
            `${PORTS} stores to re-point handles it built once.`
    );
    line(
        '  WRITER CALL SITES           walk 1 (megamorphic) · prototype 1 (megamorphic) · ctor 1 ' +
            '(megamorphic) · rebound 1 (megamorphic) · accessor 8 (monomorphic) · protoPort 8 ' +
            '(monomorphic) · classNode 8 (monomorphic) · closure 8 (monomorphic) · escaped 8 ' +
            '(monomorphic). EVERY PAIR ON ' +
            'THIS AXIS FUSES AT LEAST TWO TERMS — walk ↔ prototype included, which fuses the ' +
            'handle with one portTable() frame per instance — and each line says which.'
    );
    line(
        `  THE LIVE SET                the sink holds all ${reps} renders of a ` +
            `${reference.length}-char page alive for the whole timed region (mount-phases’ rule), ` +
            `which is ~${((reps * reference.length) / 1e6).toFixed(1)} MB if the engine keeps ` +
            'them one byte per character. An arm that also allocates ' +
            `${ROWS * PORTS * reps} handles per region pays its GC against a live set held for ` +
            'an unrelated reason, and this axis does not separate the two.'
    );
    line(
        `  THE GRAIN                   ${f6(grain)} ms per render = ${grainWrite.toFixed(
            4
        )} ns PER PORT WRITE (quantum ${quantum.toFixed(
            3
        )} over ${reps} renders per region). EVERY MEDIAN BELOW IS A MULTIPLE OF IT, and the ` +
            'table prints median ÷ grain beside each one.'
    );
    line(
        `  FOUR GRAINS                 ${(4 * grainWrite).toFixed(4)} ns per port write. The ` +
            'smallest quantity in dispute is the walk’s two array loads against one ' +
            'allocation, both single-digit ns; if a pair lands under this bar the run REFUSES it ' +
            `by name and names batch ${batch * 2}.`
    );
    line(
        '  THE QUOTING RULE            a difference must clear BOTH its own two rows’ ' +
            'resolution AND FOUR GRAINS to be quoted as a size. That is `ssr-floor`’s rule ' +
            'and it is inherited here rather than re-invented.'
    );
    line(
        '  THE ESTIMATOR               every pair below — nulls AND subjects — goes through ONE ' +
            'function (`pairedGap`), and the quoted difference is its ORDER-BALANCED `intrinsic`. ' +
            'The last server ladder order-corrected the disputed pair and not the quotable one.'
    );

    // ── THE PHASES ──────────────────────────────────────────────────────────────────────
    const phases: Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps,
        prep: (): Scenario => {
            // THE SINK, allocated untimed. Every repetition's markup stays alive for the whole timed
            // region — `mount-phases`' rule — so no program is allocating into a nursery that
            // recycles while its neighbours allocate into a growing live set.
            const sink: { out: string; tail: string } = { out: '', tail: '' };
            const run = p.run;
            return {
                measure: () => {
                    const out = run();
                    // THE FLATTEN, INSIDE THE REGION, ON EVERY ROW. `+=` hands back a rope and the
                    // characters are not copied until something reads the string; a server cannot
                    // write a rope to a socket. `ssr-floor`'s rule, identical for every program
                    // here, so it sits in the constant tail.
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

    // BEFORE the table: the recorder's scraper latches off on this line, and this table's eleven
    // columns match no shape it knows, so a table printed first is refused and the run dies.
    emitRecordedRows(
        'DOOR SHAPE',
        'ms',
        'render',
        PROGRAMS.map((p) => [p.name, stats.get(p.name) as Stat] as const)
    );

    // ── THE RAW TABLE ───────────────────────────────────────────────────────────────────
    line('');
    line(
        `DOOR SHAPE — ${ROWS} rows × ${PORTS} ports of one component [ms per render] · ` +
            `interleaved, direction alternating · ${rounds} rounds · batch ${batch} · ${reps} ` +
            'renders per timed region · GC before every timed region'
    );
    line(
        '                   fr fr/i  reps    min      p25      median   p75      max      ' +
            'med/grain  ticks   ns/write'
    );
    for (const p of PROGRAMS) {
        const s = stats.get(p.name) as Stat;
        const region = s.median * reps;
        line(
            `${p.name.padEnd(17)}${String(p.frames).padStart(3)}` +
                `${String(p.framesPerInstance).padStart(5)}${String(reps).padStart(6)}   ` +
                `${f(s.min)}   ${f(s.p25)}   ${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ` +
                `${(s.median / grain).toFixed(1).padStart(9)}  ${(region / quantum)
                    .toFixed(1)
                    .padStart(6)}   ${nsRaw(s.median).toFixed(3)}`
        );
    }
    line(
        `  fr = ENCLOSING CALL FRAMES PER PORT WRITE.  fr/i = ENCLOSING CALL FRAMES PER INSTANCE ` +
            'THAT DO NOT ENCLOSE A WRITE — the handle arms’ portTable() call, which the walk never ' +
            'makes, and the ctor arm’s eight constructors. At one write per port these divide into ' +
            'the same rows the fr column is compared across, so they are a column and not a ' +
            `footnote.  med/grain = the median divided by one grain (${f6(grain)} ms) — IF THIS ` +
            'IS A SMALL INTEGER THE ROW IS THE CLOCK AND NOT THE PROGRAM.  ticks = the whole ' +
            'timed region divided by the observed quantum.'
    );
    line('');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(17)} ${p.what}`);

    // ── THE CLOCK CHECK — BEFORE EVERY VERDICT, NOT AFTER ───────────────────────────────
    //
    // A DESTROYER PROVED THIS MORNING THAT EVERY FIGURE IN THE LAST RUN WAS AN INTEGER NUMBER OF
    // CLOCK TICKS AND NOBODY NOTICED, because the check was printed BELOW the conclusions it should
    // have deleted. Here it builds a set, and every block after it skips what is in the set and says
    // so where the verdict would have been.
    line('');
    line(
        `THE CLOCK CHECK — run BEFORE the nulls, the gaps and the predictions. A region under ` +
            `${MIN_TICKS} ticks is EXCLUDED from all three, not footnoted after them.`
    );
    // EXCLUSION IS BY ARM AND NOT BY ROW, and that is the stricter reading on purpose: an arm's
    // resolution comes from its NULL, which is the pair of its two rows, so a TWIN under the tick
    // floor makes the resolution a quantisation artefact and every gap judged against it
    // unjudgeable. Striking only the offending row would leave the subject row standing on a
    // resolution nobody may trust.
    const excluded = new Set<string>();
    const excludedArms = new Set<Arm>();
    for (const p of PROGRAMS) {
        const region = (stats.get(p.name) as Stat).median * reps;
        const ticks = region / quantum;
        if (ticks >= MIN_TICKS) {
            line(
                `  ${p.name.padEnd(17)}region ${region.toFixed(3)} ms = ${ticks.toFixed(
                    1
                )} ticks — clears the ${MIN_TICKS}× floor`
            );
            continue;
        }
        excluded.add(p.name);
        excludedArms.add(p.arm);
        const wantBatch = ticks > 0 ? Math.ceil((batch * MIN_TICKS) / ticks) : batch * 10;
        refuse(
            `door-shape: the "${p.name}" timed region is ${region.toFixed(3)} ms at ${reps} ` +
                `renders — ${ticks.toFixed(1)}× the observed quantum (${quantum.toFixed(3)} ms), ` +
                `under the ${MIN_TICKS}× floor. Its digits are quantisation, not measurement, so ` +
                `THE WHOLE "${p.arm}" ARM — this row AND its twin, hence its resolution — IS ` +
                'EXCLUDED from every null, every gap and every prediction below. ' +
                `Re-run with batch ${wantBatch}: \`npm run axis --workspace=@exodra/benchmarks ` +
                `-- door-shape ${rounds} ${wantBatch}\``
        );
    }
    if (excluded.size === 0) {
        line(
            `  ALL ${PROGRAMS.length} REGIONS CLEAR THE FLOOR — nothing is excluded, and every ` +
                'block below is computed over the whole table.'
        );
    }
    const usable = (...arms: Arm[]): boolean => arms.every((a) => !excludedArms.has(a));

    // ── THE NULLS ───────────────────────────────────────────────────────────────────────
    const nullOf = new Map<Arm, Gap>();
    for (const arm of ARMS) {
        const a = rowName(arm, false);
        const b = rowName(arm, true);
        nullOf.set(arm, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }
    /** A row's own resolution — its arm's null. Never the table maximum. */
    const resOf = (name: string): number => {
        const arm = (PROGRAMS.find((p) => p.name === name) as Program).arm;
        return (nullOf.get(arm) as Gap).resolution;
    };

    line('');
    line(
        `NULLS — ${ARMS.length} pairs, one per arm, each a separately declared copy of its ` +
            'program (its own declaration, its own schema, its own connector pool, its own bodies). ' +
            'True Δ = 0.'
    );
    // THE HEADER AND THE FOUR SIX-DECIMAL COLUMNS ARE WHAT `run-one-axis.js` SCRAPES (`NULL_HEAD`,
    // `NULL_ROW`, `NULL_RESOLUTION`). Change the spelling and the recording silently loses its
    // resolution block, which is the one thing that turns a printed difference into a size.
    line(
        '  null            bias      noise     p75       worst     order     intrinsic  ' +
            'what it is'
    );
    let worstRes = 0;
    for (const arm of ARMS) {
        const name = rowName(arm, false);
        const v = nullOf.get(arm) as Gap;
        if (v.resolution > worstRes) worstRes = v.resolution;
        line(
            `  ${name.padEnd(14)}${f6(v.bias)}  ${f6(v.noise)}  ${f6(v.noiseP75)}  ` +
                `${f6(v.worst)}  ${f6(v.order).padStart(9)} ${f6(v.intrinsic).padStart(9)}  ` +
                `|${name} − its twin| ms/render, true Δ = 0 (this pair's resolution ` +
                `${f6(v.resolution)} = ${nsRaw(v.resolution).toFixed(3)} ns/write; Δ when it ran ` +
                `first ${f6(v.aFirst)} over ${v.aFirstRounds} rounds, when the twin ran first ` +
                `${f6(v.bFirst)} over ${v.bFirstRounds}${
                    excluded.has(name) || excluded.has(rowName(arm, true))
                        ? '; ONE HALF OF THIS PAIR IS EXCLUDED BY THE CLOCK CHECK'
                        : ''
                })`
        );
    }
    line(
        `  RESOLUTION FLOOR      ${f6(worstRes)} ms — THE COARSEST OF THE ${ARMS.length}, ` +
            'printed for the recorder. NO VERDICT BELOW USES IT: every quantity is judged ' +
            'against the resolution of ITS OWN arm, which is on the lines above.'
    );

    line('');
    line(
        'THE ORDER SPLIT — is a null measuring two programs, or measuring which of them ran first?'
    );
    const notNull: string[] = [];
    for (const arm of ARMS) {
        const name = rowName(arm, false);
        const v = nullOf.get(arm) as Gap;
        const intr = Math.abs(v.intrinsic);
        const ord = Math.abs(v.order);
        let verdictWord: string;
        if (intr > v.noise) {
            notNull.push(name);
            verdictWord =
                'INTRINSIC — the two declarations differ in a way that does NOT flip with the ' +
                `order, so this pair is not a null and every figure printed for "${name}" is ` +
                'suspect';
        } else if (ord > v.noise) {
            verdictWord =
                'ORDERING — what the pair separates flips sign with which of the two ran first, ' +
                'so it is the position in the round and not the program; the alternating ' +
                'direction is what averages it out of the medians';
        } else {
            verdictWord =
                "NEITHER stands out of this pair's own noise — the pair is a null and the " +
                'instrument has nothing to confess';
        }
        line(
            `  ${name.padEnd(14)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ${f6(v.noise)} ` +
                `ms/render — ${verdictWord}`
        );
    }
    if (notNull.length > 0) {
        refuse(
            `door-shape: ${notNull.length} of the ${ARMS.length} null pairs came back INTRINSIC — ` +
                `${notNull.join(', ')}. Two declarations of one program that differ in a way ` +
                'which does not flip with the running order are two different programs, so those ' +
                'rows are not quotable and every quantity computed from them inherits it. The ' +
                'first thing to check is that the twin is a true transcription: its own declaration, ' +
                'its own schema, its own writers, its own bodies, nothing shared with the subject.'
        );
    }

    // ── THE SIX COMPARISONS ─────────────────────────────────────────────────────────────
    interface Comparison {
        readonly a: Arm;
        readonly b: Arm;
        readonly clean: boolean;
        readonly note: string;
    }
    const COMPARISONS: readonly Comparison[] = [
        {
            a: 'walk',
            b: 'prototype',
            clean: false,
            note:
                'THE PAIR THE HEADER CALLED CLEAN, AND IT IS NOT — same frames per write, same ' +
                'call-site polymorphy, same writer, and the address carried in a receiver instead ' +
                'of resolved per write; but the prototype arm also calls portTable() once per ' +
                'instance and the walk never calls it. FUSED with that one frame per instance',
        },
        {
            a: 'walk',
            b: 'closure',
            clean: false,
            note: 'FUSED — the handle AND eight monomorphic writer sites against one megamorphic',
        },
        {
            a: 'prototype',
            b: 'closure',
            clean: false,
            note: 'FUSED — object against function object, AND one call site against eight',
        },
        {
            a: 'prototype',
            b: 'ctor',
            clean: false,
            note:
                'THE M1 PAIR — same three fields, same shared method, same ONE megamorphic writer ' +
                'site, same two frames on the write path; the literal has its prototype installed ' +
                'onto it after creation, the constructor allocates with a fixed initial map. ' +
                'FUSED with ONE CONSTRUCTOR FRAME per port per instance, which is the one thing a ' +
                'constructor cannot be spelled without',
        },
        {
            a: 'walk',
            b: 'ctor',
            clean: false,
            note:
                'THE SHIPPED DOOR AGAINST THE HANDLE ALLOCATED THE OTHER WAY. FUSED — the handle ' +
                'AND the constructor frame. If this lands where `walk ↔ prototype` did not, the ' +
                'prototype arm’s figure is about `__proto__:` and not about a per-port handle',
        },
        {
            a: 'prototype',
            b: 'rebound',
            clean: false,
            note:
                'THE ALLOCATION PAIR, and the tightest on this axis — same three fields, same ' +
                'shared method, same ONE megamorphic writer site, same frames per write and per ' +
                'instance, same writer. Eight allocations against eight field stores. FUSED with ' +
                'the eight module-binding loads the rebound arm makes where the prototype arm ' +
                'has eight locals, and with the old-to-young write barrier on every store',
        },
        {
            a: 'walk',
            b: 'rebound',
            clean: false,
            note:
                'THE SHIPPED DOOR AGAINST THE STRATEGY A USER CAN WRITE. FUSED — the rebound ' +
                'arm resolves nothing per write but pays one portTable() frame and eight stores ' +
                'per instance that the walk does not. IF `rebound` LANDS UNDER `walk` AND THE ' +
                'PAIR RESOLVES, that is a composition below the shipped door and this axis says ' +
                'so by name',
        },
        {
            a: 'walk',
            b: 'accessor',
            clean: false,
            note:
                'THE PAIR THE ARM WAS ASKED FOR, AND IT IS NOT CLEAN. Both spend one enclosing ' +
                'frame and the same writer, and the accessor drops `port.index`, `this.writers` ' +
                'and the `writers[index]` element load per write. FUSED THREE WAYS with that: a ' +
                'STORE dispatching to a setter is not a method call and V8 need not compile it ' +
                'like one; the accessor has EIGHT MONOMORPHIC writer sites against the walk’s one ' +
                'megamorphic, which is `closure ↔ walk`’s confound word for word; and it pays one ' +
                'portTable() frame and one store per instance that the walk does not',
        },
        {
            a: 'rebound',
            b: 'accessor',
            clean: false,
            note:
                'TWO ZERO-ALLOCATION ROWS — both re-point a module-level receiver per instance, ' +
                'both pay one portTable() frame, both use the schema’s writers. The accessor bakes ' +
                'the address into eight setter bodies where rebound carries it in eight ' +
                'receivers, so it stores ONCE per instance instead of eight times. FUSED with the ' +
                'call shape and with one site against eight',
        },
        {
            a: 'accessor',
            b: 'protoPort',
            clean: false,
            note:
                'THE PAIR TO READ FIRST — it is the one being decided on. Same slot literal, same ' +
                'writer function object, same two frames, same one frame per instance, same ' +
                'eight monomorphic writer sites, no allocation on either side. The writer is ' +
                'CAPTURED on one side and reached through `this` on the other. FUSED with two ' +
                'things and neither can be subtracted here: a STORE dispatching to a setter is ' +
                'not a method call, and protoPort stores two fields per instance where accessor ' +
                'stores one. The row that would separate them is a method whose writer is ' +
                'captured, or a setter that reads `this.writers` — neither is built',
        },
        {
            a: 'walk',
            b: 'protoPort',
            clean: false,
            note:
                'THE SHIPPED BODY WITH THE INDEX MADE A LITERAL — `attr` is `this.values[port.index] ' +
                '= this.writers[port.index](v)` and this arm is the same line with the index ' +
                'baked. FUSED with the call-site split (one megamorphic against eight ' +
                'monomorphic) and with one portTable() frame and two stores per instance',
        },
        {
            a: 'closure',
            b: 'accessor',
            clean: false,
            note:
                'THE NEAREST THING TO A DISPATCH-SHAPE PROBE ON THIS AXIS — same eight ' +
                'monomorphic writer sites, same captured writer and index, same two frames; a ' +
                'direct call `d(v)` against a store `row.x = v`. FUSED with the closure arm’s ' +
                'eight function objects per instance, which the accessor does not allocate',
        },
        {
            a: 'ctor',
            b: 'classNode',
            clean: false,
            note:
                'THE CONSTRUCTION PAIR — both build with `new` per instance, both reach the ' +
                'writer through `this`, same frames per write. One makes EIGHT objects of three ' +
                'fields and the other ONE of one field. FUSED with where the writer comes from: ' +
                'an own field on the receiver against a name two prototype hops out',
        },
        {
            a: 'walk',
            b: 'classNode',
            clean: false,
            note:
                'THE SHIPPED DOOR AGAINST THE DESIGN. FUSED — the two-hop lookup, the call-site ' +
                'split (one megamorphic against eight monomorphic), and one allocation plus two ' +
                'frames per instance that the walk does not pay. The allocation is also ONE MORE ' +
                'than the design would make, and no row here subtracts it',
        },
        {
            a: 'protoPort',
            b: 'classNode',
            clean: false,
            note:
                'TWO WAYS TO REACH A WRITER THROUGH `this` — an own field plus an element load ' +
                'against a name two prototype hops out, both with the slot as a literal and eight ' +
                'monomorphic sites. FUSED with the allocation: protoPort re-points one row, ' +
                'classNode builds one object per instance',
        },
        {
            a: 'closure',
            b: 'escaped',
            clean: false,
            note:
                'THE M2 PAIR — identical bodies, identical eight monomorphic sites, identical ' +
                'frames; the only difference is that eight handles are stored where the optimiser ' +
                'cannot see through. FUSED with the eight stores themselves (one element store ' +
                'and one write barrier each), which is what the escape costs and cannot be ' +
                'subtracted on this axis',
        },
        {
            a: 'walk',
            b: 'escaped',
            clean: false,
            note:
                'FUSED THREE WAYS — a handle that really is allocated, eight monomorphic writer ' +
                'sites against one megamorphic, and the eight stores that keep it alive',
        },
        {
            a: 'floor',
            b: 'walk',
            clean: false,
            note:
                'NOT THE DOOR’S PRICE — the whole pipeline (connector push, reset, ' +
                'fillMarkup, the attribute heads) plus one frame per write. `ssr-floor` cuts this ' +
                'into rungs; this axis does not',
        },
        {
            a: 'floor',
            b: 'prototype',
            clean: false,
            note: 'likewise, plus eight objects per instance',
        },
        {
            a: 'floor',
            b: 'ctor',
            clean: false,
            note: 'likewise, plus eight objects and eight constructor frames per instance',
        },
        {
            a: 'floor',
            b: 'rebound',
            clean: false,
            note:
                'likewise, plus one portTable() call and eight stores per instance and NO ' +
                'allocation — the narrowest gap to the floor any handle arm here can have',
        },
        {
            a: 'floor',
            b: 'accessor',
            clean: false,
            note:
                'likewise, plus one portTable() call and one store per instance and NO ' +
                'allocation — the least any arm here adds to a render',
        },
        {
            a: 'floor',
            b: 'protoPort',
            clean: false,
            note: 'likewise, plus one portTable() call and two stores per instance, no allocation',
        },
        {
            a: 'floor',
            b: 'classNode',
            clean: false,
            note: 'likewise, plus one object, one constructor frame and one portTable() call',
        },
        {
            a: 'floor',
            b: 'closure',
            clean: false,
            note: 'likewise, plus eight function objects and a context per instance',
        },
        {
            a: 'floor',
            b: 'escaped',
            clean: false,
            note:
                'likewise, plus eight function objects that survive the wire, a context, and ' +
                'eight stores per instance',
        },
    ];

    const gapOf = new Map<string, Gap>();
    for (const cmp of COMPARISONS) {
        const a = rowName(cmp.a, false);
        const b = rowName(cmp.b, false);
        gapOf.set(`${cmp.a}↔${cmp.b}`, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }

    line('');
    line(
        `THE ${COMPARISONS.length} COMPARISONS — every one through the SAME estimator as the ` +
            'nulls. `bias` is the ' +
            'difference of medians, `intrinsic` is that difference with the running order balanced ' +
            'out, and INTRINSIC IS THE QUOTED FIGURE. A pair is quotable only if it clears both ' +
            'its own two arms’ resolutions and four grains.'
    );
    const resolvedPairs: string[] = [];
    const unresolvedPairs: string[] = [];
    for (const cmp of COMPARISONS) {
        const key = `${cmp.a}↔${cmp.b}`;
        const nameA = rowName(cmp.a, false);
        const nameB = rowName(cmp.b, false);
        if (!usable(cmp.a, cmp.b)) {
            line(
                `  ${key.padEnd(22)}EXCLUDED — an arm of this pair has a row under the clock ` +
                    'floor (see THE CLOCK CHECK). No figure is computed for this pair.'
            );
            continue;
        }
        const v = gapOf.get(key) as Gap;
        const res = Math.max(resOf(nameA), resOf(nameB));
        const g = grains(v.intrinsic);
        const ok = Math.abs(v.intrinsic) > res && g >= 4;
        if (ok) resolvedPairs.push(key);
        else unresolvedPairs.push(key);
        line(
            `  ${key.padEnd(22)}intrinsic ${sign(v.intrinsic)} ms  ${nsW(v.intrinsic).padEnd(
                16
            )}${String(g).padStart(4)} grains  (bias ${f6(v.bias)}, order ${f6(
                v.order
            )}, own resolution ${f6(res)})  ${
                ok
                    ? 'RESOLVED — quotable as a size'
                    : Math.abs(v.intrinsic) <= res
                    ? 'NOT RESOLVED — inside its own two arms’ resolution'
                    : 'NOT RESOLVED — under four grains, an ordering at best'
            }`
        );
        line(`  ${''.padEnd(22)}${cmp.clean ? 'CLEAN: ' : ''}${cmp.note}`);
    }
    const cleanPairs = COMPARISONS.filter((c) => c.clean).length;
    if (cleanPairs === 0) {
        line(
            `  NOT ONE OF THE ${COMPARISONS.length} PAIRS IS CLEAN, and the absence of a CLEAN row ` +
                'above is that verdict rather than a dropped concept. Every handle arm calls ' +
                '`portTable()` once per instance and the walk never does, so one uncounted frame ' +
                'per instance sits on one side of every walk↔handle pair; the two allocating arms ' +
                'differ in spelling as well as shape; `rebound` lives in module state where ' +
                '`closure` does not; and `accessor` is entered by a store where every other arm ' +
                'is entered by a call. Read `fr/i` beside every median before reading any gap.'
        );
    }
    line(
        '  A NEGATIVE `intrinsic` MEANS THE FIRST ARM WAS FASTER. This axis predicted no direction ' +
            'between walk, prototype and closure (P0) — the sign here is a measurement and not a ' +
            'confirmation of anything the header expected.'
    );
    for (const cmp of COMPARISONS) {
        const key = `${cmp.a}↔${cmp.b}`;
        if (cmp.a === 'floor' || !unresolvedPairs.includes(key)) continue;
        const v = gapOf.get(key) as Gap;
        const g = grains(v.intrinsic);
        const res = Math.max(resOf(rowName(cmp.a, false)), resOf(rowName(cmp.b, false)));
        // THE REMEDY HAS TO MATCH THE BAR THAT BOUND. This printed both numbers and then gave the
        // GRAIN remedy to every pair, including ones many grains clear of it and refused by the
        // resolution — doubling the batch does nothing for those, because the resolution is
        // |arm − its own twin| in the same ms/render the difference is, so scaling the region
        // scales both. Its sibling walk-record had the same defect and refused FOUR pairs with it,
        // every one of them clear of four grains.
        const grainBound = g < 4;
        refuse(
            `door-shape: "${key}" did not separate — the order-balanced difference is ` +
                `${f6(v.intrinsic)} ms per render (${nsW(v.intrinsic)}, ${g} grains). ` +
                `THE BAR THAT REFUSED IT IS THE ${grainBound ? 'GRAIN' : 'RESOLUTION'}: ` +
                `four grains is ${(4 * grainWrite).toFixed(4)} ns/write and this pair is ${g} ` +
                `grains${
                    grainBound ? ' — UNDER it' : ' — CLEAR of it'
                }; its own arms' resolution ` +
                `is ${f6(res)} ms and the difference is ${f6(Math.abs(v.intrinsic))} ms` +
                `${grainBound ? '' : ' — INSIDE it'}. ` +
                'It may NOT be quoted as a size, in either direction. ' +
                (grainBound
                    ? 'To resolve it, halve the grain: `npm run axis ' +
                      `--workspace=@exodra/benchmarks -- door-shape ${rounds} ${batch * 2}\`, ` +
                      `which doubles the renders per region to ${reps * 2} and the wall clock ` +
                      'with them. More ROUNDS will not help — a quantised median moves in ' +
                      'grains, and the batch is what moves the grain.'
                    : 'A BIGGER BATCH WILL NOT HELP: the resolution is |arm − its own twin| in ' +
                      'the same unit as the difference, so a larger region scales both. Read ' +
                      "this pair's null above and see which half of its resolution is BIAS and " +
                      'which is NOISE — more rounds reduce only the noise half, and a bias half ' +
                      'means the pair is reporting its position in the round, not its two ' +
                      'programs.')
        );
    }

    // ── THE FLOOR, STATED AS WHAT IT IS ─────────────────────────────────────────────────
    line('');
    line('THE FLOOR, AND WHAT THE GAP TO IT IS AND IS NOT');
    for (const arm of ARMS) {
        if (arm === 'floor') continue;
        const nameA = rowName('floor', false);
        const nameB = rowName(arm, false);
        if (!usable('floor', arm)) {
            line(`  floor ↔ ${arm.padEnd(12)}EXCLUDED by the clock check`);
            continue;
        }
        const v = gapOf.get(`floor↔${arm}`) as Gap;
        line(
            `  floor ↔ ${arm.padEnd(12)}${sign(-v.intrinsic)} ms per render = ${nsInst(
                -v.intrinsic
            ).toFixed(1)} ns per instance = ${(
                median(nameB) / Math.max(median(nameA), Number.MIN_VALUE)
            ).toFixed(3)}× the floor`
        );
    }
    line(
        '  THIS IS NOT THE DOOR’S PRICE and no line of this axis says it is. It is the whole ' +
            'render pipeline — the connector push, `reset`’s eight stores, the wire’s own ' +
            'frame, `fillMarkup`, and the attribute writers’ two extra concatenations per ' +
            'attribute port because the schema owns the head where the floor merges it — PLUS ONE ' +
            'FRAME PER WRITE, which is the one term the floor is allowed to be short of. ' +
            '`ssr-floor` is the axis that cuts that distance into rungs; this one holds it constant ' +
            'so that the nine doors can be read against each other.'
    );

    // ── THE PREDICTIONS, PRINTED MECHANICALLY ───────────────────────────────────────────
    line('');
    line(
        'THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the programs existed'
    );
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);
    const skipped = (id: string, why: string): void => line(`  ⊘ ${id} NOT JUDGED — ${why}`);

    line(
        '   ⊘ (P0) NOT A PREDICTION — this axis commits to no direction between walk, prototype ' +
            'and closure. The three medians and the three intrinsics are printed above and are ' +
            'measurements, not verdicts. (P7) does commit a direction for `ctor` against ' +
            '`prototype` and (P9) one for `rebound` against `prototype`; (P8) commits a sign ' +
            'and no size for `escaped` against `closure`, and (P10) no direction at all for ' +
            '`rebound` against `walk`. (P11) commits a direction AND a size for ' +
            '`accessor` against `walk`; (P12) neither, for `accessor` against `rebound`; ' +
            '(P13) a direction for `accessor` against `protoPort` — THE PAIR THE OWNER IS ' +
            'DECIDING ON — and (P14) a direction without a size for `protoPort` against `walk`. ' +
            '(P15) commits a direction for `classNode` against `ctor`, and (P16) a SIZE with no ' +
            'direction for `classNode` against `walk`: that one is the price of the two ' +
            'prototype hops.'
    );

    const doorArms: readonly Arm[] = ['walk', 'prototype', 'closure'];
    if (usable(...doorArms)) {
        const values = doorArms.map((a) => median(rowName(a, false)));
        const spread = Math.max(...values) - Math.min(...values);
        verdict(
            '(P1)',
            nsRaw(spread) <= 10,
            'the three door arms walk, prototype and closure land within 10 ns per port write ' +
                'of each other',
            `spread ${f6(spread)} ms per render = ${nsRaw(spread).toFixed(3)} ns/write ` +
                `(${grains(spread)} grains) — ` +
                doorArms.map((a, k) => `${a} ${f(values[k])}`).join(', ')
        );
    } else {
        skipped('(P1)', 'a door row is under the clock floor and was excluded');
    }

    if (usable('walk', 'prototype')) {
        const v = gapOf.get('walk↔prototype') as Gap;
        verdict(
            '(P2)',
            Math.abs(nsRaw(v.intrinsic)) <= 3,
            'walk ↔ prototype — the pair the header called CLEAN, which also fuses one ' +
                'portTable() frame per instance — is under 3 ns per port write',
            `${nsW(v.intrinsic)} (order-balanced; bias ${f6(v.bias)}, ${grains(
                v.intrinsic
            )} grains)`
        );
    } else {
        skipped('(P2)', 'walk or prototype is under the clock floor and was excluded');
    }

    {
        // THE THREE PAIRS (P3) WAS COMMITTED OVER, held to by name. The arms added after it
        // brought six more door-to-door pairs, and letting them into this set would make a
        // prediction easier to hold after the fact than it was when it was written.
        const doorPairs = ['walk↔prototype', 'walk↔closure', 'prototype↔closure'];
        const refusedDoors = doorPairs.filter((k) => unresolvedPairs.includes(k));
        const judgedDoors = doorPairs.filter(
            (k) => resolvedPairs.includes(k) || unresolvedPairs.includes(k)
        );
        if (judgedDoors.length === doorPairs.length) {
            verdict(
                '(P3)',
                refusedDoors.length >= 1,
                'at least one of walk↔prototype, walk↔closure and prototype↔closure — the three ' +
                    'pairs this prediction was committed over — is refused at this batch for ' +
                    'being under four grains',
                refusedDoors.length === 0
                    ? 'all three resolved — the doors differ by more than one allocation and this ' +
                          "file's cost census is incomplete"
                    : `${refusedDoors.length} refused: ${refusedDoors.join(', ')}`
            );
        } else {
            skipped('(P3)', 'a door pair was excluded by the clock check and could not be judged');
        }
    }

    if (usable('floor', ...doorArms)) {
        const gaps = doorArms.map((a) => -(gapOf.get(`floor↔${a}`) as Gap).intrinsic);
        const perInstance = gaps.map((g) => nsInst(g));
        const ok = perInstance.every((g) => g >= 40 && g <= 200);
        verdict(
            '(P4)',
            ok,
            'every door arm this prediction was committed over — walk, prototype, closure — is ' +
                'dearer than the floor, by 40-200 ns per instance',
            doorArms.map((a, k) => `${a} +${perInstance[k].toFixed(1)} ns/inst`).join(', ')
        );
    } else {
        skipped('(P4)', 'the floor or a door row is under the clock floor and was excluded');
    }

    verdict(
        '(P5)',
        notNull.length === 0,
        `all ${ARMS.length} null pairs are ordering or nothing`,
        notNull.length === 0
            ? `${ARMS.length} of ${ARMS.length} inside their own noise`
            : `${notNull.length} INTRINSIC — ${notNull.join(', ')}`
    );

    {
        const ticks = PROGRAMS.map((p) => ((stats.get(p.name) as Stat).median * reps) / quantum);
        verdict(
            '(P6)',
            Math.min(...ticks) >= 30,
            `every one of the ${PROGRAMS.length} timed regions clears thirty ticks of the ` +
                'observed clock',
            `the smallest region is ${Math.min(...ticks).toFixed(1)} ticks (${
                PROGRAMS[ticks.indexOf(Math.min(...ticks))].name
            }); the largest ${Math.max(...ticks).toFixed(1)}`
        );
    }

    if (usable('walk', 'prototype', 'ctor')) {
        const protoGap = Math.abs((gapOf.get('walk↔prototype') as Gap).intrinsic);
        const ctorGap = Math.abs((gapOf.get('walk↔ctor') as Gap).intrinsic);
        const protoCtor = gapOf.get('prototype↔ctor') as Gap;
        const res = Math.max(resOf(rowName('prototype', false)), resOf(rowName('ctor', false)));
        const separated = Math.abs(protoCtor.intrinsic) > res && grains(protoCtor.intrinsic) >= 4;
        verdict(
            '(P7)',
            separated &&
                median(rowName('ctor', false)) < median(rowName('prototype', false)) &&
                ctorGap <= protoGap / 2,
            'ctor is cheaper than prototype by at least half of what separates prototype from walk',
            `walk↔prototype ${nsW((gapOf.get('walk↔prototype') as Gap).intrinsic)}, walk↔ctor ` +
                `${nsW((gapOf.get('walk↔ctor') as Gap).intrinsic)}, prototype↔ctor ` +
                `${nsW(protoCtor.intrinsic)} over ${grains(protoCtor.intrinsic)} grains against ` +
                `its own two arms' resolution of ${f6(res)} ms — ${
                    separated
                        ? 'the pair separated, so M1 is answered in the direction the sign shows'
                        : 'THE PAIR DID NOT SEPARATE: ctor sits on prototype inside their own ' +
                          'resolution, M1 IS REFUTED, and the shape rather than the spelling is ' +
                          'what the prototype arm priced'
                }. THE CONSTRUCTOR FRAME IS IN THIS FIGURE and cannot be subtracted here.`
        );
    } else {
        skipped('(P7)', 'walk, prototype or ctor is under the clock floor and was excluded');
    }

    if (usable('closure', 'escaped')) {
        const v = gapOf.get('closure↔escaped') as Gap;
        const res = Math.max(resOf(rowName('closure', false)), resOf(rowName('escaped', false)));
        const cheaper = v.intrinsic > 0 && Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        const separated = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        verdict(
            '(P8)',
            !cheaper,
            'escaped may not be cheaper than closure — it does strictly more work; NO SIZE IS ' +
                'PREDICTED, because whether the closure arm’s eight handles were removed is the ' +
                'question itself',
            `closure↔escaped ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains against its ` +
                `own two arms' resolution of ${f6(res)} ms — ${
                    separated
                        ? 'THE PAIR SEPARATED: the eight handles cost something once they cannot ' +
                          'be removed, FUSED with the eight stores that make them escape'
                        : 'the pair did not separate, so at this grain making the handles escape ' +
                          'changed nothing measurable and M2 has no support from this run'
                }`
        );
    } else {
        skipped('(P8)', 'closure or escaped is under the clock floor and was excluded');
    }

    if (usable('walk', 'prototype', 'rebound')) {
        const protoGap = Math.abs((gapOf.get('walk↔prototype') as Gap).intrinsic);
        const v = gapOf.get('prototype↔rebound') as Gap;
        const res = Math.max(resOf(rowName('prototype', false)), resOf(rowName('rebound', false)));
        const separated = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        verdict(
            '(P9)',
            separated && median(rowName('rebound', false)) < median(rowName('prototype', false)),
            'rebound is cheaper than prototype — the same handle built once and re-pointed, ' +
                'eight field stores against eight allocations per instance',
            `prototype↔rebound ${nsW(v.intrinsic)} over ${grains(
                v.intrinsic
            )} grains against its ` +
                `own two arms' resolution of ${f6(res)} ms, where walk↔prototype is ` +
                `${nsW((gapOf.get('walk↔prototype') as Gap).intrinsic)} — ` +
                `${
                    separated
                        ? `${(
                              (100 * Math.abs(v.intrinsic)) /
                              Math.max(protoGap, Number.MIN_VALUE)
                          ).toFixed(0)}% of the walk↔prototype gap. READ IT BESIDE (P7): ` +
                          '`ctor` and `rebound` remove the per-row `__proto__:` install by two ' +
                          'different routes, so both landing near the walk is the strongest ' +
                          'support M1 can get on this axis'
                        : 'the pair did not separate — removing the allocation changed nothing ' +
                          'measurable, and the prototype arm’s distance from the walk is not ' +
                          'its allocations'
                }`
        );
    } else {
        skipped('(P9)', 'walk, prototype or rebound is under the clock floor and was excluded');
    }

    if (usable('walk', 'rebound')) {
        const v = gapOf.get('walk↔rebound') as Gap;
        const res = Math.max(resOf(rowName('walk', false)), resOf(rowName('rebound', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        const under = median(rowName('rebound', false)) < median(rowName('walk', false));
        line(
            `   ⊘ (P10) NOT A PREDICTION — no direction was committed for walk ↔ rebound. It came ` +
                `back ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains against its own two ` +
                `arms' resolution of ${f6(res)} ms, ${
                    resolved && under
                        ? 'AND `rebound` IS UNDER `walk`: on this axis there is a composition a ' +
                          'user can write that costs less than the shipped door, and what it ' +
                          'skips is resolving the address out of the port and two arrays on ' +
                          'every write'
                        : resolved
                        ? 'and `rebound` is ABOVE `walk` — the portTable() frame and the eight ' +
                          'stores per instance cost more than the walk’s per-write loads'
                        : 'which does not resolve — no claim in either direction'
                }.`
        );
    } else {
        skipped('(P10)', 'walk or rebound is under the clock floor and was excluded');
    }

    if (usable('walk', 'accessor')) {
        const v = gapOf.get('walk↔accessor') as Gap;
        const res = Math.max(resOf(rowName('walk', false)), resOf(rowName('accessor', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        const ns = nsRaw(v.intrinsic);
        if (resolved) {
            verdict(
                '(P11)',
                ns > 0 && ns >= 0.5 && ns <= 4,
                'accessor is CHEAPER than walk by 0.5-4 ns per port write',
                `walk↔accessor ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains against ` +
                    `its own two arms' resolution of ${f6(res)} ms${
                        ns <= 0
                            ? ' — the accessor is DEARER, and the first suspect is the one thing ' +
                              'this arm exists to price: a store dispatching to a setter is not ' +
                              'compiled like a call. It is not the loads; the accessor makes ' +
                              'strictly fewer of them'
                            : ''
                    }`
            );
        } else {
            skipped(
                '(P11)',
                `walk↔accessor came back ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains ` +
                    `against a four-grain bar of ${(4 * grainWrite).toFixed(4)} ns/write and its ` +
                    `own arms' resolution of ${f6(res)} ms. THE BAR THAT REFUSED IT IS THE ${
                        grains(v.intrinsic) < 4 ? 'GRAIN' : 'RESOLUTION'
                    }. The predicted band starts at 0.5 ns/write, which this batch cannot see; ` +
                    'that is the scene’s limit and not a verdict. ' +
                    (grains(v.intrinsic) < 4
                        ? `Halve the grain: batch ${batch * 2}`
                        : 'Halving the grain will not reach it — the resolution scales with the ' +
                          "region exactly as the difference does. Read this pair's null for its " +
                          'bias-versus-noise split before spending wall clock.')
            );
        }
    } else {
        skipped('(P11)', 'walk or accessor is under the clock floor and was excluded');
    }

    if (usable('rebound', 'accessor')) {
        const v = gapOf.get('rebound↔accessor') as Gap;
        const res = Math.max(resOf(rowName('rebound', false)), resOf(rowName('accessor', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        line(
            `   ⊘ (P12) NOT A PREDICTION — no direction was committed for rebound ↔ accessor. ` +
                'One store per instance against eight says accessor; an unknown dispatch shape ' +
                `says nothing. It came back ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} ` +
                `grains against its own two arms' resolution of ${f6(res)} ms${
                    resolved ? '' : ', which does not resolve'
                }.`
        );
    } else {
        skipped('(P12)', 'rebound or accessor is under the clock floor and was excluded');
    }

    if (usable('accessor', 'protoPort')) {
        const v = gapOf.get('accessor↔protoPort') as Gap;
        const res = Math.max(resOf(rowName('accessor', false)), resOf(rowName('protoPort', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        const accessorCheaper =
            median(rowName('accessor', false)) < median(rowName('protoPort', false));
        if (resolved) {
            verdict(
                '(P13)',
                accessorCheaper,
                'the CAPTURED writer beats the writer reached through `this` — accessor is ' +
                    'cheaper than protoPort',
                `accessor↔protoPort ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains ` +
                    `against its own two arms' resolution of ${f6(res)} ms${
                        accessorCheaper
                            ? ''
                            : ' — the `this` lookup WON, and since it makes strictly more loads ' +
                              'the suspect is the call shape: a store dispatching to a setter ' +
                              'against a plain method call. Read `closure ↔ accessor` beside it'
                    }`
            );
        } else {
            skipped(
                '(P13)',
                `accessor↔protoPort came back ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} ` +
                    `grains against its own arms' resolution of ${f6(res)} ms and a four-grain ` +
                    `bar of ${(4 * grainWrite).toFixed(4)} ns/write. THE PAIR THE OWNER IS ` +
                    `DECIDING ON DID NOT SEPARATE AT THIS GRAIN — re-run at batch ${batch * 2} ` +
                    'before either shape is preferred on cost'
            );
        }
    } else {
        skipped('(P13)', 'accessor or protoPort is under the clock floor and was excluded');
    }

    if (usable('walk', 'protoPort')) {
        const v = gapOf.get('walk↔protoPort') as Gap;
        const res = Math.max(resOf(rowName('walk', false)), resOf(rowName('protoPort', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        if (resolved) {
            verdict(
                '(P14)',
                median(rowName('protoPort', false)) < median(rowName('walk', false)),
                'protoPort is cheaper than walk — the same body with the index made a literal, ' +
                    'and eight monomorphic writer sites instead of one megamorphic. NO SIZE IS ' +
                    'PREDICTED: one property load and a call-site split, both fractions of a ' +
                    'nanosecond by construction',
                `walk↔protoPort ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains against ` +
                    `its own two arms' resolution of ${f6(res)} ms`
            );
        } else {
            skipped(
                '(P14)',
                `walk↔protoPort came back ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains ` +
                    'and did not clear its own resolution and four grains'
            );
        }
    } else {
        skipped('(P14)', 'walk or protoPort is under the clock floor and was excluded');
    }

    if (usable('ctor', 'classNode')) {
        const v = gapOf.get('ctor↔classNode') as Gap;
        const res = Math.max(resOf(rowName('ctor', false)), resOf(rowName('classNode', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        if (resolved) {
            verdict(
                '(P15)',
                median(rowName('classNode', false)) < median(rowName('ctor', false)),
                'classNode is cheaper than ctor — same `new`, one object of one field per ' +
                    'instance instead of eight of three, and the writer two hops out instead of ' +
                    'in the receiver',
                `ctor↔classNode ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains against ` +
                    `its own two arms' resolution of ${f6(res)} ms`
            );
        } else {
            skipped(
                '(P15)',
                `ctor↔classNode came back ${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains ` +
                    'and did not clear its own resolution and four grains'
            );
        }
    } else {
        skipped('(P15)', 'ctor or classNode is under the clock floor and was excluded');
    }

    if (usable('walk', 'classNode')) {
        const v = gapOf.get('walk↔classNode') as Gap;
        const res = Math.max(resOf(rowName('walk', false)), resOf(rowName('classNode', false)));
        verdict(
            '(P16)',
            Math.abs(nsRaw(v.intrinsic)) <= 5,
            'walk ↔ classNode is within 5 ns per port write — a warm monomorphic lookup two ' +
                'prototype hops out costs what an own load costs, and what is left is one ' +
                'allocation and two frames per instance, an eighth of each per write',
            `${nsW(v.intrinsic)} over ${grains(v.intrinsic)} grains against its own two arms' ` +
                `resolution of ${f6(res)} ms. THE HOP IS ${
                    Math.abs(nsRaw(v.intrinsic)) <= 5
                        ? 'NOT VISIBLE AT THIS GRAIN — one class over any backend costs what the ' +
                          'shipped door costs, within the bar'
                        : 'OR THE ALLOCATION IS REAL, and `ctor ↔ classNode` says which: the two ' +
                          'differ in the allocation count and not in the hop'
                }`
        );
    } else {
        skipped('(P16)', 'walk or classNode is under the clock floor and was excluded');
    }

    // ── WHAT IT CANNOT SAY, PRINTED WITH THE NUMBERS RATHER THAN LEFT IN THE HEADER ─────
    line('');
    line('WHAT THIS RUN CANNOT SAY — printed here so it travels with the table');
    line(
        '  * NOTHING ABOUT A DOM WRITE. The server writes into a STRING. There is no node and ' +
            'no node indirection: the DOM’s walk is `setters[i](nodes[elem[i]], v)`, two ' +
            'array loads this backend does not have, so the walk arm here is cheaper than the ' +
            'DOM’s walk by an amount this axis does not measure and cannot bound.'
    );
    line(
        '  * NOTHING ABOUT A PORT WRITTEN MORE THAN ONCE. Every port here is written EXACTLY ONCE ' +
            'per instance, so a per-port handle is built and used once — the worst amortisation ' +
            'the four per-row handle arms can get and the best case for the walk. The crossover ' +
            'in writes-per-handle is an UPDATE question and this backend has no updates.'
    );
    line(
        '  * NOTHING ABOUT THE ALLOCATION SEPARATELY FROM THE CALL SITE for the closure arm — see ' +
            'the WRITER CALL SITES line in the census. The row that would separate them is a door ' +
            'whose eight closures all call ONE shared writer, and it is not built.'
    );
    line(
        '  * NOTHING ABOUT AN ALLOCATION THAT SURVIVES THE WIRE, FOR FOUR OF THE SIX DOORS. No ' +
            'handle of walk, prototype, ctor or closure escapes, so the engine may have removed ' +
            'every one of them; a DOM door handed to `c.on` cannot be removed. `escaped` and ' +
            '`rebound` are the two rows whose handles survive, and what `escaped` costs over ' +
            '`closure` is that survival FUSED with the eight stores that cause it.'
    );
    line(
        '  * NOTHING ABOUT THE OLD ONE-DIRECTIONAL ESCAPE CAVEAT. This file used to say only ' +
            '"if the handle arms land on the walk, suspect escape analysis". What happened was ' +
            'ONE ARM ON THE WALK AND ONE 3× ABOVE IT, which is consistent with the closures being ' +
            'removed and the objects not, with the objects paying an install the closures do not, ' +
            'and with both at once. `escaped` and `ctor` are the rows that split those, and until ' +
            'they are read together NEITHER READING MAY BE QUOTED.'
    );
    line(
        '  * NOTHING ABOUT A HANDLE HOISTED OUT OF THE LOOP ENTIRELY. The port table is each ' +
            'instance’s OWN array — the `the port table` gate counts one per row before anything ' +
            'is timed — so the smallest handle strategy this backend admits still touches eight ' +
            'fields per instance. What a pooled backend would save is UNMEASURED here.'
    );
    line(
        '  * NOTHING ABOUT AN ACCESSOR ON THE RENDERED INSTANCE. Every instance’s prototype is ' +
            'the backend object that all eighteen programs render through, so installing eight ' +
            'accessors there would change the map of every instance in every arm; a second ' +
            'backend would give the arm its own schema and its own writers, which the schema gate ' +
            'refuses. The receiver is a module-level row instead, and the one store per instance ' +
            'that a real instance-prototype accessor would not pay is inside every accessor gap.'
    );
    line(
        '  * NOTHING ABOUT A WRITER REACHED WITHOUT A TABLE. `protoPort` reaches it through ' +
            '`this.writers[LITERAL]`, because on this backend an attribute writer is shared per ' +
            'NAME and carries it, so a per-kind method would not be the schema’s writer and the ' +
            'schema gate exists to refuse that. The table load is counted as the arm’s cost; the ' +
            'shape the spec named is UNMEASURED and needs a scene of eight text ports.'
    );
    line(
        '  * NOTHING ABOUT WHETHER A SETTER AND A METHOD COMPILE ALIKE, separately from the loads. ' +
            'Every pair containing `accessor` fuses the call shape with something else — the ' +
            'address resolution and the call-site split against `walk`, seven stores per instance ' +
            'against `rebound`, eight function objects per instance against `closure`, and one ' +
            'store per instance plus the writer’s two loads against `protoPort`.'
    );
    line(
        '  * NOTHING ABOUT `classNode` WITHOUT ONE EXTRA ALLOCATION. In the design the class ' +
            'instance IS the node and replaces the literal the backend builds; here it is built ' +
            'beside it, because `createInstance` belongs to the backend and a second backend means ' +
            'a second schema. Every classNode figure carries one object and one constructor frame ' +
            'per instance that the design would not pay.'
    );
    line(
        '  * NOTHING ABOUT WHERE THE WRITERS WOULD REALLY LIVE. All eight sit two hops out so the ' +
            'hop is measured at full strength; in a real composition four of them would sit one ' +
            'hop out, on the per-schema prototype. The arm is an upper bound on the hop.'
    );
    line(
        '  * NOTHING ABOUT REENTRANCY. `rebound`’s eight handles and `accessor`’s one receiver ' +
            'are module-level, so a component rendering another instance of itself between the ' +
            're-point and the writes would ' +
            'corrupt them. Nothing in this scene nests; a strategy scoped per render instead of ' +
            'per module would pay for that scoping, and this axis does not price it.'
    );
    line(
        '  * NOTHING ABOUT THE portTable() FRAME SEPARATELY FROM THE HANDLE. Every handle arm ' +
            'makes that call once per instance and the walk never does, so every walk ↔ handle ' +
            'figure has one frame per instance inside it. The fr/i column prints it; no arm ' +
            'subtracts it.'
    );
    line(
        `  * NOTHING ABOUT GC SEPARATELY FROM THE WORK. The sink holds all ${reps} renders alive ` +
            `for the whole region (~${((reps * reference.length) / 1e6).toFixed(1)} MB), so an ` +
            `arm that also allocates ${ROWS * PORTS * reps} handles per region collects them ` +
            'against a live set held for an unrelated reason. No heap column is printed and the ' +
            'two are not separated.'
    );
    line(
        '  * NOTHING ABOUT A CONSTRUCTOR SEPARATELY FROM ITS FRAME. `ctor` is the only arm that ' +
            'spends a call the others do not, once per port per instance, and no spelling of ' +
            '`new` omits it. So `prototype ↔ ctor` bounds the literal’s prototype install from ' +
            'ONE SIDE ONLY: a ctor that is cheaper proves the install costs more than a frame; a ' +
            'ctor that is not proves nothing about the install at all.'
    );
    line(
        '  * NOTHING ABOUT THE PRICE OF AN ESCAPE SEPARATELY FROM THE ESCAPING. There is no arm ' +
            'here that pays the eight stores without escaping anything, so the store and what it ' +
            'keeps alive arrive together. The row that would separate them stores eight things ' +
            'that were going to be materialised anyway; it is not built.'
    );
    line(
        `  * NOTHING BELOW ${(4 * grainWrite).toFixed(4)} ns PER PORT WRITE at this batch. Four ` +
            `grains is the bar and one grain is ${grainWrite.toFixed(4)} ns/write.`
    );
}
