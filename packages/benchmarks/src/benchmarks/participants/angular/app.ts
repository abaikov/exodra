// AXIS PARTICIPANT — ANGULAR: the LOADER and the GATE. The participant itself is
// `bench/apps/angular/app.ts`; it is not compiled by this package's Vite config and is not
// imported by anything on this side. It is BUILT, once, into a single self-contained ES module
// and loaded here at runtime.
//
// WHY, IN ONE PARAGRAPH. Compiling Angular in the shared dev-server config means running
// `@analogjs/vite-plugin-angular`, which needs `@angular/compiler-cli` and `@angular/build`, and
// `@angular/build` ships a Vite of its own. Putting that in the config every other participant
// is compiled by ties Svelte, Solid, React, Marko and the Exodra cores to whatever Angular's
// toolchain wants next. Building Angular on its own — `npm run build:angular` — moves all of
// that behind one file on disk. The rest of the suite no longer knows Angular exists, and
// Angular can be given its own pinned toolchain later without anybody else moving.
//
// THE PRICE, stated because it is real: the artifact does NOT rebuild when
// `bench/apps/angular/app.ts` is edited. Editing the Angular participant means re-running the
// build. The loader below cannot detect a stale artifact, only a missing one.
import { el, type AppHandle } from '../../shared/todo-spec';
import { mountExodraApp } from '../exodra/app';

/**
 * Where `bench/build/build-angular.mjs` writes the participant. It lands in `public/`, which
 * Vite serves BYTE FOR BYTE with no transform of any kind — so what the browser executes is
 * exactly what the build script produced, which is the whole point of building it separately.
 * That is also why it is fetched as a URL rather than imported as a module specifier:
 * `@vite-ignore` keeps Vite's import analysis from resolving, rewriting or pre-bundling it.
 */
const ARTIFACT = '/bench/angular.js';

interface TAngularArtifact {
    initAngularApp(): Promise<void>;
    mountAngularApp(container: HTMLElement): AppHandle;
}

let artifact: TAngularArtifact | null = null;

async function loadArtifact(): Promise<TAngularArtifact> {
    if (artifact !== null) return artifact;
    let mod: TAngularArtifact;
    try {
        mod = (await import(/* @vite-ignore */ ARTIFACT)) as unknown as TAngularArtifact;
    } catch (cause) {
        // A missing artifact is the expected failure — nothing in `npm install` produces it —
        // so it names the command instead of surfacing a bare 404 from the module loader.
        //
        // THE UNDERLYING FAILURE IS INTERPOLATED RATHER THAN PASSED AS `{ cause }`: this package
        // compiles at `lib: ES2020` (its `tsconfig.json`, and the root base it extends), and the
        // two-argument `Error` constructor arrived with `ES2022.Error`. Passing the options bag is
        // a compile error here, not a style choice, and dropping the reason silently would leave a
        // network failure or a syntax error in the artifact looking identical to a missing file.
        throw new Error(
            `Angular participant not built: ${ARTIFACT} could not be loaded (${String(cause)}). ` +
                'Run\n' +
                '  npm run build:angular --workspace=@exodra/benchmarks\n' +
                'once, then re-run this axis. (The other axes do not use Angular and run without it.)'
        );
    }
    artifact = mod;
    return mod;
}

/**
 * Load the built participant AND build Angular's application environment — both of the
 * asynchronous steps, kept out of every timed region. Idempotent. `mountAngularApp` throws if
 * this was skipped, so there is no order in which a mount can be reached uninitialised.
 */
export async function initAngularApp(): Promise<void> {
    const mod = await loadArtifact();
    await mod.initAngularApp();
}

/**
 * Synchronous, like every other participant's mount — which is only possible because
 * `initAngularApp()` has already resolved the artifact and the DI environment.
 */
export function mountAngularApp(container: HTMLElement): AppHandle {
    const mod = artifact;
    if (mod === null) {
        throw new Error(
            'mountAngularApp: `await initAngularApp()` first — the Angular participant is a ' +
                'built artifact loaded over the network, and Angular then builds its application ' +
                'environment asynchronously. Doing either inside the timed region would make the ' +
                'mount async and charge Angular for setup nobody else pays per mount'
        );
    }
    return mod.mountAngularApp(container);
}

// --- verification ------------------------------------------------------------------------
// The gate every participant uses: mount the reference app (`apps/exodra/exodra.tsx`) and this one
// side by side, diff the HTML, run one update round, diff again.
//
// It lives on THIS side of the artifact boundary on purpose: it pulls in the reference app and
// the bench helpers. Had the participant kept it, Angular's bundle would have contained them.
//
// WHAT ANGULAR PUTS IN THE MARKUP THAT THE REFERENCE DOES NOT, in full, so that a green tick
// here is not read as "Angular added nothing":
//   • `ng-version` on the HOST element, which here is the bench container. It is not inside
//     `container.innerHTML`, so this diff never sees it. It cannot be suppressed.
//   • comment anchors for `@if` and `@for`, which the reference also emits for its fragment,
//     and which this diff strips from BOTH sides.
//   • nothing else. `ng-reflect-*` no longer exists unless `provideNgReflectAttributes()` is
//     called (v19 removed it from dev mode), and `_nghost-*` / `_ngcontent-*` are only emitted
//     for a component that HAS styles — this one has none, and Angular then switches its
//     encapsulation to `None` on its own (documented on `Component#encapsulation`).
const COMMENTS = /<!--[\s\S]*?-->/g;
const markup = (c: HTMLElement): string => c.innerHTML.replace(COMMENTS, '');

function diff(stage: string, refC: HTMLElement, angC: HTMLElement): boolean {
    const a = markup(refC);
    const b = markup(angC);
    const refN = refC.querySelectorAll('*').length;
    const angN = angC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ angular-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${angN} elements (angular)`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ angular-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${angN} elements (angular), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  angular  : …${b.slice(from, at + 160)}…`
    );
    return false;
}

export async function verifyAngularApp(): Promise<boolean> {
    await initAngularApp();
    const refC = el();
    const angC = el();
    const ref = mountExodraApp(refC);
    const ang = mountAngularApp(angC);

    let ok = diff('mount', refC, angC);
    ref.flip();
    ang.flip();
    ok = diff('one update round (details toggled + tag lists advanced)', refC, angC) && ok;

    ref.teardown();
    refC.remove();
    ang.teardown();
    angC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? '✅ angular-app is a faithful reproduction' : '❌ angular-app DIVERGES');
    return ok;
}
