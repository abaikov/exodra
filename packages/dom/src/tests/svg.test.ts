// @vitest-environment jsdom
//
// SVG — where an element's NAMESPACE decides what its attributes mean, and where this core
// gets the answer from a place the legacy renderer did not.
//
// The legacy renderer created elements one at a time and threaded the namespace down the tree by
// hand, so it needed seven cases (`src/legacy/svg.test.ts`) to pin that the namespace was inherited at
// build time, at insertion time, through a reactive list, through a swapped single child and
// through a template clone.
//
// THIS CORE WENT ROUND THAT AND THEN CAME BACK TO IT. A schema used to be one markup string parsed
// once into a `<template>`, so the HTML parser's own foreign-content rules decided every namespace
// and there was no code to get it wrong. `compileExoDomSchema` builds its prototype with
// `createElementNS` now — measured 25% cheaper than a parse of a ready-made string — so the
// namespace IS threaded down by hand again, together with the parser's two camel-case tables
// (`constants/exo-foreign-adjustments`) and its integration points. Every case in this file is
// therefore load-bearing in a way it was not: each one is a clause of that thread.
//
// THE PLACE IT BROKE BEFORE, and the two middle cases in this file are that break and its repair.
// A schema was parsed ON ITS OWN. A component whose root is `<circle>` has no `<svg>`
// above it in ITS markup, so the parser had no reason to treat it as foreign content — and
// nesting that component inside an `<svg>` child list at RUNTIME cannot retroactively change what
// the parser decided. The server has the opposite problem in the opposite direction: it prints
// one string, the browser parses the whole thing in context, and the circles come out as real
// SVG.
//
// So this was a place where a page rendered correctly on the server and wrongly in the browser —
// the failure shape this project treats as the worst one — and nothing was checking. It was also
// a REGRESSION: the legacy renderer's seven cases included children built later by a reactive
// list, which is exactly the shape below.
//
// THE REPAIR IS TO GIVE THE PARSER THE CONTEXT IT IS MISSING rather than to thread a namespace
// through the compiler: a schema whose root is an SVG-only tag is parsed inside a throwaway
// `<svg>` and lifted out of it (`dom/svg-rooted-schema`), which is the same bytes, through the
// same parser, in the same context the server's markup arrives in. What a tag name cannot decide
// is a root that is a real element in BOTH namespaces — `<a>`, `<title>`, `<script>`, `<style>`
// — and those stay HTML unless the schema's own markup holds an SVG-only element below them.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoMachineNode,
    TExoPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import {
    ExoDomBackend,
    withExoForeignNamespaces,
    withExoHydration,
    withExoCompiler,
} from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();
// Its OWN base object: the refusals below are `parserStability`, which only a backend composed to
// ADOPT carries, and `EXO_BACKEND` has to stay plain for every other case in this file.
const EXO_PARSING = withExoHydration(
    withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()))
);

const SVG_NS = 'http://www.w3.org/2000/svg';
const HTML_NS = 'http://www.w3.org/1999/xhtml';

type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/**
 * The nesting call, written against the surface every exonode shares — `never` as the
 * exonode parameter, as `exo-context.test.ts` does, so that a component built for a real
 * backend is accepted here without a cast.
 */
type TNesting = {
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};

/**
 * Every attribute on `el` whose name matches `lower` IGNORING CASE.
 *
 * The count is the assertion in most of the cases below, and it is deliberately not
 * `getAttribute`. The bug these pin is not a missing attribute, it is a SECOND one: the markup
 * made a real `viewBox` and the setter added a dead `viewbox` beside it, so an element that
 * looked right under `getAttribute('viewbox')` was drawing from the other one. Counting is also
 * the only form of the question that means the same thing in an environment that does not
 * implement the parser's attribute adjustment at all.
 */
const named = (el: Element, lower: string): Attr[] =>
    Array.from(el.attributes).filter((a) => a.name.toLowerCase() === lower);

