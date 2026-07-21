import { neuron } from '@cnstra/core';
import type { Task } from '../domain/types';
import type { WorkspaceStore } from '../store/workspace-store';
import {
    taskAdded,
    taskPersisted,
    taskPersistFailed,
    taskPersistRejected,
} from './collaterals';

// Task persistence saga (the "async" half of adding a task):
//   optimistic add (pending) → simulate latency → re-stimulate persisted/failed.
export function createTaskPersistNeuron(
    oimdbInstance: WorkspaceStore,
    persistDelayMs: number,
    persistShouldFail: (task: Task) => boolean
) {
    return neuron({ taskPersisted, taskPersistFailed }).dendrite({
        collateral: taskAdded,
        response: (payload, _axon, ctx) => {
            const cns = ctx.cns;
            if (!cns) return;
            setTimeout(() => {
                const task = oimdbInstance.tasks.collection.getOneByPk(payload.id);
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
}

// Settle: confirm (clear the pending flag) or roll back (remove + surface error).
export function createTaskSettleNeuron(oimdbInstance: WorkspaceStore) {
    return neuron({ taskPersistRejected })
        .dendrite({
            collateral: taskPersisted,
            response: payload => {
                oimdbInstance.tasks.collection.upsertOneByPk(payload.id, {
                    pending: false,
                });
            },
        })
        .dendrite({
            collateral: taskPersistFailed,
            response: (payload, axon) => {
                oimdbInstance.tasks.collection.removeOneByPk(payload.id);
                return axon.taskPersistRejected.createSignal({
                    command: 'addTask',
                    reason: payload.reason,
                });
            },
        });
}
