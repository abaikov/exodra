import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createExoNamedSchema } from '../factories/createExoNamedSchema';
import { createExoSchema } from '../factories/createExoSchema';
import { harvestExoSchema } from '../factories/harvestExoSchema';
import { withExoSchemaAsserts } from '../cursor/withExoSchemaAsserts';
import { EXO_PORT_ATTR } from '../ports/constants/EXO_PORT_ATTR';
import { EXO_PORT_CHILDREN } from '../ports/constants/EXO_PORT_CHILDREN';
import { EXO_PORT_EVENT } from '../ports/constants/EXO_PORT_EVENT';
import { EXO_PORT_REF } from '../ports/constants/EXO_PORT_REF';
import { EXO_PORT_TEXT } from '../ports/constants/EXO_PORT_TEXT';

import type { TExoAttrPort } from '../ports/types/TExoAttrPort';
import type { TExoChildrenPort } from '../ports/types/TExoChildrenPort';
import type { TExoEventPort } from '../ports/types/TExoEventPort';
import type { TExoPortName } from '../ports/types/TExoPortName';
import type { TExoRefPort } from '../ports/types/TExoRefPort';
import type { TExoCursorDeclaration } from '../types/TExoCursorDeclaration';
import type { TExoSchemaCursor } from '../cursor/types/TExoSchemaCursor';
import type { TExoSchemaDraft } from '../cursor/types/TExoSchemaDraft';
import { exoSchemaShape } from './exoSchemaShape';
import type { TExoShapeNode } from './exoSchemaShape';

/** The implementation signature an overloaded delegation needs: the cursor's port mints each take
 *  either a port or a name, and a class may carry the two declarations with one body. */
type TDelegate<TPort> = (a?: unknown, b?: unknown) => TPort;
import type { TExoTextPort } from '../ports/types/TExoTextPort';

function checkedSchema<TPorts>(
    build: (b: TExoSchemaCursor) => TPorts
): TExoCursorDeclaration<TPorts> {
    return createExoSchema<TPorts>(build, withExoSchemaAsserts);
}

function checkedNamedSchema<TPorts>(
    build: (b: TExoSchemaCursor<TPorts>) => void
): TExoCursorDeclaration<TPorts> {
    return createExoNamedSchema<TPorts>(build, withExoSchemaAsserts);
}

describe('createExoSchema', () => {
    it('numbers ports in the order they were DECLARED, not in document order', () => {
        // The cursor declares the span's text port BEFORE the root's attribute port, and the
        // number follows the declaration: no backend derives it from a walk of its own, so
        // there is nothing for a second walk to disagree with.
        const schema = createExoSchema((b) => {
            let text: TExoTextPort | undefined;
            let attr: TExoAttrPort | undefined;
            b.el('li', null, (li) => {
                li.el('span', null, (span) => {
                    text = span.textPort();
                });
                attr = li.port('data-id');
            });
            return { text: text!, attr: attr! };
        });

        expect(schema.ports.text.index).toBe(0);
        expect(schema.ports.attr.index).toBe(1);
        expect(schema.portList).toHaveLength(2);
        expect(schema.portList[0]).toBe(schema.ports.text);
        expect(schema.portList[1]).toBe(schema.ports.attr);
        expect(schema.declaredPorts).toBe(0);
    });

    it('numbers an element as: its attribute and event ports, then its content, then children', () => {
        const schema = createExoSchema((b) => {
            const ports: Record<string, { index: number }> = {};
            b.el('div', null, (div) => {
                ports.a = div.port('data-a');
                ports.click = div.eventPort('click');
                ports.children = div.childrenPort();
            });
            return ports;
        });

        expect(schema.ports.a.index).toBe(0);
        expect(schema.ports.click.index).toBe(1);
        expect(schema.ports.children.index).toBe(2);
    });

    it('records each port with the kind it was declared as', () => {
        const schema = createExoSchema((b) => {
            const out: Record<string, { kind: number; name: string | null }> = {};
            b.el('button', null, (btn) => {
                out.attr = btn.port('data-x');
                out.event = btn.eventPort('click');
                out.text = btn.textPort();
            });
            return out;
        });

        expect(schema.ports.attr.kind).toBe(EXO_PORT_ATTR);
        expect(schema.ports.attr.name).toBe('data-x');
        expect(schema.ports.event.kind).toBe(EXO_PORT_EVENT);
        expect(schema.ports.event.name).toBe('click');
        expect(schema.ports.text.kind).toBe(EXO_PORT_TEXT);
        expect(schema.ports.text.name).toBeNull();
    });

    it('gives a children port its own kind', () => {
        const schema = createExoSchema((b) => {
            let rows: { kind: number } | undefined;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows: rows! };
        });
        expect(schema.ports.rows.kind).toBe(EXO_PORT_CHILDREN);
    });

    it('keeps static attributes in declaration order, which is the order both backends emit', () => {
        const schema = createExoSchema((b) => {
            b.el('div', { class: 'a', id: 'b' });
            return {};
        });
        expect(exoSchemaShape(schema).attrs).toEqual(['class', 'a', 'id', 'b']);
    });

    it('holds no compiled schema: every backend caches its own on the machine', () => {
        const schema = createExoSchema((b) => {
            b.el('div');
            return {};
        });
        expect(Object.keys(schema).sort()).toEqual([
            'build',
            'declaredPorts',
            'portList',
            'ports',
            'rootTag',
        ]);
    });

    it('refuses a cursor that declared no element, at the first replay of the markup', () => {
        expect(() => harvestExoSchema(createExoSchema(() => ({})))).toThrow(/no element/);
    });

    it('refuses a cursor that declared a SECOND root, naming the count and the tags', () => {
        // NOT BELT AND BRACES. `createExoSchema` takes `kids[0]` as the root and `numberPorts`/
        // `collectPorts` walk only that one, so a second top-level element vanishes from the
        // markup while its ports keep the `-1` they are created with — and a wire filling one of
        // them indexes a setter table at `-1`.
        expect(() =>
            harvestExoSchema(
                createExoSchema((b) => {
                    b.el('div');
                    b.el('span');
                    return {};
                })
            )
        ).toThrow(/produced 2 roots \(<div>, <span>\)/);
    });

    it('counts every top-level kid, not just the elements among them', () => {
        // Static text and a children port are dropped exactly as an element is, and a port
        // dropped this way is the one that later reads `setters[-1]`.
        expect(() =>
            harvestExoSchema(
                createExoSchema((b) => {
                    b.el('div');
                    b.text('stray');
                    return {};
                })
            )
        ).toThrow(/produced 2 roots \(<div>, the static text "stray"\)/);
        expect(() =>
            harvestExoSchema(
                createExoSchema((b) => {
                    b.el('ul');
                    b.childrenPort();
                    return {};
                })
            )
        ).toThrow(/produced 2 roots \(<ul>, a children port\)/);
    });

    it('still refuses a cursor whose only top-level kid is not an element', () => {
        // One kid, so the multi-root check does not fire — and it is text, so there is no root
        // to number ports against, so the older message is the one that fires, and it still says so.
        expect(() =>
            harvestExoSchema(
                createExoSchema((b) => {
                    b.text('just text');
                    return {};
                })
            )
        ).toThrow(/no element/);
    });

    it('numbers a nested tree depth-first, so a port deep in the first branch precedes a shallow one in the second', () => {
        const schema = createExoSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('div', null, (div) => {
                div.el('section', null, (section) => {
                    section.el('span', null, (span) => {
                        out.deep = span.textPort();
                    });
                });
                div.el('footer', null, (footer) => {
                    out.shallow = footer.port('data-f');
                });
            });
            return out;
        });
        expect(schema.ports.deep.index).toBe(0);
        expect(schema.ports.shallow.index).toBe(1);
    });
});

/**
 * TWO SHAPES REFUSED WHERE THE SCHEMA IS DECLARED, both because the two backends cannot build
 * them the same way — and both found by reading the compilers against each other rather than by
 * anything failing. A rule that lives here is inherited by every backend, present and future, and
 * names the line the author wrote instead of a position inside a compiler they have never opened.
 */
