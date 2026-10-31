// The refusal is a TYPE, unobservable from a suite that has to compile: every writing signature
// names the NARROW port type it fills, and `refPort()` hands back a kind none of them accepts.
// WATCH WHAT EACH DIRECTIVE IS ACTUALLY CATCHING: a refusal that fires on a MISSING PROPERTY says
// nothing about port kinds, so every call below is one the surface really has.
import { createExoSchema } from '@exodra/core';
import type {
    TExoEventHandler,
    TExoPort,
    TExoRefPort,
    TExoTextPort,
    TExoPortNodeReader,
    TExoPortTable,
} from '@exodra/core';
import type { TExoWiring } from '@exodra/core';

const P = createExoSchema((b) => {
    let box!: TExoRefPort;
    let title!: TExoTextPort;
    b.el('div', null, (d) => {
        box = d.refPort();
        title = d.textPort();
    });
    return { box, title };
}).ports;

declare const c: TExoWiring;
declare const handler: TExoEventHandler;

// @ts-expect-error attr() fills an attribute port, and a ref port is not one
c.attr(P.box, 'x');
// @ts-expect-error text() fills a text port
c.text(P.box, 'x');
// @ts-expect-error html() fills a children port
c.unsafeHtml(P.box, 'x');
// @ts-expect-error a ref port is not an event port either
c.on(P.box, handler);

declare const table: TExoPortTable;
const write = c.portNodeWriter();
// @ts-expect-error the schema's write takes a TExoPort, so a driver cannot reach it either
write(table, P.box, 'x');

// The control: a text port on the SAME element fills through all of them.
c.text(P.title, 'x');
write(table, P.title, 'x');

// Structural rather than imported: this package maps `@exodra/core` and not `@exodra/dom`.
declare const dom: {
    portTable(): TExoPortTable;
    portNodeReader(): TExoPortNodeReader<Element>;
};

const at = dom.portNodeReader();
export const box: Element = at(dom.portTable(), P.box);

// @ts-expect-error the read takes a ref port; a text port's slot may hold a Text node
at(dom.portTable(), P.title);

// The table is a branded token with a `unique symbol` key: nothing outside a backend produces one.
declare const notATable: readonly unknown[];
// @ts-expect-error an array is not a port table, so a derivation cannot forge one
at(notATable, P.box);
