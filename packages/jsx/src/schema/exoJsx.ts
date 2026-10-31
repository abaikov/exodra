import type { TExoCursorDeclaration } from '@exodra/core';
import { jsx } from './jsx-runtime';
import type { TExoSchemaElement } from './jsx-runtime';
import type { TExoJsxPorts } from './TExoJsxPorts';

export function exoJsx<TPorts = unknown>(
    declare: ($: TExoJsxPorts<TPorts>) => TExoSchemaElement
): TExoCursorDeclaration<TPorts> {
    return jsx(declare);
}
