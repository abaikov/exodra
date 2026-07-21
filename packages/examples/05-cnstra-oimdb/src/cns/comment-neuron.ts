import { neuron } from '@cnstra/core';
import type { WorkspaceStore } from '../store/workspace-store';
import { addCommentRequested, commentAdded, commentRejected } from './collaterals';

// Comment domain: append a comment to a task (validated, non-empty).
export function createCommentNeuron(
    oimdbInstance: WorkspaceStore,
    now: () => number,
    newId: (prefix: string) => string
) {
    return neuron({ commentAdded, commentRejected }).dendrite({
        collateral: addCommentRequested,
        response: (payload, axon) => {
            const body = payload.body.trim();
            if (!body) {
                return axon.commentRejected.createSignal({
                    command: 'addComment',
                    reason: 'Comment must not be empty',
                });
            }
            if (!oimdbInstance.tasks.collection.getOneByPk(payload.taskId)) return;
            oimdbInstance.comments.collection.upsertOne({
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
    });
}
