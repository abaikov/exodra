import type { TExoJsonPortDeclaration } from '@exodra/core';

/**
 * A COMPILED DOM SCHEMA, WRITTEN DOWN — everything `compileExoDomSchema` worked out from the
 * markup, and nothing it can work out again from these.
 *
 * This is what a build emits so that a page ships no compiler: the walk, the tables and the
 * prototype's markup, which `createExoDomSchema` turns back into a schema with one parse
 * and no markup function. What is deliberately NOT here:
 *
 * - `setters` / `writeData`, because they are the WRITERS PACK's answer and a different
 *   composition must get its own; they are re-derived from the port kinds against the parsed
 *   prototype, which is exactly what the compiler does with them.
 * - `protoLandings`, re-derived by replaying `walk` over the fresh prototype.
 * - `markupMisses`, which is `writers.markupCarries` asked again for the same reason as the
 *   setters.
 * - the element a text port's writer was chosen on: a moved text slot is reachable from the walk
 *   triple that landed on it, so carrying it would be carrying a derivable.
 */
export type TExoDomJsonDeclaration = {
    readonly html: string;
    readonly rootTag: string;
    readonly ports: readonly TExoJsonPortDeclaration[];
    readonly walk: readonly number[];
    /** `null` when the two walks ARE one table, which is the common case and what the live schema
     *  says by holding the same array twice. */
    readonly hydrateWalk: readonly number[] | null;
    readonly slots: number;
    readonly elem: readonly number[];
    readonly ownsElement: readonly number[];
    readonly childListStartSlot: readonly number[];
    readonly childListEndSlot: readonly number[];
    readonly adoptStopSlot: readonly number[];
    readonly childListNextPort: readonly number[];
    readonly childListPrevPort: readonly number[];
    readonly childListPrevStatics: readonly number[];
    readonly hasAdjacentChildLists: boolean;
    readonly hasSeparatedChildLists: boolean;
    readonly hydrateUnreachable: readonly number[];
    /** THE SLOTS THAT ARE TEXT PLACEHOLDERS, and the one thing `html` cannot carry: an EMPTY Text
     *  node serialises to nothing, so a prototype parsed back from this markup has no child where
     *  the compiler put one. The rebuild puts it back, which is the same insertion hydration makes
     *  when the server printed an empty text port. */
    readonly textSlots: readonly number[];
};
