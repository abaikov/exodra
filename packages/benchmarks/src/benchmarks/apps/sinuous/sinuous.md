# Sinuous — a template plus fine-grained reactivity, with no compiler

The same 10-deck / 80-card todo app as the reference in `apps/exodra/exodra.tsx`, written in SINUOUS
(0.32.1). Same data (imported from the shared scene, never re-declared), same decks, same cards,
same details toggle, same dynamic tag list, same two handlers per card and the same one per deck.

The app is `apps/sinuous/sinuous.tsx`. The byte gate is `participants/sinuous/app.tsx`.

## Why Sinuous is in this comparison

It is the third corner of the family this suite is about: stage0 is clone-and-fill with nothing on
top, Lit is a prepared template re-walked per instance, and Sinuous is a template plus FINE-GRAINED
REACTIVITY. Its `h` builds real DOM nodes eagerly, and anything handed to it as a FUNCTION becomes a
subscription: a function child is wrapped in `api.insert` inside `subscribe()`, a function prop in
`api.property` inside `subscribe()` (see `sinuous/src/h.js`). So a write to an observable re-runs one
closure and touches one position — the same shape of program Solid, voby and the schema core run,
and the interesting difference from all three is that Sinuous has no compiler and no prepared
template at all: `h('div', …)` is `document.createElement` plus `insertBefore`, per element, every
time.

That makes it the honest control for a claim the schema core makes about MOUNT rather than about
update — that cloning a prepared prototype beats building the same tree element by element. Sinuous
builds it element by element and updates it fine-grained; the schema core clones and updates it
fine-grained. On this app the two differ almost only in that.

## How it is written, and it is the README's own idiom throughout

-   `h(type, props, ...children)` — hyperscript, one of the three view syntaxes Sinuous offers (the
    other two, ` html` `` and JSX, both COMPILE TO `h` — `` html` ` runs `htm`'s parser at
    runtime, and the JSX route needs two Babel plugins). Hyperscript is what they produce, so it is
    what this participant calls; it also keeps the markup literal, which matters on an axis that diffs
    bytes.
-   `observable(v)` — call it with no argument to read, with one to write. The README's counter is
    exactly this.
-   a FUNCTION CHILD for the conditional details block: `() => open() ? … : null`. That is Sinuous's
    conditional — there is no `<Show>`, no `{#if}` and no directive; a function child IS the reactive
    position, and `insert()` removes what is there and adds what is new.
-   `map()` from `sinuous/map` for the dynamic tag list — the library's own list renderer, reconciling
    by ITEM IDENTITY. Its header credits stage0's `reconcile` and Ryan Carniato's dom-expressions; the
    algorithm is prefix/suffix scans, then a key→index Map and a longest-increasing-subsequence move
    set. That is the same identity the schema core reconciles by, and the same one MOST of the field
    keys by — `<For each>` in Solid and voby, `key={t}` in React, `key="data.label"` in Mikado,
    `repeat(tags, t => t, …)` in Lit. It is NOT universal, and this line used to say it was:
    `apps/uhtml/uhtml.tsx` matches its tag holes BY POSITION (`holed()` in uhtml's `rabbit.js` walks
    `prev[j++]` against `current[i]` and checks only that the two came from the same template), which
    on a list that is always a prefix of a fixed array happens to keep the same nodes anyway. The
    claim was corrected here rather than dropped, because "every participant" was the part that was
    wrong, not the identity.

### The `root` and `observable` casts

`root(fn)` hands `fn` a disposer for every computation created inside it — that is what
`observable.js` does (`fn(() => { _unsubscribe(rootUpdate); … })`) and what every Sinuous example
uses to tear a tree down. The shipped `observable.d.ts` types it as `root<T>(fn: () => T): T`,
omitting the argument the implementation passes, so the call is typed in the app file instead of
being written `any`. Read off `sinuous/src/observable.js`, not measured. `observable()` gets the
same treatment: `TSinuousObservable<T>` is "read with no argument, write with one".

