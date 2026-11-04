// The naming form's two entry points. They are separate NAMES and not overloads of the two above —
// `TPorts` stands in the cursor's argument position here and in its return position there, and a
// callback's parameter is contextually typed rather than inferred from. Exported because a
// capability no caller outside this package can reach is a capability that ships unspendable —
// the shape `composed-capability.ts` is about.
export { createExoNamedSchema } from './schema/factories/createExoNamedSchema';
export { createExoStatic } from './machine/factories/createExoStatic';
export { nextExoBackendType } from './backend/nextExoBackendType';
export { warnExoFormGrowth } from './machine/warnExoFormGrowth';
export { exoBackendTypeOf } from './backend/exoBackendTypeOf';
export type { TExoBackendType } from './backend/types/TExoBackendType';
export type { TExoBackendCompatible } from './backend/types/TExoBackendCompatible';
export { exoBackendCompatible } from './backend/exoBackendCompatible';
export { EXO_NO_EFFECTS } from './machine/constants/EXO_NO_EFFECTS';
export { EXO_NO_HANDLERS } from './machine/constants/EXO_NO_HANDLERS';
export type { TExoMachine } from './machine/types/TExoMachine';

export { createExoSchema } from './schema/factories/createExoSchema';
export type { TExoJsonPortDeclaration } from './schema/types/TExoJsonPortDeclaration';
export { ExoSchemaCursor } from './schema/cursor/ExoSchemaCursor';
export { withExoSchemaAsserts } from './schema/cursor/withExoSchemaAsserts';
export type { TExoSchemaCursor } from './schema/cursor/types/TExoSchemaCursor';
export type { TExoSchemaDecorator } from './schema/cursor/types/TExoSchemaDecorator';
export type { TExoSchemaDraft } from './schema/cursor/types/TExoSchemaDraft';
export type { TExoCursorDeclaration } from './schema/types/TExoCursorDeclaration';
export type { TExoJsonDeclarations } from './schema/types/TExoJsonDeclarations';
export type { TExoSchemaBuild } from './schema/types/TExoSchemaBuild';
export type { TExoEmitter } from './schema/types/TExoEmitter';
export { exoPorts } from './schema/ports/factories/exoPorts';
export { exoEventPortKind } from './schema/ports/factories/exoEventPortKind';
export { exoRefPortKind } from './schema/ports/factories/exoRefPortKind';
export { nameExoPort } from './schema/ports/nameExoPort';
export type { TExoPortKindMark } from './schema/ports/types/TExoPortKindMark';
export type { TExoPortOfKind } from './schema/ports/types/TExoPortOfKind';
export type { TExoDeclaredPorts } from './schema/ports/types/TExoDeclaredPorts';
export type { TExoPort } from './schema/ports/types/TExoPort';
export type { TExoPortKind } from './schema/ports/types/TExoPortKind';
export type { TExoPortCompiler } from './schema/ports/types/TExoPortCompiler';
export { createExoAttrPort } from './schema/ports/factories/createExoAttrPort';
export { createExoTextPort } from './schema/ports/factories/createExoTextPort';
export { createExoPortOfKind } from './schema/ports/factories/createExoPortOfKind';
export { mintExoPort } from './schema/ports/factories/mintExoPort';
export { harvestExoSchema } from './schema/factories/harvestExoSchema';
export type { TExoAttrPort } from './schema/ports/types/TExoAttrPort';
export type { TExoAttrPortKind } from './schema/ports/types/TExoAttrPortKind';
export type { TExoEventPortKind } from './schema/ports/types/TExoEventPortKind';
export type { TExoRefPortKind } from './schema/ports/types/TExoRefPortKind';
export type { TExoTextPort } from './schema/ports/types/TExoTextPort';
export type { TExoChildrenPort } from './schema/ports/types/TExoChildrenPort';
export type { TExoEventPort } from './schema/ports/types/TExoEventPort';
export type { TExoPortName } from './schema/ports/types/TExoPortName';
export type { TExoRefPort } from './schema/ports/types/TExoRefPort';
export type { TExoAnyPort } from './schema/ports/types/TExoAnyPort';
export type { TExoPortNodeReader } from './wiring/types/TExoPortNodeReader';
export { EXO_PORT_ATTR } from './schema/ports/constants/EXO_PORT_ATTR';
export { EXO_PORT_ATTR_STRING } from './schema/ports/constants/EXO_PORT_ATTR_STRING';
export { EXO_PORT_ATTR_TOGGLE } from './schema/ports/constants/EXO_PORT_ATTR_TOGGLE';
export { EXO_PORT_TEXT } from './schema/ports/constants/EXO_PORT_TEXT';
export { EXO_PORT_CHILDREN } from './schema/ports/constants/EXO_PORT_CHILDREN';
export { EXO_PORT_EVENT } from './schema/ports/constants/EXO_PORT_EVENT';
export { EXO_PORT_REF } from './schema/ports/constants/EXO_PORT_REF';

