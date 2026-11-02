import { describe, expect, it } from 'vitest';
import { EXO_BASE_NODE_VOCABULARY } from '../../plugins/constants/EXO_BASE_NODE_VOCABULARY';
import { EXO_NO_STATE } from '../../wiring/constants/EXO_NO_STATE';
import { composeExoPlugins } from '../../plugins/composeExoPlugins';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { armExoNode } from '../armExoNode';
import { connectExoNode } from '../connectExoNode';
import { disconnectExoNode } from '../disconnectExoNode';
import { createExoMachine } from '../factories/createExoMachine';
import { composeExoMachine } from '../composeExoMachine';
import { withExoEffects } from '../withExoEffects';
import type { TExoMachineEffect } from '../types/TExoMachineEffect';
import { stopExoEffects } from '../stopExoEffects';
import type { TExoSchemaCursor } from '../../schema/cursor/types/TExoSchemaCursor';
import type { TExoBaseNodeFields } from '../../wiring/types/TExoBaseNodeFields';
import type { TExoMachineNode } from '../types/TExoMachineNode';
import type { TExoAttrPort } from '../../schema/ports/types/TExoAttrPort';

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

function buildRow(b: TExoSchemaCursor): { label: TExoAttrPort } {
    let label!: TExoAttrPort;
    b.el('li', null, (li) => {
        label = li.port('data-label');
    });
    return { label };
}

function rowWithTwoEffects(log: string[]) {
    const m = createExoMachine<TRow>(createExoSchema(buildRow));
    let a = 0;
    let b = 0;
    return composeExoMachine(m, (m) =>
        withExoEffects(m, (effect) => {
            effect(() => {
                const at = a++;
                log.push(`a on ${at}`);
                return () => log.push(`a off ${at}`);
            });
            effect(() => {
                const at = b++;
                log.push(`b on ${at}`);
                return () => log.push(`b off ${at}`);
            });
        })
    );
}

describe('disconnectExoNode / connectExoNode', () => {
    it('ends every effect, keeps the node, and starts them all again on connect', () => {
        const log: string[] = [];
        const ROW = rowWithTwoEffects(log);
        const row = nodeOf();
        armExoNode(row, ROW);

        disconnectExoNode(row);
        expect(log).toEqual(['a on 0', 'b on 0', 'b off 0', 'a off 0']);
        expect(row.effectStops).toEqual([null, null]);

        connectExoNode(row, ROW);
        expect(log.slice(4)).toEqual(['a on 1', 'b on 1']);

        stopExoEffects(row);
        expect(log.slice(6)).toEqual(['b off 1', 'a off 1']);
    });

    it('does not let a disposer bring an effect back up in the middle of a disconnect', () => {
        let starts = 0;
        let handle!: TExoMachineEffect<TRow>;
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                handle = effect((c) => {
                    starts++;
                    return () => c.restartEffect(handle);
                });
            })
        );
        const row = nodeOf();
        armExoNode(row, ROW);

        disconnectExoNode(row);

        expect(starts).toBe(1);
        expect(row.effectStops).toEqual([null]);
    });

    it('is a no-op twice in a row, and connect after a terminal stop starts nothing', () => {
        const log: string[] = [];
        const ROW = rowWithTwoEffects(log);
        const row = nodeOf();
        armExoNode(row, ROW);

        disconnectExoNode(row);
        disconnectExoNode(row);
        expect(log).toEqual(['a on 0', 'b on 0', 'b off 0', 'a off 0']);

        stopExoEffects(row);
        connectExoNode(row, ROW);
        expect(log).toHaveLength(4);
        expect(row.effectStops).toBeNull();
    });
});

describe('stopEffect', () => {
    function rowWithHandles(log: string[]) {
        let a = 0;
        let first!: TExoMachineEffect<TRow>;
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                first = effect(() => {
                    const at = a++;
                    log.push(`a on ${at}`);
                    return () => log.push(`a off ${at}`);
                });
                effect(() => {
                    log.push('b on');
                    return () => log.push('b off');
                });
            })
        );
        return { ROW, first };
    }

    it('ends one effect, leaves the others running, and restartEffect brings it back', () => {
        const log: string[] = [];
        const { ROW, first } = rowWithHandles(log);
        const row = nodeOf();
        armExoNode(row, ROW);

        row.stopEffect(first);
        expect(log).toEqual(['a on 0', 'b on', 'a off 0']);
        expect(row.effectStops?.[1]).not.toBeNull();

        row.restartEffect(first);
        expect(log.slice(3)).toEqual(['a on 1']);
    });

    it('is a no-op on an effect already stopped and on a node torn down', () => {
        const log: string[] = [];
        const { ROW, first } = rowWithHandles(log);
        const row = nodeOf();
        armExoNode(row, ROW);

        row.stopEffect(first);
        row.stopEffect(first);
        stopExoEffects(row);
        row.stopEffect(first);
        expect(log).toEqual(['a on 0', 'b on', 'a off 0', 'b off']);
    });

    it('leaves the effect off even when its own stop restarts it', () => {
        const log: string[] = [];
        let n = 0;
        let handle!: TExoMachineEffect<TRow>;
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                handle = effect((c) => {
                    const at = n++;
                    log.push(`on ${at}`);
                    return () => {
                        log.push(`off ${at}`);
                        if (at === 0) c.restartEffect(handle);
                    };
                });
            })
        );
        const row = nodeOf();
        armExoNode(row, ROW);

        row.stopEffect(handle);

        expect(log).toEqual(['on 0', 'off 0', 'on 1', 'off 1']);
        expect(row.effectStops).toEqual([null]);
    });
});
