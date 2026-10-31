import type { TExoDomSetter } from '../types/TExoDomSetter';
import type { TExoNsAttr } from '../types/TExoNsAttr';

export const writeExoNsAttr: TExoDomSetter = (node, value, data) => {
    const at = data as TExoNsAttr;
    if (value === null || value === undefined || value === false) {
        node.removeAttributeNS(at.ns, at.local);
        return;
    }
    node.setAttributeNS(at.ns, at.qualified, value === true ? '' : (value as string));
};
