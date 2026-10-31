# The LIT participant

THE same 10-deck / 80-card todo app as the reference in `apps/exodra/exodra.tsx`, written in LIT
(lit-html 3). Same data (imported from todo-spec, never re-declared), same decks, same cards,
same details toggle, same dynamic tag list, same two handlers per card and one per deck.

## WHY LIT IS IN THIS COMPARISON

It is the closest neighbour to the schema core that has NO compiler. Lit prepares each tagged
template literal ONCE per call site — the HTML string is parsed into a `<template>` and the
positions of its dynamic parts are recorded — and then, for every instance, it clones that template
and RE-WALKS the clone with a `TreeWalker`, counting nodes until it reaches each recorded position,
to bind that instance's parts. The schema core claims the walk is unnecessary: a port's address is a
NUMBER decided once at module load and a render replays a prepared hop list. Lit is the honest
control for that claim, because everything else about the two is the same shape — no build step, one
prepared template per shape, per-instance binding objects.

## HOW THIS APP IS STRUCTURED, and why it is not one big `render()`

-   lit-html's unit of update is a RENDER ROOT — `render(template, container)` owns the children of
    `container` and patches them in place. Lit's own component layer (LitElement) makes each
    component's render root the component's own element (`createRenderRoot()` returns `this` when
    shadow DOM is off), so an update re-runs ONE component's template, not the whole page.
-   This app cannot use LitElement, because a `<card-view>` custom element would be an EXTRA ELEMENT
    and the markup gate counts elements. So it does what LitElement does, minus the custom element:
    the card's `<div class="card">` IS its render root. A shell render creates the app div and the
    empty card divs (that is where `data-i` is bound, since it is an attribute OF the card element and
    therefore outside the card's own render root), and then each card's contents are rendered INTO its
    card div.
-   Rendering the whole app from one root would have been simpler and is what lit.dev shows for a
    page-sized template, but it would mean every click re-evaluates all 80 card templates. That is not
    how a Lit app is written and it would understate Lit here.

## THE THIRD LEVEL — A DECK IS A RENDER ROOT, AND SO IS ITS `.cards` DIV

The scene gained ten DECKS, each holding eight of the same eighty cards (`todo-spec.ts`, THE DECKS).
A deck has three texts, one handler and one state field, so in LitElement it would be one more
component with one more render root — and this app does what it already did one level down, minus
the custom element: THE DECK'S `<div class="deck">` IS ITS RENDER ROOT.

### THE SPLIT TAKEN, AND THE ONE IT WAS TAKEN AGAINST

FOUR KINDS OF ROOT, 101 IN ALL where the two-level app had 81:

| count | root                | what it is                                                                                                        |
| ----- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1     | the app shell       | `<div class="app">` + 10 EMPTY `<div class="deck">`                                                               |
| 10    | a deck's body       | `<h2>`, `<span class="author">`, `<time class="date">`, `<button class="ren">` and an EMPTY `<div class="cards">` |
| 10    | a deck's card shell | the 8 `<div class="card" data-i=…>` of `cardsOfDeck(d)`, rendered INTO that deck's `.cards` div                   |
| 80    | a card's body       | unchanged, rendered into its card div                                                                             |

THE THIRD ROOT IS THE ONE WORTH ARGUING, because the obvious alternative is to have none: put the
eight card divs in `deckBody` as a ChildPart inside `<div class="cards">` and let the deck's own
template own them. Lit would still not re-render a card's CONTENTS on a rename — those live in the
card's own root and lit never touches the children of an element that is static in somebody else's
template — but every rename would re-evaluate `cardsOfDeck(d).map(…)`, allocate eight
`TemplateResult`s and walk `ChildPart._commitIterable` over eight child parts, each re-committing a
`data-i` `AttributePart` that dirty-checks equal. Ten renames a round is 80 template results and 80
attribute re-commits per round for a list that CANNOT CHANGE — this row doing work the contract does
not ask anybody for, on the axis the rename was added to.

SO THE `.cards` DIV IS A ROOT OF ITS OWN AND THE DECK'S TEMPLATE MENTIONS NO CARD AT ALL. What that
costs is stated in full: ten more `render()` calls at the MOUNT, ten more root `ChildPart`s, and ten
more pairs of marker comments in the tree (stripped by the gate, counted by nobody). What it buys is
that a rename's whole reach is the four parts of one deck body.

### WHAT A DECK'S PARTS COST, AND WHAT A RENAME ACTUALLY TOUCHES

`deckBody` has FOUR bindings — three `ChildPart`s (the name, the author, the date) and one
`EventPart` (`@click`) — so the third level adds 40 parts against the cards' 640 (eight bindings
each) and the shells' 80 `data-i` attribute parts. The `<div class="cards">` carries no part at all:
it is static markup in the deck's prepared template, cloned once and never revisited.

