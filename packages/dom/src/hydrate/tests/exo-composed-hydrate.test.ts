// @vitest-environment jsdom
//
// THE PROOF THAT A COMPOSITION SURVIVES A SERVER-RENDERED PAGE — the hydration half of
// `backend/exo-composed-render.test.ts`, and the last hole in the construction-kit claim.
//
// WHAT WAS WRONG. `TExoHydrateNode` was a CLASS, built with `new`, holding the composed backend in
// a FIELD — so its prototype was the class's and NOT ONE METHOD A PACK MERGED ONTO THE BACKEND WAS
// REACHABLE from a wire that was adopting. Meanwhile `TExoDomBackendConstructor` intersects the merged
// surface and `withExoHydration` composes onto that same object, so the CHECKER said the method was
// there. One component, one backend, two answers: `backend.render` called it, `backend.hydrate`
// threw a `TypeError` on a name the compiler had approved.
//
// ONE BACKEND NOW SERVES BOTH ROUTES, which is what makes that divergence unspellable rather than
// merely tested: `backend.render(...)` and `backend.hydrate(...)` are two methods on the object the
// application composed, so there is no second place to name an implementation and disagree.
//
// WHY MOST ASSERTIONS CANNOT SEE THAT, and why this file is shaped the way it is. Adoption changes
// nothing on screen by design, so a page that was hydrated looks identical whether the composition
// arrived or not. Two instruments can tell the difference:
//
//   1. THE SCHEMA ITSELF: the hydrate schema's `backend`, and — the mistake that is worse than
//      either half alone — the DOM schema it was DERIVED from, which must be the one compiled
//      under the same backend. Since the hydrate schema hangs off that DOM schema
//      (`domSchema.hydrateSchema`), those two questions now have one answer.
//   2. A PACK'S OWN BEHAVIOUR, reached from a wire that is adopting: a method only the pack
//      provides, a listener strategy that installs a root listener, a wrapper around a name the
//      adopting surface does not claim.
//
// And the count, which guards the other failure mode: a second cache dimension done wrong
// does not merely cost a lookup, it re-derives, and a derivation parses the declaration's markup.
import { composeExoPlugins } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachine,
    TExoEventHandler,
    TExoEventPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { createExoDelegatedEvents } from '../../events/factories/createExoDelegatedEvents';
import { EXO_DIRECT_EVENTS } from '../../events/constants/EXO_DIRECT_EVENTS';
import { EXO_SHIPPED_WRITERS } from '../../backend/constants/EXO_SHIPPED_WRITERS';
import type { TExoDomSchema } from '../../dom/types/TExoDomSchema';

import type { TExoHydrateSchema } from '../types/TExoHydrateSchema';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoHydrateBackend } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** ONE handler for every row — which is the whole reason a delegated strategy can serve them all. */
const REPORT_ROW: TExoEventHandler<Event, Element> = (_event, subject) => {
    const told = subject as { hit: TExoTestSource<number>; at: number };
    told.hit.setValue(told.at);
};

const hydrateSchemas = (machine: TExoMachine<never>): TExoHydrateSchema[] => {
    const found: TExoHydrateSchema[] = [];
    for (const form of machine.forms) {
        const held = (form as Partial<TExoDomSchema> | undefined)?.hydrateSchema;
        if (held !== undefined && held !== null) found.push(held as TExoHydrateSchema);
    }
    return found;
};

const hydrateSchemaOn = (machine: TExoMachine<never>): TExoHydrateSchema =>
    hydrateSchemas(machine)[0];

/** What a row's wire needs of an exonode — the same on the server and while adopting. */
type TRowSurface = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
};

/**
 * WHAT A WIRE NEEDS WHEN IT TOUCHES A NAME A PACK ADDED — the fill doors, plus `note`, which no
 * backend in this repository has and only a composition can supply. It is spelled as a surface for
 * the reason every type above it is: a wire states what it needs of an exonode, and a backend that
 * does not provide it should not satisfy the wire.
 */
type TNoting = TRowSurface & { note(s: string): void };

