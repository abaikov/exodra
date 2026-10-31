// @vitest-environment jsdom
//
// THE PROOF `writers` IS A PLUGIN INTERFACE AND NOT A DECORATION: an application composes a BACKEND with
// different writers, renders a real component through that backend, and what lands on the page is
// what the composition said.
//
// WHY THIS FILE IS SHAPED LIKE `exo-composed-render.test.ts` AND NOT LIKE AN ASSERTION ABOUT THE
// COMPOSED OBJECT. Every test of the form "`backend.writers` holds my pack" passes while
// `compileExoDomSchema` still reaches `createExoAttrSetter` and `setExoText` through static module
// imports — which is what those two lines were, and which is exactly the failure this repository
// has caught twice: the claim was about a data structure, not about the renderer. So the instrument
// here is an INERT pack, and the observable is a page with nothing on it:
//
//   1. the shipped composition writes the attribute and the text, and the pack's `attr` and `text`
//      are what the compiler asked (case 1 also pins the count — once per port per SCHEMA, not per
//      instance, which is the whole cost argument for reading the `writers` field at compile time);
//   2. an INERT pack renders an element with NO attribute and NO text — the airtight half. If any
//      path in the compiler still reached `createExoAttrSetter` or `setExoText` directly, the value would
//      appear anyway, and this is the only case that can see that;
//   3. a port an effect writes from a source goes through the pack exactly as a wired one does;
//   4. a NESTED component compiles under the same pack, because a composition that stopped at the
//      first child component would give an application its choice at the top level only;
//   5. `createExoPropertyWriters` puts a real ARRAY on a custom element — the case the shipped pack
//      cannot express at all, and the reason the interface exists.
//
// A SIXTH CASE STOOD HERE AND ITS SUBJECT IS GONE: the pack used to decide the compile-time
// PLACEHOLDER through a `writesAttribute` member — `false` left ` data-id=""` standing on an
// element the wire had filled, `true` removed it. No attribute port keeps a placeholder any more,
// so that member has no caller and is off the interface.
import { composeExoPlugins, createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenWiring,
    TExoChildrenPort,
    TExoWiring,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoAttrWrite } from '../../dom/types/TExoAttrWrite';
import type { TExoDomSetter } from '../../dom/types/TExoDomSetter';
import { withExoPropertyWriters } from '../../plugins/exo-property-writers/withExoPropertyWriters';
import { EXO_SHIPPED_WRITERS } from '../constants/EXO_SHIPPED_WRITERS';
import type { TExoWritersApi } from '../types/TExoWritersApi';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

/** What a pack was asked for, in the order it was asked — the whole of "the compiler used this". */
type TAsked = { readonly attr: string[]; readonly text: string[] };

const asked = (): TAsked => ({ attr: [], text: [] });

/**
 * A pack that records what it was asked and then does exactly what the shipped one does.
 *
 * It delegates by calling `EXO_SHIPPED_WRITERS`' own members rather than by importing
 * `createExoAttrSetter`, so a case that renders correctly through it is a case that renders correctly
 * through the composed pack.
 */
const counting = (log: TAsked): TExoWritersApi => ({
    name: 'counting',
    attr: (name, proto, kind, at) => {
        log.attr.push(name);
        return EXO_SHIPPED_WRITERS.attr(name, proto, kind, at);
    },
    // DELEGATED WITHOUT A LOG. `TAsked` records the two members whose call COUNT is the claim of
    // case 1; this one answers a question about the markup rather than about the writer, and a
    // third log line would be a number no case reads. It still has to be the shipped answer, so
    // that a page compiled through this pack adopts exactly as the shipped one does.
    markupCarries: (name, proto) => EXO_SHIPPED_WRITERS.markupCarries(name, proto),
    text: (proto) => {
        log.text.push(proto.localName);
        return EXO_SHIPPED_WRITERS.text(proto);
    },
});

/**
 * A pack whose writers WRITE NOTHING.
 *
 * It is not a stub for something unfinished — it is the instrument. An element compiled under it
 * must come out bare, so any value that turns up on the page came from somewhere that was not the
 * composed pack. That is the only way to assert a negative about a static import.
 */
const inert = (): TExoWritersApi => ({
    name: 'inert',
    attr: (): TExoAttrWrite => ({ write: () => {}, data: null }),
    // `true`, AND IT IS NOT A SHRUG. A writer that writes NOTHING leaves nothing on the element,
    // so there is no state a browser handed the markup would be missing — which is exactly what
    // this member asks. Its one caller (adoption) therefore treats a page compiled under this
    // instrument as the ordinary case, which is what keeps the cases below about the WRITERS.
    markupCarries: () => true,
    text: (): TExoDomSetter => () => {},
});

