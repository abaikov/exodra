// The 80-card todo app in MIKADO (0.8.400), written the way Mikado's own documentation says to
// write a REACTIVE app: proxied stores, observable arrays and routing. What that reaches, what it
// cannot reach, and what it costs in markup is in `apps/mikado-reactive.md`.
import Mikado from 'mikado';
import {
    IDX,
    USER_IDX,
    DECK_IDX,
    cardsOfDeck,
    deckUserOf,
    deckDateOf,
    deckNameOf,
    startDeckName,
    nextDeckName,
    dateTextOf,
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
} from '../scene/spec';
import { clickAll, type AppHandle } from '../../shared/todo-spec';

type TMikadoTemplate = ReturnType<typeof Mikado.compile>;

/**
 * `{{= data.heading }}` AND NOT `{{= data.name }}`: the `<h2>` shows `deckNameOf(d, name)` and the
 * deck's state is the INTEGER `name`. A reactive expression is a bare field name — no call, no
 * concatenation, not even an index — so the two cannot be the same field.
 *
 * `click="ren:root"` is Mikado's routing, and the attribute IS the registration: it cannot be kept
 * out of the DOM, which is the divergence the gate prices rather than hides.
 */
const DECK: TMikadoTemplate = Mikado.compile(
    '<div class="deck">' +
        '<h2>{{= data.heading }}</h2>' +
        '<span class="author">{{= data.author }}</span>' +
        '<time class="date">{{= data.date }}</time>' +
        '<button class="ren" click="ren:root">rename</button>' +
        '<div class="cards"></div>' +
        '</div>'
);

/**
 * `{{= }}` (not `{{ }}`) is Mikado's REACTIVE binding, and only plain property notation is allowed
 * inside one — no JavaScript, not even a concatenation — which is why every one of these is a bare
 * field and the three DERIVED ones are computed in the route handlers below and then ASSIGNED.
 *
 * `aria-expanded` is a DYNAMIC attribute: `factory.js` keeps it off the factory node and writes it
 * with `setAttribute` at the first apply, so it serialises after the static `class` and after the
 * `click` route attribute the factory does carry.
 *
 * The `<span class="count">` is a SIBLING of the `.tags` div, not a child: a Mikado view OWNS its
 * root's children — the observable array's `push`/`splice` index straight into them — so inside,
 * the count span would be taken for a tag component and destroyed by the first list operation.
 */
const CARD: TMikadoTemplate = Mikado.compile(
    '<div class="card" data-i="{{= data.i }}">' +
        '<h3>{{= data.headline }}</h3>' +
        '<span class="user">{{= data.user }}</span>' +
        '<button class="tog" click="tog:root" aria-expanded="{{= data.expanded }}">details</button>' +
        '<div class="tags"></div>' +
        '<span class="count">{{= data.label }}</span>' +
        '<button class="addtag" click="addtag:root">+</button>' +
        '</div>'
);

/**
 * `key="data.label"` is Mikado's KEYED recycle mode — the same setting
 * `apps/mikado/mikado.tsx` uses, kept
 * identical on purpose so the delta between the two rows is the reactivity and not the recycle
 * strategy. The key attribute is consumed by the compiler and is NOT rendered.
 *
 * THE TEXT IS `{{= data.text }}` AND THE KEY IS `data.label`: a tag renders its label cut to the
 * setting of ITS OWN user, so the text moves while the position's IDENTITY does not. The price is
 * one extra `update()` per tag at the mount — `render()` writes each item back into the observable
 * and re-enters its `set` trap.
 */
const TAG: TMikadoTemplate = Mikado.compile(
    '<span class="tag" key="data.label">{{= data.text }}</span>'
);

const DETAILS: TMikadoTemplate = Mikado.compile('<div class="details">details…</div>');

/**
 * Mikado's proxy has four sinks — text, innerHTML, className, attribute — so a reactive property
 * can change what an element SAYS and cannot add or remove one. The block is an orphan component:
 * `create()` returns a clone this app inserts and removes itself.
 */
