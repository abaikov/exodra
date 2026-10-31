# WHAT GOES INTO A REGION — the half of Exodra's todo app the other Exodra rows share

`apps/exodra/exodra-shared.tsx` holds exactly what `exodra-direct` and `exodra-machine` import from
the reference app and do not re-declare:
`TCardTag`, `TAG`, `DETAILS`, `TCardProps` and `TDeckProps`. The rest of the app — the backend
instance, `CARD`, `DECK`, `exodraAppOf`, `APP` — is in `apps/exodra/exodra.tsx`, and its prose is in
`exodra.md`.

## `TCardTag` — ONE TAG ROW, AS THIS PARTICIPANT HANDS IT TO `TAG`

A label and THE CELL that decides how much of it is shown.

IT IS NOT `TTag` FROM THE SPEC, and the difference is the whole of this row's strategy. The spec's
`TTag` says `{ label, user }` — WHICH user, as a number, because that is a fact about the scene
and every participant needs it. What THIS renderer wants at the point of the write is not a number
it would have to look up but the OBSERVABLE ITSELF, resolved once per card while the card is being
wired. A tag's fill is then one `bind` on a cell it already holds, with no table between it and
the value.

IT IS AN OBJECT AND NOT A STRING, as before, so identity survives `slice`: the list reconciles by
object identity, the kept tags are the SAME rows, and only the tail is added or removed.

## `TAG` — one tag

ITS SCHEMA IS UNCHANGED BY THE USERS — one `<span class="tag">` with one text port, exactly as
before. A tag renders one value and still renders one value; what moved is WHAT THAT VALUE IS A
FUNCTION OF. So nothing that imports this schema has to change its shape, and the change is
entirely in the wiring.

WHAT THE WIRING NOW COSTS, PER TAG INSTANCE, counted rather than asserted: one transition call
writing one text, and nothing retained — no subscription on a cell this instance does not own and
no disposer. THE FAN-OUT IS PAID BY THE APP INSTEAD: when a user setting moves, `advance` in
`exodra.tsx` walks the decks and cards and re-writes exactly the tags whose cell it just changed.
A participant is free to pay it somewhere else, and where each one pays is what the axis reads.

WHAT IT DOES **NOT** DO IS COMPUTE ONCE PER USER. The forty texts one advance produces are at most
four distinct strings (four labels, one setting), and this wiring slices forty times. That is a
strategy, not an oversight, and the other one is a strategy too — see THE USERS in `apps/scene/spec.md`.

EXPORTED, together with `DETAILS`, because the `component-split` axis renders the very
same app out of ONE whole-app schema instead of a schema per card, and what goes INTO a
region is the same shape either way. Re-declaring them there would compile a second plan for
an identical shape and make the two variants differ by something other than the cut being
measured.

## `DETAILS` — the conditional block

No ports at all: every byte of it is known now, so its wiring is the empty one — a component still
carries both halves, even when the second has no work.

THE USERS DID NOT REACH IT AND THAT IS DELIBERATE. A card's user name is rendered by the CARD,
in a `<span class="user">` that stands whether the card is open or shut, so the shared read is
present in all eighty cards at all times. Putting it inside this block would have made a shared
value appear and disappear with a disclosure toggle — a mount/unmount measurement wearing a
shared-read's name, and forty of the eighty cards would have hidden their user half the time.

## `TCardProps` — WHAT ONE CARD IS WIRED FROM

Its index, and the five user cells its whole app shares.

IT USED TO BE THE NUMBER `i` AND NOTHING ELSE, and it could not stay one: the five users belong to
a MOUNTED APP and not to a module (`apps/scene/spec.md`, WHERE THE USERS LIVE), so the only way a
card can reach them is to be handed them. The alternative was context — `c.provide` in the shell
and `c.inject` in the card — and it is not taken, for one reason worth stating: every other
participant in this field passes its user table down as data, so a row that reached for a chain
walk instead would be answering the axis's question with a mechanism nobody else in the table has.
What context costs is a question, and `context-cost.ts` is where it is asked.

THE ARRAY IS THE SAME ARRAY IN ALL EIGHTY, so a DECK allocates one of these per card it holds and
no copy of the pool per card. Since the decks arrived the shell no longer builds these at all —
it builds ten `TDeckProps` and each deck builds eight of these, which is the chain a props-passing
app pays instead of a context lookup.

## `TDeckProps` — WHAT ONE DECK IS WIRED FROM

Its index, and the same five user cells its whole app shares.

IT IS THE SAME SHAPE AS `TCardProps` and it is a SECOND type rather than a shared one, because
`d` and `i` are different facts: `deckUserOf(d)` and `cardUserOf(i)` read the same table with
different rules, and a props object that answered to both names would let a deck be wired from a
card's index without a single complaint from the compiler.

THE ARRAY IS THE SAME ARRAY IN ALL TEN AND IN ALL EIGHTY CARDS BELOW THEM — the shell allocates
one of these per deck, a deck allocates one `TCardProps` per card, and the five cells are passed
down by reference through both levels. That chain is the alternative to context, and the argument
for taking it is on `TCardProps`.
