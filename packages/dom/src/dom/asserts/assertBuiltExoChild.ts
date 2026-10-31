// What arrives here is a bare `Element` handed to a child list: no `mount`, no `unmount`, no
// disposers, so a list cannot know when to end subscriptions it never made. Without the check the
// page gets `insertBefore ... parameter 1 is not of type 'Node'` from inside a diff, naming nothing.
// The message carries NO runtime value, because the offending node is by definition not one of ours
// and there is nothing of it this function may read.
export function assertBuiltExoChild(): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'createExoSchema(dom): this node was not built by c.build(...). Children handed to ' +
              'a child list must come from build().' +
              ' It carries no lifecycle of its own, so a list cannot know when to end its ' +
              'subscriptions.'
            : 'EXO0036'
    );
}
