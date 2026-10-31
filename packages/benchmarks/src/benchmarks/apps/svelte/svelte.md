# The Svelte 5 participant — the prose

Everything below was written as comments inside
`src/benchmarks/svelte/CardsDyn.svelte`, `src/benchmarks/svelte/DeckDyn.svelte` and
`src/benchmarks/svelte/CardDyn.svelte`, and is moved here word for word. A handful of
one- and two-line comments stayed in those files; their text is repeated here in place, so
this document is complete on its own.

---

## `CardsDyn.svelte` — the shell

### What this file is

THE 10-DECK / 80-CARD APP, SVELTE 5 — and, since the scene gained USERS, the place this
participant keeps the one piece of state that is not a card's or a deck's.

### ═══ THE THIRD LEVEL ═══

The shell holds TEN DECKS, not eighty cards: `DeckDyn.svelte` owns its own name state, its own
`.ren` handler and the eight cards of `cardsOfDeck(d)`, and this component's only job at that
level is to hand each deck the SAME `chars` array it hands nothing else. The card population and
every card's global index are unchanged — `todo-spec.ts` (THE DECKS) has the arithmetic — so
everything the users block below argues is still argued about the same eighty cards.

WHAT CHANGED FOR THE SETTINGS, and it is the reason the deck level exists: `chars[u] = …` now
wakes template effects at TWO DEPTHS. Forty mounted tags of user `u` inside the cards, and the
`date` derived of the two decks `u` authored. Svelte's `$state` proxy is per INDEX, so both sets
are exact and nothing else in either level runs.

### ═══ THE FIVE USERS ═══

`todo-spec.ts` (THE USERS) gives each mounted app five users. A card renders its user's NAME (a
constant) and a TAG renders its label clipped to ITS OWN user's SETTING, which moves: the round's
third step advances one setting and forty tags in forty different cards have to end up with new
text. The settings therefore belong HERE — one `$state` array per mounted component, never a
module-level one, because every gate in this suite stands two apps side by side and drives them
independently, and one shared array would advance each round's setting twice while both trees
still agreed.

`$state` AND NOT `$state.raw`, and the difference is the whole fan-out: Svelte's `$state` proxies
an array PER INDEX, so `chars[u] = …` wakes only the template effects that read index `u` — the
forty mounted tags of that user — where a raw array replaced wholesale would wake every card that
reads any setting. `SvToggle.svelte` wants the opposite (`$state.raw`) for the opposite reason:
its harness replaces the whole array on every transition.

### ═══ WHY THE ROUND'S OPERATION IS AN INSTANCE EXPORT ═══

The round's third step is not a click and has no button (`AppHandle.flip`), so the mount in
`todo-app.tsx` has to call it directly. Svelte 5's `mount()` returns the component's exports —
the same door `SvToggle.svelte` hands `setRows` through — so `advanceUser` below IS the function
object that mount registers with `card-driver.ts` and calls from `flip`. Marko cannot do this,
which is why its settings live outside its template; see THE MARKO PROBLEM in `todo-app.tsx`.

### `round` is a plain `let`

`round` IS A PLAIN `let`, NOT `$state`: nothing renders it, and a rune here would buy a
subscription for a value no position reads.

### The `cards` prop and the derived deck count

`cards` STAYS THE PROP AND THE DECK COUNT IS DERIVED FROM IT, so the mount in `todo-app.tsx`
asks for this app the way it always has and the two numbers cannot disagree. A deck holds
`CARDS_PER_DECK` of them, so eighty cards are ten decks.

### The markup comment — indentation here versus in `CardDyn.svelte`

This one is a `<!-- … -->` node and STAYS IN THE FILE: a comment is a node, and deleting it merges
two whitespace runs into one. Its text:

THE INDENTATION HERE IS SAFE AND THE INDENTATION IN `CardDyn.svelte` IS NOT, and the
difference is worth stating because the two files look like they break the same rule.
`clean_nodes` REMOVES a fragment's leading and trailing whitespace-only text and only
COLLAPSES the whitespace BETWEEN two nodes. Every whitespace run below is leading or
trailing — of the `.app` div's fragment, or of the each-block's — because each fragment
holds exactly one node. A card's fragment holds seven, so six of its runs are between
nodes and survive as spaces; that is why that file writes its markup with none.

---

## `DeckDyn.svelte` — one deck

### What this file is

ONE DECK, SVELTE 5 (RUNES) — the third level of the app, held to the markup contract written
out at the top of `apps/exodra/exodra.md`.

### ═══ WHY THIS IS A COMPONENT AND NOT A BLOCK INSIDE `CardsDyn.svelte` ═══

