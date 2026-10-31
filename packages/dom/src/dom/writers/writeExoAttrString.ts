import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoAttrString: TExoDomSetter = (node, value, data) => {
    node.setAttribute(data as string, value as string);
};
