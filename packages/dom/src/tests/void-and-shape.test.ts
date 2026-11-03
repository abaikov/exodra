// @vitest-environment jsdom
//
// THE SHAPES A SCHEMA MAY AND MAY NOT HAVE — the rules both compilers state in their comments
// and neither had anything asserting.
//
// Every rule below exists because the HTML PARSER is entitled to disagree with the markup it
// was handed. Neither backend parses anything — the DOM one BUILDS its prototype and clones it,
// the string one prints — but the page the server sends reaches its reader through a parser. So a
// shape the parser reshapes is not a rendering bug on either side taken alone: it is the served
// page and the client render being DIFFERENT TREES from the same schema, which is a page that
// hydrates into nonsense with nothing red anywhere.
//
// The legacy renderer had this pinned: `string/legacy/render-to-string.test.ts` asserted that a
// void element emits no closing tag and that a non-void empty one does, and
// `dom/legacy/errors.test.ts`
// asserted that a component with more than one root is refused BY NAME. Neither statement had a
// counterpart on this core, and both are still statements ABOUT this core — void elements are
// still special-cased in `compile-exo-str-schema` and `compileExoDomSchema`, and `createExoSchema` still
// takes exactly one root.
import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachineInitialState } from '@exodra/core';
import { createExoSchema, withExoSchemaAsserts } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoPort,
    TExoSchemaDecorator,
    TExoTextPort,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, exoDomSchemaOf, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const machineOf = (declaration: TExoCursorDeclaration<unknown>): TExoMachine<never> => ({
    declaration,
    forms: [],
    createInitialState: null,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
});

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();
// Its OWN base object: `withExoHydration` merges into what it is given, and the plain backend above
// has to stay plain for the pair of cases that say a client-only render asks nothing of a parser.
const EXO_PARSING = withExoHydration(withExoCompiler(new ExoDomBackend()));

/** The only exonode call the wired components below make. A method, so real exonodes fit. */
type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/**
 * A component with no ports — the markup and nothing else.
 *
 * Deliberately built with `createExoTestMachine` and an explicitly typed empty wire rather than with
 * `createExoStatic`: `createExoStatic`'s `TProps` is `void` on purpose, which is exactly what stops it being
 * handed to a `render` that passes a top-level instance its number. The shape under test here is
 * the MARKUP, so the component is spelled the way a backend's `render` can take it.
 */
const staticOf = (
    build: (b: TExoSchemaCursor) => void,
    decorate?: TExoSchemaDecorator<Record<string, never>>
) =>
    createExoTestMachine(
        (b: TExoSchemaCursor): Record<string, never> => {
            build(b);
            return {};
        },
        (): TExoMachineInitialState<unknown> => () => undefined,
        decorate
    );

/** Render one instance through the DOM backend and hand back the markup it produced. */
const fromDom = (component: TExoMachine<TExoDomNode>): string => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    return parent.innerHTML;
};

/** The same render through a backend composed to ADOPT, which is what carries `parserStability`. */
const fromParsingDom = (component: TExoMachine<TExoDomNode>): string => {
    const parent = host();
    EXO_PARSING.render(component, parent);
    return parent.innerHTML;
};

