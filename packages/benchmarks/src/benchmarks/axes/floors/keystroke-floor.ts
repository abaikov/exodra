import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachine } from '@exodra/core';
// DIAGNOSTIC — WHAT DOES ONE KEYSTROKE IN A CONTROLLED FIELD COST, AND HOW MUCH ROOM IS THERE
// BELOW `@exodra/forms` AT SERVING IT?
//
// THE GAP IT CLOSES. `@exodra/forms` ships six helpers and, until this file, NO AXIS IN THIS SUITE
// LOADED THE PACKAGE. It and `door-count` are still the only two of the axes registered in
// `scripts/run-one-axis.js` that import it, so the commonest interaction a web page has — a person
// typing into a box — was the one part of the shipped surface with no number of any kind behind it.
// Mounting has four floors, updating has one, tearing down has two; typing had none.
//
// It is written to the `mount-floor` / `update-floor` / `hydrate-floor` / `teardown-floor` set: a
// phase per program, a floor with no framework in it, a resolution floor measured from a control
// whose true difference is zero, every way it can mislead stated in this header and repeated in the
// answer, and a run that refuses its own numbers by name when they are unreadable.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT ACTUALLY HAPPENS ON ONE KEYSTROKE — READ FROM THE CODE, NOT ASSUMED ────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The controlled shape, kept here as the row `exodra·bindable`, is a model per field and one
// closure on that field's input port that writes the model, the field and the read-out:
//
//     c.on(inputPort, (event) => { model = event.target.value; c.attr(valuePort, model); … });
//
// So a keystroke in a field wired that way runs, in order:
//
//   1. THE BROWSER updates `input.value` itself, before any script runs. Nothing in this
//      repository does that, and nothing in this repository can avoid it.
//   2. THE `input` LISTENER fires. Under the shipped direct pack that is one listener on that one
//      element (`EXO_DIRECT_EVENTS` → `createExoEventSlotSetter`); under a delegated pack it is one
//      listener on the render root plus a `parentNode` walk from `e.target`
//      (`exo-delegated-listener.ts:11-32`).
//   3. THE HANDLER READS `event.target.value` — a DOM property load. `target`, not
//      `currentTarget`, and that choice is argued in the helper's own comment.
//   4. THE MODEL IS COMPARED AND STORED. `next === previous` returns early when they are equal. A
//      KEYSTROKE IS NEVER EQUAL, so the dedupe never fires on this path.
//   5. NOTHING IS NOTIFIED: the model has no subscribers, and the handler makes the writes below.
//   6. `c.attr(valuePort, model)` WRITES THE VALUE BACK: `el.value = next`. The
//      element the handler just READ from in step 3 is written to with the string the browser
//      already put there in step 1. `value` on an `<input>` resolves to a DOM PROPERTY and not to
//      an attribute (`exo-attr-setter` consults `EXO_DOM_PROPERTIES` and `name in proto` at
//      compile time; the helper's comment states this and it is why the attribute is not touched),
//      so the write is a property store into Blink and it does not appear in `innerHTML` at all.
//   7. ANYTHING DERIVED FROM THE MODEL recomputes and writes: one `fmt` call and one `Text.data`
//      store.
//
// STEP 6 IS THE WHOLE REASON THIS AXIS HAS A THIRD PROGRAM. It is a real DOM write, per keystroke,
// whose only effect is to put back a string that is already there. It is not a bug — it is what
// makes the field CONTROLLED, and a controlled field is what lets code clear the form, trim the
// value, reject a character or restore a draft. It is a price paid for a capability, and nothing in
// this repository had ever priced it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE SCENARIO, AND WHAT THE OTHERS WOULD HAVE SHOWN ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// CHOSEN: ONE KEYSTROKE IN ONE FIELD OF A FIFTY-FIELD FORM, WHERE THAT FIELD'S VALUE FEEDS A
// READ-OUT ELSEWHERE ON THE PAGE. All fifty fields are really wired — fifty models, fifty value
// bindings, fifty input handlers — and exactly one of them is typed into.
//
// WHY THE CONSUMER IS NOT OPTIONAL, and this is the decision that shapes everything. A keystroke
// that changes nothing else on the page can be served by a floor whose handler is `sink =
// node.value` — one property load and one store — while the framework still pays a cell, a
// notification and a write-back. The ratio would come out enormous and would be a measurement of
// the framework against a program that does not do the job. A page where typing moves nothing is
// not a form; it is a text box nobody reads. WITH the read-out, all three programs must move the
// same two pieces of DOM in response to the same event, and the gap between them is bookkeeping
// rather than absent work. THIS IS ALSO THE CASE WHERE THE FRAMEWORK EARNS ITS KEEP: the floor has
// to know, at the callsite, which element to update and how to format it, and so does the
// framework's version: `c.text(readout, fmt(model))` in the handler.
//
// WHY FIFTY FIELDS AND NOT ONE. Fifty changes NOTHING about a keystroke's cost and that is exactly
// why it is here: the per-keystroke path is O(1) in form size for every participant (a direct
// listener sits on the element it serves; a delegated walk is bounded by DEPTH, which is 2 here for
// all fifty; the floor's is bounded the same way), so the keystroke table is a control that says the
// form's size is not in the answer. What fifty DOES change is the MOUNT — fifty listeners and fifty
// closures against one root listener and fifty subjects — which is the only place the delegated
// strategy can win, and it would be invisible on a one-field form. So this axis prints TWO TABLES,
// and the delegated pack is judged on both rather than on the one that flatters it.
//
// WHAT THE OTHER TWO SCENARIOS WOULD HAVE SHOWN, stated so that this one cannot be read as the
// convenient choice:
//
//   ONE FIELD ON A SMALL FORM — the "common case". Every keystroke row would print the same number
//   this file's keystroke table prints, because the per-keystroke path does not consult the form,
//   and the mount table would collapse to a difference too small to resolve (one listener against
//   one listener). It is the scenario in which everybody ties and nothing is learned. It is not
//   omitted because it is unimportant; it is omitted because THIS FILE'S KEYSTROKE TABLE ALREADY IS
//   IT, measured at a form size where the mount question is also answerable.
//
//   ONE FIELD ON A FORM OF FIFTY, WITH NO CONSUMER. The floor's handler becomes an assignment to a
//   local; the framework still pays steps 4, 5 and 6 above. The ratio would be large and it would be
//   almost entirely the write-back — a true fact about a controlled field, reported at its most
//   flattering angle for the floor. That number is NOT thrown away: `exodra·bindable` against `exodra·free`
//   below prices the write-back directly, on two programs that differ in that one call and in
//   nothing else, which is a cleaner instrument for the same quantity than a second census would be
//   and costs no extra shape in the process.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PROGRAMS ────────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// SEVEN ROWS, and each consecutive pair differs by ONE thing that can be named.
//
//   `driver`         THE INSTRUMENT'S OWN COST, and not a participant. The identical form, cloned
//                    and inserted, with the read-out filled once and NO LISTENER ANYWHERE. Its
//                    keystroke region runs the same `value` assignment, the same `InputEvent`
//                    construction and the same `dispatchEvent` as every other row and then nothing
//                    happens. Every other keystroke row is this row PLUS a handler, so it is a
//                    common addend that inflates every row equally and DEFLATES every ratio. The
//                    run prints the corrected figures beside the raw ones and refuses any row that
//                    lands below it. It is excluded from the keystroke gate by construction — a
//                    program with no handler cannot produce the same DOM after typing, and saying
//                    so is the point of the row.
//
//   `floor·per-el`   THE FLOOR, in the shape `exodra·bindable` has. No components, no declaration, no
//                    reactivity, no schema, no connector, no library: one prototype parsed at module
//                    load, one clone, a walk, fifty `addEventListener` calls, a `string[]` of fifty
//                    slots for the model, and a handler that writes `refs.readout.data = fmt(v)`.
//
//   `floor·root`     THE FLOOR, in the shape `exodra` and `exodra·deleg` have. Everything identical except that
//                    ONE listener goes on the `<form>` and the handler tests `e.target` against the
//                    field it serves. Both spellings are built because "what is the floor allowed
//                    to do" has no obvious answer and a floor chosen by argument is a floor chosen
//                    to flatter whoever argued — the run takes the CHEAPER of the two as the floor
//                    and says which one won.
//
//   `floor·per-el·twin`  THE NULL. A second, independently declared copy of `floor·per-el`, its own
//                    function object, its own independently parsed prototype, the identical work on
//                    the identical data. Its true difference from `floor·per-el` is ZERO by
//                    construction, so what the run measures between them is what this instrument
//                    returns when there is nothing to find.
//
//   `exodra`         `@exodra/forms` AS IT SHIPS. ONE event port on the `<form>`, a ref port per
//                    field, the fields' nodes read once at mount, and a machine handler that reads
//                    `readExoControlValue(event.target)`, tests the target against the typed field
//                    and writes the read-out from its `on` handler. No model object, no subscription, no write-back: the
//                    floor·root program said through a machine.
//
//   `exodra·bindable` THE CONTROLLED FIELD: per field a model and a closure on that field's input
//                    port that stores the model, writes it back with `c.attr(values[k], model)`
//                    and, on the typed field, writes `c.text(readout, fmt(model))`.
//
//   `exodra·deleg`   THE STRATEGY THE BRIEF NAMES, and it is a real composition a user can write:
//                    `composeExoPlugins(withExoCompiler(new ExoDomBackend()), { events: () => createExoDelegatedEvents(['input']) })`, and
//                    then `backend.render(FORM, container)` like any other. It cannot reuse
//                    `exodra·bindable`'s closure — that fills its event port WITH NO SUBJECT and
//                    the delegated attacher refuses a subjectless
//                    fill by name (`exo-delegated-events.ts:95` → `refuse-exo-missing-subject.ts`)
//                    rather than quietly attaching a per-element listener behind the application's
//                    back — so the handler is one module-level function, `TAKE_TEXT`, with a
//                    per-field subject. THE WRITE-BACK IS UNCHANGED, so this row differs from
//                    `exodra·bindable` in WHO LISTENED and in THE HANDLER FORM, which move TOGETHER here —
//                    exactly why the eighth row below is booked as missing. `input` is in neither
//                    `EXO_NON_BUBBLING_EVENTS` nor `EXO_HIGH_FREQUENCY_EVENTS`: no opt-in needed.
//
//   `exodra·free`   THE STRATEGY THE CODE SUGGESTED, and the one this file expects to close the
//                    gap. The same package, the same connector, the same derived read-out, minus
//                    ONE call: the field's `value` port is written once at mount and never again.
//                    The browser is already maintaining `input.value`; the model still follows
//                    every keystroke; everything downstream of the model still updates. What is
//                    given up is the ability to write the field FROM the model afterwards — a
//                    programmatic clear, a trim, a rejected character, a restored draft — which is
//                    a capability and not an optimisation, and the header's ANSWER says so wherever
//                    this row wins.
//
// WHAT WAS CONSIDERED AND NOT BUILT, so the space is closed rather than sampled:
//
//  * A SHARED HANDLER UNDER THE DIRECT PACK. `EXO_DIRECT_EVENTS` serves one too, and cheaply:
//    "a fill is two property stores under both handler forms" (`EXO_DIRECT_EVENTS.ts:16-17`). It
//    would separate "one function for every row instead of one closure per row" from "one root
//    listener instead of fifty", which `exodra·deleg` changes together. It is a legitimate eighth
//    row and it is left out to keep this run at seven; the pair it would price is named here so
//    nobody has to rediscover that it is missing. `op-click-floor` IS THAT PAIR, on a click.
//  * A REAL `keydown`→`beforeinput`→`input` SEQUENCE. See the driver's limits below: it would add
//    two more synthetic dispatches without adding any of the browser behaviour that makes real
//    typing different, which is the opposite of an improvement.
//  * DEBOUNCING. A field that updates its model on a timer measures the timer.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE DRIVER, AND WHAT IT THEREFORE DOES NOT MEASURE. READ THIS BEFORE QUOTING ANYTHING. ──
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ONE "KEYSTROKE" IN THIS FILE IS EXACTLY THREE STATEMENTS:
//
//     field.value = SEQ[j];
//     field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
//
// A SYNTHETIC `input` EVENT IS NOT TYPING, and the list of what it skips is not short:
//
//  * THE BROWSER'S OWN EDIT MACHINERY. Real typing goes through key handling, the editing command,
//    the value mutation, the selection and caret update, and the `beforeinput` event that can
//    cancel the whole thing. Here the script performs the value mutation itself, in JS, and the
//    browser's editor is never entered.
//  * COMPOSITION AND IME. `compositionstart` / `compositionupdate` / `compositionend`, and the
//    `input` events with `inputType: 'insertCompositionText'` that come with them. Every CJK, Thai
//    and Vietnamese user types through this path, and this file never touches it. A framework that
//    behaved badly under composition would score identically here.
//  * `isTrusted`. Every event this driver makes is `isTrusted: false`. Nothing in `@exodra/dom`
//    reads it, but the browser does — a synthetic event does not move focus, does not scroll a
//    field into view and does not trigger autofill.
//  * ANYTHING AFTER THE HANDLER RETURNS. Style recalculation, layout, paint and compositing from
//    the two DOM writes are charged to whatever runs next, which here is the next keystroke. Every
//    row pays it and no row's timed region contains all of its own — `mount-phases` and
//    `import-node-trade` carry the same hazard and state it the same way.
//  * HUMAN RATE. A person types perhaps ten characters a second. This driver types a thousand into
//    one region as fast as the machine allows, so every inline cache is hot, every branch is
//    predicted, and the field's value string is in cache. THAT FLATTERS EVERY ROW, and it flatters
//    the row with the most code to warm up the most.
//
// SO WHAT THIS AXIS MEASURES IS EXACTLY ONE THING: THE JAVASCRIPT A PAGE RUNS IN RESPONSE TO AN
// `input` EVENT, AND THE DOM WRITES THAT JAVASCRIPT MAKES. It is not a keystroke's wall-clock cost,
// it is not input latency, and it must never be quoted as either.
//
// THE DRIVER'S OWN COST IS INSIDE EVERY TIMED REGION and it is the largest single hazard here,
// because it is a COMMON ADDEND: it is added to the floor and to the framework alike, so it makes
// every ratio SMALLER than the truth. That is why `driver` is a row. Every headline is printed
// twice — raw, and with `driver` subtracted from both sides — and the corrected form is the one
// that answers "how much of the handler is the framework".
//
// THE SEQUENCE IS TYPING-SHAPED AND CONSTANT-COST. The field walks `''` → `b` → `be` → … →
// `benchmark` → … → `''`, eighteen steps, and repeats. Every step is a real change (so
// the model's `===` dedupe never fires and every keystroke does the full job), every step is
// bounded at nine characters (so no row's cost grows with how long the region has been running,
// which a monotonically growing string would have caused through the value assignment alone), and
// half the steps are DELETIONS, which real typing also has.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE GATE, WHICH RUNS BEFORE ANYTHING IS TIMED ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// The programs must produce IDENTICAL DOM after the same sequence of keystrokes, and `innerHTML`
// alone cannot see that here: `value` on an `<input>` is written as a DOM PROPERTY, and a property
// does not serialise. A gate that compared markup only would pass a program that never wrote the
// field at all — which is precisely one of the programs in this file.
//
// So the snapshot is THREE THINGS, and all of them are compared:
//
//   * the container's markup, comments stripped, through this suite's shared `markupOf`;
//   * every `<input>`'s live `.value` PROPERTY and its `value` ATTRIBUTE, by index, both of them,
//     because the two differ on this path and the difference is the subject;
//   * the read-out's text, which is the derived thing on the page.
//
// AND IT IS STEPPED, NOT CHECKED AT THE END. The sequence returns to `''` after eighteen steps, so
// an end-state comparison would pass a program that did nothing at all — the lesson `update-floor`
// learned on its three cyclic transitions. The gate compares every program against `exodra` after
// EVERY step of a full cycle, and throws with the step number and both snapshots.
//
// THE THREE PARTS ARE DIFFED SEPARATELY AND EVERY DIFFERING PART IS REPORTED, which is not
// tidiness. Concatenated into one string, the markup comes first, so a markup difference is the
// only thing a "first difference at char N" line can ever point at and a property difference two
// hundred characters later is invisible until the markup one is fixed. That turns one run into
// three, and this axis has seven programs that can each carry the same defect independently. Each
// part is therefore compared on its own and the failure names ALL of them at once.
//
// IT HAS ALREADY EARNED ITS KEEP TWICE, AND IN BOTH DIRECTIONS. The first run never timed
// anything: the renderer's prototype carried ` value=""` on every input and the floor's did not.
// The placeholder is gone from the renderer now — `packages/dom/src/tests/attr-parity.test.ts`
// pins `<input>` — and the gate stopped the floor that still printed it. A difference between two
// programs is caught whichever side moved.
//
// AND THE PROTOTYPES ARE PRINTED BEFORE THE GATE RUNS, all of them — the floor's and the compiled
// prototype of every distinct schema among the participants — so a divergence of this kind is read
// as what it is at the top of the output, instead of being rediscovered halfway down as a mount
// difference. That ordering is a fix: on the first run the report came AFTER the gate, so the one
// line that would have explained the throw never printed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// This is JUDGEMENT plus citations. I MEASURED NONE OF IT, and it is written down first so the run
// reads as a test of it rather than as a story told afterwards. Every falsifier is printed
// mechanically at the end so that nobody, including me, gets to choose which one counted.
//
//   P1. `exodra / floor` PER KEYSTROKE, DRIVER-CORRECTED, LANDS BETWEEN 1.6 AND 3.0.
//       MECHANISM: on top of the floor's read-and-write the framework runs the dedupe compare, the
//       notification, the write-back property store, and the derived recompute. The write-back is
//       the only one of those that crosses into Blink, and this repository's standing prior is that
//       DOM work dominates dispatch work (`update-floor` measured dispatch at +12.5 µs against
//       +62.5 µs of reconcile/records/boundary on its own transitions — A CITATION, not this run).
//       (a) BELOW 1.15 falsifies it: the handler is then browser-bound and the bookkeeping is free.
//       (b) ABOVE 4.0 falsifies it the other way: more than three quarters of a keystroke is ours.
//
//   P2. `exodra·free` MEASURES BELOW `exodra·bindable`, PAST THE RESOLUTION FLOOR, and lands within 1.3× of
//       the floor. MECHANISM: the two differ by one `el.value = v` per keystroke and by nothing
//       else. (c) IF IT DOES NOT, the write-back is free at this scale, the paragraph above about
//       step 6 is wrong, and "a controlled field costs something per keystroke" must not be said in
//       this repository without a number that is not this one.
//
//   P3. `exodra·deleg` MEASURES ABOVE `exodra·bindable` PER KEYSTROKE AND BELOW IT AT MOUNT. MECHANISM: per
//       keystroke it adds the dispatcher's `parentNode` walk and one property load per ancestor,
//       against a direct listener that is already on the target; at mount it
//       deletes fifty closures and fifty `addEventListener` calls and adds fifty subject objects
//       and one root installation. (d) EITHER HALF FAILING is a finding about the delegated pack
//       and not about this axis: if it wins the keystroke, the walk is cheaper than a per-element
//       registration's dispatch, and if it loses the mount, delegation's one advertised advantage
//       does not appear at fifty elements and the size at which it does is unknown.
//
//   P4. `driver` IS MORE THAN HALF OF EVERY KEYSTROKE ROW. MECHANISM: a value assignment, an event
//       construction and a `dispatchEvent` are three crossings into Blink, against a handful of JS
//       property loads and one or two DOM writes. (e) IF IT IS UNDER A QUARTER, the JS is the cost,
//       the raw ratios are readable without correction, and the correction printed beside them is
//       an over-scrupulous rounding of a number that did not need it.
//
//   THE MODEL CAN BE RIGHT FOR THE WRONG REASON. P1 holding while P2 fails would mean the gap is
//   real and is NOT the write-back, which would leave the notification and the derived recompute
//   holding it — and would make `exodra·free` a strategy that gives up a capability for nothing.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THIS AXIS DOES NOT ANSWER ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  * NOTHING ABOUT REAL TYPING, INPUT LATENCY OR RESPONSIVENESS. See the driver's limits.
//  * NOTHING ABOUT COMPOSITION, IME OR ANY NON-LATIN INPUT METHOD.
//  * NOTHING ABOUT VALIDATION, SUBMISSION, FOCUS ORDER OR ANY OTHER PART OF A FORM.
//  * NOTHING ABOUT TEARDOWN OR MEMORY. No heap column is printed and none would mean anything.
//  * IT IS THIS SHAPE ONLY — fifty flat text fields, one consumer, depth 2. A form of nested
//    field-sets moves the delegated walk; a field with ten consumers moves the notification; a
//    field inside a list row moves everything.
//  * THE FLOOR IS NOT MEASURED OUT OF A BUILT PACKAGE. `@exodra/forms`, `@exodra/dom` and
//    `@exodra/core` resolve to their tsup `dist`; the floor programs are
//    in this file and go through the dev server's esbuild. One transpiler against another, and it
//    is the one difference between these rows that is not a program. `mount-floor` carries the same
//    asymmetry and states it as its caveat A.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HOW TO RUN IT ───────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- keystroke-floor 100 1
//
// ONE AXIS AT A TIME — memory pressure has crashed multi-axis runs in this suite. The third
// positional is the batch and it is HONOURED, as `teardown-phases`' is: it multiplies every phase's
// repetition factor, which is what the clock refusal asks for by name. Batch 1 is the one to run: a
// keystroke region is 1080 dispatches, which on any machine that can run this suite is tens of
// ticks of the observed clock. `@exodra/*` resolve to their BUILT dists, so `npm run build:all` at
// the repository root has to have run or every `exodra` row is last week's code.
// `composeExoPlugins` is how an AD-HOC pack — one written here rather than shipped as a `with*`
// decorator — is composed onto a backend now that `withExoCompiler(new ExoDomBackend(...))` takes no packs. It
// MUTATES and returns the object it is handed, so `DELEGATED_BACKEND` stays ONE identity, which is
// what the schema cache needs: it keys the backend by pointer.
import {
    createExoMachine,
    composeExoMachine,
    withExoHandlers,
    createExoSchema,
    composeExoPlugins,
    type TExoAttrPort,
    type TExoEventPort,
    type TExoRefPort,
    type TExoTextPort,
} from '@exodra/core';
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    exoDomSchemaOf,
    type TExoDomMachine,
    withExoCompiler,
} from '@exodra/dom';
import type { TExoDomBackend, TExoDomNode, TExoCompilerApi } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';
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

