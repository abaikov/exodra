import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createExoSchema, escapeExoAttributeValue } from '@exodra/core';
import type { TExoSchemaCursor } from '@exodra/core';
import { compileExoStrSchema } from '../compileExoStrSchema';
import { ExoStrBackend } from '../../node/ExoStrBackend';

// One backend for the file: a schema is cached per backend, and nothing here reads a method off it.
const EXO_STR = new ExoStrBackend();

// THE VOID-ELEMENT REFUSAL SHIPS; the file's other three guards deliberately stay stripped. A
// stripped build accepting a `<br>` with content emits `<br>…</br>`, which a browser re-parses into
// TWO `<br>` elements with the content loose between them, while `@exodra/dom` builds one and drops
// the content — one schema, two pages, in the build nobody runs the parity suite against. The other
// three compare this walk against `numberPorts`, two pieces of our own code walking one schema, so
// a user's machine cannot produce a disagreement the first local compile did not.
function underProduction<T>(fn: () => T): T {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        return fn();
    } finally {
        if (before === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = before;
    }
}

// Hands the schema to the server's compiler, as `exoStrSchemaOf` does.
function compile(build: (b: TExoSchemaCursor) => void): void {
    const schema = createExoSchema((b) => {
        build(b);
        return {};
    });
    compileExoStrSchema(schema, EXO_STR);
}

describe("compileExoStrSchema's void-element refusal is NOT dev-only — it ships", () => {
    it('refuses a void element with a content port under NODE_ENV=production', () => {
        expect(() =>
            underProduction(() =>
                compile((b) => {
                    b.el('img', { src: 'x.png' }, (i) => {
                        i.textPort();
                    });
                })
            )
        ).toThrow(/EXO0060/);
    });

    it('prints EXO0060 under production and the whole explanation in development', () => {
        const message = (): string => {
            try {
                compile((b) => {
                    b.el('hr', null, (hr) => {
                        hr.text('nope');
                    });
                });
            } catch (e) {
                return (e as Error).message;
            }
            return '';
        };
        const short = underProduction(message);
        const long = message();

        expect(short).toBe('EXO0060');
        expect(short).not.toContain('@exodra/dom');
        expect(long).toContain(
            'compileExoStrSchema: <hr> is a void element and cannot have content'
        );
        expect(long).toContain('@exodra/dom');
        expect(long).toContain('re-parse');
        expect(long.length).toBeGreaterThan(short.length);
    });

    it('still compiles an EMPTY void element under production', () => {
        // The other half: `<br>` and `<img>` with no content are the ordinary case.
        const schema = underProduction(() => {
            const schema = createExoSchema((b) => {
                b.el('div', null, (d) => {
                    d.el('br');
                    d.el('img', { src: 'x.png', alt: '' });
                });
                return {};
            });
            return compileExoStrSchema(schema, EXO_STR);
        });
        expect(schema.portCount).toBe(0);
        expect(schema.fillMarkup([])).toBe('<div><br><img src="x.png" alt=""></div>');
    });
});

