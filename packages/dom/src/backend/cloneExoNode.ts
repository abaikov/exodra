import type { TExoDomSchema } from '../dom/types/TExoDomSchema';

// Where every instance's element comes from. A clone is WALK-IDENTICAL to `schema.proto` by
// construction, which is the whole contract `schema.walk` replays against.
export const cloneExoNode = (schema: TExoDomSchema): Element =>
    schema.proto.cloneNode(true) as Element;
