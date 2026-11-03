// @vitest-environment jsdom
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoMachine,
    TExoMachineNode,
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoEventHandler,
    TExoEventPort,
    TExoFillDoors,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/**
 * WHAT THESE WIRES ASSUME ABOUT AN EXONODE. Methods, not properties, so both the server's
 * exonode and hydration's satisfy it — every case below serves ONE component and then
 * adopts what it served, which is only meaningful while both halves run the same wiring.
 */
type TSurface = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
    onTeardown(off: () => void): void;
};

function buildRow(b: TExoSchemaCursor) {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
        click = li.eventPort('click');
        li.el('span', null, (span) => {
            label = span.textPort();
        });
    });
    return { id, label, click };
}

type TRowPorts = ReturnType<typeof buildRow>;

type TFollowed = { getValue(): unknown; onChange(cb: (...event: never[]) => void): () => void };

/** What a row draws from sources it follows: the sources, and the transition that writes them. */
type TFollowing = { readonly sources: readonly TFollowed[]; draw(c: TSurface): void };

/** One shape; each case builds the component with the wiring that case is about, and the sources
 *  its effect follows. */
const rowWith = (
    make: (ports: TRowPorts) => TExoMachineInitialState<TSurface>,
    follow?: (ports: TRowPorts) => TFollowing
): TExoMachine<TSurface, TRowPorts> => {
    if (follow === undefined) return createExoTestMachine(buildRow, make);
    const schema = createExoSchema(buildRow);
    const fill = make(schema.ports);
    const following = follow(schema.ports);
    const row = composeExoMachine(
        createExoMachine<TExoMachineNode & TSurface>(schema, {
            createInitialState: (c, params) => fill(c, params),
        }),
        (m) => withExoTransitions(m, { draw: (c) => following.draw(c) }),
        (m) => {
            const { draw } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    draw(c);
                    const offs = following.sources.map((followed) =>
                        followed.onChange(() => draw(c))
                    );
                    return () => {
                        for (const off of offs) off();
                    };
                });
            });
        }
    );
    return row as unknown as TExoMachine<TSurface, TRowPorts>;
};

/**
 * N ROWS OF ONE SHAPE, INSIDE A `<ul>` — which is where an application keeps its multiplicity.
 *
 * `c.list` is the FIXED form: no registry, no diff and no subscription of its own, and the one
 * children call that adopts several rows of one schema. Instance `at` is handed the number `at` as
 * its params, which is the whole of what a wire is told about its position.
 */
const listOf = (
    make: (ports: TRowPorts) => TExoMachineInitialState<TSurface>,
    n: number,
    follow?: (ports: TRowPorts) => TFollowing
) => {
    const ROW = rowWith(make, follow);
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
            (c) => {
                c.list(
                    P.rows,
                    ROW,
                    Array.from({ length: n }, (_, at) => at)
                );
            }
    );
};

/** The rows on the page, in document order. */
const rowsIn = (parent: HTMLElement): HTMLElement[] =>
    Array.from(parent.querySelectorAll('li')) as HTMLElement[];

