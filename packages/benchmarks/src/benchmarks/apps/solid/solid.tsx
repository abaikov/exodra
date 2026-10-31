// The Solid participant of the shared todo app. Its argument, its scene and the field's caveats:
// `apps/solid.md`.
import { createSignal, createMemo, For, Show } from 'solid-js';

import {
    POOL,
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
    nextChars,
    cardUserOf,
    roundUserOf,
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

export const SolidApp = (props: { readonly slot: TSlot<() => void> }) => {
    const [decks] = createSignal(DECK_IDX);
    const chars = USER_IDX.map((u) => createSignal(startChars(u)));
    // The one `createMemo` in this row, and the one place Solid's rule for reaching for a memo
    // ("expensive, or read from several places") holds: twenty memos serve two hundred tags. Safe to
    // share because a Solid memo is a graph node with a subscriber set —
    // `apps/sinuous/sinuous.md` records
    // the opposite finding about its own tree-OWNED `computed`.
    const clip = USER_IDX.map((u) =>
        POOL.map((label) => createMemo(() => tagTextOf(label, chars[u][0]())))
    );
    let round = 0;
    props.slot.value = (): void => {
        const [get, set] = chars[roundUserOf(round)];
        round++;
        set(nextChars(get()));
    };
    const card = (i: number) => {
        const [open, setOpen] = createSignal(startsOpen(i));
        const [count, setCount] = createSignal(startCount(i));
        const title = titleOf(i);
        // Read once so the markup holds an IDENTIFIER, which Solid's compiler leaves static;
        // `{userNameOf(cardUserOf(i))}` would be a CALL and buy an effect per card for a constant.
        const user = userNameOf(cardUserOf(i));
        const headline = () => headlineOf(title, open());
        // Asserted to the two literals Solid's JSX types accept on `aria-expanded`, which is exactly
        // the pair `expandedOf` returns; the spec types it `string` because an attribute is a string
        // in every other participant.
        const expanded = () => expandedOf(open()) as 'true' | 'false';
        const label = () => tagsLabel(count());
        // `<For>` reconciles by ITEM IDENTITY and a memo is stable for the life of the app, so the
        // item IS the clip: one array of four references per card and nothing per update.
        const pool = tagsOfCard(i).map((t, j) => clip[t.user][j]);
        const tags = () => pool.slice(0, count());
        // Named, not inline, so the SAME pair reaches both `onClick` and `card-driver.ts`; Solid
        // allocates the same two closures either way.
        const tog = (): void => {
            setOpen((o) => !o);
        };
        const addTag = (): void => {
            setCount(nextCount);
        };
        noteCardOps(tog, addTag);
        return (
            <div class="card" data-i={i}>
                <h3>{headline()}</h3>
                <span class="user">{user}</span>
                <button class="tog" aria-expanded={expanded()} onClick={tog}>
                    details
                </button>
                <Show when={open()}>
                    <div class="details">details…</div>
                </Show>
                <div class="tags">
                    <For each={tags()}>{(t) => <span class="tag">{t()}</span>}</For>
                </div>
                <span class="count">{label()}</span>
                <button class="addtag" onClick={addTag}>
                    +
                </button>
            </div>
        );
    };
    // A `<For>` callback and not a `<Deck>` component: `mapArray` calls its mapper inside a
    // `createRoot` per row, so the signal opened here is owned by that row and disposed with it.
    const deck = (d: number) => {
        const [name, setName] = createSignal(startDeckName(d));
        const author = deckUserOf(d);
        const authorName = userNameOf(author);
        const when = deckDateOf(d);
        const heading = () => deckNameOf(d, name());
        // A derived signal and not a memo: one reader, and a memo would recompute `dateTextOf` just
        // as often as this does.
        const date = () => dateTextOf(when, chars[author][0]());
        const rename = (): void => {
            setName(nextDeckName);
        };
        noteDeckOps(rename);
        // An identifier, so the compiler leaves `each` static instead of memoising a call.
        const cards = cardsOfDeck(d);
        return (
            <div class="deck">
                <h2>{heading()}</h2>
                <span class="author">{authorName}</span>
                <time class="date">{date()}</time>
                <button class="ren" onClick={rename}>
                    rename
                </button>
                <div class="cards">
                    <For each={cards}>{card}</For>
                </div>
            </div>
        );
    };
    return (
        <div class="app">
            <For each={decks()}>{deck}</For>
        </div>
    );
};
