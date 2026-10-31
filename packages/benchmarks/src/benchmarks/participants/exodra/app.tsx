// THE SUITE'S SIDE OF EXODRA'S TODO APP: the `AppHandle` adapter every axis mounts this participant
// through, and the profiling loop. The APP ITSELF is in `apps/exodra/exodra.tsx` (shell, deck,
// card) and `apps/exodra/exodra-shared.tsx` (what goes into a region, and the array a row reads its
// item out of) — the four other Exodra rows import the shared half from there and re-declare none
// of it. Everything both halves export is re-exported below, so nothing that already imported from
// this module has to change.
import { clickAll, type AppHandle } from '../../shared/todo-spec';
import { noteRoundOp } from '../../shared/card-driver';
import { APP, EXO_BACKEND, takeExodraPendingAdvance } from '../../apps/exodra/exodra';

export {
    APP,
    CARD,
    CARD_PORTS,
    DECK,
    DECK_PORTS,
    exodraAppOf,
    takeExodraPendingAdvance,
    type TExoCardTag,
} from '../../apps/exodra/exodra';
export {
    TAG,
    DETAILS,
    writeTagLabel,
    type TExoRegionWiring,
} from '../../apps/exodra/exodra-shared';

export function mountExodraApp(container: HTMLElement): AppHandle {
    // ONE instance of APP — which is all `render` does; it takes no count, and the rows this app
    // shows are LISTS below this root. It returns the DISPOSER for everything the wiring
    // subscribed to.
    const dispose = EXO_BACKEND.render(APP, container);
    // The throw inside `takeExodraPendingAdvance` is not defensive noise: if `render` ever stopped
    // running the shell's wire synchronously, `flip` would silently become a two-thirds round and
    // every axis that mounts this app would keep printing numbers.
    const advance = takeExodraPendingAdvance();
    // DECLARED TO `card-driver.ts` as the round's one app-level operation, and it is THE SAME
    // closure `flip` calls below — never a second spelling of it. That identity is what makes the
    // called round and the clicked round the same program.
    noteRoundOp(advance);
    return {
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advance();
        },
        // Subscriptions only — the nodes die with the container the caller removes, and a
        // listener is owned by its node.
        teardown: dispose,
    };
}

/**
 * Mount + dispose the app N times, nothing else — the region a CPU profile is taken over, so
 * this core's mount path can be attributed the same way each third-party participant's is.
 */
export function profileMountExodra(times = 300): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    for (let k = 0; k < times; k++) {
        const c = document.createElement('div');
        document.body.appendChild(c);
        const app = mountExodraApp(c);
        app.teardown();
        c.remove();
        if (gc && k % 50 === 0) gc();
    }
}