/**
 * THE TWO BACKENDS, COMPOSED ONCE AT MODULE LOAD — and being module-level is the whole of what
 * keeps the schema cache hitting: a backend is the cache key, compared by POINTER, so one built
 * inside a scenario would recompile `FORM_SCHEMA` — markup parse included — per mount, inside the
 * region this axis is trying to keep free of the compiler.
 *
 * THE STRATEGY IS A BACKEND NOW, NOT AN ARGUMENT. Where a render call used to be handed an event
 * pack, an application composes one object that HAS that strategy and renders through it. The two
 * differ in `events` and in nothing else, which is what makes `exodra·deleg` a row about WHO
 * LISTENED rather than a row about two renderers.
 */
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const DELEGATED_BACKEND = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    events: () => createExoDelegatedEvents(['input']),
});

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE CENSUS. One place, so no two programs can drift by a constant.
// ---------------------------------------------------------------------------------------

/** Fields on the form. See the header on why fifty and not one. */
const FIELDS = 50;
/** The field that is typed into. Zero, so the delegated walk is the shortest it can be. */
const TYPED = 0;
/** Elements in the finished form: the form, fifty inputs, the read-out. */
const ELEMENTS = 1 + FIELDS + 1;

/** What the read-out shows — the derived thing on the page. Cheap and total. */
const fmt = (s: string): string => `len ${s.length}`;

