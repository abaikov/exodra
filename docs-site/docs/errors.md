---
title: Error codes
sidebar_position: 5
---

# Error codes

You got here from something like this in a browser console:

```text
Uncaught Error: EXO0001 "@exodra/router" "renderer"
```

That is a refusal from an Exodra package, thrown by a **production** build. This page
says what each code means and what to do about it.

## Why the message is four digits

Every refusal in Exodra is written twice — once in full, once as a code:

```text
throw new Error(
    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? 'exoRuntime: "@exodra/router" needs "renderer", and no plugin provides it — add …'
        : `EXO0001 "${plugin.name}" "${slot}"`
);
```

Your bundler substitutes `process.env.NODE_ENV` textually, folds the whole condition to
`false`, and deletes the long string along with it. Refusal prose is a large enough share of
a shipped Exodra package that removing it is worth doing; what it costs is this page.

**The fastest fix is usually not to read this page.** Run the same code in a development
build — `NODE_ENV` anything but `production`, which is the default for `vite dev`, for a
test run, and for a plain `node` process — and the identical refusal arrives as a full
sentence naming the plugin, the port, the event or the schema involved, plus how to fix it.
Every code below is the same check; only the words are missing.

The check itself is **not** stripped. A production build refuses exactly what a development
build refuses — there is no build flag that turns any of these into a warning, and none that
lets the program carry on past one.

## What follows the code

Some codes are thrown alone. Others carry a **payload**: the code, one space, and then
names — never an explanation.

```text
Uncaught Error: EXO0002 "click"
```

A payload is there for the case where re-running the code locally does **not** reproduce
the message. If the pack, the composition or the schema that was refused is assembled from
data — a config file, a plugin registry, a list your host application builds — then your
development run composes something else, and the name is the only thing that says which one
broke. Each entry below says what its payload holds, if it has one.

## How the numbers are handed out

A flat counter, starting at `EXO0001`. The number says nothing about which package spoke —
the entry below it does. It was blocked by package once (`EXO1xxx` for `@exodra/dom`, and
so on) and that is gone deliberately: a code is a permanent public identifier, it outlives
the console log it was printed in, and blocks tied it to which package a refusal happened
to live in. Refusals move between files and packages; the number must not move with them.

A code is never reused. If a refusal is removed, its number goes to the table at the bottom
of this page and nothing new is ever given it — old console logs, bug reports and search
results have to keep meaning what they meant.

The list below is copied by hand from `scripts/exo-error-codes.json`, and
`packages/core/src/tests/errorCodeRegistry.test.ts` fails the build if the two disagree, if a
code is thrown from two places, if a registered code is thrown from nowhere, if a number is
skipped or reused, if a payload is thrown that no entry describes, or if a code reaches a
build without an entry here.

## The codes

### EXO0002 {#exo0002}

A schema declares an event port for a name that the delegated event pack rendering it does
not listen for.

**After the code:** the name of the event port that was refused, in double quotes.

A delegated pack is built from a fixed list of event names and installs one listener per
name on the render root. A port whose name is not in that list has nothing to dispatch it,
so its handler could never fire and the element would be a button that does nothing. Add the
event name to the `createExoDelegatedEvents` call that built the pack, or render this schema with a
pack that covers it. The event name ships because a pack can be assembled from data — a
config, a plugin registry, a list a host application composes — which is the same reason this
check is not stripped in the first place; what a development build adds is the pack's whole
list and the way out.

### EXO0004 {#exo0004}

A schema declares a child element inside an element whose content is text, where no parser will
ever read it back as an element.

**After the code:** the tag of the child element that was declared and the tag of the element it
was declared inside, in that order, each in double quotes.

The refusal comes from `ExoSchemaBuilder.el()`, at schema-build time, and the parent is one of two
lists. RAW TEXT is `script`, `style`, `xmp`, `iframe`, `noembed`, `noframes`, `noscript` and
`plaintext`; RCDATA is `textarea` and `title`. No TAG is recognised between the tags of either
kind, so the child would be characters there and not an element: the server prints the markup and a
browser reading those same bytes builds one TEXT node, which is why the DOM backend — the side that
parses its own output back — refuses the schema while the server happily serves it. One schema, two
pages. If the child is content, move it OUT of that element. If it is meant to BE the text of the
element, declare it with `text()`, which both backends emit verbatim in raw text and escape
identically in RCDATA; in a raw-text element you may instead give the element a children port of
its own, which is the `unsafeHtml` hatch and your boundary to hold. The two tags ship because a tag
can be assembled from data — a schema a compiler emits over a template, an `el()` whose tag came
from a component's own input, a builder adding kids in a loop over a config — so the developer's run
of the same program may declare something else entirely; what a development build adds is the
sentence, the markup both backends would have produced, and the way out.

### EXO0005 {#exo0005}

A schema declares a children port inside an element whose content is text, and that port is not the
element's only child.

**After the code:** the tag of the element the port was declared in, in double quotes, followed by
the number of children already declared before the port.

The refusal comes from `ExoSchemaBuilder.childrenPort()`, at schema-build time, and the element is
one of two lists. RAW TEXT is `script`, `style`, `xmp`, `iframe`, `noembed`, `noframes`, `noscript`
and `plaintext`; RCDATA is `textarea` and `title`. A port in one of these is allowed on purpose — it
is the documented way to put raw content in a script or a style — but only when it is the element's
ONLY child, which is the same condition the string backend calls `ownsElement`. A port that shares
its element has no filler left that both works and agrees: raw markup (`set`, `bind`) already throws
on both backends, because a browser writes markup with `innerHTML` and that would destroy the
siblings, and a nested instance diverges, printed as markup into the text by the server where no
parser will read it back while the browser inserts real element nodes. In raw text a static in front
of the port is also how a closing sequence gets spelled across the two halves and ends the element
on the served page. Give the raw content a port that is the element's only child and put the static
text INSIDE the value, or move the nested instance out of the element entirely. The tag and the
count ship because a schema can be assembled from data — an element that gets a static base only
when a theme is configured, and a port either way, has a development copy with one child and a
deployed copy with two — so the count is the fact the developer's own run does not reproduce.

### EXO0006 {#exo0006}

A schema builder both named a port where it stands and returned a record of ports, and those are two
spellings of one thing.

The returned record is what the wiring factory reads, so every named port missing from that record
would be unreachable: filled by nobody, with no error anywhere. The two spellings are refused rather
than merged, because a name declared on both sides would need a winner and either answer silently
drops a port the author wrote. Name each port where it stands and return nothing, or name none of
them and return the record. A development build names the first port that was declared both ways.

### EXO0007 {#exo0007}

A schema builder finished without declaring a single element, so the schema has no root to render.

