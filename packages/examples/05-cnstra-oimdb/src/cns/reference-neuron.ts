import { neuron } from '@cnstra/core';
import type { WorkspaceStore } from '../store/workspace-store';
import {
    refUpsertRequested,
    refPatchRequested,
    refRemoveRequested,
} from './collaterals';

// Reference-data CRUD routed through the CNS. Unlike the task lifecycle there is
// no saga or validation here — these are plain store writes. The point is that
// they ride the SAME command bus as everything else, so the UI never writes to
// oimdb directly and every mutation commits at one place: the CNS drain (which
// flushes the store's manual queue). The neuron emits nothing (empty axon).
export function createReferenceNeuron(oimdbInstance: WorkspaceStore) {
    return neuron({})
        .dendrite({
            collateral: refUpsertRequested,
            response: payload => {
                oimdbInstance[payload.name].collection.upsertOne(
                    payload.entity as never
                );
            },
        })
        .dendrite({
            collateral: refPatchRequested,
            response: payload => {
                oimdbInstance[payload.name].collection.upsertOneByPk(
                    payload.id,
                    payload.patch as never
                );
            },
        })
        .dendrite({
            collateral: refRemoveRequested,
            response: payload => {
                oimdbInstance[payload.name].collection.removeOneByPk(payload.id);
            },
        });
}
