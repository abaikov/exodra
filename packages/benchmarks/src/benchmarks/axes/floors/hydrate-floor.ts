// DIAGNOSTIC — IS "SERVE THE MARKUP, THEN HYDRATE" CHEAPER THAN "CLONE AND BUILD ON THE CLIENT",
// FOR THE SAME RENDERER DOING THE SAME JOB, ON A BIG LIST?
//
// Is rendering a string on the server and hydrating it faster, for a big list, than cloning a
// mountain of elements on the client? Nothing in this repository had measured it in isolation.
// What existed is `packages/benchmarks/ssr/`: Exodra against Solid and Qwik, production builds,
// Playwright with Fast-3G plus 4× CPU throttling, TTI defined as the first WORKING click. That
// answers "who wins a page load, against competitors, in wall-clock". It does not answer this,
// which is about ONE renderer doing ONE job two ways, with the network, the bundle, the compiler
// and the field all removed.
//
// It is registered as an axis only so it can reuse the runner that starts Vite, drives headless
// Chromium and forwards the browser's console. It compares no frameworks. It is written to the
// `mount-floor` / `update-floor` set: a phase per program, a resolution
// floor measured from a control whose true value is zero, every way it can mislead stated in this
// header and repeated in the answer, and a run that refuses its own numbers when they are
// unreadable.
//
// ── WHAT IS ALREADY MEASURED, AND WHY IT DECIDES THE SHAPE OF THIS FILE ─────────────────────
//
// `mount-floor`, on this machine, 100 rounds, batch 4, byte-identical DOM gated before timing,
// the 80-card app AS IT WAS THEN = 641 elements (A CITATION — that run is not this one, and
// nothing below reproduces it).
//
// AND THE TREE HAS SINCE GROWN, so read the citation as history rather than as this axis's tree.
// The card gained the `<span class="count">` that carries `tagsLabel(count)`, which took a card
// from five elements to six and this app from 641 elements to 721 — 12.5% more nodes to clone,
// to parse and to adopt. Every millisecond below was recorded on the 641-element tree. The
// ORDERING those rows establish is what is quoted here; the sizes are not, and re-running
// `mount-floor` is the only thing that replaces them:
//
//     clone+refs                        0.2288 ms   321 cloneNode + walk + fill + insert
//     template.innerHTML                0.2763 ms
//     innerHTML of a precomputed string 0.2763 ms   ONE parser crossing
//     DOMParser.parseFromString         0.2800 ms
//     insertAdjacentHTML                0.2825 ms
//     Range.createContextualFragment    0.2825 ms
//
// THE PARSE IS NOT THE CHEAP HALF. All five parser doors land together, spread 0.0075, and every
// one of them is DEARER than cloning the same 641 elements they were measured on — the cheapest
// by 21%. Nothing about the extra element per card favours one side of that: a parser and a
// `cloneNode` both pay per node, so the RATIO is the part of this citation that survives the tree
// having grown, and the ratio is what the argument below rests on. So whatever
// hydration wins here, it does not win by parsing being cheaper than cloning, and any argument
// that starts "but the browser's parser is fast" has already been measured and has already lost.
//
// ── THE TRAP, AND THE WHOLE REASON THIS AXIS IS INTERESTING ─────────────────────────────────
//
// IN A REAL PAGE THE PARSE IS NOT AN `innerHTML` CALL AFTER LOAD. It is the initial document
// parse: streamed, overlapping the network, finished before the framework's JavaScript has run at
// all. The identical CPU work sits in a completely different place on the clock, and a benchmark
// that puts it inside the timed region measures a cost a real page has already paid, while a
// benchmark that leaves it out measures a page that got its bytes for free.
//
// BOTH ARE HONEST QUESTIONS. THEY HAVE DIFFERENT ANSWERS. THIS FILE BUILDS ROWS FOR BOTH AND
// NEITHER MAY EVER BE QUOTED AS THE OTHER:
//
//   QUESTION 1 — CPU TOTAL.   `parse+hydrate` against `mount`, both fully inside the timed
//                             region. This is the one that says WHICH DOES LESS WORK. It is the
//                             right question for a worker, a second render into an existing
//                             page, a `renderToString`-and-swap, or any argument about battery
//                             and heat. It is the WRONG question for a cold page load.
//
//   QUESTION 2 — WHAT IS LEFT AFTER THE DOCUMENT IS ALREADY PARSED.   `hydrate` alone against
//                             `mount`. This models a real page load: the markup arrived and was
//                             parsed before the script ran, and what remains on the framework's
//                             clock is the adoption. IT CHARGES HYDRATION NOTHING FOR THE PARSE.
//                             That is REALISTIC rather than generous ONLY because a real browser
//                             genuinely did that parse off the framework's clock — and it is
//                             still not free, and it is still on the USER'S clock, and it is
//                             still 21% dearer than cloning would have been.
//
// AND ONE MORE THING QUESTION 2 IS NOT. This file's parse is `innerHTML` on a string that is
// already in memory. A real page's parse is a STREAMING parse fed by the network, interleaved
// with layout and with the script's own download and compile. `innerHTML` is the closest thing a
// benchmark can do and it is not the same thing: it cannot overlap anything, and it cannot be
// pre-empted. So `parse` here bounds the CPU of the parse and says nothing about where a real
// browser would have put it. `packages/benchmarks/ssr/` is where the wall-clock version of this
// question lives, and it is a different instrument for a different claim.
//
// ── WHAT EACH ROW IS CHARGED FOR, EXACTLY. Read this before any ratio. ──────────────────────
//
//   `mount`          `ExoDomBackend.render` from `@exodra/dom`, called once PER INSTANCE — the
//                    entry point mounts one. Compiles nothing (the schema is cached per declaration
//                    and backend for the process), then per instance: one `cloneNode(true)` of the
//                    prototype, the schema's walk to the ports, the fills, the insertions, and THE
//                    MACHINES' ARM — every state object, every seeding transition, every region and
//                    every listener. It builds every node it ends up owning.
//
//   `parse`          `container.innerHTML = SERVED`. The served bytes become nodes and NOTHING
//                    else happens: no wire runs, no listener is attached, no port is addressable,
//                    no subscription exists. The tree it leaves could never be updated. It is
//                    here to price ONE term directly instead of by subtraction, and it is not a
//                    floor for anything.
//
//   `hydrate`        `ExoDomBackend.hydrate` from `@exodra/dom`, over a container the UNTIMED prep
//                    already filled with the served bytes. IT ADOPTS ONE TOP-LEVEL INSTANCE, so
//                    only the `app` census has this row at all — see `refuseFlatHydrate`. Per
//                    instance: the walk over nodes it
//                    did not create, the attribute and text checks that decide whether the
//                    server's value already agrees, the region adoption, and THE SAME WIRE the
//                    mount runs — the same state objects, the same transitions, the same
//                    listeners. It creates no element. QUESTION 2.
//
//   `parse+hydrate`  both of the above, in one timed region, in that order. QUESTION 1.
//
//   `mount·twin` / `hydrate·twin`   THE NULLS. See the resolution block below.
//
// THE WIRE IS ON BOTH SIDES AND IN FULL, and that is the single most important thing about this
// comparison. Hydration does not skip the application's work; it skips the browser's. Every card
// allocates its state object and its four tag objects and runs its seeding transition, and every
// deck subscribes once to the shared source its date reads, on the hydrate path exactly as on the
// mount path. THAT LIST IS THE SAME ON BOTH SIDES, which is the only thing this header needs from
// it: per-card wiring is a term the two programs SHARE, so
// enlarging it moves both medians and pushes the ratio towards 1 without telling anybody anything
// about hydration — `packages/benchmarks/src/benchmarks/apps/exodra/exodra.tsx`
// runs the same wire against `TExoHydrateNode` as against `TExoDomNode`, and there is no
// second wire (READ FROM CODE: `TExoMachine`'s header, and `dom/src/one-wire.test.ts`, which is
// the assertion of exactly that). So the ONLY thing hydration deletes is the clone and the
// insertion, and the only thing it adds is the adopt walk.
//
// ── THE APP, AND THE THREE CENSUSES ─────────────────────────────────────────────────────────
//
// THE COMPONENTS ARE IMPORTED, NEVER RE-DECLARED. `APP` and `CARD` come from
// `apps/exodra/exodra.tsx`, re-exported by `participants/exodra/app.tsx` — the same values `mount-floor`, `mount-phases` and `component-split`
// measure — and `DETAILS` and `TAG` arrive through `CARD`'s own wire, which is where they belong.
// A re-declared copy would compile a second schema for an identical shape and every number here
// would be attributing a different program.
//
//   `app`       ONE instance of `APP`: `<div class="app">` and its FIXED list of 80 cards. 721
//               elements (1 shell + 80 × 6 + 40 details + 200 tags), 321 instances — the exact
//               tree `mount-floor` measures, so the numbers
//               below are directly quotable against its floor. Its hydration goes through the
//               NESTED path: one top-level row, then `adoptExoList` for the 80 cards, then a region
//               adopt per card for the details block and the tag list. THIS IS THE SHAPE A REAL
//               SERVER-RENDERED PAGE HAS.
//
//   `app·640`   ONE instance of the SAME shell over 640 cards — 5761 elements
//               (1 shell + 640 × 6 + 320 details + 1600 tags), 2561 instances, EXACTLY EIGHT
//               TIMES the row above in every count but the shell, because the app's spec is
//               periodic with period 4 (`startsOpen(i)` is `i % 2 === 0`, `startCount(i)` is
//               `(i % 4) + 1`), so every count scales linearly with the row count and nothing
//               about the SHAPE changes. It is built by the app's OWN factory, `exodraAppOf`,
//               which is what makes it the same component and not a re-declared one. This is the
//               "big list", and it goes through the same NESTED adoption path as `app`.
//
// THE TWO FLAT CENSUSES THIS AXIS USED TO CARRY ARE GONE, AND THE ARGUMENT IS KEPT BECAUSE IT IS
// WHY THEY WENT. `rows·80` and `rows·640` put N instances of `CARD` straight into the container,
// one wrapper element fewer, and against `app` they priced what the nesting costs. Two separate
// things killed them. The entry point that carried a top-level loop over sibling roots is gone —
// `ExoDomBackend.hydrate` adopts ONE instance and nothing exported walks siblings — so they could
// not be hydrated at all (`refuseFlatHydrate` states it and stays for the day an entry point
// exists). And `render` hands every instance `0` as its props where the deleted entry point
// counted, so they stopped describing N DIFFERENT cards and started describing N copies of card 0
// (`servedMarkupOf` states that one, and `gateCensus` refuses them by count before anything is
// timed). EVERY FLAT NUMBER THIS FILE EVER PUBLISHED PREDATES BOTH.
//
// WHAT WENT WITH THEM, named rather than quietly dropped: what ONE wrapper element and ONE level
// of nesting cost an adoption is no longer measured anywhere. The size sweep survived by moving
// onto the shell — `exodraAppOf` makes a bigger `APP` out of the app's own declaration, which is
// the thing an earlier version of this header said could not be done — so both ends of the sweep
// are now nested and comparable to each other, and the flat/nested COMPARISON has nothing standing
// in for it. That is caveat (A), and it is a missing entry point rather than a missing benchmark.
//
// ── THE GATE, AND WHY IT IS SHARPER HERE THAN ANYWHERE ELSE IN THIS SUITE ───────────────────
//
// Every axis here gates byte-identical markup before it times anything, because a comparison
// between two programs that build different trees is worthless. THIS AXIS NEEDS MORE THAN THAT,
// because the whole point of hydration is that the served bytes and the client-built tree are THE
// SAME THING, and because a hydration that silently adopted nothing would be extremely fast and
// completely wrong — and would produce a perfectly plausible ratio.
//
// So four things are proved, per census, before one number is timed, and each of them throws:
//
//   (1) THE SERVED BYTES ARE THE CLIENT'S TREE. `markupOf(container after innerHTML = SERVED)`
//       against `markupOf(container after mount)`, through the same shared `markupOf` the rest of
//       the suite gates with. The raw string is compared too and reported — if the server's bytes
//       and the browser's re-serialisation differ, that is a normalisation and worth knowing,
//       and it is not a failure.
//
//   (2) THE HYDRATED DOM IS THE SAME TREE AGAIN. `markupOf` after hydration against both of the
//       above. A hydration that repaired half the page into the right shape would pass this and
//       fail (3), which is why (3) exists.
//
//   (3) HYDRATION ADOPTED THE SERVED NODES — NODE IDENTITY, NOT MARKUP. Every element in the
//       container is captured in document order BEFORE the hydrate call and compared
//       element-by-element with the same list afterwards. Not a count, not a diff of bytes: the
//       SAME OBJECTS, in the same order. A hydrate that rebuilt the tree and happened to emit
//       identical bytes passes every string compare in this file and fails this one.
//
//   (4) A PORT IS LIVE. The first card's toggle is clicked — a real bubbling `MouseEvent`,
//       through `clickAll`'s route, the way a user's click arrives — and the details block it
//       controls must appear or disappear in THE SAME SERVED CARD ELEMENT captured in (3), then
//       come back on a second click with the markup byte-identical to the reference again. That
//       proves three things at once and nothing else in this file proves any of them: the
//       listener was attached, the region's anchors survived adoption, and the reconciler that
//       took the region over can still find it. WITHOUT (4) THIS AXIS WOULD BE A LIE — an
//       adoption that walked the tree, attached nothing and returned would be the fastest row in
//       the table.
//
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
//
// Two predictions are on the record here: the owner's, and mine, which agrees on both directions
// and disagrees on both sizes and adds a third claim he did not make. Everything below is
// JUDGEMENT plus the citations named in it. I MEASURED NONE OF IT — this file has never been run,
// never been type-checked and never been built at the moment it is being handed over.
//
//   HIS: hydration LOSES on CPU total — the parse is already 21% dearer, and hydration then walks
//   and verifies nodes it did not create where a client mount clones and inserts nodes it owns.
//   Hydration WINS question 2 — it skips the clone and the insert entirely.
//
//   MINE, ON DIRECTION: the same, both times, and for his mechanisms. There is nothing to
//   disagree with: the parse row is a measured 0.2763 against a measured 0.2288 for the whole
//   DOM-building half of a mount, so question 1 is lost before hydration has done anything at all.
//
//   MINE, ON SIZE — this is where I am betting something:
//
//     (i)   QUESTION 2 IS A SMALLER WIN THAN THE ARITHMETIC SUGGESTS. `hydrate / mount` lands
//           between 0.55 and 0.85 — a 15-45% win, and NOT the ~50% one. MECHANISM: this
//           repository's recorded mount split is clone 34.8%, traversal 6.1% + 2.1%, insertion
//           15.2%, wiring 43.9% (A CITATION, from the `measured-costs` record — not measured
//           here, and the table below replaces it). Hydration deletes the clone and the insertion,
//           which is ~50%, and that is where "hydration is twice as fast" would come from. But it
//           does not delete the traversal — it REPLACES it with a dearer one, and that is the
//           part the arithmetic drops. A `cloneNode(true)` of a card is ONE crossing into Blink
//           that copies TEN nodes in C++ — six elements and four Text nodes, up from eight since
//           the `.count` span and its label arrived; an adopt walk is retail JavaScript,
//           `firstElementChild` and
//           `nextElementSibling` and a value comparison per port, one crossing at a time. So the
//           term hydration adds is bigger than the term it saves on the walk, and the win is the
//           50% minus something I cannot size from a chair.
//
//     (ii)  QUESTION 1 LOSES BY MORE THAN THE PARSE'S OWN MARGIN. `parse+hydrate / mount` lands
//           between 1.4 and 2.2. MECHANISM: the parse alone is ~1.2× the DOM-building half of a
//           mount, and hydration then pays the whole wire AGAIN plus the adopt walk. If it comes
//           in under 1.3, then the adopt walk is nearly free and (i) is wrong in the same breath.
//
//     (iii) THE RANKING DOES NOT CHANGE BETWEEN 640 AND 5120 ELEMENTS, and both ratios move by
//           less than 15% relative. MECHANISM: this app scales by adding INSTANCES, not by making
//           instances deeper. Every term in both programs — clones, insertions, fills, wires,
//           walk hops, parsed tokens — is per-instance and periodic with period 4, so eight times
//           the rows is eight times each term and the ratio is scale-invariant by construction.
//           IF IT MOVES ANYWAY, THAT IS THE FINDING AND IT IS WORTH MORE THAN EITHER ENDPOINT,
//           because it means some term is NOT per-instance: the parser's throughput on a 5120-
//           element string is not eight times its throughput on a 640-element one, or the live
//           set at 3 repetitions of 5120 elements is doing something to the allocator that 20
//           repetitions of 640 does not. The run prints the per-element numbers for every row at
//           every size so that whichever term broke is visible instead of inferred.
//
//   THE THREE PREDICTIONS BEFORE THIS ONE IN THIS REPOSITORY ALL FAILED ON THEIR MECHANISMS WHILE
//   HOLDING ON THEIR RATIOS. So the falsifiers below are printed mechanically at the end of the
//   run, and (i) holding while (iii) fails would mean the win is real and my reason for its size
//   is not.
//
// ── THE RESOLUTION FLOOR, AND THE ONE WAY IT IS WEAKER THAN `mount-floor`'s ─────────────────
//
// `mount-floor`'s null is two INDEPENDENTLY DECLARED copies of the same hand-written program over
// two independently parsed prototype sets: different function objects, different inline caches,
// true difference zero by construction. That is the right shape and IT IS NOT AVAILABLE HERE.
// Every program in this file is a call into a published package — `ExoDomBackend.render`,
// `ExoDomBackend.hydrate` — and this file may not carry a second copy of a library's source.
//
// SO THE NULL IS THE STRONGEST FORM THAT REMAINS, AND ITS WEAKNESS IS STATED RATHER THAN HIDDEN:
// `mount·twin` and `hydrate·twin` are separately declared wrappers over the same entry point,
// each with its own container and — for the hydrate pair — its own independently produced copy of
// the served string, so no two phases share a string object. Their true difference is still zero
// by construction. What they DO share is everything V8 learned about the library function inside,
// which `mount-floor`'s null deliberately does not share.
//
//   THEREFORE THIS RUN'S RESOLUTION FLOOR IS A LOWER BOUND ON THE TRUE ONE. The instrument is at
//   least this noisy and may be noisier. Every attribution below is read against it, the run
//   refuses by name when a difference does not clear it, and a difference that only just clears
//   it should be read as unresolved anyway.
//
// It is reported as `mount-floor`'s newer form does — BIAS and PAIRED NOISE, at six decimals,
// because the first version of that axis printed `0.0000` at four decimals, which reads as "this
// instrument is perfect" and means "the two halves of the null cancelled at the median":
//
//     bias       |median(a) − median(b)|            — free to cancel
//     noise      median over rounds of |a_r − b_r|  — cannot cancel; p75 and worst printed too
//     resolution max(bias, noise)
//
// AND IT IS PRINTED AS A PERCENTAGE OF THE THING IT IS MEASURING, which is `update-floor`'s form:
// a floor of 0.004 ms means one thing beside a 0.25 ms mount and another beside a 2 ms one, and
// a run that prints only the absolute number makes the reader do that division wrong. THREE
// NULLS, ONE PER CENSUS, because a null is only a null for the shape and the duration it was
// taken on, and a 640-element program and a 5120-element program have no reason to scatter alike.
//
// ── WHAT COULD NOT BE MADE COMPARABLE, and what blocked each one ────────────────────────────
//
//  A. THE BIG CENSUS IS FLAT WHERE THE REALISTIC ONE IS NESTED. `APP` cannot be asked for more
//     than 80 cards without re-declaring it (see above), so the sweep runs on `CARD` rows. The
//     price is measured rather than argued: `app` and `rows·80` build the same 80 cards and
//     differ by one wrapper element and by the adoption path, and the run prints that difference
//     beside the sweep. What it means for the sweep is that `rows·640` tells you how the FLAT
//     path scales, and `app` tells you what the nested path costs at one size — and the two
//     cannot be multiplied together without an assumption this file does not make.
//
//  B. THE PARSE IS AN `innerHTML` CALL, NOT A STREAMING DOCUMENT PARSE. Stated at length above.
//     It bounds the CPU and says nothing about the clock.
//
//  C. `@exodra/dom` AND `@exodra/string` ARE RESOLVED TO THEIR BUILT `dist`, exactly as every
//     axis resolves them, and this file goes through the dev server's esbuild. Both are
//     unminified ESM with the same `define`, but that is one transpiler against another. Same
//     asymmetry `mount-floor` carries and states; it cannot be removed without publishing this
//     file as a package. `npm run build` at the repo root has to have run
//     or every row here is measuring last week's renderer.
//
//  D. THE SERVED MARKUP IS PRODUCED ONCE AT MODULE LOAD AND IS NEVER TIMED. It is not the
//     subject: this axis asks what the CLIENT pays given that the bytes exist, and a real server
//     produced them on a different machine, at a different time, possibly once for a million
//     users, possibly out of a cache. Charging the client's clock for it would be measuring a
//     configuration nobody ships. `@exodra/string`'s own cost is a separate question with its own
//     record (`ssr-render-perf`), and this file must never be quoted about it.
//
//  E. BLINK'S DEFERRED WORK. Style and layout invalidation from a mount or a parse is charged to
//     whatever runs next, which here is the next repetition or the next phase. Every row pays it,
//     no row's timed region contains all of its own, and the rows that finish sooner pay less of
//     it in absolute terms only because they finish sooner. Same hazard as `mount-phases`,
//     `mount-floor` and `import-node-trade`. IT IS WORSE FOR `parse+hydrate` THAN FOR ITS TWO
//     HALVES: that row's parse invalidates and its hydrate then runs inside the same region,
//     where the split rows put a GC and a phase boundary between them. If `parse+hydrate` comes
//     in materially under `parse` + `hydrate`, this is the first place to look and the run says so.
//
//  F. THE MOUNT ROWS INSERT INTO A LIVE CONTAINER ONCE, AT THE END, and so does the parse. Both
//     containers are attached to the document (`el()` from `todo-spec`), because mounting into a
//     detached node is not the same work. Neither program measures anchored insertion into a live
//     region and neither does the app.
//
//  G. THE SCHEMA CACHES ARE WARM FOR EVERY ROW. `exoDomSchemaOf` caches per (declaration, backend)
//     and `exoHydrateSchemaOf` does the same, so the first call of the run compiles and every call
//     after it does not — including the warm-up rounds, which run before anything is recorded. That
//     is fair (both sides pay it once, outside the measurement) and it is a real cost this axis
//     prices at zero, exactly as `mount-floor` prices its module-load parses at zero (its caveat
//     H). A page that navigated cold would pay both compiles, and the hydrate schema is derived
//     from the DOM schema's markup, so a hydrating page pays MORE of it, once.
//
//  H. NO MEMORY COLUMN. Hydration retains the same records and subscriptions a mount does and
//     additionally has a parsed string that can be dropped; a mount never had one. Comparing
//     those two is a different axis and no number here is one.
//
// ── WHAT THIS AXIS DOES NOT ANSWER. Read before quoting anything from it. ───────────────────
//
//  * IT SAYS NOTHING ABOUT PAGE LOAD, TTI, OR ANY WALL-CLOCK QUANTITY. Both halves of a real
//    decision — bytes over the wire, when the parse happens, when the script arrives — are
//    outside every timed region here. `packages/benchmarks/ssr/` is that instrument.
//  * IT SAYS NOTHING ABOUT UPDATES. Both programs end with the same live tree and the same
//    subscriptions; what happens afterwards is `update-floor`'s question.
//  * IT SAYS NOTHING ABOUT TEARDOWN. Both disposers run untimed.
//  * IT IS THIS APP'S SHAPE ONLY — cards averaging 8 elements each, four ports per card plus one
//    per tag. A component with more static markup per instance moves the answer towards
//    hydration (there is more to clone and no more to adopt per port); one with more ports per
//    element moves it the other way (there is more to verify and no more to clone). One shape,
//    one machine, one browser.
//  * IT IS NOT A FLOOR. `mount-floor` and `update-floor` bound their subjects with programs that
//    have no framework in them at all. There is no such program here: a hand-written adoption of
//    a hand-written string would bound "walking a tree" and would not bound HYDRATION, which is a
//    contract about what the server already computed. This axis compares two real paths through
//    one real renderer and that is all it does.
//
// ── HOW THIS FILE MEASURES ──────────────────────────────────────────────────────────────────
//
// The runner is `mount-floor`'s, which is `abBench`'s sampling
// with a repetition factor per phase and the series handed back: `prep()` runs `reps` times
// UNTIMED, then every `measure()` runs inside ONE timed region, then every `cleanup()` runs. GC
// sits after the preps and immediately before the region, so no region starts under a different
// pile of floating garbage than its neighbour. All eighteen phases are interleaved in ONE
// rotation that shifts every round, so no census gets a favourable stretch of machine.
//
// THE UNTIMED PREP IS WHERE THE WHOLE DESIGN LIVES. `hydrate`'s prep does `container.innerHTML =
// SERVED` for every repetition before the clock starts — that is question 2's "the document was
// already parsed", expressed as a place in the harness rather than as a subtraction. Every
// repetition's tree stays alive for the whole region, which is `mount-phases`' sink rule: a
// program that dropped each repetition's output would allocate into a nursery that recycles
// rather than into a growing live set and would read cheaper than the same work costs.
//
// THE REPETITION FACTOR IS PER CENSUS, so every timed region lands in the same few milliseconds
// whatever the tree size — 20 repetitions of a 640-element program and 3 of a 5120-element one.
// THE THIRD POSITIONAL IS THE BATCH AND IT MULTIPLIES ALL OF THEM, as `teardown-phases`' does, so
// when the clock check refuses a phase and names a factor, that factor is something the operator
// can type instead of editing this file.
//
//     npm run axis --workspace=@exodra/benchmarks -- hydrate-floor 100 2
//
// BATCH 2 IS THE ONE TO RUN. Batch 1 clears the clock comfortably (the smallest region is 20
// repetitions of a ~0.2 ms program — 4 ms, 40 ticks of the observed clock against a 3-tick
// floor), but the quantities this table has to resolve include `parse+hydrate` against
// `parse` + `hydrate`, which is a difference of differences, and the big census runs at 3
// repetitions where a single scheduling hiccup is a third of a sample. The run refuses by name
// when a region does not clear the clock and prints the batch to re-run at.
//
// IT IS 18 PHASES AND IT TAKES MINUTES. Cut `rounds` to 60 for a first look at the ordering; do
// not quote a size off a 60-round run, because every headline here is a RATIO of two medians and
// the control is a DIFFERENCE of two more.
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import type { TExoMachine } from '@exodra/core';
import type { TExoRegionWiring } from '../../apps/exodra/exodra-shared';
import { APP, CARD, exodraAppOf } from '../../participants/exodra/app';
import { markupOf } from '../../gates/markup-gate';
import { IDX, CARDS_PER_DECK, el, startCount, startsOpen } from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';

