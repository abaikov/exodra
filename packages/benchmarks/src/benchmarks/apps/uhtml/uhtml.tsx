// The 10-deck / 80-card todo app written in UHTML (5.0.9). Why it is shaped the way it is —
// components plus signals rather than a repeated `render()`, an array of zero or one for the
// details block, twenty shared clips and none for the deck dates — is argued in `uhtml.md` beside
// this file.
//
// EVERY TEMPLATE BELOW IS ONE UNBROKEN LINE OF MARKUP: uhtml only `.trim()`s the ends, so a newline
// plus indentation anywhere in a QUASI becomes a whitespace Text node and the byte gate compares
// `innerHTML`. A line may be broken inside a `${…}` and nowhere else. Prettier reflows embedded HTML
// and took four axes down doing it once, so `.prettierrc` carries
// `"embeddedLanguageFormatting": "off"` and each `prettier-ignore` below is the second lock.
import { computed, html, render, signal } from 'uhtml';
import {
    DECK_IDX,
    POOL,
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
} from '../scene/spec';
import { clickAll, type AppHandle } from '../../shared/todo-spec';
import { noteCardOps, noteDeckOps, noteRoundOp } from '../../shared/card-driver';

/** What uhtml's `signal()` returns. Its own typing is `(...args: any[]) => any`. */
export type TUhtmlSignal<T> = { value: T };

/** What uhtml's `computed()` returns — the same surface, read-only (`Computed extends Signal` in
 *  `@webreflection/alien-signals`, whose setter throws). Its own typing is the same `any` shape. */
export type TUhtmlComputed<T> = { readonly value: T };

const sig = signal as unknown as <T>(value: T) => TUhtmlSignal<T>;
const derive = computed as unknown as <T>(compute: () => T) => TUhtmlComputed<T>;

/** One card's reactive state and the two handlers that write it. */
interface TUhtmlCard {
    readonly i: number;
    readonly title: string;
    readonly user: string;
    /** THIS CARD'S FOUR TAG POSITIONS, each already resolved to THE COMPUTED that renders it —
     *  `clip[user][j]`, shared with the fifteen other cards holding the same (user, label) pair. */
    readonly tags: readonly TUhtmlComputed<string>[];
    readonly open: TUhtmlSignal<boolean>;
    /** The card's tag COUNT — the state. The tag array itself is derived in the component, because a
     *  second signal written by the same handler would make alien-signals flush TWICE per click. */
    readonly count: TUhtmlSignal<number>;
    readonly toggle: () => void;
    readonly addTag: () => void;
}

/** ONE DECK'S RECORD — the same shape as a card's, one level up. */
interface TUhtmlDeck {
    readonly d: number;
    readonly author: string;
    readonly when: Date;
    /** THE AUTHOR'S SETTING ITSELF — the very signal forty of that user's tags read two levels down.
     *  Reading it inside the component is what links the deck's effect to the app's fan-out. */
    readonly detail: TUhtmlSignal<number>;
    /** THE DECK'S OWN STATE: an index into `DECK_TITLES`, one signal, one write per `.ren` click. */
    readonly name: TUhtmlSignal<number>;
    readonly cards: readonly TUhtmlCard[];
    readonly rename: () => void;
}

/** The hidden state of the details block — an ARRAY hole of zero or one, because handing a plain
 *  hole a template result on one render and a string on the next is what `Hole.update()` guards with
 *  `errors.invalid_interpolation`. A module constant: `holed()` writes only into the array it is
 *  given, and a fresh `[]` per hide is an allocation no other participant makes. */
const NO_DETAILS: readonly unknown[] = [];

/** ONE CARD. The two handlers come from the card's state rather than being written inline: a fresh
 *  pair per render would allocate 160 closures per update round that no other participant allocates,
 *  and a stable identity is what lets uhtml's event part skip the listener swap. */
const Card = (props: { card: TUhtmlCard }): unknown => {
    const c = props.card;
    // prettier-ignore
    return html`<div class="card" data-i=${c.i}><h3>${
        headlineOf(c.title, c.open.value)
    }</h3><span class="user">${c.user}</span><button class="tog" aria-expanded=${
        expandedOf(c.open.value)
    } @click=${c.toggle}>details</button>${
        c.open.value ? [html`<div class="details">details…</div>`] : NO_DETAILS
    }<div class="tags">${
        c.tags.slice(0, c.count.value).map((t) => html`<span class="tag">${t.value}</span>`)
    }</div><span class="count">${
        tagsLabel(c.count.value)
    }</span><button class="addtag" @click=${c.addTag}>+</button></div>`;
};

