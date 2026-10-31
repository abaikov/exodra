import type { TExoChildListEntry } from './TExoChildListEntry';

/** By port index: what each children port of one instance has published. Rewritten IN PLACE and
 * never replaced, so a child list reading its neighbour's first node (`order[0].node`) here reads a
 * live value. */
export type TExoChildLists = (readonly TExoChildListEntry[] | undefined)[];
