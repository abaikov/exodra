import { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import type { TExoEventPort } from '../types/TExoEventPort';
import type { TExoPortCompiler } from '../types/TExoPortCompiler';

const EVENT = {
    compileWith<TSlot>(this: TExoEventPort, into: TExoPortCompiler<TSlot>): TSlot {
        return into.event(this);
    },
};
export function createExoEventPort(name: string | null, index = -1): TExoEventPort {
    const port = Object.create(EVENT) as { -readonly [K in keyof TExoEventPort]: TExoEventPort[K] };
    port.index = index;
    port.kind = EXO_PORT_EVENT;
    port.name = name;
    return port as TExoEventPort;
}
