// @vitest-environment jsdom
//
// THE NEWLINE THE PARSER EATS AFTER `<pre>`, `<listing>` AND `<textarea>`, ASSERTED AS AN
// AGREEMENT BETWEEN THE TWO BACKENDS RATHER THAN AS BYTES.
//
// `string/compile-exo-str-schema.test.ts` pins what this repository SERVES for these shapes, and
// every case there explains its byte by stating what `@exodra/dom` builds for the same schema and
// the same value. Nothing ran `@exodra/dom` on those schemas. The whole fix — including the half
// that is a REFUSAL to act — rested on an agreement nobody had executed, which is what this file
// exists to execute.
//
// THE SPEC SENTENCE BEING IMPLEMENTED, from
// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions: "The otherwise optional
// newline must be included if the element's contents themselves start with a newline (because
// otherwise the leading newline in the contents would be treated like the optional newline, and
// ignored)."
//
// HOW EACH CASE IS WRITTEN, and it is the same three steps every time:
//
//  1. ONE schema, built once, handed to both backends. A divergence that needed two schemas to
//     show would not be a divergence.
//  2. The server's bytes are assigned to a container's `innerHTML`, so a REAL PARSER eats what a
//     browser would eat. The bytes are not the subject; the tree the reader ends up with is.
//  3. The same schema is rendered by `@exodra/dom` into a second container, and the two are
//     compared on the ONE THING A READER SEES: the element's own text.
//
// WHY NOT `innerHTML` AGAINST `innerHTML`. A DOM render leaves anchors and comments a string
// render does not, and several of these shapes carry them; comparing the two markups would pin
// that noise and would go red for reasons that have nothing to do with a newline. `textContent`
// (and, where the distinction matters, the first child Text node's `.data`) is the claim.
//
// WHAT DEPENDS ON JSDOM AND MUST NOT BE TUNED AWAY. jsdom parses through parse5, which implements
// the rule in exactly the two places the spec puts it: the `pre`/`listing` and the `textarea`
// start tag handlers set a "skip the next line feed" flag, and nothing else in the parser sets it.
// That is also why the fragment case below is a real difference and not a quirk — `pre.innerHTML =`
// parses with the `<pre>` as CONTEXT, so no start tag token is ever processed and no flag is ever
// set. If a case here ever fails, the question to ask first is which of the two backends moved:
// do not adjust an expectation to make jsdom agree with a backend.
//
// ONE CLAIM IN THIS AREA IS DELIBERATELY NOT ASSERTED HERE — a `<textarea>`'s `value` after a
// CLIENT render. See the comment on the textarea case.
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoMachine,
    TExoTextPort,
    TExoAttrPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import type { TExoStrMachine } from '@exodra/string';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

const EXO_STR = new ExoStrBackend();

/** The only exonode call these wires make. A method, so real exonodes satisfy it. */
type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** One element, one TEXT port that owns everything inside it, nothing else. */
const textPortIn = (tag: string, value: unknown) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let t!: TExoTextPort;
            b.el(tag, null, (e) => {
                t = e.textPort();
            });
            return { t };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.text(P.t, value);
            }
    );

/** The same element with STATIC text and no port at all — the case the fix refuses to touch. */
const staticTextIn = (tag: string, text: string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            b.el(tag, null, (e) => {
                e.text(text);
            });
            return {};
        },
        (): TExoMachineInitialState<TSetting> => () => {}
    );

/** One element whose ONLY child is a children port — the shape `unsafeHtml` compiles to. */
const htmlPortIn = (tag: string, markup: string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let h!: TExoChildrenPort;
            b.el(tag, null, (e) => {
                h = e.childrenPort();
            });
            return { h };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.unsafeHtml(P.h, markup);
            }
    );

/** The element a CLIENT render built — no parser was involved in any port's value. */
const client = (component: TExoMachine<TExoDomNode>, selector: string): Element => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    const el = parent.querySelector(selector);
    expect(el, `a client render produced no <${selector}>`).not.toBeNull();
    return el as Element;
};

/**
 * The element A BROWSER BUILT OUT OF THE SERVER'S BYTES.
 *
 * The bytes go through `innerHTML` on a plain `<div>`, which is the fragment parsing algorithm
 * with a `<div>` for context — so the `<pre>`, `<listing>` or `<textarea>` inside them is a real
 * START TAG TOKEN and the newline rule applies to it exactly as it would in a document. (The one
 * arrangement where it does NOT apply is the element being the context itself, which is the last
 * case in this file and the reason it is a separate case.)
 *
 * IT TAKES A `TExoStrMachine` AND `client` TAKES A `TExoDomMachine`, both from the same call
 * sites, and that is the file's own claim showing up in its signatures. Every component below is
 * built with a wire typed `TExoWire<TSetting>` - the shared surface, spelled as the one
 * call these wires make - and a wire's exonode parameter is CONTRAVARIANT, so ONE component
 * satisfies both aliases with no cast. That is the arrangement `TExoMachine`'s header describes
 * and `one-wire.test.ts` asserts directly.
 *
 * This parameter used to say `TExoDomMachine<number>`, which named the wrong backend for a
 * helper whose whole body is the SERVER's `render`: `TExoStrNode` has no `nodes` and no
 * `elem`, so nothing that reached this function could ever have satisfied both it and the call it
 * makes. Nothing caught it because no test file in this repository had ever been compiled.
 */
