// AXIS 1 — INITIAL RENDER: cost of MOUNTING the todo app from scratch — THE app the app-update
// axis then updates (so mount cost and update cost are measured on ONE app, not two). 10 decks of
// 8 cards each — 80 cards in all, the population the app has always had, now one level deeper. 80
// cards,
// each with a details toggle + a dynamic tag list; the list is genuine reactive state in every
// framework. Each framework mounts via its own API; the timed region is the mount. Reports heap.
// Exodra's own implementation is `apps/exodra/exodra.tsx`, the third-party field's is
// `todo-app.tsx`.
//
// The core in `@exodra/core` + `@exodra/dom` is a participant here as well as on its own
// `exodra-initial-render` axis, and the two overlap now that Lit and Mikado are
// registered here too. What still separates them: THIS axis is the whole field a user chooses
// between (Solid, Svelte, React, voby, Marko, Lit, Mikado); the other one adds the rows that
// need a paragraph before they can be read — `mikadoReactive` (Mikado's own reactive idiom, which
// cannot produce the reference's bytes) and Angular. Same app, same mount, same gates.
//
// The per-participant MARKUP GATES live with the participants (`participants/lit/app.tsx`,
// `participants/mikado/app.tsx`, `participants/angular/app.ts`, …), each diffing its own tree
// against the reference app's. The five this axis takes from `loadMounts()` — svelte, marko,
// solid, react, voby — cannot host a gate of their own (the timed function is the loader entry,
// not the component), so theirs live in `svelte-marko-gate.ts` and `solid-react-voby-gate.ts` and
// take the mount as an argument. EVERY gate, wherever it is written, is CALLED below, in the
// process that produces these numbers.
//
// ═══ THE ONE EXODRA ROW, AND WHAT WENT ═══
//
// THERE IS ONE EXODRA PARTICIPANT HERE AND IT IS THE IMPERATIVE MACHINE — `{ schema, machine }`,
// no props and no instance index, its state moved off its declared start by ONE TRANSITION per
// card, both children ports filled by declared fills, the two clicks reaching declared
// transitions. It is also this suite's MARKUP REFERENCE: every other participant's tree is
// diffed against the one it mounts.
//
// THREE EXODRA ROWS LEFT THIS TABLE AND EVERY SUBTRACTION THAT NAMED THEM LEFT WITH THEM.
//
//   the BINDABLE row — what the app cost written the REACTIVE way: a cell per card per varying
//     thing, a reactive list for the details block and for the tag list, a click writing a cell.
//     Nothing here prices that idiom any more, and that is an UNMEASURED GAP, not a result.
//   the WIRE row — the same markup written by two handler closures per card instead of a program.
//     It was the left-hand side of this axis's one prediction, which is withdrawn below.
//   the BANKED row — not a way of writing the app but the bindable row with the node bank
//     composed under it. With that app gone it has nothing to render, and it is NOT re-pointed at
//     the row that survived: a bank over a different program has a hit rate nobody has measured.
//
// READ THE NUMBER WITH THE NINETY SEEDING TRANSITIONS IN HAND. The row fires one transition per
// instance at two levels — ten decks, eighty cards — and each is a commit that re-derives what the
// arm had already painted from the declared values. That is what a machine pays instead of props,
// because a machine takes none.
//
// WHAT THAT COSTS THIS TABLE, SAID PLAINLY: the Exodra row constructs a BARE backend
// (`new ExoDomBackend()`, no plugins at all) while `mikado` beside it is deliberately tuned —
// `new Mikado(TAG, { pool: true, cache: true })`, "the three settings Mikado's own best practices
// name for a keyed list". This suite's rule is that every participant runs in ITS OWN idiomatic
// best practice, and no row here shows what an Exodra user composes to get what Mikado's `pool`
// gives it.
import { loadMounts, el, type Mounts } from '../../participants/bundled/todo-app';
import { mountExodraApp } from '../../participants/exodra/app';
// LIT AND MIKADO ARE HERE, and they are not new implementations: they are the SAME two
// participants `exodra-initial-render` already runs, on the same app, through the same gates.
// They were implemented and then never registered on this axis, so the two axes a reader is
// most likely to quote had never compared Exodra against either of them.
//
// Neither needs `loadMounts()`, and neither pulls a runtime this axis was not already loading:
// `lit` is `lit-html`'s standalone `render()` and `mikado` is one 40 kB library. Their gates
// mount the reference app (`apps/exodra/exodra.tsx`) directly rather than through `loadMounts()`, so
// running them here adds no framework to the process.
import { mountLitApp, verifyLitApp } from '../../participants/lit/app';
import { mountMikadoApp, verifyMikadoApp } from '../../participants/mikado/app';
// THE THREE CLOSEST ARCHITECTURAL RELATIVES OF THE SCHEMA CORE, all of them "template plus
// wiring": build the markup once, find the holes, write into them.
//
//   stage0  — the minimal hand-rolled form, and the CEILING for this whole family: clone a
//             prepared node, walk it once, keep the references, write directly. No reactivity, no
//             components, 570 bytes. Every other row on this axis is that program plus whatever
//             its library does for you, so `stage0` is the number those additions are subtracted
//             from. It is not a framework recommendation; see `apps/stage0/stage0.md`.
//   uhtml   — the `parts` model in its lightest form: a tagged template parsed once into a
//             fragment plus a list of holes, each hole reached by a recorded PATH rather than by
//             re-walking the clone the way Lit does. See `apps/uhtml/uhtml.md`.
//   sinuous — template plus FINE-GRAINED REACTIVITY, and the one member of the family with no
//             prepared template at all: `h()` builds the tree element by element and a function
//             child or prop becomes a subscription. It is the honest control for the claim that
//             cloning a prototype beats building the same tree. See `apps/sinuous/sinuous.md`.
//
// None of them pulls a runtime this axis was not already able to load (stage0 is 570 B, uhtml
// ~2.5 kB, sinuous ~1.4 kB gzip) and none has a module-scope side effect of the kind that made
// this suite import Solid lazily. Their gates mount the reference app directly, like Lit's and
// Mikado's.
import { mountStage0App, verifyStage0App } from '../../participants/stage0/app';
import { mountUhtmlApp, verifyUhtmlApp } from '../../participants/uhtml/app';
import { mountSinuousApp, verifySinuousApp } from '../../participants/sinuous/app';
// THE FIVE `loadMounts()` PARTICIPANTS' GATES. Svelte, Marko, Solid, React and voby are mounted
// from `loadMounts()` in `todo-app.tsx` and were therefore the participants on this axis whose
// markup was never diffed against the reference — `scripts/verify-structure.mjs` compares element
// COUNTS, and a count cannot see a text node, an attribute, or anything at all after an update.
// Their gates live in files of their own because the function this axis TIMES is the `loadMounts()`
// entry (it owns each framework's synchronous flush), not the component; both files take that mount
// as an argument and both call the one diff loop in `svelte-marko-gate.ts`. See that file for what
// the count-only check hid for the suite's whole life, and `solid-react-voby-gate.ts` for the three
// stages and for what the comment strip does and does not forgive in each of these three.
import { verifySvelteApp, verifyMarkoApp } from '../../gates/svelte-marko-gate';
import {
    verifySolidApp,
    verifyReactApp,
    verifyPreactApp,
    verifyMillionApp,
    verifyVobyApp,
} from '../../gates/solid-react-voby-gate';
// WHAT THIS AXIS NO LONGER HAS, and it is worth naming so nobody proposes it again as though it
// were free: a row that ran THIS repository's schema on stage0's own primitives, so that
// `exodraViaStage0` − `stage0` would isolate the abstraction with the renderer held constant.
// That row needed a second full backend — `@exodra/stage0-backend` — and that package has been
// deleted. Every pairing left on this axis differs by two things at once (the abstraction AND the
// renderer under it), so "abstractions must cost zero" is again a paragraph here rather than a
// number, and the number lives on the floor axes instead.
import { abBench, type AbRow, type Scenario } from '../../../harness';
import { appLines } from '../../shared/app-lines';

