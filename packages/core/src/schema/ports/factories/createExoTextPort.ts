import { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import type { TExoPortCompiler } from '../types/TExoPortCompiler';
import type { TExoTextPort } from '../types/TExoTextPort';

const TEXT = {
    compileWith<TSlot>(this: TExoTextPort, into: TExoPortCompiler<TSlot>): TSlot {
        return into.text(this);
    },
};
export function createExoTextPort(index = -1): TExoTextPort {
    const port = Object.create(TEXT) as { -readonly [K in keyof TExoTextPort]: TExoTextPort[K] };
    port.index = index;
    port.kind = EXO_PORT_TEXT;
    port.name = null;
    return port as TExoTextPort;
}
