# The Marko 6 participant — the prose

Everything below was written as comments inside
`src/benchmarks/marko/CardsDyn.marko`, `src/benchmarks/marko/tags/DeckDyn.marko` and
`src/benchmarks/marko/tags/CardDyn.marko`, and is moved here word for word. A handful of
one- and two-line comments stayed in those files; their text is repeated here in place, so
this document is complete on its own.

---

## `CardsDyn.marko` — the shell

### What this file is

The 10-deck / 80-card app — the same one every other framework mounts in this axis.

### The five user settings arrive as input

IT TAKES THE APP'S FIVE USER SETTINGS AS INPUT and passes them straight down, which is the one
thing about this participant that differs from the rest of the field. A tag's text is its label
clipped to its own user's setting, a deck's date is rendered at its author's setting, and the
round's fourth step advances one of them — but that step is not a click and has no button, and a
mounted Marko template exposes only `{ value, update(input), destroy() }` (`marko/dist/dom.mjs`),
so there is no `<let>` in here an outsider could write. `todo-app.tsx` therefore holds the five
settings in the mount closure, one array per mounted app, and pushes a new one in with
`update({ cards, chars })` — Marko's controlled-state idiom, the same door `MkToggle.marko` is
advanced through. See THE MARKO PROBLEM in `todo-app.tsx` for what that costs and what it does not
change.

### The third level changes neither half of that

THE THIRD LEVEL CHANGES NEITHER HALF OF THAT. A deck's NAME is ordinary internal state — a `<let>`
in `DeckDyn.marko`, moved by its own `.ren` click, exactly as a card's `<let/open>` is — because a
rename IS a click and needs no outside reach. A deck's DATE reads the settings that arrive as
input, so it is propagated the same way a tag's clip is, with the same consequence: the array
changes identity on every advance, so all ten dates recompute where a per-index or per-author
mechanism would recompute two. Stated in `DeckDyn.marko`, read off the control flow, NOT MEASURED.

### `input.cards` does not move, and the deck count is derived from it

`input.cards` DOES NOT MOVE, so `decks` is computed once and the `<for>` never re-runs its loop on
an advance; what the update propagates is the `chars` reference, into each deck and each card that
reads it. THE DECK COUNT IS DERIVED FROM THE CARD COUNT rather than taken as a second input, so
this template cannot be asked for a number of decks that disagrees with its number of cards.

---

## `tags/DeckDyn.marko` — one deck

### What this file is

ONE DECK, MARKO 6 — the third level of the app, held to the markup contract written out at the
top of `apps/exodra/exodra.md`: a heading over the deck's own state, an author name that never moves, a
creation date rendered through that author's shared setting, a rename button, and the eight cards
of `cardsOfDeck(d)` in a `.cards` div.

### ═══ WHAT A DECK CAN HOLD THAT THE APP CANNOT ═══

THE DECK'S NAME IS A `<let>`, and that is not the compromise the settings are. `todo-app.tsx`'s
THE MARKO PROBLEM is about state an OUTSIDER has to write: the round's user advance is not a click
and has no button, and a mounted template's whole surface is `{ value, update(input), destroy() }`
— so the five settings cannot live in a `<let>` and arrive as input instead. A RENAME IS A CLICK.
It is reached through the `.ren` button like every other card-level operation in this app, so the
deck's one integer of state is ordinary internal state, exactly as a card's `<let/open>` is, and
nothing about this level widens or narrows what this participant can be advanced with.

SO THIS ROW STILL REGISTERS NOTHING WITH `card-driver.ts` and is still not a participant on
`app-update`. The deck level does not change that in either direction: `update(input)` still
reaches only the APP's state, and a `<let>` in here is still unreachable from outside.

### ═══ THE DECK'S TWO DERIVED VALUES, IN MARKO'S OWN FORM ═══

      heading   deckNameOf(input.d, name)              the deck's OWN state moves it — a TEXT write
      date      dateTextOf(when, chars[author])         a SHARED SETTING moves it — a TEXT write

`author`, `authorName`, `when` and `own` ARE ALSO `<const>`s and none of them is a derived value:
a Marko template has no module scope, so `<const>` is the only way to name a value here at all,
and all four depend on `input.d`, which never moves. That is the same argument `CardDyn.marko`
makes about `title`, `userName` and `pool`.

`when` BEING A `<const>` IS WHAT KEEPS THE DATE'S EXPRESSION READING ONE MOVING THING. The deck's
creation date is a constant; only the author's setting can move, so `date` recomputes exactly when
that setting does — which matters more here than anywhere else in the app, because `dateTextOf` is
the first value in the scene with real formatting cost rather than a slice or a concat.

WHAT IT ACTUALLY COSTS THIS ROW, and it is the same fact `CardDyn.marko` records about the tag
clip: the settings array CHANGES IDENTITY on every advance, because the only way in is
`update({ cards, chars })`. So all ten decks re-run `dateTextOf` on every round, where Svelte's
per-index proxy and Solid's per-author derivation re-run two. Read off this file's control flow
and Marko's input propagation, NOT MEASURED — and it is the reason this row's number at the deck
level should not be pasted beside Svelte's.

### ═══ THE CARD LIST ═══

`<for by=(i => i)>` over the GLOBAL indices `8d … 8d+7`. It is keyed by the index every other
participant reconciles this list by, and the list is fixed — `own` depends on `input.d` alone, so
the loop runs once per deck and never again. No card is renumbered by the deck it lands in, which
is what keeps `startsOpen`, `startCount` and every other per-card formula reading what they read
before the decks existed.

