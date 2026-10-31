# The UHTML participant

THE same 10-deck / 80-card todo app as the reference in `apps/exodra/exodra.tsx`, written in UHTML
(5.0.9).
Same data (imported from todo-spec, never re-declared), same decks, same cards, same details toggle,
same dynamic tag list, same two handlers per card and the same one per deck.

## WHY UHTML IS IN THIS COMPARISON

It is the `parts` model in its lightest form, and it is the closest neighbour Lit has: a tagged
template literal is parsed ONCE per call site into a `<template>` plus a list of holes, and every
instance is `document.importNode` of that fragment followed by a walk to each hole's recorded
position. The difference from Lit — and the reason having both is worth the row rather than being a
duplicate — is HOW the position is reached: Lit re-walks each clone with a `TreeWalker`, counting
nodes, while uhtml records a PATH (an array of child indices) at parse time and replays it with
`path.reduceRight((n, i) => i < 0 ? n.content : n.childNodes[i], root)` (`resolve.js`). That is one
step closer to the schema core's claim — that a port's address is decided once — and one step short
of it, because the address is still a path to be walked per instance rather than a slot in a table.

## HOW THIS APP IS STRUCTURED, and the decisions that are not obvious

(2b) is not a decision — it is a property of uhtml that a reader who assumed the field was uniform
would get wrong.

### (1) THE UPDATE PATH IS COMPONENTS + SIGNALS, NOT A REPEATED `render()`

uhtml 5 has both, and they are not equivalent. `render(where, () => …)` runs its function in an
`effectScope` and, on a second call with the same template, updates in place. But it then stores THE
NEW HOLE as the known one — `rendered.set(where, [scope, hole])` in `src/dom/index.js`, with
`known[1].update(hole)` having been called on the OLD hole and nothing transferring that hole's
materialised state to the new one. The hole it stores has `n === null` and `v` still holding raw
interpolation values rather than the `[type, update, value, node]` entries `valueOf()` produces, so a
THIRD call to `render()` on the same container would run `update()` against those raw values. The
component path does not have this shape: `getHole()` keeps the materialised hole and only replaces
it when the template itself changes. Read off `uhtml/src/dom/index.js` and confirmed identical in
the shipped `dist/prod/dom.js` at 5.0.9 — READ, NOT MEASURED, and stated because it is the reason
this file is written the way it is rather than as one `render()` per update.

It is also the idiom the README leads with: "React like components with Preact like signals", and
its first example is a component reading `count.value` inside its own body. A signal read inside a
component subscribes THAT component's effect (`createEffect` in `rabbit.js` wraps the component call
in `effect()`), so a write re-runs one component and diffs its hole against the live one — which is
the same granularity `apps/lit/lit.tsx` gets by giving each card its own render root, and the same
one the
reference app gets from a per-card binding.

A signal read at the TOP level of a `render()` callback subscribes nothing at all, because the hole
is materialised outside the scope; that is the other half of why components are used here.

### (2) THE CONDITIONAL DETAILS BLOCK IS AN ARRAY OF ZERO OR ONE

Not `` cond ? html`…` : '' ``.

A uhtml hole is typed at PARSE time from the first value it is given: an array becomes
`COMMENT | ARRAY` and is committed through `udomdiff`, anything else becomes a plain `COMMENT` hole.
Handing a plain hole a template result on one render and a string on the next is the case
`Hole.update()` guards with `errors.invalid_interpolation` in debug mode, so a `` cond ? html`…` : '' ``
conditional is not a supported program in 5.x. An array is: `[hole]` shows the block and `[]` removes
it, with the `<!--◦-->` marker left in the DOM as udomdiff's anchor. That is the same shape the
schema core uses (a conditional IS a list of zero or one) and it is what uhtml's own arrays are for.

### (2b) THE TAG LIST IS MATCHED BY POSITION, NOT BY THE TAG STRING

Stated here because the rest of the field is keyed and a reader who assumed uniformity would be
wrong. An array of `Hole`s committed into a `COMMENT | ARRAY` hole goes through `holed(prev, current)`
in `rabbit.js`:

