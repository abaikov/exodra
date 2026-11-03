// @vitest-environment jsdom
//
// Proves the boundary end-to-end against the REAL react-dom and the REAL schema core: React
// owns the container, Exodra owns everything inside it, and the two hand off cleanly on mount,
// update, StrictMode's double pass, a `deps` change and unmount.

import { beforeAll, describe, expect, it } from 'vitest';
import { createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import {
    composeExoPlugins,
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoMachineInitialState,
    TExoMachineNode,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { EXO_SHIPPED_WRITERS, ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomNode, TExoWritersApi } from '@exodra/dom';

// The smallest source an effect follows — a value, a way to change it, a way to be told — plus the
// listener count the teardown case asserts on. `host` is imported under the name this file
// already called it by, because `host` is also the local name of the element inside `render`.
import { host as freshContainer, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { ExoMount } from '../ExoMount';
import { useExoMount } from '../useExoMount';
import { ExoStrBackend } from '@exodra/string';

const EXO_STR = new ExoStrBackend();

beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

/**
 * WHAT THESE WIRES ASSUME ABOUT A CONNECTOR, and nothing more — methods, so a real connector
 * satisfies it structurally, and ONE component can drive the server backend and this one.
 */
type TWiring = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    onTeardown(off: () => void): void;
};

/** One paragraph, one class port, one text port. */
function buildLine(b: TExoSchemaCursor) {
    let cls!: TExoAttrPort;
    let text!: TExoTextPort;
    b.el('p', null, (p) => {
        cls = p.port('class');
        text = p.textPort();
    });
    return { cls, text };
}

type TLinePorts = ReturnType<typeof buildLine>;

const lineWith = (make: (ports: TLinePorts) => TExoMachineInitialState<TWiring>) =>
    createExoTestMachine(buildLine, make);

/** A fixed label — nothing followed, so nothing to dispose. */
const staticLine = (label: string) =>
    lineWith((P) => (c) => {
        c.attr(P.cls, 'island');
        c.text(P.text, label);
    });

/** A label that follows a source: drawn by an effect, which subscribes and returns the unsubscribe. */
const followingLine = (label: TExoTestSource<string>) => {
    const schema = createExoSchema(buildLine);
    const m = createExoMachine<TExoMachineNode>(schema);
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                show: (c) => c.text(schema.ports.text, label.getValue()),
            }),
        (m) => withExoWire(m, (c) => c.attr(schema.ports.cls, 'island')),
        (m) => {
            const { show } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return label.onChange(() => show(c));
                });
            });
        }
    );
    return machine;
};

type TListState<TItem> = { readonly rows: ReturnType<TExoDomNode['childList']>; shown: TItem[] };

/** A `<ul>` whose children port follows a source through `reconcileExoOrder`. */
const reconciledList = <TItem>(
    items: TExoTestSource<readonly TItem[]>,
    row: (c: TExoDomNode, item: TItem) => ReturnType<TExoDomNode['build']>
) => {
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let kids!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            kids = ul.childrenPort();
        });
        return { kids };
    });
    const m = createExoMachine<TExoDomNode, unknown, TListState<TItem>>(schema, {
        createInitialState: (c) => ({ rows: c.childList(schema.ports.kids), shown: [] as TItem[] }),
    });
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = items.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => row(c, item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return items.onChange(() => showRows(c));
                });
            });
        }
    );
    return machine;
};

function render(element: ReturnType<typeof createElement>): {
    host: HTMLElement;
    root: Root;
} {
    const host = freshContainer();
    const root = createRoot(host);
    act(() => {
        root.render(element);
    });
    return { host, root };
}

