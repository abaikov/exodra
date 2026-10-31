# `mikado-reactive.tsx` — Mikado (0.8.400), written the way its documentation says

THE same 80-card todo app again, in MIKADO (0.8.400) — but written the way MIKADO'S OWN DOCUMENTATION
says to write a reactive app, which is a different program from `apps/mikado/mikado.tsx` and is why
both
exist.

## Why a second Mikado row

`apps/mikado/mikado.tsx` uses Mikado as a template instantiator and a keyed list differ and does
everything
else by hand: it grabs the tags container by POSITION (`node.children[2]`), parks each card's state on
the card node (`node._st`), installs its own `click` listener on the app div and dispatches on
`btn.className`, and inserts/removes the details block itself. Nothing observes anything — the DOM
changes because the author called `render()` at the right moment. That is a legitimate thing to
measure (it is Mikado's CEILING: what the library costs when the app around it is hand-optimised), but
it is not what the other participants on these axes are: every one of them is written in its
framework's own reactive idiom. Comparing a reactive renderer against
templates-plus-a-hand-written-app is comparing two different questions.

So this file is the other half of the pair. Same app, same data, same update round, but the three
things `apps/mikado/mikado.tsx` declines are taken from Mikado instead:

-   REACTIVE PROPERTIES (README "Reactive Properties (Proxy)") — the card's template expressions are
    `{{= data.headline }}` / `{{= data.expanded }}` / `{{= data.label }}`, so `render(store)` PROXIFIES
    the store and a later `store[i].headline = …` reaches the DOM with no render call. THAT IS THE WHOLE
    OF THIS ROW'S UPDATE PATH FOR THE THREE DERIVED VALUES: three property assignments, no `update()`,
    no diff, no slice handed back to the renderer.
-   THE OBSERVABLE ARRAY (README "Reactive Array (Virtual NodeList)") — every card's tag list is a
    `Mikado.Array` bound to its own view with `{ observe: store, mount: root }`, and the update round
    grows/shrinks it with `push()` / `splice()` instead of re-rendering a slice.
-   ROUTING (README "Routing & Event Delegation") — the two buttons carry `click="tog:root"` /
    `click="addtag:root"`, the handlers are registered once with `Mikado.route(...)`, and Mikado's own
    global capture listener does the delegation and the walk to the card.

The pair is the measurement. Neither row alone can say what Mikado's reactivity costs, because there
is nothing to subtract it from.

THE APP IS THREE DEEP NOW — decks, then cards, then tags — and the deck level added no new Mikado
feature to the three above. It added a SECOND INSTANCE OF EVERY ARGUMENT ON THE LIST: a deck is one
more template whose expressions are reactive, its rename is one more process-global route, its date is
the coarse half of the same fan-out the tags already had to be enumerated for, and its eight cards are
one more view mounted on a real node because Mikado's nesting cannot reach them. What the third level
costs this row is therefore not a mechanism it lacks; it is ten more views, ten more stores, ten more
route attributes and one more side table, each of them priced below.

AND THE DECK IS REACTIVE THE WAY THE CARD IS, which is the whole reason the pair exists. Its name
reaches the `<h2>` through the proxy, its date reaches the `<time>` through the proxy, and neither its
rename handler nor the round operation names a node. The non-reactive row writes those two texts
itself. If the deck level were written directly here too, the pair would stop subtracting to the reactivity
— it would subtract to the reactivity of two levels out of three.

## What this costs in markup, and it is the first thing to read before any number here

MIKADO'S ROUTING PUTS THE ROUTE NAME IN THE DOM. `factory.js` writes it with
`node.setAttribute(key, val[key])` and `event.js` resolves it with `target.getAttribute(type)` — the
attribute IS the registration; there is no route table keyed by node and no way to name a route
without leaving it in the markup. So this app's buttons serialise as

```html
<button class="tog" click="tog:root" aria-expanded="true">details</button>
<button class="addtag" click="addtag:root">+</button>
```

where the reference has `<button class="tog" aria-expanded="true">details</button>` and
`<button class="addtag">+</button>`. That is 2 extra ATTRIBUTES per card, 160 in the app, and 0 extra
ELEMENTS. Note where the route attribute lands on the toggle button: the factory carries `class` and
`click`, and the DYNAMIC `aria-expanded` is written afterwards — so removing the route attribute
leaves `class` then `aria-expanded`, which is the contract's order.

THE DECK'S RENAME BUTTON TAKES IT TO 170. `<button class="ren" click="ren:root">rename</button>` where
the contract has `<button class="ren">rename</button>` — one more attribute per deck, ten more in the
app, and a third name in the process-global route table. Nothing else about the deck level reaches the
markup: NO ELEMENT OF A DECK CARRIES A DYNAMIC ATTRIBUTE, so a deck's three values are three TEXT
sinks and the attribute-order question the card's `aria-expanded` raises does not arise one level up.
The route attribute is the deck level's entire markup divergence.

`verifyMikadoReactiveApp()` diffs the raw bytes like every other gate in this suite and therefore
FAILS, and the failure is not a bug in this file — it is the answer to the fairness question: Mikado's
idiomatic event wiring cannot produce the reference's DOM. Whether that deserves the same allowance
the gate already grants Lit's and Angular's marker comments (stripped from both sides) and Angular's
`ng-version` (exempted by sitting on the host element, outside `innerHTML`) is a call for the suite's
owner, not for this file, so nothing here widens the gate.

## Where Mikado's reactivity could not reach this app

Stated plainly, because it changes how the numbers should be read.

-   THE DETAILS BLOCK IS STILL HAND-WRITTEN, exactly as in `apps/mikado/mikado.tsx`. Mikado's proxy
    has
    precisely four sinks — `_t` text, `_h` innerHTML, `_c` className, `_a` attribute (`proxy.js` →
    `Cache.prototype._t/_h/_c/_a`). A reactive property can change what an element SAYS; it cannot add
    or remove an element. The only conditional Mikado has is the template's `if=`, and it is wrong here
    twice over: (1) it does not remove the element it is written on — it mounts a nested view on it and
    renders or CLEARS its children (`compile.js` emits
    `this.inc[n].mount(_o.n)[cond?"render":"clear"](…)`), so every closed card would keep an empty
    `<div class="details"></div>` and the initial-render axis's element-count gate would reject the app
    outright; and (2) reading the runtime compiler, `if=` on an element whose only child is TEXT never
    reaches the include branch of `construct()` at all, because the `tpl.text` branch short-circuits it
    — so the include instance the render function calls would not exist. (2) is inference from the
    source, not something measured here; (1) alone already rules `if=` out. So the block is an ORPHAN
    COMPONENT (`view.create()`) inserted with `insertBefore` and dropped with `.remove()` — the same
    code `apps/mikado/mikado.tsx` runs, and the same advantage: a clone and an insert with no
    bookkeeping is the
    cheapest a conditional can be.

    THAT ADVANTAGE HAS A SHARP EDGE, AND THIS ROW IS ON THE SAFE SIDE OF IT ONLY BY ORDERING. Mikado
    addresses a dynamic position by SIBLING HOPS from the card root — a vpath like `">+++|"` walked with
    raw `firstChild`/`nextSibling` (`factory.js` → `resolve`) — and the resulting path array is MEMOISED
    on the node forever. A hand-inserted details block shifts every sibling after it by one, and the
    `<span class="count">` is after it, so a path built while a card is OPEN would address a tag inside
    `.tags` instead of the count span, per card and permanently. This file is safe because a deck's
    `render()` calls `apply_proxy` → `create_path` on each of its eight cards AS IT ADDS THEM, before
    the loop below inserts any details block — an ordering, not a guarantee, and the decks did not
    weaken it: the render and the insertions stayed on the same side of each other, they just happen ten
    times now. `apps/mikado/mikado.tsx` has to arrange the same ordering by hand and
    `apps/mikado/mikado.md` says so.

    THE DECK'S OWN POSITIONS ARE OUT OF THAT HAZARD ENTIRELY, and it is worth saying why rather than
    trusting it: nothing is ever inserted among a deck's six children. The three text sinks sit on the
    first three of them, the `.cards` div is the last, and everything this app inserts goes INSIDE that
    div or inside a card. A path from a deck root is walked once and stays true.

-   A DERIVED VALUE IN MIKADO IS A STORE FIELD SOMEBODY ASSIGNS, and there is no second option. A
    reactive expression accepts PLAIN PROPERTY NOTATION ONLY — `compile.js` turns `{{= X }}` into a
    field NAME with `replace(/^data\./,"")` and registers the DOM sink under it, so no computation of
    any kind can sit inside one, not even a concatenation. `headlineOf`, `expandedOf` and `tagsLabel`
    are therefore called in the ROUTE HANDLER and their results assigned to `data.headline` /
    `data.expanded` / `data.label`; the proxy carries each one to the single DOM position that depends
    on it. What Mikado's reactivity buys on this app is exactly that last hop: the handler names a
    FIELD, not a node, an index or a render call. What it does not buy is the recomputation — no
    participant's framework does that for it, but the ones with a memo or a derivation get to DECLARE
    where it happens once, and this row re-states it at each of the two write sites instead.

    THE DECK'S NAME IS THAT STORY WITH A SHARPER EDGE, because at this level the state and the rendered
    value are not even the same TYPE. A deck's state is one INTEGER — an index into `DECK_TITLES` — and
    what the `<h2>` shows is `deckNameOf(d, name)`. An expression cannot concatenate, so the store
    carries BOTH: `name`, an integer no sink is bound to, and `heading`, the string one is. The rename
    handler advances the first and assigns the second, in that order, and names no node — the same shape
    `open`/`headline` has one level down, and the same price: two fields where a framework with a
    derivation declares one.

-   `data.i` IS STILL A CONSTANT AND IS STILL BOUND WITH `{{= }}`, on purpose: the contract keeps one
    value that never moves precisely so a table where everything moves cannot hide what a still value
    costs. Binding it reactively is what "write it reactively" means in Mikado, and the cost is part of
    the measurement — proxifying a card forces `create_path()` per instance at mount (`apply_proxy` →
    `create_path`), which the non-reactive participant does not pay at mount, since its render function
    runs against the FACTORY's path and the result is then cloned. (That participant pays the same walk
    on the FIRST `update()` of each card instead; see its header. The difference between the rows is
    WHEN, and how often, not whether.)