Every backend reads the schema's first child as its root element, and a builder that declared only
text, only a port, or nothing at all, leaves that slot empty. This refusal is not stripped from a
production build although the fact it checks is as fixed as the multi-root one beside it: it is also
the type narrowing that makes the root an element for everything downstream, and behind a guard it
would need a cast asserting exactly what the check verifies. Declare one element with el() and put
everything else inside it.

### EXO0008 {#exo0008}

A schema declares static text inside a plaintext element that spells a closing sequence for it, and
nothing closes a plaintext.

plaintext is the one element on the RAW TEXT list that runs to the END OF THE FILE, so those
characters are text, and so is the closing tag the compiler writes after them. It is refused because
the string is the one place an author says out loud that they expect the element to close, and it
does not: every plaintext in a schema already prints bytes that no parser reads back as the tree
that produced them, since the whole rest of the document becomes this element's text. Use pre, whose
text both backends escape and which ends where it is written. A development build prints the
sequence found, its offset, and the start of the run it was found in.

### EXO0009 {#exo0009}

A schema declares static text inside a raw text element that contains the closing sequence of that
element.

The text of a raw text element is written LITERALLY by both backends, because a character reference
in there reaches the source as its own characters and HTML gives raw text no escape mechanism at
all. So this text ends the element where it stands, and the rest of the schema is parsed as markup
after it. Break the sequence across the expression that produces it, or give the element a children
port of its own, which is the `unsafeHtml` hatch and your boundary to hold. A development build
prints the sequence found, its offset, and the start of the adjacent run of static text it was found
in, which is the unit checked because both compilers merge adjacent statics before emitting them.

### EXO0010 {#exo0010}

A schema declares static script text whose closing sequence is inert because an earlier unclosed
comment armed the double escaped state, and it is refused anyway.

This is a deliberate refusal of a run that works as written. An earlier unclosed opening comment
plus script start has already put the tokenizer into the SCRIPT DATA DOUBLE ESCAPED state, where the
closing sequence in this text closes nothing. It is kept because accepting a closing script sequence
inside a script would rest the whole element boundary on this package's own tokenizer, which is a
far larger claim than refusing one string. Break the CLOSING sequence to get past it, and not the
opening one instead, which would leave that same closing sequence in the merely ESCAPED state where
it really does end the element. A development build prints the sequence, its offset and the start of
the run.

### EXO0011 {#exo0011}

A schema declares static script text that enters the tokenizer's script data double escaped state
and never leaves it before the text ends.

An unclosed opening comment earlier in this text put the tokenizer into script data ESCAPED, where a
following script start tag plus a space, a slash or a greater-than arms the DOUBLE escaped state. In
that state a closing script sequence does not emit an end tag at all: it only walks back one level.
So the end tag the compiler writes after this text closes nothing, and every byte of the document
after it is consumed as JavaScript source, which is a whole-page takeover from a run that contains
no closing sequence at all. Close the comment before the end of the text, or break the script start
so the tokenizer never sees it, or give the element a children port of its own, which is the
`unsafeHtml` hatch and your boundary to hold. A development build prints the sequence that armed the
state, its offset, and the start of the run.

### EXO0012 {#exo0012}

A schema declares a text port inside a raw text element, where the two backends cannot write the
same bytes.

The server escapes a text value and the HTML serialiser does not escape text in these elements, so
the two would print different bytes, and the escaped one is broken anyway: a raw text element
decodes no character references, so an escaped less-than reaches the source as those four
characters. Writing it raw instead is not a fix either, because nothing can escape the closing
sequence and a value carrying one would end the element and ship markup of its own. If the content
is genuinely raw, give the element a children port of its own, which is the `unsafeHtml` hatch, and
own the escaping there. A development build names the element.

### EXO0013 {#exo0013}

A schema declares an element whose tag is not a legal element name.

**After the code:** the element name that was refused, in double quotes.

A tag reaches the markup VERBATIM on every backend and cannot be escaped, since an escaped tag is
not a tag. So a name carrying a greater-than, a space or a quote does not make an oddly-named
element, it makes MARKUP, and a name that closes the tag and opens an img with an onerror ships a
working handler from the server AND in the browser. Legal is narrower than HTML's own custom-element
rule on purpose: a letter, then letters, digits or hyphens, which covers div, svg, feGaussianBlur
and my-widget. The name ships with the code because a tag can be assembled from data, which is the
bug this most often is; check it against the elements you mean to allow before it reaches el().

### EXO0015 {#exo0015}

A schema declares a value port on a select or an output element, and the server can print no
attribute that carries it.

Both compilers cut the markup exactly once per port, in numbering order, so a port's writer can only
emit bytes at its own slot. For a select, the markup that says which option is chosen is selected on
the OPTION, a different element and later in the document than this port's slot, so the server
prints nothing and serves the FIRST option while the client render shows another: the wrong page
until the bundle arrives, and forever with JavaScript off. Say it on the options instead, giving
each option a selected port filled with whether the model equals that option's value, which also
works when the options are a list. For an output, the value IS the text content and HTML gives it no
value content attribute anywhere, so write the text with textPort() instead; an output is not
user-editable, so its text is its value on both backends and nothing can drift.

### EXO0016 {#exo0016}

A schema names a port `__proto__`, which cannot be filed in the record a wiring function reads.

The record is a plain object literal, so assigning `__proto__` on it calls the inherited setter and
REPLACES THE PROTOTYPE instead of filing the port. The port would not be in the record at all, the
wire reading it would get whatever the prototype chain has, and nothing would throw. The name is
fixed, so nothing is appended to the code. Give the port any other name.

### EXO0017 {#exo0017}

A schema declares two ports with the same name, and the record a wiring function reads can hold only
one of them.

**After the code:** the port name that was declared twice, in double quotes.

The record is one object, so the second declaration is an assignment over the first and the losing
port becomes unreachable: still numbered, still compiled, filled by nothing, and nothing thrown. The
type layer cannot catch it, because a key is a key however many calls claim it. Names are per SCHEMA
and not per element, so two elements declaring the same thing still need two names. The name ships
with the code because a port name can be assembled from data, so the developer's own run is not the
run that decides it.

### EXO0018 {#exo0018}

A connector call that fills children was handed a port that is not a children port.

A children fill needs a place in the tree to put instances in. A text port's value is written as
TEXT, escaped into the markup on the server and set as text in the browser, and an attribute port is
not a place in the tree at all, so neither can hold children. Declare the position with
childrenPort() where the children stand, and fill that port instead. A development build names the
backend and the method that was called.

### EXO0019 {#exo0019}

A component built with createExoStatic declared ports, and a static component has no wiring to fill them.

A static component arms nothing at all, so those ports would stay empty for the life of the page with no error anywhere. Build a machine with createExoMachine and fill them with withExoWire, or drop the ports. A development build prints how many ports the schema declared.

### EXO0020 {#exo0020}