describe('an attribute declared twice on one element', () => {
    it('is refused when a port repeats a static attribute', () => {
        // WHAT IT WOULD HAVE PRODUCED, and it is two different pages from one schema:
        //   server   <div id="a" id="b">  — both attributes printed; a parser keeps the FIRST
        //   DOM      <div id="a">         — the same markup parsed to one attribute, which the
        //                                   port's setter then OVERWRITES, so the page shows "b"
        // Nothing anywhere said a word about it, and hydration adopts the server's version.
        expect(() =>
            checkedSchema((b) => {
                b.el('div', { id: 'a' }, (d) => {
                    d.port('id');
                });
                return {};
            })
        ).toThrow(/already has a STATIC attribute spelled "id"/);
    });

    it('is refused when two ports name the same attribute', () => {
        // The same divergence from the other direction: the server prints two attributes and a
        // browser keeps the first, while the DOM backend has ONE attribute that both setters
        // write, so the last fill wins.
        expect(() =>
            checkedSchema((b) => {
                b.el('div', null, (d) => {
                    d.port('data-id');
                    d.port('data-id');
                });
                return {};
            })
        ).toThrow(/already has a port spelled "data-id"/);
    });

    it('compares MARKUP spellings, so CLASS and class are one attribute', () => {
        // The markup spelling is the lowercase, and both backends print it. Comparing the raw
        // names would let through exactly the pair that collides.
        expect(() =>
            checkedSchema((b) => {
                b.el('div', { class: 'row' }, (d) => {
                    d.port('CLASS');
                });
                return {};
            })
        ).toThrow(/already has a STATIC attribute spelled "class"/);
    });

    it('leaves an event port and an attribute port of the same name alone', () => {
        // An event port writes no markup on any backend, so there is nothing for it to collide
        // with — refusing this would refuse a program that renders identically on both sides.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('div', null, (d) => {
                out.click = d.eventPort('click');
                out.attr = d.port('click');
            });
            return out;
        });
        expect(schema.portList).toHaveLength(2);
    });

    it('leaves the same name on two DIFFERENT elements alone', () => {
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('ul', { id: 'list' }, (ul) => {
                ul.el('li', null, (li) => {
                    out.id = li.port('id');
                });
            });
            return out;
        });
        expect(schema.portList).toHaveLength(1);
    });
});

describe('a property port whose markup form is somewhere it cannot reach', () => {
    // A REFUSAL THAT EXISTS BECAUSE THE SHAPE WORKED — in the browser, which is what made it
    // dangerous. `port('value')` on a `<select>` drove the control perfectly and could not be
    // SERVED at all: a `<select>` has no `value` content attribute, so `@exodra/string` printed
    // nothing and the served page showed the FIRST option whatever the wire said. The markup that
    // says which option is chosen is ` selected` on the OPTION — a different element, past this
    // port's own slot, and both compilers cut exactly one slot per port. See
    // `check-misplaced-property-port` for the whole ladder, including the two pairs that are NOT
    // refused and why.

    it('refuses `value` on a <select> and names the option port', () => {
        expect(() =>
            checkedSchema((b) => {
                b.el('select', null, (s) => {
                    s.port('value');
                });
                return {};
            })
        ).toThrow(/port\("value"\) on <select> cannot be SERVED/);
        // THE FIX IS PART OF THE CONTRACT, not decoration: a refusal that names only the fault
        // deletes a feature, and this one is asserted to name the spelling that works.
        expect(() =>
            checkedSchema((b) => {
                b.el('select', null, (s) => {
                    s.port('value');
                });
                return {};
            })
        ).toThrow(/port\('selected'\)/);
    });

    it('refuses `value` on an <output> and names the text port', () => {
        // Same defect, different slot: an `<output>`'s value IS its text content, so a
        // `textPort()` writes the very state this port could not print.
        expect(() =>
            checkedSchema((b) => {
                b.el('output', null, (o) => {
                    o.port('value');
                });
                return {};
            })
        ).toThrow(/textPort\(\)/);
    });

    it('leaves `value` on a <textarea> and `indeterminate` alone', () => {
        // NEITHER IS THE SAME CASE. A textarea's only other spelling is its TEXT, which is its
        // DEFAULT value — it stops moving the control once the user types — so refusing it would
        // trade a wrong page for a dead control, and the gap stays open and named instead.
        // `indeterminate` has no markup form ANYWHERE in HTML, so there is nothing to point at
        // and nothing lost by writing the port; hydration applies it.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('div', null, (d) => {
                d.el('textarea', null, (t) => {
                    out.text = t.port('value');
                });
                d.el('input', { type: 'checkbox' }, (i) => {
                    out.mixed = i.port('indeterminate');
                });
            });
            return out;
        });
        expect(schema.portList).toHaveLength(2);
    });

    it('leaves `value` on the elements where it IS an attribute alone', () => {
        // The default is "ordinary attribute", and that covers every tag the table does not name
        // — an `<option>`, a `<button>`, a `<div>` — where both backends write and remove the
        // same attribute and there is nothing to refuse.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('div', null, (d) => {
                d.el('option', null, (o) => {
                    out.option = o.port('value');
                });
                d.el('input', null, (i) => {
                    out.input = i.port('value');
                });
            });
            return out;
        });
        expect(schema.portList).toHaveLength(2);
    });
});

describe('a text port inside a raw-text element', () => {
    // The serialiser writes a Text node LITERALLY when its parent is one of these, so the
    // server's escaped `&lt;` and the DOM's `.data` write are different bytes — and the escaped
    // one is broken anyway, since a `<script>` decodes no character references. Writing it raw
    // instead cannot be offered: nothing escapes `</script`, so a value could end the element
    // and ship markup of its own, on the server only. See `assertExoNoTextPortInRawText`.
    for (const tag of ['script', 'style', 'noscript', 'iframe']) {
        it(`is refused inside <${tag}>`, () => {
            expect(() =>
                checkedSchema((b) => {
                    b.el(tag, null, (e) => {
                        e.textPort();
                    });
                    return {};
                })
            ).toThrow(/RAW TEXT element/);
        });
    }

    it('is allowed inside <textarea> and <title>, which the serialiser DOES escape', () => {
        // The refusal is the serialiser's literal list and not "anything that looks raw".
        // `<textarea>` and `<title>` are escapable raw text: a browser decodes entities in them
        // and the serialiser escapes what it writes, so the two backends agree there.
        for (const tag of ['textarea', 'title']) {
            const schema = checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el(tag, null, (e) => {
                    out.text = e.textPort();
                });
                return out;
            });
            expect(schema.portList).toHaveLength(1);
        }
    });

    it('leaves a CHILDREN port in a raw-text element alone — it is the way out', () => {
        // Raw content that belongs in a `<script>` goes in as MARKUP through a port that owns
        // the element (the `unsafeHtml` hatch), which is written raw on BOTH backends by
        // design. Refusing that too would leave the shape with no expression at all.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('script', null, (e) => {
                out.body = e.childrenPort();
            });
            return out;
        });
        expect(schema.portList).toHaveLength(1);
    });
});