describe('a void element', () => {
    // `<br></br>` is not merely ugly. A browser re-parses it as TWO `<br>`s, so a server that
    // printed an end tag would send a page with twice the line breaks the client render builds
    // — and hydration, which walks the markup it is given, would land every later sibling one
    // node off. The legacy string renderer had these cases; this core had none.
    const CASES: ReadonlyArray<{
        readonly what: string;
        readonly markup: string;
        readonly build: (b: TExoSchemaCursor) => void;
    }> = [
        {
            what: 'br',
            markup: '<br>',
            build: (b) => {
                b.el('br');
            },
        },
        {
            what: 'hr',
            markup: '<hr>',
            build: (b) => {
                b.el('hr');
            },
        },
        {
            what: 'img with static attributes',
            markup: '<img src="x.png" alt="x">',
            build: (b) => {
                b.el('img', { src: 'x.png', alt: 'x' });
            },
        },
        {
            what: 'input',
            markup: '<input>',
            build: (b) => {
                b.el('input');
            },
        },
    ];

    for (const c of CASES) {
        it(`${c.what} emits no end tag, and both backends print the same bytes`, () => {
            const component = staticOf(c.build);
            expect(EXO_STR.render(component)).toBe(c.markup);
            expect(fromDom(component)).toBe(c.markup);
        });
    }

    it('is refused by BOTH compilers when the schema puts a text port inside it', () => {
        // A refusal at compile time, in a message naming the tag, is the whole value here. The
        // alternative is what the parser does with `<br> </br>`: the text placeholder becomes a
        // SIBLING of the `<br>`, the schema's walk lands on it, and the failure surfaces much later
        // as a text port writing into the wrong node.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let t!: TExoTextPort;
                b.el('br', null, (br) => {
                    t = br.textPort();
                });
                return { t };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.text(P.t, 'x');
                }
        );

        expect(() => EXO_STR.render(component)).toThrow(/void element/);
        expect(() => fromDom(component)).toThrow(/void element/);
    });

    it('is refused by BOTH compilers when the schema puts a static child inside it', () => {
        const component = staticOf((b) => {
            b.el('br', null, (br) => {
                br.text('nope');
            });
        });

        expect(() => EXO_STR.render(component)).toThrow(/void element/);
        expect(() => fromDom(component)).toThrow(/void element/);
    });
});

describe('an element with both a content port and static children', () => {
    it('is refused, because a content port stands for EVERYTHING inside its element', () => {
        // `compileExoDomSchema` refuses this by hand and says why: nothing in `ExoSchemaCursor`
        // stops an author declaring both, and the failure without the check is silent — the
        // static kids vanish from the markup while KEEPING the port numbers they were counted
        // for, so every setter after them is built against the wrong element. A page where half
        // the values are one element to the left is far worse than a throw at module load.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let t!: TExoTextPort;
                b.el('p', null, (p) => {
                    t = p.textPort();
                    p.text('static too');
                });
                return { t };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.text(P.t, 'x');
                }
        );

        expect(() => fromDom(component)).toThrow(/content port and static children/);
    });
});

