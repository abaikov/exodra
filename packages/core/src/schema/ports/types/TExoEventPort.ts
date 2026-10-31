import type { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import type { TExoPortCompiler } from './TExoPortCompiler';

export type TExoEventPort = {
    index: number;
    readonly kind: typeof EXO_PORT_EVENT;
    readonly name: string | null;
    compileWith<TWriter>(cutter: TExoPortCompiler<TWriter>): TWriter;
};
