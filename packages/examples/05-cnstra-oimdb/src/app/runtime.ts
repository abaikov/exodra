// The shared app runtime — created ONCE on the client (and per-request on the
// server) and stashed as a module singleton so lazily-loaded page chunks can
// reach the store, the CNS command bus, and lookups without re-instantiating the
// core. This module + the store/cns + @exodra/* + oimdb/cnstra is the common
// chunk every page shares; each page file is its own lazy chunk.
import { bindable } from '@exodra/reactivity';
import type { TExoWritableBindable } from '@exodra/reactivity';
import {
    createWorkspaceStore,
    type WorkspaceStore,
} from '../store/workspace-store';
import {
    createWorkspaceCns,
    addTaskRequested,
    moveTaskRequested,
    assignTaskRequested,
    setTaskTagsRequested,
    deleteTaskRequested,
    addCommentRequested,
    archiveProjectRequested,
    taskRejected,
    commentRejected,
    taskPersistRejected,
    type WorkspaceCns,
    type AddTaskCommand,
} from '../cns/workspace-cns';
import { loadSnapshot } from '../store/workspace-store';
import type { EntityName, WorkspaceSnapshot } from '../domain/types';

export interface WorkspaceRuntime {
    oimdbInstance: WorkspaceStore;
    cns: WorkspaceCns['cns'];
    error: TExoWritableBindable<string>;
    // command dispatchers (stimulate the CNS; clear the error first)
    addTask(cmd: AddTaskCommand): void;
    moveTask(id: string, statusId: string): void;
    assignTask(id: string, assigneeId: string | null): void;
    setTaskTags(id: string, tagIds: readonly string[]): void;
    deleteTask(id: string): void;
    addComment(taskId: string, authorId: string, body: string): void;
    archiveProject(id: string): void;
    // Reference-data CRUD (tags, labels, members, teams, projects, milestones).
    // Reactive direct store writes — the orchestrated TASK lifecycle goes through
    // the CNS above; reference data is plain reactive editing.
    createEntity(name: EntityName, entity: Record<string, unknown>): void;
    patchEntity(name: EntityName, id: string, patch: Record<string, unknown>): void;
    removeEntity(name: EntityName, id: string): void;
    // subscribe to validation errors (client only)
    bindErrors(): () => void;
}

export function createRuntime(snapshot?: WorkspaceSnapshot): WorkspaceRuntime {
    const oimdbInstance = createWorkspaceStore();
    if (snapshot) loadSnapshot(oimdbInstance, snapshot);
    const { cns } = createWorkspaceCns(oimdbInstance);
    const error = bindable('');

    const send = (signal: Parameters<typeof cns.stimulate>[0]) => {
        error.setValue('');
        cns.stimulate(signal);
    };

    return {
        oimdbInstance,
        cns,
        error,
        addTask: cmd => send(addTaskRequested.createSignal(cmd)),
        moveTask: (id, statusId) =>
            send(moveTaskRequested.createSignal({ id, statusId })),
        assignTask: (id, assigneeId) =>
            send(assignTaskRequested.createSignal({ id, assigneeId })),
        setTaskTags: (id, tagIds) =>
            send(setTaskTagsRequested.createSignal({ id, tagIds })),
        deleteTask: id => send(deleteTaskRequested.createSignal({ id })),
        addComment: (taskId, authorId, body) =>
            send(addCommentRequested.createSignal({ taskId, authorId, body })),
        archiveProject: id =>
            send(archiveProjectRequested.createSignal({ id })),
        createEntity: (name, entity) =>
            oimdbInstance[name].collection.upsertOne(entity as never),
        patchEntity: (name, id, patch) =>
            oimdbInstance[name].collection.upsertOneByPk(id, patch as never),
        removeEntity: (name, id) => oimdbInstance[name].collection.removeOneByPk(id),
        bindErrors() {
            // Every domain emits its OWN rejection collateral; the UI cares about
            // all of them, so watch the set.
            const rejections = new Set<unknown>([
                taskRejected,
                commentRejected,
                taskPersistRejected,
            ]);
            return cns.addResponseListener(res => {
                const out = (
                    res as {
                        outputSignal?: {
                            collateral?: unknown;
                            payload?: { reason?: string };
                        };
                    }
                ).outputSignal;
                if (out && rejections.has(out.collateral)) {
                    error.setValue(out.payload?.reason ?? 'Invalid command');
                }
            });
        },
    };
}

// Module singleton — set by the entry once, read by lazy page chunks. (The
// router is passed explicitly to the shell, so it needs no singleton here.)
let current: WorkspaceRuntime | undefined;

export function setRuntime(rt: WorkspaceRuntime): void {
    current = rt;
}

export function getRuntime(): WorkspaceRuntime {
    if (!current) throw new Error('Runtime not initialised — call setRuntime first');
    return current;
}
