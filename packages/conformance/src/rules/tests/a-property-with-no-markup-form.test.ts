// @vitest-environment jsdom
//
// Both questions turn on one split: a control's ATTRIBUTE is its reset value and its PROPERTY is
// its live state, and neither is visible to an artefact that only reads the tree's shape — hence
// the PROBE. `@exodra/string` is probed through its PARSE, because the state that element is in
// before any JavaScript runs is exactly what both questions ask about.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, it } from 'vitest';
import { EXO_CAP_ELEMENT, cannotExpress, assertExoConformanceRule, renders } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

const checkboxWith = (portName: string, value: unknown) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let flag!: TExoAttrPort;
            b.el('input', { type: 'checkbox' }, (input) => {
                flag = input.port(portName);
            });
            return { flag };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.attr(P.flag, value);
            }
    );

describe('a property no markup can express', () => {
    it('is written by two backends and absent from the page the other two produce', () => {
        assertExoConformanceRule({
            name: 'set(indeterminate, true) on an <input type="checkbox">',
            // The `probe` is what makes this rule need `EXO_CAP_ELEMENT`; a rule cannot say so.
            probe: ['indeterminate'],
            subject: () => ({ component: checkboxWith('indeterminate', true) }),
            expect: {
                dom: renders(),
                // Prints nothing, ON PURPOSE: ` indeterminate="true"` means nothing to a parser,
                // and its presence would make hydration's repair compare the server's own bytes
                // against themselves and leave the control alone forever.
                string: renders(),
                term: cannotExpress(EXO_CAP_ELEMENT),
                // `set` writes nothing during hydration and the repair is reachable only from
                // `bind`, so a hydrated page inherits the SERVER's answer, not the client's.
                hydrate: renders(),
            },
            agreement: [['dom', 'hydrate'], ['string']],
        });
    });
});

describe('the boolean-property attribute sync, which is whether form.reset() is honest', () => {
    it('leaves every remaining backend with a reset value the data DID choose', () => {
        assertExoConformanceRule({
            name: 'set(checked, true) on an <input type="checkbox">, probing the RESET value too',
            // `defaultChecked` IS the `checked` content attribute, which IS what `form.reset()`
            // restores, so probing it turns "is reset honest" into a comparable value.
            probe: ['checked', 'defaultChecked'],
            subject: () => ({ component: checkboxWith('checked', true) }),
            expect: {
                // Property FIRST, attribute behind it: the assignment sets the control's dirty
                // flag, so the attribute updates the reset value and cannot move the control.
                dom: renders(),
                string: renders(),
                term: cannotExpress(EXO_CAP_ELEMENT),
                hydrate: renders(),
            },
            agreement: [['dom', 'hydrate', 'string']],
        });
    });
});
