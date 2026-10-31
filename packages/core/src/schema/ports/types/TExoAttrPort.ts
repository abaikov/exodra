import type { TExoAttrPortKind } from './TExoAttrPortKind';
import type { TExoPortCompiler } from './TExoPortCompiler';

export type TExoAttrPort = {
    index: number;
    readonly kind: TExoAttrPortKind;
    readonly name: string | null;
    compileWith<TWriter>(cutter: TExoPortCompiler<TWriter>): TWriter;
};
