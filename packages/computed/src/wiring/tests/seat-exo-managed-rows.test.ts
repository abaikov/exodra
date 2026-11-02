import { describe, expect, it } from 'vitest';
import {
    EXO_BASE_NODE_VOCABULARY,
    EXO_NO_MANAGED_STATE,
    EXO_NO_STATE,
    createExoMachine,
    createExoSchema,
    composeExoPlugins,
    armExoNode,
} from '@exodra/core';
import { exoWiring } from '../exoWiring';
import { seatExoManagedRows } from '../seatExoManagedRows';
import { withExoComputedMachine } from '../../computed/withExoComputedMachine';
import type { TExoAttrPort } from '@exodra/core';
import type { TExoBaseNodeFields } from '@exodra/core';
import type { TExoComputedMachineNode } from '../../computed/types/TExoComputedMachineNode';
import type { TExoMachineFieldHandle } from '../../fields/types/TExoMachineFieldHandle';
import type { TExoEventHandler } from '@exodra/core';
import type { TExoEventPort } from '@exodra/core';
import type { TExoSchemaCursor } from '@exodra/core';

type TCard = TExoBaseNodeFields & TExoComputedMachineNode;

class ExoCardBackend {
    readonly fills: (readonly [number, unknown])[] = [];

    constructor() {
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY);
    }

    attr(this: TCard, port: TExoAttrPort, value: unknown): void {
        (this as unknown as ExoCardBackend).fills.push([port.index, value]);
    }

    on(this: TCard, _port: TExoEventPort, _handler: TExoEventHandler, _subject?: unknown): void {}
}

const nodeOf = (backend: ExoCardBackend): TCard =>
    ({
        __proto__: backend,
        context: null,
        disposers: null,
        state: EXO_NO_STATE,
        managedState: EXO_NO_MANAGED_STATE,
        effectStops: null,
        live: null,
    } as unknown as TCard);

function buildCard(b: TExoSchemaCursor): { label: TExoAttrPort } {
    let label!: TExoAttrPort;
    b.el('div', null, (d) => {
        label = d.port('data-label');
    });
    return { label };
}

describe('seatExoManagedRows', () => {
    it('calls a seed that is a function with the instance, and stores anything else as it stands', () => {
        const enode = nodeOf(new ExoCardBackend());
        const held: TCard[] = [];
        seatExoManagedRows(enode, [
            0,
            null,
            'a',
            (of: TCard): string => {
                held.push(of);
                return 'made';
            },
        ]);

        expect(enode.managedState).toEqual([0, null, 'a', 'made']);
        expect(held).toEqual([enode]);
    });

    it('builds a table of its own for every instance, never the one it was handed', () => {
        const backend = new ExoCardBackend();
        const seeds: readonly unknown[] = [0, (): string[] => []];
        const first = nodeOf(backend);
        const second = nodeOf(backend);

        seatExoManagedRows(first, seeds);
        seatExoManagedRows(second, seeds);

        expect(first.managedState).not.toBe(seeds);
        expect(first.managedState).not.toBe(second.managedState);
        expect(first.managedState[1]).not.toBe(second.managedState[1]);
    });
});

describe('the one door onto managedState', () => {
    it('seats a decorated machine`s rows through it, fresh per instance', () => {
        const schema = createExoSchema(buildCard);
        let marks!: TExoMachineFieldHandle<TCard, string[]>;
        const CARD = withExoComputedMachine(createExoMachine<TCard>(schema), (b) => {
            const held = b.field((): string[] => []);
            b.derive(schema.ports.label, [held], (rows) => rows.length);
            marks = held;
        });

        const backend = new ExoCardBackend();
        const first = nodeOf(backend);
        const second = nodeOf(backend);
        armExoNode(first, CARD);
        armExoNode(second, CARD);

        expect(first.managedState).not.toBe(EXO_NO_MANAGED_STATE);
        expect(first.managedState).not.toBe(second.managedState);
        expect(marks.get(first)).not.toBe(marks.get(second));
        expect(first.managedState[CARD.program.pendingRow]).toBe(0);
    });

    it('seats a wiring block`s table through it too, and the block assigns nothing itself', () => {
        const seen: string[] = [];
        // A wiring block is handed its PARAMS and nothing else, so the seed a row shows is the
        // value the caller armed it with.
        const wire = exoWiring<TCard, void>((w, _c, params) => {
            const name = w.field(params as string);
            w.fill([name], (enode): void => {
                seen.push(name.get(enode));
            });
            w.done();
        });

        const backend = new ExoCardBackend();
        const first = nodeOf(backend);
        const second = nodeOf(backend);
        wire(first, 'a');
        wire(second, 'b');

        expect(first.managedState).not.toBe(EXO_NO_MANAGED_STATE);
        expect(first.managedState).not.toBe(second.managedState);
        expect(first.managedState).toEqual([0, 'a']);
        expect(second.managedState).toEqual([0, 'b']);
        expect(seen).toEqual(['a', 'b']);
    });
});
