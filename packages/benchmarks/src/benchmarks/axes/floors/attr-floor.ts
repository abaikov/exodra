// DIAGNOSTIC — WHAT DOES IT COST TO WRITE AN ATTRIBUTE THAT IS NOT TEXT, AND HOW MUCH ROOM IS
// THERE BELOW `@exodra/dom` AT WRITING ONE?
//
// THE GAP IT CLOSES. `packages/core/src/attr/` holds four functions — `exoAttribute`,
// `exoDomPropertyKind`, `refuseExoIllegalAttrName`, `refuseExoDuplicateAttr` — and NOT ONE SYMBOL FROM THAT FOLDER IS
// NAMED IN ANY AXIS IN `scripts/run-one-axis.js`. The schema compilers that call them run inside
// `prepare()` and inside warm-up, never inside a timed region. The one attribute figure this
// repository owns is on the SERVER side: `ssr-floor`'s `+head` rung, 0.0250 ms, which is the
// ` name="` prefix and the closing quote (A CITATION from that axis — nothing here re-measures it).
// The DOM side had nothing at all.
//
// It is written to the `mount-floor` / `update-floor` / `hydrate-floor` / `teardown-floor` /
// `keystroke-floor` set: a phase per program, a floor with no framework in it, a resolution floor
// measured from a control whose true difference is zero, every way it can mislead stated in this
// header and repeated in the answer, and a run that refuses its own numbers by name when they are
// unreadable.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE SUBJECT: FOUR KINDS OF WRITE, READ OUT OF `exo-attr-setter.ts` ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// `createExoAttrSetter(name, proto)` (`packages/dom/src/dom/exo-attr-setter.ts`) runs ONCE PER PORT PER
// (SCHEMA, COMPOSITION), inside `compileExoDomSchema`, and returns a closure. Every question about the
// NAME is answered there and none of it is asked again; what runs per fill is the closure alone. The
// branch table, in the order the file spells it and with the condition that selects each arm:
//
//   1. PROPERTY — `!writesExoAttribute(name, proto)`, i.e. `exoDomPropertyKind(tag, name)` is not
//      `undefined` AND the property really exists on the prototype. It FORKS ONCE MORE, on
//      `expressible && isBoolean`:
//        1a. BOOLEAN, MARKUP CAN EXPRESS IT (`checked` on an `<input>`, `selected` on an
//            `<option>`) — `node[key] = value ?? null` AND THEN `setAttribute(markup, '')` or
//            `removeAttribute(markup)`. TWO DOM OPERATIONS PER FILL. The attribute is the control's
//            RESET value and the property is its live one; the property is written FIRST so the
//            dirty flag is already set and the attribute write cannot move the control.
//        1b. EVERYTHING ELSE (`value` on an `<input>`, `indeterminate`, `value` on a `<textarea>`)
//            — `node[key] = value ?? null` and nothing else. ONE property store.
//   2. `class` — the MARKUP name is `class`, which `class` and `className` both produce. IT FORKS ON
//      NAMESPACE and this is the hazard the whole axis carries:
//        2a. HTML element — `node.className = value == null ? '' : String(value)`. A string store
//            into an IDL accessor.
//        2b. SVG element — `node.setAttribute('class', …)`. `className` on an SVG element is a
//            READ-ONLY `SVGAnimatedString`; assigning to it does nothing at all, which is a bug
//            this repository has fixed in one backend.
//   3. NAMESPACED — the prototype's own attribute has a `namespaceURI` (`xlink:href`, the
//      `xml:`/`xmlns:` family). `setAttributeNS(ns, qualified, …)` / `removeAttributeNS(ns, local)`,
//      and the DOM's asymmetry between those two argument shapes is why both spellings are read off
//      the prototype rather than written by hand.
//   4. ORDINARY — everything else. `setAttribute(markup, …)` / `removeAttribute(markup)`, where
//      `markup` is THE NAME THE PARSER PUT ON THE PROTOTYPE and not the author's and not a table's.
//      In HTML that is `form.name` (lowercased); in foreign content the parser's adjustment table
//      has already run, so ` viewbox=""` in the markup is a `viewBox` attribute on the element and
//      the setter uses `viewBox`.
//
// SO: FOUR FAMILIES, SIX CLOSURES. A straight-line program spells each of them as one call at the
// callsite, with the name a literal and the value's shape known. THAT DIFFERENCE IS WHAT THIS AXIS
// PRICES, and it has two halves that are worth separating in prose because the numbers cannot
// separate them: the INDIRECTION (a load out of `schema.setters[i]` and an indirect call, where the
// floor has a monomorphic direct call) and the VALUE-SHAPE INTERPRETATION (`value == null`,
// `value === false`, `value === true`, `String(value)`, `value ?? null` — every arm performs some
// of it, because a port accepts any value and a callsite knows what it holds).
//
// ALL SIX ARE IN THE PROGRAMS. `refuse-exo-illegal-attr-name` and `refuse-exo-duplicate-attr` are NOT, and that is a
// decline rather than an omission: both run inside `ExoSchemaCursor.el()`/`.port()`, once per
// attribute per schema, at module load. `schema-build` is the axis that owns schema declaration and
// it already counts their call sites and prices `exoAttribute`'s cold path by name (`spec·cold`).
// Re-measuring them here would be a second, worse copy of that axis.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── MOUNT OR UPDATE — THE MEASUREMENT QUESTION, ANSWERED DELIBERATELY ────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// AN ATTRIBUTE WRITE HAPPENS TWICE OVER AND THEY ARE DIFFERENT WRITES. THE HEADLINE HERE IS UPDATE.
// The mount table is printed too — SECOND, and it is a SEPARATE TABLE with its own gate, its own
// resolution floor and its own clock check, never one table with the update — so "what the other
// would have shown" is a number in this run rather than a claim in this header.
//
// WHY UPDATE IS THE HEADLINE:
//
//   * IT IS THE REPEATED THING. The branch is decided once per (schema, composition) and the
//     closure then runs once per data change for the life of the page. A mount runs it once per
//     element ever.
//   * AT MOUNT THE WRITE IS BURIED. The measured split of a mount in this repository is clone 34.8%,
//     the walk 6.1/2.1%, insertion 15.2%, wiring 43.9% (A CITATION from `mount-phases`, not
//     measured here). Seven attribute writes on a card sit inside that
//     43.9% together with the connector, the cells and the subscriptions; the mount table below can
//     bound them (`floor` − `driver`) and cannot resolve one kind from another.
//   * THE ELEMENT IS WARM AT UPDATE, WHICH IS THE HONEST CASE FOR A BRANCH TABLE. Every inline
//     cache in the closure is hot, the hidden class is settled, and what is left is the call and
//     the DOM operation — which is the thing the four kinds actually differ in.
//
// WHAT THE MOUNT TABLE THEREFORE SHOWS, AND WHY IT IS NOT THE SAME QUESTION — three real
// differences, all of them named so the second table is read rather than skipped:
//
//   (i)  ADD VERSUS REPLACE. On a fresh clone, kinds 2, 3 and 4 have NO attribute to overwrite —
//        `compileExoDomSchema` took the placeholder back out (see the block over `CARD_MARKUP`) —
//        so the first `setAttribute` GROWS the element's attribute list, and every write after it
//        replaces a value in place. Those are different operations inside Blink and this axis does
//        not claim to know their ratio; it claims only that the mount table contains the first and
//        the update table contains the second.
//   (ii) THE HELD PLACEHOLDER MAKES KIND 1a A REMOVAL AT MOUNT. ` checked=""` IS in the compiled
//        prototype (the setter, not the markup, owns that attribute), so a fill of `true` REPLACES
//        an empty value and a fill of `false` REMOVES a standing attribute. The mount here fills
//        `true`, so the mount row's 1a is property-store + replace; the update row's 1a alternates
//        replace and remove, once each per cycle. THAT IS SAID OUT LOUD because it is the one kind
//        whose per-fill work is not constant.
//   (iii) NO HIDDEN-CLASS TRANSITION, WHICH IS WHY THIS FILE HAS NONE OF `child-mark`'S APPARATUS.
//        That axis stores TWICE rather than deleting, because a first store of an EXPANDO on a
//        fresh clone is a shape transition and a `delete` would put the object in dictionary mode
//        permanently. Every store in every program here lands on a real IDL accessor — `className`,
//        `value`, `checked` — or goes through `setAttribute`. None of them adds a property to the
//        element, so there is no transition to isolate, and THIS FILE CONTAINS NO `delete` ANYWHERE.
//        The one write in this repository that WOULD be an expando is `createExoPropertyWriters`' property
//        store, and it never fires here — see the strategy section.
//
//   SO, TO STATE IT AS THE BRIEF ASKS: the update table's rows are REPEAT stores and REPLACE-ing
//   attribute writes; the mount table's rows are FIRST stores onto a fresh clone and, for kinds 2-4,
//   ATTRIBUTE-LIST GROWTH. Neither is a correction of the other.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE STRATEGY QUESTION, AND ITS ANSWER IS "NO STRATEGY REDUCES THIS" ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The value-writers interface is real and it has a second implementation: the `writers` field on the
// backend, written by `withExoPropertyWriters` (`packages/dom/src/plugins/exo-property-writers/`).
// `exodra·writers` below renders the identical component through
// `withExoPropertyWriters(withExoCompiler(new ExoDomBackend()))`, so the claim is measured and not merely read.
//
// IT CANNOT REACH ANY OF THE FOUR KINDS, AND THE REASON IS THREE LINES LONG.
// `takesOverExoProperty.ts` in full:
//
//     if (proto.localName.indexOf('-') <= 0) return false;
//     if (EXO_GLOBAL_ATTRIBUTES.has(name)) return false;
//     return name.indexOf('-') < 0 && name.indexOf(':') < 0;
//
// The FIRST line ends it for this axis: every element here is `div`, `b`, `i`, `input`, `svg`, `g`,
// `use` — not one of them has a `-` in its tag — so `takesOver` is `false` for all seven ports and
// `createExoPropertyWriters.attr` returns `EXO_SHIPPED_WRITERS.attr(name, proto)` BY REFERENCE. The same
// `createExoAttrSetter`, the same closure, the same six arms. The second and third lines would have
// stopped `class` and `xlink:href` anyway (`class` is in `EXO_GLOBAL_ATTRIBUTES`; `xlink:href` has
// a `:`), so even a hyphenated tag keeps kinds 2 and 3.
//
// SO THE `exodra·writers` ROW IS PREDICTED TO MEASURE AT `exodra`, and the axis prints that as a
// finding rather than as a null result: THE COMPOSITION ADDS A CAPABILITY AND REMOVES NO WORK. What
// it adds is the one case the shipped pack cannot serve at all — a structured value into a custom
// element's property, where `setAttribute` would stringify an array of 4000 objects into
// `series="[object Object],…"`. What it costs is stated in its own header and is all at compile
// time: two extra `takesOverExoProperty` calls per attribute port per (schema, backend), three
// string tests each, and nothing per instance, per row, per update or per event.
//
// WHAT WAS CONSIDERED AND DECLINED, so the space is closed rather than sampled:
//
//  * A FIFTH KIND — the same seven values written to ports on a HYPHENATED tag, shipped pack against
//    property pack. That IS where the slot changes the work, and it cannot go in this table: the two
//    sides produce DIFFERENT DOM by design (one leaves ` series="[object Object]"` standing, the
//    other a live property), so no gate in this suite could pass both and any ratio between them
//    would be a ratio between two programs. It is a legitimate axis of its own and it is not this
//    one, which is about the four kinds a page already writes.
//  * A BARE `TExoWritersApi` OF MY OWN that returned a thinner closure for, say, `class`. That
//    would be inventing a strategy to have one, and the whole of what it could remove is the
//    `value == null ? '' : String(value)` the shipped arm performs — which is not a strategy, it is
//    deleting a correctness rule and calling the result a win. THE PUBLISHABLE ANSWER IS THE HONEST
//    ONE: no composition in this repository reduces the work for any of the four kinds.
//  * A NODE POOL. It reuses NODES, which changes the clone and not the write, so it is off-subject
//    for the update table by construction — and `@exodra/dom` ships none since the node bank was
//    removed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PROGRAMS. SIX ROWS, EACH CONSECUTIVE PAIR DIFFERING BY ONE NAMEABLE THING. ──────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//   `driver`      THE INSTRUMENT'S OWN COST, and not a participant. The identical loop over the
//                 identical cards, reading the identical seven values out of the identical cycle
//                 arrays, and storing them into module-level sinks. NO DOM WRITE ANYWHERE. Every
//                 other update row is this row PLUS the writes, so it is a common addend that
//                 inflates every row equally and DEFLATES every ratio; the answer prints the
//                 corrected figures beside the raw ones and the run refuses any row that lands
//                 below it. EXCLUDED FROM BOTH GATES by construction — a program that writes no
//                 attributes cannot produce the same DOM, and saying so is the point of the row.
//                 WHAT IT DOES NOT CONTAIN: the per-card record load that `floor` performs and the
//                 renderer performs; it therefore UNDER-states the common addend slightly, which
//                 pushes the corrected ratios UP rather than flattering them.
//
//   `floor`       THE FLOOR. No components, no declaration, no reactivity, no schema, no connector,
//                 no library: one prototype parsed at module load, `CARDS` clones, a seven-hop walk
//                 per clone into a flat record, and the six kinds written STRAIGHT-LINE with the
//                 name a literal and the value known to be a string (or a boolean). It does not
//                 spell `String(value)` and it does not test for `null`, because a callsite that
//                 knows what it holds does not — and that difference is part of the gap by design,
//                 named in the branch-table section above so nobody reads the gap as pure overhead.
//
//   `floor·twin`  THE NULL. A second, independently declared copy of `floor` — its own function
//                 objects, its own independently parsed prototype, the identical work on the
//                 identical data. Its true difference from `floor` is ZERO by construction, so what
//                 the run measures between them is what this instrument returns when there is
//                 nothing to find.
//
//   `floor+cell`  THE MIDDLE RUNG, and it is what makes the gap divisible. The floor's writes,
//                 pushed through the SAME source a machine effect follows and subscribed the same
//                 way the effect subscribes (an initial write of `source.getValue()`, then
//                 `onChange(() => write(getValue()))` — the subscriber re-reads). What it
//                 does NOT have is the setter table: the seven writes are straight-line at the
//                 callsite. So `floor+cell − floor` is THE REACTIVE DISPATCH (the `===` dedupe, the
//                 single-subscriber call, the `getValue` re-read) and `exodra − floor+cell` is THE
//                 SETTER INDIRECTION PLUS THE VALUE-SHAPE INTERPRETATION. Neither quantity had a
//                 number before this file.
//
//   `exodra`      `@exodra/dom` AS IT SHIPS. `CARDS` calls of `backend.render(CARD, container)`
//                 through a `withExoCompiler(new ExoDomBackend())` composed once at module load, a
//                 machine per card whose seven effects each draw one attribute port through a
//                 transition and then follow its source, and the update is `setValue` on every cell. THE LOOP IS THE MOUNT NOW —
//                 `render` mounts one instance — so the entry point's fixed setup is paid per card;
//                 see `exodraProgram` for what that does and does not move.
//
//   `exodra·writers`  THE STRATEGY, COMPOSED FOR REAL: the same component, the same wire, the same
//                 cells, rendered through `withExoPropertyWriters(withExoCompiler(new ExoDomBackend()))`. See the
//                 section above for why it is predicted to measure AT `exodra` and why that is a
//                 publishable finding rather than a wasted row.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE HAZARDS, EVERY ONE OF WHICH HAS BITTEN THIS SUITE ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A. `class` IS NOT ONE THING, AND THIS AXIS CONTAINS BOTH HALVES. `<b class>` takes arm 2a
//    (`className =`, a string store); `<g class>` inside `<svg>` takes arm 2b (`setAttribute`),
//    because `className` on an SVG element is a read-only `SVGAnimatedString` and assigning to it
//    moves nothing. Both are separate rows of the CENSUS and both are in every program. A run that
//    had only the HTML half would have priced the cheap arm and called it `class`.
//
// B. THE HELD PLACEHOLDER. `compileExoDomSchema.ts:1258-1268` emits ` name=""` into the markup for
//    EVERY attribute port and then decides whether to take it back out:
//
//        if (exoDomPropertyKind(on.localName, name) === false) on.removeAttribute(held.name);
//        else if (followed[i] === 1 || !writers.writesAttribute(name, on)) { /* KEEP, record */ }
//        else on.removeAttribute(held.name);
//
//    `keystroke-floor`'s FIRST RUN WAS STOPPED BY EXACTLY THIS and timed nothing. The full reading
//    for this card's seven ports is in the block over `CARD_MARKUP`, and the run PRINTS the compiled
//    prototype beside the floor's, with a first-difference line, BEFORE the gate runs — because on
//    that first run the report sat behind the gate and never printed at all.
//
// C. THE CLOCK. The quantum is OBSERVED, not assumed; every timed region on both tables must clear
//    `MIN_TICKS` × the observed quantum or the row is refused BY NAME, with the batch that would
//    clear it printed in a command line the operator can paste.
//
// D. THE LADDER MUST NEST. `driver ⊂ floor ⊂ floor+cell ⊂ exodra` on the update table, by
//    construction — each is the one before it plus work that is named. Any inversion past the
//    resolution floor is refused by name. Three axes have printed that refusal and it is
//    the fastest way to learn that a table is unreadable.
//
// E. AN UNCHANGED VALUE NEVER REACHES THE SETTER. `createExoBenchSource`'s `setValue` returns early on
//    `nextValue === previousValue`, so a "no-op update" measures the dedupe and NOT the write. Every
//    cycle in this file changes every value at every step, deliberately, so every row does the whole
//    job — and this axis therefore says NOTHING about what an unchanged value costs. It is the same
//    rule `keystroke-floor` follows and for the same reason.
//
// F. THE FLOOR WRITES AFTER INSERTION, exactly as the renderer does (`render-exo-rows.ts:113`
//    mounts each instance, and `mountExoInstance` inserts before it wires). A floor that wrote its
//    attributes into a detached clone would be skipping the style invalidation a connected element
//    pays, and would be handed a free advantage on both tables.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THIS AXIS DOES NOT ANSWER ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  * NOTHING ABOUT STYLE, LAYOUT OR PAINT. The writes invalidate; the recalculation is charged to
//    whatever runs next, which here is the next pass. Every row pays it and no row's timed region
//    contains all of its own — `mount-phases`, `import-node-trade` and `keystroke-floor` carry the
//    same hazard and state it the same way.
//  * NOTHING ABOUT `refuseExoIllegalAttrName` OR `refuseExoDuplicateAttr` — see the decline above; `schema-build`
//    owns them.
//  * NOTHING ABOUT THE SERVER. `ssr-floor` owns the printed form and its `+head` rung is the figure.
//  * NOTHING ABOUT REMOVAL AS A KIND. `null`/`undefined`/`false` REMOVE an attribute in arms 3 and
//    4, and no cycle here ever sends one — every value is a real string. The only removal measured
//    is arm 1a's, twice per cycle, because a boolean has nowhere else to go.
//  * NOTHING ABOUT A CUSTOM ELEMENT. See the declined fifth kind.
//  * IT IS THIS SHAPE ONLY — one attribute port per element, so `followed[i]` is 0 everywhere. Two
//    ports on ONE element take the OTHER arm of the placeholder decision (both placeholders are
//    KEPT, so both writes REPLACE rather than grow, on every mount) and this run does not contain
//    that case.
//  * THE FLOOR IS NOT MEASURED OUT OF A BUILT PACKAGE. `@exodra/dom` and `@exodra/core`
//    resolve to their tsup `dist`; the floor programs are in this file and go
//    through the dev server's esbuild. One transpiler against another — `mount-floor` states the
//    same asymmetry as its caveat A.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// JUDGEMENT plus citations. I MEASURED NONE OF IT. Every falsifier is printed mechanically at the
// end so that nobody, including me, gets to choose which one counted.
//
//   P1. `exodra / floor` PER WRITE, DRIVER-CORRECTED, LANDS BETWEEN 1.5 AND 3.5. MECHANISM: on top
//       of the same DOM operation the renderer runs the dedupe compare, one subscriber call, one
//       `getValue` re-read, one `schema.setters[i]` load, one indirect call and the arm's value-shape
//       tests. The standing prior in this repository is that the DOM operation dominates
//       (`update-floor`: dispatch +12.5 µs against +62.5 µs of reconcile/records/boundary — A
//       CITATION, not this run). (a) BELOW 1.15 falsifies it: the write is Blink-bound and the
//       bookkeeping is free. (b) ABOVE 4.5 falsifies it the other way: most of an attribute fill is
//       ours, and the 86%-is-DOM prior fails on this path as it already failed on updates.
//
//   P2. `exodra·writers` MEASURES AT `exodra`, INSIDE THE RESOLUTION FLOOR, ON BOTH TABLES.
//       MECHANISM: `takesOverExoProperty` returns `false` for all seven ports on the first line, so
//       the pack delegates every one to `EXO_SHIPPED_WRITERS` by reference and the compiled setters
//       are the same functions. (c) IF IT DIFFERS AT ALL, either the delegation is not by reference
//       or composing a backend costs something on a render path, and BOTH are findings about the
//       `writers` field that this repository has asserted and never measured.
//
//   P3. THE LADDER SPLITS THE GAP ROUGHLY IN HALF: `floor+cell − floor` and `exodra − floor+cell`
//       are within 3× of each other. MECHANISM: the dispatch side is a compare, a call and a re-read;
//       the setter side is a load, an indirect call and two or three value tests. (d) IF ONE SIDE IS
//       MORE THAN 3× THE OTHER, the gap has ONE owner and the answer names it — which is more useful
//       than the prediction holding.
//
//   P4. `driver` IS UNDER A THIRD OF A FLOOR WRITE. MECHANISM: an array index and a store into a
//       module-level sink, against a crossing into Blink. (e) IF IT IS OVER A HALF, the loop is the
//       measurement and every raw ratio on the update table is mostly the instrument.
//
//   THE MODEL CAN BE RIGHT FOR THE WRONG REASON. P1 holding while P3 fails would mean the gap is
//   real and has a single owner, and this file's division of it into "dispatch" and "setter" would
//   be a story rather than a finding.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HOW TO RUN IT ───────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- attr-floor 100 1
//
// ONE AXIS AT A TIME — memory pressure has crashed multi-axis runs in this suite. The third
// positional is the batch and it is HONOURED: it multiplies every phase's repetition factor, which
// is what the clock refusal asks for by name. Batch 1 is the one to run first. `@exodra/*` resolve
// to their BUILT dists, so `npm run build:all` at the repository root has to have run or every
// `exodra` row is last week's code.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
    type TExoAttrPort,
} from '@exodra/core';
import {
    ExoDomBackend,
    exoDomSchemaOf,
    withExoPropertyWriters,
    type TExoDomNode,
    withExoCompiler,
    withExoForeignNamespaces,
} from '@exodra/dom';
import type { TExoDomBackend, TExoCompilerApi } from '@exodra/dom';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import { markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE CENSUS. One place, so no two programs can drift by a constant.
// ---------------------------------------------------------------------------------------

/** The XLink namespace — kind 3's namespace, and the parser's answer for `xlink:href`. */
const XLINK = 'http://www.w3.org/1999/xlink';

/**
 * CARDS ON THE PAGE.
 *
 * A hundred, and the reason is arithmetic rather than taste: one card is 8 elements, so a mount is
 * 800 elements against the 641 of the app `mount-floor` measures, where `clone+refs` came out at
 * 0.2137 ms (A CITATION from that axis). One mount here is therefore of the order of 0.25 ms, which
 * clears a 0.1 ms clock on its own, and one update pass is 700 attribute writes.
 */
const CARDS = 100;

/** Attribute ports per card — one per element, so `followed[i]` is 0 for every one of them. */
const PORTS_PER_CARD = 7;

/** Attribute writes in ONE pass over the page. */
const WRITES_PER_PASS = CARDS * PORTS_PER_CARD;

/**
 * PASSES INSIDE ONE TIMED REGION ON THE UPDATE TABLE, a whole number of cycles.
 *
 * A single write is far under the browser's clamped clock, so a region of one pass would be the
 * clamp printed however many times the run asks for. The run OBSERVES its quantum rather than
 * trusting this number and refuses by name any row whose region landed under three ticks.
 */
const PASSES = 24;

/** Attribute writes per timed region on the UPDATE table, at batch 1. */
const WRITES_PER_REGION = WRITES_PER_PASS * PASSES;

/**
 * MOUNTS PER TIMED REGION ON THE MOUNT TABLE.
 *
 * Eight, for the reason above: one mount is already of the order of a couple of ticks, so eight
 * clears the floor with room, and eight standing pages is 6400 live elements — nothing beside
 * `teardown-floor`'s 51,000. The batch multiplies it if the clock still refuses.
 */
const MOUNT_REPS = 8;

// ---------------------------------------------------------------------------------------
// THE VALUE CYCLES — one per port, four steps each, EVERY CONSECUTIVE PAIR DIFFERENT.
//
// Hazard E: `createExoBenchSource` returns early when `nextValue === previousValue`, so a repeated
// value would measure the dedupe and not the write. Nothing here ever repeats within a cycle or
// across its wrap. The lengths are all 4 so ONE index serves every port and a pass is a single
// `j & 3`; the boolean's cycle is `true,false,true,false`, which is the only period-2 sequence that
// satisfies the rule and is why it is spelled out to length 4 rather than to length 2.
//
// EVERY VALUE IS A REAL STRING (or a real boolean). No cycle ever sends `null`, `undefined` or
// `false` to arms 3 and 4, so the REMOVAL half of those arms is never measured — stated in "what
// this axis does not answer" and repeated here at the data.
// ---------------------------------------------------------------------------------------

/** Kind 2a — `class` on an HTML `<b>`: `node.className = …`. */
const CLS: readonly string[] = ['k0 hot', 'k1 warm', 'k2 cool', 'k3 cold'];
/** Kind 4 — `style` on an HTML `<i>`: `setAttribute('style', …)`, lowercased name, HTML namespace. */
const STY: readonly string[] = ['color:#101010', 'color:#202020', 'color:#303030', 'color:#404040'];
/** Kind 1b — `value` on an `<input>`: ONE property store, and the attribute is never touched. */
const VAL: readonly string[] = ['v0', 'v1', 'v2', 'v3'];
/**
 * Kind 4 IN FOREIGN CONTENT — `viewBox` on `<svg>`. The port is declared `viewBox`, the markup
 * carries ` viewbox=""`, the HTML parser's "adjust SVG attributes" turns that into a real `viewBox`
 * on the element, and the setter uses THE NAME OFF THE PROTOTYPE. It is the same closure as `style`
 * above and a DIFFERENT name from `exoAttribute('viewBox').name` — the regression
 * `packages/dom/src/tests/svg.test.ts` pins, in a timed region for the first time.
 */
const BOX: readonly string[] = ['0 0 10 10', '0 0 11 11', '0 0 12 12', '0 0 13 13'];
/** Kind 2b — `class` on an SVG `<g>`: `setAttribute('class', …)`, because `className` is read-only there. */
const GCLS: readonly string[] = ['g0', 'g1', 'g2', 'g3'];
/** Kind 3 — `xlink:href` on an SVG `<use>`: `setAttributeNS(XLINK, 'xlink:href', …)`. */
const HREF: readonly string[] = ['#s0', '#s1', '#s2', '#s3'];
/**
 * Kind 1a — `checked` on an `<input>`: a property store AND an attribute write, two DOM operations.
 *
 * It STARTS `true` so that the mount fills a standing ` checked=""` placeholder with the same empty
 * value (a REPLACE) rather than removing it, which keeps the mount table's seven kinds all
 * "property store or attribute write" and puts the removal only on the update table, where it
 * alternates with the replace once per cycle. Hazard (ii) in the mount/update section.
 */
const CHK: readonly boolean[] = [true, false, true, false];

/** The cycle length every array above shares. */
const CYCLE = 4;

// ---------------------------------------------------------------------------------------
// THE SCHEMA — one card, seven elements carrying one attribute port each, and every arm of
// `exo-attr-setter`'s branch table represented exactly once.
//
// NO COMPONENT BOUNDARY INSIDE IT, on purpose: a component per card would put a boundary in every
// row (measured at ~11% of a mount elsewhere in this repository) and the floor would have nothing
// to match it with. What is being measured is an attribute write, not a component tree.
//
// ONE ATTRIBUTE PORT PER ELEMENT, also on purpose, and it decides the prototype: `followed[i]` is 0
// for every port, so the placeholder decision is made purely on `writers.writesAttribute`. Two ports
// on one element would take the other arm — see "what this axis does not answer".
// ---------------------------------------------------------------------------------------

type TCardPorts = {
    readonly cls: TExoAttrPort;
    readonly sty: TExoAttrPort;
    readonly val: TExoAttrPort;
    readonly chk: TExoAttrPort;
    readonly box: TExoAttrPort;
    readonly gcls: TExoAttrPort;
    readonly href: TExoAttrPort;
};

const CARD_SCHEMA = createExoSchema<TCardPorts>((b) => {
    let cls!: TExoAttrPort;
    let sty!: TExoAttrPort;
    let val!: TExoAttrPort;
    let chk!: TExoAttrPort;
    let box!: TExoAttrPort;
    let gcls!: TExoAttrPort;
    let href!: TExoAttrPort;
    b.el('div', { class: 'c' }, (card) => {
        card.el('b', null, (n) => {
            cls = n.port('class');
        });
        card.el('i', null, (n) => {
            sty = n.port('style');
        });
        card.el('input', { type: 'text' }, (n) => {
            val = n.port('value');
        });
        card.el('input', { type: 'checkbox' }, (n) => {
            chk = n.port('checked');
        });
        card.el('svg', null, (s) => {
            box = s.port('viewBox');
            s.el('g', null, (g) => {
                gcls = g.port('class');
            });
            s.el('use', null, (u) => {
                href = u.port('xlink:href');
            });
        });
    });
    return { cls, sty, val, chk, box, gcls, href };
});

/** The ports, hoisted once at module load — one property load, as a wire factory would give. */
const P = CARD_SCHEMA.ports;

// ---------------------------------------------------------------------------------------
// WHERE THE RENDERER'S CELLS ARE COLLECTED.
//
// `render` returns no state and the update driver needs the cells, so the initial state pushes into two
// module-level arrays and the mount function takes them away. Two arrays and not one because the
// boolean cell has a different type from the six string ones and this project does not write `any`;
// the layout is fixed and stated once here: SIX string cells per card, in the order
// `cls, sty, val, box, gcls, href`, and ONE boolean cell per card.
//
// THE ORDER OF `setValue` CALLS IS NOT THE ORDER OF THE EFFECTS, and it does not matter: the
// seven ports are on seven DIFFERENT elements, each carrying exactly one attribute, so no write can
// change another's position. If they shared an element the order WOULD be the difference between
// two markups and the gate would catch it.
// ---------------------------------------------------------------------------------------

let COLLECT_STR: TExoBenchSource<string>[] = [];
let COLLECT_BOOL: TExoBenchSource<boolean>[] = [];

type TCardState = {
    readonly cls: TExoBenchSource<string>;
    readonly sty: TExoBenchSource<string>;
    readonly val: TExoBenchSource<string>;
    readonly chk: TExoBenchSource<boolean>;
    readonly box: TExoBenchSource<string>;
    readonly gcls: TExoBenchSource<string>;
    readonly href: TExoBenchSource<string>;
};

const m = createExoMachine<TExoDomNode, unknown, TCardState>(CARD_SCHEMA, {
    createInitialState: (): TCardState => {
        const cls = createExoBenchSource(CLS[0]);
        const sty = createExoBenchSource(STY[0]);
        const val = createExoBenchSource(VAL[0]);
        const box = createExoBenchSource(BOX[0]);
        const gcls = createExoBenchSource(GCLS[0]);
        const href = createExoBenchSource(HREF[0]);
        const chk = createExoBenchSource(CHK[0]);
        COLLECT_STR.push(cls, sty, val, box, gcls, href);
        COLLECT_BOOL.push(chk);
        return { cls, sty, val, chk, box, gcls, href };
    },
});

const CARD = composeExoMachine(
    m,
    (m) =>
        withExoTransitions(m, {
            showCls: (c) => c.attr(P.cls, c.state.cls.getValue()),
            showSty: (c) => c.attr(P.sty, c.state.sty.getValue()),
            showVal: (c) => c.attr(P.val, c.state.val.getValue()),
            showChk: (c) => c.attr(P.chk, c.state.chk.getValue()),
            showBox: (c) => c.attr(P.box, c.state.box.getValue()),
            showGcls: (c) => c.attr(P.gcls, c.state.gcls.getValue()),
            showHref: (c) => c.attr(P.href, c.state.href.getValue()),
        }),
    (m) => {
        const { showCls, showSty, showVal, showChk, showBox, showGcls, showHref } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showCls(c);
                return c.state.cls.onChange(() => showCls(c));
            });
            effect((c) => {
                showSty(c);
                return c.state.sty.onChange(() => showSty(c));
            });
            effect((c) => {
                showVal(c);
                return c.state.val.onChange(() => showVal(c));
            });
            effect((c) => {
                showChk(c);
                return c.state.chk.onChange(() => showChk(c));
            });
            effect((c) => {
                showBox(c);
                return c.state.box.onChange(() => showBox(c));
            });
            effect((c) => {
                showGcls(c);
                return c.state.gcls.onChange(() => showGcls(c));
            });
            effect((c) => {
                showHref(c);
                return c.state.href.onChange(() => showHref(c));
            });
        });
    }
);