A schema spells an attribute className, and this renderer writes the name the markup actually
carries.

React spells it that way because class is a reserved word in a JSX property position. Here an
attribute name is a plain string or an object key, so nothing stops you writing the name the markup
carries, and accepting both spellings would make one attribute answer to two names for no gain.
Write class.

### EXO0021 {#exo0021}

A schema declares an attribute or a port whose name is not a legal attribute name.

**After the code:** the attribute name that was refused, in double quotes.

A name is written into the markup VERBATIM and cannot be escaped, because an escaped name is a
different attribute. So a name carrying a quote, a space, an equals, a less-than or a greater-than
does not produce an oddly-named attribute, it produces MARKUP: a name that closes the value and
opens an onclick ships a working handler from the server AND in the browser, since both backends
print the same bytes. Legal is an allowlist and not a blocklist, because the same string is also
parsed as markup when the DOM plan is compiled: a letter or an underscore, then letters, digits,
underscores, dots, colons, dollars or hyphens, which covers data-id, aria-label, class, viewBox and
xlink:href. It throws rather than dropping the port, because a port that emitted nothing would still
hold the port number both backends index their plans by, moving every later value onto the wrong
element. The name ships with the code because it can come from data, which is the bug this usually
is; build it from a fixed prefix and a value you have checked.

### EXO0022 {#exo0022}

A schema declares a port whose markup spelling is already carried by a static attribute on the same
element.

**After the code:** the tag of the element and the markup spelling they collide on, in that order,
each in double quotes.

There is no element with two attributes of one name: the server would print both and a browser would
keep the FIRST, while the DOM backend's setter would overwrite the static. The same schema, two
different pages, and a hydration mismatch between them. It is refused rather than resolved, because
the port wins is an artefact of fill order and stops being true the moment a wire skips the port.
The comparison is between markup SPELLINGS and not raw names. Keep the port and give the default
value to the wire, or drop the port and keep the static. The tag and the spelling ship with the code
because either can be assembled from data.

### EXO0023 {#exo0023}

A schema declares two ports whose markup spellings are the same attribute on one element.

**After the code:** the tag of the element and the markup spelling they collide on, in that order,
each in double quotes.

The server prints both and a browser keeps the first, while the DOM backend has one attribute that
both setters write, so the LAST fill wins: two different pages from one schema. Event ports are
exempt from the comparison because they write no markup on any backend, so their names cannot
collide with an attribute. Use one port and decide the value in the wire. The tag and the spelling
ship with the code because either can be assembled from data.

### EXO0026 {#exo0026}

The createInitialState option of createExoMachine was handed a value instead of a function that makes one.

This is the one place the shared-object bug can be caught. A value handed here would be ONE object shared by every instance of the component, each instance seeing every other instance's writes, and nothing downstream could tell that apart from intent. createInitialState takes a function so that each instance gets its own value. Wrap the value in a function that returns it.

### EXO0029 {#exo0029}

A schema being hydrated declares a port on a static element that stands between two children ports,
where the adoption walk cannot reach that element.

In a component shaped like h3, then child list a, then hr, then child list b, then footer, the hr is
short by child list a's rows counted forward and by child list b's rows counted back, so this port
would be wired onto one of a's list rows with nothing in the markup to show it. The child list
BEHIND such a static is recovered from the one in FRONT of it when that one adopts; a port on the
static itself cannot be, because a wiring function is free to fill it first. Give one of the two
child lists its own element, or move the port off the separator. A client render of the same schema
is unaffected: only adoption is refused, and the refusal is raised while the hydrate plan is
compiled rather than while the DOM plan is.

### EXO0030 {#exo0030}

A page asked a DOM backend to hydrate and that backend was never composed with withExoHydration.

Hydration is a plugin pack, not a built-in, so a backend that was not composed with it holds no
adopting surface at all. Compose it once, at module level, as const backend = withExoHydration(new
ExoDomBackend()), and render from the same object you hydrate with. Without this refusal the first
c.set of an adopted page raises a TypeError on a method name from inside a compiled wire, which says
nothing about hydration or about composition.

### EXO0031 {#exo0031}

A children port on a hydrating page was filled before the child list standing in front of it on the
same element had been filled.

Adoption is eager and reads the server's own nodes, so a child list standing behind another one only
learns where its markup begins once the one in front has claimed its rows. Fill the children ports
of one element in DOCUMENT ORDER, and fill every one of them, remembering that an empty list is a
fill. A client render and the server accept any order; only adoption cannot, because no table can
hold the landing of a list whose start depends on how many rows the previous list took.

### EXO0032 {#exo0032}

The walk that adopts a served page reached a position where the server's markup has no element at
all.

Hydration creates nothing, so the page was rendered from a different schema, a different wiring or
different data than the one running here. Carrying on would wire the NEXT element as this instance,
which puts data on the wrong line instead of raising an error. The site names what it was looking
for as a constant string, because it runs once per adopted instance and must not allocate on the
path that does not throw.

### EXO0033 {#exo0033}

A children port that shares its element with other children was filled with set on a page being
hydrated.

The only way to write raw markup is innerHTML, which would destroy the other children. Nested
instances go through one, list or childList; raw markup, the unsafe html hatch, needs a port that is
its element's ONLY child. The server and a client render refuse this same program by design, and the
development message is split at the same place as the client render's so that one refused program is
described one way wherever a developer meets it. It names no tag, unlike the client-side refusal,
because a silenced port is retargeted to the instance root and the only tag reachable would be the
wrong one.

### EXO0034 {#exo0034}

The server's markup at one position of a children port is not the element the child standing there
was built from.

The walk that wires an instance is compiled against the schema and inspects nothing, so it cannot be
aimed at a different element. Either the page was served by a different build than the one running
here, or the wiring function assembles its children in a different order from the one it places them
in, and a hydrating build takes the server's elements in document order. The development message
carries the shape checker's own account of the disagreement, of the expected span, found b kind;
that is a sentence rather than a name, so it does not follow the code.

### EXO0035 {#exo0035}

A children port could not be reconciled on a server-rendered page because another children port stands directly behind it.

While hydrating, a child list opens an adoption cursor over the rows the server printed and each
build adopts the next one. That needs the list's end, and where another child list stands behind
it with no static element between them, the first row of the one behind cannot be told from a
surplus of this one. Put a static element between the two child lists, adopt with c.list(port,
component, count), which is told how many rows to take, or render this component on the client
instead of hydrating it.

### EXO0036 {#exo0036}

A node that was not made by createExoNode was placed in a children port.

What arrives is a bare Element with no mount, no unmount and no disposers, so it carries no
lifecycle of its own and a list cannot know when to end subscriptions it never made. Children placed
in a children port must come from createExoNode. Without this check the page gets a DOM exception about
insertBefore's first parameter from inside a diff, naming nothing. The message carries no runtime
value, because the offending node is by definition not one of ours and there is nothing of it this
function may read.

