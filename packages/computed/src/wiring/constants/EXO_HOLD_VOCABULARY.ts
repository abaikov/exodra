import { exoVocabulary } from '@exodra/core';
import { commitExoMachine } from '../../machine/commitExoMachine';
import { runExoMachineSlots } from '../../machine/runExoMachineSlots';
import type { TExoCommitNode } from '../../computed/types/TExoCommitNode';
import type { TExoHoldApi } from '../types/TExoHoldApi';
import type { TExoMachineDeclared } from '../../machine/types/TExoMachineDeclared';
import type { TExoMachineProgram } from '../../machine/types/TExoMachineProgram';

/**
 * NOTHING ON THE HOT PATH READS IT, which is what separates it from a batch-depth counter.
 * A LINEAR SCAN and not a `Set`, because its length is the nesting depth of open holds.
 */
const heldStates: TExoCommitNode[] = [];

const EXO_HOLD_METHODS: TExoHoldApi = {
    hold<TState extends TExoCommitNode, TResult>(
        this: TState,
        of: TExoMachineDeclared<TState>,
        body: (enode: TState) => TResult
    ): TResult {
        if (heldStates.indexOf(this) !== -1) return body(this);

        const program: TExoMachineProgram<TState> = 'program' in of ? of.program : of;
        const at = program.wakesRow;
        const values = this.managedState;
        const chained = at >= 0;
        const wakes = chained ? values[at] : null;
        if (chained) values[at] = null;
        heldStates.push(this);
        try {
            return body(this);
        } finally {
            heldStates.pop();
            if (chained) values[at] = wakes;
            commitExoMachine(program, this);
            if (program.bodyMask !== 0) runExoMachineSlots(program, this);
        }
    },
};

/**
 * THE CHAINS ARE PARKED for the length of the body, and without that a hold would coalesce almost
 * nothing: a live instance runs a field's wake chain AT THE WRITE. It takes BODIES and not
 * transitions, because a transition settles at the end of its own call and nothing can stop it.
 */
export const EXO_HOLD_VOCABULARY = exoVocabulary(EXO_HOLD_METHODS);
