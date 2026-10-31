// The 10-deck / 80-card todo app in stage0 (0.0.25). Why this row is the CEILING and not a
// competitor, and what it refuses: `apps/stage0.md`.
//
// `.onclick` and NOT `stage0/syntheticEvents`: delegation is a real architectural advantage no
// other participant on these axes is charged with, and a cheaper ceiling bounds nothing.
import h from 'stage0';
import reconcile from 'stage0/reconcile';
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
} from '../scene/spec';
import { clickAll, type AppHandle } from '../../shared/todo-spec';
import { noteCardOps, noteDeckOps, noteRoundOp } from '../../shared/card-driver';

// ONE LINE, NO INDENTATION BETWEEN TAGS: `h` turns a newline plus indentation into a `<!-- -->`
// comment node, which would put markers in the DOM that no other participant emits.
// `collector()` sees a marker only as a whole ATTRIBUTE or as the WHOLE data of a Text node.

const appTpl = h`<div class="app"></div>`;

const deckTpl = h`<div class="deck"><h2>#name</h2><span class="author">#author</span><time class="date">#date</time><button class="ren" #ren>rename</button><div class="cards" #cards></div></div>`;

// `aria-expanded` is NOT in this template: it is written on `refs.tog` at the fill, which keeps the
// reference's attribute order (`class` then `data-i`, `class` then `aria-expanded`).
// `.count` is a SIBLING of `.tags`, never a child — `reconcile` owns every child of `.tags`.
const cardTpl = h`<div class="card"><h3>#title</h3><span class="user">#user</span><button class="tog" #tog>details</button><div class="tags" #tags></div><span class="count">#count</span><button class="addtag" #addtag>+</button></div>`;

const detailsTpl = h`<div class="details">details…</div>`;

const tagTpl = h`<span class="tag">#label</span>`;

/** What `deckTpl.collect()` hands back. Stage0 types it as an untyped index signature, hence the
 *  cast at every call. */
interface TStage0DeckRefs {
    readonly name: Text;
    readonly author: Text;
    readonly date: Text;
    readonly ren: HTMLElement;
    readonly cards: HTMLElement;
}

interface TStage0Deck {
    readonly d: number;
    readonly nameText: Text;
    name: number;
    readonly when: Date;
    readonly dateText: Text;
}

/** What `cardTpl.collect()` hands back. */
interface TStage0CardRefs {
    readonly title: Text;
    readonly user: Text;
    readonly tog: HTMLElement;
    readonly tags: HTMLElement;
    readonly count: Text;
    readonly addtag: HTMLElement;
}

/** One tag POSITION: permanent for the life of the card, while its node comes and goes. */
interface TStage0Tag {
    readonly label: string;
    readonly user: number;
    readonly j: number;
    readonly card: TStage0Card;
    text: Text | null;
}

interface TStage0Card {
    readonly node: HTMLElement;
    readonly title: Text;
    readonly fullTitle: string;
    readonly tog: HTMLElement;
    readonly tags: HTMLElement;
    readonly countText: Text;
    open: boolean;
    count: number;
    readonly pool: TStage0Tag[];
    /** What the tag list currently reads — `reconcile`'s `renderedValues` argument. */
    rendered: readonly TStage0Tag[];
    details: HTMLElement | null;
}

