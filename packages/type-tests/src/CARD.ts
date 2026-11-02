// WHAT REPLACED A RUNTIME REFUSAL. `assertExoEventPort` used to compare `port.kind` inside every
// `on()` on every backend, and `assertExoChildrenPort` still does inside the five `bind*` doors.
// For `on`, `one`, `list` and `childList` the compare is gone and THIS FILE IS THE REFUSAL: the
// doors name `TExoEventPort` and `TExoChildrenPort`, whose `kind` fields are disjoint numeric
// literals, so a wrong-kinded port never reaches a body.
//
// It is asked of the DOM exonode and of the `TExoWire<TExoDomNode>` a page really writes, not only
// of core's portable `TExoWiring`: the backends used to spell these four doors `TExoPort`, which is
// the wide union, and that is precisely what let a text port through to the runtime compare.
import { createExoSchema } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoEventHandler,
    TExoEventPort,
    TExoPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { createExoTestMachine } from '@exodra/test-utils';

const P = createExoSchema((b) => {
    let cls!: TExoAttrPort;
    let title!: TExoTextPort;
    let rows!: TExoChildrenPort;
    let click!: TExoEventPort;
    b.el('section', null, (d) => {
        cls = d.port('class');
        click = d.eventPort('click');
        d.el('h2', null, (h) => {
            title = h.textPort();
        });
        d.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
    });
    return { cls, title, rows, click };
}).ports;

const LEAF = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('i', null, (i) => {
            label = i.textPort();
        });
        return { label };
    },
    (Q): TExoMachineInitialState<TExoDomNode> =>
        (c, n) => {
            c.text(Q.label, n);
        }
);

declare const dom: TExoDomNode;
declare const handler: TExoEventHandler<Event, Element>;

// @ts-expect-error on() takes an event port; this one is text
dom.on(P.title, handler);
// @ts-expect-error on() takes an event port; this one is an attribute
dom.on(P.cls, handler);
// @ts-expect-error on() takes an event port; this one holds children
dom.on(P.rows, handler);

// @ts-expect-error one() takes a children port; this one is text
dom.one(P.title, LEAF);
// @ts-expect-error list() takes a children port; this one is an attribute
dom.list(P.cls, LEAF, Array.from({ length: 1 }));
// @ts-expect-error childList() takes a children port; this one is text
dom.childList(P.title);

// @ts-expect-error the wide union is not a children port either, so a cast is the only way in
dom.one(P.rows as TExoPort, LEAF);
// @ts-expect-error the wide union is not an event port either
dom.on(P.click as TExoPort, handler);

dom.on(P.click, handler);
dom.one(P.rows, LEAF);
dom.list(P.rows, LEAF, Array.from({ length: 2 }));
dom.childList(P.rows);

// The wire a page annotates, and not the exonode read straight out of the package.
export const CARD = createExoTestMachine(
    () => P,
    (Q): TExoMachineInitialState<TExoDomNode> =>
        (c) => {
            // @ts-expect-error a wire's own receiver does not widen on() back to any port
            c.on(Q.title, handler);
            // @ts-expect-error a wire's own receiver does not widen one() back to any port
            c.one(Q.cls, LEAF);
            c.on(Q.click, handler);
            c.one(Q.rows, LEAF);
        }
);

// The portable surfaces core publishes, which were narrow before this change and stay narrow.
declare const portable: TExoChildrenWiring<Event, Element>;

// @ts-expect-error the portable surface refuses it too
portable.on(P.title, handler);
// @ts-expect-error the portable surface refuses it too
portable.list(P.cls, LEAF, Array.from({ length: 1 }));
