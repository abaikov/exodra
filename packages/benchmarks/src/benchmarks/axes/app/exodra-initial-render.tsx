// AXIS — EXODRA INITIAL RENDER: what the schema core in `@exodra/core` + `@exodra/dom` costs to
// MOUNT the 80-card todo app, against Solid, Marko, Lit and Mikado, on the very same app
// (`apps/exodra/exodra.tsx` for Exodra, `todo-app.tsx` for the third-party field).
//
// The schema core expresses a component as a shape declared ONCE at module load and numbered,
// plus a wiring function that fills ports by identity. Nothing walks at render time — a port's
// address is known, so an instance is a clone, a replay of a fixed hop list, and the wiring
// call.
//
// Marko is here because it is the one in the field that addresses a position in a cloned
// template most aggressively — a hand-rolled step walk over run-length-compressed paths —
// which makes it the honest bar for a renderer whose whole claim is about that. Solid is the
// compiler baseline.
//
// Angular is the closest ARCHITECTURAL neighbour rather than a popularity entry: its `LView` is
// a flat array, its compiler hands every node in a template a slot index, and `ɵɵadvance(n)`
// bumps an index instead of walking — the same bet this core makes with numbered ports. Read
// `participants/angular/app.ts` before reading its number: its mount really is synchronous and
// complete inside the timed region, but its UPDATE (the other axis) is dirty-checking, not
// fine-grained dispatch, and that is written out there in full.
//
// LIT and MIKADO bracket this core's claim from its two sides. Lit is the closest neighbour
// WITHOUT a compiler: it prepares each template once per call site and then re-walks every clone
// with a `TreeWalker`, counting nodes, to find that instance's parts — the walk this core says is
// unnecessary. Mikado is the closest neighbour BY ADDRESS FORMAT: its dynamic positions are
// integer indices into a per-instance path array that is memoised on the DOM node, so a pooled
// node costs nothing to re-address. Neither was tuned up or down; `apps/lit/lit.md`
// and `apps/mikado/mikado.md` name every place their own idiom could not express this app and what
// was written instead.
//
// MIKADO IS HERE TWICE, and the pair is the point. `mikado` uses the library as a template
// instantiator and a keyed list differ and hand-writes the rest of the app — no observation
// anywhere, which is Mikado's CEILING rather than Mikado's idiom. `mikadoReactive` is the same
// app written the way Mikado's own README says to write one: reactive `{{= }}` properties through
// its Proxy, a `Mikado.Array` observable per tag list, and its routing for the clicks. One row
// cannot say what a framework's reactivity costs, because there is nothing to subtract it from;
// two can. Read `apps/mikado/mikado-reactive.md` for what Mikado could NOT express
// reactively here, and for the markup its routing leaves in the tree.
//
// All of them run through `abBench`, so they are INTERLEAVED in one run with the order rotated
// per round: a load spike or a GC pause cannot land on one only. The timed region is the mount;
// setup and teardown are outside it.
//
// ═══ THE SCHEMA CORE IS HERE AS TWO WAYS OF SPELLING THE SAME APP ═══
//
//   `exodraDirect`  the WIRE row: `c.set` at wire time, and the two children ports held as
//                   REGIONS (`c.childList`) that the card's own handlers command. No cell, no
//                   subscription, no disposer, no diff above the shared `TAG`. It is also this
//                   axis's markup reference — every other participant's tree is diffed against it.
//   `exodraMachine` the STATE MACHINE row: the whole card compiled — values, state AND children —
//                   through `@exodra/core`'s machine, advanced by transitions.
//
// Both are the SAME SCHEMAS — `TAG` and `DETAILS` are imported from `apps/exodra/exodra-shared.tsx` by
// every Exodra row here and re-declared by none — so what separates the rows is the wiring and
// nothing else. What the direct row gives up is named in `apps/exodra/exodra.md`: its card
// names `TExoDomNode` and is therefore browser-only.
//
// THE BINDABLE ROW (`exodra`) IS GONE FROM THIS AXIS. Every subtraction that was written as
// `exodra − exodraDirect` — what the reactive idiom costs to mount — has no left-hand side now
// and is not printed anywhere below.
//
// STAGE0 IS NOT A PARTICIPANT ON THIS AXIS — it is on `initial-render`, which mounts the same app
// with the same gates and where both Exodra rows also appear. So the "how far above the
// hand-written ceiling" question is answered there, on one table, and this axis stays what it is:
// the schema core against its closest architectural neighbours.
import { loadMounts, el, type AppHandle } from '../../participants/bundled/todo-app';
import { mountExodraApp } from '../../participants/exodra/app';
// AND THE THIRD SPELLING OF THE SAME APP, WHOSE MACHINERY HAD NEVER MET A COMPETITOR. The state
// machine in `@exodra/core/src/machine/` appeared in exactly two files before this one,
// both of them on `machine-vs-cells`, so everything known about it was a comparison against another
// spelling of this library.
//
// THE CAPTION USED TO SAY THE MACHINE COULD NOT EXPRESS CHILDREN, AND IT NO LONGER CAN SAY IT. A
// derivation writes a VALUE and no children call takes one, so this row was a WIRE with a machine
// inside it — props, an instance index, both children ports built by hand — and its numbers were
// published as the machine's. `m.fill([deps], (c) => void)` is the slot that closed it: same mask,
// same numbering, same walk, handed the INSTANCE, filling a children port by calling its region. The
// card is now a MACHINE with no props and no index, whose state is seeded once and whose every later
// change arrives as a transition.
//
// WHAT SEPARATES IT FROM `exodraDirect` IS STILL ONE THING: both drive the same two `c.childList`
// regions with the same commands, and what differs is whether a click dispatches through a compiled
// program — four derivations, two fills, one mask per field — or through two closures that already
// know what moved. Read `apps/exodra/exodra.md` before reading the number.
//
// THE PREDICTIONS THIS ROW WAS ADDED UNDER ARE JUDGED ON `initial-render` AND `app-update`, which
// are the axes that carry `stage0`. NEITHER CARRIES A NULL PAIR ANY MORE: `app-update`'s was the
// bindable row and its separately declared twin, and both left with the other Exodra rows, so no
// axis in this suite can currently turn a gap between these two into a size.
import { mountLitApp, verifyLitApp } from '../../participants/lit/app';
import { mountMikadoApp, verifyMikadoApp } from '../../participants/mikado/app';
import {
    mountMikadoReactiveApp,
    verifyMikadoReactiveApp,
} from '../../participants/mikado/reactive';
// ANGULAR IS DESCRIBED IN THIS FILE BUT DOES NOT RUN, and the description stays on purpose.
// Its participant (`participants/angular/app.ts`), its build (`bench/build/build-angular.mjs`) and
// its app (`bench/apps/angular/`) are all in place; what is missing is `@angular/*`, removed
// after their toolchain pulled a second Vite into the workspace and broke every other
// participant. The title below therefore does NOT name it — a benchmark that announces a row it
// does not print is mislabelling its own output. Re-add the packages, the `BUILT_PARTICIPANTS`
// entry in `scripts/run-one-axis.js`, the participant lines and the title IN ONE CHANGE; the
// comments about how Angular is measured are the notes for doing exactly that.
import { abBench, type Scenario } from '../../../harness';
import { appLines } from '../../shared/app-lines';

