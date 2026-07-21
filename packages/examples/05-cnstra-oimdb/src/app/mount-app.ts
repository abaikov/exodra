import { mount, hydrate } from '@exodra/dom';
import { bindable } from '@exodra/reactivity';
import {
    createRouter,
    createBrowserHistory,
    resolveRouteComponent,
    type TExoRouter,
} from '@exodra/router';
import type { TExoSchema } from '@exodra/core';
import { routes } from './routes';
import { shellView } from './shell';
import {
    createRuntime,
    setRuntime,
    type WorkspaceRuntime,
} from './runtime';
import { restorePersisted, attachPersistence } from './persistence';
import { registerOimdbDevtools } from './devtools';
import type { WorkspaceSnapshot } from '../domain/types';

type Mounted = ReturnType<typeof mount>;

function statText(rt: WorkspaceRuntime): string {
    const total = rt.store.tasks.collection.getAll().length;
    const done = rt.store.tasksByStatus.getPksByKey('s-done').size;
    const projects = rt.store.projects.collection
        .getAll()
        .filter(p => !p.archived).length;
    return `${total} tasks · ${done} done · ${projects} projects`;
}

// Boots the client SPA: one shared runtime, a browser-history router, and the
// shell. The server-rendered DOM is HYDRATED (not torn down): the shell and the
// initial page are hydrated as two independent trees, so a page can be disposed
// + swapped on navigation without touching the shell. Subsequent routes load as
// their own lazy chunks.
export function mountApp(
    root: HTMLElement,
    snapshot?: WorkspaceSnapshot
): TExoRouter {
    const rt = createRuntime(snapshot);
    setRuntime(rt);
    const router = createRouter(routes, { history: createBrowserHistory() });

    const stats = bindable(statText(rt));
    const refreshStats = () => stats.setValue(statText(rt));
    rt.store.tasks.collection.subscribeOnAnyUpdate(refreshStats);
    rt.store.projects.collection.subscribeOnAnyUpdate(refreshStats);
    rt.bindErrors();

    // Hydrate the SSR'd shell (empty-outlet schema) against the existing DOM, or
    // mount fresh when there was no SSR (pure client render).
    const ssrShell = root.firstElementChild as HTMLElement | null;
    if (ssrShell) {
        hydrate(shellView(router, rt, stats), ssrShell);
    } else {
        mount(shellView(router, rt, stats), root);
    }
    const outlet = root.querySelector('#outlet') as HTMLElement | null;
    if (!outlet) throw new Error('shell did not render #outlet');

    let page: Mounted | undefined;
    let token = 0;

    const renderRoute = async (): Promise<void> => {
        const ticket = ++token;
        const match = router.getMatch();
        if (!match) {
            outlet.textContent = 'Not found';
            return;
        }
        outlet.setAttribute('data-loading', '');
        let schema: TExoSchema;
        try {
            schema = (await resolveRouteComponent(
                match.route.component,
                match
            )) as TExoSchema;
        } catch (err) {
            if (ticket === token) {
                outlet.textContent = `Failed to load page: ${String(err)}`;
            }
            return;
        }
        if (ticket !== token) {
            // A newer navigation won — mount+dispose in a throwaway so the built
            // page's per-key subscriptions are cleaned up rather than leaked.
            mount(schema, document.createElement('div')).dispose();
            return;
        }
        page?.dispose();
        outlet.textContent = '';
        outlet.removeAttribute('data-loading');
        page = mount(schema, outlet);
    };

    const finishBoot = (): void => {
        // localStorage edits applied AFTER hydration → a reactive reconcile, never
        // a hydration mismatch (the store matched the SSR DOM during hydrate).
        restorePersisted(rt.store);
        attachPersistence(rt.store);
        const dev = registerOimdbDevtools(rt.store);
        (window as Window & { __OIMDB_DEV__?: unknown }).__OIMDB_DEV__ = dev;
        if (window.location.search.includes('devtools')) {
            try {
                dev.connect();
            } catch {
                // optional bridge
            }
        }
    };

    // Initial route: if the server rendered the page into the outlet, HYDRATE it
    // against that DOM (no teardown); otherwise mount it fresh.
    const ssrPage = outlet.firstElementChild as HTMLElement | null;
    const initial = router.getMatch();
    if (ssrPage && initial) {
        const ticket = token;
        resolveRouteComponent(initial.route.component, initial)
            .then(schema => {
                if (token === ticket) {
                    page = hydrate(schema as TExoSchema, ssrPage);
                }
                finishBoot();
            })
            .catch(() => {
                void renderRoute();
                finishBoot();
            });
    } else {
        void renderRoute().finally(finishBoot);
    }

    router.match.subscribe(() => void renderRoute());
    return router;
}
