# The Solid participant — and the scene every participant shares

The first six sections below are about **all five third-party participants** (solid, react, voby,
svelte, marko), not about Solid alone. They live here because they were written as one header and
splitting an argument in three would lose it. `apps/react/react.md` and `apps/voby/voby.md` point at
them.

---

## The scene

THE one realistic todo app the third-party field is measured with — initial-render mounts it,
app-update mounts it and fires the fat update batch. Defined ONCE here so the two axes can never
diverge. TEN DECKS of eight cards each — 80 cards in all, the population this app has always had —
every card with a details TOGGLE (conditional mount/unmount) and a DYNAMIC tag list whose length
cycles 1→2→3→4→1, and every deck with a name it is RENAMED out of once a round and a date rendered
at its author's setting. The Exodra side of the same app lives in `apps/exodra/exodra.tsx`, which
is also
the markup reference every participant here is diffed against.

Fairness baked in: the tag list is reconciled DECLARATIVELY in every framework — "here is the new
tag array, reconcile it" — so nobody gets an imperative-list advantage, and every participant keys
its tags by the tag string so kept nodes are REUSED rather than rebuilt. React needs `flushSync` for
native-dispatched clicks to commit; svelte/voby/marko get their own synchronous flush for the same
reason.

## The three derived values, and why the three participants here express them differently

The app used to render nothing but constants — `Task ${i}`, a tag's own label — so a click caused a
children reconcile and nothing else, and the REACTIVE HALF of every framework in this file was never
exercised at all. `todo-spec.ts` now defines three values that are functions of the card's state:
`headlineOf(title, open)` (the `<h3>` text), `expandedOf(open)` (the `.tog` button's
`aria-expanded`) and `tagsLabel(count)` (the new `.count` span beside `.tags`). The formulae are
IMPORTED from the spec by everybody — nobody re-spells "clip at fourteen and append an ellipsis" —
and the markup they produce is byte-gated against `apps/exodra/exodra.tsx`.

WHERE a framework calls them is its own idiom's business, and the three below genuinely differ. That
difference is the measurement; flattening it into one shape would be the bent version:

-   **solid** — DERIVED SIGNALS — a plain function that reads a signal, which is what Solid's own
    tutorial calls a derived signal and what this file already did for `tags`. No `createMemo`:
    Solid's docs reserve a memo for a computation that is expensive or read from several places, and
    each of these is one string read from exactly one place.
-   **react** — RECOMPUTED IN THE COMPONENT BODY, as `const`s beside the existing `tags` slice.
    React's model is that the whole function runs again on every state change, so that is the whole
    mechanism. No `useMemo` — memoising a `slice(0, 14)` is not what a React author writes.
-   **voby** — A FUNCTION PASSED WHERE THE VALUE GOES. voby's readme: an attribute or child accepts
    "the plain value, an observable to that value, or a function to that value", and a function makes
    that one position fine-grained. Same shape this file already used for the conditional child and
    for `<For values>`.

So solid and voby allocate a closure per value per card and recompute only when the state that value
reads moves; react allocates nothing and recomputes all three whenever the card renders, whether the
value moved or not. That is the honest split, not a handicap.

## The five users — one shared write, forty tags in forty cards, in five different frameworks

The app used to be 80 INDEPENDENT CARDS: every value any of them rendered belonged to that card
alone, so every write this suite ever measured moved exactly one subtree and no axis could say what
a write costs when a hundred rows read it. `todo-spec.ts` (THE USERS) now gives each mounted app
FIVE USERS, and hangs two things off them that are deliberately different in kind:

-   **A NAME** — `userNameOf(cardUserOf(i))`, rendered by every card in a `<span class="user">`
    between the `<h3>` and the `.tog` button. Sixteen cards render `Ada`. IT NEVER MOVES, and it is
    the control: a participant that allocated the right to recompute it bought nothing at all.
