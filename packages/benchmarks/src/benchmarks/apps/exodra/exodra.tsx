import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoHandlers,
    withExoEffects,
    createExoSchema,
    type TExoAttrPort,
    type TExoChildrenPort,
    type TExoEventPort,
    type TExoTextPort,
} from '@exodra/core';
import {
    ExoDomBackend,
    type TExoDomNode,
    type TExoDomMark,
    exoNodeDom,
    type TExoChildList,
    withExoChildList,
    withExoCompiler,
} from '@exodra/dom';

import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import type { TExoMachineNode, TExoNode } from '@exodra/core';

import { TAG, DETAILS, writeTagLabel, type TExoRegionWiring } from './exodra-shared';
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
    tagsOfCard,
    cardsOfDeck,
    deckUserOf,
    deckDateOf,
    deckNameOf,
    startDeckName,
    nextDeckName,
    dateTextOf,
    tagTextOf,
} from '../scene/spec';
import { collectingCardOps, noteCardOps, noteDeckOps } from '../../shared/card-driver';

/** This row's own schema cache: a backend is the schema cache key, so sharing one would change a
 *  neighbouring row's cache size merely because this row exists. */
export const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/** THE CARD'S SCHEMA — the same nine ports in the same order as the reference `CARD`, character for
 *  character; a port added, moved, renamed or re-elemented is a byte difference at the mount. */
const CARD_SCHEMA = createExoSchema((b) => {
    let index!: TExoAttrPort;
    let title!: TExoTextPort;
    let user!: TExoTextPort;
    let toggle!: TExoEventPort;
    let expanded!: TExoAttrPort;
    let details!: TExoChildrenPort;
    let tags!: TExoChildrenPort;
    let count!: TExoTextPort;
    let addTag!: TExoEventPort;
    b.el('div', { class: 'card' }, (card) => {
        index = card.port('data-i');
        card.el('h3', null, (h3) => {
            title = h3.textPort();
        });
        card.el('span', { class: 'user' }, (span) => {
            user = span.textPort();
        });
        card.el('button', { class: 'tog' }, (btn) => {
            toggle = btn.eventPort('click');
            expanded = btn.port('aria-expanded');
            btn.text('details');
        });
        details = card.childrenPort();
        card.el('div', { class: 'tags' }, (list) => {
            tags = list.childrenPort();
        });
        card.el('span', { class: 'count' }, (span) => {
            count = span.textPort();
        });
        card.el('button', { class: 'addtag' }, (btn) => {
            addTag = btn.eventPort('click');
            btn.text('+');
        });
    });
    return { index, title, user, toggle, expanded, details, tags, count, addTag };
});

const P = CARD_SCHEMA.ports;

// THE BARE ENGINE AND NOTHING OVER IT. No `withExoComputedMachine`, so there is no managed state,
// no derivation and no dependent effect on this row: the state is ONE kept object, exactly the
// values the direct row holds in its closure, and every port write is made by a transition body — the
// same statements the wire makes inline. What separates the two rows is therefore only WHERE the
// state lives and how the update path is reached, which is the question this axis is asked.
const m = createExoMachine<TCard>(CARD_SCHEMA, {
    createInitialState: (c): TCardState => ({
        open: false,
        count: 0,
        title: '',
        pool: NO_TAGS,
        details: c.childList(P.details),
        tags: c.childList(P.tags),
    }),
});

/** The empty pool every card starts with and no card keeps — one array for the process, replaced by
 *  `seedCard` on every instance. A tag row carries the CELL its text is clipped by, and that cell
 *  belongs to the mounted app, so it cannot be a declared value. */
const NO_TAGS: readonly TExoCardTag[] = [];

/** What a card keeps per tag: the label and the CELL its character count is read out of. Read with
 *  `getValue()` and never subscribed — a transition writes the text, and the app fires it. */
export type TExoCardTag = { readonly label: string; readonly chars: TExoBenchSource<number> };

