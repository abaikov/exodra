// Fragment symbol for <></> syntax
export { Fragment } from './jsx-runtime';

// Runtime glue emitted by the babel plugin for elements with directives
// (bind:, behaviour directives). Composes attrs buckets + lifecycle hooks.
export { mergeAttrs } from './mergeAttrs';

// TypeScript JSX types
export type { JSX } from './jsx-runtime';

// HTML type definitions
export type * from './html-types';

// IMPORTANT: Exodra JSX requires the Babel plugin
// TypeScript's native JSX transform is incompatible
// Use @exodra/babel-plugin-jsx to compile JSX to h() calls