describe('a schema whose root is <svg>', () => {
    it('puts the root and every descendant in the SVG namespace', () => {
        // THIS CASE WAS WRITTEN AS THE TRIPWIRE ON EXACTLY THE CHANGE THAT HAS SINCE HAPPENED.
        // It used to be free, because the markup was parsed whole; the note said that building the
        // prototype node by node would produce a tree that looks identical in the markup and
        // renders nothing on screen, since an `<svg>` in the HTML namespace draws no pixels. The
        // compiler does build it node by node now, so this is no longer free — it is the
        // assertion that `createElementNS` was reached for and that the namespace descended.
        const ICON = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('svg', { viewBox: '0 0 10 10' }, (s) => {
                    s.el('g', null, (g) => {
                        g.el('rect', { width: '4', height: '4' });
                    });
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        EXO_BACKEND.render(ICON, parent);
        const svg = parent.firstElementChild as Element;

        expect(svg.namespaceURI).toBe(SVG_NS);
        expect((svg.querySelector('g') as Element).namespaceURI).toBe(SVG_NS);
        expect((svg.querySelector('rect') as Element).namespaceURI).toBe(SVG_NS);
    });

    it('leaves HTML outside the <svg> alone', () => {
        // The rule has to STOP, or a page's real markup silently becomes foreign content. The
        // parser used to enforce it; the compiler's own descent does now, and a `<p>` beside an
        // `<svg>` is the case that tells the two apart.
        const CARD = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('div', null, (d) => {
                    d.el('svg', null, (s) => {
                        s.el('rect');
                    });
                    d.el('p');
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const div = parent.firstElementChild as Element;

        expect(div.namespaceURI).toBe(HTML_NS);
        expect((div.querySelector('p') as Element).namespaceURI).toBe(HTML_NS);
        expect((div.querySelector('rect') as Element).namespaceURI).toBe(SVG_NS);
    });

    it('writes a `class` port as an ATTRIBUTE inside SVG, where the property is read-only', () => {
        // `SVGElement.className` is a read-only `SVGAnimatedString`: assigning to it does
        // nothing at all, silently, so an SVG element styled by a bound class would simply never
        // be styled. `exo-attr-setter` asks the PROTOTYPE for its namespace once, when the schema
        // is compiled, and installs the `setAttribute` form — which it can only do because the
        // prototype is a real element by then.
        const ICON = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let cls!: TExoAttrPort;
                b.el('svg', null, (s) => {
                    s.el('rect', null, (r) => {
                        cls = r.port('class');
                    });
                });
                return { cls };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.cls, 'hot');
                }
        );

        const parent = host();
        EXO_BACKEND.render(ICON, parent);
        const rect = parent.querySelector('rect') as Element;

        expect(rect.getAttribute('class')).toBe('hot');
    });

    it('prints the same bytes on both backends', () => {
        // Foreign content is where a serialiser is most likely to differ from a printer: SVG
        // elements are not void, so `<rect>` needs an end tag the string backend has no special
        // case for, and the parser preserves the camelCase of `viewBox` that `setAttribute`
        // would have lowercased.
        const ICON = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('svg', { viewBox: '0 0 10 10' }, (s) => {
                    s.el('rect', { width: '4' });
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        EXO_BACKEND.render(ICON, parent);
        expect(parent.innerHTML).toBe(EXO_STR.render(ICON));
    });
});

describe('a component nested into an <svg> child list', () => {
    /** Each dot is handed its `cx` as params. */
    const DOT_CX = [1, 2, 3];

    /** A row whose ROOT is an SVG tag — and which therefore has no `<svg>` in its own markup. */
    const DOT = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let cx!: TExoAttrPort;
            b.el('circle', { r: '2' }, (c) => {
                cx = c.port('cx');
            });
            return { cx };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c, cx) => {
                c.attr(P.cx, cx);
            }
    );

    /** An `<svg>` with a children port in it, filled with a fixed list of those rows. */
    const CHART = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let dots!: TExoChildrenPort;
            b.el('svg', { viewBox: '0 0 10 10' }, (s) => {
                dots = s.childrenPort();
            });
            return { dots };
        },
        (P): TExoMachineInitialState<TNesting> =>
            (c) => {
                c.list(P.dots, DOT, DOT_CX);
            }
    );

    it('is in the SVG namespace, as the same markup from the server would be', () => {
        // WAS A SERVER/CLIENT DIVERGENCE, PINNED AS FAILING, AND FIXED — the note stays because
        // the failure it describes is one nothing else in this package can see.
        //
        // `DOT`'s schema is compiled on its own: `compileExoDomSchema` sets
        // `template.innerHTML = '<circle r="2" cx=""></circle>'`, and a `<circle>` with no
        // `<svg>` above it is not foreign content — the parser made an ordinary
        // `HTMLUnknownElement` in the XHTML namespace. Cloning it into an `<svg>` at render time
        // does not change its namespace: a node's namespace is fixed when it is created.
        //
        // WHAT IT COST. The SERVER prints one string, `<svg …><circle …>`, and the browser
        // parses the whole of it in context — so the served page drew three real circles. The
        // CLIENT render drew nothing at all, because an `HTMLUnknownElement` called `circle`
        // inside an `<svg>` is invisible. A chart, an icon set or any inline graphic assembled
        // from components appeared on first paint and VANISHED the moment the client took over,
        // and no assertion anywhere in this package went red, because the markup strings match
        // and only the namespaces differed.
        //
        // WHAT WAS DONE. `compileExoDomSchema` asks `exoSvgRootedSchema` whether the schema's
        // markup is SVG content and, when it is, creates the root in the SVG namespace and
        // descends in it — the same verdict the parser would reach about the server's page. No
        // render path gained a branch: the schema is still a clone of a prototype.
        const parent = host();
        EXO_BACKEND.render(CHART, parent);
        const circle = parent.querySelector('circle') as Element;

        expect(circle.namespaceURI).toBe(SVG_NS);
    });

    it('builds the same circles the server prints, namespace included', () => {
        // The companion to the case above and the reason it needs its own name. WHILE THE BUG
        // WAS LIVE, every assertion in this body except the last two passed: the client built
        // three `circle` elements exactly where the server printed three, in the same order,
        // with the same attributes, and drew nothing at all. "The two backends agree" and "the
        // two backends built the same thing" are not the same statement, and this case is the
        // demonstration — the namespace assertions are here so that a future change which
        // reverts to parsing every schema bare is caught by a structural test and not by a
        // blank chart in somebody's browser.
        const parent = host();
        EXO_BACKEND.render(CHART, parent);
        const built = Array.from(parent.querySelectorAll('circle'));

        const holder = document.createElement('template');
        holder.innerHTML = EXO_STR.render(CHART);
        const served = Array.from(holder.content.querySelectorAll('circle'));

        expect(built).toHaveLength(3);
        expect(served).toHaveLength(3);
        expect(built.map((c) => c.getAttribute('cx'))).toEqual(
            served.map((c) => c.getAttribute('cx'))
        );
        // And the thing that used to be the ONLY difference — stated here so the pair is
        // complete, and asserted on both sides so neither can drift alone.
        expect(served[0].namespaceURI).toBe(SVG_NS);
        expect(built[0].namespaceURI).toBe(SVG_NS);
    });
});

