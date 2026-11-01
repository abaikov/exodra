import { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import type { TExoRefPortKind } from '../types/TExoRefPortKind';

export function exoRefPortKind<TNode>(): TExoRefPortKind<TNode> {
    return EXO_PORT_REF as TExoRefPortKind<TNode>;
}