const DETAILS_VIEW = new Mikado(DETAILS);
/** `create(data)` wants a data argument; this template reads none, so one shared object serves. */
const NO_DATA = {};

/**
 * A tag is an object because Mikado's keyed mode reads the key off the item (`data.label`) — and,
 * since the app gained its users, it is also a STORE the proxy binds a DOM position to. The object
 * in `cell.pool` is the RAW one; what the observable array holds is a Proxy OVER it, and only a
 * write through THAT reaches the DOM.
 */
interface TMikadoTag {
    readonly label: string;
    /** Which of the five users decides how much of the label is shown. Constant. */
    readonly user: number;
    /** `tagTextOf(label, chars[user])` — the rendered text; the field `{{= data.text }}` binds. */
    text: string;
}

/**
 * ONE TAG POSITION, AS THE ROUND OPERATION REACHES IT. A `{{= }}` expression is a field NAME on the
 * item being rendered, so no expression can read a user record forty tags away and no computed
 * exists: a shared read has to be ENUMERATED by the app.
 */
interface TMikadoHotTag {
    /** The card this position belongs to — for its live tag list. */
    readonly cell: TMikadoCardCell;
    /** The card's store entry, read for `count`: a position exists only while `j < count`. */
    readonly data: TMikadoCardData;
    /** This position's index in its card's list, 0…3. Constant. */
    readonly j: number;
}

/**
 * What the CARD template reads, plus the state the three derived fields are computed from. They
 * live here rather than in a side table because in Mikado the STORE is the model — and the cost is
 * honest: after `render()` these objects are Proxies, so every read and write of
 * `title`/`open`/`count` goes through a trap for a field the renderer does not watch.
 */
interface TMikadoCardData {
    readonly i: number;
    /** `userNameOf(cardUserOf(i))` — bound to the `<span class="user">`'s text. A STILL value. */
    readonly user: string;
    /** The card's FULL title — constant for its life, and the input `headlineOf` clips. */
    readonly title: string;
    headline: string;
    /** `expandedOf(open)` — a string, because that is what an attribute holds. */
    expanded: string;
    label: string;
    open: boolean;
    count: number;
}

/**
 * What the DECK template reads, plus the state its heading is computed from. IT IS A SEPARATE
 * INTERFACE FROM `TMikadoCardData` AND NOT A WIDER ONE, because `d` and `i` are different facts:
 * `deckUserOf(d)` and `cardUserOf(i)` read the same five users by different rules, and a shape that
 * answered to both would let a deck be built from a card's index with nothing to catch it.
 */
interface TMikadoDeckData {
    readonly d: number;
    /** `userNameOf(deckUserOf(d))` — bound to the `<span class="author">`. A STILL value. */
    readonly author: string;
    /** `deckDateOf(d)` — constant for the life of the deck, and the input `dateTextOf` formats. */
    readonly when: Date;
    heading: string;
    date: string;
    /** THE DECK'S OWN STATE, and the only state at this level: an index into `DECK_TITLES`. */
    name: number;
}

/**
 * Mikado's own `index.d.ts` declares the class as `Mikado.array` — a name that does not exist at
 * runtime, since `bundle.js` assigns `Mikado["Array"] = Observer`. This is the shape the
 * constructor has to be taken as.
 */
interface TMikadoObservable<T> {
    readonly [index: number]: T;
    readonly length: number;
    /** Appends one item — `Observer.push` → `view.add()`: one component created and inserted. */
    push(item: T): void;
    /** Drops the tail in one call — `Observer.splice` → `view.remove(start, count)`. */
    splice(start?: number, count?: number): T[];
}

/** CAST 1 of 2. See `TMikadoObservable` above for why the declared name cannot be used. */
type TMikadoObservableCtor = new <T>(items?: readonly T[]) => TMikadoObservable<T>;
const MikadoObservable = (Mikado as unknown as { Array: TMikadoObservableCtor }).Array;

