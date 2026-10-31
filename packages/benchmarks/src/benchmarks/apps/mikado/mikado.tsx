// The 80-card todo app in MIKADO (0.8.400), written directly. Why every shape here is the shape it is —
// the nesting wall, the derived values, the five users, the vpath hazard — is in `apps/mikado.md`.
import Mikado from 'mikado';
import {
    DECK_IDX,
    USER_IDX,
    cardsOfDeck,
    startsOpen,
    startCount,
    nextCount,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    userNameOf,
    cardUserOf,
    deckUserOf,
    deckDateOf,
    dateTextOf,
    deckNameOf,
    startDeckName,
    nextDeckName,
    startChars,
    nextChars,
    roundUserOf,
    tagTextOf,
    tagsOfCard,
} from '../scene/spec';
import { clickAll, type AppHandle } from '../../shared/todo-spec';
import { collectingCardOps, noteCardOps, noteDeckOps, noteRoundOp } from '../../shared/card-driver';

type TMikadoTemplate = ReturnType<typeof Mikado.compile>;

/**
 * NO `click="ren"`: Mikado's routing leaves the route name in the DOM as a literal attribute and
 * the markup gate diffs the bytes, so the `.ren` click goes through one delegated listener instead.
 * `<div class="cards">` IS EMPTY: an inline `foreach` renders into the FACTORY's copy of the div
 * and the deck is then cloned, so the include's view would empty and rebuild a div it has never
 * seen.
 */
const DECK: TMikadoTemplate = Mikado.compile(
    '<div class="deck">' +
        '<h2>{{ data.name }}</h2>' +
        '<span class="author">{{ data.author }}</span>' +
        '<time class="date">{{ data.date }}</time>' +
        '<button class="ren">rename</button>' +
        '<div class="cards"></div>' +
        '</div>'
);

/**
 * `aria-expanded` and `data-i` are DYNAMIC attributes: `factory.js` keeps them off the factory node
 * and writes them with `setAttribute` after the static `class`, which is the order the contract
 * states. The `<span class="count">` is a SIBLING of the `.tags` div and not a child — the shared
 * TAG view OWNS its root's children and would take the count span for a stray tag and remove it.
 */
const CARD: TMikadoTemplate = Mikado.compile(
    '<div class="card" data-i="{{ data.i }}">' +
        '<h3>{{ data.headline }}</h3>' +
        '<span class="user">{{ data.name }}</span>' +
        '<button class="tog" aria-expanded="{{ data.expanded }}">details</button>' +
        '<div class="tags"></div>' +
        '<span class="count">{{ data.label }}</span>' +
        '<button class="addtag">+</button>' +
        '</div>'
);

/**
 * `key="data.label"` is Mikado's KEYED recycle mode; the attribute is consumed by the compiler and
 * NOT rendered. The key is the WHOLE label and the text is the CLIPPED one on purpose: keying by
 * the rendered text would make every setting change look like four new tags.
 */
const TAG: TMikadoTemplate = Mikado.compile(
    '<span class="tag" key="data.label">{{ data.text }}</span>'
);

const DETAILS: TMikadoTemplate = Mikado.compile('<div class="details">details…</div>');

/** Mikado has no conditional that REMOVES an element (`if=` clears children, leaving the host), so
 *  the block is an orphan component this app inserts and removes itself. */
const DETAILS_VIEW = new Mikado(DETAILS);
/** `create(data)` wants a data argument; this template reads none, so one shared object serves. */
const NO_DATA = {};

/** A tag is an object because Mikado's keyed mode reads the key off the item (`data.label`). */
interface TMikadoTag {
    readonly label: string;
    readonly user: number;
    /** `tagTextOf(label, chars[user])`, written by the round whether or not the position is on
     *  screen — one that re-enters the list is rendered from the store as it stands then. */
    text: string;
}

/** One entry of the hand-written fan-out table: a card, WHICH of its four positions belongs to the
 *  user this entry is filed under, and that position's store object. */
interface TMikadoHot {
    readonly st: TMikadoCard;
    /** The position's index in its card's list, 0…3. On screen exactly while `j < st.count`. */
    readonly j: number;
    readonly tag: TMikadoTag;
}

/** What the CARD template reads — five fields, one per dynamic position. */
interface TMikadoCardData {
    readonly i: number;
    headline: string;
    readonly name: string;
    /** `expandedOf(open)` — a string, because that is what an attribute holds. */
    expanded: string;
    label: string;
}

