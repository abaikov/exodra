// @vitest-environment jsdom
//
// THE TEARDOWN SCOPE, reached the way an application reaches it.
//
// These cases do not import the scope helpers directly: they go through the real render entry
// point and read the words the failure path prints. So a helper that moves while a message, an
// import or a caller keeps the old word fails here rather than silently half-working.
// `EXO_SCOPE` in `scope/` is a context-provider pack and has nothing to do with teardown; the
// two are public and must not be confused.
import { describe, expect, it } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoMachineInitialState } from '@exodra/core';
import { exoTeardownScope, exoOnTeardown } from '../exoTeardownScope';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import { host, source, createExoTestMachine } from '@exodra/test-utils';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/**
 * The source the component below binds to. It is module-level because the COMPONENT is: a
 * wiring factory runs once, at module load, so anything it closes over has to exist by then.
 * That is the shape a real component has too — per-instance state comes from the props, not
 * from the factory's scope.
 */
const value = source('x');

/**
 * A COMPONENT, not a schema — the render entry points take the pair as one value, so that a
 * schema can never be handed someone else's wiring. The wiring factory receives the ports
 * once, at module load, which is also why the binding below can name `P.id` directly.
 */
const ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    b.el('li', null, (li) => {
        id = li.port('data-id');
    });
    return { id };
});
const mRow = createExoMachineBuilder<TExoDomNode>(ROW_SCHEMA);
const showRow = mRow.transition((c) => {
    c.attr(ROW_SCHEMA.ports.id, value.getValue());
});
mRow.effect((c) => {
    showRow(c);
    return value.onChange(() => showRow(c));
});
const ROW = mRow.done();

/**
 * TWO ROWS FROM ONE RENDER, which is what makes the disposer's job visible: a scope that ended
 * only the LAST subscription it saw would still take the count to zero from one. A list is how
 * an application makes several instances of a component, so it is also how this case makes them.
 */
const LIST = createExoTestMachine(
    (b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c) => {
            c.list(P.rows, ROW, 2);
        }
);

describe('exoTeardownScope', () => {
    it('hands back a disposer that ends what the render subscribed', () => {
        const parent = host();
        const dispose = EXO_BACKEND.render(LIST, parent);
        expect(value.subscribers()).toBe(2);
        dispose();
        expect(value.subscribers()).toBe(0);
    });

    it('tolerates being disposed twice, because a page may tear a render down twice', () => {
        let ended = 0;
        const dispose = exoTeardownScope(() => {
            exoOnTeardown(null, () => {
                ended++;
            });
        });
        dispose();
        dispose();
        expect(ended).toBe(1);
    });

    it('restores the scope above it, so a nested render does not swallow the outer one', () => {
        let inner = 0;
        let outer = 0;
        const disposeOuter = exoTeardownScope(() => {
            const disposeInner = exoTeardownScope(() => {
                exoOnTeardown(null, () => {
                    inner++;
                });
            });
            // Registered AFTER the nested scope closed: it belongs to the outer one, or the
            // module variable was left pointing at a scope that has already ended.
            exoOnTeardown(null, () => {
                outer++;
            });
            disposeInner();
            expect(inner).toBe(1);
            expect(outer).toBe(0);
        });
        disposeOuter();
        expect(outer).toBe(1);
    });

    it('refuses a subscription with nothing to end it, and names the function to wrap it in', () => {
        // The message is the thing a half-finished rename leaves stale: it tells the reader
        // which function to call, so it has to be the function that still exists.
        const value = source('x');
        expect(() =>
            exoOnTeardown(
                null,
                value.onChange(() => undefined)
            )
        ).toThrow(/exoTeardownScope\(\.\.\.\)/);
    });
});
