import { describe, expect, it } from 'vitest';
import { EXO_BASE_NODE_VOCABULARY } from '../../plugins/constants/EXO_BASE_NODE_VOCABULARY';
import { EXO_NO_STATE } from '../../wiring/constants/EXO_NO_STATE';
import { composeExoPlugins } from '../../plugins/composeExoPlugins';
import { EXO_PORT_ATTR } from '../../schema/ports/constants/EXO_PORT_ATTR';
import { exoPorts } from '../../schema/ports/factories/exoPorts';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { armExoNode } from '../armExoNode';
import { createExoMachine } from '../factories/createExoMachine';
import { withExoWire } from '../withExoWire';
import type { TExoBaseNodeFields } from '../../wiring/types/TExoBaseNodeFields';
import type { TExoMachineNode } from '../types/TExoMachineNode';

type TRow = TExoBaseNodeFields & TExoMachineNode;

class ExoRowBackend {
    constructor() {
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY);
    }

    attr(): void {}

    on(): void {}
}

const nodeOf = (): TRow =>
    ({
        __proto__: new ExoRowBackend(),
        context: null,
        disposers: null,
        state: EXO_NO_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
    } as unknown as TRow);

const RowPorts = exoPorts({ label: EXO_PORT_ATTR });
const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(RowPorts.label, 'data-label');
    });
});

describe('createInitialState', () => {
    it('receives the params the instance is built with, and nothing else', () => {
        const Row = createExoMachine<TRow, { id: string; at: number }, { id: string; at: number }>(
            rowSchema,
            { createInitialState: (_c, params) => ({ id: params.id, at: params.at }) }
        );
        const node = nodeOf();
        armExoNode(node, Row, { id: 'a', at: 3 });
        expect(node.state).toEqual({ id: 'a', at: 3 });
    });

    it('runs before the wire, so the wire already finds the state built from params', () => {
        const seen: string[] = [];
        const rowBase = createExoMachine<TRow, { id: string }, { id: string }>(rowSchema, {
            createInitialState: (_c, params) => ({ id: params.id }),
        });
        const Row = withExoWire(rowBase, (c) => {
            seen.push(c.state.id);
        });
        armExoNode(nodeOf(), Row, { id: 'b' });
        expect(seen).toEqual(['b']);
    });
});
