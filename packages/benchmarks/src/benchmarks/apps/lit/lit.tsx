// The 10-deck / 80-card todo app written in LIT (lit-html 3). Why it is shaped the way it is —
// four kinds of render root, the three derived values, the hand-written consumer set, the dirty
// flag that stands in for `requestUpdate` — is argued in `lit.md` beside this file.
//
// EVERY TEMPLATE BELOW IS ONE UNBROKEN LINE OF MARKUP, with no whitespace between two tags: a
// newline plus indentation anywhere in a QUASI becomes a whitespace Text node and the byte gate
// compares `innerHTML`. A line may be broken inside a `${…}` and nowhere else. Prettier reflows
// embedded HTML and took four axes down doing it once, so `.prettierrc` carries
// `"embeddedLanguageFormatting": "off"` and each `prettier-ignore` below is the second lock.
import { html, nothing, render, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
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

/** One card's state. */
interface TLitCard {
    readonly i: number;
    /** The card's `<div class="card">` — this card's lit render root. */
    readonly node: HTMLElement;
    readonly title: string;
    readonly user: string;
    /** THE APP'S FIVE SETTINGS — the same array object in all eighty cards, not a copy. */
    readonly chars: readonly number[];
    readonly pool: readonly TTag[];
    open: boolean;
    count: number;
    tags: readonly TTag[];
    /** Set by a handler, consumed by the flush — LitElement's `requestUpdate` in one boolean. */
    dirty: boolean;
    /** Built ONCE per card: a fresh pair per render would allocate 160 closures per update round
     *  that no other participant allocates. Lit's `EventPart` itself would not notice. */
    readonly toggle: () => void;
    readonly addTag: () => void;
}

/** ONE DECK'S STATE — the third level, and this app's second kind of render root. */
interface TLitDeck {
    readonly d: number;
    /** The deck's `<div class="deck">` — this deck's lit render root. */
    readonly node: HTMLElement;
    readonly user: number;
    readonly author: string;
    readonly when: Date;
    /** THE APP'S FIVE SETTINGS — the same array object the eighty cards hold, not a copy. */
    readonly chars: readonly number[];
    /** An index into `DECK_TITLES`. The whole of this level's state, and what `.ren` advances. */
    name: number;
    dirty: boolean;
    readonly rename: () => void;
}

/** ONE ENTRY OF THE HAND-WRITTEN CONSUMER SET — a card, and WHICH of its four positions belongs to
 *  the user this entry is filed under. */
interface TLitSub {
    readonly card: TLitCard;
    /** The position's index in its card's list, 0…3. On screen exactly while `j < card.count`. */
    readonly j: number;
}

/** The shell: the app div and 10 EMPTY deck divs. */
// prettier-ignore
const shell = (): TemplateResult =>
    html`<div class="app">${DECK_IDX.map(() => html`<div class="deck"></div>`)}</div>`;

/** ONE deck's CONTENTS — rendered into the deck div, which is this template's render root. Its last
 *  element is an EMPTY `<div class="cards">`: the eight cards are a render root of their own, so a
 *  rename's reach is the four parts here. */
// prettier-ignore
const deckBody = (dk: TLitDeck): TemplateResult =>
    html`<h2>${deckNameOf(dk.d, dk.name)}</h2><span class="author">${
        dk.author
    }</span><time class="date">${
        dateTextOf(dk.when, dk.chars[dk.user])
    }</time><button class="ren" @click=${dk.rename}>rename</button><div class="cards"></div>`;

/** ONE deck's EIGHT EMPTY CARD DIVS — rendered into that deck's `.cards` div. `data-i` is bound
 *  here because it is an attribute OF the card element and therefore outside the card's own root. */
// prettier-ignore
const cardsShell = (d: number): TemplateResult =>
    html`${cardsOfDeck(d).map((i) => html`<div class="card" data-i=${i}></div>`)}`;

/** ONE card's CONTENTS — rendered into the card div, which is this template's render root. The
 *  details block commits `nothing` and not `''`, so the part holds an empty RANGE rather than an
 *  empty text node. */
// prettier-ignore
const cardBody = (c: TLitCard): TemplateResult =>
    html`<h3>${headlineOf(c.title, c.open)}</h3><span class="user">${
        c.user
    }</span><button class="tog" aria-expanded=${
        expandedOf(c.open)
    } @click=${c.toggle}>details</button>${
        c.open ? html`<div class="details">details…</div>` : nothing
    }<div class="tags">${
        repeat(c.tags, (t) => t.label, (t) => html`<span class="tag">${
            tagTextOf(t.label, c.chars[t.user])
        }</span>`)
    }</div><span class="count">${tagsLabel(c.count)}</span><button class="addtag" @click=${
        c.addTag
    }>+</button>`;

export function mountLitApp(container: HTMLElement): AppHandle {
    render(shell(), container);
    // `render()` puts a comment marker in front of what it renders, so the app div is the first
    // ELEMENT child, and the 10 deck divs are the app div's element children in order.
    const app = container.firstElementChild as HTMLElement;
    const deckNodes = app.children;

    // ALL THREE ARE PER MOUNT AND NOT PER MODULE. Two apps standing side by side in a gate would
    // share module-level settings, each round would advance one twice, both trees would still agree,
    // and every byte diff in the suite would pass over a scene running at double speed.
    const chars: number[] = USER_IDX.map(startChars);
    const subs: TLitSub[][] = USER_IDX.map((): TLitSub[] => []);
    const deckSubs: TLitDeck[][] = USER_IDX.map((): TLitDeck[] => []);
    let round = 0;

    const decks: TLitDeck[] = [];
    const cards: TLitCard[] = [];
    for (let n = 0; n < DECK_IDX.length; n++) {
        const d = DECK_IDX[n];
        const author = deckUserOf(d);
        const dk: TLitDeck = {
            d,
            node: deckNodes[n] as HTMLElement,
            user: author,
            author: userNameOf(author),
            when: deckDateOf(d),
            chars,
            name: startDeckName(d),
            dirty: false,
            rename: () => {
                dk.name = nextDeckName(dk.name);
                dk.dirty = true;
            },
        };
        decks.push(dk);
        // THIS DECK REGISTERS AS A CONSUMER OF ITS AUTHOR'S SETTING — `lit-html` has nothing to
        // subscribe with and `@lit/context` needs the custom element the markup gate forbids.
        deckSubs[author].push(dk);
        // THE OTHER DOOR INTO THIS DECK — the SAME closure the `@click` binding carries, declared in
        // document order so a gate can drive rename `k` and require deck `k` alone to move.
        noteDeckOps(dk.rename);
        render(deckBody(dk), dk.node);

        // THE DECK'S `<div class="cards">` — the LAST element of `deckBody`, and therefore the last
        // ELEMENT child of the deck div whatever marker comments lit left between them.
        const cardsNode = dk.node.lastElementChild as HTMLElement;
        render(cardsShell(d), cardsNode);
        const cardNodes = cardsNode.children;

        const own = cardsOfDeck(d);
        for (let k = 0; k < own.length; k++) {
            // THE GLOBAL INDEX, straight from `cardsOfDeck(d)`. Every per-card formula below takes
            // it, so a card in deck 9 is card 79 and not card 7.
            const i = own[k];
            const count = startCount(i);
            const pool = tagsOfCard(i);
            const c: TLitCard = {
                i,
                node: cardNodes[k] as HTMLElement,
                title: titleOf(i),
                user: userNameOf(cardUserOf(i)),
                chars,
                pool,
                open: startsOpen(i),
                count,
                tags: pool.slice(0, count),
                dirty: false,
                toggle: () => {
                    c.open = !c.open;
                    c.dirty = true;
                },
                addTag: () => {
                    c.count = nextCount(c.count);
                    c.tags = c.pool.slice(0, c.count);
                    c.dirty = true;
                },
            };
            cards.push(c);
            // THIS CARD REGISTERS AS A CONSUMER OF ITS FOUR TAGS' USERS — the provider's subscriber
            // list written by hand, for the reason the deck's entry above gives.
            for (let j = 0; j < pool.length; j++) subs[pool[j].user].push({ card: c, j });
            // THE OTHER DOOR INTO THIS CARD — the SAME two closures the `@click` bindings above
            // carry, declared so `app-update` can run this row's round with no synthetic event.
            noteCardOps(c.toggle, c.addTag);
            render(cardBody(c), c.node);
        }
    }

    /** LitElement's batched update, by hand: one render per ROOT that changed, per round. */
    const flush = (): void => {
        for (let n = 0; n < decks.length; n++) {
            const dk = decks[n];
            if (dk.dirty) {
                dk.dirty = false;
                render(deckBody(dk), dk.node);
            }
        }
        for (let k = 0; k < cards.length; k++) {
            const c = cards[k];
            if (c.dirty) {
                c.dirty = false;
                render(cardBody(c), c.node);
            }
        }
    };

    /** THE ROUND'S ONE APP-LEVEL OPERATION — one user's setting advanced. No button, no card. It
     *  MARKS AND DOES NOT FLUSH, as the two card handlers and the deck's rename do. */
    const advance = (): void => {
        const u = roundUserOf(round);
        round++;
        chars[u] = nextChars(chars[u]);
        const list = subs[u];
        for (let n = 0; n < list.length; n++) {
            const s = list[n];
            // A POSITION THAT IS NOT ON SCREEN CHANGES NOTHING — the card renders its tags from
            // `chars` when it renders them, so a position that re-enters the list later is clipped
            // at whatever the setting is then.
            if (s.j < s.card.count) s.card.dirty = true;
        }
        // AND THE COARSE HALF OF THE FAN-OUT: the two decks this user authored, whose dates read the
        // same number as a PRECISION. No `j` to test — a deck's date is on screen at all times.
        const authored = deckSubs[u];
        for (let n = 0; n < authored.length; n++) authored[n].dirty = true;
    };
    // DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls below.
    noteRoundOp(advance);

    return {
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advance();
            flush();
        },
        // THIS PARTICIPANT'S OWN COMMIT — the very `flush` its `flip` runs, published so that
        // `app-update` can drive the handlers directly and still stop the clock only after lit has
        // rendered every dirty deck and every dirty card. Read by that axis and by nothing else.
        commit: (run: () => void) => {
            run();
            flush();
        },
        // Nothing to dispose: lit holds no subscriptions, its parts hang off the nodes and its
        // listeners are owned by the elements they are on.
        teardown: () => {
            cards.length = 0;
            decks.length = 0;
        },
    };
}