/**
 * THE KEYSTROKE SEQUENCE — grow to nine characters, then delete back to empty.
 *
 * Every consecutive pair differs, so the model's `===` dedupe never fires and every step does the
 * whole job. The length is bounded, so no row's cost grows with how long its region has run. Half
 * the steps are deletions, which typing has and a "type forever" driver does not.
 */
const WORD = 'benchmark';
const SEQ: readonly string[] = (() => {
    const out: string[] = [];
    for (let n = 1; n <= WORD.length; n++) out.push(WORD.slice(0, n));
    for (let n = WORD.length - 1; n >= 0; n--) out.push(WORD.slice(0, n));
    return out;
})();

/**
 * KEYSTROKES PER TIMED REGION, a whole number of cycles.
 *
 * A keystroke is a small thing and the browser's clock is clamped near 0.1 ms, so a region of one
 * would be the clamp printed however many times the run asks for. The run OBSERVES its quantum
 * rather than assuming this number is enough, and refuses by name any row whose region landed under
 * three ticks — see `MIN_TICKS`.
 */
const KEYS = SEQ.length * 60;

// ---------------------------------------------------------------------------------------
// THE SCHEMA — one form, fifty text fields, one read-out. No components inside it, on purpose:
// a `list` of fifty field COMPONENTS would put a component boundary in every row (measured at
// ~11% of a mount elsewhere in this repository) and the floor would have nothing to match it
// with. What is being measured is a form, not a component tree.
// ---------------------------------------------------------------------------------------