-   MIKADO'S ROUTES ARE PROCESS-GLOBAL (`event.js` keeps one `routes` object for the whole page), so a
    route handler CANNOT close over the mount it belongs to. This file registers the three routes once
    at module load and finds the mount through a `WeakMap` keyed by the app div. That side table is not
    Mikado's and not the reference's — it is what a global route table costs an app that can be mounted
    more than once.

    THE DECK ADDS A SECOND SIDE TABLE, AND THE CONTRACT IS WHAT FORCES IT. A card carries its global
    index in `data-i`, so a handler reads it off the node in O(1); NO ELEMENT OF A DECK CARRIES AN
    ATTRIBUTE AT ALL, so there is nothing on a deck node to read an index off. Mikado's own way in is
    `view.index(node)`, an `indexOf` over the view's node array — ten comparisons per click, a hundred
    per round — so this file keeps a second `WeakMap`, deck node → that deck's proxied store, and the
    rename is one lookup and two assignments.

    WHAT TELLS A DECK'S BUTTON FROM A CARD'S IS THE ROUTE NAME, NOT A CLIMB: `ren` and `tog` are
    different entries in the global table and the handler is chosen before it runs, which is the one
    thing this row gets for the attribute it ships. `:root` is unambiguous at the new level too, because
    `.ren` is a DIRECT CHILD of the deck root — no card component can sit between the clicked button and
    the component it belongs to. THE CARD'S CLIMB, on the other hand, got two hops longer: a card's
    parent used to BE the app div, and is now its deck's `.cards` region, whose parent is the deck,
    whose parent is the app div.

