# EXODRA'S TODO APP — THE 10-deck / 80-card reference implementation

The 10-deck / 80-card todo app, Exodra's own implementation — built against the schema core in
`@exodra/core` + `@exodra/dom`. Same data as every third-party participant in `todo-app.tsx`
(imported from `apps/scene/spec.ts`, never re-declared), same decks, same cards, same details toggle,
same dynamic tag list, same handlers, plus one shared value per user setting (`createExoBenchSource`
from `shared/` — a getValue/setValue/onChange object written in this package, not an Exodra one).

The app is in `apps/exodra/exodra.tsx` (the backend instance, `CARD`, `DECK`, `exodraAppOf`, `APP`
and the advance slot) and `apps/exodra/exodra-shared.tsx` (`TAG`, `DETAILS`, `TCardTag`,
`TCardProps`, `TDeckProps` — what the four other Exodra rows import). The suite's adapter,
`mountExodraApp`, and the profiling loop are in `participants/exodra/app.tsx`.

## THE THIRD LEVEL: WHAT IT IS FOR, WHAT IT COSTS, AND WHAT IT STILL CANNOT SAY

This app was TWO deep for its whole life — cards on the screen, tags inside a card — and a
benchmark that cannot say what it measures is decoration, so here is what the third level was
added to ask and what it costs to ask it. The scene's numbers are in `apps/scene/spec.md` (THE DECKS);
this block is about the measurement.

### ONE: A CHILD THAT IS ITSELF A PARENT

At two levels the item of a list was never the owner of a list of items that were owners in turn.
The shell held the cards and a card held its tags, so a card was the only thing that was ever both
— and the list it owned was a LEAF list, rows of one element with one text in them. A DECK is a
row of the shell's list that has its own scalar ports, its own state, its own handler AND eight
card rows under it, each of which owns a reconciling tag list. That is the shape a real screen
presents constantly and the shape no number in this suite was ever taken over.

WHAT IT DOES NOT MEASURE, and this is the honest half: a deck's card list is FIXED (`c.list`, ten
decks of eight, decided at the mount), exactly as the shell's card list already was. So the axis
measures a list BUILD inside a list build with a reconciling list at the bottom, and it does NOT
measure a list DIFF running inside a list DIFF. No round in this scene moves a card between decks
or reorders one. Nothing measured here may be quoted about that case — it needs its own axis with
its own floor, because a round that reordered eighty card subtrees would be a second measurement
with its own cost living inside this one.

### TWO: ONE WRITE THAT MOVES TWO DEPTHS

The five user settings were already shared observables that move forty tags at once. A DECK'S
AUTHOR IS ONE OF THE SAME FIVE USERS, and the deck renders its creation date THROUGH THAT USER'S
SETTING — so advancing one setting now moves 40 tag texts at depth three and 2 deck dates at depth
one, through one `setValue`. The two readers of that cell agree on nothing but its identity: a tag
reads the number as "how many characters of my label", a deck's date reads it as "how many fields
of me". A coarser fan-out over the same source, which is what makes it a second question and not a
second copy of the first.

### THREE: THE FIRST VALUE WITH REAL FORMATTING COST

Every value this app has rendered was a `slice`, a concat or a table lookup, so no participant was
ever asked what it costs to recompute something with work in it. `dateTextOf` reads six fields off
a `Date`, indexes two name tables and zero-pads two or three numbers — which is what separates a
participant that recomputes a value when ITS source moves from one that recomputes everything a
subtree renders whenever that subtree renders.

### THE SCALE ARITHMETIC, AND WHAT THE OLD RECORDINGS CAN STILL BE COMPARED AGAINST

DECKS × CARDS_PER_DECK = 10 × 8 = 80 = CARDS, unchanged, and card `i` keeps the index it had, so
every per-card formula in the spec is untouched and the tag population is still 200 with exactly
40 per user. The tree grew by the deck chrome and by nothing else:

    before   1 app + 80 × (7 fixed + 0.5 details + 2.5 tags)                   =  801 elements
    after    the same 800, plus 10 decks × 6 (deck, h2, author, time, ren, cards) =  861   (+7.5%)

WHAT THAT MEANS FOR `measurements/*.json` AND `.gate/*.json` TAKEN BEFORE THIS CHANGE, stated so
that nobody quotes across the line by accident:

-   NOT COMPARABLE AS ABSOLUTE TIMES on any axis that mounts or updates this app — `initial-render`,
    `app-update`, `exodra-app-update`, `component-split`, `mount-phases`, `teardown-*`. The mount
    does 7.5% more elements and the round does 12 more writes (10 renames + 2 deck dates); a row
    that moved by less than that against its old self has not been shown to have moved at all.
