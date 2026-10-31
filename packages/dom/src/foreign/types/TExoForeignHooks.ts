// Both hooks may fire MORE THAN ONCE, in pairs: a child that leaves a list and comes back is not
// rebuilt, so start in `onMount`, stop in `onUnmount`, and keep no state between them.
// `onMount` must leave the element where it found it — fill it, empty it, hand it to a library, but
// do not move, wrap or replace it: every insertion and anchor addresses that element directly.
// `this` is not part of the contract: `exoForeignNode` reads the two fields into locals and calls
// them as plain functions, and keeps no reference to this object.
// Neither hook is an error boundary — a throw part-applies whatever list operation was running.
// The one thing held back: a throwing `onUnmount` still leaves the child DISPOSED, because the
// default teardown runs in a `finally` after the hook.
export type TExoForeignHooks = {
    // Run after this element has been put in the tree, every time it is put in.
    onMount?(): void;
    // Run while this element is still attached, every time it is about to be taken out.
    onUnmount?(): void;
};
