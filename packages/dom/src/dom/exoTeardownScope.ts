import type { TExoDomChild } from './types/TExoDomChild';

// A module variable is sound because a render runs start to finish synchronously and the restore
// below happens before it returns. The one thing that genuinely happens LATER — a row built
// inside a subscriber — never reads this: it carries its own owner (see `exoOnTeardown`).
let current: Array<() => void> | null = null;

// The restore is in a `finally` because a wiring function that throws would otherwise leave its
// scope standing, and every later subscription in the process would register into a dead render.
export function exoTeardownScope(fn: () => void): () => void {
    const scope: Array<() => void> = [];
    const above = current;
    current = scope;
    try {
        fn();
    } finally {
        current = above;
    }
    return () => {
        // Forward, then emptied — so a disposer called twice does not unsubscribe twice.
        for (let i = 0; i < scope.length; i++) scope[i]();
        scope.length = 0;
    };
}

// A CHILD beats the ambient scope whenever there is one — a child can leave while its render goes
// on, and its subscriptions must go with it — including for bindings made long after mount, when
// the ambient scope is `null`. That is why the owner is passed DOWN rather than read from here.
// With neither owner it THROWS: a subscription nothing can end is a leak that looks like it worked.
export function exoOnTeardown(child: TExoDomChild | null, off: () => void): void {
    if (child !== null) {
        // The sink is made here or nowhere — `createExoDomChildFactory` leaves it `null` because most
        // children subscribe to nothing — and it is built with its first element in the literal:
        // `[]` followed by a `push` grows where a one-element literal is sized for one.
        const disposers = child.disposers;
        if (disposers === null) child.disposers = [off];
        else disposers.push(off);
        return;
    }
    const scope = current;
    if (scope === null) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'createExoSchema(dom): a subscription was made with nothing to end it — wrap the ' +
                  'render in exoTeardownScope(...) and keep the disposer it returns'
                : 'EXO0048'
        );
    }
    scope.push(off);
}
