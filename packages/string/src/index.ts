// `Str` is the BACKEND TOKEN, not short for "string": `TExoStrWriter` means "the string backend's
// writer", where `TExoStringWriter` would mean "a writer of strings", which they all are.

export { ExoStrBackend } from './node/ExoStrBackend';
export type { TExoStrBackend, TExoStrBackendConstructor } from './node/ExoStrBackend';
export type {
    TExoStrNode,
    TExoStrSurface,
    TExoStrNodeApi,
    TExoStrNodeFields,
} from './node/EXO_STR_NODE_VOCABULARY';
export type { TExoStrApi } from './node/types/TExoStrApi';
// A caller composing a backend of its OWN calls this ONCE for that object: twice is a second
// constructor, and a second constructor is a second hidden class at the field the hot path reads.
export { createExoStrInstanceFactory } from './node/factories/createExoStrInstanceFactory';
export { EXO_STR_NODE_VOCABULARY } from './node/EXO_STR_NODE_VOCABULARY';
export type { TExoStrMachine } from './node/types/TExoStrMachine';
// Markup somebody else produced, written UNESCAPED. Without it a child from the browser's backend
// serialises as the literal text `[object Object]`, silently.
export { exoForeignMarkup } from './markup/exoForeignMarkup';
export { EXO_STR_FOREIGN_VOCABULARY } from './foreign/constants/EXO_STR_FOREIGN_VOCABULARY';
export type { TExoStrForeignApi } from './foreign/types/TExoStrForeignApi';
export type { TExoStrMark } from './schema/types/TExoStrMark';
export { exoStrSchemaOf } from './schema/exoStrSchemaOf';
export { compileExoStrSchema } from './schema/compileExoStrSchema';
export { compileExoStrJsonDeclaration } from './schema/compileExoStrJsonDeclaration';
export { createExoStrSchema } from './schema/createExoStrSchema';
export type { TExoStrJsonDeclaration } from './schema/types/TExoStrJsonDeclaration';
export type { TExoStrWriterDeclaration } from './schema/types/TExoStrWriterDeclaration';
export { renderExoStrInstance } from './node/renderExoStrInstance';
export { EXO_STR_WRITERS } from './writers/EXO_STR_WRITERS';
export type { TExoStrSchema } from './schema/types/TExoStrSchema';
export type { TExoStrWriter } from './writers/types/TExoStrWriter';
export type { TExoStrMarkupFiller } from './markup/types/TExoStrMarkupFiller';
