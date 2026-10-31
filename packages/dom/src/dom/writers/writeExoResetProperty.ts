import type { TExoDomSetter } from '../types/TExoDomSetter';
import type { TExoResetProperty } from '../types/TExoResetProperty';

export const writeExoResetProperty: TExoDomSetter = (node, value, data) => {
    const pair = data as TExoResetProperty;
    (node as unknown as Record<string, unknown>)[pair.key] = value;
    if (value) node.setAttribute(pair.markup, '');
    else node.removeAttribute(pair.markup);
};