const served = (component: TExoStrMachine, selector: string): Element => {
    const parent = host();
    parent.innerHTML = EXO_STR.render(component);
    const el = parent.querySelector(selector);
    expect(el, `the served bytes parsed into no <${selector}>`).not.toBeNull();
    return el as Element;
};

describe('a text PORT standing first inside an element whose first newline the parser eats', () => {
    for (const tag of ['pre', 'listing', 'textarea']) {
        it(`shows the same text on both backends inside <${tag}>`, () => {
            // WHAT WOULD HAVE FAILED BEFORE THE FIX, and the reason this file is worth its lines:
            // the server printed `<pre>\nhello</pre>`, the parser ate the author's newline, and the
            // reader of a SERVED page saw "hello" while the reader of a client-rendered page saw a
            // blank line and then "hello". One schema, one value, two pages, and no error on
            // either side. The server now prints the optional newline the spec provides and the
            // parser eats THAT one instead.
            const component = textPortIn(tag, '\nhello');

            expect(served(component, tag).textContent).toBe('\nhello');
            expect(client(component, tag).textContent).toBe('\nhello');
        });

        it(`shows the same text inside <${tag}> when the value is NOTHING but the newline`, () => {
            // The degenerate case, where the old bytes lost the entire value: `<pre>\n</pre>`
            // parsed to an EMPTY element while `@exodra/dom` held a Text node with one newline in
            // it. A blank line on one page and no line at all on the other.
            const component = textPortIn(tag, '\n');

            expect(served(component, tag).textContent).toBe('\n');
            expect(client(component, tag).textContent).toBe('\n');
        });

        it(`adds nothing inside <${tag}> when the value does not begin with a newline`, () => {
            // The other half of "conditional". If the writer ever became unconditional this stays
            // green on the SERVED side — the parser eats the added byte either way — and goes red
            // on nothing at all, which is precisely why the string suite pins the bytes as well.
            // What this case is really guarding is the opposite mistake: an adjustment applied to
            // the wrong value, which WOULD show up here as a leading newline on the served side
            // only.
            const component = textPortIn(tag, 'hello');

            expect(served(component, tag).textContent).toBe('hello');
            expect(client(component, tag).textContent).toBe('hello');
        });
    }

    it('writes the client value straight into a Text node, having met no parser', () => {
        // The mechanism the whole asymmetry rests on, asserted rather than described: on the
        // client the value is a Text node's `.data` (`dom/set-text`), so there is nothing between
        // the wire and the page for a newline rule to attach to. If this ever stops being one
        // Text node holding the value verbatim, the server's compensating byte is compensating
        // for the wrong thing.
        const first = client(textPortIn('pre', '\nhello'), 'pre').firstChild;
        expect(first?.nodeType).toBe(3);
        expect((first as Text).data).toBe('\nhello');
    });

    it('leaves a port that is NOT first inside the <pre> identical on both backends', () => {
        // The rule is about the token immediately after the start tag. Here a `<span>` start tag
        // is that token, so nothing is eaten and nothing may be added — an extra newline here
        // would be a VISIBLE character inside a `<pre>`, on the served page only.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let t!: TExoTextPort;
                b.el('pre', null, (pre) => {
                    pre.el('span', null, (span) => {
                        t = span.textPort();
                    });
                });
                return { t };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.text(P.t, '\nhello');
                }
        );

        expect(served(component, 'pre').textContent).toBe('\nhello');
        expect(client(component, 'pre').textContent).toBe('\nhello');
    });
});

describe('a <textarea>, where the eaten newline is a form control’s first line', () => {
    it('gives the served control a default value that starts with the blank line', () => {
        // THE SHARPEST FORM OF THE BUG. A `<textarea>`'s child text IS its default value, so the
        // eaten newline was never a whitespace detail: it was a form field that submitted
        // "line two" from a served page and "\nline two" from a client-rendered one.
        //
        // THIS ASSERTION ALSO EXERCISES JSDOM'S BOOKKEEPING, and that is stated rather than hidden:
        // `.value` is derived from the child text content, and this side derives it the way a
        // browser does — the Text node arrives by PARSING, during `innerHTML`. If this line ever
        // fails while `textContent` above passes, the disagreement is between jsdom and the HTML
        // spec's default-value steps, not between the two backends; say so instead of relaxing it.
        const el = served(textPortIn('textarea', '\nline two'), 'textarea');
        expect(el.textContent).toBe('\nline two');
        expect((el as HTMLTextAreaElement).value).toBe('\nline two');
    });

    it('gives the client control the same child text', () => {
        // THE CLIENT HALF IS ASSERTED ON THE CHILD TEXT AND NOT ON `.value`, ON PURPOSE.
        //
        // `@exodra/dom` fills a text port by mutating an existing Text node's `.data`
        // (`dom/set-text`). A real browser runs the child text content change steps for that
        // mutation and the control's default value follows; whether jsdom does is a detail of
        // jsdom's `CharacterData` implementation that this repository does not control and that
        // nobody has run. Asserting `.value` here would therefore pin jsdom rather than
        // `@exodra/dom`, and if jsdom lagged, the red test would name the wrong culprit. The
        // divergence this file is about is fully visible in the child text: it is the same string
        // on both sides, which is what the two `.value`s are derived from.
        const el = client(textPortIn('textarea', '\nline two'), 'textarea');
        expect(el.textContent).toBe('\nline two');
    });
});

