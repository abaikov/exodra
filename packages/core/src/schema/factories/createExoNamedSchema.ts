import { createExoSchema } from './createExoSchema';
import type { TExoCursorDeclaration } from '../types/TExoCursorDeclaration';
import type { TExoSchemaCursor } from '../cursor/types/TExoSchemaCursor';
import type { TExoSchemaDecorator } from '../cursor/types/TExoSchemaDecorator';

/**
 * THE NAMING FORM: each port names itself where it stands and the build callback returns nothing, so
 * `TPorts` comes from the explicit type argument rather than from inference.
 *
 * A SECOND NAME AND NOT A THIRD OVERLOAD: `TPorts` stands in the cursor's ARGUMENT position here
 * and in its RETURN position above, and a callback's parameter is contextually typed rather than
 * inferred from. One name covering both leaves nothing to infer from and collapses `TPorts` to
 * `unknown` for every caller — ports vanishing silently, which is worse than a call that will not
 * compile. The cast is the one place the two cursor instantiations are held apart: they are the
 * SAME OBJECT at run time, and the compiler separates them only because `TExoPortName` puts
 * `TPorts` in a mapped type over a conditional.
 */
export function createExoNamedSchema<TPorts>(
    build: (cursor: TExoSchemaCursor<TPorts>) => void,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoCursorDeclaration<TPorts> {
    return createExoSchema<TPorts>(build, decorate);
}
