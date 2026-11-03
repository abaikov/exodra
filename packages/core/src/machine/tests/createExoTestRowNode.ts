import { EXO_BASE_NODE_VOCABULARY } from '../../plugins/constants/EXO_BASE_NODE_VOCABULARY';
import { composeExoPlugins } from '../../plugins/composeExoPlugins';
import { EXO_NO_STATE } from '../../wiring/constants/EXO_NO_STATE';
import type { TExoBaseNodeFields } from '../../wiring/types/TExoBaseNodeFields';
import type { TExoMachineNode } from '../types/TExoMachineNode';

class ExoRowBackend {
    constructor() {
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY);
    }

    attr(): void {}

    on(): void {}
}

export const createExoTestRowNode = (): TExoBaseNodeFields & TExoMachineNode =>
    ({
        __proto__: new ExoRowBackend(),
        context: null,
        disposers: null,
        state: EXO_NO_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
    } as unknown as TExoBaseNodeFields & TExoMachineNode);
