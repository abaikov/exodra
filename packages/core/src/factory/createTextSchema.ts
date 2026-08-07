import type { TExoSchema } from '../types/TExoSchema';

/**
 * The canonical `#text` node shape. Renderers wrap primitive children (a string
 * or a number in a children array) with this, so the shape they all recognise is
 * defined once.
 *
 * It builds the literal directly instead of going through `h()`: renderers call
 * it while normalising children, and the object literal is the whole point —
 * there is nothing for `h()` to add. `text()` is the public, value-taking front
 * door for the same shape.
 */
export function createTextSchema(textContent: unknown): TExoSchema {
    return {
        type: '#text',
        attrs: { static: { textContent } },
    } as TExoSchema;
}