describe('a root tag that exists in BOTH namespaces', () => {
    // `<a>`, `<title>`, `<script>` and `<style>` are real elements in HTML and in SVG, so the
    // tag name is not evidence and the compiler does not pretend otherwise. These two cases are
    // the whole of what it does instead, written down because it is a decision with a cost on
    // each side: refusing `<a>` roots outright would break the commonest component anybody
    // writes, and guessing SVG for them would put every link on every page in a namespace where
    // `className` is read-only.
    it('is SVG when the schema itself holds an SVG-only element', () => {
        const LINKED_DOT = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('a', { href: '#x' }, (a) => {
                    a.el('circle', { r: '2' });
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        EXO_BACKEND.render(LINKED_DOT, parent);
        const a = parent.firstElementChild as Element;

        expect(a.namespaceURI).toBe(SVG_NS);
        expect((a.firstElementChild as Element).namespaceURI).toBe(SVG_NS);
    });

    it('is HTML when there is no such evidence, and a nested <svg> is not evidence', () => {
        // The second half is the one that would go wrong quietly: an HTML link wrapped around an
        // icon has SVG elements inside it, and they say nothing about the link, because the
        // `<svg>` between them opens foreign content by itself.
        const ICON_LINK = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('a', { href: '#x' }, (a) => {
                    a.el('svg', null, (s) => {
                        s.el('circle', { r: '2' });
                    });
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        EXO_BACKEND.render(ICON_LINK, parent);
        const a = parent.firstElementChild as Element;

        expect(a.namespaceURI).toBe(HTML_NS);
        expect((parent.querySelector('circle') as Element).namespaceURI).toBe(SVG_NS);
    });
});

describe('a camelCase attribute PORT on an SVG element', () => {
    // WHERE THE STATIC HALF AND THE BOUND HALF OF ONE SCHEMA DISAGREED WITH EACH OTHER.
    //
    // A static attribute keeps the author's spelling, so `<svg viewBox="…">` reaches the server's
    // bytes as written and a browser's "adjust SVG attributes" makes a real `viewBox` of it. A
    // PORT does not: both compilers use the LOWERCASED spelling, because `setAttribute` lowercases
    // — on an HTML element. In SVG it does not, and the same parser step turns the lowercase
    // ` viewbox=""` in the served markup back into `viewBox`.
    //
    // So the element carried a `viewBox` and the setter wrote a `viewbox` NOBODY READS. The
    // picture rendered from the server and then lost its viewBox the first time anything filled
    // the port. Same for `preserveAspectRatio`, `gradientUnits`, `refX`, `textLength` and some
    // fifty more; the legacy renderer used the raw key and had no such gap, so it was a regression.
    //
    // THE REPAIR IS THIS BACKEND'S OWN COPY OF THE PARSER'S TABLE
    // (`constants/exo-foreign-adjustments`), asked once per port by `exoAttrIdentity` and handed
    // to the writer the schema builds. The repair used to READ the name back: an empty attribute
    // was put on the prototype and the setter walked `proto.attributes` to see what it had become,
    // which only made sense while the prototype was PARSED from a markup string. It is built now,
    // so the table's answer is already in hand and writing it into the DOM to look it up again
    // would be asking the DOM to repeat this file's own arithmetic. The statics go through the
    // same function, which is what says the two halves of one schema agree; these cases are what
    // says the table agrees with a real parser.
    const BOXED = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let box!: TExoAttrPort;
            b.el('svg', null, (s) => {
                box = s.port('viewBox');
                s.el('rect', { width: '4' });
            });
            return { box };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.attr(P.box, '0 0 10 10');
            }
    );

    it('fills the attribute the markup created, instead of adding a dead one beside it', () => {
        const parent = host();
        EXO_BACKEND.render(BOXED, parent);
        const svg = parent.firstElementChild as Element;

        const box = named(svg, 'viewbox');
        expect(box).toHaveLength(1);
        expect(box[0].value).toBe('0 0 10 10');
    });

    it("writes the spelling the parser produced, which is the specification's adjusted form", () => {
        // THE SPELLING QUESTION, SETTLED AS ITS OWN CASE because it is the one claim here that
        // depends on the environment implementing "adjust SVG attributes". It is NOT the
        // author's spelling: the markup is lowercased before the parser ever sees it, so
        // `port('viewBox')`, `port('viewbox')` and `port('viewBOX')` are one attribute on the
        // page and must be one attribute here. It is what the parser makes of that lowercase.
        //
        // If this case ever goes red on its own while the one above stays green, the runtime
        // stopped adjusting foreign attributes — and the case above became vacuous, because
        // there was never a second name for a dead attribute to have.
        const parent = host();
        EXO_BACKEND.render(BOXED, parent);
        const svg = parent.firstElementChild as Element;

        expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');
        // Case-sensitive on a foreign element, so this is the dead attribute's own name.
        expect(svg.getAttribute('viewbox')).toBeNull();
    });

    it('follows the source afterwards, which is where the picture used to break', () => {
        // The failure had a shape: the FIRST render looked right, because the server's markup
        // (or nothing at all) supplied the viewBox, and the graphic collapsed on the first
        // update. So the update is pinned separately from the fill.
        const box = source('0 0 10 10');
        const schema = createExoSchema((b: TExoSchemaCursor) => {
            let port!: TExoAttrPort;
            b.el('svg', null, (s) => {
                port = s.port('viewBox');
                s.el('rect', { width: '4' });
            });
            return { port };
        });
        const m = createExoMachine<TExoMachineNode>(schema);
        const LIVE = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => {
                        c.attr(schema.ports.port, box.getValue());
                    },
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return box.onChange(() => show(c));
                    });
                })
        );
        const { show } = LIVE.transitions;

        const parent = host();
        EXO_BACKEND.render(LIVE, parent);
        const svg = parent.firstElementChild as Element;

        box.setValue('0 0 20 20');

        const after = named(svg, 'viewbox');
        expect(after).toHaveLength(1);
        expect(after[0].value).toBe('0 0 20 20');
    });

    it('is the same page as the server sends, though not the same string as it prints', () => {
        // THE ONE CLAIM THIS FILE CANNOT MAKE AS A BYTE COMPARE, and understanding why is the
        // difference between a gap and a category error. This case used to be `it.fails` on
        // `parent.innerHTML === EXO_STR.render(...)`, described as a divergence waiting for a
        // fix. The two strings ARE different, and neither backend is doing anything wrong: they
        // are not the same KIND of string.
        //
        //   `EXO_STR.render(...)` is markup as AUTHORED — the lowercase ` viewbox="…"` the port's
        //   name becomes on both sides, written by `exo-writer-for-port` into the server's output
        //   character for character.
        //   `parent.innerHTML` is markup SERIALISED BACK OUT of a tree, and "adjust SVG
        //   attributes" ran over that lowercase before the attribute existed — in a browser
        //   parsing the server's bytes, and in `compileExoDomSchema` building the prototype — so
        //   what comes back out is ` viewBox="…"`.
        //
        // THE SERVER'S OWN BYTES GO THROUGH THE SAME DOOR, which is what the last assertion says
        // and why there is nothing here to fix: parse the server's string the way a browser parses
        // it and serialise the result, and it is the client render's string exactly. A reader gets
        // one page from either backend; only the author's spelling is lost, on both sides, to a
        // parser rule neither of them owns.
        //
        // A STATIC attribute keeps the author's spelling in the markup (the case at the top of
        // this file) and is adjusted by the same rule, so it round-trips the same way. A port whose
        // name is already lowercase (the case below) has nothing to adjust and IS a byte compare.
        const parent = host();
        EXO_BACKEND.render(BOXED, parent);

        const bytes = EXO_STR.render(BOXED);
        expect(bytes).toContain(' viewbox="0 0 10 10"');
        expect(parent.innerHTML).toContain(' viewBox="0 0 10 10"');

        // Parsed in a `<template>` so nothing is loaded or laid out, and compared as `outerHTML`
        // on both sides so that the question is the ELEMENT's serialisation and not a template's.
        const holder = document.createElement('template');
        holder.innerHTML = bytes;
        expect((holder.content.firstElementChild as Element).outerHTML).toBe(
            (parent.firstElementChild as Element).outerHTML
        );
    });
});

