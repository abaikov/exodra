import { EXO_DISCONNECTED_EFFECT_STOPS } from '../constants/EXO_DISCONNECTED_EFFECT_STOPS';
import { describe, expect, it } from 'vitest';
import { createExoTestRowNode } from './createExoTestRowNode';
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
        const row = createExoTestRowNode();
        armExoNode(row, ROW);

        disconnectExoNode(row);
        expect(log).toEqual(['a on 0', 'b on 0', 'b off 0', 'a off 0']);
        expect(row.effectStops).toBe(EXO_DISCONNECTED_EFFECT_STOPS);

        connectExoNode(row);
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
        const row = createExoTestRowNode();
        armExoNode(row, ROW);

        disconnectExoNode(row);

        expect(starts).toBe(1);
        expect(row.effectStops).toBe(EXO_DISCONNECTED_EFFECT_STOPS);
    });

    it('is a no-op twice in a row, and connect after a terminal stop starts nothing', () => {
        const log: string[] = [];
        const ROW = rowWithTwoEffects(log);
        const row = createExoTestRowNode();
        armExoNode(row, ROW);

        disconnectExoNode(row);
        disconnectExoNode(row);
        expect(log).toEqual(['a on 0', 'b on 0', 'b off 0', 'a off 0']);

        stopExoEffects(row);
        connectExoNode(row);
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
        const row = createExoTestRowNode();
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
        const row = createExoTestRowNode();
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
        const row = createExoTestRowNode();
        armExoNode(row, ROW);

        row.stopEffect(handle);

        expect(log).toEqual(['on 0', 'off 0', 'on 1', 'off 1']);
        expect(row.effectStops).toEqual([null]);
    });

    it('does not start an effect restarted while the node is disconnected', () => {
        let starts = 0;
        let handle!: TExoMachineEffect<TRow>;
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                handle = effect(() => {
                    starts++;
                    return () => undefined;
                });
            })
        );
        const row = createExoTestRowNode();
        armExoNode(row, ROW);
        disconnectExoNode(row);
        row.restartEffect(handle);
        expect(starts).toBe(1);
        connectExoNode(row);
        expect(starts).toBe(2);
    });

    it('ends what a start set up when the node is disconnected during that start', () => {
        const log: string[] = [];
        const row = createExoTestRowNode();
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                effect(() => {
                    log.push('on');
                    if (log.length === 1) disconnectExoNode(row);
                    return () => log.push('off');
                });
            })
        );
        armExoNode(row, ROW);
        expect(log).toEqual(['on', 'off']);
        expect(row.effectStops).toBe(EXO_DISCONNECTED_EFFECT_STOPS);
    });

    it('ends an effect that stopEffect named while its own start was running', () => {
        const log: string[] = [];
        let handle!: TExoMachineEffect<TRow>;
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                handle = effect((c) => {
                    log.push('on');
                    c.stopEffect(handle);
                    return () => log.push('off');
                });
            })
        );
        const row = createExoTestRowNode();
        armExoNode(row, ROW);
        expect(log).toEqual(['on', 'off']);
        row.restartEffect(handle);
        expect(log).toEqual(['on', 'off', 'on', 'off']);
    });
});

describe('a throw while arming or stopping', () => {
    it('ends the effects already started when a later start throws', () => {
        const log: string[] = [];
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                effect(() => {
                    log.push('a on');
                    return () => log.push('a off');
                });
                effect(() => {
                    throw new Error('b');
                });
            })
        );
        const row = createExoTestRowNode();
        expect(() => armExoNode(row, ROW)).toThrow('b');
        expect(log).toEqual(['a on', 'a off']);
        expect(row.effectStops).toBeNull();
    });

    it('runs every other stop when one throws, and rethrows it', () => {
        const log: string[] = [];
        const ROW = composeExoMachine(createExoMachine<TRow>(createExoSchema(buildRow)), (m) =>
            withExoEffects(m, (effect) => {
                effect(() => () => log.push('a off'));
                effect(() => () => {
                    throw new Error('b off');
                });
                effect(() => () => log.push('c off'));
            })
        );
        const row = createExoTestRowNode();
        armExoNode(row, ROW);
        expect(() => stopExoEffects(row)).toThrow('b off');
        expect(log).toEqual(['c off', 'a off']);
    });
});