/**
 * THE TWO BACKENDS, BUILT ONCE AT MODULE LOAD — the client's and the server's.
 *
 * `EXO_BACKEND` serves BOTH the `mount` rows and the `hydrate` rows, and that is not a saving of
 * lines: a backend is the schema cache key, compared by POINTER, and `render` and `hydrate` being
 * methods on ONE object is what makes it unspellable for this axis to build its tree under one
 * composition and adopt it under another. Building either inside a scenario would put a schema
 * compile — markup parse included — inside a timed region.
 */
// IT COMPOSES `withExoHydration` BECAUSE THIS AXIS HYDRATES. A backend built without it has no
// `hydrate` at all — that is the whole point of hydration being a plugin, and it is what keeps the
// adopters out of a client-only bundle — so this axis has to name the capability it measures.
//
// THE PACK IS A DECORATOR, NOT A CONSTRUCTOR ARGUMENT, and that is a spelling change and nothing
// more: `withExoHydration` merges the adopting bodies ONTO the object it is handed and returns that
// same object, so this is the identical single backend the variadic constructor produced and the
// identical schema-cache key. No timed region moved.
const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

/** What both entry points accept, and the type `exodra.tsx` deliberately gives its four components
 *  so that one value can be served, rendered and hydrated with no cast. The demand is declared in
 *  `apps/exodra/exodra-shared.tsx` and names CALLS rather than a backend or a pack — `children`
 *  plus `portChildList`, which a reactive list is composed over and which `@exodra/string`'s exonode
 *  answers too (`packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:174`, read before relying on it). */
