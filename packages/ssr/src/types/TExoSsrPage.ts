import type { TExoSsrDocumentOptions } from './TExoSsrDocumentOptions';
import type { TExoSsrHeader } from './TExoSsrHeader';

// Ready-made strings beside the raw values: splice the strings into your own shell, or let
// `renderDocument()` build one.
export type TExoSsrPage = {
    // The rendered instances — what goes INSIDE the hydration container.
    html: string;
    status: number;
    // In the order they were set.
    headers: readonly TExoSsrHeader[];
    // The seeded entries first, then the ones the page added.
    head: string;
    // `''` when the state map is empty.
    stateScript: string;
    state: Record<string, unknown>;
    // The container it emits is the element `backend.hydrate` must be handed, not its child.
    renderDocument(options?: TExoSsrDocumentOptions): string;
};