A RENAME RENDERS `deckBody` ONCE AND WRITES ONE TEXT NODE. The strings array is the same identity,
so lit finds the committed `TemplateInstance` and updates in place — no clone, no `TreeWalker` walk.
Then, part by part:

-   `<h2>` — `deckNameOf(d, name)` recomputed, differs, committed — the one DOM write.
-   `.author` — THE CONSTANT, and the reason the spec put it there: `userNameOf(deckUserOf(d))` is
    resolved ONCE when the deck record is built, so the render hands the part the same string it holds
    and `ChildPart._$setValue` skips it under `value !== this._$committedValue`. A deck-level twin of
    `<span class="user">`, and the same answer: a `ChildPart` per deck, committed at the first render
    and compared-and-skipped on every render after.
-   `.date` — `dateTextOf(when, chars[author])` RECOMPUTED WHETHER OR NOT ITS SETTING MOVED, for the
    same reason the card's three derived values are: `deckBody` is one function and it evaluates every
    interpolation in it. Then dirty-checked, and on eight of the ten decks found equal and not
    written. That is ten `dateTextOf` calls per round — three to six `getUTC*` reads, one or two table
    lookups and up to three zero-pads each, depending on the author's setting — of which TWO produce a
    string that is not already there, because a round moves one user and a user authors two decks. It
    is the app's first value with real formatting cost and this participant recomputes it at the
    coarsest granularity it has, because Lit gives it no finer one: no `computed`, no memo, no
    derivation object, and `willUpdate` belongs to the LitElement this app is not allowed to be.
-   `.ren` — `EventPart._$setValue` handed the SAME closure it already holds — `shouldRemove` and
    `shouldAdd` both false, no `addEventListener`, no `removeEventListener`.

(the two dirty-check conditions are read off `lit-html/development/lit-html.js`, not measured)

THE CONDITIONAL DETAILS BLOCK is `` ${c.open ? html`…` : nothing} `` — a ChildPart sitting between two
static siblings, exactly as lit.dev's "Conditionals" page writes it. `nothing` (not `''`) so the
part commits an empty range rather than an empty text node.

THE DYNAMIC TAG LIST is `` repeat(tags, t => t, t => html`…`) `` — lit's KEYED list directive, keyed by
the tag string. That matches MOST of the field (`<For each>` in Solid and voby, `key={t}` in React,
`key="data.label"` in Mikado) — but not all of it, and this line used to say "the rest of the field"
without the qualifier: `apps/uhtml/uhtml.tsx` matches its tag holes BY POSITION (`holed()` in uhtml's
`rabbit.js` pairs `prev[j++]` with `current[i]` and checks only that both came from the same
template), which on a list that is always a prefix of a fixed array keeps the same nodes anyway.
What `repeat` gives is what keeps the tag that survives an update the SAME element, which the update
axis's second gate checks. lit.dev notes `map()` is cheaper when DOM identity does not matter;
`repeat` is used here because identity is exactly what the gate asks about, and because the
reference reconciles by identity too.

## THE THREE DERIVED VALUES, AND WHY THEY ARE PLAIN CALLS INSIDE `cardBody`

Lit has NO derived-value primitive. There is no `computed`, no memo, no reactive statement and
nothing to subscribe a single value to a single piece of state. What LitElement offers instead is a
place in the update cycle — `willUpdate()`, documented as where to "compute values that depend on
other properties and are used in the rest of the update process" — and, for everything else, the
template function itself. So the idiomatic answer here is the literal one: `headlineOf`,
`expandedOf` and `tagsLabel` are CALLED IN THE TEMPLATE FUNCTION, from the card's own fields, every
time that card is flushed.

