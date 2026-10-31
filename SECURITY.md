# Security Policy

## Reporting a vulnerability

**Please do not open a public issue.**

Report privately through GitHub's
[private vulnerability reporting](https://github.com/abaikov/exodra/security/advisories/new)
on this repository. If that is unavailable to you, contact the maintainer through
the profile at https://github.com/abaikov.

Please include: the affected package and version, a minimal reproduction, and what
an attacker gains. A proof-of-concept is welcome but not required.

**What to expect:** an acknowledgement within 7 days, an assessment within 14, and
a fix released before the report is made public. You will be credited in the
advisory unless you ask otherwise.

## Supported versions

Exodra is pre-1.0. Only the latest published minor of each package receives
security fixes; there are no long-term support branches yet.

## What the framework guarantees

The rendering guarantees — output encoding for element content, attribute values,
attribute names, and state serialised into `<script>` — are documented, mapped to
[OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
requirements and CWE identifiers, and backed by tests that run on every release:

- **[Security documentation](https://abaikov.github.io/exodra/docs/security)** —
  the full table, including what the framework deliberately does *not* do.
- `packages/core/src/escape/tests/escapeExoText.test.ts` and
  `packages/core/src/escape/tests/escapeExoAttributeValue.test.ts` — the two escapers
  every backend calls, each pinned across the whole BMP in both directions: the
  code points it changes, and that it changes nothing else.
- `packages/dom/src/tests/dynamic-escape.test.ts` — a value that arrives through a
  port at render time, asserted on the resulting tree on both backends, plus the
  refusal of an attribute **name** that is not a legal attribute name.
- `packages/ssr/src/tests/security.test.ts` — encoding for the JavaScript context.

Payloads are drawn from the OWASP XSS Filter Evasion Cheat Sheet.

## Boundaries worth knowing before you report

These are documented, tested, deliberate behaviours rather than vulnerabilities:

- **URL schemes are not filtered.** `href={userInput}` with `javascript:` renders
  as written. Validate URLs in your application.
- **`markHtml()` splices raw HTML by design.** It is the explicit opt-out from
  escaping; sanitise before calling it.
- **A lowercase inline handler in the `static` bucket renders as an attribute.**
  Do not spread unvalidated data into `static`.

A report showing one of these leading to an exploit *through a path the docs say is
safe* is very much a vulnerability — it is the "through a safe path" part that
matters.

## Release integrity

Packages are published from a GitHub Actions workflow with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements), so every
tarball carries a signed attestation binding it to this repository and the commit
it was built from. Verify with:

```bash
npm audit signatures
```
