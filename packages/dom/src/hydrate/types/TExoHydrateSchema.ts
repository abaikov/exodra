import type { TExoPortNodeReader, TExoPortNodeWriter } from '@exodra/core';
import type { TExoDomSchema } from '../../dom/types/TExoDomSchema';
import type { TExoDomApi } from '../../dom/types/TExoDomApi';
import type { TExoDomSchemaBase } from '../../dom/types/TExoDomSchemaBase';
import type { TExoDomSetter } from '../../dom/types/TExoDomSetter';

// A schema compiled for hydration: DERIVED from `TExoDomSchema`, never compiled from the
// declaration again — the nodes on the page are those a clone would have produced, so the walk, the
// slot numbering and the port→element table are the same and only the reason to WRITE them is gone.
// WHAT EVERY FIELD MEANS AND WHAT IT IS INDEXED BY: README.md § The schema's tables.
export type TExoHydrateSchema = TExoDomSchemaBase & {
    // The DOM schema's `hydrateWalk`, shared. NOT its `walk`, which hops across the gap a child
    // list leaves in a clone and would land on row 0 of the server's markup.
    readonly walk: readonly number[];
    readonly slots: number;
    /** Its own answer and not the DOM schema's: the adopting pass counts slots and keeps its own
     *  setter table, so one schema can share the empty table while the other cannot. */
    readonly sharesEmptyNodes: boolean;
    readonly proto: Element;
    readonly setters: readonly TExoDomSetter[];
    /** Shared with the DOM schema by reference: the datum belongs to the PORT, and both tables
     *  write the same ports through the same bodies. */
    readonly writeData: readonly unknown[];
    readonly elem: readonly number[];
    readonly live: readonly TExoDomSetter[];
    // The DOM schema's `elem`, shared, so a port written by hand cannot go to the element while a
    // client render sends it to the Text node.
    readonly liveElem: readonly number[];
    readonly textLandings: readonly number[] | null;
    readonly childListStartSlot: readonly number[];
    readonly adoptStopSlot: readonly number[];
    readonly childListPrevPort: readonly number[];
    readonly childListPrevStatics: readonly number[];
    // Shared with the DOM schema: the two backends must not answer it differently on one page.
    readonly ownsElement: readonly number[];
    readonly hasSeparatedChildLists: boolean;
    readonly backend: TExoDomApi;
    readonly domSchema: TExoDomSchema;
    domPortWrite: TExoPortNodeWriter | null;
    domPortNodes: TExoPortNodeReader<Element> | null;
};
