// The React participant of the shared todo app. Its argument, and the scene every participant
// shares: `apps/react.md`.
import { createElement as rc, useState, type ReactNode } from 'react';

import {
    startsOpen,
    startCount,
    nextCount,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    USER_IDX,
    userNameOf,
    startChars,
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
} from '../scene/spec';
import { noteCardOps, noteDeckOps } from '../../shared/card-driver';
import type { TSlot } from '../scene/slot';

const ReactCard = ({ i, chars }: { i: number; chars: readonly number[] }) => {
    const [open, setOpen] = useState(startsOpen(i));
    const [count, setCount] = useState(startCount(i));
    const tags = tagsOfCard(i).slice(0, count);
    const user = userNameOf(cardUserOf(i));
    // No `useMemo` and no `React.memo` anywhere in this row: a hook per value per card would buy a
    // skipped `slice(0, 14)` for a dependency array, which is a fine-grained framework's shape.
    const headline = headlineOf(titleOf(i), open);
    // Asserted to the two literals `@types/react` allows on `aria-expanded` (`Booleanish`), which is
    // exactly the pair `expandedOf` returns; the spec types it `string` because that is what an
    // attribute holds in every other participant.
    const expanded = expandedOf(open) as 'true' | 'false';
    const label = tagsLabel(count);
    // `useState`'s setters are STABLE for the life of the component, so the pair registered at the
    // first render stays valid; every later render finds the collection closed and pushes nothing.
    const tog = (): void => {
        setOpen((o) => !o);
    };
    const addTag = (): void => {
        setCount(nextCount);
    };
    noteCardOps(tog, addTag);
    // `ReactNode` and not `unknown`: spreading `unknown[]` into `createElement`'s children is what
    // this axis used to do, which left the whole child list unchecked.
    //
    // Each props object lists `className` FIRST and the dynamic attribute second, because React
    // writes them in the order the object enumerates and `markupOf` diffs `innerHTML`.
    const kids: ReactNode[] = [
        rc('h3', { key: 'h' }, headline),
        rc('span', { key: 'u', className: 'user' }, user),
        rc(
            'button',
            {
                key: 'tg',
                className: 'tog',
                'aria-expanded': expanded,
                onClick: () => setOpen((o) => !o),
            },
            'details'
        ),
        open ? rc('div', { key: 'd', className: 'details' }, 'details…') : null,
        rc(
            'div',
            { key: 'ts', className: 'tags' },
            // The key is the LABEL — the four labels of a card are distinct, and it is the same
            // identity every other participant reconciles this list by.
            tags.map((t) =>
                rc('span', { key: t.label, className: 'tag' }, tagTextOf(t.label, chars[t.user]))
            )
        ),
        rc('span', { key: 'c', className: 'count' }, label),
        rc('button', { key: 'at', className: 'addtag', onClick: () => setCount(nextCount) }, '+'),
    ];
    return rc('div', { className: 'card', 'data-i': String(i) }, ...kids);
};

const ReactDeck = ({ d, chars }: { d: number; chars: readonly number[] }) => {
    const [name, setName] = useState(startDeckName(d));
    const author = deckUserOf(d);
    const rename = (): void => {
        setName(nextDeckName);
    };
    noteDeckOps(rename);
    // No element of a deck carries a dynamic attribute, so `className` is the only prop whose order
    // the markup gate can see; it stays first for the reason it does on a card.
    const kids: ReactNode[] = [
        rc('h2', { key: 'h' }, deckNameOf(d, name)),
        rc('span', { key: 'a', className: 'author' }, userNameOf(author)),
        rc('time', { key: 'dt', className: 'date' }, dateTextOf(deckDateOf(d), chars[author])),
        rc('button', { key: 'rn', className: 'ren', onClick: rename }, 'rename'),
        rc(
            'div',
            { key: 'cs', className: 'cards' },
            cardsOfDeck(d).map((i) => rc(ReactCard, { key: i, i, chars }))
        ),
    ];
    return rc('div', { className: 'deck' }, ...kids);
};

/** What React's app hands out: its settings SETTER, and not a finished advance closure — a `round`
 *  counter declared in a component body would be reset eighty times a round, so the counter lives in
 *  the mount and what crosses the boundary is the one thing React guarantees is stable. */
export type TCharsWriter = (update: (prev: readonly number[]) => readonly number[]) => void;

export const ReactApp = ({ slot }: { slot: TSlot<TCharsWriter> }) => {
    const [decks] = useState(DECK_IDX);
    // The lazy initialiser runs once per MOUNT, which is what keeps two apps in a gate from sharing
    // five settings. An advance REPLACES the array, because that is what React state is.
    const [chars, setChars] = useState<readonly number[]>(() => USER_IDX.map(startChars));
    // Assigned in the render body on purpose: `useState`'s setter is stable for the life of the
    // component, and the mount needs it before it can hand `card-driver.ts` anything.
    slot.value = setChars;
    return rc(
        'div',
        { className: 'app' },
        decks.map((d) => rc(ReactDeck, { key: d, d, chars }))
    );
};
