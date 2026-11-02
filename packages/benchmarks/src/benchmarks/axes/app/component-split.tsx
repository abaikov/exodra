// Does Solid's template advantage survive being split into components?
//
// A template can never span a component boundary — the compiler cannot know what a
// component call returns. So an app written as one fat component gives Solid its
// LARGEST possible templates, and our 10-deck / 80-card benchmark is that shape: one
// component, its templates, eighty card clones. Real apps are dozens of small
// components, where each template shrinks to a handful of nodes and the fixed cost
// of clone + hole-walk + insert has less static material to pay for.
//
// All four variants are interleaved in ONE run, so monolith and split are compared
// under the same machine state — the mistake made earlier when two separate abBench
// calls were compared across warm-up states. NOTE: the `solid` and `svelte` ROW LABELS are
// both Solid — `solid` is Solid as one fat component, `svelte` is Solid split into Deck + Card + Tag.
// The labels are the harness's fixed framework names, not two different frameworks.
//
// THE SCHEMA CORE ASKS THIS QUESTION MORE SHARPLY THAN ANYONE ELSE HERE, which is why it is on
// this axis twice.
//
// For Solid a component boundary is where a TEMPLATE has to stop. For the core in
// `@exodra/core` + `@exodra/dom` it is where a SCHEMA has to stop, and a schema is one
// contiguous static region cloned in one `cloneNode(true)` — so the boundary is more expensive
// in principle and the question "does the advantage survive being split" is more pointed.
//
//   schema      the app as `apps/exodra/exodra.tsx` writes it: APP → 10 × DECK → 8 × CARD each →
//               TAG / DETAILS. Five declarations, five schemas, 10 deck clones, 80 card clones
//               plus a clone per tag.
//   exodraMono  the SAME app as ONE declaration. The cursor loops over the ten decks and, inside
//               each, over its eight cards at module load, so the whole 621-element frame is one
//               prepared prototype (1 app div + 6 elements per deck + 7 per card — the frame census
//               `mount-floor.ts` keeps as `FRAME_ELEMENTS`), one `cloneNode(true)` and one insert.
//
// ═══ WHAT THE THIRD LEVEL DID TO THE VARIABLE THIS AXIS MEASURES ═══
//
// The app gained DECKS — ten of them, each holding eight of the same eighty cards, each with its own
// name, author, date, rename button and card list (`todo-spec.ts`, THE DECKS). That is not merely a
// bigger scene for this axis; it is a bigger version of the one thing this axis varies.
//
// THE SPLIT FORM'S TOP USED TO BE ONE DECLARATION BETWEEN THE ROOT AND THE CARDS. It is now ELEVEN
// — a shell and ten decks — and each of those ten is a clone, a compiled schema and a wire call the
// two-level app never made. The monolith makes none of them: to it a deck is fixed structure spelled
// inline, exactly as a card is.
//
// COUNTED, BECAUSE THE TWO NUMBERS DO NOT GROW TOGETHER. The mounted tree grew 7.5% (801 → 861
// elements, deck chrome and nothing else — `apps/exodra/exodra.md` does that census). The component
// boundaries the split form pays for and the monolith does not grew 12.5%: the split form
// instantiates 331 components at a mount (1 shell + 10 decks + 80 cards + 40 details + 200 tags)
// where the monolith instantiates 241 (1 app + 40 details + 200 tags), so the gap this axis reads
// went from 80 boundaries to 90. The thing being varied grew faster than the scene it is varied in,
// which is the only sense in which this deepening changes what the axis can see.
//
// WHAT MONOLITHISING CAN BAKE IN, AND WHY THAT IS NOW ONE PORT PER CARD AND NOT TWO. A monolith
// may fold a value into its prepared markup exactly when the value is CONSTANT for the life of
// the process, because the schema is built once at module load, for these eighty card indices,
// and never again. Until the card gained its three derived values that covered two of its ports:
// `data-i` was `String(i)` and the `<h3>` was `Task ${i}`, both known from the index alone, so
// monolithising deleted both.
//
// TWO VALUES QUALIFY ON A CARD, AND THEY ARE THE CARD'S TWO CONSTANTS. `data-i` is `String(i)`,
// and the `<span class="user">` holds `userNameOf(cardUserOf(i))` — a function of the index alone,
// which is why the arrival of the USERS did not cost this monolith a port: a user's SETTING moves
// and a user's NAME does not, and only the second is on a card. Sixteen cards bake each of the five
// names.
//
// THE OTHER THREE SCALARS CANNOT BE BAKED. The `<h3>` holds `headlineOf(titleOf(i), open)`, the
// `.tog` button holds `aria-expanded={expandedOf(open)}` and the `.count` span holds
// `tagsLabel(count)` — three values that MOVE when a click moves `open` or `count`, in a monolith
// exactly as in the split app. A value that moves cannot be in a prototype that is cloned, so all
// three stay ports and are filled per instance; the two children ports per card stay ports for the
// reason they always did, that the card's STRUCTURE varies there. So the whole-app schema declares
// SEVEN ports per card where the per-component `CARD` declares NINE, and the two it saves are the
// two values in this app that cannot move. That is itself part of the answer: the more of an
// application is genuinely dynamic, the less a monolith has left to bake. Of the card's three
// derived values, ONE is a former constant that started moving (the `<h3>`, which used to be
// `Task ${i}` and is now clipped while the card is collapsed) and TWO are new positions that have
// never been constants (`aria-expanded`, the `.count` span).
//
// AND THE TAG'S TEXT IS NEITHER. It is `tagTextOf(label, users[t.user].chars)` — a value of the tag
// AND of a user shared with forty other cards — so it lives where it lives in every Exodra row, in
// the imported `TAG`, written from the source the card resolved for that position. A monolith cannot fold
// it in and does not try.
//
// THE DECK LEVEL SPLITS THE SAME THREE WAYS, WHICH IS WHY IT IS WORTH HAVING HERE AT ALL: it is a
// whole level whose values are one of each kind the card already had, so the rule can be watched
// working a second time on different material.
//
//   BAKED       `<span class="author">` holds `userNameOf(deckUserOf(d))` — a function of the
//               deck's index alone, so it folds into the prototype exactly as a card's
//               `<span class="user">` does. Two decks carry each of the five names, where sixteen
//               cards carry each. It is the third and last value in this app a monolith may delete.
//   A PORT      `<h2>` holds `deckNameOf(d, name)`, moved by every `.ren` click, and
//               `<time class="date">` holds `dateTextOf(deckDateOf(d), chars[deckUserOf(d)])`,
//               moved whenever the round advances that author's setting. One over the deck's own
//               state, one over a cell shared with forty tags in forty cards spread across all ten
//               decks — and neither can live in a prototype that is cloned, whichever level it is on.
//
// SO THE WHOLE-APP SCHEMA DECLARES THREE PORTS PER DECK WHERE `DECK` DECLARES FIVE, and the two it
// saves are NOT the same kind of saving. The author text is a bake, like the card's user name. THE
// OTHER IS THE MIDDLE LIST ITSELF: `DECK` spends a children port on `<div class="cards">` and fills
// it with `c.list(P.cards, CARD, 8)` — ten regions, ten fills, eighty wire calls — and the
// monolith has no port there at all. A card's two regions stay ports in both forms because a card's
// STRUCTURE genuinely varies there, zero-or-one details and one-to-four tags. A DECK'S ONE REGION
// DOES NOT VARY AT ALL: eight cards decided at the mount and never changed, so it is `c.list` and
// not a reconciled list. It is a port in `DECK` only because a card is a
// separate schema — which makes it the cut itself, showing up as a port, and the only port on this
// axis that exists for no reason but the boundary being measured.
//
// Markup is identical both ways, and the gate below asserts it: the whole-app schema against
// the per-component one (`apps/exodra/exodra.tsx`, the suite's markup reference), mounted and
// after an update round. The update round is where the three derived values earn their place in
// the gate — a monolith that numbered 80 cards' ports in one pass and wired card 79's headline to
// card 78's cell would mount perfectly and diverge on the first click. It now numbers ten decks'
// ports in the same pass, outside the cards', and the round leads with the ten `.ren` clicks — so a
// monolith that walked its deck records out of step would mount perfectly and rename a deck into
// another deck's heading on the first click of the round, before a card has moved at all.
//
// AND THE MONOLITH REGISTERS NOTHING WITH `card-driver.ts`, at either level — no card pairs before
// the decks arrived and no renames now. `MONO_APP` is mounted by this file and by nothing else in
// the suite, and the only round it ever runs is the gate's, fired by real clicks through
// `clickAll`. The reference beside it registers both, and pays for it here in ninety-one global
// loads that find no open collection — eighty card pairs, ten renames and one round operation —
// inside the very region this axis times. That cost is on the split side and not on the mono side,
// and it is the one thing in the delta that is not the cut.
import { createSignal, For, Show, type JSX as SolidJSX } from 'solid-js';
import { abBench, type Scenario } from '../../../harness';
import { appLines } from '../../shared/app-lines';
import {
    DECK_IDX,
    USER_IDX,
    clickAll,
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
    tagTextOf,
    cardsOfDeck,
    deckUserOf,
    deckDateOf,
    deckNameOf,
    startDeckName,
    nextDeckName,
    dateTextOf,
    type TTag,
} from '../../shared/todo-spec';
import { mountExodraApp, writeTagLabel, type TExoCardTag } from '../../participants/exodra/app';
import type { TExoMachineNode } from '@exodra/core';
import { DETAILS, TAG, type TExoRegionWiring } from '../../apps/exodra/exodra-shared';
import { gateMarkup } from '../../gates/markup-gate';
// Package specifiers — the schema core is measured out of its `dist`, never out of src.
import {
    type TExoAttrPort,
    type TExoChildrenPort,
    type TExoEventPort,
    type TExoTextPort,
} from '@exodra/core';
import type { TExoNode } from '@exodra/core';
import { reconcileExoOrder, type TExoPlacedChildren } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import {
    composeExoMachine,
    createExoMachine,
    withExoEffects,
    withExoHandlers,
    withExoTransitions,
    withExoWire,
} from '@exodra/core';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/**
 * THE FIVE USER SETTINGS AS SOLID HOLDS THEM — five signal ACCESSORS, index = user id.
 *
 * The setters are dropped and that is deliberate rather than sloppy. This axis TIMES A MOUNT and
 * never clicks: `timedSolid`'s `measure()` is one `render(...)` and its `cleanup()` disposes, so no
 * round operation runs on either Solid row and a setter here would be a binding nothing could ever
 * call. What must be true is that the tag's text is a TRACKED READ of a signal — a value captured
 * once would not be the value the contract names — and an accessor is exactly that, at exactly the
 * allocation the Exodra rows on this axis pay for their five cells.
 *
 * IT IS THE ONE THING ON THE SOLID SIDE THAT IS NOT THE FULL PARTICIPANT. `todo-app.tsx`'s `SolidApp`
 * runs the whole update round and needs both halves of each signal; these two rows are its mount
 * half. Anything read off this file about a Solid UPDATE would be read off a row that has none.
 */
