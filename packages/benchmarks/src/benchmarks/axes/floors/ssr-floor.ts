// DIAGNOSTIC — WHAT IS THE FLOOR FOR A *SERVER* RENDER, AND WHAT SITS BETWEEN IT AND OURS?
//
// It answers ONE question about ONE renderer — `@exodra/string`, rendering 1000 rows of one
// component — and it compares no frameworks. It is registered as an axis only so it can reuse the
// runner that already starts Vite, drives headless Chromium and forwards the browser's console. It
// is written to the `mount-floor` / `update-floor` / `hydrate-floor` set: a program per rung, a
// resolution floor measured from a control whose true value is zero, byte-identical output gated
// before anything is timed, every way it can mislead stated in this header, and a run that refuses
// its own numbers when they are unreadable.
//
// ══ THE STATE OF THIS INSTRUMENT. READ IT BEFORE QUOTING ANY FIGURE THAT CAME OUT OF IT. ═══════
//
// `measurements/ssr-floor.published.json` is the only recorded run of this axis: quantum 0.100 ms,
// batch 1, 40 renders per timed region, so ONE CLOCK GRAIN IS 0.0025 ms PER RENDER and every
// median in it is a multiple of that. Against that run:
//
// (P0) IS TWO CLAUSES JOINED BY AN `i.e.` THAT WAS NEVER AN IDENTITY, AND ONE OF THEM FAILED:
//
//     P0a  `esc` − `floor` lands in 0.045-0.080 ms   HELD     0.1125 − 0.0575 = 0.0550 ms
//     P0b  escaping is 70-85% of `esc`               FAILED   0.0550 / 0.1125 = 48.9%
//
// ONLY P0a WAS EVER WIRED TO A FALSIFIER. The verdict tested `escapeCost >= 0.045 && <= 0.08` and
// nothing else, so on those medians it evaluates to HELD — the console log of that run was not
// kept, so this is the falsifier read against the recorded rows and not a transcript — while the
// share this file and `packages/benchmarks/README.md` both quote, 82%, did not reproduce and was
// never tested.
//
// AND THE RULE ATTACHED TO P0 — that NOTHING ELSE IN THE TABLE MAY BE READ until a failure is
// explained — WAS NEVER A REFUSAL AT ALL. The refusals at the end of this file cover the gap, the
// control, the resolution floor, a negative rung, the ladder sum and the clock. P0 had prose and a
// tick. BOTH CLAUSES ARE JUDGED SEPARATELY NOW, before the table rather than after it, and P0b
// refuses by name.
//
// WHY P0b FAILED, AND IT IS THIS FILE'S DESIGN AND NOT THE RENDERER. The absolute cost of escaping
// REPRODUCED — 0.0550 ms here against the probe's 0.063, 13% apart across two harnesses. What did
// not reproduce is the DENOMINATOR. This axis charges every `+=` row a FLATTEN that the probe did
// not charge, and the flatten is not small: `esc` − `esc·noflat` = 0.1125 − 0.0875 = 0.0250 ms,
// 22.2% of the floor. `esc·noflat` is the SAME FUNCTION as `esc` with only the tail read removed
// (both rows run `floorEsc`), and it lands at 0.0875 — within 14% of the probe's 0.077. The probe
// measured the unflattened program; this axis measures the flattened one.
//
// SO A SHARE OF 82% IS UNREACHABLE HERE BY CONSTRUCTION AND NO RE-RUN WILL PRODUCE IT. Escaping
// cannot be 82% of a floor that carries a 0.0250 ms flatten unless everything else is free. 82% is
// a statement about a program that hands back a rope, and this file's own argument is that a rope
// cannot be written to a socket. ONE OF THE TWO HAS TO GO: either the quoted share is re-stated as
// a fact about the UNFLATTENED concatenation — which by this file's definition is not a server
// floor — or it is corrected to what a server floor actually costs. That correction is owed by
// `packages/benchmarks/README.md`, which this file cannot edit.
//
// WHAT IS STILL UNEXPLAINED, AND IT IS NOT NOTHING. The flatten explains the `esc` end of the
// ratio. It does not explain the `floor` end, because NO ROW IN THIS TABLE MEASURES AN UNFLATTENED
// `floor`. Reading `floor` − 0.0250 as 0.0325 ms against the probe's 0.015 would be a subtraction
// never measured on both sides — exactly what the ladder rule below forbids. `floor·noflat` IS THE
// MISSING ROW, and it is the first entry in the re-run list at the end of this block.
//
// THE DATA CANDIDATE IS DEAD, and it can be killed from this file rather than guessed at. Every
// clean-census value is escape-free by construction — `String(i)`, `'/i/' + i`, `'Task ' + i` and
// the eight ASCII names in `AUTHORS` contain none of `& " < > U+00A0`, so ALL 4000 escaper calls
// take the `test`-and-return fast path and allocate nothing. The probe's data cannot have differed
// in that respect either: `esc·dirty` (0.8550) is 7.6× `esc`, so a probe on data that needed
// escaping would have reported a floor in the hundreds of nanoseconds per row, not 0.077 ms total.
// The probe and this axis escape the SAME KIND of data. The disagreement is entirely on the
// non-escaping side of the subtraction.
//
// TWO MORE PREDICTIONS ANCHORED TO THE SAME OWNER'S PROBES ALSO FAILED, which is what makes this a
// pattern and not three accidents:
//
//     (P5) join loses by 40-80% of the floor      FAILED   +0.0125 ms, +11.1%   (probe: +53%)
//     (P8) the reactive step is 0.030-0.055 ms    FAILED   0.0175 ms            (probe: 0.043)
//
// P5 IS THE FLATTEN AGAIN, AND THE ARITHMETIC CLOSES. The `Array.join` section below claims the
// flatten is "now charged to BOTH sides". IT IS NOT: `join` returns a string that is ALREADY FLAT,
// so `out.slice(-6)` costs it nothing while it costs `esc` 0.0250 ms. Take that one-sided term off
// the probe's penalty and 0.041 − 0.025 = 0.016 ms falls a grain and a half from the 0.0125 this
// run measured. P5's band was inherited from a probe this axis's own design had already
// invalidated. P8 has no such explanation from reading and is open.
//
// (P6) FAILED, AND THAT ONE IS ABOUT THE RENDERER RATHER THAN THE HARNESS. The attribute head was
// predicted under 0.015 ms and measured 0.0250 ms (`+head` 0.1525 − `+vals` 0.1275) — the joint
// second-largest rung on the ladder, level with `+set` and behind only `+fill` at 0.0275.
//
// (P1) CANNOT FAIL AND IS NOT A TEST. `ladderSum` is a sum of CONSECUTIVE DIFFERENCES over
// `LADDER`, so it telescopes to `median(last) − median(first)` — which is the `gap` it is compared
// against, identically, for any data whatsoever. The published run's "100.0%" is that identity, not
// a ladder that closed. The verdict says so now instead of printing a green tick, and the matching
// refusal below can never fire.
//
// (P7) THE CONTROL SEPARATED BY FIVE GRAINS: `exodra·flat` 0.2275 − `+call` 0.2150 = 0.0125 ms,
// where the control note says one schema lookup — ONCE PER RENDER, not per row — is all that stands
// between them. WHETHER THAT CLEARS THE RESOLUTION FLOOR CANNOT BE READ OFF THE ARTEFACT:
// `scripts/run-one-axis.js` records only the printed TABLE rows and the quantum, so both nulls and
// the resolution floor computed from them are printed and then discarded. Both null PAIRS have a
// bias of exactly zero (`esc` = `esc·twin` = 0.1125, `exodra·flat` = `exodra·twin` = 0.2275), and
// bias is only half of what `pairedNull` returns. Until a run keeps its null block, P3 and P7
// cannot be judged after the fact and the control's doubt stands over every rung under it.
//
// TWO RUNGS CAME BACK NEGATIVE — `+wire` − `+set` = −0.0050 (two grains) and `+call` − `+stack` =
// −0.0025 (one grain) — AND THE BLANKET ANSWER PRINTED UNDER THE LADDER IS FALSE FOR THE FIRST OF
// THEM. `+set` reads its ports as `PORTS[k]`: five array-index loads. The wire reads them as
// `P.id`, `P.href`, … : five monomorphic property loads on an object closed over when the component
// was declared. `+wire` therefore REMOVES five array loads while adding one call, so it is not a
// strict superset of `+set` in machine terms and a small negative there has a readable mechanism.
// That is read from the code, not measured, and the re-run list can settle it.
//
// WHAT MAY BE QUOTED FROM THE PUBLISHED RUN:
//   * THE LADDER'S ORDERING, and the rungs of four grains or more as sizes: `+fill` 0.0275,
//     `+head` 0.0250, `+set` 0.0250, `+vals` 0.0125, `+stack` 0.0100.
//   * THE END-TO-END RATIOS ON FLATTENED OUTPUT — 2.02× stateless, 2.18× reactive, 1.14× dirty.
//   * THE FLATTEN, 0.0250 ms. It is the cleanest number in the table: two rows running ONE
//     FUNCTION, differing only in whether the result is read.
// WHAT MAY NOT:
//   * "ESCAPING IS 82% OF THE FLOOR." This axis says 48.9%, and the two are about two different
//     programs.
//   * ANY RUNG UNDER THREE GRAINS AS A SIZE — `+cut`, `+wr`, `+reset`, `+try`, `+frame` and both
//     negative rungs. An ordering at best.
//   * ANYTHING RESTING ON THE CONTROL BEING CLEAN, until a run keeps its null block.
//   * `+reset`, `+frame`, `+try` AND `+stack` AS FIGURES ABOUT THE PROGRAM THIS FILE RUNS TODAY.
//     All four are gone from the ladder — three struck, one re-founded as `+new` — because every
//     one of them priced work around a REUSED connector and nothing is pooled any more. The
//     sentences above that name them are kept as a record of what the published run contained;
//     they are history, and the block under the ladder list says where each one went.
//
// AND THE PUBLISHED RUN HAS NO NULL BLOCK IN IT, WHICH IS NOT THE SAME AS THE RECORDER NOT
// KEEPING ONE ANY MORE. `scripts/run-one-axis.js` now scrapes the block (`NULL_HEAD`, `NULL_ROW`,
// `NULL_RESOLUTION`) into a top-level `nulls` key and warns by name when an axis that prints one
// records without it. `measurements/ssr-floor.published.json` PREDATES that change: its keys are
// `axis`, `label`, `quantum`, `batch`, `rows` and nothing else, where
// `measurements/teardown-floor.published.json`, recorded after it, carries `nulls` with a
// resolution of 0.001250 ms. SO NOT ONE RUNG OF THE PUBLISHED LADDER CAN BE JUDGED AGAINST A
// RESOLUTION FLOOR TODAY, and the only fix is a re-run WITH `--record`. Nothing in this file can
// recover it: the medians are on disk, the per-round series are not, and `pairedNull`'s noise term
// is a median of per-round `|a−b|` that a table of medians cannot reconstruct. What CAN be read
// off the published artefact is the BIAS half — `esc` and `esc·twin` are both 0.1125 and
// `exodra·flat` and `exodra·twin` are both 0.2275, so both biases are exactly zero — and the file
// already says that bias alone reads as perfection.
//
// SO THERE IS A SECOND FLOOR NOW, AND IT SURVIVES RECORDING: THE GRAIN. A timed region is `reps`
// renders read off one clock, so every median in this table is a multiple of `quantum / reps` —
// 0.0025 ms on the published run — and TWO MEDIANS CANNOT DIFFER BY LESS THAN ONE GRAIN WITHOUT
// BEING EQUAL. A one-grain rung is one sample's tick landing on the other side of a boundary; it
// is not a size, whatever the null says, and unlike the null it can be recomputed by anyone
// holding the JSON, because `quantum` and `batch` are both in it. The run prints it beside the
// resolution floor and counts every rung in grains, and the ladder's `resolved?` column now has to
// clear BOTH bars. On the published run's grain that alone disqualifies six of the thirteen rungs
// as sizes — `+cut`, `+head`→`+wr`, `+fill`→`+reset`, `+frame`→`+try` and both negatives.
//
// WHAT WOULD SETTLE IT — the re-run, row by row. All of it at batch 1, which keeps every region
// above the clock floor, and at rounds 400 rather than 100, because the quantities in dispute are
// one to five grains and a median cannot resolve what it never sampled. `--record` IS NOT
// OPTIONAL: without it the null block is printed and thrown away again, which is the whole reason
// six of the ten predictions below are unjudgeable from disk today:
//
//     npm run axis --workspace=@exodra/benchmarks -- ssr-floor 400 1 --record=noflat
//
// ITEMS 1, 2, 4, 5 AND 6 OF THE OLD LIST ARE NOW BUILT AND ARE JUDGED BY (P10)-(P15). Five rows
// were added, four of which are ZERO new program code — the same function object measured with
// `flatten: false`, which is what makes them a clean subtraction rather than two programs:
//
//   1. `floor·noflat` — `floorRaw`, unflattened. THE ONE ROW THAT SETTLES P0, and it settles it
//      either way: near 0.015 the probe reproduced and the flatten was the whole disagreement,
//      near 0.0325 there is a second term and the probe is not reproducible here at all. (P11).
//   2. `exodra·noflat` — the entry point over N rows, unflattened. THE CHEAPEST ROW ON THIS AXIS AND
//      THE ONE THAT WAS MISSING: every share this file publishes has a flattened floor as its
//      denominator, and until now nothing said whether the RENDERER pays the same flatten. It
//      does not have to: `render-rows.ts` returns the accumulator without reading it, so its
//      result is a rope exactly as the floor's is, but a BUSHIER one. (P10c), (P13).
//   3. `esc·join·noflat` — `floorEscJoin`, unflattened. Proves the one-sided flatten that is
//      currently (P5)'s only explanation, measured rather than argued. (P10b).
//   4. `+head·noflat` — `ladderHead`, unflattened. The rung that failed (P6) by 10 ns/row, with
//      the flatten taken off it, because the head move changes the ROPE and not only the number of
//      concatenations. (P14).
//   5. `+fill·local` — the schema's own six-piece expression, re-declared as a closure IN THIS FILE.
//      `+fill` is the LARGEST rung on the ladder (+0.0275, 27.5 ns/row) for what the code says is
//      one indirect call, and this splits that call from the module boundary it crosses. (P15).
//
// WHAT IS STILL NOT BUILT, and it is one row:
//
//   * `esc·mixed` — `floorEsc` over an author pool where a KNOWN FRACTION of the rows carry one
//     escapable character, gated against its own reference. It isolates the escapable-character
//     fraction as a variable instead of leaving `esc` and `esc·dirty` as the only two points, at
//     0% and 100%. Not needed to explain P0 — the fast path is established from the data above —
//     and it needs a third reference and a third census, which is the reason it is not here.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
//
// ── THE DESIGN QUESTION THIS FILE HAD TO ANSWER FIRST: WHAT IS A SERVER FLOOR ALLOWED TO DO? ─
//
// `mount-floor` had to argue about ADDRESSABILITY. A program that produces the app's exact DOM out
// of one `innerHTML` store is the cheapest way to make those nodes and is not a floor for any
// renderer, because not one reference to a port survives it: nothing it builds can ever be
// updated, and a renderer that behaved that way would not be a renderer. So that axis prints two
// floors and spends a section explaining which may be quoted for what.
//
// A SERVER RENDER HAS NO SUCH REQUIREMENT, AND THAT MAKES THIS FLOOR CLEANER. The string IS the
// whole product. Nothing has to stay reachable, nothing will be updated, nothing will be torn
// down: the bytes go to a socket and the process forgets the request. There is no second quantity
// here and no "adoptable floor" to print beside the first — a hand-written program that
// concatenates the right characters has done the entire job a server renderer does.
//
// SO THE FLOOR IS: STRAIGHT-LINE CONCATENATION, WITH THE ESCAPERS ON EVERY DYNAMIC VALUE.
//
// ESCAPING IS THE ONE THING IT MAY NOT SKIP, and that is not a stylistic preference. A server
// renderer that prints a value into a text position without escaping it is not a faster renderer,
// it is an injection: `<` is the only character that can open a tag and `&` the only one that can
// open a character reference (`@exodra/core`'s `escapeExoText` states the sufficiency argument).
// A program that leaves them out has not done the job cheaply, it has done a different job. So the
// floor calls the SHIPPED escapers — `escapeExoText` and `escapeExoAttributeValue`, imported from
// `@exodra/core`, the same two functions the backend's writers call — and the row that does NOT
// call them (`floor`) is in this table as a BOUND ON THE CONCATENATION WORK ALONE and is labelled
// as one everywhere it appears.
//
// AND ESCAPING IS MOST OF THE FLOOR. Measured by the owner on this machine, 1000 rows,
// byte-identical output, medians of 80 rounds: plain `+=` with no escaping 0.015 ms, the same
// program with the shipped escapers 0.077 ms. ESCAPING IS 0.063 ms — 82% OF THE HONEST FLOOR.
// (A CITATION. That run is not this one, and this axis re-measures both rows rather than quoting
// them; see the prediction block, where reproducing that split is prediction (P0).)
//
// AND IT DID NOT REPRODUCE AS A SHARE. THE PUBLISHED RUN OF THIS AXIS SAYS 48.9%, NOT 82%. The
// 0.063 ms did reproduce (0.0550 here); the 0.077 ms did not, because this axis charges a 0.0250 ms
// flatten that the probe above did not. The sentence in caps two lines up is therefore TRUE OF A
// PROGRAM THAT HANDS BACK A ROPE and false of the floor this axis measures — the full argument,
// and what may still be quoted, is in THE STATE OF THIS INSTRUMENT at the top of this file. Nobody
// should be reading this paragraph without having read that one.
//
// WHAT THE FLOOR MAY KNOW: THE SHAPE, NOT THE DATA. Every piece of static markup in the
// hand-written programs is a string literal in this file, which is fair — a compiled template is
// exactly that, and the renderer's own schema is prepared at module load too. What no rung may do is
// bake a rendered ROW: the value of `data-id`, the href, the title and the author are computed
// from the row index INSIDE every timed region, by every program, including the floor. A rung that
// hardcoded its output would be measuring `+=` on constants and nothing else.
//
// ── THE JOB: 1000 ROWS OF ONE COMPONENT, FIVE PORTS ──────────────────────────────────────────
//
//   <li class="row" data-id="7"><a class="t" href="/i/7">Task 7</a>
//   <span class="by">Ken</span><button class="fav">+</button></li>
//
// FIVE PORTS, which is what a real list row has: two attributes (`data-id` on the `<li>`, `href`
// on the `<a>`), two texts (the title, the author) and ONE EVENT PORT on the button. The event
// port is not decoration — it is the reason a server row costs what it does in the two places this
// axis prices separately (it owns a value slot that prints nothing, and it cuts the static markup
// in two), and a row without one would be a row nobody serves.
//
// THE DATA IS ESCAPE-FREE ASCII, AND THAT IS THE SHARPEST CAVEAT IN THE FILE. `Task 7`, `/i/7`,
// `Ken` — none of them contains `&`, `<`, `>` or U+00A0, so every escaper call takes its
// scan-and-return fast path and allocates nothing. THIS AXIS THEREFORE PRICES ESCAPING AT ITS
// FLOOR, and "escaping is 82%" is a statement about the cheapest possible data. It had to be this
// way for the main census: the no-escape row can only be gated byte-for-byte against the escaped
// one when escaping is a no-op, and a rung that produces different bytes is worth nothing. So a
// SECOND, TWO-ROW CENSUS runs on data where all four values need escaping — see `esc·dirty` /
// `exodra·dirty` below — and its only claim is end-to-end.
//
// ── THE LADDER, AND WHAT IT IS FOR ───────────────────────────────────────────────────────────
//
// The owner's numbers leave one quantity unexplained. On the same job, byte-identical:
//
//   the escaped floor                                   0.077 ms
//   `@exodra/string`, per-row reactive state removed     0.211 ms
//   `@exodra/string`, the real app wire                  0.254 ms
//
// The last step is the per-row reactive state and its handler. THE
// 0.134 ms BETWEEN THE ESCAPED FLOOR AND 0.211 IS NOT, and it is the whole of this file.
//
// AN ATTEMPT TO SPLIT IT BY CALLING `schema.fillMarkup` DIRECTLY FAILED, AND THE FAILURE IS WHY THIS
// FILE IS SHAPED LIKE A LADDER. `fillMarkup` takes values the connector has ALREADY written, so
// the escaping and the writer indirection are inside `TExoStrNode.set` and not inside the
// fill; a rung that called the fill with hand-made values produced DIFFERENT MARKUP, and the only
// reason that was noticed is that the strings were compared instead of their lengths.
//
// SO EVERY RUNG HERE IS A WHOLE PROGRAM THAT PRODUCES ALL 1000 ROWS, and consecutive rungs differ
// by ONE MECHANISM. The ladder starts at the escaped floor and ends at `ExoStrBackend.render`, and the
// price of a mechanism is the difference between the two rungs that bracket it. Nothing is
// subtracted that was not measured on both sides, and every rung goes through the same
// byte-identical gate before anything is timed.
//
// THE RUNGS, IN ORDER, AND WHAT EACH ONE BUYS:
//
//   floor        `+=` over five merged static pieces, NO escaping. A bound, not a floor.
//   esc          THE FLOOR — the same, with the two shipped escapers on all four dynamic values.
//   +cut         the static run cut into SIX pieces instead of five, with `''` concatenated where
//                the event port stands. The event port owns a value slot on the server and prints
//                nothing; this is what that costs in markup terms.
//   +vals        the five values written into a reused `string[5]` and read back out of it, rather
//                than used where they were produced. This is the connector's value array.
//   +head        ` data-id="` and ` href="` move OUT of the static pieces and INTO the values.
//                The shipped attribute writer owns the whole attribute — head, value, quote —
//                because only a writer that owns the head can decline to write the attribute at
//                all when the value is `null`/`undefined`/`false`, which is what the DOM backend
//                does with `removeAttribute`. `exo-writer-for-port`'s header states the cost as
//                "two extra concatenations per attribute port per instance" AND STATES THAT IT IS
//                UNMEASURED. THIS RUNG IS THAT MEASUREMENT.
//   +wr          the values produced by THE SHIPPED WRITERS, taken off the real schema
//                (`exoStrSchemaOf(ROW.schema).writers`) and called through the writer table by
//                index. The escaping is unchanged — it moves INSIDE the writer — so what this
//                rung adds is one indirect call and one array load per port, five of them, in
//                place of four direct calls.
//   +fill        the row assembled by THE SHIPPED `schema.fillMarkup` instead of hand-written `+=`.
//   +new         a FRESH EXONODE PER ROW from `schema.createInstance` — the schema's own allocator, the
//                one `renderExoStrInstance` calls. One `new`, one empty array, `portCount` pushes of
//                `''` and seven field stores, per row.
//   +set         the values written through THE SHIPPED `TExoStrNode.set(port, value)`, on that
//                exonode, with the declaration's real port objects.
//   +wire        the five fills replaced by ONE indirect call to the component's REAL wire.
//   +call        the whole per-row body replaced by THE SHIPPED `renderExoStrInstance`, called in a
//                loop. At this rung the program IS the backend, minus its entry point. THIS STEP
//                CROSSES THREE MECHANISMS and not one — the schema lookup, the loop moving inside
//                the package, and `armExoNode`, which reaches the wire through
//                `machine.wire` and then walks a handler list and an effect list
//                that a wired component declares EMPTY — because the three rungs that stood
//                between it and `+wire` are struck; see the block under it.
//   exodra·flat  1000 calls of `ExoStrBackend.render(ROW)` — the entry point, with a wire that
//                has no per-row state. THE ENTRY POINT RENDERS ONE INSTANCE, so this rung carries
//                the loop and one schema lookup per row; `strRows` states what that does to the
//                control below.
//   exodra       the same through a machine that allocates a per-row state object, writes the
//                title through a transition and declares a handler that changes it — what a
//                reactive row actually is. The step from `exodra·flat`
//                is the price of state a server render serialises away.
//
// `+call` AGAINST `exodra·flat` IS A CONTROL AND SHOULD BE ZERO. Between them there is one schema
// lookup (a field load and a null check) and a loop that lives inside the package instead of in
// this file. If they separate past the resolution floor, the run says so by name: the difference
// is then the module boundary, not the program, and every rung below it inherits that doubt.
//
// ── THREE RUNGS STRUCK, AND WHY NONE OF THEM COULD BE RE-FOUNDED ────────────────────────────
//
// `+frame`, `+try` and `+stack` stood between `+wire` and `+call`. All three priced BOOKKEEPING
// AROUND A REUSED INSTANCE OBJECT: saving `exoStrContextSlot.frame` before the wire and putting it
// back after, doing the same from a `finally`, and bracketing the instance with a depth-indexed
// pool. There is no such pool anywhere in the library now — `renderExoStrInstance.ts:5-6` says
// "NOTHING IS POOLED: the exonode the wire is handed IS the instance, so there is nothing to empty
// before, nothing to release after, no `try`/`finally`" — and the shipped render
// takes the context chain as a VALUE PARAMETER rather than reading and restoring a slot. So the
// engine executes none of the three, and a rung whose mechanism the engine does not run puts a cost
// into a ladder whose whole claim is that its rungs sum to what the backend does. There is no
// honest re-founding of a construct that is not there; they are struck, and `+wire` → `+call` is
// the one step in this ladder that crosses two mechanisms.
//
// A FOURTH WAS RE-FOUNDED RATHER THAN STRUCK: `+reset` became `+new`. Its question — "what stands
// between a hand-written reused array and the shipped exonode?" — still has an answer, and the
// answer changed from an emptying loop to an ALLOCATION. That rung's number is not comparable with
// any `+reset` figure in `measurements/`, and the rung's own `what` string says so.
//
// ── FIVE RUNGS I DID NOT BUILD, AND EXACTLY WHAT BLOCKED EACH ────────────────────────────────
//
//  A. ESCAPING PRICED ON ITS OWN, INSIDE THE LIBRARY'S PATH. There is no seam: the escaper is
//     called by the writer, the writer is chosen at compile time out of a `WeakMap` keyed by the
//     attribute's write spec, and no public entry point takes a writer. `esc` − `floor` prices
//     escaping in the FLOOR's path, where the calls are direct, and that is the number this file
//     reports. It is not the same as escaping inside the backend, and the difference between those
//     two is exactly what `+wr` measures.
//  B. THE VALUE ARRAY'S PACKEDNESS. `TExoStrNode`'s constructor builds `values` by pushing
//     `''` `portCount` times, deliberately, so the array is PACKED. This file's hand-written rungs
//     do the same, so the rungs are comparable — but nothing here prices the alternative
//     (`new Array(5).fill('')`), because both programs would then be this file's and the answer
//     would say nothing about the shipped one.
//  C. `finally` PRICED WITHOUT THE FRAME. This caveat is now moot rather than answered: the `+try`
//     rung it qualified is struck, because the shipped render opens no `try` per instance. Kept as
//     a line so that a reader who finds `+try` in an old recording is told where it went.
//  D. THE EXONODE'S CLASS SHAPE. `+set` and everything above it use a real `TExoStrNode`,
//     which carries eleven other methods and three fields. A rung with a two-field object literal
//     would price "a small object against a large one" and would be MY object either way; the
//     shipped class is the thing being measured, so it is the thing that is used.
//  E. A STREAMING RENDER. `@exodra/string` has no streaming entry point, so there is nothing to
//     compare a hand-written chunked writer against. It is named here so that the absence is a
//     decision rather than an oversight.
//
// ── `+=` AGAINST `Array.join`, WHICH THIS REPOSITORY HAS NOW ASSERTED THREE TIMES ────────────
//
// Three sites in `@exodra/string` used to carry the same comment — `render-rows.ts` and the two
// list doors on the server exonode, `bindList` and `bindMany`, all now deleted —
// saying an accumulator array joined at the end was measured SLOWER than `+=`, because V8 builds a
// cons-string for the latter and the array is pure garbage. The owner re-measured it today (join
// 0.118 against 0.077 on identical output — A CITATION, not this run). `esc·join` is that question
// as one rung: the identical program, the identical bytes, rows pushed into an array and joined.
//
// THE FLATTEN IS CHARGED TO BOTH ROWS AND PAID BY ONE PROGRAM, and the paragraph below does not
// say so. `join` returns a flat string, so the tail read costs it nothing; `+=` returns a rope, so
// the same line costs it 0.0250 ms on the published run. Adding it did not level the comparison,
// it moved the question — see (P5) and THE STATE OF THIS INSTRUMENT at the top of the file.
//
// AND IT IS THE REASON EVERY TIMED REGION IN THIS FILE FLATTENS ITS RESULT. `+=` hands back a
// ROPE: the characters are not copied until something reads the string. A run that produced the
// rope and never read it would charge `+=` nothing for a copy that `join` pays eagerly, and the
// comparison would be rigged by construction — so every program's result is flattened inside the
// timed region, by taking a six-character slice of its tail (V8 must flatten a cons-string to
// produce a substring of it). That is also the honest thing for a SERVER floor: a rope cannot be
// written to a socket.
//
// THE FLATTEN COSTS SOMETHING AND IS PRICED, because it also means THIS AXIS'S ABSOLUTE NUMBERS
// WILL NOT MATCH THE ONES MEASURED TODAY — those did not flatten. `esc·noflat` is `esc` with the
// tail read removed, and `esc` − `esc·noflat` is one flatten of ~140 kB. It is NOT a floor for
// anything: it hands back a string nobody has read, and nobody can send that.
//
// ── WHAT COULD NOT BE MADE SYMMETRIC, and what each one does to the numbers ──────────────────
//
//  1. THE LIBRARY IS RESOLVED DIFFERENTLY FROM THE HAND-WRITTEN RUNGS, AND MORE DIFFERENTLY THAN
//     IN ANY OTHER AXIS HERE. `vite.config.ts` lists `@exodra/core` and `@exodra/dom`
//     in `optimizeDeps.exclude`, so those are served as their unbundled tsup
//     `dist` ESM. `@exodra/string` IS NOT IN THAT LIST — this is the first axis to import it — so
//     Vite's dependency optimizer pre-bundles it with esbuild. Pre-bundling can only help it:
//     cross-module calls inside the package become intra-module, and the hand-written rungs get no
//     such treatment. THE ASYMMETRY FAVOURS THE LIBRARY ROW, so the gap this axis reports is a
//     LOWER bound on the true one. Adding `'@exodra/string'` to that exclude list removes it; that
//     is a one-line change in a file this axis does not own, and the run PRINTS the reminder rather
//     than assuming it happened.
//  2. THE WRITERS ARE SHARED ACROSS EVERY COMPONENT IN THIS FILE, and that is the library's
//     design rather than this file's shortcut: text and event writers are module-level singletons,
//     and attribute writers are cached per (write spec, tag) pair in a `WeakMap`. So the ladder's
//     writer calls and the library rows' writer calls hit the same call targets and the same
//     inline caches. Nothing can be done about it without a second copy of the package.
//  3. THE LADDER SHARES THE LIBRARY'S SCHEMA — the same `fillMarkup` closure, the same writer table,
//     the same port objects. That is deliberate (a decomposition of the backend's own render
//     should decompose the backend's own objects) and it means the ladder's rungs run against
//     inline caches the library row also warms. It makes the upper rungs OPTIMISTIC relative to an
//     independent measurement of the same mechanism.
//  4. MODULE-LOAD COST IS OUTSIDE EVERY TIMED REGION. Four declarations are built and four schemas
//     are compiled when this module loads; none of it is timed, for the reason `mount-floor` gives
//     about its prototypes — a floor should be the LOWEST achievable number, and charging it for
//     set-up would make it a worse bound. It is fair to the renderer, which compiles a schema once
//     per declaration for the life of the process.
//  5. THE GARBAGE IS NOT EQUAL ACROSS ROWS AND THE HARNESS ONLY BLUNTS IT. `exodra` allocates 1000
//     state objects per render; `esc·join` allocates a 1000-element array; the floor
//     allocates strings and nothing else. GC runs before every timed region, and each region holds
//     all of its repetitions' outputs alive at once (the sink rule), but collection triggered
//     INSIDE a region is charged to whatever is running.
//  6. ONE SHAPE, ONE COMPONENT, ONE MACHINE. Five ports on five elements. A component with more
//     static markup per row moves the gap towards zero (the pieces dominate); one with more ports
//     moves it the other way. Nothing here is scale-invariant and none of it may be quoted as a
//     fact about SSR in general.
//
// ── WHAT THIS AXIS DOES NOT ANSWER. Read this before quoting anything from it. ────────────────
//
//  * NOTHING ABOUT PAGE LOAD, TTI, NETWORK OR BUNDLE SIZE. That is `packages/benchmarks/ssr/`,
//    which is Exodra against Solid and Qwik in wall-clock through a throttled connection.
//  * NOTHING ABOUT HYDRATION. `hydrate-floor` is that direction.
//  * NOTHING ABOUT OTHER SERVER RENDERERS. There is no third-party row here at all: the question
//    is how far our own renderer is from the cheapest program that does its job, and a competitor
//    would answer a different one.
//  * NOTHING ABOUT MEMORY. No heap column is printed and none would mean anything across rows
//    whose allocation shapes differ this much.
//  * NOTHING ABOUT NODE. This runs in Chromium, because that is the browser this suite drives.
//    V8 is V8, but the flags, the heap size and the GC pressure of a benchmark page are not a
//    server's.
//  * IT IS NOT A CLAIM THAT THE GAP IS REACHABLE. Everything in it buys something — a component
//    boundary, one wire that serves three backends, contexts that cannot leak, a connector stack
//    that cannot strand a slot. The ladder says what each of those costs, not that any of it is
//    free to give up.
//
// ── THE PREDICTIONS, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
//
// This is my model. It is JUDGEMENT plus code I read, I MEASURED NONE OF IT, and it is written
// down first so the run can be read as a test of it rather than as a story told afterwards. Every
// falsifier is printed mechanically at the end so that nobody, including me, gets to choose them
// afterwards. Figures are ms per 1000-row render; the per-row nanosecond form is in brackets.
//
//   (P0) THE OWNER'S SPLIT REPRODUCES, IN TWO CLAUSES THAT ARE JUDGED SEPARATELY BECAUSE THEY ARE
//        NOT THE SAME STATEMENT — the `i.e.` that used to join them was wrong, and only the first
//        was ever wired to a falsifier:
//          (P0a) `esc` − `floor` lands between 0.045 and 0.080 ms.
//          (P0b) escaping is 70-85% of `esc`.
//        MECHANISM: four `RegExp.test` calls per row over short strings that never match. If
//        EITHER does not reproduce, this instrument is measuring something the owner's probe was
//        not, and NOTHING ELSE IN THE TABLE MAY BE READ until that is explained — most likely the
//        flatten, which this axis charges and that probe did not.
//
//        NEITHER BAND IS WIDENED HERE AND NEITHER IS RETIRED. On the published run P0a held at
//        0.0550 ms and P0b failed at 48.9%, and the explanation — the flatten, which is 22.2% of
//        this floor and 0% of the probe's — is at the top of this file, along with the one row
//        (`floor·noflat`) that would settle whether it is the whole of it.
//
//   (P1) THE LADDER CLOSES: the ladder's rungs from `esc` to `+call` sum to within ±25% of
//        (`exodra·flat` − `esc`).
//
//        IT IS VACUOUS AS IMPLEMENTED AND CANNOT FAIL. `ladderSum` adds up the CONSECUTIVE
//        DIFFERENCES along `LADDER`, so it telescopes to `median('exodra·flat') − median('esc')` —
//        which is `gap` itself, for any data at all. It was never a test of the ladder, and the
//        "100.0%" the published run printed is that identity. The verdict below prints IDENTITY
//        now rather than a green tick. A REAL VERSION NEEDS A QUANTITY MEASURED OUTSIDE THE CHAIN:
//        one program that composes two mechanisms at once — `+head` and `+wr` together, say —
//        against the sum of the two rungs that split them. None exists in this file, so the claim
//        that the ladder closes is UNTESTED rather than confirmed.
//
//        MECHANISM: consecutive rungs differ by one mechanism each and
//        nothing is left over. IF IT FAILS THE FILE IS WRONG rather than the renderer — a
//        mechanism is missing from the ladder, or two of them interact, and every per-rung figure
//        below is then an ordering and not a size.
//
//        I ALREADY EXPECT THIS TO BE THE TIGHT ONE. My per-rung mid-estimates below sum to about
//        0.085 ms against the 0.134 ms the owner measured, so I am predicting in the same breath
//        that at least one rung lands at the top of its range or that the residue is not zero. If
//        the residue IS the big term, the named candidate is caveat (1): the library is served
//        pre-bundled and the ladder is not.
//
//   (P2) THE FIVE `set` CALLS ARE THE BIGGEST SINGLE BLOCK. `+wr` + `+set` together land between
//        0.018 and 0.045 ms [18-45 ns/row], more than any other pair of adjacent rungs.
//        MECHANISM, read from `TExoStrNode.set`: per port a method call, a `port.index` load,
//        a `writers[index]` load, an indirect call and a `values[index]` store — five operations
//        five times per row, 25 000 of them per render, against a floor that calls four escapers
//        directly and stores nothing.
//
//   (P3) IS STRUCK, WITH THE TWO RUNGS IT WAS ABOUT. It predicted that `+frame` and `+try` would
//        each land at or under the resolution floor. Nothing is pooled on this backend, so the
//        shipped render saves no frame and opens no `try` per instance; both rungs are gone and a
//        verdict on them would be a verdict on programs this file no longer contains. The run
//        prints the strike by name rather than dropping the line.
//
//   (P4) THE BOOKKEEPING IS SMALL: `+new` − `+fill` is under 0.020 ms [20 ns/row], under 15% of
//        the gap. MECHANISM: one object, one empty array, five pushes of `''` and seven field
//        stores per row — the shipped per-instance allocation, and the only bookkeeping rung this
//        ladder still has. THE TERM LIST CHANGED: it was `+reset` + `+frame` + `+try` + `+stack`,
//        and all four of those priced work around a connector that is no longer reused.
//
//   (P5) `join` LOSES AGAIN, by 40-80% of `esc`. MECHANISM: 1000 `push`es into a growing array
//        plus a `join` that walks it, against a cons-string the engine flattens once — and with
//        the flatten now charged to BOTH sides, the array is pure garbage and nothing else. If it
//        WINS, three comments in `@exodra/string` are wrong and the entry point should change.
//
//        THE MECHANISM ABOVE IS WRONG IN ITS SECOND HALF AND THE BAND WAS STALE BEFORE THE RUN.
//        The flatten is charged to both ROWS but paid by only one PROGRAM: `join` returns a string
//        that is already flat, so its `slice(-6)` copies nothing, while `esc` pays 0.0250 ms for
//        the same line. So this rung does not price `join` against `+=` — it prices `join` against
//        `+=` PLUS A FLATTEN, which is a different question and a kinder one. `join` still lost on
//        the published run (+0.0125 ms), so the three comments in `@exodra/string` stand; but the
//        40-80% band was inherited from a probe that charged neither side, and P5 failed at +11.1%
//        for that reason. `esc·join·noflat` is the row that would prove this rather than argue it.
//
//   (P6) THE ATTRIBUTE HEAD IS CHEAP: `+head` lands under 0.015 ms [15 ns/row]. MECHANISM: four
//        extra concatenations per row (two per attribute port), of short strings. This prices the
//        one claim `exo-writer-for-port` makes and marks unmeasured.
//
//   (P7) `+call` − `exodra·flat` lands inside the resolution floor. MECHANISM: one field load and
//        a null check separate them. If it does not, see the control note above.
//
//   (P8) THE REACTIVE STEP REPRODUCES: `exodra` − `exodra·flat` lands between 0.030 and 0.055 ms,
//        matching the 0.043 the owner measured on a different probe today.
//
//   (P9) THE DIRTY CENSUS COSTS MORE THAN THE CLEAN ONE BY 0.05-0.20 ms ON BOTH ROWS, and the
//        RATIO `exodra·dirty / esc·dirty` is SMALLER than `exodra·flat / esc`. MECHANISM: the
//        slow path is four `replace` passes and four allocations per value, which is work both
//        programs do identically, so it dilutes everything the backend adds on top. If the ratio
//        goes the OTHER way, escaping is not the shared term I think it is.
//
// ── THE SECOND SET OF PREDICTIONS, COMMITTED BEFORE THE FIVE NEW ROWS WERE WRITTEN ───────────
//
// (P0)-(P9) above were committed before the first run. (P10)-(P15) below were committed before
// the rows that judge them existed in this file, for the same reason and against the SAME rule:
// each one carries the number that kills it, and each is printed mechanically at the end so that
// nobody, including me, gets to choose the verdict afterwards. Every figure quoted in them as
// "the published run" is read out of `measurements/ssr-floor.published.json`, whose grain is
// 0.0025 ms per render (quantum 0.100 ms over 40 renders per region).
//
// WHY THIS SET EXISTS AT ALL. The published run says 0.2450 against 0.1125 — 2.178×, 54.1% of a
// server render sitting above a straight-line program with the same escaping and the same bytes.
// The ladder attributes that gap by construction and therefore attributes nothing: (P1) is an
// identity. What was never established is HOW MUCH OF EITHER END IS THE FLATTEN — a copy of
// ~143 kB that this axis charges every `+=` row, that the probe it argues with charged nobody,
// and that NO ROW MEASURED ON THE FLOOR OR ON THE RENDERER. `esc·noflat` measured it in one
// place only, and one point cannot say whether it is a constant.
//
//   (P10) THE FLATTEN IS A PROPERTY OF THE OUTPUT AND NOT OF THE PROGRAM. Every clean row emits
//         the SAME 143 kB, gated byte for byte, so a copy of it should cost the same wherever it
//         is taken. Three clauses, judged separately:
//
//         (P10a) `floor` − `floor·noflat` lands in 0.020-0.030 ms, i.e. within two grains of the
//                0.0250 ms `esc` − `esc·noflat` measured on the published run. MECHANISM: `floor`
//                and `esc` build the identical rope — nine leaves per row, the escapers' fast
//                path returning their argument unchanged (`escapeExoText.ts` returns `value`
//                when the `test` misses, so no leaf is even a different object) — and flatten the
//                identical 143 kB. KILLER: outside that band, the two rows do NOT pay the same
//                flatten though they emit the same bytes through the same rope, and no `X` minus
//                `X·noflat` subtraction anywhere on this axis may be read as "the flatten".
//
//         (P10b) `esc·join` − `esc·join·noflat` lands UNDER 0.0050 ms (two grains), where
//                `esc` − `esc·noflat` is 0.0250. MECHANISM: `Array.join` returns a flat
//                `SeqString`, so `out.slice(-6)` copies nothing; `+=` returns a cons string and
//                the same line copies 143 kB. This is the whole of the header's explanation of
//                why (P5) failed at +11.1% against a band of 40-80%, and it is currently an
//                argument from reading. KILLER: 0.010 ms or more and `join`'s result is not flat,
//                the flatten is charged to both PROGRAMS after all, and (P5)'s failure needs a
//                different explanation.
//
//         (P10c) `exodra·flat` − `exodra·noflat` is AT LEAST as large as `esc` − `esc·noflat`,
//                and lands in 0.020-0.040 ms. MECHANISM, and it is the one clause here that
//                predicts an INEQUALITY rather than an equality: the byte count is identical but
//                the ROPE IS NOT. The floor's row is one nine-operand expression over nine flat
//                leaves. The schema's row is `p0+v[0]+p1+v[1]+p2+v[2]+p3+v[3]+p4+v[4]+p5`
//                (`exo-markup-filler.ts`, the six-piece case) where `v[0]` and `v[1]` are
//                THEMSELVES concatenations of three — the attribute writer owns ` data-id="`, the
//                value and the closing quote — so the tree the flatten walks is ~15 leaves per
//                row against nine, ~6000 extra leaf visits per render on the same 143 kB. A
//                flatten copies bytes AND walks nodes. KILLER: under 0.015 ms, the renderer's
//                rope is CHEAPER to flatten than the floor's, and every ratio this axis publishes
//                is comparing two different amounts of copying rather than sharing a constant.
//
//   (P11) `floor·noflat` LANDS NEAR 0.0325 ms AND NOT NEAR 0.015 — 0.0275-0.0375 ms. This is THE
//         ROW THE HEADER HAS BEEN ASKING FOR since (P0b) failed, and it is a prediction that the
//         owner's probe DOES NOT REPRODUCE HERE. MECHANISM: if (P10a) holds then `floor·noflat`
//         is `floor` − 0.0250 = 0.0325, which is 2.2× the probe's 0.015 ms for the same
//         unescaped concatenation. KILLER: 0.020 ms or under and the probe reproduced, the
//         flatten was the WHOLE of the disagreement, and the paragraph in THE STATE OF THIS
//         INSTRUMENT that says "the flatten explains the `esc` end and not the `floor` end" is
//         wrong and must be struck.
//
//   (P12) THE 82% DOES NOT REPRODUCE EVEN WITH THE FLATTEN TAKEN OFF BOTH SIDES.
//         (`esc·noflat` − `floor·noflat`) / `esc·noflat` lands in 55-70%, not the 70-85% of
//         (P0b). MECHANISM, and it is arithmetic once (P10a) holds: the flatten is in BOTH terms
//         of the numerator, so it cancels — `esc·noflat` − `floor·noflat` should equal
//         `esc` − `floor` = 0.0550 to within a grain — and only the DENOMINATOR shrinks, from
//         0.1125 to 0.0875. 0.0550 / 0.0875 = 62.9%. KILLER: 70% or more and (P0b) was purely
//         the denominator, the repository's 82% may be restated as a fact about an unflattened
//         floor and kept; under 55% and there is a third term nothing here has named.
//
//   (P13) TAKING THE FLATTEN OFF BOTH SIDES MAKES THE RENDERER LOOK WORSE, NOT BETTER:
//         `exodra·noflat` / `esc·noflat` is GREATER than `exodra·flat` / `esc`, and lands in
//         2.25-2.45× against the published 2.02×. MECHANISM: a constant added to both sides of a
//         ratio pulls it towards 1, and the flatten is 22.2% of the floor against 11.0% of the
//         render. So the flatten is not a term that flatters the renderer and removing it is not
//         a correction in its favour. KILLER: an unflattened ratio at or below the flattened one
//         — which would mean the flatten is not a shared constant, and (P10a) and (P10c) are then
//         both wrong in the same direction.
//
//   (P14) `+head` IS PARTLY A FLATTEN, AND THAT IS WHY (P6) FAILED. `+head` − `+head·noflat` is
//         LARGER than `esc` − `esc·noflat` by at least one grain, landing in 0.0275-0.0400 ms.
//         MECHANISM: (P6) predicted the attribute head under 0.015 ms from "four extra
//         concatenations per row" and it measured 0.0250 — 25 ns/row for four concatenations of
//         ten-character literals, which nothing in `exo-writer-for-port`'s claim accounts for.
//         But the head move does a SECOND thing the claim does not mention: it turns two flat
//         leaves per row into two three-operand subtrees, so the rope the flatten walks grows by
//         ~4000 leaves per render while the byte count does not change by one character (the
//         gate proves that). If that is where the rung's size is, the head is cheaper than the
//         table says and the flatten is dearer. KILLER: `+head` − `+head·noflat` at or under
//         `esc` − `esc·noflat` — the head move then costs the flatten nothing, and (P6)'s failure
//         is four concatenations at 25 ns/row, for which this file has no mechanism at all.
//
//   (P15) `+fill` IS NOT ONE INDIRECT CALL, AND IT IS THE LARGEST RUNG ON THE LADDER.
//         `+fill·local` − `+wr` lands UNDER 0.010 ms [10 ns/row] where `+fill` − `+wr` measured
//         0.0275 [27.5 ns/row]. MECHANISM: read against `exo-markup-filler.ts`, `+fill` adds one
//         thing to `+wr` and one only — a call through a variable. The eleven concatenations are
//         the same eleven, the five `v[k]` loads happen in both, and the six pieces are closure
//         locals in one and module-scope constants in the other. A monomorphic call to a closure
//         is single-digit nanoseconds; 27.5 is not that. `+fill·local` is the SAME six-piece
//         expression in a closure declared IN THIS FILE, so it adds the call and nothing else,
//         and `+fill` − `+fill·local` is then what the module boundary into the Vite-pre-bundled
//         `@exodra/string` costs — caveat (1)'s asymmetry, measured instead of asserted, and the
//         first quantity on this axis obtained OUTSIDE the ladder chain. KILLER, either way:
//         `+fill·local` − `+wr` at 0.020 ms or more means one indirect call really does cost
//         20+ ns/row here and the boundary is not the term; `+fill` − `+fill·local` at or under
//         0.0050 ms means there is no boundary term either, and `+fill`'s 27.5 ns/row is a call
//         that no reading of the code accounts for — which would make it the most interesting
//         line in the table and the next thing to profile rather than to benchmark.
//
// WHAT (P10)-(P15) STILL DO NOT FIX, said here so it is not discovered later. (P1) remains an
// identity: `+fill·local` splits a rung, it does not COMPOSE two of them, so nothing here checks
// the chain against a quantity built a different way. And the resolution floor these are judged
// against is still measured only in this session and printed only to the console — see the note
// on the null block below.
//
// ── HOW THIS FILE MEASURES ───────────────────────────────────────────────────────────────────
//
// The runner is `mount-floor`'s, which is `abBench`'s sampling with a repetition factor per phase
// and the medians handed back: `prep()` runs `reps` times UNTIMED, then every `measure()` runs
// inside ONE timed region, then every `cleanup()` runs. GC sits immediately before the timed
// region. Phases are interleaved and the order rotates every round.
//
// EVERY REPETITION'S OUTPUT STAYS ALIVE FOR THE WHOLE TIMED REGION — `mount-phases`' sink rule.
// Each repetition's ~140 kB string is held by a sink object allocated in the UNTIMED prep, so a
// region holds all `reps` of them at once. A program that dropped each result on the floor would
// be allocating into a nursery that recycles rather than into a growing live set.
//
// THE THIRD POSITIONAL IS THE BATCH AND IT IS HONOURED, as `teardown-phases`' is: it MULTIPLIES
// every phase's repetition factor, so when the clock check refuses a phase and names a factor,
// that factor is something the operator can type instead of editing this file.
//
//     npm run axis --workspace=@exodra/benchmarks -- ssr-floor 100 1
//
// BATCH 1 IS THE ONE TO RUN. A timed region is 40 renders: 0.6 ms for the cheapest row and 10 ms
// for the dearest, against a 3-tick floor on a 0.1 ms clock. The run refuses by name if any region
// lands under it and prints the batch to type instead. Raise `rounds` rather than the batch if the
// NULLS cannot separate the small rungs — several of them are predicted to be a handful of
// nanoseconds per row, and a run whose null swallows its subject prints an ordering, not sizes.
//
// `@exodra/string` and `@exodra/core` are resolved to their BUILT dists, so `npm run build` at the
// repo root has to have run, or every library row is last week's renderer.
import { escapeExoAttributeValue, escapeExoText } from '@exodra/core';
import type {
    TExoAnyPort,
    TExoSchemaCursor,
    TExoChildrenWiring,
    TExoMachine,
    TExoWiring,
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoTextPort,
    TExoMachineNode,
} from '@exodra/core';
import { ExoStrBackend, exoStrSchemaOf, renderExoStrInstance } from '@exodra/string';
import type { TExoStrSchema, TExoStrWriter } from '@exodra/string';
import type { Scenario } from '../../../harness';
import { createExoSchema } from '@exodra/core';
import { createExoMachineBuilder } from '@exodra/core';