### EXO0037 {#exo0037}

A schema put a port among an element's attributes that has no name, where only attribute and event
ports belong.

The DOM plan writes an attribute by name, so a nameless port among the attributes has nothing to
write to. The check is not strippable: it is what narrows the name to a string for the attribute
writer. Declare the port with a name, or move it to where it belongs, which for content is a text
port or a children port declared inside the element.

### EXO0038 {#exo0038}

A schema declares children or a content port inside a void element, which cannot hold either.

The parser closes a void element itself and the serialiser prints no end tag, so anything inside it
is reparented as a SIBLING. The string backend would print a closing tag and a browser re-parses
that into a second element of the same name, so the two backends would serve different pages from
one schema. Move the children to a container element.

### EXO0039 {#exo0039}

A schema gives one element both a content port and static children.

A content port stands for EVERYTHING inside its element, so the static children vanish from the
markup while their ports keep the indices this plan addresses by, and every setter after them is
built against the wrong element. Move the static children into the wiring, or drop the port.

### EXO0040 {#exo0040}

Part of a schema whose root is SVG content broke out of the SVG when the prototype markup was
parsed.

The HTML parser closes foreign content the moment it meets an HTML tag it knows, among them div, p,
table and span, and a browser does the same to the markup the server sends. Put HTML inside a
foreignObject, which is the one element that may hold it. The development message also prints the
first bytes of the markup the schema produced, so that the offending tag can be seen without
rebuilding the schema by hand.

### EXO0045 {#exo0045}

A text port whose writer stores into a Text node has no Text node in the parsed prototype.

The writer has nothing to store into, which means the parser reshaped this element. A text port
emits a placeholder character into the prototype markup precisely so that a Text node exists to
cache and mutate; a parse that dropped or merged it away leaves the writer addressing nothing. The
development message prints the first bytes of the markup the schema produced.

### EXO0046 {#exo0046}

A port that the DOM plan can only address by name reached the compiler without one.

The name is refused rather than coerced: the throw is what narrows it to a string for the writer
built from it. A port declared with no name cannot be addressed as an attribute, a property or an
event, so there is nothing for the plan to compile. Declare the port with the name it is meant to
write.

### EXO0047 {#exo0047}

A children port that shares its element with other children was filled with set during a client
render.

The only way to write raw markup is innerHTML, which would destroy those other children. Nested
instances go through one, list or childList; raw markup, the unsafe html hatch, needs a port that is
its element's ONLY child. This refusal is what a children port's setter slot holds when the port
shares its element, so that the slot is never empty and set is never a call on undefined; the
hydrating twin of it is split at the same place on purpose.

### EXO0048 {#exo0048}

A subscription was made with neither an owning child nor an ambient teardown scope to end it.

A subscription nothing can end is a leak that looks like it worked. A child beats the ambient scope
whenever there is one, because a child can leave while its render goes on and its subscriptions must
go with it, which is why the owner is passed down rather than read from the module. With neither
owner available, wrap the render in exoTeardownScope and keep the disposer it returns.

### EXO0049 {#exo0049}

A ref port was filled with set or bind, and a ref port has no writer at all.

A ref port exists ONLY so that a wire can obtain the element, to observe it, focus it or measure it,
and that is what the connector's port node reader hands back. In TypeScript the call does not
compile, so reaching it means the port arrived from untyped code. If the element needs a VALUE
written to it, declare an attribute port, a text port or an event port beside this one: an element
may carry as many ports as it likes. The refusal fills the setter slot rather than leaving a hole,
because the table is typed and a hole would mean a guard on the hottest line in the package.

### EXO0050 {#exo0050}

An event port was filled with an action descriptor and no subject, where the connector's on call
takes port, action and subject.

**After the code:** the name of the event port whose descriptor was filled, in double quotes.

A descriptor names a property, which is what lets ONE descriptor serve every row; a descriptor that
carried its own row would be a closure with extra steps. The subject is usually the row's item. It
is refused when the port is FILLED and not when the user clicks, because left to dispatch a
forgotten third argument surfaces as a button that throws in production, days later and far from the
wire. The event name ships because a pack can be assembled from data, so the developer's own run
need not reproduce it.

### EXO0051 {#exo0051}

A delegated event pack was asked for an event name that does not bubble, so a listener on the render
root would never see it.

**After the code:** the name of the event the pack was asked to delegate, in double quotes.

Every descriptor for that name would be dead. Use the bubbling twin where there is one, focusin and
focusout for focus and blur, or leave the name out of this pack and let it keep the direct strategy.
The check is asked when a schema's port is attached rather than when the pack is built, which
refuses fewer working programs at the cost of never reporting a dead name in a pack's list. It is
NOT stripped in production: the argument for stripping holds for a literal list written at module
level and not for a pack assembled from DATA, a config or a plugin registry, where the name is not
settled before the program ships. The name follows the code for that same reason.

### EXO0052 {#exo0052}

A delegated event pack was asked for a high-frequency event without the option that says the cost is
intended.

**After the code:** the name of the high-frequency event the pack was asked to delegate, in double
quotes.

This is not the non-bubbling refusal: the event does bubble and delegating it WORKS. It is refused
because of what it costs. The root's listener runs on every one of these, and each run walks from
the event target up to the root reading one property per ancestor, at the pointer's sampling rate
rather than when a person acts, for as long as the pointer is moving and whether or not anything on
that path has a handler. Under the direct strategy the same stream reaches one listener on one
element and stops. If a delegated high-frequency event is what you mean, a drag served by ONE
listener on a root instead of one per row, say so in the call by passing allowHighFrequency true;
otherwise leave the name out of this pack and let it keep the direct strategy. The name follows the
code because a pack can be assembled from data.

### EXO0053 {#exo0053}

An element handed to the foreign-child door is already in a tree, so something else owns it.

The first list that placed it would silently take it out of there. A foreign child must be an
element nobody has placed yet: create it, or let the foreign renderer create it, and hand it in
detached. If you really mean to take over markup that is already on the page, calling remove on the
element first is what writes the theft down where it happens. A parent is the evidence here, and it
is a HEURISTIC rather than a proof of ownership; the development message names the parent's tag.

### EXO0054 {#exo0054}

An element handed to the foreign-child door already carries an Exodra child lifecycle from an
earlier call.

Making a second one for it would leave the element and the list that holds it pointing at different
objects. Keep the child that the first call returned and place that one. A child that leaves a list
and comes back is moved, not re-adopted, so this is the narrow refusal of an element the door
recognises in its own set rather than a judgement about where the element currently stands.

### EXO0055 {#exo0055}

A foreign child's mount hook moved the element out of the parent the list had put it in.

