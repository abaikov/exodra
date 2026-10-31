// WHICH FILES A PARTICIPANT'S APP IS — the list the line-count column is computed from.
//
// A LIST AND NOT A RULE, deliberately. A rule about which half of a mixed file counts as "the app"
// is a rule somebody has to trust, it is argued with forever, and it goes stale the first time
// either half is edited. A list of whole files is checked by opening them.
//
// It is checkable because the files hold the app and nothing else: each participant's directory
// under `src/benchmarks/apps/` carries the components, the state, the handlers and the render
// entry, while the mount adapter, the byte gate, the census reporter and the driver plumbing live
// in `src/benchmarks/participants/`.
//
// A SHARED FILE IS LISTED FOR EVERY PARTICIPANT THAT IMPORTS IT. Otherwise the row that reuses
// looks smaller than the row that copies, for no honest reason. `apps/scene/spec.ts` (the scene) is
// in every list; `apps/exodra/exodra-shared.tsx` (the tag and the details block) is in Exodra's,
// and in Exodra's alone now that there is ONE Exodra row — the imperative machine.
//
// A PARTICIPANT THAT IS NOT HERE HAS NO NUMBER, and its row prints `—` beside a refusal naming it.
// That is the honest output for a row whose app is not in files of its own — and for a row that is
// not an app at all: `driver` is the instrument's own load, `exodra·twin` is a null control, and
// neither answers the question "what did this app cost to write".
//
// NO IMPORTS IN THIS FILE, and that is structural rather than tidiness: `vite.config.ts` reads it
// in Node to know which files to count, and the browser reads it to sum them. A file both sides
// read has to be data both sides can load.

/** Every list starts here: the scene — the 80 cards, the 10 decks, the 5 users and their formatting. */
const SCENE = 'src/benchmarks/apps/scene/spec.ts';

/** The two leaf components four Exodra participants render unchanged, and the props they share. */
const EXODRA_SHARED = 'src/benchmarks/apps/exodra/exodra-shared.tsx';

export const APP_FILES: Readonly<Record<string, readonly string[]>> = {
    exodra: [SCENE, EXODRA_SHARED, 'src/benchmarks/apps/exodra/exodra.tsx'],
    // `apps/scene/slot.ts` IS IN BOTH LISTS AND IN ONLY THESE TWO: it is the door a mounted Solid or
    // React app hands its round operation out through, and each of them imports it. Declaring it
    // inside either one would have charged the other participant for that participant's whole app,
    // which is also why it sits under `scene/` rather than in either participant's directory.
    solid: [SCENE, 'src/benchmarks/apps/scene/slot.ts', 'src/benchmarks/apps/solid/solid.tsx'],
    react: [SCENE, 'src/benchmarks/apps/scene/slot.ts', 'src/benchmarks/apps/react/react.tsx'],
    reactJsx: [SCENE, 'src/benchmarks/apps/react/react-jsx.jsx'],
    voby: [SCENE, 'src/benchmarks/apps/voby/voby.ts'],
    svelte: [
        SCENE,
        'src/benchmarks/svelte/CardsDyn.svelte',
        'src/benchmarks/svelte/DeckDyn.svelte',
        'src/benchmarks/svelte/CardDyn.svelte',
    ],
    marko: [
        SCENE,
        'src/benchmarks/marko/CardsDyn.marko',
        'src/benchmarks/marko/tags/DeckDyn.marko',
        'src/benchmarks/marko/tags/CardDyn.marko',
    ],
    lit: [SCENE, 'src/benchmarks/apps/lit/lit.tsx'],
    mikado: [SCENE, 'src/benchmarks/apps/mikado/mikado.tsx'],
    mikadoReactive: [SCENE, 'src/benchmarks/apps/mikado/mikado-reactive.tsx'],
    stage0: [SCENE, 'src/benchmarks/apps/stage0/stage0.tsx'],
    uhtml: [SCENE, 'src/benchmarks/apps/uhtml/uhtml.tsx'],
    sinuous: [SCENE, 'src/benchmarks/apps/sinuous/sinuous.tsx'],
};

/** Every file any participant's app is made of, each once — what the counter is asked to read. */
export const APP_FILE_PATHS: readonly string[] = Array.from(
    new Set(Object.values(APP_FILES).flat())
).sort();