/**
 * THE SERVER BACKEND, BUILT ONCE AT MODULE LOAD — what the library rows render through, and the
 * object the whole ladder climbs towards. It composes nothing, so it is the shipped path exactly.
 */
const EXO_STR = new ExoStrBackend();

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE JOB AND ITS DATA.
//
// `N` IS 1000 because that is the size the owner measured and because a row of this shape is
// ~140 characters — 1000 of them is a 140 kB page, which is a real list page rather than a
// micro-benchmark's toy.
//
// THE AUTHOR POOL IS READ PER ROW AND IS NOT BAKED INTO ANYTHING. Every program looks up
// `AUTHORS[i & 7]` inside its timed region, exactly as the component's wire does. The other three
// values are COMPUTED from the row index in every program — `String(i)`, `'/i/' + i`,
// `'Task ' + i` — so no rung can be reading a prepared answer.
// ---------------------------------------------------------------------------------------

const N = 1000;

/** Eight short ASCII names, none of which contains anything the escapers replace. */
const AUTHORS: readonly string[] = [
    'Ada',
    'Grace',
    'Alan',
    'Edsger',
    'Barbara',
    'Donald',
    'Ken',
    'Dennis',
];

/**
 * ONE SHARED NO-OP FOR THE WHOLE PROCESS. The flat wire and every hand-written rung fill the
 * event port with this same function, so no rung pays for a closure the others do not — the
 * closure is what `exodra` adds on top, deliberately, and it is priced there and nowhere else.
 */
