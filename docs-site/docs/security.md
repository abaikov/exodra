---
title: Security
sidebar_position: 3
---

# Security

Exodra renders untrusted data in two places — as element content and as attribute
values — and serialises server state into a `<script>` element. This page states
exactly what the framework guarantees at each of those points, what it explicitly
does **not** do, and where the executable proof lives.

:::note One pair of escapers
Text and attribute values go through `escapeExoText` and `escapeExoAttributeValue`
from `@exodra/core` — the **same** two functions on the server and in the DOM
compiler, because hydration rests on the two producing the same bytes. A copy
made "for the DOM side" would not be a duplicate helper; it would be the end of
hydration.
:::

The guarantees are mapped to published references rather than to our own
categories, so you can audit them against something that is not us:

- **[OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)**,
  chapter *Validation, Sanitization and Encoding*, section **V5.3 Output Encoding
  and Injection Prevention**. The two requirements that apply to a rendering
  library are that output encoding matches the interpreter and context, and that
  context-aware escaping protects against reflected, stored and DOM-based XSS. We
  cite the section rather than individual requirement numbers on purpose: ASVS 5.0
  renumbered the chapters, and a pinned number would rot.
- **CWE** identifiers for naming each weakness precisely.
- Payloads from the **OWASP XSS Filter Evasion Cheat Sheet** and the **html5sec**
  corpus.

There is no official conformance suite for XSS encoding — no W3C or IETF document
defines one — so those corpora are the de-facto standard, and they are what every
framework tests against.

## What is covered