/**
 * THE TWO BACKENDS THIS AXIS RENDERS THROUGH, BUILT ONCE AT MODULE LOAD.
 *
 * A BACKEND IS THE SCHEMA CACHE KEY AND IS COMPARED BY POINTER, so their identity is what keeps the
 * cache hitting — `withExoCompiler(new ExoDomBackend(...))` inside the mount would hand `exoDomSchemaOf` a fresh key
 * on every render and recompile the declaration, markup parse included, which would make these rows
 * a measurement of the compiler.
 *
 * They are TWO objects on purpose: `SHIPPED_BACKEND` composes nothing, `WRITERS_BACKEND` composes
 * the value-writers pack, and P2 is the claim that the second compiles to the same setters as the
 * first. Two backends key two schemas, so both are compiled — see `protoReport`, which prints both.
 */
const SHIPPED_BACKEND = withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()));
// THE PACK IS A DECORATOR NOW, and it is a spelling change only: `withExoPropertyWriters` merges
// `writers` ONTO the object it is handed and returns that same object, so this is one backend with
// one `writers` field — exactly what `withExoCompiler(new ExoDomBackend(exoPropertyWritersPlugin()))` produced — and
// therefore the identical schema-cache key and the identical compiled setters. No timed region moved.
const WRITERS_BACKEND = withExoPropertyWriters(
    withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()))
);