-   ONE VIEW AND ONE OBSERVABLE ARRAY PER CARD. An observable array binds to exactly one Mikado instance
    (`Observer.prototype.mount` sets a single `this.mikado`), and an instance renders into exactly one
    root, so 80 reactive tag lists mean 80 views and 80 observables — 80 factories built at mount. The
    non-reactive participant shares ONE tag view and hops it between the cards with `mount()`. That is
    the single biggest structural difference between the two rows and most of what the mount number will
    be about.

-   A DECK CANNOT OWN ITS CARDS THROUGH ITS TEMPLATE — THE SAME WALL THE TAG LIST MET, ONE LEVEL UP.
    Mikado's way of putting a list inside a template is an inline include, and it renders into the
    FACTORY's copy of the element it is written on; the instance is then CLONED off that factory, so the
    nested view is addressing a container no instance owns, and the first operation that touches it
    empties the container and rebuilds it — destroying exactly the child identity a byte gate checks.
    That is why a card's tags are a view mounted on the card's REAL `.tags` div, and it is now also why
    a deck's `<div class="cards"></div>` is EMPTY in the template and a card view is mounted on it once
    the deck node exists. One wall, met twice, one level apart.

    IT COSTS TEN MORE VIEWS, on top of the eighty above: the mount now builds 1 deck view + 10 card
    views + 80 tag views = 91 factories, against 81 before the decks existed. Hopping ONE card view
    between the ten `.cards` divs — what the non-reactive row does with its tag view — is not open to
    this row's code as written: an instance keeps one node array, and this file addresses the cards it
    built (`view.node(k)`) to find each card's `.tags` div and to insert its details block, so the eight
    cards a hopped view left behind would stop being addressable by the instance that made them.

