import { CNS, collateral, neuron, createPersistRegistry } from '@cnstra/core';
import type { Task, TaskPriority } from '../domain/types';
import type { WorkspaceStore } from '../store/workspace-store';

// ---------------------------------------------------------------------------
// Collaterals = typed channels. Commands are entry points; events are emitted by
// neurons during the deterministic traversal. Adding a task is a saga: optimistic
// insert (pending) → simulated async persist → settle (clear pending or roll back).
// Every settled command also flows into an activity neuron that appends an audit
// record — one orchestration, many entities touched.
// ---------------------------------------------------------------------------

export interface AddTaskCommand {
    projectId: string;
    title: string;
    priority: TaskPriority;
    statusId: string;
    assigneeId: string | null;
    labelId: string | null;
    tagIds: readonly string[];
    milestoneId: string | null;
}

// Commands
export const addTaskRequested = collateral<AddTaskCommand>();
export const moveTaskRequested = collateral<{ id: string; statusId: string }>();
export const assignTaskRequested = collateral<{ id: string; assigneeId: string | null }>();
export const setTaskTagsRequested = collateral<{ id: string; tagIds: readonly string[] }>();
export const deleteTaskRequested = collateral<{ id: string }>();
export const addCommentRequested = collateral<{ taskId: string; authorId: string; body: string }>();
export const archiveProjectRequested = collateral<{ id: string }>();

// Events (emitted during traversal; the activity neuron listens to all of them)
export const taskAdded = collateral<{ id: string; title: string; actorId: string | null }>();
export const taskMoved = collateral<{ id: string; statusId: string; title: string }>();
export const taskAssigned = collateral<{ id: string; assigneeId: string | null; title: string }>();
export const taskTagged = collateral<{ id: string; title: string }>();
export const taskDeleted = collateral<{ id: string; title: string }>();
export const commentAdded = collateral<{ taskId: string; authorId: string }>();
export const projectArchived = collateral<{ id: string; name: string; removed: number }>();
export const taskPersisted = collateral<{ id: string }>();
export const taskPersistFailed = collateral<{ id: string; reason: string }>();
export const validationFailed = collateral<{ command: string; reason: string }>();
export const activityLogged = collateral<{ id: string }>();

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

