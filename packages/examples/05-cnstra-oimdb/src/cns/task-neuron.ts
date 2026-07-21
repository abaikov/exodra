import { neuron } from '@cnstra/core';
import type { WorkspaceStore } from '../store/workspace-store';
import {
    addTaskRequested,
    moveTaskRequested,
    assignTaskRequested,
    setTaskTagsRequested,
    deleteTaskRequested,
    taskAdded,
    taskMoved,
    taskAssigned,
    taskTagged,
    taskDeleted,
    taskRejected,
} from './collaterals';

// Task domain: turns task commands into store mutations and first-hop events.
// Validation failures short-circuit; an add is optimistic (pending:true) and the
// persist saga settles it later.
export function createTaskNeuron(
    oimdbInstance: WorkspaceStore,
    now: () => number,
    newId: (prefix: string) => string
) {
    return neuron({
        taskAdded,
        taskMoved,
        taskAssigned,
        taskTagged,
        taskDeleted,
        taskRejected,
    })
        .dendrite({
            collateral: addTaskRequested,
            response: (payload, axon) => {
                const t = payload.title.trim();
                if (!t) {
                    return axon.taskRejected.createSignal({
                        command: 'addTask',
                        reason: 'Title must not be empty',
                    });
                }
                if (!oimdbInstance.projects.collection.getOneByPk(payload.projectId)) {
                    return axon.taskRejected.createSignal({
                        command: 'addTask',
                        reason: `Unknown project "${payload.projectId}"`,
                    });
                }
                const id = newId('tk');
                oimdbInstance.tasks.collection.upsertOne({
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
                const task = oimdbInstance.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                if (!oimdbInstance.statuses.collection.getOneByPk(payload.statusId)) {
                    return axon.taskRejected.createSignal({
                        command: 'moveTask',
                        reason: `Unknown status "${payload.statusId}"`,
                    });
                }
                oimdbInstance.tasks.collection.upsertOneByPk(payload.id, {
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
                const task = oimdbInstance.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                oimdbInstance.tasks.collection.upsertOneByPk(payload.id, {
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
                const task = oimdbInstance.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                oimdbInstance.tasks.collection.upsertOneByPk(payload.id, {
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
                const task = oimdbInstance.tasks.collection.getOneByPk(payload.id);
                if (!task) return;
                // Cascade: drop the task's comments too. Snapshot the index set
                // to an array first — removing while iterating the live set is
                // fragile (it can skip entries once the index updates).
                for (const cid of [
                    ...oimdbInstance.commentsByTask.getPksByKey(payload.id),
                ]) {
                    oimdbInstance.comments.collection.removeOneByPk(cid);
                }
                oimdbInstance.tasks.collection.removeOneByPk(payload.id);
                return axon.taskDeleted.createSignal({
                    id: payload.id,
                    title: task.title,
                });
            },
        });
}