type TSolidUsers = readonly (() => number)[];

/**
 * The SEVEN ports one card contributes to the whole-app schema.
 *
 * `data-i` and the user's NAME are not among them, and they are the only two things that are not:
 * both are baked into the prepared markup, because both are functions of the card's index and
 * constant for the life of the process. The three derived values are ports here exactly as they are
 * in `CARD` — they move when a click moves the card's state, and nothing that moves can live in a
 * prototype.
 */
type TMonoCard = {
    title: TExoTextPort;
    toggle: TExoEventPort;
    expanded: TExoAttrPort;
    details: TExoChildrenPort;
    tags: TExoChildrenPort;
    count: TExoTextPort;
    addTag: TExoEventPort;
};

/**
 * The THREE ports one deck contributes to the whole-app schema.
 *
 * Its author's name is not among them — baked, like a card's `data-i` and a card's user name, for
 * the same reason all three are: a function of the index alone, constant for the life of the
 * process.
 *
 * NEITHER IS THE CARD LIST, and that one is not a bake. `DECK` declares a children port for
 * `<div class="cards">` because the eight cards it holds are a SEPARATE SCHEMA and a schema stops at
 * a component; here they are elements of this one, so the region has nothing to fill and no port to
 * name it. It is the cut this axis measures, appearing as a port on one side and as nothing at all
 * on the other.
 */