/** What the wrapper case's wire needs — one name adoption claims, and one it does not. */
type TCounting = TRowSurface & { onTeardown(off: () => void): void };

/**
 * ONE ROW, served and then adopted — the same wire on both sides, which is what makes every case
 * below about the composition rather than about two wirings that might differ.
 *
 * AT MODULE LEVEL, once. A component built inside a wire would be a new DECLARATION per instance,
 * and a new declaration is a new schema — the markup parsed again for every row of every list.
 */
const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let id!: TExoAttrPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
        });
        return { id };
    },
    (P): TExoMachineInitialState<TRowSurface> =>
        (c, i) => {
            c.attr(P.id, i);
        }
);

/** `<ul>` whose children port holds a fixed list of rows — the ordinary shape. */
function buildList(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
}

/**
 * BUILT PER CASE rather than shared, and that is load-bearing: a machine caches its schemas on
 * `machine.forms`, one per backendType, so a machine shared between two cases would carry both
 * backends' schemas and the count assertions would be measuring this file's history.
 */
const listComponent = (count: number) =>
    createExoTestMachine(
        buildList,
        (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
            (c) => {
                c.list(
                    P.rows,
                    ROW,
                    Array.from({ length: count }, (_, i) => i)
                );
            }
    );

/** The ids standing in the child list, in document order. */
const shown = (parent: Element): string =>
    Array.from(parent.querySelectorAll('li'))
        .map((el) => el.getAttribute('data-id'))
        .join(',');

/** Serve a list of `count` rows, then hydrate it under `backend`. */
const serveAndHydrate = (
    count: number,
    // `TExoHydrateBackend` AND NOT `ExoDomBackend`: the class's instance type has no `hydrate`,
    // because `hydrate` is what a plugin put there. The capability this helper needs is the type it
    // should ask for.
    backend: TExoHydrateBackend = EXO_BACKEND
): { parent: HTMLElement; component: ReturnType<typeof listComponent> } => {
    const component = listComponent(count);
    const parent = host();
    parent.innerHTML = EXO_STR.render(component);
    backend.hydrate(component, parent);
    return { parent, component };
};

describe('what the hydrate schema holds, which is where adoption reads it', () => {
    it('bakes the composed backend into the schema', () => {
        const pack = createExoDelegatedEvents(['click']);
        const backend = composeExoPlugins(withExoHydration(withExoCompiler(new ExoDomBackend())), {
            events: () => pack,
        });

        const { parent, component } = serveAndHydrate(2, backend);

        expect(shown(parent)).toBe('0,1');
        // THE SCHEMA IS FILED UNDER THE COMPOSITION, and `backend` is compared by identity when
        // the schema is found — which is what an adopting call reaches every implementation
        // through, since the exonode stands on that object as its prototype.
        const schema = hydrateSchemaOn(component);
        expect(schema.backend).toBe(backend);
        expect(schema.backend.events).toBe(pack);
    });

    it('derives from the DOM schema compiled under the SAME backend', () => {
        // THE MISTAKE THAT IS WORSE THAN EITHER HALF ALONE. `exoHydrateSchemaOf` resolves the DOM
        // schema for the backend it was handed and derives from THAT; if the two calls could take
        // different backends, the hydrate schema would be filed under the application's and its
        // contents would come from a DOM schema compiled under the shipped one. The cache would be
        // right and the schema wrong, which is unfindable.
        const pack = createExoDelegatedEvents(['click']);
        const backend = composeExoPlugins(withExoHydration(withExoCompiler(new ExoDomBackend())), {
            events: () => pack,
        });

        const { component } = serveAndHydrate(1, backend);

        const dom = component.forms[backend.backendType] as TExoDomSchema;
        expect(dom.backend).toBe(backend);
        // And it is that very object the hydrate schema took its fields off — not a second answer
        // that happens to agree.
        const schema = hydrateSchemaOn(component);
        expect(schema.backend).toBe(dom.backend);
        // THE DERIVATION IS THE CACHE SLOT TOO: a hydrate schema hangs off the DOM schema it came
        // from, so "wrong DOM schema" and "wrong cache entry" are the same object being wrong.
        expect(schema.domSchema).toBe(dom);
        expect(dom.hydrateSchema).toBe(schema);
    });

    it('reaches the SECOND level, not only the hydrated root', () => {
        // A schema is looked up per declaration, so an application's choice reaches a child only if
        // the backend travels with the nesting — `TExoHydrateNode.schema.backend`, which used to be
        // a class default. Without it the outer page would be composed and the inner list shipped,
        // which is the failure that shows up only in components nobody thought of as "the root".
        const pack = createExoDelegatedEvents(['click']);
        const backend = composeExoPlugins(withExoHydration(withExoCompiler(new ExoDomBackend())), {
            events: () => pack,
        });
        const INNER = listComponent(2);
        const OUTER = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let slot!: TExoChildrenPort;
                b.el('section', null, (section) => {
                    slot = section.childrenPort();
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
                (c) => {
                    c.one(P.slot, INNER);
                }
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(OUTER);

        backend.hydrate(OUTER, parent);

        expect(parent.querySelector('section > ul')).not.toBeNull();
        expect(shown(parent)).toBe('0,1');
        // THE INNER DECLARATION'S OWN SCHEMA, and the outer page's composition is what compiled it.
        expect(hydrateSchemaOn(INNER).backend).toBe(backend);
        expect(hydrateSchemaOn(INNER).backend.events).toBe(pack);
    });
});

describe('one hydrate schema per DOM schema, one DOM schema per backendType', () => {
    it('holds ONE hydrate schema for a page on one backend, however many hydrations', () => {
        // THE FAILURE THIS GUARDS IS NOT SLOWNESS. A second cache dimension done wrong misses on
        // every lookup, and a miss RE-DERIVES — which pulls in `exoDomSchemaOf`, and on a genuine
        // miss that is `document.createElement('template')` and a parse of the declaration's
        // markup, per hydration. A count that grows is that bug, visible.
        //
        // ONE BACKEND, HELD, WHICH IS THE POINT THE KEY MAKES. Each backend mints its own
        // backendType, so `withExoCompiler(new ExoDomBackend())` per hydration would compile per
        // hydration however identical the compositions look.
        const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
        const LIST = listComponent(1);
        const served = EXO_STR.render(LIST);

        const first = host();
        first.innerHTML = served;
        backend.hydrate(LIST, first);
        const head = hydrateSchemaOn(LIST);

        for (let i = 0; i < 3; i++) {
            const again = host();
            again.innerHTML = served;
            backend.hydrate(LIST, again);
        }

        expect(hydrateSchemas(LIST).length).toBe(1);
        // The same schema object, not a fresh one that merely replaced it.
        expect(hydrateSchemaOn(LIST)).toBe(head);
        expect(LIST.forms[backend.backendType]).toBe(head.domSchema);
        expect(head.domSchema.hydrateSchema).toBe(head);
    });

    it('hangs a SECOND schema off one declaration for a second backend, head unchanged', () => {
        const shipped = withExoHydration(withExoCompiler(new ExoDomBackend()));
        const pack = createExoDelegatedEvents(['click']);
        const delegated = composeExoPlugins(
            withExoHydration(withExoCompiler(new ExoDomBackend())),
            {
                events: () => pack,
            }
        );
        const LIST = listComponent(1);
        const served = EXO_STR.render(LIST);

        const first = host();
        first.innerHTML = served;
        shipped.hydrate(LIST, first);
        const head = hydrateSchemaOn(LIST);

        const second = host();
        second.innerHTML = served;
        delegated.hydrate(LIST, second);

        const both = hydrateSchemas(LIST);
        expect(both).toHaveLength(2);
        expect(both[0]).toBe(head);
        expect(head.backend).toBe(shipped);
        expect(both[1].backend).toBe(delegated);
        expect(head.domSchema).toBe(LIST.forms[shipped.backendType]);
        expect(both[1].domSchema).not.toBe(head.domSchema);
        expect(both[1].domSchema.backend).toBe(delegated);
    });
});

/**
 * A BACKEND THAT NAMES ONLY ITS EVENT STRATEGY — the smallest composition an application writes,
 * and the one it writes most often.
 *
 * FILLING ONE INTERFACE MUST LEAVE EVERY OTHER ONE SHIPPED. A page that chose a listener strategy
 * and nothing else must still get the shipped value writers and the shipped record factories, on
 * the direct strategy and on the delegated one alike.
 */
describe('a backend that composes ONLY its events, leaving every other implementation shipped', () => {
    /** One row with a listener, nothing moving — built per case, so each carries its own schema. */
    const clickableRows = (hit: TExoTestSource<number>, count: number) => {
        const CLICKABLE = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let id!: TExoAttrPort;
                let click!: TExoEventPort;
                b.el('li', null, (li) => {
                    id = li.port('data-id');
                    click = li.eventPort('click');
                });
                return { id, click };
            },
            (P): TExoMachineInitialState<TRowSurface> =>
                (c, i) => {
                    c.attr(P.id, i);
                    // A SHARED FUNCTION WITH A SUBJECT, NOT A PER-ROW CLOSURE, and the pack under
                    // test is why. The delegated strategy refuses a fill with no subject — a
                    // closure already knows its row, so it could only be reached through a listener
                    // on its own element, which is the one cost delegation exists to remove. One
                    // module-level constant serves every row and the row arrives beside it.
                    //
                    // Unconditional, as every other hydrate test's row is: the SERVER's exonode
                    // has `on` too and prints nothing for it, which is the whole reason a listener
                    // is the one thing hydration has to attach.
                    c.on(P.click, REPORT_ROW, { hit, at: i });
                }
        );
        const GROUP = createExoTestMachine(
            buildList,
            (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
                (c) => {
                    c.list(
                        P.rows,
                        CLICKABLE,
                        Array.from({ length: count }, (_, i) => i)
                    );
                }
        );
        return { CLICKABLE, GROUP };
    };

    it('hydrates unchanged, and every other implementation is still the shipped one', () => {
        // `@exodra/react-mount` composes exactly this, and so does every application that chose a
        // strategy and said nothing else.
        const backend = composeExoPlugins(withExoHydration(withExoCompiler(new ExoDomBackend())), {
            events: () => EXO_DIRECT_EVENTS,
        });
        const hit = source(-1);
        const { CLICKABLE, GROUP } = clickableRows(hit, 2);
        const parent = host();
        parent.innerHTML = EXO_STR.render(GROUP);
        const before = parent.innerHTML;

        backend.hydrate(GROUP, parent);

        expect(parent.innerHTML).toBe(before);
        expect(shown(parent)).toBe('0,1');
        const schema = hydrateSchemaOn(CLICKABLE);
        expect(schema.backend.events).toBe(EXO_DIRECT_EVENTS);
        // THE INTERFACE NOBODY NAMED, and the one every value on the page goes through: composing
        // `events` must not have replaced it with anything.
        expect(schema.backend.writers).toBe(EXO_SHIPPED_WRITERS);

        (parent.querySelectorAll('li')[1] as HTMLElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        expect(hit.getValue()).toBe(1);
    });

    it('holds for a DELEGATED pack too, which is the one that carries an `install`', () => {
        // THE INTERESTING HALF. A delegated pack has an `install` — one root listener per event
        // name, put on the hydration root before the first instance is adopted — so it is the one
        // whose composition does something beyond filling a setter table, and the one where
        // "everything else stays shipped" could most easily stop being true.
        const pack = createExoDelegatedEvents(['click']);
        const backend = composeExoPlugins(withExoHydration(withExoCompiler(new ExoDomBackend())), {
            events: () => pack,
        });
        const hit = source(-1);
        const { CLICKABLE, GROUP } = clickableRows(hit, 2);
        const parent = host();
        parent.innerHTML = EXO_STR.render(GROUP);

        backend.hydrate(GROUP, parent);

        const schema = hydrateSchemaOn(CLICKABLE);
        expect(schema.backend.events).toBe(pack);
        expect(schema.backend.writers).toBe(EXO_SHIPPED_WRITERS);
        // And the strategy the backend named is the one actually attached: a delegated pack
        // installs one root listener, so the click has to travel there and back.
        (parent.querySelectorAll('li')[1] as HTMLElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        expect(hit.getValue()).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT A COMPOSED PACK REACHES ON A HYDRATED PAGE, AND WHAT IT STILL DOES NOT
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * THE HOLE THESE PIN, STATED AS THE FAILURE IT WAS — see the file header for the `TypeError` a
 * class-shaped exonode produced on a name the compiler had approved.
 *
 * THE CHAIN THAT FIXED IT is `exonode → hydrate surface → composed backend`, and the cases below
 * take it apart into the claims it actually makes:
 *
 *  1. A NAME NO SURFACE CLAIMS (a pack's own) reaches an adopting wire.
 *  2. A WRAPPER ON A NAME ADOPTION DOES NOT CLAIM (`onTeardown`, `provide`, `inject`, `foreign`,
 *     `portTable`, `childList`) runs while adopting — those bodies were deleted from the hydrate
 *     side because they were character-for-character the render ones, so the chain falls through to
 *     whatever the application put on the backend.
 *
 * ═══ WHY THE MARKUP IS SERVED BY THE DOM BACKEND AND NOT BY `ExoStrBackend` ═══
 *
 * Scope, not convenience. What these cases are about is the EXONODE'S PROTOTYPE CHAIN on the
 * adopting side. That both backends print the same bytes is a different claim and is pinned by
 * `adopt-list` and `adopt-one`; dragging it in here would additionally require the pack to be
 * composed onto the SERVER's backend too — true, and correct, and a second thing for these cases to
 * be able to fail for. The badge is static, so the markup a client render leaves is the markup the
 * server prints for it.
 */
describe('a pack composed onto a hydrating backend', () => {
    /** A `<span>` with one text port — enough to reach a fill, and nothing else moving. */
    function buildBadge(b: TExoSchemaCursor) {
        let label!: TExoTextPort;
        b.el('div', { class: 'badge' }, (div) => {
            div.el('span', null, (span) => {
                label = span.textPort();
            });
        });
        return { label };
    }

    /**
     * RENDER ONCE INTO A SCRATCH HOST AND HAND BACK THE MARKUP IN A FRESH ONE — the served page,
     * as far as an adopting pass can tell.
     *
     * The scratch host is discarded, so nothing the render wired is still attached to what gets
     * hydrated: the second host holds bytes and no listeners, which is the state a page arrives in.
     */
    const serve = <TNode>(
        backend: { render(component: TExoMachine<TNode>, parent: Element): () => void },
        component: TExoMachine<TNode>
    ): HTMLElement => {
        const scratch = host();
        backend.render(component, scratch);
        const parent = host();
        parent.innerHTML = scratch.innerHTML;
        return parent;
    };

    it('reaches a name only the pack provides, from a wire that is adopting', () => {
        const served: string[] = [];
        const adopted: string[] = [];
        /**
         * TWO SINKS, NOT ONE, AND THAT IS THE WHOLE CARE IN THIS CASE. The wire runs TWICE — once
         * to produce the markup and once while adopting it — so a single array would be written by
         * the first run and the assertion would pass with the adopting run never having reached the
         * method at all. Which sink a run writes to is decided by `which`, set between the phases.
         */
        let which = served;
        const withNote = <TBase extends object>(base: TBase): TBase & { note(s: string): void } =>
            composeExoPlugins(base, {
                note: (_next: unknown) =>
                    function (s: string): void {
                        which.push(s);
                    },
            }) as TBase & { note(s: string): void };

        const backend = withExoHydration(withNote(withExoCompiler(new ExoDomBackend())));
        const BADGE = createExoTestMachine(
            buildBadge,
            (P): TExoMachineInitialState<TNoting> =>
                (c) => {
                    c.note('wired');
                    c.text(P.label, 'hi');
                }
        );
        const parent = serve(backend, BADGE);
        // THE SCENE REALLY DID SERVE. Without this the case could pass having rendered nothing.
        expect(served).toEqual(['wired']);
        const markup = parent.innerHTML;

        which = adopted;
        backend.hydrate(BADGE, parent);

        // AND THE ADOPTING RUN REACHED IT. This array cannot be written by the render phase.
        expect(adopted).toEqual(['wired']);
        // Adoption wrote nothing over what was served.
        expect(parent.innerHTML).toBe(markup);
    });

    it('reaches a wrapped name on both the render and the adopting pass', () => {
        const owned: string[] = [];
        const filled: number[] = [];
        /**
         * ONE PACK, TWO NAMES, AND NEITHER IS SHADOWED ANY MORE. The adopting surface claims
         * neither `onTeardown` nor `text`: the phase is which SCHEMA the record points at, so both passes
         * run the render pack's three-line fill and a wrapper is reached on both.
         *
         * WHAT RUNS BEHIND THE WRAPPER WHILE ADOPTING IS STILL THE REPAIRING FILL, because that is
         * what the hydrate schema's `setters` hold — it compares against the bytes the server sent
         * and writes only on disagreement. The wrapper SEES the call; nothing new is written.
         *
         * COMPOSED INSIDE `withExoHydration`, which is the order that gives it any chance at all:
         * the surface takes what stands on the backend as its `next` at the moment it is built.
         */
        const withCounters = <TBase extends object>(base: TBase): TBase =>
            composeExoPlugins(base, {
                onTeardown: (next: (off: () => void) => void) =>
                    function (this: unknown, off: () => void): void {
                        owned.push('onTeardown');
                        next.call(this, off);
                    },
                text: (next: (port: TExoTextPort, value: unknown) => void) =>
                    function (this: unknown, port: TExoTextPort, value: unknown): void {
                        filled.push(port.index);
                        next.call(this, port, value);
                    },
            });

        const backend = withExoHydration(withCounters(withExoCompiler(new ExoDomBackend())));
        const BADGE = createExoTestMachine(
            buildBadge,
            (P): TExoMachineInitialState<TCounting> =>
                (c) => {
                    c.onTeardown(() => {});
                    c.text(P.label, 'hi');
                }
        );

        const parent = serve(backend, BADGE);
        // THE RENDER PHASE ENTERED BOTH — this is the baseline the adopting phase is read against,
        // and without it "0 calls while adopting" could mean the pack was never composed.
        expect(owned).toEqual(['onTeardown']);
        expect(filled.length).toBe(1);
        owned.length = 0;
        filled.length = 0;

        backend.hydrate(BADGE, parent);

        // This was a `TypeError` when the exonode was a class holding the backend in a field.
        expect(owned).toEqual(['onTeardown']);
        // ONE WRITE PATH: the fill is reached on the adopting pass too.
        expect(filled.length).toBe(1);
        // AND IT WROTE NOTHING OVER THE SERVER'S BYTES — the repairing fill compares first, which is
        // the whole reason reaching it is safe. The value agrees, so the markup is untouched.
        expect(parent.querySelector('span')?.textContent).toBe('hi');
    });

    it('leaves the same backend able to render, with adoption nowhere near it', () => {
        // THE OTHER HALF OF THE TWO-OBJECT ARRANGEMENT. If the adopting bodies were merged onto the
        // BACKEND — which is what `composeExoPlugins`' last-claim-wins rule would do — this render
        // would go through adoption's fill, which writes nothing, and the badge would come out
        // empty with nothing thrown.
        const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
        const BADGE = createExoTestMachine(
            buildBadge,
            (P): TExoMachineInitialState<TRowSurface> =>
                (c) => {
                    c.text(P.label, 'hi');
                }
        );

        const parent = host();
        backend.render(BADGE, parent);

        expect(parent.querySelector('span')?.textContent).toBe('hi');
    });
});