type TPortableComponent = TExoMachine<TExoRegionWiring>;

/** Nothing to dispose — `parse` leaves no subscription behind because it runs no wire. */
const NOTHING = (): void => undefined;

// ---------------------------------------------------------------------------------------
// THE CENSUS, derived from the app's own spec rather than written down, so it cannot drift from
// the app. `mount-floor` derives the same numbers the same way, and at 80 cards with a shell this
// must reproduce theirs exactly.
//
// WHAT THE THIRD LEVEL DID TO IT, and it moved BOTH counts where the app's earlier changes moved
// only one. A `<span class="count">` or a `<span class="user">` is STATIC MARKUP INSIDE THE CARD —
// one more element in a prepared prototype and not one more component to build, hydrate or adopt.
// A DECK IS A COMPONENT: ten more instances, each with a region of its own, and six more elements
// each. So the `app` census is now 861 elements and 331 instances against the flat `rows·80`'s 800
// and 320, and the distance between those two rows is what NESTING costs — which is the question
// this file exists to ask and which now has two levels in it.
// ---------------------------------------------------------------------------------------

interface CensusCounts {
    readonly cards: number;
    /** Decks above the cards — only a shell census has any; a flat one renders `CARD` directly. */
    readonly decks: number;
    readonly details: number;
    readonly tags: number;
    /** Instances the entry point ends up building: the shell if there is one, then the rest. */
    readonly instances: number;
    /** Elements in the finished tree: 7 per card, 6 per deck, 1 per details block, 1 per tag,
     *  +1 for a shell. */
    readonly elements: number;
}

/**
 * THE COUNTS, DERIVED — and the two per-element constants in it are the two things that have to be
 * re-read whenever either prototype changes.
 *
 * SEVEN PER CARD: the card div, the `<h3>`, `<span class="user">`, `.tog`, `.tags`, `.count`,
 * `.addtag`. This said SIX until the third level arrived, and it was already wrong by one: the
 * `<span class="user">` joined the card's prototype when the app gained its five users and this
 * count was not re-read. Every element figure this file printed between those two changes was
 * eighty short at `app` and six hundred and forty short at `app·640`. The INSTANCE figures were
 * right throughout, because a static element inside a prototype is not a component.
 *
 * SIX PER DECK: the deck div, the `<h2>`, `.author`, `.date`, `.ren`, `.cards`. A deck IS a
 * component, so unlike the `<span class="user">` it moves the instance count too.
 */
function countOf(cards: number, shell: boolean): CensusCounts {
    let details = 0;
    let tags = 0;
    for (let i = 0; i < cards; i++) {
        if (startsOpen(i)) details++;
        tags += startCount(i);
    }
    const base = shell ? 1 : 0;
    // ONLY A SHELL CENSUS HAS DECKS. The flat censuses render `CARD` at `0 … n-1` straight into
    // the container, with nothing above them — that is what makes the `app` row's distance from
    // `rows·80` the price of NESTING, and the nesting is now two levels deep and not one.
    const decks = shell ? cards / CARDS_PER_DECK : 0;
    return {
        cards,
        decks,
        details,
        tags,
        instances: base + decks + cards + details + tags,
        elements: base + decks * 6 + cards * 7 + details + tags,
    };
}

