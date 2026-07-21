import { CNS, createPersistRegistry } from '@cnstra/core';
import type { Task } from '../domain/types';
import type { WorkspaceStore } from '../store/workspace-store';
import { createTaskNeuron } from './task-neuron';
import { createCommentNeuron } from './comment-neuron';
import { createProjectNeuron } from './project-neuron';
import {
    createTaskPersistNeuron,
    createTaskSettleNeuron,
} from './task-persist-neuron';
import { createActivityNeuron } from './activity-neuron';
import {
    addTaskRequested,
    moveTaskRequested,
    assignTaskRequested,
    setTaskTagsRequested,
    deleteTaskRequested,
    addCommentRequested,
    archiveProjectRequested,
} from './collaterals';

// The channels are part of the CNS public surface — re-export so callers keep
// importing them (and the command/event types) from here.
export * from './collaterals';

function newId(prefix: string): string {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return `${prefix}-${c.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export interface WorkspaceCnsOptions {
    persistDelayMs?: number;
    persistShouldFail?: (task: Task) => boolean;
    now?: () => number;
}

// Compose the workspace CNS from cohesive per-domain neurons:
//   task / comment / project (commands → mutations + events),
//   the task-persist saga (persist → settle/rollback),
//   and a cross-cutting activity log. `newId`/`now` are injected so the neurons
//   stay pure and testable.
export function createWorkspaceCns(
    oimdbInstance: WorkspaceStore,
    options: WorkspaceCnsOptions = {}
) {
    const persistDelayMs = options.persistDelayMs ?? 600;
    const persistShouldFail =
        options.persistShouldFail ?? (task => /\bfail\b/i.test(task.title));
    const now = options.now ?? (() => Date.now());

    const taskNeuron = createTaskNeuron(oimdbInstance, now, newId);
    const commentNeuron = createCommentNeuron(oimdbInstance, now, newId);
    const projectNeuron = createProjectNeuron(oimdbInstance);
    const persistNeuron = createTaskPersistNeuron(oimdbInstance, persistDelayMs, persistShouldFail);
    const settleNeuron = createTaskSettleNeuron(oimdbInstance);
    const activityNeuron = createActivityNeuron(oimdbInstance, now, newId);

    const cns = new CNS([
        taskNeuron,
        commentNeuron,
        projectNeuron,
        persistNeuron,
        settleNeuron,
        activityNeuron,
    ]);

    const registry = createPersistRegistry({
        taskNeuron,
        commentNeuron,
        projectNeuron,
        persistNeuron,
        settleNeuron,
        activityNeuron,
    });
    registry.registerCollateral('addTaskRequested', addTaskRequested);
    registry.registerCollateral('moveTaskRequested', moveTaskRequested);
    registry.registerCollateral('assignTaskRequested', assignTaskRequested);
    registry.registerCollateral('setTaskTagsRequested', setTaskTagsRequested);
    registry.registerCollateral('deleteTaskRequested', deleteTaskRequested);
    registry.registerCollateral('addCommentRequested', addCommentRequested);
    registry.registerCollateral('archiveProjectRequested', archiveProjectRequested);

    return { cns, registry };
}

export type WorkspaceCns = ReturnType<typeof createWorkspaceCns>;
