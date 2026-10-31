// WHERE THE 80-CARD APP'S TIME GOES, PER PARTICIPANT — attribution for the two axes the schema
// core does not lead.
//
// `exodra-initial-render` puts Mikado ahead of the schema core on MOUNT and `exodra-app-update`
// puts Mikado and Marko ahead on UPDATE, both by single-digit-to-15 percent. A ranking says who
// is ahead; it never says WHY, and the difference is small enough that reading the two codebases
// and guessing is exactly how this repo has been wrong before.
//
// So: the same app, the same mount and the same flip every axis uses — pushed through each
// framework's own `AppHandle`, so nothing here is a second implementation that could drift from
// what is measured — repeated N times under a V8 CPU profile.
//
//     node scripts/profile-app.mjs [times] <who> [mount|update|clicked]
//
// `who` is `TWho` below: exodra · mikado · marko · solid · floor · stage0 · direct · machine ·
// react · reactCompat · reactCompatCompiled · million ·
// machineDirect.
import { mountExodraApp } from '../participants/exodra/app';
import { mountMikadoApp } from '../participants/mikado/app';
// THE MACHINE ROW'S PAIR — the same machine with every derivation and every fill removed and its two
// transitions writing the ports. It is profilable under its own name for the reason this whole file
// exists: `app-update` now prints TWO subtractions over three rows (P·MACHINE·SPLIT), and a
// subtraction that comes out unexplained has to be attributable to something, which means each of
// the three rows has to be profilable on the path the axis actually drives.
// THE ROW THAT STANDS ABOVE `exodra` ON MOUNT. `stage0` is the hand-addressed template cloner
// with no reconciler, no context chain, no replaceable plugin interfaces and no hydration — a leaner program, not
// a leaner implementation of the same program, and the gap to it is read as the price of what it
// does not have. Measured at batch 5: stage0 0.360 against exodra 0.400, two quanta on
// a 0.02 ms grid.
import { mountStage0App } from '../participants/stage0/app';
import { el, clickAll, type AppHandle } from '../shared/todo-spec';
// THE AXIS'S OWN DRIVING PATH — see `card-driver.ts`. `app-update` no longer dispatches events, so
// a profile of "the update" has to call the handlers the way the axis does or it profiles a
// program nobody measures.
import {
    collectCardOps,
    cardDriverOver,
    noteCardOps,
    noteDeckOps,
    noteRoundOp,
    withoutCardOps,
} from '../shared/card-driver';
import { appLinesOf } from '../shared/app-lines';

type TWho =
    | 'exodra'
    | 'mikado'
    | 'marko'
    | 'solid'
    | 'floor'
    | 'stage0'
    | 'direct'
    | 'machine'
    | 'react'
    | 'reactCompat'
    | 'reactCompatTemplates'
    | 'reactCompatCompiled'
    | 'million'
    | 'reactCompiler';

/**
 * THE FLOOR: the app's markup with NO framework behind it, flipped the same way.
 *
 * An update round on this axis is fired by `clickAll`, which finds 160 buttons and dispatches a
 * real `MouseEvent` at each. That costs what it costs before any renderer has been reached, and
 * whatever it costs is added to EVERY participant's number equally. Until it is measured, a
 * ranking where two participants differ by five percent cannot be read at all — the five percent
 * might be a quarter of the actual difference between the renderers.
 *
 * It also catches something no participant can be blamed for: Solid's compiler emits
 * `delegateEvents(["click"])` at MODULE scope, and Marko installs its own document listener, so
 * merely having those modules loaded puts two delegated handlers on the document that every
 * dispatched click walks — including clicks in an app neither of them rendered.
 *
 * `flip` here is `clickAll` over inert markup: no handler runs, nothing re-renders.
 */
function mountFloor(container: HTMLElement): AppHandle {
    // SUSPENDED, because this mount is thrown away and its 80 registered handler pairs would
    // otherwise be collected as if they were the floor's own. Harmless outside a collection; see
    // `withoutCardOps`.
    withoutCardOps(() => {
        const probe = el();
        const real = mountExodraApp(probe);
        container.innerHTML = probe.innerHTML;
        real.teardown();
        probe.remove();
    });
    // AND THE FLOOR OF THE OTHER MODE, on the same mount: one no-op handler pair per card, so
    // `update` profiles the driver's own two loops over inert markup exactly as `clicked` profiles
    // `clickAll` over it. One shared closure — a floor that allocated 160 of them would be
    // measuring itself.
    const nothing = (): void => undefined;
    // THE COUNTS ARE READ OFF THE INERT MARKUP, never written down here, so this floor followed the
    // app to three levels without a line being edited.
    const decks = container.querySelectorAll('.deck').length;
    for (let k = 0; k < decks; k++) noteDeckOps(nothing);
    const cards = container.querySelectorAll('.card').length;
    for (let k = 0; k < cards; k++) noteCardOps(nothing, nothing);
    // AND THE ROUND'S APP-LEVEL OPERATION, also a no-op: a called round is a deck loop, two card
    // loops and the user write, so a floor that registered any of them short would be the driver's
    // loop minus a call — a floor lighter than the thing it bounds.
    noteRoundOp(nothing);
    return {
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
        },
        teardown: () => undefined,
    };
}

