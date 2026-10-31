import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoClassAttr: TExoDomSetter = (node, value) => {
    node.setAttribute('class', value === null || value === undefined ? '' : (value as string));
};
