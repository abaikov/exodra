---
title: Security
sidebar_position: 3
---

# Security

Exodra renders untrusted data in two places — as element content and as attribute
values — and serialises server state into a `<script>` element. This page states
exactly what the framework guarantees at each of those points, what it explicitly
does **not** do, and where the executable proof lives.

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
| ASVS V5.3 · CWE-79, CWE-80 | Untrusted data in element content | `&`, `<`, `>`, `"` are escaped before any text reaches the output. Pre-escaped input is escaped again, so there is no double-decode hole. | `packages/string/src/security.test.ts` |
| ASVS V5.3 · CWE-83 | Untrusted data in an attribute **value** | Values are always emitted in double quotes and escaped with the same table, so a payload cannot close the quote or start a new attribute. Single quotes need no escaping precisely because the quoting style is fixed. | `packages/string/src/security.test.ts` |
| ASVS V5.3 · CWE-83 | Untrusted data in an attribute **name** | An attribute name is validated against the HTML spec (no whitespace, quote, `>`, `/`, `=` or control character) and **dropped** if invalid. This matters when an app forwards user-controlled props — `static={{...props}}` — because a name is spliced into the tag verbatim. | `packages/string/src/security.test.ts` |
| ASVS V5.3 · CWE-116 | Server state inside a `<script>` element | HTML escaping does not apply inside `<script>`: the parser looks only for `</script`, and a JS parser treats U+2028/U+2029 as line terminators. The payload escapes `<`, `>`, `&`, U+2028 and U+2029 as JSON `\uXXXX` escapes, so it still parses back to the original value. | `packages/ssr/src/security.test.ts` |

The DOM renderer needs no attribute-name check of its own: `setAttribute` rejects
an illegal name with `InvalidCharacterError`, so that path cannot be used to break
out of a tag. Only string rendering builds markup by concatenation, which is why
the validation lives there.

Both renderers share **one** escaping table (`@exodra/string`), and the compiled
SSR output imports the same helpers as the runtime walker, so the two cannot drift
apart. A test asserts that `escapeAttribute` and `escapeHtml` agree on every
payload in the corpus.

## What is NOT covered

These are deliberate. They are pinned by tests too, so changing the policy is a
visible, intentional edit rather than a silent drift.

**URL schemes are not filtered** (CWE-84 stays the application to own). `href={userInput}` with
`javascript:alert(1)` renders as written. Filtering schemes in the framework gives
false comfort — it cannot know which of `http`, `mailto`, `tel`, `blob` or a custom
scheme your app legitimately uses. Validate URLs where they enter your system, or
use an allowlist at the point of render.

**HTML is not sanitised.** `markHtml()` splices its argument raw;
that is its entire purpose. Never hand it a string built from user input without
running it through a real sanitiser such as DOMPurify first.

**A lowercase inline handler written as a plain attribute passes through.**
`static={{ onclick: '…' }}` renders `onclick="…"`, like any other attribute. The
supported channel for events is the `handlers` / `bindableHandlers` buckets, whose
camelCase names (`onClick`) are recognised by the framework and never rendered as
markup. Combined with prop forwarding, a lowercase handler name is a way to
introduce an inline script — so do not spread unvalidated data into `static`.

**Content Security Policy is your call.** `renderJsonScript` accepts a `nonce` and
escapes it, so a strict CSP works, but Exodra does not set headers.

## Running the checks

```bash
npm run test:run                 # the whole suite, security tests included
npx vitest run src/security.test.ts --dir packages/string
npx vitest run src/security.test.ts --dir packages/ssr
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