/**
 * ONE TREE SIZE, MEASURED SIX WAYS.
 *
 * `n` is what the entry point is ASKED for and `cards` is what comes out — they are the same
 * number for the flat censuses and 1 against 80 for `app`, whose single instance carries the
 * card list inside its own wire.
 */
interface Census {
    readonly name: string;
    readonly what: string;
    readonly component: TPortableComponent;
    /** Top-level instances the census asks for — `n` render calls, and see `refuseFlatHydrate`. */
    readonly n: number;
    /** Cards in the finished tree, at indices `0 … cards-1`. */
    readonly cards: number;
    /** Whether the tree carries the `<div class="app">` shell above the cards. */
    readonly shell: boolean;
    /**
     * Repetitions per timed region, before the batch multiplies it. Sized per census so every
     * region lands in the same few milliseconds whatever the tree — otherwise the big census
     * would spend a hundred rounds allocating 100k elements per sample for no extra resolution.
     */
    readonly reps: number;
    readonly counts: CensusCounts;
}

/** How many cards `APP` renders — read off its own list source, never hardcoded. */
const APP_CARDS = IDX.length;

/**
 * EIGHT TIMES `rows·80`, and the multiple is exact rather than approximate: the spec is periodic
 * with period 4 (`startsOpen` is `i % 2 === 0`, `startCount` is `(i % 4) + 1`), so a row count
 * divisible by 4 scales every count in the census linearly and changes nothing about the shape.
 * That is what makes "did the ranking change with size" a question about size and not about a
 * different app.
 */
const BIG_ROWS = 640;

/**
 * THE BIG SHELL — the SAME component as `APP`, over `BIG_ROWS` cards instead of `APP_CARDS`'s 80.
 *
 * IT IS BUILT BY THE APP'S OWN FACTORY (`exodraAppOf`, exported from `apps/exodra/exodra.tsx`) and
 * not declared here, which is the axis's standing rule: a benchmark file may not carry a second
 * copy of a participant's source. Built at module load — a component built inside a timed region
 * would compile its schema there, markup parse included.
 *
 * IT IS ASKED FOR IN DECKS AND NOT IN CARDS, since the app gained its third level: the factory's
 * parameter is deck indices, a deck holds `cardsOfDeck(d)` = `8d … 8d+7` for ANY `d`, and eight
 * times the app is therefore eighty decks. `BIG_DECKS × CARDS_PER_DECK === BIG_ROWS` is asserted in
 * this file's gate rather than trusted, because the two constants are what make "8× the rows" mean
 * 8× and not "8× the decks and some other number of cards".
 */
const BIG_DECKS = BIG_ROWS / CARDS_PER_DECK;
const BIG_APP = exodraAppOf(Array.from({ length: BIG_DECKS }, (_, d) => d));

const CENSUSES: readonly Census[] = [
    {
        name: 'app',
        what:
            `ONE instance of APP — the shell and its fixed list of ${APP_CARDS} cards. The tree ` +
            '`mount-floor` measured, and the NESTED adoption path a real server-rendered page has',
        component: APP,
        n: 1,
        cards: APP_CARDS,
        shell: true,
        reps: 20,
        counts: countOf(APP_CARDS, true),
    },
    {
        name: `app·${BIG_ROWS}`,
        what:
            `ONE instance of the SAME shell over ${BIG_ROWS} cards — exactly ` +
            `${BIG_ROWS / APP_CARDS}× the row above in every count, because the spec is periodic ` +
            'with period 4. THE BIG LIST, and the far end of the size sweep',
        component: BIG_APP,
        n: 1,
        cards: BIG_ROWS,
        shell: true,
        reps: 3,
        counts: countOf(BIG_ROWS, true),
    },
];

// ---------------------------------------------------------------------------------------
// THE SERVER'S BYTES — produced ONCE AT MODULE LOAD, through `ExoStrBackend.render`, which is the
// real server path and not a hand-written string.
//
// IT IS NEVER TIMED, and caveat (D) says why at length: a real server produced these bytes on a
// different machine at a different time, possibly once for a million users. This axis asks what
// the CLIENT pays given that they exist.
//
// TWO COPIES PER CENSUS. `served` is what every subject row parses and `servedTwin` is what the
// null's half parses — an independently produced string with identical content, so no two phases
// in the rotation hand the parser the same string object. Blink does not cache a parse by string
// identity as far as I know (JUDGEMENT, not measured), and the copy costs nothing at module load,
// so the null does not have to rest on my knowing that.
// ---------------------------------------------------------------------------------------

interface Prepared {
    readonly census: Census;
    readonly served: string;
    readonly servedTwin: string;
}

/**
 * `n` INSTANCES OF ONE COMPONENT, AS ONE STRING — a loop, because `ExoStrBackend.render` renders
 * ONE instance and there is no count argument any longer.
 *
 * WHAT THAT MOVED, STATED PLAINLY. The connector push/pop bracket used to be paid ONCE for the
 * whole call (its header says so by name: every instance of one component sits at the same depth
 * of that schema's connector stack) and is now paid per row. Nothing here is timed — these strings
 * are built at module load and the axis measures what the CLIENT does with them — so it moves no
 * number in this file. It moves one in `ssr-floor`, which prices that bracket on purpose.
 *
 * WHAT IT ALSO MOVED, AND THIS ONE IS NOT COSMETIC: every instance now receives `0` as its props
 * and its index, where the deleted entry point handed instance `i` the number `i`. `CARD`'s wire
 * READS that number — `data-i`, `titleOf(i)` (which the headline, and therefore the `<h3>`, is
 * built from), `startsOpen(i)` (which `aria-expanded` and the details region both follow) and
 * `startCount(i)` (which the tag list and the `.count` label both follow) — so the two FLAT
 * censuses (`rows·80`, `rows·640`) no longer describe 80 or 640 DIFFERENT cards; they describe
 * that many copies of card 0. Their declared census (`countOf`, which sums `startsOpen(i)` and
 * `startCount(i)` over `i`) therefore no longer matches the tree, and `gateCensus`'s first check
 * refuses them by name and by count before anything is timed. `app` is unaffected: its single
 * instance builds its cards through `c.list(P.cards, CARD, IDX)`, which hands each row its own
 * item as props, which is what an application does and what the count argument never was.
 */
function servedMarkupOf(census: Census): string {
    let html = '';
    for (let i = 0; i < census.n; i++) html += EXO_STR.render(census.component);
    return html;
}

const PREPARED: readonly Prepared[] = CENSUSES.map((census) => ({
    census,
    served: servedMarkupOf(census),
    servedTwin: servedMarkupOf(census),
}));

// ---------------------------------------------------------------------------------------
// THE PROGRAMS.
//
// THE TWO NULL WRAPPERS ARE SEPARATELY DECLARED FUNCTIONS and not a second call to the same one,
// which is `mount-floor`'s rule — but read the resolution block in the header before treating
// them as its equal: what they cannot separate is the library function they both call, and that
// makes this run's resolution floor a LOWER BOUND on the true one.
// ---------------------------------------------------------------------------------------

/**
 * `n` INSTANCES INTO ONE CONTAINER — a loop of `render` calls, which is what an application
 * writes now that `render` mounts exactly one instance and appends it.
 *
 * TWO THINGS MOVED HERE AND BOTH ARE ON THE `mount` ROWS ONLY. (1) The entry point's fixed setup
 * — one teardown scope, and an `exoContextAt` climb out of the container beside it until that walk
 * was removed — used to be paid once per call and is now paid per instance, so the flat censuses
 * carry `n` of each where they used to carry one. (2) Every instance receives `0` as its index, so the flat censuses build `n`
 * copies of card 0 rather than cards `0…n-1`; see `servedMarkupOf` for what that does to them.
 * A number recorded before this change is not comparable with one recorded after it.
 */
function mountRows(c: HTMLElement, p: Prepared): () => void {
    const offs: (() => void)[] = new Array<() => void>(p.census.n);
    for (let i = 0; i < p.census.n; i++) offs[i] = EXO_BACKEND.render(p.census.component, c);
    return () => {
        for (const off of offs) off();
    };
}

function mountRowsTwin(c: HTMLElement, p: Prepared): () => void {
    const offs: (() => void)[] = new Array<() => void>(p.census.n);
    for (let i = 0; i < p.census.n; i++) offs[i] = EXO_BACKEND.render(p.census.component, c);
    return () => {
        for (const off of offs) off();
    };
}

/**
 * ADOPT WHAT THE SERVER SENT.
 *
 * ═══ THE API GAP THIS AXIS RAN INTO, RECORDED HERE BECAUSE IT SHAPED THE CENSUSES ═══
 *
 * `ExoDomBackend.hydrate` ADOPTS `parent.firstElementChild` — ONE top-level instance. There is no
 * exported entry point that walks SIBLING ROOTS (`hydrateExoInstance` and `exoHydrateSchemaOf` are
 * internal to `@exodra/dom`), so a server that emits N sibling roots cannot be hydrated through
 * the public surface at all. Calling `hydrate` in a loop is not a slower measurement, it is a
 * wrong one: it would adopt the same element N times, wire one card N times, and leave N-1 cards
 * untouched while an identity check still passed on a tree that never moved.
 *
 * THAT IS WHY BOTH CENSUSES ARE NESTED. This axis used to carry a FLAT half — N instances of
 * `CARD` straight into the container, one wrapper element fewer — and the size sweep lived there.
 * The sweep is what the axis is for, so it moved onto the shell (`app` at 80 cards, `app·640` at
 * 640, one `exodraAppOf` declaration behind both), and the flat/nested COMPARISON is gone with
 * nothing standing in for it. WHAT IS NO LONGER MEASURED ANYWHERE: what one wrapper element and
 * one level of nesting cost an adoption. That is a missing entry point, not a missing benchmark.
 *
 * The guard below therefore never fires today, and it stays: it is what a flat census would meet
 * if one were added back before the entry point exists.
 */
function refuseFlatHydrate(p: Prepared): never {
    throw new Error(
        `hydrate-floor/${p.census.name}: this census serves ${p.census.n} sibling top-level ` +
            "instances, and `ExoDomBackend.hydrate` adopts exactly one (the container's first " +
            `ELEMENT child). Looping it would adopt that same element ${p.census.n} times and ` +
            `wire ${p.census.n - 1} cards not at all, so this axis refuses instead of publishing ` +
            'the number that would produce. The FLAT adoption path needs an entry point that ' +
            'walks sibling roots, and @exodra/dom exports none.'
    );
}

