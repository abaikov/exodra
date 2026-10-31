import type { TExoPlugin } from './TExoPlugin';

/**
 * `next` IS `unknown` AND NOT `never`: a parameter is contravariant, so a factory declared to take
 * anything satisfies `TExoPlugin`'s index signature, which declares it takes nothing.
 */
export type TExoVocabularyPlugin<TMethods> = TExoPlugin & {
    readonly [K in keyof TMethods]: (next: unknown) => TMethods[K];
};