`willUpdate` IS NOT AVAILABLE TO THIS APP, and that is not a shortcut taken here: it is a hook of
LitElement's reactive update cycle, and this app has no LitElement — a `<card-view>` custom element
would be an EXTRA ELEMENT and the markup gate counts elements (see above). The hand-rolled stand-in
would be a cache field per value plus the code that invalidates it, which is a hand-written memo,
not Lit's idiom, and it would be this row skipping work the field pays.

WHAT THAT COSTS AND WHAT IT BUYS, stated in both directions so the row can be read honestly:

-   ALLOCATES NOTHING for the right to recompute. No derivation object, no subscription, no disposer —
    per card or per value. Where the schema core's card pays five subscriptions at the MOUNT, this
    card pays zero, and `initial-render` is where that shows.
-   RECOMPUTES ALL THREE on every flush of a dirty card, whether the state each one reads moved or
    not. There is no per-value granularity to have: `cardBody(c)` is one function and it evaluates
    every interpolation in it. A round marks each card dirty twice (`.tog`, then `.addtag`) and the
    dirty flag collapses that to ONE render per card — so each card recomputes all three once per
    round, and one of the three is recomputed because the OTHER click happened.
-   DOES NOT WRITE THE DOM UNCONDITIONALLY. Every part dirty-checks first, so a recomputed value that
    came out equal costs the call and one comparison and no DOM touch: `ChildPart._$setValue` commits
    a primitive only under `value !== this._$committedValue`, and `AttributePart._$setValue` in its
    single-value branch only under `!isPrimitive(value) || value !== this._$committedValue`. Read off
    `lit-html/development/lit-html.js`, not measured.

THE TAG ARRAY IS STILL MAINTAINED IN THE HANDLER, and that predates this contract: `addTag` advances
`count` and rebuilds `c.tags` in the same breath, so `repeat()` receives an array that is already
correct. It is a Lit-legal shape — a plain field on the card's state object, not a reactive property
— and it is left alone because the tag list is the STRUCTURE half of this app and every axis that has
ever run measured it reconciling from a stored array. Deriving it in the template instead
(`c.pool.slice(0, c.count)`) is the other Lit-legal shape and would be one more allocation per
flush; it is not what the derived values needed and was not done for them.

## THE FIVE USERS — A SHARED VALUE READ BY MANY CARDS, IN A LIBRARY WITH NO REACTIVITY AT ALL

The scene now has five users per mounted app (`todo-spec.ts`, THE USERS). A card renders its user's
NAME — a constant — and a TAG renders its label clipped to ITS OWN user's setting, which MOVES: one
round advances one user's setting and forty tags in forty different cards have to end up with new
text. Nothing else in this app had a write that reached more than one card.

AND SINCE THE DECKS ARRIVED THAT WRITE REACHES TWO DEPTHS. A deck's AUTHOR is one of the same five
users and its `<time class="date">` renders its own constant date at THAT user's setting, read as a
precision rather than a character count — so advancing user `u` has to end with 40 tag texts new in
40 cards AND the dates of the TWO decks `u` authored new one level up.

LIT HAS NOTHING TO SUBSCRIBE A VALUE TO. `lit-html` is a template renderer; the reactive half of Lit
lives in `ReactiveElement`, whose unit of notification is a CUSTOM ELEMENT, and the answer Lit ships
for state read by many components is `@lit/context` — a provider that keeps a SET OF REGISTERED
CONSUMER CALLBACKS and calls `requestUpdate()` on each when the value changes. Neither is available
here: a `<card-view>` (or a `<tag-view>`) would be an EXTRA ELEMENT and the markup gate counts
elements, which is why this app renders each card's contents into the card div and emulates
`requestUpdate()` with a dirty flag (see BATCHING below).