type TFormPorts = {
    readonly values: readonly TExoAttrPort[];
    readonly inputs: readonly TExoEventPort[];
    readonly readout: TExoTextPort;
};

const FORM_SCHEMA = createExoSchema<TFormPorts>((b) => {
    const values: TExoAttrPort[] = [];
    const inputs: TExoEventPort[] = [];
    let readout!: TExoTextPort;
    b.el('form', { class: 'f' }, (form) => {
        for (let k = 0; k < FIELDS; k++) {
            form.el('input', { type: 'text', class: 'fl' }, (i) => {
                values.push(i.port('value'));
                inputs.push(i.eventPort('input'));
            });
        }
        form.el('span', { class: 'ro' }, (s) => {
            readout = s.textPort();
        });
    });
    return { values, inputs, readout };
});
const FORM_SCHEMA_FORMS: unknown[] = [];

/** The ports, hoisted once at module load — one property load, as a wire factory would give. */
const P = FORM_SCHEMA.ports;

// ---------------------------------------------------------------------------------------
// THE THREE `@exodra/forms` PROGRAMS. One declaration, three wires — so nothing between them is a
// difference of markup, of schema, of port numbering or of prototype.
// ---------------------------------------------------------------------------------------

type TRootPorts = {
    readonly input: TExoEventPort;
    readonly fields: readonly TExoRefPort[];
    readonly readout: TExoTextPort;
};

const FORM_ROOT_SCHEMA = createExoSchema<TRootPorts>((b) => {
    const fields: TExoRefPort[] = [];
    let input!: TExoEventPort;
    let readout!: TExoTextPort;
    b.el('form', { class: 'f' }, (form) => {
        input = form.eventPort('input');
        for (let k = 0; k < FIELDS; k++) {
            form.el('input', { type: 'text', class: 'fl' }, (i) => {
                fields.push(i.refPort());
            });
        }
        form.el('span', { class: 'ro' }, (s) => {
            readout = s.textPort();
        });
    });
    return { input, fields, readout };
});
const R = FORM_ROOT_SCHEMA.ports;

type TRootState = { readonly nodes: Element[]; readonly values: string[] };

/**
 * AS IT SHIPS. One listener on the form, the fields' nodes read once, the value read off the target.
 */
const mFormRoot = createExoMachine<TExoDomNode, unknown, TRootState>(FORM_ROOT_SCHEMA, {
    createInitialState: (c): TRootState => {
        const table = c.portTable();
        const read = c.portNodeReader();
        const nodes = new Array<Element>(FIELDS);
        for (let k = 0; k < FIELDS; k++) nodes[k] = read(table, R.fields[k]);
        c.text(R.readout, fmt(''));
        return { nodes, values: new Array<string>(FIELDS).fill('') };
    },
});
const FORM_EXODRA = composeExoMachine(mFormRoot, (m) =>
    withExoHandlers(m, (on) => {
        on(R.input, (c, event) => {
            const target = event.target;
            const value = readExoControlValue(target) as string;
            const nodes = c.state.nodes;
            if (target === nodes[TYPED]) {
                c.state.values[TYPED] = value;
                c.text(R.readout, fmt(value));
                return;
            }
            for (let k = 0; k < FIELDS; k++) {
                if (nodes[k] === target) {
                    c.state.values[k] = value;
                    return;
                }
            }
        });
    })
);

/**
 * THE CONTROLLED SHAPE — a model per field, written back into the field on every keystroke by a
 * closure on its input port, and the read-out recomputed from the typed one.
 */
