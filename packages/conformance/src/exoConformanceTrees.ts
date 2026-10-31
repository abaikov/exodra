import { exoDomAdapter } from './adapters/exoDomAdapter';
import { exoHydrateAdapter } from './adapters/exoHydrateAdapter';
import { exoStrAdapter } from './adapters/exoStrAdapter';
import { exoTermAdapter } from './adapters/exoTermAdapter';
import type { TExoConformanceAdapter } from './types/TExoConformanceAdapter';

// Every rule's `expect` must name EXACTLY these keys, checked before anything renders, so adding a
// backend breaks the whole suite at once by name: no default, no fallback, no skip, no snapshot to
// regenerate, and the only way to green is to state rule by rule what it does. Changing an existing
// one fails through the other door — its verdict falls into a different equivalence class and the
// declared partition stops matching. The order below is the order failure output is printed in.
export const exoConformanceTrees: readonly TExoConformanceAdapter[] = [
    exoDomAdapter,
    exoStrAdapter,
    exoTermAdapter,
    exoHydrateAdapter,
];

// The registry's keys, sorted — what a rule's `expect` is checked against.
export const exoConformanceTreeNames: readonly string[] = exoConformanceTrees
    .map((adapter) => adapter.name)
    .sort();