Only removal climbs; every insertion and every anchor in the list addresses this element directly,
so the next child inserted beside it would throw a DOM exception from inside a diff and leave the
list half-applied. Render INTO the element instead of moving it, and if the foreign renderer needs a
wrapper, pass the wrapper to the foreign-child door and let it render inside that.

### EXO0056 {#exo0056}

One foreign child is being placed while a list already holds it, which would put one element in two
positions.

One element cannot be in two places, and both lists would go on holding it: the first one to drop it
runs your unmount hook on a widget that is still on screen in the other, and the second drop runs it
again. Make one foreign node per position. What a caller holds is the foreign node, and holding it
in two children ports, or twice in one array, is holding one element twice. It is refused at the
SECOND placement, which is the first moment anything can tell.

### EXO0057 {#exo0057}

A children port that shares its element with other children was filled with set while rendering to a
string.

The DOM backend can only write raw markup with innerHTML, which would destroy those other children,
so printing it here would render on the server and throw in the browser. Nested instances go through
one, list or childList; raw markup, the unsafe html hatch, needs a port that is its element's ONLY
child. The server refuses the same program its client twin does, which is what keeps one schema from
having two meanings.

### EXO0058 {#exo0058}

A ref port was filled with set or bind while rendering to a string.

A ref port has no writer on any backend. It exists only so that a wire can obtain the element, which
is a browser-side capability and prints nothing on the server. Declare an attribute port or a text
port if a value is meant to reach the markup.

### EXO0059 {#exo0059}

An attribute port reached the string backend's writer factory without a name.

An attribute is printed by name, so a nameless attribute port has nothing to print. The throw is
what narrows the name to a string for the writer built from it. Declare the port with the attribute
name it is meant to write.

### EXO0060 {#exo0060}

A schema declares content or children inside a void element, and the string backend refuses to print
it.

The parser closes a void element for you and prints no end tag, so this backend would emit a closing
tag and a browser would re-parse it into a SECOND element of the same name, while the DOM backend
drops the content instead: one schema, two pages. Put the content in a sibling element. This check
deliberately SHIPS while the other three guards in the same compiler stay stripped, because the
other three compare two pieces of our own code walking one schema, where a user's machine cannot
produce a disagreement the first local compile did not.

### EXO0061 {#exo0061}

A port was numbered by the schema and never reached by the terminal backend's plan compiler, and a
wire then filled it.

The two walks disagree about the shape of the schema, which means the plan holds no writer for that
port. A gap read as undefined would instead throw that undefined is not a function from inside the
connector's set, naming nothing, so the missing entry is filled with a refusal that says which port
index is unaccounted for.

### EXO0062 {#exo0062}

A port carries an index outside the range of port numbers the schema declared.

Either the schema was not closed, so its ports were never numbered, or the root handed to the
compiler was not the numbered one. Everything in this backend is indexed by the port's own index, so
an index outside the range would write past the end of the writer table.

### EXO0063 {#exo0063}

A schema declares content or children inside a void element, and the terminal backend refuses it.

This backend has no parser and would happily hold the content, and it refuses anyway: a schema must
be accepted or refused identically by every backend, or one schema means two things. The shared
refusals are asked here even though nothing in a text tree needs them.

### EXO0064 {#exo0064}

A port of a kind other than a children port stands among an element's children.

Only a children port belongs among an element's children; an attribute port or an event port belongs
in the element's attributes, and a text port is declared as the element's content. The development
message names the kind that was found.

### EXO0065 {#exo0065}

The connector's set was used on a port kind that has no value to write in a text tree.

An event port is filled with the connector's on call; a children port is filled with one, list,
childList or keyedList; a ref port is read through the port node reader rather
than written at all. The development message names which of the three was refused and which call to
use instead. The refusal fills the writer slot rather than leaving a hole, because the table has one
entry per port.

### EXO0066 {#exo0066}

An attribute port reached the terminal backend's writer table without a name.

An attribute is stored by name in this backend's attribute record, so a nameless attribute port has
nothing to store under. Declare the port with the name it is meant to write.

### EXO0067 {#exo0067}

A port-writer table was asked for a port kind it holds no entry for.

A backend or a plugin may supply its own port-writer table, and this backend looks a kind up in that
table rather than running a chain of comparisons, so a kind the table does not answer is answerable
without editing the package. A backend supplying its own table must answer every kind its schemas
can hold. The development message names the kind that was asked for.

### EXO0068 {#exo0068}

A children port belonging to a different schema than the one being wired was handed to a fill call.

A port may only be filled by the wire of the component whose schema declared it. A port is just an
object with an index on it, so nothing in the shared surface can catch this by type; the instance
catches it by finding no region at that index. The development message names the call and the port's
index.

### EXO0069 {#exo0069}

An event port with no name was handed to the terminal backend's listener call.

A listener is stored under the event's name, so a nameless event port cannot be listened for.
Declare the port with the event name it is meant to answer to.

### EXO0071 {#exo0071}

A component asked for the router with injectExoRouter and nothing standing above it had provided
one.

Exodra router: nothing above this component provided a router. Call provideExoRouter(c, router) in
the wiring of a component that stands above it — the root of the page is the ordinary place — and do
it on the server as well as in the browser, since the same wire runs on both. The refusal happens
where inject() would otherwise answer undefined, because with no router an outlet shows nothing and
a link cannot resolve an href, and both of those would fail later with nothing naming the missing
provide.

### EXO0072 {#exo0072}

createExoBrowserHistory was called where there is no window to read a location from and no history
to push into.

createExoBrowserHistory requires a browser window. It reads location.pathname, location.search and
location.hash and it pushes through the History API, so with neither an options.window nor a global
window there is nothing for it to be a history OF. This is the refusal a server render hits when the
browser history is built at module scope: build it inside the browser entry, or pass the window
explicitly, and give the server createExoMemoryHistory instead.

### EXO0073 {#exo0073}

A lazy route loader resolved to a module export that is not a page component, caught while a caller
is still awaiting the preload.