## The three derived values are functions in the positions that use them

And in Sinuous that IS `computed`. `sinuous/observable` exports one, and the README's philosophy
line — "Anything that can be derived from the application state, should be derived. Automatically."
— is written under it. But a function handed to `h` is already run through it: a function CHILD
reaches `api.insert`, which calls `api.subscribe(fn)`, and a function PROP reaches `api.property`,
which calls `api.subscribe(fn)` too — and `subscribe` in `observable.js` is literally
`computed(observer)` plus a disposer. So `h('h3', null, () => headlineOf(title, open()))` creates
exactly one computation, and wrapping the same expression in an explicit `computed` first would
create TWO, one feeding the other, for a value with a single consumer. The explicit form is what
Sinuous is for when a derived value is read from more than one position or from outside the view;
none of these three is. READ off `src/h.js` and `src/observable.js`, not measured.

SO THIS PARTICIPANT DOES ALLOCATE FOR THE RIGHT TO RECOMPUTE, unlike Lit: five computations per card
where there were two — the headline, the disclosure attribute, the details conditional, the tag list
and the count label — each with its observer set membership and its entry in the root's child list.
What it buys is that a write touches only the positions that read the state: a `.tog` click re-runs
three of the five and a `.addtag` click the other two, and no card re-renders.

WHAT IS HELD AS STATE: `open` and `count` per card, two observables, ONE PER DECK — the index into
`DECK_TITLES` its name shows, see THE THIRD LEVEL below — plus FIVE PER APP, one per user's setting,
and nothing else. The tag ARRAY is derived — `map(() => pool.slice(0, count()), …)`, which is why
`map`'s own signature takes `((...args) => T[]) | Observable<T[]>` — rather than being a third
observable the handler writes alongside `count`. `title` and the user's NAME are plain `const`s:
both are constant for the life of the card.

## The five users — one write, forty tags, and the one thing Sinuous's `computed` cannot do

The scene has five users per mounted app (the shared scene, THE USERS). A card renders its user's
NAME — a constant, so it is a plain string child and nothing subscribes to it — and a TAG renders
its label clipped to ITS OWN user's setting, which MOVES: one round advances one setting and forty
tags in forty different cards must end up with new text. Since the decks arrived the same write also
moves two DATES one level up — THE THIRD LEVEL below is that half.

THE SETTINGS ARE FIVE OBSERVABLES, created inside the app's `root` and held there, never at module
scope — two apps side by side in a gate would share five module-level observables, each round would
advance one twice, both trees would agree, and every byte diff in the suite would pass over a scene
running at double speed.

A TAG'S TEXT IS A FUNCTION CHILD, which in Sinuous IS the subscription:
`h('span', {class:'tag'}, () => tagTextOf(t.label, chars[t.user]()))` creates one computation that
reads one observable and writes one Text node's `data`. A setting write therefore touches exactly
the forty positions that are on screen and nothing else — no card re-renders, no list is diffed, and
nothing walks the tree to find them. THE SUBSCRIPTION SET MAINTAINS ITSELF: the computation is
created inside `map`'s per-item `root`, so a tag that leaves the list takes its subscription with it
and one that arrives brings a new one. `lit`, `mikado` and `stage0` all have to build that list by
hand at the mount and ask `j < count` per entry; this row has no list to build.

WHAT IT COSTS: one more computation per MOUNTED TAG — 200 at the mount, against the five per card
the derived values already cost. That is this row's price for the fan-out and it is paid where every
other price in this app is, at the mount.

AND IT RECOMPUTES PER TAG — forty `slice`s for four distinct strings. THAT IS NOT A CHOICE MADE FOR
SIMPLICITY, and the alternative was tried on paper and rejected on the library's own source:

