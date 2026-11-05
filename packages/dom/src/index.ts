// What each export is for, and what it costs: ../README.md

export type {
    TExoDomNode,
    TExoDomRenderNode,
    TExoDomSurface,
    TExoDomNodeApi,
} from './dom/EXO_DOM_NODE_VOCABULARY';
export { EXO_DOM_NODE_VOCABULARY } from './dom/EXO_DOM_NODE_VOCABULARY';
export type { TExoDomMachine } from './dom/types/TExoDomMachine';
export { compileExoDomSchema } from './dom/compileExoDomSchema';
// THE TWO HALVES OF SHIPPING SCHEMAS INSTEAD OF DECLARATIONS, and they are meant to be imported
// from opposite sides: `exoDomJsonDeclaration` by a BUILD, which has the compiler anyway, and
// `createExoDomSchema` by the page, which is the half that must not reach the compiler.
export { exoDomJsonDeclaration } from './dom/exoDomJsonDeclaration';
export { createExoDomSchema } from './dom/createExoDomSchema';
export { withExoBuiltSchemas } from './dom/withExoBuiltSchemas';
export type { TExoBuiltSchemasApi } from './dom/withExoBuiltSchemas';
export type { TExoDomJsonDeclaration } from './dom/types/TExoDomJsonDeclaration';
export { ExoDomBackend } from './dom/ExoDomBackend';
// The compiler as a COMPOSITION: `render(component, parent)` exists when this is merged, and the
// page that renders build-made schemas leaves it out and has no compiler in it.
export { withExoCompiler } from './dom/withExoCompiler';
export type { TExoCompilerApi } from './dom/withExoCompiler';
export { withExoForeignNamespaces } from './dom/withExoForeignNamespaces';
export type { TExoForeignNamespaces } from './dom/types/TExoForeignNamespaces';
export { withExoHydration } from './hydrate/withExoHydration';
export type { TExoHydrateBackend, TExoHydrationApi } from './hydrate/withExoHydration';
export type { TExoDomBackend, TExoDomBackendConstructor } from './dom/ExoDomBackend';
export type { TExoDomApi } from './dom/types/TExoDomApi';
// BUILD THE BACKEND ONCE, AT MODULE LEVEL: the schema cache keys by backend IDENTITY, so one built
// inside a component or a render loop recompiles every schema it touches, markup parse included.
export { exoDomSchemaOf } from './dom/exoDomSchemaOf';
export { mountExoSchema } from './dom/mountExoSchema';
export { mountExoInstance } from './dom/mountExoInstance';
export { createExoNodeRecord } from './dom/factories/createExoNodeRecord';
export type { TExoDomSchema } from './dom/types/TExoDomSchema';
export type { TExoDomSetter } from './dom/types/TExoDomSetter';
export { EXO_WALK_FIRST_CHILD } from './dom/constants/EXO_WALK_FIRST_CHILD';
export { EXO_WALK_NEXT_SIBLING } from './dom/constants/EXO_WALK_NEXT_SIBLING';
export { EXO_WALK_FROM_END } from './dom/constants/EXO_WALK_FROM_END';
export { exoTeardownScope, exoOnTeardown } from './dom/exoTeardownScope';
export { exoNodeDom } from './dom/exoNodeDom';
export { createExoChildList } from './dom/factories/createExoChildList';
export type { TExoChildList } from './dom/types/TExoChildList';
export type { TExoDomPortChildList } from './dom/types/TExoDomPortChildList';
export type { TExoDomChildPortApi } from './dom/types/TExoDomChildPortApi';
export type { TExoDomChild } from './dom/types/TExoDomChild';
export type { TExoDomInstanceRecord } from './dom/types/TExoDomInstanceRecord';

export { exoForeignNode } from './foreign/exoForeignNode';
export type { TExoForeignHooks } from './foreign/types/TExoForeignHooks';
export { EXO_DOM_FOREIGN_VOCABULARY } from './foreign/constants/EXO_DOM_FOREIGN_VOCABULARY';
export type { TExoDomForeignApi } from './foreign/types/TExoDomForeignApi';

export type { TExoDomMark } from './dom/types/TExoDomMark';

export { provideExoContext } from './dom/provideExoContext';

export type { TExoHydrateNode, TExoHydrateSurface } from './hydrate/EXO_HYDRATE_NODE_VOCABULARY';
export { EXO_HYDRATE_NODE_VOCABULARY } from './hydrate/EXO_HYDRATE_NODE_VOCABULARY';
export type { TExoHydrateSchema } from './hydrate/types/TExoHydrateSchema';
export { findExoRowDisagreement } from './hydrate/findExoRowDisagreement';
// The wording of the messages raised through this is asserted verbatim by tests outside this package.
export { describeExoNode } from './dom/describeExoNode';

export { EXO_DIRECT_EVENTS } from './events/constants/EXO_DIRECT_EVENTS';
export { createExoDelegatedEvents } from './events/factories/createExoDelegatedEvents';
export type { TExoDelegatedEventsOptions } from './events/types/TExoDelegatedEventsOptions';
export type { TExoEventsApi } from './events/types/TExoEventsApi';
export type { TExoEventAttacher } from './events/types/TExoEventAttacher';
export type { TExoEventPortData } from './events/types/TExoEventPortData';
export { exoEventSlotsFor } from './events/exoEventSlotsFor';
export { EXO_DIRECT_PACK_ID } from './events/constants/EXO_DIRECT_PACK_ID';
export { createExoEventPortData } from './events/factories/createExoEventPortData';
export { attachExoDirectEvent } from './events/attachExoDirectEvent';
export { attachExoDelegatedEvent } from './events/attachExoDelegatedEvent';
export { installExoDelegatedRoot } from './events/installExoDelegatedRoot';
export { createExoDelegatedListener } from './events/factories/createExoDelegatedListener';
export { EXO_NON_BUBBLING_EVENTS } from './events/constants/EXO_NON_BUBBLING_EVENTS';
export { EXO_HIGH_FREQUENCY_EVENTS } from './events/constants/EXO_HIGH_FREQUENCY_EVENTS';
export { assertExoSubject } from './events/asserts/assertExoSubject';
export type { TExoEventSlots } from './events/types/TExoEventSlots';
export type { TExoDelegatedRoot } from './events/types/TExoDelegatedRoot';

export { dropExoChild } from './dom/dropExoChild';
export { clearOwnedExoChildList } from './dom/clearOwnedExoChildList';
export { assertBuiltExoChild } from './dom/asserts/assertBuiltExoChild';

export { cloneExoNode } from './backend/cloneExoNode';

export { EXO_SHIPPED_WRITERS } from './backend/constants/EXO_SHIPPED_WRITERS';
export type { TExoWritersApi } from './backend/types/TExoWritersApi';

export {
    createExoPropertyWriters,
    withExoPropertyWriters,
    takesOverExoProperty,
    EXO_GLOBAL_ATTRIBUTES,
} from './plugins/exo-property-writers';

// Restores the text writer that re-reads `firstChild` per write, at two loads and a comparison:
// without it, a page translator replacing the Text node makes updates land on a node nobody renders.
export { withExoDefaults } from './plugins/exo-default-bundle';
export {
    exoReclaimingText,
    createExoReclaimingTextWriters,
    withExoReclaimingText,
} from './plugins/exo-reclaiming-text';