```js
for (let c, p, j = 0, i = 0; i < l; i++) {
  c = current[i];
  changes[i] = j < h && (p = prev[j++]).t === c.t ? (current[i] = p).update(c) : c.valueOf(false);
}
```

`prev[j++]` against `current[i]` is index against index, and the only check is that the two came
from the SAME TEMPLATE (`.t`); the tag string is never consulted. uhtml does have keys — a `key`
attribute sets the `KEY` flag and `Hole.update` then looks the hole up in a `Keyed` map — and this
app does not use one, so this is uhtml's default and not a deviation invented here.

IT PRODUCES THE SAME NODES AS KEYING ON THIS APP, which is why it is a note rather than a defect:
the tag list is always `c.tags.slice(0, count)`, a growing or shrinking PREFIX of the card's four
fixed positions, so position and value agree for every element that survives — index k holds
position k's tag before and after. The two would diverge on a list that reorders or removes from the
middle, and this app has neither. Re-read against uhtml 5.0.9's `src/dom/rabbit.js`; READ, NOT
MEASURED.

### (3) THE THREE DERIVED VALUES ARE READ AND COMPUTED INSIDE THE COMPONENT

Which is the README's own shape and not a shortcut. uhtml's leading example is a component that
reads `count.value` in its own body and interpolates the result; a signal read there subscribes THAT
component's effect (`createEffect` in `rabbit.js` wraps the component call in `effect()`), so a write
to `open` or `count` re-runs this one card's function and diffs its new hole against the live one.
The headline, the disclosure attribute and the count label are therefore ordinary calls in ordinary
interpolations, computed from `c.open.value` and `c.count.value` where they are used.

`computed` WAS NOT USED, and uhtml does export it (`signal, computed, effect, untracked, batch` from
`./signals.js`, re-exported from `@webreflection/alien-signals`). What it would buy is narrower: the
card's effect re-runs on ANY of its signals, so with three `computed`s per card a `.addtag` click
would still re-run the component but would return the headline and the disclosure string from cache
instead of recomputing them, and a `.tog` click likewise for the count label. What it would cost is
three computed nodes and their dependency links per card — 240 at this app's size — against a saving
of one `slice(0, 14)` plus a concatenation. It is a real alternative and it is not the one the README
leads with. READ, NOT MEASURED.

WHAT IS HELD AS STATE, since holding it twice would be the one thing that makes the round dishonest:
TWO SIGNALS PER CARD, `open` and `count` — the two things a click changes — ONE PER DECK, the index
into `DECK_TITLES` its name shows (5), plus FIVE PER APP, one per user's setting, and nothing else.
The tag ARRAY is derived inside the component (`c.tags.slice(0, c.count.value)`), not stored in a
signal of its own, because a second signal written by the same handler would make alien-signals flush
TWICE for one `.addtag` click (`signalOper` calls `flush()` per write when `batchDepth` is 0) and
this participant would re-render every card twice per round where the rest of the field renders once.
`title` and the user's NAME are plain fields: both are constant for the life of the card.

## (4) THE FIVE USERS, AND THE ONE PLACE THIS PARTICIPANT USES `computed`

READ THIS BEFORE THE NUMBERS, BECAUSE IT IS THE ONE DECISION HERE THAT COULD BE MADE THE OTHER WAY.

The scene now has five users per mounted app (`todo-spec.ts`, THE USERS). A card renders its user's
NAME — a constant — and a TAG renders its label clipped to ITS OWN user's setting, which MOVES: one
round advances one setting and forty tags in forty different cards must end up with new text. It is
the first write in this app that reaches more than one card — and since the decks arrived it reaches
two DEPTHS as well, because the two decks that user authored render their dates at the precision the
same cell holds. (5) is where that half is argued.

THE SETTINGS ARE FIVE SIGNALS, created in the mount and held there — not at module scope, where two
apps standing side by side in a gate would share them, each round would advance one twice, both trees
would agree and every byte diff in the suite would pass over a scene running at double speed.

