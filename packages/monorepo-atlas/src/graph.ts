/**
 * The browser half, as one self-contained file.
 *
 * It finds its own container and its own data, so embedding is a `<div>` and a
 * `<script>` — no build step in the host project, no framework assumed.
 *
 *   <link rel="stylesheet" href="graph.css">
 *   <div id="exo-graph"></div>
 *   <script type="module" src="graph.js"></script>
 *
 * A host that wants control imports `mountFromUrl` (or `mountExplorer`) instead.
 */
import { mountFromUrl } from './client/mountFromUrl';

export { mountFromUrl };
export { mountExplorer } from './client/mountExplorer';
export type { TExoExplorerData, TExoMountOptions } from './client/mountExplorer';

const SELECTOR = '[data-exo-graph], #exo-graph';

async function boot(): Promise<void> {
    const containers = Array.from(
        document.querySelectorAll<HTMLElement>(SELECTOR)
    );

    for (const container of containers) {
        // The data sits next to this script unless the page says otherwise, so
        // the common case needs no configuration at all.
        const source =
            container.dataset.exoGraph ||
            new URL('graph.json', import.meta.url).href;
        try {
            await mountFromUrl(container, source);
        } catch (error) {
            // A graph that cannot load says so in place, rather than leaving an
            // empty box and an error only the console knows about.
            container.textContent = `Could not load the dependency graph (${
                (error as Error).message
            }).`;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void boot());
} else {
    void boot();
}
