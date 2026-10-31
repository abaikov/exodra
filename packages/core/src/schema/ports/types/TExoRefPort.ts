import type { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import type { TExoPortCompiler } from './TExoPortCompiler';

/**
 * A SEPARATE TYPE AND NOT A FIFTH KIND BECAUSE THAT IS THE ENFORCEMENT: a ref port reaches no fill
 * door, and no runtime guard does that work. `name` is TYPED `string | null` so this and
 * `TExoPort` differ in exactly ONE field and a compiler can narrow on `kind` alone.
 */
export type TExoRefPort = {
    index: number;
    readonly kind: typeof EXO_PORT_REF;
    readonly name: string | null;
    compileWith<TWriter>(into: TExoPortCompiler<TWriter>): TWriter;
};