-   THE TAG ITEMS ARE REACTIVE NOW, AND THIS FILE USED TO ARGUE THE OPPOSITE. The old bullet read "a
    tag's text never changes, only the list's length does, so the LIST is the observable and the item
    bindings stay `{{ }}`", and it was true of the app it was written against. It is not true of this
    one: a tag renders its label CUT TO THE SETTING OF ITS OWN USER, and the round advances one user's
    setting. So the item template is `{{= data.text }}` and each item is a store the proxy binds a text
    node to. The cost the old bullet named as a reason not to is now simply paid: a reactive item view
    makes `render()` write each item back into the observable (`data[x] = apply_proxy(…)` re-enters the
    array's `set` trap and updates the node it has just created), which is 200 extra `update()` calls at
    the mount.

-   A SHARED WRITE HAS TO BE ENUMERATED BY THE APP, and this is the sharpest thing the users add to this
    row. A `{{= }}` expression is a FIELD NAME on the item being rendered (`compile.js` strips `data.`
    and registers the sink under it), so there is no expression that can read a user record belonging to
    forty other cards, and Mikado has no computed, no derivation and no cross-store link of any kind.
    The app therefore keeps `hot[u]` — every tag position whose user is `u`, gathered at the mount — and
    the round walks it. What Mikado's reactivity buys on that write is the LAST HOP and nothing before
    it: forty field assignments instead of forty node writes. What it does not buy is knowing who reads
    the setting, or which of those positions are currently on screen (`j < data.count`, one comparison
    the app makes, because the observable array will not say what it removed).

    AND THAT WRITE NOW LANDS AT TWO DEPTHS, so the app keeps two tables instead of one. Advancing user
    `u` moves forty tag texts three levels down, which read the setting as a LENGTH, and the dates of
    the TWO decks `u` authored one level down, which read the same number as a PRECISION. Mikado has no
    computed either way, so `hotDecks[u]` sits beside `hot[u]` — two proxied deck stores per user,
    gathered at the mount — and the round walks both. The deck half is the cheaper walk on every count:
    two entries against forty, one assignment each, and no `j < count` question because a deck is never
    off screen. It is NOT cheaper in recomputation: `dateTextOf` reads six fields off a `Date` and
    indexes two name tables, and this row runs it in the round operation because a `{{= }}` expression
    is a field name and can hold no work at all.

## The templates

Module scope, compiled exactly four times for the life of the process, exactly as in
`apps/mikado/mikado.tsx`:
`Mikado.compile()` is the runtime compiler, the compile happens ONCE at module load and never inside a
measured region — the same deal Solid's compiler, lit's template prep and the schema core's port
numbering get.

No whitespace between tags: the compiler builds the template through `innerHTML`, and although it
drops whitespace-only text nodes, the markup gate compares `innerHTML` byte for byte and there is no
reason to depend on that.

### `DECK` — one deck, whole

Six elements, three reactive positions and one route.

ALL THREE OF ITS BINDINGS ARE `{{= }}` TEXT SINKS and none of its elements takes a dynamic attribute,
so this template asks the proxy for one thing only: `Cache._t`, three times. Beside the card's four
positions — three texts and an attribute — that is the deck level's whole demand on Mikado's
reactivity, and it is why the deck adds no attribute-order question to the markup gate.

`{{= data.heading }}` AND NOT `{{= data.name }}`: the `<h2>` shows `deckNameOf(d, name)` and the
deck's state is the INTEGER `name`. A reactive expression is a bare field name — no call, no
concatenation, not even an index — so the two cannot be the same field, and the store carries both.
`{{= data.author }}` is this level's STILL value, the deck-level twin of the card's
`<span class="user">`: one template serves ten decks, so the author's name cannot be static markup,
and nothing in the app can ever move it.

`<div class="cards"></div>` IS EMPTY HERE ON PURPOSE and stays empty until a card view is mounted on
it — the nesting wall above, met a second time one level up from the tags.

`click="ren:root"` is Mikado's routing again, and `:root` is unambiguous at this level because the
button is a DIRECT CHILD of the deck root: whatever the resolver climbs past on its way up, no card
component stands between the two. This is the attribute the markup section prices at ten.

### `CARD` — one card, whole

Seven elements, five reactive positions.

`{{= }}` (not `{{ }}`) is Mikado's REACTIVE binding: the compiler records the data field behind each
expression, `render()` proxifies the store, and a write to that field goes straight to the one DOM
position that depends on it. Only plain property notation is allowed inside a reactive expression — no
JavaScript, not even a concatenation — which is why every one of these four is a bare field, and why
the three DERIVED ones are computed in the route handlers with the spec's imported formulae and then
ASSIGNED. The rendered bytes are the contract's either way; what changes is that the app can never
compute in the template.

`aria-expanded="{{= data.expanded }}"` is the ATTRIBUTE sink (`proxy.js` → `Cache._a`) to the `<h3>`'s
and the `.count` span's TEXT sink (`Cache._t`) — the contract's two write paths, both pushed by the
same proxy, which is exactly the difference a participant with two write paths is supposed to show.
Being a DYNAMIC attribute it is not put on the factory node at all (`factory.js` turns it into a cache
entry) and is written with `setAttribute` at the first apply, so it serialises after the static `class`
and after the `click` route attribute the factory does carry:
`class="tog" click="tog:root" aria-expanded="…"` — the contract's `class` then `aria-expanded` once
`ROUTES` in the gate removes the middle one.

The `<span class="count">` is a SIBLING of the `.tags` div, not a child. Inside it would be a child of
the root this card's own tag view is mounted on, and a Mikado view OWNS its root's children — the
observable array's `push`/`splice` index straight into them — so the count span would be taken for a
tag component and destroyed by the first list operation. Outside, the tag view's region is exactly the
tags, as it was before this span existed.

`click="tog:root"` is Mikado's routing. The name before the colon is the route; `root` is its
documented shortcut for "hand the handler the component's root element", which is how a handler gets
from the clicked button to its card without walking the DOM by hand. This is the attribute that ends
up in the markup — see above.

`<span class="user">{{= data.user }}</span>` IS THE APP'S SECOND STILL VALUE, and it is bound with
`{{= }}` for the same reason `data.i` is: one CARD template serves eighty cards, so the user's NAME
cannot be static markup, and binding it reactively is what "write it reactively" means in Mikado. It
never moves — no click and no round operation can change a user's name — so beside `data.headline`,
which changes on every click, it is the pair this scene exists to price.

IT STANDS BEFORE THE DETAILS BLOCK'S POSITION, which matters for the vpath hazard above: the block is
hand-inserted between `.tog` and `.tags`, so every sibling AFTER it shifts, and the
`<span class="user">` is before it and cannot be affected by the insertion.

### `TAG` — one tag

`key="data.label"` puts this view in Mikado's KEYED recycle mode — the same setting
`apps/mikado/mikado.tsx` uses, kept identical on purpose so the delta between the two rows is the reactivity and not the recycle
strategy. The `key` attribute is consumed by the compiler and is NOT rendered.

THE TEXT IS `{{= data.text }}` AND NOT `{{ data.label }}`, WHICH IS A REVERSAL. This file used to argue
that a tag's items must NOT be reactive because "a tag's text never changes, only the list's length
does". THAT IS NO LONGER TRUE: a tag renders its label cut to the setting of ITS OWN user
(`tagTextOf(label, chars)`), one user owns 40 of the 200 mounted tags across 40 different cards, and
the update round advances one user's setting every round. So the text is exactly the kind of value
`{{= }}` is for, and the key stays `data.label` because the tag's IDENTITY — which position of which
card it is — still does not move when its text does.

AND THE PRICE THE OLD COMMENT NAMED IS NOW PAID, so it is restated as a cost rather than deleted: a
reactive item view makes `render()` write each item back into the observable array
(`data[x] = apply_proxy(…)`, `mikado.js`), which re-enters `Observer`'s `set` trap and updates the node
it has just created. That is one extra `update()` per tag at the mount — 200 of them — and it is the
cost of having a tag's text reachable from a field assignment at all.

### `DETAILS`, `DETAILS_VIEW`, `NO_DATA`

The conditional block. Not one byte of it varies, so its template has no expressions at all.

The view the details blocks are cloned from. It is never mounted: `create()` builds its factory on
first use and returns an orphan clone every time after. Module scope, because a factory is a constant —
and because this view holds no per-mount state at all (no root, no pool, no keys), so sharing it across
mounts cannot carry anything from one sample into the next.

`create(data)` wants a data argument; this template reads none, so one shared object serves.

## The types

`TMikadoTag` — a tag is an object because Mikado's keyed mode reads the key off the item
(`data.label`) — and because, since the app gained its users, it is also a STORE that the proxy binds a
DOM position to.

`text` IS THE ONLY MOVING FIELD and `label`/`user` are constants of the position. The object in
`cell.pool` is the RAW one; what the observable array holds after a render or a push is a Proxy OVER it
(`apply_proxy`, `array.js`), and only a write through THAT reaches the DOM. Every write in the file
therefore goes through `cell.tags[j]` and never through `cell.pool[j]` — which is also why
`pool[j].text` has to be refreshed by hand just before the item is pushed back into the list (see
`addtag`): a position that was off screen when its user's setting moved was skipped, and
`mikado.add(value)` renders whatever `value.text` says at that instant.

`TMikadoHotTag` — ONE TAG POSITION, AS THE ROUND OPERATION REACHES IT: this row's answer to "who is
reading this user's setting", and it is a list the APP maintains because Mikado has nowhere else to put
one.

MIKADO'S REACTIVITY IS PER STORE OBJECT AND HAS NO CROSS-OBJECT DERIVATION. A `{{= }}` expression is a
field NAME on the item being rendered (`compile.js` strips `data.` and registers the sink under it), so
there is no expression that can read a user record forty tags away, and no computed of any kind. A
shared read therefore has to be ENUMERATED by the app, exactly as it does in the zero-abstraction row.
What Mikado's reactivity buys on this write is the LAST HOP and only that: the app names a field on
forty item stores and never names a node, an index or a render call.

-   `cell`: the card this position belongs to — for its live tag list.
-   `data`: the card's store entry, read for `count`: a position exists only while `j < count`.
-   `j`: this position's index in its card's list, 0…3. Constant.

`TMikadoCardData` — what the CARD template reads, plus the state the three derived fields are computed
from. `i`, `headline`, `expanded` and `label` are the template's reactive inputs — one per dynamic
position. `title`, `open` and `count` are app state that no expression is bound to: `title` is the
constant `headlineOf` clips, and `open`/`count` are the two things a click changes. They live here
rather than in a side table because in Mikado the STORE is the model, and because the cost of that
choice is honest: after `render()` these objects are Proxies, so every read and write of
`title`/`open`/`count` goes through a trap for a field the renderer does not watch.

-   `user`: `userNameOf(cardUserOf(i))` — bound to the `<span class="user">`'s text. A STILL value: it is
    written once, when the store is built, and no handler ever assigns it again.
-   `title`: the card's FULL title — constant for its life, and the input `headlineOf` clips.
-   `headline`: `headlineOf(title, open)` — bound to the `<h3>`'s text.
-   `expanded`: `expandedOf(open)` — bound to `.tog`'s `aria-expanded`. A string, because that is what an
    attribute holds.
-   `label`: `tagsLabel(count)` — bound to the `.count` span's text.

`TMikadoDeckData` — what the DECK template reads, plus the state its heading is computed from.

IT IS A SEPARATE INTERFACE FROM `TMikadoCardData` AND NOT A WIDER ONE, because `d` and `i` are
different facts: `deckUserOf(d)` and `cardUserOf(i)` read the same five users by different rules, and a
shape that answered to both would let a deck be built from a card's index with nothing to catch it.

`heading`, `author` and `date` are the template's three reactive inputs, one per dynamic position. `d`,
`when` and `name` are app state no expression is bound to — and, as with the card's
`title`/`open`/`count`, that is not free: after `render()` this object is a Proxy, so every read of the
constant date and every write of the name goes through a trap for a field the renderer does not watch.
It is the price of the store being the model, paid once more at a level with ten instances instead of
eighty.

-   `author`: `userNameOf(deckUserOf(d))` — bound to the `<span class="author">`. A STILL value: written
    when the store is built and never assigned again, exactly like a card's `user`.
-   `when`: `deckDateOf(d)` — constant for the life of the deck, and the input `dateTextOf` formats.
-   `heading`: `deckNameOf(d, name)` — bound to the `<h2>`'s text.
-   `date`: `dateTextOf(when, chars[deckUserOf(d)])` — bound to the `<time>`'s text, and the coarse half
    of the fan-out the round operation walks.
-   `name`: THE DECK'S OWN STATE, and the only state at this level: an index into `DECK_TITLES`.

`TMikadoObservable<T>` — the observable array, named by the members this file uses. Mikado's own
`index.d.ts` declares the class as `Mikado.array` (lower case) — a name that does not exist at runtime:
`bundle.js` assigns `Mikado["Array"] = Observer`. So the constructor has to be taken through a cast,
and this is the shape it is taken as.

-   `[index]`: the item AT A POSITION — a Proxy over the raw item once the view is reactive, which is
    what the round operation writes through. Reading it is a plain property read: `Observer` installs no
    `get` trap outside its profiler build (`array.js`).
-   `push`: appends one item — `Observer.push` → `view.add()`, i.e. one component created and inserted.
-   `splice`: drops the tail in one call — `Observer.splice` → `view.remove(start, count)`.

`TMikadoCardCell` — the view-side half of a card: everything the two route handlers need that is not
app data.

-   `tagsDiv`: the card's `<div class="tags">` — the tag view's root, and the anchor the details block is
    inserted before. Found once with `querySelector`, never by child index.
-   `pool`: stable per (card, tag) so the observable array's items keep their identity, exactly as the
    reference does.
-   `tags`: the card's reactive tag list.
-   `view`: the view the list is bound to — one per card, because an observable array binds to one.
-   `details`: the mounted details element, or null when the block is closed.

`TMikadoReactiveApp` — one mounted app, as the two GLOBAL route handlers see it.

THE FIVE USERS' SETTINGS BELONG TO THIS MOUNT AND NOT TO THIS MODULE. `todo-spec.ts` (WHERE THE USERS
LIVE) says why: every gate here stands two apps side by side, and five module-level settings would be
advanced twice per round while both trees still agreed. They are plain numbers because Mikado has no
cell to put one in — a user is not a rendered store object, and nothing in the template reads it.