export async function benchmarkInitialRender(rounds = 100, batch = 5): Promise<void> {
    const mounts = await loadMounts();

    // GATE — every participant this axis times, diffed against the reference app's tree, mounted
    // AND after an update round, and it runs HERE, in the process that produces these numbers — a
    // precondition enforced only in some other runner is not a precondition.
    //
    // EVERY LOADER-MOUNTED PARTICIPANT IS IN THE LIST NOW — svelte, marko, solid, react and voby.
    // Until they were, they were covered only by `scripts/verify-structure.mjs`, which counts
    // structural nodes. A count cannot see a text node, and Svelte collapses whitespace between
    // elements to a single space rather than dropping it — so an indented card template put four
    // space text nodes in every `.card`, 320 across the app, and nothing here could tell. The same
    // blindness covered solid, react and voby, whose three DERIVED VALUES (two texts and an
    // attribute) a count cannot see at all; `solid-react-voby-gate.ts` closes that.
    //
    // MIKADO'S GATE IS EXPECTED TO PASS HERE. `apps/mikado/mikado.tsx` is the hand-written variant,
    // which registers no event route and therefore leaves no `click="…"` attribute in the
    // markup; it is `apps/mikado/mikado-reactive.tsx` that cannot produce the reference's bytes,
    // and that participant is deliberately NOT on this axis. See
    // `apps/mikado/mikado-reactive.md` for the full account.
    const diverged: string[] = [];
    for (const [name, verify] of [
        ['lit-app', verifyLitApp],
        ['mikado-app', verifyMikadoApp],
        // The three new arrivals go through the SAME two diffs, unwidened. What each of them
        // leaves in the DOM that the reference does not is stated in its own header: stage0 and
        // sinuous leave nothing that serialises (sinuous marks a reactive position with an EMPTY
        // TEXT NODE, which `innerHTML` renders as no characters at all), and uhtml leaves one
        // `<!--◦-->` anchor per array hole, which is the comment class `markup-gate.ts` has
        // stripped from both sides since it was written.
        ['stage0-app', verifyStage0App],
        ['uhtml-app', verifyUhtmlApp],
        ['sinuous-app', verifySinuousApp],
        // THE TWO COMPILED PARTICIPANTS, gated for the first time — on the mount `loadMounts()`
        // hands this axis, so what is diffed is the function that is timed and not a second mount
        // written for the gate. They take a third diff (a second update round) for the reason
        // `apps/exodra/exodra.md` states: one round moves every card in one direction only.
        ['svelte-app', () => verifySvelteApp(mounts.svelte)],
        ['marko-app', () => verifyMarkoApp(mounts.marko)],
        // THE LAST THREE THAT WERE COUNT-ONLY — solid, react and voby — gated for the first time,
        // on the `loadMounts()` entries this axis times, through the same loop svelte and marko go
        // through and at the same three stages. Nothing here is widened for them: solid's `<!>`
        // placeholders and voby's `createComment()` placeholders are the comment class
        // `markup-gate.ts` has stripped from both sides since it was written, and React leaves no
        // comment in the client tree at all. `solid-react-voby-gate.ts` argues the third stage and
        // says why the older five below should take it too.
        ['solid-app', () => verifySolidApp(mounts.solid)],
        ['react-app', () => verifyReactApp(mounts.react)],
        ['preact-app', () => verifyPreactApp(mounts.preact)],
        ['react-compat-app', () => verifyReactApp(mounts.reactCompat, 'react-compat-app')],
        [
            'react-compat-templates-app',
            () => verifyReactApp(mounts.reactCompatTemplates, 'react-compat-templates-app'),
        ],
        [
            'react-compat-compiled-app',
            () => verifyReactApp(mounts.reactCompatCompiled, 'react-compat-compiled-app'),
        ],
        [
            'react-compat-calls-app',
            () => verifyReactApp(mounts.reactCompatCalls, 'react-compat-calls-app'),
        ],
        ['million-app', () => verifyMillionApp(mounts.million)],
        ['react-compiler-app', () => verifyReactApp(mounts.reactCompiler, 'react-compiler-app')],
        ['voby-app', () => verifyVobyApp(mounts.voby)],
        // THE DIRECT ROW GOES THROUGH THE SAME TWO DIFFS AS EVERY OTHER PARTICIPANT, and it
        // takes a third one besides (a second update round) — see its own header for what only the
        // second round can catch. It shares the reference's SCHEMAS, so a divergence here can only
        // come from the region commands, which is exactly what the gate is being asked about.
        // THE MACHINE ROW, THROUGH THE SAME DIFFS AND A THIRD OF ITS OWN, unwidened. It shares the
        // reference's `TAG` and `DETAILS` and re-declares only the CARD's schema — the same eight ports
        // in the same order — so this gate is what proves the schema did not drift while the wiring
        // was rewritten, and that the machine's four derivations put the same bytes in `data-i`, the
        // the title that `c.set` puts there.
    ] as Array<[string, () => Promise<boolean>]>) {
        if ((await verify()) === false) diverged.push(name);
    }
    if (diverged.length > 0) {
        throw new Error(
            `initial-render: ${diverged.join(' and ')} produce different markup from the ` +
                'reference app — the timings below would be comparing different programs'
        );
    }

    const prep = (make: Mounts[keyof Mounts]) => (): Scenario => {
        const c = el();
        let app: { teardown(): void };
        return {
            measure: () => {
                app = make(c);
            }, // the timed op: build + mount the app
            cleanup: () => {
                app.teardown();
                c.remove();
            },
        };
    };
    const heap = (make: Mounts[keyof Mounts]) => (): (() => void) => {
        const c = el();
        const app = make(c);
        return () => {
            app.teardown();
            c.remove();
        };
    };

    // THE CENSUS, PRINTED BEFORE THE TABLE — what each of the two Exodra cards allocates per
    // instance, COUNTED FROM SOURCE and labelled as counted rather than measured. P·MOUNT's mechanism
    // is allocation counts, and a countable claim belongs under the rows it is about.

    await abBench(
        'INITIAL RENDER — mount the 10-deck / 80-card todo app ' +
            '(deck rename + details toggle + dynamic tag lists)',
        'ms/mount',
        {
            // DECLARED FIRST because it is also this suite's markup reference: every other row here
            // is diffed against the tree it mounts. The whole card is a MACHINE — its values, its
            // state and its two children ports — and there is no second Exodra row to pair it with.
            exodra: prep(mountExodraApp),
            solid: prep(mounts.solid),
            svelte: prep(mounts.svelte),
            react: prep(mounts.react),
            preact: prep(mounts.preact),
            reactCompat: prep(mounts.reactCompat),
            reactCompatTemplates: prep(mounts.reactCompatTemplates),
            reactCompatJsx: prep(mounts.reactCompatCompiled),
            reactCompatCalls: prep(mounts.reactCompatCalls),
            million: prep(mounts.million),
            reactCompiler: prep(mounts.reactCompiler),
            voby: prep(mounts.voby),
            marko: prep(mounts.marko),
            lit: prep(mountLitApp),
            mikado: prep(mountMikadoApp),
            // `stage0` is the CEILING, not a competitor — read every row above it as "stage0 plus
            // what that library does for you". See `apps/stage0/stage0.md`.
            stage0: prep(mountStage0App),
            uhtml: prep(mountUhtmlApp),
            sinuous: prep(mountSinuousApp),
        } as never,
        {
            rounds,
            batch,
            // WHAT THE APP COST EACH PARTICIPANT TO WRITE, beside what it costs to mount. Every row
            // here builds the same tree and is gated byte for byte before anything is timed, so the
            // only thing this column can be about is what the library made its author write. The
            // mapping is written out rather than inferred from the row name, because a row name is
            // this axis's label and not always the participant's.
            appLines: appLines({
                exodra: 'exodra',
                solid: 'solid',
                svelte: 'svelte',
                react: 'react',
                preact: 'react',
                reactCompat: 'react',
                reactCompatTemplates: 'react',
                reactCompatJsx: 'reactJsx',
                reactCompatCalls: 'react',
                million: 'reactJsx',
                reactCompiler: 'reactJsx',
                voby: 'voby',
                marko: 'marko',
                lit: 'lit',
                mikado: 'mikado',
                stage0: 'stage0',
                uhtml: 'uhtml',
                sinuous: 'sinuous',
            }),
            // STATED FOR THE RECORDER, which is what carrying the column requires: a scraped table
            // is read back by matching patterns against the printed line, and this one now has a
            // column more than that ladder knows. The section is `null` so the rows record under
            // the bare names they have always recorded under.
            record: { section: null, unit: 'ms', per: 'mount' },
            heap: {
                // No cell per card, no subscriber set and no disposer list above the shared `TAG`;
                // what it does retain is one state object per card and its value table.
                exodra: heap(mountExodraApp),
                solid: heap(mounts.solid),
                svelte: heap(mounts.svelte),
                react: heap(mounts.react),
                preact: heap(mounts.preact),
                reactCompat: heap(mounts.reactCompat),
                reactCompatTemplates: heap(mounts.reactCompatTemplates),
                reactCompatJsx: heap(mounts.reactCompatCompiled),
                reactCompatCalls: heap(mounts.reactCompatCalls),
                million: heap(mounts.million),
                reactCompiler: heap(mounts.reactCompiler),
                voby: heap(mounts.voby),
                marko: heap(mounts.marko),
                lit: heap(mountLitApp),
                mikado: heap(mountMikadoApp),
                stage0: heap(mountStage0App),
                uhtml: heap(mountUhtmlApp),
                sinuous: heap(mountSinuousApp),
            } as never,
        }
    );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// P·MOUNT — WITHDRAWN, BECAUSE THE PAIR IT WAS ABOUT IS ONE ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE CLAIM WAS: the machine row mounts cheaper than the hand-written wire row. It was judged by
// subtracting two medians, and there is now ONE Exodra row — the machine — because the wire form of
// the app was deleted rather than kept beside it. A prediction whose left-hand side no longer
// exists cannot hold and cannot fail, and the verdict that printed its direction is gone with it.
//
// IT IS NOT RESTATED AGAINST ANOTHER ROW. Whoever declares a second Exodra app here — a wire form,
// or a twin on its own backend — writes the prediction again, before the run, and not from this.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// P·MOUNT·SPREAD — WITHDRAWN, BECAUSE ITS SUBJECT LEFT THE TABLE
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE CLAIM WAS: the mount table separates the rows that pay for the right to recompute from the
// rows that simply recompute. Its mechanism was setup cost per derived value, and the row that
// carried that cost — a derivation object, a subscription and a disposer per value per card — IS NOT A
// PARTICIPANT ON THIS AXIS ANY MORE. The one Exodra row left pays per COMPONENT once, at module
// load, so there is no left-hand side.
//
// IT IS NOT RESTATED OVER THE ROWS THAT ARE LEFT. A prediction rewritten to suit the rows that
// survived it is not a prediction. Whoever puts a per-value-per-card row back on this axis puts
// this block back with it, unchanged.