SO THE PROVIDER'S CONSUMER SET IS WRITTEN OUT BY HAND, and it is the honest shape rather than a
shortcut: `subs[u]` is every (card, tag position) in the app whose tag belongs to user `u`, gathered
while the cards are built — 320 entries dealt into five arrays, 64 each. Advancing a setting writes
the number, marks those cards dirty and lets the ordinary flush render them. That is exactly what a
context provider does to its consumers; what a real provider would ALSO have is the registration and
de-registration lifecycle, which this app does not need because its cards never unmount.

THE DECKS JOIN THAT SAME CONSUMER SET, and they had to: this app has no other way to reach them. A
deck registers itself under its author while it is built (`deckSubs[deckUserOf(d)]`, ten entries
dealt into five arrays, two each), and `advance` marks those two decks dirty beside the cards. It is
the identical mechanism one level up — a provider's subscriber list, written out because `lit-html`
has nothing to subscribe with and `@lit/context` needs the custom element the markup gate forbids —
and it is NOT a formula: `deckUserOf` is a rule about the scene, and a participant that reached its
consumers by re-deriving who they are would be answering a fan-out question by having no fan-out.

THE TWO KINDS OF CONSUMER ARE FILED IN TWO ARRAYS AND NOT ONE, indexed by the same user id. A card
entry carries a POSITION that has to be tested against the card's current count (`j < c.count`) and
a deck entry carries nothing to test — its date is on screen at all times. One discriminated union
walked with a kind test per entry would have put that test on all 330 entries to serve 10 of them;
two loops are the same set of consumers, sorted so that each is asked only what its own kind answers
— the card loop its position test, the deck loop nothing at all. A real provider makes the same split
by giving each consumer its own callback, which is the shape this app cannot afford: 330 closures
allocated at the mount, inside `initial-render`'s timed region, to collapse two array walks into
one.

A POSITION THAT IS NOT ON SCREEN IS SKIPPED — `j < c.count`, one comparison per entry, the same
question `apps/stage0/stage0.tsx` asks of the same table. A card's tag list is the first `count` of its four
positions, so 64 cards hold a position of user `u` and only ~40 are rendering it; the 24 that are
not would render identically anyway (every part dirty-checks), so the comparison changes no bytes
and skips a whole card render. It is CORRECT and not merely cheap for a reason worth stating: this
participant recomputes a tag's text from `chars` at render time, so a position that re-enters the
list later is clipped at whatever the setting is THEN, with nothing to catch up.

AND THE CLIP ITSELF IS RECOMPUTED PER TAG — `tagTextOf(t.label, c.chars[t.user])`, in the
interpolation that renders it, exactly as the other three derived values are, and with the same
consequence: a card render recomputes EVERY tag it shows, not the one whose setting moved. The forty
texts one advance produces are at most four distinct strings; this participant computes one per
rendered tag per card render, which over a whole round is ~200 of them — every card is dirty by the
end of a round and its flush renders each card's whole tag list once. There is nothing in Lit to
hold the four in: no `computed`, no memo, no derivation object. Holding them by hand would be a
cache the library did not give this app, which is the one thing a participant here may not do.
COUNTS off this file's control flow, NOT MEASURED.

WHAT THE CARD'S USER NAME COSTS, since it is the control the spec put beside the moving value: one
more `ChildPart` per card, committed once at the first render and dirty-checked (and found equal) on
every render after. It is a field on the card record — `userNameOf(cardUserOf(i))` called once when
the card is built — for the same reason the title is: it cannot move.

THE TITLE IS A FIELD, NOT A CALL. `titleOf(i)` is constant for the life of a card — the spec says so
and `headlineOf` takes it as an argument — so it is computed once when the card is built. It is not
one of the three derived values and recomputing it per render would be this participant doing work
the contract does not ask anyone for.

## BATCHING

Lit has no scheduler of its own at the `render()` level, but LitElement — the way Lit is actually
used — batches: a property write calls `requestUpdate()` and ONE update runs per element per
microtask, no matter how many properties changed. This app reproduces that with a dirty flag per
card AND ONE PER DECK: every handler mutates state and marks its owner, and `flip()` flushes every
dirty deck and every dirty card with one `render()` each. That is the same treatment react
(`flushSync`), svelte (`flushSync`), voby (`tick`) and marko (`run`) get in `todo-app.tsx` — the
update must commit INSIDE the measured region, and it must not be charged twice for one round.

