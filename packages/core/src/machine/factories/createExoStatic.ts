import { EXO_NO_EFFECTS } from '../constants/EXO_NO_EFFECTS';
import { EXO_NO_HANDLERS } from '../constants/EXO_NO_HANDLERS';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { harvestExoSchema } from '../../schema/factories/harvestExoSchema';
import type { TExoSchemaCursor } from '../../schema/cursor/types/TExoSchemaCursor';
import type { TExoSchemaDecorator } from '../../schema/cursor/types/TExoSchemaDecorator';
import type { TExoMachine } from '../types/TExoMachine';

export function createExoStatic(
    build: (cursor: TExoSchemaCursor) => void,
    decorate?: TExoSchemaDecorator<Record<string, never>>
): TExoMachine<unknown, Record<string, never>> {
    const schema = createExoSchema((cursor: TExoSchemaCursor) => {
        build(cursor);
        return {} as Record<string, never>;
    }, decorate);
    harvestExoSchema(schema);
    if (schema.portList.length > 0) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `createExoStatic: this schema declared ${schema.portList.length} port(s), and a static ` +
                  'component has nothing to fill them' +
                  ' — a static component arms nothing at all, so those ports would stay empty for ' +
                  'the life of the page with no error anywhere. Build a machine with ' +
                  'createExoMachineBuilder and fill them, or drop the ports.'
                : 'EXO0019'
        );
    }
    return {
        declaration: schema,
        forms: [],
        createInitialState: null,
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    };
}