type TMonoDeck = {
    name: TExoTextPort;
    date: TExoTextPort;
    rename: TExoEventPort;
};

/**
 * THE WHOLE 10-DECK / 80-CARD APP AS ONE SCHEMA — built once, at module load, by a cursor that
 * loops twice: over the ten decks, and inside each over the eight cards it holds.
 *
 * This is the shape the schema core's own cut rule argues against (`apps/exodra/exodra.md`: "a schema
 * is ONE CONTIGUOUS STATIC REGION, so it is cut only where the markup genuinely stops being
 * fixed"), and the only way to know what the rule costs is to build the thing it forbids and
 * time both. The cursor may allocate and branch as freely as it likes here — it runs once for
 * the life of the process, which is exactly the licence `ExoSchemaCursor.ts` grants it.
 */
const MONO_APP_SCHEMA = createExoSchema((b) => {
    const decks: TMonoDeck[] = [];
    // ONE FLAT ARRAY FOR ALL EIGHTY CARDS, ACROSS THE TEN DECKS, and its position is still the
    // card's GLOBAL index: `DECK_IDX` is `0…9` in order and `cardsOfDeck(d)` is `8d … 8d+7` in
    // order, so the nested loop pushes 0, 1, … 79. The wiring below reads its loop counter as
    // the card's index and that is what keeps being true; a deck that renumbered its cards would
    // break it, which is exactly the thing `todo-spec.ts` forbids a deck from doing.
    const cards: TMonoCard[] = [];
    b.el('div', { class: 'app' }, (app) => {
        for (let m = 0; m < DECK_IDX.length; m++) {
            const d = DECK_IDX[m];
            let deckName!: TExoTextPort;
            let deckDate!: TExoTextPort;
            let deckRename!: TExoEventPort;
            app.el('div', { class: 'deck' }, (deck) => {
                // THE DECK'S NAME IS NOT BAKED, though its index is. `deckNameOf(d, name)`
                // moves on every `.ren` click of every round, in all ten decks at once.
                deck.el('h2', null, (h2) => {
                    deckName = h2.textPort();
                });
                // AND THE AUTHOR'S NAME IS BAKED — the third and last value this monolith folds
                // into its prototype, and the deck-level twin of the card's `<span class="user">`
                // two lines of markup down. `userNameOf(deckUserOf(d))` is a function of the
                // deck's index alone; two decks carry each of the five strings.
                deck.el('span', { class: 'author' }, (span) => {
                    span.text(userNameOf(deckUserOf(d)));
                });
                // AND THE DATE IS NOT BAKED EITHER, though the DATE ITSELF is constant: what is
                // rendered is `dateTextOf(deckDateOf(d), chars)`, and `chars` is the cell forty
                // tags in forty cards across all ten decks read too. A monolith may fold in a
                // user's NAME and never a user's SETTING, at either level.
                deck.el('time', { class: 'date' }, (time) => {
                    deckDate = time.textPort();
                });
                deck.el('button', { class: 'ren' }, (btn) => {
                    deckRename = btn.eventPort('click');
                    btn.text('rename');
                });
                // THE MIDDLE LIST, DISSOLVED. `DECK` has a children port here and fills it with
                // `c.list(P.cards, CARD, …)`; this has eight cards' worth of elements standing
                // in the prepared markup and no port at all.
                deck.el('div', { class: 'cards' }, (list) => {
                    const held = cardsOfDeck(d);
                    for (let n = 0; n < held.length; n++) {
                        // THE GLOBAL INDEX, never a position within the deck — every formula
                        // below takes it and a renumbered card would be a different card.
                        const i = held[n];
                        let title!: TExoTextPort;
                        let toggle!: TExoEventPort;
                        let expanded!: TExoAttrPort;
                        let details!: TExoChildrenPort;
                        let tags!: TExoChildrenPort;
                        let count!: TExoTextPort;
                        let addTag!: TExoEventPort;
                        // `class` then `data-i`, in the attrs object, which is the order the
                        // contract states and the order the cursor emits them in. `data-i` is a
                        // STATIC attribute here and a port in `CARD`, and the two serialise the
                        // same because the port's fill appends after the static `class` — which
                        // is what the gate below proves.
                        list.el('div', { class: 'card', 'data-i': String(i) }, (card) => {
                            // AND THE HEADLINE IS NOT BAKED, though the card's index is. It is
                            // `headlineOf(titleOf(i), open)`, so a `.tog` click changes it in
                            // every card and a monolith has no more right to a prototype full of
                            // it than the split app has.
                            card.el('h3', null, (h3) => {
                                title = h3.textPort();
                            });
                            // AND THE USER'S NAME IS BAKED, which is the second thing this
                            // monolith folds into its prototype and the first new one since
                            // `data-i`. `userNameOf(cardUserOf(i))` is a function of the card's
                            // index alone and cannot move for the life of the process — a user's
                            // SETTING moves, a user's NAME does not — so it goes into the
                            // prepared markup as static text where the per-component `CARD`
                            // spends a text port on it. Sixteen cards carry each of the five
                            // strings.
                            card.el('span', { class: 'user' }, (span) => {
                                span.text(userNameOf(cardUserOf(i)));
                            });
                            card.el('button', { class: 'tog' }, (btn) => {
                                toggle = btn.eventPort('click');
                                // Declared after the static `class` has reached the prepared
                                // markup, so the fill's `setAttribute` lands behind it: `class`
                                // then `aria-expanded`.
                                expanded = btn.port('aria-expanded');
                                btn.text('details');
                            });
                            details = card.childrenPort();
                            card.el('div', { class: 'tags' }, (listEl) => {
                                tags = listEl.childrenPort();
                            });
                            // A SIBLING OF `.tags`, not a child of it — putting it inside would
                            // place a static element after the tag list's children port and
                            // change what bounds that region, which is a different measurement
                            // wearing this one's name.
                            card.el('span', { class: 'count' }, (span) => {
                                count = span.textPort();
                            });
                            card.el('button', { class: 'addtag' }, (btn) => {
                                addTag = btn.eventPort('click');
                                btn.text('+');
                            });
                        });
                        cards.push({ title, toggle, expanded, details, tags, count, addTag });
                    }
                });
            });
            decks.push({ name: deckName, date: deckDate, rename: deckRename });
        }
    });
    return { cards, decks };
});
type TMonoCardState = {
    open: boolean;
    count: number;
    readonly title: string;
    readonly pool: readonly TExoCardTag[];
    readonly details: TExoPlacedChildren<TExoNode>;
    readonly tags: TExoPlacedChildren<TExoNode>;
    shownDetails: number[];
    shownTags: TExoCardTag[];
};

