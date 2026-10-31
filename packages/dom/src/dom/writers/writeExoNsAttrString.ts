import type { TExoDomSetter } from '../types/TExoDomSetter';
import type { TExoNsAttr } from '../types/TExoNsAttr';

export const writeExoNsAttrString: TExoDomSetter = (node, value, data) => {
    const at = data as TExoNsAttr;
    node.setAttributeNS(at.ns, at.qualified, value as string);
};