const NOOP = (): void => undefined;

/**
 * THE EVENT PORT'S VALUE — the empty string, PRODUCED AT RUNTIME rather than written as a literal.
 *
 * IT IS SPELLED THIS WAY FOR ONE REASON AND IT IS NOT STYLE. `+cut` exists to price the fact that
 * an event port cuts the static run in two and concatenates nothing between the halves. Written as
 * `C4 + '' + C5` with `C4` and `C5` single-use string constants, a bundler that inlines constants
 * and folds adjacent literals would collapse the whole expression into ONE literal at build time —
 * and the rung would measure the absence of the mechanism it was built to measure, silently, with
 * the byte gate still passing. A value that comes out of a method call cannot be folded.
 */
const EMPTY_SLOT: string = ''.padEnd(0);

// ---------------------------------------------------------------------------------------
// THE COMPONENT, DECLARED FOUR TIMES OVER ONE SHARED SHAPE.
//
// The CURSOR is shared, so the four declarations cannot drift apart in shape; the DECLARATIONS, the
// SCHEMAS, the value arrays, the connectors and the `fillMarkup` closures are four independent sets
// of objects, which is what makes `exodra·twin` a null at all.
//
// WHERE THE CUTS FALL, read from `compileExoStrSchema` and asserted by the gate below:
//
//   piece 0  `<li class="row"`                        port 0 → ` data-id="7"`
//   piece 1  `><a class="t"`                          port 1 → ` href="/i/7"`
//   piece 2  `>`                                      port 2 → `Task 7`
//   piece 3  `</a><span class="by">`                  port 3 → `Ken`
//   piece 4  `</span><button class="fav"`             port 4 → `` (the event port)
//   piece 5  `>+</button></li>`
//
// SIX PIECES FOR FIVE PORTS, so `createExoMarkupFiller` hands back its six-argument specialisation —
// one expression the engine sees whole, with the pieces as closure locals.
// ---------------------------------------------------------------------------------------

