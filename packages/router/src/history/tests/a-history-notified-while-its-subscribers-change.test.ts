// @vitest-environment jsdom

// WHAT A HISTORY DOES WHEN ITS SUBSCRIBER SET IS MUTATED WHILE IT IS NOTIFYING — three cases,
// asserted against BOTH histories.
//
// `notify` walks the `Set` itself (`history.ts:100-102`) rather than a copy, and that choice is
// invisible until somebody subscribes or unsubscribes from inside a subscriber. Three shapes make
// it visible, and a copy would answer each of them the other way round:
//
//   1. a subscriber removed mid-walk is SKIPPED (a copy would call it after it asked to stop);
//   2. a subscriber added mid-walk is CALLED IN THE SAME ROUND (a copy would not reach it);
//   3. a subscriber that removes and re-adds ITSELF is VISITED TWICE, because `Set.delete` then
//      `Set.add` puts it back at the END of the walk (a copy cannot do this at all).
//
// THE TWO HISTORIES ARE ASSERTED SEPARATELY RATHER THAN ASSUMED TO AGREE. They share `notify` and
// `subscribe`, so they answer alike — but a browser history that grew its own dispatch (it is the
// one with a DOM event behind it) would diverge silently, and one `describe` per history names
// WHICH one changed.
import { describe, expect, it } from 'vitest';
import { createExoBrowserHistory } from '../createExoBrowserHistory';
import { createExoMemoryHistory } from '../createExoMemoryHistory';
import type { TExoHistory } from '../../types';

const HISTORIES: ReadonlyArray<{ name: string; create: () => TExoHistory }> = [
    { name: 'the memory history', create: () => createExoMemoryHistory('/') },
    {
        name: 'the browser history',
        create: () => {
            window.history.replaceState(null, '', '/');
            return createExoBrowserHistory({ window });
        },
    },
];

for (const { name, create } of HISTORIES) {
    describe(`${name}, notified while its subscribers change`, () => {
        // IF THIS FAILS: a component that tears down during a navigation is still called after it
        // unsubscribed, and reads state it has already released.
        it('skips a subscriber that an earlier one removed', () => {
            const history = create();
            const calls: string[] = [];
            let removeSecond: () => void = () => {};

            history.onChange(() => {
                calls.push('first');
                removeSecond();
            });
            removeSecond = history.onChange(() => calls.push('second'));

            history.push('/next');

            expect(calls).toEqual(['first']);
            history.dispose?.();
        });

        // IF THIS FAILS: a view that subscribes while reacting to a navigation misses that very
        // navigation and renders the previous URL until the next one happens.
        it('calls a subscriber added mid-walk in the SAME round', () => {
            const history = create();
            const calls: string[] = [];
            let added = false;

            history.onChange(() => {
                calls.push('first');
                if (!added) {
                    added = true;
                    history.onChange(() => calls.push('late'));
                }
            });

            history.push('/next');

            expect(calls).toEqual(['first', 'late']);
            history.dispose?.();
        });

        // IF THIS FAILS: a subscriber that re-registers itself (a re-mount caused by the URL) runs
        // its side effect twice for one navigation — two fetches, two page-view records.
        it('visits a subscriber TWICE when it removes and re-adds itself mid-walk', () => {
            const history = create();
            const calls: string[] = [];
            let remove: () => void = () => {};
            let readdAgain = true;

            const resubscribing = () => {
                calls.push('self');
                if (readdAgain) {
                    readdAgain = false;
                    remove();
                    remove = history.onChange(resubscribing);
                }
            };
            remove = history.onChange(resubscribing);

            history.push('/next');

            // Two calls for ONE push: `delete` + `add` re-appends behind the live cursor.
            expect(calls).toEqual(['self', 'self']);
            history.dispose?.();
        });
    });
}
