# @exodra/jsx

`exoJsx` — the marker for a JSX **schema declaration** — and the TypeScript types
for the Exodra JSX dialect. Every `exoJsx(…)` call is compiled away by
[`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema) into a module-level
`createExoNamedSchema(…)`; nothing from this package survives into your bundle.

A declaration holds markup and named ports, and nothing else. A literal attribute
is markup, and so is a module-level value in an attribute (see below); every port is named off `$` where it stands, and the machine fills it
through the schema's `.ports`.

## Installation

```bash
npm install @exodra/jsx
```

## Configuration

Point the type checker at the `/schema` subpath:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@exodra/jsx/schema"
  }
}
```

The package root resolves to the same module, so `import { exoJsx } from
'@exodra/jsx'` and `import type { … } from '@exodra/jsx'` work;
`jsxImportSource` must still name the `/schema` subpath, because TypeScript
appends `/jsx-runtime` to it.

## The dialect

```tsx
import { exoJsx } from '@exodra/jsx';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoRefPort,
    TExoTextPort,
} from '@exodra/core';

interface TCardPorts {
    id: TExoAttrPort;
    title: TExoTextPort;
    open: TExoEventPort;
    edit: TExoEventPort;
    box: TExoRefPort;
    body: TExoChildrenPort;
    tags: TExoChildrenPort;
}

export const cardSchema = exoJsx<TCardPorts>(($) => (
    <article class="card" data-id={$.id} ref={$.box} on:dblclick={$.edit}>
        <h3>{$.title}</h3>
        <button type="button" onClick={$.open}>
            Open
        </button>
        <div class="card__body" unsafeHtml={$.body} />
        <ul class="card__tags">
            <$.tags />
        </ul>
    </article>
));
```

-   A literal (`class="card"`, `tabindex={0}`, bare `disabled`) — markup, baked into
    the schema. A module `const` string (`style={ZONE}`) folds the same way.
-   `class={styles.row}`, `style={PANEL}` rooted at an import or a module `const` —
    markup read once when the schema compiles; it never changes afterwards.
-   `data-id={$.id}` — an attribute port, filled with `c.attr(CardPorts.id, value)`.
-   `{$.title}` as an element's **only** child — a text port, filled with `c.text`.
-   `onClick={$.open}` (tail lowercased) or `on:dblclick={$.edit}` (name as written)
    — an event port, handled with `on(CardPorts.open, handler)` inside `withExoHandlers`.
-   `ref={$.box}` — a ref port: a reference to the element and no way to write it.
-   `unsafeHtml={$.body}` — a children port standing for the element's whole
    content, filled with unescaped markup by `c.unsafeHtml`; nothing sanitises it.
-   `<$.tags />` — a children port among static siblings, filled by the machine with
    `c.one`, `c.list`, or a reconciler made with `createExoChildrenReconciler`.

Any other expression, a component tag, a fragment or a spread is a compile error.
`@exodra/babel-plugin-schema`'s README is the reference for what each form
compiles to and every rule the compiler checks.

## What these types check

With a port interface as the type argument, `$` hands out each name as its port
kind, so the kind must fit the position: `onClick={$.title}` with a text port is
an error, as are `{$.open}` with an event port, `<$.id />` with an attribute
port, and a name the interface does not declare. They also check the event
**name** (`on:clik` is an error) for both `on:<event>` and `on<Event>`, including
the camel forms (`onKeyDown`, `onDblClick`); that an event attribute takes a
port, not a closure; that a lowercase `onclick="…"` is an error; that
`unsafeHtml` takes a children port; and that `<$.tags>` takes no children.

Without a type argument every `$.name` is accepted in every position, and
`.ports` is a record of untyped ports.

What the types do **not** check is checked by the compiler instead, naming the
element: that a text port is its element's only child, that an element with
`unsafeHtml` has no children, that a port name is used once, and that there is
no spread, fragment or namespace other than `on:`.

**The attribute index signatures stay open**, and a hyphenated name is not
checked at all. TypeScript drops a hyphenated JSX attribute before any index
signature is consulted, so `data-id={…}` is unchecked whatever is declared — the
signatures for `data-` and `aria-` are documentation. The attribute names are a
generous superset rather than a per-tag table, which cannot be both complete and
correct; a type that rejects a valid program is worse than one that admits a typo.

## Exports

`exoJsx`, and the types `TExoJsxPorts`, `TExoJsxAttrPort`, `TExoJsxTextPort`,
`TExoJsxEventPort`, `TExoJsxRefPort`, `TExoJsxChildrenPort`, `TExoJsxAnyPort`,
`TExoOnAttrs`, `TExoCamelEventName`, `TExoCamelOnAttrs`, `TExoAttrValue`,
`TExoUnsafeHtmlAttrs`, `TExoRefAttrs`, `TExoElementAttrName`, `TExoElementAttrs`,
`TExoSchemaElement`, `TExoSchemaChild`, `TExoSchemaChildren`,
`TExoSchemaElementProps`, and `JSX`.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
