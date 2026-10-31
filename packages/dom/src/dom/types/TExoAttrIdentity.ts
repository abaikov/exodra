import type { TExoNsAttr } from './TExoNsAttr';

/** WHICH attribute a port writes, in the shape the DOM call that writes it wants: a bare name for
 * `setAttribute`, the triple for `setAttributeNS`. A string on every HTML element, so the common
 * path carries no object. */
export type TExoAttrIdentity = string | TExoNsAttr;
