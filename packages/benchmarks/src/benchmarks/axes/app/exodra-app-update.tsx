// AXIS — EXODRA APP UPDATE: what the schema core in `@exodra/core` + `@exodra/dom` costs to
// UPDATE the 80-card todo app, against Solid, Marko, Lit and Mikado, on the very same app
// (`apps/exodra/exodra.tsx` for Exodra, `todo-app.tsx` for the third-party field) and the very same
// update round every other axis in this suite fires.
//
// ANGULAR'S NUMBER ON THIS AXIS IS NOT THE SAME KIND OF NUMBER as the other four, and it must
// be read with that in mind. The others dispatch a changed value to the one DOM position that
// depends on it. Angular marks the component's VIEW dirty and re-evaluates every binding in it,
// writing only what differs — so its flip re-checks 80 cards' `data-i` and `Task N`, which
// cannot have changed, and re-walks every tag list through its tracking function. On THIS app
// the penalty is at its mildest, because a flip dirties all 80 cards anyway; on an app where
// one card in eighty changed, the shape of the comparison would be completely different. The
// full account is in the header of `participants/angular/app.ts`.
//
// WHY THIS AXIS EXISTS AT ALL. The schema core has been measured mounting (`exodra-initial-
// render`) and serving (`ssr`), and it leads both. Nothing has measured it UPDATING, which is
// the half of a renderer this project has historically been fastest at — so until this runs,
// "the new core is faster" is a claim about the cheaper half of the job. A core that wins the
// mount by preparing more per render and reconciling worse would look excellent everywhere it
// has been measured and be a regression in the app.
//
// ONE ROUND = the batch `app-update` fires: click every card's `.tog` (80 conditional regions
// mount or unmount) and every card's `.addtag` (80 lists advance one row). The timed region is
// five of those, so the sample sits well above the browser's ~0.1 ms timer clamp.
//
// THE GATES ARE THE POINT, and there are two of them because they answer two different ways a
// number here could be a lie:
//
//   GATE ONE — THE MARKUP, byte for byte, exactly as `exodra-initial-render` runs it, in the
//   same process that produces these numbers. The reference is `exodra-direct-app` itself, so every
//   OTHER participant is diffed against it. Timing two renderers that do not build the same
//   tree is worthless, and on an
//   UPDATE axis this gate carries more weight than it does on a mount one: it diffs the markup
//   AFTER an update round as well, which is where a different conditional strategy or a list
//   that grew the wrong end would show up.
//
//   GATE TWO — THE MUTATION, per participant, the same one `app-update` applies: one flip must close card 0's details block, grow its tag list by one, AND leave the
//   kept tag as the SAME element. Matching markup proves the result, not the mechanism — a
//   renderer that threw the row away and rebuilt it produces identical HTML and a flattering
//   number. A no-op or a rebuild fails here rather than "winning" the axis.
import { clickFloorMount } from '../../participants/floor/app';
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
import { loadMounts, el, type AppHandle } from '../../participants/bundled/todo-app';
// TWO ROWS ARE GONE FROM THIS AXIS AND NEITHER IS COMING BACK ON ITS OWN TERMS.
//
// `exodraOimdb` held the app's state as entities in oimdb collections read through selectors, and
// `exodraOimdb − exodra` was the only measurement of what a real store costs. Its participant went
// stale — its tag entity predates `TCardTag.chars`, so `TAG`'s wire read `undefined.getValue()`.
//
// `exodra` was the app written the BINDABLE way: a cell per card per varying thing, a `c.bindList`
// for the details block and one for the tag list, a click writing a cell and the renderer working
// out what moved. Every subtraction this header used to print had it on one side — `exodra −
// exodraDirect` (what the reactive idiom costs) and `exodraOimdb − exodra` (what a store costs) —
// and NEITHER IS PRINTED ANYWHERE BELOW ANY MORE. There is no row on this axis that prices the
// reactive idiom, and that is a gap, not a result.
//
// WHAT IS LEFT IS THE WIRE ROW AND THE MACHINE ROW. `exodraDirect` has no reactive layer above the
// shared `TAG`: ports filled with `c.set` at wire time, and the two children ports held as REGIONS
// (`c.portChildList`) that the card's own handlers command — one `insert` or one `remove` for the details
// block, and for the tag list exactly the rows that joined or left.
//
// IT IS HANDED EXACTLY WHAT EVERY OTHER ROW IS HANDED: a real bubbling click from `clickAll` in
// `todo-spec.ts`, and it derives every value it writes from its own `count`/`open` inside the
// clock. What it does differently is decline to throw the delta away and rediscover it. The full
// argument, and the capability it gives up to get there (its card names `TExoDomNode`, so it is
// browser-only where the idiomatic card runs on `@exodra/string` and through hydration unchanged),
// are in `apps/exodra/exodra.md`.
//
// STAGE0 IS NOT A PARTICIPANT ON THIS AXIS. It is on `app-update`, which fires the same round on
// the same app through the same gates and where both Exodra rows also appear — so the question
// "does the direct API reach the hand-written ceiling" is asked there, on one table, rather
// than half-asked here. It is asked and NOT ANSWERED: that table lost its null pair with the
// bindable row, so it ranks the two and measures neither distance.
import { mountExodraApp } from '../../participants/exodra/app';
// AND THE SECOND OF THE TWO: `exodraMachine`, the same app with the card's VALUES and STATE held by
// the state machine in `@exodra/core/src/machine/`. It differs from the row above by WHERE THE STATE
// LIVES, at the same amount of reactive layer as `exodraDirect` — which is none. Until this row
// existed that machine had never been measured against anything but another spelling of this
// library — it appeared in two files, both belonging to `machine-vs-cells`.
//
// THE CAPTION USED TO SAY THE MACHINE COULD NOT EXPRESS CHILDREN, AND IT NO LONGER CAN. A derivation
// writes a VALUE and no children call takes one, so this row was a WIRE with a machine inside it —
// props, an instance index, both children ports built by hand — and it was published as the machine.
// `m.fill([deps], (c) => void)` closed that: same mask, same numbering, same walk, handed the
// INSTANCE, filling a children port by calling its region. The card is a MACHINE now, with no props
// and no index; its two children ports are still `exodraDirect`'s regions, filled by two declared
// fills instead of by two handler closures.
//
// AND ON AN UPDATE AXIS, WHAT IT PRICES IS NO LONGER WHAT IT WAS. This app used to have no reactive
// scalar at all — every value a card rendered was a constant — so the machine's derivations ran at
// the mount and never again, and a click priced only a transition around a state change nothing
// downstream consumed. The app now carries THREE DERIVED VALUES (the markup contract is in
// `apps/exodra/exodra.tsx`'s markup): `open` is read by two of the machine's four derivations
// and `count` by
// one, so a click's transition wakes a commit that walks slots and writes ports — and the state's
// OTHER consumer, the CHILDREN PORT, is a slot of the same program now, so the region commands are
// inside the commit rather than beside it. NO DIRECTION WAS PREDICTED for that, AND NO AXIS IN THIS
// SUITE CAN NOW RESOLVE IT: the null pair that gave `app-update` a resolution floor was the bindable
// row and its twin, and both left with the other Exodra rows. Until a twin of a surviving row is
// declared, the gap between these two is an ORDERING everywhere it is printed.
import { mountLitApp, verifyLitApp } from '../../participants/lit/app';
import { mountMikadoApp, verifyMikadoApp } from '../../participants/mikado/app';
import {
    mountMikadoReactiveApp,
    verifyMikadoReactiveApp,
} from '../../participants/mikado/reactive';

