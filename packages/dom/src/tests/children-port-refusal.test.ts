// @vitest-environment jsdom
//
// A WRONG-KINDED PORT IS REFUSED BY ALL THREE BACKENDS, AT EVERY REACTIVE ENTRY POINT THAT PLACES
// CHILDREN — and this file exists because for three of those entry points it was refused by
// only two of them.
//
// `one` AND `list` ARE NO LONGER AMONG THEM. Both name `TExoChildrenPort` on all three exonodes
// now, so the wrong kind is a compile error and the runtime compare that used to stand in them is
// gone; `packages/type-tests`' `port-kind-doors.ts` is where the refusal is asserted instead.
// What is left here is `childList`, the door a reconciled list is composed over.
//
// `assertExoChildrenPort` lives in `@exodra/core` precisely so the rule cannot be given differently
// by `TExoDomNode`, `TExoStrNode` and `TExoHydrateNode`. Its own header records the
// hole that put it there: hydration's `one`, `list` and `bindList` "simply read
// `liveElem[port.index]` and carried on".
//
// WHAT IS ASSERTED is the exonode NAME in each message, not merely that something threw: the
// point is that each of them refuses it, on its own, at the same call.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoNode,
    TExoPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler, withExoChildList } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));
const EXO_STR = new ExoStrBackend();

/** The reconciling form: the placement door on top of `build`, which is what a reactive list is now. */
type TReconciling = {
    build(component: TExoMachine<never>, params?: unknown): TExoNode;
    childList(port: TExoPort): TExoPlacedChildren<TExoNode>;
};

/** Only the calls these wires make, as methods, so all three exonodes satisfy it. */
type TPlacing = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** Something to place. What it renders does not matter; nothing gets that far. */
const LEAF = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('i', null, (i) => {
            label = i.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<{ text(port: TExoTextPort, value: unknown): void }> =>
        (c, n) => {
            c.text(P.label, n);
        }
);

/** ONE ATTRIBUTE PORT — the wrong kind for every method below, on purpose. */
function buildAttrPort(b: TExoSchemaCursor) {
    let slot!: TExoAttrPort;
    b.el('div', { class: 'card' }, (card) => {
        slot = card.port('data-slot');
    });
    return { slot };
}

/** The same schema, filled correctly — the markup hydration is then handed. */
const GOOD = createExoTestMachine(
    buildAttrPort,
    (P): TExoMachineInitialState<TPlacing> =>
        (c) => {
            c.attr(P.slot, 'ok');
        }
);

const RECONCILED_LIST = createExoTestMachine(
    buildAttrPort,
    (P): TExoMachineInitialState<TReconciling> =>
        (c) => {
            reconcileExoOrder(c.childList(P.slot), [], [0], [0], (item) => c.build(LEAF, item));
        }
);

/** What `one` and `list` cost an UNTYPED caller now that their compare is gone. A cast is the only
 * way in — `TExoChildrenPort` is what both name — and the two backends part company past it. */
type TCastPlacing = {
    one(port: TExoPort, component: TExoMachine<never>, params?: unknown): void;
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};

const CAST_ONE = createExoTestMachine(
    buildAttrPort,
    (P): TExoMachineInitialState<TCastPlacing> =>
        (c) => {
            c.one(P.slot, LEAF, 0);
        }
);

const CAST_LIST = createExoTestMachine(
    buildAttrPort,
    (P): TExoMachineInitialState<TCastPlacing> =>
        (c) => {
            c.list(P.slot, LEAF, [0, 1]);
        }
);

describe('an attribute port handed to a method that places children', () => {
    // A RECONCILED LIST IS COMPOSED OVER `childList`, so the refusal is that door's — and the door
    // is on all three backends, so the refusal is ONE function in `@exodra/core` rather than a
    // sentence per backend. The server used to have no such door and answered "not a function",
    // which said nothing about the port; now it names the port, as the browser does.
    it('is refused by every backend that has the door, with one message', () => {
        expect(() => EXO_STR.render(RECONCILED_LIST)).toThrow(
            /TExoStrNode: childList\(\) needs a children port/
        );

        expect(() => EXO_BACKEND.render(RECONCILED_LIST, host())).toThrow(
            /TExoDomNode: childList\(\) needs a children port/
        );

        // AND THROUGH HYDRATION, which inherits the door and therefore the refusal: the markup is
        // what the SAME schema really produced, so the only thing wrong with the page is the wire.
        const parent = host();
        parent.innerHTML = EXO_STR.render(GOOD);
        expect(() => EXO_BACKEND.hydrate(RECONCILED_LIST, parent)).toThrow(
            /TExoDomNode: childList\(\) needs a children port/
        );
    });
});

// THIS IS WHAT THE DELETION COSTS, AND IT IS PINNED RATHER THAN ASSUMED. `one` and `list` name
// `TExoChildrenPort`, so a typed program cannot arrive; a cast and untyped JavaScript can, and the
// two backends then disagree — the browser puts the instance somewhere wrong and the server emits
// markup that does not parse. Whoever builds an opt-in wire-assert layer should start here.
describe('an attribute port cast past one() and list(), whose compare is gone', () => {
    it('puts the instance on the port’s own element in the browser', () => {
        const parent = host();
        EXO_BACKEND.render(CAST_ONE, parent);
        expect(parent.innerHTML).toBe('<div class="card"><i>0</i></div>');
    });

    it('writes the instances INTO THE OPEN TAG on the server, which is broken markup', () => {
        expect(EXO_STR.render(CAST_LIST)).toBe('<div class="card"<i>0</i><i>1</i>></div>');
    });
});