interface TMikadoCard {
    readonly i: number;
    /** This card's position IN ITS DECK'S EIGHT, 0…7 — IT IS NOT `i`: the shared CARD view sits on
     *  one deck's `.cards` div at a time and eight is as far as an index into it goes. */
    readonly index: number;
    /** The `.cards` div of this card's deck — what `cards.mount()` is handed before any `update()`
     *  of this card, since one view serves all ten decks. */
    readonly cardsDiv: HTMLElement;
    readonly data: TMikadoCardData;
    /** The card's FULL title — the input `headlineOf` clips. */
    readonly title: string;
    readonly node: HTMLElement;
    /** The TAG view's root while this card updates, and the anchor the details block precedes. */
    readonly tagsDiv: HTMLElement;
    /** Stable per (card, tag) so `slice` keeps the same objects, exactly as the reference does. */
    readonly pool: readonly TMikadoTag[];
    count: number;
    /** The mounted details element, or null. THIS IS ALSO `open`: its presence IS the state. */
    details: HTMLElement | null;
}

/** What the DECK template reads — three fields, one per dynamic position. */
interface TMikadoDeckData {
    name: string;
    readonly author: string;
    date: string;
}

interface TMikadoDeck {
    /** The deck's index, AND its position in the `decks` view — the shell renders `DECK_IDX` in
     *  order into a view it never re-mounts, so `update(d, data)` takes the O(1) branch. */
    readonly d: number;
    readonly data: TMikadoDeckData;
    /** This deck's creation date — the input `dateTextOf` formats. */
    readonly when: Date;
    /** WHICH of the four `DECK_TITLES` this deck is on — the whole of the deck's own state. */
    name: number;
}

/** Cards carry their own state so the ONE delegated listener can find it from the event target. */
type TMikadoCardNode = HTMLElement & { _st?: TMikadoCard };
/** And decks carry theirs: the climb from `.ren` lands on a deck exactly as the climb from `.tog`
 *  lands on a card, so what tells the two apart is which of the two fields the owner has. */
type TMikadoDeckNode = HTMLElement & { _dk?: TMikadoDeck };