const FORM_BINDABLE: TExoDomMachine = {
    declaration: FORM_SCHEMA,
    forms: FORM_SCHEMA_FORMS,
    createInitialState: (c: TExoDomNode) => {
        const models: string[] = new Array<string>(FIELDS).fill('');
        for (let k = 0; k < FIELDS; k++) {
            const at = k;
            c.attr(P.values[at], '');
            c.on(P.inputs[at], (event) => {
                const v = (event.target as HTMLInputElement).value;
                if (v === models[at]) return;
                models[at] = v;
                c.attr(P.values[at], v);
                if (at === TYPED) c.text(P.readout, fmt(v));
            });
        }
        c.text(P.readout, fmt(''));
    },
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

/**
 * ONE HANDLER FOR THE WHOLE PROCESS — the thing a row-capturing closure cannot be. It holds no
 * field: the field ARRIVES as the second argument, stored on the element beside the handler by
 * `c.on`. `this` is the element that CARRIED the slot, which on these flat fields is the input the
 * per-field closure would have reached through `event.target`, so the body is the same as
 * `FORM_BINDABLE`'s with the field reached through the subject instead of a capture.
 */
function TAKE_TEXT(this: Element, _event: Event, subject?: unknown): void {
    const field = subject as TFieldSubject;
    const v = (this as HTMLInputElement).value;
    if (v === field.models[field.at]) return;
    field.models[field.at] = v;
    field.node.attr(P.values[field.at], v);
    if (field.at === TYPED) field.node.text(P.readout, fmt(v));
}

/** The subject the shared handler is handed: one object per field, naming that field. */
type TFieldSubject = {
    readonly node: TExoDomNode;
    readonly models: string[];
    readonly at: number;
};

/**
 * THE DELEGATED STRATEGY. Identical to `FORM_BINDABLE` in what it writes back and what it derives;
 * the ONLY difference is that the handler is a shared function plus a subject instead of a
 * subjectless closure — and a subject is what `createExoDelegatedEvents` refuses to work without.
 */
const FORM_DELEGATED: TExoDomMachine = {
    declaration: FORM_SCHEMA,
    forms: FORM_SCHEMA_FORMS,
    createInitialState: (c: TExoDomNode) => {
        const models: string[] = new Array<string>(FIELDS).fill('');
        for (let k = 0; k < FIELDS; k++) {
            c.attr(P.values[k], '');
            const subject: TFieldSubject = { node: c, models, at: k };
            c.on(P.inputs[k], TAKE_TEXT, subject);
        }
        c.text(P.readout, fmt(''));
    },
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

// The pack this component is rendered under is `DELEGATED_BACKEND`, composed with the rest of the
// backends at the top of this file — see there for why it is module-level.

/**
 * THE UNCONTROLLED STRATEGY — `FORM_BINDABLE` without the write-back into the field's own value
 * port, and nothing else changed.
 *
 * The field is filled once at mount and then left to the browser, which is already maintaining it.
 * The model still follows every keystroke and the read-out still updates, so the page behaves
 * identically for as long as nothing writes the field FROM the model. What is given up is exactly
 * that: a programmatic clear, a trim, a rejected character, a restored draft. The ANSWER says so
 * wherever this row wins, because a row that is faster because it does less is only a strategy if
 * what it stopped doing is named.
 */
const FORM_FREE: TExoDomMachine = {
    declaration: FORM_SCHEMA,
    forms: FORM_SCHEMA_FORMS,
    createInitialState: (c: TExoDomNode) => {
        const models: string[] = new Array<string>(FIELDS).fill('');
        for (let k = 0; k < FIELDS; k++) {
            const at = k;
            c.attr(P.values[at], '');
            c.on(P.inputs[at], (event) => {
                const v = (event.target as HTMLInputElement).value;
                if (v === models[at]) return;
                models[at] = v;
                if (at === TYPED) c.text(P.readout, fmt(v));
            });
        }
        c.text(P.readout, fmt(''));
    },
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
};

// ---------------------------------------------------------------------------------------
// THE FLOOR'S PROTOTYPE. Parsed once at module load out of a `<template>` and LEFT WHERE THE
// PARSER PUT IT — template-contents owner document, which is where `@exodra/dom`'s prototypes
// live since `importNode` was dropped from its compiler. A floor that page-owned its prototype
// where the renderer does not would be handing the renderer free advantage on the mount row.
//
// THE TEXT PLACEHOLDER IS EMPTIED OUT AGAIN, which is what the real compiler does: a text port's
// element is emitted with a character inside it so the parser makes a Text node, and the character
// is removed from the prototype, so a fresh clone has an EMPTY Text node there and the first write
// is a `.data` store rather than a node allocation (READ FROM CODE: `set-text.ts`).
//
// ═══ NO ` value=""` ON THE INPUTS, AND THE GATE IS WHAT SAYS SO ═══
//
// The compiler used to emit an empty placeholder for every attribute port and KEEP the one on
// `<input value>`, because the shipped fill writes `el.value` — THE PROPERTY — and never touches
// the attribute, so an unfilled port still had something to sweep. Nothing reserves a placeholder
// now: `@exodra/dom` renders `<input>` and the server renders `<input value="typed">`, and both
// halves are pinned in `packages/dom/src/tests/attr-parity.test.ts`. An absent `value` attribute
// and an empty one are the same reset value — `defaultValue` reads `''` either way — so what the
// change moved is the markup, not the control.
//
// ON `value` THE ATTRIBUTE AND THE PROPERTY ARE STILL DIFFERENT THINGS, which is what this whole
// axis is about: the attribute is the field's DEFAULT — what `defaultValue` reads, what a form
// reset restores, what the server prints — and the property is what the person sees and edits.
// They agree until the first keystroke and never again, which is why the gate compares the
// `value` ATTRIBUTE and the `.value` PROPERTY separately below.
//
// AND IT IS CHECKED THREE WAYS RATHER THAN ASSERTED. `protoReport()` prints this prototype beside
// the compiled prototype of EVERY participating schema, BEFORE the state gate runs, so a divergence
// is read as a prototype difference instead of being rediscovered as a mount difference; the gate
// compares the serialised markup; and the gate separately compares the `value` ATTRIBUTE and the
// `.value` PROPERTY of all fifty fields at every step, because on this port those are two facts
// and a markup diff can only see one of them.
// ---------------------------------------------------------------------------------------

const FIELD_MARKUP = '<input type="text" class="fl">';
const FORM_MARKUP =
    '<form class="f">' + FIELD_MARKUP.repeat(FIELDS) + '<span class="ro">x</span></form>';

function protoOf(markup: string): Element {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as Element;
}

/** Empty a text port's placeholder, exactly as the schema compiler does. */
function makeFormProto(): Element {
    const form = protoOf(FORM_MARKUP);
    ((form.lastChild as Element).firstChild as Text).data = '';
    return form;
}

/** Two independently parsed prototypes. The second is the null's — see `floor·per-el·twin`. */
const FLOOR_PROTO_1 = makeFormProto();
const FLOOR_PROTO_2 = makeFormProto();

/**
 * WHAT A FLOOR PROGRAM HOLDS AFTER IT HAS BUILT THE FORM.
 *
 * The cheapest retention that answers "can this program come back to that node later": one flat
 * array of the exact final length for the fields, one reference for the read-out's Text node, and
 * one `string[]` for the models. No per-field objects, no map, no keys, no records — a floor uses
 * the cheapest form of everything. `@exodra/dom` keeps something structurally different (a
 * per-SCHEMA node array reused by every instance, plus a model per field), and that difference is
 * part of what the gap contains rather than something this file tries to reproduce.
 */
interface FloorHandle {
    readonly fields: HTMLInputElement[];
    readonly readout: Text;
    readonly models: string[];
}

/**
 * THE WALK. Fifty-one `nextSibling` hops from `form.firstChild`, written as a loop because the
 * renderer's compiled walk is a loop over a table too — writing fifty hops out straight-line would
 * be giving the floor something no renderer has, and this file's rule is the opposite.
 */
function walkForm(form: Element): FloorHandle {
    const fields: HTMLInputElement[] = new Array<HTMLInputElement>(FIELDS);
    let node = form.firstChild as Node;
    fields[0] = node as HTMLInputElement;
    for (let k = 1; k < FIELDS; k++) {
        node = node.nextSibling as Node;
        fields[k] = node as HTMLInputElement;
    }
    const readout = (node.nextSibling as Element).firstChild as Text;
    const models: string[] = new Array<string>(FIELDS).fill('');
    return { fields, readout, models };
}

// ---------------------------------------------------------------------------------------
// FLOOR (1) — ONE LISTENER PER FIELD. The shape `exodra·bindable` has under the shipped direct pack.
// ---------------------------------------------------------------------------------------

function mountFloorPerEl(container: HTMLElement, proto: Element): FloorHandle {
    const form = proto.cloneNode(true) as Element;
    const h = walkForm(form);
    h.readout.data = fmt('');
    const fields = h.fields;
    const models = h.models;
    const readout = h.readout;
    for (let k = 0; k < FIELDS; k++) {
        const at = k;
        fields[k].addEventListener('input', (e) => {
            const v = (e.target as HTMLInputElement).value;
            models[at] = v;
            if (at === TYPED) readout.data = fmt(v);
        });
    }
    container.appendChild(form);
    return h;
}

/**
 * THE NULL. A SECOND, INDEPENDENTLY DECLARED COPY of `mountFloorPerEl` and of the handler it
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
    const form = proto.cloneNode(true) as Element;
    const h = walkForm(form);
    h.readout.data = fmt('');
    const fields = h.fields;
    const models = h.models;
    const readout = h.readout;
    for (let k = 0; k < FIELDS; k++) {
        const at = k;
        fields[k].addEventListener('input', (e) => {
            const v = (e.target as HTMLInputElement).value;
            models[at] = v;
            if (at === TYPED) readout.data = fmt(v);
        });
    }
    container.appendChild(form);
    return h;
}

// ---------------------------------------------------------------------------------------
// FLOOR (2) — ONE LISTENER ON THE FORM. The shape `exodra·deleg` has.
//
// `input` bubbles, so one registration on the form serves all fifty fields. The handler has to
// discover WHICH field the event is about, and it does it the cheapest way a hand-written program
// can: an identity test against the one field that has a consumer, and an index lookup for the
// rest. That lookup is the honest cost of the strategy and is not hidden.
// ---------------------------------------------------------------------------------------

function mountFloorRoot(container: HTMLElement, proto: Element): FloorHandle {
    const form = proto.cloneNode(true) as Element;
    const h = walkForm(form);
    h.readout.data = fmt('');
    const fields = h.fields;
    const models = h.models;
    const readout = h.readout;
    const typed = fields[TYPED];
    form.addEventListener('input', (e) => {
        const node = e.target as HTMLInputElement;
        const v = node.value;
        if (node === typed) {
            models[TYPED] = v;
            readout.data = fmt(v);
            return;
        }
        for (let k = 0; k < FIELDS; k++) {
            if (fields[k] === node) {
                models[k] = v;
                return;
            }
        }
    });
    container.appendChild(form);
    return h;
}

// ---------------------------------------------------------------------------------------
// THE DRIVER'S OWN FORM — the identical tree, the read-out filled once, NO LISTENER ANYWHERE.
//
// Its MOUNT row is the DOM work alone, and it passes the mount gate because the tree is the same.
// Its KEYSTROKE row is the driver's own cost and it is EXCLUDED FROM THE KEYSTROKE GATE by
// construction: a program with no handler cannot produce the same DOM after typing, which is the
// entire point of the row.
// ---------------------------------------------------------------------------------------

function mountDriver(container: HTMLElement, proto: Element): FloorHandle {
    const form = proto.cloneNode(true) as Element;
    const h = walkForm(form);
    h.readout.data = fmt('');
    container.appendChild(form);
    return h;
}

// ---------------------------------------------------------------------------------------
// THE DRIVER. Three statements per keystroke, identical for every row — see the header on what it
// therefore does not measure.
// ---------------------------------------------------------------------------------------

/**
 * ONE KEYSTROKE. The value is assigned first, because that is the order the browser uses: by the
 * time an `input` listener runs, `target.value` is already the new text.
 *
 * `InputEvent` rather than `Event`, with `inputType` and `data` set, because that is the interface a
 * real keystroke dispatches and a handler is free to read either field. `bubbles: true` because the
 * delegated dispatcher listens on the root and a non-bubbling event would silently never reach it —
 * which would make the delegated row the fastest in the table by doing nothing.
 */
function typeOne(field: HTMLInputElement, step: number): void {
    const next = SEQ[step];
    const grew = next.length > field.value.length;
    field.value = next;
    field.dispatchEvent(
        new InputEvent('input', {
            bubbles: true,
            inputType: grew ? 'insertText' : 'deleteContentBackward',
            data: grew ? next.charAt(next.length - 1) : null,
        })
    );
}

/** `KEYS` keystrokes into one field — the whole of a keystroke phase's timed region. */
function typeMany(field: HTMLInputElement): void {
    for (let j = 0; j < KEYS; j++) typeOne(field, j % SEQ.length);
}

// ---------------------------------------------------------------------------------------
// THE PROGRAM TABLE. One record per row, so nothing below names a winner in advance.
// ---------------------------------------------------------------------------------------

interface Program {
    readonly name: string;
    /** Mount into a fresh container and hand back a disposer and the typed field. */
    readonly mount: (c: HTMLElement) => { dispose: () => void; field: HTMLInputElement };
    /** What the row is, printed under every table. */
    readonly what: string;
    /** `false` for `driver`, which by construction cannot produce the same DOM after typing. */
    readonly gated: boolean;
}

const fieldOf = (c: HTMLElement): HTMLInputElement =>
    c.querySelectorAll('input')[TYPED] as HTMLInputElement;

const floorProgram =
    (mount: (c: HTMLElement, p: Element) => FloorHandle, proto: Element) =>
    (c: HTMLElement): { dispose: () => void; field: HTMLInputElement } => {
        const h = mount(c, proto);
        return {
            field: h.fields[TYPED],
            dispose: () => {
                (h.fields[TYPED].parentNode as Element).remove();
            },
        };
    };

const exodraProgram =
    (component: TExoDomMachine, backend: TExoDomBackend & TExoCompilerApi = EXO_BACKEND) =>
    (c: HTMLElement): { dispose: () => void; field: HTMLInputElement } => {
        const dispose = backend.render(component, c);
        return { field: fieldOf(c), dispose };
    };

const PROGRAMS: readonly Program[] = [
    {
        name: 'driver',
        mount: floorProgram(mountDriver, FLOOR_PROTO_1),
        what: "the instrument's own cost — value assign + InputEvent + dispatch, NO handler",
        gated: false,
    },
    {
        name: 'floor·per-el',
        mount: floorProgram(mountFloorPerEl, FLOOR_PROTO_1),
        what: 'no framework: clone, walk, 50 listeners, a string[] model, one text write',
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
        what: 'no framework: the same, with ONE listener on the <form> and a target test',
        gated: true,
    },
    {
        name: 'exodra',
        mount: exodraProgram(FORM_EXODRA),
        what: '@exodra/forms as it ships — one listener on the <form>, readExoControlValue, an on handler',
        gated: true,
    },
    {
        name: 'exodra·bindable',
        mount: exodraProgram(FORM_BINDABLE),
        what: 'a controlled field — a model per field, written back + a recomputed read-out',
        gated: true,
    },
    {
        name: 'exodra·deleg',
        mount: exodraProgram(FORM_DELEGATED, DELEGATED_BACKEND),
        what: 'exodra·bindable, one shared handler + 50 subjects under createExoDelegatedEvents([input])',
        gated: true,
    },
    {
        name: 'exodra·free',
        mount: exodraProgram(FORM_FREE),
        what: 'exodra·bindable minus the write-back into the field — set once, then left to the browser',
        gated: true,
    },
];

/** The rows the ANSWER is allowed to take a floor from: fair programs, not the instrument. */
const FLOOR_ROWS = ['floor·per-el', 'floor·root'] as const;

// ---------------------------------------------------------------------------------------
// THE GATE. Nothing is timed until every program has been shown to produce the SAME DOM after the
// SAME keystrokes — stepped, because the sequence returns to where it started.
// ---------------------------------------------------------------------------------------

/**
 * EVERYTHING A KEYSTROKE CAN HAVE MOVED, IN THREE SEPARATELY COMPARABLE PARTS.
 *
 * `innerHTML` alone is not enough and that is the whole reason this exists: `value` on an
 * `<input>` is written as a DOM PROPERTY and a property does not serialise, so a markup-only gate
 * would pass a program that never wrote the field — and one of the programs in this file is
 * exactly that. The property AND the attribute are both read, because on this port they are two
 * different facts and the difference between them is the subject of the axis.
 *
 * THREE PARTS RATHER THAN ONE STRING, because a concatenation puts the markup first and a "first
 * difference at char N" can then only ever point INSIDE the markup. A property divergence sitting
 * two hundred characters later is invisible until the markup one is fixed, which turns one run
 * into three on a file with seven programs that can each carry the same defect independently.
 */
interface Snapshot {
    readonly markup: string;
    readonly fields: string;
    readonly readout: string;
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
    const ro = container.querySelector('.ro');
    return {
        markup: markupOf(container),
        fields,
        readout: JSON.stringify(ro === null ? null : ro.textContent),
    };
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
 * COMPARE ALL THREE PARTS AND NAME EVERY ONE THAT DIFFERS, then throw once.
 *
 * It does not stop at the first failing part, for the reason the type above gives: a run that
 * reports one defect per invocation is a run the operator has to repeat once per defect, and this
 * suite's whole discipline is that a gate should tell you everything it knows in the run that
 * found it.
 */
function throwOnDiff(who: string, stage: string, want: Snapshot, got: Snapshot): void {
    const parts: string[] = [];
    if (want.markup !== got.markup) {
        parts.push(`  MARKUP — ${firstDifference(want.markup, got.markup)}`);
    }
    if (want.fields !== got.fields) {
        parts.push(
            `  FIELDS (.value property and value attribute) — ` +
                firstDifference(want.fields, got.fields)
        );
    }
    if (want.readout !== got.readout) {
        parts.push(`  READ-OUT — exodra ${want.readout} / theirs ${got.readout}`);
    }
    if (parts.length === 0) return;
    refuse(
        `gate keystroke-floor/${who} @ ${stage}: DIFFERENT state in ${parts.length} of 3 parts\n` +
            parts.join('\n')
    );
    throw new Error(
        `keystroke-floor: "${who}" is in a different state from the reference @ ${stage} ` +
            `(${parts.length} of 3 parts differ) — the timings below would be comparing ` +
            'different programs'
    );
}

function gate(): void {
    const mounted = PROGRAMS.filter((p) => p.gated).map((p) => {
        const c = el();
        const h = p.mount(c);
        return { p, c, h };
    });
    const reference = mounted.find((m) => m.p.name === 'exodra');
    if (reference === undefined) throw new Error('keystroke-floor: no reference row');

    const check = (stage: string): void => {
        const want = snapshot(reference.c);
        for (const m of mounted) {
            if (m === reference) continue;
            throwOnDiff(m.p.name, stage, want, snapshot(m.c));
        }
    };

    check('as mounted');
    // STEPPED THROUGH A WHOLE CYCLE. An end-state check would pass a program that did nothing,
    // because step 17 returns the field to '' — `update-floor`'s lesson, on three of its five
    // transitions.
    for (let j = 0; j < SEQ.length; j++) {
        for (const m of mounted) typeOne(m.h.field, j);
        check(`after keystroke ${j + 1}/${SEQ.length} (${JSON.stringify(SEQ[j])})`);
    }
    line(
        `gate keystroke-floor: ${mounted.length} programs identical as mounted and after all ` +
            `${SEQ.length} keystrokes of a full cycle — markup, all ${FIELDS} .value properties, ` +
            `all ${FIELDS} value attributes, and the read-out`
    );
    line(
        `gate keystroke-floor: "driver" is EXCLUDED — it attaches no handler, so it cannot ` +
            'produce this state after typing, and that is what the row is for'
    );

    for (const m of mounted) {
        m.h.dispose();
        m.c.remove();
    }
}

/**
 * EVERY PROTOTYPE IN THE RUN, PRINTED BEFORE THE GATE — `mount-floor`'s caveat D, for this shape,
 * and moved ahead of the gate because on the first run it sat behind it and never printed.
 *
 * ALL OF THEM, NOT ONE. Seven programs stand on FOUR prototypes: the floor's, the floor twin's
 * independently parsed copy, and the compiled prototype of each DISTINCT composed pair among the
 * `@exodra/forms` rows — `exodra·bindable` and `exodra·free` render under the shipped composition and share
 * a schema, `exodra·deleg` names an event pack and therefore keys a schema of its own. Any one of
 * them can carry a difference independently, and a report that showed one pair at a time would make
 * the operator re-run once per difference.
 *
 * WHY THE EVENT PACK IS NOT EXPECTED TO MOVE THE MARKUP, stated so that a difference here is read
 * as news rather than as normal: the pack decides `setters[i]` for an EVENT port only
 * (`compileExoDomSchema.ts:1268-1272`), and an event port emits no attribute. The attribute
 * placeholder decision goes through `writers`, which comes from the composition's value-writers
 * slot and is the shipped one on both sides. So the two schemas should compile byte-identical
 * prototypes, and if they do not, that is a finding about the event pack and not about this axis.
 *
 * IT IS REPORTED AND NOT ENFORCED. The thing that must be identical is the FINAL STATE, and the
 * gate proves that properly and throws. A prototype difference that never reaches the output is a
 * fact about two compilers, not a reason to refuse a run — but it is the FIRST thing to look at
 * when the gate does throw, which is the whole reason it now prints first.
 */
function protoReport(): readonly string[] {
    // THE SAME TWO BACKEND OBJECTS THE ROWS RENDER THROUGH. A schema hangs off the declaration per
    // backend, by POINTER, so asking through anything else here would print a schema no mount uses.
    const direct = exoDomSchemaOf(machineOf(FORM_SCHEMA, FORM_SCHEMA_FORMS), EXO_BACKEND).proto;
    const root = exoDomSchemaOf(FORM_EXODRA, EXO_BACKEND).proto;
    const delegated = exoDomSchemaOf(
        machineOf(FORM_SCHEMA, FORM_SCHEMA_FORMS),
        DELEGATED_BACKEND
    ).proto;
    const all: readonly { readonly name: string; readonly proto: Element; readonly by: string }[] =
        [
            {
                name: 'dom·direct',
                proto: direct,
                by: 'exodra·bindable, exodra·free  ← THE REFERENCE',
            },
            { name: 'dom·root', proto: root, by: 'exodra' },
            { name: 'dom·delegated', proto: delegated, by: 'exodra·deleg' },
            {
                name: 'floor',
                proto: FLOOR_PROTO_1,
                by: 'driver, floor·per-el, floor·root',
            },
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
// THE CLOCK, OBSERVED — copied from `mount-floor`, which copied it from `teardown-phases`,
// which copied it from `toggle`, where the same clamp made
// a whole axis print the timer thirteen times. Spin until the clock moves and keep the SMALLEST
// step it ever takes.
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
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase and the SERIES handed back.
// Identical in shape to `mount-floor`'s, for its reason: this run reports DIFFERENCES and RATIOS,
// where `abBench` prints medians and returns a ranking.
//
// ONE DIFFERENCE FROM `mount-floor`'s: a phase carries a SECOND divisor, `per`. A keystroke phase
// preps ONE form and then drives `KEYS` keystrokes inside the region, so the region's length and the
// unit being reported are set by two different numbers. Dividing by `reps` alone would print
// milliseconds per thousand keystrokes and call it a keystroke.
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
    /** Units per scenario: `KEYS` for a keystroke phase, 1 for a mount. */
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
 * FORTY AND NOT TWENTY, AND THE REASON IS ARITHMETIC RATHER THAN TASTE. This form is 52 elements
 * against the 641 of the app `mount-floor` measures, where `clone+refs` came out at 0.2137 ms (A
 * CITATION from that axis, not something measured here) — so a clone-and-walk of this form is of
 * the order of 0.02 ms, and the CHEAPEST row here (`driver`, which clones and walks and attaches
 * nothing) is under that. At twenty reps its region would land near three ticks of a 0.1 ms clock,
 * which is exactly the boundary the run refuses at, and the operator would be asked to re-run the
 * whole axis for a table that could have cleared the clock the first time.
 *
 * IT COSTS NOTHING BUT WALL TIME. Forty forms stand at once inside a region, which is ~2000 live
 * elements — nothing beside `teardown-floor`'s 51,000 — and the batch multiplies it if the clock
 * still refuses.
 */
const MOUNT_REPS = 40;

// ---------------------------------------------------------------------------------------

export function benchmarkKeystrokeFloor(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY. Four is right for a row that takes a fifth of a millisecond
    // and wrong for a quantity whose whole job is to be small.
    const f6 = (x: number): string => x.toFixed(6);
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const quantum = observeTimerQuantum();
    line(
        `keystroke-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── THE PROTOTYPES, THEN THE GATE ───────────────────────────────────────────────────
    //
    // THIS ORDER IS A FIX. On the first run the report came AFTER the gate, so when the gate threw
    // on a prototype difference — the renderer's inputs carry ` value=""` and the floor's did not —
    // the one block that would have explained it never printed at all, and the failure had to be
    // read backwards out of a mount diff. A report that only prints when nothing went wrong is not
    // a report.
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
    line(`  fields on the form           ${FIELDS}  (the typed one is index ${TYPED})`);
    line(`  elements in the finished DOM ${ELEMENTS}  (1 form + ${FIELDS} inputs + 1 read-out)`);
    line(`  keystrokes per timed region  ${KEYS}  (${KEYS / SEQ.length} cycles of ${SEQ.length})`);
    line(
        `  the cycle                    ${JSON.stringify(SEQ.slice(0, 3))} … ` +
            `${JSON.stringify(SEQ.slice(-2))} — grow to ${WORD.length}, delete back to empty`
    );

    // ── THE KEYSTROKE TABLE ─────────────────────────────────────────────────────────────
    const keyReps = Math.max(1, batch);
    const keyPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: keyReps,
        per: KEYS,
        what: p.what,
        prep: (): Scenario => {
            // THE MOUNT IS UNTIMED. This table measures typing, not building.
            const c = el();
            const h = p.mount(c);
            return {
                measure: () => {
                    typeMany(h.field);
                },
                cleanup: () => {
                    h.dispose();
                    c.remove();
                },
            };
        },
    }));

    const keySeries = runPhases(keyPhases, rounds);
    const keyStats = new Map<string, Stat>();
    for (const p of keyPhases) keyStats.set(p.name, stat(keySeries.get(p.name) as number[]));
    /** Microseconds per keystroke. */
    const keyUs = (name: string): number => (keyStats.get(name) as Stat).median * 1000;

    line('');
    line(
        `KEYSTROKE — one character into one field of a ${FIELDS}-field form [µs per keystroke] · ` +
            `interleaved · ${rounds} rounds · batch ${batch} · ${KEYS * keyReps} keystrokes per ` +
            'timed region · GC before every timed region'
    );
    line('                       reps   min      p25      median   p75      max');
    for (const p of keyPhases) {
        const s = keyStats.get(p.name) as Stat;
        const us = (x: number): string => (x * 1000).toFixed(4);
        line(
            `${p.name.padEnd(19)}${String(p.reps).padStart(6)}   ${us(s.min)}   ${us(s.p25)}   ` +
                `${us(s.median)}   ${us(s.p75)}   ${us(s.max)}`
        );
    }
    line('');
    for (const p of keyPhases) line(`  ${p.name.padEnd(19)} ${p.what}`);

    // ── THE MOUNT TABLE ─────────────────────────────────────────────────────────────────
    //
    // IT IS HERE BECAUSE THE DELEGATED STRATEGY CANNOT BE JUDGED WITHOUT IT. Per keystroke
    // delegation can only add a walk; everything it buys is at mount, and a run that printed the
    // keystroke table alone would be a rigged verdict on the one strategy the brief named.
    const mountReps = MOUNT_REPS * Math.max(1, batch);
    const mountPhases: readonly Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: mountReps,
        per: 1,
        what: p.what,
        prep: (): Scenario => {
            const c = el();
            let handle: { dispose: () => void; field: HTMLInputElement } | null = null;
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
        `MOUNT — building the same ${FIELDS}-field form [ms per mount] · interleaved · ` +
            `${rounds} rounds · batch ${batch} · ${mountReps} mounts per timed region · GC before ` +
            'every timed region'
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
    const keyNull = pairedNull(
        keySeries.get('floor·per-el') as number[],
        keySeries.get('floor·per-el·twin') as number[]
    );
    const mountNull = pairedNull(
        mountSeries.get('floor·per-el') as number[],
        mountSeries.get('floor·per-el·twin') as number[]
    );
    /** In µs, to match the keystroke table. */
    const keyResolutionUs = keyNull.resolution * 1000;
    const mountResolution = mountNull.resolution;

    line('');
    line('THE CONTROL — what this run resolved, from a pair of duplicated declarations');
    line('  null            bias      noise     p75       worst     what it is');
    const nullRow = (name: string, n: Null, scale: number, what: string): void =>
        line(
            `  ${name.padEnd(14)}${f6(n.bias * scale)}  ${f6(n.noise * scale)}  ` +
                `${f6(n.noiseP75 * scale)}  ${f6(n.worst * scale)}  ${what}`
        );
    nullRow('keystroke', keyNull, 1000, '|floor·per-el − its twin| per keystroke, true Δ = 0 (µs)');
    nullRow('mount', mountNull, 1, '|floor·per-el − its twin| per mount, true Δ = 0 (ms)');
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. Bias alone can cancel at the median and read as a perfect instrument; noise ' +
            'cannot, and it is the scatter every comparison in these tables carries, null or not.'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(keyResolutionUs)} µs per keystroke and ` +
            `${f6(mountResolution)} ms per mount. Read every figure below against these and not ` +
            'against zero; anything smaller is what this instrument returns when nothing is there.'
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    const driver = keyUs('driver');
    const exodra = keyUs('exodra·bindable');
    const shipped = keyUs('exodra');
    const deleg = keyUs('exodra·deleg');
    const free = keyUs('exodra·free');
    const floorPick = FLOOR_ROWS.map((n) => ({ name: n as string, v: keyUs(n) })).reduce((a, b) =>
        b.v < a.v ? b : a
    );
    const floor = floorPick.v;

    /** With the instrument's own cost taken off both sides — see the header on the common addend. */
    const net = (x: number): number => x - driver;
    const rawRatio = exodra / Math.max(floor, 1e-9);
    const netRatio = net(exodra) / Math.max(net(floor), 1e-9);
    const headroom = ((exodra - floor) / Math.max(exodra, 1e-9)) * 100;
    const netHeadroom = ((net(exodra) - net(floor)) / Math.max(net(exodra), 1e-9)) * 100;

    line('');
    line('ANSWER — and read the header before quoting any of it');
    line(
        `  the floor is "${floorPick.name}" at ${f4(floor)} µs per keystroke; the other floor ` +
            `spelling measured ${f4(
                FLOOR_ROWS.map((n) => keyUs(n)).reduce((a, b) => (b > a ? b : a))
            )} µs`
    );
    line(
        `  the instrument itself ("driver") is ${f4(driver)} µs of that — ` +
            `${pct(driver, floor)} of the floor and ${pct(
                driver,
                exodra
            )} of the bindable shape. It ` +
            'is a COMMON ADDEND: it is in every row, so it makes every raw ratio SMALLER than the ' +
            'truth.'
    );
    line(
        `  the bindable shape is ${f4(exodra)} µs — ${rawRatio.toFixed(2)}× the floor raw, ` +
            `${netRatio.toFixed(2)}× with the driver subtracted from both sides. ` +
            `${headroom.toFixed(1)}% of a keystroke is above the floor raw, ` +
            `${netHeadroom.toFixed(1)}% net.`
    );
    line(
        `  the delegated strategy is ${f4(deleg)} µs per keystroke ` +
            `(${(deleg / Math.max(exodra, 1e-9)).toFixed(2)}× the bindable shape) and ` +
            `${f4(mountMs('exodra·deleg'))} ms per mount ` +
            `(${(mountMs('exodra·deleg') / Math.max(mountMs('exodra·bindable'), 1e-9)).toFixed(
                2
            )}× ` +
            'the bindable shape). It is a MOUNT strategy: per keystroke it can only add the ' +
            "dispatcher's walk."
    );
    line(
        `  the uncontrolled strategy is ${f4(free)} µs per keystroke ` +
            `(${(free / Math.max(exodra, 1e-9)).toFixed(2)}× the bindable shape, ` +
            `${(free / Math.max(floor, 1e-9)).toFixed(2)}× the floor). THE DIFFERENCE FROM ` +
            `the bindable shape IS ONE \`el.value = v\` PER KEYSTROKE: ${f4(exodra - free)} µs, ` +
            `${pct(Math.abs(exodra - free), exodra)} of a keystroke.`
    );
    line(
        `  @exodra/forms AS IT SHIPS is ${f4(shipped)} µs per keystroke — ` +
            `${(shipped / Math.max(keyUs('floor·root'), 1e-9)).toFixed(2)}× floor·root, ` +
            `${(shipped / Math.max(exodra, 1e-9)).toFixed(2)}× the bindable shape — and ` +
            `${f4(mountMs('exodra'))} ms per mount against floor·root's ` +
            `${f4(mountMs('floor·root'))} ms and the bindable shape's ` +
            `${f4(mountMs('exodra·bindable'))} ms.`
    );
    if (free < exodra - keyResolutionUs) {
        refuse(
            'keystroke-floor: "exodra·free" is faster BECAUSE IT DOES LESS, and what it stopped ' +
                'doing has a name — writing the field FROM the model. A page that takes this ' +
                'strategy gives up the programmatic clear, the trim, the rejected character and ' +
                'the restored draft. Quote it as a TRADE, never as a free win.'
        );
    }

    // ── THE FALSIFIERS, PRINTED MECHANICALLY SO NOBODY CHOOSES AFTERWARDS ───────────────
    line('');
    line('THE PREDICTION, JUDGED — committed in the header before the first run');
    const verdict = (id: string, failed: boolean, claim: string): void =>
        line(`  ${failed ? 'FAILED ' : 'held   '}${id}  ${claim}`);
    verdict(
        'P1',
        !(netRatio >= 1.6 && netRatio <= 3.0),
        `exodra·bindable/floor net between 1.6 and 3.0 — measured ${netRatio.toFixed(2)}×` +
            (netRatio < 1.15
                ? '  (falsifier (a): the handler is browser-bound and the bookkeeping is free)'
                : netRatio > 4.0
                ? '  (falsifier (b): more than three quarters of a keystroke is ours)'
                : '')
    );
    verdict(
        'P2',
        !(exodra - free > keyResolutionUs),
        `exodra·free below exodra·bindable past the ${f6(keyResolutionUs)} µs floor — measured ` +
            `${f4(exodra - free)} µs` +
            (exodra - free > keyResolutionUs
                ? ''
                : '  (falsifier (c): the write-back is free at this scale and this ' +
                  "repository's claim about a controlled field does not stand on this run)")
    );
    verdict(
        'P3a',
        !(deleg > exodra + keyResolutionUs),
        `exodra·deleg ABOVE exodra·bindable per keystroke — measured ${f4(deleg - exodra)} µs` +
            (deleg > exodra + keyResolutionUs
                ? ''
                : "  (falsifier (d): the dispatcher's walk is cheaper than a per-element " +
                  "registration's dispatch)")
    );
    verdict(
        'P3b',
        !(mountMs('exodra·deleg') < mountMs('exodra·bindable') - mountResolution),
        `exodra·deleg BELOW exodra·bindable at mount — measured ` +
            `${f4(mountMs('exodra·bindable') - mountMs('exodra·deleg'))} ms` +
            (mountMs('exodra·deleg') < mountMs('exodra·bindable') - mountResolution
                ? ''
                : `  (falsifier (d): delegation's one advertised advantage does not appear at ` +
                  `${FIELDS} elements, and the size at which it does is unknown)`)
    );
    verdict(
        'P4',
        !(driver > floor * 0.5),
        `driver more than half of a floor keystroke — measured ${pct(driver, floor)}` +
            (driver < floor * 0.25
                ? '  (falsifier (e): the JS is the cost and the raw ratios are readable ' +
                  'without correction)'
                : '')
    );

    // ── THE REFUSALS ────────────────────────────────────────────────────────────────────
    //
    // Every one of them PRINTS rather than throws, deliberately, so one unreadable table does not
    // take a readable one down with it — the rule the whole floor family follows.

    // THE NESTING. Every keystroke row is `driver` PLUS a handler, so nothing may measure below it.
    for (const p of PROGRAMS) {
        if (p.name === 'driver') continue;
        const v = keyUs(p.name);
        if (v >= driver - keyResolutionUs) continue;
        refuse(
            `keystroke-floor: "${p.name}" (${f4(v)} µs) measured CHEAPER than "driver" ` +
                `(${f4(driver)} µs) by ${f4(driver - v)} µs, past the resolution floor ` +
                `(${f6(keyResolutionUs)} µs), though it does everything the driver does and then ` +
                'runs a handler. That is not a saving, it is the instrument — the ladder does ' +
                'not nest and every subtraction on this table is unreadable. Raise `rounds`, ' +
                'then the batch.'
        );
    }

    // THE NULL AGAINST THE CLAIM IT SUPPORTS. A null that is a large fraction of the smallest
    // difference the tables are asked to resolve means the run printed an ordering, not sizes.
    const smallestClaim = Math.min(Math.abs(exodra - free), Math.abs(deleg - exodra));
    if (keyResolutionUs > smallestClaim * 0.25) {
        refuse(
            `keystroke-floor: the keystroke null resolved ${f6(keyResolutionUs)} µs where the ` +
                `smallest difference this table is asked for is ${f4(smallestClaim)} µs — this ` +
                'run cannot separate the strategies from each other, so the rows above are an ' +
                'ordering and not a set of sizes. Raise `rounds`, or raise the batch.'
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
                `keystroke-floor: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    '`npm run axis --workspace=@exodra/benchmarks -- keystroke-floor ' +
                    `${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(keyPhases, keyStats, 'KEYSTROKE');
    checkClock(mountPhases, mountStats, 'MOUNT');

    // AND THE ONE THING NO NUMBER ON THIS PAGE COVERS, printed every run so it cannot be forgotten
    // between reading the table and quoting it.
    line('');
    line(
        "WHAT THIS RUN DID NOT MEASURE: the browser's own edit machinery, `beforeinput`, " +
            'composition and IME, caret and selection, autofill, anything after the handler ' +
            'returns (style, layout, paint), and human typing rate. Every event above was ' +
            'synthetic, `isTrusted: false`, and dispatched as fast as the machine allows.'
    );
}
