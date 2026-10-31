import type { TExoStrMarkupFiller } from '../../src/markup/types/TExoStrMarkupFiller';

/**
 * One template shape, with EVERY CANDIDATE'S FILLER ALREADY BUILT. Construction is outside the
 * timed region because it is outside it in the library too: a filler is made once per schema, in
 * `compileExoStrSchema`, and then serves every instance of that component for the process's life.
 */
export type TExoFillMarkupScene = {
    readonly name: string;
    readonly ports: number;
    readonly pieces: readonly string[];
    /** One values array per call, cycled from a pool — the argument is a load, never a constant. */
    readonly streams: readonly (readonly string[])[];
    readonly shipped: TExoStrMarkupFiller;
    readonly twin: TExoStrMarkupFiller;
    readonly loop: TExoStrMarkupFiller;
    readonly joinArray: TExoStrMarkupFiller;
    readonly joinReused: TExoStrMarkupFiller;
    readonly floor: TExoStrMarkupFiller;
};
