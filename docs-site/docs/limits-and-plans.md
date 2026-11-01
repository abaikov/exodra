---
title: Limits and plans
sidebar_position: 4
---

# Limits and plans

What Exodra does not do yet, what it will never do, and why. Everything here was
measured against the current code rather than assumed — where a limit exists, the
test that pins it is named, so you can check the claim and watch it change.

## Custom elements

Rendering a custom element works today: the tag is created, the element upgrades,
and ordinary attributes reach it.

```tsx
import { exoJsx, type TExoSchemaElementProps } from '@exodra/jsx/schema';

declare module '@exodra/jsx/schema/jsx-runtime' {
    namespace JSX {
        interface IntrinsicElements {
            'my-widget': TExoSchemaElementProps;
        }
    }
}

export const widgetSchema = exoJsx(($) => <my-widget id="chart" title={$.heading} />);
```

**Event names work.** An event port carries its name verbatim
to `addEventListener`, so `on:sl-change={handleChange}` — the convention every
component library follows — is heard. Nothing is lowercased and nothing is
mapped, on either the direct or the delegated pack.

**Properties still are.** A custom element takes structured data through a JS
property, not through an attribute — `el.items = [...]`. An attribute port
writes an attribute, so an object or an array arrives as `"[object Object]"`.
Whether a name is a property is decided from a table (`EXO_DOM_PROPERTIES`) and, for
the names where the tag matters, from `exoDomPropertyKind(tag, name)` — which is how
`value`, `checked` and `selected` are resolved. A custom element cannot be in
that table and cannot be asked either: before it upgrades it has no properties at
all, so the intent has to come from whoever wrote the schema.

The JSX dialect has no way to say "write this one as a property" either: `attr={$.x}`
is an attribute port, `on:` is the only namespace, and any
other namespace (`prop:options={…}`) is refused by name. How the dialect should
spell a property write is still open.

One subtlety is worth knowing before it lands: if a component's definition is
loaded lazily, a property written before the element upgrades is shadowed by the
class field when it does. Writing after `customElements.whenDefined` avoids it and
costs a turn of the event loop, and which of the two Exodra should do is exactly
the question that is still open.

Until then, the way through is the child's own `mount` hook — it runs once the
element is in the tree, which is also when a widget wants to be measured or
focused:

```ts no-check
import { exoNodeDom } from '@exodra/dom';

const child = c.build(Select, 0, params);
exoNodeDom(child).mount = function () {
    (this.node as HTMLElement & { options: unknown }).options = items;
};
```

That hook is called by the children stack, so it fires for anything placed
through a children port — `c.one`, `c.list`, a child list (`c.childList`) or `c.keyedList` — and
not for the root instance `backend.render` puts in a parent itself.

## Pages that other software has edited

A browser translator, an extension, a password manager or a bookmarklet will
rewrite parts of your page without telling anyone. Chrome's translator, in
particular, does not edit a text node — it takes it out and puts a `<font>`
element in its place. Any renderer holding that node is then holding a node the
document has moved or discarded, and the classic result is a crash on the next
update.

Exodra does not crash, and it does not freeze either. A bound text port caches
the `Text` node it wrote so that an update is a `.data` store rather than a
`textContent` assignment — but the cache is trusted only while that node is still
its element's one and only child, and when it is not, the write falls back to
`textContent` and re-caches whatever the browser made
(`packages/dom/src/dom/tests/text-binding.test.ts`). That covers any software that
replaces the node, and both shapes a translator produces in particular:

- **Wrapped** — your `Text` node is moved inside a `<font>` that took its place.
  Without the guard, `cached.data = …` would keep succeeding on a node the
  element no longer renders, and the page would freeze at the translated text
  with no error anywhere. The fallback writes through and the wrapper goes with
  it.
- **Replaced** — your node is discarded and a copy of the text appears inside the
  translator's element. There is nothing to recover the mapping from, so the most
  any renderer can do is notice and rebuild, which is what happens: the next
  update prints the new value and clears the wrapper.

Lists are covered by the same rule at the element level: every insertion and
removal asks the document who a node's parent currently is rather than trusting
what it cached, so removing a row takes the `<font>` that swallowed it with it
(`packages/dom/src/dom/tests/reconcile-exo-order.test.ts`).

What no renderer can restore is the *translation*: after a rebuild the text is
your value, untranslated, until the translator gets to it again.

If a page mixes heavy reactivity with text that translators will attack, the
cheap insurance is to opt out of translation for that part:

```html
<meta name="google" content="notranslate" />
```

## Focus when a list is reordered

Moving a focused element loses focus — in Exodra, and in every other framework,
because the DOM specification removes a node before it re-inserts it, even when
the "move" is a single `insertBefore` call. Verified in Chromium, not deduced.
The caret position inside an input survives; the focus does not.

This is not on the list to fix: a renderer cannot tell a deliberate reorder from
a rebuild, and restoring focus behind your back would be wrong as often as it
would be right. If a list is reorderable while someone is typing in it, save
`document.activeElement` and restore it after the change.

## Server rendering

`@exodra/string` and `@exodra/ssr` render a schema to HTML, and hydration attaches
to it. Custom elements render as their tag with attributes — their shadow content
is theirs to produce, and Exodra does not attempt declarative shadow DOM.

## Known issues

These are known, measured where a measurement exists, and not yet solved. Each names where its number comes from, so it can be re-run and watched
as it moves.

### Components are longer than in React or Solid

The application every benchmark axis mounts is **477 lines** in Exodra, against
**208** in React and **220** in Solid, counted by the harness itself with
TypeScript's parser, comments and blank lines excluded (the `app LOC` column of
`initial-render`). A schema built with `createExoSchema` declares its ports by
hand, and a machine names every transition it runs. That is the cost of having
no compiler in the way, and nothing yet makes it shorter.

### Updates sit further from their floor than mounting does

Mounting is within 1.35–1.42× of a hand-written program producing the same DOM
([What the floor says](./why/what-the-floor-says.md)). Updates, each against a
hand-written program doing the same job (`update-floor.shuffled`): a list that
grows and shrinks is level with hand-written diff code (1.000×), and the rest
sit above their floor — `text-sweep` 1.522×, `text-one` 1.562×, `reorder`
1.566× and `wide` **2.242×**, the application-wide flip.

### Without the compiler, `@exodra/react-compat` mounts level with React, not ahead

Measured on the benchmark application with production builds, in narrowed runs
(ratios only, inside one run, `initial-render.compat8`): mounting with host
templates, which are on by default, took 1.000 ms against React's 0.980; with
templates switched off, 1.280. The compiled path,
`@exodra/babel-plugin-schema/react`, took 0.860. On `app-update`
(`app-update.compat8`) the axis reports no resolution, so only the order is
known: compiled, then templates, then React, then the plain runtime.

### Toggling a large block rebuilds it by default

Tearing out 200 panels and building others takes 10.2 ms out of the box against
Solid's 9.2 (`toggle.base1`). Keeping the subtree alive takes 3.3, but that row
builds its panels in advance and so is not comparable with Solid or any other
framework; the default rebuilds.

### The cost of building a schema cannot be re-measured

`schema-build.published` puts a runtime schema at roughly 0.26–0.29 µs per
element, once per module load. The axis that produced it is no longer in the
tree, so the figure cannot be reproduced until it is written again.