type Mount = (c: HTMLElement) => AppHandle;

export async function benchmarkExodraInitialRender(rounds = 100, batch = 5): Promise<void> {
    const mounts = await loadMounts();
    // Angular's application environment (`createApplication`) is the one participant setup this
    // suite cannot do synchronously, so it happens HERE — once, before anything is timed —

    const prep = (make: Mount) => (): Scenario => {
        const c = el();
        let app: AppHandle;
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
    const heap = (make: Mount) => (): (() => void) => {
        const c = el();
        const app = make(c);
        return () => {
            app.teardown();
            c.remove();
        };
    };

    // GATE ONE — the markup. Timing two renderers that do not build the same tree is
    // meaningless, so every participant that is not the reference has to be shown to produce
    // the reference's bytes, mounted and after one update round. The reference is
    // `exodra-direct-app` itself; every gate runs in the same process that produces the numbers,
    // because a precondition enforced only in some other runner is not a precondition.
    const gates: Array<[string, () => Promise<boolean>]> = [
        // THE REFERENCE ROW, GATED AGAINST THE MACHINE — the one pairing left after the bindable
        // app went, and it is a real check in both directions: the direct row and the machine row
        // re-declare the card's schema separately, so this catches either of them drifting.
        // THE MACHINE ROW, on the same terms and with a third diff of its own. It imports `TAG` and
        // `DETAILS` and re-declares the CARD's schema — the same six ports in the same order — so
        // what this gate can catch is the schema drifting while the wiring was rewritten, and the
        // two derivations putting different bytes in `data-i` and the title than `c.set` puts there.
        // Angular is gated on the SAME terms as everyone else and the gate was not widened for
        // it: comments are stripped from both sides (they mark third-party renderers' own
        // dynamic positions), and nothing else is. Angular's one extra attribute, `ng-version`,
        // sits on the host element — which `participants/angular/app.ts` makes the bench
        // container, so it is outside `innerHTML` and outside the app's tree entirely.
        // Lit's tree is full of comments it uses to mark its own dynamic positions
        // (`<!--?lit$…-->` and empty range boundaries). The comment strip covers those — but it
        // cannot cover an element, and the element count is printed beside every diff for exactly
        // that reason.
        ['lit-app', verifyLitApp],
        ['mikado-app', verifyMikadoApp],
        // EXPECTED TO FAIL, and the failure is the finding rather than a defect: Mikado's routing
        // registers a handler by leaving the route name in the DOM (`click="tog:root"`), which the
        // reference does not have, so the idiomatic Mikado app CANNOT produce the reference's
        // bytes. Its own gate prints the exact divergence and how much of it the route attributes
        // account for. Nothing was stripped to make it pass — see
        // `apps/mikado/mikado-reactive.md`.
        ['mikado-reactive-app', verifyMikadoReactiveApp],
    ];
    const diverged: string[] = [];
    for (const [name, verify] of gates) {
        if ((await verify()) === false) diverged.push(name);
    }
    if (diverged.length > 0) {
        throw new Error(
            `exodra-initial-render: ${diverged.join(' and ')} produce different markup from ` +
                'the reference app — the timings below would be comparing different programs'
        );
    }

    // GATE TWO. A mount that has not finished by the time the timed region ends is a free win,
    // and nothing in a timing harness detects it — the number simply comes out small. Several
    // of these runtimes batch their DOM writes on their own queue, so before any timing is
    // believed, every participant has to be shown to have really produced the app. The expected
    // count comes from the first participant rather than a literal, so the gate cannot drift
    // away from the app it guards.
    const counts: Array<[string, number]> = [];
    for (const [name, make] of [
        // The direct row builds its rows with region commands rather than through a
        // reconciler, so this count is what proves the commands really placed every child inside
        // the timed region — the one thing a markup diff taken later cannot say.
        ['exodra', mountExodraApp],
        // The machine row builds its rows with the same region commands, so this count is what
        // proves the commands really placed every child inside the timed region AND that the
        // machine's fill really ran — a wire that threw inside `fillExoMachineDerivations` would
        // leave a card short.
        ['exodra', mountExodraApp],
        ['solid', mounts.solid],
        ['marko', mounts.marko],
        // Angular batches its DOM writes on a zoneless scheduler, so this gate matters more for
        // it than for most: `mountAngularApp` flushes with `detectChanges()` before it returns,
        // and this is what proves the flush actually happened inside the timed region.
        // Lit is the one participant whose markup carries extra NODES (its comment markers), so
        // this count — elements only — is the check that the extra nodes really are only
        // comments: 641 elements or it is not the same tree.
        ['lit', mountLitApp],
        ['mikado', mountMikadoApp],
        // The reactive Mikado app has the SAME element count as the reference — its divergence is
        // two attributes per card, not a node — so this gate is the one it does pass, and it is
        // what proves the extra attributes really are the whole of the difference.
        ['mikadoReactive', mountMikadoReactiveApp],
    ] as Array<[string, Mount]>) {
        const c = el();
        const app = make(c);
        counts.push([name, c.querySelectorAll('*').length]);
        app.teardown();
        c.remove();
    }
    const want = counts[0][1];
    for (const [name, n] of counts) {
        // eslint-disable-next-line no-console
        console.log(`${n === want ? '✅' : '❌'} gate ${name}: ${n} elements right after mount`);
    }
    const short = counts.filter(([, n]) => n !== want);
    if (short.length > 0) {
        throw new Error(
            `exodra-initial-render: ${short
                .map(([name, n]) => `${name} produced ${n} of ${want} elements`)
                .join(', ')} — that mount had not finished when the timed region ended, ` +
                `so its timing measures less work than everyone else's`
        );
    }

    // The per-card allocation census for the two Exodra rows — COUNTED FROM SOURCE, not measured.
    // It is what the mount prediction's mechanism is made of, so it prints under the table it is
    // about here as well as on `initial-render`.

    await abBench(
        'EXODRA INITIAL RENDER — mount the 80-card todo app ' +
            '(the schema core as an imperative machine, vs ' +
            'Solid vs Marko vs Lit vs Mikado vs Mikado-reactive)',
        'ms/mount',
        {
            // THE ONE EXODRA ROW — the imperative machine, and the axis's reference app as well as
            // its first participant. The pair this axis was built around (a wire spelling beside the
            // machine) is gone: there is one spelling of the app now, so nothing here isolates the
            // cost of the machinery and the only comparisons left are against the other libraries.
            exodra: prep(mountExodraApp),
            solid: prep(mounts.solid),
            marko: prep(mounts.marko),
            lit: prep(mountLitApp),
            mikado: prep(mountMikadoApp),
            mikadoReactive: prep(mountMikadoReactiveApp),
        } as never,
        {
            rounds,
            batch,
            // WHAT THE APP COST EACH PARTICIPANT TO WRITE, beside what it costs to mount. Every row
            // builds the same tree and is gated byte for byte before anything is timed, so the only
            // thing this column can be about is what the library made its author write.
            appLines: appLines({
                exodra: 'exodra',
                solid: 'solid',
                marko: 'marko',
                lit: 'lit',
                mikado: 'mikado',
                mikadoReactive: 'mikadoReactive',
            }),
            record: { section: null, unit: 'ms', per: 'mount' },
            heap: {
                // The wire app with no cell, no subscriber set and no disposer list retained above
                // the shared `TAG` — the same row priced in bytes as well as in milliseconds.
                exodraDirect: heap(mountExodraApp),
                // Its retained heap is the direct app PLUS one state object per card and MINUS one
                // reference in the closure context — the source census weighed instead of counted.
                exodraMachine: heap(mountExodraApp),
                solid: heap(mounts.solid),
                marko: heap(mounts.marko),
                lit: heap(mountLitApp),
                mikado: heap(mountMikadoApp),
                mikadoReactive: heap(mountMikadoReactiveApp),
            } as never,
        }
    );
}
