// @vitest-environment jsdom
//
// RAW MARKUP IN A CHILDREN PORT, ADOPTED — the hydration half of `unsafeHtml`.
//
// The feature is one call: `c.set(childrenPort, markup)`, which is what
// `<div unsafeHtml={body} />` compiles to. The server prints the string where the
// port stands; a client render writes it with `innerHTML`; and the question this file answers is
// what the third backend does with it, given that the server already printed it and the browser
// already parsed it before a single line of ours ran.
//
// THE ANSWER IS NOTHING, and the tests below are about the two halves of that word. Nothing must
// actually be written — a page that re-wrote its own markup would discard a correct subtree, the
// listeners inside it and the parse that produced it, at the moment it can least afford to. And
// nothing must be BROKEN by writing nothing: the element's other ports still have to be wired,
// the walk still has to land on the siblings after it, and a bound port still has to be
// subscribed so the first update reaches the screen.
//
// A BOUND MARKUP PORT IS THE SAME CALL PLUS A SUBSCRIPTION: an effect draws through the fill door —
// silenced while the pass is adopting — and then subscribes, which is not silenced. So the saving
// and the liveness are two independent halves of one composition, and both are asserted below.
//
// The three paths are checked against each other rather than against a hard-coded string
// wherever it is possible, because the property that matters is not "hydration produces this
// markup" but "a hydrated page is the page a client render would have drawn". A string constant
// in a test can be edited to agree with a regression; the other backend cannot.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoMachine,
    TExoMachineNode,
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoEventHandler,
    TExoEventPort,
    TExoTextPort,
    TExoAttrPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/**
 * WHAT THE WIRES BELOW ASSUME OF AN EXONODE — methods, so that the string backend's exonode,
 * the DOM one and hydration's all satisfy it. Every case here serves ONE component and then
 * either adopts it or renders it fresh, which is only a comparison while all three run the same
 * wiring function.
 */
type TFilling = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
    onTeardown(off: () => void): void;
};

/**
 * Markup chosen to SERIALISE TO ITSELF. Several top-level nodes, nesting, and text — but no
 * `<br/>`, no attribute the serialiser would requote and no tag it would close for us, because
 * two of the cases compare a hydrated container's `innerHTML` against a rendered one's and a
 * difference introduced by the serialiser would be indistinguishable from the bug.
 */
const MARKUP = '<h2 class="t">Headline</h2><p>Body <em>with markup</em></p>';
const OTHER_MARKUP = '<h2 class="t">Other</h2><p>A completely different body</p>';

/**
 * THE SHAPE `unsafeHtml` COMPILES TO: one element whose ONLY child is the children port. That
 * is what makes raw markup legal at all — the port owns everything inside the element, so
 * `innerHTML` has nothing of anyone else's to destroy. The listener beside it is not decoration:
 * it is on the SAME element, and it is how these cases show that silencing the markup fill did
 * not silence the element's other ports.
 */
function buildBody(b: TExoSchemaCursor) {
    let html!: TExoChildrenPort;
    let click!: TExoEventPort;
    b.el('div', { class: 'body' }, (d) => {
        click = d.eventPort('click');
        html = d.childrenPort();
    });
    return { html, click };
}

type TBodyPorts = ReturnType<typeof buildBody>;

const bodyWith = (make: (ports: TBodyPorts) => TExoMachineInitialState<TFilling>) =>
    createExoTestMachine(buildBody, make);

type TFollowed = { getValue(): unknown; onChange(cb: (...event: never[]) => void): () => void };

/** A markup port an effect keeps in step with `body`; `make` fills the rest of the instance. */
const htmlFollowing = <TPorts extends { html: TExoChildrenPort }>(
    build: (b: TExoSchemaCursor) => TPorts,
    body: TFollowed,
    make?: (ports: TPorts) => TExoMachineInitialState<TFilling>
): TExoMachine<TFilling> => {
    const schema = createExoSchema(build);
    const m = createExoMachineBuilder<TExoMachineNode & TFilling>(schema);
    if (make !== undefined) {
        const fill = make(schema.ports);
        m.createInitialState((c, i) => fill(c, i));
    }
    const draw = m.transition((c) => {
        c.unsafeHtml(schema.ports.html, body.getValue());
    });
    m.effect((c) => {
        draw(c);
        return body.onChange(() => draw(c));
    });
    return m.done() as unknown as TExoMachine<TFilling>;
};

/**
 * The same port with a STATIC SIBLING AFTER IT — an element the walk has to reach on its own,
 * past however many nodes the markup turned out to contain.
 */
