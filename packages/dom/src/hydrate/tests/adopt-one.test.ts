// @vitest-environment jsdom
//
// ONE NESTED INSTANCE, ADOPTED — `c.one(port, component)` on a page the server printed.
//
// `one` is the children call with no list in it: one instance in that port, for the life of the
// page, no registry and no diff. On a client render it mounts; here the element it would have
// mounted is already standing, so adoption is the same walk aimed at the server's node — nothing
// is cloned, inserted or compared, and the listeners are the only thing left to attach.
//
// WHAT THE CASES ARE ABOUT is therefore not the instance but WHERE IT IS FOUND. A children port may
// own its element or stand between statics, and the element adoption must take is the one this
// port's markup produced — the parent's first element child where the port owns the element, and
// the next element sibling of the last static in front of it where it does not. Aim it one element
// wrong and nothing throws: the schema is compiled against the declaration and inspects nothing,
// so the nested instance's listener simply lands on somebody else's element.
//
// AND AT DEPTH, because that is where an error multiplies rather than adds: a nested instance's own
// wire places children of its own, through a record carrying ITS schema, and the backend has to
// travel with the nesting for the second level to be adopted at all.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
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
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** What a page's wire needs of an exonode — the same on the server and while adopting. */
type TPageSurface = {
    text(port: TExoTextPort, value: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
};

/** Where a click landed, so "the listener is on the SERVER's element" is testable. */
let clicked = '';
/** Every title a page's wire ran for, in order — one entry per run. */
let wired: string[] = [];

/** ONE PAGE — `<section class="a"><h1>…</h1></section>`, with a listener markup cannot carry. */
const PAGE = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let title!: TExoTextPort;
        let click!: TExoEventPort;
        b.el('section', { class: 'a' }, (s) => {
            click = s.eventPort('click');
            s.el('h1', null, (h) => {
                title = h.textPort();
            });
        });
        return { title, click };
    },
    (P): TExoMachineInitialState<TPageSurface> =>
        (c, params) => {
            const title = params as string;
            wired.push(title);
            c.text(P.title, title);
            c.on(P.click, () => {
                clicked = title;
            });
        }
);

/** A page that SUBSCRIBES, so an adopted instance's teardown is observable. */
const BOUND_TEXT = source('alive');
const PAGE_BOUND_SCHEMA = createExoSchema((b: TExoSchemaCursor) => {
    let text!: TExoTextPort;
    b.el('aside', { class: 'bound' }, (s) => {
        text = s.textPort();
    });
    return { text };
});
const PAGE_BOUND_MACHINE = composeExoMachine(
    createExoMachine<TExoMachineNode>(PAGE_BOUND_SCHEMA),
    (m) =>
        withExoTransitions(m, {
            showPageBound: (c) => {
                c.text(PAGE_BOUND_SCHEMA.ports.text, BOUND_TEXT.getValue());
            },
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                showPageBound(c);
                return BOUND_TEXT.onChange(() => showPageBound(c));
            });
        })
);
const { showPageBound } = PAGE_BOUND_MACHINE.transitions;
const PAGE_BOUND = PAGE_BOUND_MACHINE as unknown as TExoMachine<TExoChildrenWiring<Event, Element>>;

/** Every id an INNER row's wire ran for, in order — the evidence for the cost at depth. */
let innerWired: string[] = [];

/** The row a PANEL holds, marked so a query can tell it from anything else on the page. */
const INNER = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let id!: TExoTextPort;
        b.el('li', { class: 'inner' }, (li) => {
            id = li.textPort();
        });
        return { id };
    },
    (P): TExoMachineInitialState<TPageSurface> =>
        (c, at) => {
            innerWired.push('inner' + at);
            c.text(P.id, 'inner' + at);
        }
);

/**
 * A NESTED INSTANCE THAT ITSELF HOLDS CHILDREN — `<section class="panel"><ul>{inner}</ul></section>`.
 *
 * The one shape the flat cases cannot reach: its wire places children of its own, so adopting the
 * panel has to reach the inner port too — through a record carrying the PANEL's schema and the
 * backend the outer page was hydrated under.
 */