| Reference | Context | Exodra's guarantee | Tests |
|---|---|---|---|
| ASVS V5.3 · CWE-79, CWE-80 | Untrusted data in element content | `&`, `<`, `>`, `"` are escaped before any text reaches the output. Pre-escaped input is escaped again, so there is no double-decode hole. | `packages/dom/src/tests/escape.test.ts`, `packages/dom/src/tests/dynamic-escape.test.ts` |
| ASVS V5.3 · CWE-83 | Untrusted data in an attribute **value** | Values are always emitted in double quotes and escaped with the same table, so a payload cannot close the quote or start a new attribute. Single quotes need no escaping precisely because the quoting style is fixed. | `packages/dom/src/tests/dynamic-escape.test.ts` |
| ASVS V5.3 · CWE-83 | Untrusted data in an attribute **name** | A name is checked when it is **declared** — `b.el('a', {href})`, `b.port('data-id')` — against an allowlist: a letter or `_`, then letters, digits, `_`, `.`, `:`, `$`, `-`. Anything else **throws**, naming the call the author made. | `packages/core/src/attr/tests/assertExoLegalAttrName.test.ts` |
| ASVS V5.3 · CWE-116 | Server state inside a `<script>` element | HTML escaping does not apply inside `<script>`: the parser looks only for `</script`, and a JS parser treats U+2028/U+2029 as line terminators. The payload escapes `<`, `>`, `&`, U+2028 and U+2029 as JSON `\uXXXX` escapes, so it still parses back to the original value. | `packages/ssr/src/tests/security.test.ts` |
| CWE-84 | The **scheme** of a URL in an `href`, `src` or `action` | **Nothing. This row is here because its absence read as "the question does not arise".** A `javascript:` URL is escaped as a string and rendered as written, on both backends. See [URL schemes are not filtered](#what-is-not-covered) below for what a guard would have cost and why it is not one. | — |

**Why a name is checked at all, when it is written in code.** A name cannot be
escaped — an escaped name is a different attribute — so it goes into the markup
verbatim, on **both** backends: the server prints it, and the DOM compiler writes
the identical bytes into the string it hands the HTML parser to build the
prototype every instance is cloned from. A port named `data-x" onclick="alert(1)`
does not become an oddly-named attribute; it closes the value, opens a second
attribute, and both backends serve a working `onclick`. That is not theoretical:
`data-` plus a key is a supported thing to be building, and the moment the key
comes from data the name is attacker-shaped.

Two details of that check are deliberate:

- **It is an allowlist, not the HTML spec's blocklist.** The spec forbids
  whitespace, quotes, `>`, `/`, `=` and the C0 controls in a name, which is the
  right rule for a string that is only sent to a browser. The same string is also
  *parsed as markup* here, and "the tokenizer tolerates this character" is much
  weaker than "this character cannot mean anything but itself". `<`, a backtick,
  `&` and every non-ASCII code point pass a blocklist, and none of them is a name
  a real component wants.
- **It throws instead of dropping the attribute.** The name is fixed before a
  single request arrives, so a throw costs no availability — and dropping would
  be worse than useless, because the port would still hold the **number** both
  backends index their plans by, which would move every later value onto the
  wrong element.

Beyond that name, a schema is code: it is built once when the module loads, there
is no prop spreading, and nothing merges an object of unknown keys into an
element. Values, and only values, arrive per render.

`packages/dom/src/tests/dynamic-escape.test.ts` pins **two separate properties**, and
the distinction is the point: *safety* (a value in a text position cannot open a
tag; a value in an attribute position cannot close the quote and start another
attribute), asserted on the resulting **tree** rather than on the bytes, because
a tree is what a browser acts on — and *agreement* (the bytes the server sent and
the tree the browser would have built are the same thing), because a value the
two backends escape differently is not an error on either side, it is a page that
adopts wrong. Two backends that are both wrong in the same way satisfy agreement
perfectly, which is why "they agree" is not a security claim and is not written
down as one.

## What is NOT covered

These are deliberate. They are pinned by tests too, so changing the policy is a
visible, intentional edit rather than a silent drift.

**URL schemes are not filtered** (CWE-84 stays the application to own). A `href`
port filled with `javascript:alert(1)` renders as written, on both backends.
Filtering schemes in the framework gives false comfort — it cannot know which of
`http`, `mailto`, `tel`, `blob` or a custom scheme your app legitimately uses.
**Validate URLs where they enter your system**, or use an allowlist at the point
of render.

Know what the neighbours do before you read that as a gap, because they do not
agree with each other. **React** rewrites a `javascript:` URL — on the client and
in the server renderer — into a URL that throws when clicked, silently, with no
warning; its pattern names that one scheme, so `data:text/html;base64,…` in an
`<object data>` passes it. **Angular** warns in dev and rewrites the value to
`unsafe:…`, and needs a second, stricter mechanism that *throws* for `<iframe
src>` and script sources, where rewriting is not enough. **Vue** filters nothing
and says so in its own security guide: "if you're ever doing URL sanitization on
the frontend, you already have a security issue. User-provided URLs should always
be sanitized by your backend before even being saved to a database."  **Svelte**
filters nothing; its escaper handles characters only. **DOMPurify**, which is a
sanitiser rather than a renderer, does not blocklist at all — it allowlists nine
schemes and expects to be reconfigured, because that is the only shape of the
check that actually works.

The reason we ship none of them is not only that the useful shape needs an
allowlist we cannot know. It is that a URL's value first exists **when a wire
fills it** — a schema knows the port's name when the module loads, and never the
value — so every possible guard runs per fill, on a path that also has to produce
the same bytes on both backends or hydration adopts wrong.

**The version that would have been affordable, and why it is still not shipped.**
`createExoAttrWrite` already branches on the port's name at schema-compile time and
hands back a different writer for a property, for `class`, for a namespaced
attribute and for the ordinary case
(`packages/dom/src/dom/factories/createExoAttrWrite.ts:27-67`); the choice is made ONCE per
port when the schema compiles, not per write, because the PORT KIND already carries it — the
builder mints a different kind for a plain attribute, a string attribute and a toggle
(`packages/string/src/schema/compileExoStrSchema.ts:294-308`), and the server reads the same
kinds.
A fifth branch for `href`, `src`, `action`, `formAction` and `xlink:href` would
therefore leave every other port's writer byte-identical, and the whole price
would be one scheme test on URL-bearing ports only. That is real but small: the
escaper's fast path is a single `/[&"<> ]/.test(value)` and an immediate return
(`packages/core/src/escape/escapeExoAttributeValue.ts:8`), so a clean URL makes one
pass today and would make two. **Cost is not what refuses it.** Two other things
do. First, the only guard shippable without configuration is a blocklist, and the
shipped blocklists name one scheme — a framework running React's pattern could
say it filters URLs while `data:text/html;base64,…` in an `<object data>` still
renders, which is exactly the false comfort this section is about. Second, a
guard that alters the value becomes a second pair of functions that the server
and the client must keep byte-identical or hydration adopts wrong (Angular's
rewrite would serve `unsafe:javascript:alert(1)`), and a guard that throws turns
an XSS *attempt* into a downed response, because it fires mid-stream on
request-shaped data.

**HTML is not sanitised, and the escape hatch says so in its own name.** A
children port that is its element's **only** child may be filled with raw markup
— `c.unsafeHtml(port, html)`, which the JSX dialect declares as `unsafeHtml={$.body}` — and that
string is printed verbatim on the server and assigned through `innerHTML` in the
browser. Nothing sanitises it in either place, deliberately: a renderer that
quietly ran a sanitiser would be making a security decision for an author who has
just typed the word `unsafe`. Never hand it a string built from user input
without running it through a real sanitiser such as DOMPurify first. Every other
children port refuses a raw string by name, so this is the one path in the
renderer that can produce markup from a value.

**A lowercase inline handler written as a static attribute passes through.**
`b.el('div', { onclick: '…' })` renders `onclick="…"`, like any other attribute,
because a schema's static attributes are markup and are not inspected. The
supported channel for events is an `eventPort`, which emits no markup at all.
This is only reachable by writing it into a schema — see the attribute-name note
above — so it is a thing you can do to yourself, not a thing request data can do
to you.

**Content Security Policy is your call.** `renderExoJsonScript` accepts a `nonce` and
escapes it, so a strict CSP works, but Exodra does not set headers.

## Running the checks

```bash
npm run test:run                 # the whole suite, security tests included
npx vitest run src/tests/dynamic-escape.test.ts --dir packages/dom
npx vitest run src/tests/security.test.ts --dir packages/ssr
```

The security tests are ordinary suite members — they run on every `npm run
release:check`, so a regression blocks a release rather than being noticed later.

## Release integrity

Packages are published from a GitHub Actions workflow with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements): every
tarball carries a signed attestation binding it to this repository and the commit
it was built from. Verify what you installed with:

```bash
npm audit signatures
```

The same workflow re-runs the full gate — lint, typecheck, type tests, build, the
whole suite including these security tests, and a packed-artifact install — before
anything reaches npm.

## Reporting a vulnerability

See [SECURITY.md](https://github.com/abaikov/exodra/blob/master/SECURITY.md).
Please report privately rather than opening a public issue.
