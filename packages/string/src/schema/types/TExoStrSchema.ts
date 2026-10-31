import type { TExoPortNodeWriter } from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoStrNode } from '../../node/EXO_STR_NODE_VOCABULARY';
import type { TExoStrApi } from '../../node/types/TExoStrApi';
import type { TExoStrMarkupFiller } from '../../markup/types/TExoStrMarkupFiller';
import type { TExoStrWriter } from '../../writers/types/TExoStrWriter';

// Built once per (machine, backendType), cached on `machine.forms`.
export type TExoStrSchema = {
    // In `index` order — the same order both backends number by.
    readonly writers: readonly TExoStrWriter[];
    /** THE MARKUP AS DATA: the static pieces, and the port each hole takes when the markup places
     *  them out of declaration order (`null` when it does not). `fillMarkup` is these two compiled
     *  into one expression, so a schema that came off a build rather than out of a compile is
     *  these two written down and the expression built from them. */
    readonly pieces: readonly string[];
    readonly order: readonly number[] | null;
    readonly fillMarkup: TExoStrMarkupFiller;
    readonly portCount: number;
    readonly backend: TExoStrApi;
    // Copied off the backend at compile time, not reached through it: calling it is one load.
    readonly createInstance: (
        schema: TExoStrSchema,
        context: TExoContextFrame | null
    ) => TExoStrNode;
    // Captures the SCHEMA's writers, so it is not per instance.
    strPortWrite: TExoPortNodeWriter | null;
};
