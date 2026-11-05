// @vitest-environment jsdom
import { composeExoPlugins, createExoSchema, wireExoNode } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { createExoReconciledList } from '../../dom/tests/createExoReconciledList';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoAttrWrite } from '../../dom/types/TExoAttrWrite';
import type { TExoDomSchema } from '../../dom/types/TExoDomSchema';
import type { TExoDomSetter } from '../../dom/types/TExoDomSetter';
import { EXO_SHIPPED_WRITERS } from '../constants/EXO_SHIPPED_WRITERS';
import type { TExoWritersApi } from '../types/TExoWritersApi';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

type TItem = { readonly id: string };

const items = (ids: readonly string[]): TItem[] => ids.map((id) => ({ id }));

/** What a pack was asked for, in the order it was asked — the whole of "the compiler used this". */
type TAsked = { readonly attr: string[]; readonly text: string[] };

const asked = (): TAsked => ({ attr: [], text: [] });

/**
 * A writers pack that records what it was asked and then does exactly what the shipped one does.
 *
 * It delegates by calling `EXO_SHIPPED_WRITERS`' own members, so a page compiled through it renders
 * exactly as the shipped composition renders it — and the log says the composition was ENTERED.
 */
const counting = (log: TAsked): TExoWritersApi => ({
    name: 'counting',
    attr: (name, proto, kind, at) => {
        log.attr.push(name);
        return EXO_SHIPPED_WRITERS.attr(name, proto, kind, at);
    },
    markupCarries: (name, proto) => EXO_SHIPPED_WRITERS.markupCarries(name, proto),
    text: (proto) => {
        log.text.push(proto.localName);
        return EXO_SHIPPED_WRITERS.text(proto);
    },
});

/**
 * A writers pack whose writers WRITE NOTHING.
 *
 * It is the instrument, not a stub: an element compiled under it comes out bare, so any value that
 * turns up on the page came from somewhere that was not the composed pack.
 */
const inert = (): TExoWritersApi => ({
    name: 'inert',
    attr: (): TExoAttrWrite => ({ write: () => {}, data: null }),
    markupCarries: () => true,
    text: (): TExoDomSetter => () => {},
});

/**
 * A PACK WHOSE ONLY CONTENT IS A WRITER PACK — the shape an application writes.
 *
 * One name, one factory, and the factory ignores `next`: a pack that means to delegate names what it
 * wraps by reference, as `counting` above names `EXO_SHIPPED_WRITERS`.
 */
const withWriters = (writers: TExoWritersApi) => ({
    writers: () => writers,
});

/**
 * One row, writing its item's id where the assertions can read it.
 *
 * AT MODULE LEVEL, once. A component built inside a wire would be a new DECLARATION per instance,
 * and a new declaration is a new schema — the markup parsed again for every row of every list.
 *
 * The item a row stands for arrives as its params.
 */
const ROW = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
        });
        return { id };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c, item) => {
            c.attr(P.id, (item as TItem).id);
        }
);

/**
 * A `<ul>` whose children port follows `src`, with the reconciler composed IN AN EFFECT.
 *
 * BUILT PER CASE rather than shared at module level, and that is load-bearing: a machine caches
 * its compiled schemas on `machine.forms`, one per backendType, so a machine shared between two
 * cases would carry both compositions' schemas and the count assertions below would be measuring
 * the file's history instead of one render.
 */