Exodra router: a lazy route resolved to something that is not a page component. A page is a machine — the value createExoMachine, or a decorator over it, returns — and the module this loader imported exports something else (the previous runtime's h() schema, or a module with no default). It is refused inside preloadExoPage, where a caller is awaiting and can see it, rather than inside a subscriber with no stack pointing at the route table.

### EXO0074 {#exo0074}

A matched route carries a component that is neither a page nor a lazy loader, so the route boundary
has nothing it can render.

**After the code:** the path of the route whose component was refused, in double quotes.

Exodra router: the route has a component the schema core cannot render. A page here is a machine — the value createExoMachine, or a decorator over it, returns — or an exoLazy() loader that resolves to one. The route path ships because a route table is routinely assembled from data — a config, a manifest, a per-tenant list — so the developer's own run may hold different routes entirely, and a bare code would name none of them.

### EXO0077 {#exo0077}

A component assembled by withExoComputedMachine declared its machine in a way the machine cannot
hold, and the assembly is refused at wire-build time.

This is the one code for every refusal withExoComputedMachine makes while assembling a component's
machine, and a development build names which one: mounted() was declared twice where it is one
field; or a field of this component is read by none of its derivations, fills and effects, so
nothing could ever wake it and it is a field that is written and never observed. Both are structural
mistakes in how the component was declared, so re-running the same module in development reproduces
the same message word for word.

### EXO0078 {#exo0078}

A wiring block body returned without calling done(), leaving the block unarmed for the instance it
was building.

exoWiring: this wiring block never called done(). Call done() at the end of the body, after the last
declaration. A block that never armed compiled nothing, filled nothing, and no transition of it can
commit — every symptom is a component that renders empty and never moves, with nothing in the output
pointing back at the missing call, which is why the block refuses here instead of letting the
instance run.

### EXO0079 {#exo0079}

A wiring block declaration disagreed with the block's own rules or with what the first instance of
the same component declared.

This is the one code for every refusal an ExoWiringBlock makes, and a development build names which
one. A block is closed once it arms, so anything declared after done() is refused, and done() itself
may be called only once. Everything else is the same rule seen from a different side: every instance
of a component must declare the same fields, derivations, fills and effects, in the same order, with
the same read lists and the same kinds, because the first instance is what compiled the shared
program and a later instance that declares something else has no slot to put it in. The refusals
name the slot, what the first instance declared there and what this one declared instead — including
mounted(), which is one field and must be declared in one place or in none. All of it is a property
of the component's own code, so the same run in development reproduces the message exactly.

### EXO0080 {#exo0080}

A machine specification was rejected while compiling it into a program, at module load, before any
instance exists.

This is the one code for every refusal compileExoMachine makes, and everything is refused there — at
module load — because a flat description has nowhere to put a run-time guard that would not be paid
on every commit forever. A development build names which rule was broken: more enode fields than the
ceiling; more derivations and bodies than share one pending word; a derivation reading a field past
the number declared; a DERIVATION that reads nothing, so nothing could wake it (a BODY that reads
nothing is accepted); a port still at -1, meaning the machine was compiled outside the wire factory
that numbers ports; a store into a field past the number declared, or into one declared with no
writer; and an order that is not topological, where a derivation stores a field that a derivation
declared at or before it already reads. The message names the offending derivation and, for the
ordering rule, every derivation that reads the field too early.

### EXO0081 {#exo0081}

A machine derivation was pointed at an event port or a ref port, neither of which a derivation is
able to fill.

withExoComputedMachine: a derivation cannot fill an EVENT port — use on(port, handler) inside withExoHandlers; and a derivation cannot fill a REF port — use portNodeReader() to READ the node. A derivation produces a value and stores it, which is what attribute, text and children ports accept. An event port is a place a handler is installed, not a place a value lands, and a ref port exists so the wire can read the node back out; filling either from a derivation has no meaning the backend could carry out.

### EXO0082 {#exo0082}

A machine field was numbered outside the range a single word of bits can address, refused where the
number is written.

exoFieldBit refuses a field index outside 0..EXO_MACHINE_LIMIT - 1. It is a checked spelling of
`1 << index`, so the ceiling is refused where the number is WRITTEN rather than at the first commit
that quietly ran the wrong derivation: `1 << 31` is negative and `1 << 32` is 1, so a component past
the cap would get a bit belonging to another field and wake something other than itself. A machine
that needs more fields than the cap needs to be split into more than one machine.

### EXO0083 {#exo0083}

A bound transition was dispatched into before the wiring block it belongs to had armed, so there is
no instance to apply it to.

This transition fired before its wiring block armed; call done() at the end of the wire, before
anything can dispatch into it. A bound transition applies its change to the block's instance and
then settles it, and until done() runs there is no instance and no settler — so the alternative to
refusing is a change written nowhere and a commit that never happens. Anything that can dispatch —
an event handler, a subscription, a timer started in the body — has to be reachable only after the
block arms.

### EXO0085 {#exo0085}

A JSX element reached the runtime jsx factory, which means the module carrying it was never put
through the schema compiler.

Exodra schema JSX reached the runtime, which means this module was never compiled. Add
@exodra/babel-plugin-schema to the build (or babel-preset-exodra with mode: 'schema'): it replaces
every exoJsx(…) with a module-level schema declaration, and there is no runtime here that could
interpret an element. The factory exists at all so that a tsc emit resolves and fails with a
sentence instead of a missing export; there is deliberately no Fragment export, because the compiler
refuses one and an unresolved `<></>` is the honest end.

### EXO0087 {#exo0087}

A schema builder was used after the build that created it had finished. The builder is one cursor
that moves, and a kept one points wherever the build left it.

The builder is ONE object that walks down into each element and back up again, so a reference kept
past the callback it was handed to stands wherever the cursor stopped, not where it was captured.
After the build it stands in a schema whose ports are already numbered: the element would reach no
plan and the port would be filled by nobody, with no error anywhere. Declare everything inside the
build callback, and call fork() where two positions are genuinely needed at once.

### EXO0088 {#exo0088}

A schema cursor was written to after the element callback it was handed to had already returned. The builder is one cursor that moves, so it now stands somewhere else entirely.

**After the code:** the tag of the element whose callback the cursor was handed to, in double quotes.

The builder walks down into each element and back up again, so a reference stashed in one element’s callback and used from a later one writes into whatever element the cursor stands on now, not the one it was captured in. The element or the port lands in the wrong parent, with no error anywhere. Declare everything inside the callback it belongs to, and call fork() where two positions are genuinely needed at once. This refusal exists only when withExoSchemaAsserts is composed in.

### EXO0089 {#exo0089}

withExoSchemaAsserts is not the outermost decorator on a schema, and the decorator composed outside it would see only the top-level calls.

The asserting cursor hands every element callback a fresh guarded cursor of its own, which replaces on receiver whatever a decorator composed outside it put there. That outer decorator would then see the top-level calls and none of the nested ones, silently, and half a decorator is worse than none. Compose the asserts last: withExoSchemaAsserts(withYourOwnDecorator(cursor)).

### EXO0090 {#exo0090}

An event port was filled with set or bind, and a handler is not a value an event port holds.

Use the connector's on call, on port handler subject, which reaches the events pack this
composition chose; a handler stored as an attribute or as text would print the source of the
function and never fire. In TypeScript this call does not compile, so reaching it means the port
arrived from untyped code. The refusal fills the setter slot rather than leaving a hole, because on
no longer reads that table at all: it calls the pack's attach with the port's datum, so the only
thing that can arrive at the slot is a fill door that mistook an event port for a value port.

### EXO0097 {#exo0097}

createExoDomSchema was handed a JSON declaration whose port carries no name, and the kind it was
written as needs one.

**After the code:** which of the two kinds was missing its name.

An attribute port IS the attribute it names and an event port IS the event it names, so a JSON declaration that
wrote one of those without a name describes nothing a writer could be chosen for. A JSON declaration comes out
of exoDomJsonDeclaration, which reads the names off a compiled schema, so a nameless port here means the
JSON declaration was written or edited by something other than that function.

### EXO0098 {#exo0098}

createExoDomSchema parsed the JSON declaration's markup and got no element back.

A schema holds ONE root element — the compile that produced the JSON declaration refused anything else — so its
markup must parse to exactly that. An empty string, a comment, bare text or a fragment of several
roots all land here, and all of them mean the JSON declaration is not one exoDomJsonDeclaration produced.

### EXO0099 {#exo0099}

A machine whose declaration carries no DOM JSON form reached a backend that has no compiler composed
into it.

render under withExoBuiltSchemas, and one/list/build on any backend, turn a machine's declaration
into a schema. With no compiler composed, the only way to do that is the JSON form a build writes
onto the declaration, and this declaration has none. Either compose withExoCompiler(new
ExoDomBackend()), or declare the component with exoJsx under @exodra/babel-plugin-schema, which
compiles the declaration at build time and writes that form onto it.

### EXO0100 {#exo0100}

c.foreign(...) was called while hydrating on a backend that did not compose EXO_DOM_FOREIGN_VOCABULARY.

foreign is a pack, not a door every backend answers. The hydrate pass hands the call to the
backend's own foreign, so the backend the page hydrates through needs the pack as much as the
one it renders through: compose EXO_DOM_FOREIGN_VOCABULARY onto it.

### EXO0101 {#exo0101}

withExoWire was handed a machine that already has a wire, and a machine holds exactly one wire.

A machine has one wire: the transition the system runs after createInitialState and that can be run again with new params through wireExoNode. Two would leave it unclear which one a re-run calls, so put both bodies in one withExoWire.

### EXO0102 {#exo0102}

overrides() was handed a name that is not a transition of this machine.

An override table is indexed by the position withExoTransitions gives each name it declares, so only a name declared by withExoTransitions on this machine, or on a machine it was composed from, can be overridden. Declare the transition with withExoTransitions first, or call overrides() on the machine that declared it.

### EXO0103 {#exo0103}

c.one or c.list was called from a wire that wireExoNode re-ran on a live instance.

c.one and c.list place their children once, while the instance is armed, so a second call would
stack a second set beside the first. Call them in createInitialState, or place children with the
children port methods (createExoNode, appendChild, insertChild, moveChild, removeChild), which any
wire, transition or effect may call at any time.

### EXO0104 {#exo0104}

nextExoId was called where nothing above the component called provideExoIds.

Ids are counted per render, so the counter has to be created by the render itself: call
provideExoIds(c, prefix) in the createInitialState of the root, on the server and in the
browser, and every nextExoId below it counts from the same start on both sides.

### EXO0105 {#exo0105}

A schema's markup function produced more than one root element.

**After the code:** the number of roots the cursor produced.

A schema is ONE element: every root after the first would be dropped from the markup and its ports
would keep the -1 they start with. Put siblings inside the root, with a children port where a run
of children stands, or make each top-level element its own component.

### EXO0106 {#exo0106}

A schema's markup function minted a different kind of port at a position than it did when its ports
were numbered.

Port numbers are handed out in call order, so a markup function must make the same calls in the
same order every time it runs. A branch that declares an attribute port on one run and a text port
on another hands the wiring a number that means something else.

### EXO0107 {#exo0107}

exoPorts was given a declaration whose value is not one of the seven port kinds.

exoPorts numbers ports in declaration order and mints each one from its kind mark, so every value
in the declaration has to be one of EXO_PORT_ATTR, EXO_PORT_ATTR_STRING, EXO_PORT_ATTR_TOGGLE,
EXO_PORT_TEXT, EXO_PORT_CHILDREN, EXO_PORT_EVENT or EXO_PORT_REF. Anything else would mint a port
the wiring cannot write to.

### EXO0108 {#exo0108}

A schema contains SVG or MathML markup and the DOM backend rendering it was composed without
withExoForeignNamespaces.

**After the code:** the tag or namespace that was refused, in double quotes.

The SVG and MathML tables — tag and attribute case adjustment, namespaced attributes, HTML
integration points — are a pack, so a page with no SVG links none of them. Compose
withExoForeignNamespaces once, at module level, on the backend that renders a schema with svg, math
or an SVG-only element in it.

### EXO0110 {#exo0110}

A schema built from a JSON declaration has an attribute on an SVG or MathML element, and the backend
was composed without withExoForeignNamespaces.

**After the code:** the namespace of the element whose attribute was refused, in double quotes.

createExoDomSchema decides which attribute a port writes from the element's namespace, and the SVG
and MathML attribute tables are a pack. Compose withExoForeignNamespaces on the backend that builds
a schema with SVG or MathML in it.

## Retired codes

Numbers that were spent by a refusal that no longer exists. Nothing new will ever be given
one of these; if you are holding a console log with one in it, this table is the answer.

| Code      | What it was                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXO0001` | A plugin declared a need for a plugin slot that no plugin in the composition provided. The named-slot runtime it belonged to was deleted: a backend is now an object that holds each plugin interface in a plain field, so an unprovided name is a missing method at compile time, not a boot refusal.                                                                                                                                                                                                                                                                                                            |
| `EXO0003` | An application asked a composed runtime for a plugin slot that no plugin provided. Retired with EXO0001 and for the same reason: there is no runtime to ask, and reaching a plugin's API is a property read the checker verifies.                                                                                                                                                                                                                                                                                                                                                                                 |
| `EXO0095` | childList() was handed a port that is not a children port. Retired because the refusal is no longer dom's: @exodra/string grew the same door and accepted an attribute port in silence, writing a list's markup into an attribute slot, so both backends now raise core's assertExoChildrenPort (EXO0018) and there is one sentence for one mistake instead of two codes.                                                                                                                                                                                                                                         |
| `EXO0096` | exoRouteMatchAt was asked for a match no route boundary had filed. Retired with exoRouteMatchAt itself: a page now receives its match as the params of its wire, and createInitialState receives it as its params, so there is no side table to miss.                                                                                                                                                                                                                                                                                                                                                             |
| `EXO0091` | A fill door was handed a port of a kind it does not fill, such as an attribute port handed to the call that places children. Retired with @exodra/wire and its withExoWiringAsserts decorator, which never shipped.                                                                                                                                                                                                                                                                                                                                                                                               |
| `EXO0092` | A fill door was handed a port that the schema being wired never declared, so its number addresses somebody else's table slot. Retired with @exodra/wire and its withExoWiringAsserts decorator, which never shipped.                                                                                                                                                                                                                                                                                                                                                                                              |
| `EXO0093` | One port was filled twice in a single wire, and only one of the two values can reach the page. Retired with @exodra/wire and its withExoWiringAsserts decorator, which never shipped.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `EXO0084` | mergeAttrs was called on @exodra/attrs, a tombstone that only threw. Retired with the package itself: it was deleted, because a package kept only so an old import resolves is the compatibility shim this project does not keep.                                                                                                                                                                                                                                                                                                                                                                                 |
| `EXO0094` | A wire returned leaving ports that it declared and nobody filled, which is reported at the end because until then not yet and never are the same state. Retired with @exodra/wire and its withExoWiringAsserts decorator, which never shipped.                                                                                                                                                                                                                                                                                                                                                                    |
| `EXO0086` | A machine declared its initial state twice. Retired when createInitialState moved into the options object of createExoMachine: an object literal has one createInitialState key, so a second declaration cannot be written.                                                                                                                                                                                                                                                                                                                                                                                       |
| `EXO0014` | A schema declared static text immediately after a children port. Retired when the DOM compiler learned to anchor the region on that Text node, and to put an empty comment before it where the server's parser would otherwise merge it into the text before the region or eat its newline; the string compiler prints the same comment, so both backends build one tree.                                                                                                                                                                                                                                         |
| `EXO0025` | A machine was given a keep, an effect or a handler after done() had compiled it. Retired with the machine builder: createExoMachine and the decorators withExoTransitions, withExoWire, withExoHandlers and withExoEffects each return a new machine and leave their input unchanged, so there is no compiled machine for a late declaration to miss.                                                                                                                                                                                                                                                             |
| `EXO0027` | A machine builder's done() was called a second time. Retired with the machine builder: a machine is the value createExoMachine or a decorator returns, and there is no compile step to run twice.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `EXO0028` | attachExoKeyedList refused the same key twice while reconciling one children port. The keyed list is now createExoKeyedList in @exodra/list-reconcile (c.keyedList through EXO_KEYED_LIST_VOCABULARY), and the reconcileExoOrder pass under it gives each occurrence of a repeated key its own row, so a repeated key is two rows rather than an error.                                                                                                                                                                                                                                                           |
| `EXO0070` | The variableName given to the hydration script renderer was not a dotted identifier path. Retired with renderExoHydrationScript, the renderer that assigned state to a global by that name: state now ships only as the JSON script renderExoPage() returns as page.stateScript, read with readExoStateScript(), and an element id is quoted data rather than source.                                                                                                                                                                                                                                             |
| `EXO0075` | Two different observables were registered with the persistor under one key. Retired with the persistor and @exodra/reactivity: server state is written with c.inject(EXO_SSR_RESPONSE).setState(key, value) under keys the page chooses, and read back on the client with readExoStateScript(), so there is no registration to collide.                                                                                                                                                                                                                                                                           |
| `EXO0076` | getExoPersistor was called while a server render was in progress. Retired with the process-wide persistor and @exodra/reactivity: a render's state lives on the response that render owns, reached through c.inject(EXO_SSR_RESPONSE), so there is no process-wide registry left to hand out.                                                                                                                                                                                                                                                                                                                     |
| `EXO0024` | A connector's on() was handed a port that is not an event port. Every backend's on() now names TExoEventPort, whose kind field is a single numeric literal disjoint from the other four, so a text, attribute or children port is a compile error at the call and the runtime compare had nothing left to catch. It was deleted rather than left standing because on() runs once per event port per instance and the compare was measured on the events-build axis of packages/benchmarks; what refuses the mistake now is packages/type-tests/src/CARD.ts, where the wrong kind is offered to on() and rejected. |
| `EXO0041` | A schema built its prototype by emitting markup and parsing it, so a markup string that parsed into anything but exactly one root was a refusal. The DOM plan compiler now builds the prototype by construction — createElement, createTextNode, appendChild — from a schema that is already a tree, so there is one root because one root is what was made.                                                                                                                                                                                                                                                      |
| `EXO0042` | An SVG-rooted schema used to be parsed inside a throwaway svg element and its namespace checked afterwards. The compiler now creates SVG and MathML elements with createElementNS directly, so the namespace is chosen rather than discovered and cannot come back wrong.                                                                                                                                                                                                                                                                                                                                         |
| `EXO0043` | The walk compiled from a schema was replayed over the parsed prototype to prove the parser had not reshaped it. There is no parser on this path any more: the walk and the prototype come out of one construction pass, so the walk cannot run off a tree it built itself.                                                                                                                                                                                                                                                                                                                                        |
| `EXO0044` | The compiled plan expected one tag where the parsed prototype had another — the parser having moved a tr out of a tbody and the like. Those reshapes are now refused at DECLARATION by assertExoParserStableChild.ts, which names the case instead of discovering it after the fact.                                                                                                                                                                                                                                                                                                                              |
| `EXO0109` | A machine placed children on a DOM backend composed without withExoChildList. Retired when the children port methods moved into every DOM backend: withExoChildList is now a deprecated call that returns its backend unchanged, so there is no composition left that lacks them.                                                                                                                                                                                                                                                                                                                                 |

### EXO0111 {#exo0111}

A machine registered a second handler on an event port that already had one.

**After the code:** the index of the event port that already had a handler.

An element keeps one handler per event: both events packs store it in one field, so a second
registration on the same port would silently replace the first. Handle the port once — a handler
can do several things — and keep it in one withExoHandlers step or one plugin step, not both.

### EXO0112 {#exo0112}

withExoEffects was given a dictionary with a name that is already taken on the machine's effects array.

**After the code:** the name.

The dictionary form sets each effect's handle on the effects array under its name, so the name
must be free there: a second withExoEffects step that repeats a name would leave two effects and
reach only the newer one by name, and a name such as push, slice or length would shadow the array
member the next step copies with. A name made of digits is refused as well, because it would
write an element of the array instead of a name on it. Pick another name.

### EXO0113 {#exo0113}

withExoTransitions was given a name the machine already has as a transition, or a name that is an array index.

**After the code:** the name.

A later step that repeats a name would leave two wrappers: a step that already destructured
m.transitions keeps calling the first, and overrides() reaches only the first slot, so an override
of the name would silently miss the newer one. A name made of digits is refused because object keys
that look like indices change their order, and the override table is laid out by order. Give the
transition its own name.

### EXO0114 {#exo0114}

A children port filled by c.one or c.list was given to a children port method or a reconciler.

c.one and c.list place their children past the port's child list, so a port method or a reconciler
on the same port would count none of them and insert in the wrong place. Place those children with
createExoNode and appendChild / insertChild (or a reconciler) instead, or keep the hand-placed ones
in a separate children port.
