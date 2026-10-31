import type { EXO_PORT_ATTR } from '../constants/EXO_PORT_ATTR';
import type { EXO_PORT_ATTR_STRING } from '../constants/EXO_PORT_ATTR_STRING';
import type { EXO_PORT_ATTR_TOGGLE } from '../constants/EXO_PORT_ATTR_TOGGLE';

export type TExoAttrPortKind =
    | typeof EXO_PORT_ATTR
    | typeof EXO_PORT_ATTR_STRING
    | typeof EXO_PORT_ATTR_TOGGLE;