export type { TExoWiring } from './wiring/types/TExoWiring';
export type { TExoEventOf } from './machine/types/TExoEventOf';
export type { TExoChildrenWiring } from './wiring/types/TExoChildrenWiring';

export type { TExoFillDoors } from './schema/types/TExoFillDoors';
export type { TExoPortTable } from './schema/ports/types/TExoPortTable';
export type { TExoPortNodeWriter } from './wiring/types/TExoPortNodeWriter';
export type { TExoInstanceRecord } from './wiring/types/TExoInstanceRecord';
export type { TExoLive } from './wiring/types/TExoLive';

export type { TExoNode } from './schema/types/TExoNode';

export type { TExoBaseNodeFields } from './wiring/types/TExoBaseNodeFields';
export type { TExoBaseNodeMethods } from './wiring/types/TExoBaseNodeMethods';
export type { TExoEffectOwner } from './wiring/types/TExoEffectOwner';
export { EXO_BASE_NODE_VOCABULARY } from './plugins/constants/EXO_BASE_NODE_VOCABULARY';
export { EXO_NO_STATE } from './wiring/constants/EXO_NO_STATE';
export { EXO_NO_MANAGED_STATE } from './wiring/constants/EXO_NO_MANAGED_STATE';

export { escapeExoText } from './escape/escapeExoText';
export { escapeExoAttributeValue } from './escape/escapeExoAttributeValue';

export { assertExoChildrenPort } from './schema/ports/asserts/assertExoChildrenPort';
export { assertExoIntactRawTextBoundary } from './schema/markup/asserts/assertExoIntactRawTextBoundary';
export { assertExoLegalTagName } from './schema/markup/asserts/assertExoLegalTagName';
export { assertExoOneRoot } from './schema/markup/asserts/assertExoOneRoot';
export { assertExoRootElement } from './schema/markup/asserts/assertExoRootElement';
export { assertExoLegalAttrName } from './attr/asserts/assertExoLegalAttrName';
export type { TExoEventHandler } from './wiring/types/TExoEventHandler';

export { EXO_VOID_ELEMENTS } from './schema/markup/constants/EXO_VOID_ELEMENTS';
export { EXO_DOM_PROPERTIES } from './attr/constants/EXO_DOM_PROPERTIES';
export { EXO_DOM_STRING_PROPERTIES } from './attr/constants/EXO_DOM_STRING_PROPERTIES';
export { exoDomPropertyKind } from './attr/exoDomPropertyKind';
export { EXO_RAW_TEXT_ELEMENTS } from './schema/markup/constants/EXO_RAW_TEXT_ELEMENTS';

export { composeExoPlugins } from './plugins/composeExoPlugins';
export type { TExoMergedPluginMethods } from './plugins/types/TExoMergedPluginMethods';
export type { TExoPlugin } from './plugins/types/TExoPlugin';
export type { TExoPluginMethods } from './plugins/types/TExoPluginMethods';
export { exoVocabulary } from './plugins/exoVocabulary';
export type { TExoVocabularyPlugin } from './plugins/types/TExoVocabularyPlugin';

export {
    armExoNode,
    wireExoNode,
    swapExoParams,
    assertExoArming,
    connectExoNode,
    createExoMachine,
    withExoTransitions,
    withExoWire,
    withExoHandlers,
    withExoEffects,
    composeExoMachine,
    disconnectExoNode,
    stopExoEffects,
} from './machine';
export { EXO_HTML_NS } from './schema/markup/constants/EXO_HTML_NS';
export { EXO_MATHML_NS } from './schema/markup/constants/EXO_MATHML_NS';
export { EXO_SVG_NS } from './schema/markup/constants/EXO_SVG_NS';
export { EXO_XLINK_NS } from './schema/markup/constants/EXO_XLINK_NS';
export { EXO_XML_NS } from './schema/markup/constants/EXO_XML_NS';
export { EXO_XMLNS_NS } from './schema/markup/constants/EXO_XMLNS_NS';
export { assertExoParserStableChild } from './schema/markup/asserts/assertExoParserStableChild';
export { assertExoParserStableText } from './schema/markup/asserts/assertExoParserStableText';
export type {
    TExoMachineOptions,
    TExoMachineNodeOf,
    TExoMachineTransitions,
    TExoTransitionArgs,
    TExoMachineEffect,
    TExoMachineHandler,
    TExoMachineInitialState,
    TExoMachineNode,
    TExoTransitionOverrides,
    TExoWire,
} from './machine';
// THE DECLARATIVE HALF IS NOT HERE. `withExoComputedMachine`, `exoTransition`, `exoWiring`,
// the compiled program and its passes, and the seventeen types that spell them are
// `@exodra/computed`. The direction is `computed` → `core` and never back: that package names
// `TExoMachine`, `TExoMachineNode` and `TExoMachineEffect` from
// the block above, and nothing in this package names anything of its.
