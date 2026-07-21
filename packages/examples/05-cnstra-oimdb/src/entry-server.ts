import type { TExoSchema } from '@exodra/core';
import { ExoNodeSsr } from '@exodra/ssr';
import { createRouter, createMemoryHistory } from '@exodra/router';
import { bindable } from '@exodra/reactivity';
import { createSeed } from './domain/seed';
import { createRuntime, setRuntime } from './app/runtime';
import { takeSnapshot } from './store/workspace-store';
import { routes } from './app/routes';
import { shellView } from './app/shell';
import boardPage from './pages/board';
import tasksPage from './pages/tasks';
import projectsPage from './pages/projects';
import peoplePage from './pages/people';
import taxonomyPage from './pages/taxonomy';
import activityPage from './pages/activity';
import virtualPage from './pages/virtual';

export { appStyles } from './ui/styles';

// SSR via @exodra/ssr. The shell (with an EMPTY outlet) and the matched page are
// rendered as TWO trees and spliced — exactly how the client hydrates them.
//
// The server bundles everything (no code-splitting server-side), so it renders
// pages from a STATIC map rather than the client's lazy route table. This keeps
// `render()` fully SYNCHRONOUS: it sets the per-request runtime singleton and
// builds the page with no `await` in between — so concurrent requests cannot
// contaminate each other's runtime (an `await` between `setRuntime` and the build
// would let requests interleave). The client still lazy-loads the same page module
// and hydrates this HTML.
const EMPTY_OUTLET = '<main id="outlet" class="outlet"></main>';

const PAGES: Record<string, () => TExoSchema> = {
    '/': boardPage,
    '/tasks': tasksPage,
    '/projects': projectsPage,
    '/people': peoplePage,
    '/taxonomy': taxonomyPage,
    '/activity': activityPage,
    '/virtual': virtualPage,
};

export function render(url = '/') {
    const rt = createRuntime(createSeed());
    setRuntime(rt);
    const router = createRouter(routes, { history: createMemoryHistory(url) });
    const stats = bindable(
        `${rt.oimdbInstance.tasks.collection.getAll().length} tasks`
    );

    const shellSsr = new ExoNodeSsr(shellView(router, rt, stats));
    shellSsr.setState('workspace', takeSnapshot(rt.oimdbInstance));
    let appHtml = shellSsr.renderBody();

    // Render the page the router matched, from the static map. Unknown routes fall
    // back to a client-rendered (empty) outlet.
    const pageFn = PAGES[router.getMatch()?.route.path ?? ''];
    if (pageFn && appHtml.includes(EMPTY_OUTLET)) {
        const pageHtml = new ExoNodeSsr(pageFn()).renderBody();
        appHtml = appHtml.replace(
            EMPTY_OUTLET,
            `<main id="outlet" class="outlet">${pageHtml}</main>`
        );
    }

    return { appHtml, stateScript: shellSsr.renderStateScript() };
}
