import type { TExoTermSurface } from '../../instance/EXO_TERM_NODE_VOCABULARY';
import type { TExoTermSchema } from '../../schema/types/TExoTermSchema';

// `createInstance` is here and not on the connector surface because it is no call a wire makes: it is
// the seam a pack replaces to give instances fields — methods compose, fields do not.
export type TExoTermApi = TExoTermSurface & {
    readonly backendType: number;
    readonly createInstance: TExoTermSchema['createInstance'];
};