// The two wrappers stay SEPARATELY DECLARED — the rule the block above states — so the null keeps
// whatever separation it had. The refusal is one integer compare on a region of ~0.2 ms and it is
// the same compare in both.
function hydrateRows(c: HTMLElement, p: Prepared): () => void {
    if (p.census.n !== 1) refuseFlatHydrate(p);
    return EXO_BACKEND.hydrate(p.census.component, c);
}

function hydrateRowsTwin(c: HTMLElement, p: Prepared): () => void {
    if (p.census.n !== 1) refuseFlatHydrate(p);
    return EXO_BACKEND.hydrate(p.census.component, c);
}

/**
 * WHAT A ROW IS, and — because this is the distinction the whole axis turns on — WHERE ITS PARSE
 * SITS. `prep` is untimed and runs `reps` times before the clock starts; `run` is the timed
 * region. A row that parses in `prep` is answering question 2 and a row that parses in `run` is
 * answering question 1, and the difference between them is one line of this table.
 */
interface Program {
    readonly name: string;
    readonly what: string;
    /** Which family this row belongs to, for the nulls and for the answer sections. */
    readonly kind: 'mount' | 'hydrate' | 'parse' | 'both' | 'null';
    /** Exactly what the timed region is charged for. Printed once, before any number. */
    readonly charged: string;
    /**
     * WHERE THE PARSE SITS — the distinction the whole axis turns on, as a field rather than as
     * something the reporting infers from a function identity.
     *
     *   `none`    this row builds every node itself and never parses anything.
     *   `prep`    the served bytes were parsed before the clock started. QUESTION 2.
     *   `region`  the parse is inside the timed region. QUESTION 1.
     */
    readonly parseSits: 'none' | 'prep' | 'region';
    /**
     * The row this one is the null of, when it is one. It is a FIELD and not a name comparison
     * for `mount-floor`'s reason: a rung added or renamed later cannot be silently matched to the
     * wrong partner, and a null taken against the wrong row is not a null at all — it is a real
     * difference printed as the instrument's own scatter, which is the one error in this file
     * that would make every attribution under it look better resolved than it is.
     */
    readonly twinOf?: string;
    /** Untimed. Whatever must be in the container before the region opens. */
    readonly prep: (c: HTMLElement, p: Prepared) => void;
    /** Timed. Returns the disposer the scenario calls untimed. */
    readonly run: (c: HTMLElement, p: Prepared) => () => void;
}

const NO_PREP = (): void => undefined;

const PROGRAMS: readonly Program[] = [
    {
        name: 'mount',
        kind: 'mount',
        what: 'ExoDomBackend.render per instance — the client builds every node from the schema',
        charged:
            'one cloneNode(true) per instance, the schema walk, the fills, the insertions, and the ' +
            'whole arm (state objects, seeding transitions, regions, listeners)',
        parseSits: 'none',
        prep: NO_PREP,
        run: mountRows,
    },
    {
        name: 'mount·twin',
        kind: 'null',
        what: 'THE MOUNT NULL — a separately declared wrapper over the same call. True Δ = 0',
        charged: 'identical to `mount`, in its own container',
        parseSits: 'none',
        twinOf: 'mount',
        prep: NO_PREP,
        run: mountRowsTwin,
    },
    {
        name: 'parse',
        kind: 'parse',
        what:
            "container.innerHTML = the server's bytes — NOT a row anybody could ship: no wire " +
            'runs, no listener exists, no port is addressable, nothing it builds could be updated',
        charged: 'ONE crossing into the HTML parser, and nothing else at all',
        parseSits: 'region',
        prep: NO_PREP,
        run: (c, p) => {
            c.innerHTML = p.served;
            return NOTHING;
        },
    },
    {
        name: 'hydrate',
        kind: 'hydrate',
        what:
            'QUESTION 2 — ExoDomBackend.hydrate over a container the UNTIMED prep already parsed. ' +
            'This is the row that models a real page load, and it charges hydration NOTHING for ' +
            'the parse',
        charged:
            'the adopt walk over nodes it did not create, the checks that decide whether the ' +
            "server's value already agrees, the region adoptions, and the SAME whole wire `mount` runs",
        parseSits: 'prep',
        prep: (c, p) => {
            c.innerHTML = p.served;
        },
        run: hydrateRows,
    },
    {
        name: 'hydrate·twin',
        kind: 'null',
        what: 'THE HYDRATE NULL — a separately declared wrapper, its own string. True Δ = 0',
        charged: 'identical to `hydrate`, over an independently produced copy of the same bytes',
        parseSits: 'prep',
        twinOf: 'hydrate',
        prep: (c, p) => {
            c.innerHTML = p.servedTwin;
        },
        run: hydrateRowsTwin,
    },
    {
        name: 'parse+hydrate',
        kind: 'both',
        what:
            'QUESTION 1 — both, in ONE timed region. This is the row that says which does less ' +
            'CPU work in total, and it is the WRONG row for a cold page load',
        charged: 'everything `parse` is charged plus everything `hydrate` is charged',
        parseSits: 'region',
        prep: NO_PREP,
        run: (c, p) => {
            c.innerHTML = p.served;
            return hydrateRows(c, p);
        },
    },
];

/**
 * THE ROW OF A GIVEN KIND, resolved once and refused if the table stops carrying exactly one.
 *
 * Every headline below is computed through this rather than out of a string literal, so a row
 * renamed or duplicated in the table above cannot leave an answer section quietly reading the
 * wrong series — which is a failure that produces a perfectly plausible ratio.
 */
function rowOfKind(kind: Program['kind']): string {
    const found = PROGRAMS.filter((p) => p.kind === kind);
    if (found.length !== 1) {
        throw new Error(
            `hydrate-floor: the table carries ${found.length} rows of kind "${kind}" and the ` +
                'answer sections are written for exactly one'
        );
    }
    return found[0].name;
}

const ROW_MOUNT = rowOfKind('mount');
const ROW_PARSE = rowOfKind('parse');
const ROW_HYDRATE = rowOfKind('hydrate');
const ROW_BOTH = rowOfKind('both');

/** The nulls, paired off `twinOf` rather than off a name. See `Program.twinOf`. */
const NULL_PAIRS: readonly { readonly twin: string; readonly of: string }[] = PROGRAMS.filter(
    (p) => p.twinOf !== undefined
).map((p) => ({ twin: p.name, of: p.twinOf as string }));

// ---------------------------------------------------------------------------------------
// THE GATES. Four of them per census, all before anything is timed, all throwing. See the header:
// bytes, bytes again after hydration, NODE IDENTITY, and a live port.
// ---------------------------------------------------------------------------------------

/** How many comment nodes a container's markup carries — the region anchors, when there are any. */
function commentsIn(container: HTMLElement): number {
    const found = container.innerHTML.match(/<!--/g);
    return found === null ? 0 : found.length;
}

/** Every element in the container, in document order — the list node identity is checked over. */
function elementsIn(container: HTMLElement): readonly Element[] {
    return Array.from(container.querySelectorAll('*'));
}

function diffReport(who: string, want: string, got: string): string {
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    const from = Math.max(0, at - 80);
    const pad = Math.max(who.length, 'mount'.length);
    return (
        `first difference at char ${at}\n` +
        `  ${'mount'.padEnd(pad)}: …${want.slice(from, at + 160)}…\n` +
        `  ${who.padEnd(pad)}: …${got.slice(from, at + 160)}…`
    );
}

/**
 * THE ASSUMPTION EVERY CENSUS RESTS ON, CHECKED RATHER THAN COMMENTED.
 *
 * The flat censuses render `CARD` at indices `0 … n-1` and the `app` census renders `APP`, whose
 * wire lists `IDX`. Those two are the same cards only while `IDX` is exactly `0 … 79`. If it ever
 * stops being that, the `app` and `rows·80` rows would be two different trees and the line this
 * file prints about nesting would be comparing apples to a different app.
 */
function gateSpec(): void {
    for (let i = 0; i < IDX.length; i++) {
        if (IDX[i] === i) continue;
        throw new Error(
            `hydrate-floor: IDX[${i}] is ${IDX[i]}, not ${i} — the flat censuses render CARD at ` +
                '0…n-1 and the `app` census renders whatever IDX holds, so the two would no ' +
                'longer be the same cards and the nesting line would compare different trees'
        );
    }
    if (BIG_ROWS % 4 !== 0) {
        throw new Error(
            `hydrate-floor: the big census is ${BIG_ROWS} rows, which is not a multiple of 4 — ` +
                "the app's spec is periodic with period 4, so a row count that is not would make " +
                'the big census a different mix of card shapes and not a bigger version of the ' +
                'small one, and the size sweep would be varying two things at once'
        );
    }
    // AND THE BIG SHELL IS ASKED FOR IN DECKS, so the row count it produces is a CONSEQUENCE of
    // `BIG_DECKS` rather than the number written above. A `BIG_ROWS` that is not a whole number of
    // decks would silently render fewer or more cards than every count in this file claims.
    if (BIG_DECKS * CARDS_PER_DECK !== BIG_ROWS) {
        throw new Error(
            `hydrate-floor: ${BIG_ROWS} rows is not a whole number of ${CARDS_PER_DECK}-card ` +
                `decks — the big shell renders ${BIG_DECKS} decks, i.e. ` +
                `${BIG_DECKS * CARDS_PER_DECK} cards, and every count printed here would be ` +
                'about a tree the axis is not rendering'
        );
    }
    line(
        `gate hydrate-floor: IDX is 0…${IDX.length - 1} contiguous, the big census is ` +
            `${BIG_ROWS} rows = ${BIG_DECKS} decks = ${BIG_ROWS / APP_CARDS}× the small one and ` +
            "divisible by the spec's period of 4"
    );
}

/**
 * ONE CENSUS, PROVED BEFORE IT IS TIMED. It prints what it proved and it throws otherwise; it
 * hands nothing back, because a gate whose result a caller could choose to ignore is a comment.
 *
 * The order matters: bytes first, because a mismatch there makes everything after it meaningless;
 * then hydration; then identity, which is the check that catches a hydration that rebuilt the
 * tree; then liveness, which is the check that catches a hydration that did nothing.
 */
