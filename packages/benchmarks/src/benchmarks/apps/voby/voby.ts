// The voby participant of the shared todo app. Its argument, and the scene every participant
// shares: `apps/voby.md`.
import {
    startsOpen,
    startCount,
    nextCount,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    userNameOf,
    cardUserOf,
    tagTextOf,
    tagsOfCard,
    DECK_IDX,
    cardsOfDeck,
    deckNameOf,
    startDeckName,
    nextDeckName,
    deckUserOf,
    deckDateOf,
    dateTextOf,
    type TTag,
} from '../scene/spec';
import { noteCardOps, noteDeckOps } from '../../shared/card-driver';

/** voby's observable: read with no argument, write with one. The module is typed by hand where it is
 *  imported, so the per-cell shape is spelled out here rather than inferred. */
export type TVobyObservable<T> = {
    (): T;
    (next: T): void;
};

/** The app, its decks and its cards, over the three pieces of voby the mount imported dynamically.
 *  Called ONCE where those are in scope, so the three function objects below are allocated exactly
 *  as often as they were when they stood inside that import block. */
export const createVobyApp = (
    $: (v: unknown) => { (): unknown; (v: unknown): void },
    vh: (...a: unknown[]) => unknown,
    vFor: unknown
) => {
    const vobyCard = (i: number, chars: readonly TVobyObservable<number>[]) => {
        const open = $(startsOpen(i)) as { (): boolean; (v: boolean): void };
        const count = $(startCount(i)) as { (): number; (v: number): void };
        const title = titleOf(i);
        const user = userNameOf(cardUserOf(i));
        // Allocated ONCE: `<For values>` reconciles by item identity, so the array it is handed has
        // to be a prefix of the same four objects every time.
        const pool: readonly TTag[] = tagsOfCard(i);
        // Named, not inline, so the SAME pair reaches both `onClick` and `card-driver.ts`; voby
        // allocates the same two closures either way.
        const tog = (): void => {
            open(!open());
        };
        const addTag = (): void => {
            count(nextCount(count()));
        };
        noteCardOps(tog, addTag);
        return vh(
            'div',
            { class: 'card', 'data-i': String(i) },
            // A function in the position the value goes IS voby's derived value: "an attribute or a
            // child accepts the plain value, an observable to it, or a function to it, and a
            // function makes that position fine-grained" (voby's readme). A plain string where
            // nothing can move, because a thunk is what buys a position the right to update.
            vh('h3', () => headlineOf(title, open())),
            vh('span', { class: 'user' }, user),
            // `class` before `aria-expanded`: voby's `setProps` walks the object in key order and
            // the gate diffs `innerHTML`.
            vh(
                'button',
                {
                    class: 'tog',
                    'aria-expanded': () => expandedOf(open()),
                    onClick: tog,
                },
                'details'
            ),
            () => (open() ? vh('div', { class: 'details' }, 'details…') : null),
            vh(
                'div',
                { class: 'tags' },
                vh(vFor, { values: () => pool.slice(0, count()) }, (t: TTag) =>
                    vh('span', { class: 'tag' }, () => tagTextOf(t.label, chars[t.user]()))
                )
            ),
            vh('span', { class: 'count' }, () => tagsLabel(count())),
            vh('button', { class: 'addtag', onClick: addTag }, '+')
        );
    };

    /**
     * A deck's name is an OBSERVABLE because it cannot be anything else: `createVobyApp`'s product is
     * called BEFORE `render()` opens a root and `oby` starts with `OWNER = SUPER_OWNER`
     * (`oby/dist/context.js`), so an owned node built here would outlive the mount's `teardown`.
     * That same wall is why this row has no twenty-memo clip table where Solid's has one.
     */
    const vobyDeck = (d: number, chars: readonly TVobyObservable<number>[]) => {
        const name = $(startDeckName(d)) as TVobyObservable<number>;
        const author = deckUserOf(d);
        const when = deckDateOf(d);
        const rename = (): void => {
            name(nextDeckName(name()));
        };
        noteDeckOps(rename);
        return vh(
            'div',
            { class: 'deck' },
            vh('h2', () => deckNameOf(d, name())),
            vh('span', { class: 'author' }, userNameOf(author)),
            vh('time', { class: 'date' }, () => dateTextOf(when, chars[author]())),
            vh('button', { class: 'ren', onClick: rename }, 'rename'),
            // A plain array of built elements and not a `<For>`: a FIXED list, because nothing in
            // the round adds, removes or moves a card.
            vh(
                'div',
                { class: 'cards' },
                cardsOfDeck(d).map((i) => vobyCard(i, chars))
            )
        );
    };

    // The five settings are made in the mount and not in here: `createElement` builds its children
    // eagerly at the call site, so every line of these three functions runs before `render()` opens
    // a root — and an observable, unlike a memo, has no owner to lose.
    const vobyApp = (chars: readonly TVobyObservable<number>[]) =>
        vh(
            'div',
            { class: 'app' },
            DECK_IDX.map((d) => vobyDeck(d, chars))
        );

    return vobyApp;
};
