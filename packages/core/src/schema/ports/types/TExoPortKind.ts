import type { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import type { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import type { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import type { TExoAttrPortKind } from './TExoAttrPortKind';

/**
 * NOT every kind. `EXO_PORT_REF` is deliberately absent, and every writing signature names
 * `TExoPort`, so that one omission makes `c.set(refPort, …)` a compile error.
 */
export type TExoPortKind =
    | TExoAttrPortKind
    | typeof EXO_PORT_TEXT
    | typeof EXO_PORT_CHILDREN
    | typeof EXO_PORT_EVENT;
