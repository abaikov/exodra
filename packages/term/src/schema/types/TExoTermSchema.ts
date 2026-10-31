import type { TExoPortNodeReader, TExoPortNodeWriter } from '@exodra/core';
import type { TExoAnyPort } from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoTermNode } from '../../instance/EXO_TERM_NODE_VOCABULARY';
import type { TExoTermApi } from '../../backend/types/TExoTermApi';
import type { TExoTermElement } from '../../instance/types/TExoTermElement';
import type { TExoTermProtoElement } from '../../instance/types/TExoTermProtoElement';
import type { TExoTermWriter } from '../../utilities/types/TExoTermWriter';

// Built once per (machine, backendType), cached on `machine.forms`.
export type TExoTermSchema = {
    readonly proto: TExoTermProtoElement;
    // Indexed by `port.index`.
    readonly writers: readonly TExoTermWriter[];
    // The event name of each event port, `null` elsewhere.
    readonly names: readonly (string | null)[];
    readonly portCount: number;
    /** CARRIED, not pointed at: the declaration handed these out and this schema holds them,
     *  so nothing reaches back through a schema to the declaration that produced it. */
    readonly rootTag: string;
    readonly ports: readonly TExoAnyPort[];
    // The prototype every instance of this schema takes, and the key a nested lookup is handed.
    readonly backend: TExoTermApi;
    // NOT reached through `backend`: a closure over a CONSTRUCTOR built once, so calling it is one
    // load off the schema every render already holds.
    readonly createInstance: (
        schema: TExoTermSchema,
        context: TExoContextFrame | null
    ) => TExoTermNode;
    // Both are made at most once per schema, and neither captures anything per instance.
    termPortWrite: TExoPortNodeWriter | null;
    termPortNodes: TExoPortNodeReader<TExoTermElement> | null;
};
