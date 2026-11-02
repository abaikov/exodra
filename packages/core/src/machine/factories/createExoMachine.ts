import { EXO_NO_EFFECTS } from '../constants/EXO_NO_EFFECTS';
import { EXO_NO_HANDLERS } from '../constants/EXO_NO_HANDLERS';
import { harvestExoSchema } from '../../schema/factories/harvestExoSchema';
import type { TExoCursorDeclaration } from '../../schema/types/TExoCursorDeclaration';
import type { TExoMachine } from '../types/TExoMachine';
import type { TExoMachineNode } from '../types/TExoMachineNode';
import type { TExoMachineOptions } from '../types/TExoMachineOptions';

export function createExoMachine<
    TWiring extends TExoMachineNode = TExoMachineNode,
    TParams = unknown,
    TState = unknown,
    TPorts = unknown
>(
    schema: TExoCursorDeclaration<TPorts>,
    options?: TExoMachineOptions<TWiring, TParams, TState>
): TExoMachine<TWiring, TPorts, TParams, TState> {
    harvestExoSchema(schema);
    const createInitialState = options?.createInitialState ?? null;
    // THE ONE PLACE THE SHARED-OBJECT BUG CAN BE CAUGHT: a value handed here would be ONE object
    // shared by every instance of the component, each seeing every other's writes.
    if (createInitialState !== null && typeof createInitialState !== 'function') {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'createExoMachine: createInitialState was handed a value, not a function'
                : 'EXO0026'
        );
    }
    return {
        declaration: schema,
        forms: [],
        createInitialState: createInitialState as TExoMachine<TWiring>['createInitialState'],
        effects: EXO_NO_EFFECTS as TExoMachine<TWiring>['effects'],
        handlers: EXO_NO_HANDLERS,
    };
}
