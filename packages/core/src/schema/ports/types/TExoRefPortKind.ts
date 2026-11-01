import type { EXO_PORT_REF } from '../constants/EXO_PORT_REF';

export type TExoRefPortKind<TNode> = typeof EXO_PORT_REF & { readonly nodeShape?: TNode };