A deck has STATE OF ITS OWN — the index into `DECK_TITLES` its name currently shows, moved by
its `.ren` click — and Svelte's unit for per-instance state is a component. Written as an
`{#each}` block in the shell it would have needed one array of ten names in the shell's `$state`
and an index into it per deck, which is the shape `todo-spec.ts` says the FIVE SETTINGS have
(shared, indexed, read from many places) and it is exactly not what a deck's name is: nothing
outside a deck ever reads or writes it.

### ═══ THE DECK'S TWO DERIVED VALUES, IN SVELTE'S OWN FORM ═══

      heading   deckNameOf(d, name)                    the deck's OWN state moves it — a TEXT write
      date      dateTextOf(when, chars[author])         a SHARED SETTING moves it — a TEXT write

`authorName` IS NOT ONE OF THEM and is a plain `const`, exactly as `title` and `userName` are in
`CardDyn.svelte`: `deckUserOf(d)` cannot move, so a `$derived` there would be a subscription
that can never fire.

`when` IS A PLAIN `const` FOR THE SAME REASON, and it is what makes the date's `$derived` read
ONE moving thing. `deckDateOf(d)` is a constant of the deck; only the author's setting moves, so
the derived's dependency set is the single array index `chars[author]`.

### ═══ WHAT ONE SETTING WRITE WAKES HERE, AND WHY IT IS EXACT ═══

`chars` is the shell's `$state` array, which Svelte proxies PER INDEX, so `chars[u] = …` wakes
only what read index `u`. That is the forty mounted tags of user `u` at depth three AND the
`date` derived of the TWO decks that user authored at depth one — and nothing else at either
level. No deck whose author did not move re-runs `dateTextOf` at all, which is the property
worth having now that the app has a value with real formatting cost in it.

A `$derived` TABLE OF TEN DATES WAS AVAILABLE AND IS WORSE, for the same reason `CardDyn.svelte`
refuses one for the tag clip: a `$derived` lives in a component and would have to be read out of
the ARRAY it lives in, so every deck would depend on all ten entries and an exact fan-out would
become a total one. It is also pointless here in a way it is not one level down — the forty tags
of one user collapse to four distinct strings, while ten decks hold ten DIFFERENT dates and
share nothing but the setting, so there is not one string to save.

### ═══ THE OTHER DOOR INTO THIS DECK ═══

The deck declares its rename to `card-driver.ts` from its own instance script, exactly as
`CardDyn.svelte` declares its pair: Svelte runs an instance script once per component in
document order, so ten renames arrive in deck order, and the closure registered is the very one
the `.ren` button carries.

### ═══ WHITESPACE ═══

Same rule as `CardDyn.svelte`, and for the same reason: Svelte COLLAPSES whitespace between two
elements to a single space rather than dropping it, so a newline in front of a `<` puts a text
node into all ten decks. Every line of the markup below therefore begins with `>`.

### The eight global card indices

THE EIGHT GLOBAL CARD INDICES, `8d … 8d+7`, resolved once. The list is fixed — a deck never
gains or loses a card — so this is a `const` and not a `$derived`, and the `{#each}` below keys
by the global index, which is the identity every other participant reconciles this list by.

---

## `CardDyn.svelte` — one card

### What this file is

ONE CARD, SVELTE 5 (RUNES) — the participant `todo-app.tsx` mounts through `CardsDyn.svelte`,
held to the markup contract written out at the top of `apps/exodra/exodra.md`.

### ═══ THE THREE DERIVED VALUES, IN SVELTE'S OWN FORM ═══

`$derived` is Svelte 5's answer to "a value that is a function of state", and this file
already had one before the contract existed — `tags`, on the line below. The three new values
are written on exactly that line and nowhere else: a `const` bound to `$derived(<expression
over state>)`, read in the markup by name. No handler recomputes any of them, nothing caches
them by hand, and none of them is hoisted out of the component: Svelte's compiler decides when
each one runs. That is the half of Svelte these axes never exercised while every value this
card rendered was a constant.

      headline   headlineOf(title, open)   `open` moves it — a TEXT write
      expanded   expandedOf(open)          `open` moves it — an ATTRIBUTE write
      label      tagsLabel(count)          `count` moves it — a TEXT write

