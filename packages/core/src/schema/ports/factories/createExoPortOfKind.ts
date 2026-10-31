import { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import { createExoAttrPort } from './createExoAttrPort';
import { createExoChildrenPort } from './createExoChildrenPort';
import { createExoEventPort } from './createExoEventPort';
import { createExoRefPort } from './createExoRefPort';
import { createExoTextPort } from './createExoTextPort';
import type { TExoAnyPort } from '../types/TExoAnyPort';
import type { TExoAttrPortKind } from '../types/TExoAttrPortKind';

export function createExoPortOfKind(
    kind: TExoAnyPort['kind'],
    index: number,
    name: string | null
): TExoAnyPort {
    if (kind === EXO_PORT_TEXT) return createExoTextPort(index);
    if (kind === EXO_PORT_CHILDREN) return createExoChildrenPort(index);
    if (kind === EXO_PORT_EVENT) return createExoEventPort(name, index);
    if (kind === EXO_PORT_REF) return createExoRefPort(index);
    return createExoAttrPort(name, index, kind as TExoAttrPortKind);
}
