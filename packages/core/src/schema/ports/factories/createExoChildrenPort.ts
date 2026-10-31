import { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import type { TExoChildrenPort } from '../types/TExoChildrenPort';
import type { TExoPortCompiler } from '../types/TExoPortCompiler';

const CHILDREN = {
    compileWith<TSlot>(this: TExoChildrenPort, into: TExoPortCompiler<TSlot>): TSlot {
        return into.children(this);
    },
};

export function createExoChildrenPort(index = -1): TExoChildrenPort {
    const port = Object.create(CHILDREN) as {
        -readonly [K in keyof TExoChildrenPort]: TExoChildrenPort[K];
    };
    port.index = index;
    port.kind = EXO_PORT_CHILDREN;
    port.name = null;
    return port as TExoChildrenPort;
}