type Mount = (c: HTMLElement) => AppHandle;

/** Flips per timed sample. Five, as on every other update axis, so the numbers line up. */
const ROUNDS = 5;

export async function benchmarkExodraAppUpdate(rounds = 100, batch = 5): Promise<void> {
    const mounts = await loadMounts();
    // Angular's application environment is built asynchronously and exactly once — here, with

    const participants: Array<[string, Mount]> = [
        // THE WIRE ROW, and this axis's markup reference. Gate two below is the one that matters
        // for it: a region commanded at the wrong end grows the tag list at the head, which
        // produces the right COUNT and fails the kept-tag-reused check.
        ['exodra', mountExodraApp],
        // The machine row, declared next to the one it is paired with. Gate two is what proves the
        // TRANSITION COMMITTED and the handler then commanded the region: a transition whose commit
        // was suppressed would leave the state right and the DOM unchanged, which is the one failure
        // this design cannot detect from the inside.
        ['exodra', mountExodraApp],
        // Gate two matters more for this row than for any other: its flip goes through a store, so
        // "the DOM has been written by the time flip() returns" depends on the store's queue having
        // been drained inside the handler. A store that committed late would look fast and change
        // nothing — this gate is what catches it.
        ['solid', mounts.solid],
        // Marko is the bar on this axis too: it is faster than Solid on mount, and updates are
        // where reconciling by item IDENTITY is supposed to pay, so the claim has to be tested
        // against the fastest thing in the field rather than against the one it was convenient
        // to test against.
        ['marko', mounts.marko],
        // Angular flushes with `detectChanges()` at the end of its flip — the counterpart of
        // react's `flushSync` and marko's `run`, and what keeps a zoneless scheduler from
        // moving the work outside the timed region. Gate two below is what proves it worked.
        // LIT'S NUMBER HERE IS ALSO NOT THE SAME KIND OF NUMBER, for a reason worth stating next
        // to Angular's. A lit render root re-evaluates its whole template and dirty-checks every
        // part in it; the scope of that root is therefore the scope of an update. `apps/lit/lit.tsx`
        // makes each CARD a render root — the same scope LitElement would give it, minus the
        // custom element the markup gate forbids — so a flip re-checks 80 small templates, not
        // one large one. It still re-checks `data-i` and `Task N`, which cannot have changed.
        // Lit batches like LitElement does: both of a card's clicks land in ONE render, flushed
        // inside `flip()` the way react/svelte/marko/voby flush theirs.
        ['lit', mountLitApp],
        // Mikado's update is the closest thing here to the schema core's own: the tag list is a
        // keyed view reconcile addressed through a path array memoised on each node, and the
        // details block is a clone and an `insertBefore`. That last part is CHEAPER than what the
        // frameworks that can express a conditional in their templates have to do — read the
        // `apps/mikado/mikado.md` before reading its number.
        ['mikado', mountMikadoApp],
        // THE SAME APP, WRITTEN THE WAY MIKADO'S README SAYS TO WRITE ONE, and the reason the
        // `mikado` row above should not be read alone. Its update goes through Mikado's global
        // delegated router (the click walks up to the route attribute, then to the card), and the
        // tag list is a `Mikado.Array` observable that applies a `push` or a `splice` straight to
        // the DOM instead of being handed a new slice to diff. The details toggle is still hand
        // written in BOTH rows, because Mikado's proxy can only change what an element says, never
        // whether it exists — `apps/mikado/mikado-reactive.md` has the full account,
        // including the route attribute this participant leaves in the markup.
        ['mikadoReactive', mountMikadoReactiveApp],
    ];

    // GATE ONE — the markup. Every participant that is not the reference has to be shown to
    // produce the reference's bytes, mounted AND after one update round. Run here rather than
    // leaned on from another axis: a precondition enforced in a runner nobody ran alongside this
    // one is not a precondition.
    const diverged: string[] = [];
    for (const [name, verify] of [
        ['lit-app', verifyLitApp],
        ['mikado-app', verifyMikadoApp],
        // EXPECTED TO FAIL. Mikado registers an event route by leaving its name in the DOM
        // (`click="tog:root"`), so the app written in Mikado's own reactive idiom cannot produce
        // the reference's bytes — 2 extra attributes per card, 0 extra elements. That is a result
        // about Mikado, not a defect in the participant, and nothing was stripped to hide it: its
        // gate prints the exact divergence and how much of it the route attributes account for.
        ['mikado-reactive-app', verifyMikadoReactiveApp],
    ] as Array<[string, () => Promise<boolean>]>) {
        if ((await verify()) === false) diverged.push(name);
    }
    if (diverged.length > 0) {
        throw new Error(
            `exodra-app-update: ${diverged.join(' and ')} produce different markup from ` +
                'the reference app — the timings below would be comparing different programs'
        );
    }

    // GATE TWO — the mutation, now at BOTH levels. Card 0 starts open with exactly one tag, so one
    // flip has one legal outcome and the kept tag must survive as the same node. Deck 0 is checked
    // beside it because a round moves two things there and each catches a different failure: its
    // NAME moves because its own `.ren` was clicked, and its DATE moves because round 0 advances
    // user 0's setting and user 0 is deck 0's author. A participant that rendered its decks once and
    // then left them standing produces a correct-looking card level and a dead third one.
    for (const [name, make] of participants) {
        const c = el();
        const app = make(c);
        const card0 = (): Element => c.querySelector('.card')!;
        const det = (): number => card0().querySelectorAll('.details').length;
        const tags = (): NodeListOf<Element> => card0().querySelectorAll('.tag');
        const deck0 = (): Element => c.querySelector('.deck')!;
        const deckName = (): string => deck0().querySelector('h2')!.textContent ?? '';
        const deckDate = (): string => deck0().querySelector('.date')!.textContent ?? '';
        const d0 = det();
        const n0 = tags().length;
        const firstBefore = tags()[0];
        const name0 = deckName();
        const date0 = deckDate();
        app.flip();
        const d1 = det();
        const n1 = tags().length;
        const reused = tags()[0] === firstBefore;
        const renamed = deckName() !== name0;
        const redated = deckDate() !== date0;
        app.teardown();
        c.remove();
        const ok =
            d0 === 1 && n0 === 1 && d1 === d0 - 1 && n1 === n0 + 1 && reused && renamed && redated;
        // eslint-disable-next-line no-console
        console.log(
            `${ok ? '✅' : '❌'} gate ${name}: details ${d0}->${d1} (want 1->0), ` +
                `tags ${n0}->${n1} (want 1->2), kept tag REUSED=${reused}, ` +
                `deck 0 renamed=${renamed}, deck 0 date re-formatted=${redated}`
        );
        if (!ok) {
            throw new Error(
                `exodra-app-update: ${name} did not mutate the DOM as expected ` +
                    `(details ${d0}->${d1}, tags ${n0}->${n1}, kept-tag REUSED=${reused}, ` +
                    `deck renamed=${renamed}, deck date re-formatted=${redated}) ` +
                    '— a no-op or a rebuild would make its timing meaningless'
            );
        }
    }

    // The mount is setup and the teardown is teardown; only the flips are timed.
    const prep = (make: Mount) => (): Scenario => {
        const c = el();
        const app = make(c);
        return {
            measure: () => {
                for (let r = 0; r < ROUNDS; r++) app.flip();
            },
            cleanup: () => {
                app.teardown();
                c.remove();
            },
        };
    };

    await abBench(
        `EXODRA APP UPDATE — 10 decks / 80 cards: deck rename + details toggle + ` +
            `dynamic tag list ×${ROUNDS} ` +
            '(the schema core as an imperative machine, vs ' +
            'Solid vs Marko vs Lit vs Mikado vs Mikado-reactive)',
        `ms/${ROUNDS} rounds`,
        {
            // THE ONE EXODRA ROW — the imperative machine. No cell and no diff above the shared
            // `TAG`: a transition commands its two regions with the rows that joined or left. The
            // pair this axis was built around is gone, so nothing here prices the machinery itself.
            exodra: prep(mountExodraApp),
            solid: prep(mounts.solid),
            marko: prep(mounts.marko),
            lit: prep(mountLitApp),
            mikado: prep(mountMikadoApp),
            mikadoReactive: prep(mountMikadoReactiveApp),
            // THE FLOOR — not a renderer. It runs this axis's own `clickAll` over inert markup,
            // so its row is what every row above it pays before its renderer is reached: 160
            // `querySelectorAll` matches and 160 dispatched `MouseEvent`s, plus whatever
            // document-level delegated handlers the OTHER participants installed (Solid emits
            // `delegateEvents(["click"])`, Marko installs its own). Read every number here as
            // "floor + the renderer's own work". See `participants/floor/app.ts`.
            //
            // It is not in `participants` above because gate two requires a flip to MUTATE the
            // DOM and this one mutates nothing by design.
            floor: prep(clickFloorMount(mountExodraApp)),
        } as never,
        {
            rounds,
            batch,
            // WHAT THE APP COST EACH PARTICIPANT TO WRITE, beside what its update round costs. Every
            // row builds the same tree and is gated byte for byte before anything is timed, so the
            // only thing this column can be about is what the library made its author write. `floor`
            // is mapped to `null`: it is `clickAll` over inert markup, not an app.
            appLines: appLines({
                exodra: 'exodra',
                solid: 'solid',
                marko: 'marko',
                lit: 'lit',
                mikado: 'mikado',
                mikadoReactive: 'mikadoReactive',
                floor: null,
            }),
            record: { section: null, unit: 'ms', per: `${ROUNDS} update rounds` },
        }
    );
}
