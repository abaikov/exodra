import { createExoMarkupFiller } from '../markup/factories/createExoMarkupFiller';
import type { TExoStrApi } from '../node/types/TExoStrApi';
import { exoStrWriterOf } from './exoStrWriterOf';
import type { TExoStrJsonDeclaration } from './types/TExoStrJsonDeclaration';
import type { TExoStrSchema } from './types/TExoStrSchema';

export function createExoStrSchema(
    declaration: TExoStrJsonDeclaration,
    backend: TExoStrApi
): TExoStrSchema {
    const declared = declaration.writers;
    const writers = new Array(declared.length);
    for (let i = 0; i < declared.length; i++) writers[i] = exoStrWriterOf(declared[i]);
    // Built whole, in one literal: a schema must not gain a field by a later shape transition.
    return {
        writers,
        pieces: declaration.pieces,
        order: declaration.order,
        fillMarkup: createExoMarkupFiller(declaration.pieces, declaration.order),
        portCount: declared.length,
        backend,
        createInstance: backend.createInstance,
        strPortWrite: null,
    };
}
