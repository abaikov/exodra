import type { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import type { TExoPortCompiler } from './TExoPortCompiler';

export type TExoChildrenPort = {
    index: number;
    readonly kind: typeof EXO_PORT_CHILDREN;
    readonly name: string | null;
    compileWith<TWriter>(cutter: TExoPortCompiler<TWriter>): TWriter;
};