describe('a lowercase attribute port on an SVG element', () => {
    it('prints the same bytes on both backends', () => {
        // WHERE PARITY STILL HOLDS, and the boundary of the gap above: nothing adjusts `fill`,
        // so the markup spelling, the parsed attribute and the setter's name are one string.
        // Most SVG attributes are this case.
        const FILLED = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let fill!: TExoAttrPort;
                b.el('svg', null, (s) => {
                    s.el('rect', { width: '4' }, (r) => {
                        fill = r.port('fill');
                    });
                });
                return { fill };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.fill, 'red');
                }
        );

        const parent = host();
        EXO_BACKEND.render(FILLED, parent);

        expect(parent.innerHTML).toBe(EXO_STR.render(FILLED));
        expect((parent.querySelector('rect') as Element).getAttribute('fill')).toBe('red');
    });
});

describe('a camelCase attribute port on an HTML element', () => {
    it('is still lowercased, and still byte-identical', () => {
        // THE CONTRAST CASE, and the reason the repair is asked of the NAMESPACE rather than
        // applied everywhere. On an HTML element `setAttribute` lowercases and the parser
        // adjusts nothing, so the lowercase form IS the name on the element — the overwhelmingly
        // common path, which must not have moved at all.
        const ODD = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let x!: TExoAttrPort;
                b.el('div', null, (d) => {
                    x = d.port('viewBox');
                });
                return { x };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.x, '0 0 10 10');
                }
        );

        const parent = host();
        EXO_BACKEND.render(ODD, parent);
        const div = parent.firstElementChild as Element;

        expect(named(div, 'viewbox')).toHaveLength(1);
        expect(div.getAttribute('viewbox')).toBe('0 0 10 10');
        expect(parent.innerHTML).toBe(EXO_STR.render(ODD));
    });
});

