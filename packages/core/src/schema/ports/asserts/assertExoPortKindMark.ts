import { EXO_PORT_ATTR } from '../constants/EXO_PORT_ATTR';
import { EXO_PORT_ATTR_STRING } from '../constants/EXO_PORT_ATTR_STRING';
import { EXO_PORT_ATTR_TOGGLE } from '../constants/EXO_PORT_ATTR_TOGGLE';
import { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import type { TExoPortKindMark } from '../types/TExoPortKindMark';

export function assertExoPortKindMark(mark: unknown): asserts mark is TExoPortKindMark {
    if (
        mark === EXO_PORT_ATTR ||
        mark === EXO_PORT_ATTR_STRING ||
        mark === EXO_PORT_ATTR_TOGGLE ||
        mark === EXO_PORT_TEXT ||
        mark === EXO_PORT_CHILDREN ||
        mark === EXO_PORT_EVENT ||
        mark === EXO_PORT_REF
    ) {
        return;
    }
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `exoPorts: ${String(mark)} is not a port kind — declare one of EXO_PORT_ATTR, ` +
              'EXO_PORT_ATTR_STRING, EXO_PORT_ATTR_TOGGLE, EXO_PORT_TEXT, EXO_PORT_CHILDREN, ' +
              'EXO_PORT_EVENT, EXO_PORT_REF'
            : 'EXO0107'
    );
}