describe('markup the HTML parser reshapes', () => {
    // WHO ASKS HAS MOVED AGAIN: the refusal is `backend.parserStability`, which `withExoHydration`
    // claims — so a page that was PARSED is refused and a client-only render links none of it.
    it('is NOT refused by a client-only render, which builds the tree as written', () => {
        const component = staticOf((b) => {
            b.el('table', null, (table) => {
                table.el('tr', null, (tr) => {
                    tr.el('td', null, (td) => {
                        td.text('x');
                    });
                });
            });
        });

        expect(fromDom(component)).toBe('<table><tr><td>x</td></tr></table>');
    });

    it('is refused by name when the reshaped element carries a port', () => {
        // `<table><tr>` is a `<tbody>` nobody wrote in every page the SERVER sends, so a walk
        // counted against the DECLARATION lands one element off — forever, silently, on every row.
        //
        // WHICH SIDE ASKS THE QUESTION HAS MOVED, and the two cases in this pair are what is left
        // of the difference. `compileExoDomSchema` used to parse its own markup and replay its
        // schema over the result, so a port was what forced a landing to be resolved and checked;
        // the compiler BUILDS its prototype now, nothing reshapes it, and the reshape a browser
        // still performs on the server's bytes is refused by the ADOPTING composition's
        // `@exodra/core’s assertExoParserStableChild`. So both cases here are one refusal,
        // reached whether or not anything is filled — and the message names the inserted section.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let id!: TExoAttrPort;
                b.el('table', null, (table) => {
                    table.el('tr', null, (tr) => {
                        id = tr.port('data-id');
                    });
                });
                return { id };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.id, 'x');
                }
        );

        expect(() => fromParsingDom(component)).toThrow(/<tbody>/);
    });

    it('is refused when the reshaped subtree is entirely static, rather than diverging', () => {
        // THE GAP THAT WAS PINNED HERE, AND THE DECISION THAT CLOSED IT. A verification over the
        // PARSED prototype only ran where a port forced the walk to resolve an element, so a table
        // with no ports in it went unseen: the DOM backend handed it to the parser, which inserted
        // a `<tbody>`, and every clone therefore carried a node the SERVER'S string does not. The
        // refusal is asked of the SCHEMA now, so this case and the one above are the same line.
        //
        // REFUSED RATHER THAN NORMALISED, and the reason is that normalising cannot be done on
        // one side. Inserting the `<tbody>` the parser would insert repairs the DOM backend's
        // copy of a schema the STRING backend also compiles — usually in another process — and
        // that one would go on printing `<table><tr>`. The refusal sends the author to write the
        // `<tbody>` in the schema, where both backends see it, which is the next case.
        const component = staticOf((b) => {
            b.el('table', null, (table) => {
                table.el('tr', null, (tr) => {
                    tr.el('td', null, (td) => {
                        td.text('x');
                    });
                });
            });
        });

        expect(() => fromParsingDom(component)).toThrow(/<tbody>/);
    });

    it('agrees on both backends once the <tbody> is written in the schema', () => {
        // The other half of the refusal above: the advice it gives has to WORK, or it is a
        // dead end with a friendly tone. Written out, the parser has nothing left to insert,
        // and the same schema prints the same bytes and builds the same tree on both sides.
        const component = staticOf((b) => {
            b.el('table', null, (table) => {
                table.el('tbody', null, (tbody) => {
                    tbody.el('tr', null, (tr) => {
                        tr.el('td', null, (td) => {
                            td.text('x');
                        });
                    });
                });
            });
        });

        expect(fromDom(component)).toBe(EXO_STR.render(component));
        expect(fromDom(component)).toBe('<table><tbody><tr><td>x</td></tr></tbody></table>');
    });

    it('is refused when a <p> auto-closes around a block child', () => {
        // The same class as the table and worth its own case, because it is the one an author
        // meets by accident: `<p>` is closed by the parser the moment a `<div>` starts, so the
        // `<div>` comes back as the paragraph's SIBLING in the page the server sends, while the
        // DOM backend builds it nested. Two trees, one schema.
        const component = staticOf((b) => {
            b.el('section', null, (s) => {
                s.el('p', null, (p) => {
                    p.el('div', null, (d) => {
                        d.text('x');
                    });
                });
            });
        });

        expect(() => fromParsingDom(component)).toThrow(/reshapes this schema's markup/);
    });

    it('refuses a run of static text the parser would foster-parent out of a <table>', () => {
        const component = staticOf((b) => {
            b.el('table', null, (table) => {
                table.text('loose');
            });
        });

        expect(() => fromParsingDom(component)).toThrow(/FOSTER-PARENTED/);
    });
});

describe('static text after a children port', () => {
    // FOUND WHILE CLOSING THE TWO ABOVE, AND IT IS THE SAME FAILURE SHAPE. A child list's end is
    // the next static ELEMENT (`childListEndSlot` in the DOM schema), or the end of the parent
    // when there is none. A Text node is neither, so the rows of this child list would be
    // appended AFTER the text while the server prints them BEFORE it: two backends, two orders,
    // and markup plausible enough that only an ordering assertion would have caught it.
    //
    // The parser has a hand in it too. Text on both sides of a child list merges into ONE Text
    // node — an empty child list emits nothing between them — so every sibling hop counted after
    // it addresses a position that does not exist.
    //
    // Text BEFORE a child list is untouched and stays legal: what precedes a child list does not
    // move its end.
    //
    // THE HALF THAT WAS MISSING, and it is the worst possible half to be missing: the DOM
    // compiler refused this shape and `compile-exo-str-schema` walked straight past it, so a
    // component with a label after a child list rendered perfectly on the server and threw the
    // moment a browser tried to build the same schema. Every SSR check green, and a user
    // finds it. The rule lives in `@exodra/core` now (`assert-exo-text-after-children-port`) and both
    // compilers call it, so the two cannot drift into different answers again.
    const KIDS_THEN_TEXT = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let kids!: TExoChildrenPort;
            b.el('p', null, (p) => {
                kids = p.childrenPort();
                p.text(' items');
            });
            return { kids };
        },
        (): TExoMachineInitialState<unknown> => () => undefined
    );

    const BACKENDS: ReadonlyArray<{ readonly what: string; readonly render: () => string }> = [
        { what: 'the DOM backend', render: () => fromDom(KIDS_THEN_TEXT) },
        { what: 'the STRING backend', render: () => EXO_STR.render(KIDS_THEN_TEXT) },
    ];

    for (const backend of BACKENDS) {
        it(`is refused by ${backend.what}, because a child list can only be anchored on an element`, () => {
            expect(backend.render).toThrow(/followed by the static text/);
        });
    }

    it('leaves text BEFORE a child list alone, on both backends and byte for byte', () => {
        // The rule is about what FOLLOWS a child list — what precedes one does not move its end —
        // and this is the case a careless widening of the refusal would break.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let kids!: TExoChildrenPort;
                b.el('p', null, (p) => {
                    p.text('items: ');
                    kids = p.childrenPort();
                });
                return { kids };
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        expect(EXO_STR.render(component)).toBe('<p>items: </p>');
        expect(fromDom(component)).toBe('<p>items: </p>');
    });
});