describe('a NAMESPACED attribute port', () => {
    // `xlink:href` is the same failure one layer deeper. The parser's "adjust foreign
    // attributes" turns it into an attribute in the XLINK NAMESPACE whose local name is `href`,
    // while `setAttribute('xlink:href', …)` creates a NULL-namespace attribute whose local name
    // is the whole string — a different attribute, standing beside the real one. Nothing in this
    // backend had ever written a namespaced attribute, and `assert-exo-illegal-attr-name` accepts the name.
    const XLINK = 'http://www.w3.org/1999/xlink';

    const ICON_USE = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let href!: TExoAttrPort;
            b.el('svg', null, (s) => {
                s.el('use', null, (u) => {
                    href = u.port('xlink:href');
                });
            });
            return { href };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.attr(P.href, '#star');
            }
    );

    it('fills the attribute the markup created, not a second one beside it', () => {
        const parent = host();
        EXO_BACKEND.render(ICON_USE, parent);
        const use = parent.querySelector('use') as Element;

        const href = Array.from(use.attributes).filter((a) => a.localName === 'href');
        expect(href).toHaveLength(1);
        expect(href[0].value).toBe('#star');
    });

    it('leaves it in the XLink namespace, which is where a renderer looks for it', () => {
        // Separate, for the reason the spelling case above is separate: this is the half that
        // needs the environment to implement foreign-attribute adjustment. An `<use>` whose
        // href is in the null namespace is not an error anywhere — it simply draws nothing in an
        // SVG 1.1 renderer.
        const parent = host();
        EXO_BACKEND.render(ICON_USE, parent);
        const use = parent.querySelector('use') as Element;

        expect(use.getAttributeNS(XLINK, 'href')).toBe('#star');
    });
});