export function createWorkspaceCns(
    store: WorkspaceStore,
    options: WorkspaceCnsOptions = {}
) {
    const persistDelayMs = options.persistDelayMs ?? 600;
    const persistShouldFail =
        options.persistShouldFail ?? (task => /\bfail\b/i.test(task.title));
    const now = options.now ?? (() => Date.now());
    const title = (id: string) => store.tasks.collection.getOneByPk(id)?.title ?? id;

    // 1. Commands -> store mutations + first-hop events.
    const commandNeuron = neuron({
        taskAdded,
        taskMoved,
        taskAssigned,
        taskTagged,
        taskDeleted,
        commentAdded,
        projectArchived,
        validationFailed,
    })
        .dendrite({
            collateral: addTaskRequested,
            response: (payload, axon) => {
                const t = payload.title.trim();
                if (!t) {
                    return axon.validationFailed.createSignal({
                        command: 'addTask',
                        reason: 'Title must not be empty',
                    });
                }
                if (!store.projects.collection.getOneByPk(payload.projectId)) {
                    return axon.validationFailed.createSignal({
                        command: 'addTask',
                        reason: `Unknown project "${payload.projectId}"`,
                    });
                }
                const id = newId('tk');
                store.tasks.collection.upsertOne({
                    id,
                    projectId: payload.projectId,
                    milestoneId: payload.milestoneId,
                    title: t,
                    statusId: payload.statusId,
                    labelId: payload.labelId,
                    assigneeId: payload.assigneeId,
                    tagIds: payload.tagIds,
                    priority: payload.priority,
                    createdAt: now(),
                    pending: true,
                });
                return axon.taskAdded.createSignal({
                    id,
                    title: t,
                    actorId: payload.assigneeId,
                });
            },
        })
        .dendrite({
            collateral: moveTaskRequested,
            response: (payload, axon) => {
                const task = store.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                if (!store.statuses.collection.getOneByPk(payload.statusId)) {
                    return axon.validationFailed.createSignal({
                        command: 'moveTask',
                        reason: `Unknown status "${payload.statusId}"`,
                    });
                }
                store.tasks.collection.upsertOneByPk(payload.id, {
                    statusId: payload.statusId,
                });
                return axon.taskMoved.createSignal({
                    id: payload.id,
                    statusId: payload.statusId,
                    title: task.title,
                });
            },
        })
        .dendrite({
            collateral: assignTaskRequested,
            response: (payload, axon) => {
                const task = store.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                store.tasks.collection.upsertOneByPk(payload.id, {
                    assigneeId: payload.assigneeId,
                });
                return axon.taskAssigned.createSignal({
                    id: payload.id,
                    assigneeId: payload.assigneeId,
                    title: task.title,
                });
            },
        })
        .dendrite({
            collateral: setTaskTagsRequested,
            response: (payload, axon) => {
                const task = store.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                store.tasks.collection.upsertOneByPk(payload.id, {
                    tagIds: payload.tagIds,
                });
                return axon.taskTagged.createSignal({
                    id: payload.id,
                    title: task.title,
                });
            },
        })
        .dendrite({
            collateral: deleteTaskRequested,
            response: (payload, axon) => {
                const task = store.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                // Cascade: drop the task's comments too. Snapshot the index set
                // to an array first — removing while iterating the live set is
                // fragile (it can skip entries once the index updates).
                for (const cid of [
                    ...store.commentsByTask.getPksByKey(payload.id),
                ]) {
                    store.comments.collection.removeOneByPk(cid);
                }
                store.tasks.collection.removeOneByPk(payload.id);
                return axon.taskDeleted.createSignal({
                    id: payload.id,
                    title: task.title,
                });
            },
        })
        .dendrite({
            collateral: addCommentRequested,
            response: (payload, axon) => {
                const body = payload.body.trim();
                if (!body) {
                    return axon.validationFailed.createSignal({
                        command: 'addComment',
                        reason: 'Comment must not be empty',
                    });
                }
                if (!store.tasks.collection.getOneByPk(payload.taskId)) return;
                store.comments.collection.upsertOne({
                    id: newId('c'),
                    taskId: payload.taskId,
                    authorId: payload.authorId,
                    body,
                    createdAt: now(),
                });
                return axon.commentAdded.createSignal({
                    taskId: payload.taskId,
                    authorId: payload.authorId,
                });
            },
        })
        .dendrite({
            collateral: archiveProjectRequested,
            response: (payload, axon) => {
                const project = store.projects.collection.getOneByPk(payload.id);
                if (!project) return;
                const taskIds = [...store.tasksByProject.getPksByKey(payload.id)];
                for (const tid of taskIds) {
                    for (const cid of [
                        ...store.commentsByTask.getPksByKey(tid),
                    ]) {
                        store.comments.collection.removeOneByPk(cid);
                    }
                    store.tasks.collection.removeOneByPk(tid);
                }
                store.projects.collection.upsertOneByPk(payload.id, {
                    archived: true,
                });
                return axon.projectArchived.createSignal({
                    id: payload.id,
                    name: project.name,
                    removed: taskIds.length,
                });
            },
        });

    // 2. Persist saga: optimistic add -> simulate latency -> re-stimulate.
    const persistNeuron = neuron({ taskPersisted, taskPersistFailed }).dendrite({
        collateral: taskAdded,
        response: (payload, _axon, ctx) => {
            const cns = ctx.cns;
            if (!cns) return;
            setTimeout(() => {
                const task = store.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                cns.stimulate(
                    persistShouldFail(task)
                        ? taskPersistFailed.createSignal({
                              id: payload.id,
                              reason: `Could not save "${task.title}"`,
                          })
                        : taskPersisted.createSignal({ id: payload.id })
                );
            }, persistDelayMs);
        },
    });

    // 3. Settle: confirm (clear pending) or roll back (remove + error).
    const settleNeuron = neuron({ validationFailed })
        .dendrite({
            collateral: taskPersisted,
            response: payload => {
                store.tasks.collection.upsertOneByPk(payload.id, {
                    pending: false,
                });
            },
        })
        .dendrite({
            collateral: taskPersistFailed,
            response: (payload, axon) => {
                store.tasks.collection.removeOneByPk(payload.id);
                return axon.validationFailed.createSignal({
                    command: 'addTask',
                    reason: payload.reason,
                });
            },
        });

    // 4. Activity log: turn every settled command into an audit record. One neuron,
    // listening to all domain events, writing the `activity` collection.
    const append = (
        axon: { activityLogged: typeof activityLogged },
        kind: import('../domain/types').ActivityKind,
        summary: string,
        entityId: string,
        actorId: string | null
    ) => {
        const id = newId('a');
        store.activity.collection.upsertOne({
            id,
            kind,
            summary,
            entityId,
            actorId,
            at: now(),
        });
        return axon.activityLogged.createSignal({ id });
    };
    const activityNeuron = neuron({ activityLogged })
        .dendrite({
            collateral: taskPersisted,
            response: (payload, axon) =>
                append(axon, 'task.created', `Created "${title(payload.id)}"`, payload.id, null),
        })
        .dendrite({
            collateral: taskMoved,
            response: (payload, axon) =>
                append(
                    axon,
                    'task.moved',
                    `"${payload.title}" → ${store.statuses.collection.getOneByPk(payload.statusId)?.name ?? payload.statusId}`,
                    payload.id,
                    null
                ),
        })
        .dendrite({
            collateral: taskAssigned,
            response: (payload, axon) =>
                append(
                    axon,
                    'task.assigned',
                    `"${payload.title}" → ${payload.assigneeId ? store.members.collection.getOneByPk(payload.assigneeId)?.name ?? payload.assigneeId : 'unassigned'}`,
                    payload.id,
                    payload.assigneeId
                ),
        })
        .dendrite({
            collateral: taskTagged,
            response: (payload, axon) =>
                append(axon, 'task.tagged', `Retagged "${payload.title}"`, payload.id, null),
        })
        .dendrite({
            collateral: taskDeleted,
            response: (payload, axon) =>
                append(axon, 'task.deleted', `Deleted "${payload.title}"`, payload.id, null),
        })
        .dendrite({
            collateral: commentAdded,
            response: (payload, axon) =>
                append(
                    axon,
                    'comment.added',
                    `${store.members.collection.getOneByPk(payload.authorId)?.name ?? 'Someone'} commented`,
                    payload.taskId,
                    payload.authorId
                ),
        })
        .dendrite({
            collateral: projectArchived,
            response: (payload, axon) =>
                append(
                    axon,
                    'project.archived',
                    `Archived "${payload.name}" (${payload.removed} tasks)`,
                    payload.id,
                    null
                ),
        });

    const cns = new CNS([
        commandNeuron,
        persistNeuron,
        settleNeuron,
        activityNeuron,
    ]);

    const registry = createPersistRegistry({
        commandNeuron,
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