// ---------------------------------------------------------------------------------------
// THE FLOOR'S PROTOTYPE. Parsed once at module load out of a `<template>` and LEFT WHERE THE PARSER
// PUT IT — the template-contents owner document, which is where `@exodra/dom`'s prototypes live
// since `importNode` was dropped from its compiler (`compileExoDomSchema`, and `import-node-trade`
// measured both halves of that trade). A floor that page-owned its prototype where the renderer does
// not would be handing the renderer free advantage on the mount table.
//
// ═══ WHICH PLACEHOLDERS STAND HERE, AND WHY EACH ONE DOES. DO NOT "TIDY" THIS STRING. ═══
//
// `compileExoDomSchema.ts:1258-1268` emits ` name=""` into the markup for EVERY attribute port and
// then decides whether to take it back out, on the three-way test quoted in hazard B. Port by port,
// with the answer each branch gives — `followed[i]` is 0 for all seven, because each element carries
// exactly one attribute port:
//
//   `<b class>`      `exoDomPropertyKind('b','class')` is `undefined`, so not the first arm.
//                    `writesAttribute('class', <b>)` is TRUE (arm 2a writes `className`, which IS
//                    the attribute). Not followed. → PLACEHOLDER REMOVED. Prototype: `<b></b>`.
//   `<i style>`      Same reasoning through arm 4. → REMOVED. `<i></i>`.
//   `<input value>`  A property port: arm 1b writes `el.value` and never the attribute. The
//                    compiler used to KEEP an empty placeholder here so an unfilled port had
//                    something to sweep; it reserves none now, and
//                    `packages/dom/src/tests/attr-parity.test.ts` pins the bytes — `<input>` in
//                    the browser, `<input value="typed">` on the server. Prototype:
//                    `<input type="text">`.
//   `<input checked>` Same, and the same test pins an unticked box as `<input type="checkbox">` on
//                    BOTH backends. Prototype: `<input type="checkbox">`.
//   `<svg viewBox>`  Arm 4 in foreign content. `writesAttribute` TRUE. → REMOVED — and the SETTER
//                    still knows the parser's spelling, because `exo-attr-setter` performs its
//                    `parsedExoAttr` lookup BEFORE this removal and closes over the answer.
//   `<g class>`      Arm 2b. `writesAttribute` TRUE. → REMOVED. `<g></g>`.
//   `<use xlink:href>` Arm 3. `writesAttribute` TRUE. → REMOVED, by the QUALIFIED name, which is
//                    what `removeAttribute` matches on. `<use></use>`.
//
// SO NO PLACEHOLDER STANDS IN THE PROTOTYPE ANY MORE, AND THE FLOOR MUST NOT PRINT ONE. A floor
// carrying ` value=""` would be cloning a dearer element than the renderer clones — one more
// attribute on two of every card's eight elements — and would then produce different markup, which
// is a different program and not a slower one. `keystroke-floor`'s first run died on the same
// question from the other side; `protoReport()` below prints this string against the compiled
// prototype, with a first-difference line, BEFORE the gate runs.
//
// STATICS FIRST, THEN PLACEHOLDERS, because that is the emit order: `compileExoDomSchema.ts:458-460`
// writes `node.attrs` and only then, at :510, appends `exoAttribute(name).head`.
//
// NO TEXT PORT ANYWHERE IN THIS SCHEMA, so there is no text placeholder to empty back out — the one
// piece of `keystroke-floor`'s prototype ritual this file does not need.
// ---------------------------------------------------------------------------------------

