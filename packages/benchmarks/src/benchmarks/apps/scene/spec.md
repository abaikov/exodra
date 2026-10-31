# THE APP SPECIFICATION

THE APP SPECIFICATION, and nothing else: the numbers that define the 10-deck / 80-card todo app,
the two DOM helpers every participant drives it with, and the handle they all return.

The scene lives in `apps/scene/spec.ts`; the two helpers and the handle live in `todo-spec.ts`, which
re-exports the whole scene so nothing that already imported a constant from it has to change.

## WHY THIS FILE EXISTS SEPARATELY FROM `todo-app.tsx`

That file is the reference implementation AND the loader for the whole field — it imports solid-js,
react, svelte and marko at module scope. Any participant that imports it therefore drags the entire
field into its module graph. That is harmless while one Vite config compiles every participant
together, and fatal the moment a participant is BUILT ON ITS OWN (see `bench/build/`): Angular's
bundle would contain React.

So the constants live here, framework-free, importable by a participant that is built in isolation.
`todo-app.tsx` re-exports every name below, so nothing that already said
`import { IDX } from './todo-app'` has to change.

## THE POPULATION

`CARDS` — how many cards the app has, ACROSS ALL DECKS. Eighty, and eighty before the decks existed
— the deepening kept the card population to the card (see THE DECKS below).

`IDX` — every card's GLOBAL index, `[0 … 79]`, in order. A deck holds a contiguous run of eight of
these (`cardsOfDeck`), and a card's every value is still a function of the index in here.

## THE FOUR TAG NAMES (`POOL`)

Every one of them is LONGER THAN EVERY USER SETTING (the shortest, `endpoint`, is 8 characters
against a maximum setting of 6), which is what makes the clip in `tagTextOf` a real clip on every
tag at every setting — see THE USERS below. Their first three characters are all different, so two
tags never render the same text however hard they are clipped, and a tag wired to the wrong user
fails a byte gate instead of hiding.

## THE CARD'S THREE DERIVED VALUES — the half of an application this app did not have

WHAT WAS WRONG WITH THE APP UNTIL THIS BLOCK EXISTED, said plainly because it invalidates every
number the app axes published about the field: every value a card rendered was a CONSTANT.
`data-i` was `String(i)`, the title was `Task ${i}`, a tag's text was the label straight off the
datum — computed once at the mount and never again. The only thing a click caused was children
reconciliation. So `initial-render`, `app-update` and `exodra-app-update` measured a mount and a
list reconcile while calling themselves a real app, and — this is the part that is not about us —
SOLID'S MEMOS, SVELTE'S RUNES, REACT'S RE-RENDER, LIT'S DIRTY CHECK AND EVERY OTHER
PARTICIPANT'S REACTIVE HALF WERE NEVER EXERCISED AT ALL. Seven participants sitting inside one
resolution floor is what that looks like from the outside.

THE THREE VALUES BELOW ARE FUNCTIONS OF STATE THAT MUST RUN AGAIN WHEN THE STATE MOVES. A value
that is merely re-read is not one of these, and none of them is here to be hard: each is
something a reader recognises from an application they have actually written.

-   `headlineOf` — A COLLAPSED CARD SHOWS A CLIPPED TITLE, AN OPEN ONE SHOWS THE WHOLE TITLE.
    Reads the card's title and `open`. Every `.tog` click changes it in every card, because every
    title this spec produces is longer than the clip.
-   `expandedOf` — THE DISCLOSURE ATTRIBUTE FOLLOWS THE DISCLOSURE STATE — `aria-expanded` on the
    `.tog` button. Reads `open`. This is the ATTRIBUTE write to `headlineOf`'s TEXT write, so a
    participant whose two write paths differ shows the difference.
-   `tagsLabel` — A COUNT RENDERED AS TEXT, WITH THE PLURAL AGREEING — the `.count` span beside the
    tag list. Reads `count`. Every `.addtag` click changes it.

SO ONE CLICK OF EACH KIND NOW FORCES RECOMPUTATION: `.tog` moves two of the three, `.addtag`
moves the third. Neither click is a pure structure change any more.