`hot` — every mounted-or-not tag POSITION in the app, dealt into five arrays by its user.

## The two side tables

`APPS` — app div → its state. Mikado's route table is process-global, so the handlers are registered
once and cannot capture a mount. They reach it by going up one element from the card (the card's parent
IS the app div) and looking it up here. A WeakMap rather than an expando on the node, because parking
state on DOM nodes is precisely what the hand-written participant does and what this one is meant not
to do. Nothing is ever deleted from it — the entry dies with the app div.

`DECK_STORES` — deck node → that deck's PROXIED store, and the second thing a process-global route
table costs. The rename handler needs the deck the click came from, and a deck node carries nothing to
identify it: the contract gives a deck six elements and not one attribute, so the `data-i` trick the
cards use has nothing to read. The alternatives are `view.index(node)` — ten comparisons per click — or
this, one hash lookup. The value is the store rather than an index because the store is everything the
handler touches. Keyed by node, so two apps mounted side by side in a gate never collide.

## The route handlers

`cardOf` — both handlers arrive with `target` already resolved to the CARD by Mikado's `:root`
notation, so neither of them walks the DOM or reads a className to decide what to do — the route name
decided that before the handler was called.

The card's index is read from `data-i`, the app's own data attribute. That is the pattern the README
names for exactly this case ("helpful when you have corresponding data-attributes assigned to an outer
context and each of the nested listener needs to access those values") and it is O(1); Mikado's other
way in, `view.index(node)`, is an `indexOf` over the view's node array and would cost 80 comparisons
per click, 6400 per update round.

THREE HOPS SINCE THE DECKS ARRIVED, spelled out rather than left to `closest('.app')`: a card sits in
its deck's `.cards` region, the region sits in the deck, and the deck sits in the app div. The card's
index does NOT change with the depth — `data-i` is the GLOBAL index and `store`/`cells` stay eighty
long, so a deck never renumbers the cards it holds.

`ren` — THE DECK'S RENAME, and it is the same program as `tog` with one level less to reach: advance
the state, recompute what depends on it, assign. `name` is an integer no sink is bound to and `heading`
is the string the `<h2>` shows, so the two assignments are a model write and a DOM write, and only
Mikado can tell them apart — the proxy's `set` trap finds the one `Cache` bound to `heading` and writes
that heading's text node. No `update()`, no index, no node named in this handler.

`tog` — the STORE decides, not the DOM: `open` is the model, `cell.details` is the node it owns. The
insert/remove is the one thing in this app Mikado has no reactive form for. THE TWO DERIVED VALUES
`open` MOVES are recomputed there because a reactive expression cannot compute, then ASSIGNED — and
that assignment is the whole update: the proxy's `set` trap finds the one `Cache` bound to each field
and writes the `<h3>`'s text node and the button's attribute. No `update()`, no index, no node named
anywhere in this handler.

`addtag` — the list cycles 1→2→3→4→1. Growth is one `push`; the wrap is one `splice` that drops the
tail. Both are the observable array's own operations: the app states the CHANGE and the bound view
applies it, which is the whole point of the feature — no `render()` call, no slice handed back to the
renderer to diff.

THE ARRIVING TAG'S TEXT IS REFRESHED FIRST, and this is the one place the fan-out leaves work behind.
`advance` writes only the positions that are ON SCREEN, so a position that was off screen when its
user's setting moved still carries the previous text — and `mikado.add(value)` renders whatever the
item says at that instant. The raw pool object is the right thing to write here: it is the one `push`
hands to `add`, and the proxy the observable stores afterwards is created OVER it.

THE ONE DERIVED VALUE `count` MOVES. The `.count` span is outside the div the observable array owns, so
it is not the list's business at all — it is a field of the CARD's store and one assignment carries it
to the span's text node.

## The mount

Mikado renders a template's instances as the children of a root it is given, so the app div is the root
and is made here rather than by a template.

A view owns its factory, so a view is per mount — sharing one across mounted apps would carry a warm
component pool from the previous sample into the next one and hand this participant nodes it never
built. THE THIRD LEVEL DOES NOT SOFTEN THAT RULE, IT MULTIPLIES IT: the decks' view here, a card view
per deck below it, a tag view per card below that, and all 91 built inside this function. Building this
first factory is also what registers Mikado's global `click` listener (`construct()` calls `listen(key)`
for every routed event in the template), so the delegation this participant measures is set up inside
the timed mount — and it is the DECK's template that does it now, being the first factory this mount
constructs.

