import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoAttr: TExoDomSetter = (node, value, data) => {
    if (value === null || value === undefined || value === false) {
        node.removeAttribute(data as string);
        return;
    }
    node.setAttribute(data as string, value === true ? '' : (value as string));
};