export function mountStage0App(container: HTMLElement): AppHandle {
    const app = appTpl.cloneNode(true) as HTMLElement;
    const cards: TStage0Card[] = [];

    // `hot` and `hotDecks` are the subscription list written by hand — an assignment to an array
    // element notifies nobody — and they are TWO tables because merging them would put a branch on
    // each of ~64 tag entries to separate two decks the mount separated for free. All three are PER
    // MOUNT: module-level ones would let two apps in one gate advance the same user twice.
    const chars = USER_IDX.map(startChars);
    const hot: TStage0Tag[][] = USER_IDX.map((): TStage0Tag[] => []);
    const hotDecks: TStage0Deck[][] = USER_IDX.map((): TStage0Deck[] => []);
    let round = 0;

    // `collect` is called on the TEMPLATE and handed the CLONE: `_refPaths` and `collect` are
    // expando properties of the template node, and `cloneNode` does not copy expandos.
    const createTag = (row: TStage0Tag): HTMLElement => {
        const node = tagTpl.cloneNode(true) as HTMLElement;
        const refs = tagTpl.collect(node) as unknown as { readonly label: Text };
        refs.label.nodeValue = tagTextOf(row.label, chars[row.user]);
        row.text = refs.label;
        return node;
    };

    for (let dk = 0; dk < DECK_IDX.length; dk++) {
        const d = DECK_IDX[dk];
        const deckNode = deckTpl.cloneNode(true) as HTMLElement;
        const deckRefs = deckTpl.collect(deckNode) as unknown as TStage0DeckRefs;

        const author = deckUserOf(d);
        const when = deckDateOf(d);
        const name = startDeckName(d);
        const deck: TStage0Deck = {
            d,
            nameText: deckRefs.name,
            name,
            when,
            dateText: deckRefs.date,
        };
        deckRefs.name.nodeValue = deckNameOf(d, name);
        deckRefs.author.nodeValue = userNameOf(author);
        deckRefs.date.nodeValue = dateTextOf(when, chars[author]);
        hotDecks[author].push(deck);

        // NAMED, not assigned inline: the SAME closure goes onto `.ren` AND to `card-driver.ts`, so
        // the called round and the clicked round are one program.
        const rename = (): void => {
            deck.name = nextDeckName(deck.name);
            deck.nameText.nodeValue = deckNameOf(deck.d, deck.name);
        };
        deckRefs.ren.onclick = rename;
        noteDeckOps(rename);

        const own = cardsOfDeck(d);
        for (let k = 0; k < own.length; k++) {
            const i = own[k];
            const node = cardTpl.cloneNode(true) as HTMLElement;
            const refs = cardTpl.collect(node) as unknown as TStage0CardRefs;

            const open = startsOpen(i);
            const count = startCount(i);
            const fullTitle = titleOf(i);
            const pool: TStage0Tag[] = [];
            const c: TStage0Card = {
                node,
                title: refs.title,
                fullTitle,
                tog: refs.tog,
                tags: refs.tags,
                countText: refs.count,
                open,
                count,
                pool,
                rendered: [],
                details: null,
            };
            const spec = tagsOfCard(i);
            for (let j = 0; j < spec.length; j++) {
                const row: TStage0Tag = {
                    label: spec[j].label,
                    user: spec[j].user,
                    j,
                    card: c,
                    text: null,
                };
                pool.push(row);
                hot[row.user].push(row);
            }
            c.rendered = pool.slice(0, count);

            node.setAttribute('data-i', String(i));
            refs.title.nodeValue = headlineOf(fullTitle, open);
            refs.user.nodeValue = userNameOf(cardUserOf(i));
            refs.tog.setAttribute('aria-expanded', expandedOf(open));
            refs.count.nodeValue = tagsLabel(count);

            reconcile(c.tags, [], c.rendered as TStage0Tag[], createTag);

            if (c.open) {
                c.details = detailsTpl.cloneNode(true) as HTMLElement;
                node.insertBefore(c.details, c.tags);
            }

            // NAMED, not assigned inline: the SAME two closures reach the buttons AND
            // `card-driver.ts`, the door `app-update` drives this row through with no event.
            const tog = (): void => {
                c.open = !c.open;
                c.title.nodeValue = headlineOf(c.fullTitle, c.open);
                c.tog.setAttribute('aria-expanded', expandedOf(c.open));
                if (c.open) {
                    c.details = detailsTpl.cloneNode(true) as HTMLElement;
                    node.insertBefore(c.details, c.tags);
                } else {
                    // Dropped, not parked — the same thing Solid's `<Show>`, React's conditional,
                    // Lit's `nothing` and the schema core's zero-or-one list all do.
                    if (c.details) c.details.remove();
                    c.details = null;
                }
            };
            const addTag = (): void => {
                c.count = nextCount(c.count);
                // A prefix of THIS CARD'S four positions, never of `POOL`: `reconcile` compares by
                // the ITEM, so four fresh strings would rebuild a list whose contents did not
                // change, and the setting write would go through positions no longer in the DOM.
                const next = c.pool.slice(0, c.count);
                reconcile(c.tags, c.rendered as TStage0Tag[], next, createTag);
                c.rendered = next;
                c.countText.nodeValue = tagsLabel(c.count);
            };
            refs.tog.onclick = tog;
            refs.addtag.onclick = addTag;
            noteCardOps(tog, addTag);

            cards.push(c);
            deckRefs.cards.appendChild(node);
        }

        app.appendChild(deckNode);
    }

    container.appendChild(app);

    // `j < row.card.count` is how a permanent POSITION answers "is my node on screen": `reconcile`
    // never tells anybody what it removed. Both values are recomputed where they are written and
    // NEITHER IS CACHED — forty `tagTextOf` for four distinct strings, two `dateTextOf` for one —
    // because a table of formatted strings is a STRATEGY a participant has to write and be measured
    // for, not something the ceiling helps itself to on the way past.
    const advanceUser = (): void => {
        const u = roundUserOf(round);
        round++;
        const next = nextChars(chars[u]);
        chars[u] = next;
        const owned = hotDecks[u];
        for (let k = 0; k < owned.length; k++) {
            const deck = owned[k];
            deck.dateText.nodeValue = dateTextOf(deck.when, next);
        }
        const rows = hot[u];
        for (let k = 0; k < rows.length; k++) {
            const row = rows[k];
            if (row.j < row.card.count) {
                (row.text as Text).nodeValue = tagTextOf(row.label, next);
            }
        }
    };
    noteRoundOp(advanceUser);

    return {
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advanceUser();
        },
        // Nothing to dispose: no subscriptions, no registry, and a handler is a property of a node.
        teardown: () => {
            cards.length = 0;
        },
    };
}
