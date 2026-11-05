import { describe, expect, it } from 'vitest';
import { armExoNode } from '../armExoNode';
import { composeExoMachine } from '../composeExoMachine';
import { connectExoNode } from '../connectExoNode';
import { disconnectExoNode } from '../disconnectExoNode';
import { createExoMachine } from '../factories/createExoMachine';
import { swapExoParams } from '../swapExoParams';
import { wireExoNode } from '../wireExoNode';
import { withExoParamsEffects } from '../withExoParamsEffects';
import { withExoTransitions } from '../withExoTransitions';
import { withExoWire } from '../withExoWire';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { exoPorts } from '../../schema/ports/factories/exoPorts';
import { EXO_PORT_TEXT } from '../../schema/ports/constants/EXO_PORT_TEXT';
import { createExoTestRowNode } from './createExoTestRowNode';
import type { TExoMachineNode } from '../types/TExoMachineNode';

type TParams = { slot: string; title: string };

const Ports = exoPorts({ LABEL: EXO_PORT_TEXT });
const Schema = createExoSchema(Ports, (b) => {
    b.el('p', null, (p) => p.textPort(Ports.LABEL));
});
const base = createExoMachine(Schema, {
    createInitialState: (_c: TExoMachineNode, _params: TParams) => ({ page: 1 }),
});

function watch(log: string[]) {
    return {
        key: (params: TParams) => params.slot,
        start: (_c: unknown, params: TParams) => {
            log.push(`start ${params.slot}`);
            return () => log.push(`stop ${params.slot}`);
        },
    };
}

function arm(machine: unknown, params: TParams) {
    const node = createExoTestRowNode();
    armExoNode(node, machine as never, params);
    return node;
}

describe('withExoParamsEffects', () => {
    it('starts with the first params and restarts only when the key changes', () => {
        const log: string[] = [];
        const titles: string[] = [];
        const machine = composeExoMachine(
            base,
            (m) => withExoWire(m, (_c, params) => void titles.push(params.title)),
            (m) => withExoParamsEffects(m, { watchSlot: watch(log) })
        );
        const node = arm(machine, { slot: 'a', title: '1' });
        wireExoNode(node, { slot: 'a', title: '2' });
        wireExoNode(node, { slot: 'b', title: '3' });
        expect(titles).toEqual(['1', '2', '3']);
        expect(log).toEqual(['start a', 'stop a', 'start b']);
        node.stopEffects();
        expect(log).toEqual(['start a', 'stop a', 'start b', 'stop b']);
    });

    it('supplies a wire of its own when the machine has none', () => {
        const log: string[] = [];
        const machine = withExoParamsEffects(base, { watchSlot: watch(log) });
        const node = arm(machine, { slot: 'a', title: '' });
        wireExoNode(node, { slot: 'b', title: '' });
        expect(log).toEqual(['start a', 'stop a', 'start b']);
    });

    it('hands the last params to a restart from a transition and to connectExoNode', () => {
        const log: string[] = [];
        const machine = composeExoMachine(
            base,
            (m) => withExoParamsEffects(m, { watchSlot: watch(log) }),
            (m) => {
                const { watchSlot } = m.effects;
                return withExoTransitions(m, { refresh: (c) => c.restartEffect(watchSlot) });
            }
        );
        const node = arm(machine, { slot: 'a', title: '' });
        wireExoNode(node, { slot: 'b', title: '' });
        machine.transitions.refresh(node as never);
        disconnectExoNode(node);
        connectExoNode(node);
        expect(log).toEqual([
            'start a',
            'stop a',
            'start b',
            'stop b',
            'start b',
            'stop b',
            'start b',
        ]);
    });

    it('keeps the previous params right for two steps and for a swapExoParams in the wire', () => {
        const log: string[] = [];
        const seen: (TParams | undefined)[] = [];
        const machine = composeExoMachine(
            base,
            (m) => withExoWire(m, (c, params) => void seen.push(swapExoParams(c, params))),
            (m) => withExoParamsEffects(m, { watchSlot: watch(log) }),
            (m) =>
                withExoParamsEffects(m, {
                    watchTitle: {
                        key: (params) => params.title,
                        start: (_c, params) => {
                            log.push(`title ${params.title}`);
                            return null;
                        },
                    },
                })
        );
        const first = { slot: 'a', title: '1' };
        const node = arm(machine, first);
        wireExoNode(node, { slot: 'a', title: '2' });
        expect(seen).toEqual([undefined, first]);
        expect(log).toEqual(['start a', 'title 1', 'title 2']);
    });

    it('restarts after a mount that had no params', () => {
        const log: string[] = [];
        const machine = withExoParamsEffects(createExoMachine(Schema) as never as typeof base, {
            watchSlot: {
                key: (params) => params?.slot,
                start: (_c, params) => {
                    log.push(`start ${params?.slot}`);
                    return null;
                },
            },
        });
        const node = createExoTestRowNode();
        armExoNode(node, machine as never);
        wireExoNode(node, { slot: 'b', title: '' });
        expect(log).toEqual(['start undefined', 'start b']);
    });
});

describe('withExoParamsEffects before withExoWire', () => {
    it('runs the later wire inside its own, so the order of the two steps does not matter', () => {
        const log: string[] = [];
        const titles: string[] = [];
        const machine = composeExoMachine(
            base,
            (m) => withExoParamsEffects(m, { watchSlot: watch(log) }),
            (m) => withExoWire(m, (_c, params) => void titles.push(params.title))
        );
        const node = arm(machine, { slot: 'a', title: '1' });
        wireExoNode(node, { slot: 'b', title: '2' });
        expect(titles).toEqual(['1', '2']);
        expect(log).toEqual(['start a', 'stop a', 'start b']);
    });

    it('still refuses a second wire', () => {
        expect(() =>
            composeExoMachine(
                base,
                (m) => withExoWire(m, () => undefined),
                (m) => withExoParamsEffects(m, { watchSlot: watch([]) }),
                (m) => withExoWire(m, () => undefined)
            )
        ).toThrow(/one wire/);
    });
});