function gateCensus(p: Prepared): void {
    const c = p.census;

    // (0) THE REFERENCE — what a client mount builds.
    const refHost = el();
    const refDispose = mountRows(refHost, p);
    const want = markupOf(refHost);
    const wantN = refHost.querySelectorAll('*').length;
    const wantComments = commentsIn(refHost);
    refDispose();
    refHost.remove();

    if (wantN !== c.counts.elements) {
        throw new Error(
            `hydrate-floor/${c.name}: the client mount built ${wantN} elements where the census ` +
                `says ${c.counts.elements} (${c.shell ? '1 shell + ' : ''}${c.cards}×6 card + ` +
                `${c.counts.details} details + ${c.counts.tags} tags) — the census this axis ` +
                'normalises its per-element numbers by does not describe the tree it is measuring'
        );
    }

    // (1) THE SERVED BYTES ARE THE CLIENT'S TREE.
    const servedHost = el();
    servedHost.innerHTML = p.served;
    const servedMarkup = markupOf(servedHost);
    const servedN = servedHost.querySelectorAll('*').length;
    const servedComments = commentsIn(servedHost);
    servedHost.remove();
    if (servedMarkup !== want) {
        refuse(
            `hydrate-floor/${c.name}: the SERVER'S markup is not the client's tree — ` +
                `${wantN} elements (mount) / ${servedN} elements (served), ` +
                diffReport('served', want, servedMarkup)
        );
        throw new Error(
            `hydrate-floor/${c.name}: @exodra/string and @exodra/dom produce different trees for ` +
                `the same component (${wantN} vs ${servedN} elements) — there is nothing to ` +
                'hydrate here, and every ratio below would be comparing two different jobs'
        );
    }
    // REPORTED, NOT ENFORCED: the raw bytes against the browser's re-serialisation of them. A
    // difference is a normalisation (attribute quoting, entity spelling, a void element's slash)
    // and it is not a failure — what must match is the TREE, and (1) is what proves that.
    const rawIdentical = p.served === want;

    // (2) + (3) THE HYDRATED DOM, AND WHETHER IT IS THE SAME NODES.
    const liveHost = el();
    liveHost.innerHTML = p.served;
    const before = elementsIn(liveHost);
    const firstCardBefore = liveHost.querySelector('.card');
    const lastTagBefore = before[before.length - 1];
    const hydrateDispose = hydrateRows(liveHost, p);
    const after = elementsIn(liveHost);
    const hydratedMarkup = markupOf(liveHost);
    const hydratedComments = commentsIn(liveHost);

    if (hydratedMarkup !== want) {
        refuse(
            `hydrate-floor/${c.name}: the HYDRATED DOM is not the client's tree — ` +
                `${wantN} elements (mount) / ${after.length} elements (hydrated), ` +
                diffReport('hydrated', want, hydratedMarkup)
        );
        throw new Error(
            `hydrate-floor/${c.name}: hydration left a different tree from a client mount ` +
                `(${wantN} vs ${after.length} elements) — the two rows are not doing the same job`
        );
    }
    if (after.length !== before.length) {
        throw new Error(
            `hydrate-floor/${c.name}: hydration changed the element count from ${before.length} ` +
                `to ${after.length}. It is supposed to ADOPT what the server sent, not build ` +
                'anything, and a row that builds is not the row this axis is about'
        );
    }
    for (let i = 0; i < before.length; i++) {
        if (before[i] === after[i]) continue;
        throw new Error(
            `hydrate-floor/${c.name}: hydration REPLACED the element at document position ${i} ` +
                `(<${before[i].tagName.toLowerCase()}> → <${after[i].tagName.toLowerCase()}>). ` +
                'The markup still matches byte for byte, which is exactly why this check exists: ' +
                'a hydration that rebuilt the tree and emitted identical bytes would be timed as ' +
                'a hydration and would be a client mount with extra steps'
        );
    }
    if (firstCardBefore === null || liveHost.querySelector('.card') !== firstCardBefore) {
        throw new Error(
            `hydrate-floor/${c.name}: the first served .card is not the first .card after ` +
                'hydration — node identity, not markup, and adoption is what this axis measures'
        );
    }
    if (lastTagBefore !== after[after.length - 1]) {
        throw new Error(
            `hydrate-floor/${c.name}: the LAST served element is not the last element after ` +
                'hydration. The walk reached the end of the tree as some other node, which the ' +
                'byte compare above cannot see'
        );
    }

    // (4) A PORT IS LIVE. Without this the fastest row in the table could be a no-op.
    const toggle = liveHost.querySelector('.tog');
    if (toggle === null) {
        throw new Error(
            `hydrate-floor/${c.name}: no .tog button in the served markup — the liveness check ` +
                'has nothing to click, and an unchecked hydration is not a measurement'
        );
    }
    const detailsBefore = liveHost.querySelectorAll('.details').length;
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detailsAfter = liveHost.querySelectorAll('.details').length;
    if (detailsAfter === detailsBefore) {
        throw new Error(
            `hydrate-floor/${c.name}: clicking the first card's toggle after hydration changed ` +
                `nothing (${detailsBefore} .details before and after). Either the listener was ` +
                'never attached or the region was never adopted — either way hydration RAN and ' +
                'did not WORK, and a hydration that adopted nothing would be very fast and ' +
                'completely wrong'
        );
    }
    if (firstCardBefore.parentNode === null || !liveHost.contains(firstCardBefore)) {
        throw new Error(
            `hydrate-floor/${c.name}: the update after hydration replaced the served card ` +
                'element instead of changing it in place'
        );
    }
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const restored = markupOf(liveHost);
    if (restored !== want) {
        refuse(
            `hydrate-floor/${c.name}: the tree did not come back after the second click — ` +
                diffReport('restored', want, restored)
        );
        throw new Error(
            `hydrate-floor/${c.name}: toggling twice did not restore the reference tree. The ` +
                "region's anchors did not survive adoption, so what hydration produced is live " +
                'in one direction only'
        );
    }

    hydrateDispose();
    liveHost.remove();

    line(
        `gate hydrate-floor/${c.name}: server bytes ≡ client mount ≡ hydrated DOM — ${wantN} ` +
            `elements, ${want.length} chars, ${c.counts.instances} instances; hydration adopted ` +
            `all ${before.length} served elements BY IDENTITY and created none; a port is live ` +
            '(toggled and restored, byte-identical)'
    );
    line(
        `  bytes: served ${p.served.length} chars, ${
            rawIdentical
                ? 'byte-identical to the browser re-serialising its own mount'
                : `re-serialised to ${want.length} — a NORMALISATION, not a failure: the TREE is ` +
                  'gated above and matches'
        }`
    );
    line(
        `  comment anchors: ${servedComments} served · ${wantComments} after a client mount · ` +
            `${hydratedComments} after hydration. \`markupOf\` strips them on every side, so they ` +
            'are not in the gate — they are printed because a hydrated region that carries a ' +
            'different number of anchors from a rendered one is a real difference in what the ' +
            'two paths left behind, and nothing else in this run would show it'
    );
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — `mount-floor`'s, which is `teardown-phases`', which is `toggle`'s, where the same clamp made a whole axis print the timer
// thirteen times. Spin until the clock moves and keep the SMALLEST step it ever takes.
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
// THE RUNNER — `mount-floor`'s, unchanged in shape. This run reports DIFFERENCES and RATIOS where
// `abBench` prints medians and returns a ranking, and it needs the SERIES back rather than the
// medians, because a difference of medians is free to cancel and the paired scatter is not.
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
    const q = (pp: number): number => s[Math.min(s.length - 1, Math.floor(s.length * pp))];
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
 * `mount-floor`'s, including the reason it is two: bias is a difference of medians and is free to
 * cancel, and the paired round-to-round scatter is not.
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

export function benchmarkHydrateFloor(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY. Four is right for a row that takes a fifth of a
    // millisecond and wrong for a quantity whose whole job is to be small — `mount-floor`'s first
    // run printed its resolution floor as `0.0000`, which says nothing at all.
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    const pct = (x: number, of: number): string =>
        of === 0 ? '—' : `${((x / of) * 100).toFixed(1)}%`;
    const verdict = (ok: boolean): string => (ok ? 'HOLDS ' : 'FAILED');

    const quantum = observeTimerQuantum();
    line(
        `hydrate-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    gateSpec();
    for (const p of PREPARED) gateCensus(p);

    // ── THE CENSUS ──────────────────────────────────────────────────────────────────────
    line('');
    line("CENSUS — read off the app's spec and the served bytes, nothing measured");
    line(
        '  census        rows   cards   details   tags   instances   elements   served chars   reps'
    );
    for (const p of PREPARED) {
        const c = p.census;
        const k = c.counts;
        line(
            `  ${c.name.padEnd(12)}${String(c.n).padStart(5)}${String(k.cards).padStart(8)}` +
                `${String(k.details).padStart(10)}${String(k.tags).padStart(7)}` +
                `${String(k.instances).padStart(12)}${String(k.elements).padStart(11)}` +
                `${String(p.served.length).padStart(15)}${String(c.reps * batch).padStart(7)}`
        );
    }
    for (const p of PREPARED) line(`  ${p.census.name.padEnd(12)} ${p.census.what}`);
    line(
        '  THE SERVED BYTES WERE PRODUCED ONCE AT MODULE LOAD through ExoStrBackend.render, one ' +
            'call per instance — the real server path, not a hand-written string — and NO timed ' +
            'region below contains any part of producing them. Caveat (D) says why: a real ' +
            'server produced them on another machine, possibly once for a million users.'
    );

    // ── WHAT EACH ROW IS CHARGED FOR ────────────────────────────────────────────────────
    //
    // Printed ONCE, before any number, because every ratio below is only as meaningful as this
    // list is honest. The distinction the whole axis turns on is WHERE THE PARSE SITS: a row that
    // parses in the untimed prep is answering question 2, a row that parses inside the timed
    // region is answering question 1, and that is the only difference between `hydrate` and
    // `parse+hydrate`.
    line('');
    line('THE ROWS — what each timed region is charged for');
    for (const prog of PROGRAMS) {
        line(`  ${prog.name.padEnd(15)} ${prog.what}`);
        line(
            `  ${' '.repeat(15)} charged: ${prog.charged}; the parse ` +
                (prog.parseSits === 'prep'
                    ? 'is in the UNTIMED PREP — this row answers QUESTION 2'
                    : prog.parseSits === 'none'
                    ? 'does not exist — this row builds every node itself'
                    : 'is INSIDE the timed region')
        );
    }
    line(
        "  THE WIRE IS ON BOTH SIDES AND IN FULL. Hydration does not skip the application's " +
            "work, it skips the browser's: every card allocates the same state object and tag " +
            'objects and runs the same seeding transition on either path, because there is ' +
            'ONE wire and both connectors run it (READ FROM CODE: `TExoMachine`, and ' +
            '`dom/src/one-wire.test.ts`). What hydration deletes is the clone and the insertion; ' +
            'what it adds is the adopt walk. Everything else is common.'
    );

    // ── THE PHASES ──────────────────────────────────────────────────────────────────────
    const phases: Phase[] = [];
    for (const p of PREPARED) {
        for (const prog of PROGRAMS) {
            phases.push({
                name: `${p.census.name}/${prog.name}`,
                reps: p.census.reps * batch,
                prep: (): Scenario => {
                    const c = el();
                    prog.prep(c, p);
                    let dispose: () => void = NOTHING;
                    return {
                        measure: () => {
                            dispose = prog.run(c, p);
                        },
                        cleanup: () => {
                            dispose();
                            c.remove();
                        },
                    };
                },
            });
        }
    }

    const series = runPhases(phases, rounds);
    const seriesOf = (name: string): number[] => series.get(name) as number[];
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(seriesOf(p.name)));

    // ── THE TABLES, ONE PER CENSUS ──────────────────────────────────────────────────────
    interface Answer {
        readonly census: Census;
        readonly resolution: number;
        readonly mount: number;
        readonly parse: number;
        readonly hydrate: number;
        readonly both: number;
        /** QUESTION 1 — parse+hydrate against a client mount. */
        readonly q1: number;
        /** QUESTION 2 — hydrate alone against a client mount. */
        readonly q2: number;
    }

    const answers: Answer[] = [];

    for (const p of PREPARED) {
        const c = p.census;
        const m = (prog: string): number => (stats.get(`${c.name}/${prog}`) as Stat).median;

        line('');
        line(
            `${c.name.toUpperCase()} — ${c.counts.elements} elements, ${c.counts.instances} ` +
                `instances [ms per run] · interleaved with every other census · ${rounds} rounds ` +
                `· batch ${batch} · ${
                    c.reps * batch
                } runs per timed region · GC before every region`
        );
        line(
            '                       reps   min      p25      median   p75      max      ns/element'
        );
        for (const prog of PROGRAMS) {
            const s = stats.get(`${c.name}/${prog.name}`) as Stat;
            const perEl = (s.median * 1e6) / c.counts.elements;
            line(
                `  ${prog.name.padEnd(17)}${String(c.reps * batch).padStart(5)}   ${f(s.min)}   ` +
                    `${f(s.p25)}   ${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ${perEl
                        .toFixed(1)
                        .padStart(8)}`
            );
        }

        // ── THE CONTROL ─────────────────────────────────────────────────────────────────
        //
        // ONE NULL PER FAMILY, and each read against the LARGER, because a null is only a null
        // for the shape and the duration it was taken on: a program that builds 5120 elements and
        // a program that walks 5120 already-built ones spend their time in different places and
        // there is no reason their round-to-round scatter should match.
        const nulls = NULL_PAIRS.map((pair) => ({
            pair,
            n: pairedNull(seriesOf(`${c.name}/${pair.of}`), seriesOf(`${c.name}/${pair.twin}`)),
        }));
        const resolution = nulls.reduce((acc, x) => Math.max(acc, x.n.resolution), 0);

        const mount = m(ROW_MOUNT);
        const parse = m(ROW_PARSE);
        const hydrate = m(ROW_HYDRATE);
        const both = m(ROW_BOTH);

        line('');
        line(`  THE CONTROL — ${nulls.length} pairs whose true difference is zero by construction`);
        line('    null            bias      noise     p75       worst     what it is');
        for (const { pair, n } of nulls) {
            line(
                `    ${pair.of.padEnd(14)}${f6(n.bias)}  ${f6(n.noise)}  ${f6(n.noiseP75)}  ` +
                    `${f6(n.worst)}  |${pair.of} − ${pair.twin}|, true Δ = 0`
            );
        }
        line(
            `    RESOLUTION FLOOR ${f6(resolution)} ms = max(bias, noise) over both families, ` +
                `${pct(resolution, mount)} of a client mount and ${pct(
                    resolution,
                    hydrate
                )} of a ` +
                'hydration. Read every figure below against it and not against zero.'
        );
        line(
            '    AND IT IS A LOWER BOUND, not the resolution `mount-floor` reports. Both halves ' +
                'of each null here call the SAME library function, because this file may not ' +
                "carry a second copy of a package's source — so they share every inline cache " +
                'that function has, which a null of two independently declared programs does ' +
                'not. The instrument is at least this noisy and may be noisier; a difference ' +
                'that only just clears this floor should be read as unresolved.'
        );

        // ── THE PIECES ──────────────────────────────────────────────────────────────────
        //
        // Every one of these is a difference of two DIRECTLY MEASURED rows. Nothing here is a
        // subtraction chain, which is why `parse` is its own phase rather than an inference.
        const sum = parse + hydrate;
        const composition = both - sum;
        line('');
        line('  THE PIECES — each a difference of two directly measured rows');
        line(
            `    parse alone           ${f(parse)}   ${pct(parse, mount)} of a client mount — ` +
                `ONE crossing into the parser for ${c.counts.elements} elements, leaving a tree ` +
                'with no addressable node in it'
        );
        line(
            `    hydrate alone         ${f(hydrate)}   ${pct(hydrate, mount)} of a client mount ` +
                '— the adopt walk, the checks, and the same whole wire'
        );
        line(
            `    parse + hydrate       ${f(sum)}   the two halves added, as two separate regions ` +
                'with a GC and a phase boundary between them'
        );
        line(
            `    parse+hydrate measured ${f(both)}   ${sign(composition)} against that sum ` +
                `(${(Math.abs(composition) / resolution).toFixed(1)}× the floor). ` +
                (Math.abs(composition) <= resolution
                    ? 'They compose: putting both in one region costs what the two cost apart, ' +
                      'so neither half is subsidising the other.'
                    : composition < 0
                    ? 'THE COMBINED ROW IS CHEAPER THAN ITS OWN HALVES. Read caveat (E) before ' +
                      "anything else: the parse's deferred style and layout invalidation is " +
                      'charged to whatever runs next, and in the split rows that is a different ' +
                      'phase while in the combined row it is the hydrate inside the same region. ' +
                      'The combined row is the one to trust for question 1; the gap is what the ' +
                      'split costs, not a saving anybody could take.'
                    : 'THE COMBINED ROW IS DEARER THAN ITS OWN HALVES, which the deferred-work ' +
                      'story does not explain — the region holds a bigger live set and a longer ' +
                      'uninterrupted stretch of allocation, and that is the first place to look.')
        );

        // ── THE TWO ANSWERS, NEVER ONE ──────────────────────────────────────────────────
        const q1 = mount === 0 ? Infinity : both / mount;
        const q2 = mount === 0 ? Infinity : hydrate / mount;
        answers.push({
            census: c,
            resolution,
            mount,
            parse,
            hydrate,
            both,
            q1,
            q2,
        });

        line('');
        line(
            `  ANSWER 1 — CPU TOTAL: serve+hydrate is ${q1.toFixed(3)}× a client mount ` +
                `(${f(both)} against ${f(mount)}), i.e. ` +
                (q1 > 1
                    ? `${((q1 - 1) * 100).toFixed(1)}% MORE total CPU work`
                    : `${((1 - q1) * 100).toFixed(1)}% LESS total CPU work`) +
                `. Difference ${sign(both - mount)} ms = ` +
                `${(Math.abs(both - mount) / resolution).toFixed(1)}× this census's resolution ` +
                'floor. THIS ROW CHARGES HYDRATION FOR THE PARSE, inside the timed region, and ' +
                'it is the number that says which path does less work. IT IS NOT THE NUMBER FOR ' +
                'A PAGE LOAD.'
        );
        line(
            `  ANSWER 2 — WHAT IS LEFT AFTER THE DOCUMENT IS PARSED: hydration alone is ` +
                `${q2.toFixed(3)}× a client mount (${f(hydrate)} against ${f(mount)}), i.e. ` +
                (q2 < 1
                    ? `${((1 - q2) * 100).toFixed(1)}% LESS work on the framework's clock`
                    : `${((q2 - 1) * 100).toFixed(1)}% MORE work on the framework's clock`) +
                `. Difference ${sign(hydrate - mount)} ms = ` +
                `${(Math.abs(hydrate - mount) / resolution).toFixed(1)}× the floor. THIS ROW ` +
                `CHARGES HYDRATION NOTHING FOR THE PARSE — ${f(parse)} ms of real CPU, ` +
                `${pct(parse, mount)} of a mount, moved into the untimed prep. That is ` +
                'REALISTIC and not generous, because a real browser genuinely does that parse ' +
                "off the framework's clock, streamed and overlapping the network. It is still " +
                "on the USER'S clock. Caveat (B): an innerHTML call is the closest a benchmark " +
                'can get to a streaming document parse and it is not the same thing.'
        );
        if (q1 > 1 && q2 < 1) {
            line(
                '  THE TWO ANSWERS DISAGREE, WHICH IS THE WHOLE POINT OF THIS AXIS: hydration ' +
                    "does MORE total work and leaves LESS of it on the framework's clock. " +
                    'Whether that is a win depends entirely on where the parse sits for the page ' +
                    'in question, and neither number may ever be quoted as the other.'
            );
        } else if (q1 <= 1 && q2 < 1) {
            line(
                '  BOTH ANSWERS AGREE THAT HYDRATION WINS, including the one that charges it for ' +
                    'the parse. That contradicts the measured parser numbers this file quotes in ' +
                    'its header (every parser door landed ABOVE cloning on this app), so before ' +
                    'quoting it: check the gates above passed on identity, not only on bytes.'
            );
        } else {
            line(
                '  BOTH ANSWERS AGREE THAT THE CLIENT MOUNT WINS, including the one that hands ' +
                    'hydration its markup for free. Then adoption costs more than construction ' +
                    'for this shape, and the only remaining case for serving markup is the ' +
                    'wall-clock one that `packages/benchmarks/ssr/` measures.'
            );
        }
    }

    // ── THE NESTING LINE — what `app` and `rows·80` differ by, priced ────────────────────
    const appA = answers.find((a) => a.census.name === 'app');
    const flatA = answers.find((a) => a.census.name === `rows·${APP_CARDS}`);
    if (appA !== undefined && flatA !== undefined) {
        const res = Math.max(appA.resolution, flatA.resolution);
        line('');
        line(
            `NESTING — the same ${APP_CARDS} cards through two different adoption paths ` +
                '(caveat A). `app` is ONE top-level instance whose wire lists the cards, so ' +
                `hydration adopts one row and then runs \`adoptExoList\` for ${APP_CARDS}; ` +
                `\`rows·${APP_CARDS}\` is ${APP_CARDS} top-level instances, adopted by ` +
                'a top-level loop over sibling roots. One wrapper element apart, and nothing else.'
        );
        line(
            `  mount     ${f(appA.mount)} nested vs ${f(flatA.mount)} flat   ` +
                `${sign(appA.mount - flatA.mount)}   ` +
                `${(Math.abs(appA.mount - flatA.mount) / res).toFixed(1)}× the floor`
        );
        line(
            `  hydrate   ${f(appA.hydrate)} nested vs ${f(flatA.hydrate)} flat   ` +
                `${sign(appA.hydrate - flatA.hydrate)}   ` +
                `${(Math.abs(appA.hydrate - flatA.hydrate) / res).toFixed(1)}× the floor`
        );
        line(
            `  parse     ${f(appA.parse)} nested vs ${f(flatA.parse)} flat   ` +
                `${sign(appA.parse - flatA.parse)}   one more element to parse, and it bounds ` +
                'what the wrapper alone can be worth'
        );
        line(
            '  WHAT IT IS FOR: the sweep below runs on the FLAT form, because APP cannot be ' +
                'asked for more than 80 cards without re-declaring it. This line is how much of ' +
                "the flat form's answer transfers to the nested one AT ONE SIZE. It is not a " +
                'scaling law and must not be multiplied.'
        );
    }

    // ── THE SIZE SWEEP — the question that is worth more than either endpoint ────────────
    const small = answers.find((a) => a.census.name === `rows·${APP_CARDS}`);
    const big = answers.find((a) => a.census.name === `rows·${BIG_ROWS}`);
    let q1Moved = false;
    let q2Moved = false;
    let rankFlipped = false;
    if (small !== undefined && big !== undefined) {
        const scale = big.census.counts.elements / small.census.counts.elements;
        const q1Drift = small.q1 === 0 ? Infinity : (big.q1 - small.q1) / small.q1;
        const q2Drift = small.q2 === 0 ? Infinity : (big.q2 - small.q2) / small.q2;
        q1Moved = Math.abs(q1Drift) > 0.15;
        q2Moved = Math.abs(q2Drift) > 0.15;
        rankFlipped = big.q1 > 1 !== small.q1 > 1 || big.q2 > 1 !== small.q2 > 1;

        line('');
        line(
            `SIZE — does the ranking change on a BIG list? ${small.census.counts.elements} ` +
                `elements against ${big.census.counts.elements}, exactly ${scale}×, the same ` +
                'components, the same shape, only the row count varied.'
        );
        line('  row              small ms   big ms     big/small   small ns/el   big ns/el');
        const sweepRow = (name: string, a: number, b: number): void => {
            const sEl = (a * 1e6) / small.census.counts.elements;
            const bEl = (b * 1e6) / big.census.counts.elements;
            line(
                `  ${name.padEnd(15)}${f(a).padStart(9)}${f(b).padStart(11)}` +
                    `${(a === 0 ? Infinity : b / a).toFixed(2).padStart(12)}` +
                    `${sEl.toFixed(1).padStart(14)}${bEl.toFixed(1).padStart(12)}`
            );
        };
        sweepRow('mount', small.mount, big.mount);
        sweepRow('parse', small.parse, big.parse);
        sweepRow('hydrate', small.hydrate, big.hydrate);
        sweepRow('parse+hydrate', small.both, big.both);
        line(
            '  THE ns/element COLUMNS ARE THE POINT. This app scales by adding INSTANCES, not by ' +
                'making instances deeper, and every term in both programs is per-instance — so a ' +
                'row whose ns/element is flat across the two sizes is behaving the way the ' +
                'arithmetic says it must, and a row whose ns/element MOVES has a term that is ' +
                'not per-instance and that term is the finding.'
        );
        line(
            `  QUESTION 1 ratio   ${small.q1.toFixed(3)}× → ${big.q1.toFixed(3)}×   ` +
                `${(q1Drift * 100).toFixed(1)}% relative   ${q1Moved ? 'MOVED' : 'held'}`
        );
        line(
            `  QUESTION 2 ratio   ${small.q2.toFixed(3)}× → ${big.q2.toFixed(3)}×   ` +
                `${(q2Drift * 100).toFixed(1)}% relative   ${q2Moved ? 'MOVED' : 'held'}`
        );
        line(
            `  ${
                rankFlipped
                    ? 'THE RANKING FLIPPED WITH SIZE, AND THAT IS THE FINDING — it is worth more ' +
                      'than either endpoint. One of these two programs has a term that does not ' +
                      'scale with the row count. Read the ns/element columns first: if `parse` ' +
                      "moved, it is the parser's throughput on a long string; if `mount` or " +
                      "`hydrate` moved, it is the live set or the allocator at the census's own " +
                      `repetition factor, which is ${small.census.reps * batch} for the small ` +
                      `census and ${big.census.reps * batch} for the big one and is the one ` +
                      'thing about the two runs that is not identical.'
                    : q1Moved || q2Moved
                    ? 'THE RANKING HELD but at least one ratio moved by more than 15% relative, ' +
                      'so the SIZE of the answer is not scale-invariant even though its DIRECTION ' +
                      'is. Quote the ratio at the size you mean, never the other one.'
                    : 'THE RANKING HELD AND BOTH RATIOS HELD, inside 15% relative. On this app, ' +
                      'at these two sizes, the answer to both questions is the same answer ' +
                      'whatever the list length — which is what the arithmetic says must happen ' +
                      'when a tree grows by instances and every term is per-instance. It says ' +
                      'nothing about a tree that grows by getting DEEPER.'
            }`
        );
    }

    // ── THE PREDICTIONS' FALSIFIERS, PRINTED MECHANICALLY ───────────────────────────────
    line('');
    line(
        'THE PREDICTIONS, COMMITTED IN THE HEADER BEFORE THE FIRST RUN. The owner predicted ' +
            'hydration LOSES on CPU total and WINS question 2. I agreed on both directions and ' +
            'disagreed on both sizes, and added a third claim about scale. Everything was ' +
            'JUDGEMENT — nothing in it was measured by me. The falsifiers, evaluated mechanically ' +
            'so that nobody, including me, gets to choose afterwards:'
    );
    const headline = answers.find((a) => a.census.name === 'app') ?? answers[0];
    if (headline !== undefined) {
        line(
            `  DIRECTION (his, question 1): hydration loses on CPU total   ${verdict(
                headline.q1 > 1
            )}  ${headline.q1.toFixed(3)}× on \`app\` — if it failed, the parse is cheaper in ` +
                'context than the five measured parser doors said it was in isolation'
        );
        line(
            `  DIRECTION (his, question 2): hydration wins once parsed     ${verdict(
                headline.q2 < 1
            )}  ${headline.q2.toFixed(3)}× on \`app\` — if it failed, adopting a tree costs more ` +
                'than building one, and the case for serving markup at all is wall-clock only'
        );
        line(
            `  (i)  q2 outside 0.55-0.85                                   ${verdict(
                headline.q2 >= 0.55 && headline.q2 <= 0.85
            )}  ${headline.q2.toFixed(3)}× — I predicted the win is 15-45% and NOT the ~50% the ` +
                'recorded mount split (clone 34.8% + insertion 15.2%) would give, because ' +
                'hydration does not delete the traversal, it replaces it with a dearer one: a ' +
                'cloneNode is one crossing into Blink that copies eight nodes in C++, an adopt ' +
                'walk is retail JavaScript one property at a time. BELOW 0.55 means the adopt ' +
                'walk is nearly free and my mechanism is wrong in the direction that flatters ' +
                'hydration; ABOVE 0.80 means it is dearer than I thought and the win is thin.'
        );
        line(
            `  (ii) q1 outside 1.4-2.2                                     ${verdict(
                headline.q1 >= 1.4 && headline.q1 <= 2.2
            )}  ${headline.q1.toFixed(3)}× — the parse alone measured ${f(
                headline.parse
            )} ms against a ${f(headline.mount)} ms mount (${pct(
                headline.parse,
                headline.mount
            )}), and hydration then pays the whole wire again plus the walk. Under 1.3 and the ` +
                'adopt walk is nearly free, which would fail (i) in the same breath.'
        );
    }
    line(
        `  (iii) the ranking or a ratio moves with size                ${verdict(
            !rankFlipped && !q1Moved && !q2Moved
        )}  ${
            rankFlipped
                ? 'THE RANKING FLIPPED'
                : q1Moved || q2Moved
                ? 'a ratio moved by more than 15% relative'
                : 'both ratios held inside 15%'
        } — I predicted neither moves, because this app grows by INSTANCES and every term in ` +
            'both programs is per-instance and periodic with period 4, so eight times the rows ' +
            'is eight times each term and the ratio is scale-invariant by construction. IF IT ' +
            'FAILED THIS IS THE MOST IMPORTANT LINE IN THE RUN and the ns/element columns say ' +
            'which term broke.'
    );
    line(
        '  A prediction that HOLDS on the directions and FAILS on (i)/(ii)/(iii) was right for ' +
            'the wrong reason: the ratios are what they are, and the mechanisms named are not ' +
            'what produced them. The last three predictions in this repository did exactly that.'
    );

    // ── SELF-CHECKS: the ways this run could be lying about its own numbers ──────────────
    for (const a of answers) {
        const gap1 = Math.abs(a.both - a.mount);
        const gap2 = Math.abs(a.hydrate - a.mount);
        const smallest = Math.min(gap1, gap2);
        if (a.resolution > smallest * 0.25) {
            refuse(
                `hydrate-floor/${a.census.name}: the null moved by ${f6(a.resolution)} ms where ` +
                    `the smaller of the two answers is ${f(smallest)} ms — this run resolved a ` +
                    'quarter of its own subject or worse, so the ratios above are a range and ' +
                    'not a number. Raise `rounds`, or raise the batch. AND REMEMBER THE NULL ' +
                    'HERE IS A LOWER BOUND (both halves call the same library function), so the ' +
                    'true situation is at least this bad.'
            );
        }
        if (a.parse >= a.both) {
            refuse(
                `hydrate-floor/${a.census.name}: \`parse\` (${f(a.parse)} ms) measured at or ` +
                    `above \`parse+hydrate\` (${f(a.both)} ms), though the second does ` +
                    'everything the first does and then hydrates. That is not a hydration cost, ' +
                    'it is the instrument — or the deferred work of caveat (E) landing in a ' +
                    'different phase each time. Nothing in this census may be quoted.'
            );
        }
        if (a.hydrate >= a.both) {
            refuse(
                `hydrate-floor/${a.census.name}: \`hydrate\` (${f(a.hydrate)} ms) measured at or ` +
                    `above \`parse+hydrate\` (${f(a.both)} ms), though the second parses first ` +
                    'and then does exactly what the first does. Same reading as above.'
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
            `hydrate-floor: the "${p.name}" timed region is ${region.toFixed(3)} ms at ${p.reps} ` +
                `reps — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- hydrate-floor ${rounds} ` +
                `${wantBatch}\``
        );
    }
}
