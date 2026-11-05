// WAYS TO WRITE A COMPONENT'S PER-INSTANCE UPDATE PATH, PRICED SEPARATELY ON FOUR SCENES,
// WITH A STRAIGHT-LINE PROGRAM UNDER ALL OF THEM.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// FORM B is the alternative this axis exists to price, and until this file it was READ FROM CODE AND
// NOT MEASURED. Per component, declared once and shared by every instance: the pure derivations, and
// for each one an integer mask of the state fields it depends on. Per instance: a state object, the
// connector's own port handle (`c.fillDoors()`), and an integer. A transition writes state fields, ORing
// a `touched` bitmask; a commit runs each derivation whose `mask & touched` is non-zero, exactly
// once, and writes the result through the port handle. No cell, no subscription, no disposer, no
// equality test, no revision clock.
//
// Its whole machinery is `exo-machine.ts`, beside this file, and it is about forty lines of running
// code. The library does not ship it. IF IT WINS HERE, THAT FILE IS THE PROPOSAL; if it does not,
// this axis is the reason nobody has to write it.
//
// FORM C is form B's shape with the one thing form B does badly taken out, and it is what
// `@exodra/core` now ships (`todo-name-machine/`). Form B's commit SCANS EVERY DECLARED DERIVATION
// and tests its mask — O(declared) — so a write to a field nobody derives from still runs a loop.
// Form C inverts the author's per-derivation FIELD masks ONCE, at module load, into a per-FIELD set
// of the derivations that read it; a transition ORs that set into the instance, and the commit
// walks its SET BITS. O(affected), and an unread field's set is `0`. It also carries the pending
// set, THIS INSTANCE'S PORT TABLE and THE SCHEMA'S WRITE on the state object — two references,
// not a wrapper — so an instance is literally ONE object where form B's is three, and it attaches
// the commit to the transition, so there is no commit to forget.
//
// `machine·copy` is form C's PROGRAM with the port write replaced by the DOM's own — writer and node
// slot resolved per derivation at the first wire, `writers[i](nodes[slots[i]], value)`. It is a
// participant and not a library feature.
//
// ═══ AND WHAT THIS PARAGRAPH USED TO SAY WAS FALSE, WHICH IS RECORDED RATHER THAN EDITED AWAY ═══
//
// IT SAID `machine·copy` WAS "form C with the PORT WRITE replaced" AND "a COPY of the library's commit
// with the write swapped", AND ITS CAPTION SAID IT "Prices the LAST indirection". All three were
// read off this file as a measurement, quoted to the library's owner, and retracted. `machine·copy` is
// a copy of the shipped commit with the write swapped AND FOUR THINGS OMITTED — the effect-mask
// split; the per-derivation `ports[i]` load and its null branch; `exoTransition`'s two
// calls (it used to be "two calls and a batch test", and the shipped closure no longer makes that
// test — see item (3) of the list); and the driver's property load per tag. Its gap to `machine` is
// therefore "one write plus four omissions" and NOTHING SEPARATES THEM. The list is written out
// once, in `machine·write`'s block below.
//
// `machine·write` IS THE ROW IT WAS MISTAKEN FOR, and it is the only place the write line is
// priced alone: the shipped commit copied with ONE line changed, keeping all four, running through
// `exoTransition`'s wrapper, over `machine`'s own state type and through `compiledDriver` itself.
//
// A THIRD POINT ON THAT LINE STOOD HERE AND IS STRUCK. `machine·bound` wrote `writes[i](value)`
// through `c.portWriter(port)` — the one of the three that was a LIBRARY FEATURE rather
// than a participant's hand-written loop, resolving writer and node at hand-out and closing over
// both: two calls and ONE array load, against `machine·copy`'s one call and three and `machine`'s two
// and three. THE FEATURE WAS DELETED FROM EVERY BACKEND, so the row went with it. What killed it was
// not this axis: bare shapes, 1000 instances × 5 ports, null pair 0.006 ns per write, the hand-out
// (5.8 ns per port per instance) amortising exactly as a cache should onto a value 0.655 ns per
// write ABOVE `c.set` and staying there from one write to sixty-four — because its body was
// `(value) => { write(at, value); }` and a second call frame is not amortisable. WHAT THIS AXIS
// LOSES BY IT is the one gap in the family that was purely a write: `machine·copy ↔ machine·bound`
// omitted the identical four things, so nothing but the write spelling stood between them. That
// comparison has no substitute here; `machine·write ↔ machine` asks a different question (the
// shipped commit with one line changed) and is the row that remains.
//
// `wire` IS THE ROW THAT HAS NONE OF THIS. State in four closure variables, `const ports =
// c.fillDoors()` kept at the wire, and four handlers that recompute their own derived value and write
// it. No transition, no mask, no commit, no derivation table — and no batch, no declaration and no
// ordering either. It is `apps/exodra/exodra.tsx`'s card wire on this component, and it is
// on this axis because every other row on it is a machine, so what a machine
// REPLACES was not on the axis at all. See `THE WIRE` below for what it allocates and for what it
// cannot do.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── AND THE SAME FIELD AT WIDTH, WHICH IS THE SCENE THE DESIGN WAS BUILT FOR ─────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// EVERYTHING ABOVE IS A COMPONENT WITH TWO DERIVATIONS, AND THAT IS THE ONE SHAPE IN WHICH FORM
// C's CENTRAL CLAIM CANNOT SHOW. O(affected) against O(declared) differs by at most one mask test
// when two are declared; this file's own P6 came back with no direction predicted and printed the
// reason — "a component with twenty would be the scene that shows it, and this axis does not have
// one". TABLES 5 TO 8 ARE THAT SCENE. See `THE WIDE COMPONENT` below for its shape.
//
// WHICH SCENE FLATTERS WHICH FORM, said here because both sentences belong in the file:
//
//   THE NARROW SCENE FLATTERS `machine·scan`. A two-iteration mask scan is form B's cheapest possible
//   commit. A
//   reader who takes TABLES 1-4 as the price of these forms is reading their best case.
//
//   THE WIDE SCENE FLATTERS `machine`. Twenty derivations is where an inverted table has the most to
//   skip. A reader who takes TABLES
//   5-8 as the price of these forms is reading form C's best case. BOTH ARE REAL COMPONENTS and
//   the pair of tables is the finding — it is where the design starts to pay, not whether it does.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE COMPONENT, AND WHY IT IS THIS ONE ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//     <div class="tag"><button type="button">{label}</button><small>{size}</small></div>
//
// It was chosen because it has THREE DIFFERENT KINDS OF SIGNAL rather than one, and a component with
// one kind cannot tell the two forms apart:
//
//   `name`   PUSHED IN FROM OUTSIDE — a store refetched, a parent decided.
//   `open`   THE TAG'S OWN STATE, toggled by a click ON ITSELF. Collapsed shows the first three
//            characters of the name; expanded shows all of it.
//   `width`  THE RENDERED PIXEL WIDTH of its own block, written into the second text port.
//
// TWO DERIVATIONS: `label ← f(name, open)` and `size ← f(width)`. One reads TWO fields and one reads
// ONE, which is the only structure in which a mask can be shown to do anything.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── `width` IS FED IN FROM OUTSIDE THE CLOCK, AND THAT IS A MODELLING DECISION, NOT A SHORTCUT ─
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A rendered width CANNOT BE COMPUTED FROM STATE. It can only be read out of the document after
// layout, so it is NOT a derivation — it is a signal that arrives from outside as a transition, the
// same shape as `setName`. Both forms model it that way and neither is given a shortcut.
//
// NO `getBoundingClientRect` IS CALLED ANYWHERE IN THIS FILE. A forced synchronous layout inside a
// timed region costs more than everything else in that region put together, and an axis that
// contained one would be measuring Blink's layout engine and reporting it as the price of a state
// machine. The widths are integers from a table, handed in from outside the clock.
//
// WHAT THAT LEAVES UNMEASURED, said here rather than at the bottom: a real program pays ONE LAYOUT
// FLUSH per batch of width reads, and that flush is the same for both forms and is not on any table
// below. Nothing here says what a width-change update COSTS a page; what it says is what the two
// forms cost once the number has arrived.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE FOURTEEN TABLES, MEASURED SEPARATELY, NEVER ROLLED INTO ONE NUMBER ──────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// TABLE 1 — THE MOUNT. TAGS tags built and inserted. Form B should ALLOCATE LESS PER INSTANCE —
//     that is the claim, and this is where it shows or does not.
//
// TABLE 2 — ONE FIELD. `name` changes on every tag. ONE derivation runs. The common case.
//
// TABLE 3 — TWO FIELDS AT ONCE. `name` AND `open` both change on every tag, as one change. THIS IS
//     THE CASE THE MASK EXISTS FOR: form B must run `label` ONCE, not twice.
//
// TABLE 4 — A FIELD NOTHING DEPENDS ON. `note` is a fourth state field that NO DERIVATION READS. It
//     was added for this table and for nothing else, and it is the table where form B is most likely
//     to LOSE; see the prediction block.
//
// The `width` signal is NOT its own table. It is one field feeding one derivation, which is TABLE
// 2's shape exactly, so another table would publish the same sentence twice. It is mounted, it is
// written directly, and it is GATED — every participant's markup and text are compared after a width round —
// and it is never timed.
//
// TABLES 5, 6, 7 AND 8 ARE THE SAME FOUR QUESTIONS ON THE WIDE COMPONENT — twenty fields, twenty
// derivations, a tangle, a field nothing reads and a chain. Each carries its own floor, its own
// nulls, its own resolution and its own round count, and none of them is read against a narrow
// table's anything. See `THE WIDE COMPONENT` further down for the shape and for what each scene
// wakes.
//
// TABLES 9 AND 10 ARE ONE PAGE rather than one component: three component types of three widths (0,
// 2 and 20 derivations), nested two levels, mounted as one tree and updated in one round. It is a
// WEIGHTED AVERAGE OVER ONE MIX and says nothing about what a real application costs; what it says
// is that no participant gets to be measured only on the width that suits it. See `THE APP SCENE`.
//
// TABLES 11 TO 14 MOVE A VARIABLE NO OTHER TABLE HERE MOVES: HOW MANY TRANSITIONS A COMPONENT
// DECLARES. Everything above varies how much ONE transition does — one field, two fields, three —
// while the COUNT of them per component stays at four (narrow) and three (wide), so the axis has
// priced the width of a transition at every width it has and has never priced the number of them.
// That is the variable on which the two shapes are structurally different rather than differently
// spelled: a wire's transition is a closure over the INSTANCE, so its per-instance allocation
// carries a factor of N; a machine's is declared once per COMPONENT and takes the instance as an
// argument, so its does not. EVERY wire↔machine VERDICT ABOVE WAS TAKEN AT ONE VALUE OF N. See `THE
// TRANSITION LADDER` for the rungs, for the dummy-transition trap the whole thing turns on, and for
// why a row on those tables may not be read across rungs while the GAP may.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── AND TWO QUESTIONS ABOUT FORM C ITSELF, ADDED AS ROWS AND NOT AS TABLES ──────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Everything above compares FORMS. These two compare two ways of writing the SAME form, and both
// are settled on the tables that already exist rather than on new ones — same scenes, same round
// counts, same nulls, with each new shape given a null of its own.
//
// ═══ WHERE THE STATE LIVES — `machine` vs `machine·array` vs `machine·nodes` ═══
//
// The shipped machine keeps an instance's state as AN OBJECT WITH NAMED FIELDS. Nothing in user
// code depends on that: a derivation is handed the VALUES of the fields it declared, and a field is
// reached only through a `TExoMachineField`, which carries its own reader and writer. So
// the question is purely one of cost, and there are three answers:
//
//   `machine`       VARIANT 1, WHAT SHIPS — `{ name, open, width, note }` and the four bookkeeping
//             fields. IT IS THE SHIPPED CODE, IMPORTED, and nothing below re-implements it: the
//             `machine` rows are the same rows every other verdict on this axis is read against.
//   `machine·array`   VARIANT 2 — the instance's OWN flat array, state slots numbered from zero. TWO
//             allocations per instance where the object form makes one.
//   `machine·nodes`   VARIANT 3 — the SAME array the instance's DOM NODES live in, one numbering for
//             markup ports and state together. ONE allocation per instance, and a node table that
//             is no longer uniform.
//
// `machine-state-shapes.ts` beside this file is the whole of variants 2 and 3 and carries the
// argument; what is here is this axis's two components declared against it.
//
// VARIANT 3 CARRIES A SPECIFIC RISK AND IT IS WHY NO NEW TABLE WAS ADDED FOR IT. `nodes[elem[port]]`
// is read on EVERY PORT WRITE, and variant 3 puts strings, booleans and numbers into that array. A
// scene that only wrote state would not see it. TABLES 2, 3, 6 and 7 all end in real port writes,
// and TABLES 4 and 8 end in none — so the pair of readings is what says whether a difference lives
// in the WRITE or in the STORE.
//
// WHICH SCENE FLATTERS WHICH, said before the numbers:
//   THE NARROW TABLES FLATTER `machine`. Four named slots is what V8's in-object storage is best at, and
//   both tables reach a value through two loads where a property is one.
//   THE WIDE TABLES FLATTER `machine·array` AND `machine·nodes`, for three reasons at once — an indexed store where
//   a named property needs a per-field closure, an all-integer array that is PACKED_SMI, and an
//   object past the width a literal keeps entirely in-object. THE THREE ARE NOT SEPARATED HERE.
//
// ═══ HOW A MULTI-FIELD TRANSITION IS SPELLED — `machine` vs `machine·handle` vs `machine·tuple` ═══
//
//   `machine`        writes the properties and ORs the marks in the body. No call, no allocation, and the
//              author can OR the wrong mark.
//   `machine·handle`   one closure per field doing its store AND its mark. One call per field written,
//              never an allocation, and the two can no longer be written apart.
//   `machine·tuple`  the transition DECLARES the fields it writes and `by` hands back their values. ONE
//              ARRAY PER CALL at arity two and above — and a BARE VALUE at arity one, which is why
//              TABLE 2 is in this comparison: it prices the tuple's calls with its allocation taken
//              out, and TABLE 3 puts the allocation back.
//
// THESE THREE APPEAR ON THE UPDATE TABLES ONLY. They build the identical state object through the
// identical wire and differ only inside a transition, so a mount table could only print one number
// three times.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE FIELD ───────────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//   `floor`              THE FLOOR. A straight-line program with no abstraction: prototypes cloned
//                        by hand, its own Text nodes held in fields, `.data` written directly, its
//                        own state in plain properties, its own `addEventListener`. No declaration,
//                        no schema, no port, no connector, no source. Every axis in this directory
//                        carries one and this suite's rule is that an axis without one can rank its
//                        participants and cannot say what any of them is worth.
//
//   `machine·scan`       FORM B. `exo-machine.ts`, this component's two derivations declared once
//                        at module load, one state object and one integer per instance.
//
//   `machine`            FORM C — the compiled machine `@exodra/core` ships. The same division of
//                        labour as `machine·scan`: the caller writes fields and the derivations are
//                        the component's. What differs is the bookkeeping — an inverted
//                        field→derivations table, a commit that walks set bits, and one object per
//                        instance instead of two. `machine·scan` against `machine` is therefore a
//                        comparison of TWO SPELLINGS OF ONE IDEA, and TABLE 4 is where they differ
//                        by a mechanism rather than by noise.
//
//   `machine·batch`      GONE, AND THE AXIS IS POORER BY EXACTLY WHAT IT MEASURED. It was the same
//                        component under one `exoMachineBatch` per ROUND — a module-global
//                        depth that deferred the commits of all TAGS tags and drained them at the
//                        end — and it was the only row on this axis that priced coalescing on the
//                        machine side. THAT MECHANISM NO LONGER EXISTS
//                        IN `@exodra/core`: a transition applies and settles with nothing in
//                        between, and batching moved to `enode.hold(of, body)`, a door
//                        over ONE NAMED INSTANCE.
//
//                        IT WAS NOT CONVERTED TO A HOLD, and the reason is in this file rather than
//                        in the library: every driver here makes EXACTLY ONE transition call per
//                        instance per scene, `setNameAndOpen` and `ops.some` included, because a
//                        transition that writes two or three fields is already one commit. A hold
//                        around a single transition coalesces NOTHING, so the row would have priced
//                        a wrapper and printed it in a column captioned «batch».
//
//                        THE PRICE OF COALESCING ON THE MACHINE
//                        SIDE IS UNMEASURED: not zero, not small, UNMEASURED. Measuring it needs a
//                        scene this axis does not contain — two SEPARATE transitions on the SAME
//                        instance in one round — and building that scene changes every driver here.
//
//   `machine·copy`       FORM C'S PROGRAM WITH THE DOM'S OWN WRITE — the port write replaced by the
//                        writer and slot the schema already resolved. THE LINE THAT USED TO STAND
//                        HERE SAID "same program, same transitions, same bit walk", AND THE LAST
//                        TWO WERE FALSE: its transitions are hand-written where `machine`'s go
//                        through `exoTransition`, and its bit walk omits the effect-mask split and
//                        the `ports[i]` load and branch. Its driver differs too. Four
//                        omissions, listed in `machine·write`'s block, and its gap to `machine`
//                        carries all of them. WHAT IT WAS GOOD FOR WAS `machine·bound`, which
//                        omitted the identical four — and that row is struck, so this one now has
//                        no partner it can be read against purely as a write.
//
//   `machine·write`      THE SAME QUESTION ASKED PROPERLY — `commitExoMachine` copied
//                        with ONE line changed, the write, and everything else kept: the effect-
//                        mask split, the `ports[i]` load, the null branch, the store
//                        path, the `after` OR, `exoTransition`'s wrapper, `machine`'s own state
//                        type and `compiledDriver` itself. Its gap to `machine` is attributable to
//                        that line and to nothing else, and if it does not clear the resolution
//                        then the write line is below what this instrument sees — which is what
//                        `machine·copy`'s number was wrongly quoted as saying.
//
//   `machine·bound`      STRUCK, WITH THE LIBRARY FEATURE IT WAS THE ONLY ROW FOR. It wrote
//                        `writes[i](value)` through `c.portWriter(port)`, which resolved
//                        the writer AND the node at hand-out — two calls and one array load against
//                        `machine·copy`'s one call and three. THE METHOD IS DELETED FROM EVERY
//                        BACKEND: measured on bare shapes, 1000 instances × 5 ports, null pair
//                        0.006 ns per write, its hand-out amortised onto 0.655 ns per write ABOVE
//                        `c.set` and stayed there, because the function it handed back cost a second
//                        call frame and a frame is not amortisable. P19 went with it, and so did the
//                        SIXTH NULL and this axis's only purely-a-write pair. Nothing was rebuilt in
//                        its place: a row for a FLAT writer (the write inlined at hand-out, no call
//                        inside) would be a different feature, and no such feature exists.
//
//   `wire`               NO MACHINE AT ALL, AND IT IS NOT A VARIANT OF ANYTHING ABOVE. Four closure
//                        variables, `c.fillDoors()` kept at the wire, four handlers that recompute
//                        their own derived value and write it. It is the shape the library shipped
//                        first and the shape every other row here is an alternative to; until this
//                        row every participant on the axis was a machine and the
//                        thing they replace was absent. Its prediction (P21) commits to a SHAPE and
//                        to no direction. IT HAS A WIDE ROW TOO — twenty closure variables,
//                        nineteen ports written out, three doors, and the same hand-held map —
//                        because two derivations is the width at which a hand-held map and a
//                        compiled one cannot differ. That row is P22 and its block is `THE WIRE AT
//                        WIDTH`.
//
//   `machine·imperative` THE MACHINE'S CHEAP SPELLING, AND IT IS ON THE WIDE TABLES ONLY. A machine
//                        that declares NO DERIVATION, NO FILL and NO FIELD: its twenty values live
//                        in ONE CACHE SLOT (`m.keep`, one object of named properties per
//                        instance), because a field is an address for WAKING and nothing this row
//                        holds can wake anything. Three transitions
//                        declared ONCE PER COMPONENT that write the ports themselves with `c.text`,
//                        and an initial paint made by a FOURTH TRANSITION the shell fires at each
//                        row between building it and inserting it, because a machine takes no props
//                        and a row with no derivation has no fill to paint it. That mount shape —
//                        `wireExoNode(c.createExoNode(M))`, drive, `insert` — is the ONE way this row is not comparable to
//                        its neighbours; its own block prices it. UNTIL THIS ROW EVERY WIDE COMPARISON PUT THE
//                        MACHINE'S MOST EXPENSIVE SPELLING AGAINST THE WIRE'S ONLY ONE — `machine`
//                        carries twenty declarations, an inverted table, a mask, a pending word and
//                        a commit walk, and the spelling an author reaches for when the rules are
//                        three lines he is happy to write out was on no table. It allocates TWO
//                        objects per instance (plus the child `wireExoNode(c.createExoNode(M))` makes) against `machine`'s
//                        ONE and `wire`'s SIX, and NOTHING
//                        per door: that is the form's whole point, and a row that handed back bound
//                        callbacks would be `wire` wearing another name. Its prediction (P23)
//                        commits to a SHAPE and to no direction against either neighbour. Its block
//                        is `THE MACHINE'S CHEAP SPELLING AT WIDTH`, and that block also names the
//                        ONE CONFOUND its gap to `machine` carries. IT CARRIES A TWIN LIKE EVERY
//                        OTHER ROW — the SEVENTH null on the wide tables, and it is the null that
//                        makes P23's own comparisons readable: a gap is read against the nulls of
//                        THE TWO ROWS IN IT, so this pair inherits no other row's scatter (see
//                        `Floor`). The SIX nulls
//                        listed below are the NARROW tables'; this pair is on TABLES 5 TO 8 only.
//
//   `…·twin`             THE SIX NULLS — `machine·scan·twin`, `machine·twin`,
//                        `machine·array·twin`, `machine·nodes·twin`, `machine·write·twin` and
//                        `wire·twin`. (`machine·bound·twin` was the eighth and is struck with the
//                        row it doubled.) Each is a SECOND, SEPARATELY
//                        DECLARED, IDENTICAL participant — its own `createExoMachine` call for the tag
//                        AND for the shell, therefore its own declaration, its own compiled schema,
//                        and (for every machine row) its own derivation array or compiled program.
//                        Their true difference from the row they double is ZERO, so what the run
//                        reports between each pair is what it CANNOT TELL APART FROM NOTHING.
//                        SIX AND NOT ONE because a null is only a null for the shape it was taken
//                        on, and a scan-every-derivation program, a
//                        walk-the-set-bits program, two table-backed ones, the shipped commit with
//                        one line changed and a
//                        program with no machine in it at all do not spend their time in the same
//                        place. A GAP BETWEEN TWO ROWS IS READ AGAINST THE NULLS OF THOSE TWO
//                        ROWS — `max(nullOf(X), nullOf(Y))` — AND AGAINST NO OTHERS. It used to be
//                        read against the largest of them, which sounds conservative and is
//                        the defect that made a whole night's tables unreadable: one participant
//                        that scatters (one null 24× every other null on TABLE 5) set the
//                        reading for every pair on the table, and every row ADDED to the axis
//                        could only make that worse. THE TABLE-WIDE MAXIMUM IS STILL PRINTED, as
//                        what it is — the worst any comparison on that table can be read at — and
//                        it is still what bounds a pair containing a row with NO twin (`floor`,
//                        `machine·copy`, `machine·tuple`,
//                        `machine·handle`), because nothing narrower is known
//                        about those. Every printed line names which of the two rules it used.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHERE THIS AXIS IS STILL KIND TO FORM B, LISTED BECAUSE ITS AUTHOR WROTE IT ─────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  (1) THE COMPONENT'S SHAPE SUITS FORM B AND WAS CHOSEN BY FORM B'S BRIEF. Two derivations, both
//      pure, both scalar, both flat. NOTHING HERE COVERS: children that come and go, anything
//      needing a diff, a component whose derivations form a CHAIN (`exo-machine.ts` (c) — the
//      sharpest thing form B gives up), a component with a reactive children port, or a component
//      with more than 31 state fields.
//  (2) TWO DERIVATIONS IS THE BEST CASE FOR FORM B'S COMMIT LOOP, AND IT IS THE NARROW TABLES'
//      LIMIT RATHER THAN THIS FILE'S. `exoCommit` is O(DECLARED derivations), not O(matched ones):
//      every transition pays one mask test per declared derivation. At two that is two tests, so on
//      TABLES 1-4 form B is measured where its loop costs least and form C, whose whole change is
//      that the loop is O(AFFECTED), where it can win least. THAT IS WHAT TABLES 5-8 ARE FOR: the
//      same four questions on a component with twenty. Read the two sets together — the narrow
//      tables are not wrong, they are one width.
//  (2a) THE CHAIN IS MEASURED ON TABLE 7 AND NOWHERE ELSE. Form C can express one — a derivation may
//      store its result into a state field, and the topological numbering makes the dependents run
//      in the same commit — form B cannot express one at all. No NARROW row declares one, so TABLES 1-4 pay nothing for the
//      store, the `after`-mask OR or the extra branch per derivation that the chain costs.
//  (3) NO ROW SUBSCRIBES TO ANYTHING. Every row is driven by a caller that knows what changed; a
//      component that follows an outside source pays an `onChange` subscription per instance and a
//      listener call per notification, and no table here carries either.
//  (4) NOTHING IS TORN DOWN HERE, and NO TABLE HERE MEASURES TEARDOWN AT ALL.
//  (5) THE EVENT CLOSURE IS A COMMON ADDEND AND FORM B DOES NOT ESCAPE IT. "No closures per
//      instance" is FALSE as measured here: every participant, the floor included, allocates one
//      click closure and attaches one listener per tag. What form B removes is the closure per
//      BOUND PORT, never the closure per event. The click is in TABLE 1 for all five and in no
//      update table for any of them.
//  (6) NOTHING IS COMMITTED TWICE AND NOTHING FORGETS TO COMMIT. `exo-machine.ts` (e): a transition
//      that skips its commit writes the state and does not move the screen, and no type, no test
//      and no gate in this file could catch that in a real application. Form C cannot express the
//      bug — its transitions are declared with the commit attached
//      and there is no bare commit in the package's surface. That is a correctness difference
//      between `machine·scan` and `machine` with no line on any table, and it is the reason `machine`'s driver makes ONE
//      call per tag where `machine·scan`'s makes two.
//  (7) THE DRIVER HOLDS EVERY MACHINE IN A DENSE ARRAY, collected untimed after the mount. A real
//      application holds them wherever it holds them, and `exo-machine.ts` (f) has no disposal
//      hook, so an unmounted instance's machine goes on accepting transitions.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── PREDICTIONS, COMMITTED HERE BEFORE THE FIRST RUN, VERDICTS PRINTED MECHANICALLY ─────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//   P4. UNREAD FIELD: `floor` ≤ `machine·scan`. Form B is NOT free on this table: it pays
//       a field store, a mask OR, and one mask test per declared derivation, where `floor` pays a
//       field store and stops.
//   P5. EVERY GAP THIS AXIS PUBLISHES CLEARS ITS OWN PAIR'S FLOOR — the larger of the two rows'
//       nulls, or the table's maximum where one of them has no null. A gap that does not is
//       not a gap, and the verdict block says so by name, with the floor it used, rather than
//       quoting it.
//   P6. UNREAD FIELD: `machine` < `machine·scan`. MECHANISM: `note`'s entry in the inverted table is `0`, so the
//       mark ORs a zero and the commit returns on its first comparison, where `machine·scan` runs a loop over
//       every declared derivation. ON TABLES 2 AND 3 NO DIRECTION IS PREDICTED between `machine` and `machine·scan`:
//       this component declares TWO derivations, which is the smallest scene in which O(affected)
//       can beat O(declared), and the saving there is at most one mask test.
//   P7. PORTABILITY: `machine·copy` ≤ `machine`. IT WAS COMMITTED AS "by the write and at the mount by the
//       ports object it does not allocate", AND BOTH HALVES OF THAT MECHANISM HAVE SINCE FAILED:
//       the mount half is answered at zero (the machine allocates no wrapper), and the update half
//       names one cause for a gap that carries five (the write and four omissions). The PREDICTION
//       — that the direct row is not slower — still stands and is still judged. THE MECHANISM DOES
//       NOT, and what replaced it is P20, on `machine·write`, which is the same question with the four
//       omissions put back.
//   P8. BATCHING: WITHDRAWN, AND NOT BECAUSE IT FAILED. It predicted `machine·batch` > `machine`
//       everywhere here, because each round writes each tag once and there was nothing for a batch
//       to coalesce. THE ROW IT PREDICTS NO LONGER EXISTS: the module-global batch was deleted from
//       `@exodra/core`, the per-instance `enode.hold` that replaced it would coalesce nothing
//       in any scene this file drives, and a hold row would have priced a wrapper under a caption
//       reading «batch». THE PRICE OF COALESCING ON THE MACHINE SIDE IS
//       UNMEASURED HERE — not predicted and not measured.
//
// AND P9 TO P22 ARE COMMITTED BESIDE THE ROWS AND TABLES THEY BELONG TO rather than here, each in
// the block that builds what it predicts and each printed by the same machinery.
//
//   P19 IS WITHDRAWN, AND NOT BECAUSE IT FAILED. It was the THIRD SPELLING OF THE WRITE
//       (`machine·bound`) and committed to a SHAPE — that not all three of `machine`,
//       `machine·copy` and `machine·bound` separate against THEIR OWN PAIR FLOORS on TABLE 2 — with
//       no direction predicted between the two non-portable rows. THE ROW IT PREDICTS NO LONGER
//       EXISTS: `c.portWriter(port)` was deleted from every backend on a measurement of
//       its own (0.655 ns per write ABOVE `c.set`, converged, because the returned function cost a
//       call frame). No prediction replaces it, and P19's number is not reassigned.
//   P20 is `machine·write`: the gap `machine·write ↔ machine` is SMALLER than `machine·copy ↔ machine`, or both are
//       UNRESOLVED — which is a claim about whether the four omissions carry any of `machine·copy`'s
//       gap, and no claim at all about the size or the sign of the write. Its block is `FORM C
//       WITH THE WRITE LINE SWAPPED AND NOTHING ELSE`.
//   P21 is `wire` against `machine`, and it commits to NO DIRECTION — only to the pair being judged
//       against ITS OWN FLOOR (both rows declare a null, so `max` of those two and no others) and
//       printed SEPARATED or UNRESOLVED. It is the
//       question the app axis has been unable to resolve, on an instrument two orders of
//       magnitude coarser than this one. Its block is `THE WIRE`.
//   P22 is THE SAME PAIR AT WIDTH, on TABLES 5 TO 8, and it is P21 asked where an answer is
//       possible: two derivations is the width at which a hand-held dependency map and a compiled
//       one cannot differ, and twenty is not. IT COMMITS TO NO DIRECTION BETWEEN `wire` AND `machine`
//       either — only to the pair being judged against ITS OWN FLOOR on each table — AND TO ONE
//       DIRECTION AGAINST THE FLOOR: `wire` lands AT OR BELOW `floor` on TABLE 6, because both
//       run the three woken derivations and the wire's only structural addition is `ports.set`
//       against a `.data` store. Its block is `THE WIRE AT WIDTH`, and that block also names the
//       spelling it did NOT measure — a wire that refreshes every port on any change.
//   P23 is `machine·imperative` — THE MACHINE'S CHEAP SPELLING — against BOTH its neighbours, and it commits
//       to NO DIRECTION against either: only to each pair being judged against ITS OWN FLOOR —
//       all three rows declare a null, so each gap is read against the two in it and against no
//       other row on the table — and printed SEPARATED or UNRESOLVED. THIS IS THE COMPARISON THE
//       TABLE-WIDE FLOOR WAS BLINDING: on one run `wire` and `machine·imperative` both nulled at
//       3.125001 µs per mount while another row nulled at 75.000003, and the pair was published
//       UNRESOLVED at 0.13 floors where against its own two it is 1.5. It exists because P21 and P22 both compared
//       the machine's DEAREST spelling with the wire's only one, and the cheap spelling — no
//       derivation, no fill, transitions declared once per component writing the ports themselves —
//       was on no table at all. THE BLOCK ALSO NAMES THE CONFOUND: `machine·imperative ↔ machine` carries two terms
//       (where the rules live AND where the state lives), and the verdict prints `machine·imperative ↔ machine·array`
//       beside it, which carries one. Its block is `THE MACHINE'S CHEAP SPELLING AT WIDTH`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE GATE ────────────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Every participant's MARKUP and its TEXT are compared against `floor`'s, BYTE FOR BYTE, at SEVEN
// stages, before one region is timed: after the mount, after a `name` round, after a `name`+`open`
// round, after a `width` round, after a `note` round, after a real bubbling click on every button,
// and after a second click that restores. TEXT is checked separately from markup because
// `innerHTML` equality does not imply `textContent` equality for a tree whose text is written by a
// property store — `keystroke-floor` learned that the other way round.
//
// THE REFERENCE IS CHECKED TO HAVE MOVED. If `floor`'s own click listener were missing, every
// participant would agree that nothing happened and the gate would pass a run in which no event port
// was live at all — so the reference's markup before and after the click is required to DIFFER, by
// name, and the run refuses if it does not. `hydrate-floor` is where that lesson was learned.
//
// The gate throws. A divergent participant never reaches the timer.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HAZARDS, EVERY ONE OF WHICH HAS BITTEN THIS SUITE BEFORE ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE CLOCK. `performance.now()` is clamped. The quantum is OBSERVED at run time, printed, and every
// timed region must clear MIN_TICKS × it or the run refuses THAT REGION BY NAME and prints the batch
// that would clear it. `toggle` printed the timer thirteen times before this discipline existed.
//
// EVERY ROW OF A TABLE IS SAMPLED AT THE SAME UNIT COUNT, on all four tables, so each table has ONE
// sample condition and its nulls answer for all of it. That is CHECKED and not asserted:
// `requireOneSampleCondition` refuses any table whose rows disagree, and its message names the
// per-group routing apparatus (`plugin-price`'s) that would have to be built instead. TABLE 4's rows
// are two orders of magnitude cheaper than TABLE 2's, so that table carries its own much larger
// round count — and every row of it carries the same one.
//
// SCHEMAS ARE COMPILED IN THE WARM-UP. A backend is the schema-cache key and is compared by
// POINTER, so the one backend here is composed ONCE at module load and never inside a render.
//
// THE PER-INSTANCE STATE IS ALLOCATED INSIDE THE MOUNT FOR EVERY PARTICIPANT, and that symmetry took
// a decision. A wire allocates its own state object, so the machines' per-instance allocations are
// inside the timed mount; the FLOOR therefore
// allocates its per-tag record inside its mount too, rather than being handed one. What every
// participant IS handed, untimed, is an array of TAGS handle objects carrying the seed values — one
// property store per tag inside the mount writes the instance's state back onto its handle so the
// driver can reach it, and that store is charged to all five rows identically.
//
// STRINGS ARE INTERNED. `NAMES` and `WIDTHS` are module-level tables, so no participant is charged
// for building a value another one is handed.
//
// EVERY ROUND CHANGES SOMETHING, so no round measures a write of the value already shown. Consecutive rounds always take
// different names (whose first three characters also differ, so the COLLAPSED label changes too),
// different widths, a flipped `open` and a fresh `note`.
//
// CONSTANT FOLDING. `sink` counts characters the gate observed out of the live DOM and is printed.
//
// ONE AXIS PER PROCESS:
//     node scripts/run-one-axis.js machine-vs-cells 100 1

import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    createExoSchema,
    type TExoSchemaCursor,
    type TExoAttrPort,
    type TExoChildrenPort,
    type TExoEventPort,
    type TExoMachine,
    type TExoTextPort,
} from '@exodra/core';
import {
    compileExoMachine,
    exoComputed,
    exoMachineField,
    exoTransition,
    fillExoMachineDerivations,
    type TExoMachineDerivation,
    type TExoMachineField,
    type TExoMachineProgram,
} from '@exodra/computed';
import {
    ExoDomBackend,
    exoNodeDom,
    type TExoDomNode,
    type TExoDomMachine,
    type TExoDomSetter,
    withExoCompiler,
} from '@exodra/dom';
// FORM B'S OWN MACHINERY, WHICH THE LIBRARY DOES NOT SHIP. Its constructor is imported under
// `exoFormBMachine` because `@exodra/core` exports a DIFFERENT `createExoMachine` — the shipped authoring
// layer `machine·imperative` is built on, whose name core's index calls DECIDED. Two things, two names, and
// the one that gets renamed here is the local proposal rather than the published API.
import {
    exoCommit,
    exoFieldMask,
    createExoMachine as exoFormBMachine,
    type TExoDerivation,
    type TExoBenchMachine,
} from '../../shared/exo-machine';
import {
    exoDetachedWrite,
    exoStateTableField,
    exoStateTableFields,
    exoStateTablePack,
    type TExoDetachedNode,
    type TExoStateTablePack,
    type TExoStateTableState,
} from '../../shared/machine-state-shapes';
import { gateMarkup, markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import { emitRecordedRows, type Scenario } from '../../../harness';
import { wireExoNode } from '@exodra/core';
import type { TExoDomPortChildList } from '@exodra/dom';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);

function refuse(message: string): never {
    // eslint-disable-next-line no-console
    console.log(`❌ ${message}`);
    throw new Error(message);
}

/** WHAT THE GATE OBSERVED OUT OF THE LIVE DOM, so nothing it computed can be folded away. */
let sink = 0;

// `wiredRowOf` STOOD HERE and refused a row that was a machine rather than a wire. The two kinds it
// told apart are now ONE: a component is a schema and a machine, and a wire is that machine with one
// prepared transition, so there is nothing left to observe and the check cannot be restated.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SHAPE OF THE JOB
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Tags in one shell, on every table. */
const TAGS = 200;

/** Mounts per timed region on TABLE 1 — 4 × 200 = 800 tags, 2400 elements, built per region. */
const MOUNT_REPS = 4;

/** Shells standing at once on TABLES 2, 3 and 4. Held small: this suite crashes on memory pressure. */
const SHELLS = 4;

/**
 * Rounds per scenario on TABLES 2 and 3 — 8 × 4 shells = 32 rounds, 6400 tag updates, per region.
 *
 * A round is TAGS tag-updates, each of which ends in a DOM write, so a region at this factor is
 * milliseconds and clears the clock by two orders of magnitude.
 */
const FIELD_ROUNDS = 8;

/**
 * Rounds per scenario on TABLE 4, and it is 32× larger for a reason that is the table's own finding.
 *
 * Writing a field nothing derives from ends in NO DOM WRITE FOR ANY PARTICIPANT — the cheapest row
 * is one property store — so at `FIELD_ROUNDS` the region would land under the clock and the run
 * would refuse the one table that exists to show how small the job became. These rounds allocate
 * nothing, mount nothing and leave no extra elements standing, which is the only reason a factor
 * this size is allowed. THE FACTOR IS PRINTED IN THE TABLE.
 */
const NOTE_ROUNDS = FIELD_ROUNDS * 32;

/**
 * THE NAME POOL, INTERNED ONCE FOR THE PROCESS.
 *
 * EIGHT, AND A POWER OF TWO, so the driver indexes with `& NAME_MASK` rather than `%` — one AND
 * instead of one division on a path every participant takes identically.
 *
 * EVERY NAME IS LONGER THAN THREE CHARACTERS AND NO TWO SHARE THEIR FIRST THREE. That is what makes
 * the COLLAPSED label change between rounds as well as the expanded one: a pool whose members
 * collapsed to the same three characters would make half the rounds a write of the label already
 * shown.
 */
const NAMES: readonly string[] = [
    'Alderaan',
    'Bespin',
    'Coruscant',
    'Dagobah',
    'Endor',
    'Felucia',
    'Geonosis',
    'Hoth',
];

/**
 * THE WIDTHS, INTERNED ONCE — the numbers a real program would have read out of the document after
 * layout. Eight of them, cycled, so consecutive rounds always differ. See the header for why no
 * `getBoundingClientRect` appears anywhere in this file.
 */
const WIDTHS: readonly number[] = [48, 53, 61, 67, 72, 79, 84, 91];

/** `x & (n-1)` is only `x % n` for a power of two, and a silent wrap here would break the gate. */
const maskOf = (length: number, what: string): number => {
    if (length < 2 || (length & (length - 1)) !== 0) {
        throw new Error(
            `machine-vs-cells: ${what} has ${length} members and the drivers index it with ` +
                '`& (length - 1)`, which is `% length` only for a power of two.'
        );
    }
    return length - 1;
};

const NAME_MASK = maskOf(NAMES.length, 'the name pool');
const WIDTH_MASK = maskOf(WIDTHS.length, 'the width table');

/** The four state fields, in the order the derivations' masks are written against. */
const F_NAME = exoFieldMask(0);
const F_OPEN = exoFieldMask(1);
const F_WIDTH = exoFieldMask(2);
/** THE FIELD NO DERIVATION READS. Added for TABLE 4 and used by nothing else. */
const F_NOTE = exoFieldMask(3);

/**
 * THE SAME FOUR FIELDS AS VALUES — what form C declares now that a derivation takes its
 * dependencies as ARGUMENTS and the mask is worked out from them.
 *
 * They are typed against a bare field interface rather than against any one participant's state, so
 * ONE set serves `TExoCompiledState` and `TExoDirectState` alike: a reader of the
 * narrow type accepts either, which is what a contravariant parameter means. (`TExoBoundState` was
 * the third and is struck with `machine·bound`.)
 *
 * WHAT IT CHANGES ABOUT THIS AXIS, said here because it is a measurement and not a refactor: form C
 * used to declare `(s) => labelOf(s.name, s.open)` — one wrapper closure and two property loads —
 * and now declares `labelOf` itself, reached through one wrapper and two READER CALLS. The
 * arithmetic is unchanged and `wideText`/`labelOf` still run exactly once per derivation, so the
 * markup gate is unaffected; what moved is two property loads becoming two calls, and that is form
 * C's alone.
 */
interface TExoTagFields {
    name: string;
    open: boolean;
    width: number;
    note: number;
}
const D_NAME = exoMachineField<TExoTagFields, string>(0, (s) => s.name);
const D_OPEN = exoMachineField<TExoTagFields, boolean>(1, (s) => s.open);
const D_WIDTH = exoMachineField<TExoTagFields, number>(2, (s) => s.width);

/** THE TWO DERIVATIONS, as plain functions, so every participant computes byte-identical results. */
const labelOf = (name: string, open: boolean): string => (open ? name : name.slice(0, 3));
const sizeOf = (width: number): string => `${width}px`;

/** One tag's starting values — built once at module load, shared by every participant. */
interface TExoTagSeed {
    readonly name: string;
    readonly open: boolean;
    readonly width: number;
}

const SEEDS: readonly TExoTagSeed[] = Array.from({ length: TAGS }, (_, i) => ({
    name: NAMES[i & NAME_MASK],
    open: (i & 1) === 0,
    width: WIDTHS[i & WIDTH_MASK],
}));

/** The markup of one tag, written out for the census so the census reads nothing off the clock. */
const TAG_MARKUP = '<div class="tag"><button type="button">…</button><small>…</small></div>';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE HANDLE EVERY PARTICIPANT IS GIVEN, AND THE DRIVER EVERY PARTICIPANT ANSWERS
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A wire is handed its props and nothing else, so the only way a driver can reach an instance's
// state is for the instance to WRITE ITSELF BACK onto something the driver already holds. That is
// what a handle is. It is allocated untimed, one per tag per scenario, and every participant —
// including the floor — pays exactly one property store into it inside its mount.

/** One transition per scene, so the GATE drives every participant down the SAME call the TIMER does. */
interface TExoTagDriver {
    /** TABLE 2 — `name` on every tag. */
    readonly names: (k: number) => void;
    /** TABLE 3 — `name` AND `open` on every tag, as ONE change. */
    readonly nameAndOpen: (k: number) => void;
    /** The width signal — GATED, never timed. See the header. */
    readonly widths: (k: number) => void;
    /** TABLE 4 — the field no derivation reads. */
    readonly notes: (k: number) => void;
}

/** What a mount hands back: the driver (assembled UNTIMED, afterwards) and the teardown. */
interface TExoMounted {
    readonly driver: () => TExoTagDriver;
    readonly off: () => void;
}

/** A participant, in the two halves the tables need apart: allocate untimed, then build timed. */
interface TExoProgram {
    readonly name: string;
    readonly what: string;
    /**
     * WHAT THIS PARTICIPANT ALLOCATES PER INSTANCE, counted off its own wire and printed beside the
     * mount number so the reader can check the claim against the figure rather than trust it.
     *
     * IT EXCLUDES WHAT EVERY PARTICIPANT PAYS: the element subtree itself, and — for the five
     * exodra rows but not the floor — the instance's node table, which `wireExoInstance` allocates
     * for every instance of every schema whether anything drives a port or not. What is counted is
     * what the PARTICIPANT'S OWN WIRE makes.
     */
    readonly allocs: string;
    /** Allocate this program's handles. UNTIMED — runs in `prep`. */
    readonly prepare: () => (parent: HTMLElement) => TExoMounted;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE DECLARATIONS — one tag cursor and one shell cursor, shared by every exodra participant
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE BUILD FUNCTIONS ARE SHARED AND THE COMPONENTS ARE NOT. Every `createExoMachine` call below
// produces its own declaration, its own port numbering and its own compiled schema; what they
// share is a function that runs ONCE, at module load, and contributes nothing to any per-instance
// measurement. `plugin-price`'s `listBound` factory takes the same position for the same reason.

interface TExoTagPorts {
    readonly label: TExoTextPort;
    readonly size: TExoTextPort;
    readonly click: TExoEventPort;
}

const buildTag = (b: TExoSchemaCursor): TExoTagPorts => {
    let label!: TExoTextPort;
    let size!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('div', { class: 'tag' }, (tag) => {
        tag.el('button', { type: 'button' }, (btn) => {
            click = btn.eventPort('click');
            label = btn.textPort();
        });
        tag.el('small', null, (small) => {
            size = small.textPort();
        });
    });
    return { label, size, click };
};

const buildShell = (b: TExoSchemaCursor): { readonly tags: TExoChildrenPort } => {
    let tags!: TExoChildrenPort;
    b.el('div', { class: 'tags' }, (host) => {
        tags = host.childrenPort();
    });
    return { tags };
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// FORM B — THE STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════════════════

interface TExoTagState {
    name: string;
    open: boolean;
    width: number;
    /** THE FIELD NO DERIVATION READS. Its bit appears in no derivation's mask. */
    note: number;
}

interface TExoMachineHandle {
    readonly seed: TExoTagSeed;
    machine: TExoBenchMachine<TExoTagState> | null;
}

let MACHINE_DATA: readonly TExoMachineHandle[] = [];

/**
 * THE NAMED TRANSITIONS — plain functions, no allocation, no dispatch, no commit.
 *
 * The commit is separate ON PURPOSE: several transitions before one `exoCommit` IS the transaction,
 * which is how TABLE 3 runs `label` once for two written fields. `exo-machine.ts` (e) states the
 * cost of that separation — a transition that forgets its commit moves nothing and says nothing.
 */
const setName = (m: TExoBenchMachine<TExoTagState>, name: string): void => {
    m.state.name = name;
    m.touched |= F_NAME;
};
const setOpen = (m: TExoBenchMachine<TExoTagState>, open: boolean): void => {
    m.state.open = open;
    m.touched |= F_OPEN;
};
const setWidth = (m: TExoBenchMachine<TExoTagState>, width: number): void => {
    m.state.width = width;
    m.touched |= F_WIDTH;
};
/**
 * THE TRANSITION FOR THE FIELD NOTHING DERIVES FROM, and it MARKS ITS BIT.
 *
 * That is the MECHANICAL spelling: a transition marks what it wrote, and the author does not have
 * to know which derivations read it. A hand-tuned author who DOES know may drop the `|=` and make
 * this exactly a property store — which is what `floor` does on TABLE 4 — and this axis
 * measures the SAFE spelling rather than the tuned one, because the tuned one silently breaks the
 * day a derivation starts reading the field.
 */
const setNote = (m: TExoBenchMachine<TExoTagState>, note: number): void => {
    m.state.note = note;
    m.touched |= F_NOTE;
};

/**
 * EVERY DERIVATION ARRAY FORM B DECLARED, so the census READS the component's shape out of the
 * structure instead of a comment asserting it. Filled at module load, once per `makeMachineTag`
 * call, and never touched again.
 */
const B_DERIVATIONS: (readonly TExoDerivation<TExoTagState>[])[] = [];

const makeMachineTag = (): TExoDomMachine => {
    const MACHINE_SCHEMA5 = createExoSchema(buildTag);
    const mMachine5 = createExoMachine<TExoDomNode, TExoMachineHandle>(MACHINE_SCHEMA5, {
        createInitialState: (c, handle) => {
            const seed = handle.seed;
            const state: TExoTagState = {
                name: seed.name,
                open: seed.open,
                width: seed.width,
                note: 0,
            };
            // `exoFormBMachine` runs every derivation once, which IS the initial fill — the same
            // `compute` and the same `ports.set` a commit makes.
            const machine = exoFormBMachine(state, c.fillDoors(), derivations);
            handle.machine = machine;
            c.on(MACHINE_SCHEMA5.ports.click, () => {
                setOpen(machine, machine.state.open === true ? false : true);
                exoCommit(machine);
            });
        },
    });
    // DECLARED ONCE, HERE — a wire FACTORY runs at module load and never again, so this
    // array and its two objects are the whole per-COMPONENT cost of form B. Every instance
    // of this component shares them.
    const derivations: readonly TExoDerivation<TExoTagState>[] = [
        {
            name: 'label',
            mask: F_NAME | F_OPEN,
            port: MACHINE_SCHEMA5.ports.label,
            compute: (s) => labelOf(s.name, s.open),
        },
        {
            name: 'size',
            mask: F_WIDTH,
            port: MACHINE_SCHEMA5.ports.size,
            compute: (s) => sizeOf(s.width),
        },
    ];
    B_DERIVATIONS.push(derivations);
    return mMachine5;
};

const makeMachineShell = (tag: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA6 = createExoSchema(buildShell);
    const mMachine6 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA6, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA6.ports.tags, tag, MACHINE_DATA);
        },
    });
    return mMachine6;
};

const TAG_B = makeMachineTag();
const SHELL_B = makeMachineShell(TAG_B);
/** THE SECOND NULL — its own component, its own schema, its own DERIVATION ARRAY. True Δ: ZERO. */
const TAG_B_TWIN = makeMachineTag();
const SHELL_B_TWIN = makeMachineShell(TAG_B_TWIN);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// FORM C — THE SAME SHAPE, COMPILED: A FIELD→DERIVATIONS TABLE AND ONE OBJECT PER INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT IT CHANGES AGAINST `machine·scan`, AND IT IS TWO THINGS:
//
//  1. THE COMMIT IS O(AFFECTED), NOT O(DECLARED). Form B scans every declared derivation and tests
//     its mask. Form C inverts the masks ONCE, at module load, into a per-FIELD set of the
//     derivations that read it; a transition ORs that set into the instance, and the commit walks
//     its SET BITS. On this component, with two derivations, the saving is at most one mask test
//     per commit — except on TABLE 4, where `note`'s set is `0`, the pending integer never leaves
//     zero and the commit returns on its first comparison having tested nothing at all. That table
//     is the one where the two forms are expected to differ by a mechanism rather than by noise.
//  2. THE INSTANCE IS ONE OBJECT. Form B allocates a machine object BESIDE the state (`{state,
//     ports, derivations, touched}`), so a transition hops through `m.state`. Form C carries the
//     pending set and the ports handle ON the state, and the derivations live in the shared
//     program, so a transition writes a field of the object it was handed.
//
// AND ONE THING IT CHANGES THAT IS NOT ABOUT SPEED: THE COMMIT IS NOT THE CALLER'S TO REMEMBER. A
// transition is declared with `exoTransition` and commits when it returns; there is no
// bare commit in the package's surface to forget. Form B's own notes list the forgotten commit as
// the hazard it cannot catch, and caveat (6) below says no gate in this file could catch it either.
// No table prices that difference and none can.

/** Where the pending word sits in a state that declares no other slot. */
const PENDING_ROW = 0;

/**
 * A HAND-ASSEMBLED ENODE WHOSE FIELDS ARE NAMED PROPERTIES — state shape 1. The enode contract asks
 * for a numbered slot table, and this shape has exactly one row to put in it: the pending word. Its
 * fields are the properties the interfaces below add.
 */
interface TExoNamedFieldNode extends TExoDetachedNode {
    readonly managedState: number[];
}

interface TExoCompiledState extends TExoNamedFieldNode {
    name: string;
    open: boolean;
    width: number;
    /** THE FIELD NO DERIVATION READS. Its entry in the field→derivations table is `0`. */
    note: number;
}

interface TExoCompiledHandle {
    readonly seed: TExoTagSeed;
    state: TExoCompiledState | null;
}

/**
 * ONE DECLARED COMPONENT'S TRANSITIONS — its own program's and no other's.
 *
 * `machine` and `machine·twin` are separately declared components with separately compiled programs, and a
 * driver handed the wrong pack would be writing through another component's port objects. So the
 * pack travels with the component rather than living at module scope.
 */
interface TExoCompiledOps {
    readonly program: TExoMachineProgram<TExoCompiledState>;
    readonly setName: (state: TExoCompiledState, name: string) => void;
    readonly setNameAndOpen: (state: TExoCompiledState, name: string, open: boolean) => void;
    readonly setWidth: (state: TExoCompiledState, width: number) => void;
    readonly setNote: (state: TExoCompiledState, note: number) => void;
}

interface TExoCompiledPack {
    readonly component: TExoDomMachine;
    readonly ops: TExoCompiledOps;
}

let COMPILED_DATA: readonly TExoCompiledHandle[] = [];

const makeCompiledPack = (): TExoCompiledPack => {
    // Assigned further down this function, once, after `createExoMachine` has returned and `buildTag`'s
    // ports are final.
    let ops!: TExoCompiledOps;
    const component_SCHEMA = createExoSchema(buildTag);
    const mComponent = createExoMachine<TExoDomNode, TExoCompiledHandle>(component_SCHEMA, {
        createInitialState: (c, handle) => {
            const seed = handle.seed;
            // ONE OBJECT AND ONE ONE-SLOT TABLE PER INSTANCE, both built whole — the author's four
            // fields, and THREE REFERENCES: this instance's port table, the schema's write and the
            // shared `set`. None of the three is an allocation; the table is, and it is what the
            // enode contract costs a state that has no other slot. Form B allocates its state, a
            // machine object AND the `c.fillDoors()` wrapper.
            const state: TExoCompiledState = {
                name: seed.name,
                open: seed.open,
                width: seed.width,
                note: 0,
                // THE PENDING WORD, IN THE ONE-SLOT TABLE THE ENODE CONTRACT NAMES, and the write
                // door beside it. `set` is one shared function assigned by reference, so the table
                // is the only allocation the contract costs this instance. NO EFFECT SLOT: a
                // machine that owns no disposer allocates none, and this component declares none.
                managedState: [0],
                portTable: c.portTable(),
                portWrite: c.portNodeWriter(),
                attr: exoDetachedWrite,
                text: exoDetachedWrite,
                unsafeHtml: exoDetachedWrite,
            };
            handle.state = state;
            // THROUGH THE DOOR. Every commit after this writes through `state.portWrite`, which
            // tests nothing.
            fillExoMachineDerivations(program, state);
            c.on(component_SCHEMA.ports.click, () => toggleOpen(state));
        },
    });
    // EVERYTHING IN THIS BLOCK RUNS AT MODULE LOAD, ONCE, AND IS SHARED BY EVERY INSTANCE: the
    // program (two derivations, the inverted field table, the resolved port indexes), the four
    // marks, and the five transition closures. It is the whole per-COMPONENT cost of form C.
    const program = compileExoMachine<TExoCompiledState>({
        fields: 4,
        pendingRow: PENDING_ROW,
        derivations: [
            exoComputed({
                label: 'label',
                reads: [D_NAME, D_OPEN],
                into: component_SCHEMA.ports.label,
                compute: labelOf,
            }),
            exoComputed({
                label: 'size',
                reads: [D_WIDTH],
                into: component_SCHEMA.ports.size,
                compute: sizeOf,
            }),
        ],
    });
    const M_NAME = program.fieldMarks[0];
    const M_OPEN = program.fieldMarks[1];
    const M_WIDTH = program.fieldMarks[2];
    // ZERO, and checked to be zero by the census below rather than asserted here.
    const M_NOTE = program.fieldMarks[3];

    const setName = exoTransition<TExoCompiledState, string>(program, (s, name) => {
        s.name = name;
        s.managedState[PENDING_ROW] |= M_NAME;
    });
    // ONE TRANSITION FOR TWO FIELDS — the transaction. Both marks are `label`'s bit, so the
    // pending set holds ONE bit and `label` runs once. This is form B's `setName` + `setOpen` +
    // `exoCommit` written as the one call it is, and it allocates nothing per call: the two
    // values arrive as two arguments rather than in an object.
    const setNameAndOpen = exoTransition<TExoCompiledState, string, boolean>(
        program,
        (s, name, open) => {
            s.name = name;
            s.managedState[PENDING_ROW] |= M_NAME;
            s.open = open;
            s.managedState[PENDING_ROW] |= M_OPEN;
        }
    );
    const setWidth = exoTransition<TExoCompiledState, number>(program, (s, width) => {
        s.width = width;
        s.managedState[PENDING_ROW] |= M_WIDTH;
    });
    // THE SAFE SPELLING, exactly as form B's `setNote` is: it marks what it wrote and does not
    // require the author to know that nothing reads it. The mark is `0`.
    const setNote = exoTransition<TExoCompiledState, number>(program, (s, note) => {
        s.note = note;
        s.managedState[PENDING_ROW] |= M_NOTE;
    });
    const toggleOpen = exoTransition<TExoCompiledState>(program, (s) => {
        s.open = s.open === true ? false : true;
        s.managedState[PENDING_ROW] |= M_OPEN;
    });

    ops = { program, setName, setNameAndOpen, setWidth, setNote };
    const component = mComponent;
    return { component, ops };
};

const makeCompiledShell = (tag: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA7 = createExoSchema(buildShell);
    const mMachine7 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA7, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA7.ports.tags, tag, COMPILED_DATA);
        },
    });
    return mMachine7;
};

const PACK_C = makeCompiledPack();
const SHELL_C = makeCompiledShell(PACK_C.component);
/** THE THIRD NULL — its own component, its own schema, its own compiled program. True Δ: ZERO. */
const PACK_C_TWIN = makeCompiledPack();
const SHELL_C_TWIN = makeCompiledShell(PACK_C_TWIN.component);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SECOND QUESTION — HOW A TRANSITION THAT WRITES SEVERAL FIELDS IS SPELLED
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// SAME STATE SHAPE, SAME PROGRAM, SAME COMMIT, SAME PORT WRITE. What differs is the four lines the
// author writes, and one of the three spellings ALLOCATES.
//
//   `machine`        THE SHIPPED SPELLING — the body writes the properties and ORs the marks itself:
//              `(s, name, open) => { s.name = name; s.…|= M_NAME; s.open = open; s.…|= M_OPEN; }`.
//              Two stores, two ORs, no call, no allocation. It is also the spelling in which the
//              author can OR the wrong mark, which no type and no gate here can see.
//
//   `machine·handle`   HANDLES. One closure per field, built once at module load, each doing that field's
//              store AND its mark: `H_NAME(s, name); H_OPEN(s, open);`. The mark can no longer
//              disagree with the store, because they are the same statement. THE PRICE IS ONE CALL
//              PER FIELD WRITTEN, and nothing else — no allocation, ever, at any arity. (The
//              brief's `name.set(s, next)` spelling adds a property load in front of each call;
//              this is the cheaper of the two spellings of a handle and is the one measured.)
//
//   `machine·tuple`  THE DECLARED TUPLE. The transition names the fields it writes and hands back their
//              values: `{ writes: [NAME, OPEN], by: (name, open) => [name, open] }`. The machine
//              scatters the tuple through the declared writers and ORs a mark MERGED AT
//              DECLARATION — so it is the only spelling here that pays ONE OR for two fields
//              instead of two. What it pays for that: one call into `by`, one array per call at
//              arity two and above, and one indirect writer call per field.
//
// AND THE SINGLE-FIELD CASE IS THE POINT OF INCLUDING TABLE 2 IN THIS COMPARISON. At arity one a
// tuple is not a tuple: `by` returns a BARE VALUE and nothing is allocated. So TABLE 2 prices the
// tuple's CALLS with its allocation removed, and TABLE 3 adds the allocation to the same rows. The
// difference between the two tables is where the tuple starts costing.
//
// `by` IS AN IDENTITY HERE AND THAT IS FAIR. In a real transition `by` is where the author's
// arithmetic lives — and that same arithmetic would sit inside `machine`'s body — so it cancels between
// the forms and what is left is the difference this comparison is about. What does NOT cancel is
// that the tuple form makes the call at all.

/** Which of the three spellings a pack's transitions are written in. */
type TExoSpelling = 'handles' | 'tuple';

/**
 * `makeCompiledPack` WITH ONLY THE TRANSITION BODIES CHANGED.
 *
 * It is a copy and not a parameter of the original, deliberately: `machine` is the shipped row that every
 * other verdict on this axis is read against, and adding a branch to the function that builds it
 * would put this comparison's code inside that row's. Everything outside the `ops` block below —
 * the schema, the program, the state literal, the fill, the click — is line-for-line the original's,
 * and the markup gate is what holds the two to it.
 */
const makeSpelledPack = (spelling: TExoSpelling): TExoCompiledPack => {
    let ops!: TExoCompiledOps;
    const component_SCHEMA2 = createExoSchema(buildTag);
    const mComponent2 = createExoMachine<TExoDomNode, TExoCompiledHandle>(component_SCHEMA2, {
        createInitialState: (c, handle) => {
            const seed = handle.seed;
            const state: TExoCompiledState = {
                name: seed.name,
                open: seed.open,
                width: seed.width,
                note: 0,
                managedState: [0],
                portTable: c.portTable(),
                portWrite: c.portNodeWriter(),
                attr: exoDetachedWrite,
                text: exoDetachedWrite,
                unsafeHtml: exoDetachedWrite,
            };
            handle.state = state;
            fillExoMachineDerivations(program, state);
            c.on(component_SCHEMA2.ports.click, () => toggleOpen(state));
        },
    });
    const program = compileExoMachine<TExoCompiledState>({
        fields: 4,
        pendingRow: PENDING_ROW,
        derivations: [
            exoComputed({
                label: 'label',
                reads: [D_NAME, D_OPEN],
                into: component_SCHEMA2.ports.label,
                compute: labelOf,
            }),
            exoComputed({
                label: 'size',
                reads: [D_WIDTH],
                into: component_SCHEMA2.ports.size,
                compute: sizeOf,
            }),
        ],
    });
    const M_NAME = program.fieldMarks[0];
    const M_OPEN = program.fieldMarks[1];
    const M_WIDTH = program.fieldMarks[2];
    const M_NOTE = program.fieldMarks[3];

    // ── THE HANDLES — one closure per field, store and mark together, no allocation ──────
    const H_NAME = (s: TExoCompiledState, v: string): void => {
        s.name = v;
        s.managedState[PENDING_ROW] |= M_NAME;
    };
    const H_OPEN = (s: TExoCompiledState, v: boolean): void => {
        s.open = v;
        s.managedState[PENDING_ROW] |= M_OPEN;
    };
    const H_WIDTH = (s: TExoCompiledState, v: number): void => {
        s.width = v;
        s.managedState[PENDING_ROW] |= M_WIDTH;
    };
    const H_NOTE = (s: TExoCompiledState, v: number): void => {
        s.note = v;
        s.managedState[PENDING_ROW] |= M_NOTE;
    };

    // ── THE DECLARED WRITES — erased writers plus a mark merged ONCE, at declaration ─────
    const W_NAME = (s: TExoCompiledState, v: unknown): void => {
        s.name = v as string;
    };
    const W_OPEN = (s: TExoCompiledState, v: unknown): void => {
        s.open = v as boolean;
    };
    const W_WIDTH = (s: TExoCompiledState, v: unknown): void => {
        s.width = v as number;
    };
    const W_NOTE = (s: TExoCompiledState, v: unknown): void => {
        s.note = v as number;
    };
    /** `writes: [NAME, OPEN]` — the pair the two-field transition scatters into. */
    const W_NAME_OPEN: readonly ((s: TExoCompiledState, v: unknown) => void)[] = [W_NAME, W_OPEN];
    const M_NAME_OPEN = M_NAME | M_OPEN;
    /** `by` AT ARITY ONE — a bare value, and nothing is allocated. */
    const byOne = <TValue>(value: TValue): TValue => value;
    /** `by` AT ARITY TWO — ONE ARRAY PER CALL, which is the whole of what this row prices. */
    const byNameAndOpen = (name: string, open: boolean): readonly unknown[] => [name, open];

    ops =
        spelling === 'handles'
            ? {
                  program,
                  setName: exoTransition<TExoCompiledState, string>(program, (s, name) => {
                      H_NAME(s, name);
                  }),
                  setNameAndOpen: exoTransition<TExoCompiledState, string, boolean>(
                      program,
                      (s, name, open) => {
                          H_NAME(s, name);
                          H_OPEN(s, open);
                      }
                  ),
                  setWidth: exoTransition<TExoCompiledState, number>(program, (s, width) => {
                      H_WIDTH(s, width);
                  }),
                  setNote: exoTransition<TExoCompiledState, number>(program, (s, note) => {
                      H_NOTE(s, note);
                  }),
              }
            : {
                  program,
                  setName: exoTransition<TExoCompiledState, string>(program, (s, name) => {
                      W_NAME(s, byOne(name));
                      s.managedState[PENDING_ROW] |= M_NAME;
                  }),
                  setNameAndOpen: exoTransition<TExoCompiledState, string, boolean>(
                      program,
                      (s, name, open) => {
                          const values = byNameAndOpen(name, open);
                          for (let i = 0; i < W_NAME_OPEN.length; i++) {
                              W_NAME_OPEN[i](s, values[i]);
                          }
                          // ONE OR FOR TWO FIELDS — merged at declaration, which is the one
                          // thing this spelling is cheaper at.
                          s.managedState[PENDING_ROW] |= M_NAME_OPEN;
                      }
                  ),
                  setWidth: exoTransition<TExoCompiledState, number>(program, (s, width) => {
                      W_WIDTH(s, byOne(width));
                      s.managedState[PENDING_ROW] |= M_WIDTH;
                  }),
                  setNote: exoTransition<TExoCompiledState, number>(program, (s, note) => {
                      W_NOTE(s, byOne(note));
                      s.managedState[PENDING_ROW] |= M_NOTE;
                  }),
              };

    // THE CLICK IS THE SHIPPED SPELLING IN BOTH ROWS. It is not part of either question — no
    // update table times it — and giving it a third spelling would be a difference nothing
    // reads.
    const toggleOpen = exoTransition<TExoCompiledState>(program, (s) => {
        s.open = s.open === true ? false : true;
        s.managedState[PENDING_ROW] |= M_OPEN;
    });
    const component = mComponent2;
    return { component, ops };
};

const PACK_C_HAND = makeSpelledPack('handles');
const SHELL_C_HAND = makeCompiledShell(PACK_C_HAND.component);
const PACK_C_TUPLE = makeSpelledPack('tuple');
const SHELL_C_TUPLE = makeCompiledShell(PACK_C_TUPLE.component);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE FIRST QUESTION — WHERE THE STATE LIVES, ON THE NARROW TAG
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// `machine-state-shapes.ts` beside this file is the proposal and carries the argument; what is here
// is this component's four fields declared against it. THE MACHINE IS THE SHIPPED ONE IN ALL THREE
// ROWS — same compiler, same inverted table, same bit walk, same port write — so `machine`, `machine·array` and
// `machine·nodes` differ in the reader and the writer of a field and in nothing else.
//
// FIELD NUMBERING IS UNCHANGED: name 0, open 1, width 2, note 3, and `note`'s entry in the inverted
// table is 0 in all three. What changes is WHERE field `f` is stored — `s.name`, `s.managedState[f]`, or
// `s.managedState[BASE + f]` with `BASE` the tag's node-slot count.

interface TExoTableHandle {
    readonly seed: TExoTagSeed;
    state: TExoStateTableState | null;
}

/** The narrow transitions, over a table-backed state. The same four the driver calls on `machine`. */
interface TExoTableOps {
    readonly setName: (state: TExoStateTableState, name: string) => void;
    readonly setNameAndOpen: (state: TExoStateTableState, name: string, open: boolean) => void;
    readonly setWidth: (state: TExoStateTableState, width: number) => void;
    readonly setNote: (state: TExoStateTableState, note: number) => void;
}

/** VARIANT 2's handles. Re-installed untimed immediately before every render. */
let TABLE_OWN_DATA: readonly TExoTableHandle[] = [];
/** VARIANT 3's. Two variables and not one so a mis-wired render cannot silently borrow the other. */
let TABLE_SHARED_DATA: readonly TExoTableHandle[] = [];

/**
 * THE TWO DERIVATIONS, DECLARED AGAINST A TABLE — `machine`'s two, with `D_NAME`/`D_OPEN`/`D_WIDTH`
 * replaced by fields that read a slot.
 *
 * `labelOf` and `sizeOf` are passed STRAIGHT THROUGH, exactly as `machine` passes them, so no row here
 * pays a wrapper closure the others do not. That is what the typed `exoStateTableField<string>`
 * buys: the cast is in the reader, where it costs nothing, instead of in a wrapper.
 */
const declareTagTableDerivations = (
    P: TExoTagPorts,
    base: number
): readonly TExoMachineDerivation<TExoStateTableState>[] => {
    const NAME = exoStateTableField<string>(0, base);
    const OPEN = exoStateTableField<boolean>(1, base);
    const WIDTH = exoStateTableField<number>(2, base);
    return [
        exoComputed({
            label: 'label',
            reads: [NAME, OPEN],
            into: P.label,
            compute: labelOf,
        }),
        exoComputed({
            label: 'size',
            reads: [WIDTH],
            into: P.size,
            compute: sizeOf,
        }),
    ];
};

/**
 * THE FOUR TRANSITIONS, over slots. Structurally IDENTICAL to `machine`'s — one store and one OR per
 * field, no merged mark, no handle, no tuple — so that this row answers the WHERE question and not
 * the HOW question. The slots are added to the base ONCE here and never on a path that runs.
 */
const makeTagTableOps = (
    base: number,
    program: TExoMachineProgram<TExoStateTableState>
): TExoTableOps & { readonly toggleOpen: (state: TExoStateTableState) => void } => {
    const marks = program.fieldMarks;
    const M_NAME = marks[0];
    const M_OPEN = marks[1];
    const M_WIDTH = marks[2];
    const M_NOTE = marks[3];
    const S_NAME = base;
    const S_OPEN = base + 1;
    const S_WIDTH = base + 2;
    const S_NOTE = base + 3;
    // THE PENDING WORD RIDES IN THE SAME ARRAY, in the slot after the fields.
    const S_PENDING = base + 4;
    return {
        setName: exoTransition<TExoStateTableState, string>(program, (s, name) => {
            const cells = s.managedState;
            cells[S_NAME] = name;
            cells[S_PENDING] = (cells[S_PENDING] as number) | M_NAME;
        }),
        setNameAndOpen: exoTransition<TExoStateTableState, string, boolean>(
            program,
            (s, name, open) => {
                const cells = s.managedState;
                cells[S_NAME] = name;
                cells[S_PENDING] = (cells[S_PENDING] as number) | M_NAME;
                cells[S_OPEN] = open;
                cells[S_PENDING] = (cells[S_PENDING] as number) | M_OPEN;
            }
        ),
        setWidth: exoTransition<TExoStateTableState, number>(program, (s, width) => {
            const cells = s.managedState;
            cells[S_WIDTH] = width;
            cells[S_PENDING] = (cells[S_PENDING] as number) | M_WIDTH;
        }),
        setNote: exoTransition<TExoStateTableState, number>(program, (s, note) => {
            const cells = s.managedState;
            cells[S_NOTE] = note;
            cells[S_PENDING] = (cells[S_PENDING] as number) | M_NOTE;
        }),
        toggleOpen: exoTransition<TExoStateTableState>(program, (s) => {
            const cells = s.managedState;
            cells[S_OPEN] = cells[S_OPEN] === true ? false : true;
            cells[S_PENDING] = (cells[S_PENDING] as number) | M_OPEN;
        }),
    };
};

type TExoTagTablePack = TExoStateTablePack<
    TExoTableHandle,
    TExoTableOps & { readonly toggleOpen: (state: TExoStateTableState) => void }
>;

const makeTagTablePack = (sharedWithNodes: boolean): TExoTagTablePack =>
    exoStateTablePack<
        TExoTagPorts,
        TExoTableHandle,
        TExoTableOps & { readonly toggleOpen: (state: TExoStateTableState) => void }
    >({
        sharedWithNodes,
        fields: 4,
        build: buildTag,
        declare: declareTagTableDerivations,
        makeOps: makeTagTableOps,
        // ONE ARRAY LITERAL, BUILT WHOLE — variant 2's second allocation, and the only place it
        // exists. Growing it field by field would size its backing store by accident.
        // FIVE ENTRIES FOR FOUR FIELDS: the last is the pending word, which rides in this array.
        seedWhole: (handle) => [handle.seed.name, handle.seed.open, handle.seed.width, 0, 0],
        // AND VARIANT 3's, one slot at a time, ascending, appended onto the node array. There is no
        // literal to build here: the array already holds this instance's nodes.
        seedField: (handle, f) =>
            f === 0
                ? handle.seed.name
                : f === 1
                ? handle.seed.open
                : f === 2
                ? handle.seed.width
                : 0,
        take: (handle, state) => {
            handle.state = state;
        },
        // ONE CLOSURE PER INSTANCE, exactly as `machine`'s click is. The ops arrive as an argument
        // because a shared-table component's transitions are not declared until its first wire.
        onWired: (c, P, state, ops) => {
            c.on(P.click, () => ops.toggleOpen(state));
        },
    });

const PACK_C_TBL = makeTagTablePack(false);
const PACK_C_TBL_TWIN = makeTagTablePack(false);
const PACK_C_SHR = makeTagTablePack(true);
const PACK_C_SHR_TWIN = makeTagTablePack(true);

const makeTableShell = (tag: TExoDomMachine, shared: boolean): TExoDomMachine => {
    const MACHINE_SCHEMA8 = createExoSchema(buildShell);
    const mMachine8 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA8, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA8.ports.tags, tag, shared ? TABLE_SHARED_DATA : TABLE_OWN_DATA);
        },
    });
    return mMachine8;
};

const SHELL_C_TBL = makeTableShell(PACK_C_TBL.component, false);
const SHELL_C_TBL_TWIN = makeTableShell(PACK_C_TBL_TWIN.component, false);
const SHELL_C_SHR = makeTableShell(PACK_C_SHR.component, true);
const SHELL_C_SHR_TWIN = makeTableShell(PACK_C_SHR_TWIN.component, true);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// FORM C, WRITTEN THE DOM'S OWN WAY — and HALF OF THIS ROW'S QUESTION HAS BEEN ANSWERED
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHAT THIS ROW USED TO ASK, AND WHAT CHANGED UNDER IT ═══
//
// It priced PORTABILITY as two things at once. The portable machine wrote through
// `TExoFillDoors.set` — a method call on a WRAPPER OBJECT `c.fillDoors()` allocated per instance, carrying
// three references of which only one was per instance, plus a `port.index` load in front of the two
// array loads a fill is. So the row measured (a) a wrapper allocation at the mount and (b) a method
// call per write.
//
// HALF OF THAT IS GONE AND THE ROW SAYS SO RATHER THAN QUIETLY KEEPING ITS OLD CAPTION. The machine
// no longer allocates anything per instance: the state carries the instance's port TABLE and the
// schema's WRITE as two references, and the initial fill is made once at the MOUNT through `c.set`
// (which every participant's initial fill goes through) and never again. So the mount half of this
// row's question — "what does the ports object cost per instance" — is ANSWERED AT ZERO, and the
// row must stop implying it is still open. `verdict` prints that sentence beside the number.
//
// ═══ AND THE OTHER HALF WAS MISDESCRIBED, WHICH IS RECORDED HERE RATHER THAN EDITED AWAY ═══
//
// THIS BLOCK USED TO SAY: "IT IS A PARTICIPANT, NOT A LIBRARY FEATURE, and it is a COPY of the
// library's commit with the write swapped — the bit walk below and `commitExoMachine`'s
// must stay the same loop or this row stops being a comparison of the write." IT ALSO SAID THIS ROW
// PRICES "the last thing portability buys and the last thing it costs", AND ITS CAPTION SAID IT
// "Prices the LAST indirection". Those sentences were read off this file as a measurement, quoted
// to the library's owner and retracted. THE FIRST HALF OF EACH IS TRUE (it is a participant; the
// write IS swapped); THE CLAIM THAT THE WRITE IS THE ONLY DIFFERENCE IS NOT.
//
// FOUR OTHER THINGS DIFFER, and they are enumerated once, in `machine·write`'s block below: the
// effect-mask split, the per-derivation `ports[i]` load and null branch, `exoTransition`'s
// two calls (no longer a batch test beside them — the shipped closure lost it), and
// `compiledDriver`'s property load per tag. `machine − machine·copy` is
// therefore "one write plus four omissions", and no number this axis prints splits it.
//
// ═══ WHAT THIS ROW WAS FOR, AND THE JOB HAS BEEN TAKEN AWAY FROM IT ═══
//
// `machine·bound` WAS A COPY OF THIS ROW'S LOOP, omitting the identical four — which made
// `machine·copy ↔ machine·bound` the ONE gap in this family that was purely a difference of write
// spelling, and that pair is what this row answered for. THAT ROW IS STRUCK, because the library
// feature under it (`c.portWriter`) was deleted on its own measurement. SO THIS ROW NOW
// ANSWERS FOR NOTHING BY ITSELF: its gap to `machine` is "one write plus four omissions" and there
// is no longer a neighbour carrying the identical four to subtract them against. It is kept because
// deleting it would delete the flattened spelling from the axis entirely, and because
// `machine·write` — which asks "shared call against pre-resolved", keeping all four — is not its
// substitute. A READER MUST NOT QUOTE THIS ROW'S GAP AS THE PRICE OF A WRITE.
//
// WHAT THE FLATTENING IS. The portable write is `write(table, port, value)` — one indirect call
// into a function shared by the whole schema, then `port.index`, then `setters[index]`,
// `writeData[index]` and `nodes[elem[index]]`. This row flattens all of that AT THE FIRST WIRE into
// one writer, one slot and one write datum PER DERIVATION and writes
// `writers[i](nodes[slots[i]], value, data[i])`: no shared call, no port object, no slot table.

interface TExoDirectState {
    name: string;
    open: boolean;
    width: number;
    note: number;
    /** The pending derivations — the same integer an enode carries in its pending slot. */
    touched: number;
    /** THIS INSTANCE'S RESOLVED NODES, BY SLOT — the connector's own per-instance array. */
    readonly nodes: readonly Node[];
}

interface TExoDirectHandle {
    readonly seed: TExoTagSeed;
    state: TExoDirectState | null;
}

let DIRECT_DATA: readonly TExoDirectHandle[] = [];

/** The program's computes, hoisted at module load — the same array the portable row runs. */
let DIRECT_COMPUTES: readonly ((state: TExoDirectState) => unknown)[] = [];
/** Per DERIVATION: the schema's writer for its port. Flattened at the first wire. See below. */
let DIRECT_WRITERS: readonly TExoDomSetter[] = [];
/** Per DERIVATION: the node slot its writer is handed — `schema.elem[port.index]`, flattened. */
let DIRECT_SLOTS = new Int32Array(0);
/** Per DERIVATION: `schema.writeData[port.index]` — the third argument every shipped writer takes. */
let DIRECT_WRITE_DATA: readonly unknown[] = [];
let DIRECT_MARK_NAME = 0;
let DIRECT_MARK_OPEN = 0;
let DIRECT_MARK_WIDTH = 0;
let DIRECT_MARK_NOTE = 0;

/**
 * `commitExoMachine`'S BIT WALK WITH THE WRITE SWAPPED — AND FOUR THINGS LEFT OUT.
 *
 * THIS COMMENT USED TO READ "the only difference between this row and `machine`", AND THAT WAS FALSE.
 * What is the same is the bit walk: lowest set bit, its index, clear it, run that derivation. What
 * this does instead of `write(table, port, value)` is the three array loads and the call that a fill
 * IS, with the writer, the slot and the write datum already resolved per derivation.
 *
 * WHAT IT LEAVES OUT OF THE SHIPPED COMMIT is the effect-mask split (a program load, two ANDs and a
 * store back onto the instance) and the `ports[i]` load with the null branch that chooses
 * between a port write and a chain store. Two more differences live outside this function — the
 * transitions below are hand-written where `machine`'s go through `exoTransition`, and `directDriver`
 * calls a module-level `const` where `compiledDriver` loads a property per tag. `machine·write` is the row
 * that keeps all four; see its block for the list and for why it exists.
 */
function commitDirect(state: TExoDirectState): void {
    let pending = state.touched;
    if (pending === 0) return;
    state.touched = 0;
    const nodes = state.nodes;
    do {
        const bit = pending & -pending;
        const i = 31 - Math.clz32(bit);
        pending ^= bit;
        DIRECT_WRITERS[i](
            nodes[DIRECT_SLOTS[i]] as Element,
            DIRECT_COMPUTES[i](state),
            DIRECT_WRITE_DATA[i]
        );
    } while (pending !== 0);
}

// THE TRANSITIONS, HAND-WRITTEN, EACH COMMITTING — what `exoTransition` produces, spelled
// out because that helper commits through the ports handle this row does not have.
const directSetName = (s: TExoDirectState, name: string): void => {
    s.name = name;
    s.touched |= DIRECT_MARK_NAME;
    commitDirect(s);
};
const directSetNameAndOpen = (s: TExoDirectState, name: string, open: boolean): void => {
    s.name = name;
    s.touched |= DIRECT_MARK_NAME;
    s.open = open;
    s.touched |= DIRECT_MARK_OPEN;
    commitDirect(s);
};
const directSetWidth = (s: TExoDirectState, width: number): void => {
    s.width = width;
    s.touched |= DIRECT_MARK_WIDTH;
    commitDirect(s);
};
const directSetNote = (s: TExoDirectState, note: number): void => {
    s.note = note;
    s.touched |= DIRECT_MARK_NOTE;
    commitDirect(s);
};

const TAG_C_DIRECT_SCHEMA = createExoSchema(buildTag);
const mTAG_C_DIRECT = createExoMachine<TExoDomNode, TExoDirectHandle>(TAG_C_DIRECT_SCHEMA, {
    createInitialState: (c, handle) => {
        // FLATTENED ONCE, AT THE FIRST WIRE, and not per instance: `setters` and `elem` belong to
        // the compiled SCHEMA — one per (declaration, backend) — and this component is rendered
        // by one backend. The schema does not exist until the first render, which is the only
        // reason this is here rather than beside the program above.
        if (!flattened) {
            const writers: TExoDomSetter[] = new Array<TExoDomSetter>(program.portIndexes.length);
            const slots = new Int32Array(program.portIndexes.length);
            const writeData: unknown[] = new Array<unknown>(program.portIndexes.length);
            const schema = c.schema;
            for (let i = 0; i < program.portIndexes.length; i++) {
                const at = program.portIndexes[i];
                writers[i] = schema.setters[at];
                slots[i] = schema.elem[at];
                writeData[i] = schema.writeData[at];
            }
            DIRECT_WRITERS = writers;
            DIRECT_SLOTS = slots;
            DIRECT_WRITE_DATA = writeData;
            flattened = true;
        }
        const seed = handle.seed;
        const state: TExoDirectState = {
            name: seed.name,
            open: seed.open,
            width: seed.width,
            note: 0,
            touched: 0,
            // THE INSTANCE'S NODE TABLE, TAKEN OFF THE INSTANCE'S OWN RECORD — a wire is handed
            // that record, so this is one property load and the same hop every shipped port write
            // makes. What is stored here is the array.
            nodes: c.nodes,
        };
        handle.state = state;
        // THE INITIAL FILL, the same one `fillExoMachineDerivations` makes: every derivation once,
        // in declaration order, through this row's own write.
        for (let i = 0; i < DIRECT_COMPUTES.length; i++) {
            DIRECT_WRITERS[i](
                state.nodes[DIRECT_SLOTS[i]] as Element,
                DIRECT_COMPUTES[i](state),
                DIRECT_WRITE_DATA[i]
            );
        }
        c.on(TAG_C_DIRECT_SCHEMA.ports.click, () => {
            state.open = state.open === true ? false : true;
            state.touched |= DIRECT_MARK_OPEN;
            commitDirect(state);
        });
    },
});
const program = compileExoMachine<TExoDirectState>({
    fields: 4,
    pendingRow: PENDING_ROW,
    derivations: [
        exoComputed({
            label: 'label',
            reads: [D_NAME, D_OPEN],
            into: TAG_C_DIRECT_SCHEMA.ports.label,
            compute: labelOf,
        }),
        exoComputed({
            label: 'size',
            reads: [D_WIDTH],
            into: TAG_C_DIRECT_SCHEMA.ports.size,
            compute: sizeOf,
        }),
    ],
});
DIRECT_COMPUTES = program.computes;
DIRECT_MARK_NAME = program.fieldMarks[0];
DIRECT_MARK_OPEN = program.fieldMarks[1];
DIRECT_MARK_WIDTH = program.fieldMarks[2];
DIRECT_MARK_NOTE = program.fieldMarks[3];
let flattened = false;
const TAG_C_DIRECT = mTAG_C_DIRECT;

const SHELL_C_DIRECT_SCHEMA = createExoSchema(buildShell);
const mSHELL_C_DIRECT = createExoMachine<TExoDomNode>(SHELL_C_DIRECT_SCHEMA, {
    createInitialState: (c) => {
        c.list(SHELL_C_DIRECT_SCHEMA.ports.tags, TAG_C_DIRECT, DIRECT_DATA);
    },
});
const SHELL_C_DIRECT = mSHELL_C_DIRECT;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// `machine·bound` AND `machine·bound·twin` STOOD HERE AND ARE STRUCK WITH THE FEATURE THEY PRICED
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT THE ROW WAS. Form C's program over form C's state, with ONE line of the commit different —
// `writes[i](value)` through a writer taken from `c.portWriter(port)` at the wire, one per
// derivation, holding that derivation's node AND its setter, both read at hand-out. Counted per
// derivation the walk visits, against the two rows it stood between:
//
//   machine        write(table, port, value)           2 calls · 3 array loads (+ a property load)
//   machine·copy   writers[i](nodes[slots[i]], value)  1 call  · 3 array loads
//   machine·bound  writes[i](value)                    2 calls · 1 array load
//
// It was the only one of the three that was a LIBRARY FEATURE rather than a participant's
// hand-written loop, and — because it copied `machine·copy`'s loop and therefore omitted the
// identical four things — `machine·copy ↔ machine·bound` was the ONE gap in this family that was
// purely a difference of write spelling.
//
// WHY IT IS GONE. `c.portWriter(port)` was deleted from every backend, on a measurement
// taken elsewhere and not on this axis. Bare shapes, 1000 instances × 5 ports, null pair 0.006 ns
// per write:
//
//     writes per port      1      2      4      8     16     64
//     lookup  ns/write   3.267  3.196  3.163  3.226  3.082  3.083
//     writer  ns/write   8.442  5.958  4.754  4.439  3.979  3.738
//
// The hand-out (5.8 ns per port per instance) amortises exactly as a cache should — and it converges
// 0.655 ns per write ABOVE the lookup and STAYS THERE. The cause is structural rather than
// incidental: the shipped body was `(value) => { write(at, value); }`, so every write paid a second
// call frame, and a frame is not amortisable. TWO ARRAY LOADS ARE CHEAPER THAN ONE EXTRA FRAME.
//
// WHAT THIS AXIS LOST, SAID PLAINLY SO NOBODY REBUILDS THE ROW WITHOUT THE FEATURE:
//
//  · THE ONLY PURELY-A-WRITE PAIR. `machine·copy ↔ machine·bound` had the four omissions on both
//    sides and cancelled them. `machine·copy`'s gap to `machine` still carries all four and must not
//    be quoted as the price of a write; `machine·write ↔ machine` is the row for that question and
//    it asks a different one (the shipped commit with one line changed).
//  · THE SIXTH NULL. `machine·bound·twin` was a null taken on a shape whose per-instance state held
//    closures the commit called through, and no other participant here has that shape. The census,
//    `nullsOf` and the legend all now say SEVEN.
//  · P19. Withdrawn, not failed, and its number is not reassigned.
//  · THE ONE MOUNT-SIDE STORY ON THIS AXIS WHERE ALLOCATION TRACKED PORTS. This row allocated FOUR
//    things per instance (the state object, the array the commit indexed, and one closure per written
//    port) where `machine` and `machine·copy` allocate ONE — a cost TABLE 1 charged and no update
//    table could see. Nothing on the axis prices that shape now.
//
// AND WHAT WOULD NOT BE THIS ROW REBUILT: a FLAT writer — the write inlined and specialised per port
// kind at hand-out, with no call inside — beat the lookup by 0.126 ns per write and crossed over at
// about 46 writes into one port. That is a different feature, it exists nowhere in this tree, and a
// row for it would have to be built against a backend where the lookup it removes is present.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// FORM C WITH THE WRITE LINE SWAPPED AND NOTHING ELSE — THE ROW `machine·copy` WAS MISTAKEN FOR
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHY THIS ROW EXISTS: TWO ROWS WERE READ AS PRICING ONE LINE AND THEY PRICE FIVE THINGS ═══
//
// `machine·copy` and the now-struck `machine·bound` were described — in this file's header, in
// `machine·copy`'s own caption and in the P7 block — as `machine` WITH THE PORT WRITE REPLACED. THAT
// DESCRIPTION WAS FALSE, it was quoted off this file as a measurement and had to be retracted, and
// the three places that carried it now say what those rows are instead. Beside the write, EACH COPY
// ALSO DROPPED FOUR THINGS `machine` PAYS. Listed here rather than under one of them, because the
// list belonged to the pair and now describes `machine·copy` alone:
//
//   (1) THE EFFECT-MASK SPLIT. `commitExoMachine` loads `program.bodyMask`,
//       stores `touched & effectMask` BACK on the instance and walks `touched & ~effectMask`. Both
//       copies read `state.touched`, store a bare `0` and walk the whole word. ONE PROGRAM LOAD,
//       TWO ANDS AND ONE EXTRA STORE PER COMMIT.
//   (2) THE `ports[i]` LOAD AND ITS BRANCH. The shipped commit reads that derivation's
//       port and tests it against `null`, taking the store-and-`after`-OR path when it is one.
//       Both copies index their own writer table with no load and no test. ONE ARRAY LOAD AND ONE
//       BRANCH PER DERIVATION THE WALK VISITS.
//   (3) TWO CALLS PER TRANSITION — NOT NAMED ANYWHERE UNTIL THIS ROW WAS BUILT, and by a count of
//       instructions the largest of the four. `machine`'s transitions are
//       `exoTransition(program, apply)`, and what that hands back is a closure which calls `apply`
//       and then `settle`, which calls the commit. FOUR CALLS deep from the driver's call site.
//       Both copies spell a transition as ONE hand-written function that stores its fields, ORs
//       their marks and calls its commit: TWO.
//       IT USED TO READ "TWO CALLS AND A BATCH TEST", and the batch test is struck rather than
//       edited: the shipped closure loaded a module-global depth and compared it against zero
//       between `apply` and `settle`, and it no longer does — that global went with
//       `exoMachineBatch`. The omission is still real; it is one term smaller than the
//       three places in this file that quoted it were saying.
//   (4) A PROPERTY LOAD PER TAG IN THE DRIVER. `compiledDriver` calls `ops.setName(states[i], …)`
//       — a load out of the ops object on every tag. `directDriver` calls a module-level `const`.
//       (`boundDriver` hoisted the four into locals precisely so that it matched `machine·copy`;
//       it is struck with its row.) So `machine·copy` does NOT match `machine` here.
//
// So `machine − machine·copy` is "one write PLUS FOUR OMISSIONS", and no number this axis prints
// says how that splits. `machine·copy ↔ machine·bound` WAS untouched by all four — they were
// identical in the two of them — and that was the honest comparison of two write spellings. IT IS
// GONE WITH `machine·bound`, and this row does not replace it: this asks what the write line costs
// INSIDE the shipped commit, which is not the same question as which of two spellings is cheaper.
//
// ═══ WHAT THIS ROW IS: ONE LINE, AND THE LINE IS THE WRITE ═══
//
// `commitExoMachine`, COPIED, WITH ONE LINE CHANGED:
//
//     C          write(table, port, value);
//     machine·write    writers[i](table[slots[i]] as Element, value);
//
// Everything around that line is the shipped commit: the `touched === 0` return, the effect-mask
// split, the four program loads, the bit walk, the `computes[i](state)` call, the
// `ports[i]` load, the `port !== null` branch, the store path, the `after` OR and the
// routing of woken effect bits back onto the instance. The transitions are `exoTransition`'s
// closure copied — `apply` then `settle`, with nothing between them, exactly as the shipped one is
// since it lost its batch test — in front of the same commit. The
// driver is `compiledDriver` ITSELF — not a copy of it — and the state is `TExoCompiledState`
// ITSELF, so "the same driver shape" and "the same state shape" are facts the compiler checks
// rather than sentences in this comment.
//
// ═══ WHAT IS PRE-RESOLVED, AND WHY THE FLATTENED SPELLING AND NOT THE BOUND ONE ═══
//
// `writers[i]` and `slots[i]` are `c.setters[at]` and `c.elem[at]` for `at =
// program.portIndexes[i]`, flattened ONCE at the FIRST WIRE of the process into two
// schema-wide arrays — the flatten `machine·copy` makes, and the loop
// `TExoMachineProgram.portIndexes`'s own note says that table exists for.
//
// THE BOUND SPELLING (`writes[i](value)`, from `c.portWriter(port)`) WAS REJECTED FOR
// THIS ROW WHILE IT STILL EXISTED, and the reason was never that it was slower. It is that a bound
// writer is PER INSTANCE: it needs an array and a closure per written port on every instance, so the
// state would grow a field the enode contract does not declare and the mount would grow
// three allocations. That is a SECOND difference from `machine`, on TABLE 1, and a row whose whole
// claim is "one difference" cannot carry one. THE SPELLING IS NOW UNAVAILABLE ANYWAY — the method
// was deleted from every backend — and the reason recorded here is the one that would still apply
// if it came back. The flattened spelling needs NOTHING per instance: `table` is
// `state.portTable`, which is the same array `machine` hands to its write, and the two arrays
// beside it are the schema's and are made once for the process.
//
// ═══ WHAT THIS ROW DOES DIFFER IN BESIDES THAT LINE, STATED BECAUSE THE FILE'S RULE DEMANDS IT ═══
//
//  (a) THE PREAMBLE LOSES ONE STATE LOAD AND GAINS TWO CLOSURE READS. `machine` hoists `const table =
//      state.portTable` AND `const write = state.portWrite`; this hoists the
//      table and the two flattened tables instead. That is not a fifth omission — it is what a
//      pre-resolved write NEEDS INSTEAD OF the schema's shared function, and it is part of the
//      line being priced. The FIELD is still on the state and `c.portNodeWriter()` is still called
//      at the wire, so the instance's shape, its word count and its mount work are unchanged.
//  (b) NOTHING, AND THAT ENTRY USED TO BE THE BATCH DEPTH. It said this file could not reach
//      `exoMachineBatchDepth`, so it declared a `let` of the same shape and had this
//      row's transition load and compare it exactly as `exoTransition`'s closure did. THE SHIPPED
//      CLOSURE NO LONGER MAKES THAT TEST — it is `apply` then `settle`, with nothing between — so
//      the stand-in had become a HANDICAP this row paid and `machine` did not, on the one row whose
//      gap may be quoted as the price of a line. It is deleted; see the block above
//      `makeWritePack`. What remains under this heading is (a), (c) and (d) and nothing else.
//  (c) THE COMMIT IS A PER-PACK CLOSURE where the shipped one is a module-level `function`. This
//      row carries a twin, so its program, its commit and its transitions are made per component
//      — the same reason `machine`'s own are made inside `makeCompiledPack`.
//  (d) THE WIRE CARRIES ONE BOOLEAN TEST PER INSTANCE, guarding the flatten that runs at the first
//      wire of the process. It is on the MOUNT path and on no update path, `machine·copy`'s wire has
//      the identical one, and it is the only thing this row adds to a mount.
//
// ═══ THE PREDICTION, AND IT COMMITS TO NO DIRECTION ═══
//
// P20. THE GAP `machine·write ↔ machine` IS SMALLER THAN THE GAP `machine·copy ↔ machine`, or both are UNRESOLVED.
//      MECHANISM: if the four omissions above carry any of what `machine·copy`'s gap to `machine` is made of,
//      then a row that pays them and differs only in the write must sit closer to `machine`. NO SIZE AND NO
//      DIRECTION IS PREDICTED for `machine·write ↔ machine` itself: it may well land under the floor, and
//      that is an answer — it would say the write line alone is below what this instrument can
//      see, which is exactly the sentence `machine·copy`'s number was wrongly quoted as saying.
//      JUDGED MECHANICALLY against THE PAIR'S OWN FLOOR — `machine·write` declares a null and so
//      does `machine`, so this is one of the sharpest readings on the table, while
//      `machine·copy ↔ machine` beside it is still bounded by the table — and printed
//      SEPARATED/UNRESOLVED.

// ═══ THE BATCH-DEPTH ARM IS GONE, AND IT WAS MEASURING A COST THE SHIPPED CODE HAD STOPPED PAYING
//
// `WRITE_BATCH_DEPTH`, `armWriteBatchDepth(0)` and the `if (WRITE_BATCH_DEPTH === 0)` inside this
// row's copied transition STOOD HERE. They existed because `exoTransition`'s returned closure used to
// load a module-global batch depth and compare it against zero before settling — a load and a
// comparison `machine` paid on every transition of every scene — and `machine·write`, whose entire
// claim is that it differs from `machine` IN ONE LINE, had to pay them too. Core did not export the
// depth, so this file declared a binding of the same shape and wrote it through a function so that no
// engine could fold it to a constant.
//
// THE SHIPPED TRANSITION NO LONGER MAKES THAT TEST. Read `exoTransition.ts`: what it hands back is
// `(state, first, second) => { apply(state, first, second); settle(state); }`, with nothing between
// the two calls, and for a program that declares no slot it hands back `apply` itself. The
// module-global depth was deleted along with `exoMachineBatch`; batching is now
// `enode.hold`, which no transition names.
//
// SO THE ARM HAD INVERTED. It was built to remove a HANDICAP and, once the shipped closure lost the
// test, it WAS one: `machine·write` paid a module-global load and a comparison per transition that
// `machine` does not pay, on the one row in this file whose number may be quoted as the price of a
// write line. It is removed here, and the copied closure below is now `apply` then `settle` —
// `exoTransition`'s two statements, exactly.
//
// SAID WITHOUT SOFTENING, BECAUSE IT IS THE KIND OF THING THIS FILE EXISTS TO NOT DO: for as long as
// the depth stood here after the transition lost it, `machine·write ↔ machine` carried a second
// difference besides the write, and P20 was reading a two-term gap as a one-term one. NO NUMBER FROM
// THIS AXIS TAKEN BEFORE THIS EDIT SHOULD BE QUOTED AS THE PRICE OF THE WRITE LINE.

/**
 * ONE PACK — `makeCompiledPack` with the commit's write line swapped and its transition wrapper
 * copied out of `exoTransition` so that the swap is the only thing between the two rows.
 *
 * IT HANDS BACK `TExoCompiledPack`, which is not tidiness: the state, the handle, the ops, the
 * shell and the driver are `machine`'S OWN TYPES AND `machine`'S OWN FUNCTIONS. Nothing below re-implements a
 * driver loop, a handle pull or a mount, so no line of the harness can drift between the two rows.
 */
const makeWritePack = (): TExoCompiledPack => {
    let ops!: TExoCompiledOps;
    const component_SCHEMA3 = createExoSchema(buildTag);
    const mComponent3 = createExoMachine<TExoDomNode, TExoCompiledHandle>(component_SCHEMA3, {
        createInitialState: (c, handle) => {
            if (!flattened) {
                const at = program.portIndexes;
                const made: TExoDomSetter[] = new Array<TExoDomSetter>(at.length);
                const found = new Int32Array(at.length);
                const data: unknown[] = new Array<unknown>(at.length);
                const schema = c.schema;
                for (let i = 0; i < at.length; i++) {
                    const port = at[i];
                    made[i] = port < 0 ? refuseNoPort : schema.setters[port];
                    found[i] = port < 0 ? 0 : schema.elem[port];
                    data[i] = port < 0 ? undefined : schema.writeData[port];
                }
                writers = made;
                slots = found;
                writeData = data;
                flattened = true;
            }
            const seed = handle.seed;
            // `machine`'S WIRE, LINE FOR LINE — the same object with the same fields, built whole,
            // including `portWrite`, which this row's commit never loads. It is taken
            // because the state shape is `TExoCompiledState` and because the mount must cost what
            // `machine`'s mount costs; dropping it would move TABLE 1 by one accessor call and make this
            // row differ from `machine` in two places instead of one.
            const state: TExoCompiledState = {
                name: seed.name,
                open: seed.open,
                width: seed.width,
                note: 0,
                managedState: [0],
                portTable: c.portTable(),
                portWrite: c.portNodeWriter(),
                attr: exoDetachedWrite,
                text: exoDetachedWrite,
                unsafeHtml: exoDetachedWrite,
            };
            handle.state = state;
            // THE SAME FILL, THROUGH THE SAME DOOR — `fillExoMachineDerivations` writes every
            // derivation once through `c.set`. The initial markup of this row and of `machine` is
            // therefore produced by the identical code, and the swapped line is reached only by an
            // UPDATE.
            fillExoMachineDerivations(program, state);
            c.on(component_SCHEMA3.ports.click, () => toggleOpen(state));
        },
    });
    const program = compileExoMachine<TExoCompiledState>({
        fields: 4,
        pendingRow: PENDING_ROW,
        derivations: [
            exoComputed({
                label: 'label',
                reads: [D_NAME, D_OPEN],
                into: component_SCHEMA3.ports.label,
                compute: labelOf,
            }),
            exoComputed({
                label: 'size',
                reads: [D_WIDTH],
                into: component_SCHEMA3.ports.size,
                compute: sizeOf,
            }),
        ],
    });
    const M_NAME = program.fieldMarks[0];
    const M_OPEN = program.fieldMarks[1];
    const M_WIDTH = program.fieldMarks[2];
    /** ZERO, exactly as `machine`'s is, and checked by the census rather than asserted here. */
    const M_NOTE = program.fieldMarks[3];

    /**
     * WHAT STANDS IN A DERIVATION SLOT THAT WRITES NO PORT — never called, and it is the
     * commit's `port !== null` branch that guarantees so, not a comment.
     *
     * The slot is filled rather than left a hole because a HOLEY array puts a prototype-chain
     * check on every read of it, on the one path this row exists to keep to a call.
     */
    const refuseNoPort: TExoDomSetter = (): void => {
        refuse(
            'machine-vs-cells: `machine·write` called a pre-resolved writer for a derivation that ' +
                'writes NO PORT. The commit`s `port !== null` test is what chooses between the ' +
                'writer and the chain store, so reaching this means the program`s port table ' +
                'and the flattened writer table disagree.'
        );
    };

    /**
     * THE SCHEMA'S HALF OF THE WRITE, FLATTENED PER DERIVATION AT THE FIRST WIRE —
     * `c.setters[at]`, `c.elem[at]` and `c.writeData[at]` for `at = program.portIndexes[i]`.
     *
     * ONCE FOR THE PROCESS AND NOT PER INSTANCE: `setters` and `elem` belong to the compiled
     * SCHEMA — one per (declaration, backend) — and this component is rendered by one
     * backend. The schema does not exist until the first render, which is the only reason
     * this is resolved in the wire rather than beside the program above.
     */
    let writers: readonly TExoDomSetter[] = [];
    let slots = new Int32Array(0);
    let writeData: readonly unknown[] = [];
    let flattened = false;

    /**
     * `commitExoMachine`, COPIED, WITH ONE LINE CHANGED — and the line is the write.
     *
     *     C          write(table, port, value);
     *     here       writers[i](table[slots[i]] as Element, value, writeData[i]);
     *
     * EVERYTHING ELSE IS THE SHIPPED FUNCTION, including the parts `machine·copy`
     * leaves out: the effect-mask split, the four program loads, the `ports[i]` load,
     * the `port !== null` branch, the chain store, the `after` OR and the routing of woken
     * effect bits back onto the instance. If the two ever stop being the same loop, this row
     * stops being a comparison of one line and nothing prints a warning.
     */
    const commitWrite = (
        prog: TExoMachineProgram<TExoCompiledState>,
        state: TExoCompiledState
    ): void => {
        const values = state.managedState;
        const at = prog.pendingRow;
        const touched = values[at];
        if (touched === 0) return;

        const effectMask = prog.bodyMask;
        values[at] = touched & effectMask;
        let pending = touched & ~effectMask;

        if (pending !== 0) {
            // THE SAME PER-INSTANCE REFERENCE `machine` HANDS TO ITS WRITE. On `@exodra/dom` the
            // opaque token IS the instance's node array — `TExoDomNode.portTable`
            // casts it out and `portNodeWriter`'s function casts it back in, and this is the
            // second half of that same pair. What is NOT loaded here is
            // `state.portWrite`: a pre-resolved write does not need the schema's shared
            // function, and that load is part of the line being priced rather than a fifth
            // omission. The FIELD is still on the state and is still taken at the wire.
            const table = state.portTable as unknown as readonly Node[];
            const computes = prog.computes;
            const portOf = prog.ports;
            const stores = prog.stores;
            const after = prog.after;
            const writeAt = writers;
            const slotAt = slots;
            const dataAt = writeData;

            do {
                const bit = pending & -pending;
                const i = 31 - Math.clz32(bit);
                pending ^= bit;

                const value = computes[i](state);
                const port = portOf[i];
                if (port !== null) {
                    // ═══ THE ONE LINE ═══ `machine` writes `write(table, port, value)` here.
                    writeAt[i](table[slotAt[i]] as Element, value, dataAt[i]);
                } else {
                    const store = stores[i] as (state: TExoCompiledState, value: unknown) => void;
                    store(state, value);
                    const woken = after[i];
                    pending |= woken & ~effectMask;
                    values[at] |= woken & effectMask;
                }
            } while (pending !== 0);
        }
    };

    /**
     * `exoMachineSettle`'S EFFECT-FREE BRANCH, COPIED — a closure that commits and
     * returns, decided once at declaration exactly as that function decides it.
     */
    const settle = (state: TExoCompiledState): void => {
        commitWrite(program, state);
    };

    /**
     * `exoTransition`'S RETURNED CLOSURE, COPIED — `apply`, then `settle`, and NOTHING BETWEEN
     * THEM, because the shipped closure has nothing between them.
     *
     * THREE OVERLOADS AND NOT A REST PARAMETER, for the reason that function gives: `...args`
     * allocates an array on the one path this design exists to keep to a store and an OR.
     *
     * A BATCH-DEPTH LOAD AND COMPARISON STOOD BETWEEN THE TWO CALLS and were removed when the
     * shipped transition lost theirs; the block above `makeWritePack` says what that was, why it
     * had turned into a handicap on this row, and what it means for numbers taken before.
     */
    function transition(
        apply: (state: TExoCompiledState) => void
    ): (state: TExoCompiledState) => void;
    function transition<TFirst>(
        apply: (state: TExoCompiledState, first: TFirst) => void
    ): (state: TExoCompiledState, first: TFirst) => void;
    function transition<TFirst, TSecond>(
        apply: (state: TExoCompiledState, first: TFirst, second: TSecond) => void
    ): (state: TExoCompiledState, first: TFirst, second: TSecond) => void;
    function transition<TFirst, TSecond>(
        apply: (state: TExoCompiledState, first: TFirst, second: TSecond) => void
    ): (state: TExoCompiledState, first: TFirst, second: TSecond) => void {
        return (state, first, second) => {
            apply(state, first, second);
            settle(state);
        };
    }

    // THE FIVE TRANSITIONS, DECLARED EXACTLY AS `machine`'S ARE — the same four bodies the driver
    // calls, and the click's toggle.
    const setName = transition<string>((s, name) => {
        s.name = name;
        s.managedState[PENDING_ROW] |= M_NAME;
    });
    const setNameAndOpen = transition<string, boolean>((s, name, open) => {
        s.name = name;
        s.managedState[PENDING_ROW] |= M_NAME;
        s.open = open;
        s.managedState[PENDING_ROW] |= M_OPEN;
    });
    const setWidth = transition<number>((s, width) => {
        s.width = width;
        s.managedState[PENDING_ROW] |= M_WIDTH;
    });
    const setNote = transition<number>((s, note) => {
        s.note = note;
        s.managedState[PENDING_ROW] |= M_NOTE;
    });
    const toggleOpen = transition((s) => {
        s.open = s.open === true ? false : true;
        s.managedState[PENDING_ROW] |= M_OPEN;
    });

    ops = { program, setName, setNameAndOpen, setWidth, setNote };
    const component = mComponent3;
    return { component, ops };
};

const PACK_C_WRITE = makeWritePack();
const SHELL_C_WRITE = makeCompiledShell(PACK_C_WRITE.component);
/** THE SIXTH NULL — its own component, its own schema, its own compiled program. True Δ: ZERO. */
const PACK_C_WRITE_TWIN = makeWritePack();
const SHELL_C_WRITE_TWIN = makeCompiledShell(PACK_C_WRITE_TWIN.component);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE WIRE — NO MACHINE AT ALL: STATE IN CLOSURE VARIABLES AND A PORT HANDLE KEPT
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHY THIS ROW EXISTS, AND IT IS THE QUESTION THE AXIS WAS MISSING ═══
//
// EVERY ROW ABOVE IS A MACHINE. Forms B and C, the two state
// shapes, the two transition spellings and the three write spellings all declare something once and
// drive an instance through it. THE THING THE LIBRARY ACTUALLY SHIPPED FIRST — a wiring function
// that keeps its state in the closure it already had and writes ports by hand — WAS NOT ON THIS
// AXIS AT ALL. So the axis could rank machines and could not say what one costs against writing
// the thing out.
//
// IT IS ASKED ELSEWHERE AND HAS NEVER BEEN ANSWERED. The app axis carries `exodraDirect` against
// `exodraMachineDirect`, and the figures handed to this file when the row was commissioned — NOT
// this file's own output, and quoted as somebody else's run — were 15.000 against 15.700 µs against
// a resolution of 0.900, a gap that has never separated in many attempts. A PAST RUN OF THIS FILE
// RESOLVED TABLE 2 AT 1.831 µs PER ROUND, WHICH IS 9.155 ns PER TAG — also a past number, also not
// a constant, and every run prints its own. Two orders of magnitude finer is the reason the question
// is asked here; what the answer is, this file does not know until it runs.
//
// ═══ WHAT IT IS, AND IT IS COPIED FROM A ROW THAT ALREADY EXISTS ═══
//
// `apps/exodra/exodra.tsx`'s card wire, on this component. Four things and no fifth:
//
//   · THE STATE IS FOUR CLOSURE VARIABLES — `let name, open, width, note` — captured by the
//     handlers the wire declares. No object, no values array, no field handle, no index, no mask.
//   · THE PORT HANDLE IS TAKEN ONCE, `const ports = c.fillDoors()`, which is the one value on this
//     surface a wire may hold past the wiring call. The CONNECTOR is not captured and must not be:
//     it is pooled per (schema, depth), so a handler writing through it later would write into
//     whichever instance now stands at that depth.
//   · A WRITE IS `ports.text(port, value)` — a method call, a `port.index` load, and then the two
//     array loads and the call that a fill is.
//   · THE HANDLER RECOMPUTES ITS OWN DERIVED VALUE and writes it, unconditionally. Nothing compares
//     the new string against the old, because nothing here holds the old one. That is the shape:
//     it pays per call rather than per declaration, and it pays whether or not the value moved.
//
// THERE IS NO TRANSITION, NO MARK, NO PENDING WORD, NO COMMIT AND NO DERIVATION TABLE. The four
// doors the driver calls ARE the wire's whole update path.
//
// ═══ WHAT IT ALLOCATES, WHICH IS THE MOST OF ANY ROW HERE AND IS THE POINT ═══
//
// SEVEN THINGS PER INSTANCE against `machine`'s two: the `c.fillDoors()` wrapper, FOUR handler closures, the
// object that carries them back to the driver, and the click closure every participant pays. A
// machine's per-instance cost does not grow with the number of doors the outside world may push
// through — the transitions are declared once per COMPONENT and take the instance as an argument —
// and A WIRE'S DOES, because a door is a closure over this instance. TABLE 1 is where that is
// charged and no update table can see it.
//
// THE FOUR CLOSURES ARE NOT AN ARTEFACT OF BEING BENCHMARKED. `apps/exodra/exodra.tsx`
// allocates exactly this per card (`tog`, `addTag`, and `noteCardOps` to hand them out) for
// exactly this reason: the outside world reaches a wire through the functions the wire made. What
// IS this
// file's own is the count — four, because this axis drives four scenes — and a component written by
// one event would allocate one.
//
// ═══ WHAT IT DOES NOT HAVE, SAID SO THAT NO NUMBER BELOW IS READ AS A VERDICT ON THE SHAPE ═══
//
// NO BATCH, so two writes to one port in one turn are two DOM writes; the machine's mask collapses
// them and this cannot. NO DECLARATION, so nothing can read what this component depends on —
// `reportOneObjectClaim` and the field→derivations census below have nothing to print for it. NO
// SHARED PROGRAM, so a second instance re-makes every closure. And NO ORDER: two handlers writing
// the same port leave the last one standing, where a commit runs each derivation once, low to high.
// TABLE 3 is the scene where the first of those has a chance to show — two fields feeding one
// derived string — and this row writes that string ONCE there, by hand, because its author knew to.
//
// ═══ THE PREDICTION, AND IT COMMITS TO NO DIRECTION ═══
//
// P21. `wire` AND `machine` EITHER SEPARATE OR DO NOT, AND NO DIRECTION IS PREDICTED. MECHANISM, both
//      ways, because both are real: per update the wire pays one closure call, its own recompute
//      and the shipped door (a method call, a `port.index` load, two array
//      loads and the setter call); `machine` pays four calls (the transition closure, `apply`, `settle`,
//      the commit), a store, an OR, the effect-mask split, a bit walk, a `computes`
//      call, a `ports[i]` load, a branch, and then a write that is two array loads and a call.
//      THE WIRE HAS THE SHORTER PATH AND THE MORE EXPENSIVE WRITE,
//      and this file will not publish a guess about which is larger. WHAT IS PREDICTED IS THE
//      SHAPE: the pair is judged against ITS OWN FLOOR — `wire`'s null and `machine`'s, and no
//      other row on the table — and printed SEPARATED or
//      UNRESOLVED, and an UNRESOLVED here is an answer — it would say the two shapes cost the same
//      to update at this width, which is what the app axis has been failing to resolve for months.

/** What the driver may do to one wired tag — the four closures the wire made, handed back. */
interface TExoWireOps {
    readonly setName: (name: string) => void;
    readonly setNameAndOpen: (name: string, open: boolean) => void;
    readonly setWidth: (width: number) => void;
    readonly setNote: (note: number) => void;
}

interface TExoWireHandle {
    readonly seed: TExoTagSeed;
    ops: TExoWireOps | null;
}

let WIRE_DATA: readonly TExoWireHandle[] = [];

/**
 * ONE WIRED TAG — no schema-level declaration beyond the markup, and no per-component anything.
 *
 * IT IS A FACTORY FOR THE SAME REASON EVERY OTHER PACK HERE IS: this row carries a twin, and a twin
 * is a SECOND, separately declared component with its own declaration and its own compiled
 * schema. There is nothing else to close over — a wire declares nothing once.
 */
const makeWireTag = (): TExoDomMachine => {
    const MACHINE_SCHEMA9 = createExoSchema(buildTag);
    const mMachine9 = createExoMachine<TExoDomNode, TExoWireHandle>(MACHINE_SCHEMA9, {
        createInitialState: (c, handle) => {
            const seed = handle.seed;
            // THE STATE — four closure variables, which is the whole of it. `note` is here for the
            // same reason it is on every other row: TABLE 4 writes it and nothing reads it.
            let name = seed.name;
            let open = seed.open;
            let width = seed.width;
            let note = 0;

            // THE INITIAL FILL, THROUGH `c.set` — the same door `fillExoMachineDerivations` uses for
            // every machine row, so the mounted markup is produced by the same call.
            c.text(MACHINE_SCHEMA9.ports.label, labelOf(name, open));
            c.text(MACHINE_SCHEMA9.ports.size, sizeOf(width));

            // THE PORT HANDLE, KEPT. One object per instance and nothing per port; the connector
            // itself is deliberately not captured. See `apps/exodra/exodra.md` for the note.
            const ports = c.fillDoors();

            // THE FOUR DOORS. Each stores its state and recomputes exactly the derived value that
            // state feeds, unconditionally — there is nothing here holding the previous string to
            // compare against, and nothing here that could skip a write.
            const setName = (next: string): void => {
                name = next;
                ports.text(MACHINE_SCHEMA9.ports.label, labelOf(name, open));
            };
            // TWO FIELDS, ONE WRITE — by hand, because both feed ONE derived string. A machine gets
            // this from the mask; this row gets it from its author knowing, which is the difference
            // the file's caveat (6) is about and which no gate here could catch if he did not.
            const setNameAndOpen = (nextName: string, nextOpen: boolean): void => {
                name = nextName;
                open = nextOpen;
                ports.text(MACHINE_SCHEMA9.ports.label, labelOf(name, open));
            };
            const setWidth = (next: number): void => {
                width = next;
                ports.text(MACHINE_SCHEMA9.ports.size, sizeOf(width));
                // AND THE ONE READ OF `note` IN THIS COMPONENT, PUT WHERE IT COSTS NOTHING. TABLE 4
                // writes that variable and nothing else in this closure touches it, and a closure
                // variable no live code reads is one an engine may drop along with its store —
                // which would leave TABLE 4 timing an empty call for this row and a real store for
                // every other. The WIDTH signal is GATED AND NEVER TIMED (see the header), so this
                // is read on the one door no measured region ever opens. `note` is `noteAt`'s
                // output and is never negative; the refusal is the read, not a guard against a
                // case that can happen.
                if (note < 0) {
                    refuse(
                        `machine-vs-cells: \`wire\` holds a negative note (${note}), which ` +
                            '`noteAt` cannot produce.'
                    );
                }
            };
            // THE FIELD NOTHING READS — a store and nothing else. There is no mask to OR and no
            // commit to return from, so this row's TABLE 4 is a call and an assignment.
            const setNote = (next: number): void => {
                note = next;
            };
            handle.ops = { setName, setNameAndOpen, setWidth, setNote };

            c.on(MACHINE_SCHEMA9.ports.click, () => {
                open = open === true ? false : true;
                ports.text(MACHINE_SCHEMA9.ports.label, labelOf(name, open));
            });
        },
    });
    return mMachine9;
};

const makeWireShell = (tag: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA10 = createExoSchema(buildShell);
    const mMachine10 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA10, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA10.ports.tags, tag, WIRE_DATA);
        },
    });
    return mMachine10;
};

const TAG_WIRE = makeWireTag();
const SHELL_WIRE = makeWireShell(TAG_WIRE);
/** THE SEVENTH NULL — its own component, its own declaration, its own schema. True Δ: ZERO. */
const TAG_WIRE_TWIN = makeWireTag();
const SHELL_WIRE_TWIN = makeWireShell(TAG_WIRE_TWIN);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE ONE BACKEND, COMPOSED ONCE AT MODULE LOAD
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A backend is the schema-cache key and it is compared by POINTER. One composed per render would
// hand the cache a fresh key every time and recompile every declaration — markup parse
// included — inside a timed region, and every number below would be a measurement of the compiler.

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE FLOOR — the same tree by hand: no declaration, no schema, no port, no source, no connector
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * The tag prototype, compiled ONCE at module scope for the reason every floor in this suite states:
 * a construction inside a measured region would be timing a parser rather than a program.
 *
 * `setAttribute('type', …)` and not `.type =`, so the attribute is written the way the schema's
 * static attribute is written and the two cannot differ in serialisation order.
 */
const TAG_PROTO = (() => {
    const div = document.createElement('div');
    div.className = 'tag';
    const btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.appendChild(document.createTextNode(''));
    const small = document.createElement('small');
    small.appendChild(document.createTextNode(''));
    div.appendChild(btn);
    div.appendChild(small);
    return div;
})();

/** One tag's whole state in a straight-line program: four fields and the two Text nodes it kept. */
interface TExoNativeState {
    name: string;
    open: boolean;
    width: number;
    note: number;
    readonly labelText: Text;
    readonly sizeText: Text;
}

interface TExoNativeHandle {
    readonly seed: TExoTagSeed;
    state: TExoNativeState | null;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE WIDE COMPONENT — twenty fields, twenty derivations, a tangle, an unread field and a chain
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHY IT EXISTS ═══
//
// Because the tag above has TWO derivations, and O(affected) against O(declared) cannot show a
// mechanism at two. Everything from here to the app scene is one component wide enough for the
// difference to be arithmetic rather than noise.
//
// ═══ ITS SHAPE, AND EVERY PART OF IT IS THERE FOR A REASON ═══
//
// TWENTY STATE FIELDS, `f0` … `f19`, all integers. TWENTY DERIVATIONS. NINETEEN TEXT PORTS.
//
//   THE TANGLE. `WIDE_READS` below is the dependency table and it is written out rather than
//   generated, so a reader can check it. Every derivation reads TWO fields; a FIELD may be read by
//   one derivation (`f8`), by two (`f0`, `f3`, `f6`) or by three (`f2`, `f12`). Twenty independent
//   pairs would be a scene in which a mask never has to merge anything, and it would rig the
//   several-fields table in form C's favour.
//
//   THE UNREAD FIELD is `f19`, read by nothing, exactly as `note` is in the narrow scene. At width
//   it is the sharpest thing this axis can show: form C's entry for it is `0` however wide the
//   component gets, and form B's scan is over every declared derivation however few match.
//
//   THE CHAIN is derivation 0. It reads `f0` and `f1`, writes NO PORT, and STORES its result into
//   field 18 — which derivations 18 and 19 read. That is a derivation feeding derivations, in one
//   commit, and the narrow scene has none. It is not a decoration: the several-fields scene writes
//   `f0`, so the chain RUNS ON A TIMED TABLE rather than only in the gate.
//
// ═══ HOW EACH FORM EXPRESSES THE CHAIN, WHICH IS NOT THE SAME THING ═══
//
//   `machine`  declares it: derivation 0's ADDRESS is field 18 — one field VALUE, which carries both the
//        index the compiler needs and the writer the commit calls — the compiler checks the order is
//        topological, and the commit picks up the woken bits mid-walk.
//   `machine·scan`  CANNOT DECLARE IT AT ALL — the prototype has no store — so its derivations 18 and 19
//        RECOMPUTE the intermediate from `f0` and `f1` themselves and widen their own masks by
//        hand. That is what an author would have to write, it is the cost of the missing store, and
//        it means B declares NINETEEN derivations where C declares twenty. Both counts are printed.
//   `floor` computes the intermediate ONCE per round in the caller, which is what a
//        hand-written program does.
//
// ═══ THE COMPUTES ARE SHARED, AND THAT IS WHAT MAKES THE GATE A GATE ═══
//
// `wideText` is called EXACTLY ONCE per derivation run by every participant. `WIDE_FROM_VALUES[i]`
// takes the two field values — since a derivation takes its declared fields as ARGUMENTS, what
// form C's compute is handed. `WIDE_FROM_STATE[i]` takes
// the state object and reads the two fields as literal properties, which is what form B's compute
// and the floor do. Neither wraps the other, so no form pays a WRAPPER the others do not.
//
// WHERE FORM C NOW DIFFERS, AND IT IS NOT NOTHING: reaching those two values costs it two calls
// into `WIDE_READ_FIELD` where form B does two property loads inside its own compute. That is the
// price of the dependency list being the parameter list — the thing that makes a forgotten mask
// impossible — and this axis is where it shows up rather than in an argument.
//
/** State fields on the wide component. Twenty, and the ceiling is thirty-one. */
const WIDE_FIELDS = 20;

/** The field NOTHING reads — `note` at width, and the reason TABLE 8 exists. */
const WIDE_UNREAD_FIELD = 19;

/** The field derivation 0 STORES into, and derivations 18 and 19 read. The chain. */
const WIDE_CHAIN_FIELD = 18;

/**
 * WHICH TWO FIELDS EACH DERIVATION READS — the whole shape of the component, in one table.
 *
 * Derivation 0 is the CHAIN's root: it writes no port and stores field 18. Derivations 1..19 each
 * write one text port, in order. Field 19 appears nowhere, which is the point of it.
 */
const WIDE_READS: readonly (readonly [number, number])[] = [
    [0, 1], //  0  the intermediate — no port, stores field 18
    [2, 3], //  1
    [2, 4], //  2
    [2, 5], //  3   f2 is read by THREE derivations
    [3, 6], //  4
    [6, 7], //  5
    [7, 8], //  6
    [8, 9], //  7
    [9, 10], //  8
    [10, 11], //  9
    [11, 12], // 10
    [12, 13], // 11
    [13, 14], // 12
    [14, 15], // 13
    [15, 16], // 14
    [16, 17], // 15
    [17, 0], // 16
    [1, 4], // 17
    [18, 5], // 18  reads what derivation 0 stored
    [12, 18], // 19  the chain again, and f12's third reader
];

/** How many derivations write a port — every one but the intermediate. */
const WIDE_PORTS = WIDE_READS.length - 1;

/**
 * THE VALUE OF ONE DERIVATION, and the only arithmetic any participant performs.
 *
 * `& 0xffff` keeps the strings short and their lengths stable, so no participant is charged for a
 * longer string than another and the markup gate compares like with like.
 */
const wideText = (at: number, a: number, b: number): string =>
    `${at}:${(a * 31 + b * 7 + at) & 0xffff}`;

/** The intermediate — a NUMBER, stored into field 18 and read by two derivations. */
const wideSummary = (a: number, b: number): number => (a * 131 + b * 17) & 0xffff;

/** THE TWENTY FIELDS, as an interface every participant's state satisfies. */
interface TExoWideFields {
    f0: number;
    f1: number;
    f2: number;
    f3: number;
    f4: number;
    f5: number;
    f6: number;
    f7: number;
    f8: number;
    f9: number;
    f10: number;
    f11: number;
    f12: number;
    f13: number;
    f14: number;
    f15: number;
    f16: number;
    f17: number;
    /** THE CHAIN'S INTERMEDIATE — written by derivation 0, read by derivations 18 and 19. */
    f18: number;
    /** THE FIELD NO DERIVATION READS. */
    f19: number;
}

/**
 * EACH DERIVATION, READ OFF THE STATE — twenty one-line closures with LITERAL property access,
 * because that is what a machine's `compute` and a hand-written program both do.
 *
 * Entry 0 is the intermediate and returns a NUMBER; the other nineteen return the string their port
 * shows. They must agree with `WIDE_FROM_VALUES` below, and the markup gate is what holds them to
 * it — the two spellings exist because form C's compute is handed VALUES and never sees a state
 * object, and wrapping either in the other would charge one form a call the others do not pay.
 */
const WIDE_FROM_STATE: readonly ((s: TExoWideFields) => string)[] = [
    () => '', //  0 — the intermediate has no port; `WIDE_SUMMARY_FROM_STATE` is its compute
    (s) => wideText(1, s.f2, s.f3),
    (s) => wideText(2, s.f2, s.f4),
    (s) => wideText(3, s.f2, s.f5),
    (s) => wideText(4, s.f3, s.f6),
    (s) => wideText(5, s.f6, s.f7),
    (s) => wideText(6, s.f7, s.f8),
    (s) => wideText(7, s.f8, s.f9),
    (s) => wideText(8, s.f9, s.f10),
    (s) => wideText(9, s.f10, s.f11),
    (s) => wideText(10, s.f11, s.f12),
    (s) => wideText(11, s.f12, s.f13),
    (s) => wideText(12, s.f13, s.f14),
    (s) => wideText(13, s.f14, s.f15),
    (s) => wideText(14, s.f15, s.f16),
    (s) => wideText(15, s.f16, s.f17),
    (s) => wideText(16, s.f17, s.f0),
    (s) => wideText(17, s.f1, s.f4),
    (s) => wideText(18, s.f18, s.f5),
    (s) => wideText(19, s.f12, s.f18),
];

/** The intermediate's compute, off the state — derivation 0's, and form B has no place for it. */
const WIDE_SUMMARY_FROM_STATE = (s: TExoWideFields): number => wideSummary(s.f0, s.f1);

/**
 * FORM B's SPELLING OF THE TWO CHAINED DERIVATIONS — they recompute the intermediate themselves,
 * because the prototype has no store to put it in.
 *
 * This is the extra work the missing store costs, and it is the only place any participant computes
 * something twice. It is charged to form B alone, on the several-fields table, and it is printed.
 */
const WIDE_B_FROM_STATE_18 = (s: TExoWideFields): string =>
    wideText(18, wideSummary(s.f0, s.f1), s.f5);
const WIDE_B_FROM_STATE_19 = (s: TExoWideFields): string =>
    wideText(19, s.f12, wideSummary(s.f0, s.f1));

/**
 * EACH DERIVATION, FROM THE TWO VALUES — what form C's compute is handed. Built in a loop because a
 * compute takes positional values and there is no property access to write out; the arithmetic is
 * the same single `wideText` call.
 */
const WIDE_FROM_VALUES: readonly ((a: number, b: number) => string)[] = WIDE_READS.map(
    (_reads, at) =>
        (a: number, b: number): string =>
            wideText(at, a, b)
);

/**
 * PER FIELD: the derivations that read it, resolved once at module load.
 *
 * Every participant that has to know "what does writing this field affect" is handed the SAME
 * precomputed list — the floor included, so no participant is charged for working out
 * a dependency set inside a timed region.
 */
const WIDE_READERS_OF: readonly (readonly number[])[] = (() => {
    const out: number[][] = Array.from({ length: WIDE_FIELDS }, () => []);
    for (let at = 0; at < WIDE_READS.length; at++) {
        const [a, b] = WIDE_READS[at];
        out[a].push(at);
        if (b !== a) out[b].push(at);
    }
    return out;
})();

/**
 * THE DERIVATIONS ONE SCENE WAKES, in ascending order, CHAIN INCLUDED and DEDUPED.
 *
 * The chain is what makes this more than a union: writing `f0` wakes derivation 0, whose store into
 * field 18 wakes derivations 18 and 19 — and derivation 19 is ALSO woken directly by `f12`. It must
 * appear once. That is the property the several-fields table exists to exercise, and resolving it
 * here (untimed, at module load) is what lets the floor be handed the answer instead of
 * computing it per round.
 */
const wideWoken = (fields: readonly number[]): readonly number[] => {
    const set = new Set<number>();
    for (const f of fields) for (const at of WIDE_READERS_OF[f]) set.add(at);
    if (set.has(0)) for (const at of WIDE_READERS_OF[WIDE_CHAIN_FIELD]) set.add(at);
    return [...set].sort((x, y) => x - y);
};

/** TABLE 6 — one field changes. `f2` is read by three derivations, and by no chain. */
const WIDE_ONE: readonly number[] = [2];
/**
 * TABLE 7 — three fields at once, chosen so the scene actually exercises what it claims.
 *
 * `f0` runs the CHAIN (derivation 0 stores field 18, waking 18 and 19). `f2` wakes 1, 2 and 3.
 * `f12` wakes 10, 11 and 19 — and 19 is already woken by the chain, so a form that runs it twice is
 * doing visible extra work. Nine derivations run, one of them reached by two paths.
 */
const WIDE_SOME: readonly number[] = [0, 2, 12];
/** TABLE 8 — the field nothing reads, at width. */
const WIDE_NONE: readonly number[] = [WIDE_UNREAD_FIELD];

const WIDE_ONE_WOKEN = wideWoken(WIDE_ONE);
const WIDE_SOME_WOKEN = wideWoken(WIDE_SOME);

/** One wide row's starting values — built once at module load and shared by every participant. */
type TExoWideSeed = readonly number[];

/**
 * Wide rows per shell. SMALLER THAN `TAGS` on purpose, and the reason is arithmetic rather than
 * taste: 200 rows × 4 shells of nineteen ports each is a large live heap per participant. This suite crashes under memory
 * pressure — that is why it runs one axis per process — so the unit count is stated here rather
 * than discovered by a crash.
 */
const WIDE_ROWS = 50;

/** Mounts per timed region on TABLE 5 — 4 × 50 = 200 wide rows, 4000 elements, built per region. */
const WIDE_MOUNT_REPS = 4;

/** Shells standing at once on TABLES 6, 7 and 8. */
const WIDE_SHELLS = 4;

/**
 * Rounds per scenario on TABLES 6 and 7 — 8 × 4 shells = 32 rounds per region.
 *
 * A wide round is 50 rows × (3 or 9) derivations, each ending in a DOM write, so a region at this
 * factor is milliseconds. Every region is checked against the observed clock at the bottom
 * regardless, and refused BY NAME if it does not clear it.
 */
const WIDE_FIELD_ROUNDS = 8;

/**
 * Rounds per scenario on TABLE 8, larger for the reason `NOTE_ROUNDS` is: writing a field nothing
 * derives from ends in NO DOM WRITE for any participant, so at the smaller factor the region would
 * land under the clock and the run would refuse the one table that exists to show how small the job
 * became. THE FACTOR IS PRINTED IN THE TABLE.
 */
const WIDE_NOTE_ROUNDS = WIDE_FIELD_ROUNDS * 32;

const WIDE_SEEDS: readonly TExoWideSeed[] = Array.from({ length: WIDE_ROWS }, (_, row) =>
    Array.from({ length: WIDE_FIELDS }, (_, f) => (row * 7 + f * 13 + 1) & 0xff)
);

/** The markup of one wide row, for the census. */
const WIDE_MARKUP = `<div class="row">${'<em>…</em>'.repeat(3)}…(${WIDE_PORTS} in all)</div>`;

/** A wide row's ports: nineteen text ports under one element, in declaration order. */
interface TExoWidePorts {
    readonly out: readonly TExoTextPort[];
}

const buildWideRow = (b: TExoSchemaCursor): TExoWidePorts => {
    const out: TExoTextPort[] = [];
    b.el('div', { class: 'row' }, (row) => {
        for (let i = 0; i < WIDE_PORTS; i++) {
            row.el('em', null, (cell) => {
                out.push(cell.textPort());
            });
        }
    });
    return { out };
};

const buildWideShell = (b: TExoSchemaCursor): { readonly rows: TExoChildrenPort } => {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'rows' }, (host) => {
        rows = host.childrenPort();
    });
    return { rows };
};

/** What every wide participant answers. One call per scene, so the gate drives what the timer does. */
interface TExoWideDriver {
    /** TABLE 6 — `f2` on every row. */
    readonly one: (k: number) => void;
    /** TABLE 7 — `f0`, `f2` and `f12` as ONE change; runs the chain. */
    readonly some: (k: number) => void;
    /** TABLE 8 — the field no derivation reads. */
    readonly none: (k: number) => void;
}

interface TExoWideMounted {
    readonly driver: () => TExoWideDriver;
    readonly off: () => void;
}

interface TExoWideProgram {
    readonly name: string;
    readonly what: string;
    /** Objects this participant allocates PER INSTANCE, counted off its own wire. See the census. */
    readonly allocs: string;
    readonly prepare: () => (parent: HTMLElement) => TExoWideMounted;
}

/** The value written into field `f` of row `row` in round `k` — identical for every participant. */
const wideAt = (k: number, row: number, f: number): number => (k * 3 + row * 7 + f * 11 + 1) & 0xff;

// ── THE FLOOR AT WIDTH ───────────────────────────────────────────────────────────────────────
//
// The same nineteen strings by hand: one cloned prototype, nineteen Text nodes held in an array,
// twenty plain fields, `.data` written directly, and the intermediate computed once per round in
// the caller. No declaration, no schema, no port, no source, no connector.

const WIDE_PROTO = (() => {
    const div = document.createElement('div');
    div.className = 'row';
    for (let i = 0; i < WIDE_PORTS; i++) {
        const cell = document.createElement('em');
        cell.appendChild(document.createTextNode(''));
        div.appendChild(cell);
    }
    return div;
})();

interface TExoWideNativeState extends TExoWideFields {
    /** The nineteen Text nodes this row kept — ONE array, and it is counted in the census. */
    readonly texts: readonly Text[];
}

interface TExoWideHandle<TState> {
    readonly seed: TExoWideSeed;
    readonly row: number;
    state: TState | null;
}

/** Build a state object with the twenty fields seeded. Shared by every participant. */
const wideFieldsOf = (seed: TExoWideSeed): TExoWideFields => ({
    f0: seed[0],
    f1: seed[1],
    f2: seed[2],
    f3: seed[3],
    f4: seed[4],
    f5: seed[5],
    f6: seed[6],
    f7: seed[7],
    f8: seed[8],
    f9: seed[9],
    f10: seed[10],
    f11: seed[11],
    f12: seed[12],
    f13: seed[13],
    f14: seed[14],
    f15: seed[15],
    f16: seed[16],
    f17: seed[17],
    // SEEDED WITH THE CHAIN ALREADY RUN, so every participant starts settled and the mount's first
    // paint agrees with the floor's before any transition happens.
    f18: wideSummary(seed[0], seed[1]),
    f19: seed[19],
});

/** WRITE ONE FIELD BY INDEX — used by every participant's driver, identically. */
const WIDE_WRITE_FIELD: readonly ((s: TExoWideFields, v: number) => void)[] = [
    (s, v) => {
        s.f0 = v;
    },
    (s, v) => {
        s.f1 = v;
    },
    (s, v) => {
        s.f2 = v;
    },
    (s, v) => {
        s.f3 = v;
    },
    (s, v) => {
        s.f4 = v;
    },
    (s, v) => {
        s.f5 = v;
    },
    (s, v) => {
        s.f6 = v;
    },
    (s, v) => {
        s.f7 = v;
    },
    (s, v) => {
        s.f8 = v;
    },
    (s, v) => {
        s.f9 = v;
    },
    (s, v) => {
        s.f10 = v;
    },
    (s, v) => {
        s.f11 = v;
    },
    (s, v) => {
        s.f12 = v;
    },
    (s, v) => {
        s.f13 = v;
    },
    (s, v) => {
        s.f14 = v;
    },
    (s, v) => {
        s.f15 = v;
    },
    (s, v) => {
        s.f16 = v;
    },
    (s, v) => {
        s.f17 = v;
    },
    (s, v) => {
        s.f18 = v;
    },
    (s, v) => {
        s.f19 = v;
    },
];

/**
 * READ ONE FIELD BY INDEX — the mirror of `WIDE_WRITE_FIELD`, and written out for the same reason
 * that one is: `(s) => s['f' + f]` would be a keyed load where every other participant does a named
 * one, and form C would then be measured against a handicap nothing in the design imposes.
 */
const WIDE_READ_FIELD: readonly ((s: TExoWideFields) => number)[] = [
    (s) => s.f0,
    (s) => s.f1,
    (s) => s.f2,
    (s) => s.f3,
    (s) => s.f4,
    (s) => s.f5,
    (s) => s.f6,
    (s) => s.f7,
    (s) => s.f8,
    (s) => s.f9,
    (s) => s.f10,
    (s) => s.f11,
    (s) => s.f12,
    (s) => s.f13,
    (s) => s.f14,
    (s) => s.f15,
    (s) => s.f16,
    (s) => s.f17,
    (s) => s.f18,
    (s) => s.f19,
];

/**
 * THE TWENTY FIELDS AS VALUES — what form C's derivations declare at width. Each carries its
 * number, its bit, its reader and its writer, so the dependency table above (`WIDE_READS`) becomes
 * the derivations' ARGUMENT lists with nothing said twice.
 *
 * Every field is given a writer even though only field 18 is ever stored into: a writer costs one
 * closure per field at module load and nothing per instance, and the compiler refuses `into` only
 * on a field that has none.
 */
const WIDE_FIELD: readonly TExoMachineField<TExoWideFields, number>[] = WIDE_READ_FIELD.map(
    (read, f) => exoMachineField<TExoWideFields, number>(f, read, WIDE_WRITE_FIELD[f])
);

const WIDE_NATIVE: TExoWideProgram = {
    name: 'floor',
    what: 'THE FLOOR AT WIDTH — a program with NO LIBRARY. It clones the row by hand, holds its 19 Text nodes in an array and its 20 state fields as plain properties, writes `.data` directly, and computes the intermediate in the caller.',
    allocs: '1 state + 1 Text array + 1 cloned subtree',
    prepare: () => {
        const handles: TExoWideHandle<TExoWideNativeState>[] = WIDE_SEEDS.map((seed, row) => ({
            seed,
            row,
            state: null,
        }));
        return (parent) => {
            const host = document.createElement('div');
            host.className = 'rows';
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                const row = WIDE_PROTO.cloneNode(true) as HTMLElement;
                const texts: Text[] = new Array<Text>(WIDE_PORTS);
                let cell = row.firstChild as Node;
                for (let p = 0; p < WIDE_PORTS; p++) {
                    texts[p] = cell.firstChild as Text;
                    cell = cell.nextSibling as Node;
                }
                const state: TExoWideNativeState = {
                    ...wideFieldsOf(handle.seed),
                    texts,
                };
                for (let d = 1; d < WIDE_READS.length; d++) {
                    texts[d - 1].data = WIDE_FROM_STATE[d](state);
                }
                handle.state = state;
                host.appendChild(row);
            }
            parent.appendChild(host);
            return {
                driver: () => {
                    const states = handles.map((h) => h.state as TExoWideNativeState);
                    const run = (fields: readonly number[], woken: readonly number[]) => {
                        return (k: number): void => {
                            for (let i = 0; i < states.length; i++) {
                                const s = states[i];
                                for (let j = 0; j < fields.length; j++) {
                                    WIDE_WRITE_FIELD[fields[j]](s, wideAt(k, i, fields[j]));
                                }
                                // THE CHAIN, BY HAND AND ONCE — what a straight-line program does
                                // when one value feeds two others.
                                if (woken.length !== 0 && woken[0] === 0) {
                                    s.f18 = WIDE_SUMMARY_FROM_STATE(s);
                                }
                                const texts = s.texts;
                                for (let w = 0; w < woken.length; w++) {
                                    const d = woken[w];
                                    if (d === 0) continue;
                                    texts[d - 1].data = WIDE_FROM_STATE[d](s);
                                }
                            }
                        };
                    };
                    return {
                        one: run(WIDE_ONE, WIDE_ONE_WOKEN),
                        some: run(WIDE_SOME, WIDE_SOME_WOKEN),
                        // THE UNREAD FIELD: a property store and nothing else. Nothing is derived
                        // from it, so nothing is recomputed and no Text node is touched.
                        none: (k) => {
                            for (let i = 0; i < states.length; i++) {
                                states[i].f19 = wideAt(k, i, WIDE_UNREAD_FIELD);
                            }
                        },
                    };
                },
                off: () => {
                    host.remove();
                },
            };
        };
    },
};

// ── FORM B AT WIDTH — nineteen declared derivations, scanned on every commit ─────────────────
//
// The prototype's commit is O(DECLARED), so every transition here tests nineteen masks whatever it
// woke. That is the whole reason this scene exists, and it is also where the missing store shows:
// derivations 18 and 19 recompute the intermediate themselves and carry `f0`/`f1` in their own
// masks, because there is nowhere to put an intermediate.

/** Form B's wide state is exactly the twenty fields — the machine object is beside it, not on it. */
type TExoWideMachineState = TExoWideFields;

let WIDE_MACHINE_DATA: readonly TExoWideHandle<TExoBenchMachine<TExoWideMachineState>>[] = [];

/** Every derivation array form B declared at width, for the census to read the shape off. */
const WIDE_B_DERIVATIONS: (readonly TExoDerivation<TExoWideMachineState>[])[] = [];

const WIDE_FIELD_MASKS: readonly number[] = Array.from({ length: WIDE_FIELDS }, (_, f) =>
    exoFieldMask(f)
);

/**
 * FORM B's MASK FOR ONE DERIVATION — the two fields it reads, with the CHAIN'S FIELD EXPANDED into
 * the two fields the intermediate is computed from, because form B has no intermediate.
 */
const wideBMask = (at: number): number => {
    const [a, b] = WIDE_READS[at];
    const bitOf = (f: number): number =>
        f === WIDE_CHAIN_FIELD ? WIDE_FIELD_MASKS[0] | WIDE_FIELD_MASKS[1] : WIDE_FIELD_MASKS[f];
    return bitOf(a) | bitOf(b);
};

const makeWideMachineRow = (): TExoDomMachine => {
    const MACHINE_SCHEMA15 = createExoSchema(buildWideRow);
    const mMachine15 = createExoMachine<
        TExoDomNode,
        TExoWideHandle<TExoBenchMachine<TExoWideMachineState>>
    >(MACHINE_SCHEMA15, {
        createInitialState: (c, handle) => {
            const state: TExoWideMachineState = wideFieldsOf(handle.seed);
            handle.state = exoFormBMachine(state, c.fillDoors(), derivations);
        },
    });
    // DECLARED ONCE, AT MODULE LOAD — nineteen objects shared by every instance.
    const derivations: readonly TExoDerivation<TExoWideMachineState>[] = WIDE_READS.slice(1).map(
        (_reads, k) => {
            const at = k + 1;
            const compute =
                at === 18
                    ? WIDE_B_FROM_STATE_18
                    : at === 19
                    ? WIDE_B_FROM_STATE_19
                    : WIDE_FROM_STATE[at];
            return {
                name: `d${at}`,
                mask: wideBMask(at),
                port: MACHINE_SCHEMA15.ports.out[at - 1],
                compute,
            };
        }
    );
    WIDE_B_DERIVATIONS.push(derivations);
    return mMachine15;
};

const makeWideMachineShell = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA16 = createExoSchema(buildWideShell);
    const mMachine16 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA16, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA16.ports.rows, row, WIDE_MACHINE_DATA);
        },
    });
    return mMachine16;
};

const WIDE_ROW_B = makeWideMachineRow();
const WIDE_SHELL_B = makeWideMachineShell(WIDE_ROW_B);
const WIDE_ROW_B_TWIN = makeWideMachineRow();
const WIDE_SHELL_B_TWIN = makeWideMachineShell(WIDE_ROW_B_TWIN);

// ── FORM C AT WIDTH — twenty derivations, an inverted table, and the chain DECLARED ──────────

/** Form C's wide instance: the twenty fields, the pending set, the table and the doors — ONE object. */
type TExoWideCompiledState = TExoNamedFieldNode & TExoWideFields;

interface TExoWideCompiledOps {
    readonly program: TExoMachineProgram<TExoWideCompiledState>;
    readonly one: (state: TExoWideCompiledState, k: number, row: number) => void;
    readonly some: (state: TExoWideCompiledState, k: number, row: number) => void;
    readonly none: (state: TExoWideCompiledState, k: number, row: number) => void;
}

interface TExoWideCompiledPack {
    readonly component: TExoDomMachine;
    readonly ops: TExoWideCompiledOps;
}

let WIDE_COMPILED_DATA: readonly TExoWideHandle<TExoWideCompiledState>[] = [];

const makeWideCompiledPack = (): TExoWideCompiledPack => {
    let ops!: TExoWideCompiledOps;
    const component_SCHEMA4 = createExoSchema(buildWideRow);
    const mComponent4 = createExoMachine<TExoDomNode, TExoWideHandle<TExoWideCompiledState>>(
        component_SCHEMA4,
        {
            createInitialState: (c, handle) => {
                // ONE OBJECT AND ONE ONE-SLOT PENDING TABLE PER INSTANCE, at twenty fields
                // exactly as at four.
                const state: TExoWideCompiledState = {
                    ...wideFieldsOf(handle.seed),
                    managedState: [0],
                    portTable: c.portTable(),
                    portWrite: c.portNodeWriter(),
                    attr: exoDetachedWrite,
                    text: exoDetachedWrite,
                    unsafeHtml: exoDetachedWrite,
                };
                handle.state = state;
                fillExoMachineDerivations(program, state);
            },
        }
    );
    const program = compileExoMachine<TExoWideCompiledState>({
        fields: WIDE_FIELDS,
        pendingRow: PENDING_ROW,
        derivations: WIDE_READS.map((reads, at) => ({
            label: `d${at}`,
            reads: [WIDE_FIELD[reads[0]], WIDE_FIELD[reads[1]]],
            // DERIVATION 0 IS THE INTERMEDIATE: its address is a STATE FIELD rather than a
            // markup port, and the two chained derivations read that field. One address in
            // one numbering; the compiler checks that every derivation reading that field is
            // declared after this one.
            into: at === 0 ? WIDE_FIELD[WIDE_CHAIN_FIELD] : component_SCHEMA4.ports.out[at - 1],
            // THE SAME ARITHMETIC EVERY PARTICIPANT RUNS, reached by value. `wideText` is still
            // called exactly once per derivation.
            compute: at === 0 ? wideSummary : WIDE_FROM_VALUES[at],
        })),
    });
    const marks = program.fieldMarks;
    // ONE TRANSITION PER SCENE, declared once at module load, allocating nothing per call:
    // the round and the row arrive as two integers rather than in an object.
    const writeFields = (
        fields: readonly number[]
    ): ((state: TExoWideCompiledState, k: number, row: number) => void) =>
        exoTransition<TExoWideCompiledState, number, number>(program, (s, k, row) => {
            for (let j = 0; j < fields.length; j++) {
                const f = fields[j];
                WIDE_WRITE_FIELD[f](s, wideAt(k, row, f));
                s.managedState[PENDING_ROW] |= marks[f];
            }
        });
    ops = {
        program,
        one: writeFields(WIDE_ONE),
        some: writeFields(WIDE_SOME),
        // THE SAFE SPELLING of a write to a field nothing reads: it marks, and the mark
        // is 0 — however wide the component is.
        none: writeFields(WIDE_NONE),
    };
    const component = mComponent4;
    return { component, ops };
};

const makeWideCompiledShell = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA17 = createExoSchema(buildWideShell);
    const mMachine17 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA17, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA17.ports.rows, row, WIDE_COMPILED_DATA);
        },
    });
    return mMachine17;
};

const WIDE_PACK_C = makeWideCompiledPack();
const WIDE_SHELL_C = makeWideCompiledShell(WIDE_PACK_C.component);
const WIDE_PACK_C_TWIN = makeWideCompiledPack();
const WIDE_SHELL_C_TWIN = makeWideCompiledShell(WIDE_PACK_C_TWIN.component);

// ── THE TWO TABLE SHAPES AT WIDTH — twenty integers in an array, and the scene they can win ──
//
// THIS IS WHERE THE STATE-SHAPE QUESTION HAS THE MOST ROOM. Twenty named properties against twenty
// slots, and three things move at once — see `machine-state-shapes.ts`'s header for all three, but
// the one to read first is that a transition writing a COMPUTED field number is `cells[BASE + f] =
// v` here and `WIDE_WRITE_FIELD[f](s, v)` on the object form, because a named property cannot be
// indexed. The loops are otherwise line-for-line identical: both mark per field, neither merges.
//
// THE CHAIN IS DECLARED THE SAME WAY. Derivation 0 stores into field 18 through that field's own
// writer, which for a table is `cells[BASE + 18] = v`. `compileExoMachine` checks the
// topological order here exactly as it does for `machine`.

interface TExoWideTableOps {
    readonly one: (state: TExoStateTableState, k: number, row: number) => void;
    readonly some: (state: TExoStateTableState, k: number, row: number) => void;
    readonly none: (state: TExoStateTableState, k: number, row: number) => void;
}

let WIDE_TABLE_OWN_DATA: readonly TExoWideHandle<TExoStateTableState>[] = [];
let WIDE_TABLE_SHARED_DATA: readonly TExoWideHandle<TExoStateTableState>[] = [];

/** `WIDE_PACK_C`'s derivation list, declared against slots instead of named properties. */
const declareWideTableDerivations = (
    P: TExoWidePorts,
    base: number
): readonly TExoMachineDerivation<TExoStateTableState>[] => {
    const F = exoStateTableFields<number>(WIDE_FIELDS, base);
    return WIDE_READS.map((reads, at) => ({
        label: `d${at}`,
        reads: [F[reads[0]], F[reads[1]]],
        into: at === 0 ? F[WIDE_CHAIN_FIELD] : P.out[at - 1],
        compute: at === 0 ? wideSummary : WIDE_FROM_VALUES[at],
    }));
};

/**
 * THE THREE WIDE TRANSITIONS, over slots — `WIDE_PACK_C`'s `writeFields` with the one line that
 * differs. The store is indexed; the mark is still read per field and ORed per field, because
 * merging it at declaration is an optimisation available to every shape and would be a different
 * measurement.
 */
const makeWideTableOps = (
    base: number,
    program: TExoMachineProgram<TExoStateTableState>
): TExoWideTableOps => {
    const marks = program.fieldMarks;
    // THE PENDING WORD RIDES IN THE SAME ARRAY, in the slot after the fields.
    const S_PENDING = base + WIDE_FIELDS;
    const writeFields = (
        fields: readonly number[]
    ): ((state: TExoStateTableState, k: number, row: number) => void) =>
        exoTransition<TExoStateTableState, number, number>(program, (s, k, row) => {
            const cells = s.managedState;
            for (let j = 0; j < fields.length; j++) {
                const f = fields[j];
                cells[base + f] = wideAt(k, row, f);
                cells[S_PENDING] = (cells[S_PENDING] as number) | marks[f];
            }
        });
    return {
        one: writeFields(WIDE_ONE),
        some: writeFields(WIDE_SOME),
        none: writeFields(WIDE_NONE),
    };
};

type TExoWideTablePack = TExoStateTablePack<TExoWideHandle<TExoStateTableState>, TExoWideTableOps>;

const makeWideTablePack = (sharedWithNodes: boolean): TExoWideTablePack =>
    exoStateTablePack<TExoWidePorts, TExoWideHandle<TExoStateTableState>, TExoWideTableOps>({
        sharedWithNodes,
        fields: WIDE_FIELDS,
        build: buildWideRow,
        declare: declareWideTableDerivations,
        makeOps: makeWideTableOps,
        // ONE ARRAY LITERAL OF TWENTY, built whole, seeded with the chain ALREADY RUN so that this
        // row's first paint agrees with the floor's before any transition happens — exactly what
        // `wideFieldsOf` does for the object rows.
        seedWhole: (handle) => {
            const s = handle.seed;
            return [
                s[0],
                s[1],
                s[2],
                s[3],
                s[4],
                s[5],
                s[6],
                s[7],
                s[8],
                s[9],
                s[10],
                s[11],
                s[12],
                s[13],
                s[14],
                s[15],
                s[16],
                s[17],
                wideSummary(s[0], s[1]),
                s[19],
                // THE PENDING WORD, in the slot after the fields.
                0,
            ];
        },
        seedField: (handle, f) =>
            f === WIDE_CHAIN_FIELD ? wideSummary(handle.seed[0], handle.seed[1]) : handle.seed[f],
        take: (handle, state) => {
            handle.state = state;
        },
        // NO EVENT PORT ON THE WIDE ROW — nineteen text ports and nothing else — so nothing is
        // written here and the wire carries one null comparison instead of a call.
        onWired: null,
    });

const WIDE_PACK_C_TBL = makeWideTablePack(false);
const WIDE_PACK_C_TBL_TWIN = makeWideTablePack(false);
const WIDE_PACK_C_SHR = makeWideTablePack(true);
const WIDE_PACK_C_SHR_TWIN = makeWideTablePack(true);

const makeWideTableShell = (row: TExoDomMachine, shared: boolean): TExoDomMachine => {
    const MACHINE_SCHEMA18 = createExoSchema(buildWideShell);
    const mMachine18 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA18, {
        createInitialState: (c) => {
            c.list(
                MACHINE_SCHEMA18.ports.rows,
                row,
                shared ? WIDE_TABLE_SHARED_DATA : WIDE_TABLE_OWN_DATA
            );
        },
    });
    return mMachine18;
};

const WIDE_SHELL_C_TBL = makeWideTableShell(WIDE_PACK_C_TBL.component, false);
const WIDE_SHELL_C_TBL_TWIN = makeWideTableShell(WIDE_PACK_C_TBL_TWIN.component, false);
const WIDE_SHELL_C_SHR = makeWideTableShell(WIDE_PACK_C_SHR.component, true);
const WIDE_SHELL_C_SHR_TWIN = makeWideTableShell(WIDE_PACK_C_SHR_TWIN.component, true);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE WIRE AT WIDTH — twenty closure variables, nineteen ports written out, and no machine
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHY THIS ROW EXISTS, AND IT IS THE ONE THING THE NARROW `wire` COULD NOT SAY ═══
//
// THE NARROW TABLES PUT A WIRE BESIDE A MACHINE ON A COMPONENT WITH TWO DERIVATIONS, and two is the
// width at which nothing about a derivation TABLE can show: a hand-written path that knows what to
// recompute and a compiled path that looks it up are separated by at most one mask test, and P21 is
// written to admit that it may print UNRESOLVED. THE WIDE TABLES ARE WHERE THE FORMS SEPARATE OR
// FAIL TO. `machine` runs exactly the woken derivations off an inverted table; this row runs exactly the
// same ones because its author wrote them out. Same job, two ways of knowing what the job is.
//
// UNTIL THIS ROW THE BLOCK ABOVE SAID `wire` HAS NO WIDE ROW AND NAMED THAT AS THE SHARPER OMISSION.
// It is no longer an omission and the block now says what was built instead.
//
// ═══ WHICH OF THE TWO HONEST SPELLINGS THIS IS, AND WHAT THE OTHER WOULD HAVE MEASURED ═══
//
// A WIDE WIRE HAS NO FIELD→DERIVATIONS TABLE, so when one field moves the author has to know what to
// update, and there are exactly two things he can write:
//
//   (i)  IT UPDATES EVERYTHING IT COULD — all nineteen ports on any change — which is what somebody
//        writes when the dependency map lives only in his head and he will not risk a stale cell.
//   (ii) IT UPDATES ONLY WHAT THAT FIELD FEEDS, which is the author HAND-MAINTAINING the map form C
//        compiles at module load.
//
// THIS ROW IS (ii), AND THE REASON IS THAT (i) MEASURES A DIFFERENT QUESTION. Spelling (i) does
// nineteen recomputes and nineteen DOM writes wherever this one does three, so its number is
// arithmetic that is already on the table — the per-derivation cost is readable off `floor` and off
// this row — and what it would add is the price of an author's ignorance rather than the price of
// the machine's bookkeeping. Spelling (ii) is the only one in which the wire and `machine` do the IDENTICAL
// WORK, and a gap between two paths doing identical work is the abstraction's price, which is the
// question this axis was built to answer. It is also the DIRECT WIDENING of the narrow row: that
// row's `setName` writes `label` and not `size`, and its `setNameAndOpen` writes `label` ONCE — the
// same hand-held map, at two derivations instead of twenty.
//
// WHAT (i) WOULD HAVE MEASURED, SAID PLAINLY BECAUSE IT IS NOT MEASURED: on TABLE 6, nineteen
// recomputes and nineteen `ports.set` calls against this row's three — the same per-derivation cost
// this row pays, roughly six and a third times over. On TABLE 7, nineteen against eight. AND ON
// TABLE 8 IT WOULD BE THE ONLY PARTICIPANT ON THE AXIS THAT TOUCHES THE DOM AT ALL — nineteen writes
// for a field no derivation reads, where `machine` ORs a zero and returns and the floor stores a property.
// It was left off for a stated cost as well as a stated reason: TABLE 8 runs at
// `WIDE_NOTE_ROUNDS` = 256 rounds PRECISELY BECAUSE nobody writes a port there, and a row that wrote
// nineteen ports per row per round would put 4 × 256 × 50 × 19 = 972,800 DOM WRITES INTO ONE TIMED
// REGION AT BATCH 1 (reps × rounds × rows × ports), into a table tuned for a property store — this
// axis already dies at large batches, and that row and its twin would be the two most expensive
// phases in the file. THAT ARITHMETIC IS THE REASON FOR THE CHOICE AND IT IS ARITHMETIC, NOT A
// MEASUREMENT: nothing here has run that row.
//
// ═══ WHAT IT IS — the narrow row's four things, at twenty fields ═══
//
//   · THE STATE IS TWENTY CLOSURE VARIABLES, `f0` … `f19`, seeded exactly as `wideFieldsOf` seeds
//     every other participant's state object — `f18` from `wideSummary(seed[0], seed[1])` and not
//     from `seed[18]`, so this row starts settled and its mount agrees with the floor's.
//     FIVE OF THEM ARE `let` AND FIFTEEN ARE `const`, because the three scenes this axis drives push
//     five fields and nothing ever moves the rest. That is a real property of the shape AND an
//     artefact of the scene, and it is named here rather than hidden: a machine's state object holds
//     twenty mutable slots whatever the driver does with them.
//   · THE PORT HANDLE IS TAKEN ONCE, `const ports = c.fillDoors()`. The CONNECTOR is not captured, for
//     the reason the narrow block gives: it is pooled per (schema, depth).
//   · NINETEEN PORTS ARE FILLED BY HAND at the mount, through `c.set` — the same door
//     `fillExoMachineDerivations` uses for every machine row.
//   · EACH DOOR RECOMPUTES AND WRITES, unconditionally. Nothing holds a previous string and nothing
//     compares.
//
// THE COMPUTES ARE THE SHARED ONES AND THAT IS NOT A DETAIL. A hand-written wire would spell a
// derivation `wideText(1, f2, f3)` inline; this row spells it `WIDE_FROM_VALUES[1](f2, f3)` — an
// array load and a call, then the same single `wideText` — because that is what form C's compute
// costs. Inlining it would make this row one call per derivation
// cheaper than every other row on the table and the gap would be a measurement of that call.
//
// ═══ WHAT IT ALLOCATES, WHICH AT WIDTH IS THE FINDING ═══
//
// FIVE THINGS PER INSTANCE AGAINST `machine`'S ONE: the `c.fillDoors()` wrapper, THREE door closures, and the
// object that carries them back to the driver. `machine` at width allocates ONE state object — the port
// table and the schema's write are references on it — and there is no click closure on this
// component for either row to pay.
//
// AND THE SHAPE OF THAT COUNT IS THE POINT, IN THE OTHER DIRECTION FROM WHAT THE HEADER GUESSED.
// The block above predicted "a wide component written field by field would have twenty of them". A
// WIRE'S COUNT TRACKS DOORS AND NOT FIELDS, and this axis drives three scenes, so it is three — the
// narrow row's four is four for the same reason. What the header got right is the SHAPE: a machine's
// per-instance cost is flat in both (its transitions are declared once per COMPONENT and take the
// instance as an argument), a wire's is linear in doors, and a component the world pushes field by
// field would allocate twenty closures per instance where `machine` allocates none.
//
// WHAT NEITHER WIRE ROW'S ALLOCATION LINE COUNTS, said once so the two lines stay comparable: the
// CLOSURE CONTEXT the doors capture. It is one object per instance in both, and at width it holds
// the TWELVE fields the doors read or write plus the port handle, against the narrow row's four
// fields and its handle. The other eight fields are read only by the fill, which runs in the wire
// body itself, so nothing captures them — WHICH IS ALSO AN ARTEFACT OF THE SCENE and not a saving
// the shape would keep if all twenty moved.
//
// WHAT GROWS WITH WIDTH IS THE SOURCE. Nineteen fill lines and eleven write lines are written out
// below, they are the author's copy of `WIDE_READS`, and NOTHING IN THIS FILE CHECKS THAT COPY
// EXCEPT THE GATE — which catches a map that is too SMALL (a port left stale diverges from the
// floor byte for byte) and CANNOT catch one that is too LARGE (a redundant write lands the value
// that was already there). That asymmetry is caveat (6) at width and it is the thing a declaration
// buys that no row here can price.
//
// ═══ THE PREDICTION, AND IT COMMITS TO NO DIRECTION BETWEEN THE TWO ═══
//
// P22. `wire` AND `machine` AT WIDTH EITHER SEPARATE OR DO NOT, AND NO DIRECTION IS PREDICTED BETWEEN
//      THEM. MECHANISM, both ways, because both are real. THE WIRE per woken derivation: an array
//      load, the compute call, and `ExoDomPorts.set` — a method call, a `port.index` load, a
//      FILL-RECORD TEST, two array loads and the setter call; per update, one closure call and no
//      bookkeeping whatever. `machine` per update: `exoTransition`'s two calls, the
//      field stores, one mask OR per field written, the effect-mask split, and then per woken
//      derivation a bit scan, a `computes` call, a `ports[i]` load, a branch and a write with NO
//      record test in front of it. THE WIRE HAS THE SHORTER PATH AND THE MORE EXPENSIVE WRITE, at
//      three derivations and at eight, and this file will not publish a guess about which is larger.
//      WHAT IS PREDICTED IS THE SHAPE: the pair is judged against ITS OWN FLOOR on each table and
//      printed SEPARATED or UNRESOLVED. AND ONE THING IS PREDICTED WITH A DIRECTION, because it is
//      about the wire and the FLOOR and not about the wire and `machine`: `wire` LANDS AT OR BELOW
//      `floor` ON TABLE 6, for the same reason `machine` does — the floor's straight-line program runs
//      the three woken derivations and so does this row, so the two do the same job and the wire's
//      only structural addition is `ports.set` against a `.data` store. THAT ONE COMPARISON IS
//      BOUNDED BY THE TABLE AND NOT BY A PAIR, because `floor` declares no twin and therefore has
//      no null — a `floor·twin` is the missing measurement, not a property of the comparison. IF
//      IT LANDS ABOVE THE FLOOR BY MORE THAN THAT, the write is dearer than the whole of the machinery `machine` runs
//      and the axis has found where the port surface costs something.

/**
 * What the driver may do to one wired row — THREE doors, one per scene, exactly as the narrow row's
 * four are one per scene.
 *
 * A DOOR TAKES ITS FIELDS' VALUES AND NOT A ROUND NUMBER, so the `wideAt` calls stay on the driver's
 * side where every other participant's are, and the door pays for the writes alone.
 */
interface TExoWideWireOps {
    /** TABLE 6 — `f2` moves. The author's hand-held map says derivations 1, 2 and 3. */
    readonly one: (v2: number) => void;
    /**
     * TABLE 7 — `f0`, `f2` and `f12` as ONE change.
     *
     * THE CHAIN IS RUN BY HAND AND ONCE, exactly as the floor runs it, and derivation
     * 19 — reached by `f12` directly AND by the chain through field 18 — is WRITTEN ONCE, because
     * its author knew to. `machine` gets that from the pending set; this row gets it from him.
     */
    readonly some: (v0: number, v2: number, v12: number) => void;
    /** TABLE 8 — the field nothing reads: a call and a store into a closure variable. */
    readonly none: (v19: number) => void;
}

let WIDE_WIRE_DATA: readonly TExoWideHandle<TExoWideWireOps>[] = [];

/**
 * ONE WIRED ROW — no declaration, no shared program, and nothing per component but the schema.
 *
 * IT IS A FACTORY FOR THE REASON EVERY PACK HERE IS: this row carries a twin, and a twin is a
 * SECOND, separately declared component with its own declaration and its own compiled schema.
 */
const makeWideWireRow = (): TExoDomMachine => {
    const MACHINE_SCHEMA19 = createExoSchema(buildWideRow);
    const mMachine19 = createExoMachine<TExoDomNode, TExoWideHandle<TExoWideWireOps>>(
        MACHINE_SCHEMA19,
        {
            createInitialState: (c, handle) => {
                const seed = handle.seed;
                // THE STATE — twenty closure variables. `let` for the five the doors write, `const` for
                // the fifteen nothing here moves; see the block above for why that is stated rather
                // than spelled `let` throughout.
                let f0 = seed[0];
                const f1 = seed[1];
                let f2 = seed[2];
                const f3 = seed[3];
                const f4 = seed[4];
                const f5 = seed[5];
                const f6 = seed[6];
                const f7 = seed[7];
                const f8 = seed[8];
                const f9 = seed[9];
                const f10 = seed[10];
                const f11 = seed[11];
                let f12 = seed[12];
                const f13 = seed[13];
                const f14 = seed[14];
                const f15 = seed[15];
                const f16 = seed[16];
                const f17 = seed[17];
                // SEEDED WITH THE CHAIN ALREADY RUN, exactly as `wideFieldsOf` seeds it — `seed[18]` is
                // not read by anybody, here or anywhere else.
                let f18 = wideSummary(seed[0], seed[1]);
                // THE FIELD NOTHING READS. It is `let` because TABLE 8's door writes it.
                let f19 = seed[19];

                // THE FILL — nineteen ports, written out, through the same `c.text` every machine row's
                // fill uses. This is the author's copy of `WIDE_READS`, and it is what "written by
                // hand" costs in source.
                c.text(out[0], WIDE_FROM_VALUES[1](f2, f3));
                c.text(out[1], WIDE_FROM_VALUES[2](f2, f4));
                c.text(out[2], WIDE_FROM_VALUES[3](f2, f5));
                c.text(out[3], WIDE_FROM_VALUES[4](f3, f6));
                c.text(out[4], WIDE_FROM_VALUES[5](f6, f7));
                c.text(out[5], WIDE_FROM_VALUES[6](f7, f8));
                c.text(out[6], WIDE_FROM_VALUES[7](f8, f9));
                c.text(out[7], WIDE_FROM_VALUES[8](f9, f10));
                c.text(out[8], WIDE_FROM_VALUES[9](f10, f11));
                c.text(out[9], WIDE_FROM_VALUES[10](f11, f12));
                c.text(out[10], WIDE_FROM_VALUES[11](f12, f13));
                c.text(out[11], WIDE_FROM_VALUES[12](f13, f14));
                c.text(out[12], WIDE_FROM_VALUES[13](f14, f15));
                c.text(out[13], WIDE_FROM_VALUES[14](f15, f16));
                c.text(out[14], WIDE_FROM_VALUES[15](f16, f17));
                c.text(out[15], WIDE_FROM_VALUES[16](f17, f0));
                c.text(out[16], WIDE_FROM_VALUES[17](f1, f4));
                c.text(out[17], WIDE_FROM_VALUES[18](f18, f5));
                c.text(out[18], WIDE_FROM_VALUES[19](f12, f18));

                // THE PORT HANDLE, KEPT — one object per instance and nothing per port.
                const ports = c.fillDoors();

                // DOOR ONE — `f2`, which three derivations read and no chain touches.
                const one = (v2: number): void => {
                    f2 = v2;
                    ports.text(out[0], WIDE_FROM_VALUES[1](f2, f3));
                    ports.text(out[1], WIDE_FROM_VALUES[2](f2, f4));
                    ports.text(out[2], WIDE_FROM_VALUES[3](f2, f5));
                    // AND THE ONE READ OF `f19` IN THIS COMPONENT, PUT WHERE IT COSTS LEAST — the same
                    // move the narrow row makes with `note`, and for the same reason. TABLE 8's door
                    // stores that variable and no other live code here touches it, and a closure
                    // variable nothing reads is one an engine may drop ALONG WITH ITS STORE, which
                    // would leave TABLE 8 timing an empty call for this row and a real store for every
                    // other. It is read HERE and not in `none` because this door already runs three
                    // recomputes and three DOM writes, so a context load and a never-taken branch are
                    // small against it, where TABLE 8's whole job for this row is one store and they
                    // would be a fraction of it that this file cannot bound.
                    // `wideAt` masks with 0xff and cannot produce a negative; the refusal is the READ.
                    if (f19 < 0) {
                        refuse(
                            `machine-vs-cells: wide \`wire\` holds a negative f19 (${f19}), which ` +
                                '`wideAt` cannot produce.'
                        );
                    }
                };

                // DOOR TWO — `f0`, `f2` and `f12` as ONE change, the chain by hand, eight ports each
                // written once, in ascending derivation order. That order is not decoration: it is
                // what `machine`'s commit guarantees structurally and what this row's author has to keep.
                const some = (v0: number, v2: number, v12: number): void => {
                    f0 = v0;
                    f2 = v2;
                    f12 = v12;
                    f18 = wideSummary(f0, f1);
                    ports.text(out[0], WIDE_FROM_VALUES[1](f2, f3));
                    ports.text(out[1], WIDE_FROM_VALUES[2](f2, f4));
                    ports.text(out[2], WIDE_FROM_VALUES[3](f2, f5));
                    ports.text(out[9], WIDE_FROM_VALUES[10](f11, f12));
                    ports.text(out[10], WIDE_FROM_VALUES[11](f12, f13));
                    ports.text(out[15], WIDE_FROM_VALUES[16](f17, f0));
                    ports.text(out[17], WIDE_FROM_VALUES[18](f18, f5));
                    ports.text(out[18], WIDE_FROM_VALUES[19](f12, f18));
                };

                // DOOR THREE — the field nothing reads. No mask to OR, no commit to return from.
                const none = (v19: number): void => {
                    f19 = v19;
                };

                // THE OBJECT THAT CARRIES THE DOORS BACK — the fifth allocation, and the one a machine
                // does not make because its transitions are the component's rather than the instance's.
                handle.state = { one, some, none };
            },
        }
    );
    // PER COMPONENT, NOT PER INSTANCE — the port array the schema handed back. Hoisting it here
    // costs no per-instance slot and makes a write `out[k]`: ONE array load, which is what
    // `machine`'s commit pays for `ports[i]`.
    const out = MACHINE_SCHEMA19.ports.out;
    return mMachine19;
};

const makeWideWireShell = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA20 = createExoSchema(buildWideShell);
    const mMachine20 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA20, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA20.ports.rows, row, WIDE_WIRE_DATA);
        },
    });
    return mMachine20;
};

const WIDE_ROW_WIRE = makeWideWireRow();
const WIDE_SHELL_WIRE = makeWideWireShell(WIDE_ROW_WIRE);
/** THE SIXTH WIDE NULL — its own component, its own declaration, its own schema. True Δ: ZERO. */
const WIDE_ROW_WIRE_TWIN = makeWideWireRow();
const WIDE_SHELL_WIRE_TWIN = makeWideWireShell(WIDE_ROW_WIRE_TWIN);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE MACHINE'S CHEAP SPELLING AT WIDTH — a machine that declares NO DERIVATION, whose
// transitions write the ports themselves
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHY THIS ROW EXISTS, AND IT IS AN ADMISSION ABOUT THE TWO ROWS ABOVE ═══
//
// `machine` IS THE MACHINE'S MOST EXPENSIVE SPELLING. Twenty declared derivations, an inverted
// field→derivations table, a mask per field, a pending word and a commit that walks it. `wire` is a
// plain closure-per-instance wiring with none of that. EVERY COMPARISON ON TABLES 5 TO 8 BETWEEN
// THOSE TWO HAS BEEN THE MACHINE'S DEAREST SPELLING AGAINST THE WIRE'S ONLY ONE, and the cheap
// spelling of the machine — the one an author reaches for when a component's rules are three lines
// he is happy to write out — was not on the axis at all.
//
// IT IS THE SAME THING `apps/exodra/exodra.tsx` IS on the `app-update` axis,
// widened — and it now holds its state the same way that file does: a change arrives through a declared
// TRANSITION, the transition body writes the ports itself in one straight line where a declaration
// would have woken them, and the values those bodies read live in THE CACHE. THERE IS NO
// `m.derive`, NO `m.fill`, NO `m.effect` AND NO `m.field` IN THIS ROW.
//
// ═══ WHAT IT IS, PART BY PART ═══
//
//  · TWENTY VALUES IN ONE CACHE SLOT — `createExoMachine(schema, { createInitialState: () => ({ f0: 0, … f19: 0 }) })`, one object
//    per instance of the same `TExoWideFields` shape every participant holds, read with
//    `c.readState(K)` once per transition body and written with an ordinary property
//    store. THEY USED TO BE TWENTY `m.field`s, and the reason they are not is not
//    performance: a field is an address for WAKING — a bit against the thirty-one ceiling, a row of
//    the mark table, a place in `withExoComputedMachine`'s inversion, a row of the chain table — and a component
//    that declares no derivation, no fill and no effect can never use one. The values here are read
//    by three transition bodies and a seed, and reading a value inside a transition body is not a
//    declaration and wakes nothing. NOT ONE OF THE TWENTY STAYS A FIELD, because the one shape that
//    would keep one — a value named in the dependency list of a declaration the row legitimately
//    has, as `apps/exodra/exodra.tsx`'s two region fields are named by its teardown
//    effect —
//    does not occur here: this row declares nothing at all.
//  · WHAT A WRITE COSTS NOW, AND WHAT IT COST BEFORE, because the difference is a term in every
//    number on TABLES 6 TO 8. `s.f2 = v` is ONE named property store. `F[2].set(c, v)` was a store
//    into the value table, a load of `wakes`, a null test, a load of `wakes[row]` (null,
//    because a component with no derivation has no chain), a second null test, a load of
//    `marks[row]` and an OR of zero. The transition's commit still runs and still returns on its
//    first comparison — the pending word of a machine with no fields cannot leave zero — so what
//    went is that `set` and nothing else. IT USED TO BE COUNTED AS EIGHT STEPS, with a batch-depth
//    load and a comparison among them; the shipped `set` no longer makes either (`exo-machine.ts`),
//    so the saving this bullet claims is TWO STEPS SMALLER than the sentence that stood here.
//  · THREE TRANSITIONS, DECLARED ONCE PER COMPONENT at module load and taking the instance as their
//    first argument. NOTHING IS ALLOCATED PER INSTANCE FOR A DOOR, which is the whole point of the
//    form and the one thing that would make this row a wire wearing another name if it were spelled
//    otherwise.
//  · THIS ROW LOST ITS `exoTransition` WRAPPER, and it is recorded rather than hidden. A transition
//    is the COMPUTED system's door and is declared against a compiled program; an undecorated
//    `createExoMachine` has none, so `exoTransition(ROW, …)` no longer typechecks and the three bodies are
//    plain functions over the instance. AT RUN TIME NOTHING MOVED: `exoTransition.ts` returns
//    `apply` unchanged for a program with no compute and no body, and this component declares
//    neither — so what the wrapper handed back was always the author's own function. Every mention
//    of "the transition closure, `apply`, `settle`" in this row's accounting below is one call
//    fewer than it reads, and it was one call fewer before this edit too.
//  · THE PORTS ARE WRITTEN WITH `c.text(port, value)` — the instance's own write, two references
//    off the instance and the call the commit would have made.
//
// ═══ WHY THE TRANSITIONS TAKE `(k, row)` AND NOT THE FIELD VALUES ═══
//
// The three-field door needs THREE values and a transition has three declared arities — none, one
// and two arguments past the instance — with no rest parameter, deliberately (`exoTransition.ts`
// says why: `...args` would allocate an array on the one path the design exists to keep to a store
// and an OR). SO THE ROUND AND THE ROW ARRIVE AS TWO INTEGERS, WHICH IS `machine`'s OWN SPELLING —
// `writeFields` takes `(s, k, row)` and `wideCompiledDriver` calls `transition(states[i], k, i)`.
// This row's driver is that driver character for character, so the `wideAt` calls sit on the same
// side of the call as `machine`'s and the two rows differ by nothing the driver does.
//
// ═══ WHAT IT ALLOCATES PER INSTANCE — THREE, AND THE COUNT IS THE FINDING ═══
//
//   `machine`         ONE object AND a one-slot pending table. The port table, the schema's write
//               and `set` are references ON it.
//   `machine·imperative`  THREE: the instance object, the value table beside it — now ONE SLOT
//               LONG, because this component declares no field and that slot holds the cache — and
//               THE CACHED OBJECT ITSELF, twenty named properties. IT WAS TWO WHEN THE VALUES WERE
//               FIELDS, and this is the half of the cache that costs rather than saves: the field
//               form put its twenty values in the table the wire allocates anyway, where the cache
//               is that table plus an object. No `c.fillDoors()`
//               wrapper — the instance already holds the table and the write. No door closure — the
//               transitions are the COMPONENT's. No handler closure — this component declares no
//               `m.on` and the wide row has no event port. No disposer array — no effect is
//               declared, so the wire takes `fillExoMachineDerivations` and not the mount door.
//   `wire`      SIX: the closure CONTEXT the doors capture (twelve fields and the port handle at
//               this width), the `ExoDomPorts` from `c.fillDoors()`, THREE door closures, and the object
//               that carries them back to the driver. Its own `allocs` line counts five and names
//               the context as the one it does not count; six is that line plus the thing it names.
//
// AND ONE THING THIS ROW ALLOCATES THAT NEITHER NEIGHBOUR DOES, said rather than buried: ONE
// `TExoDomChild` CHILD PER ROW. A MACHINE HAS NO PROPS AT ALL — `TExoMachine` is a schema
// and a plan — so no starting state can travel with the row and `c.list`, which hands nothing back,
// cannot be used: there would be no instance to fire a transition at. This row therefore BUILDS
// each instance (`wireExoNode(c.createExoNode(M))`), drives it, and INSERTS it into a hand-held child list, and the child
// object is what that costs. The shell's own note prices the whole trade against `c.list`.
//
// WHAT NO LONGER COSTS ANYTHING PER ROW: the starting state. It is one transition declared once per
// component — `pack.seed` — where it used to be a closure per row. What it DOES, twenty property
// stores into the cached object and nineteen recorded port fills, still runs inside the mount clock
// where every other row's per-instance work runs.
//
// ═══ WHERE THE INITIAL PAINT COMES FROM, AND WHY IT IS `c.text` AND NOT A RAW SCHEMA WRITE ═══
//
// `machine` GETS IT FROM THE FILL: `fillExoMachineDerivations` runs every declared derivation once, in
// declaration order, through the enode's own `set`. THIS ROW DECLARES NONE, so that
// pass has nothing to run and the nineteen ports would stay as the prototype has them.
//
// SO THE `seed` TRANSITION PAINTS THE ROW, and it paints it through `c.text(...)` — the instance's
// own door, which is what every other row on this table paints through, so the mounted markup of
// all of them is produced by the same call. The wide gate's first stage is what would catch a
// mount-stage divergence from the floor.
//
// AND THE TRANSITION IS FIRED BEFORE THE INSERTION, which is the one ordering this row depends on:
// `wireExoNode(c.createExoNode(M))` ARMS a machine on the spot (`EXO_DOM_NODE_VOCABULARY.ts`'s `build` materialises a machine child
// rather than deferring it), so the instance the shell drives is a complete one whose element is
// simply not in the document yet. Every one of these nineteen writes therefore lands on a detached
// node, which is where the floor's do too.
//
// WHAT THE PAINT COSTS: nineteen `c.text` calls per row — THE SAME NINETEEN `wire`'s fill makes
// through the same door and the same nineteen `machine`'s fill makes through it. What this row does not
// pay at the mount is the fill's own shape: no compute call per port, no `ports[i]` load per
// compute, no store test, no clearing of a word nothing marked. What it DOES pay that neither
// neighbour pays is TWENTY PROPERTY STORES over the zeros the cache seeder just built — a keep is
// seeded by a function that CANNOT KNOW WHICH ROW IT IS, because a machine is handed no props at
// all, so the starting object is the same for every row and only a transition can make it this
// row's. That was twenty field `set`s before the values moved into the cache, and the same two-pass
// shape.
//
// ═══ WHAT THIS ROW CANNOT DO THAT `machine` CAN, STATED BEFORE THE NUMBER EXISTS ═══
//
// `machine`'s NINETEEN PORTS ARE DERIVATIONS OVER NAMED FIELDS. Anything holding an instance can write a
// field and every port that reads it moves, in one commit, in slot order, whether or not the writer
// has ever heard of derivation 18. THIS ROW HOLDS THE SAME RULES INSIDE THREE TRANSITION BODIES: a
// caller that writes `f2` directly moves NOTHING — the mark is zero, the commit returns, the screen
// keeps the old strings — and a FOURTH transition added later has to repeat the map or be silently
// wrong. THE CHAIN IS THE SHARPEST CASE. `machine` DECLARES it: derivation 0 stores field 18 and the
// commit picks up derivations 18 and 19 mid-walk, and derivation 19 — reached by `f12` directly AND
// through the chain — runs ONCE because the pending set is a set. This row runs the chain by hand
// and writes derivation 19 once because its author knew to, exactly as `wire` does. THAT IS THE
// CAPABILITY BEING TRADED, and it is the same trade one level down from `wire`'s — and MOVING THE
// STATE INTO THE CACHE DID NOT DEEPEN IT BY ONE INCH, which is the point of the move. A field of
// this component woke nothing before: every mark was zero, so a caller writing `f2` from outside
// the three transitions moved the value and NOT the screen. The cache says that in the type instead
// of leaving it to be discovered from a number, and the values stay named and stay reachable —
// `c.readState(K).f2` works from anywhere `F[2].get(c)` did.
//
// ═══ THE CONFOUND THAT WAS HERE, AND WHY IT IS NOW ONE TERM ═══
//
// `machine·imperative − machine` CARRIED TWO TERMS AND THIS FILE'S DISCIPLINE IS ONE. `machine` is
// the FLAT DESCRIPTION — `compileExoMachine` called by hand over a state object with
// twenty NAMED properties — and this row was the SHIPPED AUTHORING LAYER, the machine builder, whose
// instance kept its fields in a VALUE TABLE. So the subtraction carried (i) where the rules live
// AND (ii) where the state lives.
//
// THE SECOND TERM IS GONE SINCE THE VALUES MOVED INTO THE CACHE: both rows now hold twenty NAMED
// PROPERTIES of one object of the identical `TExoWideFields` shape, reached in `machine` off the
// state object and here off the cache. What is left in the subtraction is where the rules live,
// which is the one term the row exists to price. `machine·array` STAYS ON THE AXIS as the row that
// prices storage on its own — twenty fields in a flat array against twenty named properties, rules
// held fixed — and the verdict block still prints this row's gap to it, now as a comparison of two
// storage shapes rather than as the way to subtract a confound out of this one.
//
// ═══ THE PREDICTION, AND IT COMMITS TO NO DIRECTION AGAINST EITHER NEIGHBOUR ═══
//
// P23. `machine·imperative`, `machine` AND `wire` AT WIDTH: NO DIRECTION IS PREDICTED BETWEEN ANY PAIR OF THE
//      THREE. What is predicted is the SHAPE — that each pair is judged against ITS OWN FLOOR,
//      `max` of the two rows' nulls, and printed SEPARATED or UNRESOLVED, and that an UNRESOLVED
//      is an ANSWER. All
//      three mechanisms are real and they are not orderable by reading them. THIS ROW per woken
//      derivation: two property loads off the cached object, the compute call, and `c.text` — a
//      prototype method call, two field loads off the instance and the schema's write;
//      per update, ONE CALL AND ONE NULL TEST AROUND IT — `withExoTransitions` on a plain
//      `createExoMachine` wraps `apply` in one `transitionOverrides === null` test, so there is no `settle`
//      and no commit on this path at all — plus ONE `c.kept` (two loads) for the body, and one PROPERTY STORE
//      per value written, which is the whole of what the cache changed on this path and is the
//      write bullet above. `machine` pays a wrapper and then a real commit:
//      the effect-mask split, a bit scan per woken slot, a `computes` call, a `ports[i]` load, a
//      branch and a write. `wire` pays one closure call and `ExoDomPorts.set` — a method call, a
//      `port.index` load, a FILL-RECORD TEST, two array loads and the setter — and no bookkeeping
//      whatever. THREE SHORTER-PATH/DEARER-WRITE TRADES POINTING THREE WAYS, and this file will not
//      publish a guess about which is larger.
//
// AND NOTHING IS PREDICTED ABOUT THE MOUNT EITHER, in either direction: FOUR allocations against
// `machine`'s ONE and `wire`'s SIX is a count and not a time, and the twenty zero-seeded stores
// this row overwrites are real work no other row does. THE CACHE MOVED BOTH HALVES OF THAT MOUNT AT
// ONCE AND IN OPPOSITE DIRECTIONS — one more allocation per instance, and twenty eight-step field
// `set`s replaced by twenty property stores — which is the reason no direction is committed for
// this row's mount number now either.
//
// AND THE MOUNT NUMBER IS NOW THE ONE FIGURE ON THIS TABLE THAT IS NOT A LIKE-FOR-LIKE COMPARISON.
// Every other wide row is mounted by `c.list`; this one is built, filled and inserted a row at a
// time, because that is the only way a machine can be given a per-row starting state. TABLE 5 is
// therefore measuring TWO differences at once — the machine's own mount against its neighbours',
// and `wireExoNode(c.createExoNode(M))`+`insert` against `c.list` — and the shell's note is where the second one is priced.
// TABLES 6, 7 and 8 are untouched by it: they drive instances that are already standing.

/** What this row's transitions and its driver are all handed — the instance itself. */
type TExoWideDirectInstance = TExoDomNode;

/**
 * THE THREE TRANSITIONS OF ONE PACK — declared once per COMPONENT, taking the instance.
 *
 * The shape is `TExoWideCompiledOps`'s exactly, with the instance where `machine` has its state object, so
 * that the two drivers are the same three loops over the same three calls.
 */
interface TExoWideDirectOps {
    readonly one: (c: TExoWideDirectInstance, k: number, row: number) => void;
    readonly some: (c: TExoWideDirectInstance, k: number, row: number) => void;
    readonly none: (c: TExoWideDirectInstance, k: number, row: number) => void;
}

interface TExoWideDirectPack {
    /** The composed machine — a schema and a plan. There is no wire in this
     *  row's source and no props slot on its component. */
    readonly component: TExoMachine<TExoWideDirectInstance>;
    readonly ops: TExoWideDirectOps;
    /**
     * A FOURTH TRANSITION, and the one the SHELL fires: one row's starting state and its initial
     * paint, against an instance that has been built and not yet inserted.
     */
    readonly seed: (c: TExoWideDirectInstance, seed: TExoWideSeed) => void;
}

let WIDE_DIRECT_DATA: readonly TExoWideHandle<TExoWideDirectInstance>[] = [];

/**
 * WHICH ROW THE MACHINE BEING ARMED IS, AND WHY IT CANNOT BE ANYTHING BUT A COUNTER.
 *
 * A machine takes no props, so nothing can be handed to `wireExoNode(c.createExoNode(M))`, and its keep-seeder is the only
 * code that runs while the instance is being made. The seeder is what files the instance on this
 * row's handle — the shell then has something to fire transitions at — and the handle it files
 * against is this cursor's. The shell resets it before it builds anything, inside the timed region,
 * exactly as `door-count`'s list wrapper resets its own.
 */
let WIDE_DIRECT_NEXT = 0;

// THE AUTHOR'S MAP, CHECKED AT LOAD RATHER THAN ASSUMED. The three transition bodies below name
// their values as LITERALS — `s.f2`, which is what an author writes and what `wire`'s three doors
// write — so a change to a scene's field list would leave this row updating a value the floor no
// longer touches. The gate catches a map that is too SMALL (a stale port diverges byte for byte)
// and cannot catch one that is too LARGE; this catches the scene moving under both, at module load,
// untimed. It is the one thing this row has that `wire` does not, and it is a check rather than a
// declaration: nothing here says what the bodies DO with those values.
//
// AND IT NOW GUARDS THE CACHE'S SEEDER TOO. That seeder returns a literal of twenty named
// properties, so `WIDE_FIELDS !== 20` below is what stops the object and the scene drifting apart.
if (
    WIDE_ONE.join(',') !== '2' ||
    WIDE_SOME.join(',') !== '0,2,12' ||
    WIDE_UNREAD_FIELD !== 19 ||
    WIDE_CHAIN_FIELD !== 18 ||
    WIDE_FIELDS !== 20
) {
    refuse(
        'machine-vs-cells: the wide scenes moved under `machine·imperative`, whose three transition bodies ' +
            'name their cached values as literals and whose cache seeder is a literal of twenty ' +
            `named properties. They are written for one field \`f2\`, three fields ` +
            '`f0`/`f2`/`f12`, the unread field `f19` and the chain field `f18` of twenty — and the ' +
            `scenes now read \`${WIDE_ONE.join(',')}\`, \`${WIDE_SOME.join(
                ','
            )}\`, \`f${WIDE_UNREAD_FIELD}\`, \`f${WIDE_CHAIN_FIELD}\` of ${WIDE_FIELDS}. Rewrite ` +
            'the bodies, or this row is measured doing a different job from the floor.'
    );
}

/**
 * ONE PACK — its own schema, its own machine, its own compiled program and its own three
 * transitions, so that the twin below is a SECOND, SEPARATELY DECLARED participant in every part
 * and not a second name for one program.
 */
const makeWideDirectPack = (): TExoWideDirectPack => {
    // The ports are numbered when `createExoSchema` returns, before `createExoMachine` is handed the
    // schema.
    const schema = createExoSchema(buildWideRow);
    const out = schema.ports.out;

    const m = createExoMachine<TExoDomNode>(schema, {
        createInitialState: (c: TExoWideDirectInstance): TExoWideFields => {
            WIDE_DIRECT_DATA[WIDE_DIRECT_NEXT++].state = c;
            return {
                f0: 0,
                f1: 0,
                f2: 0,
                f3: 0,
                f4: 0,
                f5: 0,
                f6: 0,
                f7: 0,
                f8: 0,
                f9: 0,
                f10: 0,
                f11: 0,
                f12: 0,
                f13: 0,
                f14: 0,
                f15: 0,
                f16: 0,
                f17: 0,
                f18: 0,
                f19: 0,
            };
        },
    });

    /**
     * ONE ROW, AS A MACHINE THAT WRITES ITS OWN PORTS. No derivation, no fill, no effect — and no
     * FIELD either, so its instance's value table is one slot long and holds the cache.
     *
     * `withExoTransitions` returns a NEW machine and leaves `m` unchanged, so `ROW` is the machine
     * with the transitions and `m` is not.
     */
    const ROW = composeExoMachine(m, (m) =>
        withExoTransitions(m, {
            /**
             * THE TWENTY VALUES, IN THE CACHE — ONE SLOT, holding one object of this file's own
             * `TExoWideFields` shape, and NOT twenty `m.field`s.
             *
             * ═══ WHY A FIELD WAS THE WRONG ADDRESS FOR EVERY ONE OF THEM ═══
             *
             * A FIELD IS AN ADDRESS FOR WAKING. It takes a bit of the pending word against a thirty-one
             * ceiling, a row of the mark table, a place in `withExoComputedMachine`'s field→derivations inversion and a row
             * of the chain table, and every one of those exists so that WRITING it can wake a declaration.
             * THIS COMPONENT DECLARES NOTHING — no `m.derive`, no `m.fill`, no `m.effect` — so its values
             * are read by its own three transition bodies and by the seed, which is not a declaration and
             * wakes nothing. Twenty fields here buy twenty addresses for a wake that can never happen.
             *
             * NOT ONE VALUE STAYS A FIELD, AND THE ONE SHAPE THAT WOULD HAVE KEPT ONE IS ABSENT HERE. A
             * value named in the dependency list of a declaration the row legitimately keeps must stay a
             * field, because that list is what its bit and mark are for —
             * `apps/exodra/exodra.tsx`
             * keeps two region fields for exactly that reason, named by its teardown effect. This row
             * declares no effect (it has nothing to tear down: no reconciler owns a region here) and
             * therefore has no dependency list anywhere, so all twenty move and the machine declares ZERO
             * fields.
             *
             * ═══ WHAT THAT CHANGES IN WHAT IS MEASURED, AND IT POINTS BOTH WAYS ═══
             *
             * PER WRITE it removes five of six steps: `F[2].set(c, v)` was a store into the value table, a
             * `wakes` load, a null test, a `wakes[row]` load with its own null test, a
             * `marks[row]` load and an OR of zero; `s.f2 = v` is a named property store and nothing else.
             * THIS READ "seven of eight" AND COUNTED A BATCH-DEPTH LOAD AND A COMPARISON among them. The
             * shipped `set` (`exo-machine.ts`) makes neither — the module-global depth went with
             * `exoMachineBatch` — so the saving named here is TWO STEPS SMALLER than it was
             * written as, and no number on TABLES 5 TO 8 was ever charged for those two.
             * PER READ it is one property load off a local where `F[3].get(c)` was a call and two loads, and
             * the ONE `c.kept` call (two loads) is paid once per transition body rather than once
             * per read. PER INSTANCE IT COSTS ONE MORE ALLOCATION, and this is the half that points the
             * other way: the field form put its twenty values in the value table the wire allocates anyway,
             * where the cache is one slot of that table PLUS the object this seeder returns. NO DIRECTION IS
             * PREDICTED FOR THE ROW'S NUMBER on any table; the mount is where both effects are largest at
             * once (twenty seed writes against one more allocation) and it is the table to read first.
             *
             * AND IT REMOVES ONE OF THE TWO TERMS IN `machine·imperative ↔ machine`. That subtraction
             * carried (i) where the rules live and (ii) where the state lives — a VALUE TABLE against
             * `machine`'s twenty NAMED PROPERTIES. Both rows now hold their values as twenty named
             * properties of one object of the identical `TExoWideFields` shape, so the second term is gone
             * and what is left between them is where the rules live. `machine·array` stays on the axis as
             * the row that prices the storage question on its own.
             *
             * THE SEEDER CANNOT KNOW WHICH ROW IT IS — a machine takes no props — so it returns the twenty
             * at zero and the `seed` transition below writes this row's values into the object it made.
             * That is the same two-pass shape the field form had (twenty declared defaults built with the
             * value table, then twenty seed writes over them), moved from the table into the object.
             *
             * AND IT FILES THE INSTANCE ON THIS ROW'S HANDLE, which is the one line that makes the row
             * drivable at all. `wireExoNode(c.createExoNode(M))` hands back a CHILD, not an exonode; the seeder is handed the
             * exonode itself, and the cursor says which row is being armed. One property store per row,
             * which is the same one every other participant makes inside its mount.
             */

            /**
             * TABLE 6 — `f2`, which three derivations read and no chain touches.
             *
             * THE CACHE IS TAKEN ONCE AND READ AS PROPERTIES, which is what a cache IS: `c.kept`
             * is two loads and a call, paid once for the body, and every read after it is a named property
             * load. THAT IS NOT A SHORTCUT `machine` IS DENIED — `machine`'s compute is handed its two
             * values off its own state object through `WIDE_READ_FIELD`, which is the identical shape. What
             * the field form paid instead was a `get` CALL and two loads per read, and that was the cost of
             * an address these values never used.
             */

            one: (c: TExoWideDirectInstance, k: number, row: number): void => {
                const s = c.readState<TExoWideFields>();
                s.f2 = wideAt(k, row, 2);
                c.text(out[0], WIDE_FROM_VALUES[1](s.f2, s.f3));
                c.text(out[1], WIDE_FROM_VALUES[2](s.f2, s.f4));
                c.text(out[2], WIDE_FROM_VALUES[3](s.f2, s.f5));
            },
            /**
             * TABLE 7 — `f0`, `f2` and `f12` as ONE change, eight ports each written ONCE, in ascending
             * derivation order.
             *
             * THE CHAIN IS RUN BY HAND AND ONCE, and derivation 19 — reached by `f12` directly AND through
             * field 18 — is written once BECAUSE ITS AUTHOR KNEW TO. `machine` gets both of those from the pending
             * set; this row gets them from him, and nothing in this file checks that he was right except a
             * gate that can only see a write that is MISSING.
             */

            some: (c: TExoWideDirectInstance, k: number, row: number): void => {
                const s = c.readState<TExoWideFields>();
                s.f0 = wideAt(k, row, 0);
                s.f2 = wideAt(k, row, 2);
                s.f12 = wideAt(k, row, 12);
                s.f18 = wideSummary(s.f0, s.f1);
                c.text(out[0], WIDE_FROM_VALUES[1](s.f2, s.f3));
                c.text(out[1], WIDE_FROM_VALUES[2](s.f2, s.f4));
                c.text(out[2], WIDE_FROM_VALUES[3](s.f2, s.f5));
                c.text(out[9], WIDE_FROM_VALUES[10](s.f11, s.f12));
                c.text(out[10], WIDE_FROM_VALUES[11](s.f12, s.f13));
                c.text(out[15], WIDE_FROM_VALUES[16](s.f17, s.f0));
                c.text(out[17], WIDE_FROM_VALUES[18](s.f18, s.f5));
                c.text(out[18], WIDE_FROM_VALUES[19](s.f12, s.f18));
            },
            /**
             * TABLE 8 — the value nothing reads. ONE PROPERTY STORE AND NOTHING ELSE WHATEVER: this
             * transition is declared on a plain `createExoMachine`, which compiles no program; `withExoTransitions`
             * adds one `transitionOverrides === null` test in front of `apply`, so there is no settle to run and no pending word to clear — this component
             * declares no field at all, at this width and at any other.
             *
             * IT NEEDS NO GUARDED READ, AND THE REASON MOVED WITH THE STATE. `wire`'s TABLE 8 door had to be
             * read from another door, because a closure variable nothing reads is one an engine may drop
             * ALONG WITH ITS STORE. This store lands in a property of an object the instance's value table
             * holds for the life of the row and that two other transition bodies read, so it cannot be
             * dropped and the store measured here is a store.
             */

            none: (c: TExoWideDirectInstance, k: number, row: number): void => {
                c.readState<TExoWideFields>().f19 = wideAt(k, row, 19);
            },
            /**
             * ONE ROW'S STARTING STATE AND ITS INITIAL PAINT — A FOURTH TRANSITION, fired by the shell
             * against an instance it has built and not yet inserted. This row has no derivation pass to
             * paint it; see WHERE THE INITIAL PAINT COMES FROM above.
             *
             * IT IS A TRANSITION AND NOT A SEED, AND THAT IS THE WHOLE OF HOW A MACHINE IS STARTED NOW. A
             * machine takes no props: `create → fire transitions by hand → insert by hand` is the shape,
             * and this is its first step. The instance it is handed came off the handle its keep-seeder
             * filed it on.
             */

            seed: (c: TExoWideDirectInstance, s: TExoWideSeed): void => {
                // VALUES 0..17 STRAIGHT OFF THE SEED, then the CHAIN'S from `wideSummary` and not
                // from `s[18]`, so this row starts SETTLED and its mount agrees with the floor's —
                // exactly what `wideFieldsOf` does for the object rows and the wire does for its
                // twenty closure variables. `s[18]` is read by nobody, here or anywhere else.
                //
                // WRITTEN OUT RATHER THAN LOOPED, AND THAT IS A CHANGE TO WHAT THIS ROW'S MOUNT COSTS,
                // said rather than glossed. The field form wrote `for (let f = 0; f < 18; f++)
                // F[f].set(c, s[f])` — eighteen indexed handle loads and eighteen `set` calls. Named
                // properties cannot be indexed, so these are eighteen straight-line stores, which is
                // CHEAPER, and any recording of TABLE 5 taken before this edit is measuring a mount
                // this row no longer performs. It is the same straight line `wideFieldsOf` builds for
                // every object row, which is what makes the two comparable at all.
                const mem = c.readState<TExoWideFields>();
                mem.f0 = s[0];
                mem.f1 = s[1];
                mem.f2 = s[2];
                mem.f3 = s[3];
                mem.f4 = s[4];
                mem.f5 = s[5];
                mem.f6 = s[6];
                mem.f7 = s[7];
                mem.f8 = s[8];
                mem.f9 = s[9];
                mem.f10 = s[10];
                mem.f11 = s[11];
                mem.f12 = s[12];
                mem.f13 = s[13];
                mem.f14 = s[14];
                mem.f15 = s[15];
                mem.f16 = s[16];
                mem.f17 = s[17];
                const f18 = wideSummary(s[0], s[1]);
                mem.f18 = f18;
                mem.f19 = s[WIDE_UNREAD_FIELD];

                // THE NINETEEN PORTS, THROUGH THE INSTANCE'S OWN DOOR. There is no second
                // door to reach for, and none is needed: this transition and the three above write
                // through the same exonode, before the insertion and long after it alike.
                c.text(out[0], WIDE_FROM_VALUES[1](s[2], s[3]));
                c.text(out[1], WIDE_FROM_VALUES[2](s[2], s[4]));
                c.text(out[2], WIDE_FROM_VALUES[3](s[2], s[5]));
                c.text(out[3], WIDE_FROM_VALUES[4](s[3], s[6]));
                c.text(out[4], WIDE_FROM_VALUES[5](s[6], s[7]));
                c.text(out[5], WIDE_FROM_VALUES[6](s[7], s[8]));
                c.text(out[6], WIDE_FROM_VALUES[7](s[8], s[9]));
                c.text(out[7], WIDE_FROM_VALUES[8](s[9], s[10]));
                c.text(out[8], WIDE_FROM_VALUES[9](s[10], s[11]));
                c.text(out[9], WIDE_FROM_VALUES[10](s[11], s[12]));
                c.text(out[10], WIDE_FROM_VALUES[11](s[12], s[13]));
                c.text(out[11], WIDE_FROM_VALUES[12](s[13], s[14]));
                c.text(out[12], WIDE_FROM_VALUES[13](s[14], s[15]));
                c.text(out[13], WIDE_FROM_VALUES[14](s[15], s[16]));
                c.text(out[14], WIDE_FROM_VALUES[15](s[16], s[17]));
                c.text(out[15], WIDE_FROM_VALUES[16](s[17], s[0]));
                c.text(out[16], WIDE_FROM_VALUES[17](s[1], s[4]));
                c.text(out[17], WIDE_FROM_VALUES[18](f18, s[5]));
                c.text(out[18], WIDE_FROM_VALUES[19](s[12], f18));
            },
        })
    );
    const { one, some, none, seed } = ROW.transitions;

    return { component: ROW, ops: { one, some, none }, seed };
};

/**
 * THE ONLY SHELL ON THIS AXIS THAT DOES NOT CALL `c.list`, AND THE DIFFERENCE IS REAL WORK — said
 * here rather than left for a reader to find in the timings.
 *
 * `c.list` mounts a row straight into the parent: one `mountExoInstance` per row and nothing else.
 * A MACHINE CANNOT GO IN ONE. A fixed list hands nothing back, so there would be no instance to
 * fire `pack.seed` at and every row would stand at the starting state its keeps declare — which is
 * why `TExoDomNodeApi.list` takes the wired arm alone, and the refusal is deliberate rather than an
 * oversight. So this row spells the three steps a machine is made by:
 *
 *     const built = wireExoNode(c.createExoNode(pack.component));   // created and ARMED, placed nowhere
 *     pack.seed(handle.state, handle.seed);    // its starting state, by hand
 *     region.insert(built);                    // inserted, by hand
 *
 * WHAT IT COSTS AGAINST ITS NEIGHBOURS, per row: a `TExoDomChild` child object and
 * `buildLiveExoChild` where `c.list` had one `mountExoInstance`, the region's `order` push and
 * anchor resolution, and `dom.mount()`. Per SHELL it also costs the `ExoChildList` itself, its
 * order array, and the teardown closure below. NONE OF THAT IS ON THE UPDATE PATH — TABLES 6, 7
 * and 8 are transitions against instances that are already standing — so it moves the MOUNT number
 * of this row and only that one. TABLE 5 is where it is, and this row's mount is not comparable to
 * a `c.list` row's without reading this block.
 *
 * THE TEARDOWN IS OURS BECAUSE A REGION HAS NO OWNER. `c.list` files every row with the parent's
 * teardown scope; a child list written directly files nothing, so without the `onTeardown` below the 200
 * instances of every mount would never be unmounted — the row would do LESS than the rows beside
 * it and the suite would climb through its reps holding them all. `apps/exodra/exodra.tsx`
 * says the same thing about the same mechanism.
 */
const makeWideDirectShell = (pack: TExoWideDirectPack): TExoDomMachine => {
    const MACHINE_SCHEMA21 = createExoSchema(buildWideShell);
    const mMachine21 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA21, {
        createInitialState: (c) => {
            const data = WIDE_DIRECT_DATA;
            const region = (c as TExoDomNode & TExoDomPortChildList).portChildList(
                MACHINE_SCHEMA21.ports.rows
            );
            // BEFORE THE FIRST BUILD, inside the timed region: the keep-seeder of every row
            // about to be armed reads this cursor, and a render that did not reset it would
            // file its instances past the end of the handle array.
            WIDE_DIRECT_NEXT = 0;
            for (let i = 0; i < data.length; i++) {
                const built = wireExoNode(c.createExoNode(pack.component));
                const handle = data[i];
                const enode = handle.state;
                if (enode === null) {
                    refuse(
                        'machine-vs-cells: machine·imperative built a row whose keep-seeder ' +
                            `did not file it on handle ${i}. Its starting state could not be ` +
                            'set, so this row would mount nineteen empty ports.'
                    );
                }
                pack.seed(enode, handle.seed);
                region.insert(built);
            }
            c.onTeardown((): void => {
                for (let k = region.size - 1; k >= 0; k--) exoNodeDom(region.at(k)!).unmount();
            });
        },
    });
    return mMachine21;
};

const WIDE_PACK_DIRECT = makeWideDirectPack();
const WIDE_SHELL_DIRECT = makeWideDirectShell(WIDE_PACK_DIRECT);
/** THE SEVENTH WIDE NULL — its own schema, its own machine, its own program. True Δ: ZERO. */
const WIDE_PACK_DIRECT_TWIN = makeWideDirectPack();
const WIDE_SHELL_DIRECT_TWIN = makeWideDirectShell(WIDE_PACK_DIRECT_TWIN);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE DRIVERS — one per form, each assembled UNTIMED after its mount
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// EVERY DRIVER COMPUTES ITS ROUND'S VALUES THE SAME WAY, from `k` and the tag's index, so that every
// participant is handed the identical sequence and the markup gate can be a gate. The index
// arithmetic (`(k + i) & NAME_MASK`) is one add and one AND, charged to all five rows identically.

// ROUND 0 IS OFFSET FROM THE SEED ON PURPOSE, AND IT IS NOT A DETAIL. The seed of tag `i` is
// `NAMES[i & NAME_MASK]` and `open = (i & 1) === 0`, so a driver that computed round 0 as `(0 + i)`
// would write EVERY TAG THE VALUE IT ALREADY HOLDS. The `+ 1` and the flipped parity below make round 0 differ from
// the seed for every field, so every round of every table is a real change for every participant.
const nameAt = (k: number, i: number): string => NAMES[(k + i + 1) & NAME_MASK];
const openAt = (k: number, i: number): boolean => ((k + i) & 1) === 1;
const widthAt = (k: number, i: number): number => WIDTHS[(k + i + 1) & WIDTH_MASK];
const noteAt = (k: number, i: number): number => k + i + 1;

function machineDriver(machines: readonly TExoBenchMachine<TExoTagState>[]): TExoTagDriver {
    return {
        names: (k) => {
            for (let i = 0; i < machines.length; i++) {
                const m = machines[i];
                setName(m, nameAt(k, i));
                exoCommit(m);
            }
        },
        nameAndOpen: (k) => {
            for (let i = 0; i < machines.length; i++) {
                const m = machines[i];
                // TWO TRANSITIONS, ONE COMMIT — the transaction. Both bits land in `touched` and
                // `label` runs ONCE.
                setName(m, nameAt(k, i));
                setOpen(m, openAt(k, i));
                exoCommit(m);
            }
        },
        widths: (k) => {
            for (let i = 0; i < machines.length; i++) {
                const m = machines[i];
                setWidth(m, widthAt(k, i));
                exoCommit(m);
            }
        },
        notes: (k) => {
            for (let i = 0; i < machines.length; i++) {
                const m = machines[i];
                setNote(m, noteAt(k, i));
                exoCommit(m);
            }
        },
    };
}

/**
 * FORM C's DRIVER — one transition per scene, and the transition commits.
 *
 * There is no `exoCommit` line here and there is nowhere to put one: a transition declared with
 * `exoTransition` ends in its own commit. That is one call per tag where form B's driver
 * makes two (or three, on TABLE 3), and the work behind them is the same work.
 */
function compiledDriver(states: readonly TExoCompiledState[], ops: TExoCompiledOps): TExoTagDriver {
    return {
        names: (k) => {
            for (let i = 0; i < states.length; i++) ops.setName(states[i], nameAt(k, i));
        },
        nameAndOpen: (k) => {
            for (let i = 0; i < states.length; i++) {
                // TWO FIELDS, ONE TRANSITION, ONE COMMIT — both marks are `label`'s bit, so the
                // pending set holds one bit and `label` runs once.
                ops.setNameAndOpen(states[i], nameAt(k, i), openAt(k, i));
            }
        },
        widths: (k) => {
            for (let i = 0; i < states.length; i++) ops.setWidth(states[i], widthAt(k, i));
        },
        notes: (k) => {
            for (let i = 0; i < states.length; i++) ops.setNote(states[i], noteAt(k, i));
        },
    };
}

/**
 * THE TABLE VARIANTS' DRIVER — `compiledDriver`'s four loops, over a table-backed state.
 *
 * IT IS A SEPARATE FUNCTION ONLY BECAUSE THE STATE TYPE DIFFERS. Every line is `compiledDriver`'s:
 * the same `nameAt`/`openAt`/`widthAt`/`noteAt` arithmetic, computed in the driver and handed to
 * the transition as arguments, so that `machine`, `machine·array` and `machine·nodes` are called identically and the only
 * thing between them is where the transition puts the value.
 */
function tableDriver(states: readonly TExoStateTableState[], ops: TExoTableOps): TExoTagDriver {
    return {
        names: (k) => {
            for (let i = 0; i < states.length; i++) ops.setName(states[i], nameAt(k, i));
        },
        nameAndOpen: (k) => {
            for (let i = 0; i < states.length; i++) {
                ops.setNameAndOpen(states[i], nameAt(k, i), openAt(k, i));
            }
        },
        widths: (k) => {
            for (let i = 0; i < states.length; i++) ops.setWidth(states[i], widthAt(k, i));
        },
        notes: (k) => {
            for (let i = 0; i < states.length; i++) ops.setNote(states[i], noteAt(k, i));
        },
    };
}

// ═══ THERE IS NO `machineBatchedDriver`, AND ITS ABSENCE IS A MEASUREMENT THIS AXIS NO LONGER MAKES
//
// A DRIVER STOOD HERE that wrapped each of the four scenes in one `exoMachineBatch` — a
// MODULE-GLOBAL depth that every transition and every field `set` loaded and compared, so that one
// call could defer the commits of ALL TAGS tags and drain them at the end. It fed the row
// `machine·batch`, the only row on this axis that priced
// coalescing on the machine side. THAT FUNCTION NO LONGER EXISTS IN `@exodra/core` and neither does
// the depth: a transition applies and settles with nothing in between, and batching moved to
// `enode.hold(of, body)` — a door over ONE NAMED INSTANCE, holding the `apply` BODIES
// a transition is declared from.
//
// A HOLD WAS NOT SUBSTITUTED FOR IT, AND THE REASON IS THIS FILE'S OWN DRIVERS. `compiledDriver`
// above and `wideCompiledDriver` below make EXACTLY ONE transition call per instance per scene —
// `setNameAndOpen` writes two fields in one transition and is therefore already one commit, and
// `ops.some` writes three the same way. A per-instance hold around a single transition coalesces
// NOTHING; it would add an `indexOf`, a push, a pop, two chain stores and a second commit call to a
// path that already commits once, and this file would then print that overhead in a column captioned
// «batch». So the row came out rather than being converted.
//
// WHAT THAT COSTS THE AXIS, SAID PLAINLY: THE PRICE OF COALESCING ON THE MACHINE SIDE IS NOW
// UNMEASURED HERE — not zero, not small, UNMEASURED. Measuring a hold needs a scene this axis does not contain: two SEPARATE transitions
// landing on the SAME instance in one round, which is the only shape a hold has anything to collapse.
// Building that scene is a change to what every one of these drivers does and is not made here.

/** FORM C WRITTEN THE DOM'S OWN WAY — the same transitions, resolved writers instead of ports. */
function directDriver(states: readonly TExoDirectState[]): TExoTagDriver {
    return {
        names: (k) => {
            for (let i = 0; i < states.length; i++) directSetName(states[i], nameAt(k, i));
        },
        nameAndOpen: (k) => {
            for (let i = 0; i < states.length; i++) {
                directSetNameAndOpen(states[i], nameAt(k, i), openAt(k, i));
            }
        },
        widths: (k) => {
            for (let i = 0; i < states.length; i++) directSetWidth(states[i], widthAt(k, i));
        },
        notes: (k) => {
            for (let i = 0; i < states.length; i++) directSetNote(states[i], noteAt(k, i));
        },
    };
}

// `boundDriver` STOOD HERE — `directDriver`'s four loops over a writer-holding state, with the four
// transitions hoisted into locals so that its per-tag call matched `machine·copy`'s shape and the
// only thing left between the two rows was the write. It is struck with `machine·bound`, whose
// library feature (`c.portWriter`) was deleted.

function nativeDriver(states: readonly TExoNativeState[]): TExoTagDriver {
    return {
        names: (k) => {
            for (let i = 0; i < states.length; i++) {
                const s = states[i];
                const name = nameAt(k, i);
                s.name = name;
                s.labelText.data = labelOf(name, s.open);
            }
        },
        nameAndOpen: (k) => {
            for (let i = 0; i < states.length; i++) {
                const s = states[i];
                const name = nameAt(k, i);
                const open = openAt(k, i);
                s.name = name;
                s.open = open;
                s.labelText.data = labelOf(name, open);
            }
        },
        widths: (k) => {
            for (let i = 0; i < states.length; i++) {
                const s = states[i];
                const width = widthAt(k, i);
                s.width = width;
                s.sizeText.data = sizeOf(width);
            }
        },
        notes: (k) => {
            for (let i = 0; i < states.length; i++) states[i].note = noteAt(k, i);
        },
    };
}

/**
 * THE WIRE'S DRIVER — `compiledDriver`'s four loops over doors that are PER INSTANCE.
 *
 * IT IS A SEPARATE FUNCTION BECAUSE A WIRE'S HANDLER CLOSES OVER THE TAG IT WAS MADE IN. There is
 * no shared ops object to hand a state to, so the call takes the value alone and the object it is
 * loaded out of is this instance's own.
 *
 * THE LOADS PER TAG ARE THE SAME COUNT AS `machine`'S, and that is worth saying rather than assuming.
 * `compiledDriver` does one array load (`states[i]`) and one property load out of ONE shared ops
 * object; this does one array load (`ops[i]`) and one property load out of THIS instance's ops
 * object. Every ops object here is built by the same literal, so the property load is monomorphic
 * in both rows. What differs between the two rows is on the other side of the call and nowhere
 * here.
 */
function wireDriver(ops: readonly TExoWireOps[]): TExoTagDriver {
    return {
        names: (k) => {
            for (let i = 0; i < ops.length; i++) ops[i].setName(nameAt(k, i));
        },
        nameAndOpen: (k) => {
            for (let i = 0; i < ops.length; i++) {
                // TWO FIELDS, ONE WRITE — the wire's handler writes `label` once because its
                // author wrote it that way. Nothing checks that he did.
                ops[i].setNameAndOpen(nameAt(k, i), openAt(k, i));
            }
        },
        widths: (k) => {
            for (let i = 0; i < ops.length; i++) ops[i].setWidth(widthAt(k, i));
        },
        notes: (k) => {
            for (let i = 0; i < ops.length; i++) ops[i].setNote(noteAt(k, i));
        },
    };
}

/** Pull the per-instance state off the handles into a dense array. UNTIMED, after every mount. */
function statesOf<THandle, TState>(
    handles: readonly THandle[],
    read: (handle: THandle) => TState | null,
    who: string
): TState[] {
    const out: TState[] = new Array<TState>(handles.length);
    for (let i = 0; i < handles.length; i++) {
        const got = read(handles[i]);
        if (got === null) {
            refuse(
                `machine-vs-cells: ${who} mounted ${handles.length} tags and tag ${i} wrote no ` +
                    'state back onto its handle. Its wire did not run, so this participant has ' +
                    'nothing to drive and every number it would print would be a measurement of ' +
                    'an empty loop.'
            );
        }
        out[i] = got;
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════════════════════

const handlesOf = <THandle>(make: (seed: TExoTagSeed) => THandle): readonly THandle[] =>
    SEEDS.map(make);

const NATIVE: TExoProgram = {
    name: 'floor',
    what: 'THE FLOOR — a program with NO LIBRARY. It clones the subtree by hand, keeps its two Text nodes in named fields, holds its four state fields as plain properties, writes `.data` directly and attaches its own listener. No declaration, no schema, no port, no connector, no source.',
    allocs: '1 state record + 1 click closure',
    prepare: () => {
        const handles = handlesOf<TExoNativeHandle>((seed) => ({ seed, state: null }));
        return (parent) => {
            const host = document.createElement('div');
            host.className = 'tags';
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                const seed = handle.seed;
                const tag = TAG_PROTO.cloneNode(true) as HTMLElement;
                const btn = tag.firstChild as HTMLElement;
                const labelText = btn.firstChild as Text;
                const sizeText = (tag.lastChild as Node).firstChild as Text;
                labelText.data = labelOf(seed.name, seed.open);
                sizeText.data = sizeOf(seed.width);
                const state: TExoNativeState = {
                    name: seed.name,
                    open: seed.open,
                    width: seed.width,
                    note: 0,
                    labelText,
                    sizeText,
                };
                handle.state = state;
                btn.addEventListener('click', () => {
                    const next = state.open === true ? false : true;
                    state.open = next;
                    state.labelText.data = labelOf(state.name, next);
                });
                host.appendChild(tag);
            }
            parent.appendChild(host);
            return {
                driver: () =>
                    nativeDriver(
                        statesOf<TExoNativeHandle, TExoNativeState>(
                            handles,
                            (h) => h.state,
                            'floor'
                        )
                    ),
                off: () => {
                    host.remove();
                },
            };
        };
    },
};

const machineProgram = (name: string, what: string, shell: TExoDomMachine): TExoProgram => ({
    name,
    what,
    allocs: '1 state + 1 machine object + 1 c.fillDoors() wrapper + 1 click closure',
    prepare: () => {
        const handles = handlesOf<TExoMachineHandle>((seed) => ({ seed, machine: null }));
        return (parent) => {
            MACHINE_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () =>
                    machineDriver(
                        statesOf<TExoMachineHandle, TExoBenchMachine<TExoTagState>>(
                            handles,
                            (h) => h.machine,
                            name
                        )
                    ),
                off,
            };
        };
    },
});

const compiledProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine,
    ops: TExoCompiledOps
): TExoProgram => ({
    name,
    what,
    allocs:
        '1 state object + 1 one-slot pending table + 1 click closure — the port table, the ' +
        'schema`s write and `set` are references on the state',
    prepare: () => {
        const handles = handlesOf<TExoCompiledHandle>((seed) => ({ seed, state: null }));
        return (parent) => {
            COMPILED_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () =>
                    compiledDriver(
                        statesOf<TExoCompiledHandle, TExoCompiledState>(
                            handles,
                            (h) => h.state,
                            name
                        ),
                        ops
                    ),
                off,
            };
        };
    },
});

const directProgram = (name: string, what: string): TExoProgram => ({
    name,
    what,
    allocs:
        '1 state object + 1 click closure — one FEWER than `machine`, which holds a pending ' +
        'table this row keeps as a named field',
    prepare: () => {
        const handles = handlesOf<TExoDirectHandle>((seed) => ({ seed, state: null }));
        return (parent) => {
            DIRECT_DATA = handles;
            const off = EXO_BACKEND.render(SHELL_C_DIRECT, parent);
            return {
                driver: () =>
                    directDriver(
                        statesOf<TExoDirectHandle, TExoDirectState>(handles, (h) => h.state, name)
                    ),
                off,
            };
        };
    },
});

// `boundProgram` STOOD HERE — the bound-writer participant, `directProgram` with the pack's
// transitions carried in and one allocation line of its own: `1 state object + 1 array of 2 + 2
// BOUND PORT WRITERS (one closure per WRITTEN PORT) + 1 click closure`, FOUR allocations beside the
// click where `machine` and `machine·copy` make one. It is struck with its row, and with it goes the
// only place on this axis where a participant's per-instance allocation grew with its PORT COUNT.

/**
 * THE WIRE PARTICIPANT — and its allocation line is the whole of its mount-side story.
 *
 * SEVEN PER INSTANCE AGAINST `machine`'S TWO, and the shape of that number matters more than its size: a
 * machine declares its transitions ONCE PER COMPONENT and hands them the instance, so a component
 * the world may push through four doors costs the same per instance as one it may push through
 * none. A WIRE'S DOOR IS A CLOSURE OVER THIS INSTANCE, so the count grows with the doors. Four is
 * this axis's number because this axis drives four scenes.
 */
const wireProgram = (name: string, what: string, shell: TExoDomMachine): TExoProgram => ({
    name,
    what,
    allocs:
        '1 c.fillDoors() wrapper + 4 handler closures + 1 object carrying them back to the driver + 1 ' +
        'click closure — SEVEN, against `machine`s state object and click. A machine`s per-instance cost ' +
        'does not grow with the number of doors the world may push through and a wire`s does.',
    prepare: () => {
        const handles = handlesOf<TExoWireHandle>((seed) => ({ seed, ops: null }));
        return (parent) => {
            WIRE_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () =>
                    wireDriver(statesOf<TExoWireHandle, TExoWireOps>(handles, (h) => h.ops, name)),
                off,
            };
        };
    },
});

/**
 * A TABLE-BACKED PARTICIPANT — variant 2 or variant 3, told apart by the pack it was given.
 *
 * THE ALLOCATION LINE IS READ OFF THE PACK and not written per row, so the mount tables cannot
 * print a caption that disagrees with which variant is standing there.
 */
const tableProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine,
    pack: TExoTagTablePack
): TExoProgram => ({
    name,
    what,
    allocs: pack.shared
        ? '1 state object + 1 click closure — the four values AND the pending word are APPENDED ' +
          'onto the node table this instance was allocated anyway, so nothing is allocated for them'
        : '1 state object + 1 array of 5 (4 values + the pending word) + 1 click closure — TWO ' +
          'allocations, which is this variant`s whole price at the mount',
    prepare: () => {
        const handles = handlesOf<TExoTableHandle>((seed) => ({ seed, state: null }));
        return (parent) => {
            if (pack.shared) {
                TABLE_SHARED_DATA = handles;
            } else {
                TABLE_OWN_DATA = handles;
            }
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () =>
                    tableDriver(
                        statesOf<TExoTableHandle, TExoStateTableState>(
                            handles,
                            (h) => h.state,
                            name
                        ),
                        pack.ops()
                    ),
                off,
            };
        };
    },
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE WIDE PROGRAMS — the same five forms on the twenty-derivation component
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// EVERY DRIVER IS HANDED THE SAME PRECOMPUTED WOKEN LIST and computes its round's values from `k`
// and the row index the same way, so the markup gate can be a gate. `machine·copy` AND
// `machine·write` HAVE NO WIDE ROW: both ask about ONE write and are priced on the narrow tables;
// repeating them here would add four participants and answer nothing new.
//
// A THIRD NAME STOOD ON THAT LIST WITH AN UNMEASURED CONSEQUENCE BESIDE IT, AND BOTH ARE STRUCK.
// `machine·bound` took one closure PER WRITTEN PORT, so a component driving nineteen would have
// allocated nineteen of them per instance where `machine` allocates nothing extra, and TABLE 1 with
// two ports said nothing whatever about that. The row and its feature are both deleted, so the gap
// is no longer unmeasured — there is nothing left to measure.
//
// `wire` WAS THE FOURTH NAME ON THAT LIST AND IS NO LONGER. This block used to call it the sharper
// omission and predict that a wide wire would allocate "twenty closures and an object to carry
// them"; `THE WIRE AT WIDTH` above is the row that answers it, and it answers half of that
// sentence differently. A WIRE'S PER-INSTANCE COUNT TRACKS DOORS AND NOT FIELDS — three here,
// because this axis drives three scenes — so the twenty is what a row PUSHED FIELD BY FIELD would
// allocate and not what width alone costs. What the prediction had right is the other half: the
// UPDATE PATH is written out by hand, the author's copy of `WIDE_READS` is what says which ports a
// changed field feeds, and TABLES 5 TO 8 now price that against the machine that reads it off an
// inverted table.

const wideHandlesOf = <TState>(): TExoWideHandle<TState>[] =>
    WIDE_SEEDS.map((seed, row) => ({ seed, row, state: null }));

/** Pull each row's state off its handle. UNTIMED, after every mount. */
const wideStatesOf = <TState>(handles: readonly TExoWideHandle<TState>[], who: string): TState[] =>
    statesOf<TExoWideHandle<TState>, TState>(handles, (h) => h.state, who);

function wideMachineDriver(
    machines: readonly TExoBenchMachine<TExoWideMachineState>[]
): TExoWideDriver {
    const run =
        (fields: readonly number[]) =>
        (k: number): void => {
            for (let i = 0; i < machines.length; i++) {
                const m = machines[i];
                const s = m.state;
                for (let j = 0; j < fields.length; j++) {
                    const f = fields[j];
                    WIDE_WRITE_FIELD[f](s, wideAt(k, i, f));
                    m.touched |= WIDE_FIELD_MASKS[f];
                }
                // ONE COMMIT FOR THE WHOLE TRANSACTION — and it scans all nineteen declared
                // derivations, whatever the transaction woke.
                exoCommit(m);
            }
        };
    return { one: run(WIDE_ONE), some: run(WIDE_SOME), none: run(WIDE_NONE) };
}

function wideCompiledDriver(
    states: readonly TExoWideCompiledState[],
    ops: TExoWideCompiledOps
): TExoWideDriver {
    const run =
        (transition: (s: TExoWideCompiledState, k: number, row: number) => void) =>
        (k: number): void => {
            for (let i = 0; i < states.length; i++) transition(states[i], k, i);
        };
    return { one: run(ops.one), some: run(ops.some), none: run(ops.none) };
}

/** `wideCompiledDriver` over a table-backed state — the same three loops, the same three calls. */
function wideTableDriver(
    states: readonly TExoStateTableState[],
    ops: TExoWideTableOps
): TExoWideDriver {
    const run =
        (transition: (s: TExoStateTableState, k: number, row: number) => void) =>
        (k: number): void => {
            for (let i = 0; i < states.length; i++) transition(states[i], k, i);
        };
    return { one: run(ops.one), some: run(ops.some), none: run(ops.none) };
}

/**
 * THE WIDE WIRE'S DRIVER — three loops over doors that are PER INSTANCE.
 *
 * IT IS A SEPARATE FUNCTION FOR THE REASON THE NARROW ONE IS: a wire's door closes over the row it
 * was made in, so there is no shared ops object to hand a state to, and the call takes the values
 * alone out of THIS instance's own ops object.
 *
 * THE `wideAt` CALLS ARE ON THIS SIDE, WHERE EVERY OTHER PARTICIPANT'S ARE. `wideCompiledDriver`
 * makes one call per row and the transition inside it calls `wideAt` once per field written; this
 * makes the same `wideAt` calls in the caller and then one call per row. The count is equal and the
 * difference is which side of the call they sit on, which is worth saying rather than assuming.
 *
 * THE FIELD NUMBERS ARE READ OUT OF `WIDE_ONE`, `WIDE_SOME` AND `WIDE_UNREAD_FIELD` and not written
 * as literals, so a change to a scene's field list cannot leave this row writing a field the floor
 * no longer writes. What it CANNOT keep in step that way is the door bodies — those are the
 * author's hand-held map — and the gate is what holds those.
 */
function wideWireDriver(ops: readonly TExoWideWireOps[]): TExoWideDriver {
    return {
        one: (k) => {
            for (let i = 0; i < ops.length; i++) ops[i].one(wideAt(k, i, WIDE_ONE[0]));
        },
        some: (k) => {
            for (let i = 0; i < ops.length; i++) {
                // THREE FIELDS, ONE CALL — the wire's door runs the chain once and writes each of
                // the eight woken ports once because its author wrote it that way. Nothing checks
                // that he did, and only a MISSING write would reach the gate.
                ops[i].some(
                    wideAt(k, i, WIDE_SOME[0]),
                    wideAt(k, i, WIDE_SOME[1]),
                    wideAt(k, i, WIDE_SOME[2])
                );
            }
        },
        none: (k) => {
            for (let i = 0; i < ops.length; i++) ops[i].none(wideAt(k, i, WIDE_UNREAD_FIELD));
        },
    };
}

/**
 * THE MACHINE ROW'S DRIVER — `wideCompiledDriver` with the instance where `machine` has its state
 * object, and it is the same three loops over the same three calls for the same reason: a machine's
 * transitions are the COMPONENT's, so there is one shared ops object and the instance travels as an
 * argument. `wideWireDriver` is the one that cannot be written this way, because a wire's door is a
 * closure over the row it was made in.
 *
 * IT IS A SEPARATE FUNCTION ONLY BECAUSE OF THE TYPE. Line for line it is `wideCompiledDriver`.
 */
function wideDirectDriver(
    instances: readonly TExoWideDirectInstance[],
    ops: TExoWideDirectOps
): TExoWideDriver {
    const run =
        (transition: (c: TExoWideDirectInstance, k: number, row: number) => void) =>
        (k: number): void => {
            for (let i = 0; i < instances.length; i++) transition(instances[i], k, i);
        };
    return { one: run(ops.one), some: run(ops.some), none: run(ops.none) };
}

// AND THERE IS NO `wideMachineBatchedDriver` EITHER, for the reason the narrow block above gives at
// length: `wideCompiledDriver` makes ONE transition call per row per scene — `ops.some` writes three
// fields inside one transition — so a per-instance hold would wrap a single commit and coalesce
// nothing. The price of coalescing at width is UNMEASURED.

const wideMachineProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine
): TExoWideProgram => ({
    name,
    what,
    allocs: '1 state + 1 machine object + 1 c.fillDoors() wrapper',
    prepare: () => {
        const handles = wideHandlesOf<TExoBenchMachine<TExoWideMachineState>>();
        return (parent) => {
            WIDE_MACHINE_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => wideMachineDriver(wideStatesOf(handles, name)),
                off,
            };
        };
    },
});

const wideCompiledProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine,
    ops: TExoWideCompiledOps
): TExoWideProgram => ({
    name,
    what,
    allocs:
        '1 state object + 1 one-slot pending table — the port table, the schema`s write and ' +
        '`set` are references on it',
    prepare: () => {
        const handles = wideHandlesOf<TExoWideCompiledState>();
        return (parent) => {
            WIDE_COMPILED_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => wideCompiledDriver(wideStatesOf(handles, name), ops),
                off,
            };
        };
    },
});

/** The wide table-backed participant — `wideCompiledProgram` with the pack's own data list. */
const wideTableProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine,
    pack: TExoWideTablePack
): TExoWideProgram => ({
    name,
    what,
    allocs: pack.shared
        ? `1 state object — the ${WIDE_FIELDS} values and the pending word are APPENDED onto the node table this row was allocated anyway`
        : `1 state object + 1 array of ${WIDE_FIELDS + 1} — two allocations`,
    prepare: () => {
        const handles = wideHandlesOf<TExoStateTableState>();
        return (parent) => {
            if (pack.shared) {
                WIDE_TABLE_SHARED_DATA = handles;
            } else {
                WIDE_TABLE_OWN_DATA = handles;
            }
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => wideTableDriver(wideStatesOf(handles, name), pack.ops()),
                off,
            };
        };
    },
});

/**
 * THE WIDE WIRE PARTICIPANT — and, as with the narrow one, its allocation line is its mount story.
 *
 * FIVE PER INSTANCE AGAINST `machine`'S ONE, and the count tracks DOORS rather than fields: three, because
 * this axis drives three scenes. The narrow row's seven includes a click closure this component does
 * not have and a fourth door this component is not written through.
 */
const wideWireProgram = (name: string, what: string, shell: TExoDomMachine): TExoWideProgram => ({
    name,
    what,
    allocs:
        '1 c.fillDoors() wrapper + 3 door closures + 1 object carrying them back to the driver — FIVE ' +
        'against `machine`s ONE state object, and no click closure on either row because this component ' +
        'has no event port. THE COUNT TRACKS DOORS, NOT FIELDS: three here because this axis ' +
        'drives three scenes, and twenty for a row the world pushes field by field — where a ' +
        'machine`s transitions are declared ONCE PER COMPONENT and its per-instance count does not ' +
        'move at all. Neither wire row counts the closure CONTEXT, which is one more object per ' +
        'instance holding the fields the doors touch.',
    prepare: () => {
        const handles = wideHandlesOf<TExoWideWireOps>();
        return (parent) => {
            WIDE_WIRE_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => wideWireDriver(wideStatesOf(handles, name)),
                off,
            };
        };
    },
});

/**
 * THE MACHINE'S CHEAP SPELLING — and, like both wire rows, its allocation line is its mount story.
 *
 * FOUR PER INSTANCE AGAINST `machine`'S ONE AND `wire`'S SIX, and the count does not move with the
 * number of doors the world may push through, because the transitions are the COMPONENT's.
 *
 * NOTHING IS BUILT IN `prepare()` BUT THE HANDLES, which is what every other participant builds
 * there. There are no seed closures any more: a machine has no props, so its starting state arrives
 * as a TRANSITION the shell fires at an instance it has built — `pack.seed` — and one module-level
 * function serves all 200 rows of every rep. What that transition DOES, twenty property stores into
 * the cached object and nineteen recorded port fills, runs inside the mount clock exactly where the
 * old seed's did.
 */
const wideDirectProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine,
    pack: TExoWideDirectPack
): TExoWideProgram => ({
    name,
    what,
    allocs:
        '4 — the instance object, its 1-SLOT VALUE TABLE (this component declares NO FIELD, so the ' +
        'one slot is the CACHE), THE CACHED OBJECT of twenty named properties of the same ' +
        '`TExoWideFields` shape `machine` holds, and THE `TExoDomChild` CHILD `wireExoNode(c.createExoNode(M))` makes — the ' +
        'fourth is not the machine`s, it is what building a row by hand costs against the ' +
        '`c.list` every other row on this table uses, and the shell`s own note prices the rest of ' +
        'that trade. NO DOOR CLOSURE (the four transitions are declared ONCE PER COMPONENT and take ' +
        'the instance), no handler closure (no event port), no `c.fillDoors()` wrapper (the ' +
        'instance holds the port table and the schema`s write) and no disposer array per ROW (the ' +
        'region`s one teardown closure is per SHELL). Against `machine`s ONE state object and ' +
        '`wire`s SIX — its five plus the closure context its own line names but does not count. ' +
        'AND NOTHING PER ROW FOR THE SEEDING ITSELF: `pack.seed` is one module-level transition ' +
        'for every row of every rep, where the old props-carried seed was a closure per row.',
    prepare: () => {
        const handles = wideHandlesOf<TExoWideDirectInstance>();
        return (parent) => {
            WIDE_DIRECT_DATA = handles;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => wideDirectDriver(wideStatesOf(handles, name), pack.ops),
                off,
            };
        };
    },
});

const WIDE_B = wideMachineProgram(
    'machine·scan',
    `THE SCANNING MACHINE, WIDENED — ${WIDE_PORTS} declared derivations SCANNED on every commit, with the chain recomputed BY HAND in two of them because this form cannot express one.`,
    WIDE_SHELL_B
);
const WIDE_B_TWIN = wideMachineProgram(
    'machine·scan·twin',
    'THE NULL FOR THE SCANNING SHAPE AT WIDTH — a SECOND, separately declared, identical `machine·scan` (own derivation array). True Δ = 0.',
    WIDE_SHELL_B_TWIN
);
const WIDE_C = wideCompiledProgram(
    'machine',
    `THE MACHINE \`@exodra/core\` SHIPS, WIDENED — ${WIDE_READS.length} derivations declared, the field→derivations table inverted at load, an O(affected) commit, and the chain DECLARED rather than hand-held.`,
    WIDE_SHELL_C,
    WIDE_PACK_C.ops
);
const WIDE_C_TWIN = wideCompiledProgram(
    'machine·twin',
    'THE NULL FOR THE MACHINE SHAPE AT WIDTH — a SECOND, separately declared, identical `machine` (own compiled program). True Δ = 0.',
    WIDE_SHELL_C_TWIN,
    WIDE_PACK_C_TWIN.ops
);
// `WIDE_C_BATCH` (`machine·batch`, at width) STOOD HERE and is deleted, not converted. The block
// above `wideCellProgram` is the whole argument; the short of it is that the mechanism it named no
// longer exists and the door that replaced it would coalesce nothing in any scene this file drives.
const WIDE_C_TBL = wideTableProgram(
    'machine·array',
    `THE MACHINE WITH ITS STATE IN ITS OWN FLAT ARRAY, AT WIDTH (state shape 2) — ${WIDE_FIELDS} fields in an array the row owns: an all-integer array, which is the one state here that is PACKED_SMI. A transition writes cells[f]; the object form calls WIDE_WRITE_FIELD[f].`,
    WIDE_SHELL_C_TBL,
    WIDE_PACK_C_TBL
);
const WIDE_C_TBL_TWIN = wideTableProgram(
    'machine·array·twin',
    'THE NULL FOR THE OWN-ARRAY SHAPE AT WIDTH — a SECOND, separately declared, identical `machine·array` (own program). True Δ = 0.',
    WIDE_SHELL_C_TBL_TWIN,
    WIDE_PACK_C_TBL_TWIN
);
const WIDE_C_SHR = wideTableProgram(
    'machine·nodes',
    `THE MACHINE WITH ITS STATE IN THE NODE ARRAY, AT WIDTH (state shape 3) — ${WIDE_FIELDS} fields APPENDED onto the row's own node table, one numbering for ${WIDE_PORTS} ports and ${WIDE_FIELDS} fields. Every port write of every round reads that mixed array.`,
    WIDE_SHELL_C_SHR,
    WIDE_PACK_C_SHR
);
const WIDE_C_SHR_TWIN = wideTableProgram(
    'machine·nodes·twin',
    'THE NULL FOR THE NODE-ARRAY SHAPE AT WIDTH — a SECOND, separately declared, identical `machine·nodes` (own program). True Δ = 0.',
    WIDE_SHELL_C_SHR_TWIN,
    WIDE_PACK_C_SHR_TWIN
);
const WIDE_WIRE = wideWireProgram(
    'wire',
    `NO MACHINE AND NO CELL, AT WIDTH — ${WIDE_FIELDS} fields in CLOSURE VARIABLES, \`const ports = c.fillDoors()\` kept at the wire, ${WIDE_PORTS} ports filled by hand, and THREE doors that each recompute exactly the derivations their fields feed — THE AUTHOR HOLDING BY HAND THE MAP \`machine\` COMPILES. It runs the same derivations \`machine\` runs, so the gap is the bookkeeping and not the job. The OTHER honest spelling — refresh all ${WIDE_PORTS} ports on any change — is NOT MEASURED and its block says what it would have cost.`,
    WIDE_SHELL_WIRE
);
const WIDE_WIRE_TWIN = wideWireProgram(
    'wire·twin',
    'THE NULL FOR THE WIRED SHAPE AT WIDTH — a SECOND, separately declared, identical `wire` (own component, own declaration, own compiled schema). True Δ = 0.',
    WIDE_SHELL_WIRE_TWIN
);
const WIDE_DIRECT = wideDirectProgram(
    'machine·imperative',
    `THE IMPERATIVE MACHINE, STATE IN THE CACHE — the machine's cheap spelling. It declares NO DERIVATION, NO FILL and NO FIELD; its ${WIDE_FIELDS} values live in ONE CACHE SLOT (\`m.keep\`, one object of named properties per instance, written with an ordinary property store) and its THREE TRANSITIONS — declared once per COMPONENT, taking the instance — write the ports themselves with \`c.text\`. It runs the same derivations \`machine\` and \`wire\` run; what differs from \`machine\` is that the rules live in transition bodies instead of in declarations (so nothing can wake and every commit returns on its first comparison), and what differs from \`wire\` is that nothing whatever is allocated per instance for a door. The initial paint is a FOURTH TRANSITION's ${WIDE_PORTS} \`c.text\` calls, fired by the shell at each row after \`wireExoNode(c.createExoNode(M))\` and before \`insert\`, because a machine takes no props and a row with no derivation has no fill to paint it — WHICH ALSO MAKES THIS THE ONE ROW HERE NOT MOUNTED BY \`c.list\`, so read its mount against its twin and not against its neighbours. THE VALUES USED TO BE ${WIDE_FIELDS} \`m.field\`s: a field is an address for waking and nothing here can wake, and moving them REMOVED the second term its gap to \`machine\` used to carry — both rows now hold twenty NAMED PROPERTIES, so that subtraction is now where the RULES live and nothing else.`,
    WIDE_SHELL_DIRECT,
    WIDE_PACK_DIRECT
);
const WIDE_DIRECT_TWIN = wideDirectProgram(
    'machine·imperative·twin',
    'THE NULL FOR THE IMPERATIVE SHAPE — a SECOND, separately declared, identical `machine·imperative` (own schema, own machine, own compiled program, own transitions). True Δ = 0.',
    WIDE_SHELL_DIRECT_TWIN,
    WIDE_PACK_DIRECT_TWIN
);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE APP SCENE — three component types of three widths, nested, mounted and updated together
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ WHAT IT IS, AND WHAT IT IS NOT ═══
//
// IT IS ONE SHAPE, NOT "AN APP". A page is: an outer component with two panes and NO derivations at
// all; inside one pane, a list shell holding the NARROW tag (two derivations, four fields); inside
// the other, a list shell holding the WIDE row (twenty derivations, twenty fields). Three component
// types of three widths — 0, 2 and 20 — nested two levels deep, mounted as one tree and updated in
// one round.
//
// NOTHING HERE SAYS WHAT A REAL APPLICATION COSTS. It says what THIS composition costs, and its
// value over TABLES 1-8 is exactly that no participant gets to be measured on the width that suits
// it: a form that wins at two derivations and loses at twenty is here weighted by how many of each
// stand on the page, and the counts are printed. A DIFFERENT MIX WOULD GIVE A DIFFERENT NUMBER, and
// that is the honest thing to say rather than to publish one mix as "the app case".
//
// THE ZERO-DERIVATION COMPONENTS ARE THE PART NO OTHER TABLE HAS. The outer shell and the two pane
// shells declare no state and drive no port — they exist to hold children — and every real page is
// mostly made of them. They cost every participant the same and they are IN the mount number, which
// is why the app mount ratio to the floor is smaller than TABLE 5's: the same per-instance
// difference is spread over a tree that contains components with no per-instance anything.
//
// ═══ WHAT THE UPDATE ROUND IS ═══
//
// One `name` write on every tag AND one `f2` write on every row, as one round. It is TABLE 2's scene
// and TABLE 6's scene happening together, which is what a page does when a store flushes.

/** Instances of each type standing in one app — printed, because the mix is the whole caveat. */
const APP_INSTANCES = TAGS + WIDE_ROWS;

/** Pages built per timed region on TABLE 9. */
const APP_MOUNT_REPS = 2;

/** Pages standing at once on TABLE 10. */
const APP_SHELLS = 2;

/** Mixed rounds per scenario on TABLE 10 — each writes both types. */
const APP_ROUNDS = 8;

interface TExoAppPorts {
    readonly narrow: TExoChildrenPort;
    readonly wide: TExoChildrenPort;
}

const buildApp = (b: TExoSchemaCursor): TExoAppPorts => {
    let narrow!: TExoChildrenPort;
    let wide!: TExoChildrenPort;
    b.el('div', { class: 'app' }, (app) => {
        // TWO PANES RATHER THAN TWO CHILDREN PORTS SIDE BY SIDE. Adjacent regions in one element are
        // a real shape and a real mechanism (the region chain), and measuring it here would be
        // measuring that mechanism rather than this axis's question.
        app.el('section', { class: 'pane' }, (pane) => {
            narrow = pane.childrenPort();
        });
        app.el('section', { class: 'pane' }, (pane) => {
            wide = pane.childrenPort();
        });
    });
    return { narrow, wide };
};

/** The outer shell — a component with NO derivations, which is what most of a page is made of. */
const makeAppShell = (tagShell: TExoDomMachine, wideShell: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA22 = createExoSchema(buildApp);
    const mMachine22 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA22, {
        createInitialState: (c) => {
            c.one(MACHINE_SCHEMA22.ports.narrow, tagShell);
            c.one(MACHINE_SCHEMA22.ports.wide, wideShell);
        },
    });
    return mMachine22;
};

/** What an app participant answers: ONE round that touches both types. */
interface TExoAppMounted {
    readonly driver: () => (k: number) => void;
    readonly off: () => void;
}

interface TExoAppProgram {
    readonly name: string;
    readonly what: string;
    readonly allocs: string;
    readonly prepare: () => (parent: HTMLElement) => TExoAppMounted;
}

const APP_SHELL_B = makeAppShell(SHELL_B, WIDE_SHELL_B);
const APP_SHELL_B_TWIN = makeAppShell(SHELL_B_TWIN, WIDE_SHELL_B_TWIN);
const APP_SHELL_C = makeAppShell(SHELL_C, WIDE_SHELL_C);
const APP_SHELL_C_TWIN = makeAppShell(SHELL_C_TWIN, WIDE_SHELL_C_TWIN);

const APP_NATIVE: TExoAppProgram = {
    name: 'floor',
    what: 'THE FLOOR FOR THE WHOLE PAGE — the narrow floor and the wide floor side by side, building the same tree by hand. No declaration, no schema, no port.',
    allocs: 'narrow: 1 state + 1 click closure · wide: 1 state + 1 Text array · shells: nothing',
    prepare: () => {
        const buildNarrow = NATIVE.prepare();
        const buildWide = WIDE_NATIVE.prepare();
        return (parent) => {
            // THE SAME TWO PANES, so the floor's tree has the same element count as everyone
            // else's — a floor that skipped the shells would be a floor doing a smaller job.
            const app = document.createElement('div');
            app.className = 'app';
            const paneA = document.createElement('section');
            paneA.className = 'pane';
            const paneB = document.createElement('section');
            paneB.className = 'pane';
            app.appendChild(paneA);
            app.appendChild(paneB);
            const narrow = buildNarrow(paneA);
            const wide = buildWide(paneB);
            parent.appendChild(app);
            return {
                driver: () => {
                    const n = narrow.driver();
                    const w = wide.driver();
                    return (k: number): void => {
                        n.names(k);
                        w.one(k);
                    };
                },
                off: () => {
                    narrow.off();
                    wide.off();
                    app.remove();
                },
            };
        };
    },
};

const appMachineProgram = (name: string, what: string, shell: TExoDomMachine): TExoAppProgram => ({
    name,
    what,
    allocs: 'narrow: 4 objects · wide: 3 objects · shells: nothing',
    prepare: () => {
        const tags = handlesOf<TExoMachineHandle>((seed) => ({ seed, machine: null }));
        const rows = wideHandlesOf<TExoBenchMachine<TExoWideMachineState>>();
        return (parent) => {
            MACHINE_DATA = tags;
            WIDE_MACHINE_DATA = rows;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => {
                    const n = machineDriver(
                        statesOf<TExoMachineHandle, TExoBenchMachine<TExoTagState>>(
                            tags,
                            (h) => h.machine,
                            name
                        )
                    );
                    const w = wideMachineDriver(wideStatesOf(rows, name));
                    return (k: number): void => {
                        n.names(k);
                        w.one(k);
                    };
                },
                off,
            };
        };
    },
});

const appCompiledProgram = (
    name: string,
    what: string,
    shell: TExoDomMachine,
    narrowOps: TExoCompiledOps,
    wideOps: TExoWideCompiledOps
): TExoAppProgram => ({
    name,
    what,
    allocs: 'narrow: 2 objects · wide: 1 object · shells: nothing',
    prepare: () => {
        const tags = handlesOf<TExoCompiledHandle>((seed) => ({ seed, state: null }));
        const rows = wideHandlesOf<TExoWideCompiledState>();
        return (parent) => {
            COMPILED_DATA = tags;
            WIDE_COMPILED_DATA = rows;
            const off = EXO_BACKEND.render(shell, parent);
            return {
                driver: () => {
                    const n = compiledDriver(
                        statesOf<TExoCompiledHandle, TExoCompiledState>(tags, (h) => h.state, name),
                        narrowOps
                    );
                    const w = wideCompiledDriver(wideStatesOf(rows, name), wideOps);
                    return (k: number): void => {
                        n.names(k);
                        w.one(k);
                    };
                },
                off,
            };
        };
    },
});

const APP_B = appMachineProgram(
    'machine·scan',
    'THE SCANNING MACHINE, on both component types of the page.',
    APP_SHELL_B
);
const APP_B_TWIN = appMachineProgram(
    'machine·scan·twin',
    'THE NULL FOR THE SCANNING SHAPE ON THE PAGE — a SECOND, separately declared, identical `machine·scan` app. True Δ = 0.',
    APP_SHELL_B_TWIN
);
const APP_C = appCompiledProgram(
    'machine',
    'THE MACHINE `@exodra/core` SHIPS, on both component types — one object per instance at either width.',
    APP_SHELL_C,
    PACK_C.ops,
    WIDE_PACK_C.ops
);
const APP_C_TWIN = appCompiledProgram(
    'machine·twin',
    'THE NULL FOR THE MACHINE SHAPE ON THE PAGE — a SECOND, separately declared, identical `machine` app. True Δ = 0.',
    APP_SHELL_C_TWIN,
    PACK_C_TWIN.ops,
    WIDE_PACK_C_TWIN.ops
);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE TRANSITION LADDER — TABLES 11 TO 14, AND IT MOVES A VARIABLE NO OTHER TABLE HERE MOVES
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ THE QUESTION, AND WHY NOTHING ABOVE ASKS IT ═══
//
// EVERY TABLE ABOVE VARIES HOW MUCH ONE TRANSITION DOES. TABLE 2 writes one field, TABLE 3 writes
// two, TABLE 7 writes three; the narrow component declares FOUR transitions and the wide one THREE,
// and neither count ever moves. So the axis has priced the WIDTH of a transition at every width it
// has and has never priced the NUMBER OF THEM, which is the variable on which the wire and the
// machine are structurally different rather than differently spelled:
//
//   A WIRE'S TRANSITIONS ARE CLOSURES MADE PER INSTANCE. `wireDriver` calls `ops[i].setName(…)` —
//   one ops object per instance, built by the wire, holding one closure per door. At N doors that is
//   N closures and one array PER INSTANCE, allocated inside the mount, plus a closure CONTEXT
//   holding every variable those doors touch.
//
//   A MACHINE'S ARE DECLARED ONCE AT MODULE LOAD AND THE INSTANCE TRAVELS AS AN ARGUMENT.
//   `compiledDriver` calls `ops.setName(states[i], …)`. At N transitions that is N closures ONCE PER
//   COMPONENT and NOTHING per instance.
//
// So the wire's per-instance allocation carries a factor of N that the machine's does not, and every
// wire↔machine verdict this file has ever printed was taken at ONE value of N. P21 and P22 may hold
// only at four and at three. THIS LADDER IS WHERE THAT IS FOUND OUT.
//
// ═══ WHAT IS HELD AND WHAT MOVES ═══
//
// HELD CONSTANT AT EVERY RUNG: the number of instances (LADDER_INSTANCES), the markup (LADDER_PORTS
// text ports under one div, at every rung), the state (LADDER_FIELDS fields, at every rung), the
// derivations (one per port, at every rung), the fill (every port painted at the mount, at every
// rung), and the arithmetic every arm runs.
//
// MOVES WITH THE RUNG: the number of transitions the component DECLARES — and therefore, on the wire
// arm, the number of closures each instance allocates, which is the thing being priced.
//
// ═══ THE RUNGS ARE 1, 4 AND 16, AND EACH IS CHOSEN ═══
//
//   1   THE FLOOR OF THE VARIABLE. A component the outside world pushes through ONE entry point.
//       Below it there is no transition and no component.
//   4   THE WIDTH THIS FILE ALREADY PUBLISHES. The narrow tag declares exactly four transitions, so
//       the ladder passes through the shape TABLES 1 TO 4 measure and a reading here can be checked
//       against them for plausibility (NOT read across — different scene, different markup).
//   16  THE TOP, AND THE CAP IS DISTINCTNESS AND NOT AMBITION. Sixteen transition bodies are written
//       out below, one per field, each with its own arithmetic, and a reader can check every one.
//       Thirty-two would be thirty-two more bodies nobody would read, and the machine's own ceiling
//       is thirty-one fields and thirty-one derivations, so the next honest rung after 16 is not 32.
//       16 is 16× the first rung, which is what makes an allocation LINEAR IN N visible against an
//       instrument whose resolution is a percent or two of a row.
//
// ═══ THE TRAP THIS WHOLE LADDER TURNS ON — DUMMY TRANSITIONS ═══
//
// A TRANSITION THAT IS DECLARED AND NEVER CALLED IS NOT A TRANSITION, AND A LADDER OF THEM WOULD
// PUBLISH A NUMBER THAT LOOKED FINE AND MEASURED NOTHING. Its closure IS allocated — it escapes into
// a long-lived array, so escape analysis cannot remove it — but ITS BODY IS NEVER COMPILED: V8 leaves
// an uncalled function at the pre-parse. So a rung of dummies prices N ALLOCATIONS AND N PRE-PARSES
// and not N working functions, and the error flatters the wire, which is the arm the ladder exists to
// charge.
//
// SO EVERY DECLARED TRANSITION ON EVERY RUNG IS CALLED IN THE MEASURED REGION, once per instance per
// round, with a body that stores a field and drives a port. AND THAT IS CHECKED RATHER THAN CLAIMED:
// every transition body on every arm bumps a counter (`LADDER_SEEN_*`), `ladderGate` snapshots the
// banks, runs exactly one round of each rung's driver and refuses BY NAME if the diff is not
// `{0 … n−1}` × LADDER_INSTANCES, then ZEROES the banks — so every count that survives into
// `ladderRegionGate` was made INSIDE a timed region. That gate is as much the deliverable as the
// numbers are.
//
// WHAT THE COUNTER COSTS AND WHO PAYS IT: one store into a module-level `Int32Array`, per call, on
// ALL THREE ARMS INCLUDING THE FLOOR. It is a common addend — it raises every row and cancels in
// every gap — and it is named here rather than hidden, because it is the price of the table being
// checkable at all.
//
// ═══ HOW THE BODIES ARE WRITTEN, AND THE ASYMMETRY IS THE FINDING RATHER THAN AN ARTEFACT ═══
//
// THE FLOOR'S AND THE MACHINE'S SIXTEEN BODIES ARE WRITTEN OUT ONCE and the rungs take PREFIXES of
// them, because in both of those shapes a transition is a function that takes the instance as an
// argument and there is no per-rung version of it to write. THE WIRE'S DOORS ARE WRITTEN OUT PER
// RUNG — twenty-one of them, 1 + 4 + 16 — because a door closes over the instance's own variables
// and cannot be shared by anything.
//
// THEY ARE WRITTEN OUT AND NOT BUILT IN A LOOP, and that is not style. A door built in a loop is ONE
// source function instantiated N times: V8 compiles ONE body, gives it ONE feedback vector and one
// set of inline caches, and the rung would price N allocations of a single perfectly-warm function.
// Written out, a rung of N doors is N `SharedFunctionInfo`s, N code objects and N feedback vectors,
// which is what N transitions in a real component are.
//
// ═══ THE ROWS MAY NOT BE READ ACROSS RUNGS. THE GAP MAY. ═══
//
// A ROUND AT RUNG N MAKES N CALLS PER INSTANCE, so the number of field stores, recomputes and DOM
// writes in a round GROWS WITH THE RUNG BY CONSTRUCTION. `machine·n16` costing more per
// instance-round than `machine·n1` is arithmetic and not a finding, and no line below prints such a
// comparison.
//
// WHAT IS READABLE ACROSS RUNGS IS THE WIRE↔MACHINE GAP, because the scene's growth is INSIDE BOTH
// ARMS and cancels: both run the same N bodies, the same N stores and the same N port writes at every
// rung. If the gap per rung grows in proportion to N, the balance did not move and the answer is that
// the choice costs the same per transition however many there are. If it grows faster, or changes
// sign, the balance moved and the ladder has found where.
//
// AND EVERY RUNG CARRIES ITS OWN FLOOR ROW, because a gap that is not read against a straight-line
// program can rank two arms and cannot say what either is worth. The floor's transitions are
// module-level functions taking the state as an argument, so ITS MOUNT DOES NOT KNOW HOW MANY OF THEM
// EXIST — which is why TABLE 11 carries ONE floor row for all three rungs, and why that row is the
// null hypothesis the wire's mount is being tested against rather than a shortcut.
//
// ═══ THE THREE PREDICTIONS, COMMITTED HERE BEFORE THE FIRST RUN ═══
//
// P24. THE MOUNT: THE `wire ↔ machine` GAP GROWS WITH THE RUNG AND THE `floor ↔ machine` GAP DOES
//      NOT. MECHANISM: at rung N a wire allocates N door closures, the array that carries them and a
//      closure context holding every variable those doors touch — all per instance, all inside the
//      timed mount — where a machine allocates ONE state object at every rung and a floor ONE state
//      record. A DIRECTION IS PREDICTED HERE, AND ONLY AGAINST THE RUNG: nothing is predicted between
//      the two rows at any single rung, which is P21's and P22's position and stays it.
//      FALSIFIERS: (a) if the wire's mount is FLAT in the rung, this file's model of what a closure
//      costs is wrong and the ladder's premise with it; (b) if the machine's mount GROWS with the
//      rung, something per-instance is scaling with the declaration count and `machine`'s
//      "one object per instance, whatever it declares" is false; (c) if the wire's mount grows but by
//      less than the pair's own floor per rung step, the effect is real and unresolvable at this
//      instance count, and the answer is more INSTANCES, not more rounds.
//
// P25. THE CALL: THE `wire ↔ machine` GAP PER INSTANCE-ROUND GROWS IN PROPORTION TO THE RUNG, i.e.
//      `gap(n) ÷ n` IS FLAT, AND NO DIRECTION IS PREDICTED BETWEEN THE TWO AT ANY RUNG. MECHANISM:
//      a round at rung n is n calls on both arms and each call costs a constant on each arm, so what
//      the rung multiplies is a per-call difference and not the balance. The wire still has the
//      shorter path and the more expensive write; the machine still has `exoTransition`'s two calls,
//      the mark, the bit walk and the schema's own write.
//      FALSIFIERS, both named in advance: (a) if `gap(16) ÷ 16` differs from `gap(1) ÷ 1` by more
//      than the wider of the two pairs' floors, something is SUPERLINEAR, and the two candidates
//      this file can name are the wire's closure CONTEXT (one object per instance whose size grows
//      with the number of variables its doors touch) and the wire driver's `d[j]` load over an array
//      that is longer at every rung; (b) if the gap CHANGES SIGN between rungs, the two shapes cross
//      over and the ladder has found the width at which the answer flips.
//
// P26. THE FLOOR PER RUNG: each arm's ratio to ITS OWN RUNG'S floor is printed, and if either arm's
//      ratio grows with the rung then that arm's abstraction is not flat in the number of declared
//      transitions. NO DIRECTION IS PREDICTED for either arm's ratio; what is predicted is that the
//      comparison is made at all, which no other table here can make.
//
// ═══ WHAT THE LADDER DOES NOT MEASURE, SAID BEFORE THE NUMBERS ═══
//
//  (1) ONLY TWO SHAPES. The ladder carries the wire and the shipped machine; `machine·scan` and the
//      state-shape variants are not on it.
//  (2) NO TANGLE. Derivation j reads field j alone, so a transition wakes exactly one derivation and
//      the commit never merges anything. The mask's merging is priced on TABLES 3 and 7; putting it
//      here too would move two variables at once.
//  (3) NO TEARDOWN AND NO HEAP. N closures per instance is a memory cost as much as a mount cost and
//      nothing here reads a heap; and the wire's N disposal-free closures die with their instance,
//      which no table here times.
//  (4) THE UNWRITTEN FIELDS ARE `const` ON THE WIRE ARM AT RUNGS 1 AND 4, so a rung-1 wire's closure
//      context holds one field and a rung-16 wire's holds sixteen. That is a REAL property of the
//      shape — a wire's context is what its doors touch — and it is also part of what the rung
//      moves, so it is named rather than removed. A machine's state object holds sixteen mutable
//      slots at every rung whatever its transitions do.
//  (5) THE FILL IS SPELLED OUT AT EVERY RUNG on the wire arm — sixteen `c.set` lines, the same
//      sixteen — where the machine's fill is `fillExoMachineDerivations`'s loop and the floor's is a
//      loop over its Text nodes. That difference is a CONSTANT ADDEND: it is identical at all three
//      rungs, so it lands in the LEVEL of the mount rows and not in their SLOPE, and the slope is
//      the ladder's finding.
//
// ═══ THE SIZING, AND IT IS ARITHMETIC A READER CAN CHECK ═══
//
// EVERY RUNG'S TIMED REGION MAKES THE SAME NUMBER OF TRANSITION CALLS —
// `LADDER_SHELLS × ladderRoundsAt(n) × LADDER_INSTANCES × n`, and `ladderRoundsAt(n)` is
// `LADDER_CALLS_PER_SCENARIO ÷ n` exactly so that the product does not move. That is the whole reason
// the round count differs per rung, and it is what makes the PER-CALL resolution the same at every
// rung: a rung measured at a coarser clock than its neighbour could not have its gap compared with
// that neighbour's, which is the only comparison this ladder publishes.
//
// THE NUMBERS, AND WHAT IN THEM IS MEASURED AND WHAT IS ESTIMATED. The clock this suite runs against
// has an OBSERVED QUANTUM OF 0.1 ms — that is not a guess, it is the `"quantum"` field carried by
// every recording in `measurements/` that has one — so `MIN_TICKS × quantum` puts the bar at
// 0.300 ms and a region under it is refused BY NAME with the batch that would clear it.
//
//   A CALL REGION is `LADDER_SHELLS × LADDER_CALLS_PER_SCENARIO × LADDER_INSTANCES`
//   = 4 × 256 × 25 = 25,600 transition calls, AT EVERY RUNG. One call is a field store, one mix, one
//   string build and one text write. THE PER-CALL FIGURE IS AN ESTIMATE and it is another axis's:
//   `measurements/update-floor.published.json` puts a straight-line `.data` write at about 50 ns and
//   the same write through the library at about 83 ns, and a short string build is of that order
//   again — so ~120-200 ns per call, and the region is 3.1-5.1 ms, i.e. 10× to 17× the bar.
//
//   THE MOUNT REGION is `LADDER_MOUNT_REPS × LADDER_INSTANCES` = 20 × 25 = 500 rows of 17 elements,
//   8,500 elements built per region. TABLE 1's region is 800 tags of 3 elements and TABLE 5's is 200
//   rows of 20, and both clear the bar today; a ladder row is between them in element count and above
//   both in PORT count, so 500 of them is 1-2 ms, i.e. 3× to 7× the bar. THIS IS THE TIGHTEST REGION
//   IN THE LADDER and the one to watch: if it refuses, its message carries the batch.
//
// SO THE RUN IS `node scripts/run-one-axis.js machine-vs-cells 100 1`.
//
//   ROUNDS 100, AND MORE WOULD NOT HELP. The floor a gap is read against is `max(bias, noise)`, and
//   `noise` is the MEDIAN of the per-round |a−b| — it is set by how big one region is, not by how
//   many of them are taken, so rounds buy nothing against it. What rounds do buy is a stable median
//   for `bias` and for BOTH HALVES of the ordering split, which needs enough rounds in each
//   direction to have a median at all: at 100 that is 50 forwards and 50 backwards, and much below
//   40 the split stops being readable.
//
//   BATCH 1, AND BATCH 2 IS THE ONLY ESCALATION WORTH MAKING. Batch multiplies `reps`, so it
//   multiplies the region and divides the quantisation share — which at the call tables is already
//   0.1 ÷ ~3.8 = 2.6% and is not what limits them. At the MOUNT table batch 2 would put 17,000
//   elements in one region, and this axis is on record as dying at large batches. If `checkClock`
//   refuses `LADDER-MOUNT`, run the batch its message names and read the other tables from the
//   batch-1 run; do not raise the batch pre-emptively.

/** The rungs, and `LADDER_TOP` is the last of them. Everything else is held at the top's width. */
const LADDER_RUNGS: readonly number[] = [1, 4, 16];
const LADDER_TOP = 16;

/** State fields, at EVERY rung. Under the machine's own thirty-one-field ceiling, with room. */
const LADDER_FIELDS = LADDER_TOP;

/** Text ports and declared derivations, at EVERY rung — derivation j reads field j and writes port j. */
const LADDER_PORTS = LADDER_TOP;

/** Instances per shell. HELD CONSTANT ACROSS RUNGS — it is the variable the ladder does not move. */
const LADDER_INSTANCES = 25;

/**
 * Mounts per timed region on TABLE 11 — 20 × 25 = 500 rows of 17 elements, 8,500 elements per region.
 *
 * IT IS THE LARGEST REGION IN THIS FILE AND THAT IS DELIBERATE RATHER THAN CARELESS: the mount is
 * where P24 lives, a mount region is cheap per element compared with a round of DOM writes, and this
 * is the one ladder region whose size is close enough to the `MIN_TICKS × quantum` bar to be refused.
 * See the sizing arithmetic in the block above, including why batch 2 is the wrong first response.
 */
const LADDER_MOUNT_REPS = 20;

/** Shells standing at once on TABLES 12, 13 and 14. Held small: this suite crashes on memory pressure. */
const LADDER_SHELLS = 4;

/**
 * TRANSITION CALLS PER SCENARIO, HELD CONSTANT ACROSS RUNGS — the rounds are what move.
 *
 * A round at rung `n` makes `n` calls per instance, so a fixed round count would sample rung 1 at a
 * sixteenth of rung 16's region and put it under the clock. Fixing the CALLS instead gives every rung
 * the same amount of work in one region and therefore the same resolution PER CALL, which is what the
 * only cross-rung comparison here is made of.
 */
const LADDER_CALLS_PER_SCENARIO = 256;

/** Rounds per scenario at rung `n`. Checked, because a rung that does not divide would silently lie. */
const ladderRoundsAt = (n: number): number => {
    const rounds = LADDER_CALLS_PER_SCENARIO / n;
    if (!Number.isInteger(rounds) || rounds < 1) {
        refuse(
            `machine-vs-cells: rung ${n} wants ${rounds} rounds per scenario, which is not a whole ` +
                `number ≥ 1. LADDER_CALLS_PER_SCENARIO (${LADDER_CALLS_PER_SCENARIO}) must be ` +
                'divisible by every rung, or the rungs are sampled at different amounts of work and ' +
                'their gaps cannot be compared — which is the only comparison the ladder publishes.'
        );
    }
    return rounds;
};

/** The value handed to transition `j` of instance `row` in round `k` — identical for every arm. */
const ladderAt = (k: number, row: number, j: number): number =>
    (k * 5 + row * 11 + j * 3 + 1) & 0xff;

/** What port `j` shows, given field `j`. The only arithmetic any DERIVATION performs. */
const ladderText = (at: number, v: number): string => `${at}:${(v * 29 + at) & 0xffff}`;

/**
 * THE SIXTEEN TRANSITION BODIES' ARITHMETIC, WRITTEN OUT, ONE DISTINCT EXPRESSION EACH.
 *
 * DISTINCT AND NOT GENERATED, because "sixteen declared transitions" must mean sixteen functions an
 * engine has to compile and keep, not one function with an index. Each takes the incoming value and
 * the field's PREVIOUS value, so every arm can supply both from where it keeps its state — a state
 * property, a closure variable — without any arm being handed a shape the others do not have.
 *
 * `& 0xffff` on every one keeps the strings short and their lengths stable, so no arm is charged for
 * a longer string than another and the markup gate compares like with like.
 */
const LADDER_MIX: readonly ((v: number, p: number) => number)[] = [
    (v, p) => (v * 3 + p) & 0xffff,
    (v, p) => (v ^ (p << 1)) & 0xffff,
    (v, p) => (v + p * 5) & 0xffff,
    (v, p) => (v * 7 - p) & 0xffff,
    (v, p) => ((v | 1) * (p + 3)) & 0xffff,
    (v, p) => (v + (p >> 1) + 11) & 0xffff,
    (v, p) => ((v * 13) ^ p) & 0xffff,
    (v, p) => (v - p * 3 + 257) & 0xffff,
    (v, p) => ((v << 2) + p) & 0xffff,
    (v, p) => (v * 17 + (p & 7)) & 0xffff,
    (v, p) => (v + p + (v & p)) & 0xffff,
    (v, p) => (v * 19 - (p >> 2)) & 0xffff,
    (v, p) => ((v + 5) * (p | 1)) & 0xffff,
    (v, p) => (v ^ p ^ 0x2b) & 0xffff,
    (v, p) => (v * 23 + p * 2) & 0xffff,
    (v, p) => (v + ((p * p) & 0xff)) & 0xffff,
];

/**
 * EACH DERIVATION'S COMPUTE, GENERATED — and the derivations are the one part of this scene that MAY
 * be generated, because they are not the ladder's variable. `WIDE_FROM_VALUES` is generated for the
 * same reason and the same single call (`ladderText`) is what every arm ends in, which is what makes
 * the byte-identity gate a gate rather than a formality.
 */
const LADDER_TEXT: readonly ((v: number) => string)[] = Array.from(
    { length: LADDER_PORTS },
    (_unused, at) =>
        (v: number): string =>
            ladderText(at, v)
);

/** The sixteen fields, at every rung, as an interface every non-wire arm's state satisfies. */
interface TExoLadderFields {
    t0: number;
    t1: number;
    t2: number;
    t3: number;
    t4: number;
    t5: number;
    t6: number;
    t7: number;
    t8: number;
    t9: number;
    t10: number;
    t11: number;
    t12: number;
    t13: number;
    t14: number;
    t15: number;
}

/** READ ONE FIELD BY INDEX, with LITERAL property access — what a machine field's reader is. */
const LADDER_READ_FIELD: readonly ((s: TExoLadderFields) => number)[] = [
    (s) => s.t0,
    (s) => s.t1,
    (s) => s.t2,
    (s) => s.t3,
    (s) => s.t4,
    (s) => s.t5,
    (s) => s.t6,
    (s) => s.t7,
    (s) => s.t8,
    (s) => s.t9,
    (s) => s.t10,
    (s) => s.t11,
    (s) => s.t12,
    (s) => s.t13,
    (s) => s.t14,
    (s) => s.t15,
];

const LADDER_FIELD: readonly TExoMachineField<TExoLadderFields, number>[] = Array.from(
    { length: LADDER_FIELDS },
    (_unused, f) => exoMachineField<TExoLadderFields, number>(f, LADDER_READ_FIELD[f])
);

/**
 * THE MARK EACH FIELD OWES, KNOWN WITHOUT A PROGRAM AND CHECKED AGAINST EVERY ONE.
 *
 * Derivation `j` reads field `j` and nothing else, and the derivations are declared in order, so the
 * inverted field→derivations table can only be `field f → 1 << f`. That is what lets the sixteen
 * transition bodies live at module scope and be SHARED by every rung and by a row and its twin — and
 * it is CHECKED at each pack's wire (`ladderCheckMarks`) rather than asserted here, because a change
 * to the declaration that broke it would otherwise mark the wrong derivation in silence.
 */
const LADDER_MARKS: readonly number[] = Array.from(
    { length: LADDER_FIELDS },
    (_unused, f) => 1 << f
);

/**
 * THE INVOKED-TRANSITION COUNTERS — one bank per arm, and one per RUNG on the arm that can have one.
 *
 * The floor's and the machine's bodies are shared by the three rungs (see the block above), so their
 * banks are shared too: a post-run check on them says "transition j ran inside a timed region" and
 * not "at rung 4". THE PER-RUNG CLAIM IS MADE BY `ladderGate`, which snapshots a bank, runs exactly
 * one round of that rung's driver and asserts the diff is `{0 … n−1}` × LADDER_INSTANCES. The wire's
 * doors are written out per rung, so the wire — the arm the ladder exists to charge — gets an exact
 * per-rung count inside the timed regions as well.
 */
const LADDER_SEEN_FLOOR = new Int32Array(LADDER_TOP);
const LADDER_SEEN_MACHINE = new Int32Array(LADDER_TOP);
const LADDER_SEEN_WIRE_N1 = new Int32Array(LADDER_TOP);
const LADDER_SEEN_WIRE_N4 = new Int32Array(LADDER_TOP);
const LADDER_SEEN_WIRE_N16 = new Int32Array(LADDER_TOP);

/** One bank, with what it counts and at which rung — `null` where the bodies are shared by rungs. */
interface TExoLadderBank {
    readonly who: string;
    readonly rung: number | null;
    readonly bank: Int32Array;
}

const LADDER_BANKS: readonly TExoLadderBank[] = [
    { who: 'floor', rung: null, bank: LADDER_SEEN_FLOOR },
    { who: 'machine', rung: null, bank: LADDER_SEEN_MACHINE },
    { who: 'wire·n1', rung: 1, bank: LADDER_SEEN_WIRE_N1 },
    { who: 'wire·n4', rung: 4, bank: LADDER_SEEN_WIRE_N4 },
    { who: 'wire·n16', rung: 16, bank: LADDER_SEEN_WIRE_N16 },
];

/** One row's starting values — built once at module load and shared by every arm. */
const LADDER_SEEDS: readonly (readonly number[])[] = Array.from(
    { length: LADDER_INSTANCES },
    (_unused, row) =>
        Array.from({ length: LADDER_FIELDS }, (_u, f) => (row * 9 + f * 13 + 1) & 0xff)
);

/** Build the sixteen fields, seeded. Shared by the floor and by every machine rung. */
const ladderFieldsOf = (seed: readonly number[]): TExoLadderFields => ({
    t0: seed[0],
    t1: seed[1],
    t2: seed[2],
    t3: seed[3],
    t4: seed[4],
    t5: seed[5],
    t6: seed[6],
    t7: seed[7],
    t8: seed[8],
    t9: seed[9],
    t10: seed[10],
    t11: seed[11],
    t12: seed[12],
    t13: seed[13],
    t14: seed[14],
    t15: seed[15],
});

/** The markup of one ladder row, for the census. Identical at every rung. */
const LADDER_MARKUP = `<div class="lad">${'<em>…</em>'.repeat(3)}…(${LADDER_PORTS} in all)</div>`;

interface TExoLadderPorts {
    readonly out: readonly TExoTextPort[];
}

const buildLadderRow = (b: TExoSchemaCursor): TExoLadderPorts => {
    const out: TExoTextPort[] = [];
    b.el('div', { class: 'lad' }, (row) => {
        for (let i = 0; i < LADDER_PORTS; i++) {
            row.el('em', null, (cell) => {
                out.push(cell.textPort());
            });
        }
    });
    return { out };
};

const buildLadderShell = (b: TExoSchemaCursor): { readonly rows: TExoChildrenPort } => {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'lads' }, (host) => {
        rows = host.childrenPort();
    });
    return { rows };
};

/** One handle per instance, carrying the seed in and the per-instance state back out. */
interface TExoLadderHandle<TState> {
    readonly seed: readonly number[];
    readonly row: number;
    state: TState | null;
}

/**
 * WHAT A LADDER PARTICIPANT ANSWERS — ONE scene, because the ladder has one: call every transition
 * this component declares, once per instance, in declaration order.
 */
interface TExoLadderDriver {
    readonly call: (k: number) => void;
}

interface TExoLadderMounted {
    readonly driver: () => TExoLadderDriver;
    readonly off: () => void;
}

interface TExoLadderProgram {
    readonly name: string;
    readonly what: string;
    /** Objects this participant allocates PER INSTANCE, at THIS rung. Printed on TABLE 11. */
    readonly allocs: string;
    /** How many transitions it declares — printed, and what `ladderGate` checks the counters against. */
    readonly rung: number;
    readonly prepare: () => (parent: HTMLElement) => TExoLadderMounted;
}

// ── THE FLOOR ────────────────────────────────────────────────────────────────────────────────
//
// A straight-line program with no abstraction: one cloned prototype, its own Text nodes in an array,
// its sixteen fields as plain properties, `.data` written directly. Its transitions are MODULE-LEVEL
// FUNCTIONS taking the state as an argument, which is what a hand-written program's are — so there is
// no per-rung version of them, and its MOUNT does not know how many of them exist.

const LADDER_PROTO = (() => {
    const div = document.createElement('div');
    div.className = 'lad';
    for (let i = 0; i < LADDER_PORTS; i++) {
        const cell = document.createElement('em');
        cell.appendChild(document.createTextNode(''));
        div.appendChild(cell);
    }
    return div;
})();

interface TExoLadderNativeState extends TExoLadderFields {
    /** The sixteen Text nodes this row kept — ONE array, counted in the census. */
    readonly texts: readonly Text[];
}

/**
 * THE FLOOR'S SIXTEEN TRANSITIONS — written out, one per field, each with its own mix.
 *
 * Each does exactly what the machine's and the wire's do: bump its counter, store its field from the
 * incoming value and the previous one, and drive its port. The floor's port is a Text node it kept.
 */
const LADDER_FLOOR_BODY: readonly ((s: TExoLadderNativeState, v: number) => void)[] = [
    (s, v) => {
        LADDER_SEEN_FLOOR[0]++;
        const t = LADDER_MIX[0](v, s.t0);
        s.t0 = t;
        s.texts[0].data = LADDER_TEXT[0](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[1]++;
        const t = LADDER_MIX[1](v, s.t1);
        s.t1 = t;
        s.texts[1].data = LADDER_TEXT[1](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[2]++;
        const t = LADDER_MIX[2](v, s.t2);
        s.t2 = t;
        s.texts[2].data = LADDER_TEXT[2](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[3]++;
        const t = LADDER_MIX[3](v, s.t3);
        s.t3 = t;
        s.texts[3].data = LADDER_TEXT[3](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[4]++;
        const t = LADDER_MIX[4](v, s.t4);
        s.t4 = t;
        s.texts[4].data = LADDER_TEXT[4](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[5]++;
        const t = LADDER_MIX[5](v, s.t5);
        s.t5 = t;
        s.texts[5].data = LADDER_TEXT[5](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[6]++;
        const t = LADDER_MIX[6](v, s.t6);
        s.t6 = t;
        s.texts[6].data = LADDER_TEXT[6](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[7]++;
        const t = LADDER_MIX[7](v, s.t7);
        s.t7 = t;
        s.texts[7].data = LADDER_TEXT[7](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[8]++;
        const t = LADDER_MIX[8](v, s.t8);
        s.t8 = t;
        s.texts[8].data = LADDER_TEXT[8](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[9]++;
        const t = LADDER_MIX[9](v, s.t9);
        s.t9 = t;
        s.texts[9].data = LADDER_TEXT[9](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[10]++;
        const t = LADDER_MIX[10](v, s.t10);
        s.t10 = t;
        s.texts[10].data = LADDER_TEXT[10](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[11]++;
        const t = LADDER_MIX[11](v, s.t11);
        s.t11 = t;
        s.texts[11].data = LADDER_TEXT[11](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[12]++;
        const t = LADDER_MIX[12](v, s.t12);
        s.t12 = t;
        s.texts[12].data = LADDER_TEXT[12](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[13]++;
        const t = LADDER_MIX[13](v, s.t13);
        s.t13 = t;
        s.texts[13].data = LADDER_TEXT[13](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[14]++;
        const t = LADDER_MIX[14](v, s.t14);
        s.t14 = t;
        s.texts[14].data = LADDER_TEXT[14](t);
    },
    (s, v) => {
        LADDER_SEEN_FLOOR[15]++;
        const t = LADDER_MIX[15](v, s.t15);
        s.t15 = t;
        s.texts[15].data = LADDER_TEXT[15](t);
    },
];

/**
 * THE FLOOR'S PROGRAM AT RUNG `n`.
 *
 * `n` reaches the DRIVER and nothing else: the mount below is identical at every rung, which is the
 * property that lets TABLE 11 carry one floor row for all three. On TABLES 12, 13 and 14 each rung
 * gets its own floor row, because there the rung decides how many transitions a round calls.
 */
const ladderFloorProgram = (n: number): TExoLadderProgram => ({
    name: 'floor',
    what:
        `THE FLOOR — a program with NO LIBRARY, declaring ${n} transition(s) as MODULE-LEVEL ` +
        'functions that take the instance as an argument. It clones the row, holds its 16 Text ' +
        'nodes in an array, keeps 16 plain properties and writes `.data` directly. No ' +
        'declaration, no schema, no port, no connector, no source — and NOTHING per instance that scales with the rung.',
    allocs: '1 state record + 1 Text array + 1 cloned subtree — at EVERY rung',
    rung: n,
    prepare: () => {
        const handles: TExoLadderHandle<TExoLadderNativeState>[] = LADDER_SEEDS.map(
            (seed, row) => ({ seed, row, state: null })
        );
        return (parent) => {
            const host = document.createElement('div');
            host.className = 'lads';
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                const row = LADDER_PROTO.cloneNode(true) as HTMLElement;
                const texts: Text[] = new Array<Text>(LADDER_PORTS);
                let cell = row.firstChild as Node;
                for (let p = 0; p < LADDER_PORTS; p++) {
                    texts[p] = cell.firstChild as Text;
                    cell = cell.nextSibling as Node;
                }
                const state: TExoLadderNativeState = { ...ladderFieldsOf(handle.seed), texts };
                for (let p = 0; p < LADDER_PORTS; p++) {
                    texts[p].data = LADDER_TEXT[p](LADDER_READ_FIELD[p](state));
                }
                handle.state = state;
                host.appendChild(row);
            }
            parent.appendChild(host);
            return {
                driver: () => {
                    const states = statesOf<
                        TExoLadderHandle<TExoLadderNativeState>,
                        TExoLadderNativeState
                    >(handles, (h) => h.state, 'floor');
                    return {
                        call: (k) => {
                            for (let i = 0; i < states.length; i++) {
                                const s = states[i];
                                for (let j = 0; j < n; j++) {
                                    LADDER_FLOOR_BODY[j](s, ladderAt(k, i, j));
                                }
                            }
                        },
                    };
                },
                off: () => {
                    host.remove();
                },
            };
        };
    },
});

// ── THE MACHINE ARM ──────────────────────────────────────────────────────────────────────────
//
// The shipped machine, at each rung. The PROGRAM is identical at every rung — sixteen fields, sixteen
// derivations, the inverted table — and what the rung decides is how many TRANSITIONS the component
// declares over it. Every one of them is `exoTransition(program, LADDER_BODY[j])`: a closure made
// ONCE PER COMPONENT at module load, over a body written out at module scope, taking the instance as
// an argument. NOTHING PER INSTANCE MOVES WITH THE RUNG.

type TExoLadderMachineState = TExoNamedFieldNode & TExoLadderFields;

/**
 * THE SIXTEEN TRANSITION BODIES, written out at module scope and SHARED by every rung and by every
 * row and its twin — see `LADDER_MARKS` for why that sharing is safe and where it is checked.
 *
 * Each stores its field from the incoming value and the previous one, and ORs that field's mark. The
 * COMMIT is not here and is not the author's to remember: `exoTransition` attaches it.
 */
const LADDER_BODY: readonly ((s: TExoLadderMachineState, v: number) => void)[] = [
    (s, v) => {
        LADDER_SEEN_MACHINE[0]++;
        s.t0 = LADDER_MIX[0](v, s.t0);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[0];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[1]++;
        s.t1 = LADDER_MIX[1](v, s.t1);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[1];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[2]++;
        s.t2 = LADDER_MIX[2](v, s.t2);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[2];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[3]++;
        s.t3 = LADDER_MIX[3](v, s.t3);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[3];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[4]++;
        s.t4 = LADDER_MIX[4](v, s.t4);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[4];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[5]++;
        s.t5 = LADDER_MIX[5](v, s.t5);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[5];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[6]++;
        s.t6 = LADDER_MIX[6](v, s.t6);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[6];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[7]++;
        s.t7 = LADDER_MIX[7](v, s.t7);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[7];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[8]++;
        s.t8 = LADDER_MIX[8](v, s.t8);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[8];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[9]++;
        s.t9 = LADDER_MIX[9](v, s.t9);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[9];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[10]++;
        s.t10 = LADDER_MIX[10](v, s.t10);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[10];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[11]++;
        s.t11 = LADDER_MIX[11](v, s.t11);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[11];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[12]++;
        s.t12 = LADDER_MIX[12](v, s.t12);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[12];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[13]++;
        s.t13 = LADDER_MIX[13](v, s.t13);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[13];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[14]++;
        s.t14 = LADDER_MIX[14](v, s.t14);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[14];
    },
    (s, v) => {
        LADDER_SEEN_MACHINE[15]++;
        s.t15 = LADDER_MIX[15](v, s.t15);
        s.managedState[PENDING_ROW] |= LADDER_MARKS[15];
    },
];

interface TExoLadderMachineOps {
    readonly program: TExoMachineProgram<TExoLadderMachineState>;
    /** The rung's transitions, in declaration order. DECLARED ONCE PER COMPONENT at module load. */
    readonly calls: readonly ((state: TExoLadderMachineState, v: number) => void)[];
}

interface TExoLadderMachinePack {
    readonly component: TExoDomMachine;
    readonly ops: TExoLadderMachineOps;
}

let LADDER_MACHINE_DATA: readonly TExoLadderHandle<TExoLadderMachineState>[] = [];

/** The inverted table can only be `field f → 1 << f` here; a change that broke it must not be silent. */
const ladderCheckMarks = (
    who: string,
    program: TExoMachineProgram<TExoLadderMachineState>
): void => {
    for (let f = 0; f < LADDER_FIELDS; f++) {
        if (program.fieldMarks[f] !== LADDER_MARKS[f]) {
            refuse(
                `machine-vs-cells: ${who}'s field→derivations table gives field ${f} the mark ` +
                    `0b${(program.fieldMarks[f] >>> 0).toString(2)} where the ladder's ` +
                    `shared transition bodies OR 0b${LADDER_MARKS[f].toString(2)}. Those bodies ` +
                    'live at module scope precisely because derivation j reads field j alone; if ' +
                    'the declaration no longer has that shape they would mark the wrong derivation ' +
                    'and every ladder table would be measuring the wrong commit.'
            );
        }
    }
};

const makeLadderMachinePack = (n: number): TExoLadderMachinePack => {
    let ops!: TExoLadderMachineOps;
    const component_SCHEMA5 = createExoSchema(buildLadderRow);
    const mComponent5 = createExoMachine<TExoDomNode, TExoLadderHandle<TExoLadderMachineState>>(
        component_SCHEMA5,
        {
            createInitialState: (c, handle) => {
                // ONE OBJECT AND ONE ONE-SLOT PENDING TABLE PER INSTANCE, at one declared
                // transition exactly as at sixteen.
                const state: TExoLadderMachineState = {
                    ...ladderFieldsOf(handle.seed),
                    managedState: [0],
                    portTable: c.portTable(),
                    portWrite: c.portNodeWriter(),
                    attr: exoDetachedWrite,
                    text: exoDetachedWrite,
                    unsafeHtml: exoDetachedWrite,
                };
                handle.state = state;
                fillExoMachineDerivations(program, state);
            },
        }
    );
    // MODULE LOAD, ONCE, SHARED BY EVERY INSTANCE: the program, and the rung's transitions.
    const program = compileExoMachine<TExoLadderMachineState>({
        fields: LADDER_FIELDS,
        pendingRow: PENDING_ROW,
        derivations: LADDER_TEXT.map((compute, at) => ({
            label: `d${at}`,
            reads: [LADDER_FIELD[at]],
            into: component_SCHEMA5.ports.out[at],
            compute: compute,
        })),
    });
    ladderCheckMarks(`machine·n${n}`, program);
    const calls: ((state: TExoLadderMachineState, v: number) => void)[] = [];
    for (let j = 0; j < n; j++) {
        calls.push(exoTransition<TExoLadderMachineState, number>(program, LADDER_BODY[j]));
    }
    ops = { program, calls };
    const component = mComponent5;
    return { component, ops };
};

const makeLadderMachineShell = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA23 = createExoSchema(buildLadderShell);
    const mMachine23 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA23, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA23.ports.rows, row, LADDER_MACHINE_DATA);
        },
    });
    return mMachine23;
};

// ── THE WIRE ARM — twenty-one doors, written out, because a door closes over its instance ────

/** What the driver may do to one wired row at this rung: call door `j`. ONE ARRAY PER INSTANCE. */
type TExoLadderDoors = readonly ((v: number) => void)[];

let LADDER_WIRE_DATA: readonly TExoLadderHandle<TExoLadderDoors>[] = [];

/**
 * RUNG 1 — one door. Fifteen fields are `const` because nothing here writes them; see caveat (4).
 *
 * THE FILL IS SIXTEEN LINES AND IS THE SAME SIXTEEN AT EVERY RUNG, so it is a constant addend that
 * lands in the level of this arm's mount rows and not in their slope.
 */
const makeLadderWireN1 = (): TExoDomMachine => {
    const MACHINE_SCHEMA24 = createExoSchema(buildLadderRow);
    const mMachine24 = createExoMachine<TExoDomNode, TExoLadderHandle<TExoLadderDoors>>(
        MACHINE_SCHEMA24,
        {
            createInitialState: (c, handle) => {
                const seed = handle.seed;
                let t0 = seed[0];
                const t1 = seed[1];
                const t2 = seed[2];
                const t3 = seed[3];
                const t4 = seed[4];
                const t5 = seed[5];
                const t6 = seed[6];
                const t7 = seed[7];
                const t8 = seed[8];
                const t9 = seed[9];
                const t10 = seed[10];
                const t11 = seed[11];
                const t12 = seed[12];
                const t13 = seed[13];
                const t14 = seed[14];
                const t15 = seed[15];
                c.text(out[0], LADDER_TEXT[0](t0));
                c.text(out[1], LADDER_TEXT[1](t1));
                c.text(out[2], LADDER_TEXT[2](t2));
                c.text(out[3], LADDER_TEXT[3](t3));
                c.text(out[4], LADDER_TEXT[4](t4));
                c.text(out[5], LADDER_TEXT[5](t5));
                c.text(out[6], LADDER_TEXT[6](t6));
                c.text(out[7], LADDER_TEXT[7](t7));
                c.text(out[8], LADDER_TEXT[8](t8));
                c.text(out[9], LADDER_TEXT[9](t9));
                c.text(out[10], LADDER_TEXT[10](t10));
                c.text(out[11], LADDER_TEXT[11](t11));
                c.text(out[12], LADDER_TEXT[12](t12));
                c.text(out[13], LADDER_TEXT[13](t13));
                c.text(out[14], LADDER_TEXT[14](t14));
                c.text(out[15], LADDER_TEXT[15](t15));
                const ports = c.fillDoors();
                const d0 = (v: number): void => {
                    LADDER_SEEN_WIRE_N1[0]++;
                    t0 = LADDER_MIX[0](v, t0);
                    ports.text(out[0], LADDER_TEXT[0](t0));
                };
                handle.state = [d0];
            },
        }
    );
    const out = MACHINE_SCHEMA24.ports.out;
    return mMachine24;
};

/** RUNG 4 — four doors, written out. */
const makeLadderWireN4 = (): TExoDomMachine => {
    const MACHINE_SCHEMA25 = createExoSchema(buildLadderRow);
    const mMachine25 = createExoMachine<TExoDomNode, TExoLadderHandle<TExoLadderDoors>>(
        MACHINE_SCHEMA25,
        {
            createInitialState: (c, handle) => {
                const seed = handle.seed;
                let t0 = seed[0];
                let t1 = seed[1];
                let t2 = seed[2];
                let t3 = seed[3];
                const t4 = seed[4];
                const t5 = seed[5];
                const t6 = seed[6];
                const t7 = seed[7];
                const t8 = seed[8];
                const t9 = seed[9];
                const t10 = seed[10];
                const t11 = seed[11];
                const t12 = seed[12];
                const t13 = seed[13];
                const t14 = seed[14];
                const t15 = seed[15];
                c.text(out[0], LADDER_TEXT[0](t0));
                c.text(out[1], LADDER_TEXT[1](t1));
                c.text(out[2], LADDER_TEXT[2](t2));
                c.text(out[3], LADDER_TEXT[3](t3));
                c.text(out[4], LADDER_TEXT[4](t4));
                c.text(out[5], LADDER_TEXT[5](t5));
                c.text(out[6], LADDER_TEXT[6](t6));
                c.text(out[7], LADDER_TEXT[7](t7));
                c.text(out[8], LADDER_TEXT[8](t8));
                c.text(out[9], LADDER_TEXT[9](t9));
                c.text(out[10], LADDER_TEXT[10](t10));
                c.text(out[11], LADDER_TEXT[11](t11));
                c.text(out[12], LADDER_TEXT[12](t12));
                c.text(out[13], LADDER_TEXT[13](t13));
                c.text(out[14], LADDER_TEXT[14](t14));
                c.text(out[15], LADDER_TEXT[15](t15));
                const ports = c.fillDoors();
                const d0 = (v: number): void => {
                    LADDER_SEEN_WIRE_N4[0]++;
                    t0 = LADDER_MIX[0](v, t0);
                    ports.text(out[0], LADDER_TEXT[0](t0));
                };
                const d1 = (v: number): void => {
                    LADDER_SEEN_WIRE_N4[1]++;
                    t1 = LADDER_MIX[1](v, t1);
                    ports.text(out[1], LADDER_TEXT[1](t1));
                };
                const d2 = (v: number): void => {
                    LADDER_SEEN_WIRE_N4[2]++;
                    t2 = LADDER_MIX[2](v, t2);
                    ports.text(out[2], LADDER_TEXT[2](t2));
                };
                const d3 = (v: number): void => {
                    LADDER_SEEN_WIRE_N4[3]++;
                    t3 = LADDER_MIX[3](v, t3);
                    ports.text(out[3], LADDER_TEXT[3](t3));
                };
                handle.state = [d0, d1, d2, d3];
            },
        }
    );
    const out = MACHINE_SCHEMA25.ports.out;
    return mMachine25;
};

/** RUNG 16 — sixteen doors, written out. This is the row P24 is about. */
const makeLadderWireN16 = (): TExoDomMachine => {
    const MACHINE_SCHEMA26 = createExoSchema(buildLadderRow);
    const mMachine26 = createExoMachine<TExoDomNode, TExoLadderHandle<TExoLadderDoors>>(
        MACHINE_SCHEMA26,
        {
            createInitialState: (c, handle) => {
                const seed = handle.seed;
                let t0 = seed[0];
                let t1 = seed[1];
                let t2 = seed[2];
                let t3 = seed[3];
                let t4 = seed[4];
                let t5 = seed[5];
                let t6 = seed[6];
                let t7 = seed[7];
                let t8 = seed[8];
                let t9 = seed[9];
                let t10 = seed[10];
                let t11 = seed[11];
                let t12 = seed[12];
                let t13 = seed[13];
                let t14 = seed[14];
                let t15 = seed[15];
                c.text(out[0], LADDER_TEXT[0](t0));
                c.text(out[1], LADDER_TEXT[1](t1));
                c.text(out[2], LADDER_TEXT[2](t2));
                c.text(out[3], LADDER_TEXT[3](t3));
                c.text(out[4], LADDER_TEXT[4](t4));
                c.text(out[5], LADDER_TEXT[5](t5));
                c.text(out[6], LADDER_TEXT[6](t6));
                c.text(out[7], LADDER_TEXT[7](t7));
                c.text(out[8], LADDER_TEXT[8](t8));
                c.text(out[9], LADDER_TEXT[9](t9));
                c.text(out[10], LADDER_TEXT[10](t10));
                c.text(out[11], LADDER_TEXT[11](t11));
                c.text(out[12], LADDER_TEXT[12](t12));
                c.text(out[13], LADDER_TEXT[13](t13));
                c.text(out[14], LADDER_TEXT[14](t14));
                c.text(out[15], LADDER_TEXT[15](t15));
                const ports = c.fillDoors();
                const d0 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[0]++;
                    t0 = LADDER_MIX[0](v, t0);
                    ports.text(out[0], LADDER_TEXT[0](t0));
                };
                const d1 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[1]++;
                    t1 = LADDER_MIX[1](v, t1);
                    ports.text(out[1], LADDER_TEXT[1](t1));
                };
                const d2 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[2]++;
                    t2 = LADDER_MIX[2](v, t2);
                    ports.text(out[2], LADDER_TEXT[2](t2));
                };
                const d3 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[3]++;
                    t3 = LADDER_MIX[3](v, t3);
                    ports.text(out[3], LADDER_TEXT[3](t3));
                };
                const d4 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[4]++;
                    t4 = LADDER_MIX[4](v, t4);
                    ports.text(out[4], LADDER_TEXT[4](t4));
                };
                const d5 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[5]++;
                    t5 = LADDER_MIX[5](v, t5);
                    ports.text(out[5], LADDER_TEXT[5](t5));
                };
                const d6 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[6]++;
                    t6 = LADDER_MIX[6](v, t6);
                    ports.text(out[6], LADDER_TEXT[6](t6));
                };
                const d7 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[7]++;
                    t7 = LADDER_MIX[7](v, t7);
                    ports.text(out[7], LADDER_TEXT[7](t7));
                };
                const d8 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[8]++;
                    t8 = LADDER_MIX[8](v, t8);
                    ports.text(out[8], LADDER_TEXT[8](t8));
                };
                const d9 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[9]++;
                    t9 = LADDER_MIX[9](v, t9);
                    ports.text(out[9], LADDER_TEXT[9](t9));
                };
                const d10 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[10]++;
                    t10 = LADDER_MIX[10](v, t10);
                    ports.text(out[10], LADDER_TEXT[10](t10));
                };
                const d11 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[11]++;
                    t11 = LADDER_MIX[11](v, t11);
                    ports.text(out[11], LADDER_TEXT[11](t11));
                };
                const d12 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[12]++;
                    t12 = LADDER_MIX[12](v, t12);
                    ports.text(out[12], LADDER_TEXT[12](t12));
                };
                const d13 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[13]++;
                    t13 = LADDER_MIX[13](v, t13);
                    ports.text(out[13], LADDER_TEXT[13](t13));
                };
                const d14 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[14]++;
                    t14 = LADDER_MIX[14](v, t14);
                    ports.text(out[14], LADDER_TEXT[14](t14));
                };
                const d15 = (v: number): void => {
                    LADDER_SEEN_WIRE_N16[15]++;
                    t15 = LADDER_MIX[15](v, t15);
                    ports.text(out[15], LADDER_TEXT[15](t15));
                };
                handle.state = [
                    d0,
                    d1,
                    d2,
                    d3,
                    d4,
                    d5,
                    d6,
                    d7,
                    d8,
                    d9,
                    d10,
                    d11,
                    d12,
                    d13,
                    d14,
                    d15,
                ];
            },
        }
    );
    const out = MACHINE_SCHEMA26.ports.out;
    return mMachine26;
};

const makeLadderWireRow = (n: number): TExoDomMachine => {
    if (n === 1) return makeLadderWireN1();
    if (n === 4) return makeLadderWireN4();
    if (n === 16) return makeLadderWireN16();
    return refuse(
        `machine-vs-cells: the ladder has no WIRE row written out for rung ${n}. A wire's doors ` +
            'close over the instance and cannot be shared between rungs, so a new rung needs its ' +
            'doors WRITTEN OUT — building them in a loop would give the rung one compiled body ' +
            'instantiated n times, which is not what n declared transitions cost.'
    );
};

const makeLadderWireShell = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA27 = createExoSchema(buildLadderShell);
    const mMachine27 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA27, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA27.ports.rows, row, LADDER_WIRE_DATA);
        },
    });
    return mMachine27;
};

// ── THE TWO LIBRARY ARMS AS PROGRAMS ─────────────────────────────────────────────────────────
//
// THE LOADS PER CALL ARE THE SAME COUNT ON BOTH, and that is worth stating rather than assuming. The
// machine's driver does one array load (`calls[j]`) and one (`states[i]`, hoisted); the wire's does
// one array load for the instance's door array (hoisted) and one for the door (`d[j]`). What differs
// between the two rows is on the other side of the call and nowhere in the driver.

const ladderMachineProgram = (
    name: string,
    n: number,
    pack: TExoLadderMachinePack
): TExoLadderProgram => {
    const shell = makeLadderMachineShell(pack.component);
    return {
        name,
        what:
            `THE MACHINE @exodra/core SHIPS, DECLARING ${n} TRANSITION(S) — the program (16 fields, ` +
            '16 derivations, the inverted table) and every transition are built ONCE PER COMPONENT ' +
            'at module load, and the instance travels as an argument. Its per-instance cost does ' +
            'not know the rung.',
        allocs:
            '1 state object + 1 one-slot pending table — at EVERY rung; the port table, the ' +
            'schema`s write and `set` are references on it',
        rung: n,
        prepare: () => {
            const handles: TExoLadderHandle<TExoLadderMachineState>[] = LADDER_SEEDS.map(
                (seed, row) => ({ seed, row, state: null })
            );
            return (parent) => {
                LADDER_MACHINE_DATA = handles;
                const off = EXO_BACKEND.render(shell, parent);
                return {
                    driver: () => {
                        const states = statesOf<
                            TExoLadderHandle<TExoLadderMachineState>,
                            TExoLadderMachineState
                        >(handles, (h) => h.state, name);
                        const calls = pack.ops.calls;
                        return {
                            call: (k) => {
                                for (let i = 0; i < states.length; i++) {
                                    const s = states[i];
                                    for (let j = 0; j < calls.length; j++) {
                                        calls[j](s, ladderAt(k, i, j));
                                    }
                                }
                            },
                        };
                    },
                    off,
                };
            };
        },
    };
};

const ladderWireProgram = (name: string, n: number, row: TExoDomMachine): TExoLadderProgram => {
    const shell = makeLadderWireShell(row);
    return {
        name,
        what:
            `NO MACHINE AND NO CELL, WITH ${n} DOOR(S) — state in 16 closure variables, ` +
            '`c.fillDoors()` taken once, and one handler PER TRANSITION made INSIDE the wire, over this ' +
            'instance. No transition, no mark, no commit, no derivation table — and one closure per ' +
            'door per instance, which is what the rung multiplies.',
        allocs:
            `1 c.fillDoors() wrapper + ${n} door closure(s) + 1 array carrying them + the closure ` +
            'context the doors capture — ALL PER INSTANCE, and all linear in the rung',
        rung: n,
        prepare: () => {
            const handles: TExoLadderHandle<TExoLadderDoors>[] = LADDER_SEEDS.map((seed, row_) => ({
                seed,
                row: row_,
                state: null,
            }));
            return (parent) => {
                LADDER_WIRE_DATA = handles;
                const off = EXO_BACKEND.render(shell, parent);
                return {
                    driver: () => {
                        const doors = statesOf<TExoLadderHandle<TExoLadderDoors>, TExoLadderDoors>(
                            handles,
                            (h) => h.state,
                            name
                        );
                        return {
                            call: (k) => {
                                for (let i = 0; i < doors.length; i++) {
                                    const d = doors[i];
                                    for (let j = 0; j < d.length; j++) d[j](ladderAt(k, i, j));
                                }
                            },
                        };
                    },
                    off,
                };
            };
        },
    };
};

// ── THE FIELDS ───────────────────────────────────────────────────────────────────────────────

const LADDER_WIRE_N1 = ladderWireProgram('wire·n1', 1, makeLadderWireRow(1));
const LADDER_WIRE_N1_TWIN = ladderWireProgram('wire·n1·twin', 1, makeLadderWireRow(1));
const LADDER_WIRE_N4 = ladderWireProgram('wire·n4', 4, makeLadderWireRow(4));
const LADDER_WIRE_N4_TWIN = ladderWireProgram('wire·n4·twin', 4, makeLadderWireRow(4));
const LADDER_WIRE_N16 = ladderWireProgram('wire·n16', 16, makeLadderWireRow(16));
const LADDER_WIRE_N16_TWIN = ladderWireProgram('wire·n16·twin', 16, makeLadderWireRow(16));

const LADDER_MACHINE_N1 = ladderMachineProgram('machine·n1', 1, makeLadderMachinePack(1));
const LADDER_MACHINE_N1_TWIN = ladderMachineProgram('machine·n1·twin', 1, makeLadderMachinePack(1));
const LADDER_MACHINE_N4 = ladderMachineProgram('machine·n4', 4, makeLadderMachinePack(4));
const LADDER_MACHINE_N4_TWIN = ladderMachineProgram('machine·n4·twin', 4, makeLadderMachinePack(4));
const LADDER_MACHINE_N16 = ladderMachineProgram('machine·n16', 16, makeLadderMachinePack(16));
const LADDER_MACHINE_N16_TWIN = ladderMachineProgram(
    'machine·n16·twin',
    16,
    makeLadderMachinePack(16)
);

/** Every wire and machine row, by rung — what the gate walks and what the call tables are built from. */
const LADDER_BY_RUNG: readonly (readonly [number, readonly TExoLadderProgram[]])[] = [
    [1, [LADDER_WIRE_N1, LADDER_WIRE_N1_TWIN, LADDER_MACHINE_N1, LADDER_MACHINE_N1_TWIN]],
    [4, [LADDER_WIRE_N4, LADDER_WIRE_N4_TWIN, LADDER_MACHINE_N4, LADDER_MACHINE_N4_TWIN]],
    [16, [LADDER_WIRE_N16, LADDER_WIRE_N16_TWIN, LADDER_MACHINE_N16, LADDER_MACHINE_N16_TWIN]],
];

/**
 * TABLE 11's field — ONE floor row and both arms at all three rungs.
 *
 * ONE FLOOR ROW FOR THREE RUNGS, AND IT IS A PROPERTY OF THE FLOOR RATHER THAN A SHORTCUT: a
 * straight-line program's transitions are module-level functions taking the instance as an argument,
 * so its mount cannot know how many of them exist. That row being flat in the rung is the null
 * hypothesis the wire's mount is tested against.
 */
const LADDER_MOUNT_FIELD: readonly TExoLadderProgram[] = [
    ladderFloorProgram(LADDER_TOP),
    ...LADDER_BY_RUNG.flatMap(([, rows]) => rows),
];

/** One call table's field — that rung's four rows, and THAT RUNG'S OWN FLOOR. */
const ladderCallField = (n: number): readonly TExoLadderProgram[] => {
    const found = LADDER_BY_RUNG.find(([rung]) => rung === n);
    if (found === undefined) {
        refuse(`machine-vs-cells: the ladder has no rows declared for rung ${n}.`);
    }
    return [ladderFloorProgram(n), ...found[1]];
};

const APP_FIELD: readonly TExoAppProgram[] = [APP_NATIVE, APP_B, APP_B_TWIN, APP_C, APP_C_TWIN];

/** TABLE 5's field. */
const WIDE_MOUNT_FIELD: readonly TExoWideProgram[] = [
    WIDE_NATIVE,
    WIDE_B,
    WIDE_B_TWIN,
    WIDE_C,
    WIDE_C_TWIN,
    WIDE_C_TBL,
    WIDE_C_TBL_TWIN,
    WIDE_C_SHR,
    WIDE_C_SHR_TWIN,
    // AND THE WIRE, WHICH IS ON THE MOUNT TABLE FOR THE REASON THE NARROW ONE IS ON TABLE 1: five
    // allocations per instance against `machine`'s one is a MOUNT cost and no update table can see it.
    WIDE_WIRE,
    WIDE_WIRE_TWIN,
    // AND THE MACHINE'S CHEAP SPELLING, BESIDE THEM, for the same reason and one more: it is the
    // only row here whose INITIAL PAINT comes from a seed rather than from a fill or a wire body,
    // and the mount is the only table that can see what that costs.
    WIDE_DIRECT,
    WIDE_DIRECT_TWIN,
];

/** TABLES 6, 7 and 8's field. */
const WIDE_UPDATE_FIELD: readonly TExoWideProgram[] = [
    WIDE_NATIVE,
    WIDE_B,
    WIDE_B_TWIN,
    WIDE_C,
    WIDE_C_TWIN,
    WIDE_C_TBL,
    WIDE_C_TBL_TWIN,
    WIDE_C_SHR,
    WIDE_C_SHR_TWIN,
    WIDE_WIRE,
    WIDE_WIRE_TWIN,
    WIDE_DIRECT,
    WIDE_DIRECT_TWIN,
];

const B = machineProgram(
    'machine·scan',
    'THE SCANNING MACHINE (form B) — derivations and their field masks declared once per component, and a commit that SCANS EVERY DECLARED ONE and tests its mask: O(declared). THREE objects per instance — state, machine, c.fillDoors().',
    SHELL_B
);
const B_TWIN = machineProgram(
    'machine·scan·twin',
    'THE NULL FOR THE SCANNING SHAPE — a SECOND, separately declared, identical `machine·scan` with its own derivation array. True Δ = 0.',
    SHELL_B_TWIN
);

const C = compiledProgram(
    'machine',
    'THE MACHINE `@exodra/core` SHIPS (form C) — derivations DECLARED, the field→derivations table inverted ONCE at module load, and a commit that walks only the AFFECTED ones: O(affected). ONE object per instance; its port table and the schema`s write are references ON it, not allocations.',
    SHELL_C,
    PACK_C.ops
);
const C_TWIN = compiledProgram(
    'machine·twin',
    'THE NULL FOR THE MACHINE SHAPE — a SECOND, separately declared, identical `machine` with its own compiled program. True Δ = 0.',
    SHELL_C_TWIN,
    PACK_C_TWIN.ops
);
// `C_BATCH` (`machine·batch`) STOOD HERE and is deleted, not converted — the mechanism it priced was
// removed from `@exodra/core` and the per-instance door that replaced it has nothing to coalesce in
// any scene this file drives. The block that stands where `machineBatchedDriver` used to says why,
// and says what the axis lost by it.
const C_DIRECT = directProgram(
    'machine·copy',
    'A HAND-COPIED COMMIT, NOT THE SHIPPED ONE — the machine`s program with writer+slot flattened PER DERIVATION at the first wire: a COPY of the shipped commit with the write swapped AND FOUR THINGS OMITTED: the effect-mask split, the per-derivation `ports[i]` load and null branch, `exoTransition`s two calls (this list said "two calls and batch test" until the shipped closure lost that test), and the driver`s property load per tag. ITS GAP TO `machine` IS NOT THE PRICE OF THE WRITE — `machine·write` is that row. IT USED TO BE READ AGAINST `machine·bound`, which omitted the identical four; that row is STRUCK with the library feature under it, so this one now has no partner against which its gap is purely a write.'
);
// `C_BOUND` (`machine·bound`) AND `C_BOUND_TWIN` STOOD HERE and are deleted, not converted — the
// library feature they priced, `c.portWriter(port)`, was removed from every backend after
// it converged 0.655 ns per write ABOVE `c.set` (bare shapes, 1000 instances × 5 ports, null pair
// 0.006 ns) because the function it handed back cost a call frame the hand-out could not amortise.
// The block that stands where `makeBoundPack` used to says what the axis lost by it.

// ── THE ROW THAT ISOLATES THE WRITE, AND THE ROW THAT HAS NO MACHINE AT ALL ──────────────────

const C_WRITE = compiledProgram(
    'machine·write',
    'THE SHIPPED COMMIT WITH ONE LINE CHANGED — `writers[i](table[slots[i]], value, writeData[i])` where `machine` writes `write(table, port, value)`. It keeps the effect-mask split, the `ports[i]` load, the null branch, the store path, the `after` OR, `exoTransition`s wrapper and `compiledDriver` ITSELF, so its gap to `machine` is attributable to that line and to nothing else. THIS IS THE ROW `machine·copy` (and the struck `machine·bound`) WAS MISTAKEN FOR.',
    SHELL_C_WRITE,
    PACK_C_WRITE.ops
);
const C_WRITE_TWIN = compiledProgram(
    'machine·write·twin',
    'THE NULL FOR THE ONE-LINE SHAPE — a SECOND, separately declared, identical `machine·write` (own component, own compiled program). True Δ = 0.',
    SHELL_C_WRITE_TWIN,
    PACK_C_WRITE_TWIN.ops
);
const WIRE = wireProgram(
    'wire',
    'NO MACHINE AND NO CELL — state in four CLOSURE VARIABLES, `const ports = c.fillDoors()` taken once at the wire, and one handler per transition, each recomputing its own derived value and writing it with `ports.set`. No transition, no mask, no pending word, no commit, no derivation table — and no batch, no declaration and no ordering either. This is `apps/exodra/exodra.tsx`s card wire on this component, and it is the shape every other row on this axis is an alternative to.',
    SHELL_WIRE
);
const WIRE_TWIN = wireProgram(
    'wire·twin',
    'THE NULL FOR THE WIRED SHAPE — a SECOND, separately declared, identical `wire` (own component, own declaration, own compiled schema). True Δ = 0.',
    SHELL_WIRE_TWIN
);

// ── THE STATE-SHAPE ROWS, AND THE TWO SPELLING ROWS ──────────────────────────────────────────
//
// `machine` IS VARIANT 1 AND IS NOT REPEATED. It is the shipped object-with-named-fields machine, already
// standing on every table above, and these rows are read against it. Nothing here re-implements it.

const C_TBL = tableProgram(
    'machine·array',
    'THE MACHINE WITH ITS STATE IN ITS OWN FLAT ARRAY (state shape 2) — the four fields numbered from zero in an array the tag owns. Same program, same commit, same port write; a field`s reader is cells[f]. TWO allocations per instance where the object form makes one.',
    SHELL_C_TBL,
    PACK_C_TBL
);
const C_TBL_TWIN = tableProgram(
    'machine·array·twin',
    'THE NULL FOR THE OWN-ARRAY SHAPE — a SECOND, separately declared, identical `machine·array` (own program). True Δ = 0.',
    SHELL_C_TBL_TWIN,
    PACK_C_TBL_TWIN
);
const C_SHR = tableProgram(
    'machine·nodes',
    'THE MACHINE WITH ITS STATE IN THE NODE ARRAY (state shape 3) — the four fields APPENDED onto the tag`s own node table, ONE numbering for markup ports and state together. ONE allocation per instance, and every port write of every round now reads that mixed array.',
    SHELL_C_SHR,
    PACK_C_SHR
);
const C_SHR_TWIN = tableProgram(
    'machine·nodes·twin',
    'THE NULL FOR THE NODE-ARRAY SHAPE — a SECOND, separately declared, identical `machine·nodes` (own program). True Δ = 0.',
    SHELL_C_SHR_TWIN,
    PACK_C_SHR_TWIN
);
const C_HAND = compiledProgram(
    'machine·handle',
    'THE MACHINE WITH PER-FIELD HANDLES (transition spelling 2) — one closure per field doing its store AND its mark, so the two can no longer be written apart. Same state, same program; the price is one call per field written and no allocation at any arity.',
    SHELL_C_HAND,
    PACK_C_HAND.ops
);
const C_TUPLE = compiledProgram(
    'machine·tuple',
    'THE MACHINE WITH A DECLARED TUPLE (transition spelling 3) — the transition declares the fields it writes, `by` hands back their values and the machine scatters them, ORing a mark merged at declaration. A BARE VALUE at arity one (TABLE 2) and ONE ARRAY PER CALL at arity two (TABLE 3).',
    SHELL_C_TUPLE,
    PACK_C_TUPLE.ops
);

/**
 * TABLE 1's field. NOT THE TWO SPELLING ROWS: `machine`, `machine·handle` and `machine·tuple` build the identical state
 * object through the identical wire and differ only inside a transition, so a mount table could
 * only print the same number three times. The two STATE-SHAPE rows ARE here, because allocation
 * shape is exactly what they differ in — AND SO IS `wire`, for the same reason and more sharply:
 * it allocates SEVEN THINGS PER
 * INSTANCE against `machine`'s two, because a wire's door is a closure over the instance and a machine's
 * transition is declared once per component. THIS IS THE ONLY TABLE ON WHICH IT IS CHARGED AT
 * ALL, and a reader who takes the update tables alone is reading half of that row. (`machine·bound`
 * stood here for the same reason and more sharply still — a closure PER WRITTEN PORT — and is struck
 * with the library method it was the only participant for.) `machine·write` is
 * here because every row that stands beside `machine` on an update table has to stand beside it here too
 * — its mount is `machine`'s mount plus one flatten pass of two derivations at the FIRST wire, and the
 * number is what says so.
 */
const MOUNT_FIELD: readonly TExoProgram[] = [
    NATIVE,
    B,
    B_TWIN,
    C,
    C_TWIN,
    C_DIRECT,
    C_WRITE,
    C_WRITE_TWIN,
    WIRE,
    WIRE_TWIN,
    C_TBL,
    C_TBL_TWIN,
    C_SHR,
    C_SHR_TWIN,
];

/** The update tables' field — the same participants plus the shape and spelling rows. */
const UPDATE_FIELD: readonly TExoProgram[] = [
    NATIVE,
    B,
    B_TWIN,
    C,
    C_TWIN,
    C_DIRECT,
    C_WRITE,
    C_WRITE_TWIN,
    WIRE,
    WIRE_TWIN,
    C_TBL,
    C_TBL_TWIN,
    C_SHR,
    C_SHR_TWIN,
    C_HAND,
    C_TUPLE,
];

/**
 * THE TWO COLUMN WIDTHS EVERY TABLE PRINTS ITS NAMES IN, MEASURED OFF THE NAMES THEMSELVES.
 *
 * They were literals (11 and 12) and the names had already outgrown them before this rename —
 * `C·direct·twin` is 13. They are now 23 (`machine·imperative·twin`) and 18
 * (`machine·imperative`). AN OVERFLOWING NAME IS NOT COSMETIC IN THE NULL BLOCK:
 * `run-one-axis.js`'s `NULL_ROW` is `^\s*(\S+)\s+(\d+\.\d{6})…`, so a name that eats its own
 * padding prints `machine·imperative0.000000` with NO SPACE, the line stops matching, and the
 * recording silently loses the block that says what the instrument could not tell apart.
 * DERIVING THE WIDTHS MEANS A RENAME CAN NEVER REINTRODUCE THAT.
 *
 * `NULL_COL` is sized off the NON-TWIN names because a null is named after the row it doubles and
 * never after the twin — see `printTable`, which prints `|X − X·twin|` from the row's own name.
 */
const ALL_ROW_NAMES: readonly string[] = [
    ...MOUNT_FIELD,
    ...UPDATE_FIELD,
    ...WIDE_MOUNT_FIELD,
    ...WIDE_UPDATE_FIELD,
    ...APP_FIELD,
    // AND THE LADDER'S, which are the longest twin names on the axis after `machine·imperative·twin`
    // — included for the reason the block above gives: a name that outgrows its padding silently
    // stops matching `run-one-axis.js`'s `NULL_ROW` and the recording loses the null block.
    ...LADDER_MOUNT_FIELD,
].map((p) => p.name);
const ROW_COL = Math.max(...ALL_ROW_NAMES.map((n) => n.length)) + 2;
const NULL_COL =
    Math.max(...ALL_ROW_NAMES.filter((n) => !n.endsWith('·twin')).map((n) => n.length)) + 2;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE LEGEND — WHAT EACH ROW NAME IS, PRINTED ONCE, ABOVE EVERYTHING
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THIS AXIS PRINTS FOURTEEN TABLES AND A GREAT DEAL OF PROSE, AND UNTIL THIS BLOCK IT PRINTED NO PLACE
// TO LOOK UP A ROW. A row's caption stands beside its number and says what that row is; the legend
// is the one place all of them stand together, in the order the argument builds them, so a reader
// who has been handed a table can decode every line of it without opening this file.
//
// WHICH TABLES A ROW APPEARS ON IS DERIVED, never written down. A row that is added to a field or
// dropped from one changes this line by itself, which is the only way a legend stays true.

/** The tables a row is declared on, read off the fields themselves. */
function tablesOf(name: string): string {
    const where: string[] = [];
    const declares = (f: ReadonlyArray<{ readonly name: string }>): boolean =>
        f.some((p) => p.name === name);
    if (declares(MOUNT_FIELD)) where.push('1');
    if (declares(UPDATE_FIELD)) where.push('2-4');
    if (declares(WIDE_MOUNT_FIELD)) where.push('5');
    if (declares(WIDE_UPDATE_FIELD)) where.push('6-8');
    if (declares(APP_FIELD)) where.push('9-10');
    // THE LADDER'S ROWS. Its mount field carries every rung, so a `wire·n4` line reads `[TABLES 11,
    // 12-14]` and a reader is never left guessing which rung a table number belongs to — the table
    // titles carry the rung by name.
    if (declares(LADDER_MOUNT_FIELD)) where.push('11');
    if (LADDER_RUNGS.some((n) => declares(ladderCallField(n)))) where.push('12-14');
    return where.join(', ');
}

/**
 * ONE LINE PER ROW, LEADING WITH WHAT THE ROW IS.
 *
 * The order is the order the argument builds: the floor, then the two
 * machines the axis exists to compare, then the machine's own variants, then the row with no
 * machine at all. `·twin` is described once at the end rather than eight times.
 */
const LEGEND: readonly (readonly [string, string])[] = [
    [
        'floor',
        'THE FLOOR — a program with NO LIBRARY: it clones the subtree, holds its own Text nodes ' +
            'and writes `.data` directly. Every ratio on every table is against this row.',
    ],
    [
        'machine·scan',
        'THE SCANNING MACHINE (form B) — derivations declared once per component, and a commit ' +
            'that SCANS every declared one and tests its mask: O(declared). NOT SHIPPED; this ' +
            'axis exists to price it.',
    ],
    [
        'machine',
        'THE MACHINE `@exodra/core` SHIPS (form C) — derivations declared, the field→derivations ' +
            'table INVERTED once at load, and a commit that walks only the AFFECTED ones: ' +
            'O(affected). EVERY OTHER `machine·…` ROW IS A VARIANT OF THIS ONE.',
    ],
    // `machine·batch` HAD A LINE HERE AND HAS NONE: the row is gone, and a legend entry for a name no
    // field declares would print `[TABLES ]` — an empty list, which is exactly what `tablesOf` is
    // built to prevent anyone having to notice by hand.
    [
        'machine·imperative',
        'THE IMPERATIVE MACHINE — a machine that declares NO DERIVATION and NO FIELD at all: its ' +
            'transitions, declared once per component, write the ports themselves, and its state ' +
            'lives IN THE CACHE (`m.keep`, one object of named properties per instance) ' +
            'because a value nothing can wake on has no use for a field`s address.',
    ],
    [
        'machine·array',
        '`machine` WITH ITS STATE IN ITS OWN FLAT ARRAY (state shape 2) — two allocations per ' +
            'instance where the object form makes one. THE ROW THAT PRICES STORAGE ON ITS OWN, ' +
            'rules held fixed, which is what `machine·imperative` no longer needs it for.',
    ],
    [
        'machine·nodes',
        '`machine` WITH ITS STATE IN THE NODE ARRAY (state shape 3) — one allocation, one ' +
            'numbering for ports and state, and a mixed array read on every port write.',
    ],
    [
        'machine·handle',
        '`machine` WITH PER-FIELD HANDLES (transition spelling 2) — one closure per field doing ' +
            'its store AND its mark.',
    ],
    [
        'machine·tuple',
        '`machine` WITH A DECLARED TUPLE (transition spelling 3) — the transition declares the ' +
            'fields it writes and `by` hands back their values.',
    ],
    [
        'machine·write',
        'THE SHIPPED COMMIT WITH ONE LINE CHANGED — the port write swapped for the DOM`s own and ' +
            'EVERYTHING ELSE KEPT. THE ONLY ROW THAT PRICES THE WRITE ALONE.',
    ],
    [
        'machine·copy',
        'A HAND-COPIED COMMIT, NOT THE SHIPPED ONE — the write flattened AND FOUR OTHER THINGS ' +
            'OMITTED, so its gap to `machine` is NOT the price of a write.',
    ],
    // `machine·bound` HAD A LINE HERE AND HAS NONE: the row is gone with the library method it was
    // the only participant for, and a legend entry for a name no field declares would print
    // `[TABLES ]` — an empty list, which is exactly what `tablesOf` is built to prevent.
    [
        'wire',
        'NO MACHINE AND NO CELL — state in closure variables, `c.fillDoors()` taken once, ports ' +
            'written by hand, one handler per transition. THE SHAPE EVERY OTHER ROW HERE IS AN ' +
            'ALTERNATIVE TO.',
    ],
    // THE LADDER'S TWO FAMILIES, ONE LINE EACH AT THE TOP RUNG. The `·n⟨count⟩` suffix is explained
    // beside `·twin` at the bottom of `printLegend`, and every rung's row carries the same caption
    // with its own count — printing six near-identical lines here would bury the ten above them.
    [
        'wire·n16',
        '`wire` WITH SIXTEEN DECLARED TRANSITIONS (the ladder, TABLES 11 and 14) — sixteen doors ' +
            'written out, each a closure over THIS instance, so the per-instance allocation is ' +
            'linear in the count. `wire·n1` and `wire·n4` are the same shape at one and four.',
    ],
    [
        'machine·n16',
        '`machine` WITH SIXTEEN DECLARED TRANSITIONS (the ladder, TABLES 11 and 14) — sixteen ' +
            '`exoTransition`s declared ONCE PER COMPONENT over one shared program, the instance ' +
            'passed as an argument, so the per-instance allocation is ONE object at every count.',
    ],
];

function printLegend(): void {
    line('');
    line(
        'THE ROWS — WHAT EACH NAME IS. Every table below uses these names and nothing else; this ' +
            'is the one place they all stand together.'
    );
    for (const [name, what] of LEGEND) {
        line(`  ${name.padEnd(ROW_COL)}${what}  [TABLES ${tablesOf(name)}]`);
    }
    line(
        `  ${'…·twin'.padEnd(
            ROW_COL
        )}A SECOND, SEPARATELY DECLARED, IDENTICAL COPY of the row it ` +
            'names — its own component, its own declaration, its own compiled schema or derivation ' +
            'array. Its true difference from that row is ZERO, so what the run reports between a ' +
            'pair is what it CANNOT TELL APART FROM NOTHING. A DIFFERENCE BETWEEN TWO ROWS IS ' +
            "READ AGAINST THOSE TWO ROWS' OWN NULLS and against no others; a row with no twin has " +
            "no null, so a pair containing one is read against the table's RESOLUTION FLOOR, " +
            'which is the worst of all of them, and the line that prints it says which it was.'
    );
    line('');
    line(
        '  A NAME IS A BASE AND, AFTER `·`, A QUALIFIER ON IT: `machine·array` is `machine` with ' +
            'its state moved, `X·twin` is a second copy of X. ' +
            'THE PRICE OF COALESCING ON THE MACHINE SIDE IS UNMEASURED — not zero, not small. ' +
            'THE SEPARATOR IS U+00B7 MIDDLE DOT, the same one every other axis in this ' +
            'suite uses. `--only` CANNOT NARROW THIS AXIS — it is implemented in `abBench`, this ' +
            'file owns its own printer, and `run-one-axis.js` refuses the flag here by name.'
    );
    line(
        `  AND A THIRD QUALIFIER, ON THE LADDER'S ROWS ONLY: \`·n⟨count⟩\` is HOW MANY TRANSITIONS ` +
            `THAT COMPONENT DECLARES. \`wire·n4\` is the wired shape declaring four; ` +
            `\`machine·n16\` is the shipped machine declaring sixteen. The rungs are ` +
            `${LADDER_RUNGS.join(
                ', '
            )}, the count is the ONLY thing that moves between them, and ` +
            'TABLES 11 TO 14 are where the two shapes are priced against it. A ROW MAY NOT BE READ ' +
            'ACROSS RUNGS — a round at rung n makes n calls, so the scene itself grows — and the ' +
            'thing that may is the wire↔machine GAP, which both arms carry the growth inside.'
    );
    line(
        "  AND THE FILE'S PROSE NAMES THE THREE DESIGNS BY LETTER, where the tables name the " +
            'PARTICIPANTS: form B is `machine·scan`, form C is `machine`.'
    );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE GATE
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** A container's text, which `innerHTML` equality does not imply. See the header. */
function gateText(stage: string, who: string, reference: HTMLElement, subject: HTMLElement): void {
    const want = reference.textContent ?? '';
    const got = subject.textContent ?? '';
    sink += got.length;
    if (want === got) return;
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    refuse(
        `machine-vs-cells: ${who} shows DIFFERENT TEXT from the reference @ ${stage} — first ` +
            `difference at char ${at}\n  reference: …${want.slice(
                Math.max(0, at - 40),
                at + 60
            )}…` +
            `\n  ${who}   : …${got.slice(Math.max(0, at - 40), at + 60)}…`
    );
}

/** Fire a real bubbling click at every tag's button, the way a user's clicks arrive. */
function clickEveryTag(container: HTMLElement): void {
    const buttons = container.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
}

function gate(): void {
    line('');
    line(
        'GATE — every participant against the FLOOR, markup and text, at seven stages. It throws; a ' +
            'divergent participant never reaches the timer.'
    );

    const refContainer = el();
    const refMount = NATIVE.prepare()(refContainer);
    const refDriver = refMount.driver();

    interface Live {
        readonly name: string;
        readonly container: HTMLElement;
        readonly driver: TExoTagDriver;
        readonly off: () => void;
    }
    const live: Live[] = [];
    for (const p of UPDATE_FIELD) {
        if (p.name === NATIVE.name) continue;
        const container = el();
        const mounted = p.prepare()(container);
        live.push({ name: p.name, container, driver: mounted.driver(), off: mounted.off });
    }

    const check = (stage: string): void => {
        for (const s of live) {
            gateMarkup('machine-vs-cells', stage, s.name, refContainer, s.container);
            gateText(stage, s.name, refContainer, s.container);
        }
    };

    check('mount');

    refDriver.names(3);
    for (const s of live) s.driver.names(3);
    check('one field (name)');

    // ROUND 4 AND NOT 5, AND THE REASON IS THE GATE'S OWN POINT. `openAt(k, i)` is `((k + i) & 1)
    // === 1`, so at k = 5 it reproduces the seed's `(i & 1) === 0` exactly — every tag would be
    // written the `open` it already holds, `setValue` would dedupe it, and this stage would gate a
    // scene in which `open` never moved. At k = 4 it is the seed's negation for every tag, and the
    // previous stage (`names(3)`) left `open` at the seed.
    refDriver.nameAndOpen(4);
    for (const s of live) s.driver.nameAndOpen(4);
    check('two fields (name+open)');

    refDriver.widths(2);
    for (const s of live) s.driver.widths(2);
    check('the width signal');

    const beforeNotes = markupOf(refContainer);
    refDriver.notes(7);
    for (const s of live) s.driver.notes(7);
    check('a field nothing depends on (note)');
    if (markupOf(refContainer) !== beforeNotes) {
        refuse(
            "machine-vs-cells: writing `note` MOVED THE REFERENCE'S MARKUP. It is meant to be the " +
                'field no derivation reads, and TABLE 4 exists to price a write that reaches no ' +
                'port. Something now derives from it and that table is measuring the wrong thing.'
        );
    }

    // THE REFERENCE MUST MOVE. Without this, a run in which NO participant's click listener was
    // attached would agree perfectly with itself and pass every comparison above.
    const beforeClick = markupOf(refContainer);
    clickEveryTag(refContainer);
    for (const s of live) clickEveryTag(s.container);
    const afterClick = markupOf(refContainer);
    if (afterClick === beforeClick) {
        refuse(
            'machine-vs-cells: a real bubbling click on all ' +
                `${TAGS} of the FLOOR's buttons changed nothing in its markup. The floor's own ` +
                'listener is not attached, so the comparisons below would pass a field in which ' +
                'no participant has a live event port at all.'
        );
    }
    sink += afterClick.length;
    check('after a real click on every tag');

    clickEveryTag(refContainer);
    for (const s of live) clickEveryTag(s.container);
    check('after a second click restores it');

    line(
        `  the click moved the reference by ${Math.abs(afterClick.length - beforeClick.length)} ` +
            `char(s) of ${beforeClick.length}, and every participant followed it — so every event ` +
            'port in the field below is LIVE, checked rather than assumed.'
    );

    refMount.off();
    refContainer.remove();
    for (const s of live) {
        s.off();
        s.container.remove();
    }
}

/**
 * THE WIDE GATE — the same discipline on the wide component, at five stages.
 *
 * It is a SECOND gate and not an extra stage of the first because the two scenes have different
 * floors, different markup and different drivers. Its stages are: the mount, one field, three fields
 * at once (WHICH RUNS THE CHAIN), the field nothing reads, and one more round of the three-field
 * scene so that no participant is compared only on its first update.
 *
 * THE CHAIN IS CHECKED BY THE MARKUP AND NOT BY A FLAG. Derivations 18 and 19 show the intermediate
 * different ways — declared and stored (`machine`), recomputed by hand (`machine·scan`), computed once
 * in the caller (`floor`) — and the only thing that says they all
 * agree is that their nineteen strings are byte-identical.
 *
 * IT ALSO CHECKS THE ONE-OBJECT CLAIM STRUCTURALLY, which is the only claim on these tables that a
 * timing number cannot settle: every one of form C's rows must share ONE write function and hold its
 * OWN table. A shape that allocated a wrapper per instance would still print a number here; it would
 * not pass this.
 */
function wideGate(): void {
    line('');
    line(
        `WIDE GATE — every participant against the WIDE FLOOR, markup and text, at five stages, on ` +
            `${WIDE_ROWS} rows of ${WIDE_PORTS} ports.`
    );

    const refContainer = el();
    const refMount = WIDE_NATIVE.prepare()(refContainer);
    const refDriver = refMount.driver();

    interface WideLive {
        readonly name: string;
        readonly container: HTMLElement;
        readonly driver: TExoWideDriver;
        readonly off: () => void;
    }
    const live: WideLive[] = [];
    for (const p of WIDE_UPDATE_FIELD) {
        if (p.name === WIDE_NATIVE.name) continue;
        const container = el();
        const mounted = p.prepare()(container);
        live.push({ name: p.name, container, driver: mounted.driver(), off: mounted.off });
    }

    const check = (stage: string): void => {
        for (const s of live) {
            gateMarkup('machine-vs-cells/wide', stage, s.name, refContainer, s.container);
            gateText(stage, s.name, refContainer, s.container);
        }
    };

    check('wide mount');

    refDriver.one(3);
    for (const s of live) s.driver.one(3);
    check('wide one field (f2)');

    refDriver.some(5);
    for (const s of live) s.driver.some(5);
    check('wide three fields at once, INCLUDING THE CHAIN (f0, f2, f12)');

    const beforeNone = markupOf(refContainer);
    refDriver.none(9);
    for (const s of live) s.driver.none(9);
    check('wide field nothing reads (f19)');
    if (markupOf(refContainer) !== beforeNone) {
        refuse(
            'machine-vs-cells: writing the WIDE component`s f19 MOVED THE REFERENCE`S MARKUP. It ' +
                'is meant to be the field no derivation reads, and TABLE 8 exists to price a write ' +
                'that reaches no port at width. Something now derives from it.'
        );
    }

    refDriver.some(11);
    for (const s of live) s.driver.some(11);
    check('wide three fields again, so nothing is compared only on its first update');

    // THE CHAIN MOVED SOMETHING. Without this, a run in which derivations 18 and 19 were never woken
    // would have every participant agreeing that nothing happened.
    const chainWidth = markupOf(refContainer);
    sink += chainWidth.length;
    if (chainWidth === beforeNone) {
        refuse(
            'machine-vs-cells: the three-field round did not move the WIDE FLOOR`s markup, so the ' +
                'chain and the eight woken derivations reached no port and TABLE 7 would be ' +
                'measuring a scene in which nothing was derived.'
        );
    }

    refMount.off();
    refContainer.remove();
    for (const s of live) {
        s.off();
        s.container.remove();
    }
}

/**
 * THE APP GATE — the mixed tree against the floor's, at three stages.
 *
 * A THIRD gate for the reason there is a second: a different floor, different markup and a different
 * driver. Its stages are the mount and two mixed rounds, because a page that agreed at the mount and
 * diverged on the second update is the failure a single-round gate passes.
 */
function appGate(): void {
    line('');
    line(
        `APP GATE — every participant's whole tree against the FLOOR's: ${TAGS} narrow tags and ` +
            `${WIDE_ROWS} wide rows in two panes, markup and text, at three stages.`
    );

    const refContainer = el();
    const refMount = APP_NATIVE.prepare()(refContainer);
    const refDriver = refMount.driver();

    interface AppLive {
        readonly name: string;
        readonly container: HTMLElement;
        readonly driver: (k: number) => void;
        readonly off: () => void;
    }
    const live: AppLive[] = [];
    for (const p of APP_FIELD) {
        if (p.name === APP_NATIVE.name) continue;
        const container = el();
        const mounted = p.prepare()(container);
        live.push({ name: p.name, container, driver: mounted.driver(), off: mounted.off });
    }

    const check = (stage: string): void => {
        for (const s of live) {
            gateMarkup('machine-vs-cells/app', stage, s.name, refContainer, s.container);
            gateText(stage, s.name, refContainer, s.container);
        }
    };

    check('app mount');

    const beforeRound = markupOf(refContainer);
    refDriver(3);
    for (const s of live) s.driver(3);
    check('app round 3 (a name on every tag AND f2 on every row)');
    if (markupOf(refContainer) === beforeRound) {
        refuse(
            'machine-vs-cells: a mixed round changed nothing in the APP FLOOR`s markup, so TABLE ' +
                '10 would be timing a round in which no participant had anything to do.'
        );
    }

    refDriver(4);
    for (const s of live) s.driver(4);
    check('app round 4, so nothing is compared only on its first update');

    sink += markupOf(refContainer).length;

    refMount.off();
    refContainer.remove();
    for (const s of live) {
        s.off();
        s.container.remove();
    }
}

/**
 * THE LADDER GATE — byte identity per rung, AND the check that gives the ladder its meaning.
 *
 * A FOURTH gate for the reason there is a third: its own floor, its own markup, its own driver. Its
 * stages are the mount and two rounds, per rung, because a rung that agreed at the mount and diverged
 * on the second call is the failure a single-round gate passes.
 *
 * AND IT IS ALSO THE INVOKED-TRANSITION GATE, which is the part without which the whole ladder is
 * worthless and looks fine. A declared-but-never-called transition still ALLOCATES — its closure
 * escapes into a long-lived array — but its body is never compiled, so a rung of them would price
 * n allocations and n pre-parses rather than n working functions, and the error flatters the wire.
 * So for every arm at every rung this snapshots that arm's counter bank, runs EXACTLY ONE round of
 * that rung's driver, and refuses BY NAME unless the diff is:
 *
 *     transition j < n   called exactly LADDER_INSTANCES times
 *     transition j ≥ n   called not at all
 *
 * Then it ZEROES every bank, so that every count `ladderRegionGate` sees afterwards was made inside
 * a timed region and nowhere else.
 */
function ladderGate(): void {
    line('');
    line(
        `LADDER GATE — every arm against the LADDER FLOOR at rungs ${LADDER_RUNGS.join(', ')}: ` +
            `markup and text on ${LADDER_INSTANCES} rows of ${LADDER_PORTS} ports, and EVERY ` +
            'DECLARED TRANSITION CHECKED TO HAVE RUN.'
    );

    /** One participant's counter diff, checked against what its rung says it must be. */
    const checkInvoked = (who: string, bank: Int32Array, before: Int32Array, n: number): void => {
        for (let j = 0; j < LADDER_TOP; j++) {
            const ran = bank[j] - before[j];
            const want = j < n ? LADDER_INSTANCES : 0;
            if (ran === want) continue;
            refuse(
                `machine-vs-cells: \`${who}\` declares ${n} transition(s) and ONE ROUND over ` +
                    `${LADDER_INSTANCES} instances called transition ${j} ${ran} time(s) where it ` +
                    `must be called ${want}. A DECLARED TRANSITION THAT IS NEVER CALLED IS NOT ` +
                    'MEASURED: its closure is allocated but its body is never compiled, so a ' +
                    'ladder containing one prices an allocation and a pre-parse and reports it as ' +
                    'the price of a transition — and the error makes the WIRE look cheaper than it ' +
                    'is, which is the arm this ladder exists to charge. No table below may be ' +
                    'published until this rung calls every door it declares.'
            );
        }
    };

    for (const [n, rows] of LADDER_BY_RUNG) {
        const refContainer = el();
        const refProgram = ladderFloorProgram(n);
        const refMount = refProgram.prepare()(refContainer);
        const refDriver = refMount.driver();

        interface LadderLive {
            readonly name: string;
            readonly rung: number;
            readonly container: HTMLElement;
            readonly driver: TExoLadderDriver;
            readonly off: () => void;
        }
        const live: LadderLive[] = [];
        for (const p of rows) {
            const container = el();
            const mounted = p.prepare()(container);
            live.push({
                name: p.name,
                rung: p.rung,
                container,
                driver: mounted.driver(),
                off: mounted.off,
            });
        }

        const check = (stage: string): void => {
            for (const s of live) {
                gateMarkup(
                    `machine-vs-cells/ladder·n${n}`,
                    stage,
                    s.name,
                    refContainer,
                    s.container
                );
                gateText(stage, s.name, refContainer, s.container);
            }
        };

        check(`ladder n${n} mount`);

        // THE COUNTERS ARE CHECKED ONE PARTICIPANT AT A TIME, because the floor's and the machine's
        // banks are shared by every rung AND by a row and its twin — see `LADDER_BANKS`. Driving
        // them together would leave one bank holding several participants' calls and the diff could
        // no longer say which of them ran.
        const exoBankOf = (who: string): Int32Array => {
            const found = LADDER_BANKS.find(
                (b) => b.who === who || (b.rung === null && who.startsWith(`${b.who}·n`))
            );
            if (found === undefined) {
                refuse(
                    `machine-vs-cells: the ladder has no counter bank for \`${who}\`, so nothing ` +
                        'could check that its declared transitions ran.'
                );
            }
            return found.bank;
        };

        const before = markupOf(refContainer);
        {
            const bank = LADDER_SEEN_FLOOR;
            const snapshot = Int32Array.from(bank);
            refDriver.call(3);
            checkInvoked('floor', bank, snapshot, n);
        }
        for (const s of live) {
            const bank = exoBankOf(s.name.endsWith('·twin') ? s.name.slice(0, -5) : s.name);
            const snapshot = Int32Array.from(bank);
            s.driver.call(3);
            checkInvoked(s.name, bank, snapshot, s.rung);
        }
        check(`ladder n${n} one round, all ${n} transition(s) called`);
        if (markupOf(refContainer) === before) {
            refuse(
                `machine-vs-cells: one ladder round at rung ${n} changed NOTHING in the floor's ` +
                    'markup, so every table at this rung would be timing a scene in which no port ' +
                    'moved.'
            );
        }

        refDriver.call(4);
        for (const s of live) s.driver.call(4);
        check(`ladder n${n} second round, so nothing is compared only on its first call`);

        sink += markupOf(refContainer).length;

        refMount.off();
        refContainer.remove();
        for (const s of live) {
            s.off();
            s.container.remove();
        }
        line(
            `  rung n${n}: ${live.length} participant(s) byte-identical to the floor at three ` +
                `stages, and each called EXACTLY its ${n} declared transition(s), ` +
                `${LADDER_INSTANCES} time(s) each, and no other.`
        );
    }

    // ZEROED HERE AND NOWHERE ELSE. Everything counted from this line on was counted inside a
    // `performance.now()` region, which is what `ladderRegionGate` is entitled to say afterwards.
    for (const b of LADDER_BANKS) b.bank.fill(0);
    line(
        '  the banks are now ZERO, so every count the post-run check reads was made inside a TIMED ' +
            'REGION — the gate above proves each rung calls exactly what it declares, and the ' +
            'post-run check proves the timer saw it happen.'
    );
}

/**
 * THE INVOKED-TRANSITION GATE, AFTER THE ROUNDS — the half of the check the tables themselves owe.
 *
 * `ladderGate` proved each rung's driver calls exactly what its component declares and then zeroed
 * the banks. This runs AFTER every ladder table and refuses BY NAME if any transition body did not
 * run inside a timed region.
 *
 * WHAT IT CAN AND CANNOT SAY, precisely. The wire's doors are written out per rung, so its three
 * banks give an EXACT per-rung count. The floor's and the machine's sixteen bodies are shared by
 * every rung — which is the property those two shapes have and the wire does not — so their banks
 * say "transition j ran inside a timed region" and the per-rung claim for them is the gate's.
 */
function ladderRegionGate(rows: number): void {
    line('');
    // "THE LADDER" AND NOT "LADDER", because `run-one-axis.js`'s `SECTION` is
    // `^([A-Z][A-Z0-9·-]*)\s+—` and a line beginning `LADDER —` would file everything after it under
    // a section that is not a table.
    line('THE LADDER — EVERY DECLARED TRANSITION, CHECKED TO HAVE RUN INSIDE A TIMED REGION');
    for (const b of LADDER_BANKS) {
        const n = b.rung === null ? LADDER_TOP : b.rung;
        for (let j = 0; j < n; j++) {
            if (b.bank[j] > 0) continue;
            refuse(
                `machine-vs-cells: \`${b.who}\` declares transition ${j} and NOT ONE CALL to it ` +
                    'was made inside a timed region. Its closure was allocated and its body was ' +
                    'never compiled, so every ladder row above is pricing an allocation and a ' +
                    'pre-parse where it claims to price a transition. The tables are void.'
            );
        }
        const total = b.bank.reduce((a, x) => a + x, 0);
        line(
            `  ${b.who.padEnd(NULL_COL)}${n} declared, ${n} called inside timed regions, ` +
                `${total} call(s) in all${
                    b.rung === null
                        ? ' — bank SHARED by the three rungs, so this line is per TRANSITION and ' +
                          'the per-RUNG claim is the gate`s'
                        : ' — bank is this rung`s alone'
                }`
        );
    }
    line(
        `  and ${rows} ladder row(s) were sampled with those counts standing. NOTHING ON TABLES 11 ` +
            'TO 14 IS A DUMMY: every transition every component declares was called, with a body ' +
            'that stores a field and drives a port, inside the regions the numbers came out of.'
    );
}

/**
 * THE ONE-OBJECT CLAIM, READ OFF THE LIVE INSTANCES rather than asserted in a caption.
 *
 * Mounts form C's wide component once, untimed, and checks the two structural facts the claim is
 * made of: every row's `portWrite` is the SAME function (so it is a reference, not an
 * allocation) and every row's `portTable` is a DIFFERENT object (so the instance's half
 * really is per instance). It prints what it found and refuses if either fails.
 */
function reportOneObjectClaim(): void {
    const container = el();
    const mounted = WIDE_C.prepare()(container);
    // Assembling the driver is what pulls the states off the handles, and it refuses by name if any
    // row's wire did not run.
    mounted.driver();
    const states = WIDE_COMPILED_DATA.map((h) => h.state as TExoWideCompiledState);
    const writes = new Set(states.map((s) => s.portWrite));
    const tables = new Set(states.map((s) => s.portTable));
    line('');
    line(
        `  THE ONE-OBJECT CLAIM, CHECKED: ${states.length} instances of form C hold ` +
            `${writes.size} distinct write function(s) and ${tables.size} distinct port table(s). ` +
            'ONE write shared by every instance is what makes it a reference rather than an ' +
            'allocation; one table PER instance is what makes the instance`s half the instance`s. ' +
            'Read the mount table against this, not against the caption.'
    );
    if (writes.size !== 1 || tables.size !== states.length) {
        refuse(
            `machine-vs-cells: \`machine\`'s per-instance claim does not hold — ${writes.size} ` +
                `write ` +
                `function(s) across ${states.length} instances (expected 1) and ${tables.size} ` +
                'port table(s) (expected one per instance). Either the write is being allocated ' +
                'per instance, in which case the mount tables below are measuring a shape whose ' +
                'caption is false, or two instances are sharing a table, in which case one of them ' +
                'is writing into the other`s nodes.'
        );
    }
    mounted.off();
    container.remove();
}

/**
 * THE STATE-SHAPE CLAIMS, CHECKED STRUCTURALLY — the ones no timing number can settle, and the one
 * hazard variant 3 carries that a markup gate would not always catch.
 *
 * FOUR THINGS ARE CHECKED AND THE FOURTH IS THE POINT:
 *
 *  1. VARIANT 2 HOLDS ITS OWN ARRAY. `state` is not the port table, its base is 0, and its length is
 *     the field count plus the pending word — so nothing is sharing and nothing is over-long.
 *  2. VARIANT 3 HOLDS THE NODE TABLE. `state` IS `portTable`, by identity, for every
 *     instance. If it were not, this variant would be variant 2 wearing variant 3's name and the
 *     mount table would be printing a caption that is false.
 *  3. EVERY INSTANCE HAS ITS OWN. Two instances sharing one table would be writing into each
 *     other's state, and every number would be a measurement of that instead.
 *  4. THE ARRAY IS STILL PACKED AND ITS NODE HALF IS STILL NODES. `state.length` must be exactly
 *     `base + fields + 1` — no hole, nothing appended twice — and slots `0 .. base - 1` must all still
 *     be `Node`s. A state value written over a node slot would be caught by the markup gate only if
 *     that slot happened to be one a port writes; a slot nothing drives would be corrupted in
 *     silence. This is what closes that.
 */
function reportStateTableClaims(): void {
    const inspect = (
        who: string,
        run: () => { readonly states: readonly TExoStateTableState[]; readonly off: () => void },
        expectShared: boolean,
        base: number,
        fields: number
    ): void => {
        const { states, off } = run();
        const tables = new Set(states.map((s) => s.managedState));
        if (tables.size !== states.length) {
            refuse(
                `machine-vs-cells: ${who} mounted ${states.length} instances holding ` +
                    `${tables.size} distinct state tables. Two instances share one array, so each ` +
                    "is writing into the other's fields and every number this row prints is a " +
                    'measurement of that.'
            );
        }
        for (let i = 0; i < states.length; i++) {
            const s = states[i];
            const shared = (s.managedState as unknown) === (s.portTable as unknown);
            if (shared !== expectShared) {
                refuse(
                    `machine-vs-cells: ${who} instance ${i} ${
                        shared ? 'SHARES' : 'DOES NOT SHARE'
                    } its state table with its node table, and this row is the variant that ` +
                        `${expectShared ? 'must' : 'must not'}. The two variants have swapped ` +
                        'places or one of them is not the shape its caption says.'
                );
            }
            if (s.managedState.length !== base + fields + 1) {
                refuse(
                    `machine-vs-cells: ${who} instance ${i} holds a table of ${s.managedState.length} ` +
                        `slots where field 0 is at ${base}, there are ${fields} fields and the ` +
                        `pending word takes the slot after them — expected ${
                            base + fields + 1
                        }. Either a slot was written out of order, which ` +
                        'makes the array HOLEY and puts a prototype-chain check on every port ' +
                        'write of every instance, or the state was appended more than once.'
                );
            }
            for (let n = 0; n < base; n++) {
                if (!(s.managedState[n] instanceof Node)) {
                    refuse(
                        `machine-vs-cells: ${who} instance ${i} has a NON-NODE in node slot ${n} ` +
                            `of ${base}. A state value has been written over a node, and a slot ` +
                            'no port drives would never show up in the markup gate.'
                    );
                }
            }
        }
        off();
    };

    const mountNarrow =
        (
            p: TExoProgram,
            data: () => readonly TExoTableHandle[]
        ): (() => { readonly states: readonly TExoStateTableState[]; readonly off: () => void }) =>
        () => {
            const container = el();
            const mounted = p.prepare()(container);
            // Assembling the driver is what refuses by name if any tag's wire did not run.
            mounted.driver();
            const states = data().map((h) => h.state as TExoStateTableState);
            return {
                states,
                off: () => {
                    mounted.off();
                    container.remove();
                },
            };
        };

    const mountWide =
        (
            p: TExoWideProgram,
            data: () => readonly TExoWideHandle<TExoStateTableState>[]
        ): (() => { readonly states: readonly TExoStateTableState[]; readonly off: () => void }) =>
        () => {
            const container = el();
            const mounted = p.prepare()(container);
            mounted.driver();
            const states = data().map((h) => h.state as TExoStateTableState);
            return {
                states,
                off: () => {
                    mounted.off();
                    container.remove();
                },
            };
        };

    inspect(
        'machine·array',
        mountNarrow(C_TBL, () => TABLE_OWN_DATA),
        false,
        PACK_C_TBL.base(),
        4
    );
    inspect(
        'machine·nodes',
        mountNarrow(C_SHR, () => TABLE_SHARED_DATA),
        true,
        PACK_C_SHR.base(),
        4
    );
    inspect(
        'machine·array (wide)',
        mountWide(WIDE_C_TBL, () => WIDE_TABLE_OWN_DATA),
        false,
        WIDE_PACK_C_TBL.base(),
        WIDE_FIELDS
    );
    inspect(
        'machine·nodes (wide)',
        mountWide(WIDE_C_SHR, () => WIDE_TABLE_SHARED_DATA),
        true,
        WIDE_PACK_C_SHR.base(),
        WIDE_FIELDS
    );

    line('');
    line(
        '  THE STATE-SHAPE CLAIMS, CHECKED rather than captioned: `machine` keeps four NAMED PROPERTIES ' +
            'on the state object (the shipped shape, imported, not re-implemented); `machine·array` keeps ' +
            `them in its own array of 4 numbered from ${PACK_C_TBL.base()}; \`machine·nodes\` APPENDS them ` +
            `onto the tag's node table at slots ${PACK_C_SHR.base()}..${
                PACK_C_SHR.base() + 3
            } — one numbering for ${PACK_C_SHR.base()} node slots and 4 state fields, and every ` +
            'instance was checked to hold its own packed table whose node half is still Nodes.'
    );
    line(
        `  AT WIDTH: \`machine·array\` numbers ${WIDE_FIELDS} fields from ${WIDE_PACK_C_TBL.base()} in an ` +
            `array of its own; \`machine·nodes\` appends them at slots ${WIDE_PACK_C_SHR.base()}..` +
            `${WIDE_PACK_C_SHR.base() + WIDE_FIELDS - 1} of a node table that holds ` +
            `${WIDE_PACK_C_SHR.base()} nodes for ${WIDE_PORTS} ports. THE WIDE BASES ARE PRINTED ` +
            'BECAUSE THEY ARE THE SCENE: this is the row where the mixed array is longest and is ' +
            'read most often per round.'
    );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CLOCK, OBSERVED — copied from `plugin-price`, which copied it from `mount-floor`.
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

/**
 * A `Stat` IN THE UNIT ITS TABLE PRINTS. `sampleOnce` returns MILLISECONDS per tag-operation and
 * every table here prints NANOSECONDS per tag-operation; `emitRecordedRows` carries the unit on
 * every row, so emitting a millisecond number under an `ns` label would be a millionfold wrong in
 * a recorded file nobody reopens. The conversion happens HERE, once, beside the label.
 */
function scaledStat(s: Stat, by: number): Stat {
    return {
        min: s.min * by,
        p25: s.p25 * by,
        median: s.median * by,
        p75: s.p75 * by,
        max: s.max * by,
    };
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
    /** Scenarios prepared per timed region. */
    readonly reps: number;
    /** UNIT-OPERATIONS per scenario — units on a mount table, rounds × units on an update table. */
    readonly per: number;
    /** Rounds per scenario, PRINTED, because it is not the same on every table. */
    readonly rounds: number;
    readonly what: string;
    /** What this participant allocates per instance — printed on the mount tables. */
    readonly allocs: string;
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

/** The whole timed region for one sample of a phase — what the clock check is asked about. */
function regionOf(phase: Phase, perUnit: number): number {
    return perUnit * phase.reps * phase.per;
}

/**
 * ONE TABLE'S WORTH OF SAMPLING: the per-round series for every phase, and WHERE IN THE ROUND each
 * one ran.
 *
 * THE POSITIONS ARE NOT BOOKKEEPING. They are what lets a null be split by which half of the pair
 * went first, which is the whole of the ordering diagnosis below.
 */
interface Series {
    readonly times: Map<string, number[]>;
    /** `position.get(name)[r]` — 0-based place of that phase inside round `r`. */
    readonly position: Map<string, number[]>;
}

/**
 * THE ROTATION USED TO BE A FIXED CYCLE, AND THAT WAS AN INSTRUMENT DEFECT ON EVERY TABLE HERE.
 *
 * It was `phases[(k + shift) % len]` with `shift = r % len` — the SAME cycle entered at a different
 * point, so every ADJACENCY in the table was fixed for the whole run: `machine·twin` ran immediately
 * after `machine` in every round but the one per cycle that wrapped between them, for the life of the
 * file. A pair with a fixed order carries whatever the first of the two does to the second — cache
 * state, a GC the first provoked, the allocation the first left standing — as a SYSTEMATIC signed
 * offset, and a null pair is exactly where that is indistinguishable from a real difference.
 *
 * ODD ROUNDS NOW WALK THE CYCLE BACKWARDS. The rotation still gives every phase every starting
 * position; the direction is what stops any pair from keeping one order for the whole run, so every
 * adjacency is ordered both ways equally often. And the positions are handed back so that
 * `pairedNull` can SPLIT what it finds into the part that flips with the order and the part that does
 * not — see `Null`.
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
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO, in more than one number.
 *
 *   bias        |median(a) − median(b)|. On its own it is optimistic: two medians are free to cancel.
 *   noise       the MEDIAN of the per-round |a_r − b_r|. Both halves of a null are sampled in the
 *               same round, adjacent in the rotation, so this is the round-to-round scatter that ANY
 *               comparison of two rows in the table carries. It cannot cancel.
 *   aFirst      median of the SIGNED `a_r − b_r` over the rounds where `a` ran BEFORE `b`.
 *   bFirst      the same over the rounds where `b` ran before `a`.
 *   order       (aFirst − bFirst) ÷ 2 — the size of the ORDERING effect, signed.
 *   intrinsic   (aFirst + bFirst) ÷ 2 — what SURVIVES once the ordering is balanced out.
 *
 * THE LAST THREE ARE THE DIAGNOSIS AND NOT DECORATION, and they are what the fixed cycle above made
 * unmeasurable. An ordering effect flips sign with the order, so it lands entirely in `order` and
 * `intrinsic` collapses; two declarations that really do differ keep their sign in both orders, so it
 * lands entirely in `intrinsic` and `order` collapses. A NULL WHOSE `intrinsic` IS LARGE IS NOT A
 * NULL, and `checkNullIntegrity` at the bottom of the run refuses such a pair by name.
 *
 * `resolution` IS DELIBERATELY UNCHANGED — `max(bias, noise)`. The split is a DIAGNOSIS printed
 * beside every null; it is not a licence to publish a gap against a smaller floor than the pair
 * actually returned when nothing was there.
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
function signedMedian(xs: readonly number[]): number {
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
        // WHICH RAN FIRST IS READ OFF THE ROUND ITSELF and never inferred from its parity: the
        // rotation wraps, so one round in every cycle puts the pair in the opposite order to the one
        // the direction would suggest, and inferring it would quietly poison both halves.
        if (aPos[r] < bPos[r]) whenAFirst.push(signed);
        else whenBFirst.push(signed);
    }
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    const aFirst = signedMedian(whenAFirst);
    const bFirst = signedMedian(whenBFirst);
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
 * ONE ROW'S NULL, BY NAME — `X` against `X·twin`, times and positions pulled together.
 *
 * It exists so that the three null lists below name a row ONCE instead of four times. They used to
 * spell out both series; a null now needs the POSITIONS as well, and a list that repeated the name
 * four times per row is a list in which a typo picks another row's series and still runs.
 */
const pairOf = (series: Series, who: string): readonly [string, Null] => [
    who,
    pairedNull(
        series.times.get(who) as number[],
        series.times.get(`${who}·twin`) as number[],
        series.position.get(who) as number[],
        series.position.get(`${who}·twin`) as number[]
    ),
];

/**
 * THE FLOOR ONE COMPARISON IS READ AGAINST, AND WHERE THAT FLOOR CAME FROM.
 *
 * WHY THIS TYPE EXISTS, AND IT IS AN INSTRUMENT DEFECT THAT WAS BLINDING WHOLE TABLES. Until this
 * type, every gap on a table was read against the MAXIMUM over all of that table's nulls. That is
 * a defensible conservative bound and it is still printed — but it is not what any particular pair
 * of rows can resolve, and ONE noisy participant set the reading for everybody. On a run of TABLE 5
 * one row's null came back at 75.000003 µs per mount while every other null on the table read
 * 3.125001 — twenty-four times smaller — so `wire ↔ machine·imperative`, whose two nulls BOTH read
 * 3.125001, was published as UNRESOLVED at 0.13 floors where against its own two nulls it is 1.5.
 * The defect compounded as rows were added: each new twin could only RAISE the maximum, so every
 * comparison in the table got harder to read every time the axis learned something new.
 *
 * WHAT REPLACES IT, AND WHAT DELIBERATELY DOES NOT. For a gap `X ↔ Y` the floor is
 * `max(nullOf(X), nullOf(Y))` — those two nulls and no others. THE WITHIN-PAIR RULE IS UNTOUCHED:
 * a single row's own floor is still `max(bias, noise)` (see `Null`), because bias is a difference
 * of two medians and free to cancel while noise is the median of the per-round `|a−b|` and cannot.
 * Only the ACROSS-PAIRS step changed.
 *
 * AND A PAIR IS NEVER READ AT LESS THAN IT CAN ACTUALLY RESOLVE. A row that declares no twin of its
 * own — `floor`, `machine·copy`, `machine·tuple`,
 * `machine·handle` — has NO null, and nothing narrower than the table is known about it, so any pair
 * containing one falls back to the table-wide figure. That covers both combinations at once: one
 * row missing and both rows missing. The basis string SAYS WHICH RULE WAS USED, on every line that
 * prints a floor, so no figure on this axis can be read without knowing what bounded it.
 */
interface Floor {
    /** Milliseconds per unit-operation — the unit `perTag`/`perRow` returns. */
    readonly value: number;
    /** Which rule produced it, and off which nulls. Printed beside every figure it judges. */
    readonly basis: string;
}

/** Every floor one table can hand out: the table-wide bound, and one per pair of rows. */
interface TableFloors {
    /**
     * THE WORST ANY COMPARISON IN THIS TABLE CAN BE READ AT — the maximum over every null. This is
     * what the whole table used to be judged against, and it is still the right number for a reader
     * who wants ONE conservative bound for the table rather than a bound per pair.
     */
    readonly worst: Floor;
    /** `max(nullOf(a), nullOf(b))` when BOTH rows declare a null; `worst` otherwise. */
    readonly of: (a: string, b: string) => Floor;
    /** Each row that declared a null, with its own `max(bias, noise)`. Printed under the table. */
    readonly own: ReadonlyMap<string, number>;
}

function floorsOf(nulls: readonly (readonly [string, Null])[]): TableFloors {
    const own = new Map<string, number>();
    for (const [who, n] of nulls) own.set(who, n.resolution);
    const worstValue = Math.max(...nulls.map(([, n]) => n.resolution));
    // NAMED, not just measured: a reader who sees the table figure is entitled to know which row
    // is setting it, because that row is the one to look at when the whole table reads coarse.
    const worstOwner = (
        nulls.find(([, n]) => n.resolution === worstValue) as readonly [string, Null]
    )[0];
    const nsOf = (v: number): string => (v * 1e6).toFixed(6);
    const worst: Floor = {
        value: worstValue,
        basis:
            `TABLE FLOOR — the worst of this table's ${nulls.length} nulls, which is ` +
            `\`${worstOwner}\`'s at ${nsOf(worstValue)} ns`,
    };
    const of = (a: string, b: string): Floor => {
        const na = own.get(a);
        const nb = own.get(b);
        if (na === undefined || nb === undefined) {
            const missing = [a, b].filter((r) => own.get(r) === undefined);
            return {
                value: worstValue,
                basis:
                    `TABLE FLOOR — ${missing.map((r) => `\`${r}\``).join(' and ')} ` +
                    `${missing.length > 1 ? 'declare' : 'declares'} no null of its own, so ` +
                    'NOTHING NARROWER THAN THE TABLE IS KNOWN ABOUT THIS PAIR: the worst of ' +
                    `${nulls.length} nulls, \`${worstOwner}\`'s at ${nsOf(worstValue)} ns`,
            };
        }
        return {
            value: Math.max(na, nb),
            basis:
                `PAIR FLOOR — max of the two rows' OWN nulls, \`${a}\` at ${nsOf(na)} ns and ` +
                `\`${b}\` at ${nsOf(nb)} ns, and no other row on the table is consulted`,
        };
    };
    return { worst, of, own };
}

/**
 * THE FLOOR FOR A COMPARISON THAT CROSSES TWO TABLES — the LARGER of the two pair floors.
 *
 * P3 and P17 subtract a gap measured on one table from a gap measured on another. Neither table's
 * floor bounds the other's half, so the pair is read at the larger of the two, exactly as it was
 * before this change — only now each half is the PAIR's floor rather than its table's maximum.
 */
function widerOf(a: Floor, b: Floor): Floor {
    const bigger = a.value >= b.value ? a : b;
    return {
        value: bigger.value,
        basis:
            `${bigger.basis}; THE COMPARISON CROSSES TWO TABLES, so it is read at the LARGER of ` +
            'the two pair floors and is weaker than any within-table figure',
    };
}

/**
 * REFUSE A TABLE WHOSE ROWS ARE NOT ALL SAMPLED AT THE SAME UNIT COUNT.
 *
 * `plugin-price` publishes tables that span three round counts and carries a whole routing apparatus
 * so that no difference is ever read against another group's null. THIS AXIS DOES NOT SPAN ANY: every
 * row of every table here runs the same number of tag-operations per scenario, so one pair of nulls
 * answers for the whole table. That is a property somebody could break by editing a constant, so it
 * is CHECKED rather than asserted, and the refusal names what would have to be built instead.
 */
function requireOneSampleCondition(phases: readonly Phase[], table: string): void {
    const per = phases[0].per;
    for (const p of phases) {
        if (p.per !== per) {
            refuse(
                `machine-vs-cells: on the ${table} table "${p.name}" is sampled at ${p.per} ` +
                    `tag-operations per scenario and "${phases[0].name}" at ${per}. A null taken ` +
                    'between two rows of one group is a null for THAT group only, so this table ' +
                    'now needs per-group nulls and per-group routing (see `plugin-price`) before ' +
                    'any of its differences may be read as sizes.'
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════

export function benchmarkMachineVsCells(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const ns = (ms: number): string => (ms * 1e6).toFixed(1);
    const us = (ms: number): string => (ms * 1e3).toFixed(4);

    const quantum = observeTimerQuantum();
    line(
        `machine-vs-cells: observed timer quantum (${quantum.toFixed(
            3
        )} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run refuses that region by name'
    );

    // THE LEGEND FIRST, BEFORE THE CENSUS AND BEFORE EVERY TABLE. The census says what each form
    // ALLOCATES; the legend says what each ROW IS, and a reader who has only been handed a table
    // needs the second one before the first.
    printLegend();

    // ── THE CENSUS, read off the structures rather than asserted in prose ────────────────
    line('');
    line('WHAT IS BEING COMPARED, BEFORE ANY NUMBER');
    line(`  the tag                      ${TAG_MARKUP}`);
    line(
        '  the two derivations          label ← f(name, open)   ·   size ← f(width)   — and `note`,' +
            ' a fourth state field NO derivation reads, added for TABLE 4 and used by nothing else'
    );
    // COUNTED OFF THE STRUCTURE FORM B ACTUALLY DECLARED, never off this comment. If a third
    // derivation is ever added, this line changes by itself and caveat (2) in the header — that two
    // derivations is the best case for `exoCommit`'s loop — becomes visibly false.
    const declared = B_DERIVATIONS[0];
    line(
        '  machine·scan, per instance   1 state object + 1 machine object + 1 c.fillDoors() wrapper ' +
            '+ 1 click ' +
            `closure. Per COMPONENT, SHARED by every instance: ${declared.length} derivations (` +
            `${declared.map((d) => `${d.name} ← mask 0b${d.mask.toString(2)}`).join(', ')}), ` +
            `declared once at module load, in ${B_DERIVATIONS.length} separately declared arrays ` +
            '(the row and its twin)'
    );
    // COUNTED OFF THE COMPILED PROGRAM, never off this comment. The field→derivations table is the
    // whole of form C's claim, so it is PRINTED — including `note`'s entry, which is the zero that
    // makes TABLE 4's write reach nothing.
    const cProgram = PACK_C.ops.program;
    line(
        '  machine, per instance        1 state object — the pending set, THIS INSTANCE`S PORT ' +
            'TABLE and THE SCHEMA`S WRITE are three fields ON it, and the last two are references, ' +
            'not allocations — plus 1 click closure. No machine object and no ports wrapper ' +
            'beside it. Per COMPONENT, SHARED: the compiled ' +
            `program (${cProgram.labels.length} derivations: ` +
            `${cProgram.labels
                .map((l, i) => `${l} ← reads 0b${(cProgram.reads[i] >>> 0).toString(2)}`)
                .join(', ')}) and five transition closures — four the driver calls and the ` +
            'click`s toggle'
    );
    line(
        '  machine, the FIELD→DERIVATIONS table   ' +
            `${[...cProgram.fieldMarks]
                .map((m, f) => `field ${f} → 0b${(m >>> 0).toString(2)}`)
                .join('  ·  ')} — field 3 is \`note\`, and its entry is ` +
            `${cProgram.fieldMarks[3]}: a transition that writes it ORs a zero, the ` +
            'pending set never leaves zero, and the commit returns having tested nothing. That is ' +
            'TABLE 4, as a mechanism rather than as a claim.'
    );
    line(
        `  the floor, per instance      1 cloned subtree, 2 held Text nodes, 4 plain fields, 1 ` +
            'addEventListener'
    );
    line(
        `  the scene                    ${TAGS} tags per shell · ${MOUNT_REPS} mounts per mount ` +
            `region · ${SHELLS} shells standing on the update tables · batch ${batch}`
    );
    line(
        `  the data                     ${NAMES.length} interned names (all >3 chars, no two ` +
            `sharing their first three) and ${WIDTHS.length} interned widths, cycled so no round ` +
            'is deduped away'
    );
    line(
        '  the nulls                    SIX — machine·scan/machine·scan·twin, ' +
            'machine/machine·twin, machine·array/machine·array·twin, ' +
            'machine·nodes/machine·nodes·twin, ' +
            'machine·write/machine·write·twin and wire/wire·twin. (machine·bound/machine·bound·twin ' +
            'was the eighth and is STRUCK with the library method that row was the only ' +
            'participant for.) Each twin is a SECOND, separately ' +
            'declared, identical participant (own component, own declaration, own compiled schema or ' +
            'derivation array), so its true difference from its pair is ZERO. A GAP BETWEEN TWO ' +
            'OF THESE ROWS IS READ AGAINST THEIR OWN TWO NULLS, and one noisy shape no longer ' +
            'makes the other comparisons harder to read: reading every gap against the ' +
            'largest of them let one noisy participant set the reading for the whole table, ' +
            'which is what it was doing. THE ROWS WITH NO TWIN — `floor`, ' +
            '`machine·copy`, `machine·tuple`, `machine·handle` — ' +
            'have no null, so a pair containing one is still read against the largest of the ' +
            'six, because nothing narrower is known about it.'
    );
    // ── AND THE WIDE COMPONENT, read off the same structures ─────────────────────────────
    const wideProgram = WIDE_PACK_C.ops.program;
    line('');
    line(`THE WIDE COMPONENT — TABLES 5 TO 8, and the scene the design was built for`);
    line(`  the row                       ${WIDE_MARKUP}`);
    line(
        `  its shape                     ${WIDE_FIELDS} state fields · ` +
            `${WIDE_READS.length} derivations declared by \`machine\` (${WIDE_PORTS} of them write a ` +
            `port; derivation 0 writes none and STORES field ${WIDE_CHAIN_FIELD}) · ` +
            `${WIDE_B_DERIVATIONS[0].length} declared by \`machine·scan\`, which has no store and recomputes ` +
            'the intermediate in two of them'
    );
    line(
        '  the tangle                    ' +
            WIDE_READERS_OF.map((readers, f) => `f${f}→${readers.length}`).join(' ') +
            ' — derivations reading each field. `f19` is read by NOTHING, and TABLE 8 is what that ' +
            'is for.'
    );
    line(
        '  the FIELD→DERIVATIONS table   ' +
            `f2 → 0b${(wideProgram.fieldMarks[2] >>> 0).toString(2)}  ·  ` +
            `f0 → 0b${(wideProgram.fieldMarks[0] >>> 0).toString(2)}  ·  ` +
            `f${WIDE_UNREAD_FIELD} → ${wideProgram.fieldMarks[WIDE_UNREAD_FIELD]}` +
            ' — the last is the zero that makes TABLE 8`s write reach nothing, at any width.'
    );
    line(
        `  what each scene wakes         one field: ${WIDE_ONE_WOKEN.join(', ')} · three fields ` +
            `(chain included, deduped): ${WIDE_SOME_WOKEN.join(', ')} · unread field: nothing`
    );
    line(
        `  the scene                     ${WIDE_ROWS} rows per shell · ${WIDE_MOUNT_REPS} mounts ` +
            `per mount region · ${WIDE_SHELLS} shells standing on the update tables · ` +
            `${WIDE_FIELD_ROUNDS} rounds on TABLES 6 and 7, ${WIDE_NOTE_ROUNDS} on TABLE 8`
    );
    line(
        '  which scene flatters which    THE NARROW TABLES FLATTER `machine·scan` (a two-iteration ' +
            'scan is form B`s cheapest commit). THE ' +
            'WIDE TABLES FLATTER `machine` (twenty derivations is where an inverted table has most to ' +
            'skip). Both are real components; ' +
            'the PAIR is the finding.'
    );
    line('');
    line('THE APP SCENE — TABLES 9 AND 10, and it is ONE SHAPE rather than "an app"');
    line(
        `  the page                      <div class="app"> with two panes: ${TAGS} narrow tags ` +
            `(2 derivations each) in one and ${WIDE_ROWS} wide rows (${WIDE_READS.length}) in the ` +
            `other — ${APP_INSTANCES} instances of two types, nested two levels under THREE ` +
            'components that declare no state and drive no port at all'
    );
    line(
        '  what the round writes         `name` on every tag AND `f2` on every row, as one round ' +
            "— TABLE 2's scene and TABLE 6's happening together"
    );
    line(
        '  what it does NOT say          what a real application costs. It is a WEIGHTED AVERAGE ' +
            'over one mix; a page with more wide components moves every number towards TABLES 5-8 ' +
            'and one with fewer towards TABLES 1-4. The bracket is printed beside the verdict.'
    );
    line('');
    line('THE TRANSITION LADDER — TABLES 11 TO 14, and the ONE variable no other table here moves');
    line(
        `  what moves                    the number of transitions a component DECLARES: ` +
            `${LADDER_RUNGS.join(', ')}. Nothing else. `
    );
    line(
        `  what is held                  ${LADDER_INSTANCES} instances · ${LADDER_PORTS} text ` +
            `ports (${LADDER_MARKUP}) · ${LADDER_FIELDS} state fields · ${LADDER_PORTS} ` +
            'derivations, one per port, derivation j reading field j alone · the same fill of ' +
            'every port at the mount — ALL IDENTICAL AT EVERY RUNG'
    );
    line(
        '  why it is the right variable   a WIRE`s transition is a closure over the instance, so ' +
            'rung n costs n closures, one array and a closure context PER INSTANCE, inside the ' +
            'mount. A MACHINE`s is declared once per COMPONENT and takes the instance as an ' +
            'argument, so its per-instance cost is one object at every rung. Every wire↔machine ' +
            'verdict this axis has printed was taken at ONE value of that count.'
    );
    line(
        `  the regions                   ${LADDER_MOUNT_REPS} mounts per mount region; on the ` +
            `call tables ${LADDER_SHELLS} shells × ${LADDER_CALLS_PER_SCENARIO} transition CALLS ` +
            `per scenario at every rung (rounds ${LADDER_RUNGS.map(
                (n) => `n${n}:${ladderRoundsAt(n)}`
            ).join(' ')}), so the rungs do the SAME amount of work in one region and resolve the ` +
            'same amount PER CALL — which is what makes their gaps comparable at all.'
    );
    line(
        '  HOW TO READ IT, AND HOW NOT TO   a round at rung n makes n calls per instance, so the ' +
            'writes in a round GROW WITH THE RUNG BY CONSTRUCTION. NO ROW MAY BE READ ACROSS ' +
            'RUNGS. What may is the wire↔machine GAP: both arms carry the growth inside them and ' +
            'it cancels, so the gap per rung is the finding and nothing else on these tables is.'
    );
    line(
        '  the dummy-transition trap     a transition declared and never called is still ' +
            'ALLOCATED (its closure escapes into a long-lived array) but its body is NEVER ' +
            'COMPILED — V8 leaves it at the pre-parse — so a ladder of dummies prices n ' +
            'allocations and n pre-parses and the error FLATTERS THE WIRE. Every declared ' +
            'transition on every rung is called once per instance per round, with a body that ' +
            'stores a field and drives a port, and the LADDER GATE above refuses the run by name ' +
            'if any of them did not. That gate is as much the result as the numbers are.'
    );
    line(
        '  NOT MEASURED ANYWHERE HERE   teardown, memory, layout, the width READ, a reactive ' +
            'children port, a diff, and any component past the thirty-one-field ceiling. See ' +
            'the header and `exo-machine.ts`.'
    );

    gate();
    wideGate();
    appGate();
    // AND THE LADDER'S, WHICH IS TWO GATES IN ONE. Byte identity per rung against the ladder floor,
    // and the check that every declared transition is actually CALLED — without which every ladder
    // table below would be pricing allocations and pre-parses and printing them as the price of a
    // transition. It ZEROES the counter banks on its way out, so `ladderRegionGate` at the end
    // speaks only about what the timer saw.
    ladderGate();
    reportOneObjectClaim();
    // AFTER BOTH GATES, and it has to be: a shared-table component does not know where its state
    // lives until its first wire, so every base printed and checked below is read off a component
    // that has already rendered — and already had its markup compared, byte for byte, with the
    // floor's.
    reportStateTableClaims();

    // ── EVERY NULL THIS RUN TOOK, KEPT SO THE ORDERING SPLIT CAN BE JUDGED AT THE END ────
    //
    // IT IS CHECKED AT THE END AND NOT WHEN THE TABLE PRINTS, deliberately, and for the reason
    // `checkClock` is at the end: `refuse` throws, and a run that threw in the middle would take
    // every table after it with it. A null whose `intrinsic` survives balancing is a defect in the
    // instrument and not in a participant, so the right place to report it is after every number it
    // affects has been printed and recorded.
    interface RecordedNull {
        readonly table: string;
        readonly who: string;
        readonly n: Null;
    }
    const takenNulls: RecordedNull[] = [];
    const recordNull = (table: string, who: string, n: Null): void => {
        // THE TABLE'S FIRST TOKEN, which is what the recorder files a null block under and what a
        // refusal below has to name so a reader can find the table it came from.
        takenNulls.push({ table: table.split(' ')[0], who, n });
    };

    /**
     * REFUSE A NULL THAT IS NOT ONE — after every table, by name.
     *
     * A null's two halves are separately declared copies of one participant, so its true difference
     * is ZERO. `intrinsic` is what is left of the measured difference once the ORDER of the two in
     * the round has been balanced out, and for a true null it should sit inside the round-to-round
     * scatter (`noise`) that any comparison on that table carries.
     *
     * THE BAR IS TWICE THE NOISE AND NOT ONCE, and that is a judgement rather than a derivation: at
     * one times the noise a borderline pair would abort a run that has already produced every number
     * it was asked for, and the whole point of putting this at the end is that a run is expensive.
     * At twice, a pair that trips it is one whose two identical declarations differ, after balancing,
     * by more than double the scatter every other comparison on its table is read against — which is
     * not a resolution problem and cannot be fixed by more rounds.
     */
    const checkNullIntegrity = (): void => {
        line('');
        line(
            'THE NULLS, AFTER BALANCING — every pair on every table, and what survived. `order` is ' +
                'the half of a pair`s difference that FLIPPED SIGN with which of the two ran first ' +
                'in the round; `intrinsic` is the half that did not. Both halves of a null are the ' +
                'same participant declared twice, so `intrinsic` is the instrument telling two ' +
                'identical things apart and must be small.'
        );
        let worstRatio = 0;
        let worstOf = '';
        for (const t of takenNulls) {
            const survived = Math.abs(t.n.intrinsic);
            const ratio = t.n.noise > 0 ? survived / t.n.noise : survived > 0 ? Infinity : 0;
            if (ratio > worstRatio) {
                worstRatio = ratio;
                worstOf = `${t.table}/${t.who}`;
            }
        }
        line(
            `  ${takenNulls.length} null(s) taken across every table. THE WORST SURVIVING ` +
                `INTRINSIC is \`${worstOf}\`'s at ${worstRatio.toFixed(2)}× its own noise ` +
                '(1.00× would mean it is exactly the scatter any comparison on that table carries).'
        );
        for (const t of takenNulls) {
            const survived = Math.abs(t.n.intrinsic);
            if (t.n.noise > 0 && survived <= 2 * t.n.noise) continue;
            if (t.n.noise === 0 && survived === 0) continue;
            refuse(
                `machine-vs-cells: on ${t.table} the pair \`${t.who}\` ↔ \`${t.who}·twin\` is NOT ` +
                    `A NULL. After balancing the order of the two in the round, ` +
                    `${f6(
                        survived * 1e6
                    )} ns per unit SURVIVES, against a round-to-round noise of ` +
                    `${f6(t.n.noise * 1e6)} ns and an ordering component of ` +
                    `${f6(Math.abs(t.n.order) * 1e6)} ns (${t.n.aFirstRounds} rounds with the ` +
                    `first half leading, ${t.n.bFirstRounds} with the second). Its two halves are ` +
                    'SEPARATELY DECLARED COPIES OF ONE PARTICIPANT and their true difference is ' +
                    'ZERO, so an instrument that keeps telling them apart by more than twice its ' +
                    'own scatter is not resolving what this table claims to resolve — and MORE ' +
                    'ROUNDS CANNOT FIX IT, because what survived is precisely the part that does ' +
                    'not average out. Every figure on that table read against this pair`s floor is ' +
                    'therefore unsafe and is refused here rather than left standing.'
            );
        }
        line(
            '  no pair`s surviving difference exceeded twice its own noise, so no table above was ' +
                'read against a floor its own null could not support.'
        );
    };

    // ── A SHARED TABLE PRINTER, because eight tables print the same columns ──────────────
    /**
     * ONE TABLE AND ITS NULL BLOCK.
     *
     * TWO UNITS APPEAR AND BOTH ARE LABELLED, which is the whole of the discipline here. The TABLE
     * is in NANOSECONDS PER TAG, because that is the unit in which a per-instance mechanism can be
     * compared across the four scenes. The NULL BLOCK is in MICROSECONDS PER SCENE UNIT — one mount
     * on TABLE 1, one round on the others — because six decimals of a nanosecond is a femtosecond
     * and no instrument here resolves one. The `RESOLUTION FLOOR` line prints BOTH figures with the
     * arithmetic between them visible, so neither can be quoted at the other's scale.
     *
     * WHAT IS RETURNED IS NO LONGER ONE NUMBER. It is every floor this table can hand out — the
     * table-wide bound AND one per pair of rows — because reading a two-row gap against the worst
     * null on the table let one noisy participant set the reading for everybody. See `Floor`. Both
     * are in milliseconds per unit-operation, the unit `perTag`/`perRow` returns.
     */
    const printTable = (
        title: string,
        phases: readonly Phase[],
        perTag: (name: string) => number,
        nulls: readonly (readonly [string, Null])[],
        showMount: boolean,
        /** Instances per scene — TAGS on the narrow tables, WIDE_ROWS on the wide ones. */
        units: number = TAGS,
        /** What one of them is called, so a wide table does not print "tag". */
        unitName: string = 'tag'
    ): TableFloors => {
        const floor = perTag('floor');
        const sceneUnit = showMount ? 'mount' : 'round';
        // ms per unit → µs per scene unit. A scene unit is `units` unit-operations.
        const toScene = units * 1e3;
        line('');
        line(title);
        line(
            showMount
                ? `  ${'row'.padEnd(ROW_COL)}${'ms/mount'.padStart(9)}${`ns/${unitName}`.padStart(
                      9
                  )}${'× floor'.padStart(10)}   what it is`
                : `  ${'row'.padEnd(ROW_COL)}${'µs/round'.padStart(9)}${`ns/${unitName}`.padStart(
                      9
                  )}${'× floor'.padStart(10)}${'rounds'.padStart(9)}   what it is`
        );
        for (const p of phases) {
            const v = perTag(p.name);
            const ratio = p.name === 'floor' ? '    1.00×' : `${(v / floor).toFixed(2)}×`;
            const first = showMount ? f4(v * units).padStart(9) : us(v * units).padStart(9);
            const roundsCol = showMount ? '' : `${String(p.rounds).padStart(9)}`;
            line(
                `  ${p.name.padEnd(ROW_COL)}${first}${ns(v).padStart(9)}${ratio.padStart(10)}` +
                    `${roundsCol}   ${p.what}`
            );
            // ON A MOUNT TABLE THE ALLOCATION COUNT IS PRINTED UNDER THE NUMBER IT EXPLAINS, so a
            // reader checks "one object per instance" against the figure beside it rather than
            // against a paragraph in the header.
            if (showMount) line(`  ${' '.repeat(ROW_COL)}allocates per instance: ${p.allocs}`);
        }
        line(
            `  THE NULLS, in µs per ${sceneUnit} — what this table returns when nothing is there:`
        );
        line(
            `  ${'null'.padEnd(NULL_COL)}${'bias'.padEnd(10)}${'noise'.padEnd(10)}` +
                `${'p75'.padEnd(10)}${'worst'.padEnd(10)}what it is`
        );
        for (const [who, n] of nulls) {
            line(
                `  ${who.padEnd(NULL_COL)}${f6(n.bias * toScene)}  ${f6(n.noise * toScene)}  ` +
                    `${f6(n.noiseP75 * toScene)}  ${f6(n.worst * toScene)}  ` +
                    `|${who} − ${who}·twin|, true Δ = 0`
            );
        }
        // ── THE ORDERING SPLIT, ON ITS OWN LINE AND NOT AS A FIFTH COLUMN ───────────────
        //
        // WHAT IT IS FOR: until the rotation was fixed (see `runPhases`), every pair in every table
        // here ran in ONE order for the whole run, so anything the first of a pair did to the second
        // arrived as a systematic signed offset that no null could tell from a real difference. The
        // fix balances the orders; THIS is what says whether it mattered. `order` is what flipped
        // sign with the order and `intrinsic` is what did not — and a null's `intrinsic` should be
        // small, because its true difference is zero. `checkNullIntegrity` at the end of the run
        // refuses any pair whose `intrinsic` stays large, by name.
        //
        // A SEPARATE LINE FOR THE REASON THE FLOOR LINE BELOW IS ONE: `run-one-axis.js`'s `NULL_ROW`
        // matches a name and EXACTLY FOUR six-decimal numbers, so a fifth column would push the pair
        // description into the recorded `what` field. The `·` separators keep this line unmatchable.
        line(
            `  THE ORDERING SPLIT, µs per ${sceneUnit} — |order| is what flipped sign with which ` +
                'half ran first; |intrinsic| is what survived balancing and should be ~0 for a null:'
        );
        for (const [who, n] of nulls) {
            line(
                `  ${who} · order ${f6(Math.abs(n.order) * toScene)} · intrinsic ` +
                    `${f6(Math.abs(n.intrinsic) * toScene)} · rounds ${n.aFirstRounds} first / ` +
                    `${n.bFirstRounds} second`
            );
        }
        for (const [who, n] of nulls) recordNull(title, who, n);
        const floors = floorsOf(nulls);
        const resolution = floors.worst.value;
        // ── EVERY ROW'S OWN FLOOR, SO A READER CAN BUILD ANY PAIR'S FOR HIMSELF ─────────
        //
        // The four columns above are the pair's bias, noise, p75 and worst; THIS line is the one
        // figure derived from them that anything below is judged against — `max(bias, noise)` per
        // row — and a comparison of any two of these rows is read at the larger of their two
        // entries. It is a separate line rather than a fifth column ON PURPOSE: `run-one-axis.js`'s
        // `NULL_ROW` matches a name and EXACTLY FOUR six-decimal numbers before the prose, so a
        // fifth column would push the pair description into the recorded `what` field. The `·`
        // separators below also make this line unmatchable by that pattern, which is the point:
        // it is a reader's line and not a recorded one.
        line(
            `  EACH ROW'S OWN FLOOR, max(bias, noise), µs per ${sceneUnit} — a gap between two of ` +
                'these rows is read at the LARGER of their two entries:'
        );
        line(`  ${[...floors.own].map(([who, v]) => `${who} ${f6(v * toScene)}`).join('  ·  ')}`);
        line(
            `  RESOLUTION FLOOR      ${f6(resolution * toScene)} µs per ${sceneUnit} ` +
                `(= ${f6(
                    resolution * 1e6
                )} ns per ${unitName}, the same figure divided by ${units}) = ` +
                `max(bias, noise) over the WORST of this table's ${nulls.length} nulls. BIAS is ` +
                'the difference of two medians and is free to cancel; NOISE is the median of the ' +
                'per-round |a−b| and cannot — THAT WITHIN-PAIR RULE IS UNCHANGED. WHAT THIS FIGURE ' +
                'IS: the worst any comparison in this table can be read at, and the right single ' +
                'conservative bound for a reader who wants one number for the whole table. WHAT IT ' +
                'IS NOT: the floor the verdicts below use. A gap between two rows that BOTH declare ' +
                'a null is read against those two nulls alone (the line above), because reading it ' +
                'against the table maximum lets the noisiest participant on the table set the ' +
                'reading for every other pair on it. A pair containing a row with no null of its ' +
                'own is read against THIS figure, and the verdict line says so by name.'
        );
        return floors;
    };

    /**
     * ALL EIGHT NULLS OF ONE TABLE, in the order they are printed.
     *
     * SEVERAL AND NOT ONE because a null is a null for the SHAPE it was taken on. A
     * scan-every-derivation program, a walk-the-set-bits program,
     * two table-backed ones, a program that calls through a closure per port, the shipped commit
     * with one line changed and a program with no machine in it at all do not spend their time in
     * the same place, and the instrument does not resolve them equally.
     *
     * AND THAT IS EXACTLY WHY A GAP IS NO LONGER READ AGAINST THE LARGEST OF THEM. If the
     * shapes do not resolve equally, then the worst of the eight is a statement about the worst
     * shape and not about the two rows being subtracted. `printTable` hands back a floor PER PAIR
     * — `max(nullOf(X), nullOf(Y))` — and keeps the maximum as the table-wide conservative bound.
     * See `Floor` for the run that made this necessary.
     */
    const nullsOf = (series: Series): readonly (readonly [string, Null])[] => [
        ['machine·scan', pairOf(series, 'machine·scan')[1]],
        ['machine', pairOf(series, 'machine')[1]],
        // AND THE TWO STATE SHAPES, EACH WITH ITS OWN. A null is a null for the shape it was taken
        // on, and neither table variant spends its time where a named-property program does. WHAT A FIFTH NULL DOES NOW: it makes the two pairs that
        // contain `machine·array` and `machine·nodes` READABLE — before it, their gaps were read
        // against whichever OTHER shape happened to be noisiest — and it leaves every other pair
        // on the table exactly where it was. It can still raise the table-wide bound, and pairs
        // that contain a row with no null of its own are read against that.
        ['machine·array', pairOf(series, 'machine·array')[1]],
        ['machine·nodes', pairOf(series, 'machine·nodes')[1]],
        // `machine·bound`'S OWN NULL STOOD HERE and is struck with the row. It was the only
        // participant whose per-instance shape included closures the commit called through, which
        // is why it needed a null of its own; the shape is gone from the axis, so the null is too.
        // Nothing else on the table moves by it EXCEPT the table-wide bound, which can only fall.
        // AND THE TWO NEWEST SHAPES. `machine·write` is the shipped commit with one line changed, so its
        // null is taken on the shape the write question is actually asked in; `wire` holds no
        // program at all and spends its time in a closure and a `ports.set`, which is not where any
        // machine row spends its. BOTH ARE HERE SO THAT THEIR OWN GAPS CAN BE READ: `machine·write`
        // exists for the `machine ↔ machine·write` line under P20 and `wire` for P21, and until
        // each declared a null those two comparisons were bounded by whatever else on the table
        // happened to be noisiest. Neither loosens nor tightens any pair it is not in.
        ['machine·write', pairOf(series, 'machine·write')[1]],
        ['wire', pairOf(series, 'wire')[1]],
    ];

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 1 — THE MOUNT
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const mountPhases: readonly Phase[] = MOUNT_FIELD.map((p) => ({
        name: p.name,
        reps: MOUNT_REPS * Math.max(1, batch),
        per: TAGS,
        rounds: 1,
        what: p.what,
        allocs: p.allocs,
        prep: (): Scenario => {
            const container = el();
            // THE HANDLES ARE ALLOCATED HERE, UNTIMED. What the timed region builds is the tree
            // and the per-instance state, which is what a mount is.
            const build = p.prepare();
            let mounted: TExoMounted | null = null;
            return {
                measure: () => {
                    mounted = build(container);
                },
                cleanup: () => {
                    if (mounted !== null) mounted.off();
                    container.remove();
                },
            };
        },
    }));
    requireOneSampleCondition(mountPhases, 'MOUNT');

    const mountSeries = runPhases(mountPhases, rounds);
    const mountStat = new Map<string, Stat>();
    for (const p of mountPhases) {
        mountStat.set(p.name, stat(mountSeries.times.get(p.name) as number[]));
    }
    const mountPerTag = (name: string): number => (mountStat.get(name) as Stat).median;

    // THE TITLE'S FIRST TOKEN IS THE SECTION NAME THE RECORDER READS (`SECTION` in
    // `run-one-axis.js` is `^([A-Z][A-Z0-9·-]*)\s+—`), which is what files this table's null block
    // under a name instead of under `null`. "TABLE 1" would not match — the token may not contain a
    // space — so the scene's name leads and the table number follows it.
    const mountFloors = printTable(
        `MOUNT — TABLE 1: ${TAGS} tags built and inserted. ms per mount, ns per tag, and the ` +
            'ratio to the floor.',
        mountPhases,
        mountPerTag,
        nullsOf(mountSeries),
        true
    );
    emitRecordedRows(
        'mount',
        'ns',
        'tag',
        mountPhases.map((p) => [p.name, scaledStat(mountStat.get(p.name) as Stat, 1e6)] as const)
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLES 2, 3 AND 4 — THE THREE UPDATE SCENES
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const updatePhases = (
        pick: (driver: TExoTagDriver) => (k: number) => void,
        roundsPerScenario: number
    ): readonly Phase[] =>
        UPDATE_FIELD.map((p) => ({
            name: p.name,
            reps: SHELLS * Math.max(1, batch),
            per: roundsPerScenario * TAGS,
            rounds: roundsPerScenario,
            what: p.what,
            allocs: p.allocs,
            prep: (): Scenario => {
                // THE MOUNT IS UNTIMED. These tables measure the update, not the build.
                const container = el();
                const mounted = p.prepare()(container);
                const run = pick(mounted.driver());
                return {
                    measure: () => {
                        for (let k = 0; k < roundsPerScenario; k++) run(k);
                    },
                    cleanup: () => {
                        mounted.off();
                        container.remove();
                    },
                };
            },
        }));

    const runUpdateTable = (
        section: string,
        title: string,
        pick: (driver: TExoTagDriver) => (k: number) => void,
        roundsPerScenario: number
    ): {
        readonly phases: readonly Phase[];
        readonly perTag: (name: string) => number;
        readonly floors: TableFloors;
    } => {
        const phases = updatePhases(pick, roundsPerScenario);
        requireOneSampleCondition(phases, section);
        const series = runPhases(phases, rounds);
        const stats = new Map<string, Stat>();
        for (const p of phases) stats.set(p.name, stat(series.times.get(p.name) as number[]));
        const perTag = (name: string): number => (stats.get(name) as Stat).median;
        const floors = printTable(title, phases, perTag, nullsOf(series), false);
        emitRecordedRows(
            section,
            'ns',
            'tag',
            phases.map((p) => [p.name, scaledStat(stats.get(p.name) as Stat, 1e6)] as const)
        );
        return { phases, perTag, floors };
    };

    const one = runUpdateTable(
        'one-field',
        'ONE-FIELD — TABLE 2: `name` changes on every tag; ONE derivation runs. The common case.',
        (d) => d.names,
        FIELD_ROUNDS
    );
    const two = runUpdateTable(
        'two-fields',
        'TWO-FIELDS — TABLE 3: `name` AND `open` both change, as one change. THE CASE THE MASK ' +
            'EXISTS FOR: form B must run `label` ONCE.',
        (d) => d.nameAndOpen,
        FIELD_ROUNDS
    );
    const none = runUpdateTable(
        'unread-field',
        'UNREAD-FIELD — TABLE 4: `note` is written; no derivation reads it and no port is touched ' +
            'by any participant.',
        (d) => d.notes,
        NOTE_ROUNDS
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLES 5 TO 8 — THE SAME FOUR QUESTIONS ON THE WIDE COMPONENT
    // ═══════════════════════════════════════════════════════════════════════════════════════
    //
    // EVERY WIDE TABLE CARRIES ITS OWN NULLS AND ITS OWN RESOLUTION, at its own round count. A
    // resolution borrowed from the narrow tables would be a resolution taken on a different scene
    // with a different unit count, and this suite has published wrong figures that way before.

    const wideNullsOf = (series: Series): readonly (readonly [string, Null])[] => [
        ['machine·scan', pairOf(series, 'machine·scan')[1]],
        ['machine', pairOf(series, 'machine')[1]],
        ['machine·array', pairOf(series, 'machine·array')[1]],
        ['machine·nodes', pairOf(series, 'machine·nodes')[1]],
        // AND THE WIRE'S OWN. It holds no program, no mask and no commit, and spends its time in a
        // closure call and a `ports.set`, which is not where any machine row spends its — and a
        // null is only a null for the shape it was taken on. IT IS HERE SO THAT P22's `wire ↔
        // machine` CAN BE READ AT ALL: with no null of its own, that comparison was bounded by
        // whichever unrelated row on the table happened to be noisiest.
        ['wire', pairOf(series, 'wire')[1]],
        // AND THE MACHINE'S CHEAP SPELLING'S OWN, for the identical reason. It declares no field at
        // all, so it spends its time in a property store into its cached object, a commit that
        // returns on its
        // first comparison and `c.set` — which is neither where `machine` spends its (a bit walk, a
        // `computes` call, a `ports[i]` load) nor where `wire` spends its (a closure call and
        // the shipped port write). THIS IS THE ROW THE DEFECT WAS FOUND ON:
        // a table-wide floor set by one noisy row published `wire ↔ machine·imperative` UNRESOLVED.
        // See `Floor`.
        ['machine·imperative', pairOf(series, 'machine·imperative')[1]],
    ];

    const wideMountPhases: readonly Phase[] = WIDE_MOUNT_FIELD.map((p) => ({
        name: p.name,
        reps: WIDE_MOUNT_REPS * Math.max(1, batch),
        per: WIDE_ROWS,
        rounds: 1,
        what: p.what,
        allocs: p.allocs,
        prep: (): Scenario => {
            const container = el();
            const build = p.prepare();
            let mounted: TExoWideMounted | null = null;
            return {
                measure: () => {
                    mounted = build(container);
                },
                cleanup: () => {
                    if (mounted !== null) mounted.off();
                    container.remove();
                },
            };
        },
    }));
    requireOneSampleCondition(wideMountPhases, 'WIDE-MOUNT');

    const wideMountSeries = runPhases(wideMountPhases, rounds);
    const wideMountStat = new Map<string, Stat>();
    for (const p of wideMountPhases) {
        wideMountStat.set(p.name, stat(wideMountSeries.times.get(p.name) as number[]));
    }
    const wideMountPerRow = (name: string): number => (wideMountStat.get(name) as Stat).median;

    const wideMountFloors = printTable(
        `WIDE-MOUNT — TABLE 5: ${WIDE_ROWS} wide rows built and inserted, ${WIDE_PORTS} ports ` +
            `each. This is where "one object per instance" is worth something or is not.`,
        wideMountPhases,
        wideMountPerRow,
        wideNullsOf(wideMountSeries),
        true,
        WIDE_ROWS,
        'row'
    );
    emitRecordedRows(
        'wide-mount',
        'ns',
        'row',
        wideMountPhases.map(
            (p) => [p.name, scaledStat(wideMountStat.get(p.name) as Stat, 1e6)] as const
        )
    );

    const wideUpdatePhases = (
        pick: (driver: TExoWideDriver) => (k: number) => void,
        roundsPerScenario: number
    ): readonly Phase[] =>
        WIDE_UPDATE_FIELD.map((p) => ({
            name: p.name,
            reps: WIDE_SHELLS * Math.max(1, batch),
            per: roundsPerScenario * WIDE_ROWS,
            rounds: roundsPerScenario,
            what: p.what,
            allocs: p.allocs,
            prep: (): Scenario => {
                const container = el();
                const mounted = p.prepare()(container);
                const run = pick(mounted.driver());
                return {
                    measure: () => {
                        for (let k = 0; k < roundsPerScenario; k++) run(k);
                    },
                    cleanup: () => {
                        mounted.off();
                        container.remove();
                    },
                };
            },
        }));

    const runWideTable = (
        section: string,
        title: string,
        pick: (driver: TExoWideDriver) => (k: number) => void,
        roundsPerScenario: number
    ): {
        readonly phases: readonly Phase[];
        readonly perRow: (name: string) => number;
        readonly floors: TableFloors;
    } => {
        const phases = wideUpdatePhases(pick, roundsPerScenario);
        requireOneSampleCondition(phases, section);
        const series = runPhases(phases, rounds);
        const stats = new Map<string, Stat>();
        for (const p of phases) stats.set(p.name, stat(series.times.get(p.name) as number[]));
        const perRow = (name: string): number => (stats.get(name) as Stat).median;
        const floors = printTable(
            title,
            phases,
            perRow,
            wideNullsOf(series),
            false,
            WIDE_ROWS,
            'row'
        );
        emitRecordedRows(
            section,
            'ns',
            'row',
            phases.map((p) => [p.name, scaledStat(stats.get(p.name) as Stat, 1e6)] as const)
        );
        return { phases, perRow, floors };
    };

    const wideOne = runWideTable(
        'wide-one-field',
        `WIDE-ONE-FIELD — TABLE 6: \`f2\` changes; ${WIDE_ONE_WOKEN.length} of ` +
            `${WIDE_READS.length} derivations run. THE TABLE THE DESIGN LIVES OR DIES ON: \`machine\` ` +
            'runs exactly the affected ones, `machine·scan` scans all of them.',
        (d) => d.one,
        WIDE_FIELD_ROUNDS
    );
    const wideSome = runWideTable(
        'wide-some-fields',
        `WIDE-SOME-FIELDS — TABLE 7: \`f0\`, \`f2\` and \`f12\` as ONE change — ` +
            `${WIDE_SOME_WOKEN.length} derivations woken along overlapping paths, INCLUDING THE ` +
            'CHAIN. Derivation 19 is reached twice and must run once.',
        (d) => d.some,
        WIDE_FIELD_ROUNDS
    );
    const wideNone = runWideTable(
        'wide-unread-field',
        'WIDE-UNREAD-FIELD — TABLE 8: `f19` is written; nothing reads it. `machine``s entry is 0 ' +
            'HOWEVER WIDE the component is; `machine·scan` scans every declared derivation to match none.',
        (d) => d.none,
        WIDE_NOTE_ROUNDS
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLES 11 TO 14 — THE TRANSITION LADDER
    // ═══════════════════════════════════════════════════════════════════════════════════════
    //
    // TABLE 11 IS ONE TABLE FOR ALL THREE RUNGS AND THE CALL TABLES ARE ONE PER RUNG, and that
    // asymmetry is forced by what a floor row means. Every mount region builds the same markup with
    // the same instance count whatever the rung, so one floor row is the right denominator for all
    // twelve rows — and the floor's mount being FLAT in the rung is the null hypothesis the wire's
    // mount is tested against rather than a convenience. A CALL region is different: a round at rung
    // n does n stores and n port writes on EVERY arm including the floor, so the floor's own cost
    // moves with the rung and each rung needs its own floor row, its own nulls and its own
    // resolution. A cross-rung comparison therefore crosses two tables and is read at `widerOf` of
    // the two pair floors, exactly as P3 and P17 are.

    const ladderNullsOf = (series: Series, n: number): readonly (readonly [string, Null])[] => [
        pairOf(series, `wire·n${n}`),
        pairOf(series, `machine·n${n}`),
    ];

    const ladderMountPhases: readonly Phase[] = LADDER_MOUNT_FIELD.map((p) => ({
        name: p.name,
        reps: LADDER_MOUNT_REPS * Math.max(1, batch),
        per: LADDER_INSTANCES,
        rounds: 1,
        what: p.what,
        allocs: p.allocs,
        prep: (): Scenario => {
            const container = el();
            const build = p.prepare();
            let mounted: TExoLadderMounted | null = null;
            return {
                measure: () => {
                    mounted = build(container);
                },
                cleanup: () => {
                    if (mounted !== null) mounted.off();
                    container.remove();
                },
            };
        },
    }));
    requireOneSampleCondition(ladderMountPhases, 'LADDER-MOUNT');

    const ladderMountSeries = runPhases(ladderMountPhases, rounds);
    const ladderMountStat = new Map<string, Stat>();
    for (const p of ladderMountPhases) {
        ladderMountStat.set(p.name, stat(ladderMountSeries.times.get(p.name) as number[]));
    }
    const ladderMountPer = (name: string): number => (ladderMountStat.get(name) as Stat).median;

    const ladderMountFloors = printTable(
        `LADDER-MOUNT — TABLE 11: ${LADDER_INSTANCES} rows of ${LADDER_PORTS} ports, built and ` +
            `inserted, by components declaring ${LADDER_RUNGS.join(', ')} transitions. THE SCENE ` +
            'IS IDENTICAL ON EVERY ROW — same markup, same instances, same fill — and the ONLY ' +
            'thing that differs is how many transitions the component declared, so this table may ' +
            'be read straight down.',
        ladderMountPhases,
        ladderMountPer,
        [
            ...ladderNullsOf(ladderMountSeries, 1),
            ...ladderNullsOf(ladderMountSeries, 4),
            ...ladderNullsOf(ladderMountSeries, 16),
        ],
        true,
        LADDER_INSTANCES,
        'row'
    );
    emitRecordedRows(
        'ladder-mount',
        'ns',
        'row',
        ladderMountPhases.map(
            (p) => [p.name, scaledStat(ladderMountStat.get(p.name) as Stat, 1e6)] as const
        )
    );

    const runLadderCallTable = (
        n: number
    ): {
        readonly phases: readonly Phase[];
        readonly perRow: (name: string) => number;
        readonly floors: TableFloors;
    } => {
        const roundsPerScenario = ladderRoundsAt(n);
        const phases: readonly Phase[] = ladderCallField(n).map((p) => ({
            name: p.name,
            reps: LADDER_SHELLS * Math.max(1, batch),
            per: roundsPerScenario * LADDER_INSTANCES,
            rounds: roundsPerScenario,
            what: p.what,
            allocs: p.allocs,
            prep: (): Scenario => {
                const container = el();
                const mounted = p.prepare()(container);
                const driver = mounted.driver();
                return {
                    measure: () => {
                        for (let k = 0; k < roundsPerScenario; k++) driver.call(k);
                    },
                    cleanup: () => {
                        mounted.off();
                        container.remove();
                    },
                };
            },
        }));
        requireOneSampleCondition(phases, `LADDER-CALL-N${n}`);
        const series = runPhases(phases, rounds);
        const stats = new Map<string, Stat>();
        for (const p of phases) stats.set(p.name, stat(series.times.get(p.name) as number[]));
        const perRow = (name: string): number => (stats.get(name) as Stat).median;
        const floors = printTable(
            `LADDER-CALL-N${n} — TABLE ${
                11 + LADDER_RUNGS.indexOf(n) + 1
            }: every one of the ${n} ` +
                `transition(s) this component declares, called once per row per round, ` +
                `${roundsPerScenario} rounds per scenario. THE UNIT IS ns PER ROW-ROUND AND A ` +
                `ROW-ROUND HERE IS ${n} CALL(S), so nothing on this table may be read against ` +
                'another rung`s table row for row — what may is the wire↔machine gap, which both ' +
                'arms carry the growth inside.',
            phases,
            perRow,
            ladderNullsOf(series, n),
            false,
            LADDER_INSTANCES,
            'row'
        );
        emitRecordedRows(
            `ladder-call-n${n}`,
            'ns',
            'row',
            phases.map((p) => [p.name, scaledStat(stats.get(p.name) as Stat, 1e6)] as const)
        );
        return { phases, perRow, floors };
    };

    const ladderCall1 = runLadderCallTable(1);
    const ladderCall4 = runLadderCallTable(4);
    const ladderCall16 = runLadderCallTable(16);

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // THE VERDICTS — the header's five predictions, judged mechanically
    // ═══════════════════════════════════════════════════════════════════════════════════════
    //
    // PRINTED FROM THE MEDIANS, never chosen afterwards. Every comparison is qualified by THE FLOOR
    // OF THE TWO ROWS IN IT — `max(nullOf(X), nullOf(Y))` where both declare a null, and the table's
    // worst where either does not — and a gap under that is reported as UNRESOLVED rather than as a
    // win for whichever side happens to be lower. Every line prints WHICH of the two rules bounded
    // it; see `Floor` for why the table maximum was the wrong bound for a two-row gap.

    const verdict = (
        claim: string,
        lower: number,
        higher: number,
        floor: Floor,
        mechanism: string
    ): void => {
        const delta = higher - lower;
        const resolution = floor.value;
        if (Math.abs(delta) <= resolution) {
            line(
                `  UNRESOLVED — ${claim}: the two are ${f6(Math.abs(delta) * 1e6)} ns per tag ` +
                    `apart and this PAIR resolved ${f6(resolution * 1e6)} ns [${floor.basis}]. ` +
                    `Nothing here says which is cheaper. ${mechanism}`
            );
            return;
        }
        if (delta > 0) {
            line(
                `  HOLDS — ${claim}: the side the claim puts LOWER measured ${ns(lower)} ns per ` +
                    `tag and the side it puts HIGHER measured ${ns(higher)}, a gap of ` +
                    `${f6(delta * 1e6)} ns, which is ${(delta / resolution).toFixed(1)}× this ` +
                    `PAIR's floor [${floor.basis}]. ${mechanism}`
            );
            return;
        }
        // A FAILED PREDICTION IS A FINDING AND NOT A REFUSAL, so it goes out through `line` and not
        // through `refuse`. `run-one-axis.js` collects every `❌` into the recording's `refusals`
        // and prints "the axis refused N of its own result(s)"; a falsified prediction is the
        // opposite of a disowned number — it is the axis working. `mount-floor` prints its
        // falsifier verdicts the same way, HOLDS and FAILED alike, and this follows it.
        line(
            `  FAILS — ${claim}: the direction is REVERSED by ${f6(-delta * 1e6)} ns per tag, ` +
                `${(-delta / resolution).toFixed(1)}× this PAIR's floor [${floor.basis}]. ` +
                `${mechanism}`
        );
    };

    line('');
    line('THE PREDICTIONS THIS FILE COMMITTED BEFORE THE FIRST RUN, JUDGED MECHANICALLY');
    line(
        '  EVERY FIGURE IN THIS BLOCK IS NANOSECONDS PER TAG, including the floors. The tables ' +
            `above print the same figures as µs per scene unit, which is this one × ${TAGS} ` +
            '÷ 1000; both spellings are on the RESOLUTION FLOOR lines so neither can be quoted at ' +
            "the other's scale. AND EVERY FLOOR BELOW IS THE FLOOR OF ITS OWN PAIR, not the " +
            "table's maximum: `[PAIR FLOOR — …]` means both rows declared a null and the gap was " +
            'read against those two alone; `[TABLE FLOOR — …]` means one of them declares no null ' +
            'of its own and nothing narrower than the whole table is known about the pair.'
    );
    line(
        '  P4 — UNREAD FIELD: form B is NOT free. It pays a field store, a mask OR and one mask ' +
            'test per DECLARED derivation.'
    );
    verdict(
        'floor ≤ machine·scan on a field nothing depends on',
        none.perTag('floor'),
        none.perTag('machine·scan'),
        none.floors.of('floor', 'machine·scan'),
        'The floor for this scene is one property store, and nothing can be under it.'
    );
    line(
        "  P5 — every gap published above clears ITS OWN PAIR's floor, or it was printed as " +
            'UNRESOLVED by name. That is enforced by `verdict` and not by this sentence, and the ' +
            'floor each gap was read against is named in brackets on its own line.'
    );

    line('');
    line('AND THE THREE THE COMPILED FORM ADDED, committed before its first run');
    line(
        '  P6 — THE UNREAD FIELD IS WHERE THE TABLE PAYS FOR ITSELF. `machine` < `machine·scan` on TABLE 4, because ' +
            "`note`'s entry in the field→derivations table is 0: the mark ORs a zero, the pending " +
            'set never leaves zero, and the commit returns on its first comparison. Form B runs a ' +
            'loop over EVERY declared derivation there. On TABLES 2 and 3 this component declares ' +
            'TWO derivations, so the same change saves at most one mask test and NO DIRECTION IS ' +
            'PREDICTED. THE SCENE THAT SHOWS IT IS TABLE 6, on a component with twenty, and P9 ' +
            'below is the prediction this one could not make.'
    );
    verdict(
        'machine < machine·scan on a field nothing depends on',
        none.perTag('machine'),
        none.perTag('machine·scan'),
        none.floors.of('machine', 'machine·scan'),
        'MECHANISM: machine·scan writes the field, ORs a FIELD bit and then tests every declared derivation ' +
            "against it; machine writes the field, ORs that field's DERIVATION SET — which is zero — and " +
            'the commit returns. The two do the same amount of arithmetic per WRITE; what differs ' +
            'is that one of them then has a loop to run.'
    );
    line(
        `     machine against machine·scan on one field: ${ns(one.perTag('machine'))} against ${ns(
            one.perTag('machine·scan')
        )} ns ` +
            `per tag; on two fields: ${ns(two.perTag('machine'))} against ${ns(
                two.perTag('machine·scan')
            )}. NO ` +
            'DIRECTION WAS PREDICTED on either and none is claimed.'
    );
    line(
        '  P7 — PORTABILITY: `machine·copy` ≤ `machine`. THE PREDICTION STANDS AND ITS MECHANISM DOES NOT, ' +
            'and the correction is printed rather than the old sentence. It was committed as "the ' +
            'whole price of writing through the interface every backend answers", i.e. as the ' +
            'price of ONE LINE. IT IS NOT: `machine·copy` is a copy of the shipped commit with the ' +
            'write swapped AND FOUR THINGS OMITTED — the effect-mask split, the per-derivation ' +
            '`ports[i]` load and null branch, `exoTransition`s two calls (a batch test ' +
            'stood beside them in this list until the shipped closure stopped making one), ' +
            'and `compiledDriver`s property load per tag. WHATEVER THE GAP BELOW IS, IT IS NOT THE ' +
            'PRICE OF THE PORT WRITE; `machine·write` is the row that answers that, under P20.'
    );
    verdict(
        'machine·copy ≤ machine on one field',
        one.perTag('machine·copy'),
        one.perTag('machine'),
        one.floors.of('machine·copy', 'machine'),
        'MECHANISM: one write per tag through each path, PLUS the four omissions named above. A ' +
            'gap here is the sum of five differences and this line does not split it.'
    );
    verdict(
        'machine·copy ≤ machine on two fields',
        two.perTag('machine·copy'),
        two.perTag('machine'),
        two.floors.of('machine·copy', 'machine'),
        'Also one write per tag: two fields feed ONE derivation, so both rows write once — and ' +
            'also the same four omissions.'
    );
    line(
        '     AND THE MOUNT HALF OF THIS ROW`S QUESTION IS ANSWERED AT ZERO, which is why it is ' +
            'printed as a sentence and not as a prediction. `machine·copy` used to avoid a per-instance ' +
            '`c.fillDoors()` wrapper that `machine` allocated; `machine` allocates no wrapper now — it carries the ' +
            'instance`s port TABLE and the schema`s WRITE as two references on the state object it ' +
            'was building anyway — so both rows allocate ONE object per instance and the mount ' +
            'tables print the allocation counts underneath each row. THIS LINE USED TO END "What ' +
            'is left below is the WRITE, and nothing else", AND THAT WAS FALSE — four other ' +
            'differences are left, they are named under P7 above, and P20 is the row that removes ' +
            'them.'
    );
    verdict(
        'machine·copy ≤ machine at the mount (both allocate one object; what differs is one flatten pass at the FIRST wire)',
        mountPerTag('machine·copy'),
        mountPerTag('machine'),
        mountFloors.of('machine·copy', 'machine'),
        'MECHANISM: `machine` calls two connector accessors per instance (a field read, and a closure ' +
            'the schema makes at most once); `machine·copy` reads the instance record node table and flattens writer+slot per ' +
            'derivation ONCE, at the first wire of the process. NEITHER IS AN ALLOCATION PER ' +
            'INSTANCE any more, so a resolved gap here would be about the accessor calls, not ' +
            'about an object.'
    );

    // ── P19 — WITHDRAWN WITH THE ROW IT PREDICTED, AND THE WITHDRAWAL IS PRINTED ──────────
    //
    // It committed to a SHAPE — that not all three of `machine`, `machine·copy` and `machine·bound`
    // separate against their own pair floors on TABLE 2 — with no direction predicted between the
    // two non-portable rows. IT IS NOT JUDGED, BECAUSE ONE OF ITS THREE ROWS NO LONGER EXISTS. That
    // is printed rather than silently dropped: a reader who has just read P7 is the reader P19 was
    // for, and a missing prediction between P18 and P20 reads as an omission.
    line(
        '  P19 — WITHDRAWN, AND NOT BECAUSE IT FAILED. It compared THREE spellings of one write: ' +
            '`machine` writes `write(table, port, value)` (2 calls, 3 array loads), `machine·copy` ' +
            'writes `writers[i](nodes[slots[i]], value)` (1 call, 3 loads), and `machine·bound` ' +
            'wrote `writes[i](value)` through a writer taken from `c.portWriter(port)` at ' +
            'the wire (2 calls, 1 load). THAT LIBRARY METHOD IS DELETED FROM EVERY BACKEND: on bare ' +
            'shapes, 1000 instances x 5 ports, null pair 0.006 ns per write, its hand-out amortised ' +
            'onto 0.655 ns per write ABOVE `c.set` and STAYED there from one write to sixty-four, ' +
            'because the function it handed back cost a second call frame and a frame is not ' +
            'amortisable. THE ROW WENT WITH THE METHOD AND SO DID ITS NULL. NOTHING HERE IS ' +
            'REASSIGNED to P19, and no number below is offered in its place.'
    );
    line(
        '     WHAT THE AXIS LOST BY IT, NAMED SO IT IS NOT INFERRED FROM SILENCE: ' +
            '`machine·copy ↔ machine·bound` was the ONE pair in this family whose gap was purely a ' +
            'difference of write spelling — both omitted the identical four things `machine` pays ' +
            '— and it has no substitute. `machine ↔ machine·copy` still carries all four omissions ' +
            'and MUST NOT be quoted as the price of a write; `machine·write` (P20, below) is the ' +
            'row that prices the line alone, and it asks a different question.'
    );

    // ── P20 — THE WRITE LINE ALONE, WHICH IS WHAT P7 AND P19 WERE READ AS SAYING ──────────
    //
    // NOTHING HERE GOES THROUGH `verdict` FOR A DIRECTION, because none is predicted. What is
    // committed is a comparison of two GAPS, and it is judged by comparing them.
    line('');
    line(
        '  P20 — `machine·write` IS THE SHIPPED COMMIT WITH ONE LINE CHANGED — `writers[i](table[' +
            'slots[i]], value)` where `machine` writes `write(table, port, value)` — and it keeps ' +
            'EVERYTHING `machine·copy` (and the struck `machine·bound`) leaves out: the effect-mask split, the ' +
            '`ports[i]` load, the null branch, the store path, the `after` OR, ' +
            '`exoTransition`s wrapper — `apply` then `settle`, with NOTHING BETWEEN THEM, which is ' +
            'what the shipped closure is since the module-global batch depth was deleted; a ' +
            'stand-in for that depth stood in this row until the same edit removed it, and while ' +
            'it stood this row paid a load and a comparison `machine` did not — `machine`s own ' +
            'state type and ' +
            '`compiledDriver` itself. WHAT IS PREDICTED: the gap `machine·write ↔ machine` is SMALLER than ' +
            '`machine·copy ↔ machine`, or both are UNRESOLVED — which would mean the four omissions carry ' +
            'part of what `machine·copy`s gap was read as saying. NO DIRECTION AND NO SIZE IS ' +
            'PREDICTED FOR THE WRITE ITSELF.'
    );
    const writeAlone = Math.abs(one.perTag('machine·write') - one.perTag('machine'));
    const directGap = Math.abs(one.perTag('machine·copy') - one.perTag('machine'));
    // TWO PAIRS, TWO FLOORS, AND THEY DIFFER. `machine·write` declares its own null — it was added
    // to `nullsOf` for exactly this line — so `machine ↔ machine·write` is read against those two
    // nulls; `machine·copy` declares none, so its gap is still bounded by the table.
    const writeAloneFloor = one.floors.of('machine', 'machine·write');
    const directGapFloor = one.floors.of('machine', 'machine·copy');
    for (const [pair, gap, floor] of [
        ['machine ↔ machine·write', writeAlone, writeAloneFloor],
        ['machine ↔ machine·copy', directGap, directGapFloor],
    ] as const) {
        line(
            `     ${pair.padEnd(20)}${f6(gap * 1e6).padStart(10)} ns per tag against a floor ` +
                `of ${f6(floor.value * 1e6)} ns — ${
                    gap > floor.value ? 'SEPARATED' : 'UNRESOLVED'
                } (= ${(gap / floor.value).toFixed(2)} floors) [${floor.basis}]`
        );
    }
    line(
        writeAlone < directGap ||
            (writeAlone <= writeAloneFloor.value && directGap <= directGapFloor.value)
            ? '  HOLDS — P20: the one-line row sits closer to `machine` than the four-omission row does, ' +
                  'or neither separates. WHAT THAT LICENSES AND NOTHING MORE: the difference ' +
                  'between the two gaps is what the four omissions cost, and `machine ↔ machine·write` is the ' +
                  'only figure on this axis that may be quoted as the price of the port write. If ' +
                  'it reads UNRESOLVED, the correct sentence is "the write line is below what this ' +
                  'instrument resolves at this scene" — not "the write is free".'
            : '  FAILS — P20: the row that pays the four omissions is FURTHER from `machine` than the ' +
                  'row that skips them. Something other than the enumerated five differs between ' +
                  '`machine` and one of these two rows, and every sentence on this axis about the price ' +
                  'of a write is unsupported until it is found. Do not publish a write figure from ' +
                  'this run.'
    );
    line(
        `     on TWO fields: machine·write ${ns(two.perTag('machine·write'))} against machine ${ns(
            two.perTag('machine')
        )} ns per tag; and on the field NOTHING reads, where neither row writes a port at all: ` +
            `machine·write ${ns(none.perTag('machine·write'))} against machine ${ns(
                none.perTag('machine')
            )}. THE LAST ` +
            'PAIR IS THE CONTROL — these two rows run the identical program there, so a ' +
            'difference on TABLE 4 is a difference this row does not have and would mean the ' +
            'copy has drifted.'
    );
    line(
        `     AND AT THE MOUNT: machine·write ${ns(
            mountPerTag('machine·write')
        )} against machine ${ns(mountPerTag('machine'))} ns per tag, against a floor of ${f6(
            mountFloors.of('machine·write', 'machine').value * 1e6
        )} ns [${mountFloors.of('machine·write', 'machine').basis}]. Both build the ` +
            'same eight-field object through the same `fillExoMachineDerivations`; what differs is ' +
            'one flatten pass of two derivations at the FIRST wire of the process, and ONE BOOLEAN ' +
            'TEST PER INSTANCE guarding it. That test is the only thing this row adds to a mount ' +
            'and it is named rather than rounded away.'
    );

    // ── P21 — THE WIRE, WHICH IS THE QUESTION THE APP AXIS COULD NOT RESOLVE ───────────────
    line('');
    line(
        '  P21 — `wire` AGAINST `machine`, AND NO DIRECTION IS PREDICTED. MECHANISM BOTH WAYS, because ' +
            'both are real. THE WIRE per update: one closure call, its own recompute, and ' +
            '`ExoDomPorts.set` — a method call, a `port.index` load, a FILL-RECORD TEST, two array ' +
            'loads and the setter call. `machine` per update: four calls (the transition closure, ' +
            '`apply`, `settle`, the commit), a field store, a mask OR, the ' +
            'effect-mask split, a bit walk, a `computes` call, a `ports[i]` load, a branch — and ' +
            'then a write with NO record test in front of it. THE WIRE HAS THE SHORTER PATH AND ' +
            'THE MORE EXPENSIVE WRITE. WHAT IS PREDICTED IS THE SHAPE: the pair separates against ' +
            'ITS OWN FLOOR — both rows declare a null, so it is read against those two and not ' +
            'against the table — or it does not, and an UNRESOLVED is an ANSWER: it would ' +
            'say the two shapes cost the same to update at this width.'
    );
    for (const [scene, table] of [
        ['one field', one],
        ['two fields', two],
        ['unread field', none],
    ] as const) {
        const gap = Math.abs(table.perTag('wire') - table.perTag('machine'));
        const floor = table.floors.of('wire', 'machine');
        line(
            `     wire ↔ machine, ${scene.padEnd(13)}${ns(table.perTag('wire'))} against ${ns(
                table.perTag('machine')
            )} ns per tag — |Δ| ${f6(gap * 1e6)} ns against a floor of ${f6(
                floor.value * 1e6
            )} ns — ${gap > floor.value ? 'SEPARATED' : 'UNRESOLVED'} [${floor.basis}]`
        );
    }
    line(
        `     AND AT THE MOUNT, WHICH IS WHERE THE WIRE PAYS: wire ${ns(
            mountPerTag('wire')
        )} against machine ${ns(mountPerTag('machine'))} ns per tag, floor ${f6(
            mountFloors.of('wire', 'machine').value * 1e6
        )} ns [${
            mountFloors.of('wire', 'machine').basis
        }]. SEVEN allocations per instance against TWO — a fillDoors() wrapper, four handler ` +
            'closures, the object carrying them and the click — and the shape of that count is the ' +
            'finding rather than its size: a machine declares its transitions ONCE PER COMPONENT ' +
            'and hands them the instance, so its per-instance cost does not grow with the number ' +
            'of doors the world may push through. A WIRE`S DOOR IS A CLOSURE OVER THIS INSTANCE.'
    );
    line(
        '     WHAT NO NUMBER HERE SAYS ABOUT THE WIRE: it has no batch, so two writes to one port ' +
            'in one turn are two DOM writes; no declaration, so nothing can read what it depends ' +
            'on; no shared program, so every instance re-makes every closure; and no ordering, so ' +
            'two handlers writing one port leave the last one standing. IT WRITES `label` ONCE ON ' +
            'TABLE 3 BECAUSE ITS AUTHOR WROTE IT THAT WAY, and no gate in this file could catch ' +
            'him getting it wrong — which is caveat (6) applied to the shape caveat (6) is about.'
    );

    // ── P22 — THE WIRE AT WIDTH, WHICH IS WHERE THE FORMS HAVE ROOM TO SEPARATE ────────────
    line('');
    line(
        '  P22 — `wire` AGAINST `machine` AT WIDTH, AND NO DIRECTION IS PREDICTED BETWEEN THEM. This is ' +
            'P21 asked where an answer is possible: at TWO derivations a hand-held map and a ' +
            'compiled one differ by at most a mask test, at TWENTY the machine reads an inverted ' +
            'table and the wire reads its author. THE TWO RUN THE SAME DERIVATIONS — this row is ' +
            'the spelling that updates ONLY what the changed field feeds, so the gap is the ' +
            'bookkeeping and not the job. THE WIRE per woken derivation: an array load, the ' +
            'compute call, and `ExoDomPorts.set` — a method call, a `port.index` load, a ' +
            'FILL-RECORD TEST, two array loads and the setter call; per update, one closure call ' +
            'and no bookkeeping whatever. `machine` per update: `exoTransition`s two calls and its batch ' +
            'test, the field stores, one mask OR per field, the effect-mask split, and then per ' +
            'woken derivation a bit scan, a `computes` call, a `ports[i]` load, a branch and a ' +
            'write with NO record test in front of it.'
    );
    for (const [scene, table] of [
        ['one field', wideOne],
        ['three fields', wideSome],
        ['unread field', wideNone],
    ] as const) {
        const gap = Math.abs(table.perRow('wire') - table.perRow('machine'));
        const floor = table.floors.of('wire', 'machine');
        line(
            `     wire ↔ machine, ${scene.padEnd(13)}${ns(table.perRow('wire'))} against ${ns(
                table.perRow('machine')
            )} ns per row — |Δ| ${f6(gap * 1e6)} ns against a floor of ${f6(
                floor.value * 1e6
            )} ns — ${gap > floor.value ? 'SEPARATED' : 'UNRESOLVED'} [${floor.basis}]`
        );
    }
    // AND THE ONE HALF OF P22 THAT DOES CARRY A DIRECTION, because it is about the wire and the
    // FLOOR rather than about the wire and `machine`.
    const wireFloorGap = wideOne.perRow('wire') - wideOne.perRow('floor');
    // THE `floor` ROW DECLARES NO TWIN, so this comparison gets the table's figure and says so.
    // Nothing narrower is known about it, and that is a MISSING NULL rather than a property of the
    // pair: a `floor·twin` would make this the sharpest reading on the axis.
    const wireFloorFloor = wideOne.floors.of('wire', 'floor');
    let wireFloorVerdict = 'AT THE FLOOR (UNRESOLVED)';
    if (Math.abs(wireFloorGap) > wireFloorFloor.value) {
        wireFloorVerdict = wireFloorGap < 0 ? 'BELOW THE FLOOR' : 'ABOVE THE FLOOR';
    }
    line(
        `     wire ↔ floor ON TABLE 6: ${ns(wideOne.perRow('wire'))} against ${ns(
            wideOne.perRow('floor')
        )} ns per row — Δ ${f6(wireFloorGap * 1e6)} ns against a floor of ${f6(
            wireFloorFloor.value * 1e6
        )} ns [${
            wireFloorFloor.basis
        }] — ${wireFloorVerdict}. PREDICTED AT OR BELOW: the floor runs the three woken ` +
            'derivations in a straight line and so does this row, so the two do the same job — ' +
            'the wire`s only structural ' +
            'addition is `ports.set` against a `.data` store. ABOVE IT BY MORE THAN THE RESOLUTION ' +
            'WOULD SAY that write is dearer than the whole of the machinery `machine` runs.'
    );
    line(
        `     AND AT THE WIDE MOUNT, WHICH IS WHERE THE WIRE PAYS: wire ${ns(
            wideMountPerRow('wire')
        )} against machine ${ns(wideMountPerRow('machine'))} ns per row, floor ${f6(
            wideMountFloors.of('wire', 'machine').value * 1e6
        )} ns [${
            wideMountFloors.of('wire', 'machine').basis
        }]. FIVE allocations per instance against ONE — a fillDoors() wrapper, THREE door closures ` +
            'and the object carrying them — and the shape of the count is the finding rather than ' +
            'its size: it tracks DOORS and not fields, so it is three here because this axis ' +
            'drives three scenes and would be twenty for a row the world pushes field by field, ' +
            'where a machine`s per-instance count does not move at all. Neither wire row counts ' +
            'the closure CONTEXT, one more object per instance in both.'
    );
    line(
        '     WHAT THIS ROW DID NOT MEASURE, AND IT IS THE OTHER HONEST SPELLING: a wide wire that ' +
            `REFRESHES ALL ${WIDE_PORTS} PORTS on any change, which is what an author writes when ` +
            'the dependency map lives only in his head. It would run ' +
            `${WIDE_PORTS} recomputes and ${WIDE_PORTS} DOM writes where this row runs ` +
            `${WIDE_ONE_WOKEN.length} on TABLE 6 and ${
                WIDE_SOME_WOKEN.length - 1
            } on TABLE 7, and on TABLE 8 IT WOULD BE THE ONLY PARTICIPANT ON THIS AXIS THAT ` +
            'TOUCHES THE DOM AT ALL — for a field no derivation reads. IT IS LEFT OFF FOR A COST ' +
            'AS WELL AS A REASON: TABLE 8 runs at ' +
            `${WIDE_NOTE_ROUNDS} rounds precisely because nobody writes a port there. AND THE MAP ` +
            'THIS ROW DOES HOLD IS HELD BY HAND: the gate catches a map that is too SMALL, because ' +
            'a stale port diverges from the floor byte for byte, and CANNOT catch one that is too ' +
            'LARGE, because a redundant write lands the value that was already there.'
    );

    // ── P23 — THE MACHINE'S CHEAP SPELLING, WHICH WAS ON NO TABLE ABOVE ────────────────────
    line('');
    line(
        '  P23 — `machine·imperative` AGAINST BOTH ITS NEIGHBOURS, AND NO DIRECTION IS PREDICTED AGAINST ' +
            'EITHER. WHY THE ROW EXISTS: every wide comparison above put the machine`s MOST ' +
            'EXPENSIVE spelling — twenty declared derivations, an inverted table, a mask, a pending ' +
            'word and a commit walk — against the wire`s only one. This row is the machine`s CHEAP ' +
            'spelling: NO derivation, NO fill, NO FIELD, and three transitions declared ONCE PER ' +
            'COMPONENT that write the ports themselves with `c.set`. ITS STATE IS IN THE CACHE — ' +
            'one `m.keep` slot holding one object of twenty NAMED PROPERTIES, which is ' +
            'the same shape `machine` holds its state in — because a value that no declaration ' +
            'reads can never wake anything, and a field is an address for waking. It runs the ' +
            'derivations both neighbours ' +
            'run. MECHANISM, THREE WAYS, because all three are real: THIS ROW per update — the ' +
            'transition closure, `apply`, `settle`, a commit that returns on ' +
            'its FIRST comparison (this component declares no field, so its pending word cannot ' +
            'leave zero), ONE `c.kept` for the body (two loads), one PROPERTY STORE per ' +
            'value written, and per woken ' +
            'derivation two property loads, the compute call and `c.set` — a prototype method call, two ' +
            'field loads off the instance and the schema`s write. `machine` pays ' +
            'the same transition wrapper and then a REAL commit: the effect-mask split, a bit scan ' +
            'per woken slot, a `computes` call, a `ports[i]` load, a branch, the write. `wire` pays ' +
            'one closure call, its own recompute and the shipped port write — a method call, a ' +
            '`port.index` load, two array loads and the setter — and no ' +
            'bookkeeping whatever. WHAT IS PREDICTED IS THE SHAPE: each pair is judged against ITS ' +
            'OWN FLOOR — all three of these rows declare a null, so each gap is read against the ' +
            'two nulls in it — and printed SEPARATED or UNRESOLVED, and an UNRESOLVED IS AN ' +
            'ANSWER: it would say the two shapes cost the same at this width.'
    );
    for (const [scene, table] of [
        ['one field', wideOne],
        ['three fields', wideSome],
        ['unread field', wideNone],
    ] as const) {
        const direct = table.perRow('machine·imperative');
        for (const [against, other] of [
            ['machine', table.perRow('machine')],
            ['wire', table.perRow('wire')],
        ] as const) {
            const gap = Math.abs(direct - other);
            const floor = table.floors.of('machine·imperative', against);
            line(
                `     machine·imperative ↔ ${`${against},`.padEnd(9)}${scene.padEnd(13)}${ns(
                    direct
                )} against ${ns(other)} ns per row — |Δ| ${f6(
                    gap * 1e6
                )} ns against a floor of ${f6(floor.value * 1e6)} ns — ${
                    gap > floor.value ? 'SEPARATED' : 'UNRESOLVED'
                } [${floor.basis}]`
            );
        }
    }
    line(
        '     AND THE STORAGE PAIR, WHICH USED TO BE HOW A CONFOUND WAS SUBTRACTED AND IS NOW A ' +
            'QUESTION OF ITS OWN. `machine·imperative ↔ machine` CARRIED TWO TERMS while this row ' +
            'kept its values in a VALUE TABLE and `machine` kept its in twenty NAMED properties: ' +
            'where the rules live AND where the state lives. SINCE THE VALUES MOVED INTO THE CACHE ' +
            'BOTH ROWS HOLD TWENTY NAMED PROPERTIES of the same shape, so that subtraction is ' +
            'WHERE THE RULES LIVE and nothing else. `machine·array` holds the rules fixed and moves ' +
            'only the storage, and the pair below is now that question asked directly — twenty ' +
            'named properties against twenty slots of a flat array:'
    );
    for (const [scene, table] of [
        ['one field', wideOne],
        ['three fields', wideSome],
        ['unread field', wideNone],
    ] as const) {
        const gap = Math.abs(table.perRow('machine·imperative') - table.perRow('machine·array'));
        const floor = table.floors.of('machine·imperative', 'machine·array');
        line(
            `     machine·imperative ↔ machine·array, ${scene.padEnd(13)}${ns(
                table.perRow('machine·imperative')
            )} against ${ns(table.perRow('machine·array'))} ns per row — |Δ| ${f6(
                gap * 1e6
            )} ns against a floor of ${f6(floor.value * 1e6)} ns — ${
                gap > floor.value ? 'SEPARATED' : 'UNRESOLVED'
            } [${floor.basis}]`
        );
    }
    line(
        `     AND AT THE MOUNT: machine·imperative ${ns(
            wideMountPerRow('machine·imperative')
        )} against machine ${ns(wideMountPerRow('machine'))} and wire ${ns(
            wideMountPerRow('wire')
        )} ns per row. THREE ROWS AND THEREFORE TWO ` +
            `FLOORS: against machine ${f6(
                wideMountFloors.of('machine·imperative', 'machine').value * 1e6
            )} ns and against wire ${f6(
                wideMountFloors.of('machine·imperative', 'wire').value * 1e6
            )} ns, both read off the pairs' own nulls. NO DIRECTION IS PREDICTED HERE EITHER, and the reason is that the count and the ` +
            'work point opposite ways. FOUR allocations per instance against `machine`s ONE and `wire`s ' +
            'SIX — the instance, a ONE-SLOT value table (no field is declared, so the slot is the ' +
            'cache), the cached object of twenty named properties, and the `TExoDomChild` child ' +
            '`wireExoNode(c.createExoNode(M))` makes; no fillDoors() wrapper, no door ' +
            'closure, no handler closure, no disposer array per row, ' +
            'because a machine`s transitions are the COMPONENT`s and this one declares no effect. ' +
            'THE THIRD ALLOCATION IS WHAT THE CACHE COSTS AND IT ARRIVED WITH IT: while the twenty ' +
            'were fields they rode in the value table the wire allocates anyway, and this row ' +
            'allocated TWO. What the same move bought is on every write, on this table and on the ' +
            'three above it. ' +
            'THE FOURTH IS NOT THE MACHINE`S AT ALL, AND IT IS THE ONE THING ON THIS TABLE THAT IS ' +
            'NOT LIKE FOR LIKE: a machine takes no props, so this row cannot be mounted by `c.list` ' +
            'like every other row here — it BUILDS each instance, fires its starting state at it as ' +
            'a transition, and INSERTS it by hand. Read this row`s mount against its own twin, ' +
            'never against a `c.list` row`s, and read the shell`s note for the rest of the trade. ' +
            'AGAINST THAT: this row is the only participant on the axis whose ports are painted ' +
            `by a TRANSITION — ${WIDE_PORTS} recorded \`c.text\` calls, the same ${WIDE_PORTS} ` +
            'both neighbours make — and it is the only one that writes its twenty values TWICE at ' +
            'the mount, once as the zeros the cache seeder builds and once from the ' +
            'transition, because a keep`s seeder cannot know which row it is. THAT TRANSITION IS ONE ' +
            'MODULE-LEVEL FUNCTION for every row of every rep, where the seed it replaced was a ' +
            'closure per row built in `prepare()`.'
    );
    const directFloorGap = wideOne.perRow('machine·imperative') - wideOne.perRow('floor');
    // AGAIN THE `floor` ROW HAS NO TWIN, so this one is bounded by the table and not by the pair.
    const directFloorFloor = wideOne.floors.of('machine·imperative', 'floor');
    line(
        `     AND AGAINST THE FLOOR ON TABLE 6, PRINTED WITHOUT A PREDICTION: machine·imperative ${ns(
            wideOne.perRow('machine·imperative')
        )} against floor ${ns(wideOne.perRow('floor'))} ns per row — Δ ${f6(
            directFloorGap * 1e6
        )} ns against a floor of ${f6(directFloorFloor.value * 1e6)} ns [${
            directFloorFloor.basis
        }] — ${
            Math.abs(directFloorGap) > directFloorFloor.value
                ? directFloorGap < 0
                    ? 'BELOW THE FLOOR'
                    : 'ABOVE THE FLOOR'
                : 'AT THE FLOOR (UNRESOLVED)'
        }. The floor runs the three woken derivations in a straight line and so does this row; ` +
            'what stands between them is the transition wrapper, its commit, one ' +
            '`c.kept`, three PROPERTY STORES ' +
            'and `c.set` against a `.data` store. NO DIRECTION WAS COMMITTED and none is claimed. ' +
            'THAT LIST IS SHORTER THAN IT WAS: while the values were fields it read "three field ' +
            '`set`s", each of eight steps, so any recording of this row taken while it held ' +
            'fields is measuring a program that no longer exists.'
    );
    line(
        '     WHAT NO NUMBER HERE SAYS ABOUT THIS ROW, and it is the same sentence `wire` gets ' +
            'one level down: NOTHING IS DECLARED. A caller that writes `f2` on this instance from ' +
            'outside its three transitions moves the value and NOT THE SCREEN — there is no ' +
            'derivation to wake and no commit that could find one — where `machine` moves every ' +
            'port that reads that ' +
            'field, in one commit, in slot order, for a caller that has never heard of derivation ' +
            '18. A FOURTH transition added later must repeat the map or be silently wrong. AND THE ' +
            'CHAIN IS THE SHARPEST CASE: `machine` DECLARES it and derivation 19 — reached by `f12` ' +
            'directly AND through field 18 — runs once because the pending set is a SET; this row ' +
            'runs the chain by hand and writes derivation 19 once because its author knew to, and ' +
            'the gate can only catch a write that is MISSING.'
    );

    line(
        '  P8 — BATCHING: WITHDRAWN, AND THERE IS NO MACHINE-SIDE NUMBER TO PRINT. It predicted ' +
            '`machine·batch` > `machine` on every table. THE ROW IS GONE: `@exodra/core` deleted ' +
            'the module-global batch depth it wrapped, and what replaced it — ' +
            '`enode.hold(of, body)` — batches over ONE NAMED INSTANCE. Every driver ' +
            'on this axis makes EXACTLY ONE transition per instance per round (the two- and ' +
            'three-field scenes write their fields inside ONE transition), so a hold here would ' +
            'wrap a single commit, coalesce NOTHING, and print its own overhead under a caption ' +
            'reading «batch». The row came out rather than being converted.'
    );
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // THE STATE-SHAPE AND SPELLING VERDICTS ON THE NARROW SCENE
    // ═══════════════════════════════════════════════════════════════════════════════════════

    line('');
    line(
        'WHERE THE STATE LIVES — three shapes, one program, judged on the NARROW component. EVERY ' +
            'FIGURE IS NANOSECONDS PER TAG.'
    );
    line(
        '  P15 — THE NARROW SCENE FLATTERS THE OBJECT AND THE FILE SAYS SO BEFORE THE NUMBERS. ' +
            'Four named slots is what V8 stores in-object; both tables reach a value through TWO ' +
            'loads (`s.managedState`, then `state[at]`) where a property is one, and four fields is too ' +
            'few for a table`s own advantages to pay that back. `machine` < `machine·array` and `machine` < `machine·nodes` on ' +
            'TABLES 2 AND 3 is therefore the PREDICTION, and a failure of it is the interesting ' +
            'result, not a defect.'
    );
    verdict(
        'machine < machine·array on one field',
        one.perTag('machine'),
        one.perTag('machine·array'),
        one.floors.of('machine', 'machine·array'),
        'MECHANISM: one named-property store against `s.managedState` + an indexed store; and one ' +
            'named-property read per declared dependency against `s.managedState` + an indexed read.'
    );
    verdict(
        'machine < machine·nodes on one field',
        one.perTag('machine'),
        one.perTag('machine·nodes'),
        one.floors.of('machine', 'machine·nodes'),
        'SAME MECHANISM, plus the one thing only variant 3 has: the array being read on the port ' +
            'write is the array the state lives in, and it is now mixed-kind and longer.'
    );
    verdict(
        'machine < machine·array on two fields',
        two.perTag('machine'),
        two.perTag('machine·array'),
        two.floors.of('machine', 'machine·array'),
        'Two stores and two marks either way; the transition bodies are structurally identical.'
    );
    verdict(
        'machine < machine·nodes on two fields',
        two.perTag('machine'),
        two.perTag('machine·nodes'),
        two.floors.of('machine', 'machine·nodes'),
        'Two stores and two marks either way.'
    );
    line(
        `     machine·array against machine·nodes on one field: ${ns(
            one.perTag('machine·array')
        )} against ` +
            `${ns(one.perTag('machine·nodes'))} ns per tag; on two fields: ${ns(
                two.perTag('machine·array')
            )} ` +
            `against ${ns(
                two.perTag('machine·nodes')
            )}. NO DIRECTION IS PREDICTED and this is the pair ` +
            'that ISOLATES THE SHARING: both are tables, both index, both mark per field, and the ' +
            'only difference between them is WHICH array — one private and one holding the ' +
            "instance's nodes and read on every port write."
    );
    line(
        '  P16 — THE MOUNT IS WHERE THE ALLOCATION SHAPE SHOWS AND IT IS THE ONE PLACE VARIANT 3 ' +
            'IS PREDICTED TO WIN: `machine·nodes` < `machine·array`, because variant 2 allocates the state object ' +
            'AND its array where variant 3 allocates the object and APPENDS onto an array ' +
            '`wireExoInstance` made anyway. The allocation counts are printed under each row.'
    );
    verdict(
        'machine·nodes < machine·array at the mount (one allocation against two)',
        mountPerTag('machine·nodes'),
        mountPerTag('machine·array'),
        mountFloors.of('machine·nodes', 'machine·array'),
        'AGAINST IT: variant 3 appends four values one at a time onto a live array, which may ' +
            'reallocate its backing store, and it pays ONE null comparison per instance for the ' +
            'base it cannot know until its first wire. Variant 2 builds one literal of four.'
    );
    verdict(
        'machine ≤ machine·array at the mount (the object allocates one thing, the separate table two)',
        mountPerTag('machine'),
        mountPerTag('machine·array'),
        mountFloors.of('machine', 'machine·array'),
        'MECHANISM: one object literal of eight fields against one object literal of five plus one ' +
            'array literal of four.'
    );
    line(
        `     machine·nodes against machine at the mount: ${ns(
            mountPerTag('machine·nodes')
        )} against ` +
            `${ns(
                mountPerTag('machine')
            )} ns per tag. NO DIRECTION IS PREDICTED — both allocate exactly ` +
            'one object per instance, and what separates them is four appends against four ' +
            'in-object stores.'
    );
    line('');
    line(
        'HOW A MULTI-FIELD TRANSITION IS SPELLED — same state, same program, same commit. NS PER TAG.'
    );
    line(
        '  P17 — THE TUPLE COSTS NOTHING AT ARITY ONE AND ALLOCATES AT ARITY TWO, so its gap to ' +
            'the shipped spelling GROWS from TABLE 2 to TABLE 3, and that growth is the answer. ' +
            'On TABLE 2 `by` hands back a bare value and the row pays two calls; on TABLE 3 it ' +
            'hands back an array and the row pays two calls, one allocation and a scatter loop — ' +
            'against ONE OR instead of two, which is the only thing it is cheaper at.'
    );
    const tupleOne = one.perTag('machine·tuple') - one.perTag('machine');
    const tupleTwo = two.perTag('machine·tuple') - two.perTag('machine');
    verdict(
        'the machine·tuple↔machine gap GROWS from one field to two — the two figures below are GAPS, not rows',
        tupleOne,
        tupleTwo,
        widerOf(
            one.floors.of('machine·tuple', 'machine'),
            two.floors.of('machine·tuple', 'machine')
        ),
        `The gap is ${f6(tupleOne * 1e6)} ns per tag on TABLE 2 (calls only, nothing allocated) ` +
            `and ${f6(
                tupleTwo * 1e6
            )} ns on TABLE 3 (calls plus one array per call). Both halves ` +
            'are `machine·tuple ↔ machine`, and `machine·tuple` declares no null of its own, so ' +
            'each half is bounded by its table and the larger of the two bounds the comparison.'
    );
    verdict(
        'machine·handle < machine·tuple on two fields (handles never allocate; the tuple allocates per call)',
        two.perTag('machine·handle'),
        two.perTag('machine·tuple'),
        two.floors.of('machine·handle', 'machine·tuple'),
        'MECHANISM: two calls and two ORs against one call, one array, two indirect writer calls ' +
            'and one OR. IF THIS FAILS, the merged mark is worth more than the allocation costs, ' +
            'and the tuple form is the cheaper of the two ways of not writing marks by hand.'
    );
    verdict(
        'machine ≤ machine·handle on two fields (the shipped body inlines both stores and both marks)',
        two.perTag('machine'),
        two.perTag('machine·handle'),
        two.floors.of('machine', 'machine·handle'),
        'THE PRICE OF HANDLES IS EXACTLY TWO CALLS, and what it buys is that a store and its mark ' +
            'cannot be written apart — the one hazard `exoTransition` moves rather than ' +
            'removes. If this gap is under the resolution, that safety is free.'
    );
    line(
        `     the three spellings on ONE field: machine ${ns(
            one.perTag('machine')
        )}, machine·handle ` +
            `${ns(one.perTag('machine·handle'))}, machine·tuple ${ns(
                one.perTag('machine·tuple')
            )} ns per tag; on ` +
            `TWO: machine ${ns(two.perTag('machine'))}, machine·handle ${ns(
                two.perTag('machine·handle')
            )}, machine·tuple ` +
            `${ns(two.perTag('machine·tuple'))}.`
    );
    line(
        `     and on the field NOTHING reads (TABLE 4, where no port is written at all): machine ` +
            `${ns(none.perTag('machine'))}, machine·handle ${ns(
                none.perTag('machine·handle')
            )}, machine·tuple ` +
            `${ns(none.perTag('machine·tuple'))}, machine·array ${ns(
                none.perTag('machine·array')
            )}, machine·nodes ` +
            `${ns(
                none.perTag('machine·nodes')
            )}. THIS IS THE ONE TABLE WITH NO PORT WRITE ON IT, so it is ` +
            'the row to read against the others when asking what the mixed array costs: a ' +
            'difference that appears on TABLES 2 and 3 and NOT here is a difference in the WRITE, ' +
            'not in the store.'
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLES 9 AND 10 — THE APP-SHAPED SCENE
    // ═══════════════════════════════════════════════════════════════════════════════════════
    //
    // ONE MIX, PRINTED. The unit is ONE INSTANCE of either type, so the column is comparable with
    // TABLES 1 and 5 — but it is an AVERAGE OVER A MIX and a different mix gives a different number.
    // The counts are in the census and in the titles.

    const appNullsOf = (series: Series): readonly (readonly [string, Null])[] => [
        ['machine·scan', pairOf(series, 'machine·scan')[1]],
        ['machine', pairOf(series, 'machine')[1]],
    ];

    const appMountPhases: readonly Phase[] = APP_FIELD.map((p) => ({
        name: p.name,
        reps: APP_MOUNT_REPS * Math.max(1, batch),
        per: APP_INSTANCES,
        rounds: 1,
        what: p.what,
        allocs: p.allocs,
        prep: (): Scenario => {
            const container = el();
            const build = p.prepare();
            let mounted: TExoAppMounted | null = null;
            return {
                measure: () => {
                    mounted = build(container);
                },
                cleanup: () => {
                    if (mounted !== null) mounted.off();
                    container.remove();
                },
            };
        },
    }));
    requireOneSampleCondition(appMountPhases, 'APP-MOUNT');

    const appMountSeries = runPhases(appMountPhases, rounds);
    const appMountStat = new Map<string, Stat>();
    for (const p of appMountPhases) {
        appMountStat.set(p.name, stat(appMountSeries.times.get(p.name) as number[]));
    }
    const appMountPer = (name: string): number => (appMountStat.get(name) as Stat).median;

    printTable(
        `APP-MOUNT — TABLE 9: one page — ${TAGS} narrow tags and ${WIDE_ROWS} wide rows in two ` +
            'panes, plus three components that declare no state at all. ms per PAGE, ns per ' +
            'instance averaged OVER THIS MIX.',
        appMountPhases,
        appMountPer,
        appNullsOf(appMountSeries),
        true,
        APP_INSTANCES,
        'inst'
    );
    emitRecordedRows(
        'app-mount',
        'ns',
        'instance',
        appMountPhases.map(
            (p) => [p.name, scaledStat(appMountStat.get(p.name) as Stat, 1e6)] as const
        )
    );

    const appUpdatePhases: readonly Phase[] = APP_FIELD.map((p) => ({
        name: p.name,
        reps: APP_SHELLS * Math.max(1, batch),
        per: APP_ROUNDS * APP_INSTANCES,
        rounds: APP_ROUNDS,
        what: p.what,
        allocs: p.allocs,
        prep: (): Scenario => {
            const container = el();
            const mounted = p.prepare()(container);
            const run = mounted.driver();
            return {
                measure: () => {
                    for (let k = 0; k < APP_ROUNDS; k++) run(k);
                },
                cleanup: () => {
                    mounted.off();
                    container.remove();
                },
            };
        },
    }));
    requireOneSampleCondition(appUpdatePhases, 'APP-UPDATE');

    const appUpdateSeries = runPhases(appUpdatePhases, rounds);
    const appUpdateStat = new Map<string, Stat>();
    for (const p of appUpdatePhases) {
        appUpdateStat.set(p.name, stat(appUpdateSeries.times.get(p.name) as number[]));
    }
    const appUpdatePer = (name: string): number => (appUpdateStat.get(name) as Stat).median;

    printTable(
        'APP-UPDATE — TABLE 10: one round writes `name` on every tag AND `f2` on every row — ' +
            "TABLE 2's scene and TABLE 6's happening together, which is what a page does when a " +
            'store flushes.',
        appUpdatePhases,
        appUpdatePer,
        appNullsOf(appUpdateSeries),
        false,
        APP_INSTANCES,
        'inst'
    );
    emitRecordedRows(
        'app-update',
        'ns',
        'instance',
        appUpdatePhases.map(
            (p) => [p.name, scaledStat(appUpdateStat.get(p.name) as Stat, 1e6)] as const
        )
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // THE WIDE VERDICTS — five more predictions, committed before the wide tables first ran
    // ═══════════════════════════════════════════════════════════════════════════════════════

    line('');
    line(
        'AND THE FIVE THE WIDE SCENE ADDED, committed before it first ran. EVERY FIGURE IN THIS ' +
            `BLOCK IS NANOSECONDS PER ROW (a row is ${WIDE_PORTS} ports), not per tag.`
    );
    line(
        `  P9 — ONE FIELD AT WIDTH: \`machine\` < \`machine·scan\`. This is the prediction the narrow scene could ` +
            `not make. \`f2\` wakes ${WIDE_ONE_WOKEN.length} derivations; \`machine\` walks that many set ` +
            `bits and \`machine·scan\` tests ${WIDE_PORTS} masks to find them. The narrow tables declared TWO ` +
            'derivations, where the same change is worth at most one mask test.'
    );
    verdict(
        'machine < machine·scan on one field at width',
        wideOne.perRow('machine'),
        wideOne.perRow('machine·scan'),
        wideOne.floors.of('machine', 'machine·scan'),
        `MECHANISM: O(affected) against O(declared), with affected = ${WIDE_ONE_WOKEN.length} and ` +
            `declared = ${WIDE_PORTS}. IF THIS FAILS, the inverted table buys nothing at the width ` +
            'it was built for and the narrow tables were not the reason it looked small.'
    );
    line(
        '  P10 — THE UNREAD FIELD AT WIDTH IS WHERE THE TWO SHAPES SEPARATE MOST. `machine` < `machine·scan`, and ' +
            'by MORE than on the narrow table, because `machine``s work there is independent of the ' +
            'component`s width and `machine·scan``s is linear in it.'
    );
    verdict(
        'machine < machine·scan on a field nothing reads, at width',
        wideNone.perRow('machine'),
        wideNone.perRow('machine·scan'),
        wideNone.floors.of('machine', 'machine·scan'),
        `MECHANISM: machine ORs a zero and returns on its first comparison; machine·scan ORs a field bit and then ` +
            `tests ${WIDE_PORTS} masks that match nothing.`
    );
    line(
        '  P11 — MOUNT AT WIDTH: `machine` < `machine·scan`, and the gap is ' +
            'PRINTED rather than extrapolated from the narrow table, which is what this prediction ' +
            'is for.'
    );
    verdict(
        'machine < machine·scan at the wide mount',
        wideMountPerRow('machine'),
        wideMountPerRow('machine·scan'),
        wideMountFloors.of('machine', 'machine·scan'),
        'MECHANISM: three objects per instance against one. This is the object-count change and ' +
            'the wide mount is where it is largest, because it is the same difference on a row ' +
            'whose other costs are spread over nineteen ports.'
    );
    line(
        '  P13 — THE CHAIN COSTS `machine·scan` SOMETHING NO OTHER TABLE CHARGES IT. On TABLE 7 alone, form B ' +
            'recomputes the intermediate TWICE — once in derivation 18 and once in 19 — because ' +
            'the prototype has no store to put it in. `machine` computes it once and stores it; the ' +
            'floor computes it once in the caller. So `machine` < `machine·scan` here by more than the mask arithmetic alone would give.'
    );
    verdict(
        'machine < machine·scan on several fields at width',
        wideSome.perRow('machine'),
        wideSome.perRow('machine·scan'),
        wideSome.floors.of('machine', 'machine·scan'),
        `MECHANISM: two things at once — O(affected)=${WIDE_SOME_WOKEN.length} against ` +
            `O(declared)=${WIDE_PORTS}, AND one extra \`wideSummary\` call in each of machine·scan's two ` +
            'chained derivations. THIS VERDICT DOES NOT SEPARATE THEM and does not claim to; ' +
            'TABLE 6, whose scene wakes no chain, is where the mask arithmetic stands alone.'
    );
    line('');
    line(
        `WHERE THE STATE LIVES, AT WIDTH — the scene with the most room for a table, and the one ` +
            `where variant 3's array is longest. NANOSECONDS PER ROW (a row is ${WIDE_PORTS} ports).`
    );
    line(
        '  P18 — THE WIDE SCENE FLATTERS THE TABLES AND THE FILE SAYS SO BEFORE THE NUMBERS. ' +
            '`machine·array` < `machine` on TABLES 6 AND 7, for three reasons that arrive together and that no ' +
            'table here separates: a transition writing a COMPUTED field number is an indexed ' +
            'store where the object form must call `WIDE_WRITE_FIELD[f]`; twenty integers in their ' +
            'own array is the one state here that is PACKED_SMI; and a twenty-field object is past ' +
            'the width a literal keeps entirely in-object. THE THREE ARE NOT SEPARATED AND THE ' +
            'VERDICT DOES NOT CLAIM TO SEPARATE THEM.'
    );
    verdict(
        'machine·array < machine on one field at width',
        wideOne.perRow('machine·array'),
        wideOne.perRow('machine'),
        wideOne.floors.of('machine·array', 'machine'),
        `MECHANISM: one field written per row, ${WIDE_ONE_WOKEN.length} derivations woken, and ` +
            'every read of every one of them is `cells[at]` against `s.fN`.'
    );
    verdict(
        'machine·array < machine on several fields at width',
        wideSome.perRow('machine·array'),
        wideSome.perRow('machine'),
        wideSome.floors.of('machine·array', 'machine'),
        `MECHANISM: three fields written per row and ${WIDE_SOME_WOKEN.length} derivations woken, ` +
            'the chain included — and the chain`s STORE is an indexed store here too.'
    );
    line(
        '  P19 — AND THIS IS THE PAIR THAT PRICES THE SHARING ITSELF. `machine·nodes` against `machine·array` are ' +
            'both tables, index identically, mark identically and run the identical program; the ' +
            'ONLY difference is that one of them lives in the array `portWrite` reads on ' +
            'every port write, and that this array is mixed-kind and longer. NO DIRECTION IS ' +
            'PREDICTED. What the axis can say is WHERE any difference lives: TABLES 6 and 7 end in ' +
            'port writes and TABLE 8 does not, so a gap that appears on the first two and not on ' +
            'the third is the WRITE and a gap on all three is the STORE.'
    );
    line(
        `     machine·nodes against machine·array — one field: ${ns(
            wideOne.perRow('machine·nodes')
        )} against ` +
            `${ns(wideOne.perRow('machine·array'))} · several fields: ${ns(
                wideSome.perRow('machine·nodes')
            )} ` +
            `against ${ns(
                wideSome.perRow('machine·array')
            )} · the field nothing reads (NO PORT WRITE ON ` +
            `THIS TABLE): ${ns(wideNone.perRow('machine·nodes'))} against ` +
            `${ns(wideNone.perRow('machine·array'))} ns per row. THE FLOOR FOR THIS PAIR, table ` +
            `by table — both rows declare a null, so all three are read off those two nulls and ` +
            `not off the table maximum: ` +
            `${f6(wideOne.floors.of('machine·nodes', 'machine·array').value * 1e6)}, ` +
            `${f6(wideSome.floors.of('machine·nodes', 'machine·array').value * 1e6)} and ` +
            `${f6(wideNone.floors.of('machine·nodes', 'machine·array').value * 1e6)} ns.`
    );
    line(
        `     and against the shipped object shape — machine ${ns(
            wideOne.perRow('machine')
        )} · machine·array ` +
            `${ns(wideOne.perRow('machine·array'))} · machine·nodes ${ns(
                wideOne.perRow('machine·nodes')
            )} ns per row on ` +
            `TABLE 6; at the wide MOUNT, machine ${ns(
                wideMountPerRow('machine')
            )} · machine·array ` +
            `${ns(wideMountPerRow('machine·array'))} · machine·nodes ${ns(
                wideMountPerRow('machine·nodes')
            )}.`
    );
    verdict(
        'machine·nodes < machine·array at the wide mount (one allocation against two, at twenty fields)',
        wideMountPerRow('machine·nodes'),
        wideMountPerRow('machine·array'),
        wideMountFloors.of('machine·nodes', 'machine·array'),
        `AGAINST IT: variant 3 appends ${WIDE_FIELDS} values one at a time onto a live array of ` +
            `${WIDE_PACK_C_SHR.base()} nodes, which reallocates its backing store on the way; ` +
            `variant 2 builds ONE literal of ${WIDE_FIELDS}. This is the widest scene here and ` +
            'therefore the one where that difference is largest in both directions.'
    );

    // ── THE CLOCK, PER REGION, ON ALL FOUR TABLES ────────────────────────────────────────
    const clockFloor = MIN_TICKS * quantum;
    const checkClock = (
        phases: readonly Phase[],
        perUnit: (name: string) => number,
        table: string
    ): void => {
        for (const p of phases) {
            const region = regionOf(p, perUnit(p.name));
            if (region >= clockFloor) continue;
            const factor = region > 0 ? clockFloor / region : Infinity;
            const wantBatch = Number.isFinite(factor)
                ? Math.ceil(Math.max(1, batch) * factor)
                : Math.max(1, batch) * 10;
            refuse(
                `machine-vs-cells: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    `\`node scripts/run-one-axis.js machine-vs-cells ${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(mountPhases, mountPerTag, 'MOUNT');
    checkClock(one.phases, one.perTag, 'ONE-FIELD');
    checkClock(two.phases, two.perTag, 'TWO-FIELD');
    checkClock(none.phases, none.perTag, 'UNREAD-FIELD');
    // AND ON ALL FOUR WIDE TABLES. A wide region that falls under the quantum is refused BY NAME
    // with the batch to re-run at, exactly as a narrow one is — the component is never quietly
    // shrunk to fit the clock, and the round counts above are constants a reader can see.
    line('');
    line(
        `  P14 — THE APP SCENE IS A WEIGHTED AVERAGE AND NOTHING MORE: this ` +
            `page is ${TAGS} narrow instances and ${WIDE_ROWS} wide ones plus three components ` +
            'that declare nothing.'
    );
    line(
        `     machine against machine·scan on the app update: ` +
            `${ns(appUpdatePer('machine'))} against ${ns(
                appUpdatePer('machine·scan')
            )} ns per instance. NO DIRECTION WAS PREDICTED ` +
            'on this table — the mix decides them and the mix is a choice this file made.'
    );
    line(
        `     AND THE FLOOR: the app mount is ${(
            appMountPer('machine') / appMountPer('floor')
        ).toFixed(2)}× ` +
            `the floor where TABLE 5 is ${(
                wideMountPerRow('machine') / wideMountPerRow('floor')
            ).toFixed(2)}×. ` +
            'The difference is the three components that declare no state: they cost every ' +
            'participant the same and they dilute every per-instance difference on the page.'
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // THE LADDER'S THREE PREDICTIONS, JUDGED MECHANICALLY
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /** The larger of two pair floors ON ONE TABLE — `widerOf`'s sentence is about crossing two. */
    const bothPairs = (a: Floor, b: Floor): Floor => {
        const bigger = a.value >= b.value ? a : b;
        return {
            value: bigger.value,
            basis:
                `${bigger.basis}; THE COMPARISON IS BETWEEN TWO GAPS ON ONE TABLE, so it is read ` +
                'at the LARGER of the two pair floors',
        };
    };

    /** A pair floor divided by the rung — what one pair resolves PER TRANSITION CALL. */
    const perCallFloor = (f: Floor, n: number): Floor => ({
        value: f.value / n,
        basis: `${f.basis}, DIVIDED BY THE RUNG (${n}) because the figure it bounds is per CALL`,
    });

    /**
     * A CLAIM THAT TWO FIGURES ARE THE SAME, which `verdict` cannot print.
     *
     * `verdict` reads a gap under the floor as UNRESOLVED — "nothing here says which is cheaper" —
     * and that is the wrong sentence for a prediction whose CONTENT is that there is no difference.
     * P24 predicts the machine's mount is FLAT in the rung; an unresolvable difference CONFIRMS it.
     */
    const flatness = (
        claim: string,
        a: number,
        b: number,
        floor: Floor,
        mechanism: string
    ): void => {
        const delta = Math.abs(a - b);
        if (delta <= floor.value) {
            line(
                `  FLAT — ${claim}: the two are ${f6(
                    delta * 1e6
                )} ns per unit apart and this PAIR ` +
                    `resolved ${f6(floor.value * 1e6)} ns [${floor.basis}]. The difference is ` +
                    `below what the instrument can see, which is what the claim says. ${mechanism}`
            );
            return;
        }
        line(
            `  NOT FLAT — ${claim}: the two are ${f6(delta * 1e6)} ns per unit apart, ` +
                `${(delta / floor.value).toFixed(1)}× this PAIR's floor [${floor.basis}]. ` +
                `${mechanism}`
        );
    };

    const ladderMountGap = (n: number): number =>
        ladderMountPer(`wire·n${n}`) - ladderMountPer(`machine·n${n}`);
    const ladderMountPairFloor = (n: number): Floor =>
        ladderMountFloors.of(`wire·n${n}`, `machine·n${n}`);

    line('');
    line('AND THE THREE THE TRANSITION LADDER ADDED, committed before its first run');
    line(
        '  P24 — THE MOUNT: the `wire ↔ machine` gap GROWS WITH THE RUNG and the machine`s own ' +
            'mount does not. MECHANISM: at rung n a wire allocates n door closures, the array that ' +
            'carries them and a closure context holding every variable those doors touch — all per ' +
            'instance, all inside the timed mount — where a machine allocates ONE state object at ' +
            'every rung. A DIRECTION IS PREDICTED AGAINST THE RUNG AND NOWHERE ELSE: nothing is ' +
            'predicted between the two rows at any single rung, which is P21`s and P22`s position ' +
            'and stays it.'
    );
    for (const n of LADDER_RUNGS) {
        const f = ladderMountPairFloor(n);
        line(
            `     rung n${n} at the mount: wire ${ns(ladderMountPer(`wire·n${n}`))} · machine ` +
                `${ns(ladderMountPer(`machine·n${n}`))} · floor ${ns(
                    ladderMountPer('floor')
                )} ns ` +
                `per row; the gap is ${f6(ladderMountGap(n) * 1e6)} ns against a pair floor of ` +
                `${f6(f.value * 1e6)} ns [${f.basis}]. NO DIRECTION IS CLAIMED ON THIS LINE.`
        );
    }
    verdict(
        'the wire↔machine MOUNT gap at rung 16 exceeds the same gap at rung 1 — the two figures ' +
            'below are the two GAPS, not two rows',
        ladderMountGap(1),
        ladderMountGap(16),
        bothPairs(ladderMountPairFloor(1), ladderMountPairFloor(16)),
        `The gap is ${f6(ladderMountGap(1) * 1e6)} ns per row at one declared transition and ` +
            `${f6(ladderMountGap(16) * 1e6)} at sixteen. Both halves are wire↔machine ON ONE ` +
            'TABLE with one floor row and one scene, so the only thing that differs between them ' +
            'is the number of closures each instance was given.'
    );
    flatness(
        'the MACHINE`s mount is FLAT in the rung (`machine·n1` against `machine·n16`)',
        ladderMountPer('machine·n1'),
        ladderMountPer('machine·n16'),
        ladderMountFloors.of('machine·n1', 'machine·n16'),
        'MECHANISM: its transitions are declared once per COMPONENT at module load and take the ' +
            'instance as an argument, so a rung adds nothing an instance pays for. IF THIS IS NOT ' +
            'FLAT, something per-instance scales with the declaration count and `machine`s "one ' +
            'object per instance, whatever it declares" is false — which is a finding about the ' +
            'library and not about this axis.'
    );
    verdict(
        'the WIRE`s mount at rung 16 exceeds its own mount at rung 1',
        ladderMountPer('wire·n1'),
        ladderMountPer('wire·n16'),
        ladderMountFloors.of('wire·n1', 'wire·n16'),
        'MECHANISM: fifteen more door closures, a longer array and a wider closure context per ' +
            'instance. IF THIS FAILS, this file`s model of what a closure costs is wrong and the ' +
            'ladder`s premise with it — the falsifier P24 named, and the one that would matter most.'
    );

    line(
        '  P25 — THE CALL: the `wire ↔ machine` gap PER TRANSITION CALL is FLAT in the rung — the ' +
            'rung multiplies a per-call difference and does not move the balance. NO DIRECTION IS ' +
            'PREDICTED between the two at any rung: the wire has the shorter path and the more ' +
            'expensive write, the machine has `exoTransition`s two calls, the mark, the bit walk ' +
            'and the schema`s own write, and this file will not publish a guess about which is ' +
            'larger. A ROUND AT RUNG n IS n CALLS, so the per-row-round figures below are NOT ' +
            'comparable across rungs and the per-CALL figures are.'
    );
    const ladderCalls: readonly (readonly [
        number,
        { readonly perRow: (name: string) => number; readonly floors: TableFloors }
    ])[] = [
        [1, ladderCall1],
        [4, ladderCall4],
        [16, ladderCall16],
    ];
    const ladderCallGap = (n: number): number => {
        const t = ladderCalls.find(([rung]) => rung === n) as (typeof ladderCalls)[number];
        return t[1].perRow(`wire·n${n}`) - t[1].perRow(`machine·n${n}`);
    };
    const ladderCallPairFloor = (n: number): Floor => {
        const t = ladderCalls.find(([rung]) => rung === n) as (typeof ladderCalls)[number];
        return t[1].floors.of(`wire·n${n}`, `machine·n${n}`);
    };
    for (const [n, t] of ladderCalls) {
        const f = ladderCallPairFloor(n);
        line(
            `     rung n${n}: wire ${ns(t.perRow(`wire·n${n}`))} · machine ` +
                `${ns(t.perRow(`machine·n${n}`))} · floor ${ns(t.perRow('floor'))} ns per ` +
                `ROW-ROUND (= ${n} call(s)); the gap is ${f6(ladderCallGap(n) * 1e6)} ns per ` +
                `row-round, ${f6(
                    (ladderCallGap(n) / n) * 1e6
                )} ns PER CALL, against a pair floor ` +
                `of ${f6(f.value * 1e6)} ns per row-round (${f6((f.value / n) * 1e6)} per call) [${
                    f.basis
                }].`
        );
    }
    flatness(
        'the wire↔machine gap PER CALL is the same at rung 1 and at rung 16 — the two figures are ' +
            'two GAPS DIVIDED BY THEIR RUNGS, not two rows',
        ladderCallGap(1) / 1,
        ladderCallGap(16) / 16,
        widerOf(perCallFloor(ladderCallPairFloor(1), 1), perCallFloor(ladderCallPairFloor(16), 16)),
        'IF IT IS NOT FLAT, something is SUPERLINEAR and the two candidates named in advance are ' +
            'the wire`s closure CONTEXT (one object per instance whose size grows with the number ' +
            'of variables its doors touch) and its driver`s `d[j]` load over an array that is ' +
            'longer at every rung. AND IF THE GAP CHANGES SIGN between the rungs, the two shapes ' +
            'cross over and the ladder has found the width at which the answer flips — read the ' +
            'signed per-rung lines above, which is why they are printed.'
    );
    flatness(
        'the wire↔machine gap PER CALL is the same at rung 4 and at rung 16',
        ladderCallGap(4) / 4,
        ladderCallGap(16) / 16,
        widerOf(perCallFloor(ladderCallPairFloor(4), 4), perCallFloor(ladderCallPairFloor(16), 16)),
        'THE MIDDLE RUNG IS WHERE A CURVE SHOWS. Two points can only be a line; three can be a ' +
            'line with a bend, and rung 4 is the width TABLES 1 TO 4 already publish.'
    );

    line(
        '  P26 — THE FLOOR PER RUNG: each arm is read against ITS OWN RUNG`s straight-line ' +
            'program, and a ratio that GROWS with the rung is an abstraction that is not flat in ' +
            'the number of declared transitions. NO DIRECTION IS PREDICTED for either arm; what is ' +
            'predicted is that the comparison is made, which no other table here can make.'
    );
    for (const [n, t] of ladderCalls) {
        line(
            `     rung n${n} against its own floor: wire ${(
                t.perRow(`wire·n${n}`) / t.perRow('floor')
            ).toFixed(2)}× · machine ${(t.perRow(`machine·n${n}`) / t.perRow('floor')).toFixed(
                2
            )}× — and at the mount, against the ONE floor row that serves every rung: ` +
                `wire ${(ladderMountPer(`wire·n${n}`) / ladderMountPer('floor')).toFixed(
                    2
                )}× · machine ${(ladderMountPer(`machine·n${n}`) / ladderMountPer('floor')).toFixed(
                    2
                )}×`
        );
    }
    line(
        '     WHAT THE RATIOS DO NOT SAY: the floor pays the same counter store per call that both ' +
            'library arms pay (see the LADDER GATE), so every ratio here is very slightly ' +
            'COMPRESSED towards 1 — the addend is in the denominator as well as the numerator. It ' +
            'is the price of the table being checkable and it is named rather than removed.'
    );

    checkClock(appMountPhases, appMountPer, 'APP-MOUNT');
    checkClock(appUpdatePhases, appUpdatePer, 'APP-UPDATE');
    checkClock(wideMountPhases, wideMountPerRow, 'WIDE-MOUNT');
    checkClock(wideOne.phases, wideOne.perRow, 'WIDE-ONE-FIELD');
    checkClock(wideSome.phases, wideSome.perRow, 'WIDE-SOME-FIELDS');
    checkClock(wideNone.phases, wideNone.perRow, 'WIDE-UNREAD-FIELD');
    // ── THE THREE CHECKS THAT ARE ABOUT THE INSTRUMENT RATHER THAN A PARTICIPANT ─────────
    //
    // ALL THREE ARE HERE, AT THE END, FOR THE REASON `checkClock` IS: they refuse, `refuse` throws,
    // and a run that threw in the middle would take every table after it down with it. A defect in
    // the instrument is worth knowing about AFTER the numbers it affects have been printed, so that
    // a reader can see what was thrown away.
    //
    // AND THEY ARE IN THIS ORDER ON PURPOSE. The invoked-transition report goes first because it is
    // the one that says whether the ladder measured transitions at all; the ladder's clock check
    // second because its refusal is ACTIONABLE and names the batch to re-run at; the null-integrity
    // check last because it is a statement about every table in the file and not only these four.
    ladderRegionGate(
        ladderMountPhases.length +
            ladderCall1.phases.length +
            ladderCall4.phases.length +
            ladderCall16.phases.length
    );
    checkClock(ladderMountPhases, ladderMountPer, 'LADDER-MOUNT');
    checkClock(ladderCall1.phases, ladderCall1.perRow, 'LADDER-CALL-N1');
    checkClock(ladderCall4.phases, ladderCall4.perRow, 'LADDER-CALL-N4');
    checkClock(ladderCall16.phases, ladderCall16.perRow, 'LADDER-CALL-N16');
    checkNullIntegrity();

    // ── AND WHAT NO NUMBER ON THIS PAGE COVERS ───────────────────────────────────────────
    line('');
    line(`sink: ${sink} characters observed out of the live DOM — nothing above was folded away`);
    line(
        'WHAT THIS RUN DID NOT MEASURE, and none of it is small: TEARDOWN — NO TABLE HERE ' +
            'TIMES A TEARDOWN. MEMORY — nothing here reads a heap. LAYOUT — every width above is an integer from a table, and a real ' +
            'program pays one forced layout per batch of width reads, identically in both forms. A ' +
            'DERIVATION CHAIN — `exo-machine.ts` (c): form B cannot express one without the author ' +
            'widening masks by hand, and nothing checks that they did. CHILDREN — a children port ' +
            'is filled by a connector call that takes no value, so form B cannot fill one at all. A ' +
            'DIFF — there is no reconciler in form B and no place to put one. THE SERVER — a late ' +
            'write lands in an array ' +
            'nobody reads (`TExoFillDoors`), so form B renders on the server and does not update there, ' +
            'which is the same answer `bind` gives and is untested here. AND A COMMIT THAT NEVER ' +
            'COMES — a transition that forgets `exoCommit` writes the state and moves nothing, ' +
            'which form C cannot express and no gate here could catch.'
    );
    line(
        'AND WHAT THE COMPILED ROWS IN PARTICULAR DID NOT MEASURE: A DERIVATION CHAIN — form C can ' +
            'store a result back into a state field and wake the derivations that read it in the ' +
            'same commit, and no participant here declares one, so nothing above pays for the ' +
            'store, the `after` OR or the branch per derivation that carries it — TABLES 5 TO 8 ' +
            'DO, on a component that declares one. THE CEILINGS — thirty-one fields and thirty-one ' +
            'derivations are refused at module load, and this component has four and two. AND ' +
            'TWO ROWS ARE HAND-MADE COPIES OF THE LIBRARY`S COMMIT: if a copy ever stops being ' +
            'the same loop, this axis is comparing two loops and reporting it as the price of a ' +
            'write, and nothing here would print a warning. `machine·copy` swaps the write AND OMITS ' +
            'FOUR THINGS — the effect-mask split, the per-derivation `ports[i]` load and ' +
            'null branch, `exoTransition`s two calls, and the driver`s property ' +
            'load per tag — SO ITS GAP TO `machine` IS NOT THE PRICE OF A WRITE. `machine·bound` was ' +
            'a copy of `machine·copy`s omitting the identical four, which made ' +
            '`machine·copy ↔ machine·bound` the one gap in that family that WAS purely a write ' +
            'spelling; THAT ROW IS STRUCK with the library method under it, and the pair has no ' +
            'substitute here. `machine·write` keeps ' +
            'all four and differs in the write line alone, so it is the only row whose gap to `machine` ' +
            'may be quoted as the price of a write. THAT SENTENCE USED TO CARRY A CAVEAT AND NOW ' +
            'CARRIES A CORRECTION: this row could not reach `exoMachineBatchDepth`, so ' +
            'it declared a binding of the same shape and loaded and compared it exactly where the ' +
            'shipped transition did. The shipped transition NO LONGER MAKES THAT TEST — the ' +
            'module-global depth went when batching moved to the per-instance ' +
            '`enode.hold` — so for as long as the stand-in stood here it was a HANDICAP ' +
            'this row paid and `machine` did not. It is gone; a number taken from this axis before ' +
            'that removal must not be quoted as the price of the write line.'
    );
    line(
        'AND WHAT THE WIRE ROW IN PARTICULAR DID NOT MEASURE, which is most of why anyone writes a ' +
            'machine. NO BATCH — two writes to one port in one turn are two DOM writes, and the ' +
            'mask collapses them. NO DECLARATION — nothing can read what a wired component depends ' +
            'on, so it has no census line above and no `reportOneObjectClaim` check. NO SHARED ' +
            'PROGRAM — every instance re-makes every closure, which TABLE 1 charges and no update ' +
            'table sees. NO ORDERING — two handlers writing one port leave the last one standing, ' +
            'where a commit runs each derivation once, low to high. AND WIDTH IS NOW MEASURED AND ' +
            'WAS NOT: TABLES 5 TO 8 carry a wire row (P22), and what it prices is the spelling ' +
            'that updates ONLY what the changed field feeds — the author hand-holding the map ' +
            '`machine` compiles. THE OTHER HONEST SPELLING, refreshing every port on any change, IS STILL ' +
            'UNMEASURED, and on TABLE 8 it would be the only participant on this axis that touched ' +
            'the DOM for a field nothing reads.'
    );
    line(
        'AND WHAT THE STATE-SHAPE ROWS IN PARTICULAR CANNOT SEE, which is more than they can. ' +
            'MEMORY — a table variant`s array has an object header and a length where an object`s ' +
            'in-object slots have neither, and `machine·nodes` makes the node table longer for the life of ' +
            'every instance; NOTHING HERE READS A HEAP. TEARDOWN — `machine·nodes` keeps its values inside ' +
            'the array that holds the instance`s nodes, so state and nodes now die together and ' +
            'neither can be dropped without the other, and NO TABLE HERE TIMES A TEARDOWN. A ' +
            'COMPONENT WIDER THAN TWENTY — every table variant is flat in the field count and the ' +
            'object form is not, so the gap at width 20 says nothing about width 31, which is the ' +
            'ceiling. A STATE HOLDING DOUBLES — every value in both scenes is a string, a boolean ' +
            'or a small integer, so nothing ever boxes; a `PACKED_ELEMENTS` array holding a ' +
            'non-integer number allocates a HeapNumber per write and `machine·nodes` would pay it where an ' +
            'object`s in-object double slot does not, and NOT ONE ROW ABOVE TOUCHES THAT CASE. THE ' +
            'TYPES — a named property is checked by the compiler and a slot is a cast in the ' +
            'field`s reader, which is a real cost of both tables paid in types rather than in ' +
            'nanoseconds and which no timing number can price. AND THE APP SCENE — TABLES 9 AND 10 ' +
            'carry NO state-shape row at all, so nothing here says what a mix of widths would do ' +
            'to the answer.'
    );
}