/** ONE DECK — the third level, and the same kind of thing a card is: a component, whose effect runs
 *  this function, allocates one Hole and diffs it against the live one. */
const Deck = (props: { deck: TUhtmlDeck }): unknown => {
    const k = props.deck;
    // prettier-ignore
    return html`<div class="deck"><h2>${
        deckNameOf(k.d, k.name.value)
    }</h2><span class="author">${k.author}</span><time class="date">${
        dateTextOf(k.when, k.detail.value)
    }</time><button class="ren" @click=${k.rename}>rename</button><div class="cards">${
        k.cards.map((c) => html`<${Card} card=${c} />`)
    }</div></div>`;
};

export function mountUhtmlApp(container: HTMLElement): AppHandle {
    // BOTH ARE PER MOUNT AND NOT PER MODULE. Two apps side by side in a gate would share five
    // module-level signals, each round would advance one twice, both trees would agree, and every
    // byte diff in the suite would pass over a scene running at double speed.
    const chars = USER_IDX.map((u) => sig(startChars(u)));
    // `clip[u][j]` — user `u`'s setting applied to the label at tag position `j`. Twenty nodes for
    // two hundred tag positions; a write to one setting makes four of them dirty and the cards
    // reading them pull the four strings once each.
    const clip = USER_IDX.map((u) =>
        POOL.map((label) => derive(() => tagTextOf(label, chars[u].value)))
    );
    let round = 0;

    const buildCard = (i: number): TUhtmlCard => {
        const open = sig(startsOpen(i));
        const count = sig(startCount(i));
        const card: TUhtmlCard = {
            i,
            title: titleOf(i),
            user: userNameOf(cardUserOf(i)),
            tags: tagsOfCard(i).map((t, j) => clip[t.user][j]),
            open,
            count,
            // ONE SIGNAL WRITE PER CLICK, deliberately. A second signal written here would flush
            // alien-signals twice and re-render this card twice for one click.
            toggle: () => {
                open.value = !open.value;
            },
            addTag: () => {
                count.value = nextCount(count.value);
            },
        };
        // THE OTHER DOOR INTO THIS CARD — the SAME two closures the `@click` bindings carry, so
        // `app-update` can run this row's update round with no synthetic event.
        noteCardOps(card.toggle, card.addTag);
        return card;
    };

    const decks: TUhtmlDeck[] = DECK_IDX.map((d) => {
        const author = deckUserOf(d);
        const name = sig(startDeckName(d));
        // ONE SIGNAL WRITE PER CLICK, as in the card's two handlers and for the same reason.
        const rename = (): void => {
            name.value = nextDeckName(name.value);
        };
        // THE OTHER DOOR INTO THIS DECK — the SAME closure the `@click` binding carries, declared
        // before the cards so that ten renames arrive in document order.
        noteDeckOps(rename);
        return {
            d,
            author: userNameOf(author),
            when: deckDateOf(d),
            // THE AUTHOR'S CELL, resolved once — read at BOTH depths: here, and by the forty tags of
            // that user scattered through the cards.
            detail: chars[author],
            name,
            cards: cardsOfDeck(d).map(buildCard),
            rename,
        };
    });

    // ONE render call for the life of the app: a second `render()` on the same container stores a
    // hole whose values are still raw, so a third call would update against them (uhtml 5.0.9,
    // `src/dom/index.js`). Everything after this happens through the components' own effects.
    render(
        container,
        () => html`<div class="app">${decks.map((k) => html`<${Deck} deck=${k} />`)}</div>`
    );

    /** THE ROUND'S ONE APP-LEVEL OPERATION — one user's setting advanced. No button, no card. ONE
     *  SIGNAL WRITE, like the three handlers above: alien-signals flushes per write when no `batch()`
     *  is open, so a second write here would run the fan-out twice. */
    const advance = (): void => {
        const s = chars[roundUserOf(round)];
        round++;
        s.value = nextChars(s.value);
    };
    // DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls below.
    noteRoundOp(advance);

    return {
        // NOTHING TO FLUSH: alien-signals propagates and flushes inside the write, so all four steps
        // have committed to the DOM by the time the last call returns.
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advance();
        },
        // Nothing to unwind: the effects are subscribed to signals this mount owns and nothing else
        // references, so the whole graph is garbage together once the caller drops the container.
        teardown: () => {
            decks.length = 0;
        },
    };
}
