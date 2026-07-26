---
title: Rendering patterns
---

# Rendering patterns

Everything in Exodra is `h(type, { static, bindables, bindableLists, handlers,
bindableHandlers })` (or the JSX that compiles to it). This guide is the toolkit for
**typical layout**: static structure, reactive text/attributes, conditional
rendering, and mixing static with dynamic. Lists have their [own guide](./lists.md).

## Where children live — three buckets

A node's children come from one of three buckets:

| Bucket | For | Reconciled? |
|---|---|---|
| `static.children` | fixed structure, built once | no |
| `bindables.children` | **one** reactive child — a `bindable`/`derive` holding a schema, an array, or `null` | on `setValue` |
| `bindableLists.children` | a reactive **list** (`list()`) with fine‑grained ops | per op |

If you set children in more than one bucket, the **last one wins** (like a CSS
cascade) — there's no error, the reactive bucket just overrides `static`.

## Reactive text & attributes

The everyday case — bind a value straight to a text node or attribute:

```jsx
const title = bindable('Ada');
const badge = derive(status, s => (s === 'on' ? 'badge on' : 'badge'));

<h3 bindable={{ textContent: title }} />
<span bindable={{ class: badge }} />
```

No diff, no vDOM — a write goes straight to that node. Anything that never changes
belongs in `static` (it costs nothing at update time).

## Conditional rendering (show / hide)

Pick the idiom by whether the hidden branch should be **removed** or just **hidden**.

### Swap or remove — `bindables.children`

Derive a child schema (or `null`) from a bindable; the renderer mounts / unmounts it:

```jsx
const view = derive(open, o => (o ? <Details /> : null));

<div bindable={{ children: view }} />;
```

- returning a **node** mounts it (its `onExoMount` fires),
- returning **`null`** removes the subtree (its `onExoUnmount` fires),
- the [identity rule](#the-identity-rule) applies — return the **same** node object to
  reuse it, a fresh one to rebuild.

### A conditional block among static siblings — use a Fragment

A parent's children are ONE bucket, so you can't mix `static.children` with a
reactive child on the same element. To drop a conditional child in **next to static
siblings without an extra wrapper element**, group it with a fragment
(`#fragment` — `<>…</>` in JSX). The fragment is transparent: its child mounts as a
real sibling.

```js
h('div', { static: { class: 'body', children: [
  h('h3', { static: { textContent: 'Ada Lovelace' } }),
  h('p',  { static: { class: 'sub', textContent: 'member' } }),
  // conditional child, no wrapper node of its own:
  h('#fragment', {
    bindables: {
      children: derive(open, o => (o ? h('div', { static: { class: 'details' } }) : null)),
    },
  }),
] } });
```

Without the fragment you'd need a real wrapper `<div>` to host the reactive child —
an extra DOM node. The fragment avoids it.

### Keep it mounted — toggle a class/attribute

When the branch is cheap and you want to **preserve its DOM/state** (an input mid‑typing,
a scroll position), don't remove it — bind a reactive `class` and hide with CSS:

```jsx
<section bindable={{ class: derive(open, o => (o ? 'panel' : 'panel hidden')) }}>
  …
</section>
```

**Rule of thumb:** *remove* (children → `null`) when the branch is heavy or must
reset; *hide* (reactive class) when it's light and should keep its state.

## Lists (dynamic children)

A reactive list of children is its own topic — see
[Lists & Reconciliation](./lists.md). In short: hand the renderer a new array with
`bindable<schema[]>` and it computes the minimal diff (identity‑keyed, moves reused
nodes), or emit exact `move` / `insert` / `remove` ops with `list()`:

```jsx
const rows = bindable([]);           // give it the current set…
rows.setValue(items.map(renderRow)); // …it reconciles

<ul bindable={{ children: rows }} />;
```

## Mixing static + dynamic — fragments

Because `static.children` is a plain array, you can freely mix built‑once nodes with
reactive ones by dropping a fragment (or a `bindableLists` host) into it:

```js
h('ul', { static: { children: [
  h('li', { static: { textContent: 'Pinned' } }),        // static
  h('#fragment', { bindableLists: { children: rows } }), // dynamic list, same <ul>
] } });
```

> **Caveat:** a `#fragment` may not be a **direct item of a reactive children list**
> (`bindableLists` / `bindables.children`). A fragment spreads several DOM nodes,
> which the index‑based list reconcile can't track — the renderer throws a clear
> error. Wrap it in an element, or inline its children into the list.

## The identity rule

Conditional children and lists are governed by the same rule: the renderer maps
**child schema object → DOM node**.

- **Same schema reference** → the same node is reused (moved if its position changed,
  never rebuilt) — this is what preserves input focus and per‑node state.
- **New reference** → a node is built.
- **Gone** → its node is removed and its bindings disposed (`onExoUnmount` fires).

So whether a node survives an update is entirely about whether you hand back the same
object. See [Lists & Reconciliation](./lists.md) for the focus‑safe keyed‑cache
pattern that keeps this stable across store updates.
