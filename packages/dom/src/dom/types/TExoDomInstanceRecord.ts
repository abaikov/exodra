import type { TExoTransitionOverrides } from '@exodra/core';
import type { TExoInstanceRecord } from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoDomSchemaBase } from './TExoDomSchemaBase';
import type { TExoDomChild } from './TExoDomChild';
import type { TExoChildLists } from './TExoChildLists';

/** The record every instance gets, and the object a wiring function is handed; its prototype is the
 * surface `schema.createInstance` was built over. The first nine fields stand first in BOTH literals
 * and `live` last in both, so the two record shapes share those field indices. */
export type TExoDomInstanceRecord = {
    nodes: Node[];
    /** By port index; allocated only where `schema.hasAdjacentChildLists` says a chain exists. */
    childLists: TExoChildLists | null;
    /** Not this record: `one` and a fixed `list` pass the OWNER'S child, not the instance's own. */
    child: TExoDomChild | null;
    /** Handed in as a value: nothing in the document is marked and no lookup climbs the tree. */
    context: TExoContextFrame | null;
    schema: TExoDomSchemaBase;
    publishedChildListEnds: (Element | null | undefined)[] | null;
    state: unknown;
    managedState: unknown[];
    effectStops: ((() => void) | null)[] | null;
    transitionOverrides: TExoTransitionOverrides | null;
    serviceState: unknown;
} & TExoInstanceRecord;