-   STILL COMPARABLE AS A RANKING AND AS RATIOS BETWEEN ROWS WITHIN ONE RECORDING, because every
    participant got the same deepening in the same round — which is the property the rest of this
    participant exists to keep true.
-   UNAFFECTED ENTIRELY: every axis that does not mount this app — `list-reconcile`, `toggle`,
    `attr-floor`, `write-ladder`, `schema-build`, the SSR suite.

THIS FILE IS ALSO THE MARKUP REFERENCE. Every other participant's tree is diffed against the
one this mounts (see `markup-gate.ts`, and the gates in lit-app / mikado-app /
mikado-reactive-app / angular-app / stage0-app / uhtml-app / sinuous-app), because a timing
comparison against markup that does not match is worthless.

IT IS NOT A BENCHMARK PARTICIPANT ON ANY APP AXIS ANY MORE. The bindable row was taken off
`initial-render`, `exodra-initial-render` and `exodra-app-update`, and then off `app-update` with
its null twin, when the Exodra field on those axes was cut to the WIRE row and the MACHINE row.
What still mounts it is the byte gates above and the floor/phase diagnostics that take this wire as
their measurement subject — `mount-floor`, `mount-phases`, `teardown-floor`, `child-mark`,
`hydrate-floor`, `component-split`.

## THE MARKUP CONTRACT — WHAT EVERY PARTICIPANT ON THESE AXES MUST PRODUCE, BYTE FOR BYTE

Written out here rather than left to be read off the schema, because ten other files are
gated against it and an ambiguity in this block becomes ten different guesses. The formulae are
in `apps/scene/spec.ts` and are IMPORTED by every participant — nobody re-spells "clip at fourteen and
append an ellipsis".

PER-CARD STATE: `open` starts at `startsOpen(i)` (`i % 2 === 0`) and flips on every `.tog` click;
`count` starts at `startCount(i)` (`(i % 4) + 1`) and advances through `nextCount` (1→2→3→4→1) on
every `.addtag` click. `i` never moves.

PER-DECK STATE, and it is the newest: ONE INTEGER, the index into `DECK_TITLES` this deck's name
currently shows. It starts at `startDeckName(d)` (`d % 4`) and advances through `nextDeckName`
(0→1→2→3→0) on every `.ren` click. `d` never moves, its author never moves, its date never moves.

PER-APP STATE: FIVE USERS, created once per mounted app and never at module scope
(`apps/scene/spec.md`, THE USERS, says why sharing them between two mounts passes every gate and runs
the scene at double speed). User `u`'s setting starts at `startChars(u)` — 3, 4, 5, 6, 3 — and one
of them advances through `nextChars` (3→4→5→6→3) ONCE PER ROUND. Plus one integer: the app's own
round counter, starting at 0, which decides WHICH user through `roundUserOf(round)`. NOTHING ELSE
IS STATE.

THE TREE, with no whitespace anywhere between elements:

    <div class="app">                       … 10 decks …            </div>
    <div class="deck">
        <h2>{deckNameOf(d, name)}</h2>
        <span class="author">{userNameOf(deckUserOf(d))}</span>
        <time class="date">{dateTextOf(deckDateOf(d), users[deckUserOf(d)].chars)}</time>
        <button class="ren">rename</button>
        <div class="cards">          … cardsOfDeck(d), i.e. 8 cards …            </div>
    </div>
    <div class="card" data-i="{i}">
        <h3>{headlineOf(titleOf(i), open)}</h3>
        <span class="user">{userNameOf(cardUserOf(i))}</span>
        <button class="tog" aria-expanded="{expandedOf(open)}">details</button>
        {open ? '<div class="details">details…</div>' : ''}
        <div class="tags">{ tagsOfCard(i).slice(0, count).map(t =>
               `<span class="tag">${tagTextOf(t.label, users[t.user].chars)}</span>`) }</div>
        <span class="count">{tagsLabel(count)}</span>
        <button class="addtag">+</button>
    </div>

THE CARD DID NOT CHANGE BY ONE BYTE. Every element, every attribute, every text position and
every formula in it is what it was; what changed is that eight of them now stand inside a
`<div class="cards">` instead of eighty standing inside `<div class="app">`.

THE FIVE NEW THINGS, all of them at the deck level:

-   `<h2>` — THE DECK'S NAME — the only DERIVED value at this level, and the only state:
    `deckNameOf(d, name)`, rewritten by every `.ren` click. Ten of them move per round, against a
    hundred and sixty card writes.