const CARD_MARKUP =
    '<div class="c">' +
    '<b></b>' +
    '<i></i>' +
    '<input type="text">' +
    '<input type="checkbox">' +
    '<svg><g></g><use></use></svg>' +
    '</div>';

function protoOf(markup: string): Element {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as Element;
}

/** Two independently parsed prototypes. The second is the null's — see `floor·twin`. */
const FLOOR_PROTO_1 = protoOf(CARD_MARKUP);
const FLOOR_PROTO_2 = protoOf(CARD_MARKUP);

/**
 * WHAT A FLOOR PROGRAM HOLDS PER CARD.
 *
 * The cheapest retention that answers "can this program come back to that element later": one flat
 * record of seven pointers, built WHOLE in field order so every card in the process shares one
 * hidden class (the V8 in-object sizing rule this repository learned the hard way — growing an
 * object field by field regressed a build by 11%). No map, no keys, no per-port objects.
 * `@exodra/dom` keeps something structurally different (a per-SCHEMA node array reused by every
 * instance, plus a cell and a subscription per port), and that difference is part of what the gap
 * contains rather than something this file tries to reproduce.
 */
interface CardRefs {
    readonly b: HTMLElement;
    readonly i: HTMLElement;
    readonly txt: HTMLInputElement;
    readonly chk: HTMLInputElement;
    readonly svg: Element;
    readonly g: Element;
    readonly use: Element;
}

/** What a mounted floor page is. */
interface FloorHandle {
    readonly refs: readonly CardRefs[];
    /** Present only on `floor+cell`; the other floors drive the DOM directly. */
    readonly strs: readonly TExoBenchSource<string>[];
    readonly bools: readonly TExoBenchSource<boolean>[];
}

// ---------------------------------------------------------------------------------------
// FLOOR (1) — STRAIGHT-LINE WRITES, NO FRAMEWORK OF ANY KIND.
//
// The walk is seven `firstChild`/`nextSibling` hops written out, because seven is what a compiled
// walk table would hold for this shape too; a loop over a table here would be giving the floor a
// shape the renderer does not have, and writing a hundred cards' hops straight-line would be giving
// it one no renderer could have. Both files' rule is the same: match the SHAPE, never the size.
// ---------------------------------------------------------------------------------------

function walkCard(card: Element): CardRefs {
    const b = card.firstChild as HTMLElement;
    const i = b.nextSibling as HTMLElement;
    const txt = i.nextSibling as HTMLInputElement;
    const chk = txt.nextSibling as HTMLInputElement;
    const svg = chk.nextSibling as Element;
    const g = svg.firstChild as Element;
    const use = g.nextSibling as Element;
    return { b, i, txt, chk, svg, g, use };
}

