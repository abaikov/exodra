import type { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import type { TExoPortCompiler } from './TExoPortCompiler';

export type TExoTextPort = {
    index: number;
    readonly kind: typeof EXO_PORT_TEXT;
    readonly name: string | null;
    compileWith<TWriter>(cutter: TExoPortCompiler<TWriter>): TWriter;
};