-   `<span class="author">` — THE AUTHOR'S NAME — a CONSTANT, and the deck-level twin of
    `<span class="user">` one level down: five names over ten decks, two decks each, nothing ever
    rewrites it.
-   `<time class="date">` — THE COARSE FAN-OUT. `dateTextOf(deckDateOf(d), chars[deckUserOf(d)])` —
    the deck's own constant date, rendered at the precision its AUTHOR asked for. It is the second
    reader of the same five cells the tags read, one and two levels above them, and it reads the
    number as a precision where a tag reads it as a character count.
-   `<button class="ren">` — THE DECK'S OWN HANDLER. A deck's name is the deck's state, so what
    changes it belongs to the deck — the same argument that put `.tog` and `.addtag` inside the card
    rather than in the shell.
-   `<div class="cards">` — THE MIDDLE LIST. Its children port is bounded by its own element, exactly
    as `.tags` is, so nothing about how a region is bounded is new at this level.

ATTRIBUTE ORDER IS PART OF THE CONTRACT because `markupOf` diffs `innerHTML`. On the card,
`class` then `data-i`; on the toggle button, `class` then `aria-expanded`. NO ELEMENT OF THE DECK
CARRIES A DYNAMIC ATTRIBUTE AT ALL — the deck's four scalar values are three texts and one
handler — so the deck level adds no ordering question. Both card orders are the order a
template-compiling framework produces without being asked — the static attribute is in the
prepared markup and the dynamic one is written afterwards — so a participant that emits its
static `class` first gets this for free. React and any other participant that builds its
attributes from an object literal must list them in that order.

THE EIGHT VALUES THAT ARE FUNCTIONS OF STATE OR OF A SHARED CELL, AND WHAT EACH DEPENDS ON:

    the <h3> text          headlineOf(title, open)          open moves it       TEXT write
    .tog @aria-expanded    expandedOf(open)                 open moves it       ATTRIBUTE write
    .count text            tagsLabel(count)                 count moves it      TEXT write
    a .tag's text          tagTextOf(label, user.chars)     A SHARED SETTING moves it — 40 of
                                                            them at once, in 40 different cards
    the .user text         userNameOf(cardUserOf(i))        NOTHING moves it — a SHARED READ that
                                                            is a constant, read by 16 cards
    the <h2> text          deckNameOf(d, name)              the DECK's own state moves it, once
                                                            per round per deck   TEXT write
    .date text             dateTextOf(deckDateOf(d),        THE SAME SHARED SETTING the tags read,
                               chars[deckUserOf(d)])        two levels up — 2 of them at once
    the .author text       userNameOf(deckUserOf(d))        NOTHING moves it — the deck-level twin
                                                            of `.user`, read by 2 decks

and `data-i` remains what it always was, a constant ATTRIBUTE, which is exactly why it is kept: a
table where every value moves would say nothing about the cost of a value that does not. `.user`
and `.author` are its counterparts as constant TEXTS, at two different depths.

WHAT THE UPDATE ROUND DOES, in the order `AppHandle.flip` fixes: every deck's `.ren`, then every
card's `.tog`, then every card's `.addtag`, then ONE `setValue` on ONE user's setting — 10 writes
that each move one deck, 160 that each move one card, and one write that has to move forty tags in
forty cards AND two dates in two decks. The last step has NO BUTTON: a setting is not clicked from
inside a card. Every participant calls its own advance closure at the end of its `flip` and
declares THAT SAME CLOSURE to `noteRoundOp` in `card-driver.ts`, and declares its ten renames to
`noteDeckOps`, so the called path and the clicked path are one program.

### THE THREE GATED STAGES, SPELLED OUT FOR DECK 0 AND CARD 0

so that a participant author can check one of each by eye before running anything. Card 0: `open`
true, `count` 1, user 0 (`Ada`) — whose setting starts at 3 and is the one the FIRST round moves.
Its tag positions belong to users 0, 1, 2, 3 (`tagUserOf(0, j) = j`), whose settings start at
3, 4, 5, 6. Deck 0 holds cards 0…7, its name starts at `DECK_TITLES[0]`, and its author is user 0 —
the same `Ada` card 0 has, and the same user round 0 moves, so ONE round moves deck 0's date and
card 0's first tag together.

MOUNT

    <div class="deck"><h2>Backlog 0</h2>
    <span class="author">Ada</span>
    <time class="date">2 Jan 2024</time>
    <button class="ren">rename</button>
    <div class="cards">
    <div class="card" data-i="0"><h3>Task 0: Refactor the parser</h3>
    <span class="user">Ada</span>
    <button class="tog" aria-expanded="true">details</button>
    <div class="details">details…</div>
    <div class="tags"><span class="tag">int</span></div>
    <span class="count">1 tag</span><button class="addtag">+</button></div>
    … cards 1…7 …</div></div>