type TMonoState = {
    readonly users: readonly TExoBenchSource<number>[];
    round: number;
    readonly deckNames: number[];
    readonly cards: readonly TMonoCardState[];
};

const MONO_DECKS = MONO_APP_SCHEMA.ports.decks;
const MONO_CARDS = MONO_APP_SCHEMA.ports.cards;

const mMONO_APP = createExoMachine<TExoRegionWiring>(MONO_APP_SCHEMA, {
    createInitialState: (c): TMonoState => {
        const users = USER_IDX.map((u) => createExoBenchSource<number>(startChars(u)));
        const deckNames: number[] = [];
        for (let d = 0; d < MONO_DECKS.length; d++) deckNames.push(startDeckName(d));
        const cards: TMonoCardState[] = [];
        for (let i = 0; i < MONO_CARDS.length; i++) {
            cards.push({
                open: startsOpen(i),
                count: startCount(i),
                title: titleOf(i),
                pool: tagsOfCard(i).map((t) => ({ label: t.label, chars: users[t.user] })),
                details: c.childList(MONO_CARDS[i].details),
                tags: c.childList(MONO_CARDS[i].tags),
                shownDetails: [],
                shownTags: [],
            });
        }
        PENDING_MONO_ADVANCE = () => advanceMono(c);
        return { users, round: 0, deckNames, cards };
    },
});
// THE APP'S FIVE USERS AND ITS ROUND COUNTER — created here, per RENDER, exactly as the
// per-component shell creates them, because they belong to a MOUNTED APP and not to this
// module (`todo-spec.ts`, WHERE THE USERS LIVE). The monolith bakes a user's NAME into
// its prototype above; it cannot bake a SETTING, which is the whole difference between
// the two values this scene attaches to a user.

