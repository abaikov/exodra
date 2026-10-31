import { EXO_WIRE_RERUN } from '../constants/EXO_WIRE_RERUN';

export function assertExoArming(door: string): void {
    if (!EXO_WIRE_RERUN.value) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${door}() was called from a wire that wireExoNode re-ran. A re-run wire may only write ` +
              'ports: children are placed once, while the instance is armed, so open them in ' +
              'createInitialState.'
            : 'EXO0103'
    );
}
