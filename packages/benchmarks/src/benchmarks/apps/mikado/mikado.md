# `mikado.tsx` — Mikado (0.8.400), written directly

THE same three-level todo app as the reference in `apps/exodra/exodra.tsx` — ten decks of eight
cards,
eighty cards, two hundred tags — written in MIKADO (0.8.400). Same data (imported from todo-spec,
never re-declared), same decks, same cards, same details toggle, same dynamic tag list, same two
handlers per card and the same rename per deck.

## Why Mikado is in this comparison

It is the closest neighbour to the schema core BY ADDRESS FORMAT. Mikado compiles a template into a
factory element plus a flat array of "paths"; every dynamic position in the template is an INTEGER
INDEX into that array, and the compiled update function is literally
`_o=_p[0]; _o.n.setAttribute("data-i", …); _o=_p[1]; _o.n.nodeValue = …`. The array is built once per
instance by walking the clone (`create_path`, hops of `>` firstChild / `+` nextSibling /
`|` firstChild-as-text) and then MEMOISED on the DOM node itself, so a node that comes back out of
Mikado's component pool already knows where all its holes are and costs nothing to re-address. That
is the same bet the schema core makes — a port is a number, not a search — arrived at from a
different direction, which is what makes it worth measuring against rather than another compiler.

## Where Mikado's idiom could not reach this app

Stated plainly, because it changes how the numbers should be read. Mikado's unit is a VIEW: a
template plus a root element whose children the view owns completely (`mount()` empties the root it
is given). Everything dynamic that is not a value inside one element is expressed by giving some
element to a nested view:

-   `foreach="data.tags"` on `<div class="tags">` is exactly right for the tag list — the div is the
    nested view's root and the `<span class="tag">` items are its contents. But an INLINE include
    renders into the FACTORY's copy of that div and the card is then cloned, so the include's view has
    never seen the cloned divs; the first `update()` of a card finds a `.tags` div it does not own,
    empties it and rebuilds the list from scratch. That destroys the kept tag's identity, which the
    update axis's second gate checks. So the tag list here is advanced through the SAME mechanism by
    hand: ONE shared `TAG` view that is `mount()`ed on each card's real `.tags` div and `render()`ed
    with the new array. That is what `foreach` does under the hood ("partials get their own
    instance"), minus the clone-the-partial-with-the-card trick that the gate rules out.

-   THE DECK LEVEL HITS THAT WALL A SECOND TIME, one level up, and it is the single fact that decides
    the shape of this file. A deck wants exactly what the tag list wanted: `foreach="data.cards"` on
    `<div class="cards">`, eight cards inside a deck. It fails in the same place for the same reason —
    an inline include renders into the FACTORY's copy of the `.cards` div, the deck is then cloned ten
    times, and the first `update()` of a deck (the round now renames every one of them) finds a
    `.cards` div the include's view has never seen, empties it and rebuilds eight cards from nothing.
    That destroys the identity of eight cards AND of the tags under them, which is the same gate the
    tag list failed, now checking one level deeper. So the card list is written BY HAND exactly as the
    tag list is: ONE shared `CARD` view, `mount()`ed on each deck's real `.cards` div and `render()`ed
    with that deck's eight items.

    HOW THIS ROW'S NUMBER SHOULD BE READ, SAID ONCE AND PLAINLY, because it is now true of two of the
    app's three levels: NEITHER nested list here is expressed in Mikado's template language. Both are
    expressed in JavaScript against Mikado's own view API — `mount()`, `render()`,
    `update(index, data)` — which is what a compiled `foreach` calls anyway, so the clone, the path
    array, the keyed diff and every DOM write in this app are still Mikado's and the timing still
    prices Mikado's rendering machinery. What is NOT priced is Mikado's NESTING: the template author
    who writes this app the obvious way gets the include, and the include is what the gate rules out.
    Read the row as "Mikado with the nesting done by hand, twice", and never as a statement about what
    `foreach` inside `foreach` costs — this file does not contain one.

-   `if="data.open"` does NOT remove the element it is written on — it mounts a nested view on that
    element and renders or CLEARS its children, so `<div class="details" if=…>` would leave an empty
    `<div class="details">` behind on every closed card (841 elements at mount instead of 801 — the
    app div, 80 cards of six elements each, 200 tags and 40 details blocks), and wrapping the block in
    a host element to make `if` work would add 80 elements the reference does not have. There is no
    third option in the DOM renderer; the `extract` directive that would emit a hostless placeholder
    is SSR-exclusive. So the details block is created as an ORPHAN COMPONENT — `view.create()`,
    Mikado's documented way to build a component outside a view's render tree — and inserted before
    the `.tags` div. THIS GIVES MIKADO AN ADVANTAGE: a clone and an `insertBefore` with no bookkeeping
    at all is the cheapest a conditional can possibly be, and cheaper than what the frameworks that
    CAN express it in their templates have to do.

-   The two click handlers do NOT use Mikado's routing (`click="tog"` in the template), because Mikado
    implements routing by leaving the route name in the DOM as a literal `click="tog"` attribute,
    which the reference does not have and the markup gate would (rightly) reject. Mikado's routing is
    delegation — one listener per event type, then a walk up from the target looking for the route
    attribute — so what is here instead is one delegated `click` listener on the app div that reads
    the card's state off the card node. Same mechanism, same one listener, no attribute in the markup.

The card and deck templates themselves are pure Mikado and are where the mechanism under test
actually runs: one factory clone per instance, plus five writes per card and three per deck, all
addressed by integer index.

## The three derived values, and why they are store fields rather than template expressions

The contract's card carries three values that are FUNCTIONS OF STATE: the `<h3>` headline is
`headlineOf(title, open)`, the toggle button's `aria-expanded` is `expandedOf(open)`, and the
`.count` span's text is `tagsLabel(count)`. Mikado has no notion of a derived value, a memo or a
computed — a template expression IS the only place it computes anything, and there are two hard
reasons the formulae cannot live there:

-   A COMPILED EXPRESSION CANNOT SEE THIS MODULE. `compile.js` assembles the render function with
    `Function("data","state","index","_p","_f","_x", …)`, which closes over the GLOBAL scope and
    nothing else. `headlineOf` is an import; a template that said
    `{{ data.open ? data.title : data.title.slice(0,14)+'…' }}` would be RE-SPELLING the spec's
    formula in a string, which is exactly the eleven-private-spellings failure `todo-spec.ts` exists
    to prevent.
-   The reactive row next door (`apps/mikado/mikado-reactive.tsx`) cannot use an expression at all — `{{= }}`
    accepts plain property notation only — so putting a computation in the template here would make
    the two Mikado rows differ by something other than the reactivity, which is the one thing their
    pair is meant to isolate.

SO THE STORE HOLDS WHAT THE TEMPLATE RENDERS: `headline`, `expanded` and `label` are fields, the
handler that moves the state recomputes them with the imported formulae, and the DOM is brought up
to date with `view.update(index, data)` — Mikado's own documented per-item render, and the call that
runs the compiled `_o=_p[n]; _o.n.nodeValue=…` path this file exists to measure. That is what "write
it in Mikado without the proxy" means: the app decides WHEN, Mikado decides HOW.

## The five users — a write that reaches two depths, in a library with no subscription at all

The scene now has five users per mounted app (`todo-spec.ts`, THE USERS). A card renders its user's
NAME — a constant, so it is a fifth store field written once — and a TAG renders its label clipped
to ITS OWN user's setting, which MOVES: one round advances one setting and forty tags in forty
different cards must end up with new text. Nothing in this app had a write that reached more than
one card before.

AND SINCE THE DECKS ARRIVED THE SAME WRITE ALSO REACHES UPWARDS. A deck renders its creation date
through its AUTHOR'S setting (`dateTextOf(deckDateOf(d), chars[deckUserOf(d)])`), and every user
authors exactly two of the ten decks — so advancing user `u` moves 40 tag texts at depth three AND 2
deck dates at depth one, in one operation, through two consumers that read the same integer as a
character count and as a precision respectively.

MIKADO HAS NOTHING TO SUBSCRIBE WITH IN THIS ROW. Its reactive half is the PROXY, and the proxy is
what the row next door (`apps/mikado/mikado-reactive.tsx`) exists to price — this one is deliberately the
same app WITHOUT it, so a setting here is a number in an array and a write is an assignment. The
program therefore has to know who is reading, and the answer is enumerated at the mount: `hot[u]` is
every (card, position) in the app whose tag belongs to user `u` — 320 entries dealt into five
arrays, 64 each — and the round operation walks the one it needs. That is the same table
`apps/stage0/stage0.tsx` builds for the same reason and the same one `apps/lit/lit.tsx` builds in
place of a
context provider's consumer set.

THE DECKS GET A TABLE OF THEIR OWN (`hotDecks`, ten entries dealt into the same five arrays, two
each) RATHER THAN ENTRIES IN `hot`, and the reason is that a hot entry is not a subscriber but a
piece of pre-resolved WORK: a tag entry carries the card, the position and the store object, and the
loop over it does one `slice`, one comparison and one `tags.update`. A deck entry carries a deck and
does one `dateTextOf` and one `decks.update` through a view that is mounted somewhere else entirely.
Merged into one array they would be a union with a branch per entry, taken 64 times to reach 2 — so
the two consumers of one setting are two lists, walked one after the other.

IT IS NOT MAINTAINED AS TAGS COME AND GO, and it does not have to be: a POSITION is permanent and
only its NODE is transient, so the write asks `j < count` — one comparison — and skips the positions
that are not on screen. Their `text` field is still brought up to date, because a position that
re-enters the list is rendered from the store as it stands then; a store the round left stale would
show it at the old setting.

THE WRITE IS ONE `update()` PER MOVED TAG, addressed by the position's integer index — `tags`
mounted on that card's `.tags` div, then `update(j, tag)`. It is the same call the card's own
handlers make one view up, and the reason it is not a `render()` of the whole list is that a render
would diff four keyed items to write one text. With `cache: true` on the tag view, an `update` that
carries an unchanged string writes nothing.

AND THE CLIP IS RECOMPUTED PER TAG — one `slice` per entry in `hot[u]`, which is 64 of them (the ~40
on screen and the ~24 whose store still has to be right for when they come back) for four distinct
strings. There is nothing in Mikado to hold four strings in, and holding them by hand would be a
cache the library did not give this app. The loop could be turned inside out — four labels first,
then their tags — and that would be an APP-LEVEL strategy rather than a Mikado feature, so it is
stated here rather than taken. COUNTS off this file, NOT MEASURED.

## The third level — what a deck is in Mikado, and what its two writes cost

A DECK IS A FOURTH TEMPLATE AND ONE MORE VIEW, and structurally it is the CARD level again with
different numbers: one `Mikado(DECK, { mount: app, cache: true })`, ten instances rendered from one
array, three dynamic positions per instance addressed by integer index, and a store object whose
fields ARE those three positions. Everything the header argues about the card store applies to it
unchanged and for the same two reasons — a compiled expression is built with `Function("data",
"state",…)` and cannot see `deckNameOf` or `dateTextOf`, and the reactive row next door accepts
plain property notation only — so `name`, `author` and `date` are computed in JavaScript with the
spec's imported formulae and written as fields.

WHAT IS GENUINELY NEW AT THIS LEVEL IS THAT ITS VIEW NEVER MOVES. `decks` is mounted on the app div
once and stays there, so a rename or a date write is a bare `decks.update(d, data)` with no
`mount()` in front of it — the only view in this file that can be addressed without first being
pointed somewhere. `cards` and `tags` are one view each, walking ten and eighty roots.

WHAT ONE DECK ALLOCATES, counted off this file rather than measured: one store object of three
strings, one state object holding its index, its constant `Date` and one integer name index, one
entry in `hotDecks`, one `.cards` element reference, and — only while `app-update` is collecting —
one rename closure. Ten of those against eighty card states and two hundred tag objects. There is no
per-deck listener: the `.ren` button goes through the app div's one delegated click, which is where
the two card buttons already went.

THE DECK'S OWN STATE IS ONE INTEGER, an index into `DECK_TITLES`, and it is held on the deck state
and not in the store — the store holds `deckNameOf(d, name)`, which is what the `<h2>` renders. That
is exactly the split the card already has between `count` and `label`, and it is what lets a rename
be `name = nextDeckName(name)` followed by one formula and one `update()`.

THE DATE COSTS ONE `dateTextOf` PER MOVED DECK — two per round, against 64 `slice` calls on the tag
side of the same write. It is the most expensive single value in the app (six `getUTC*` reads, two
table lookups, two or three pads) and the cheapest fan-out in it, and this row recomputes it on
exactly the decks whose author moved: a deck whose author was not this round's user is never
visited, because it is not in the list the write walks. The date is not recomputed for decks that
are merely re-rendered either — nothing re-renders a deck, `update()` is per instance.

AND `update()` IS WHOLE-DECK, exactly as it is whole-card: a rename re-applies the author name and
the date as well as the heading, and a date write re-applies the heading and the author.
`cache: true` on the deck view is what turns the other two into a comparison — three positions
compared, one written — and without it a round's twelve deck updates (ten renames plus two dates)
would be 36 unconditional DOM writes for the 12 values that moved. Same trade as the card view, one
tenth the size. COUNTED off this file, not measured.

## And the thing that almost made it silently wrong — worth reading before changing any of it

MIKADO ADDRESSES A DYNAMIC POSITION BY SIBLING HOPS FROM THE ROOT, NOT BY AN INDEX INTO A FLATTENED
NODE LIST. A vpath is a string like `">+++|"` and `factory.js` → `resolve()` walks it with raw
`firstChild` / `nextSibling` — no element filter, no key, no re-check. The path array is built ONCE
per card node (`create_path`) and MEMOISED on the node forever.

THE CARD'S DETAILS BLOCK IS INSERTED BY HAND, as a child of the card, between the toggle button and
the `.tags` div — Mikado has no conditional that can express it (see above). It therefore SHIFTS
EVERY SIBLING AFTER IT BY ONE. The `<span class="count">` is after it. So a path array built while a
card is OPEN resolves `">+++|"` to the `.tags` div's first tag instead of the count span, and —
because the path is memoised — that card writes its tag label with the count text for the rest of
its life. The failure is per-card and permanent, and it does NOT show up at the mount gate, only
after the first toggle of a card that started CLOSED.

THE FIX IS ORDER, AND IT COSTS ONE CALL: each card's path is built at the MOUNT, immediately after
`cards.node(k)` and BEFORE anything inserts a details block, while the card still matches its
factory exactly. That is what the `cards.update(k, …)` in the mount loop is for; it is not a warm-up
for speed. THE REACTIVE ROW NEXT DOOR IS SAFE FROM THIS FOR THE SAME REASON AND ONLY BY LUCK:
`render()` calls `apply_proxy` → `create_path` on every card as it adds it, which happens before that
file's loop inserts any details block.

TWO COSTS OF THE CHOICE TO UPDATE, both stated rather than left to be found in a profile:

-   EVERY CARD PAYS ONE `create_path` AT THE MOUNT. `create()` applies the render function to the
    FACTORY and clones the result (`mikado.js` → `Mikado.prototype.create`), so a fresh card node has
    no `MIKADO_TPL_PATH` of its own; the mount-loop `update()` builds it — 80 walks per mounted app,
    once — and every round after is the memoised array the header above praises. The reactive row pays
    the identical walk at its `render()`, so the pair still differs by the proxy and not by this.
-   `update()` IS WHOLE-CARD. It re-applies all FIVE dynamic positions, including the two constants
    `data-i` and the user's NAME, so `cache: true` is on the CARD view as well as the tag view: with
    it, each of the five positions is compared against the value `create()` recorded for that node
    before anything is written, so the mount-loop `update()` writes NOTHING and a `.tog` click writes
    the two positions `open` moved and not the other three. Without it every one of those calls would
    be five unconditional DOM writes — 400 of them at the mount alone. The price is one array plus one
    object per dynamic position per card, allocated at the mount.

THE DECK LEVEL DOES NOT HAVE THIS HAZARD, and the reason is worth writing down so that nobody adds a
defensive `decks.update()` to the mount loop out of symmetry. Nothing is ever inserted among a
DECK's own children: its five elements come from the factory and stay, and the eight cards go INSIDE
the `.cards` div, which is a child the deck's three paths never enter — `<h2>`, `.author` and `.date`
all sit before the button, and every hop that reaches them is a `firstChild` or a `nextSibling`
among the deck's own five. So a deck's path array is safe whenever it is built, and it is built
lazily by the first `update()` that addresses the deck — the first rename in a full round, the first
date write in a run that only advances a setting, and either is as good as the other. READ OFF
`factory.js` → `resolve()` AND THIS FILE'S MARKUP, not measured: the first update of each deck pays a
walk the later ones do not, and no mount-loop call is spent to move it.

THE HAZARD THAT REPLACES IT IS THE SHARED VIEW'S CURRENT ROOT, and it is the price of driving both
nested lists by hand. `cards` is ONE view walking ten `.cards` divs and `tags` is ONE view walking
eighty `.tags` divs, so `update(index, data)` means "position `index` OF WHEREVER THE VIEW IS
POINTING". An update issued without re-mounting first writes a card of the deck that happens to be
mounted — the same index, the wrong deck, with no error anywhere — so EVERY card update in this file
is written as `cards.mount(st.cardsDiv).update(st.index, …)` and never as a bare `update`. The second
half of the same rule is that `st.index` is the card's position IN ITS DECK, 0…7, and not its global
index: a card holding `i` would address position 8d+k inside an eight-long view. The `.cards` div is
therefore held on the card state as well, which is one extra reference per card — the smallest part
of what driving the nesting by hand costs, and the only part of it that a reader of the mount loop
would not otherwise see.

## The templates

Module scope, and compiled exactly four times for the life of the process. `Mikado.compile()` is the
runtime compiler; the project's own `npx mikado-compile` CLI would produce a slightly better template
(it can pre-build the cache strategy and fold static expressions), but it is a build step this suite
does not run, and the difference the docs claim for it is "just slightly faster". Whichever compiler
produced it, the compile happens ONCE at module load and never inside a measured region — the same
deal Solid's compiler, lit's template prep and the schema core's port numbering get.

No whitespace between tags: the compiler builds the template through `innerHTML`, and although it
drops whitespace-only text nodes, the markup gate compares `innerHTML` byte for byte and there is no
reason to depend on that.

### `DECK` — one deck

Six elements, one clone, three dynamic positions, all of them TEXT.

NO ATTRIBUTE OF A DECK MOVES, which makes it the one template in this file whose serialisation order
is not an argument: `class` is static everywhere here, so the factory carries all four classes and
the fill writes nothing but `nodeValue`.

AND NO `click="ren"` EITHER, for the reason the header gives for the card's two buttons: Mikado's
routing leaves the route name in the DOM as a literal attribute, and the gate diffs the markup. The
`.ren` click goes through the same one delegated listener on the app div — which now has to tell a
deck's button from a card's, and does it by asking which kind of owner the climb landed on.

`<div class="cards">` IS EMPTY IN THE TEMPLATE and is filled by the shared CARD view at the mount. An
inline `foreach` here is the wall the header describes; this div is that wall's other side.

### `CARD` — one card, whole

Seven elements, one clone, five dynamic positions.

Every expression is a bare field read, because the values behind them are computed in JavaScript with
the spec's imported formulae and written into the store (see above). `aria-expanded` and `data-i` are
DYNAMIC attributes, which `factory.js` deliberately does not put on the factory node — a dynamic
attribute becomes a cache entry and is written with `setAttribute` at the fill, after the static
`class` has already been assigned — so both elements serialise `class` first, which is the order the
contract states.

The `<span class="count">` is a SIBLING of the `.tags` div, not a child. Inside it would be a child of
the root the shared TAG view is mounted on, and that view OWNS its root's children: `mount()` +
`render()` would treat the count span as a stray tag component and remove it on the first update.
Outside, the tag view's region is exactly the tags, as before this span existed.

### `TAG` — one tag

`key="data.label"` puts this view in Mikado's KEYED recycle mode, which is what makes the tags that
survive an update the SAME elements (the rest of the field keys the tag list by the tag string too)
and what lets removed tags go into the keyed component pool and come back with their path array still
on them. The `key` attribute is consumed by the compiler and is NOT rendered.

THE KEY IS THE WHOLE LABEL AND THE TEXT IS THE CLIPPED ONE, and they are two different fields on
purpose: the label is what makes a position that survives an update the same element, and it never
moves, while the text is a function of the tag AND its user's setting and moves whenever that setting
does. Keying by the rendered text would make every setting change look like four new tags.

### `DETAILS`, `DETAILS_VIEW`, `NO_DATA`

The conditional block. Not one byte of it varies, so its template has no expressions at all.

The view the details blocks are cloned from. It is never mounted: `create()` builds its factory on
first use and returns an orphan clone every time after, which is the whole of what this app needs
from it. Module scope for the same reason the templates are — a factory is a constant.

`create(data)` wants a data argument; this template reads none, so one shared object serves.

## The types

`TMikadoTag` — a tag is an object because Mikado's keyed mode reads the key off the item
(`data.label`).

-   `label`: the whole tag name — the KEY, constant for the life of the position.
-   `user`: which of the five users decides how much of the label is shown. Constant.
-   `text`: what the `<span class="tag">` renders: `tagTextOf(label, chars[user])`. Written by the
    round operation whether or not the position is currently on screen — see THE FIVE USERS.

`TMikadoHot` — ONE ENTRY OF THE HAND-WRITTEN FAN-OUT TABLE. A card, WHICH of its four positions
belongs to the user this entry is filed under, and that position's store object. Each card has
exactly one position per user (four positions, five users, `(i + j) % 5` distinct across `j`), so a
card appears at most once in each of the five lists.

-   `j`: the position's index in its card's list, 0…3. On screen exactly while `j < st.count`.

`TMikadoCardData` — what the CARD template reads: five fields, one per dynamic position. Kept
separate from the card's runtime state below so the render data is exactly the template's inputs and
nothing else: `open`, `count` and the full title are STATE, and no expression is bound to any of them.

-   `headline`: `headlineOf(title, open)`.
-   `name`: `userNameOf(cardUserOf(i))` — a CONSTANT, written when the store is built and never again.
    It is a field rather than static markup because it differs per card and there is one factory; with
    `cache: true` every later `update()` compares it and writes nothing.
-   `expanded`: `expandedOf(open)` — a string, because that is what an attribute holds.
-   `label`: `tagsLabel(count)`.

`TMikadoCard`:

-   `index`: this card's position IN ITS DECK'S EIGHT, 0…7, so `update()` takes its O(1) branch.
    Passing the NODE instead would send Mikado through `index(node)`, an `indexOf` per click. IT IS
    NOT `i`: the shared CARD view is mounted on one deck's `.cards` div at a time and eight is as far
    as an index into it goes.
-   `cardsDiv`: the `<div class="cards">` of the deck this card is in — what `cards.mount()` is handed
    before any `update()` of this card, since one view serves all ten decks.
-   `data`: the store object the CARD template renders. The handlers write its three derived fields and
    then hand it straight back to `cards.update()`.
-   `title`: the card's FULL title — constant for its life, and the input `headlineOf` clips.
-   `node`: the card's `<div class="card">`.
-   `tagsDiv`: the card's `<div class="tags">` — the shared TAG view's root while this card is
    updating, and the anchor the details block is inserted before.
-   `pool`: stable per (card, tag) so `slice` keeps the same objects, exactly as the reference does.
-   `details`: the mounted details element, or null when the block is closed. THIS IS ALSO `open`: the
    block's presence is the state, which is what this row already did before the derived values
    arrived, so nothing had to be held twice for them.

`TMikadoDeckData` — what the DECK template reads: three fields, one per dynamic position, and the
same split the card has: the deck's STATE (which of the four titles it is on) is next door, and what
is here is what the three text nodes say.

-   `name`: `deckNameOf(d, name)` — moves on every `.ren` click.
-   `author`: `userNameOf(deckUserOf(d))` — a CONSTANT, the deck-level twin of a card's `.user`.
-   `date`: `dateTextOf(when, chars[author])` — moves when the AUTHOR's setting does, twice per five
    rounds for any given deck.

`TMikadoDeck`:

-   `d`: the deck's index, AND its position in the `decks` view — the shell renders `DECK_IDX` in order
    into a view it never re-mounts, so the two are one number and `update(d, data)` is the O(1) branch.
    A card needs both (`i` and `index`) because its view is per deck.
-   `data`: the store object the DECK template renders. A rename writes `name`, the round writes
    `date`, and either hands the whole object back to `decks.update()`.
-   `when`: this deck's creation date — constant for its life, and the input `dateTextOf` formats. It
    is held for the same reason a card holds its full title: the formula needs it again.
-   `name`: WHICH of the four `DECK_TITLES` this deck is on — the whole of the deck's own state, one
    integer, and the only thing a rename actually mutates.

`TMikadoCardNode` — cards carry their own state so the ONE delegated listener can find it from the
event target. `TMikadoDeckNode` — and decks carry theirs, for the same listener and by the same one
`parentElement` step: the climb from a `.ren` button lands on a deck node exactly as the climb from a
`.tog` lands on a card node, so what tells the two apart is which of the two fields the owner has.

## The mount

Mikado renders a template's instances as the children of a root it is given, so the app div is the
root and is made here rather than by a template.

A view owns its factory, so a view is per mount — sharing one across mounted apps would carry a warm
component pool from the previous sample into the next one and hand this participant nodes it never
built. That is true of all three of these, and it is why the deck view was not made a module constant
when it arrived.

THE DECK VIEW IS THE ONE THAT KEEPS ITS ROOT. It is mounted on the app div here and is never pointed
anywhere else, so `decks.update(d, …)` needs nothing in front of it. `cache: true` for the same
reason the card view has it: an update is whole-instance, and a rename must not rewrite the author's
name and the date as well.

AND THE CARD VIEW IS NOW A TRAVELLING ONE — no `mount` option at all, because there is no one root it
belongs to: it is `mount()`ed on each deck's `.cards` div in turn, exactly as `tags` is on each card's
`.tags` div. See above for why a deck cannot own its cards through a template `foreach`, and for the
mis-addressing that rule exists to prevent.

`cache: true` because this view is UPDATED and not only rendered: it is what makes an `update()`
compare each of the card's five dynamic positions against the value this node was created with and
write only the ones that moved. See above for what it costs and for what the alternative costs.

The tag view is keyed + pooled + DOM-state-cached: the three settings Mikado's own "best practices"
name for a keyed list. `pool` recycles the tags that a shrinking list drops (this list cycles
1→2→3→4→1, so every card gives some back and takes some again) and `cache` is what stops a re-render
from writing a tag's text again when it did not change.

### The app's five users, and the two fan-out tables a setting write goes through

A NUMBER PER USER AND NOTHING ELSE — this row has no proxy and therefore nothing to be notified by,
so the program enumerates its readers at the mount, at both depths that read them.

ALL THREE ARE PER MOUNT AND NOT PER MODULE. Two apps standing side by side in a gate would share
module-level settings, each round would advance one twice, both trees would still agree, and every
byte diff in the suite would pass over a scene running at double speed.

THE COARSE HALF OF THE SAME FAN-OUT — the two decks each user authored, filed under the user whose
setting their dates are rendered through. Ten entries over the same five users the tag table's 320
are dealt over, and a table of its own rather than a union; see THE FIVE USERS for why.

### The listener's body, split into three functions of one owner's state

WHY IT IS SPLIT, and this is the one participant here where the split is not cosmetic. Every other
participant allocates a per-card handler closure that `card-driver.ts` can be handed as it is;
Mikado's click path is ONE delegated listener that reads `e.target`, climbs to the owner node and
branches on `className`, so there is no per-card and no per-deck closure in the program at all. These
three functions are what that listener used to do inline — the same code, in the same order, over the
same state — and the listener below now calls them.

WHAT THE DIRECT DRIVE THEREFORE SKIPS FOR THIS ROW, stated where it happens rather than only in the
axis header: the target resolution. `e.target`, the `parentElement` climb, the `_st` load and the
`className` comparison are in the listener and NOT in these functions, so on `app-update` this row
does not pay them and on `app-update` it does. That is the same thing the axis gives up for Solid (a
document-level delegated dispatch) and for every participant that attaches per node; the axis's
header states it once for the whole table.

`renameOf` — A RENAME: one integer forward through `DECK_TITLES`, one formula, one write. The deck
view is the one that never leaves its root, so this is the only handler here with no `mount()`.

`togOf` — THE TWO VALUES `open` MOVES. The block's presence IS `open`, so the state is read back out
of it rather than held twice. Recompute into the store, then one `update()` — Mikado's per-item
render, addressed by this card's integer index. THE HOP FIRST, ALWAYS: one card view serves ten decks,
so an index means nothing until the view is pointed at this card's deck — the same `mount()` the tag
list has always needed, now one level up as well.

`addTagOf` — the shared TAG view hops to this card's list and reconciles it. `mount()` restores the
per-root bookkeeping Mikado parked on the div, so this is a keyed diff against the tags already there,
not a rebuild. THE ONE VALUE `count` MOVES: the `.count` span is outside the div the TAG view owns, so
it belongs to the CARD's render function and is written by the card's own update — which, like every
card update here, points its view at this card's deck first.

### The mount loop

THE TEN DECKS FIRST, in one `render()` of one array — the only list in this app that Mikado owns
outright, because the app div is a root nothing else competes for. Their three values are computed
here with the spec's formulae for the same reason the card's are: a compiled expression cannot see
`deckNameOf` or `dateTextOf`.

TWO SHARED READS OF THE SAME USER, ONE OF WHICH MOVES: the author's name never can, and the date is
the setting read as a precision. Both are resolved once here; only the second is ever written again.

Then each deck's eight cards, into the deck's own `.cards` div. A deck's state lives on the deck node
and a card's on the card node — the one delegated listener finds whichever it climbed to, so there is
no second list of either to keep in step.

`deckNode.children[4]` is h2, span.author, time.date, button.ren, div.cards. Nothing is ever inserted
among these five, so this index cannot move and the deck's path array has no ordering hazard — see
above, where that is contrasted with the card's details block.

AND IT REGISTERS AS A READER OF ITS AUTHOR'S SETTING — one entry, two decks per user.

THE OTHER DOOR INTO THIS DECK, built on the same terms as the card pair below: one closure per deck,
allocated ONLY while a collection is open, and it is one call of the very function the `.ren` button
reaches through the delegated listener.

THIS DECK'S EIGHT CARDS, by GLOBAL index — `cardsOfDeck(d)` is `8d … 8d+7`, so every card keeps the
index its title, its user and its four tag users are functions of. What is deck-local is only the
POSITION in the view, `k`.

`titleOf(i)` once per card per mount, exactly as the reference's wiring does it, and kept because
`headlineOf` needs it again on every toggle.

THE SHARED READ THAT NEVER MOVES, resolved once per card. Sixteen cards carry the same string and no
code path can ever rewrite it.

POINT THE TRAVELLING VIEW AT THIS DECK AND FILL IT. Every `cards.` call until the end of this
iteration is against this root.

BUILD THIS CARD'S PATH ARRAY NOW, while the card still matches its factory exactly. Mikado resolves a
dynamic position by `firstChild`/`nextSibling` hops and memoises the result on the node, and the
details block this app inserts by hand sits BEFORE the `.count` span — so a path built after that
insertion would address the wrong node for the life of the card. This is a correctness call, not a
warm-up; with `cache: true` on the view it compares the five positions against what `create()`
recorded and writes nothing.

`node.children[3]` is h3, span.user, button.tog, div.tags, span.count, button.addtag — the tags div is
grabbed BEFORE the details block is inserted in front of it, and held from then on. The count span
sits AFTER the tags div, so the index the tags div is at did not move. The user span sits BEFORE it,
and IT MOVED THIS INDEX FROM 2 TO 3 — a card is six elements now.

THIS CARD'S FOUR TAG POSITIONS. Stable objects so `slice` keeps the same items and the keyed view
keeps the same nodes; each carries its own user and the text that user's setting currently asks for.

AND IT REGISTERS AS A READER OF ITS FOUR TAGS' USERS — four entries, four different users, filed once.
This is what a subscription list is in a program that has none.

THE OTHER DOOR INTO THIS CARD. Two closures per card, allocated ONLY when a collection is open
(`app-update` and nothing else) — see `collectingCardOps`. Mikado's program has no per-card handler
for the driver to borrow, so these are built here and each is one call of the function the delegated
listener calls.

THE TAG VIEW TRAVELS INSIDE THE CARD VIEW'S TRAVEL, and the two never collide: they are different
views with different current roots, so pointing `tags` at this card's `.tags` div leaves `cards` where
it is, on this deck's `.cards` div.

### The one delegated listener

ONE delegated listener, which is what Mikado's own routing would install — minus the route attribute
it would have to leave in the markup. STILL ONE, and still one `parentElement` step, now that there
are three buttons and two kinds of owner: `.ren` sits directly in a deck and `.tog` / `.addtag` sit
directly in a card, so the climb is the same length and what it lands on is what has to be told apart.
The class is read once and decides which field of the owner this event is about — a deck's `_dk` or a
card's `_st`.

### `advance` — the round's one app-level operation

One user's setting advanced, and the only write in this app that reaches TWO depths. No button and no
`cards.update()` anywhere in it: a setting moves two deck dates and forty tag texts, and not one thing
the CARD view renders, so the card store is not touched and no card's five positions are re-applied.

THE DECKS FIRST, outermost level first — the same order `flip` puts the rename in, and for the same
reason: nothing here may look like a deck write folded into a card's. Two `dateTextOf` calls and two
`decks.update(d, …)`, with no `mount()` in front of them, because the deck view has never been pointed
anywhere but the app div.

THEN ONE `update()` PER MOVED TAG, and one `mount()` in front of each because the shared TAG view has
to be pointed at this card's `.tags` div before an index into it means anything — the same hop
`addTagOf` makes. A position that is off screen still has its store field brought up to date; see THE
FIVE USERS for why that is not optional.

DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls.

### The handle

`flip` is the same update round every framework runs, outermost level first: rename every deck, toggle
every details block, advance every tag list, then advance one user's setting. Mikado's `render()` and
`update()` are synchronous unless a callback or the `async` option asks otherwise, so there is nothing
to flush.

`teardown` destroys the views only — the nodes die with the container the caller removes, and the one
listener is owned by the app div.

## The byte gate (`participants/mikado/app.tsx`)

A timing comparison against markup that does not match is worthless, so this is the gate: mount the
reference app and this one side by side and diff the HTML, then run one update round and diff again,
then a SECOND update round and diff a third time (the update is what would expose a different
conditional strategy). ALL comments are stripped first, because Exodra marks a fragment's position
with an empty comment anchor and Mikado has no anchors at all — a strategy difference, not a markup
difference. Mikado emits no comments of its own and its per-node bookkeeping (`_mkp`, `_mkd`, `_mki`,
…) lives in expando properties, not attributes, so nothing it does is hidden by the strip.

### The third stage, and why this participant needs it most

A SECOND update round, for the reason `apps/exodra/exodra.md` argues at length and
`svelte-marko-gate.ts` repeats: one round moves every card in ONE direction only, while a second round
puts a GROW straight after a SHRINK on the same tag list — the cards that started at 4 wrapped to 1 on
the first click and go 1 → 2 on the second — and a SHRINK straight after a GROW.

THREE MECHANISMS IN THIS FILE ARE ONLY REACHED BY THAT ROUND, and all three are named above rather
than invented here:

-   THE MEMOISED PATH ARRAY. A card's dynamic positions are resolved by `firstChild` / `nextSibling`
    hops ONCE and kept on the node forever, and this app inserts a details block into the middle of the
    card by hand. The mount loop's `cards.update(k, …)` exists to build that array before any insertion
    — a correctness call, not a warm-up. A card that starts CLOSED first has a block put into it on
    round one, so the round that writes through the memoised array with the card in its OTHER shape for
    a second time is this one.
-   THE SHARED KEYED COMPONENT POOL. `tags` is one view with `pool: true` and `cache: true`, `mount()`ed
    onto each card's `.tags` div in turn. Round one is the first round that puts nodes INTO that pool
    (the cards at 4 drop three tags each); round two is the first that takes them back OUT for a
    different card. A recycled tag arrives with its own path array and its own cached values already on
    it, so a wrong node coming back, or a right node coming back with a stale cache entry, produces
    correct markup for two stages and wrong markup here.
-   THE SELECTIVITY OF THE DECK DATE. Round one advances user 0 and moves the dates of the two decks
    user 0 authored; round two advances user 1 and must leave those two alone while moving two others. A
    row that wrote every deck's date, or wrote it from the wrong user's setting, agrees with the
    reference at the mount and at stage two — where deck 0's date has just been rewritten either way —
    and disagrees for the first time here. It is also the first stage at which a deck's heading is
    written through a path array built by an EARLIER round rather than at the mount, since a deck's path
    is built lazily by its first rename.

It costs one extra flip in a gate nothing times, and if it fails that is the gate working.