THE APP'S FIVE USER SETTINGS AND ITS ROUND COUNTER are per MOUNT. THE COARSE HALF OF THE SAME FAN-OUT
— the two decks each user authored — is filled below, after the render, because what belongs in it is
the PROXY and not the object the map above returns.

The deck store is under the same `render()` contract as the cards': every item comes back REPLACED by a
Proxy over it, which is what makes the three `{{= }}` positions live. Its author's NAME is the
deck-level twin of a card's `user`, and just as constant; the two derived values are computed at the
state each deck is born with, with the spec's formulae exactly as the rename handler and the round
operation recompute them.

THE CARD STORE AND THE CARD CELLS STAY EIGHTY LONG AND GLOBALLY INDEXED. `data-i` carries the global
index and both route handlers reach these two arrays through it, so what the decks changed is which
VIEW renders a card, never what identifies one.

The PROXY, not the object built above: `render()` swapped it in, and only a write through it reaches
the DOM. It is what the rename handler is handed and what the round writes.

THE NESTING WALL, MET A SECOND TIME: the eight cards cannot be an include in the deck template, so they
are a view mounted on the deck's REAL `.cards` div — found by selector for the same reason a card's
`.tags` div is, and empty until this view renders into it.

EIGHT OF THE SAME EIGHTY CARDS, by their GLOBAL indices. A deck decides which through `cardsOfDeck(d)`,
and every per-card formula still takes the index it had before the decks existed — no card is
renumbered 0…7 inside its deck. The card's user's NAME is a function of the index and constant for the
life of the process, but a template field all the same, because one template serves 80 cards. The three
derived values are computed at the state each card is born with, with the spec's formulae exactly as
the two route handlers recompute them.

