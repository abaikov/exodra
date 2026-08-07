// Exodra INSIDE React: mount an Exodra tree into a React-owned element.
//
// The mirror image of @exodra/react, which embeds React components inside an
// Exodra tree. Kept as its own package so a React app can adopt Exodra (or an
// Exodra app can embed React) without installing the other direction — and so
// both resolve the same @exodra/* instances through peer dependencies rather
// than each pinning their own copy.
export { ExoMount } from './ExoMount';
export { useExoMount } from './useExoMount';
export type {
    TExoMountOptions,
    TExoMountProps,
    TExoMountSource,
} from './types';
