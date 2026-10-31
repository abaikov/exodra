# The React participant

The scene this app implements — the 80 cards, the 10 decks, the 5 users, the fairness rules, the
three derived values, where each participant puts the clip, and the Marko problem — is written once
in **`apps/solid/solid.md`**, because it is one argument about all five third-party rows and
splitting it in three would lose it. React's own rows inside those sections are there too; what
follows is only what is written in `apps/react/react.tsx`.

---

## `ReactCard`

THE CARD'S FOUR TAG POSITIONS, BUILT IN THE RENDER BODY. `todo-spec.ts` says this in as many words:
a participant that re-renders a card from scratch calls `tagsOfCard(i)` here, exactly as this line
already called `POOL.slice`, and one that reconciles by object identity must call it once at the
mount instead. React is the first kind — nothing here survives a render unless a hook was bought for
it — so the four objects are allocated per render and `key` carries the identity, which is what it
is for.

THE CARD'S USER NAME. A plain call, like everything else in this body: it cannot move, and React has
no way to hold a per-instance constant that is not a hook. It is the control the spec put beside the
setting — this row pays the same price for it as for a value that moves.

THE THREE DERIVED VALUES, COMPUTED IN THE BODY — plain `const`s beside the `tags` slice above,
because that is the whole of React's model: state moved, so this function runs again, so every value
that depends on the state is computed again. No `useMemo` anywhere: a hook per value per card would
buy a skipped `slice(0, 14)` for the price of a dependency array and a comparison, which is not what
a React author writes and would be this row being handed a fine-grained framework's shape.
`titleOf(i)` is recomputed here too, for the same reason — React does not hold a per-instance
constant without being asked to.

`expanded` is asserted to the two literals `@types/react` allows on `aria-expanded` (`Booleanish`),
which is exactly the pair `expandedOf` returns; the spec types it `string` because that is what an
attribute holds in every other participant.

THE TWO EVENT CLOSURES, NAMED RATHER THAN INLINE — the same pair React already allocated per render,
now also declared to `card-driver.ts`. `useState`'s setters are STABLE for the life of the
component, so the pair registered at the first render stays valid forever, and the registration
itself only happens at the first render: `noteCardOps` pushes while a collection is open, and
`app-update` opens one around the mount and closes it before it drives anything. Every later render
finds it closed and pushes nothing.

`ReactNode` and not `unknown`: every entry here IS one (`rc(...)` or `null`), and spreading
`unknown[]` into `createElement`'s children is what this axis used to do — which means the whole
child list went unchecked in the participant that decides React's number.

The props objects list `className` FIRST and the dynamic attribute second, because React writes them
in the order the object enumerates and `markupOf` diffs `innerHTML` — `class` then `data-i` on the
card, `class` then `aria-expanded` on the toggle.

A TAG'S TEXT IS CLIPPED WHERE IT IS RENDERED, from the settings array this card was handed as a
prop. There is no per-value granularity to have and none is faked: the card re-renders because the
app re-rendered, and every tag it shows is clipped again whether its user moved or not. The key is
the LABEL — the four labels of a card are distinct, and it is the same identity every other
participant reconciles this list by.

## `ReactDeck`

ONE DECK — a component with its own `useState`, which is the whole of what React gives a level of a
tree that has state: the deck's NAME is one integer of its own, and the settings array the app holds
passes THROUGH this component on its way to the cards.

WHAT A RENAME COSTS HERE, counted rather than implied: `setName` re-renders this deck and — since
nothing below is memoised — its eight cards, each recomputing its headline, its label, its four tag
texts and its `tagsOfCard` array. Ten renames therefore touch every card in the app, and inside
`flip`'s one `flushSync` they land in the SAME render pass as the 160 card writes and the setting
advance, so the round is one pass over the tree and not four.