WHAT THE FLAG COLLAPSES AT THE DECK LEVEL, said out loud because a byte gate cannot see any of it. A
round marks each deck once (its `.ren`), and marks TWO of the ten a SECOND time — the two whose
author's setting `advance` moved. Those two would otherwise render twice, once for the new name and
once for the new date; under the flag they render ONCE and the intermediate tree (the new name
beside the old precision) never exists. The gate diffs the end state and the end state is identical
either way, so a participant that rendered a deck twice per round would pass every diff in this file
and be doing 10% more deck renders than this one. The same collapse the `.tog`/`.addtag` pair
already gets one level down, and the reason this participant publishes a `commit`.

## THE CARD RECORD (`TLitCard`)

One card's state. The two handlers are built ONCE per card and stored here rather than being created
inside the template function, because two closures per card is exactly what the reference app
allocates and a fresh pair per render would be this participant allocating 160 functions per update
round that no other participant allocates.

IT IS NOT ABOUT LISTENER CHURN, and an earlier version of this comment said it was. Lit's
`EventPart._$setValue` only touches the element when the listener goes to or from `nothing` or when
its `capture`/`once`/`passive` options change:

```js
const shouldRemoveListener =
    (newListener === nothing && oldListener !== nothing) ||
    newListener.capture !== oldListener.capture || … ;
const shouldAddListener =
    newListener !== nothing && (oldListener === nothing || shouldRemoveListener);
```

Handed a plain new function, both are false — the part itself is what was registered with
`addEventListener`, and it dispatches through the value it stores — so a fresh arrow would cost the
allocation and nothing else. Read off `lit-html/development/lit-html.js`, not measured.

Field by field:

-   `node` — the card's `<div class="card">`, this card's lit render root.
-   `title` — `titleOf(i)`, computed once: constant for the life of the card, and `headlineOf`'s
    input.
-   `user` — the card's user's NAME, computed once — the shared read that never moves.
-   `chars` — THE APP'S FIVE SETTINGS — THE SAME ARRAY OBJECT IN ALL EIGHTY CARDS, not a copy. A
    card's template has to reach the setting of each of its tags' users, and `cardBody` is a
    module-level function that can see nothing but the card it is handed. So the app's array is handed
    to the card, which is what the reference does too (`TCardProps.users`) and what a Lit app without a
    context provider does: the shared thing travels as a property.
-   `pool` — this card's FOUR tag positions with their users, from `tagsOfCard(i)` — built ONCE,
    because the array `repeat()` renders is a prefix of it and rebuilding four objects per click would
    be an allocation no other participant makes.
-   `dirty` — set by a handler, consumed by the flush — LitElement's `requestUpdate` in one boolean.

## THE DECK RECORD (`TLitDeck`)

ONE DECK'S STATE — the third level, and this app's second kind of render root.

IT IS A SEPARATE RECORD AND NOT A REUSED `TLitCard`, for the reason the reference gives about its own
two props types: `d` and `i` are different facts. `deckUserOf(d)` and `cardUserOf(i)` read the same
five settings with different rules, and one record answering to both names would let a deck be built
from a card's index without a complaint from the compiler.

ITS ONE HANDLER IS BUILT ONCE, LIKE A CARD'S TWO AND FOR THE SAME REASONS: it is the closure the
`@click` binding carries AND the one `card-driver.ts` is handed, so the clicked round and the called
round rename through one piece of code; and its identity being stable across renders is what makes
`EventPart._$setValue` a pair of false comparisons rather than a listener swap.

THERE IS NO `cardsNode` FIELD. The deck's `<div class="cards">` is needed exactly once — at the
mount, as the container the card shell renders into — and it is read off the deck's own subtree
there. Keeping it would have been a field nothing ever reads again, on ten records.

Field by field:

-   `node` — the deck's `<div class="deck">`, this deck's lit render root.
-   `user` — `deckUserOf(d)`, which of the five settings this deck's date is rendered at.
-   `author` — the author's NAME, computed once: the deck-level twin of a card's `user`, and constant.
-   `when` — `deckDateOf(d)`, constant for the life of the deck, and `dateTextOf`'s first argument.
-   `chars` — THE APP'S FIVE SETTINGS, the same array object the eighty cards hold, not a copy.
-   `name` — an index into `DECK_TITLES`. The whole of this level's state, and what `.ren` advances.
-   `dirty` — set by `.ren` or by `advance`, consumed by the flush — `requestUpdate` in one boolean.

## THE CONSUMER ENTRY (`TLitSub`)

ONE ENTRY OF THE HAND-WRITTEN CONSUMER SET — see THE FIVE USERS above. A card, and WHICH of its four
positions belongs to the user this entry is filed under. Each card has exactly one position per user
(four positions, five users, `(i + j) % 5` distinct across `j`), so a card appears at most once in
each of the five lists.

A DECK NEEDS NO SUCH RECORD and is filed as itself (`deckSubs[u]`), because there is no position to
test: a deck's date is on screen whatever its cards are doing. The section above argues why that
makes two arrays rather than one union.

`j` is the position's index in its card's list, 0…3. On screen exactly while `j < card.count`.

## THE TEMPLATES

The markup in them is ONE UNBROKEN LINE, with no whitespace between two tags, because a tagged
template keeps every byte it is given: a newline plus indentation anywhere in the QUASIS becomes a
whitespace Text node in the DOM, and the markup gate compares `innerHTML` byte for byte against a
reference that has none.

A LINE MAY BE BROKEN INSIDE A `${…}` AND NOWHERE ELSE. What sits between the braces is an
expression, so the whitespace around it is JavaScript whitespace and never reaches a quasi. That is
the technique used to keep the long interpolations readable.

PRETTIER WOULD UNDO THIS, and did once — a repo-wide `--write` that reflowed the embedded HTML in
every `html` tagged template in this package and took four axes down with it. `.prettierrc` now
carries `"embeddedLanguageFormatting": "off"`, and the `prettier-ignore` below each template is the
second lock, so the shape does not depend on one config line.

### `shell`

The shell: the app div and 10 EMPTY deck divs.

THE DECK DIV CARRIES NOTHING — no dynamic attribute at all, since the deck's four values are three
texts and one handler and every one of them lives inside it. So the inner template has no binding
and lit prepares ONE template for all ten; what the map costs is ten `TemplateResult` objects and
ten clones of one prepared `<template>`.

IT IS A MAP OVER `DECK_IDX` AND NOT TEN LITERAL DIVS, so the count stays a fact of `todo-spec.ts`.

### `deckBody`

ONE deck's CONTENTS — rendered into the deck div, which is this template's render root.

ITS LAST ELEMENT IS AN EMPTY `<div class="cards">` AND THAT IS THE WHOLE SPLIT: the eight cards of
this deck are a render root of their own, so no card is named anywhere in this template and a
rename's reach is the four parts below. The section above argues that against the alternative — a
ChildPart here holding the eight card divs — and prices both.

NO ATTRIBUTE IN IT IS DYNAMIC, so the deck level asks no attribute-ordering question: every `class`
here is static markup folded into the prepared template, exactly where the reference puts it.

THE `.author` IS AN ORDINARY INTERPOLATION OF A FIELD THAT NEVER MOVES, like the card's `.user` and
for the same reason — the string differs per deck and there is one prepared template — and it costs
the same: a `ChildPart` written once and compared-and-skipped on every render after.

THE DATE IS FORMATTED WHERE IT IS RENDERED. `dateTextOf(dk.when, dk.chars[dk.user])` reads the app's
shared settings array through the deck, exactly as a tag's clip reads it through its card, and is
therefore recomputed on every flush of this deck whether or not that setting moved.

### `cardsShell`

ONE deck's EIGHT EMPTY CARD DIVS — rendered into that deck's `.cards` div, which is this template's
render root.

IT IS WHAT THE OLD `shell` DID FOR ALL EIGHTY AT ONCE, split ten ways and nothing else: `data-i` is
bound here because it is an attribute OF the card element and therefore outside the card's own
render root, and `cardsOfDeck(d)` hands out the GLOBAL indices `8d … 8d+7` so no card is renumbered
by the deck it landed in.

