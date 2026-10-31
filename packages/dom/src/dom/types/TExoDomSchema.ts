import type { TExoPortNodeReader, TExoPortNodeWriter } from '@exodra/core';
import type { TExoAnyPort } from '@exodra/core';
import type { TExoDomApi } from './TExoDomApi';
import type { TExoDomSchemaBase } from './TExoDomSchemaBase';
import type { TExoDomChild } from './TExoDomChild';
import type { TExoDomSetter } from './TExoDomSetter';

// A schema compiled for the DOM: one per (schema, backend), cached on `schema.domSchema`. Written
// once by `compileExoDomSchema`.
// WHAT EVERY FIELD MEANS AND WHAT IT IS INDEXED BY: README.md § The schema's tables. Several other
// packages read these tables by position.
export type TExoDomSchema = TExoDomSchemaBase & {
    domPortWrite: TExoPortNodeWriter | null;
    domPortNodes: TExoPortNodeReader<Element> | null;
    readonly html: string;
    /** CARRIED, not pointed at: the declaration handed these out and this schema holds them,
     *  so nothing reaches back through a schema to the declaration that produced it. */
    readonly rootTag: string;
    readonly ports: readonly TExoAnyPort[];
    readonly proto: Element;
    readonly protoLandings: readonly Node[];
    readonly walk: readonly number[];
    readonly hydrateWalk: readonly number[];
    readonly slots: number;
    readonly sharesEmptyNodes: boolean;
    readonly setters: readonly TExoDomSetter[];
    readonly writeData: readonly unknown[];
    readonly elem: readonly number[];
    readonly markupMisses: readonly number[] | null;
    readonly childListStartSlot: readonly number[];
    readonly childListEndSlot: readonly number[];
    readonly adoptStopSlot: readonly number[];
    readonly childListNextPort: readonly number[];
    readonly hasAdjacentChildLists: boolean;
    readonly childListPrevPort: readonly number[];
    readonly childListPrevStatics: readonly number[];
    readonly hasSeparatedChildLists: boolean;
    readonly ownsElement: readonly number[];
    readonly hydrateUnreachable: readonly number[];
    // Compared by POINTER: a `new ExoDomBackend()` per render is a fresh key and a re-parse.
    readonly backend: TExoDomApi;
    readonly acquireNode: (schema: TExoDomSchema) => Element;
    childUnmount: (this: TExoDomChild) => void;
    hydrateSchema: object | null;
};
