import type { TExoDomSetter } from '../types/TExoDomSetter';
import type { TExoNsAttr } from '../types/TExoNsAttr';

export const writeExoNsAttrToggle: TExoDomSetter = (node, value, data) => {
    const at = data as TExoNsAttr;
    if (value) node.setAttributeNS(at.ns, at.qualified, '');
    else node.removeAttributeNS(at.ns, at.local);
};