THE FAN-OUT IS THE COMPONENT EFFECT AND NOTHING ELSE, which is the whole reason this app is
components + signals: a card component that renders a tag of user `u` READ that user's setting while
it ran, so alien-signals linked it, and the write re-runs exactly those cards. Nobody enumerates who
is reading — the participants with no reactivity (`lit`, `mikado`, `stage0`) have to build that list
by hand at the mount and ask `j < count` per entry, and this one does not have the list at all. What
it pays for that is CARD granularity: a card re-runs its whole template for one tag's text, and the
other four parts dirty-check and write nothing.

AND THE CLIP IS SHARED WITH `computed`, TWENTY OF THEM PER APP — one per (user, label) pair, in
`clip[u][j]`. THIS IS A DECISION AND NOT A DETAIL:

-   WHY IT IS HERE. The forty texts one advance produces are at most FOUR distinct strings (four
    labels, one setting), and `computed` — exported from uhtml's top level, `Computed` over
    alien-signals — is the library's own answer for a derived value read from more than one place.
    Sixteen tags read each of these, across sixteen different cards. A write therefore recomputes FOUR
    clipped strings and forty tag positions read a cache; the DOM writes are the same forty either way,
    so what the sharing changes is the recompute and nothing else.
-   WHAT IT COSTS: twenty computed nodes and their dependency links per mounted app, allocated in the
    mount and never touched again. Against 200 tag positions that is one node per ten.
-   THE OTHER SHAPE, and it is the one this file's own (3) argues for the three per-card values: write
    `tagTextOf(t.label, chars[t.user].value)` in the interpolation and clip every tag every time its
    card runs. It is what a reader of the README would write first, and it is the shape this row would
    be measured in if the owner prefers it — delete `clip`, resolve `tags` to the spec's
    `{label, user}` rows, and rewrite one interpolation. Nothing else depends on it.
-   THE ARITHMETIC THAT DECIDED IT, and it is the opposite of (3)'s. There, three computeds PER CARD
    (240 of them) would have bought one avoided `slice(0, 14)` per card render. Here the same question
    is asked of a value that EVERY CARD RENDER RECOMPUTES ONCE PER TAG IT SHOWS: a round re-runs each
    card at least twice (`.tog` and `.addtag` each flush on the write) and forty cards a third time,
    which is ~200 card runs over an app that is showing 200 tags at any moment — on the order of FIVE
    HUNDRED clipped strings per round in the plain shape, against FOUR here, because a computed only
    recomputes when its setting moved and every other read is a cache hit. Those are COUNTS off the
    code and this file's own control flow, NOT MEASURED — and they are the reason this decision is
    written out at this length instead of being made quietly.

A COMPUTED IS SAFE TO SHARE HERE and it is not safe to share in every library —
`apps/sinuous/sinuous.md`
carries the counterpart note: Sinuous's `computed` is a TREE-OWNED computation (a lazy read from
inside another computation makes it that computation's CHILD, and `_unsubscribe` disposes children
recursively), so the same twenty-node table cannot be written there at all. alien-signals has no such
ownership: a computed is a graph node with subscribers, and reading it from forty effects links forty
edges. Read off `sinuous/src/observable.js` and `@webreflection/alien-signals/index.js` +
`alien-signals`, not measured.

## (5) THE THIRD LEVEL: A DECK IS ANOTHER COMPONENT, AND ITS UNIT OF UPDATE IS THE CARD'S

The app is three deep now (`todo-spec.ts`, THE DECKS): ten decks, each holding eight of the same
eighty cards. NOTHING NEW WAS INTRODUCED FOR IT AND NOTHING COULD HAVE BEEN. This participant has
exactly one unit of update — a component effect that runs the function, allocates ONE Hole and diffs
it against the live one (1) — so a deck is a component, for the same reason a card is: it is the
thing that owns the state a click writes.

WHAT ONE DECK RUN ALLOCATES, counted off the body of `Deck`: one Hole for the deck's own template,
plus EIGHT more, because the `.cards` interpolation builds a fresh component hole per card on every
run. Those eight go into an ARRAY hole and take the path (2b) already describes — `holed()` walks
`prev[j++]` against `current[i]` and checks only that the two came from the same template, which
here they always are. WHAT A COMPONENT HOLE'S `update()` THEN DOES WITH THE NEW PROPS IS NOT READ
HERE and this file does not claim it. What is certain is the eight allocations, and that a card's
state lives on its RECORD (`cards` in the mount) and never in a hole — so the bytes are the same
whichever way that call goes, and only the work differs.

