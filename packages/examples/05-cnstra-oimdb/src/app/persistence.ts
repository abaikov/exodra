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

export function savePersisted(oimdbInstance: WorkspaceStore): void {
    try {
        globalThis.localStorage?.setItem(
            STORAGE_KEY,
            JSON.stringify(takeSnapshot(oimdbInstance))
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

export function restorePersisted(oimdbInstance: WorkspaceStore): boolean {
    const saved = loadPersisted();
    if (!saved) return false;
    loadSnapshot(oimdbInstance, saved);
    return true;
}

// Persist on any collection change, coalescing bursts into one write per
// microtask so a multi-entity command saves only once.
export function attachPersistence(oimdbInstance: WorkspaceStore): () => void {
    let scheduled = false;
    const flush = () => {
        scheduled = false;
        savePersisted(oimdbInstance);
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(flush);
    };
    const unsubs = COLLECTIONS.map(name =>
        oimdbInstance[name].collection.subscribeOnAnyUpdate(schedule)
    );
    return () => unsubs.forEach(u => u());
}