describe('an attribute declared twice on one element', () => {
    // WHY IT IS HERE AND NOT ONLY IN CORE'S OWN SUITE: this is a statement about the two
    // BACKENDS, and the only place both are in the room is this package. The schema is refused
    // where it is declared, so neither compiler ever sees it — which is exactly the property
    // worth pinning, because a refusal that only one compiler made would be the divergence
    // wearing a different hat.
    const collide = () =>
        createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let x!: TExoAttrPort;
                b.el('div', { id: 'static' }, (d) => {
                    x = d.port('id');
                });
                return { x };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.x, 'port');
                },
            withExoSchemaAsserts
        );

    it('never becomes a component, so neither backend can render it', () => {
        // What it printed before: `<div id="static" id="port">` from the server, which a browser
        // reads as `id="static"`, against `<div id="port">` from the DOM backend, whose setter
        // overwrote the static the clone carried. One schema, two pages, no error.
        expect(collide).toThrow(/already has a STATIC attribute spelled "id"/);
    });

    it('renders byte-identically once the name is written once', () => {
        // THE SHAPE THE REFUSAL RECOMMENDS: keep the port, put the default in the wire. Both
        // backends print the same bytes for it, which is the property the collision destroyed.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let x!: TExoAttrPort;
                b.el('div', null, (d) => {
                    x = d.port('id');
                });
                return { x };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.x, 'static');
                }
        );

        expect(EXO_STR.render(component)).toBe('<div id="static"></div>');
        expect(fromDom(component)).toBe('<div id="static"></div>');
    });
});

describe('a text port inside a raw-text element', () => {
    // The server escapes a text value; the HTML serialiser does NOT escape text whose parent is
    // one of these, so the DOM backend's `.data` write comes out raw. `<script>if (a &lt; b)`
    // against `<script>if (a < b)` — and the server's is not merely different, it is broken,
    // because raw text decodes no character references. Refused where the schema is declared,
    // so both backends refuse identically; see `@exodra/core`'s `assert-exo-text-port-in-raw-text` for why
    // writing it raw instead is a cross-site scripting hole rather than a fix.
    it('never becomes a component, so neither backend can render it', () => {
        expect(() =>
            createExoTestMachine(
                (b: TExoSchemaCursor) => {
                    let t!: TExoTextPort;
                    b.el('script', null, (s) => {
                        t = s.textPort();
                    });
                    return { t };
                },
                (P): TExoMachineInitialState<TSetting> =>
                    (c) => {
                        c.text(P.t, 'if (a < b) f()');
                    },
                withExoSchemaAsserts
            )
        ).toThrow(/RAW TEXT element/);
    });

    it('still escapes a text port in an ESCAPABLE raw-text element, identically on both', () => {
        // `<textarea>` and `<title>` look like the same thing and are not: a browser decodes
        // entities inside them and the serialiser escapes what it writes there, so escaping is
        // what both backends must do. This is the case that says the refusal above is the
        // serialiser's literal list rather than a guess about which elements look raw.
        const component = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let t!: TExoTextPort;
                b.el('textarea', null, (e) => {
                    t = e.textPort();
                });
                return { t };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.text(P.t, 'a < b & c');
                }
        );

        const markup = EXO_STR.render(component);
        expect(markup).toBe('<textarea>a &lt; b &amp; c</textarea>');
        expect(fromDom(component)).toBe(markup);
    });
});