AFTER ONE UPDATE ROUND (deck 0 renamed 0 → 1; open false, count 2; round 0 moved user 0: 3 → 4,
which is deck 0's author, so its date gains a weekday at the same time card 0's first tag grows)

    <div class="deck"><h2>In review 0</h2>
    <span class="author">Ada</span>
    <time class="date">Tue 2 Jan 2024</time>
    <button class="ren">rename</button>
    <div class="cards">
    <div class="card" data-i="0"><h3>Task 0: Refact…</h3>
    <span class="user">Ada</span>
    <button class="tog" aria-expanded="false">details</button>
    <div class="tags"><span class="tag">inte</span><span class="tag">endp</span></div>
    <span class="count">2 tags</span><button class="addtag">+</button></div>
    … cards 1…7 …</div></div>

AFTER A SECOND ROUND (deck 0 renamed 1 → 2; open true, count 3; round 1 moved user 1: 4 → 5) —
the stage `exodra-direct-app`, `exodra-app` and any participant with a third diff are
also held to

    <div class="deck"><h2>Shipped 0</h2>
    <span class="author">Ada</span>
    <time class="date">Tue 2 Jan 2024</time>
    <button class="ren">rename</button>
    <div class="cards">
    <div class="card" data-i="0"><h3>Task 0: Refactor the parser</h3>
    <span class="user">Ada</span>
    <button class="tog" aria-expanded="true">details</button>
    <div class="details">details…</div>
    <div class="tags"><span class="tag">inte</span><span class="tag">endpo</span>
    <span class="tag">regre</span></div>
    <span class="count">3 tags</span><button class="addtag">+</button></div>
    … cards 1…7 …</div></div>

(the line breaks above are this document's, not the markup's — the real tree has none)

READ THE SECOND ROUND CAREFULLY, AT BOTH LEVELS, because they say the same thing twice. Card 0's
FIRST tag is still `inte` and not `int`, and deck 0's date is still `Tue 2 Jan 2024` and not
`Tue 2 Jan 2024 08:00`. Round 1 moved user 1, not user 0, so neither reader of user 0's setting
moves. A participant that re-clipped every tag or re-formatted every date on every round produces
the same bytes here and a different amount of work, which is the one difference a byte gate
cannot see and the axis can — and the deck-level version of it is the more expensive mistake,
because `dateTextOf` is the one value in this app with real formatting cost.

AND DECK 1 IS THE COUNTEREXAMPLE THAT PROVES THE FAN-OUT IS SELECTIVE: it is authored by user 1,
so round 1 moves ITS date (`Sat 3 Feb 2024` → `Sat 3 Feb 2024 09:05`) while deck 0's stands.

## WHAT EACH VALUE COSTS TO EXPRESS, so a later reader can tell an idiom from a bent one

A DERIVED VALUE IS NOT FREE TO DECLARE, and the participants split into two kinds over it. Some
allocate machinery for the RIGHT to recompute — a cell and a subscription, a memo, a reactive
statement — and pay that at the mount. Others recompute by hand where the state changes and
allocate nothing, paying instead on every update whether the value moved or not. NEITHER IS THE
BENT ONE. A participant is being bent when it is made to do the OTHER kind's work: giving a
hand-written ceiling a reactive layer it does not have, or making a framework recompute in a
place its own idiom would not have to. What each row buys with its setup cost is stated beside
its number, because a row that allocates a cell per derived value buys something real with it —
the value follows the state without anybody remembering to recompute it.

THE THREE ROWS IN THIS REPOSITORY EXPRESS THEM THREE DIFFERENT WAYS, ON PURPOSE:

-   `exodra` — a MACHINE: the card's state is one kept object, and the transition that changes
    it writes the three dependent values itself. No cell, no subscription, no derivation. (this
    participant)
-   `exodraDirect` — COMPUTES them in the handler and writes through `c.fillDoors()`. No cell, no
    subscription, no derivation: the handler that changed the state writes the
    three values itself. (`apps/exodra/exodra.tsx`)
-   `exodraMachine` — DECLARES them as DERIVATIONS over named state fields, compiled once per
    component and shared by all 80 cards. Until this contract existed its
    derivations were constants that ran at the mount and never again, so it had
    nothing to win on any axis. Its two CHILDREN ports are declared the same way,
    as `m.fill` slots woken by the same masks — so that row is the whole card as
    one program, with no wire, no props and no instance index in it.
    (`apps/exodra/exodra.tsx`)