const MONO_APP = composeExoMachine(
    mMONO_APP,
    (m) =>
        withExoTransitions(m, {
            showMonoDeckName: (c: TExoRegionWiring, d: number) => {
                c.text(MONO_DECKS[d].name, deckNameOf(d, c.readState<TMonoState>().deckNames[d]));
            },
            showMonoDeckDate: (c: TExoRegionWiring, d: number) => {
                const chars = c.readState<TMonoState>().users[deckUserOf(d)].getValue();
                c.text(MONO_DECKS[d].date, dateTextOf(deckDateOf(d), chars));
            },
            showMonoOpen: (c: TExoRegionWiring, i: number) => {
                const card = c.readState<TMonoState>().cards[i];
                c.text(MONO_CARDS[i].title, headlineOf(card.title, card.open));
                c.attr(MONO_CARDS[i].expanded, expandedOf(card.open));
                const want: number[] = card.open ? [0] : [];
                card.shownDetails = reconcileExoOrder(
                    card.details,
                    card.shownDetails,
                    want,
                    want,
                    () => c.build(DETAILS)
                );
            },
            showMonoCount: (c: TExoRegionWiring, i: number) => {
                const card = c.readState<TMonoState>().cards[i];
                c.text(MONO_CARDS[i].count, tagsLabel(card.count));
                const want = card.pool.slice(0, card.count);
                card.shownTags = reconcileExoOrder(card.tags, card.shownTags, want, want, (tag) => {
                    const row = c.build(TAG);
                    writeTagLabel(
                        row as unknown as TExoMachineNode,
                        tagTextOf(tag.label, tag.chars.getValue())
                    );
                    return row;
                });
            },
            reclipMono: (c: TExoRegionWiring, cell: TExoBenchSource<number>) => {
                const chars = cell.getValue();
                const cards = c.readState<TMonoState>().cards;
                for (let i = 0; i < cards.length; i++) {
                    const card = cards[i];
                    for (let k = card.count - 1; k >= 0; k--) {
                        if (card.pool[k].chars !== cell) continue;
                        writeTagLabel(
                            card.tags.at(k) as unknown as TExoMachineNode,
                            tagTextOf(card.pool[k].label, chars)
                        );
                    }
                }
            },
            advanceMono: (c: TExoRegionWiring) => {
                const state = c.readState<TMonoState>();
                const cell = state.users[roundUserOf(state.round)];
                state.round++;
                cell.setValue(nextChars(cell.getValue()));
                reclipMono(c, cell);
            },
        }),
    (m) =>
        withExoWire(m, (c) => {
            for (let d = 0; d < MONO_DECKS.length; d++) showMonoDeckName(c, d);
            for (let i = 0; i < MONO_CARDS.length; i++) {
                showMonoOpen(c, i);
                showMonoCount(c, i);
            }
        }),
    // THE COARSE FAN-OUT, and it survives monolithising untouched: each deck date follows the SAME
    // source forty tags in forty cards read, and reads the number as a precision rather than a length.
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                const users = c.readState<TMonoState>().users;
                const stops: (() => void)[] = [];
                for (let d = 0; d < MONO_DECKS.length; d++) {
                    showMonoDeckDate(c, d);
                    stops.push(users[deckUserOf(d)].onChange(() => showMonoDeckDate(c, d)));
                }
                return () => {
                    for (let k = 0; k < stops.length; k++) stops[k]();
                };
            });
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            for (let d = 0; d < MONO_DECKS.length; d++) {
                on(MONO_DECKS[d].rename, (c) => {
                    const names = c.readState<TMonoState>().deckNames;
                    names[d] = nextDeckName(names[d]);
                    showMonoDeckName(c, d);
                });
            }
            for (let i = 0; i < MONO_CARDS.length; i++) {
                on(MONO_CARDS[i].toggle, (c) => {
                    const card = c.readState<TMonoState>().cards[i];
                    card.open = card.open === false;
                    showMonoOpen(c, i);
                });
                on(MONO_CARDS[i].addTag, (c) => {
                    const card = c.readState<TMonoState>().cards[i];
                    card.count = nextCount(card.count);
                    showMonoCount(c, i);
                });
            }
        })
);
const { showMonoDeckName, showMonoDeckDate, showMonoOpen, showMonoCount, reclipMono, advanceMono } =
    MONO_APP.transitions;

/** The monolith's advance closure, on its way out of the render that built it — the same hand-off
 *  `apps/exodra/exodra.tsx`'s `PENDING_ADVANCE` makes, whose own block carries the argument. */
let PENDING_MONO_ADVANCE: (() => void) | null = null;

/** What a mounted monolith hands back: its disposer, and the round's one app-level operation. */
interface TMonoMount {
    readonly dispose: () => void;
    /** `roundUserOf(round++)`'s setting advanced once — the LAST step of an update round, which
     *  has no button and is therefore not reachable through `clickAll`. */
    readonly advance: () => void;
}

