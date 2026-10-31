import type { TExoContextFrame } from '@exodra/context';
import type { TExoStrBackend } from '@exodra/string';
import type { TExoSsrHeader } from './TExoSsrHeader';

// Seeded into the response, so a wire that never mentions any of it still produces a complete
// document. `addHead` entries concatenate AFTER `head`, so the seeded ones stay first.
export type TExoSsrPageOptions = {
    // Name the SAME object per request: a schema is cached per backend by POINTER, so one built per
    // request recompiles every schema. Left out, the page runs on a backend composed with nothing.
    backend?: TExoStrBackend;
    status?: number;
    headers?: readonly TExoSsrHeader[];
    head?: string | readonly string[];
    state?: Record<string, unknown> | Map<string, unknown>;
    // A frame to chain the request's own under, for a caller that already has context of its
    // own to provide — a router handing the page its route. Passed, never installed in a
    // module holder, so two requests rendering at once cannot see each other's.
    context?: TExoContextFrame | null;
    // Handed to the page machine's `wire`, as `backend.render(machine, parent, params)` does.
    params?: unknown;
};
