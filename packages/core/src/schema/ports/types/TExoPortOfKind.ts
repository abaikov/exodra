import type { EXO_PORT_ATTR } from '../constants/EXO_PORT_ATTR';
import type { EXO_PORT_ATTR_STRING } from '../constants/EXO_PORT_ATTR_STRING';
import type { EXO_PORT_ATTR_TOGGLE } from '../constants/EXO_PORT_ATTR_TOGGLE';
import type { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import type { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import type { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import type { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import type { TExoAttrPort } from './TExoAttrPort';
import type { TExoChildrenPort } from './TExoChildrenPort';
import type { TExoEventPort } from './TExoEventPort';
import type { TExoEventPortKind } from './TExoEventPortKind';
import type { TExoRefPort } from './TExoRefPort';
import type { TExoRefPortKind } from './TExoRefPortKind';
import type { TExoTextPort } from './TExoTextPort';

export type TExoPortOfKind<TMark> = TMark extends
    | typeof EXO_PORT_ATTR
    | typeof EXO_PORT_ATTR_STRING
    | typeof EXO_PORT_ATTR_TOGGLE
    ? TExoAttrPort
    : TMark extends typeof EXO_PORT_TEXT
    ? TExoTextPort
    : TMark extends typeof EXO_PORT_CHILDREN
    ? TExoChildrenPort
    : TMark extends TExoEventPortKind<infer TEvent>
    ? TExoEventPort<TEvent>
    : TMark extends typeof EXO_PORT_EVENT
    ? TExoEventPort
    : TMark extends TExoRefPortKind<infer TNode>
    ? TExoRefPort<TNode>
    : TMark extends typeof EXO_PORT_REF
    ? TExoRefPort
    : never;
