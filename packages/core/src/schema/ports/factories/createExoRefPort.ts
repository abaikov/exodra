import { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import type { TExoPortCompiler } from '../types/TExoPortCompiler';
import type { TExoRefPort } from '../types/TExoRefPort';

const REF = {
    compileWith<TSlot>(this: TExoRefPort, into: TExoPortCompiler<TSlot>): TSlot {
        return into.ref(this);
    },
};
export function createExoRefPort(index = -1): TExoRefPort {
    const port = Object.create(REF) as { -readonly [K in keyof TExoRefPort]: TExoRefPort[K] };
    port.index = index;
    port.kind = EXO_PORT_REF;
    port.name = null;
    return port as TExoRefPort;
}
