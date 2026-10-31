import type { TExoEventsApi } from '../../events/types/TExoEventsApi';
import type { TExoWritersApi } from '../../backend/types/TExoWritersApi';
import type { TExoDomRecordFactories } from './TExoDomRecordFactories';
import type { TExoParserStability } from './TExoParserStability';
import type { TExoForeignNamespaces } from './TExoForeignNamespaces';

/** The API a composed DOM backend provides, each member from a plugin and read at COMPILE time.
 * `children`/`bindPort` are `TExoBindingApi`'s instead, so a page that binds nothing links neither
 * the reconciler nor the subscription (`check:binding-shake`). A type and not the class, or
 * `compileExoDomSchema → ExoDomBackend → exoDomSchemaOf` is a cycle the graph gate refuses. */
export type TExoDomApi = {
    readonly backendType: number;
    readonly events: TExoEventsApi;
    readonly writers: TExoWritersApi;
    /** Only the TYPE is named here, so no client-only bundle gains an edge into `hydrate/`. */
    /** The prototype an adopting exonode stands on, with the record factories built over it: render
     * and hydrate claim the SAME NAMES with different bodies, and `composeExoPlugins` is last-claim-wins. */
    readonly hydrateSurface?: TExoDomRecordFactories;
    /** Absent on a client-only backend, which parses nothing: `compileExoDomSchema` asks the pair
     * of refusals through here so the tables reach no bundle that cannot meet a parser. */
    readonly parserStability?: TExoParserStability;
    readonly foreignNamespaces?: TExoForeignNamespaces;
} & TExoDomRecordFactories;