THE DECK'S STATE IS ONE SIGNAL, an index into `DECK_TITLES`, written once per `.ren` click exactly as
`open` and `count` are written once per click one level down, and flushed inside the write like every
other signal here.

### WHAT ONE SETTING WRITE NOW WAKES, AT TWO DEPTHS

`<time class="date">` reads the author's setting — one of THE SAME five cells the tags read — in the
deck component's own body, which is how this participant reaches every shared value it has: reading a
signal inside a component links THAT component's effect, and nobody enumerates who is listening. So
one `advance()` re-runs the cards that are showing a tag of that user (forty of them at the mount)
AND the two decks that user authored. One write, two depths, the same mechanism at both — and the
deck's link exists for the same reason a tag's does, because the value was read while the effect ran.

### WHAT CARD GRANULARITY COSTS AT THIS LEVEL, WHICH IS THE FIRST PLACE IT IS EXPENSIVE

A component effect re-runs the WHOLE function, so every value in it is recomputed whenever ANY signal
it read moves. That is already true of a card — a `.addtag` click recomputes the headline that only
`open` can change — and it bites harder one level up, because `dateTextOf` is the one value in this
app with real formatting cost (six `getUTC*` reads, two table lookups, two zero-pads —
`todo-spec.ts`). Per round, off this file's own control flow:

| step              | what it costs                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ten `.ren` clicks | ten NAMES written, and ten DATES re-formatted that nothing has moved yet — the advance is step four, so at this point no setting in the round has changed and all ten decks re-format to the string they already show |
| one `advance()`   | two DATES re-formatted, this time to a new string, and the two NAMES beside them rebuilt although the rename that moved them was three steps ago                                                                      |

so a round runs `dateTextOf` TWELVE times to produce TWO different strings.

THE ALTERNATIVE IS THE ONE (4) TOOK, and it is refused here for (3)'s reason rather than (4)'s: one
`computed` per deck over the author's setting, ten nodes per app, after which a rename pulls a cache
instead of formatting. (4) bought SHARING — sixteen cards read each clip — and a deck's date has
EXACTLY ONE READER, because `deckDateOf(d)` is distinct for every deck, so the two decks a user
authors share the setting and nothing else. A memo with one reader is a cache laid over this
participant's own granularity, and the deck is the last place to paper that granularity over: it is
precisely where "recompute when the source moved" and "recompute what the subtree renders whenever
the subtree renders" cost different amounts. The counts above are off the code and this file's
control flow, NOT MEASURED.

## WHAT UHTML PUTS IN THE DOM THAT THE REFERENCE DOES NOT

One `<!--◦-->` comment per ARRAY hole, as the anchor above. Text holes leave nothing — `comment_hole`
REPLACES the marker with the Text node it creates. `markup-gate.ts` strips comments from both sides
for exactly this class of marker (Solid, Lit and Angular all need it; the schema core marks nothing),
and the element count printed beside every result is what a strip cannot cover. Nothing else is
stripped and nothing else needs to be: an interpolated attribute never reaches the markup at all,
because the parser records its path and name and never writes it into the template it serialises
(`parser/index.js`), and `key`, when used, is consumed the same way.

## NOTHING TO FLUSH

alien-signals — which is what `signal` is here, via `@webreflection/alien-signals` — propagates and
flushes inside the write unless a `batch()` is open (`signalOper` calls `flush()` when `batchDepth`
is 0), so the component effect has re-run and the DOM has been written by the time a handler returns.
No counterpart to react's `flushSync`, svelte's `flushSync`, voby's `tick` or marko's `run` is
needed.

## IT IS THE PRODUCTION BUILD