WHY THE FORMULAE LIVE HERE AND NOT IN EACH PARTICIPANT. For the same reason `nextCount` does:
every participant must produce the same bytes, and eleven private spellings of "clip at fourteen
and append an ellipsis" is eleven chances for a gate to fail over a character. These are PURE
FUNCTIONS OF STATE and nothing else — no framework, no cell, no memo, no scheduling. WHERE a
participant calls them, HOW OFTEN, and what it allocates for the right to call them again is
entirely its own idiom's business, and that is precisely what the axes now measure.

NO VALUE IN THIS BLOCK READS TWO MOVING FIELDS, and that was a deliberate omission rather than
an oversight. `open` and `count` are independent in this app, and a value invented to read both
would be a scene an author chose to write rather than work an application does. `headlineOf`
takes two arguments, but its title argument is constant for the life of a card.

EVERY VALUE IN THIS BLOCK ALSO BELONGS TO EXACTLY ONE CARD, and THAT omission is the one THE
USERS below exist to end — see the next block's header.

### The values, one by one

`TITLES` — the four headlines a card's title is built from. Four, like `POOL`, so `i % length`
cycles the same way `startCount` does and nothing about a card depends on two different periods.

`titleOf` — a card's full title — CONSTANT for the life of the card, and the input `headlineOf`
clips.

`TITLE_CLIP` — where a collapsed card's title is cut. EVERY title this spec produces is longer than
this — the shortest is `Task 0: Fix the flaky test` at 26 characters — so every card's headline
genuinely changes on every toggle and no card gets a free ride through the update round.

`headlineOf` — THE COLLAPSED-CARD HEADLINE. Open: the whole title. Collapsed: clipped, with an
ellipsis.

`tagsLabel` — THE TAG COUNT AS TEXT, with the plural agreeing — `1 tag`, `2 tags`, `3 tags`,
`4 tags`.

`expandedOf` — THE DISCLOSURE ATTRIBUTE'S VALUE. A string, because that is what an attribute holds,
and every participant writes the same two strings rather than each choosing how to stringify a
boolean.

THE RETURN TYPE IS THE TWO LITERALS AND NOT `string`, because React's and Solid's JSX both
declare `aria-expanded` as `Booleanish` (`boolean | 'true' | 'false'`). Typed as `string` this
forces every participant that writes it through JSX to carry an `as 'true' | 'false'` assertion,
and an assertion in a participant is a place where a wrong value would pass silently.

## THE USERS — ONE SMALL SHARED LIST, READ BY MANY ROWS, AND THE ONE WRITE THAT MOVES ALL OF THEM

WHAT WAS MISSING UNTIL THIS BLOCK EXISTED, and it is the most common shape a real application
has: THE APP WAS 80 INDEPENDENT CARDS AND NOT ONE VALUE WAS SHARED BETWEEN TWO OF THEM. Every
piece of state above belongs to exactly one card — its `open`, its `count`, its title — so every
write this suite has ever measured moved exactly one card, and no axis could say what a write
costs when a hundred rows are reading it. A todo app in which no two rows read the same thing is
not a scene an application ever presents.

SO THE APP NOW HAS FIVE USERS, and they are a POOL rather than a per-card field: five entities
against eighty cards and two hundred tags, which is what makes one user read by roughly a fifth
of everything on screen. A user has two things:

-   A NAME — rendered by every card that has that user — a shared read that NEVER MOVES. It is
    the control: sixteen cards render `Ada`, and a participant that allocated the right
    to recompute it bought nothing. `data-i` is the same argument one card wide.
-   A SETTING — `chars` — HOW MANY CHARACTERS OF A TAG'S NAME THAT USER WANTS TO SEE. It is a
    shared read that MOVES, and moving it is the point of the whole block.

