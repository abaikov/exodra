// Fragment symbol for <></> syntax
export { Fragment } from './jsx-runtime';

// NOTE: `mergeAttrs` moved to its own tool package, @exodra/attrs (it composes
// attrs buckets — that is not a JSX concern). The babel plugin now emits its
// import from there. Use `import { mergeAttrs } from '@exodra/attrs'` directly.

// TypeScript JSX types
export type { JSX } from './jsx-runtime';

// Event types — `event.currentTarget` narrowed to the element the handler is on,
// so `event.currentTarget.value` needs no cast. Annotate the handler param with
// `ExoInputEvent` / `ExoSelectEvent` / … (JSX won't infer through the bucket).
export type {
    ExoEvent,
    ExoEventHandlers,
    ExoInputEvent,
    ExoSelectEvent,
    ExoTextAreaEvent,
    ExoFormEvent,
} from './jsx-runtime';

// HTML type definitions
export type * from './html-types';

// IMPORTANT: Exodra JSX requires the Babel plugin
// TypeScript's native JSX transform is incompatible
// Use @exodra/babel-plugin-jsx to compile JSX to h() calls