/**
 * A PACK WHOSE ONLY CONTENT IS A WRITER PACK — the shape an application writes.
 *
 * One name, one factory, and the factory ignores `next`: a pack that means to delegate names what
 * it wraps by reference, as `counting` above names `EXO_SHIPPED_WRITERS`.
 */
const withWriters = (writers: TExoWritersApi) => ({
    writers: () => writers,
});

/**
 * One `<p data-id>` with a text port inside it, built FRESH per case.
 *
 * A declaration caches its compiled schemas on itself, keyed by the BACKEND, so one shared between
 * two cases would carry both backends' schemas — and the counting case's assertion about how many
 * times a pack was asked would be measuring this file's history instead of one compile.
 */
const cardComponent = () =>
    createExoTestMachine(
        (b) => {
            let id!: TExoAttrPort;
            let label!: TExoTextPort;
            b.el('p', null, (p) => {
                id = p.port('data-id');
                label = p.textPort();
            });
            return { id, label };
        },
        (P): TExoMachineInitialState<TExoWiring> =>
            (c, index) => {
                c.attr(P.id, `row-${index}`);
                c.text(P.label, `label ${index}`);
            }
    );

/** The rendered element, as the two things this file is about. */
const shown = (parent: Element): string => {
    const p = parent.querySelector('p') as Element;
    return `${p.getAttribute('data-id') ?? '-'}/${p.textContent === '' ? '-' : p.textContent}`;
};