> `computed` IS TREE-OWNED AND CANNOT BE SHARED BY FORTY READERS. A table of twenty
> `computed(() => tagTextOf(label, chars[u]()))` — one per (user, label), which is exactly what
> `apps/uhtml/uhtml.tsx` does with alien-signals — is not a safe program here. `computed`'s `update()` opens
> with `if (tracking) tracking._children.push(update)`, so the FIRST tag computation that pulls a
> stale clip becomes that clip's PARENT; `_unsubscribe(update)` then walks `update._children`
> recursively, so the next time that one tag re-runs it DISPOSES the shared clip — clearing its
> `_observables` while leaving `_fresh` true, after which it is subscribed to nothing and returns its
> last value for the rest of the run. The order in which an observable's observers run is its `Set`
> insertion order, and every computation unsubscribes and re-subscribes as it runs, so which reader
> gets there first is not something this app can fix by construction. Read off
> `sinuous/src/observable.js` (`computed`, `_unsubscribe`, `resetUpdate`), NOT MEASURED.

> THE SAFE SHARED FORM IN SINUOUS is a plain OBSERVABLE per (user, label) that the round operation
> WRITES — observables have no parent/child ownership. It is a real option and it is not taken here,
> because it moves the derived value into app state: the setting would stop being the thing the view
> reads, and this row would be measured deriving nothing. That is a different program, and if the
> owner wants it measured it should be a row of its own rather than this one quietly changed.

## The third level — two more positions per deck, and why the ownership hazard cannot reach them

The app is three deep now (the shared scene, THE DECKS): ten decks, each holding eight of the same
eighty cards. NOTHING WAS INVENTED FOR IT. This participant has one unit of update and it is a
POSITION — a function handed to `h` becomes `api.insert` or `api.property` inside `subscribe()`,
which is `computed()` plus a disposer — so the deck is spelled with that unit and no other:

| position  | what it is                                        | cost            |
| --------- | ------------------------------------------------- | --------------- |
| `<h2>`    | a function child over the deck's OWN observable   | one computation |
| `.author` | a plain STRING child, because nothing can move it | none            |
| `<time>`  | a function child over the AUTHOR'S setting        | one computation |
| `.ren`    | an `onclick` prop holding one closure             | none            |
| `.cards`  | eight eagerly built card subtrees                 | none            |

`.cards` IS NOT A `map()`, and that is the deck matching the scene rather than the scene being
simplified for the deck: its eight cards are decided at the mount and never change, so there is no
list to reconcile — where the tag list two levels down IS a `map()` precisely because its length
follows `count`. An array of nodes is what `h` already takes as children, and it is what the app
shell has always handed it.

WHAT A DECK ALLOCATES: one observable, two computations, one event closure and six elements — ten
times over, against eighty cards at five computations each plus one per mounted tag. Its date and
its author's name are resolved once and captured, exactly as a card captures `title`.

### What one setting write now wakes, at two depths

`chars[u]` is read by forty tag computations at depth three and by the two date computations of the
decks user `u` authored at depth one. One write runs forty-two closures and writes forty-two Text
nodes' `data` — at the mount, where every user owns forty mounted tags — and NOTHING ELSE IS
VISITED: no card re-renders, no deck re-renders, no `<h2>` is rebuilt and the eight card subtrees
under a moving date are not walked at all. The converse holds too, and it is the half a
component-granularity row cannot have (`apps/uhtml/uhtml.tsx` re-runs a whole deck for either
write): a
`.ren` click re-runs exactly one computation, the `<h2>`'s, and does not re-format the date — which
is the app's one value with real formatting cost, six `getUTC*` reads and two table lookups.
Position granularity is what makes those two costs independent.

### The tree-owned `computed` finding, extended to the level above

The block above refused a shared table of twenty `computed`s because Sinuous's `computed` is
TREE-OWNED: a lazy read from inside another computation makes it that computation's CHILD, and
`_unsubscribe` walks `_children` recursively, so whichever reader re-runs first disposes the node
everyone else is reading. THAT HAZARD IS ABOUT A SHARED DERIVED NODE, and the deck level creates
none — by two independent facts, both of which have to hold, because either alone would be an
accident rather than a property:

> THE ONLY THING SHARED ACROSS THE THREE LEVELS IS AN OBSERVABLE. `chars[u]` is `observable()`,
> which holds an observer `Set` and no parent/child link of any kind, so a tag computation at depth
> three and a date computation at depth one may both read it and neither can become the other's
> child, nor dispose it, nor be disposed by it. Sharing an OBSERVABLE is free of the ownership
> question entirely; sharing a `computed` is what carries it.

> AND THERE IS NOTHING TO SHARE AT THIS LEVEL ANYWAY. The tempting node would be one formatted date
> per USER, but `deckDateOf(d)` is distinct for every deck — the two decks a user authors share the
> setting and nothing else — so such a node would have exactly one reader and would buy a cache over
> a position that already recomputes only when its own source moves.

AND THE DECK ADDS NO NESTING TO THE OWNERSHIP TREE. `h`'s arguments are evaluated EAGERLY, so a
deck's two computations and its cards' five each are created in the app's `root` body — the same
place the cards' were created before the decks existed, not inside another computation — and the
per-item `root` inside `map()` remains the only nesting in this app. Read off
`sinuous/src/observable.js` and `src/h.js`, NOT MEASURED.

## What Sinuous puts in the DOM that the reference does not

Stated because a markup gate that forgave something unnamed would be worthless: it marks a reactive
position with an EMPTY TEXT NODE, not a comment — `api.add(el, '')` in `h.js` for a function child,
and two of them (`beforeNode`/`afterNode`) around a `map()` list. Empty text nodes serialise to
nothing at all in `innerHTML` and they are not elements, so they change neither the byte diff nor
the element count; the gate is the shared one, unwidened, and it is expected to pass on the
reference's exact bytes.

## Nothing to flush

`sinuous/observable` runs its observers synchronously inside the write (`data(nextValue)` calls each
observer before returning; the only way to defer is the explicit `transaction()`), so a `flip` has
committed by the time it returns — the one thing every axis requires. No counterpart to react's
`flushSync`, svelte's `flushSync`, voby's `tick` or marko's `run` exists or is needed.

## One card

Built eagerly — `h` returns the finished `<div class="card">` — with two observables and the two
handlers that write them. The two EVENT closures per card are the same two every participant here
allocates; the five reactive closures beside them are this row's own price for the right to
recompute, and the sections above say what they are and what they buy.

THE ATTRIBUTE ORDER IS THE REFERENCE'S: `class` first, then `data-i` on the card and `aria-expanded`
on the toggle button. Sinuous's `property()` turns `class` into `el.className = …` and anything
starting with `data-` or `aria-` into `setAttribute`, in the order the props object is iterated
(`for (name in value)`), which is the order they are written in the app. A function prop is
subscribed on the spot, so `aria-expanded` is written during the same pass — after `class`, before
any child exists.

THIS CARD'S FOUR TAG POSITIONS are allocated ONCE. `map()` reconciles by ITEM IDENTITY, so the array
it is handed has to be a prefix of the same four objects every time — building four fresh ones per
notification would hand the reconciler rows it has never seen and rebuild a list whose contents did
not change. `tagsOfCard(i)[j].user` is `(i + j) % 5`, so the four positions belong to four DIFFERENT
users and this card is a reader of four of the five cells.

THE TWO EVENT CLOSURES ARE NAMED RATHER THAN INLINE, so the SAME pair reaches the two `onclick`
props AND `card-driver.ts` — the door `app-update` drives this row through with no synthetic event.
The count of closures this card allocates is unchanged; only their spelling moved, and `property()`
receives the same objects it did before.

`null` is passed where the reference has no props: `h`'s second argument is the props object and
Sinuous ignores a nullish one (`h.js`: `if (arg == null);`).