-   **A SETTING** — `chars`, how many characters of a TAG's name that user wants shown. A tag's text
    is `tagTextOf(t.label, chars[t.user])` — a value of TWO ENTITIES, the tag and a user most of whose
    other tags live in other cards — and THE ROUND'S LAST STEP advances one user's setting, which has
    to end with 40 tag texts changed in 40 subtrees AND the dates of the two DECKS that user authored,
    one level below the shell.

THE FIVE SETTINGS AND THE ROUND COUNTER BELONG TO A MOUNTED APP, NEVER TO THIS MODULE. Every gate in
this suite stands two apps side by side and drives them independently; five module-level cells would
be shared by both, each round would advance one setting twice, and both trees would still agree —
every byte diff in the package passing over a scene running at double speed. So each of the five
participants below creates its own five inside its own mount.

## The third level — what a deck is in Solid, in React and in voby

The eighty cards no longer stand in the shell. TEN DECKS stand there, each holding eight of the same
cards by GLOBAL index (`cardsOfDeck(d)`, so every per-card formula still reads the `i` it always
read), and each rendering four values of its own: a NAME that is the only state at this level and
the round's new `.ren` click moves, an AUTHOR name that can never move, a DATE rendered through that
author's shared setting, and the rename handler. `todo-spec.ts` (THE DECKS) argues the scene and
`apps/exodra/exodra.md` carries the markup; this block is only about what the three participants
written in
this file had to allocate to render it, and what that buys them.

-   **solid** — THE `<For>` CALLBACK OVER `DECK_IDX` IS THE DECK. `mapArray` calls its mapper inside a
    `createRoot` per row (`solid-js/dist/solid.cjs`), so the `createSignal` the callback opens for the
    deck's name is owned by that row and disposed with it — the same ownership the card callback one
    level down has always had, which is why no `<Deck>` component is written around it: it would wrap
    a function Solid already treats as one. BOTH CALLBACKS ARE NAMED (`deck`, `card`) rather than
    written inline, which allocates precisely what the inline arrows allocated — one function object
    per mounted app, because `SolidApp` runs once — and keeps the card's body from standing four
    levels deeper. `mapArray` reads nothing off a mapper but its arity, and both take one argument as
    the arrows did. IT BUYS the deck's two moving values their own effects: a rename rewrites one
    `<h2>` text and touches nothing else in the deck, and an advance rewrites two `<time>` texts. IT
    COSTS, per deck and ten times over: one signal, two derived closures, one handler, the eight-index
    array its card list is built from, and the root `mapArray` opens for it.
-   **react** — `ReactDeck`, A COMPONENT WITH ITS OWN `useState` FOR THE NAME. The settings array is
    still ONE `useState` at the app top and now travels app → deck → card, a plain prop at each hop.
    No `useMemo`, no `React.memo`, no context and no store: the row is React's model as an author
    writes it, which is the same reason the card level has none. IT BUYS nothing at the deck level
    that it did not already have at the card level — and that is the point of the row. IT COSTS one
    hook per deck, plus a deck's five elements and its `cardsOfDeck` array rebuilt on every render of
    it, and every round it recomputes ten deck names and ten dates in order to change ten and two of
    them.
-   **voby** — A BUILDER FUNCTION, `vobyDeck(d, chars)`, whose three texts are three thunks in the
    positions the values go. Its name is an OBSERVABLE and nothing that carries ownership, and that is
    forced rather than preferred: `vobyApp(...)` runs BEFORE `render()` opens a root, so a deck that
    allocated an owned node would hang it on `oby`'s `SUPER_OWNER` and `teardown` would never reach it
    (see the voby row under THE FIVE USERS, which found the same wall for the memo table). IT BUYS
    per-value granularity at the deck exactly as at the card. IT COSTS one observable, three thunks,
    one handler and the eight-index array per deck.

## Where each of the five puts the clip, which is the only thing that differs between them

One advance produces AT MOST FOUR DISTINCT STRINGS for forty text nodes (four labels, one setting).
A participant whose idiom lets it derive per (user, label) computes four; one that recomputes at the
tag computes forty. `todo-spec.ts` states that BOTH ARE LEGITIMATE and claims neither of anybody —
which of them a framework can express is what this axis is for.

