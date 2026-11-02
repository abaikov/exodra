// @vitest-environment jsdom
//
// A BOUND ATTRIBUTE PORT ON A FOREIGN ELEMENT, ACROSS A HYDRATION — where a name derived from the
// port and the name the element actually carries part company.
//
// `getAttribute` lowercases the name it is handed only when the element is in the HTML namespace,
// and the parser's "adjust SVG attributes" clause turns the served ` viewbox="…"` into a real
// `viewBox` before anything of ours can read it. A reader that derived the name itself as
// `port.name.toLowerCase()` therefore answered `null` for every one of the fifty-odd adjusted
// names — on a page that was already right.
//
// The identity is computed ONCE per port at compile (`exoAttrIdentity`) and handed to the writer
// as the writer's datum, which is the discipline `svg.test.ts` pins for a client render. These
// cases ask it of a page the SERVER printed: adoption writes nothing at all, so the first write of
// this page's life is the one the source makes afterwards — through the schema's LIVE table, onto
// the element the server sent. A dead lowercase twin beside the real attribute is a COUNT, not
// a missing value, which is why every assertion below counts.
//
// THE NAMESPACED STRING PORT is the same hole one layer deeper. A `stringPort` prints its value
// verbatim — `null` reaches the markup as the four characters, on the server and in the browser
// alike — where the generic value rule expects the attribute to be ABSENT, and its writer is
// `writeExoNsAttrString` rather than `writeExoAttrString`, so the two halves of one port have to be
// keyed on the writer BODY and never guessed from the value.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type { TExoAttrPort, TExoMachineNode, TExoSchemaCursor } from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import {
    ExoDomBackend,
    withExoForeignNamespaces,
    withExoHydration,
    withExoCompiler,
} from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(
    withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()))
);
const EXO_STR = new ExoStrBackend();

const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Every attribute whose name matches `lower` ignoring case: the failure a dead lowercase twin
 * standing beside the real attribute would make is a COUNT, not a missing value. */
const named = (el: Element, lower: string): Attr[] =>
    Array.from(el.attributes).filter((a) => a.name.toLowerCase() === lower);

/** One attribute port an effect keeps in step with `src`. */
const attrFollowing = (
    build: (b: TExoSchemaCursor) => { port: TExoAttrPort },
    src: TExoTestSource<unknown>
) => {
    const schema = createExoSchema(build);
    const m = createExoMachine<TExoMachineNode>(schema);
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                show: (c) => {
                    c.attr(schema.ports.port, src.getValue());
                },
            }),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return src.onChange(() => show(c));
                });
            })
    );
    const { show } = machine.transitions;
    return machine;
};

const countingMutations = (root: Element, run: () => void): number => {
    let seen = 0;
    const observer = new MutationObserver((records) => {
        seen += records.length;
    });
    observer.observe(root, {
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

describe('hydrating a camelCase attribute port on an SVG element', () => {
    const boxedBy = (src: TExoTestSource<unknown>) =>
        attrFollowing((b) => {
            let box!: TExoAttrPort;
            b.el('svg', null, (s) => {
                box = s.port('viewBox');
                s.el('rect', { width: '4' });
            });
            return { port: box };
        }, src);

    it('writes NOTHING while it adopts the markup the server printed', () => {
        // Adoption's whole saving. The value is in the markup, so the port's entry in the adopting
        // setter table is the shared no-op and the element must not be touched at all.
        const box = source<unknown>('0 0 10 10');
        const BOXED = boxedBy(box);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BOXED);

        const svg = parent.firstElementChild as Element;
        // THE ENVIRONMENT'S OWN CLAUSE, asserted before the one this file is about: the server
        // prints the port's name lowercased and only the parser's adjustment makes `viewBox` of
        // it. A runtime that does not adjust makes every case below vacuous, so it fails here.
        expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');

        expect(countingMutations(parent, () => EXO_BACKEND.hydrate(BOXED, parent))).toBe(0);
    });

    it('lands its first live write on the attribute the parser made, with no dead twin beside it', () => {
        // THE BUG, as it survives into the only write an adopted page makes. The subscription the
        // adoption took is live, so the next value the source holds is written through the schema's
        // LIVE table — and it has to land on `viewBox`, the attribute the picture draws from,
        // rather than add a lowercase `viewbox` nothing renders.
        const box = source<unknown>('0 0 10 10');
        const BOXED = boxedBy(box);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BOXED);
        EXO_BACKEND.hydrate(BOXED, parent);

        box.setValue('0 0 20 20');

        const svg = parent.firstElementChild as Element;
        const box2 = named(svg, 'viewbox');
        expect(box2).toHaveLength(1);
        expect(box2[0].name).toBe('viewBox');
        expect(box2[0].value).toBe('0 0 20 20');

        // And it keeps following the source, on the same attribute.
        box.setValue('0 0 30 30');
        expect(named(svg, 'viewbox')).toHaveLength(1);
        expect(named(svg, 'viewbox')[0].value).toBe('0 0 30 30');
    });
});

describe('hydrating a namespaced STRING port', () => {
    const linkedBy = (src: TExoTestSource<unknown>) =>
        attrFollowing((b) => {
            let href!: TExoAttrPort;
            b.el('svg', null, (s) => {
                s.el('use', null, (u) => {
                    href = u.stringPort('xlink:href');
                });
            });
            return { port: href };
        }, src);

    it('writes nothing for a value the string rule prints verbatim', () => {
        // A STRING port has no absence: `null` reaches markup as the four characters, on the
        // server and in the browser alike, so the markup already carries what the source holds.
        const href = source<unknown>(null);
        const LINKED = linkedBy(href);
        const parent = host();
        parent.innerHTML = EXO_STR.render(LINKED);

        const use = parent.querySelector('use') as Element;
        // The parser's "adjust foreign attributes" clause, for the same reason as above.
        expect(use.getAttributeNS(XLINK_NS, 'href')).toBe('null');

        expect(countingMutations(parent, () => EXO_BACKEND.hydrate(LINKED, parent))).toBe(0);
    });

    it('writes through the NAMESPACE when the source moves after the adoption', () => {
        const href = source<unknown>(null);
        const LINKED = linkedBy(href);
        const parent = host();
        parent.innerHTML = EXO_STR.render(LINKED);
        EXO_BACKEND.hydrate(LINKED, parent);

        href.setValue('#star');

        const use = parent.querySelector('use') as Element;
        expect(use.getAttributeNS(XLINK_NS, 'href')).toBe('#star');
        expect(named(use, 'xlink:href')).toHaveLength(1);
    });
});