describe('ExoMount', () => {
    it('renders the component inside the React-owned element', () => {
        const { host, root } = render(
            createElement(ExoMount, {
                component: staticLine('from exodra'),
                className: 'chart',
            })
        );

        expect(host.querySelector('.chart')).not.toBeNull();
        expect(host.querySelector('.chart > p')?.textContent).toBe('from exodra');

        act(() => root.unmount());
    });

    it('keeps the Exodra subtree reactive after React has rendered', () => {
        const label = source('a');
        const LINE = followingLine(label);
        const { host, root } = render(createElement(ExoMount, { component: LINE }));
        expect(host.querySelector('p')?.textContent).toBe('a');

        // No React re-render involved: the update goes straight to the DOM.
        act(() => label.setValue('b'));
        expect(host.querySelector('p')?.textContent).toBe('b');

        act(() => root.unmount());
    });

    it('disposes the Exodra tree when React unmounts (no leaked subscription)', () => {
        const label = source('a');
        const LINE = followingLine(label);
        const { host, root } = render(createElement(ExoMount, { component: LINE }));
        expect(label.subscribers()).toBe(1);

        act(() => root.unmount());

        // The disposer `ExoDomBackend.render` handed back IS the effect's cleanup: nothing is left
        // following the source after React has dropped the component.
        expect(label.subscribers()).toBe(0);
        expect(host.querySelector('p')).toBeNull();
    });

    it('mounts exactly once under StrictMode (which runs effects twice)', () => {
        // The failure this catches is not a leak but a DUPLICATE: `render` appends, so a second
        // pass whose cleanup left the first pass's nodes standing shows two paragraphs.
        const { host, root } = render(
            createElement(
                StrictMode,
                null,
                createElement(ExoMount, { component: staticLine('once') })
            )
        );

        expect(host.querySelectorAll('p')).toHaveLength(1);
        expect(host.querySelector('p')?.textContent).toBe('once');
        act(() => root.unmount());
    });

    it('does not rebuild when the parent re-renders with a new inline factory', () => {
        const LINE = staticLine('stable');
        const host = freshContainer();
        const root = createRoot(host);
        // A fresh closure every render — the common way to write this.
        const element = () => createElement(ExoMount, { component: () => LINE });

        act(() => root.render(element()));
        const first = host.querySelector('p');
        act(() => root.render(element()));

        expect(host.querySelector('p')).toBe(first); // same node, not rebuilt
        act(() => root.unmount());
    });

    it('re-mounts when deps change, replacing rather than appending', () => {
        const host = freshContainer();
        const root = createRoot(host);
        const view = (value: string) =>
            createElement(ExoMount, {
                component: () => staticLine(value),
                deps: [value],
            });

        act(() => root.render(view('one')));
        expect(host.querySelector('p')?.textContent).toBe('one');

        act(() => root.render(view('two')));
        expect(host.querySelectorAll('p')).toHaveLength(1);
        expect(host.querySelector('p')?.textContent).toBe('two');

        act(() => root.unmount());
    });
});

describe('ExoMount with server-rendered html', () => {
    it('adopts the server markup instead of rebuilding it', () => {
        const LINE = staticLine('server');
        const html = EXO_STR.render(LINE);
        expect(html).toContain('server');

        const { host, root } = render(createElement(ExoMount, { component: LINE, html }));

        // The SAME element the server produced is still there — hydration attached to it
        // rather than replacing it.
        const paragraph = host.querySelector('p.island');
        expect(paragraph).not.toBeNull();
        expect(host.querySelectorAll('p')).toHaveLength(1);
        expect(paragraph!.textContent).toBe('server');

        act(() => root.unmount());
    });

    it('binds the hydrated markup to its source', () => {
        const label = source('server');
        const LINE = followingLine(label);
        const html = EXO_STR.render(LINE);

        const { host, root } = render(createElement(ExoMount, { component: LINE, html }));
        const paragraph = host.querySelector('p.island');

        act(() => label.setValue('client'));
        // The node the server sent is the node that updated — not a replacement.
        expect(host.querySelector('p.island')).toBe(paragraph);
        expect(paragraph?.textContent).toBe('client');

        act(() => root.unmount());
    });

    it('falls back to a fresh render when there is nothing to adopt', () => {
        // `hydrate` without markup: a client-side navigation, and StrictMode's second pass.
        // `ExoDomBackend.hydrate` refuses a missing instance, so the fallback keeps this working.
        const { host, root } = render(
            createElement(
                StrictMode,
                null,
                createElement(ExoMount, {
                    component: staticLine('rebuilt'),
                    hydrate: true,
                })
            )
        );

        expect(host.querySelectorAll('p')).toHaveLength(1);
        expect(host.querySelector('p')?.textContent).toBe('rebuilt');

        act(() => root.unmount());
    });
});

/**
 * AN ISLAND MOUNTED FROM REACT RUNS THE APPLICATION'S COMPOSITION, OR IT IS NOT THE SAME
 * APPLICATION.
 *
 * `TExoMountOptions` used to carry an event pack and nothing else while the entry points underneath
 * took a whole composition, so the narrow option was the only thing standing between a React island
 * and the rest of the page. The option is now the BACKEND itself — the same object
 * `ExoDomBackend.render` is called on anywhere else.
 *
 * THE INSTRUMENT IS A WRITERS PACK THAT WRITES NOTHING, which is this package's way of asserting a
 * NEGATIVE: a correct tree proves nothing here, because the shipped composition also produces a
 * correct tree. A MISSING ATTRIBUTE on an element that was drawn proves the composition arrived.
 * A reconciler is not part of a backend — `reconcileExoOrder` is called from a transition — so the
 * pack that is instrumented is one the backend carries.
 */