uhtml's exports map points `.` at `dist/prod/dom.js` and its debug build is a separate specifier
(`uhtml/debug`), so there is no `development` condition for the dev server to pick — the trap
`vite.config.ts` had to close for React, Solid and Lit does not exist here.

## THE TYPES

`TUhtmlSignal<T>` is what uhtml's `signal()` returns; its own typing is `(...args: any[]) => any`.
`TUhtmlComputed<T>` is what `computed()` returns — the same surface, read-only (`Computed extends
Signal` in `@webreflection/alien-signals`, whose setter throws), and its own typing is the same `any`
shape.

## THE CARD RECORD (`TUhtmlCard`)

One card's reactive state and the two handlers that write it.

-   `title` — `titleOf(i)`, computed once: constant for the life of the card, and `headlineOf`'s input.
-   `user` — the card's user's NAME, resolved once — the shared read that never moves. A plain field
    and not a signal, because paying a signal for it would buy the right to be told about a change that
    cannot happen.
-   `tags` — THIS CARD'S FOUR TAG POSITIONS, each already resolved to THE COMPUTED that renders it —
    see (4). `tagsOfCard(i)` says which user position `j` belongs to; this array turns each of those
    into `clip[user][j]`, shared with the fifteen other cards holding the same (user, label) pair.
    Built ONCE per card, so the array the component slices is a prefix of a fixed array exactly as
    `POOL` was.
-   `count` — the card's tag COUNT, the state. The tag array itself is derived in the component.

## THE DECK RECORD (`TUhtmlDeck`)

ONE DECK'S RECORD — see (5). The same shape as a card's, one level up: what is constant is a plain
field, what moves is a signal, and what is shared is resolved to the cell itself at the mount so the
component reads what it already holds.

-   `author` — the AUTHOR'S NAME, resolved once: the deck-level twin of a card's `user`, and a plain
    field for the same reason — a signal here would buy the right to be told about a change that cannot
    happen.
-   `when` — the deck's creation date, constant for its life: `dateTextOf`'s other input, and the one
    that never moves.
-   `detail` — THE AUTHOR'S SETTING ITSELF, the very signal forty of that user's tags read two levels
    down, resolved here at the mount exactly as `tags` above resolves to its shared computeds. Reading
    it inside the component is what links the deck's effect to the app's fan-out.
-   `name` — THE DECK'S OWN STATE: an index into `DECK_TITLES`, one signal, one write per `.ren` click.
-   `cards` — the eight card records this deck renders, in global index order.

## `NO_DETAILS`

The hidden state of the details block. A module constant, because it is never mutated — `holed()`
writes only into the array it is given as the NEW value — and because allocating a fresh `[]` per
hide is an allocation no other participant makes.

## `Card`

THE MARKUP IS ONE UNBROKEN LINE — every byte between `<` and `>` and between two elements — because a
tagged template keeps every byte it is given (uhtml only `.trim()`s the ends), so a newline plus
indentation anywhere in the QUASIS becomes a whitespace Text node in the DOM, and this app's gate
diffs `innerHTML` byte for byte against a reference that has none.

WHERE A LINE MAY BE BROKEN, and it is the only place: INSIDE a `${…}`. What sits between the braces
is an expression, so the whitespace around it is JavaScript whitespace and never reaches a quasi.
That is the technique used to keep the long interpolations readable.

PRETTIER WOULD UNDO THIS, and did once — a repo-wide `--write` that reflowed the embedded HTML in
every `html` tagged template in this package and took four axes down with it. `.prettierrc` now
carries `"embeddedLanguageFormatting": "off"`, and the `prettier-ignore` is the second lock, so that
this template's shape does not depend on one config line.

The two handlers come from the card's state rather than being written inline, because a fresh pair
per render would be this participant allocating 160 closures per update round that no other
participant allocates — and because a stable identity means uhtml's event part skips the
`removeEventListener`/`addEventListener` pair entirely (`Hole.update` only commits an entry whose
value changed).

THE THREE DERIVED VALUES ARE THE THREE PLAIN CALLS, each in the interpolation that uses it — see (3)
for why they are not `computed`s. `c.open.value` is read three times and `c.count.value` twice, in
the places the values are needed; alien-signals links a dependency once per effect however many times
it is read, so the repeats cost the getter and not a second edge.

