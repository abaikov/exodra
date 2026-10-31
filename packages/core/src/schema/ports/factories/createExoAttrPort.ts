import { EXO_PORT_ATTR } from '../constants/EXO_PORT_ATTR';
import type { TExoAttrPort } from '../types/TExoAttrPort';
import type { TExoAttrPortKind } from '../types/TExoAttrPortKind';
import type { TExoPortCompiler } from '../types/TExoPortCompiler';

const ATTR = {
    compileWith<TSlot>(this: TExoAttrPort, into: TExoPortCompiler<TSlot>): TSlot {
        return into.attribute(this);
    },
};
export function createExoAttrPort(
    name: string | null,
    index = -1,
    kind: TExoAttrPortKind = EXO_PORT_ATTR
): TExoAttrPort {
    const port = Object.create(ATTR) as { -readonly [K in keyof TExoAttrPort]: TExoAttrPort[K] };
    port.index = index;
    port.kind = kind;
    port.name = name;
    return port as TExoAttrPort;
}
