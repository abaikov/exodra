import { EXO_WIRE_RERUN } from './constants/EXO_WIRE_RERUN';
import { stopExoEffects } from './stopExoEffects';
import { EXO_UNARMED_STATE } from './constants/EXO_UNARMED_STATE';
import { EXO_NO_STATE } from '../wiring/constants/EXO_NO_STATE';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function armExoNode<TWiring extends TExoMachineNode>(
    enode: TWiring,
    machine: TExoMachine<TWiring>,
    params?: unknown
): void {
    const rerun = EXO_WIRE_RERUN.value;
    if (rerun) EXO_WIRE_RERUN.value = false;
    try {
        const handlers = machine.handlers;
        for (let at = 0; at < handlers.length; at++) {
            const handler = handlers[at];
            enode.on(handler.port, handler.run, enode);
        }

        enode.machine = machine;
        const createInitialState = machine.createInitialState;
        if (createInitialState !== null) enode.state = createInitialState(enode, params);
        else if (enode.state === EXO_UNARMED_STATE) enode.state = EXO_NO_STATE;
        const wire = machine.wire;
        if (wire !== undefined && wire !== null) wire.call(machine, enode, params);

        const effects = machine.effects;
        const started = effects.length;
        if (started !== 0) {
            enode.effectStops = new Array<(() => void) | null>(started).fill(null);
            for (let at = 0; at < started; at++) enode.restartEffect(effects[at]);
        }
    } catch (error) {
        stopExoEffects(enode);
        throw error;
    } finally {
        if (rerun) EXO_WIRE_RERUN.value = true;
    }
}