### `cardBody`

ONE card's CONTENTS — rendered into the card div, which is this template's render root.

ATTRIBUTE ORDER ON THE `.tog` BUTTON is `class` then `aria-expanded`, and Lit produces it without
being asked. `_prepare` walks the prepared template's `getAttributeNames()` and REMOVES every name
ending in `$lit$` — the suffix it gave the bound one while building the HTML string — so the template
element carries only the static `class`, and `AttributePart._commitValue` adds `aria-expanded` with
`setAttribute` at the first render. Static first, dynamic after.

THE `<span class="user">` IS AN ORDINARY INTERPOLATION of a field that never changes — it has to be
one, because the string differs per card and there is only one prepared template. It costs a
`ChildPart` per card, written once and compared-and-skipped on every render after.

A TAG'S TEXT IS CLIPPED WHERE IT IS RENDERED — `tagTextOf(t.label, c.chars[t.user])`, reading the
app's shared array through the card. `repeat` is still keyed, and now by `t.label`: the items are
the spec's tag objects rather than bare strings, and the label is what identifies a position in a
card exactly as the string did (the four labels of a card are distinct).

## THE MOUNT

`render()` puts a comment marker in front of what it renders, so the app div is the first ELEMENT
child, and the 10 deck divs are the app div's element children in order.

THE APP'S FIVE USERS, AND THE CONSUMER SET A SETTING WRITE GOES THROUGH — see THE FIVE USERS above.
ALL THREE (`chars`, `subs`, `deckSubs`) ARE PER MOUNT AND NOT PER MODULE. Two apps standing side by
side in a gate would share module-level settings, each round would advance one twice, both trees
would still agree, and every byte diff in the suite would pass over a scene running at double speed.

`deckSubs` is THE SECOND HALF OF THE CONSUMER SET — the decks each user authored, two apiece. Filed
under the same user id as the tag positions and walked beside them by `advance`; the argument for
why the two kinds are two arrays and not one union is above.

THE DECK-LEVEL SHARED READ THAT NEVER MOVES is resolved once — two decks hold each of the five
strings and neither can ever be asked to recompute it.

THIS DECK REGISTERS AS A CONSUMER OF ITS AUTHOR'S SETTING — one entry, filed once at the mount, in
the same hand-written provider list the tag positions go into.

THE OTHER DOOR INTO THIS DECK — `noteDeckOps(dk.rename)` hands over the SAME closure the `@click`
binding carries, declared in document order so a gate can drive rename `k` and require deck `k`
alone to move.

THE DECK'S `<div class="cards">` is the LAST element of `deckBody`, and therefore the last ELEMENT
child of the deck div whatever marker comments lit left between them. It is read at the mount and
nowhere else: after that render nothing ever asks a deck for its cards again, because a rename does
not reach them and the cards hold their own nodes.

THE GLOBAL INDEX comes straight from `cardsOfDeck(d)`. Every per-card formula takes it, so a card in
deck 9 is card 79 and not card 7.

THE SHARED READ THAT NEVER MOVES (`user`) is resolved once. Sixteen cards hold the same string and
none of them can ever be asked to recompute it.

THIS CARD REGISTERS AS A CONSUMER OF ITS FOUR TAGS' USERS — four entries, four different users,
filed once at the mount. This is the provider's subscriber list written by hand, because `lit-html`
has nothing to subscribe with and `@lit/context` needs the custom element this app is not allowed to
have.

THE OTHER DOOR INTO THIS CARD — `noteCardOps(c.toggle, c.addTag)` hands over the SAME two closures
the `@click` bindings carry, declared to `card-driver.ts` so `app-update` can run this row's update
round with no synthetic event. Nothing is allocated for it: both already exist on the card record,
and the record's whole point is that their identity is stable across renders.

### `flush`

LitElement's batched update, by hand: one render per ROOT that changed, per round.

THE DECKS GO FIRST, which is `AppHandle.flip`'s order — outermost level first — and it changes
nothing about the end state, because the two levels are two disjoint sets of render roots and
neither pass can mark the other. It is written in the contract's order anyway, so that a reader
comparing this flush to the round it stands for does not have to prove that.

