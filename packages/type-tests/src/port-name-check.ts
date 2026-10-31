// `TExoPortName` narrows a name to the keys of the declared interface whose type accepts the kind
// THAT call mints: the KEY and the KIND, both. COMPLETENESS is deliberately NOT checked.
import { createExoNamedSchema, createExoSchema } from '@exodra/core';
import { createExoNamedTestMachine } from '@exodra/test-utils';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoWiring,
    TExoEventPort,
    TExoPort,
    TExoRefPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';

interface TCardPorts {
    index: TExoAttrPort;
    title: TExoTextPort;
    toggle: TExoEventPort;
    details: TExoChildrenPort;
    box: TExoRefPort;
}

const P = createExoNamedSchema<TCardPorts>((b) => {
    b.el('div', { class: 'card' }, (card) => {
        // Markup name first, PORT name second: the second does not default to the first.
        card.port('data-i', 'index');
        card.refPort('box');
        card.el('h3', null, (h3) => h3.textPort('title'));
        card.el('button', { class: 'tog' }, (btn) => btn.eventPort('click', 'toggle'));
        card.childrenPort('details');
    });
}).ports;

// The record IS the interface, so the wire's names and kinds are the ones it declared.
declare const c: TExoWiring;
declare function handler(): void;

c.attr(P.index, '3');
c.text(P.title, 'hello');
c.unsafeHtml(P.details, '<li>raw</li>');
c.on(P.toggle, handler);
// @ts-expect-error a ref port has no writer, whatever it is called
c.attr(P.box, 'x');
// @ts-expect-error each door takes ITS OWN kind: a text port is not an attribute port
c.attr(P.title, 'hello');
// @ts-expect-error …nor an attribute port a text one
c.text(P.index, '3');
// @ts-expect-error …nor a children port either of them
c.text(P.details, '<li>raw</li>');

createExoNamedSchema<TCardPorts>((b) => {
    b.el('div', null, (card) => {
        // @ts-expect-error "headline" is not a key of TCardPorts
        card.el('h3', null, (h3) => h3.textPort('headline'));
    });
});

// What `keyof TPorts` alone would miss: each of these IS a key, and each is the wrong call for it.

createExoNamedSchema<TCardPorts>((b) => {
    b.el('div', null, (card) => {
        // @ts-expect-error `index` is an attribute port, not a text port
        card.el('h3', null, (h3) => h3.textPort('index'));
        // @ts-expect-error `title` is a text port, not an attribute port
        card.port('data-t', 'title');
        // @ts-expect-error `details` is a children port, not an event port
        card.eventPort('click', 'details');
        // @ts-expect-error `toggle` is an event port, not a children port
        card.childrenPort('toggle');
        // @ts-expect-error `title` is a text port, and a ref port is not one
        card.refPort('title');
    });
});

// `TExoPort` is the union of the four writable kinds: a wide holder takes four, refuses the fifth.

interface TWidePorts {
    slot: TExoPort;
}

createExoNamedSchema<TWidePorts>((b) => {
    b.el('div', null, (d) => {
        d.port('data-x', 'slot');
    });
});

createExoNamedSchema<TWidePorts>((b) => {
    b.el('div', null, (d) => {
        // @ts-expect-error a ref port is not a TExoPort, so the wide holder refuses it too
        d.refPort('slot');
    });
});

// No type argument, so no interface to check against: any string goes. The check is opt-in.

declare const loose: TExoSchemaCursor;
loose.el('div', null, (d) => {
    d.port('data-x', 'whatever');
    d.textPort('anything');
});

// The returning form, which every schema outside these tests uses.

const Q = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        label = li.textPort();
    });
    return { label };
}).ports;

c.text(Q.label, 'hello');

// `createExoTestMachine` infers `TPorts` from what the build callback RETURNS; the named form returns nothing, and
// TypeScript has no partial type-argument inference. Annotating the FACTORY's parameter is the way
// out: non-context-sensitive, it is processed FIRST, fixing `TPorts` before the build callback is checked.

const CARD = createExoNamedTestMachine(
    (b) => {
        b.el('div', { class: 'card' }, (card) => {
            card.port('data-i', 'index');
            card.el('h3', null, (h3) => h3.textPort('title'));
            card.el('button', { class: 'tog' }, (btn) => btn.eventPort('click', 'toggle'));
            card.childrenPort('details');
            card.refPort('box');
            // @ts-expect-error `index` is an attribute port, so this cursor knows TCardPorts
            card.textPort('index');
        });
    },
    (P: TCardPorts): TExoMachineInitialState<TExoWiring> =>
        (conn, index) => {
            conn.text(P.title, 'card ' + index);
        }
);

// Exported so nothing reads as dead: this module is compiled, never run.
export { P, Q, CARD };