/**
 * ONE PASS OF ALL SIX ARMS OVER EVERY CARD — the floor's whole timed region on the update table.
 *
 * THE VALUES ARE INDEXED INSIDE THE LOOP AND NOT HOISTED OUT OF IT. Hoisting would be legitimate for
 * a hand-written program (the value is the same on every card) and would take seven array loads per
 * card off the floor's side of the ledger — loads the renderer pays as seven `getValue` calls. What
 * separates those two is `floor+cell`, and it can only do that if this row performs the loads.
 *
 * NO `String(...)`, NO `== null` TEST. A callsite that knows it holds a string does not write them,
 * and the shipped arms do because a port accepts any value. That is a real part of the gap and it is
 * named in the branch-table section rather than smuggled into the floor.
 */
function writeFloorPass(refs: readonly CardRefs[], j: number): void {
    const k = j % CYCLE;
    for (let c = 0; c < refs.length; c++) {
        const r = refs[c];
        r.b.className = CLS[k];
        r.i.setAttribute('style', STY[k]);
        r.txt.value = VAL[k];
        const on = CHK[k];
        r.chk.checked = on;
        if (on) r.chk.setAttribute('checked', '');
        else r.chk.removeAttribute('checked');
        r.svg.setAttribute('viewBox', BOX[k]);
        r.g.setAttribute('class', GCLS[k]);
        r.use.setAttributeNS(XLINK, 'xlink:href', HREF[k]);
    }
}

/**
 * MOUNT THE FLOOR'S PAGE — clone, walk, INSERT, then write, in that order.
 *
 * Hazard F: the writes land on a CONNECTED element, because `ExoDomBackend.render` mounts the
 * instance and `mountExoInstance` inserts before it wires. Writing into a detached
 * clone would skip the style invalidation a connected element pays and would hand this row a free
 * advantage on the mount table.
 */
function mountFloor(container: HTMLElement, proto: Element): FloorHandle {
    const refs: CardRefs[] = new Array<CardRefs>(CARDS);
    for (let c = 0; c < CARDS; c++) {
        const card = proto.cloneNode(true) as Element;
        const r = walkCard(card);
        refs[c] = r;
        container.appendChild(card);
        r.b.className = CLS[0];
        r.i.setAttribute('style', STY[0]);
        r.txt.value = VAL[0];
        const on = CHK[0];
        r.chk.checked = on;
        if (on) r.chk.setAttribute('checked', '');
        else r.chk.removeAttribute('checked');
        r.svg.setAttribute('viewBox', BOX[0]);
        r.g.setAttribute('class', GCLS[0]);
        r.use.setAttributeNS(XLINK, 'xlink:href', HREF[0]);
    }
    return { refs, strs: [], bools: [] };
}

// ---------------------------------------------------------------------------------------
// THE NULL — A SECOND, INDEPENDENTLY DECLARED COPY of the two functions above.
//
// Its own function objects, its own inline caches, its own prototype, the identical work on the
// identical data. ITS TRUE DIFFERENCE FROM `floor` IS ZERO BY CONSTRUCTION, so what the run measures
// between them is what this instrument returns when there is nothing to find. It is duplicated
// SOURCE and not a second call to the same function on purpose: calling one function twice would
// share everything V8 learned about it and would measure a floor far below the one a real pair of
// programs sits on.
// ---------------------------------------------------------------------------------------

function writeTwinPass(refs: readonly CardRefs[], j: number): void {
    const k = j % CYCLE;
    for (let c = 0; c < refs.length; c++) {
        const r = refs[c];
        r.b.className = CLS[k];
        r.i.setAttribute('style', STY[k]);
        r.txt.value = VAL[k];
        const on = CHK[k];
        r.chk.checked = on;
        if (on) r.chk.setAttribute('checked', '');
        else r.chk.removeAttribute('checked');
        r.svg.setAttribute('viewBox', BOX[k]);
        r.g.setAttribute('class', GCLS[k]);
        r.use.setAttributeNS(XLINK, 'xlink:href', HREF[k]);
    }
}

function mountTwin(container: HTMLElement, proto: Element): FloorHandle {
    const refs: CardRefs[] = new Array<CardRefs>(CARDS);
    for (let c = 0; c < CARDS; c++) {
        const card = proto.cloneNode(true) as Element;
        const b = card.firstChild as HTMLElement;
        const i = b.nextSibling as HTMLElement;
        const txt = i.nextSibling as HTMLInputElement;
        const chk = txt.nextSibling as HTMLInputElement;
        const svg = chk.nextSibling as Element;
        const g = svg.firstChild as Element;
        const use = g.nextSibling as Element;
        const r: CardRefs = { b, i, txt, chk, svg, g, use };
        refs[c] = r;
        container.appendChild(card);
        r.b.className = CLS[0];
        r.i.setAttribute('style', STY[0]);
        r.txt.value = VAL[0];
        const on = CHK[0];
        r.chk.checked = on;
        if (on) r.chk.setAttribute('checked', '');
        else r.chk.removeAttribute('checked');
        r.svg.setAttribute('viewBox', BOX[0]);
        r.g.setAttribute('class', GCLS[0]);
        r.use.setAttributeNS(XLINK, 'xlink:href', HREF[0]);
    }
    return { refs, strs: [], bools: [] };
}

// ---------------------------------------------------------------------------------------
// THE MIDDLE RUNG — the floor's writes, pushed through the SAME cells the `exodra` card follows.
//
// Each of that card's effects writes the source's current value through `c.attr` and returns the
// unsubscribe:
//
//     show(c);
//     return source.onChange(() => show(c));
//
// — an initial fill, then a subscriber that RE-READS `getValue()`.
// Each of the seven functions below is that, with the setter table taken out and the write spelled
// straight-line at the callsite. So `floor+cell − floor` is the reactive dispatch (the `===` dedupe,
// the single-subscriber call, the re-read) and `exodra − floor+cell` is the transition call, the
// setter load, the indirect call and the arm's value-shape tests.
//
// THE SUBSCRIPTIONS ARE NOT DISPOSED, and that is deliberate rather than sloppy: the cells and the
// closures die with the page when the container is removed, exactly as the floor's records do, and a
// teardown path here would put `exoTeardownScope`'s bookkeeping on one rung of a ladder and not the
// others. Teardown is `teardown-floor`'s and `teardown-phases`' question.
// ---------------------------------------------------------------------------------------

function mountFloorCell(container: HTMLElement, proto: Element): FloorHandle {
    const refs: CardRefs[] = new Array<CardRefs>(CARDS);
    const strs: TExoBenchSource<string>[] = [];
    const bools: TExoBenchSource<boolean>[] = [];
    for (let c = 0; c < CARDS; c++) {
        const card = proto.cloneNode(true) as Element;
        const r = walkCard(card);
        refs[c] = r;
        container.appendChild(card);

        const cls = createExoBenchSource(CLS[0]);
        const sty = createExoBenchSource(STY[0]);
        const val = createExoBenchSource(VAL[0]);
        const box = createExoBenchSource(BOX[0]);
        const gcls = createExoBenchSource(GCLS[0]);
        const href = createExoBenchSource(HREF[0]);
        const chk = createExoBenchSource(CHK[0]);
        strs.push(cls, sty, val, box, gcls, href);
        bools.push(chk);

        const b = r.b;
        b.className = cls.getValue();
        cls.onChange(() => {
            b.className = cls.getValue();
        });

        const it = r.i;
        it.setAttribute('style', sty.getValue());
        sty.onChange(() => {
            it.setAttribute('style', sty.getValue());
        });

        const txt = r.txt;
        txt.value = val.getValue();
        val.onChange(() => {
            txt.value = val.getValue();
        });

        const svgEl = r.svg;
        svgEl.setAttribute('viewBox', box.getValue());
        box.onChange(() => {
            svgEl.setAttribute('viewBox', box.getValue());
        });

        const g = r.g;
        g.setAttribute('class', gcls.getValue());
        gcls.onChange(() => {
            g.setAttribute('class', gcls.getValue());
        });

        const use = r.use;
        use.setAttributeNS(XLINK, 'xlink:href', href.getValue());
        href.onChange(() => {
            use.setAttributeNS(XLINK, 'xlink:href', href.getValue());
        });

        const chkEl = r.chk;
        const first = chk.getValue();
        chkEl.checked = first;
        if (first) chkEl.setAttribute('checked', '');
        else chkEl.removeAttribute('checked');
        chk.onChange(() => {
            const on = chk.getValue();
            chkEl.checked = on;
            if (on) chkEl.setAttribute('checked', '');
            else chkEl.removeAttribute('checked');
        });
    }
    return { refs, strs, bools };
}

// ---------------------------------------------------------------------------------------
// THE DRIVER'S OWN PAGE — the identical tree, cloned, walked and inserted, and NOT ONE ATTRIBUTE
// WRITTEN ANYWHERE.
//
// Its MOUNT row is the clone, the walk and the insertion alone, so `floor·mount − driver·mount` is
// the mount table's own attribute component — the only way that table can be read as being about
// attributes at all. Its UPDATE row is the loop and the seven value loads, which every other update
// row also performs.
//
// IT IS EXCLUDED FROM BOTH GATES BY CONSTRUCTION: a program that writes no attributes cannot produce
// the same DOM as one that does, and that is the entire point of the row.
// ---------------------------------------------------------------------------------------

function mountDriver(container: HTMLElement, proto: Element): FloorHandle {
    const refs: CardRefs[] = new Array<CardRefs>(CARDS);
    for (let c = 0; c < CARDS; c++) {
        const card = proto.cloneNode(true) as Element;
        refs[c] = walkCard(card);
        container.appendChild(card);
    }
    return { refs, strs: [], bools: [] };
}

/**
 * THE SINKS. Module-level so the driver's stores cannot be eliminated as dead.
 *
 * Six string stores and one boolean store per card, matching the seven the other rows perform — and
 * NOT the per-card record load, which the driver does not do. It therefore UNDER-states the common
 * addend, which pushes the corrected ratios UP rather than flattering them. Said here and in the
 * header, because a driver row that quietly over-states its addend would deflate every gap in the
 * table.
 */
let SINK_A = '';
let SINK_B = '';
let SINK_C = '';
let SINK_D = '';
let SINK_E = '';
let SINK_F = '';
let SINK_G = false;

function driverPass(n: number, j: number): void {
    const k = j % CYCLE;
    for (let c = 0; c < n; c++) {
        SINK_A = CLS[k];
        SINK_B = STY[k];
        SINK_C = VAL[k];
        SINK_D = BOX[k];
        SINK_E = GCLS[k];
        SINK_F = HREF[k];
        SINK_G = CHK[k];
    }
}

