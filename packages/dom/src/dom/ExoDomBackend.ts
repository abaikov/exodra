import { EXO_BASE_NODE_VOCABULARY, composeExoPlugins, nextExoBackendType } from '@exodra/core';
import { EXO_DOM_NODE_VOCABULARY } from './EXO_DOM_NODE_VOCABULARY';
import { createExoDomChildFactory } from './factories/createExoDomChildFactory';
import { createExoDomInstanceFactory } from './factories/createExoDomInstanceFactory';
import type { TExoDomSurface } from './EXO_DOM_NODE_VOCABULARY';
import { EXO_DIRECT_EVENTS } from '../events/constants/EXO_DIRECT_EVENTS';
import { EXO_SHIPPED_WRITERS } from '../backend/constants/EXO_SHIPPED_WRITERS';
import type { TExoEventsApi } from '../events/types/TExoEventsApi';
import type { TExoWritersApi } from '../backend/types/TExoWritersApi';
import type { TExoDomApi } from './types/TExoDomApi';

/**
 * The browser backend and the schema cache KEY, compared by POINTER: build ONE, at module level.
 */
class ExoDomBackendBase implements TExoDomApi {
    readonly backendType: number = nextExoBackendType();
    events: TExoEventsApi = EXO_DIRECT_EVENTS;
    writers: TExoWritersApi = EXO_SHIPPED_WRITERS;
    // Built BEFORE the merge below (class fields initialise first), so a pack naming either
    // receives it as `next`; ONCE each, or one composition's records fall into two hidden classes.
    createInstance: TExoDomApi['createInstance'] = createExoDomInstanceFactory(this);
    createChild: TExoDomApi['createChild'] = createExoDomChildFactory(this);

    constructor() {
        // Base pack first — merged, not declared as class methods, so a pack can WRAP these.
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY, EXO_DOM_NODE_VOCABULARY);
    }
}

// An interface and not the class: the merged names are own properties a class type cannot see.
export interface TExoDomBackendConstructor {
    new (): ExoDomBackendBase & TExoDomSurface;
}

export const ExoDomBackend = ExoDomBackendBase as unknown as TExoDomBackendConstructor;

// The shipped surface, but NOT what a pack added: annotating a composed backend erases those names.
// What the compiler and the reconcilers take is `TExoDomApi`, which has no `render`.
export type TExoDomBackend = ExoDomBackendBase & TExoDomSurface;
