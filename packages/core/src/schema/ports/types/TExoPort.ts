import type { TExoPortKind } from './TExoPortKind';
import type { TExoPortCompiler } from './TExoPortCompiler';

/**
 * ONE OBJECT PER TEMPLATE, never per row. `index` is assigned AFTER the whole shape is known, by
 * walking in document order, because a cursor may declare an attribute after a child.
 */
export type TExoPort = {
    index: number;
    readonly kind: TExoPortKind;
    readonly name: string | null;
    compileWith<TWriter>(into: TExoPortCompiler<TWriter>): TWriter;
};
