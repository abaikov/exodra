import { describe, expect, it } from 'vitest';
import { armExoNode } from '../armExoNode';
import { composeExoMachine } from '../composeExoMachine';
import { createExoMachine } from '../factories/createExoMachine';
import { withExoEffects } from '../withExoEffects';
import { withExoTransitions } from '../withExoTransitions';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { exoPorts } from '../../schema/ports/factories/exoPorts';
import { EXO_PORT_TEXT } from '../../schema/ports/constants/EXO_PORT_TEXT';
import { createExoTestRowNode } from './createExoTestRowNode';
import type { TExoMachineEffect } from '../types/TExoMachineEffect';
import type { TExoMachineNode } from '../types/TExoMachineNode';

const Ports = exoPorts({ LABEL: EXO_PORT_TEXT });
const Schema = createExoSchema(Ports, (b) => {
    b.el('p', null, (p) => p.textPort(Ports.LABEL));
});
const base = createExoMachine(Schema, {
    createInitialState: (_c: TExoMachineNode) => ({ page: 1 }),
});

describe('withExoEffects with a dictionary', () => {
    it('puts each handle on the effects array under its name, after the earlier ones', () => {
        const log: string[] = [];
        let first!: TExoMachineEffect<never>;
        const machine = composeExoMachine(
            base,
            (m) =>
                withExoEffects(m, (effect) => {
                    first = effect(() => null);
                }),
            (m) =>
                withExoEffects(m, {
                    showPage: (c) => {
                        const page = c.state.page;
                        log.push(`start ${page}`);
                        return () => log.push(`stop ${page}`);
                    },
                    keepAlive: () => null,
                })
        );
        expect(machine.effects.length).toBe(3);
        expect(machine.effects[0]).toBe(first);
        expect(machine.effects.showPage).toBe(machine.effects[1]);
        expect(machine.effects.showPage.at).toBe(1);
        expect(machine.effects.keepAlive.at).toBe(2);
    });

    it('restarts by name from a transition and stops on teardown', () => {
        const log: string[] = [];
        const machine = composeExoMachine(
            base,
            (m) =>
                withExoEffects(m, {
                    showPage: (c) => {
                        const page = c.state.page;
                        log.push(`start ${page}`);
                        return () => log.push(`stop ${page}`);
                    },
                }),
            (m) => {
                const { showPage } = m.effects;
                return withExoTransitions(m, {
                    showNextPage: (c) => {
                        c.state.page++;
                        c.restartEffect(showPage);
                    },
                });
            }
        );
        const node = createExoTestRowNode();
        armExoNode(node, machine as never);
        machine.transitions.showNextPage(node as never);
        node.stopEffects();
        expect(log).toEqual(['start 1', 'stop 1', 'start 2', 'stop 2']);
    });

    it('keeps the names through a later decorator', () => {
        const machine = composeExoMachine(
            base,
            (m) => withExoEffects(m, { showPage: () => null }),
            (m) => withExoEffects(m, (effect) => void effect(() => null)),
            (m) => withExoTransitions(m, { noop: () => undefined })
        );
        expect(machine.effects.showPage).toBe(machine.effects[0]);
        expect(machine.effects.length).toBe(2);
    });

    it('refuses a name already declared, and a name the array itself has', () => {
        const named = withExoEffects(base, { showPage: () => null });
        expect(() => withExoEffects(named, { showPage: () => null })).toThrow(/already taken/);
        expect(() => withExoEffects(base, { push: () => null })).toThrow(/already taken/);
        expect(() => withExoEffects(base, { length: () => null })).toThrow(/already taken/);
        expect(() => withExoEffects(base, { 5: () => null })).toThrow(/already taken/);
    });
});
