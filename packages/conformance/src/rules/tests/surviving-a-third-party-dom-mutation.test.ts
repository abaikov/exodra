// @vitest-environment jsdom
//
// A translator extension wraps a page's text in a `<font>` of its own. `@exodra/dom` holds the
// ELEMENT and re-checks `nodeType` on every write, falling back to `textContent`; a backend holding
// the TEXT NODE ITSELF cannot recover, because the reference IS the replaced node. The extension
// runs FIRST and the data moves after — the only order in which the two answers differ.
// The two excused backends are excused for DIFFERENT reasons: `term` has a live tree and updates
// it, but holds text in a FIELD, so the exposure does not exist rather than being survived.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type { TExoMachineNode, TExoSchemaCursor, TExoTextPort, TExoWiring } from '@exodra/core';
import { source } from '@exodra/test-utils';
import { describe, it } from 'vitest';
import {
    EXO_CAP_TEXT_NODE,
    EXO_CAP_UPDATE,
    cannotExpress,
    assertExoConformanceRule,
    renders,
} from '../../index';

const paragraphBoundTo = () => {
    const label = source('before');
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let text!: TExoTextPort;
        b.el('p', null, (p) => {
            text = p.textPort();
        });
        return { text };
    });
    const component = composeExoMachine(
        createExoMachine<TExoWiring & TExoMachineNode>(schema),
        (m) =>
            withExoTransitions(m, {
                show: (c) => c.text(schema.ports.text, label.getValue()),
            }),
        (m) => {
            const { show } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return label.onChange(() => show(c));
                });
            });
        }
    );
    return { component, label };
};

describe('a translator extension replaces the text node, and then the data moves', () => {
    it('one backend recovers, one writes into a node nobody renders', () => {
        assertExoConformanceRule({
            name: 'a bound text port whose Text node a third party has replaced',
            // Two capabilities, derived from `translate` and `update` below, and both reported.
            subject: () => {
                const built = paragraphBoundTo();
                return {
                    component: built.component,
                    translate: true,
                    update: () => built.label.setValue('after'),
                };
            },
            expect: {
                // `text` caches the node and re-checks it is still the element's SOLE child, so the
                // write falls back to `textContent` and the extension's `<font>` survives.
                dom: renders(),
                // TWO absences: its bytes were finished before anything could mutate them.
                string: cannotExpress(EXO_CAP_UPDATE, EXO_CAP_TEXT_NODE),
                term: cannotExpress(EXO_CAP_TEXT_NODE),
                // Adoption hands the region to `@exodra/dom`'s own code; landing anywhere but with
                // `dom` means a hydrated page is more fragile than a rendered one.
                hydrate: renders(),
            },
            agreement: [['dom', 'hydrate']],
        });
    });
});