WHAT THE SCHEMA CORE DOES DIFFERENTLY, and it is the whole reason this shape exists: a
component here is ONE value carrying two halves, a SCHEMA built once at module load and a
WIRING FUNCTION run once per instance. The schema is not a string to be parsed and not a tree
to be walked at render time — every port in it is numbered when the module loads, and a
render fills port `P.title` by name, through a table, with no walking, searching or counting
left in it. So there is no cursor in this app: `c.set(P.title, …)` may be called before or
after `c.set(P.i, …)` and the result is the same, which is the property the whole design is
for.

THE CARD'S CONDITIONAL DETAILS BLOCK — the one thing to keep in mind when reading the
numbers. This app declares `childrenPort()` between the two `el()` calls around it and emits
NOTHING there: a children port IS a child, so it stands where it was declared, and its region
is bounded by the static sibling after it — which always exists, so there is nothing to mark.
Third-party renderers express the same conditional with a marker comment of their own, which
is why the gates strip comments from both sides before diffing.

The imports are PACKAGE SPECIFIERS, not paths into a prototype's source: `exoComponent` and
the shared half are `@exodra/core`, `ExoDomBackend` is `@exodra/dom`. So this participant is
measured out of a package's `dist`, unminified tsup ESM — the rule the suite already states
everywhere else. The price: `npm run build` at the repo root has to have run, or it is
measured against a stale build. `ssr/apps/exodra/*` resolves it the same way.

THE WIRES ARE TYPED `TExoMachineInitialState<TExoChildrenWiring, …>` AND NOT `TExoDomWire<…>`, and
that is a change with NO RUNTIME PART AT ALL — `TExoWiring`/`TExoChildrenWiring` are
declarations that emit no JavaScript, so every participant here receives exactly the connector
object it received before and `c.set(P.x, v)` is the same two array loads and one indirect call
it was. What it changes is which BACKENDS the compiler will let these four components be handed
to, and that is the point: `TExoDomWire<X>` is `TExoMachineInitialState<TExoDomNode & TExoBindingApi, X>` — a TYPE (a
connector is data whose prototype is the composed DOM backend; it stopped being a class) whose
surface carries `nodes: Node[]` and four `Int32Array`s — and a wire's connector parameter
is CONTRAVARIANT, so a component typed that way is a browser-only component whatever the design
promised. `@exodra/core`'s own `TExoWiring` header predicts exactly this failure for "every
published example".

IT IS ALSO WHAT LETS THESE FOUR VALUES BE HANDED TO A SECOND BACKEND UNCHANGED, in the same
process and the same run, with no cast between them — and a cast is the thing that would make
any such comparison worthless.

## THE COMPONENTS

Module scope, and `exoComponent` is called exactly five times for the life
of the process: it builds the shape, numbers the ports, and hands them to the factory that
returns the wiring — so each backend compiles its own plan against those numbers on first
render and never again. Calling one per card would re-build, re-number and re-plan a shape
that has not changed — the mistake the split into "constant half / wiring half" exists to
make impossible.

A COMPONENT IS ONE VALUE: the schema and its wiring cannot be handed to a render
separately, so `c.list(port, CARD, props)` cannot be given the tag list's wiring by mistake.
The ports arrive as the factory's argument (`P`), captured once at module load, which
is one property load per fill rather than two.

WHERE THE CUTS ARE, and why they are not anywhere else. A schema is ONE CONTIGUOUS STATIC
REGION, so it is cut only where the markup genuinely stops being fixed:

-   `APP` — the shell, whose only child position is variable-length (the decks).
-   `DECK` — all five of the deck's elements in ONE schema — the heading, the author, the date,
    the rename button and the `.cards` div that holds the middle list. It is cut from
    the shell for the same reason `CARD` is cut from the deck: a deck appears a
    variable number of times in a region, which is what a component is.
-   `CARD` — all six of the card's elements in ONE schema — a clone and an insert for the
    whole card, not six of each. Measured once, historically, on the prototype that
    preceded this core: assembling a card out of little per-element templates cost
    23.7% of mount.
-   `DETAILS` / `TAG` — what goes INTO a region. These are separate schemas not because the card
    was split, but because a region's contents are a different shape from the card —
    zero-or-one details blocks, one-to-four tags — appearing a variable number of
    times.

THE CUT BETWEEN `DECK` AND `CARD` IS THE THIRD LEVEL, AND IT COSTS WHAT A CUT COSTS: ten more
component boundaries, each with its own clone, its own plan lookup and its own wire call, plus
ten more regions for the engine to own. WHAT A BOUNDARY IS WORTH ON THIS APP IS
`component-split`'s QUESTION and not this participant's — that axis renders these same cards out
of one whole-app schema against one schema per card, and it now carries the deck level for the
same reason. No figure is quoted here, because the only ones on record were taken on the
two-level app.

