import type { TExoCursorDeclaration } from '@exodra/core';
import type { TExoStrApi } from '../node/types/TExoStrApi';
import { compileExoStrJsonDeclaration } from './compileExoStrJsonDeclaration';
import { createExoStrSchema } from './createExoStrSchema';
import type { TExoStrSchema } from './types/TExoStrSchema';

// Once per (schema, BACKEND) per process, and the same two steps a build splits in half.
export function compileExoStrSchema(
    schema: TExoCursorDeclaration,
    backend: TExoStrApi
): TExoStrSchema {
    return createExoStrSchema(compileExoStrJsonDeclaration(schema), backend);
}
