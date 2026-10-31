import type { TExoWriteVariant } from './TExoWriteVariant';

// One (tag, port) pair, the EIGHT values it is filled with, and the field of writers that fill it.
export type TExoWriteCase = {
    readonly name: string;
    readonly why: string;
    readonly reach: string;
    readonly tag: string;
    readonly attr: string;
    readonly values: readonly unknown[];
    /** The live state markup cannot show — an input's `value`, a box's `checked`. */
    readonly state: (node: Element) => string;
    /** `outerHTML` and live state after ONE full cycle of the values. */
    readonly expect: string;
    readonly variants: readonly TExoWriteVariant[];
};
