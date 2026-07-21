import { neuron } from '@cnstra/core';
import type { ActivityKind } from '../domain/types';
import type { WorkspaceStore } from '../store/workspace-store';
import {
    activityLogged,
    commentAdded,
    projectArchived,
    taskAssigned,
    taskDeleted,
    taskMoved,
    taskPersisted,
    taskTagged,
} from './collaterals';

// Cross-cutting audit log: one neuron listening to every settled domain event,
// appending an Activity record. This is the "many entities, one orchestration"
// payoff — the UI never wires the feed, the graph does.
export function createActivityNeuron(
    oimdbInstance: WorkspaceStore,
    now: () => number,
    newId: (prefix: string) => string
) {
    const title = (id: string) =>
        oimdbInstance.tasks.collection.getOneByPk(id)?.title ?? id;

    const append = (
        axon: { activityLogged: typeof activityLogged },
        kind: ActivityKind,
        summary: string,
        entityId: string,
        actorId: string | null
    ) => {
        const id = newId('a');
        oimdbInstance.activity.collection.upsertOne({
            id,
            kind,
            summary,
            entityId,
            actorId,
            at: now(),
        });
        return axon.activityLogged.createSignal({ id });
    };

    return neuron({ activityLogged })
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
                    `"${payload.title}" → ${oimdbInstance.statuses.collection.getOneByPk(payload.statusId)?.name ?? payload.statusId}`,
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
                    `"${payload.title}" → ${payload.assigneeId ? oimdbInstance.members.collection.getOneByPk(payload.assigneeId)?.name ?? payload.assigneeId : 'unassigned'}`,
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
                    `${oimdbInstance.members.collection.getOneByPk(payload.authorId)?.name ?? 'Someone'} commented`,
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
}