THE FOURTH IS A `computed` AND IS READ, NOT CALLED: `t.value` on a tag's shared clip — see (4).
Reading it here is what links THIS card's effect to that (user, label) pair, and it is why an advance
re-runs exactly the cards that are rendering a tag of the user that moved: a position beyond `count`
is never sliced, so it is never read, so no edge exists to notify.

THE `<span class="user">` IS A PLAIN FIELD IN A HOLE. It differs per card, so it cannot be part of
the static markup; it never changes, so it is not a signal. The hole is written once, at the first
render, and compared-and-skipped on every render after.

ATTRIBUTE ORDER ON THE `.tog` BUTTON is `class` then `aria-expanded`, and uhtml produces it without
being asked: the parser records an INTERPOLATED attribute's path and name and never calls `prop()`
for it (`parser/index.js`), so the serialised template carries only the static `class` and
`attribute('aria-expanded')` writes the rest with `setAttribute` at the fill.

## `Deck`

ONE DECK — the third level, and the same kind of thing a card is: a component, whose effect runs this
function, allocates one Hole and diffs it against the live one. (5) is the argument for that; this is
what it looks like.

THE SAME ONE-LINE RULE APPLIES AS ON `Card` and for the same reason — a newline in a QUASI is a
whitespace Text node in the DOM, and the gate diffs bytes — so the breaks are all inside `${…}`, where
the whitespace is JavaScript's and never reaches the template.

NO ELEMENT HERE CARRIES AN INTERPOLATED ATTRIBUTE, so the deck asks nothing of the parser that the
`.tog` button's `aria-expanded` has not already answered: `@click` is recorded by path and name and
never serialised, leaving `<button class="ren">rename</button>` in the markup.

THE TWO INTERPOLATIONS THAT MOVE ARE PLAIN CALLS, like the card's three (3) and unlike the tag's
shared clip (4): the name is read from this deck's own signal, and the date from the AUTHOR'S — one
of the five cells the tags read, whose read here is what subscribes this deck to the app's fan-out.
Both are recomputed on every run of this function, which is what (5)'s last block counts.

THE EIGHT CARDS ARE INTERPOLATED AS AN ARRAY OF COMPONENT HOLES, freshly built per run. It is a FIXED
list — the same eight records, in the same order, for the life of the app — so nothing here is asked
to reorder or key; the only list in this participant whose length moves is the tag list two levels
down.

## THE MOUNT

THE APP'S FIVE USERS AND THE TWENTY SHARED CLIPS — see (4). BOTH ARE PER MOUNT AND NOT PER MODULE.
Two apps side by side in a gate would share five module-level signals, each round would advance one
twice, both trees would agree, and every byte diff in the suite would pass over a scene running at
double speed.

`clip[u][j]` is user `u`'s setting applied to the label at tag position `j`. Twenty nodes for two
hundred tag positions; a write to one setting makes four of them dirty and the cards reading them
pull the four strings once each.

THE FOUR POSITIONS are resolved to the shared computeds ONCE. `tagsOfCard(i)[j].user` is `(i + j) % 5`,
so a card's four positions land on four different users' rows of the table above and one user's tags
are spread over the app instead of gathered in it.

ONE SIGNAL WRITE PER CLICK, deliberately — a second signal written in a handler would flush
alien-signals twice and re-render that card twice for one click.

THE OTHER DOOR INTO THIS CARD — `noteCardOps(card.toggle, card.addTag)` hands over the SAME two
closures the `@click` bindings carry, so `app-update` can run this row's update round with no
synthetic event. Nothing is allocated for it: both already exist on the card record, and their stable
identity is what lets uhtml's event part skip a `removeEventListener`/`addEventListener` pair.

THE TEN DECKS each build their own eight cards — which is why `buildCard` is a function and no longer
an `IDX.map` body. The cards keep their GLOBAL indices (`cardsOfDeck(d)` is `8d … 8d+7`), so every
per-card formula reads what it read before the decks existed, and both registries come out in
document order: deck `d` declares its rename before its eight cards declare their pairs, and deck
`d + 1` after all of them.

