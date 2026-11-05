import { describe, expect, it } from 'vitest';
import { composeExoMachine } from '../composeExoMachine';
import { createExoMachine } from '../factories/createExoMachine';
import { withExoTransitions } from '../withExoTransitions';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { exoPorts } from '../../schema/ports/factories/exoPorts';
import { EXO_PORT_TEXT } from '../../schema/ports/constants/EXO_PORT_TEXT';
import { createExoTestRowNode } from './createExoTestRowNode';
import type { TExoMachineNode } from '../types/TExoMachineNode';

const Ports = exoPorts({ LABEL: EXO_PORT_TEXT });
const Schema = createExoSchema(Ports, (b) => {
    b.el('p', null, (p) => p.textPort(Ports.LABEL));
});
const base = createExoMachine(Schema, {
    createInitialState: (_c: TExoMachineNode) => ({ log: [] as string[] }),
});

describe('withExoTransitions across steps', () => {
    it('overrides names from every step in one table', () => {
        const machine = composeExoMachine(
            base,
            (m) => withExoTransitions(m, { open: (c) => void c.state.log.push('open') }),
            (m) => withExoTransitions(m, { close: (c) => void c.state.log.push('close') })
        );
        const node = createExoTestRowNode() as TExoMachineNode & { state: { log: string[] } };
        node.state = { log: [] };
        node.transitionOverrides = machine.overrides({
            open: (c) => void (c.state as { log: string[] }).log.push('open*'),
            close: (c) => void (c.state as { log: string[] }).log.push('close*'),
        });
        machine.transitions.open(node);
        machine.transitions.close(node);
        expect(node.state.log).toEqual(['open*', 'close*']);
    });

    it('refuses a name an earlier step declared, and a name made of digits', () => {
        const opened = withExoTransitions(base, { open: () => undefined });
        expect(() => withExoTransitions(opened, { open: () => undefined })).toThrow(
            /already a transition/
        );
        expect(() => withExoTransitions(base, { 1: () => undefined })).toThrow(/is an index/);
    });
});
