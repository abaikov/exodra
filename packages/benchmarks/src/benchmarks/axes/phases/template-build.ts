import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
/**
 * TEMPLATE-BUILD — WHAT ONE TEMPLATE COSTS TO PREPARE, AND WHAT ONE DOCUMENT COSTS TO PRODUCE
 * FROM IT, ON BOTH SIDES OF THE WIRE.
 *
 * Every other axis in this suite measures a whole app: a field of frameworks mounting 861 elements,
 * or one renderer's mount split into its phases. NONE of them isolates the template machinery
 * itself. `schema-build` times the construction of a DECLARATION and says so in its own header —
 * "Nothing about SCHEMA COMPILATION, which is the other once-per-component cost and is a different
 * program in a different package". `mount-phases` starts AFTER the schema exists. So the
 * two costs a template library is actually judged on — turning a written template into a prepared
 * form, and turning that prepared form into one filled node — have never been measured against
 * anybody else's answer to the same two questions.
 *
 * THIS AXIS IS THOSE TWO QUESTIONS, ASKED TWICE: ONCE FOR THE DOM AND ONCE FOR STRING OUTPUT. One
 * sizeable tree, written six times in six spellings, and four tables.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * AND IT IS SIX SUBJECTS AND THREE PHASES NOW, BECAUSE ONE TREE MEASURED ONE CASE
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * The card below has thirty-two elements, fifteen interpolation points and ZERO EVENT PORTS, which
 * is exactly the shape in which the strategies in play cannot be told apart. mikado fills its
 * FACTORY and clones the filled thing (`mikado.js:1114-1117`), so it never addresses the clone —
 * and `cloneNode` does not copy event listeners, so a subject with no events never asks that
 * strategy the question that breaks it. Fixed per-instance costs vanish under thirty-two elements.
 * A walk down a chain and a walk across siblings are different walks and this tree is siblings. And
 * "the walk costs X, the writes cost Y" cannot be separated at all while the port count is fixed.
 *
 * SO THERE ARE SIX SUBJECTS, each with its own byte gate, its own DATA/DATA_B rotation gate, its
 * own twin pair, and its own tables:
 *
 *   CARD     32 elements, 15 ports — the original, and the only subject with a server half.
 *   TINY      3 elements,  1 port  — where the per-instance constants stop hiding.
 *   DEEP     28 elements,  4 ports, 12 levels — a CHAIN where the card is siblings.
 *   DENSE    32 elements, 32 ports — the card's tree with a port on every element, which is the
 *            one arrangement in which "the walk" and "the writes" can be separated: the walk is
 *            identical to the card's and the write count is doubled.
 *   EVENTS   the card plus six WORKING click handlers, measured under both event strategies —
 *            direct (handler on the element) and delegated (handler on the root) — in one table,
 *            with a LADDER of rungs under them that takes the per-handler cost apart: two property
 *            stores, one `addEventListener`, the direct pack's `served` guard, and our own
 *            dispatch to an event port — that last one split again into the ports' own structural
 *            cost and the six dispatches, each isolated by a rung that removes exactly one of
 *            them.
 *            The guard's OTHER half — what it costs when the slot it reads is already there — is a
 *            table of its own beside UPDATE, because a re-fill is not a build.
 *   SHELL    the card built with every port EMPTY and filled afterwards, which is the
 *            render-the-skeleton-now-values-later pattern and costs `shell` PLUS `fill¹`.
 *
 * AND THREE PHASES RATHER THAN TWO. `COMPILE` runs once per component, `BUILD` once per instance,
 * and `UPDATE` — new values into a node that already exists — once per DATA CHANGE. The third was
 * missing and its absence was not neutral: it is exactly where the cheapest build row pays its
 * bill. A program that fills the same bytes and keeps no addresses cannot update at all, and the
 * update table prints that absence by name instead of leaving a hole.
 *
 * ONE FLOOR PER TABLE, and it is the floor of THAT TABLE'S JOB. The build tables' floor keeps its
 * addresses, because every participant in them does. The compile tables' floor BUILDS THE TREE
 * rather than writing a string for a parser to turn back into one, because that is what a program
 * with no abstraction does. A second floor doing a smaller job was removed from both: a table with
 * two of them cannot say which one bounds it, and the smaller job always flatters somebody. The
 * TWIN stays in every table — it is not a floor, it is the resolution pair.
 *
 * MIKADO IS ABSENT FROM TWO PLACES AND BOTH ABSENCES ARE FINDINGS. It has no row in the direct
 * event half, because its model has no per-element handler at all; and its delegated row's node is
 * NOT byte-identical, because its registration is a route attribute that serialises — so that row
 * passes a gate of its own which strips exactly six route attributes and demands the remainder
 * match the shared reference. What that gate proves is the finding: mikado builds everybody else's
 * tree PLUS a registration it got for free by cloning it.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE SERVER PAIR, AND WHY IT IS NOT `ssr-floor` AND NOT `packages/benchmarks/ssr`
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `ssr-floor` MEASURES ONE RENDERER AND COMPARES NO FRAMEWORKS — it says so in its own first
 * paragraph: "It answers ONE question about ONE renderer — `@exodra/string`, rendering 1000 rows of
 * one component". Its subject is a four-interpolation `<li>` repeated a thousand times, its
 * fourteen rungs are a decomposition of our own backend, and IT HAS NO COMPILE PHASE AT ALL:
 * `exoStrSchemaOf(ROW.schema, EXO_STR)` runs once at module load, outside every region.
 * `packages/benchmarks/ssr` is a different instrument again — real servers, real Playwright, real
 * CDP throttling, whole applications, and a unit of TIME TO FIRST WORKING CLICK. Neither of them
 * prices ONE template's compile-for-string, and neither can be compared with the two tables above
 * them here, because neither renders this subject.
 *
 * WHAT IS NEW IS THE SAME 32-ELEMENT / 52-NODE / 15-INTERPOLATION SUBJECT, PRICED AS TWO PHASES.
 * `SERVER-COMPILE-US` is what it costs to turn the written template into a prepared form for string
 * output; `SERVER-ASSEMBLE-US` is what it costs to turn that prepared form into one whole document
 * with values in it. They are the same two questions as `COMPILE-US` and `BUILD-NS`, over the same
 * tree, so the four tables line up and a reader can put the price of a server render beside the
 * price of a client one without converting anything.
 *
 * THE SERVER PARTICIPANTS, AND WHAT EACH PHASE TURNED OUT TO BE — READ OFF THEIR OWN SOURCE
 *
 *   floor     THE NATIVE FLOOR, and again the row that says what the others are WORTH. Its
 *             ASSEMBLE is one straight-line concatenation of the same characters with the same
 *             fifteen values, each one through THE SHIPPED ESCAPER — `escapeExoAttributeValue` on
 *             the three attribute values, `escapeExoText` on the twelve texts, both imported from
 *             `@exodra/core`, the same two functions `@exodra/string`'s writers call. A program
 *             that skipped them would not be a cheaper renderer, it would be an injection, and
 *             `ssr-floor` spends a section on that argument. Its COMPILE is the sixteen static
 *             pieces produced as an array — which is the whole of a hand-written program's
 *             prepared form, and it is why that row reads as low as it does: on the server nothing
 *             has to be parsed, so the floor's compile is a bound on obtaining the pieces and NOT
 *             on the job the other rows do.
 *
 *   exodra    `@exodra/string`. ITS COMPILE IS `createExoSchema(build)` then `exoStrSchemaOf(schema,
 *             backend)` — the same first half as the DOM compile row, and then `compileExoStrSchema`,
 *             which walks the declaration emitting markup into a piece list, CUTS the list at every
 *             port, and chooses a writer per port off `EXO_STR_WRITERS.attribute` / `EXO_STR_WRITERS.text`.
 *             It returns `{ writers, fillMarkup: createExoMarkupFiller(pieces), … }`. The DOM schema
 *             is not involved anywhere in that path. `exoStrSchemaOf` caches on `machine.forms`
 *             at the backend's `backendType`, so a fresh MACHINE per repetition is what makes this a
 *             compile and not a field load. `exodra·plan` is the same row with the declaration built
 *             UNTIMED, so the pair prints how much of our server compile is the declaration
 *             `schema-build` already prices separately.
 *             ITS ASSEMBLE IS `renderExoStrInstance` — `schema.createInstance`, the component's wire,
 *             `schema.fillMarkup(node.values)`, then the teardown sweep. That is the shipped entry
 *             point's whole body minus `ExoStrBackend.render`'s schema lookup.
 *
 *   solid     `solid-js/web`'s server build. ITS COMPILE IS A BUILD STEP AND THERE IS NOTHING TO
 *             TIME: `babel-preset-solid` with `generate: 'ssr'` hoists the static pieces to module
 *             scope as `var _tmpl$ = [ … ]` and leaves the component body as one
 *             `ssr(_tmpl$, ssrAttribute('data-id', escape(d.id, true), false), escape(d.title), …)`
 *             call. So solid is in the ASSEMBLE table and REFUSED BY NAME in the compile one, for
 *             the same reason marko is.
 *             THE EMITTED FORM IS WRITTEN OUT BY HAND HERE, and that has to be said plainly. This
 *             file is a `.ts`, and `vite-plugin-solid`'s transform returns null for anything that
 *             is not `.[mc]?[tj]sx` (`vite.config.ts` says so in its own comment, and
 *             `scripts/check-build-modes.mjs` repeats it) — so no JSX in this file would reach
 *             Solid's compiler, and in DOM mode it would not emit an `ssr` call anyway. The piece
 *             array and the call shape below are the preset's own output for this tree. THE BYTE
 *             GATE IS WHAT KEEPS THAT HONEST: whatever was written, it produces the same document.
 *             TWO ROWS, BECAUSE THE ENTRY POINT IS NOT THE ASSEMBLY. `solid·ssr` is the `ssr()`
 *             call alone, which is what `fillMarkup` and the floor are comparable to. `solid` is
 *             `renderToString(code)`, and that wrapper is a `createRoot`, a seroval `Serializer`, a
 *             `setTimeout`, a `serializer.close()` and two injections (`web/dist/server.js:168`).
 *             The subtraction is printed rather than hidden, exactly as mikado's is above.
 *             AND SOLID ESCAPES LESS THAN WE DO. `escape(s)` scans for `<` and `&`; `escape(s,
 *             true)` for `"` and `&` (`server.js:544`). `escapeExoText` also covers `>` and
 *             U+00A0, `escapeExoAttributeValue` those plus `<`. On data carrying any of the three
 *             the two would produce DIFFERENT BYTES; this subject's data carries none, which is
 *             the only reason the gate passes, and it means solid's escaping row is doing a
 *             slightly smaller job than the floor's and ours.
 *
 *   marko     NOT IN EITHER SERVER TABLE, for BOTH of the reasons it is absent from the DOM ones
 *             and neither of them is a loss. `vite.config.ts`'s `marko()` plugin is hard-wired to
 *             `compile(source, id, { output: 'dom', optimize: true, modules: 'esm' })`, so nothing
 *             in this page was compiled for string output; and a comparable row would need a
 *             `.marko` file holding THIS subject tree, which does not exist — the nine `.marko`
 *             files in this package hold other apps — and which this axis may not add.
 *
 *   stage0    NO SERVER STORY AT ALL, and that is an ABSENT CAPABILITY rather than a loss. Its
 *             entry module touches the DOM at LOAD: `node_modules/stage0/index.js:24` is
 *             `document.createTreeWalker(document, …)` at module scope and line 70 is
 *             `document.createElement('template')`. The package publishes one build and no export
 *             conditions, so there is no second half to reach. It cannot produce a string.
 *
 *   mikado    HAS a server renderer AND CANNOT BE REACHED FROM THIS PAGE. Its `main` is
 *             `ssr/index.js`, but its `browser` map sends exactly that path to
 *             `dist/mikado.bundle.min.js`, so the specifier `mikado` in this bundle IS the DOM
 *             half — the same class the two tables above measure. Its SSR compiler is CommonJS and
 *             `require`s `fs` and `path` to read the template OFF DISK
 *             (`node_modules/mikado/compiler/compile.js:1-3`), which no browser process can do.
 *             It IS measured, in node, by `packages/benchmarks/ssr/apps/mikado/server.mjs`.
 *
 * THE SECOND GATE, AND IT EXISTS BECAUSE THIS AXIS ONCE PUBLISHED A PARTICIPANT THAT HAD STOPPED
 * RENDERING. Handed one data object, mikado's generated writer compared fifteen times and wrote
 * nothing, and the row read as "below the native floor". The rotation of `DATA` and `DATA_B` is the
 * fix and it is applied to every server region too — but A TWIN PAIR GIVES RESOLUTION, IT DOES NOT
 * PROVE A PARTICIPANT DID THE WORK. For string assembly the equivalent cheat is a per-input cache,
 * so every server participant's `DATA` document and its `DATA_B` document are compared and the run
 * REFUSES BY NAME when they come out identical.
 *
 * THE FLATTEN IS INSIDE EVERY ASSEMBLE REGION, because `+=` hands back a rope and the characters
 * are not copied until something reads the string — and a rope cannot be written to a socket. Every
 * row takes a six-character slice of its result's tail, which is the mechanism `ssr-floor` uses and
 * the reason its absolute numbers are not comparable with an unflattened probe's. `floor·rope` is
 * the SAME function as `floor` with only that tail read removed, so `floor − floor·rope` prices one
 * flatten of this document, in this run.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE UNITS, AND WHY THEY ARE DIFFERENT UNITS
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * COMPILE RUNS ONCE PER COMPONENT FOR THE LIFE OF A PROCESS. It is reported as MICROSECONDS PER
 * TEMPLATE and never as a share of anything — a share of a mount, of a page load, of a frame, are
 * all the wrong shape for a fixed cost, and this repository has already had one figure withdrawn for
 * exactly that conversion (`child-mark`'s entry in `what-is-unmeasured.md`). A reader judges a
 * compile figure by multiplying it by THEIR OWN component count, which is why it is offered per
 * template and never per anything of ours.
 *
 * BUILD RUNS ONCE PER INSTANCE. It is reported as NANOSECONDS PER NODE — one node meaning one whole
 * instance of the subject tree, not one DOM element; the census below prints the element count so
 * that a reader who wants a per-element figure can divide.
 *
 * COMPILE-FOR-STRING RUNS ONCE PER COMPONENT TOO, and is a FIXED COST for the same reason and in
 * the same unit: MICROSECONDS PER TEMPLATE, multiplied by the reader's own component count and by
 * nothing of ours. ASSEMBLE RUNS ONCE PER REQUEST, and is reported as MICROSECONDS PER DOCUMENT —
 * one document meaning one whole instance of the subject tree serialised, whose character count the
 * census prints.
 *
 * ALL FOUR UNITS ARE IN THE SECTION NAMES (`COMPILE-US`, `BUILD-NS`, `SERVER-COMPILE-US`,
 * `SERVER-ASSEMBLE-US`) because the recorder in `scripts/run-one-axis.js` captures a unit for a
 * NULL block and not for a table: it scrapes the SECTION HEADER and qualifies every recorded row
 * with it. A resolution read at the wrong unit is 1000× wrong in the direction that flatters.
 * `schema-build.ts` explains this at length at its top and this axis follows it exactly.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE PARTICIPANTS, AND WHAT "COMPILE" TURNED OUT TO MEAN FOR EACH — READ OFF THEIR OWN SOURCE
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 *   floor     THE NATIVE FLOOR, and the row that tells a reader what the other three are WORTH. No
 *             library of any kind: `template.innerHTML = markup` once, then twelve
 *             `document.createTextNode('')` appended at the positions a value will later be written
 *             into — which is exactly what the other three prototypes carry, so the floor is not
 *             saving itself a node the rest have to make. Its BUILD is `cloneNode(true)` plus a
 *             hand-written chain of `firstChild` / `lastChild` / `nextSibling` field loads and
 *             fifteen writes. No `querySelector`, no walk table, no refs object, no closure.
 *             AN AXIS WITHOUT THIS ROW CAN RANK PARTICIPANTS AND CANNOT SAY WHAT ANY OF THEM COSTS.
 *
 *   stage0    `import h from 'stage0'` (0.0.25). THE TAGGED TEMPLATE IS THE COMPILE, and its body is
 *             `node_modules/stage0/index.js`: `h` assigns the markup to a shared `<template>`,
 *             takes `content.firstChild`, and calls `compile(node)`, which runs `genPath` — a
 *             `TreeWalker` over every node in the tree, stripping every `#name` marker (an
 *             attribute for an element, the whole `nodeValue` for a Text node) and recording a
 *             `Ref(idx, name)` per marker. The result is `node._refPaths` and `node.collect`.
 *             THE BUILD is `tpl.cloneNode(true)`, then `tpl.collect(clone)` — `walker`, which rolls
 *             the same shared `TreeWalker` forward by each recorded stride and returns a fresh refs
 *             object — then the writes through those refs.
 *
 *   mikado    `mikado` 0.8.400. IT HAS A REAL RUNTIME COMPILE and it is three things, all of which
 *             this row pays: `Mikado.compile(markup)` (`src/compile.js`) parses the markup into a
 *             `<div>`, walks it recursively into a `TemplateDOM` JSON, and CODE-GENERATES the
 *             per-instance writer with `Function("data","state","index","_p","_f","_x", …)` at
 *             `compile.js:519`; `new Mikado(template, { root })` then constructs the FACTORY NODE
 *             (`mikado.js:496`, `this.factory = construct(...)` inside `mount`); and the first
 *             `view.create(data)` builds the vpath (`create_path`, `mikado.js:1101`) and caches it
 *             on the factory. THE THIRD OF THOSE IS A NODE BUILD AS WELL AS A COMPILE, so the
 *             mikado compile row CONTAINS ONE MIKADO BUILD and this axis prints the subtraction
 *             rather than hiding it: both numbers come out of this same run. Putting the first
 *             `create` in the warm-up instead would have charged the vpath to nobody.
 *             MIKADO'S BUILD IS UNUSUAL AND WORTH KNOWING BEFORE READING ITS ROW: `create` applies
 *             the data to the FACTORY node and clones it afterwards (`mikado.js:1114-1117`), so the
 *             path to each hole is resolved on one node forever instead of per instance. That is
 *             the mechanism `mount-phases.ts`' header names as the reason mikado mounts the 80-card
 *             app slightly faster than the schema core, and this axis is where it is priced alone.
 *
 *   exodra    `createExoSchema(build)` from `@exodra/core` followed by `exoDomSchemaOf(schema, backend)`
 *             from `@exodra/dom`. THAT PAIR IS OUR COMPILE: the first builds the description, the
 *             second is `compileExoDomSchema`, which emits the markup, parses it through a
 *             `<template>`, and compiles the walk table, the setter table and the element map.
 *             `exoDomSchemaOf` caches on `schema.domSchema`, so a fresh DECLARATION per repetition
 *             is what makes this a compile and not a cache hit — see the freshness note below.
 *             THE BUILD IS `mountExoInstance`'s body minus its insertion: `schema.acquireNode(schema)`,
 *             `schema.createInstance(schema)`, `createExoNode(...)` — the three lines of
 *             `packages/dom/src/dom/mountExoInstance.ts` that stand in front of its
 *             `parent.appendChild(root)`. It is a REPLICA, and a replica is a claim, so the shipped
 *             `mountExoInstance` is ALSO a row (`exodra·mount`) and the run refuses the replica by
 *             name when `exodra + insert` and `exodra·mount` disagree by more than this run
 *             resolved. What the replica leaves out besides the insertion is `mountExoInstance`'s
 *             `EXO_ARMED_INSTANCE` save/restore — one read and one store — and the `live.setMounted`
 *             null check; the self-check is what bounds them.
 *
 *   exodra·declared
 *             THE SAME LIBRARY IN THE SPELLING IT NOW SHIPS, and it is a second row rather than a
 *             replacement because the two are a different amount of work for the compiler. `exodra`
 *             above MINTS its ports: each one is created by the call that places it, so the
 *             declaration reaches `compileExoDomSchema` with `declaredPorts` at zero and the
 *             port-indexed tables are sized from that zero and widened as the ports arrive. This row
 *             declares the same ports through `exoPorts` first — IN THE MINTING ORDER, so both
 *             schemas address the tree through the same numbers — and the markup PLACES them
 *             (`d.attrPort(P.id, 'data-id')`) where the other CAPTURES them. Both rows run the same
 *             wire, over the same fifteen values, in the same order, and are gated against the same
 *             bytes. `exoPorts` is called INSIDE the timed compile region, because it runs once per
 *             component exactly as the declaration build and the schema compile do. FOUR of the six
 *             subjects carry the pair — CARD, TINY, DEEP and DENSE; EVENTS and SHELL do not, and
 *             the run says which and why by name rather than leaving the gap unmarked.
 *
 *   marko     NOT IN EITHER TABLE, and the run says so by name rather than leaving a hole. Marko 6
 *             compiles at BUILD TIME: `packages/benchmarks/vite.config.ts` carries a `marko()`
 *             plugin that hands every `.marko` file to `@marko/compiler`'s `compile(source, id,
 *             { output: 'dom', optimize: true, modules: 'esm' })` during the transform, so by the
 *             time anything runs in the browser there is no compiler left to call. There is no
 *             runtime compile to measure and this axis will not fabricate one. Its BUILD row is
 *             missing for a second, narrower reason: a comparable row needs a `.marko` file holding
 *             THIS axis's subject tree, and that file does not exist.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE SUBJECT — ONE TREE, DECLARED ONCE AS PROSE AND WRITTEN SIX TIMES BELOW
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 *   div.mc  ·  data-id
 *     div.mc-head
 *       h2.mc-title    → title            span.mc-sub → subtitle      span.mc-badge · data-state
 *     div.mc-body
 *       p.mc-lede      → lede
 *       div.mc-meta
 *         span.mc-author → author         time.mc-when · datetime → whenText
 *     ul.mc-rows
 *       li.mc-row × 6   ( span.mc-k "field"   span.mc-v → value )
 *     div.mc-foot
 *       span.mc-count  → count            span.mc-tail "tail"
 *
 * Thirty-two elements, fifteen interpolation points — twelve text and three attribute — four levels
 * of nesting, and a repeated region of six rows. Both counts are PRINTED BY THE CENSUS off the
 * structures themselves rather than taken from this comment, so a tree that drifts from this drawing
 * is visible in the output.
 *
 * THE SIX ROWS ARE WRITTEN OUT LITERALLY IN EVERY SPELLING, and that is a decision rather than
 * laziness. Each participant has list machinery of its own — mikado's `foreach` mounts a nested
 * view, our `childrenPort` takes a child component, stage0 ships a whole `reconcile` — and routing
 * the rows through those would make this axis a comparison of LIST ENGINES wearing a template
 * axis's name. The question asked here is what the TEMPLATE costs, so the repeated region is
 * repeated markup and every participant compiles the same thirty-two elements.
 *
 * EVERY DYNAMIC ATTRIBUTE STANDS BEHIND ITS ELEMENT'S STATIC ONES AND EACH ELEMENT CARRIES AT MOST
 * ONE. That is what makes the byte gate below passable at all: `setAttribute` APPENDS, so a
 * participant that holds a placeholder in its prototype and one that writes the attribute at build
 * time produce the same attribute order only under that rule. The existing participants already
 * prove the rule holds for three of the four DOM spellings — `apps/stage0/stage0.tsx` and
 * `apps/mikado/mikado.tsx` both carry a comment saying their dynamic attributes land after the
 * static `class`, and the markup gate on the app axes is what keeps those comments honest.
 *
 * THE SAME RULE IS WHAT LETS THE SERVER ROWS INTO THE SAME GATE. `compileExoStrSchema` emits a
 * cut — and therefore the hole an attribute writer fills — after the static attributes and before
 * the `>`; solid's compiler ends the piece at the same place and supplies the whole ` k="v"` from
 * `ssrAttribute`. A subject with two dynamic attributes on one element, or with one standing in
 * front of a static one, would put the server rows and the DOM rows in different orders and the
 * gate would throw.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE FAIRNESS GATE, AND THE AXIS REFUSES TO PRINT A RANKING WITHOUT IT
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Every participant builds one node from the SAME data, and every node's `outerHTML` is compared
 * BYTE FOR BYTE against the first. On a mismatch the run prints both lengths, the first differing
 * index and the twenty characters around it, and then throws: this suite has a standing rule that an
 * axis which cannot prove its participants did the same job may not publish a ranking, and six
 * spellings of one tree is precisely the arrangement in which one of them can quietly do less.
 *
 * THE SERVER ROWS ARE IN THAT SAME COMPARISON, against the same reference, rather than in a gate of
 * their own — because what that arrangement says is stronger: the bytes a server sends and the bytes
 * a browser builds are the same bytes. And they are in a SECOND gate of their own on top of it, the
 * rotation gate, because byte-identical output on one data set is exactly what a cache produces.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * FRESH TEMPLATES, BECAUSE A NAIVE COMPILE LOOP MEASURES A CACHE
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `exoDomSchemaOf` returns the schema already on `schema.domSchema` when there is one, so a loop
 * calling it on one declaration would time a field load. Reading the other three found no such cache
 * — stage0's `h` re-parses on every call, `Mikado.compile` builds a new `Template` each time (its own
 * source marks the structure cache "not supported by the inline compiler"), and `innerHTML` has none
 * — but "I did not find one" is a weaker statement than "there cannot be one", so EVERY participant gets a
 * FRESH TEMPLATE PER REPETITION and none of them is taken on trust. The templates differ in the
 * VALUE OF ONE STATIC ATTRIBUTE and in nothing else: a token appended to the root's `class`. The
 * shape, the element count, the port count and the character count are identical across variants,
 * so the variation cannot move the compile's work. THE VARIANT STRINGS ARE BUILT AT MODULE LOAD AND
 * INDEXED INSIDE THE REGION, so no participant pays a string concatenation another does not.
 *
 * ON THE SERVER SIDE THE CACHE IS KEYED DIFFERENTLY AND THE DEFENCE IS THE SAME. `exoStrSchemaOf`
 * hangs its schema on `machine.forms[backend.backendType]`, so a repeated call on one machine would
 * be an array read; every repetition therefore gets a declaration and a machine built in that same
 * region by `machineOf(createExoSchema(exoShape))`, and the `exodra·plan` row gets one built
 * untimed and used once. The floor's prepared form has no cache to defeat — it is an array literal —
 * and it rotates the variants anyway, for the same "I did not find one is weaker than there cannot be
 * one" reason the DOM rows do.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT WOULD MAKE THESE NUMBERS A LIE
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * 1. EVERY ROW IS THE WARM CASE. A compile run 128 times in a loop has warm inline caches, a warm
 *    parser and warm hidden classes; a real page compiles each component ONCE, cold. Every compile
 *    figure here is therefore a LOWER BOUND on what a page load pays, for every participant
 *    alike. Nothing in this file is a claim about a cold compile.
 *
 * 2. THE DEV SERVER DOES NOT TREAT THE PARTICIPANTS ALIKE. `vite.config.ts` puts `@exodra/core` and
 *    `@exodra/dom` in `optimizeDeps.exclude`, so they reach the page through the dev server's
 *    esbuild transform, while `mikado` and `stage0` are PRE-BUNDLED. That is the asymmetry
 *    `ssr-floor` names as its own caveat (1), and here it runs the other way: it favours the two
 *    third-party rows. The floor is in this package and goes through the same door as `@exodra/*`.
 *
 * 3. THE INSERTION IS NOT IN THE BUILD TABLE, AND THE ONE ROW THAT HAS IT SAYS SO. A built node is
 *    not yet in a document, and putting it there costs something — including, for the three
 *    participants whose prototype lives in a `<template>`'s inert document, the DOM's adopt walk
 *    over the whole inserted subtree (mikado's factory is built with `document.createElement` and
 *    is page-owned, so it pays no adoption). Keeping the insert out of the main table is what
 *    stops that ownership difference from being read as a template difference. `insert` prices it
 *    on its own, `exodra·mount` is the one row that contains it, and the self-check ties them.
 *
 * 4. THE HAND-WRITTEN ROWS WRITE TEXT THROUGH `.data`, MIKADO THROUGH `nodeValue`. Mikado's
 *    generated writer is `_o.n.nodeValue=_v` (`compile.js`, the `text` branch) and cannot be asked
 *    to do otherwise; the floor, its twin and stage0 use `.data`, which this repository measured as
 *    the cheaper door. That favours the hand-written rows by whatever the two differ by, which is
 *    small and is not priced here.
 *
 * 5. GC. A compile allocates a prototype tree and a build allocates an instance tree, and a tight
 *    loop does not surface the collection the allocation defers — the collector runs between
 *    samples, and the runner forces one before every region. Every row is flattered by that, and
 *    the ones that allocate most are flattered most. No arrangement of these phases fixes it.
 *
 * 6. `@exodra/string` IS PRE-BUNDLED AND THE SERVER FLOOR IS NOT. It is absent from
 *    `vite.config.ts`'s `optimizeDeps.exclude`, where `@exodra/core` and `@exodra/dom` are listed,
 *    so Vite's optimizer runs esbuild over it and its cross-module calls become intra-module ones
 *    while the hand-written rows go through the dev server's transform. `ssr-floor` names the same
 *    asymmetry as its caveat (1). IT FAVOURS OUR SERVER ROWS, so any gap the assemble table reports
 *    between `exodra` and `floor` is a LOWER bound. Adding `'@exodra/string'` to that exclude list
 *    removes it; that is a one-line change in a file this axis does not own.
 *
 * 7. `renderToString` SCHEDULES A `setTimeout` PER CALL and this axis calls it in a loop.
 *    `web/dist/server.js:168` opens a `createRoot(d => { setTimeout(d); … })`, so one disposal
 *    callback per document is queued and fires AFTER the region that made it — in whatever phase
 *    the rotation is running next. It is a foreign addend on somebody else's row rather than on
 *    solid's own, it lands in `p75` and `max` before it lands in a median, and it is the reason
 *    every figure here is read off `min`/`p25`/`median`. `solid·ssr` queues nothing.
 *
 * 8. `renderToString` LEAVES `sharedConfig.context` SET. It assigns the whole render context and
 *    then sets `noHydrate` on it, and never clears it. Nothing else in this axis reads
 *    `sharedConfig`, and every axis gets its own page load, so it changes no number here — but a
 *    Solid DOM participant added to THIS file later would find a hydration context standing.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE NULL, AND WHY IT IS THE FIRST THING TO READ AFTER A TABLE
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `floor·twin` is the floor DECLARED A SECOND TIME — its own `<template>` element, its own parse
 * function, its own build function, its own prototype — doing the same work on the same markup. Its
 * true difference from `floor` is ZERO BY CONSTRUCTION, so `|floor − floor·twin|` is what this run
 * could not tell apart, and every difference this axis reports is printed against it and refused by
 * name when it lands under it.
 *
 * THE TWO SERVER TABLES CARRY A NULL OF THEIR OWN AND IT IS A WEAKER ONE. A straight-line
 * concatenation and an array literal have no locals to rename, so each server twin is the SAME
 * expression compiled into a second function object with its own inline caches. It bounds what this
 * run could tell apart between two identical programs, which is not the same as what it could tell
 * apart between two different ones, and the resolution block says so where it prints them.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT THIS AXIS DOES NOT ANSWER
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Nothing about lists, keys or reconciliation. Nothing about teardown, memory, or bundle size.
 * Nothing about a component's CHILDREN: every subject here is one template, and a children port
 * filled by any of the six connector calls is a different axis.
 *
 * NOTHING ABOUT AN UPDATE ON ANY SUBJECT BUT THE CARD, and that is a gap with a name: the dense
 * subject would ask the same question at thirty-two writes over the same thirty-two elements,
 * which is the one extension worth having here, and it is not run. No figure from the card's
 * update table may be scaled to guess it.
 *
 * NOTHING ABOUT A SHELL ON ANY SUBJECT BUT THE CARD either, and nothing about a shell built from
 * ABSENT values rather than empty ones — `null` would be removed by two participants' writers and
 * written as a word by the floor's, which is three different trees and no comparison. That is a
 * different question and this axis does not ask it.
 *
 * NOTHING ABOUT A REAL CLICK. The event gates DISPATCH a `MouseEvent`, which is what proves the
 * handlers are live, but no timed region dispatches anything: what the event tables price is
 * ATTACHING handlers, never delivering an event to one. What a click COSTS under each strategy is
 * `op-click-floor`'s subject.
 *
 * AND ON THE SERVER SIDE, NOTHING ABOUT A REQUEST. No socket, no headers, no compression, no
 * hydration markers — solid is asked for its NON-HYDRATABLE output, which is what makes its bytes
 * comparable with everyone else's, and `renderToString` is therefore carrying a serializer that
 * this subject gives nothing to serialise. Nothing about a PAGE either: this is one component, and
 * `packages/benchmarks/ssr` is where whole applications are raced through real servers. Nothing
 * about escaping under load — every value in this subject takes every escaper's fast path, and
 * `ssr-floor`'s `esc·dirty` row is where data that does not is priced.
 *
 *     npm run axis --workspace=@exodra/benchmarks -- template-build
 *
 * It owns its own `PROGRAMS` and its own printer, so `--only` does not reach it. It honours the
 * third positional as `teardown-phases` does: `batch` multiplies every phase's repetition factor,
 * which is what the refusal line asks for by name. Batch 1 is the one to run. ONE AXIS AT A TIME.
 */

import h from 'stage0';
import Mikado from 'mikado';
import {
    escapeExoAttributeValue,
    escapeExoText,
    createExoSchema,
    EXO_PORT_ATTR,
    EXO_PORT_TEXT, // WHAT THE SECOND EXODRA ROW OF EVERY DOM TABLE IS SPELLED WITH. A declaration hands each port
    // its number before the markup runs, which is the one thing `compileExoDomSchema` cannot find out
    // for itself from a markup that mints.
    exoPorts, // WHAT COMPOSES AN AD-HOC PACK ONTO A BACKEND. `new ExoDomBackend()` takes no packs — every
    // shipped one is a `with*` decorator — so the delegated-events row's strategy is merged by
    // hand, exactly as `axes/list/toggle.tsx` merges its own. It MUTATES and returns the object it
    // is handed, so the delegated backend is ONE identity and the schema cache keys on it.
    composeExoPlugins,
    type TExoSchemaCursor,
    type TExoAttrPort,
    type TExoMachine,
    type TExoDeclaredPorts,
    type TExoEmitter,
    type TExoEventHandler,
    type TExoEventPort,
    type TExoFillDoors,
    type TExoPort,
    type TExoCursorDeclaration,
    type TExoTextPort,
} from '@exodra/core';
import {
    EXO_DIRECT_EVENTS,
    EXO_WALK_FIRST_CHILD,
    ExoDomBackend,
    createExoNode,
    createExoDelegatedEvents,
    createExoEventPortData,
    exoDomSchemaOf,
    exoEventSlotsFor,
    mountExoInstance,
    withExoHydration,
} from '@exodra/dom';
import type {
    TExoDomInstanceRecord,
    TExoDomNode,
    TExoDomSchema,
    TExoEventAttacher,
    TExoEventPortData,
    TExoEventsApi,
} from '@exodra/dom';
import { ExoStrBackend, exoStrSchemaOf, renderExoStrInstance } from '@exodra/string';
import type { TExoStrNode, TExoStrSchema } from '@exodra/string';
// THE DEEP PATH IS THE MECHANISM. `solid-js/web` resolves under this config's `resolve.conditions`
// to `web/dist/web.js`, where `ssr`, `escape`, `ssrAttribute` and `resolveSSRNode` are declared with
// EMPTY BODIES (lines 690-697) — `scripts/check-build-modes.mjs` pins that resolution. The server
// build is the sibling file and ships no declaration beside it, so its four signatures are
// re-declared below off its own source and CHECKED AT RUN TIME before anything is timed.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { escape, renderToString, ssr, ssrAttribute } from 'solid-js/web/dist/server.js';
import type { Scenario } from '../../../harness';
import type { TExoMachineInitialState } from '@exodra/core';
import { createExoMachineBuilder } from '@exodra/core';

const machineOf = (declaration: TExoCursorDeclaration<unknown>): TExoMachine<never> => ({
    declaration,
    forms: [],
    createInitialState: null,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
});

/* eslint-disable no-console */
const line = (s: string): void => console.log(`✅ ${s}`);
const refuse = (s: string): void => console.log(`❌ ${s}`);
/* eslint-enable no-console */

// ---------------------------------------------------------------------------------------
// THE VALUES. Every participant is handed this one object, so nothing below can be reading a
// cheaper string than its neighbour. No character in it changes an HTML serialisation.
// ---------------------------------------------------------------------------------------

interface TCardData {
    readonly id: string;
    readonly title: string;
    readonly subtitle: string;
    readonly state: string;
    readonly lede: string;
    readonly author: string;
    readonly when: string;
    readonly whenText: string;
    readonly v0: string;
    readonly v1: string;
    readonly v2: string;
    readonly v3: string;
    readonly v4: string;
    readonly v5: string;
    readonly count: string;
}

const DATA: TCardData = {
    id: '41',
    title: 'Quarterly revenue by region',
    subtitle: 'updated fourteen minutes ago',
    state: 'fresh',
    lede: 'Four regions grew and one contracted, and the contraction is the only one anybody has explained.',
    author: 'Dana Okonkwo',
    when: '2026-08-13T09:24:00Z',
    whenText: '13 August, 09:24',
    v0: '1,204',
    v1: '883',
    v2: '2,017',
    v3: '96',
    v4: '450',
    v5: '12,880',
    count: '6 fields',
};

/**
 * THE SECOND DATA SET, AND THE BUILD TABLE IS A RANKING ONLY BECAUSE IT EXISTS. Every one of the
 * fifteen values differs from `DATA`'s, and every build alternates between the two.
 *
 * WITH ONE DATA OBJECT THIS AXIS MEASURED MIKADO DOING NOTHING. Its compiler wraps every generated
 * write in `if (!_o.c || _o.c._t !== _v)` (`node_modules/mikado/src/compile.js`), and `create_path`
 * gives every path entry a live cache whenever a factory exists (`src/factory.js`) — so a second
 * build handed the same strings compares fifteen times, matches fifteen times and touches the DOM
 * on none of them. The floor, its twin, stage0 and exodra all write unconditionally, so they were
 * paying for a job mikado was skipping, and the row that read "below the floor" was a row that had
 * stopped rendering.
 *
 * THE CHARACTER COUNTS ARE MATCHED FIELD BY FIELD so alternating cannot change how much text the
 * DOM is handed — only whether it is the same text.
 */
const DATA_B: TCardData = {
    id: '58',
    title: 'Quarterly revenue by market',
    subtitle: 'updated thirteen minutes ago',
    state: 'stale',
    lede: 'Three regions grew and two contracted, and the contraction is the only one nobody has explained.',
    author: 'Dana Okonkova',
    when: '2026-08-14T09:24:00Z',
    whenText: '14 August, 09:24',
    v0: '1,205',
    v1: '884',
    v2: '2,018',
    v3: '97',
    v4: '451',
    v5: '12,881',
    count: '7 fields',
};

/**
 * WHAT A CARD READS INSTEAD OF A PROPS PARAMETER, BY INDEX. A wire is handed its POSITION and
 * nothing else, so every build function here files its datum at the position it is about to build —
 * always 0, because every row in this file builds one top-level card — an instant before the
 * builder runs the wire. The idiom is `reconcile-exo-children.test.ts`'s `BUILDING`.
 *
 * WHAT IT COSTS THE EXODRA ROWS AGAINST THE FLOOR, so the tables are read knowing it: ONE array
 * store before the call and ONE array load inside the wire, per BUILD — not per port. The floor and
 * the rivals take their datum as an argument and pay neither.
 */
const BUILDING: TCardData[] = [DATA];

/** Six, and the same six in every spelling — the repeated region, written out rather than looped
 *  through anybody's list engine. See the header's note on why. */
const ROWS = 6;

// ---------------------------------------------------------------------------------------
// THE VARIANTS. One token per repetition, appended to the root's `class` and changing nothing
// else. `padStart` keeps every variant the same character count, so the parser is handed the same
// number of bytes whichever one it gets.
// ---------------------------------------------------------------------------------------

const VARIANTS = 128;
const TOKENS: readonly string[] = Array.from(
    { length: VARIANTS },
    (_, i) => `v${String(i).padStart(4, '0')}`
);

// ---------------------------------------------------------------------------------------
// SPELLING 1 — THE NATIVE FLOOR'S MARKUP. No markers, no mustaches, no ports: the tree as a page
// author with no library would write it, with the dynamic attributes absent because a program with
// no library writes them at build time and nowhere else.
// ---------------------------------------------------------------------------------------

function plainMarkup(token: string): string {
    let rows = '';
    for (let r = 0; r < ROWS; r++) {
        rows += '<li class="mc-row"><span class="mc-k">field</span><span class="mc-v"></span></li>';
    }
    return (
        `<div class="mc ${token}">` +
        '<div class="mc-head">' +
        '<h2 class="mc-title"></h2>' +
        '<span class="mc-sub"></span>' +
        '<span class="mc-badge">new</span>' +
        '</div>' +
        '<div class="mc-body">' +
        '<p class="mc-lede"></p>' +
        '<div class="mc-meta">' +
        '<span class="mc-author"></span>' +
        '<time class="mc-when"></time>' +
        '</div>' +
        '</div>' +
        `<ul class="mc-rows">${rows}</ul>` +
        '<div class="mc-foot">' +
        '<span class="mc-count"></span>' +
        '<span class="mc-tail">tail</span>' +
        '</div>' +
        '</div>'
    );
}

const PLAIN: readonly string[] = TOKENS.map(plainMarkup);

// ---------------------------------------------------------------------------------------
// SPELLING 2 — STAGE0'S MARKUP. `#name` on an element is a reference to the ELEMENT; `#name` as
// the whole content of a text position is a reference to the TEXT NODE, which `collector` empties.
// ONE LINE AND NO INDENTATION: `h` turns a newline plus indentation into a `<!-- -->` comment node,
// which would put a node in this tree that no other participant emits and fail the byte gate.
// ---------------------------------------------------------------------------------------

function stage0Markup(token: string): string {
    let rows = '';
    for (let r = 0; r < ROWS; r++) {
        rows += `<li class="mc-row"><span class="mc-k">field</span><span class="mc-v">#v${r}</span></li>`;
    }
    return (
        `<div class="mc ${token}">` +
        '<div class="mc-head">' +
        '<h2 class="mc-title">#title</h2>' +
        '<span class="mc-sub">#subtitle</span>' +
        '<span class="mc-badge" #badge>new</span>' +
        '</div>' +
        '<div class="mc-body">' +
        '<p class="mc-lede">#lede</p>' +
        '<div class="mc-meta">' +
        '<span class="mc-author">#author</span>' +
        '<time class="mc-when" #when>#whenText</time>' +
        '</div>' +
        '</div>' +
        `<ul class="mc-rows">${rows}</ul>` +
        '<div class="mc-foot">' +
        '<span class="mc-count">#count</span>' +
        '<span class="mc-tail">tail</span>' +
        '</div>' +
        '</div>'
    );
}

/**
 * ONE TEMPLATE PIECE, WHICH IS WHAT A TAGGED TEMPLATE WITH NO INTERPOLATION HANDS `h`.
 *
 * `h` is `h(strings, ...args)` and its first line is `String.raw(strings, ...args)`, which reads
 * `strings.raw`. Building that object here rather than writing a backtick literal is what lets the
 * variant be CHOSEN inside the timed region by an array index instead of ASSEMBLED there by a
 * string concatenation nobody else pays — see the header's freshness note. The compile path stage0
 * then runs is the one a user gets, unchanged.
 *
 * IT ALSO PUTS THE MARKUP OUT OF PRETTIER'S REACH, which is not a small thing here: prettier
 * reformats HTML inside tagged template literals, and the last time it did that in this suite it
 * rewrote a participant's markup and left an axis unable to measure for seventeen hours. Every
 * markup string in this file is an ordinary concatenation for that reason.
 */
function onePiece(markup: string): TemplateStringsArray {
    const pieces: string[] = [markup];
    (pieces as unknown as { raw: readonly string[] }).raw = [markup];
    return pieces as unknown as TemplateStringsArray;
}

const STAGE0_PIECES: readonly TemplateStringsArray[] = TOKENS.map((t) => onePiece(stage0Markup(t)));

// ---------------------------------------------------------------------------------------
// SPELLING 3 — MIKADO'S MARKUP. `{{ data.x }}` in a text position is a text hole; in an attribute
// value it is a DYNAMIC ATTRIBUTE, which `factory.js` keeps off the factory node and writes with
// `setAttribute` at build time — behind the static `class`, which is the order this axis needs.
// None of these attribute names is in mikado's `event_types` table or in its three
// `idl_attributes` (`checked`, `selected`, `hidden`), so every one of them serialises.
// ---------------------------------------------------------------------------------------

function mikadoMarkup(token: string): string {
    let rows = '';
    for (let r = 0; r < ROWS; r++) {
        rows +=
            '<li class="mc-row"><span class="mc-k">field</span>' +
            `<span class="mc-v">{{ data.v${r} }}</span></li>`;
    }
    return (
        `<div class="mc ${token}" data-id="{{ data.id }}">` +
        '<div class="mc-head">' +
        '<h2 class="mc-title">{{ data.title }}</h2>' +
        '<span class="mc-sub">{{ data.subtitle }}</span>' +
        '<span class="mc-badge" data-state="{{ data.state }}">new</span>' +
        '</div>' +
        '<div class="mc-body">' +
        '<p class="mc-lede">{{ data.lede }}</p>' +
        '<div class="mc-meta">' +
        '<span class="mc-author">{{ data.author }}</span>' +
        '<time class="mc-when" datetime="{{ data.when }}">{{ data.whenText }}</time>' +
        '</div>' +
        '</div>' +
        `<ul class="mc-rows">${rows}</ul>` +
        '<div class="mc-foot">' +
        '<span class="mc-count">{{ data.count }}</span>' +
        '<span class="mc-tail">tail</span>' +
        '</div>' +
        '</div>'
    );
}

const MIKADO_MARKUP: readonly string[] = TOKENS.map(mikadoMarkup);

// ---------------------------------------------------------------------------------------
// THE NATIVE FLOOR — two independently declared programs over the same markup, so that the pair's
// difference is a reading of the instrument rather than of the programs.
//
// THE TWELVE EMPTY TEXT NODES ARE PART OF THE COMPILE AND NOT A FAVOUR TO THE BUILD. Every other
// participant's prototype carries a Text node at each text position — stage0's `collector` empties
// the marker's node rather than removing it, and `compileExoDomSchema` emits a placeholder for the
// same reason — so a floor that skipped them would be building a smaller tree and its build would
// be paying `createTextNode` fifteen times per instance instead of once per template.
// ---------------------------------------------------------------------------------------

const FLOOR_PARSER = document.createElement('template');

/**
 * THE COMPILE FLOOR, AND THE ONLY ONE THIS TABLE HAS. The job the compile table asks about is
 * "turn a template declaration into a prepared form", and a program with no abstraction doing that
 * for a DOM BUILDS THE TREE — it does not write a string in order to hand it to a parser and get a
 * tree back. So the floor is `createElement` and `appendChild`, straight through, twelve empty Text
 * nodes included because every participant's prototype carries them.
 *
 * `floorParseCompile` BELOW IS NOT A SECOND FLOOR AND IS NOT A ROW. It parses the markup string
 * this repository's own compiler emits, and it exists for ONE gate: that the tree built by hand
 * here is character-for-character the tree the parser produces from that markup. A table with two
 * floors cannot say which one bounds the job, and the one that parses is doing a job no
 * zero-abstraction program would choose.
 */
function floorCompile(token: string): Element {
    const el = (tag: string, cls: string): Element => {
        const node = document.createElement(tag);
        node.className = cls;
        return node;
    };
    const text = (into: Element, value: string): Element => {
        into.appendChild(document.createTextNode(value));
        return into;
    };

    const root = el('div', `mc ${token}`);

    const head = el('div', 'mc-head');
    head.appendChild(text(el('h2', 'mc-title'), ''));
    head.appendChild(text(el('span', 'mc-sub'), ''));
    head.appendChild(text(el('span', 'mc-badge'), 'new'));
    root.appendChild(head);

    const body = el('div', 'mc-body');
    body.appendChild(text(el('p', 'mc-lede'), ''));
    const meta = el('div', 'mc-meta');
    meta.appendChild(text(el('span', 'mc-author'), ''));
    meta.appendChild(text(el('time', 'mc-when'), ''));
    body.appendChild(meta);
    root.appendChild(body);

    const list = el('ul', 'mc-rows');
    for (let r = 0; r < ROWS; r++) {
        const li = el('li', 'mc-row');
        li.appendChild(text(el('span', 'mc-k'), 'field'));
        li.appendChild(text(el('span', 'mc-v'), ''));
        list.appendChild(li);
    }
    root.appendChild(list);

    const foot = el('div', 'mc-foot');
    foot.appendChild(text(el('span', 'mc-count'), ''));
    foot.appendChild(text(el('span', 'mc-tail'), 'tail'));
    root.appendChild(foot);

    return root;
}

/** THE GATE'S REFERENCE AND NOTHING ELSE — see `floorCompile` above for why it is not a row. */
function floorParseCompile(markup: string): Element {
    FLOOR_PARSER.innerHTML = markup;
    const root = FLOOR_PARSER.content.firstElementChild as Element;
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    title.appendChild(document.createTextNode(''));
    const sub = title.nextSibling as Element;
    sub.appendChild(document.createTextNode(''));
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    lede.appendChild(document.createTextNode(''));
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    author.appendChild(document.createTextNode(''));
    const when = meta.lastChild as Element;
    when.appendChild(document.createTextNode(''));
    const list = body.nextSibling as Element;
    let li = list.firstChild as Element;
    for (let r = 0; r < ROWS; r++) {
        (li.lastChild as Element).appendChild(document.createTextNode(''));
        li = li.nextSibling as Element;
    }
    const foot = root.lastChild as Element;
    (foot.firstChild as Element).appendChild(document.createTextNode(''));
    return root;
}

interface TFloorRefs {
    readonly root: Element;
    readonly badge: Element;
    readonly when: Element;
    readonly titleText: Text;
    readonly subText: Text;
    readonly ledeText: Text;
    readonly authorText: Text;
    readonly whenText: Text;
    readonly v0: Text;
    readonly v1: Text;
    readonly v2: Text;
    readonly v3: Text;
    readonly v4: Text;
    readonly v5: Text;
    readonly countText: Text;
}

/**
 * THE FLOOR FOR THE JOB EVERY OTHER ROW DOES — it fills AND KEEPS the fifteen addresses, because
 * a filled node nobody can reach again is not what a renderer builds.
 *
 * `floor·once` below fills the same bytes and keeps NOTHING: its landings are locals and they are
 * gone when it returns, so a later write has to walk the whole chain from the root again. That is a
 * smaller job, and it was the only floor this table had — which made every row above it look like
 * it was paying for slowness when it was paying for an address that survives.
 *
 * The refs object is the floor's honest spelling of an addressing table: fifteen named fields, no
 * numbering, no indirection, no way for anything to re-point one. stage0 pays a `TreeWalker` roll
 * to fill its own; exodra pays a walk into a numbered array. All three keep what they reach.
 */
function floorKeepBuild(proto: Element, d: TCardData, into: TFloorRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    const titleText = title.firstChild as Text;
    titleText.data = d.title;
    const sub = title.nextSibling as Element;
    const subText = sub.firstChild as Text;
    subText.data = d.subtitle;
    const badge = head.lastChild as Element;
    badge.setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    const ledeText = lede.firstChild as Text;
    ledeText.data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    const authorText = author.firstChild as Text;
    authorText.data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    const whenText = when.firstChild as Text;
    whenText.data = d.whenText;
    const list = body.nextSibling as Element;
    let li = list.firstChild as Element;
    const v0 = (li.lastChild as Element).firstChild as Text;
    v0.data = d.v0;
    li = li.nextSibling as Element;
    const v1 = (li.lastChild as Element).firstChild as Text;
    v1.data = d.v1;
    li = li.nextSibling as Element;
    const v2 = (li.lastChild as Element).firstChild as Text;
    v2.data = d.v2;
    li = li.nextSibling as Element;
    const v3 = (li.lastChild as Element).firstChild as Text;
    v3.data = d.v3;
    li = li.nextSibling as Element;
    const v4 = (li.lastChild as Element).firstChild as Text;
    v4.data = d.v4;
    li = li.nextSibling as Element;
    const v5 = (li.lastChild as Element).firstChild as Text;
    v5.data = d.v5;
    const foot = list.nextSibling as Element;
    const countText = (foot.firstChild as Element).firstChild as Text;
    countText.data = d.count;
    into.push({
        root,
        badge,
        when,
        titleText,
        subText,
        ledeText,
        authorText,
        whenText,
        v0,
        v1,
        v2,
        v3,
        v4,
        v5,
        countText,
    });
    return root;
}
// ── THE TWIN, whose true difference from the two functions above is ZERO ─────────────────────
//
// IT IS NOT A SECOND FLOOR. It is the resolution pair: the same program written a second time
// under different names, so that `|floor − floor·twin|` is a reading of the INSTRUMENT and not of
// two programs. When the compile floor stopped parsing, this had to stop parsing too — a twin that
// does a different job from the row it is a twin of measures nothing.

function twinCompile(token: string): Element {
    const make = (tag: string, cls: string): Element => {
        const node = document.createElement(tag);
        node.className = cls;
        return node;
    };
    const filled = (into: Element, value: string): Element => {
        into.appendChild(document.createTextNode(value));
        return into;
    };

    const node = make('div', `mc ${token}`);

    const top = make('div', 'mc-head');
    top.appendChild(filled(make('h2', 'mc-title'), ''));
    top.appendChild(filled(make('span', 'mc-sub'), ''));
    top.appendChild(filled(make('span', 'mc-badge'), 'new'));
    node.appendChild(top);

    const mid = make('div', 'mc-body');
    mid.appendChild(filled(make('p', 'mc-lede'), ''));
    const pair = make('div', 'mc-meta');
    pair.appendChild(filled(make('span', 'mc-author'), ''));
    pair.appendChild(filled(make('time', 'mc-when'), ''));
    mid.appendChild(pair);
    node.appendChild(mid);

    const bag = make('ul', 'mc-rows');
    for (let r = 0; r < ROWS; r++) {
        const item = make('li', 'mc-row');
        item.appendChild(filled(make('span', 'mc-k'), 'field'));
        item.appendChild(filled(make('span', 'mc-v'), ''));
        bag.appendChild(item);
    }
    node.appendChild(bag);

    const bottom = make('div', 'mc-foot');
    bottom.appendChild(filled(make('span', 'mc-count'), ''));
    bottom.appendChild(filled(make('span', 'mc-tail'), 'tail'));
    node.appendChild(bottom);

    return node;
}
// ---------------------------------------------------------------------------------------
// STAGE0.
// ---------------------------------------------------------------------------------------

type TStage0Template = ReturnType<typeof h>;

/** What `collect` hands back for this template. stage0 types its refs object with an index
 *  signature, so every call site in this suite casts — `apps/stage0/stage0.tsx` does the same. */
interface TStage0Refs {
    readonly title: Text;
    readonly subtitle: Text;
    readonly badge: Element;
    readonly lede: Text;
    readonly author: Text;
    readonly when: Element;
    readonly whenText: Text;
    readonly v0: Text;
    readonly v1: Text;
    readonly v2: Text;
    readonly v3: Text;
    readonly v4: Text;
    readonly v5: Text;
    readonly count: Text;
}

function stage0Build(tpl: TStage0Template, d: TCardData): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TStage0Refs;
    node.setAttribute('data-id', d.id);
    refs.title.data = d.title;
    refs.subtitle.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.lede.data = d.lede;
    refs.author.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.count.data = d.count;
    return node;
}

// ---------------------------------------------------------------------------------------
// MIKADO. `new Mikado(template, { root })` is what constructs the factory eagerly — the
// constructor's last branch is `if(this.root) this.mount(this.root)`, and `mount` is where
// `this.factory = construct(...)` stands. Without a root the factory is built lazily inside the
// first `create`, which would move a once-per-template cost into the build table.
// ---------------------------------------------------------------------------------------

type TMikadoTemplate = ReturnType<typeof Mikado.compile>;
/** `mikado` ships `export = Mikado`, so the class's TYPE meaning does not reliably survive the
 *  default import the value comes through. Named off the constructor instead. */
type TMikadoView = InstanceType<typeof Mikado>;

function mikadoCompile(markup: string, root: HTMLElement): TMikadoView {
    const template: TMikadoTemplate = Mikado.compile(markup);
    const view = new Mikado(template, { root });
    // THE VPATH, AND IT IS A COMPILE STEP WEARING A BUILD STEP'S NAME. `create_path` runs inside the
    // first `create` and caches on the factory node, so it happens once per template and never
    // again — but the only way to reach it is through a call that also clones and fills a node.
    // Charging it here and printing the subtraction is the honest form; leaving it in the warm-up
    // would charge it to nobody.
    view.create(DATA);
    return view;
}

function mikadoBuild(view: TMikadoView, d: TCardData): Element {
    return view.create(d);
}

// ---------------------------------------------------------------------------------------
// EXODRA. The shape is declared ONCE, as a module-level function, and the variant reaches it
// through a module-level token rather than through a closure built per repetition — so this row
// allocates nothing inside the timed region that the other three do not.
// ---------------------------------------------------------------------------------------

interface TCardPorts {
    readonly id: TExoAttrPort;
    readonly title: TExoTextPort;
    readonly subtitle: TExoTextPort;
    readonly state: TExoAttrPort;
    readonly lede: TExoTextPort;
    readonly author: TExoTextPort;
    readonly when: TExoAttrPort;
    readonly whenText: TExoTextPort;
    readonly v0: TExoTextPort;
    readonly v1: TExoTextPort;
    readonly v2: TExoTextPort;
    readonly v3: TExoTextPort;
    readonly v4: TExoTextPort;
    readonly v5: TExoTextPort;
    readonly count: TExoTextPort;
}

let EXO_TOKEN = TOKENS[0];

const exoShape = (b: TExoSchemaCursor): TCardPorts => {
    let id!: TExoAttrPort;
    let title!: TExoTextPort;
    let subtitle!: TExoTextPort;
    let state!: TExoAttrPort;
    let lede!: TExoTextPort;
    let author!: TExoTextPort;
    let when!: TExoAttrPort;
    let whenText!: TExoTextPort;
    let count!: TExoTextPort;
    const vs: TExoTextPort[] = [];
    b.el('div', { class: `mc ${EXO_TOKEN}` }, (card) => {
        id = card.port('data-id');
        card.el('div', { class: 'mc-head' }, (head) => {
            head.el('h2', { class: 'mc-title' }, (n) => {
                title = n.textPort();
            });
            head.el('span', { class: 'mc-sub' }, (n) => {
                subtitle = n.textPort();
            });
            head.el('span', { class: 'mc-badge' }, (n) => {
                state = n.port('data-state');
                n.text('new');
            });
        });
        card.el('div', { class: 'mc-body' }, (body) => {
            body.el('p', { class: 'mc-lede' }, (n) => {
                lede = n.textPort();
            });
            body.el('div', { class: 'mc-meta' }, (meta) => {
                meta.el('span', { class: 'mc-author' }, (n) => {
                    author = n.textPort();
                });
                meta.el('time', { class: 'mc-when' }, (n) => {
                    when = n.port('datetime');
                    whenText = n.textPort();
                });
            });
        });
        card.el('ul', { class: 'mc-rows' }, (list) => {
            for (let r = 0; r < ROWS; r++) {
                list.el('li', { class: 'mc-row' }, (row) => {
                    row.el('span', { class: 'mc-k' }, (n) => {
                        n.text('field');
                    });
                    row.el('span', { class: 'mc-v' }, (n) => {
                        vs.push(n.textPort());
                    });
                });
            }
        });
        card.el('div', { class: 'mc-foot' }, (foot) => {
            foot.el('span', { class: 'mc-count' }, (n) => {
                count = n.textPort();
            });
            foot.el('span', { class: 'mc-tail' }, (n) => {
                n.text('tail');
            });
        });
    });
    return {
        id,
        title,
        subtitle,
        state,
        lede,
        author,
        when,
        whenText,
        v0: vs[0],
        v1: vs[1],
        v2: vs[2],
        v3: vs[3],
        v4: vs[4],
        v5: vs[5],
        count,
    };
};

/**
 * THE WIRE FILLS FIFTEEN PORTS AND WATCHES NOTHING. It is typed `TExoWire<TExoDomNode>`, and there
 * is no second type argument to give it: `TExoDomWire` is gone, and `TExoWire`'s second parameter is
 * what a wire RETURNS, which this one does not. What is measured here is a template being filled,
 * not a subscription being made.
 */
const exoWireOf =
    (P: TCardPorts): TExoMachineInitialState<TExoDomNode> =>
    (c, i) => {
        const d = BUILDING[i];
        c.attr(P.id, d.id);
        c.text(P.title, d.title);
        c.text(P.subtitle, d.subtitle);
        c.attr(P.state, d.state);
        c.text(P.lede, d.lede);
        c.text(P.author, d.author);
        c.attr(P.when, d.when);
        c.text(P.whenText, d.whenText);
        c.text(P.v0, d.v0);
        c.text(P.v1, d.v1);
        c.text(P.v2, d.v2);
        c.text(P.v3, d.v3);
        c.text(P.v4, d.v4);
        c.text(P.v5, d.v5);
        c.text(P.count, d.count);
    };

/** ONE backend for the process, because `exoDomSchemaOf` keys its cache by POINTER: a backend built
 *  per repetition would make every schema a fresh compile for a reason that is not the template. */
const EXO_BACKEND = new ExoDomBackend();

const EXO_CARD_SCHEMA = createExoSchema(exoShape);
const mEXO_CARD = createExoMachineBuilder<TExoDomNode>(EXO_CARD_SCHEMA);
mEXO_CARD.createInitialState(exoWireOf(EXO_CARD_SCHEMA.ports));
const EXO_CARD = mEXO_CARD.done();
/** `createExoMachineBuilder` hands the schema's ports to the wire FACTORY, and keeps them on the schema; the
 *  update rows fill through the same fifteen objects the wire does, by the same numbers. */
const EXO_PORTS: TCardPorts = EXO_CARD_SCHEMA.ports;
const EXO_PLAN: TExoDomSchema = exoDomSchemaOf(EXO_CARD, EXO_BACKEND);

function exodraCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    return exoDomSchemaOf(machineOf(createExoSchema(exoShape)), EXO_BACKEND);
}

/**
 * `mountExoInstance` WITHOUT ITS INSERTION — the three lines that stand in front of its
 * `parent.appendChild(root)`. See the header for what else it leaves out and for the self-check
 * that bounds it.
 */
function exodraBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EXO_PLAN.acquireNode(EXO_PLAN);
    const record = EXO_PLAN.createInstance(EXO_PLAN);
    createExoNode(EXO_PLAN, root, EXO_CARD, 0, null, record, null);
    return root;
}

// ---------------------------------------------------------------------------------------
// ADOPTION — the third thing a template engine can do with a card, after compiling one and
// building one: take a card the SERVER printed and end holding the same addresses a build ends
// holding, so the next data change writes through them.
//
// WHY THESE ROWS LIVE IN THIS FILE AND NOT IN `hydrate-floor`: this axis already gates every
// participant of a subject to the SAME BYTES (`gateBytes`), so one served string can be handed to
// all of them and the comparison is of adoption and nothing else. `hydrate-floor`'s subject is an
// Exodra component whose markup Exodra's own string backend prints, so a rival there would have to
// bring its own template and re-prove byte-identity from scratch. What this placement gives up is
// that file's size sweep and its `parseSits` field, and the two answers it exists to keep apart are
// carried here by a pair of phases instead.
//
// AND WHAT THE `exodra` ROW CARRIES THAT `mikado`'s DOES NOT: hydration is a PLUGIN, so this row
// runs on a COMPOSED backend while every other exodra row in this file runs on the bare one. The
// price of that composition is not hydration's and is measured on its own by
// `exodra·merged − exodra·direct` in the EVENTS table; subtract it there before reading this row as
// the cost of adopting.
// ---------------------------------------------------------------------------------------

const EXO_HYDRATE_BACKEND = withExoHydration(new ExoDomBackend());

/**
 * THE API LIMIT THIS ROW ONCE RAN INTO IS GONE, AND SO IS THE ASYMMETRY IT CREATED. There are no
 * props anywhere: a wire's only argument is its index, so `hydrate(component, parent)` hands a wire
 * exactly what a build hands it, and every exodra row in this file — not just the adopted one — now
 * reaches its data through that index. This wire is kept separate from `exoWireOf` only because it
 * picks its datum by PARITY rather than out of `BUILDING`, which is what lets one served string be
 * adopted without a build having filed anything.
 */
const exoIndexWireOf =
    (P: TCardPorts): TExoMachineInitialState<TExoDomNode> =>
    (c, i) => {
        const d = i & 1 ? DATA_B : DATA;
        c.attr(P.id, d.id);
        c.text(P.title, d.title);
        c.text(P.subtitle, d.subtitle);
        c.attr(P.state, d.state);
        c.text(P.lede, d.lede);
        c.text(P.author, d.author);
        c.attr(P.when, d.when);
        c.text(P.whenText, d.whenText);
        c.text(P.v0, d.v0);
        c.text(P.v1, d.v1);
        c.text(P.v2, d.v2);
        c.text(P.v3, d.v3);
        c.text(P.v4, d.v4);
        c.text(P.v5, d.v5);
        c.text(P.count, d.count);
    };

const EXO_HYDRATE_CARD_SCHEMA = createExoSchema(exoShape);
const mEXO_HYDRATE_CARD = createExoMachineBuilder<TExoDomNode>(EXO_HYDRATE_CARD_SCHEMA);
mEXO_HYDRATE_CARD.createInitialState(exoIndexWireOf(EXO_HYDRATE_CARD_SCHEMA.ports));
const EXO_HYDRATE_CARD = mEXO_HYDRATE_CARD.done();

/**
 * THE FLOOR FOR ADOPTION — the same walk `floorKeepBuild` performs, with the clone and the fifteen
 * writes removed, because the server already wrote them. It ends holding the same fifteen
 * addresses in the same record shape, so `floorUpdate` drives it unchanged and the hydrate+update
 * pair below costs what a hand-written program costs.
 */
function floorAdopt(root: Element, into: TFloorRefs[]): void {
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    const titleText = title.firstChild as Text;
    const sub = title.nextSibling as Element;
    const subText = sub.firstChild as Text;
    const badge = head.lastChild as Element;
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    const ledeText = lede.firstChild as Text;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    const authorText = author.firstChild as Text;
    const when = meta.lastChild as Element;
    const whenText = when.firstChild as Text;
    const list = body.nextSibling as Element;
    let li = list.firstChild as Element;
    const v0 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v1 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v2 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v3 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v4 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v5 = (li.lastChild as Element).firstChild as Text;
    const foot = list.nextSibling as Element;
    const countText = (foot.firstChild as Element).firstChild as Text;
    into.push({
        root,
        badge,
        when,
        titleText,
        subText,
        ledeText,
        authorText,
        whenText,
        v0,
        v1,
        v2,
        v3,
        v4,
        v5,
        countText,
    });
}

// SEPARATELY DECLARED, which is this file's rule for a null: a second call to one function shares
// every inline cache that function has and would report the instrument as quieter than it is.
function floorAdoptTwin(root: Element, into: TFloorRefs[]): void {
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    const titleText = title.firstChild as Text;
    const sub = title.nextSibling as Element;
    const subText = sub.firstChild as Text;
    const badge = head.lastChild as Element;
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    const ledeText = lede.firstChild as Text;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    const authorText = author.firstChild as Text;
    const when = meta.lastChild as Element;
    const whenText = when.firstChild as Text;
    const list = body.nextSibling as Element;
    let li = list.firstChild as Element;
    const v0 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v1 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v2 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v3 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v4 = (li.lastChild as Element).firstChild as Text;
    li = li.nextSibling as Element;
    const v5 = (li.lastChild as Element).firstChild as Text;
    const foot = list.nextSibling as Element;
    const countText = (foot.firstChild as Element).firstChild as Text;
    into.push({
        root,
        badge,
        when,
        titleText,
        subText,
        ledeText,
        authorText,
        whenText,
        v0,
        v1,
        v2,
        v3,
        v4,
        v5,
        countText,
    });
}

/** `hydrate` adopts `parent.firstElementChild` — ONE top-level instance, which is why every
 *  container below holds exactly one card. */
function exodraAdopt(container: Element): () => void {
    return EXO_HYDRATE_BACKEND.hydrate(EXO_HYDRATE_CARD, container);
}

/**
 * `mount(target, true)` IS mikado's whole adoption: `this.dom = collection_to_array(target.children)`
 * and, when it has no factory yet, `this.factory = this.dom[0].cloneNode(true)`
 * (`node_modules/mikado/src/mikado.js:409` and `:478`). It walks no node and restores no address —
 * its per-node addressing is `create_path`, which runs inside the FIRST `create`/update. That is
 * why every row here has a `+update¹` twin: without it this row prices a deferral as an adoption.
 */
function mikadoAdopt(view: TMikadoView, container: HTMLElement): void {
    view.mount(container, true);
}

/**
 * THE SAME MARKUP WITH ITS PORTS DECLARED BEFORE THE COMPILER STARTS — the form this library
 * ships, standing beside the minting form above rather than replacing it, because the two are a
 * DIFFERENT AMOUNT OF WORK for the compiler and a table with one row cannot say which.
 *
 * `exoShape` MINTS: each port is created by the call that places it, so
 * `createExoSchema(exoShape)` hands `compileExoDomSchema` a schema whose `declaredPorts` is 0 and
 * whose `portList` is empty. That constructor sizes its port-indexed tables from exactly that
 * number, and `widen` reallocates and copies them as the ports arrive. Declared, the count is known
 * before the markup runs and each table is allocated once, at fifteen.
 *
 * THE DECLARATION IS IN THE MINTING ORDER, so the two schemas address the same tree through the same
 * fifteen numbers: a declared port's number is its place in `exoPorts`, and a minted one's is the
 * order its call arrives in, which for this markup is document order.
 *
 * USERS HAVE CODE SHAPED LIKE BOTH, which is why neither row is the axis's "exodra" on its own.
 */
const EXO_DECLARED_MARKS = {
    id: EXO_PORT_ATTR,
    title: EXO_PORT_TEXT,
    subtitle: EXO_PORT_TEXT,
    state: EXO_PORT_ATTR,
    lede: EXO_PORT_TEXT,
    author: EXO_PORT_TEXT,
    when: EXO_PORT_ATTR,
    whenText: EXO_PORT_TEXT,
    v0: EXO_PORT_TEXT,
    v1: EXO_PORT_TEXT,
    v2: EXO_PORT_TEXT,
    v3: EXO_PORT_TEXT,
    v4: EXO_PORT_TEXT,
    v5: EXO_PORT_TEXT,
    count: EXO_PORT_TEXT,
} as const;

type TExoDeclaredCardPorts = TExoDeclaredPorts<typeof EXO_DECLARED_MARKS>;

/**
 * A FACTORY AND NOT A MODULE-LEVEL FUNCTION, because the compile row below declares its ports
 * INSIDE its timed region — see `exodraDeclaredCompile` for why — and the markup has to place the
 * ports of the declaration it is being compiled with. The six-element array is the one `exoShape`
 * allocates too, and it is allocated here once per compile, as that one is.
 */
const exoDeclaredShapeOf =
    (P: TExoDeclaredCardPorts) =>
    (b: TExoEmitter<TExoDeclaredCardPorts>): void => {
        const vs: readonly TExoTextPort[] = [P.v0, P.v1, P.v2, P.v3, P.v4, P.v5];
        b.el('div', { class: `mc ${EXO_TOKEN}` }, (card) => {
            card.attrPort(P.id, 'data-id');
            card.el('div', { class: 'mc-head' }, (head) => {
                head.el('h2', { class: 'mc-title' }, (n) => {
                    n.textPort(P.title);
                });
                head.el('span', { class: 'mc-sub' }, (n) => {
                    n.textPort(P.subtitle);
                });
                head.el('span', { class: 'mc-badge' }, (n) => {
                    n.attrPort(P.state, 'data-state');
                    n.text('new');
                });
            });
            card.el('div', { class: 'mc-body' }, (body) => {
                body.el('p', { class: 'mc-lede' }, (n) => {
                    n.textPort(P.lede);
                });
                body.el('div', { class: 'mc-meta' }, (meta) => {
                    meta.el('span', { class: 'mc-author' }, (n) => {
                        n.textPort(P.author);
                    });
                    meta.el('time', { class: 'mc-when' }, (n) => {
                        n.attrPort(P.when, 'datetime');
                        n.textPort(P.whenText);
                    });
                });
            });
            card.el('ul', { class: 'mc-rows' }, (list) => {
                for (let r = 0; r < ROWS; r++) {
                    list.el('li', { class: 'mc-row' }, (row) => {
                        row.el('span', { class: 'mc-k' }, (n) => {
                            n.text('field');
                        });
                        row.el('span', { class: 'mc-v' }, (n) => {
                            n.textPort(vs[r]);
                        });
                    });
                }
            });
            card.el('div', { class: 'mc-foot' }, (foot) => {
                foot.el('span', { class: 'mc-count' }, (n) => {
                    n.textPort(P.count);
                });
                foot.el('span', { class: 'mc-tail' }, (n) => {
                    n.text('tail');
                });
            });
        });
    };

/** THE WIRE IS `exoWireOf`, UNCHANGED AND UNCOPIED. The declared record has the same fifteen
 *  fields under the same fifteen names, so both rows fill the same values in the same order
 *  through the same function — which is what makes them one job with two spellings. */
const EXO_DECLARED_PORTS: TExoDeclaredCardPorts = exoPorts(EXO_DECLARED_MARKS);
const EXO_DECLARED_CARD: TExoMachine<TExoDomNode, TExoDeclaredCardPorts> = {
    declaration: createExoSchema(EXO_DECLARED_PORTS, exoDeclaredShapeOf(EXO_DECLARED_PORTS)),
    forms: [],
    createInitialState: exoWireOf(EXO_DECLARED_PORTS),
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const EXO_DECLARED_PLAN: TExoDomSchema = exoDomSchemaOf(EXO_DECLARED_CARD, EXO_BACKEND);

/**
 * `exoPorts` IS INSIDE THE TIMED REGION, and that is the conservative choice rather than a
 * convenience. It runs once per component, exactly as the declaration build and the schema compile
 * do, so a COMPILE figure that left it out would be a figure no user ever pays. It also allocates
 * the same fifteen port objects the minting compile allocates inside `compileExoDomSchema`, so that
 * term cancels between the two rows; the axis prints the rest of the accounting, in both directions,
 * beside the subtraction.
 */
function exodraDeclaredCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    const P = exoPorts(EXO_DECLARED_MARKS);
    return exoDomSchemaOf(machineOf(createExoSchema(P, exoDeclaredShapeOf(P))), EXO_BACKEND);
}

function exodraDeclaredBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EXO_DECLARED_PLAN.acquireNode(EXO_DECLARED_PLAN);
    const record = EXO_DECLARED_PLAN.createInstance(EXO_DECLARED_PLAN);
    createExoNode(EXO_DECLARED_PLAN, root, EXO_DECLARED_CARD, 0, null, record, null);
    return root;
}

/**
 * THE LADDER THAT SPLITS THE `exodra` ROW. Ranking told us we are last and said nothing about
 * which of the four things a build does is where it goes, so these three rungs are the same build
 * with its tail cut off, and every gap between two neighbours is ONE of them:
 *
 *   ·clone         `acquireNode` alone — the term the floor pays too, so it should cancel
 *   ·clone+walk    + the 42-hop replay into a nodes array. It was TRANSCRIBED from
 *                  `createExoWiredNode`, WHICH IS DELETED; the loop it copied is now
 *                  `createExoMachineNode`'s, and the replica below is still line-for-line that loop
 *   ·clone+record  + `createInstance`, without the walk, so the record's own price is readable
 *   exodra         the whole thing
 *
 * THE WALK IS A COPY AND THAT IS A HAZARD, the same one `mount-phases` names about its own replica:
 * if the shipped loop changes and this does not, the rung stops describing the renderer. There is
 * no way to reach the loop without also running the wire, which is the thing being subtracted.
 */
const EXO_LADDER_NODES: Node[] = [];

/**
 * THE BUILD WITH ITS INSTANCE KEPT, AND THE SHIPPED DOOR IT UPDATES THROUGH.
 *
 * `fillDoors()` is `TExoBaseNodeMethods`' own accessor and it hands back the instance record
 * itself (`EXO_BASE_NODE_VOCABULARY`: `fillDoors() { return this; }`). THE MECHANISM THIS ROW USED
 * TO NAME IS GONE: there is no fill stamp, no per-depth frame, and no `finally` emptying one —
 * `createExoWiredNode`, which held that frame, is deleted, and `createExoMachineNode` records
 * nothing per write. `TExoFillDoors`' own declaration still says "A call after the wire records
 * nothing", and on this backend that is now literal: `attr` and `text` are one setter call each,
 * with no sweep of unfilled ports to race, because the compiler bakes an unfilled port's blank into
 * the prototype. So driving a port after the build is a plain write, which is what this row times
 * and what `axes/list/toggle.tsx`'s `exodraDirectKept` row uses.
 *
 * NO REPLICA IS INVOLVED: the update below calls the same `attr`/`text` a wire calls, through the
 * same table, on the same record. What it skips is the wire — which is the point, because an
 * update is not a wiring.
 */
interface TExodraKept {
    readonly node: Element;
    readonly doors: TExoFillDoors;
}

function exodraKeepBuild(d: TCardData): TExodraKept {
    BUILDING[0] = d;
    const root = EXO_PLAN.acquireNode(EXO_PLAN);
    const record = EXO_PLAN.createInstance(EXO_PLAN);
    createExoNode(EXO_PLAN, root, EXO_CARD, 0, null, record, null);
    return { node: root, doors: (record as unknown as TExoDomNode).fillDoors() };
}

function exodraUpdate(kept: TExodraKept, d: TCardData): void {
    const c = kept.doors;
    c.attr(EXO_PORTS.id, d.id);
    c.text(EXO_PORTS.title, d.title);
    c.text(EXO_PORTS.subtitle, d.subtitle);
    c.attr(EXO_PORTS.state, d.state);
    c.text(EXO_PORTS.lede, d.lede);
    c.text(EXO_PORTS.author, d.author);
    c.attr(EXO_PORTS.when, d.when);
    c.text(EXO_PORTS.whenText, d.whenText);
    c.text(EXO_PORTS.v0, d.v0);
    c.text(EXO_PORTS.v1, d.v1);
    c.text(EXO_PORTS.v2, d.v2);
    c.text(EXO_PORTS.v3, d.v3);
    c.text(EXO_PORTS.v4, d.v4);
    c.text(EXO_PORTS.v5, d.v5);
    c.text(EXO_PORTS.count, d.count);
}

function exodraCloneOnly(): Element {
    return EXO_PLAN.acquireNode(EXO_PLAN);
}

function exodraCloneWalk(): Element {
    const root = EXO_PLAN.acquireNode(EXO_PLAN);
    const walk = EXO_PLAN.walk;
    const nodes: Node[] = [root];
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === EXO_WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
    EXO_LADDER_NODES[0] = nodes[nodes.length - 1];
    return root;
}

function exodraCloneRecord(): Element {
    const root = EXO_PLAN.acquireNode(EXO_PLAN);
    EXO_LADDER_NODES[1] = EXO_PLAN.createInstance(EXO_PLAN) as unknown as Node;
    return root;
}

/** The shipped entry point, insertion included — the row the replica above is checked against. */
function exodraMount(d: TCardData, parent: Element): Element {
    BUILDING[0] = d;
    return mountExoInstance(EXO_PLAN, EXO_CARD, 0, parent, null, null, null);
}

// =========================================================================================
// THE UPDATE HALF — WRITING NEW VALUES INTO A NODE THAT ALREADY EXISTS, WHICH IS WHERE THE
// CHEAPEST BUILD ROW PAYS ITS BILL.
//
// A COMPILE RUNS ONCE PER COMPONENT AND A BUILD RUNS ONCE PER INSTANCE; AN UPDATE RUNS ONCE PER
// DATA CHANGE, which is neither, and a reader weighting the three needs that said plainly. A list
// that is built once and updated on every keystroke is paying the update figure hundreds of times
// for each build figure; a page of static cards never pays it at all.
//
// WHY THE FIRST UPDATE IS A SEPARATE ROW FROM THE STEADY STATE, and it is not a formality:
//
//   · `mikado.js:1101` — on CREATE with a factory, the node being applied to IS THE FACTORY, and
//     the factory already carries its resolved path (`node[MIKADO_TPL_PATH]`). Nothing walks.
//   · `mikado.js:1020` — `update(node, data)` is
//     `this.apply(data, state, index, node[MIKADO_TPL_PATH] || create_path(node, …))`. A CLONE does
//     not carry the expando, so the first update of a freshly built node runs `create_path`.
//   · `factory.js:110` — `resolve` walks with STRING keys: `tmp += current_path` and `cache[tmp]`
//     per hop, plus a fresh `new_path` array and a `vcache` object per call.
//   · `factory.js:95` — `root[MIKADO_TPL_PATH] = new_path`. Paid ONCE PER NODE, never again.
//
// So a single update row would average mikado's one-off walk across every update a node ever gets
// and hide the whole finding. `…·update¹` is the first update of a freshly built node and
// `…·update` is the same node updated again; the pair is the finding.
//
// AND THE ADDRESSING EVERY OTHER PARTICIPANT PAID AT BUILD TIME IS WHAT IT BOUGHT. The floor keeps
// fifteen named fields, stage0 keeps what `collect` returned, exodra keeps the instance record's
// numbered node table — all three paid for them during the build rows above, and all three update
// through direct stores. `floor·once` paid for NOTHING and CANNOT UPDATE AT ALL: its landings were
// locals and they are gone, so there is no row for it here, only a refusal printed by name. That
// absence is the price of the cheapest build row in the table above it.
// =========================================================================================

/**
 * THE SHELL'S VALUES — every one of the fifteen an empty string, which is a DEFINED state and not
 * an absent one: an empty Text node (serialising to nothing) and an attribute present with an
 * empty value (`data-id=""`). Every participant is handed this same object, so "empty" cannot mean
 * one thing to one row and another to its neighbour — and the shell gate compares the bytes rather
 * than trusting that sentence.
 *
 * WHY NOT `null` OR `undefined`. `createExoAttrSetter` REMOVES an attribute written `null`/`undefined`/
 * `false` and mikado's generated writer removes one written `false` (`compile.js:623`), while the
 * floor's `setAttribute` would write the word. Three participants would then disagree about what
 * the shell IS, and the axis would be comparing three different trees. Empty string is the one
 * value all three spell identically, which is why the shell is built from it and why a shell built
 * from absent values is a DIFFERENT question this axis does not ask.
 */
const EMPTY: TCardData = {
    id: '',
    title: '',
    subtitle: '',
    state: '',
    lede: '',
    author: '',
    when: '',
    whenText: '',
    v0: '',
    v1: '',
    v2: '',
    v3: '',
    v4: '',
    v5: '',
    count: '',
};

/** The floor's update: fifteen stores through the fifteen addresses `floorKeepBuild` kept. No
 *  walk, no lookup, no table — the smallest program that can put new values in this node. */
function floorUpdate(refs: TFloorRefs, d: TCardData): void {
    refs.root.setAttribute('data-id', d.id);
    refs.titleText.data = d.title;
    refs.subText.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.ledeText.data = d.lede;
    refs.authorText.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.countText.data = d.count;
}

/** The twin's, declared over its own names for the same reason every other twin here is. */
function twinKeepBuild(proto: Element, d: TCardData, into: TFloorRefs[]): Element {
    const node = proto.cloneNode(true) as Element;
    node.setAttribute('data-id', d.id);
    const top = node.firstChild as Element;
    const h2 = top.firstChild as Element;
    const titleText = h2.firstChild as Text;
    titleText.data = d.title;
    const small = h2.nextSibling as Element;
    const subText = small.firstChild as Text;
    subText.data = d.subtitle;
    const badge = top.lastChild as Element;
    badge.setAttribute('data-state', d.state);
    const mid = top.nextSibling as Element;
    const para = mid.firstChild as Element;
    const ledeText = para.firstChild as Text;
    ledeText.data = d.lede;
    const pair = mid.lastChild as Element;
    const who = pair.firstChild as Element;
    const authorText = who.firstChild as Text;
    authorText.data = d.author;
    const stamp = pair.lastChild as Element;
    stamp.setAttribute('datetime', d.when);
    const whenText = stamp.firstChild as Text;
    whenText.data = d.whenText;
    const bag = mid.nextSibling as Element;
    let item = bag.firstChild as Element;
    const v0 = (item.lastChild as Element).firstChild as Text;
    v0.data = d.v0;
    item = item.nextSibling as Element;
    const v1 = (item.lastChild as Element).firstChild as Text;
    v1.data = d.v1;
    item = item.nextSibling as Element;
    const v2 = (item.lastChild as Element).firstChild as Text;
    v2.data = d.v2;
    item = item.nextSibling as Element;
    const v3 = (item.lastChild as Element).firstChild as Text;
    v3.data = d.v3;
    item = item.nextSibling as Element;
    const v4 = (item.lastChild as Element).firstChild as Text;
    v4.data = d.v4;
    item = item.nextSibling as Element;
    const v5 = (item.lastChild as Element).firstChild as Text;
    v5.data = d.v5;
    const bottom = bag.nextSibling as Element;
    const countText = (bottom.firstChild as Element).firstChild as Text;
    countText.data = d.count;
    into.push({
        root: node,
        badge,
        when: stamp,
        titleText,
        subText,
        ledeText,
        authorText,
        whenText,
        v0,
        v1,
        v2,
        v3,
        v4,
        v5,
        countText,
    });
    return node;
}

function twinUpdate(refs: TFloorRefs, d: TCardData): void {
    refs.root.setAttribute('data-id', d.id);
    refs.titleText.data = d.title;
    refs.subText.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.ledeText.data = d.lede;
    refs.authorText.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.countText.data = d.count;
}

/** stage0's build with the refs object KEPT. `collect` already hands one back on every build — the
 *  row above throws it away because nothing asks it for a second write; this one does. */
function stage0KeepBuild(tpl: TStage0Template, d: TCardData, into: TStage0Refs[]): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TStage0Refs;
    node.setAttribute('data-id', d.id);
    refs.title.data = d.title;
    refs.subtitle.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.lede.data = d.lede;
    refs.author.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.count.data = d.count;
    into.push(refs);
    return node;
}

/** `data-id` is written on the ROOT, which `collect` does not hand back — stage0's refs are the
 *  marked positions and the root is not one — so the node is carried beside the refs. */
interface TStage0Kept {
    readonly node: Element;
    readonly refs: TStage0Refs;
}

function stage0Update(kept: TStage0Kept, d: TCardData): void {
    const refs = kept.refs;
    kept.node.setAttribute('data-id', d.id);
    refs.title.data = d.title;
    refs.subtitle.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.lede.data = d.lede;
    refs.author.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.count.data = d.count;
}

// =========================================================================================
// SUBJECT 2 — TINY. Three elements, ONE text port, depth two.
//
// WHAT IT SEPARATES THAT THE CARD CANNOT. Every participant here pays something ONCE per build
// that has nothing to do with the size of the tree: exodra allocates an instance record and looks
// up a schema, stage0 rolls its shared `TreeWalker` to its first ref, mikado applies its whole data
// object to the factory before cloning it, and all four call `cloneNode`. On a 32-element tree
// those fixed terms are a few per cent and are invisible under the walk and the fifteen writes; on
// three elements they are most of the row. A reader whose components are small — a chip, a cell, a
// badge — is reading THIS table and not the card's.
//
// ITS ONE VALUE IS `count`, which is `6 fields` in DATA and `7 fields` in DATA_B: the same
// character count, a different string, so the rotation gate has something to see.
// =========================================================================================

function tinyStage0Markup(token: string): string {
    return (
        `<div class="tn ${token}">` +
        '<span class="tn-a">#count</span>' +
        '<span class="tn-b">b</span>' +
        '</div>'
    );
}

const TINY_STAGE0_PIECES: readonly TemplateStringsArray[] = TOKENS.map((t) =>
    onePiece(tinyStage0Markup(t))
);

function tinyMikadoMarkup(token: string): string {
    return (
        `<div class="tn ${token}">` +
        '<span class="tn-a">{{ data.count }}</span>' +
        '<span class="tn-b">b</span>' +
        '</div>'
    );
}

const TINY_MIKADO_MARKUP: readonly string[] = TOKENS.map(tinyMikadoMarkup);

/** THE FLOOR, AND THE ONLY ONE THIS SUBJECT HAS: the tree built directly, no string and no parse,
 *  for the reason spelled out over the card's `floorCompile`. */
function tinyFloorCompile(token: string): Element {
    const root = document.createElement('div');
    root.className = `tn ${token}`;
    const a = document.createElement('span');
    a.className = 'tn-a';
    a.appendChild(document.createTextNode(''));
    root.appendChild(a);
    const b = document.createElement('span');
    b.className = 'tn-b';
    b.appendChild(document.createTextNode('b'));
    root.appendChild(b);
    return root;
}

interface TTinyRefs {
    readonly root: Element;
    readonly text: Text;
}

function tinyFloorKeepBuild(proto: Element, d: TCardData, into: TTinyRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    const text = (root.firstChild as Element).firstChild as Text;
    text.data = d.count;
    into.push({ root, text });
    return root;
}
function tinyTwinCompile(token: string): Element {
    const node = document.createElement('div');
    node.className = `tn ${token}`;
    const one = document.createElement('span');
    one.className = 'tn-a';
    one.appendChild(document.createTextNode(''));
    node.appendChild(one);
    const two = document.createElement('span');
    two.className = 'tn-b';
    two.appendChild(document.createTextNode('b'));
    node.appendChild(two);
    return node;
}

function tinyTwinBuild(proto: Element, d: TCardData): Element {
    const node = proto.cloneNode(true) as Element;
    const spot = (node.firstChild as Element).firstChild as Text;
    spot.data = d.count;
    return node;
}

interface TTinyStage0Refs {
    readonly count: Text;
}

function tinyStage0Build(tpl: TStage0Template, d: TCardData): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TTinyStage0Refs;
    refs.count.data = d.count;
    return node;
}

interface TTinyPorts {
    readonly count: TExoTextPort;
}

const tinyShape = (b: TExoSchemaCursor): TTinyPorts => {
    let count!: TExoTextPort;
    b.el('div', { class: `tn ${EXO_TOKEN}` }, (card) => {
        card.el('span', { class: 'tn-a' }, (n) => {
            count = n.textPort();
        });
        card.el('span', { class: 'tn-b' }, (n) => {
            n.text('b');
        });
    });
    return { count };
};

const tinyWireOf =
    (P: TTinyPorts): TExoMachineInitialState<TExoDomNode> =>
    (c, i) => {
        c.text(P.count, BUILDING[i].count);
    };

const TINY_CARD_SCHEMA = createExoSchema(tinyShape);
const mTINY_CARD = createExoMachineBuilder<TExoDomNode>(TINY_CARD_SCHEMA);
mTINY_CARD.createInitialState(tinyWireOf(TINY_CARD_SCHEMA.ports));
const TINY_CARD = mTINY_CARD.done();
const TINY_PLAN: TExoDomSchema = exoDomSchemaOf(TINY_CARD, EXO_BACKEND);

function tinyExodraCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    return exoDomSchemaOf(machineOf(createExoSchema(tinyShape)), EXO_BACKEND);
}

function tinyExodraBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = TINY_PLAN.acquireNode(TINY_PLAN);
    const record = TINY_PLAN.createInstance(TINY_PLAN);
    createExoNode(TINY_PLAN, root, TINY_CARD, 0, null, record, null);
    return root;
}

/** ONE PORT, so the table sizing this subject can show is the FIRST widening and nothing after it —
 *  and on a template this small there is almost no tree for that constant to hide behind, which is
 *  what the tiny subject exists for. */
const TINY_DECLARED_MARKS = { count: EXO_PORT_TEXT } as const;

type TExoDeclaredTinyPorts = TExoDeclaredPorts<typeof TINY_DECLARED_MARKS>;

const tinyDeclaredShapeOf =
    (P: TExoDeclaredTinyPorts) =>
    (b: TExoEmitter<TExoDeclaredTinyPorts>): void => {
        b.el('div', { class: `tn ${EXO_TOKEN}` }, (card) => {
            card.el('span', { class: 'tn-a' }, (n) => {
                n.textPort(P.count);
            });
            card.el('span', { class: 'tn-b' }, (n) => {
                n.text('b');
            });
        });
    };

const TINY_DECLARED_PORTS: TExoDeclaredTinyPorts = exoPorts(TINY_DECLARED_MARKS);
const TINY_DECLARED_CARD: TExoMachine<TExoDomNode, TExoDeclaredTinyPorts> = {
    declaration: createExoSchema(TINY_DECLARED_PORTS, tinyDeclaredShapeOf(TINY_DECLARED_PORTS)),
    forms: [],
    createInitialState: tinyWireOf(TINY_DECLARED_PORTS),
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const TINY_DECLARED_PLAN: TExoDomSchema = exoDomSchemaOf(TINY_DECLARED_CARD, EXO_BACKEND);

function tinyDeclaredCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    const P = exoPorts(TINY_DECLARED_MARKS);
    return exoDomSchemaOf(machineOf(createExoSchema(P, tinyDeclaredShapeOf(P))), EXO_BACKEND);
}

function tinyDeclaredBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = TINY_DECLARED_PLAN.acquireNode(TINY_DECLARED_PLAN);
    const record = TINY_DECLARED_PLAN.createInstance(TINY_DECLARED_PLAN);
    createExoNode(TINY_DECLARED_PLAN, root, TINY_DECLARED_CARD, 0, null, record, null);
    return root;
}

// =========================================================================================
// SUBJECT 3 — DEEP. Twelve nested levels, twenty-eight elements, four ports at the bottom.
//
// WHAT IT SEPARATES THAT THE CARD CANNOT. The card is WIDE: its `<ul>` holds six siblings and its
// deepest port is four levels down, so almost every hop in every participant's addressing is a
// `nextSibling` off a node the previous hop already produced. This tree is a CHAIN — one
// `firstChild` and one `nextSibling` per level, twelve times — and the two are not the same cost
// to a browser or to a walk table. Nobody here has measured which, and a template axis with only
// wide subjects cannot say.
//
// THE FOUR PORTS ARE ALL AT THE BOTTOM, which is the shape that makes the question sharp: every
// participant must traverse the whole chain before it can write anything, so the row is addressing
// plus four writes rather than addressing interleaved with fifteen.
// =========================================================================================

const DEEP_LEVELS = 12;

function deepMarkupOf(token: string, leafOpen: string, holes: readonly string[]): string {
    let html = `<div class="dp dp0 ${token}">`;
    for (let l = 1; l < DEEP_LEVELS; l++) {
        html += '<span class="dp-k">k</span><div class="dp dp' + l + '">';
    }
    html +=
        '<span class="dp-k">k</span>' +
        leafOpen +
        `<span class="dp-v">${holes[0]}</span>` +
        `<span class="dp-v">${holes[1]}</span>` +
        `<span class="dp-v">${holes[2]}</span>` +
        '</div>';
    for (let l = 0; l < DEEP_LEVELS; l++) html += '</div>';
    return html;
}

const DEEP_STAGE0_PIECES: readonly TemplateStringsArray[] = TOKENS.map((t) =>
    onePiece(deepMarkupOf(t, '<div class="dp-leaf" #deep>', ['#v0', '#v1', '#v2']))
);

const DEEP_MIKADO_MARKUP: readonly string[] = TOKENS.map((t) =>
    deepMarkupOf(t, '<div class="dp-leaf" data-deep="{{ data.id }}">', [
        '{{ data.v0 }}',
        '{{ data.v1 }}',
        '{{ data.v2 }}',
    ])
);

/** The chain is built with a LOOP here and walked straight-line in the builds below, and the
 *  difference is deliberate: a compile runs once per component, where nobody unrolls, and a build
 *  runs once per instance, where the floor must be the smallest program there is. */
function deepFloorCompile(token: string): Element {
    const root = document.createElement('div');
    root.className = `dp dp0 ${token}`;
    let at = root;
    for (let l = 0; l < DEEP_LEVELS; l++) {
        const k = document.createElement('span');
        k.className = 'dp-k';
        k.appendChild(document.createTextNode('k'));
        at.appendChild(k);
        if (l + 1 < DEEP_LEVELS) {
            const next = document.createElement('div');
            next.className = `dp dp${l + 1}`;
            at.appendChild(next);
            at = next;
            continue;
        }
        const leaf = document.createElement('div');
        leaf.className = 'dp-leaf';
        for (let i = 0; i < 3; i++) {
            const v = document.createElement('span');
            v.className = 'dp-v';
            v.appendChild(document.createTextNode(''));
            leaf.appendChild(v);
        }
        at.appendChild(leaf);
    }
    return root;
}

interface TDeepRefs {
    readonly root: Element;
    readonly leaf: Element;
    readonly t0: Text;
    readonly t1: Text;
    readonly t2: Text;
}

function deepFloorKeepBuild(proto: Element, d: TCardData, into: TDeepRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    const d1 = (root.firstChild as Element).nextSibling as Element;
    const d2 = (d1.firstChild as Element).nextSibling as Element;
    const d3 = (d2.firstChild as Element).nextSibling as Element;
    const d4 = (d3.firstChild as Element).nextSibling as Element;
    const d5 = (d4.firstChild as Element).nextSibling as Element;
    const d6 = (d5.firstChild as Element).nextSibling as Element;
    const d7 = (d6.firstChild as Element).nextSibling as Element;
    const d8 = (d7.firstChild as Element).nextSibling as Element;
    const d9 = (d8.firstChild as Element).nextSibling as Element;
    const d10 = (d9.firstChild as Element).nextSibling as Element;
    const d11 = (d10.firstChild as Element).nextSibling as Element;
    const leaf = (d11.firstChild as Element).nextSibling as Element;
    leaf.setAttribute('data-deep', d.id);
    const s0 = leaf.firstChild as Element;
    const t0 = s0.firstChild as Text;
    t0.data = d.v0;
    const s1 = s0.nextSibling as Element;
    const t1 = s1.firstChild as Text;
    t1.data = d.v1;
    const s2 = s1.nextSibling as Element;
    const t2 = s2.firstChild as Text;
    t2.data = d.v2;
    into.push({ root, leaf, t0, t1, t2 });
    return root;
}
function deepTwinCompile(token: string): Element {
    const node = document.createElement('div');
    node.className = `dp dp0 ${token}`;
    let here = node;
    for (let l = 0; l < DEEP_LEVELS; l++) {
        const mark = document.createElement('span');
        mark.className = 'dp-k';
        mark.appendChild(document.createTextNode('k'));
        here.appendChild(mark);
        if (l + 1 < DEEP_LEVELS) {
            const deeper = document.createElement('div');
            deeper.className = `dp dp${l + 1}`;
            here.appendChild(deeper);
            here = deeper;
            continue;
        }
        const bottom = document.createElement('div');
        bottom.className = 'dp-leaf';
        for (let i = 0; i < 3; i++) {
            const spot = document.createElement('span');
            spot.className = 'dp-v';
            spot.appendChild(document.createTextNode(''));
            bottom.appendChild(spot);
        }
        here.appendChild(bottom);
    }
    return node;
}

function deepTwinBuild(proto: Element, d: TCardData): Element {
    const node = proto.cloneNode(true) as Element;
    const a1 = (node.firstChild as Element).nextSibling as Element;
    const a2 = (a1.firstChild as Element).nextSibling as Element;
    const a3 = (a2.firstChild as Element).nextSibling as Element;
    const a4 = (a3.firstChild as Element).nextSibling as Element;
    const a5 = (a4.firstChild as Element).nextSibling as Element;
    const a6 = (a5.firstChild as Element).nextSibling as Element;
    const a7 = (a6.firstChild as Element).nextSibling as Element;
    const a8 = (a7.firstChild as Element).nextSibling as Element;
    const a9 = (a8.firstChild as Element).nextSibling as Element;
    const a10 = (a9.firstChild as Element).nextSibling as Element;
    const a11 = (a10.firstChild as Element).nextSibling as Element;
    const bottom = (a11.firstChild as Element).nextSibling as Element;
    bottom.setAttribute('data-deep', d.id);
    const p0 = bottom.firstChild as Element;
    (p0.firstChild as Text).data = d.v0;
    const p1 = p0.nextSibling as Element;
    (p1.firstChild as Text).data = d.v1;
    const p2 = p1.nextSibling as Element;
    (p2.firstChild as Text).data = d.v2;
    return node;
}

interface TDeepStage0Refs {
    readonly deep: Element;
    readonly v0: Text;
    readonly v1: Text;
    readonly v2: Text;
}

function deepStage0Build(tpl: TStage0Template, d: TCardData): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TDeepStage0Refs;
    refs.deep.setAttribute('data-deep', d.id);
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    return node;
}

interface TDeepPorts {
    readonly deep: TExoAttrPort;
    readonly v0: TExoTextPort;
    readonly v1: TExoTextPort;
    readonly v2: TExoTextPort;
}

const deepShape = (b: TExoSchemaCursor): TDeepPorts => {
    let deep!: TExoAttrPort;
    let v0!: TExoTextPort;
    let v1!: TExoTextPort;
    let v2!: TExoTextPort;
    const level = (cursor: TExoSchemaCursor, l: number): void => {
        cursor.el('span', { class: 'dp-k' }, (n) => {
            n.text('k');
        });
        if (l + 1 < DEEP_LEVELS) {
            cursor.el('div', { class: `dp dp${l + 1}` }, (next) => {
                level(next, l + 1);
            });
            return;
        }
        cursor.el('div', { class: 'dp-leaf' }, (leaf) => {
            deep = leaf.port('data-deep');
            leaf.el('span', { class: 'dp-v' }, (n) => {
                v0 = n.textPort();
            });
            leaf.el('span', { class: 'dp-v' }, (n) => {
                v1 = n.textPort();
            });
            leaf.el('span', { class: 'dp-v' }, (n) => {
                v2 = n.textPort();
            });
        });
    };
    b.el('div', { class: `dp dp0 ${EXO_TOKEN}` }, (root) => {
        level(root, 0);
    });
    return { deep, v0, v1, v2 };
};

const deepWireOf =
    (P: TDeepPorts): TExoMachineInitialState<TExoDomNode> =>
    (c, i) => {
        const d = BUILDING[i];
        c.attr(P.deep, d.id);
        c.text(P.v0, d.v0);
        c.text(P.v1, d.v1);
        c.text(P.v2, d.v2);
    };

const DEEP_CARD_SCHEMA = createExoSchema(deepShape);
const mDEEP_CARD = createExoMachineBuilder<TExoDomNode>(DEEP_CARD_SCHEMA);
mDEEP_CARD.createInitialState(deepWireOf(DEEP_CARD_SCHEMA.ports));
const DEEP_CARD = mDEEP_CARD.done();
const DEEP_PLAN: TExoDomSchema = exoDomSchemaOf(DEEP_CARD, EXO_BACKEND);

function deepExodraCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    return exoDomSchemaOf(machineOf(createExoSchema(deepShape)), EXO_BACKEND);
}

function deepExodraBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = DEEP_PLAN.acquireNode(DEEP_PLAN);
    const record = DEEP_PLAN.createInstance(DEEP_PLAN);
    createExoNode(DEEP_PLAN, root, DEEP_CARD, 0, null, record, null);
    return root;
}

/** FOUR PORTS AT THE BOTTOM OF A TWELVE-LEVEL CHAIN. The declaration order is the order the leaf
 *  mints in — the attribute first, then the three values — so both schemas number this tree alike. */
const DEEP_DECLARED_MARKS = {
    deep: EXO_PORT_ATTR,
    v0: EXO_PORT_TEXT,
    v1: EXO_PORT_TEXT,
    v2: EXO_PORT_TEXT,
} as const;

type TExoDeclaredDeepPorts = TExoDeclaredPorts<typeof DEEP_DECLARED_MARKS>;

const deepDeclaredShapeOf =
    (P: TExoDeclaredDeepPorts) =>
    (b: TExoEmitter<TExoDeclaredDeepPorts>): void => {
        const level = (cursor: TExoEmitter<TExoDeclaredDeepPorts>, l: number): void => {
            cursor.el('span', { class: 'dp-k' }, (n) => {
                n.text('k');
            });
            if (l + 1 < DEEP_LEVELS) {
                cursor.el('div', { class: `dp dp${l + 1}` }, (next) => {
                    level(next, l + 1);
                });
                return;
            }
            cursor.el('div', { class: 'dp-leaf' }, (leaf) => {
                leaf.attrPort(P.deep, 'data-deep');
                leaf.el('span', { class: 'dp-v' }, (n) => {
                    n.textPort(P.v0);
                });
                leaf.el('span', { class: 'dp-v' }, (n) => {
                    n.textPort(P.v1);
                });
                leaf.el('span', { class: 'dp-v' }, (n) => {
                    n.textPort(P.v2);
                });
            });
        };
        b.el('div', { class: `dp dp0 ${EXO_TOKEN}` }, (root) => {
            level(root, 0);
        });
    };

const DEEP_DECLARED_PORTS: TExoDeclaredDeepPorts = exoPorts(DEEP_DECLARED_MARKS);
const DEEP_DECLARED_CARD: TExoMachine<TExoDomNode, TExoDeclaredDeepPorts> = {
    declaration: createExoSchema(DEEP_DECLARED_PORTS, deepDeclaredShapeOf(DEEP_DECLARED_PORTS)),
    forms: [],
    createInitialState: deepWireOf(DEEP_DECLARED_PORTS),
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const DEEP_DECLARED_PLAN: TExoDomSchema = exoDomSchemaOf(DEEP_DECLARED_CARD, EXO_BACKEND);

function deepDeclaredCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    const P = exoPorts(DEEP_DECLARED_MARKS);
    return exoDomSchemaOf(machineOf(createExoSchema(P, deepDeclaredShapeOf(P))), EXO_BACKEND);
}

function deepDeclaredBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = DEEP_DECLARED_PLAN.acquireNode(DEEP_DECLARED_PLAN);
    const record = DEEP_DECLARED_PLAN.createInstance(DEEP_DECLARED_PLAN);
    createExoNode(DEEP_DECLARED_PLAN, root, DEEP_DECLARED_CARD, 0, null, record, null);
    return root;
}

const DEEP_LADDER_NODES: Node[] = [];

function deepExodraCloneOnly(): Element {
    return DEEP_PLAN.acquireNode(DEEP_PLAN);
}

function deepExodraCloneWalk(): Element {
    const root = DEEP_PLAN.acquireNode(DEEP_PLAN);
    const walk = DEEP_PLAN.walk;
    const nodes: Node[] = [root];
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === EXO_WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
    DEEP_LADDER_NODES[0] = nodes[nodes.length - 1];
    return root;
}

function deepExodraCloneRecord(): Element {
    const root = DEEP_PLAN.acquireNode(DEEP_PLAN);
    DEEP_LADDER_NODES[1] = DEEP_PLAN.createInstance(DEEP_PLAN) as unknown as Node;
    return root;
}

// =========================================================================================
// SUBJECT 4 — PORT-DENSE. The card's thirty-two elements with a port on EVERY ONE of them.
//
// WHAT IT SEPARATES THAT THE CARD CANNOT, AND IT IS THE ONE RUNG THE LADDER COULD NOT REACH. The
// card's `exodra·clone+walk` rung prices the walk and `exodra` prices the walk PLUS fifteen
// writes, so the two questions "what does addressing cost" and "what does writing cost" are asked
// over a tree where the port count is fixed. Here the SAME thirty-two elements carry thirty-two
// ports: the addressing is identical to the card's — every element is reached either way, because
// the walk table already visits each one — and the write count is doubled. The difference between
// this table and the card's is writes and nothing else.
//
// THE PORT ON A CONTAINER IS AN ATTRIBUTE AND THE PORT ON A LEAF IS A TEXT, because a text port on
// an element that also holds element children would put a Text node among them and change the tree
// for everybody. Twelve containers, twenty leaves, thirty-two elements, thirty-two ports.
//
// THE THIRTY-TWO PORTS ARE FED FROM THE SUBJECT'S FIFTEEN VALUES, several of them written twice.
// What differs from the card is the PORT COUNT and nothing else — not the strings, not the
// escaping, not the character counts, so the rotation gate still sees every one of them change.
// =========================================================================================

function denseMarkupOf(
    token: string,
    attr: (slot: number) => string,
    text: (slot: number) => string
): string {
    let rows = '';
    for (let r = 0; r < ROWS; r++) {
        rows +=
            `<li class="mc-row"${attr(5 + r)}>` +
            `<span class="mc-k">${text(6 + r * 2)}</span>` +
            `<span class="mc-v">${text(7 + r * 2)}</span>` +
            '</li>';
    }
    return (
        `<div class="mc ${token}"${attr(0)}>` +
        `<div class="mc-head"${attr(1)}>` +
        `<h2 class="mc-title">${text(0)}</h2>` +
        `<span class="mc-sub">${text(1)}</span>` +
        `<span class="mc-badge">${text(2)}</span>` +
        '</div>' +
        `<div class="mc-body"${attr(2)}>` +
        `<p class="mc-lede">${text(3)}</p>` +
        `<div class="mc-meta"${attr(3)}>` +
        `<span class="mc-author">${text(4)}</span>` +
        `<time class="mc-when">${text(5)}</time>` +
        '</div>' +
        '</div>' +
        `<ul class="mc-rows"${attr(4)}>${rows}</ul>` +
        `<div class="mc-foot"${attr(11)}>` +
        `<span class="mc-count">${text(18)}</span>` +
        `<span class="mc-tail">${text(19)}</span>` +
        '</div>' +
        '</div>'
    );
}

const DENSE_STAGE0_PIECES: readonly TemplateStringsArray[] = TOKENS.map((t) =>
    onePiece(
        denseMarkupOf(
            t,
            (slot) => ` #a${slot}`,
            (slot) => `#t${slot}`
        )
    )
);

/** The twelve attribute holes and the twenty text holes, in the order the schema declares them, so
 *  every spelling below reads the same field for the same element. `mikado` takes them as property
 *  paths off one data object and cannot take an index, which is why these are named fields and not
 *  an array. */
const DENSE_ATTR_FIELDS: readonly string[] = [
    'id',
    'state',
    'state',
    'state',
    'id',
    'when',
    'when',
    'when',
    'when',
    'when',
    'when',
    'state',
];
const DENSE_TEXT_FIELDS: readonly string[] = [
    'title',
    'subtitle',
    'author',
    'lede',
    'author',
    'whenText',
    'count',
    'v0',
    'count',
    'v1',
    'count',
    'v2',
    'count',
    'v3',
    'count',
    'v4',
    'count',
    'v5',
    'count',
    'title',
];

const DENSE_MIKADO_MARKUP: readonly string[] = TOKENS.map((t) =>
    denseMarkupOf(
        t,
        (slot) => ` data-k="{{ data.${DENSE_ATTR_FIELDS[slot]} }}"`,
        (slot) => `{{ data.${DENSE_TEXT_FIELDS[slot]} }}`
    )
);

function denseFloorCompile(token: string): Element {
    const el = (tag: string, cls: string): Element => {
        const node = document.createElement(tag);
        node.className = cls;
        node.appendChild(document.createTextNode(''));
        return node;
    };
    const box = (tag: string, cls: string): Element => {
        const node = document.createElement(tag);
        node.className = cls;
        return node;
    };

    const root = box('div', `mc ${token}`);

    const head = box('div', 'mc-head');
    head.appendChild(el('h2', 'mc-title'));
    head.appendChild(el('span', 'mc-sub'));
    head.appendChild(el('span', 'mc-badge'));
    root.appendChild(head);

    const body = box('div', 'mc-body');
    body.appendChild(el('p', 'mc-lede'));
    const meta = box('div', 'mc-meta');
    meta.appendChild(el('span', 'mc-author'));
    meta.appendChild(el('time', 'mc-when'));
    body.appendChild(meta);
    root.appendChild(body);

    const list = box('ul', 'mc-rows');
    for (let r = 0; r < ROWS; r++) {
        const li = box('li', 'mc-row');
        li.appendChild(el('span', 'mc-k'));
        li.appendChild(el('span', 'mc-v'));
        list.appendChild(li);
    }
    root.appendChild(list);

    const foot = box('div', 'mc-foot');
    foot.appendChild(el('span', 'mc-count'));
    foot.appendChild(el('span', 'mc-tail'));
    root.appendChild(foot);

    return root;
}

/**
 * THE DENSE FLOOR KEEPS AN ARRAY AND THE CARD'S FLOOR KEEPS NAMED FIELDS, and the difference is
 * the subject rather than a change of mind. At fifteen landings a record with fifteen names is
 * what a person writes; at thirty-three it is not, and the honest hand-written form is the one
 * exodra also keeps — a numbered array, built WHOLE in one literal so it lands in one hidden class
 * instead of growing through thirty-three shapes.
 */
function denseFloorKeepBuild(proto: Element, d: TCardData, into: Node[][]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-k', d.id);
    const head = root.firstChild as Element;
    head.setAttribute('data-k', d.state);
    const title = head.firstChild as Element;
    const titleText = title.firstChild as Text;
    titleText.data = d.title;
    const sub = title.nextSibling as Element;
    const subText = sub.firstChild as Text;
    subText.data = d.subtitle;
    const badge = sub.nextSibling as Element;
    const badgeText = badge.firstChild as Text;
    badgeText.data = d.author;
    const body = head.nextSibling as Element;
    body.setAttribute('data-k', d.state);
    const lede = body.firstChild as Element;
    const ledeText = lede.firstChild as Text;
    ledeText.data = d.lede;
    const meta = lede.nextSibling as Element;
    meta.setAttribute('data-k', d.state);
    const author = meta.firstChild as Element;
    const authorText = author.firstChild as Text;
    authorText.data = d.author;
    const when = author.nextSibling as Element;
    const whenText = when.firstChild as Text;
    whenText.data = d.whenText;
    const list = body.nextSibling as Element;
    list.setAttribute('data-k', d.id);
    const li0 = list.firstChild as Element;
    li0.setAttribute('data-k', d.when);
    const k0 = li0.firstChild as Element;
    const k0t = k0.firstChild as Text;
    k0t.data = d.count;
    const w0 = k0.nextSibling as Element;
    const w0t = w0.firstChild as Text;
    w0t.data = d.v0;
    const li1 = li0.nextSibling as Element;
    li1.setAttribute('data-k', d.when);
    const k1 = li1.firstChild as Element;
    const k1t = k1.firstChild as Text;
    k1t.data = d.count;
    const w1 = k1.nextSibling as Element;
    const w1t = w1.firstChild as Text;
    w1t.data = d.v1;
    const li2 = li1.nextSibling as Element;
    li2.setAttribute('data-k', d.when);
    const k2 = li2.firstChild as Element;
    const k2t = k2.firstChild as Text;
    k2t.data = d.count;
    const w2 = k2.nextSibling as Element;
    const w2t = w2.firstChild as Text;
    w2t.data = d.v2;
    const li3 = li2.nextSibling as Element;
    li3.setAttribute('data-k', d.when);
    const k3 = li3.firstChild as Element;
    const k3t = k3.firstChild as Text;
    k3t.data = d.count;
    const w3 = k3.nextSibling as Element;
    const w3t = w3.firstChild as Text;
    w3t.data = d.v3;
    const li4 = li3.nextSibling as Element;
    li4.setAttribute('data-k', d.when);
    const k4 = li4.firstChild as Element;
    const k4t = k4.firstChild as Text;
    k4t.data = d.count;
    const w4 = k4.nextSibling as Element;
    const w4t = w4.firstChild as Text;
    w4t.data = d.v4;
    const li5 = li4.nextSibling as Element;
    li5.setAttribute('data-k', d.when);
    const k5 = li5.firstChild as Element;
    const k5t = k5.firstChild as Text;
    k5t.data = d.count;
    const w5 = k5.nextSibling as Element;
    const w5t = w5.firstChild as Text;
    w5t.data = d.v5;
    const foot = list.nextSibling as Element;
    foot.setAttribute('data-k', d.state);
    const count = foot.firstChild as Element;
    const countText = count.firstChild as Text;
    countText.data = d.count;
    const tail = count.nextSibling as Element;
    const tailText = tail.firstChild as Text;
    tailText.data = d.title;
    into.push([
        root,
        head,
        body,
        meta,
        list,
        li0,
        li1,
        li2,
        li3,
        li4,
        li5,
        foot,
        titleText,
        subText,
        badgeText,
        ledeText,
        authorText,
        whenText,
        k0t,
        w0t,
        k1t,
        w1t,
        k2t,
        w2t,
        k3t,
        w3t,
        k4t,
        w4t,
        k5t,
        w5t,
        countText,
        tailText,
    ]);
    return root;
}
function denseTwinCompile(token: string): Element {
    const leaf = (tag: string, cls: string): Element => {
        const node = document.createElement(tag);
        node.className = cls;
        node.appendChild(document.createTextNode(''));
        return node;
    };
    const wrap = (tag: string, cls: string): Element => {
        const node = document.createElement(tag);
        node.className = cls;
        return node;
    };

    const node = wrap('div', `mc ${token}`);

    const top = wrap('div', 'mc-head');
    top.appendChild(leaf('h2', 'mc-title'));
    top.appendChild(leaf('span', 'mc-sub'));
    top.appendChild(leaf('span', 'mc-badge'));
    node.appendChild(top);

    const mid = wrap('div', 'mc-body');
    mid.appendChild(leaf('p', 'mc-lede'));
    const pair = wrap('div', 'mc-meta');
    pair.appendChild(leaf('span', 'mc-author'));
    pair.appendChild(leaf('time', 'mc-when'));
    mid.appendChild(pair);
    node.appendChild(mid);

    const bag = wrap('ul', 'mc-rows');
    for (let r = 0; r < ROWS; r++) {
        const item = wrap('li', 'mc-row');
        item.appendChild(leaf('span', 'mc-k'));
        item.appendChild(leaf('span', 'mc-v'));
        bag.appendChild(item);
    }
    node.appendChild(bag);

    const bottom = wrap('div', 'mc-foot');
    bottom.appendChild(leaf('span', 'mc-count'));
    bottom.appendChild(leaf('span', 'mc-tail'));
    node.appendChild(bottom);

    return node;
}

function denseTwinBuild(proto: Element, d: TCardData): Element {
    const node = proto.cloneNode(true) as Element;
    node.setAttribute('data-k', d.id);
    const top = node.firstChild as Element;
    top.setAttribute('data-k', d.state);
    const h2 = top.firstChild as Element;
    (h2.firstChild as Text).data = d.title;
    const small = h2.nextSibling as Element;
    (small.firstChild as Text).data = d.subtitle;
    const tag = small.nextSibling as Element;
    (tag.firstChild as Text).data = d.author;
    const mid = top.nextSibling as Element;
    mid.setAttribute('data-k', d.state);
    const para = mid.firstChild as Element;
    (para.firstChild as Text).data = d.lede;
    const pair = para.nextSibling as Element;
    pair.setAttribute('data-k', d.state);
    const who = pair.firstChild as Element;
    (who.firstChild as Text).data = d.author;
    const stamp = who.nextSibling as Element;
    (stamp.firstChild as Text).data = d.whenText;
    const bag = mid.nextSibling as Element;
    bag.setAttribute('data-k', d.id);
    const i0 = bag.firstChild as Element;
    i0.setAttribute('data-k', d.when);
    const m0 = i0.firstChild as Element;
    (m0.firstChild as Text).data = d.count;
    ((m0.nextSibling as Element).firstChild as Text).data = d.v0;
    const i1 = i0.nextSibling as Element;
    i1.setAttribute('data-k', d.when);
    const m1 = i1.firstChild as Element;
    (m1.firstChild as Text).data = d.count;
    ((m1.nextSibling as Element).firstChild as Text).data = d.v1;
    const i2 = i1.nextSibling as Element;
    i2.setAttribute('data-k', d.when);
    const m2 = i2.firstChild as Element;
    (m2.firstChild as Text).data = d.count;
    ((m2.nextSibling as Element).firstChild as Text).data = d.v2;
    const i3 = i2.nextSibling as Element;
    i3.setAttribute('data-k', d.when);
    const m3 = i3.firstChild as Element;
    (m3.firstChild as Text).data = d.count;
    ((m3.nextSibling as Element).firstChild as Text).data = d.v3;
    const i4 = i3.nextSibling as Element;
    i4.setAttribute('data-k', d.when);
    const m4 = i4.firstChild as Element;
    (m4.firstChild as Text).data = d.count;
    ((m4.nextSibling as Element).firstChild as Text).data = d.v4;
    const i5 = i4.nextSibling as Element;
    i5.setAttribute('data-k', d.when);
    const m5 = i5.firstChild as Element;
    (m5.firstChild as Text).data = d.count;
    ((m5.nextSibling as Element).firstChild as Text).data = d.v5;
    const bottom = bag.nextSibling as Element;
    bottom.setAttribute('data-k', d.state);
    const tally = bottom.firstChild as Element;
    (tally.firstChild as Text).data = d.count;
    ((tally.nextSibling as Element).firstChild as Text).data = d.title;
    return node;
}

interface TDenseStage0Refs {
    readonly a0: Element;
    readonly a1: Element;
    readonly a2: Element;
    readonly a3: Element;
    readonly a4: Element;
    readonly a5: Element;
    readonly a6: Element;
    readonly a7: Element;
    readonly a8: Element;
    readonly a9: Element;
    readonly a10: Element;
    readonly a11: Element;
    readonly t0: Text;
    readonly t1: Text;
    readonly t2: Text;
    readonly t3: Text;
    readonly t4: Text;
    readonly t5: Text;
    readonly t6: Text;
    readonly t7: Text;
    readonly t8: Text;
    readonly t9: Text;
    readonly t10: Text;
    readonly t11: Text;
    readonly t12: Text;
    readonly t13: Text;
    readonly t14: Text;
    readonly t15: Text;
    readonly t16: Text;
    readonly t17: Text;
    readonly t18: Text;
    readonly t19: Text;
}

function denseStage0Build(tpl: TStage0Template, d: TCardData): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TDenseStage0Refs;
    refs.a0.setAttribute('data-k', d.id);
    refs.a1.setAttribute('data-k', d.state);
    refs.a2.setAttribute('data-k', d.state);
    refs.a3.setAttribute('data-k', d.state);
    refs.a4.setAttribute('data-k', d.id);
    refs.a5.setAttribute('data-k', d.when);
    refs.a6.setAttribute('data-k', d.when);
    refs.a7.setAttribute('data-k', d.when);
    refs.a8.setAttribute('data-k', d.when);
    refs.a9.setAttribute('data-k', d.when);
    refs.a10.setAttribute('data-k', d.when);
    refs.a11.setAttribute('data-k', d.state);
    refs.t0.data = d.title;
    refs.t1.data = d.subtitle;
    refs.t2.data = d.author;
    refs.t3.data = d.lede;
    refs.t4.data = d.author;
    refs.t5.data = d.whenText;
    refs.t6.data = d.count;
    refs.t7.data = d.v0;
    refs.t8.data = d.count;
    refs.t9.data = d.v1;
    refs.t10.data = d.count;
    refs.t11.data = d.v2;
    refs.t12.data = d.count;
    refs.t13.data = d.v3;
    refs.t14.data = d.count;
    refs.t15.data = d.v4;
    refs.t16.data = d.count;
    refs.t17.data = d.v5;
    refs.t18.data = d.count;
    refs.t19.data = d.title;
    return node;
}

interface TDensePorts {
    readonly a: readonly TExoAttrPort[];
    readonly t: readonly TExoTextPort[];
}

const denseShape = (b: TExoSchemaCursor): TDensePorts => {
    const a: TExoAttrPort[] = [];
    const t: TExoTextPort[] = [];
    b.el('div', { class: `mc ${EXO_TOKEN}` }, (card) => {
        a.push(card.port('data-k'));
        card.el('div', { class: 'mc-head' }, (head) => {
            a.push(head.port('data-k'));
            head.el('h2', { class: 'mc-title' }, (n) => {
                t.push(n.textPort());
            });
            head.el('span', { class: 'mc-sub' }, (n) => {
                t.push(n.textPort());
            });
            head.el('span', { class: 'mc-badge' }, (n) => {
                t.push(n.textPort());
            });
        });
        card.el('div', { class: 'mc-body' }, (body) => {
            a.push(body.port('data-k'));
            body.el('p', { class: 'mc-lede' }, (n) => {
                t.push(n.textPort());
            });
            body.el('div', { class: 'mc-meta' }, (meta) => {
                a.push(meta.port('data-k'));
                meta.el('span', { class: 'mc-author' }, (n) => {
                    t.push(n.textPort());
                });
                meta.el('time', { class: 'mc-when' }, (n) => {
                    t.push(n.textPort());
                });
            });
        });
        card.el('ul', { class: 'mc-rows' }, (list) => {
            a.push(list.port('data-k'));
            for (let r = 0; r < ROWS; r++) {
                list.el('li', { class: 'mc-row' }, (row) => {
                    a.push(row.port('data-k'));
                    row.el('span', { class: 'mc-k' }, (n) => {
                        t.push(n.textPort());
                    });
                    row.el('span', { class: 'mc-v' }, (n) => {
                        t.push(n.textPort());
                    });
                });
            }
        });
        card.el('div', { class: 'mc-foot' }, (foot) => {
            a.push(foot.port('data-k'));
            foot.el('span', { class: 'mc-count' }, (n) => {
                t.push(n.textPort());
            });
            foot.el('span', { class: 'mc-tail' }, (n) => {
                t.push(n.textPort());
            });
        });
    });
    return { a, t };
};

/**
 * THE TWO ARRAYS ARE READ OUT OF THE PORTS OBJECT ONCE, in the factory, and not per fill: a wire
 * factory runs once per component, so `P.a[0]` inside the fill would have been two loads where
 * every other participant's is one. The thirty-two calls are written out rather than looped for
 * the same reason the floor's writes are: a loop is a different program from what a compiler emits.
 */
const denseWireOf = (P: TDensePorts): TExoMachineInitialState<TExoDomNode> => {
    const a = P.a;
    const t = P.t;
    return (c, i) => {
        const d = BUILDING[i];
        c.attr(a[0], d.id);
        c.attr(a[1], d.state);
        c.text(t[0], d.title);
        c.text(t[1], d.subtitle);
        c.text(t[2], d.author);
        c.attr(a[2], d.state);
        c.text(t[3], d.lede);
        c.attr(a[3], d.state);
        c.text(t[4], d.author);
        c.text(t[5], d.whenText);
        c.attr(a[4], d.id);
        c.attr(a[5], d.when);
        c.text(t[6], d.count);
        c.text(t[7], d.v0);
        c.attr(a[6], d.when);
        c.text(t[8], d.count);
        c.text(t[9], d.v1);
        c.attr(a[7], d.when);
        c.text(t[10], d.count);
        c.text(t[11], d.v2);
        c.attr(a[8], d.when);
        c.text(t[12], d.count);
        c.text(t[13], d.v3);
        c.attr(a[9], d.when);
        c.text(t[14], d.count);
        c.text(t[15], d.v4);
        c.attr(a[10], d.when);
        c.text(t[16], d.count);
        c.text(t[17], d.v5);
        c.attr(a[11], d.state);
        c.text(t[18], d.count);
        c.text(t[19], d.title);
    };
};

const DENSE_CARD_SCHEMA = createExoSchema(denseShape);
const mDENSE_CARD = createExoMachineBuilder<TExoDomNode>(DENSE_CARD_SCHEMA);
mDENSE_CARD.createInitialState(denseWireOf(DENSE_CARD_SCHEMA.ports));
const DENSE_CARD = mDENSE_CARD.done();
const DENSE_PLAN: TExoDomSchema = exoDomSchemaOf(DENSE_CARD, EXO_BACKEND);

function denseExodraCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    return exoDomSchemaOf(machineOf(createExoSchema(denseShape)), EXO_BACKEND);
}

function denseExodraBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = DENSE_PLAN.acquireNode(DENSE_PLAN);
    const record = DENSE_PLAN.createInstance(DENSE_PLAN);
    createExoNode(DENSE_PLAN, root, DENSE_CARD, 0, null, record, null);
    return root;
}

/**
 * THIRTY-TWO PORTS, DECLARED IN THE ORDER `denseShape` MINTS THEM — which is document order, so the
 * keys interleave: the card's own attribute, the head's, three texts under it, and on down. It is
 * the longest widening ladder in the file, because a markup that mints starts the tables at zero
 * and doubles: 0 → 4 → 8 → 16 → 32 before a thirty-second port has anywhere to land.
 */
const DENSE_DECLARED_MARKS = {
    a0: EXO_PORT_ATTR,
    a1: EXO_PORT_ATTR,
    t0: EXO_PORT_TEXT,
    t1: EXO_PORT_TEXT,
    t2: EXO_PORT_TEXT,
    a2: EXO_PORT_ATTR,
    t3: EXO_PORT_TEXT,
    a3: EXO_PORT_ATTR,
    t4: EXO_PORT_TEXT,
    t5: EXO_PORT_TEXT,
    a4: EXO_PORT_ATTR,
    a5: EXO_PORT_ATTR,
    t6: EXO_PORT_TEXT,
    t7: EXO_PORT_TEXT,
    a6: EXO_PORT_ATTR,
    t8: EXO_PORT_TEXT,
    t9: EXO_PORT_TEXT,
    a7: EXO_PORT_ATTR,
    t10: EXO_PORT_TEXT,
    t11: EXO_PORT_TEXT,
    a8: EXO_PORT_ATTR,
    t12: EXO_PORT_TEXT,
    t13: EXO_PORT_TEXT,
    a9: EXO_PORT_ATTR,
    t14: EXO_PORT_TEXT,
    t15: EXO_PORT_TEXT,
    a10: EXO_PORT_ATTR,
    t16: EXO_PORT_TEXT,
    t17: EXO_PORT_TEXT,
    a11: EXO_PORT_ATTR,
    t18: EXO_PORT_TEXT,
    t19: EXO_PORT_TEXT,
} as const;

type TExoDeclaredDensePorts = TExoDeclaredPorts<typeof DENSE_DECLARED_MARKS>;

/** The two arrays `denseWireOf` reads, built ONCE per compile out of the declaration — and the same
 *  two the markup below places from, so the thirty-two positions are filled from one pair of lists
 *  exactly as `denseShape`'s pushes fill one pair. */
const denseDeclaredRecordOf = (P: TExoDeclaredDensePorts): TDensePorts => ({
    a: [P.a0, P.a1, P.a2, P.a3, P.a4, P.a5, P.a6, P.a7, P.a8, P.a9, P.a10, P.a11],
    t: [
        P.t0,
        P.t1,
        P.t2,
        P.t3,
        P.t4,
        P.t5,
        P.t6,
        P.t7,
        P.t8,
        P.t9,
        P.t10,
        P.t11,
        P.t12,
        P.t13,
        P.t14,
        P.t15,
        P.t16,
        P.t17,
        P.t18,
        P.t19,
    ],
});

const denseDeclaredShapeOf =
    (R: TDensePorts) =>
    (b: TExoEmitter<TExoDeclaredDensePorts>): void => {
        const a = R.a;
        const t = R.t;
        let ai = 0;
        let ti = 0;
        b.el('div', { class: `mc ${EXO_TOKEN}` }, (card) => {
            card.attrPort(a[ai++], 'data-k');
            card.el('div', { class: 'mc-head' }, (head) => {
                head.attrPort(a[ai++], 'data-k');
                head.el('h2', { class: 'mc-title' }, (n) => {
                    n.textPort(t[ti++]);
                });
                head.el('span', { class: 'mc-sub' }, (n) => {
                    n.textPort(t[ti++]);
                });
                head.el('span', { class: 'mc-badge' }, (n) => {
                    n.textPort(t[ti++]);
                });
            });
            card.el('div', { class: 'mc-body' }, (body) => {
                body.attrPort(a[ai++], 'data-k');
                body.el('p', { class: 'mc-lede' }, (n) => {
                    n.textPort(t[ti++]);
                });
                body.el('div', { class: 'mc-meta' }, (meta) => {
                    meta.attrPort(a[ai++], 'data-k');
                    meta.el('span', { class: 'mc-author' }, (n) => {
                        n.textPort(t[ti++]);
                    });
                    meta.el('time', { class: 'mc-when' }, (n) => {
                        n.textPort(t[ti++]);
                    });
                });
            });
            card.el('ul', { class: 'mc-rows' }, (list) => {
                list.attrPort(a[ai++], 'data-k');
                for (let r = 0; r < ROWS; r++) {
                    list.el('li', { class: 'mc-row' }, (row) => {
                        row.attrPort(a[ai++], 'data-k');
                        row.el('span', { class: 'mc-k' }, (n) => {
                            n.textPort(t[ti++]);
                        });
                        row.el('span', { class: 'mc-v' }, (n) => {
                            n.textPort(t[ti++]);
                        });
                    });
                }
            });
            card.el('div', { class: 'mc-foot' }, (foot) => {
                foot.attrPort(a[ai++], 'data-k');
                foot.el('span', { class: 'mc-count' }, (n) => {
                    n.textPort(t[ti++]);
                });
                foot.el('span', { class: 'mc-tail' }, (n) => {
                    n.textPort(t[ti++]);
                });
            });
        });
    };

const DENSE_DECLARED_PORTS: TExoDeclaredDensePorts = exoPorts(DENSE_DECLARED_MARKS);
const DENSE_DECLARED_RECORD: TDensePorts = denseDeclaredRecordOf(DENSE_DECLARED_PORTS);
const DENSE_DECLARED_CARD: TExoMachine<TExoDomNode, TExoDeclaredDensePorts> = {
    declaration: createExoSchema(DENSE_DECLARED_PORTS, denseDeclaredShapeOf(DENSE_DECLARED_RECORD)),
    forms: [],
    createInitialState: denseWireOf(DENSE_DECLARED_RECORD),
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};
const DENSE_DECLARED_PLAN: TExoDomSchema = exoDomSchemaOf(DENSE_DECLARED_CARD, EXO_BACKEND);

function denseDeclaredCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    const P = exoPorts(DENSE_DECLARED_MARKS);
    return exoDomSchemaOf(
        machineOf(createExoSchema(P, denseDeclaredShapeOf(denseDeclaredRecordOf(P)))),
        EXO_BACKEND
    );
}

function denseDeclaredBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = DENSE_DECLARED_PLAN.acquireNode(DENSE_DECLARED_PLAN);
    const record = DENSE_DECLARED_PLAN.createInstance(DENSE_DECLARED_PLAN);
    createExoNode(DENSE_DECLARED_PLAN, root, DENSE_DECLARED_CARD, 0, null, record, null);
    return root;
}

const DENSE_LADDER_NODES: Node[] = [];

function denseExodraCloneOnly(): Element {
    return DENSE_PLAN.acquireNode(DENSE_PLAN);
}

function denseExodraCloneWalk(): Element {
    const root = DENSE_PLAN.acquireNode(DENSE_PLAN);
    const walk = DENSE_PLAN.walk;
    const nodes: Node[] = [root];
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === EXO_WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
    DENSE_LADDER_NODES[0] = nodes[nodes.length - 1];
    return root;
}

function denseExodraCloneRecord(): Element {
    const root = DENSE_PLAN.acquireNode(DENSE_PLAN);
    DENSE_LADDER_NODES[1] = DENSE_PLAN.createInstance(DENSE_PLAN) as unknown as Node;
    return root;
}

// =========================================================================================
// SUBJECT 5 AND 6 — EVENTS, DIRECT AND EVENTS, DELEGATED. The card's thirty-two elements and
// fifteen values, plus a WORKING `click` handler on each of the six rows.
//
// WHY THIS IS THE SUBJECT THAT BREAKS A STRATEGY RATHER THAN RANKING FOUR. `cloneNode` does not
// copy event listeners — the DOM standard says so and every browser obeys it — and mikado's build
// is `apply the data to the FACTORY, then clone the factory` (`mikado.js:1114-1117`). So a
// template whose instances each carry a listener is a template mikado's mechanism cannot serve by
// cloning, and the card subject, which has NO event ports at all, never asked it the question.
//
// TWO STRATEGIES IN ONE TABLE, because the difference between them is a per-instance cost and a
// reader comparing them should not have to hold two tables in their head:
//
//   DIRECT      the handler lives on the ELEMENT. `EXO_DIRECT_EVENTS` stores handler and subject
//               in two element properties and registers ONE shared listener per element per event
//               (`createExoEventSlotSetter`), so re-filling a port costs two stores and no registration.
//               The floor's spelling is six module-level functions and six `addEventListener` —
//               no subject, no store, nothing to re-point — which is the smallest program that
//               answers a click on row three with row three's code.
//   DELEGATED   the handler lives on the ROOT. `createExoDelegatedEvents(['click'])` attaches NOTHING
//               to the instance: filling a port is two property stores, and one listener on the
//               render root climbs from `e.target` when somebody actually clicks. The floor's
//               spelling is the same two stores under its own key strings and its own root
//               listener, written out here rather than imported.
//
// THE GATE THAT MAKES THIS TABLE MEAN ANYTHING IS NOT THE BYTE GATE. A participant that
// "delegated" by attaching nothing at all — no store, no listener, no handler — would build the
// same bytes as everybody else and would be the fastest row in the table. So every event row's
// node is CLICKED, six times, once per row, and the run refuses by name unless six handlers ran in
// row order. Byte-identical output proves the tree; only a dispatch proves the handlers.
//
// MIKADO IS IN THE DELEGATED HALF AND NOT IN THE DIRECT ONE, and both halves of that are findings.
// Its only event mechanism is a ROUTE ATTRIBUTE — `<li click="name">` — which its compiler puts in
// `tpl.event` and its factory writes onto the FACTORY node with `setAttribute`
// (`node_modules/mikado/src/factory.js:265`), plus one process-global listener on the document
// (`listen(key)`, `src/event.js`). So:
//   · DELEGATED it expresses better than anyone here: the registration is a static attribute, so
//     it is CLONED, and mikado's per-instance event cost is ZERO. Nothing is stored, nothing is
//     attached, nothing is addressed.
//   · DIRECT it cannot express at all. There is no per-element handler in mikado's model; a user
//     who wants one must find the rows in the clone and attach by hand, which is the addressing
//     mikado's fill-then-clone deliberately never does.
//   · AND ITS NODE IS NOT BYTE-IDENTICAL: the six route attributes are IN the markup. They are
//     checked by a gate of their own — strip exactly `ROWS` occurrences of ` click="exotplrN"` and
//     the remainder must equal the shared reference byte for byte — because a divergence that is
//     stated and checked is a finding, and one that is quietly tolerated is not.
// =========================================================================================

interface TEventRowSubject {
    readonly row: number;
}

const EVENT_ROW_SUBJECTS: readonly TEventRowSubject[] = [0, 1, 2, 3, 4, 5].map((row) => ({ row }));

/** Where a dispatched click leaves its mark. Read and emptied only by the live gates; nothing in a
 *  timed region touches it, because no timed region clicks anything. */
const EVENT_SEEN: number[] = [];

function noteEventRow(row: number): void {
    EVENT_SEEN.push(row);
}

/** The SHARED handler — one function for all six rows of every instance, told which row it is on
 *  by its subject. This is the form delegation exists for, and the direct strategy takes it too. */
function exoRowHandler(this: Element, _event: Event, subject?: unknown): void {
    noteEventRow((subject as TEventRowSubject).row);
}

/**
 * THE FLOOR'S DIRECT HANDLERS — six module-level functions, one per POSITION, and no subject
 * anywhere. A hand-written program over a fixed six-row template knows at author time which row is
 * which, so it needs neither a closure per row nor a store to tell a shared function where it
 * fired. That is a SMALLER job than the shared-handler form the other rows do, and it is named
 * here rather than hidden: what the floor gives up is the ability to re-point a handler or to
 * serve a row it did not know about when it was written.
 */
function floorRow0(): void {
    noteEventRow(0);
}
function floorRow1(): void {
    noteEventRow(1);
}
function floorRow2(): void {
    noteEventRow(2);
}
function floorRow3(): void {
    noteEventRow(3);
}
function floorRow4(): void {
    noteEventRow(4);
}
function floorRow5(): void {
    noteEventRow(5);
}

const FLOOR_HANDLER_KEY = '__floorOn$click';
const FLOOR_SUBJECT_KEY = '__floorSubject$click';

/** The floor's delegated listener, and it is `createExoDelegatedListener`'s walk written by hand: from
 *  `e.target` up to the root, one property load per ancestor, stopping at the first handler. */
function floorDelegatedListener(root: Element): EventListener {
    return (e: Event): void => {
        let node: Node | null = e.target as Node | null;
        while (node !== null) {
            if (node.nodeType === 1) {
                const carrier = node as unknown as Record<PropertyKey, unknown>;
                const handler = carrier[FLOOR_HANDLER_KEY];
                if (handler !== undefined) {
                    (handler as (event: Event, subject?: unknown) => void).call(
                        node,
                        e,
                        carrier[FLOOR_SUBJECT_KEY]
                    );
                    return;
                }
            }
            if (node === root) return;
            node = node.parentNode;
        }
    };
}

interface TEventRefs {
    readonly root: Element;
    readonly r0: Element;
    readonly r1: Element;
    readonly r2: Element;
    readonly r3: Element;
    readonly r4: Element;
    readonly r5: Element;
}

/** The card's fifteen writes, its addressing, AND six listeners — the floor for the direct case,
 *  keeping the six row elements because a program that attached a listener it can never remove
 *  again is not what anybody writes. */
function eventFloorDirectKeepBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    r0.addEventListener('click', floorRow0);
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    r1.addEventListener('click', floorRow1);
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    r2.addEventListener('click', floorRow2);
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    r3.addEventListener('click', floorRow3);
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    r4.addEventListener('click', floorRow4);
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    r5.addEventListener('click', floorRow5);
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}
/** The twin of `eventFloorDirectKeepBuild`, whose true difference from it is ZERO. */
function eventTwinDirectBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const node = proto.cloneNode(true) as Element;
    node.setAttribute('data-id', d.id);
    const top = node.firstChild as Element;
    const h2 = top.firstChild as Element;
    (h2.firstChild as Text).data = d.title;
    const small = h2.nextSibling as Element;
    (small.firstChild as Text).data = d.subtitle;
    (top.lastChild as Element).setAttribute('data-state', d.state);
    const mid = top.nextSibling as Element;
    const para = mid.firstChild as Element;
    (para.firstChild as Text).data = d.lede;
    const pair = mid.lastChild as Element;
    const who = pair.firstChild as Element;
    (who.firstChild as Text).data = d.author;
    const stamp = pair.lastChild as Element;
    stamp.setAttribute('datetime', d.when);
    (stamp.firstChild as Text).data = d.whenText;
    const bag = mid.nextSibling as Element;
    const q0 = bag.firstChild as Element;
    ((q0.lastChild as Element).firstChild as Text).data = d.v0;
    q0.addEventListener('click', floorRow0);
    const q1 = q0.nextSibling as Element;
    ((q1.lastChild as Element).firstChild as Text).data = d.v1;
    q1.addEventListener('click', floorRow1);
    const q2 = q1.nextSibling as Element;
    ((q2.lastChild as Element).firstChild as Text).data = d.v2;
    q2.addEventListener('click', floorRow2);
    const q3 = q2.nextSibling as Element;
    ((q3.lastChild as Element).firstChild as Text).data = d.v3;
    q3.addEventListener('click', floorRow3);
    const q4 = q3.nextSibling as Element;
    ((q4.lastChild as Element).firstChild as Text).data = d.v4;
    q4.addEventListener('click', floorRow4);
    const q5 = q4.nextSibling as Element;
    ((q5.lastChild as Element).firstChild as Text).data = d.v5;
    q5.addEventListener('click', floorRow5);
    const bottom = bag.nextSibling as Element;
    ((bottom.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root: node, r0: q0, r1: q1, r2: q2, r3: q3, r4: q4, r5: q5 });
    return node;
}

/** The floor for the delegated case: the same addressing, and two property stores per row instead
 *  of a registration. The root listener is installed ONCE, outside every timed region, which is
 *  what delegation is for and is why no row here pays for it. */
function eventFloorDelegatedBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    const c0 = r0 as unknown as Record<PropertyKey, unknown>;
    c0[FLOOR_HANDLER_KEY] = exoRowHandler;
    c0[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[0];
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    const c1 = r1 as unknown as Record<PropertyKey, unknown>;
    c1[FLOOR_HANDLER_KEY] = exoRowHandler;
    c1[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[1];
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    const c2 = r2 as unknown as Record<PropertyKey, unknown>;
    c2[FLOOR_HANDLER_KEY] = exoRowHandler;
    c2[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[2];
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    const c3 = r3 as unknown as Record<PropertyKey, unknown>;
    c3[FLOOR_HANDLER_KEY] = exoRowHandler;
    c3[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[3];
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    const c4 = r4 as unknown as Record<PropertyKey, unknown>;
    c4[FLOOR_HANDLER_KEY] = exoRowHandler;
    c4[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[4];
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    const c5 = r5 as unknown as Record<PropertyKey, unknown>;
    c5[FLOOR_HANDLER_KEY] = exoRowHandler;
    c5[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[5];
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}

function eventStage0Markup(token: string): string {
    let rows = '';
    for (let r = 0; r < ROWS; r++) {
        rows +=
            `<li class="mc-row" #r${r}><span class="mc-k">field</span>` +
            `<span class="mc-v">#v${r}</span></li>`;
    }
    return (
        `<div class="mc ${token}">` +
        '<div class="mc-head">' +
        '<h2 class="mc-title">#title</h2>' +
        '<span class="mc-sub">#subtitle</span>' +
        '<span class="mc-badge" #badge>new</span>' +
        '</div>' +
        '<div class="mc-body">' +
        '<p class="mc-lede">#lede</p>' +
        '<div class="mc-meta">' +
        '<span class="mc-author">#author</span>' +
        '<time class="mc-when" #when>#whenText</time>' +
        '</div>' +
        '</div>' +
        `<ul class="mc-rows">${rows}</ul>` +
        '<div class="mc-foot">' +
        '<span class="mc-count">#count</span>' +
        '<span class="mc-tail">tail</span>' +
        '</div>' +
        '</div>'
    );
}

const EVENT_STAGE0_PIECES: readonly TemplateStringsArray[] = TOKENS.map((t) =>
    onePiece(eventStage0Markup(t))
);

interface TEventStage0Refs extends TStage0Refs {
    readonly r0: Element;
    readonly r1: Element;
    readonly r2: Element;
    readonly r3: Element;
    readonly r4: Element;
    readonly r5: Element;
}

function eventStage0DirectBuild(tpl: TStage0Template, d: TCardData): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TEventStage0Refs;
    node.setAttribute('data-id', d.id);
    refs.title.data = d.title;
    refs.subtitle.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.lede.data = d.lede;
    refs.author.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.count.data = d.count;
    refs.r0.addEventListener('click', floorRow0);
    refs.r1.addEventListener('click', floorRow1);
    refs.r2.addEventListener('click', floorRow2);
    refs.r3.addEventListener('click', floorRow3);
    refs.r4.addEventListener('click', floorRow4);
    refs.r5.addEventListener('click', floorRow5);
    return node;
}

function eventStage0DelegatedBuild(tpl: TStage0Template, d: TCardData): Element {
    const node = tpl.cloneNode(true) as Element;
    const refs = tpl.collect(node) as unknown as TEventStage0Refs;
    node.setAttribute('data-id', d.id);
    refs.title.data = d.title;
    refs.subtitle.data = d.subtitle;
    refs.badge.setAttribute('data-state', d.state);
    refs.lede.data = d.lede;
    refs.author.data = d.author;
    refs.when.setAttribute('datetime', d.when);
    refs.whenText.data = d.whenText;
    refs.v0.data = d.v0;
    refs.v1.data = d.v1;
    refs.v2.data = d.v2;
    refs.v3.data = d.v3;
    refs.v4.data = d.v4;
    refs.v5.data = d.v5;
    refs.count.data = d.count;
    const s0 = refs.r0 as unknown as Record<PropertyKey, unknown>;
    s0[FLOOR_HANDLER_KEY] = exoRowHandler;
    s0[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[0];
    const s1 = refs.r1 as unknown as Record<PropertyKey, unknown>;
    s1[FLOOR_HANDLER_KEY] = exoRowHandler;
    s1[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[1];
    const s2 = refs.r2 as unknown as Record<PropertyKey, unknown>;
    s2[FLOOR_HANDLER_KEY] = exoRowHandler;
    s2[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[2];
    const s3 = refs.r3 as unknown as Record<PropertyKey, unknown>;
    s3[FLOOR_HANDLER_KEY] = exoRowHandler;
    s3[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[3];
    const s4 = refs.r4 as unknown as Record<PropertyKey, unknown>;
    s4[FLOOR_HANDLER_KEY] = exoRowHandler;
    s4[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[4];
    const s5 = refs.r5 as unknown as Record<PropertyKey, unknown>;
    s5[FLOOR_HANDLER_KEY] = exoRowHandler;
    s5[FLOOR_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[5];
    return node;
}

/** The card's markup with SIX ROUTE ATTRIBUTES, which is the whole of mikado's registration and
 *  the whole of its divergence. One route per row, so the route NAME carries the row and no extra
 *  attribute has to be added to anybody's subject to tell the handler where it fired. */
function eventMikadoMarkup(token: string): string {
    let rows = '';
    for (let r = 0; r < ROWS; r++) {
        rows +=
            `<li class="mc-row" click="exotplr${r}"><span class="mc-k">field</span>` +
            `<span class="mc-v">{{ data.v${r} }}</span></li>`;
    }
    return (
        `<div class="mc ${token}" data-id="{{ data.id }}">` +
        '<div class="mc-head">' +
        '<h2 class="mc-title">{{ data.title }}</h2>' +
        '<span class="mc-sub">{{ data.subtitle }}</span>' +
        '<span class="mc-badge" data-state="{{ data.state }}">new</span>' +
        '</div>' +
        '<div class="mc-body">' +
        '<p class="mc-lede">{{ data.lede }}</p>' +
        '<div class="mc-meta">' +
        '<span class="mc-author">{{ data.author }}</span>' +
        '<time class="mc-when" datetime="{{ data.when }}">{{ data.whenText }}</time>' +
        '</div>' +
        '</div>' +
        `<ul class="mc-rows">${rows}</ul>` +
        '<div class="mc-foot">' +
        '<span class="mc-count">{{ data.count }}</span>' +
        '<span class="mc-tail">tail</span>' +
        '</div>' +
        '</div>'
    );
}

const EVENT_MIKADO_MARKUP: readonly string[] = TOKENS.map(eventMikadoMarkup);

interface TEventPorts extends TCardPorts {
    readonly c0: TExoEventPort;
    readonly c1: TExoEventPort;
    readonly c2: TExoEventPort;
    readonly c3: TExoEventPort;
    readonly c4: TExoEventPort;
    readonly c5: TExoEventPort;
}

const eventShape = (b: TExoSchemaCursor): TEventPorts => {
    let id!: TExoAttrPort;
    let title!: TExoTextPort;
    let subtitle!: TExoTextPort;
    let state!: TExoAttrPort;
    let lede!: TExoTextPort;
    let author!: TExoTextPort;
    let when!: TExoAttrPort;
    let whenText!: TExoTextPort;
    let count!: TExoTextPort;
    const vs: TExoTextPort[] = [];
    const cs: TExoEventPort[] = [];
    b.el('div', { class: `mc ${EXO_TOKEN}` }, (card) => {
        id = card.port('data-id');
        card.el('div', { class: 'mc-head' }, (head) => {
            head.el('h2', { class: 'mc-title' }, (n) => {
                title = n.textPort();
            });
            head.el('span', { class: 'mc-sub' }, (n) => {
                subtitle = n.textPort();
            });
            head.el('span', { class: 'mc-badge' }, (n) => {
                state = n.port('data-state');
                n.text('new');
            });
        });
        card.el('div', { class: 'mc-body' }, (body) => {
            body.el('p', { class: 'mc-lede' }, (n) => {
                lede = n.textPort();
            });
            body.el('div', { class: 'mc-meta' }, (meta) => {
                meta.el('span', { class: 'mc-author' }, (n) => {
                    author = n.textPort();
                });
                meta.el('time', { class: 'mc-when' }, (n) => {
                    when = n.port('datetime');
                    whenText = n.textPort();
                });
            });
        });
        card.el('ul', { class: 'mc-rows' }, (list) => {
            for (let r = 0; r < ROWS; r++) {
                list.el('li', { class: 'mc-row' }, (row) => {
                    cs.push(row.eventPort('click'));
                    row.el('span', { class: 'mc-k' }, (n) => {
                        n.text('field');
                    });
                    row.el('span', { class: 'mc-v' }, (n) => {
                        vs.push(n.textPort());
                    });
                });
            }
        });
        card.el('div', { class: 'mc-foot' }, (foot) => {
            foot.el('span', { class: 'mc-count' }, (n) => {
                count = n.textPort();
            });
            foot.el('span', { class: 'mc-tail' }, (n) => {
                n.text('tail');
            });
        });
    });
    return {
        id,
        title,
        subtitle,
        state,
        lede,
        author,
        when,
        whenText,
        v0: vs[0],
        v1: vs[1],
        v2: vs[2],
        v3: vs[3],
        v4: vs[4],
        v5: vs[5],
        count,
        c0: cs[0],
        c1: cs[1],
        c2: cs[2],
        c3: cs[3],
        c4: cs[4],
        c5: cs[5],
    };
};

/** ONE wire for BOTH strategies. `c.on` calls the `attach` of whatever events pack the schema was
 *  compiled with, so the direct row and the delegated row run THIS function and differ only in
 *  the pack behind it — which is the claim a strategy plugin makes, tested rather than repeated. */
const eventWireOf =
    (P: TEventPorts): TExoMachineInitialState<TExoDomNode> =>
    (c, i) => {
        const d = BUILDING[i];
        c.attr(P.id, d.id);
        c.text(P.title, d.title);
        c.text(P.subtitle, d.subtitle);
        c.attr(P.state, d.state);
        c.text(P.lede, d.lede);
        c.text(P.author, d.author);
        c.attr(P.when, d.when);
        c.text(P.whenText, d.whenText);
        c.text(P.v0, d.v0);
        c.text(P.v1, d.v1);
        c.text(P.v2, d.v2);
        c.text(P.v3, d.v3);
        c.text(P.v4, d.v4);
        c.text(P.v5, d.v5);
        c.text(P.count, d.count);
        c.on(P.c0, exoRowHandler, EVENT_ROW_SUBJECTS[0]);
        c.on(P.c1, exoRowHandler, EVENT_ROW_SUBJECTS[1]);
        c.on(P.c2, exoRowHandler, EVENT_ROW_SUBJECTS[2]);
        c.on(P.c3, exoRowHandler, EVENT_ROW_SUBJECTS[3]);
        c.on(P.c4, exoRowHandler, EVENT_ROW_SUBJECTS[4]);
        c.on(P.c5, exoRowHandler, EVENT_ROW_SUBJECTS[5]);
    };

const EVENT_CARD_SCHEMA = createExoSchema(eventShape);
const mEVENT_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_CARD_SCHEMA);
mEVENT_CARD.createInitialState(eventWireOf(EVENT_CARD_SCHEMA.ports));
const EVENT_CARD = mEVENT_CARD.done();

/**
 * THE DELEGATED PACK AND THE BACKEND THAT CARRIES IT, one for the process. A pack built per
 * repetition would number its own slot namespace afresh, and a backend built per repetition would
 * be a new schema-cache key and therefore a re-parse of every declaration it touched — which would
 * make the delegated row a compile measurement wearing a build row's name.
 */
const EVENT_DELEGATED_PACK: TExoEventsApi = createExoDelegatedEvents(['click']);
const EVENT_DELEGATED_BACKEND = composeExoPlugins(new ExoDomBackend(), {
    events: () => EVENT_DELEGATED_PACK,
});

const EVENT_DIRECT_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_CARD, EXO_BACKEND);
const EVENT_DELEGATED_CARD_SCHEMA = createExoSchema(eventShape);
const mEVENT_DELEGATED_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_DELEGATED_CARD_SCHEMA);
mEVENT_DELEGATED_CARD.createInitialState(eventWireOf(EVENT_DELEGATED_CARD_SCHEMA.ports));
const EVENT_DELEGATED_CARD = mEVENT_DELEGATED_CARD.done();
const EVENT_DELEGATED_PLAN: TExoDomSchema = exoDomSchemaOf(
    EVENT_DELEGATED_CARD,
    EVENT_DELEGATED_BACKEND
);

function eventDirectCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    return exoDomSchemaOf(machineOf(createExoSchema(eventShape)), EXO_BACKEND);
}

function eventDelegatedCompile(token: string): TExoDomSchema {
    EXO_TOKEN = token;
    return exoDomSchemaOf(machineOf(createExoSchema(eventShape)), EVENT_DELEGATED_BACKEND);
}

function eventDirectBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_DIRECT_PLAN.acquireNode(EVENT_DIRECT_PLAN);
    const record = EVENT_DIRECT_PLAN.createInstance(EVENT_DIRECT_PLAN);
    createExoNode(EVENT_DIRECT_PLAN, root, EVENT_CARD, 0, null, record, null);
    return root;
}

function eventDelegatedBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_DELEGATED_PLAN.acquireNode(EVENT_DELEGATED_PLAN);
    const record = EVENT_DELEGATED_PLAN.createInstance(EVENT_DELEGATED_PLAN);
    createExoNode(EVENT_DELEGATED_PLAN, root, EVENT_DELEGATED_CARD, 0, null, record, null);
    return root;
}

// =========================================================================================
// THE EVENT LADDER — WHERE THE PER-HANDLER COST GOES, AND IT IS FOUR HAND-WRITTEN PROGRAMS AND
// TWO EXODRA RUNGS RATHER THAN A SUBTRACTION BETWEEN TWO TABLES.
//
// The table above puts six handlers of ours beside six `addEventListener` and says NOTHING about
// which part of a fill the difference is. The one a reader would reach for — an events row minus
// the same participant's card row — crosses two tables, measured in two rotations at two batch
// sizes, and a difference taken across two regions is not a difference this run measured. So the
// decomposition is RUNGS INSIDE THE EVENTS TABLE, each isolating one term, all in one rotation:
//
//   floor·slots+on   the card, and per row the SAME TWO PROPERTY STORES the shipped direct `attach`
//                    makes, under the SAME TWO KEY STRINGS, plus one `addEventListener` with a
//                    process-shared listener. No Exodra, no declaration, no schema. THIS IS THE RUNG
//                    THE QUESTION TURNS ON: if it lands near our per-handler figure, that cost is what
//                    the platform charges for two named properties on an Element and our packs are
//                    honest; if it lands near `floor·direct`, the cost is ours.
//   floor·on         the SAME program with the two stores removed, so `floor·slots+on − floor·on`
//                    prices the stores alone inside ONE program.
//   floor·slots      the SAME program with the `addEventListener` removed — the delegated shape,
//                    hand-written — so the other subtraction prices the registration alone.
//   floor·1slot+on   the same again, storing handler and subject as ONE two-field object under ONE
//                    key, which prices one store of the two.
//   exodra·merged    `exodra·direct`'s program again — the SHIPPED DIRECT pack, the same wire, the
//                    same bytes, the same six live handlers — on a backend given a FURTHER
//                    `composeExoPlugins` pass after construction (every backend here is built by one
//                    inside the constructor) with a plugin that changes nothing observable. So
//                    `exodra·merged − exodra·direct` holds COMPOSITION and no strategy at all, and
//                    it is the row the two merged rows below belong against: every term this table
//                    has taken against `exodra·direct` carried a merge and a second schema under a
//                    strategy's name, and against this rung both cancel.
//   exodra·nowrite   our whole path, with an events pack whose `attach` does nothing at all:
//                    `exodra·direct − exodra·nowrite` is the shipped direct `attach`'s BODY
//                    measured inside our path, with the dispatch to the port left standing.
//   exodra·noports   the CARD component — a declaration with no event ports — built in THIS table's
//                    rotation, so what six ports cost us before any `attach` runs is a difference
//                    between two rows of one table.
//   exodra·ports     the EVENT declaration filled by the CARD's wire: six event ports declared and
//                    `c.on` never called, which splits the line above into the ports' STRUCTURE
//                    and the six dispatches.
//   exodra·oncopy    `on`'s body transcribed into this file and called as a plain function, so
//                    `exodra·nowrite − exodra·oncopy` prices HOW THE DOOR IS REACHED: a method on
//                    a surface three record shapes share, against a plain call to a function in
//                    this file. Both bodies then load `schema.events.attach` and call it, so the
//                    POLYMORPHIC SETTER SITE this term used to be read as — `schema.setters[index]`
//                    seeing three setters on the shipped side and one on the copy's — is no longer
//                    in it, and no rung of this table prices it.
//
// AND TWO RUNGS THIS TABLE NO LONGER HAS, each because the term it removed is no longer in the
// code it copied:
//
//   exodra·nojournal  the copy with `written[writes++] = index` gone, which priced the per-fill
//                     journal. `@exodra/dom` does not journal a fill any more — the store, the
//                     `written`/`writes` pair on the record and the unfilled-port sweep that was
//                     their only reader are all gone.
//   exodra·noassert   the copy with `assertExoEventPort` gone, which priced the port-kind compare.
//                     `@exodra/core` no longer exports that function; the fill doors narrow the
//                     port by TYPE — `on(port: TExoEventPort, …)` — so no typed program reaches a
//                     runtime compare, and `eventOnCopy` above has none either.
//
// Both would now be `exodra·oncopy` under a second name, and both subtractions a guaranteed zero
// with the shape of a measurement. Neither term is measured here.
//
// THE KEYS ARE SYMBOLS, BUILT THE WAY OURS ARE. `exoEventSlotsFor` makes one symbol per pack and
// event name and caches it; the port's datum carries it and `attach` reads it off that datum on
// every fill. The one-slot rung has a pack id of its own, because a rung storing an OBJECT under
// the key the other rungs store a FUNCTION under would generalise the field's tracked type for
// whichever ran second.
// =========================================================================================

const EXO_SLOT_PACK_ID = 'direct';
const EXO_SLOT_EVENT = 'click';
const EXO_SLOT_HANDLER_KEY = Symbol('exoOn$' + EXO_SLOT_PACK_ID + '$' + EXO_SLOT_EVENT);
const EXO_SLOT_SUBJECT_KEY = Symbol('exoSubject$' + EXO_SLOT_PACK_ID + '$' + EXO_SLOT_EVENT);
const EXO_PAIR_PACK_ID = 'onebox';
const EXO_PAIR_KEY = Symbol('exoOn$' + EXO_PAIR_PACK_ID + '$' + EXO_SLOT_EVENT);

/** Counted so `floor·on` can be shown to have ATTACHED six listeners while routing nothing, which
 *  is the only thing a rung with no handler to reach can be gated on. Every increment happens on a
 *  DISPATCH, and no timed region in this file dispatches anything. */
let SLOT_LISTENER_RUNS = 0;

/** `exoDirectListenerFor('click')`'s body, written out: one listener object for the process, the
 *  handler and the subject read off the element it fired on. */
const slotShapedListener: EventListener = (e: Event): void => {
    SLOT_LISTENER_RUNS++;
    const node = e.currentTarget as Element | null;
    if (node === null) return;
    const carrier = node as unknown as Record<PropertyKey, unknown>;
    const handler = carrier[EXO_SLOT_HANDLER_KEY];
    if (handler === undefined) return;
    (handler as (event: Event, subject?: unknown) => void).call(
        node,
        e,
        carrier[EXO_SLOT_SUBJECT_KEY]
    );
};

interface TEventRowPair {
    readonly handler: (this: Element, event: Event, subject?: unknown) => void;
    readonly subject: TEventRowSubject;
}

/** Six pairs for the process, so the one-slot rung is ONE STORE and not a store plus an allocation.
 *  That is a job our `attach` cannot do: its handler and its subject arrive per instance, so it has
 *  nothing to have allocated in advance, and this rung is a bound rather than an alternative. */
const EVENT_ROW_PAIRS: readonly TEventRowPair[] = EVENT_ROW_SUBJECTS.map((subject) => ({
    handler: exoRowHandler,
    subject,
}));

const pairShapedListener: EventListener = (e: Event): void => {
    const node = e.currentTarget as Element | null;
    if (node === null) return;
    const pair = (node as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] as
        | TEventRowPair
        | undefined;
    if (pair === undefined) return;
    pair.handler.call(node, e, pair.subject);
};

/** RUNG 1 — the card, plus per row exactly what `attachExoDirectEvent` does: store the handler,
 *  store the subject, register the shared listener. The stores land on the CLONE this function
 *  built, which is the node shape our own `attach` writes into. */
function eventFloorSlotsListenBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    const c0 = r0 as unknown as Record<PropertyKey, unknown>;
    c0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c0[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[0];
    r0.addEventListener('click', slotShapedListener);
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    const c1 = r1 as unknown as Record<PropertyKey, unknown>;
    c1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c1[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[1];
    r1.addEventListener('click', slotShapedListener);
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    const c2 = r2 as unknown as Record<PropertyKey, unknown>;
    c2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c2[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[2];
    r2.addEventListener('click', slotShapedListener);
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    const c3 = r3 as unknown as Record<PropertyKey, unknown>;
    c3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c3[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[3];
    r3.addEventListener('click', slotShapedListener);
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    const c4 = r4 as unknown as Record<PropertyKey, unknown>;
    c4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c4[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[4];
    r4.addEventListener('click', slotShapedListener);
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    const c5 = r5 as unknown as Record<PropertyKey, unknown>;
    c5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c5[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[5];
    r5.addEventListener('click', slotShapedListener);
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}

/**
 * RUNG 1b — `attachExoDirectEvent`'s four lines TRANSCRIBED, guard included. The shipped body reads
 * the handler slot before writing it and registers only when that read came back `undefined`, which
 * is a TRADE and not dead weight: the read buys the absence of a second `addEventListener`, and a
 * second `addEventListener` with the same type, the same callback object and the same capture flag
 * is a no-op by specification. Its two halves fall in two different tables and this is the first —
 * ON A FRESH CLONE THE SLOT IS ABSENT, so the read misses on the instance and walks the prototype
 * chain and Blink's named-property interceptor before coming back empty. `floor·slots+on` is this
 * same program with the guard removed and the registration made unconditional, so the pair is what
 * the guard costs us on every build.
 */
function eventFloorServedListenBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    const c0 = r0 as unknown as Record<PropertyKey, unknown>;
    const served0 = c0[EXO_SLOT_HANDLER_KEY] !== undefined;
    c0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c0[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[0];
    if (!served0) r0.addEventListener('click', slotShapedListener);
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    const c1 = r1 as unknown as Record<PropertyKey, unknown>;
    const served1 = c1[EXO_SLOT_HANDLER_KEY] !== undefined;
    c1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c1[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[1];
    if (!served1) r1.addEventListener('click', slotShapedListener);
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    const c2 = r2 as unknown as Record<PropertyKey, unknown>;
    const served2 = c2[EXO_SLOT_HANDLER_KEY] !== undefined;
    c2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c2[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[2];
    if (!served2) r2.addEventListener('click', slotShapedListener);
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    const c3 = r3 as unknown as Record<PropertyKey, unknown>;
    const served3 = c3[EXO_SLOT_HANDLER_KEY] !== undefined;
    c3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c3[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[3];
    if (!served3) r3.addEventListener('click', slotShapedListener);
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    const c4 = r4 as unknown as Record<PropertyKey, unknown>;
    const served4 = c4[EXO_SLOT_HANDLER_KEY] !== undefined;
    c4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c4[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[4];
    if (!served4) r4.addEventListener('click', slotShapedListener);
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    const c5 = r5 as unknown as Record<PropertyKey, unknown>;
    const served5 = c5[EXO_SLOT_HANDLER_KEY] !== undefined;
    c5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c5[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[5];
    if (!served5) r5.addEventListener('click', slotShapedListener);
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}

/** RUNG 2 — rung 1 with the two stores GONE and the same shared listener still registered. It is
 *  not `floor·direct` written twice: that row registers six DIFFERENT module-level functions, this
 *  one registers the function rung 1 registers, which is what makes the pair a subtraction. */
function eventFloorListenOnlyBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    r0.addEventListener('click', slotShapedListener);
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    r1.addEventListener('click', slotShapedListener);
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    r2.addEventListener('click', slotShapedListener);
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    r3.addEventListener('click', slotShapedListener);
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    r4.addEventListener('click', slotShapedListener);
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    r5.addEventListener('click', slotShapedListener);
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}

/** RUNG 3 — rung 1 with the registration gone: the two stores and nothing else. It is the delegated
 *  shape hand-written, and it is not `floor·delegated` written twice — that row stores under
 *  fifteen- and twenty-character names of its own, and a shorter name is a different store. */
function eventFloorSlotsOnlyBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    const c0 = r0 as unknown as Record<PropertyKey, unknown>;
    c0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c0[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[0];
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    const c1 = r1 as unknown as Record<PropertyKey, unknown>;
    c1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c1[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[1];
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    const c2 = r2 as unknown as Record<PropertyKey, unknown>;
    c2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c2[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[2];
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    const c3 = r3 as unknown as Record<PropertyKey, unknown>;
    c3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c3[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[3];
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    const c4 = r4 as unknown as Record<PropertyKey, unknown>;
    c4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c4[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[4];
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    const c5 = r5 as unknown as Record<PropertyKey, unknown>;
    c5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c5[EXO_SLOT_SUBJECT_KEY] = EVENT_ROW_SUBJECTS[5];
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}

/** RUNG 5 — rung 1 with ONE store where it makes two, and its own listener to read the pair back.
 *  Its handlers are live, so what it prices is a real alternative spelling and not a shortcut. */
function eventFloorOneSlotBuild(proto: Element, d: TCardData, into: TEventRefs[]): Element {
    const root = proto.cloneNode(true) as Element;
    root.setAttribute('data-id', d.id);
    const head = root.firstChild as Element;
    const title = head.firstChild as Element;
    (title.firstChild as Text).data = d.title;
    const sub = title.nextSibling as Element;
    (sub.firstChild as Text).data = d.subtitle;
    (head.lastChild as Element).setAttribute('data-state', d.state);
    const body = head.nextSibling as Element;
    const lede = body.firstChild as Element;
    (lede.firstChild as Text).data = d.lede;
    const meta = body.lastChild as Element;
    const author = meta.firstChild as Element;
    (author.firstChild as Text).data = d.author;
    const when = meta.lastChild as Element;
    when.setAttribute('datetime', d.when);
    (when.firstChild as Text).data = d.whenText;
    const list = body.nextSibling as Element;
    const r0 = list.firstChild as Element;
    ((r0.lastChild as Element).firstChild as Text).data = d.v0;
    (r0 as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] = EVENT_ROW_PAIRS[0];
    r0.addEventListener('click', pairShapedListener);
    const r1 = r0.nextSibling as Element;
    ((r1.lastChild as Element).firstChild as Text).data = d.v1;
    (r1 as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] = EVENT_ROW_PAIRS[1];
    r1.addEventListener('click', pairShapedListener);
    const r2 = r1.nextSibling as Element;
    ((r2.lastChild as Element).firstChild as Text).data = d.v2;
    (r2 as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] = EVENT_ROW_PAIRS[2];
    r2.addEventListener('click', pairShapedListener);
    const r3 = r2.nextSibling as Element;
    ((r3.lastChild as Element).firstChild as Text).data = d.v3;
    (r3 as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] = EVENT_ROW_PAIRS[3];
    r3.addEventListener('click', pairShapedListener);
    const r4 = r3.nextSibling as Element;
    ((r4.lastChild as Element).firstChild as Text).data = d.v4;
    (r4 as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] = EVENT_ROW_PAIRS[4];
    r4.addEventListener('click', pairShapedListener);
    const r5 = r4.nextSibling as Element;
    ((r5.lastChild as Element).firstChild as Text).data = d.v5;
    (r5 as unknown as Record<PropertyKey, unknown>)[EXO_PAIR_KEY] = EVENT_ROW_PAIRS[5];
    r5.addEventListener('click', pairShapedListener);
    const foot = list.nextSibling as Element;
    ((foot.firstChild as Element).firstChild as Text).data = d.count;
    into.push({ root, r0, r1, r2, r3, r4, r5 });
    return root;
}

/**
 * RUNG 4 — OUR PATH WITH THE FILL EMPTIED, and it is composed the way the delegated row is
 * composed rather than reached around: an events pack is an object with a `port` and an `attach`,
 * and a pack whose `attach` does nothing is a legal pack this axis can build out of the barrel's
 * own datum factory.
 *
 * IT SUPPLIES NO `install`, which is the truth about it — a pack that never writes has no root to
 * listen on, and that field is the pack surface's only optional one: `render` tests it before it
 * mounts anything, and a pack without it never reaches the notion of a root.
 */
const EVENT_NOWRITE_ATTACH: TExoEventAttacher = () => undefined;
const EVENT_NULL_PACK: TExoEventsApi = {
    name: 'nowrite(click)',
    port: (event) => createExoEventPortData(exoEventSlotsFor('nowrite', event), null),
    attach: EVENT_NOWRITE_ATTACH,
};
const EVENT_NOWRITE_BACKEND = composeExoPlugins(new ExoDomBackend(), {
    events: () => EVENT_NULL_PACK,
});
const EVENT_NOWRITE_CARD_SCHEMA = createExoSchema(eventShape);
const mEVENT_NOWRITE_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_NOWRITE_CARD_SCHEMA);
mEVENT_NOWRITE_CARD.createInitialState(eventWireOf(EVENT_NOWRITE_CARD_SCHEMA.ports));
const EVENT_NOWRITE_CARD = mEVENT_NOWRITE_CARD.done();
const EVENT_NOWRITE_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_NOWRITE_CARD, EVENT_NOWRITE_BACKEND);

function eventNoWriteBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_NOWRITE_PLAN.acquireNode(EVENT_NOWRITE_PLAN);
    const record = EVENT_NOWRITE_PLAN.createInstance(EVENT_NOWRITE_PLAN);
    createExoNode(EVENT_NOWRITE_PLAN, root, EVENT_NOWRITE_CARD, 0, null, record, null);
    return root;
}

/**
 * RUNG 12 — `exodra·direct` ON A COMPOSED BACKEND AND NOTHING ELSE CHANGED. A USER'S MERGE IS A
 * SECOND PASS AND NOT THE FIRST, which is the thing to have straight before reading the term:
 * `ExoDomBackendBase`'s constructor calls `composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY,
 * EXO_DOM_NODE_VOCABULARY)`, so EVERY backend in this file — the plain `EXO_BACKEND` included — was
 * built by that function and carries its writes. What a composition adds is a FURTHER pass, after
 * construction, over a surface that already has every name on it; that is what `withExoHydration`
 * and every other surviving `with*` decorator do, and it is what this rung has and `exodra·direct`
 * has not.
 *
 * The two rows above are the only others that take such a pass, and neither can say what it is
 * worth: each also swaps the events pack, so a merge and a strategy move together in every term
 * taken against `exodra·direct`. Here the pack is the SHIPPED DIRECT constant on both sides, the
 * wire is `eventWireOf` on both, the bytes are the shared reference on both and the handlers are
 * live on both.
 *
 * THE PLUGIN REPLACES A NAME AND DEFERS TO IT, which is one act in `composeExoPlugins` and the reason
 * it is not `Object.assign`: the factory receives what stood under the name and returns a function
 * that calls it and hands back what it returned. `fillDoors` is the name because NO BUILD CALLS IT —
 * `@exodra/core` and `@exodra/dom` name it nowhere outside the vocabulary that declares it, so the
 * wrapper is installed and never entered and this rung prices the MERGE rather than a wrapper's own
 * call. Wrapping `attr`, `text` or `on` would have priced the wrapper instead, six to fifteen times
 * per build.
 *
 * WHAT ELSE IS IN THE TERM, SAID HERE RATHER THAN LEFT TO BE DISCOVERED: a composed backend is a
 * backend OBJECT, a second object is a second schema-cache key, and a second schema is a second
 * prototype to clone, a second set of setter closures and a later address in the heap. That price is
 * this table's `|exodra·noports − exodra·twin|` null, printed by name in the resolution block, and
 * it stands inside this term exactly as it stands inside the two rows above.
 *
 * AND THE HAZARD IT BRINGS, WHICH IS THE ONE THE `on`-COPY RUNG BELOW REFUSED TO BRING: a backend
 * of its own builds a record CONSTRUCTOR of its own, so this is the FOURTH record shape the shipped
 * `attr` sees. The copy rung could be written without one and was; this one cannot, because a
 * composed backend is the thing it prices — there is no door into a schema for a pack except the
 * backend `exoDomSchemaOf` is handed.
 */
const EVENT_MERGED_BACKEND = composeExoPlugins(new ExoDomBackend(), {
    fillDoors: (next: () => TExoFillDoors) =>
        function (this: TExoDomNode): TExoFillDoors {
            return next.call(this);
        },
});
const EVENT_MERGED_CARD_SCHEMA = createExoSchema(eventShape);
const mEVENT_MERGED_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_MERGED_CARD_SCHEMA);
mEVENT_MERGED_CARD.createInitialState(eventWireOf(EVENT_MERGED_CARD_SCHEMA.ports));
const EVENT_MERGED_CARD = mEVENT_MERGED_CARD.done();
const EVENT_MERGED_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_MERGED_CARD, EVENT_MERGED_BACKEND);

function eventMergedBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_MERGED_PLAN.acquireNode(EVENT_MERGED_PLAN);
    const record = EVENT_MERGED_PLAN.createInstance(EVENT_MERGED_PLAN);
    createExoNode(EVENT_MERGED_PLAN, root, EVENT_MERGED_CARD, 0, null, record, null);
    return root;
}

// =========================================================================================
// RUNGS 6-7 — INSIDE `exodra·nowrite − exodra·noports`, WHICH IS ONE LUMP WITH THREE OCCUPANTS AND
// NO WAY TO TELL FROM TWO ROWS WHICH OF THEM IT IS.
//
// That difference is everything six event ports cost BEFORE any `attach` runs, and it is at least:
// six more landings STORED in the walk, six wider schema tables, and six times over [two port-table
// loads — `schema.elem` and `schema.writeData` — an element load out of `this.nodes`, two field loads
// to reach `schema.events.attach`, and the call]. Two rungs, each removing one term, both inside
// this table's rotation.
//
// WHY THE COPY IS CALLED AS A PLAIN FUNCTION AND NOT MERGED OVER `on` WITH `composeExoPlugins`: a
// merged method needs a backend of its own, a backend of its own builds a record CONSTRUCTOR of
// its own (`createExoDomInstanceFactory`), and one more record shape per rung would take the shipped
// `attr` — which every exodra row in this file calls fifteen times per build — past the three maps
// it sees now and out of V8's polymorphic inline cache. The rung would have moved every other
// exodra row in the axis, in every table. So the copy runs on `EVENT_NOWRITE_BACKEND` and shares
// `exodra·nowrite`'s record shape and its no-write `attach` exactly; what it does not share is the
// SHIPPED `on`, and that is the one rung boundary.
//
// THE COPY IS A COPY AND THAT IS THE HAZARD `exodra·clone+walk` names about its own replica: if
// `on` changes in `packages/dom/src/dom/EXO_DOM_NODE_VOCABULARY.ts` and this does not, the rung stops
// describing the renderer. It tracked one such change already: `on` asserted the port's kind
// through `assertExoEventPort`, the function is gone from `@exodra/core`, and the call went out of
// the copy with it.
// =========================================================================================

function eventOnCopy(
    c: TExoDomInstanceRecord,
    port: TExoPort,
    handler: TExoEventHandler<Event, Element>,
    subject?: unknown
): void {
    const index = port.index;
    const schema = c.schema;
    schema.events.attach(
        c.nodes[schema.elem[index]] as Element,
        schema.writeData[index] as TExoEventPortData,
        handler,
        subject
    );
}

// THE WIRE IS WRITTEN OUT AND NOT BUILT FROM A FACTORY OVER A PASSED-IN `on`: a factory
// would put the rung and the shipped row through ONE call site, which is the site whose shape
// half of this ladder is about.

const eventOnCopyWireOf =
    (P: TEventPorts): TExoMachineInitialState<TExoDomNode> =>
    (c, i) => {
        const d = BUILDING[i];
        c.attr(P.id, d.id);
        c.text(P.title, d.title);
        c.text(P.subtitle, d.subtitle);
        c.attr(P.state, d.state);
        c.text(P.lede, d.lede);
        c.text(P.author, d.author);
        c.attr(P.when, d.when);
        c.text(P.whenText, d.whenText);
        c.text(P.v0, d.v0);
        c.text(P.v1, d.v1);
        c.text(P.v2, d.v2);
        c.text(P.v3, d.v3);
        c.text(P.v4, d.v4);
        c.text(P.v5, d.v5);
        c.text(P.count, d.count);
        eventOnCopy(c, P.c0, exoRowHandler, EVENT_ROW_SUBJECTS[0]);
        eventOnCopy(c, P.c1, exoRowHandler, EVENT_ROW_SUBJECTS[1]);
        eventOnCopy(c, P.c2, exoRowHandler, EVENT_ROW_SUBJECTS[2]);
        eventOnCopy(c, P.c3, exoRowHandler, EVENT_ROW_SUBJECTS[3]);
        eventOnCopy(c, P.c4, exoRowHandler, EVENT_ROW_SUBJECTS[4]);
        eventOnCopy(c, P.c5, exoRowHandler, EVENT_ROW_SUBJECTS[5]);
    };

/** The EVENT schema with the CARD's fifteen fills and no `c.on` anywhere — `exoWireOf` itself, so
 *  the fills cannot drift from `exodra·noports`'s, which is the row this one is subtracted from. */
const eventPortsWireOf = (P: TEventPorts): TExoMachineInitialState<TExoDomNode> => exoWireOf(P);

const EVENT_ONCOPY_CARD_SCHEMA = createExoSchema(eventShape);
const mEVENT_ONCOPY_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_ONCOPY_CARD_SCHEMA);
mEVENT_ONCOPY_CARD.createInitialState(eventOnCopyWireOf(EVENT_ONCOPY_CARD_SCHEMA.ports));
const EVENT_ONCOPY_CARD = mEVENT_ONCOPY_CARD.done();
const EVENT_ONCOPY_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_ONCOPY_CARD, EVENT_NOWRITE_BACKEND);
/** On `EXO_BACKEND` and not on the no-write one: the row it is subtracted from is
 *  `exodra·noports`, so the backend — and with it the record shape and the writers — must be that
 *  row's, leaving the SCHEMA as the only difference. */
const EVENT_PORTS_CARD_SCHEMA = createExoSchema(eventShape);
const mEVENT_PORTS_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_PORTS_CARD_SCHEMA);
mEVENT_PORTS_CARD.createInitialState(eventPortsWireOf(EVENT_PORTS_CARD_SCHEMA.ports));
const EVENT_PORTS_CARD = mEVENT_PORTS_CARD.done();
const EVENT_PORTS_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_PORTS_CARD, EXO_BACKEND);

function eventOnCopyBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_ONCOPY_PLAN.acquireNode(EVENT_ONCOPY_PLAN);
    const record = EVENT_ONCOPY_PLAN.createInstance(EVENT_ONCOPY_PLAN);
    createExoNode(EVENT_ONCOPY_PLAN, root, EVENT_ONCOPY_CARD, 0, null, record, null);
    return root;
}

function eventPortsBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_PORTS_PLAN.acquireNode(EVENT_PORTS_PLAN);
    const record = EVENT_PORTS_PLAN.createInstance(EVENT_PORTS_PLAN);
    createExoNode(EVENT_PORTS_PLAN, root, EVENT_PORTS_CARD, 0, null, record, null);
    return root;
}

// =========================================================================================
// RUNGS 8-11 — WHAT A PORT NOBODY FILLS COSTS, AND THE TWO THINGS IT WAS SAID TO BE ARE NOT
// BOTH AVAILABLE IN THIS MARKUP.
//
// `exodra·ports − exodra·noports` is six DECLARED event ports with no `c.on` anywhere, and the
// reading this file carried for it was "six more landings the walk has to store". READ OFF THE
// COMPILER IT IS NOT: `ExoDomEmitter.slotOf` gives an element a slot the first time anything asks
// for one, and the walk to `<span class="mc-v">`'s text port already goes through the
// `<li class="mc-row">` the click port sits on, and through the `<span class="mc-k">` beside it. A
// port on that `<li>` asks for a slot that is already there. `gateSchemaShape` below prints
// `schema.slots` for every rung, so it is the compiled schema saying so and not an argument.
//
// THE SAME READING SAYS WHY A SIX-LANDING RUNG CANNOT BE WRITTEN HERE AT ALL: of the thirty-two
// elements, THIRTY-ONE are on the walk's way to some port, and `<span class="mc-tail">` is the one
// that is not. One element, so one landing, and the rung that adds it is a BOUND rather than a
// sixth of a term.
//
// WHICH LEAVES TWO OCCUPANTS FOR THE LUMP, AND THEY SCALE DIFFERENTLY:
//   · PER PORT — `setters`, `writeData` and `elem` each carry one more entry, which for an event
//     port is the shared refusal and one minted datum, and the declaration one more port object.
//     Linear in the count.
//   · PER ROW, and not the ports at all — a second schema object, a second prototype to clone, a
//     second set of setter closures, a different age in the heap. Flat, and paid by any row that
//     is not `exodra·noports` itself.
//
//   exodra·twin        the CARD markup again in a declaration and a schema of its own, NO event ports,
//                      the card's own wire. Its true difference from `exodra·noports` is ZERO: it
//                      is this table's null for the ports term, and whatever it reads is the flat
//                      occupant, measured rather than assumed away.
//   exodra·ports12     twelve event ports, two per row, and nobody fills them.
//   exodra·ports24     twenty-four, four per row. With six and twelve beside it the term is linear
//                      in the port count or it is not, and one pair of rows cannot say which.
//   exodra·ports@tail  the six moved onto `<span class="mc-tail">`, so this schema has ONE landing
//                      the others do not and the pair prices a landing alone.
// =========================================================================================

/** The card markup with event ports FANNED IN — `perRow` on every `<li class="mc-row">`, `onTail`
 *  on the one element nothing else addresses. An event port writes NO character to the prototype,
 *  so every schema built through here clones the subject's reference bytes, and none of these ports
 *  is returned to the wire — the wire is `exoWireOf`, which fills the card's fifteen and knows no
 *  others. A factory and not four transcriptions: this function runs at COMPILE and never inside a
 *  timed region, so it moves no call site the table is about. */
const exoPortFanShape =
    (perRow: readonly string[], onTail: readonly string[]) =>
    (b: TExoSchemaCursor): TCardPorts => {
        let id!: TExoAttrPort;
        let title!: TExoTextPort;
        let subtitle!: TExoTextPort;
        let state!: TExoAttrPort;
        let lede!: TExoTextPort;
        let author!: TExoTextPort;
        let when!: TExoAttrPort;
        let whenText!: TExoTextPort;
        let count!: TExoTextPort;
        const vs: TExoTextPort[] = [];
        b.el('div', { class: `mc ${EXO_TOKEN}` }, (card) => {
            id = card.port('data-id');
            card.el('div', { class: 'mc-head' }, (head) => {
                head.el('h2', { class: 'mc-title' }, (n) => {
                    title = n.textPort();
                });
                head.el('span', { class: 'mc-sub' }, (n) => {
                    subtitle = n.textPort();
                });
                head.el('span', { class: 'mc-badge' }, (n) => {
                    state = n.port('data-state');
                    n.text('new');
                });
            });
            card.el('div', { class: 'mc-body' }, (body) => {
                body.el('p', { class: 'mc-lede' }, (n) => {
                    lede = n.textPort();
                });
                body.el('div', { class: 'mc-meta' }, (meta) => {
                    meta.el('span', { class: 'mc-author' }, (n) => {
                        author = n.textPort();
                    });
                    meta.el('time', { class: 'mc-when' }, (n) => {
                        when = n.port('datetime');
                        whenText = n.textPort();
                    });
                });
            });
            card.el('ul', { class: 'mc-rows' }, (list) => {
                for (let r = 0; r < ROWS; r++) {
                    list.el('li', { class: 'mc-row' }, (row) => {
                        // Placed where `eventShape` places its click port — first inside the row, so
                        // the order the slots are asked for is that schema's and not a third one.
                        for (let e = 0; e < perRow.length; e++) row.eventPort(perRow[e]);
                        row.el('span', { class: 'mc-k' }, (n) => {
                            n.text('field');
                        });
                        row.el('span', { class: 'mc-v' }, (n) => {
                            vs.push(n.textPort());
                        });
                    });
                }
            });
            card.el('div', { class: 'mc-foot' }, (foot) => {
                foot.el('span', { class: 'mc-count' }, (n) => {
                    count = n.textPort();
                });
                foot.el('span', { class: 'mc-tail' }, (n) => {
                    for (let e = 0; e < onTail.length; e++) n.eventPort(onTail[e]);
                    n.text('tail');
                });
            });
        });
        return {
            id,
            title,
            subtitle,
            state,
            lede,
            author,
            when,
            whenText,
            v0: vs[0],
            v1: vs[1],
            v2: vs[2],
            v3: vs[3],
            v4: vs[4],
            v5: vs[5],
            count,
        };
    };

const NO_EVENT_PORTS: readonly string[] = [];
/** `'click'` six times over, and the repeat is the point: the rung it is subtracted from declares
 *  six click ports, so the count and the NAME both have to match or the compiler is minting
 *  different port data — other key strings, another listener — and the pair prices that instead of
 *  the landing. */
const TAIL_EVENT_PORTS: readonly string[] = new Array<string>(ROWS).fill(EXO_SLOT_EVENT);
/** DISTINCT names here where the tail rung repeats one, and the two rungs want opposite things: the
 *  tail rung must declare the SAME six ports as the row it is subtracted from, so only the element
 *  moves; these two must declare MORE ports on the same elements, and a second `'click'` on an
 *  element already carrying one is a shape nobody ships. */
const TWO_EVENT_PORTS: readonly string[] = ['click', 'pointerdown'];
const FOUR_EVENT_PORTS: readonly string[] = ['click', 'pointerdown', 'mouseover', 'focusin'];

const EXO_TWIN_CARD_SCHEMA = createExoSchema(exoPortFanShape(NO_EVENT_PORTS, NO_EVENT_PORTS));
const mEXO_TWIN_CARD = createExoMachineBuilder<TExoDomNode>(EXO_TWIN_CARD_SCHEMA);
mEXO_TWIN_CARD.createInitialState(exoWireOf(EXO_TWIN_CARD_SCHEMA.ports));
const EXO_TWIN_CARD = mEXO_TWIN_CARD.done();
const EXO_TWIN_PLAN: TExoDomSchema = exoDomSchemaOf(EXO_TWIN_CARD, EXO_BACKEND);
const EVENT_PORTS12_CARD_SCHEMA = createExoSchema(exoPortFanShape(TWO_EVENT_PORTS, NO_EVENT_PORTS));
const mEVENT_PORTS12_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_PORTS12_CARD_SCHEMA);
mEVENT_PORTS12_CARD.createInitialState(exoWireOf(EVENT_PORTS12_CARD_SCHEMA.ports));
const EVENT_PORTS12_CARD = mEVENT_PORTS12_CARD.done();
const EVENT_PORTS12_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_PORTS12_CARD, EXO_BACKEND);
const EVENT_PORTS24_CARD_SCHEMA = createExoSchema(
    exoPortFanShape(FOUR_EVENT_PORTS, NO_EVENT_PORTS)
);
const mEVENT_PORTS24_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_PORTS24_CARD_SCHEMA);
mEVENT_PORTS24_CARD.createInitialState(exoWireOf(EVENT_PORTS24_CARD_SCHEMA.ports));
const EVENT_PORTS24_CARD = mEVENT_PORTS24_CARD.done();
const EVENT_PORTS24_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_PORTS24_CARD, EXO_BACKEND);
const EVENT_PORTS_TAIL_CARD_SCHEMA = createExoSchema(
    exoPortFanShape(NO_EVENT_PORTS, TAIL_EVENT_PORTS)
);
const mEVENT_PORTS_TAIL_CARD = createExoMachineBuilder<TExoDomNode>(EVENT_PORTS_TAIL_CARD_SCHEMA);
mEVENT_PORTS_TAIL_CARD.createInitialState(exoWireOf(EVENT_PORTS_TAIL_CARD_SCHEMA.ports));
const EVENT_PORTS_TAIL_CARD = mEVENT_PORTS_TAIL_CARD.done();
const EVENT_PORTS_TAIL_PLAN: TExoDomSchema = exoDomSchemaOf(EVENT_PORTS_TAIL_CARD, EXO_BACKEND);

function exodraTwinBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EXO_TWIN_PLAN.acquireNode(EXO_TWIN_PLAN);
    const record = EXO_TWIN_PLAN.createInstance(EXO_TWIN_PLAN);
    createExoNode(EXO_TWIN_PLAN, root, EXO_TWIN_CARD, 0, null, record, null);
    return root;
}

function eventPorts12Build(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_PORTS12_PLAN.acquireNode(EVENT_PORTS12_PLAN);
    const record = EVENT_PORTS12_PLAN.createInstance(EVENT_PORTS12_PLAN);
    createExoNode(EVENT_PORTS12_PLAN, root, EVENT_PORTS12_CARD, 0, null, record, null);
    return root;
}

function eventPorts24Build(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_PORTS24_PLAN.acquireNode(EVENT_PORTS24_PLAN);
    const record = EVENT_PORTS24_PLAN.createInstance(EVENT_PORTS24_PLAN);
    createExoNode(EVENT_PORTS24_PLAN, root, EVENT_PORTS24_CARD, 0, null, record, null);
    return root;
}

function eventPortsTailBuild(d: TCardData): Element {
    BUILDING[0] = d;
    const root = EVENT_PORTS_TAIL_PLAN.acquireNode(EVENT_PORTS_TAIL_PLAN);
    const record = EVENT_PORTS_TAIL_PLAN.createInstance(EVENT_PORTS_TAIL_PLAN);
    createExoNode(EVENT_PORTS_TAIL_PLAN, root, EVENT_PORTS_TAIL_CARD, 0, null, record, null);
    return root;
}

// =========================================================================================
// THE OTHER HALF OF THE GUARD'S TRADE — RE-POINTING SIX HANDLERS ON A NODE THAT ALREADY HAS THEM,
// WHICH IS NOT A BUILD AND HAS NO BUSINESS IN A BUILD TABLE.
//
// On a FRESH clone the guard's read misses and the registration happens; on a RE-FILL the read HITS
// and the registration is skipped. Those are opposite costs on opposite occasions, so pricing them
// in one table would average a trade into a number nobody can act on. Here the six elements already
// carry both slots and the listener, and the timed region writes a SECOND handler and subject into
// them:
//
//   floor          two stores per row and nothing else — the smallest program that re-points six
//                  handlers, because a hand-written program KNOWS its listener is already on.
//   floor·served   the shipped shape on an already-served element: the present-property read, and
//                  the registration skipped because of it.
//   floor·listen   the guard removed and `addEventListener` made unconditional — a call the
//                  specification requires to do nothing, since type, callback object and capture
//                  flag all repeat.
//
// THE TRADE IS `floor·served − floor` AGAINST `floor·listen − floor`, one table, one rotation.
// =========================================================================================

/** The SECOND subject set — the same six row numbers as different objects, so a gate can tell "the
 *  re-fill replaced what was there" from "what was there is still standing". */
const EVENT_ROW_SUBJECTS_B: readonly TEventRowSubject[] = [0, 1, 2, 3, 4, 5].map((row) => ({
    row,
}));

function eventRefillSlots(refs: TEventRefs, subjects: readonly TEventRowSubject[]): void {
    const c0 = refs.r0 as unknown as Record<PropertyKey, unknown>;
    c0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c0[EXO_SLOT_SUBJECT_KEY] = subjects[0];
    const c1 = refs.r1 as unknown as Record<PropertyKey, unknown>;
    c1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c1[EXO_SLOT_SUBJECT_KEY] = subjects[1];
    const c2 = refs.r2 as unknown as Record<PropertyKey, unknown>;
    c2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c2[EXO_SLOT_SUBJECT_KEY] = subjects[2];
    const c3 = refs.r3 as unknown as Record<PropertyKey, unknown>;
    c3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c3[EXO_SLOT_SUBJECT_KEY] = subjects[3];
    const c4 = refs.r4 as unknown as Record<PropertyKey, unknown>;
    c4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c4[EXO_SLOT_SUBJECT_KEY] = subjects[4];
    const c5 = refs.r5 as unknown as Record<PropertyKey, unknown>;
    c5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c5[EXO_SLOT_SUBJECT_KEY] = subjects[5];
}

/** The twin of `eventRefillSlots`, whose true difference from it is ZERO — this table's own null,
 *  because a difference read against another table's resolution is read against nothing. */
function eventRefillTwin(refs: TEventRefs, subjects: readonly TEventRowSubject[]): void {
    const q0 = refs.r0 as unknown as Record<PropertyKey, unknown>;
    q0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    q0[EXO_SLOT_SUBJECT_KEY] = subjects[0];
    const q1 = refs.r1 as unknown as Record<PropertyKey, unknown>;
    q1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    q1[EXO_SLOT_SUBJECT_KEY] = subjects[1];
    const q2 = refs.r2 as unknown as Record<PropertyKey, unknown>;
    q2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    q2[EXO_SLOT_SUBJECT_KEY] = subjects[2];
    const q3 = refs.r3 as unknown as Record<PropertyKey, unknown>;
    q3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    q3[EXO_SLOT_SUBJECT_KEY] = subjects[3];
    const q4 = refs.r4 as unknown as Record<PropertyKey, unknown>;
    q4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    q4[EXO_SLOT_SUBJECT_KEY] = subjects[4];
    const q5 = refs.r5 as unknown as Record<PropertyKey, unknown>;
    q5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    q5[EXO_SLOT_SUBJECT_KEY] = subjects[5];
}

function eventRefillServed(refs: TEventRefs, subjects: readonly TEventRowSubject[]): void {
    const c0 = refs.r0 as unknown as Record<PropertyKey, unknown>;
    const served0 = c0[EXO_SLOT_HANDLER_KEY] !== undefined;
    c0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c0[EXO_SLOT_SUBJECT_KEY] = subjects[0];
    if (!served0) refs.r0.addEventListener('click', slotShapedListener);
    const c1 = refs.r1 as unknown as Record<PropertyKey, unknown>;
    const served1 = c1[EXO_SLOT_HANDLER_KEY] !== undefined;
    c1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c1[EXO_SLOT_SUBJECT_KEY] = subjects[1];
    if (!served1) refs.r1.addEventListener('click', slotShapedListener);
    const c2 = refs.r2 as unknown as Record<PropertyKey, unknown>;
    const served2 = c2[EXO_SLOT_HANDLER_KEY] !== undefined;
    c2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c2[EXO_SLOT_SUBJECT_KEY] = subjects[2];
    if (!served2) refs.r2.addEventListener('click', slotShapedListener);
    const c3 = refs.r3 as unknown as Record<PropertyKey, unknown>;
    const served3 = c3[EXO_SLOT_HANDLER_KEY] !== undefined;
    c3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c3[EXO_SLOT_SUBJECT_KEY] = subjects[3];
    if (!served3) refs.r3.addEventListener('click', slotShapedListener);
    const c4 = refs.r4 as unknown as Record<PropertyKey, unknown>;
    const served4 = c4[EXO_SLOT_HANDLER_KEY] !== undefined;
    c4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c4[EXO_SLOT_SUBJECT_KEY] = subjects[4];
    if (!served4) refs.r4.addEventListener('click', slotShapedListener);
    const c5 = refs.r5 as unknown as Record<PropertyKey, unknown>;
    const served5 = c5[EXO_SLOT_HANDLER_KEY] !== undefined;
    c5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c5[EXO_SLOT_SUBJECT_KEY] = subjects[5];
    if (!served5) refs.r5.addEventListener('click', slotShapedListener);
}

function eventRefillListen(refs: TEventRefs, subjects: readonly TEventRowSubject[]): void {
    const c0 = refs.r0 as unknown as Record<PropertyKey, unknown>;
    c0[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c0[EXO_SLOT_SUBJECT_KEY] = subjects[0];
    refs.r0.addEventListener('click', slotShapedListener);
    const c1 = refs.r1 as unknown as Record<PropertyKey, unknown>;
    c1[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c1[EXO_SLOT_SUBJECT_KEY] = subjects[1];
    refs.r1.addEventListener('click', slotShapedListener);
    const c2 = refs.r2 as unknown as Record<PropertyKey, unknown>;
    c2[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c2[EXO_SLOT_SUBJECT_KEY] = subjects[2];
    refs.r2.addEventListener('click', slotShapedListener);
    const c3 = refs.r3 as unknown as Record<PropertyKey, unknown>;
    c3[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c3[EXO_SLOT_SUBJECT_KEY] = subjects[3];
    refs.r3.addEventListener('click', slotShapedListener);
    const c4 = refs.r4 as unknown as Record<PropertyKey, unknown>;
    c4[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c4[EXO_SLOT_SUBJECT_KEY] = subjects[4];
    refs.r4.addEventListener('click', slotShapedListener);
    const c5 = refs.r5 as unknown as Record<PropertyKey, unknown>;
    c5[EXO_SLOT_HANDLER_KEY] = exoRowHandler;
    c5[EXO_SLOT_SUBJECT_KEY] = subjects[5];
    refs.r5.addEventListener('click', slotShapedListener);
}

// =========================================================================================
// THE SERVER HALF. The same tree, the same fifteen values, no document anywhere.
// =========================================================================================

/**
 * SOLID'S SERVER FUNCTIONS, TYPED OFF THEIR OWN BODIES.
 *
 *   `ssr(t, ...nodes)`            server.js:447 — joins the pieces and returns `{ t }`
 *   `escape(s, attr)`             server.js:544 — `<`/`&`, or `"`/`&` when `attr`
 *   `ssrAttribute(k, v, isBool)`  server.js:537 — ` k="v"`, or `''` when `v` is nullish
 *   `renderToString(code)`        server.js:168 — the request wrapper around one of those
 *
 * The import they come through carries no declaration, so these four aliases are where the shapes
 * are stated and the only place the untyped values are read. `gateSolidIsTheServerBuild` below
 * checks all four against known answers before anything is timed, which is what stops the empty
 * DOM-build stubs from reaching a table as zeroes.
 */
type TSolidSsr = (template: string[], ...nodes: string[]) => { t: string };
type TSolidEscape = (value: string, attr?: boolean) => string;
type TSolidAttribute = (key: string, value: string, isBoolean: boolean) => string;
type TSolidRenderToString = (code: () => { t: string }) => string;

const solidSsr: TSolidSsr = ssr;
const solidEscape: TSolidEscape = escape;
const solidAttribute: TSolidAttribute = ssrAttribute;
const solidRenderToString: TSolidRenderToString = renderToString;

// ---------------------------------------------------------------------------------------
// SPELLING 5 — THE STATIC MARKUP AS PIECES. The repeated region is written once and reached by
// pointer from every server spelling, so no participant pays a concatenation another does not.
// ---------------------------------------------------------------------------------------

const MC_ROW_OPEN = '<li class="mc-row"><span class="mc-k">field</span><span class="mc-v">';
const MC_ROWS_HEAD = '</time></div></div><ul class="mc-rows">' + MC_ROW_OPEN;
const MC_ROW_JOIN = '</span></li>' + MC_ROW_OPEN;
const MC_ROWS_TAIL = '</span></li></ul><div class="mc-foot"><span class="mc-count">';
const MC_FOOT = '</span><span class="mc-tail">tail</span></div></div>';

/**
 * THE NATIVE FLOOR'S PREPARED FORM, AND IT IS THE WHOLE OF ONE. A hand-written server renderer has
 * nothing to parse and nothing to walk: its template IS this list of characters, so producing it
 * costs one array and one concatenation for the variant token.
 *
 * ITS ATTRIBUTE HEADS ARE BAKED INTO THE PIECES — ` data-id="` stands at the end of piece 0 — where
 * `@exodra/string`'s writer and solid's `ssrAttribute` both return the WHOLE attribute out of the
 * hole. That is not a spelling difference: a baked head prints unconditionally, so this form CANNOT
 * remove an attribute whose value is absent, and the two that carry the head can. `ssr-floor`
 * prices that move as its `+head` rung. The floor is cheaper here because it can do less.
 */
function strFloorPieces(token: string): string[] {
    return [
        '<div class="mc ' + token + '" data-id="',
        '"><div class="mc-head"><h2 class="mc-title">',
        '</h2><span class="mc-sub">',
        '</span><span class="mc-badge" data-state="',
        '">new</span></div><div class="mc-body"><p class="mc-lede">',
        '</p><div class="mc-meta"><span class="mc-author">',
        '</span><time class="mc-when" datetime="',
        '">',
        MC_ROWS_HEAD,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROWS_TAIL,
        MC_FOOT,
    ];
}

// ── THE TWIN'S PREPARED FORM, declared again over its own constants ──────────────────────────

const CARD_ITEM_OPEN = '<li class="mc-row"><span class="mc-k">field</span><span class="mc-v">';
const CARD_ITEMS_HEAD = '</time></div></div><ul class="mc-rows">' + CARD_ITEM_OPEN;
const CARD_ITEM_JOIN = '</span></li>' + CARD_ITEM_OPEN;
const CARD_ITEMS_TAIL = '</span></li></ul><div class="mc-foot"><span class="mc-count">';
const CARD_BOTTOM = '</span><span class="mc-tail">tail</span></div></div>';

function strTwinPieces(token: string): string[] {
    return [
        '<div class="mc ' + token + '" data-id="',
        '"><div class="mc-head"><h2 class="mc-title">',
        '</h2><span class="mc-sub">',
        '</span><span class="mc-badge" data-state="',
        '">new</span></div><div class="mc-body"><p class="mc-lede">',
        '</p><div class="mc-meta"><span class="mc-author">',
        '</span><time class="mc-when" datetime="',
        '">',
        CARD_ITEMS_HEAD,
        CARD_ITEM_JOIN,
        CARD_ITEM_JOIN,
        CARD_ITEM_JOIN,
        CARD_ITEM_JOIN,
        CARD_ITEM_JOIN,
        CARD_ITEMS_TAIL,
        CARD_BOTTOM,
    ];
}

// ---------------------------------------------------------------------------------------
// SPELLING 6 — THE NATIVE FLOOR'S ASSEMBLY. Straight-line concatenation, no array, no index, no
// writer table, and THE SHIPPED ESCAPERS on all fifteen values: `escapeExoAttributeValue` on the
// three attributes and `escapeExoText` on the twelve texts, which is exactly what the backend's
// writers call. A program that left them out would not be a cheaper renderer, it would be an
// injection.
//
// THE TOKEN IS A LITERAL — `v0000` — because a hand-written program bakes its class. It is
// `TOKENS[0]`, and the byte gate is what says so: the reference this is compared against is built
// from `PLAIN[0]`, so a change to the token scheme fails the gate with the differing index.
// ---------------------------------------------------------------------------------------

function strFloorAssemble(d: TCardData): string {
    return (
        '<div class="mc v0000" data-id="' +
        escapeExoAttributeValue(d.id) +
        '"><div class="mc-head"><h2 class="mc-title">' +
        escapeExoText(d.title) +
        '</h2><span class="mc-sub">' +
        escapeExoText(d.subtitle) +
        '</span><span class="mc-badge" data-state="' +
        escapeExoAttributeValue(d.state) +
        '">new</span></div><div class="mc-body"><p class="mc-lede">' +
        escapeExoText(d.lede) +
        '</p><div class="mc-meta"><span class="mc-author">' +
        escapeExoText(d.author) +
        '</span><time class="mc-when" datetime="' +
        escapeExoAttributeValue(d.when) +
        '">' +
        escapeExoText(d.whenText) +
        '</time></div></div><ul class="mc-rows"><li class="mc-row">' +
        '<span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v0) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v1) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v2) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v3) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v4) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v5) +
        '</span></li></ul><div class="mc-foot"><span class="mc-count">' +
        escapeExoText(d.count) +
        '</span><span class="mc-tail">tail</span></div></div>'
    );
}

/**
 * THE ASSEMBLY NULL, AND IT IS A WEAKER NULL THAN THE DOM PAIR'S — say it before reading it. A
 * straight-line concatenation has no locals to name differently, so this is the same expression
 * compiled a second time into a second function object with its own inline caches. It bounds what
 * this run could tell apart between two identical programs; it does not bound what it could tell
 * apart between two different ones.
 */
function strTwinAssemble(d: TCardData): string {
    return (
        '<div class="mc v0000" data-id="' +
        escapeExoAttributeValue(d.id) +
        '"><div class="mc-head"><h2 class="mc-title">' +
        escapeExoText(d.title) +
        '</h2><span class="mc-sub">' +
        escapeExoText(d.subtitle) +
        '</span><span class="mc-badge" data-state="' +
        escapeExoAttributeValue(d.state) +
        '">new</span></div><div class="mc-body"><p class="mc-lede">' +
        escapeExoText(d.lede) +
        '</p><div class="mc-meta"><span class="mc-author">' +
        escapeExoText(d.author) +
        '</span><time class="mc-when" datetime="' +
        escapeExoAttributeValue(d.when) +
        '">' +
        escapeExoText(d.whenText) +
        '</time></div></div><ul class="mc-rows"><li class="mc-row">' +
        '<span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v0) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v1) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v2) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v3) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v4) +
        '</span></li><li class="mc-row"><span class="mc-k">field</span><span class="mc-v">' +
        escapeExoText(d.v5) +
        '</span></li></ul><div class="mc-foot"><span class="mc-count">' +
        escapeExoText(d.count) +
        '</span><span class="mc-tail">tail</span></div></div>'
    );
}

/**
 * The floor's pieces filled, used ONLY by the gate below and never inside a region. It is what
 * proves `strFloorPieces` is the prepared form of `strFloorAssemble` and not some other list of
 * characters that happens to be sixteen entries long.
 */
function joinStrPieces(pieces: readonly string[], d: TCardData): string {
    const values: readonly string[] = [
        escapeExoAttributeValue(d.id),
        escapeExoText(d.title),
        escapeExoText(d.subtitle),
        escapeExoAttributeValue(d.state),
        escapeExoText(d.lede),
        escapeExoText(d.author),
        escapeExoAttributeValue(d.when),
        escapeExoText(d.whenText),
        escapeExoText(d.v0),
        escapeExoText(d.v1),
        escapeExoText(d.v2),
        escapeExoText(d.v3),
        escapeExoText(d.v4),
        escapeExoText(d.v5),
        escapeExoText(d.count),
    ];
    let html = pieces[0];
    for (let i = 0; i < values.length; i++) {
        html += values[i];
        html += pieces[i + 1];
    }
    return html;
}

// ---------------------------------------------------------------------------------------
// SOLID. The pieces array is `babel-preset-solid`'s `_tmpl$` for this tree, hoisted to module
// scope exactly as the preset hoists it; the call below is the body it emits. A dynamic attribute
// leaves its element's piece ending after the STATIC attributes and supplies the whole ` k="v"`
// out of the hole, which is what puts `data-id` behind `class` and lets this pass the byte gate.
// ---------------------------------------------------------------------------------------

function solidPieces(token: string): string[] {
    return [
        '<div class="mc ' + token + '"',
        '><div class="mc-head"><h2 class="mc-title">',
        '</h2><span class="mc-sub">',
        '</span><span class="mc-badge"',
        '>new</span></div><div class="mc-body"><p class="mc-lede">',
        '</p><div class="mc-meta"><span class="mc-author">',
        '</span><time class="mc-when"',
        '>',
        MC_ROWS_HEAD,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROW_JOIN,
        MC_ROWS_TAIL,
        MC_FOOT,
    ];
}

const SOLID_PIECES: string[] = solidPieces(TOKENS[0]);

function solidNode(d: TCardData): { t: string } {
    return solidSsr(
        SOLID_PIECES,
        solidAttribute('data-id', solidEscape(d.id, true), false),
        solidEscape(d.title),
        solidEscape(d.subtitle),
        solidAttribute('data-state', solidEscape(d.state, true), false),
        solidEscape(d.lede),
        solidEscape(d.author),
        solidAttribute('datetime', solidEscape(d.when, true), false),
        solidEscape(d.whenText),
        solidEscape(d.v0),
        solidEscape(d.v1),
        solidEscape(d.v2),
        solidEscape(d.v3),
        solidEscape(d.v4),
        solidEscape(d.v5),
        solidEscape(d.count)
    );
}

/** The assembly alone — what `fillMarkup` and the floor are comparable to. */
function solidAssemble(d: TCardData): string {
    return solidNode(d).t;
}

/**
 * The entry point. `renderToString` takes a THUNK, and the thunk is declared once at module level
 * and fed through a module-level slot for the same reason `EXO_TOKEN` is: a closure built inside
 * the region would be an allocation no other row on this table pays.
 */
let SOLID_PROPS: TCardData = DATA;
const SOLID_CODE = (): { t: string } => solidNode(SOLID_PROPS);

function solidRenderToStringAssemble(d: TCardData): string {
    SOLID_PROPS = d;
    return solidRenderToString(SOLID_CODE);
}

// ---------------------------------------------------------------------------------------
// EXODRA, SERVER SIDE. One shape, a second wire — `c.attr` and `c.text` mean "write the port's
// slot through the port's writer" here, where on the DOM backend they mean an attribute node and a
// Text node's `.data`. The machine is a SECOND one, so its `forms` are this axis's alone
// and the DOM schema cache above is untouched.
// ---------------------------------------------------------------------------------------

const EXO_STR_BACKEND = new ExoStrBackend();

const exoStrWireOf =
    (P: TCardPorts): TExoMachineInitialState<TExoStrNode> =>
    (c, i) => {
        const d = BUILDING[i];
        c.attr(P.id, d.id);
        c.text(P.title, d.title);
        c.text(P.subtitle, d.subtitle);
        c.attr(P.state, d.state);
        c.text(P.lede, d.lede);
        c.text(P.author, d.author);
        c.attr(P.when, d.when);
        c.text(P.whenText, d.whenText);
        c.text(P.v0, d.v0);
        c.text(P.v1, d.v1);
        c.text(P.v2, d.v2);
        c.text(P.v3, d.v3);
        c.text(P.v4, d.v4);
        c.text(P.v5, d.v5);
        c.text(P.count, d.count);
    };

const EXO_STR_CARD_SCHEMA = createExoSchema(exoShape);
const mEXO_STR_CARD = createExoMachineBuilder<TExoStrNode>(EXO_STR_CARD_SCHEMA);
mEXO_STR_CARD.createInitialState(exoStrWireOf(EXO_STR_CARD_SCHEMA.ports));
const EXO_STR_CARD = mEXO_STR_CARD.done();
const EXO_STR_PLAN: TExoStrSchema = exoStrSchemaOf(EXO_STR_CARD, EXO_STR_BACKEND);

/** The pair the DOM compile row measures, with `exoDomSchemaOf` swapped for `exoStrSchemaOf`. */
function exodraStrCompile(token: string): TExoStrSchema {
    EXO_TOKEN = token;
    return exoStrSchemaOf(machineOf(createExoSchema(exoShape)), EXO_STR_BACKEND);
}

/** The shipped per-instance render: allocate, wire, fill, sweep. */
function exodraAssemble(d: TCardData): string {
    BUILDING[0] = d;
    return renderExoStrInstance(EXO_STR_PLAN, EXO_STR_CARD, 0, null);
}

// ---------------------------------------------------------------------------------------
// THE GATE. Nothing is timed until every participant has been shown to build the same bytes.
// ---------------------------------------------------------------------------------------

interface Built {
    readonly name: string;
    readonly markup: string;
}

function firstDifference(a: string, b: string): number {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
    return n;
}

function gateBytes(subject: string, built: readonly Built[]): void {
    const reference = built[0];
    let bad = false;
    for (let i = 1; i < built.length; i++) {
        const other = built[i];
        if (other.markup === reference.markup) continue;
        bad = true;
        const at = firstDifference(reference.markup, other.markup);
        refuse(
            `template-build ${subject}: "${other.name}" did not build the same node as ` +
                `"${reference.name}". ` +
                `${reference.name} is ${reference.markup.length} characters, ${other.name} is ` +
                `${other.markup.length}, and they first differ at index ${at}.`
        );
        refuse(
            `  ${reference.name.padEnd(12)} …${reference.markup.slice(
                Math.max(0, at - 20),
                at + 20
            )}…`
        );
        refuse(`  ${other.name.padEnd(12)} …${other.markup.slice(Math.max(0, at - 20), at + 20)}…`);
    }
    if (bad) {
        throw new Error(
            `template-build ${subject}: the participants did not build the same node, so no ` +
                'ranking below would be a ranking of anything. The commonest cause is ATTRIBUTE ' +
                'ORDER — every ' +
                "dynamic attribute in this subject stands behind its element's static ones and " +
                'each element carries at most one, which is what makes a held placeholder and a ' +
                'build-time `setAttribute` serialise identically. The second commonest is a ' +
                'stray node: stage0 turns a newline plus indentation into a comment node, so the ' +
                'markup above is written on one line.'
        );
    }
    line(
        `gate template-build ${subject}: all ${built.length} participants build a BYTE-IDENTICAL ` +
            `node — ${reference.markup.length} characters`
    );
}

/**
 * MIKADO'S EVENT ROW DIVERGES BY EXACTLY ITS REGISTRATION, AND THAT IS CHECKED RATHER THAN
 * TOLERATED. Its compiler puts a route attribute in `tpl.event` and its factory writes it onto the
 * factory node with `setAttribute` (`node_modules/mikado/src/factory.js:265`), so a mikado node
 * carrying six route attributes cannot enter the byte gate above — and a participant quietly
 * excused from that gate is a participant nobody is checking.
 *
 * So the divergence is SPELLED OUT: remove exactly `ROWS` occurrences of the route attribute and
 * the remainder must equal the shared reference character for character. What that proves is the
 * finding this axis wants — mikado builds everybody else's tree plus a registration it got for
 * free by cloning it.
 */
function gateMikadoRouteBytes(reference: string, markup: string): void {
    const stripped = markup.split(/ click="exotplr\d"/).join('');
    const removed = (markup.length - stripped.length) / ' click="exotplr0"'.length;
    if (stripped === reference && removed === ROWS) return;
    const at = firstDifference(reference, stripped);
    throw new Error(
        "template-build EVENTS: mikado's node is not the shared reference plus its route " +
            `attributes. ${removed} route attributes were removed where ${ROWS} were due, and ` +
            `what is left is ${stripped.length} characters against the reference's ` +
            `${reference.length}, first differing at index ${at}\n` +
            `  reference: …${reference.slice(Math.max(0, at - 20), at + 20)}…\n` +
            `  mikado   : …${stripped.slice(Math.max(0, at - 20), at + 20)}…`
    );
}

/**
 * THE GATE THE DELEGATED ROWS CANNOT BE PUBLISHED WITHOUT. A participant that "delegated" by
 * attaching nothing at all builds the same bytes as everybody else and is the fastest row in the
 * table, so bytes cannot be what admits it: only a dispatched click can. Six clicks, one per row,
 * and the six handlers must run IN ROW ORDER — which also catches the subtler failure, a shared
 * handler that runs six times carrying the same subject.
 */
function gateHandlersLive(name: string, click: () => void): void {
    EVENT_SEEN.length = 0;
    click();
    const seen = EVENT_SEEN.join(',');
    if (seen === '0,1,2,3,4,5') {
        line(
            `gate template-build EVENTS: "${name}" — six clicks reached six handlers in row ` +
                `order (${seen})`
        );
        return;
    }
    throw new Error(
        `template-build EVENTS: "${name}" was clicked once on each of its ${ROWS} rows and the ` +
            `handlers that ran were [${seen}] where [0,1,2,3,4,5] was due. A row whose handlers ` +
            'do not fire is a row doing less work than every other row in the table while ' +
            'building the same bytes, which is exactly the shape this gate exists to refuse. ' +
            'An empty list means nothing was attached, a short list means a handler was lost, ' +
            'and a list of six identical numbers means one subject is serving every row.'
    );
}

/**
 * THE GATE A RUNG THAT ATTACHES NOTHING CAN STILL BE HELD TO. `floor·slots` and `exodra·nowrite`
 * cannot be clicked into a handler, so a dispatch proves nothing about them — but what they claim
 * about the SLOTS is checkable either way, and it is the claim that matters twice over: a rung
 * whose stores V8 decided nobody reads would be pricing the optimiser, and this reads them back by
 * the same key strings the stores used.
 */
function gateSlotsWritten(name: string, node: Element): void {
    const rows = node.querySelectorAll('li.mc-row');
    for (let i = 0; i < rows.length; i++) {
        const carrier = rows[i] as unknown as Record<PropertyKey, unknown>;
        const subject = carrier[EXO_SLOT_SUBJECT_KEY] as TEventRowSubject | undefined;
        if (carrier[EXO_SLOT_HANDLER_KEY] === exoRowHandler && subject === EVENT_ROW_SUBJECTS[i]) {
            continue;
        }
        throw new Error(
            `template-build EVENTS: "${name}" claims to write the two event slots and row ${i} of ` +
                `its node does not carry them. "${String(EXO_SLOT_HANDLER_KEY)}" holds ` +
                `${String(carrier[EXO_SLOT_HANDLER_KEY])} and "${String(
                    EXO_SLOT_SUBJECT_KEY
                )}" holds ` +
                `${JSON.stringify(subject)} where row ${i}'s own subject was due.`
        );
    }
    line(
        `gate template-build EVENTS: "${name}" — all ${rows.length} rows carry the handler and ` +
            'their own subject under the shipped key strings, read back after the build'
    );
}

/** The inverse, for the rung whose whole claim is that its pack's `attach` writes NOTHING: a node
 *  of its carrying either slot would be a rung quietly doing the work it was built to leave out. */
function gateSlotsAbsent(name: string, node: Element): void {
    const rows = node.querySelectorAll('li.mc-row');
    for (let i = 0; i < rows.length; i++) {
        const carrier = rows[i] as unknown as Record<PropertyKey, unknown>;
        if (
            carrier[EXO_SLOT_HANDLER_KEY] === undefined &&
            carrier[EXO_SLOT_SUBJECT_KEY] === undefined
        ) {
            continue;
        }
        throw new Error(
            `template-build EVENTS: "${name}" is the rung whose events pack writes nothing, and ` +
                `row ${i} of its node carries a slot anyway. It is therefore not the baseline the ` +
                'ladder subtracts and no figure taken against it means what the table says.'
        );
    }
    line(
        `gate template-build EVENTS: "${name}" — none of the ${rows.length} rows carries either ` +
            'event slot, so what it prices is the dispatch to a port and not a store'
    );
}

/**
 * THE GATE `exodra·merged` CANNOT BE PUBLISHED WITHOUT, and no byte and no click can stand in for
 * it, because what that rung claims is a pair of NEGATIVES: that the merge HAPPENED, and that it
 * changed nothing a build can observe. A rung whose plugin was silently dropped — a misspelt name,
 * a factory handing back the function it was given — is `exodra·direct` on a second schema, and the
 * subtraction would print the second schema's price under the merge's name. A rung whose plugin
 * changed the EVENTS PACK is `exodra·delegated` under a third name.
 *
 * THE FOURTH CHECK IS THE FINDING AND NOT A PRECAUTION, AND IT REFUSES WHERE THE OTHER THREE
 * THROW. `composeExoPlugins` writes OWN PROPERTIES onto the object it is handed, and that object is
 * the PROTOTYPE of every record built against it — so whether a merge ADDS a name or REPLACES one
 * already there is the difference between a new map and a store into an existing field. Both
 * backends' own keys are read off and compared in order, and a disagreement makes the rung a
 * DIFFERENT reading rather than a wrong one: the term would then hold a transition as well as a
 * store, which is worth printing both ways and worth nobody's run.
 */
function gateMergeIsNull(): void {
    const plain = EXO_BACKEND as unknown as Record<PropertyKey, unknown>;
    const merged = EVENT_MERGED_BACKEND as unknown as Record<PropertyKey, unknown>;
    if (merged.fillDoors === plain.fillDoors) {
        throw new Error(
            'template-build EVENTS: "exodra·merged" carries the same `fillDoors` as the plain ' +
                'backend, so `composeExoPlugins` replaced nothing and the rung is `exodra·direct` ' +
                "on a second schema. Every figure taken against it would be the second schema's " +
                "price printed under composition's name."
        );
    }
    if (merged.events !== EXO_DIRECT_EVENTS) {
        throw new Error(
            'template-build EVENTS: "exodra·merged" is not carrying the SHIPPED DIRECT events ' +
                'pack, so it differs from "exodra·direct" in a STRATEGY as well as in a merge ' +
                'and the term is not composition alone.'
        );
    }
    const record = EVENT_MERGED_PLAN.createInstance(EVENT_MERGED_PLAN) as unknown as TExoDomNode;
    if (record.fillDoors() !== record) {
        throw new Error(
            'template-build EVENTS: "exodra·merged"\'s wrapped `fillDoors` does not hand back ' +
                'what the shipped one hands back. A plugin that fails to defer to `next` is not ' +
                'a no-op plugin, and what the rung prices is then its own body.'
        );
    }
    const plainKeys = Object.keys(plain);
    const mergedKeys = Object.keys(merged);
    line(
        'gate template-build EVENTS: "exodra·merged" — the plugin replaced `fillDoors` with a ' +
            'wrapper that defers to it and hands back the same value, and `events` is the shipped ' +
            'direct pack by identity, so the rung differs from "exodra·direct" in a merge and a ' +
            'schema and in nothing else'
    );
    if (plainKeys.join(',') === mergedKeys.join(',')) {
        line(
            `gate template-build EVENTS: "exodra·merged" — both backends carry the same ` +
                `${mergedKeys.length} own keys in the same order, so what the merge did to the ` +
                'object every record takes as its prototype was STORE INTO AN EXISTING FIELD and ' +
                'add no name'
        );
        return;
    }
    refuse(
        'template-build EVENTS: "exodra·merged" and the plain backend do NOT carry the same own ' +
            `keys — ${mergedKeys.join(',')} against ${plainKeys.join(',')}. The rung still holds ` +
            'a merge and no strategy, so its term stands, but read it as composition that ADDS A ' +
            'NAME to the prototype of every record: a map transition as well as a store, and the ' +
            'two are not the same price.'
    );
}

/**
 * WHAT SPLITS THE PORTS TERM, READ OFF THE COMPILED SCHEMAS RATHER THAN ARGUED FROM THE MARKUP.
 * A PORT costs a row in `setters`, `writeData` and `elem`, filled once at compile — for an event
 * port with the shared refusal and the pack's datum; a LANDING costs a triple in `schema.walk` and
 * a store into `nodes` on EVERY build, which is the only one of the two a build table can see.
 * `schema.slots` counts the landings and `schema.setters.length` the ports, so every rung states both
 * of its differences from the card's schema here and is held to them — and the two counts are
 * PRINTED either way, because they are the finding.
 *
 * IT REFUSES AND DOES NOT THROW. A rung whose schema is not the shape it is subtracted as makes its
 * own difference meaningless and nothing else in the table wrong, and a throw here would take a
 * forty-round run down over a bookkeeping surprise in one row.
 */
function gateSchemaShape(
    name: string,
    schema: TExoDomSchema,
    ports: number,
    landings: number
): void {
    const cardPorts = EXO_PLAN.setters.length;
    const cardLandings = EXO_PLAN.slots;
    const gotPorts = schema.setters.length - cardPorts;
    const gotLandings = schema.slots - cardLandings;
    // `schema.slots` counts the root as well, so it is the landings PLUS ONE; the difference between
    // two schemas is landings either way, and the absolute is printed under its own name.
    const counted =
        `${schema.setters.length} ports and ${schema.slots} walk slots against the card schema's ` +
        `${cardPorts} and ${cardLandings}`;
    if (gotPorts === ports && gotLandings === landings) {
        line(
            `gate template-build EVENTS: "${name}" — ${counted}: ${ports} more ports and ` +
                `${landings} more landings, which is what the ladder subtracts it as`
        );
        return;
    }
    refuse(
        `template-build EVENTS: "${name}" is subtracted as ${ports} more ports and ${landings} ` +
            `more landings than the card, and its schema carries ${counted} — ${gotPorts} more ` +
            `ports and ${gotLandings} more landings. Every difference taken against this row ` +
            'prices something other than what it is printed as.'
    );
}

/** And the gate for the rung that registers six listeners with no handler for them to find: the
 *  listener must RUN six times and route nowhere. Nothing else can distinguish it from a rung that
 *  skipped `addEventListener` altogether. */
function gateListenerSilent(name: string, node: Element): void {
    EVENT_SEEN.length = 0;
    const before = SLOT_LISTENER_RUNS;
    clickEveryRow(node);
    const ran = SLOT_LISTENER_RUNS - before;
    if (ran === ROWS && EVENT_SEEN.length === 0) {
        line(
            `gate template-build EVENTS: "${name}" — six clicks reached the shared listener ${ran} ` +
                'times and no handler, which is what a registration with an empty slot is'
        );
        return;
    }
    throw new Error(
        `template-build EVENTS: "${name}" was clicked once on each of its ${ROWS} rows; the ` +
            `shared listener ran ${ran} times where ${ROWS} were due, and ` +
            `${EVENT_SEEN.length} handlers ran where none were. Too few runs means the ` +
            'registration did not happen and the rung is not what it is subtracted as; any ' +
            'handler at all means a slot was written by a program that claims to write none.'
    );
}

/**
 * THE RE-FILL GATE. Two claims, and a dispatch alone proves only the second: that the second write
 * REPLACED the first (checked by object identity against the two subject sets), and that the node
 * still answers a click afterwards. A re-fill that wrote nothing would pass a click gate on the
 * strength of the handlers the build left standing.
 */
function gateRefillTook(
    name: string,
    refs: TEventRefs,
    refill: (into: TEventRefs, subjects: readonly TEventRowSubject[]) => void
): void {
    const rows = refs.root.querySelectorAll('li.mc-row');
    refill(refs, EVENT_ROW_SUBJECTS_B);
    for (let i = 0; i < rows.length; i++) {
        const carrier = rows[i] as unknown as Record<PropertyKey, unknown>;
        if (carrier[EXO_SLOT_SUBJECT_KEY] === EVENT_ROW_SUBJECTS_B[i]) continue;
        throw new Error(
            `template-build EVENT-REFILL: "${name}" was handed a SECOND subject set and row ${i} ` +
                'still holds the one the build wrote. A re-fill that does not replace is not a ' +
                're-fill, and the row beside it would be the price of writing nothing.'
        );
    }
    EVENT_SEEN.length = 0;
    clickEveryRow(refs.root);
    const seen = EVENT_SEEN.join(',');
    if (seen !== '0,1,2,3,4,5') {
        throw new Error(
            `template-build EVENT-REFILL: "${name}" replaced both slots on all ${rows.length} ` +
                `rows and then answered six clicks with [${seen}] where [0,1,2,3,4,5] was due — ` +
                'so the re-fill left the node unable to serve the handlers it had just been given.'
        );
    }
    line(
        `gate template-build EVENT-REFILL: "${name}" — a second handler and subject replaced the ` +
            `first on all ${rows.length} rows, and six clicks still reached six handlers in row order`
    );
}

/** Six clicks, one per row, in document order. `querySelectorAll` is a GATE's tool and appears in
 *  no timed region in this file. */
function clickEveryRow(node: Element): void {
    const rows = node.querySelectorAll('li.mc-row');
    for (let i = 0; i < rows.length; i++) {
        rows[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
}

/**
 * THE SECOND GATE, AND IT IS HERE BECAUSE THIS AXIS ONCE PUBLISHED A PARTICIPANT THAT HAD STOPPED
 * RENDERING. Handed the SAME data object twice, mikado's generated writer — every assignment
 * wrapped in `if (!_o.c || _o.c._t !== _v)` — compared fifteen times, matched fifteen times, and
 * touched nothing, and the row read as "below the native floor". A TWIN PAIR GIVES RESOLUTION AND
 * PROVES NOTHING ABOUT WORK DONE.
 *
 * The string equivalent is a cache keyed on the input object, and it would be invisible to a
 * ranking: the row would simply be the cheapest. So every server participant is asked for BOTH
 * data sets and the two answers must DIFFER. Passing this and the byte gate together is the proof:
 * the same document for `DATA` as everyone else, a different one for `DATA_B`, from every row.
 */
interface Rotated {
    readonly name: string;
    readonly a: string;
    readonly b: string;
}

function gateRotation(rotated: readonly Rotated[]): void {
    let bad = false;
    for (const r of rotated) {
        if (r.a !== r.b) continue;
        bad = true;
        refuse(
            `template-build: "${r.name}" produced the SAME ${r.a.length} characters for DATA and ` +
                'for DATA_B, whose fifteen values differ field by field. It is not rendering — it ' +
                'is serving a cached answer, or comparing and skipping — and every figure it ' +
                'would produce is the price of a lookup.'
        );
    }
    if (bad) {
        throw new Error(
            'template-build: a participant produced one document for two different data sets, so ' +
                'no figure below would be the price of producing anything. This is the defect ' +
                'that once published mikado here as building below the native floor: its ' +
                'generated writer wraps every assignment in `if (!_o.c || _o.c._t !== _v)`, so ' +
                'handed the same strings twice it compared fifteen times and touched nothing.'
        );
    }
    line(
        `gate template-build: all ${rotated.length} participants produce DIFFERENT bytes for ` +
            'DATA and for DATA_B — none of them is serving a cache'
    );
}

/**
 * SOLID'S FOUR FUNCTIONS, CHECKED AGAINST KNOWN ANSWERS BEFORE ANYTHING IS TIMED. The import they
 * come through is untyped, and the same names exist in the DOM build with EMPTY BODIES, so without
 * this a misresolution would reach a table as a row that returned `undefined` very quickly.
 */
function gateSolidIsTheServerBuild(): void {
    const joined = solidSsr(['<i>', '</i>'], 'x') as { t?: string } | undefined;
    const escaped = solidEscape('a&b<c');
    const attributed = solidAttribute('k', 'v', false);
    if (joined === undefined || joined.t !== '<i>x</i>') {
        throw new Error(
            'template-build: `ssr` from `solid-js/web/dist/server.js` did not join two pieces ' +
                `around one node — it returned ${JSON.stringify(joined)} where <i>x</i> was due. ` +
                'The DOM build declares `ssr`, `escape`, `ssrAttribute` and `resolveSSRNode` with ' +
                'EMPTY BODIES (web/dist/web.js:690-697), so this is what a misresolved import ' +
                'looks like, and it would have reached the assemble table as the fastest row in it.'
        );
    }
    if (escaped !== 'a&amp;b&lt;c' || attributed !== ' k="v"') {
        throw new Error(
            "template-build: solid's server escaper or attribute writer does not have the shape " +
                `this file declared for it — escape('a&b<c') gave ${JSON.stringify(escaped)} and ` +
                `ssrAttribute('k','v',false) gave ${JSON.stringify(attributed)}. The four ` +
                'signatures near the top of the server half were read off `server.js`; one of ' +
                'them has moved and the solid rows must be rewritten before either is quoted.'
        );
    }
    line(
        'gate template-build: solid resolved to its SERVER build — ssr joins, escape covers ' +
            '`<` and `&`, ssrAttribute returns the whole attribute'
    );
}

// ---------------------------------------------------------------------------------------
// THE CENSUS — counted off the structures, never written down. A cost per template means nothing
// without the size of the template it is a cost of.
// ---------------------------------------------------------------------------------------

interface Shape {
    nodes: number;
    elements: number;
    texts: number;
    depth: number;
}

function shapeOf(root: Node): Shape {
    const out: Shape = { nodes: 0, elements: 0, texts: 0, depth: 0 };
    const walk = (n: Node, d: number): void => {
        out.nodes++;
        if (n.nodeType === 1) out.elements++;
        else if (n.nodeType === 3) out.texts++;
        if (d > out.depth) out.depth = d;
        for (let c = n.firstChild; c !== null; c = c.nextSibling) walk(c, d + 1);
    };
    walk(root, 1);
    return out;
}

function printCensus(sample: Element): void {
    const shape = shapeOf(sample);
    const ports = EXO_CARD.declaration.portList.length;
    let attrs = 0;
    const countAttrs = (n: Element): void => {
        attrs += n.attributes.length;
        for (let c = n.firstElementChild; c !== null; c = c.nextElementSibling) countAttrs(c);
    };
    countAttrs(sample);
    line('WHAT IS BEING COMPILED AND BUILT — counted off the structures, nothing measured');
    line(
        `  the subject        ${shape.elements} elements, ${shape.texts} text nodes, ` +
            `${shape.nodes} nodes in all, depth ${shape.depth}, ${attrs} attributes when filled`
    );
    line(
        `  interpolations     ${ports} — read off the declaration's own portList, which is the one ` +
            'count in this run that is not a transcription'
    );
    line(
        `  the repeated part  ${ROWS} rows, written out LITERALLY in every spelling — no ` +
            "participant's list engine is in any table"
    );
    line(
        `  markup             floor ${PLAIN[0].length} chars · stage0 ` +
            `${STAGE0_PIECES[0][0].length} · mikado ${MIKADO_MARKUP[0].length} · exodra is a ` +
            `cursor and has no source string (its schema's emitted markup is ${EXO_PLAN.html.length})`
    );
    line(
        `  fresh templates    ${VARIANTS} variants, differing in the value of ONE static ` +
            'attribute and in nothing else — see the header on why a naive loop measures a cache'
    );
    const serialised = strFloorAssemble(DATA);
    line(
        `  the document       ${serialised.length} characters assembled, ${ports} values written ` +
            `into ${ports + 1} static pieces — the same tree, serialised`
    );
    line(
        `  server pieces      floor ${strFloorPieces(TOKENS[0]).length} · solid ` +
            `${SOLID_PIECES.length} · exodra ${
                EXO_STR_PLAN.portCount + 1
            } (its schema holds them ` +
            'inside `fillMarkup` and exposes only the port count)'
    );
}

// ---------------------------------------------------------------------------------------
// THE CLOCK AND THE RUNNER. Interleaved, rotated per round, GC before every timed region, and the
// quantum OBSERVED rather than assumed.
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

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

interface Phase {
    readonly name: string;
    /** How many operations run inside ONE timed region. Printed, because a per-operation figure
     *  whose batch size is not stated cannot be checked against the clock that produced it. */
    readonly reps: number;
    readonly prep: () => Scenario;
}

/** Milliseconds per ONE operation. */
function sampleOnce(phase: Phase): number {
    const scenario = phase.prep();
    gcIfPossible();
    const t0 = performance.now();
    scenario.measure();
    const dt = performance.now() - t0;
    scenario.cleanup();
    return dt / phase.reps;
}

function runPhases(
    phases: readonly Phase[],
    rounds: number,
    raw?: Map<string, number[]>
): Map<string, Stat> {
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
    const out = new Map<string, Stat>();
    for (const p of phases) {
        const xs = times.get(p.name) as number[];
        out.set(p.name, stat(xs));
        if (raw !== undefined) raw.set(p.name, xs);
    }
    return out;
}

/**
 * THE NULL THE MEDIANS CANNOT GIVE, AND THE REASON IT IS HERE. `|median(floor) − median(twin)|`
 * over a hundred quantised samples comes out EXACTLY ZERO whenever the two medians land on the
 * same grid step — which is the common case on this axis, and a resolution figure of 0.0 ns is a
 * claim that this run could tell any two programs apart, which is false. Every difference in the
 * file would then be "above the resolution" by construction.
 *
 * So the pair is subtracted ROUND BY ROUND instead, and what is reported is the spread of that
 * difference. The two samples of a round are not adjacent — the runner rotates the order — so this
 * bounds what the run could see between two identically-written programs SAMPLED AS THESE WERE,
 * which is the number a ladder rung has to clear before it is a reading rather than noise.
 */
function pairedSpread(raw: Map<string, number[]>, a: string, b: string): Stat {
    const xa = raw.get(a) as number[];
    const xb = raw.get(b) as number[];
    const diffs: number[] = [];
    for (let i = 0; i < xa.length; i++) diffs.push(Math.abs(xa[i] - xb[i]));
    return stat(diffs);
}

// ---------------------------------------------------------------------------------------
// THE REPETITION FACTORS. Chosen so that the CHEAPEST row of each table clears the clock by a
// margin rather than by a tick, and checked against the OBSERVED quantum at the end — every row
// whose region landed under three ticks is refused BY NAME with the batch that would clear it.
// ---------------------------------------------------------------------------------------

/** 128 compiles per region. It is also exactly `VARIANTS`, so one region compiles each variant once
 *  and no repetition inside a region ever sees a template a previous one in that region compiled. */
const COMPILE_REPS = VARIANTS;

/** 512 builds per region. A build of this tree is single-digit microseconds, so this is
 *  milliseconds of region — and it is 512 standing instances of a 32-element tree, which is the
 *  memory this axis costs at its peak. */
const BUILD_REPS = 512;

/**
 * 8192 prepared forms per region, and it is SIXTY-FOUR TIMES the compile table's batch on purpose.
 * The server floor's compile is one array literal and one concatenation — no parse, no walk, no
 * table — so at 128 per region it would land inside the clock's grain and the row would print
 * quantisation. The batch is per PHASE and is printed in the `reps` column beside every median, so
 * a reader can check any figure here against the clock that produced it.
 */
const PIECES_REPS = VARIANTS * 64;

/** 1024 documents per region. One assembly of this tree is around a microsecond, so this is a
 *  millisecond of region, and 1024 live ~1 kB strings, which is the memory it costs at its peak. */
const ASSEMBLE_REPS = 1024;

/**
 * THE TINY SUBJECT'S TWO BATCHES, and both are larger than the card's for the same reason: three
 * elements and one write are a fraction of thirty-two elements and fifteen, so the card's batches
 * would put every tiny row inside the clock's grain.
 *
 * EIGHT TIMES `VARIANTS` FOR THE COMPILE MEANS EACH VARIANT IS COMPILED EIGHT TIMES IN ONE REGION,
 * which the card's batch never does, and the freshness argument has to be restated for it: the
 * token rotation is the BELT, and the braces are that no participant here has a cache the second
 * compile of one variant could hit — `machineOf(createExoSchema(…))` returns a NEW machine whose `forms`
 * are empty whatever the token was, `h` re-parses on every call, `Mikado.compile` builds a new
 * `Template` (its own source marks the structure cache "not supported by the inline compiler"),
 * and the floor's `createElement` chain holds nothing between calls.
 */
const TINY_COMPILE_REPS = VARIANTS * 8;
const TINY_BUILD_REPS = 8192;

/** The deep and dense subjects are the card's size, so they take the card's batches. */
const DEEP_BUILD_REPS = 512;
const DENSE_BUILD_REPS = 512;

/** 256 per region rather than 512: an events build attaches six listeners per instance under the
 *  direct strategy, so 512 would stand 3072 registrations at once and the row would be measuring
 *  the allocator. */
const EVENT_BUILD_REPS = 256;

/** 512 updates per region. An update is writes and nothing else — no clone, no walk, no
 *  allocation — so it is the cheapest region in the file, and the nodes it writes into are built
 *  untimed in `prep`, which is where the memory goes. */
const UPDATE_REPS = 512;

/** 512 re-fills per region. It stands 512 event nodes and 3072 registrations, which the EVENTS
 *  BUILD batch is half the size to avoid — but there every one of them was made INSIDE the timed
 *  region and here they are made in `prep`, so what the count costs is memory and not the row. */
const EVENT_REFILL_REPS = 512;

// ---------------------------------------------------------------------------------------

export function benchmarkTemplateBuild(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    const f1 = (x: number): string => x.toFixed(1);
    /** Milliseconds per operation → microseconds. */
    const us = (ms: number): number => ms * 1e3;
    /** Milliseconds per operation → nanoseconds. */
    const ns = (ms: number): number => ms * 1e6;

    const factor = batch < 1 ? 1 : batch;
    const compileReps = COMPILE_REPS * factor;
    const buildReps = BUILD_REPS * factor;
    const piecesReps = PIECES_REPS * factor;
    const assembleReps = ASSEMBLE_REPS * factor;

    refuse(
        'template-build: marko is in NO table, and not because it lost. Marko 6 compiles at ' +
            "BUILD TIME — `vite.config.ts`'s `marko()` plugin hands every `.marko` file to " +
            "`@marko/compiler`'s `compile(source, id, { output: 'dom', optimize: true })` during " +
            'the transform — so there is no runtime compile to measure and this axis will not ' +
            'invent one. Its BUILD and ASSEMBLE rows are missing for a narrower reason: a ' +
            "comparable row needs a `.marko` file holding this axis's subject tree, and no such " +
            'file exists. The server side has a THIRD reason on top of those two: that plugin ' +
            "passes `output: 'dom'`, so nothing on this page was compiled for string output at all."
    );
    refuse(
        'template-build: stage0 is in NEITHER SERVER table, and that is an ABSENT CAPABILITY ' +
            'rather than a loss. `node_modules/stage0/index.js` touches the DOM at MODULE LOAD — ' +
            'line 24 is `document.createTreeWalker(document, …)` and line 70 is ' +
            "`document.createElement('template')` — and the package publishes one build with no " +
            'export conditions, so there is no second half to reach. It cannot produce a string.'
    );
    refuse(
        'template-build: mikado is in NEITHER SERVER table, and it is the one participant here ' +
            'that HAS a server renderer. Its `main` is `ssr/index.js`, but its `browser` map sends ' +
            'exactly that path to `dist/mikado.bundle.min.js`, so the specifier `mikado` in this ' +
            'bundle IS the DOM half the two tables above measure. Its SSR compiler is CommonJS and ' +
            '`require`s `fs` and `path` to read the template off disk ' +
            '(`node_modules/mikado/compiler/compile.js:1-3`), which no browser process can do. It ' +
            'IS measured, in node, by `packages/benchmarks/ssr/apps/mikado/server.mjs`.'
    );
    refuse(
        'template-build: solid is in the SERVER-ASSEMBLE table and NOT in the SERVER-COMPILE one, ' +
            'for the same reason marko is in neither. `babel-preset-solid` with ' +
            "`generate: 'ssr'` hoists the static pieces to module scope as `var _tmpl$ = [ … ]` " +
            'and leaves the component body as one `ssr(_tmpl$, ssrAttribute(…), escape(…), …)` ' +
            'call, so there is no runtime compile to time. What this file measures is that call.'
    );

    // ── THE PROTOTYPES THE BUILD TABLE BUILDS FROM, compiled once, from variant 0 ────────────
    const floorProto = floorCompile(TOKENS[0]);
    const twinProto = twinCompile(TOKENS[0]);
    const stage0Tpl = h(STAGE0_PIECES[0]);
    const mikadoHost = document.createElement('div');
    const mikadoView = mikadoCompile(MIKADO_MARKUP[0], mikadoHost);
    const mountHost = document.createElement('div');

    // ── AND THE SAME FOR THE FOUR SUBJECTS THE CARD DOES NOT COVER ──────────────────────────
    const tinyProto = tinyFloorCompile(TOKENS[0]);
    const tinyTwinProto = tinyTwinCompile(TOKENS[0]);
    const tinyStage0Tpl = h(TINY_STAGE0_PIECES[0]);
    const tinyMikadoView = mikadoCompile(TINY_MIKADO_MARKUP[0], document.createElement('div'));

    const deepProto = deepFloorCompile(TOKENS[0]);
    const deepTwinProto = deepTwinCompile(TOKENS[0]);
    const deepStage0Tpl = h(DEEP_STAGE0_PIECES[0]);
    const deepMikadoView = mikadoCompile(DEEP_MIKADO_MARKUP[0], document.createElement('div'));

    const denseProto = denseFloorCompile(TOKENS[0]);
    const denseTwinProto = denseTwinCompile(TOKENS[0]);
    const denseStage0Tpl = h(DENSE_STAGE0_PIECES[0]);
    const denseMikadoView = mikadoCompile(DENSE_MIKADO_MARKUP[0], document.createElement('div'));

    // The events subject's prototype IS the card's: an event port emits no markup and carries no
    // placeholder, so a hand-written program preparing this tree prepares exactly the card's tree.
    const eventStage0Tpl = h(EVENT_STAGE0_PIECES[0]);

    // ── THE GATE, before any timing ──────────────────────────────────────────────────────────
    gateSolidIsTheServerBuild();

    // `renderToString` IS THE ONE FOREIGN CALL HERE THAT REACHES OUTSIDE ITS OWN MODULE — a
    // seroval `Serializer`, `createRoot`, `setTimeout` — and a throw inside it would take the whole
    // axis down with it, including three tables that have nothing to do with solid. It is exercised
    // here, once, and its row is dropped BY NAME rather than allowed to kill the run.
    let solidRtsError: string | null = null;
    try {
        solidRenderToStringAssemble(DATA);
    } catch (error) {
        solidRtsError = error instanceof Error ? error.message : String(error);
        refuse(
            'template-build: `solid` (renderToString) is NOT in the assemble table — the call ' +
                `threw in this page: ${solidRtsError}. The server build reaches for a seroval ` +
                'serializer and a `createRoot` where `solid·ssr` reaches for nothing, so the ' +
                'assembly row below stands and the ENTRY POINT row does not. What is missing is ' +
                'the wrapper, and the subtraction that would have priced it.'
        );
    }
    const solidRts = solidRtsError === null;

    const gateMountParent = document.createElement('div');
    const gateMounted = exodraMount(DATA, gateMountParent);
    // NAMED AS THE RECORDER NAMES THEM — `SECTION/row` — because this gate holds the DOM rows and
    // the server rows in one comparison and three of the names would otherwise collide.
    const serverRows = (d: TCardData): readonly Built[] => [
        { name: 'SERVER/floor', markup: strFloorAssemble(d) },
        { name: 'SERVER/floor·twin', markup: strTwinAssemble(d) },
        { name: 'SERVER/exodra', markup: exodraAssemble(d) },
        { name: 'SERVER/solid·ssr', markup: solidAssemble(d) },
        ...(solidRts ? [{ name: 'SERVER/solid', markup: solidRenderToStringAssemble(d) }] : []),
    ];
    const built: readonly Built[] = [
        { name: 'floor', markup: floorKeepBuild(floorProto, DATA, []).outerHTML },
        { name: 'floor·twin', markup: twinKeepBuild(twinProto, DATA, []).outerHTML },
        { name: 'stage0', markup: stage0Build(stage0Tpl, DATA).outerHTML },
        { name: 'mikado', markup: mikadoBuild(mikadoView, DATA).outerHTML },
        { name: 'exodra', markup: exodraBuild(DATA).outerHTML },
        { name: 'exodra·declared', markup: exodraDeclaredBuild(DATA).outerHTML },
        { name: 'exodra·mount', markup: gateMounted.outerHTML },
        // THE SERVER ROWS GO THROUGH THE SAME GATE AS THE DOM ONES, against the same reference,
        // and that is a stronger statement than a gate of their own would be: what it says is that
        // the bytes a server sends and the bytes a browser builds are the same bytes.
        ...serverRows(DATA),
    ];
    printCensus(floorKeepBuild(floorProto, DATA, []));
    gateBytes('CARD', built);
    gateMountParent.textContent = '';

    // THE SECOND DATA SET GOES THROUGH THE SAME GATE, on instances that have ALREADY BUILT ONCE:
    // a participant that caches per template would pass the first gate and then render `DATA`'s
    // bytes for `DATA_B`'s values, which is exactly the failure the rotation is here to expose.
    const gateMountParentB = document.createElement('div');
    const gateMountedB = exodraMount(DATA_B, gateMountParentB);
    const serverB = serverRows(DATA_B);
    const builtB: readonly Built[] = [
        { name: 'floor', markup: floorKeepBuild(floorProto, DATA_B, []).outerHTML },
        { name: 'floor·twin', markup: twinKeepBuild(twinProto, DATA_B, []).outerHTML },
        { name: 'stage0', markup: stage0Build(stage0Tpl, DATA_B).outerHTML },
        { name: 'mikado', markup: mikadoBuild(mikadoView, DATA_B).outerHTML },
        { name: 'exodra', markup: exodraBuild(DATA_B).outerHTML },
        { name: 'exodra·declared', markup: exodraDeclaredBuild(DATA_B).outerHTML },
        { name: 'exodra·mount', markup: gateMountedB.outerHTML },
        ...serverB,
    ];
    gateBytes('CARD (DATA_B)', builtB);
    gateMountParentB.textContent = '';

    const serverA = serverRows(DATA);
    // THE ROTATION GATE REACHES THE DOM ROWS TOO, and not only the server ones it was written for.
    // The defect it exists to catch — a participant comparing fifteen values, matching fifteen
    // times and writing nothing — was a DOM participant, and for eleven of its rows this file was
    // catching it only on the server side.
    gateRotation(
        built.map((row, i) => ({ name: `CARD/${row.name}`, a: row.markup, b: builtB[i].markup }))
    );
    gateRotation(
        serverA.map((row, i) => ({ name: row.name, a: row.markup, b: serverB[i].markup }))
    );

    // THE PREPARED FORM GOES THROUGH A GATE OF ITS OWN, exactly as `floor·made` does above: what
    // SERVER-COMPILE's floor row claims is that the pieces it produces ARE the pieces
    // SERVER-ASSEMBLE's floor row concatenates, and nothing else checks that.
    const floorPieces = strFloorPieces(TOKENS[0]);
    const floorJoined = joinStrPieces(floorPieces, DATA);
    const twinJoined = joinStrPieces(strTwinPieces(TOKENS[0]), DATA);
    const straightLine = strFloorAssemble(DATA);
    if (floorJoined !== straightLine || twinJoined !== straightLine) {
        throw new Error(
            "template-build: a SERVER-COMPILE row does not produce SERVER-ASSEMBLE's prepared " +
                `form — its floor joins to ${floorJoined.length} characters and its twin to ` +
                `${twinJoined.length}, where the straight-line program writes ` +
                `${straightLine.length}. The commonest cause is the repeated region: the subject ` +
                `has ${ROWS} rows and the piece list spells its joins out one by one.`
        );
    }
    line(
        `gate template-build: both SERVER-COMPILE rows produce SERVER-ASSEMBLE's own pieces — ` +
            `${floorPieces.length} of them, joining to ${straightLine.length} characters`
    );

    // THE COMPILE FLOOR GOES THROUGH A GATE OF ITS OWN, on the PROTOTYPE rather than on a filled
    // node: what it claims is that the tree it builds by hand is the same tree a parser produces
    // from the markup this repository's compiler emits, twelve empty Text nodes and all. The
    // parsing program exists FOR this gate and is not a row — see `floorCompile`'s note on why a
    // table may not carry two floors.
    const madeProto = floorCompile(TOKENS[0]).outerHTML;
    const parsedProto = floorParseCompile(PLAIN[0]).outerHTML;
    if (madeProto !== parsedProto) {
        let at = 0;
        while (
            at < madeProto.length &&
            at < parsedProto.length &&
            madeProto[at] === parsedProto[at]
        )
            at++;
        throw new Error(
            'template-build: the compile floor does not reproduce the parsed prototype — ' +
                `${madeProto.length} chars against ${parsedProto.length}, first difference at ` +
                `${at}\n  parsed: …${parsedProto.slice(Math.max(0, at - 60), at + 90)}…\n` +
                `  made  : …${madeProto.slice(Math.max(0, at - 60), at + 90)}…`
        );
    }
    line(
        `gate template-build: the compile floor builds the parser's prototype by hand — ` +
            `${madeProto.length} characters, no markup string and no parse`
    );

    // ── THE FOUR NEW SUBJECTS GO THROUGH THE SAME TWO GATES THE CARD DOES ───────────────────
    //
    // EACH ONE HAS ITS OWN REFERENCE and none of them is compared against the card: they are
    // different trees on purpose. What is shared is the rule — every participant of a subject
    // builds the same bytes from DATA, the same bytes from DATA_B, and the two must differ.

    /** Counted off the built node and off the schema's own `portList`, never written down: a
     *  subject that drifts from the prose above it is visible in this line. */
    const censusOf = (subject: string, sample: Element, ports: number): void => {
        const shape = shapeOf(sample);
        line(
            `  ${subject.padEnd(8)} ${shape.elements} elements, ${shape.texts} text nodes, ` +
                `${shape.nodes} nodes, depth ${shape.depth}, ${ports} ports, ` +
                `${sample.outerHTML.length} characters filled`
        );
    };

    const gateSubject = (subject: string, rows: (d: TCardData) => readonly Built[]): void => {
        const a = rows(DATA);
        const b = rows(DATA_B);
        gateBytes(subject, a);
        gateBytes(`${subject} (DATA_B)`, b);
        gateRotation(
            a.map((row, i) => ({ name: `${subject}/${row.name}`, a: row.markup, b: b[i].markup }))
        );
    };

    gateSubject('TINY', (d) => [
        { name: 'floor', markup: tinyFloorKeepBuild(tinyProto, d, []).outerHTML },
        { name: 'floor·twin', markup: tinyTwinBuild(tinyTwinProto, d).outerHTML },
        { name: 'stage0', markup: tinyStage0Build(tinyStage0Tpl, d).outerHTML },
        { name: 'mikado', markup: mikadoBuild(tinyMikadoView, d).outerHTML },
        { name: 'exodra', markup: tinyExodraBuild(d).outerHTML },
        { name: 'exodra·declared', markup: tinyDeclaredBuild(d).outerHTML },
    ]);
    gateSubject('DEEP', (d) => [
        { name: 'floor', markup: deepFloorKeepBuild(deepProto, d, []).outerHTML },
        { name: 'floor·twin', markup: deepTwinBuild(deepTwinProto, d).outerHTML },
        { name: 'stage0', markup: deepStage0Build(deepStage0Tpl, d).outerHTML },
        { name: 'mikado', markup: mikadoBuild(deepMikadoView, d).outerHTML },
        { name: 'exodra', markup: deepExodraBuild(d).outerHTML },
        { name: 'exodra·declared', markup: deepDeclaredBuild(d).outerHTML },
    ]);
    gateSubject('DENSE', (d) => [
        { name: 'floor', markup: denseFloorKeepBuild(denseProto, d, []).outerHTML },
        { name: 'floor·twin', markup: denseTwinBuild(denseTwinProto, d).outerHTML },
        { name: 'stage0', markup: denseStage0Build(denseStage0Tpl, d).outerHTML },
        { name: 'mikado', markup: mikadoBuild(denseMikadoView, d).outerHTML },
        { name: 'exodra', markup: denseExodraBuild(d).outerHTML },
        { name: 'exodra·declared', markup: denseDeclaredBuild(d).outerHTML },
    ]);

    // THE EVENT SUBJECT'S BYTES ARE THE CARD'S BYTES — no participant here emits markup for a
    // handler — so its byte gate holds the direct rows and the delegated rows in ONE comparison,
    // which is the statement that matters: the two strategies produce the same document and differ
    // only in where the handler lives.
    // The root's listeners go on ONCE, here, outside every timed region — which is the whole of
    // what delegation buys and the reason no delegated row below pays for a registration. The
    // disposer is deliberately dropped: this host lives as long as the axis does.
    const eventDelegatedHost = document.createElement('div');
    (EVENT_DELEGATED_PACK.install as (root: Element) => () => void)(eventDelegatedHost);
    const floorDelegatedHost = document.createElement('div');
    floorDelegatedHost.addEventListener('click', floorDelegatedListener(floorDelegatedHost));

    gateSubject('EVENTS', (d) => [
        { name: 'floor·direct', markup: eventFloorDirectKeepBuild(floorProto, d, []).outerHTML },
        { name: 'floor·twin', markup: eventTwinDirectBuild(twinProto, d, []).outerHTML },
        { name: 'stage0·direct', markup: eventStage0DirectBuild(eventStage0Tpl, d).outerHTML },
        { name: 'exodra·direct', markup: eventDirectBuild(d).outerHTML },
        {
            name: 'floor·delegated',
            markup: eventFloorDelegatedBuild(floorProto, d, []).outerHTML,
        },
        {
            name: 'stage0·delegated',
            markup: eventStage0DelegatedBuild(eventStage0Tpl, d).outerHTML,
        },
        { name: 'exodra·delegated', markup: eventDelegatedBuild(d).outerHTML },
        // THE LADDER RUNGS ARE IN THE SAME COMPARISON AS THE PARTICIPANTS, not in a gate of their
        // own: a property store is invisible to a serialisation, so every rung below writes the
        // slots the table is about and STILL has to produce the shared reference character for
        // character.
        {
            name: 'floor·slots+on',
            markup: eventFloorSlotsListenBuild(floorProto, d, []).outerHTML,
        },
        {
            name: 'floor·served+on',
            markup: eventFloorServedListenBuild(floorProto, d, []).outerHTML,
        },
        { name: 'floor·on', markup: eventFloorListenOnlyBuild(floorProto, d, []).outerHTML },
        { name: 'floor·slots', markup: eventFloorSlotsOnlyBuild(floorProto, d, []).outerHTML },
        { name: 'floor·1slot+on', markup: eventFloorOneSlotBuild(floorProto, d, []).outerHTML },
        // IT IS IN THIS COMPARISON AND NOT IN A NOTE: the rung's claim is that composing a plugin
        // changed nothing, and the first thing "nothing" has to mean is the shared reference
        // character for character, from both data sets, out of a schema nobody else builds through.
        { name: 'exodra·merged', markup: eventMergedBuild(d).outerHTML },
        { name: 'exodra·nowrite', markup: eventNoWriteBuild(d).outerHTML },
        { name: 'exodra·oncopy', markup: eventOnCopyBuild(d).outerHTML },
        { name: 'exodra·ports', markup: eventPortsBuild(d).outerHTML },
        // AND THE FOUR RUNGS THAT SPLIT IT. A declared port writes nothing, so a schema carrying
        // twenty-four of them has to produce the same characters as one carrying none — which is
        // the whole reason the pair can be subtracted at all.
        { name: 'exodra·ports12', markup: eventPorts12Build(d).outerHTML },
        { name: 'exodra·ports24', markup: eventPorts24Build(d).outerHTML },
        { name: 'exodra·ports@tail', markup: eventPortsTailBuild(d).outerHTML },
        { name: 'exodra·twin', markup: exodraTwinBuild(d).outerHTML },
        { name: 'exodra·noports', markup: exodraBuild(d).outerHTML },
    ]);

    line('THE FIVE SUBJECTS BESIDE THE CARD — counted off the structures, nothing measured');
    censusOf('tiny', tinyExodraBuild(DATA), TINY_CARD.declaration.portList.length);
    censusOf('deep', deepExodraBuild(DATA), DEEP_CARD.declaration.portList.length);
    censusOf('dense', denseExodraBuild(DATA), DENSE_CARD.declaration.portList.length);
    censusOf('events', eventDirectBuild(DATA), EVENT_CARD.declaration.portList.length);
    line(
        '  shell    the CARD tree again, every port written the empty string — same elements, ' +
            'same ports, no characters in any of them'
    );

    // ── AND THE GATE NO BYTE COMPARISON CAN STAND IN FOR: SIX CLICKS PER ROW ────────────────
    gateHandlersLive('floor·direct', () => {
        clickEveryRow(eventFloorDirectKeepBuild(floorProto, DATA, []));
    });
    gateHandlersLive('stage0·direct', () => {
        clickEveryRow(eventStage0DirectBuild(eventStage0Tpl, DATA));
    });
    gateHandlersLive('exodra·direct', () => {
        clickEveryRow(eventDirectBuild(DATA));
    });
    // THE COMPOSED BACKEND TAKES THE SAME GATE AS THE PLAIN ONE, and it is the gate that matters
    // most for it: a rung whose merge quietly broke the direct pack would build the shared bytes,
    // attach nothing, and be the cheapest row in the table under composition's name.
    gateHandlersLive('exodra·merged', () => {
        clickEveryRow(eventMergedBuild(DATA));
    });
    gateHandlersLive('floor·delegated', () => {
        const node = eventFloorDelegatedBuild(floorProto, DATA, []);
        floorDelegatedHost.appendChild(node);
        clickEveryRow(node);
        floorDelegatedHost.textContent = '';
    });
    gateHandlersLive('exodra·delegated', () => {
        const node = eventDelegatedBuild(DATA);
        eventDelegatedHost.appendChild(node);
        clickEveryRow(node);
        eventDelegatedHost.textContent = '';
    });
    gateHandlersLive('stage0·delegated', () => {
        const node = eventStage0DelegatedBuild(eventStage0Tpl, DATA);
        floorDelegatedHost.appendChild(node);
        clickEveryRow(node);
        floorDelegatedHost.textContent = '';
    });

    // ── AND THE LADDER RUNGS, EACH HELD TO THE CLAIM IT ACTUALLY MAKES ──────────────────────
    //
    // THREE of them attach live handlers and take the click gate. The rest attach nothing a click
    // could reach, so a dispatch would say nothing about them, and each takes instead the gate
    // that CAN discriminate it: the slots read back, the slots read back EMPTY, or the shared
    // listener counted running and reaching no handler. `exodra·noports` takes none of the four —
    // it is the card component, gated as `exodra` in every card table, and what it does not do is
    // printed in this table's notes.
    gateHandlersLive('floor·slots+on', () => {
        clickEveryRow(eventFloorSlotsListenBuild(floorProto, DATA, []));
    });
    gateHandlersLive('floor·served+on', () => {
        clickEveryRow(eventFloorServedListenBuild(floorProto, DATA, []));
    });
    gateHandlersLive('floor·1slot+on', () => {
        clickEveryRow(eventFloorOneSlotBuild(floorProto, DATA, []));
    });
    gateSlotsWritten('floor·slots', eventFloorSlotsOnlyBuild(floorProto, DATA, []));
    gateSlotsWritten('floor·slots+on', eventFloorSlotsListenBuild(floorProto, DATA, []));
    gateListenerSilent('floor·on', eventFloorListenOnlyBuild(floorProto, DATA, []));
    gateSlotsAbsent('exodra·nowrite', eventNoWriteBuild(DATA));
    gateSlotsAbsent('exodra·oncopy', eventOnCopyBuild(DATA));
    // The one rung of the four whose events pack is the SHIPPED direct one: nothing is on its rows
    // because its wire never calls `c.on`, and under this gate's key strings that is the same
    // reading as "not one of the six ports was filled".
    gateSlotsAbsent('exodra·ports', eventPortsBuild(DATA));

    // ── AND THE CLAIM THE NEW RUNGS MAKE THAT NO BYTE AND NO CLICK CAN SHOW ─────────────────
    //
    // `exodra·ports` has to DECLARE the six event ports it never fills, or it is
    // `exodra·noports` under a second name and the difference between them is a null.
    const eventPortCount = EVENT_PORTS_CARD.declaration.portList.length;
    const cardPortCount = EXO_CARD.declaration.portList.length;
    if (eventPortCount - cardPortCount === ROWS) {
        line(
            `gate template-build EVENTS: "exodra·ports" — its schema carries ${eventPortCount} ` +
                `ports against the card's ${cardPortCount}, the ${ROWS} event ports being the ` +
                'whole of the difference, and its wire fills none of them'
        );
    } else {
        throw new Error(
            `template-build EVENTS: "exodra·ports" carries ${eventPortCount} ports and ` +
                `"exodra·noports" carries ${cardPortCount}, a difference of ` +
                `${
                    eventPortCount - cardPortCount
                } where ${ROWS} were due. The row is supposed to ` +
                'be the event schema with the card wire, and a row that is the card schema twice ' +
                'would print a null as though it were a measurement of what six ports cost.'
        );
    }

    // ── AND WHAT EACH OF THE FOUR SPLITTING RUNGS IS, COUNTED OFF ITS OWN COMPILED SCHEMA ─────
    //
    // The claim this table carried — that six event ports are six more landings — is decided here
    // and not in the prose: `exodra·ports` is gated as SIX PORTS AND NO LANDING, and if the schema
    // disagrees the refusal says so with both counts in it. `exodra·ports@tail` is the same six on
    // the one element of the thirty-two that nothing else addresses, and is the only rung in the
    // table that claims a landing at all.
    gateSlotsAbsent('exodra·ports12', eventPorts12Build(DATA));
    gateSlotsAbsent('exodra·ports24', eventPorts24Build(DATA));
    gateSlotsAbsent('exodra·ports@tail', eventPortsTailBuild(DATA));
    gateSlotsAbsent('exodra·twin', exodraTwinBuild(DATA));
    gateSchemaShape('exodra·noports', EXO_PLAN, 0, 0);
    gateSchemaShape('exodra·twin', EXO_TWIN_PLAN, 0, 0);
    gateSchemaShape('exodra·ports', EVENT_PORTS_PLAN, ROWS, 0);
    gateSchemaShape('exodra·nowrite', EVENT_NOWRITE_PLAN, ROWS, 0);
    gateSchemaShape('exodra·merged', EVENT_MERGED_PLAN, ROWS, 0);
    gateMergeIsNull();
    gateSchemaShape('exodra·ports12', EVENT_PORTS12_PLAN, ROWS * 2, 0);
    gateSchemaShape('exodra·ports24', EVENT_PORTS24_PLAN, ROWS * 4, 0);
    gateSchemaShape('exodra·ports@tail', EVENT_PORTS_TAIL_PLAN, ROWS, 1);

    // ── AND THE RE-FILL RUNGS, WHOSE NODES MUST ALREADY BE SERVED BEFORE THEY ARE ASKED ─────
    const refillGateRefs: TEventRefs[] = [];
    eventFloorSlotsListenBuild(floorProto, DATA, refillGateRefs);
    eventFloorSlotsListenBuild(floorProto, DATA, refillGateRefs);
    eventFloorSlotsListenBuild(floorProto, DATA, refillGateRefs);
    eventFloorSlotsListenBuild(floorProto, DATA, refillGateRefs);
    gateRefillTook('floor', refillGateRefs[0], eventRefillSlots);
    gateRefillTook('floor·twin', refillGateRefs[1], eventRefillTwin);
    gateRefillTook('floor·served', refillGateRefs[2], eventRefillServed);
    gateRefillTook('floor·listen', refillGateRefs[3], eventRefillListen);

    // ── MIKADO'S ROUTE ROW, WHICH IS THE ONE PARTICIPANT THAT CAN DECLINE ───────────────────
    //
    // It is built, gated and clicked inside a `try`, and DROPPED BY NAME on any throw, for the
    // reason `renderToString` is: it reaches a process-global route table and a listener on the
    // document, and a throw in there would take eleven tables that have nothing to do with mikado
    // down with it.
    let mikadoRouteView: TMikadoView | null = null;
    let mikadoRouteError: string | null = null;
    try {
        for (let r = 0; r < ROWS; r++) {
            const row = r;
            Mikado.route(`exotplr${row}`, (): void => {
                noteEventRow(row);
            });
        }
        const view = mikadoCompile(EVENT_MIKADO_MARKUP[0], document.createElement('div'));
        const reference = eventDirectBuild(DATA).outerHTML;
        gateMikadoRouteBytes(reference, mikadoBuild(view, DATA).outerHTML);
        gateMikadoRouteBytes(
            eventDirectBuild(DATA_B).outerHTML,
            mikadoBuild(view, DATA_B).outerHTML
        );
        // MIKADO'S LISTENER SITS ON THE DOCUMENT — `register_event` in `src/event.js` attaches to
        // `document.documentElement` — so this is the one live gate whose node has to be IN the
        // page. Every other participant's root listener is on a host it owns and its nodes stay
        // detached.
        gateHandlersLive('mikado·route', () => {
            const node = mikadoBuild(view, DATA);
            document.body.appendChild(node);
            clickEveryRow(node);
            node.remove();
        });
        mikadoRouteView = view;
    } catch (error) {
        mikadoRouteError = error instanceof Error ? error.message : String(error);
        refuse(
            'template-build EVENTS: `mikado·route` is NOT in the events tables — building or ' +
                `clicking it threw in this page: ${mikadoRouteError}. What the row would have ` +
                'shown is the one thing mikado expresses better than anybody here: its ' +
                'registration is a static attribute on the factory node, so a clone carries it ' +
                'and the per-instance event cost is zero.'
        );
    }
    const mikadoRoute = mikadoRouteView !== null;

    refuse(
        'template-build EVENTS: mikado has NO row in the DIRECT half, and it is an absent ' +
            'capability rather than a loss. `cloneNode` does not copy listeners and mikado builds ' +
            'by filling the FACTORY and cloning it (`mikado.js:1114-1117`), so there is no moment ' +
            'at which it holds the instance to attach to; its model has no per-element handler at ' +
            'all, only the route attribute the delegated row uses. A user who wants one must find ' +
            'the rows in the clone by hand — which is exactly the addressing fill-then-clone ' +
            "exists to avoid, and pricing my own walk under mikado's name would be pricing me."
    );
    refuse(
        'template-build: there is no UPDATE table for TINY, DEEP, DENSE or EVENTS, and no ' +
            'SHELL table for any subject but the card. The update question is "what do N writes ' +
            'into an existing node cost", and the card answers it at fifteen; the dense subject ' +
            'would answer it again at thirty-two over the SAME thirty-two elements, which is the ' +
            'one extension worth having and is the first thing to add here. Until it is run, ' +
            'what an update costs as the port count doubles is UNMEASURED and no figure from the ' +
            'card table may be scaled to guess it.'
    );

    // ── THE UPDATE GATES ────────────────────────────────────────────────────────────────────
    //
    // GATE ONE: an updated node's bytes must equal what a FRESH BUILD with that data produces.
    // Without it a participant that wrote three of the fifteen ports would be the fastest row in
    // the table and nothing would say so. GATE TWO is the rotation: two updates carrying different
    // data must leave different bytes, which is the same trap that once published mikado here as
    // building below the native floor.

    const floorKept = (d: TCardData): TFloorRefs => {
        const refs: TFloorRefs[] = [];
        floorKeepBuild(floorProto, d, refs);
        return refs[0];
    };
    const twinKept = (d: TCardData): TFloorRefs => {
        const refs: TFloorRefs[] = [];
        twinKeepBuild(twinProto, d, refs);
        return refs[0];
    };
    const stage0Kept = (d: TCardData): TStage0Kept => {
        const refs: TStage0Refs[] = [];
        const node = stage0KeepBuild(stage0Tpl, d, refs);
        return { node, refs: refs[0] };
    };

    const updateRows = (from: TCardData, to: TCardData): readonly Built[] => {
        const floorRefs = floorKept(from);
        floorUpdate(floorRefs, to);
        const twinRefs = twinKept(from);
        twinUpdate(twinRefs, to);
        const s0 = stage0Kept(from);
        stage0Update(s0, to);
        const mk = mikadoBuild(mikadoView, from);
        mikadoView.update(mk as HTMLElement, to);
        const ex = exodraKeepBuild(from);
        exodraUpdate(ex, to);
        return [
            { name: 'a fresh build', markup: exodraBuild(to).outerHTML },
            { name: 'floor', markup: floorRefs.root.outerHTML },
            { name: 'floor·twin', markup: twinRefs.root.outerHTML },
            { name: 'stage0', markup: s0.node.outerHTML },
            { name: 'mikado', markup: mk.outerHTML },
            { name: 'exodra', markup: ex.node.outerHTML },
        ];
    };

    const updatedToB = updateRows(DATA, DATA_B);
    const updatedToA = updateRows(DATA_B, DATA);
    gateBytes('UPDATE', updatedToB);
    gateBytes('UPDATE (the other way)', updatedToA);
    gateRotation(
        updatedToB.map((row, i) => ({
            name: `UPDATE/${row.name}`,
            a: row.markup,
            b: updatedToA[i].markup,
        }))
    );

    // ── THE SHELL GATE, AND IT DROPS A PARTICIPANT RATHER THAN KILLING THE RUN ──────────────
    //
    // Whether four template libraries agree about what an EMPTY port renders as is not something
    // this file may assume — it is the question the shell subject asks. So a disagreement here is
    // reported per participant and that participant loses its two rows, where a disagreement in
    // any other subject throws: there I control both spellings and a mismatch is my defect, here
    // it is a finding about somebody else's writer.

    const shellRows: readonly Built[] = [
        { name: 'floor', markup: floorKept(EMPTY).root.outerHTML },
        { name: 'floor·twin', markup: twinKept(EMPTY).root.outerHTML },
        { name: 'stage0', markup: stage0Kept(EMPTY).node.outerHTML },
        { name: 'mikado', markup: mikadoBuild(mikadoView, EMPTY).outerHTML },
        { name: 'exodra', markup: exodraKeepBuild(EMPTY).node.outerHTML },
    ];
    const shellOk = new Set<string>(['floor', 'floor·twin']);
    const shellReference = shellRows[0].markup;
    for (let i = 1; i < shellRows.length; i++) {
        const row = shellRows[i];
        if (row.markup === shellReference) {
            shellOk.add(row.name);
            continue;
        }
        const at = firstDifference(shellReference, row.markup);
        refuse(
            `template-build SHELL: "${row.name}" does not build the same EMPTY node as the ` +
                `floor — ${row.markup.length} characters against ${shellReference.length}, first ` +
                `differing at index ${at}. It has no row in the shell table, and the reason is ` +
                'the result rather than a failure: handed the empty string for every port, this ' +
                'participant renders a different tree from the one the others render, so what ' +
                '"the shell" IS depends on who built it.\n' +
                `  floor      …${shellReference.slice(Math.max(0, at - 30), at + 30)}…\n` +
                `  ${row.name.padEnd(10)} …${row.markup.slice(Math.max(0, at - 30), at + 30)}…`
        );
    }
    if (shellOk.size === shellRows.length) {
        line(
            `gate template-build SHELL: all ${shellRows.length} participants build a ` +
                `BYTE-IDENTICAL empty node — ${shellReference.length} characters, ` +
                'every port written the empty string'
        );
    }

    // AND THE FILL GOES THROUGH THE UPDATE GATE'S RULE: a shell filled once must be what a fresh
    // full build is. A participant that treated an empty value as "skip this port" would pass the
    // shell gate — the prototype's own emptiness would stand in for it — and fail here.
    const filledRows = (d: TCardData): readonly Built[] => {
        const floorRefs = floorKept(EMPTY);
        floorUpdate(floorRefs, d);
        const s0 = stage0Kept(EMPTY);
        stage0Update(s0, d);
        const mk = mikadoBuild(mikadoView, EMPTY);
        mikadoView.update(mk as HTMLElement, d);
        const ex = exodraKeepBuild(EMPTY);
        exodraUpdate(ex, d);
        return [
            { name: 'a fresh build', markup: exodraBuild(d).outerHTML },
            { name: 'floor', markup: floorRefs.root.outerHTML },
            { name: 'stage0', markup: s0.node.outerHTML },
            { name: 'mikado', markup: mk.outerHTML },
            { name: 'exodra', markup: ex.node.outerHTML },
        ];
    };
    const filledA = filledRows(DATA).filter(
        (row) => row.name === 'a fresh build' || shellOk.has(row.name)
    );
    const filledB = filledRows(DATA_B).filter(
        (row) => row.name === 'a fresh build' || shellOk.has(row.name)
    );
    gateBytes('SHELL+FILL', filledA);
    gateBytes('SHELL+FILL (DATA_B)', filledB);
    gateRotation(
        filledA.map((row, i) => ({
            name: `SHELL+FILL/${row.name}`,
            a: row.markup,
            b: filledB[i].markup,
        }))
    );

    const quantum = observeTimerQuantum();
    line(`the observed timer quantum (${f4(quantum)} ms)`);

    // ═════════════════════════════════════════════════════════════════════════════════════
    // TABLE 1 — COMPILE. Microseconds per template, once per component for the life of a process.
    // ═════════════════════════════════════════════════════════════════════════════════════

    const compilePhases: readonly Phase[] = [
        {
            name: 'floor',
            reps: compileReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(compileReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = floorCompile(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'floor·twin',
            reps: compileReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(compileReps).fill(twinProto);
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = twinCompile(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'stage0',
            reps: compileReps,
            prep: () => {
                const sink: TStage0Template[] = new Array<TStage0Template>(compileReps).fill(
                    stage0Tpl
                );
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = h(STAGE0_PIECES[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'mikado',
            reps: compileReps,
            prep: () => {
                // A HOST PER REPETITION, allocated untimed: `mount` stamps the target, and one
                // shared host would have every view in a region writing over the last one's stamp.
                const hosts: HTMLElement[] = [];
                for (let i = 0; i < compileReps; i++) hosts.push(document.createElement('div'));
                const sink: TMikadoView[] = new Array<TMikadoView>(compileReps).fill(mikadoView);
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = mikadoCompile(MIKADO_MARKUP[i % VARIANTS], hosts[i]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                        hosts.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra',
            reps: compileReps,
            prep: () => {
                const sink: TExoDomSchema[] = new Array<TExoDomSchema>(compileReps).fill(EXO_PLAN);
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = exodraCompile(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                        EXO_TOKEN = TOKENS[0];
                    },
                };
            },
        },
        {
            name: 'exodra·declared',
            reps: compileReps,
            prep: () => {
                const sink: TExoDomSchema[] = new Array<TExoDomSchema>(compileReps).fill(
                    EXO_DECLARED_PLAN
                );
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = exodraDeclaredCompile(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                        EXO_TOKEN = TOKENS[0];
                    },
                };
            },
        },
    ];

    const compileRaw = new Map<string, number[]>();
    const compiled = runPhases(compilePhases, rounds, compileRaw);

    line('');
    line(
        `COMPILE-US — one 32-element template into its prepared form [µs per template] · ` +
            `${compileReps} per region · interleaved · ${rounds} rounds · GC before every region`
    );
    line('IT IS A FIXED COST: once per component for the life of a process, never per instance.');
    line('                    reps    min       p25       median    p75       max');
    for (const p of compilePhases) {
        const s = compiled.get(p.name) as Stat;
        line(
            `${p.name.padEnd(16)}${String(p.reps).padStart(6)}   ${f4(us(s.min)).padStart(8)}  ` +
                `${f4(us(s.p25)).padStart(8)}  ${f4(us(s.median)).padStart(8)}  ` +
                `${f4(us(s.p75)).padStart(8)}  ${f4(us(s.max)).padStart(8)}`
        );
    }

    // ═════════════════════════════════════════════════════════════════════════════════════
    // TABLE 2 — BUILD. Nanoseconds per node, once per instance.
    // ═════════════════════════════════════════════════════════════════════════════════════

    const buildPhases: readonly Phase[] = [
        {
            name: 'floor',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                const kept: TFloorRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            sink[i] = floorKeepBuild(floorProto, i & 1 ? DATA_B : DATA, kept);
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra·clone',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++) sink[i] = exodraCloneOnly();
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra·clone+walk',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++) sink[i] = exodraCloneWalk();
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra·clone+record',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++) sink[i] = exodraCloneRecord();
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'floor·twin',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(twinProto);
                const kept: TFloorRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            sink[i] = twinKeepBuild(twinProto, i & 1 ? DATA_B : DATA, kept);
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        {
            name: 'stage0',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            sink[i] = stage0Build(stage0Tpl, i & 1 ? DATA_B : DATA);
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'mikado',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            sink[i] = mikadoBuild(mikadoView, i & 1 ? DATA_B : DATA);
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            sink[i] = exodraBuild(i & 1 ? DATA_B : DATA);
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra·declared',
            reps: buildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(buildReps).fill(floorProto);
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            sink[i] = exodraDeclaredBuild(i & 1 ? DATA_B : DATA);
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra·mount',
            reps: buildReps,
            prep: () => {
                mountHost.textContent = '';
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++)
                            exodraMount(i & 1 ? DATA_B : DATA, mountHost);
                    },
                    cleanup: () => {
                        mountHost.textContent = '';
                    },
                };
            },
        },
        {
            name: 'insert',
            reps: buildReps,
            // THE COMMON ADDEND, PRICED ALONE. Every node here is built in the untimed `prep`, so
            // the region is one `appendChild` per node and nothing else. It is what separates
            // `exodra·mount` from `exodra`, and it is also the term the other three rows do NOT
            // carry — which is why it is a row and not a footnote.
            prep: () => {
                const nodes: Element[] = [];
                for (let i = 0; i < buildReps; i++)
                    nodes.push(floorKeepBuild(floorProto, DATA, []));
                const parent = document.createElement('div');
                return {
                    measure: () => {
                        for (let i = 0; i < buildReps; i++) parent.appendChild(nodes[i]);
                    },
                    cleanup: () => {
                        parent.textContent = '';
                        nodes.length = 0;
                    },
                };
            },
        },
    ];

    const buildRaw = new Map<string, number[]>();
    const builtTimes = runPhases(buildPhases, rounds, buildRaw);

    line('');
    line(
        `BUILD-NS — one filled node out of the already-compiled form [ns per node] · ` +
            `${buildReps} per region · interleaved · ${rounds} rounds · GC before every region`
    );
    line('IT IS A PER-INSTANCE COST. One node here is one whole 32-element tree, not one element.');
    line(
        'ONE FLOOR, AND IT IS THE ONE THAT KEEPS ITS ADDRESSES, because that is the job every ' +
            'row here does. A program that fills the same bytes and keeps NOTHING is doing a ' +
            'smaller job — it can never write into that node again — and it is not measured here ' +
            'at all: a table with two floors cannot say which one bounds it.'
    );
    line('                    reps    min       p25       median    p75       max');
    for (const p of buildPhases) {
        const s = builtTimes.get(p.name) as Stat;
        line(
            `${p.name.padEnd(16)}${String(p.reps).padStart(6)}   ${f1(ns(s.min)).padStart(8)}  ` +
                `${f1(ns(s.p25)).padStart(8)}  ${f1(ns(s.median)).padStart(8)}  ` +
                `${f1(ns(s.p75)).padStart(8)}  ${f1(ns(s.max)).padStart(8)}`
        );
    }

    // ═════════════════════════════════════════════════════════════════════════════════════
    // THE SHAPE TABLES — one per SUBJECT per PHASE, because a reader's question is "who wins on
    // MY shape" and rows of six subjects in one table is arithmetic they would have to do
    // themselves. The unit is in every section name because the recorder scrapes headers.
    // ═════════════════════════════════════════════════════════════════════════════════════

    const printTable = (
        section: string,
        headline: string,
        notes: readonly string[],
        phases: readonly Phase[],
        stats: Map<string, Stat>,
        show: (ms: number) => string
    ): void => {
        line('');
        line(`${section} — ${headline}`);
        for (const note of notes) line(note);
        line('                    reps    min       p25       median    p75       max');
        for (const p of phases) {
            const s = stats.get(p.name) as Stat;
            line(
                `${p.name.padEnd(16)}${String(p.reps).padStart(6)}   ${show(s.min).padStart(8)}  ` +
                    `${show(s.p25).padStart(8)}  ${show(s.median).padStart(8)}  ` +
                    `${show(s.p75).padStart(8)}  ${show(s.max).padStart(8)}`
            );
        }
    };

    const usOf = (ms: number): string => f4(us(ms));
    const nsOf = (ms: number): string => f1(ns(ms));

    /**
     * Every new table's compile rows have the same shape and differ in one call, so they are built
     * rather than written out five times per subject — a copy per row is a place for a batch or a
     * rotation to drift.
     *
     * THE VARIANT ARRIVES AS AN INDEX, NEVER AS A TOKEN TO BE LOOKED UP: an `indexOf` inside the
     * region would be a linear scan of 128 strings charged to whichever row happened to need it.
     * THE HOSTS ARE ALLOCATED IN `prep`, untimed, for the reason the card's mikado row allocates
     * its own: `mount` stamps the target, so one shared host would have every view in a region
     * writing over the last one's stamp — and allocating them inside the region would charge one
     * row an allocation no other row pays.
     */
    const compileOf = (
        name: string,
        reps: number,
        make: (variant: number, host: HTMLElement) => unknown
    ): Phase => ({
        name,
        reps,
        prep: () => {
            const hosts: HTMLElement[] = [];
            for (let i = 0; i < reps; i++) hosts.push(document.createElement('div'));
            const sink: unknown[] = new Array<unknown>(reps).fill(null);
            return {
                measure: () => {
                    for (let i = 0; i < reps; i++) sink[i] = make(i % VARIANTS, hosts[i]);
                },
                cleanup: () => {
                    sink.length = 0;
                    hosts.length = 0;
                    EXO_TOKEN = TOKENS[0];
                },
            };
        },
    });

    /** And every build row: N builds per region, DATA and DATA_B alternating, the nodes held for
     *  the life of the region so nothing is collected inside it. */
    const buildOf = (name: string, reps: number, make: (d: TCardData) => Element): Phase => ({
        name,
        reps,
        prep: () => {
            const sink: Element[] = new Array<Element>(reps).fill(floorProto);
            return {
                measure: () => {
                    for (let i = 0; i < reps; i++) sink[i] = make(i & 1 ? DATA_B : DATA);
                },
                cleanup: () => {
                    sink.length = 0;
                },
            };
        },
    });

    // ── TINY ────────────────────────────────────────────────────────────────────────────────
    const tinyCompileReps = TINY_COMPILE_REPS * factor;
    const tinyBuildReps = TINY_BUILD_REPS * factor;

    const tinyCompilePhases: readonly Phase[] = [
        compileOf('floor', tinyCompileReps, (v) => tinyFloorCompile(TOKENS[v])),
        compileOf('floor·twin', tinyCompileReps, (v) => tinyTwinCompile(TOKENS[v])),
        compileOf('stage0', tinyCompileReps, (v) => h(TINY_STAGE0_PIECES[v])),
        compileOf('mikado', tinyCompileReps, (v, host) =>
            mikadoCompile(TINY_MIKADO_MARKUP[v], host)
        ),
        compileOf('exodra', tinyCompileReps, (v) => tinyExodraCompile(TOKENS[v])),
        compileOf('exodra·declared', tinyCompileReps, (v) => tinyDeclaredCompile(TOKENS[v])),
    ];
    const tinyRaw = new Map<string, number[]>();
    const tinyCompiled = runPhases(tinyCompilePhases, rounds, tinyRaw);
    printTable(
        'TINY-COMPILE-US',
        `one 3-element template into its prepared form [µs per template] · interleaved · ` +
            `${rounds} rounds · GC before every region`,
        [
            'IT IS A FIXED COST: once per component for the life of a process, never per instance.',
            'THE ROW THAT MOVES HERE AND NOT ON THE CARD IS THE ONE WITH A PER-TEMPLATE CONSTANT ' +
                'in it — a table allocated, a writer chosen, a code generator invoked — because ' +
                'there is almost no tree for that constant to hide behind.',
        ],
        tinyCompilePhases,
        tinyCompiled,
        usOf
    );

    const tinyBuildPhases: readonly Phase[] = [
        {
            name: 'floor',
            reps: tinyBuildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(tinyBuildReps).fill(tinyProto);
                const kept: TTinyRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < tinyBuildReps; i++)
                            sink[i] = tinyFloorKeepBuild(tinyProto, i & 1 ? DATA_B : DATA, kept);
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        buildOf('floor·twin', tinyBuildReps, (d) => tinyTwinBuild(tinyTwinProto, d)),
        buildOf('stage0', tinyBuildReps, (d) => tinyStage0Build(tinyStage0Tpl, d)),
        buildOf('mikado', tinyBuildReps, (d) => mikadoBuild(tinyMikadoView, d)),
        buildOf('exodra', tinyBuildReps, tinyExodraBuild),
        buildOf('exodra·declared', tinyBuildReps, tinyDeclaredBuild),
    ];
    const tinyBuildRaw = new Map<string, number[]>();
    const tinyBuilt = runPhases(tinyBuildPhases, rounds, tinyBuildRaw);
    printTable(
        'TINY-BUILD-NS',
        `one filled 3-element node out of the already-compiled form [ns per node] · ` +
            `${tinyBuildReps} per region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A PER-INSTANCE COST. One node here is one whole 3-element tree.',
            'WHAT THIS TABLE IS FOR: the fixed terms — the record, the schema lookup, the first ' +
                'walk step, the data object applied before a clone — which are a few per cent of ' +
                'the card and most of this.',
        ],
        tinyBuildPhases,
        tinyBuilt,
        nsOf
    );

    // ── DEEP ────────────────────────────────────────────────────────────────────────────────
    const deepBuildReps = DEEP_BUILD_REPS * factor;

    const deepCompilePhases: readonly Phase[] = [
        compileOf('floor', compileReps, (v) => deepFloorCompile(TOKENS[v])),
        compileOf('floor·twin', compileReps, (v) => deepTwinCompile(TOKENS[v])),
        compileOf('stage0', compileReps, (v) => h(DEEP_STAGE0_PIECES[v])),
        compileOf('mikado', compileReps, (v, host) => mikadoCompile(DEEP_MIKADO_MARKUP[v], host)),
        compileOf('exodra', compileReps, (v) => deepExodraCompile(TOKENS[v])),
        compileOf('exodra·declared', compileReps, (v) => deepDeclaredCompile(TOKENS[v])),
    ];
    const deepCompileRaw = new Map<string, number[]>();
    const deepCompiled = runPhases(deepCompilePhases, rounds, deepCompileRaw);
    printTable(
        'DEEP-COMPILE-US',
        `one 28-element, 12-level template into its prepared form [µs per template] · ` +
            `${compileReps} per region · interleaved · ${rounds} rounds · GC before every region`,
        ['IT IS A FIXED COST: once per component for the life of a process, never per instance.'],
        deepCompilePhases,
        deepCompiled,
        usOf
    );

    const deepRaw = new Map<string, number[]>();
    const deepBuildPhases: readonly Phase[] = [
        {
            name: 'floor',
            reps: deepBuildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(deepBuildReps).fill(deepProto);
                const kept: TDeepRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < deepBuildReps; i++)
                            sink[i] = deepFloorKeepBuild(deepProto, i & 1 ? DATA_B : DATA, kept);
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        buildOf('exodra·clone', deepBuildReps, deepExodraCloneOnly),
        buildOf('exodra·clone+walk', deepBuildReps, deepExodraCloneWalk),
        buildOf('exodra·clone+record', deepBuildReps, deepExodraCloneRecord),
        buildOf('floor·twin', deepBuildReps, (d) => deepTwinBuild(deepTwinProto, d)),
        buildOf('stage0', deepBuildReps, (d) => deepStage0Build(deepStage0Tpl, d)),
        buildOf('mikado', deepBuildReps, (d) => mikadoBuild(deepMikadoView, d)),
        buildOf('exodra', deepBuildReps, deepExodraBuild),
        buildOf('exodra·declared', deepBuildReps, deepDeclaredBuild),
    ];
    const deepBuilt = runPhases(deepBuildPhases, rounds, deepRaw);
    printTable(
        'DEEP-BUILD-NS',
        `one filled 28-element, 12-level node [ns per node] · ${deepBuildReps} per region · ` +
            `interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A PER-INSTANCE COST. One node here is one whole 28-element chain.',
            'THE LADDER IS HERE AND NOT ONLY ON THE CARD BECAUSE THIS IS WHERE ITS SUBTRACTION ' +
                'SAYS SOMETHING NEW: the card walks mostly siblings, this walks a chain of ' +
                'alternating firstChild/nextSibling hops, and `clone+walk − clone` is the price ' +
                'of that difference.',
        ],
        deepBuildPhases,
        deepBuilt,
        nsOf
    );

    // ── PORT-DENSE ──────────────────────────────────────────────────────────────────────────
    const denseBuildReps = DENSE_BUILD_REPS * factor;

    const denseCompilePhases: readonly Phase[] = [
        compileOf('floor', compileReps, (v) => denseFloorCompile(TOKENS[v])),
        compileOf('floor·twin', compileReps, (v) => denseTwinCompile(TOKENS[v])),
        compileOf('stage0', compileReps, (v) => h(DENSE_STAGE0_PIECES[v])),
        compileOf('mikado', compileReps, (v, host) => mikadoCompile(DENSE_MIKADO_MARKUP[v], host)),
        compileOf('exodra', compileReps, (v) => denseExodraCompile(TOKENS[v])),
        compileOf('exodra·declared', compileReps, (v) => denseDeclaredCompile(TOKENS[v])),
    ];
    const denseCompileRaw = new Map<string, number[]>();
    const denseCompiled = runPhases(denseCompilePhases, rounds, denseCompileRaw);
    printTable(
        'DENSE-COMPILE-US',
        `one 32-element template with a port on EVERY element [µs per template] · ` +
            `${compileReps} per region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A FIXED COST: once per component for the life of a process, never per instance.',
            'READ IT AGAINST `COMPILE-US`: the same thirty-two elements with thirty-two ports ' +
                'instead of fifteen, so the difference between the two tables is what a PORT ' +
                'costs to compile, in every participant at once.',
        ],
        denseCompilePhases,
        denseCompiled,
        usOf
    );

    const denseRaw = new Map<string, number[]>();
    const denseBuildPhases: readonly Phase[] = [
        {
            name: 'floor',
            reps: denseBuildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(denseBuildReps).fill(denseProto);
                const kept: Node[][] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < denseBuildReps; i++)
                            sink[i] = denseFloorKeepBuild(denseProto, i & 1 ? DATA_B : DATA, kept);
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        buildOf('exodra·clone', denseBuildReps, denseExodraCloneOnly),
        buildOf('exodra·clone+walk', denseBuildReps, denseExodraCloneWalk),
        buildOf('exodra·clone+record', denseBuildReps, denseExodraCloneRecord),
        buildOf('floor·twin', denseBuildReps, (d) => denseTwinBuild(denseTwinProto, d)),
        buildOf('stage0', denseBuildReps, (d) => denseStage0Build(denseStage0Tpl, d)),
        buildOf('mikado', denseBuildReps, (d) => mikadoBuild(denseMikadoView, d)),
        buildOf('exodra', denseBuildReps, denseExodraBuild),
        buildOf('exodra·declared', denseBuildReps, denseDeclaredBuild),
    ];
    const denseBuilt = runPhases(denseBuildPhases, rounds, denseRaw);
    printTable(
        'DENSE-BUILD-NS',
        `one filled 32-element node with 32 ports [ns per node] · ${denseBuildReps} per region · ` +
            `interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A PER-INSTANCE COST. One node here is one whole 32-element tree, 32 values in it.',
            "THIS IS THE RUNG THE CARD LADDER COULD NOT REACH. The walk is the card's walk — the " +
                'same thirty-two elements, reached the same way — so `exodra − exodra·clone+walk` ' +
                'here against the same subtraction on the card is THIRTY-TWO writes against ' +
                'FIFTEEN, over an identical tree.',
        ],
        denseBuildPhases,
        denseBuilt,
        nsOf
    );

    // ── EVENTS ──────────────────────────────────────────────────────────────────────────────
    const eventBuildReps = EVENT_BUILD_REPS * factor;

    /** A build row that KEEPS the six row elements it wrote into, which is how every store in this
     *  table's ladder stays reachable after the region that made it: a program whose writes nothing
     *  can read is a program an optimiser is entitled to shorten. */
    const eventKeptOf = (
        name: string,
        make: (proto: Element, d: TCardData, into: TEventRefs[]) => Element
    ): Phase => ({
        name,
        reps: eventBuildReps,
        prep: () => {
            const sink: Element[] = new Array<Element>(eventBuildReps).fill(floorProto);
            const kept: TEventRefs[] = [];
            return {
                measure: () => {
                    for (let i = 0; i < eventBuildReps; i++)
                        sink[i] = make(floorProto, i & 1 ? DATA_B : DATA, kept);
                },
                cleanup: () => {
                    sink.length = 0;
                    kept.length = 0;
                },
            };
        },
    });

    const eventCompilePhases: readonly Phase[] = [
        compileOf('floor', compileReps, (v) => floorCompile(TOKENS[v])),
        compileOf('floor·twin', compileReps, (v) => twinCompile(TOKENS[v])),
        compileOf('stage0', compileReps, (v) => h(EVENT_STAGE0_PIECES[v])),
        compileOf('exodra·direct', compileReps, (v) => eventDirectCompile(TOKENS[v])),
        compileOf('exodra·delegated', compileReps, (v) => eventDelegatedCompile(TOKENS[v])),
        ...(mikadoRoute
            ? [
                  compileOf('mikado·route', compileReps, (v, host) =>
                      mikadoCompile(EVENT_MIKADO_MARKUP[v], host)
                  ),
              ]
            : []),
    ];
    const eventCompiled = runPhases(eventCompilePhases, rounds);
    printTable(
        'EVENTS-COMPILE-US',
        `the card's 32 elements plus 6 click ports, into its prepared form [µs per template] · ` +
            `${compileReps} per region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A FIXED COST: once per component for the life of a process, never per instance.',
            "THE FLOOR IS THE CARD'S COMPILE FLOOR UNCHANGED, and that is the finding rather " +
                'than an omission: a handler emits no markup and needs no placeholder, so a ' +
                "hand-written program preparing this template prepares exactly the card's tree " +
                'and pays NOTHING for six handlers at compile time.',
            'WHERE THE OTHERS PAY: stage0 records six more refs into its walk table, exodra asks ' +
                'its events pack for one DATUM per event port — the two slot key strings and the ' +
                "pack's listener — and files a refusal in the setter slot beside it (and the two " +
                'exodra rows differ ONLY in which pack), and mikado parses a route attribute and ' +
                'writes it onto the factory node.',
        ],
        eventCompilePhases,
        eventCompiled,
        usOf
    );

    const eventBuildPhases: readonly Phase[] = [
        {
            name: 'floor·direct',
            reps: eventBuildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(eventBuildReps).fill(floorProto);
                const kept: TEventRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < eventBuildReps; i++)
                            sink[i] = eventFloorDirectKeepBuild(
                                floorProto,
                                i & 1 ? DATA_B : DATA,
                                kept
                            );
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        {
            name: 'floor·twin',
            reps: eventBuildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(eventBuildReps).fill(twinProto);
                const kept: TEventRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < eventBuildReps; i++)
                            sink[i] = eventTwinDirectBuild(twinProto, i & 1 ? DATA_B : DATA, kept);
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        {
            name: 'floor·delegated',
            reps: eventBuildReps,
            prep: () => {
                const sink: Element[] = new Array<Element>(eventBuildReps).fill(floorProto);
                const kept: TEventRefs[] = [];
                return {
                    measure: () => {
                        for (let i = 0; i < eventBuildReps; i++)
                            sink[i] = eventFloorDelegatedBuild(
                                floorProto,
                                i & 1 ? DATA_B : DATA,
                                kept
                            );
                    },
                    cleanup: () => {
                        sink.length = 0;
                        kept.length = 0;
                    },
                };
            },
        },
        buildOf('stage0·direct', eventBuildReps, (d) => eventStage0DirectBuild(eventStage0Tpl, d)),
        buildOf('stage0·delegated', eventBuildReps, (d) =>
            eventStage0DelegatedBuild(eventStage0Tpl, d)
        ),
        buildOf('exodra·direct', eventBuildReps, eventDirectBuild),
        buildOf('exodra·delegated', eventBuildReps, eventDelegatedBuild),
        // THE LADDER. `buildOf` cannot serve the four hand-written rungs: each keeps the six row
        // elements it wrote into, and an array of those that nothing empties would grow by a
        // region's worth every round.
        eventKeptOf('floor·slots+on', eventFloorSlotsListenBuild),
        eventKeptOf('floor·served+on', eventFloorServedListenBuild),
        eventKeptOf('floor·on', eventFloorListenOnlyBuild),
        eventKeptOf('floor·slots', eventFloorSlotsOnlyBuild),
        eventKeptOf('floor·1slot+on', eventFloorOneSlotBuild),
        buildOf('exodra·merged', eventBuildReps, eventMergedBuild),
        buildOf('exodra·nowrite', eventBuildReps, eventNoWriteBuild),
        buildOf('exodra·oncopy', eventBuildReps, eventOnCopyBuild),
        buildOf('exodra·ports', eventBuildReps, eventPortsBuild),
        buildOf('exodra·ports12', eventBuildReps, eventPorts12Build),
        buildOf('exodra·ports24', eventBuildReps, eventPorts24Build),
        buildOf('exodra·ports@tail', eventBuildReps, eventPortsTailBuild),
        buildOf('exodra·twin', eventBuildReps, exodraTwinBuild),
        buildOf('exodra·noports', eventBuildReps, exodraBuild),
        ...(mikadoRoute
            ? [
                  buildOf('mikado·route', eventBuildReps, (d) =>
                      mikadoBuild(mikadoRouteView as TMikadoView, d)
                  ),
              ]
            : []),
    ];
    const eventRaw = new Map<string, number[]>();
    const eventBuilt = runPhases(eventBuildPhases, rounds, eventRaw);
    printTable(
        'EVENTS-BUILD-NS',
        `one filled node with SIX WORKING click handlers [ns per node] · ${eventBuildReps} per ` +
            `region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A PER-INSTANCE COST. One node here is the card plus six live handlers, and ' +
                'every row in this table was CLICKED six times before it was timed.',
            'TWO STRATEGIES, ONE TABLE. `·direct` puts the handler on the ELEMENT (exodra: two ' +
                'property stores and one shared listener per element; the floor: six ' +
                'module-level functions and six addEventListener). `·delegated` puts it on the ' +
                "ROOT (two property stores per row and nothing attached), and the root's " +
                'listener went on ONCE, outside every region.',
            "MIKADO'S ROW IS DOING A DIFFERENT AND SMALLER JOB, and that is the point of it: its " +
                'registration is a static route attribute on the factory node, so the clone ' +
                'carries it and the per-instance event cost is ZERO. What it cannot do is hold a ' +
                'handler that differs per instance, or any handler at all on the element — which ' +
                'is why it has no row in the direct half.',
            'THE FOURTEEN ROWS BELOW `exodra·delegated` ARE A LADDER AND NOT PARTICIPANTS. Each one ' +
                'is the row above it with exactly one term removed, so the differences between ' +
                'them are what six handlers are MADE OF — and every one of those differences is ' +
                "tested against this table's paired spread in the resolution block and refused by " +
                'name when it falls under it.',
            '`floor·slots+on` IS THE RUNG THE TABLE EXISTS FOR: the card, and per row the same two ' +
                'property stores the shipped direct `attach` makes, under the same two key ' +
                'strings, plus one addEventListener with a process-shared listener. No declaration, ' +
                "no schema, no Exodra. `floor·served+on` is that same program with the `attach`'s " +
                '"have I served this element before" read restored, which on a fresh clone is a ' +
                'miss.',
            'FIVE ROWS ATTACH NOTHING A CLICK CAN REACH AND ARE NOT TO BE READ AS WORKING. ' +
                '`floor·slots` writes the two slots and REGISTERS NO LISTENER, so a click on it ' +
                'runs nothing. `exodra·nowrite` fills all six event ports through an `attach` ' +
                'that WRITES NOTHING, so its nodes carry neither slot and no listener, and the ' +
                '`on`-copy row below it fills the same six ports through that same `attach`. ' +
                '`exodra·ports` DECLARES six event ports and never calls `c.on`, and ' +
                '`exodra·noports` is the CARD component, whose schema HAS NO EVENT PORTS at all. ' +
                'Each is gated on what it does claim — the slots read back, the slots read back ' +
                'empty, the port count read off the schema — and `floor·on`, which registers six ' +
                'listeners over an EMPTY slot and therefore ROUTES NO CLICK ANYWHERE, is gated ' +
                'on the shared listener being counted running six times and reaching no handler.',
            '`exodra·merged` IS WHAT THE TWO MERGED ROWS BELONG AGAINST, and it is the only row of ' +
                'this table that holds a MERGE and no strategy. It is `exodra·direct` again — the ' +
                'shipped direct pack by identity, the same wire, the same bytes, six live ' +
                'handlers — on a backend given a FURTHER `composeExoPlugins` pass after ' +
                'construction, with a plugin that replaces `fillDoors` by a wrapper deferring to ' +
                'it, a name no build calls. Every backend here was built BY that function — ' +
                "`ExoDomBackendBase`'s constructor merges the two vocabularies onto itself — so " +
                'what the rung holds is a SECOND pass over a surface that already has every ' +
                'name. `exodra·delegated` and `exodra·nowrite` are the only other rows that take ' +
                'one, so every term this table has taken against `exodra·direct` carried a ' +
                "merge AND a second compiled schema under a strategy's name; taken against this " +
                'row both cancel. What the row itself still carries is the second schema, which is ' +
                "the resolution block's `|exodra·noports − exodra·twin|` null. And it matters " +
                'beyond this axis: `composeExoPlugins` is how a plugin is composed at all — ' +
                '`withExoHydration` and every other surviving `with*` decorator go through it — ' +
                'so whatever this row holds, every page that composes anything holds.',
            'THE ROWS BETWEEN `exodra·nowrite` AND `exodra·noports` SPLIT THE ONE LUMP THOSE ' +
                "TWO LEAVE. `exodra·ports` is the event declaration filled by the CARD's wire, so " +
                'against `exodra·noports` it is six wider schema tables with no `c.on` anywhere, ' +
                'and against `exodra·nowrite` it is ' +
                "the six dispatches alone. `exodra·oncopy` is `on`'s body transcribed into this " +
                "file and called as a plain function, which leaves the SHIPPED `on`'s call " +
                'shape as the only difference between it and `exodra·nowrite`: it runs on ' +
                "`exodra·nowrite`'s own backend, so it shares that row's record shape and its " +
                'no-write `attach` exactly.',
            'AND TWO ROWS THIS TABLE NO LONGER HAS, both because the term they removed is no ' +
                'longer in the code they copied. `exodra·nojournal` was `exodra·oncopy` without ' +
                '`written[writes++] = index` and priced the per-fill journal alone; `@exodra/dom` ' +
                'no longer journals a fill — the store, the `written`/`writes` pair and the ' +
                'unfilled-port sweep that read them are gone. `exodra·noassert` was ' +
                '`exodra·oncopy` without `assertExoEventPort` and priced the port-kind compare ' +
                'alone; `@exodra/core` no longer exports that function, the fill doors narrow ' +
                'the port by TYPE — `on(port: TExoEventPort, …)` — so a typed program reaches no ' +
                'runtime compare. Each would now be `exodra·oncopy` under a second name. Neither ' +
                'term is measured here, and what earlier runs read for them is not carried ' +
                'forward.',
            "A RUNG CAN FALL UNDER THIS RUN'S RESOLUTION AND THAT IS STATED HERE RATHER THAN " +
                'DISCOVERED IN THE PRINTOUT. The paired spread this table refuses under is a ' +
                'figure for SIX ports at once, so a term smaller than a sixth of it cannot be ' +
                'seen at this repetition count and is refused by name in the resolution block. A ' +
                'refused rung is a BOUND — "under the spread, per six ports" — and never a zero, ' +
                'and a term that cannot be seen is a term that cannot be the occupant of the ' +
                'lump either.',
            '`exodra·nowrite − exodra·oncopy` IS HOW THE DOOR IS REACHED AND NOT WHAT IT DOES. ' +
                'The shipped `on` is a METHOD on a surface three record shapes share; the copy is ' +
                'a plain function in this file, called directly. Past that the two bodies are the ' +
                'same instructions — both load `schema.events.attach` off the same schema and call it ' +
                'with the same element, the same datum, the same handler and the same subject — ' +
                'so read the line as a bound on the CALL SHAPE, two sites in two files with one ' +
                'of them reached through a prototype, and not as a figure for method dispatch ' +
                'alone. WHAT IT NO LONGER HOLDS: this term was read as a POLYMORPHIC SETTER ' +
                'SITE, `schema.setters[index]` seeing three setters on the shipped side against one ' +
                "on the copy's. `on` does not read `schema.setters` at all any more, so that " +
                'difference is not in this pair and no rung of this table prices it.',
            'AND `exodra·noports` IS A ROW OF THIS TABLE RATHER THAN A LOOK ACROSS AT THE CARD ' +
                "one: it is the same program as the card table's `exodra`, sampled in THIS " +
                'rotation, because a difference taken between two tables is a difference between ' +
                'two regions, two batch sizes and two orders.',
            'THE FOUR ROWS AFTER `exodra·ports` SPLIT WHAT A PORT NOBODY FILLS COSTS, and the ' +
                'first thing they settle is that it is NOT A LANDING. `gateSchemaShape` printed ' +
                '`schema.slots` for every one of them above: the click port\'s `<li class="mc-row">` ' +
                'is already on the walk to its own `<span class="mc-v">`, so six declared ports ' +
                'add six rows to `setters`, `writeData` and `elem` and NOTHING to the walk. ' +
                '`exodra·ports12` and `exodra·ports24` are the same declaration with twelve and ' +
                'twenty-four such ports, so a term that is per-port doubles and quadruples along ' +
                'that row and a term that is per-ROW does not move at all.',
            '`exodra·twin` IS THE NULL FOR ALL OF IT AND IS NOT A PARTICIPANT. It is the CARD ' +
                'markup declared a second time, in a declaration and a schema of its own, with no ' +
                'event port anywhere and the card wire filling it — the same work as ' +
                '`exodra·noports` down to the call order, differing only in being a SECOND schema ' +
                'with a second prototype, a second set of setter closures and a later address in ' +
                'the heap. Its true difference from `exodra·noports` is zero. Whatever it reads is ' +
                'the price of being a second row, and it is subtracted out of the ports term ' +
                'rather than assumed to be nothing.',
            '`exodra·ports@tail` IS A BOUND ON A LANDING AND CANNOT BE A MEASUREMENT OF SIX. Of ' +
                'the thirty-two elements exactly ONE — `<span class="mc-tail">` — is not on the ' +
                'walk to some port, so this markup cannot be given six new landings at all: the ' +
                'rung moves the six click ports onto that one element and its schema carries ONE ' +
                'landing the others do not.',
            "WHAT IS EXPECTED TO FALL UNDER THIS RUN'S RESOLUTION IS SAID HERE AND NOT " +
                'DISCOVERED IN THE PRINTOUT. The paired spread refuses under a figure taken over ' +
                'SIX ports at once. `exodra·ports@tail − exodra·ports` is one walk triple and one ' +
                'store into `nodes` per build and will be refused by name; read it as "under the ' +
                'spread, for one landing", never as zero. `exodra·noports − exodra·twin` is a ' +
                'null and belongs under the spread — it appears in the resolution block with the ' +
                'other nulls rather than as a ladder rung. The two that CAN clear it are ' +
                '`exodra·ports12 − exodra·ports` and `exodra·ports24 − exodra·ports12`, and only ' +
                'if a declared port costs something per BUILD, which is the question.',
        ],
        eventBuildPhases,
        eventBuilt,
        nsOf
    );

    // ═════════════════════════════════════════════════════════════════════════════════════
    // THE UPDATE TABLE, AND THE SHELL-THEN-FILL TABLE. Both are the card subject.
    // ═════════════════════════════════════════════════════════════════════════════════════

    const updateReps = UPDATE_REPS * factor;

    /**
     * A region of updates needs a region of NODES to update, built untimed, each holding whatever
     * that participant keeps. `warm` is what separates `update¹` from the steady state: with it,
     * every node in the region has already been updated once and mikado's `create_path` is paid.
     *
     * EVERY TIMED WRITE CARRIES A VALUE THE NODE DOES NOT ALREADY HOLD, and that is not the same
     * arrangement as the build table's. A build alternates DATA and DATA_B because two successive
     * builds of one data set would let mikado's `if (!_o.c || _o.c._t !== _v)` compare and skip;
     * here the node's CURRENT contents are what the guard compares against, so alternating would
     * hand half the region a value it already has. The nodes are therefore built from DATA, warmed
     * (when warmed) with DATA_B, and the timed pass writes the OTHER one — fifteen values, all
     * fifteen different from what stands in the node, on every repetition of every row.
     */
    const updatePhase = <THeld>(
        name: string,
        build: (into: THeld[]) => void,
        update: (held: THeld, d: TCardData) => void,
        warm: boolean
    ): Phase => ({
        name,
        reps: updateReps,
        prep: () => {
            const held: THeld[] = [];
            for (let i = 0; i < updateReps; i++) build(held);
            if (warm) for (let i = 0; i < updateReps; i++) update(held[i], DATA_B);
            const writing = warm ? DATA : DATA_B;
            return {
                measure: () => {
                    for (let i = 0; i < updateReps; i++) update(held[i], writing);
                },
                cleanup: () => {
                    held.length = 0;
                },
            };
        },
    });

    const floorUpdatePhase = (name: string, warm: boolean): Phase =>
        updatePhase<TFloorRefs>(
            name,
            (into) => {
                floorKeepBuild(floorProto, DATA, into);
            },
            floorUpdate,
            warm
        );
    const twinUpdatePhase = (name: string, warm: boolean): Phase =>
        updatePhase<TFloorRefs>(
            name,
            (into) => {
                twinKeepBuild(twinProto, DATA, into);
            },
            twinUpdate,
            warm
        );
    const stage0UpdatePhase = (name: string, warm: boolean): Phase =>
        updatePhase<TStage0Kept>(
            name,
            (into) => {
                const refs: TStage0Refs[] = [];
                const node = stage0KeepBuild(stage0Tpl, DATA, refs);
                into.push({ node, refs: refs[0] });
            },
            stage0Update,
            warm
        );
    const mikadoUpdatePhase = (name: string, warm: boolean): Phase =>
        updatePhase<Element>(
            name,
            (into) => {
                into.push(mikadoBuild(mikadoView, DATA));
            },
            (node, d) => {
                mikadoView.update(node as HTMLElement, d);
            },
            warm
        );
    const exodraUpdatePhase = (name: string, warm: boolean): Phase =>
        updatePhase<TExodraKept>(
            name,
            (into) => {
                into.push(exodraKeepBuild(DATA));
            },
            exodraUpdate,
            warm
        );

    const updatePhases: readonly Phase[] = [
        floorUpdatePhase('floor·update¹', false),
        floorUpdatePhase('floor', true),
        twinUpdatePhase('floor·twin', true),
        stage0UpdatePhase('stage0·update¹', false),
        stage0UpdatePhase('stage0', true),
        mikadoUpdatePhase('mikado·update¹', false),
        mikadoUpdatePhase('mikado', true),
        exodraUpdatePhase('exodra·update¹', false),
        exodraUpdatePhase('exodra', true),
    ];
    const updated = runPhases(updatePhases, rounds);
    printTable(
        'UPDATE-NS',
        `fifteen new values into a node that already exists [ns per node] · ${updateReps} per ` +
            `region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'IT IS A PER-DATA-CHANGE COST, which is neither of the other two units in this file: ' +
                'a compile runs once per component, a build once per instance, and an update ' +
                'once per change. A list built once and updated on every keystroke pays this ' +
                'figure hundreds of times per build figure; a page of static cards never pays it.',
            'THE `·update¹` ROWS ARE THE FIRST UPDATE OF A FRESHLY BUILT NODE and the unsuffixed ' +
                "rows are the steady state. They are separate because mikado's clone does not " +
                'carry the resolved path its factory holds, so the first `update(node, data)` ' +
                'runs `create_path` — a string-keyed walk with a fresh array and cache object ' +
                '(`factory.js:110`) — and then STORES it on the node (`factory.js:95`), never ' +
                'to be paid again. One averaged row would have hidden the whole of that.',
            'EVERY OTHER ROW PAID ITS ADDRESSING AT BUILD TIME and writes through what it kept, ' +
                "which is what the BUILD table's floor was buying.",
            'EVERY TIMED WRITE CARRIES A VALUE THE NODE DOES NOT ALREADY HOLD — fifteen of ' +
                "fifteen, every repetition — because mikado's generated writer compares against " +
                'what stands in the node and a row that compared and skipped would be the ' +
                'fastest in the table. The nodes are built from one data set and written the ' +
                'other; there is no alternation inside a region here, and that is why.',
        ],
        updatePhases,
        updated,
        nsOf
    );
    refuse(
        'template-build UPDATE: a program that builds the same bytes and keeps NO addresses has ' +
            'no row in this table and cannot have one — its landings were locals and they are ' +
            'gone, so there is nothing to write through and nothing to walk from but the root. ' +
            'That is not a slow update, it is the ABSENCE of one, and it is the price of the ' +
            'cheapest possible build. It is also why the BUILD table above has exactly one ' +
            'floor, and why that floor is the one that keeps its addresses.'
    );

    // ── THE RE-FILL, WHICH IS THE OTHER HALF OF THE DIRECT `attach`'S GUARD ─────────────────
    //
    // It sits beside the update table because that is what it is: new values into a node that
    // already exists. What is new is WHICH values — a second handler and a second subject into six
    // elements that already carry both and are already listening.

    const refillReps = EVENT_REFILL_REPS * factor;

    /**
     * THE NODES ARE BUILT AND ALREADY SERVED BEFORE THE REGION OPENS, which is the whole point:
     * the guard's read HITS here, where on a fresh clone it misses.
     *
     * EVERY SAMPLE BUILDS ITS OWN NODES CARRYING THE FIRST SUBJECT SET AND THE REGION WRITES THE
     * SECOND, so every timed store lands on a slot holding a DIFFERENT object and no repetition
     * ever re-writes what it just wrote. That is the same defence the update rows take by building
     * from one data set and writing the other, and it is why the region writes each node once.
     */
    const refillPhase = (
        name: string,
        refill: (refs: TEventRefs, subjects: readonly TEventRowSubject[]) => void
    ): Phase => ({
        name,
        reps: refillReps,
        prep: () => {
            const held: TEventRefs[] = [];
            for (let i = 0; i < refillReps; i++) eventFloorSlotsListenBuild(floorProto, DATA, held);
            return {
                measure: () => {
                    for (let i = 0; i < refillReps; i++) refill(held[i], EVENT_ROW_SUBJECTS_B);
                },
                cleanup: () => {
                    held.length = 0;
                },
            };
        },
    });

    const refillPhases: readonly Phase[] = [
        refillPhase('floor', eventRefillSlots),
        refillPhase('floor·twin', eventRefillTwin),
        refillPhase('floor·served', eventRefillServed),
        refillPhase('floor·listen', eventRefillListen),
    ];
    const refillRaw = new Map<string, number[]>();
    const refilled = runPhases(refillPhases, rounds, refillRaw);
    printTable(
        'EVENT-REFILL-NS',
        `a SECOND handler and subject into six elements that already carry one [ns per node] · ` +
            `${refillReps} per region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'THE FIGURE BESIDE EVERY ROW HERE IS A RE-SUBSCRIPTION AND NOT A BUILD: no node is ' +
                'cloned, no tree is walked and no value is written — the six elements were built, ' +
                'filled and registered in `prep`, and the region re-points their handlers.',
            'THE FLOOR IS TWO STORES PER ROW AND NOTHING ELSE, because a hand-written program ' +
                're-pointing a handler knows its own listener is already on and has no reason to ' +
                'ask. `floor·served` is the shipped direct `attach` on this occasion — the ' +
                'present-property read, and the registration skipped because of it — and ' +
                '`floor·listen` is that same body with the guard deleted, which makes the ' +
                'registration unconditional and therefore a call the specification requires to ' +
                'do nothing, since the type, the callback OBJECT and the capture flag all repeat.',
            'SO THE TRADE IS `floor·served − floor` AGAINST `floor·listen − floor`, and the ' +
                'BUILD table holds the other half of it: there the read misses and the ' +
                'registration happens either way.',
        ],
        refillPhases,
        refilled,
        nsOf
    );
    refuse(
        'template-build EVENT-REFILL: there is no `exodra` row here and it is a MISSING DOOR ' +
            'rather than a slow one. Our event ports are re-filled by a wire running again, and a ' +
            'wire cannot be run without the build around it; the supported way to drive a port ' +
            'after the wire is `TExoFillDoors`, whose whole surface is `attr`, `text` and `html`. ' +
            'There is no `on`. So what the rows above price is the ATTACH BODIES the trade is ' +
            'between, measured hand-written, and what a re-fill costs through our own surface is ' +
            'UNMEASURED because it cannot presently be asked for.'
    );

    // ── SHELL, THEN FILL ────────────────────────────────────────────────────────────────────

    const shellPhase = <THeld>(
        name: string,
        build: (into: THeld[], d: TCardData) => void
    ): Phase => ({
        name,
        reps: updateReps,
        prep: () => {
            const held: THeld[] = [];
            return {
                measure: () => {
                    for (let i = 0; i < updateReps; i++) build(held, EMPTY);
                },
                cleanup: () => {
                    held.length = 0;
                },
            };
        },
    });

    const fillPhase = <THeld>(
        name: string,
        build: (into: THeld[], d: TCardData) => void,
        update: (held: THeld, d: TCardData) => void
    ): Phase => ({
        name,
        reps: updateReps,
        prep: () => {
            const held: THeld[] = [];
            for (let i = 0; i < updateReps; i++) build(held, EMPTY);
            return {
                measure: () => {
                    for (let i = 0; i < updateReps; i++) update(held[i], i & 1 ? DATA_B : DATA);
                },
                cleanup: () => {
                    held.length = 0;
                },
            };
        },
    });

    const floorShellBuild = (into: TFloorRefs[], d: TCardData): void => {
        floorKeepBuild(floorProto, d, into);
    };
    const twinShellBuild = (into: TFloorRefs[], d: TCardData): void => {
        twinKeepBuild(twinProto, d, into);
    };
    const stage0ShellBuild = (into: TStage0Kept[], d: TCardData): void => {
        const refs: TStage0Refs[] = [];
        const node = stage0KeepBuild(stage0Tpl, d, refs);
        into.push({ node, refs: refs[0] });
    };
    const mikadoShellBuild = (into: Element[], d: TCardData): void => {
        into.push(mikadoBuild(mikadoView, d));
    };
    const exodraShellBuild = (into: TExodraKept[], d: TCardData): void => {
        into.push(exodraKeepBuild(d));
    };

    const shellPhases: readonly Phase[] = [
        shellPhase<TFloorRefs>('floor·shell', floorShellBuild),
        fillPhase<TFloorRefs>('floor·fill¹', floorShellBuild, floorUpdate),
        shellPhase<TFloorRefs>('floor·twin·shell', twinShellBuild),
        fillPhase<TFloorRefs>('floor·twin·fill¹', twinShellBuild, twinUpdate),
        shellPhase<TStage0Kept>('stage0·shell', stage0ShellBuild),
        fillPhase<TStage0Kept>('stage0·fill¹', stage0ShellBuild, stage0Update),
        shellPhase<Element>('mikado·shell', mikadoShellBuild),
        fillPhase<Element>('mikado·fill¹', mikadoShellBuild, (node, d) => {
            mikadoView.update(node as HTMLElement, d);
        }),
        shellPhase<TExodraKept>('exodra·shell', exodraShellBuild),
        fillPhase<TExodraKept>('exodra·fill¹', exodraShellBuild, exodraUpdate),
        // A PARTICIPANT THE SHELL GATE DROPPED LOSES BOTH ITS ROWS AND NOT ONE: a fill figure
        // whose shell is a different tree is a figure of a different job.
    ].filter((p) => shellOk.has(p.name.replace(/·(shell|fill¹)$/, '')));
    const shelled = runPhases(shellPhases, rounds);
    printTable(
        'SHELL-NS',
        `the same tree built with EVERY port empty, then filled once [ns per node] · ` +
            `${updateReps} per region · interleaved · ${rounds} rounds · GC before every region`,
        [
            'READ THE SUM AND NOT EITHER HALF. The pattern this prices is render-the-skeleton-' +
                'now-values-later, and what it costs is `·shell` PLUS `·fill¹`; a participant ' +
                'can move work from one column to the other and a reader comparing one column ' +
                'gets the wrong answer. The sums are printed under the table.',
            'EMPTY IS A DEFINED STATE AND NOT AN ABSENT ONE: every port is written the empty ' +
                'string, which every participant here spells the same way — an empty Text node ' +
                '(serialising to nothing) and an attribute present with an empty value. Written ' +
                '`null` instead, exodra and mikado would REMOVE the attribute and the floor ' +
                'would write the word "null", which is three different trees and no comparison.',
            "THE `¹` IS THE SAME `¹` AS THE UPDATE TABLE'S: a fill is a first update, so mikado " +
                'pays `create_path` on the clone here too — on top of having applied the empty ' +
                'state to its factory before cloning it.',
            "AND MIKADO'S SHELL COLUMN IS A LOWER BOUND, WHICH CANNOT BE FIXED BY ROTATING. A " +
                'shell is EMPTY by definition, so every repetition in a region applies the same ' +
                'values — and mikado applies them to its FACTORY, whose path entries carry a ' +
                '`NodeCache` (`create_path` is called with `_use_cache` true whenever a factory ' +
                "exists), so its generated writer's `if (!_o.c || _o.c._t !== _v)` matches and " +
                'writes nothing after the first. That is its real behaviour for this pattern and ' +
                'not a defect in the measurement, but the figure is what it costs to SKIP fifteen ' +
                'writes, not to make them, and it must not be read as the latter. Every other row ' +
                'in this column writes unconditionally.',
        ],
        shellPhases,
        shelled,
        nsOf
    );

    const shMed = (name: string): number => (shelled.get(name) as Stat).median;
    line('');
    line('SHELL + FILL, THE SUM — which is what the pattern actually costs [ns per node]');
    for (const who of ['floor', 'floor·twin', 'stage0', 'mikado', 'exodra']) {
        if (!shellOk.has(who)) continue;
        const shell = shMed(`${who}·shell`);
        const fill = shMed(`${who}·fill¹`);
        line(
            `  ${who.padEnd(12)} ${nsOf(shell).padStart(9)} + ${nsOf(fill).padStart(9)} = ` +
                `${nsOf(shell + fill).padStart(9)}`
        );
    }

    // ═════════════════════════════════════════════════════════════════════════════════════
    // TABLE 3 — COMPILE FOR STRING OUTPUT. Microseconds per template, once per component.
    // ═════════════════════════════════════════════════════════════════════════════════════

    // The declarations the `exodra·plan` row compiles a schema FROM, built untimed so that the difference
    // between it and `exodra` is `createExoSchema` and nothing else. One per repetition, because
    // `exoStrSchemaOf` caches on the declaration and a second call on one of them would be a field load.
    const freshSchemas = (count: number): TExoMachine<never>[] => {
        const out: TExoMachine<never>[] = [];
        for (let i = 0; i < count; i++) {
            EXO_TOKEN = TOKENS[i % VARIANTS];
            out.push(machineOf(createExoSchema(exoShape)));
        }
        EXO_TOKEN = TOKENS[0];
        return out;
    };

    const serverCompilePhases: readonly Phase[] = [
        {
            name: 'floor',
            reps: piecesReps,
            prep: () => {
                const sink: string[][] = new Array<string[]>(piecesReps).fill(floorPieces);
                return {
                    measure: () => {
                        for (let i = 0; i < piecesReps; i++) {
                            sink[i] = strFloorPieces(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'floor·twin',
            reps: piecesReps,
            prep: () => {
                const sink: string[][] = new Array<string[]>(piecesReps).fill(floorPieces);
                return {
                    measure: () => {
                        for (let i = 0; i < piecesReps; i++) {
                            sink[i] = strTwinPieces(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra·plan',
            reps: compileReps,
            prep: () => {
                const schemas = freshSchemas(compileReps);
                const sink: TExoStrSchema[] = new Array<TExoStrSchema>(compileReps).fill(
                    EXO_STR_PLAN
                );
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = exoStrSchemaOf(schemas[i], EXO_STR_BACKEND);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                        schemas.length = 0;
                    },
                };
            },
        },
        {
            name: 'exodra',
            reps: compileReps,
            prep: () => {
                const sink: TExoStrSchema[] = new Array<TExoStrSchema>(compileReps).fill(
                    EXO_STR_PLAN
                );
                return {
                    measure: () => {
                        for (let i = 0; i < compileReps; i++) {
                            sink[i] = exodraStrCompile(TOKENS[i % VARIANTS]);
                        }
                    },
                    cleanup: () => {
                        sink.length = 0;
                        EXO_TOKEN = TOKENS[0];
                    },
                };
            },
        },
    ];

    const serverCompiled = runPhases(serverCompilePhases, rounds);

    line('');
    line(
        `SERVER-COMPILE-US — one 32-element template into its prepared form FOR STRING OUTPUT ` +
            `[µs per template] · interleaved · ${rounds} rounds · GC before every region`
    );
    line('IT IS A FIXED COST: once per component for the life of a process, never per request.');
    line(
        'THE BATCH DIFFERS BY ROW HERE AND IS IN THE `reps` COLUMN — the floor pair is one array ' +
            'literal and one concatenation, and at the batch the exodra rows use it would print ' +
            'the grain of the clock rather than a measurement.'
    );
    line('                    reps    min       p25       median    p75       max');
    for (const p of serverCompilePhases) {
        const s = serverCompiled.get(p.name) as Stat;
        line(
            `${p.name.padEnd(16)}${String(p.reps).padStart(6)}   ${f4(us(s.min)).padStart(8)}  ` +
                `${f4(us(s.p25)).padStart(8)}  ${f4(us(s.median)).padStart(8)}  ` +
                `${f4(us(s.p75)).padStart(8)}  ${f4(us(s.max)).padStart(8)}`
        );
    }

    // ═════════════════════════════════════════════════════════════════════════════════════
    // TABLE 4 — ASSEMBLE. Microseconds per document, once per request.
    // ═════════════════════════════════════════════════════════════════════════════════════

    /**
     * Every assemble row is this one function with two arguments changed, so the table cannot
     * contain two loops that differ in something nobody chose. `flatten` is the six-character tail
     * read that forces V8 to copy a cons-string: `+=` hands back a rope, and a rope is not a
     * document until something reads it. `floor·rope` is the one row that skips it.
     */
    const assemblePhase = (
        name: string,
        assemble: (d: TCardData) => string,
        flatten: boolean
    ): Phase => ({
        name,
        reps: assembleReps,
        prep: () => {
            const sink: string[] = new Array<string>(assembleReps).fill('');
            const tail = { of: '' };
            return {
                measure: () => {
                    for (let i = 0; i < assembleReps; i++) {
                        const html = assemble(i & 1 ? DATA_B : DATA);
                        if (flatten) tail.of = html.slice(-6);
                        sink[i] = html;
                    }
                },
                cleanup: () => {
                    sink.length = 0;
                    tail.of = '';
                },
            };
        },
    });

    const assemblePhases: readonly Phase[] = [
        assemblePhase('floor', strFloorAssemble, true),
        assemblePhase('floor·twin', strTwinAssemble, true),
        assemblePhase('floor·rope', strFloorAssemble, false),
        assemblePhase('exodra', exodraAssemble, true),
        assemblePhase('solid·ssr', solidAssemble, true),
        ...(solidRts ? [assemblePhase('solid', solidRenderToStringAssemble, true)] : []),
    ];

    const assembled = runPhases(assemblePhases, rounds);

    line('');
    line(
        `SERVER-ASSEMBLE-US — one whole document out of the already-compiled form ` +
            `[µs per document] · ${assembleReps} per region · interleaved · ${rounds} rounds · ` +
            'GC before every region'
    );
    line(
        'IT IS A PER-REQUEST COST. One document here is the whole 32-element card serialised, ' +
            'FLATTENED inside the region — except `floor·rope`, which prices the flatten by ' +
            'not paying it.'
    );
    line('                    reps    min       p25       median    p75       max');
    for (const p of assemblePhases) {
        const s = assembled.get(p.name) as Stat;
        line(
            `${p.name.padEnd(16)}${String(p.reps).padStart(6)}   ${f4(us(s.min)).padStart(8)}  ` +
                `${f4(us(s.p25)).padStart(8)}  ${f4(us(s.median)).padStart(8)}  ` +
                `${f4(us(s.p75)).padStart(8)}  ${f4(us(s.max)).padStart(8)}`
        );
    }

    // ── WHAT THIS RUN COULD TELL APART ───────────────────────────────────────────────────────

    const cMed = (name: string): number => (compiled.get(name) as Stat).median;
    const bMed = (name: string): number => (builtTimes.get(name) as Stat).median;
    const sMed = (name: string): number => (serverCompiled.get(name) as Stat).median;
    const aMed = (name: string): number => (assembled.get(name) as Stat).median;
    const compileNull = Math.abs(cMed('floor') - cMed('floor·twin'));
    const buildNull = Math.abs(bMed('floor') - bMed('floor·twin'));
    const serverCompileNull = Math.abs(sMed('floor') - sMed('floor·twin'));
    const assembleNull = Math.abs(aMed('floor') - aMed('floor·twin'));

    line('');
    line('RESOLUTION — two independently declared programs whose true difference is ZERO');
    line(
        `  compile  |floor − floor·twin| = ${f4(us(compileNull))} µs, which is ` +
            `${((compileNull / cMed('floor')) * 100).toFixed(1)}% of the floor`
    );
    line(
        `  build    |floor − floor·twin| = ${f1(ns(buildNull))} ns, which is ` +
            `${((buildNull / bMed('floor')) * 100).toFixed(1)}% of the floor`
    );
    line(
        `  srv·comp |floor − floor·twin| = ${f4(us(serverCompileNull))} µs, which is ` +
            `${((serverCompileNull / sMed('floor')) * 100).toFixed(1)}% of the floor`
    );
    line(
        `  assemble |floor − floor·twin| = ${f4(us(assembleNull))} µs, which is ` +
            `${((assembleNull / aMed('floor')) * 100).toFixed(1)}% of the floor`
    );
    line(
        '  THE TWO SERVER NULLS ARE WEAKER THAN THE TWO DOM ONES AND MUST BE READ AS SUCH: a ' +
            'straight-line concatenation and an array literal have no locals to name differently, ' +
            'so each pair is one expression compiled twice rather than two programs.'
    );

    // EVERY SUBJECT'S OWN NULL, in its own unit, because a difference read in one table against
    // another table's resolution is not read against anything.
    const nullOf = (stats: Map<string, Stat>, a: string, b: string): number =>
        Math.abs((stats.get(a) as Stat).median - (stats.get(b) as Stat).median);
    const subjectNulls: readonly [string, number, (ms: number) => string][] = [
        ['tiny·compile', nullOf(tinyCompiled, 'floor', 'floor·twin'), usOf],
        ['tiny·build', nullOf(tinyBuilt, 'floor', 'floor·twin'), nsOf],
        ['deep·compile', nullOf(deepCompiled, 'floor', 'floor·twin'), usOf],
        ['deep·build', nullOf(deepBuilt, 'floor', 'floor·twin'), nsOf],
        ['dense·compile', nullOf(denseCompiled, 'floor', 'floor·twin'), usOf],
        ['dense·build', nullOf(denseBuilt, 'floor', 'floor·twin'), nsOf],
        ['events·compile', nullOf(eventCompiled, 'floor', 'floor·twin'), usOf],
        ['events·build', nullOf(eventBuilt, 'floor·direct', 'floor·twin'), nsOf],
        ['update', nullOf(updated, 'floor', 'floor·twin'), nsOf],
        ['event·refill', nullOf(refilled, 'floor', 'floor·twin'), nsOf],
        ['shell', nullOf(shelled, 'floor·shell', 'floor·twin·shell'), nsOf],
    ];
    for (const [what, value, show] of subjectNulls) {
        line(`  ${what.padEnd(15)}|floor − floor·twin| = ${show(value)}`);
    }
    // AND THE ONE NULL THAT IS NOT TWO HAND-WRITTEN PROGRAMS. Every line above pairs two
    // straight-line functions; this one pairs two COMPILED SCHEMAS of the same markup, which is what
    // every exodra row in the events table is. It is the price of being a second row — a second
    // prototype to clone, a second set of setter closures, a later address in the heap — and it is
    // subtracted out of the ports term rather than assumed away.
    line(
        `  events·build   |exodra·noports − exodra·twin| = ` +
            `${nsOf(nullOf(eventBuilt, 'exodra·noports', 'exodra·twin'))}, the card markup ` +
            'compiled twice and built by one wire'
    );

    // AND THE NULL THE MEDIANS CANNOT GIVE. Two medians over quantised samples land on the same
    // grid step often enough that `|median − median|` reads EXACTLY ZERO, and a resolution of zero
    // is a claim that this run could separate any two programs — which would make every difference
    // in this file "resolved" by construction. The round-by-round difference of the same pair is
    // what the ladder rungs below are actually tested against.
    const deepPaired = pairedSpread(deepRaw, 'floor', 'floor·twin');
    const densePaired = pairedSpread(denseRaw, 'floor', 'floor·twin');
    line(
        `  deep·build   PAIRED |floor − floor·twin| per round: median ${nsOf(deepPaired.median)} ` +
            `ns, p75 ${nsOf(deepPaired.p75)} ns`
    );
    line(
        `  dense·build  PAIRED |floor − floor·twin| per round: median ${nsOf(
            densePaired.median
        )} ns, p75 ${nsOf(densePaired.p75)} ns`
    );
    // THE CARD'S OWN TWO TABLES AND THE TINY ONES GET THE SAME TREATMENT, because the two exodra
    // spellings are subtracted on all four and a subtraction needs the resolution of the table it
    // was taken in.
    const compilePaired = pairedSpread(compileRaw, 'floor', 'floor·twin');
    const cardBuildPaired = pairedSpread(buildRaw, 'floor', 'floor·twin');
    const tinyCompilePaired = pairedSpread(tinyRaw, 'floor', 'floor·twin');
    const tinyBuildPaired = pairedSpread(tinyBuildRaw, 'floor', 'floor·twin');
    const deepCompilePaired = pairedSpread(deepCompileRaw, 'floor', 'floor·twin');
    const denseCompilePaired = pairedSpread(denseCompileRaw, 'floor', 'floor·twin');
    line(
        `  card·compile PAIRED |floor − floor·twin| per round: median ` +
            `${usOf(compilePaired.median)} µs, p75 ${usOf(compilePaired.p75)} µs`
    );
    line(
        `  card·build   PAIRED |floor − floor·twin| per round: median ` +
            `${nsOf(cardBuildPaired.median)} ns, p75 ${nsOf(cardBuildPaired.p75)} ns`
    );
    line(
        `  tiny·compile PAIRED |floor − floor·twin| per round: median ` +
            `${usOf(tinyCompilePaired.median)} µs, p75 ${usOf(tinyCompilePaired.p75)} µs`
    );
    line(
        `  tiny·build   PAIRED |floor − floor·twin| per round: median ` +
            `${nsOf(tinyBuildPaired.median)} ns, p75 ${nsOf(tinyBuildPaired.p75)} ns`
    );
    line(
        `  deep·compile PAIRED |floor − floor·twin| per round: median ` +
            `${usOf(deepCompilePaired.median)} µs, p75 ${usOf(deepCompilePaired.p75)} µs`
    );
    line(
        `  dense·compile PAIRED |floor − floor·twin| per round: median ` +
            `${usOf(denseCompilePaired.median)} µs, p75 ${usOf(denseCompilePaired.p75)} µs`
    );
    const eventPaired = pairedSpread(eventRaw, 'floor·direct', 'floor·twin');
    const refillPaired = pairedSpread(refillRaw, 'floor', 'floor·twin');
    line(
        `  events·build PAIRED |floor·direct − floor·twin| per round: median ` +
            `${nsOf(eventPaired.median)} ns, p75 ${nsOf(eventPaired.p75)} ns`
    );
    // THE SAME FIGURE TAKEN OVER TWO OF OUR OWN ROWS, PRINTED BESIDE IT AND NOT SUBSTITUTED FOR IT.
    // Every rung in this table is still refused against `eventPaired`, because changing what the
    // refusals are read against would move every reading the table has ever printed. This one says
    // what the spread looks like between two rows that clone a prototype and run a wire, which is
    // the program class the ports rungs belong to.
    const eventExoPaired = pairedSpread(eventRaw, 'exodra·noports', 'exodra·twin');
    line(
        `  events·build PAIRED |exodra·noports − exodra·twin| per round: median ` +
            `${nsOf(eventExoPaired.median)} ns, p75 ${nsOf(eventExoPaired.p75)} ns`
    );
    line(
        `  event·refill PAIRED |floor − floor·twin| per round: median ` +
            `${nsOf(refillPaired.median)} ns, p75 ${nsOf(refillPaired.p75)} ns`
    );

    // THE LADDER'S OWN RESOLUTION, ASKED RATHER THAN ASSUMED. `clone+record − clone` is what an
    // instance record costs, and on the card subject those two rungs have stood about a hundred
    // nanoseconds apart — which is at the pair's own spread. The axis says so by name instead of
    // letting a reader take the subtraction for a measurement.
    const ladderCheck = (
        what: string,
        stats: Map<string, Stat>,
        spread: Stat,
        lo: string,
        hi: string,
        show: (ms: number) => string = nsOf,
        unit = 'ns'
    ): void => {
        const gap = Math.abs((stats.get(hi) as Stat).median - (stats.get(lo) as Stat).median);
        if (gap >= spread.p75) {
            line(
                `  ${what}: |${hi} − ${lo}| = ${show(gap)} ${unit}, above the paired spread's ` +
                    `p75 of ${show(spread.p75)} ${unit} — a reading`
            );
            return;
        }
        refuse(
            `template-build: the ${what} ladder DOES NOT RESOLVE what it is subtracting. ` +
                `|${hi} − ${lo}| came out ${show(gap)} ${unit} where two identically written ` +
                `programs differed by ${show(spread.p75)} ${unit} at p75 in this same run. Read ` +
                `it as "under ${show(spread.p75)} ${unit}", NOT as the number printed, and NOT ` +
                'as zero. Raising `batch` lengthens the region and does not shrink this: the ' +
                'spread is round-to-round variance, so `rounds` is the knob, and a rung this ' +
                'close may need a program that runs the two alternatives inside ONE region instead.'
        );
    };
    ladderCheck('deep·build', deepBuilt, deepPaired, 'exodra·clone', 'exodra·clone+record');
    ladderCheck('dense·build', denseBuilt, densePaired, 'exodra·clone', 'exodra·clone+record');
    ladderCheck('deep·build', deepBuilt, deepPaired, 'exodra·clone', 'exodra·clone+walk');
    ladderCheck('dense·build', denseBuilt, densePaired, 'exodra·clone', 'exodra·clone+walk');

    // EVERY DIFFERENCE THE TWO EVENT TABLES INVITE, ASKED AGAINST THEIR OWN PAIRED SPREAD. These
    // are the subtractions the block below prints, and a reader who takes one that was refused
    // here is taking a number this run could not see.
    ladderCheck('events·build', eventBuilt, eventPaired, 'floor·on', 'floor·slots+on');
    ladderCheck('events·build', eventBuilt, eventPaired, 'floor·slots', 'floor·slots+on');
    ladderCheck('events·build', eventBuilt, eventPaired, 'floor·1slot+on', 'floor·slots+on');
    ladderCheck('events·build', eventBuilt, eventPaired, 'floor·slots+on', 'floor·served+on');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·nowrite', 'exodra·direct');
    // THE COMPOSITION PAIR, AND THE SAME TERM WITH IT CANCELLED. The first is a merged backend
    // against an unmerged one with the strategy held fixed; the second is the line above re-taken
    // from the merged side, so the merge and the second schema stand on both sides of it.
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·direct', 'exodra·merged');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·nowrite', 'exodra·merged');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·noports', 'exodra·nowrite');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·noports', 'exodra·ports');
    // THE PORTS TERM WITH THE SECOND-ROW PRICE TAKEN OUT OF IT, and the two rungs that say whether
    // the term is per-port at all. `exodra·twin` is not in this list: its true difference from
    // `exodra·noports` is zero, so `ladderCheck` could only ever refuse it, and a null belongs in
    // the resolution block beside the other nulls.
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·twin', 'exodra·ports');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·ports', 'exodra·ports12');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·ports12', 'exodra·ports24');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·ports', 'exodra·ports@tail');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·ports', 'exodra·nowrite');
    ladderCheck('events·build', eventBuilt, eventPaired, 'exodra·oncopy', 'exodra·nowrite');
    ladderCheck('events·build', eventBuilt, eventPaired, 'floor·slots+on', 'exodra·direct');
    ladderCheck('event·refill', refilled, refillPaired, 'floor', 'floor·served');
    ladderCheck('event·refill', refilled, refillPaired, 'floor', 'floor·listen');
    ladderCheck('event·refill', refilled, refillPaired, 'floor·served', 'floor·listen');

    // THE TWO SPELLINGS OF EXODRA, ON EVERY TABLE THAT CARRIES BOTH. A declared row that comes out
    // cheaper than a minting one by less than its own table could see is NOT a finding, and the
    // block printed further down subtracts these same pairs — so each one is asked here first.
    ladderCheck('card·compile', compiled, compilePaired, 'exodra·declared', 'exodra', usOf, 'µs');
    ladderCheck('card·build', builtTimes, cardBuildPaired, 'exodra·declared', 'exodra');
    ladderCheck(
        'tiny·compile',
        tinyCompiled,
        tinyCompilePaired,
        'exodra·declared',
        'exodra',
        usOf,
        'µs'
    );
    ladderCheck('tiny·build', tinyBuilt, tinyBuildPaired, 'exodra·declared', 'exodra');
    ladderCheck(
        'deep·compile',
        deepCompiled,
        deepCompilePaired,
        'exodra·declared',
        'exodra',
        usOf,
        'µs'
    );
    ladderCheck('deep·build', deepBuilt, deepPaired, 'exodra·declared', 'exodra');
    ladderCheck(
        'dense·compile',
        denseCompiled,
        denseCompilePaired,
        'exodra·declared',
        'exodra',
        usOf,
        'µs'
    );
    ladderCheck('dense·build', denseBuilt, densePaired, 'exodra·declared', 'exodra');

    line('  Nothing below this is a difference this run measured.');

    // ── THE SUBTRACTIONS THE TABLES OWE THE READER ───────────────────────────────────────────

    line('');
    line("MIKADO'S COMPILE ROW CONTAINS ONE MIKADO BUILD — the subtraction, from this same run");
    line(
        `  mikado compile     ${f4(us(cMed('mikado'))).padStart(9)} µs   ` +
            'Mikado.compile + new Mikado({root}) + the first create'
    );
    line(
        `  mikado build       ${f4(us(bMed('mikado'))).padStart(9)} µs   ` +
            'the same create, steady state, from the BUILD table'
    );
    line(
        `  difference         ${f4(us(cMed('mikado') - bMed('mikado'))).padStart(9)} µs   ` +
            'the parse, the TemplateDOM walk, the Function() codegen and the factory'
    );

    const replica = bMed('exodra') + bMed('insert');
    const shipped = bMed('exodra·mount');
    line('');
    line('THE EXODRA REPLICA, CHECKED AGAINST THE SHIPPED ENTRY POINT');
    line(
        `  exodra + insert    ${f1(ns(replica)).padStart(9)} ns   ` +
            'the three lines of mountExoInstance, plus one appendChild'
    );
    line(`  exodra·mount       ${f1(ns(shipped)).padStart(9)} ns   mountExoInstance, whole`);
    line(
        `  difference         ${f1(ns(shipped - replica)).padStart(9)} ns   ` +
            "mountExoInstance's EXO_ARMED_INSTANCE save/restore and its live check, plus whatever the " +
            'run could not resolve'
    );

    // ── WHAT A DECLARATION BUYS THE COMPILER ─────────────────────────────────────────────────

    const medOf = (stats: Map<string, Stat>, name: string): number =>
        (stats.get(name) as Stat).median;

    line('');
    line('DECLARED PORTS AGAINST MINTED ONES — the same markup, compiled two ways, this same run');
    line(
        `  exodra             ${usOf(cMed('exodra')).padStart(9)} µs   ` +
            'the card, its fifteen ports MINTED by the calls that place them'
    );
    line(
        `  exodra·declared    ${usOf(cMed('exodra·declared')).padStart(9)} µs   ` +
            'the same fifteen handed their numbers by `exoPorts` first — and that call is INSIDE ' +
            'the timed region'
    );
    line(
        `  difference         ${usOf(cMed('exodra') - cMed('exodra·declared')).padStart(9)} µs   ` +
            'what it costs the compiler NOT to know the port count before it starts'
    );
    line(
        '  WHAT THE MINTING ROW PAYS AND THE DECLARED ONE DOES NOT: `compileExoDomSchema` sizes its ' +
            'port-indexed tables from `schema.declaredPorts`, which is ZERO for a markup that ' +
            'mints, so `elem` and `ownsElement` start empty and `widen` reallocates and COPIES ' +
            'both, 0 → 4 → 8 → 16, on the way to fifteen; `trim` then takes a subarray of each to ' +
            'cut the sixteenth slot off. Declared, both are allocated once at fifteen and the ' +
            'trim returns without touching them. The six child-list tables move in NEITHER row — ' +
            'this subject has no children port, so they stand at the shared empty sentinel, and ' +
            'the eight-table figure belongs to a template that has one. Beside the tables the ' +
            'minting markup also builds the six-element array and the fifteen-field record it ' +
            'needs to carry its captures back out.'
    );
    line(
        '  AND WHAT THE DECLARED ROW PAYS THAT THE MINTING ONE DOES NOT, because a subtraction ' +
            'quoted one-way is a subtraction with a thumb on it: `exoPorts` walks the fifteen ' +
            'marks and builds a record around them, `createExoSchema` walks the declaration again ' +
            "to seat each port at its own number in the schema's list, and the markup is reached " +
            'through a closure made per compile where the minting row passes a module-level ' +
            'function. The fifteen PORT OBJECTS themselves cancel: both rows allocate fifteen ' +
            'inside their own region, the minting one inside the compiler and the declared one ' +
            'inside `exoPorts`.'
    );
    line(
        `  build              ${nsOf(bMed('exodra') - bMed('exodra·declared')).padStart(9)} ns   ` +
            'the same subtraction on the BUILD table, and it is a CONTROL: both schemas hold ' +
            'exact-length tables by the time an instance is made, so nothing above is paid twice ' +
            'and this pair should sit inside the resolution printed for it further up.'
    );
    line('  The same pair on the other three shapes, each against its own subject:');
    line(
        `    tiny   compile ${usOf(medOf(tinyCompiled, 'exodra')).padStart(9)} → ` +
            `${usOf(medOf(tinyCompiled, 'exodra·declared')).padStart(9)} µs   build ` +
            `${nsOf(medOf(tinyBuilt, 'exodra')).padStart(8)} → ` +
            `${nsOf(medOf(tinyBuilt, 'exodra·declared')).padStart(
                8
            )} ns   ONE port, so ONE widening`
    );
    line(
        `    deep   compile ${usOf(medOf(deepCompiled, 'exodra')).padStart(9)} → ` +
            `${usOf(medOf(deepCompiled, 'exodra·declared')).padStart(9)} µs   build ` +
            `${nsOf(medOf(deepBuilt, 'exodra')).padStart(8)} → ` +
            `${nsOf(medOf(deepBuilt, 'exodra·declared')).padStart(8)} ns   four ports, one widening`
    );
    line(
        `    dense  compile ${usOf(medOf(denseCompiled, 'exodra')).padStart(9)} → ` +
            `${usOf(medOf(denseCompiled, 'exodra·declared')).padStart(9)} µs   build ` +
            `${nsOf(medOf(denseBuilt, 'exodra')).padStart(8)} → ` +
            `${nsOf(medOf(denseBuilt, 'exodra·declared')).padStart(8)} ns   thirty-two ports, ` +
            'FOUR widenings — 0 → 4 → 8 → 16 → 32'
    );
    refuse(
        'template-build: the EVENTS and SHELL subjects have NO declared row, and that is a gap ' +
            'and not a finding. EVENTS carries TWO exodra compile rows already — direct and ' +
            'delegated — over a build ladder whose every rung is gated by a dispatched click, so ' +
            'a declared twin there is a second pack, a second set of gate rows and a second ' +
            'refill pair; SHELL is a PAIR of rows, an empty build and the fill after it, and a ' +
            'declared twin doubles both. Neither is the one extra row the other four subjects ' +
            'took. So what a declaration is worth on a template carrying EVENT ports, and what ' +
            'it is worth to the shell pattern, are unmeasured here.'
    );

    // ── WHERE SIX HANDLERS GO ────────────────────────────────────────────────────────────────
    //
    // Every figure below is a difference between two rows of ONE table, sampled in one rotation,
    // and every one of them was asked against that table's paired spread above. The per-handler
    // column is the same number divided by six and carries no extra claim.

    const eMed = (name: string): number => (eventBuilt.get(name) as Stat).median;
    const rMed = (name: string): number => (refilled.get(name) as Stat).median;
    /** `per` is what the difference is spread over, and it is not six for every line in the block:
     *  a rung that adds twelve ports or one landing divides by twelve or by one, and a "ns each"
     *  column taken over the wrong count is a per-unit figure for a unit nobody measured. */
    const termPer = (label: string, gap: number, per: number, what: string): void => {
        line(
            `  ${label.padEnd(32)}${f1(ns(gap)).padStart(9)} ns   ` +
                `${f1(ns(gap) / per).padStart(7)} ns each   ${what}`
        );
    };
    const term = (label: string, gap: number, what: string): void => {
        termPer(label, gap, ROWS, what);
    };

    line('');
    line(
        'WHERE SIX HANDLERS GO — every term a difference between two rows of the EVENTS-BUILD ' +
            'table [ns per node, and per handler]'
    );
    term(
        'floor·slots+on − floor·on',
        eMed('floor·slots+on') - eMed('floor·on'),
        'the two property stores, hand-written, under the shipped key strings'
    );
    term(
        'floor·slots+on − floor·slots',
        eMed('floor·slots+on') - eMed('floor·slots'),
        'the addEventListener, with a listener object shared process-wide'
    );
    term(
        'floor·slots+on − floor·1slot+on',
        eMed('floor·slots+on') - eMed('floor·1slot+on'),
        'ONE store of the two — the pair object was allocated at module load, which our `attach` ' +
            'cannot do'
    );
    term(
        'floor·served+on − floor·slots+on',
        eMed('floor·served+on') - eMed('floor·slots+on'),
        "the direct `attach`'s `served` read on a FRESH clone, where the slot is absent"
    );
    term(
        'exodra·direct − exodra·nowrite',
        eMed('exodra·direct') - eMed('exodra·nowrite'),
        "the SAME work inside our path: the direct pack's `attach` — its guard, its two stores and " +
            'its registration'
    );
    term(
        'exodra·merged − exodra·direct',
        eMed('exodra·merged') - eMed('exodra·direct'),
        'COMPOSING A PLUGIN, WITH NO STRATEGY IN IT ANYWHERE — one FURTHER `composeExoPlugins` pass ' +
            'after construction (the constructor runs one either way) that replaces `fillDoors` ' +
            'by a wrapper deferring to it, a name no build calls, on a ' +
            'backend whose events pack is the shipped direct constant by identity. The gate above ' +
            "read both backends' own keys off and they are the same keys in the same order, so " +
            'what the merge did was STORE INTO AN EXISTING FIELD of the object that is the ' +
            'prototype of every record built against it. It still carries the price of being a ' +
            "SECOND COMPILED SCHEMA, which is the resolution block's " +
            '`|exodra·noports − exodra·twin|` null, and it is the same price the two rows below ' +
            'carry. `composeExoPlugins` is the shipped way to compose anything, `withExoHydration` ' +
            'included, so this line is paid by every page that composes at all.'
    );
    term(
        'exodra·merged − exodra·nowrite',
        eMed('exodra·merged') - eMed('exodra·nowrite'),
        "THE DIRECT `attach`'S BODY WITH THE MERGE CANCELLED — the line four above this one taken " +
            'from a MERGED direct row instead of the plain one, so a merge and a second schema now ' +
            'stand on both sides of it and neither is in the difference. Read it against that ' +
            'line: the two agreeing says the merge is not in either, and the two disagreeing says ' +
            "the earlier reading was carrying composition under the `attach`'s name."
    );
    term(
        'exodra·nowrite − exodra·noports',
        eMed('exodra·nowrite') - eMed('exodra·noports'),
        'six event ports before any `attach` runs — six rows in every port-indexed table and ' +
            'six `c.on` calls, each of which is two port-table loads (`schema.elem` and ' +
            '`schema.writeData`), an element load out of `this.nodes`, two field loads to reach ' +
            '`schema.events.attach`, and the call. It is all of that and not dispatch alone, and ' +
            'the lines under it are that lump taken apart one term at a time.'
    );
    term(
        'exodra·ports − exodra·noports',
        eMed('exodra·ports') - eMed('exodra·noports'),
        'THE PORTS THEMSELVES, WITH NO `c.on` IN THE WIRE AT ALL — six more rows in `setters`, ' +
            '`writeData` and `elem`, and NOT one more landing: the gate above counted ' +
            "`schema.slots` on both schemas and they are equal. It also carries the SECOND ROW'S own " +
            'price, which the next line takes out.'
    );
    term(
        'exodra·ports − exodra·twin',
        eMed('exodra·ports') - eMed('exodra·twin'),
        'THE SAME SIX PORTS AGAINST A SECOND SCHEMA OF THE CARD instead of against the first — the ' +
            'ports term with the price of being a second compiled schema cancelled on both sides'
    );
    termPer(
        'exodra·ports12 − exodra·ports',
        eMed('exodra·ports12') - eMed('exodra·ports'),
        ROWS,
        'SIX MORE PORTS ON THE SAME LANDINGS, twelve against six. Read it against the line above ' +
            'it: equal means the cost is per port, near zero means the earlier line was never ' +
            'about the ports'
    );
    termPer(
        'exodra·ports24 − exodra·ports12',
        eMed('exodra·ports24') - eMed('exodra·ports12'),
        ROWS * 2,
        'TWELVE MORE, twenty-four against twelve — twice the step above it if the term is linear ' +
            'in the port count, and the "each" column is over TWELVE ports here'
    );
    termPer(
        'exodra·ports@tail − exodra·ports',
        eMed('exodra·ports@tail') - eMed('exodra·ports'),
        1,
        'ONE LANDING, and it is one because this markup has exactly one element nothing else ' +
            'addresses: the same six ports moved onto `<span class="mc-tail">`, so the schema walks ' +
            'one more triple and stores one more node per build'
    );
    term(
        'exodra·nowrite − exodra·ports',
        eMed('exodra·nowrite') - eMed('exodra·ports'),
        'THE SIX DISPATCHES, over the same schema: six `c.on` calls, each two port-table loads ' +
            '(`schema.elem` and `schema.writeData`), an element load out of `this.nodes`, two field ' +
            'loads to reach `schema.events.attach`, and the call'
    );
    term(
        'exodra·nowrite − exodra·oncopy',
        eMed('exodra·nowrite') - eMed('exodra·oncopy'),
        'HOW THE DOOR IS REACHED: the shipped `on` as a METHOD on a surface three record shapes ' +
            'share, against a plain call to a copy of its body in this file. Past the call both ' +
            'load `schema.events.attach` off the same schema and hand it the same element, datum, ' +
            'handler and subject, so this is a bound on the CALL SHAPE and not a figure for ' +
            'method dispatch alone'
    );
    refuse(
        'template-build EVENTS: THE POLYMORPHIC SETTER SITE STOOD IN THE TERM ABOVE AND IS GONE ' +
            'FROM IT. That line was read as `schema.setters[index]` seeing three setters on the ' +
            "shipped side against one on the copy's, and `@exodra/dom`'s `on` does not read " +
            "`schema.setters` any more: it calls the events pack's one `attach` through " +
            '`schema.events`, and the copy calls that same function through that same field, so the ' +
            'two sites load the same thing and the pair cannot hold a difference between their ' +
            'setter shapes. What the pair still prices is printed above it. The polymorphic ' +
            'setter site is UNMEASURED in this table, and what earlier runs printed for this term ' +
            'was taken under a dispatch that no longer exists.'
    );
    refuse(
        'template-build EVENTS: `exodra·oncopy − exodra·noassert` STOOD HERE and is gone, ' +
            'with the rung under it. `exodra·noassert` was `exodra·oncopy` with ' +
            '`assertExoEventPort` removed, and that was the whole of the difference between ' +
            'them; `@exodra/core` no longer exports the function, the fill doors narrow the port ' +
            'by TYPE instead — `on(port: TExoEventPort, …)` — and a runtime kind compare that a ' +
            'typed program cannot reach is not a term a rung can remove. Written today the two ' +
            'rungs would be one program under two names and the subtraction a guaranteed zero ' +
            'wearing the shape of a measurement. So the port-kind compare is UNMEASURED in this ' +
            'table, and what earlier runs printed for it is not carried forward.'
    );
    term(
        'exodra·direct − floor·slots+on',
        eMed('exodra·direct') - eMed('floor·slots+on'),
        'WHAT WE COST AROUND THE SAME PLATFORM WORK, both rows building the same bytes and ' +
            'storing the same two names'
    );
    line(
        '  READ THE FIRST FOUR AS THE PLATFORM AND EVERY LINE UNDER THEM AS US. If `floor·slots+on` ' +
            'stands near `exodra·direct`, six handlers cost what two named properties on an ' +
            "Element cost and our packs add little; if it stands near this table's " +
            '`floor·direct`, the cost is in our path and the ladder says which rung of it.'
    );

    line('');
    line(
        "THE DIRECT `attach`'S GUARD, PRICED ON BOTH OCCASIONS — a read it makes on every fill, " +
            'against a call it makes instead [ns per node, and per handler]'
    );
    term(
        'build:  served+on − slots+on',
        eMed('floor·served+on') - eMed('floor·slots+on'),
        'what the guard costs on a FRESH clone, where its read misses and the registration ' +
            'happens anyway'
    );
    term(
        'refill: floor·served − floor',
        rMed('floor·served') - rMed('floor'),
        'what the guard costs on a RE-FILL, where its read hits'
    );
    term(
        'refill: floor·listen − floor',
        rMed('floor·listen') - rMed('floor'),
        'what it buys there: the repeat addEventListener the specification makes a no-op'
    );
    line(
        '  THE TRADE IS THE LAST TWO AGAINST EACH OTHER, and the first is what it costs to hold ' +
            'it. A component whose ports are filled once per instance and never again pays only ' +
            'the build line; one whose wire runs again on the same elements pays the refill line ' +
            'instead of the no-op call.'
    );

    line('');
    line('OUR SERVER COMPILE CONTAINS ONE DECLARATION BUILD — the subtraction, from this same run');
    line(
        `  exodra             ${f4(us(sMed('exodra'))).padStart(9)} µs   ` +
            'createExoSchema(build) then exoStrSchemaOf(schema, backend)'
    );
    line(
        `  exodra·plan        ${f4(us(sMed('exodra·plan'))).padStart(9)} µs   ` +
            'the same schema compile, off a declaration built untimed'
    );
    line(
        `  difference         ${f4(us(sMed('exodra') - sMed('exodra·plan'))).padStart(9)} µs   ` +
            'createExoSchema alone — the half `schema-build` prices on its own, and the half the DOM ' +
            'compile row above pays as well, so it must not be counted twice'
    );

    const flattenCost = aMed('floor') - aMed('floor·rope');
    line('');
    line('THE FLATTEN, PRICED IN THIS RUN RATHER THAN QUOTED FROM ANOTHER');
    line(
        `  floor              ${f4(us(aMed('floor'))).padStart(9)} µs   ` +
            'straight-line, escaped, tail read'
    );
    line(
        `  floor·rope         ${f4(us(aMed('floor·rope'))).padStart(9)} µs   ` +
            'the SAME function with only the tail read removed'
    );
    line(
        `  difference         ${f4(us(flattenCost)).padStart(9)} µs   ` +
            'one flatten of this document. Every other row on that table carries it too, which ' +
            'compresses every ratio the table prints towards 1.'
    );

    if (solidRts) {
        const wrapper = aMed('solid') - aMed('solid·ssr');
        line('');
        line("SOLID'S ENTRY POINT CONTAINS ONE ASSEMBLY — the subtraction, from this same run");
        line(
            `  solid              ${f4(us(aMed('solid'))).padStart(9)} µs   ` +
                'renderToString(code) — the shipped per-request entry point'
        );
        line(
            `  solid·ssr          ${f4(us(aMed('solid·ssr'))).padStart(9)} µs   ` +
                'the ssr() call alone, from the same table'
        );
        line(
            `  difference         ${f4(us(wrapper)).padStart(9)} µs   ` +
                'a createRoot, a seroval Serializer, a setTimeout, a serializer.close() and the ' +
                'asset/script injections (server.js:168). No other row on that table carries a ' +
                'per-request wrapper, which is why this is a row and not a footnote.'
        );
    }

    // ── THE ANSWER LINES ─────────────────────────────────────────────────────────────────────

    /** The comparable rows in order, and exodra is in it TWICE because the two spellings are two
     *  different amounts of work and a reader choosing one needs to see both ranked. `floor·twin`,
     *  `exodra·mount` and `insert` are left out deliberately: the first is the null, the second is
     *  a self-check on exodra's spelling, and the last is a control. None of the three is a
     *  participant. */
    const FIELD: readonly string[] = ['floor', 'stage0', 'mikado', 'exodra', 'exodra·declared'];
    const ranked = (med: (n: string) => number, show: (n: number) => string): string =>
        [...FIELD]
            .sort((a, b) => med(a) - med(b))
            .map((n) => `${n} ${show(med(n))}`)
            .join(' · ');

    line('');
    line(`COMPILE, ranked [µs per template] — ${ranked(cMed, (x) => f4(us(x)))}`);
    line(
        `  Against the floor: stage0 ${(cMed('stage0') / cMed('floor')).toFixed(2)}× · ` +
            `mikado ${(cMed('mikado') / cMed('floor')).toFixed(2)}× · ` +
            `exodra ${(cMed('exodra') / cMed('floor')).toFixed(2)}× · ` +
            `exodra·declared ${(cMed('exodra·declared') / cMed('floor')).toFixed(2)}×. The floor ` +
            'is a parse plus twelve appended Text nodes and NOTHING ELSE — it produces a ' +
            'prototype with no addressing table of any kind, so it is a bound on the parse and ' +
            'not on the job.'
    );
    line(`BUILD, ranked [ns per node] — ${ranked(bMed, (x) => f1(ns(x)))}`);
    line(
        `  Against the floor: stage0 ${(bMed('stage0') / bMed('floor')).toFixed(2)}× · ` +
            `mikado ${(bMed('mikado') / bMed('floor')).toFixed(2)}× · ` +
            `exodra ${(bMed('exodra') / bMed('floor')).toFixed(2)}× · ` +
            `exodra·declared ${(bMed('exodra·declared') / bMed('floor')).toFixed(2)}×. Every row ` +
            'here builds the same bytes and none of them inserts, so the ranking is of template ' +
            'machinery alone.'
    );

    /** The server assemble field. `floor·twin` is the null, `floor·rope` is a control on the
     *  flatten, and `solid` is the entry point whose assembly `solid·ssr` already is. */
    const SERVER_FIELD: readonly string[] = ['floor', 'exodra', 'solid·ssr'];
    line('');
    line(
        `SERVER COMPILE, ranked [µs per template] — floor ${f4(us(sMed('floor')))} · ` +
            `exodra·plan ${f4(us(sMed('exodra·plan')))} · exodra ${f4(us(sMed('exodra')))}`
    );
    line(
        `  Against the floor: exodra ${(sMed('exodra') / sMed('floor')).toFixed(2)}×. THE FIELD ` +
            'IS ONE PARTICIPANT AND THAT IS THE FINDING: solid and marko both produce this list ' +
            'of pieces at BUILD time, stage0 and mikado cannot produce one at all in this ' +
            'process, and the floor obtains it by having written it down. We are the only ' +
            'participant here that pays for a prepared form at run time, once per component.'
    );
    line(
        '  AND THE FLOOR ROW IS A BOUND ON OBTAINING THE PIECES, NOT ON THE JOB: it is one array ' +
            'literal and one concatenation, it derives nothing from a schema, it builds no writer ' +
            'table, and its attribute heads are baked so it cannot remove an absent attribute. ' +
            'The ratio beside it is the price of deriving a template rather than writing one.'
    );
    line(
        `SERVER ASSEMBLE, ranked [µs per document] — ${[...SERVER_FIELD]
            .sort((a, b) => aMed(a) - aMed(b))
            .map((n) => `${n} ${f4(us(aMed(n)))}`)
            .join(' · ')}`
    );
    line(
        `  Against the floor: exodra ${(aMed('exodra') / aMed('floor')).toFixed(2)}× · ` +
            `solid·ssr ${(aMed('solid·ssr') / aMed('floor')).toFixed(2)}×` +
            (solidRts ? ` · solid ${(aMed('solid') / aMed('floor')).toFixed(2)}×` : '') +
            '. Every row assembles the SAME bytes as every DOM row above builds, gated character ' +
            'for character, and every row rotates two data sets and is gated on the two answers ' +
            'differing — so no row here is serving a cache.'
    );
    line(
        '  READ THE SOLID ROWS WITH THEIR ESCAPER IN MIND: `escape` covers `<` and `&`, or `"` ' +
            'and `&` for an attribute, where `escapeExoText` also covers `>` and U+00A0 and ' +
            "`escapeExoAttributeValue` those plus `<`. On this subject's data every escaper takes " +
            'its fast path and the bytes agree; on data carrying any of those three they would ' +
            'not, and solid is doing a slightly smaller job for whatever that is worth.'
    );

    // ── WHO WINS ON WHICH SHAPE, WITHOUT THE READER DOING ARITHMETIC ─────────────────────────
    //
    // One line per subject, ranked, every figure ALSO given as a multiple of that subject's own
    // floor — a reader comparing across subjects must use the ratios and not the nanoseconds,
    // because a 3-element tree and a 32-element tree are different amounts of work.

    const shapeLine = (
        subject: string,
        stats: Map<string, Stat>,
        field: readonly string[],
        floorRow: string,
        show: (ms: number) => string
    ): void => {
        const med = (n: string): number => (stats.get(n) as Stat).median;
        const base = med(floorRow);
        const ranked = [...field]
            .sort((a, b) => med(a) - med(b))
            .map((n) => `${n} ${show(med(n))} (${(med(n) / base).toFixed(2)}×)`)
            .join(' · ');
        line(`  ${subject.padEnd(16)}${ranked}`);
    };

    line('');
    line('SHAPES, ranked, each against ITS OWN floor — BUILD [ns per node]');
    shapeLine('tiny', tinyBuilt, FIELD, 'floor', nsOf);
    shapeLine('card', builtTimes, FIELD, 'floor', nsOf);
    shapeLine('deep', deepBuilt, FIELD, 'floor', nsOf);
    shapeLine('dense', denseBuilt, FIELD, 'floor', nsOf);
    shapeLine(
        'events·direct',
        eventBuilt,
        ['floor·direct', 'stage0·direct', 'exodra·direct'],
        'floor·direct',
        nsOf
    );
    shapeLine(
        'events·delegated',
        eventBuilt,
        [
            'floor·delegated',
            'stage0·delegated',
            'exodra·delegated',
            ...(mikadoRoute ? ['mikado·route'] : []),
        ],
        'floor·delegated',
        nsOf
    );
    line(
        '  THE TWO EVENT LINES ARE NOT A RANKING OF EACH OTHER. Direct and delegated answer the ' +
            'same click differently — one listener per element against one per root — and ' +
            'mikado·route answers it with a cloned attribute and cannot answer it per instance ' +
            'at all. Compare within a line; across lines, read what each strategy gave up.'
    );

    line('');
    line('SHAPES, ranked, each against ITS OWN floor — COMPILE [µs per template]');
    shapeLine('tiny', tinyCompiled, FIELD, 'floor', usOf);
    shapeLine('card', compiled, FIELD, 'floor', usOf);
    shapeLine('deep', deepCompiled, FIELD, 'floor', usOf);
    shapeLine('dense', denseCompiled, FIELD, 'floor', usOf);
    shapeLine(
        'events',
        eventCompiled,
        [
            'floor',
            'stage0',
            'exodra·direct',
            'exodra·delegated',
            ...(mikadoRoute ? ['mikado·route'] : []),
        ],
        'floor',
        usOf
    );

    line('');
    line('THE CARD, ACROSS ITS THREE UNITS — what each phase costs and how often it is paid');
    line(
        `  compile   ${usOf(cMed('exodra')).padStart(9)} µs   ONCE per component, for the life ` +
            'of the process'
    );
    line(
        `  build     ${nsOf(bMed('exodra')).padStart(9)} ns   ONCE per instance` +
            ' — multiply by the rows on the page'
    );
    line(
        `  update    ${nsOf((updated.get('exodra') as Stat).median).padStart(9)} ns   ` +
            'ONCE per data change — multiply by how often the data moves'
    );
    line(
        '  A READER WEIGHTING THESE NEEDS ALL THREE COUNTS, and this axis knows none of them: ' +
            "how many components, how many instances, how often they change is the application's " +
            "shape and not the template library's. The figures are offered per event so they can " +
            'be multiplied, and they are never converted into a share of anything.'
    );

    // ── THE WAYS THIS RUN COULD BE LYING ABOUT ITS OWN NUMBERS ───────────────────────────────

    const minTicks = 3;
    /** The batch that would give a region `minTicks` ticks. A region that read as ZERO cannot
     *  produce one — the arithmetic divides by it — so that case is named rather than printed. */
    const clearing = (region: number): string =>
        region > 0
            ? String(Math.ceil((minTicks * quantum) / region) * factor)
            : 'a much larger one';
    for (const p of compilePhases) {
        const region = (compiled.get(p.name) as Stat).median * p.reps;
        if (region < minTicks * quantum) {
            refuse(
                `template-build: the COMPILE region for "${p.name}" is ${f4(region)} ms — under ` +
                    `${minTicks} ticks of the observed ${f4(
                        quantum
                    )} ms clock, so its digits are ` +
                    'quantisation and not measurement. Rerun with a batch of at least ' +
                    `${clearing(region)}.`
            );
        }
    }
    for (const p of buildPhases) {
        const region = (builtTimes.get(p.name) as Stat).median * p.reps;
        if (region < minTicks * quantum) {
            refuse(
                `template-build: the BUILD region for "${p.name}" is ${f4(region)} ms — under ` +
                    `${minTicks} ticks of the observed ${f4(quantum)} ms clock. Rerun with a ` +
                    `batch of at least ${clearing(region)}.`
            );
        }
    }
    // EVERY NEW TABLE THROUGH THE SAME CHECK, by its own section name so a refusal says which
    // table it is about. A row whose region landed under three ticks is quantisation wearing a
    // measurement's decimals, whatever subject it belongs to.
    const quantumCheck = (section: string, phases: readonly Phase[], stats: Map<string, Stat>) => {
        for (const p of phases) {
            const region = (stats.get(p.name) as Stat).median * p.reps;
            if (region >= minTicks * quantum) continue;
            refuse(
                `template-build: the ${section} region for "${p.name}" is ${f4(region)} ms — ` +
                    `under ${minTicks} ticks of the observed ${f4(quantum)} ms clock, so its ` +
                    'digits are quantisation and not measurement. Rerun with a batch of at ' +
                    `least ${clearing(region)}.`
            );
        }
    };
    quantumCheck('TINY-COMPILE-US', tinyCompilePhases, tinyCompiled);
    quantumCheck('TINY-BUILD-NS', tinyBuildPhases, tinyBuilt);
    quantumCheck('DEEP-COMPILE-US', deepCompilePhases, deepCompiled);
    quantumCheck('DEEP-BUILD-NS', deepBuildPhases, deepBuilt);
    quantumCheck('DENSE-COMPILE-US', denseCompilePhases, denseCompiled);
    quantumCheck('DENSE-BUILD-NS', denseBuildPhases, denseBuilt);
    quantumCheck('EVENTS-COMPILE-US', eventCompilePhases, eventCompiled);
    quantumCheck('EVENTS-BUILD-NS', eventBuildPhases, eventBuilt);
    quantumCheck('UPDATE-NS', updatePhases, updated);
    quantumCheck('EVENT-REFILL-NS', refillPhases, refilled);
    quantumCheck('SHELL-NS', shellPhases, shelled);

    for (const p of serverCompilePhases) {
        const region = (serverCompiled.get(p.name) as Stat).median * p.reps;
        if (region < minTicks * quantum) {
            refuse(
                `template-build: the SERVER-COMPILE region for "${p.name}" is ${f4(region)} ms — ` +
                    `under ${minTicks} ticks of the observed ${f4(quantum)} ms clock, so its ` +
                    'digits are quantisation and not measurement. Rerun with a batch of at least ' +
                    `${clearing(region)}.`
            );
        }
    }
    for (const p of assemblePhases) {
        const region = (assembled.get(p.name) as Stat).median * p.reps;
        if (region < minTicks * quantum) {
            refuse(
                `template-build: the ASSEMBLE region for "${p.name}" is ${f4(region)} ms — under ` +
                    `${minTicks} ticks of the observed ${f4(quantum)} ms clock. Rerun with a ` +
                    `batch of at least ${clearing(region)}.`
            );
        }
    }
    for (const name of SERVER_FIELD) {
        if (name === 'floor' || aMed(name) >= aMed('floor')) continue;
        refuse(
            `template-build: "${name}" assembled the document FASTER than the native floor ` +
                `(${f4(us(aMed(name)))} µs against ${f4(
                    us(aMed('floor'))
                )} µs). The floor writes ` +
                'the same characters straight-line, with the shipped escapers on all fifteen ' +
                'values and the attribute heads baked into its literals — there is no smaller ' +
                'program for this fixed job — so either the floor is not the cheapest spelling of ' +
                'it or that row is doing less, and the row must be rewritten before the table is ' +
                'quoted. A gap that reads the other way on a DIFFERENT job is a strategy; this ' +
                'one is the same job, gated byte for byte.'
        );
    }
    if (flattenCost < 0) {
        refuse(
            `template-build: floor·rope measured SLOWER than floor by ${f4(
                us(-flattenCost)
            )} µs, ` +
                'where the only difference between the two is a six-character tail read that ' +
                'floor·rope does not do. A negative flatten is the instrument, not the program: ' +
                'read nothing off that pair and raise `rounds`.'
        );
    }
    if (Math.abs(shipped - replica) > buildNull) {
        refuse(
            'template-build: the exodra REPLICA does not reproduce the shipped entry point — ' +
                `exodra + insert is ${f1(ns(replica))} ns against mountExoInstance's ${f1(
                    ns(shipped)
                )} ns, a gap of ${f1(
                    ns(Math.abs(shipped - replica))
                )} ns where this run resolved ${f1(ns(buildNull))} ns. The "exodra" row is ` +
                'therefore not "mountExoInstance minus the insert" by as much as that gap, and it ' +
                'should be read as a lower bound until the difference is named.'
        );
    }
    for (const name of ['stage0', 'mikado', 'exodra', 'exodra·declared']) {
        if (cMed(name) < cMed('floor')) {
            refuse(
                `template-build: "${name}" compiled FASTER than the native floor ` +
                    `(${f4(us(cMed(name)))} µs against ${f4(
                        us(cMed('floor'))
                    )} µs). The floor parses the same markup and appends twelve Text nodes; a ` +
                    'library beating it means the floor is not the cheapest program for this job ' +
                    'and the row must be rewritten before either DOM table is quoted.'
            );
        }
    }
    if (compileNull > 0.05 * cMed('floor') || buildNull > 0.05 * bMed('floor')) {
        refuse(
            'template-build: the null pair — two programs whose difference is ZERO by ' +
                `construction — came out at ${f4(us(compileNull))} µs (compile) and ${f1(
                    ns(buildNull)
                )} ns (build), which is more than 5% of the floor. This machine did not hold ` +
                'still for this run; raise `rounds` and read only the absolute rows.'
        );
    }
    if (serverCompileNull > 0.05 * sMed('floor') || assembleNull > 0.05 * aMed('floor')) {
        refuse(
            'template-build: the SERVER null pair — one expression compiled twice, whose ' +
                `difference is ZERO by construction — came out at ${f4(us(serverCompileNull))} ` +
                `µs (compile-for-string) and ${f4(
                    us(assembleNull)
                )} µs (assemble), which is more ` +
                'than 5% of the floor. Neither server table resolved anything smaller than that ' +
                'on this run; raise `rounds` and read only the absolute rows.'
        );
    }
}