describe('ExoDomBackend.hydrate', () => {
    it('does not write a bound value it already agrees with, but does update on change', () => {
        // The asymmetry hydration exists for: the server already computed the value, so the
        // first write is skipped — and the subscription is not, or the page would be frozen
        // from the moment it loaded. Both halves are the effect's: its first draw writes through
        // the fill door, which is silenced while the pass is adopting, and then it subscribes,
        // which is not silenced.
        const label = source('from the server');
        const ROW = rowWith(
            (P) => (c) => {
                c.attr(P.id, '1');
                c.on(P.click, () => undefined);
            },
            (P) => ({ sources: [label], draw: (c) => c.text(P.label, label.getValue()) })
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(ROW);
        const before = parent.innerHTML;

        EXO_BACKEND.hydrate(ROW, parent);
        expect(parent.innerHTML).toBe(before);
        expect(label.subscribers()).toBe(1);

        label.setValue('changed');
        expect(parent.querySelector('span')?.textContent).toBe('changed');
    });

    it('writes NOTHING at all when the markup and the source agree', () => {
        // The stronger form of the case above, and the one that guards the cost: a redundant
        // store of an identical value leaves `innerHTML` unchanged and would sail past a string
        // compare, so this watches for the mutation itself.
        const label = source('from the server');
        const id = source('7');
        const LIST = listOf(
            (P) => (c) => {
                c.on(P.click, () => undefined);
            },
            3,
            (P) => ({
                sources: [id, label],
                draw: (c) => {
                    c.attr(P.id, id.getValue());
                    c.text(P.label, label.getValue());
                },
            })
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(LIST);

        let mutations = 0;
        const observer = new MutationObserver((records) => {
            mutations += records.length;
        });
        observer.observe(parent, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
        EXO_BACKEND.hydrate(LIST, parent);
        mutations += observer.takeRecords().length;
        observer.disconnect();

        expect(mutations).toBe(0);
    });

    it('a null attribute is ABSENT on both backends, and hydration leaves it absent', () => {
        // THIS TEST USED TO PIN A DIVERGENCE. The server printed `data-id=""` for a null value
        // because the name and its quotes were merged into the static markup around the port and
        // the writer could only produce the value; the DOM backend REMOVED the attribute. So a
        // server-rendered page carried attributes a client render did not, and for `disabled`,
        // `hidden`, `checked` or any `aria-*` that is not a cosmetic difference — the PRESENCE of
        // an attribute is its value, which is why `disabled="false"` disables a control.
        //
        // The attribute port's writer owns ` name="` and its closing quote now, so returning the
        // empty string takes the whole attribute out and the two backends print the same bytes.
        // What this test guards is the thing that made the old behaviour tolerable and is now
        // load-bearing: hydration must not write what it finds. There is nothing to write —
        // the server already emitted exactly what a client render would have — and an adopting
        // pass that wrote `data-id=""` back would reintroduce the divergence from the other side.
        const id = source<string | null>(null);
        const ROW = rowWith(
            (P) => (c) => {
                c.text(P.label, 'x');
                c.on(P.click, () => undefined);
            },
            (P) => ({ sources: [id], draw: (c) => c.attr(P.id, id.getValue()) })
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(ROW);
        expect(parent.querySelector('li')?.hasAttribute('data-id')).toBe(false);

        EXO_BACKEND.hydrate(ROW, parent);
        expect(parent.querySelector('li')?.hasAttribute('data-id')).toBe(false);

        // And it comes back when the source says so, through the live table the subscription
        // writes into.
        id.setValue('7');
        expect(parent.querySelector('li')?.getAttribute('data-id')).toBe('7');
    });

    it('lands on the right rows even with whitespace between them', () => {
        // Our own server output has nothing between two rows, so advancing by `nextSibling`
        // would be enough for markup this project produced — and would silently shift every
        // row after the first the moment anything pretty-printed it. The failure is not a
        // crash: it is listeners on the wrong elements.
        let clicked = -1;
        const LIST = listOf(
            (P) => (c, at) => {
                c.attr(P.id, at);
                c.text(P.label, 'Item ' + at);
                c.on(P.click, () => {
                    clicked = at as number;
                });
            },
            3
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(LIST).replace(/><li/g, '>\n  <li');
        EXO_BACKEND.hydrate(LIST, parent);

        const rows = rowsIn(parent);
        rows[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe(2);
    });

    it('ends every subscription it made when the render is disposed', () => {
        const label = source('x');
        const LIST = listOf(
            (P) => (c) => {
                c.attr(P.id, '1');
                c.on(P.click, () => undefined);
            },
            2,
            (P) => ({ sources: [label], draw: (c) => c.text(P.label, label.getValue()) })
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(LIST);
        const dispose = EXO_BACKEND.hydrate(LIST, parent);
        expect(label.subscribers()).toBe(2);
        dispose();
        expect(label.subscribers()).toBe(0);
    });
});

/**
 * WHAT THE WIRE BELOW ASSUMES — the fill doors plus `fillDoors()`, so that the SAME component is
 * served by `@exodra/string` and then adopted here, which is the only way a hydration case means
 * anything.
 */
type TDrivingSurface = TSurface & {
    fillDoors(): TExoFillDoors;
};

/**
 * DRIVING AN ADOPTED PORT BY HAND — `c.fillDoors()` on the hydration exonode, where it has a hazard
 * no other backend has.
 *
 * THIS BACKEND HAS TWO SETTER TABLES AND ONLY ONE OF THEM WRITES. `setters`/`elem` are the ADOPTION
 * tables: for a value port the entry is `ignoreExoFill` and the slot is 0, deliberately, because the
 * server already printed that value and rewriting it is the one thing adoption must not do.
 * `live`/`liveElem` are the DOM backend's real table and slot map, carried on the hydrate schema
 * for everything that happens AFTER adoption. A fill made through the adoption tables would go
 * through a function that silently does nothing for the life of the page, aimed at the wrong element
 * — which is a bug no assertion about the adopted markup could ever see, because adoption is
 * supposed to change nothing. So the assertion is a write made AFTER hydration, on the node the
 * server sent.
 */
describe('driving an adopted port by hand', () => {
    it('writes through the LIVE table rather than the silenced adoption one', () => {
        let held!: TExoFillDoors;
        let id!: TExoAttrPort;
        const ROW = createExoTestMachine(
            buildRow,
            (P): TExoMachineInitialState<TDrivingSurface> =>
                (c, at) => {
                    c.attr(P.id, at);
                    c.text(P.label, 'Item ' + at);
                    c.on(P.click, () => undefined);
                    // TAKEN ON EVERY PASS, so this holds the SERVER's value after the render below
                    // and the HYDRATION exonode's after the adoption — which is the one the test
                    // drives.
                    held = c.fillDoors();
                    id = P.id;
                }
        );

        const parent = host();
        parent.innerHTML = EXO_STR.render(ROW, null, 0);
        const li = parent.querySelector('li')!;
        // The server printed the value, which is the premise of everything below.
        expect(li.getAttribute('data-id')).toBe('0');

        EXO_BACKEND.hydrate(ROW, parent, 0);

        held.attr(id, 'written');

        expect(li.getAttribute('data-id')).toBe('written');
        // The same NODE — the write reached the element the server sent, not a rebuilt one.
        expect(parent.querySelector('li')).toBe(li);
    });
});