/** The view-side half of a card: everything the two route handlers need that is not app data. */
interface TMikadoCardCell {
    /** Found once with `querySelector`, never by child index. */
    readonly tagsDiv: HTMLElement;
    /** Stable per (card, tag) so the observable array's items keep their identity. */
    readonly pool: readonly TMikadoTag[];
    readonly tags: TMikadoObservable<TMikadoTag>;
    /** One view per card, because an observable array binds to exactly one Mikado instance. */
    readonly view: Mikado;
    details: HTMLElement | null;
}

/** One mounted app, as the two GLOBAL route handlers see it. */
interface TMikadoReactiveApp {
    readonly store: readonly TMikadoCardData[];
    readonly cells: readonly TMikadoCardCell[];
    /** THE FIVE USERS' SETTINGS, PER MOUNT AND NOT PER MODULE: every gate here stands two apps side
     *  by side, and module-level settings would be advanced twice per round while both agreed. */
    readonly chars: number[];
    /** Every mounted-or-not tag POSITION in the app, dealt into five arrays by its user. */
    readonly hot: readonly (readonly TMikadoHotTag[])[];
}

/** App div → its state. Mikado's route table is process-global, so the handlers below are
 *  registered once and CANNOT capture a mount; they reach it through here. */
const APPS = new WeakMap<HTMLElement, TMikadoReactiveApp>();

/** Deck node → that deck's PROXIED store: the contract gives a deck not one attribute, so there is
 *  nothing to read an index off, and `view.index(node)` is ten comparisons per click. */
const DECK_STORES = new WeakMap<Element, TMikadoDeckData>();

/**
 * THREE HOPS SINCE THE DECKS ARRIVED: a card sits in its deck's `.cards` region, the region in the
 * deck, the deck in the app div. `data-i` is the GLOBAL index — `store`/`cells` stay eighty long,
 * so a deck never renumbers the cards it holds — and reading it is O(1) where `view.index(node)` is
 * 80 comparisons per click.
 */
function cardOf(card: HTMLElement): [TMikadoReactiveApp, number] | null {
    const deck = card.parentElement?.parentElement;
    const app = deck ? APPS.get(deck.parentElement as HTMLElement) : undefined;
    return app ? [app, Number(card.getAttribute('data-i'))] : null;
}

/** `name` is an integer no sink is bound to and `heading` is the string the `<h2>` shows, so the
 *  two assignments are a model write and a DOM write, and only Mikado can tell them apart. */
Mikado.route('ren', (deck: HTMLElement): void => {
    const data = DECK_STORES.get(deck);
    if (!data) return;
    const name = nextDeckName(data.name);
    data.name = name;
    data.heading = deckNameOf(data.d, name);
});

Mikado.route('tog', (card: HTMLElement): void => {
    const found = cardOf(card);
    if (!found) return;
    const [app, i] = found;
    const data = app.store[i];
    const cell = app.cells[i];
    // The STORE decides, not the DOM: `open` is the model, `cell.details` is the node it owns.
    const open = !data.open;
    if (open) {
        const d = DETAILS_VIEW.create(NO_DATA);
        card.insertBefore(d, cell.tagsDiv);
        cell.details = d;
    } else {
        cell.details?.remove();
        cell.details = null;
    }
    data.open = open;
    // THE TWO DERIVED VALUES `open` MOVES: recomputed here because a reactive expression cannot
    // compute, then ASSIGNED — and that assignment is the whole update. No `update()`, no index, no
    // node named anywhere in this handler.
    data.headline = headlineOf(data.title, open);
    data.expanded = expandedOf(open);
});

Mikado.route('addtag', (card: HTMLElement): void => {
    const found = cardOf(card);
    if (!found) return;
    const [app, i] = found;
    const data = app.store[i];
    const cell = app.cells[i];
    const next = nextCount(data.count);
    if (next > data.count) {
        // THE ARRIVING TAG'S TEXT IS REFRESHED FIRST: `advance` writes only the positions that are
        // ON SCREEN, so one that was off screen when its user's setting moved still carries the
        // previous text — and `mikado.add(value)` renders whatever the item says at that instant.
        // The RAW pool object is the right thing to write here: it is the one `push` hands to
        // `add`.
        const item = cell.pool[next - 1];
        item.text = tagTextOf(item.label, app.chars[item.user]);
        cell.tags.push(item);
    } else cell.tags.splice(next);
    data.count = next;
    // THE ONE DERIVED VALUE `count` MOVES. The `.count` span is outside the div the observable
    // array owns, so it is a field of the CARD's store and one assignment carries it to the span's
    // text.
    data.label = tagsLabel(next);
});

