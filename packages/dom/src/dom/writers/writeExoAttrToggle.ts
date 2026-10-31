import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoAttrToggle: TExoDomSetter = (node, value, data) => {
    if (value) node.setAttribute(data as string, '');
    else node.removeAttribute(data as string);
};