const PANEL = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let kids!: TExoChildrenPort;
        b.el('section', { class: 'panel' }, (s) => {
            s.el('ul', null, (ul) => {
                kids = ul.childrenPort();
            });
        });
        return { kids };
    },
    (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
        (c) => {
            c.list(P.kids, INNER, [0, 1]);
        }
);

/** A port that OWNS its element — a router outlet, a modal host. */
function buildOutlet(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('main', null, (m) => {
        slot = m.childrenPort();
    });
    return { slot };
}

/** THE SAME PORT WITH A STATIC AFTER IT. */
function buildTrailing(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        slot = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { slot };
}

/** AND WITH A STATIC ON BOTH SIDES — the shape adoption cannot start at the parent's first child. */
function buildLeading(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        slot = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { slot };
}

type TBuild = typeof buildOutlet;

/**
 * A shell holding ONE nested instance of `component` in its port.
 *
 * The parameter is the WIDE component type and the three components below are declared against
 * narrower surfaces: that direction is free, because a wire's exonode parameter is contravariant,
 * and it is what lets a page that fills two ports be nested by a page that places children.
 */
const shellOf = (
    build: TBuild,
    component: TExoMachine<TExoChildrenWiring<Event, Element>>,
    params?: unknown
) =>
    createExoTestMachine(
        build,
        (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
            (c) => {
                c.one(P.slot, component, params);
            }
    );

/** The served page, as far as an adopting pass can tell: bytes in a fresh host, no listeners. */
const serve = (component: ReturnType<typeof shellOf>): HTMLElement => {
    const parent = host();
    parent.innerHTML = EXO_STR.render(component);
    wired = [];
    innerWired = [];
    clicked = '';
    return parent;
};

const mutationsDuring = (parent: Element, run: () => void): number => {
    let seen = 0;
    const observer = new MutationObserver((records) => {
        seen += records.length;
    });
    observer.observe(parent, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    });
    run();
    seen += observer.takeRecords().length;
    observer.disconnect();
    return seen;
};