### ═══ WHITESPACE AND ATTRIBUTE ORDER ═══

Both as `CardDyn.marko` argues them, unchanged: Marko's parser DROPS a whitespace-only run that is
a newline plus indentation, so this file may stay indented and still emit no text node between two
tags — but never a bare space between tags. NO ELEMENT OF A DECK CARRIES A DYNAMIC ATTRIBUTE at
all, so the attribute-order question the card's `aria-expanded` raises does not arise one level up.

---

## `tags/CardDyn.marko` — one card

### What this file is

ONE CARD, MARKO 6 — the participant `todo-app.tsx` mounts through `CardsDyn.marko`, held to the
markup contract written out at the top of `apps/exodra/exodra.md`: a details toggle (conditional
mount/unmount), a keyed tag list whose length cycles 1→2→3→4→1, the three DERIVED values, the
card's user NAME and a tag text clipped to the tag's OWN user's setting.
`open`/`count` seed from input and then live as local state, because the card mutates them
itself on click.

### ═══ THE THREE DERIVED VALUES, IN MARKO'S OWN FORM ═══

`<const>` IS Marko's derived value — the tag whose whole job is "name an expression over state
and recompute it when that state moves" (marko/tags/const.d.marko: `return=input.value`). This
file already had one before the contract existed, `<const/tags = POOL.slice(0, count) />`, and
the three new values are written on exactly that line: one `<const>` each, referenced by name in
the markup. Nothing recomputes them inside a click handler, nothing caches them by hand, and
nothing is lifted out of the template — Marko's compiler builds the signal graph and decides
what runs when a `<let>` is written. That is the half of Marko these axes never exercised while
every value this card rendered was a constant.

      headline   headlineOf(title, open)   `open` moves it — a TEXT write
      expanded   expandedOf(open)          `open` moves it — an ATTRIBUTE write
      label      tagsLabel(count)          `count` moves it — a TEXT write

`title`, `userName` and `pool` ARE ALSO `<const>`s, and that is not three more derived values
smuggled in: a Marko template has no module scope of its own, so `<const>` is the only way to name
a value here at all. All three depend on `input.i`, which never moves, so each expression runs once
per card and never again — which is exactly what `const title = titleOf(i)` does in the reference's
wiring. `pool` is `tagsOfCard(input.i)`, built once because `<for by>` matches the row it is given
and four fresh objects per click would be rows it has never seen.

### ═══ THE CARD'S USER, THE TAG'S USER, AND WHERE THE SETTING COMES FROM ═══

`todo-spec.ts` (THE USERS) attaches two things to the app's five users, in two different places.
THE CARD has a user and renders its NAME — a constant, so `userName` is a `<const>` over `input.i`
and nothing can ever recompute it. A TAG has its OWN user (`(i + j) % 5`, so a card's four
positions belong to four DIFFERENT users) and renders its label clipped to THAT user's setting.

THE SETTINGS ARRIVE AS INPUT AND ARE NOT MARKO'S TO HOLD, which is this participant's one real
difference from the rest of the field and is stated here rather than hidden: the round's third step
advances one user's setting, it is not a click and has no button, and a mounted Marko template's
entire outside surface is `{ value, update(input), destroy() }` (`marko/dist/dom.mjs`). There is no
`<let>` in here an outsider can write. So `todo-app.tsx` keeps the five settings in the mount
closure and pushes a NEW array in with `update` — Marko's controlled-state idiom, the same one
`MkToggle.marko` is advanced through. THE COST IS THAT THE ARRAY CHANGES IDENTITY: every mounted tag
of every card recomputes its clip on every advance, where Svelte's per-index proxy and Solid's
per-(user, label) memo wake only the forty that moved. Read off the control flow, NOT MEASURED.

### ═══ THE FORMULAE ARE IMPORTED, NEVER RESPELT ═══

A top-level `import` in a `.marko` file is Marko's own `<import>` core tag in its statement form
(marko/dist/translator `import_default`, `parseOptions: { statement: true }`), which parses to a
plain ES import declaration. `resolveTagImport` leaves any specifier that does not end in
`.marko` untouched, so this one reaches Vite exactly as written, and Vite's default
`resolve.extensions` (which `vite.config.ts` does not narrow — it overrides `conditions` only)
resolves the extensionless path to `src/benchmarks/shared/todo-spec.ts`. `todo-spec.ts` imports no
framework, which is the property that makes it importable from here at all. That now covers the
TAG POOL as well: the four labels are the spec's `POOL` reached through `tagsOfCard`, never a
second list typed out in here — a private spelling of the tag names is a byte gate failing over a
word, and this file had one until the users arrived.

### ═══ WHITESPACE ═══

Marko's parser DROPS a whitespace-only text run that is a newline plus indentation — up to two of
them — before it ever reaches the template (@marko/compiler parser `onText`: an early return on
`/^(?:[\n\r]\s*)?(?:[\n\r]\s*)?$/`). So this file may stay indented and still emit no text node
between two tags, and that is why it is indented while `CardDyn.svelte` is not: Svelte COLLAPSES
the same whitespace to a single space rather than dropping it. What Marko does NOT drop is a
space with no newline in it — `</h3> <button` would survive — so the rule here is "break lines,
never insert a bare space between tags".

### ═══ ATTRIBUTE ORDER ═══

`class` is static and goes into the compiled template markup; `data-i` and `aria-expanded` are
dynamic and are written afterwards. That is the order the contract states — `class` first on both
the card and the toggle button — and a template compiler produces it without being asked.
