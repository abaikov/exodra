import type { TExoSchema } from '../types/TExoSchema';
import { h } from './h';

export function text(value: unknown): TExoSchema {
    // h() is the pre-bucketed fast path, so textContent must go in `static`.
    return h('#text', { static: { textContent: value } });
}
