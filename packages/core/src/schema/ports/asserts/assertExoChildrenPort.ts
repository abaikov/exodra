import { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import type { TExoChildrenPort } from '../types/TExoChildrenPort';
import type { TExoPort } from '../types/TExoPort';

export function assertExoChildrenPort(
    port: TExoPort,
    method: string,
    enode: string
): asserts port is TExoChildrenPort {
    if (port.kind === EXO_PORT_CHILDREN) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${enode}: ${method}() needs a children port — a text port's value is written ` +
              'as TEXT (escaped into the markup on the server, set as text in the browser) ' +
              'and an attribute port is not a place in the tree at all'
            : 'EXO0018'
    );
}