AND THE TWO ARE ATTACHED TO DIFFERENT THINGS ON PURPOSE. A CARD has a user (`cardUserOf`) and
renders the NAME. A TAG has its OWN user (`tagUserOf`) and renders its label clipped to THAT
user's setting — so a tag's text is a function of TWO ENTITIES, the tag and a user that most of
the tags reading it belong to other cards entirely. Nothing above reads two entities; this is the
first value in the app that does.

### WHAT ONE WRITE NOW DOES, COUNTED

`tagUserOf(i, j) = (i + j) % 5`, so a card's four tag positions belong to four DIFFERENT users
and one user's tags are scattered across cards rather than gathered in them. Counting the tags
that are actually mounted (position `j` exists only while `j < count`), each user owns exactly
40 of the 200 tags at the mount, in 40 DIFFERENT CARDS. Advancing that user's setting is ONE
state write, and it has to end with 40 text nodes changed in 40 places.

### WHAT THIS MAKES MEASURABLE THAT NOTHING IN THE SUITE MEASURED BEFORE

1. A WRITE THAT FANS OUT. Every previous write in this app touched one card, so the cost of
   notification never separated from the cost of the DOM write — one subscriber, one write.
   Here one write reaches 40 subscribers in 40 subtrees, which is where a participant's
   notification machinery is either a list walk or a re-render of everything that might read it.
2. RECOMPUTE PER TAG AGAINST COMPUTE ONCE PER USER. `tagTextOf(label, chars)` is called with one
   of FOUR labels and one setting, so the 40 texts a write produces are at most FOUR DISTINCT
   STRINGS. A participant that recomputes at each tag does 40 slices; a participant whose idiom
   lets it derive per (user, label) does 4 and assigns 40 times. BOTH ARE LEGITIMATE and NEITHER
   IS CLAIMED HERE OF ANY PARTICIPANT — which of them a participant can express, and what the
   difference is worth, is exactly what the axis is for.
3. A SHARED READ THAT DOES NOT MOVE, beside one that does, in the same scene — the user's name
   against the user's setting. A participant that pays the same price for both is a participant
   whose price is not about movement.

### WHERE THE USERS LIVE, AND THE ONE WAY TO GET THIS WRONG

THE FIVE USERS BELONG TO A MOUNTED APP, NOT TO THE MODULE. Every gate in this suite mounts TWO
apps side by side — the reference and the subject, or the clicked one and the called one — and
drives them independently. Five module-level user records would be SHARED by both mounts, so each
round would advance the setting twice and both trees would still agree, which means every gate
would pass while the scene ran at double speed. A participant must create its five users inside
its mount and hold them there. HOW it holds them — five signals, five cells, a store, five plain
fields — is its own idiom's business, exactly as the derived values above are.

The functions in the spec are PURE FUNCTIONS OF AN INDEX, like `titleOf` and `startCount`: they say
what the values ARE. They hold no state and there is nothing to reset between mounts.

### The users, one by one

`USERS` — how many users the app has. Five against eighty cards and two hundred tags.

`USER_IDX` — `[0, 1, 2, 3, 4]` — for a participant that builds its five user records by mapping.

`USER_NAMES` — the five names, index = user id. Distinct lengths and distinct first letters, so a
card wired to the wrong user is a byte difference and not a coincidence. They are rendered WHOLE —
a user's setting clips TAG names, never the user's own name.

`userNameOf` — a user's name — CONSTANT for the life of the app. The shared read that never moves.

