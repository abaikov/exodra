import { createExoPortOfKind } from './createExoPortOfKind';
import type { TExoAnyPort } from '../types/TExoAnyPort';

export function mintExoPort<TPort extends TExoAnyPort>(
    supply: TExoAnyPort[],
    at: number,
    kind: TExoAnyPort['kind'],
    name: string | null
): TPort {
    if (at < supply.length) {
        const port = supply[at];
        if (port.kind !== kind) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? 'this schema minted a different port here than it did when its ports were ' +
                      'numbered — a markup function must make the same calls in the same order ' +
                      'every time it runs, because the port NUMBERS the wiring fills by are ' +
                      'handed out in that order.'
                    : 'EXO0106'
            );
        }
        return port as TPort;
    }
    const port = createExoPortOfKind(kind, at, name);
    supply.push(port);
    return port as TPort;
}
