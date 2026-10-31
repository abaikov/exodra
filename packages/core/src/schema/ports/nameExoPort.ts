import type { TExoAttrPort } from './types/TExoAttrPort';
import type { TExoEventPort } from './types/TExoEventPort';

export function nameExoPort<TPort extends TExoAttrPort | TExoEventPort>(
    port: TPort,
    name: string
): TPort {
    (port as { name: string }).name = name;
    return port;
}
