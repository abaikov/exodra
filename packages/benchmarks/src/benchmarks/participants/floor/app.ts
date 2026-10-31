// THE FLOOR OF A CLICKED AXIS — what a round costs before any renderer is reached.
//
// An update round on the app axes is fired by `clickAll`, which finds 160 buttons with
// `querySelectorAll` and dispatches a real `MouseEvent` at each one. That work is identical for
// every participant and it is added to every participant's number. Measured with a V8 CPU
// profile over 600 rounds: 159 ms of pure harness — `clickAll` 58, `dispatchEvent` 51,
// `MouseEvent` 35 — against 276 ms for the schema core's whole round. The renderer under test
// was 42% of what the axis printed.
//
// Without this participant a table where two renderers differ by 5% cannot be read at all: the
// 5% might be a fifth of the real difference between them. With it, every row is readable as
// "floor plus the renderer's own work", and a change that halves a renderer's work shows up as
// the halving it is instead of a rounding error.
//
// IT ALSO CATCHES A TAX NOBODY OWNS. Solid's compiler emits `delegateEvents(["click"])` at
// MODULE scope and Marko installs a document listener of its own, so on an axis where either is
// a participant EVERY dispatched click walks their document-level handlers — including clicks in
// an app they did not render. That cost lands here, where it is visible, instead of being spread
// silently across the other rows. (Loading those modules for an axis that does NOT measure them
// is a separate bug and is fixed at the import site: see `src/main.ts`.)
//
// ═══ THIS FILE NOW HOLDS TWO FLOORS, BECAUSE THE APP AXES NO LONGER ALL DRIVE THE SAME WAY ═══
//
// `clickFloorMount` below is the floor of an axis fired by DISPATCHED CLICKS — `exodra-app-update`
// is the one that still is. `directFloorMount` beneath it is the floor of an axis fired by
// CALLING THE HANDLERS DIRECTLY, which is what `app-update` does now: 160 calls through a registry,
// two loops, and the participant's commit. The two floors are three orders of magnitude apart, and
// that distance IS the reason `app-update` changed — see its header.
import { clickAll, el, type AppHandle } from '../../shared/todo-spec';
import { noteCardOps, noteDeckOps, noteRoundOp, withoutCardOps } from '../../shared/card-driver';

/**
 * A mount that renders the reference app's markup as INERT HTML and then lets the harness click
 * it exactly as it clicks a live app.
 *
 * The markup comes from a real mount of `reference` rather than from a string in this file, so
 * the floor is measured over the same element count, the same selector matches and the same
 * event paths as the participants — a hand-written approximation would drift from the app the
 * first time the app changed, and a floor that drifts is worse than no floor.
 *
 * `flip` runs the same three `clickAll` calls every participant's `flip` runs — the ten renames
 * included, because a floor that walked 160 buttons where the axis walks 170 would bound a cheaper
 * round than the one being timed. No handler is attached, so nothing re-renders: what remains is
 * the harness and whatever the document is still listening for.
 */
export function clickFloorMount(
    reference: (c: HTMLElement) => AppHandle
): (c: HTMLElement) => AppHandle {
    return (container: HTMLElement): AppHandle => {
        // Mounted, copied, torn down. The snapshot is taken per scenario rather than once at
        // module load because the harness builds and discards a scenario per sample, and a
        // module-level cache would make the FIRST sample pay for the mount and the rest not —
        // which is exactly the kind of asymmetry this participant exists to expose.
        const probe = el();
        const real = reference(probe);
        container.innerHTML = probe.innerHTML;
        real.teardown();
        probe.remove();
        return {
            flip: () => {
                clickAll(container, '.ren');
                clickAll(container, '.tog');
                clickAll(container, '.addtag');
            },
            teardown: () => undefined,
        };
    };
}

/** What a no-op handler is. One shared object: the floor must not be measuring 160 allocations. */
const NOTHING = (): void => undefined;

/**
 * THE FLOOR OF AN AXIS CALLED DIRECTLY — the instrument's own loop, over inert markup, with a
 * handler pair per card that does nothing at all.
 *
 * It is the counterpart of `clickFloorMount` for `app-update` since that axis stopped dispatching
 * events, and it exists for exactly the same reason: a table where two renderers differ by 5%
 * cannot be read unless the run says what part of every row is the harness. What this row contains
 * is two loops of 80, 160 calls through a closure that returns, and the participant's commit — and
 * the whole point of it is that this is now a rounding error where `clickFloorMount`'s row was 60%
 * of every number.
 *
 * THE MARKUP COMES FROM A REAL MOUNT of the reference app, exactly as `clickFloorMount`'s does, so
 * the row stands over the same tree the participants stand over. That mount is taken INSIDE
 * `withoutCardOps`: it registers 80 real handler pairs of its own, and without the suspension this
 * floor would be the reference app under another name — the single most flattering way this
 * row could be wrong.
 *
 * IT REGISTERS ITS OWN 80 PAIRS AFTERWARDS, both members the same shared no-op, so the axis's
 * driver addresses this row exactly as it addresses a renderer. That also means it must be kept
 * OUT of every gate that requires a drive to move the DOM: it moves nothing on purpose.
 */
export function directFloorMount(
    reference: (c: HTMLElement) => AppHandle
): (c: HTMLElement) => AppHandle {
    return (container: HTMLElement): AppHandle => {
        withoutCardOps(() => {
            const probe = el();
            const real = reference(probe);
            container.innerHTML = probe.innerHTML;
            real.teardown();
            probe.remove();
        });
        // THE COUNTS ARE READ OFF THE INERT MARKUP AND NEVER WRITTEN DOWN, so a floor cannot drift
        // from the app the first time the app changes shape — which is exactly what happened when
        // the decks arrived: this row registered the right number of pairs on the day without a
        // line being edited, and would have registered the wrong number of renames had they been a
        // constant here.
        const decks = container.querySelectorAll('.deck').length;
        for (let k = 0; k < decks; k++) noteDeckOps(NOTHING);
        const cards = container.querySelectorAll('.card').length;
        for (let k = 0; k < cards; k++) noteCardOps(NOTHING, NOTHING);
        // AND ONE NO-OP ROUND OPERATION, because a called round is a deck loop, two card loops and
        // the user write, and a floor that omitted any of them would bound a round the axis does not
        // run. All of them are the same shared no-op: this row moves nothing, on purpose, and that
        // is why it is kept out of every gate that requires a drive to change the DOM.
        noteRoundOp(NOTHING);
        return {
            flip: () => undefined,
            teardown: () => undefined,
        };
    };
}