describe('the composed value writers, as the renderer actually uses it', () => {
    it('the shipped composition writes both, and asks the pack once per port', () => {
        const log = asked();
        const parent = host();
        const rt = composeExoPlugins(
            withExoCompiler(new ExoDomBackend()),
            withWriters(counting(log))
        );
        const COMP = cardComponent();
        // THREE INSTANCES, THREE `render` CALLS into one parent — `render` mounts one and appends
        // it, so this is the same three siblings a count argument used to make.
        for (let i = 0; i < 3; i++) rt.render(COMP, parent);

        expect(shown(parent)).toBe('row-0/label 0');
        // ONCE PER PORT PER SCHEMA, with three instances rendered. This is the cost argument,
        // asserted rather than described: a pack consulted per instance would read `3` here, and a
        // pack consulted per fill would read more.
        expect(log.attr).toEqual(['data-id']);
        expect(log.text).toEqual(['p']);
    });

    it('an INERT pack renders an element with neither the attribute nor the text', () => {
        const parent = host();
        composeExoPlugins(withExoCompiler(new ExoDomBackend()), withWriters(inert())).render(
            cardComponent(),
            parent
        );

        // The element is there — the compiler, the walk and the wiring all ran. Nothing reached
        // the page, because nothing but the pack could put it there.
        expect(parent.querySelectorAll('p')).toHaveLength(1);
        expect(shown(parent)).toBe('-/-');
    });

    it('a port WATCHED by a source goes through the pack exactly as a written one does', () => {
        // An effect following a source writes through `c.attr` and `c.text`, the same door a wire
        // writes through, so silencing the pack silences both.
        const boundId = source('bound-id');
        const boundLabel = source('bound label');
        const schema = createExoSchema((b) => {
            let id!: TExoAttrPort;
            let label!: TExoTextPort;
            b.el('p', null, (p) => {
                id = p.port('data-id');
                label = p.textPort();
            });
            return { id, label };
        });
        const m = createExoMachineBuilder<TExoDomNode>(schema);
        const show = m.transition((c) => {
            c.attr(schema.ports.id, boundId.getValue());
            c.text(schema.ports.label, boundLabel.getValue());
        });
        m.effect((c) => {
            show(c);
            const offId = boundId.onChange(() => show(c));
            const offLabel = boundLabel.onChange(() => show(c));
            return () => {
                offId();
                offLabel();
            };
        });
        const bound = m.done();

        const parent = host();
        composeExoPlugins(withExoCompiler(new ExoDomBackend()), withWriters(inert())).render(
            bound,
            parent
        );

        // BOTH went through the pack and both were swallowed — one write path, one place to stop it.
        expect((parent.querySelector('p') as Element).getAttribute('data-id')).toBeNull();
        expect((parent.querySelector('p') as Element).textContent).toBe('');
    });

    it('a nested component compiles under the same pack', () => {
        const inner = cardComponent();
        const outer = createExoTestMachine(
            (b) => {
                let slot!: TExoChildrenPort;
                b.el('section', null, (s) => {
                    slot = s.childrenPort();
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TExoChildrenWiring> =>
                (c) => {
                    c.one(P.slot, inner);
                }
        );

        const parent = host();
        composeExoPlugins(withExoCompiler(new ExoDomBackend()), withWriters(inert())).render(
            outer,
            parent
        );

        // The nested `<p>` exists and is bare. A schema looked up for the inner declaration under
        // the SHIPPED composition would have written both values here.
        expect(parent.querySelectorAll('section > p')).toHaveLength(1);
        expect(shown(parent)).toBe('-/-');
    });
});

describe('createExoPropertyWriters — the case the shipped pack cannot express', () => {
    /** The value the whole plugin is about: an array, which no attribute can hold. */
    const ROWS = [
        { t: 1, v: 10 },
        { t: 2, v: 20 },
    ];

    /** A custom element whose port carries an array. `setAttribute` would stringify it. */
    const chartComponent = () =>
        createExoTestMachine(
            (b) => {
                let series!: TExoAttrPort;
                let title!: TExoAttrPort;
                b.el('price-chart', null, (chart) => {
                    series = chart.port('series');
                    title = chart.port('title');
                });
                return { series, title };
            },
            (P): TExoMachineInitialState<TExoWiring> =>
                (c) => {
                    c.attr(P.series, ROWS);
                    c.attr(P.title, 'Q3');
                }
        );

    it('puts the array itself on the element, and leaves globals as attributes', () => {
        const parent = host();
        withExoPropertyWriters(withExoCompiler(new ExoDomBackend())).render(
            chartComponent(),
            parent
        );
        const chart = parent.querySelector('price-chart') as Element;

        // THE POINT: the same object, not a string of it.
        expect((chart as unknown as Record<string, unknown>).series).toBe(ROWS);
        // AND NO ATTRIBUTE BESIDE IT. A property writer writes the property and nothing else, and
        // the prototype no longer carries an empty stand-in for an attribute port, so the element
        // serialises without a `series` a page could read as a string.
        expect(chart.getAttribute('series')).toBeNull();
        // `title` IS A GLOBAL ATTRIBUTE and is delegated to the shipped writer, so it lands where
        // the page — not the component — expects it, and no expando is created for it.
        expect(chart.getAttribute('title')).toBe('Q3');
    });

    it('leaves every ordinary element to the shipped writers', () => {
        const parent = host();
        withExoPropertyWriters(withExoCompiler(new ExoDomBackend())).render(
            cardComponent(),
            parent
        );

        // A `<p>` is not a custom element, so nothing about it changed.
        expect(shown(parent)).toBe('row-0/label 0');
    });

    it('takes the predicate it is given', () => {
        // THE PREDICATE IS THE PACK'S OWN ARGUMENT, so a rule nobody registered anywhere composes
        // with one call: `series` is taken over and `title` is left to the shipped writer.
        const only = withExoPropertyWriters(
            withExoCompiler(new ExoDomBackend()),
            (name) => name === 'series'
        );

        const parent = host();
        only.render(chartComponent(), parent);
        const chart = parent.querySelector('price-chart') as Element;

        expect((chart as unknown as Record<string, unknown>).series).toBe(ROWS);
        expect(chart.getAttribute('title')).toBe('Q3');
    });

    it('is INVISIBLE under a second writer pack — two packs do not stack', () => {
        // WHAT A USER GETS TODAY for "I want the property writers AND a policy of my own in front
        // of every write". Both packs write `writers` and NEITHER calls `next`, so the LAST one is
        // the whole answer and `createExoPropertyWriters` is never made and never asked — the array goes
        // back to being stringified into an attribute exactly as it would with no pack composed at
        // all. This is `composeExoPlugins`' documented last-writer-wins reaching a page, and the point
        // of pinning it here is that NOTHING SAYS SO AT COMPOSE TIME: the only trace is the
        // composition line itself, in the order its arguments were written.
        //
        // The fix a user has is to name what they wrap — either through `next`, which is what a
        // pack's factory receives, or by reference as this pack names `EXO_SHIPPED_WRITERS`.
        const log = asked();
        const rt = composeExoPlugins(
            withExoPropertyWriters(withExoCompiler(new ExoDomBackend())),
            withWriters(counting(log))
        );
        const parent = host();
        rt.render(chartComponent(), parent);
        const chart = parent.querySelector('price-chart') as Element;

        // The LAST pack is the one the compiler asked, and it was asked about every port.
        expect([...log.attr].sort()).toEqual(['series', 'title']);
        // And the displaced pack did not run: no property store, and the array stringified into
        // the attribute — `[object Object],[object Object]`, which is the failure the whole
        // pack exists to remove.
        expect((chart as unknown as Record<string, unknown>).series).toBeUndefined();
        expect(chart.getAttribute('series')).toBe(String(ROWS));
        // AND THE NAME CARRIES THE LAST WRITER, which is the same fact read off the composed object:
        // the pack the compiler asked is the one standing under `writers`.
        expect(rt.writers.name).toBe('counting');
    });
});
