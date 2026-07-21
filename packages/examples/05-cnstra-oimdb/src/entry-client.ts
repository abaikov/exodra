import { mountApp } from './app/mount-app';
import type { WorkspaceSnapshot } from './domain/types';

// Read the snapshot @exodra/ssr embedded under the 'workspace' key. The client
// takes over with the exact same store — no data fetch.
function readState(): WorkspaceSnapshot | undefined {
    const el = document.getElementById('__EXODRA_STATE__');
    if (!el?.textContent) return undefined;
    try {
        const state = JSON.parse(el.textContent) as {
            workspace?: WorkspaceSnapshot;
        };
        return state.workspace;
    } catch {
        return undefined;
    }
}

const root = document.getElementById('app');
if (root) {
    // The server rendered the shell + Board; the client HYDRATES that DOM in place
    // (no teardown, no flash) over the embedded snapshot and takes over routing.
    // Subsequent pages load as their own lazy chunks on navigation.
    mountApp(root, readState());
}
