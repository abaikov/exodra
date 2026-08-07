import type { TExoSchema } from '../types/TExoSchema';
import { createTextSchema } from './createTextSchema';

/** Public front door for a `#text` node: `text('hello')`. */
export function text(value: unknown): TExoSchema {
    return createTextSchema(value);
}
