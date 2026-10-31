import { ExoWiringBlock } from './ExoWiringBlock';
import type { TExoMachineInitialState } from '@exodra/core';
import type { TExoComputedMachineNode } from '../computed/types/TExoComputedMachineNode';
import type { TExoWiringSite } from './types/TExoWiringSite';

const HERE = 'exoWiring';

export function exoWiring<TWiring extends TExoComputedMachineNode, TOut = void>(
    body: (w: ExoWiringBlock<TWiring>, c: TWiring, index: number) => TOut
): TExoMachineInitialState<TWiring, TOut> {
    const site: TExoWiringSite<TWiring> = {
        program: null,
        handles: [],
        marks: [],
        derivations: [],
        effects: [],
        owns: [],
        mountedRow: -1,
    };
    return (c, index): TOut => {
        const w = new ExoWiringBlock<TWiring>(site, c);
        const out = body(w, c, index);
        // A BLOCK THAT NEVER ARMED COMPILED NOTHING, FILLED NOTHING, AND NO TRANSITION OF IT CAN
        // COMMIT — every symptom is a component that renders empty and never moves.
        if (w.instance === null) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${HERE}: this wiring block never called done(). Call done() at the end of ` +
                      'the body, after the last declaration.'
                    : 'EXO0078'
            );
        }
        return out;
    };
}