/** EXACTLY THE VALUES A LATER TRANSITION READS, and not one more: a machine's transitions are
 *  module-level functions, so what they need has to be ON the instance. The card's index and its
 *  user are read only by the statement that writes them, so they are locals in `seedCard` and no
 *  part of this. The direct row keeps these same four in its closure context instead. */
type TCardState = {
    open: boolean;
    count: number;
    title: string;
    pool: readonly TExoCardTag[];
    readonly details: TExoChildList;
    readonly tags: TExoChildList;
};

// ONE KEEP AND ONE OBJECT, which is all unmanaged state is: rows and numbers belong to the
// COMPUTED machine, where a mark has to address them. The two regions are taken HERE and not in a
// transition — `c.childList` resolves the port against the exonode's node table and RECORDS the
// port as filled, and both are only true while this instance is being armed.

// `attachExoChildren` registers exactly this against what a LIST builds, and a REGION has no owner —
// so a directly written region has to say it, or this row does LESS than the row beside it.

type TCard = TExoDomNode;

// `insert`/`remove` AND NOT `attach`/`detach`, DELIBERATELY: the placement pair would keep a hidden
// details block alive, which is a DIFFERENT JOB from the one every other participant does.
// REMOVAL RUNS FROM THE END DOWNWARDS — `remove(size - 1)` re-indexes nothing.
const showDetails = (c: TCard, open: boolean): void => {
    const region = c.readState<TCardState>().details;
    const want = open === true ? 1 : 0;
    for (let k = region.size; k < want; k++) region.insert(c.build(DETAILS));
    for (let k = region.size - 1; k >= want; k--) region.remove(k);
};

const showTags = (c: TCard, state: TCardState): void => {
    const region = c.readState<TCardState>().tags;
    // GROW AT THE TAIL, SHRINK FROM THE TAIL: the kept rows are untouched, which is what every app
    // axis's mutation gate requires.
    const want = state.count;
    for (let k = region.size; k < want; k++) {
        // THREE STATEMENTS AND NO SLOT: build the row, write its text through the transition, place
        // it. A machine takes no props, so the value crosses as a transition argument.
        const tag = state.pool[k];
        const row = c.build(TAG);
        writeTagLabel(
            row as unknown as TExoMachineNode,
            tagTextOf(tag.label, tag.chars.getValue())
        );
        region.insert(row);
    }
    for (let k = region.size - 1; k >= want; k--) region.remove(k);
};

