import { EXO_REACT_SYMBOLS } from '../constants/EXO_REACT_SYMBOLS';
import type { TExoReactElement } from '../types/TExoReactElement';

const TEMPLATE_TAG = /^[a-z][a-z0-9]*$/;

export function isExoReactTemplateHost(value: unknown): value is TExoReactElement {
    if (typeof value !== 'object' || value === null) return false;
    const element = value as TExoReactElement & { readonly values?: unknown };
    if (element.$$typeof !== EXO_REACT_SYMBOLS.element) return false;
    const tag = element.type;
    if (typeof tag !== 'string' || element.values !== undefined) return false;
    return tag !== 'select' && tag !== 'option' && tag !== 'textarea' && TEMPLATE_TAG.test(tag);
}