describe('STATIC text first inside a <pre>, which the fix deliberately does NOT touch', () => {
    it('loses the newline on BOTH backends, and that is the agreement', () => {
        // THIS IS THE FIX'S BOUNDARY AND THE MOST FRAGILE DECISION IN IT — the half that is a
        // refusal to act, and until now the only half with no executed test anywhere.
        //
        // A static run is markup on the server's side. It prints `<pre>\nhello</pre>` and a parser
        // eats the newline. `@exodra/dom` used to get the same answer for nothing, by assigning
        // those same bytes to `holder.innerHTML` and cloning the parsed result; it BUILDS its
        // prototype now, so it eats the newline itself, in the one branch in `compileExoDomSchema`
        // that looks at a text run's first character. Both pages read "hello", and the SHORTENED
        // string is the agreed one — which is why this case is no longer free either.
        //
        // WHAT GOES RED IF SOMEONE "FINISHES THE JOB" by giving statics the optional newline too:
        // the served side becomes "\nhello" while the client side stays "hello" — the exact
        // divergence the port fix exists to close, re-created by over-applying the cure. That is
        // why this case asserts the literal "hello" as well as the equality: an equality alone
        // would stay green if both sides gained a newline, which is a different page than the one
        // this repository serves today.
        const component = staticTextIn('pre', '\nhello');

        expect(served(component, 'pre').textContent).toBe('hello');
        expect(client(component, 'pre').textContent).toBe('hello');
    });

    it('keeps the newline on BOTH backends when the static is not first either', () => {
        // The pair that shows the rule is positional and not a property of `<pre>` text: nothing
        // follows the start tag here but a `<span>` start tag, so both sides keep the newline.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('pre', null, (pre) => {
                    pre.el('span');
                    pre.text('\nhello');
                });
                return {};
            },
            (): TExoMachineInitialState<TSetting> => () => {}
        );

        expect(served(component, 'pre').textContent).toBe('\nhello');
        expect(client(component, 'pre').textContent).toBe('\nhello');
    });
});

describe('RAW MARKUP that owns a <pre>, where the client parses with no start tag at all', () => {
    it('keeps the newline on both backends', () => {
        // THE CLAIM UNDER TEST, which is a claim about the FRAGMENT parsing algorithm rather than
        // about `<pre>`: `@exodra/dom` fills a children port that owns its element with
        // `pre.innerHTML = value` (`dom/set-html`), and there the `<pre>` is the CONTEXT, not a
        // token — the parser never runs a `<pre>` start tag handler, so nothing ever sets the
        // "skip the next line feed" flag and the newline SURVIVES. The server's bytes meet the
        // rule as usual, so they must carry the optional newline for the two to land on the same
        // text; without it the served page would be the only one of the two missing the blank
        // first line.
        //
        // ASSERTED ON THE FIRST CHILD AND NOT ONLY ON `textContent`, because the failure has a
        // shape: if the server stopped compensating, the served side would have no leading Text
        // node at all and its first child would be the `<b>`.
        const component = htmlPortIn('pre', '\n<b>x</b>');

        const s = served(component, 'pre');
        const c = client(component, 'pre');

        expect(s.textContent).toBe('\nx');
        expect(c.textContent).toBe('\nx');
        expect(s.firstChild?.nodeType).toBe(3);
        expect(c.firstChild?.nodeType).toBe(3);
        expect((s.firstChild as Text).data).toBe('\n');
        expect((c.firstChild as Text).data).toBe('\n');
    });

    it('adds nothing when the markup does not begin with a newline', () => {
        // The conditional half again, in the position where the markup a nested instance produces
        // always lands (it always begins with `<`), so this is the shape every non-hand-written
        // value takes.
        const component = htmlPortIn('pre', '<b>x</b>');

        expect(served(component, 'pre').firstChild?.nodeType).toBe(1);
        expect(client(component, 'pre').firstChild?.nodeType).toBe(1);
        expect(served(component, 'pre').textContent).toBe('x');
        expect(client(component, 'pre').textContent).toBe('x');
    });
});