describe("the void refusal is a SOURCE-SHAPE property, and its neighbours' shape is not", () => {
    it('the void throw is the `? :` branch and no `if` guard carries it away', () => {
        // The runtime assertions above cannot see the MINIFIER, which is what deletes a check
        // written `if (guard && COND) throw`, so the shape itself is asserted. Parsed rather than
        // grepped: the source's string literals contain quotes that defeat a text scanner.
        const file = 'compileExoStrSchema.ts';
        const src = readFileSync(fileURLToPath(new URL('../' + file, import.meta.url)), 'utf8');
        const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);

        const readsNodeEnv = (node: ts.Node): boolean => {
            let found = false;
            const visit = (n: ts.Node): void => {
                if (
                    ts.isPropertyAccessExpression(n) &&
                    n.name.text === 'NODE_ENV' &&
                    ts.isPropertyAccessExpression(n.expression) &&
                    n.expression.name.text === 'env'
                ) {
                    found = true;
                }
                ts.forEachChild(n, visit);
            };
            visit(node);
            return found;
        };

        // Found by the throw's own text: every byte of the message is assembled INSIDE the dev
        // branch, so a production build carries neither the sentence nor a `const` holding it.
        const throws: ts.ThrowStatement[] = [];
        const collectThrows = (node: ts.Node): void => {
            if (ts.isThrowStatement(node) && node.getText(source).includes('is a void element')) {
                throws.push(node);
            }
            ts.forEachChild(node, collectThrows);
        };
        ts.forEachChild(source, collectThrows);

        expect(throws, `${file} has exactly one void-element throw`).toHaveLength(1);
        const thrown = throws[0];

        // The message must be a `guard ? long : short`, which is what folds to `short` and leaves
        // the throw standing.
        const call = thrown.expression;
        const args = ts.isNewExpression(call) && call.arguments !== undefined ? call.arguments : [];
        expect(args.length, 'the void refusal throws `new Error(<one argument>)`').toBe(1);
        const message: ts.Node = args[0];
        expect(
            ts.isConditionalExpression(message) && readsNodeEnv(message.condition),
            `${file}: the void refusal's message must be a \`NODE_ENV ? long : short\` ternary`
        ).toBe(true);

        // And nothing above may re-introduce the deletion: an enclosing `if` reading NODE_ENV takes
        // the whole refusal out of a production build, ternary or not.
        for (let node: ts.Node = thrown; node.parent !== undefined; node = node.parent) {
            if (ts.isIfStatement(node.parent) && node.parent.thenStatement === node) {
                expect(
                    readsNodeEnv(node.parent.expression),
                    `${file}: an \`if\` reading NODE_ENV encloses the void refusal, which ` +
                        'deletes it from a production build however the message is written'
                ).toBe(false);
            }
        }
    });
});