export const CARD = composeExoMachine(
    m,
    (m) =>
        withExoTransitions(m, {
            toggleOpen: (c: TCard) => {
                const state = c.readState<TCardState>();
                state.open = state.open === false;
                c.text(P.title, headlineOf(state.title, state.open));
                c.attr(P.expanded, expandedOf(state.open));
                showDetails(c, state.open);
            },
            advanceTags: (c: TCard) => {
                const state = c.readState<TCardState>();
                state.count = nextCount(state.count);
                c.text(P.count, tagsLabel(state.count));
                showTags(c, state);
            },
            /** WHAT THIS ROW PAYS INSTEAD OF A SUBSCRIPTION PER TAG. A tag's text is clipped by a cell the card
             *  does not own, and nothing here listens to it — so when the app changes one, the app walks down and
             *  says so. The cell arrives as the argument and the rows are selected by its IDENTITY, which is why
             *  the DOM writes are exactly the ones a listener would have made: only the tags clipped by THAT
             *  cell move. The walk is the price, and it replaces two hundred subscriptions across five cells. */
            reclipTags: (c: TCard, cell: TExoBenchSource<number>) => {
                const state = c.readState<TCardState>();
                const chars = cell.getValue();
                for (let k = state.tags.size - 1; k >= 0; k--) {
                    const tag = state.pool[k];
                    if (tag.chars !== cell) continue;
                    writeTagLabel(
                        state.tags.at(k) as unknown as TExoMachineNode,
                        tagTextOf(tag.label, chars)
                    );
                }
            },
        }),
    (m) => {
        const { toggleOpen, advanceTags } = m.transitions;
        return withExoTransitions(m, {
            /** THE ONE DOOR A FRESHLY BUILT CARD IS MOVED OFF ITS DECLARED START THROUGH. A machine takes no
             *  props, so every value that belongs to THIS instance arrives as a transition argument. */
            seedCard: (c: TCard, i: number, users: readonly TExoBenchSource<number>[]) => {
                const state = c.readState<TCardState>();
                state.open = startsOpen(i);
                state.count = startCount(i);
                state.title = titleOf(i);
                state.pool = tagsOfCard(i).map((t) => ({ label: t.label, chars: users[t.user] }));

                c.attr(P.index, String(i));
                c.text(P.user, userNameOf(cardUserOf(i)));
                c.text(P.title, headlineOf(state.title, state.open));
                c.attr(P.expanded, expandedOf(state.open));
                c.text(P.count, tagsLabel(state.count));
                showDetails(c, state.open);
                showTags(c, state);

                // The two closures close over the INSTANCE, so they cannot be hoisted and would otherwise be
                // allocated 160 per mount inside `initial-render`'s timed region — hence the guard, which is
                // one global load and one comparison, false everywhere but `app-update`.
                if (collectingCardOps()) {
                    noteCardOps(
                        () => {
                            toggleOpen(c);
                        },
                        () => {
                            advanceTags(c);
                        }
                    );
                }
            },
        });
    },
    (m) => {
        const { toggleOpen, advanceTags } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(P.toggle, (c) => toggleOpen(c));
            on(P.addTag, (c) => advanceTags(c));
        });
    },
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                const details = c.readState<TCardState>().details;
                const tags = c.readState<TCardState>().tags;
                return () => {
                    for (let k = tags.size - 1; k >= 0; k--) exoNodeDom(tags.at(k)!).unmount();
                    for (let k = details.size - 1; k >= 0; k--)
                        exoNodeDom(details.at(k)!).unmount();
                };
            });
        })
);
export const { toggleOpen, advanceTags, reclipTags, seedCard } = CARD.transitions;

/** The port records, exported because `createExoMachine<TCard>` is given its wiring type explicitly, so its
 *  `TPorts` is not inferred and the machine it returns does not carry the port types a schema knows. */
export const CARD_PORTS = P;

/** THE DECK'S SCHEMA — the same five ports in the same order as the reference `DECK`, character for
 *  character, `<time>` included: the tag is part of the bytes. */
const DECK_SCHEMA = createExoSchema((b) => {
    let name!: TExoTextPort;
    let author!: TExoTextPort;
    let date!: TExoTextPort;
    let rename!: TExoEventPort;
    let cards!: TExoChildrenPort;
    b.el('div', { class: 'deck' }, (deck) => {
        deck.el('h2', null, (h2) => {
            name = h2.textPort();
        });
        deck.el('span', { class: 'author' }, (span) => {
            author = span.textPort();
        });
        deck.el('time', { class: 'date' }, (time) => {
            date = time.textPort();
        });
        deck.el('button', { class: 'ren' }, (btn) => {
            rename = btn.eventPort('click');
            btn.text('rename');
        });
        deck.el('div', { class: 'cards' }, (list) => {
            cards = list.childrenPort();
        });
    });
    return { name, author, date, rename, cards };
});

const PD = DECK_SCHEMA.ports;

const mDeck = createExoMachine<TDeck>(DECK_SCHEMA, {
    createInitialState: (c): TDeckState => ({
        d: 0,
        name: 0,
        // `deckDateOf(0)` and not a fresh `Date`: a slot has to be seated with something of the
        // right kind, and the spec's table is module-level and frozen.
        when: deckDateOf(0),
        detail: 0,
        cards: c.childList(PD.cards),
    }),
});