/** Mount the monolith and hand back its disposer — the same shape every prep here uses. */
const mountExodraMono = (c: HTMLElement): TMonoMount => {
    const dispose = EXO_BACKEND.render(MONO_APP, c);
    const advance = PENDING_MONO_ADVANCE;
    PENDING_MONO_ADVANCE = null;
    if (advance === null) {
        throw new Error(
            'component-split: the monolith wire left no advance closure — `render` did not run it ' +
                'before returning, so an update round here would move no user setting and the ' +
                'gate below would diff a three-quarter round against a whole one.'
        );
    }
    return { dispose, advance };
};

export async function benchmarkComponentSplit(rounds = 60, batch = 1): Promise<void> {
    const { render } = await import('solid-js/web');

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };
    // ---------- Solid: one component (its best case for templating) ---------
    //
    // THE THREE DERIVED VALUES ARE EXPRESSED THE WAY SOLID EXPRESSES THEM — a plain function that
    // reads a signal, which Solid's own tutorial calls a DERIVED SIGNAL and which is the shape
    // `tags` here already had. Not `createMemo`: Solid's docs reserve a memo for a computation
    // that is expensive or read from several places, and each of these is one string read from
    // exactly one binding. Not the schema core's shape either — copying its state-and-transition
    // machine over here would make both sides of this axis one design measured twice, and the axis would
    // stop being about the component cut.
    //
    // `todo-app.tsx`'s `SolidApp` writes the identical three lines, which is what makes these two
    // rows the same participant this file is entitled to call `solid`.
    //
    // AND THE HANDLERS ARE REAL NOW, where both Solid rows used to carry `onClick={() => {}}`.
    // This axis times a MOUNT and never clicks, so the two spellings cost the same — one closure
    // per button either way — but an inert handler makes the sentence "the derived values move
    // when the state moves" untrue on this side of the axis, and a value that cannot move is not
    // the value the contract names. Nothing else about what is timed changed.
    //
    // AND THE DECK LEVEL IS A SECOND NESTED `<For>` AND NOTHING ELSE — no component, which is what
    // makes this the monolith. In Solid's terms a deck costs ONE signal (its name), TWO derived
    // signals (the name and the date), one closure for `.ren`, one eight-element array and one
    // nested `<For>`. Its date is a TRACKED READ of the same accessor forty tags read, so the one
    // setting write reaches both depths through Solid's own graph and nothing here arranges it.
    const SolidMonolith = (): unknown => {
        const [items] = createSignal(DECK_IDX);
        // THE APP'S FIVE USERS, CREATED INSIDE THE MOUNT AND NOT AT MODULE SCOPE — `todo-spec.ts`
        // (WHERE THE USERS LIVE) argues why: this file mounts two apps side by side in its gate,
        // and five module-level settings would be shared by both. Five signals, exactly as the
        // Exodra rows create five cells, and the same five this component's split twin is handed.
        const users: TSolidUsers = USER_IDX.map((u) => createSignal(startChars(u))[0]);
        return (
            <div class="app">
                <For each={items()}>
                    {(d: number) => {
                        const [name, setName] = createSignal(startDeckName(d));
                        // Constants of the deck, exactly as the card's title and user name are:
                        // the author never changes, and the date is an INPUT to the text rather
                        // than a part of it.
                        const author = deckUserOf(d);
                        const authorName = userNameOf(author);
                        const when = deckDateOf(d);
                        const deckName = (): string => deckNameOf(d, name());
                        // THE COARSE FAN-OUT, as a derived signal over the AUTHOR's accessor. Two
                        // decks read each of the five, one and two levels above the forty tags that
                        // read the same one.
                        const date = (): string => dateTextOf(when, users[author]());
                        // The eight cards, allocated once — `cardsOfDeck` builds a fresh array per
                        // call and `<For>` reconciles by reference, the same argument `pool` makes
                        // one level down.
                        const held = cardsOfDeck(d);
                        return (
                            <div class="deck">
                                <h2>{deckName()}</h2>
                                <span class="author">{authorName}</span>
                                <time class="date">{date()}</time>
                                <button class="ren" onClick={() => setName(nextDeckName)}>
                                    rename
                                </button>
                                <div class="cards">
                                    <For each={held}>
                                        {(i: number) => {
                                            const [open, setOpen] = createSignal(startsOpen(i));
                                            const [count, setCount] = createSignal(startCount(i));
                                            // Constant for the life of the card: an INPUT to the
                                            // headline, not a part of it, so it is computed once
                                            // and captured rather than derived.
                                            const title = titleOf(i);
                                            // AND SO IS THE USER'S NAME, which is why it is not a
                                            // derived signal: it reads `cardUserOf(i)` and nothing
                                            // that moves. `<For>` re-runs this body only when the
                                            // card list changes, and it never changes.
                                            const userName = userNameOf(cardUserOf(i));
                                            const headline = (): string =>
                                                headlineOf(title, open());
                                            const expanded = (): 'true' | 'false' =>
                                                expandedOf(open());
                                            const label = (): string => tagsLabel(count());
                                            // THE FOUR TAG POSITIONS, ALLOCATED ONCE PER CARD AND
                                            // SLICED. `tagsOfCard` allocates four objects per call,
                                            // and `<For>` reconciles by REFERENCE — so calling it
                                            // inside `tags()` would hand Solid four objects it has
                                            // never seen on every `count` change and rebuild a list
                                            // whose contents did not move.
                                            const pool = tagsOfCard(i);
                                            const tags = (): readonly TTag[] =>
                                                pool.slice(0, count());
                                            return (
                                                <div class="card" data-i={i}>
                                                    <h3>{headline()}</h3>
                                                    <span class="user">{userName}</span>
                                                    <button
                                                        class="tog"
                                                        aria-expanded={expanded()}
                                                        onClick={() => setOpen((o) => !o)}
                                                    >
                                                        details
                                                    </button>
                                                    <Show when={open()}>
                                                        <div class="details">details…</div>
                                                    </Show>
                                                    <div class="tags">
                                                        <For each={tags()}>
                                                            {(t: TTag) => (
                                                                <span class="tag">
                                                                    {tagTextOf(
                                                                        t.label,
                                                                        users[t.user]()
                                                                    )}
                                                                </span>
                                                            )}
                                                        </For>
                                                    </div>
                                                    <span class="count">{label()}</span>
                                                    <button
                                                        class="addtag"
                                                        onClick={() => setCount(nextCount)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            );
                                        }}
                                    </For>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </div>
        );
    };

    // ---------- Solid: a component per card AND per tag ----------------------
    // `JSX.Element` and not `unknown`. Annotated `unknown`, these two are not usable as JSX
    // components at all — the `<SolidTag …/>` call below is an error the checker states plainly —
    // so the Solid half of this axis, the participant our own number is compared against,
    // was written against a type that says it cannot be rendered.
    // THE TAG READS THE SETTING ITSELF, from a user handed down as a prop. That is the split shape
    // of what the monolith writes inline, and it is the only shape available: Solid's five settings
    // belong to the MOUNT (see `SolidMonolith`), so a tag component at module scope cannot close
    // over them and they arrive the way a component's inputs arrive. The accessor is called INSIDE
    // the JSX expression, which is what keeps this text a tracked read rather than a value captured
    // once — a tag whose text could not move would make this axis's tree diverge on the round.
    const SolidTag = (p: { t: TTag; chars: () => number }): SolidJSX.Element => (
        <span class="tag">{tagTextOf(p.t.label, p.chars())}</span>
    );
    // The SAME card, with the SAME derived signals and the SAME five user settings, behind a
    // component boundary — which is the only difference between this row and the one above and
    // therefore the only thing the axis is allowed to attribute a delta to.
    const SolidCard = (p: { i: number; users: TSolidUsers }): SolidJSX.Element => {
        const [open, setOpen] = createSignal(startsOpen(p.i));
        const [count, setCount] = createSignal(startCount(p.i));
        const title = titleOf(p.i);
        const userName = userNameOf(cardUserOf(p.i));
        const headline = (): string => headlineOf(title, open());
        const expanded = (): 'true' | 'false' => expandedOf(open());
        const label = (): string => tagsLabel(count());
        const pool = tagsOfCard(p.i);
        const tags = (): readonly TTag[] => pool.slice(0, count());
        return (
            <div class="card" data-i={p.i}>
                <h3>{headline()}</h3>
                <span class="user">{userName}</span>
                <button class="tog" aria-expanded={expanded()} onClick={() => setOpen((o) => !o)}>
                    details
                </button>
                <Show when={open()}>
                    <div class="details">details…</div>
                </Show>
                <div class="tags">
                    <For each={tags()}>
                        {(t: TTag) => <SolidTag t={t} chars={p.users[t.user]} />}
                    </For>
                </div>
                <span class="count">{label()}</span>
                <button class="addtag" onClick={() => setCount(nextCount)}>
                    +
                </button>
            </div>
        );
    };
    // THE SAME DECK, WITH THE SAME SIGNAL, THE SAME TWO DERIVED SIGNALS AND THE SAME FIVE SETTINGS,
    // behind a component boundary — the third level's version of what `SolidCard` is to the card
    // body inside `SolidMonolith`'s inner `<For>`. It is where Solid's template has to stop twice
    // over on this side: once at the deck and again at each of its eight cards, so the `<div
    // class="deck">` chrome is one template of five elements and the `.cards` div holds eight
    // component calls instead of eight inlined card templates.
    const SolidDeck = (p: { d: number; users: TSolidUsers }): SolidJSX.Element => {
        const [name, setName] = createSignal(startDeckName(p.d));
        const author = deckUserOf(p.d);
        const authorName = userNameOf(author);
        const when = deckDateOf(p.d);
        const deckName = (): string => deckNameOf(p.d, name());
        const date = (): string => dateTextOf(when, p.users[author]());
        const held = cardsOfDeck(p.d);
        return (
            <div class="deck">
                <h2>{deckName()}</h2>
                <span class="author">{authorName}</span>
                <time class="date">{date()}</time>
                <button class="ren" onClick={() => setName(nextDeckName)}>
                    rename
                </button>
                <div class="cards">
                    <For each={held}>{(i: number) => <SolidCard i={i} users={p.users} />}</For>
                </div>
            </div>
        );
    };
    const SolidSplit = (): unknown => {
        const [items] = createSignal(DECK_IDX);
        const users: TSolidUsers = USER_IDX.map((u) => createSignal(startChars(u))[0]);
        return (
            <div class="app">
                <For each={items()}>{(d: number) => <SolidDeck d={d} users={users} />}</For>
            </div>
        );
    };

    const solidPrep = (App: () => unknown) => (): Scenario => {
        const c = el();
        const dispose = render(() => App() as never, c);
        return {
            measure: () => {},
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // The harness times `measure()`, so mounting has to happen there — build the
    // container in prepare, mount inside the timed region.
    const timedSolid = (App: () => unknown) => (): Scenario => {
        const c = el();
        let dispose: (() => void) | null = null;
        return {
            measure: () => {
                dispose = render(() => App() as never, c);
            },
            cleanup: () => {
                dispose?.();
                c.remove();
            },
        };
    };
    // The schema core's two: the app as five components, and the app as one schema. Both mount
    // inside the timed region like everyone else here; both hand back a disposer.
    const timedExodraSplit = () => (): Scenario => {
        const c = el();
        let app: { teardown(): void } | null = null;
        return {
            measure: () => {
                app = mountExodraApp(c);
            },
            cleanup: () => {
                app?.teardown();
                c.remove();
            },
        };
    };
    const timedExodraMono = () => (): Scenario => {
        const c = el();
        let mono: TMonoMount | null = null;
        return {
            measure: () => {
                mono = mountExodraMono(c);
            },
            cleanup: () => {
                mono?.dispose();
                c.remove();
            },
        };
    };
    void solidPrep;

    // GATE — the WHOLE-APP schema against the per-component one. `exodra` (the per-component
    // variant) is `apps/exodra/exodra.tsx`, the suite's markup reference, so it is the thing
    // everything else is measured against and has nothing above it to be diffed against here.
    // `exodraMono` is new to the repository and does have to be shown to build the same tree
    // before it is timed.
    //
    // It is diffed in TWO states, mounted and after an update round — the update is where a
    // whole-app schema would give itself away, because 590 ports numbered in one pass (seven per
    // card: three derived values, two events, two regions; three per deck: two derived values and
    // one event) is exactly the kind of thing that comes out right for card 0 and wrong for card 79.
    // The update round moves five of the card's seven — the headline, `aria-expanded`, the count
    // label, the details region and the tag list — and one or two of the deck's three: every deck's
    // `<h2>` on the `.ren` click, and the `<time class="date">` of the TWO decks whose author is the
    // user this round advanced. The dates are the sharpest of the lot, because a monolith that
    // subscribed a deck to the wrong one of the five settings passes the mount diff and fails here.
    {
        const splitC = el();
        const split = mountExodraApp(splitC);

        const monoC = el();
        const mono = mountExodraMono(monoC);
        gateMarkup('component-split', 'as mounted', 'exodraMono', splitC, monoC);
        split.flip();
        // THE MONOLITH'S OWN ROUND, IN THE ORDER `AppHandle.flip` FIXES — the ten renames first,
        // then the two card clicks, then the one user setting the reference's `flip` advanced on the
        // line above. A round that stopped after the clicks would leave forty tags and two dates in
        // this tree showing the previous setting and the diff below would fail on the first of them.
        // THE RENAMES LEAD because that is the contract's order and not because the end state needs
        // it: a deck's name and a card's state are independent here, so the bytes would agree either
        // way and the amount of work would not — which is the one difference a byte gate cannot see.
        clickAll(monoC, '.ren');
        clickAll(monoC, '.tog');
        clickAll(monoC, '.addtag');
        mono.advance();
        gateMarkup('component-split', 'after one update round', 'exodraMono', splitC, monoC);
        split.teardown();
        splitC.remove();
        mono.dispose();
        monoC.remove();
    }

    await abBench(
        'COMPONENT SPLIT — mounting the same 10-deck / 80-card app, monolith vs per-component',
        'ms/mount',
        {
            exodra: timedExodraSplit(), // schema core, APP + DECK + CARD + TAG + DETAILS
            exodraMono: timedExodraMono(), // schema core, the whole app as ONE schema
            solid: timedSolid(SolidMonolith), // solid, one component  ← its best case
            svelte: timedSolid(SolidSplit), // solid,  Deck + Card + Tag components
        } as never,
        {
            rounds,
            batch,
            // ONE ROW OF FOUR CARRIES A NUMBER, and the three `—`s are the honest output rather
            // than an oversight. `exodra` is the reference app, which lives in files of its own and
            // is counted. The other three — the whole-app schema, and Solid written as one
            // component and as three — are declared INSIDE this file, so there is no app file to
            // count and no rule about line ranges will be invented to produce one.
            //
            // AND THE ROW CALLED `svelte` IS A SOLID COMPONENT. That is this axis's own label for
            // the split Solid variant, and it is exactly why the mapping below is written out
            // instead of read off the row name: an identity mapping would have charged this row
            // Svelte's line count, which would be a lie with a plausible name on it.
            appLines: appLines({
                exodra: 'exodra',
                exodraMono: null,
                solid: null,
                svelte: null,
            }),
            record: { section: null, unit: 'ms', per: 'mount' },
        }
    );
}