// THE PARSER EATS ONE U+000A AFTER `<pre>`, `<listing>` AND `<textarea>`, and the rule is NOT
// symmetric. A PORT's value never meets a parser in the browser — `@exodra/dom` writes it with
// `.data`, or with `innerHTML`, whose FRAGMENT parsing has no start tag token for the rule to
// attach to — so this backend must print the optional newline the spec provides and let the parser
// eat THAT one. A STATIC's text meets a parser on BOTH sides, since `@exodra/dom` builds its
// prototype by assigning `holder.innerHTML`, so the two already agree and "fixing" the server is
// what would break them apart.
describe('a leading newline in a port that stands where the parser eats one', () => {
    // The compiled schema, filled by hand below exactly as an exonode does.
    function schemaOf(
        build: (b: TExoSchemaCursor) => void
    ): ReturnType<typeof compileExoStrSchema> {
        const schema = createExoSchema((b) => {
            build(b);
            return {};
        });
        return compileExoStrSchema(schema, EXO_STR);
    }

    // One render: every port through its own writer, then the markup filled with the results.
    function render(
        schema: ReturnType<typeof compileExoStrSchema>,
        values: readonly unknown[]
    ): string {
        return schema.fillMarkup(values.map((value, i) => schema.writers[i](value)));
    }

    it('prints the optional newline for a text port first inside <pre>', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.textPort();
            });
        });
        // TWO newlines served, ONE kept: the first is the optional one the spec allows after
        // `<pre>`, the second the author's — so the page reads "\nhello", which is the Text node
        // `@exodra/dom` builds having never gone near a parser.
        expect(render(schema, ['\nhello'])).toBe('<pre>\n\nhello</pre>');
    });

    it('prints it for a value that is nothing BUT the newline', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.textPort();
            });
        });
        // The degenerate case: `<pre>\n` parses to an EMPTY element while `@exodra/dom` holds a
        // Text node with one newline — a blank line on one page and not the other.
        expect(render(schema, ['\n'])).toBe('<pre>\n\n</pre>');
    });

    it('leaves a value that does not begin with a newline byte-identical', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.textPort();
            });
        });
        // The other half of "conditional": nothing is added when nothing would be eaten.
        expect(render(schema, ['hello'])).toBe('<pre>hello</pre>');
        expect(render(schema, [' \nhello'])).toBe('<pre> \nhello</pre>');
    });

    it('prints it inside <textarea>, where the newline is the control’s first line', () => {
        const schema = schemaOf((b) => {
            b.el('textarea', null, (ta) => {
                ta.textPort();
            });
        });
        // A `<textarea>`'s text IS its default value, so an eaten newline is a form field whose
        // first line vanishes on the server and stands on the client.
        expect(render(schema, ['\nline two'])).toBe('<textarea>\n\nline two</textarea>');
    });

    it('prints it inside <listing>, which the parser treats exactly like <pre>', () => {
        const schema = schemaOf((b) => {
            b.el('listing', null, (l) => {
                l.textPort();
            });
        });
        // Obsolete, non-conforming, and still parsed by every browser with the `<pre>` rule.
        expect(render(schema, ['\nhello'])).toBe('<listing>\n\nhello</listing>');
    });

    it('leaves a port that is NOT first inside the <pre> alone', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.el('span', null, (span) => {
                    span.textPort();
                });
            });
        });
        // The rule is about the token immediately following the start tag, and here that is a
        // `<span>` start tag — so an added newline would be a VISIBLE character inside the `<pre>`
        // that the client render does not have.
        expect(render(schema, ['\nhello'])).toBe('<pre><span>\nhello</span></pre>');
    });

    it('leaves an ordinary <div> alone', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.textPort();
            });
        });
        // No rule, no adjustment. CSS collapses the newline in a `<div>` either way, but it is IN
        // THE TREE on both sides, which is what hydration walks and what `textContent` reads.
        expect(render(schema, ['\nhello'])).toBe('<div>\nhello</div>');
    });

    it('leaves STATIC text first inside a <pre> alone, because @exodra/dom loses it too', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.text('\nhello');
            });
        });
        // The boundary. These bytes lose the newline in the browser, and `@exodra/dom` loses it as
        // well because it builds its prototype by assigning this same markup to `holder.innerHTML`.
        // Adding the optional newline here would make the server the only side with a blank first
        // line — the divergence this file exists to close, re-created by over-applying the cure.
        expect(render(schema, [])).toBe('<pre>\nhello</pre>');
    });

    it('leaves static text alone when it is not first either', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.el('span');
                pre.text('\nhello');
            });
        });
        // Same bytes, and BOTH sides keep the newline: a `<span>` start tag follows. Paired with
        // the test above, this is what shows the rule is POSITIONAL.
        expect(render(schema, [])).toBe('<pre><span></span>\nhello</pre>');
    });
});