The two CHILDREN ports inside CARD are the only two places a card is not one piece, and the ONE
inside DECK is the only place a deck is not — and each is exactly where that level's STRUCTURE
varies. Everything else that varies — `data-i`, the headline, `aria-expanded`, the tag count, the
deck's name, the deck's date — is a value in a fixed element, which is what a scalar port is for
and why none of them cuts the schema.

## `CARD` — ONE CARD, whole — shape and wiring in one value

`details` is the case this core was extended for: a children port standing BETWEEN the
toggle button and the tag list, declared as an ordinary call in the middle of the body,
exactly where its markup goes. It emits nothing — when the block is off, the button and the
`.tags` div are simply adjacent, which is what the reference renders too.

The wiring fills by port IDENTITY, in whatever order reads best. A conditional IS a list of
zero or one once a children port owns a region, so `open` is a source of `[0]` or `[]` and
the details block needs no conditional of its own.

WHAT THIS CARD ALLOCATES PER INSTANCE: one state object holding its two regions and the four
values a later transition reads, its tag pool, and one teardown effect. No cell, no derivation and
no subscription: the transitions `toggleOpen` and `advanceTags` write the state AND the ports that
depend on it, so the right to recompute is paid on each update rather than at the mount.

EXPORTED, like `TAG` and `DETAILS` and `APP`, and for one more reason besides
`component-split`: `mount-phases.ts` splits this app's mount into clone / walk / insert /
wire, and every one of those stages has to run against the SAME compiled plan the axis
measures. A re-declared copy of this shape would compile a second plan and the diagnostic
would be attributing a different program.

### The schema, element by element

`class` is static and folded into the prepared markup; `data-i` is the one thing
about a CARD ELEMENT that varies, so it is a port and nothing else about the element
is. It is also the one value in this whole app that is still a CONSTANT, and that is
why it was kept when the derived values arrived: a table in which every value moves
says nothing about the cost of a value that does not.

THE HEADLINE, and no longer `Task ${i}`. Its value is `headlineOf(title, open)`
— the whole title while the card is open, clipped with an ellipsis while it is
collapsed — so this text port is written again on every `.tog` click.

THE CARD'S USER NAME — the shared read that never moves, and the app's only value
that is read from an entity OUTSIDE the card. Sixteen cards render the same string.
It is a TEXT port and a CONSTANT, which makes it the exact counterpart of `data-i`
one element over: a table with a constant attribute and a constant text in it can say
what an attribute write and a text write each cost when nothing is moving.

THE DISCLOSURE ATTRIBUTE. Declared AFTER the static `class` reaches the prepared
markup and written with `setAttribute` at the fill, so the serialisation is
`class` then `aria-expanded` — the order every template-compiling participant
produces without being asked, and therefore the order the contract states.

THE COUNT, A SIBLING OF `.tags` AND NOT A CHILD OF IT, deliberately: putting it
inside would place a static element after the tag list's children port and change
what bounds that region, which is a different measurement wearing this one's name.
Outside, both children ports are bounded exactly as they were before it existed.

### THE IDIOMATIC WIRING, AND WHAT THE DERIVED VALUES CHANGED IN IT

WHAT THE STATE IS NOW. One kept object per card: `open`, `count`, `title`, the tag `pool`, and
the two regions (`details`, `tags`) opened in `createInitialState` while the instance is armed.

THE DEPENDENT VALUES ARE WRITTEN BY THE TRANSITION THAT CHANGED THE STATE. `toggleOpen` flips
`open` and writes the headline, the disclosure attribute and the details block; `advanceTags`
moves `count` and writes the count text and the tag list. That is one place per change, and no
subscription is paid at the mount for the right to recompute.

THE STRUCTURE is written straight into the two regions: the details block is zero or one row,
grown or shrunk at the tail; the tag list is the prefix of the pool `count` names, grown and
shrunk at the tail, so the kept rows are untouched.

THE USER NAME IS WRITTEN ONCE AND NEVER AGAIN — a name does not move.

THIS CARD'S FOUR TAG ROWS ARE RESOLVED ONCE, in `seedCard`. `tagsOfCard(i)` says which user each
position belongs to; the seed turns each of those numbers into the shared source itself, so a tag
holds its source directly and never indexes a table at fill time. A tag does not subscribe to it:
when the app changes a setting, `advance` walks the decks and `reclipTags` re-writes exactly the
tags whose source is the one that moved.