ALL EIGHT RENDERED BEFORE ANY DETAILS BLOCK IS INSERTED, which is the vpath ordering the second bullet
above depends on: `apply_proxy` → `create_path` runs on each card as this call adds it, and only the
loop below starts shifting a card's siblings. A DECK's own five positions are never at risk of the same
hazard — nothing is ever inserted among a deck's six children, and its `.cards` div is the last of
them.

THE GLOBAL INDEX, and the only place the two numbering schemes meet: `k` is the card's position in ITS
DECK'S view, `i` is the index every formula in the spec takes and the one `data-i` carries into the
route handlers.

BY SELECTOR, not by child index. Mikado has no way to hand a per-item sub-view to the item it belongs
to — `on: { create }` gets the node but not the data, and there is no "give me the element at this
template position" helper — so a card's tag container has to be found in the card. A class lookup is
what the app already knows about itself; a child index is what the hand-written participant uses and
what this one avoids.

FOUR POSITIONS PER CARD, BUILT ONCE, EACH CARRYING ITS OWN USER. `tagsOfCard(i)` is what says which —
`tagUserOf(i, j) = (i + j) % USERS`, so a card's four positions belong to four DIFFERENT users and one
user's forty tags are scattered across forty cards. The initial text is cut to that user's setting at
the mount.