`title` IS NOT ONE OF THEM and is deliberately a plain `const`, not a fourth `$derived`. The
contract states it is constant for the life of a card (`i` never moves), so a derived would be
a subscription that can never fire — machinery bought for a recomputation that does not exist.
The reference does the same thing (`const title = titleOf(i)` inside the card's wiring).

### ═══ THE FORMULAE ARE IMPORTED, NEVER RESPELT ═══

`../todo-spec` is `src/benchmarks/shared/todo-spec.ts` — a framework-free module, which is why it can
be imported from a `.svelte` file without dragging the field in. It arrives here through the
ordinary TypeScript pipeline: `svelte.config.js` runs `vitePreprocess()`, which hands this
`lang="ts"` block to esbuild for type-stripping, and the surviving `import` is then resolved by
Vite, whose default `resolve.extensions` contains `.ts` — so the extensionless specifier
resolves exactly as it does from every `.ts` file in this suite. Nothing in `vite.config.ts`
narrows `extensions` (it only overrides `conditions`), so there is no special case here.

### ═══ WHITESPACE — WHY THIS MARKUP LOOKS THE WAY IT DOES ═══

SVELTE DOES NOT DROP WHITESPACE BETWEEN ELEMENTS, IT COLLAPSES IT TO ONE SPACE. `clean_nodes`
(svelte/src/compiler/phases/3-transform/utils.js:219-244) removes a fragment's LEADING and
TRAILING whitespace-only text and replaces every whitespace-only text BETWEEN two nodes with a
single `' '`, keeping it — removal is reserved for a handful of parents (`select`, `tr`,
`table`, …) that a card contains none of.

So the indented version of this card that stood here until the contract arrived rendered FOUR
real space text nodes inside every `.card`, between `</h3>` and `<button>`, between `</button>`
and the `{#if}`, and so on — bytes no other participant emits. Nothing caught it, because the
axes this participant runs on checked element COUNTS and not `innerHTML`.

The fix is the only one that works in a template language that behaves this way: NO WHITESPACE
BETWEEN TAGS AT ALL. Line breaks are taken INSIDE an open or closing tag — where they separate
attributes rather than create a text node — which is why every line below begins with `>`.
Adding a newline in front of a `<` anywhere in the markup puts a space back into all 80 cards.

### ═══ THE OTHER DOOR INTO THIS CARD ═══

`app-update` drives its participants by CALLING each card's two handlers directly, not by
dispatching a `MouseEvent` at each button — the event is the browser's work, identical for
every participant, and it was 60% of that axis. So each card declares its own pair here, from
its instance script, which Svelte runs once per component instance in document order.

NOTHING ABOUT THIS COMPONENT CHANGED FOR IT. `cycle` was already a named handler passed to
`onclick`; `tog` is now written the same way, so the same two closures reach the same two
buttons AND the registry. `noteCardOps` is one global load and one comparison outside the one
axis that opens a collection.

`../card-driver` RESOLVES EXACTLY AS `../todo-spec` DOES — a framework-free `.ts` module,
reached through `vitePreprocess()` and Vite's default `resolve.extensions`; see the paragraph
on `../todo-spec` below.

### ═══ THE CARD'S USER, AND THE TAG'S — TWO DIFFERENT ENTITIES, ON PURPOSE ═══

`todo-spec.ts` (THE USERS) hangs two things off the app's five users, and they are attached to
different places. THE CARD has a user (`cardUserOf(i)`) and renders that user's NAME between the
`<h3>` and the `.tog` button — a shared read that NEVER MOVES, so it is a plain `const` and not a
fifth `$derived`, exactly as `title` is. A TAG has its OWN user (`tagUserOf(i, j)`, which is
`(i + j) % 5`) and renders its label clipped to THAT user's setting, which does move.

SO A TAG'S TEXT IS THE FIRST VALUE IN THIS CARD THAT READS TWO ENTITIES — the tag and a user most
of whose other tags belong to other cards — and it is written where it is rendered:
`{tagTextOf(t.label, chars[t.user])}` inside the `{#each}`. That interpolation is a template
effect, and `chars` is the parent's `$state` array, which Svelte proxies PER INDEX: one setting
write wakes exactly the mounted tags of that user, in this card and in thirty-nine others, and
wakes nothing else in any card. There is no card re-render and no list diff.

IT RECOMPUTES PER TAG, and the alternative was considered rather than missed. One advance
produces at most FOUR distinct strings for forty nodes, and Svelte could hold them in a
`$derived` table — but a `$derived` lives in a component and would have to be read out of the
ARRAY it lives in, which makes every card depend on all five settings and turns an exact fan-out
into a total one. The per-tag spelling is both the ordinary one and the fine-grained one here.

`pool` IS BUILT ONCE, and `tags` is a prefix of it: `{#each … (t.label)}` keys by the label, and
rebuilding four objects per click would hand the keyed block rows it has never seen.

### `open`/`count` seed from props, `chars` does not

`open`/`count` seed from props then live as local $state, because the card mutates them itself
on click — same behaviour as the Svelte 4 version, where `export let` doubled as writable
local state. `chars` is NOT seeded into local state: it is the app's, it moves without this
card, and reading the prop is what subscribes this card's tags to it.
