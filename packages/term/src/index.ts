// IMPORT RULE: `src/` outside `src/doc/` imports `@exodra/core` and `@exodra/context` and nothing
// else, at runtime or in a type. `imports-only-core.test.ts` is what holds it.

export { ExoTermBackend } from './backend/ExoTermBackend';
export type { TExoTermBackend, TExoTermBackendConstructor } from './backend/ExoTermBackend';
export type { TExoTermApi } from './backend/types/TExoTermApi';
export type { TExoTermScreen } from './rendering/types/TExoTermScreen';

// The connector is THE INSTANCE ITSELF, its prototype the composed backend — which is what makes
// every one of its methods replaceable by a pack.
export type {
    TExoTermNode,
    TExoTermSurface,
    TExoTermNodeApi,
    TExoTermNodeFields,
    TExoTermSatisfiesCoreValues,
    TExoTermSatisfiesCoreChildren,
} from './instance/EXO_TERM_NODE_VOCABULARY';
export { createExoTermInstanceFactory } from './instance/createExoTermInstanceFactory';
export type { TExoTermMachine } from './instance/types/TExoTermMachine';

// So a caller driving instances itself gets THE SCHEMA THE ENTRY POINT WOULD HAVE BUILT.
export { compileExoTermSchema } from './schema/compileExoTermSchema';
export { exoTermSchemaOf } from './schema/exoTermSchemaOf';
export { renderExoTermInstance } from './rendering/renderExoTermInstance';
export { exoTermWriterForPort } from './utilities/exoTermWriterForPort';
export type { TExoTermSchema } from './schema/types/TExoTermSchema';
export type { TExoTermWriter } from './utilities/types/TExoTermWriter';
export type {
    TExoTermProtoElement,
    TExoTermProtoKid,
    TExoTermProtoRegion,
    TExoTermProtoText,
} from './instance/types/TExoTermProtoElement';

export { exoTermText } from './instance/exoTermText';
export type { TExoTermTextOptions } from './instance/exoTermText';
export { exoTermFind } from './utilities/exoTermFind';
export { exoTermFire } from './utilities/exoTermFire';
export type { TExoTermEvent } from './utilities/types/TExoTermEvent';
export type {
    TExoTermElement,
    TExoTermKid,
    TExoTermListener,
    TExoTermStaticText,
} from './instance/types/TExoTermElement';

// LIFETIMES, which `@exodra/core` has no word for — this package's own invention.
export { disposeExoTermChild } from './instance/disposeExoTermChild';
export type { TExoTermChild, TExoTermRegion } from './instance/types/TExoTermChild';

// A subtree this backend did not render. The marker makes a browser template a compile error at the
// line that hands it here, instead of a `.node` reading `undefined`.
export { exoForeignTermNode } from './instance/exoForeignTermNode';
export { EXO_TERM_FOREIGN_VOCABULARY } from './foreign/constants/EXO_TERM_FOREIGN_VOCABULARY';
export type { TExoTermForeignApi } from './foreign/types/TExoTermForeignApi';
export type { TExoTermMark } from './rendering/types/TExoTermMark';

// The head of the context chain. Only a caller driving `renderExoTermInstance` by hand needs it.
export { exoTermContextSlot } from './utilities/exoTermContextSlot';

// The one piece of this backend `@exodra/core`'s own list exports could not supply.
