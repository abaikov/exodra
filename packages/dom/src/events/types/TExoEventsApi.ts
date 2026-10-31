import type { TExoEventAttacher } from './TExoEventAttacher';
import type { TExoEventPortData } from './TExoEventPortData';

// One pack serves the DOM backend AND hydration, because attaching listeners is the only work
// hydration performs and a strategy with two halves is one whose halves can disagree.
// `install` is honoured by `render` and `hydrate` and by NOTHING else: a caller driving
// `mountExoInstance` directly, or attaching a list into a parent outside the render root, gets ports
// filled and no root listening, and must `install` on the root it chose.
// The two rules for writing a pack: ../../README.md § Events as a plugin.
export type TExoEventsApi = {
    readonly name: string;
    // Once per event port per schema, at compile time — free to be as expensive as it likes,
    // and the only place a pack may refuse a name.
    readonly port: (event: string) => TExoEventPortData;
    readonly attach: TExoEventAttacher;
    readonly install?: (root: Element) => () => void;
};
