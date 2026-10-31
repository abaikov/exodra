# The voby participant

The scene this app implements — the 80 cards, the 10 decks, the 5 users, the fairness rules, the
three derived values, where each participant puts the clip, and the Marko problem — is written once
in **`apps/solid/solid.md`**, because it is one argument about all five third-party rows and splitting it
in three would lose it. voby's own rows inside those sections are there too; what follows is only
what is written in `apps/voby/voby.ts` and in voby's half of `loadMounts()`.

---

## Why this app is a factory rather than three module-level functions

voby is reached through a DYNAMIC import — `loadMounts()` imports the runtime at run time — so `$`,
`h` and `For` are values, not module bindings, and an app written over them has to be handed them.
`createVobyApp($, vh, vFor)` is called ONCE, where they are in scope, and returns the app builder.
The three function objects it allocates (`vobyCard`, `vobyDeck`, `vobyApp`) are allocated exactly as
often as they were when they stood inside that import block: once per `loadMounts()`, none per
mount, none per card.

Newcomers (fine-grained/no-vDOM peers) are authored via their hyperscript APIs so no per-framework
JSX transform is needed.

## One card

ONE CARD. voby has no components to declare — this is the same `h` call the card was always built
by, moved behind a name so the deck below can build eight of them without this body standing a level
deeper. It closes over nothing a mount owns — the five settings arrive as an argument, as they
already did one level up — so it is one function object per `loadMounts()` where the inline arrow
was one per `vobyApp(...)` call, and the row's per-card work is unchanged either way.

The title is constant for the life of the card, so it is read once and closed over.

The card's USER NAME — constant too, and passed as a plain STRING child rather than a thunk, because
a thunk is what buys a position the right to update and nothing can move this one.

THIS CARD'S FOUR TAG POSITIONS, allocated ONCE: `<For values>` reconciles by item identity, so the
array it is handed has to be a prefix of the same four objects every time. `tagsOfCard(i)[j].user`
is `(i + j) % 5`, so the four positions belong to four DIFFERENT users and this card reads four of
the five settings.

THE TWO EVENT CLOSURES, NAMED RATHER THAN INLINE, so the SAME pair reaches both `onClick` props AND
`card-driver.ts` — the door `app-update` drives this row through with no synthetic event. voby
allocates the same two closures either way.

THE THREE DERIVED VALUES, EACH A FUNCTION IN THE POSITION THE VALUE GOES. voby's readme, on
attributes and children: "the plain value itself, an observable to that value, or a function to that
value. If an observable or a function is provided then that attribute will update itself in a
fine-grained manner." So the thunk IS voby's derived value — the same shape this file already used
for the conditional child and for `<For values>` below, and the reason there is no `useMemo` here: a
memo would be a second cell in front of a computation voby already re-runs exactly when its source
moves.

`class` is listed before `aria-expanded` because voby's `setProps` walks the object in key order,
and the gate diffs `innerHTML`.

Keyed reconcile via voby's `<For>` (mirrors Solid's) so the kept tag node is REUSED on update, not
rebuilt — same fairness as everyone.

A TAG'S TEXT IS A THUNK IN THE CHILD POSITION — the fourth of this card's derived values and the
only one that reads a cell the card does not own. voby subscribes a function child, so a setting
write touches exactly the positions rendering that user's tags. The clip is recomputed per tag: see
THE FIVE USERS in `apps/solid/solid.md` for why a twenty-memo table is not available to this row where it
is to Solid's.

## One deck

ONE DECK — the third level, and the only thing it holds that a card does not already hold is its
NAME, which is ONE OBSERVABLE.

IT IS AN OBSERVABLE BECAUSE IT CANNOT BE ANYTHING ELSE. This function runs while `vobyApp` is being
built, which is BEFORE `render()` opens a root (see the app section below), so a deck that allocated
an owned node would hang it on `oby`'s `SUPER_OWNER` and outlive this row's `teardown` — the same
wall the twenty-memo table hit under THE FIVE USERS. An observable has no owner, so a deck may hold
one per mount and does.

ITS THREE TEXTS: the name is a thunk over the deck's own observable, the date a thunk over the
AUTHOR'S setting with the deck's constant date captured, and the author's name a plain string — a
thunk is what buys a position the right to update, and that one cannot move.

THE RENAME, NAMED SO THE `.ren` BUTTON AND `card-driver.ts` CARRY ONE CLOSURE over one deck's
observable — never two spellings of what a rename does.

THE COARSE FAN-OUT, one level below the shell: the date thunk subscribes to the same cell forty tags
two levels down are subscribed to, and reads the number as a PRECISION. Two of the ten decks re-run
per advance, because a function child subscribes to what it read and nothing else.

THE EIGHT CARDS BY GLOBAL INDEX — a FIXED list, so it is a plain array of built elements and not a
`<For>`: nothing in the round adds, removes or moves a card.

## The whole app

THE WHOLE APP, taking its five settings as an argument.

THEY ARE MADE IN THE MOUNT AND NOT IN HERE, unlike Solid's and React's, and the reason is this row's
structure rather than a preference: `createElement` builds its children eagerly at the call site, so
every line of the three functions here runs BEFORE `render()` opens a root. Observables do not care
— `oby` gives them no owner — and that is exactly why the settings can live out there, why a deck's
name may be one, and why a memo table could not be (see THE FIVE USERS in `apps/solid/solid.md`). One
array per mounted app either way.

## The voby adapter, in `todo-app.tsx`

voby batches DOM writes on its scheduler; `tick()` flushes them synchronously (the voby equivalent
of react's `flushSync` / svelte's flush) so an update commits INSIDE the measured region —
otherwise its numbers would be a lie.

THE APP'S FIVE USERS AND ITS ROUND COUNTER, per MOUNT — never at module scope, or the two apps a
gate stands side by side would share five cells and every round would advance one of them twice
while both trees still agreed.

ALL FOUR STEPS, THEN ONE `tick()` — the renames, the 160 card writes and the setting advance are
queued by voby's scheduler and drained together, so the round commits once inside the measured
region exactly as react's `flushSync` does.

`TVobyObservable<T>` is voby's observable: read with no argument, write with one. The module is
typed by hand at the import site (`voby as {…}`), so the per-cell shape is spelled out in
`apps/voby/voby.ts` rather than inferred.