describe('HTML inside SVG content', () => {
    it('is refused by name when it would break OUT of the SVG', () => {
        // Not a limitation of this backend: the HTML parser closes foreign content the moment it
        // meets a tag like `<div>`, so `<g><div>` makes the `<div>` a SIBLING of the `<svg>` in
        // the page the server sends. There is no page in which this schema means what it looks
        // like, so it is refused where the mistake still has a name.
        //
        // WHO REFUSES IT HAS MOVED. The compiler used to hand its markup to a parser and notice
        // that the tree came back with two roots; it builds the tree now, where a `<div>` inside a
        // `<g>` simply nests and nothing notices. The refusal is a tag table the ADOPTING
        // composition asks (`@exodra/core’s assertExoParserStableChild`), and the list it
        // consults is the spec's own "any other start tag" set for foreign content.
        const BROKEN = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('g', null, (g) => {
                    g.el('div');
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        expect(() => EXO_PARSING.render(BROKEN, parent)).toThrow(/breaks OUT of the SVG/);
    });

    it('is accepted inside a <foreignObject>, which is where it belongs', () => {
        const LABELLED = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                b.el('foreignObject', { width: '10', height: '10' }, (fo) => {
                    fo.el('div', null, (d) => {
                        d.text('hi');
                    });
                });
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        );

        const parent = host();
        EXO_BACKEND.render(LABELLED, parent);

        expect((parent.firstElementChild as Element).namespaceURI).toBe(SVG_NS);
        expect((parent.querySelector('div') as Element).namespaceURI).toBe(HTML_NS);
    });
});
