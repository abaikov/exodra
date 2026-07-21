import {
    takeSnapshot,
    loadSnapshot,
    type WorkspaceStore,
} from '../store/workspace-store';
import type { EntityName, WorkspaceSnapshot } from '../domain/types';

// Client-side persistence: the oimdb store serializes to JSON (the same
// getAll()/upsertMany() round-trip used for SSR) and rides in localStorage, so
// edits survive a reload. The server SSRs the seed; the client restores the saved
// snapshot right after mount, reconciled by key.
const STORAGE_KEY = 'exodra-workspace-v1';

const COLLECTIONS: readonly EntityName[] = [
    'teams',
    'members',
    'projects',
    'milestones',
    'statuses',
    'tags',
    'labels',
    'tasks',
    'comments',
    'activity',
];

export function loadPersisted(): WorkspaceSnapshot | null {
    try {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as WorkspaceSnapshot;
        if (!parsed || !Array.isArray(parsed.tasks)) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function savePersisted(store: WorkspaceStore): void {
    try {
        globalThis.localStorage?.setItem(
            STORAGE_KEY,
            JSON.stringify(takeSnapshot(store))
        );
    } catch {
        // ignore quota / unavailable storage
    }
}

export function clearPersisted(): void {
    try {
        globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

export function restorePersisted(store: WorkspaceStore): boolean {
    const saved = loadPersisted();
    if (!saved) return false;
    loadSnapshot(store, saved);
    return true;
}

// Persist on any collection change, coalescing bursts into one write per
// microtask so a multi-entity command saves only once.
export function attachPersistence(store: WorkspaceStore): () => void {
    let scheduled = false;
    const flush = () => {
        scheduled = false;
        savePersisted(store);
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(flush);
    };
    const unsubs = COLLECTIONS.map(name =>
        store[name].collection.subscribeOnAnyUpdate(schedule)
    );
    return () => unsubs.forEach(u => u());
}
