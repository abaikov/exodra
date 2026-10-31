// @vitest-environment jsdom
//
// ADOPTING A PAGE WHOSE PORTS ARE PROPERTIES — the half of this pack that the server cannot help
// with, and the one place a hydrated page was silently different from a rendered one.
//
// WHAT THE SERVER PRINTS FOR A TAKEN-OVER PORT is an ATTRIBUTE, because `@exodra/string` is not
// composed and knows nothing about this pack. So the markup a browser parses carries
// ` label="Hi"` and the element it builds carries no `label` PROPERTY at all — the attribute is
// inert on a custom element, which is the whole reason this pack exists.
//
// WHAT HYDRATION USED TO DO WITH THAT is compare and skip. `repair-attribute` computes the markup
// a value would have produced, finds it already standing, and returns without calling the setter —
// which is exactly right for an attribute and exactly wrong for a property, because the comparison
// is asking the page a question the page cannot answer. `badge.label` stayed `undefined` for the
// life of the page and nothing anywhere was red.
//
// SO THE PORTS THE MARKUP CANNOT CARRY ARE NO LONGER SILENCED at all — `compileExoHydrateSchema` gives
// them the real setter and the real element, exactly as it already does for an event port, and for
// the same reason: an event port is silenced by nothing because a listener has no markup form, and
// neither does `chart.series`. The pack is what says which ports those are (`markupCarries`).
//
// AND THE COST GUARD IS THE LAST CASE, because the saving hydration exists for is that the first
// write is skipped where it would change nothing: a port this pack DELEGATES must adopt exactly as
// it did before, writing nothing.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoMachineNode,
    TExoWiring,
    TExoMachineInitialState,
} from '@exodra/core';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';

import { withExoPropertyWriters } from '../withExoPropertyWriters';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

// ONE BACKEND FOR THE WHOLE FILE, composed with the pack under test — the composition every case
// here hydrates under. It is built once at module level because the backend IS the schema cache key,
// compared by pointer: one per case would compile every schema again.
const EXO_BACKEND = withExoPropertyWriters(withExoHydration(withExoCompiler(new ExoDomBackend())));
const EXO_STR = new ExoStrBackend();

type TSource = { getValue(): unknown; onChange(cb: (...event: never[]) => void): () => void };

/** An element's JavaScript property — where a taken-over port's value is supposed to land. */
const prop = (node: Element, name: string): unknown =>
    (node as unknown as Record<string, unknown>)[name];

/** One custom element with one BOUND port — the whole component, so nothing else can explain it. */
const badgeBoundTo = (tag: string, name: string, src: TSource) => {
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let p!: TExoAttrPort;
        b.el(tag, null, (e) => {
            p = e.port(name);
        });
        return { x: p };
    });
    const m = createExoMachineBuilder<TExoMachineNode>(schema);
    const show = m.transition((c) => {
        c.attr(schema.ports.x, src.getValue());
    });
    m.effect((c) => {
        show(c);
        return src.onChange(() => show(c));
    });
    return m.done();
};

/** The same, with the port FILLED rather than bound — the other half of the silenced table. */
const badgeSetTo = (tag: string, name: string, value: unknown) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let p!: TExoAttrPort;
            b.el(tag, null, (e) => {
                p = e.port(name);
            });
            return { x: p };
        },
        (P): TExoMachineInitialState<TExoWiring> =>
            (c) => {
                c.attr(P.x, value);
            }
    );

describe('hydrating a page whose ports this pack writes as properties', () => {
    it('applies a BOUND property the markup already appears to agree with', () => {
        // THE TRACED CASE, and the agreement is what makes it invisible: the server printed the
        // value the client still holds, so every comparison hydration can make says the page is
        // already right. It is right about the ATTRIBUTE and the attribute is not where the value
        // lives.
        const label = source<unknown>('Hi');
        const BADGE = badgeBoundTo('x-badge', 'label', label);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BADGE);
        expect(parent.innerHTML).toBe('<x-badge label="Hi"></x-badge>');

        EXO_BACKEND.hydrate(BADGE, parent);
        const badge = parent.firstElementChild as Element;

        expect(prop(badge, 'label')).toBe('Hi');
        // And it is a WRITE rather than a rebind: the subscription still works afterwards.
        label.setValue('later');
        expect(prop(badge, 'label')).toBe('later');
    });

    it('applies a property a `set` fill put there, which no update will follow', () => {
        // A `set` has no source behind it, so there is no later firing to fall back on — this is
        // the shape where "it takes effect on the first update instead" is not a limit but a
        // permanent absence.
        const BADGE = badgeSetTo('x-badge', 'label', 'Hi');
        const parent = host();
        parent.innerHTML = EXO_STR.render(BADGE);
        expect(parent.innerHTML).toBe('<x-badge label="Hi"></x-badge>');

        EXO_BACKEND.hydrate(BADGE, parent);

        expect(prop(parent.firstElementChild as Element, 'label')).toBe('Hi');
    });

    it('writes NOTHING for a port this pack DELEGATES', () => {
        // THE COST GUARD. `takesOverExoProperty` refuses a tag with no hyphen in it, so a
        // `<p data-id>` compiled under this pack is compiled by the shipped writer — and it must
        // adopt exactly as it did before, which means no write at all on a page that is already
        // right. An implementation that un-silenced attribute ports generally would pass every
        // case above and fail this one.
        const id = source<unknown>('a');
        const CARD = badgeBoundTo('p', 'data-id', id);
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        expect(parent.innerHTML).toBe('<p data-id="a"></p>');

        let mutations = 0;
        const observer = new MutationObserver((records) => {
            mutations += records.length;
        });
        observer.observe(parent, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
        EXO_BACKEND.hydrate(CARD, parent);
        mutations += observer.takeRecords().length;
        observer.disconnect();

        expect(mutations).toBe(0);
        expect((parent.firstElementChild as Element).getAttribute('data-id')).toBe('a');
    });
});