describe('one() adopting the instance the server rendered', () => {
    it('TAKES THE SERVER’S ELEMENT WITHOUT MOVING A NODE, and attaches the listener markup could not carry', () => {
        // The assertion is node IDENTITY, not markup: two identical trees compare equal as
        // strings, and "we rebuilt it and it happened to look the same" is exactly the outcome
        // hydration exists to avoid — the listener below would be on a different element, and
        // anything the user had typed or focused inside would be gone.
        const SHELL = shellOf(buildOutlet, PAGE, 'first');
        const parent = serve(SHELL);
        const before = parent.innerHTML;
        const served = parent.querySelector('section.a') as HTMLElement;

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(SHELL, parent))).toBe(0);

        expect(parent.innerHTML).toBe(before);
        expect(parent.querySelector('section.a')).toBe(served);

        served.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('first');
    });

    it('runs the nested wire ONCE for the instance it adopted', () => {
        // One element on the page, one wire run. A second run per adopted position is what an
        // adoption that built a clone and then repointed it looked like from here, and it means a
        // component author's side effect fires twice on a hydrated page and once on a client one.
        const SHELL = shellOf(buildOutlet, PAGE, 'once');
        const parent = serve(SHELL);

        EXO_BACKEND.hydrate(SHELL, parent);

        expect(wired).toEqual(['once']);
    });

    it('adopts through a static that comes AFTER it', () => {
        const SHELL = shellOf(buildTrailing, PAGE, 'before the footnote');
        const parent = serve(SHELL);
        const served = parent.querySelector('section.a') as HTMLElement;
        const footer = parent.querySelector('footer') as HTMLElement;

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(SHELL, parent))).toBe(0);

        expect(parent.querySelector('section.a')).toBe(served);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.lastElementChild).toBe(footer);
        expect(footer.textContent).toBe('footnote');
    });

    it('adopts through a static that comes BEFORE it, and leaves both statics alone', () => {
        // Without `childListStartSlot` adoption begins at the parent's first element, which in this
        // shape is the HEADING: the nested instance's schema is replayed over an `<h3>` and its
        // listener attaches to the heading, with nothing in the markup to see.
        const SHELL = shellOf(buildLeading, PAGE, 'between');
        const parent = serve(SHELL);
        const before = parent.innerHTML;
        const heading = parent.querySelector('h3') as HTMLElement;
        const footer = parent.querySelector('footer') as HTMLElement;
        const served = parent.querySelector('section.a') as HTMLElement;

        EXO_BACKEND.hydrate(SHELL, parent);

        expect(parent.innerHTML).toBe(before);
        expect(parent.querySelector('h3')).toBe(heading);
        expect(parent.querySelector('footer')).toBe(footer);
        expect(parent.querySelectorAll('section.a')).toHaveLength(1);
        expect(parent.querySelector('section.a')).toBe(served);

        // And the listener is on the SERVER's element, not on the heading in front of it.
        heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('');
        served.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('between');
    });

    it('ends an ADOPTED instance’s subscriptions when the render is disposed', () => {
        // A subscription a nested instance took while adopting belongs to the adoption's scope
        // exactly as one taken during a render belongs to the render's. Without this the page
        // would keep writing into a component that was torn down, and keep it alive to do it.
        const SHELL = shellOf(buildOutlet, PAGE_BOUND);
        const parent = serve(SHELL);

        const dispose = EXO_BACKEND.hydrate(SHELL, parent);
        expect(BOUND_TEXT.subscribers()).toBe(1);

        dispose();
        expect(BOUND_TEXT.subscribers()).toBe(0);
    });

    it('refuses when the markup has no element where the nested instance stands', () => {
        // Hydration creates nothing, so carrying on would aim the nested schema at `null` and the
        // next setter would call `addEventListener` on it. The refusal names what it looked for.
        const SHELL = shellOf(buildOutlet, PAGE);
        const parent = host();
        // The outlet the server left empty — a different build, a different wiring, or data that
        // moved. Whichever it was, this is not the page this script would have rendered.
        parent.innerHTML = '<main></main>';

        expect(() => EXO_BACKEND.hydrate(SHELL, parent)).toThrow(/a nested instance/);
    });
});

describe('one() at depth — a nested instance that places children of its own', () => {
    it('adopts at BOTH levels: the server’s panel and the server’s inner rows', () => {
        // Node identity at depth 2, which is the assertion the flat cases make at depth 1: an
        // inner port reached through an adopted instance must land ON the server's markup and not
        // beside it. A backend that did not travel with the nesting would compose the outer page
        // and ship the inner one — the failure that shows up only in components nobody thought of
        // as "the root".
        const SHELL = shellOf(buildOutlet, PANEL);
        const parent = serve(SHELL);
        const before = parent.innerHTML;
        const servedPanel = parent.querySelector('section.panel') as HTMLElement;
        const servedInner = Array.from(parent.querySelectorAll('li.inner')) as HTMLElement[];
        expect(servedInner).toHaveLength(2);

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(SHELL, parent))).toBe(0);

        expect(parent.innerHTML).toBe(before);
        expect(parent.querySelectorAll('section.panel')).toHaveLength(1);
        expect(parent.querySelector('section.panel')).toBe(servedPanel);
        const now = Array.from(parent.querySelectorAll('li.inner'));
        expect(now).toHaveLength(2);
        expect(now[0]).toBe(servedInner[0]);
        expect(now[1]).toBe(servedInner[1]);
    });

    it('runs an inner wire ONCE per row at depth 2', () => {
        // THE SAME ASSERTION AS THE FLAT CASE, ONE LEVEL DOWN, AND IT IS THE ONE THAT MATTERS. A
        // flat extra run is a constant; an extra run at DEPTH is not, because every level that
        // re-ran its wire re-created everything below it. What this rules out is a multiple of the
        // row count rather than the row count — the shape a flat test cannot tell from an
        // off-by-one.
        const SHELL = shellOf(buildOutlet, PANEL);
        const parent = serve(SHELL);

        EXO_BACKEND.hydrate(SHELL, parent);

        expect(innerWired).toEqual(['inner0', 'inner1']);
    });
});
