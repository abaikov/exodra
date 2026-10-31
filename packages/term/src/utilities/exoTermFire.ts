import type { TExoTermElement } from '../instance/types/TExoTermElement';
import type { TExoTermEvent } from './types/TExoTermEvent';

// NO CASTS. `TExoEventHandler` used to spell the DOM's `Event` and `Element`, so this backend had
// to fabricate one and lie about the other; both are now the pair THIS backend declares, and the
// values reach a handler as what they are.
export function exoTermFire(node: TExoTermElement, type: string, event?: TExoTermEvent): boolean {
    const listener = node.listeners[type];
    if (listener === undefined) return false;
    const carried: TExoTermEvent = event ?? { type };
    listener.handler.call(node, carried, listener.subject);
    return true;
}