/** The empty user table every deck starts with and no deck keeps — one array for the process,
 *  exactly as `NO_TAGS` is one level down. A deck drives its own cards, and a card's tags carry the
 *  CELLS they are clipped by, so the whole table has to reach one level further down. */
const NO_USERS: readonly TExoBenchSource<number>[] = [];

type TDeckState = {
    d: number;
    name: number;
    when: Date;
    detail: number;
    readonly cards: TExoChildList;
};

// `FD_CARDS` is seeded and never written, so the region's teardown is established once.

type TDeck = TExoDomNode;

export const DECK = composeExoMachine(
    mDeck,
    (m) =>
        withExoTransitions(m, {
            renameDeck: (c: TDeck) => {
                const state = c.readState<TDeckState>();
                state.name = nextDeckName(state.name);
                c.text(PD.name, deckNameOf(state.d, state.name));
            },
            // `setDeckDetail` takes its value as a TRANSITION ARGUMENT rather than reading the cell itself: a
            // transition that fetched its own input would be a component reaching back out for what it was handed.
            setDeckDetail: (c: TDeck, detail: number) => {
                const state = c.readState<TDeckState>();
                state.detail = detail;
                c.text(PD.date, dateTextOf(state.when, state.detail));
            },
        }),
    (m) => {
        const { renameDeck, setDeckDetail } = m.transitions;
        return withExoTransitions(m, {
            /** The deck's own door off its declared start — the card's `seedCard`, one level up.
             *
             *  THREE STATEMENTS PER ROW AND NOT ONE EXPRESSION — build, drive, place. `c.build` arms the machine
             *  and hands back the instance with no element in the document, `seedCard` moves that instance off
             *  its declared start, and `region.insert` is what puts the finished card in the page. */
            seedDeck: (c: TDeck, d: number, users: readonly TExoBenchSource<number>[]) => {
                const state = c.readState<TDeckState>();
                const author = deckUserOf(d);
                const chars = users[author];
                state.d = d;
                state.name = startDeckName(d);
                state.when = deckDateOf(d);
                // `getValue()` and not `startChars(author)`: the deck follows the cell it was handed,
                // whatever a mount has already done to it.
                state.detail = chars.getValue();

                c.text(PD.name, deckNameOf(state.d, state.name));
                c.text(PD.author, userNameOf(author));
                c.text(PD.date, dateTextOf(state.when, state.detail));

                const region = c.readState<TDeckState>().cards;
                const cards = cardsOfDeck(d);
                for (let k = region.size; k < cards.length; k++) {
                    const row = c.build(CARD);
                    seedCard(row as unknown as TCard, cards[k], users);
                    region.insert(row);
                }
                c.onTeardown(
                    chars.onChange(() => {
                        setDeckDetail(c, chars.getValue());
                    })
                );
                if (collectingCardOps()) {
                    noteDeckOps(() => {
                        renameDeck(c);
                    });
                }
            },
            /** The middle step of the walk `advance` starts: a deck hands the changed cell to each of its cards.
             *  The deck's own date needs nothing here — it listens, because it reads ONE cell and a card reads up
             *  to four. */
            reclipDeckTags: (c: TDeck, cell: TExoBenchSource<number>) => {
                const region = c.readState<TDeckState>().cards;
                for (let k = region.size - 1; k >= 0; k--) {
                    reclipTags(region.at(k) as unknown as TCard, cell);
                }
            },
        });
    },
    (m) => {
        const { renameDeck } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(PD.rename, (c) => renameDeck(c));
        });
    },
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                const region = c.readState<TDeckState>().cards;
                return () => {
                    for (let k = region.size - 1; k >= 0; k--) exoNodeDom(region.at(k)!).unmount();
                };
            });
        })
);
export const { renameDeck, setDeckDetail, seedDeck, reclipDeckTags } = DECK.transitions;

export const DECK_PORTS = PD;

/** The shell over the 10 decks — a REGION and not `c.list`, because a fixed list is declared over a
 *  component that takes an item and a machine takes nothing at all. The three statements per deck
 *  are the same three the deck makes per card: build, drive, place. */
