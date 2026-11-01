import { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import type { TExoEventPortKind } from '../types/TExoEventPortKind';

export function exoEventPortKind<TEvent>(): TExoEventPortKind<TEvent> {
    return EXO_PORT_EVENT as TExoEventPortKind<TEvent>;
}
