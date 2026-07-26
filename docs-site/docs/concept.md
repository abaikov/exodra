---
sidebar_position: 0
title: The Concept
---

# The Concept

Most frameworks grow a UI from the inside out: a virtual tree lives in memory,
gets diffed against itself, and the differences are pushed to the screen. The
structure is hidden, and the framework spends every update rediscovering what
changed.

Exodra turns that inside out. The structure lives on the **outside** — declared,
explicit, load-bearing. An **exoskeleton**.

![An Exodra view in three layers: the schema skeleton on the left, reactivity wires in the middle, and the DOM flesh on the right](/img/concept-anatomy.svg)

## The skeleton — the schema

An Exodra view is a **schema**: a plain tree of `h(type, attrs)` nodes, assembled
from your JSX by the compiler. It is not a render output — it is the skeleton the
whole app hangs on, and it does two jobs.

**It carries identity.** Each node is an object, and Exodra reconciles by
*reference identity*: hand back the same schema object and the same DOM node is
reused — moved, never rebuilt. That is why a row keeps its element, its scroll
position, and its input focus across an update. Identity isn't bookkeeping bolted
on top — it *is* the bone.

**It declares the wiring.** Every attribute is sorted into a typed bucket:
`static` for the parts that never move, `bindable` / `bindableList` for the parts
a signal drives, `handlers` for events. The schema doesn't store values that
change — it stores the *sockets* where the reactive wires plug in. The compiler
knows, at build time, exactly where every wire goes, so the renderer never has to
guess.

## The nerves — reactivity

The wires are signals: `bindable`, `derive`, `list`. A wire runs from a source to
a single socket on the skeleton. When it carries a new value it writes straight to
that one spot — no diff, no tree walk. The skeleton defines *where* a signal can
reach; the signal decides *when*.

Fine-grained by construction: a thousand static bones cost nothing to update,
because no wire is attached to them.

## The flesh — ExoNodeDom

The skeleton is inert data until a renderer gives it a body. `ExoNodeDom` walks
the schema and **threads flesh onto the bones**: it builds the real DOM for each
node, hangs it in place, and connects each reactivity wire to its socket. From
then on the DOM is living tissue — the bones hold the shape and the identity, the
wires keep the flesh in sync.

Swap the renderer and the same skeleton grows a different body: `@exodra/string`
renders it to HTML on the server; the client then hydrates that same HTML,
reusing the flesh instead of regrowing it.

## Why an exoskeleton

Put the structure on the outside and three things follow, for free:

- **No hidden diff.** The framework never rediscovers your tree — you handed it
  the skeleton with the wiring already marked.
- **Identity is yours to control.** Reuse a node → keep it. Rebuild it → replace
  it. Focus, animation, and scroll follow the bone, not a heuristic.
- **You pay only for what moves.** A static bone is set once; only a wired socket
  ever updates.

It asks a little more of you up front — you name the buckets, you decide what is a
bone and what is a wire. In return the machine never guesses, and never pays to.

Next: [Core Concepts](./core/concepts.md) turns this into the concrete rules — the
three-props architecture, reconciliation, and lifecycle.