describe('STATIC text inside a raw-text element', () => {
    // THE BUG THIS PINS WAS NOT A PARITY DEFECT, which is why nothing in this file caught it for
    // as long as it existed: both compilers put every static text kid through `escapeExoText`,
    // whatever its parent was, so the two backends printed the SAME bytes — and the same WRONG
    // bytes. A raw-text element decodes no character references, so `&gt;` reaches the CSS parser
    // as four literal characters and `&amp;&amp;` reaches the JavaScript parser as ten. The page
    // was byte-identical on both sides and the stylesheet did nothing.
    //
    // So the assertions below are deliberately of two kinds: the two backends AGREE, and what
    // they agree on contains the literal character. Only the second one would have failed before.

    it('emits a stylesheet verbatim on both backends, with a literal `>` in it', () => {
        const component = staticOf((b) => {
            b.el('style', null, (s) => {
                s.text('.a > .b { color: red }');
            });
        });

        const markup = EXO_STR.render(component);
        expect(markup).toBe('<style>.a > .b { color: red }</style>');
        expect(fromDom(component)).toBe(markup);
        // The child selector, as a character. `&gt;` here is a rule that matches nothing.
        expect(markup).toContain('.a > .b');
    });

    it('emits an inline script verbatim on both backends, with literal `&&` and `<`', () => {
        const component = staticOf((b) => {
            b.el('script', null, (s) => {
                // Self-contained on purpose: a DOM mount attaches this element to a live
                // document and jsdom EXECUTES it, so a script referencing undeclared names
                // throws an uncaught ReferenceError past the test and pollutes the run.
                // Declaring the operands keeps the `&&` and `<` this test is about.
                s.text('var a = 1, b = 2, x = 3, y = 4; var c = a && b; var d = x < y;');
            });
        });

        const markup = EXO_STR.render(component);
        expect(markup).toBe(
            '<script>var a = 1, b = 2, x = 3, y = 4; var c = a && b; var d = x < y;</script>'
        );
        expect(fromDom(component)).toBe(markup);
        expect(markup).toContain('a && b');
        expect(markup).toContain('x < y');
    });

    it('emits it verbatim when the raw-text element is NESTED, not the root', () => {
        // The escape happened in the shared text-run branch of both emit walks, so depth was
        // never part of it — and neither is the fix. Pinned because the root case alone would
        // pass a fix that only looked at the schema's outermost tag.
        const component = staticOf((b) => {
            b.el('div', null, (d) => {
                d.el('style', null, (s) => {
                    s.text('.a > .b { color: red }');
                });
            });
        });

        const markup = EXO_STR.render(component);
        expect(markup).toBe('<div><style>.a > .b { color: red }</style></div>');
        expect(fromDom(component)).toBe(markup);
    });

    it('still ESCAPES static text in <textarea> and <title>, which are RCDATA and not raw text', () => {
        // The two lists look like one and are not. A browser DECODES character references inside
        // `<textarea>` and `<title>` and the serialiser escapes what it writes there, so escaping
        // is what both backends must keep doing — dropping it here would be a new bug of exactly
        // the shape the change above fixed, pointing the other way. `EXO_RAW_TEXT_ELEMENTS` names
        // neither of them, and this is the assertion that says so out loud.
        const component = staticOf((b) => {
            b.el('textarea', null, (t) => {
                t.text('a < b & c');
            });
        });

        const markup = EXO_STR.render(component);
        expect(markup).toBe('<textarea>a &lt; b &amp; c</textarea>');
        expect(fromDom(component)).toBe(markup);
    });

    it('never becomes a component when the text carries the closing sequence', () => {
        // Nothing escapes `</script` — HTML gives raw text no escape mechanism at all — so this
        // text would end the element where it stands and the rest of the schema would be parsed
        // as markup after it. Refused at schema-BUILD time, so neither compiler ever sees it,
        // which is the property worth pinning here: a refusal only one compiler made would be
        // the divergence wearing a different hat.
        expect(() =>
            staticOf((b) => {
                b.el('script', null, (s) => {
                    s.text('var end = "</script>";');
                });
            }, withExoSchemaAsserts)
        ).toThrow(/<script>[\s\S]*RAW TEXT element/);
    });

    it('refuses an upper-case closing sequence followed by a space', () => {
        // Case-insensitive, and matching what the tokenizer terminates on rather than the exact
        // string `</script>`: `</SCRIPT ` closes the element and does not contain it.
        expect(() =>
            staticOf((b) => {
                b.el('script', null, (s) => {
                    s.text('var end = "</SCRIPT foo";');
                });
            }, withExoSchemaAsserts)
        ).toThrow(/<script>[\s\S]*RAW TEXT element/);
    });
});

