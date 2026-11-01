import { EXO_WIRE_RERUN } from './constants/EXO_WIRE_RERUN';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function armExoNode<TWiring extends TExoMachineNode>(
    enode: TWiring,
    machine: TExoMachine<TWiring>,
    index = 0,
    params?: unknown
): void {
    const rerun = EXO_WIRE_RERUN.value;
    if (rerun) EXO_WIRE_RERUN.value = false;
    const handlers = machine.handlers;
    for (let at = 0; at < handlers.length; at++) {
        const handler = handlers[at];
        enode.on(handler.port, handler.run, enode);
    }

    const createInitialState = machine.createInitialState;
    if (createInitialState !== null) enode.state = createInitialState(enode, index, params);
    const wire = machine.wire;
    if (wire !== undefined && wire !== null) wire.call(machine, enode, params);

    const effects = machine.effects;
    const started = effects.length;
    if (started !== 0) {
        enode.effectStops = new Array<(() => void) | null>(started).fill(null);
        for (let at = 0; at < started; at++) enode.restartEffect(effects[at]);
    }
    if (rerun) EXO_WIRE_RERUN.value = true;
}