const listComponent = (src: TExoTestSource<readonly TItem[]>) => {
    const schema = createExoSchema((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    return createExoReconciledList(schema, src, ROW);
};

/** A `<section>` with ONE children port, filled by whatever the caller does with it. */
const withChildrenPort = (fill: (c: TExoDomNode, slot: TExoChildrenPort) => void) =>
    createExoTestMachine(
        (b) => {
            let slot!: TExoChildrenPort;
            b.el('section', null, (section) => {
                slot = section.childrenPort();
            });
            return { slot };
        },
        (P): TExoMachineInitialState<TExoDomNode> =>
            (c) => {
                fill(c, P.slot);
            }
    );

/** The ids standing in the child list, in document order; `-` where nothing wrote one. */
const shown = (parent: Element): string =>
    Array.from(parent.querySelectorAll('li'))
        .map((el) => el.getAttribute('data-id') ?? '-')
        .join(',');

describe('machine.forms, one schema per backendType', () => {
    const formsHeld = (forms: readonly unknown[]): number => Object.keys(forms).length;

    it('holds ONE schema for a page that uses one backend, however many renders', () => {
        const rt = withExoCompiler(new ExoDomBackend());
        const src = source<readonly TItem[]>(items(['a']));
        const LIST = listComponent(src);

        rt.render(LIST, host());
        const first = LIST.forms[rt.backendType];
        rt.render(LIST, host());
        rt.render(LIST, host());

        expect(formsHeld(LIST.forms)).toBe(1);
        expect(LIST.forms[rt.backendType]).toBe(first);
    });

    it('holds a SECOND schema for a second backend, the first unchanged', () => {
        const shipped = withExoCompiler(new ExoDomBackend());
        const composed = composeExoPlugins(
            withExoCompiler(new ExoDomBackend()),
            withWriters(inert())
        );
        const src = source<readonly TItem[]>(items(['a']));
        const LIST = listComponent(src);

        shipped.render(LIST, host());
        const head = LIST.forms[shipped.backendType] as TExoDomSchema;
        composed.render(LIST, host());

        expect(formsHeld(LIST.forms)).toBe(2);
        expect(LIST.forms[shipped.backendType]).toBe(head);
        expect(head.backend).toBe(shipped);
        expect((LIST.forms[composed.backendType] as TExoDomSchema).backend).toBe(composed);
    });

    it('files the schema under the composition, and the composed WRITERS are what ran', () => {
        const log = asked();
        const rt = composeExoPlugins(
            withExoCompiler(new ExoDomBackend()),
            withWriters(counting(log))
        );
        const src = source<readonly TItem[]>(items(['a']));
        const LIST = listComponent(src);
        const parent = host();

        rt.render(LIST, parent);

        // THE SCHEMA IS FILED UNDER THE COMPOSITION, which is what makes the composed packs
        // reachable at all: an exonode's prototype is this backend.
        expect((LIST.forms[rt.backendType] as TExoDomSchema).backend).toBe(rt);
        // AND THE COMPOSED PACK WAS ACTUALLY ENTERED, which the line above cannot see: it holds just
        // as well if every compile on the page keeps reaching the shipped writers by import. The row
        // schema's one attribute port is what the pack was asked about, and `counting` logs its own
        // entries, so this is the half that fails when the wiring is cut.
        expect(log.attr).toEqual(['data-id']);
        expect(shown(parent)).toBe('a');
        // AND THE LIST IS LIVE THROUGH IT: one subscriber, because the effect subscribes once per
        // instance, and an update reaching the page proves the path stays put
        // rather than being a first-placement accident.
        expect(src.subscribers()).toBe(1);
        src.setValue(items(['a', 'b']));
        expect(shown(parent)).toBe('a,b');
        // AND THE PACK IS ASKED ONCE PER PORT PER SCHEMA, NOT ONCE PER ROW OR PER UPDATE — which is
        // the whole cost argument for reading `writers` at compile time. A second row arrived out of
        // the schema the first one was built from, so the log has not moved.
        expect(log.attr).toEqual(['data-id']);
    });

    /**
     * FORMS THAT KEEP GROWING ARE A LEAK, AND A LOUD ONE.
     *
     * Nothing removes a schema from `machine.forms`, and each retains a compiled schema — a prototype element, a
     * setter table, three `Int32Array`s — together with the BACKEND it was compiled for and
     * everything that backend's plugins captured. A caller that writes `withExoCompiler(new ExoDomBackend(...))`
     * inline in a route handler adds one per navigation and nothing ever says so.
     *
     * IT WARNS AND DOES NOT REFUSE, and the reason is in this very file: the cases above render one
     * module-level `ROW` under several distinct compositions, and every one of them is a legitimate
     * thing for a test to do. A refusal would make growing forms undiagnosable in the file that
     * most needs to grow one. Nothing is capped and nothing is evicted either — a wrong schema
     * renders a wrong page, which is strictly worse than holding memory.
     */
    describe('and forms that keep growing say so, in a development build', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        /** One element, one text port, NO nested component — so exactly one machine's forms are involved. */
        const plain = () =>
            createExoTestMachine(
                (b) => {
                    let label!: TExoTextPort;
                    b.el('p', null, (p) => {
                        label = p.textPort();
                    });
                    return { label };
                },
                (P): TExoMachineInitialState<TExoWiring> =>
                    (c) => {
                        c.text(P.label, 'x');
                    }
            );

        it('says nothing while the backends stay few', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const COMP = plain();

            for (let i = 0; i < 3; i++) {
                withExoCompiler(new ExoDomBackend()).render(COMP, host());
            }

            expect(formsHeld(COMP.forms)).toBe(3);
            expect(warn).not.toHaveBeenCalled();
        });

        it('warns ONCE for a caller that composes per call, and caps nothing', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const COMP = plain();

            // TWELVE BACKENDS, TWELVE KEYS — a fresh `withExoCompiler(new ExoDomBackend())` per render is the
            // mistake, written out. Each backend mints its own backendType, so every one of these
            // misses every existing schema and compiles again.
            for (let i = 0; i < 12; i++) {
                withExoCompiler(new ExoDomBackend()).render(COMP, host());
            }

            expect(warn).toHaveBeenCalledTimes(1);
            // It names the declaration by its root tag, which is the only name one has.
            expect(String(warn.mock.calls[0][0])).toContain('<p>');
            // AND NOTHING WAS EVICTED. Every backend still has the schema it was compiled with —
            // the warning is a report, not a cache policy.
            expect(formsHeld(COMP.forms)).toBe(12);
        });
    });
});