TEN COMPARISONS AND EIGHTY, and the ten are not free: a deck is dirty every round (its `.ren` always
fires), so this loop does ten real renders per round on top of the eighty card renders.

### `advance`

THE ROUND'S ONE APP-LEVEL OPERATION — one user's setting advanced. No button, no card.

IT MARKS AND DOES NOT FLUSH, exactly as the two card handlers and the deck's rename do. `flip`
flushes once after all FOUR steps and `card-driver`'s `commit` wraps a called round the same way, so
the clicked path and the called path are one program — and a batching participant's round is ONE
pass, not two.

WHAT LIT'S BATCHING COLLAPSES HERE, said out loud because a byte gate cannot see it: the contract's
order renders a tag added by `.addtag` at the OLD setting and rewrites it at the new one. Under a
dirty flag neither intermediate state is ever rendered — the card is marked three times and rendered
once, which is the same collapse the `.tog`/`.addtag` pair already gets and the reason this
participant declares a `commit`. The two decks this marks got the same treatment one level up:
renamed by step 1, re-dated by this, rendered once.

IT WALKS TWO CONSUMER LISTS, and that is the whole of what the third level added to this write. One
`setValue`-shaped assignment, ~64 card entries of which ~40 are on screen, and TWO decks.

A POSITION THAT IS NOT ON SCREEN CHANGES NOTHING — the card renders its tags from `chars` when it
renders them, so a position that re-enters the list later is clipped at whatever the setting is then.

AND THE COARSE HALF OF THE FAN-OUT: the two decks this user authored, whose dates read the same
number as a PRECISION. No `j` to test — a deck's date is on screen at all times.

`advance` is DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls.

### The handle

`flip` is the same update round every framework runs, in `AppHandle.flip`'s order: rename every deck,
toggle every details block, advance every tag list, then advance one user's setting — then commit
ONCE, inside the measured region. All four steps mark and none of them renders, so the single
`flush` is this participant's whole round.

`commit` is THIS PARTICIPANT'S OWN COMMIT — the very `flush` its `flip` runs, published so that
`app-update` can drive the handlers directly and still stop the clock only after lit has rendered
every dirty deck and every dirty card. Read by that axis and by nothing else.

`teardown` has nothing to dispose: lit holds no subscriptions, its parts hang off the nodes and its
listeners are owned by the elements they are on, so all of it dies with the container the caller
removes.

## THE VERIFICATION GATE (`participants/lit/app.tsx`)

A timing comparison against markup that does not match is worthless, so this is the gate: mount the
reference app and this one side by side and diff the HTML, then run one update round and diff again,
then a SECOND update round and diff a third time (the update is what would expose a different
conditional strategy; see THE THIRD STAGE below). ALL comments are stripped first, and here that
matters more than for the other participants: lit MARKS every dynamic position with a comment —
`<!--?lit$…-->` for a part it prepared and `<!---->` for the boundaries of a committed range — so a
lit tree carries dozens of comments the reference does not have. That is a strategy difference, not
a markup difference, and nothing in this app emits a comment of its own, so stripping them cannot
hide a real divergence. The ELEMENT COUNT is reported next to the diff precisely because it is the
part comments cannot excuse — and the third level made that the load-bearing half of this gate:
twenty more render roots is twenty more pairs of markers the strip removes, while the six elements a
deck adds are six the count still has to find. 861 against 861, or the row is not rendering this
app.

### THE THIRD STAGE

A SECOND update round, for the reason `apps/exodra/exodra.md` argues at length and
`svelte-marko-gate.ts` repeats: one round moves every card in ONE direction only, while a second
round puts a GROW straight after a SHRINK on the same tag list — the cards that started at 4 wrapped
to 1 on the first click and go 1 → 2 on the second — and a SHRINK straight after a GROW. Here that is
aimed at `repeat()`, whose keyed reinsertion has to place the returning tag between the right two
siblings after the list has already been cut to one, and at the `nothing` conditional, whose
ChildPart boundary has to be the same two markers it was before the block was removed and put back.
Neither shows at mount and neither shows after one round. It costs one extra flip in a gate nothing
times.