The two documented steps: build the observable array with its initial contents, bind it to a view with
`{ observe, mount }`, then render once because the store is not empty ("it needs a initial render if
store isn't empty"). `pool`/`cache` match the tag view in `apps/mikado/mikado.tsx` exactly, so the
TAG LIST is
the same program in both rows and the delta between them is not the recycle strategy.

THE CARD VIEWS ARE NO LONGER IDENTICAL, and that is a consequence of the derived values rather than a
free choice: `apps/mikado/mikado.tsx`'s card view carries `cache: true` because it is UPDATED —
`update()`
re-applies every dynamic position, so it needs a per-node value cache to write only what moved. This
row never calls `update()`; the proxy already writes exactly one position per assignment, and every
assignment here is a genuine change, so a cache would allocate per card at the mount and skip nothing.
Turning it on to make the two constructor calls look the same would be handing this row a cost with no
work behind it.

THE FAN-OUT, ENUMERATED AT THE MOUNT because Mikado has no place to declare it — see `TMikadoHotTag`.
320 positions dealt into five arrays, ~64 each; the round writes only the ~40 of them that are on
screen.

### `advanceUser` — the round's one operation that is not a click

`roundUserOf(round)`'s setting advanced once, and everything that shows it reassigned: forty tag texts
at depth three, two deck dates at depth one.

IT IS NOT A CLICK AND IT HAS NO BUTTON, so it is not a Mikado route: `AppHandle.flip` says a user's
setting is not changed from inside a card, and giving it a control would put markup in the tree that
says nothing about the shape being measured. It is a closure of THIS mount, which is also the only way
the counter can belong to the app rather than to the module.

WHAT MIKADO DOES AND DOES NOT DO HERE. It does not find the readers — `hot[u]` is the app's own
enumeration, because a `{{= }}` expression is a field of the item being rendered and can never reach a
user record forty cards away. It does not know which positions are on screen — `j < data.count` is one
comparison the app makes, exactly as the zero-abstraction row does, because the observable array will
not say what it removed. What it DOES is the last hop: `cell.tags[j].text = …` names a FIELD, and the
proxy's `set` trap finds the one `Cache` bound to it and writes that node's text. No `update()`, no
index, no node named in this function.

THE WRITE GOES THROUGH `cell.tags[j]` AND NOT `cell.pool[j]`, and that is not interchangeable: the
observable holds a Proxy over the raw pool object (`apply_proxy`, `array.js`), and only the Proxy
carries the DOM sink. A write to the raw object would change the model and nothing on screen, and the
byte gate would be the first thing to say so.

AND THE SAME NUMBER IS READ TWICE, DIFFERENTLY, WHICH IS WHAT THE DECKS ADDED HERE. A tag reads the
setting as a LENGTH to clip its label to; a deck reads it as a PRECISION to format its date with. The
second walk is two entries long and needs no on-screen test, because a deck cannot be off screen — but
the work behind each of its two assignments is `dateTextOf`, six `getUTC*` reads and two table lookups,
against a tag's `slice`.

### The handle

`flip` is the same update round every framework runs: rename every DECK, toggle every details block,
advance every tag list, then advance ONE USER'S SETTING — see `AppHandle.flip` for the order and why it
is part of the contract. THE RENAMES LEAD DELIBERATELY, outermost level first, so a participant that
renders a deck and its cards in one pass cannot fold the deck write into a card's; this row could not
fold them anyway, since a rename is one proxy assignment to a field of the deck's own store and reaches
nothing else.

NOTHING TO FLUSH: Mikado's `render()`, `add()` and `remove()` are synchronous unless the `async` option
or a callback asks otherwise (neither is used here), the proxy writes straight through to the node, and
the observable array applies every operation to the DOM as it is called — the README calls that out as
the reason `transaction()` exists for the cases where you would rather it did not.

`teardown` destroys ALL 91 VIEWS, OUTSIDE IN — the decks', the ten card views mounted on their `.cards`
divs, and the eighty tag views under those.

Then: Mikado's delegation listener is ONE global capture listener on `window`, and it fires for every
click in the document — including the 170 that each of the OTHER participants dispatches in its own
flip, each of which would walk that click's ancestors calling `getAttribute("click")` and find nothing.
Leaving it registered after this app is gone would quietly tax every other row in the table, so it is
removed there; the next mount's factory registers it again.

## The byte gate (`participants/mikado/reactive.tsx`)

A timing comparison against markup that does not match is worthless, so this is the gate: mount the
reference app and this one side by side and diff the HTML, then run one update round and diff again,
then a SECOND update round and diff a third time (the updates are what would expose a different
conditional strategy, a list that grew at the wrong end, or a tag that re-entered its list carrying a
setting its user has since moved past). ALL comments are stripped first, because Exodra marks a
fragment's position with an empty comment anchor and Mikado has no anchors at all — a strategy
difference, not a markup difference. Mikado emits no comments of its own and its per-node bookkeeping
(`_mkp`, `_mkd`, `_mki`, …) lives in expando properties, not attributes, so nothing it does is hidden
by the strip.

NOTHING ELSE IS STRIPPED. This participant is expected to FAIL this gate on the `click="…"` route
attributes Mikado's delegation requires (see above), and the count of them is printed beside the diff
so the failure reads as the finding it is rather than as a mystery.

### The route attribute is not hidden, it is priced

Mikado's event delegation has no route table keyed by node: the attribute IS the registration
(`event.js` reads it back off the target with `getAttribute`). So this participant cannot emit the
reference app's markup — not because it renders something different, but because its way of attaching a
handler ships bytes to the browser.

That is the same kind of difference the SSR benchmark already handles, and it gets the same treatment:
the attributes are removed for the STRUCTURAL comparison, and their number and byte cost are printed on
the success line. Suppressing them silently would let a participant carry payload the others do not and
still read as "identical"; failing the gate on them would drop the only idiomatically-reactive Mikado
row we have. Neither is honest, so: strip and state.

If ANY divergence survives the strip, the gate still fails — this exemption is exactly one attribute
name wide.

### The third stage

A SECOND ROUND, for the reason `apps/stage0/stage0.md`'s gate section gives and for two that belong
to this file
alone. The general reason: one round moves every card in ONE direction, while a second puts a GROW
straight after a SHRINK on the same tag list. The reason specific to this row: a position that was OFF
SCREEN when its user's setting moved is skipped by `advanceUser`, so the text it carries when it is
pushed back comes from the refresh in the `addtag` handler — and nothing before this third diff
exercises that path at all. And the reason the decks added: the second round advances a DIFFERENT user,
so it is the first stage at which a deck's date must NOT have moved — the two decks of round 0's user
keep the text they got, while two others change, which is what catches a fan-out wired to every deck
instead of to an author's.