// ---------------------------------------------------------------------------------------
// PUSHING VALUES THROUGH CELLS — shared by `floor+cell`, `exodra` and `exodra·writers`, so those
// three rows differ ONLY in what a subscriber does and never in how the values arrive.
// ---------------------------------------------------------------------------------------

function cellPass(
    strs: readonly TExoBenchSource<string>[],
    bools: readonly TExoBenchSource<boolean>[],
    j: number
): void {
    const k = j % CYCLE;
    for (let c = 0; c < bools.length; c++) {
        const base = c * 6;
        strs[base].setValue(CLS[k]);
        strs[base + 1].setValue(STY[k]);
        strs[base + 2].setValue(VAL[k]);
        strs[base + 3].setValue(BOX[k]);
        strs[base + 4].setValue(GCLS[k]);
        strs[base + 5].setValue(HREF[k]);
        bools[c].setValue(CHK[k]);
    }
}

// ---------------------------------------------------------------------------------------
// THE PROGRAM TABLE. One record per row, so nothing below names a winner in advance.
// ---------------------------------------------------------------------------------------

interface Mounted {
    readonly dispose: () => void;
    /** One pass of the seven kinds over every card, at cycle step `j`. */
    readonly pass: (j: number) => void;
}

interface Program {
    readonly name: string;
    readonly mount: (c: HTMLElement) => Mounted;
    /** What the row is, printed under every table. */
    readonly what: string;
    /** `false` for `driver`, which by construction cannot produce the same DOM. */
    readonly gated: boolean;
}

const floorProgram =
    (
        mount: (c: HTMLElement, p: Element) => FloorHandle,
        proto: Element,
        pass: (h: FloorHandle, j: number) => void
    ) =>
    (c: HTMLElement): Mounted => {
        const h = mount(c, proto);
        return {
            pass: (j) => {
                pass(h, j);
            },
            dispose: () => {
                c.textContent = '';
            },
        };
    };

const exodraProgram =
    (backend: TExoDomBackend & TExoCompilerApi) =>
    (c: HTMLElement): Mounted => {
        COLLECT_STR = [];
        COLLECT_BOOL = [];
        // THE CARDS ARE A LOOP OF `render` CALLS, and that is a change to the mount table's shape:
        // `ExoDomBackend.render` mounts ONE instance, so the fixed setup it carries — one
        // teardown scope, and until the DOM context walk was removed an `exoContextAt` climb out
        // of the container beside it — is paid per card
        // instead of once for the whole batch. The floor programs above have no equivalent of it
        // and never did; what changed is that the renderer's share of it grew by a factor of
        // `CARDS`. A mount-table number recorded before this change is not comparable with one
        // recorded after it. The UPDATE table is untouched: nothing here is inside `pass`.
        //
        // Every card is wired identically, exactly as before — this component's wire never read
        // the per-instance number the deleted entry point handed it, so nothing about the DOM the
        // gate compares has moved.
        const offs: (() => void)[] = new Array<() => void>(CARDS);
        for (let i = 0; i < CARDS; i++) offs[i] = backend.render(CARD, c);
        const strs = COLLECT_STR;
        const bools = COLLECT_BOOL;
        return {
            pass: (j) => {
                cellPass(strs, bools, j);
            },
            dispose: () => {
                for (const off of offs) off();
            },
        };
    };

const PROGRAMS: readonly Program[] = [
    {
        name: 'driver',
        mount: floorProgram(mountDriver, FLOOR_PROTO_1, (h, j) => {
            driverPass(h.refs.length, j);
        }),
        what: "the instrument's own cost — the loop and 7 value loads per card, NO DOM write",
        gated: false,
    },
    {
        name: 'floor',
        mount: floorProgram(mountFloor, FLOOR_PROTO_1, (h, j) => {
            writeFloorPass(h.refs, j);
        }),
        what: 'no framework: clone, walk, and the 6 arms written straight-line at the callsite',
        gated: true,
    },
    {
        name: 'floor·twin',
        mount: floorProgram(mountTwin, FLOOR_PROTO_2, (h, j) => {
            writeTwinPass(h.refs, j);
        }),
        what: 'the NULL — a second declaration of the row above, true Δ = 0',
        gated: true,
    },
    {
        name: 'floor+cell',
        mount: floorProgram(mountFloorCell, FLOOR_PROTO_1, (h, j) => {
            cellPass(h.strs, h.bools, j);
        }),
        what: 'the same writes, pushed through the same sources the exodra card follows',
        gated: true,
    },
    {
        name: 'exodra',
        mount: exodraProgram(SHIPPED_BACKEND),
        what: '@exodra/dom machine — 7 effects following 7 sources per card under withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()))',
        gated: true,
    },
    {
        name: 'exodra·writers',
        mount: exodraProgram(WRITERS_BACKEND),
        what: 'the same, under withExoPropertyWriters(withExoForeignNamespaces(withExoCompiler(new ExoDomBackend())))',
        gated: true,
    },
];

/** The rows whose ladder must nest, innermost first. Hazard D. */
const LADDER = ['driver', 'floor', 'floor+cell', 'exodra'] as const;

// ---------------------------------------------------------------------------------------
// THE GATE. Nothing is timed until every program has been shown to produce the SAME DOM after the
// SAME writes — STEPPED, because the cycle returns to where it started.
// ---------------------------------------------------------------------------------------

/**
 * EVERYTHING A PASS CAN HAVE MOVED, IN TWO SEPARATELY COMPARABLE PARTS.
 *
 * `innerHTML` alone is not enough and that is arm 1's whole point: `value` and `checked` on an
 * `<input>` are written as DOM PROPERTIES and a property does not serialise. A markup-only gate
 * would pass a program that never performed the property store at all. So the live `.value` and
 * `.checked` are read BESIDE the markup, and the `value`/`checked` ATTRIBUTES are read too, because
 * on those two ports the attribute and the property are different facts and their disagreement is
 * the subject of arm 1.
 *
 * TWO PARTS RATHER THAN ONE STRING, because a concatenation puts the markup first and a "first
 * difference at char N" can then only ever point INSIDE the markup — a property divergence a hundred
 * thousand characters later is invisible until the markup one is fixed. That turns one run into two
 * on a file with five gated programs that can each carry the same defect independently.
 */
interface Snapshot {
    readonly markup: string;
    readonly props: string;
}

function snapshot(container: HTMLElement): Snapshot {
    const inputs = container.querySelectorAll('input');
    let props = '';
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i] as HTMLInputElement;
        props +=
            `input[${i}] .value=${JSON.stringify(input.value)}` +
            ` value-attr=${JSON.stringify(input.getAttribute('value'))}` +
            ` .checked=${String(input.checked)}` +
            ` checked-attr=${JSON.stringify(input.getAttribute('checked'))}\n`;
    }
    return { markup: markupOf(container), props };
}

/** Where two strings first part company, with enough either side to be readable. */
function firstDifference(want: string, got: string): string {
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    const from = Math.max(0, at - 120);
    return (
        `first difference at char ${at}\n` +
        `    exodra: …${want.slice(from, at + 200)}…\n` +
        `    theirs: …${got.slice(from, at + 200)}…`
    );
}

/**
 * COMPARE BOTH PARTS AND NAME EVERY ONE THAT DIFFERS, then throw once.
 *
 * It does not stop at the first failing part, for the reason the type above gives: a run that
 * reports one defect per invocation is a run the operator has to repeat once per defect, and this
 * suite's discipline is that a gate tells you everything it knows in the run that found it.
 */
function throwOnDiff(who: string, stage: string, want: Snapshot, got: Snapshot): void {
    const parts: string[] = [];
    if (want.markup !== got.markup)
        parts.push(`  MARKUP — ${firstDifference(want.markup, got.markup)}`);
    if (want.props !== got.props) {
        parts.push(
            '  PROPERTIES (.value/.checked and their attributes) — ' +
                firstDifference(want.props, got.props)
        );
    }
    if (parts.length === 0) return;
    refuse(
        `gate attr-floor/${who} @ ${stage}: DIFFERENT state in ${parts.length} of 2 parts\n` +
            parts.join('\n')
    );
    throw new Error(
        `attr-floor: "${who}" is in a different state from the reference @ ${stage} ` +
            `(${parts.length} of 2 parts differ) — the timings below would be comparing ` +
            'different programs. If the difference is a ` value=""` or ` checked=""` standing on one ' +
            'side and not the other, read the block over `CARD_MARKUP`: that is the HELD PLACEHOLDER, ' +
            'and the floor prototype has to carry exactly the ones the compiler keeps.'
    );
}

function gate(): void {
    const mounted = PROGRAMS.filter((p) => p.gated).map((p) => {
        const c = el();
        return { p, c, m: p.mount(c) };
    });
    const reference = mounted.find((m) => m.p.name === 'exodra');
    if (reference === undefined) throw new Error('attr-floor: no reference row');

    const check = (stage: string): void => {
        const want = snapshot(reference.c);
        for (const m of mounted) {
            if (m === reference) continue;
            throwOnDiff(m.p.name, stage, want, snapshot(m.c));
        }
    };

    check('as mounted');
    // STEPPED THROUGH A WHOLE CYCLE. An end-state check would pass a program that did nothing,
    // because step 3 returns every port to where step 3 of the previous cycle left it —
    // `update-floor`'s lesson, on three of its five transitions.
    for (let j = 0; j < CYCLE; j++) {
        for (const m of mounted) m.m.pass(j);
        check(`after pass ${j + 1}/${CYCLE} (cycle step ${j})`);
    }
    line(
        `gate attr-floor: ${mounted.length} programs identical as mounted and after all ${CYCLE} ` +
            `passes of a full cycle — markup, and the .value/.checked properties and value/checked ` +
            `attributes of all ${CARDS * 2} inputs`
    );
    line(
        'gate attr-floor: "driver" is EXCLUDED — it writes no attribute at all, so it cannot ' +
            'produce this state, and that is what the row is for'
    );

    for (const m of mounted) {
        m.m.dispose();
        m.c.remove();
    }
}

