import type { TExoStrSurface } from '../EXO_STR_NODE_VOCABULARY';
import type { TExoStrSchema } from '../../schema/types/TExoStrSchema';

// A composed server backend: the surface a wire reaches through the prototype, plus the BACKEND's
// own fields. `createInstance` is no wire's call — it is the seam that gives instances fields.
export type TExoStrApi = TExoStrSurface & {
    readonly backendType: number;
    readonly createInstance: TExoStrSchema['createInstance'];
};