export function mountMikadoApp(container: HTMLElement): AppHandle {
    const app = document.createElement('div');
    app.className = 'app';
    container.appendChild(app);

    // A view owns its factory, so a view is PER MOUNT: sharing one across mounted apps would carry
    // a warm component pool from the previous sample into the next.
    const decks = new Mikado(DECK, { mount: app, cache: true });
    // No `mount` option: this view is pointed at each deck's `.cards` div in turn. `cache: true`
    // because an `update()` is WHOLE-INSTANCE — with it, only the positions that moved are written.
    const cards = new Mikado(CARD, { cache: true });
    const tags = new Mikado(TAG, { pool: true, cache: true });

    // PER MOUNT AND NOT PER MODULE: two apps in a gate would share module-level settings, each
    // round would advance one twice, and both trees would still agree.
    const chars: number[] = USER_IDX.map(startChars);
    const hot: TMikadoHot[][] = USER_IDX.map((): TMikadoHot[] => []);
    const hotDecks: TMikadoDeck[][] = USER_IDX.map((): TMikadoDeck[] => []);
    let round = 0;

    // SPLIT OUT OF THE LISTENER, which is not cosmetic here: Mikado's click path is ONE delegated
    // listener that reads `e.target`, so there is no per-card closure for `card-driver.ts` to
    // borrow. The target resolution stays in the listener, so the direct drive does not pay it.
    const renameOf = (dk: TMikadoDeck): void => {
        dk.name = nextDeckName(dk.name);
        dk.data.name = deckNameOf(dk.d, dk.name);
        decks.update(dk.d, dk.data);
    };
    const togOf = (st: TMikadoCard): void => {
        if (st.details) {
            st.details.remove();
            st.details = null;
        } else {
            const d = DETAILS_VIEW.create(NO_DATA);
            st.node.insertBefore(d, st.tagsDiv);
            st.details = d;
        }
        const open = st.details !== null;
        st.data.headline = headlineOf(st.title, open);
        st.data.expanded = expandedOf(open);
        // THE HOP FIRST, ALWAYS. One card view serves ten decks, so an index means nothing until
        // the view is pointed at this card's deck — a bare `update` would write the wrong deck's
        // card.
        cards.mount(st.cardsDiv).update(st.index, st.data);
    };
    const addTagOf = (st: TMikadoCard): void => {
        st.count = nextCount(st.count);
        tags.mount(st.tagsDiv).render(st.pool.slice(0, st.count));
        st.data.label = tagsLabel(st.count);
        cards.mount(st.cardsDiv).update(st.index, st.data);
    };

    const deckData: TMikadoDeckData[] = DECK_IDX.map((d) => {
        const author = deckUserOf(d);
        return {
            name: deckNameOf(d, startDeckName(d)),
            author: userNameOf(author),
            date: dateTextOf(deckDateOf(d), chars[author]),
        };
    });
    decks.render(deckData);

    for (let d = 0; d < DECK_IDX.length; d++) {
        const deckNode = decks.node(d) as TMikadoDeckNode;
        // h2, span.author, time.date, button.ren, div.cards — nothing is ever inserted among these
        // five, so this index cannot move.
        const cardsDiv = deckNode.children[4] as HTMLElement;
        const dk: TMikadoDeck = {
            d,
            data: deckData[d],
            when: deckDateOf(d),
            name: startDeckName(d),
        };
        deckNode._dk = dk;
        hotDecks[deckUserOf(d)].push(dk);
        // ONE CLOSURE PER DECK, ALLOCATED ONLY WHILE A COLLECTION IS OPEN, and it is one call of
        // the very function the `.ren` button reaches through the delegated listener.
        if (collectingCardOps()) {
            noteDeckOps(() => {
                renameOf(dk);
            });
        }

        const idx = cardsOfDeck(d);
        const titles: readonly string[] = idx.map((i) => titleOf(i));
        const cardData: TMikadoCardData[] = idx.map((i, k) => {
            const open = startsOpen(i);
            return {
                i,
                headline: headlineOf(titles[k], open),
                name: userNameOf(cardUserOf(i)),
                expanded: expandedOf(open),
                label: tagsLabel(startCount(i)),
            };
        });
        cards.mount(cardsDiv).render(cardData);

        for (let k = 0; k < idx.length; k++) {
            const i = idx[k];
            const node = cards.node(k) as TMikadoCardNode;
            // BUILD THIS CARD'S PATH ARRAY NOW, while the card still matches its factory exactly:
            // Mikado resolves a dynamic position by sibling hops and MEMOISES the result on the
            // node, and the details block inserted below sits BEFORE the `.count` span, so a path
            // built after that insertion addresses the wrong node for the life of the card. A
            // correctness call, not a warm-up — with `cache: true` this call writes nothing.
            cards.update(k, cardData[k]);
            // h3, span.user, button.tog, div.tags, span.count, button.addtag — grabbed BEFORE the
            // details block is inserted in front of it, and held from then on.
            const tagsDiv = node.children[3] as HTMLElement;
            const pool: readonly TMikadoTag[] = tagsOfCard(i).map((t) => ({
                label: t.label,
                user: t.user,
                text: tagTextOf(t.label, chars[t.user]),
            }));
            const st: TMikadoCard = {
                i,
                index: k,
                cardsDiv,
                data: cardData[k],
                title: titles[k],
                node,
                tagsDiv,
                pool,
                count: startCount(i),
                details: null,
            };
            node._st = st;
            // ITS FOUR TAG POSITIONS REGISTER AS READERS OF FOUR DIFFERENT USERS' SETTINGS. This is
            // what a subscription list is in a program that has none.
            for (let j = 0; j < pool.length; j++) hot[pool[j].user].push({ st, j, tag: pool[j] });
            if (collectingCardOps()) {
                noteCardOps(
                    () => {
                        togOf(st);
                    },
                    () => {
                        addTagOf(st);
                    }
                );
            }

            tags.mount(tagsDiv).render(st.pool.slice(0, st.count));
            if (startsOpen(i)) {
                const dtl = DETAILS_VIEW.create(NO_DATA);
                node.insertBefore(dtl, tagsDiv);
                st.details = dtl;
            }
        }
    }

    // ONE delegated listener — what Mikado's own routing would install, minus the route attribute
    // it would have to leave in the markup. The class is read once and decides which field of the
    // owner this event is about: a deck's `_dk` or a card's `_st`.
    app.addEventListener('click', (e: Event) => {
        const btn = e.target as HTMLElement;
        const owner = btn.parentElement as (TMikadoCardNode & TMikadoDeckNode) | null;
        if (!owner) return;
        const kind = btn.className;
        if (kind === 'ren') {
            const dk = owner._dk;
            if (dk) renameOf(dk);
            return;
        }
        const st = owner._st;
        if (!st) return;
        if (kind === 'tog') togOf(st);
        else addTagOf(st);
    });

    /**
     * THE DECKS FIRST, outermost level first — the same order `flip` puts the rename in, so nothing
     * here can look like a deck write folded into a card's. Then one `update()` per moved tag, each
     * behind a `mount()`. An OFF-SCREEN position still has its store field brought up to date; it
     * is rendered from the store when it comes back.
     */
    const advance = (): void => {
        const u = roundUserOf(round);
        round++;
        const next = nextChars(chars[u]);
        chars[u] = next;
        const authored = hotDecks[u];
        for (let n = 0; n < authored.length; n++) {
            const dk = authored[n];
            dk.data.date = dateTextOf(dk.when, next);
            decks.update(dk.d, dk.data);
        }
        const list = hot[u];
        for (let n = 0; n < list.length; n++) {
            const e = list[n];
            e.tag.text = tagTextOf(e.tag.label, next);
            if (e.j < e.st.count) tags.mount(e.st.tagsDiv).update(e.j, e.tag);
        }
    };
    // DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls below.
    noteRoundOp(advance);

    return {
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advance();
        },
        // Views only — the nodes die with the container the caller removes, and the one listener is
        // owned by the app div.
        teardown: () => {
            decks.destroy();
            cards.destroy();
            tags.destroy();
        },
    };
}
