// The 10-deck / 80-card todo app in Sinuous (0.32.1) — a template plus FINE-GRAINED REACTIVITY,
// built element by element with no compiler. What that buys, what it costs and what it refuses:
// `apps/sinuous.md`.
import { h } from 'sinuous';
import { observable, root } from 'sinuous/observable';
import { map } from 'sinuous/map';
import {
    DECK_IDX,
    USER_IDX,
    startsOpen,
    startCount,
    nextCount,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    userNameOf,
    cardUserOf,
    startChars,
    nextChars,
    roundUserOf,
    tagTextOf,
    tagsOfCard,
    cardsOfDeck,
    deckUserOf,
    deckDateOf,
    deckNameOf,
    startDeckName,
    nextDeckName,
    dateTextOf,
    type TTag,
} from '../scene/spec';
import { clickAll, type AppHandle } from '../../shared/todo-spec';
import { noteCardOps, noteDeckOps, noteRoundOp } from '../../shared/card-driver';

/** The shipped `observable.d.ts` omits the disposer `root()` actually passes to `fn`. */
const withRoot = root as unknown as <T>(fn: (dispose: () => void) => T) => T;

/** What Sinuous's `observable()` returns: read with no argument, write with one. */
type TSinuousObservable<T> = {
    (): T;
    (next: T): T;
};

const o = observable as unknown as <T>(value: T) => TSinuousObservable<T>;

// NO EXPLICIT `computed` ANYWHERE, and that is not an omission: a function handed to `h` is already
// one — a function child reaches `api.insert` and a function prop `api.property`, both of which
// call `api.subscribe`, which is `computed(observer)` plus a disposer. Wrapping first makes two.
//
// THE ATTRIBUTE ORDER IS THE REFERENCE'S: `property()` writes props in `for (name in value)` order,
// so `class` must be spelled before `data-i` and before `aria-expanded`.
//
// `pool` IS ALLOCATED ONCE: `map()` reconciles by ITEM IDENTITY, so four fresh objects per
// notification would hand it rows it has never seen and rebuild a list that did not change.
const card = (i: number, chars: readonly TSinuousObservable<number>[]): HTMLElement => {
    const title = titleOf(i);
    const open = o(startsOpen(i));
    const count = o(startCount(i));
    const pool: readonly TTag[] = tagsOfCard(i);

    // NAMED, not inline: the SAME pair reaches the two `onclick` props AND `card-driver.ts`, the
    // door `app-update` drives this row through with no synthetic event.
    const tog = (): void => {
        open(!open());
    };
    const addTag = (): void => {
        count(nextCount(count()));
    };
    noteCardOps(tog, addTag);

    return h(
        'div',
        { class: 'card', 'data-i': String(i) },
        h('h3', null, () => headlineOf(title, open())),
        h('span', { class: 'user' }, userNameOf(cardUserOf(i))),
        h(
            'button',
            {
                class: 'tog',
                'aria-expanded': (): string => expandedOf(open()),
                onclick: tog,
            },
            'details'
        ),
        // Built fresh on every show, never parked — as `<Show>`, React's conditional and `nothing`.
        () => (open() ? h('div', { class: 'details' }, 'details…') : null),
        // A TAG'S TEXT IS A FUNCTION CHILD — one computation per mounted tag, over a cell seventy-
        // nine other cards also read. It recomputes per tag: forty `slice`s for four distinct
        // strings, and a shared table of twenty `computed`s is UNSAFE here because Sinuous's
        // `computed` is tree-owned — see `apps/sinuous.md`, THE FIVE USERS.
        h(
            'div',
            { class: 'tags' },
            map(
                () => pool.slice(0, count()),
                (t: TTag) => h('span', { class: 'tag' }, () => tagTextOf(t.label, chars[t.user]()))
            )
        ),
        // A SIBLING of `.tags`, never a child of it.
        h('span', { class: 'count' }, () => tagsLabel(count())),
        h(
            'button',
            {
                class: 'addtag',
                onclick: addTag,
            },
            '+'
        )
    ) as HTMLElement;
};

const deck = (d: number, chars: readonly TSinuousObservable<number>[]): HTMLElement => {
    const author = deckUserOf(d);
    const when = deckDateOf(d);
    const name = o(startDeckName(d));

    // NAMED and declared BEFORE the cards are built, so ten renames arrive in document order.
    const rename = (): void => {
        name(nextDeckName(name()));
    };
    noteDeckOps(rename);

    return h(
        'div',
        { class: 'deck' },
        h('h2', null, () => deckNameOf(d, name())),
        h('span', { class: 'author' }, userNameOf(author)),
        h('time', { class: 'date' }, () => dateTextOf(when, chars[author]())),
        h('button', { class: 'ren', onclick: rename }, 'rename'),
        // A PLAIN ARRAY and not a `map()`: a deck's eight cards are decided at the mount and never
        // change. The indices are GLOBAL (`8d … 8d+7`).
        h(
            'div',
            { class: 'cards' },
            cardsOfDeck(d).map((i) => card(i, chars))
        )
    ) as HTMLElement;
};

export function mountSinuousApp(container: HTMLElement): AppHandle {
    let dispose: () => void = () => {};
    /** Taken out of the root: `flip` and `card-driver.ts` must be handed THE SAME closure. */
    let advance: () => void = () => {};
    // ONE root for the whole app, so `teardown` ends all 620 subscriptions (five per card, one per
    // mounted tag, two per deck). Without it they would die only with the observables — fine for a
    // benchmark that drops everything, wrong for a participant whose retained heap is measured.
    //
    // THE FIVE SETTINGS ARE CREATED INSIDE IT, per mounted app, never at module scope: two apps in
    // one gate would share them, each round would advance one twice, both trees would agree, and
    // every byte diff in the suite would pass over a scene running at double speed.
    const app = withRoot((endRoot) => {
        dispose = endRoot;
        const chars = USER_IDX.map((u) => o(startChars(u)));
        let round = 0;
        advance = (): void => {
            const cell = chars[roundUserOf(round)];
            round++;
            // Observers run inside the call — forty-two Text nodes at two depths, written by now.
            cell(nextChars(cell()));
        };
        return h(
            'div',
            { class: 'app' },
            DECK_IDX.map((d) => deck(d, chars))
        ) as HTMLElement;
    });
    container.appendChild(app);
    noteRoundOp(advance);

    return {
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advance();
        },
        // Subscriptions only — the nodes die with the container, and a listener with its node.
        teardown: () => {
            dispose();
        },
    };
}