/**
 * WHICH PARTICIPANT IN `app-files.ts` EACH `TWho` IS — `null` for `floor`, which is the app's markup
 * rendered inert and not an app anybody wrote.
 */
const PARTICIPANT_OF: Readonly<Record<TWho, string | null>> = {
    exodra: 'exodra',
    mikado: 'mikado',
    marko: 'marko',
    solid: 'solid',
    floor: null,
    stage0: 'stage0',
    direct: 'exodra',
    machine: 'exodra',
    react: 'react',
    reactCompat: 'react',
    reactCompatTemplates: 'react',
    reactCompatCompiled: 'reactJsx',
    million: 'reactJsx',
    reactCompiler: 'reactJsx',
};

/**
 * WHAT THE APP COST THIS PARTICIPANT TO WRITE, printed beside the profile it explains.
 *
 * A profile says where the time went; it never says what the program was worth writing. This axis
 * prints no table, so the count goes out as its own line — the same number, counted the same way,
 * that `app-update` and `initial-render` print as a column. See `app-lines.ts`.
 */
function reportAppLines(who: TWho): void {
    const n = appLinesOf(PARTICIPANT_OF[who]);
    // eslint-disable-next-line no-console
    console.log(
        n === null
            ? `✅ [${who}] app LOC: — (no app of its own, or its app is not in files of its own)`
            : `✅ [${who}] app LOC: ${n} — lines of this participant's app that carry code, ` +
                  "comments and blank lines excluded, counted from source by TypeScript's own " +
                  'parser over the files `app-files.ts` lists.'
    );
}

async function mounterFor(who: TWho): Promise<(c: HTMLElement) => AppHandle> {
    if (who === 'exodra') return mountExodraApp;
    if (who === 'mikado') return mountMikadoApp;
    if (who === 'direct') return mountExodraApp;
    if (who === 'machine') return mountExodraApp;
    if (who === 'floor') return mountFloor;
    if (who === 'stage0') return mountStage0App;
    const { loadMounts } = await import('../participants/bundled/todo-app');
    const mounts = await loadMounts();
    return mounts[who];
}

/** MOUNT: build the app N times. Teardown is inside the profile and shows up under its own name. */
export async function profileAppMount(who: TWho, times = 300): Promise<void> {
    reportAppLines(who);
    const mount = await mounterFor(who);
    for (let t = 0; t < times; t++) {
        const c = el();
        const app = mount(c);
        app.teardown();
        c.remove();
    }
}

/**
 * UPDATE: mount ONCE, then run N update rounds THE WAY `app-update` RUNS THEM — each card's own
 * `.tog` handler called directly, then each card's own `.addtag` handler, then the participant's
 * commit. No `MouseEvent`, no `dispatchEvent`.
 *
 * IT CHANGED WITH THE AXIS, AND THAT IS THE WHOLE REASON THIS FILE EXISTS. A profile taken to
 * explain a row must profile the program that produced the row. This function used to call `flip`,
 * and the profile it produced is the evidence quoted at the top of `app-update.tsx`: ~61% of it was
 * `MouseEvent` + `dispatchEvent` + `clickAll`. Keeping it on `flip` after the axis stopped
 * dispatching would mean every future "why is this row slower" profile spent most of its samples in
 * work the axis no longer performs.
 *
 * THE CLICKED PATH IS STILL AVAILABLE under its own name below, because it is what
 * `exodra-app-update` still runs and because a question about event delivery is a real question —
 * it is simply not a question about this axis's rows.
 *
 * The mount is outside the loop on purpose — it is what `profileAppMount` attributes, and leaving
 * it in would bury the thing this run is for.
 */
export async function profileAppUpdate(who: TWho, times = 300): Promise<void> {
    reportAppLines(who);
    const mount = await mounterFor(who);
    const c = el();
    const { value: app, ops, decks, rounds } = collectCardOps(() => mount(c));
    if (ops.length === 0) {
        // MARKO IS THE PARTICIPANT THIS FIRES FOR, and a silent no-op profile is the failure it
        // exists to prevent: a driver over zero pairs runs nothing, and the profile would show the
        // mount and be read as "the update is free". A mounted Marko template's whole outside
        // surface is `update(input)` / `destroy()` / `value`, so nothing reaches a card's handlers
        // — which is why it is not a participant on `app-update` either.
        throw new Error(
            `profile-app: \`${who}\` registered no handler pairs with \`card-driver\`, so there ` +
                'is nothing for the direct driver to call and this profile would be of an empty ' +
                'loop. Use `clicked` for a participant that can only be advanced by a real event.'
        );
    }
    const driver = cardDriverOver(ops, decks, rounds, app.commit);
    for (let t = 0; t < times; t++) driver.round();
    app.teardown();
    c.remove();
}

/**
 * UPDATE, THROUGH DISPATCHED CLICKS — what `profileAppUpdate` used to be, kept under a name that
 * says which job it profiles.
 *
 * This is `exodra-app-update`'s job and the job every `.gate/app-update.*.json` on disk was
 * recorded on. It is also the only instrument here that can see event delivery at all, which
 * `app-update` deliberately no longer measures.
 */
export async function profileAppUpdateClicked(who: TWho, times = 300): Promise<void> {
    reportAppLines(who);
    const mount = await mounterFor(who);
    const c = el();
    const app = mount(c);
    for (let t = 0; t < times; t++) app.flip();
    app.teardown();
    c.remove();
}