describe('the composition reaches a schema c.list and c.build look up, not just render', () => {
    it('carries the composition through c.list — a FIXED list of nested instances', () => {
        // `list` reconciles nothing itself: it mounts n instances and stops. What it does do is look
        // up ANOTHER declaration's schema through `exoDomSchemaOf(…, schema.backend)`, one of the
        // places the composition can be dropped — and an INERT writers pack is what makes a dropped
        // one visible, because a correct-looking page is what both answers produce.
        const rt = composeExoPlugins(withExoCompiler(new ExoDomBackend()), withWriters(inert()));
        const src = source<readonly TItem[]>(items(['a', 'b']));
        const INNER = listComponent(src);
        const OUTER = withChildrenPort((c, slot) => {
            c.list(slot, INNER, Array.from({ length: 2 }));
        });
        const parent = host();

        rt.render(OUTER, parent);

        // BOTH INSTANCES MOUNTED — `list` goes through `mountExoInstance`, so the two `<ul>`s are
        // there and each one's wire filled its own child list.
        expect(parent.querySelectorAll('section > ul')).toHaveLength(2);
        expect(parent.querySelectorAll('li')).toHaveLength(4);
        // AND EVERY ROW IS BARE, three schemas deep: the inert pack reached `OUTER`, the `INNER` the
        // fixed list looked up, and the `ROW` each of those built. A schema looked up for any of
        // them under the SHIPPED composition would have written a `data-id` here.
        expect(shown(parent)).toBe('-,-,-,-');
        expect((INNER.forms[rt.backendType] as TExoDomSchema).backend).toBe(rt);
    });

    it('carries the composition through c.build — the schema is found under THIS backend', () => {
        // `build` is the one route that produces no DOM to assert on: it acquires an element, wires
        // the instance and places it NOWHERE, so the caller decides where it goes. What still pins
        // the composition is the step that could drop it — `build` asks `exoDomSchemaOf(schema,
        // this.schema.backend)` — and the schema it produced is stamped with THIS BACKEND and was
        // compiled by asking THIS pack.
        const log = asked();
        const rt = composeExoPlugins(
            withExoCompiler(new ExoDomBackend()),
            withWriters(counting(log))
        );
        const BUILT = createExoTestMachine(
            (b) => {
                let id!: TExoAttrPort;
                b.el('span', null, (span) => {
                    id = span.port('data-id');
                });
                return { id };
            },
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.attr(P.id, 'built');
                }
        );
        const BUILDER = createExoTestMachine(
            (b) => {
                let label!: TExoTextPort;
                b.el('p', null, (p) => {
                    label = p.textPort();
                });
                return { label };
            },
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.text(P.label, 'made');
                    wireExoNode(c.createExoNode(BUILT));
                }
        );
        const parent = host();

        rt.render(BUILDER, parent);

        expect((parent.querySelector('p') as Element).textContent).toBe('made');
        // PLACED NOWHERE: the built `<span>` never reached the document, which is what `build`
        // promises and the reason this case cannot read its claim off the page.
        expect(parent.querySelector('span')).toBeNull();
        expect((BUILT.forms[rt.backendType] as TExoDomSchema).backend).toBe(rt);
        // The composed pack was asked about BOTH schemas — the one `render` entered and the one
        // `build` looked up — and once about each port.
        expect(log.text).toEqual(['p']);
        expect(log.attr).toEqual(['data-id']);
    });
});