THE FIVE USER SETTINGS ARE NOT THE CARD'S STATE: they are the app's, shared with seventy-nine
other cards, and this card only reads them.

THEY ARE NAMED RATHER THAN INLINE so that the SAME two closures can be handed to the
event ports AND declared to `card-driver.ts`, which is how `app-update` runs
this app's update round without a synthetic event. Nothing about this card changed:
the same one closure per handler is allocated in the same place and the same object
reaches `c.set`. `noteCardOps` is one global load and one comparison per card on
every other axis, and a push on that one.

## `DECK` — the third level, and the first row in this app that is itself a parent

### WHAT IT HAS THAT A CARD DOES NOT, AND WHAT IT DELIBERATELY DOES NOT HAVE

ITS CHILDREN ARE COMPONENTS, not one-element rows. `c.list(P.cards, CARD, …)` puts a whole
component with its own ports, its own state, its own two handlers and its own two children ports
into a region — where the tag list one level down puts a `<span>` with one text in it. This is the
only place in the app where a list's rows are parents, and it is the whole reason the third level
exists.

ITS CARD LIST IS FIXED: eight cards built into the region at the seed and never
changed, exactly as the shell's card list already was. A deck that could gain or lose a card would
be measuring a nested list DIFF, and the header says in as many words that this scene does not
measure one — see THE THIRD LEVEL at the top of this document.

### ITS FOUR VALUES, ONE OF EACH KIND THE APP HAS

    `.author`   a CONSTANT read from a shared entity      `c.text`       — nothing can move it
    `.date`     a DERIVED value over a SHARED source      `setDeckDetail` on `onChange` — the coarse fan-out
    `<h2>`      a DERIVED value over its OWN state        `renameDeck`   — the rename
    `.ren`      an event port                             `c.on`

WHAT IT ALLOCATES PER INSTANCE: one state object, one subscription on the shared source its date
reads, its disposer and one handler. Ten of these, and no subscription at all in the eighty cards.

### WHY THE DATE'S SOURCE IS ONE CELL AND NOT TWO

`dateTextOf(deckDateOf(d), chars)` reads two things, and only one of them can move: the DATE is a
constant of the deck and the SETTING is the shared cell. So the derivation is over one source and
the constant is captured — which is the same shape `headlineOf(title, open)` already has one level
down, where the title is the captured constant. Nothing in this app derives over two moving
sources, and `apps/scene/spec.md` says why that omission is deliberate rather than an oversight.

### The schema and the wiring

`<time>` and not another `<span>`: a benchmark whose every element is a `div` or a
`span` is one that has never asked what a less common tag costs to prepare, and a date
is the one value in this app with an element that means something.

THE MIDDLE LIST'S REGION is bounded by its own element exactly as `.tags` is — so
nothing about how a region is bounded is new at this level, and a deck's cards cannot
run into the deck's own chrome.

THE AUTHOR'S NAME — written once, for the same reason the card's `.user` is:
a name cannot move, and paying a subscription for it would buy the right to recompute
a constant. It is the deck-level control the moving date is read against.

THE COARSE FAN-OUT, and the whole of what makes the users a TWO-DEPTH write: this deck
subscribes to the SAME source forty tags in forty cards read, from two
levels above them, and reads the number as a precision rather than a length. The date
itself is captured — it is a constant of the deck, like a card's title.

THE DECK'S OWN STATE — one kept object; its `name` is an index into `DECK_TITLES`. The
`renameDeck` transition moves it and writes the `<h2>`.

The rename closure is DECLARED TO `card-driver.ts` — the SAME closure the button carries, so the
called round and the clicked round rename the same deck through the same code.

THE EIGHT CARDS, WHOLE COMPONENTS IN A FIXED REGION. One props object per card,
holding the global index and THE SAME users array this deck was handed.

## `exodraAppOf` and `APP` — the shell

The shell: `<div class="app">` and the 10 decks inside it.

The decks are a FIXED list — `DECK_IDX` is a constant and the shell never re-renders — so each deck
is built and inserted into the region once, with no reconciler: a list whose contents cannot change
should not pay for a diff, a row record or an item index it will never use.
The reference does the same thing (`static.children`), so the two are still the same app.

THE SHELL OVER WHICHEVER DECKS IT IS GIVEN — a factory so that an axis sweeping SIZE has one
declaration of this app and not two.

`hydrate-floor` asks the same question at 80 cards and at 640, and its own rule is that the
components are IMPORTED, NEVER RE-DECLARED — a second copy of these four lines inside a
benchmark file is a second app that only looks like this one. So the item array is the
parameter, which is the only thing that differs between those two runs anyway.