describe('ExoMount and the composition', () => {
    type TRow = { id: string };

    /** Records being entered, writes nothing. See `@exodra/dom`'s `exo-composed-writers.test.ts`. */
    const mute = (tally: { calls: number }): TExoWritersApi => ({
        ...EXO_SHIPPED_WRITERS,
        name: 'mute',
        attr: () => ({
            write: () => {
                tally.calls++;
            },
            data: null,
        }),
    });

    /** A row reads its own item from the params it was built with. */
    const rowOf = () =>
        createExoTestMachine(
            (b) => {
                let id!: TExoAttrPort;
                b.el('li', null, (li) => {
                    id = li.port('data-id');
                });
                return { id };
            },
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c, row) => {
                    c.attr(P.id, (row as TRow).id);
                }
        );

    /** A `<ul>` whose children port is a reactive list — the only shape a reconciler shows up in. */
    const listIsland = (rows: TExoTestSource<readonly TRow[]>) => {
        const ROW = rowOf();
        return reconciledList(rows, (c, row) => c.build(ROW, row));
    };

    it('renders the list through the shipped defaults when no backend is named', () => {
        // THE CONTROL. Without it the case below would pass for an island that mounted nothing at
        // all, which is the other way to have an empty region.
        const rows = source<readonly TRow[]>([{ id: 'a' }, { id: 'b' }]);
        const { host, root } = render(createElement(ExoMount, { component: listIsland(rows) }));

        const items = Array.from(host.querySelectorAll('li'));
        expect(items.map((li) => li.getAttribute('data-id'))).toEqual(['a', 'b']);
        expect(rows.subscribers()).toBe(1);

        act(() => root.unmount());
    });

    it('passes the BACKEND through, so the island writes the way the app composed', () => {
        const tally = { calls: 0 };
        const rows = source<readonly TRow[]>([{ id: 'a' }, { id: 'b' }]);
        // The application's backend, built once and handed to the island.
        const backend = composeExoPlugins(withExoChildList(withExoCompiler(new ExoDomBackend())), {
            writers: () => mute(tally),
        });

        const { host, root } = render(
            createElement(ExoMount, { component: listIsland(rows), backend })
        );

        // The rows mounted — the reconciler is in a TRANSITION, so it runs whatever the backend is —
        // and not one of them carries `data-id`, because the only thing that writes an attribute is
        // the writers pack the composition named.
        const items = Array.from(host.querySelectorAll('li'));
        expect(items).toHaveLength(2);
        expect(items.map((li) => li.getAttribute('data-id'))).toEqual([null, null]);
        expect(tally.calls).toBe(2);

        act(() => root.unmount());
    });
});

type TGreetingParams = { readonly name: string };

const GREETING_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('p', null, (p) => {
        text = p.textPort();
    });
    return { text };
});
const greetingLog: string[] = [];
const mGreeting = createExoMachine<TExoMachineNode, TGreetingParams, { shouts: number }>(
    GREETING_SCHEMA,
    {
        createInitialState: () => {
            greetingLog.push('createInitialState');
            return { shouts: 0 };
        },
    }
);
const GREETING = composeExoMachine(
    mGreeting,
    (m) =>
        withExoTransitions(m, {
            shout: (c) => {
                c.state.shouts += 1;
                c.text(GREETING_SCHEMA.ports.text, 'shouted ' + c.state.shouts);
            },
        }),
    (m) =>
        withExoWire(m, (c, params) => {
            greetingLog.push('wire ' + params.name);
            c.text(GREETING_SCHEMA.ports.text, 'hello ' + params.name);
        })
);
const { shout } = GREETING.transitions;

describe('params', () => {
    it('a params change re-runs the wire on the same instance instead of re-mounting', () => {
        greetingLog.length = 0;
        const { host, root } = render(
            createElement(ExoMount<TGreetingParams>, {
                component: GREETING,
                params: { name: 'Ann' },
            })
        );
        const paragraph = host.querySelector('p');
        expect(paragraph?.textContent).toBe('hello Ann');

        act(() => {
            root.render(
                createElement(ExoMount<TGreetingParams>, {
                    component: GREETING,
                    params: { name: 'Bo' },
                })
            );
        });
        expect(host.querySelector('p')).toBe(paragraph);
        expect(paragraph?.textContent).toBe('hello Bo');
        expect(greetingLog).toEqual(['createInitialState', 'wire Ann', 'wire Bo']);
        act(() => root.unmount());
    });

    it('a new params object with the same values re-runs nothing', () => {
        greetingLog.length = 0;
        const { root } = render(
            createElement(ExoMount<TGreetingParams>, {
                component: GREETING,
                params: { name: 'Ann' },
            })
        );
        act(() => {
            root.render(
                createElement(ExoMount<TGreetingParams>, {
                    component: GREETING,
                    params: { name: 'Ann' },
                })
            );
        });
        expect(greetingLog).toEqual(['createInitialState', 'wire Ann']);
        act(() => root.unmount());
    });

    it('useExoMount hands React the exonode, so a React handler can fire a transition', () => {
        let fire!: () => void;
        function Island() {
            const { ref, node } = useExoMount<HTMLDivElement, TGreetingParams>(GREETING, {
                params: { name: 'Ann' },
            });
            fire = () => shout(node.current as never);
            return createElement('div', { ref });
        }
        const { host, root } = render(createElement(Island));
        act(() => fire());
        expect(host.textContent).toBe('shouted 1');
        act(() => root.unmount());
    });
});
