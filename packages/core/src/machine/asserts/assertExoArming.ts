import { EXO_WIRE_RERUN } from '../constants/EXO_WIRE_RERUN';

export function assertExoArming(door: string): void {
    if (!EXO_WIRE_RERUN.value) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${door}() was called from a wire that wireExoNode re-ran. c.one and c.list place ` +
              'their children once, while the instance is armed: call them in createInitialState, ' +
              'or place children with appendChild / insertChild, which may run at any time.'
            : 'EXO0103'
    );
}
