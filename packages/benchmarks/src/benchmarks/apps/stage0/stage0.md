# stage0 — the ceiling row

The same 10-deck / 80-card todo app as the reference in `apps/exodra/exodra.tsx`, written in STAGE0
(0.0.25). Same data (imported from the shared scene, never re-declared), same decks, same cards,
same details toggle, same dynamic tag list, same two handlers per card and one per deck.

The app is `apps/stage0/stage0.tsx`. The byte gate is `participants/stage0/app.tsx`.

## Why stage0 is in this comparison, and why its row is not a competitor's row

Stage0 is the idea this whole family is built out of, with nothing on top: a `<template>` is parsed
once, walked once to record where the dynamic positions are, and every instance is a
`cloneNode(true)` plus a handful of direct writes through the node references that walk handed
back. There is no reactivity, no scheduler, no diff of anything the caller did not ask for and no
component model — the README calls it "a collection of low-level DOM tools", and the whole library
is 570 bytes.

So this participant is the CEILING: it is what the shared idea costs when no framework sits on it.
Every other row on these axes — Exodra's schema core included — is that same clone-and-fill program
plus whatever the library does for you (find the port, notice the change, own the list, batch the
write). `stage0` is the number those additions are subtracted from. It is NOT a framework
recommendation and nothing about it is transferable: the update path is written out by hand, per
element, and it only works because the author of the app knows exactly which four things can change.

## It is written the way stage0's own README writes it

That constraint is load-bearing — a ceiling measured with a hand-tuned fast path nobody else is
allowed is not a ceiling, it is a rigged row. So:

-   `h` tagged template per SHAPE, at module scope, compiled once for the life of the process
    (README "h": "will give you a ready to use DOM node, which you can clone or append directly
    wherever you need").
-   One `cloneNode(true)` per instance, then `template.collect(clone)` to get the refs — verbatim the
    README's second example, which is also how stage0's js-framework-benchmark entry is written. Note
    `collect` is called on the TEMPLATE and handed the CLONE: the `_refPaths` array and the `collect`
    function are expando properties of the template node, and `cloneNode` does not copy expando
    properties.
-   `#name` marks a dynamic position — as an ATTRIBUTE for an element reference and as the WHOLE TEXT
    of a text node for a text reference (`collector()` in stage0/index.js only recognises a text node
    whose data STARTS with `#`, and it blanks that data). That is why the card's headline is
    `<h3>#title</h3>` filled with `headlineOf(…)` rather than a template with any fixed text beside
    the marker, which stage0 would not see as a reference at all. The reference app emits one Text
    node there too, so the bytes are the same. The `.count` span is the same shape:
    `<span class="count">#count</span>`, one marker, one whole Text node.
-   `stage0/reconcile` for the tag list — the library's own list renderer, "good for arrays with
    mutable data, because it compares array items directly".

## Two things stage0 offers that are deliberately not used

Both stated rather than quietly dropped:

-   `stage0/syntheticEvents` — `setupSyntheticEvent('click')` installs ONE delegated document listener
    and a handler is then an expando (`node.__click = fn`). It is what stage0's own benchmark entry
    uses. It is not used here because every other participant on these axes attaches a real listener
    per node, and delegation is a genuine architectural advantage (Mikado's row on the toggle axis
    exists to price exactly that) — charging it to `stage0` silently would make the ceiling cheaper
    than the thing it is supposed to bound. `.onclick` is the README's own idiom in both of its
    examples, and it is the same listener everyone else attaches. Neither form leaves anything in the
    markup.
-   `stage0/keyed` — a keyed reconciler for immutable data. The tag list here is four stable strings
    from a shared pool, sliced; `reconcile` compares the items themselves, which is the same identity
    every other participant reconciles this list by.

## No batching, and nothing to flush

A handler writes to the DOM inside the call, so a `flip` has committed by the time it returns — the
one thing every axis requires of every participant. Where react/svelte/voby/marko need
`flushSync`/`tick`/`run`, stage0 needs the concept explained away: it has no queue to drain because
it has no scheduler to queue into.

## The three derived values, and why this row computes them by hand at the point of the write

The contract's card now carries three values that are FUNCTIONS OF STATE rather than constants: the
`<h3>` headline is `headlineOf(title, open)`, the toggle button's `aria-expanded` is
`expandedOf(open)`, and the `.count` span's text is `tagsLabel(count)`. Every other participant on
these axes declares them — a memo, a rune, a derivation, a cell — and pays at the mount for the
RIGHT to have them recomputed when the state moves.

STAGE0 HAS NO PLACE TO DECLARE ONE. It has no reactivity, no scheduler, no component and no
lifecycle; the whole library is a template compiler and a node collector. So the three values are
computed exactly where a straight-line program computes them: INSIDE THE HANDLER THAT CHANGED THE
STATE, written immediately through node references this card has held since it was built. `.tog`
flips `open` and then writes the headline and the attribute; `.addtag` advances `count` and then
writes the label. There is no subscription, nothing to notify, and nothing allocated for the right
to recompute — which is precisely the trade this row exists to price against the rows that do
allocate. Giving it a memo or a helper that amounts to one would be bending the ceiling into a
competitor.

THE FORMULAE ARE IMPORTED, NOT RESPELLED. `headlineOf`, `tagsLabel` and `expandedOf` come from the
shared scene like every other participant's do — eleven private spellings of "clip at fourteen and
append an ellipsis" is eleven chances to fail a byte gate over one character.

THE TWO NEW NODES ARE HELD THE WAY THE OTHER TWO ALREADY WERE. The card struct held `node` and
`tags`; it now also holds the `<h3>`'s Text node, the `.tog` element and the `.count` span's Text
node, all four handed back by the one `collect()` call the card already made. A handler therefore
still writes through a field it holds, with no lookup, no `querySelector` and no walk — the property
that makes this row the ceiling in the first place.

## The third level, and what a deck costs a program that has nothing to declare one with

The scene is three deep now — ten decks, eight cards each, one to four tags each — and a DECK is the
first row in this app that is itself a parent: three texts of its own, one integer of state of its
own, one handler of its own, and eight card subtrees under it. Every other participant expresses
that with whatever its library calls a component, and pays for the boundary. STAGE0 HAS NO
COMPONENT, so a deck is exactly what a card already is here and not one thing more: A TEMPLATE, A
CLONE, A `collect()` AND A STRUCT.

WHAT IT COSTS THIS ROW, counted rather than waved at:

-   ONE MORE TEMPLATE at module scope — `deckTpl`, parsed and walked once for the life of the process
    exactly as `cardTpl` is, handing back five references off the one walk: three Text nodes and two
    elements.
-   ONE MORE CLONE AND ONE MORE `collect()` PER DECK — ten of each per mount against eighty of each
    for the cards, so the third level adds an eighth to this row's clone count and nothing to its
    per-card path. The eight cards of a deck are appended into that deck's `.cards` element instead of
    into the app div, which is the same `appendChild` into a different parent.
-   ONE MORE HAND-WRITTEN FAN-OUT TABLE — `hotDecks[u]` beside the `hot[u]` the tags already needed.
    Two decks per user against ~64 tag positions, and it exists for the same reason: a setting is an
    array element here, an assignment to it notifies nobody, and a program with no reactivity has to
    have enumerated its readers itself. It is a SECOND table and not two more entries in the first
    because the two readers share nothing but the number they read — a tag is skipped unless
    `j < card.count` and writes `tagTextOf`, a deck is never skipped and writes `dateTextOf`. One
    array of two element types with a branch per entry would be this row paying, forty times a round,
    for a distinction it already knew at the mount.

WHAT STAGE0 STILL HAS NO PLACE TO DECLARE, and the deck level makes the absence louder rather than
new. The deck's `<h2>` is `deckNameOf(d, name)` and its `<time>` is
`dateTextOf(deckDateOf(d), chars[author])` — one derived over the deck's OWN state, one derived over
a cell shared with forty tags two levels below it. There is nowhere to say either sentence. So the
name is recomputed inside the rename handler that moved the state, and the date inside the setting
write that moved the setting, both written straight through a Text node the deck struct has held
since it was cloned.

AND THE DATE IS RECOMPUTED FOR EVERY DECK THE WRITE REACHES, which matters here in a way it did not
one level down. `dateTextOf` is the first value in this app with real formatting cost — six
`getUTC*` reads, two table lookups, two or three zero-pads — and a setting write reaches exactly two
decks that share ONE author and therefore ONE precision, so a program that held the formatted string
per (date, setting) would format once instead of twice. It is not held, for the same reason the four
clipped tag labels are not: a program with no abstraction computes the value where it writes it, and
a cache of formatted dates is a STRATEGY — something a participant WRITES and is then measured for —
not something the ceiling smuggles in under cover of being obvious.

## The templates

ONE LINE, NO INDENTATION BETWEEN TAGS — `h` does collapse whitespace around tags (`index.js` strips
`\s+<` and `>\s+`), but it also turns a newline followed by indentation into a `<!-- -->` comment
node, so a template broken across lines would put markers into the DOM that no other participant
emits. Keeping them on one line removes the question instead of relying on the answer.

### `appTpl`

The shell. Its one dynamic thing — the decks — is appended by hand, so it has no refs.

### `deckTpl`

ONE DECK, whole. Six elements in one template, so a deck is one clone and one insert — the same
bargain `cardTpl` makes one level down, and the only structural thing the third level adds.

`#name`, `#author` and `#date` are TEXT references and `#ren` and `#cards` are ATTRIBUTE ones. The
split is not a preference: `collector()` only recognises a text node whose data STARTS with `#`, so
a marker beside any fixed text would not be seen at all, and `<h2>#name</h2>` is one whole Text node
exactly as the reference emits one there. `genPath()` strips `#ren` and `#cards` off the TEMPLATE
node while it walks it, before anything is cloned, so `class="ren"` and `class="cards"` survive into
the markup and the markers do not.

NOTHING HERE IS FILLED WITH AN ATTRIBUTE AT ALL. The deck's four values are three texts and one
click handler, so unlike the card this template raises no attribute-order question — there is no
second attribute on any of its elements to order against the static `class`.

`<div class="cards" #cards>` IS THE REASON THE REFERENCE IS COLLECTED: the eight cards go into that
element and not into the app div, and this row has to hold the element to append into it. `<time>`
is the reference's tag and not a third `<span>`, so a less common element gets prepared here too.

### `cardTpl`

ONE CARD, whole. Six elements in one template, so a card is one clone and one insert.

`#tog`, `#tags` and `#addtag` are ATTRIBUTE references and `#title` and `#count` are TEXT
references. `genPath()` strips a reference attribute off the TEMPLATE node while it walks it —
before anything is ever cloned from it — so `class="tog"` survives into the markup and `#tog` does
not, and the attribute order the reference app emits is preserved on both elements that have one
written later: `class` then `data-i` on the root, `class` then `aria-expanded` on the toggle button.

`aria-expanded` IS NOT IN THE TEMPLATE. It is written on `refs.tog` at the fill, for the same reason
`data-i` is written on the root: a value that moves is not markup. `#tog` was already here for the
click handler, so the attribute costs this row no extra reference at all — the element it goes on
was being collected anyway.

`<span class="count">#count</span>` is a SIBLING of the `.tags` div, not a child of it. Inside would
put a static element after the tag list's contents and change what bounds that region, which is a
different measurement wearing this one's name; `reconcile` owns every child of `.tags` and must keep
owning exactly those.

There is no reference for the details block's position: stage0 has no conditional, so the block is
inserted before the `.tags` div and removed again, which is the same place the reference's children
port stands in.

### `detailsTpl`

The conditional block. No references at all — every byte of it is known now.

### `tagTpl`

One tag.

## The records

### `TStage0DeckRefs`

What `deckTpl.collect()` hands back. Stage0's own typing for it is `{[key: string]: any}`.

-   `author` — the `<span class="author">`'s Text node. Written ONCE, at the fill, and never again —
    the deck-level twin of the card's `user`.
-   `cards` — the element the deck's eight cards are appended into.

### `TStage0Deck`

ONE DECK'S STATE, AND THE TWO TEXT NODES THAT ARE WRITTEN AGAIN AFTER THE MOUNT — both handed back
by the single `collect()` call the deck made when it was cloned, so the rename handler and the
setting write each read a field of this object and write. No lookup, no walk, no `querySelector`.

THE `.author` NODE IS NOT IN HERE AND THE DECK ELEMENT IS NOT EITHER, and both omissions are the
discipline rather than an oversight: the author's name cannot move, and nothing at this level ever
inserts or removes a child (a deck's eight cards are decided at the mount and never change), so
neither node has a second code path to be reached from. The card record holds its `node` because its
`.tog` handler genuinely inserts the details block through it.

-   `d` — the deck's own index, constant, and the first argument `deckNameOf` takes.
-   `nameText` — the `<h2>`'s Text node. `deckNameOf(d, name)` goes straight into its `nodeValue`.
-   `name` — the whole of this deck's state: an index into `DECK_TITLES`, advanced by `.ren`.
-   `when` — the deck's creation date, constant for its life, and the input `dateTextOf` formats. Held
    here rather than recomputed, for the reason the card's `fullTitle` is: it never moves.
-   `dateText` — the `<time class="date">`'s Text node, rewritten by the AUTHOR's setting and by
    nothing else; this deck sits in `hotDecks[deckUserOf(d)]` for exactly that write.

### `TStage0CardRefs`

What `cardTpl.collect()` hands back. Stage0's own typing for it is `{[key: string]: any}`.

-   `user` — the `<span class="user">`'s Text node. Written ONCE, at the fill, and never again.

### `TStage0Tag`

ONE TAG POSITION OF ONE CARD, as this row holds it — the object `reconcile` compares by identity AND
the record the user-setting write goes through.

FOUR PER CARD, BUILT ONCE, AND THEY OUTLIVE THE NODES. Positions 0…3 exist for the life of the card
whether or not they are currently in the list; `reconcile` adds and drops the DOM node for a position
as `count` moves past it, and this object stays. That is what makes `j < card.count` an exact answer
to "is this position on screen right now", which is the one thing the write below has to know and
the one thing `reconcile` will not tell it.

`text` IS THE ONLY CACHE IN THIS FILE AND IT IS THE ONE EVERY PARTICIPANT HAS. It is the node
`createTag` just built, kept on the object it was built for — the same thing a framework's binding
holds and the same thing this file's card record already did for its `<h3>` and its `.count`. What
is deliberately NOT kept is a table of clipped strings: a setting write below produces at most four
distinct texts for forty nodes and this row computes all forty, because a program with no
abstraction computes the value where it writes it. Keeping the four would be a strategy, and a
strategy has to be something a participant WRITES, not something the ceiling smuggles in.

-   `label` — the whole tag name; what `tagTextOf` cuts. Constant.
-   `user` — which of the five users decides how much of it is shown. Constant.
-   `j` — this position's index in its card's list, 0…3. Constant.
-   `card` — the card this position belongs to, read for its `count`, to know whether the position is
    currently in the DOM.
-   `text` — the Text node inside this position's `<span class="tag">` while it is mounted, `null`
    before it has ever been. `createTag` sets it every time the position enters the list.

### `TStage0Card`

One card's state, and the nodes its handlers write through — every one of them handed back by the
single `collect()` call the card made when it was cloned. A handler reads a field of this object and
writes; there is no lookup anywhere on the update path.

-   `title` — the `<h3>`'s Text node. `headlineOf(fullTitle, open)` goes straight into its `nodeValue`.
-   `fullTitle` — the card's WHOLE title, constant for its life, and the input `headlineOf` clips.
    Held here rather than recomputed, because `titleOf(i)` is not a derived value: it never moves.
-   `tog` — the `.tog` button. `aria-expanded` is written on it directly, in the same handler that
    flips `open` — this row's ATTRIBUTE write to the headline's TEXT write.
-   `countText` — the `.count` span's Text node — `tagsLabel(count)`, written where `count` changes.
-   `pool` — this card's four tag positions, in order. Built once; the list is a prefix of it.
-   `rendered` — what the tag list currently reads, `reconcile`'s `renderedValues` argument.
-   `details` — the details block while it is shown; `null` while it is not.

## The app's five users, and the index a setting write goes through

A NUMBER PER USER AND NOTHING ELSE. Stage0 has no cell to put one in, so a setting is an element of
an array and a write is an assignment — which is precisely the trade this row prices: nothing is
allocated for the right to be notified, and therefore nothing notifies.

WHICH MEANS THE PROGRAM HAS TO KNOW WHO IS READING. `hot[u]` is every tag POSITION in the app whose
user is `u`, gathered while the cards are built — 320 positions dealt into five arrays, ~64 each. It
is this file's answer to what a subscription list is, written out by hand, and it is the honest cost
of a shared write in a program with no reactivity: the fan-out has to be enumerated somewhere, and
here it is enumerated at the mount rather than maintained by a framework at every change. The
alternative a straight-line program has is to walk all 80 cards and all 200 mounted tags on every
setting write and test each one's user, which is the same answer computed five times over.

IT IS NOT MAINTAINED AS TAGS COME AND GO, and it does not have to be: a POSITION is permanent and
only its NODE is transient, so the write asks `j < card.count` — one comparison — and skips the
positions that are not on screen. `reconcile` never tells anybody what it removed.

AND `hotDecks[u]` IS THE SECOND READER OF THE SAME FIVE NUMBERS, one and two levels above the tags:
every deck user `u` authored, which is exactly two of the ten. It is a table of its own rather than
five more entries in `hot`, because the two readers share nothing but the number — a tag is skipped
unless its position is on screen and writes `tagTextOf`, a deck is never skipped and writes
`dateTextOf`. Merging them would put a branch on every one of the ~64 tag entries a write walks, to
separate two decks the mount had already separated for free.

ALL THREE ARE PER MOUNT AND NOT PER MODULE. Two apps standing side by side in a gate would share
module-level settings, each round would advance one twice, both trees would agree, and every byte
diff in the suite would pass over a scene running at double speed.

## `createTag`

Build one tag node — `reconcile`'s create callback, and the only place a tag's text is produced
other than the setting write.

IT IS A CLOSURE PER MOUNT where it used to be one constant for the life of the process, because it
now has to read `chars`, which belongs to this app. One closure per mount, against eighty cards and
two hundred tags.

## The ten decks, and the eighty cards inside them

One loop inside the other, which is the whole of what the third level changed about this mount. The
card body is the program it already was, down to the line; the one statement of it that moved is the
append, which goes into this deck's `.cards` element instead of into the app div. Nothing about a
card is renumbered — `cardsOfDeck` hands back the GLOBAL indices `8d … 8d+7`, and every per-card
formula still takes `i`.

THE DECK'S THREE TEXTS, all three through a reference `collect()` just handed back. `.author` is the
constant — the deck-level counterpart of a card's `.user`, and it has no second code path anywhere
in this file because nothing can move it. The other two are the derived values, computed at the
mount from what this deck was born with and recomputed by hand in the two places that move them: the
rename and the setting write.

ENROLLED WITH ITS AUTHOR ONCE, at the mount, exactly as each tag position is enrolled with its own
user — two decks per array against that array's ~64 tag positions.

THE DECK'S ONE HANDLER: advance the state, then write the one text that state moves. Same shape as
the card's two, and named for the same reason — the SAME closure goes onto the `.ren` button AND is
declared to `card-driver.ts`, so the called round and the clicked round rename this deck through one
piece of code.

THE FOUR POSITIONS are filled straight after the card object exists — each one holds the card it
belongs to, so the array has to be handed over before it can be populated. Four objects per card,
built once, exactly as the four tag data were before they carried a user.

THE CARD'S FIVE SCALAR VALUES, all five written through a reference `collect()` just handed back.
`data-i` and the user's NAME are the two constants — one an attribute, one a text — and the other
three are the derived values, computed at the mount from the state this card was born with. Those
three are the same writes the two handlers repeat; the two constants have no second code path at
all, because nothing can move them.

The initial tag list goes through the same call the update path uses — `reconcile` takes its "fast
path for create" when the rendered array is empty.

## The two handlers per card

One pair per card — the same pair every participant creates. They write to the DOM inside the call,
which is what makes this participant need no flush.

NAMED RATHER THAN ASSIGNED INLINE so that the SAME two closures go onto the buttons AND are declared
to `card-driver.ts`, the door `app-update` drives this row through with no synthetic event. Same
closure count, same place, same objects on the elements.

`tog` writes THE TWO VALUES `open` MOVES, recomputed on the spot. Every title this spec produces is
longer than the clip, so the headline genuinely changes on every click of every card — no card gets
a free ride through the update round. The details block is dropped, not parked: a hidden block is
gone and the next show clones the prototype again, exactly as Solid's `<Show>`, React's conditional,
Lit's `nothing` and the schema core's zero-or-one list all do.

`addTag` slices THE PREFIX OF THIS CARD'S FOUR POSITIONS, and not of `POOL`: what `reconcile`
compares by is the ITEM, and the items are the position objects this card built once at the mount.
Slicing `POOL` here would hand it four strings it has never seen and rebuild a list whose contents
did not change — and the positions the setting write goes through would no longer be the ones
standing in the DOM. Then THE ONE VALUE `count` MOVES: `reconcile` owns the children of `.tags`; the
`.count` span is outside that div and is written by hand, like everything else.

## `advanceUser` — the round's one operation that is not a card's or a deck's

`roundUserOf(round)`'s setting advanced once, and everything that shows it written on the spot AT
TWO DEPTHS: the forty tag texts three levels down, and the two dates of the decks that user authored
one level down.

IT IS THE WHOLE OF WHAT A SHARED WRITE COSTS A PROGRAM WITH NO REACTIVITY, and every line of it is
the price: the setting is an array element, so the assignment notifies nobody and the program itself
has to know who was reading. `hot[u]` and `hotDecks[u]` are that knowledge, gathered at the mount
(see THE APP'S FIVE USERS above); `j < card.count` is how a permanent POSITION answers "is my node
on screen", which `reconcile` will not answer for anybody, and a deck needs no such question because
a deck is never removed.

BOTH VALUES ARE RECOMPUTED WHERE THEY ARE WRITTEN. `tagTextOf` runs forty times for at most four
distinct strings, and `dateTextOf` runs twice for ONE — the two decks share an author and therefore
a precision, and this is the app's one value with real formatting cost, so the saving would be the
larger of the two. Neither is held, and the refusal is the same one: a program with no abstraction
computes the value where it writes it, and a table of formatted strings is a STRATEGY a participant
has to WRITE and be measured for, not something the ceiling helps itself to on the way past.

THE COUNTER IS THIS APP'S, advanced there and nowhere else — two apps standing side by side in a
gate each hold their own, which is what makes `roundUserOf` naming a different user in the two trees
impossible.

DECLARED TO `card-driver.ts` AS THE ROUND'S APP-LEVEL OPERATION, and it is THE SAME closure `flip`
calls — never a second spelling of it. That identity is what makes the called round and the clicked
round one program.

## The handle

`flip` is the same update round every framework runs: rename every deck, toggle every details block,
advance every tag list, then advance one user's setting — see `AppHandle.flip` for the order and why
it is part of the contract. All four have committed by the time the last call returns.

`teardown` has nothing to dispose. Stage0 holds no subscriptions and no registry; the handlers are
properties of the nodes they are on, so all of it dies with the container the caller removes.

## Verification (`participants/stage0/app.tsx`)

A timing comparison against markup that does not match is worthless, so this is the gate: mount the
reference app and this one side by side and diff the HTML, then run one update round and diff again,
then a SECOND update round and diff a third time (the update is what would expose a different
conditional strategy or a list that grew at the wrong end). Comments are stripped from both sides by
`markupOf`, and here that forgives nothing at all: stage0 emits no markers of any kind — no comment
anchors, no binding attributes, no expando that serialises — so this participant is expected to
produce the reference's bytes exactly. The element count is printed beside every result because that
is the part a comment strip cannot excuse.

### The third stage

A SECOND update round, for the reason `apps/exodra/exodra.md` argues at length and
`svelte-marko-gate.ts` repeats: one round moves every card in ONE direction only, while a second
round puts a GROW straight after a SHRINK on the same tag list — the cards that started at 4 wrapped
to 1 on the first click and go 1 → 2 on the second — and a SHRINK straight after a GROW. Here that
is aimed at the two pieces of per-card bookkeeping this participant keeps BY HAND: `rendered`, the
previous array `reconcile` is diffed against, which is wrong for the rest of the card's life if a
single round ever leaves it out of step with the DOM; and `details`, the block that is dropped and
re-cloned rather than parked, whose re-insertion has to land in front of the `.tags` div a second
time. Neither shows at mount and neither shows after one round. It costs one extra flip in a gate
nothing times.