ITS PARAMETER IS DECK INDICES AND NOT CARD INDICES, since the decks arrived. A deck decides its
own eight cards through `cardsOfDeck(d)`, which is `8d … 8d+7` for ANY `d` — so an axis that wants
eight times the app asks for eighty decks, and every card in it is still a card of this scene with
a global index of its own.

EACH CALL IS A SEPARATE COMPONENT, hence a separate schema and a separate compiled plan. Call it
at module load and never inside a timed region.

THE APP'S FIVE USERS ARE CREATED IN THE SHELL'S WIRE — once per RENDER, which is once per mounted
app. Not at module scope: two apps standing side by side (every gate in the suite
mounts a reference beside a subject) would share five module-level cells and each
round would advance a setting twice, in both trees, agreeing all the way. Every
byte diff would pass and the scene would be running at double speed.

AND THE ROUND'S ONE APP-LEVEL OPERATION. `round` is this app's own count of
rounds, `roundUserOf` turns it into a user, and the write is one `setValue` on
one source — which the ten deck dates subscribe to and the two hundred tags read,
five of: forty tags and two dates on this one, at two different depths. The dates follow
through their subscription; the forty tags move because `advance` walks down to them.

ONE PROPS OBJECT PER DECK, holding the index and THE SAME users array. Ten small
objects per mount here and eighty more inside the decks: that is what it costs this
row to give every level a handle on per-app state, and all of it is inside the
region `initial-render` times.

## `PENDING_ADVANCE` — THE ONE VALUE THAT HAS TO TRAVEL FROM A RENDER BACK OUT TO THE MOUNT

`backend.render(component, parent)` takes no props and returns a disposer, so a wire's product is
nodes and subscriptions and nothing else. The app's advance closure is created INSIDE the shell's
wire, because that is where the five cells and the round counter are created — and
`mountExodraApp` needs the very same closure, both to put it in `flip` and to declare it to
`card-driver.ts`. Rebuilding a second closure outside would mean two round counters over one app.

SO THE WIRE LEAVES IT HERE AND THE MOUNT TAKES IT, one statement later. `render` is synchronous
and single-threaded, so the value read after it returns is the one the render just wrote; the
mount clears the slot so a later reader cannot pick up a stale closure and drive a dead app.

IT IS NOT STATE THE APP SHARES. Two apps mounted in a row each write and each take their own —
which is exactly the property five module-level user cells would NOT have had, and the reason the
cells are inside the wire rather than up here beside this.

### `takeExodraPendingAdvance`

TAKE THE CLOSURE THE RENDER THAT JUST RETURNED LEFT BEHIND — for `mountExodraApp`, which is its one
caller. Nothing else takes this closure today.

A row that rendered this shell and did not take its advance
closure would run a PARTIAL ROUND — every deck's rename and every card's two clicks, and no user
setting at all, so forty tags and two dates would stand still — which is a
different program from the one it is compared against, and a byte gate says so at the first diff
after a flip. `who` names the caller in the throw, because the failure is otherwise a null nobody
can place.

`render` is synchronous and single-threaded, so the value read after it returns is the one that
render wrote; taking it clears the slot, so a later reader cannot pick up a stale closure and
drive a dead app.

## `mountExodraApp` (the machinery, in `participants/exodra/app.tsx`)

ONE instance of APP — which is all `render` does; it takes no count, and the rows this app
shows are LISTS below this root. It returns the DISPOSER for everything the wiring
subscribed to — there is no handle object, because a render's product is nodes and the
only thing left over is a set of subscriptions somebody has to be able to end.

THE APP'S ADVANCE CLOSURE, taken out of the slot the shell's wire just left it in — see
`PENDING_ADVANCE`. The throw inside `takeExodraPendingAdvance` is not defensive noise: if
`render` ever stopped running the shell's wire synchronously, `flip` would silently become a
two-thirds round and every axis that mounts this app would keep printing numbers.

DECLARED TO `card-driver.ts` as the round's one app-level operation, and it is THE SAME
closure `flip` calls — never a second spelling of it. That identity is what makes the
called round and the clicked round the same program.

`flip` runs the same update round every framework runs: rename every deck, toggle every details
block, advance every tag list, and advance one user's setting — see `AppHandle.flip` for
the order and why it is part of the contract.

`teardown` is subscriptions only — the nodes die with the container the caller removes, and a
listener is owned by its node.

`profileMountExodra` mounts + disposes the app N times, nothing else — the region a CPU profile is
taken over, so this core's mount path can be attributed the same way each third-party
participant's is.
