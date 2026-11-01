import type { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';

export type TExoEventPortKind<TEvent> = typeof EXO_PORT_EVENT & { readonly eventShape?: TEvent };