THE DECK'S RENAME is ONE SIGNAL WRITE PER CLICK, as in the card's two handlers and for the same
reason: a second write here would flush alien-signals twice and re-run this deck twice per rename.

THE OTHER DOOR INTO THIS DECK — `noteDeckOps(rename)` hands over the SAME closure the `@click`
binding carries, declared before the cards so that ten renames arrive in document order.

THE AUTHOR'S CELL is resolved once. `deckUserOf(d)` is `d % 5`, so each of the five is the author of
exactly two decks and is read at BOTH depths — in the deck, and by the forty tags of that user
scattered through the cards.

ONE render CALL FOR THE LIFE OF THE APP — see (1). Everything after it happens through the per-deck
and per-card effects the components installed.

### `advance`

THE ROUND'S ONE APP-LEVEL OPERATION — one user's setting advanced. No button, no card.

ONE SIGNAL WRITE, like the three handlers above, and for the same reason: alien-signals flushes per
write when no `batch()` is open, so a second write here would run the fan-out twice. Everything that
follows is uhtml's, AT TWO DEPTHS: the four clips of that user go dirty and the cards reading them
re-run, and the two decks that user authored re-run because their `<time>` read the same cell. The
DOM is written before this returns.

`advance` is DECLARED TO `card-driver.ts`, and it is THE SAME closure `flip` calls.

### The handle

`flip` is the same update round every framework runs, in the order `AppHandle.flip` fixes: rename
every deck, toggle every details block, advance every tag list, then advance one user's setting. All
four have committed by the time the last call returns.

`teardown` has nothing to unwind. uhtml's per-deck and per-card effects are subscribed to signals
that this mount owns and nothing else references, so the whole graph is garbage together once the
caller drops the container; its `rendered` registry is a WeakMap keyed by that same container, and
the `Keyed` maps this app never creates would be WeakRefs anyway. Dropping the decks drops their
cards with them.

## THE VERIFICATION GATE (`participants/uhtml/app.tsx`)

A timing comparison against markup that does not match is worthless, so this is the gate: mount the
reference app and this one side by side and diff the HTML, then run one update round and diff again,
then a SECOND update round and diff a third time (the update is what would expose a different
conditional strategy or a tag list that grew at the wrong end). Comments are stripped from both sides
by `markupOf` — see above for exactly which comments uhtml emits and why nothing else needs forgiving
— and the element count is printed beside every result because that is what a strip cannot cover.

### THE THIRD STAGE

A SECOND update round, for the reason `apps/exodra/exodra.md` argues at length and
`svelte-marko-gate.ts` repeats: one round moves every card in ONE direction only, while a second
round puts a GROW straight after a SHRINK on the same tag list — the cards that started at 4 wrapped
to 1 on the first click and go 1 → 2 on the second — and a SHRINK straight after a GROW. Here that is
aimed at `udomdiff`, which reconciles the tag array between two anchors it holds from the previous
pass: an array cut to one and then grown again is where a stale end anchor or a hole that
re-materialised in the wrong position would first show. The details block is the same question in the
other shape — it is an ARRAY hole of zero or one, so its `<!--◦-->` anchor has to survive an empty
pass and place the block back in front of the `.tags` div on the next one. Neither shows at mount and
neither shows after one round. It costs one extra flip in a gate nothing times.

IT IS ALSO THE FIRST STAGE AT WHICH A DECK'S DATE HAS TO STAND STILL. Round 0 moves user 0 — deck 0's
author — so the first round moves deck 0's date and proves nothing about selectivity; round 1 moves
user 1, so the second round must move the dates of decks 1 and 6 and leave the other eight exactly as
they were. That is the deck-level twin of card 0's first tag still reading `inte` after the same
round, one and two levels apart in the same diff.

WHAT IT STILL CANNOT SEE, said here because (5) turns on it: whether this participant RE-RAN the
eight decks that did not move. Re-running a deck whose author's setting stood produces the
reference's bytes exactly — it re-formats the same date — so that difference belongs to the clock and
never to this gate.
