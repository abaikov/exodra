import { createExoNamedSchema, EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type {
    TExoMachine,
    TExoMachineInitialState,
    TExoSchemaCursor,
    TExoSchemaDecorator,
} from '@exodra/core';

export function createExoNamedTestMachine<TPorts, TWiring, TOut = void>(
    build: (cursor: TExoSchemaCursor<TPorts>) => void,
    makeInitialState: (ports: TPorts) => TExoMachineInitialState<TWiring, TOut>,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoMachine<TWiring, TPorts> {
    const schema = createExoNamedSchema<TPorts>(build, decorate);
    return {
        declaration: schema,
        forms: [],
        createInitialState: makeInitialState(schema.ports),
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    };
}