describe('a child ELEMENT inside a raw-text element', () => {
    // THE SPLIT: `compile-exo-str-schema` printed `<style><b></b></style>` and `compileExoDomSchema`
    // could not build it — back when it parsed its own bytes, what came back was a `<style>`
    // holding one TEXT node and the shape check refused it by name. So the component rendered on
    // the server and threw at module load in the browser, which is the shape this file exists to
    // make impossible.
    //
    // Neither compiler was wrong about its own half. Everything between a raw-text element's
    // tags is CHARACTERS: no markup a server can print is parsed back into an element in there,
    // so the schema describes a tree HTML cannot express and only the side that re-parses its
    // own output finds out. Refused at schema-BUILD time now — see `@exodra/core`'s
    // `assert-exo-element-in-raw-text` — which is the property worth pinning HERE: the refusal is one
    // rule for both backends, not the DOM compiler's private objection.

    it('leaves the same element alone one level out, where both backends agree on it', () => {
        const component = staticOf((b) => {
            b.el('div', null, (d) => {
                d.el('style', null, (s) => {
                    s.text('.a > .b { color: red }');
                });
                d.el('b');
            });
        });

        const markup = EXO_STR.render(component);
        expect(markup).toBe('<div><style>.a > .b { color: red }</style><b></b></div>');
        expect(fromDom(component)).toBe(markup);
    });
});

describe('a cursor that declares more than one root element', () => {
    it('is refused by the DOM compile too, for a schema no wire ever asked its ports for', () => {
        expect(() =>
            exoDomSchemaOf(
                machineOf(
                    createExoSchema((b) => {
                        b.el('div');
                        b.el('span');
                        return {};
                    })
                ),
                EXO_BACKEND
            )
        ).toThrow(/produced 2 roots \(<div>, <span>\)/);
    });
});

describe('what the refusal tells a cursor that wanted siblings to do instead', () => {
    // THE ADVICE, EXECUTED. An error that recommends something nobody tried is a guess, so the
    // two shapes the message names are built here and rendered: the siblings live INSIDE the
    // root, and the run of them that varies is a children port standing where they stand.
    type TListing = {
        list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
    };

    /** One element carrying its own label — what goes into the child list. */
    const TAG = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let label!: TExoTextPort;
            b.el('span', { class: 'tag' }, (s) => {
                label = s.textPort();
            });
            return { label };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c, label) => {
                c.text(P.label, label);
            }
    );

    it('gives the siblings a root, and a children port holds the run that varies', () => {
        const CARD = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let tags!: TExoChildrenPort;
                b.el('div', { class: 'card' }, (card) => {
                    card.el('h3', null, (h) => h.text('title'));
                    tags = card.childrenPort();
                });
                return { tags };
            },
            (P): TExoMachineInitialState<TListing> =>
                (c) => {
                    c.list(P.tags, TAG, ['a', 'b']);
                }
        );

        const expected =
            '<div class="card"><h3>title</h3>' +
            '<span class="tag">a</span><span class="tag">b</span></div>';
        expect(EXO_STR.render(CARD)).toBe(expected);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        expect(parent.innerHTML).toBe(expected);
    });

    it('or stays two components, each rendered into the position it belongs in', () => {
        // The other half of the advice, and the literal answer to the cursor above: two roots
        // side by side at the TOP level is two components, not one schema.
        const FIRST = staticOf((b) => {
            b.el('div', null, (d) => d.text('one'));
        });
        const SECOND = staticOf((b) => {
            b.el('span', null, (s) => s.text('two'));
        });

        const parent = host();
        EXO_BACKEND.render(FIRST, parent);
        EXO_BACKEND.render(SECOND, parent);
        expect(parent.innerHTML).toBe('<div>one</div><span>two</span>');
        expect(EXO_STR.render(FIRST) + EXO_STR.render(SECOND)).toBe(parent.innerHTML);
    });
});