`CHARS_MIN` / `CHARS_SPAN` — the smallest setting, and how many settings the ring holds. FOUR
settings — 3, 4, 5, 6 — and four on purpose: `count` already cycles with period 4 and `open` with
period 2, so an app whose user settings also return every 4 advances has a whole period of
`USERS × 4 = 20` rounds. A region of 40 rounds (`app-update`'s batch) is still exactly two whole
cycles, ending where it began. A five-long ring would have made the app's period 100 and no timed
region would have measured the same mixture twice.

`startChars` — a user's setting AT THE MOUNT. 3, 4, 5, 6, 3 for users 0…4 — the ring is four long
and there are five users, so users 0 and 4 start on the same number. They are still different
entities and they separate on the first round that moves either of them.

`nextChars` — ADVANCING A SETTING: 3 → 4 → 5 → 6 → 3, the same shape `nextCount` has. Closed over
the ring for ANY input in it, so it does not matter which user a participant advances.

`cardUserOf` — WHICH USER A CARD HAS. Sixteen cards per user, exactly. The card renders this user's
NAME.

`tagUserOf` — WHICH USER A TAG HAS — card `i`'s tag at position `j`, `j ∈ [0, POOL.length)`.

IT IS NOT THE CARD'S USER, and that is the whole design: `(i + j) % USERS` gives a card's four
positions four different users, so one user's tags are spread across cards instead of piling up
inside them. Of the 200 tags mounted at the start, each user owns exactly 40, in 40 different
cards. A rule of `cardUserOf(i)` would have put a user's whole fan-out inside sixteen subtrees
and measured a subtree update wearing a shared write's name.

`roundUserOf` — WHICH USER THE ROUND MOVES — the rule, as a function, so no participant copies a
constant.

`round` is the app's own count of update rounds it has run, starting at 0, so the FIRST round
moves user 0 and the fifth moves user 0 again. EVERY USER MOVES, which is the reason this is a
rotation and not the constant it could have been: with one permanently hot user the other four
settings would be constants of the app, and a participant that noticed could hold their clipped
labels for the life of the process and win the axis by spotting that the scene was rigged.

THE COUNTER BELONGS TO THE MOUNTED APP, exactly as the five users do, and it is advanced by the
round and by nothing else. One integer per app; a participant that keeps it anywhere else has two
apps sharing a rotation.

`tagTextOf` — A TAG'S RENDERED TEXT — its label, cut to the number of characters its user asked for.

NO ELLIPSIS, and the difference from `headlineOf` is not an oversight: a clipped TITLE is a
sentence cut short and says so with a `…`, while the setting here IS "how many characters to
show" and the text is exactly that many. Every label in `POOL` is longer than every setting, so
this cuts every tag at every setting and no tag gets a free ride through a setting change.

`TTag` — ONE TAG'S DATA: which name it carries and which user decides how much of it is shown.

`tagsOfCard` — CARD `i`'s FOUR TAG POSITIONS, in order. The card's tag list is the first `count` of
these.

IT ALLOCATES FOUR OBJECTS PER CALL, so WHERE a participant calls it is a real choice and the
same one the derived values above already force: a participant whose list reconciles BY OBJECT
IDENTITY must call it ONCE PER CARD and slice the result, or every update would hand the
reconciler four objects it has never seen and rebuild a list that did not change. A participant
that re-renders a card from scratch (React) calls it in the render body, as it already calls
`POOL.slice`. Neither is bent; they are the two idioms.

## THE DECKS — THE THIRD LEVEL, AND WHAT ONLY THREE LEVELS CAN ASK

WHAT WAS MISSING UNTIL THIS BLOCK EXISTED. The app was TWO deep — cards on the screen, tags
inside a card — so every list in it was owned by something that was not itself a list item. The
shell held the cards and a card held its tags, and the card in the middle was the only thing that
was ever both, in one direction: it was an item, and it had ports, and it had state, but the list
it owned was a leaf list of one-element rows. A renderer's list machinery was therefore never
asked the one question a real screen asks it constantly — WHAT HAPPENS WHEN THE ROW OF A LIST IS
ITSELF A PARENT, with its own scalar values, its own state, its own handler and its own list of
rows that are parents in turn.

SO THE APP NOW HAS TEN DECKS, each holding EIGHT of the same eighty cards, each of which still
holds one to four of the same tags. Three levels, and the middle one is a child that is a parent.

### THE SCALE ARITHMETIC, AND WHY THE NUMBERS ARE THESE NUMBERS

A benchmark that got ten times bigger is a different benchmark and its recordings stop comparing,
so the deepening is CONSTRAINED TO KEEP THE CARD POPULATION EXACTLY AS IT WAS:

    DECKS × CARDS_PER_DECK = 10 × 8 = 80 = CARDS, unchanged, and card `i` keeps the index it had.

Deck `d` owns the eight consecutive global indices `8d … 8d+7`, so `startsOpen(i)`, `startCount(i)`,
`titleOf(i)`, `cardUserOf(i)` and `tagUserOf(i, j)` are UNTOUCHED and every count they produce is
the count they produced before: still 200 tags at the mount, still exactly 40 of them per user, in
40 different cards. The whole of the users block above is preserved to the tag.

WHAT THE MOUNTED TREE COSTS, counted rather than estimated:

    before   1 app + 80 × (7 fixed + 0.5 details + 2.5 tags) = 1 + 560 + 40 + 200 =  801 elements
    after    the same 800, plus 10 decks × 6 (deck, h2, author, time, button, cards) =  861

+7.5%, and no level of the tree changed its element kind — which is the number that decides
whether a recording taken before this deepening can still be read beside one taken after. See
WHAT THE OLD RECORDINGS CAN STILL BE COMPARED AGAINST in `apps/exodra/exodra.md`.

TEN AND NOT EIGHT because there are FIVE users: ten decks divide by five exactly, so every user
authors exactly two decks and no user is a special case. Eight decks of ten cards would have given
users 0, 1 and 2 two decks each and users 3 and 4 one, and a fan-out that is uneven by
construction cannot be read off a single number.

### WHAT A DECK CARRIES, AND WHY EACH OF THE THREE IS A DIFFERENT KIND OF VALUE

-   A NAME — the deck's OWN state, and the only state at this level. It is what the round's new
    `.ren` click changes — a rename — so the deck level is measured every round and not
    merely rendered once. It is the deck's counterpart to a card's `open`/`count`.
-   AN AUTHOR — ONE OF THE FIVE USERS (`deckUserOf`), whose NAME the deck renders — a shared read
    that never moves, the same control `<span class="user">` already is one level down.
-   A DATE — constant per deck, and rendered THROUGH THE AUTHOR'S SETTING. This is the second,
    COARSER fan-out over the same five settings: advancing user `u` now moves 40 tag
    texts at depth three AND the dates of the TWO decks `u` authors at depth one. One
    write, two depths, and the two consumers read the setting differently.

### WHY THE DATE IS NOT ANOTHER STRING CONCAT

Every value this app has ever rendered was a slice, a concat or a table lookup, so no participant
was ever asked what it costs to recompute something with real work in it. `dateTextOf` reads six
fields off a `Date`, indexes two name tables and zero-pads two or three numbers. It is the first
value in the scene whose recomputation is worth avoiding — which is exactly the question that
separates a participant that recomputes a value when its source moves from one that recomputes
everything a card renders whenever the card renders.

IT USES `getUTC*` AND NEVER `Intl`, and that is not a style preference: a byte gate diffs
`innerHTML`, and `Intl` output depends on the ICU data of whatever runtime the axis is run under.
The tables in the spec are the format, in full, with nothing left to a locale.

### WHAT THIS BLOCK STILL CANNOT SAY, said here rather than left to be discovered

A DECK'S CARD LIST IS FIXED. Ten decks of eight cards, decided at the mount and never changed by
any round — exactly what the shell's card list already was, one level up. So this scene measures a
list BUILD inside a list build inside a reconciling list, and it does NOT measure a list DIFF
running inside a list diff. Nothing in the round moves a card between decks or reorders one, and
no number produced here may be quoted about that case. It was left out deliberately: a round that
reordered eight card subtrees per deck would have been a second measurement with its own cost
living inside this one, and the honest place for it is its own axis with its own floor.

THE PERIOD IS UNCHANGED, which is what keeps `app-update`'s 40-round region meaning what it meant.
`open` has period 2, `count` 4, a deck's name 4 (DECK_TITLES is four long, like POOL) and the user
ring 4 over 5 users = 20. lcm = 20, exactly as before the decks existed, and 40 rounds is still
exactly two whole cycles that end where they began.

### The decks, one by one

`DECKS` — how many decks the app has. Ten, because five users divide it exactly — see the block
above.

`DECK_IDX` — `[0 … 9]` — for a participant that builds its decks by mapping.

`CARDS_PER_DECK` — eight. `DECKS × CARDS_PER_DECK === CARDS`, which is the whole of the scale
argument.

`cardsOfDeck` — WHICH CARDS A DECK HOLDS — the GLOBAL indices `8d … 8d+7`, in order.

THE INDEX IS GLOBAL AND THAT IS THE POINT: a card's title, its state, its user and its four tag
users are all functions of `i`, and `i` is what it was before the decks existed. A deck that
renumbered its cards 0…7 would have made every card in the app one of eight kinds and quietly
deleted three quarters of the scene's variety.

IT ALLOCATES, once per deck at the mount, exactly as `tagsOfCard` allocates once per card.

`deckOfCard` — WHICH DECK A CARD IS IN — the inverse of `cardsOfDeck`, for a participant that walks
cards.

`DECK_TITLES` — THE FOUR NAMES A DECK CYCLES THROUGH WHEN IT IS RENAMED. Four, like `POOL` and like
the setting ring, so nothing in the app depends on two different periods. Distinct first letters and
distinct lengths, so a deck showing the wrong one is a byte difference and not a coincidence.

`deckNameOf` — A DECK'S RENDERED NAME — the title it currently carries, and its own index after it.

THE INDEX IS IN THE TEXT so that ten decks never render the same string: two decks sharing a
title (there are ten decks and four titles) would otherwise be indistinguishable in the markup,
and a participant that rendered deck 4's name into deck 8 would pass the byte gate.

`startDeckName` — A DECK'S NAME AT THE MOUNT — an index into `DECK_TITLES`, spread over the four so
that a round moves ten decks through four different titles at once.

`nextDeckName` — RENAMING: 0 → 1 → 2 → 3 → 0, the same shape `nextCount` and `nextChars` have.

`deckUserOf` — WHO AUTHORED A DECK — one of the five users. Ten decks over five users, so EXACTLY
TWO decks per user and no user is a special case. The deck renders this user's NAME, whole, and its
date through this user's SETTING.

`DECK_DATES` — the twelve creation dates decks are dealt from — one per month of 2024, every field
distinct from every other date's, so no two decks can render the same text at any precision.

THEY ARE MODULE-LEVEL CONSTANTS AND THAT IS SAFE, unlike the five settings: nothing ever writes
to a `Date` here, so two apps standing side by side in a gate share ten frozen facts rather than
ten pieces of state. `TITLES` and `USER_NAMES` are shared for the same reason.

`deckDateOf` — A DECK'S CREATION DATE — constant for the life of the deck. `d % 12` so an axis that
renders more decks than the app has (`hydrate-floor` renders eighty) still gets a date for every
one.

`DAYS_SHORT` / `DAYS_LONG` / `MONTHS_SHORT` / `MONTHS_LONG` — weekday and month names, in both
lengths — the whole of the format, so nothing depends on a runtime's locale data. Index =
`getUTCDay()` / `getUTCMonth()`.

`dateTextOf` — A DECK'S RENDERED DATE — its creation date, at the precision its AUTHOR asked for.

`detail` IS THE SAME NUMBER A TAG READS AS A CHARACTER COUNT. One setting per user, two consumers
that read it differently: a tag takes it as "how many characters of my label to show", a deck's
date takes it as "how many fields of me to show". That is deliberate — a shared value whose two
readers agree on nothing but its identity is what makes the fan-out COARSER at the deck level and
not merely a second copy of the tag's.

THE FOUR PRECISIONS, one per setting in the ring 3…6, each strictly containing the one before:

    3   `2 Jan 2024`
    4   `Tue 2 Jan 2024`
    5   `Tue 2 Jan 2024 08:00`
    6   `Tuesday 2 January 2024 08:00:00`

SO EVERY STEP OF THE RING CHANGES THE TEXT, and no deck gets a free ride through a setting change
— the same property `POOL`'s labels have against the tag clip.

IT IS THE APP'S FIRST VALUE WITH REAL FORMATTING COST: six field reads off a `Date`, two table
lookups and two or three zero-pads, against the `slice` and the concat everything else in this
spec is made of.

## THE SUITE'S TWO HELPERS AND THE HANDLE (`todo-spec.ts`)

`el` — a fresh bench container, attached to the document (mounting into a detached node is
not the same work — layout-affecting insertions are what a real mount pays for).

`clickAll` — fire a real bubbling click at every matching element, the way a user's clicks arrive.
Every participant's `flip` is built out of this, so no framework is handed a cheaper
path into its own event system than another.

WHERE IT STILL RUNS INSIDE A CLOCK: `exodra-app-update`, and nowhere else among the app axes.
`app-update` stopped dispatching events — a profile put `MouseEvent` + `dispatchEvent` + this
function at ~61% of its round, identical work for every participant and therefore work that
could rank nobody — and now calls each card's own handlers through `card-driver.ts`. It still
uses this helper in its GATES, which is what proves the two paths produce the same bytes.

`AppHandle` — what every participant's mount returns. `flip` is ONE update round — rename every
deck, toggle every card's details, advance every card's tag list, and advance ONE USER'S SETTING —
and it must have COMMITTED to the DOM by the time it returns, which is why the batching frameworks
flush inside it.

### `AppHandle.flip` — ONE UPDATE ROUND, THROUGH DISPATCHED CLICKS, IN THIS ORDER

1. `clickAll(container, '.ren')` — every DECK's name, 0 → 1 → 2 → 3 → 0
2. `clickAll(container, '.tog')` — every card's disclosure
3. `clickAll(container, '.addtag')` — every card's tag count
4. the app's own ROUND OPERATION — `roundUserOf(round++)`'s setting advanced once

STEP 1 IS THE DECK LEVEL, and it is a click with a button behind it for the same reason the
other two card operations are: a deck's name is the deck's OWN state, so the thing that
changes it belongs in the deck. Ten clicks against a hundred and sixty, which is the ratio of
decks to cards — the third level is measured every round and it is not made to dominate.

STEP 4 IS NOT A CLICK AND HAS NO BUTTON. A user's setting is not changed from inside a card,
and giving it one would have put a control in the markup that says nothing about the shape
being measured. So a participant calls its own advance closure here, directly — and it must be
THE SAME CLOSURE it hands to `noteRoundOp` in `card-driver.ts`, or the called path and the
clicked path are two different programs and `app-update`'s first gate says so.

IT NOW MOVES THINGS AT TWO DEPTHS: the forty tags of `roundUserOf(round)` in forty different
cards, AND the dates of the TWO decks that user authored, which read the same setting as a
precision. One write, two levels, two readers that share nothing but the cell.

THE ORDER IS PART OF THE CONTRACT even though the end state does not depend on it: a tag added
by step 3 is rendered at the setting step 4 has not written yet, and then rewritten by step 4.
A participant that advanced the user first would produce the same bytes and a different amount
of work, which is the one difference a byte gate cannot see. Step 1 leads for the same kind of
reason — outermost level first, so a participant that renders a deck and its cards in one pass
cannot collapse the deck write into a card's.

### `AppHandle.commit`

HOW THIS PARTICIPANT COMMITS A BATCH OF WORK SYNCHRONOUSLY — declared only by the
participants that batch, and read only by `app-update`.

It is the wrapper that participant's own `flip` already puts around its two `clickAll`
calls: react's `flushSync(fn)`, svelte's `fn(); flushSync()`, voby's `fn(); tick()`, lit's
`fn(); flush()`. A participant that has committed by the time its handler returns — every Exodra
row, stage0, solid, mikado, uhtml, sinuous — declares none, and the driver calls its handlers
straight.

IT IS DECLARED BY THE PARTICIPANT AND NEVER INFERRED. An axis that decided for itself when
somebody else's renderer has committed is an axis that can stop a clock before the work is
done, which is the single easiest way to publish a fast row that did nothing.