/**
 * EVERY PROTOTYPE IN THE RUN, PRINTED BEFORE THE GATE — `mount-floor`'s caveat D for this shape,
 * and ahead of the gate because on `keystroke-floor`'s first run the same report sat behind it and
 * never printed at all.
 *
 * ALL OF THEM, NOT ONE. Six programs stand on THREE prototypes: the floor's, the twin's
 * independently parsed copy, and the compiled prototype of each DISTINCT composition among the
 * `@exodra/dom` rows. `exodra` and `exodra·writers` name different backends and therefore key
 * different schemas, so both are compiled and both are printed — and if the value-writers pack
 * really does delegate by reference, they must come out byte-identical. THAT IS THE FIRST HALF OF
 * P2 AND IT IS VISIBLE BEFORE ANYTHING IS TIMED.
 *
 * IT IS REPORTED AND NOT ENFORCED. The thing that must be identical is the FINAL STATE, and the gate
 * proves that properly and throws. A prototype difference that never reaches the output is a fact
 * about two compilers, not a reason to refuse a run — but it is the FIRST thing to look at when the
 * gate does throw, which is the whole reason it prints first.
 */
function protoReport(): readonly string[] {
    // THE SAME TWO BACKEND OBJECTS THE TWO ROWS RENDER THROUGH, and it must stay that way: a schema
    // is cached per backend by POINTER, so asking here through a freshly composed backend would
    // print a schema no render in this file ever uses.
    const shipped = exoDomSchemaOf(CARD, SHIPPED_BACKEND).proto;
    const writers = exoDomSchemaOf(CARD, WRITERS_BACKEND).proto;
    const all: readonly { readonly name: string; readonly proto: Element; readonly by: string }[] =
        [
            { name: 'dom·shipped', proto: shipped, by: 'exodra  ← THE REFERENCE' },
            { name: 'dom·writers', proto: writers, by: 'exodra·writers' },
            { name: 'floor', proto: FLOOR_PROTO_1, by: 'driver, floor, floor+cell' },
            { name: 'floor·twin', proto: FLOOR_PROTO_2, by: 'floor·twin' },
        ];
    const want = shipped.outerHTML;
    const out: string[] = [];
    for (const p of all) {
        const html = p.proto.outerHTML;
        out.push(
            `  ${p.name.padEnd(13)}${String(p.proto.querySelectorAll('*').length + 1).padStart(
                3
            )}` +
                ` elements, ${String(html.length).padStart(4)} chars` +
                `${html === want ? '  identical to the reference' : '  ✖ DIFFERENT'}  — ${p.by}`
        );
    }
    for (const p of all) {
        const html = p.proto.outerHTML;
        if (html === want) continue;
        out.push(`  ${p.name} against the reference — ${firstDifference(want, html)}`);
    }
    out.push(`  the reference prototype, verbatim:  ${want}`);
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
// because this run reports DIFFERENCES and RATIOS where `abBench` prints medians and a ranking.
//
// A phase carries a SECOND divisor, `per`, as `keystroke-floor`'s does: an update region drives
// `WRITES_PER_REGION` attribute writes off ONE mounted page, so the region's length and the unit
// being reported are set by two different numbers.
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
    /** Units per scenario: `WRITES_PER_REGION` for an update phase, 1 for a mount. */
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
 *   noise  the MEDIAN of the per-round |a_r − b_r|. The two halves of a null are sampled in the same
 *          round, adjacent in the rotation, so this is the round-to-round scatter that ANY
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

// ---------------------------------------------------------------------------------------

export function benchmarkAttrFloor(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY. Four is right for a row that takes a fraction of a
    // microsecond and wrong for a quantity whose whole job is to be small.
    const f6 = (x: number): string => x.toFixed(6);
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const quantum = observeTimerQuantum();
    line(
        `attr-floor: observed timer quantum (${quantum.toFixed(
            3
        )} ms) — every timed region below ` +
            `must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its digits are ` +
            'quantisation, and the run says so by name'
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
    line('CENSUS — counted off the schema and the branch table, nothing measured');
    line(`  cards on the page            ${CARDS}`);
    line(
        `  elements in the finished DOM ${
            CARDS * 8
        }  (${CARDS} × [div, b, i, input, input, svg, g, use])`
    );
    line(
        `  attribute ports per card     ${PORTS_PER_CARD}  (one per element, so followed[i] = 0 for every one)`
    );
    line(`  attribute writes per pass    ${WRITES_PER_PASS}`);
    line(`  passes per timed region      ${PASSES}  (${PASSES / CYCLE} cycles of ${CYCLE})`);
    line(`  attribute writes per region  ${WRITES_PER_REGION}  at batch 1`);
    line('  THE SIX ARMS, one port each, as `exo-attr-setter` selects them:');
    line(
        '    1a  property + attribute   input.checked   node.checked = v; setAttribute/removeAttribute'
    );
    line('    1b  property only          input.value     node.value = v ?? null');
    line('    2a  class, HTML            b.class         node.className = String(v)');
    line(
        '    2b  class, SVG             g.class         node.setAttribute("class", …)  ← className is read-only there'
    );
    line(
        '    3   namespaced             use.xlink:href  node.setAttributeNS(XLink, "xlink:href", …)'
    );
    line('    4   ordinary, HTML         i.style         node.setAttribute("style", …)');
    line(
        '    4   ordinary, FOREIGN      svg.viewBox     node.setAttribute("viewBox", …)  ← the PARSER\'s spelling'
    );

    // ── THE UPDATE TABLE — THE HEADLINE ─────────────────────────────────────────────────
    const upReps = Math.max(1, batch);
    const upPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: upReps,
        per: WRITES_PER_REGION,
        what: p.what,
        prep: (): Scenario => {
            // THE MOUNT IS UNTIMED. This table measures writing, not building.
            const c = el();
            const m = p.mount(c);
            return {
                measure: () => {
                    for (let j = 0; j < PASSES; j++) m.pass(j);
                },
                cleanup: () => {
                    m.dispose();
                    c.remove();
                },
            };
        },
    }));

    const upSeries = runPhases(upPhases, rounds);
    const upStats = new Map<string, Stat>();
    for (const p of upPhases) upStats.set(p.name, stat(upSeries.get(p.name) as number[]));
    /** Nanoseconds per attribute write. */
    const upNs = (name: string): number => (upStats.get(name) as Stat).median * 1e6;

    line('');
    line(
        `UPDATE — one attribute write on a WARM element [ns per write] · interleaved · ` +
            `${rounds} rounds · batch ${batch} · ${WRITES_PER_REGION * upReps} writes per timed ` +
            'region · GC before every timed region · THIS IS THE HEADLINE TABLE'
    );
    line('                     reps   min       p25       median    p75       max');
    for (const p of upPhases) {
        const s = upStats.get(p.name) as Stat;
        const ns = (x: number): string => (x * 1e6).toFixed(2);
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(6)}   ${ns(s.min)}   ${ns(s.p25)}   ` +
                `${ns(s.median)}   ${ns(s.p75)}   ${ns(s.max)}`
        );
    }
    line('');
    for (const p of upPhases) line(`  ${p.name.padEnd(17)} ${p.what}`);
    // THE DRIVER'S SINKS, READ ONCE — the only read of them in the file, and it is what stops the
    // driver's seven stores from being eliminated as dead. It is printed rather than discarded
    // because a value that is computed and thrown away is exactly what an optimiser is allowed to
    // stop computing, and a driver row that measured an empty loop would deflate every ratio above.
    line(
        `  the driver's sinks last held ${JSON.stringify([
            SINK_A,
            SINK_B,
            SINK_C,
            SINK_D,
            SINK_E,
            SINK_F,
            SINK_G,
        ])} — read here so the stores cannot be eliminated`
    );
    line(
        '  EVERY WRITE ABOVE IS A REPEAT STORE AND A REPLACE — the element was written at mount ' +
            'and on every pass before this one. The one exception is arm 1a, whose attribute half ' +
            `alternates replace and REMOVE once per ${CYCLE}-step cycle, because a boolean has ` +
            'nowhere else to go.'
    );

    // ── THE MOUNT TABLE — THE OTHER HALF OF THE QUESTION ────────────────────────────────
    const mountReps = MOUNT_REPS * Math.max(1, batch);
    const mountPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: mountReps,
        per: 1,
        what: p.what,
        prep: (): Scenario => {
            const c = el();
            let m: Mounted | null = null;
            return {
                measure: () => {
                    m = p.mount(c);
                },
                cleanup: () => {
                    m?.dispose();
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
        `MOUNT — building the same ${CARDS}-card page and filling all ${WRITES_PER_PASS} ports ` +
            `ONCE [ms per mount] · interleaved · ${rounds} rounds · batch ${batch} · ${mountReps} ` +
            'mounts per timed region · GC before every timed region'
    );
    line('                     reps   min      p25      median   p75      max');
    for (const p of mountPhases) {
        const s = mountStats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(6)}   ${f4(s.min)}   ${f4(s.p25)}   ` +
                `${f4(s.median)}   ${f4(s.p75)}   ${f4(s.max)}`
        );
    }
    line(
        '  A DIFFERENT QUESTION FROM THE TABLE ABOVE, not a correction of it: here every property ' +
            'store is the FIRST store on a fresh clone and every attribute write in arms 2b, 3 and 4 ' +
            "GROWS the element's attribute list rather than replacing a value, because the compiler " +
            'took those placeholders back out. Arms 1a and 1b keep theirs — see the block over ' +
            '`CARD_MARKUP`.'
    );
    line(
        '  NO HIDDEN-CLASS TRANSITION IS BEING ISOLATED HERE and none needs to be: every store in ' +
            'every row lands on a real IDL accessor (className, value, checked) or goes through ' +
            'setAttribute, so nothing adds a property to an element. `child-mark` stores twice ' +
            'because ITS write is an expando; this file contains no `delete` anywhere.'
    );

    // ── THE RESOLUTION FLOOR, FROM A CONTROL WHOSE TRUE VALUE IS ZERO ───────────────────
    const upNull = pairedNull(
        upSeries.get('floor') as number[],
        upSeries.get('floor·twin') as number[]
    );
    const mountNull = pairedNull(
        mountSeries.get('floor') as number[],
        mountSeries.get('floor·twin') as number[]
    );
    /** In ns, to match the update table. */
    const upResolutionNs = upNull.resolution * 1e6;
    const mountResolution = mountNull.resolution;

    line('');
    line('THE CONTROL — what this run resolved, from a pair of duplicated declarations');
    line('  null          bias      noise     p75       worst     what it is');
    const nullRow = (name: string, n: Null, scale: number, what: string): void =>
        line(
            `  ${name.padEnd(12)}${f6(n.bias * scale)}  ${f6(n.noise * scale)}  ` +
                `${f6(n.noiseP75 * scale)}  ${f6(n.worst * scale)}  ${what}`
        );
    nullRow('update', upNull, 1e6, '|floor − its twin| per write, true Δ = 0 (ns)');
    nullRow('mount', mountNull, 1, '|floor − its twin| per mount, true Δ = 0 (ms)');
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. Bias alone can cancel at the median and read as a perfect instrument; noise ' +
            'cannot, and it is the scatter every comparison in these tables carries, null or not.'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(upResolutionNs)} ns per write and ${f6(
            mountResolution
        )} ms ` +
            'per mount. Read every figure below against these and not against zero; anything ' +
            'smaller is what this instrument returns when nothing is there.'
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    const driver = upNs('driver');
    const floor = upNs('floor');
    const cell = upNs('floor+cell');
    const exodra = upNs('exodra');
    const writers = upNs('exodra·writers');

    /** With the instrument's own cost taken off both sides — see the header on the common addend. */
    const net = (x: number): number => x - driver;
    const rawRatio = exodra / Math.max(floor, 1e-9);
    const netRatio = net(exodra) / Math.max(net(floor), 1e-9);
    const dispatchSide = cell - floor;
    const setterSide = exodra - cell;

    line('');
    line('ANSWER — and read the header before quoting any of it');
    line(
        `  THIS IS AN UPDATE ANSWER. One attribute write on a WARM element, averaged over the six ` +
            `arms in the census above (${PORTS_PER_CARD} ports per card, one per arm, ` +
            `${WRITES_PER_PASS} writes per pass). It is NOT a per-arm figure: this axis does not ` +
            'separate the six, and a table that did would need one phase per arm and a floor per arm.'
    );
    line(
        `  the floor is ${f4(floor)} ns per write; the instrument itself ("driver") is ` +
            `${f4(driver)} ns of that — ${pct(driver, floor)} of the floor and ` +
            `${pct(
                driver,
                exodra
            )} of @exodra/dom. It is a COMMON ADDEND: it is in every row, so ` +
            'it makes every raw ratio SMALLER than the truth.'
    );
    line(
        `  @exodra/dom is ${f4(exodra)} ns — ${rawRatio.toFixed(2)}× the floor raw, ` +
            `${netRatio.toFixed(2)}× with the driver subtracted from both sides.`
    );
    line(
        `  THE GAP SPLITS: the reactive dispatch (floor+cell − floor) is ${f4(
            dispatchSide
        )} ns and ` +
            `the setter indirection plus value-shape interpretation (exodra − floor+cell) is ` +
            `${f4(setterSide)} ns. Together ${f4(exodra - floor)} ns, ` +
            `${pct(Math.abs(exodra - floor), Math.max(exodra, 1e-9))} of a write.`
    );
    line(
        `  THE STRATEGY: exodra·writers is ${f4(writers)} ns per write ` +
            `(${(writers / Math.max(exodra, 1e-9)).toFixed(3)}× @exodra/dom) and ` +
            `${f4(mountMs('exodra·writers'))} ms per mount ` +
            `(${(mountMs('exodra·writers') / Math.max(mountMs('exodra'), 1e-9)).toFixed(3)}× ` +
            '@exodra/dom).'
    );
    if (Math.abs(writers - exodra) <= upResolutionNs) {
        line(
            '  NO COMPOSITION IN THIS REPOSITORY REDUCES THIS WORK, and that is the finding rather ' +
                'than a null result. `takesOverExoProperty` returns false on its FIRST line for ' +
                'every tag here — none of div/b/i/input/svg/g/use has a `-` — so the value-writers ' +
                'pack delegates all seven ports to EXO_SHIPPED_WRITERS by reference and compiles ' +
                'the same closures. What it ADDS is the one case the shipped pack cannot serve at ' +
                'all: a structured value into a custom element property, where setAttribute would ' +
                'stringify. It adds capability and removes no work. Quote it that way.'
        );
    } else {
        refuse(
            `attr-floor: "exodra·writers" measured ${f4(Math.abs(writers - exodra))} ns from ` +
                `"exodra", past the ${f6(upResolutionNs)} ns resolution floor — but ` +
                '`takesOverExoProperty` returns false for all seven ports here, so the pack should ' +
                'be delegating to EXO_SHIPPED_WRITERS BY REFERENCE and the two rows should compile ' +
                'the same closures. Either the delegation is not by reference, or composing a ' +
                'backend costs something on a render path. BOTH are findings about the `writers` field ' +
                'that this repository has asserted and never measured — start at the prototype ' +
                'report above, which says whether the two schemas even agree on bytes.'
        );
    }
    line(
        `  WHAT THE MOUNT TABLE ADDS: filling all ${WRITES_PER_PASS} ports for the FIRST time on a ` +
            `fresh clone costs ${f4(mountMs('floor') - mountMs('driver'))} ms for the floor and ` +
            `${f4(
                mountMs('exodra') - mountMs('driver')
            )} ms for @exodra/dom, over the same clone, ` +
            'walk and insertion (the "driver" row). Those two figures include the cells and the ' +
            'subscriptions on the renderer side and nothing of the kind on the floor side, so they ' +
            'are a BOUND on the mount cost of the writes and not a measurement of them.'
    );

    // ── THE FALSIFIERS, PRINTED MECHANICALLY SO NOBODY CHOOSES AFTERWARDS ───────────────
    line('');
    line('THE PREDICTION, JUDGED — committed in the header before the first run');
    const verdict = (id: string, failed: boolean, claim: string): void =>
        line(`  ${failed ? 'FAILED ' : 'held   '}${id}  ${claim}`);
    verdict(
        'P1',
        !(netRatio >= 1.5 && netRatio <= 3.5),
        `exodra/floor net between 1.5 and 3.5 — measured ${netRatio.toFixed(2)}×` +
            (netRatio < 1.15
                ? '  (falsifier (a): the write is Blink-bound and the bookkeeping is free)'
                : netRatio > 4.5
                ? '  (falsifier (b): most of an attribute fill is ours)'
                : '')
    );
    verdict(
        'P2',
        !(Math.abs(writers - exodra) <= upResolutionNs),
        `exodra·writers AT exodra, inside the ${f6(upResolutionNs)} ns floor — measured ` +
            `${f4(Math.abs(writers - exodra))} ns apart` +
            (Math.abs(writers - exodra) <= upResolutionNs
                ? ''
                : '  (falsifier (c): either the delegation is not by reference or composing a ' +
                  'backend costs something on a render path — both are findings about the `writers` field)')
    );
    const bigger = Math.max(Math.abs(dispatchSide), Math.abs(setterSide));
    const smaller = Math.min(Math.abs(dispatchSide), Math.abs(setterSide));
    verdict(
        'P3',
        !(bigger <= smaller * 3),
        `the two sides of the gap within 3× — measured ${f4(dispatchSide)} ns dispatch and ` +
            `${f4(setterSide)} ns setter (${(bigger / Math.max(smaller, 1e-9)).toFixed(2)}×)` +
            (bigger > smaller * 3
                ? `  (falsifier (d): the gap has ONE owner — ${
                      Math.abs(dispatchSide) > Math.abs(setterSide)
                          ? 'the reactive dispatch'
                          : 'the setter indirection'
                  } — and that is more useful than the prediction holding)`
                : '')
    );
    verdict(
        'P4',
        !(driver < floor / 3),
        `driver under a third of a floor write — measured ${pct(driver, floor)}` +
            (driver > floor * 0.5
                ? '  (falsifier (e): the loop is the measurement and every raw ratio on the ' +
                  'update table is mostly the instrument)'
                : '')
    );

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    //
    // Every one of them PRINTS rather than throws, deliberately, so one unreadable table does not
    // take a readable one down with it — the rule the whole floor family follows.

    // THE NESTING. Hazard D: each rung is the one before it PLUS work that is named.
    for (let i = 1; i < LADDER.length; i++) {
        const inner = LADDER[i - 1];
        const outer = LADDER[i];
        const a = upNs(inner);
        const b = upNs(outer);
        if (b >= a - upResolutionNs) continue;
        refuse(
            `attr-floor: the ladder does not nest — "${outer}" (${f4(
                b
            )} ns) measured CHEAPER than ` +
                `"${inner}" (${f4(a)} ns) by ${f4(a - b)} ns, past the resolution floor ` +
                `(${f6(upResolutionNs)} ns), though it does everything "${inner}" does and then ` +
                'more. That is not a saving, it is the instrument, and every subtraction in the ' +
                'ANSWER above is unreadable. Raise `rounds`, then the batch.'
        );
    }

    // THE NULL AGAINST THE CLAIM IT SUPPORTS. A null that is a large fraction of the smallest
    // difference the tables are asked to resolve means the run printed an ordering, not sizes.
    const smallestClaim = Math.min(Math.abs(dispatchSide), Math.abs(setterSide));
    if (upResolutionNs > smallestClaim * 0.25) {
        refuse(
            `attr-floor: the update null resolved ${f6(upResolutionNs)} ns where the smallest ` +
                `difference this table is asked for is ${f4(smallestClaim)} ns — this run cannot ` +
                'separate the reactive dispatch from the setter indirection, so the split in the ' +
                'ANSWER is an ordering and not a set of sizes. Raise `rounds`, or raise the batch.'
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
                `attr-floor: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    '`npm run axis --workspace=@exodra/benchmarks -- attr-floor ' +
                    `${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(upPhases, upStats, 'UPDATE');
    checkClock(mountPhases, mountStats, 'MOUNT');

    // AND THE THINGS NO NUMBER ON THIS PAGE COVERS, printed every run so they cannot be forgotten
    // between reading the table and quoting it.
    line('');
    line(
        'WHAT THIS RUN DID NOT MEASURE: style recalculation, layout and paint from any of these ' +
            'writes (charged to whatever runs next, which here is the next pass); an UNCHANGED ' +
            "value, which never reaches a setter at all because the source's `===` dedupe " +
            'returns first; the REMOVAL half of arms 3 and 4, since no cycle here ever sends null, ' +
            'undefined or false to them; two attribute ports on ONE element, which takes the other ' +
            'arm of the placeholder decision; a custom element, where the value-writers pack is the ' +
            'only thing that CAN reach the port; and `refuseExoIllegalAttrName`/`refuseExoDuplicateAttr`, which run at ' +
            'schema declaration and belong to `schema-build`.'
    );
    line(
        'AND ONE MORE: this is an AVERAGE over six arms, not a figure for any one of them. Arm 1a ' +
            'performs two DOM operations per fill and arm 1b performs one property store; a page ' +
            'whose ports are all of one kind would read differently from this table in a direction ' +
            'this run cannot state.'
    );
}