NO `useMemo`, NO `React.memo`, NO CONTEXT AND NO STORE, for the reason the card gives above: a
per-deck memo would buy a skipped `dateTextOf` for the price of a dependency array, and a `memo`
boundary here would be this row being handed a fine-grained framework's shape.

THE DECK'S OWN STATE — an index into `DECK_TITLES`, the counterpart of a card's `open`.

THE RENAME, NAMED SO THE `.ren` BUTTON AND `card-driver.ts` CARRY ONE CLOSURE. `useState`'s setter is
stable for the life of the component, so the closure registered at the first render stays valid;
every later render finds the collection closed and pushes nothing.

NO ELEMENT OF THE DECK CARRIES A DYNAMIC ATTRIBUTE, so `className` is the only prop the markup order
can be argued about — it stays first here for the same reason it does on a card. The date is
reformatted on every render of this deck, whether its author's setting moved or not: that is the
same model the tags are clipped under one level down.

THE EIGHT CARDS BY GLOBAL INDEX, and `key` is that index — `cardsOfDeck(d)` is built in the render
body for the reason `tagsOfCard` is: React keeps nothing across a render that a hook was not bought
for, and the key carries the identity instead.

## `TCharsWriter` and `ReactApp`

WHAT REACT'S APP HANDS OUT — its settings SETTER, and not a finished advance closure.

THE DIFFERENCE IS NOT COSMETIC. A React component body runs again on every render, so a `round`
counter declared in there would be reset eighty times a round and every advance would move user 0.
The counter is ONE INTEGER PER MOUNTED APP (`todo-spec.ts` says so in as many words), so it lives in
the mount closure, where nothing re-runs, and what crosses the boundary is the one thing React
guarantees is stable for the life of the component: the `useState` setter.

THE SHELL'S CHILDREN ARE THE TEN DECKS NOW; the eighty cards are eight per deck below them.

THE APP'S FIVE USERS — ONE PIECE OF STATE AT THE TOP, TRAVELLING DOWN AS A PROP. The lazy
initialiser runs once per MOUNT, which is what keeps two apps in a gate from sharing five settings.
The advance below replaces the array rather than writing into it, because that is what React state
is: a new value, then a render of everything that reads it.

WHAT IT WAKES, counted rather than implied: all ten decks and all eighty cards. A `useContext` would
wake the same ninety (every card holds a tag position of four of the five users, and every deck
renders its date through one of them), and a store with a per-card selector would wake sixty-four
cards and the two decks of the user that moved. None of those is written here for the same reason no
`useMemo` is written above — this row is React's model as an author writes it.

THE SETTER, HANDED OUT THROUGH THE SLOT — assigned in the render body, which is the one un-React-y
line in this row and is here on purpose: `useState`'s setter is STABLE for the life of the
component, so what is written on the first render is what every later render writes again, and the
mount needs it before it can hand `card-driver.ts` anything. The alternative
(`useImperativeHandle` plus a ref) buys a hook and a ref for the same one assignment.

## The React adapter, in `todo-app.tsx`

THE SETTINGS WRITER, out of the app's first render — `flushSync` makes that render happen inside
this call, so the slot is filled before the next line reads it.

THE ROUND COUNTER LIVES HERE, in the mount, and not in the component: a React body runs again on
every render and an integer declared in one would be reset eighty times a round. One integer per
mounted app, advanced by this closure and by nothing else.

ALL FOUR STEPS INSIDE ONE `flushSync`, because that is what makes a round ONE render pass for this
participant: the ten renames and the user write land with the 160 card writes and React reconciles
the whole app once. Committing any of them separately would be several passes where the called path
is one — a difference the byte gate cannot see.

`commit` is the same `flushSync` this row's `flip` wraps its clicks in, so a direct drive batches
all 170 state writes into one render pass exactly as 170 dispatched clicks inside one `flushSync`
do.

`TSlot` — the door a mounted app hands its round operation out through — is declared in
`apps/scene/slot.ts` and imported here as a type; its argument is written up in
`apps/solid/solid.md`.