THE HEADLINE. A function child is a subscription (`insert` → `subscribe` → `computed`), so this one
closure IS the derivation: it re-runs when `open` moves and writes the new string straight into the
Text node it created — `insert`'s string branch takes
`(endMark.previousSibling || el.lastChild).data = value` once a string is already there.

THE CARD'S USER NAME — a plain STRING child and not a function, because nothing can move it. `h`
subscribes a function child and adds a string one; this is the second kind, so it costs one Text
node and no computation at all. It is the exact counterpart of `data-i` one element over: a constant
text beside a constant attribute.

THE DISCLOSURE ATTRIBUTE, the same mechanism one element over: a function PROP is subscribed by
`property()` and re-runs `setAttribute` when `open` moves. This is the ATTRIBUTE write to the
headline's TEXT write, and in Sinuous the two are the same kind of object — a computation over one
observable — reaching different ends of `h.js`.

THE CONDITIONAL, Sinuous-style. A function child is a subscription; when it returns a new node
`insert()` removes the old subtree and adds the new one, and when it returns `null` it removes and
adds nothing. NOTHING IS KEPT across the hidden state: the block is built fresh on every show,
exactly as Solid's `<Show>`, React's conditional, Lit's `nothing` and the schema core's zero-or-one
list all rebuild theirs.

THE TAG LIST, derived from the one piece of state rather than mirrored into a second observable:
`map`'s own signature is `((...args) => T[]) | Observable<T[]>`, and the function form is read
inside `map`'s `subscribe`, so `count` is tracked exactly as an observable of the array would have
been. The `slice` is allocated per notification, which is what every other participant allocates
too. A TAG'S TEXT IS A FUNCTION CHILD — one computation per mounted tag, reading THAT TAG'S user's
setting. It is the same mechanism as the headline one element up, pointed at a cell this card does
not own and seventy-nine other cards also read. `map` creates each item inside its own `root`, so
the subscription lives and dies with the position.

THE COUNT LABEL, A SIBLING OF `.tags` AND NOT A CHILD OF IT. A third function child, and the one
value in this card that follows `count` rather than `open`.

## One deck

The third level, built the same way and out of the same parts: `h` eagerly, one observable for the
one thing a click changes, and a FUNCTION IN EVERY POSITION THAT MOVES. See THE THIRD LEVEL above
for the count and for why nothing derived is shared between the levels.

NO ELEMENT HERE CARRIES A REACTIVE ATTRIBUTE. The deck's four values are three texts and one
handler, so unlike the card — whose `aria-expanded` is a function prop — this level asks nothing new
of `property()`, and its `class`es are the only attributes in it.

IT TAKES `chars` AND PASSES IT DOWN UNCHANGED, one array by reference through both levels, which is
what a card was already given before the decks existed. The deck reads one cell of it and its cards
read four each; the array itself is the app's and neither level owns it.

THE DECK'S CONSTANT HALF is resolved once and captured by the closures: a `Date` that never moves,
and an author whose NAME never moves. `dateTextOf` reads two things and only the other one — the
setting — can change, which is the same shape `headlineOf(title, open())` has one level down with
the title captured.

THE DECK'S OWN STATE: one observable holding an index into `DECK_TITLES`.

THE RENAME CLOSURE IS NAMED for the reason the card's two are: the SAME object reaches the `onclick`
prop and `card-driver.ts`, so the called round and the clicked round rename through one program.
Declared before the cards are built, so ten renames arrive in document order.

THE DECK'S NAME. One function child, hence one computation over one observable, writing one Text
node's `data` when a `.ren` click moves it — and touching nothing else in the deck, which is why a
rename here costs nothing at all at the `<time>` beside it.

THE AUTHOR'S NAME — a plain STRING child, the deck-level twin of a card's `.user`: a shared read
that cannot move, so it costs one Text node and no computation.

THE COARSE FAN-OUT, and the same mechanism a tag's text uses two levels down: a function child
reading a cell this deck does not own. `chars[author]` is read by forty of that user's tags as a
character count and by this position as a precision, and the link exists in both places for the same
reason — the value was read while the computation ran.

