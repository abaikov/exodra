import type { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import type { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import type { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import type { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import type { TExoAttrPortKind } from './TExoAttrPortKind';

export type TExoPortKindMark =
    | TExoAttrPortKind
    | typeof EXO_PORT_TEXT
    | typeof EXO_PORT_CHILDREN
    | typeof EXO_PORT_EVENT
    | typeof EXO_PORT_REF;
