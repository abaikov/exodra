// @vitest-environment jsdom
//
// WHERE THE HOST ELEMENT IS WHEN REACT IS HANDED IT — the one question about this bridge that
// was an argument rather than a fact.
//
// `reactIsland.ts` calls `createRoot(host)` / `hydrateRoot(host)` from the WIRE. On a client
// render the wire runs before the instance is inserted: `@exodra/dom`'s `mountExoInstance`
// acquires the clone, calls `wireExoInstance`, and only then calls `parent.appendChild` — its own
// header says so ("WIRED BEFORE IT IS INSERTED … every attribute write, every text write and
// every listener goes onto a node that is not in the document"). So React is given a DETACHED
// container, and everything downstream of that rests on React committing later, on its own
// scheduler, by which time Exodra has inserted the node.
//
// That is a plausible argument and it was never checked. If it were wrong — if React committed
// synchronously inside `root.render()` — the island's `useLayoutEffect` would run against a
// detached tree: `getBoundingClientRect()` all zeros, `offsetWidth` 0, `focus()` a no-op,
// `IntersectionObserver` never firing. None of that throws and none of it shows up in
// `react-island.test.ts`, which asserts only the resulting markup.
//
// THE EXISTING TESTS CANNOT DECIDE THIS. Every case in `react-island.test.ts` is wrapped in
// `act()`, which flushes React's work at the END of its scope — after `backend.render` has already
// returned and therefore after the insertion. That guarantees the answer rather than measuring
// it. The last case below deliberately renders OUTSIDE `act`, on React's real scheduler, which is
// what a browser runs.

import type { TExoChildrenPort, TExoMachineInitialState } from '@exodra/core';
import { createExoTestMachine } from '@exodra/test-utils';

import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { reactIsland } from '../reactIsland';
import type { TExoReactWiring, TExoReactDomWiring } from '../types/TExoReactWiring';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** Whether the island's own element was in the document at the moment React attached its ref. */
let connectedAtCommit: boolean | null = null;
/** The same fact read a second way, so one jsdom quirk cannot carry the test on its own. */
let inOwnerDocumentAtCommit: boolean | null = null;
/** Whether the HOST was in the document at the moment the wire handed it to React. */
let connectedAtWireTime: boolean | null = null;

/**
 * A REF CALLBACK AND NOT `useLayoutEffect`, for two reasons. It fires in the same COMMIT phase —
 * refs are attached before layout effects run, so it is the earliest moment React's DOM is
 * observable — and it simply never runs during `renderToString`, where a `useLayoutEffect` would
 * print React's "does nothing on the server" warning into the hydration case below.
 */
function Probe(): ReturnType<typeof createElement> {
    return createElement(
        'span',
        {
            className: 'probe',
            ref: (el: HTMLSpanElement | null): void => {
                if (el === null) return;
                connectedAtCommit = el.isConnected;
                inOwnerDocumentAtCommit = el.ownerDocument.contains(el);
            },
        },
        'probe'
    );
}

/** One island in a host element whose children port owns everything inside it. */
const ISLAND = createExoTestMachine(
    (b) => {
        let host!: TExoChildrenPort;
        b.el('section', { class: 'wrap' }, (section) => {
            section.el('div', { 'data-exo-react': '' }, (div) => {
                host = div.childrenPort();
            });
        });
        return { host };
    },
    (P): TExoMachineInitialState<TExoReactWiring> =>
        (c) => {
            const dom = c as TExoReactDomWiring;
            // The same resolution `reactIsland.ts` makes to find the host — read here so the
            // fact the rest of this file depends on is asserted rather than assumed. `liveElem`
            // first for the same reason it comes first there: an adopting schema's `elem` answers
            // slot 0 for every children port.
            if (dom.nodes !== undefined && dom.schema?.elem !== undefined) {
                const table = dom.schema.liveElem ?? dom.schema.elem;
                const host = dom.nodes[table[P.host.index]] as Element;
                connectedAtWireTime = host.isConnected;
            }
            reactIsland(c, P.host, Probe, {});
        }
);

function freshContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

beforeEach(() => {
    connectedAtCommit = null;
    inOwnerDocumentAtCommit = null;
    connectedAtWireTime = null;
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('a client render hands React a DETACHED host', () => {
    it('the host is not in the document when the wire calls reactIsland', () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        const container = freshContainer();
        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.render(ISLAND, container);
        });

        // THE PREMISE OF EVERYTHING BELOW. If this ever reads `true`, `@exodra/dom` has changed
        // to insert before wiring — which would be fine for this bridge, but the rest of this
        // file would then be testing a hazard that no longer exists and should be re-read.
        expect(connectedAtWireTime).toBe(false);
        act(() => dispose());
    });

    it('React has still committed into the LIVE document by the time its refs attach', () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        const container = freshContainer();
        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.render(ISLAND, container);
        });

        expect(connectedAtCommit).toBe(true);
        expect(inOwnerDocumentAtCommit).toBe(true);
        expect(container.querySelector('.probe')?.textContent).toBe('probe');
        act(() => dispose());
    });
});

describe('hydration hands React an ATTACHED host, which is the other answer', () => {
    it('the host is already in the document when the wire runs', () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        const container = freshContainer();
        container.innerHTML = EXO_STR.render(ISLAND);

        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.hydrate(ISLAND, container);
        });

        // Hydration adopts nodes that are already in the page, so `hydrateRoot` never sees a
        // detached container. The two entry points of this bridge therefore differ in a way
        // nothing stated: one is exposed to the insertion ordering and the other is not.
        expect(connectedAtWireTime).toBe(true);
        expect(connectedAtCommit).toBe(true);
        expect(container.querySelectorAll('.probe')).toHaveLength(1);
        act(() => dispose());
    });
});

describe('React’s own scheduler, with no act() forcing the flush', () => {
    it('commits the island into the document after Exodra has inserted it', async () => {
        // THE CASE THE ARGUMENT WAS ABOUT. `act()` flushes at the end of its scope, which is
        // after `EXO_BACKEND.render` returned and therefore after the append — so it cannot tell a
        // synchronous commit from a scheduled one. Here nothing forces anything: `root.render()`
        // schedules, this test yields, and the assertion is about where React put the nodes.
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
        const container = freshContainer();
        const dispose = EXO_BACKEND.render(ISLAND, container);

        // Two macrotask turns: React's scheduler posts through a MessageChannel, and one turn is
        // enough in practice — the second is slack, not a second chance for a different answer.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(connectedAtWireTime).toBe(false);
        expect(connectedAtCommit).toBe(true);
        expect(inOwnerDocumentAtCommit).toBe(true);
        // And the committed markup is where the page can see it, not in an orphaned subtree.
        const probe = container.querySelector('.probe');
        expect(probe).not.toBeNull();
        expect(document.body.contains(probe)).toBe(true);

        dispose();
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    });
});