interface RowPorts {
    readonly id: TExoAttrPort;
    readonly href: TExoAttrPort;
    readonly title: TExoTextPort;
    readonly author: TExoTextPort;
    readonly fav: TExoEventPort;
}

function buildRow(b: TExoSchemaCursor): RowPorts {
    let id!: TExoAttrPort;
    let href!: TExoAttrPort;
    let title!: TExoTextPort;
    let author!: TExoTextPort;
    let fav!: TExoEventPort;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
        li.el('a', { class: 't' }, (a) => {
            href = a.port('href');
            title = a.textPort();
        });
        li.el('span', { class: 'by' }, (span) => {
            author = span.textPort();
        });
        li.el('button', { class: 'fav' }, (btn) => {
            fav = btn.eventPort('click');
            btn.text('+');
        });
    });
    return { id, href, title, author, fav };
}

/**
 * THE FLAT WIRE — five fills and nothing else. No per-row state, no per-row closure.
 *
 * This is the component the LADDER decomposes and the one `exodra·flat` renders, so the ladder's
 * upper rungs and that row are running the same wire against the same schema, which is the point.
 */
const ROW_SCHEMA = createExoSchema(buildRow);
const mROW = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(ROW_SCHEMA);
mROW.createInitialState((c, i) => {
    c.attr(ROW_SCHEMA.ports.id, i);
    c.attr(ROW_SCHEMA.ports.href, '/i/' + i);
    c.text(ROW_SCHEMA.ports.title, 'Task ' + i);
    c.text(ROW_SCHEMA.ports.author, AUTHORS[i & 7]);
    c.on(ROW_SCHEMA.ports.fav, NOOP);
});
const ROW = mROW.done();

/**
 * THE LIBRARY'S NULL — the identical shape and the identical wire, declared again, so its
 * declaration, its schema, its `fillMarkup` closure, its connector and its value array are a
 * different set of objects doing identical work. Its true difference from `exodra·flat` is ZERO by construction.
 *
 * IT IS A WEAKER NULL THAN `mount-floor`'s AND SAYS SO. Both halves go through the SAME entry
 * point in the same package, so they share everything V8 learned about `ExoStrBackend.render`,
 * `renderExoStrInstance` and `TExoStrNode.set`; only the data they walk differs. That makes this
 * run's resolution floor a LOWER BOUND on the true one — the same limitation `hydrate-floor`
 * states about its twins, and for the same reason: this file may not carry a second copy of a
 * package's source.
 */
const ROW_TWIN_SCHEMA = createExoSchema(buildRow);
const mROW_TWIN = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(ROW_TWIN_SCHEMA);
mROW_TWIN.createInitialState((c, i) => {
    c.attr(ROW_TWIN_SCHEMA.ports.id, i);
    c.attr(ROW_TWIN_SCHEMA.ports.href, '/i/' + i);
    c.text(ROW_TWIN_SCHEMA.ports.title, 'Task ' + i);
    c.text(ROW_TWIN_SCHEMA.ports.author, AUTHORS[i & 7]);
    c.on(ROW_TWIN_SCHEMA.ports.fav, NOOP);
});
const ROW_TWIN = mROW_TWIN.done();

/**
 * THE REAL ROW — a per-row state object holding the title, a transition that writes it, and a
 * handler that changes it. This is what a reactive row IS, and on the server every byte of that
 * machinery is thrown away with the request: the handler is printed as the empty string.
 *
 * IT IS BYTE-IDENTICAL TO THE FLAT WIRE and the gate proves it: the state's title is `'Task ' + i`.
 */
type TRowLiveState = { readonly i: number; title: string };

const ROW_LIVE_SCHEMA = createExoSchema(buildRow);
const mROW_LIVE = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(ROW_LIVE_SCHEMA);
const K_ROW_LIVE = mROW_LIVE.createInitialState(
    (_c, i): TRowLiveState => ({ i, title: 'Task ' + i })
);
const showRowLiveTitle = mROW_LIVE.transition((c: TExoChildrenWiring & TExoMachineNode) => {
    c.text(ROW_LIVE_SCHEMA.ports.title, c.readState(K_ROW_LIVE).title);
});
mROW_LIVE.wire((c) => {
    const i = c.readState(K_ROW_LIVE).i;
    c.attr(ROW_LIVE_SCHEMA.ports.id, i);
    c.attr(ROW_LIVE_SCHEMA.ports.href, '/i/' + i);
    showRowLiveTitle(c);
    c.text(ROW_LIVE_SCHEMA.ports.author, AUTHORS[i & 7]);
});
mROW_LIVE.on(ROW_LIVE_SCHEMA.ports.fav, (c) => {
    const state = c.readState(K_ROW_LIVE);
    state.title = state.title + '!';
    showRowLiveTitle(c);
});
const ROW_LIVE = mROW_LIVE.done();

// ---------------------------------------------------------------------------------------
// THE SECOND CENSUS — THE SAME JOB ON DATA THAT ACTUALLY NEEDS ESCAPING.
//
// Every one of the four values here contains at least one character the escapers replace, so every
// call takes the SLOW path: a `test` that matches, then four `replace` passes, then a fresh string.
//
// WHAT IT PRICES AND WHAT IT DOES NOT. It prices the whole render end-to-end on dirty data, and
// it CANNOT isolate the escaper: escaped output is LONGER than its input (`&` becomes five
// characters), so the concatenations, the flatten and the page's byte count all grow with it. The
// two rows are gated against each other and against nothing else, and the only claim they support
// is a ratio between two programs doing the identical dirty job.
//
// THERE IS NO UNESCAPED ROW IN THIS CENSUS, and there cannot be: on this data an unescaped program
// produces DIFFERENT BYTES, which is exactly the failure this axis was told to avoid.
// ---------------------------------------------------------------------------------------

const AUTHORS_DIRTY: readonly string[] = [
    'Ada & Grace',
    '<Grace>',
    'Alan & Co',
    'Edsger W. <D>',
    'Barbara & Sons',
    'Donald <K>',
    'Ken & Dennis',
    '<Dennis>',
];

const ROW_DIRTY_SCHEMA = createExoSchema(buildRow);
const mROW_DIRTY = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(ROW_DIRTY_SCHEMA);
mROW_DIRTY.createInitialState((c, i) => {
    c.attr(ROW_DIRTY_SCHEMA.ports.id, i);
    c.attr(ROW_DIRTY_SCHEMA.ports.href, '/i/' + i + '?a=1&b=2');
    c.text(ROW_DIRTY_SCHEMA.ports.title, 'Task <' + i + '> & co');
    c.text(ROW_DIRTY_SCHEMA.ports.author, AUTHORS_DIRTY[i & 7]);
    c.on(ROW_DIRTY_SCHEMA.ports.fav, NOOP);
});
const ROW_DIRTY = mROW_DIRTY.done();

// ---------------------------------------------------------------------------------------
// THE SHIPPED OBJECTS THE LADDER CLIMBS THROUGH, AND WHERE EACH ONE COMES FROM — stated per name
// rather than as a blanket claim, because a blanket claim is what let a type that `@exodra/string`
// does not export (`TExoStrWire`) and a field a component does not have (`component.wire`) sit in
// this file until the compiler was pointed at it.
//
//   `exoStrSchemaOf`, `renderExoStrInstance`, `ExoStrBackend`, `TExoStrSchema`, `TExoStrWriter`
//                            exports of `@exodra/string`, on its index.
//   `escapeExoText`, `escapeExoAttributeValue`, `createExoSchema`, `createExoMachineBuilder`
//   and every port and wiring type here
//                            exports of `@exodra/core`.
//   `PLAN.writers`, `PLAN.fillMarkup`, `PLAN.createInstance`, `ROW.declaration.portList`
//                            fields of those shipped objects, read and not re-implemented.
//   `ROW.wire`
//                            WHERE A WIRE LIVES. `createExoMachineBuilder` returns `{schema, machine}`
//                            and puts the wire in the machine's one prepared transition; there is
//                            no `component.wire`.
//
// Nothing here re-implements a schema, a writer or a filler.
// ---------------------------------------------------------------------------------------

// `EXO_STR` AND NOT SOME OTHER BACKEND. A string schema is cached per declaration PER BACKEND and
// compared by POINTER, so asking with a second object would compile a SECOND schema — a second
// markup parse and a second writer table — and every rung below this line would then be climbing a
// schema that the `exodra·flat` row's own `EXO_STR.render(ROW)` never touches. Passing the backend
// the render goes through is what keeps the ladder and its top rung the same compiled object.
const PLAN: TExoStrSchema = exoStrSchemaOf(ROW, EXO_STR);
/** The shipped writer table, in port-index order. */
const W: readonly TExoStrWriter[] = PLAN.writers;
/** The shipped six-piece filler closure for this schema. */
const FILL = PLAN.fillMarkup;
/**
 * The schema's real port objects, in `index` order — what `set` is given.
 *
 * NARROWED, because `portList` now holds `TExoAnyPort` — a union that includes the
 * ADDRESS port, which `set` deliberately does not accept. This row declares no address port: it is
 * two attribute ports, two text ports and one event port, and the census below refuses the file
 * outright if the count ever stops being five. The narrowing is exact for this component and is
 * spelled once, here, rather than at each of the five fills the rungs make.
 */
const PORTS = ROW.declaration.portList as readonly TExoAnyPort[] as readonly [
    TExoAttrPort,
    TExoAttrPort,
    TExoTextPort,
    TExoTextPort,
    TExoEventPort
];
/**
 * THE SHIPPED PER-INSTANCE ALLOCATOR — `schema.createInstance`, the one `renderExoStrInstance` itself
 * calls. Taken off THIS schema, so the exonodes the upper rungs build stand on the same prototype
 * and carry the same hidden class as the ones `exodra·flat` renders through.
 *
 * IT REPLACES A MODULE-LEVEL PER-SCHEMA HELPER HELD FOR THE WHOLE PROCESS. That export does
 * not exist: the server pools nothing, so there is no single connector to hold and the upper rungs
 * allocate one per row, exactly as the backend does.
 */
const MAKE_NODE = PLAN.createInstance;
/**
 * The component's real wire — the same function object the entry point drives.
 *
 * IT IS REACHED THROUGH `machine.wire` because a wire IS a machine's one prepared
 * transition: `createExoMachineBuilder` puts it there and `renderExoStrInstance` reaches it through
 * `armExoNode`. There is no `component.wire` field to take it off.
 *
 * THE REFUSAL IS NOT DEFENSIVE NOISE. `TExoMachine.wire` is nullable because a
 * DECLARED machine may have no initial transition; a wired component always has one, so a `null`
 * here would mean `+wire` was pricing an empty call and every rung above it would still print.
 */
const ROW_WIRE = ROW.createInitialState;
if (ROW_WIRE === null) {
    throw new Error(
        'ssr-floor: ROW has no wire, so the `+wire` rung would call nothing ' +
            'and the ladder would print a boundary with no wire behind it'
    );
}
const WIRE = ROW_WIRE;

// ---------------------------------------------------------------------------------------
// THE HAND-WRITTEN STATIC PIECES.
//
// TWO LAYOUTS, and the difference between them is one rung of the ladder.
//
// `F*` — FIVE MERGED PIECES, which is what a program with no event port and no removable
// attribute would write. ` data-id="` and ` href="` live in the static markup, where they cost
// nothing at all, and there is no cut where the button's listener would be.
//
// `H*` — SIX PIECES, the layout the shipped compiler produces: the attribute heads have moved
// into the values (only a writer that owns ` name="` can decline to write the attribute) and the
// event port cuts the run in two even though it prints nothing.
//
// `C*` is `F*` with ONLY the event cut added, so that the cut and the head move are two rungs
// rather than one.
// ---------------------------------------------------------------------------------------

const F0 = '<li class="row" data-id="';
const F1 = '"><a class="t" href="';
const F2 = '">';
const F3 = '</a><span class="by">';
const F4 = '</span><button class="fav">+</button></li>';

const C0 = F0;
const C1 = F1;
const C2 = F2;
const C3 = F3;
const C4 = '</span><button class="fav"';
const C5 = '>+</button></li>';

const H0 = '<li class="row"';
const H1 = '><a class="t"';
const H2 = '>';
const H3 = '</a><span class="by">';
const H4 = '</span><button class="fav"';
const H5 = '>+</button></li>';

// ---------------------------------------------------------------------------------------
// RUNG 1 — `floor`: STRAIGHT-LINE `+=`, NO ESCAPING.
//
// NOT A FLOOR FOR ANY SERVER RENDERER, and it is labelled as one everywhere it appears. It bounds
// the CONCATENATION WORK ALONE — "what does it cost this engine to build these characters" — and
// it is only gated against the rest because this census's data contains nothing to escape.
// ---------------------------------------------------------------------------------------

function floorRaw(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        html += F0 + String(i) + F1 + ('/i/' + i) + F2 + ('Task ' + i) + F3 + AUTHORS[i & 7] + F4;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 2 — `esc`: THE FLOOR.
//
// The same program with the SHIPPED escapers on all four dynamic values — `escapeExoAttributeValue`
// for the two attributes, `escapeExoText` for the two texts, both imported from `@exodra/core`,
// both the exact functions the backend's writers call.
//
// `String(i)` IS EXPLICIT because the shipped attribute writer stringifies a non-string before
// escaping it, and the wire hands it the number. Doing it here is what keeps the two programs
// paying for the same conversion.
// ---------------------------------------------------------------------------------------

function floorEsc(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        html +=
            F0 +
            escapeExoAttributeValue(String(i)) +
            F1 +
            escapeExoAttributeValue('/i/' + i) +
            F2 +
            escapeExoText('Task ' + i) +
            F3 +
            escapeExoText(AUTHORS[i & 7]) +
            F4;
    }
    return html + UL_CLOSE;
}

