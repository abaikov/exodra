import { createExoSchema, EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type {
    TExoMachine,
    TExoMachineInitialState,
    TExoSchemaCursor,
    TExoSchemaDecorator,
} from '@exodra/core';

// A machine that is its initial state alone — the shape the JSX compiler emits — for backend tests.
export function createExoTestMachine<TPorts, TWiring, TOut = void>(
    build: (cursor: TExoSchemaCursor) => TPorts,
    makeInitialState: (ports: TPorts) => TExoMachineInitialState<TWiring, TOut>,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoMachine<TWiring, TPorts>;
export function createExoTestMachine<TPorts, TWiring, TOut = void>(
    build: (cursor: TExoSchemaCursor<TPorts>) => void,
    makeInitialState: (ports: TPorts) => TExoMachineInitialState<TWiring, TOut>,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoMachine<TWiring, TPorts>;
export function createExoTestMachine<TPorts, TWiring, TOut = void>(
    build: (cursor: TExoSchemaCursor<TPorts>) => TPorts | void,
    makeInitialState: (ports: TPorts) => TExoMachineInitialState<TWiring, TOut>,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoMachine<TWiring, TPorts> {
    const schema = createExoSchema<TPorts>(
        build as (cursor: TExoSchemaCursor<TPorts>) => TPorts,
        decorate
    );
    return {
        declaration: schema,
        forms: [],
        createInitialState: makeInitialState(schema.ports),
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    };
}