SINCE THE DECKS ARRIVED, ONE ADVANCE MOVES TWO DEPTHS AT ONCE: the same 40 tag texts at depth three,
AND the dates of the TWO decks that user authored at depth one, where the very same number is read
as a PRECISION rather than as a length (`dateTextOf`). So each row below answers the question twice
over one write, at two fan-outs — forty readers and two — and the deck half is the one with real
formatting cost behind it rather than a `slice`. So:

-   **solid** — SHARES IT. `createMemo` per (user, label) — TWENTY memos per mounted app,
    `clip[u][j]`, created in the app component and therefore owned by `render()`'s root and disposed
    with it. A memo is a graph node with a subscriber SET, so forty readers are forty links and not
    forty parents; sharing it is safe here in a way it is NOT in Sinuous, whose `computed` is
    tree-owned (see `apps/sinuous/sinuous.md`'s note on the same choice). This is also the one place
    in this
    file where Solid's own rule for reaching for a memo — "expensive, or read from several places" —
    is actually satisfied: the three card-level derived values above are each read from exactly one
    place and stay plain derived signals.

    ITS TEN DATES DO NOT GET THE SAME TABLE, and the deciding fact is the reader count and not the
    cost. `clip[u][j]` exists because TWENTY combinations serve two hundred tags; a deck's date is
    `dateTextOf(deckDateOf(d), …)` and the date is a constant OF THE DECK, so ten decks are ten
    distinct values with ONE reader each — even the two decks a user authors share nothing but the
    setting. A memo there would be a graph node whose subscriber set has one member, and it would not
    make `dateTextOf` cheaper: it would recompute exactly as often as the derived signal it replaced —
    once per advance of that author — and add a hop between the setting and the one effect that writes
    the text. Both halves of Solid's rule fail, so the date stays a plain derived signal like the
    card's.

-   **voby** — RECOMPUTES PER TAG — a thunk in the child position, `() => tagTextOf(t.label,
chars[t.user]())`, the same shape as this row's other three derived values. A twenty-memo table
    was available and is NOT taken, for a reason that is about this row's structure rather than about
    voby: `createElement` evaluates its children eagerly at the call site
    (`voby/dist/methods/create_element.js` returns a lazy `wrapElement` thunk, but its arguments are
    already built), and this participant calls `vobyApp(...)` BEFORE `render()`, so everything it
    constructs is created outside any root. `oby` starts with `OWNER = SUPER_OWNER`
    (`oby/dist/context.js`), so twenty memos built there would be owned by a root that lives as long
    as the process and would not be disposed by this row's `teardown`. Observables have no such
    ownership, which is why the five SETTINGS are fine out there and a memo table is not.

                THE DECK'S DATE IS A FOURTH THUNK OF THE SAME KIND, `() => dateTextOf(when, chars[author]())`, and
                voby subscribes a function child, so an advance reformats the two decks whose author moved and
                leaves the other eight alone. The same ownership finding decides what a deck may hold: its name is
                an OBSERVABLE because an observable has no owner, and it is nothing else for the reason the memo
                table is not taken.

-   **react** — RECOMPUTES PER TAG, AND FANS OUT TO EVERY CARD. The five settings are ONE `useState`
    in `ReactApp` and travel to the cards as a prop, so an advance re-renders the app and all eighty
    cards — each recomputing its own headline, its own label and every tag it shows. That is not this
    file bending React: it is React's model (state moved, so the tree runs again), and it is the same
    set of cards a `useContext` would wake, since every card holds a position of four of the five
    users. No `useMemo`, `React.memo` or store here for the same reason there is none above.

    THE SETTINGS NOW TRAVEL THROUGH THE DECK — app → deck → card, one prop at each hop — so an advance
    re-renders ten deck bodies as well as the eighty cards, and each of the ten reformats its date
    whether its author moved or not: ten `dateTextOf` calls for the two texts that changed. A rename
    is the same model pointed the other way: `setName` inside one `ReactDeck` re-renders that deck and
    its eight unmemoised cards. Inside `flip`'s one `flushSync` all four steps collapse into a SINGLE
    render pass, so what a round costs React is one pass over the whole tree — what it already cost,
    plus ten deck bodies.

-   **svelte** — RECOMPUTES PER TAG, WITH EXACT FAN-OUT. The settings are one `$state` array in
    `CardsDyn.svelte`, passed down as a prop; `$state` proxies an array PER INDEX, so `chars[u] = …`
    wakes only the template effects that read index `u` — the forty mounted tags of that user and
    nothing else. A shared derivation was possible and is worse here: a `$derived` table would have to
    be read through the array it lives in, which makes every card depend on all five settings and
    turns an exact fan-out into a total one.
-   **marko** — RECOMPUTES PER TAG, AND ITS SETTINGS ARE NOT ITS OWN — see THE MARKO PROBLEM below.

## The Marko problem, stated rather than engineered around

THE ROUND'S LAST STEP IS NOT A CLICK AND HAS NO BUTTON (`AppHandle.flip`), so a participant runs it
by calling its own advance closure. Every other row here holds one: a Solid setter, a voby
observable, a React state setter, a Svelte instance export. A MOUNTED MARKO TEMPLATE HAS NO SUCH
THING. Its entire outside surface is `{ value, update(input), destroy() }` — read off
`marko/dist/dom.mjs`'s `mount`, and the same fact `MkToggle.marko` records as "Marko cannot export
an instance method the way `SvToggle.svelte` exports `setRows`". A `<let>` inside the compiled
template is unreachable from here.

SO MARKO'S FIVE SETTINGS LIVE IN THE MOUNT CLOSURE AND ARRIVE AS INPUT, and the advance closure
replaces the array and calls `inst.update({ cards, chars })`. That is Marko's own controlled-state
idiom — `MkToggle.marko` is advanced the identical way, and `app-update.tsx` names it as the shape
that WOULD be drivable — and it is one per mounted app, so nothing is shared between two apps in a
gate. WHAT IT IS NOT is the same arrangement as the other four: the setting is not a cell inside
Marko's graph that an outsider writes, it is new INPUT, and Marko propagates a changed input
property to every card that reads it. The `chars` array changes identity on every advance, so the
tag text of EVERY MOUNTED TAG of every card is recomputed, not the forty of the user that moved.
Read off this file's control flow and Marko's signal model, NOT MEASURED — and it is the reason
marko's number on `exodra-app-update` should not be pasted beside svelte's.

MARKO IS STILL NOT DRIVABLE THROUGH `card-driver.ts` AND STILL REGISTERS NOTHING THERE, which is
unchanged: a card's `<let/open>` and its `onClick` body are inside the compiled template. It is not
a participant on `app-update` for exactly that reason (see that file's header) and this change does
not make it one — `update(input)` reaches the APP's state and never a card's.

THE THIRD LEVEL DID NOT MOVE THAT LINE IN EITHER DIRECTION, and it is worth saying which half of the
deck falls on which side. A DECK'S NAME IS NOT THE SETTINGS' PROBLEM: a rename IS a click, so the
deck's one integer is an ordinary `<let>` in `DeckDyn.marko` exactly as a card's `open` is, and this
row registers no rename with `card-driver.ts` for the same reason it registers no card pair — the
`<let>` and the `onClick` body are both inside the compiled template. A DECK'S DATE IS the settings'
problem, in the same shape as a tag's clip and one level shallower: the array arrives as input and
changes identity on every advance, so all TEN dates are recomputed where Svelte's per-index proxy
and Solid's per-author derivation recompute the TWO whose author moved — and `dateTextOf` is the
app's most expensive value to recompute. Read off the control flow, NOT MEASURED.

---

# The machinery in `todo-app.tsx`

## Why the spec is a separate file, and why every name is re-exported

The app's numbers and the two DOM helpers live in `todo-spec.ts`, which imports no framework, so a
participant that is BUILT ON ITS OWN (bench/build/) can take them without taking the whole field
with them. Re-exported here unchanged: every existing
`import { IDX, el, clickAll, type AppHandle } from './todo-app'` keeps working.

Every name in `todo-spec.ts` is re-exported, including the ones this file does not itself use
(`TITLES`, `TITLE_CLIP`, `USERS`, `USER_NAMES`, `CHARS_MIN`, `CHARS_SPAN`, `tagUserOf`, and the deck
half's `DECKS`, `CARDS_PER_DECK`, `deckOfCard`, `DECK_TITLES` and the four name tables), because
that file's header states the rule as "re-exports every name below" and a re-export list that is
nearly complete is worse than one that is: it makes an importer guess which half of the spec came
through here. The users half was added to this list when the scene gained it, and until it was, this
rule was already broken. The deck half was added the same day the decks were.

## The other door into a card

THE OTHER DOOR INTO A CARD — see `card-driver.ts`. Solid's, React's and voby's cards declare their
two handlers here so `app-update` can run an update round with no synthetic event, and each of those
three mounts declares its ROUND OPERATION — the advance of one user's setting, which is a third of a
round and the only part of it no card owns. Svelte declares its pair from inside `CardDyn.svelte`
and its round operation from the mount below, which is where the instance export that performs it is
reachable. Marko declares NEITHER; see THE MARKO PROBLEM above.

A DECK DECLARES ITS ONE RENAME THE SAME WAY (`noteDeckOps`), from inside the deck itself and never
from the mount around it: the handler the `.ren` button carries and the handler the called round
calls have to be ONE closure over ONE deck's state, and the only place both facts are in scope is
the deck.

## `TSlot` — where a mounted app hands something out of its own render

WHERE A MOUNTED APP HANDS SOMETHING OUT OF ITS OWN RENDER — one mutable slot, filled by the app
component while it renders and read by the mount that built it.

IT EXISTS FOR ONE REASON WORTH WRITING DOWN: the round's third step writes state that lives INSIDE a
component (a Solid signal, a React `useState`), so the only place that can reach it is in there —
while `flip` and `card-driver.ts` need the very same door from out here. A slot passed in as a prop
is the smallest thing that carries one function out of a render.

`value` is `null` until the app component has rendered; the mount refuses to proceed if it still is.

`takeSlot` reads a filled slot, or says which participant left it empty. A row whose advance never
arrived runs a two-thirds round: 160 card writes, no shared write, and the fastest number in the
table.

## The two compiled participants' input and output types

`TMarkoInput` is what `CardsDyn.marko` is mounted and updated with. The five settings are in it
because Marko has no other way to receive them — see THE MARKO PROBLEM above.

`TSvelteAppExports` is what `CardsDyn.svelte` exports from its instance script — the round's one
app-level operation. Svelte is the only compiled participant here that can export one; `svMount`
returns the component's exports, which is how `SvToggle.svelte` already hands out `setRows`.

## `loadMounts()`

Dynamically import the runtimes and return per-framework `mount(container)` → `{ flip, teardown }`.
Both benches build their scenarios from this SAME map.

Marko 6: compiled signals + walk-coded template. Authored as a `.marko` component (the only way
Marko is written) mirroring `CardDyn.svelte` exactly. `update(input)` IS DECLARED HERE FOR THE FIRST
TIME, and it is the whole of what this row can be advanced with — see THE MARKO PROBLEM above. The
shape is read off `marko/dist/dom.mjs`'s `mount`, which returns
`{ get value, set value, update, destroy }`.

Marko batches on its own queue; `run()` drains it synchronously so an update commits inside the
measured region — same treatment as react/svelte/voby.

Svelte 5 batches updates; `flushSync` forces them inside the timed region.

## The Solid adapter

THE SLOT THE APP FILLS WHILE IT RENDERS. `render()` runs the component synchronously, so it is
filled by the time this returns, and `takeSlot` refuses the mount if it is not — a solid row with no
advance would run 160 card writes and no shared write at all.

DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls below — the called round and
the clicked round advance one counter over one set of five signals.

`flip` runs the same update round every framework runs, in `AppHandle.flip`'s order: rename every
DECK, toggle every details block, advance every tag list, then advance ONE USER'S SETTING. Solid
commits inside the write, so all four have committed by the time the last call returns and this row
still declares no `commit`.

## The Svelte adapter

THE COMPONENT'S OWN INSTANCE EXPORT — `svMount` returns a component's exports, which is how
`SvToggle.svelte` already hands `setRows` to its axis. The function object taken out here is the one
`CardsDyn.svelte` declared over its own `$state` settings, so `flip` and `card-driver.ts` are handed
the same object and not two spellings of it.

THE TEN RENAMES ARE NOT TAKEN OUT HERE, and they could not be: a deck's name is a `$state` inside
`DeckDyn.svelte` and `svMount` returns the exports of the ROOT component only. Each deck declares
its own rename to `card-driver.ts` from its own instance script — which is exactly where
`CardDyn.svelte` already declares its pair, and it is the same door for the same reason: the closure
the `.ren` button carries and the closure the called round calls have to be one object over one
deck's state.

THE PARTICIPANT'S OWN COMMIT — the very flush its `flip` runs, published so an axis that calls the
handlers directly still stops the clock only after Svelte has committed. Declared by the
participant, never inferred; see `AppHandle.commit`.

## The Marko adapter

MARKO'S FIVE USERS LIVE OUT HERE, BECAUSE THERE IS NOWHERE INSIDE TO REACH — see THE MARKO PROBLEM
above before reading this row's number.

ONE ARRAY AND ONE COUNTER PER MOUNTED APP, exactly as every other row holds; what differs is that
they are not cells in Marko's graph. The advance REPLACES the array — Marko compares an input
property by identity, so a mutated array in place would arrive as unchanged and forty tags would
stand still — and pushes it in with `update`, which is the same door `MkToggle.marko` is advanced
through.

NOTHING IS REGISTERED WITH `card-driver.ts`. A card's `<let/open>` and its `onClick` body are inside
the compiled template and unreachable, so this row is not a participant on `app-update` and this
change does not make it one: `update(input)` reaches the APP's state and never a card's.

THE DECK LEVEL DOES NOT WIDEN OR NARROW ANY OF THAT. A deck's NAME is a `<let>` inside
`DeckDyn.marko`, because a rename IS a click and needs no outside reach; a deck's DATE reads the
settings that arrive as input, so it is propagated exactly as a tag's clip is, with the same
consequence — the array changes identity, so all TEN dates recompute where a per-index or per-author
mechanism recomputes the two that moved.

---

# `apps/solid/solid.tsx` — the Solid app itself

## The app's own state

THE SHELL'S LIST IS THE TEN DECKS NOW, and the eighty cards hang off them eight at a time.

THE APP'S FIVE USERS, ITS TWENTY CLIPS AND ITS ROUND COUNTER — all three per MOUNT, because this
function runs once per `render()` and its signals belong to that render's root.

## `clip[u][j]` — the one memo

`clip[u][j]` — user `u`'s setting applied to the label at tag position `j`. TWENTY memos for two
hundred tags, and the only place in this file that uses `createMemo` at all.

WHY A MEMO HERE AND NOWHERE ELSE. Solid's own guidance reserves a memo for a computation that is
expensive or READ FROM SEVERAL PLACES; the three card-level derived values are each read from
exactly one place and stay plain derived signals, and this one is read by every mounted tag in the
app that has this user AND this label — about ten of them, in ten different cards. An advance
therefore recomputes FOUR strings and forty effects assign them, instead of forty `slice`s. See THE
FIVE USERS in the header for why this is a legitimate shape and not a cheaper program than the
field's.

SAFE TO SHARE, which is not true of every fine-grained library: a Solid memo is a graph node with a
subscriber set, so forty readers are forty links. `apps/sinuous/sinuous.md` carries the opposite
finding
about its own `computed`, which is tree-OWNED and would let the first reader become the clip's
parent and dispose it later.

## The round's one app-level operation

THE ROUND'S ONE APP-LEVEL OPERATION, handed out through the slot. One `set` on one signal; the four
memos that read it go dirty and the effects that read THEM write their Text nodes, all inside the
call — Solid commits synchronously, so this row declares no `commit`.

## One card

ONE CARD — the very function the shell's `<For>` callback has always been, now named so the deck
below can hand it to a `<For>` of its own without this body standing four levels deeper. NOTHING
ELSE MOVED: it sat in this same body as an inline arrow and was allocated once per mounted app then
as now, `mapArray` reads nothing off a mapper but its arity (`solid-js/dist/solid.cjs`), and it
still takes the item and nothing else — so what a row creates, and which root owns it, are what they
were.

The title never moves, so it is computed once per card and captured — it is an input to the
headline, not a part of it. The card's USER NAME is the same kind of value and is read once here for
the same reason: `{user}` is an IDENTIFIER in the markup below and Solid's compiler leaves an
identifier static, where `{userNameOf(cardUserOf(i))}` would be a CALL and would buy an effect per
card for a string that cannot change.

THE THREE DERIVED VALUES AS DERIVED SIGNALS, in the same shape `tags` below has always had: a
function that reads a signal, re-run by whichever binding reads it when that signal moves.
`aria-expanded` is asserted to the two literals Solid's JSX types accept there
(`boolean | "true" | "false"`), which is exactly the pair `expandedOf` returns — the spec types it
`string` because an attribute is a string everywhere else in the field.

THIS CARD'S FOUR TAG POSITIONS, RESOLVED TO THE SHARED CLIPS ONCE. `<For>` reconciles by ITEM
IDENTITY, and a memo is a stable object for the life of the app, so the item IS the clip — a card
allocates one array of four references and nothing per update. `tagsOfCard(i)[j].user` is
`(i + j) % 5`, so the four positions land on four DIFFERENT users' rows of the table and are
distinct items within this card's list. A tag then renders `{t()}` — a CALL, so the compiler makes
it an effect over the memo, the same mechanism `{headline()}` gets pointed at a node ten other cards
also read.

THE TWO EVENT CLOSURES, NAMED RATHER THAN INLINE, so the SAME pair reaches both `onClick` props AND
`card-driver.ts` — the door `app-update` drives this row through with no synthetic event. Solid
allocates the same two closures either way; only their spelling moved.

## One deck

ONE DECK — the third level, and in Solid it is a `<For>` callback exactly as a card is: `mapArray`
calls its mapper inside a `createRoot` per row, so the signal opened here is owned by that row and
disposed with it. That is why nothing wraps it in a `<Deck>` component.

THE DECK'S OWN STATE — ONE INTEGER, an index into `DECK_TITLES`, and the only state at this level.
It is the deck's counterpart to a card's `open` and `count`, and the rename below is the only thing
that writes it.

The author is a user id; the NAME it renders cannot move, so it is read once here and the markup
holds an identifier — the same reason a card reads its `user` once.

THE DATE, DERIVED OVER THE ONE THING THAT CAN MOVE. The deck's own date is a constant and is
captured, exactly as a card's title is captured into its headline, so the derivation reads one
source: the AUTHOR'S setting — the same cell forty tags two levels down read, and this reads it as a
precision rather than as a length. A derived signal and not a memo: one reader, and a memo would
recompute `dateTextOf` just as often (see the header).

THE RENAME, NAMED FOR THE SAME REASON THE CARD'S PAIR IS: the button and `card-driver.ts` are handed
one closure over one deck's signal, never two spellings of a rename.

THIS DECK'S EIGHT CARDS, BY GLOBAL INDEX, allocated once — a FIXED list, and `cards` is an
identifier so the compiler leaves `each` static instead of memoising a call.