describe('STATIC text inside a raw-text element', () => {
    // The text is emitted VERBATIM by both compilers now — escaping it produced the same broken
    // bytes on both sides, which is why no parity test ever objected — so the element's boundary
    // has nothing holding it up but this refusal. See `assertExoIntactRawTextBoundary`.

    it('is accepted when it merely contains characters HTML would otherwise escape', () => {
        // The whole point of the change: this is the shape that was shipping `.a &gt; .b` to the
        // CSS parser, which reads the entity as six literal characters and matches nothing.
        const schema = checkedSchema((b) => {
            b.el('style', null, (s) => {
                s.text('.a > .b { color: red } .c::after { content: "&" }');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    for (const [tag, text] of [
        ['script', 'var a = "</script>"'],
        ['script', 'var a = "</script "'],
        ['script', 'var a = "</script/>"'],
        ['script', 'var a = "</SCRIPT >"'],
        ['style', '.a { content: "</style>" }'],
    ] as ReadonlyArray<readonly [string, string]>) {
        it(`is refused inside <${tag}> when it holds ${JSON.stringify(text)}`, () => {
            expect(() =>
                checkedSchema((b) => {
                    b.el(tag, null, (e) => {
                        e.text(text);
                    });
                    return {};
                })
            ).toThrow(new RegExp(`<${tag}>[\\s\\S]*RAW TEXT element`));
        });
    }

    it('names the tag and the sequence it found', () => {
        expect(() =>
            checkedSchema((b) => {
                b.el('script', null, (e) => {
                    e.text('f("</SCRIPT >")');
                });
                return {};
            })
        ).toThrow(/closing sequence/);
    });

    it('is refused when the sequence is SPLIT across two text calls', () => {
        // Both compilers merge a run of adjacent static text before emitting it — the parser sees
        // one Text node either way — so neither half needs to contain the sequence for the markup
        // to. A per-call check would be stepped around by exactly the author who wanted to.
        expect(() =>
            checkedSchema((b) => {
                b.el('script', null, (e) => {
                    e.text('var a = "</scr');
                    e.text('ipt> and more"');
                });
                return {};
            })
        ).toThrow(/closing sequence/);
    });

    it('is refused when the sequence is split across THREE text calls', () => {
        expect(() =>
            checkedSchema((b) => {
                b.el('style', null, (e) => {
                    e.text('</st');
                    e.text('y');
                    e.text('le> x');
                });
                return {};
            })
        ).toThrow(/closing sequence/);
    });

    it('is NOT refused for `</script` with no terminator after it', () => {
        // The tokenizer emits an end tag only when `</script` is followed by whitespace, `/` or
        // `>`; anything else — including the `<` of whatever the compiler appends next — makes
        // the whole run ordinary character data. Refusing this would refuse a page that works.
        const schema = checkedSchema((b) => {
            b.el('script', null, (s) => {
                s.text('var a = "</scriptable";');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('is refused when the sequence is the LAST thing in the run and a PORT follows it', () => {
        // THE RULE THAT HOLDS THIS SHAPE IS THE PORT'S. A children port in a raw-text element must
        // be that element's ONLY child, so a static cannot stand in front of one at all — and the
        // boundary across which the static's last eight characters could spell a closing sequence
        // does not exist. The schema is refused at the port rather than at the `text()`, one call
        // later and by name.
        expect(() =>
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('script', null, (s) => {
                    s.text('var x = "</script');
                    out.body = s.childrenPort();
                });
                return out;
            })
        ).toThrow(/must be its ONLY child/);
    });

    it('is ACCEPTED when the sequence ends the run and NOTHING follows it', () => {
        // WAS REFUSED IN EVERY BUILD, on a run that renders correctly. The only thing a compiler
        // can emit after this run is the element's own `</script>`, and `<` is not a terminator —
        // which is a fact about the tokenizer, not a decision either backend is free to change.
        // See the enumeration in `closingSequenceAt` for the four other things that could have
        // followed and the rule that refuses each of them.
        const schema = checkedSchema((b) => {
            b.el('script', null, (s) => {
                s.text('var x = "</script');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('is ACCEPTED when the run ends on the sequence after a SECOND text() call', () => {
        // The merge still makes the run the unit — what changed is that a run merely ENDING on
        // the sequence is not a match. A third call supplying a terminator would be, and is
        // pinned in `assertExoIntactRawTextBoundary.test.ts`.
        const schema = checkedSchema((b) => {
            b.el('script', null, (s) => {
                s.text('var a = "</scr');
                s.text('ipt');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('is ACCEPTED for a run-ending sequence spelled in the other case', () => {
        // Both halves are still compared lowercased — `</SCRIPT ` closes a `<script>` and is still
        // refused. What is accepted is the run that stops before any terminator, in either case.
        const schema = checkedSchema((b) => {
            b.el('script', null, (s) => {
                s.text('f("</SCRIPT');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('no longer decides a benign static followed by a children port — the PORT rule does', () => {
        // WAS "still accepts", AND THE SHAPE IS REFUSED NOW, one call later than this describe.
        // What refuses it is not this rule — the text is harmless and stays harmless — but
        // `assertExoSoleChildRawTextPort`, which requires a children port in a raw-text element to
        // be that element's ONLY child. The message names the port, not the text.
        expect(() =>
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('script', null, (s) => {
                    s.text('var config = 1;');
                    out.body = s.childrenPort();
                });
                return out;
            })
        ).toThrow(/must be its ONLY child/);
    });

    it('has no PARTIAL-sequence residue left, because the boundary cannot be built', () => {
        // WAS AN OPEN RESIDUE, SAID OUT LOUD: `</scri` here plus a port value beginning `pt>`
        // closed the element between them, and this rule could not see it — it runs at `text()`,
        // where the next call has not happened, and refusing every tail that is a prefix of
        // `</script` would refuse a run ending in a bare `<`. What kept it shut was in
        // @exodra/string: `refuseSharedHtml`, plus "every instance's markup begins with `<`".
        //
        // IT IS CLOSED FROM THE OTHER END. The static is still accepted BY THIS RULE, and the
        // schema is still refused, because a children port may not stand behind a static in a
        // raw-text element at all — so there is no boundary for a sequence to be spelled across,
        // whatever @exodra/string later decides about raw markup.
        expect(() =>
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('script', null, (s) => {
                    s.text('var x = "</scri');
                    out.body = s.childrenPort();
                });
                return out;
            })
        ).toThrow(/ONLY child/);
    });

    it('still accepts the same static when NO port follows it', () => {
        // The legitimate neighbour of both refusals above: a partial sequence in the middle of a
        // `<script>`'s text is ordinary source and is not refused by anything. `</scri` is not a
        // closing sequence, and with no port behind it there is nothing to complete it.
        const schema = checkedSchema((b) => {
            b.el('script', null, (s) => {
                s.text('var x = "</scri" + tail;');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('is NOT refused inside <textarea> or <title>, whose text is still ESCAPED', () => {
        // RCDATA, not raw text: a browser DOES decode character references in these, both
        // compilers therefore still escape their static text, and `</textarea>` written there
        // comes out as `&lt;/textarea&gt;` and closes nothing. The refusal above exists only
        // because raw text has no escape mechanism to reach for.
        for (const tag of ['textarea', 'title']) {
            const schema = checkedSchema((b) => {
                b.el(tag, null, (e) => {
                    e.text(`</${tag}> & < >`);
                });
                return {};
            });
            expect(schema.portList).toHaveLength(0);
        }
    });

    it('leaves the same text alone outside a raw-text element', () => {
        // A `<p>` holding the characters `</script>` is escaped by both compilers and prints
        // `&lt;/script&gt;`, which ends nothing. The refusal is about the ELEMENT, not the string.
        const schema = checkedSchema((b) => {
            b.el('p', null, (p) => {
                p.text('write </script> to end it');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });
});

describe('a CHILDREN port inside a raw-text element', () => {
    // THE RULE: it must be the element's ONLY child. That is the same condition
    // `exoWriterForPort` calls `ownsElement` and `refuseSharedHtml` spells out one wire later —
    // asked at BUILD time, and about every filler rather than only about raw markup, because the
    // other fillers do not throw. A nested instance inside a `<script>` is markup on the server,
    // where no parser reads it back as an element, and real element nodes in the browser.
    // See `assertExoSoleChildRawTextPort`.

    for (const tag of ['script', 'style', 'noscript', 'iframe']) {
        it(`is allowed inside <${tag}> when it is the ONLY child — the unsafeHtml hatch`, () => {
            const schema = checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el(tag, null, (e) => {
                    out.body = e.childrenPort();
                });
                return out;
            });
            expect(schema.portList).toHaveLength(1);
        });

        it(`is refused inside <${tag}> when a static stands in front of it`, () => {
            expect(() =>
                checkedSchema((b) => {
                    const out: Record<string, { index: number }> = {};
                    b.el(tag, null, (e) => {
                        e.text('/* base */');
                        out.body = e.childrenPort();
                    });
                    return out;
                })
            ).toThrow(/must be its ONLY child/);
        });
    }

    it('says how many siblings it found, so the author knows which one to look for', () => {
        expect(() =>
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('script', null, (s) => {
                    s.text('var a = 1;');
                    s.text('var b = 2;');
                    out.body = s.childrenPort();
                });
                return out;
            })
        ).toThrow(/2 sibling/);
    });

    it('refuses a SECOND children port in the same raw-text element', () => {
        // Two ports and nothing else: neither can be `set`, because neither owns the element, so
        // the pair has no filler that both works and agrees. The first one is fine; the second one
        // sees it in `kids`.
        expect(() =>
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('style', null, (s) => {
                    out.a = s.childrenPort();
                    out.b = s.childrenPort();
                });
                return out;
            })
        ).toThrow(/must be its ONLY child/);
    });

    it('leaves a children port with siblings alone OUTSIDE a raw-text element', () => {
        // THE LEGITIMATE NEIGHBOUR, and the ordinary shape of every list in the renderer: a port
        // between static siblings in a `<div>`. Nothing about raw text applies, and refusing this
        // would refuse most of the pages this library exists to build.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('div', null, (d) => {
                d.el('h1', null, (h) => h.text('Title'));
                out.rows = d.childrenPort();
            });
            return out;
        });
        expect(schema.portList).toHaveLength(1);
    });

    it('is refused inside <textarea> and <title> TOO, and says RCDATA when it is', () => {
        // WAS "is deliberately NOT asked", and the reversal is the whole point of this case. The
        // old note answered two of the three bullets in `assertExoSoleChildRawTextPort` and dropped
        // the third. The two it answered stand: the BOUNDARY half really does not exist in RCDATA,
        // whose text both compilers escape, and the `set` half really is general, since a shared
        // port refuses raw markup in a `<div>` too. The INSTANCE half is the dropped one, and it
        // applies here character for character — a nested instance beside this static prints its
        // MARKUP into the `<textarea>` on the server, where a parser reads it back as part of the
        // value, and inserts a real element node in the browser. That is the same divergence
        // `assertExoNoElementInRawText` extended itself over one tag list, on the same argument: the two
        // lists disagree about ESCAPING, and neither of these rules is about escaping.
        for (const tag of ['textarea', 'title']) {
            expect(() =>
                checkedSchema((b) => {
                    const out: Record<string, { index: number }> = {};
                    b.el(tag, null, (e) => {
                        e.text('label');
                        out.rest = e.childrenPort();
                    });
                    return out;
                })
            ).toThrow(/RCDATA element[\s\S]*must be its ONLY child/);
        }
    });

    it('still allows a children port that OWNS its <textarea>', () => {
        // THE LEGITIMATE NEIGHBOUR, and the reason the rule is about the SHAPE and not the tag:
        // what is refused is a port that SHARES its element, in either content model. A port that
        // is the only child is the one arrangement whose filler cannot diverge.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('textarea', null, (e) => {
                out.body = e.childrenPort();
            });
            return out;
        });
        expect(schema.portList).toHaveLength(1);
    });

    it('does not print the raw-text BOUNDARY sentence for an RCDATA element', () => {
        // The message may only carry the half of the argument that is true of the element it
        // names. `</scr` in a static plus `ipt>` in a port's value ends a `<script>` on the served
        // page; the same trick against a `<textarea>` reaches the page as `&lt;/textarea` and ends
        // nothing, so printing it here would send an author to fix a hazard they do not have.
        let message = '';
        try {
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('textarea', null, (e) => {
                    e.text('label');
                    out.rest = e.childrenPort();
                });
                return out;
            });
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('RCDATA element');
        expect(message).toContain('two pages');
        expect(message).not.toContain('</scr');
        expect(message).not.toContain('served page');
        // And it points at the port an RCDATA element actually wants, which is not the hatch.
        expect(message).toContain('textPort()');
    });
});

describe('a child ELEMENT inside an RCDATA element', () => {
    // WAS AN OPEN BACKEND SPLIT, WRITTEN DOWN IN `assertExoNoElementInRawText` AND PINNED IN @exodra/dom.
    // `<textarea>` and `<title>` are not in `EXO_RAW_TEXT_ELEMENTS` and must not be — the two
    // lists disagree about ESCAPING, which is what every other file asking about raw text cares
    // about — but this rule is not about escaping. RCDATA recognises no TAG either, so the server
    // printed `<textarea><b></b></textarea>` while `assertExoUnreshapedMarkup` threw on the identical
    // bytes: the same divergence as `<style>`'s, one tag list over.

    for (const tag of ['textarea', 'title']) {
        it(`is refused inside <${tag}>`, () => {
            expect(() =>
                checkedSchema((b) => {
                    b.el(tag, null, (e) => {
                        e.el('b');
                    });
                    return {};
                })
            ).toThrow(new RegExp(`<b> is declared inside <${tag}>`));
        });
    }

    it('names RCDATA rather than RAW TEXT, because the two are not the same fact', () => {
        // The message an author reads has to be the true one: a character reference IS decoded in
        // a `<textarea>`, which is why a text port is allowed in there and refused in a `<script>`.
        // What it decodes to is a CHARACTER, never a tag.
        expect(() =>
            checkedSchema((b) => {
                b.el('textarea', null, (t) => {
                    t.el('span');
                });
                return {};
            })
        ).toThrow(/RCDATA element/);
    });

    it('still accepts static text and a text port in the same elements', () => {
        // THE LEGITIMATE NEIGHBOUR. Everything that was legal inside these two stays legal: their
        // content model is TEXT and both backends write text there identically, escaped. Only the
        // shape HTML cannot express — an element — is gone.
        for (const tag of ['textarea', 'title']) {
            const withStatic = checkedSchema((b) => {
                b.el(tag, null, (e) => {
                    e.text('a < b & c');
                });
                return {};
            });
            expect(withStatic.portList).toHaveLength(0);

            const withPort = checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el(tag, null, (e) => {
                    out.text = e.textPort();
                });
                return out;
            });
            expect(withPort.portList).toHaveLength(1);
        }
    });

    it('still accepts an element NEXT TO one, which is where content belongs', () => {
        const schema = checkedSchema((b) => {
            b.el('div', null, (d) => {
                d.el('label', null, (l) => l.text('Notes'));
                d.el('textarea', null, (t) => t.text('...'));
                d.el('b', null, (x) => x.text('after'));
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });
});

describe('a child ELEMENT inside a raw-text element', () => {
    // THE SPLIT THIS CLOSES. `compileExoStrSchema` printed `<style><b></b></style>` — its kid loop
    // recurses into an element whatever the parent is — while `compileExoDomSchema` parses that same
    // markup back and `assertExoUnreshapedMarkup` found a `<style>` holding one TEXT node and refused it.
    // A page from the server, a throw at module load in the browser, out of ONE schema.
    //
    // Neither compiler was wrong: everything between a raw-text element's tags is CHARACTERS, so
    // there is no markup a server can print that a parser turns back into an element in there.
    // Refused at schema-BUILD time now, so neither compiler ever sees it. See
    // `assertExoNoElementInRawText`.

    for (const tag of ['style', 'script']) {
        it(`is refused inside <${tag}>, naming both tags`, () => {
            expect(() =>
                checkedSchema((b) => {
                    b.el(tag, null, (s) => {
                        s.el('b');
                    });
                    return {};
                })
            ).toThrow(new RegExp(`<b>[\\s\\S]*<${tag}>[\\s\\S]*RAW TEXT`));
        });
    }

    it("is refused for the rest of the serialiser's literal list too", () => {
        // The rule is `EXO_RAW_TEXT_ELEMENTS`, not the two tags anybody thinks of first.
        for (const tag of ['noscript', 'iframe', 'noembed', 'noframes', 'xmp', 'plaintext']) {
            expect(() =>
                checkedSchema((b) => {
                    b.el(tag, null, (s) => {
                        s.el('span');
                    });
                    return {};
                })
            ).toThrow(/RAW TEXT/);
        }
    });

    it('is refused when the raw-text element is NESTED rather than the root', () => {
        // The check reads the CURSOR`S OWN node, so depth is not part of it — pinned because a
        // fix that only looked at the schema's outermost tag would pass the root case.
        expect(() =>
            checkedSchema((b) => {
                b.el('div', null, (d) => {
                    d.el('style', null, (s) => {
                        s.el('b');
                    });
                });
                return {};
            })
        ).toThrow(/RAW TEXT/);
    });

    it('is refused inside <textarea> and <title> TOO, and says RCDATA when it is', () => {
        // WAS "is NOT refused", and the reversal is the point rather than a detail.
        // `EXO_RAW_TEXT_ELEMENTS` still names neither, deliberately: their text is escapable, a
        // browser decodes character references in them, both compilers escape what they write
        // there, and every OTHER file asking about raw text is asking about exactly that. This
        // rule is not. RCDATA recognises no TAG either, so `<b>` between `<textarea>` and
        // `</textarea>` is characters on the server and a Text node in the browser's parse of the
        // same bytes — the same divergence, refused now by a second tag list,
        // `EXO_RCDATA_ELEMENTS`. The full case lives in its own describe above.
        for (const tag of ['textarea', 'title']) {
            expect(() =>
                checkedSchema((b) => {
                    b.el(tag, null, (e) => {
                        e.el('b');
                    });
                    return {};
                })
            ).toThrow(/RCDATA element/);
        }
    });

    it('is NOT refused inside an ordinary element', () => {
        const schema = checkedSchema((b) => {
            b.el('p', null, (p) => {
                p.el('b');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('leaves a raw-text element holding nothing but TEXT alone', () => {
        // The shape the refusal recommends, and the one both compilers emit verbatim.
        const schema = checkedSchema((b) => {
            b.el('style', null, (s) => {
                s.text('.a > .b { color: red }');
            });
            return {};
        });
        expect(schema.portList).toHaveLength(0);
    });

    it('still leaves a CHILDREN port in a raw-text element alone', () => {
        // The other way out, and the reason this rule is about ELEMENTS rather than about
        // "anything inside a <script>": a port filled with `set` is the `unsafeHtml` hatch,
        // written raw on the server and with `innerHTML` in the browser — one Text node on both
        // sides. Pinned beside the refusal so that widening one into the other fails here.
        const schema = checkedSchema((b) => {
            const out: Record<string, { index: number }> = {};
            b.el('script', null, (e) => {
                out.body = e.childrenPort();
            });
            return out;
        });
        expect(schema.portList).toHaveLength(1);
    });
});

/**
 * WHAT THIS SIMULATES, AND WHAT IT DOES NOT. Under vitest `NODE_ENV` is `test`, so every guard in
 * these files is live and every assertion above reads the development message. Setting the
 * variable to `production` around a call makes the guard expression evaluate to `false`, which is
 * the same value a bundler's `define` folds it to — so this observes exactly what a production
 * build's REMAINING code does. What it cannot observe is the minifier's deletion pass: whether the
 * check is inside the folded condition (deleted with it) or beside it (kept) is a property of the
 * SOURCE SHAPE, and the shape is what these two files changed. The two are only equivalent because
 * the guard is written out at the site, which `browserGlobalSafety.test.ts` asserts textually.
 *
 * The precedent for this way of testing is `@exodra/dom`'s `exo-events.test.ts`, which pins the
 * same property for `createExoDelegatedEvents` after the same mistake.
 */
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

describe('the raw-text refusals are NOT dev-only — they ship', () => {
    // WHY THESE TWO ARE NOT STRIPPABLE, in one line: a raw-text element has no escape mechanism,
    // so a value carrying `</script` ends the element and the rest of the schema is parsed as
    // markup — the document's STRUCTURE changes. Both checks were written
    // `if (guard && COND) throw`, which a production build deletes ENTIRELY, condition included.
    // A static is also not always typed where it is declared: a nonce, a base URL, a CMS field or
    // a per-deployment constant reaches the call as a value the developer's machine never saw.
    // See the two-baskets note in `createExoSchema.ts` and both raw-text refusal files.

    it('refuses a `</script>` payload in a raw-text STATIC under NODE_ENV=production', () => {
        expect(() =>
            underProduction(() =>
                checkedSchema((b) => {
                    b.el('script', null, (s) => {
                        s.text('var cfg = "</script><img src=x onerror=alert(1)>";');
                    });
                    return {};
                })
            )
        ).toThrow('EXO0009');
    });

    it('refuses it under production when it is SPLIT across two text() calls', () => {
        // The merge both compilers do is what makes the run the unit, and production must see the
        // run for the same reason development does — otherwise the shipped refusal is the one that
        // is trivially stepped around.
        expect(() =>
            underProduction(() =>
                checkedSchema((b) => {
                    b.el('style', null, (s) => {
                        s.text('.a { content: "</sty');
                        s.text('le> x" }');
                    });
                    return {};
                })
            )
        ).toThrow('EXO0009');
    });

    it('refuses a run ENDING on the closing sequence, before a port, under production', () => {
        // The end-of-run case belongs in the shipped half for the reason the whole file does: the
        // static that ends on `</script` is exactly the one a host application, a CMS field or a
        // template compiler can hand over, and the port after it prints a value straight into the
        // raw text. A build that accepts it in silence serves a document whose structure the
        // value chooses.
        //
        // WHICH RULE HOLDS IT: `assertExoSoleChildRawTextPort`, not an end-of-run branch in
        // `closingSequenceAt`. With a children port required to be its element's ONLY child there
        // is nothing a run can spell a sequence ACROSS, and an end-of-run branch would charge for
        // that reach with a false refusal — `.text('</script').text('able')` is the legal string
        // `</scriptable`.
        //
        // The assertion names that rule by its CODE, since that refusal is in the third shape and
        // a production build prints `EXO0005` and the names. A throw about a closing sequence here
        // means an end-of-run branch is back and the enumeration in `assertExoIntactRawTextBoundary`
        // needs re-reading.
        expect(() =>
            underProduction(() =>
                checkedSchema((b) => {
                    const out: Record<string, { index: number }> = {};
                    b.el('script', null, (s) => {
                        s.text('var x = "</script');
                        out.body = s.childrenPort();
                    });
                    return out;
                })
            )
        ).toThrow('EXO0005 "script" 1');
    });

    it('refuses a text PORT inside a raw-text element under NODE_ENV=production', () => {
        expect(() =>
            underProduction(() =>
                checkedSchema((b) => {
                    b.el('script', null, (e) => {
                        e.textPort();
                    });
                    return {};
                })
            )
        ).toThrow('EXO0012');
    });

    it('accepts a benign static in the same position under production', () => {
        // The other half of the change: what ships is a REFUSAL, not a scare. A stylesheet with a
        // child selector in it, and a `</script` with no terminator after it, are both programs
        // that render correctly and must keep building in production.
        const schema = underProduction(() =>
            checkedSchema((b) => {
                // ONE root, deliberately: the "a schema is one element" refusal above IS
                // strippable and does not run here, so two roots would make this test pass for a
                // reason that has nothing to do with what it is asserting.
                b.el('div', null, (d) => {
                    d.el('style', null, (s) => {
                        s.text('.a > .b { color: red } .c::after { content: "&" }');
                    });
                    d.el('script', null, (s) => {
                        s.text('var a = "</scriptable";');
                    });
                });
                return {};
            })
        );
        expect(schema.portList).toHaveLength(0);
    });

    it('accepts a text port in <textarea> and a `</script>` string in a <p> under production', () => {
        // The rule is the serialiser's raw-text list, and production applies the same list as
        // development rather than a widened one. `<textarea>` is RCDATA — escapable — and a `<p>`
        // holding those characters prints `&lt;/script&gt;`, which ends nothing.
        const schema = underProduction(() =>
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('div', null, (d) => {
                    d.el('textarea', null, (t) => {
                        out.text = t.textPort();
                    });
                    d.el('p', null, (p) => {
                        p.text('write </script> to end it');
                    });
                });
                return out;
            })
        );
        expect(schema.portList).toHaveLength(1);
    });

    it('refuses a child ELEMENT in a raw-text or RCDATA parent under NODE_ENV=production', () => {
        // BOTH TAG LISTS ARE ASKED IN EVERY BUILD. With the guard wrapped around the CHECK, a
        // production build would build the schema and serve a divergent page.
        //
        // The message is in the THIRD shape — `EXO0004` and the two tag names — so this asserts
        // the whole string, not a substring: a code is a promise that exactly those characters
        // reach a console, and `toContain` would pass over a sentence grown back around it.
        for (const tag of ['style', 'textarea']) {
            let message = '';
            try {
                underProduction(() =>
                    checkedSchema((b) => {
                        b.el(tag, null, (e) => {
                            e.el('b');
                        });
                        return {};
                    })
                );
            } catch (e) {
                message = (e as Error).message;
            }
            expect(message).toBe(`EXO0004 "b" "${tag}"`);
        }
    });

    it('gives the child refusal its full sentence in a development build', () => {
        // The other half of the third shape's trade, and the reason the code is not a loss: the
        // identical call in a development build says everything the code stands in for — which
        // call, which child, which parent, which content model, and the way out. `errors.md` sends
        // a reader here first for exactly this reason.
        let message = '';
        try {
            checkedSchema((b) => {
                b.el('style', null, (e) => {
                    e.el('b');
                });
                return {};
            });
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('ExoSchemaCursor.el()');
        expect(message).toContain('<b> is declared inside <style>');
        expect(message).toContain('RAW TEXT element');
        expect(message).toContain('move it OUT');
        expect(message).not.toContain('EXO0004');
    });

    it('refuses a SHARED children port in a raw-text element under NODE_ENV=production', () => {
        // The shape a stripped build would otherwise accept is the divergence itself: a nested
        // instance printed as markup into a `<script>` by the server and inserted as real elements
        // by the browser, out of one schema.
        //
        // THE COUNT IS IN THE PAYLOAD, and that is the half of `EXO0005` worth pinning. A schema
        // assembled from data is the case the payload exists for — one kid on the developer's
        // machine, two on the deployment — so the number is the fact a local re-run does not
        // reproduce, and it has to be on the console.
        let message = '';
        try {
            underProduction(() =>
                checkedSchema((b) => {
                    const out: Record<string, { index: number }> = {};
                    b.el('script', null, (s) => {
                        s.text('var config = 1;');
                        out.body = s.childrenPort();
                    });
                    return out;
                })
            );
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toBe('EXO0005 "script" 1');
    });

    it('counts the siblings in the payload rather than saying there were some', () => {
        // Two kids, and the payload has to say two: the number is the only thing in this refusal
        // that a development run of an ASSEMBLED schema would not reproduce.
        let message = '';
        try {
            underProduction(() =>
                checkedSchema((b) => {
                    const out: Record<string, { index: number }> = {};
                    b.el('style', null, (s) => {
                        s.text('.a { color: red }');
                        s.text('.b { color: blue }');
                        out.body = s.childrenPort();
                    });
                    return out;
                })
            );
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toBe('EXO0005 "style" 2');
    });

    it('gives the port refusal its full sentence in a development build', () => {
        let message = '';
        try {
            checkedSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('script', null, (s) => {
                    s.text('var config = 1;');
                    out.body = s.childrenPort();
                });
                return out;
            });
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('ExoSchemaCursor.childrenPort()');
        expect(message).toContain('must be its ONLY child');
        expect(message).toContain('1 sibling');
        expect(message).toContain('innerHTML');
        expect(message).not.toContain('EXO0005');
    });

    it('carries the bare code in production and the whole sentence in dev', () => {
        // The second shape's whole trade: `false ? long : short` folds to `short`, so the long
        // literal leaves the bundle while the comparison, the throw and the `never` stay. This
        // code is bare, so the call, the element and the characters found are development's.
        const build = (): void => {
            checkedSchema((b) => {
                b.el('script', null, (s) => {
                    s.text('var end = "</script>";');
                });
                return {};
            });
        };

        let short = '';
        underProduction(() => {
            try {
                build();
            } catch (e) {
                short = (e as Error).message;
            }
        });
        let long = '';
        try {
            build();
        } catch (e) {
            long = (e as Error).message;
        }

        expect(short).toBe('EXO0009');
        expect(long).toContain('ExoSchemaCursor.text()');
        expect(long).toContain('<script>');
        expect(long).toContain('RAW TEXT element');
        expect(long).toContain('closing sequence');
        expect(long).toContain('</script>');
        expect(long).toContain('unsafeHtml');
        expect(long.length).toBeGreaterThan(short.length);
        expect(long).not.toContain('EXO0009');
    });

    it('is a bare code for the PORT refusal in production too', () => {
        const build = (): void => {
            checkedSchema((b) => {
                b.el('style', null, (e) => {
                    e.textPort();
                });
                return {};
            });
        };

        let short = '';
        underProduction(() => {
            try {
                build();
            } catch (e) {
                short = (e as Error).message;
            }
        });
        let long = '';
        try {
            build();
        } catch (e) {
            long = (e as Error).message;
        }

        expect(short).toBe('EXO0012');
        expect(long).toContain('ExoSchemaCursor.textPort()');
        expect(long).toContain('<style>');
        expect(long).toContain('RAW TEXT element');
        expect(long).toContain('unsafeHtml');
        expect(long).not.toContain('EXO0012');
    });

    it('is a SOURCE-SHAPE property: neither throw sits inside the stripped condition', () => {
        // The runtime assertions above cannot see the minifier, and the minifier is what deletes a
        // check written `if (guard && COND) throw`. So the shape itself is asserted: in both files
        // every `process.env.NODE_ENV` read must be the test of a CONDITIONAL EXPRESSION (the
        // `guard ? long : short` that folds to `short`) and never the left half of an `if` that
        // carries the refusal with it. This is the assertion that fails if either file goes back
        // to the cheaper shape, and it is text, so it is checkable.
        //
        // `browserGlobalSafety.test.ts` asserts the other half of the spelling — that the
        // `typeof` stands in front — across all three runtime packages.
        //
        // ALL FOUR RAW-TEXT REFUSALS ARE HELD TO IT, `assertExoNoElementInRawText` included: it covers
        // raw text and RCDATA in one function, and the same divergence in a second tag list cannot
        // get a different answer in a production build.
        for (const file of [
            'markup/asserts/assertExoIntactRawTextBoundary.ts',
            'markup/asserts/assertExoNoTextPortInRawText.ts',
            'markup/asserts/assertExoNoElementInRawText.ts',
            'markup/asserts/assertExoSoleChildRawTextPort.ts',
        ]) {
            const src = readFileSync(fileURLToPath(new URL('../' + file, import.meta.url)), 'utf8');
            const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
            const reads: ts.Node[] = [];
            const visit = (node: ts.Node): void => {
                if (
                    ts.isPropertyAccessExpression(node) &&
                    node.name.text === 'NODE_ENV' &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    node.expression.name.text === 'env'
                ) {
                    reads.push(node);
                }
                ts.forEachChild(node, visit);
            };
            ts.forEachChild(source, visit);

            expect(reads.length, `${file} reads process.env.NODE_ENV`).toBeGreaterThan(0);
            for (const read of reads) {
                // Walk out of the `!==` and the `&&` to whatever the whole guard is an operand of.
                let node: ts.Node = read;
                while (
                    ts.isBinaryExpression(node.parent) ||
                    ts.isParenthesizedExpression(node.parent)
                ) {
                    node = node.parent;
                }
                expect(
                    ts.isConditionalExpression(node.parent) && node.parent.condition === node,
                    `${file}: the NODE_ENV guard must be the test of a \`? :\` that folds to the ` +
                        'short message, not an `if` that takes the refusal away with it'
                ).toBe(true);
            }
        }
    });
});

/**
 * THE PORT NAMES ITSELF WHERE IT STANDS, and the schema function returns nothing.
 *
 * What these hold in place is that the name is an AUTHORING convenience and stops at the record:
 * the numbering is document order, no port object carries the name it was filed under, and a key
 * nobody declared in the markup is simply absent — completeness is not checked here and must not
 * become checked by accident.
 */
describe('a port that names itself where it stands', () => {
    interface TCardPorts {
        index: TExoAttrPort;
        title: TExoTextPort;
        toggle: TExoEventPort;
        details: TExoChildrenPort;
        box: TExoRefPort;
    }

    it('assembles the record the wiring factory reads, with no return value anywhere', () => {
        const schema = createExoNamedSchema<TCardPorts>((b) => {
            b.el('div', { class: 'card' }, (card) => {
                card.port('data-i', 'index');
                card.refPort('box');
                card.el('h3', null, (h3) => {
                    h3.textPort('title');
                });
                card.el('button', null, (btn) => {
                    btn.eventPort('click', 'toggle');
                });
                card.childrenPort('details');
            });
        });

        expect(schema.ports.index.kind).toBe(EXO_PORT_ATTR);
        expect(schema.ports.box.kind).toBe(EXO_PORT_REF);
        expect(schema.ports.title.kind).toBe(EXO_PORT_TEXT);
        expect(schema.ports.toggle.kind).toBe(EXO_PORT_EVENT);
        expect(schema.ports.details.kind).toBe(EXO_PORT_CHILDREN);

        // DOCUMENT ORDER, which naming does not disturb: the root's attribute and ref ports, then its kids
        // in the order they stand — the `<h3>`'s content, the `<button>`'s event port, and the
        // children port where it was declared.
        expect(schema.ports.index.index).toBe(0);
        expect(schema.ports.box.index).toBe(1);
        expect(schema.ports.title.index).toBe(2);
        expect(schema.ports.toggle.index).toBe(3);
        expect(schema.ports.details.index).toBe(4);
        expect(schema.portList).toHaveLength(5);
        expect(schema.portList[0]).toBe(schema.ports.index);
        expect(schema.portList[4]).toBe(schema.ports.details);
    });

    it('does not put the name on the port, so nothing a render walks holds one', () => {
        const schema = createExoNamedSchema<TCardPorts>((b) => {
            b.el('div', null, (card) => {
                card.port('data-i', 'index');
                card.el('h3', null, (h3) => {
                    h3.textPort('title');
                });
            });
        });

        // `name` is the MARKUP name and only ever that — the attribute a backend prints. The port
        // name lives in the record, which the wiring factory reads once when the module loads.
        expect(schema.ports.index.name).toBe('data-i');
        expect(schema.ports.title.name).toBeNull();
    });

    it('leaves a declared key that no markup names simply absent', () => {
        // COMPLETENESS IS NOT CHECKED, deliberately. An interface says what the wire may fill, not
        // what the markup must declare.
        const schema = createExoNamedSchema<TCardPorts>((b) => {
            b.el('div', null, (card) => {
                card.port('data-i', 'index');
            });
        });

        expect(Object.keys(schema.ports)).toEqual(['index']);
    });

    it('refuses two ports asking for the same name', () => {
        // The record is one object, so the second would overwrite the first and the overwritten
        // port would keep its slot on every backend with nobody able to reach it.
        expect(() =>
            checkedNamedSchema<{ title: TExoTextPort }>((b) => {
                b.el('div', null, (card) => {
                    card.el('h3', null, (h3) => {
                        h3.textPort('title');
                    });
                    card.el('h4', null, (h4) => {
                        h4.textPort('title');
                    });
                });
            })
        ).toThrow(/already has a port named "title"/);
    });

    it('refuses __proto__ as a port name', () => {
        // Assigning it on a plain object replaces the PROTOTYPE instead of adding a property, so
        // the port would not be in the record at all and nothing would say so.
        expect(() =>
            checkedNamedSchema((b) => {
                b.el('div', null, (card) => {
                    card.textPort('__proto__');
                });
            })
        ).toThrow(/"__proto__" cannot be a port name/);
    });

    it('refuses a callback that names ports AND returns a record', () => {
        // Two spellings of one thing. Merging them would have to decide which side wins a name
        // declared on both, and either answer silently drops a port the author wrote.
        expect(() =>
            harvestExoSchema(
                createExoSchema((b) => {
                    let attr!: TExoAttrPort;
                    b.el('div', null, (card) => {
                        card.port('data-x', 'attr');
                        attr = card.port('data-i');
                    });
                    return { attr };
                })
            )
        ).toThrow(/named the port "attr" AND returned a record/);
    });

    it('still takes the older spelling, where the callback returns the record', () => {
        const schema = createExoSchema((b) => {
            let title!: TExoTextPort;
            b.el('h3', null, (h3) => {
                title = h3.textPort();
            });
            return { title };
        });

        expect(schema.ports.title.index).toBe(0);
        expect(schema.portList[0]).toBe(schema.ports.title);
    });
});

const elementKidsOf = (node: TExoShapeNode): TExoShapeNode[] =>
    node.kids.filter((kid): kid is TExoShapeNode => 'tag' in kid);

const tagsOf = (node: TExoShapeNode): string[] => elementKidsOf(node).map((kid) => kid.tag);

describe('the cursor is ONE object that moves', () => {
    it('hands every nested callback the same object, at every depth', () => {
        const handed: unknown[] = [];
        let top: unknown;
        const schema = createExoSchema((b) => {
            top = b;
            b.el('div', null, (card) => {
                handed.push(card);
                card.el('span', null, (span) => {
                    handed.push(span);
                });
                card.el('p', null, (p) => {
                    handed.push(p);
                });
            });
            return {};
        });
        harvestExoSchema(schema);

        expect(handed).toHaveLength(3);
        for (const one of handed) expect(one).toBe(top);
    });

    it('stands on the child inside the callback and back on the parent after it', () => {
        const schema = createExoSchema((b) => {
            b.el('ul', null, (ul) => {
                ul.el('li', null, (li) => {
                    li.el('b');
                });
                ul.el('li');
                ul.text('tail');
            });
            return {};
        });

        expect(tagsOf(exoSchemaShape(schema))).toEqual(['li', 'li']);
        expect(tagsOf(elementKidsOf(exoSchemaShape(schema))[0])).toEqual(['b']);
        expect(exoSchemaShape(schema).kids).toHaveLength(3);
    });

    it('fork() copies the position, so moving one cursor does not move the other', () => {
        const schema = createExoSchema((b) => {
            b.el('section', null, (s) => {
                const held = s.fork();
                s.el('header', null, () => {
                    held.el('footer');
                });
            });
            return {};
        });

        expect(tagsOf(exoSchemaShape(schema))).toEqual(['header', 'footer']);
        expect(tagsOf(elementKidsOf(exoSchemaShape(schema))[0])).toEqual([]);
    });

    it('files a port minted through a fork in the same record', () => {
        const schema = createExoNamedSchema<{ deep: TExoTextPort }>((b) => {
            b.el('div', null, (card) => {
                const held = card.fork();
                card.el('span', null, () => {
                    held.el('em', null, (em) => {
                        em.textPort('deep');
                    });
                });
            });
        });

        expect(tagsOf(exoSchemaShape(schema))).toEqual(['span', 'em']);
        expect(schema.ports.deep.index).toBe(0);
        expect(schema.portList[0]).toBe(schema.ports.deep);
    });

    it('refuses a write through a cursor kept past the build', () => {
        let kept!: TExoSchemaCursor;
        checkedSchema((b) => {
            b.el('div', null, (card) => {
                kept = card;
            });
            return {};
        });

        expect(() => kept.text('late')).toThrow(/was building is FINISHED/);
        expect(() => kept.el('span')).toThrow(/was building is FINISHED/);
        expect(() => kept.textPort()).toThrow(/was building is FINISHED/);
        expect(() => kept.fork()).toThrow(/was building is FINISHED/);
    });

    it('refuses a write through a FORK kept past the build', () => {
        let kept!: TExoSchemaCursor;
        checkedSchema((b) => {
            b.el('div', null, (card) => {
                kept = card.fork();
            });
            return {};
        });

        expect(() => kept.el('span')).toThrow(/was building is FINISHED/);
    });

    it('closes the draft even when the build throws', () => {
        let kept!: TExoSchemaCursor;
        expect(() =>
            checkedSchema((b) => {
                b.el('div', null, (card) => {
                    kept = card;
                });
                b.el('div');
                return {};
            })
        ).toThrow();

        expect(() => kept.el('span')).toThrow(/was building is FINISHED/);
    });

    it('carries the bare code for a kept cursor in production', () => {
        let kept!: TExoSchemaCursor;
        checkedSchema((b) => {
            b.el('div', null, (card) => {
                kept = card;
            });
            return {};
        });

        let short = '';
        underProduction(() => {
            try {
                kept.text('late');
            } catch (e) {
                short = (e as Error).message;
            }
        });

        expect(short).toBe('EXO0087');
    });

    it('hands every nested callback the wrapper a caller put on `receiver`', () => {
        const tags: string[] = [];
        const schema = createExoSchema((b) => {
            // THE SAME DECORATOR THE ASSERTS CASE USES, and one class rather than two: a wrapper
            // that re-lists the mints by hand goes out of step with the cursor the day one is added,
            // which is how this case came to be missing three of them.
            const wrapper = new CountingCursor(b, tags);
            wrapper.receiver = wrapper;
            b.receiver = wrapper;

            wrapper.el('ul', null, (ul) => {
                ul.el('li', null, (li) => {
                    li.el('b');
                });
            });
            return {};
        });
        harvestExoSchema(schema);

        expect(tags).toEqual(['ul', 'li', 'b']);
        expect(tagsOf(exoSchemaShape(schema))).toEqual(['li']);
    });
});

class CountingCursor<TPorts = unknown> implements TExoSchemaCursor<TPorts> {
    private readonly inner: TExoSchemaCursor<TPorts>;
    private readonly tags: string[];

    constructor(inner: TExoSchemaCursor<TPorts>, tags: string[]) {
        this.inner = inner;
        this.tags = tags;
        inner.receiver = this;
    }

    get draft(): TExoSchemaDraft {
        return this.inner.draft;
    }

    get receiver(): TExoSchemaCursor<TPorts> {
        return this.inner.receiver;
    }

    set receiver(next: TExoSchemaCursor<TPorts>) {
        this.inner.receiver = next;
    }

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (cursor: TExoSchemaCursor<TPorts>) => void
    ): this {
        this.tags.push(tag);
        this.inner.el(tag, attrs, fn);
        return this;
    }

    text(value: unknown): this {
        this.inner.text(value);
        return this;
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    attrPort(a: TExoAttrPort | string, b?: string): TExoAttrPort {
        return (this.inner.attrPort as TDelegate<TExoAttrPort>)(a, b);
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    stringPort(a: TExoAttrPort | string, b?: string): TExoAttrPort {
        return (this.inner.stringPort as TDelegate<TExoAttrPort>)(a, b);
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    togglePort(a: TExoAttrPort | string, b?: string): TExoAttrPort {
        return (this.inner.togglePort as TDelegate<TExoAttrPort>)(a, b);
    }

    port(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort {
        return this.inner.port(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: TExoPortName<TPorts, TExoEventPort>): TExoEventPort;
    eventPort(a: TExoEventPort | string, b?: string): TExoEventPort {
        return (this.inner.eventPort as TDelegate<TExoEventPort>)(a, b);
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: TExoPortName<TPorts, TExoTextPort>): TExoTextPort;
    textPort(a?: TExoTextPort | string): TExoTextPort {
        return (this.inner.textPort as TDelegate<TExoTextPort>)(a);
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: TExoPortName<TPorts, TExoChildrenPort>): TExoChildrenPort;
    childrenPort(a?: TExoChildrenPort | string): TExoChildrenPort {
        return (this.inner.childrenPort as TDelegate<TExoChildrenPort>)(a);
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: TExoPortName<TPorts, TExoRefPort>): TExoRefPort;
    refPort(a?: TExoRefPort | string): TExoRefPort {
        return (this.inner.refPort as TDelegate<TExoRefPort>)(a);
    }

    fork(): TExoSchemaCursor<TPorts> {
        return this.inner.fork();
    }
}
describe('withExoSchemaAsserts', () => {
    it('is where every markup refusal now lives — the bare cursor makes none of them', () => {
        expect(() =>
            createExoSchema((b) => {
                b.el('a b');
                return {};
            })
        ).not.toThrow();

        expect(() =>
            checkedSchema((b) => {
                b.el('a b');
                return {};
            })
        ).toThrow(/is not a legal element name/);
    });

    it('refuses a cursor used after the callback it was handed to has RETURNED', () => {
        let stashed!: TExoSchemaCursor;

        expect(() =>
            checkedSchema((b) => {
                b.el('ul', null, (ul) => {
                    ul.el('li', null, (li) => {
                        stashed = li;
                    });
                    ul.el('li', null, () => {
                        stashed.text('meant for the first li');
                    });
                });
                return {};
            })
        ).toThrow(/callback for <li>, and that callback has RETURNED/);
    });

    it('carries the bare code and the tag for that refusal in production', () => {
        let short = '';
        underProduction(() => {
            let stashed!: TExoSchemaCursor;
            try {
                checkedSchema((b) => {
                    b.el('ul', null, (ul) => {
                        ul.el('li', null, (li) => {
                            stashed = li;
                        });
                        ul.el('li', null, () => {
                            stashed.text('meant for the first li');
                        });
                    });
                    return {};
                });
            } catch (e) {
                short = (e as Error).message;
            }
        });

        expect(short).toBe('EXO0088 "li"');
    });

    it('is what that refusal buys: the bare cursor writes into the element it now stands on', () => {
        let stashed!: TExoSchemaCursor;
        const schema = createExoSchema((b) => {
            b.el('ul', null, (ul) => {
                ul.el('li', null, (li) => {
                    stashed = li;
                });
                ul.el('li', null, () => {
                    stashed.text('meant for the first li');
                });
            });
            return {};
        });

        const [first, second] = elementKidsOf(exoSchemaShape(schema));
        expect(first.kids).toEqual([]);
        expect(second.kids).toEqual([{ text: 'meant for the first li' }]);
    });

    it('lets a decorator composed INSIDE it see every call, at every depth', () => {
        const tags: string[] = [];
        const schema = createExoSchema(
            (b) => {
                b.el('ul', null, (ul) => {
                    ul.el('li', null, (li) => {
                        li.el('b');
                    });
                });
                return {};
            },
            (cursor) => withExoSchemaAsserts(new CountingCursor(cursor, tags))
        );

        expect(tags).toEqual(['ul', 'li', 'b']);
        expect(tagsOf(exoSchemaShape(schema))).toEqual(['li']);
    });

    it('refuses to run once anything else has claimed `receiver`', () => {
        expect(() =>
            createExoSchema(
                (b) => {
                    b.el('ul', null, (ul) => {
                        ul.el('li');
                    });
                    return {};
                },
                (cursor) => {
                    const asserting = withExoSchemaAsserts(cursor);
                    asserting.receiver = cursor;
                    return asserting;
                }
            )
        ).toThrow(/not the outermost decorator/);
    });

    // WHERE `subtreeHoldsPorts` WENT: it was a field on a schema tree, and there is no tree. The
    // fact it carried — which elements a schema compiler has to walk to — is
    // `@exodra/dom`'s `schema-slot-elision.test.ts`, asked of the schema the markup produces.
    it('runs the markup function ONCE and keeps the numbers, not a tree, when it is done', () => {
        let runs = 0;
        const schema = checkedSchema((b) => {
            runs++;
            b.el('div', null, (d) => {
                d.el('header', null, (h) => {
                    h.el('h1', null, (t) => {
                        t.text('static');
                    });
                });
                d.el('section', null, (s) => {
                    s.el('span', null, (sp) => {
                        sp.textPort();
                    });
                });
            });
            return {};
        });

        expect(runs).toBe(1);
        expect(schema.rootTag).toBe('div');
        expect(schema.portList).toHaveLength(1);
        // The markup itself is kept as the FUNCTION, which is what every backend replays.
        expect(schema.build).toBeTypeOf('function');
    });

    it('leaves an element with NO callback able to stand on its own', () => {
        const schema = checkedSchema((b) => {
            b.el('ul', null, (ul) => {
                ul.el('li');
                ul.el('li');
            });
            return {};
        });

        expect(tagsOf(exoSchemaShape(schema))).toEqual(['li', 'li']);
    });
});