function buildPage(b: TExoSchemaCursor) {
    let html!: TExoChildrenPort;
    let label!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('article', null, (a) => {
        a.el('div', { class: 'body' }, (d) => {
            html = d.childrenPort();
        });
        a.el('footer', null, (f) => {
            click = f.eventPort('click');
            label = f.textPort();
        });
    });
    return { html, label, click };
}

type TPagePorts = ReturnType<typeof buildPage>;

const pageWith = (make: (ports: TPagePorts) => TExoMachineInitialState<TFilling>) =>
    createExoTestMachine(buildPage, make);

/** Every mutation a hydration performs, counted — see the first case for why it is the assertion. */
const mutationsDuring = (parent: Element, fn: () => void): number => {
    let count = 0;
    const observer = new MutationObserver((records) => {
        count += records.length;
    });
    observer.observe(parent, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    });
    fn();
    count += observer.takeRecords().length;
    observer.disconnect();
    return count;
};

describe('unsafeHtml — a children port filled with raw markup, hydrated', () => {
    it('adopts the markup the server printed without touching a node', () => {
        // THE CLAIM THE WHOLE FEATURE RESTS ON. Hydration's setter table silences this fill (see
        // `compileExoHydrateSchema`), and the only way to see the difference between "silenced" and
        // "wrote the same bytes back" is to watch for the write itself: an `innerHTML` assignment
        // of an identical string leaves `innerHTML` identical and would sail past any string
        // compare, while destroying every node in the subtree and everything attached to them.
        // If this ever regresses, nothing about the page LOOKS wrong: what it costs is a
        // wholesale re-parse of what is usually the largest subtree in the document, at the
        // single most contended moment of the page's life, plus every node identity anything
        // else was holding across it — focus, a text selection, a playing <video>, an image
        // already decoded. That is the entire saving hydration exists to make, given away
        // silently.
        const BODY = bodyWith((P) => (c) => {
            c.unsafeHtml(P.html, MARKUP);
            c.on(P.click, () => undefined);
        });
        const parent = host();
        parent.innerHTML = EXO_STR.render(BODY);
        // The server really did print it as MARKUP and not as escaped text — the premise of
        // everything below, asserted rather than assumed.
        const em = parent.querySelector('em');
        expect(em?.textContent).toBe('with markup');
        const before = parent.innerHTML;

        const mutations = mutationsDuring(parent, () => EXO_BACKEND.hydrate(BODY, parent));

        expect(mutations).toBe(0);
        expect(parent.innerHTML).toBe(before);
        // The same NODE, not merely the same bytes.
        expect(parent.querySelector('em')).toBe(em);
    });

    it('ends up with the same DOM a client render produces', () => {
        // The property a user can actually observe, checked across the two paths rather than
        // against a constant: whatever `innerHTML` does with this string in the browser, the
        // server's own printing of it must parse to the same tree, or a page hydrates into
        // something other than what it was served.
        const BODY = bodyWith((P) => (c) => {
            c.unsafeHtml(P.html, MARKUP);
            c.on(P.click, () => undefined);
        });

        const served = host();
        served.innerHTML = EXO_STR.render(BODY);
        EXO_BACKEND.hydrate(BODY, served);

        const rendered = host();
        EXO_BACKEND.render(BODY, rendered);

        expect(served.innerHTML).toBe(rendered.innerHTML);
    });

    it('agrees with a client render on an EMPTY markup value', () => {
        // `null` and `undefined` print nothing on the server and CLEAR the element on the client
        // (see `dom/set-html` and `string/writer-for-port`), so hydration doing nothing lands on the
        // same tree from both directions. It is one line of behaviour and it is the kind that is
        // quietly changed by a "tidier" setter that writes the word "null".
        const BODY = bodyWith((P) => (c) => {
            c.unsafeHtml(P.html, null);
            c.on(P.click, () => undefined);
        });

        const served = host();
        served.innerHTML = EXO_STR.render(BODY);
        EXO_BACKEND.hydrate(BODY, served);

        const rendered = host();
        EXO_BACKEND.render(BODY, rendered);

        expect(served.innerHTML).toBe(rendered.innerHTML);
        expect(served.querySelector('div.body')?.childNodes).toHaveLength(0);
    });

    it('still wires the element the markup lives in', () => {
        // The other half of "does nothing": doing nothing for the markup must not do nothing for
        // the port beside it. The listener belongs to the SAME element the markup fills, and it
        // is the one thing the server could not print — so a silencing that reached one port too
        // far would leave a page whose content is perfect and whose buttons are dead, which is
        // the failure shape this backend exists to prevent.
        //
        // The click is dispatched from INSIDE the adopted markup, which also pins that the
        // adopted nodes really are children of the wired element rather than of something else
        // the walk happened to land on.
        let clicks = 0;
        const BODY = bodyWith((P) => (c) => {
            c.unsafeHtml(P.html, MARKUP);
            c.on(P.click, () => {
                clicks++;
            });
        });
        const parent = host();
        parent.innerHTML = EXO_STR.render(BODY);
        EXO_BACKEND.hydrate(BODY, parent);

        parent.querySelector('em')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(1);
    });

    it('lands on the sibling AFTER the markup, however many nodes it contains', () => {
        // THE WALK DOES NOT ENTER A CHILDREN PORT, and this is what would notice if it ever did.
        // The schema reaches the footer as the div's next SIBLING; the markup inside the div is
        // three nodes deep and nothing in the schema counts them. A hydration that walked into the
        // port — or a compiler that gave the port's contents slots — would land the footer's
        // ports on some node inside the article body, and nothing would throw: the listener
        // would simply be attached to the wrong element.
        let clicks = 0;
        const PAGE = pageWith((P) => (c) => {
            c.unsafeHtml(P.html, MARKUP);
            c.text(P.label, 'footnote');
            c.on(P.click, () => {
                clicks++;
            });
        });
        const parent = host();
        parent.innerHTML = EXO_STR.render(PAGE);
        const footer = parent.querySelector('footer');
        EXO_BACKEND.hydrate(PAGE, parent);

        expect(footer?.textContent).toBe('footnote');
        footer?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(1);
        // And nothing inside the markup was mistaken for the footer.
        expect(parent.querySelector('div.body')?.innerHTML).toBe(MARKUP);
    });

    it('subscribes a BOUND markup port without writing, and updates it afterwards', () => {
        // The effect is a fill plus a subscription, and hydration splits the two: the fill is
        // the write the server already performed and the adopting table silences it, while the
        // subscription is untouched. Dropping the subscription would produce a page that is correct until the
        // moment the data changes and then frozen forever with no error; performing the first
        // write would cost the rebuild the whole feature exists to avoid.
        const body = source(MARKUP);
        const BODY = htmlFollowing(buildBody, body, (P) => (c) => {
            c.on(P.click, () => undefined);
        });
        const parent = host();
        parent.innerHTML = EXO_STR.render(BODY);

        const mutations = mutationsDuring(parent, () => EXO_BACKEND.hydrate(BODY, parent));
        expect(mutations).toBe(0);
        expect(body.subscribers()).toBe(1);

        body.setValue(OTHER_MARKUP);
        expect(parent.querySelector('div.body')?.innerHTML).toBe(OTHER_MARKUP);
        // The update goes through the DOM backend's own `setExoHtml`, so it is the same tree a
        // client render of the new value draws — not a second implementation of it.
        const rendered = host();
        EXO_BACKEND.render(BODY, rendered);
        expect(parent.innerHTML).toBe(rendered.innerHTML);
    });

    it('ends the subscription a bound markup port made when the render is disposed', () => {
        // A subscription made during adoption belongs to the adoption's scope exactly as one made
        // during a render belongs to the render's. Without this the page would keep re-writing
        // the markup of a component that was torn down — and keep it alive to do it.
        const body = source(MARKUP);
        const BODY = htmlFollowing(buildBody, body, (P) => (c) => {
            c.on(P.click, () => undefined);
        });
        const parent = host();
        parent.innerHTML = EXO_STR.render(BODY);
        const dispose = EXO_BACKEND.hydrate(BODY, parent);
        expect(body.subscribers()).toBe(1);

        dispose();
        expect(body.subscribers()).toBe(0);
    });

    it('refuses raw markup in a port that SHARES its element — on all three backends', () => {
        // THE PROGRAM THAT MUST NOT EXIST ON ONE BACKEND ONLY. A children port standing among
        // static siblings is a CHILD LIST inside somebody else's element; the browser can only write
        // markup with `innerHTML`, which takes the whole element, so filling it would delete the
        // heading beside it. The server COULD print it there — it has a slot between two static
        // pieces — and printing it anyway is exactly the bug this pair of refusals closed: a
        // component that rendered perfectly on the server and threw the moment a browser touched
        // it, so every SSR check passed and a user found it.
        //
        // All three are asserted in one case on purpose. The value of the refusal is not that any
        // one path throws; it is that the SAME programs are refused everywhere, and only a test
        // that asks all three can say that.
        const SHARED = createExoTestMachine(
            (b) => {
                let html!: TExoChildrenPort;
                b.el('section', null, (s) => {
                    s.el('h1', null, (h) => h.text('Headline'));
                    html = s.childrenPort();
                });
                return { html };
            },
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.unsafeHtml(P.html, MARKUP);
                }
        );

        expect(() => EXO_STR.render(SHARED)).toThrow(/set\(\)/);
        expect(() => EXO_BACKEND.render(SHARED, host())).toThrow(/set\(\)/);

        // Markup as it would look if the server HAD printed it, so that hydration is refusing the
        // program rather than tripping over a missing node.
        const parent = host();
        parent.innerHTML = '<section><h1>Headline</h1>' + MARKUP + '</section>';
        expect(() => EXO_BACKEND.hydrate(SHARED, parent)).toThrow(/set\(\)/);
    });

    it('refuses a BOUND markup value in a shared port the same way', () => {
        // A composed binding reaches the same fill door, and it has to: a program that is refused
        // when written by hand and accepted when written through an effect is a program whose
        // legality depends on which function wrote it rather than on the shape of the element.
        const body = source(MARKUP);
        const SHARED = htmlFollowing((b) => {
            let html!: TExoChildrenPort;
            b.el('section', null, (s) => {
                s.el('h1', null, (h) => h.text('Headline'));
                html = s.childrenPort();
            });
            return { html };
        }, body);

        expect(() => EXO_STR.render(SHARED)).toThrow(/set\(\)/);
        expect(() => EXO_BACKEND.render(SHARED, host())).toThrow(/set\(\)/);

        const parent = host();
        parent.innerHTML = '<section><h1>Headline</h1>' + MARKUP + '</section>';
        expect(() => EXO_BACKEND.hydrate(SHARED, parent)).toThrow(/set\(\)/);
        // And nothing was subscribed on the way to refusing — a refusal that had already taken a
        // subscription would leak one per instance of every page that hits it.
        expect(body.subscribers()).toBe(0);
    });

    it('shows what unbalanced markup costs, because `unsafeHtml` requires balanced markup', () => {
        // THIS ONE IS A CHOSEN LIMITATION, NOT A DEFECT, and it used to be a green `it.fails`
        // asserting the WISH — that the two backends agree — which is a thing the project has
        // decided will not happen. So it now asserts WHAT ACTUALLY HAPPENS, and the contract that
        // makes it acceptable. A suite that pins reality can catch a regression; a suite that
        // pins a wish can only stay red.
        //
        // It belongs to `unsafe:` rather than to hydration — but
        // hydration is where it becomes dangerous, so it is pinned where it bites.
        //
        // A client render writes the string with `innerHTML`, which parses it IN THE CONTEXT of
        // the element: a stray `</div>` has no matching open element in a fragment parse and is
        // discarded, so the markup cannot leave the element it was written into. The server does
        // not write it — it PRINTS it, into a document the browser then parses whole, where that
        // same `</div>` closes the real div and everything after it becomes a sibling. From that
        // point the two backends have produced different TREES from the same component and the
        // same value, and hydration walks the server's one: the footer's ports are wired onto
        // whatever ended up in the footer's position, silently, with no error anywhere.
        //
        // NEITHER BACKEND CAN CHEAPLY DEFEND ITSELF. The server would have to parse the markup it
        // was handed to know whether it is balanced, on every render of every such port, which is
        // most of the cost of not being a string backend. So the honest statement is that
        // `unsafeHtml` requires BALANCED markup for server rendering, and this case is what says
        // so out loud — including what it costs when the requirement is broken.
        const ESCAPING = '</div><b>broke out';
        const PAGE = pageWith((P) => (c) => {
            c.unsafeHtml(P.html, ESCAPING);
            c.text(P.label, 'footnote');
            c.on(P.click, () => undefined);
        });

        const served = host();
        served.innerHTML = EXO_STR.render(PAGE);
        EXO_BACKEND.hydrate(PAGE, served);

        const rendered = host();
        EXO_BACKEND.render(PAGE, rendered);

        // THE CLIENT CONTAINS IT. `innerHTML` parses the string IN THE CONTEXT of the element, so
        // the stray `</div>` has nothing open to close and is discarded — the escape attempt stays
        // inside the element it was written into.
        expect(rendered.querySelector('div')?.innerHTML).toContain('broke out');
        // THE SERVER DID NOT, AND THE ADOPTING FILL PUT IT BACK. Its compare parses both sides in
        // the element's own context, finds the served subtree is not the one this value produces,
        // and writes — so the element the port owns ends up holding what a client render drew.
        expect(served.querySelector('div')?.innerHTML ?? '').toContain('broke out');
        // WHAT THE REPAIR CANNOT REACH is everything the server's whole-document parse put OUTSIDE
        // that element: a port's contract ends at its own element, so the siblings that `</div>`
        // created stay where they landed and the two documents still differ. That is the price of
        // the requirement stated above — `unsafeHtml` needs BALANCED markup on the server — and it
        // is now a partial repair rather than a silent disagreement.
        expect(served.innerHTML).not.toBe(rendered.innerHTML);
    });
});