export function mountMikadoReactiveApp(container: HTMLElement): AppHandle {
    const app = document.createElement('div');
    app.className = 'app';
    container.appendChild(app);

    // A view owns its factory, so a view is PER MOUNT: sharing one would carry a warm component
    // pool from the previous sample into the next. Building this first factory is also what
    // registers Mikado's global `click` listener, so the delegation is set up inside the timed
    // mount.
    const decksView = new Mikado(DECK, { mount: app });

    // PER MOUNT AND NOT PER MODULE — see `TMikadoReactiveApp.chars`.
    const chars = USER_IDX.map(startChars);
    const hot: TMikadoHotTag[][] = USER_IDX.map((): TMikadoHotTag[] => []);
    // Filled below, AFTER the render, because what belongs in it is the PROXY and not the object
    // the map returns.
    const hotDecks: TMikadoDeckData[][] = USER_IDX.map((): TMikadoDeckData[] => []);
    let round = 0;

    const decks: TMikadoDeckData[] = DECK_IDX.map((d) => {
        const name = startDeckName(d);
        const when = deckDateOf(d);
        return {
            d,
            author: userNameOf(deckUserOf(d)),
            when,
            heading: deckNameOf(d, name),
            date: dateTextOf(when, chars[deckUserOf(d)]),
            name,
        };
    });
    decksView.render(decks);

    // THE CARD STORE AND THE CARD CELLS STAY EIGHTY LONG AND GLOBALLY INDEXED: `data-i` carries the
    // global index and both route handlers reach these two arrays through it.
    const store: TMikadoCardData[] = new Array<TMikadoCardData>(IDX.length);
    const cells: TMikadoCardCell[] = new Array<TMikadoCardCell>(IDX.length);
    const cardViews: Mikado[] = new Array<Mikado>(DECK_IDX.length);

    for (let n = 0; n < DECK_IDX.length; n++) {
        const d = DECK_IDX[n];
        const deckNode = decksView.node(n);
        // The PROXY, not the object built above: `render()` swapped it in, and only a write through
        // it reaches the DOM.
        const deckData = decks[n];
        DECK_STORES.set(deckNode, deckData);
        hotDecks[deckUserOf(d)].push(deckData);

        // THE NESTING WALL, MET A SECOND TIME: the eight cards cannot be an include in the deck
        // template — an include renders into the FACTORY's copy of the element and the deck is then
        // cloned — so they are a view mounted on the deck's REAL `.cards` div.
        const cardsDiv = deckNode.querySelector('.cards') as HTMLElement;
        const cardView = new Mikado(CARD, { mount: cardsDiv });
        cardViews[n] = cardView;

        const idx = cardsOfDeck(d);
        const raw: TMikadoCardData[] = idx.map((i) => {
            const open = startsOpen(i);
            const count = startCount(i);
            const title = titleOf(i);
            return {
                i,
                user: userNameOf(cardUserOf(i)),
                title,
                headline: headlineOf(title, open),
                expanded: expandedOf(open),
                label: tagsLabel(count),
                open,
                count,
            };
        });
        // ALL EIGHT RENDERED BEFORE ANY DETAILS BLOCK IS INSERTED: `apply_proxy` → `create_path`
        // runs on each card as this call adds it, and a path built after an insertion would address
        // the wrong node for the life of the card.
        cardView.render(raw);

        for (let k = 0; k < idx.length; k++) {
            // `k` is the card's position in ITS DECK'S view, `i` is the index every formula in the
            // spec takes and the one `data-i` carries into the route handlers.
            const i = idx[k];
            const node = cardView.node(k);
            // BY SELECTOR, not by child index: Mikado has no way to hand a per-item sub-view to the
            // item it belongs to, and a child index is what the hand-written row uses.
            const tagsDiv = node.querySelector('.tags') as HTMLElement;
            const data = raw[k];
            store[i] = data;
            const pool: readonly TMikadoTag[] = tagsOfCard(i).map((t) => ({
                label: t.label,
                user: t.user,
                text: tagTextOf(t.label, chars[t.user]),
            }));

            // The two documented steps: build the observable array with its initial contents, bind
            // it to a view with `{ observe, mount }`, then render once because the store is not
            // empty.
            //
            // NO `cache: true` HERE, and that is not an oversight: this row never calls `update()`
            // — the proxy writes exactly one position per assignment, and every assignment is a
            // genuine change — so a cache would allocate per card at the mount and skip nothing.
            const tags = new MikadoObservable<TMikadoTag>(pool.slice(0, data.count));
            const view = new Mikado(TAG, {
                // CAST 2 of 2. `MikadoOptions.observe` is declared as the `Mikado.array` type whose
                // runtime constructor does not exist under that name.
                observe: tags as never,
                mount: tagsDiv,
                pool: true,
                cache: true,
            });
            view.render(tags);

            const cell: TMikadoCardCell = { tagsDiv, pool, tags, view, details: null };
            cells[i] = cell;
            // THE FAN-OUT, ENUMERATED AT THE MOUNT because Mikado has no place to declare it — see
            // `TMikadoHotTag`. 320 positions dealt into five arrays, ~64 each.
            for (let j = 0; j < pool.length; j++) hot[pool[j].user].push({ cell, data, j });

            if (data.open) {
                const block = DETAILS_VIEW.create(NO_DATA);
                node.insertBefore(block, tagsDiv);
                cell.details = block;
            }
        }
    }

    APPS.set(app, { store, cells, chars, hot });

    /**
     * THE ROUND'S ONE OPERATION THAT IS NOT A CLICK — one user's setting advanced, and everything
     * that shows it reassigned: forty tag texts at depth three, two deck dates at depth one. It is
     * a closure of THIS mount, which is the only way the counter can belong to the app.
     *
     * THE WRITE GOES THROUGH `cell.tags[j]` AND NOT `cell.pool[j]`, and that is not
     * interchangeable: the observable holds a Proxy over the raw pool object and only the Proxy
     * carries the DOM sink. `j < data.count` is one comparison the app makes, because the
     * observable will not say what it removed.
     */
    const advanceUser = (): void => {
        const u = roundUserOf(round);
        round++;
        const next = nextChars(chars[u]);
        chars[u] = next;
        const rows = hot[u];
        for (let x = 0; x < rows.length; x++) {
            const row = rows[x];
            if (row.j < row.data.count) {
                const item = row.cell.tags[row.j];
                item.text = tagTextOf(item.label, next);
            }
        }
        const authored = hotDecks[u];
        for (let x = 0; x < authored.length; x++) {
            const deck = authored[x];
            deck.date = dateTextOf(deck.when, next);
        }
    };

    return {
        // THE RENAMES LEAD DELIBERATELY, outermost level first, so a participant that renders a
        // deck and its cards in one pass cannot fold the deck write into a card's. NOTHING TO
        // FLUSH: Mikado's `render()`, `add()` and `remove()` are synchronous unless the `async`
        // option or a callback asks otherwise, and the proxy writes straight through to the node.
        flip: () => {
            clickAll(container, '.ren');
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            advanceUser();
        },
        teardown: () => {
            // ALL 91 VIEWS, OUTSIDE IN — the decks', the ten card views, the eighty tag views.
            decksView.destroy();
            for (let n = 0; n < cardViews.length; n++) cardViews[n].destroy();
            for (let k = 0; k < cells.length; k++) cells[k].view.destroy();
            // Mikado's delegation is ONE global capture listener on `window` and it fires for every
            // click in the document: left registered, it would walk the ancestors of all 170 clicks
            // each OTHER participant dispatches. The next mount's factory registers it again.
            Mikado.unlisten('click');
        },
    };
}