/**
 * THE NULL FOR THE HAND-WRITTEN FAMILY. A second, independently declared copy of `floorEsc` — its
 * own function object, its own inline caches, its own five piece constants and its own copy of the
 * author pool. Its true difference from `floorEsc` is ZERO by construction.
 *
 * IT IS DUPLICATED SOURCE AND NOT A SECOND CALL TO ONE FUNCTION, for `mount-floor`'s reason:
 * calling one function twice shares everything V8 learned about it and measures a floor far below
 * the one a real pair of programs sits on.
 */
const G0 = '<li class="row" data-id="';
const G1 = '"><a class="t" href="';
const G2 = '">';
const G3 = '</a><span class="by">';
const G4 = '</span><button class="fav">+</button></li>';
const AUTHORS_TWIN: readonly string[] = [
    'Ada',
    'Grace',
    'Alan',
    'Edsger',
    'Barbara',
    'Donald',
    'Ken',
    'Dennis',
];

function floorEscTwin(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        html +=
            G0 +
            escapeExoAttributeValue(String(i)) +
            G1 +
            escapeExoAttributeValue('/i/' + i) +
            G2 +
            escapeExoText('Task ' + i) +
            G3 +
            escapeExoText(AUTHORS_TWIN[i & 7]) +
            G4;
    }
    return html + UL_CLOSE;
}

/**
 * THE `+=` / `join` RUNG. Byte-identical output, rows pushed into an array and joined at the end.
 *
 * The array is allocated INSIDE the timed region, which is where a renderer would allocate it: it
 * is per-render state, not per-process state, and hoisting it would be measuring a different
 * program from the one the three comments in `@exodra/string` argue against.
 */
function floorEscJoin(): string {
    const parts: string[] = [UL_OPEN];
    for (let i = 0; i < N; i++) {
        parts.push(
            F0 +
                escapeExoAttributeValue(String(i)) +
                F1 +
                escapeExoAttributeValue('/i/' + i) +
                F2 +
                escapeExoText('Task ' + i) +
                F3 +
                escapeExoText(AUTHORS[i & 7]) +
                F4
        );
    }
    parts.push(UL_CLOSE);
    return parts.join('');
}

// ---------------------------------------------------------------------------------------
// RUNG 3 — `+cut`: THE EVENT PORT'S EMPTY SLOT.
//
// The static run is cut into SIX pieces instead of five, at the one place a listener would be
// attached, and an empty string is concatenated there. That is exactly what the shipped compiler
// does — `compileExoStrSchema` cuts on an event port and emits nothing around it, because the
// slot is fixed by a numbering the DOM backend shares and this backend does not get to change it.
// ---------------------------------------------------------------------------------------

