import { neuron } from '@cnstra/core';
import type { WorkspaceStore } from '../store/workspace-store';
import { archiveProjectRequested, projectArchived } from './collaterals';

// Project domain: archiving a project CASCADES — it deletes the project's tasks
// and their comments, then flags the project archived. Snapshot the index set to
// an array before removing (removing while iterating the live set can skip
// entries as the index updates).
export function createProjectNeuron(oimdbInstance: WorkspaceStore) {
    return neuron({ projectArchived }).dendrite({
        collateral: archiveProjectRequested,
        response: (payload, axon) => {
            const project = oimdbInstance.projects.collection.getOneByPk(payload.id);
            if (!project) return;
            const taskIds = [...oimdbInstance.tasksByProject.getPksByKey(payload.id)];
            for (const tid of taskIds) {
                for (const cid of [...oimdbInstance.commentsByTask.getPksByKey(tid)]) {
                    oimdbInstance.comments.collection.removeOneByPk(cid);
                }
                oimdbInstance.tasks.collection.removeOneByPk(tid);
            }
            oimdbInstance.projects.collection.upsertOneByPk(payload.id, {
                archived: true,
            });
            return axon.projectArchived.createSignal({
                id: payload.id,
                name: project.name,
                removed: taskIds.length,
            });
        },
    });
}
