// A port is minted inside a NESTED closure and escapes to the record the build callback returns, so an
// author declares the holder first and therefore SPELLS its type. A port is branded BY KIND — the
// five differ in the `kind` field alone — and NOT by the value it carries.
import { createExoSchema } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoWiring,
    TExoEventPort,
    TExoPort,
    TExoRefPort,
    TExoTextPort,
} from '@exodra/core';

const P = createExoSchema((b) => {
    let cls!: TExoAttrPort;
    let title!: TExoTextPort;
    let rows!: TExoChildrenPort;
    let click!: TExoEventPort;
    let box!: TExoRefPort;
    b.el('section', { class: 'card' }, (d) => {
        cls = d.port('class');
        click = d.eventPort('click');
        box = d.refPort();
        d.el('h2', null, (h) => {
            title = h.textPort();
        });
        d.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
    });
    return { cls, title, rows, click, box };
}).ports;

// If any of these five ever compiles, that named type has stopped saying which call produced it.

createExoSchema((b) => {
    let text!: TExoTextPort;
    let attr!: TExoAttrPort;
    let kids!: TExoChildrenPort;
    let event!: TExoEventPort;
    b.el('div', null, (d) => {
        // @ts-expect-error an attribute port is not a text port
        text = d.port('class');
        // @ts-expect-error a text port is not an attribute port
        attr = d.textPort();
        // @ts-expect-error an event port is not a children port
        kids = d.eventPort('click');
        // @ts-expect-error a children port is not an event port
        event = d.childrenPort();
        // @ts-expect-error a REF port is not a text port either — and it is not a `TExoPort` at all
        text = d.refPort();
    });
    return { text, attr, kids, event };
});

// The control: the narrowing must not cost the four their place in every writing signature.

declare const c: TExoWiring;
declare function handler(): void;

c.attr(P.cls, 'card open');
c.text(P.title, 'hello');
c.unsafeHtml(P.rows, '<li>raw</li>');
c.on(P.click, handler);
c.fillDoors().text(P.title, 'hello');

const widened: TExoPort = P.title;

// @ts-expect-error a ref port has no writer: set() takes a TExoPort
c.set(P.box, 'x');

// `TExoPort` is the WIDE type, so it does not go back into a holder declared for one kind. Were
// `TExoTextPort` a plain alias, this would compile and every refusal above would fail to error.

// @ts-expect-error the wide port type is not assignable to one kind's holder
const narrowed: TExoTextPort = widened;

// A port carries no value type, so both compile: `set` takes `unknown` on every backend.

c.text(P.title, 42);
c.text(P.title, { not: 'a string' });

export { widened, narrowed };