THE MIDDLE LIST, and the one place this app builds rows that are themselves parents. It is a plain
array of eagerly built subtrees and not a `map()`, because a deck's eight cards never change — see
THE THIRD LEVEL. The indices are GLOBAL (`8d … 8d+7`), so every per-card formula reads exactly what
it read before the decks existed.

## The mount

The whole app is inside ONE root, so `teardown` ends every subscription the 10 decks and the 80
cards created (five per card for the derived values — three function children, one function prop and
one `map()` computation — plus ONE PER MOUNTED TAG for the clipped text and TWO PER DECK for the
name and the date, so 400 + 200 + 20 of them). Without it they would only die when the observables
did — which is fine for a benchmark that drops everything, and wrong for a participant whose
retained heap is measured beside everyone else's.

The root's parameter is named for what it is rather than kept as `d`, because `d` is a DECK INDEX
everywhere else in the app now and a disposer wearing that name inside the loop that builds the
decks is one letter away from a bug nothing would catch.

THE ROUND'S ONE APP-LEVEL OPERATION is built inside the root beside the cells it writes and taken
out through a `let`, because `flip` and `card-driver.ts` must be handed THE SAME closure. THE APP'S
ROUND COUNTER is one integer, and `roundUserOf` turns it into a user, so every user moves and no
setting is a constant a participant could exploit. ONE WRITE, AND ITS OBSERVERS SIT AT TWO DEPTHS:
`observable.js` runs them inside the call, so the forty tag computations AND the two date
computations subscribed to this cell have written their Text nodes before it returns.

`flip` is the same update round every framework runs, in the order `AppHandle.flip` fixes: rename
every deck, toggle every details block, advance every tag list, then advance one user's setting. All
four have committed by the time the last call returns.

`teardown` disposes subscriptions only — the nodes die with the container the caller removes, and a
listener is owned by its node.

## Verification (`participants/sinuous/app.tsx`)

A timing comparison against markup that does not match is worthless, so this is the gate: mount the
reference app and this one side by side and diff the HTML, then run one update round and diff again,
then a SECOND update round and diff a third time (the update is what would expose a different
conditional strategy or a tag list that grew at the wrong end). Comments are stripped from both
sides by `markupOf` and Sinuous emits none — its markers are empty text nodes, which serialise to
nothing — so this participant is expected to produce the reference's bytes exactly. The element
count is printed beside every result because that is what a strip cannot excuse.

### The third stage

A SECOND update round, for the reason `apps/exodra/exodra.md` argues at length and
`svelte-marko-gate.ts` repeats: one round moves every card in ONE direction only, while a second
round puts a GROW straight after a SHRINK on the same tag list — the cards that started at 4 wrapped
to 1 on the first click and go 1 → 2 on the second — and a SHRINK straight after a GROW. Here that
is aimed at the two places Sinuous marks a position with an EMPTY TEXT NODE and nothing else:
`map`'s per-item bookkeeping, which has to put a returning tag back between the right two neighbours
after the list was cut to one, and the function child that shows the details block, whose marker has
to still bound the same region after the block has been removed and rebuilt. An empty text node
serialises to nothing, so a marker in the wrong place is invisible in the bytes until something
lands beside it — which is exactly what a grow after a shrink does. It costs one extra flip in a
gate nothing times.

IT IS ALSO THE FIRST STAGE AT WHICH A DECK'S DATE HAS TO STAND STILL. Round 0 moves user 0, who
authored deck 0, so the first round moves that date and proves nothing about selectivity; round 1
moves user 1, so the second round must move the dates of decks 1 and 6 and leave the other eight
byte-identical. That is the deck-level twin of card 0's first tag still reading `inte` after the
same round — the same selectivity asked two levels apart in one diff. What no stage can see is
whether a participant RECOMPUTED the eight dates that did not move: re-formatting a date at an
unchanged setting produces the same bytes, so that difference belongs to the clock.
