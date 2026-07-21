import { ExoNodeSsr } from '@exodra/ssr';
import { createRouter, createMemoryHistory } from '@exodra/router';
import { bindable } from '@exodra/reactivity';
import { createSeed } from './domain/seed';
import { createRuntime, setRuntime } from './app/runtime';
import { takeSnapshot } from './store/workspace-store';
import { routes } from './app/routes';
import { shellView } from './app/shell';
import boardPage from './pages/board';

export { appStyles } from './ui/styles';

// SSR via @exodra/ssr. The shell (with an EMPTY outlet) and the matched page are
// rendered as TWO trees and spliced — exactly how the client hydrates them: as
// two independent ExoNodeDom trees. The full oimdb snapshot rides in an embedded
// <script id="__EXODRA_STATE__"> so the client hydrates the same store with no
// round-trip. Only the Board is statically importable here; other routes render
// client-side once their lazy chunk loads.
const EMPTY_OUTLET = '<main id="outlet" class="outlet"></main>';

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

    if (url === '/' || url.startsWith('/?')) {
        const pageHtml = new ExoNodeSsr(boardPage()).renderBody();
        if (appHtml.includes(EMPTY_OUTLET)) {
            appHtml = appHtml.replace(
                EMPTY_OUTLET,
                `<main id="outlet" class="outlet">${pageHtml}</main>`
            );
        }
    }

    return { appHtml, stateScript: shellSsr.renderStateScript() };
}