/** THE SHELL, AS A FACTORY — `hydrate-floor` builds a bigger app out of the same declaration, so the
 *  deck list is a parameter and each call compiles its own declaration and schema.
 *
 *  THE ROOT'S WORK RUNS IN `wire`, and that is the only place it can: a machine's
 *  transitions are fired by a parent, and the root has none. The seed is handed the exonode, so it
 *  opens the children port, builds each deck and places it — the same three statements a deck makes
 *  per card. */
export const exodraAppOf = (deckList: readonly number[]) => {
    const SCHEMA = createExoSchema((b) => {
        let slot!: TExoChildrenPort;
        b.el('div', { class: 'app' }, (app) => {
            slot = app.childrenPort();
        });
        return { decks: slot };
    });
    const Q = SCHEMA.ports;
    // THE PORTABLE NARROW TYPE, not `TExoDomNode`: `hydrate-floor` renders this very shell through
    // `@exodra/string` as well, and a component that demands the browser exonode cannot be handed to
    // the server one.
    const mApp = createExoMachine<TExoRegionWiring>(SCHEMA, {
        createInitialState: (c: TExoRegionWiring) => {
            // THE APP'S FIVE USERS AND ITS ROUND COUNTER, one set per instance — the shell is the one
            // thing in this app there is exactly one of.
            const users = USER_IDX.map((u) => createExoBenchSource<number>(startChars(u)));
            let round = 0;
            const advance = (): void => {
                const cell = users[roundUserOf(round)];
                round++;
                cell.setValue(nextChars(cell.getValue()));
                // THE WALK, AND IT IS WHY THE TAG HAS NO SUBSCRIPTION. The deck's date moved on the line
                // above, through the one listener a deck owns; a tag's text moves here, because the app
                // knows which cell it just wrote and the tags do not.
                for (let k = decks.size - 1; k >= 0; k--) {
                    reclipDeckTags(decks.at(k) as unknown as TDeck, cell);
                }
            };
            PENDING_ADVANCE = advance;

            // THE SHELL IS DECLARED OVER THE PORTABLE NODE and the deck over the browser one, so the
            // placement crosses here — the one seam in this app where the two meet, and the cast says so
            // rather than widening the shell and losing the server render.
            const decks = c.childList(Q.decks) as unknown as TExoChildList;
            for (let k = 0; k < deckList.length; k++) {
                const deck = c.build(DECK as unknown as Parameters<typeof c.build>[0]);
                seedDeck(deck as unknown as TDeck, deckList[k], users);
                decks.insert(deck as unknown as TExoNode<TExoDomMark>);
            }

            // A REGION HAS NO OWNER AND REGISTERS NOTHING, so the teardown a fixed list performs for its
            // rows is written out here — the same line the deck's own region runs.
            c.onTeardown(() => {
                for (let k = decks.size - 1; k >= 0; k--) exoNodeDom(decks.at(k)!).unmount();
            });
            return { users, advance };
        },
    });
    return mApp;
};

export const APP = exodraAppOf(DECK_IDX);

/** The advance closure on its way out of the render that built it — `apps/exodra/exodra.tsx`'s
 *  `PENDING_ADVANCE` carries the whole argument for why it travels this way. */
let PENDING_ADVANCE: (() => void) | null = null;

/** Take the closure the render that just returned left behind. `render` is synchronous, so the value
 *  read after it returns is the one that render wrote; taking it clears the slot. */
export function takeExodraPendingAdvance(): () => void {
    const advance = PENDING_ADVANCE;
    PENDING_ADVANCE = null;
    if (advance === null) {
        throw new Error(
            'exodra-app: the shell wire left no advance closure — `render` did not run it ' +
                'before returning, so this app has no round operation and its `flip` would never ' +
                'move a user setting. See `PENDING_ADVANCE`.'
        );
    }
    return advance;
}