// THE SECOND SITE THAT OPENS AN ATTRIBUTE VALUE. `escapeExoAttributeValue` leaves a single quote
// and a backtick alone, which is safe only because every value is written inside DOUBLE quotes —
// and static attributes never go through that function: `emit` writes them with its own literal.
// So TWO places decide the quoting style and the escaper's omission depends on both. Change that
// literal to `='`, or drop the quotes, and every other test stays green while `id="…"` becomes an
// injection point on every statically-attributed element served.
describe('static attributes are quoted by compileExoStrSchema itself, not by exoAttribute', () => {
    // One `<div>` carrying `attrs` and nothing else. No ports, so no values.
    function markupOf(attrs: Readonly<Record<string, string>>): string {
        const declaration = createExoSchema((b) => {
            b.el('div', attrs);
            return {};
        });
        const schema = compileExoStrSchema(declaration, EXO_STR);
        expect(schema.portCount, 'a static-attribute schema declares no ports').toBe(0);
        return schema.fillMarkup([]);
    }

    it('opens and closes every static attribute with a DOUBLE quote', () => {
        // The plain shape first, so a changed quoting style fails here rather than on a count.
        expect(markupOf({ id: 'x' })).toBe('<div id="x"></div>');
        expect(markupOf({ id: 'a', title: 'b', 'data-k': 'c' })).toBe(
            '<div id="a" title="b" data-k="c"></div>'
        );
        // An EMPTY value: the shape where `<div id=>` would still look plausible in a diff.
        expect(markupOf({ id: '' })).toBe('<div id=""></div>');
    });

    it('leaves a single quote and a backtick LITERAL, which only the double quote makes safe', () => {
        // THE OMISSION: these bytes are inert inside `id="…"` and a working handler inside `id='…'`.
        expect(markupOf({ id: "it's" })).toBe('<div id="it\'s"></div>');
        expect(markupOf({ id: 'a`b' })).toBe('<div id="a`b"></div>');
        // Exactly the characters this escaper declines to touch: one attribute holding punctuation
        // under the current quoting, `id` then a real `onclick` under a single-quoted head.
        expect(markupOf({ id: "x' onclick='alert(1)" })).toBe(
            '<div id="x\' onclick=\'alert(1)"></div>'
        );
        // Under an UNQUOTED head a space, tab, newline or `=` each ends the value on its own, so a
        // value holding all four must stay ONE attribute: `<div id=a b=c>` is a forged `b`.
        expect(markupOf({ id: 'a b=c' })).toBe('<div id="a b=c"></div>');
        const TAB = String.fromCharCode(0x09);
        const LF = String.fromCharCode(0x0a);
        expect(markupOf({ id: 'a' + TAB + 'onclick=x' })).toBe(
            '<div id="a' + TAB + 'onclick=x"></div>'
        );
        expect(markupOf({ id: 'a' + LF + 'onclick=x' })).toBe(
            '<div id="a' + LF + 'onclick=x"></div>'
        );
    });

    it('escapes the double quote, so the value it is wrapped in cannot be ended', () => {
        // The character the quoting style makes load-bearing is the one that never gets through.
        expect(markupOf({ id: 'x" onclick="alert(1)' })).toBe(
            '<div id="x&quot; onclick=&quot;alert(1)"></div>'
        );
        // Counted as well as compared: an element with one static attribute contains exactly TWO
        // literal double quotes however hostile the value, and a third is a value that got out.
        for (const value of ['x" onclick="alert(1)', '""""', '"', 'a"b"c', '&quot;']) {
            const markup = markupOf({ id: value });
            expect(markup.split('"').length - 1, `two quotes around ${JSON.stringify(value)}`).toBe(
                2
            );
            // Zero reads the same for `id='…'` and a bare `id=…`, so the shape is named too.
            expect(markup.startsWith('<div id="')).toBe(true);
            expect(markup.endsWith('"></div>')).toBe(true);
        }
    });

    it('escapes with the SAME function the port writers use, not a second copy of the rules', () => {
        // A static `id` and a bound `id` produce the same bytes because `emit` CALLS the escaper
        // rather than agreeing with it. Inlining "just the three replacements it needs" passes
        // every quoting test above while silently dropping U+00A0 or the ordering.
        //
        // U+00A0 is built from its code point and never written as the literal character: a literal
        // one reads as an ordinary space in the editor, the diff and the review.
        const NBSP = String.fromCharCode(0xa0);
        const values = ['a&b', 'a<b>c', 'a"b', NBSP, 'a' + NBSP + 'b', '&<>"' + NBSP, ''];
        for (const value of values) {
            expect(markupOf({ id: value }), JSON.stringify(value)).toBe(
                '<div id="' + escapeExoAttributeValue(value) + '"></div>'
            );
        }
        // Spelled out as well as derived, so the loop above is visibly not vacuously true.
        expect(markupOf({ id: 'a' + NBSP + 'b' })).toBe('<div id="a&nbsp;b"></div>');
        expect(markupOf({ id: '&<>"' + NBSP })).toBe('<div id="&amp;&lt;&gt;&quot;&nbsp;"></div>');
        // And a PLAIN space is left alone: a test whose "space" is really a U+00A0 never checks it.
        expect(markupOf({ id: 'a b' })).toBe('<div id="a b"></div>');
    });
});