function ladderCut(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        html +=
            C0 +
            escapeExoAttributeValue(String(i)) +
            C1 +
            escapeExoAttributeValue('/i/' + i) +
            C2 +
            escapeExoText('Task ' + i) +
            C3 +
            escapeExoText(AUTHORS[i & 7]) +
            C4 +
            EMPTY_SLOT +
            C5;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 4 — `+vals`: THE VALUE ARRAY.
//
// The five values are written into a reused `string[5]` and read back out of it, instead of being
// used where they were produced. That is what a connector IS on this backend: an array of values
// with a writer in front of each slot.
//
// THE ARRAY IS BUILT BY PUSHING, exactly as `TExoStrNode`'s constructor builds `values`, so it
// is PACKED — see that constructor's comment, and caveat (B) in the header.
// ---------------------------------------------------------------------------------------

function packedSlots(n: number): string[] {
    const values: string[] = [];
    for (let i = 0; i < n; i++) values.push('');
    return values;
}

const VALS = packedSlots(5);

function ladderVals(): string {
    const v = VALS;
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        v[0] = escapeExoAttributeValue(String(i));
        v[1] = escapeExoAttributeValue('/i/' + i);
        v[2] = escapeExoText('Task ' + i);
        v[3] = escapeExoText(AUTHORS[i & 7]);
        v[4] = '';
        html += C0 + v[0] + C1 + v[1] + C2 + v[2] + C3 + v[3] + C4 + v[4] + C5;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 5 — `+head`: THE ATTRIBUTE HEAD MOVES INTO THE VALUE.
//
// ` data-id="` and ` href="` leave the static pieces and are built per row, with the closing quote,
// as part of the value. THIS IS THE ONE CLAIM `exo-writer-for-port` MAKES AND MARKS UNMEASURED:
// "two extra concatenations per attribute port per instance". Two ports, 1000 rows, 4000
// concatenations of short strings.
//
// WHY THE SHIPPED WRITER OWNS THE HEAD AT ALL, so this rung is not read as waste: an attribute the
// DOM backend REMOVES for `null`/`undefined`/`false` cannot be removed by a writer that produces
// only the value, because the name and its quote would then be static markup on either side —
// which is how a conditional attribute came to render as `disabled=""` on the server and vanish on
// the client. What this rung prices is the cost of being able to print nothing.
// ---------------------------------------------------------------------------------------

function ladderHead(): string {
    const v = VALS;
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        v[0] = ' data-id="' + escapeExoAttributeValue(String(i)) + '"';
        v[1] = ' href="' + escapeExoAttributeValue('/i/' + i) + '"';
        v[2] = escapeExoText('Task ' + i);
        v[3] = escapeExoText(AUTHORS[i & 7]);
        v[4] = '';
        html += H0 + v[0] + H1 + v[1] + H2 + v[2] + H3 + v[3] + H4 + v[4] + H5;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 6 — `+wr`: THE SHIPPED WRITERS, THROUGH THE WRITER TABLE.
//
// The values are no longer built by hand: each one comes out of `W[k](value)`, where `W` is the
// real schema's writer table. The escaping and the head concatenation move INSIDE the writer and are
// unchanged in quantity, so what this rung adds is one array load and one indirect call per port —
// five per row against the floor's four direct calls — and the event port's writer, which is a
// call that returns a constant.
//
// THE VALUES HANDED IN ARE THE ONES THE WIRE HANDS IN, including the NUMBER for `data-id`, so the
// writer's `typeof value === 'string' ? value : String(value)` runs on the same branch it runs on
// in a real render.
// ---------------------------------------------------------------------------------------

function ladderWriters(): string {
    const v = VALS;
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        v[0] = W[0](i);
        v[1] = W[1]('/i/' + i);
        v[2] = W[2]('Task ' + i);
        v[3] = W[3](AUTHORS[i & 7]);
        v[4] = W[4](NOOP);
        html += H0 + v[0] + H1 + v[1] + H2 + v[2] + H3 + v[3] + H4 + v[4] + H5;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 7 — `+fill`: THE SHIPPED `schema.fillMarkup`.
//
// The row is assembled by the closure `createExoMarkupFiller` built for this schema instead of by
// hand-written `+=` over the same six pieces. The concatenations are the same eleven; what is
// added is one indirect call per row and five array loads inside it, and what is removed is this
// file's six closure-local piece reads.
// ---------------------------------------------------------------------------------------

function ladderFill(): string {
    const v = VALS;
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        v[0] = W[0](i);
        v[1] = W[1]('/i/' + i);
        v[2] = W[2]('Task ' + i);
        v[3] = W[3](AUTHORS[i & 7]);
        v[4] = W[4](NOOP);
        html += FILL(v);
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// OFF THE LADDER — `+fill·local`: THE SAME FILL, DECLARED IN THIS FILE.
//
// NOT A RUNG. It sits between `+wr` and `+fill` and is deliberately kept OUT of `LADDER`, because
// the chain must stay `esc → … → exodra·flat` for the gap it splits to be the gap this axis
// reports. It is a SPLIT of one rung, printed on its own.
//
// WHY IT EXISTS: `+fill` is the largest rung in the published table (+0.0275 ms, 27.5 ns/row) and
// the only thing it adds over `+wr`, read against `exo-markup-filler.ts`, is A CALL THROUGH A
// VARIABLE. The eleven concatenations are the same eleven and the five `v[k]` loads happen on both
// sides; the pieces are closure locals in the shipped filler and module-scope constants in `+wr`.
// A monomorphic call to a closure is single-digit nanoseconds and 27.5 is not that.
//
// So this program calls a filler with the SHIPPED ONE'S EXACT BODY — the six-piece case of
// `createExoMarkupFiller`, transcribed, over pieces taken as CLOSURE LOCALS from a factory exactly as
// that function takes them, because a body reading module-scope constants would be measuring the
// difference this rung exists to hold still. It is built from the same `H*` constants the shape
// gate proves merge to the schema's own static skeleton, so the bytes cannot drift.
//
// WHAT THE PAIR SAYS: `+fill·local` − `+wr` is the CALL, and `+fill` − `+fill·local` is what
// crossing into `@exodra/string` costs on top of it — caveat (1)'s pre-bundling asymmetry, which
// this file has so far only been able to name. See (P15).
// ---------------------------------------------------------------------------------------

/** `createExoMarkupFiller`'s six-piece case, transcribed, with the pieces as closure locals. */
function makeLocalFiller(
    p0: string,
    p1: string,
    p2: string,
    p3: string,
    p4: string,
    p5: string
): (v: readonly string[]) => string {
    return (v) => p0 + v[0] + p1 + v[1] + p2 + v[2] + p3 + v[3] + p4 + v[4] + p5;
}

const FILL_LOCAL = makeLocalFiller(H0, H1, H2, H3, H4, H5);

function ladderFillLocal(): string {
    const v = VALS;
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        v[0] = W[0](i);
        v[1] = W[1]('/i/' + i);
        v[2] = W[2]('Task ' + i);
        v[3] = W[3](AUTHORS[i & 7]);
        v[4] = W[4](NOOP);
        html += FILL_LOCAL(v);
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 8 — `+new`: A FRESH EXONODE PER ROW, FROM THE SCHEMA'S OWN ALLOCATOR.
//
// IT REPLACES A RUNG NAMED `+reset`, AND THE REPLACEMENT IS THE POINT. `+reset` priced emptying the
// five slots of a REUSED connector before every row, "as a reused connector must". There is no
// reused connector: `renderExoStrInstance.ts` says "NOTHING IS POOLED: the exonode the wire is handed
// IS the instance", so nothing is ever emptied and a hand-written `reset()` here would price a
// mechanism no server render runs. The step between a reused hand-written array and the shipped
// exonode is now an ALLOCATION, so that is what this rung measures.
//
// WHAT IT COSTS, READ OFF `exo-str-instance-factory.ts`: one `new` through the schema's own constructor,
// one empty array, `portCount` pushes of `''` into it, and seven field stores. Per ROW. The rung
// below it reuses one array for the whole loop and stores nothing, so the difference is exactly
// that object and that loop.
//
// `MAKE_NODE` AND NOT A HAND-WRITTEN LITERAL: the allocator is built ONCE PER BACKEND, carries that
// composition's own initial map, and puts the backend on the prototype. Spelling an object literal
// here would price a different hidden class standing on nothing — which is caveat (D)'s rule.
// ---------------------------------------------------------------------------------------

function ladderNew(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        const v = MAKE_NODE(PLAN, null).values;
        v[0] = W[0](i);
        v[1] = W[1]('/i/' + i);
        v[2] = W[2]('Task ' + i);
        v[3] = W[3](AUTHORS[i & 7]);
        v[4] = W[4](NOOP);
        html += FILL(v);
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 9 — `+set`: THE SHIPPED EXONODE.
//
// From here up, every line of the per-row body is `@exodra/string`'s own code. The values go
// through the shipped fill doors on a real exonode built by the real schema's own allocator,
// with the declaration's real port objects.
//
// WHAT THIS RUNG ADDS OVER `+new`, precisely: a method call, a `port.index` load and a
// `this.writers` / `this.values` property load per port — the array load and the indirect call
// were already there. Nothing is emptied: the exonode `+new` allocated is this row's and nobody
// else's.
// ---------------------------------------------------------------------------------------

function ladderDoors(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        const c = MAKE_NODE(PLAN, null);
        c.attr(PORTS[0], i);
        c.attr(PORTS[1], '/i/' + i);
        c.text(PORTS[2], 'Task ' + i);
        c.text(PORTS[3], AUTHORS[i & 7]);
        c.on(PORTS[4], NOOP);
        html += FILL(c.values);
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 10 — `+wire`: THE FILL BECOMES ONE INDIRECT CALL.
//
// The five fills are replaced by ONE call to the component's real wire — the same function
// object the entry point drives, taken off `machine.wire` because that is where a
// wire lives. What it adds is a call through a variable and a stack frame per
// row; what it removes is nothing, because the wire's body IS those five calls.
//
// WHAT IT STILL DOES NOT PAY, and this is new: `armExoNode`. The shipped render does not
// call the wire directly — it calls the arming, which loads `wire`, null-tests it,
// calls it, then walks `handlers` and tests `effects.length`. For a WIRED component those last two
// are a frozen shared empty array and a zero, so the work is a call frame and three loads; it is
// on `+call`'s side of the step and not on this one.
//
// AND IT IS THE LAST RUNG BELOW `+call`. THREE RUNGS STOOD HERE AND ARE STRUCK: `+frame` (the
// context frame saved before the wire and restored after it), `+try` (the same restore moved into
// a `finally`) and `+stack` (a depth-indexed pool bracketing every instance). All
// three priced BOOKKEEPING AROUND A REUSED INSTANCE OBJECT, and nothing is reused: the exonode
// a wire is handed IS the instance (`renderExoStrInstance.ts:5`, "NOTHING IS POOLED"), so the shipped
// render neither saves the frame — it takes the chain as a VALUE PARAMETER — nor opens a `try`, nor
// touches a stack. Keeping them would have put three costs into a ladder whose whole claim is that
// its rungs sum to what the backend does; re-founding them was not possible, because a construct
// the engine does not execute has no honest replacement. `+wire` → `+call` is therefore ONE step
// over THREE mechanisms — the schema lookup, the loop crossing into the package, and the arming —
// and that is the one place this ladder no longer isolates a single mechanism. It is said here
// rather than left to be noticed.
// ---------------------------------------------------------------------------------------

function ladderWire(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        const c = MAKE_NODE(PLAN, null);
        WIRE(c, i);
        html += FILL(c.values);
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// RUNG 11 — `+call`: THE SHIPPED `renderExoStrInstance`.
//
// The whole per-row body is now one call into the package. At this rung the program IS the
// backend's render, minus the entry point's schema lookup and minus the loop being inside the
// package — which is what makes the next line a control rather than a rung.
// ---------------------------------------------------------------------------------------

function ladderCall(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) html += renderExoStrInstance(PLAN, ROW, i);
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// THE LIBRARY ROWS.
//
// ═══ ONE CALL, A LIST INSIDE IT — AND WHY THE AXIS IS SHAPED THIS WAY ═══
//
// `ExoStrBackend.render(component, context)` RENDERS ONE INSTANCE. There is no count argument, and
// the loop that used to live inside the entry point does not come back as a loop of N calls at the
// call site: `render(ROW)` arms its instance at index `0`, so N calls would be N copies
// of row 0 while every ladder rung below renders rows 0…N-1. The byte gate caught exactly that and
// refused, which is what it is for.
//
// SO THE LIBRARY ROW IS A LIST, and that is not a workaround — it is how an application produces a
// thousand DIFFERENT rows. `c.list(port, ROW, N)` arms the instance standing at `i` with the INDEX
// `i`, which is where the per-row number comes from once the entry point stops inventing one. The
// four library programs are one `render` call each, over a component whose children port holds N
// rows.
//
// THE COUNT USED TO BE AN ARRAY, AND THE DIFFERENCE IS ONE LOAD PER ROW THAT THE LIBRARY NO LONGER
// MAKES. `c.list` took `ITEMS` — `[0, 1, … N-1]` — and handed `ITEMS[i]` to the wire as props;
// it now takes `N` and hands `i`. The JOB is unchanged and the bytes are identical, but the
// indexed load is gone from the library's side of every comparison in this file. It is named here
// because it makes the library rows marginally cheaper than the recorded ones for a reason that is
// nothing to do with this axis.
//
// EVERY PROGRAM ON THIS AXIS THEREFORE CARRIES THE SAME `<ul>`, floor included. The list needs a
// root to hang its children port on — a schema is ONE element and this core has no fragment — so
// the wrapper is real markup that the hand-written programs must also emit, or they are not
// producing the same page. It is one tag at each end, written once outside every loop, and it is
// identical on both sides.
//
// WHAT THAT DID TO ONE CONTROL, STATED RATHER THAN DISCOVERED. `+call` → `exodra·flat` was
// declared above as A CONTROL THAT SHOULD BE ZERO: the rung calls `renderExoStrInstance` per row in a
// loop of its own, and the library row used to be the same loop inside the package. It is not that
// any more. The library row now additionally pays ONE schema lookup, ONE outer instance, ONE
// connector bracket and the fixed-list machinery of `c.list` — while the rung pays N brackets and
// no list at all. The step between them is a real difference of PROGRAMS, and reading it as
// resolution would be wrong. Every recorded rung difference involving a library row predates this
// change.
// ---------------------------------------------------------------------------------------

/** The wrapper's markup, as the two hand-written halves must write it. Gated, not assumed. */
const UL_OPEN = '<ul>';
const UL_CLOSE = '</ul>';

/**
 * The same list wrapper over whichever row is being priced — one `<ul>`, one children port, one
 * `c.list`. Declared as a factory so the four censuses differ in their ROW and in nothing else.
 *
 * GENERIC IN THE ROW'S EXONODE: the wrapper asks for exactly what its row asks for, and all four
 * rows ask for the same thing.
 */
function listOf(
    row: TExoMachine<TExoChildrenWiring & TExoMachineNode>
): TExoMachine<TExoChildrenWiring & TExoMachineNode> {
    const MACHINE_SCHEMA = createExoSchema((b: TExoSchemaCursor) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    const mMachine = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(MACHINE_SCHEMA);
    mMachine.createInitialState((c) => {
        c.list(MACHINE_SCHEMA.ports.rows, row, N);
    });
    return mMachine.done();
}

const LIST = listOf(ROW);
const LIST_TWIN = listOf(ROW_TWIN);
const LIST_LIVE = listOf(ROW_LIVE);
const LIST_DIRTY = listOf(ROW_DIRTY);

const runExodraFlat = (): string => EXO_STR.render(LIST);
const runExodraTwin = (): string => EXO_STR.render(LIST_TWIN);
const runExodraLive = (): string => EXO_STR.render(LIST_LIVE);
const runExodraDirty = (): string => EXO_STR.render(LIST_DIRTY);

/** The dirty census's floor — `floorEsc` over data where every value takes the slow path. */
function floorEscDirty(): string {
    let html = UL_OPEN;
    for (let i = 0; i < N; i++) {
        html +=
            F0 +
            escapeExoAttributeValue(String(i)) +
            F1 +
            escapeExoAttributeValue('/i/' + i + '?a=1&b=2') +
            F2 +
            escapeExoText('Task <' + i + '> & co') +
            F3 +
            escapeExoText(AUTHORS_DIRTY[i & 7]) +
            F4;
    }
    return html + UL_CLOSE;
}

// ---------------------------------------------------------------------------------------
// THE PROGRAM TABLE.
// ---------------------------------------------------------------------------------------

/** Which reference a program's bytes are gated against. */
type Census = 'clean' | 'dirty';

interface Program {
    readonly name: string;
    /** Printed beside the number. */
    readonly what: string;
    readonly census: Census;
    /**
     * Whether the result is flattened inside the timed region. TRUE for everything but
     * `esc·noflat`, which exists to price the flatten and is a bound and not a floor — see the
     * header's note on ropes.
     */
    readonly flatten: boolean;
    /**
     * Whether this row escaped everything a server must escape. `floor` did not, and is therefore
     * a bound on the concatenation work and NOT a floor for any renderer.
     */
    readonly escapes: boolean;
    readonly run: () => string;
}

const PROGRAMS: readonly Program[] = [
    {
        name: 'floor',
        what:
            'straight-line += over five merged pieces, NO escaping — a bound on the concatenation ' +
            'work alone, and NOT a floor for any server renderer',
        census: 'clean',
        flatten: true,
        escapes: false,
        run: floorRaw,
    },
    {
        name: 'floor·noflat',
        what:
            'THE ROW THAT SETTLES (P0) — the SAME function as `floor` with only the tail read ' +
            'removed, so the difference between them is one flatten of the identical 143 kB and ' +
            "nothing else. It is the unflattened concatenation bound the owner's probe reported " +
            '(0.015 ms), measured here instead of subtracted. NOT a floor for anything: neither ' +
            'escaped nor readable',
        census: 'clean',
        flatten: false,
        escapes: false,
        run: floorRaw,
    },
    {
        name: 'esc',
        what: 'THE FLOOR — the same, with the two shipped escapers on all four dynamic values',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: floorEsc,
    },
    {
        name: 'esc·twin',
        what: 'THE HAND-WRITTEN NULL — a duplicated declaration of `esc` with its own constants. True Δ = 0',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: floorEscTwin,
    },
    {
        name: 'esc·noflat',
        what:
            'the floor with the tail read REMOVED — hands back an unflattened rope nobody has ' +
            'read. A bound only: a rope cannot be written to a socket',
        census: 'clean',
        flatten: false,
        escapes: true,
        run: floorEsc,
    },
    {
        name: 'esc·join',
        what: 'the floor with the rows pushed into an array and joined at the end instead of +=',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: floorEscJoin,
    },
    {
        name: 'esc·join·noflat',
        what:
            'the join row with the tail read REMOVED. `join` hands back a string that is ALREADY ' +
            'FLAT, so this should differ from `esc·join` by roughly nothing where `esc` − ' +
            "`esc·noflat` is a whole 0.0250 ms — which is (P5)'s entire explanation, measured",
        census: 'clean',
        flatten: false,
        escapes: true,
        run: floorEscJoin,
    },
    {
        name: '+cut',
        what: "six pieces instead of five, with '' concatenated where the event port stands",
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderCut,
    },
    {
        name: '+vals',
        what: 'the five values written into a reused packed string[5] and read back out of it',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderVals,
    },
    {
        name: '+head',
        what: '` data-id="` and ` href="` move out of the static pieces and into the values',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderHead,
    },
    {
        name: '+head·noflat',
        what:
            'THE SAME function as `+head`, unflattened. The head move turns two flat leaves per ' +
            'row into two three-operand subtrees without changing one byte of output, so it grows ' +
            'the rope the flatten walks by ~4000 leaves — and (P6) predicted this rung under ' +
            '0.015 ms and it measured 0.0250',
        census: 'clean',
        flatten: false,
        escapes: true,
        run: ladderHead,
    },
    {
        name: '+wr',
        what: "the values produced by THE SHIPPED WRITERS, called through the schema's writer table",
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderWriters,
    },
    {
        name: '+fill·local',
        what:
            'NOT A RUNG — `+wr` with the row assembled by a filler DECLARED IN THIS FILE whose ' +
            "body is `createExoMarkupFiller`'s six-piece case transcribed, pieces as closure locals. " +
            'It adds one indirect call and nothing else, so it splits `+fill` (the largest rung, ' +
            '27.5 ns/row for what the code says is one call) into the call and the module boundary',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderFillLocal,
    },
    {
        name: '+fill',
        what: 'the row assembled by THE SHIPPED schema.fillMarkup instead of hand-written +=',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderFill,
    },
    {
        name: '+new',
        what: "a fresh exonode per row from the schema's OWN allocator — nothing is pooled, so this replaced a rung named +reset that priced emptying a connector nobody reuses",
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderNew,
    },
    {
        name: '+doors',
        what: 'the values written through THE SHIPPED fill doors, with the real ports',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderDoors,
    },
    {
        name: '+wire',
        what: "the five fills replaced by ONE indirect call to the component's REAL wire",
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderWire,
    },
    {
        name: '+call',
        what: 'THE SHIPPED renderExoStrInstance, called in a loop — the backend minus its entry point',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: ladderCall,
    },
    {
        name: 'exodra·flat',
        what: '1000 × ExoStrBackend.render(ROW) — the entry point, wire with no per-row state',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: runExodraFlat,
    },
    {
        name: 'exodra·twin',
        what:
            'THE LIBRARY NULL — the identical component declared again, its own declaration, schema, ' +
            'filler and connector. True Δ = 0, and it shares the entry point (see its comment)',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: runExodraTwin,
    },
    {
        name: 'exodra·noflat',
        what:
            'THE CHEAPEST ROW ON THIS AXIS AND THE ONE THAT WAS MISSING — the SAME function as ' +
            '`exodra·flat` with the tail read removed. `render-rows.ts` returns its accumulator ' +
            'without reading it, so the renderer hands back a rope exactly as the floor does; ' +
            'this says whether it pays the SAME flatten, on a rope of ~15 leaves per row against ' +
            "the floor's nine",
        census: 'clean',
        flatten: false,
        escapes: true,
        run: runExodraFlat,
    },
    {
        name: 'exodra',
        what: 'the same, through a machine with per-row state, a title transition and a handler',
        census: 'clean',
        flatten: true,
        escapes: true,
        run: runExodraLive,
    },
    {
        name: 'esc·dirty',
        what:
            'THE SECOND CENSUS — the floor on data where all four values need escaping, so every ' +
            'escaper call takes its slow path',
        census: 'dirty',
        flatten: true,
        escapes: true,
        run: floorEscDirty,
    },
    {
        name: 'exodra·dirty',
        what: 'the entry point on that same dirty data',
        census: 'dirty',
        flatten: true,
        escapes: true,
        run: runExodraDirty,
    },
];

/**
 * THE LADDER, IN ORDER. Consecutive entries differ by ONE MECHANISM, and the price of that
 * mechanism is the difference between them. Everything outside this list is a null, a control or
 * a second census.
 *
 * WITH ONE EXCEPTION, NAMED HERE AND AT `ladderWire`: `+wire` → `+call` crosses TWO mechanisms, the
 * schema lookup and the loop moving inside the package. The three rungs that used to stand between
 * them — `+frame`, `+try`, `+stack` — are STRUCK, because all three priced bookkeeping around a
 * REUSED connector and nothing is pooled any more.
 */
const LADDER: readonly string[] = [
    'esc',
    '+cut',
    '+vals',
    '+head',
    '+wr',
    '+fill',
    '+new',
    '+doors',
    '+wire',
    '+call',
    'exodra·flat',
];

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until every program has been shown to produce the REFERENCE BYTES,
// character for character. Without this the axis measures programs that do different jobs and
// every number in it is noise wearing a decimal point.
// ---------------------------------------------------------------------------------------

function gateBytes(who: string, reference: string, got: string): void {
    if (want(reference, got)) {
        line(`gate ssr-floor/${who}: identical bytes — ${got.length} chars`);
        return;
    }
    let at = 0;
    while (at < reference.length && at < got.length && reference[at] === got[at]) at++;
    const from = Math.max(0, at - 60);
    refuse(
        `gate ssr-floor/${who}: DIFFERENT bytes — ${reference.length} chars (reference) / ` +
            `${got.length} chars (${who}), first difference at char ${at}\n` +
            `  reference: …${reference.slice(from, at + 120)}…\n` +
            `  ${who}   : …${got.slice(from, at + 120)}…`
    );
    throw new Error(
        `ssr-floor: "${who}" produces different bytes from the reference ` +
            `(${reference.length} vs ${got.length} chars, first difference at char ${at}) — ` +
            'the timings below would be comparing different programs'
    );
}

/** Named so the comparison reads as an intent rather than as an `===` buried in a condition. */
function want(a: string, b: string): boolean {
    return a === b;
}

/**
 * THE SHAPE GATE — what the compiled schema actually is, checked rather than assumed.
 *
 * The hand-written pieces in this file are a transcription of what `compileExoStrSchema` produces
 * for this declaration, and a transcription can be wrong. The byte gate catches that, but only as
 * "your program differs somewhere"; this one says WHERE the shape disagrees, and it also prints the
 * schema's own static skeleton so a reader can see the six pieces without reading the compiler.
 */
function gateShape(): string[] {
    const lines: string[] = [];
    if (PLAN.portCount !== 5) {
        throw new Error(
            `ssr-floor: the row declaration compiled to ${PLAN.portCount} ports, not 5 — every ` +
                'hand-written rung in this file is written against five and would be measuring ' +
                'a different component'
        );
    }
    if (PORTS.length !== 5) {
        throw new Error(
            `ssr-floor: the row declaration has ${PORTS.length} ports in its portList, not 5`
        );
    }
    if (W.length !== 5) {
        throw new Error(`ssr-floor: the schema has ${W.length} writers, not 5`);
    }
    // The static skeleton: every port filled with nothing at all, which is the schema's pieces
    // concatenated and therefore exactly what the six `H*` constants above should merge to.
    const skeleton = FILL(['', '', '', '', '']);
    const handSkeleton = H0 + H1 + H2 + H3 + H4 + H5;
    if (!want(skeleton, handSkeleton)) {
        throw new Error(
            "ssr-floor: this file's six static pieces do not merge to the schema's static " +
                `skeleton.\n  schema: ${skeleton}\n  file:   ${handSkeleton}`
        );
    }
    lines.push(`  schema static skeleton  ${skeleton}`);
    lines.push(
        `  ports                   ${PORTS.map((p) => `${p.index}:${p.name ?? '—'}`).join('  ')}`
    );
    lines.push(`  one row                 ${EXO_STR.render(ROW)}`);
    return lines;
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — copied from `mount-floor`, which copied it from `teardown-phases`.
// Spin until the clock moves and keep the SMALLEST step it ever takes.
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
// THE RUNNER — `mount-floor`'s, for its reason: this run reports DIFFERENCES and RATIOS, where
// `abBench` prints medians and returns a ranking.
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
    readonly reps: number;
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
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO, in two numbers rather than one —
 * `mount-floor`'s, and its header has the argument for why bias alone reads as perfection.
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
 * Renders per timed region. 40 renders of a 0.015-0.30 ms program is 0.6-12 ms — 6 to 120 ticks of
 * a 0.1 ms clock against a 3-tick floor — and holds ~5.6 MB of finished markup alive at once,
 * which is the sink rule's price and is well inside a benchmark page's heap.
 */
const SSR_REPS = 40;

// ---------------------------------------------------------------------------------------

export function benchmarkSsrFloor(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    const pct = (x: number, of: number): string =>
        of === 0 ? '—' : `${((x / of) * 100).toFixed(1)}%`;
    /** Nanoseconds per row, which is the unit every rung is actually about. */
    const ns = (x: number): string => `${((x * 1e6) / N).toFixed(1)} ns/row`;

    const quantum = observeTimerQuantum();
    line(
        `ssr-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region below ` +
            `must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its digits are ` +
            'quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    line('');
    line('THE SCHEMA, AS COMPILED — checked, not assumed');
    for (const l of gateShape()) line(l);

    // THE REFERENCE IS THE LIBRARY'S OWN OUTPUT, as it has always been — one `render` of the list
    // component, which is `<ul>` plus rows 0…N-1. Every hand-written program is gated against it,
    // wrapper included, so a floor that forgot the `<ul>` is refused rather than timed.
    const referenceClean = EXO_STR.render(LIST);
    const referenceDirty = EXO_STR.render(LIST_DIRTY);
    line('');
    line(
        'THE BYTE GATE — every program below against ExoStrBackend.render, character for ' +
            'character, before anything is timed'
    );
    for (const p of PROGRAMS) {
        gateBytes(p.name, p.census === 'clean' ? referenceClean : referenceDirty, p.run());
    }

    line('');
    line("CENSUS — read off this file's constants, nothing measured");
    line(`  rows per render              ${N}`);
    line(`  ports per row                ${PLAN.portCount}  (2 attribute, 2 text, 1 event)`);
    line(`  static pieces in the schema  ${PLAN.portCount + 1}`);
    line(`  escaper calls per render     ${4 * N}  (2 attribute + 2 text per row)`);
    line(
        `  markup per render            ${referenceClean.length} chars (clean) · ${referenceDirty.length} (dirty)`
    );
    line(
        `  programs measured            ${PROGRAMS.length}  (${LADDER.length} on the ladder, ` +
            `2 nulls, 2 dirty, ${
                PROGRAMS.filter((p) => !p.flatten).length
            } unflattened, 1 split off a rung)`
    );
    line(
        `  unflattened rows             ${PROGRAMS.filter((p) => !p.flatten)
            .map((p) => p.name)
            .join('  ')} — each is the SAME FUNCTION OBJECT as the ` +
            'row it is named after, with only the tail read removed, so the pair is a ' +
            'subtraction over one program and not a comparison of two'
    );
    line(
        `  rows that escape everything  ${PROGRAMS.filter((p) => p.escapes).length} of ` +
            `${PROGRAMS.length} — the ones that do not are named in the table and are BOUNDS, ` +
            'because a server renderer that skips escaping has not done the job faster, it has ' +
            'done a different job'
    );
    line(
        '  RESOLUTION NOTE — @exodra/string is NOT in vite.config.ts optimizeDeps.exclude, where ' +
            '@exodra/core and @exodra/dom are. It is therefore pre-bundled by ' +
            "Vite's dependency optimizer while the hand-written rungs go through the dev server's " +
            'esbuild. The asymmetry FAVOURS the library rows, so the gap below is a LOWER bound.'
    );

    // ── THE PHASES ──────────────────────────────────────────────────────────────────────
    const reps = SSR_REPS * batch;
    const phases: Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps,
        what: p.what,
        prep: (): Scenario => {
            // THE SINK, allocated untimed. Every repetition's markup stays alive for the whole
            // timed region — `mount-phases`' rule — so no program is allocating into a nursery
            // that recycles while its neighbours allocate into a growing live set.
            const sink: { out: string; tail: string } = { out: '', tail: '' };
            const run = p.run;
            const flatten = p.flatten;
            return {
                measure: () => {
                    const out = run();
                    // THE FLATTEN, INSIDE THE REGION. `+=` hands back a rope and the characters
                    // are not copied until something reads the string; a six-character slice of
                    // the tail forces V8 to flatten it. Without this, `+=` would be charged
                    // nothing for a copy `join` pays eagerly. See the header.
                    if (flatten) sink.tail = out.slice(-6);
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
    const seriesOf = (name: string): number[] => series.get(name) as number[];
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    // ── THE STATE OF (P0), PRINTED BEFORE THE TABLE AND NOT AFTER IT ────────────────────
    //
    // The prediction block commits two clauses about the same split — an ABSOLUTE one and a SHARE
    // — and the published run held the first while failing the second, which nobody saw because
    // only the first had a falsifier. The rule attached to (P0) is that nothing else in the table
    // may be read while it is unexplained, and a rule of that kind is worth nothing printed 200
    // lines BELOW the numbers it governs. So it is printed here, above them, every run.
    const p0Escape = median('esc') - median('floor');
    const p0Share = median('esc') === 0 ? 0 : p0Escape / median('esc');
    const p0aOk = p0Escape >= 0.045 && p0Escape <= 0.08;
    const p0bOk = p0Share >= 0.7 && p0Share <= 0.85;
    const p0Flatten = median('esc') - median('esc·noflat');
    line('');
    line('(P0) BEFORE YOU READ THE TABLE — the split this axis exists to reproduce');
    line(
        `  P0a  esc − floor in 0.045-0.080 ms   ${p0aOk ? 'HELD  ' : 'FAILED'}   ${f(p0Escape)} ms`
    );
    line(
        `  P0b  escaping is 70-85% of esc       ${p0bOk ? 'HELD  ' : 'FAILED'}   ${pct(
            p0Escape,
            median('esc')
        )}  (the owner's probe: 82%)`
    );
    if (!p0bOk) {
        refuse(
            `ssr-floor: (P0b) FAILED — escaping is ${pct(p0Escape, median('esc'))} of this ` +
                `floor, not the 70-85% predicted from the owner's probe. THE ABSOLUTE COST DID ` +
                `REPRODUCE (${f(p0Escape)} ms against the probe's 0.063); the DENOMINATOR did ` +
                `not, because this axis charges a flatten (esc − esc·noflat = ${f(
                    p0Flatten
                )} ms, ` +
                `${pct(p0Flatten, median('esc'))} of the floor) that the probe did not. Until a ` +
                '`floor·noflat` row says whether the flatten is the WHOLE of the difference, the ' +
                '82% figure in packages/benchmarks/README.md is about ' +
                'a program that hands back a rope and NOT about the floor measured below. Read ' +
                'THE STATE OF THIS INSTRUMENT at the top of ssr-floor.ts before quoting any ' +
                'figure from this run.'
        );
    }

    // ── THE RAW TABLE ───────────────────────────────────────────────────────────────────
    line('');
    line(
        `SSR FLOOR — ${N} rows of one 5-port component [ms per render] · interleaved · ` +
            `${rounds} rounds · batch ${batch} · ${reps} renders per timed region · GC before ` +
            'every timed region'
    );
    line('                     reps   min      p25      median   p75      max      ns/row');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(6)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ${((s.median * 1e6) / N).toFixed(1)}`
        );
    }
    line('');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(15)} ${p.what}`);

    // ── THE RESOLUTION FLOOR ────────────────────────────────────────────────────────────
    //
    // TWO NULLS, ONE PER FAMILY. The hand-written one is two independently declared programs; the
    // library one is two independently declared COMPONENTS through one shared entry point, which
    // is weaker and says so. Everything below is read against the LARGER.
    const handNull = pairedNull(seriesOf('esc'), seriesOf('esc·twin'));
    const libNull = pairedNull(seriesOf('exodra·flat'), seriesOf('exodra·twin'));
    const resolution = Math.max(handNull.resolution, libNull.resolution);
    // THE SECOND BAR, AND THE ONLY ONE THAT SURVIVES BEING WRITTEN TO DISK. A timed region is
    // `reps` renders read off ONE clock, so every median here is a multiple of `quantum / reps`
    // and two of them cannot differ by less than that without being equal. The null is the better
    // bar when it is available; this one is available always, and it disqualified six rungs of the
    // published ladder on its own.
    const grain = quantum / reps;
    /** A delta in grains, which is the unit a quantised median actually moves in. */
    const grains = (x: number): number => Math.round(Math.abs(x) / grain);

    const floorRawMs = median('floor');
    const escMs = median('esc');
    const noflatMs = median('esc·noflat');
    const joinMs = median('esc·join');
    const flatMs = median('exodra·flat');
    const liveMs = median('exodra');
    const callMs = median('+call');
    const dirtyFloorMs = median('esc·dirty');
    const dirtyLibMs = median('exodra·dirty');
    // THE FIVE ROWS ADDED FOR (P10)-(P15). Four of them are the same function object as the row
    // they are named after, unflattened; the fifth splits the ladder's largest rung.
    const headMs = median('+head');
    const floorNoflatMs = median('floor·noflat');
    const joinNoflatMs = median('esc·join·noflat');
    const headNoflatMs = median('+head·noflat');
    const exodraNoflatMs = median('exodra·noflat');
    const fillLocalMs = median('+fill·local');

    line('');
    line('THE CONTROL — what this run resolved, from two pairs whose true difference is zero');
    line('  null            bias      noise     p75       worst     what it is');
    const nullRow = (name: string, n: Null, what: string): void =>
        line(
            `  ${name.padEnd(14)}${f6(n.bias)}  ${f6(n.noise)}  ${f6(n.noiseP75)}  ` +
                `${f6(n.worst)}  ${what}`
        );
    nullRow('hand-written', handNull, '|esc − esc·twin|, two declarations, true Δ = 0');
    nullRow('library', libNull, '|exodra·flat − exodra·twin|, one entry point, true Δ = 0');
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. A difference of medians is free to cancel; the round-to-round scatter is not.'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(resolution)} ms = max(bias, noise) over both families, ` +
            `${pct(resolution, escMs)} of the floor and ${pct(
                resolution,
                flatMs - escMs
            )} of the ` +
            'gap this axis exists to split. Read every figure below against this and not against ' +
            'zero.'
    );
    line(
        '  THE LIBRARY NULL IS WEAK ON PURPOSE and is not a defect of the run: both of its halves ' +
            'go through the same `ExoStrBackend.render`, `renderExoStrInstance` and `TExoStrNode`, so ' +
            'they share every inline cache the hand-written pair does not. It is a LOWER BOUND on ' +
            "the library family's true resolution."
    );
    line(
        `  THE GRAIN             ${f6(
            grain
        )} ms = the observed quantum over ${reps} renders per region. ` +
            'EVERY MEDIAN IN THE TABLE ABOVE IS A MULTIPLE OF IT, so two rows that differ by one ' +
            'grain are one sample apart and cannot be told from equal. This is a SECOND bar and ' +
            'not a replacement for the null: it is a property of the clock rather than of the ' +
            'run, it is always smaller, and — unlike the null — anyone holding the recorded JSON ' +
            'can recompute it, because `quantum` and `batch` are both in it.'
    );
    line(
        '  THE PUBLISHED RECORDING HAS NO NULL BLOCK IN IT — `measurements/ssr-floor.published.' +
            'json` predates the recorder change and carries only `axis`, `label`, `quantum`, ' +
            '`batch` and `rows`. Run this axis with `--record=<label>` or the two numbers above ' +
            'are printed here and lost again, and (P3), (P7) and half of (P10)-(P15) stay ' +
            'unjudgeable from disk.'
    );

    // ── THE FLOOR, AND WHAT IT IS MADE OF ───────────────────────────────────────────────
    const escapeCost = escMs - floorRawMs;
    const flattenCost = escMs - noflatMs;
    line('');
    line('WHAT THE FLOOR IS MADE OF');
    line(
        `  the floor (esc)             ${f(escMs)} ms   ${ns(escMs)} — straight-line +=, the ` +
            'shipped escapers, the result flattened'
    );
    line(
        `  of which escaping           ${f(escapeCost)} ms   ${pct(escapeCost, escMs)} of it ` +
            `(${ns(escapeCost)}) — esc − floor, on data that never triggers a replacement`
    );
    line(
        `  of which the flatten        ${f(flattenCost)} ms   ${pct(flattenCost, escMs)} of it ` +
            `(${ns(flattenCost)}) — esc − esc·noflat, one copy of ${referenceClean.length} chars`
    );
    line(
        `  concatenation alone (floor) ${f(floorRawMs)} ms   ${ns(floorRawMs)} — NOT a floor: a ` +
            'server renderer that does not escape is not faster, it is an injection'
    );
    line(
        `  += against join             ${sign(joinMs - escMs)} ms for join ` +
            `(${(joinMs / Math.max(escMs, 1e-9)).toFixed(2)}× the floor) — identical bytes, ` +
            'the rows accumulated into an array and joined'
    );

    // ── THE FLATTEN, MEASURED IN FIVE PLACES INSTEAD OF ONE ─────────────────────────────
    //
    // Until these rows existed the flatten had ONE measurement (`esc` − `esc·noflat`) and every
    // use of it elsewhere was a subtraction across two programs, which is what the ladder rule in
    // the header forbids. Each pair below is ONE FUNCTION OBJECT measured twice, differing only in
    // whether the six-character tail read happens inside the timed region — so each is a clean
    // subtraction, and the five together say whether the flatten is a constant of the OUTPUT (it
    // should be: every clean row emits the same 143 kB, gated) or of the ROPE that produced it.
    const flattenOf = (flat: number, noflat: number): number => flat - noflat;
    const escFlat = flattenOf(escMs, noflatMs);
    const floorFlat = flattenOf(floorRawMs, floorNoflatMs);
    const joinFlat = flattenOf(joinMs, joinNoflatMs);
    const headFlat = flattenOf(headMs, headNoflatMs);
    const exodraFlatten = flattenOf(flatMs, exodraNoflatMs);
    line('');
    line(
        'THE FLATTEN — one copy of the SAME 143 kB, priced on five programs. Each row is one ' +
            'function object timed twice, with and without the tail read'
    );
    line('  pair                       flat      noflat    the flatten   grains   leaves/row');
    const flattenRow = (
        name: string,
        flat: number,
        noflat: number,
        leaves: string,
        note: string
    ): void =>
        line(
            `  ${name.padEnd(25)}${f(flat)}   ${f(noflat)}   ${sign(flat - noflat).padEnd(
                11
            )}   ${String(grains(flat - noflat)).padEnd(6)}   ${leaves.padEnd(3)}  ${note}`
        );
    flattenRow(
        'floor / floor·noflat',
        floorRawMs,
        floorNoflatMs,
        '9',
        '(P10a) — and floor·noflat is what (P11) reads'
    );
    flattenRow(
        'esc / esc·noflat',
        escMs,
        noflatMs,
        '9',
        'THE REFERENCE — the only one of these that existed'
    );
    flattenRow(
        'esc·join / …·noflat',
        joinMs,
        joinNoflatMs,
        '—',
        'already flat — (P10b), and (P5) turns on it'
    );
    flattenRow(
        '+head / +head·noflat',
        headMs,
        headNoflatMs,
        '~15',
        'the rope grows, the bytes do not — (P14)'
    );
    flattenRow(
        'exodra·flat / …·noflat',
        flatMs,
        exodraNoflatMs,
        '~15',
        'does the RENDERER pay it — (P10c)'
    );
    line(
        `  THE SPREAD ACROSS THE FOUR += ROWS is ${f(
            Math.max(floorFlat, escFlat, headFlat, exodraFlatten) -
                Math.min(floorFlat, escFlat, headFlat, exodraFlatten)
        )} ms (${grains(
            Math.max(floorFlat, escFlat, headFlat, exodraFlatten) -
                Math.min(floorFlat, escFlat, headFlat, exodraFlatten)
        )} grains). A flatten copies BYTES and walks NODES: the bytes are identical by gate, so ` +
            'anything in this spread is the rope, and the rope is what `+head` changes.'
    );
    line(
        `  WHAT IT DOES TO THE PUBLISHED SHARES. Escaping over the FLATTENED floor is ` +
            `${pct(escapeCost, escMs)}; over the unflattened one (esc·noflat ${f(noflatMs)}) it ` +
            `is ${pct(escapeCost, noflatMs)}; and the unflattened floor measured directly rather ` +
            `than subtracted is floor·noflat ${f(floorNoflatMs)} against the probe's 0.015. The ` +
            `escaping term itself is ${f(escapeCost)} ms flattened and ${f(
                noflatMs - floorNoflatMs
            )} ms unflattened — the flatten is in BOTH terms of that numerator and cancels, so ` +
            'only the denominator ever moved. See (P11) and (P12).'
    );
    line(
        `  AND THE END-TO-END RATIO WITHOUT IT: exodra·noflat / esc·noflat = ${(
            exodraNoflatMs / Math.max(noflatMs, 1e-9)
        ).toFixed(2)}× against ${(flatMs / Math.max(escMs, 1e-9)).toFixed(
            2
        )}× flattened. A term both sides pay pulls a ratio towards 1, so taking the flatten off ` +
            "does not correct the gap in the renderer's favour — see (P13)."
    );

    // ── THE LARGEST RUNG, SPLIT ─────────────────────────────────────────────────────────
    const fillCall = fillLocalMs - median('+wr');
    const fillBoundary = median('+fill') - fillLocalMs;
    line('');
    line(
        'THE LARGEST RUNG, SPLIT — `+fill` is +' +
            `${f(median('+fill') - median('+wr'))} ms over \`+wr\` for what ` +
            '`exo-markup-filler.ts` says is ONE CALL THROUGH A VARIABLE'
    );
    line(
        `  the call itself             ${sign(fillCall)} ms   ${ns(
            fillCall
        )}   +fill·local − +wr — the same six-piece expression, in a closure declared in THIS file`
    );
    line(
        `  crossing into the package   ${sign(fillBoundary)} ms   ${ns(
            fillBoundary
        )}   +fill − +fill·local — the identical body, reached through @exodra/string`
    );
    line(
        '  THIS IS THE FIRST QUANTITY ON THIS AXIS MEASURED OUTSIDE THE LADDER CHAIN, and it is ' +
            'the only place caveat (1) — @exodra/string is pre-bundled by Vite while the ' +
            'hand-written rungs are not — becomes a number instead of a warning. It does not ' +
            'repair (P1): a split is not a composition, and nothing here still checks the chain ' +
            'against a rung built a different way.'
    );

    // ── THE LADDER ──────────────────────────────────────────────────────────────────────
    line('');
    line(
        'THE LADDER — every rung is a whole program producing all 1000 rows; consecutive rungs ' +
            'differ by ONE mechanism, and the difference is what that mechanism costs'
    );
    line(
        '  A RUNG HAS TO CLEAR TWO BARS AND THE COLUMN NAMES BOTH. The NULL is what two programs ' +
            'whose true difference is zero came back at in this session; the GRAIN is what the ' +
            'clock can express at all, and a rung of one grain is one sample landing on the other ' +
            'side of a tick however clean the null was.'
    );
    line('  rung             ms       Δ prev     ns/row   % of gap   grains   resolved?');
    const gap = flatMs - escMs;
    let ladderSum = 0;
    const unresolvedRungs: string[] = [];
    for (let k = 0; k < LADDER.length; k++) {
        const name = LADDER[k];
        const v = median(name);
        if (k === 0) {
            line(
                `  ${name.padEnd(15)}${f(v)}   ${'—'.padEnd(9)}  ${'—'.padEnd(7)}  ${'—'.padEnd(
                    9
                )}  ${'—'.padEnd(6)}   the floor`
            );
            continue;
        }
        const delta = v - median(LADDER[k - 1]);
        ladderSum += delta;
        const g = grains(delta);
        let resolved: string;
        if (Math.abs(delta) < resolution) {
            resolved = `NO — under the ${f6(resolution)} ms null, read as zero`;
            unresolvedRungs.push(`${name} (${sign(delta)}, under the null)`);
        } else if (g <= 1) {
            resolved = `NO — ${g} grain of ${f6(grain)} ms, one sample's tick`;
            unresolvedRungs.push(`${name} (${sign(delta)}, ${g} grain)`);
        } else {
            resolved = 'yes';
        }
        line(
            `  ${name.padEnd(15)}${f(v)}   ${sign(delta).padEnd(9)}  ` +
                `${((delta * 1e6) / N).toFixed(1).padEnd(7)}  ${pct(delta, gap).padEnd(
                    9
                )}  ${String(g).padEnd(6)}   ${resolved}`
        );
    }
    line('');
    line(
        `  THE LADDER SUMS TO ${f(ladderSum)} ms against a measured gap of ${f(gap)} ms ` +
            `(esc → exodra·flat) — ${pct(
                ladderSum,
                gap
            )} of it. A ladder that does not close has ` +
            'a mechanism missing from it, and every rung above is then an ordering, not a size.'
    );
    line(
        `  A NEGATIVE Δ IS USUALLY THE INSTRUMENT — but "every rung does everything the rung below ` +
            'it does and one thing more" is NOT true of every pair, and the blanket claim it used ' +
            'to make here was wrong. `+wire` replaces five `PORTS[k]` ARRAY-INDEX LOADS with five ' +
            "monomorphic property loads on the wire's closed-over ports object, so it removes " +
            'work as well as adding a call and can be genuinely cheaper than `+set` by a little. ' +
            'Every other adjacent pair here is a strict superset, and a negative on one of those ' +
            'is the instrument.'
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    const flatRatio = escMs === 0 ? Infinity : flatMs / escMs;
    const liveRatio = escMs === 0 ? Infinity : liveMs / escMs;
    const reactiveCost = liveMs - flatMs;
    const control = flatMs - callMs;
    const dirtyRatio = dirtyFloorMs === 0 ? Infinity : dirtyLibMs / dirtyFloorMs;

    line('');
    line('THE ANSWER');
    line(
        `  The honest floor for this server render is ${f(escMs)} ms (${ns(escMs)}), and ` +
            `${pct(escapeCost, escMs)} of it is escaping. @exodra/string renders the same bytes ` +
            `in ${f(flatMs)} ms with a stateless wire (${flatRatio.toFixed(2)}×) and ${f(
                liveMs
            )} ` +
            `ms with a reactive one (${liveRatio.toFixed(2)}×).`
    );
    line(
        `  THE GAP ABOVE THE FLOOR IS ${f(gap)} ms (${ns(gap)}), and the ladder attributes ` +
            `${pct(ladderSum, gap)} of it — WHICH IS AN IDENTITY AND NOT A RESULT: a sum of ` +
            'consecutive differences is the difference of the endpoints, always. The per-row ' +
            'reactive state on top costs ' +
            `${f(reactiveCost)} ms (${ns(reactiveCost)}), ${pct(reactiveCost, liveMs)} of a live ` +
            'render, and it is serialised away.'
    );
    line(
        `  THE ESCAPING SHARE ABOVE IS OVER A FLATTENED FLOOR and is not comparable to the 82% ` +
            `quoted in packages/benchmarks/README.md. The flatten is ` +
            `${f(flattenCost)} ms, ${pct(flattenCost, escMs)} of this denominator and none of ` +
            `that one's; over esc·noflat (${f(noflatMs)} ms) the same escaping is ` +
            `${pct(
                escapeCost,
                noflatMs
            )}. Neither figure is the other's, and no row here measures ` +
            'an unflattened `floor`, so the two cannot yet be reconciled — see (P0b).'
    );
    line(
        `  THE STEP OUT OF THE LADDER: +call against exodra·flat is ${sign(
            control
        )} ms — a schema ` +
            `lookup, an outer instance and c.list, not a bare loop. Resolution floor ${f6(
                resolution
            )} ms. NOTE: the ` +
            'published JSON keeps only the table rows and the quantum, so that resolution floor ' +
            'is discarded and this control cannot be judged after the fact.'
    );
    line(
        `  THE DIRTY CENSUS: on data that all needs escaping the floor is ${f(dirtyFloorMs)} ms ` +
            `(${(dirtyFloorMs / Math.max(escMs, 1e-9)).toFixed(2)}× the clean floor) and the ` +
            `renderer ${f(dirtyLibMs)} ms — a ratio of ${dirtyRatio.toFixed(2)}× against ` +
            `${flatRatio.toFixed(2)}× on clean data. The escaped bytes are also LONGER, so this ` +
            'is an end-to-end number and not an isolated escaper cost.'
    );

    // ── THE FALSIFIERS, PRINTED MECHANICALLY ────────────────────────────────────────────
    line('');
    line('THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before any of it existed');
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);

    // (P0) IS TWO CLAUSES AND BOTH ARE JUDGED. They were joined by an `i.e.` in the header that
    // was never an identity — a band in MILLISECONDS and a band in PERCENT are the same statement
    // only if the denominator is fixed, and this axis changed the denominator by charging a
    // flatten. Judging only the first is how a run printed "✔ (P0) HELD" while the share the
    // repository quotes was off by 33 points.
    verdict('(P0a)', p0aOk, 'escaping is 0.045-0.080 ms of the floor', `${f(escapeCost)} ms`);
    verdict(
        '(P0b)',
        p0bOk,
        "escaping is 70-85% of the floor, as the owner's probe had it at 82%",
        `${pct(escapeCost, escMs)} — the flatten this axis charges and that probe did not is ` +
            `${f(flattenCost)} ms of the denominator`
    );
    // (P1) IS AN IDENTITY AND IS REPORTED AS ONE. `ladderSum` telescopes to `median(last) −
    // median(first)`, which is `gap`; the comparison below is `0 <= gap*0.25` for every possible
    // run. Printing HELD for it is printing a green tick for arithmetic.
    line(
        `  ≡ (P1) IDENTITY, NOT A TEST — said the ladder closes within ±25% of the gap; got ` +
            `${f(ladderSum)} against ${f(gap)} (${pct(ladderSum, gap)}), which is what a sum of ` +
            'consecutive differences ALWAYS is. The ladder closing is untested by this file: it ' +
            'needs one program composing two mechanisms at once to check the chain against.'
    );
    {
        const wrSet = median('+wr') - median('+head') + (median('+doors') - median('+new'));
        // Every rung's delta from the rung below it. `slice(1)` shifts the array by one, so the
        // element at `k` is `LADDER[k + 1]` and the rung below it is `LADDER[k]`.
        const biggestPair = Math.max(
            ...LADDER.slice(1).map((n, k) => median(n) - median(LADDER[k]))
        );
        verdict(
            '(P2)',
            wrSet >= 0.018 && wrSet <= 0.045 && wrSet >= biggestPair,
            '+wr and +set together are 0.018-0.045 ms and the biggest block',
            `${f(wrSet)} ms, largest single rung ${f(biggestPair)} ms`
        );
    }
    // (P3) IS STRUCK, NOT RE-JUDGED. It predicted that `+frame` and `+try` would both measure zero
    // to this instrument. Both rungs are gone — they priced saving and restoring a context frame
    // around a REUSED connector, and the server pools nothing, so the shipped render takes the
    // chain as a value parameter and opens no `try` (`renderExoStrInstance.ts`). A tick or a cross
    // here would be a verdict on a prediction about programs this file no longer contains.
    line(
        '  ≡ (P3) STRUCK — its subject (+frame, +try) was struck with it; nothing is pooled, so ' +
            'no shipped render saves a frame or opens a try per instance'
    );
    {
        // ONE TERM, WHERE THERE WERE FOUR. `+reset − +fill` was the emptying of a reused
        // connector's slots and the other three were the frame, the `try` and the stack. All four
        // are gone; what stands between `+fill` and the shipped exonode now is the ALLOCATION, so
        // that is the whole of the bookkeeping this ladder still contains.
        const book = median('+new') - median('+fill');
        verdict(
            '(P4)',
            book < 0.02,
            'the bookkeeping rung is under 0.020 ms',
            `${f(book)} ms (${pct(book, gap)} of the gap)`
        );
    }
    verdict(
        '(P5)',
        joinMs - escMs >= escMs * 0.4 && joinMs - escMs <= escMs * 0.8,
        'join loses by 40-80% of the floor',
        `${sign(joinMs - escMs)} ms (${pct(joinMs - escMs, escMs)})`
    );
    {
        const head = median('+head') - median('+vals');
        verdict(
            '(P6)',
            head < 0.015,
            'the attribute head costs under 0.015 ms',
            `${sign(head)} ms`
        );
    }
    // (P7) IS WITHDRAWN, NOT RE-JUDGED. It predicted `+call` and `exodra·flat` would land inside
    // the resolution floor, and its stated MECHANISM was "one field load and a null check separate
    // them". They no longer do — `exodra·flat` renders a list and `+call` loops per row — so a
    // tick or a cross here would be a verdict on a prediction about a different pair of programs.
    // The number it was about is printed above, named for what it now contains.
    line('   ⊘ (P7) WITHDRAWN — its two programs stopped being the same job; see the step above');
    verdict(
        '(P8)',
        reactiveCost >= 0.03 && reactiveCost <= 0.055,
        'the reactive step is 0.030-0.055 ms',
        `${f(reactiveCost)} ms`
    );
    verdict(
        '(P9)',
        dirtyFloorMs - escMs >= 0.05 && dirtyRatio < flatRatio,
        'dirty data costs 0.05+ ms more and narrows the ratio',
        `+${f(dirtyFloorMs - escMs)} ms, ratio ${dirtyRatio.toFixed(2)}× vs ${flatRatio.toFixed(
            2
        )}×`
    );

    // ── (P10)-(P15), COMMITTED BEFORE THE FIVE ROWS THAT JUDGE THEM WERE WRITTEN ────────
    const escShareNoflat = noflatMs === 0 ? 0 : (noflatMs - floorNoflatMs) / noflatMs;
    const noflatRatio = noflatMs === 0 ? Infinity : exodraNoflatMs / noflatMs;
    verdict(
        '(P10a)',
        floorFlat >= 0.02 && floorFlat <= 0.03,
        'floor and esc pay the SAME flatten (0.020-0.030 ms), because they emit the same 143 kB ' +
            'through the same nine-leaf rope',
        `floor's flatten ${sign(floorFlat)} against esc's ${sign(escFlat)}, ${grains(
            floorFlat - escFlat
        )} grains apart`
    );
    verdict(
        '(P10b)',
        Math.abs(joinFlat) < 0.005,
        'esc·join pays roughly NOTHING to flatten, because join returns a string already flat',
        `${sign(joinFlat)} ms (${grains(joinFlat)} grains) against esc's ${sign(escFlat)} — ` +
            "this is (P5)'s only explanation, and it is now measured rather than argued"
    );
    verdict(
        '(P10c)',
        exodraFlatten >= escFlat && exodraFlatten >= 0.02 && exodraFlatten <= 0.04,
        "the renderer pays AT LEAST the floor's flatten (0.020-0.040 ms) — same bytes, ~15 " +
            'leaves per row against nine',
        `${sign(exodraFlatten)} ms against the floor's ${sign(escFlat)}, ${grains(
            exodraFlatten - escFlat
        )} grains apart`
    );
    verdict(
        '(P11)',
        floorNoflatMs >= 0.0275 && floorNoflatMs <= 0.0375,
        "floor·noflat lands near 0.0325 and NOT near the owner's probe at 0.015",
        `${f(floorNoflatMs)} ms — ${(floorNoflatMs / 0.015).toFixed(2)}× the probe`
    );
    line(
        floorNoflatMs <= 0.02
            ? '     ⇒ (P0) IS SETTLED THE OTHER WAY: the probe REPRODUCED, the flatten was the ' +
                  'whole disagreement, and the paragraph in THE STATE OF THIS INSTRUMENT claiming a ' +
                  'second term must be struck.'
            : '     ⇒ (P0) IS SETTLED: the probe does NOT reproduce here even unflattened. The ' +
                  `flatten explains ${f(escFlat)} ms of the disagreement and ` +
                  `${f(floorNoflatMs - 0.015)} ms of it is a SECOND TERM this axis has still not ` +
                  'named. The 82% may not be restated as a fact about an unflattened floor either.'
    );
    verdict(
        '(P12)',
        escShareNoflat >= 0.55 && escShareNoflat <= 0.7,
        'escaping is 55-70% of the UNFLATTENED floor — the flatten cancels out of the numerator ' +
            'and only the denominator moves',
        `${pct(noflatMs - floorNoflatMs, noflatMs)} (numerator ${f(
            noflatMs - floorNoflatMs
        )} against the flattened ${f(escapeCost)}, ${grains(
            noflatMs - floorNoflatMs - escapeCost
        )} grains apart), where (P0b) wanted 70-85%`
    );
    verdict(
        '(P13)',
        noflatRatio > flatRatio && noflatRatio >= 2.25 && noflatRatio <= 2.45,
        'removing the flatten from both sides makes the renderer look WORSE (2.25-2.45×)',
        `${noflatRatio.toFixed(2)}× unflattened against ${flatRatio.toFixed(2)}× flattened`
    );
    verdict(
        '(P14)',
        headFlat >= escFlat + grain && headFlat >= 0.0275 && headFlat <= 0.04,
        "+head's flatten is bigger than the floor's by at least a grain — the head move grows " +
            'the rope by ~4000 leaves without changing one byte',
        `${sign(headFlat)} ms against ${sign(escFlat)}, ${grains(
            headFlat - escFlat
        )} grains — the +head rung itself is ${sign(headMs - median('+vals'))}, of which ` +
            `${sign(headFlat - escFlat)} is flatten by this reading`
    );
    verdict(
        '(P15)',
        fillCall < 0.01,
        'the call in +fill is under 0.010 ms and the rest of that rung is the module boundary',
        `the call ${sign(fillCall)} (${ns(fillCall)}), the boundary ${sign(fillBoundary)} (${ns(
            fillBoundary
        )}), the rung ${sign(median('+fill') - median('+wr'))}`
    );
    if (Math.abs(fillBoundary) < Math.max(resolution, 2 * grain)) {
        refuse(
            `ssr-floor: +fill·local (${f(fillLocalMs)} ms) and +fill (${f(
                median('+fill')
            )} ms) did not separate — ${sign(fillBoundary)} ms, under both bars ` +
                `(null ${f6(resolution)}, two grains ${f6(2 * grain)}). There is then no module ` +
                `boundary term, and +fill's ${ns(
                    median('+fill') - median('+wr')
                )} over +wr is ONE INDIRECT CALL, which no reading of exo-markup-filler.ts ` +
                'accounts for. That is a profile, not a benchmark, and it is the largest rung on ' +
                'the ladder.'
        );
    }

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    if (gap <= 0) {
        refuse(
            `ssr-floor: exodra·flat (${f(flatMs)} ms) did not measure above the floor ` +
                `(${f(escMs)} ms). Either the gate passed two programs that are not doing the ` +
                'same work, or this run has nothing to attribute — nothing in the ladder means ' +
                'anything until that is explained.'
        );
    }
    // THIS PAIR IS NO LONGER A CONTROL, AND THE REFUSAL THAT TREATED IT AS ONE IS GONE WITH THE
    // PREMISE IT RESTED ON. It refused whenever `+call` and `exodra·flat` separated, on the stated
    // ground that "one schema lookup is all that stands between them" — true while the entry point
    // took a count and the library row was the same per-row loop inside the package. It is not
    // true now: `exodra·flat` is ONE `render` of a list component, so against `+call`'s per-row
    // loop it additionally carries an outer instance, `c.list`'s fixed-list machinery, and ONE
    // connector bracket where the rung pays N. A refusal whose reason is false is worse than no
    // refusal — it fires on a real difference and calls it an instrument.
    //
    // WHAT STILL GATES THE RESOLUTION IS UNTOUCHED, and it is the stronger pair anyway: `esc` vs
    // `esc·twin` and `exodra·flat` vs `exodra·twin` are two declarations of ONE program whose true
    // difference is zero by construction, and `pairedNull` reads the instrument off them. Those
    // refusals stand. The number below is printed, named for what it contains, and quoted as a
    // size by nobody.
    line(
        `  THE LIST WRAPPER OVER A PER-ROW LOOP: +call (${f(callMs)} ms) against exodra·flat ` +
            `(${f(flatMs)} ms) is ${sign(control)} ms against a resolution floor of ` +
            `${f6(resolution)} ms. NOT a control and not a rung: it spans one schema lookup, one ` +
            'outer instance, `c.list`, and one connector bracket against N. It is here because ' +
            'the difference between "the library renders this" and "a loop calls the library per ' +
            'row" is worth a number, not because either side is the other plus one mechanism.'
    );
    if (unresolvedRungs.length > 0) {
        refuse(
            `ssr-floor: ${unresolvedRungs.length} of the ${
                LADDER.length - 1
            } ladder rungs did not clear their own bar and MAY NOT BE QUOTED AS SIZES — ` +
                `${unresolvedRungs.join(', ')}. A rung under the null is two identical programs' ` +
                `scatter; a rung of one grain (${f6(
                    grain
                )} ms) is one sample's tick. Both are an ORDERING at best. The ladder still sums ` +
                'to the gap, because a sum of consecutive differences always does — see (P1) — so ' +
                'that sum is not evidence that the unreadable rungs are small rather than absent.'
        );
    }
    if (resolution > Math.abs(gap) * 0.25) {
        refuse(
            `ssr-floor: the resolution floor is ${f6(resolution)} ms where the gap it has to ` +
                `split is ${f(gap)} ms — this run cannot separate the rungs from each other, so ` +
                'the ladder above is an ordering and not a set of sizes. Raise `rounds`, or raise ' +
                'the batch.'
        );
    }
    for (let k = 1; k < LADDER.length; k++) {
        const delta = median(LADDER[k]) - median(LADDER[k - 1]);
        if (delta >= -resolution) continue;
        refuse(
            `ssr-floor: "${LADDER[k]}" (${f(median(LADDER[k]))} ms) measured CHEAPER than ` +
                `"${LADDER[k - 1]}" (${f(median(LADDER[k - 1]))} ms) by ${f(
                    -delta
                )} ms, past the ` +
                `resolution floor (${f6(resolution)} ms), though it does everything that program ` +
                'does and one thing more. That is not a saving, it is the instrument — raise ' +
                '`rounds` before reading the ladder.'
        );
    }
    // THIS REFUSAL CANNOT FIRE, and it is left standing only so that the next person to add a rung
    // outside `LADDER`'s chain finds a guard already here. `ladderSum` telescopes to `gap`, so the
    // condition is `0 > gap*0.25`. See (P1) in the header: a ladder that closes is not something
    // this file currently tests.
    if (Math.abs(ladderSum - gap) > Math.abs(gap) * 0.25) {
        refuse(
            `ssr-floor: the ladder sums to ${f(ladderSum)} ms against a gap of ${f(gap)} ms ` +
                `(${pct(ladderSum, gap)}). A ladder that does not close is a ladder with a ` +
                'mechanism missing from it or with two of its rungs interacting — the per-rung ' +
                'figures above are an ordering and must not be quoted as sizes.'
        );
    }
    for (const p of phases) {
        const region = (stats.get(p.name) as Stat).median * p.reps;
        const clockFloor = MIN_TICKS * quantum;
        if (region >= clockFloor) continue;
        const factor = region > 0 ? clockFloor / region : Infinity;
        const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
        refuse(
            `ssr-floor: the "${p.name}" timed region is ${region.toFixed(3)} ms at ${p.reps} ` +
                `renders — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- ssr-floor ${rounds} ` +
                `${wantBatch}\``
        );
    }
}
