import type { TExoNode } from '@exodra/core';
import type { TExoStrMark } from '../schema/types/TExoStrMark';

// IT DOES NOT ESCAPE, and cannot: at `bindChildren` a foreign child and a rendered one are the same
// `string`. THE CALLER OWNS THE STRING — one built out of a request, a row or a user is an injected
// script in the served page. NOT SUPPORTED: hydration, lifecycle, well-formedness.
export function exoForeignMarkup(markup: string): TExoNode<TExoStrMark> {
    // The brand is type-system only and names THIS backend, so the string cannot travel to a
    // client render's children port.
    return markup as unknown as TExoNode<TExoStrMark>;
}
